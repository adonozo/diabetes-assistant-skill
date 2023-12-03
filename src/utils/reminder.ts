import { RRule } from "rrule";
import { Directive } from "ask-sdk-model";
import { dayToRruleDay } from "../fhir/timing";

export const reminderDirective: Directive = {
    type: "Connections.SendRequest",
    name: "AskFor",
    payload: {
        "@type": "AskForPermissionsConsentRequest",
        "@version": "2",
        "permissionScopes": [
            {
                "permissionScope": "alexa::alerts:reminders:skill:readwrite",
                "consentLevel": "ACCOUNT"
            }
        ]
    },
    token: ""
}

// Dates in ISO 8601 format: 2019-09-22T19:00:00.000
/**
 * Gets a RRule at the specified time: {hour:minute}
 * @param hour The reminder hour
 * @param minute The reminder minute
 * @param days The days when the reminder is valid. If empty, reminders are for all week
 * @returns {*[]}
 */
export const getRRule = (hour: number, minute: number, days: string[] = []): string[] => days && Array.isArray(days) && days.length > 0 ?
    specificDaysRrule(hour, minute, days)
    : [everyDayRrule(hour, minute)];

const everyDayRrule = (hour: number, minute: number): string => new RRule({
    freq: RRule.DAILY,
    interval: 1,
    byhour: hour,
    byminute: minute,
}).toString().replace('RRULE:', '');

const specificDaysRrule = (hour: number, minute: number, days: string[]): string[] => days
    .map(day => dayToRruleDay(day))
    .map(day =>
        new RRule({
                freq: RRule.WEEKLY,
                byweekday: day,
                byhour: hour,
                byminute: minute,
                interval: 1
            }
        ).toString().replace('RRULE:', '')
    );
