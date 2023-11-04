import { DateTime } from "luxon";
import { Dosage, Timing } from "fhir/r5";

export type HttpResolvePromise<T> = (value: PromiseLike<T>) => void;

export type StartEndDateTime = { start: DateTime, end: DateTime };

export type HoursAndMinutes = { hour: number, minute: number };

export type ServiceData = { action: string, timings: string[] };

export type MedicationData = {
    medication: string,
    dose: { value: number, unit: string, time: string[] }[]
};

export type DoseValue = { value: number, unit: string };

export type CustomRequest = {
    type: string,
    id: string,
    name: string,
    duration: number,
    durationUnit: string,
    frequency: number,
    timing: Timing
};

export type ResourceReminderData = {
    text: string,
    ssml: string,
    rule: string[],
    start: DateTime,
    end: DateTime,
    locale: string
};

export type DosagesMedicationName = { dosages: Dosage[] | undefined, medicationName: string };

export type ParentServiceRequestReminderData = { action: string, startDate: DateTime, endDate: DateTime };

export type AlexaRequest = { userId: string, deviceId: string };

export type ProblemDetails = { status: number, [p: string]: any };
