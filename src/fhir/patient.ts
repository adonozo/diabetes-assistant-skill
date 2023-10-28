import { Patient, Reference } from "fhir/r5";

export function getPatientSubject(patient: Patient): Reference {
    return {
        reference: `Patient/${patient.id}`,
        display: getPatientFullName(patient)
    }
}

export function getPatientFullName(patient: Patient): string {
    if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
        return '';
    }

    let name = patient.name[0].given?.join(' ') ?? '';
    name += patient.name[0].family;
    return name;
}
