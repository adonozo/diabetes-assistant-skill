import { HandlerInput } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getLocalizedStrings } from "../utils/intent";

export class HelpHandler extends AbstractIntentHandler {
    intentName = 'AMAZON.HelpIntent';

    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName;
    }

    handle(handlerInput: HandlerInput): Response {
        const localizedMessages = getLocalizedStrings(handlerInput);

        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.HELP)
            .reprompt(localizedMessages.responses.HELP_REPROMPT)
            .getResponse();
    }
}
