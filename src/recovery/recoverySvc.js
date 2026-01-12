import ConverDetailSvc from '../conversationDetail_cd/converDetailSvc.js';
import CustomError from '../utils/errors/customError.js';
import logger from '../services/winstonSvc.js';

/**
 * RecoverySvc - Main orchestrator for recovery-related operations.
 * Manages scheduled jobs and manual recovery flows for conversation details.
 *
 * @class RecoverySvc
 */
export default class RecoverySvc {
   static #CLASS_NAME = 'RecoverySvc';
   static #OPERATION = Object.freeze({ SCHEDULED: 'SCHEDULED', RECOVERY: 'RECOVERY' });
   static #CATEGORY = Object.freeze({
      CONVERSATION_DETAIL: 'Conversation Detail',
   });

   /**
    * Runs the scheduled recovery job.
    * Processes conversation detail recovery for Stage A and Stage B.
    *
    * @static
    * @async
    * @returns {Promise<void>}
    * @throws {Object} CustomError if the scheduled job fails
    */
   static async runScheduledJobAsync() {
      const funcNote = `========== [${RecoverySvc.#CLASS_NAME}-${RecoverySvc.#OPERATION.SCHEDULED}] ==========`;
      logger.info(`${funcNote} START`);

      try {
         await ConverDetailSvc.runScheduledJobAsync();

         logger.info(`${funcNote} COMPLETED`);
      } catch (err) {
         throw new CustomError({
            message: 'Recovery Scheduled Job ERROR!',
            className: RecoverySvc.#CLASS_NAME,
            functionName: 'runScheduledJobAsync',
            details: err,
         }).toObject();
      }
   }

   /** Different Version
    *    // /**
    *    //  * Runs the scheduled recovery job:
    *    //  * - Retrieves uncompleted job statuses
    *    //  * - Processes each record individually with isolation
    *    //  * - Logs per-record errors without stopping the entire run
    *    //  *
    *    //  * @returns {Promise<void>}
    *    //  * @throws {Object} Wrapped CustomError when the outer scheduled job flow fails
    *    //
    *    // static async runScheduledJob() {
    *    //    const funcNote = `========== [${this.#CLASS_NAME}-${this.#OPERATION.SCHEDULED}] ==========`;
    *    //    logger.info(`${funcNote} START!`);
    *    //
    *    //    try {
    *    //       // Step 1: Retrieve the uncompleted job statuses.
    *    //       const records = await JobStatusSvc.findUncompletedJobStatus();
    *    //
    *    //       if (records.length === 0) {
    *    //          logger.info(`${funcNote} - No Records FOUND!`);
    *    //          return;
    *    //       }
    *    //
    *    //       // Step 2: Loop through the jobs
    *    //       let allRecordsSucceed = true;
    *    //       for (const record of records) {
    *    //          const { id, category, interval, page_number } = record;
    *    //
    *    //          try {
    *    //             await this.#processHelper(category, interval, page_number, id);
    *    //          } catch (err) {
    *    //             allRecordsSucceed = false;
    *    //
    *    //             const errObj = new CustomError({
    *    //                message: 'Processing Recovery Individual Record ERROR!',
    *    //                className: this.#CLASS_NAME,
    *    //                functionName: 'runScheduledJob',
    *    //                parameters: {
    *    //                   recordId: id,
    *    //                   category,
    *    //                   interval,
    *    //                   page_number,
    *    //                },
    *    //                details: err,
    *    //             }).toObject();
    *    //
    *    //             logger.error(JSON.stringify(errObj, null, 3));
    *    //          }
    *    //       }
    *    //
    *    //       allRecordsSucceed ? logger.info(`${funcNote} COMPLETED!`) : logger.error(`${funcNote} Occurred error!`);
    *    //    } catch (err) {
    *    //       throw new CustomError({
    *    //          message: 'Recovery Scheduled Job ERROR!',
    *    //          className: this.#CLASS_NAME,
    *    //          functionName: 'runScheduledJob',
    *    //          details: err,
    *    //       }).toObject();
    *    //    }
    *    // }
    */

   /**
    * Manually runs the recovery flow for a given category and interval.
    *
    * @static
    * @async
    * @param {string} category - Recovery category key (e.g., 'CD' for Conversation Detail)
    * @param {string} interval - ISO-8601 interval format 'startISO/endISO'
    * @returns {Promise<void>}
    * @throws {Object} CustomError for validation errors or runtime failures
    */
   static async runManuallyAsync(category, interval) {
      const funcNote = `========== [${RecoverySvc.#CLASS_NAME}-${RecoverySvc.#OPERATION.RECOVERY} Category: ${category}, Interval: ${interval}] ==========`;
      logger.info(`${funcNote} START`);

      try {
         await RecoverySvc.#processHelperAsync(category, interval);

         logger.info(`${funcNote} COMPLETED`);
      } catch (err) {
         throw new CustomError({
            message: 'Manual Recovery ERROR!',
            className: RecoverySvc.#CLASS_NAME,
            functionName: 'runManuallyAsync',
            parameters: { category, interval },
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Processes recovery based on category.
    *
    * @private
    * @static
    * @async
    * @param {string} category - Recovery category key
    * @param {string} interval - ISO-8601 interval format
    * @returns {Promise<void>}
    * @throws {Object} CustomError if category is invalid
    */
   static async #processHelperAsync(category, interval) {
      switch (category) {
         case RecoverySvc.#CATEGORY.CONVERSATION_DETAIL:
            await ConverDetailSvc.runRecoveryAsync(interval);
            break;

         default:
            throw new CustomError({
               message: 'Invalid Category!',
               className: RecoverySvc.#CLASS_NAME,
               functionName: '#processHelperAsync',
               parameters: { category, interval },
            }).toObject();
      }
   }
}
