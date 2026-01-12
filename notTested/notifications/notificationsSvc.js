import ConversationsNotiSvc from './conversationsNotiSvc.js';
import logger from '../services/winstonService.js';
import CustomError from '../utils/customErrors/customError.js';

/**
 * Service for managing notification jobs
 */
export default class NotificationsSvc {
   static #CLASS_NAME = 'NotificationsSvc';

   /**
    * Runs the scheduled notification job
    * @returns {Promise<void>}
    */
   static async runScheduledJob() {
      const funcNote = `========== [${this.#CLASS_NAME}] ==========`;
      logger.info(`${funcNote} START!`);

      try {
         await ConversationsNotiSvc.start();
      } catch (err) {
         throw new CustomError({
            message: 'Notifications Scheduled Job ERROR!',
            className: this.#CLASS_NAME,
            details: err,
         }).toObject();
      }
   }
}

// Sample usage
// try {
//    await NotificationsSvc.runScheduledJob();
// } catch (err) {
//    logger.error(`Error: ${JSON.stringify(err, null, 3)}`);
// }