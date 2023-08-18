const strings = require("../strings/strings");
const helper = require("./helper");
const {DateTime} = require("luxon");
const fhirTiming = require("../fhir/timing");

/**
 * @deprecated
 * @param timing
 * @returns {{slots: {event: {confirmationStatus: string, name: string, value}}, confirmationStatus: string, name: string}}
 */
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
    const delegatedIntent = getDelegatedSetStartDateIntent(requestWithMissingDate.name);
    // if (requestWithMissingDate.frequency > 1) { // TODO update this
    //     delegatedIntent = getDelegatedSetStartDateIntent(requestWithMissingDate.name);
    // } else {
    //     const userTime = DateTime.utc().setZone(userTimeZone);
    //     const time = userTime.toISOTime({ suppressSeconds: true, includeOffset: false });
    //     delegatedIntent= getDelegatedSetStartDateWithTimeIntent(requestWithMissingDate.name, time);
    // }

    const requiredSetup = localizedMessages.getStartDatePrompt(requestWithMissingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

/**
 * @deprecated
 * @param handlerInput
 * @param requestWithMissingDate
 * @param userTimeZone
 * @returns {*}
 */
function switchContextToTiming (handlerInput, requestWithMissingDate, userTimeZone) {
    const localizedMessages = getLocalizedStrings(handlerInput);
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    //const nextTimingCode = fhirTiming.relatedTimingCodeToString(timing);
    const nextTiming = localizedMessages.codeToString("ACM")

    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    session[helper.sessionValues.requestMissingDate] = requestWithMissingDate;
    attributesManager.setSessionAttributes(session);

    return handlerInput.responseBuilder
        .addDelegateDirective(getDelegatedSetTimingIntent(nextTiming))
        .speak(localizedMessages.responses.SETUP_TIMINGS)
        .getResponse()
}

module.exports = {
    getLocalizedStrings,
    switchContextToStartDate,
    switchContextToTiming
}
