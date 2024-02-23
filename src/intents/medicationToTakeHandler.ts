import { Response } from "ask-sdk-model";
import { getLocalizedStrings, localeFromInput, throwWithMessage } from "../utils/intent";
import { getTimezoneOrDefault, requestsNeedStartDate } from "../utils/time";
import { PatientClient } from "../api/patients";
import { timingEvent } from "../fhir/timing";
import { medicationsFromBundle } from "../fhir/carePlan";
import { getTextForMedicationRequests } from "../fhir/medicationRequest";
import { HandlerInput } from "ask-sdk-core";
import { AbstractIntentHandler } from "./abstractIntentHandler";
import { getAuthorizedUser } from "../auth";
import { DateTime } from "luxon";
import { Result } from "../types";
import { Bundle, FhirResource, MedicationRequest } from "fhir/r5";

export class MedicationToTakeHandler extends AbstractIntentHandler {
    intentName = 'MedicationToTakeIntent';

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
        const userTimezone = await getTimezoneOrDefault(handlerInput);
        const date = DateTime.now().setZone(userTimezone).toISODate()!;

        const result = await this.getTodayMedicationRequests(date, patientEmail, handlerInput);
        if (!result.success) {
            const customResource = requestsNeedStartDate([result.error!])
                ?? throwWithMessage("Couldn't get the resource");
            return this.switchContextToStartDateTime(handlerInput,
                customResource,
                userTimezone,
                localizedMessages);
        }

        const medicationRequests = medicationsFromBundle(result.value!);
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

    private async getTodayMedicationRequests(
        date: string,
        patientEmail: string,
        handlerInput: HandlerInput
    ): Promise<Result<Bundle, MedicationRequest>> {
        const timezone = await getTimezoneOrDefault(handlerInput);
        const patientClient = new PatientClient(localeFromInput(handlerInput));
        try {
            const medicationRequest = await patientClient
                .getMedicationRequests(patientEmail, date, timingEvent.ALL_DAY, timezone);
            return {success: true, value: medicationRequest};
        } catch (errorResponse: any) {
            if (errorResponse?.status !== 422) {
                console.log("Unexpected error", JSON.stringify(errorResponse))
                throw new Error("Unexpected error");
            }

            const missingDataResource = <FhirResource>errorResponse.resource;
            if (missingDataResource.resourceType === 'MedicationRequest') {
                return {success: false, error: missingDataResource};
            }

            throwWithMessage("Couldn't get the resource");
        }
    }
}
