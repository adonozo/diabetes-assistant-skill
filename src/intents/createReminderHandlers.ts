import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { getLocalizedStrings, localeFromInput, throwWithMessage } from "../utils/intent";
import { CarePLanClient } from "../api/carePlan";
import { requestListFromBundle } from "../fhir/carePlan";
import { FhirResource } from "fhir/r5";
import { HandlerInput } from "ask-sdk-core";
import { IntentRequest, Response, services } from "ask-sdk-model";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";
import { RemindersBuilder } from "../reminders/remindersBuilder";
import ReminderRequest = services.reminderManagement.ReminderRequest;
import { AbstractMessage } from "../strings/abstractMessage";

export class CreateRemindersInProgressHandler extends AbstractIntentHandler {
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
        const requests = await getActiveRequests(handlerInput, username);
        const customResource = requestsNeedStartDate(requests);
        if (customResource) {
            const localizedMessages = getLocalizedStrings(handlerInput);
            const userTimezone = await getTimezoneOrDefault(handlerInput);
            return this.switchContextToStartDateTime(handlerInput,
                customResource,
                userTimezone,
                localizedMessages);
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
}

export class CreateRemindersHandler extends AbstractIntentHandler {
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
        const messages = getLocalizedStrings(handlerInput);
        const userTimeZone = await getTimezoneOrDefault(handlerInput);

        const requests = await getActiveRequests(handlerInput, username);
        const customResource = requestsNeedStartDate(requests);
        if (customResource) {
            return this.switchContextToStartDateTime(handlerInput,
                customResource,
                userTimeZone,
                messages);
        }

        // Create reminders
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const time = request.intent.slots?.time.value ?? throwWithMessage('Time was not recorded in the intent');
        const requestReminders = new RemindersBuilder(requests, time, userTimeZone, messages).build();
        const speakOutputResponse = await this.CreateReminders(handlerInput, requestReminders, messages);

        return handlerInput.responseBuilder
            .speak(speakOutputResponse)
            .getResponse();
    }

    private async CreateReminders(
        handlerInput: HandlerInput,
        requestReminders: ReminderRequest[],
        messages: AbstractMessage
    ): Promise<string> {
        const remindersApiClient = handlerInput.serviceClientFactory!.getReminderManagementServiceClient();
        let speakOutput = messages.responses.SUCCESSFUL_REMINDERS;

        for (const reminder of requestReminders) {
            try {
                await remindersApiClient.createReminder(reminder);
            } catch (e) {
                console.log("Couldn't create reminder", e);
                speakOutput = messages.responses.REMINDER_NOT_CREATED;
            }
        }

        return speakOutput;
    }
}

async function getActiveRequests(handlerInput: HandlerInput, username: string): Promise<FhirResource[]> {
    const client = new CarePLanClient(localeFromInput(handlerInput));
    const requestBundle = await client.getActiveCarePlan(username);
    return requestListFromBundle(requestBundle);
}
