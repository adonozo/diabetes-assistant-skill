const http = require('https');

const baseUrl = '__ENV_BACKEND_URL';
const port = '__ENV_BACKEND_PORT';

function postEchoJson(data) {
    return new Promise((resolve, reject) => {
        const options = {
            host: baseUrl,
            port: port,
            path: '/patients/echo',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const request = http.request(options, response => {
            response.setEncoding('utf8');
            let responseData = '';

            response.on('data', chunk => {
                responseData += chunk;
            });

            response.on("end", () => {
                resolve(responseData);
            });

            response.on("error", error => {
                console.log(error);
                reject(error);
            })
        });
        request.write(data);
        request.end();
    })
}

function createJsonResponse(resolve, reject, response) {
    response.setEncoding('utf8');
    let responseData = '';

    response.on('data', chunk => {
        responseData += chunk;
    });

    response.on("end", () => {
        let result;
        try {
            result = JSON.parse(responseData)
        } catch (e) {
            result = {};
        }

        resolve(result);
    });

    response.on("error", err => {
        reject(err);
    });
}

function getOptionsFor(path, method) {
    return {
        host: baseUrl,
        port: port,
        path: path,
        method: method,
    };
}

module.exports = {
    postEchoJson,
    createJsonResponse,
    getOptionsFor
}
