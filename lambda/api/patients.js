const http = require("https");
const api = require("./api");

function getSelf(email) {
    return new Promise((resolve, reject) => {
        const path = `/patients/${email}`
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    });
}

/**
 *
 * @param email {string} The patient's email
 * @param dosageId {string} The dosage ID to set the start date for
 * @param startDateTime {{startDate: string, startTime: string}} The medication start date
 * @return {Promise<any>} An empty response if successful
 */
function setDosageStartDate(email, dosageId, startDateTime) {
    const path = `/patients/${email}/dosage/${dosageId}/start-date`;
    return setResourceStartDate(email, dosageId, startDateTime, path);
}

function setServiceRequestStartDate(email, serviceRequestId, startDate) {
    const path = `/patients/${email}/service-request/${serviceRequestId}/start-date`;
    return setResourceStartDate(email, serviceRequestId, startDate, path);
}

function setResourceStartDate(email, serviceRequestId, startDateTime, path) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(startDateTime);
        const options = api.getOptionsFor(path, 'PUT');
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.write(data);
        request.end();
    });
}

function saveBloodGlucoseLevel(email, observation) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(observation);
        const path = `/patients/${email}/observations`
        const options = api.getOptionsFor(path, 'POST');
        options.headers = {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.write(data);
        request.end();
    })
}

function getObservationsOnDate(email, date, timing, timezone) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams();
        params.append("date", date);
        params.append("timing", timing);
        params.append("timezone", timezone);
        const path = `/alexa/${email}/observations/?${params.toString()}`
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    });
}

function getMedicationRequests(email, date, timing, timezone) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams();
        params.append("date", date)
        params.append("timing", timing)
        params.append("timezone", timezone)
        const path = `/alexa/${email}/medication-requests?${params.toString()}`
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    })
}

module.exports = {
    getSelf,
    setDosageStartDate,
    setServiceRequestStartDate,
    saveBloodGlucoseLevel,
    getObservationsOnDate,
    getMedicationRequests,
}
