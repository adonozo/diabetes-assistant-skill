import { createJsonResponse, getOptions } from "./api";
import https from "https";
import { AlexaRequest } from "../types";

export class AlexaClient {
    private readonly locale: string;

    constructor(locale: string) {
        this.locale = locale;
    }

    getLastRequest(email: string, deviceId: string): Promise<AlexaRequest> {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams();
            params.append('deviceId', deviceId);
            const path = `/alexa/${email}/requests?${params.toString()}`;
            const options = getOptions(path, 'GET', this.locale);
            const request = https.request(options, response => createJsonResponse(resolve, reject, response));
            request.end();
        });
    }
}
