import { IVRUpdateArchiveA, IVRUpdateArchiveB, IVRUpdateStageA, IVRUpdateStageB } from './recoveryDb.model.js';
import Constants from '../utils/constants.js';
import DatabaseError from '../utils/customErrors/databaseError.js';
import CustomError from '../utils/customErrors/customError.js';

/**
 * RecoveryDbSvc - Service for managing recovery related database operations.
 * Handles Stage A and Stage B conversation ID retrieval and archival.
 *
 * @class RecoveryDbSvc
 */
export default class RecoveryDbSvc {
   static #CLASS_NAME = 'RecoveryDbSvc';
   static #SORT_ORDER = Constants.RUNNING_ENVIRONMENT.slice(-1) === '2' ? 'ASC' : 'DESC';

   /**
    * Retrieves all conversation IDs from Stage A.
    *
    * @static
    * @async
    * @returns {Promise<Array<string>>} Array of conversation IDs
    * @throws {Object} DatabaseError if query fails
    */
   static async findAllStageAConverIds() {
      try {
         const records = await IVRUpdateStageA.findAll({
            raw: true,
            order: [['conversationId', RecoveryDbSvc.#SORT_ORDER]],
         });

         return records.length > 0 ? records.map((item) => item.conversationId) : [];
      } catch (err) {
         throw new DatabaseError(undefined, err).toObject();
      }
   }

   /**
    * Archives a conversation ID from Stage A.
    * Moves the record to archive table and removes from staging table.
    *
    * @static
    * @async
    * @param {string} conversationId - The conversation ID to archive
    * @returns {Promise<void>}
    * @throws {Object} CustomError if archival fails
    */
   static async archiveAByConverId(conversationId) {
      try {
         await IVRUpdateArchiveA.upsert({ conversationId }, IVRUpdateArchiveA);

         await IVRUpdateStageA.destroy({ where: { conversationId } });
      } catch (err) {
         throw new CustomError({
            message: 'Archiving Stage A Conversation ERROR!',
            className: RecoveryDbSvc.#CLASS_NAME,
            functionName: 'archiveAByConverId',
            parameters: { conversationId },
            details: new DatabaseError(undefined, err).toObject(),
         }).toObject();
      }
   }

   /**
    * Retrieves all conversation IDs from Stage B.
    *
    * @static
    * @async
    * @returns {Promise<Array<string>>} Array of conversation IDs
    * @throws {Object} DatabaseError if query fails
    */
   static async findAllStageBConverIds() {
      try {
         const records = await IVRUpdateStageB.findAll({
            raw: true,
            order: [['conversationId', RecoveryDbSvc.#SORT_ORDER]],
         });

         return records.length > 0 ? records.map((item) => item.conversationId) : [];
      } catch (err) {
         throw new DatabaseError(undefined, err).toObject();
      }
   }

   /**
    * Archives a conversation ID from Stage B.
    * Moves the record to archive table and removes from staging table.
    *
    * @static
    * @async
    * @param {string} conversationId - The conversation ID to archive
    * @returns {Promise<void>}
    * @throws {Object} CustomError if archival fails
    */
   static async archiveBByConverId(conversationId) {
      try {
         await IVRUpdateArchiveB.upsert({ conversationId }, IVRUpdateArchiveB);

         await IVRUpdateStageB.destroy({ where: { conversationId } });
      } catch (err) {
         throw new CustomError({
            message: 'Archiving Stage B Conversation ERROR!',
            className: RecoveryDbSvc.#CLASS_NAME,
            functionName: 'archiveBByConverId',
            parameters: { conversationId },
            details: new DatabaseError(undefined, err).toObject(),
         }).toObject();
      }
   }
}

// Sample Usage
// try {
//    const result = await RecoveryDbSvc.findAllStageAConverIds();
   // console.log('result: ', result);
   // await RecoveryDbSvc.archiveAByConverId('00190234-ffc8-4af9-bd91-106e2b3dbe4f');
   // console.log('COMPLETED!');
   // const result = await RecoveryDbSvc.findAllStageBConverIds();
   // console.log('result: ', result);
   // await RecoveryDbSvc.archiveBByConverId('138fb829-5d19-45ee-a7ce-bb87c03efa45');
   // console.log('COMPLETED!');
// } catch (err) {
//    console.log(JSON.stringify(err, null, 3));
// }