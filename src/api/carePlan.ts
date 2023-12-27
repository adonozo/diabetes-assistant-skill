import { createJsonResponse, getOptions } from "./api";
import * as https from "https";
import { Bundle } from "fhir/r5";

export class CarePLanClient {
    private readonly locale: string;

    constructor(locale: string) {
        this.locale = locale;
    }

    getActiveCarePlan(email: string): Promise<Bundle> {
        return new Promise((resolve, reject) => {
            const path = `/alexa/${email}/care-plans/active`;
            const options = getOptions(path, 'GET', this.locale);
            const request = https.request(options, response => createJsonResponse(resolve, reject, response));
            request.end();
        });
    }
}
