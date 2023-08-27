const baseUrl = '__ENV_BACKEND_URL';
const port = '__ENV_BACKEND_PORT';

function createJsonResponse(resolve, reject, response) {
    response.setEncoding('utf8');
    let responseData = '';
    const failed = response.statusCode < 200 || response.statusCode > 299;

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

        if (failed) {
            reject(result);
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
    createJsonResponse,
    getOptionsFor
}
