import CustomError from "../utils/customErrors/customError.js";


/**
 * Azure Key Vault Service - Manages cryptographic keys in Azure Key Vault
 *
 * This service provides a high-level interface for managing cryptographic keys
 * in Azure Key Vault, including creation, retrieval, and deletion operations.
 * It implements comprehensive error handling and input validation.
 *
 * @class AzureKeyVaultService
 */
export default class AzureKeyVaultService {
   /**
    * Creates a new instance of AzureKeyVaultService
    * @param {KeyClient} client - Azure Key Vault KeyClient instance
    * @throws {CustomError} When a client is not provided
    */
   constructor(client) {
      if (!client) {
         throw new CustomError({
            message: "Azure Key Vault client is required",
            className: "AzureKeyVaultService",
            functionName: "constructor"
         }).toObject();
      }

      this.client = client;
   }

   /**
    * Creates a new cryptographic key in Azure Key Vault
    * @param {string} name - The name of the key to create
    * @param {string} value - The value of the key
    * @returns {Promise<void>}
    * @throws {CustomError} When key creation fails
    */
   async createKey(name, value) {
      try {
         await this.client.createKey(name, value);
      } catch (err) {
         const errorMessage = this.#getErrorMessage(err, "creating");

         throw new CustomError({
            message: errorMessage,
            className: "AzureKeyVaultService",
            functionName: "createKey",
            parameters: {
               name
            },
            details: {
               originalError: err.message,
               code: err.code,
               statusCode: err.statusCode
            }
         }).toObject();
      }
   }

   /**
    * Retrieves a cryptographic key from Azure Key Vault
    * @param {string} name - The name of the key to retrieve
    * @returns {Promise<KeyVaultKey>} The retrieved key object
    * @throws {CustomError} When key retrieval fails
    */
   async getKey(name) {
      try {
         return await this.client.getKey(name);
      } catch (err) {
         const errorMessage = this.#getErrorMessage(err, "retrieving");

         throw new CustomError({
            message: errorMessage,
            className: "AzureKeyVaultService",
            functionName: "getKey",
            parameters: {
               name
            },
            details: {
               originalError: err.message,
               code: err.code,
               statusCode: err.statusCode
            }
         }).toObject();
      }
   }

   /**
    * Deletes a cryptographic key from Azure Key Vault
    * @param {string} name - The name of the key to delete
    * @returns {Promise<void>}
    * @throws {CustomError} When key deletion fails
    */
   async deleteKey(name) {
      try {
         const poller = await this.client.beginDeleteKey(name);
         await poller.pollUntilDone();

         await this.client.purgeDeletedKey(name);
      } catch (err) {
         const errorMessage = this.#getErrorMessage(err, "deleting");

         throw new CustomError({
            message: errorMessage,
            className: "AzureKeyVaultService",
            functionName: "deleteKey",
            parameters: {
               name
            },
            details: {
               originalError: err.message,
               code: err.code,
               statusCode: err.statusCode
            }
         }).toObject();
      }
   }

   /**
    * Gets a more descriptive error message based on the error type
    * @private
    * @param {Error} error - The original error
    * @param {string} operation - The operation being performed
    * @returns {string} Descriptive error message
    */
   #getErrorMessage(error, operation) {
      const baseMessage = `Error ${operation} Azure Key Vault key`;

      if (error.code) {
         switch (error.code) {
            case "KeyNotFound":
               return `${baseMessage}: Key not found`;
            case "Forbidden":
               return `${baseMessage}: Access denied - check permissions`;
            case "Unauthorized":
               return `${baseMessage}: Authentication failed`;
            case "KeyVaultNotFound":
               return `${baseMessage}: Key Vault not found`;
            case "ThrottledError":
               return `${baseMessage}: Request throttled - too many requests`;
            default:
               return `${baseMessage}: ${error.code}`;
         }
      }

      if (error.statusCode) {
         switch (error.statusCode) {
            case 404:
               return `${baseMessage}: Key or Key Vault not found`;
            case 403:
               return `${baseMessage}: Access denied`;
            case 401:
               return `${baseMessage}: Authentication failed`;
            case 429:
               return `${baseMessage}: Too many requests`;
            case 500:
               return `${baseMessage}: Internal server error`;
            default:
               return `${baseMessage}: HTTP ${error.statusCode}`;
         }
      }

      return `${baseMessage}: ${error.message || "Unknown error"}`;
   }
}

// Sample Usage:
// import AzureKeyVaultFactory from "./azureKeyVaultFactory.js";
// const svc = new AzureKeyVaultService(AzureKeyVaultFactory.getClient());
// const result = await svc.createKey("testKey", "testValue");
// const result = await svc.getKey("testKey");
// console.log(result);