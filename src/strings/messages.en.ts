import { AbstractMessage } from "./abstractMessage";
import { DateTime } from "luxon";
import { MissingDateSetupRequest, Day, MedicationData, OccurrencesPerDay, DateSlot } from "../types";
import { AppLocale } from "../enums";
import { digitWithLeadingZero } from "../utils/time";
import { throwWithMessage } from "../utils/intent";

export class MessagesEn extends AbstractMessage {
    supportedLocales = [AppLocale.enUS, AppLocale.enGB];

    constructor(locale: AppLocale) {
        super(locale);
        this.ensureLocaleIsValid();
    }

    responses = {
        WELCOME: `Welcome, this is the Diabetes Assistant. You can ask me what medications you need to take today or when
you need to measure your blood glucose levels`,
        WELCOME_FIRST: `Welcome, this is the Diabetes Assistant. You can ask me what medications you need to take today; or when you need to measure your blood glucose levels. You can also ask me to create daily reminders for your 
care plan. What would you like to do?`,
        WELCOME_REPROMPT: 'You can say: what medications do I have to take today? If you want to create reminders, just say: create reminders',
        REMINDER_PERMISSIONS: 'I need permission to access your reminders.',
        SUCCESSFUL_REMINDER_PERMISSION: `Now that you've provided permission, you can try again by saying "setup reminders"`,
        SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: 'You can try again by saying "setup reminders"',
        REPROMPT_REMINDER_PERMISSIONS: 'Say ok if you want to grant me permission.',
        HELP: 'You can say: what medications do I have to take today? If you want to create reminders, just say: create reminders',
        HELP_REPROMPT: 'You can say: when do I have to measure my blood glucose?',
        ERROR: 'Sorry, I had trouble doing what you asked. Please try again.',
        STOP: 'Goodbye!',
        ACCOUNT_LINK: "Your account is not linked. Add your account first in the Alexa app.",
        SUCCESSFUL_REMINDERS: "Your reminders have been created, check the Alexa app to verify them.",
        REQUESTS_REMINDERS_SETUP: 'Say "setup reminders" if you want to continue setting up your reminders.',
        SETUP_TIMINGS: "You need to set some timings first.",
        NO_GLUCOSE_RECORDS_FOUND: "I didn't find records for that date",
        NO_RECORDS_FOUND: "I didn't find records",
        NO_SERVICE_REQUESTS_FOUND: "You don't need to measure your blood glucose levels for the next seven days",
        QUERY_SETUP: 'Now, try asking me about your care plan for today again.',
        PERMISSIONS_REQUIRED: "Without permissions, I can't set a reminder.",
        REMINDER_NOT_CREATED: "Sorry, I couldn't create the reminders. Please try again.",
        SET_START_DATE_SUCCESSFUL: 'You have set the start date for',
        PROMPT_START_TIME: 'At what time will you start it?',
        REPROMPT_START_TIME: 'At what time are your starting or have you started it?',
    }

    words = {
        DATE_PREPOSITION: "On",
        CONCAT_WORD: "and",
        TODAY: 'today',
        TOMORROW: 'tomorrow',
        YESTERDAY: 'yesterday',
        TIME_PREPOSITION: 'at',
        FOR: 'for'
    }

    getMedicationReminderText(value: number, unit: string, medication: string, times: string[]): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `Take ${value} ${unit} of ${medication} ${timeList}`;
    }

    getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: string[]): string {
        const stringTimes = times.map((time, index) => this.timingString(time, index === 0 ? 'at ' : ''));
        const timeList = this.listItems(stringTimes, this.words.CONCAT_WORD);
        const message = `Take ${value} ${unit} of ${medication} ${timeList}`;
        return this.wrapSpeakMessage(message);
    }

    getServiceSsmlReminderText(action: string, times: string[]): string {
        const stringTimes = times.map((time, index) => this.timingString(time, index === 0 ? 'at ' : ''));
        const timeList = this.listItems(stringTimes, this.words.CONCAT_WORD);
        const message = `${action} ${timeList}`;
        return this.wrapSpeakMessage(message);
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
        const doseText = this.listItems(doseTextArray, this.words.CONCAT_WORD);
        return `Take ${medicationData.medication}, ${doseText}`;
    }

    buildServiceRequestText(occurrences: OccurrencesPerDay[], today: Day, tomorrow: Day): string {
        const dailyOccurrences = occurrences
            .map(occurrence => this.occurrenceText(occurrence, today, tomorrow));

        return `Measure your blood glucose level ${this.listItems(dailyOccurrences, this.words.CONCAT_WORD)}`;
    }

    promptMissingRequest(missingDateRequest: MissingDateSetupRequest, currentDate: DateTime, slot: DateSlot): string {
        let textStart = 'I need some information first.';
        const unit = this.durationUnitToString(missingDateRequest.durationUnit);
        let textEnd;

        switch (missingDateRequest.type) {
            case 'MedicationRequest':
                textStart = `${textStart} You need to take ${missingDateRequest.name} for ${missingDateRequest.duration} ${unit}.`;
                break;
            case 'ServiceRequest':
                textStart = `${textStart} Your need to measure your blood glucose level for ${missingDateRequest.duration} ${unit}.`;
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
        return `On which date have you started or will you start? Today is <say-as interpret-as=\"date\">????${month}${day}</say-as>`
    }

    rePromptStartDate(currentDate: DateTime): string {
        const day = digitWithLeadingZero(currentDate.day);
        const month = digitWithLeadingZero(currentDate.month);
        return `Tell me the day and month you have started, or you will start. Today is <say-as interpret-as=\"date\">????${month}${day}</say-as>`;
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

    dayToString(day: Day): string {
        switch (day) {
            case "mon":
                return 'Monday';
            case "tue":
                return 'Tuesday';
            case "wed":
                return 'Wednesday';
            case "thu":
                return 'Thursday';
            case "fri":
                return 'Friday';
            case "sat":
                return 'Saturday';
            case "sun":
                return 'Sunday';
            default:
                return day;
        }
    }
}
