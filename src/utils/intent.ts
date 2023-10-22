import { HandlerInput } from "ask-sdk-core";
import { AbstractMessage } from "../strings/abstractMessage";
import { MessagesEs } from "../strings/messages.es";
import { MessagesEn } from "../strings/messages.en";

export function getLocalizedStrings(handlerInput: HandlerInput): AbstractMessage {
    const locale = handlerInput.requestEnvelope.request.locale;
    switch (locale) {
        case MessagesEs.locale:
            return new MessagesEs();
        case MessagesEn.locale:
            return new MessagesEn();
        default:
            throw new Error(`Locale ${locale} not supported.`);
    }
}

export const sessionValues = {
    requestMissingDate: 'RequestMissingDate',
    createRemindersIntent: 'CreateRemindersIntent',
    getMedicationToTakeIntent: 'GetMedicationToTakeIntent',
    carePlanIntent: 'CarePlanIntent',
}

export function throwWithMessage(message: string): never {
    throw new Error(message);
}
