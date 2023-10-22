import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Intent, IntentRequest, Response } from "ask-sdk-model";
import { reminderDirective } from "../utils/reminder";
import { getLocalizedStrings } from "../utils/intent";
import { CustomRequest } from "../types";
import { AbstractMessage } from "../strings/abstractMessage";
import { sessionValues } from "../utils/helper";
import { getTimingStartDate, timingNeedsStartDate } from "../fhir/timing";
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
            .getResponse();
    }

    protected switchContextToStartDate(
        handlerInput: HandlerInput,
        requestWithMissingDate: CustomRequest,
        userTimeZone: string,
        localizedMessages: AbstractMessage
    ): Response {
        const attributesManager = handlerInput.attributesManager;
        const session = attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const intent = request.intent;
        session[intent.name] = intent;
        session[sessionValues.requestMissingDate] = requestWithMissingDate;
        attributesManager.setSessionAttributes(session);

        const hasStartDate = !timingNeedsStartDate(requestWithMissingDate.timing);
        const delegatedIntent = hasStartDate ?
            this.getDelegatedSetStartDateIntent(getTimingStartDate(requestWithMissingDate.timing))
            : this.getDelegatedSetStartDateIntent();

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

    getDelegatedSetStartDateIntent(startDate?: DateTime): Intent {
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
            name: 'SetStartDateIntent',
            confirmationStatus: "NONE",
            slots: slots
        }
    }
}
