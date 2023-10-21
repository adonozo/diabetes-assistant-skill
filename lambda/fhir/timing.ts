import { DateTime } from "luxon";
import { RRule, Weekday } from "rrule";
import { getExtension } from "./fhir";
import { Duration, Extension, Timing } from "fhir/r5";
import { StartEndDateTime } from "../types";
import { TimingEvent } from "../enums";

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
export function getTimingStartDate(timing: Timing, timezone: string = DEFAULT_TIMEZONE): DateTime | undefined {
    const startDateExtension = getExtension(timing, TIMING_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = tryParseDate(startDateExtension.valueString, timezone);
    if (date) {
        return date;
    }

    return undefined;
}

export function timingNeedsStartDate(timing: Timing | undefined): Extension | undefined {
    return getExtension(timing, TIMING_NEEDS_START_DATE);
}

export function timingNeedsStartTime(timing: Timing | undefined): Extension | undefined {
    return getExtension(timing, TIMING_NEEDS_START_TIME);
}

export function getTimingStartTime(timing: Timing): string | undefined {
    const startTimeExtension = getExtension(timing, TIMING_START_TIME);
    if (!startTimeExtension) {
        return undefined;
    }

    return startTimeExtension.valueString;
}

export const timingEvent = {
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

export const timingOrder: {[p: string]: number} = {
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
export function relatedTimingCodeToString(value: TimingEvent): TimingEvent {
    switch (value) {
        case TimingEvent.ACD:
        case TimingEvent.CD:
        case TimingEvent.PCD:
            return TimingEvent.CD;
        case TimingEvent.ACM:
        case TimingEvent.CM:
        case TimingEvent.PCM:
            return TimingEvent.CM;
        case TimingEvent.ACV:
        case TimingEvent.CV:
        case TimingEvent.PCV:
            return TimingEvent.CV;
        default:
            return TimingEvent.C;
    }
}

export function alexaTimingToFhirTiming(alexaTiming: string): TimingEvent {
    switch (alexaTiming) {
        case 'EV':
            return TimingEvent.EVE;
        case 'NI':
            return TimingEvent.NIGHT;
        case 'MO':
            return TimingEvent.MORN;
        case 'AF':
            return TimingEvent.AFT;
        default:
            return TimingEvent.EXACT;
    }
}

export function getDatesFromTiming(timing: Timing, timezone: string = DEFAULT_TIMEZONE): StartEndDateTime {
    if (timing.repeat?.boundsPeriod?.start && timing.repeat?.boundsPeriod?.end) {
        const startDate = DateTime.fromISO(timing.repeat.boundsPeriod.start, {zone: timezone});
        const endDate = DateTime.fromISO(timing.repeat.boundsPeriod.end, {zone: timezone})
            .plus({days: 1}); // End date inclusive
        return {
            start: startDate.toUTC(),
            end: endDate.toUTC()
        }
    } else if (timing.repeat?.boundsDuration) {
        const startDate = getTimingStartDate(timing, timezone)!;
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
export function getTimesFromTimingWithFrequency(frequency: number, startTime: string, timezone: string): string[] {
    const referenceDate = DateTime.utc().setZone(timezone).startOf('day');
    const localDate = DateTime.fromISO(referenceDate.toISODate() + `T${startTime}`, {zone: timezone});
    const hoursDifference = 24 / frequency;

    return [...Array(frequency).keys()]
        .map(index => localDate.plus({hours: index * hoursDifference}))
        .map(dateTime => dateTime.toISOTime({ suppressSeconds: true, includeOffset: false }))
        .filter((times): times is string => times == null);
}

export function dayToRruleDay(day: string): Weekday | undefined {
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
            return undefined;
    }
}

export const compareWhen = (a: string, b: string): number => {
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
export const tryParseDate = (date: string | undefined, timezone: string = DEFAULT_TIMEZONE): DateTime | undefined => {
    if (!date) {
        return undefined;
    }

    try {
        return DateTime.fromISO(date, {zone: timezone});
    } catch (e) {
        return undefined;
    }
}

export const addDurationToDate = (date: DateTime, boundsDuration: Duration): DateTime => {
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
