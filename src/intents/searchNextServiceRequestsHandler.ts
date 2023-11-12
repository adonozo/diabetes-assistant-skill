import { AbstractIntentHandler } from "./abstractIntentHandler";
import { HandlerInput } from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { getAuthorizedUser } from "../auth";
import { getServiceRequests } from "../api/patients";
import { getLocalizedStrings } from "../utils/intent";
import { serviceRequestsFromBundle } from "../fhir/carePlan";
import { getTextForServiceRequests } from "../fhir/serviceRequest";
import { getTimezoneOrDefault } from "../utils/time";
import { DateTimeInterval } from "../types";
import { DateTime } from "luxon";

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
        const interval = this.getRequestInterval(userTimezone);
        const serviceRequestsBundle = await getServiceRequests(userInfo.username,
            interval.start.toISODate()!,
            interval.end.toISODate()!);

        const serviceRequests = serviceRequestsFromBundle(serviceRequestsBundle);
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

    private getRequestInterval(timezone: string): DateTimeInterval {
        const start = DateTime.now().setZone(timezone);
        return {
            start: start,
            end: start.plus({days: 7})
        }
    }
}
