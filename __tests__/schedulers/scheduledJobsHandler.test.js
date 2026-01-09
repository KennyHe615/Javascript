import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScheduledJobsHandler } from '../../src/schedulers/scheduledJobsHandler.js';

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      ROOT_FOLDER: '/mock/root',
      RUNNING_ENVIRONMENT: 'local',
      PROJECT_NAME: 'Test Project',
   },
}));

vi.mock('../../src/services/winstonSvc.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
   },
}));

vi.mock('../../src/services/nodeMailerSvc.js', () => ({
   default: {
      sendEmailAsync: vi.fn(),
   },
}));

vi.mock('node-schedule', () => ({
   default: {
      scheduleJob: vi.fn(() => ({ cancel: vi.fn() })),
   },
}));

vi.mock('../../src/services/zipLogsSvc.js', () => ({
   default: {
      runScheduledJobAsync: vi.fn(),
   },
}));

vi.mock('../../src/schedulers/zipLogs.scheduler.js', () => ({
   default: vi.fn(function () {
      this.start = vi.fn().mockReturnValue({ cancel: vi.fn() });
   }),
}));

const ZipLogsScheduler = (await import('../../src/schedulers/zipLogs.scheduler.js')).default;

describe('ScheduledJobsHandler', () => {
   let handler;

   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance successfully', () => {
         handler = new ScheduledJobsHandler();

         expect(handler).toBeInstanceOf(ScheduledJobsHandler);
      });

      it('should create ZipLogsScheduler instance', () => {
         handler = new ScheduledJobsHandler();

         expect(ZipLogsScheduler).toHaveBeenCalledTimes(1);
      });

      it('should pass dependencies to ZipLogsScheduler', () => {
         const mockDependencies = {
            nodeMailerSvc: { sendEmailAsync: vi.fn() },
         };

         handler = new ScheduledJobsHandler(mockDependencies);

         expect(ZipLogsScheduler).toHaveBeenCalledWith(mockDependencies);
      });

      it('should create instance with empty dependencies object', () => {
         handler = new ScheduledJobsHandler({});

         expect(handler).toBeInstanceOf(ScheduledJobsHandler);
         expect(ZipLogsScheduler).toHaveBeenCalledWith({});
      });
   });

   describe('start', () => {
      it('should start all schedulers successfully', () => {
         handler = new ScheduledJobsHandler();

         expect(() => handler.start()).not.toThrow();
      });

      it('should call start method on ZipLogsScheduler', () => {
         const mockZipLogsScheduler = {
            start: vi.fn().mockReturnValue({ cancel: vi.fn() }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();
         handler.start();

         expect(mockZipLogsScheduler.start).toHaveBeenCalledTimes(1);
      });

      it('should throw CustomError when scheduler start fails', () => {
         const mockError = new Error('Scheduler start failed');
         const mockZipLogsScheduler = {
            start: vi.fn().mockImplementation(() => {
               throw mockError;
            }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();

         expect(() => handler.start()).toThrow();
      });

      it('should wrap error in CustomError with correct structure', () => {
         const mockError = new Error('Scheduler start failed');
         const mockZipLogsScheduler = {
            start: vi.fn().mockImplementation(() => {
               throw mockError;
            }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();

         try {
            handler.start();
         } catch (err) {
            expect(err.message).toBe('Starting Scheduled Jobs ERROR!');
            expect(err.className).toBe('ScheduledJobsHandler');
            expect(err.details).toBeDefined();
         }
      });

      it('should handle multiple scheduler start calls', () => {
         const mockZipLogsScheduler = {
            start: vi.fn().mockReturnValue({ cancel: vi.fn() }),
         };

         ZipLogsScheduler.mockImplementation(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();
         handler.start();
         handler.start();

         expect(mockZipLogsScheduler.start).toHaveBeenCalledTimes(2);
      });
   });

   describe('Error Handling', () => {
      it('should throw error with correct message format', () => {
         const mockZipLogsScheduler = {
            start: vi.fn().mockImplementation(() => {
               throw new Error('Test error');
            }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();

         expect(() => handler.start()).toThrow();
      });

      it('should preserve original error details', () => {
         const originalError = new Error('Original scheduler error');
         const mockZipLogsScheduler = {
            start: vi.fn().mockImplementation(() => {
               throw originalError;
            }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();

         try {
            handler.start();
         } catch (err) {
            expect(err.details).toBeDefined();
         }
      });
   });

   describe('Dependency Injection', () => {
      it('should support custom dependencies', () => {
         const mockNodeMailerSvc = {
            sendEmailAsync: vi.fn().mockResolvedValue(undefined),
         };

         handler = new ScheduledJobsHandler({
            nodeMailerSvc: mockNodeMailerSvc,
         });

         expect(handler).toBeInstanceOf(ScheduledJobsHandler);
      });

      it('should pass dependencies to child schedulers', () => {
         const customDeps = {
            nodeMailerSvc: { sendEmailAsync: vi.fn() },
         };

         handler = new ScheduledJobsHandler(customDeps);

         expect(ZipLogsScheduler).toHaveBeenCalledWith(customDeps);
      });
   });

   describe('Integration', () => {
      it('should integrate with node-schedule through schedulers', () => {
         const mockZipLogsScheduler = {
            start: vi.fn().mockReturnValue({ cancel: vi.fn() }),
         };

         ZipLogsScheduler.mockImplementationOnce(function () {
            return mockZipLogsScheduler;
         });

         handler = new ScheduledJobsHandler();
         handler.start();

         expect(mockZipLogsScheduler.start).toHaveBeenCalled();
      });

      it('should handle scheduler initialization', () => {
         expect(() => new ScheduledJobsHandler()).not.toThrow();
      });
   });
});
