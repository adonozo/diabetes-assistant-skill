const http = require("http");
const api = require("./api");

function getActiveMedicationRequests(email) {
    return new Promise((resolve, reject) => {
        const path = `/patients/${email}/medicationRequests/active`;
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    });
}

module.exports = {
    getActiveMedicationRequests
}