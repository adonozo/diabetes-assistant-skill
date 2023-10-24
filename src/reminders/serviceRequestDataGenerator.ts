import { ServiceRequest } from "fhir/r5";
import { AbstractMessage } from "../strings/abstractMessage";
import { ParentServiceRequestReminderData, ResourceReminderData } from "../types";
import { getDatesFromTiming } from "../fhir/timing";
import { getHoursAndMinutes, timesStringArraysFromTiming } from "../utils/time";
import { DateTime } from "luxon";
import { getRRule } from "../utils/reminder";
import { ReminderDataGenerator } from "./abstractReminderGenerator";

export class ServiceRequestDataGenerator extends ReminderDataGenerator {
    constructor(
        private readonly requests: ServiceRequest[],
        private readonly reminderTime: string,
        timezone: string,
        private readonly messages: AbstractMessage,
    ) {
        super(timezone);
    }

    getReminderData(): ResourceReminderData[] {
        return this.requests.map(request => this.mapToResourceRemindersData(request))
            .flat(1);
    }

    private mapToResourceRemindersData(request: ServiceRequest): ResourceReminderData[] {
        if (!request.occurrenceTiming || !request.contained) {
            return [];
        }

        const action = (request.code?.concept?.coding && request.code.concept.coding[0].display) ?? '';
        const {start, end} = getDatesFromTiming(request.occurrenceTiming, this.timezone);
        const parentData: ParentServiceRequestReminderData = {
            action: action,
            startDate: start,
            endDate: end
        };

        return request.contained
            .filter((innerRequest): innerRequest is ServiceRequest => innerRequest.resourceType === 'ServiceRequest')
            .map(innerRequest => this.mapToReminderData(innerRequest, parentData));
    }

    private mapToReminderData(
        innerRequest: ServiceRequest,
        parentData: ParentServiceRequestReminderData
    ): ResourceReminderData {
        const timing = innerRequest.occurrenceTiming!;
        const times = timesStringArraysFromTiming(timing, this.timezone);

        return this.getBaseServiceReminder(
            parentData.action,
            times,
            parentData.startDate,
            parentData.endDate,
            timing?.repeat?.dayOfWeek ?? []
        );
    }

    private getBaseServiceReminder(
        action: string,
        times: string[],
        startDate: DateTime,
        endDate: DateTime,
        dayOfWeek: string[]
    ): ResourceReminderData {
        const text = this.messages.getServiceReminderText(action, times);
        const ssml = this.messages.getServiceSsmlReminderText(action, times);
        const {hour, minute} = getHoursAndMinutes(this.reminderTime);
        const rule = getRRule(hour, minute, dayOfWeek);
        return {
            text: text,
            ssml: ssml,
            rule: rule,
            start: startDate,
            end: endDate,
            locale: this.messages.locale
        };
    }
}
