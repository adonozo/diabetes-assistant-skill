const helper = require("../utils/helper");
const patientsApi = require("../api/patients");
const intentUtil = require("../utils/intent");
const fhirTiming = require("../fhir/timing");

async function handleInProgress(handlerInput, patientEmail) {
    const session = handlerInput.attributesManager.getSessionAttributes();
    const missingDate = session[helper.sessionValues.requestMissingDate];
    if (!missingDate) {
        return intentUtil.buildErrorResponse(handlerInput);
    }

    if (fhirTiming.timingNeedsStartTime(missingDate.timing)) {
        return handlerInput.responseBuilder
            .addElicitSlotDirective("healthRequestTime")
            .getResponse();
    }

    const {date, _} = getIntentData(handlerInput);
    switch (missingDate.type) {
        case 'ServiceRequest':
            await patientsApi.setServiceRequestStartDate(patientEmail, missingDate.id, {startDate: date})
            break;
        case 'MedicationRequest':
            await patientsApi.setDosageStartDate(patientEmail, missingDate.id, {startDate: date});
            break;
    }

    const {speakOutput, reprompt} = getStartDateConfirmedResponse(handlerInput, session, healthRequest);
    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(reprompt)
        .getResponse();
}

async function handle(handlerInput, patientEmail) {
    const session = handlerInput.attributesManager.getSessionAttributes();
    const missingDate = session[helper.sessionValues.requestMissingDate];
    if (!missingDate) {
        return intentUtil.buildErrorResponse(handlerInput);
    }

    const {date, time} = getIntentData(handlerInput);
    const startDateTime = {startDate: date, startTime: time + ':00'};

    switch (missingDate.type) {
        case 'ServiceRequest':
            await patientsApi.setServiceRequestStartDate(patientEmail, missingDate.id, startDateTime)
            break;
        case 'MedicationRequest':
            await patientsApi.setDosageStartDate(patientEmail, missingDate.id, startDateTime);
            break;
    }

    const {speakOutput, reprompt} = getStartDateConfirmedResponse(handlerInput, session, missingDate.name);
    delete session[helper.sessionValues.requestMissingDate];
    handlerInput.attributesManager.setSessionAttributes(session);

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(reprompt)
        .getResponse();
}

function getIntentData(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const date = currentIntent.slots.date.value;
    const time = currentIntent.slots.healthRequestTime.value;

    return {date, time};
}

function getStartDateConfirmedResponse(handlerInput, session, requestName) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    let speakOutput = localizedMessages.getConfirmationDateText(requestName);

    let reprompt = localizedMessages.responses.HELP;
    if (session[helper.sessionValues.createRemindersIntent]) {
        reprompt = localizedMessages.responses.REQUESTS_REMINDERS_SETUP;
    } else if (session[helper.sessionValues.carePlanIntent] || session[helper.sessionValues.getMedicationToTakeIntent]) {
        reprompt = localizedMessages.responses.QUERY_SETUP;
    }

    speakOutput = `${speakOutput} ${reprompt}`;
    return {speakOutput, reprompt}
}

module.exports = {
    handleInProgress,
    handle
}
