export function cleanVoiceTranscript(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function voiceTranscriptMessageInput(baseInput: string, transcript: string) {
  const base = baseInput.trim();
  const spokenText = cleanVoiceTranscript(transcript);
  if (!base) return spokenText;
  if (!spokenText) return base;
  return `${base} ${spokenText}`;
}
