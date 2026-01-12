import CustomError from '../utils/customErrors/CustomError.js';

export default class JobStatusMapper {
   static #CLASS_NAME = 'JobStatusMapper';
   static map({ recordId, category, interval, pageNum, isJobCompleted, isRecoveryCompleted }) {
      if (!recordId && !category) {
         throw new CustomError({
            message: `Either "record id" or "category" is REQUIRED!`,
            className: this.#CLASS_NAME,
            parameters: {
               recordId,
               category,
            },
         }).toObject();
      }

      const obj = {
         category,
         interval,
         pageNum,
         isJobCompleted,
         isRecoveryCompleted,
      };
      if (recordId) obj.id = recordId;

      return obj;
   }
}