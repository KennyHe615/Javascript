import Constants from '../utils/constants.js';

/**
 * Configuration class for Sequelize database settings.
 * Provides static default configuration and allows instance-based customization.
 *
 * @class SequelizeConfiguration
 */
export default class SequelizeConfiguration {
   static #DEFAULT_CONFIG = Object.freeze({
      dialect: 'mssql',
      timezone: 'America/New_York',
      pool: Object.freeze({
         max: 30,
         min: 0,
         idle: 300000,
         acquire: 600000,
      }),
      dialectOptions: Object.freeze({
         options: {
            trustServerCertificate: true,
            encrypt: true,
            requestTimeout: 600000,
            connectionTimeout: 15000,
         },
         useUTC: false,
      }),
      retry: Object.freeze({
         max: 3,
      }),
      define: Object.freeze({
         schema: 'dbo',
         freezeTableName: true,
         // underscored: true, // This maps camelCase to snake_case automatically
         timestamps: true,
         createdAt: 'app_created_at',
         updatedAt: 'app_updated_at',
      }),
   });

   /**
    * Creates a new SequelizeConfiguration instance.
    *
    * @param {Object} [options={}] - Configuration options
    * @param {string} [options.database] - Database name override
    * @param {string} [options.username] - Database username override
    * @param {string} [options.password] - Database password override
    * @param {string} [options.host] - Database host override
    * @param {string} [options.dialect] - Database dialect override
    * @param {number} [options.port] - Database port override
    * @param {string} [options.timezone] - Timezone override
    * @param {boolean} [options.logging] - Enable query logging
    * @param {Object} [options.pool] - Pool configuration override
    * @param {Object} [options.dialectOptions] - Dialect options override
    * @param {Object} [options.retry] - Retry configuration override
    * @param {Object} [options.define] - Define options override
    */
   constructor(options = {}) {
      // Database credentials - allow override or use environment-based defaults
      this.database = options.database ?? Constants.SQL_DATABASE;
      this.username = options.username ?? Constants.SQL_USER;
      this.password = options.password ?? Constants.SQL_PW;

      // Sequelize options
      this.options = {
         host: options.host ?? Constants.SQL_SERVER,
         dialect: options.dialect ?? SequelizeConfiguration.#DEFAULT_CONFIG.dialect,
         port: options.port ?? Number(Constants.SQL_PORT),
         timezone: options.timezone ?? SequelizeConfiguration.#DEFAULT_CONFIG.timezone,
         logging: options.logging ?? false,
         // logging: (msg) => console.log("sequelize Log: ", msg),

         // Pool configuration - merge with defaults
         pool: {
            ...SequelizeConfiguration.#DEFAULT_CONFIG.pool,
            ...options.pool,
         },

         // Dialect options - merge with defaults
         dialectOptions: {
            options: {
               ...SequelizeConfiguration.#DEFAULT_CONFIG.dialectOptions.options,
               ...options.dialectOptions?.options,
            },
            useUTC: options.dialectOptions?.useUTC ?? SequelizeConfiguration.#DEFAULT_CONFIG.dialectOptions.useUTC,
         },

         // Retry configuration - merge with defaults
         retry: {
            ...SequelizeConfiguration.#DEFAULT_CONFIG.retry,
            ...options.retry,
         },

         // Define options - merge with defaults
         define: {
            ...SequelizeConfiguration.#DEFAULT_CONFIG.define,
            ...options.define,
         },
      };

      // Freeze nested objects to prevent mutations
      Object.freeze(this.options.pool);
      Object.freeze(this.options.dialectOptions.options);
      Object.freeze(this.options.dialectOptions);
      Object.freeze(this.options.retry);
      Object.freeze(this.options.define);
      Object.freeze(this.options);

      // Freeze the main instance
      Object.freeze(this);
   }
}
