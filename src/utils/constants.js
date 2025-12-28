import * as path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
import appRoot from 'app-root-path';
import os from 'os';
import CustomError from './customErrors/customError.js';

/**
 * Constants - Application-wide configuration and environment variable manager.
 * Handles loading, decryption, and validation of environment variables.
 * Automatically initializes on module import.
 *
 * @class Constants
 */
class Constants {
   static #CLASS_NAME = 'Constants';
   static #ENCRYPTION_ALGORITHM = 'aes-256-gcm';
   static #WINDOWS_IVR_PATH = 'D:\\GenesysIVRFiles\\';
   static #REQUIRED_GENERAL_VARS = [
      'PROJECT_NAME',
      'RUNNING_ENVIRONMENT',
      'GENESYS_ENDPOINT_URL',
      'DEFAULT_API_PAGE_SIZE',
      'SQL_DATABASE',
      'EMAIL_HOST',
      'EMAIL_PORT',
      'EMAIL_USER',
      'EMAIL_PW_TAG',
      'EMAIL_PW_ENCRYPTED',
      'EMAIL_DEFAULT_FROM',
      'ENCRYPT_KEY',
      'ENCRYPT_IV',
   ];
   static #REQUIRED_SPECIFIC_VARS = [
      'GENESYS_CLIENT_ID_TAG',
      'GENESYS_CLIENT_ID_ENCRYPTED',
      'GENESYS_CLIENT_SECRET_TAG',
      'GENESYS_CLIENT_SECRET_ENCRYPTED',
      'SQL_SERVER',
      'SQL_USER',
      'SQL_PORT',
      'SQL_PW_TAG',
      'SQL_PW_ENCRYPTED',
      'EMAIL_RECIPIENTS',
      // 'EMAIL_CC_RECIPIENTS', (Optional)
   ];

   /**
    * Application Configuration
    * Populated during init()
    */
   static ROOT_FOLDER;
   static PROJECT_NAME;
   static RUNNING_ENVIRONMENT;
   static IVR_ATTRIBUTE_FILE_PATH;

   // Genesys API Configuration
   static GENESYS_ENDPOINT_URL;
   static GENESYS_CLIENT_ID;
   static GENESYS_CLIENT_SECRET;
   static DEFAULT_API_PAGE_SIZE;

   // Database Configuration
   static SQL_SERVER;
   static SQL_USER;
   static SQL_PORT;
   static SQL_PW;
   static SQL_DATABASE;

   // Email Configuration
   static EMAIL_HOST;
   static EMAIL_PORT;
   static EMAIL_USER;
   static EMAIL_PW;
   static EMAIL_DEFAULT_FROM;
   static EMAIL_RECIPIENTS;
   static EMAIL_CC_RECIPIENTS;

   /**
    * Initializes and loads all environment variables and configuration.
    * Called automatically on module import.
    *
    * @static
    * @throws {Object} CustomError if environment loading or validation fails
    */
   static init() {
      try {
         const rootFolder = appRoot.path;

         const generalEnvObj = this.#loadEnvFile(rootFolder, '.env');
         const envFileName = this.#extractEnvironmentName(generalEnvObj.RUNNING_ENVIRONMENT);
         const specificEnvObj = this.#loadEnvFile(rootFolder, `.env.${envFileName}`);

         this.#validateEnvironmentVariables(generalEnvObj, specificEnvObj);

         const config = this.#buildConfiguration(rootFolder, generalEnvObj, specificEnvObj);

         Object.assign(Constants, config);
      } catch (err) {
         throw new CustomError({
            message: 'Failed to initialize Constants',
            className: this.#CLASS_NAME,
            functionName: 'init',
            details: err,
         }).toObject();
      }
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Loads environment variables from a .env file.
    *
    * @private
    * @static
    * @param {string} rootFolder - Application root directory path
    * @param {string} fileName - Environment file name (e.g., '.env', '.env.dev')
    * @returns {Object} Parsed environment variables
    * @throws {CustomError} If file loading fails
    */
   static #loadEnvFile(rootFolder, fileName) {
      const filePath = path.resolve(rootFolder, fileName);
      const result = dotenv.config({ path: filePath });

      if (result.error) {
         throw new CustomError({
            message: `Failed to load environment file: ${fileName}`,
            className: this.#CLASS_NAME,
            functionName: '#loadEnvFile',
            parameters: { filePath },
            details: result.error,
         }).toObject();
      }

      if (!result.parsed) {
         throw new CustomError({
            message: `Environment file is empty or invalid: ${fileName}`,
            className: this.#CLASS_NAME,
            functionName: '#loadEnvFile',
            parameters: { filePath },
         }).toObject();
      }

      return result.parsed;
   }

   /**
    * Extracts the base environment name by removing trailing numbers.
    *
    * @private
    * @static
    * @param {string} runningEnvironment - Raw environment string (e.g., 'dev', 'prod1', 'uat2')
    * @returns {string} Base environment name (e.g., 'dev', 'prod', 'uat')
    */
   static #extractEnvironmentName(runningEnvironment) {
      if (!runningEnvironment) {
         throw new CustomError({
            message: 'RUNNING_ENVIRONMENT is required',
            className: this.#CLASS_NAME,
            functionName: '#extractEnvironmentName',
         }).toObject();
      }

      return runningEnvironment.replace(/\d+$/, '');
   }

   /**
    * Validates that all required environment variables are present.
    *
    * @private
    * @static
    * @param {Object} generalEnv - General environment variables
    * @param {Object} specificEnv - Environment-specific variables
    * @throws {CustomError} If any required variables are missing
    */
   static #validateEnvironmentVariables(generalEnv, specificEnv) {
      const missingGeneral = this.#REQUIRED_GENERAL_VARS.filter((key) => !generalEnv[key]);
      const missingSpecific = this.#REQUIRED_SPECIFIC_VARS.filter((key) => !specificEnv[key]);

      if (missingGeneral.length > 0 || missingSpecific.length > 0) {
         throw new CustomError({
            message: 'Missing required environment variables',
            className: this.#CLASS_NAME,
            functionName: '#validateEnvironmentVariables',
            parameters: {
               missingFromGeneral: missingGeneral,
               missingFromSpecific: missingSpecific,
            },
         }).toObject();
      }
   }

   /**
    * Builds the complete configuration object from environment variables.
    *
    * @private
    * @static
    * @param {string} rootFolder - Application root directory
    * @param {Object} generalEnv - General environment variables
    * @param {Object} specificEnv - Environment-specific variables
    * @returns {Object} Complete configuration object
    */
   static #buildConfiguration(rootFolder, generalEnv, specificEnv) {
      const platform = os.platform();
      const ivrFilePath = platform === 'win32' ? this.#WINDOWS_IVR_PATH : path.join(rootFolder, 'GenesysIVRFiles');

      const decrypt = (tag, encryptedData, fieldName) =>
         this.#decryptValue(generalEnv.ENCRYPT_KEY, generalEnv.ENCRYPT_IV, tag, encryptedData, fieldName);

      return {
         ROOT_FOLDER: rootFolder,
         PROJECT_NAME: generalEnv.PROJECT_NAME,
         RUNNING_ENVIRONMENT: generalEnv.RUNNING_ENVIRONMENT,
         IVR_ATTRIBUTE_FILE_PATH: ivrFilePath,
         GENESYS_ENDPOINT_URL: generalEnv.GENESYS_ENDPOINT_URL,
         DEFAULT_API_PAGE_SIZE: Constants.#parseInteger(generalEnv.DEFAULT_API_PAGE_SIZE, 'DEFAULT_API_PAGE_SIZE'),
         SQL_DATABASE: generalEnv.SQL_DATABASE,
         EMAIL_HOST: generalEnv.EMAIL_HOST,
         EMAIL_PORT: Constants.#parseInteger(generalEnv.EMAIL_PORT, 'EMAIL_PORT'),
         EMAIL_USER: generalEnv.EMAIL_USER,
         EMAIL_DEFAULT_FROM: generalEnv.EMAIL_DEFAULT_FROM,
         GENESYS_CLIENT_ID: decrypt(
            specificEnv.GENESYS_CLIENT_ID_TAG,
            specificEnv.GENESYS_CLIENT_ID_ENCRYPTED,
            'GENESYS_CLIENT_ID',
         ),
         GENESYS_CLIENT_SECRET: decrypt(
            specificEnv.GENESYS_CLIENT_SECRET_TAG,
            specificEnv.GENESYS_CLIENT_SECRET_ENCRYPTED,
            'GENESYS_CLIENT_SECRET',
         ),
         SQL_SERVER: specificEnv.SQL_SERVER,
         SQL_USER: specificEnv.SQL_USER,
         SQL_PORT: specificEnv.SQL_PORT,
         SQL_PW: decrypt(specificEnv.SQL_PW_TAG, specificEnv.SQL_PW_ENCRYPTED, 'SQL_PW'),
         EMAIL_PW: decrypt(generalEnv.EMAIL_PW_TAG, generalEnv.EMAIL_PW_ENCRYPTED, 'EMAIL_PW'),
         EMAIL_RECIPIENTS: specificEnv.EMAIL_RECIPIENTS,
         EMAIL_CC_RECIPIENTS: specificEnv.EMAIL_CC_RECIPIENTS || '',
      };
   }

   /**
    * Decrypts an encrypted value using AES-256-GCM.
    *
    * @private
    * @static
    * @param {string} key - Encryption key (hex string)
    * @param {string} iv - Initialization vector (hex string)
    * @param {string} tag - Authentication tag (hex string)
    * @param {string} encryptedData - Encrypted data (hex string)
    * @param {string} fieldName - Field name for error reporting
    * @returns {string} Decrypted value
    * @throws {CustomError} If decryption fails
    */
   static #decryptValue(key, iv, tag, encryptedData, fieldName) {
      try {
         const decipher = crypto.createDecipheriv(this.#ENCRYPTION_ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));

         decipher.setAuthTag(Buffer.from(tag, 'hex'));

         let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
         decrypted += decipher.final('utf8');

         return decrypted;
      } catch (err) {
         throw new CustomError({
            message: `Failed to decrypt field: ${fieldName}`,
            className: this.#CLASS_NAME,
            functionName: '#decryptValue',
            parameters: {
               fieldName,
            },
            details: err,
         }).toObject();
      }
   }

   /**
    * Parses and validates a string value as a positive integer.
    *
    * @private
    * @static
    * @param {string} value - String value to parse
    * @param {string} fieldName - Field name for error reporting
    * @returns {number} Parsed positive integer
    * @throws {CustomError} If value is not a valid positive integer
    */
   static #parseInteger(value, fieldName) {
      const parsed = parseInt(value, 10);

      if (isNaN(parsed) || parsed <= 0) {
         throw new CustomError({
            message: `Invalid integer value for ${fieldName}`,
            className: this.#CLASS_NAME,
            functionName: '#parseInteger',
            parameters: {
               fieldName,
               value,
            },
         }).toObject();
      }

      return parsed;
   }
}

Constants.init();
export default Constants;

// Sample Usage
// console.log('RUNNING_ENVIRONMENT: ', Constants.RUNNING_ENVIRONMENT);
// console.log('SQL_PW: ', Constants.SQL_PW);
