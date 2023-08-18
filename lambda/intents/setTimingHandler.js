const timeUtil = require("../utils/time");
const {DateTime} = require("luxon");
const patientsApi = require("../api/patients");
const helper = require("../utils/helper");
const intentUtil = require("../utils/intent");
const fhirTiming = require("../fhir/timing");

async function handle(handlerInput, patientEmail) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const session = handlerInput.attributesManager.getSessionAttributes();

    //const timing = currentIntent.slots.event.value;

    const missingDate = session[helper.sessionValues.requestMissingDate];
    const dosageId = missingDate.id;
    const startDate = fhirTiming.getTimingStartDate(missingDate.timing);
    const time = currentIntent.slots.time.value;

    await patientsApi.setDosageStartDate(patientEmail, dosageId,{startDate: startDate, startTime: time})

    const { speakOutput, reprompt } = getSpeakResponses(session, localizedMessages);

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(reprompt)
        .getResponse();
}

function getSpeakResponses(session, localizedMessages) {
    let speakOutput = `${localizedMessages.responses.UPDATED_TIMING} ${timing}.`;
    let reprompt = localizedMessages.responses.HELP;

    if (session[helper.sessionValues.createMedicationReminderIntent]) {
        reprompt = localizedMessages.responses.MEDICATIONS_REMINDERS_SETUP;
        speakOutput = `${speakOutput} ${reprompt}`;
    } else if (session[helper.sessionValues.createRemindersIntent]) {
        reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
        speakOutput = `${speakOutput} ${reprompt}`;
    }

    return {speakOutput, reprompt};
}

module.exports = {
    handle
}
