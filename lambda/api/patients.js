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

function updateTiming(email, timingUpdate) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(timingUpdate);
        const path = `/patients/${email}/timing`
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

/**
 *
 * @param email {string} The patient's email
 * @param dosageId {string} The dosage ID to set the start date for
 * @param startDate {{startDate: string}} The medication start date
 * @return {Promise<any>} An empty response if successful
 */
function setDosageStartDate(email, dosageId, startDate) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(startDate);
        const path = `/patients/${email}/dosage/${dosageId}/startDate`
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
        const path = `/alexa/${email}/medicationRequests?${params.toString()}`
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    })
}

module.exports = {
    getSelf,
    updateTiming,
    setDosageStartDate,
    saveBloodGlucoseLevel,
    getObservationsOnDate,
    getMedicationRequests,
}
