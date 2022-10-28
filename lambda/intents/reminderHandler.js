const timeUtil = require("../utils/time");
const reminders = require("../utils/reminder");
const fhirTiming = require("../fhir/timing");
const intentUtil = require("../utils/intent");

async function createRequestReminders(handlerInput, patient, requests) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);

    // Check if timing setup is needed.
    const timingValidations = timeUtil.getActiveMissingTimings(patient, requests);
    if (timingValidations.size > 0) {
        return switchContextToTiming(handlerInput, timingValidations.values().next().value);
    }

    // Check if start date setup is needed.
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const missingDate = timeUtil.getActiveMissingStartDate(patient, requests);
    if (missingDate) {
        return intentUtil.switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
    }

    // Create reminders
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

module.exports = {
    createRequestReminders
}
