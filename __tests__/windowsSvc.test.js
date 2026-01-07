import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WindowsSvc from '../windowsSvc.js';
import logger from '../src/services/winstonSvc.js';

vi.mock('../src/services/winstonSvc.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
   },
}));

vi.mock('../src/utils/errors/customError.js', () => {
   return {
      default: class CustomError {
         constructor(config) {
            this.message = config.message;
            this.className = config.className;
            this.functionName = config.functionName;
            this.details = config.details;
         }

         toObject() {
            return {
               message: this.message,
               className: this.className,
               functionName: this.functionName,
               details: this.details,
            };
         }
      },
   };
});

describe('WindowsSvc', () => {
   let mockService;
   let mockServiceInstance;
   let windowsSvc;
   let originalExit;

   beforeEach(() => {
      mockServiceInstance = {
         install: vi.fn(),
         uninstall: vi.fn(),
         start: vi.fn(),
         on: vi.fn(),
         exists: false,
      };

      mockService = {
         Service: class Service {
            constructor() {
               return mockServiceInstance;
            }
         },
      };

      originalExit = process.exit;
      process.exit = vi.fn();
      vi.clearAllMocks();
   });

   afterEach(() => {
      process.exit = originalExit;
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      describe('Success Cases', () => {
         it('should create a WindowsSvc instance with correct configuration', () => {
            windowsSvc = new WindowsSvc(mockService);

            expect(mockServiceInstance.on).toHaveBeenCalledWith('install', expect.any(Function));
            expect(mockServiceInstance.on).toHaveBeenCalledWith('uninstall', expect.any(Function));
            expect(mockServiceInstance.on).toHaveBeenCalledWith('alreadyinstalled', expect.any(Function));
            expect(mockServiceInstance.on).toHaveBeenCalledWith('alreadyuninstalled', expect.any(Function));
            expect(mockServiceInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
         });

         it('should set up event listeners during construction', () => {
            windowsSvc = new WindowsSvc(mockService);

            expect(mockServiceInstance.on).toHaveBeenCalledTimes(5);
         });
      });

      describe('Error Cases', () => {
         it('should throw error object when Service constructor fails', () => {
            const constructorError = new Error('Service initialization failed');

            mockService.Service = class Service {
               constructor() {
                  throw constructorError;
               }
            };

            try {
               new WindowsSvc(mockService);
               expect.fail('Should have thrown an error');
            } catch (error) {
               expect(error.message).toBe('Failed to initialize Windows service');
               expect(error.className).toBe('WindowsSvc');
               expect(error.functionName).toBe('constructor');
               expect(error.details).toBe(constructorError);
            }
         });
      });
   });

   describe('install()', () => {
      beforeEach(() => {
         windowsSvc = new WindowsSvc(mockService);
      });

      describe('Success Cases', () => {
         it('should call service.install()', () => {
            windowsSvc.install();

            expect(mockServiceInstance.install).toHaveBeenCalledTimes(1);
         });

         it('should log installation start message', () => {
            windowsSvc.install();

            expect(logger.info).toHaveBeenCalledWith('[WindowsSvc] Installing service...');
         });
      });

      describe('Error Cases', () => {
         it('should throw error object when install fails', () => {
            const installError = new Error('Installation failed');
            mockServiceInstance.install.mockImplementation(() => {
               throw installError;
            });

            try {
               windowsSvc.install();
               expect.fail('Should have thrown an error');
            } catch (error) {
               expect(error.message).toBe('Failed to install Windows service');
               expect(error.className).toBe('WindowsSvc');
               expect(error.functionName).toBe('install');
               expect(error.details).toBe(installError);
            }
         });
      });
   });

   describe('uninstall()', () => {
      beforeEach(() => {
         windowsSvc = new WindowsSvc(mockService);
      });

      describe('Success Cases', () => {
         it('should call service.uninstall()', () => {
            windowsSvc.uninstall();

            expect(mockServiceInstance.uninstall).toHaveBeenCalledTimes(1);
         });

         it('should log uninstallation start message', () => {
            windowsSvc.uninstall();

            expect(logger.info).toHaveBeenCalledWith('[WindowsSvc] Uninstalling service...');
         });
      });

      describe('Error Cases', () => {
         it('should throw error object when uninstall fails', () => {
            const uninstallError = new Error('Uninstallation failed');
            mockServiceInstance.uninstall.mockImplementation(() => {
               throw uninstallError;
            });

            try {
               windowsSvc.uninstall();
               expect.fail('Should have thrown an error');
            } catch (error) {
               expect(error.message).toBe('Failed to uninstall Windows service');
               expect(error.className).toBe('WindowsSvc');
               expect(error.functionName).toBe('uninstall');
               expect(error.details).toBe(uninstallError);
            }
         });
      });
   });

   describe('Event Listeners', () => {
      beforeEach(() => {
         windowsSvc = new WindowsSvc(mockService);
      });

      describe('install event', () => {
         it('should log success message and start service when install event fires', () => {
            const installHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'install')[1];

            installHandler();

            expect(logger.debug).toHaveBeenCalledWith('[WindowsSvc] Service installed successfully');
            expect(mockServiceInstance.start).toHaveBeenCalledTimes(1);
         });

         it('should log error when service start fails', () => {
            const startError = new Error('Failed to start');
            mockServiceInstance.start.mockImplementation(() => {
               throw startError;
            });

            const installHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'install')[1];

            installHandler();

            expect(logger.error).toHaveBeenCalledWith('[WindowsSvc] Failed to start service', {
               error: startError.message,
            });
         });
      });

      describe('uninstall event', () => {
         it('should log success message and exit with code 0', () => {
            mockServiceInstance.exists = false;

            const uninstallHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'uninstall')[1];

            uninstallHandler();

            expect(logger.debug).toHaveBeenCalledWith('[WindowsSvc] Service uninstalled successfully');
            expect(logger.debug).toHaveBeenCalledWith('[WindowsSvc] Service exists: false');
            expect(process.exit).toHaveBeenCalledWith(0);
         });
      });

      describe('alreadyinstalled event', () => {
         it('should log warning and exit with code 1', () => {
            const alreadyInstalledHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'alreadyinstalled')[1];

            alreadyInstalledHandler();

            expect(logger.warn).toHaveBeenCalledWith('[WindowsSvc] Service is already installed');
            expect(process.exit).toHaveBeenCalledWith(1);
         });
      });

      describe('alreadyuninstalled event', () => {
         it('should log warning and exit with code 1', () => {
            const alreadyUninstalledHandler = mockServiceInstance.on.mock.calls.find(
               (call) => call[0] === 'alreadyuninstalled',
            )[1];

            alreadyUninstalledHandler();

            expect(logger.warn).toHaveBeenCalledWith('[WindowsSvc] Service is already uninstalled');
            expect(process.exit).toHaveBeenCalledWith(1);
         });
      });

      describe('error event', () => {
         it('should log error with stack trace and exit with code 1', () => {
            const serviceError = new Error('Service error occurred');
            serviceError.stack = 'Error stack trace';

            const errorHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'error')[1];

            errorHandler(serviceError);

            expect(logger.error).toHaveBeenCalledWith('[WindowsSvc] Service error occurred', {
               error: serviceError.message,
               stack: serviceError.stack,
            });
            expect(process.exit).toHaveBeenCalledWith(1);
         });
      });
   });

   describe('Integration Tests', () => {
      it('should handle full install workflow', () => {
         windowsSvc = new WindowsSvc(mockService);

         windowsSvc.install();

         expect(logger.info).toHaveBeenCalledWith('[WindowsSvc] Installing service...');
         expect(mockServiceInstance.install).toHaveBeenCalledTimes(1);

         const installHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'install')[1];
         installHandler();

         expect(logger.debug).toHaveBeenCalledWith('[WindowsSvc] Service installed successfully');
         expect(mockServiceInstance.start).toHaveBeenCalledTimes(1);
      });

      it('should handle full uninstall workflow', () => {
         windowsSvc = new WindowsSvc(mockService);

         windowsSvc.uninstall();

         expect(logger.info).toHaveBeenCalledWith('[WindowsSvc] Uninstalling service...');
         expect(mockServiceInstance.uninstall).toHaveBeenCalledTimes(1);

         const uninstallHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'uninstall')[1];
         uninstallHandler();

         expect(logger.debug).toHaveBeenCalledWith('[WindowsSvc] Service uninstalled successfully');
         expect(process.exit).toHaveBeenCalledWith(0);
      });

      it('should handle already installed scenario', () => {
         windowsSvc = new WindowsSvc(mockService);

         windowsSvc.install();

         const alreadyInstalledHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'alreadyinstalled')[1];
         alreadyInstalledHandler();

         expect(logger.warn).toHaveBeenCalledWith('[WindowsSvc] Service is already installed');
         expect(process.exit).toHaveBeenCalledWith(1);
      });
   });

   describe('Edge Cases', () => {
      it('should handle multiple event listener registrations', () => {
         windowsSvc = new WindowsSvc(mockService);

         expect(mockServiceInstance.on).toHaveBeenCalledTimes(5);
      });

      it('should handle service start failure during install event', () => {
         windowsSvc = new WindowsSvc(mockService);

         mockServiceInstance.start.mockImplementation(() => {
            throw new Error('Start failed');
         });

         const installHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'install')[1];
         installHandler();

         expect(logger.error).toHaveBeenCalledWith('[WindowsSvc] Failed to start service', {
            error: 'Start failed',
         });
         expect(process.exit).not.toHaveBeenCalled();
      });

      it('should handle error event with missing stack trace', () => {
         windowsSvc = new WindowsSvc(mockService);

         const errorWithoutStack = new Error('Error without stack');
         delete errorWithoutStack.stack;

         const errorHandler = mockServiceInstance.on.mock.calls.find((call) => call[0] === 'error')[1];
         errorHandler(errorWithoutStack);

         expect(logger.error).toHaveBeenCalledWith('[WindowsSvc] Service error occurred', {
            error: errorWithoutStack.message,
            stack: undefined,
         });
         expect(process.exit).toHaveBeenCalledWith(1);
      });
   });
});
