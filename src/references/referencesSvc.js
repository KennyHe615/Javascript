import queueSvc from './queue/queueSvc.js';
import logger from '../services/winstonSvc.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Service orchestrator for managing reference data synchronization jobs.
 * This class coordinates multiple sub-services (like QueueSvc) to refresh local reference data.
 */
class ReferencesSvc {
   static #CLASS_NAME = 'ReferencesSvc';

   #queueSvc;

   /**
    * Initializes the References service.
    *
    * @param {Object} [dependencies={}] - Object containing service dependencies.
    * @param {Object} [dependencies.queueSvc] - Custom implementation of QueueSvc (useful for testing).
    */
   constructor(dependencies = {}) {
      this.#queueSvc = dependencies.queueSvc ?? queueSvc;
   }

   /**
    * Executes the scheduled job to synchronize all reference data.
    *
    * @returns {Promise<void>}
    * @throws {Object} Normalized error object from CustomError.toObject().
    */
   async runScheduledJobAsync() {
      logger.info(`========== [${ReferencesSvc.#CLASS_NAME}] ========== Scheduled job STARTED`);

      try {
         await this.#queueSvc.runAsync();

         logger.info(`========== [${ReferencesSvc.#CLASS_NAME}] ========== Scheduled job COMPLETED`);
      } catch (err) {
         throw new CustomError({
            message: 'References Scheduled Job ERROR!',
            className: ReferencesSvc.#CLASS_NAME,
            details: err,
         }).toObject();
      }
   }
}

const referencesSvc = new ReferencesSvc();

// Export singleton as default (most common usage)
export default referencesSvc;

// Also, export the class for DI scenarios (testing, custom instances)
export { ReferencesSvc };

// Sample Usage:
//
// 1. Default singleton (most common):
// await referencesSvc.runScheduledJobAsync();
//
// 2. Dependency Injection (for testing):
// import { ReferencesSvc } from './references/referencesSvc.test.js';
// const mockQueuesSvc = { getQueueIds: jest.fn() };
// const testService = new ReferencesSvc({
//    queuesSvc: mockQueuesSvc,
// });
// await testService.runScheduledJob();
//
// 3. Error handling:
// try {
//    await referencesSvc.runScheduledJob();
// } catch (err) {
//    logger.error(`Error: ${JSON.stringify(err, null, 3)}`);
// }
