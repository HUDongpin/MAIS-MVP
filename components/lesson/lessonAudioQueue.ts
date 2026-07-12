export type LessonAudioChunk = {
  estimatedSeconds: number;
  id: string;
  index: number;
  text: string;
};

type LessonAudioChunkOptions = {
  maxCharacters?: number;
  minCharacters?: number;
};

const defaultMaxCharacters = 480;
const defaultMinCharacters = 160;
const sentenceBoundaryPattern = /[^.!?;:。！？；：]+[.!?;:。！？；：]?(?:["'”’])?/g;

function boundedChunkSize(value: number | undefined, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeLessonAudioWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function estimateChunkDurationSeconds(value: string) {
  const words = value.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?/g)?.length ?? 0;
  const cjkCharacters = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const punctuationPauses = value.match(/[.,;:!?。！？；：，、]/g)?.length ?? 0;
  const rawSeconds = words * 0.58 + cjkCharacters * 0.34 + punctuationPauses * 0.18 + 2.5;

  return Math.max(3, Math.ceil(rawSeconds));
}

function splitLongSegment(segment: string, maxCharacters: number) {
  if (segment.length <= maxCharacters) return [segment];

  const parts: string[] = [];
  const words = segment.split(" ");
  let pending = "";

  for (const word of words) {
    const candidate = pending ? `${pending} ${word}` : word;
    if (candidate.length > maxCharacters && pending) {
      parts.push(pending);
      pending = word;
    } else {
      pending = candidate;
    }
  }

  if (pending) parts.push(pending);
  return parts.flatMap((part) => {
    if (part.length <= maxCharacters) return [part];

    const hardParts: string[] = [];
    for (let index = 0; index < part.length; index += maxCharacters) {
      hardParts.push(part.slice(index, index + maxCharacters).trim());
    }
    return hardParts.filter(Boolean);
  });
}

function splitSentences(value: string, maxCharacters: number) {
  const sentences = value.match(sentenceBoundaryPattern)?.map(normalizeLessonAudioWhitespace).filter(Boolean) ?? [value];
  return sentences.flatMap((sentence) => splitLongSegment(sentence, maxCharacters));
}

export function buildLessonAudioChunks(value: string, options: LessonAudioChunkOptions = {}): LessonAudioChunk[] {
  const normalized = normalizeLessonAudioWhitespace(value);
  if (!normalized) return [];

  const maxCharacters = boundedChunkSize(options.maxCharacters, defaultMaxCharacters, 80, 900);
  const minCharacters = boundedChunkSize(options.minCharacters, defaultMinCharacters, 40, maxCharacters);
  const sentences = splitSentences(normalized, maxCharacters);
  const chunks: string[] = [];
  let pending = "";

  for (const sentence of sentences) {
    const candidate = pending ? `${pending} ${sentence}` : sentence;
    const shouldFlush = pending.length >= minCharacters && candidate.length > maxCharacters;

    if (shouldFlush) {
      chunks.push(pending);
      pending = sentence;
    } else {
      pending = candidate;
    }
  }

  if (pending) chunks.push(pending);

  return chunks.map((text, index) => ({
    estimatedSeconds: estimateChunkDurationSeconds(text),
    id: `lesson-audio-chunk-${index}`,
    index,
    text
  }));
}

export function estimateLessonAudioChunksDurationSeconds(chunks: LessonAudioChunk[]) {
  return Math.max(10, chunks.reduce((total, chunk) => total + chunk.estimatedSeconds, 0));
}

export function lessonAudioChunkOffsetSeconds(chunks: LessonAudioChunk[], chunkIndex: number) {
  return chunks.slice(0, Math.max(0, chunkIndex)).reduce((total, chunk) => total + chunk.estimatedSeconds, 0);
}
