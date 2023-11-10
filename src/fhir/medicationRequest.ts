import { Dosage, MedicationRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { DoseValue, MedicationData } from "../types";
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

export function getMedicationText(request: MedicationRequest, timezone: string): MedicationData {
    const medicationData: MedicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = getMedicationName(request);
    request.dosageInstruction?.forEach(dosage => {
        if (!dosage.timing) {
            return;
        }

        const {value, unit} = getMedicationValues(dosage);
        const time = timesStringArraysFromTiming(dosage.timing, timezone);
        medicationData.dose.push({value: value, unit: unit, time: time});
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
