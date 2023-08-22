const fhirPatient = require("../fhir/patient");
const {Settings, DateTime} = require("luxon");
const fhirTiming = require("../fhir/timing");

/**
 * Checks if there are medications without a specific start date, i.e., bound is duration rather than period.
 * @param requests {[]} The active medication requests
 * @returns {{type: string, id: string, name: string, duration: number, frequency: number, timing: {}} | undefined}
 */
function requestsNeedStartDate(requests) {
    for (const request of requests) {
        if (request.resourceType === 'MedicationRequest') {
            const customResource = buildCustomMedicationRequest(request);
            if (customResource) {
                return customResource;
            }
        } else if (request.resourceType === 'ServiceRequest') {
            const customResource = buildCustomServiceRequest(request)
            if (customResource) {
                return customResource;
            }
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

function buildCustomMedicationRequest(medicationRequest) {
    for (const instruction of medicationRequest.dosageInstruction) {
        if (fhirTiming.timingNeedsStartDate(instruction.timing) || fhirTiming.timingNeedsStartTime(instruction.timing)) {
            return {
                type: 'MedicationRequest',
                id: instruction.id,
                name: medicationRequest.medicationReference.display,
                duration: instruction.timing?.repeat?.boundsDuration.value,
                durationUnit: instruction.timing?.repeat?.boundsDuration.unit,
                frequency: instruction.timing?.repeat?.frequency,
                timing: instruction.timing
            };
        }
    }

    return undefined;
}

function buildCustomServiceRequest(serviceRequest) {
    for (const request of serviceRequest.contained)
    {
        const timing = request.occurrenceTiming;
        if (fhirTiming.timingNeedsStartDate(timing) || fhirTiming.timingNeedsStartTime(timing) ) {
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
    }

    return undefined;
}

function timesStringArraysFromTiming(timing, timezone) {
    let times;
    if (timing.repeat.when && Array.isArray(timing.repeat.when) && timing.repeat.when.length > 0) {
        times = timing.repeat.when;
    } else if (timing.repeat.timeOfDay && Array.isArray(timing.repeat.timeOfDay) && timing.repeat.timeOfDay.length > 0) {
        times = timing.repeat.timeOfDay;
    } else {
        const startTime = fhirTiming.getTimingStartTime(timing);
        times = frequencyTimesStringArray(startTime, timing.repeat.frequency, timezone).sort();
    }

    return times;
}

/**
 *
 * @param startTime The event's start time
 * @param frequency How many times in the day
 * @param timezone Patient's timezone
 * @return {string[]}
 */
function frequencyTimesStringArray(startTime, frequency, timezone) {
    const now = DateTime.local({zone: timezone});
    const startDateTime = DateTime.fromISO(`${now.toISODate()}T${startTime}`, {zone: timezone});
    if (frequency === 1) {
        return [startDateTime.toISOTime({ suppressSeconds: true, includeOffset: false })]
    }

    const hoursDifference = 24 / frequency;

    return [...Array(frequency).keys()]
        .map(index => startDateTime.plus({hours: index * hoursDifference}))
        .map(dateTime => dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }));
}

function getHoursAndMinutes(stringTime) {
    const timeParts = stringTime.split(':');
    return {hour: timeParts[0], minute: timeParts[1]};
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
