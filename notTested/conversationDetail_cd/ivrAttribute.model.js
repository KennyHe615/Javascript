// noinspection JSUnresolvedVariable

import { DataTypes, Model } from 'sequelize';
import SequelizeFactory from '../factories/sequelizeFactory.js';

class IVRAttribute extends Model {
   static name = 'IVR_Attribute';

   static fields = ['connectedTime', 'endTime', 'duration', 'attributeValue'];
}

IVRAttribute.init(
   {
      conversationId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'conversation_id',
      },
      participantId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'participant_id',
      },
      queueId: {
         type: DataTypes.UUID,
         primaryKey: true,
         field: 'queue_id',
         defaultValue: 'NULL',
      },
      connectedTime: {
         type: DataTypes.DATE(0),
         field: 'connected_time',
      },
      endTime: {
         type: DataTypes.DATE(0),
         field: 'end_time',
      },
      duration: {
         type: DataTypes.BIGINT,
      },
      attributeKey: {
         type: DataTypes.STRING,
         primaryKey: true,
         set(value) {
            this.setDataValue('attributeKey', value && value.substring(0, 255));
         },
         field: 'attribute_key',
      },
      attributeValue: {
         type: DataTypes.TEXT,
         field: 'attribute_value',
      },
   },
   {
      sequelize: SequelizeFactory.getStagingInstance(),
      modelName: 'Gen_IVR_Attribute_STG',
   },
);

export default IVRAttribute;