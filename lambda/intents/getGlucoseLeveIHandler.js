const fhirObservation = require("../fhir/observation");
const strings = require("../strings/strings");
const intentUtil = require("../utils/intent");

async function handle(handlerInput, bundle, timezone) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    if (!bundle.entry || bundle.entry.length === 0) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.NO_GLUCOSE_RECORDS_FOUND)
            .getResponse();
    }

    const observations = fhirObservation.getObservationsFromBundle(bundle);
    const message = strings.makeTextFromObservations(observations, timezone, localizedMessages);
    return handlerInput.responseBuilder
        .speak(message)
        .getResponse();
}

module.exports = {
    handle
}
