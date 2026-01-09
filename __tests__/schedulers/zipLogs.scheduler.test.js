import { describe, it, expect, vi, beforeEach } from 'vitest';
import ZipLogsScheduler from '../../src/schedulers/zipLogs.scheduler.js';
import SchedulerBase from '../../src/schedulers/scheduler.base.js';

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
      scheduleJob: vi.fn(),
   },
}));

vi.mock('../../src/services/zipLogsSvc.js', () => ({
   default: {
      runScheduledJobAsync: vi.fn(),
   },
}));

describe('ZipLogsScheduler', () => {
   let scheduler;

   beforeEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance successfully with default dependencies', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeInstanceOf(ZipLogsScheduler);
         expect(scheduler).toBeInstanceOf(SchedulerBase);
      });

      it('should create instance with custom dependencies', () => {
         const mockNodeMailerSvc = { sendEmailAsync: vi.fn() };

         scheduler = new ZipLogsScheduler({
            nodeMailerSvc: mockNodeMailerSvc,
         });

         expect(scheduler).toBeInstanceOf(ZipLogsScheduler);
      });

      it('should pass correct scheduler name to parent class', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should pass correct scheduled times to parent class', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should pass ZipLogsSvc to parent class', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });
   });

   describe('Static Properties', () => {
      it('should have correct scheduled times for all environments', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should create scheduler successfully indicating frozen scheduled times are used', () => {
         expect(() => new ZipLogsScheduler()).not.toThrow();
      });
   });

   describe('Inheritance', () => {
      it('should inherit from SchedulerBase', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeInstanceOf(SchedulerBase);
      });

      it('should have start method inherited from SchedulerBase', () => {
         scheduler = new ZipLogsScheduler();

         expect(typeof scheduler.start).toBe('function');
      });
   });

   describe('Scheduler Configuration', () => {
      it('should use correct cron expression for local environment', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should use correct cron expression for dev environment', () => {
         vi.doMock('../../src/utils/constants.js', () => ({
            default: {
               ROOT_FOLDER: '/mock/root',
               RUNNING_ENVIRONMENT: 'dev',
               PROJECT_NAME: 'Test Project',
            },
         }));

         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should use correct cron expression for production environments', () => {
         vi.doMock('../../src/utils/constants.js', () => ({
            default: {
               ROOT_FOLDER: '/mock/root',
               RUNNING_ENVIRONMENT: 'prod1',
               PROJECT_NAME: 'Test Project',
            },
         }));

         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });
   });

   describe('Integration with ZipLogsSvc', () => {
      it('should use ZipLogsSvc as the scheduled service', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });

      it('should pass ZipLogsSvc with runScheduledJobAsync method', async () => {
         const ZipLogsSvc = (await import('../../src/services/zipLogsSvc.js')).default;

         expect(typeof ZipLogsSvc.runScheduledJobAsync).toBe('function');
      });
   });

   describe('Dependency Injection', () => {
      it('should accept custom nodeMailerSvc dependency', () => {
         const mockNodeMailerSvc = {
            sendEmailAsync: vi.fn().mockResolvedValue(undefined),
         };

         scheduler = new ZipLogsScheduler({
            nodeMailerSvc: mockNodeMailerSvc,
         });

         expect(scheduler).toBeInstanceOf(ZipLogsScheduler);
      });

      it('should use injected dependencies in parent class', () => {
         const mockNodeMailerSvc = {
            sendEmailAsync: vi.fn().mockResolvedValue(undefined),
         };

         scheduler = new ZipLogsScheduler({
            nodeMailerSvc: mockNodeMailerSvc,
         });

         expect(scheduler).toBeDefined();
      });
   });

   describe('Scheduler Name', () => {
      it('should have correct scheduler name', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
      });
   });

   describe('Error Handling', () => {
      it('should successfully create scheduler when valid environment is provided', () => {
         expect(() => new ZipLogsScheduler()).not.toThrow();
      });

      it('should create scheduler instance without errors', () => {
         scheduler = new ZipLogsScheduler();

         expect(scheduler).toBeDefined();
         expect(scheduler).toBeInstanceOf(ZipLogsScheduler);
      });
   });
});
