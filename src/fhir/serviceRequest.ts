import { ServiceRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { OccurrencesPerDay, Day } from "../types";
import { compareWhen, tryParseDate } from "./timing";
import { getExtension } from "./fhir";
import { DateTime, WeekdayNumbers } from "luxon";
import { dayNumberToShortCode } from "../utils/time";

export const SERVICE_REQUEST_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/ServiceRequestStartDate';

export function getTextForServiceRequests(
    requests: ServiceRequest[],
    startTime: DateTime,
    messages: AbstractMessage
): string {
    const occurrences = searchUntilFindOccurrences(requests, startTime);
    const today = dayNumberToShortCode(<WeekdayNumbers>startTime.weekday);
    const tomorrow = dayNumberToShortCode(<WeekdayNumbers>startTime.plus({day: 1}).weekday)

    return occurrences.length === 0
        ? messages.responses.NO_SERVICE_REQUESTS_FOUND
        : messages.buildServiceRequestText(occurrences, today, tomorrow);
}

export function searchUntilFindOccurrences(serviceRequests: ServiceRequest[], startDate: DateTime): OccurrencesPerDay[] {
    const immediateOccurrences = getImmediateOccurrencesForDate(serviceRequests, startDate);
    if (immediateOccurrences.length > 1) {
        return immediateOccurrences;
    }

    for (let i = 2; i < 7; i++) {
        const day = dayNumberToShortCode(<WeekdayNumbers>startDate.plus({day: i}).weekday);
        const dayOccurrences = searchOccurrencesOnDay(serviceRequests, day);
        if (dayOccurrences.length > 1) {
            return [{day: day, when: dayOccurrences}];
        }
    }

    return [];
}

function getImmediateOccurrencesForDate(serviceRequests: ServiceRequest[], startDay: DateTime) {
    const today = dayNumberToShortCode(<WeekdayNumbers>startDay.weekday);
    const tomorrow = dayNumberToShortCode(<WeekdayNumbers>startDay.plus({day: 1}).weekday);

    const todayOccurrences = searchOccurrencesOnDay(serviceRequests, today);
    const tomorrowOccurrences = searchOccurrencesOnDay(serviceRequests, tomorrow);
    const immediateOccurrences: OccurrencesPerDay[] = [];

    if (todayOccurrences.length > 0) {
        immediateOccurrences.push({day: today, when: todayOccurrences});
    }

    if (tomorrowOccurrences.length > 0) {
        immediateOccurrences.push({day: tomorrow, when: tomorrowOccurrences})
    }

    return immediateOccurrences;
}

function searchOccurrencesOnDay(serviceRequests: ServiceRequest[], day: Day): string[] {
    const occurrences = serviceRequests
        .map(request => serviceRequestMatchesOnDay(day, request))
        .flat(1);

    return Array.from(new Set<string>(occurrences)).sort(compareWhen); // remove duplicates
}

function serviceRequestMatchesOnDay(day: Day, serviceRequest: ServiceRequest): string[] {
    if (!serviceRequest.contained) {
        return [];
    }

    const allOccurrences = serviceRequest.contained
        .filter((request): request is ServiceRequest => request.resourceType === 'ServiceRequest')
        .filter(request => {
            const repeat = request.occurrenceTiming?.repeat;
            return repeat != undefined && repeat.dayOfWeek?.includes(day) && (repeat.when?.length ?? 0) > 0;
        })
        .map(request => request.occurrenceTiming?.repeat?.when ?? [])
        .flat();
    const occurrences = new Set<string>(allOccurrences);

    return Array.from(occurrences);
}

export function getServiceRequestStartDate(serviceRequest: ServiceRequest): DateTime | undefined {
    const startDateExtension = getExtension(serviceRequest, SERVICE_REQUEST_START_DATE);
    if (!startDateExtension) {
        return undefined;
    }

    const date = tryParseDate(startDateExtension.valueDateTime);
    if (date) {
        return date;
    }

    return undefined;
}
