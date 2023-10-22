import { HandlerInput } from "ask-sdk-core";
import * as strings from "../strings/strings"
import { AbstractMessage } from "../strings/abstractMessage";

export function getLocalizedStrings(handlerInput: HandlerInput): AbstractMessage {
    return strings.getLocalizedStrings(handlerInput.requestEnvelope.request.locale);
}

export function throwWithMessage(message: string): never {
    throw new Error(message);
}
