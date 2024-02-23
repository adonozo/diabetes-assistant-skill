import { AppLocale } from "../enums";
import { AbstractMessage } from "../strings/abstractMessage";
import { MessagesEs } from "../strings/messages.es";
import { MessagesEn } from "../strings/messages.en";

const localeMessagesMap: Map<AppLocale, () => AbstractMessage> = new Map<AppLocale, () => AbstractMessage>()
    .set(AppLocale.esES, () => new MessagesEs(AppLocale.esES))
    .set(AppLocale.esUS, () => new MessagesEs(AppLocale.esUS))
    .set(AppLocale.esMX, () => new MessagesEs(AppLocale.esMX))
    .set(AppLocale.enGB, () => new MessagesEn(AppLocale.enGB))
    .set(AppLocale.enUS, () => new MessagesEn(AppLocale.enUS))

export function messagesForLocale(locale: string | undefined): AbstractMessage {
    if (!isAppLocale(locale) || !localeMessagesMap.has(locale)) {
        throw new Error(`Locale ${locale} not supported.`);
    }

    const messageInitializer = localeMessagesMap.get(locale)!;
    return messageInitializer();
}

export function isAppLocale(locale: string | undefined): locale is AppLocale {
    return Object.values<string>(AppLocale).includes(locale ?? '');
}

export function logMessage(name: string, object: any): void {
    console.log(`~~~~~~ ${name}`, JSON.stringify(object));
}
