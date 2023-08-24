const {DateTime} = require("luxon");
const {RRule} = require("rrule")
const fhir = require("./fhir");

const DEFAULT_TIMEZONE = 'UTC'
const TIMING_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/TimingStartDate';
const TIMING_NEEDS_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/NeedsStartDateFlag';
const TIMING_START_TIME = 'http://diabetes-assistant.com/fhir/StructureDefinition/TimingStartTime';
const TIMING_NEEDS_START_TIME = 'http://diabetes-assistant.com/fhir/StructureDefinition/NeedsStartTimeFlag';

/**
 *
 * @param timing
 * @param timezone
 * @returns {undefined|DateTime}
 */
function getTimingStartDate(timing, timezone = DEFAULT_TIMEZONE) {
    const startDateExtension = fhir.getExtension(timing, TIMING_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = tryParseDate(startDateExtension.valueString, timezone);
    if (date) {
        return date;
    }

    return undefined;
}

function timingNeedsStartDate(timing) {
    return fhir.getExtension(timing, TIMING_NEEDS_START_DATE);
}

function timingNeedsStartTime(timing) {
    return fhir.getExtension(timing, TIMING_NEEDS_START_TIME);
}

function getTimingStartTime(timing) {
    const startTimeExtension = fhir.getExtension(timing, TIMING_START_TIME);
    if (!startTimeExtension) {
        return undefined;
    }

    return startTimeExtension.valueString;
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

function getDatesFromTiming(timing, timezone = DEFAULT_TIMEZONE) {
    if (timing.repeat.boundsPeriod) {
        const startDate = DateTime.fromISO(timing.repeat.boundsPeriod.start, {zone: timezone});
        const endDate = DateTime.fromISO(timing.repeat.boundsPeriod.end, {zone: timezone})
            .plus({days: 1}); // End date inclusive
        return {
            start: startDate.toUTC(),
            end: endDate.toUTC()
        }
    } else if (timing.repeat.boundsDuration) {
        const startDate = getTimingStartDate(timing, timezone);
        const endDate = addDurationToDate(startDate, timing.repeat.boundsDuration)
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
 * Gets an array of times within a day given a frequency and start time
 * @param frequency {number}
 * @param startTime {string}
 * @param timezone {string}
 * @return {[]}
 */
function getTimesFromTimingWithFrequency(frequency, startTime, timezone) {
    const referenceDate = DateTime.utc().setZone(timezone).startOf('day');
    const localDate = DateTime.fromISO(referenceDate.toISODate() + `T${startTime}`, {zone: timezone});
    const hoursDifference = 24 / frequency;

    return [...Array(frequency).keys()]
        .map(index => localDate.plus({hours: index * hoursDifference}))
        .map(dateTime => dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }));
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

/**
 *
 * @param date
 * @param timezone
 * @returns {undefined|DateTime}
 */
const tryParseDate = (date, timezone = DEFAULT_TIMEZONE) => {
    try {
        return DateTime.fromISO(date, {zone: timezone});
    } catch (e) {
        return undefined;
    }
}

const addDurationToDate = (date, boundsDuration) => {
    switch (boundsDuration.unit) {
        case 'd':
            return date.plus({days: boundsDuration.value}).endOf('day');
        case 'wk':
            return date.plus({weeks: boundsDuration.value}).endOf('day');
        case 'mo':
            return date.plus({months: boundsDuration.value}).endOf('day');
        default:
            return date;
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
    timingNeedsStartDate,
    getTimingStartTime,
    timingNeedsStartTime
}
