import { IntentRequest, Response } from "ask-sdk-model";
import { getLocalizedStrings, throwWithMessage } from "../utils/intent";
import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { getMedicationRequests } from "../api/patients";
import { timingEvent } from "../fhir/timing";
import { medicationsFromBundle } from "../fhir/carePlan";
import { getTextForMedicationRequests } from "../fhir/medicationRequest";
import { HandlerInput } from "ask-sdk-core";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";

export class MedicationToTakeHandler extends AbstractIntentHandler {
    intentName = 'GetMedicationToTakeIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        const userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        return this.handleIntent(handlerInput, userInfo.username);
    }

    private async handleIntent(handlerInput: HandlerInput, patientEmail: string): Promise<Response> {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const date = request.intent.slots?.treatmentDate.value ?? throwWithMessage('Date was not set on intent');
        const userTimezone = await getTimezoneOrDefault(handlerInput);

        let medicationRequest;
        try {
            medicationRequest = await getMedicationRequests(patientEmail, date, timingEvent.ALL_DAY, userTimezone);
        } catch (errorResponse: any) {
            if (errorResponse?.status !== 422) {
                console.log("Unexpected error", JSON.stringify(errorResponse))
                throw new Error("Unexpected error");
            }

            const missingDataResource = errorResponse.resource;
            const customResource = requestsNeedStartDate([missingDataResource])
                ?? throwWithMessage("Couldn't get the resource");

            return this.switchContextToStartDate(handlerInput, customResource, localizedMessages);
        }

        const medicationRequests = medicationsFromBundle(medicationRequest);

        let speakOutput
        if (medicationRequests.length === 0) {
            speakOutput = localizedMessages.getNoRecordsTextForDay(date, userTimezone);
        } else {
            const medicationText = getTextForMedicationRequests(medicationRequests, userTimezone, localizedMessages);
            speakOutput = `${localizedMessages.getTextForDay(date, userTimezone)}, ${medicationText}`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}
