const Alexa = require('ask-sdk-core');
const {DateTime} = require("luxon");
const auth = require('./auth');

const carePlanApi = require("./api/carePlan")
const medicationRequests = require("./api/medicationRequest");
const patientsApi = require("./api/patients");
const fhirCarePlan = require("./fhir/carePlan");
const fhirMedicationRequest = require("./fhir/medicationRequest");
const fhirTiming = require("./fhir/timing");
const createReminderHandler = require("./intents/createReminderHandler");
const getGlucoseLevelHandler = require("./intents/getGlucoseLeveIHandler");
const getMedicationToTakeHandler = require("./intents/getMedicationToTakeHandler");
const registerGlucoseLevelHandler = require("./intents/registerGlucoseLevelHandler");
const setStartDateHandler = require("./intents/setStartDateHandler");
const strings = require('./strings/strings');
const remindersUtil = require('./utils/reminder');
const timeUtil = require("./utils/time");

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.WELCOME;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CreateMedicationReminderIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateMedicationReminderIntent';
    },
    async handle(handlerInput) {
        const {permissions} = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return requestReminderPermission(handlerInput);
        }

        const userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const self = await patientsApi.getSelf(userInfo.username);
        const medicationBundle = await medicationRequests.getActiveMedicationRequests(self.id);
        const requests = fhirMedicationRequest.requestListFromBundle(medicationBundle);
        return createReminderHandler.handle(handlerInput, self, requests);
    }
}

const CreateRemindersIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'CreateRemindersIntent';
    },
    async handle(handlerInput) {
        const {permissions} = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return requestReminderPermission(handlerInput);
        }

        const userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const self = await patientsApi.getSelf(userInfo.username);
        const requestBundle = await carePlanApi.getActiveCarePlan(userInfo.username);
        const requests = fhirCarePlan.requestListFromBundle(requestBundle);
        return createReminderHandler.handle(handlerInput, self, requests);
    }
}

const GetMedicationToTakeIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetMedicationToTakeIntent';
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const self = await patientsApi.getSelf(userInfo.username);
        return getMedicationToTakeHandler.handle(handlerInput, self);
    }
};

const SetStartDateInProgressIntentInitialHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetStartDateIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    async handle(handlerInput) {
        const userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
}

const SetStartDateInProgressIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetStartDateIntent'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.healthRequestTime.value
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    async handle(handlerInput) {
        // TODO this handler is not called
        console.log("Reached: SetStartDateInProgressIntentHandler")
        const userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        return setStartDateHandler.handleInProgress(handlerInput, userInfo.username);
    }
}

const SetStartDateCompletedIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetStartDateIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        const userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        return setStartDateHandler.handle(handlerInput, userInfo.username);
    }
}

const RegisterGlucoseLevelIntentInProgressHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        return handlerInput.responseBuilder
            .addDelegateDirective()
            .getResponse();
    }
}

const RegisterGlucoseLevelIntentInProgressWithValueHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.level.value
            && handlerInput.requestEnvelope.request.intent.slots.level.confirmationStatus === "CONFIRMED"
            && !handlerInput.requestEnvelope.request.intent.slots.glucoseTiming.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const self = await patientsApi.getSelf(userInfo.username);
        const mealCode = timeUtil.getSuggestedTiming(self);
        const message = localizedMessages.getSuggestedTimeText(mealCode);
        return handlerInput.responseBuilder
            .speak(message)
            .reprompt(message)
            .addElicitSlotDirective("glucoseTiming")
            .getResponse();
    }
}

const RegisterGlucoseLevelIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        return registerGlucoseLevelHandler.handle(handlerInput, userInfo.username);
    }
}

const GetGlucoseLevelIntentDateAndTimingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const timezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const timing = handlerInput.requestEnvelope.request.intent.slots.timing.value;

        const timingCode = localizedMessages.stringToTimingCode(timing);
        const utcDate = timeUtil.utcDateFromLocalDate(date, timezone);
        const bundle = await patientsApi.getObservationsOnDate(userInfo.username, utcDate, timingCode, timezone);
        return getGlucoseLevelHandler.handle(handlerInput, bundle, timezone);
    }
}

const GetGlucoseLevelIntentDateAndTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const time = handlerInput.requestEnvelope.request.intent.slots.time.value;
        const timing = fhirTiming.alexaTimingToFhirTiming(time);
        const dateTime = timing === fhirTiming.timingEvent.EXACT ?
            timeUtil.utcDateTimeFromLocalDateAndTime(date, time, timezone)
            : timeUtil.utcDateFromLocalDate(date, timezone);
        const bundle = await patientsApi.getObservationsOnDate(userInfo.username, dateTime, timing, timezone);
        return getGlucoseLevelHandler.handle(handlerInput, bundle, timezone);
    }
}

const GetGlucoseLevelIntentDateHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const utcDate = timeUtil.utcDateFromLocalDate(date, timezone);
        const bundle = await patientsApi.getObservationsOnDate(userInfo.username, utcDate, fhirTiming.timingEvent.ALL_DAY, timezone);
        return getGlucoseLevelHandler.handle(handlerInput, bundle, timezone);
    }
}

const GetGlucoseLevelIntentTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && !handlerInput.requestEnvelope.request.intent.slots.date.value
            && handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const time = handlerInput.requestEnvelope.request.intent.slots.time.value;
        const timing = fhirTiming.alexaTimingToFhirTiming(time);
        const dateTime = timing === fhirTiming.timingEvent.EXACT ?
            timeUtil.utcTimeFromLocalTime(time, timezone)
            : DateTime.utc().toISO();
        const bundle = await patientsApi.getObservationsOnDate(userInfo.username, dateTime, timing, timezone);
        return getGlucoseLevelHandler.handle(handlerInput, bundle, timezone);
    }
}

const GetGlucoseLevelIntentTimingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && !handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await auth.getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const timing = handlerInput.requestEnvelope.request.intent.slots.timing.value;
        const date = DateTime.utc().toISO();
        const bundle = await patientsApi.getObservationsOnDate(userInfo.username, date, timing, timezone);
        return getGlucoseLevelHandler.handle(handlerInput, bundle, timezone);
    }
}

const ConnectionsResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
    },
    handle(handlerInput) {
        const { permissions } = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return requestReminderPermission(handlerInput);
        }

        const status = handlerInput.requestEnvelope.request.payload.status;
        const localizedMessages = getLocalizedStrings(handlerInput);
        switch (status) {
            case "DENIED":
            case "NOT_ANSWERED":
                return handlerInput.responseBuilder
                    .speak(localizedMessages.responses.PERMISSIONS_REQUIRED)
                    .getResponse();
            case "ACCEPTED":
            default:
                return handlerInput.responseBuilder
                    .speak(localizedMessages.responses.SUCCESSFUL_REMINDER_PERMISSION)
                    .reprompt(localizedMessages.responses.SUCCESSFUL_REMINDER_PERMISSION_REPROMPT)
                    .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.HELP;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.STOP;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const localizedMessages = getLocalizedStrings(handlerInput);
        const speakOutput = localizedMessages.responses.ERROR;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        CreateMedicationReminderIntentHandler,
        CreateRemindersIntentHandler,
        GetMedicationToTakeIntentHandler,
        ConnectionsResponseHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        SetStartDateInProgressIntentInitialHandler,
        SetStartDateInProgressIntentHandler,
        SetStartDateCompletedIntentHandler,
        RegisterGlucoseLevelIntentInProgressWithValueHandler,
        RegisterGlucoseLevelIntentInProgressHandler,
        RegisterGlucoseLevelIntentHandler,
        GetGlucoseLevelIntentDateAndTimingHandler,
        GetGlucoseLevelIntentDateAndTimeHandler,
        GetGlucoseLevelIntentDateHandler,
        GetGlucoseLevelIntentTimeHandler,
        GetGlucoseLevelIntentTimingHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last, so it doesn't override your custom intent handlers
        )
    .addErrorHandlers(
        ErrorHandler,
        )
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();

const requestAccountLink = (handlerInput) => {
    const localizedMessages = getLocalizedStrings(handlerInput);
    return handlerInput.responseBuilder
        .speak(localizedMessages.responses.ACCOUNT_LINK)
        .withLinkAccountCard()
        .getResponse();
}

const requestReminderPermission = (handlerInput) => {
    const localizedMessages = getLocalizedStrings(handlerInput);
    return handlerInput.responseBuilder
        .speak(localizedMessages.responses.REMINDER_PERMISSIONS)
        .addDirective(remindersUtil.reminderDirective)
        .getResponse();
}

const getLocalizedStrings = (handlerInput) => {
    return strings.getLocalizedStrings(handlerInput.requestEnvelope.request.locale);
}
