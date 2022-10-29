const timeUtil = require("../utils/time");
const {DateTime} = require("luxon");
const patientsApi = require("../api/patients");
const helper = require("../utils/helper");
const intentUtil = require("../utils/intent");

async function handle(handlerInput, patientEmail) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const timing = currentIntent.slots.event.value;
    const time = currentIntent.slots.time.value;
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const dateTime = DateTime.fromISO(`${DateTime.now().toISODate()}T${time}`, {zone: userTimeZone});

    await patientsApi.updateTiming(patientEmail, {
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

module.exports = {
    handle
}
