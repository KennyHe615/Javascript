import os from 'os';
import logger from './src/services/winstonSvc.js';
import CustomError from './src/utils/errors/customError.js';

/**
 * WindowsSvc - Windows Service Manager.
 * Handles installation and uninstallation of the application as a Windows service.
 *
 * Usage:
 *   node windowsSvc.js install   - Install the service
 *   node windowsSvc.js uninstall - Uninstall the service
 *
 * @class WindowsSvc
 */
class WindowsSvc {
   static #CLASS_NAME = 'WindowsSvc';
   static #CONFIG = Object.freeze({
      name: 'Genesys_NTT_Notifications',
      description: 'Getting data from Genesys Cloud Notification APIs',
      script: './main.js',
   });

   #service;

   /**
    * Creates a new WindowsSvc instance.
    * Initializes the Windows service configuration and event listeners.
    *
    * @param {Object} service - node-windows Service class
    * @throws {CustomError} If service initialization fails
    */
   constructor(service) {
      try {
         this.#service = new service.Service({
            name: WindowsSvc.#CONFIG.name,
            description: WindowsSvc.#CONFIG.description,
            script: WindowsSvc.#CONFIG.script,
         });

         this.#setupEventListeners();
      } catch (err) {
         throw new CustomError({
            message: 'Failed to initialize Windows service',
            className: WindowsSvc.#CLASS_NAME,
            functionName: 'constructor',
            details: err,
         }).toObject();
      }
   }

   /**
    * Installs the Windows service.
    *
    * @returns {void}
    * @throws {CustomError} If installation fails
    */
   install() {
      try {
         logger.info(`[${WindowsSvc.#CLASS_NAME}] Installing service...`);
         this.#service.install();
      } catch (err) {
         throw new CustomError({
            message: 'Failed to install Windows service',
            className: WindowsSvc.#CLASS_NAME,
            functionName: 'install',
            details: err,
         }).toObject();
      }
   }

   /**
    * Uninstalls the Windows service.
    *
    * @returns {void}
    * @throws {CustomError} If uninstallation fails
    */
   uninstall() {
      try {
         logger.info(`[${WindowsSvc.#CLASS_NAME}] Uninstalling service...`);
         this.#service.uninstall();
      } catch (err) {
         throw new CustomError({
            message: 'Failed to uninstall Windows service',
            className: WindowsSvc.#CLASS_NAME,
            functionName: 'uninstall',
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Sets up event listeners for service lifecycle events.
    * Handles install, uninstall, error, and duplicate operation events.
    *
    * @private
    * @returns {void}
    */
   #setupEventListeners() {
      this.#service.on('install', () => {
         logger.debug(`[${WindowsSvc.#CLASS_NAME}] Service installed successfully`);
         try {
            this.#service.start();
         } catch (err) {
            logger.error(`[${WindowsSvc.#CLASS_NAME}] Failed to start service`, { error: err.message });
         }
      });

      this.#service.on('uninstall', () => {
         logger.debug(`[${WindowsSvc.#CLASS_NAME}] Service uninstalled successfully`);
         logger.debug(`[${WindowsSvc.#CLASS_NAME}] Service exists: ${this.#service.exists}`);
         process.exit(0);
      });

      this.#service.on('alreadyinstalled', () => {
         logger.warn(`[${WindowsSvc.#CLASS_NAME}] Service is already installed`);
         process.exit(1);
      });

      this.#service.on('alreadyuninstalled', () => {
         logger.warn(`[${WindowsSvc.#CLASS_NAME}] Service is already uninstalled`);
         process.exit(1);
      });

      this.#service.on('error', (err) => {
         logger.error(`[${WindowsSvc.#CLASS_NAME}] Service error occurred`, { error: err.message, stack: err.stack });
         process.exit(1);
      });
   }
}

/**
 * Main CLI handler for service management commands.
 * Uses dynamic imports to conditionally load Windows-specific modules.
 *
 * @async
 * @returns {Promise<void>}
 */
async function main() {
   // Check platform before loading any Windows-specific modules
   if (os.platform() !== 'win32') {
      logger.error('Error: WindowsSvc can only run on Windows platform');
      logger.error(`Current platform: ${os.platform()}`);
      process.exit(1);
   }

   const args = process.argv.slice(2);
   const command = args[0];

   if (!command || (command !== 'install' && command !== 'uninstall')) {
      logger.warn('Usage:');
      logger.warn('  node windowsSvc.js install   - Install the service');
      logger.warn('  node windowsSvc.js uninstall - Uninstall the service');
      process.exit(1);
   }

   try {
      // Dynamic imports - only load when actually needed
      const service = await import('node-windows');

      const windowsSvc = new WindowsSvc(service);

      if (command === 'install') {
         windowsSvc.install();
      } else if (command === 'uninstall') {
         windowsSvc.uninstall();
      }
   } catch (err) {
      logger.error('Error:', err.message || err);
      if (err.details) {
         logger.error('Details:', err.details);
      }
      process.exit(1);
   }
}

// Run CLI only if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
   await main();
}

// Export for testing
export default WindowsSvc;
