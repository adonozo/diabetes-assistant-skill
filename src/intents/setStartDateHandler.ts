import { IntentRequest, Response } from "ask-sdk-model";
import { sessionValues } from "../utils/helper";
import { buildErrorResponse, getLocalizedStrings, throwWithMessage } from "../utils/intent";
import { timingNeedsStartTime } from "../fhir/timing";
import { setDosageStartDate, setServiceRequestStartDate } from "../api/patients";
import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstract-message";
import { BaseIntentHandler } from "./baseIntentHandler";
import { getAuthorizedUser } from "../auth";

export class SetStartDateInitialIntentHandler extends BaseIntentHandler {
    intentName = 'SetStartDateIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
}

export class SetStartDateInProgressIntentHandler extends BaseIntentHandler {
    intentName = 'SetStartDateIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && !!request.intent.slots?.date.value
            && !request.intent.slots?.healthRequestTime.value
            && request.dialogState !== "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return this.handleInProgress(handlerInput, userInfo.username);
    }

    private async handleInProgress(handlerInput: HandlerInput, patientEmail: string): Promise<Response> {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const localizedMessages = getLocalizedStrings(handlerInput);
        const missingDate = session[sessionValues.requestMissingDate];
        if (!missingDate) {
            return buildErrorResponse(handlerInput, localizedMessages);
        }

        if (timingNeedsStartTime(missingDate.timing)) {
            return handlerInput.responseBuilder
                .addElicitSlotDirective("healthRequestTime")
                .getResponse();
        }

        const {date} = getIntentData(handlerInput);
        switch (missingDate.type) {
            case 'ServiceRequest':
                await setServiceRequestStartDate(patientEmail, missingDate.id, {startDate: date})
                break;
            case 'MedicationRequest':
                await setDosageStartDate(patientEmail, missingDate.id, {startDate: date});
                break;
        }

        const {speakOutput, reprompt} = getStartDateConfirmedResponse(session, '', localizedMessages);
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
}

export class SetStartDateCompletedIntentHandler extends BaseIntentHandler {
    intentName = 'SetStartDateIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState === "COMPLETED"
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return this.handleIntent(handlerInput, userInfo.username)
    }

    private async handleIntent(handlerInput: HandlerInput, patientEmail: string): Promise<Response> {
        const session = handlerInput.attributesManager.getSessionAttributes();
        const missingDate = session[sessionValues.requestMissingDate];
        const localizedMessages = getLocalizedStrings(handlerInput);
        if (!missingDate) {
            return buildErrorResponse(handlerInput, localizedMessages);
        }

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
    const date = currentIntent.slots?.date.value ?? throwWithMessage('Date was not set in intent');
    const time = currentIntent.slots?.healthRequestTime.value ?? throwWithMessage('Time was not set in intent');

    return {date, time};
}

function getStartDateConfirmedResponse(
    session: {[p: string]: any},
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

type DateTimeIntentData = { date: string, time: string };

type ConfirmedResponse = { speakOutput: string, reprompt: string }
