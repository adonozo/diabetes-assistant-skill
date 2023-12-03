import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstractMessage";
import { messagesForLocale } from "./helper";

export function getLocalizedStrings(handlerInput: HandlerInput): AbstractMessage {
    const locale = handlerInput.requestEnvelope.request.locale;
    return messagesForLocale(locale);
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
