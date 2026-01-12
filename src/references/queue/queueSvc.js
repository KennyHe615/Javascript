import QueueMapper from './queue.mapper.js';
import Queue from './queue.model.js';
import ReferenceBase from '../reference.base.js';

export default class QueueSvc extends ReferenceBase {
   constructor() {
      super('/api/v2/routing/queues?pageSize=500', QueueMapper, Queue, {});
   }
}

// Sample usage
// try {
//    const queueSvc = new QueueSvc();
//    await queueSvc.runAsync();
//    console.log('Finished');
// } catch (err) {
//    console.log(err);
// }
