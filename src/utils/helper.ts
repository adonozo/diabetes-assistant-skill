import { AppLocale, TimingEvent } from "../enums";
import { AbstractMessage } from "../strings/abstractMessage";
import { MessagesEs } from "../strings/messages.es";
import { MessagesEn } from "../strings/messages.en";

const localeMessagesMap: Map<AppLocale, () => AbstractMessage> = new Map<AppLocale, () => AbstractMessage>()
    .set(AppLocale.esES, () => new MessagesEs(AppLocale.esES))
    .set(AppLocale.esUS, () => new MessagesEs(AppLocale.esUS))
    .set(AppLocale.esMX, () => new MessagesEs(AppLocale.esMX))
    .set(AppLocale.enGB, () => new MessagesEn(AppLocale.enGB))
    .set(AppLocale.enUS, () => new MessagesEn(AppLocale.enUS))

export const minBloodGlucoseValue = 4;
export const maxFastingGlucoseValue = 7;
export const maxAfterMealGlucoseValue = 8.5;

export function logMessage(name: string, object: any): void {
    console.log(`~~~~~~ ${name}`, JSON.stringify(object));
}

export function messagesForLocale(locale: string | undefined): AbstractMessage {
    if (!isAppLocale(locale) || !localeMessagesMap.has(locale)) {
        throw new Error(`Locale ${locale} not supported.`);
    }

    const messageInitializer = localeMessagesMap.get(locale)!;
    return messageInitializer();
}

export function getBloodGlucoseAlert(
    value: number,
    stringTiming: string,
    localizedMessages: AbstractMessage
): string {
    if (value < minBloodGlucoseValue) {
        return localizedMessages.responses.LOW_GLUCOSE;
    }

    const timing = localizedMessages.stringToTimingCode(stringTiming);
    if ((timing === TimingEvent.ACM && value > maxFastingGlucoseValue)
        || value > maxAfterMealGlucoseValue) {
        return localizedMessages.responses.HIGH_GLUCOSE;
    }

    return '';
}

function isAppLocale(locale: string | undefined): locale is AppLocale {
    return Object.values<string>(AppLocale).includes(locale ?? '');
}
