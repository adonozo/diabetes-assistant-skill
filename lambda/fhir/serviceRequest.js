const fhirTiming = require("./timing");
const {DateTime} = require("luxon");
const fhir = require("./fhir");
const fhirPatient = require("./patient");

const SERVICE_REQUEST_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/ServiceRequestStartDate';

function getTextForServiceRequests(requests, patient, timezone, localizedMessages) {
    return requests.map(request => getServiceText(request, patient, timezone))
        .map(data => localizedMessages.makeServiceText(data))
        .join('. ');
}

function getServiceText(request, patient, timezone) {
    const serviceData = {
        action: '',
        timings: [],
    };
    serviceData.action = request.code.coding[0].display;
    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const repeat = request.occurrenceTiming.repeat;
    if (repeat.when && Array.isArray(repeat.when)) {
        serviceData.timings = repeat.when.sort(fhirTiming.compareWhen);
    } else if (repeat.timeOfDay && Array.isArray(repeat.timeOfDay)) {
        serviceData.timings = repeat.timeOfDay.sort();
    } else if (repeat.frequency > 1) {
        const startDate = getServiceRequestStartDate(request);
        serviceData.timings = fhirTiming.getTimesFromTimingWithFrequency(repeat.frequency, startDate, timezone)
            .sort();
    }

    return serviceData;
}

function getServiceTextData({
    request,
    patient,
    timezone,
    textProcessor,
    localizedMessages
}) {
    const serviceData = [];
    const action = request.code.coding[0].display;

    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const {start, end} = fhirTiming.getDatesFromTiming(request.occurrenceTiming, getServiceRequestStartDate, request);
    const repeat = request.occurrenceTiming.repeat;
    if (repeat.when && Array.isArray(repeat.when) && repeat.when.length > 0) {
        repeat.when.forEach(timing => {
            const timingPreferences = fhirPatient.getTimingPreferences(patient);
            const patientDate = timingPreferences.get(timing);
            const dateTime = DateTime.fromISO(patientDate).setZone(timezone);
            const processedText = textProcessor({
                action: action,
                timing: timing,
                dateTime: dateTime,
                start: start,
                end: end,
                frequency: repeat.frequency,
                dayOfWeek: repeat.dayOfWeek,
                localizedMessages: localizedMessages
            })
            serviceData.push(processedText)
        });
    } else if (repeat.timeOfDay && Array.isArray(repeat.timeOfDay) && repeat.timeOfDay.length > 0) {
        repeat.timeOfDay.forEach(timing => {  // Timing is in local time (hh:mm)
            const date = DateTime.utc();
            const dateTime = DateTime.fromISO(`${date.toISODate()}T${timing}Z`);
            const processedText = textProcessor({
                action: action,
                timing: timing,
                dateTime: dateTime, // RRULE uses local time, should not convert to UTC
                start: start,
                end: end,
                frequency: repeat.frequency,
                dayOfWeek: repeat.dayOfWeek,
                localizedMessages: localizedMessages
            })
            serviceData.push(processedText)
        });
    } else if (repeat.frequency && repeat.frequency > 1) {
        const startDate = getServiceRequestStartDate(request); // This is in UTC
        const dateTime = DateTime.fromISO(startDate).setZone(timezone);
        const processedText = textProcessor({
            action: action,
            timing: dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }),
            dateTime: dateTime,
            start: start,
            end: end,
            frequency: repeat.frequency,
            dayOfWeek: repeat.dayOfWeek,
            localizedMessages: localizedMessages
        })
        serviceData.push(processedText)
    }

    return serviceData;
}

function getServiceRequestStartDate(serviceRequest) {
    const startDateExtension = fhir.getExtension(serviceRequest, SERVICE_REQUEST_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = fhirTiming.tryParseDate(startDateExtension.valueDateTime);
    if (date) {
        return date;
    }

    return undefined;
}

module.exports = {
    getTextForServiceRequests,
    getServiceTextData,
    getServiceRequestStartDate,
}
