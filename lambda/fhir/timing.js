const {DateTime} = require("luxon");
const {RRule} = require("rrule")
const fhir = require("./fhir");

const DEFAULT_TIMEZONE = 'UTC'
const TIMING_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/DosageStartDate';
const TIMING_NEEDS_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/NeedsStartDateFlag';

function getTimingStartDate(timing) {
    const startDateExtension = fhir.getExtension(timing, TIMING_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = fhirTiming.tryParseDate(startDateExtension.valueDateTime);
    if (date) {
        return date;
    }

    return undefined;
}

function timingNeedsStartDate(timing) {
    return fhir.getExtension(timing, TIMING_NEEDS_START_DATE);
}

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

const timingOrder = {
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
 * @param value {string}
 */
function relatedTimingCodeToString(value) {
    switch (value) {
        case timingEvent.ACD:
        case timingEvent.CD:
        case timingEvent.PCD:
            return timingEvent.CD;
        case timingEvent.ACM:
        case timingEvent.CM:
        case timingEvent.PCM:
            return timingEvent.CM;
        case timingEvent.ACV:
        case timingEvent.CV:
        case timingEvent.PCV:
            return timingEvent.CV;
        default:
            return timingEvent.C;
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

function getDatesFromTiming(timing, getStartDate, resource) {
    if (timing.repeat.boundsPeriod) {
        const startDate = DateTime.fromISO(timing.repeat.boundsPeriod.start);
        const endDate = DateTime.fromISO(timing.repeat.boundsPeriod.end)
            .plus({days: 1}); // Adds 1 to include the end date.
        return {
            start: startDate.toUTC(),
            end: endDate.toUTC()
        }
    } else if (timing.repeat.boundsDuration) {
        const start = getStartDate(resource);
        const startDate = DateTime.fromISO(start, {zone: 'utc'});
        const endDate = startDate.plus({days: timing.repeat.boundsDuration.value + 1})
        return {
            start: startDate.toUTC(),
            end: endDate.toUTC()
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
    if (timingOrder[a] && timingOrder[b]) {
        return timingOrder[a] - timingOrder[b];
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
    compareWhen,
    relatedTimingCodeToString,
    alexaTimingToFhirTiming,
    getDatesFromTiming,
    getTimesFromTimingWithFrequency,
    dayToRruleDay,
    tryParseDate,
    getTimingStartDate,
    timingNeedsStartDate
}
