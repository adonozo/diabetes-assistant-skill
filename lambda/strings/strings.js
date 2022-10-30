const {DateTime} = require("luxon");
const enGb = require("./strings.en_gb");
const esMx = require("./strings.es_mx");

function getLocalizedStrings(locale) {
    switch (locale) {
        case enGb.locale:
            return enGb;
        case esMx.locale:
            return esMx;
        default:
            throw 'Locale not supported.';
    }
}

function makeTextFromObservations(observations, timezone, localizedMessages) {
    const dateMap = new Map();
    observations.forEach(observation => {
        const date = DateTime.fromISO(observation.issued).setZone(timezone);
        const dayKey = localizedMessages.getTextForDay(observation.issued, timezone, localizedMessages.responses.DATE_PREPOSITION);
        const time = localizedMessages.getHoursAndMinutes(date);
        const observationValue = {time: time, value: observation.valueQuantity.value, timing: observation.extension[0]?.valueCode};
        if (dateMap.has(dayKey)) {
            dateMap.get(dayKey).push(observationValue);
        } else {
            dateMap.set(dayKey, [observationValue]);
        }
    });

    let text = '';
    dateMap.forEach((value, day) => {
        const textForDay = localizedMessages.makeTextForObservationDay(day, value)
        text = text + textForDay + '. ';
    })

    return wrapSpeakMessage(text);
}

function wrapSpeakMessage(message) {
    return `<speak>${message}</speak>`
}

module.exports = {
    makeTextFromObservations,
    getLocalizedStrings,
}
