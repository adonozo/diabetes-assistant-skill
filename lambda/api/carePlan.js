const http = require("https");
const api = require("./api");

function getActiveCarePlan(email) {
    return new Promise((resolve, reject) => {
        const path = `/patients/${email}/carePlans/active`;
        const options = api.getOptionsFor(path, 'GET');
        const request = http.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    });
}

module.exports = {
    getActiveCarePlan
}
