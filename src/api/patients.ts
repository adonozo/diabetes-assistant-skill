import * as https from "https";
import { createJsonResponse, getOptions } from "./api";
import { Bundle } from "fhir/r5";

export class PatientClient {
    private readonly locale: string;

    constructor(locale: string) {
        this.locale = locale;
    }

    /**
     *
     * @param email {string} The patient's email
     * @param dosageId {string} The dosage ID to set the start date for
     * @param startDateTime {{startDate: string, startTime: string}} The medication start date
     * @return {Promise<any>} An empty response if successful
     */
    setDosageStartDate(
        email: string,
        dosageId: string,
        startDateTime: DosageStartDateTime
    ): Promise<void> {
        const path = `/patients/${email}/dosage/${dosageId}/start-date`;
        return this.setResourceStartDate(email, dosageId, startDateTime, path);
    }

    setServiceRequestStartDate(
        email: string,
        serviceRequestId: string,
        startDate: DosageStartDateTime
    ): Promise<void> {
        const path = `/patients/${email}/service-request/${serviceRequestId}/start-date`;
        return this.setResourceStartDate(email, serviceRequestId, startDate, path);
    }

    setResourceStartDate(
        email: string,
        serviceRequestId: string,
        startDateTime: DosageStartDateTime,
        path: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(startDateTime);
            const options = getOptions(path, 'PUT', this.locale);
            options.headers = {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
            const request = https.request(options, response => createJsonResponse(resolve, reject, response));
            request.write(data);
            request.end();
        });
    }

    getMedicationRequests(
        email: string,
        date: string,
        timing: string,
        timezone: string
    ): Promise<Bundle> {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams();
            params.append('date', date)
            params.append('timing', timing)
            params.append('timezone', timezone)
            const path = `/alexa/${email}/medication-requests?${params.toString()}`;
            const options = getOptions(path, 'GET', this.locale);
            const request = https.request(options, response => createJsonResponse(resolve, reject, response));
            request.end();
        })
    }

    getServiceRequests(email: string, startDate: string, endDate: string): Promise<Bundle> {
        return new Promise((resolve, reject) => {
            const params = new URLSearchParams();
            params.append('startDate', startDate)
            params.append('endDate', endDate)
            const path = `/alexa/${email}/service-requests?${params.toString()}`;
            const options = getOptions(path, 'GET', this.locale);
            const request = https.request(options, response => createJsonResponse(resolve, reject, response));
            request.end();
        })
    }
}

export type DosageStartDateTime = { startDate: string, startTime?: string }
