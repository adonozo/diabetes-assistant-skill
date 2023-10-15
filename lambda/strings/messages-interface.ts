import { DateTime } from "luxon";
import { CustomRequest, MedicationData, ServiceData } from "../types";

export interface MessagesInterface {
    responses: {
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

    getMedicationReminderText(value: number, unit: string, medication: string, times: string[]): string;

    getConfirmationDateText(requestName: string): string;

    getSuggestedTimeText(mealCode: string): string

    getMedicationSsmlReminderText(value: number, unit: string, medication: string, times: string[]): string;

    getServiceReminderText(action: string, times: string[]): string;

    getServiceSsmlReminderText(action: string, times: string[]): string;

    timingString(timing: string, preposition: string): string;

    getStartDatePrompt(missingDate: CustomRequest): string;

    makeTextForObservationDay(day: string, observationsValues: ObservationValue[]): string;

    getTimingOrTime(observationValue: ObservationValue): string;

    getHoursAndMinutes(date: DateTime): string;

    getHoursAndMinutesFromString(time: string): string;

    getTextForDay(date: string, timezone: string, datePreposition: string): string;

    makeMedicationText(medicationData: MedicationData): string;

    getNoRecordsTextForDay(date:string, userTimezone: string): string;

    makeServiceText(serviceData: ServiceData): string;

    buildListTimesOrTimings(timings: string[]): string;

    timingToText(timing: string): string;

    stringToTimingCode(value: string): string;

    getMealSuggestion(timingCode: string): string;

    codeToString(timingCode: string): string;

    unitsToStrings(unit: string, isPlural: boolean): string;

    durationUnitToString(unit: string): string;
}

export type ObservationValue = {time: string, value: string, timing: string}
