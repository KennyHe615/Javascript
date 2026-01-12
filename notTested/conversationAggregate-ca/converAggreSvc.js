import logger from '../services/winstonService.js';
import CustomError from '../utils/customErrors/customError.js';
import JobStatusSvc from '../scheduledJobStatus-js/jobStatusSvc.js';
import TimeIntervalManager from '../utils/timeIntervalManager.js';
import ConverAggreApiSvc from './ca.api.js';
import ConverAggreMapper from './ca.mapper.js';
import SequelizeService from '../services/sequelizeService.js';
import ConversationAggregate from './ca.model.js';
import JobStatusMapper from '../scheduledJobStatus-js/js.mapper.js';

/**
 * Service responsible for Genesys Conversation Aggregate data over time intervals
 * and persisting job status for scheduled and recovery operations.
 *
 * Responsibilities:
 * - Scheduled: determines next interval from last completed job and processes in 30-minute sub-intervals.
 * - Recovery: reprocesses a specific interval and optionally updates an existing job record as recovered.
 *
 * Collaborators: TimeIntervalManager, ConverAggreApiSvc, ConverAggreMapper, SequelizeService, JobStatusSvc.
 */
export default class ConverAggreSvc {
   static #CLASS_NAME = 'ConverAggreSvc';
   static #FULL_SERVICE_NAME = 'Conversation Aggregate';
   static #OPERATION = Object.freeze({ SCHEDULED: 'SCHEDULED', RECOVERY: 'RECOVERY' });

   /**
    * Runs the scheduled Conversation Aggregate job.
    * Determines the interval based on the last completed job, subdivides into 30-minute chunks,
    * processes each, and updates job status accordingly.
    *
    * @returns {Promise<void>}
    * @throws {Object} CustomError-like object when unrecoverable errors occur
    */
   static async runScheduledJob() {
      const funcNote = `========== [${this.#FULL_SERVICE_NAME}-${this.#OPERATION.SCHEDULED}] ==========`;
      let jobResult = null;
      let jobInterval = null;
      logger.info(`${funcNote} START!`);

      try {
         // Step 1: Find the last completed job to determine the starting point.
         const lastJob = await JobStatusSvc.findLastCompletedJobStatus(this.#FULL_SERVICE_NAME);

         // Step 2: Define the interval for the current job.
         jobInterval = TimeIntervalManager.defineScheduledJobInterval(lastJob.lastInterval);

         jobResult = await this.#processHelper(this.#OPERATION.SCHEDULED, jobInterval, lastJob.recordId);
      } catch (err) {
         throw new CustomError({
            message: 'Processing CA Scheduled Job ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'runScheduledJob',
            parameters: { interval: jobInterval },
            details: err,
         }).toObject();
      }

      if (jobResult) {
         logger.info(`${funcNote} [Job Interval = ${jobInterval}] COMPLETED!`);
      } else {
         throw new CustomError({
            message: 'CA Scheduled Job ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'runScheduledJob',
            parameters: { interval: jobInterval },
         }).toObject();
      }
   }

   /**
    * Executes recovery processing for a specific interval.
    * If a recordId is provided, marks the job record as recovery-completed upon success.
    *
    * @param {string} interval Interval to recover (ISO 8601 "start/end")
    * @param {number | null | undefined} recordId Optional job status record ID to mark as recovered
    * @returns {Promise<void>}
    * @throws {Object} CustomError-like object for validation or processing errors
    */
   static async runRecovery(interval, recordId) {
      if (!interval) {
         throw new CustomError({
            message: 'Interval is required for recovery operation',
            className: this.#CLASS_NAME,
            functionName: 'runRecovery',
         }).toObject();
      }

      const funcNote = `========== [${this.#FULL_SERVICE_NAME}-${this.#OPERATION.RECOVERY}] ==========`;
      logger.info(`${funcNote} [Interval = ${interval}; Record Id = ${recordId}] START!`);
      let jobResult = null;

      try {
         jobResult = await this.#processHelper(this.#OPERATION.RECOVERY, interval, recordId);

         if (!jobResult) return;

         if (recordId) {
            await this.#upsertJobStatus({
               recordId,
               interval,
               isRecoveryCompleted: true,
            });
         }

         logger.info(`${funcNote} [Interval = ${interval}; Record Id = ${recordId}] COMPLETED!`);
      } catch (err) {
         const errObj = new CustomError({
            message: 'CA Recovery ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'runRecovery',
            parameters: { interval, recordId },
            details: err,
         }).toObject();

         logger.error(JSON.stringify(errObj, null, 3));
      }
   }

   /**
    * Core processing helper for scheduled and recovery operations.
    * Validates the interval, updates job status (for scheduled), subdivides into 30-minute intervals,
    * and processes each sub-interval. In recovery mode, stops immediately on first failure.
    *
    * @private
    * @param {'SCHEDULED' | 'RECOVERY'} operation Operation type
    * @param {string} interval Full interval to process
    * @param {number | null | undefined} recordId Optional job status record ID
    * @returns {Promise<boolean>} True if all sub-intervals succeeded; false otherwise
    * @throws {Object} CustomError-like object for validation or processing errors
    */
   static async #processHelper(operation, interval, recordId) {
      const funcNote = `========== [${this.#FULL_SERVICE_NAME}-${operation}] ==========`;
      let allIntervalsSucceeded = true;

      try {
         // Step 1: Validate and convert the interval.
         const { startTime, endTime } = TimeIntervalManager.validateAndConvertInterval(interval);

         if (operation === this.#OPERATION.SCHEDULED) {
            await this.#upsertJobStatus({
               recordId,
               interval,
               isJobCompleted: true,
            });
         }

         // Step 2: Subdivide the interval for processing.
         const subdividedIntervals = TimeIntervalManager.subdivideIntervalIntoHalfHour(startTime, endTime);

         for (const subInterval of subdividedIntervals) {
            try {
               await this.#processDataByInterval(subInterval);

               if (subdividedIntervals.length > 1) {
                  logger.debug(`${funcNote} [Sub-Interval = ${subInterval}] COMPLETED!`);
               }
            } catch (err) {
               allIntervalsSucceeded = false;

               const errObj = new CustomError({
                  message: 'Processing CA Sub-Intervals ERROR!',
                  className: this.#CLASS_NAME,
                  functionName: '#processHelper',
                  parameters: {
                     operation,
                     subInterval,
                     recordId,
                  },
                  details: err,
               }).toObject();
               logger.error(JSON.stringify(errObj, null, 3));

               // For recovery, stop processing immediately on the first failure.
               if (operation === this.#OPERATION.RECOVERY) return false;

               // Insert new record to indicate failure for the current interval
               await this.#upsertJobStatus({
                  interval: subInterval,
                  isJobCompleted: false,
               });
            }
         }

         return allIntervalsSucceeded;
      } catch (err) {
         throw new CustomError({
            message: 'Processing CA Helper ERROR!',
            className: this.#CLASS_NAME,
            functionName: '#processHelper',
            parameters: { operation, interval, recordId },
            details: err,
         }).toObject();
      }
   }

   /**
    * Fetches, maps, and upserts conversation aggregate data for a single sub-interval.
    * No-op when the API returns an empty array.
    *
    * @private
    * @param {string} interval Sub-interval to process
    * @returns {Promise<void>}
    * @throws {Object} CustomError-like object for API, mapping, or database errors
    */
   static async #processDataByInterval(interval) {
      try {
         // Fetch the conversation aggregate data for the given interval
         const data = await ConverAggreApiSvc.getData(interval);
         if (data.length === 0) {
            logger.debug(`${this.#FULL_SERVICE_NAME} [Interval = ${interval}] NO DATA FOUND!`);

            return;
         }

         // Map to ORM entity
         const mappedData = await ConverAggreMapper.map(data);

         // Upsert to database
         await SequelizeService.upsert(mappedData, ConversationAggregate);
      } catch (err) {
         throw new CustomError({
            message: 'Processing Conversation Aggregate Data ERROR',
            className: this.#CLASS_NAME,
            functionName: '#processDataByInterval',
            parameters: { interval },
            details: err,
         }).toObject();
      }
   }

   /**
    * Upserts job status for the "Conversation Aggregate" category.
    *
    * @private
    * @param {Object} param0
    * @param {number | null | undefined} [param0.recordId] Optional existing job status record ID
    * @param {string} param0.interval Interval associated with the status
    * @param {boolean | undefined} [param0.isJobCompleted] Whether the scheduled job completed successfully
    * @param {boolean | undefined} [param0.isRecoveryCompleted] Whether the recovery completed successfully
    * @returns {Promise<void>}
    * @throws {Object} CustomError-like object when mapping or persistence fails
    */
   static async #upsertJobStatus({ recordId, interval, isJobCompleted, isRecoveryCompleted }) {
      const jobStatusObj = {
         recordId,
         category: this.#FULL_SERVICE_NAME,
         interval,
         isJobCompleted,
         isRecoveryCompleted,
      };

      try {
         const mappedObj = JobStatusMapper.map(jobStatusObj);
         await JobStatusSvc.upsert(mappedObj);
      } catch (err) {
         throw new CustomError({
            message: 'Upserting Conversation Aggregate Job Status ERROR!',
            className: this.#CLASS_NAME,
            functionName: '#upsertJobStatus',
            parameters: jobStatusObj,
            details: err,
         }).toObject();
      }
   }
}

// Sample Usage
// try {
   // await ConverAggreSvc.runScheduledJob();
   // await ConverAggreSvc.runRecovery('2025-11-24T00:00Z/2025-11-24T01:00Z', null);
// } catch (err) {
//    logger.error(JSON.stringify(err, null, 3));
// }
// process.exit();