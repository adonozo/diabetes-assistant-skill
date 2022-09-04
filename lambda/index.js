const Alexa = require('ask-sdk-core');
const reminders = require('./reminder');
const strings = require('./strings');
const auth = require('./auth');
const medicationRequests = require("./api/medicationRequest");
const carePlan = require("./api/carePlan")
const fhirMedicationRequest = require("./fhir/medicationRequest");
const fhirCarePlan = require("./fhir/carePlan");
const helper = require("./helper");
const patients = require("./api/patients");
const fhirTiming = require("./fhir/timing");
const fhirObservation = require("./fhir/observation");
const {DateTime} = require("luxon");

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

const MedicationForDateIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MedicationForDateIntent';
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const self = await patients.getSelf(userInfo.username);
        const date = handlerInput.requestEnvelope.request.intent.slots.treatmentDate.value;
        const userTimezone = await helper.getTimezoneOrDefault(handlerInput);
        const medicationRequest = await patients.getMedicationRequests(userInfo.username, date,
            fhirTiming.timingEvent.ALL_DAY, userTimezone);
        const medications = fhirCarePlan.medicationsFromBundle(medicationRequest);
        // Check missing dates in requests
        const missingDate = helper.getActiveMissingDate(self, medications);
        if (missingDate) {
            return switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
        }

        let speakOutput
        if (medications.length === 0) {
            speakOutput = localizedMessages.getNoRecordsTextForDay(date, userTimezone);
        } else {
            const medicationText = fhirMedicationRequest.getTextForMedicationRequests(medications, self, userTimezone, localizedMessages);
            const datePreposition = localizedMessages.responses.DATE_PREPOSITION;
            speakOutput = `${localizedMessages.getTextForDay(date, userTimezone, datePreposition)}, ${medicationText}`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const MedicationReminderIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'MedicationReminderIntent';
    },
    async handle(handlerInput) {
        const {permissions} = handlerInput.requestEnvelope.context.System.user;
        if (!permissions) {
            return requestReminderPermission(handlerInput);
        }

        const userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const self = await patients.getSelf(userInfo.username);
        const localizedMessages = getLocalizedStrings(handlerInput);

        // Check if timing setup is needed.
        const medicationBundle = await medicationRequests.getActiveMedicationRequests(self.id);
        const requests = fhirMedicationRequest.requestListFromBundle(medicationBundle);
        const timingValidations = helper.getActiveMissingTimings(self, requests);
        if (timingValidations.size > 0) {
            return switchContextToTiming(handlerInput, timingValidations.values().next().value);
        }

        // Check if start date setup is needed.
        const missingDate = helper.getActiveMissingDate(self, requests);
        if (missingDate) {
            const userTimezone = await helper.getTimezoneOrDefault(handlerInput);
            return switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
        }

        // Create reminders
        const userTimeZone = await helper.getTimezoneOrDefault(handlerInput);
        const medicationReminders = reminders.getRemindersForMedicationRequests({
            requests,
            patient: self,
            timezone: userTimeZone,
            localizedMessages})
        const remindersApiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
        for (const reminder of medicationReminders) {
            await remindersApiClient.createReminder(reminder);
        }

        const speakOutput = localizedMessages.responses.SUCCESSFUL_REMINDERS;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
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

        const userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const self = await patients.getSelf(userInfo.username);
        const localizedMessages = getLocalizedStrings(handlerInput);

        // Check if timing setup is needed.
        const requestBundle = await carePlan.getActiveCarePlan(userInfo.username);
        const requests = fhirCarePlan.requestListFromBundle(requestBundle);
        const timingValidations = helper.getActiveMissingTimings(self, requests);
        if (timingValidations.size > 0) {
            return switchContextToTiming(handlerInput, timingValidations.values().next().value);
        }

        // Check if start date setup is needed.
        const missingDate = helper.getActiveMissingDate(self, requests);
        if (missingDate) {
            const userTimezone = await helper.getTimezoneOrDefault(handlerInput);
            return switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
        }

        // Create reminders
        const userTimeZone = await helper.getTimezoneOrDefault(handlerInput);
        const requestReminders = reminders.getRemindersForRequests({
            requests,
            patient: self,
            timezone: userTimeZone,
            localizedMessages});
        const remindersApiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
        for (const reminder of requestReminders) {
            await remindersApiClient.createReminder(reminder);
        }

        const speakOutput = localizedMessages.responses.SUCCESSFUL_REMINDERS;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}

const SetTimingInProgressIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetTimingIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    handle(handlerInput) {
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        return handlerInput.responseBuilder
            .addDelegateDirective(currentIntent)
            .getResponse();
    }
}

const SetTimingCompletedIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetTimingIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        const userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const timing = currentIntent.slots.event.value;
        const time = currentIntent.slots.time.value;
        const userTimeZone = await helper.getTimezoneOrDefault(handlerInput);
        const dateTime = DateTime.fromISO(`${DateTime.now().toISODate()}T${time}`, {zone: userTimeZone});

        await patients.updateTiming(userInfo.username, {
            timing: localizedMessages.stringToTimingCode(timing),
            dateTime: dateTime.toUTC().toISO()
        })

        const session = handlerInput.attributesManager.getSessionAttributes();
        let speakOutput = `${localizedMessages.responses.UPDATED_TIMING} ${timing}.`;
        let reprompt = localizedMessages.responses.HELP;
        if (session[helper.sessionValues.medicationReminderIntent]) {
            reprompt = localizedMessages.responses.MEDICATIONS_REMINDERS_SETUP;
            speakOutput = `${speakOutput} ${reprompt}`;
        } else if (session[helper.sessionValues.createRemindersIntent]) {
            reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
            speakOutput = `${speakOutput} ${reprompt}`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
}

const SetStartDateCompletedIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetStartDateIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) === 'COMPLETED';
    },
    async handle(handlerInput) {
        const userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const attributesManager = handlerInput.attributesManager;
        const session = attributesManager.getSessionAttributes();
        const missingDate = session[helper.sessionValues.requestMissingDate];
        if (!missingDate) {
            return handlerInput.responseBuilder
                .speak(localizedMessages.responses.ERROR)
                .reprompt(localizedMessages.responses.ERROR)
                .getResponse();
        }

        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const date = currentIntent.slots.date.value;
        const time = currentIntent.slots.healthRequestTime.value;
        const healthRequest = currentIntent.slots.healthRequest.value;
        const userTimeZone = await helper.getTimezoneOrDefault(handlerInput);
        const dateTime = DateTime.fromISO(`${date}T${time}`, {zone: userTimeZone});
        await patients.setStartDate(userInfo.username, missingDate.id, { startDate: dateTime.toUTC().toISO() });
        const {speakOutput, reprompt} = getStartDateConfirmedResponse(session, healthRequest, handlerInput);
        delete session[helper.sessionValues.requestMissingDate];
        attributesManager.setSessionAttributes(session);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(reprompt)
            .getResponse();
    }
}

const RegisterGlucoseLevelIntentInProgressHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegisterGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED';
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
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
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const self = await patients.getSelf(userInfo.username);
        const mealCode = helper.getSuggestedTiming(self);
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
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const currentIntent = handlerInput.requestEnvelope.request.intent;
        const value = currentIntent.slots.level.value;
        const timing = currentIntent.slots.glucoseTiming.value
        if (isNaN(+value) || +value <= 0 || +value > 20) {
            return handlerInput.responseBuilder
                .speak(localizedMessages.responses.INVALID_BLOOD_GLUCOSE)
                .reprompt(localizedMessages.responses.INVALID_BLOOD_GLUCOSE_REPROMPT)
                .getResponse();
        }

        const self = await patients.getSelf(userInfo.username);
        const observation = fhirObservation.createObservationObject(self, +value, timing, localizedMessages);
        await patients.saveBloodGlucoseLevel(userInfo.username, observation);
        const response = localizedMessages.responses.BLOOD_GLUCOSE_SUCCESS;
        const alert = helper.getBloodGlucoseAlert(value, timing, localizedMessages);

        return handlerInput.responseBuilder
            .speak(`${response} ${alert}`)
            .getResponse();
    }
}

const AskGlucoseLevelIntentDateAndTimingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const timezone = await helper.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const timing = handlerInput.requestEnvelope.request.intent.slots.timing.value;

        const timingCode = localizedMessages.stringToTimingCode(timing);
        const utcDate = helper.utcDateFromLocalDate(date, timezone);
        const bundle = await patients.getObservationsOnDate(userInfo.username, utcDate, timingCode);
        return getAskGlucoseResponse(handlerInput, bundle, timezone);
    }
}

const AskGlucoseLevelIntentDateAndTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await helper.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const time = handlerInput.requestEnvelope.request.intent.slots.time.value;
        const timing = fhirTiming.alexaTimingToFhirTiming(time);
        const dateTime = timing === fhirTiming.timingEvent.EXACT ?
            helper.utcDateTimeFromLocalDateAndTime(date, time, timezone)
            : helper.utcDateFromLocalDate(date, timezone);
        const bundle = await patients.getObservationsOnDate(userInfo.username, dateTime, timing);
        return getAskGlucoseResponse(handlerInput, bundle, timezone);
    }
}

const AskGlucoseLevelIntentDateHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await helper.getTimezoneOrDefault(handlerInput);
        const date = handlerInput.requestEnvelope.request.intent.slots.date.value;
        const utcDate = helper.utcDateFromLocalDate(date, timezone);
        const bundle = await patients.getObservationsOnDate(userInfo.username, utcDate, fhirTiming.timingEvent.ALL_DAY);
        return getAskGlucoseResponse(handlerInput, bundle, timezone);
    }
}

const AskGlucoseLevelIntentTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && !handlerInput.requestEnvelope.request.intent.slots.date.value
            && handlerInput.requestEnvelope.request.intent.slots.time.value
            && !handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await helper.getTimezoneOrDefault(handlerInput);
        const time = handlerInput.requestEnvelope.request.intent.slots.time.value;
        const timing = fhirTiming.alexaTimingToFhirTiming(time);
        const dateTime = timing === fhirTiming.timingEvent.EXACT ?
            helper.utcTimeFromLocalTime(time, timezone)
            : DateTime.utc().toISO();
        const bundle = await patients.getObservationsOnDate(userInfo.username, dateTime, timing);
        return getAskGlucoseResponse(handlerInput, bundle, timezone);
    }
}

const AskGlucoseLevelIntentTimingHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskGlucoseLevelIntent'
            && Alexa.getDialogState(handlerInput.requestEnvelope) !== 'COMPLETED'
            && !handlerInput.requestEnvelope.request.intent.slots.date.value
            && !handlerInput.requestEnvelope.request.intent.slots.time.value
            && handlerInput.requestEnvelope.request.intent.slots.timing.value;
    },
    async handle(handlerInput) {
        let userInfo = await getValidatedUser(handlerInput);
        if (!userInfo) {
            return requestAccountLink(handlerInput);
        }

        const timezone = await helper.getTimezoneOrDefault(handlerInput);
        const timing = handlerInput.requestEnvelope.request.intent.slots.timing.value;
        const date = DateTime.utc().toISO();
        const bundle = await patients.getObservationsOnDate(userInfo.username, date, timing);
        return getAskGlucoseResponse(handlerInput, bundle, timezone);
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
        MedicationForDateIntentHandler,
        MedicationReminderIntentHandler,
        ConnectionsResponseHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        SetTimingInProgressIntentHandler,
        SetTimingCompletedIntentHandler,
        SetStartDateCompletedIntentHandler,
        CreateRemindersIntentHandler,
        RegisterGlucoseLevelIntentInProgressWithValueHandler,
        RegisterGlucoseLevelIntentInProgressHandler,
        RegisterGlucoseLevelIntentHandler,
        AskGlucoseLevelIntentDateAndTimingHandler,
        AskGlucoseLevelIntentDateAndTimeHandler,
        AskGlucoseLevelIntentDateHandler,
        AskGlucoseLevelIntentTimeHandler,
        AskGlucoseLevelIntentTimingHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last, so it doesn't override your custom intent handlers
        ) 
    .addErrorHandlers(
        ErrorHandler,
        )
    .withApiClient(new Alexa.DefaultApiClient())
    .lambda();

const getValidatedUser = async (handlerInput) => {
    let token = handlerInput.requestEnvelope.context.System.user.accessToken;
    if (!token) {
        return false;
    }

    const userInfo = await auth.validateToken(token);
    userInfo.requestOptions = auth.getOptions(token);
    return userInfo;
}

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
        .addDirective(reminders.reminderDirective)
        .getResponse();
}

const switchContextToTiming = (handlerInput, timing) => {
    const localizedMessages = getLocalizedStrings(handlerInput);
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const nextTimingCode = fhirTiming.relatedTimingCodeToString(timing);
    const nextTiming = localizedMessages.codeToString(nextTimingCode)

    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    attributesManager.setSessionAttributes(session);

    return handlerInput.responseBuilder
        .addDelegateDirective(helper.getDelegatedSetTimingIntent(nextTiming))
        .speak(localizedMessages.responses.SETUP_TIMINGS)
        .getResponse()
};

const switchContextToStartDate = (handlerInput, missingDate, userTimeZone, localizedMessages) => {
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    session[helper.sessionValues.requestMissingDate] = missingDate;
    attributesManager.setSessionAttributes(session);
    let delegatedIntent;
    if (missingDate.frequency > 1) {
        delegatedIntent = helper.getDelegatedSetStartDateIntent(missingDate.name);
    } else {
        const userTime = DateTime.utc().setZone(userTimeZone);
        const time = userTime.toISOTime({ suppressSeconds: true, includeOffset: false });
        delegatedIntent= helper.getDelegatedSetStartDateWithTimeIntent(missingDate.name, time);
    }

    const requiredSetup = localizedMessages.getStartDatePrompt(missingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

const getAskGlucoseResponse = (handlerInput, bundle, timezone) => {
    const localizedMessages = getLocalizedStrings(handlerInput);
    if (!bundle.entry || bundle.entry.length === 0) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.NO_GLUCOSE_RECORDS_FOUND)
            .getResponse();
    }

    const observations = fhirObservation.getObservationsFromBundle(bundle);
    const message = strings.makeTextFromObservations(observations, timezone, localizedMessages);
    return handlerInput.responseBuilder
        .speak(message)
        .getResponse();
}

const getStartDateConfirmedResponse = (session, healthRequest, handlerInput) => {
    const localizedMessages = getLocalizedStrings(handlerInput);
    let speakOutput = localizedMessages.getConfirmationDateText(healthRequest);

    let reprompt = localizedMessages.responses.HELP;
    if (session[helper.sessionValues.medicationReminderIntent]) {
        reprompt = localizedMessages.responses.MEDICATIONS_REMINDERS_SETUP;
    } else if (session[helper.sessionValues.createRemindersIntent]) {
        reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
    } else if (session[helper.sessionValues.carePlanIntent] || session[helper.sessionValues.medicationForDateIntent]) {
        reprompt = localizedMessages.responses.QUERY_SETUP;
    }

    speakOutput = `${speakOutput} ${reprompt}`;
    return {speakOutput, reprompt}
}

const getLocalizedStrings = (handlerInput) => {
    return strings.getLocalizedStrings(handlerInput.requestEnvelope.request.locale);
}
