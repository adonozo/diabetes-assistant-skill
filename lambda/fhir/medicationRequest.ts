import { Dosage, Extension, MedicationRequest } from "fhir/r5";
import { MessagesInterface } from "../strings/messages-interface";
import { DoseValue, MedicationData, MedicationRequestInputData, ResourceReminderData } from "../types";
import {
    compareWhen,
    getDatesFromTiming,
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    timingNeedsStartDate,
    timingNeedsStartTime
} from "./timing";
import { timesStringArraysFromTiming } from "../utils/time";

export function getTextForMedicationRequests(
    requests: MedicationRequest[],
    timezone: string,
    localizedMessages: MessagesInterface
): string {
    return requests.map(request => getMedicationText(request, timezone))
        .map(data => localizedMessages.makeMedicationText(data))
        .join('. ');
}

/**
 *
 * @param request
 * @param timezone
 * @returns {{dose: *[], medication: string}}
 */
export function getMedicationText(request: MedicationRequest, timezone: string): MedicationData {
    const medicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = request.medication.reference.display;
    request.dosageInstruction.forEach(dosage => {
        const {value, unit} = getMedicationValues(dosage);
        let time;
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when)) {
            time = dosage.timing.repeat.when.sort(compareWhen);
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay)) {
            time = dosage.timing.repeat.timeOfDay.sort();
        } else {
            const startTime = getTimingStartTime(dosage.timing);
            time = getTimesFromTimingWithFrequency(dosage.timing.repeat.frequency, startTime, timezone)
                .sort();
        }

        medicationData.dose.push({value: value, unit: unit, time: time});
    });

    return medicationData;
}

export function getMedicationTextData(
    {
        request,
        time,
        timezone,
        textProcessor,
        localizedMessages
    }: MedicationRequestInputData
): ResourceReminderData[] {
    const medicationData = [];
    const medication = request.medication.reference.display;
    request.dosageInstruction.forEach(dosage => {
        const {start, end} = getDatesFromTiming(dosage.timing, timezone);
        const {value, unit} = getMedicationValues(dosage);

        const times = timesStringArraysFromTiming(dosage.timing, timezone);

        const processedText = textProcessor({
            time,
            value: value,
            unit: unit,
            medication: medication,
            times: times,
            start: start,
            end: end,
            dayOfWeek: dosage.timing.repeat.dayOfWeek,
            localizedMessages: localizedMessages
        });
        medicationData.push(processedText)
    });

    return medicationData;
}

export function getMedicationValues(dosage: Dosage): DoseValue {
    const doseValue = dosage.doseAndRate[0].doseQuantity.value;
    const doseUnit = dosage.doseAndRate[0].doseQuantity.unit;
    return {
        value: doseValue,
        unit: doseUnit
    }
}

export function requestNeedsStartDate(request: MedicationRequest): Extension {
    return request.dosageInstruction
        .map(dosage => timingNeedsStartDate(dosage.timing))
        .reduce((accumulator, current) => accumulator || current);
}

export function requestNeedsStartTime(request: MedicationRequest): Extension {
    return request.dosageInstruction
        .map(dosage => timingNeedsStartTime(dosage.timing))
        .reduce((accumulator, current) => accumulator || current);
}
