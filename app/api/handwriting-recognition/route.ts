import { NextResponse } from "next/server";
import {
  buildMathpixStrokePayload,
  isConfidentHandwritingCandidate,
  isEmptyHandwritingRecognitionText,
  normalizeHandwritingText,
  recognizeLocalNumericDraft,
  sanitizeHandwritingStrokes,
  type HandwritingRecognitionAlternative,
  type HandwritingRecognitionProvider,
  type HandwritingRecognitionResult,
  type HandwritingStroke
} from "@/lib/handwritingRecognition";
import {
  buildLLMProviderRequestBody,
  extractLLMProviderReply,
  readLLMProviderConfig,
  type LLMProviderConfig,
  type LLMProviderContentPart,
  type LLMProviderMessage,
  type LLMProviderName
} from "@/lib/server/llmProvider";
import { buildSimpletexAppAuthHeaders, type SimpletexRequestFields } from "@/lib/server/simpletexAuth";
import { requireAuthenticatedUser } from "@/lib/server/auth";

export const runtime = "nodejs";

const defaultSimpletexApiUrl = "https://server.simpletex.cn/api/simpletex_ocr";
const defaultMathpixApiUrl = "https://api.mathpix.com/v3/strokes";
const defaultProviderTimeoutMs = 12000;
const defaultMaxRequestsPerMinute = 20;
const defaultMaxRequestsPerHour = 160;
const defaultAcceptedConfidence = 0.7;
const maxImageDataUrlLength = 1_500_000;
const simpletexImagePaddingPx = 32;
const simpletexTrimThreshold = 24;

type RateLimitState = {
  timestamps: number[];
};

type ProviderCandidate = {
  text: string;
  latex?: string;
  confidence: number | null;
  provider: HandwritingRecognitionProvider;
  alternatives?: HandwritingRecognitionAlternative[];
};
type ProviderImage = {
  blob: Blob;
  fileName: string;
  preprocessing: {
    applied: boolean;
    inputBytes: number;
    outputBytes: number;
    note?: string;
  };
};
type SimpletexConfig = {
  apiUrl: string;
} & (
  | {
      authMode: "app";
      appId: string;
      appSecret: string;
    }
  | {
      authMode: "uat";
      uat: string;
    }
);

const recognitionRateLimits = new Map<string, RateLimitState>();

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
  return Math.min(max, Math.max(min, parsed));
}

function readAcceptedConfidenceThreshold() {
  return boundedNumber(
    process.env.HANDWRITING_RECOGNITION_CONFIDENCE_THRESHOLD,
    defaultAcceptedConfidence,
    0.1,
    0.99
  );
}

function readImageDataUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("data:image/")) return undefined;
  return value.length <= maxImageDataUrlLength ? value : undefined;
}

function readSimpletexConfig() {
  const apiUrl = readOptionalEnv(process.env.SIMPLETEX_API_URL) ?? defaultSimpletexApiUrl;
  const appId = readOptionalEnv(process.env.SIMPLETEX_APP_ID);
  const appSecret = readOptionalEnv(process.env.SIMPLETEX_APP_SECRET);
  if (appId && appSecret) {
    return {
      authMode: "app",
      appId,
      appSecret,
      apiUrl
    } satisfies SimpletexConfig;
  }

  const uat = readOptionalEnv(process.env.SIMPLETEX_UAT);
  if (!uat) return null;

  return {
    authMode: "uat",
    uat,
    apiUrl
  } satisfies SimpletexConfig;
}

function checkRecognitionRateLimit(userId: string, now = Date.now()) {
  const maxPerMinute = Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_MINUTE,
    defaultMaxRequestsPerMinute,
    1,
    120
  ));
  const maxPerHour = Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_MAX_REQUESTS_PER_HOUR,
    defaultMaxRequestsPerHour,
    1,
    1000
  ));
  const state = recognitionRateLimits.get(userId) ?? { timestamps: [] };
  const recent = state.timestamps.filter((timestamp) => now - timestamp < 60 * 60 * 1000);
  const recentMinute = recent.filter((timestamp) => now - timestamp < 60 * 1000);

  if (recentMinute.length >= maxPerMinute || recent.length >= maxPerHour) {
    const oldestRelevant = recentMinute.length >= maxPerMinute ? recentMinute[0] : recent[0];
    const windowMs = recentMinute.length >= maxPerMinute ? 60 * 1000 : 60 * 60 * 1000;
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldestRelevant + windowMs - now) / 1000))
    };
  }

  recent.push(now);
  recognitionRateLimits.set(userId, { timestamps: recent });
  return { allowed: true, retryAfterSeconds: 0 };
}

function providerSupportsImageInput(provider: LLMProviderName) {
  return provider !== "deepseek";
}

function readVisionProviderConfig(): LLMProviderConfig {
  const fallbackConfig = readLLMProviderConfig();
  const apiKey = readOptionalEnv(process.env.HANDWRITING_RECOGNITION_LLM_API_KEY)
    ?? readOptionalEnv(process.env.AI_TUTOR_VISION_API_KEY)
    ?? readOptionalEnv(process.env.OPENAI_API_KEY);
  const apiUrl = readOptionalEnv(process.env.HANDWRITING_RECOGNITION_LLM_API_URL)
    ?? readOptionalEnv(process.env.AI_TUTOR_VISION_API_URL)
    ?? (fallbackConfig.provider === "openai" || fallbackConfig.provider === "openai-compatible" ? fallbackConfig.apiUrl : "https://api.openai.com/v1/chat/completions");
  const model = readOptionalEnv(process.env.HANDWRITING_RECOGNITION_LLM_MODEL)
    ?? readOptionalEnv(process.env.AI_TUTOR_VISION_MODEL)
    ?? readOptionalEnv(process.env.OPENAI_MODEL)
    ?? "gpt-4.1-mini";
  const provider = apiUrl.includes("deepseek.com")
    ? "deepseek"
    : apiUrl.includes("openai.com")
      ? "openai"
      : "openai-compatible";

  return {
    apiKey,
    apiUrl,
    model,
    provider
  };
}

function buildResult(candidate: ProviderCandidate | null, alternatives: HandwritingRecognitionAlternative[], reason?: string): HandwritingRecognitionResult {
  if (!candidate) {
    return {
      text: "",
      confidence: 0,
      provider: "none",
      alternatives: dedupeAlternatives(alternatives),
      accepted: false,
      reason: reason ?? "Handwriting could not be recognized confidently."
    };
  }

  const confidenceThreshold = readAcceptedConfidenceThreshold();
  const normalizedAlternatives = dedupeAlternatives([
    ...(candidate.text ? [{
      text: candidate.text,
      latex: candidate.latex,
      confidence: candidate.confidence,
      provider: candidate.provider
    }] : []),
    ...(candidate.alternatives ?? []),
    ...alternatives
  ]);
  const accepted = Boolean(candidate.text) && candidate.confidence !== null && candidate.confidence >= confidenceThreshold;

  return {
    text: accepted ? candidate.text : "",
    ...(candidate.latex ? { latex: candidate.latex } : {}),
    confidence: candidate.confidence,
    provider: candidate.provider,
    alternatives: normalizedAlternatives,
    accepted,
    ...(accepted ? {} : { reason: "Recognition confidence is below the review threshold." })
  };
}

function dedupeAlternatives(alternatives: HandwritingRecognitionAlternative[]) {
  const seen = new Set<string>();
  return alternatives
    .filter((alternative) => alternative.text.trim().length > 0)
    .filter((alternative) => {
      const key = `${alternative.provider}:${alternative.text}:${alternative.latex ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

function readMathpixConfig() {
  const appId = readOptionalEnv(process.env.MATHPIX_APP_ID);
  const appKey = readOptionalEnv(process.env.MATHPIX_APP_KEY);
  if (!appId || !appKey) return null;

  return {
    appId,
    appKey,
    apiUrl: readOptionalEnv(process.env.MATHPIX_STROKES_API_URL) ?? defaultMathpixApiUrl
  };
}

function extractCandidateText(value: unknown) {
  if (!isRecord(value)) return "";
  const candidates = [
    value.text,
    value.latex_styled,
    value.latex,
    value.ascii_math,
    value.data
  ];
  const raw = candidates.find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0) ?? "";
  return normalizeHandwritingText(raw);
}

function extractLatex(value: unknown) {
  if (!isRecord(value)) return undefined;
  const raw = typeof value.latex_styled === "string"
    ? value.latex_styled
    : typeof value.latex === "string"
      ? value.latex
      : undefined;
  return raw?.trim() || undefined;
}

function extractConfidence(value: unknown) {
  if (!isRecord(value)) return null;
  const candidates = [
    value.conf,
    value.score,
    value.confidence,
    value.confidence_rate,
    value.recognition_confidence,
    value.detection_confidence
  ];
  const numeric = candidates.find((candidate): candidate is number => typeof candidate === "number" && Number.isFinite(candidate));
  if (numeric === undefined) return null;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
}

function bufferToBlobPart(bytes: Buffer) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

async function preprocessImageBytesForOcr(bytes: Buffer, mimeType: string) {
  try {
    const { default: sharp } = await import("sharp");
    const normalized = await sharp(bytes, { failOn: "none" })
      .rotate()
      .flatten({ background: "#ffffff" })
      .trim({ background: "#ffffff", threshold: simpletexTrimThreshold })
      .extend({
        top: simpletexImagePaddingPx,
        right: simpletexImagePaddingPx,
        bottom: simpletexImagePaddingPx,
        left: simpletexImagePaddingPx,
        background: "#ffffff"
      })
      .png()
      .toBuffer();

    if (normalized.length > 0) {
      return {
        bytes: normalized,
        mimeType: "image/png",
        fileName: "handwriting.png",
        note: "white-background-trimmed-padded"
      };
    }
  } catch (error) {
    console.warn("Handwriting OCR image preprocessing skipped", {
      inputMimeType: mimeType,
      inputBytes: bytes.length,
      error: error instanceof Error ? error.name : "unknown"
    });
  }

  return {
    bytes,
    mimeType,
    fileName: mimeType === "image/jpeg" ? "handwriting.jpg" : "handwriting.png",
    note: "raw-image-fallback"
  };
}

async function imageDataUrlToBlob(value: string | undefined): Promise<ProviderImage | null> {
  if (!value) return null;

  const match = value.match(/^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length) return null;
  const preprocessed = await preprocessImageBytesForOcr(bytes, mimeType);

  return {
    blob: new Blob([bufferToBlobPart(preprocessed.bytes)], { type: preprocessed.mimeType }),
    fileName: preprocessed.fileName,
    preprocessing: {
      applied: preprocessed.bytes !== bytes,
      inputBytes: bytes.length,
      outputBytes: preprocessed.bytes.length,
      note: preprocessed.note
    }
  };
}

function simpletexRequestFieldsFor(apiUrl: string): SimpletexRequestFields {
  try {
    const pathname = new URL(apiUrl).pathname;
    if (pathname.endsWith("/simpletex_ocr")) return { rec_mode: "formula" };
  } catch {
    if (apiUrl.includes("simpletex_ocr")) return { rec_mode: "formula" };
  }

  return {};
}

function simpletexAuthHeaders(config: SimpletexConfig, reqData: SimpletexRequestFields) {
  if (config.authMode === "app") {
    return buildSimpletexAppAuthHeaders({
      appId: config.appId,
      appSecret: config.appSecret,
      reqData
    });
  }

  return { token: config.uat };
}

function simpletexResponseDiagnostics(value: unknown) {
  if (!isRecord(value)) {
    return { responseType: typeof value };
  }

  const res = isRecord(value.res) ? value.res : null;
  const textFieldNames = ["latex", "info", "content", "markdown", "text"] as const;
  const candidateFields = res
    ? textFieldNames.map((field) => {
        const raw = res[field];
        return {
          field,
          type: typeof raw,
          length: typeof raw === "string" ? raw.trim().length : null,
          emptyMarker: typeof raw === "string" && isEmptyHandwritingRecognitionText(raw) ? raw.trim().slice(0, 24) : null
        };
      })
    : [];

  return {
    status: value.status,
    topLevelKeys: Object.keys(value).sort(),
    resKeys: res ? Object.keys(res).sort() : [],
    confidence: res ? extractConfidence(res) : null,
    candidateFields
  };
}

function normalizeSimpletexCandidate(value: unknown): ProviderCandidate | null {
  if (!isRecord(value) || value.status !== true || !isRecord(value.res)) return null;

  const raw = [
    value.res.latex,
    value.res.info,
    value.res.content,
    value.res.markdown,
    value.res.text
  ].find((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0)?.trim() ?? "";
  const latex = raw;
  if (!latex || isEmptyHandwritingRecognitionText(latex)) return null;

  const text = normalizeHandwritingText(latex);
  if (!text || isEmptyHandwritingRecognitionText(text)) return null;

  const confidence = extractConfidence(value.res);
  return {
    text,
    latex,
    confidence,
    provider: "simpletex",
    alternatives: [{
      text,
      latex,
      confidence,
      provider: "simpletex"
    }]
  };
}

async function trySimpletexRecognition(imageDataUrl: string | undefined) {
  const config = readSimpletexConfig();
  const image = await imageDataUrlToBlob(imageDataUrl);
  if (!config || !image) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS,
    defaultProviderTimeoutMs,
    500,
    60000
  )));

  try {
    const formData = new FormData();
    const reqData = simpletexRequestFieldsFor(config.apiUrl);
    Object.entries(reqData).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append("file", image.blob, image.fileName);

    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: simpletexAuthHeaders(config, reqData),
      body: formData,
      signal: controller.signal
    });

    if (!response.ok) {
      console.error("SimpleTex handwriting recognition failed", response.status, (await response.text()).slice(0, 500));
      return null;
    }

    const data: unknown = await response.json();
    const candidate = normalizeSimpletexCandidate(data);
    if (!candidate) {
      console.warn("SimpleTex handwriting recognition returned no normalized candidate", {
        preprocessing: image.preprocessing,
        diagnostics: simpletexResponseDiagnostics(data)
      });
    }
    return candidate;
  } catch (error) {
    console.error("SimpleTex handwriting recognition request failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractMathpixAlternatives(value: unknown): HandwritingRecognitionAlternative[] {
  if (!isRecord(value)) return [];
  const rawCandidates = [
    value.alternatives,
    value.candidates,
    value.recognition_results
  ].find(Array.isArray) as unknown[] | undefined;
  if (!rawCandidates) return [];

  return rawCandidates
    .map((candidate) => ({
      text: extractCandidateText(candidate),
      latex: extractLatex(candidate),
      confidence: extractConfidence(candidate),
      provider: "mathpix" as const
    }))
    .filter((candidate) => candidate.text.length > 0);
}

async function tryMathpixRecognition(strokes: HandwritingStroke[]) {
  const config = readMathpixConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS,
    defaultProviderTimeoutMs,
    500,
    60000
  )));

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        app_id: config.appId,
        app_key: config.appKey
      },
      body: JSON.stringify({
        ...buildMathpixStrokePayload(strokes),
        formats: ["text", "latex_styled"]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      console.error("Mathpix handwriting recognition failed", response.status, (await response.text()).slice(0, 500));
      return null;
    }

    const data: unknown = await response.json();
    const text = extractCandidateText(data);
    if (!text) return null;

    return {
      text,
      latex: extractLatex(data),
      confidence: extractConfidence(data),
      provider: "mathpix" as const,
      alternatives: extractMathpixAlternatives(data)
    } satisfies ProviderCandidate;
  } catch (error) {
    console.error("Mathpix handwriting recognition request failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

function normalizeLLMCandidate(value: unknown): ProviderCandidate | null {
  if (!isRecord(value)) return null;
  const text = typeof value.text === "string" ? normalizeHandwritingText(value.text) : "";
  const latex = typeof value.latex === "string" ? value.latex.trim() : undefined;
  const confidence = typeof value.confidence === "number" && Number.isFinite(value.confidence)
    ? Math.max(0, Math.min(1, value.confidence > 1 ? value.confidence / 100 : value.confidence))
    : null;
  if (!text) return null;

  const alternatives = Array.isArray(value.alternatives)
    ? value.alternatives
        .map((alternative) => {
          const alternativeText = isRecord(alternative) && typeof alternative.text === "string"
            ? normalizeHandwritingText(alternative.text)
            : typeof alternative === "string"
              ? normalizeHandwritingText(alternative)
              : "";
          return {
            text: alternativeText,
            confidence: isRecord(alternative) && typeof alternative.confidence === "number" ? alternative.confidence : null,
            provider: "llm-vision" as const
          };
        })
        .filter((alternative) => alternative.text.length > 0)
    : [];

  return {
    text,
    ...(latex ? { latex } : {}),
    confidence,
    provider: "llm-vision",
    alternatives
  };
}

async function tryLLMRecognition(imageDataUrl: string | undefined) {
  if (process.env.HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED !== "true" || !imageDataUrl) return null;

  const config = readVisionProviderConfig();
  if (!config.apiKey || !providerSupportsImageInput(config.provider)) return null;

  const imageParts: LLMProviderContentPart[] = [
    {
      type: "text",
      text: [
        "Read the student's handwritten math answer from this white canvas.",
        "Return strict JSON only with this shape: {\"text\":\"plain answer for grading\",\"latex\":null,\"confidence\":0.0,\"alternatives\":[]}.",
        "Do not solve the math problem. Only transcribe the handwriting."
      ].join("\n")
    },
    {
      type: "image_url",
      image_url: { url: imageDataUrl, detail: "low" }
    }
  ];
  const messages: LLMProviderMessage[] = [
    {
      role: "system",
      content: "You are a precise OCR transcriber for student math handwriting. You never solve; you only transcribe visible handwriting."
    },
    {
      role: "user",
      content: imageParts
    }
  ];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS,
    defaultProviderTimeoutMs,
    500,
    60000
  )));

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(buildLLMProviderRequestBody({
        model: config.model,
        messages,
        provider: config.provider,
        maxTokens: 180,
        responseFormat: "json_object",
        deepSeekThinking: "disabled"
      })),
      signal: controller.signal
    });

    if (!response.ok) {
      console.error("LLM handwriting recognition failed", response.status, (await response.text()).slice(0, 500));
      return null;
    }

    const data: unknown = await response.json();
    const reply = extractLLMProviderReply(data);
    return normalizeLLMCandidate(parseJsonObject(reply));
  } catch (error) {
    console.error("LLM handwriting recognition request failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const authenticated = await requireAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Log in before using handwriting recognition." }, { status: 401 });
  }

  const rateLimit = checkRecognitionRateLimit(authenticated.user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Handwriting recognition rate limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const strokes = sanitizeHandwritingStrokes(body.strokes);
  const imageDataUrl = readImageDataUrl(body.imageDataUrl);
  if (!strokes.length && !imageDataUrl) {
    return NextResponse.json({ error: "Handwriting strokes or a canvas image are required." }, { status: 400 });
  }

  const providerAlternatives: HandwritingRecognitionAlternative[] = [];
  const localCandidate = strokes.length ? recognizeLocalNumericDraft(strokes) : null;
  if (isConfidentHandwritingCandidate(localCandidate, readAcceptedConfidenceThreshold())) {
    return NextResponse.json(buildResult(localCandidate, providerAlternatives));
  }
  if (localCandidate) providerAlternatives.push(...localCandidate.alternatives);

  const simpletexCandidate = await trySimpletexRecognition(imageDataUrl);
  if (simpletexCandidate) {
    return NextResponse.json(buildResult(simpletexCandidate, providerAlternatives));
  }

  const mathpixCandidate = strokes.length ? await tryMathpixRecognition(strokes) : null;
  if (mathpixCandidate) {
    return NextResponse.json(buildResult(mathpixCandidate, providerAlternatives));
  }

  const llmCandidate = await tryLLMRecognition(imageDataUrl);
  if (llmCandidate) {
    return NextResponse.json(buildResult(llmCandidate, providerAlternatives));
  }

  return NextResponse.json(buildResult(null, providerAlternatives, "Draw clearer handwriting, then convert again."));
}
