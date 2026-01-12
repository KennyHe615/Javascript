import QueueMapper from './queue.mapper.js';
import Queue from './queue.model.js';
import ReferenceBase from '../reference.base.js';

/**
 * Service class for handling Queue reference data.
 * Extends ReferenceBase to provide automated fetching, mapping, and database synchronization.
 *
 * @extends ReferenceBase
 */
class QueueSvc extends ReferenceBase {
   /**
    * Initializes the Queue service with the specific API endpoint, mapper, and model.
    * The endpoint is configured to fetch 500 items per page.
    */
   constructor() {
      super('/api/v2/routing/queues?pageSize=500', QueueMapper, Queue, {});
   }
}

/**
 * Singleton instance of QueueSvc for application-wide use.
 */
const queueSvc = new QueueSvc();

// Export singleton as default (most common usage)
export default queueSvc;

// Also, export the class for DI scenarios (testing, custom instances)
export { QueueSvc };

// Sample usage
// try {
//    const queueSvc = new QueueSvc();
//    await queueSvc.runAsync();
//    console.log('Finished');
// } catch (err) {
//    console.log(err);
// }
