const timeUtil = require("../utils/time");
const patientsApi = require("../api/patients");
const fhirTiming = require("../fhir/timing");
const fhirCarePlan = require("../fhir/carePlan");
const fhirMedicationRequest = require("../fhir/medicationRequest");
const intentUtil = require("../utils/intent");

async function getMedicationsToTake(handlerInput, patient) {
    const localizedMessages = intentUtil.getLocalizedStrings(handlerInput);
    const date = handlerInput.requestEnvelope.request.intent.slots.treatmentDate.value;
    const userTimezone = await timeUtil.getTimezoneOrDefault(handlerInput);
    const medicationRequest = await patientsApi.getMedicationRequests(patient.id, date,
        fhirTiming.timingEvent.ALL_DAY, userTimezone);
    const medications = fhirCarePlan.medicationsFromBundle(medicationRequest);

    // Check missing dates in requests
    const missingDate = timeUtil.getActiveMissingStartDate(patient, medications);
    if (missingDate) {
        return intentUtil.switchContextToStartDate(handlerInput, missingDate, userTimezone, localizedMessages);
    }

    let speakOutput
    if (medications.length === 0) {
        speakOutput = localizedMessages.getNoRecordsTextForDay(date, userTimezone);
    } else {
        const medicationText = fhirMedicationRequest.getTextForMedicationRequests(medications, patient, userTimezone, localizedMessages);
        const datePreposition = localizedMessages.responses.DATE_PREPOSITION;
        speakOutput = `${localizedMessages.getTextForDay(date, userTimezone, datePreposition)}, ${medicationText}`;
    }

    return handlerInput.responseBuilder
        .speak(speakOutput)
        .getResponse();
}

module.exports = {
    getMedicationsToTake
}
