const {DateTime} = require("luxon");
const enGb = require("strings.en_gb");
const esMx = require("strings.es_mx");

const locales = {
    enGb: "en-GB",
    esMx: "es-MX"
}

function getLocalizedStrings(locale) {
    switch (locale) {
        case locales.enGb:
            return enGb;
        case locales.esMx:
            return esMx;
        default:
            throw "Locale not supported.";
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

function listItems(values, concatWord) {
    if (values.length === 1) {
        return values[0];
    }

    const joinComma = values.length > 2 ? ',' : ''
    return values.map((value, index) =>
        index === values.length - 1 ? ` ${concatWord} ${value}.` : ` ${value}`)
        .join(joinComma)
}

function wrapSpeakMessage(message) {
    return `<speak>${message}</speak>`
}

module.exports = {
    makeTextFromObservations,
    getLocalizedStrings,
    listItems,
    wrapSpeakMessage,
}
