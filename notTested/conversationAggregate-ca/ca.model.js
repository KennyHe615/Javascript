// noinspection JSUnresolvedVariable

import { DataTypes, Model } from 'sequelize';
import SequelizeFactory from '../factories/sequelizeFactory.js';

class ConversationAggregate extends Model {
   static name = 'Conversation_Aggregate';

   static fields = ['endTime', 'value'];
}

ConversationAggregate.init(
   {
      queueId: {
         type: DataTypes.UUID,
         primaryKey: true,
         defaultValue: 'NULL',
         field: 'queue_id',
      },
      mediaType: {
         type: DataTypes.STRING(11),
         primaryKey: true,
         values: ['callback', 'chat', 'cobrowse', 'email', 'message', 'screenshare', 'unknown', 'video', 'voice'],
         field: 'media_type',
      },
      requestedRoutingSkillId: {
         type: DataTypes.UUID,
         primaryKey: true,
         defaultValue: 'NULL',
         field: 'requested_routing_skill_id',
      },
      wrapUpCode: {
         type: DataTypes.STRING,
         primaryKey: true,
         set(value) {
            this.setDataValue('wrapUpCode', value && value.substring(0, 255));
         },
         defaultValue: 'NULL',
         field: 'wrap_up_code',
      },
      startTime: {
         type: DataTypes.DATE(0),
         primaryKey: true,
         field: 'start_time',
      },
      endTime: {
         type: DataTypes.DATE(0),
         field: 'end_time',
      },
      metric: {
         type: DataTypes.STRING(23),
         primaryKey: true,
         values: [
            'nBlindTransferred',
            'nCobrowseSessions',
            'nConnected',
            'nConsult',
            'nConsultTransferred',
            'nError',
            'nOffered',
            'nOutbound',
            'nOutboundAbandoned',
            'nOutboundAttempted',
            'nOutboundConnected',
            'nOverSla',
            'nStateTransitionError',
            'nTransferred',
            'oExternalMediaCount',
            'oMediaCount',
            'oMessageTurn',
            'oServiceLevel',
            'oServiceTarget',
            'tAbandon',
            'tAcd',
            'tActiveCallback',
            'tActiveCallbackComplete',
            'tAcw',
            'tAgentResponseTime',
            'tAlert',
            'tAnswered',
            'tBarging',
            'tCoaching',
            'tCoachingComplete',
            'tConnected',
            'tContacting',
            'tDialing',
            'tFirstConnect',
            'tFirstDial',
            'tFlowOut',
            'tHandle',
            'tHeld',
            'tHeldComplete',
            'tIvr',
            'tMonitoring',
            'tMonitoringComplete',
            'tNotResponding',
            'tShortAbandon',
            'tTalk',
            'tTalkComplete',
            'tUserResponseTime',
            'tVoicemail',
            'tWait',
         ],
      },
      stat: {
         type: DataTypes.STRING(50),
         primaryKey: true,
         set(value) {
            this.setDataValue('stat', value && value.substring(0, 50));
         },
      },
      value: {
         type: DataTypes.STRING(50),
      },
   },
   {
      sequelize: SequelizeFactory.getInstance(),
      modelName: 'Gen_Conversation_Aggregate_STG',
   },
);

export default ConversationAggregate;