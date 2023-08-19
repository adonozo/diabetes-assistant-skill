const strings = require("../strings/strings");
const helper = require("./helper");
const fhirTiming = require("../fhir/timing");

function getDelegatedSetStartDateIntent(startDate) {
    const slots = startDate ?
        {
            date: {
                name: 'date',
                value: startDate,
                confirmationStatus: 'NONE'
            }
        }
        : {};

    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: slots
    }
}

function getDelegatedSetStartDateWithTimeIntent(healthRequestName, time) {
    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: {
            healthRequest: {
                name: 'healthRequest',
                value: healthRequestName,
                confirmationStatus: 'NONE',
            },
            healthRequestTime: {
                name: 'healthRequestTime',
                value: time,
                confirmationStatus: 'CONFIRMED',
            }
        }
    }
}

function getLocalizedStrings (handlerInput) {
    return strings.getLocalizedStrings(handlerInput.requestEnvelope.request.locale);
}

function switchContextToStartDate(handlerInput, requestWithMissingDate, userTimeZone, localizedMessages) {
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    session[helper.sessionValues.requestMissingDate] = requestWithMissingDate;
    attributesManager.setSessionAttributes(session);

    const hasStartDate = !fhirTiming.timingNeedsStartDate(requestWithMissingDate.timing);
    const delegatedIntent = hasStartDate ?
        getDelegatedSetStartDateIntent(fhirTiming.getTimingStartDate(requestWithMissingDate.timing))
        : getDelegatedSetStartDateIntent();

    const requiredSetup = localizedMessages.getStartDatePrompt(requestWithMissingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

function buildErrorResponse(handlerInput) {
    return handlerInput.responseBuilder
        .speak(localizedMessages.responses.ERROR)
        .getResponse();
}

module.exports = {
    getLocalizedStrings,
    switchContextToStartDate,
    buildErrorResponse
}
