import { MessagesInterface, ObservationValue } from "./messages-interface";
import { DateTime } from "luxon";
import { listItems, wrapSpeakMessage } from "../utils/helper";
import { TimingEvent } from "../enums";
import { CustomRequest, MedicationData, ServiceData } from "../types";

export class MessagesEs implements MessagesInterface {
    static locale = 'en-GB'

    responses = {
        WELCOME: "Hi, I can tell you your medications for tomorrow",
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
        DATE_PREPOSITION: "On",
        CONCAT_WORD: "and",
        REMINDER_NOT_CREATED: "Sorry, I couldn't create the reminders. Please try again.",
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
                return 'desayuno'
            case 'CD':
                return 'almuerzo'
            case 'CV':
                return 'cena'
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
        const doseTextArray = medicationData.dose.map(dose => {
            const doseHasTime = dose.time.length > 0 && regex.test(dose.time[0]);
            const timingTextFunction = doseHasTime ? this.getHoursAndMinutesFromString: this.timingToText;
            const timings = dose.time.map(time => timingTextFunction(time));
            return timings.map(time =>
                `${dose.value} ${this.unitsToStrings(dose.unit, +dose.value > 1)} ${time}`);
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
