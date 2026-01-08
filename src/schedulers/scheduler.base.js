import schedule from 'node-schedule';
import nodeMailerSvc from '../services/nodeMailerSvc.js';
import logger from '../services/winstonSvc.js';
import dayjs from 'dayjs';
import Constants from '../utils/Constants.js';
import CustomError from '../utils/errors/customError.js';
import ErrorEmailGenerator from '../utils/errorEmailGenerator.js';

/**
 * SchedulerBase - Base class for all scheduled jobs.
 * Handles job scheduling, validation, and error notifications.
 *
 * @class SchedulerBase
 */
export default class SchedulerBase {
   static #CLASS_NAME = 'SchedulerBase';
   static #VALID_ENVIRONMENTS = Object.freeze(['local', 'dev', 'uat1', 'prod1', 'uat2', 'prod2']);
   static #CONFIG = Object.freeze({
      timezone: 'America/New_York',
      dateFormat: 'YYYY-MM-DD HH:mm:ss',
   });

   #runningEnv;
   #nodeMailerSvc;
   #schedulerName;
   #scheduledTimes;
   #scheduledSvc;

   /**
    * Creates a new SchedulerBase instance.
    *
    * @param {string} name - Name of the scheduler
    * @param {Object} scheduledTimes - Object mapping environments to cron expressions
    * @param {Object} scheduledSvc - Service class with runScheduledJob() method
    * @param {Object} [dependencies] - Optional dependencies for DI
    */
   constructor(name, scheduledTimes, scheduledSvc, dependencies = {}) {
      this.#runningEnv = SchedulerBase.#getRunningEnv();
      this.#nodeMailerSvc = dependencies.nodeMailerSvc ?? nodeMailerSvc;

      this.#schedulerName = name;
      this.#scheduledTimes = scheduledTimes;
      this.#scheduledSvc = scheduledSvc;

      this.#validateScheduledTimes();
      this.#validateScheduledService();
   }

   /**
    * Starts the scheduler for the current environment.
    * Schedules the job and handles runtime errors by logging and sending email alerts.
    *
    * @returns {schedule.Job} The scheduled job instance for potential cancellation
    */
   start() {
      const time = this.#scheduledTimes[this.#runningEnv];

      const job = schedule.scheduleJob({ rule: time, tz: SchedulerBase.#CONFIG.timezone }, async () => {
         try {
            await this.#scheduledSvc.runScheduledJobAsync();
         } catch (err) {
            await this.#handleJobErrorAsync(err, time);
         }
      });

      if (!job) {
         throw new CustomError({
            message: 'Failed to schedule job',
            className: SchedulerBase.#CLASS_NAME,
            functionName: 'start',
            parameters: {
               schedulerName: this.#schedulerName,
               environment: this.#runningEnv,
               schedule: time,
            },
         }).toObject();
      }

      logger.info(`Scheduler "${this.#schedulerName}" started successfully`, {
         environment: this.#runningEnv,
         schedule: time,
      });

      return job;
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Resolves and validates the current running environment from Constants.
    *
    * @private
    * @static
    * @returns {string} Valid running environment key
    * @throws {Object} CustomError if the environment is invalid
    */
   static #getRunningEnv() {
      const runningEnv = Constants.RUNNING_ENVIRONMENT;

      if (!SchedulerBase.#VALID_ENVIRONMENTS.includes(runningEnv)) {
         throw new CustomError({
            message: 'Invalid Running Environment!',
            className: SchedulerBase.#CLASS_NAME,
            functionName: '#getRunningEnv',
            parameters: { runningEnv, validEnvironments: SchedulerBase.#VALID_ENVIRONMENTS },
         }).toObject();
      }

      return runningEnv;
   }

   /**
    * Validates that scheduledTimes is a proper object and that a time is defined for the current environment.
    *
    * @private
    * @returns {void}
    * @throws {Object} CustomError when scheduledTimes is invalid or missing the current environment's time
    */
   #validateScheduledTimes() {
      if (!this.#scheduledTimes || typeof this.#scheduledTimes !== 'object') {
         throw new CustomError({
            message: 'Scheduled times must be a valid object',
            className: SchedulerBase.#CLASS_NAME,
            functionName: '#validateScheduledTimes',
            parameters: { schedulerName: this.#schedulerName, scheduledTimes: this.#scheduledTimes },
         }).toObject();
      }

      const time = this.#scheduledTimes[this.#runningEnv];
      if (!time) {
         throw new CustomError({
            message: `No scheduled time defined for environment: ${this.#runningEnv}`,
            className: SchedulerBase.#CLASS_NAME,
            functionName: '#validateScheduledTimes',
            parameters: {
               runningEnv: this.#runningEnv,
               validEnvironments: SchedulerBase.#VALID_ENVIRONMENTS,
               schedulerName: this.#schedulerName,
            },
         }).toObject();
      }
   }

   /**
    * Validates that the scheduled service has a runScheduledJob() method.
    *
    * @private
    * @returns {void}
    * @throws {Object} CustomError when the scheduled service is invalid
    */
   #validateScheduledService() {
      const isValidObject = this.#scheduledSvc && typeof this.#scheduledSvc === 'object';
      const isValidClass = typeof this.#scheduledSvc === 'function';

      if (!isValidObject && !isValidClass) {
         throw new CustomError({
            message: 'Scheduled service must be a valid object or class',
            className: SchedulerBase.#CLASS_NAME,
            functionName: '#validateScheduledService',
            parameters: { scheduledSvcType: typeof this.#scheduledSvc },
         }).toObject();
      }

      if (typeof this.#scheduledSvc.runScheduledJobAsync !== 'function') {
         throw new CustomError({
            message: 'Scheduled service must have a runScheduledJobAsync() method',
            className: SchedulerBase.#CLASS_NAME,
            functionName: '#validateScheduledService',
            parameters: {
               serviceName: this.#schedulerName,
               scheduledSvcJobType: typeof this.#scheduledSvc.runScheduledJobAsync,
            },
         }).toObject();
      }
   }

   /**
    * Handles errors that occur during scheduled job execution.
    * Logs the error and sends email notification.
    *
    * @private
    * @async
    * @param {Error} err - The error that occurred
    * @param {string} time - The cron schedule expression
    * @returns {Promise<void>}
    */
   async #handleJobErrorAsync(err, time) {
      const startTime = dayjs().format(SchedulerBase.#CONFIG.dateFormat);

      const errorObj = new CustomError({
         message: 'Scheduled Job ERROR!',
         className: SchedulerBase.#CLASS_NAME,
         functionName: 'start',
         parameters: {
            schedulerName: this.#schedulerName,
            environment: this.#runningEnv,
            schedule: time,
            startTime,
         },
         details: err,
      }).toObject();

      logger.error(JSON.stringify(errorObj, null, 3));

      try {
         await this.#nodeMailerSvc.sendEmailAsync({
            subject: `${Constants.PROJECT_NAME} Error Alert`,
            text: ErrorEmailGenerator.generateErrorEmailText(this.#schedulerName, this.#runningEnv, errorObj),
            html: ErrorEmailGenerator.generateErrorEmailHtml(this.#schedulerName, this.#runningEnv, errorObj),
         });
      } catch (emailErr) {
         logger.error('Failed to send error notification email', {
            originalError: errorObj,
            emailError: emailErr.message,
         });
      }
   }
}