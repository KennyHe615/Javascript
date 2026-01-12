// noinspection JSUnresolvedVariable

import { DataTypes, Model } from 'sequelize';
import SequelizeFactory from '../../factories/sequelizeFactory.js';

class Queue extends Model {
   static NAME = 'Queue';

   static FIELDS = [
      'queueName',
      'divisionId',
      'divisionName',
      'description',
      'dateCreated',
      'dateModified',
      'modifiedBy',
      'createdBy',
      'memberCount',
      'userMemberCount',
      'joinedMemberCount',
      'skillEvaluationMethod',
      'queueFlowId',
      'queueFlowName',
      'whisperPromptId',
      'whisperPromptName',
      'autoAnswerOnly',
      'enableTranscription',
      'enableManualAssignment',
      'callingPartyName',
      'callingPartyNumber',
      'acwSettingsWrapUpPrompt',
      'acwSettingsTimeoutMs',
      'agentOwnedRoutingEnableAgentOwnedCallbacks',
      'agentOwnedRoutingMaxOwnedCallbackHours',
      'agentOwnedRoutingMaxOwnedCallbackDelayHours',
      'defaultScriptsCallId',
      'defaultScriptsEmailId',
      'outboundEmailAddressDomainId',
      'outboundEmailAddressRouteId',
      'outboundEmailAddressRoutePattern',
      'mediaSettings',
   ];
}

Queue.init(
   {
      queueId: {
         type: DataTypes.UUID,
         primaryKey: true,
         // field: 'queue_id',
      },
      queueName: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('queueName', value && value.substring(0, 255));
         },
      },
      divisionId: {
         type: DataTypes.UUID,
      },
      divisionName: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('divisionName', value && value.substring(0, 255));
         },
      },
      description: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('description', value && value.substring(0, 255));
         },
      },
      dateCreated: {
         type: DataTypes.DATE(0),
      },
      dateModified: {
         type: DataTypes.DATE(0),
      },
      modifiedBy: {
         type: DataTypes.UUID,
      },
      createdBy: {
         type: DataTypes.UUID,
      },
      memberCount: {
         type: DataTypes.INTEGER,
      },
      userMemberCount: {
         type: DataTypes.INTEGER,
      },
      joinedMemberCount: {
         type: DataTypes.INTEGER,
      },
      skillEvaluationMethod: {
         type: DataTypes.STRING(5),
         values: ['NONE', 'BEST', 'ALL'],
      },
      queueFlowId: {
         type: DataTypes.UUID,
      },
      queueFlowName: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('queueFlowName', value && value.substring(0, 255));
         },
      },
      whisperPromptId: {
         type: DataTypes.UUID,
      },
      whisperPromptName: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('whisperPromptName', value && value.substring(0, 255));
         },
      },
      autoAnswerOnly: {
         type: DataTypes.STRING(5),
      },
      enableTranscription: {
         type: DataTypes.STRING(5),
      },
      callingPartyName: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('callingPartyName', value && value.substring(0, 255));
         },
      },
      callingPartyNumber: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('callingPartyNumber', value && value.substring(0, 255));
         },
      },
      acwSettingsWrapUpPrompt: {
         type: DataTypes.STRING(25),
         values: ['MANDATORY', 'OPTIONAL', 'MANDATORY_TIMEOUT', 'MANDATORY_FORCED_TIMEOUT', 'AGENT_REQUESTED'],
      },
      acwSettingsTimeoutMs: {
         type: DataTypes.INTEGER,
      },
      enableManualAssignment: {
         type: DataTypes.STRING(5),
      },
      agentOwnedRoutingEnableAgentOwnedCallbacks: {
         type: DataTypes.STRING(5),
      },
      agentOwnedRoutingMaxOwnedCallbackHours: {
         type: DataTypes.INTEGER,
      },
      agentOwnedRoutingMaxOwnedCallbackDelayHours: {
         type: DataTypes.INTEGER,
      },
      defaultScriptsCallId: {
         type: DataTypes.UUID,
      },
      defaultScriptsEmailId: {
         type: DataTypes.UUID,
      },
      outboundEmailAddressDomainId: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('outboundEmailAddressDomainId', value && value.substring(0, 255));
         },
      },
      outboundEmailAddressRouteId: {
         type: DataTypes.UUID,
      },
      outboundEmailAddressRoutePattern: {
         type: DataTypes.STRING(255),
         set(value) {
            this.setDataValue('outboundEmailAddressRoutePattern', value && value.substring(0, 255));
         },
      },
      mediaSettings: {
         type: DataTypes.TEXT,
      },
   },
   {
      sequelize: SequelizeFactory.getInstance(),
      modelName: 'Queue',
      tableName: 'Gen_Queue',
   },
);

export default Queue;
