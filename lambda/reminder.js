const {RRule} = require("rrule")
const {DateTime} = require("luxon");
const strings = require("./strings");
const fhirTiming = require("./fhir/timing");

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
    trigger: {
        type: "SCHEDULED_ABSOLUTE",
        timeZoneId : "",
        scheduledTime: "",
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
            content: [{
                locale: "en-GB",
                text: "",
                ssml: "<speak></speak>"
            }]
        }
    },
    pushNotification: {
        status: "ENABLED"
    }
}

function createAbsoluteReminder({scheduledTime, startDateTime, endDateTime, recurrenceRules, text, ssml, timezone}) {
    const request = JSON.parse(JSON.stringify(absoluteReminderRequest));
    request.trigger.scheduledTime = scheduledTime;
    request.trigger.timeZoneId = timezone;
    request.trigger.recurrence.startDateTime = startDateTime;
    request.trigger.recurrence.endDateTime = endDateTime;
    request.trigger.recurrence.recurrenceRules = recurrenceRules;
    request.alertInfo.spokenInfo.content[0].text = text;
    request.alertInfo.spokenInfo.content[0].ssml = ssml;
    return request;
}

function getRemindersForRequests(requests, patient, timezone) {
    const medicationRequests = requests.filter(request => request.resourceType === "MedicationRequest");
    const serviceRequests = requests.filter(request => request.resourceType === "ServiceRequest");
    return [...getRemindersForMedicationRequests(medicationRequests, patient, timezone),
        ...getRemindersForServiceRequests(serviceRequests, patient, timezone)];
}

function getRemindersForMedicationRequests(requests, patient, timezone) {
    const currentDateTime = DateTime.utc().toISO();
    return requests.map(request => strings.getMedicationTextData(request, patient, timezone, getBaseMedicationReminder))
        .flat(1)
        .map(data => createAbsoluteReminder({
            scheduledTime: currentDateTime,
            startDateTime: data.start,
            endDateTime: data.end,
            text: data.text,
            ssml: data.ssml,
            recurrenceRules: data.rule,
            timezone: timezone
        }));
}

function getRemindersForServiceRequests(requests, patient, timezone) {
    const currentDateTime = DateTime.utc().toISO();
    return requests.map(request => strings.getServiceTextData(request, patient, timezone, getBaseServiceReminder))
        .flat(1)
        .map(data => createAbsoluteReminder({
            scheduledTime: currentDateTime,
            startDateTime: data.start,
            endDateTime: data.end,
            text: data.text,
            ssml: data.ssml,
            recurrenceRules: data.rule,
            timezone: timezone
        }));
}

function getBaseMedicationReminder({value, unit, medication, timing, dateTime, start, end, frequency, dayOfWeek}) {
    const text = strings.getMedicationReminderText(value, unit, medication, timing);
    const ssml = strings.getMedicationSsmlReminderText(value, unit, medication, timing);
    const rule = getRRule(dateTime, frequency, dayOfWeek);

    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start.toISO(),
        end: end.toISO()
    };
}

function getBaseServiceReminder({action, timing, dateTime, start, end, frequency, dayOfWeek}) {
    const text = strings.getServiceReminderText(action, timing);
    const ssml = strings.getServiceSsmlReminderText(action, timing);
    const rule = getRRule(dateTime, frequency, dayOfWeek);
    return {
        text: text,
        ssml: ssml,
        rule: rule,
        start: start.toISO(),
        end: end.toISO()
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

module.exports = {
    reminderDirective,
    getRemindersForMedicationRequests,
    getRemindersForRequests,
}