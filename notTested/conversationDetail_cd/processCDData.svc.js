import dayjs from 'dayjs';
import * as path from 'path';
import CdApiSvc from './cdApi.svc.js';
import ConverDetailMapper from './converDetail.mapper.js';
import ivrAttribute from './ivrAttribute.model.js';
import logger from '../services/winstonService.js';
import SequelizeService from '../services/sequelizeService.js';
import TimeIntervalManager from '../utils/timeIntervalManager.js';
import Constants from '../utils/constants.js';
import FileManager from '../utils/fileManager.js';
import CustomError from '../utils/customErrors/customError.js';

/**
 * @class ProcessCDDataSvc
 * @description Service class for processing conversation detail data.
 */
export default class ProcessCDDataSvc {
   static #CLASS_NAME = 'ProcessCDDataSvc';
   static #PARTICIPANT_FILE_NAME = 'GenNoti_V2_Conversation_Participant_STG';
   static #ATTRIBUTE_FILE_NAME = 'Gen_Notification_Conversation_IVRAttribute_Recovery';
   static #MAX_CONCURRENT_JOBS = 5;

   /**
    * @static
    * @async
    * @param {string} interval - The time interval for fetching data, in ISO 8601 format (e.g., '2025-11-30T20:00Z/2025-11-30T21:00Z').
    * @description Processes conversation detail data for a given time interval.
    * @throws {object} Throws a CustomError object if an error occurs.
    */
   static async processDataByInterval(interval) {
      const funcNote = `========== [${this.#CLASS_NAME}] [processDataByInterval Func - Interval = ${interval}] ==========`;
      logger.info(`${funcNote} STARTED`);

      try {
         const [start, end] = interval.split('/');

         // Fetch the total number of conversation detail hits for the given interval
         const totalHits = await CdApiSvc.fetchCDTotalHits(
            dayjs.utc(start, TimeIntervalManager.GENESYS_API_REQUEST_TIMESTAMP_FORMAT, true),
            dayjs.utc(end, TimeIntervalManager.GENESYS_API_REQUEST_TIMESTAMP_FORMAT, true),
         );

         if (totalHits === 0) {
            logger.info(`${funcNote} - NO Data!`);

            return;
         }

         // Calculate the total number of pages based on the default page size
         const totalPages = Math.ceil(totalHits / Constants.DEFAULT_API_PAGE_SIZE);

         for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            await this.#processCDDataByPage(interval, pageNum);

            if (pageNum % 10 === 0) {
               logger.debug(`${funcNote} - ${pageNum}/${totalPages} Pages COMPLETED!`);
            }
         }

         logger.debug(`${funcNote} COMPLETED`);
      } catch (err) {
         throw new CustomError({
            message: 'Processing CD Data By Interval ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'processDataByInterval',
            parameters: { interval },
            details: err,
         }).toObject();
      }
   }

   /**
    * @static
    * @async
    * @param {string} converId - The conversation ID.
    * @param {boolean} isFromNoti - Flag to indicate if the call is from a notification process.
    * @param {string} attributeFileName - The name of the file to store attribute data.
    * @description Processes conversation detail data for a specific conversation ID.
    * @throws {object} Throws a CustomError object if an error occurs.
    */
   static async processCDDataByConverId(converId, isFromNoti, attributeFileName) {
      try {
         const converData = await CdApiSvc.getCDDataById(converId);

         await this.processCDData(converData, isFromNoti, attributeFileName);
      } catch (err) {
         throw new CustomError({
            message: 'Processing CD Data By ConversationId ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'processCDDataByConverId',
            parameters: { conversationId: converId },
            details: err,
         }).toObject();
      }
   }

   /**
    * @static
    * @async
    * @param {object} converData - The conversation data object.
    * @param {boolean} isFromNoti - Flag to indicate if the call is from a notification process.
    * @param {string} attributeFileName - The name of the file to store attribute data.
    * @description Maps, stores, and processes conversation participant and attribute data.
    * @throws {object} Throws a CustomError object if an error occurs.
    */
   static async processCDData(converData, isFromNoti, attributeFileName) {
      try {
         const { participantData, attributeData } = await ConverDetailMapper.map(converData);

         if (!attributeData || attributeData.length === 0) return;

         if (isFromNoti) {
            await this.#storeParticipantData(participantData);
         }

         // Store Attribute data to DB
         const mappedAttributeData = await ConverDetailMapper.mapAttributesToEav(attributeData);
         await SequelizeService.upsert(mappedAttributeData, ivrAttribute);

         // Store Attribute data to TXT File
         const refactoredAttributeData = FileManager.refactorToTxtFormat(mappedAttributeData);
         const attributeFilePath = path.join(Constants.IVR_ATTRIBUTE_FILE_PATH, attributeFileName);
         await FileManager.appendTxtFile(attributeFilePath, refactoredAttributeData);
      } catch (err) {
         throw new CustomError({
            message: 'Processing CD Data ERROR!',
            className: this.#CLASS_NAME,
            functionName: 'processCDData',
            parameters: { isFromNoti, attributeTxtFilePath: attributeFileName },
            details: err,
         }).toObject();
      }
   }

   /**
    * @static
    * @private
    * @async
    * @param {string} interval - The time interval for fetching data.
    * @param {number} pageNum - The page number to fetch.
    * @description Fetches and processes a single page of conversation detail data.
    * @throws {object} Throws a CustomError object if an error occurs.
    */
   static async #processCDDataByPage(interval, pageNum) {
      try {
         const converDetails = await CdApiSvc.getCDDataByInterval(interval, pageNum);

         if (!converDetails || converDetails.length === 0) return;

         const converIds = converDetails.map((detail) => detail.conversationId);

         for (let i = 0; i < converIds.length; i += this.#MAX_CONCURRENT_JOBS) {
            const batch = converIds.slice(i, i + this.#MAX_CONCURRENT_JOBS);

            await Promise.all(batch.map((id) => this.processCDDataByConverId(id, false, this.#ATTRIBUTE_FILE_NAME)));
         }
      } catch (err) {
         throw new CustomError({
            message: 'Processing CD Data By Page ERROR!',
            className: this.#CLASS_NAME,
            functionName: '#processCDDataByPage',
            parameters: { interval, pageNum },
            details: err,
         }).toObject();
      }
   }

   /**
    * @static
    * @private
    * @async
    * @param {Array<object>} participantData - The participant data to be stored.
    * @description Stores participant data into a text file.
    */
   static async #storeParticipantData(participantData) {
      const today = dayjs().format('YYYY-MM-DD');
      const participantFileName = `${this.#PARTICIPANT_FILE_NAME}_${today}`;
      const participantFilePath = path.join(Constants.IVR_ATTRIBUTE_FILE_PATH, participantFileName);
      const refactoredParticipantData = FileManager.refactorToTxtFormat(participantData);
      await FileManager.appendTxtFile(participantFilePath, refactoredParticipantData);
   }
}

// Sample Usage
// await ProcessCDDataSvc.processDataByInterval('2025-11-30T20:00Z/2025-11-30T21:00Z');