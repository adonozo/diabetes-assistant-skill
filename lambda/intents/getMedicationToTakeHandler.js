const timeUtil = require("../utils/time");
const patientsApi = require("../api/patients");
const fhirTiming = require("../fhir/timing");
const fhirCarePlan = require("../fhir/carePlan");
const fhirMedicationRequest = require("../fhir/medicationRequest");
const intentUtil = require("../utils/intent");

async function handle(handlerInput, patient) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const date = handlerInput.requestEnvelope.request.intent.slots.treatmentDate.value;
    const userTimezone = await timeUtil.getTimezoneOrDefault(handlerInput);

    let medicationRequest;
    try {
        medicationRequest = await patientsApi.getMedicationRequests(patient.id, date,
            fhirTiming.timingEvent.ALL_DAY, userTimezone);
    } catch (errorResponse) {
        if (errorResponse.status !== 422) {
            console.log("Unexpected error", JSON.stringify(errorResponse))
            throw new Error("Unexpected error");
        }

        const missingDataResource = errorResponse.resource;
        if (fhirMedicationRequest.requestNeedsStartDate(missingDataResource)) {
            const customNeedsStartDate = timeUtil.requestsNeedStartDate([missingDataResource]);
            return intentUtil.switchContextToStartDate(handlerInput, customNeedsStartDate, userTimezone, localizedMessages);
        }

        if (fhirMedicationRequest.requestNeedsStartTime(missingDataResource)) {
            const customNeedsStartDate = timeUtil.requestsNeedStartDate([missingDataResource]);
            return intentUtil.switchContextToTiming(handlerInput, customNeedsStartDate, userTimezone)
        }

        throw new Error("Couldn't get the resource");
    }

    const medicationRequests = fhirCarePlan.medicationsFromBundle(medicationRequest);

    let speakOutput
    if (medicationRequests.length === 0) {
        speakOutput = localizedMessages.getNoRecordsTextForDay(date, userTimezone);
    } else {
        const medicationText = fhirMedicationRequest.getTextForMedicationRequests(medicationRequests, patient, userTimezone, localizedMessages);
        const datePreposition = localizedMessages.responses.DATE_PREPOSITION;
        speakOutput = `${localizedMessages.getTextForDay(date, userTimezone, datePreposition)}, ${medicationText}`;
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
}

module.exports = {
    handle
}
