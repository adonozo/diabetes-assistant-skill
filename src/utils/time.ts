import { Settings, WeekdayNumbers } from "luxon";
import {
    compareWhen,
    getTimesFromTimingWithFrequency,
    getTimingStartTime,
    timingNeedsStartDate,
    timingNeedsStartTime
} from "../fhir/timing";
import { Dosage, FhirResource, MedicationRequest, ServiceRequest, Timing } from "fhir/r5";
import { HandlerInput } from "ask-sdk-core";
import { MissingDateSetupRequest, Day, HoursAndMinutes } from "../types";
import { getMedicationName } from "../fhir/medicationRequest";

export function requestsNeedStartDate(requests: FhirResource[] | undefined): MissingDateSetupRequest | undefined {
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

function buildCustomMedicationRequest(dosageInstruction: Dosage, medicationName: string): MissingDateSetupRequest {
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

function buildCustomServiceRequest(serviceRequest: ServiceRequest): MissingDateSetupRequest {
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

export function digitWithLeadingZero(number: number): string {
    return number < 10 ? `0${number}` : number.toString();
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
