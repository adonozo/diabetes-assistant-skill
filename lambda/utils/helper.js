const fhirTiming = require("./../fhir/timing");

const minBloodGlucoseValue = 4;
const maxFastingGlucoseValue = 7;
const maxAfterMealGlucoseValue = 8.5;

function logMessage(name, object) {
    console.log(`===== ${name} =====`);
    console.log(JSON.stringify(object));
}

const sessionValues = {
    requestMissingDate: 'RequestMissingDate',
    createRemindersIntent: 'CreateRemindersIntent',
    getMedicationToTakeIntent: 'GetMedicationToTakeIntent',
    carePlanIntent: 'CarePlanIntent',
}

function getBloodGlucoseAlert(value, stringTiming, localizedMessages) {
    if (value < minBloodGlucoseValue) {
        return localizedMessages.responses.LOW_GLUCOSE;
    }

    const timing = localizedMessages.stringToTimingCode(stringTiming);
    if ((timing === fhirTiming.timingEvent.ACM && value > maxFastingGlucoseValue)
        || value > maxAfterMealGlucoseValue) {
        return localizedMessages.responses.HIGH_GLUCOSE;
    }

    return '';
}

function listItems(values, concatWord) {
    if (values.length === 1) {
        return values[0];
    }

    const joinComma = values.length > 2 ? ',' : ''
    return values
        .map((value, index) => index === values.length - 1 ? ` ${concatWord} ${value}.` : ` ${value}`)
        .join(joinComma)
}

function wrapSpeakMessage(message) {
    return `<speak>${message}</speak>`
}

module.exports = {
    logMessage,
    getBloodGlucoseAlert,
    sessionValues,
    listItems,
    wrapSpeakMessage,
}
