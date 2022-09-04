const fhirTiming = require("./timing");
const helper = require("../helper");

const DOSAGE_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/DosageStartDate';

function getDosageStartDate(dosage) {
    const startDateExtension = helper.getExtension(dosage, DOSAGE_START_DATE);
    const date = fhirTiming.tryParseDate(startDateExtension.valueDateTime);
    if (date) {
        return date;
    }

    return undefined;
}

module.exports = {
    getDosageStartDate,
}
