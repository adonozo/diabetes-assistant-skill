const luxon = require("luxon");
const {DateTime} = require("luxon");
const fhirTiming = require("./fhir/timing");
const strings = require("./strings");
const fhirPatient = require("./fhir/patient");

const minBloodGlucoseValue = 4;
const maxFastingGlucoseValue = 7;
const maxAfterMealGlucoseValue = 8.5;

function logMessage(name, object) {
    console.log(`===== ${name} =====`);
    console.log(JSON.stringify(object));
}

const sessionValues = {
    requestMissingDate: 'requestMissingDate',
    medicationReminderIntent: 'MedicationReminderIntent',
    createRemindersIntent: 'CreateRemindersIntent',
    medicationForDateIntent: 'MedicationForDateIntent',
    carePlanIntent: 'CarePlanIntent',
}

/**
 * Checks if there are missing timings, i.e., breakfast, lunch, dinner in medication or service requests.
 * @param patient The patient
 * @param requests {[]} The active medication request
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

    Object.keys(patient.exactEventTimes).forEach(timing => timings.delete(timing));
    return timings;
}

/**
 * Checks if there are missing timings, i.e., breakfast, lunch, dinner
 * @param patient The patient
 * @param medicationRequests {[]} The active medication request
 * @returns {Set<string>}
 */
function getMissingTimings(patient, medicationRequests) {
    const timings = new Set();
    medicationRequests.forEach(request =>
        request.dosageInstruction.forEach(instruction =>
            instruction.timing?.repeat?.when?.forEach(timing => timings.add(timing))));
    Object.keys(patient.exactEventTimes).forEach(timing => timings.delete(timing));
    return timings;
}

/**
 * Checks if there are medications without a specific start date, i.e., bound is duration rather than period.
 * @param patient The patient
 * @param requests {[]} The active medication request
 * @returns {{type: string, id: string, name: string, duration: string, frequency: number} | undefined}
 */
function getActiveMissingDate(patient, requests) {
    for (const request of requests) {
        if (request.resourceType === 'MedicationRequest') {
            for (const instruction of request.dosageInstruction) {
                if (instruction.timing?.repeat?.boundsDuration
                    && !isNaN(instruction.timing?.repeat?.boundsDuration.value)
                    && !patient.resourceStartDate[instruction.id]) {
                    return {
                        type: 'MedicationRequest',
                        id: instruction.id,
                        name: request.medicationReference.display,
                        duration: instruction.timing?.repeat?.boundsDuration.value,
                        frequency: instruction.timing?.repeat?.frequency
                    }
                } else if (instruction.timing?.repeat?.boundsPeriod
                    && instruction.timing?.repeat?.frequency > 1
                    && !patient.resourceStartDate[instruction.id]) {
                    const duration = getDaysDifference(instruction.timing.repeat.boundsPeriod.start, instruction.timing.repeat.boundsPeriod.end);
                    return {
                        type: 'MedicationRequest',
                        id: instruction.id,
                        name: request.medicationReference.display,
                        duration: duration,
                        frequency: instruction.timing?.repeat?.frequency
                    }
                }
            }
        } else if (request.resourceType === 'ServiceRequest') {
            if (request.occurrenceTiming?.repeat?.boundsDuration
                && !isNaN(request.occurrenceTiming?.repeat?.boundsDuration.value)
                && !patient.resourceStartDate[request.id]) {
                return {
                    type: 'ServiceRequest',
                    id: request.id,
                    name: request.code.coding[0].display,
                    duration: request.occurrenceTiming?.repeat?.boundsDuration.value,
                    frequency: request.occurrenceTiming.repeat.frequency
                };
            } else if (request.occurrenceTiming?.repeat?.boundsPeriod
                && request.occurrenceTiming?.repeat?.frequency > 1
                && !patient.resourceStartDate[request.id]) {
                const duration = getDaysDifference(request.occurrenceTiming.repeat.boundsPeriod.start, request.occurrenceTiming.repeat.boundsPeriod.end);
                return {
                    type: 'ServiceRequest',
                    id: request.id,
                    name: request.code.coding[0].display,
                    duration: duration,
                    frequency: request.occurrenceTiming.repeat.frequency
                };
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
        request.dosageInstruction.forEach(instruction =>
        {
            if (instruction.timing?.repeat?.boundsDuration && !isNaN(instruction.timing?.repeat?.boundsDuration.value)) {
                dates.add(instruction.id)
            }
        }));
    Object.keys(patient.resourceStartDate).forEach(date => dates.delete(date));
    return dates;
}

async function getTimezoneOrDefault(handlerInput) {
    const serviceClientFactory = handlerInput.serviceClientFactory;
    const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;
    const upsServiceClient = serviceClientFactory.getUpsServiceClient();
    let userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);
    if (!userTimeZone) {
        userTimeZone = luxon.Settings.defaultZone;
    }

    return userTimeZone;
}

function getDelegatedSetTimingIntent(timing) {
    return {
        name: 'SetTimingIntent',
        confirmationStatus: "NONE",
        slots: {
            event: {
                name: 'event',
                value: timing,
                confirmationStatus: 'NONE',
            }
        }
    }
}

function getDelegatedSetStartDateIntent(healthRequestName) {
    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: {
            healthRequest: {
                name: 'healthRequest',
                value: healthRequestName,
                confirmationStatus: 'NONE',
            }
        }
    }
}

function getDelegatedSetStartDateWithTimeIntent(healthRequestName, time) {
    return {
        name: 'SetStartDateIntent',
        confirmationStatus: "NONE",
        slots: {
            healthRequest: {
                name: 'healthRequest',
                value: healthRequestName,
                confirmationStatus: 'NONE',
            },
            healthRequestTime: {
                name: 'healthRequestTime',
                value: time,
                confirmationStatus: 'CONFIRMED',
            }
        }
    }
}

function utcDateFromLocalDate(date, timezone) {
    const time = DateTime.now().setZone(timezone);
    const utcDate = luxon.DateTime.fromISO(`${date}T${time.toISOTime()}`, {zone: timezone}).toUTC();
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

function getBloodGlucoseAlert(value, stringTiming) {
    if (value < minBloodGlucoseValue) {
        return strings.responses.enGb.LOW_GLUCOSE;
    }

    const timing = fhirTiming.stringToTimingCode(stringTiming);
    if ((timing === fhirTiming.timingEvent.ACM && value > maxFastingGlucoseValue)
        || value > maxAfterMealGlucoseValue) {
        return strings.responses.enGb.HIGH_GLUCOSE;
    }

    return '';
}

module.exports = {
    logMessage,
    getMissingTimings,
    getMissingDates,
    getTimezoneOrDefault,
    getDelegatedSetTimingIntent,
    getDelegatedSetStartDateIntent,
    getActiveMissingTimings,
    getActiveMissingDate,
    utcDateFromLocalDate,
    utcTimeFromLocalTime,
    utcDateTimeFromLocalDateAndTime,
    getSuggestedTiming,
    getDelegatedSetStartDateWithTimeIntent,
    getBloodGlucoseAlert,
    sessionValues
}
