import SchedulerBase from './scheduler.base.js';
import ZipLogsSvc from '../services/zipLogsSvc.js';

/**
 * ZipLogsScheduler - Scheduler for log archiving scheduled jobs.
 * Manages scheduled log file compression based on environment-specific cron schedules.
 *
 * @class ZipLogsScheduler
 * @extends SchedulerBase
 */
export default class ZipLogsScheduler extends SchedulerBase {
   static #NAME = 'ZipLogsScheduler';
   static #SCHEDULED_TIMES = Object.freeze({
      local: '25 10 * * *',
      dev: '15 06 09 * *',
      uat1: '15 06 09 * *',
      uat2: '15 06 09 * *',
      prod1: '15 06 09 * *',
      prod2: '15 06 09 * *',
   });

   /**
    * Creates a new ZipLogsScheduler instance.
    *
    * @param {Object} [dependencies] - Optional dependencies for DI (passed to SchedulerBase)
    */
   constructor(dependencies = {}) {
      super(ZipLogsScheduler.#NAME, ZipLogsScheduler.#SCHEDULED_TIMES, ZipLogsSvc, dependencies);
   }
}
