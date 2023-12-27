import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstractMessage";
import { isAppLocale, messagesForLocale } from "./helper";

export function getLocalizedStrings(handlerInput: HandlerInput): AbstractMessage {
    const locale = handlerInput.requestEnvelope.request.locale;
    return messagesForLocale(locale);
}

export function localeFromInput(handlerInput: HandlerInput): string {
    const locale = handlerInput.requestEnvelope.request.locale;
    if (!isAppLocale(locale)) {
        throw new Error(`Locale ${locale} not supported.`);
    }

    return locale;
}

export const sessionValues = {
    requestMissingDate: 'RequestMissingDate',
    createRemindersIntent: 'CreateRemindersIntent',
    medicationToTakeIntent: 'MedicationToTakeIntent',
    carePlanIntent: 'CarePlanIntent',
}

export function throwWithMessage(message: string): never {
    throw new Error(message);
}
