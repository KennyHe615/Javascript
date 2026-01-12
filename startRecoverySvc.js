import RecoverySvc from './src/recovery/recoverySvc.js';
import logger from './src/services/winstonSvc.js';
import CustomError from './src/utils/errors/customError.js';

/**
 * StartRecoverySvc - CLI entry point for manual recovery operations.
 * Validates command-line inputs and triggers RecoverySvc.runManually().
 *
 * @class StartRecoverySvc
 */
class StartRecoverySvc {
   static #CLASS_NAME = 'StartRecoverySvc';
   // Define valid input categories for better validation
   static #VALID_INPUT_CATEGORIES = Object.freeze({
      CD: 'Conversation Detail',
   });

   #category;
   #interval;
   #mappedCategory;

   /**
    * Creates a new StartRecoverySvc instance.
    * Reads CLI arguments:
    * - argv[2]: category code (e.g., 'CD')
    * - argv[3]: interval string (ISO-8601 format: 'startISO/endISO')
    */
   constructor() {
      this.#category = process.argv[2];
      this.#interval = process.argv[3];
   }

   /**
    * Validates inputs, runs the recovery job, and exits the process.
    * Exits with code 0 on success, 1 on error.
    *
    * @async
    * @returns {Promise<void>}
    */
   async runAsync() {
      try {
         this.#validateInputs();

         const funcNote = `========== [${StartRecoverySvc.#CLASS_NAME} Category: ${this.#mappedCategory} Interval: ${this.#interval}] ==========`;

         logger.info(`${funcNote} START`);

         await RecoverySvc.runManuallyAsync(this.#mappedCategory, this.#interval);

         logger.info(`${funcNote} COMPLETED`);

         process.exit(0);
      } catch (err) {
         const errorObj = this.#buildErrObj('Starting Recovery ERROR!', 'run');
         logger.error(JSON.stringify(errorObj, null, 3));

         process.exit(1);
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Validates CLI inputs and maps category code to internal category.
    *
    * @private
    * @returns {void}
    * @throws {Object} CustomError when validation fails
    */
   #validateInputs() {
      const funcName = '#validateInputs';
      if (!this.#category || typeof this.#category !== 'string') {
         throw this.#buildErrObj('Category is required and must be a string', funcName);
      }

      if (!this.#interval || typeof this.#interval !== 'string') {
         throw this.#buildErrObj('Interval is required and must be a string', funcName);
      }

      // Map category case-insensitively (supports 'cd', 'CD', etc.)
      this.#mappedCategory = StartRecoverySvc.#VALID_INPUT_CATEGORIES[this.#category.toUpperCase()];
      if (!this.#mappedCategory) {
         throw this.#buildErrObj(
            `Invalid Category! Only accepting: ${Object.keys(StartRecoverySvc.#VALID_INPUT_CATEGORIES).join(', ')}`,
            funcName,
         );
      }
   }

   /**
    * Helper method to throw standardized CustomError.
    *
    * @private
    * @param {string} message - Error message
    * @param {string} functionName - Function where error occurred
    * @return {Object} CustomError
    */
   #buildErrObj(message, functionName) {
      return new CustomError({
         message,
         className: StartRecoverySvc.#CLASS_NAME,
         functionName,
         parameters: { category: this.#category, interval: this.#interval },
      }).toObject();
   }
}

const recoverSvc = new StartRecoverySvc();
await recoverSvc.runAsync();

// Sample Usage:
// CLI Command Pattern: node startRecoverySvc.js <category> <interval>
// node startRecoverySvc.js CD 2025-11-24T00:00Z/2025-11-26T01:00Z
