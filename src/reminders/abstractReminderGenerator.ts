import { DateTime } from "luxon";
import { ResourceReminderData } from "../types";
import { services } from "ask-sdk-model";
import ReminderRequest = services.reminderManagement.ReminderRequest;

export abstract class ReminderDataGenerator {
    private readonly currentDateTime: DateTime = DateTime.utc();
    private readonly currentDateTimeString: string;

    protected constructor(protected readonly timezone: string) {
        this.currentDateTimeString = this.currentDateTime.toISO({extendedZone: false, includeOffset: false}) ?? '';
    }

    generateData(): ReminderRequest[] {
        const remindersData = this.getReminderData();
        return remindersData
            .filter(data => data.end > this.currentDateTime)
            .map(data => this.mapToReminderRequest(data));
    }

    abstract getReminderData(): ResourceReminderData[];

    private mapToReminderRequest(reminderData: ResourceReminderData): ReminderRequest {
        const start = reminderData.start < this.currentDateTime
            ? this.currentDateTime
            : reminderData.start;
        const startDateTime = start.toISO({extendedZone: false, includeOffset: false})
            ?? this.currentDateTimeString;
        const endDateTime = reminderData.end.toISO({extendedZone: false, includeOffset: false})
            ?? this.currentDateTimeString;

        return this.createAbsoluteReminder(startDateTime, endDateTime, reminderData);
    }

    private createAbsoluteReminder(
        startDateTime: string,
        endDateTime: string,
        reminderData: ResourceReminderData
    ): ReminderRequest {
        return {
            trigger: {
                type: "SCHEDULED_ABSOLUTE",
                timeZoneId: this.timezone,
                recurrence: {
                    startDateTime: startDateTime,
                    endDateTime: endDateTime,
                    recurrenceRules: reminderData.rule
                }
            },
            alertInfo: {
                spokenInfo: {
                    content: [
                        {
                            locale: reminderData.locale,
                            text: reminderData.text,
                            ssml: reminderData.ssml
                        }
                    ]
                }
            },
            pushNotification: {
                status: "ENABLED"
            }
        };
    }
}
