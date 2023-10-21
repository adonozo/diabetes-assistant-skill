import { DateTime } from "luxon";
import { MedicationRequest, ServiceRequest, Timing } from "fhir/r5";
import { MessagesInterface } from "./strings/messages-interface";

export type HttpResolvePromise<T> = (value: PromiseLike<T>) => void;

export type StartEndDateTime = { start: DateTime, end: DateTime };

export type HoursAndMinutes = { hour: number, minute: number };

export type ServiceData = { action: string, timings: string[] };

export type MedicationData = {
    medication: string,
    dose: { value: number, unit: string, time: string[] }[]
};

export type DoseValue = { value: number, unit: string };

export type RequestNeedingTiming = {
    type: string,
    id: string,
    name: string,
    duration: number,
    frequency: number,
    timing: Timing
};

export type CustomRequest = {
    type: string,
    id: string,
    name: string,
    duration: number,
    durationUnit: string,
    frequency: number,
    timing: Timing
};

export type ServiceRequestInputData = {
    request: ServiceRequest,
    time: string,
    timezone: string,
    textProcessor: (processor: ServiceRequestTextProcessor) => ResourceReminderData,
    localizedMessages: MessagesInterface
}

export type MedicationRequestInputData = {
    request: MedicationRequest,
    time: string,
    timezone: string,
    textProcessor: (processor: MedicationRequestTextProcessor) => ResourceReminderData,
    localizedMessages: MessagesInterface
}

export type ServiceRequestTextProcessor = {
    time: string,
    action: string,
    times: string[],
    start: DateTime,
    end: DateTime,
    dayOfWeek: string[],
    localizedMessages: MessagesInterface
};

export type MedicationRequestTextProcessor = {
    time: string,
    value: number,
    unit: string,
    medication: string,
    times: string[],
    start: DateTime,
    end: DateTime,
    dayOfWeek: string[],
    localizedMessages: MessagesInterface
};

export type ResourceReminderData = {
    text: string,
    ssml: string,
    rule: string[],
    start: DateTime,
    end: DateTime,
    locale: string
};
