import { DateTime, Settings, WeekdayNumbers } from "luxon";
import {
    compareWhen,
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    timingNeedsStartDate,
    timingNeedsStartTime
} from "../fhir/timing";
import { Dosage, FhirResource, MedicationRequest, ServiceRequest, Timing } from "fhir/r5";
import { HandlerInput } from "ask-sdk-core";
import { CustomRequest, Day, HoursAndMinutes } from "../types";
import { getMedicationName } from "../fhir/medicationRequest";

export function requestsNeedStartDate(requests: FhirResource[] | undefined): CustomRequest | undefined {
    for (const request of requests ?? []) {
        if (request.resourceType === 'MedicationRequest') {
            const dosage = getDosageNeedingSetup(request);
            const medicationName = getMedicationName(request);
            return dosage && buildCustomMedicationRequest(dosage, medicationName);
        } else if (request.resourceType === 'ServiceRequest' && serviceNeedsDateSetup(request)) {
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
        name: '',
        duration: timing?.repeat!.boundsDuration?.value ?? 0,
        durationUnit: timing?.repeat!.boundsDuration?.unit ?? '',
        frequency: timing?.repeat!.frequency ?? 0,
        timing: timing
    }
}

export function timesStringArraysFromTiming(timing: Timing, timezone: string): string[] {
    let times;
    if (timing.repeat?.when && Array.isArray(timing.repeat.when) && timing.repeat.when.length > 0) {
        times = timing.repeat.when.sort(compareWhen);
    } else if (timing.repeat?.timeOfDay && Array.isArray(timing.repeat.timeOfDay) && timing.repeat.timeOfDay.length > 0) {
        times = timing.repeat.timeOfDay.sort();
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

export function serviceNeedsDateSetup(serviceRequest: ServiceRequest): boolean {
    return timingNeedsStartDate(serviceRequest.occurrenceTiming);
}

export function getDosageNeedingSetup(medicationRequest: MedicationRequest): Dosage | undefined {
    return medicationRequest.dosageInstruction!
        .find(dosage => timingNeedsStartDate(dosage.timing) || timingNeedsStartTime(dosage.timing));
}

export function dayNumberToShortCode(day: WeekdayNumbers): Day {
    switch (day) {
        case 1:
            return 'mon';
        case 2:
            return 'tue';
        case 3:
            return 'wed';
        case 4:
            return 'thu';
        case 5:
            return 'fri';
        case 6:
            return 'sat';
        case 7:
            return 'sun';
    }
}
