import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WinstonSvc } from '../../src/services/winstonSvc.js';
import WinstonFactory from '../../src/factories/winstonFactory.js';

vi.mock('../../src/factories/winstonFactory.js', () => ({
   default: {
      getInstance: vi.fn(),
   },
}));

describe('WinstonSvc', () => {
   let mockLogger;
   let winstonSvc;

   beforeEach(() => {
      mockLogger = {
         info: vi.fn(),
         warn: vi.fn(),
         error: vi.fn(),
         debug: vi.fn(),
         child: vi.fn(),
      };

      WinstonFactory.getInstance.mockReturnValue(mockLogger);
      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('Constructor', () => {
      it('should create instance with factory logger when no instance provided', () => {
         winstonSvc = new WinstonSvc();

         expect(WinstonFactory.getInstance).toHaveBeenCalledTimes(1);
         expect(winstonSvc).toBeInstanceOf(WinstonSvc);
      });

      it('should use provided logger instance', () => {
         const customLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         winstonSvc = new WinstonSvc(customLogger);

         expect(WinstonFactory.getInstance).not.toHaveBeenCalled();
         expect(winstonSvc).toBeInstanceOf(WinstonSvc);
      });

      it('should prefer provided instance over factory', () => {
         const customLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

         winstonSvc = new WinstonSvc(customLogger);

         winstonSvc.info('test');

         expect(customLogger.info).toHaveBeenCalledWith('test', {});
         expect(mockLogger.info).not.toHaveBeenCalled();
      });
   });

   describe('Logging Methods', () => {
      beforeEach(() => {
         winstonSvc = new WinstonSvc(mockLogger);
      });

      describe('info()', () => {
         it('should log info message without metadata', () => {
            winstonSvc.info('Test info message');

            expect(mockLogger.info).toHaveBeenCalledTimes(1);
            expect(mockLogger.info).toHaveBeenCalledWith('Test info message', {});
         });

         it('should log info message with metadata', () => {
            const meta = { userId: 123, action: 'login' };

            winstonSvc.info('User logged in', meta);

            expect(mockLogger.info).toHaveBeenCalledWith('User logged in', meta);
         });

         it('should handle empty metadata object', () => {
            winstonSvc.info('Message with empty meta', {});

            expect(mockLogger.info).toHaveBeenCalledWith('Message with empty meta', {});
         });

         it('should use default empty object for metadata when not provided', () => {
            winstonSvc.info('Message without meta');

            expect(mockLogger.info).toHaveBeenCalledWith('Message without meta', {});
         });
      });

      describe('warn()', () => {
         it('should log warning message without metadata', () => {
            winstonSvc.warn('Test warning');

            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', {});
         });

         it('should log warning message with metadata', () => {
            const meta = { threshold: 90, current: 95 };

            winstonSvc.warn('Threshold exceeded', meta);

            expect(mockLogger.warn).toHaveBeenCalledWith('Threshold exceeded', meta);
         });

         it('should handle complex metadata', () => {
            const meta = { data: { nested: { value: 123 } } };

            winstonSvc.warn('Complex warning', meta);

            expect(mockLogger.warn).toHaveBeenCalledWith('Complex warning', meta);
         });
      });

      describe('error()', () => {
         it('should log error message without metadata', () => {
            winstonSvc.error('Test error');

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith('Test error', {});
         });

         it('should log error message with metadata', () => {
            const meta = { errorCode: 'E001', service: 'auth' };

            winstonSvc.error('Authentication failed', meta);

            expect(mockLogger.error).toHaveBeenCalledWith('Authentication failed', meta);
         });

         it('should handle error with stack trace in metadata', () => {
            const meta = { stack: 'Error stack trace...' };

            winstonSvc.error('Error occurred', meta);

            expect(mockLogger.error).toHaveBeenCalledWith('Error occurred', meta);
         });
      });

      describe('debug()', () => {
         it('should log debug message without metadata', () => {
            winstonSvc.debug('Debug info');

            expect(mockLogger.debug).toHaveBeenCalledTimes(1);
            expect(mockLogger.debug).toHaveBeenCalledWith('Debug info', {});
         });

         it('should log debug message with metadata', () => {
            const meta = { requestId: 'req-123', duration: 245 };

            winstonSvc.debug('Request completed', meta);

            expect(mockLogger.debug).toHaveBeenCalledWith('Request completed', meta);
         });

         it('should handle debug with array metadata', () => {
            const meta = { items: [1, 2, 3], count: 3 };

            winstonSvc.debug('Array data', meta);

            expect(mockLogger.debug).toHaveBeenCalledWith('Array data', meta);
         });
      });
   });

   describe('child()', () => {
      beforeEach(() => {
         winstonSvc = new WinstonSvc(mockLogger);
      });

      it('should create child logger with context', () => {
         const childMockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         mockLogger.child.mockReturnValue(childMockLogger);

         const options = { requestId: 'req-123', userId: 456 };
         const childLogger = winstonSvc.child(options);

         expect(mockLogger.child).toHaveBeenCalledWith(options);
         expect(childLogger).toBeInstanceOf(WinstonSvc);
      });

      it('should return WinstonSvc instance wrapping child logger', () => {
         const childMockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         mockLogger.child.mockReturnValue(childMockLogger);

         const childLogger = winstonSvc.child({ requestId: 'req-123' });

         childLogger.info('Test message');

         expect(childMockLogger.info).toHaveBeenCalledWith('Test message', {});
         expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('should allow multiple levels of child loggers', () => {
         const childMockLogger1 = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            child: vi.fn(),
         };

         const childMockLogger2 = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         mockLogger.child.mockReturnValue(childMockLogger1);
         childMockLogger1.child.mockReturnValue(childMockLogger2);

         const childLogger1 = winstonSvc.child({ requestId: 'req-123' });
         const childLogger2 = childLogger1.child({ userId: 456 });

         childLogger2.info('Nested log');

         expect(mockLogger.child).toHaveBeenCalledWith({ requestId: 'req-123' });
         expect(childMockLogger1.child).toHaveBeenCalledWith({ userId: 456 });
         expect(childMockLogger2.info).toHaveBeenCalledWith('Nested log', {});
      });

      it('should handle empty options object', () => {
         const childMockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         mockLogger.child.mockReturnValue(childMockLogger);

         const childLogger = winstonSvc.child({});

         expect(mockLogger.child).toHaveBeenCalledWith({});
         expect(childLogger).toBeInstanceOf(WinstonSvc);
      });

      it('should create child with multiple context properties', () => {
         const childMockLogger = {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
         };

         mockLogger.child.mockReturnValue(childMockLogger);

         const options = {
            requestId: 'req-789',
            userId: 101,
            sessionId: 'sess-abc',
            ip: '192.168.1.1',
         };

         winstonSvc.child(options);

         expect(mockLogger.child).toHaveBeenCalledWith(options);
      });
   });

   describe('Integration - Singleton Logger', () => {
      it('should export default singleton instance', async () => {
         const { default: logger } = await import('../../src/services/winstonSvc.js');

         expect(logger).toBeInstanceOf(WinstonSvc);
      });

      it('should export WinstonSvc class for DI', async () => {
         const { WinstonSvc: ExportedClass } = await import('../../src/services/winstonSvc.js');

         expect(ExportedClass).toBe(WinstonSvc);
      });
   });

   describe('Message and Metadata Handling', () => {
      beforeEach(() => {
         winstonSvc = new WinstonSvc(mockLogger);
      });

      it('should handle string messages', () => {
         winstonSvc.info('Simple string');

         expect(mockLogger.info).toHaveBeenCalledWith('Simple string', {});
      });

      it('should handle messages with special characters', () => {
         const message = 'Test\n\t\r\\"special" chars';

         winstonSvc.info(message);

         expect(mockLogger.info).toHaveBeenCalledWith(message, {});
      });

      it('should handle very long messages', () => {
         const longMessage = 'A'.repeat(5000);

         winstonSvc.info(longMessage);

         expect(mockLogger.info).toHaveBeenCalledWith(longMessage, {});
      });

      it('should handle metadata with date objects', () => {
         const meta = { timestamp: new Date('2025-01-01'), event: 'test' };

         winstonSvc.info('Event logged', meta);

         expect(mockLogger.info).toHaveBeenCalledWith('Event logged', meta);
      });

      it('should handle metadata with null values', () => {
         const meta = { value: null, active: false };

         winstonSvc.warn('Null value', meta);

         expect(mockLogger.warn).toHaveBeenCalledWith('Null value', meta);
      });

      it('should handle metadata with undefined values', () => {
         const meta = { value: undefined, key: 'test' };

         winstonSvc.debug('Undefined value', meta);

         expect(mockLogger.debug).toHaveBeenCalledWith('Undefined value', meta);
      });
   });

   describe('Concurrent Logging', () => {
      beforeEach(() => {
         winstonSvc = new WinstonSvc(mockLogger);
      });

      it('should handle concurrent logging calls', () => {
         winstonSvc.info('Message 1');
         winstonSvc.warn('Message 2');
         winstonSvc.error('Message 3');
         winstonSvc.debug('Message 4');

         expect(mockLogger.info).toHaveBeenCalledTimes(1);
         expect(mockLogger.warn).toHaveBeenCalledTimes(1);
         expect(mockLogger.error).toHaveBeenCalledTimes(1);
         expect(mockLogger.debug).toHaveBeenCalledTimes(1);
      });

      it('should handle multiple calls to same log level', () => {
         winstonSvc.info('First info');
         winstonSvc.info('Second info');
         winstonSvc.info('Third info');

         expect(mockLogger.info).toHaveBeenCalledTimes(3);
         expect(mockLogger.info).toHaveBeenNthCalledWith(1, 'First info', {});
         expect(mockLogger.info).toHaveBeenNthCalledWith(2, 'Second info', {});
         expect(mockLogger.info).toHaveBeenNthCalledWith(3, 'Third info', {});
      });
   });

   describe('Method Call Verification', () => {
      beforeEach(() => {
         winstonSvc = new WinstonSvc(mockLogger);
      });

      it('should not call other log levels when logging info', () => {
         winstonSvc.info('Info message');

         expect(mockLogger.info).toHaveBeenCalled();
         expect(mockLogger.warn).not.toHaveBeenCalled();
         expect(mockLogger.error).not.toHaveBeenCalled();
         expect(mockLogger.debug).not.toHaveBeenCalled();
      });

      it('should not call other log levels when logging warn', () => {
         winstonSvc.warn('Warning message');

         expect(mockLogger.warn).toHaveBeenCalled();
         expect(mockLogger.info).not.toHaveBeenCalled();
         expect(mockLogger.error).not.toHaveBeenCalled();
         expect(mockLogger.debug).not.toHaveBeenCalled();
      });

      it('should not call other log levels when logging error', () => {
         winstonSvc.error('Error message');

         expect(mockLogger.error).toHaveBeenCalled();
         expect(mockLogger.info).not.toHaveBeenCalled();
         expect(mockLogger.warn).not.toHaveBeenCalled();
         expect(mockLogger.debug).not.toHaveBeenCalled();
      });

      it('should not call other log levels when logging debug', () => {
         winstonSvc.debug('Debug message');

         expect(mockLogger.debug).toHaveBeenCalled();
         expect(mockLogger.info).not.toHaveBeenCalled();
         expect(mockLogger.warn).not.toHaveBeenCalled();
         expect(mockLogger.error).not.toHaveBeenCalled();
      });
   });
});
