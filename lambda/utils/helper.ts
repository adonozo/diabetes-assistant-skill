import { TimingEvent } from "../enums";

export const minBloodGlucoseValue = 4;
export const maxFastingGlucoseValue = 7;
export const maxAfterMealGlucoseValue = 8.5;

export function logMessage(name, object) {
    console.log(`===== ${name} =====`);
    console.log(JSON.stringify(object));
}

export const sessionValues = {
    requestMissingDate: 'RequestMissingDate',
    createRemindersIntent: 'CreateRemindersIntent',
    getMedicationToTakeIntent: 'GetMedicationToTakeIntent',
    carePlanIntent: 'CarePlanIntent',
}

export function getBloodGlucoseAlert(value, stringTiming, localizedMessages) {
    if (value < minBloodGlucoseValue) {
        return localizedMessages.responses.LOW_GLUCOSE;
    }

    const timing = localizedMessages.stringToTimingCode(stringTiming);
    if ((timing === TimingEvent.ACM && value > maxFastingGlucoseValue)
        || value > maxAfterMealGlucoseValue) {
        return localizedMessages.responses.HIGH_GLUCOSE;
    }

    return '';
}

export function listItems(values, concatWord) {
    if (values.length === 1) {
        return values[0];
    }

    const joinComma = values.length > 2 ? ',' : ''
    return values
        .map((value, index) => index === values.length - 1 ? ` ${concatWord} ${value}.` : ` ${value}`)
        .join(joinComma)
}

export function wrapSpeakMessage(message) {
    return `<speak>${message}</speak>`
}
