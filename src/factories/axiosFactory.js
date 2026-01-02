import axios from 'axios';
import AxiosConfiguration from '../configurations/axiosConfiguration.js';
import CustomError from '../utils/errors/customError.js';
import ApiRequestError from '../utils/errors/apiRequestError.js';

/**
 * Factory class for creating and managing Axios instances.
 * Implements the Singleton pattern to ensure only one HTTP client instance exists.
 * Provides pre-configured interceptors for error handling and response transformation.
 *
 * @class AxiosFactory
 */
export default class AxiosFactory {
   static #CLASS_NAME = 'AxiosFactory';
   static #instance = null;

   /**
    * Gets or creates the singleton Axios instance.
    *
    * @static
    * @param {AxiosConfiguration} [configuration] - Optional configuration object. Only used on first call.
    * @returns {import('axios').AxiosInstance} The Axios instance
    * @throws {CustomError} If instance creation fails
    */
   static getInstance(configuration = null) {
      if (!AxiosFactory.#instance) {
         const config = configuration ?? new AxiosConfiguration();

         AxiosFactory.#instance = AxiosFactory.#createInstance(config);
      }

      return AxiosFactory.#instance;
   }

   /**
    * Resets the singleton instance. Useful for testing or reconfiguration.
    *
    * @static
    * @returns {void}
    */
   static reset() {
      AxiosFactory.#instance = null;
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Creates a new Axios instance with the provided configuration and interceptors.
    *
    * @private
    * @static
    * @param {AxiosConfiguration} configuration - Configuration object
    * @returns {import('axios').AxiosInstance} Configured Axios instance
    * @throws {CustomError} If instance creation fails
    */
   static #createInstance(configuration) {
      AxiosFactory.#validateConfig(configuration);

      try {
         const config = {
            timeout: configuration.timeout,
            httpsAgent: configuration.httpsAgent,
            maxRedirects: configuration.maxRedirects,
            validateStatus: configuration.validateStatus,
         };

         if (configuration.baseURL) config.baseURL = configuration.baseURL;
         if (configuration.headers) config.headers = configuration.headers;

         const axiosInstance = axios.create(config);

         // Setup interceptors
         AxiosFactory.#setupInterceptors(axiosInstance);

         return axiosInstance;
      } catch (err) {
         throw new CustomError({
            message: 'Creating Axios Instance ERROR',
            className: AxiosFactory.#CLASS_NAME,
            functionName: '#createInstance',
            parameters: AxiosFactory.#sanitizeConfig(configuration),
            details: err,
         }).toObject();
      }
   }

   /**
    * Validates the Axios configuration object.
    *
    * @private
    * @static
    * @param {AxiosConfiguration} configuration - The Axios configuration object
    * @throws {CustomError} If configuration is invalid
    */
   static #validateConfig(configuration) {
      const errObj = new CustomError({
         message: '',
         className: AxiosFactory.#CLASS_NAME,
         functionName: '#validateConfig',
         parameters: AxiosFactory.#sanitizeConfig(configuration),
      }).toObject();

      if (!configuration) {
         errObj.message = 'Axios configuration is missing';

         throw errObj;
      }

      if (!configuration.timeout || typeof configuration.timeout !== 'number' || configuration.timeout <= 0) {
         errObj.message = 'Axios configuration timeout must be a positive number';

         throw errObj;
      }

      if (!configuration.httpsAgent) {
         errObj.message = 'Axios configuration httpsAgent is missing';

         throw errObj;
      }
   }

   /**
    * Sets up request and response interceptors for the Axios instance.
    *
    * @private
    * @static
    * @param {import('axios').AxiosInstance} axiosInstance - Axios instance to configure
    * @returns {void}
    */
   static #setupInterceptors(axiosInstance) {
      // Response interceptor - Extract data and handle errors
      axiosInstance.interceptors.response.use(
         (response) => response.data,
         (error) => {
            const apiError = new ApiRequestError(error);
            return Promise.reject(apiError.toObject());
         },
      );

      // Request interceptor can be added here if needed in the future
      // axiosInstance.interceptors.request.use(
      //    (config) => {
      //       // Add request transformations here
      //       return config;
      //    },
      //    (error) => Promise.reject(error)
      // );
   }

   /**
    * Sanitizes the configuration object by removing sensitive information.
    * Prevents exposure of sensitive data in logs and error messages.
    *
    * @private
    * @static
    * @param {AxiosConfiguration} configuration - The Axios configuration object
    * @returns {Object} Sanitized configuration object
    */
   static #sanitizeConfig(configuration) {
      if (!configuration) return {};

      const sanitized = {
         timeout: configuration.timeout,
         maxRedirects: configuration.maxRedirects,
         hasHttpsAgent: !!configuration.httpsAgent,
         hasValidateStatus: !!configuration.validateStatus,
      };

      if (configuration.baseURL) sanitized.baseURL = configuration.baseURL;
      if (configuration.headers) sanitized.headers = Object.keys(configuration.headers);

      return sanitized;
   }
}
