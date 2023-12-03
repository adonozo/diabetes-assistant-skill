import { createJsonResponse, getOptionsFor } from "./api";
import * as https from "https";
import { Bundle } from "fhir/r5";

export function getActiveCarePlan(email: string): Promise<Bundle> {
    return new Promise((resolve, reject) => {
        const path = `/alexa/${email}/care-plans/active`;
        const options = getOptionsFor(path, 'GET');
        const request = https.request(options, response => createJsonResponse(resolve, reject, response));
        request.end();
    });
}
