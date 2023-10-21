import { HandlerInput } from "ask-sdk-core";
import { createJsonResponse } from "./api/api";
import * as https from "https";
import { RequestOptions } from "https";

const clientId = '__ENV_CLIENT_ID';
const clientSecret = '__ENV_CLIENT_SECRET';
const authHost = '__ENV_AUTH_HOST';
const authServerId = '__ENV_AUTH_SERVER_ID';

export async function getAuthorizedUser (handlerInput: HandlerInput): Promise<any | undefined> {
    let token = handlerInput.requestEnvelope.context.System.user.accessToken;
    if (!token) {
        return undefined;
    }

    const userInfo = await validateToken(token);
    userInfo.requestOptions = getOptions(token);
    return userInfo;
}

function validateToken(token: string): Promise<any> {
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
        const request = https.request(options, response => createJsonResponse(resolve, reject, response));
        request.end();
    });
}

function getOptions(token: string): RequestOptions {
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
