import { TimingEvent } from "../enums";
import { AbstractMessage } from "../strings/abstractMessage";

export const minBloodGlucoseValue = 4;
export const maxFastingGlucoseValue = 7;
export const maxAfterMealGlucoseValue = 8.5;

export function logMessage(name: string, object: any): void {
    console.log(`~~~~~~ ${name}`, JSON.stringify(object));
}

export const sessionValues = {
    requestMissingDate: 'RequestMissingDate',
    createRemindersIntent: 'CreateRemindersIntent',
    getMedicationToTakeIntent: 'GetMedicationToTakeIntent',
    carePlanIntent: 'CarePlanIntent',
}

export function getBloodGlucoseAlert(
    value: number,
    stringTiming: string,
    localizedMessages: AbstractMessage
): string {
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
