const {RRule} = require("rrule")
const {DateTime} = require("luxon");
const fhirTiming = require("./../fhir/timing");
const fhirMedicationRequest = require("./../fhir/medicationRequest");
const fhirServiceRequest = require("./../fhir/serviceRequest");

const reminderDirective = {
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
const absoluteReminderRequest = {
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

function getRemindersForRequests({
    requests,
    timezone,
    localizedMessages
}) {
    const medicationRequests = requests.filter(request => request.resourceType === "MedicationRequest");
    const serviceRequests = requests.filter(request => request.resourceType === "ServiceRequest");
    return [
        ...getRemindersForMedicationRequests({
            requests: medicationRequests,
            timezone,
            localizedMessages
        }),
        ...getRemindersForServiceRequests({
            requests: serviceRequests,
            timezone,
            localizedMessages
        })
    ]
}

function getRemindersForMedicationRequests({
   requests,
   timezone,
   localizedMessages
}) {
    const currentDateTime = DateTime.utc();
    return requests
        .map(request => fhirMedicationRequest.getMedicationTextData({
            request,
            timezone,
            textProcessor: getBaseMedicationReminder,
            localizedMessages
        }))
        .flat(1)
        .filter(data => data.end > currentDateTime)
        .map(data => {
            data.start = data.start < currentDateTime ? currentDateTime : data.start;
            data.start = data.start.toISO({extendedZone: false, includeOffset: false});
            data.end = data.end.toISO({extendedZone: false, includeOffset: false});
            return data;
        })
        .map(data => createAbsoluteReminder({
            startDateTime: data.start,
            endDateTime: data.end,
            text: data.text,
            ssml: data.ssml,
            recurrenceRules: data.rule,
            timezone: timezone,
            locale: data.locale
        }));
}

function getRemindersForServiceRequests({
    requests,
    timezone,
    localizedMessages
}) {
    const currentDateTime = DateTime.utc();
    return requests
        .map(request => fhirServiceRequest.getServiceTextData({
            request,
            timezone,
            textProcessor: getBaseServiceReminder,
            localizedMessages
        }))
        .flat(1)
        .filter(data => data.end > currentDateTime)
        .map(data => {
            data.start = data.start < currentDateTime ? currentDateTime : data.start;
            data.start = data.start.toISO({extendedZone: false, includeOffset: false});
            data.end = data.end.toISO({extendedZone: false, includeOffset: false});
            return data;
        })
        .map(data => createAbsoluteReminder({
            startDateTime: data.start,
            endDateTime: data.end,
            text: data.text,
            ssml: data.ssml,
            recurrenceRules: data.rule,
            timezone: timezone,
            locale: data.locale
        }));
}

function getBaseMedicationReminder({
    value,
    unit,
    medication,
    times,
    start,
    end,
    dayOfWeek,
    localizedMessages
}){
    const text = localizedMessages.getMedicationReminderText(value, unit, medication, times);
    const ssml = localizedMessages.getMedicationSsmlReminderText(value, unit, medication, times);
    const rule = getRRule(hour, minute, dayOfWeek); // TODO get hour & minute

    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start,
        end: end,
        locale: localizedMessages.locale
    };
}

function getBaseServiceReminder({
    action,
    times,
    start,
    end,
    dayOfWeek,
    localizedMessages
}) {
    const text = localizedMessages.getServiceReminderText(action, times);
    const ssml = localizedMessages.getServiceSsmlReminderText(action, times);
    const rule = getRRule(hour, minute, dayOfWeek); // TODO get hour & minute
    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start,
        end: end,
        locale: localizedMessages.locale
    };
}

// TODO hour and minute must be set from the dialog
/**
 * Gets a RRule at the specified time: {hour:minute}
 * @param hour The reminder hour
 * @param minute The reminder minute
 * @param days The days when the reminder is valid. If empty, reminders are for all week
 * @returns {*[]}
 */
const getRRule = (hour, minute, days = []) => days && Array.isArray(days) && days.length > 0 ?
    specificDaysRrule(hour, minute, days)
    : [everyDayRrule(hour, minute)]

const everyDayRrule = (hour, minute) => new RRule({
    freq: RRule.DAILY,
    interval: 1,
    byhour: hour,
    byminute: minute,
}).toString().replace('RRULE:', '');

const specificDaysRrule = (hour, minute, days) => days.map(day => fhirTiming.dayToRruleDay(day))
    .map(day => new RRule({
            freq: RRule.WEEKLY,
            byweekday: day,
            byhour: hour,
            byminute: minute,
            interval: 1
        })
        .toString().replace('RRULE:', '')
    );

function createAbsoluteReminder({
    scheduledTime,
    startDateTime,
    endDateTime,
    recurrenceRules,
    text,
    ssml,
    timezone,
    locale
}) {
    const request = JSON.parse(JSON.stringify(absoluteReminderRequest));
    request.requestTime = scheduledTime;
    request.trigger.timeZoneId = timezone;
    request.trigger.recurrence.startDateTime = startDateTime;
    request.trigger.recurrence.endDateTime = endDateTime;
    request.trigger.recurrence.recurrenceRules = recurrenceRules;
    request.alertInfo.spokenInfo.content[0].text = text;
    request.alertInfo.spokenInfo.content[0].ssml = ssml;
    request.alertInfo.spokenInfo.content[0].locale = locale;
    return request;
}

module.exports = {
    reminderDirective,
    getRemindersForRequests,
}
