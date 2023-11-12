import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Intent, IntentRequest, Response } from "ask-sdk-model";
import { reminderDirective } from "../utils/reminder";
import { getLocalizedStrings, sessionValues } from "../utils/intent";
import { CustomRequest } from "../types";
import { AbstractMessage } from "../strings/abstractMessage";
import { getTimingStartDate } from "../fhir/timing";
import { DateTime } from "luxon";

export abstract class AbstractIntentHandler implements RequestHandler {
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
            .withAskForPermissionsConsentCard(["alexa::alerts:reminders:skill:readwrite"])
            .getResponse();
    }

    protected switchContextToStartDateTime(
        handlerInput: HandlerInput,
        requestWithMissingDate: CustomRequest,
        localizedMessages: AbstractMessage
    ): Response {
        const attributesManager = handlerInput.attributesManager;
        const session = attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const intent = request.intent;
        session[intent.name] = intent;
        session[sessionValues.requestMissingDate] = requestWithMissingDate;
        attributesManager.setSessionAttributes(session);

        const startDate = getTimingStartDate(requestWithMissingDate.timing);
        const delegatedIntent = this.getDelegatedSetStartDateTimeIntent(startDate);

        const requiredSetup = localizedMessages.getStartDatePrompt(requestWithMissingDate);
        return handlerInput.responseBuilder
            .addDelegateDirective(delegatedIntent)
            .speak(requiredSetup)
            .getResponse();
    }

    protected buildErrorResponse(handlerInput: HandlerInput, localizedMessages: AbstractMessage): Response {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.ERROR)
            .getResponse();
    }

    private getDelegatedSetStartDateTimeIntent(startDate?: DateTime): Intent {
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
            name: 'SetStartDateTimeIntent',
            confirmationStatus: "NONE",
            slots: slots
        }
    }
}
