"use client";

import { useCallback, useEffect, useState } from "react";
import type { Language } from "@/types";
import { useAiProviderRegion } from "@/components/providers/useAiProviderRegion";
import { permittedBrowserSpeechVoice } from "@/lib/browserSpeechPolicy";

function speechLangFor(language: Language) {
  if (language === "en") return "en-US";
  if (language === "zh-Hans") return "zh-CN";
  return "zh-HK";
}

// Minimal Web Speech (text-to-speech) helper for the read-aloud accommodation.
// Degrades gracefully: `supported` is false where speechSynthesis is unavailable,
// and speaking always cancels any prior utterance so repeated presses don't queue.
export function useReadAloud(language: Language) {
  const providerRegion = useAiProviderRegion();
  const [speaking, setSpeaking] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!supported || !text.trim()) return;
    const voice = permittedBrowserSpeechVoice(providerRegion, window.speechSynthesis.getVoices(), speechLangFor(language));
    if (voice === null) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLangFor(language);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [language, supported, providerRegion]);

  // Stop any in-flight speech when the consumer unmounts.
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { speak, stop, speaking, supported };
}
