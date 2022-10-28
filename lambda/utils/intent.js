const strings = require("../strings/strings");
const helper = require("./helper");
const {DateTime} = require("luxon");

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

function switchContextToStartDate(handlerInput, missingDate, userTimeZone, localizedMessages) {
    const attributesManager = handlerInput.attributesManager;
    const session = attributesManager.getSessionAttributes();
    const intent = handlerInput.requestEnvelope.request.intent;
    session[intent.name] = intent;
    session[helper.sessionValues.requestMissingDate] = missingDate;
    attributesManager.setSessionAttributes(session);
    let delegatedIntent;
    if (missingDate.frequency > 1) {
        delegatedIntent = getDelegatedSetStartDateIntent(missingDate.name);
    } else {
        const userTime = DateTime.utc().setZone(userTimeZone);
        const time = userTime.toISOTime({ suppressSeconds: true, includeOffset: false });
        delegatedIntent= getDelegatedSetStartDateWithTimeIntent(missingDate.name, time);
    }

    const requiredSetup = localizedMessages.getStartDatePrompt(missingDate);
    return handlerInput.responseBuilder
        .addDelegateDirective(delegatedIntent)
        .speak(requiredSetup)
        .getResponse();
}

module.exports = {
    getDelegatedSetTimingIntent,
    getDelegatedSetStartDateIntent,
    getDelegatedSetStartDateWithTimeIntent,
    getLocalizedStrings,
    switchContextToStartDate,
}
