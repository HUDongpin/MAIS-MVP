import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { aiCapabilityRateLimitRulesFromEnv } from "@/lib/server/aiGovernance";
import { consumeAiCapabilityRateLimit } from "@/lib/server/userStore";
import { buildLessonAudioChunks } from "@/components/lesson/lessonAudioQueue";
import { buildLessonAudioSseHeaders, createDashScopeAudioReadableStream } from "./lessonAudioSse";

export const runtime = "nodejs";

const defaultLessonAudioBaseUrl = "https://dashscope.aliyuncs.com";
const defaultLessonAudioModel = "cosyvoice-v3-flash";
const defaultLessonAudioVoice = "longanyang";
const defaultLessonAudioTimeoutMs = 30000;
const defaultLessonAudioMaxTextLength = 3000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanLessonAudioText(value: unknown) {
  if (typeof value !== "string") return "";

  const maxLength = boundedNumber(
    process.env.LESSON_AUDIO_MAX_TEXT_LENGTH,
    defaultLessonAudioMaxTextLength,
    100,
    8000
  );

  return value
    .replace(/\$\$?/g, " ")
    .replace(/\\\((.*?)\\\)/g, "$1")
    .replace(/\\\[(.*?)\\\]/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_[\]^]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanLessonAudioLanguage(value: unknown) {
  if (typeof value !== "string") return "en";
  if (value.startsWith("zh")) return "zh";
  return "en";
}

function lessonAudioVoiceFor(language: string) {
  if (language === "zh") {
    return readOptionalEnv(process.env.LESSON_TTS_ZH_VOICE)
      ?? readOptionalEnv(process.env.LESSON_TTS_VOICE)
      ?? defaultLessonAudioVoice;
  }

  return readOptionalEnv(process.env.LESSON_TTS_EN_VOICE)
    ?? readOptionalEnv(process.env.LESSON_TTS_VOICE)
    ?? defaultLessonAudioVoice;
}

function lessonAudioProviderConfig(language: string) {
  const baseUrl = readOptionalEnv(process.env.LESSON_TTS_BASE_URL)
    ?? defaultLessonAudioBaseUrl;

  return {
    apiKey: readOptionalEnv(process.env.DASHSCOPE_API_KEY) ?? readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl: `${baseUrl.replace(/\/$/, "")}/api/v1/services/audio/tts/SpeechSynthesizer`,
    model: readOptionalEnv(process.env.LESSON_TTS_MODEL) ?? defaultLessonAudioModel,
    voice: lessonAudioVoiceFor(language)
  };
}

function extractLessonAudioUrl(value: unknown) {
  if (!isRecord(value) || !isRecord(value.output) || !isRecord(value.output.audio)) return "";
  return typeof value.output.audio.url === "string" ? value.output.audio.url : "";
}

function lessonAudioStreamRequested(value: Record<string, unknown>) {
  return value.stream === true
    || value.streaming === true
    || value.mode === "stream"
    || value.responseFormat === "stream";
}

function lessonAudioNativeStreamingEnabled(value: Record<string, unknown>) {
  const requestedStrategy = typeof value.streamingStrategy === "string" ? value.streamingStrategy : "auto";
  if (requestedStrategy === "chunked") return false;
  if (requestedStrategy === "provider") return true;

  const envValue = process.env.LESSON_AUDIO_NATIVE_STREAMING_ENABLED?.trim().toLowerCase();
  return envValue !== "false" && envValue !== "0" && envValue !== "off";
}

function lessonAudioProviderPayload(text: string, language: string, providerConfig: ReturnType<typeof lessonAudioProviderConfig>) {
  return JSON.stringify({
    model: providerConfig.model,
    input: {
      text,
      voice: providerConfig.voice,
      format: "mp3",
      language_hints: [language]
    }
  });
}

function lessonAudioHeaders(
  providerConfig: ReturnType<typeof lessonAudioProviderConfig>,
  options: {
    cacheControl: string;
    chunkCount?: number;
    streaming?: "dashscope-sse" | "server-chunked";
  }
) {
  const headers: Record<string, string> = {
    "Cache-Control": options.cacheControl,
    "Content-Type": "audio/mpeg",
    "X-Lesson-Audio-Model": providerConfig.model,
    "X-Lesson-Audio-Provider": "aliyun-cosyvoice",
    "X-Lesson-Audio-Voice": providerConfig.voice
  };

  if (options.streaming) {
    headers["X-Lesson-Audio-Streaming"] = options.streaming;
  }
  if (typeof options.chunkCount === "number") {
    headers["X-Lesson-Audio-Chunk-Count"] = String(options.chunkCount);
  }

  return headers;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: abortController.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLessonAudioBytes({
  language,
  providerConfig,
  text,
  timeoutMs
}: {
  language: string;
  providerConfig: ReturnType<typeof lessonAudioProviderConfig>;
  text: string;
  timeoutMs: number;
}) {
  const apiKey = providerConfig.apiKey;
  if (!apiKey) {
    throw new Error("lesson-audio-api-key-missing");
  }

  const synthesizeResponse = await fetchWithTimeout(providerConfig.apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: lessonAudioProviderPayload(text, language, providerConfig)
  }, timeoutMs);

  if (!synthesizeResponse.ok) {
    throw new Error("lesson-audio-synthesis-failed");
  }

  const synthesisResult = await synthesizeResponse.json() as unknown;
  const audioUrl = extractLessonAudioUrl(synthesisResult);
  if (!audioUrl) {
    throw new Error("lesson-audio-url-missing");
  }

  const audioResponse = await fetchWithTimeout(audioUrl, { method: "GET" }, timeoutMs);
  if (!audioResponse.ok) {
    throw new Error("lesson-audio-download-failed");
  }

  const audio = await audioResponse.arrayBuffer();
  if (!audio.byteLength) {
    throw new Error("lesson-audio-empty");
  }

  return new Uint8Array(audio);
}

async function buildChunkedLessonAudioResponse({
  language,
  providerConfig,
  text,
  timeoutMs
}: {
  language: string;
  providerConfig: ReturnType<typeof lessonAudioProviderConfig>;
  text: string;
  timeoutMs: number;
}) {
  const chunks = buildLessonAudioChunks(text);
  const firstChunk = chunks[0];
  if (!firstChunk) {
    return NextResponse.json({ error: "Lesson audio text is required." }, { status: 400 });
  }

  const firstAudio = await fetchLessonAudioBytes({
    language,
    providerConfig,
    text: firstChunk.text,
    timeoutMs
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(firstAudio);
        for (const chunk of chunks.slice(1)) {
          const audio = await fetchLessonAudioBytes({
            language,
            providerConfig,
            text: chunk.text,
            timeoutMs
          });
          controller.enqueue(audio);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: lessonAudioHeaders(providerConfig, {
      cacheControl: "private, no-store",
      chunkCount: chunks.length,
      streaming: "server-chunked"
    })
  });
}

async function buildNativeStreamingLessonAudioResponse({
  language,
  providerConfig,
  text,
  timeoutMs
}: {
  language: string;
  providerConfig: ReturnType<typeof lessonAudioProviderConfig>;
  text: string;
  timeoutMs: number;
}) {
  const apiKey = providerConfig.apiKey;
  if (!apiKey) return null;

  const synthesizeResponse = await fetchWithTimeout(providerConfig.apiUrl, {
    method: "POST",
    headers: buildLessonAudioSseHeaders(apiKey),
    body: lessonAudioProviderPayload(text, language, providerConfig)
  }, timeoutMs);

  if (!synthesizeResponse.ok || !synthesizeResponse.body) {
    return null;
  }

  const contentType = synthesizeResponse.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().includes("text/event-stream")) {
    return null;
  }

  return new Response(createDashScopeAudioReadableStream(synthesizeResponse.body), {
    headers: lessonAudioHeaders(providerConfig, {
      cacheControl: "private, no-store",
      streaming: "dashscope-sse"
    })
  });
}

export async function POST(request: Request) {
  let authenticated: Awaited<ReturnType<typeof requireAuthenticatedUser>>;
  try {
    authenticated = await requireAuthenticatedUser(request);
  } catch {
    authenticated = null;
  }

  if (!authenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const text = cleanLessonAudioText(body.text);
  if (!text) {
    return NextResponse.json({ error: "Lesson audio text is required." }, { status: 400 });
  }

  const rateLimit = await consumeAiCapabilityRateLimit({
    userId: authenticated.user.id,
    capability: "lesson-audio",
    rules: aiCapabilityRateLimitRulesFromEnv("lesson-audio")
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Lesson audio rate limit reached." },
      {
        status: 429,
        headers: {
          "RateLimit-Remaining": String(rateLimit.remaining),
          "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt.getTime() / 1000)),
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const language = cleanLessonAudioLanguage(body.language);
  const providerConfig = lessonAudioProviderConfig(language);
  if (!providerConfig.apiKey) {
    return NextResponse.json({ error: "Lesson audio TTS is not configured." }, { status: 503 });
  }

  const timeoutMs = boundedNumber(
    process.env.LESSON_AUDIO_PROVIDER_TIMEOUT_MS ?? process.env.AI_TUTOR_PROVIDER_TIMEOUT_MS,
    defaultLessonAudioTimeoutMs,
    1000,
    60000
  );

  try {
    if (lessonAudioStreamRequested(body)) {
      if (lessonAudioNativeStreamingEnabled(body)) {
        const nativeStreamingResponse = await buildNativeStreamingLessonAudioResponse({
          language,
          providerConfig,
          text,
          timeoutMs
        });
        if (nativeStreamingResponse) return nativeStreamingResponse;
      }

      return await buildChunkedLessonAudioResponse({
        language,
        providerConfig,
        text,
        timeoutMs
      });
    }

    const audio = await fetchLessonAudioBytes({
      language,
      providerConfig,
      text,
      timeoutMs
    });

    return new Response(audio, {
      headers: lessonAudioHeaders(providerConfig, {
        cacheControl: "private, max-age=86400"
      })
    });
  } catch {
    return NextResponse.json({ error: "Lesson audio is temporarily unavailable." }, { status: 502 });
  }
}
