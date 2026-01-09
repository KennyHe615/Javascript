import sql from 'mssql';
import logger from '../../src/services/winstonSvc.js';
import DatabaseError from '../../src/utils/errors/databaseError.js';
import CustomError from '../../src/utils/errors/customError.js';

export default class MsSqlService {
   #msSqlInst = null;

   constructor(msSqlInst) {
      if (!msSqlInst) {
         throw new CustomError({
            message: 'MsSQL instance is required',
            className: 'MsSqlService',
            functionName: 'constructor',
         }).toObject();
      }

      this.#msSqlInst = msSqlInst;
   }

   async connect() {
      try {
         await this.#msSqlInst.connect();
         logger.info('Database Connected SUCCESSFULLY!');
      } catch (err) {
         logger.error(`Database connection error: ${JSON.stringify({ error: err.message }, null, 2)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }

   async disconnect() {
      try {
         await this.#msSqlInst.close();
         logger.info('Database Disconnected SUCCESSFULLY!');
      } catch (err) {
         logger.error(`Database disconnection error: ${JSON.stringify({ error: err.message }, null, 2)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }

   async executeQuery(query) {
      try {
         return await this.#msSqlInst.query(query);
      } catch (err) {
         logger.error(`Query execution error: ${JSON.stringify({ error: err.message }, null, 2)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }

   async executePreparedStatement(query, parameters) {
      try {
         const ps = new sql.PreparedStatement(this.#msSqlInst);
         const executeParams = {};

         parameters.forEach((param) => {
            const paramName = Object.keys(param)[0];
            const paramConfig = param[paramName];

            // Define input for prepared statement
            ps.input(paramName, paramConfig.type);

            // Build execute parameters object
            executeParams[paramName] = paramConfig.value;
         });

         await ps.prepare(query);
         const result = await ps.execute(executeParams);
         await ps.unprepare();

         return result;
      } catch (err) {
         logger.error(`Prepared statement execution error: ${JSON.stringify({ error: err.message }, null, 2)}`);

         throw new DatabaseError(undefined, err).toObject();
      }
   }
}

// Sample Usage:
// import MsSqlFactory from './msSqlFactory.js';
//
// const svc = new MsSqlService(MsSqlFactory.getInstance());
// await svc.connect();
// await svc.disconnect();
// const result = await svc.executeQuery("SELECT [genAgentId] FROM [Gen_Agent] WHERE [genAgentId] = '0043f10f-36d6-4d87-a267-bbff793ac9a4'");
// const result = await svc.executePreparedStatement("SELECT [genAgentId] FROM [Gen_Agent] WHERE [genAgentId] = @genAgentId", [{
//    genAgentId: {
//       type: sql.TYPES.NVarChar(36),
//       value: "0043f10f-36d6-4d87-a267-bbff793ac9a4"
//    }
// }]);
// console.log(result);
