import nodemailer from 'nodemailer';
import NodeMailerConfiguration from '../configurations/nodeMailerConfiguration.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Factory class for creating and managing a singleton NodeMailer transporter instance.
 * Implements the Singleton pattern to ensure only one email transport instance exists.
 *
 * @class NodeMailerFactory
 */
export default class NodeMailerFactory {
   static #CLASS_NAME = 'NodeMailerFactory';
   static #instance = null;

   /**
    * Gets or creates the singleton NodeMailer transporter instance.
    *
    * @static
    * @param {NodeMailerConfiguration} [configuration] - Optional configuration object. Only used on first call.
    * @returns {import('nodemailer').Transporter} The NodeMailer transporter instance
    * @throws {CustomError} If transporter creation fails
    */
   static getInstance(configuration = null) {
      if (!NodeMailerFactory.#instance) {
         const config = configuration ?? new NodeMailerConfiguration();

         NodeMailerFactory.#instance = NodeMailerFactory.#createTransporter(config);
      }

      return NodeMailerFactory.#instance;
   }

   /**
    * Resets the singleton instance. Useful for testing or reconfiguration.
    *
    * @static
    * @returns {void}
    */
   static reset() {
      if (NodeMailerFactory.#instance) {
         try {
            NodeMailerFactory.#instance.close();
         } catch (err) {
            // Ignore close errors during cleanup
         }

         NodeMailerFactory.#instance = null;
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Creates a new NodeMailer transporter instance with the provided configuration.
    *
    * @private
    * @static
    * @param {NodeMailerConfiguration} configuration - Configuration object
    * @returns {import('nodemailer').Transporter} Configured NodeMailer transporter instance
    * @throws {CustomError} If transporter creation fails
    */
   static #createTransporter(configuration) {
      // Validate configuration
      NodeMailerFactory.#validateConfig(configuration);

      try {
         // Create transporter instance
         return nodemailer.createTransport({
            pool: configuration.pool,
            host: configuration.host,
            port: configuration.port,
            secure: configuration.secure,
            auth: {
               user: configuration.auth.user,
               pass: configuration.auth.pass,
            },
            connectionTimeout: configuration.connectionTimeout,
            greetingTimeout: configuration.greetingTimeout,
            socketTimeout: configuration.socketTimeout,
            maxConnections: configuration.maxConnections,
            maxMessages: configuration.maxMessages,
            rateDelta: configuration.rateDelta,
            rateLimit: configuration.rateLimit,
         });
      } catch (err) {
         throw new CustomError({
            message: 'Creating NodeMailer Instance ERROR',
            className: NodeMailerFactory.#CLASS_NAME,
            functionName: '#createTransporter',
            parameters: NodeMailerFactory.#sanitizeConfig(configuration),
            details: err,
         }).toObject();
      }
   }

   /**
    * Validates the NodeMailer configuration object.
    *
    * @private
    * @static
    * @param {NodeMailerConfiguration} configuration - The NodeMailer configuration object
    * @throws {CustomError} If required configuration fields are missing
    */
   static #validateConfig(configuration) {
      if (!configuration) {
         throw new CustomError({
            message: 'NodeMailer configuration is missing',
            className: NodeMailerFactory.#CLASS_NAME,
            functionName: '#validateConfig',
         }).toObject();
      }

      // Validate required fields
      const requiredFields = ['host', 'port', 'auth'];
      const missingFields = requiredFields.filter((field) => !configuration[field]);

      if (missingFields.length > 0) {
         throw new CustomError({
            message: 'NodeMailer configuration is incomplete',
            className: NodeMailerFactory.#CLASS_NAME,
            functionName: '#validateConfig',
            parameters: { missingFields, providedConfig: NodeMailerFactory.#sanitizeConfig(configuration) },
         }).toObject();
      }

      // Validate authentication credentials
      if (!configuration.auth?.user || !configuration.auth?.pass) {
         throw new CustomError({
            message: 'NodeMailer authentication credentials are missing',
            className: NodeMailerFactory.#CLASS_NAME,
            functionName: '#validateConfig',
            parameters: {
               hasUser: !!configuration.auth.user,
               hasPassword: !!configuration.auth.pass,
            },
         }).toObject();
      }
   }

   /**
    * Sanitizes the configuration object by redacting sensitive information.
    * Prevents password exposure in logs and error messages.
    * Explicitly copies all fields to avoid issues with frozen objects
    *
    * @private
    * @static
    * @param {NodeMailerConfiguration} configuration - The NodeMailer configuration object
    * @returns {Object} Sanitized configuration object with redacted password
    */
   static #sanitizeConfig(configuration) {
      if (!configuration) return {};

      return {
         pool: configuration.pool,
         host: configuration.host,
         port: configuration.port,
         secure: configuration.secure,
         auth: {
            user: configuration.auth?.user,
            pass: configuration.auth?.pass ? '[REDACTED]' : null,
         },
         connectionTimeout: configuration.connectionTimeout,
         greetingTimeout: configuration.greetingTimeout,
         socketTimeout: configuration.socketTimeout,
         maxConnections: configuration.maxConnections,
         maxMessages: configuration.maxMessages,
         rateDelta: configuration.rateDelta,
         rateLimit: configuration.rateLimit,
      };
   }
}
