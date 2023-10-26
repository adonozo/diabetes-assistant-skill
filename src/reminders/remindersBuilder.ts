import { DomainResource, MedicationRequest, ServiceRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { ServiceRequestDataGenerator } from "./serviceRequestDataGenerator";
import { MedicationRequestDataGenerator } from "./medicationRequestDataGenerator";
import { services } from "ask-sdk-model";
import ReminderRequest = services.reminderManagement.ReminderRequest;

export class RemindersBuilder {
    private readonly medicationRequests: MedicationRequest[];
    private readonly serviceRequests: ServiceRequest[];

    constructor(
        domainResources: DomainResource[],
        private readonly reminderTime: string,
        private readonly timezone: string,
        private readonly messages: AbstractMessage
    ) {
        this.medicationRequests = domainResources
            .filter((resource): resource is MedicationRequest => resource.resourceType === 'MedicationRequest');
        this.serviceRequests = domainResources
            .filter((resource): resource is ServiceRequest => resource.resourceType === 'ServiceRequest');
    }

    build(): ReminderRequest[] {
        const medicationRequestsReminders = new MedicationRequestDataGenerator(
            this.medicationRequests,
            this.reminderTime,
            this.timezone,
            this.messages
        ).generateData();
        const serviceRequestsReminders = new ServiceRequestDataGenerator(
            this.serviceRequests,
            this.reminderTime,
            this.timezone,
            this.messages
        ).generateData();
        return [...medicationRequestsReminders, ...serviceRequestsReminders];
    }
}
