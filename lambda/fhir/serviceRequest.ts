import { Patient, ServiceRequest } from "fhir/r5";
import { MessagesInterface } from "../strings/messages-interface";
import { ResourceReminderData, ServiceData, ServiceRequestInputData } from "../types";
import {
    compareWhen,
    getDatesFromTiming,
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    tryParseDate
} from "./timing";
import { timesStringArraysFromTiming } from "../utils/time";
import { getExtension } from "./fhir";
import { DateTime } from "luxon";

export const SERVICE_REQUEST_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/ServiceRequestStartDate';

export function getTextForServiceRequests(
    requests: ServiceRequest[],
    patient: Patient,
    timezone: string,
    localizedMessages: MessagesInterface
): string {
    return requests.map(request => getServiceText(request, patient, timezone))
        .map(data => localizedMessages.makeServiceText(data))
        .join('. ');
}

export function getServiceText(
    request: ServiceRequest,
    patient: Patient,
    timezone: string
): ServiceData {
    const serviceData = {
        action: '',
        timings: [],
    };
    serviceData.action = request.code?.concept?.coding && request.code.concept.coding[0].display ?? '';
    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const repeat = request.occurrenceTiming.repeat;
    if (repeat?.when && Array.isArray(repeat.when)) {
        serviceData.timings = repeat.when.sort(compareWhen);
    } else if (repeat?.timeOfDay && Array.isArray(repeat.timeOfDay)) {
        serviceData.timings = repeat.timeOfDay.sort();
    } else {
        const startTime = getTimingStartTime(request.occurrenceTiming)!;
        serviceData.timings = getTimesFromTimingWithFrequency(repeat?.frequency ?? 0, startTime, timezone)
            .sort();
    }

    return serviceData;
}

export function getServiceTextData(
    {
        request,
        time,
        timezone,
        textProcessor,
        localizedMessages
    }: ServiceRequestInputData
): ResourceReminderData[] {
    const serviceData = [];
    const action = request.code?.concept?.coding && request.code.concept.coding[0].display ?? '';

    if (!request.occurrenceTiming) {
        return serviceData;
    }

    const {start, end} = getDatesFromTiming(request.occurrenceTiming, timezone);

    request.contained?.forEach((contained: ServiceRequest) => {
        const timing = contained.occurrenceTiming!;
        const times = timesStringArraysFromTiming(timing, timezone);

        const processedText = textProcessor({
            time,
            action: action,
            times: times,
            start: start,
            end: end,
            dayOfWeek: timing?.repeat?.dayOfWeek ?? [],
            localizedMessages: localizedMessages
        })
        serviceData.push(processedText)
    })

    return serviceData;
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
