const fhirTiming = require('./timing')

const DOSAGE_EXTENSION = 'http://diabetes-assistant.com/fhir/StructureDefinition/DosageStartDate'

function getTimingPreferences(patient) {
    if (!patient.extension || Array.isArray(patient.extension)) {
        return undefined;
    }

    const preferences = new Map();
    const dosageExtension = patient.extension.find(ext => ext.url === DOSAGE_EXTENSION);
    if (!dosageExtension) {
        return undefined;
    }

    dosageExtension.extension.map(ext => {
        const date = fhirTiming.tryParseDate(ext.value);
        if (date) {
            preferences.set(ext.url, ext.value);
        }
    });

    return preferences;
}

function getPatientSubject(patient) {
    return {
        reference: `Patient/${patient.id}`,
        display: getPatientFullName(patient)
    }
}

function getPatientFullName(patient) {
    let name = '';
    if (!patient.name || !Array.isArray(patient.name) || patient.name.length === 0) {
        return name;
    }

    name += patient.name[0].given?.join(' ')
    name += patient.name[0].family;
    return name;
}

module.exports = {
    getTimingPreferences,
    getPatientSubject,
}
