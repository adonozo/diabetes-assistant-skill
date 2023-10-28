import { Dosage, MedicationRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { DosagesMedicationName, ResourceReminderData } from "../types";
import { getMedicationName } from "../fhir/medicationRequest";
import { DosageReminderGenerator } from "./dosageReminderGenerator";
import { ReminderDataGenerator } from "./abstractReminderGenerator";

export class MedicationRequestDataGenerator extends ReminderDataGenerator {
    constructor(
        private readonly requests: MedicationRequest[],
        private readonly reminderTime: string,
        timezone: string,
        private readonly messages: AbstractMessage
    ) {
        super(timezone);
    }

    getReminderData(): ResourceReminderData[] {
        return this.requests
            .map(request => this.mapToDosagesMedicationName(request))
            .map(dosages => this.mapToReminderData(dosages))
            .flat(1);
    }

    private mapToDosagesMedicationName(request: MedicationRequest): DosagesMedicationName {
        const medicationName = getMedicationName(request);
        return {
            dosages: request.dosageInstruction,
            medicationName: medicationName
        }
    }

    private mapToReminderData({dosages, medicationName}: DosagesMedicationName): ResourceReminderData[] {
        const reminderDataGenerator: (dosage: Dosage) => ResourceReminderData = dosage =>
            new DosageReminderGenerator(dosage, medicationName, this.timezone, this.reminderTime, this.messages)
                .generateData();

        return dosages?.map(dosage => reminderDataGenerator(dosage)) ?? [];
    }
}
