import { EventEmitter } from 'events';
import WebSocket from 'ws';
import * as path from 'path';
import NotiApiSvc from './notiApi.svc.js';
import logger from '../services/winstonService.js';
import CustomError from '../utils/customErrors/customError.js';
import FileManager from '../utils/fileManager.js';
import Constants from '../utils/constants.js';

export default class ChannelSvc {
   static #CLASS_NAME = 'ChannelSvc';
   static #INITIAL_RECONNECT_DELAY_MS = 5000;
   static #MAX_RECONNECT_DELAY_MS = 60000;

   #eventEmitter;
   #topics;
   #messageHandler;

   #channelId = null;
   #webSocket = null;
   #reconnectionTimeout = null;
   #reconnectAttempts = 0;
   #channelName;
   #channelIdFilePath;

   constructor({ channelName, topics, messageHandler }) {
      this.#channelName = channelName;
      this.#topics = topics;
      this.#messageHandler = messageHandler;

      this.#eventEmitter = new EventEmitter();
      this.eventStatusChange = 'statusChange'; // Exposed for external status monitoring if needed
      this.#channelIdFilePath = path.join(Constants.ROOT_FOLDER, 'info', `${this.#channelName?.trim()}ChannelId`);
   }

   /**
    * Initializes the notification channel, creates a WebSocket, and starts listening.
    * @returns {Promise<void>}
    */
   async initialize() {
      try {
         await this.#clearPreviousChannel();

         const { connectUri, id } = await NotiApiSvc.generateChannel();

         this.#channelId = id;

         await NotiApiSvc.createSubscription(this.#channelId, this.#topics);

         this.#webSocket = new WebSocket(connectUri);

         this.#setupEventHandlers();

         await FileManager.writeFile(this.#channelIdFilePath, 'txt', this.#channelId);
      } catch (err) {
         throw new CustomError({
            message: `Failed to initialize notification channel`,
            className: ChannelSvc.#CLASS_NAME,
            functionName: 'initialize',
            parameters: { channel: this.#channelName },
            details: err,
         }).toObject();
      }
   }

   /**
    * Sets up WebSocket event handlers
    * @private
    */
   #setupEventHandlers() {
      this.#webSocket.on('open', this.#handleOpen.bind(this));
      this.#webSocket.on('close', this.#handleClose.bind(this));
      this.#webSocket.on('error', this.#handleError.bind(this));
      this.#webSocket.on('message', this.#onClientMessage.bind(this));
   }

   /**
    * Handles WebSocket open event
    * @private
    */
   #handleOpen() {
      logger.info(`[Channel = ${this.#channelName}] WebSocket connection opened.`);
      this.#clearReconnectionTimeout();
      this.#reconnectAttempts = 0;
      this.#eventEmitter.emit(this.eventStatusChange, true);
   }

   /**
    * Handles WebSocket close event
    * @private
    * @param {number} code - Close code
    * @param {Buffer} reason - Close reason
    */
   #handleClose(code, reason) {
      logger.error(`[Channel = ${this.#channelName}] WebSocket connection closed. Code: ${code}, Reason: ${reason}`);
      this.#eventEmitter.emit(this.eventStatusChange, false);
      this.#startReconnectionTimeout();
   }

   /**
    * Handles WebSocket error event
    * @private
    * @param {Error} err - Error object
    */
   #handleError(err) {
      logger.error(`[Channel = ${this.#channelName}] WebSocket error: ${err}`);
      this.#eventEmitter.emit(this.eventStatusChange, false);
      // The 'close' event will likely follow, which will trigger reconnection.
   }

   /**
    * Handles incoming WebSocket messages
    * @private
    * @param {Buffer} data - Message data
    */
   async #onClientMessage(data) {
      // A message implies the connection is healthy.
      this.#clearReconnectionTimeout();
      this.#eventEmitter.emit(this.eventStatusChange, true);

      // Process the message
      try {
         this.#messageHandler(data);
      } catch (err) {
         const errorObj = new CustomError({
            message: 'Processing Message ERROR',
            className: ChannelSvc.#CLASS_NAME,
            functionName: '#onClientMessage',
            parameters: { channel: this.#channelName },
            details: err,
         }).toObject();
         logger.error(JSON.stringify(errorObj, null, 3));
      }
   }

   /**
    * Implements a persistent retry mechanism with exponential backoff and jitter
    * @private
    */
   #startReconnectionTimeout() {
      this.#clearReconnectionTimeout();

      const backoffDelay = Math.pow(2, this.#reconnectAttempts) * ChannelSvc.#INITIAL_RECONNECT_DELAY_MS;
      const cappedDelay = Math.min(backoffDelay, ChannelSvc.#MAX_RECONNECT_DELAY_MS);
      const jitter = cappedDelay * Math.random() * 0.2; // Add up to 20% jitter
      const finalDelay = cappedDelay + jitter;
      this.#reconnectAttempts++;

      this.#reconnectionTimeout = setTimeout(async () => {
         logger.warn(
            `[Channel = ${this.#channelName}] Reconnection attempt #${this.#reconnectAttempts} after ${Math.round(finalDelay / 1000)}s delay. Attempting to re-initialize channel...`,
         );

         try {
            await this.initialize();
         } catch (err) {
            logger.error(`[Channel = ${this.#channelName}] Failed to re-initialize channel during reconnection attempt.`, err);
            // If re-initialization fails, schedule another attempt.
            this.#startReconnectionTimeout();
         }
      }, finalDelay);
   }

   /**
    * Clears any existing reconnection timeout
    * @private
    */
   #clearReconnectionTimeout() {
      if (this.#reconnectionTimeout) {
         clearTimeout(this.#reconnectionTimeout);
         this.#reconnectionTimeout = null;
      }
   }

   /**
    * Clears previous channel subscription if exists
    * @private
    */
   async #clearPreviousChannel() {
      try {
         const previousId = this.#channelId ?? (await FileManager.readFile(this.#channelIdFilePath, 'txt'));
         if (!previousId) return;

         await NotiApiSvc.clearSubscription(previousId);

         this.#channelId = null;
      } catch (error) {
         // Log the error but don't re-throw, as failing to clear an old channel shouldn't block creating a new one.
         const errorObj = new CustomError({
            message: 'Clearing Channel Id ERROR',
            className: ChannelSvc.#CLASS_NAME,
            functionName: '#clearPreviousChannel',
            parameters: { channel: this.#channelName },
            details: error,
         }).toObject();
         logger.error(JSON.stringify(errorObj, null, 3));
      }
   }
}