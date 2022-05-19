const strings = require("../strings");
const fhirTiming = require("./timing");

function getTextForServiceRequests(requests, patient, timezone) {
    return requests.map(request => getServiceText(request, patient, timezone))
        .map(data => strings.makeServiceText(data))
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
        const date = patient.resourceStartDate[request.id];
        serviceData.timings = fhirTiming.getTimesFromTimingWithFrequency(repeat.frequency, date, timezone)
            .sort();
    }

    return serviceData;
}

module.exports = {
    getTextForServiceRequests
}
