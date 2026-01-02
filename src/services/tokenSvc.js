import path from 'path';
import Constants from '../utils/constants.js';
import CustomError from '../utils/errors/customError.js';
import FileManager from '../utils/fileManager.js';

/**
 * TokenSvc - Manages OAuth token lifecycle for Genesys API authentication.
 * Handles token fetching, caching, and cleanup with automatic file-based persistence.
 *
 * @class TokenSvc
 */
class TokenSvc {
   static #CLASS_NAME = 'TokenSvc';
   static #TOKEN_FILE_PATH = path.join(Constants.ROOT_FOLDER, 'info', 'genesysToken');
   static #CONFIG = Object.freeze({
      OAUTH_ENDPOINT: 'https://login.cac1.pure.cloud',
      OAUTH_PATH: '/oauth/token',
      GRANT_TYPE: 'client_credentials',
      CONTENT_TYPE: 'application/x-www-form-urlencoded',
   });

   #axiosSvc;
   #tokenFilePath;

   /**
    * Creates a new TokenSvc instance.
    *
    * @param {Object} [dependencies={}] - Optional dependencies for DI
    * @param {Object} [dependencies.axiosService] - Axios(HTTP) service for API calls
    * @param {string} [dependencies.tokenFilePath] - Custom token file path
    */
   constructor(dependencies = {}) {
      this.#axiosSvc = dependencies.axiosService ?? null;
      this.#tokenFilePath = dependencies.tokenFilePath ?? TokenSvc.#TOKEN_FILE_PATH;
   }

   /**
    * Gets a valid OAuth token.
    * Returns cached token if available, otherwise fetches a new one.
    *
    * @async
    * @returns {Promise<string>} Valid OAuth access token
    * @throws {Object} CustomError if token retrieval fails
    */
   async getValidTokenAsync() {
      try {
         let localTokenInfo = await FileManager.readFileAsync(this.#tokenFilePath, 'json');

         if (Object.keys(localTokenInfo).length === 0) {
            localTokenInfo = await this.#fetchTokenAsync();

            await FileManager.writeFileAsync(this.#tokenFilePath, 'json', localTokenInfo);
         }

         return localTokenInfo.access_token;
      } catch (err) {
         throw new CustomError({
            message: 'Getting Valid Token ERROR',
            className: TokenSvc.#CLASS_NAME,
            functionName: 'getValidTokenAsync',
            parameters: { tokenFilePath: this.#tokenFilePath },
            details: err,
         }).toObject();
      }
   }

   /**
    * Cleans up the cached token file.
    * Used when token expires or needs to be refreshed.
    *
    * @async
    * @returns {Promise<void>}
    */
   async cleanTokenAsync() {
      const tokenFileExists = await FileManager.doesPathExistAsync(this.#tokenFilePath, 'json');

      if (!tokenFileExists) return;

      await FileManager.deleteFileAsync(`${this.#tokenFilePath}.json`);
   }

   /**
    * ==================== *** Private Methods *** ====================
    */

   /**
    * Lazy loads axiosService to avoid circular dependency.
    *
    * @private
    * @async
    * @returns {Promise<Object>} AxiosService instance
    */
   async #getAxiosSvcAsync() {
      if (!this.#axiosSvc) {
         const { default: axiosSvc } = await import('./axiosSvc.js');
         this.#axiosSvc = axiosSvc;
      }

      return this.#axiosSvc;
   }

   /**
    * Fetches a new OAuth token from Genesys API.
    *
    * @private
    * @async
    * @returns {Promise<Object>} Token information object
    *   - access_token {string} OAuth access token
    *   - token_type {string} Token type (usually 'bearer')
    *   - expires_in {number} Token expiration in seconds
    * @throws {Object} CustomError if token fetching fails
    */
   async #fetchTokenAsync() {
      try {
         const axiosSvc = await this.#getAxiosSvcAsync();

         const request = {
            method: 'POST',
            baseURL: TokenSvc.#CONFIG.OAUTH_ENDPOINT,
            url: TokenSvc.#CONFIG.OAUTH_PATH,
            params: { grant_type: TokenSvc.#CONFIG.GRANT_TYPE },
            headers: {
               'Content-Type': TokenSvc.#CONFIG.CONTENT_TYPE,
               Authorization: this.#buildBasicAuthHeader(),
            },
         };

         return await axiosSvc.sendRequestAsync(request);
      } catch (err) {
         throw new CustomError({
            message: 'Fetching Token ERROR',
            className: TokenSvc.#CLASS_NAME,
            functionName: '#fetchTokenAsync',
            details: err,
         }).toObject();
      }
   }

   /**
    * Builds the Basic Authentication header for OAuth token request.
    *
    * @private
    * @returns {string} Base64 encoded Basic Auth header
    */
   #buildBasicAuthHeader() {
      const credentials = `${Constants.GENESYS_CLIENT_ID}:${Constants.GENESYS_CLIENT_SECRET}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');

      return `Basic ${base64Credentials}`;
   }
}

/**
 * Default TokenSvc instance for application-wide use.
 * Uses default dependencies (axiosService, FileManager).
 *
 * @type {TokenSvc}
 */
const tokenSvc = new TokenSvc();

// Export singleton as default (most common usage)
export default tokenSvc;

// Also export the class for DI scenarios (testing, custom instances)
export { TokenSvc };

// Sample Usage:
//
// 1. Default singleton (most common):
// (async () => {
//    try {
//       const token = await tokenSvc.getValidTokenAsync();
//       console.log('token: ', token);
//    } catch (error) {
//       console.log(error);
//    }
// })();
//
// 2. Dependency Injection (for testing):
// import { TokenSvc } from './services/tokenSvc.js';
// const mockAxiosService = { sendRequest: jest.fn() };
// const mockFileManager = { readFile: jest.fn(), writeFile: jest.fn() };
// const testService = new TokenSvc({
//    axiosService: mockAxiosService,
//    fileManager: mockFileManager,
//    tokenFilePath: '/tmp/test-token'
// });
//
// 3. Custom token file path:
// const customService = new TokenSvc({
//    tokenFilePath: '/custom/path/token'
// });
