const timeUtil = require("../utils/time");
const reminders = require("../utils/reminder");
const intentUtil = require("../utils/intent");
const carePlanApi = require("../api/carePlan");
const fhirCarePlan = require("../fhir/carePlan");

async function handleValidation(handlerInput, username) {
    const requests = await getActiveRequests(username);
    const customResource = timeUtil.requestsNeedStartDate(requests);
    if (customResource) {
        const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);
        const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
        return intentUtil.switchContextToStartDate(handlerInput, customResource, userTimeZone, localizedMessages);
    }

    return handlerInput.responseBuilder
        .addDelegateDirective()
        .getResponse();
}

async function handle(handlerInput, username) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);

    const requests = await getActiveRequests(username);
    const customResource = timeUtil.requestsNeedStartDate(requests);
    if (customResource) {
        return intentUtil.switchContextToStartDate(handlerInput, customResource, userTimeZone, localizedMessages);
    }

    // Create reminders
    const time = handlerInput.requestEnvelope.request.intent.slots.time.value;
    const requestReminders = reminders.getRemindersForRequests({
        requests,
        time,
        timezone: userTimeZone,
        localizedMessages});
    const remindersApiClient = handlerInput.serviceClientFactory.getReminderManagementServiceClient();
    let speakOutput = localizedMessages.responses.SUCCESSFUL_REMINDERS;

    for (const reminder of requestReminders) {
        try {
            await remindersApiClient.createReminder(reminder);
        } catch (e) {
            console.log("Couldn't create reminder", e);
            speakOutput = localizedMessages.responses.REMINDER_NOT_CREATED;
        }
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
}

async function getActiveRequests(username) {
    const requestBundle = await carePlanApi.getActiveCarePlan(username);
    return fhirCarePlan.requestListFromBundle(requestBundle);
}

module.exports = {
    handleValidation,
    handle
}
