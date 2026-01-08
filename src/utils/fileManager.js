import path from 'path';
import fs from 'fs/promises';
import admZip from 'adm-zip';
import dayjs from 'dayjs';
import { setTimeout } from 'timers/promises';
import CustomError from './errors/customError.js';
import logger from '../services/winstonSvc.js';

/**
 * FileManager - Utility class for file system operations.
 * Provides methods for reading, writing, deleting files and managing directories.
 * Supports JSON and TXT file formats with automatic retry logic.
 *
 * @class FileManager
 */
export default class FileManager {
   static #CLASS_NAME = 'FileManager';
   static #CONFIG = Object.freeze({
      supportedExtensions: Object.freeze({
         json: 'json',
         txt: 'txt',
      }),
      maxRetries: 3,
      retryDelay: 1000,
      defaultJsonIndent: 3,
   });
   static #FILE_ERRORS = Object.freeze({
      notFound: 'ENOENT',
      fileExists: 'EEXIST',
   });

   /**
    * Gets the list of files in a directory.
    *
    * @static
    * @async
    * @param {string} folderPath - Path to the directory
    * @returns {Promise<Array<string>>} Array of file names
    * @throws {Object} CustomError if reading directory fails
    */
   static async getFileListAsync(folderPath) {
      FileManager.#validateString(folderPath, 'folderPath');

      try {
         return await fs.readdir(folderPath);
      } catch (err) {
         throw new CustomError({
            message: 'Getting File List ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'getFileListAsync',
            parameters: { filePath: folderPath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Checks if a file or directory exists.
    *
    * @static
    * @async
    * @param {string} filePath - Path to check (with or without extension)
    * @param {string|null} [fileExtension=null] - Optional file extension
    * @returns {Promise<boolean>} True if a path exists, false if not found
    * @throws {Object} CustomError if access check fails (errors other than ENOENT)
    */
   static async doesPathExistAsync(filePath, fileExtension = null) {
      FileManager.#validateString(filePath, 'filePath');

      const fullFilePath = fileExtension ? `${filePath}.${fileExtension}` : filePath;

      try {
         await fs.access(fullFilePath);

         return true;
      } catch (err) {
         if (err?.code === FileManager.#FILE_ERRORS.notFound) return false;

         throw new CustomError({
            message: 'Checking Path Existence ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'doesPathExistAsync',
            parameters: { filePath: fullFilePath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Reads a file and returns its content.
    * If a file doesn't exist, creates it with default content (empty object for JSON, empty string for TXT).
    *
    * @static
    * @async
    * @param {string} filePath - File path without extension
    * @param {string} fileExtension - File extension ('json' or 'txt')
    * @returns {Promise<Object|string>} Parsed JSON object or text string
    * @throws {Object} CustomError if file reading fails or extension is invalid
    */
   static async readFileAsync(filePath, fileExtension) {
      FileManager.#validateString(filePath, 'filePath');
      FileManager.#validateExtension(fileExtension);

      const fullFilePath = `${filePath}.${fileExtension}`;

      try {
         const data = await fs.readFile(fullFilePath, 'utf-8');

         return fileExtension === FileManager.#CONFIG.supportedExtensions.txt ? data : JSON.parse(data);
      } catch (err) {
         if (err?.code === FileManager.#FILE_ERRORS.notFound) {
            const defaultContent = fileExtension === FileManager.#CONFIG.supportedExtensions.json ? {} : '';

            try {
               await FileManager.#writeFileExclusiveAsync(filePath, fileExtension, defaultContent);
            } catch (writeErr) {
               if (writeErr?.code === FileManager.#FILE_ERRORS.fileExists) {
                  const data = await fs.readFile(fullFilePath, 'utf-8');
                  return fileExtension === FileManager.#CONFIG.supportedExtensions.txt ? data : JSON.parse(data);
               }

               throw new CustomError({
                  message: 'Writing File In Catching Block ERROR!',
                  className: FileManager.#CLASS_NAME,
                  functionName: 'readFileAsync',
                  parameters: { filePath: fullFilePath },
                  details: writeErr,
               }).toObject();
            }

            return defaultContent;
         }

         throw new CustomError({
            message: 'Reading File ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'readFileAsync',
            parameters: { filePath: fullFilePath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Creates a directory recursively if it doesn't exist.
    *
    * @static
    * @async
    * @param {string} directoryPath - Absolute path of the directory to create
    * @throws {Object} CustomError if directory creation fails
    */
   static async createDirectoryAsync(directoryPath) {
      FileManager.#validateString(directoryPath, 'directoryPath');

      try {
         await fs.mkdir(directoryPath, { recursive: true });
      } catch (err) {
         throw new CustomError({
            message: 'Creating Directory ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'createDirectoryAsync',
            parameters: { filePath: directoryPath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Writes content to a file with the specified extension.
    * Automatically creates directories if they don't exist.
    *
    * @static
    * @async
    * @param {string} filePath - File path without extension
    * @param {string} fileExtension - File extension ('json' or 'txt')
    * @param {*} content - Content to write (object for JSON, string for TXT)
    * @throws {Object} CustomError if file writing fails or extension is invalid
    */
   static async writeFileAsync(filePath, fileExtension, content) {
      FileManager.#validateString(filePath, 'filePath');
      FileManager.#validateExtension(fileExtension);

      const fullFilePath = `${filePath}.${fileExtension}`;
      const fileContent =
         fileExtension === FileManager.#CONFIG.supportedExtensions.txt
            ? content
            : JSON.stringify(content, null, FileManager.#CONFIG.defaultJsonIndent);

      await FileManager.#writeFileWithRetryAsync(fullFilePath, fileContent, filePath);
   }

   /**
    * Converts an array of objects to CSV-like text format.
    * Escapes single quotes, replaces newlines and commas with spaces.
    *
    * @static
    * @param {Array<Object>} payload - Array of objects to convert
    * @returns {Array<string>} Array of formatted CSV-like strings
    * @throws {Object} CustomError if conversion fails
    */
   static refactorToTxtFormat(payload) {
      FileManager.#validateArray(payload, 'payload');

      try {
         return payload.map((entity) => {
            return Object.values(entity)
               .map((item) => {
                  if (item === undefined || item === null) return '';

                  // Convert to string if not already a primitive handled by template literals
                  const strItem = String(item);

                  // Handle special character replacements
                  return strItem
                     .replace(/'/g, "''") // Escape single quotes
                     .replace(/\n/g, ' ') // Replace newlines with spaces
                     .replace(/,/g, ' '); // Replace commas with spaces
               })
               .join(',');
         });
      } catch (err) {
         throw new CustomError({
            message: 'Refactoring items to TXT format ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'refactorToTxtFormat',
            details: err,
         }).toObject();
      }
   }

   /**
    * Appends lines to a text file.
    * Creates the directory and file if they don't exist.
    *
    * @static
    * @async
    * @param {string} fileName - File name without extension
    * @param {Array<string>} content - Array of strings to append as lines
    * @throws {Object} CustomError if appending fails
    */
   static async appendFileAsync(fileName, content) {
      FileManager.#validateString(fileName, 'fileName');
      FileManager.#validateArray(content, 'content');

      const fullPath = `${fileName}.${FileManager.#CONFIG.supportedExtensions.txt}`;

      try {
         await FileManager.createDirectoryAsync(path.dirname(fullPath));

         const contentWithNewlines = content.map((item) => `${item}\n`).join('');

         await fs.appendFile(fullPath, contentWithNewlines);
      } catch (err) {
         throw new CustomError({
            message: 'Appending File ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'appendFileAsync',
            parameters: { filePath: fullPath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Deletes a file.
    * Logs a warning if a file doesn't exist instead of throwing an error.
    *
    * @static
    * @async
    * @param {string} filePath - Full path of the file to delete (including extension)
    * @throws {Object} CustomError if deletion fails (errors other than ENOENT)
    */
   static async deleteFileAsync(filePath) {
      FileManager.#validateString(filePath, 'filePath');

      try {
         await fs.unlink(filePath);
      } catch (err) {
         if (err?.code === FileManager.#FILE_ERRORS.notFound) {
            logger.warn(`File not found for deletion: ${filePath}`);

            return;
         }

         throw new CustomError({
            message: 'Deleting File ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'deleteFileAsync',
            parameters: { filePath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Moves a file from source to destination.
    * Creates the destination directory if it doesn't exist.
    *
    * @static
    * @async
    * @param {string} sourceFilePath - Full path of the source file (including extension)
    * @param {string} destFilePath - Full path of the destination file (including extension)
    * @throws {Object} CustomError if moving fails or a source file doesn't exist
    */
   static async moveFileAsync(sourceFilePath, destFilePath) {
      FileManager.#validateString(sourceFilePath, 'sourceFilePath');
      FileManager.#validateString(destFilePath, 'destFilePath');

      try {
         await FileManager.createDirectoryAsync(path.dirname(destFilePath));

         await fs.rename(sourceFilePath, destFilePath);
      } catch (err) {
         throw new CustomError({
            message: 'Moving File ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'moveFileAsync',
            parameters: {
               sourceFilePath,
               destFilePath,
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * Copies a file from source to destination.
    * Creates the destination directory if it doesn't exist.
    *
    * @static
    * @async
    * @param {string} sourceFilePath - Full path of the source file (including extension)
    * @param {string} destFilePath - Full path of the destination file (including extension)
    * @throws {Object} CustomError if copying fails or a source file doesn't exist
    */
   static async copyFileAsync(sourceFilePath, destFilePath) {
      FileManager.#validateString(sourceFilePath, 'sourceFilePath');
      FileManager.#validateString(destFilePath, 'destFilePath');

      try {
         await FileManager.createDirectoryAsync(path.dirname(destFilePath));

         await fs.copyFile(sourceFilePath, destFilePath);
      } catch (err) {
         throw new CustomError({
            message: 'Copying File ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'copyFileAsync',
            parameters: {
               sourceFilePath,
               destFilePath,
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * Zips files from the previous month and removes the original files.
    * Files must follow the pattern: YYYY-MM-DD.{fileExtension}
    *
    * @static
    * @async
    * @param {string} folderPath - Path to the folder containing files to zip
    * @param {string} fileExtension - File extension to filter (e.g., 'log', 'txt')
    * @throws {Object} CustomError if zipping fails
    */
   static async zipFolderAsync(folderPath, fileExtension) {
      FileManager.#validateString(folderPath, 'folderPath');
      FileManager.#validateString(fileExtension, 'fileExtension');

      // Ensure the folderPath has a trailing slash
      const normalizedPath = folderPath.endsWith(path.sep) ? folderPath : path.join(folderPath, path.sep);
      const preLog = `[zipFolder] [Folder: ${normalizedPath}, Extension: ${fileExtension}]`;

      try {
         // Get an original full file list
         const fullFileList = await FileManager.getFileListAsync(normalizedPath);

         if (fullFileList.length === 0) {
            logger.debug(`${preLog} - Folder is EMPTY.`);
            return;
         }

         // Filter the files for last month
         const backwardOneMonthDateStr = dayjs().subtract(1, 'month').format('YYYY-MM');
         const filteredFileList = FileManager.#filterFilesByDateAndExtension(
            fullFileList,
            backwardOneMonthDateStr,
            fileExtension,
         );

         if (filteredFileList.length === 0) {
            logger.info(`${preLog} - No files found for "${backwardOneMonthDateStr}".`);
            return;
         }

         FileManager.#createAndWriteZip(normalizedPath, filteredFileList, backwardOneMonthDateStr);
         //Remove the files
         await Promise.all(filteredFileList.map((file) => FileManager.deleteFileAsync(path.join(normalizedPath, file))));

         logger.info(
            `${preLog} - Successfully zipped and removed ${filteredFileList.length} files for "${backwardOneMonthDateStr}".`,
         );
      } catch (err) {
         throw new CustomError({
            message: 'Zipping Folder ERROR!',
            className: FileManager.#CLASS_NAME,
            functionName: 'zipFolderAsync',
            parameters: {
               folderPath: normalizedPath,
               fileExtension,
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Validates that a value is a non-empty string, including filePath.
    *
    * @private
    * @static
    * @param {string} value - Value to validate
    * @param {string} paramName - Parameter name for error messages
    * @throws {Object} CustomError if value is invalid
    */
   static #validateString(value, paramName) {
      if (typeof value !== 'string' || value.trim() === '') {
         throw new CustomError({
            message: `Invalid ${paramName}: must be a non-empty string`,
            className: FileManager.#CLASS_NAME,
            functionName: '#validateString',
            parameters: { [paramName]: value },
         }).toObject();
      }
   }

   /**
    * Validates that a file extension is supported.
    *
    * @private
    * @static
    * @param {string} extension - File extension to validate
    * @throws {Object} CustomError if extension is invalid
    */
   static #validateExtension(extension) {
      const values = Object.values(FileManager.#CONFIG.supportedExtensions);
      const isValid = values.includes(extension?.toLowerCase());

      if (!isValid) {
         throw new CustomError({
            message: `Invalid File Extension: Only accepting ${values.join(', ')}`,
            className: FileManager.#CLASS_NAME,
            functionName: '#validateExtension',
            parameters: { extension },
         }).toObject();
      }
   }

   /**
    * Validates that a value is an array.
    *
    * @private
    * @static
    * @param {Array} value - Value to validate
    * @param {string} paramName - Parameter name for error messages
    * @throws {Object} CustomError if value is not an array
    */
   static #validateArray(value, paramName) {
      if (!Array.isArray(value)) {
         throw new CustomError({
            message: `Invalid ${paramName}: must be an array`,
            className: FileManager.#CLASS_NAME,
            functionName: '#validateArray',
            parameters: { [paramName]: typeof value },
         }).toObject();
      }
   }

   /**
    * Writes a file with automatic retry logic.
    * Creates a directory if it doesn't exist on ENOENT error.
    *
    * @private
    * @static
    * @async
    * @param {string} fullFilePath - Complete file path including extension
    * @param {string} content - Content to write
    * @param {string} basePath - Base path for directory creation
    * @throws {Object} CustomError if all retry attempts fail
    */
   static async #writeFileWithRetryAsync(fullFilePath, content, basePath) {
      for (let attempt = 1; attempt <= FileManager.#CONFIG.maxRetries; attempt++) {
         try {
            await fs.writeFile(fullFilePath, content, 'utf-8');

            return;
         } catch (err) {
            if (err?.code === FileManager.#FILE_ERRORS.notFound && attempt < FileManager.#CONFIG.maxRetries) {
               await FileManager.createDirectoryAsync(path.dirname(basePath));
               await setTimeout(FileManager.#CONFIG.retryDelay);
               continue;
            }

            throw new CustomError({
               message: 'Writing File ERROR!',
               className: FileManager.#CLASS_NAME,
               functionName: '#writeFileWithRetryAsync',
               parameters: {
                  filePath: fullFilePath,
                  attempt,
               },
               details: err,
            }).toObject();
         }
      }
   }

   /**
    * Writes a file exclusively (only if it doesn't exist).
    * Used to prevent race conditions when creating default files.
    *
    * @private
    * @static
    * @async
    * @param {string} filePath - File path without extension
    * @param {string} fileExtension - File extension ('json' or 'txt')
    * @param {*} content - Content to write
    * @throws {Error} FILE_EXISTS error if file already exists
    * @throws {Object} CustomError if writing fails after retries
    */
   static async #writeFileExclusiveAsync(filePath, fileExtension, content) {
      const fullFilePath = `${filePath}.${fileExtension}`;
      const fileContent =
         fileExtension === FileManager.#CONFIG.supportedExtensions.txt
            ? content
            : JSON.stringify(content, null, FileManager.#CONFIG.defaultJsonIndent);

      for (let attempt = 1; attempt <= FileManager.#CONFIG.maxRetries; attempt++) {
         try {
            await FileManager.createDirectoryAsync(path.dirname(filePath));

            const fileHandle = await fs.open(fullFilePath, 'wx');
            await fileHandle.writeFile(fileContent, 'utf-8');
            await fileHandle.close();

            return;
         } catch (err) {
            if (err?.code === FileManager.#FILE_ERRORS.fileExists) throw err;

            if (err?.code === FileManager.#FILE_ERRORS.notFound && attempt < FileManager.#CONFIG.maxRetries) {
               await setTimeout(FileManager.#CONFIG.retryDelay);
               continue;
            }

            throw new CustomError({
               message: 'Writing File Exclusively ERROR!',
               className: FileManager.#CLASS_NAME,
               functionName: '#writeFileExclusiveAsync',
               parameters: {
                  filePath: fullFilePath,
                  attempt,
               },
               details: err,
            }).toObject();
         }
      }
   }

   /**
    * Filters files by date prefix and extension.
    *
    * @private
    * @static
    * @param {Array<string>} fileList - List of file names
    * @param {string} datePrefix - Date prefix to filter by (YYYY-MM format)
    * @param {string} extension - File extension to filter by
    * @returns {Array<string>} Filtered file list
    */
   static #filterFilesByDateAndExtension(fileList, datePrefix, extension) {
      return fileList.filter((fileName) => {
         const ext = path.extname(fileName).slice(1);
         const baseName = path.basename(fileName, path.extname(fileName));

         // Use case-insensitive comparison for file extensions
         return baseName?.startsWith(datePrefix) && ext?.toLowerCase() === extension.toLowerCase();
      });
   }

   /**
    * Creates a zip archive and writes it to disk.
    *
    * @private
    * @static
    * @param {string} folderPath - Base folder path
    * @param {Array<string>} fileList - List of files to zip
    * @param {string} zipName - Name of the zip file (without extension)
    */
   static #createAndWriteZip(folderPath, fileList, zipName) {
      const zip = new admZip(null, null);

      fileList.forEach((file) => {
         zip.addLocalFile(path.join(folderPath, file));
      });

      zip.writeZip(path.join(folderPath, `${zipName}.zip`), null);
   }
}
