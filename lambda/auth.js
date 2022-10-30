const https = require('https');
const api = require('./api/api')

const clientId = '__ENV_CLIENT_ID';
const clientSecret = '__ENV_CLIENT_SECRET';
const authHost = '__ENV_AUTH_HOST';
const authServerId = '__ENV_AUTH_SERVER_ID';

async function getValidatedUser (handlerInput) {
    let token = handlerInput.requestEnvelope.context.System.user.accessToken;
    if (!token) {
        return false;
    }

    const userInfo = await validateToken(token);
    userInfo.requestOptions = getOptions(token);
    return userInfo;
}

function validateToken(token) {
    const auth = "Basic " + new Buffer(clientId + ":" + clientSecret).toString("base64");
    const tokenParam = `?token=${token}`;
    const tokenHintParam = '&token_type_hint=access_token';
    const tokenQuery = tokenParam + tokenHintParam;
    const options = {
        host: authHost,
        port: 443,
        path: `/oauth2/${authServerId}/v1/introspect${tokenQuery}`,
        method: 'POST',
        headers: {
            'Authorization': auth,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    return new Promise((resolve, reject) => {
        const request = https.request(options, response => api.createJsonResponse(resolve, reject, response));
        request.end();
    });
}

function getOptions(token) {
    const auth = "Basic " + new Buffer(clientId + ":" + clientSecret).toString("base64");
    const tokenParam = `?token=${token}`;
    const tokenHintParam = '&token_type_hint=access_token';
    const tokenQuery = tokenParam + tokenHintParam;
    return {
        host: authHost,
        port: 443,
        path: `/oauth2/${authServerId}/v1/introspect'${tokenQuery}`,
        method: 'POST',
        headers: {
            'Authorization': auth,
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
}

module.exports = {
    getValidatedUser,
}
