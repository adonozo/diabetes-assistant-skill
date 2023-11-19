import { DateTime } from "luxon";
import { CustomRequest, Day, MedicationData, OccurrencesPerDay, ServiceData } from "../types";
import { Observation } from "fhir/r5";
import { AppLocale } from "../enums";

export abstract class AbstractMessage {
    locale: AppLocale;

    abstract supportedLocales: AppLocale[];

    protected constructor(locale: AppLocale) {
        this.locale = locale;
    }

    abstract responses: {
        WELCOME: string,
        WELCOME_FIRST: string,
        WELCOME_REPROMPT: string,
        REMINDER_PERMISSIONS: string,
        SUCCESSFUL_REMINDER_PERMISSION: string,
        SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: string,
        REPROMPT_REMINDER_PERMISSIONS: string,
        HELP: string,
        HELP_REPROMPT: string,
        ERROR: string,
        STOP: string,
        ACCOUNT_LINK: string,
        SUCCESSFUL_REMINDERS: string,
        REQUESTS_REMINDERS_SETUP: string,
        SETUP_TIMINGS: string,
        NO_GLUCOSE_RECORDS_FOUND: string,
        NO_RECORDS_FOUND: string,
        NO_SERVICE_REQUESTS_FOUND: string,
        QUERY_SETUP: string,
        PERMISSIONS_REQUIRED: string,
        REMINDER_NOT_CREATED: string,
        SET_START_DATE_SUCCESSFUL: string,
    }

    abstract words: {
        DATE_PREPOSITION: string,
        CONCAT_WORD: string,
        TODAY: string,
        TOMORROW: string,
        YESTERDAY: string,
        TIME_PREPOSITION: string,
        FOR: string,
    }

    makeTextFromObservations(observations: Observation[], timezone: string): string {
        const dateMap = new Map<string, ObservationValue[]>();
        observations.forEach(observation => {
            const date = DateTime.fromISO(observation.issued!).setZone(timezone);
            const dayKey = this.getTextForDay(observation.issued!, timezone);
            const observationValue = {
                time: this.getHoursAndMinutes(date),
                value: observation.valueQuantity?.value?.toString() ?? '',
                timing: (observation.extension && observation.extension[0]?.valueCode) ?? ''
            };
            this.upsertValueToMap(dateMap, dayKey, observationValue);
        });

        let text = '';
        dateMap.forEach((value, day) => {
            const textForDay = this.makeTextForObservationDay(day, value)
            text = text + textForDay + '. ';
        })

        return this.wrapSpeakMessage(text);
    }

    buildListTimesOrTimings(timings: string[]): string {
        const regex = new RegExp('^[0-2][0-9]');
        const hasTime = timings.length > 0 && regex.test(timings[0]);
        const timingTextFunction = hasTime ? this.getHoursAndMinutesFromString : this.timingToText;
        const timeList = timings.map(time => timingTextFunction(time));

        const preposition = hasTime ? this.words.TIME_PREPOSITION + ' ' : '';
        return preposition + this.listItems(timeList, this.words.CONCAT_WORD);
    }

    abstract getMedicationReminderText(value: number, unit: string, medication: string, times: string[]): string;

    abstract getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: string[]): string;

    abstract getServiceSsmlReminderText(action: string, times: string[]): string;

    abstract getStartDatePrompt(missingDate: CustomRequest): string;

    abstract makeTextForObservationDay(day: string, observationsValues: ObservationValue[]): string;

    abstract getTimingOrTime(observationValue: ObservationValue): string;

    abstract getHoursAndMinutes(date: DateTime): string;

    abstract getHoursAndMinutesFromString(time: string): string;

    abstract makeMedicationText(medicationData: MedicationData): string;

    abstract makeServiceText(serviceData: ServiceData): string;

    abstract buildServiceRequestText(occurrences: OccurrencesPerDay[], today: Day, tomorrow: Day): string;

    abstract timingToText(timing: string): string;

    abstract stringToTimingCode(value: string): string;

    abstract codeToString(timingCode: string): string;

    abstract unitsToStrings(unit: string, isPlural: boolean): string;

    abstract durationUnitToString(unit: string): string;

    abstract dayToString(day: Day): string;

    protected wrapSpeakMessage(message: string): string {
        return `<speak>${message}</speak>`
    }

    protected listItems(values: string[], concatWord: string): string {
        if (values.length === 1) {
            return values[0];
        }

        const joinComma = values.length > 2 ? ',' : ''
        return values
            .map((value, index) => index === values.length - 1 ? `${concatWord} ${value}.` : ` ${value}`)
            .join(joinComma)
    }

    protected ensureLocaleIsValid(): void {
        if (!this.supportedLocales.includes(this.locale)) {
            throw new Error(`Unsupported locale ${this.locale}. Expected values: ${this.supportedLocales.join(', ')}`);
        }
    }

    protected occurrenceText(occurrence: OccurrencesPerDay, today: Day, tomorrow: Day): string {
        let start: string;
        switch (occurrence.day) {
            case today:
                start = this.words.TODAY;
                break;
            case tomorrow:
                start = this.words.TOMORROW;
                break;
            default:
                start = `${this.words.DATE_PREPOSITION} ${this.dayToString(occurrence.day)}`;
        }

        const when = occurrence.when.map(this.timingToText)
            .join(', ')

        return `${start}, ${when}`
    }

    /**
     * Returns "today", "yesterday", "tomorrow", or a date
     * @param date {string}
     * @param timezone {string}
     */
    getTextForDay(date: string, timezone: string): string {
        const today = DateTime.utc().setZone(timezone);
        const yesterday = today.minus({days: 1});
        const tomorrow = today.plus({days: 1});

        const referenceDateTime = DateTime.fromISO(date).setZone(timezone);
        const referenceDate = referenceDateTime.toISODate();
        switch (referenceDate) {
            case today.toISODate():
                return this.words.TODAY;
            case yesterday.toISODate():
                return this.words.YESTERDAY;
            case tomorrow.toISODate():
                return this.words.TOMORROW;
        }

        const month = referenceDateTime.month < 10 ? `0${referenceDateTime.month}` : referenceDateTime.month;
        const day = referenceDateTime.day < 10 ? `0${referenceDateTime.day}` : referenceDateTime.day;
        return `${this.words.DATE_PREPOSITION} <say-as interpret-as="date">????${month}${day}</say-as>`;
    }

    getConfirmationDateText(requestName: string): string {
        return `${this.responses.SET_START_DATE_SUCCESSFUL} ${requestName}.`;
    }

    getServiceReminderText(action: string, times: string[]): string {
        const timeList = this.buildListTimesOrTimings(times);
        return `${action} ${timeList}`;
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

    getNoRecordsTextForDay(date: string, userTimezone: string): string {
        return `${this.responses.NO_RECORDS_FOUND} ${this.words.FOR} ${this.getTextForDay(date, userTimezone)}`;
    }

    private upsertValueToMap(map: Map<string, ObservationValue[]>, key: string, value: ObservationValue): void {
        if (map.has(key)) {
            map.get(key)!.push(value);
        } else {
            map.set(key, [value]);
        }
    }
}

export type ObservationValue = {time: string, value: string, timing: string}
