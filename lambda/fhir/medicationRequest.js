const fhirTiming = require("./timing");
const timeUtil = require("../utils/time")

function getTextForMedicationRequests(requests, timezone, localizedMessages) {
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
function getMedicationText(request, timezone) {
    const medicationData = {
        medication: '',
        dose: [],
    };
    medicationData.medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {value, unit} = getMedicationValues(dosage);
        let time;
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when)) {
            time = dosage.timing.repeat.when.sort(fhirTiming.compareWhen);
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay)) {
            time = dosage.timing.repeat.timeOfDay.sort();
        } else {
            const startTime = fhirTiming.getTimingStartTime(dosage.timing);
            time = fhirTiming.getTimesFromTimingWithFrequency(dosage.timing.repeat.frequency, startTime, timezone)
                .sort();
        }

        medicationData.dose.push({value: value, unit: unit, time: time});
    });

    return medicationData;
}

function getMedicationTextData({
    request,
    time,
    timezone,
    textProcessor,
    localizedMessages
}) {
    const medicationData = [];
    const medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {start, end} = fhirTiming.getDatesFromTiming(dosage.timing, timezone);
        const {value, unit} = getMedicationValues(dosage);

        const times = timeUtil.timesStringArraysFromTiming(dosage.timing, timezone);

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

function getMedicationValues(dosage) {
    const doseValue = dosage.doseAndRate[0].doseQuantity.value;
    const doseUnit = dosage.doseAndRate[0].doseQuantity.unit;
    return {
        value: doseValue,
        unit: doseUnit
    }
}

function requestNeedsStartDate(request) {
    return request.dosageInstruction
        .map(dosage => fhirTiming.timingNeedsStartDate(dosage.timing))
        .reduce((accumulator, current) => accumulator || current);
}

function requestNeedsStartTime(request) {
    return request.dosageInstruction
        .map(dosage => fhirTiming.timingNeedsStartTime(dosage.timing))
        .reduce((accumulator, current) => accumulator || current);
}

module.exports = {
    getTextForMedicationRequests,
    getMedicationTextData,
    requestNeedsStartDate,
    requestNeedsStartTime
}
