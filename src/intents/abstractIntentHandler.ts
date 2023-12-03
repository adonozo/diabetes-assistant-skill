import { HandlerInput, RequestHandler } from "ask-sdk-core";
import { Intent, IntentRequest, Response } from "ask-sdk-model";
import { reminderDirective } from "../utils/reminder";
import { getLocalizedStrings, sessionValues, throwWithMessage } from "../utils/intent";
import { DateSlot, MissingDateSetupRequest } from "../types";
import { AbstractMessage } from "../strings/abstractMessage";
import { DateTime } from "luxon";
import { timingNeedsStartDate, timingNeedsStartTime } from "../fhir/timing";

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
        requestWithMissingDate: MissingDateSetupRequest,
        timezone: string,
        localizedMessages: AbstractMessage
    ): Response {
        const attributesManager = handlerInput.attributesManager;
        const session = attributesManager.getSessionAttributes();
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const intent = request.intent;
        session[intent.name] = intent;
        session[sessionValues.requestMissingDate] = requestWithMissingDate;
        attributesManager.setSessionAttributes(session);

        const delegatedIntent = this.getDelegatedSetStartDateTimeIntent();
        const slot = this.getElicitSlot(requestWithMissingDate);

        const now = DateTime.local();
        const requiredSetupPrompt = localizedMessages.promptMissingRequest(requestWithMissingDate, now, slot);
        const setupRePrompt = localizedMessages.rePromptMissingRequest(now, slot);


        return handlerInput.responseBuilder
            .addElicitSlotDirective(slot, delegatedIntent)
            .speak(requiredSetupPrompt)
            .reprompt(setupRePrompt)
            .getResponse();
    }

    protected buildErrorResponse(handlerInput: HandlerInput, localizedMessages: AbstractMessage): Response {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.ERROR)
            .getResponse();
    }

    private getDelegatedSetStartDateTimeIntent(): Intent {
        return {
            name: 'SetStartDateTimeIntent',
            confirmationStatus: "NONE",
            slots: {}
        }
    }

    private getElicitSlot(request: MissingDateSetupRequest): DateSlot {
        if (timingNeedsStartDate(request.timing)) {
            return 'date';
        }

        if (timingNeedsStartTime(request.timing)) {
            return 'time';
        }

        throwWithMessage('Could not get determine whether resource needs date or time');
    }
}
