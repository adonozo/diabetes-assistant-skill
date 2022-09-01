const {timingEvent} = require("./fhir/timing");
const fhirTiming = require("./fhir/timing");
const {DateTime} = require("luxon");
const {listItems, wrapSpeakMessage} = require("strings")

const responses = {
    WELCOME: "Hola, puedes preguntarme tus medicamentos para mañana o puedo crear recordatorios",
    REMINDER_PERMISSIONS: "Necesito permisos para crear recordatorios",
    SUCCESSFUL_REMINDER_PERMISSION: `Ahora que tengo permisos, puedo crear recordatorios. Intenta diciendo: "crea recordatorios"`,
    SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: 'Puedes intentar de nuevo diciendo: "setup reminders"',
    REPROMPT_REMINDER_PERMISSIONS: `Dí "sí" para otorgarme permisos.`,
    HELP: "Puedes preguntarme qué medicamentos debes tomar, registrar tu nivel de azúcar en sangre, o crear recordatorios.",
    ERROR: "Lo siento, tuve problemas para hacer lo que pediste. Intenta de nuevo",
    STOP: "¡Hasta pronto!",
    ACCOUNT_LINK: "Tu cuenta no está enlazada. Primero añade tu cuenta en la applicación de Alexa en tu celular.",
    UPDATED_TIMING: "Has actualizado el tiempo para ",
    SUCCESSFUL_REMINDERS: "Tus recordatorios han sido creados. Mira la aplicación de Alexa en tu celular para verificar.",
    MEDICATIONS_REMINDERS_SETUP: 'Dí "recuérdame tomar mis medicamentos" si deseas continuar creando tus recordatorios.',
    REQUESTS_REMINDERS_SETUP: 'Dí "crea recordatorios" si deseas continuar creando tus recordatorios.',
    SETUP_TIMINGS: "Primero necesito saber la hora para algunos eventos.",
    INVALID_BLOOD_GLUCOSE: 'Lo siento, tuve problemas para hacer lo que pediste. Intenta de nuevo diciéndo: "Registra mi nivel de azúcar en sangre"',
    INVALID_BLOOD_GLUCOSE_REPROMPT: 'Intenta de nuevo diciéndo: "Registra mi nivel de azúcar en sangre"',
    BLOOD_GLUCOSE_SUCCESS: "Tu nivel de azúcar en sangre se ha registrado.",
    NO_GLUCOSE_RECORDS_FOUND: "No encontré registros para esa fecha.",
    NO_RECORDS_FOUND: "No encontré registros.",
    QUERY_SETUP: "Ahora, intenta preguntarme sobre tus medicamentos para una fecha de nuevo",
    LOW_GLUCOSE: "Tu nivel de azúcar en sangre es más bajo de lo recomendado. Considera consultar con tu médico.",
    HIGH_GLUCOSE: "Tu nivel de azúcar en sangre es más alto de lo recomendado. Considera consultar con tu médico.",
    PERMISSIONS_REQUIRED: "Sin permisos, no puedo crear recordatorios para tus medicamentos.",
    DATE_PREPOSITION: "El",
    CONCAT_WORD: "y",
}

function getMedicationReminderText(value, unit, medication, time) {
    const regex = new RegExp('^[0-2][0-9]');
    const timing = regex.test(time) ? `a las ${time}` : timingToText(time);
    return `Toma ${value} ${unit} de ${medication} ${timing}`;
}

function getConfirmationDateText(healthRequest) {
    return `Has configurado la fecha de inicio para ${healthRequest}.`;
}

function getSuggestedTimeText(meal) {
    return `¿Esta medida es antes de ${meal}, después de ${meal}, o ninguno?`
}

function getMedicationSsmlReminderText(value, unit, medication, time) {
    const message = `Toma ${value} ${unit} de ${medication} ${timingString(time)}`;
    return wrapSpeakMessage(message);
}

function getServiceReminderText(action, time) {
    const regex = new RegExp('^[0-2][0-9]');
    const timing = regex.test(time) ? `a las ${time}` : timingToText(time);
    return `${action} ${timing}`;
}

function getServiceSsmlReminderText(action, time) {
    const message = `${action} ${timingString(time)}`
    return wrapSpeakMessage(message);
}

/**
 * Convert a timing to a spoken string
 * @param timing: Can be a time (00:00 - 23:59) or an event date
 * @returns {string}: The text Alexa will tell
 */
function timingString(timing) {
    const regex = new RegExp('^[0-2][0-9]');
    return regex.test(timing) ? `a las <say-as interpret-as="time">${timing}</say-as>` : timingToText(timing);
}

function getStartDatePrompt(missingDate) {
    const init = 'Primero necesito algunos datos.';
    if (missingDate.type === 'MedicationRequest') {
        return `${init} Debes tomar ${missingDate.name} por ${missingDate.duration} días.`;
    }

    if (missingDate.type === 'ServiceRequest') {
        return `${init} Debes ${missingDate.name} por ${missingDate.duration} días.`;
    }

    return '';
}

/**
 *
 * @param day {string}
 * @param observationsValues {{time: string, value: string, timing: string}[]}
 */
function makeTextForObservationDay(day, observationsValues) {
    let text = `${day}, tu nivel de azúcar en sangre fue`;
    if (observationsValues.length === 1) {
        const observation = observationsValues[0];
        const time = getTimingOrTime(observation);
        text = `${text} ${observation.value} ${time}`;
        return text;
    }

    const values = observationsValues.map((value, index) => {
        const time = getTimingOrTime(value);
        if (index === observationsValues.length - 1) {
            return ` y ${value.value} ${time}.`;
        }

        return ` ${value.value} ${time}`;
    }).join(',');

    return `${text} ${values}`;
}

function getTimingOrTime(observationValue) {
    if (!observationValue.timing || observationValue.timing === timingEvent.EXACT)
    {
        return `a las ${observationValue.time}`;
    }

    return fhirTiming.timingCodeToString(observationValue.timing);
}

/**
 * Gets the hours and minutes to say
 * @param date {DateTime}
 * @return string
 */
function getHoursAndMinutes(date) {
    const minutes = date.minute === 0 ? "en punto" : date.minute;
    return `${date.hour} ${minutes}`;
}

function getHoursAndMinutesFromString(time) {
    const minutes = time.substring(3) === "00" ? "en punto" : time.substring(3)
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
        return 'hoy';
    } else if (yesterday.toISODate() === referenceDate.toISODate()) {
        return 'ayer';
    } else if (tomorrow.toISODate() === referenceDate.toISODate()) {
        return 'mañana';
    }

    const month = referenceDate.month < 10 ? `0${referenceDate.month}` : referenceDate.month;
    const day = referenceDate.day < 10 ? `0${referenceDate.day}` : referenceDate.day;
    return `${datePreposition} <say-as interpret-as="date">????${month}${day}</say-as>`;
}

/**
 * @param medicationData {{medication: string, dose: [{value: string, unit: string, time: [string]}]}}
 */
function makeMedicationText(medicationData) {
    const regex = new RegExp('^[0-2][0-9]');
    const doseTextArray = medicationData.dose.map(dose => {
        const doseHasTime = dose.time.length > 0 && regex.test(dose.time[0]);
        const timingTextFunction = doseHasTime ? getHoursAndMinutesFromString: timingToText;
        const preposition = doseHasTime ? 'a las' : '';
        const timings = dose.time.map(time => timingTextFunction(time));
        return timings.map(time =>
            `${dose.value} ${unitsToStrings(dose.unit, +dose.value > 1)} ${preposition} ${time}`);
    }).flat(1);
    const doseText = listItems(doseTextArray, responses.CONCAT_WORD);
    return `Toma ${medicationData.medication}, ${doseText}`;
}

function getNoRecordsTextForDay(date, userTimezone) {
    return `${responses.NO_RECORDS_FOUND} para ${getTextForDay(date, userTimezone, '')}`;
}

/**
 * @param serviceData {{action: string, timings: [string]}}
 */
function makeServiceText(serviceData) {
    const regex = new RegExp('^[0-2][0-9]');
    const serviceHasTime = serviceData.timings.length > 0 && regex.test(serviceData.timings[0]);
    const timingTextFunction = serviceHasTime ? getHoursAndMinutesFromString : timingToText;
    const preposition = serviceHasTime ? 'a las ' : '';
    const timings = serviceData.timings.map(time => timingTextFunction(time));
    return `${serviceData.action} ${preposition} ${listItems(timings, responses.CONCAT_WORD)}`;
}

function timingToText(timing) {
    switch (timing) {
        case 'ACD':
            return 'antes del almuerzo';
        case 'CD':
            return 'en el almuerzo';
        case 'PCD':
            return 'después del almuerzo';
        case 'ACM':
            return 'antes del desayuno';
        case 'CM':
            return 'en el desayuno';
        case 'PCM':
            return 'antes del desayuno';
        case 'ACV':
            return 'antes de la cena';
        case 'CV':
            return 'en la cena';
        case 'PCV':
            return 'después de la cena';
        case 'AC':
            return 'antes de comer';
        case 'C':
            return 'al comer';
        case 'PC':
            return 'después de comer';
        default:
            return '';
    }
}

function unitsToStrings(unit, isPlural) {
    switch (unit.toLowerCase()) {
        case 'u':
            return 'unidad' + (isPlural ? 'es' : '');
        case 'tab':
            return 'tableta' + (isPlural ? 's' : '');
        default:
            return unit;
    }
}

module.exports = {
    responses,
    getMedicationReminderText,
    getMedicationSsmlReminderText,
    getServiceReminderText,
    getServiceSsmlReminderText,
    getStartDatePrompt,
    getTextForDay,
    makeMedicationText,
    getNoRecordsTextForDay,
    makeServiceText,
    getConfirmationDateText,
    getSuggestedTimeText,
    getHoursAndMinutes,
    makeTextForObservationDay,
}
