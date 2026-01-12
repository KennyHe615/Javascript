import dayjs from 'dayjs';
import ProcessCDDataSvc from './processCDData.svc.js';
import RecoveryDbSvc from '../recovery/recoveryDb.svc.js';
import logger from '../services/winstonService.js';
import CustomError from '../utils/customErrors/customError.js';
import TimeIntervalManager from '../utils/timeIntervalManager.js';

/**
 * Service class for managing conversation detail processing operations.
 * Handles both scheduled jobs and recovery operations for conversation data across multiple stages.
 *
 * @class ConverDetailSvc
 */
export default class ConverDetailSvc {
   static #CLASS_NAME = 'ConverDetailSvc';
   static #STAGE_A_FILE_NAME = 'Gen_Notification_Conversation_IVRAttribute_STG';
   static #STAGE_B_FILE_NAME = 'Gen_Notification_Conversation_IVRAttribute_STG_B';
   static #MAX_JOB_DURATION_HOURS = 23;
   static #OPERATION = Object.freeze({ SCHEDULED: 'SCHEDULED', RECOVERY: 'RECOVERY' });

   /**
    * Executes the scheduled job to process conversation details for both Stage A and Stage B.
    * Runs both stages in parallel and returns results for each stage.
    *
    * @async
    * @static
    * @throws {CustomError} Throws error if job encounters critical failures
    */
   static async runScheduledJob() {
      const funcNote = `========== [${this.#CLASS_NAME}-${this.#OPERATION.SCHEDULED}] ==========`;
      logger.info(`${funcNote} START!`);
      const jobStartTime = dayjs();

      const [stageAResult, stageBResult] = await Promise.all([
         this.#processStage(
            'A',
            this.#STAGE_A_FILE_NAME,
            () => RecoveryDbSvc.findAllStageAConverIds(),
            (converId) => RecoveryDbSvc.archiveAByConverId(converId),
            jobStartTime,
         ),
         this.#processStage(
            'B',
            this.#STAGE_B_FILE_NAME,
            () => RecoveryDbSvc.findAllStageBConverIds(),
            (converId) => RecoveryDbSvc.archiveBByConverId(converId),
            jobStartTime,
         ),
      ]);

      if (!stageAResult || !stageBResult) {
         throw new CustomError({
            message: `Running Scheduled Job Error!`,
            className: this.#CLASS_NAME,
            functionName: 'runScheduledJob',
         }).toObject();
      }

      logger.info(`========== [${this.#CLASS_NAME}] ========== COMPLETED`);
   }

   /**
    * Executes a recovery operation for conversation details within a specified time interval.
    * The interval is subdivided into smaller segments (max 7 days per segment, max 100,000 records per segment)
    * to comply with API query limitations.
    *
    * @async
    * @static
    * @param {string} interval - ISO 8601 format interval string (e.g., '2025-11-30T20:00Z/2025-11-30T21:00Z')
    * @throws {CustomError} Throws error if interval is not provided or processing fails
    */
   static async runRecovery(interval) {
      if (!interval) {
         throw new CustomError({
            message: 'Interval is required for recovery operation',
            className: this.#CLASS_NAME,
            functionName: 'runRecovery',
         }).toObject();
      }

      const funcNote = `========== [${this.#CLASS_NAME}-${this.#OPERATION.RECOVERY}] ==========`;
      logger.info(`${funcNote} [Interval = ${interval}] START!`);

      try {
         // Step 1: Validate and convert the interval to a dayjs objects
         const { startTime, endTime } = TimeIntervalManager.validateAndConvertInterval(interval);

         // Step 2: Note: The intervals for API Query MUST within 7 days and less than 100,000 records
         const subdividedIntervals = await TimeIntervalManager.subdivideIntervalForUserDetailOrConvDetail(
            startTime,
            endTime,
            'Conversation Detail',
         );

         // Step 3: Process the intervals
         for (const interval of subdividedIntervals) {
            await ProcessCDDataSvc.processDataByInterval(interval);
         }
      } catch (err) {
         throw new CustomError({
            message: 'Running Recovery Error!',
            className: this.#CLASS_NAME,
            parameters: { interval },
            details: err,
         }).toObject();
      }
   }

   /**
    * Internal method that processes conversation details for a specific stage (A or B).
    * Retrieves conversation IDs, processes each one, archives on success, and tracks failures.
    * Automatically stops processing if job exceeds 23-hour maximum duration.
    *
    * @async
    * @static
    * @private
    * @param {string} stageName - Stage identifier ('A' or 'B')
    * @param {string} fileName - Base file name for output
    * @param {Function} retrieveFunc - Async function that retrieves conversation IDs for the stage
    * @param {Function} archiveFunc - Async function that archives a processed conversation
    * @param {dayjs.Dayjs} jobStartTime - Job start time for duration monitoring
    */
   static async #processStage(stageName, fileName, retrieveFunc, archiveFunc, jobStartTime) {
      let allIdsSucceed = true;
      const today = dayjs().format('YYYY-MM-DD');
      const fullFileName = `${fileName}_${today}`;

      try {
         const converIds = await retrieveFunc();
         logger.debug(`Retrieved ${converIds.length} conversations for Stage ${stageName}`);

         for (const converId of converIds) {
            try {
               // Check if job has exceeded maximum duration (23 hours)
               const jobNow = dayjs();
               const jobTimeDiff = jobNow.diff(jobStartTime, 'hour');

               if (jobTimeDiff > this.#MAX_JOB_DURATION_HOURS) {
                  logger.warn(`Job exceeded maximum duration for Stage ${stageName}`);

                  return true;
               }

               await ProcessCDDataSvc.processCDDataByConverId(converId, false, fullFileName);

               await archiveFunc(converId);
            } catch (err) {
               allIdsSucceed = false;

               const errObj = new CustomError({
                  message: `Processing ConversationId ERROR in Stage ${stageName}`,
                  className: this.#CLASS_NAME,
                  functionName: '#processStage',
                  parameters: { stageName, conversationId: converId },
                  details: err,
               }).toObject();
               logger.error(JSON.stringify(errObj, null, 3));
            }
         }
      } catch (err) {
         allIdsSucceed = false;

         const errObj = new CustomError({
            message: `Retrieving Conversation IDs for Stage ${stageName} Error!`,
            className: this.#CLASS_NAME,
            functionName: '#processStage',
            parameters: { stageName },
            details: err,
         }).toObject();
         logger.error(JSON.stringify(errObj, null, 3));
      }

      const jobEnd = dayjs();
      const jobTimeDiff = jobEnd.diff(jobStartTime, 'minute');
      logger.debug(`========== [${this.#CLASS_NAME} - Stage ${stageName}] ========== COMPLETED in ${jobTimeDiff} minutes`);

      return allIdsSucceed;
   }
}

// Sample usage
// try {
   // const data = await ConverDetailSvc.runScheduledJob();
   // const data = await ConverDetailSvc.runRecovery('2025-11-30T20:00Z/2025-11-30T21:00Z');
   // console.log('data: ', data);
// } catch (err) {
//    console.log('Sample Usage Catching: ', JSON.stringify(err, null, 3));
// }
// process.exit(0);