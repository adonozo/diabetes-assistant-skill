import { getLocalizedStrings } from "../utils/intent";
import { getObservationsFromBundle } from "../fhir/observation";
import { makeTextFromObservations } from "../strings/strings";
import { HandlerInput } from "ask-sdk-core";
import { Bundle } from "fhir/r5";
import { Response } from "ask-sdk-model";

export async function handle(handlerInput: HandlerInput, bundle: Bundle, timezone: string): Promise<Response> {
    const localizedMessages = getLocalizedStrings(handlerInput);
    if (!bundle.entry || bundle.entry.length === 0) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.NO_GLUCOSE_RECORDS_FOUND)
            .getResponse();
    }

    const observations = getObservationsFromBundle(bundle);
    const message = makeTextFromObservations(observations, timezone, localizedMessages);
    return handlerInput.responseBuilder
        .speak(message)
        .getResponse();
}
