const fhirTiming = require("./timing");
const {DateTime} = require("luxon");
const fhirPatient = require("./patient");

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

function getTextForMedicationRequests(requests, patient, timezone, localizedMessages) {
    return requests.map(request => getMedicationText(request, patient, timezone))
        .map(data => localizedMessages.makeMedicationText(data))
        .join('. ');
}

function getMedicationText(request, patient, timezone) {
    const medicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {value, unit} = getMedicationValues(dosage);
        let time = [];
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when)) {
            time = dosage.timing.repeat.when.sort(fhirTiming.compareWhen);
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay)) {
            time = dosage.timing.repeat.timeOfDay.sort();
        } else if (dosage.timing.repeat.frequency > 1) {
            const startDate = fhirTiming.getTimingStartDate(dosage.timing);
            time = fhirTiming.getTimesFromTimingWithFrequency(dosage.timing.repeat.frequency, startDate, timezone)
                .sort();
        }

        medicationData.dose.push({value: value, unit: unit, time: time});
    });

    return medicationData;
}

function getMedicationTextData({
    request,
    patient,
    timezone,
    textProcessor,
    localizedMessages
}) {
    const medicationData = [];
    const medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {start, end} = fhirTiming.getDatesFromTiming(dosage.timing, fhirTiming.getTimingStartDate, dosage);
        const {value, unit} = getMedicationValues(dosage);
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when) && dosage.timing.repeat.when.length > 0) {
            dosage.timing.repeat.when.forEach(timing => {
                const timingPreferences = fhirPatient.getTimingPreferences(patient);
                const patientDate = timingPreferences.get(timing);
                const dateTime = DateTime.fromISO(patientDate).setZone(timezone); // Date already in UTC
                const processedText = textProcessor({
                    value: value,
                    unit: unit,
                    medication: medication,
                    timing: timing,
                    dateTime: dateTime,
                    start: start,
                    end: end,
                    frequency: dosage.timing.repeat.frequency,
                    dayOfWeek: dosage.timing.repeat.dayOfWeek,
                    localizedMessages: localizedMessages
                })
                medicationData.push(processedText)
            });
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay) && dosage.timing.repeat.timeOfDay.length > 0) {
            dosage.timing.repeat.timeOfDay.forEach(time => {  // Timing is in local time
                const date = DateTime.utc();
                const dateTime = DateTime.fromISO(`${date.toISODate()}T${time}Z`);
                const processedText = textProcessor({
                    value: value,
                    unit: unit,
                    medication: medication,
                    timing: time,
                    dateTime: dateTime,
                    start: start,
                    end: end,
                    frequency: dosage.timing.repeat.frequency,
                    dayOfWeek: dosage.timing.repeat.dayOfWeek,
                    localizedMessages: localizedMessages
                })
                medicationData.push(processedText)
            });
        } else if (dosage.timing.repeat.frequency && dosage.timing.repeat.frequency > 1) {
            const startDate = fhirTiming.getTimingStartDate(dosage.timing); // This is in UTC
            const dateTime = DateTime.fromISO(startDate).setZone(timezone);
            const processedText = textProcessor({
                value: value,
                unit: unit,
                medication: medication,
                timing: dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }),
                dateTime: dateTime,
                start: start,
                end: end,
                frequency: dosage.timing.repeat.frequency,
                dayOfWeek: dosage.timing.repeat.dayOfWeek,
                localizedMessages: localizedMessages
            })
            medicationData.push(processedText)
        }
    });

    return medicationData;
}

function getMedicationValues(dosage) {
    const doseValue = dosage.doseAndRate[0].doseQuantity.value;
    const doseUnit = dosage.doseAndRate[0].doseQuantity.unit;
    return {
        value: doseValue,
        unit: doseUnit
    }
}

module.exports = {
    requestListFromBundle,
    getMedicationFromDosageId,
    getTextForMedicationRequests,
    getMedicationTextData,
}
