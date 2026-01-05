import { Sequelize } from 'sequelize';
import SequelizeConfiguration from '../configurations/sequelizeConfiguration.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Factory class for creating and managing a singleton Sequelize instance.
 * Implements the Singleton pattern to ensure only one database connection pool exists.
 *
 * @class SequelizeFactory
 */
export default class SequelizeFactory {
   static #CLASS_NAME = 'SequelizeFactory';
   static #instance = null;

   /**
    * Gets or creates the singleton Sequelize instance.
    *
    * @static
    * @param {SequelizeConfiguration} [configuration] - Optional configuration object. Only used on first call.
    * @returns {Sequelize} The Sequelize instance
    * @throws {CustomError} If instance creation fails
    */
   static getInstance(configuration = null) {
      if (!SequelizeFactory.#instance) {
         const config = configuration ?? new SequelizeConfiguration();

         SequelizeFactory.#instance = SequelizeFactory.#createInstance(config);
      }

      return SequelizeFactory.#instance;
   }

   /**
    * Resets the singleton instance. Useful for testing or reconfiguration.
    * Properly closes the database connection before clearing the instance.
    *
    * @static
    * @async
    * @returns {Promise<void>}
    */
   static async resetAsync() {
      if (SequelizeFactory.#instance) {
         try {
            await SequelizeFactory.#instance.close();
         } catch (err) {
            // Ignore close errors during cleanup
         }
      }

      SequelizeFactory.#instance = null;
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Creates a new Sequelize instance with the provided configuration.
    *
    * @private
    * @static
    * @param {SequelizeConfiguration} configuration - Configuration object
    * @returns {Sequelize} Configured Sequelize instance
    * @throws {CustomError} If instance creation fails
    */
   static #createInstance(configuration) {
      // Validate configuration
      SequelizeFactory.#validateConfig(configuration);

      try {
         // Create Sequelize instance
         return new Sequelize(configuration.database, configuration.username, configuration.password, configuration.options);
      } catch (err) {
         throw new CustomError({
            message: 'Creating Sequelize Instance ERROR',
            className: SequelizeFactory.#CLASS_NAME,
            functionName: '#createInstance',
            parameters: SequelizeFactory.#sanitizeConfig(configuration),
            details: err,
         }).toObject();
      }
   }

   /**
    * Validates the Sequelize configuration object.
    *
    * @private
    * @static
    * @param {SequelizeConfiguration} configuration - The Sequelize configuration object
    * @throws {CustomError} If required configuration fields are missing or invalid
    */
   static #validateConfig(configuration) {
      const errorObj = new CustomError({
         message: '',
         className: SequelizeFactory.#CLASS_NAME,
         functionName: '#validateConfig',
      }).toObject();

      if (!configuration) {
         errorObj.message = 'Sequelize configuration is missing';

         throw errorObj;
      }

      // Validate required fields
      const requiredFields = ['database', 'username', 'password', 'options'];
      const missingFields = requiredFields.filter((field) => !configuration[field]);

      if (missingFields.length > 0) {
         errorObj.message = 'Sequelize configuration is incomplete';
         errorObj.parameters = {
            missingFields,
            providedConfig: SequelizeFactory.#sanitizeConfig(configuration),
         };

         throw errorObj;
      }

      if (!configuration.options.host) {
         errorObj.message = 'Sequelize configuration missing host in options';
         errorObj.parameters = {
            providedConfig: SequelizeFactory.#sanitizeConfig(configuration),
         };

         throw errorObj;
      }

      if (!configuration.options?.dialect) {
         errorObj.message = 'Sequelize configuration missing dialect in options';
         errorObj.parameters = {
            providedConfig: SequelizeFactory.#sanitizeConfig(configuration),
         };

         throw errorObj;
      }
   }

   /**
    * Sanitizes the configuration object by redacting sensitive information.
    * Prevents password exposure in logs and error messages.
    * Explicitly copies fields to avoid issues with frozen objects.
    *
    * @private
    * @static
    * @param {SequelizeConfiguration} configuration - The Sequelize configuration object
    * @returns {Object} Sanitized configuration object with redacted password
    */
   static #sanitizeConfig(configuration) {
      if (!configuration) return {};

      return {
         database: configuration.database,
         username: configuration.username,
         password: configuration.password ? '[REDACTED]' : null,
         options: configuration.options
            ? {
                 host: configuration.options.host,
                 dialect: configuration.options.dialect,
                 port: configuration.options.port,
                 timezone: configuration.options.timezone,
              }
            : null,
      };
   }
}
