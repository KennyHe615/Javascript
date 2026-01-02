import https from 'node:https';

/**
 * Configuration class for Axios HTTP client settings.
 * Provides static default configuration and allows instance-based customization.
 *
 * @class AxiosConfiguration
 */
export default class AxiosConfiguration {
   static #DEFAULT_CONFIG = Object.freeze({
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
      httpsAgent: Object.freeze({
         rejectUnauthorized: false
      })
   });

   /**
    * Creates a new AxiosConfiguration instance.
    *
    * @param {Object} [options={}] - Configuration options
    * @param {number} [options.timeout] - Request timeout in milliseconds
    * @param {boolean} [options.rejectUnauthorized] - Whether to reject unauthorized SSL certificates
    * @param {import('https').Agent} [options.httpsAgent] - Custom HTTPS agent (if provided, rejectUnauthorized is ignored)
    * @param {string} [options.baseURL] - Base URL for all requests
    * @param {Object} [options.headers] - Default headers for all requests
    * @param {number} [options.maxRedirects] - Maximum number of redirects to follow
    * @param {Function} [options.validateStatus] - Custom function to determine if status is valid
    * @param {Object} [options.httpsAgentOptions] - Additional HTTPS agent options (keepAlive, maxSockets, etc.)
    */
   constructor(options = {}) {
      this.timeout = options.timeout ?? AxiosConfiguration.#DEFAULT_CONFIG.timeout;
      this.maxRedirects = options.maxRedirects ?? AxiosConfiguration.#DEFAULT_CONFIG.maxRedirects;
      this.validateStatus = options.validateStatus ?? AxiosConfiguration.#DEFAULT_CONFIG.validateStatus;

      // HTTPS Agent configuration
      // NOTE: Cannot freeze this because axios gonna update it when calling APIs
      if (options.httpsAgent) {
         this.httpsAgent = options.httpsAgent;
      } else {
         const agentOptions = {
            rejectUnauthorized: options.rejectUnauthorized ?? AxiosConfiguration.#DEFAULT_CONFIG.httpsAgent.rejectUnauthorized,
            ...options.httpsAgentOptions
         };
         this.httpsAgent = new https.Agent(agentOptions);
      }

      // Optional configurations with proper freezing
      if (options.baseURL) this.baseURL = options.baseURL;

      if (options.headers) {
         this.headers = { ...options.headers };
         Object.freeze(this.headers);
      }

      // Freeze the instance to prevent accidental mutations
      Object.freeze(this);
   }
}