// noinspection JSUnresolvedVariable

import * as path from "path";
import Constants from "../utils/constants.js";
import FileManager from "../utils/fileManager.js";
import CustomError from "../utils/customErrors/customError.js";
import TimeIntervalManager from "../utils/timeIntervalManager.js";
import dayjs from "dayjs";


export default class ConverDetailMapper {
   static #CLASS_NAME = "ConverDetailMapper";
   static #fieldsFilePath = path.join(Constants.ROOT_FOLDER, "ivrRequiredFields");

   static async map(payload) {
      const conversationId = payload.id;

      if (JSON.stringify(payload) === "{}") {
         throw new CustomError({
                                  message: `Invalid payload: Payload is empty.`,
                                  className: this.#CLASS_NAME,
                                  functionName: "map",
                                  parameters: {conversationId}
                               }).toObject();
      }

      if (!payload.participants || payload.participants.length === 0) {
         throw new CustomError({
                                  message: `Invalid payload: Participants is empty.`,
                                  className: this.#CLASS_NAME,
                                  functionName: "map",
                                  parameters: {conversationId}
                               }).toObject();
      }

      const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
      let participantData = [];
      let attributeData = [];

      for (const participant of payload.participants) {
         const participantObj = {
            stageTime: now,
            conversationId,
            conversationStartTime: payload.startTime,
            conversationEndTime: payload.endTime,
            conversationDuration: TimeIntervalManager.calculateDuration(payload.startTime, payload.endTime),
            maxParticipants: payload.maxParticipants,
            conversationState: payload.state,
            conversationRecordingState: payload.recordingState,
            conversationAddress: payload.address,
            externalTag: payload.externalTag,
            participantId: participant.id,
            participantName: participant.name,
            participantType: participant.participantType,
            participantAddress: participant.address,
            startTime: participant.startTime,
            endTime: participant.endTime,
            connectedTime: participant.connectedTime,
            purpose: participant.purpose,
            genAgentId: participant.userId,
            teamId: participant.teamId,
            externalContactId: participant.externalContactId,
            externalOrganizationId: participant.externalOrganizationId,
            flaggedReason: participant.flaggedReason,
            monitoredParticipantId: participant.monitoredParticipantId,
            consultParticipantId: participant.consultParticipantId,
            coachedParticipantId: participant.coachedParticipantId,
            queueId: participant.queueId,
            queueName: participant.queueName,
            groupId: participant.groupId,
            wrapupRequired: participant.wrapupRequired,
            wrapupExpected: participant.wrapupExpected,
            wrapupSkipped: participant.wrapupSkipped,
            wrapupPrompt: participant.wrapupPrompt,
            wrapupTimeoutMs: participant.wrapupTimeoutMs,
            wrapupCode: participant.wrapup?.code,
            wrapupNote: participant.wrapup?.notes,
            wrapupDurationSeconds: participant.wrapup?.durationSeconds,
            wrapupEndTime: participant.wrapup?.endTime,
            startAcwTime: participant.startAcwTime,
            endAcwTime: participant.endAcwTime,
            alertingTimeoutMs: participant.alertingTimeoutMs, // It is ENUM: "requested|active|paused|stopped|error|timeout"
            screenRecordingState: participant.screenRecordingState,
            ani: participant.ani,
            aniName: participant.aniName,
            dnis: participant.dnis,
            locale: participant.locale,
         };

         //Output the extracted obj
         participantData.push(participantObj);

         //Store the participant attributes data for next level extraction
         if (participant.attributes && JSON.stringify(participant.attributes) !== "{}") {
            attributeData.push({
                                  stageTime: now,
                                  conversationId,
                                  participantId: participantObj.participantId,
                                  queueId: participantObj.queueId,
                                  connectedTime: participantObj.connectedTime,
                                  endTime: participantObj.endTime,
                                  attributes: participant.attributes,
                               });
         }
      }

      return {
         participantData,
         attributeData
      };
   }

   static async mapAttributesToEav(participants) {
      const requiredFields = await this.#getRequiredFields();

      return participants.flatMap((participant) => {
         const duration = TimeIntervalManager.calculateDuration(participant.connectedTime, participant.endTime);

         return Object.entries(participant.attributes)
                      .filter(([key, value]) => {
                         return key && value && requiredFields.has(key);
                      })
                      .map(([key, value]) => {
                         return {
                            conversationId: participant.conversationId,
                            participantId: participant.participantId,
                            queueId: participant.queueId,
                            connectedTime: participant.connectedTime,
                            endTime: participant.endTime,
                            duration,
                            attributeKey: key,
                            attributeValue: value
                         };
                      });
      });
   }

   static async #getRequiredFields() {
      const fields = await FileManager.readFile(this.#fieldsFilePath, "json");

      return new Set(fields);
   }
}

// Sample usage
// try {
//    const payloadPath = path.join(Constants.ROOT_FOLDER, "info", "0ae94f10-5323-4d9f-8f1a-070bc81fd5c3");
//    const payload = await FileManager.readFile(payloadPath, "json");
//    const {
//       participantData,
//       attributeData
//    } = await ConversationMapper.map(payload);
//    const mappedEavData = await ConversationMapper.mapAttributesToEav(attributeData);
//    // console.log("mappedEavData: ", mappedEavData);
//    const refactoredData = ConversationMapper.refactorToTxtFormat(mappedEavData);
//    console.log("refactoredDataData: ", refactoredData);
// } catch (err) {
//    console.log("error: ", err);
// }