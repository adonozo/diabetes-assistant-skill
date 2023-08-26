const {Settings, DateTime} = require("luxon");
const fhirTiming = require("../fhir/timing");

/**
 * Checks if there are medications without a specific start date, i.e., bound is duration rather than period.
 * @param requests {[]} The active medication requests
 * @returns {{type: string, id: string, name: string, duration: number, frequency: number, timing: {}} | undefined}
 */
function requestsNeedStartDate(requests) {
    for (const request of requests) {
        if (request.resourceType === 'MedicationRequest' && getDosageNeedingSetup(request) !== undefined) {
            const dosage = getDosageNeedingSetup(request)
            return buildCustomMedicationRequest(dosage, request.medicationReference.display);
        } else if (request.resourceType === 'ServiceRequest' && serviceNeedsDateTimeSetup(request)) {
            return buildCustomServiceRequest(request);
        }
    }

    return undefined;
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

function buildCustomMedicationRequest(dosageInstruction, medicationName) {
    return {
        type: 'MedicationRequest',
        id: dosageInstruction.id,
        name: medicationName,
        duration: dosageInstruction.timing?.repeat?.boundsDuration.value,
        durationUnit: dosageInstruction.timing?.repeat?.boundsDuration.unit,
        frequency: dosageInstruction.timing?.repeat?.frequency,
        timing: dosageInstruction.timing
    };
}

function buildCustomServiceRequest(serviceRequest) {
    const timing = serviceRequest.occurrenceTiming;
    return {
        type: 'ServiceRequest',
        id: serviceRequest.id,
        name: serviceRequest.code.coding[0].display,
        duration: timing?.repeat?.boundsDuration.value,
        durationUnit: timing?.repeat?.boundsDuration.unit,
        frequency: timing?.repeat.frequency,
        timing: timing
    }
}

function timesStringArraysFromTiming(timing, timezone) {
    let times;
    if (timing.repeat.when && Array.isArray(timing.repeat.when) && timing.repeat.when.length > 0) {
        times = timing.repeat.when;
    } else if (timing.repeat.timeOfDay && Array.isArray(timing.repeat.timeOfDay) && timing.repeat.timeOfDay.length > 0) {
        times = timing.repeat.timeOfDay;
    } else {
        const startTime = fhirTiming.getTimingStartTime(timing);
        times = fhirTiming.getTimesFromTimingWithFrequency(timing.repeat.frequency, startTime, timezone).sort();
    }

    return times;
}

function getHoursAndMinutes(stringTime) {
    const timeParts = stringTime.split(':');
    return {hour: timeParts[0], minute: timeParts[1]};
}

function serviceNeedsDateTimeSetup(serviceRequest) {
    return fhirTiming.timingNeedsStartDate(serviceRequest.occurrenceTiming) || fhirTiming.timingNeedsStartTime(serviceRequest.occurrenceTiming);
}

function getDosageNeedingSetup(medicationRequest) {
    return medicationRequest.dosageInstruction
        .find(dosage => fhirTiming.timingNeedsStartDate(dosage.timing) || fhirTiming.timingNeedsStartTime(dosage.timing));
}

module.exports = {
    getTimezoneOrDefault,
    utcDateFromLocalDate,
    utcTimeFromLocalTime,
    utcDateTimeFromLocalDateAndTime,
    requestsNeedStartDate,
    timesStringArraysFromTiming,
    getHoursAndMinutes
}
