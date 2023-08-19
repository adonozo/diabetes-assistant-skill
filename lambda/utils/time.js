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
            for (const instruction of request.dosageInstruction) {
                if (fhirTiming.timingNeedsStartDate(instruction.timing) || fhirTiming.timingNeedsStartTime(instruction.timing)) {
                    return {
                        type: 'MedicationRequest',
                        id: instruction.id,
                        name: request.medicationReference.display,
                        duration: instruction.timing?.repeat?.boundsDuration.value,
                        durationUnit: instruction.timing?.repeat?.boundsDuration.unit,
                        frequency: instruction.timing?.repeat?.frequency,
                        timing: instruction.timing
                    };
                }
            }
        } else if (request.resourceType === 'ServiceRequest') {
            if (fhirTiming.timingNeedsStartDate(request.occurrenceTiming) || fhirTiming.timingNeedsStartTime(request.occurrenceTiming) ) {
                return {
                    type: 'ServiceRequest',
                    id: request.id,
                    name: request.code.coding[0].display,
                    duration: request.occurrenceTiming?.repeat?.boundsDuration.value,
                    durationUnit: request.occurrenceTiming?.repeat?.boundsDuration.unit,
                    frequency: request.occurrenceTiming.repeat.frequency,
                    timing: request.occurrenceTiming
                }
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

module.exports = {
    getTimezoneOrDefault,
    utcDateFromLocalDate,
    utcTimeFromLocalTime,
    utcDateTimeFromLocalDateAndTime,
    getSuggestedTiming,
    requestsNeedStartDate
}
