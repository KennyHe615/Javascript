import path from 'path';
import CustomError from '../utils/errors/customError.js';
import Constants from '../utils/constants.js';
import FileManager from '../utils/fileManager.js';

/**
 * ZipLogsSvc - Service for archiving and compressing log files.
 * Runs as a scheduled job to zip log files from the previous month.
 *
 * @class ZipLogsSvc
 */
export default class ZipLogsSvc {
   static #CLASS_NAME = 'ZipLogsSvc';
   static #LOG_DEFAULT_CONFIG = Object.freeze({
      fileExtension: 'log',
      folderPath: path.resolve(Constants.ROOT_FOLDER, 'logs'),
   });

   /**
    * Runs the scheduled job to zip log files from the previous month.
    * Archives logs in YYYY-MM format and removes original files.
    *
    * @static
    * @async
    * @returns {Promise<void>}
    * @throws {Object} CustomError if zipping fails
    */
   static async runScheduledJobAsync() {
      try {
         await FileManager.zipFolderAsync(
            ZipLogsSvc.#LOG_DEFAULT_CONFIG.folderPath,
            ZipLogsSvc.#LOG_DEFAULT_CONFIG.fileExtension,
         );
      } catch (err) {
         throw new CustomError({
            message: 'Zip Logs Scheduled Job ERROR!',
            className: ZipLogsSvc.#CLASS_NAME,
            functionName: 'runScheduledJobAsync',
            parameters: {
               logsFolder: ZipLogsSvc.#LOG_DEFAULT_CONFIG.folderPath,
            },
            details: err,
         }).toObject();
      }
   }
}
