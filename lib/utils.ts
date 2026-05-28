import type { Language, LocalizedText } from "@/types";
import { textForLanguage } from "@/lib/i18n";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function localize(text: LocalizedText, language: Language) {
  return textForLanguage(text, language);
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}
