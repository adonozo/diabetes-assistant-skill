import { getLocalizedStrings } from "../utils/intent";
import { getObservationsFromBundle } from "../fhir/observation";
import { HandlerInput } from "ask-sdk-core";
import { Bundle } from "fhir/r5";
import { IntentRequest, Response } from "ask-sdk-model";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";
import {
    getTimezoneOrDefault,
    utcDateFromLocalDate,
    utcDateTimeFromLocalDateAndTime,
    utcTimeFromLocalTime
} from "../utils/time";
import { getObservationsOnDate } from "../api/patients";
import { alexaTimingToFhirTiming } from "../fhir/timing";
import { TimingEvent } from "../enums";
import { DateTime } from "luxon";

export class GetGlucoseLevelDateAndTimingHandler extends AbstractIntentHandler {
    intentName = 'GetGlucoseLevelIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
            && !!request.intent.slots?.date.value
            && !request.intent.slots?.time.value
            && !!request.intent.slots?.timing.value;
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        let userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const timezone = await getTimezoneOrDefault(handlerInput);

        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const date = request.intent.slots!.date.value!;
        const timing = request.intent.slots!.timing.value!;

        const timingCode = localizedMessages.stringToTimingCode(timing);
        const utcDate = utcDateFromLocalDate(date, timezone)!;
        const bundle = await getObservationsOnDate(userInfo.username, utcDate, timingCode, timezone);
        return handle(handlerInput, bundle, timezone);
    }
}

export class GetGlucoseLevelDateHandler extends AbstractIntentHandler {
    intentName = 'GetGlucoseLevelIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
            && !!request.intent.slots?.date.value
            && !!request.intent.slots?.time.value
            && !request.intent.slots?.timing.value;
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        let userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const timezone = await getTimezoneOrDefault(handlerInput);
        const request = handlerInput.requestEnvelope.request as IntentRequest;

        const date = request.intent.slots!.date.value!;
        const time = request.intent.slots!.time.value!;
        const timing = alexaTimingToFhirTiming(time);
        const dateTime = timing === TimingEvent.EXACT
            ? utcDateTimeFromLocalDateAndTime(date, time, timezone)!
            : utcDateFromLocalDate(date, timezone)!;
        const bundle = await getObservationsOnDate(userInfo.username, dateTime, timing, timezone);
        return handle(handlerInput, bundle, timezone);
    }
}

export class GetGlucoseLevelTimeHandler extends AbstractIntentHandler {
    intentName = 'GetGlucoseLevelIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
            && !!request.intent.slots?.date.value
            && !request.intent.slots?.time.value
            && !request.intent.slots?.timing.value;
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        let userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const timezone = await getTimezoneOrDefault(handlerInput);
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const date = request.intent.slots?.date.value!;
        const utcDate = utcDateFromLocalDate(date, timezone)!;
        const bundle = await getObservationsOnDate(userInfo.username, utcDate, TimingEvent.ALL_DAY, timezone);
        return handle(handlerInput, bundle, timezone);
    }
}

export class GetGlucoseLevelDateAndTimeHandler extends AbstractIntentHandler {
    intentName = 'GetGlucoseLevelIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
            && request.dialogState !== "COMPLETED"
            && !request.intent.slots?.date.value
            && !!request.intent.slots?.time.value
            && !request.intent.slots?.timing.value;
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        let userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const timezone = await getTimezoneOrDefault(handlerInput);
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const time = request.intent.slots?.time.value!;
        const timing = alexaTimingToFhirTiming(time);
        const dateTime = timing === TimingEvent.EXACT
            ? utcTimeFromLocalTime(time, timezone)
            : DateTime.utc().toISO();
        const bundle = await getObservationsOnDate(userInfo.username, dateTime!, timing, timezone);
        return handle(handlerInput, bundle, timezone);
    }
}

export async function handle(handlerInput: HandlerInput, bundle: Bundle, timezone: string): Promise<Response> {
    const localizedMessages = getLocalizedStrings(handlerInput);
    if (!bundle.entry || bundle.entry.length === 0) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.NO_GLUCOSE_RECORDS_FOUND)
            .getResponse();
    }

    const observations = getObservationsFromBundle(bundle);
    const message = localizedMessages.makeTextFromObservations(observations, timezone);
    return handlerInput.responseBuilder
        .speak(message)
        .getResponse();
}
