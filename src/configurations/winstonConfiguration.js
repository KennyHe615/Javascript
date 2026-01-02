import path from 'path';
import Constants from '../utils/constants.js';

/**
 * Configuration class for Winston logger settings.
 * Provides static default configuration and allows instance-based customization.
 *
 * @class WinstonConfiguration
 */
export default class WinstonConfiguration {
   static #DEFAULT_CONFIG = Object.freeze({
      level: 'debug',
      timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      enableErrors: true,
      customFormat: Object.freeze({
         multilineIndent: '\t',
         includeTimestamp: true,
         includeLevel: true,
         includeStack: true,
      }),
      console: Object.freeze({
         enabled: true,
         colorize: true,
         timestampFormat: 'YYYY-MM-DD HH:mm:ss',
         colors: {
            warn: 'magenta',
            error: 'bold red cyanBG',
         },
      }),
      file: Object.freeze({
         enabled: true,
         dirname: path.resolve(Constants.ROOT_FOLDER, 'logs'),
         filename: '%DATE%.log',
         datePattern: 'YYYY-MM-DD',
         // maxSize: "20m",
         // maxFiles: "14d",           // Keep 14 days of logs
         // zippedArchive: true,       // Automatically compress old logs
         // auditFile: "winston-audit.json"
      }),
   });

   /**
    * Creates a new WinstonConfiguration instance.
    *
    * @param {Object} [options={}] - Optional configuration overrides
    * @param {string} [options.level] - Log level (debug, info, warn, error)
    * @param {string} [options.timestampFormat] - Timestamp format string
    * @param {boolean} [options.enableErrors] - Enable error stack traces in logs
    * @param {Object} [options.file] - File transport configuration overrides
    * @param {Object} [options.console] - Console transport configuration overrides
    * @param {Object} [options.customFormat] - Custom format configuration overrides
    */
   constructor(options = {}) {
      this.level = options.level ?? WinstonConfiguration.#DEFAULT_CONFIG.level;
      this.timestampFormat = options.timestampFormat ?? WinstonConfiguration.#DEFAULT_CONFIG.timestampFormat;
      this.enableErrors = options.enableErrors ?? WinstonConfiguration.#DEFAULT_CONFIG.enableErrors;

      // Custom format configuration - merge with defaults
      this.customFormat = {
         ...WinstonConfiguration.#DEFAULT_CONFIG.customFormat,
         ...options.customFormat,
      };

      // Console transport configuration - merge with defaults
      this.console = {
         ...WinstonConfiguration.#DEFAULT_CONFIG.console,
         colors: {
            ...WinstonConfiguration.#DEFAULT_CONFIG.console.colors,
            ...options.console?.colors,
         },
         ...options.console,
      };

      // File transport configuration - merge with defaults
      this.file = {
         ...WinstonConfiguration.#DEFAULT_CONFIG.file,
         ...options.file,
      };

      // Freeze nested objects to prevent mutations
      Object.freeze(this.customFormat);
      Object.freeze(this.console.colors);
      Object.freeze(this.console);
      Object.freeze(this.file);

      // Freeze the instance to prevent accidental mutations
      Object.freeze(this);
   }
}
