import AxiosService from '../services/axiosService.js';
import AxiosFactory from '../factories/axiosFactory.js';
import CustomError from '../utils/customErrors/customError.js';
import Constants from '../utils/constants.js';
import TimeIntervalManager from '../utils/timeIntervalManager.js';

/**
 * Service class for handling Conversation Detail API requests.
 * Provides methods to fetch conversation data from the Genesys API.
 */
export default class CdApiSvc {
   static #CLASS_NAME = 'CdApiSvc';
   static #API_SERVICE = new AxiosService(AxiosFactory.getInstance());
   static #ENDPOINTS = {
      CONVERSATION_DETAILS: '/api/v2/analytics/conversations/details/query',
      CONVERSATION: '/api/v2/conversations',
   };

   /**
    * Fetches conversation detail by its ID.
    *
    * @param {string} id - The unique identifier of the conversation.
    * @returns {Promise<Object>} A promise that resolves to the conversation data object.
    * @throws {CustomError} Throws an error if the request fails or returns invalid data.
    */
   static async getCDDataById(id) {
      try {
         const request = {
            method: 'GET',
            url: `${this.#ENDPOINTS.CONVERSATION}/${id}`,
         };

         return await this.#API_SERVICE.sendRequest(request);
      } catch (err) {
         throw new CustomError({
            message: 'Get Conversation Detail By Id Error!',
            className: this.#CLASS_NAME,
            functionName: 'getCDDataById',
            parameters: { conversationId: id },
            details: err,
         }).toObject();
      }
   }

   /**
    * Fetches conversation details within a specific time interval.
    *
    * @param {string} interval - Time interval string formatted as per Genesys API requirements.
    * @param {number} pageNum - Page number for pagination support.
    * @returns {Promise<Array>} A promise that resolves to an array of conversation objects.
    * @throws {CustomError} Throws an error if the request fails or returns invalid data.
    */
   static async getCDDataByInterval(interval, pageNum) {
      let payload = null;
      try {
         const apiRequest = this.#buildCDRequest(interval, pageNum);

         payload = await this.#API_SERVICE.sendRequest(apiRequest);

         if (payload.totalHits === 0) return [];
      } catch (err) {
         throw new CustomError({
            message: 'Get Conversation Detail By Interval Error!',
            className: this.#CLASS_NAME,
            functionName: 'getCDDataByInterval',
            parameters: { interval, pageNum },
            details: err,
         }).toObject();
      }

      if (!payload.conversations || payload.conversations.length === 0) {
         throw new CustomError({
            message: `Invalid Payload: Missing "conversations" in payload.`,
            className: this.#CLASS_NAME,
            functionName: 'getCDDataByInterval',
            parameters: { interval, pageNum },
         }).toObject();
      }

      return payload.conversations;
   }

   /**
    * Fetches total hits count of conversations within a given time range.
    *
    * @param {Dayjs} dayjsStart - Start date/time using Day.js format.
    * @param {Dayjs} dayjsEnd - End date/time using Day.js format.
    * @returns {Promise<number>} A promise that resolves to the total number of matching records.
    * @throws {CustomError} Throws an error if the request fails or returns invalid data.
    */
   static async fetchCDTotalHits(dayjsStart, dayjsEnd) {
      try {
         const interval = `${dayjsStart.format(TimeIntervalManager.GENESYS_API_REQUEST_TIMESTAMP_FORMAT)}/${dayjsEnd.format(
            TimeIntervalManager.GENESYS_API_REQUEST_TIMESTAMP_FORMAT,
         )}`;

         const apiRequest = this.#buildCDRequest(interval, 1);

         const response = await this.#API_SERVICE.sendRequest(apiRequest);

         return response.totalHits;
      } catch (err) {
         throw new CustomError({
            message: `Getting Conversation Detail Total Hits Error!`,
            className: this.#CLASS_NAME,
            functionName: 'fetchCDTotalHits',
            parameters: {
               startTime: dayjsStart.format(),
               endTime: dayjsEnd.format(),
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * Builds a standardized request configuration for querying conversation details.
    *
    * @private
    * @param {string} interval - Time interval string formatted as per Genesys API requirements.
    * @param {number} pageNumber - Page number for pagination support.
    * @returns {Object} Request configuration object including method, URL, and data payload.
    */
   static #buildCDRequest(interval, pageNumber) {
      return {
         method: 'POST',
         url: this.#ENDPOINTS.CONVERSATION_DETAILS,
         data: {
            order: 'asc',
            orderBy: 'conversationStart',
            interval,
            paging: {
               pageSize: Constants.DEFAULT_API_PAGE_SIZE,
               pageNumber,
            },
         },
      };
   }
}

// Sample usage
// try {
   // const data = await CdApiSvc.getCDDataById('17a98fe6-fd7f-4d16-b0fa-856d8c34550e');
   // console.log('data: ', data);
   // const data = await CdApiSvc.getCDDataByInterval('2025-03-21T00:00Z/2025-03-21T00:30Z');
   // console.log('data: ', data);
// } catch (err) {
//    console.log('Sample Usage Catching: ', JSON.stringify(err, null, 3));
// }