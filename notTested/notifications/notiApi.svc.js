import AxiosFactory from '../factories/axiosFactory.js';
import AxiosService from '../services/axiosService.js';
import CustomError from '../utils/customErrors/customError.js';

/**
 * Service for handling notification API calls
 */
export default class NotiApiSvc {
   static #CLASS_NAME = 'NotiApiSvc';
   static #BASE_URL = '/api/v2/notifications/channels';
   static #API_SERVICE = new AxiosService(AxiosFactory.getInstance());

   /**
    * Generates a new notification channel
    * @returns {Promise<Object>} Channel information including ID and connection URI
    */
   static async generateChannel() {
      try {
         const request = {
            method: 'POST',
            url: this.#BASE_URL,
         };

         return await this.#API_SERVICE.sendRequest(request);
      } catch (err) {
         this.#handleNotiApiError(err, 'generateChannel');
      }
   }

   /**
    * Creates a subscription for a channel with specified topics
    * @param {string} channelId - The ID of the channel
    * @param {Array} topics - Array of topics to subscribe to
    * @returns {Promise<Object>} Subscription response
    */
   static async createSubscription(channelId, topics) {
      try {
         const request = {
            method: 'POST',
            url: `${this.#BASE_URL}/${channelId}/subscriptions`,
            data: topics,
         };

         return await this.#API_SERVICE.sendRequest(request);
      } catch (err) {
         this.#handleNotiApiError(err, 'createSubscription');
      }
   }

   /**
    * Clears all subscriptions for a channel
    * @param {string} channelId - The ID of the channel
    * @returns {Promise<Object>} Clear subscription response
    */
   static async clearSubscription(channelId) {
      try {
         const request = {
            method: 'DELETE',
            url: `${this.#BASE_URL}/${channelId}/subscriptions`,
         };

         return await this.#API_SERVICE.sendRequest(request);
      } catch (err) {
         this.#handleNotiApiError(err, 'clearSubscription');
      }
   }

   /**
    * Handles API errors by wrapping them in a CustomError
    * @private
    * @param {Error} err - The original error
    * @param {string} functionName - The name of the function where the error occurred
    */
   static #handleNotiApiError(err, functionName) {
      throw new CustomError({
         message: `${functionName} ERROR`,
         className: this.#CLASS_NAME,
         functionName,
         details: err,
      }).toObject();
   }
}

// Sample usage
// await NotiApiSvc.generateChannel();
// console.log('Function working');