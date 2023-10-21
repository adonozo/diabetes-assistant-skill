import { DateTime } from "luxon";
import { RRule } from "rrule";
import { Directive, services } from "ask-sdk-model";
import ReminderRequest = services.reminderManagement.ReminderRequest;
import { dayToRruleDay } from "../fhir/timing";
import { getHoursAndMinutes } from "./time";
import {
    MedicationRequestTextProcessor,
    ResourceReminderData,
    ServiceRequestTextProcessor
} from "../types";
import { getServiceTextData } from "../fhir/serviceRequest";
import { DomainResource, MedicationRequest, ServiceRequest } from "fhir/r5";
import { MessagesInterface } from "../strings/messages-interface";
import { getMedicationTextData } from "../fhir/medicationRequest";

export const reminderDirective: Directive = {
    type: "Connections.SendRequest",
    name: "AskFor",
    payload: {
        "@type": "AskForPermissionsConsentRequest",
        "@version": "1",
        "permissionScope": "alexa::alerts:reminders:skill:readwrite"
    },
    token: ""
}

// Dates in ISO 8601 format: 2019-09-22T19:00:00.000
const absoluteReminderRequest: ReminderRequest = {
    requestTime: "",
    trigger: {
        type: "SCHEDULED_ABSOLUTE",
        timeZoneId : "",
        recurrence: {
            startDateTime: "",
            endDateTime: "",
            recurrenceRules: [
                // "FREQ=DAILY;BYHOUR=17;BYMINUTE=15;BYSECOND=0;INTERVAL=1;",
                // "FREQ=MONTHLY;BYMONTHDAY=5;BYHOUR=10;INTERVAL=1"
            ]
        }
    },
    alertInfo: {
        spokenInfo: {
            content: [
                {
                    locale: "",
                    text: "",
                    ssml: "<speak></speak>"
                }
            ]
        }
    },
    pushNotification: {
        status: "ENABLED"
    }
}

export function getRemindersForRequests(
    {
        requests,
        time,
        timezone,
        localizedMessages
    }: ReminderForResourceArgs
): ReminderRequest[] {
    const medicationRequests = requests
        .filter(request => request.resourceType === "MedicationRequest")
        .map(request => request as MedicationRequest);
    const serviceRequests = requests
        .filter(request => request.resourceType === "ServiceRequest")
        .map(request => request as ServiceRequest);

    return [
        ...getRemindersForMedicationRequests({
            requests: medicationRequests,
            time,
            timezone,
            localizedMessages
        }),
        ...getRemindersForServiceRequests({
            requests: serviceRequests,
            time,
            timezone,
            localizedMessages
        })
    ]
}

function getRemindersForMedicationRequests(
    {
        requests,
        time,
        timezone,
        localizedMessages
    }: ReminderForMedicationRequestArgs
): ReminderRequest[] {
    const currentDateTime = DateTime.utc();
    const currentDateTimeString: string = currentDateTime.toISO({extendedZone: false, includeOffset: false}) ?? '';

    return requests
        .map(request => getMedicationTextData({
            request,
            time,
            timezone,
            textProcessor: getBaseMedicationReminder,
            localizedMessages
        }))
        .flat(1)
        .filter(data => data.end > currentDateTime)
        .map(data => {
            data.start = data.start < currentDateTime ? currentDateTime : data.start;
            const startDateTime = data.start.toISO({extendedZone: false, includeOffset: false});
            const endDateTime = data.end.toISO({extendedZone: false, includeOffset: false});
            return {...data, startDateTime, endDateTime};
        })
        .map(data => createAbsoluteReminder({
            startDateTime: data.startDateTime ? data.startDateTime : currentDateTimeString,
            endDateTime: data.endDateTime ? data.endDateTime : currentDateTimeString,
            text: data.text,
            ssml: data.ssml,
            recurrenceRules: data.rule,
            timezone: timezone,
            locale: data.locale
        }));
}

function getRemindersForServiceRequests(
    {
        requests,
        time,
        timezone,
        localizedMessages
    }: ReminderForServiceRequestArgs
): ReminderRequest[] {
    const currentDateTime = DateTime.utc();
    const currentDateTimeString: string = currentDateTime.toISO({extendedZone: false, includeOffset: false}) ?? '';

    return requests
        .map(request => getServiceTextData({
            request,
            time,
            timezone,
            textProcessor: getBaseServiceReminder,
            localizedMessages
        }))
        .flat(1)
        .filter(data => data.end > currentDateTime)
        .map(data => {
            data.start = data.start < currentDateTime ? currentDateTime : data.start;
            const startDateTime = data.start.toISO({extendedZone: false, includeOffset: false});
            const endDateTime = data.end.toISO({extendedZone: false, includeOffset: false});
            return {...data, startDateTime, endDateTime};
        })
        .map(data => createAbsoluteReminder({
            startDateTime: data.startDateTime ? data.startDateTime : currentDateTimeString,
            endDateTime: data.endDateTime ? data.endDateTime : currentDateTimeString,
            text: 'data.text',
            ssml: 'data.ssml',
            recurrenceRules: ['data.rule'],
            timezone: 'timezone',
            locale: 'data.locale'
        }));
}

function getBaseMedicationReminder(
    {
        time,
        value,
        unit,
        medication,
        times,
        start,
        end,
        dayOfWeek,
        localizedMessages
    }: MedicationRequestTextProcessor
): ResourceReminderData {
    const text = localizedMessages.getMedicationReminderText(value, unit, medication, times);
    const ssml = localizedMessages.getMedicationSsmlReminderText(value, unit, medication, times);
    const {hour, minute} = getHoursAndMinutes(time);
    const rule = getRRule(hour, minute, dayOfWeek);

    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start,
        end: end,
        locale: localizedMessages.locale
    };
}

function getBaseServiceReminder(
    {
        time,
        action,
        times,
        start,
        end,
        dayOfWeek,
        localizedMessages
    }: ServiceRequestTextProcessor
): ResourceReminderData {
    const text = localizedMessages.getServiceReminderText(action, times);
    const ssml = localizedMessages.getServiceSsmlReminderText(action, times);
    const {hour, minute} = getHoursAndMinutes(time);
    const rule = getRRule(hour, minute, dayOfWeek);
    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start,
        end: end,
        locale: localizedMessages.locale
    };
}

/**
 * Gets a RRule at the specified time: {hour:minute}
 * @param hour The reminder hour
 * @param minute The reminder minute
 * @param days The days when the reminder is valid. If empty, reminders are for all week
 * @returns {*[]}
 */
const getRRule = (hour: number, minute: number, days: string[] = []): string[] => days && Array.isArray(days) && days.length > 0 ?
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

function createAbsoluteReminder(
    {
        startDateTime,
        endDateTime,
        recurrenceRules,
        text,
        ssml,
        timezone,
        locale
    }: AbsoluteReminderArgs
): ReminderRequest {
    const request: ReminderRequest = JSON.parse(JSON.stringify(absoluteReminderRequest));
    request.trigger!.timeZoneId = timezone;
    request.trigger!.recurrence!.startDateTime = startDateTime;
    request.trigger!.recurrence!.endDateTime = endDateTime;
    request.trigger!.recurrence!.recurrenceRules = recurrenceRules;
    request.alertInfo!.spokenInfo!.content[0].text = text;
    request.alertInfo!.spokenInfo!.content[0].ssml = ssml;
    request.alertInfo!.spokenInfo!.content[0].locale = locale;
    return request;
}

type ReminderForResourceArgs = {
    requests: DomainResource[],
    time: string,
    timezone: string,
    localizedMessages: MessagesInterface
};

type ReminderForServiceRequestArgs = {
    requests: ServiceRequest[],
    time: string,
    timezone: string,
    localizedMessages: MessagesInterface
};

type ReminderForMedicationRequestArgs = {
    requests: MedicationRequest[],
    time: string,
    timezone: string,
    localizedMessages: MessagesInterface
};

type AbsoluteReminderArgs = {
    startDateTime: string,
    endDateTime: string,
    recurrenceRules: string[],
    text: string,
    ssml: string,
    timezone: string,
    locale: string
};
