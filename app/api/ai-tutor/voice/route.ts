import { NextResponse } from "next/server";
import { readQwenRealtimeProviderConfig } from "@/lib/server/llmProvider";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { consumeAiCapabilityRateLimit, resolveStudentAiTutorPolicy } from "@/lib/server/userStore";
import { aiCapabilityRateLimitRulesFromEnv } from "@/lib/server/aiGovernance";

export const runtime = "nodejs";

const maxVoiceTextLength = 1200;
const defaultVoiceProviderTimeoutMs = 30000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cleanVoiceText(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/\$\$?/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_[\]^]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxVoiceTextLength);
}

function cleanLanguage(value: unknown) {
  if (typeof value !== "string") return "en";
  if (value.startsWith("zh-Hans")) return "zh-Hans";
  if (value.startsWith("zh")) return "zh";
  return "en";
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

function wavFromPcm16(pcm: Buffer, sampleRate = 24000) {
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = channels * bitsPerSample / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function replyVoiceInstructions(text: string, language: string) {
  const languageName = language === "zh-Hans"
    ? "Simplified Chinese"
    : language === "zh"
      ? "Traditional Chinese / Hong Kong Cantonese-friendly Chinese"
      : "English";

  return [
    `Read the following AI Tutor reply aloud in ${languageName}.`,
    "Speak warmly and clearly as Professor Nova.",
    "Do not add greetings, commentary, explanations, sound effects, or extra words.",
    "Preserve the meaning exactly. If math notation appears, read it naturally for a student.",
    "",
    text
  ].join("\n");
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

async function synthesizeQwenRealtimeVoice({
  apiKey,
  apiUrl,
  language,
  model,
  text,
  timeoutMs
}: {
  apiKey: string;
  apiUrl: string;
  language: string;
  model: string;
  text: string;
  timeoutMs: number;
}) {
  const realtimeUrl = buildRealtimeUrl(apiUrl, model);
  const audioChunks: Buffer[] = [];
  const SocketConstructor = WebSocket as unknown as new (
    url: string,
    options?: { headers?: Record<string, string> }
  ) => WebSocket;

  return await new Promise<Buffer>((resolve, reject) => {
    let settled = false;
    let sessionUpdated = false;
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
      reject(new Error("qwen-realtime-timeout"));
    }, timeoutMs);

    function settleWithError(error: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      reject(error);
    }

    function settleWithAudio() {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket.close();
      const pcm = Buffer.concat(audioChunks);
      if (!pcm.length) {
        reject(new Error("qwen-realtime-empty-audio"));
        return;
      }
      resolve(wavFromPcm16(pcm));
    }

    function sendJson(value: unknown) {
      socket.send(JSON.stringify(value));
    }

    socket.addEventListener("open", () => {
      sendJson({
        event_id: createEventId("session_update"),
        type: "session.update",
        session: {
          modalities: ["text", "audio"],
          input_audio_transcription: null,
          input_audio_format: "pcm16",
          output_audio_format: "pcm",
          turn_detection: null,
          instructions: "You are Professor Nova's spoken voice for a math learning app. Read supplied tutor replies naturally and do not invent new content."
        }
      });
    });

    socket.addEventListener("message", (event) => {
      const message = parseRealtimeMessage(event.data);
      if (!isRecord(message)) return;
      const type = typeof message.type === "string" ? message.type : "";

      if (type === "error") {
        settleWithError(new Error("qwen-realtime-error"));
        return;
      }

      if (type === "session.updated" && !sessionUpdated) {
        sessionUpdated = true;
        sendJson({
          event_id: createEventId("response_create"),
          type: "response.create",
          response: {
            instructions: replyVoiceInstructions(text, language),
            modalities: ["text", "audio"]
          }
        });
        return;
      }

      if (type === "response.audio.delta" && typeof message.delta === "string") {
        audioChunks.push(Buffer.from(message.delta, "base64"));
        return;
      }

      if (type === "response.done") {
        settleWithAudio();
      }
    });

    socket.addEventListener("error", () => {
      settleWithError(new Error("qwen-realtime-websocket-error"));
    });

    socket.addEventListener("close", () => {
      if (settled) return;
      settleWithError(new Error("qwen-realtime-closed"));
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

  const classroomPolicy = await resolveStudentAiTutorPolicy(authenticated.user.id);
  if (classroomPolicy.mode === "fallback-only") {
    return NextResponse.json({ error: "Class AI Tutor voice is paused." }, { status: 409 });
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

  const text = cleanVoiceText(body.text);
  if (!text) {
    return NextResponse.json({ error: "Voice text is required." }, { status: 400 });
  }

  let rateLimit: Awaited<ReturnType<typeof consumeAiCapabilityRateLimit>>;
  try {
    rateLimit = await consumeAiCapabilityRateLimit({
      userId: authenticated.user.id,
      capability: "ai-tutor-voice",
      rules: aiCapabilityRateLimitRulesFromEnv("ai-tutor-voice")
    });
  } catch (error) {
    console.error("AI Tutor voice governance rate-limit lookup failed", error instanceof Error ? error.name : typeof error);
    return NextResponse.json({ error: "AI Tutor voice governance is temporarily unavailable." }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "AI Tutor voice rate limit reached." },
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

  const providerConfig = readQwenRealtimeProviderConfig();
  if (!providerConfig.apiKey) {
    return NextResponse.json({ error: "Qwen realtime voice is not configured." }, { status: 503 });
  }

  try {
    const wav = await synthesizeQwenRealtimeVoice({
      apiKey: providerConfig.apiKey,
      apiUrl: providerConfig.apiUrl,
      language: cleanLanguage(body.language),
      model: providerConfig.model,
      text,
      timeoutMs: boundedNumber(
        process.env.AI_TUTOR_VOICE_PROVIDER_TIMEOUT_MS ?? process.env.AI_TUTOR_PROVIDER_TIMEOUT_MS,
        defaultVoiceProviderTimeoutMs,
        1000,
        60000
      )
    });

    return new Response(new Uint8Array(wav), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "audio/wav",
        "X-AI-Tutor-Voice-Provider": "qwen",
        "X-AI-Tutor-Voice-Model": providerConfig.model
      }
    });
  } catch {
    return NextResponse.json({ error: "AI Tutor voice playback is temporarily unavailable." }, { status: 502 });
  }
}
