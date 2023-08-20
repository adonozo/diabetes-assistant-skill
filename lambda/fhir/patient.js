const fhirTiming = require('./timing')
const fhir = require("./fhir");

const TIMING_PREFERENCES = 'http://diabetes-assistant.com/fhir/StructureDefinition/TimingPreference'

/**
 * @deprecated patient preferences are no longer supported
 * @param patient
 * @returns {Map<any, any>}
 */
function getTimingPreferences(patient) {
    const timingExtension = fhir.getExtension(patient, TIMING_PREFERENCES);
    const preferences = new Map();
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
