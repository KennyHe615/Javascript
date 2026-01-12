import CustomError from '../utils/customErrors/customError.js';
import AxiosService from '../services/axiosService.js';
import AxiosFactory from '../factories/axiosFactory.js';

/**
 * Conversation Aggregate API Service.
 *
 * Queries Genesys Cloud analytics conversation aggregates and returns result rows.
 * Uses AxiosService for HTTP requests and standardizes errors via CustomError.
 *
 * @class ConverAggreApiSvc
 * @example
 * const results = await ConverAggreApiSvc.getData("2025-08-01T00:00:00Z/2025-08-01T01:00:00Z");
 * console.log(results.length);
 */
export default class ConverAggreApiSvc {
   static #CLASS_NAME = 'ConverAggreApiSvc';
   static #URL = '/api/v2/analytics/conversations/aggregates/query';
   static #API_SERVICE = new AxiosService(AxiosFactory.getInstance());

   /**
    * Fetches conversation aggregate data for the specified interval.
    *
    * The interval must follow the ISO-8601 format accepted by Genesys Cloud,
    * e.g., "2025-08-01T00:00:00Z/2025-08-01T01:00:00Z".
    *
    * On success:
    * - Returns an array of result objects when data exists.
    * - Returns an empty array when the API responds with no results.
    *
    * @param {string} interval ISO-8601 time interval in the form "startISO/endISO".
    * @returns {Promise<Object[]>} Promise resolving to an array of aggregate result objects.
    * @throws {Object} Wrapped CustomError object when the request fails or the payload is invalid.
    */
   static async getData(interval) {
      let payload = null;

      try {
         const apiRequest = this.#buildCARequest(interval);

         payload = await this.#API_SERVICE.sendRequest(apiRequest);

         if (Object.keys(payload).length === 0) return [];
      } catch (err) {
         throw new CustomError({
            message: 'Fetching Conversation Aggregate Data ERROR',
            className: this.#CLASS_NAME,
            functionName: 'getData',
            parameters: { interval },
            details: err,
         }).toObject();
      }

      const results = payload.results;
      if (!results || results.length === 0) {
         throw new CustomError({
            message: `Invalid Payload: Missing "results" in payload.`,
            className: this.#CLASS_NAME,
            functionName: 'getData',
            parameters: { interval },
         }).toObject();
      }

      return results;
   }

   static #buildCARequest(interval) {
      return {
         method: 'POST',
         url: this.#URL,
         data: {
            interval,
            granularity: 'PT30M',
            groupBy: ['queueId', 'mediaType', 'requestedRoutingSkillId', 'wrapUpCode'],
            metrics: [
               'nBlindTransferred',
               'nCobrowseSessions',
               'nConnected',
               'nConsult',
               'nConsultTransferred',
               'nError',
               'nOffered',
               'nOutbound',
               'nOutboundAbandoned',
               'nOutboundAttempted',
               'nOutboundConnected',
               'nOverSla',
               'nStateTransitionError',
               'nTransferred',
               'oExternalMediaCount',
               'oMediaCount',
               'oMessageTurn',
               'oServiceLevel',
               'oServiceTarget',
               'tAbandon',
               'tAcd',
               'tActiveCallback',
               'tActiveCallbackComplete',
               'tAcw',
               'tAgentResponseTime',
               'tAlert',
               'tAnswered',
               'tBarging',
               'tCoaching',
               'tCoachingComplete',
               'tConnected',
               'tContacting',
               'tDialing',
               'tFirstConnect',
               'tFirstDial',
               'tFlowOut',
               'tHandle',
               'tHeld',
               'tHeldComplete',
               'tIvr',
               'tMonitoring',
               'tMonitoringComplete',
               'tNotResponding',
               'tShortAbandon',
               'tTalk',
               'tTalkComplete',
               'tUserResponseTime',
               'tVoicemail',
               'tWait',
            ],
         },
      };
   }
}

// Sample Usage
// const response = await CaApi.getCAData("2025-08-01T00:00:00Z/2025-08-01T01:00:00Z");
// console.log("response: ", response);