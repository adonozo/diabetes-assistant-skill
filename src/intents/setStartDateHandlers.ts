import { IntentRequest, Response } from "ask-sdk-model";
import { getLocalizedStrings, sessionValues, throwWithMessage } from "../utils/intent";
import { getTimingStartDate, getTimingStartTime, timingNeedsStartDate, timingNeedsStartTime } from "../fhir/timing";
import { setDosageStartDate, setServiceRequestStartDate } from "../api/patients";
import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstractMessage";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";
import { MissingDateSetupRequest } from "../types";

export class SetStartDateTimeContinueHandler extends AbstractIntentHandler {
    intentName = 'SetStartDateTimeIntent';

    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const currentIntent = request.intent;

        const missingDateRequest = sessionRequestMissingDate(handlerInput);

        if (!timingNeedsStartTime(missingDateRequest.timing) && !currentIntent.slots!.time.value) {
            currentIntent.slots!.time.value = getTimingStartTime(missingDateRequest.timing);
            currentIntent.slots!.time.confirmationStatus = 'CONFIRMED';
        }

        if (!timingNeedsStartDate(missingDateRequest.timing) && !currentIntent.slots!.date.value) {
            currentIntent.slots!.date.value = getTimingStartDate(missingDateRequest.timing)?.toISODate() ?? undefined;
        }

        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
}

export class SetStartDateTimeCompletedHandler extends AbstractIntentHandler {
    intentName = 'SetStartDateTimeIntent';

    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState === "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);

        return this.handleIntent(handlerInput, userInfo.username)
    }

    private async handleIntent(handlerInput: HandlerInput, patientEmail: string): Promise<Response> {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const localizedMessages = getLocalizedStrings(handlerInput);
        const missingDate = sessionRequestMissingDate(handlerInput);

        const {date, time} = getIntentData(handlerInput);
        const startDateTime = {startDate: date, startTime: time + ':00'};

        switch (missingDate.type) {
            case 'ServiceRequest':
                await setServiceRequestStartDate(patientEmail, missingDate.id, startDateTime)
                break;
            case 'MedicationRequest':
                await setDosageStartDate(patientEmail, missingDate.id, startDateTime);
                break;
        }

        const {speakOutput, reprompt} = getStartDateConfirmedResponse(session, missingDate.name, localizedMessages);
        delete session[sessionValues.requestMissingDate];
        handlerInput.attributesManager.setSessionAttributes(session);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
}

function getIntentData(handlerInput: HandlerInput): DateTimeIntentData {
    const request = handlerInput.requestEnvelope.request as IntentRequest;
    const currentIntent = request.intent;
    const missingDateRequest = sessionRequestMissingDate(handlerInput);

    const date = currentIntent.slots!.date.value
        ?? getTimingStartDate(missingDateRequest.timing)?.toISODate()
        ?? throwWithMessage('Date was not set in intent');
    const time = currentIntent.slots!.time.value
        ?? getTimingStartTime(missingDateRequest.timing)
        ?? throwWithMessage('Time was not set in intent');

    return timingNeedsStartTime(missingDateRequest.timing) ? {date, time} : {date};
}

function sessionRequestMissingDate(handlerInput: HandlerInput): MissingDateSetupRequest {
    const session = handlerInput.attributesManager.getSessionAttributes();
    const missingDate = session[sessionValues.requestMissingDate];
    if (!missingDate) {
        throwWithMessage('SetStartDateTimeIntent - session does not have a requestMissingDate');
    }

    return missingDate as MissingDateSetupRequest;
}

function getStartDateConfirmedResponse(
    session: { [p: string]: any },
    requestName: string,
    localizedMessages: AbstractMessage
): ConfirmedResponse {
    let speakOutput = localizedMessages.getConfirmationDateText(requestName);
    let reprompt = localizedMessages.responses.HELP;

    if (session[sessionValues.createRemindersIntent]) {
        reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
    } else if (session[sessionValues.carePlanIntent] || session[sessionValues.getMedicationToTakeIntent]) {
        reprompt = localizedMessages.responses.QUERY_SETUP;
    }

    speakOutput = `${speakOutput} ${reprompt}`;
    return {speakOutput, reprompt}
}

type DateTimeIntentData = { date: string, time?: string };

type ConfirmedResponse = { speakOutput: string, reprompt: string }
