import { IntentRequest, Response } from "ask-sdk-model";
import { getLocalizedStrings, switchContextToStartDate, throwWithMessage } from "../utils/intent";
import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { getMedicationRequests, getSelf } from "../api/patients";
import { timingEvent } from "../fhir/timing";
import { medicationsFromBundle } from "../fhir/carePlan";
import { getTextForMedicationRequests } from "../fhir/medicationRequest";
import { HandlerInput } from "ask-sdk-core";
import { Patient } from "fhir/r5";
import { BaseIntentHandler } from "./baseIntentHandler";
import { getAuthorizedUser } from "../auth";

export class MedicationToTakeHandler extends BaseIntentHandler {
    intentName = 'GetMedicationToTakeIntent';

    canHandle(handlerInput : HandlerInput) : boolean {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest'
            && request.intent.name === this.intentName
    }

    async handle(handlerInput: HandlerInput): Promise<Response> {
        let userInfo = await getAuthorizedUser(handlerInput);
        if (!userInfo) {
            return this.requestAccountLink(handlerInput);
        }

        const self = await getSelf(userInfo.username);
        return this.handleIntent(handlerInput, self);
    }

    private async handleIntent(handlerInput: HandlerInput, patient: Patient): Promise<Response> {
        const localizedMessages = getLocalizedStrings(handlerInput);
        const request = handlerInput.requestEnvelope.request as IntentRequest;
        const date = request.intent.slots?.treatmentDate.value ?? throwWithMessage('Date was not set on intent');
        const userTimezone = await getTimezoneOrDefault(handlerInput);

        let medicationRequest;
        try {
            medicationRequest = await getMedicationRequests(patient.id!, date, timingEvent.ALL_DAY, userTimezone);
        } catch (errorResponse: any) {
            if (errorResponse.status !== 422) {
                console.log("Unexpected error", JSON.stringify(errorResponse))
                throw new Error("Unexpected error");
            }

            const missingDataResource = errorResponse.resource;
            const customResource = requestsNeedStartDate([missingDataResource]);
            if (customResource) {
                return switchContextToStartDate(handlerInput, customResource, userTimezone, localizedMessages);
            }

            throw new Error("Couldn't get the resource");
        }

        const medicationRequests = medicationsFromBundle(medicationRequest);

        let speakOutput
        if (medicationRequests.length === 0) {
            speakOutput = localizedMessages.getNoRecordsTextForDay(date, userTimezone);
        } else {
            const medicationText = getTextForMedicationRequests(medicationRequests, userTimezone, localizedMessages);
            const datePreposition = localizedMessages.responses.DATE_PREPOSITION;
            speakOutput = `${localizedMessages.getTextForDay(date, userTimezone, datePreposition)}, ${medicationText}`;
        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
}
