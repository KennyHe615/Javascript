import logger from './winstonSvc.js';
import DatabaseError from '../utils/errors/databaseError.js';
import CustomError from '../utils/errors/customError.js';
import { setTimeout } from 'timers/promises';

/**
 * Service class for managing Sequelize database operations.
 * Provides connection management (instance methods) and common database operations (static utility methods).
 *
 * @class SequelizeSvc
 */
export default class SequelizeSvc {
   static #CLASS_NAME = 'SequelizeSvc';
   static #CONFIG = Object.freeze({
      batchSize: 100,
      maxRetries: 3,
      retryDelay: 500,
   });

   #instance;

   /**
    * Creates a new SequelizeSvc instance.
    *
    * @param {import('sequelize').Sequelize} instance - Sequelize instance (required for DI)
    * @throws {CustomError} If sequelize instance is not provided
    */
   constructor(instance) {
      if (!instance) {
         throw new CustomError({
            message: 'Sequelize Instance is required',
            className: SequelizeSvc.#CLASS_NAME,
            functionName: 'constructor',
         }).toObject();
      }

      this.#instance = instance;
   }

   /**
    * Establishes database connection.
    *
    * @async
    * @returns {Promise<void>}
    * @throws {DatabaseError} When connection fails
    */
   async connectAsync() {
      const dbName = this.#instance?.config?.database;

      try {
         await this.#instance.authenticate();

         await this.#instance.query('SELECT 1 AS connection_test');

         logger.info(`Database ${dbName} Connected SUCCESSFULLY!`);
      } catch (err) {
         logger.error(`Database connection error: ${JSON.stringify({ database: dbName, error: err.message }, null, 3)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }

   /**
    * Closes database connection.
    *
    * @async
    * @returns {Promise<void>}
    * @throws {DatabaseError} When disconnection fails
    */
   async disconnectAsync() {
      const dbName = this.#instance?.config?.database;

      try {
         await this.#instance.close();

         logger.info(`Database ${dbName} Disconnected SUCCESSFULLY!`);
      } catch (err) {
         logger.error(`Database disconnection error: ${JSON.stringify({ database: dbName, error: err.message }, null, 3)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }

   /**
    * Performs upsert operation on the database.
    * This is a static utility method that works with any Sequelize model.
    *
    * @static
    * @async
    * @param {Object|Array} mappedData - Data to upsert (single object or array of objects)
    * @param {import('sequelize').Model} model - Sequelize model (already bound to a connection)
    * @returns {Promise<void>}
    * @throws {CustomError} When upsert operation fails
    * @example
    * await SequelizeSvc.upsert({ id: 1, name: 'John' }, UserModel);
    * await SequelizeSvc.upsert([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }], UserModel);
    */
   static async upsertAsync(mappedData, model) {
      if (!mappedData || !model) {
         throw new CustomError({
            message: 'Both "mappedData" and "model" are required!',
            className: SequelizeSvc.#CLASS_NAME,
            functionName: 'upsertAsync',
            parameters: { modelName: model?.NAME },
         }).toObject();
      }

      const data = Array.isArray(mappedData) ? mappedData : [mappedData];
      if (data.length === 0) return;

      // Process data in batches to reduce deadlock probability
      for (let i = 0; i < data.length; i += SequelizeSvc.#CONFIG.batchSize) {
         const batch = data.slice(i, i + SequelizeSvc.#CONFIG.batchSize);

         // Retry mechanism for deadlock handling
         let attempt = 0;
         let batchSuccess = false;
         let lastRow = null;
         let lastError = null;

         while (attempt < SequelizeSvc.#CONFIG.maxRetries && !batchSuccess) {
            try {
               // Process each row in the batch sequentially to avoid concurrent deadlocks
               for (const row of batch) {
                  lastRow = row;

                  await model.upsert(row, { fields: model?.FIELDS || [] });
               }

               batchSuccess = true;
            } catch (err) {
               lastError = new DatabaseError(lastRow, err).toObject();

               // Check if the error is a deadlock error
               const isDeadlock =
                  err.original &&
                  typeof err.original.message === 'string' &&
                  (err.original.message.includes('deadlock') || err.original.message.includes('Deadlock'));

               if (isDeadlock) {
                  attempt++;
                  if (attempt < SequelizeSvc.#CONFIG.maxRetries) {
                     // Wait before retrying with exponential backoff
                     await setTimeout(SequelizeSvc.#CONFIG.retryDelay * Math.pow(2, attempt - 1));
                     continue;
                  }
               }

               // If it's not a deadlock, or we've exhausted retries, break out of the retry loop
               break;
            }
         }

         // If the batch failed after all retries, throw the error
         if (!batchSuccess && lastError) {
            throw new CustomError({
               message: 'Upserting Record ERROR!',
               className: SequelizeSvc.#CLASS_NAME,
               functionName: 'upsertAsync',
               parameters: {
                  modelName: model?.NAME,
                  attempt,
               },
               details: lastError,
            }).toObject();
         }
      }

      logger.debug(`========== [Model: ${model?.NAME}] ========== Successfully upserted ${data.length} records`);
   }

   /**
    * Creates a new record in the database.
    *
    * @static
    * @async
    * @param {Object} mappedData - Data to create
    * @param {import('sequelize').Model} model - Sequelize model (already bound to a connection)
    * @returns {Promise<Object>} Created record
    * @throws {CustomError} When create operation fails or data is empty
    */
   static async createAsync(mappedData, model) {
      if (!mappedData || !model) {
         throw new CustomError({
            message: 'Both "mappedData" and "model" are required!',
            className: SequelizeSvc.#CLASS_NAME,
            functionName: 'createAsync',
            parameters: { modelName: model?.NAME },
         }).toObject();
      }

      if (Object.keys(mappedData).length === 0) {
         throw new CustomError({
            message: 'No data provided for create operation',
            className: SequelizeSvc.#CLASS_NAME,
            functionName: 'createAsync',
            parameters: { modelName: model?.NAME },
         });
      }

      try {
         return await model.create(mappedData);
      } catch (err) {
         logger.error(`Create operation failed: ${JSON.stringify(err, null, 3)}`);

         throw new DatabaseError(mappedData, err).toObject();
      }
   }

   /**
    * DELETED: Due to limitations with MSSQL datetimeoffset precision control
    *
    * Synchronizes a Sequelize model with the database schema.
    * Only executes in development/local environments. In production, logs a warning instead.
    *
    * @static
    * @async
    * @param {import('sequelize').Model} model - Sequelize model to sync
    * @param {Object} [options={}] - Sync options
    * @param {boolean} [options.alter=true] - Alters existing tables to match model (safer)
    * @param {boolean} [options.force=false] - Drops and recreates tables (destructive)
    * @returns {Promise<void>}
    * @throws {CustomError} When sync operation fails
    * @example
    * await SequelizeSvc.syncModelAsync(UserModel);
    * await SequelizeSvc.syncModelAsync(UserModel, { alter: true });
    * await SequelizeSvc.syncModelAsync(UserModel, { force: true });

   static async syncModelAsync(model, options) {
      const env = Constants.RUNNING_ENVIRONMENT?.toLowerCase() || '';
      const isDevelopment = env.startsWith('dev') || env.startsWith('local');
      const modelName = model?.getTableName?.() || model?.NAME || 'Unknown';

      if (!isDevelopment) {
         logger.warn(
            `Model sync is disabled for ${modelName} in ${Constants.RUNNING_ENVIRONMENT} environment. Schema changes must be applied manually.`,
         );

         return;
      }

      const syncOptions = {
         alter: options?.alter ?? true,
         force: options?.force ?? false,
      };

      try {
         await model.sync(syncOptions);

         logger.debug(`Model ${modelName} synced successfully with options: ${JSON.stringify(syncOptions)}`);
      } catch (err) {
         throw new CustomError({
            message: 'Failed to sync model',
            className: SequelizeSvc.#CLASS_NAME,
            functionName: 'syncModelAsync',
            parameters: { modelName },
            details: err,
         }).toObject();
      }
   }
    */
}

// Sample Usage:
//
// 1. Connection management (instance methods):
// import SequelizeFactory from '../factories/sequelizeFactory.js';
// (async () => {
   // const dbSvc = new SequelizeSvc(SequelizeFactory.getInstance());
   // await dbSvc.connectAsync();
   // await dbSvc.disconnectAsync();
// })();
//
// 2. Database operations (static utility methods):
// import SequelizeSvc from './services/sequelizeSvc.js';
// import UserModel from './models/userModel.js';
//
// await SequelizeSvc.upsertAsync({ id: 1, name: 'John' }, UserModel);
// await SequelizeSvc.createAsync({ name: 'Jane' }, UserModel);
//
// 3. Combined usage:
// const dbService = new SequelizeSvc(SequelizeFactory.getStagingInstance());
// await dbService.connect();
// await SequelizeSvc.upsert(data, SomeModel);  // Static utility
// await dbService.disconnect();
