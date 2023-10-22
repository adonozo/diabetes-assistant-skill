import { Dosage, MedicationRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { DoseValue, MedicationData, MedicationRequestTextDataArgs, ResourceReminderData } from "../types";
import {
    compareWhen,
    getDatesFromTiming,
    getTimesFromTimingWithFrequency,
    getTimingStartTime
} from "./timing";
import { timesStringArraysFromTiming } from "../utils/time";

export function getTextForMedicationRequests(
    requests: MedicationRequest[],
    timezone: string,
    localizedMessages: AbstractMessage
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
    const medicationData: MedicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = getMedicationName(request);
    request.dosageInstruction?.forEach(dosage => {
        const {value, unit} = getMedicationValues(dosage);
        let time;
        if (dosage.timing?.repeat?.when && Array.isArray(dosage.timing.repeat.when)) {
            time = dosage.timing.repeat.when.sort(compareWhen);
        } else if (dosage.timing?.repeat?.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay)) {
            time = dosage.timing.repeat.timeOfDay.sort();
        } else {
            const startTime = getTimingStartTime(dosage.timing!)!;
            time = getTimesFromTimingWithFrequency(dosage.timing?.repeat?.frequency ?? 0, startTime, timezone)
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
    }: MedicationRequestTextDataArgs
): ResourceReminderData[] {
    const medicationData: ResourceReminderData[] = [];
    const medication = getMedicationName(request);
    request.dosageInstruction?.forEach(dosage => {
        const {start, end} = getDatesFromTiming(dosage.timing!, timezone);
        const {value, unit} = getMedicationValues(dosage);

        const times = timesStringArraysFromTiming(dosage.timing!, timezone);

        const processedText = textProcessor({
            time,
            value: value,
            unit: unit,
            medication: medication,
            times: times,
            start: start,
            end: end,
            dayOfWeek: dosage.timing?.repeat?.dayOfWeek ?? [],
            localizedMessages: localizedMessages
        });
        medicationData.push(processedText)
    });

    return medicationData;
}

export function getMedicationValues(dosage: Dosage): DoseValue {
    const doseValue = (dosage.doseAndRate && dosage.doseAndRate[0].doseQuantity?.value) ?? 0;
    const doseUnit = (dosage.doseAndRate && dosage.doseAndRate[0].doseQuantity?.unit) ?? '';
    return {
        value: doseValue,
        unit: doseUnit
    }
}

export function getMedicationName(request: MedicationRequest): string {
    const errorMessage = `Medication request ${request.id} does not have a valid contained medication`;
    if (!request.contained || request.contained.length !== 1) {
        throw new Error(errorMessage)
    }

    const medication = request.contained[0];
    if (medication.resourceType !== 'Medication') {
        throw new Error(errorMessage)
    }

    return (medication.code?.coding && medication.code?.coding[0].display) ?? '';
}

