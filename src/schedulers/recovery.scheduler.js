import SchedulerBase from './scheduler.base.js';
import RecoverySvc from '../recovery/recoverySvc.js';

/**
 * RecoveryScheduler - Scheduler for recovery-related scheduled jobs.
 * Manages scheduled recovery processing based on environment-specific cron schedules.
 *
 * @class RecoveryScheduler
 * @extends SchedulerBase
 */
export default class RecoveryScheduler extends SchedulerBase {
   static #NAME = 'RecoveryScheduler';
   static #SCHEDULED_TIMES = Object.freeze({
      local: '00 01,05 * * *',
      dev: '00 01,05 * * *',
      uat1: '00 01 * * *',
      uat2: '00 05 * * *',
      prod1: '00 01 * * *',
      prod2: '00 05 * * *',
   });

   /**
    * Creates a new RecoveryScheduler instance.
    *
    * @param {Object} [dependencies] - Optional dependencies for DI (passed to SchedulerBase)
    */
   constructor(dependencies = {}) {
      super(RecoveryScheduler.#NAME, RecoveryScheduler.#SCHEDULED_TIMES, RecoverySvc, dependencies);
   }
}