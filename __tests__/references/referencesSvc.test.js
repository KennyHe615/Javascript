import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReferencesSvc } from '../../src/references/referencesSvc.js';
import logger from '../../src/services/winstonSvc.js';

// Mock the logger to prevent console output during tests
vi.mock('../../src/services/winstonSvc.js', () => ({
   default: {
      info: vi.fn(),
      error: vi.fn(),
   },
}));

describe('ReferencesSvc', () => {
   let mockQueueSvc;
   let referencesSvc;

   beforeEach(() => {
      vi.clearAllMocks();

      // Create a mock for the queueSvc dependency
      mockQueueSvc = {
         runAsync: vi.fn(),
      };

      // Inject the mock dependency
      referencesSvc = new ReferencesSvc({
         queueSvc: mockQueueSvc,
      });
   });

   it('should successfully complete the scheduled job', async () => {
      // Arrange
      mockQueueSvc.runAsync.mockResolvedValue(true);

      // Act
      await referencesSvc.runScheduledJobAsync();

      // Assert
      expect(mockQueueSvc.runAsync).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduled job STARTED'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduled job COMPLETED'));
   });

   it('should throw a CustomError when the queue service fails', async () => {
      // Arrange
      const originalError = new Error('API Timeout');
      mockQueueSvc.runAsync.mockRejectedValue(originalError);

      // Act & Assert
      let caughtError;
      try {
         await referencesSvc.runScheduledJobAsync();
      } catch (err) {
         caughtError = err;
      }

      // Assertions on the caught error object
      expect(caughtError).toBeDefined();
      expect(caughtError.message).toBe('References Scheduled Job ERROR!');
      expect(caughtError.className).toBe('ReferencesSvc');
      // Since 'details' in CustomError returns the message of the wrapped error
      // if it's a standard Error object (Pattern 2 in your CustomError.js)
      expect(caughtError.details).toBe('API Timeout');

      expect(mockQueueSvc.runAsync).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Scheduled job STARTED'));
      expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Scheduled job COMPLETED'));
   });

   it('should use the default singleton if no dependencies are provided', () => {
      const defaultSvc = new ReferencesSvc();
      // Verifying that it initializes without crashing
      expect(defaultSvc).toBeDefined();
   });
});
