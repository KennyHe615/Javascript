// noinspection JSUnresolvedVariable

import { DataTypes, Model } from 'sequelize';
import SequelizeFactory from '../factories/sequelizeFactory.js';

class JobStatus extends Model {
   static name = 'Job_Status';

   static fields = ['interval', 'pageNum', 'isJobCompleted', 'isRecoveryCompleted'];
}

JobStatus.init(
   {
      id: {
         type: DataTypes.BIGINT,
         primaryKey: true,
         autoIncrement: true,
      },
      category: {
         type: DataTypes.STRING(100),
         primaryKey: true,
         values: ['Conversation Detail', 'Conversation Aggregate', 'User Detail'],
      },
      interval: {
         type: DataTypes.STRING(50),
      },
      pageNum: {
         type: DataTypes.INTEGER,
         field: 'page_number',
      },
      isJobCompleted: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
         field: 'is_job_completed',
      },
      isRecoveryCompleted: {
         type: DataTypes.BOOLEAN,
         allowNull: false,
         defaultValue: false,
         field: 'is_recovery_completed',
      },
   },
   {
      sequelize: SequelizeFactory.getInstance(),
      modelName: 'Gen_Historical_Scheduled_Job_Status',
   },
);

export default JobStatus;