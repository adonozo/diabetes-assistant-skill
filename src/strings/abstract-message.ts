import { DateTime } from "luxon";
import { CustomRequest, MedicationData, ServiceData } from "../types";

export abstract class AbstractMessage {
    abstract locale: string;

    abstract responses: {
        WELCOME: string,
        REMINDER_PERMISSIONS: string,
        SUCCESSFUL_REMINDER_PERMISSION: string,
        SUCCESSFUL_REMINDER_PERMISSION_REPROMPT: string,
        REPROMPT_REMINDER_PERMISSIONS: string,
        HELP: string,
        ERROR: string,
        STOP: string,
        ACCOUNT_LINK: string,
        UPDATED_TIMING: string,
        SUCCESSFUL_REMINDERS: string,
        REQUESTS_REMINDERS_SETUP: string,
        SETUP_TIMINGS: string,
        INVALID_BLOOD_GLUCOSE: string,
        INVALID_BLOOD_GLUCOSE_REPROMPT: string,
        BLOOD_GLUCOSE_SUCCESS: string,
        NO_GLUCOSE_RECORDS_FOUND: string,
        NO_RECORDS_FOUND: string,
        QUERY_SETUP: string,
        LOW_GLUCOSE: string,
        HIGH_GLUCOSE: string,
        PERMISSIONS_REQUIRED: string,
        DATE_PREPOSITION: string,
        CONCAT_WORD: string,
        REMINDER_NOT_CREATED: string,
    }

    abstract getMedicationReminderText(value: number, unit: string, medication: string, times: string[]): string;

    abstract getConfirmationDateText(requestName: string): string;

    abstract getSuggestedTimeText(mealCode: string): string

    abstract getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: string[]): string;

    abstract getServiceReminderText(action: string, times: string[]): string;

    abstract getServiceSsmlReminderText(action: string, times: string[]): string;

    abstract timingString(timing: string, preposition: string): string;

    abstract getStartDatePrompt(missingDate: CustomRequest): string;

    abstract makeTextForObservationDay(day: string, observationsValues: ObservationValue[]): string;

    abstract getTimingOrTime(observationValue: ObservationValue): string;

    abstract getHoursAndMinutes(date: DateTime): string;

    abstract getHoursAndMinutesFromString(time: string): string;

    abstract getTextForDay(date: string, timezone: string, datePreposition: string): string;

    abstract makeMedicationText(medicationData: MedicationData): string;

    abstract getNoRecordsTextForDay(date:string, userTimezone: string): string;

    abstract makeServiceText(serviceData: ServiceData): string;

    abstract buildListTimesOrTimings(timings: string[]): string;

    abstract timingToText(timing: string): string;

    abstract stringToTimingCode(value: string): string;

    abstract getMealSuggestion(timingCode: string): string;

    abstract codeToString(timingCode: string): string;

    abstract unitsToStrings(unit: string, isPlural: boolean): string;

    abstract durationUnitToString(unit: string): string;

    protected wrapSpeakMessage(message: string): string {
        return `<speak>${message}</speak>`
    }

    protected listItems(values: string[], concatWord: string): string {
        if (values.length === 1) {
            return values[0];
        }

        const joinComma = values.length > 2 ? ',' : ''
        return values
            .map((value, index) => index === values.length - 1 ? ` ${concatWord} ${value}.` : ` ${value}`)
            .join(joinComma)
    }
}

export type ObservationValue = {time: string, value: string, timing: string}
