const fhirTiming = require("./timing");
const strings = require("./../strings");

/**
 * Gets the list of medication requests from a bundle.
 * @param bundle
 * @returns {*[]}
 */
function requestListFromBundle(bundle) {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry.filter(entry => entry.resource.resourceType === "MedicationRequest").map(item => item.resource)
}

/**
 * Gets the medication name from a dosage ID, to present it to the patient
 * @param dosageId {string} The dosage ID to look for.
 * @param requests {[]} The list of medication requests.
 * @returns {{name: string, duration: number}}
 */
function getMedicationFromDosageId(dosageId, requests) {
    let result = {name: '', duration: 0};
    requests.forEach(request =>
        request.dosageInstruction.forEach(instruction =>
        {
            if (instruction.id === dosageId) {
                result = {
                    name: request.medicationReference.display,
                    duration: instruction.timing?.repeat?.boundsDuration.value
                }
            }
        }));

    return result;
}

function getTextForMedicationRequests(requests, patient, timezone) {
    return requests.map(request => getMedicationText(request, patient, timezone))
        .map(data => strings.makeMedicationText(data))
        .join('. ');
}

function getMedicationText(request, patient, timezone) {
    const medicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {value, unit} = strings.getMedicationValues(dosage);
        let time = [];
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when)) {
            time = dosage.timing.repeat.when.sort(fhirTiming.compareWhen);
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay)) {
            time = dosage.timing.repeat.timeOfDay.sort();
        } else if (dosage.timing.repeat.frequency > 1) {
            const date = patient.resourceStartDate[dosage.id];
            time = fhirTiming.getTimesFromTimingWithFrequency(dosage.timing.repeat.frequency, date, timezone)
                .sort();
        }

        medicationData.dose.push({value: value, unit: unit, time: time});
    });

    return medicationData;
}

module.exports = {
    requestListFromBundle,
    getMedicationFromDosageId,
    getTextForMedicationRequests
}
