export function buildLessonAudioSseHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "X-DashScope-SSE": "enable"
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function maybeBase64Audio(value: unknown): string {
  return typeof value === "string" && /^[A-Za-z0-9+/=\s]+$/.test(value) ? value.replace(/\s+/g, "") : "";
}

function readNestedAudioData(value: unknown): string {
  if (!isRecord(value)) return "";

  const directAudio = maybeBase64Audio(value.audio);
  if (directAudio) return directAudio;

  if (isRecord(value.audio)) {
    const audioData = maybeBase64Audio(value.audio.data)
      || maybeBase64Audio(value.audio.content)
      || maybeBase64Audio(value.audio.payload);
    if (audioData) return audioData;
  }

  if (isRecord(value.output)) {
    const outputAudio = maybeBase64Audio(value.output.audio);
    if (outputAudio) return outputAudio;

    if (isRecord(value.output.audio)) {
      const nestedAudioData = maybeBase64Audio(value.output.audio.data)
        || maybeBase64Audio(value.output.audio.content)
        || maybeBase64Audio(value.output.audio.payload);
      if (nestedAudioData) return nestedAudioData;
    }
  }

  return "";
}

function decodeAudioDataLine(dataLine: string) {
  const trimmed = dataLine.trim();
  if (!trimmed || trimmed === "[DONE]") return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const base64Audio = readNestedAudioData(parsed);
    return base64Audio ? Buffer.from(base64Audio, "base64") : null;
  } catch {
    const base64Audio = maybeBase64Audio(trimmed);
    return base64Audio ? Buffer.from(base64Audio, "base64") : null;
  }
}

function splitSseEventBuffer(buffer: string) {
  const delimiterMatch = buffer.match(/\r?\n\r?\n/);
  if (!delimiterMatch || delimiterMatch.index === undefined) {
    return null;
  }

  const delimiter = delimiterMatch[0];
  const event = buffer.slice(0, delimiterMatch.index);
  const rest = buffer.slice(delimiterMatch.index + delimiter.length);
  return { event, rest };
}

function audioChunkFromEvent(event: string) {
  const data = event
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trim())
    .join("\n")
    .trim();

  if (!data || data === "[DONE]") return null;
  return decodeAudioDataLine(data);
}

export async function* decodeDashScopeSseAudioStream(stream: ReadableStream<Uint8Array> | null): AsyncGenerator<Uint8Array> {
  if (!stream) return;

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      while (true) {
        const split = splitSseEventBuffer(buffer);
        if (!split) break;

        buffer = split.rest;
        const chunk = audioChunkFromEvent(split.event);
        if (chunk?.byteLength) yield chunk;
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      const chunk = audioChunkFromEvent(buffer);
      if (chunk?.byteLength) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

export function createDashScopeAudioReadableStream(stream: ReadableStream<Uint8Array> | null) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of decodeDashScopeSseAudioStream(stream)) {
          controller.enqueue(chunk);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}
