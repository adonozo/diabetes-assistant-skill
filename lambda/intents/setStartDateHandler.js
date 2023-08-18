const helper = require("../utils/helper");
const timeUtil = require("../utils/time");
const {DateTime} = require("luxon");
const patientsApi = require("../api/patients");
const intentUtil = require("../utils/intent");
const fhirTiming = require("../fhir/timing");

async function handle(handlerInput, patientEmail) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const session = handlerInput.attributesManager.getSessionAttributes();
    const missingDate = session[helper.sessionValues.requestMissingDate];
    if (!missingDate) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.ERROR)
            .reprompt(localizedMessages.responses.ERROR)
            .getResponse();
    }

    const {date, time, healthRequest} = getIntentData(handlerInput);
    const userTimeZone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const dateTime = DateTime.fromISO(`${date}T${time}`, {zone: userTimeZone});

    switch (missingDate.type) {
        case 'ServiceRequest':
            await patientsApi.setServiceRequestStartDate(patientEmail, missingDate.id, dateTime.toUTC().toISO())
            break;
        case 'MedicationRequest':
            await patientsApi.setDosageStartDate(patientEmail, missingDate.id, dateTime.toUTC().toISO());
            break;
    }

    const {speakOutput, reprompt} = getStartDateConfirmedResponse(handlerInput, session, healthRequest);
    delete session[helper.sessionValues.requestMissingDate];
    handlerInput.attributesManager.setSessionAttributes(session);

    if (fhirTiming.timingNeedsStartTime(missingDate.timing)) {
        return intentUtil.switchContextToTiming(handlerInput, missingDate, userTimeZone);
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(reprompt)
        .getResponse();
}

function getIntentData(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const date = currentIntent.slots.date.value;
    const time = currentIntent.slots.healthRequestTime.value;
    const healthRequest = currentIntent.slots.healthRequest.value;

    return {
        date,
        time,
        healthRequest
    };
}

function getStartDateConfirmedResponse(handlerInput, session, healthRequest) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    let speakOutput = localizedMessages.getConfirmationDateText(healthRequest);

    let reprompt = localizedMessages.responses.HELP;
    if (session[helper.sessionValues.createMedicationReminderIntent]) {
        reprompt = localizedMessages.responses.MEDICATIONS_REMINDERS_SETUP;
    } else if (session[helper.sessionValues.createRemindersIntent]) {
        reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
    } else if (session[helper.sessionValues.carePlanIntent] || session[helper.sessionValues.getMedicationToTakeIntent]) {
        reprompt = localizedMessages.responses.QUERY_SETUP;
    }

    speakOutput = `${speakOutput} ${reprompt}`;
    return {speakOutput, reprompt}
}

module.exports = {
    handle
}
