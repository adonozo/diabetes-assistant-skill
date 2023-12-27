import { IntentRequest, Response } from "ask-sdk-model";
import { getLocalizedStrings, localeFromInput, sessionValues, throwWithMessage } from "../utils/intent";
import { getTimingStartDate, getTimingStartTime, timingNeedsStartDate, timingNeedsStartTime } from "../fhir/timing";
import { PatientClient } from "../api/patients";
import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstractMessage";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";
import { MissingDateSetupRequest } from "../types";
import { DateTime } from "luxon";
import { getTimezoneOrDefault } from "../utils/time";

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
            currentIntent.slots!.date.value = getTimingStartDate(missingDateRequest.timing)?.toISODate()
                ?? DateTime.now().toISODate()!;
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

        const session = handlerInput.attributesManager.getSessionAttributes();
        const localizedMessages = getLocalizedStrings(handlerInput);
        const missingDate = sessionRequestMissingDate(handlerInput);

        await submitStartDateTime(handlerInput, userInfo.username, missingDate);

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

async function submitStartDateTime(
    handlerInput: HandlerInput,
    patientEmail: string,
    missingDateRequest: MissingDateSetupRequest
): Promise<void> {
    const timezone = await getTimezoneOrDefault(handlerInput);
    const {date, time} = getIntentData(handlerInput);
    const amendedDate = amendFutureDate(timezone, date);
    const startDateTime = {startDate: amendedDate, startTime: time + ':00'};
    const patientClient = new PatientClient(localeFromInput(handlerInput));

    switch (missingDateRequest.type) {
        case 'ServiceRequest':
            await patientClient.setServiceRequestStartDate(patientEmail, missingDateRequest.id, startDateTime)
            break;
        case 'MedicationRequest':
            await patientClient.setDosageStartDate(patientEmail, missingDateRequest.id, startDateTime);
            break;
    }
}

/**
 * Alexa adds one year of a given past date, for example, if today is Feb 1 and patient said Jan 30, the date will be
 * a Jan 30 of the next year
 * @param timezone The patient's timezone
 * @param date The date given by a patient
 */
function amendFutureDate(timezone: string, date: string): string {
    const startDate = DateTime.fromISO(date, {zone: timezone});
    const difference = startDate.diffNow('months');
    return difference.months > 6
        ? startDate.minus({year: 1}).toISODate() ?? throwWithMessage(`Unable to amend date: ${date}`)
        : date;
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
    } else if (session[sessionValues.carePlanIntent] || session[sessionValues.medicationToTakeIntent]) {
        reprompt = localizedMessages.responses.QUERY_SETUP;
    }

    speakOutput = `${speakOutput} ${reprompt}`;
    return {speakOutput, reprompt}
}

type DateTimeIntentData = { date: string, time?: string };

type ConfirmedResponse = { speakOutput: string, reprompt: string }
