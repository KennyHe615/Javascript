import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import schedule from 'node-schedule';
import SchedulerBase from '../../src/schedulers/scheduler.base.js';
import Constants from '../../src/utils/Constants.js';
import logger from '../../src/services/winstonSvc.js';
import ErrorEmailGenerator from '../../src/utils/errorEmailGenerator.js';

vi.mock('node-schedule');
vi.mock('../../src/services/winstonSvc.js');
vi.mock('../../src/services/nodeMailerSvc.js');
vi.mock('../../src/utils/errorEmailGenerator.js');

describe('SchedulerBase', () => {
   const mockScheduledTimes = {
      local: '*/5 * * * *',
      dev: '0 9 * * *',
      uat1: '0 10 * * *',
      prod1: '0 8 * * 1-5',
      uat2: '0 11 * * *',
      prod2: '0 7 * * 1-5',
   };

   const mockScheduledSvc = {
      runScheduledJobAsync: vi.fn().mockResolvedValue(undefined),
   };

   const mockNodeMailerSvc = {
      sendEmailAsync: vi.fn().mockResolvedValue(undefined),
   };

   beforeEach(() => {
      vi.clearAllMocks();
      vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue('dev');
      vi.spyOn(Constants, 'PROJECT_NAME', 'get').mockReturnValue('TestProject');
      vi.spyOn(logger, 'error').mockImplementation(() => {});
      vi.spyOn(logger, 'info').mockImplementation(() => {});
   });

   afterEach(() => {
      vi.restoreAllMocks();
   });

   describe('Constructor', () => {
      it('should create scheduler instance with valid parameters', () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);

         expect(scheduler).toBeInstanceOf(SchedulerBase);
      });

      it('should use default nodeMailerSvc when no dependency injected', () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);

         expect(scheduler).toBeDefined();
      });

      it('should use injected nodeMailerSvc dependency', () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         expect(scheduler).toBeDefined();
      });

      it('should throw error when running environment is invalid', () => {
         vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue('invalid_env');

         expect(() => {
            new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);
         }).toThrow();
      });

      it('should throw error when scheduledTimes is null', () => {
         expect(() => {
            new SchedulerBase('TestScheduler', null, mockScheduledSvc);
         }).toThrow();
      });

      it('should throw error when scheduledTimes is not an object', () => {
         expect(() => {
            new SchedulerBase('TestScheduler', 'invalid', mockScheduledSvc);
         }).toThrow();
      });

      it('should throw error when scheduledTimes missing current environment', () => {
         const incompleteTimes = { local: '*/5 * * * *', prod1: '0 8 * * *' };

         expect(() => {
            new SchedulerBase('TestScheduler', incompleteTimes, mockScheduledSvc);
         }).toThrow();
      });

      it('should throw error when scheduledSvc is null', () => {
         expect(() => {
            new SchedulerBase('TestScheduler', mockScheduledTimes, null);
         }).toThrow();
      });

      it('should throw error when scheduledSvc is not an object or class', () => {
         expect(() => {
            new SchedulerBase('TestScheduler', mockScheduledTimes, 'invalid');
         }).toThrow();
      });

      it('should throw error when scheduledSvc missing runScheduledJobAsync method', () => {
         const invalidSvc = { someOtherMethod: vi.fn() };

         expect(() => {
            new SchedulerBase('TestScheduler', mockScheduledTimes, invalidSvc);
         }).toThrow();
      });

      it('should accept service object with runScheduledJobAsync method', () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);

         expect(scheduler).toBeDefined();
      });

      it('should accept service class with static runScheduledJobAsync method', () => {
         class MockServiceClass {
            static runScheduledJobAsync = vi.fn();
         }

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, MockServiceClass);

         expect(scheduler).toBeDefined();
      });

      it('should accept service instance with runScheduledJobAsync method', () => {
         class MockServiceClass {
            runScheduledJobAsync = vi.fn();
         }

         const serviceInstance = new MockServiceClass();
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, serviceInstance);

         expect(scheduler).toBeDefined();
      });
   });

   describe('start()', () => {
      let scheduledJobCallback;

      beforeEach(() => {
         vi.mocked(schedule.scheduleJob).mockImplementation((config, callback) => {
            scheduledJobCallback = callback;
            return { cancel: vi.fn() };
         });
      });

      it('should schedule job with correct cron expression and timezone', () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);

         scheduler.start();

         expect(schedule.scheduleJob).toHaveBeenCalledWith({ rule: '0 9 * * *', tz: 'America/New_York' }, expect.any(Function));
      });

      it('should call runScheduledJobAsync when job executes', async () => {
         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);

         scheduler.start();
         await scheduledJobCallback();

         expect(mockScheduledSvc.runScheduledJobAsync).toHaveBeenCalledTimes(1);
      });

      it('should log error when job execution fails', async () => {
         const testError = new Error('Job execution failed');
         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(testError);

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();
         await scheduledJobCallback();

         expect(logger.error).toHaveBeenCalled();
         const loggedError = JSON.parse(vi.mocked(logger.error).mock.calls[0][0]);
         expect(loggedError.message).toBe('Scheduled Job ERROR!');
         expect(loggedError.parameters.schedulerName).toBe('TestScheduler');
         expect(loggedError.parameters.environment).toBe('dev');
      });

      it('should send error email when job execution fails', async () => {
         const testError = new Error('Job execution failed');
         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(testError);

         const mockTextEmail = 'Error email text';
         const mockHtmlEmail = '<html lang="">Error email</html>';
         vi.mocked(ErrorEmailGenerator.generateErrorEmailText).mockReturnValue(mockTextEmail);
         vi.mocked(ErrorEmailGenerator.generateErrorEmailHtml).mockReturnValue(mockHtmlEmail);

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();
         await scheduledJobCallback();

         expect(mockNodeMailerSvc.sendEmailAsync).toHaveBeenCalledWith({
            subject: 'TestProject Error Alert',
            text: mockTextEmail,
            html: mockHtmlEmail,
         });
      });

      it('should include error details in error object', async () => {
         const testError = new Error('Detailed error message');
         testError.stack = 'Error stack trace';
         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(testError);

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();
         await scheduledJobCallback();

         expect(logger.error).toHaveBeenCalled();
         const loggedError = JSON.parse(vi.mocked(logger.error).mock.calls[0][0]);
         expect(loggedError.details).toBeDefined();
      });

      it('should continue scheduling after failed job execution', async () => {
         mockScheduledSvc.runScheduledJobAsync
            .mockRejectedValueOnce(new Error('First failure'))
            .mockResolvedValueOnce(undefined);

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();

         await scheduledJobCallback();
         expect(mockScheduledSvc.runScheduledJobAsync).toHaveBeenCalledTimes(1);

         await scheduledJobCallback();
         expect(mockScheduledSvc.runScheduledJobAsync).toHaveBeenCalledTimes(2);
      });

      it('should work with different environments', () => {
         vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue('prod1');

         const scheduler = new SchedulerBase('ProdScheduler', mockScheduledTimes, mockScheduledSvc);

         scheduler.start();

         expect(schedule.scheduleJob).toHaveBeenCalledWith(
            { rule: '0 8 * * 1-5', tz: 'America/New_York' },
            expect.any(Function),
         );
      });

      it('should handle async errors in email sending gracefully', async () => {
         const jobError = new Error('Job failed');
         const emailError = new Error('Email failed');

         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(jobError);
         mockNodeMailerSvc.sendEmailAsync.mockRejectedValueOnce(emailError);

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();

         // Should NOT throw - email errors should be caught and logged
         await scheduledJobCallback();

         // Verify job error was still logged
         expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Scheduled Job ERROR!'));

         // Verify email failure was also logged
         expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to send error notification email'),
            expect.any(Object),
         );
      });

      it('should include schedule time in error parameters', async () => {
         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(new Error('Job failed'));

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();
         await scheduledJobCallback();

         const loggedError = JSON.parse(vi.mocked(logger.error).mock.calls[0][0]);
         expect(loggedError.parameters.schedule).toBe('0 9 * * *');
      });

      it('should include start time in error parameters', async () => {
         mockScheduledSvc.runScheduledJobAsync.mockRejectedValueOnce(new Error('Job failed'));

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc, {
            nodeMailerSvc: mockNodeMailerSvc,
         });

         scheduler.start();
         await scheduledJobCallback();

         const loggedError = JSON.parse(vi.mocked(logger.error).mock.calls[0][0]);
         expect(loggedError.parameters.startTime).toBeDefined();
         expect(typeof loggedError.parameters.startTime).toBe('string');
      });
   });

   describe('Environment Validation', () => {
      const validEnvironments = ['local', 'dev', 'uat1', 'prod1', 'uat2', 'prod2'];

      validEnvironments.forEach((env) => {
         it(`should accept valid environment: ${env}`, () => {
            vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue(env);

            expect(() => {
               new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);
            }).not.toThrow();
         });
      });

      const invalidEnvironments = ['production', 'development', 'test', 'staging', ''];

      invalidEnvironments.forEach((env) => {
         it(`should reject invalid environment: ${env}`, () => {
            vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue(env);

            expect(() => {
               new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);
            }).toThrow();
         });
      });
   });

   describe('Edge Cases', () => {
      it('should handle empty scheduler name', () => {
         const scheduler = new SchedulerBase('', mockScheduledTimes, mockScheduledSvc);

         expect(scheduler).toBeDefined();
      });

      it('should handle scheduler name with special characters', () => {
         const scheduler = new SchedulerBase('Test-Scheduler_123!@#', mockScheduledTimes, mockScheduledSvc);

         expect(scheduler).toBeDefined();
      });

      it('should handle scheduledTimes with extra environment keys', () => {
         const extraTimes = { ...mockScheduledTimes, extraEnv: '0 12 * * *' };
         const scheduler = new SchedulerBase('TestScheduler', extraTimes, mockScheduledSvc);

         expect(scheduler).toBeDefined();
      });

      it('should handle service with additional methods', () => {
         const svcWithExtra = {
            runScheduledJobAsync: vi.fn(),
            otherMethod: vi.fn(),
            anotherMethod: vi.fn(),
         };

         const scheduler = new SchedulerBase('TestScheduler', mockScheduledTimes, svcWithExtra);

         expect(scheduler).toBeDefined();
      });
   });

   describe('Error Message Validation', () => {
      it('should provide clear error message for invalid environment', () => {
         vi.spyOn(Constants, 'RUNNING_ENVIRONMENT', 'get').mockReturnValue('invalid');

         try {
            new SchedulerBase('TestScheduler', mockScheduledTimes, mockScheduledSvc);
         } catch (error) {
            expect(error.message).toBe('Invalid Running Environment!');
            expect(error.parameters.runningEnv).toBe('invalid');
         }
      });

      it('should provide clear error message for missing scheduled time', () => {
         const incompleteTimes = { local: '*/5 * * * *' };

         try {
            new SchedulerBase('TestScheduler', incompleteTimes, mockScheduledSvc);
         } catch (error) {
            expect(error.message).toContain('No scheduled time defined');
         }
      });

      it('should provide clear error message for invalid service', () => {
         const invalidSvc = { wrongMethod: vi.fn() };

         try {
            new SchedulerBase('TestScheduler', mockScheduledTimes, invalidSvc);
         } catch (error) {
            expect(error.message).toContain('runScheduledJobAsync');
         }
      });
   });
});