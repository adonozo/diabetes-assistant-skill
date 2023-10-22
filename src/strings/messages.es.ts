import { MessagesInterface, ObservationValue } from "./messages-interface";
import { DateTime } from "luxon";
import { listItems, wrapSpeakMessage } from "../utils/helper";
import { TimingEvent } from "../enums";
import { CustomRequest, MedicationData, ServiceData } from "../types";

export class MessagesEs implements MessagesInterface {
    static locale = 'es-MX'
    locale = MessagesEs.locale

    responses = {
        WELCOME: "Hola, puedes preguntarme tus medicamentos para mañana",
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
        REQUESTS_REMINDERS_SETUP: 'Dí "crea recordatorios" si deseas continuar creando tus recordatorios.',
        SETUP_TIMINGS: "Primero necesito saber la hora para algunos eventos.",
        INVALID_BLOOD_GLUCOSE: 'Lo siento, tuve problemas para hacer lo que pediste. Intenta de nuevo diciéndo: "Registra mi nivel de azúcar en sangre"',
        INVALID_BLOOD_GLUCOSE_REPROMPT: 'Intenta de nuevo diciéndo: "Registra mi nivel de azúcar en sangre"',
        BLOOD_GLUCOSE_SUCCESS: "Tu nivel de azúcar en sangre se ha registrado.",
        NO_GLUCOSE_RECORDS_FOUND: "No encontré registros para esa fecha.",
        NO_RECORDS_FOUND: "No encontré registros",
        QUERY_SETUP: "Ahora, intenta preguntarme sobre tus medicamentos para una fecha de nuevo",
        LOW_GLUCOSE: "Tu nivel de azúcar en sangre es más bajo de lo recomendado. Considera consultar con tu médico.",
        HIGH_GLUCOSE: "Tu nivel de azúcar en sangre es más alto de lo recomendado. Considera consultar con tu médico.",
        PERMISSIONS_REQUIRED: "Sin permisos, no puedo crear recordatorios para tus medicamentos.",
        DATE_PREPOSITION: "El",
        CONCAT_WORD: "y",
        REMINDER_NOT_CREATED: "Lo siento, no pude crear los recordatorios. Intenta nuevamente.",
    }

    buildListTimesOrTimings(timings: string[]): string {
        const regex = new RegExp('^[0-2][0-9]');
        const hasTime = timings.length > 0 && regex.test(timings[0]);
        const timingTextFunction = hasTime ? this.getHoursAndMinutesFromString : this.timingToText;
        const timeList = timings.map(time => timingTextFunction(time));

        const preposition = hasTime ? 'a las ' : '';
        return preposition + listItems(timeList, this.responses.CONCAT_WORD);
    }

    codeToString(timingCode: string): string {
        switch (timingCode) {
            case 'CM':
                return 'desayuno';
            case 'CD':
                return 'almuerzo';
            case 'CV':
                return 'cena';
            default:
                throw new Error(`Invalid timing code ${timingCode}`);
        }
    }

    durationUnitToString(unit: string): string {
        switch (unit.toLowerCase()) {
            case 'd':
                return 'días';
            case 'wk':
                return 'semanas';
            case 'mo':
                return 'meses';
            default:
                throw new Error(`Invalid unit code ${unit}`);
        }
    }

    getConfirmationDateText(requestName: string): string {
        return `Has configurado la fecha de inicio para ${requestName}.`;
    }

    getHoursAndMinutes(date: DateTime): string {
        const minutes = date.minute === 0 ? "en punto" : date.minute;
        return `${date.hour} ${minutes}`;
    }

    getHoursAndMinutesFromString(time: string): string {
        const timeParts = time.split(':');
        const minutes = timeParts[1] === "00" ? "en punto" : timeParts[1]
        let preposition = timeParts[1] === "01" ? 'a la' : 'a las';

        return `${preposition} ${+timeParts[0]} ${minutes}`;
    }

    getMealSuggestion(timingCode: string): string {
        switch (timingCode) {
            case 'CM':
                return 'del desayuno'
            case 'CD':
                return 'del almuerzo'
            case 'CV':
                return 'del la cena'
            case 'C':
            default:
                return 'de comer'
        }
    }

    getMedicationReminderText(value: number, unit: string, medication: string, times: []): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `Toma ${value} ${unit} de ${medication} ${timeList}`;
    }

    getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: []): string {
        const stringTimes = times.map((time) => this.timingString(time, 'a las '));
        const timeList = listItems(stringTimes, this.responses.CONCAT_WORD);
        const message = `Toma ${value} ${unit} de ${medication} ${timeList}`;
        return wrapSpeakMessage(message);
    }

    getNoRecordsTextForDay(date: string, userTimezone: string): string {
        return `${this.responses.NO_RECORDS_FOUND} para ${this.getTextForDay(date, userTimezone, '')}`;
    }

    getServiceReminderText(action: string, times: []): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `${action} ${timeList}`;
    }

    getServiceSsmlReminderText(action: string, times: []): string {
        const stringTimes = times.map((time) => this.timingString(time, 'a las '));
        const timeList = listItems(stringTimes, this.responses.CONCAT_WORD);
        const message = `${action} ${timeList}`;
        return wrapSpeakMessage(message);
    }

    getStartDatePrompt(missingDate: CustomRequest): string {
        const init = 'Primero necesito algunos datos.';
        const unit = this.durationUnitToString(missingDate.durationUnit);
        if (missingDate.type === 'MedicationRequest') {
            return `${init} Debes tomar ${missingDate.name} por ${missingDate.duration} ${unit}.`;
        }

        if (missingDate.type === 'ServiceRequest') {
            return `${init} Debes ${missingDate.name} por ${missingDate.duration} ${unit}.`;
        }

        return '';
    }

    getSuggestedTimeText(mealCode: string): string {
        const meal = this.getMealSuggestion(mealCode);
        return `¿Esta medida es antes ${meal}, después ${meal}, o ninguno?`
    }

    getTextForDay(date: string, timezone: string, datePreposition: string): string {
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
        return `${datePreposition} <say-as interpret-as="date">${month}${day}</say-as>`;
    }

    getTimingOrTime(observationValue: ObservationValue): string {
        if (!observationValue.timing || observationValue.timing === TimingEvent.EXACT)
        {
            return `a las ${observationValue.time}`;
        }

        return this.timingToText(observationValue.timing);
    }

    makeMedicationText(medicationData: MedicationData): string {
        const regex = new RegExp('^[0-2][0-9]');
        const doseTextArray = medicationData.dose
            .map(dose => {
                const doseHasTime = dose.time.length > 0 && regex.test(dose.time[0]);
                const timeToTextFunction = doseHasTime ? this.getHoursAndMinutesFromString : this.timingToText;
                const timings = dose.time.map(timeToTextFunction);
                return timings.map(time =>
                    `${dose.value} ${this.unitsToStrings(dose.unit, dose.value > 1)} ${time}`);
            })
            .flat(1);

        const doseText = listItems(doseTextArray, this.responses.CONCAT_WORD);
        return `Toma ${medicationData.medication}, ${doseText}`;
    }

    makeServiceText(serviceData: ServiceData): string {
        const timeList = this.buildListTimesOrTimings(serviceData.timings);
        return `${serviceData.action} ${timeList}`;
    }

    makeTextForObservationDay(day: string, observationsValues: ObservationValue[]): string {
        let text = `${day}, tu nivel de azúcar en sangre fue`;
        if (observationsValues.length === 1) {
            const observation = observationsValues[0];
            const time = this.getTimingOrTime(observation);
            text = `${text} ${observation.value} ${time}`;
            return text;
        }

        const values = observationsValues.map((value, index) => {
            const time = this.getTimingOrTime(value);
            if (index === observationsValues.length - 1) {
                return ` y ${value.value} ${time}.`;
            }

            return ` ${value.value} ${time}`;
        }).join(',');

        return `${text} ${values}`;
    }

    stringToTimingCode(value: string): string {
        switch (value) {
            case 'almuerzo':
                return 'CD';
            case "antes del almuerzo":
                return 'ACD';
            case "después del almuerzo":
            case "despues del almuerzo":
                return 'PCD'
            case 'desayuno':
                return 'CM';
            case 'antes del desayuno':
                return 'ACM';
            case 'después del desayuno':
            case 'despues del desayuno':
                return 'PCM';
            case 'cena':
                return 'CV'
            case 'antes de la cena':
                return 'ACV';
            case 'después de la cena':
            case 'despues de la cena':
                return 'PCV';
            case 'antes de comer':
                return 'AC'
            case 'después de comer':
                return 'PC'
            case 'madrugada':
                return 'MORN_early'
            case 'mañana':
                return 'MORN'
            case 'tarde':
                return 'AFT'
            case 'noche':
                return 'NIGHT'
            case 'mediodía':
                return 'NOON'
            default:
                return 'EXACT'
        }
    }

    timingString(timing: string, preposition: string): string {
        const regex = new RegExp('^[0-2][0-9]');
        return regex.test(timing) ? `${preposition}<say-as interpret-as="time">${timing}</say-as>` : this.timingToText(timing);
    }

    timingToText(timing: string): string {
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

    unitsToStrings(unit: string, isPlural: boolean): string {
        switch (unit.toLowerCase()) {
            case 'u':
                return 'unidad' + (isPlural ? 'es' : '');
            case 'tab':
                return 'tableta' + (isPlural ? 's' : '');
            default:
                return unit;
        }
    }
}
