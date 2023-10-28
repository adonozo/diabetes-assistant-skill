import { IntentRequest, Response } from "ask-sdk-model";
import { getLocalizedStrings } from "../utils/intent";
import { getSelf, saveBloodGlucoseLevel } from "../api/patients";
import { createObservationObject } from "../fhir/observation";
import { getBloodGlucoseAlert } from "../utils/helper";
import { HandlerInput } from "ask-sdk-core";

/**
 * @deprecated functionality to be removed
 */
export async function handle(handlerInput: HandlerInput, patientEmail: string): Promise<Response> {
    const localizedMessages = getLocalizedStrings(handlerInput);
    const request = handlerInput.requestEnvelope.request as IntentRequest;
    const currentIntent = request.intent;

    const value = +(currentIntent.slots?.level?.value ?? 0);
    const timing = currentIntent.slots?.glucoseTiming.value;
    if (isNaN(value) || value <= 0 || value > 20 || !timing) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.INVALID_BLOOD_GLUCOSE)
            .reprompt(localizedMessages.responses.INVALID_BLOOD_GLUCOSE_REPROMPT)
            .getResponse();
    }

    const self = await getSelf(patientEmail);
    const observation = createObservationObject(self, value, timing, localizedMessages);
    await saveBloodGlucoseLevel(patientEmail, observation);
    const response = localizedMessages.responses.BLOOD_GLUCOSE_SUCCESS;
    const alert = getBloodGlucoseAlert(value, timing, localizedMessages);

    return handlerInput.responseBuilder
        .speak(`${response} ${alert}`)
        .getResponse();
}
