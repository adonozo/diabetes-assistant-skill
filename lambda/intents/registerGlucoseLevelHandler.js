const patientsApi = require("../api/patients");
const fhirObservation = require("../fhir/observation");
const helper = require("../utils/helper");
const intentUtil = require("../utils/intent");

async function handle(handlerInput, patientEmail) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    const value = +currentIntent.slots.level.value;
    const timing = currentIntent.slots.glucoseTiming.value
    if (isNaN(value) || value <= 0 || value > 20) {
        return handlerInput.responseBuilder
            .speak(localizedMessages.responses.INVALID_BLOOD_GLUCOSE)
            .reprompt(localizedMessages.responses.INVALID_BLOOD_GLUCOSE_REPROMPT)
            .getResponse();
    }

    const self = await patientsApi.getSelf(patientEmail);
    const observation = fhirObservation.createObservationObject(self, value, timing, localizedMessages);
    await patientsApi.saveBloodGlucoseLevel(patientEmail, observation);
    const response = localizedMessages.responses.BLOOD_GLUCOSE_SUCCESS;
    const alert = helper.getBloodGlucoseAlert(value, timing, localizedMessages);

    return handlerInput.responseBuilder
        .speak(`${response} ${alert}`)
        .getResponse();
}

module.exports = {
    handle
}
