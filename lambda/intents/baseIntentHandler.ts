import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { reminderDirective } from "../utils/reminder";
import { getLocalizedStrings } from "../utils/intent";

export abstract class BaseIntentHandler implements RequestHandler {
    abstract intentName: string;

    abstract canHandle(input: HandlerInput): Promise<boolean> | boolean;

    abstract handle(input: HandlerInput): Promise<Response> | Response;

    protected requestAccountLink = (handlerInput: HandlerInput): Response => {
        const localizedMessages = getLocalizedStrings(handlerInput);
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.ACCOUNT_LINK)
            .withLinkAccountCard()
            .getResponse();
    }

    protected requestReminderPermission = (handlerInput: HandlerInput): Response => {
        const localizedMessages = getLocalizedStrings(handlerInput);
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.REMINDER_PERMISSIONS)
            .addDirective(reminderDirective)
            .getResponse();
    }
}