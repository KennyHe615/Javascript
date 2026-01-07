import Constants from "../utils/constants.js";


export default class AzureKeyVaultConfiguration {
   constructor() {
      this.url = `https://${Constants.AZURE_KEY_VAULT_NAME}.vault.azure.net`;
      this.clientId = Constants.AZURE_CLIENT_ID;
      this.clientSecret = Constants.AZURE_CLIENT_SECRET;
      this.tenantId = Constants.AZURE_TENANT_ID;
   }
}