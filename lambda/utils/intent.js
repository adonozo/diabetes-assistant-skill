const strings = require("../strings/strings");
const helper = require("./helper");
const {DateTime} = require("luxon");
const fhirTiming = require("../fhir/timing");

function getDelegatedSetTimingIntent(timing) {
    return {
        name: 'SetTimingIntent',
        confirmationStatus: "NONE",
        slots: {
            event: {
                name: 'event',
                value: timing,
                confirmationStatus: 'NONE',
            }
        }
    }
}

function getDelegatedSetStartDateIntent(healthRequestName) {
    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: {
            healthRequest: {
                name: 'healthRequest',
                value: healthRequestName,
                confirmationStatus: 'NONE',
            }
        }
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
    let delegatedIntent;
    if (requestWithMissingDate.frequency > 1) {
        delegatedIntent = getDelegatedSetStartDateIntent(requestWithMissingDate.name);
    } else {
        const userTime = DateTime.utc().setZone(userTimeZone);
        const time = userTime.toISOTime({ suppressSeconds: true, includeOffset: false });
        delegatedIntent= getDelegatedSetStartDateWithTimeIntent(requestWithMissingDate.name, time);
    }

    const requiredSetup = localizedMessages.getStartDatePrompt(requestWithMissingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

function switchContextToTiming (handlerInput, timing) {
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
}

module.exports = {
    getDelegatedSetTimingIntent,
    getLocalizedStrings,
    switchContextToStartDate,
    switchContextToTiming
}
