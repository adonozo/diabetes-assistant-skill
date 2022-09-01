const {DateTime} = require("luxon");
const fhirPatient = require("./patient")

const observationBase = {
    resourceType: "Observation",
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
    subject: {},
    effectiveDateTime: "2020-01-01T10:00:00Z",
    issued: "2020-01-01T10:00:00Z",
    performer: [],
    valueQuantity: {
        value: 1.0,
        unit: "mmol/l",
        system: "http://unitsofmeasure.org",
        code: "mmol/L"
    },
    referenceRange: [
        {
            low: {
                value: 3.1,
                unit: "mmol/l",
                system: "http://unitsofmeasure.org",
                code: "mmol/L"
            },
            high: {
                value: 6.2,
                unit: "mmol/l",
                system: "http://unitsofmeasure.org",
                code: "mmol/L"
            }
        }
    ],
    extension: [
        {
            url: "http://www.diabetesreminder.com/observationTiming",
            valueCode: "ACM"
        }
    ]
}

function createObservationObject(patient, level, timing, localizedMessages) {
    const subject = fhirPatient.getPatientSubject(patient);
    const date = DateTime.utc().toISO();
    const observation = JSON.parse(JSON.stringify(observationBase));
    const observationTiming = localizedMessages.stringToTimingCode(timing)
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
