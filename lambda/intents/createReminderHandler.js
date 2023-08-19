const timeUtil = require("../utils/time");
const reminders = require("../utils/reminder");
const intentUtil = require("../utils/intent");

async function handle(handlerInput, patient, requests) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);

    // Check if start date setup is needed.
    const requestsNeedStartDate = timeUtil.requestsNeedStartDate(requests);
    if (requestsNeedStartDate) {
        return intentUtil.switchContextToStartDate(handlerInput, requestsNeedStartDate, userTimeZone, localizedMessages);
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
            console.log("Couldn't create reminder", e);
            speakOutput = localizedMessages.responses.REMINDER_NOT_CREATED;
        }
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
}

module.exports = {
    handle
}
