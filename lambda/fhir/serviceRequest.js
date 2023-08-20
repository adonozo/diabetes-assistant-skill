const fhirTiming = require("./timing");
const fhir = require("./fhir");
const timeUtil = require("../utils/time");

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
    } else {
        const startTime = fhirTiming.getTimingStartTime(request.occurrenceTiming);
        serviceData.timings = fhirTiming.getTimesFromTimingWithFrequency(repeat.frequency, startTime, timezone)
            .sort();
    }

    return serviceData;
}

function getServiceTextData({
    request,
    time,
    timezone,
    textProcessor,
    localizedMessages
}) {
    const serviceData = [];
    const action = request.code.coding[0].display;

    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const {start, end} = fhirTiming.getDatesFromTiming(request.occurrenceTiming, timezone);

    request.contained.forEach(contained => {
        const timing = contained.occurrenceTiming;
        const times = timeUtil.timesStringArraysFromTiming(timing);

        const processedText = textProcessor({
            time,
            action: action,
            times: times,
            start: start,
            end: end,
            dayOfWeek: timing.repeat.dayOfWeek,
            localizedMessages: localizedMessages
        })
        serviceData.push(processedText)
    })

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
