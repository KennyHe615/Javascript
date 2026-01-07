import AzureKeyVaultConfiguration from './azureKeyVaultConfiguration.js';
import CustomError from '../utils/customErrors/customError.js';
import { DefaultAzureCredential } from '@azure/identity';
import { KeyClient } from '@azure/keyvault-keys';

export default class AzureKeyVaultFactory {
   static #client = null;

   static getClient() {
      const config = new AzureKeyVaultConfiguration();

      if (!this.#client) {
         try {
            const credential = new DefaultAzureCredential({
               AZURE_CLIENT_ID: config.clientId,
               AZURE_CLIENT_SECRET: config.clientSecret,
               AZURE_TENANT_ID: config.tenantId,
            });

            this.#client = new KeyClient(config.url, credential);
         } catch (err) {
            throw new CustomError({
               message: 'Creating Azure Key Vault Client ERROR',
               className: 'AzureKeyVaultFactory',
               functionName: 'getClient',
               parameters: config,
               details: err,
            }).toObject();
         }
      }

      return this.#client;
   }
}
