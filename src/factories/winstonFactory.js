import { format, transports, createLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import WinstonConfiguration from '../configurations/winstonConfiguration.js';
import CustomError from '../utils/errors/customError.js';

/**
 * Factory class for creating and managing a singleton Winston logger instance.
 * Implements the Singleton pattern to ensure only one logger instance exists.
 *
 * @class WinstonFactory
 */
export default class WinstonFactory {
   static #CLASS_NAME = 'WinstonFactory';
   static #instance = null;

   /**
    * Gets or creates the singleton Winston logger instance.
    *
    * @static
    * @param {WinstonConfiguration} [configuration] - Optional configuration object. Only used on first call.
    * @returns {import('winston').Logger} The Winston logger instance
    * @throws {CustomError} If logger creation fails
    */
   static getInstance(configuration = null) {
      if (!WinstonFactory.#instance) {
         const config = configuration ?? new WinstonConfiguration();

         WinstonFactory.#instance = WinstonFactory.#createLogger(config);
      }

      return WinstonFactory.#instance;
   }

   /**
    * Resets the singleton instance. Useful for testing or reconfiguration.
    *
    * @static
    * @returns {void}
    */
   static reset() {
      if (WinstonFactory.#instance) {
         try {
            WinstonFactory.#instance.end();
         } catch (err) {
            // Ignore close errors
         }

         WinstonFactory.#instance = null;
      }
   }

   /**
    * Adds transport to the existing logger instance.
    *
    * @static
    * @param {import('winston').transport} transport - Transport to add
    * @returns {void}
    */
   static addTransport(transport) {
      if (!transport) {
         throw new CustomError({
            message: 'Transport is required',
            className: WinstonFactory.#CLASS_NAME,
            functionName: 'addTransport',
         });
      }

      const logger = WinstonFactory.getInstance();

      logger.add(transport);
   }

   /**
    * Removes transport from the existing logger instance.
    *
    * @static
    * @param {import('winston').transport} transport - Transport to remove
    * @returns {void}
    */
   static removeTransport(transport) {
      if (!transport) {
         throw new CustomError({
            message: 'Transport is required',
            className: WinstonFactory.#CLASS_NAME,
            functionName: 'removeTransport',
         });
      }

      const logger = WinstonFactory.getInstance();

      logger.remove(transport);
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Creates a new Winston logger instance with the provided configuration.
    *
    * @private
    * @static
    * @param {WinstonConfiguration} configuration - Configuration object
    * @returns {import('winston').Logger} Configured Winston logger instance
    * @throws {CustomError} If logger creation fails
    */
   static #createLogger(configuration) {
      const logTransports = [];

      try {
         const fileTransport = WinstonFactory.#createFileTransport(configuration);
         if (fileTransport) logTransports.push(fileTransport);

         const consoleTransport = WinstonFactory.#createConsoleTransport(configuration);
         if (consoleTransport) logTransports.push(consoleTransport);
      } catch (err) {
         throw new CustomError({
            message: 'Creating Transporters ERROR',
            className: WinstonFactory.#CLASS_NAME,
            functionName: '#createLogger',
            parameters: configuration,
            details: err,
         }).toObject();
      }

      // Ensure at least one transport is available
      if (logTransports.length === 0) {
         throw new CustomError({
            message: 'No valid transports configured for Winston logger',
            className: WinstonFactory.#CLASS_NAME,
            functionName: '#createLogger',
            parameters: configuration,
         }).toObject();
      }

      try {
         // Create logger instance
         const loggerInstance = createLogger({
            level: configuration.level,
            format: format.combine(
               format.timestamp({ format: configuration.timestampFormat }),
               format.errors({ stack: configuration.enableErrors }),
               WinstonFactory.#createLogFormat(configuration),
            ),
            transports: logTransports,
            exitOnError: false,
         });

         // Add uncaught exception handling
         loggerInstance.exceptions.handle(
            new transports.File({
               filename: path.join(configuration.file.dirname, 'uncaughtException.log'),
            }),
         );

         // Add unhandled rejection handling
         loggerInstance.rejections.handle(
            new transports.File({
               filename: path.join(configuration.file.dirname, 'unhandledRejections.log'),
            }),
         );

         return loggerInstance;
      } catch (err) {
         throw new CustomError({
            message: 'Creating Winston Instance ERROR',
            className: WinstonFactory.#CLASS_NAME,
            functionName: '#createLogger',
            parameters: configuration,
            details: err,
         }).toObject();
      }
   }

   /**
    * Creates a custom log format for Winston.
    *
    * @private
    * @static
    * @param {WinstonConfiguration} configuration - Configuration object
    * @returns {import('winston').Logform.Format} Winston format object
    */
   static #createLogFormat(configuration) {
      return format.printf(({ level, message, timestamp, stack, ...meta }) => {
         const formattedMessage = stack || message;

         const messageLines = formattedMessage
            .split('\n')
            .map((line, index) => (index === 0 ? line : `${configuration.customFormat.multilineIndent}${line}`));

         // Format metadata if it exists
         const metaString = Object.keys(meta).length > 0 ? `\nMeta Data: ${JSON.stringify(meta, null, 3)}` : '';

         return `[${timestamp}][${level}]: ${stack || messageLines.join('\n')}${metaString}`;
      });
   }

   /**
    * Creates a file transport for Winston if enabled in configuration.
    *
    * @private
    * @static
    * @param {WinstonConfiguration} configuration - Configuration object
    * @returns {DailyRotateFile|null} DailyRotateFile transport or null if disabled
    */
   static #createFileTransport(configuration) {
      if (!configuration.file.enabled) return null;

      return new DailyRotateFile({
         dirname: configuration.file.dirname,
         filename: configuration.file.filename,
         datePattern: configuration.file.datePattern,
         // maxSize: configuration.file.maxSize,
         // maxFiles: configuration.file.maxFiles,
         // zippedArchive: configuration.file.zippedArchive,
         // auditFile: path.join(configuration.file.dirname, configuration.file.auditFile)
      });
   }

   /**
    * Creates a console transport for Winston if enabled in configuration.
    *
    * @private
    * @static
    * @param {WinstonConfiguration} configuration - Configuration object
    * @returns {import('winston').transports.ConsoleTransportInstance|null} Console transport or null if disabled
    */
   static #createConsoleTransport(configuration) {
      if (!configuration.console.enabled) return null;

      const consoleFormat = [
         format.timestamp({ format: configuration.console.timestampFormat }),
         format.errors({ stack: true }),
         WinstonFactory.#createLogFormat(configuration),
      ];

      if (configuration.console.colorize) {
         consoleFormat.unshift(
            format.colorize({
               colors: configuration.console.colors,
            }),
         );
      }

      return new transports.Console({
         format: format.combine(...consoleFormat),
      });
   }
}
