const {DateTime} = require("luxon");
const {RRule} = require("rrule")

const DEFAULT_TIMEZONE = 'UTC'

const timingEvent = {
    C: 'C',
    CD: 'CD',
    PC: 'PC',
    CV: 'CV',
    CM: 'CM',
    AC: 'AC',
    ACM: 'ACM',
    ACD: 'ACD',
    ACV: 'ACV',
    PCM: 'PCM',
    PCD: 'PCD',
    PCV: 'PCV',
    MORN: 'MORN',
    AFT: 'AFT',
    EVE: 'EVE',
    NIGHT: 'NIGHT',
    // Custom definitions
    EXACT: 'EXACT',
    ALL_DAY: 'ALL_DAY'
}

const numericTiming = {
    MORN: 1,
    ACM: 2,
    CM: 3,
    PCM: 4,
    ACD: 5,
    CD: 6,
    PCD: 7,
    AFT: 8,
    EVE: 9,
    ACV: 10,
    CV: 11,
    PCV: 12,
    AC: 13,
    C: 14,
    PC: 15,
    NIGHT: 16,
    // Custom definitions
    EXACT: 20,
    ALL_DAY: 20
}

/**
 *
 * @param value {string}
 */
function relatedTimingCodeToString(value) {
    switch (value) {
        case "ACD":
        case "CD":
        case "PCD":
            return 'lunch';
        case "ACM":
        case "CM":
        case "PCM":
            return 'breakfast';
        case "ACV":
        case "CV":
        case "PCV":
            return 'dinner';
        default:
            return 'a meal';
    }
}

function stringToTimingCode(value) {
    switch (value) {
        case 'lunch':
            return 'CD';
        case "before lunch":
            return 'ACD';
        case "after lunch":
            return 'PCD'
        case 'breakfast':
            return 'CM';
        case 'before breakfast':
            return 'ACM';
        case 'after breakfast':
            return 'PCM';
        case 'dinner':
            return 'CV'
        case 'before dinner':
            return 'ACV';
        case 'after dinner':
            return 'PCV';
        case 'before meal':
            return 'AC'
        case 'after meal':
            return 'PC'
        default:
            return 'EXACT'
    }
}

function timingCodeToString(value) {
    switch (value) {
        case 'CD':
            return 'at lunch';
        case "ACD":
            return 'before lunch';
        case "PCD":
            return 'after lunch';
        case 'CM':
            return 'at breakfast';
        case 'ACM':
            return 'before breakfast';
        case 'PCM':
            return 'after breakfast';
        case 'CV':
            return 'at dinner';
        case 'ACV':
            return 'before dinner';
        case 'PCV':
            return 'after dinner';
        case 'AC':
            return 'before meal';
        case 'PC':
            return 'after meal';
        default:
            return ''
    }
}

function alexaTimingToFhirTiming(alexaTiming) {
    switch (alexaTiming) {
        case 'EV':
            return timingEvent.EVE;
        case 'NI':
            return timingEvent.NIGHT;
        case 'MO':
            return timingEvent.MORN;
        case 'AF':
            return timingEvent.AFT;
        default:
            return timingEvent.EXACT;
    }
}

function getDatesFromTiming(timing, patient, resourceId) {
    if (timing.repeat.boundsPeriod) {
        const startDate = DateTime.fromISO(timing.repeat.boundsPeriod.start);
        const endDate = DateTime.fromISO(timing.repeat.boundsPeriod.end)
            .plus({days: 1}); // Adds 1 to include the end date.
        return {
            start: startDate,
            end: endDate
        }
    } else if (timing.repeat.boundsDuration) {
        const start = patient.resourceStartDate[resourceId];
        const startDate = DateTime.fromISO(start, {zone: 'utc'});
        const endDate = startDate.plus({days: timing.repeat.boundsDuration.value + 1})
        return {
            start: startDate,
            end: endDate
        }
    }

    return {
        start: DateTime.utc(),
        end: DateTime.utc()
    }
}

/**
 * @param frequency {number}
 * @param date {string}
 * @param timezone {string}
 * @return {[]}
 */
function getTimesFromTimingWithFrequency(frequency, date, timezone) {
    const localDate = DateTime.fromISO(date).setZone(timezone);
    const hoursDifference = 24 / frequency;
    const times = [];
    for (let i = 0; i < frequency; i++) {
        times.push(localDate.plus({hours: i * hoursDifference}).toISOTime({ suppressSeconds: true, includeOffset: false }));
    }

    return times;
}

function dayToRruleDay(day) {
    switch (day.toLowerCase()) {
        case 'mon':
            return RRule.MO;
        case 'tue':
            return RRule.TU;
        case 'wed':
            return RRule.WE;
        case 'thu':
            return RRule.TH;
        case 'fri':
            return RRule.FR;
        case 'sat':
            return RRule.SA;
        case 'sun':
            return RRule.SU;
        default:
            return '';
    }
}

const compareWhen = (a, b) => {
    if (numericTiming[a] && numericTiming[b]) {
        return numericTiming[a] - numericTiming[b];
    }

    return 0;
}

const tryParseDate = (datetime) => {
    try {
        return DateTime.fromISO(datetime, {zone: DEFAULT_TIMEZONE});
    } catch (e) {
        return undefined;
    }
}

module.exports = {
    timingEvent,
    numericTiming,
    compareWhen,
    relatedTimingCodeToString,
    stringToTimingCode,
    alexaTimingToFhirTiming,
    timingCodeToString,
    getDatesFromTiming,
    getTimesFromTimingWithFrequency,
    dayToRruleDay,
    tryParseDate,
}
