import { Intent, IntentRequest, Response } from "ask-sdk-model";
import { HandlerInput } from "ask-sdk-core";
import * as strings from "../strings/strings"
import { sessionValues } from "./helper";
import { getTimingStartDate, timingNeedsStartDate } from "../fhir/timing";
import { RequestNeedingTiming } from "../types";
import { MessagesInterface } from "../strings/messages-interface";
import { DateTime } from "luxon";

export function getDelegatedSetStartDateIntent(startDate?: DateTime): Intent {
    const slots: any = startDate ?
        {
            date: {
                name: 'date',
                value: startDate,
                confirmationStatus: 'NONE'
            }
        }
        : {};

    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: slots
    }
}

export function getDelegatedSetStartDateWithTimeIntent(healthRequestName: string, time: string): Intent {
    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: {
            healthRequest: {
                name: 'healthRequest',
                value: healthRequestName,
                confirmationStatus: 'NONE',
            },
            healthRequestTime: {
                name: 'healthRequestTime',
                value: time,
                confirmationStatus: 'CONFIRMED',
            }
        }
    }
}

export function getLocalizedStrings(handlerInput: HandlerInput): MessagesInterface {
    return strings.getLocalizedStrings(handlerInput.requestEnvelope.request.locale);
}

export function switchContextToStartDate(
    handlerInput: HandlerInput,
    requestWithMissingDate: RequestNeedingTiming,
    userTimeZone: string,
    localizedMessages: MessagesInterface
): Response {
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const request = handlerInput.requestEnvelope.request as IntentRequest;
    const intent = request.intent;
    session[intent.name] = intent;
    session[sessionValues.requestMissingDate] = requestWithMissingDate;
    attributesManager.setSessionAttributes(session);

    const hasStartDate = !timingNeedsStartDate(requestWithMissingDate.timing);
    const delegatedIntent = hasStartDate ?
        getDelegatedSetStartDateIntent(getTimingStartDate(requestWithMissingDate.timing))
        : getDelegatedSetStartDateIntent();

    const requiredSetup = localizedMessages.getStartDatePrompt(requestWithMissingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

export function buildErrorResponse(handlerInput: HandlerInput, localizedMessages: MessagesInterface): Response {
    return handlerInput.responseBuilder
        .speak(localizedMessages.responses.ERROR)
        .getResponse();
}
