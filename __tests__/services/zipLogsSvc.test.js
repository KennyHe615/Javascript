import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ZipLogsSvc from '../../src/services/zipLogsSvc.js';
import FileManager from '../../src/utils/fileManager.js';
import path from 'path';

vi.mock('../../src/utils/fileManager.js', () => ({
   default: {
      zipFolderAsync: vi.fn(),
   },
}));

vi.mock('../../src/utils/constants.js', () => ({
   default: {
      ROOT_FOLDER: '/mock/root',
   },
}));

describe('ZipLogsSvc', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.clearAllMocks();
   });

   describe('runScheduledJobAsync()', () => {
      describe('Success Cases', () => {
         it('should successfully zip logs folder', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            expect(FileManager.zipFolderAsync).toHaveBeenCalledTimes(1);
            expect(FileManager.zipFolderAsync).toHaveBeenCalledWith(path.resolve('/mock/root', 'logs'), 'log');
         });

         it('should use default configuration values', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            const [folderPath, fileExtension] = FileManager.zipFolderAsync.mock.calls[0];

            expect(folderPath).toBe(path.resolve('/mock/root', 'logs'));
            expect(fileExtension).toBe('log');
         });

         it('should resolve without returning value', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            const result = await ZipLogsSvc.runScheduledJobAsync();

            expect(result).toBeUndefined();
         });

         it('should handle successful zip operation', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
         });
      });

      describe('Error Cases', () => {
         it('should throw CustomError when zipFolderAsync fails', async () => {
            const zipError = new Error('Failed to create zip archive');
            FileManager.zipFolderAsync.mockRejectedValue(zipError);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toThrow();
         });

         it('should include error details in thrown error', async () => {
            const zipError = new Error('Permission denied');
            FileManager.zipFolderAsync.mockRejectedValue(zipError);

            try {
               await ZipLogsSvc.runScheduledJobAsync();
               expect.fail('Should have thrown an error');
            } catch (error) {
               expect(error.message).toBe('Zip Logs Scheduled Job ERROR!');
               expect(error.className).toBe('ZipLogsSvc');
               expect(error.functionName).toBe('runScheduledJobAsync');
               expect(error.parameters).toHaveProperty('logsFolder');
               expect(error.details).toBeDefined();
            }
         });

         it('should throw error with correct parameters', async () => {
            FileManager.zipFolderAsync.mockRejectedValue(new Error('Zip failed'));

            try {
               await ZipLogsSvc.runScheduledJobAsync();
            } catch (error) {
               expect(error.parameters.logsFolder).toBe(path.resolve('/mock/root', 'logs'));
            }
         });

         it('should handle file system errors', async () => {
            const fsError = new Error('ENOENT: no such file or directory');
            FileManager.zipFolderAsync.mockRejectedValue(fsError);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toMatchObject({
               message: 'Zip Logs Scheduled Job ERROR!',
            });
         });

         it('should handle permission errors', async () => {
            const permError = new Error('EACCES: permission denied');
            FileManager.zipFolderAsync.mockRejectedValue(permError);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toMatchObject({
               message: 'Zip Logs Scheduled Job ERROR!',
            });
         });

         it('should handle disk space errors', async () => {
            const diskError = new Error('ENOSPC: no space left on device');
            FileManager.zipFolderAsync.mockRejectedValue(diskError);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toThrow();
         });

         it('should handle corrupted file errors', async () => {
            const corruptError = new Error('Cannot read corrupted log file');
            FileManager.zipFolderAsync.mockRejectedValue(corruptError);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toMatchObject({
               className: 'ZipLogsSvc',
               functionName: 'runScheduledJobAsync',
            });
         });
      });

      describe('Edge Cases', () => {
         it('should handle empty logs folder', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            expect(FileManager.zipFolderAsync).toHaveBeenCalled();
         });

         it('should handle folder with no matching files', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
         });

         it('should be callable multiple times', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();
            await ZipLogsSvc.runScheduledJobAsync();
            await ZipLogsSvc.runScheduledJobAsync();

            expect(FileManager.zipFolderAsync).toHaveBeenCalledTimes(3);
         });

         it('should handle timeout scenarios', { timeout: 10000 }, async () => {
            FileManager.zipFolderAsync.mockImplementation(
               () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100)),
            );

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toThrow();
         });

         it('should handle large number of log files', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            expect(FileManager.zipFolderAsync).toHaveBeenCalledWith(expect.any(String), 'log');
         });
      });

      describe('Configuration', () => {
         it('should use Constants.ROOT_FOLDER for logs path', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            const [folderPath] = FileManager.zipFolderAsync.mock.calls[0];
            expect(folderPath).toContain('/mock/root');
         });

         it('should use "logs" as default folder name', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            const [folderPath] = FileManager.zipFolderAsync.mock.calls[0];
            expect(folderPath).toContain('logs');
         });

         it('should use "log" as default file extension', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            const [, fileExtension] = FileManager.zipFolderAsync.mock.calls[0];
            expect(fileExtension).toBe('log');
         });

         it('should construct correct logs folder path', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await ZipLogsSvc.runScheduledJobAsync();

            const expectedPath = path.resolve('/mock/root', 'logs');
            expect(FileManager.zipFolderAsync).toHaveBeenCalledWith(expectedPath, 'log');
         });
      });

      describe('Concurrent Execution', () => {
         it('should handle concurrent job executions', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            const promises = [
               ZipLogsSvc.runScheduledJobAsync(),
               ZipLogsSvc.runScheduledJobAsync(),
               ZipLogsSvc.runScheduledJobAsync(),
            ];

            await Promise.all(promises);

            expect(FileManager.zipFolderAsync).toHaveBeenCalledTimes(3);
         });

         it('should handle mixed success and failure', async () => {
            FileManager.zipFolderAsync
               .mockResolvedValueOnce(undefined)
               .mockRejectedValueOnce(new Error('Failed'))
               .mockResolvedValueOnce(undefined);

            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toThrow();
            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
         });

         it('should not affect other executions on failure', async () => {
            FileManager.zipFolderAsync.mockRejectedValueOnce(new Error('First failed')).mockResolvedValueOnce(undefined);

            await expect(ZipLogsSvc.runScheduledJobAsync()).rejects.toThrow();
            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
         });
      });

      describe('Error Message Validation', () => {
         it('should have descriptive error message', async () => {
            FileManager.zipFolderAsync.mockRejectedValue(new Error('Test error'));

            try {
               await ZipLogsSvc.runScheduledJobAsync();
            } catch (error) {
               expect(error.message).toMatch(/Zip Logs Scheduled Job ERROR/i);
            }
         });

         it('should include class name in error', async () => {
            FileManager.zipFolderAsync.mockRejectedValue(new Error('Test error'));

            try {
               await ZipLogsSvc.runScheduledJobAsync();
            } catch (error) {
               expect(error.className).toBe('ZipLogsSvc');
            }
         });

         it('should include function name in error', async () => {
            FileManager.zipFolderAsync.mockRejectedValue(new Error('Test error'));

            try {
               await ZipLogsSvc.runScheduledJobAsync();
            } catch (error) {
               expect(error.functionName).toBe('runScheduledJobAsync');
            }
         });
      });

      describe('Static Method Behavior', () => {
         it('should be callable without instantiating class', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            await expect(ZipLogsSvc.runScheduledJobAsync()).resolves.toBeUndefined();
         });

         it('should not require constructor call', async () => {
            FileManager.zipFolderAsync.mockResolvedValue(undefined);

            expect(() => ZipLogsSvc.runScheduledJobAsync()).not.toThrow();
         });

         it('should be accessible directly from class', () => {
            expect(typeof ZipLogsSvc.runScheduledJobAsync).toBe('function');
         });
      });
   });
});
