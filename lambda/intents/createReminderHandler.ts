import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { getLocalizedStrings, switchContextToStartDate, throwWithMessage } from "../utils/intent";
import { getRemindersForRequests } from "../utils/reminder";
import { getActiveCarePlan } from "../api/carePlan";
import { requestListFromBundle } from "../fhir/carePlan";
import { FhirResource } from "fhir/r5";
import { HandlerInput } from "ask-sdk-core";
import { IntentRequest, Response } from "ask-sdk-model";
import { BaseIntentHandler } from "./baseIntentHandler";
import { getAuthorizedUser } from "../auth";

export class CreateRemindersInProgressHandler extends BaseIntentHandler {
    intentName = 'CreateRemindersIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const {permissions} = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return this.requestReminderPermission(handlerInput);
        }

        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return this.handleValidation(handlerInput, userInfo.username)
    }

    private async handleValidation(handlerInput: HandlerInput, username: string): Promise<Response> {
        const requests = await getActiveRequests(username);
        const customResource = requestsNeedStartDate(requests);
        if (customResource) {
            const userTimeZone = await getTimezoneOrDefault(handlerInput);
            const localizedMessages = getLocalizedStrings(handlerInput);
            return switchContextToStartDate(handlerInput, customResource, userTimeZone, localizedMessages);
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
}

export class CreateRemindersHandler extends BaseIntentHandler {
    intentName = 'CreateRemindersIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState === "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const {permissions} = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return this.requestReminderPermission(handlerInput);
        }

        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return this.handleIntent(handlerInput, userInfo.username)
    }

    private async handleIntent(handlerInput: HandlerInput, username: string): Promise<Response> {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const userTimeZone = await getTimezoneOrDefault(handlerInput);

        const requests = await getActiveRequests(username);
        const customResource = requestsNeedStartDate(requests);
        if (customResource) {
            return switchContextToStartDate(handlerInput, customResource, userTimeZone, localizedMessages);
        }

        // Create reminders
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const time = request.intent.slots?.time.value ?? throwWithMessage('Time was not recorded in the intent');
        const requestReminders = getRemindersForRequests({
            requests,
            time,
            timezone: userTimeZone,
            localizedMessages});
        const remindersApiClient = handlerInput.serviceClientFactory!.getReminderManagementServiceClient();
        let speakOutput = localizedMessages.responses.SUCCESSFUL_REMINDERS;

        for (const reminder of requestReminders) {
            try {
                await remindersApiClient.createReminder(reminder);
            } catch (e) {
                console.log("Couldn't create reminder", e);
                speakOutput = localizedMessages.responses.REMINDER_NOT_CREATED;
            }
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}

async function getActiveRequests(username: string): Promise<FhirResource[]> {
    const requestBundle = await getActiveCarePlan(username);
    return requestListFromBundle(requestBundle);
}
