/**
 * ApiRequestError - Normalizes HTTP request/response errors into a safe, structured format.
 * Handles both network-level errors (no response) and HTTP-level errors (with response).
 *
 * @extends Error
 */
export default class ApiRequestError extends Error {
   static #CLASS_NAME = 'ApiRequestError';
   static #UNKNOWN = 'Unknown';
   static #DEFAULT_MESSAGE = 'Unknown Error Occurred';

   #originalError;

   /**
    * Creates an ApiRequestError instance.
    *
    * @param {Object} [error={}] - Original error object from HTTP client (axios, fetch, etc.)
    * @param {string} [error.message] - Error message
    * @param {string|number} [error.code] - Error code (for network errors)
    * @param {Object} [error.request] - Request-level info (network errors)
    * @param {Object} [error.request._options] - Request options (node-fetch style)
    * @param {string} [error.request._options.path] - Request path
    * @param {string} [error.request._options.method] - HTTP method
    * @param {Object} [error.response] - Response object (HTTP errors)
    * @param {number} [error.response.status] - HTTP status code
    * @param {string} [error.response.statusText] - HTTP status text
    * @param {Object} [error.response.data] - Response data
    * @param {Object} [error.response.config] - Request configuration
    * @param {string} [error.response.config.method] - HTTP method
    * @param {string} [error.response.config.url] - Request URL
    * @param {*} [error.response.config.data] - Request body data
    */
   constructor(error = {}) {
      const message = error?.message || ApiRequestError.#DEFAULT_MESSAGE;
      super(message);

      this.name = ApiRequestError.#CLASS_NAME;
      this.#originalError = error;
   }

   /**
    * Converts the error into a normalized plain object.
    * Handles both request-level errors (network issues) and HTTP-level errors (server responses).
    *
    * @returns {Object} Normalized error object
    * @returns {string} return.className - Error class name
    * @returns {string} [return.message] - Error message from response
    * @returns {Object} return.details - Error details
    * @returns {number|string} [return.details.status] - HTTP status code or error code
    * @returns {string} [return.details.statusText] - Status text or error message
    * @returns {string} return.details.url - Request URL
    * @returns {string} return.details.method - HTTP method
    * @returns {*} [return.details.requestData] - Request body data (if available)
    */
   toObject() {
      const error = this.#originalError || {};

      if (this.#hasResponse(error)) {
         return this.#buildHttpErrorObject(error);
      }

      return this.#buildNetworkErrorObject(error);
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Checks if the error contains an HTTP response.
    *
    * @private
    * @param {Object} error - Error object
    * @returns {boolean} True if response exists
    */
   #hasResponse(error) {
      return error?.response && typeof error.response === 'object';
   }

   /**
    * Builds error object for HTTP-level errors (errors with server response).
    *
    * @private
    * @param {Object} error - Error object with response
    * @returns {Object} Normalized HTTP error object
    */
   #buildHttpErrorObject(error) {
      const { response } = error;
      const { status, statusText, data: responseData = {}, config = {} } = response;
      const { method, url, data: requestData } = config;

      const errorObj = {
         className: ApiRequestError.#CLASS_NAME,
         details: {
            url: url || ApiRequestError.#UNKNOWN,
            method: method || ApiRequestError.#UNKNOWN,
         },
      };

      if (responseData?.message) errorObj.message = responseData.message;

      if (status !== undefined && status !== null) errorObj.details.status = status;

      if (statusText) errorObj.details.statusText = statusText;

      if (requestData !== undefined && requestData !== null) {
         errorObj.details.requestData = this.#limitRequestData(requestData);
      }

      return errorObj;
   }

   /**
    * Limits the size of request data based on its type.
    *
    * @private
    * @param {*} data - Request data to limit
    * @returns {*} Limited request data
    */
   #limitRequestData(data) {
      if (typeof data === 'string') {
         return data.length > 1000 ? data.substring(0, 1000) + '...[truncated]' : data;
      }

      if (Array.isArray(data) && data.length > 10) {
         return [...data.slice(0, 10), `...[${data.length - 10} more items truncated]`];
      }

      return data;
   }

   /**
    * Builds error object for network-level errors (no response from server).
    *
    * @private
    * @param {Object} error - Error object without response
    * @returns {Object} Normalized network error object
    */
   #buildNetworkErrorObject(error) {
      const { message = ApiRequestError.#DEFAULT_MESSAGE, code, request } = error;

      return {
         className: ApiRequestError.#CLASS_NAME,
         details: {
            status: code || ApiRequestError.#UNKNOWN,
            statusText: message,
            url: request?._options?.path || ApiRequestError.#UNKNOWN,
            method: request?._options?.method || ApiRequestError.#UNKNOWN,
         },
      };
   }
}