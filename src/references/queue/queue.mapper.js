// noinspection JSUnresolvedVariable

import CustomError from '../../utils/errors/CustomError.js';

/**
 * Utility class for mapping raw Queue API entities to a structured database/application format.
 */
export default class QueueMapper {
   /**
    * Maps an array of raw queue objects to a formatted object array.
    *
    * @param {Array<Object>} payload - The raw payload received from the API.
    * @returns {Array<Object>} A list of formatted queue objects.
    * @throws {Object} Throws a CustomError object if the payload is invalid.
    */
   static map(payload) {
      if (!Array.isArray(payload) || payload.length === 0) {
         throw new CustomError({
            message: `Invalid payload: Expected a non-empty array.`,
            className: 'QueueMapper',
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
         autoAnswerOnly: String(!!entity.autoAnswerOnly),
         enableTranscription: String(!!entity.enableTranscription),
         callingPartyName: entity.callingPartyName,
         callingPartyNumber: entity.callingPartyNumber,
         acwSettingsWrapUpPrompt: entity.acwSettings?.wrapupPrompt,
         acwSettingsTimeoutMs: entity.acwSettings?.timeoutMs,
         enableManualAssignment: String(!!entity.enableManualAssignment),
         agentOwnedRoutingEnableAgentOwnedCallbacks: String(!!entity.agentOwnedRouting?.enableAgentOwnedCallbacks),
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
