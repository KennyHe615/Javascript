import dayjs from 'dayjs';
import ChannelSvc from './channel.svc.js';
import CustomError from '../utils/customErrors/customError.js';
import logger from '../services/winstonService.js';
import QueuesSvc from '../references/queuesSvc.js';
import ProcessCDDataSvc from '../conversationDetail_cd/processCDData.svc.js';

/**
 * Service for handling conversation notifications
 */
export default class ConversationsNotiSvc {
   static #CLASS_NAME = 'ConversationsNotiSvc';
   static #CHANNEL_NAME = 'Conversations';
   static #TOPIC_NAME_PATTERN = /^v2\.routing\.queues\..*\.conversations$/;
   static #ATTRIBUTE_FILE_NAME = 'Gen_Notification_Conversation_IVRAttribute_STG';

   /**
    * Starts the conversation notification service
    * @returns {Promise<void>}
    */
   static async start() {
      try {
         const topics = await this.#createConversationTopics();

         const ivrChannel = new ChannelSvc({
            channelName: this.#CHANNEL_NAME,
            topics: topics,
            messageHandler: (data) => this.#converMsgHandler(data),
         });

         await ivrChannel.initialize();

         logger.info(`${this.#CHANNEL_NAME} notification service started successfully`);
      } catch (err) {
         throw new CustomError({
            message: 'Starting Conversations Notification Service Error!',
            className: this.#CLASS_NAME,
            details: err,
         }).toObject();
      }
   }

   /**
    * Handles conversation messages
    * @private
    * @param {Buffer|string} data - Message data
    */
   static async #converMsgHandler(data) {
      try {
         const { topicName, eventBody } = JSON.parse(data);

         if (!this.#TOPIC_NAME_PATTERN.test(topicName)) return;

         const today = dayjs().format('YYYY-MM-DD');
         const attributesFileName = `${ConversationsNotiSvc.#ATTRIBUTE_FILE_NAME}_${today}`;

         await ProcessCDDataSvc.processCDData(eventBody, true, attributesFileName);
      } catch (err) {
         const errorObj = new CustomError({
            message: 'IVR Message Handler Error!',
            className: this.#CLASS_NAME,
            functionName: '#converMsgHandler',
            details: err,
         }).toObject();
         logger.error(JSON.stringify(errorObj, null, 3));
      }
   }

   /**
    * Creates conversation topics for all queues
    * @private
    * @returns {Promise<Array>} Array of topic objects
    */
   static async #createConversationTopics() {
      try {
         const queueIds = await QueuesSvc.getQueueIds();
         logger.info(`Creating conversation topics for ${queueIds.length} queues`);

         return queueIds.map((queueId) => ({
            id: `v2.routing.queues.${queueId}.conversations`,
         }));
      } catch (error) {
         throw new CustomError({
            message: 'Creating Conversation Topics Error!',
            className: this.#CLASS_NAME,
            functionName: '#createConversationTopics',
            details: error,
         }).toObject();
      }
   }
}

// Sample usage
try {
   await ConversationsNotiSvc.start();
} catch (err) {
   logger.error(`Error: ${JSON.stringify(err, null, 3)}`);
}