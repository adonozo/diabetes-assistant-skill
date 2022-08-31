const {timingEvent} = require("./fhir/timing");
const fhirTiming = require("./fhir/timing");
const {DateTime} = require("luxon");

const responses = {
    WELCOME: "Welcome, I can set up reminders or tell you your medications for tomorrow. Which would you like to try?",
    REMINDER_PERMISSIONS: "I need permission to access your reminders.",
    SUCCESSFUL_REMINDER_PERMISSION: `Now that you've provided permission, you can try again by saying "setup reminders"`,
    SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: 'You can try again by saying "setup reminders"',
    REPROMPT_REMINDER_PERMISSIONS: "Say ok if you want to grant me permission.",
    HELP: "You can ask me your medications for today or ask me to create medication reminders.",
    ERROR: "Sorry, I had trouble doing what you asked. Please try again.",
    STOP: "Goodbye!",
    ACCOUNT_LINK: "Your account is not linked. Add your account first in the Alexa app.",
    UPDATED_TIMING: "You have updated your timing for",
    SUCCESSFUL_REMINDERS: "Your reminders have been created, check the Alexa app to verify them.",
    MEDICATIONS_REMINDERS_SETUP: 'Say "remind me my medications" if you want to continue setting up your reminders.',
    REQUESTS_REMINDERS_SETUP: 'Say "setup reminders" if you want to continue setting up your reminders.',
    SETUP_TIMINGS: "You need to set some timings first.",
    INVALID_BLOOD_GLUCOSE: "Sorry, I had trouble doing what you asked. Try again by saying: save my blood glucose level.",
    INVALID_BLOOD_GLUCOSE_REPROMPT: "Try again by saying: save my blood glucose level.",
    BLOOD_GLUCOSE_SUCCESS: "Your blood glucose level was registered.",
    NO_GLUCOSE_RECORDS_FOUND: "I didn't find records for that date",
    NO_RECORDS_FOUND: "I didn't find records",
    QUERY_SETUP: 'Now, try asking me about your care plan for a date again.',
    LOW_GLUCOSE: 'Your blood glucose level is lower than the recommended value. Please consider consulting to your GP or to a health provider.',
    HIGH_GLUCOSE: 'Your blood glucose level is higher than the recommended value. Please consider consulting to your GP or to a health provider.',
    PERMISSIONS_REQUIRED: "Without permissions, I can't set a reminder.",
}

function getMedicationReminderText(value, unit, medication, time) {
    const regex = new RegExp('^[0-2][0-9]');
    const timing = regex.test(time) ? `at ${time}` : timingToText(time);
    return `Take ${value} ${unit} of ${medication} ${timing}`;
}

function getConfirmationDateText(healthRequest) {
    return `You have set the start date for ${healthRequest}.`;
}

function getSuggestedTimeText(meal) {
    return `Is this measure before ${meal}, after ${meal}, or none?`
}

function getMedicationSsmlReminderText(value, unit, medication, time) {
    const message = `Take ${value} ${unit} of ${medication} ${timingString(time)}`;
    return wrapSpeakMessage(message);
}

function getServiceReminderText(action, time) {
    const regex = new RegExp('^[0-2][0-9]');
    const timing = regex.test(time) ? `at ${time}` : timingToText(time);
    return `${action} ${timing}`;
}

/**
 * Convert a timing to a spoken string
 * @param timing: Can be a time (00:00 - 23:59) or an event date
 * @returns {string}: The text Alexa will tell
 */
function timingString(timing) {
    const regex = new RegExp('^[0-2][0-9]');
    return regex.test(timing) ? `at <say-as interpret-as="time">${timing}</say-as>` : timingToText(timing);
}

function wrapSpeakMessage(message) {
    return `<speak>${message}</speak>`
}

function getStartDatePrompt(missingDate) {
    const init = 'I need some information first.';
    if (missingDate.type === 'MedicationRequest') {
        return `${init} You need to take ${missingDate.name} for ${missingDate.duration} days.`;
    }

    if (missingDate.type === 'ServiceRequest') {
        return `${init} Your plan includes: ${missingDate.name} for ${missingDate.duration} days.`;
    }

    return '';
}

function getMedicationTextData(request, patient, timezone, textProcessor) {
    const medicationData = [];
    const medication = request.medicationReference.display;
    request.dosageInstruction.forEach(dosage => {
        const {start, end} = fhirTiming.getDatesFromTiming(dosage.timing, patient, dosage.id);
        const {value, unit} = getMedicationValues(dosage);
        if (dosage.timing.repeat.when && Array.isArray(dosage.timing.repeat.when) && dosage.timing.repeat.when.length > 0) {
            dosage.timing.repeat.when.forEach(timing => {
                const patientDate = patient.exactEventTimes[timing];
                const dateTime = DateTime.fromISO(patientDate).setZone(timezone); // Date already in UTC
                const processedText = textProcessor({
                    value: value,
                    unit: unit,
                    medication: medication,
                    timing: timing,
                    dateTime: dateTime,
                    start: start,
                    end: end,
                    frequency: dosage.timing.repeat.frequency,
                    dayOfWeek: dosage.timing.repeat.dayOfWeek
                })
                medicationData.push(processedText)
            });
        } else if (dosage.timing.repeat.timeOfDay && Array.isArray(dosage.timing.repeat.timeOfDay) && dosage.timing.repeat.timeOfDay.length > 0) {
            dosage.timing.repeat.timeOfDay.forEach(time => {  // Timing is in local time
                const date = DateTime.utc();
                const dateTime = DateTime.fromISO(`${date.toISODate()}T${time}Z`);
                const processedText = textProcessor({
                    value: value,
                    unit: unit,
                    medication: medication,
                    timing: time,
                    dateTime: dateTime,
                    start: start,
                    end: end,
                    frequency: dosage.timing.repeat.frequency,
                    dayOfWeek: dosage.timing.repeat.dayOfWeek
                })
                medicationData.push(processedText)
            });
        } else if (dosage.timing.repeat.frequency && dosage.timing.repeat.frequency > 1) {
            const patientDate = patient.resourceStartDate[dosage.id]; // This is in UTC
            const dateTime = DateTime.fromISO(patientDate).setZone(timezone);
            const processedText = textProcessor({
                value: value,
                unit: unit,
                medication: medication,
                timing: dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }),
                dateTime: dateTime,
                start: start,
                end: end,
                frequency: dosage.timing.repeat.frequency,
                dayOfWeek: dosage.timing.repeat.dayOfWeek
            })
            medicationData.push(processedText)
        }
    });

    return medicationData;
}

function getServiceTextData(request, patient, timezone, textProcessor) {
    const serviceData = [];
    const action = request.code.coding[0].display;

    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const {start, end} = fhirTiming.getDatesFromTiming(request.occurrenceTiming, patient, request.id);
    const repeat = request.occurrenceTiming.repeat;
    if (repeat.when && Array.isArray(repeat.when) && repeat.when.length > 0) {
        repeat.when.forEach(timing => {
            const patientDate = patient.exactEventTimes[timing];
            const dateTime = DateTime.fromISO(patientDate).setZone(timezone);
            const processedText = textProcessor({
                action: action,
                timing: timing,
                dateTime: dateTime,
                start: start,
                end: end,
                frequency: repeat.frequency,
                dayOfWeek: repeat.dayOfWeek
            })
            serviceData.push(processedText)
        });
    } else if (repeat.timeOfDay && Array.isArray(repeat.timeOfDay) && repeat.timeOfDay.length > 0) {
        repeat.timeOfDay.forEach(timing => {  // Timing is in local time (hh:mm)
            const date = DateTime.utc();
            const dateTime = DateTime.fromISO(`${date.toISODate()}T${timing}Z`);
            const processedText = textProcessor({
                action: action,
                timing: timing,
                dateTime: dateTime, // RRULE uses local time, should not convert to UTC
                start: start,
                end: end,
                frequency: repeat.frequency,
                dayOfWeek: repeat.dayOfWeek
            })
            serviceData.push(processedText)
        });
    } else if (repeat.frequency && repeat.frequency > 1) {
        const patientDate = patient.resourceStartDate[dosage.id]; // This is in UTC
        const dateTime = DateTime.fromISO(patientDate).setZone(timezone);
        const processedText = textProcessor({
            action: action,
            timing: dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }),
            dateTime: dateTime,
            start: start,
            end: end,
            frequency: repeat.frequency,
            dayOfWeek: repeat.dayOfWeek
        })
        serviceData.push(processedText)
    }

    return serviceData;
}

function makeTextFromObservations(observations, timezone) {
    const dateMap = new Map();
    observations.forEach(observation => {
        const date = DateTime.fromISO(observation.issued).setZone(timezone);
        const dayKey = getTextForDay(observation.issued, timezone, 'On');
        const time = getHoursAndMinutes(date);
        const observationValue = {time: time, value: observation.valueQuantity.value, timing: observation.extension[0]?.valueCode};
        if (dateMap.has(dayKey)) {
            dateMap.get(dayKey).push(observationValue);
        } else {
            dateMap.set(dayKey, [observationValue]);
        }
    });

    let text = '';
    dateMap.forEach((value, day) => {
        const textForDay = makeTextForObservationDay(day, value)
        text = text + textForDay + '. ';
    })

    return wrapSpeakMessage(text);
}

/**
 *
 * @param day {string}
 * @param observationsValues {{time: string, value: string, timing: string}[]}
 */
function makeTextForObservationDay(day, observationsValues) {
    let text = `${day}, you had a blood glucose level of`;
    if (observationsValues.length === 1) {
        const observation = observationsValues[0];
        const time = getTimingOrTime(observation);
        text = `${text} ${observation.value} ${time}`;
        return text;
    }

    const values = observationsValues.map((value, index) => {
        const time = getTimingOrTime(value);
        if (index === observationsValues.length - 1) {
            return ` and ${value.value} ${time}.`;
        }

        return ` ${value.value} ${time}`;
    }).join(',');

    return `${text} ${values}`;
}

function getTimingOrTime(observationValue) {
    if (!observationValue.timing || observationValue.timing === timingEvent.EXACT)
    {
        return `at ${observationValue.time}`;
    }

    return fhirTiming.timingCodeToString(observationValue.timing);
}

/**
 * Gets the hours and minutes to say
 * @param date {DateTime}
 * @return string
 */
function getHoursAndMinutes(date) {
    const minutes = date.minute === 0 ? "o'clock" : date.minute;
    return `${date.hour} ${minutes}`;
}

function getHoursAndMinutesFromString(time) {
    const minutes = time.substring(3) === "00" ? "o'clock" : time.substring(3)
    return `${+time.substring(0,2)} ${minutes}`;
}

/**
 * Returns "today", "yesterday", "tomorrow", or a date
 * @param date {string}
 * @param timezone {string}
 * @param datePreposition {string}
 */
function getTextForDay(date, timezone, datePreposition) {
    const today = DateTime.utc().setZone(timezone);
    const yesterday = today.minus({days: 1});
    const tomorrow = today.plus({days: 1});
    const referenceDate = DateTime.fromISO(date).setZone(timezone);
    if (today.toISODate() === referenceDate.toISODate()) {
        return 'today';
    } else if (yesterday.toISODate() === referenceDate.toISODate()) {
        return 'yesterday';
    } else if (tomorrow.toISODate() === referenceDate.toISODate()) {
        return 'tomorrow';
    }

    const month = referenceDate.month < 10 ? `0${referenceDate.month}` : referenceDate.month;
    const day = referenceDate.day < 10 ? `0${referenceDate.day}` : referenceDate.day;
    return `${datePreposition} <say-as interpret-as="date">????${month}${day}</say-as>`;
}

function getMedicationValues(dosage) {
    const doseValue = dosage.doseAndRate[0].doseQuantity.value;
    const doseUnit = dosage.doseAndRate[0].doseQuantity.unit;
    return {
        value: doseValue,
        unit: doseUnit
    }
}

/**
 * @param medicationData {{medication: string, dose: [{value: string, unit: string, time: [string]}]}}
 */
function makeMedicationText(medicationData) {
    const regex = new RegExp('^[0-2][0-9]');
    const doseTextArray = medicationData.dose.map(dose => {
        const doseHasTime = dose.time.length > 0 && regex.test(dose.time[0]);
        const timingTextFunction = doseHasTime ? getHoursAndMinutesFromString: timingToText;
        const preposition = doseHasTime ? 'at ' : '';
        const timings = dose.time.map(time => timingTextFunction(time));
        return timings.map(time => `${dose.value} ${unitsToStrings(dose.unit, +dose.value > 1)} ${preposition} ${time}`);
    }).flat(1);
    const doseText = listItems(doseTextArray);
    return `Take ${medicationData.medication}, ${doseText}`;
}

/**
 * @param serviceData {{action: string, timings: [string]}}
 */
function makeServiceText(serviceData) {
    const regex = new RegExp('^[0-2][0-9]');
    const serviceHasTime = serviceData.timings.length > 0 && regex.test(serviceData.timings[0]);
    const timingTextFunction = serviceHasTime ? getHoursAndMinutesFromString: timingToText;
    const preposition = serviceHasTime ? 'at ' : '';
    const timings = serviceData.timings.map(time => timingTextFunction(time));
    return `Do a ${serviceData.action} ${preposition} ${listItems(timings)}`;
}

function timingToText(timing) {
    switch (timing) {
        case 'ACD':
            return 'before lunch';
        case 'CD':
            return 'at lunch';
        case 'PCD':
            return 'after lunch';
        case 'ACM':
            return 'before breakfast';
        case 'CM':
            return 'at breakfast';
        case 'PCM':
            return 'before breakfast';
        case 'ACV':
            return 'before dinner';
        case 'CV':
            return 'at dinner';
        case 'PCV':
            return 'after dinner';
        case 'AC':
            return 'before meals';
        case 'C':
            return 'with meals';
        case 'PC':
            return 'after meals';
        default:
            return '';
    }
}

function listItems(values) {
    if (values.length === 1) {
        return values[0];
    }

    const joinComma = values.length > 2 ? ',' : ''
    return values.map((value, index) =>
        index === values.length - 1 ? ` and ${value}.` : ` ${value}`)
        .join(joinComma)
}

function unitsToStrings(unit, isPlural) {
    switch (unit.toLowerCase()) {
        case 'u':
            return 'unit' + (isPlural ? 's' : '');
        case 'tab':
            return 'tablet' + (isPlural ? 's' : '');
        default:
            return unit;
    }
}

module.exports = {
    responses,
}
