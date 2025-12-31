import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore.js';
import minMax from 'dayjs/plugin/minMax.js';
import logger from '../services/winstonService.js';
import CustomError from './customErrors/customError.js';
import CdApiSvc from '../conversationDetail_cd/cdApi.svc.js';

dayjs.extend(utc);
dayjs.extend(customParseFormat);
dayjs.extend(isSameOrBefore);
dayjs.extend(minMax);

/**
 * TimeIntervalManager - Utility class for time interval operations and validations.
 * Handles interval parsing, validation, subdivision based on API limits and date ranges.
 * Supports Genesys API timestamp format and conversation detail data fetching.
 *
 * @class TimeIntervalManager
 */
export default class TimeIntervalManager {
   static #CLASS_NAME = 'TimeIntervalManager';
   static #GENESYS_API_REQUEST_TIMESTAMP_FORMAT = 'YYYY-MM-DDTHH:mm[Z]';

   // Constants for subdivision logic
   static #THRESHOLDS = Object.freeze({
      MAX_HITS: 100000,
      HIGH_HITS: 200000,
      MAX_INTERVAL_DAYS: 7,
      ADJUSTMENT_MINUTES: 120,
      MIN_INTERVAL_MINUTES: 1,
   });
   static #VALID_CATEGORIES = Object.freeze({
      USER_DETAIL: 'User Detail',
      CONVERSATION_DETAIL: 'Conversation Detail',
   });

   /**
    * Calculates the duration in seconds between two timestamps.
    * Returns null if timestamps are invalid or if end time is before start time.
    *
    * @static
    * @param {string} startTime - Start timestamp
    * @param {string} endTime - End timestamp
    * @returns {number|null} Duration in seconds, or null if invalid
    */
   static calculateDuration(startTime, endTime) {
      if (!startTime || !endTime) return null;

      const dayjsStartTime = dayjs(startTime);
      const dayjsEndTime = dayjs(endTime);

      if (!TimeIntervalManager.#isValidDayjsObj(dayjsStartTime) || !TimeIntervalManager.#isValidDayjsObj(dayjsEndTime)) {
         return null;
      }

      const duration = dayjsEndTime.diff(dayjsStartTime, 'seconds');

      if (duration >= 0) return duration;

      logger.error(
         JSON.stringify(
            new CustomError({
               message: 'Invalid Duration: End time is before start time.',
               className: TimeIntervalManager.#CLASS_NAME,
               functionName: 'calculateDuration',
               parameters: {
                  startTime,
                  endTime,
                  duration,
               },
            }).toObject(),
            null,
            3,
         ),
      );

      return null;
   }

   /**
    * Validates and converts an interval string to dayjs objects.
    * Expected format: "YYYY-MM-DDTHH:mmZ/YYYY-MM-DDTHH:mmZ"
    *
    * @static
    * @param {string} interval - Interval string in Genesys API format
    * @returns {Object} Object containing startTime and endTime as dayjs objects
    * @returns {import('dayjs').Dayjs} return.startTime - Start time as dayjs object
    * @returns {import('dayjs').Dayjs} return.endTime - End time as dayjs object
    * @throws {Object} CustomError if interval is invalid
    */
   static validateAndConvertInterval(interval) {
      const errorObj = new CustomError({
         message: '',
         className: TimeIntervalManager.#CLASS_NAME,
         functionName: 'validateAndConvertInterval',
         parameters: { interval },
      }).toObject();

      if (!interval || typeof interval !== 'string') {
         errorObj.message = 'Invalid interval: must be a non-empty string';

         throw errorObj;
      }

      const [start, end] = interval.split('/');
      const dayjsStartTime = dayjs.utc(start, TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT, true);
      const dayjsEndTime = dayjs.utc(end, TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT, true);

      if (!TimeIntervalManager.#isValidDayjsObj(dayjsStartTime) || !TimeIntervalManager.#isValidDayjsObj(dayjsEndTime)) {
         errorObj.message = `Parsing interval to Dayjs objects Error! Expecting format: ${TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT}`;

         throw errorObj;
      }

      if (dayjsEndTime.isSameOrBefore(dayjsStartTime)) {
         errorObj.message = 'Invalid interval: End time is same/before start time';

         throw errorObj;
      }

      return {
         startTime: dayjsStartTime,
         endTime: dayjsEndTime,
      };
   }

   /**
    * Subdivides a time interval into smaller intervals based on API limits.
    * Ensures each sub-interval does not exceed 7 days or 100,000 hits.
    *
    * @static
    * @async
    * @param {import('dayjs').Dayjs} dayjsStart - Start time as dayjs object
    * @param {import('dayjs').Dayjs} dayjsEnd - End time as dayjs object
    * @param {string} category - Category type ('User Detail' or 'Conversation Detail')
    * @returns {Promise<Array<string>>} Array of interval strings in Genesys API format
    * @throws {Object} CustomError if subdivision fails or parameters are invalid
    */
   static async subdivideIntervalAsync(dayjsStart, dayjsEnd, category) {
      TimeIntervalManager.#validateSubdivisionParams(dayjsStart, dayjsEnd, category);

      // Two conditions:
      // 1. Interval does Not exceed 7 days
      // 2. TotalHits does Not exceed 100,000
      try {
         // Determine the function to fetch total hits based on the category
         const getHitsFunc = TimeIntervalManager.#getHitsFunction(category);
         const diffDays = dayjsEnd.diff(dayjsStart, 'day');

         // Quick path: if an interval is small enough, check if we can return it as-is
         if (diffDays <= TimeIntervalManager.#THRESHOLDS.MAX_INTERVAL_DAYS) {
            const totalHits = await getHitsFunc(dayjsStart, dayjsEnd);

            logger.debug(
               `[${TimeIntervalManager.#CLASS_NAME} - subdivideIntervalAsync Start: ${dayjsStart.format()} End: ${dayjsEnd.format()} Category: ${category}] Total Hits: ${totalHits}`,
            );

            if (totalHits < TimeIntervalManager.#THRESHOLDS.MAX_HITS) {
               return [TimeIntervalManager.#formatInterval(dayjsStart, dayjsEnd)];
            }
         }

         return await TimeIntervalManager.#subdivideHelperAsync(dayjsStart, dayjsEnd, getHitsFunc);
      } catch (err) {
         throw new CustomError({
            message: 'Subdividing Interval For UserDetail Or ConversationDetail ERROR!',
            className: TimeIntervalManager.#CLASS_NAME,
            functionName: 'subdivideIntervalAsync',
            parameters: {
               startTime: dayjsStart.format(),
               endTime: dayjsEnd.format(),
               category,
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Gets the appropriate hits fetching function based on category.
    *
    * @private
    * @static
    * @param {string} category - Category type
    * @returns {Function} Function to fetch total hits
    */
   static #getHitsFunction(category) {
      if (category === TimeIntervalManager.#VALID_CATEGORIES.USER_DETAIL) {
         return () => Promise.resolve(null);
      }

      return async (start, end) => {
         try {
            return await CdApiSvc.fetchCDTotalHits(start, end);
         } catch (err) {
            logger.warn(
               `[${TimeIntervalManager.#CLASS_NAME}] Failed to load CdApiSvc: ${err.message}. Returning null for hits.`,
            );
            return null;
         }
      };
   }

   /**
    * Validates parameters for interval subdivision.
    *
    * @private
    * @static
    * @param {import('dayjs').Dayjs} dayjsStart - Start time
    * @param {import('dayjs').Dayjs} dayjsEnd - End time
    * @param {string} category - Category type
    * @throws {Object} CustomError if any parameter is invalid
    */
   static #validateSubdivisionParams(dayjsStart, dayjsEnd, category) {
      const errors = [];

      if (!TimeIntervalManager.#isValidDayjsObj(dayjsStart)) {
         errors.push(
            `"dayjsStart" must be a valid dayjs object. Expecting format: ${TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT}`,
         );
      }

      if (!TimeIntervalManager.#isValidDayjsObj(dayjsEnd)) {
         errors.push(
            `"dayjsEnd" must be a valid dayjs object. Expecting format: ${TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT}`,
         );
      }

      if (!category || typeof category !== 'string') {
         errors.push('"category" must be a non-empty string');
      } else if (!Object.values(TimeIntervalManager.#VALID_CATEGORIES).includes(category)) {
         errors.push(`"category" must be one of: ${Object.values(TimeIntervalManager.#VALID_CATEGORIES).join(', ')}`);
      }

      if (dayjsStart && dayjsEnd && dayjsStart.isAfter(dayjsEnd)) {
         errors.push('"dayjsStart" must be before "dayjsEnd"');
      }

      if (errors.length > 0) {
         throw new CustomError({
            message: `Invalid parameters: ${errors.join('; ')}`,
            className: TimeIntervalManager.#CLASS_NAME,
            functionName: '#validateSubdivisionParameters',
            parameters: {
               start: dayjsStart?.format?.() || 'invalid',
               end: dayjsEnd?.format?.() || 'invalid',
               category,
            },
         }).toObject();
      }
   }

   /**
    * Helper method to subdivide intervals recursively.
    *
    * @private
    * @static
    * @async
    * @param {import('dayjs').Dayjs} dayjsStart - Start time
    * @param {import('dayjs').Dayjs} dayjsEnd - End time
    * @param {Function} getTotalHitsFunc - Function to fetch total hits
    * @returns {Promise<Array<string>>} Array of interval strings
    * @throws {Object} CustomError if subdivision fails
    */
   static async #subdivideHelperAsync(dayjsStart, dayjsEnd, getTotalHitsFunc) {
      const definedIntervals = [];
      const normalizedStartTime = dayjsStart.clone().second(0).millisecond(0);
      const normalizedEndTime = dayjsEnd.clone().second(0).millisecond(0);

      try {
         let currentStart = normalizedStartTime.clone();

         while (currentStart.isBefore(normalizedEndTime)) {
            const nextStart = await TimeIntervalManager.#findOptimalEndTimeAsync(
               currentStart,
               normalizedEndTime,
               getTotalHitsFunc,
            );

            const interval = TimeIntervalManager.#formatInterval(currentStart, nextStart);
            definedIntervals.push(interval);

            const totalHits = await getTotalHitsFunc(currentStart, nextStart);
            logger.debug(
               `[${TimeIntervalManager.#CLASS_NAME} - #subdivideIntervalHelperAsync Sub-Interval: ${interval}] Total Hits: ${totalHits}`,
            );

            currentStart = nextStart.clone();
         }

         return definedIntervals;
      } catch (err) {
         throw new CustomError({
            message: 'Subdividing Interval Helper ERROR!',
            className: TimeIntervalManager.#CLASS_NAME,
            functionName: '#subdivideIntervalHelperAsync',
            parameters: {
               startTime: dayjsStart.format(),
               endTime: dayjsEnd.format(),
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * Finds the optimal end time for an interval using binary search approach.
    * Ensures the interval doesn't exceed hit thresholds.
    *
    * @private
    * @static
    * @async
    * @param {import('dayjs').Dayjs} currentDayjs - Current start time
    * @param {import('dayjs').Dayjs} maxEndDayjs - Maximum allowed end time
    * @param {Function} getTotalHitsFunc - Function to fetch total hits
    * @returns {Promise<import('dayjs').Dayjs>} Optimal end time
    */
   static async #findOptimalEndTimeAsync(currentDayjs, maxEndDayjs, getTotalHitsFunc) {
      const nextBoundary = currentDayjs.clone().add(TimeIntervalManager.#THRESHOLDS.MAX_INTERVAL_DAYS, 'day');
      let nextStart = dayjs.min(nextBoundary, maxEndDayjs);

      let totalHits = await getTotalHitsFunc(currentDayjs, nextStart);

      // If hits are within the threshold, return immediately
      if (totalHits < TimeIntervalManager.#THRESHOLDS.MAX_HITS) return nextStart;

      // Binary search approach to find an optimal interval
      while (totalHits >= TimeIntervalManager.#THRESHOLDS.MAX_HITS) {
         const diffMinutes = nextStart.diff(currentDayjs, 'minute');

         // Prevent infinite loop with a minimum interval
         if (diffMinutes <= TimeIntervalManager.#THRESHOLDS.MIN_INTERVAL_MINUTES) break;

         const reductionMinutes =
            totalHits >= TimeIntervalManager.#THRESHOLDS.HIGH_HITS
               ? Math.max(TimeIntervalManager.#THRESHOLDS.MIN_INTERVAL_MINUTES, Math.round(diffMinutes / 2))
               : Math.max(
                    TimeIntervalManager.#THRESHOLDS.MIN_INTERVAL_MINUTES,
                    Math.round(diffMinutes - TimeIntervalManager.#THRESHOLDS.ADJUSTMENT_MINUTES),
                 );

         nextStart = currentDayjs.clone().add(reductionMinutes, 'minute');

         totalHits = await getTotalHitsFunc(currentDayjs, nextStart);
      }

      return nextStart;
   }

   /**
    * Formats a time interval into Genesys API format string.
    *
    * @private
    * @static
    * @param {import('dayjs').Dayjs} start - Start time
    * @param {import('dayjs').Dayjs} end - End time
    * @returns {string} Formatted interval string (e.g., "2025-01-01T00:00Z/2025-01-02T00:00Z")
    */
   static #formatInterval(start, end) {
      const startStr = start.format(TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT);
      const endStr = end.format(TimeIntervalManager.#GENESYS_API_REQUEST_TIMESTAMP_FORMAT);

      return `${startStr}/${endStr}`;
   }

   /**
    * Validates if a value is a valid dayjs object.
    *
    * @private
    * @static
    * @param {*} dayjsTime - Value to validate
    * @returns {boolean} True if valid dayjs object, false otherwise
    */
   static #isValidDayjsObj(dayjsTime) {
      if (!dayjsTime) return false;

      return !(!dayjs.isDayjs(dayjsTime) || !dayjsTime.isValid());
   }
}
