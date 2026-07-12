import type { Language, LocalizedText } from "@/types";
import { localeForLanguage, textForLanguage } from "@/lib/i18n";

export const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function localize(text: LocalizedText, language: Language) {
  return textForLanguage(text, language);
}

export function formatDateInHongKong(value: string | number | Date, language: Language, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(localeForLanguage(language), {
    ...options,
    timeZone: HONG_KONG_TIME_ZONE
  }).format(new Date(value));
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}
