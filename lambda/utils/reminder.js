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
    patient,
    timezone,
    localizedMessages
}) {
    const medicationRequests = requests.filter(request => request.resourceType === "MedicationRequest");
    const serviceRequests = requests.filter(request => request.resourceType === "ServiceRequest");
    return [
        ...getRemindersForMedicationRequests({
            requests: medicationRequests,
            patient,
            timezone,
            localizedMessages
        }),
        ...getRemindersForServiceRequests({
            requests: serviceRequests,
            patient,
            timezone,
            localizedMessages
        })
    ]
}

function getRemindersForMedicationRequests({
   requests,
   patient,
   timezone,
   localizedMessages
}) {
    const currentDateTime = DateTime.utc();
    return requests.map(request => fhirMedicationRequest.getMedicationTextData({
        request,
        patient,
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
    patient,
    timezone,
    localizedMessages
}) {
    const currentDateTime = DateTime.utc();
    return requests.map(request => fhirServiceRequest.getServiceTextData({
        request,
        patient,
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
    timing,
    dateTime,
    start,
    end,
    frequency,
    dayOfWeek,
    localizedMessages
}){
    const text = localizedMessages.getMedicationReminderText(value, unit, medication, timing);
    const ssml = localizedMessages.getMedicationSsmlReminderText(value, unit, medication, timing);
    const rule = getRRule(dateTime, frequency, dayOfWeek);

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
    timing,
    dateTime,
    start,
    end,
    frequency,
    dayOfWeek,
    localizedMessages
}) {
    const text = localizedMessages.getServiceReminderText(action, timing);
    const ssml = localizedMessages.getServiceSsmlReminderText(action, timing);
    const rule = getRRule(dateTime, frequency, dayOfWeek);
    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start,
        end: end,
        locale: localizedMessages.locale
    };
}

function getRRule(dateTime, frequency, days) {
    let rule;
    if (frequency && frequency > 1) {
        rule = getFrequencyRrule(dateTime, frequency)
    } else if(days && Array.isArray(days) && days.length > 0) {
        rule = getWeeklyRrule(dateTime, days);
    } else {
        rule = [getDailyRrule(dateTime)];
    }

    return rule;
}

const getDailyRrule = (dateTime) => new RRule({
    freq: RRule.DAILY,
    interval: 1,
    byhour: dateTime.hour,
    byminute: dateTime.minute,
}).toString().replace('RRULE:', '');

const getFrequencyRrule = (dateTime, frequency) => {
    const rules = [];
    const hoursDifference = 24 / frequency;
    for (let i = 0; i < frequency; i++) {
        const frequencyDate = dateTime.plus({hours: i * hoursDifference});
        const rule = new RRule({
            freq: RRule.DAILY,
            interval: 1,
            byhour: frequencyDate.hour,
            byminute: frequencyDate.minute,
        }).toString().replace('RRULE:', '');
        rules.push(rule);
    }

    return rules;
}

const getWeeklyRrule = (dateTime, days) => days.map(day => fhirTiming.dayToRruleDay(day))
    .map(day =>
        new RRule({
            freq: RRule.WEEKLY,
            byweekday: day,
            byhour: dateTime.hour,
            byminute: dateTime.minute,
            interval: 1
        }).toString().replace('RRULE:', '')
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
