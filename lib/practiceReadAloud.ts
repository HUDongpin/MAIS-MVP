import type { Language } from "@/types";

const chineseOrdinals = ["一", "二", "三", "四", "五", "六", "七", "八", "九"] as const;

export function practiceReadAloudLanguageCode(language: Language) {
  if (language === "en") return "en-US";
  if (language === "zh-Hans") return "zh-CN";
  return "zh-HK";
}

export type PracticeReadAloudInput = {
  promptText: string;
  optionTexts: string[];
  language: Language;
};

export function buildPracticeReadAloudText({ promptText, optionTexts, language }: PracticeReadAloudInput) {
  const separator = language === "en" ? ". " : "。";
  const parts = [promptText.trim()];

  optionTexts.forEach((optionText, index) => {
    const trimmed = optionText.trim();
    if (!trimmed) return;
    if (language === "en") {
      parts.push(`Choice ${index + 1}: ${trimmed}`);
      return;
    }
    const ordinal = chineseOrdinals[index] ?? String(index + 1);
    parts.push(`${language === "zh-Hans" ? "选项" : "選項"}${ordinal}：${trimmed}`);
  });

  return parts.filter(Boolean).join(separator);
}

function pickReadAloudVoice(voices: SpeechSynthesisVoice[], languageCode: string) {
  const normalize = (value: string) => value.replace("_", "-").toLowerCase();
  const target = normalize(languageCode);
  const primarySubtag = target.split("-")[0];

  return (
    voices.find((voice) => normalize(voice.lang) === target) ??
    voices.find((voice) => normalize(voice.lang).startsWith(primarySubtag)) ??
    null
  );
}

export function stopPracticeReadAloud() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Speech synthesis may be unavailable mid-teardown; stopping is best-effort.
  }
}

export function speakPracticeText(
  textValue: string,
  languageCode: string,
  { onEnd }: { onEnd?: () => void } = {}
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !textValue.trim()) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textValue);
    utterance.lang = languageCode;
    utterance.rate = 0.92;
    const voice = pickReadAloudVoice(window.speechSynthesis.getVoices(), languageCode);
    if (voice) utterance.voice = voice;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onEnd?.();
    return false;
  }
}
