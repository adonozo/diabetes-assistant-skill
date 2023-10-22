import { DateTime } from "luxon";
import { AbstractMessage, ObservationValue } from "./abstract-message";
import { MessagesEs } from "./messages.es";
import { MessagesEn } from "./messages.en";
import { Observation } from "fhir/r5";

export function getLocalizedStrings(locale: string | undefined): AbstractMessage {
    switch (locale) {
        case MessagesEs.locale:
            return new MessagesEs();
        case MessagesEn.locale:
            return new MessagesEn();
        default:
            throw new Error(`Locale ${locale} not supported.`);
    }
}

export function makeTextFromObservations(
    observations: Observation[],
    timezone: string,
    localizedMessages: AbstractMessage
): string {
    const dateMap = new Map<string, ObservationValue[]>();
    observations.forEach(observation => {
        const date = DateTime.fromISO(observation.issued!).setZone(timezone);
        const dayKey = localizedMessages
            .getTextForDay(observation.issued!, timezone, localizedMessages.responses.DATE_PREPOSITION);
        const time = localizedMessages.getHoursAndMinutes(date);
        const observationValue = {
            time: time,
            value: observation.valueQuantity?.value?.toString() ?? '',
            timing: (observation.extension && observation.extension[0]?.valueCode) ?? ''
        };

        if (dateMap.has(dayKey)) {
            dateMap.get(dayKey)!.push(observationValue);
        } else {
            dateMap.set(dayKey, [observationValue]);
        }
    });

    let text = '';
    dateMap.forEach((value, day) => {
        const textForDay = localizedMessages.makeTextForObservationDay(day, value)
        text = text + textForDay + '. ';
    })

    return wrapSpeakMessage(text);
}

function wrapSpeakMessage(message: string): string {
    return `<speak>${message}</speak>`
}
