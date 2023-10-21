import { MessagesInterface, ObservationValue } from "./messages-interface";
import { timingEvent } from "../fhir/timing";
import { listItems, wrapSpeakMessage } from "../utils/helper";
import { DateTime } from "luxon";
import { CustomRequest, MedicationData, ServiceData } from "../types";

export class MessagesEn implements MessagesInterface {
    static locale = 'en-GB'
    locale = MessagesEn.locale;

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

    getMedicationReminderText(value: number, unit: string, medication: string, times: string[]): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `Take ${value} ${unit} of ${medication} ${timeList}`;
    }

    getConfirmationDateText(requestName: string): string {
        return `You have set the start date for ${requestName}.`;
    }

    getSuggestedTimeText(mealCode: string): string {
        const meal = this.getMealSuggestion(mealCode);
        return `Is this measure before ${meal}, after ${meal}, or none?`
    }

    getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: string[]): string {
        const stringTimes = times.map((time, index) => this.timingString(time, index === 0 ? 'at ' : ''));
        const timeList = listItems(stringTimes, this.responses.CONCAT_WORD);
        const message = `Take ${value} ${unit} of ${medication} ${timeList}`;
        return wrapSpeakMessage(message);
    }

    getServiceReminderText(action: string, times: string[]): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `${action} ${timeList}`;
    }

    getServiceSsmlReminderText(action: string, times: string[]): string {
        const stringTimes = times.map((time, index) => this.timingString(time, index === 0 ? 'at ' : ''));
        const timeList = listItems(stringTimes, this.responses.CONCAT_WORD);
        const message = `${action} ${timeList}`;
        return wrapSpeakMessage(message);
    }

    /**
     * Convert a timing to a spoken string
     * @param timing: Can be a time (00:00 - 23:59) or an event date
     * @param preposition
     * @returns {string}: The text Alexa will tell
     */
    timingString(timing: string, preposition: string): string {
        const regex = new RegExp('^[0-2][0-9]');
        return regex.test(timing)
            ? `${preposition}<say-as interpret-as="time">${timing}</say-as>`
            : this.timingToText(timing);
    }

    getStartDatePrompt(missingDate: CustomRequest): string {
        const init = 'I need some information first.';
        const unit = this.durationUnitToString(missingDate.durationUnit);
        if (missingDate.type === 'MedicationRequest') {
            return `${init} You need to take ${missingDate.name} for ${missingDate.duration} ${unit}.`;
        }

        if (missingDate.type === 'ServiceRequest') {
            return `${init} Your plan includes: ${missingDate.name} for ${missingDate.duration} ${unit}.`;
        }

        return '';
    }

    /**
     *
     * @param day {string}
     * @param observationsValues {{time: string, value: string, timing: string}[]}
     */
    makeTextForObservationDay(day: string, observationsValues: ObservationValue[]): string {
        let text = `${day}, you had a blood glucose level of`;
        if (observationsValues.length === 1) {
            const observation = observationsValues[0];
            const time = this.getTimingOrTime(observation);
            text = `${text} ${observation.value} ${time}`;
            return text;
        }

        const values = observationsValues.map((value, index) => {
            const time = this.getTimingOrTime(value);
            if (index === observationsValues.length - 1) {
                return ` and ${value.value} ${time}.`;
            }

            return ` ${value.value} ${time}`;
        }).join(',');

        return `${text} ${values}`;
    }

    getTimingOrTime(observationValue: ObservationValue): string {
        if (!observationValue.timing || observationValue.timing === timingEvent.EXACT)
        {
            return `at ${observationValue.time}`;
        }

        return this.timingToText(observationValue.timing);
    }

    /**
     * Gets the hours and minutes to say
     * @param date {DateTime}
     * @return string
     */
    getHoursAndMinutes(date: DateTime): string {
        const minutes = date.minute === 0 ? "o'clock" : date.minute;
        return `${date.hour} ${minutes}`;
    }

    getHoursAndMinutesFromString(time: string): string {
        const timeParts = time.split(':');
        const minutes = timeParts[1] === "00" ? "o'clock" : timeParts[1]
        return `${+timeParts[0]} ${minutes}`;
    }

    /**
     * Returns "today", "yesterday", "tomorrow", or a date
     * @param date {string}
     * @param timezone {string}
     * @param datePreposition {string}
     */
    getTextForDay(date: string, timezone: string, datePreposition: string): string {
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

    /**
     * @param medicationData {{medication: string, dose: [{value: string, unit: string, time: [string]}]}}
     */
    makeMedicationText(medicationData: MedicationData): string {
        const regex = new RegExp('^[0-2][0-9]');
        const doseTextArray = medicationData.dose.map(dose => {
            const doseHasTime = dose.time.length > 0 && regex.test(dose.time[0]);
            const timingTextFunction = doseHasTime ? this.getHoursAndMinutesFromString : this.timingToText;
            const preposition = doseHasTime ? 'at' : '';
            const timings = dose.time.map(time => timingTextFunction(time));
            return timings.map(time =>
                `${dose.value} ${this.unitsToStrings(dose.unit, +dose.value > 1)} ${preposition} ${time}`);
        })
            .flat(1);
        const doseText = listItems(doseTextArray, this.responses.CONCAT_WORD);
        return `Take ${medicationData.medication}, ${doseText}`;
    }

    getNoRecordsTextForDay(date:string, userTimezone: string): string {
        return `${this.responses.NO_RECORDS_FOUND} for ${this.getTextForDay(date, userTimezone, '')}`;
    }

    /**
     * @param serviceData {{action: string, timings: [string]}}
     */
    makeServiceText(serviceData: ServiceData): string {
        const timeList = this.buildListTimesOrTimings(serviceData.timings);
        return `Do a ${serviceData.action} ${timeList}`;
    }

    buildListTimesOrTimings(timings: string[]): string {
        const regex = new RegExp('^[0-2][0-9]');
        const hasTime = timings.length > 0 && regex.test(timings[0]);
        const timingTextFunction = hasTime ? this.getHoursAndMinutesFromString : this.timingToText;
        const timeList = timings.map(time => timingTextFunction(time));

        const preposition = hasTime ? 'at ' : '';
        return preposition + listItems(timeList, this.responses.CONCAT_WORD);
    }

    timingToText(timing: string): string {
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

    stringToTimingCode(value: string): string {
        switch (value) {
            case 'lunch':
                return 'CD';
            case "before lunch":
                return 'ACD';
            case "after lunch":
                return 'PCD'
            case 'breakfast':
                return 'CM';
            case 'before breakfast':
                return 'ACM';
            case 'after breakfast':
                return 'PCM';
            case 'dinner':
                return 'CV'
            case 'before dinner':
                return 'ACV';
            case 'after dinner':
                return 'PCV';
            case 'before meal':
                return 'AC'
            case 'after meal':
                return 'PC'
            case 'dawn':
                return 'MORN_early'
            case 'morning':
                return 'MORN'
            case 'noon':
                return 'NOON'
            case 'afternoon':
                return 'AFT'
            case 'evening':
                return 'EVE'
            case 'night':
                return 'NIGHT'
            default:
                return 'EXACT'
        }
    }

    getMealSuggestion(timingCode: string): string {
        switch (timingCode) {
            case 'CM':
                return 'breakfast'
            case 'CD':
                return 'lunch'
            case 'CV':
                return 'dinner'
            case 'C':
            default:
                return 'meal'
        }
    }

    /**
     * To get exact code translations, for intent's timingEvent type
     * @param timingCode
     */
    codeToString(timingCode: string): string {
        switch (timingCode) {
            case 'CM':
                return 'breakfast';
            case 'CD':
                return 'lunch';
            case 'CV':
                return 'dinner';
            default:
                throw new Error(`Invalid timing code ${timingCode}`);
        }
    }

    unitsToStrings(unit: string, isPlural: boolean): string {
        switch (unit.toLowerCase()) {
            case 'u':
                return 'unit' + (isPlural ? 's' : '');
            case 'tab':
                return 'tablet' + (isPlural ? 's' : '');
            default:
                return unit;
        }
    }

    durationUnitToString(unit: string): string {
        switch (unit.toLowerCase()) {
            case 'd':
                return 'days';
            case 'wk':
                return 'weeks';
            case 'mo':
                return 'months';
            default:
                throw new Error(`Invalid unit code ${unit}`);
        }
    }
}