const timeUtil = require("../utils/time");
const patientsApi = require("../api/patients");
const fhirTiming = require("../fhir/timing");
const fhirCarePlan = require("../fhir/carePlan");
const fhirMedicationRequest = require("../fhir/medicationRequest");
const intentUtil = require("../utils/intent");
const {logMessage} = require("../utils/helper");

async function handle(handlerInput, patient) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const date = handlerInput.requestEnvelope.request.intent.slots.treatmentDate.value;
    const userTimezone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const medicationRequest = await patientsApi.getMedicationRequests(patient.id, date,
        fhirTiming.timingEvent.ALL_DAY, userTimezone);
    const medicationRequests = fhirCarePlan.medicationsFromBundle(medicationRequest);

    const requestsWithMissingStartDate = timeUtil.requestsNeedStartDate(medicationRequests);
    if (requestsWithMissingStartDate) {
        logMessage("Medication request needs start date", requestsWithMissingStartDate)
        return intentUtil.switchContextToStartDate(handlerInput, requestsWithMissingStartDate, userTimezone, localizedMessages);
    }

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
