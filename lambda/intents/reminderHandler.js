const timeUtil = require("../utils/time");
const reminders = require("../utils/reminder");
const fhirTiming = require("../fhir/timing");
const intentUtil = require("../utils/intent");
const helper = require("../utils/helper");
const {DateTime} = require("luxon");

async function createRequestReminders(handlerInput, patient, requests) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);

    // Check if timing setup is needed.
    const timingValidations = timeUtil.getActiveMissingTimings(patient, requests);
    if (timingValidations.size > 0) {
        return switchContextToTiming(handlerInput, timingValidations.values().next().value);
    }

    // Check if start date setup is needed.
    const missingDate = timeUtil.getActiveMissingStartDate(patient, requests);
    if (missingDate) {
        const userTimezone = await timeUtil.getTimezoneOrDefault(handlerInput);
        return switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
    }

    // Create reminders
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const requestReminders = reminders.getRemindersForRequests({
        requests: requests,
        patient: patient,
        timezone: userTimeZone,
        localizedMessages});
    const remindersApiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
    let speakOutput = localizedMessages.responses.SUCCESSFUL_REMINDERS;

    for (const reminder of requestReminders) {
        try {
            await remindersApiClient.createReminder(reminder);
        } catch (e) {
            speakOutput = localizedMessages.responses.REMINDER_NOT_CREATED;
        }
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
}

const switchContextToTiming = (handlerInput, timing) => {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const nextTimingCode = fhirTiming.relatedTimingCodeToString(timing);
    const nextTiming = localizedMessages.codeToString(nextTimingCode)

    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    attributesManager.setSessionAttributes(session);

    return handlerInput.responseBuilder
        .addDelegateDirective(intentUtil.getDelegatedSetTimingIntent(nextTiming))
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
        delegatedIntent = intentUtil.getDelegatedSetStartDateIntent(missingDate.name);
    } else {
        const userTime = DateTime.utc().setZone(userTimeZone);
        const time = userTime.toISOTime({ suppressSeconds: true, includeOffset: false });
        delegatedIntent= intentUtil.getDelegatedSetStartDateWithTimeIntent(missingDate.name, time);
    }

    const requiredSetup = localizedMessages.getStartDatePrompt(missingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

module.exports = {
    createRequestReminders
}
