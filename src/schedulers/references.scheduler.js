import SchedulerBase from './scheduler.base.js';
import referencesSvc from '../references/referencesSvc.js';

/**
 * ReferencesScheduler - Scheduler for references-related scheduled jobs.
 * Manages scheduled references processing based on environment-specific cron schedules.
 *
 * @class ReferencesScheduler
 * @extends SchedulerBase
 */
export default class ReferencesScheduler extends SchedulerBase {
   static #NAME = 'ReferencesScheduler';
   static #SCHEDULED_TIMES = Object.freeze({
      local: '00 12 * * *',
      dev: '00 12 * * *',
      uat1: '00 12 * * *',
      uat2: '30 12 * * *',
      prod1: '00 12 * * *',
      prod2: '30 12 * * *',
   });

   /**
    * Creates a new ReferencesScheduler instance.
    *
    * @param {Object} [dependencies] - Optional dependencies for DI (passed to SchedulerBase)
    */
   constructor(dependencies = {}) {
      super(ReferencesScheduler.#NAME, ReferencesScheduler.#SCHEDULED_TIMES, referencesSvc, dependencies);
   }
}