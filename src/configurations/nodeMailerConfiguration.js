import Constants from '../utils/constants.js';

/**
 * Configuration class for NodeMailer SMTP settings.
 * Provides static default configuration and allows instance-based customization.
 *
 * @class NodeMailerConfiguration
 */
export default class NodeMailerConfiguration {
   static #DEFAULT_CONFIG = Object.freeze({
      pool: true, // Default pool configuration
      secure: false, // Default secure connection setting
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      maxConnections: 5,
      maxMessages: 100, // Default maximum messages per connection
      rateDelta: 1000, // Default rate limiting delta in milliseconds
      rateLimit: 5, // Default rate limit (messages per delta)
   });

   /**
    * Creates a new NodeMailerConfiguration instance.
    *
    * @param {Object} [options={}] - Optional configuration overrides
    * @param {boolean} [options.pool] - Enable connection pooling
    * @param {string} [options.host] - SMTP server host
    * @param {number} [options.port] - SMTP server port
    * @param {boolean} [options.secure] - Use secure connection (TLS)
    * @param {Object} [options.auth] - Authentication credentials
    * @param {string} [options.auth.user] - SMTP username
    * @param {string} [options.auth.pass] - SMTP password
    * @param {number} [options.connectionTimeout] - Connection timeout in ms
    * @param {number} [options.greetingTimeout] - Greeting timeout in ms
    * @param {number} [options.socketTimeout] - Socket timeout in ms
    * @param {number} [options.maxConnections] - Maximum pool connections
    * @param {number} [options.maxMessages] - Maximum messages per connection
    * @param {number} [options.rateDelta] - Rate limiting time window in ms
    * @param {number} [options.rateLimit] - Maximum messages per rate delta
    */
   constructor(options = {}) {
      this.pool = options.pool ?? NodeMailerConfiguration.#DEFAULT_CONFIG.pool;
      this.host = options.host ?? Constants.EMAIL_HOST;
      this.port = options.port ?? Number(Constants.EMAIL_PORT);
      this.secure = options.secure ?? NodeMailerConfiguration.#DEFAULT_CONFIG.secure;

      // Authentication configuration
      this.auth = {
         user: options.auth?.user ?? Constants.EMAIL_USER,
         pass: options.auth?.pass ?? Constants.EMAIL_PW,
      };

      // Timeout configurations
      this.connectionTimeout = options.connectionTimeout ?? NodeMailerConfiguration.#DEFAULT_CONFIG.connectionTimeout;
      this.greetingTimeout = options.greetingTimeout ?? NodeMailerConfiguration.#DEFAULT_CONFIG.greetingTimeout;
      this.socketTimeout = options.socketTimeout ?? NodeMailerConfiguration.#DEFAULT_CONFIG.socketTimeout;

      // Pool configurations
      this.maxConnections = options.maxConnections ?? NodeMailerConfiguration.#DEFAULT_CONFIG.maxConnections;
      this.maxMessages = options.maxMessages ?? NodeMailerConfiguration.#DEFAULT_CONFIG.maxMessages;

      // Rate limiting configurations
      this.rateDelta = options.rateDelta ?? NodeMailerConfiguration.#DEFAULT_CONFIG.rateDelta;
      this.rateLimit = options.rateLimit ?? NodeMailerConfiguration.#DEFAULT_CONFIG.rateLimit;

      // Freeze nested objects to prevent mutations
      Object.freeze(this.auth);

      // Freeze the instance to prevent accidental mutations
      Object.freeze(this);
   }
}