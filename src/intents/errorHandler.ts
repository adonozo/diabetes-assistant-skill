import { HandlerInput, ErrorHandler as SdkErrorHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getLocalizedStrings } from "../utils/intent";
import { logMessage } from "../utils/helper";

export class ErrorHandler implements SdkErrorHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        return true;
    }

    handle(handlerInput: HandlerInput, error: Error): Response {
        logMessage('Error handled', error.stack);
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.ERROR;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}
