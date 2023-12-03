import { AbstractIntentHandler } from "./abstractIntentHandler";
import { HandlerInput } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getAuthorizedUser } from "../auth";
import { getServiceRequests } from "../api/patients";
import { getLocalizedStrings, throwWithMessage } from "../utils/intent";
import { serviceRequestsFromBundle } from "../fhir/carePlan";
import { getTextForServiceRequests } from "../fhir/serviceRequest";
import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { DateTimeInterval, Result } from "../types";
import { DateTime } from "luxon";
import { Bundle, FhirResource, ServiceRequest } from "fhir/r5";

export class SearchNextServiceRequestsHandler extends AbstractIntentHandler {
    intentName = 'SearchNextServiceRequests';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);
        const userTimezone = await getTimezoneOrDefault(handlerInput);

        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const localizedMessages = getLocalizedStrings(handlerInput);
        const searchResult = await this.getNextServiceRequests(userTimezone, userInfo.username);
        if (!searchResult.success) {
            const customResource = requestsNeedStartDate([searchResult.error!])
                ?? throwWithMessage("Couldn't get the resource");
            return this.switchContextToStartDateTime(handlerInput,
                customResource,
                userTimezone,
                localizedMessages);
        }

        const serviceRequests = serviceRequestsFromBundle(searchResult.value!);
        let speakOutput
        if (serviceRequests.length === 0) {
            speakOutput = localizedMessages.responses.NO_RECORDS_FOUND;
        } else {
            const now = DateTime.local({zone: userTimezone});
            speakOutput = getTextForServiceRequests(serviceRequests, now, localizedMessages);
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }

    private async getNextServiceRequests(timezone: string, patientUsername: string): Promise<Result<Bundle, ServiceRequest>> {
        const interval = this.getRequestInterval(timezone);
        try {
            const serviceRequestsBundle = await getServiceRequests(patientUsername,
                interval.start.toISODate()!,
                interval.end.toISODate()!);
            return { success: true, value: serviceRequestsBundle };
        } catch (errorResponse: any) {
            if (errorResponse?.status !== 422) {
                console.log("Unexpected error", JSON.stringify(errorResponse))
                throw new Error("Unexpected error");
            }

            const missingDataResource = <FhirResource>errorResponse.resource;
            if (missingDataResource?.resourceType === 'ServiceRequest') {
                return { success: false, error: missingDataResource };
            }

            throw new Error("Couldn't get the resource");
        }
    }

    private getRequestInterval(timezone: string): DateTimeInterval {
        const start = DateTime.now().setZone(timezone);
        return {
            start: start,
            end: start.plus({days: 7})
        }
    }
}
