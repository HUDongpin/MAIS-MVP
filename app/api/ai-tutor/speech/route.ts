import { NextResponse } from "next/server";
import { readQwenAsrRealtimeProviderConfig } from "@/lib/server/llmProvider";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { consumeAiCapabilityRateLimit } from "@/lib/server/userStore";
import { aiCapabilityRateLimitRulesFromEnv } from "@/lib/server/aiGovernance";

export const runtime = "nodejs";

type QwenAsrTranscript = {
  language: string;
  transcript: string;
};

const defaultSpeechProviderTimeoutMs = 30000;
const defaultMaxAudioSeconds = 20;
const speechSampleRate = 16000;
const speechBytesPerSample = 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function buildRealtimeUrl(apiUrl: string, model: string) {
  const url = new URL(apiUrl);
  url.searchParams.set("model", model);
  return url.toString();
}

function createEventId(prefix: string) {
  return `event_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function cleanSpeechLanguage(value: unknown) {
  if (typeof value !== "string") return "en";
  if (value === "yue" || value.startsWith("zh-HK") || value === "zh") return "zh";
  if (value.startsWith("zh-Hans") || value.startsWith("zh-CN")) return "zh";
  return "en";
}

function parseRealtimeMessage(data: unknown) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as unknown;
    } catch {
      return null;
    }
  }

  return null;
}

function readSpeechAudio(value: unknown, maxAudioSeconds: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, "");
  if (!normalized || !/^[A-Za-z0-9+/=]+$/.test(normalized)) return null;

  const audio = Buffer.from(normalized, "base64");
  const maxBytes = speechSampleRate * speechBytesPerSample * maxAudioSeconds;
  if (!audio.length || audio.length > maxBytes || audio.length % speechBytesPerSample !== 0) return null;
  return audio;
}

function readTranscript(value: unknown): QwenAsrTranscript | null {
  if (!isRecord(value)) return null;
  const transcript = typeof value.transcript === "string" ? value.transcript.replace(/\s+/g, " ").trim() : "";
  if (!transcript) return null;
  const language = typeof value.language === "string" ? value.language : "";
  return { transcript, language };
}

async function transcribeQwenAsrRealtime({
  apiKey,
  apiUrl,
  audio,
  language,
  model,
  timeoutMs
}: {
  apiKey: string;
  apiUrl: string;
  audio: Buffer;
  language: string;
  model: string;
  timeoutMs: number;
}) {
  const realtimeUrl = buildRealtimeUrl(apiUrl, model);
  const SocketConstructor = WebSocket as unknown as new (
    url: string,
    options?: { headers?: Record<string, string> }
  ) => WebSocket;

  return await new Promise<QwenAsrTranscript>((resolve, reject) => {
    let settled = false;
    let latestTranscript: QwenAsrTranscript | null = null;
    const socket = new SocketConstructor(realtimeUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1"
      }
    });
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error("qwen-asr-timeout"));
    }, timeoutMs);

    function sendJson(value: unknown) {
      socket.send(JSON.stringify(value));
    }

    function settleWithError(error: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      reject(error);
    }

    function settleWithTranscript() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      if (!latestTranscript?.transcript) {
        reject(new Error("qwen-asr-empty-transcript"));
        return;
      }
      resolve(latestTranscript);
    }

    socket.addEventListener("open", () => {
      sendJson({
        event_id: createEventId("session_update"),
        type: "session.update",
        session: {
          modalities: ["text"],
          input_audio_format: "pcm",
          sample_rate: speechSampleRate,
          input_audio_transcription: {
            language
          },
          turn_detection: null
        }
      });
    });

    socket.addEventListener("message", (event) => {
      const message = parseRealtimeMessage(event.data);
      if (!isRecord(message)) return;
      const type = typeof message.type === "string" ? message.type : "";

      if (type === "error" || type === "conversation.item.input_audio_transcription.failed") {
        settleWithError(new Error("qwen-asr-error"));
        return;
      }

      if (type === "session.updated") {
        sendJson({
          event_id: createEventId("audio_append"),
          type: "input_audio_buffer.append",
          audio: audio.toString("base64")
        });
        sendJson({
          event_id: createEventId("audio_commit"),
          type: "input_audio_buffer.commit"
        });
        sendJson({
          event_id: createEventId("session_finish"),
          type: "session.finish"
        });
        return;
      }

      if (type === "conversation.item.input_audio_transcription.completed") {
        latestTranscript = readTranscript(message);
        return;
      }

      if (type === "session.finished") {
        settleWithTranscript();
      }
    });

    socket.addEventListener("error", () => {
      settleWithError(new Error("qwen-asr-websocket-error"));
    });

    socket.addEventListener("close", () => {
      if (settled) return;
      settleWithError(new Error("qwen-asr-closed"));
    });
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

  const maxAudioSeconds = boundedNumber(
    process.env.AI_TUTOR_SPEECH_MAX_AUDIO_SECONDS,
    defaultMaxAudioSeconds,
    1,
    60
  );
  const audio = readSpeechAudio(body.audio, maxAudioSeconds);
  if (!audio) {
    return NextResponse.json({ error: "Valid PCM16 speech audio is required." }, { status: 400 });
  }

  let rateLimit: Awaited<ReturnType<typeof consumeAiCapabilityRateLimit>>;
  try {
    rateLimit = await consumeAiCapabilityRateLimit({
      userId: authenticated.user.id,
      capability: "ai-tutor-speech",
      rules: aiCapabilityRateLimitRulesFromEnv("ai-tutor-speech")
    });
  } catch (error) {
    console.error("AI Tutor speech governance rate-limit lookup failed", error instanceof Error ? error.name : typeof error);
    return NextResponse.json({ error: "AI Tutor speech governance is temporarily unavailable." }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "AI Tutor speech rate limit reached." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(Math.ceil(rateLimit.resetAt.getTime() / 1000))
        }
      }
    );
  }

  const providerConfig = readQwenAsrRealtimeProviderConfig();
  if (!providerConfig.apiKey) {
    return NextResponse.json({ error: "Qwen speech recognition is not configured." }, { status: 503 });
  }

  try {
    const result = await transcribeQwenAsrRealtime({
      apiKey: providerConfig.apiKey,
      apiUrl: providerConfig.apiUrl,
      audio,
      language: cleanSpeechLanguage(body.language),
      model: providerConfig.model,
      timeoutMs: boundedNumber(
        process.env.AI_TUTOR_SPEECH_PROVIDER_TIMEOUT_MS ?? process.env.AI_TUTOR_PROVIDER_TIMEOUT_MS,
        defaultSpeechProviderTimeoutMs,
        1000,
        60000
      )
    });

    return NextResponse.json(
      {
        language: result.language || cleanSpeechLanguage(body.language),
        model: providerConfig.model,
        provider: "qwen",
        transcript: result.transcript
      },
      {
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch {
    return NextResponse.json({ error: "AI Tutor speech recognition is temporarily unavailable." }, { status: 502 });
  }
}
