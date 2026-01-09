import sql from 'mssql';
import MsSqlConfiguration from './msSqlConfiguration.js';
import CustomError from '../../src/utils/errors/customError.js';

export default class MsSqlFactory {
   static #instance = null;

   static getInstance() {
      const config = new MsSqlConfiguration();

      if (!this.#instance) {
         try {
            this.#instance = new sql.ConnectionPool(config);
         } catch (err) {
            throw new CustomError({
               message: 'Creating MsSQL Instance ERROR',
               className: 'MsSqlFactory',
               parameters: config,
               details: err,
            }).toObject();
         }
      }

      return this.#instance;
   }
}
