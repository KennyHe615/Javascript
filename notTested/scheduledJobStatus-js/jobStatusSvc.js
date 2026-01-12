import JobStatus from './js.model.js';
import DatabaseError from '../utils/customErrors/databaseError.js';
import { Op } from 'sequelize';
import SequelizeService from '../services/sequelizeService.js';
import dayjs from 'dayjs';

/**
 * Service for interacting with scheduled job status persistence.
 * Uses the JobStatus Sequelize model and a shared SequelizeService to perform operations.
 *
 * @class JobStatusSvc
 */
export default class JobStatusSvc {
   /**
    * Inserts or updates a job status record depending on presence of an `id`.
    * If `data.id` exists, performs an upsert; otherwise, creates a new record.
    *
    * @param {JobStatusData} data Job status payload to persist.
    * @returns {Promise<void>} Resolves when the operation completes.
    */
   static async upsert(data) {
      data.id ? await SequelizeService.upsert(data, JobStatus) : await SequelizeService.create(data, JobStatus);
   }

   /**
    * Finds the most recent completed job status for the given category.
    * Orders by `app_updated_at` descending and returns a small summary object.
    *
    * @param {string} category Category name to filter job statuses.
    * @returns {Promise<{recordId: (number|null), lastInterval: (string|null)}>}
    *          An object containing:
    *          - recordId: ID of the latest completed record, or null if none found.
    *          - lastInterval: Interval string of the latest record, or null if none found.
    * @throws {Object} Wrapped DatabaseError when the query fails.
    */
   static async findLastCompletedJobStatus(category) {
      try {
         const record = await JobStatus.findAll({
            where: {
               category: category,
               isJobCompleted: true,
            },
            order: [['app_updated_at', 'DESC']],
            limit: 1,
            raw: true,
         });

         return record.length === 0
            ? {
                 recordId: null,
                 lastInterval: null,
              }
            : {
                 recordId: record[0].id,
                 lastInterval: record[0].interval,
              };
      } catch (err) {
         throw new DatabaseError(undefined, err).toObject();
      }
   }

   /**
    * Retrieves all uncompleted job statuses created within the last two weeks (inclusive)
    * up to the end of the current day. Dates are computed using dayjs and compared via
    * Sequelize `Op.between` on the `app_created_at` field.
    *
    * @returns {Promise<Object[]>} Array of raw JobStatus records matching the filter.
    * @throws {Object} Wrapped DatabaseError when the query fails.
    */
   static async findUncompletedJobStatus() {
      try {
         const twoWeeksAgo = dayjs().subtract(2, 'weeks').startOf('day').format('YYYY-MM-DDTHH:mm:ssZ');
         const endOfToday = dayjs().endOf('day').format('YYYY-MM-DDTHH:mm:ssZ');

         return await JobStatus.findAll({
            where: {
               isJobCompleted: false,
               isRecoveryCompleted: false,
               app_created_at: {
                  [Op.between]: [twoWeeksAgo, endOfToday],
               },
            },
            raw: true,
         });
      } catch (err) {
         throw new DatabaseError(undefined, err).toObject();
      }
   }
}

// Usage Example:
// try {
//    const result = await JobStatusSvc.findLastCompletedJobStatus('Conversation Detail');
//    console.log('result: ', result);
// } catch (err) {
//    logger.error(JSON.stringify(err, null, 3));
// }
// const result = await JobStatusSvc.findUncompletedJobStatus();