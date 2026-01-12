import ConverAggreSvc from '../conversationAggregate-ca/converAggreSvc.js';
import SchedulerBase from './scheduler.base.js';

export default class CAScheduler extends SchedulerBase {
   static #NAME = 'CAScheduler';

   static #SCHEDULED_TIMES = {
      local: '12 10 * * *', // For testing
      dev: '00,30 * * * *', // Every :00 and :30
      uat1: '00 * * * *',
      prod1: '00 * * * *',
      uat2: '30 * * * *',
      prod2: '30 * * * *',
   };

   constructor() {
      super(CAScheduler.#NAME, CAScheduler.#SCHEDULED_TIMES, ConverAggreSvc);
   }
}