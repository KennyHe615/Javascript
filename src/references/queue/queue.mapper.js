// noinspection JSUnresolvedVariable

import CustomError from '../../utils/errors/CustomError.js';

export default class QueueMapper {
   static map(payload) {
      if (!payload || payload.length === 0) {
         throw new CustomError({
            message: `Invalid payload: Payload is empty.`,
            className: 'QueueMapper',
            functionName: 'map',
         }).toObject();
      }

      return payload.map((entity) => ({
         queueId: entity.id,
         queueName: entity.name,
         divisionId: entity.division?.id,
         divisionName: entity.division?.name,
         description: entity.description,
         dateCreated: entity.dateCreated,
         dateModified: entity.dateModified,
         modifiedBy: entity.modifiedBy,
         createdBy: entity.createdBy,
         memberCount: entity.memberCount,
         userMemberCount: entity.userMemberCount,
         joinedMemberCount: entity.joinedMemberCount,
         skillEvaluationMethod: entity.skillEvaluationMethod,
         queueFlowId: entity.queueFlow?.id,
         queueFlowName: entity.queueFlow?.name,
         whisperPromptId: entity.whisperPrompt?.id,
         whisperPromptName: entity.whisperPrompt?.name,
         autoAnswerOnly: entity.autoAnswerOnly ? 'true' : 'false',
         enableTranscription: entity.enableTranscription ? 'true' : 'false',
         callingPartyName: entity.callingPartyName,
         callingPartyNumber: entity.callingPartyNumber,
         acwSettingsWrapUpPrompt: entity.acwSettings?.wrapupPrompt,
         acwSettingsTimeoutMs: entity.acwSettings?.timeoutMs,
         enableManualAssignment: entity.enableManualAssignment ? 'true' : 'false',
         agentOwnedRoutingEnableAgentOwnedCallbacks: entity.agentOwnedRouting?.enableAgentOwnedCallbacks ? 'true' : 'false',
         agentOwnedRoutingMaxOwnedCallbackHours: entity.agentOwnedRouting?.maxOwnedCallbackHours,
         agentOwnedRoutingMaxOwnedCallbackDelayHours: entity.agentOwnedRouting?.maxOwnedCallbackDelayHours,
         defaultScriptsCallId: entity.defaultScripts?.CALL?.id,
         defaultScriptsEmailId: entity.defaultScripts?.EMAIL?.id,
         outboundEmailAddressDomainId: entity.outboundEmailAddress?.['domain']?.id,
         outboundEmailAddressRouteId: entity.outboundEmailAddress?.route?.id,
         outboundEmailAddressRoutePattern: entity.outboundEmailAddress?.route?.pattern,
         mediaSettings: entity.mediaSettings ? JSON.stringify(entity.mediaSettings) : null,
      }));
   }
}
