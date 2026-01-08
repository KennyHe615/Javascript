import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { setTimeout } from 'timers/promises';
import FileManager from '../../src/utils/fileManager.js';

vi.mock('fs/promises');
vi.mock('timers/promises');
vi.mock('dayjs', () => ({
   default: function dayjs() {
      return {
         subtract: function () {
            return this;
         },
         format: function () {
            return '2024-01';
         },
      };
   },
}));
vi.mock('adm-zip', () => ({
   default: class AdmZip {
      constructor() {
         this.addLocalFile = vi.fn();
         this.writeZip = vi.fn();
      }
   },
}));
vi.mock('../../src/services/winstonSvc.js', () => ({
   default: {
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
   },
}));

describe('FileManager', () => {
   beforeEach(() => {
      vi.clearAllMocks();
   });

   afterEach(() => {
      vi.restoreAllMocks();
   });

   describe('getFileListAsync', () => {
      it('should return list of files from directory', async () => {
         const mockFiles = ['file1.txt', 'file2.json', 'file3.log'];
         fs.readdir.mockResolvedValue(mockFiles);

         const result = await FileManager.getFileListAsync('/test/folder');

         expect(fs.readdir).toHaveBeenCalledWith('/test/folder');
         expect(result).toEqual(mockFiles);
      });

      it('should throw error when folderPath is not a string', async () => {
         await expect(FileManager.getFileListAsync(123)).rejects.toMatchObject({
            message: 'Invalid folderPath: must be a non-empty string',
            className: 'FileManager',
            functionName: '#validateString',
         });
      });

      it('should throw error when folderPath is empty string', async () => {
         await expect(FileManager.getFileListAsync('   ')).rejects.toMatchObject({
            message: 'Invalid folderPath: must be a non-empty string',
         });
      });

      it('should throw error when readdir fails', async () => {
         fs.readdir.mockRejectedValue(new Error('Permission denied'));

         await expect(FileManager.getFileListAsync('/test/folder')).rejects.toMatchObject({
            message: 'Getting File List ERROR!',
            className: 'FileManager',
            functionName: 'getFileListAsync',
         });
      });
   });

   describe('doesPathExistAsync', () => {
      it('should return true when file exists', async () => {
         fs.access.mockResolvedValue(undefined);

         const result = await FileManager.doesPathExistAsync('/test/file.txt');

         expect(fs.access).toHaveBeenCalledWith('/test/file.txt');
         expect(result).toBe(true);
      });

      it('should return true when path with extension exists', async () => {
         fs.access.mockResolvedValue(undefined);

         const result = await FileManager.doesPathExistAsync('/test/file', 'json');

         expect(fs.access).toHaveBeenCalledWith('/test/file.json');
         expect(result).toBe(true);
      });

      it('should return false when file does not exist', async () => {
         const error = new Error('File not found');
         error.code = 'ENOENT';
         fs.access.mockRejectedValue(error);

         const result = await FileManager.doesPathExistAsync('/test/file.txt');

         expect(result).toBe(false);
      });

      it('should throw error for non-ENOENT errors', async () => {
         const error = new Error('Permission denied');
         error.code = 'EACCES';
         fs.access.mockRejectedValue(error);

         await expect(FileManager.doesPathExistAsync('/test/file.txt')).rejects.toMatchObject({
            message: 'Checking Path Existence ERROR!',
            className: 'FileManager',
            functionName: 'doesPathExistAsync',
         });
      });

      it('should throw error when filePath is not a string', async () => {
         await expect(FileManager.doesPathExistAsync(null)).rejects.toMatchObject({
            message: 'Invalid filePath: must be a non-empty string',
         });
      });
   });

   describe('readFileAsync', () => {
      it('should read and return JSON file content', async () => {
         const mockData = { key: 'value' };
         fs.readFile.mockResolvedValue(JSON.stringify(mockData));

         const result = await FileManager.readFileAsync('/test/file', 'json');

         expect(fs.readFile).toHaveBeenCalledWith('/test/file.json', 'utf-8');
         expect(result).toEqual(mockData);
      });

      it('should read and return TXT file content', async () => {
         const mockData = 'text content';
         fs.readFile.mockResolvedValue(mockData);

         const result = await FileManager.readFileAsync('/test/file', 'txt');

         expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
         expect(result).toBe(mockData);
      });

      it('should create JSON file with empty object if not found', async () => {
         const error = new Error('File not found');
         error.code = 'ENOENT';
         fs.readFile.mockRejectedValueOnce(error);
         fs.open.mockResolvedValue({
            writeFile: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
         });
         fs.mkdir.mockResolvedValue(undefined);

         const result = await FileManager.readFileAsync('/test/file', 'json');

         expect(result).toEqual({});
      });

      it('should create TXT file with empty string if not found', async () => {
         const error = new Error('File not found');
         error.code = 'ENOENT';
         fs.readFile.mockRejectedValueOnce(error);
         fs.open.mockResolvedValue({
            writeFile: vi.fn().mockResolvedValue(undefined),
            close: vi.fn().mockResolvedValue(undefined),
         });
         fs.mkdir.mockResolvedValue(undefined);

         const result = await FileManager.readFileAsync('/test/file', 'txt');

         expect(result).toBe('');
      });

      it('should handle race condition when file is created by another process', async () => {
         const error = new Error('File not found');
         error.code = 'ENOENT';
         const existsError = new Error('File exists');
         existsError.code = 'EEXIST';

         fs.readFile.mockRejectedValueOnce(error).mockResolvedValueOnce(JSON.stringify({ key: 'value' }));
         fs.open.mockRejectedValue(existsError);

         const result = await FileManager.readFileAsync('/test/file', 'json');

         expect(result).toEqual({ key: 'value' });
      });

      it('should throw error for invalid file extension', async () => {
         await expect(FileManager.readFileAsync('/test/file', 'xml')).rejects.toMatchObject({
            message: 'Invalid File Extension: Only accepting json, txt',
            className: 'FileManager',
            functionName: '#validateExtension',
         });
      });

      it('should throw error when filePath is not a string', async () => {
         await expect(FileManager.readFileAsync(123, 'json')).rejects.toMatchObject({
            message: 'Invalid filePath: must be a non-empty string',
         });
      });

      it('should throw error for non-ENOENT read errors', async () => {
         const error = new Error('Permission denied');
         error.code = 'EACCES';
         fs.readFile.mockRejectedValue(error);

         await expect(FileManager.readFileAsync('/test/file', 'json')).rejects.toMatchObject({
            message: 'Reading File ERROR!',
            className: 'FileManager',
            functionName: 'readFileAsync',
         });
      });

      it('should throw error when write fails during file creation', async () => {
         const readError = new Error('File not found');
         readError.code = 'ENOENT';
         const writeError = new Error('Write failed');
         writeError.code = 'EIO';

         fs.readFile.mockRejectedValueOnce(readError);
         fs.open.mockRejectedValue(writeError);

         try {
            await FileManager.readFileAsync('/test/file', 'json');
            expect.fail('Should have thrown an error');
         } catch (error) {
            expect(error.message).toBe('Writing File Exclusively ERROR!');
            expect(error.className).toBe('FileManager');
            expect(error.functionName).toBe('#writeFileExclusiveAsync');
         }
      });
   });

   describe('createDirectoryAsync', () => {
      it('should create directory recursively', async () => {
         fs.mkdir.mockResolvedValue(undefined);

         await FileManager.createDirectoryAsync('/test/nested/folder');

         expect(fs.mkdir).toHaveBeenCalledWith('/test/nested/folder', { recursive: true });
      });

      it('should throw error when directoryPath is not a string', async () => {
         await expect(FileManager.createDirectoryAsync(null)).rejects.toMatchObject({
            message: 'Invalid directoryPath: must be a non-empty string',
         });
      });

      it('should throw error when mkdir fails', async () => {
         fs.mkdir.mockRejectedValue(new Error('Permission denied'));

         await expect(FileManager.createDirectoryAsync('/test/folder')).rejects.toMatchObject({
            message: 'Creating Directory ERROR!',
            className: 'FileManager',
            functionName: 'createDirectoryAsync',
         });
      });
   });

   describe('writeFileAsync', () => {
      it('should write JSON file with proper formatting', async () => {
         fs.writeFile.mockResolvedValue(undefined);

         const data = { key: 'value', nested: { prop: 123 } };
         await FileManager.writeFileAsync('/test/file', 'json', data);

         expect(fs.writeFile).toHaveBeenCalledWith('/test/file.json', JSON.stringify(data, null, 3), 'utf-8');
      });

      it('should write TXT file', async () => {
         fs.writeFile.mockResolvedValue(undefined);

         const data = 'text content';
         await FileManager.writeFileAsync('/test/file', 'txt', data);

         expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', data, 'utf-8');
      });

      it('should create directory and retry on ENOENT error', async () => {
         const error = new Error('Directory not found');
         error.code = 'ENOENT';
         fs.writeFile.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
         fs.mkdir.mockResolvedValue(undefined);
         setTimeout.mockResolvedValue(undefined);

         await FileManager.writeFileAsync('/test/nested/file', 'json', { key: 'value' });

         expect(fs.mkdir).toHaveBeenCalled();
         expect(setTimeout).toHaveBeenCalledWith(1000);
         expect(fs.writeFile).toHaveBeenCalledTimes(2);
      });

      it('should throw error when all retries fail', async () => {
         const error = new Error('Write failed');
         error.code = 'EIO';
         fs.writeFile.mockRejectedValue(error);

         await expect(FileManager.writeFileAsync('/test/file', 'json', {})).rejects.toMatchObject({
            message: 'Writing File ERROR!',
            className: 'FileManager',
            functionName: '#writeFileWithRetryAsync',
         });
      });

      it('should throw error for invalid extension', async () => {
         await expect(FileManager.writeFileAsync('/test/file', 'pdf', 'data')).rejects.toMatchObject({
            message: 'Invalid File Extension: Only accepting json, txt',
         });
      });

      it('should throw error when filePath is empty', async () => {
         await expect(FileManager.writeFileAsync('', 'json', {})).rejects.toMatchObject({
            message: 'Invalid filePath: must be a non-empty string',
         });
      });
   });

   describe('refactorToTxtFormat', () => {
      it('should convert array of objects to CSV format', () => {
         const payload = [
            { name: 'John', age: 30, city: 'NYC' },
            { name: 'Jane', age: 25, city: 'LA' },
         ];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual(['John,30,NYC', 'Jane,25,LA']);
      });

      it('should escape single quotes', () => {
         const payload = [{ text: "It's great" }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual(["It''s great"]);
      });

      it('should replace newlines with spaces', () => {
         const payload = [{ text: 'Line1\nLine2\nLine3' }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual(['Line1 Line2 Line3']);
      });

      it('should replace commas with spaces', () => {
         const payload = [{ text: 'Hello, World, Test' }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual(['Hello  World  Test']);
      });

      it('should handle null and undefined values as empty strings', () => {
         const payload = [{ a: null, b: undefined, c: 'value' }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual([',,value']);
      });

      it('should convert non-string values to strings', () => {
         const payload = [{ num: 123, bool: true, obj: { nested: 'val' } }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result[0]).toContain('123');
         expect(result[0]).toContain('true');
         expect(result[0]).toContain('[object Object]');
      });

      it('should throw error when payload is not an array', () => {
         expect(() => FileManager.refactorToTxtFormat('not array')).toThrow();
         expect(() => FileManager.refactorToTxtFormat('not array')).toThrowError(/Invalid payload: must be an array/);
      });

      it('should handle empty array', () => {
         const result = FileManager.refactorToTxtFormat([]);

         expect(result).toEqual([]);
      });

      it('should handle complex transformations', () => {
         const payload = [{ text: "It's a test,\nwith everything" }];

         const result = FileManager.refactorToTxtFormat(payload);

         expect(result).toEqual(["It''s a test  with everything"]);
      });
   });

   describe('appendFileAsync', () => {
      it('should append content to file with newlines', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.appendFile.mockResolvedValue(undefined);

         const content = ['line1', 'line2', 'line3'];
         await FileManager.appendFileAsync('/test/file', content);

         expect(fs.appendFile).toHaveBeenCalledWith('/test/file.txt', 'line1\nline2\nline3\n');
      });

      it('should create directory if it does not exist', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.appendFile.mockResolvedValue(undefined);

         await FileManager.appendFileAsync('/test/nested/file', ['content']);

         expect(fs.mkdir).toHaveBeenCalled();
      });

      it('should throw error when fileName is not a string', async () => {
         await expect(FileManager.appendFileAsync(123, [])).rejects.toMatchObject({
            message: 'Invalid fileName: must be a non-empty string',
         });
      });

      it('should throw error when content is not an array', async () => {
         await expect(FileManager.appendFileAsync('/test/file', 'not array')).rejects.toMatchObject({
            message: 'Invalid content: must be an array',
         });
      });

      it('should throw error when append fails', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.appendFile.mockRejectedValue(new Error('Write failed'));

         await expect(FileManager.appendFileAsync('/test/file', ['content'])).rejects.toMatchObject({
            message: 'Appending File ERROR!',
            className: 'FileManager',
            functionName: 'appendFileAsync',
         });
      });

      it('should handle empty content array', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.appendFile.mockResolvedValue(undefined);

         await FileManager.appendFileAsync('/test/file', []);

         expect(fs.appendFile).toHaveBeenCalledWith('/test/file.txt', '');
      });
   });

   describe('deleteFileAsync', () => {
      it('should delete file successfully', async () => {
         fs.unlink.mockResolvedValue(undefined);

         await FileManager.deleteFileAsync('/test/file.txt');

         expect(fs.unlink).toHaveBeenCalledWith('/test/file.txt');
      });

      it('should log warning when file does not exist', async () => {
         const error = new Error('File not found');
         error.code = 'ENOENT';
         fs.unlink.mockRejectedValue(error);

         const logger = await import('../../src/services/winstonSvc.js');

         await FileManager.deleteFileAsync('/test/file.txt');

         expect(logger.default.warn).toHaveBeenCalledWith('File not found for deletion: /test/file.txt');
      });

      it('should throw error for non-ENOENT errors', async () => {
         const error = new Error('Permission denied');
         error.code = 'EACCES';
         fs.unlink.mockRejectedValue(error);

         await expect(FileManager.deleteFileAsync('/test/file.txt')).rejects.toMatchObject({
            message: 'Deleting File ERROR!',
            className: 'FileManager',
            functionName: 'deleteFileAsync',
         });
      });

      it('should throw error when filePath is not a string', async () => {
         await expect(FileManager.deleteFileAsync(null)).rejects.toMatchObject({
            message: 'Invalid filePath: must be a non-empty string',
         });
      });
   });

   describe('moveFileAsync', () => {
      it('should move file from source to destination', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.rename.mockResolvedValue(undefined);

         await FileManager.moveFileAsync('/source/file.txt', '/dest/file.txt');

         expect(fs.mkdir).toHaveBeenCalled();
         expect(fs.rename).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      });

      it('should create destination directory if it does not exist', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.rename.mockResolvedValue(undefined);

         await FileManager.moveFileAsync('/source/file.txt', '/new/nested/dest/file.txt');

         expect(fs.mkdir).toHaveBeenCalled();
      });

      it('should throw error when sourceFilePath is not a string', async () => {
         await expect(FileManager.moveFileAsync(null, '/dest/file.txt')).rejects.toMatchObject({
            message: 'Invalid sourceFilePath: must be a non-empty string',
         });
      });

      it('should throw error when destFilePath is not a string', async () => {
         await expect(FileManager.moveFileAsync('/source/file.txt', null)).rejects.toMatchObject({
            message: 'Invalid destFilePath: must be a non-empty string',
         });
      });

      it('should throw error when move fails', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.rename.mockRejectedValue(new Error('Move failed'));

         await expect(FileManager.moveFileAsync('/source/file.txt', '/dest/file.txt')).rejects.toMatchObject({
            message: 'Moving File ERROR!',
            className: 'FileManager',
            functionName: 'moveFileAsync',
         });
      });
   });

   describe('copyFileAsync', () => {
      it('should copy file from source to destination', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.copyFile.mockResolvedValue(undefined);

         await FileManager.copyFileAsync('/source/file.txt', '/dest/file.txt');

         expect(fs.mkdir).toHaveBeenCalled();
         expect(fs.copyFile).toHaveBeenCalledWith('/source/file.txt', '/dest/file.txt');
      });

      it('should create destination directory if it does not exist', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.copyFile.mockResolvedValue(undefined);

         await FileManager.copyFileAsync('/source/file.txt', '/new/nested/dest/file.txt');

         expect(fs.mkdir).toHaveBeenCalled();
      });

      it('should throw error when sourceFilePath is not a string', async () => {
         await expect(FileManager.copyFileAsync(123, '/dest/file.txt')).rejects.toMatchObject({
            message: 'Invalid sourceFilePath: must be a non-empty string',
         });
      });

      it('should throw error when destFilePath is not a string', async () => {
         await expect(FileManager.copyFileAsync('/source/file.txt', 123)).rejects.toMatchObject({
            message: 'Invalid destFilePath: must be a non-empty string',
         });
      });

      it('should throw error when copy fails', async () => {
         fs.mkdir.mockResolvedValue(undefined);
         fs.copyFile.mockRejectedValue(new Error('Copy failed'));

         await expect(FileManager.copyFileAsync('/source/file.txt', '/dest/file.txt')).rejects.toMatchObject({
            message: 'Copying File ERROR!',
            className: 'FileManager',
            functionName: 'copyFileAsync',
         });
      });
   });

   describe('zipFolderAsync', () => {
      it('should zip files from previous month and delete originals', async () => {
         const mockFiles = ['2024-01-15.log', '2024-01-20.log', '2024-02-01.log', 'other-file.txt'];

         fs.readdir.mockResolvedValue(mockFiles);
         fs.unlink.mockResolvedValue(undefined);

         const logger = await import('../../src/services/winstonSvc.js');

         await FileManager.zipFolderAsync('/test/logs', 'log');

         expect(fs.unlink).toHaveBeenCalledTimes(2);
         expect(logger.default.info).toHaveBeenCalledWith(expect.stringContaining('Successfully zipped and removed 2 files'));
      });

      it('should log debug message when folder is empty', async () => {
         fs.readdir.mockResolvedValue([]);

         const logger = await import('../../src/services/winstonSvc.js');

         await FileManager.zipFolderAsync('/test/logs', 'log');

         expect(logger.default.debug).toHaveBeenCalledWith(expect.stringContaining('Folder is EMPTY'));
      });

      it('should log info when no files match the date filter', async () => {
         const mockFiles = ['2024-02-01.log', '2024-03-01.log'];

         fs.readdir.mockResolvedValue(mockFiles);

         const logger = await import('../../src/services/winstonSvc.js');

         await FileManager.zipFolderAsync('/test/logs', 'log');

         expect(logger.default.info).toHaveBeenCalledWith(expect.stringContaining('No files found for "2024-01"'));
      });

      it('should handle folder path with trailing slash', async () => {
         fs.readdir.mockResolvedValue([]);

         await FileManager.zipFolderAsync('/test/logs/', 'log');

         expect(fs.readdir).toHaveBeenCalledWith(expect.stringMatching(/\/test\/logs\/$/));
      });

      it('should filter files by extension case-insensitively', async () => {
         const mockFiles = ['2024-01-15.LOG', '2024-01-20.Log', '2024-01-25.log'];

         fs.readdir.mockResolvedValue(mockFiles);
         fs.unlink.mockResolvedValue(undefined);

         const logger = await import('../../src/services/winstonSvc.js');

         await FileManager.zipFolderAsync('/test/logs', 'log');

         expect(fs.unlink).toHaveBeenCalledTimes(3);
         expect(logger.default.info).toHaveBeenCalledWith(expect.stringContaining('Successfully zipped and removed 3 files'));
      });

      it('should throw error when folderPath is not a string', async () => {
         await expect(FileManager.zipFolderAsync(null, 'log')).rejects.toMatchObject({
            message: 'Invalid folderPath: must be a non-empty string',
         });
      });

      it('should throw error when fileExtension is not a string', async () => {
         await expect(FileManager.zipFolderAsync('/test/logs', null)).rejects.toMatchObject({
            message: 'Invalid fileExtension: must be a non-empty string',
         });
      });

      it('should throw error when zipping fails', async () => {
         fs.readdir.mockRejectedValue(new Error('Read failed'));

         try {
            await FileManager.zipFolderAsync('/test/logs', 'log');
            expect.fail('Should have thrown an error');
         } catch (error) {
            expect(error.message).toBe('Getting File List ERROR!');
            expect(error.className).toBe('FileManager');
            expect(error.functionName).toBe('getFileListAsync');
         }
      });
   });
});
