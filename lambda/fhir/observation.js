const {DateTime} = require("luxon");
const fhirTiming = require("./timing")

const observationBase = {
    status: "final",
    code: {
        coding: [
            {
                system: "http://loinc.org",
                code: "15074-8",
                display: "Glucose [Moles/volume] in Blood"
            }
        ]
    },
    subject: {
        id: "610060fc3101595f17be6529",
        reference: "Patient/pat1",
        display: "Donald Duck"
    },
    effectiveDateTime: "2020-01-01T10:00:00Z",
    issued: "2020-01-01T10:00:00Z",
    performer: [
        {
            id: "610060fc3101595f17be6529",
            reference: "Patient/pat1",
            display: "Donald Duck"
        }
    ],
    valueQuantity: {
        value: 1.0,
        unit: "mmol/l",
        system: "http://unitsofmeasure.org",
        code: "mmol/L"
    },
    extension: [
        {
            url: "http://www.diabetesreminder.com/observationTiming",
            valueCode: "ACM"
        }
    ]
}

function createObservationObject(patient, level, timing) {
    const subject = {
        id: patient.id,
        display: `${patient.firstName} ${patient.lastName}`
    };
    const date = DateTime.utc().toISO();
    const observation = JSON.parse(JSON.stringify(observationBase));
    const observationTiming = fhirTiming.stringToTimingCode(timing)
    observation.valueQuantity.value = level;
    observation.subject = subject;
    observation.performer[0] = subject;
    observation.effectiveDateTime = date;
    observation.issued = date;
    observation.extension[0].valueCode = observationTiming;
    return observation;
}

function getObservationsFromBundle(bundle) {
    if (!bundle.entry || bundle.entry.length === 0) {
        return [];
    }

    return bundle.entry.map(item => item.resource);
}

module.exports = {
    createObservationObject,
    getObservationsFromBundle
}