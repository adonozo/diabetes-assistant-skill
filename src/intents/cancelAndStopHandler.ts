import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getLocalizedStrings } from "../utils/intent";

export class CancelAndStopHandler implements RequestHandler {
    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent'
                || request.intent.name === 'AMAZON.StopIntent');
    }

    handle(handlerInput: HandlerInput): Response {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.STOP;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}
