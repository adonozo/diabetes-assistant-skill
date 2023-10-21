import { DateTime, Settings } from "luxon";
import {
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    timingNeedsStartDate,
    timingNeedsStartTime
} from "../fhir/timing";
import { Dosage, Extension, FhirResource, MedicationRequest, ServiceRequest, Timing } from "fhir/r5";
import { HandlerInput } from "ask-sdk-core";
import { CustomRequest, HoursAndMinutes } from "../types";

export function requestsNeedStartDate(requests: FhirResource[]): CustomRequest | undefined {
    for (const request of requests) {
        if (request.resourceType === 'MedicationRequest') {
            const dosage = getDosageNeedingSetup(request);
            return dosage && buildCustomMedicationRequest(dosage, request.medication.reference?.display ?? '');
        } else if (request.resourceType === 'ServiceRequest' && serviceNeedsDateTimeSetup(request)) {
            return buildCustomServiceRequest(request);
        }
    }

    return undefined;
}

export async function getTimezoneOrDefault(handlerInput: HandlerInput): Promise<string> {
    const serviceClientFactory = handlerInput.serviceClientFactory;
    const deviceId = handlerInput.requestEnvelope.context.System.device?.deviceId ?? '';
    const upsServiceClient = serviceClientFactory!.getUpsServiceClient();
    let userTimeZone = await upsServiceClient.getSystemTimeZone(deviceId);
    if (!userTimeZone) {
        userTimeZone = Settings.defaultZone.name;
    }

    return userTimeZone;
}

export function utcDateFromLocalDate(date: string, timezone: string): string | null {
    const time = DateTime.now().setZone(timezone);
    const utcDate = DateTime.fromISO(`${date}T${time.toISOTime()}`, {zone: timezone}).toUTC();
    return utcDate.toISO();
}

export function utcTimeFromLocalTime(time: string, timezone: string): string | null {
    const date = DateTime.now().setZone(timezone);
    const utcDate = DateTime.fromISO(`${date.toISODate()}T${time}`, {zone: timezone});
    return utcDate.toUTC().toISO();
}

export function utcDateTimeFromLocalDateAndTime(date: string, time: string, timezone: string): string | null {
    const utcDate = DateTime.fromISO(`${date}T${time}`, {zone: timezone});
    return utcDate.toISO();
}

function buildCustomMedicationRequest(dosageInstruction: Dosage, medicationName: string): CustomRequest {
    return {
        type: 'MedicationRequest',
        id: dosageInstruction.id ?? '',
        name: medicationName,
        duration: dosageInstruction.timing!.repeat?.boundsDuration?.value ?? 0,
        durationUnit: dosageInstruction.timing!.repeat?.boundsDuration?.unit ?? '',
        frequency: dosageInstruction.timing!.repeat!.frequency ?? 0,
        timing: dosageInstruction.timing!
    };
}

function buildCustomServiceRequest(serviceRequest: ServiceRequest): CustomRequest {
    const timing = serviceRequest.occurrenceTiming!;
    return {
        type: 'ServiceRequest',
        id: serviceRequest.id!,
        name: (serviceRequest.code?.concept?.coding && serviceRequest.code?.concept?.coding[0].display) ?? '',
        duration: timing?.repeat!.boundsDuration?.value ?? 0,
        durationUnit: timing?.repeat!.boundsDuration?.unit ?? '',
        frequency: timing?.repeat!.frequency ?? 0,
        timing: timing
    }
}

export function timesStringArraysFromTiming(timing: Timing, timezone: string): string[] {
    let times;
    if (timing.repeat?.when && Array.isArray(timing.repeat.when) && timing.repeat.when.length > 0) {
        times = timing.repeat.when;
    } else if (timing.repeat?.timeOfDay && Array.isArray(timing.repeat.timeOfDay) && timing.repeat.timeOfDay.length > 0) {
        times = timing.repeat.timeOfDay;
    } else {
        const startTime = getTimingStartTime(timing);
        if (!startTime) {
            throw Error('Start time is not set up');
        }
        times = getTimesFromTimingWithFrequency(timing.repeat?.frequency ?? 0, startTime, timezone).sort();
    }

    return times;
}

export function getHoursAndMinutes(stringTime: string): HoursAndMinutes {
    const timeParts = stringTime.split(':');
    return {hour: +timeParts[0], minute: +timeParts[1]};
}

export function serviceNeedsDateTimeSetup(serviceRequest: ServiceRequest): Extension | undefined {
    return timingNeedsStartDate(serviceRequest.occurrenceTiming) || timingNeedsStartTime(serviceRequest.occurrenceTiming);
}

export function getDosageNeedingSetup(medicationRequest: MedicationRequest): Dosage | undefined {
    return medicationRequest.dosageInstruction!
        .find(dosage => timingNeedsStartDate(dosage.timing) || timingNeedsStartTime(dosage.timing));
}
