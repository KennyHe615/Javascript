import ZipLogsScheduler from './zipLogs.scheduler.js';
import CustomError from '../utils/errors/customError.js';

/**
 * ScheduledJobsHandler - Orchestrator for managing all application schedulers.
 * Initializes and starts all registered scheduled jobs.
 *
 * @class ScheduledJobsHandler
 */
class ScheduledJobsHandler {
   static #CLASS_NAME = 'ScheduledJobsHandler';

   #zipLogsScheduler;

   /**
    * Creates a new ScheduledJobsHandler instance.
    *
    * @param {Object} [dependencies={}] - Optional dependencies for DI
    */
   constructor(dependencies = {}) {
      this.#zipLogsScheduler = new ZipLogsScheduler(dependencies);
   }

   /**
    * Starts all registered schedulers.
    * Each scheduler is started individually with error handling.
    *
    * @returns {void}
    * @throws {Object} CustomError if starting schedulers fails
    */
   start() {
      try {
         // List of schedulers to start
         const schedulers = [this.#zipLogsScheduler];

         // Start all schedulers
         schedulers.forEach((scheduler) => scheduler.start());
      } catch (err) {
         throw new CustomError({
            message: 'Starting Scheduled Jobs ERROR!',
            className: ScheduledJobsHandler.#CLASS_NAME,
            details: err,
         }).toObject();
      }
   }
}

/**
 * Default ScheduledJobsHandler instance for application-wide use.
 *
 * @type {ScheduledJobsHandler}
 */
const scheduledJobsHandler = new ScheduledJobsHandler();

// Export singleton as default (most common usage)
export default scheduledJobsHandler;

// Also, export the class for DI scenarios (testing, custom instances)
export { ScheduledJobsHandler };
