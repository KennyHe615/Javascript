import axiosSvc from '../services/axiosSvc.js';
import CustomError from '../utils/errors/customError.js';

/**
 * RefApiSvc - Service for fetching reference data from Genesys API.
 * Handles paginated API responses and aggregates all entities.
 *
 * @class RefApiSvc
 */
class RefApiSvc {
   static #CLASS_NAME = 'RefApiSvc';
   static #CONFIG = Object.freeze({
      maxPaginationIterations: 100,
   });

   #axiosSvc;

   /**
    * Creates a new RefApiSvc instance.
    *
    * @param {Object} [dependencies={}] - Optional dependencies for DI
    * @param {Object} [dependencies.axiosSvc] - HTTP service for API calls
    */
   constructor(dependencies = {}) {
      this.#axiosSvc = dependencies.axiosSvc ?? axiosSvc;
   }

   /**
    * Fetches reference data from Genesys API with automatic pagination handling.
    * Follows nextUri links until all pages are retrieved.
    *
    * @async
    * @param {string} apiUrl - Initial API URL to fetch data from
    * @param {string} entityName - Name of the entity type for error reporting
    * @returns {Promise<Array<Object>>} Array of all entities from all pages
    * @throws {Object} CustomError if validation fails, API call fails, or invalid response
    */
   async getReferenceDataAsync(apiUrl, entityName) {
      RefApiSvc.#validateInputs(apiUrl, entityName);

      const errorObj = new CustomError({
         message: '',
         className: RefApiSvc.#CLASS_NAME,
         functionName: 'getReferenceDataAsync',
         parameters: { apiUrl, entityName },
      }).toObject();

      const results = [];
      let currentUrl = apiUrl;
      let iterationCount = 0;

      while (currentUrl) {
         if (iterationCount >= RefApiSvc.#CONFIG.maxPaginationIterations) {
            errorObj.message = `Exceeded maximum pagination iterations (${RefApiSvc.#CONFIG.maxPaginationIterations})`;
            errorObj.parameters = {
               ...errorObj.parameters,
               currentUrl,
               iterationCount,
            };
            throw errorObj;
         }

         const response = await this.#axiosSvc.sendRequestAsync({
            method: 'GET',
            url: currentUrl,
         });

         if (!response?.entities || !Array.isArray(response.entities)) {
            errorObj.message = 'Invalid response: Missing or invalid "entities" array in response';
            errorObj.parameters = {
               ...errorObj.parameters,
               currentUrl,
               iterationCount,
               hasEntities: !!response?.entities,
               entitiesType: typeof response?.entities,
            };
            throw errorObj;
         }

         if (response.entities.length === 0 && iterationCount === 0) {
            errorObj.message = 'Invalid response: "entities" array is empty in first response';
            errorObj.parameters = {
               ...errorObj.parameters,
               currentUrl,
            };
            throw errorObj;
         }

         results.push(...response.entities);

         currentUrl = response.nextUri || null;

         iterationCount++;
      }

      return results;
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Validates input parameters for getReferenceData.
    *
    * @private
    * @static
    * @param {string} apiUrl - The API URL to validate
    * @param {string} entityName - The entity name to validate
    * @throws {Object} CustomError if validation fails
    */
   static #validateInputs(apiUrl, entityName) {
      const errorObj = new CustomError({
         message: '',
         className: RefApiSvc.#CLASS_NAME,
         functionName: '#validateInputs',
         parameters: { apiUrl, entityName },
      }).toObject();

      if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim() === '') {
         errorObj.message = 'Invalid apiUrl: must be a non-empty string';
         throw errorObj;
      }

      if (!entityName || typeof entityName !== 'string' || entityName.trim() === '') {
         errorObj.message = 'Invalid entityName: must be a non-empty string';
         throw errorObj;
      }
   }
}

/**
 * Default RefApiSvc instance for application-wide use.
 * Uses default dependencies (axiosService).
 *
 * @type {RefApiSvc}
 */
const refApiSvc = new RefApiSvc();

// Export singleton as default (most common usage)
export default refApiSvc;

// Also, export the class for DI scenarios (testing, custom instances)
export { RefApiSvc };

// Sample Usage:
//
// 1. Default singleton (most common):
// const queues = await refApiSvc.getReferenceDataAsync('/api/v2/routing/queues?pageSize=500', 'queues');
// console.log(`Fetched ${queues.length} queues`);
// const users = await refApiSvc.getReferenceDataAsync('/api/v2/users?pageSize=500', 'users');
// console.log(`Fetched ${users.length} users`);
//
// 2. Dependency Injection (for testing):
// import { RefApiSvc } from './references/refApi.svc.js';
// const mockHttpService = { sendRequest: jest.fn() };
// const testService = new RefApiSvc({ axiosService: mockHttpService });
// const queues = await testService.getReferenceDataAsync('/api/v2/routing/queues', 'queues');
//
// 3. Custom HTTP service:
// const customService = new RefApiSvc({ axiosService: customAxiosService });
