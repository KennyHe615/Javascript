import { setTimeout } from 'timers/promises';
import logger from './winstonService.js';
import tokenSvc from './tokenSvc.js';
import CustomError from '../utils/customErrors/customError.js';
import Constants from '../utils/constants.js';
import AxiosFactory from '../factories/axiosFactory.js';

/**
 * Service class for handling HTTP requests with retry logic and error handling.
 * Supports automatic retry for transient errors, token refresh, and rate limiting.
 * Provides a clean API with support for both singleton usage and dependency injection.
 *
 * @class AxiosSvc
 */
class AxiosSvc {
   static #CLASS_NAME = 'AxiosSvc';

   #instance;
   #retryConfig;
   static DEFAULT_RETRY_LIMIT = 3;
   static DEFAULT_RETRY_DELAYS = Object.freeze({
      default: 10000,
      rateLimited: 60000,
      serverError: 5000,
   });

   /**
    * Creates a new AxiosService instance.
    *
    * @param {import('axios').AxiosInstance} [axiosInstance] - Axios instance (optional for DI)
    * @param {Object} [retryConfig] - Retry configuration options
    * @param {number} [retryConfig.retryLimit] - Maximum number of retry attempts
    * @param {Object} [retryConfig.retryDelays] - Delay configuration for retries
    */
   constructor(axiosInstance = null, retryConfig = {}) {
      this.#instance = axiosInstance ?? AxiosFactory.getInstance();

      this.#retryConfig = {
         retryLimit: retryConfig.retryLimit ?? AxiosSvc.DEFAULT_RETRY_LIMIT,
         retryDelays: {
            ...AxiosSvc.DEFAULT_RETRY_DELAYS,
            ...retryConfig.retryDelays,
         },
      };

      // Freeze retry config to prevent mutations
      Object.freeze(this.#retryConfig.retryDelays);
      Object.freeze(this.#retryConfig);
   }

   /**
    * Sends an HTTP request with automatic retry logic.
    *
    * @async
    * @param {Object} axiosRequest - Axios request configuration
    * @param {string} axiosRequest.method - HTTP method (GET, POST, etc.)
    * @param {string} axiosRequest.url - Request URL
    * @param {string} [axiosRequest.baseURL] - Base URL override
    * @param {Object} [axiosRequest.headers] - Custom headers
    * @param {Object} [axiosRequest.data] - Request body data
    * @param {number} [axiosRequest.timeout] - Request timeout
    * @returns {Promise<*>} Response data from the API
    * @throws {CustomError} If all retry attempts fail
    */
   async sendRequestAsync(axiosRequest) {
      let lastError;

      for (let retryCounter = 1; retryCounter <= this.#retryConfig.retryLimit; retryCounter++) {
         try {
            const token = axiosRequest.headers?.Authorization ? null : await tokenSvc.getValidTokenAsync();

            const request = AxiosSvc.#buildRequest(axiosRequest, token);

            return await this.#instance(request);
         } catch (err) {
            lastError = err;

            const shouldRetry = await this.#requestErrorHandlerAsync(err, retryCounter, this.#retryConfig.retryLimit);

            if (!shouldRetry) break;
         }
      }

      throw new CustomError({
         message: 'Request failed after all retry attempts',
         className: AxiosSvc.#CLASS_NAME,
         functionName: 'sendRequestAsync',
         parameters: {
            retryLimit: this.#retryConfig.retryLimit,
            url: axiosRequest.url,
            method: axiosRequest.method,
         },
         details: lastError,
      }).toObject();
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Builds a complete request configuration with headers and authentication.
    *
    * @private
    * @static
    * @param {Object} axiosRequest - Partial axios request configuration
    * @param {string|null} token - OAuth token for Bearer authentication (null if custom auth provided)
    * @returns {Object} Complete axios request configuration
    * @throws {CustomError} If method or url is missing
    */
   static #buildRequest(axiosRequest, token = null) {
      if (!axiosRequest.method || !axiosRequest.url) {
         throw new CustomError({
            message: `Invalid Request: "method" and "url" are REQUIRED.`,
            className: AxiosSvc.#CLASS_NAME,
            functionName: '#buildRequest',
            parameters: axiosRequest,
         }).toObject();
      }

      const baseURL = axiosRequest.baseURL || Constants.GENESYS_ENDPOINT_URL;
      const contentType = axiosRequest.headers?.['Content-Type'] || 'application/json';
      const authorization = axiosRequest.headers?.Authorization || (token ? `Bearer ${token}` : null);

      const headers = {
         'Content-Type': contentType,
         ...axiosRequest.headers,
      };

      if (authorization) {
         headers.Authorization = authorization;
      }

      return {
         ...axiosRequest,
         baseURL,
         headers,
         timeout: axiosRequest.timeout,
      };
   }

   /**
    * Handles request errors and determines retry strategy.
    * This is an instance method because it uses instance retry configuration.
    *
    * @private
    * @async
    * @param {Object} error - Error object from failed request
    * @param {number} retryCounter - Current retry attempt number
    * @param {number} retryLimit - Maximum retry attempts
    * @returns {Promise<boolean>} True if it should retry, false otherwise
    * @throws {CustomError} For client errors or after max retries
    */
   async #requestErrorHandlerAsync(error, retryCounter, retryLimit) {
      const statusCode = error.details?.status;
      const numericStatusCode = typeof statusCode === 'string' ? parseInt(statusCode, 10) : statusCode;

      // Known issues - don't log for 401/429 (common and handled)
      if (numericStatusCode !== 401 && numericStatusCode !== 429) {
         logger.error(`API Request ERROR:\n${JSON.stringify(error, null, 3)}\n[Attempt ${retryCounter}/${retryLimit}]`);
      }

      if (retryCounter === retryLimit) {
         throw new CustomError({
            message: `Request ERROR After ${retryLimit} Times Retries!`,
            className: AxiosSvc.#CLASS_NAME,
            functionName: '#requestErrorHandlerAsync',
            details: error,
         }).toObject();
      }

      switch (numericStatusCode) {
         case undefined:
         case 400:
         case 404: {
            throw new CustomError({
               message: `Client error - no retry attempted`,
               className: AxiosSvc.#CLASS_NAME,
               functionName: '#requestErrorHandlerAsync',
               details: error,
            }).toObject();
         }

         case 401:
            logger.info('Token expired - refreshing and retrying');
            await tokenSvc.cleanTokenAsync();
            await setTimeout(this.#retryConfig.retryDelays.default);
            return true;

         case 429:
            // Calling APIs too frequently
            await setTimeout(this.#retryConfig.retryDelays.rateLimited);
            return true;

         case 500:
         case 502:
         case 503:
         case 504: {
            // Server errors - exponential backoff
            const delay = this.#retryConfig.retryDelays.serverError * Math.pow(2, retryCounter - 1);
            logger.error(`Server error (${numericStatusCode}) - waiting ${delay}ms before retry`);
            await setTimeout(delay);
            return true;
         }

         default: {
            // Network errors or other issues - standard retry
            const standardDelay = this.#retryConfig.retryDelays.default * retryCounter;
            logger.error(`Unexpected error (${numericStatusCode || 'unknown'}) - waiting ${standardDelay}ms before retry`);
            await setTimeout(standardDelay);
            return true;
         }
      }
   }
}

/**
 * Default HTTP service instance for application-wide use.
 * This singleton instance should be used in most cases for convenience.
 *
 * @type {AxiosSvc}
 */
const axiosSvc = new AxiosSvc();

// Export singleton as default (most common usage)
export default axiosSvc;

// Also export the class for DI scenarios (testing, custom instances)
export { AxiosSvc };

// Sample Usage:
//
// 1. Default singleton (most common):
(async () => {
   const request = {
      method: 'POST',
      url: '/api/v2/analytics/conversations/details/query',
      data: {
         order: 'asc',
         orderBy: 'conversationStart',
         interval: '2025-07-01T00:00Z/2025-07-01T00:30Z',
         paging: {
            pageSize: Constants.DEFAULT_API_PAGE_SIZE,
            pageNumber: 1,
         },
      },
   };
   const response = await axiosSvc.sendRequestAsync(request);
   console.log('response: ', response.conversations.length);
})();
//
// 2. Dependency Injection (for testing):
// import { AxiosService } from './services/axiosService.js';
// const mockAxios = jest.fn();
// const testService = new AxiosService(mockAxios);
//
// 3. Custom retry configuration:
// import { AxiosService } from './services/axiosService.js';
// import AxiosFactory from './factories/axiosFactory.js';
// const customService = new AxiosService(
//    AxiosFactory.getInstance(),
//    { retryLimit: 5, retryDelays: { default: 5000 } }
// );
