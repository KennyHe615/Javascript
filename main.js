import SequelizeFactory from './src/factories/sequelizeFactory.js';
import SequelizeSvc from './src/services/sequelizeSvc.js';
import scheduledJobsHandler from './src/schedulers/scheduledJobsHandler.js';
import conversationsNotiSvc from './src/notifications/conversationsNotiSvc.js';
import logger from './src/services/winstonSvc.js';
import CustomError from './src/utils/errors/CustomError.js';
import Constants from './src/utils/constants.js';

/**
 * Main - Application entry point.
 * Initializes database connections, starts scheduled jobs, and notification services.
 *
 * @class Main
 */
class Main {
   static CLASS_NAME = 'Main';

   #dbSvc;

   /**
    * Creates a new Main instance.
    * Initializes database service instances from SequelizeFactory.
    */
   constructor() {
      this.#dbSvc = new SequelizeSvc(SequelizeFactory.getInstance());
   }

   /**
    * Starts the application.
    * Establishes database connections and starts scheduled jobs.
    *
    * @async
    * @returns {Promise<void>}
    */
   async startAsync() {
      logger.info(`${Constants.PROJECT_NAME} Application is up and running...`);

      // Ensure db connection
      await this.#dbSvc.connect();

      // Scheduled Jobs
      scheduledJobsHandler.start();
   }

   /**
    * Disconnects all database connections.
    *
    * @async
    * @returns {Promise<void>}
    */
   async disconnectAsync() {
      await this.#dbSvc.disconnect();
   }

   async shutdownAsync() {
      logger.info(`${Constants.PROJECT_NAME} Application shutting down gracefully...`);

      try {
         await conversationsNotiSvc.stop();
         await this.disconnectAsync();

         logger.info(`${Constants.PROJECT_NAME} Application shutdown completed.`);
      } catch (err) {
         logger.error('Error during shutdown:', err);
      }
   }
}

(async () => {
   const main = new Main();

   try {
      await main.startAsync();

      await conversationsNotiSvc.start();

      logger.info(`${Constants.PROJECT_NAME} All services started successfully.`);
   } catch (err) {
      const errObj = new CustomError({
         message: 'Application Startup Failed',
         className: Main.CLASS_NAME,
         functionName: 'IIFE',
         details: err,
      }).toObject();

      logger.error(`Application Startup Error: ${JSON.stringify(errObj, null, 3)}`);

      await main.disconnectAsync();
      process.exit(1);
   }

   const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      await main.shutdownAsync();
      process.exit(0);
   };

   process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
   process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
   const errorObj = {
      type: 'UnhandledRejection',
      reason:
         reason instanceof Error
            ? {
                 message: reason.message,
                 stack: reason.stack,
                 name: reason.name,
              }
            : reason,
      promise: promise?.constructor?.name || 'Unknown',
   };

   logger.error(`Unhandled Promise Rejection: ${JSON.stringify(errorObj, null, 3)}`);

   process.exit(1);
});

process.on('uncaughtException', (err) => {
   const errorObj = {
      type: 'UncaughtException',
      message: err.message,
      stack: err.stack,
      name: err.name,
      code: err.code,
   };

   logger.error(`Uncaught Exception thrown: ${JSON.stringify(errorObj, null, 3)}`);

   process.exit(1);
});
