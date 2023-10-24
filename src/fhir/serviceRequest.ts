import { Patient, ServiceRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { ServiceData } from "../types";
import {
    compareWhen,
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    tryParseDate
} from "./timing";
import { getExtension } from "./fhir";
import { DateTime } from "luxon";

export const SERVICE_REQUEST_START_DATE = 'http://diabetes-assistant.com/fhir/StructureDefinition/ServiceRequestStartDate';

export function getTextForServiceRequests(
    requests: ServiceRequest[],
    patient: Patient,
    timezone: string,
    localizedMessages: AbstractMessage
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
    const serviceData: ServiceData = {
        action: '',
        timings: [],
    };
    serviceData.action = (request.code?.concept?.coding && request.code.concept.coding[0].display) ?? '';
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
