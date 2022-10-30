const fhirTiming = require("./timing");
const fhir = require("./fhir");

const DOSAGE_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/DosageStartDate';

function getDosageStartDate(dosage) {
    const startDateExtension = fhir.getExtension(dosage, DOSAGE_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = fhirTiming.tryParseDate(startDateExtension.valueDateTime);
    if (date) {
        return date;
    }

    return undefined;
}

module.exports = {
    getDosageStartDate,
}
