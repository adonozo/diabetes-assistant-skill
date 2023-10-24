import { DateTime } from "luxon";
import { Dosage } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { getDatesFromTiming } from "../fhir/timing";
import { getMedicationValues } from "../fhir/medicationRequest";
import { getHoursAndMinutes, timesStringArraysFromTiming } from "../utils/time";
import { ResourceReminderData } from "../types";
import { getRRule } from "../utils/reminder";

export class DosageReminderGenerator {
    private readonly value: number;
    private readonly unit: string;
    private readonly startDate: DateTime;
    private readonly endDate: DateTime;
    private readonly times: string[];

    constructor(
        private readonly dosage: Dosage,
        private readonly medicationName: string,
        timezone: string,
        private readonly reminderTime: string,
        private readonly messages: AbstractMessage
    ) {
        const {start, end} = getDatesFromTiming(dosage.timing!, timezone);
        this.startDate = start;
        this.endDate = end;

        const {value, unit} = getMedicationValues(dosage);
        this.value = value;
        this.unit = unit;

        this.times = timesStringArraysFromTiming(dosage.timing!, timezone);
    }

    generateData(): ResourceReminderData {
        const dayOfWeek = this.dosage.timing?.repeat?.dayOfWeek ?? [];
        const text = this.messages.getMedicationReminderText(this.value, this.unit, this.medicationName, this.times);
        const ssml = this.messages.getMedicationSsmlReminderText(this.value, this.unit, this.medicationName, this.times);
        const {hour, minute} = getHoursAndMinutes(this.reminderTime);
        const rule = getRRule(hour, minute, dayOfWeek);

        return {
            text: text,
            ssml: ssml,
            rule: rule,
            start: this.startDate,
            end: this.endDate,
            locale: this.messages.locale
        };
    }
}
