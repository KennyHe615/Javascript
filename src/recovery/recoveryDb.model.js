// noinspection JSUnresolvedVariable

import { DataTypes, Model } from 'sequelize';
import SequelizeFactory from '../factories/sequelizeFactory.js';

/**
 * IVRUpdateStageA - Sequelize model for IVR Update Stage A data.
 * Represents conversation IDs pending processing in Stage A.
 *
 * @class IVRUpdateStageA
 * @extends Model
 */
class IVRUpdateStageA extends Model {
   static NAME = 'IVRUpdateStageA';
}

IVRUpdateStageA.init(
   {
      conversationId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'conversationId',
      },
   },
   {
      sequelize: SequelizeFactory.getBiInstance(),
      modelName: 'GenConverID_IVR_Update_STG_A',
      timestamps: false,
   },
);

/**
 * IVRUpdateArchiveA - Sequelize model for IVR Update Archive A data.
 * Represents archived conversation IDs from Stage A.
 *
 * @class IVRUpdateArchiveA
 * @extends Model
 */
class IVRUpdateArchiveA extends Model {
   static NAME = 'IVRUpdateArchiveA';

   static FIELDS = ['createdDate'];
}

IVRUpdateArchiveA.init(
   {
      conversationId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'conversationId',
      },
      createdDate: {
         type: DataTypes.DATE(0),
         field: 'createdDate',
      },
   },
   {
      sequelize: SequelizeFactory.getBiInstance(),
      modelName: 'GenConverID_IVR_Update_Archive',
      timestamps: false,
   },
);

/**
 * IVRUpdateStageB - Sequelize model for IVR Update Stage B data.
 * Represents conversation IDs pending processing in Stage B.
 *
 * @class IVRUpdateStageB
 * @extends Model
 */
class IVRUpdateStageB extends Model {
   static NAME = 'IVRUpdateStageB';
}

IVRUpdateStageB.init(
   {
      conversationId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'conversationId',
      },
   },
   {
      sequelize: SequelizeFactory.getBiInstance(),
      modelName: 'GenConverID_IVR_Update_STG_B',
      timestamps: false,
   },
);

/**
 * IVRUpdateArchiveB - Sequelize model for IVR Update Archive B data.
 * Represents archived conversation IDs from Stage B.
 *
 * @class IVRUpdateArchiveB
 * @extends Model
 */
class IVRUpdateArchiveB extends Model {
   static NAME = 'IVRUpdateArchiveB';

   static FIELDS = ['createdDate'];
}

IVRUpdateArchiveB.init(
   {
      conversationId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'conversationId',
      },
      createdDate: {
         type: DataTypes.DATE(0),
         field: 'createdDate',
      },
   },
   {
      sequelize: SequelizeFactory.getBiInstance(),
      modelName: 'GenConverID_IVR_Update_Archive_B',
      timestamps: false,
   },
);

export { IVRUpdateStageA, IVRUpdateArchiveA, IVRUpdateStageB, IVRUpdateArchiveB };