import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getLocalizedStrings } from "../strings/strings";
import { reminderDirective } from "../utils/reminder";

export abstract class BaseIntentHandler implements RequestHandler {
    abstract intentName: string;

    abstract canHandle(input: HandlerInput): Promise<boolean> | boolean;

    abstract handle(input: HandlerInput): Promise<Response> | Response;

    requestAccountLink = (handlerInput: HandlerInput): Response => {
        const localizedMessages = getLocalizedStrings(handlerInput);
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.ACCOUNT_LINK)
            .withLinkAccountCard()
            .getResponse();
    }

    requestReminderPermission = (handlerInput: HandlerInput): Response => {
        const localizedMessages = getLocalizedStrings(handlerInput);
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.REMINDER_PERMISSIONS)
            .addDirective(reminderDirective)
            .getResponse();
    }
}
