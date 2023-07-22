const fhirPatient = require("../fhir/patient");
const {Settings, DateTime} = require("luxon");
const fhirTiming = require("../fhir/timing");

/**
 * Checks if there are missing timings, i.e., breakfast, lunch, dinner in medication or service requests.
 * @param patient The patient
 * @param requests {[]} The active medication or service request
 * @returns {Set<string>}
 */
function getActiveMissingTimings(patient, requests) {
    const timings = new Set();
    requests.forEach(request => {
        if (request.resourceType === 'MedicationRequest') {
            request.dosageInstruction.forEach(instruction =>
                instruction.timing?.repeat?.when?.forEach(timing => timings.add(timing)));
        } else if (request.resourceType === 'ServiceRequest') {
            request.occurrenceTiming?.repeat?.when?.forEach(timing => timings.add(timing));
        }
    });

    const timingPreferences = fhirPatient.getTimingPreferences(patient);
    if (!timingPreferences) {
        return timings;
    }

    timingPreferences.forEach((datetime, timing) => {
        timings.delete(timing)
    })
    return timings;
}

/**
 * Checks if there are medications without a specific start date, i.e., bound is duration rather than period.
 * @param requests {[]} The active medication requests
 * @returns {{type: string, id: string, name: string, duration: number, frequency: number} | undefined}
 */
function requestsNeedStartDate(requests) {
    for (const request of requests) {
        if (request.resourceType === 'MedicationRequest') {
            for (const instruction of request.dosageInstruction) {
                if (fhirTiming.timingNeedsStartDate(instruction.timing) && !isNaN(instruction.timing?.repeat?.boundsDuration.value)) {
                    return {
                        type: 'MedicationRequest',
                        id: instruction.id,
                        name: request.medicationReference.display,
                        duration: instruction.timing?.repeat?.boundsDuration.value,
                        frequency: instruction.timing?.repeat?.frequency
                    };
                }
            }
        } else if (request.resourceType === 'ServiceRequest') {
            if (fhirTiming.timingNeedsStartDate(request.occurrenceTiming) && !isNaN(request.occurrenceTiming?.repeat?.boundsDuration.value)) {
                return {
                    type: 'ServiceRequest',
                    id: request.id,
                    name: request.code.coding[0].display,
                    duration: request.occurrenceTiming?.repeat?.boundsDuration.value,
                    frequency: request.occurrenceTiming.repeat.frequency
                }
            }
        }
    }

    return undefined;
}

/**
 * Checks if there are medications without a specific start date, i.e., bound is duration rather than period.
 * @param patient The patient
 * @param medicationRequests {[]} The active medication request
 * @returns {Set<string>}
 */
function getMissingDates(patient, medicationRequests) {
    const dates = new Set();
    medicationRequests.forEach(request =>
        request.dosageInstruction.forEach(instruction => {
            const startDate = fhirTiming.getTimingStartDate(instruction.timing);
            if (instruction.timing?.repeat?.boundsDuration
                && !isNaN(instruction.timing?.repeat?.boundsDuration.value)
                && !startDate
            ) {
                dates.add(instruction.id)
            }
        }));
    return dates;
}

async function getTimezoneOrDefault(handlerInput) {
    const serviceClientFactory = handlerInput.serviceClientFactory;
    const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const upsServiceClient = serviceClientFactory.getUpsServiceClient();
    let userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);
    if (!userTimeZone) {
        userTimeZone = Settings.defaultZone;
    }

    return userTimeZone;
}

function utcDateFromLocalDate(date, timezone) {
    const time = DateTime.now().setZone(timezone);
    const utcDate = DateTime.fromISO(`${date}T${time.toISOTime()}`, {zone: timezone}).toUTC();
    return utcDate.toISO();
}

function utcTimeFromLocalTime(time, timezone) {
    const date = DateTime.now().setZone(timezone);
    const utcDate = DateTime.fromISO(`${date.toISODate()}T${time}`, {zone: timezone});
    return utcDate.toUTC().toISO();
}

function utcDateTimeFromLocalDateAndTime(date, time, timezone) {
    const utcDate = DateTime.fromISO(`${date}T${time}`, {zone: timezone});
    return utcDate.toISO();
}

function getSuggestedTiming(patient) {
    const date = DateTime.utc();
    let suggestion = fhirTiming.timingEvent.C;
    let minHourDiff = 10;
    const timingPreferences = fhirPatient.getTimingPreferences(patient);
    if (!timingPreferences) {
        return fhirTiming.relatedTimingCodeToString(suggestion);
    }

    timingPreferences.forEach((datetime, timing) => {
        let hoursDifference = date.diff(datetime, ["days", "hours"]).toObject().hours;
        hoursDifference = Math.abs(hoursDifference);
        if (hoursDifference < 3 && hoursDifference < minHourDiff) {
            minHourDiff = hoursDifference;
            suggestion = timing;
        }
    })

    return fhirTiming.relatedTimingCodeToString(suggestion);
}

/**
 * @param start {string} In ISO format
 * @param end {string} In ISO format
 */
function getDaysDifference(start, end) {
    const startDate = DateTime.fromISO(start);
    const endDate = DateTime.fromISO(end);
    const days = endDate.diff(startDate, ["hours"]).toObject().days;
    return Math.abs(days);
}

module.exports = {
    getMissingDates,
    getTimezoneOrDefault,
    getActiveMissingTimings,
    utcDateFromLocalDate,
    utcTimeFromLocalTime,
    utcDateTimeFromLocalDateAndTime,
    getSuggestedTiming,
    requestsNeedStartDate
}
