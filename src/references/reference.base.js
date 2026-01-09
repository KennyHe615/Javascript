import refApiSvc from './refApi.svc.js';
import SequelizeSvc from '../services/sequelizeSvc.js';
import logger from '../services/winstonSvc.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Base class for reference data synchronization operations.
 * Handles fetching data from API, mapping, and upserting to database with automatic schema sync.
 *
 * @class ReferenceBase
 */
export default class ReferenceBase {
   static #CLASS_NAME = 'ReferenceBase';

   #refApiSvc;

   /**
    * Creates a new ReferenceBase instance.
    *
    * @param {string} initialUrl - Initial API URL to fetch reference data
    * @param {Object} mapper - Mapper object with map() method to transform API data
    * @param {import('sequelize').Model} model - Sequelize model for database operations
    * @param {Object} [dependencies={}] - Optional dependencies for DI
    * @param {Object} [dependencies.refApiSvc] - Reference API service override
    */
   constructor(initialUrl, mapper, model, dependencies = {}) {
      this.initialUrl = initialUrl;
      this.mapper = mapper;
      this.model = model;
      this.#refApiSvc = dependencies.refApiSvc ?? refApiSvc;
   }

   /**
    * Executes the reference data synchronization workflow:
    * 1. Syncs model schema (development only)
    * 2. Fetches data from API
    * 3. Maps data to model format
    * 4. Upserts data to database
    *
    * @async
    * @returns {Promise<boolean>} Returns true on successful completion
    * @throws {CustomError} When any step in the workflow fails
    */
   async runAsync() {
      try {
         await SequelizeSvc.syncModelAsync(this.model, { alter: true });

         const data = await this.#refApiSvc.getReferenceDataAsync(this.initialUrl, this.model.NAME);

         if (!data || data.length === 0) {
            logger.warn(`========== [${this.model.NAME}] ========== No data received from API`);

            return true;
         }

         const mappedData = this.mapper.map(data);

         await SequelizeSvc.upsertAsync(mappedData, this.model);

         logger.debug(`========== [${this.model.NAME}] ========== Reference data sync completed successfully`);
         return true;
      } catch (err) {
         throw new CustomError({
            message: `Error in ${this.model.NAME} reference`,
            className: ReferenceBase.#CLASS_NAME,
            parameters: {
               initialUrl: this.initialUrl,
            },
            details: err,
         }).toObject();
      }
   }
}
