import { createJsonResponse, getOptionsFor } from "./api";
import https from "https";
import { AlexaRequest } from "../types";

export function getLastRequest(email: string, deviceId: string): Promise<AlexaRequest> {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams();
        params.append('deviceId', deviceId);
        const path = `/alexa/${email}/requests?${params.toString()}`;
        const options = getOptionsFor(path, 'GET');
        const request = https.request(options, response => createJsonResponse(resolve, reject, response));
        request.end();
    });
}
