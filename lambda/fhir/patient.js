const fhirTiming = require('./timing')

const TIMING_PREFERENCES = 'http://diabetes-assistant.com/fhir/StructureDefinition/TimingPreference'

function getTimingPreferences(patient) {
    if (!patient.extension || !Array.isArray(patient.extension)) {
        return undefined;
    }

    const preferences = new Map();
    const timingExtension = patient.extension.find(ext => ext.url === TIMING_PREFERENCES);
    if (!timingExtension) {
        return undefined;
    }

    timingExtension.extension.map(ext => {
        const date = fhirTiming.tryParseDate(ext.valueDateTime);
        if (date) {
            preferences.set(ext.url, ext.valueDateTime);
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
