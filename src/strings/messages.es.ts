import { AbstractMessage } from "./abstractMessage";
import { DateTime } from "luxon";
import { AppLocale } from "../enums";
import { MissingDateSetupRequest, Day, MedicationData, OccurrencesPerDay, ServiceData, DateSlot } from "../types";
import { digitWithLeadingZero } from "../utils/time";
import { throwWithMessage } from "../utils/intent";

export class MessagesEs extends AbstractMessage {
    supportedLocales = [AppLocale.esES, AppLocale.esMX, AppLocale.esUS];

    constructor(locale: AppLocale) {
        super(locale);
        this.ensureLocaleIsValid();
    }

    responses = {
        WELCOME: `¡Hola! Este es el asistente de diabetes. Puedes preguntarme cuáles son los medicamentos que debes tomar 
el día de hoy o mañana; o cúando debes medir tu nivel de glucosa en sangre`,
        WELCOME_FIRST: `¡Hola! Este es el asistente de diabetes. Puedes preguntarme cuáles son los medicamentos que debes tomar 
el día de hoy o mañana; o cúando debes medir tu nivel de glucosa en sangre. También puedo crear recordatorios diarios de 
tu plan de cuidado. ¿Que deseas hacer?`,
        WELCOME_REPROMPT: `Puedes decir: ¿cuáles son mis medicamentos para hoy? Si deseas crear recordatorios, solo dí:
crea recordatorios.`,
        REMINDER_PERMISSIONS: 'Necesito permisos para crear recordatorios',
        SUCCESSFUL_REMINDER_PERMISSION: `Ahora que tengo permisos, puedo crear recordatorios. Intenta diciendo: "crea recordatorios"`,
        SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: 'Puedes intentar de nuevo diciendo: "crea recordatorios"',
        REPROMPT_REMINDER_PERMISSIONS: `Dí: "sí" para otorgarme permisos.`,
        HELP: `Puedes decir: ¿cuáles son mis medicamentos para hoy? Si deseas crear recordatorios, solo dí: crea recordatorios.`,
        HELP_REPROMPT: 'Tambien puedes decir: ¿cuándo debo medir mi glucosa en sangre?',
        ERROR: 'Lo siento, tuve problemas para hacer lo que pediste. Intenta de nuevo',
        STOP: '¡Hasta pronto!',
        ACCOUNT_LINK: 'Tu cuenta no está enlazada. Primero añade tu cuenta en la applicación de Alexa en tu celular.',
        SUCCESSFUL_REMINDERS: 'Tus recordatorios han sido creados. Puedes gestionarlos con la aplicación de Alexa en tu celular.',
        REQUESTS_REMINDERS_SETUP: 'Dí "crea recordatorios" si deseas continuar creando tus recordatorios.',
        SETUP_TIMINGS: 'Primero necesito saber la hora para algunos eventos.',
        NO_GLUCOSE_RECORDS_FOUND: 'No encontré registros para esa fecha.',
        NO_RECORDS_FOUND: 'No encontré registros',
        NO_SERVICE_REQUESTS_FOUND: 'No debes medir tu nivel de glucosa en sangre en los próximos siete días.',
        QUERY_SETUP: 'Ahora, intenta preguntarme sobre tus medicamentos para una fecha de nuevo',
        PERMISSIONS_REQUIRED: 'Sin permisos, no puedo crear recordatorios para tus medicamentos.',
        REMINDER_NOT_CREATED: 'Lo siento, no pude crear los recordatorios. Intenta nuevamente.',
        SET_START_DATE_SUCCESSFUL: 'Has configurado la fecha de inicio para',
        PROMPT_START_TIME: 'Necesito saber la hora a la que empezarás. Dime la hora aproximada entre 0 y 23 horas',
        REPROMPT_START_TIME: '¿A qué hora piensas empezar? Dime la hora aproximada entre 0 y 23 horas',
    }

    words = {
        DATE_PREPOSITION: "El",
        CONCAT_WORD: "y",
        TODAY: 'hoy día',
        TOMORROW: 'mañana',
        YESTERDAY: 'ayer',
        TIME_PREPOSITION: 'a las',
        FOR: 'para'
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

    getMedicationReminderText(value: number, unit: string, medication: string, times: []): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `Toma ${value} ${unit} de ${medication} ${timeList}`;
    }

    getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: []): string {
        const stringTimes = times.map((time) => this.timingString(time, 'a las '));
        const timeList = this.listItems(stringTimes, this.words.CONCAT_WORD);
        const message = `Toma ${value} ${unit} de ${medication} ${timeList}`;
        return this.wrapSpeakMessage(message);
    }

    getServiceSsmlReminderText(action: string, times: []): string {
        const stringTimes = times.map((time) => this.timingString(time, 'a las '));
        const timeList = this.listItems(stringTimes, this.words.CONCAT_WORD);
        const message = `${action} ${timeList}`;
        return this.wrapSpeakMessage(message);
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

        const doseText = this.listItems(doseTextArray, this.words.CONCAT_WORD);
        return `Toma ${medicationData.medication}, ${doseText}`;
    }

    makeServiceText(serviceData: ServiceData): string {
        const timeList = this.buildListTimesOrTimings(serviceData.timings);
        return `${serviceData.action} ${timeList}`;
    }

    buildServiceRequestText(occurrences: OccurrencesPerDay[], today: Day, tomorrow: Day): string {
        const dailyOccurrences = occurrences
            .map(occurrence => this.occurrenceText(occurrence, today, tomorrow));

        return `Mide tu nivel de glucosa en sangre ${this.listItems(dailyOccurrences, this.words.CONCAT_WORD)}`;
    }

    promptMissingRequest(missingDateRequest: MissingDateSetupRequest, currentDate: DateTime, slot: DateSlot): string {
        let textStart = 'Primero necesito algunos datos.';
        const unit = this.durationUnitToString(missingDateRequest.durationUnit);
        let textEnd;

        switch (missingDateRequest.type) {
            case 'MedicationRequest':
                textStart = `${textStart} Debes tomar ${missingDateRequest.name} por ${missingDateRequest.duration} ${unit}.`;
                break;
            case 'ServiceRequest':
                textStart = `${textStart} Debes medir tu nivel de glucosa en sangre por ${missingDateRequest.duration} ${unit}.`;
                break;
            default:
                throwWithMessage(`Could not determine request type: ${missingDateRequest.type}`);
        }

        switch (slot) {
            case "time":
                textEnd = this.promptStartTime();
                break;
            case "date":
                textEnd = this.promptStartDate(currentDate);
                break;
            default:
                throwWithMessage('Could not get determine whether resource needs date or time');
        }

        return this.wrapSpeakMessage(`${textStart} ${textEnd}`);
    }

    promptStartDate(currentDate: DateTime): string {
        const day = digitWithLeadingZero(currentDate.day);
        const month = digitWithLeadingZero(currentDate.month);
        return `¿En que día y mes empezaste o empezarás? Hoy es <say-as interpret-as=\"date\">????${month}${day}</say-as>`;
    }

    rePromptStartDate(currentDate: DateTime): string {
        const day = digitWithLeadingZero(currentDate.day);
        const month = digitWithLeadingZero(currentDate.month);
        return `Dime el día y mes en el que empezaste o piensas empezar. Hoy es <say-as interpret-as=\"date\">????${month}${day}</say-as>`;
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

    dayToString(day: Day): string {
        switch (day) {
            case "mon":
                return 'lunes';
            case "tue":
                return 'martes';
            case "wed":
                return 'miércoles';
            case "thu":
                return 'jueves';
            case "fri":
                return 'viernes';
            case "sat":
                return 'sabado';
            case "sun":
                return 'domingp';
            default:
                return day;
        }
    }
}
