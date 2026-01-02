import WinstonFactory from '../factories/winstonFactory.js';

/**
 * Service class for logging operations using Winston.
 * Provides a clean API for logging with support for both singleton usage (convenience)
 * and dependency injection (testing/customization).
 *
 * @class WinstonSvc
 */
class WinstonSvc {
   #logger;

   constructor(instance = null) {
      this.#logger = instance ?? WinstonFactory.getInstance();
   }

   /**
    * Logs an info level message.
    *
    * @param {string} message - The message to log
    * @param {Object} [meta={}] - Additional metadata
    * @returns {void}
    */
   info(message, meta = {}) {
      this.#logger.info(message, meta);
   }

   /**
    * Logs a warning level message.
    *
    * @param {string} message - The message to log
    * @param {Object} [meta={}] - Additional metadata
    * @returns {void}
    */
   warn(message, meta = {}) {
      this.#logger.warn(message, meta);
   }

   /**
    * Logs an error level message.
    *
    * @param {string} message - The message to log
    * @param {Object} [meta={}] - Additional metadata
    * @returns {void}
    */
   error(message, meta = {}) {
      this.#logger.error(message, meta);
   }

   /**
    * Logs a debug level message.
    *
    * @param {string} message - The message to log
    * @param {Object} [meta={}] - Additional metadata
    * @returns {void}
    */
   debug(message, meta = {}) {
      this.#logger.debug(message, meta);
   }

   /**
    * Creates a child logger with additional context.
    * Useful for adding request-specific or module-specific metadata.
    *
    * @param {Object} options - Context options for child logger
    * @returns {WinstonSvc} Child logger service instance
    * @example
    * const requestLogger = logger.child({ requestId: 'req-123' });
    * requestLogger.info('Processing request'); // Includes requestId in log
    */
   child(options) {
      const childLogger = this.#logger.child(options);

      return new WinstonSvc(childLogger);
   }
}

/**
 * Default logger instance for application-wide use.
 * This singleton instance should be used in 99% of cases for convenience.
 *
 * @type {WinstonSvc}
 */
const logger = new WinstonSvc();

// Export singleton as default (most common usage)
export default logger;

// Also export the class for DI scenarios (testing, custom instances)
export { WinstonSvc };

// Sample Usage
//
// 1. Default singleton (99% of use cases):
// (() => {
//    logger.info('Application started');
//    logger.error('Something went wrong', { userId: 123 });
//    logger.debug('Debug information', { data: { title: 'Hello World' } });
// })();
//
// 2. Dependency Injection (for testing):
// import { WinstonSvc } from './services/winstonSvc.js';
// const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() };
// const testLogger = new WinstonSvc(mockLogger);
//
// 3. Child logger with context:
// const requestLogger = logger.child({
//    requestId: "req-456",
//    userId: 789
// });
// requestLogger.info("Processing request"); // Will include requestId and userId in all logs
//
