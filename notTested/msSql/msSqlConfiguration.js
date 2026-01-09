import Constants from '../../src/utils/constants.js';

export default class MsSqlConfiguration {
   constructor() {
      this.server = Constants.SQL_SERVER;
      this.database = Constants.SQL_DATABASE;
      this.user = Constants.SQL_USER;
      this.password = Constants.SQL_PW;
      this.options = {
         trustServerCertificate: true,
         encrypt: true,
      };
      this.connectionTimeout = 300000;
      this.requestTimeout = 300000;
      this.pool = {
         max: 20,
         min: 0,
         idleTimeoutMillis: 300000,
      };
   }
}
