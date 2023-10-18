import {
    ErrorHandler,
    HandlerInput,
    RequestHandler,
    SkillBuilders,
} from 'ask-sdk-core';
import {
    Response,
    SessionEndedRequest,
} from 'ask-sdk-model';
import { getLocalizedStrings } from "./strings/strings";
import { CreateRemindersHandler, CreateRemindersInProgressHandler } from "./intents/createReminderHandler";
import { MedicationToTakeHandler } from "./intents/getMedicationToTakeHandler";
import {
    SetStartDateCompletedIntentHandler,
    SetStartDateInitialIntentHandler,
    SetStartDateInProgressIntentHandler
} from "./intents/setStartDateHandler";
import {
    GetGlucoseLevelIntentDateAndTimeHandler,
    GetGlucoseLevelIntentDateAndTimingHandler, GetGlucoseLevelIntentDateHandler, GetGlucoseLevelIntentTimeHandler
} from "./intents/getGlucoseLeveIHandler";
import { ConnectionsResponseHandler } from "./intents/ConnectionsResponseHandler";

const LaunchRequestHandler : RequestHandler = {
    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput : HandlerInput) : Response {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.WELCOME;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

const HelpIntentHandler : RequestHandler = {
    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput : HandlerInput) : Response {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.HELP;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    },
};

const CancelAndStopIntentHandler : RequestHandler = {
    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && (request.intent.name === 'AMAZON.CancelIntent'
                || request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput : HandlerInput) : Response {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.STOP;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    },
};

const SessionEndedRequestHandler : RequestHandler = {
    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput : HandlerInput) : Response {
        console.log(`Session ended with reason: ${(handlerInput.requestEnvelope.request as SessionEndedRequest).reason}`);

        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler : ErrorHandler = {
    canHandle() : boolean {
        return true;
    },
    handle(handlerInput : HandlerInput, error : Error) : Response {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.ERROR;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

exports.handler = SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        new ConnectionsResponseHandler(),
        new CreateRemindersInProgressHandler(),
        new CreateRemindersHandler(),
        new MedicationToTakeHandler(),
        new SetStartDateInitialIntentHandler(),
        new SetStartDateInProgressIntentHandler(),
        new SetStartDateCompletedIntentHandler(),
        new GetGlucoseLevelIntentDateAndTimingHandler(),
        new GetGlucoseLevelIntentDateAndTimeHandler(),
        new GetGlucoseLevelIntentDateHandler(),
        new GetGlucoseLevelIntentTimeHandler(),
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
