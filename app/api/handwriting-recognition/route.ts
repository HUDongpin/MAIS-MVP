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
  readQwenImageProviderConfig,
  resolveLLMProviderName,
  type LLMProviderConfig,
  type LLMProviderContentPart,
  type LLMProviderMessage,
  type LLMProviderName
} from "@/lib/server/llmProvider";
import {
  assessSimpletexRouting,
  normalizeOcrDecimalSeparators,
  selectRoutedHandwritingCandidate
} from "@/lib/server/handwritingOcrRouting";
import { buildSimpletexAppAuthHeaders, type SimpletexRequestFields } from "@/lib/server/simpletexAuth";
import { requireAuthenticatedUser } from "@/lib/server/auth";
import { consumeAiCapabilityRateLimit, recordAiGovernanceEvent } from "@/lib/server/userStore";
import {
  aiCapabilityRateLimitRulesFromEnv,
  evaluateMediaStoragePolicy,
  imageDataUrlMediaDescriptor,
  mediaStoragePolicyFromEnv
} from "@/lib/server/aiGovernance";
import { mediaObjectReferenceFromUnknown, readStoredMediaObject } from "@/lib/server/mediaObjectStore";

export const runtime = "nodejs";

const defaultSimpletexApiUrl = "https://server.simpletex.cn/api/simpletex_ocr";
const defaultMathpixApiUrl = "https://api.mathpix.com/v3/strokes";
const defaultProviderTimeoutMs = 12000;
const defaultAcceptedConfidence = 0.7;
const defaultLocalAutoAcceptConfidence = 0.82;
const defaultSimpletexAutoAcceptConfidence = 0.88;
const defaultMathpixAutoAcceptConfidence = 0.7;
const defaultSimpletexMaxAttempts = 2;
const defaultSimpletexRetryDelayMs = 350;
const maxImageDataUrlLength = 1_500_000;
const simpletexImagePaddingPx = 32;
const simpletexTrimThreshold = 24;
const secretLikePattern = /[A-Za-z0-9+/=_-]{24,}/g;

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

function readLocalAutoAcceptConfidenceThreshold() {
  return boundedNumber(
    process.env.HANDWRITING_RECOGNITION_LOCAL_AUTO_ACCEPT_CONFIDENCE_THRESHOLD,
    defaultLocalAutoAcceptConfidence,
    0.1,
    0.99
  );
}

function readSimpletexAutoAcceptConfidenceThreshold() {
  return boundedNumber(
    process.env.HANDWRITING_RECOGNITION_SIMPLETEX_AUTO_ACCEPT_CONFIDENCE_THRESHOLD,
    defaultSimpletexAutoAcceptConfidence,
    0.1,
    0.99
  );
}

function readMathpixAutoAcceptConfidenceThreshold() {
  return boundedNumber(
    process.env.HANDWRITING_RECOGNITION_MATHPIX_AUTO_ACCEPT_CONFIDENCE_THRESHOLD,
    defaultMathpixAutoAcceptConfidence,
    0.1,
    0.99
  );
}

function readSimpletexMaxAttempts() {
  return Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_SIMPLETEX_MAX_ATTEMPTS,
    defaultSimpletexMaxAttempts,
    1,
    3
  ));
}

function readSimpletexRetryDelayMs() {
  return Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_SIMPLETEX_RETRY_DELAY_MS,
    defaultSimpletexRetryDelayMs,
    0,
    2000
  ));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function providerHost(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return "unknown";
  }
}

function scrubProviderDiagnosticText(value: unknown) {
  return String(value ?? "").slice(0, 240).replace(secretLikePattern, "[redacted-token]");
}

function providerErrorDiagnostics(error: unknown) {
  const normalizedError = error instanceof Error ? error : null;
  const cause = normalizedError && isRecord((normalizedError as Error & { cause?: unknown }).cause)
    ? (normalizedError as Error & { cause?: Record<string, unknown> }).cause
    : null;

  return {
    errorName: normalizedError?.name ?? typeof error,
    errorMessage: scrubProviderDiagnosticText(normalizedError?.message ?? error),
    causeCode: typeof cause?.code === "string" ? cause.code : null,
    causeMessage: cause?.message ? scrubProviderDiagnosticText(cause.message) : null
  };
}

function isTransientProviderError(error: unknown) {
  const diagnostics = providerErrorDiagnostics(error);
  if (diagnostics.errorName === "AbortError" || diagnostics.errorName === "TypeError") return true;
  return [
    "ECONNRESET",
    "EPIPE",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_SOCKET",
    "UND_ERR_HEADERS_TIMEOUT"
  ].includes(diagnostics.causeCode ?? "");
}

function readImageDataUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("data:image/")) return undefined;
  return value.length <= maxImageDataUrlLength ? value : undefined;
}

function statusForMediaObjectRead(status: "not-found" | "forbidden" | "expired" | "rejected") {
  if (status === "forbidden") return 403;
  if (status === "expired") return 410;
  if (status === "rejected") return 503;
  return 404;
}

async function governedOcrImageDataUrl({
  imageDataUrl,
  imageObject,
  user
}: {
  imageDataUrl?: string;
  imageObject: unknown;
  user: { id: string; role: string };
}): Promise<{ imageDataUrl?: string; response?: NextResponse }> {
  if (imageDataUrl) {
    const media = imageDataUrlMediaDescriptor(imageDataUrl);
    if (media) {
      const decision = evaluateMediaStoragePolicy({
        policy: mediaStoragePolicyFromEnv(),
        capability: "ai-tutor-ocr",
        media
      });
      if (!decision.allowed) {
        await recordAiGovernanceEvent({
          userId: user.id,
          capability: "ai-tutor-ocr",
          action: "media-policy-blocked",
          reason: decision.code,
          metadata: { code: decision.code }
        }).catch((error) => {
          console.error("Handwriting OCR media governance event recording failed", providerErrorDiagnostics(error));
        });
        return {
          response: NextResponse.json(
            { code: decision.code, error: decision.message },
            { status: decision.code === "object-storage-required" ? 409 : 400 }
          )
        };
      }
    }

    return { imageDataUrl };
  }

  if (imageObject === undefined || imageObject === null || imageObject === "") return {};
  const media = mediaObjectReferenceFromUnknown(imageObject);
  if (!media || !media.objectKey.startsWith("ai-tutor-ocr/")) {
    return { response: NextResponse.json({ error: "OCR image object reference is invalid." }, { status: 400 }) };
  }

  const decision = evaluateMediaStoragePolicy({
    policy: mediaStoragePolicyFromEnv(),
    capability: "ai-tutor-ocr",
    media
  });
  if (!decision.allowed) {
    await recordAiGovernanceEvent({
      userId: user.id,
      capability: "ai-tutor-ocr",
      action: "media-policy-blocked",
      reason: decision.code,
      metadata: { code: decision.code }
    }).catch((error) => {
      console.error("Handwriting OCR object governance event recording failed", providerErrorDiagnostics(error));
    });
    return {
      response: NextResponse.json(
        { code: decision.code, error: decision.message },
        { status: 400 }
      )
    };
  }

  const stored = await readStoredMediaObject({
    objectKey: media.objectKey,
    requester: user
  });
  if (stored.status !== "ok") {
    await recordAiGovernanceEvent({
      userId: user.id,
      capability: "ai-tutor-ocr",
      action: "media-policy-blocked",
      reason: stored.code,
      metadata: { code: stored.code }
    }).catch((error) => {
      console.error("Handwriting OCR object read governance event recording failed", providerErrorDiagnostics(error));
    });
    return {
      response: NextResponse.json(
        { code: stored.code, error: stored.message },
        { status: statusForMediaObjectRead(stored.status) }
      )
    };
  }

  return {
    imageDataUrl: `data:${stored.metadata.mimeType};base64,${stored.bytes.toString("base64")}`
  };
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

function providerSupportsImageInput(provider: LLMProviderName) {
  return provider !== "deepseek";
}

function readVisionProviderConfig(): LLMProviderConfig {
  const fallbackConfig = readQwenImageProviderConfig();
  const apiUrl = readOptionalEnv(process.env.HANDWRITING_RECOGNITION_LLM_API_URL)
    ?? fallbackConfig.apiUrl;
  const model = readOptionalEnv(process.env.HANDWRITING_RECOGNITION_LLM_MODEL)
    ?? fallbackConfig.model;
  const provider = resolveLLMProviderName(apiUrl);

  return {
    apiKey: fallbackConfig.apiKey,
    apiUrl,
    model,
    provider
  };
}

function hasVisiblePenStroke(strokes: HandwritingStroke[]) {
  return strokes.some((stroke) => (stroke.tool ?? "pen") === "pen" && stroke.points.length > 0);
}

function buildResult(
  candidate: ProviderCandidate | null,
  alternatives: HandwritingRecognitionAlternative[],
  reason?: string,
  options: {
    confidenceThreshold?: number;
    forceReview?: boolean;
  } = {}
): HandwritingRecognitionResult {
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

  const confidenceThreshold = options.confidenceThreshold ?? readAcceptedConfidenceThreshold();
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
  const accepted = !options.forceReview
    && Boolean(candidate.text)
    && candidate.confidence !== null
    && candidate.confidence >= confidenceThreshold;

  return {
    text: accepted ? candidate.text : "",
    ...(candidate.latex ? { latex: candidate.latex } : {}),
    confidence: candidate.confidence,
    provider: candidate.provider,
    alternatives: normalizedAlternatives,
    accepted,
    ...(accepted ? {} : { reason: reason ?? "Recognition confidence is below the review threshold." })
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
  return normalizeProviderText(raw);
}

function normalizeProviderText(value: string) {
  return normalizeOcrDecimalSeparators(normalizeHandwritingText(value));
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

  const text = normalizeProviderText(latex);
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

  const timeoutMs = Math.round(boundedNumber(
    process.env.HANDWRITING_RECOGNITION_PROVIDER_TIMEOUT_MS,
    defaultProviderTimeoutMs,
    500,
    60000
  ));
  const deadline = Date.now() + timeoutMs;
  const maxAttempts = readSimpletexMaxAttempts();
  const retryDelayMs = readSimpletexRetryDelayMs();
  const host = providerHost(config.apiUrl);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remainingMs = Math.max(1, deadline - Date.now());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remainingMs);
    const startedAt = Date.now();
    const formData = new FormData();
    const reqData = simpletexRequestFieldsFor(config.apiUrl);
    Object.entries(reqData).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append("file", image.blob, image.fileName);

    try {
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: simpletexAuthHeaders(config, reqData),
        body: formData,
        signal: controller.signal
      });

      const elapsedMs = Date.now() - startedAt;
      if (!response.ok) {
        const bodySample = scrubProviderDiagnosticText(await response.text().catch(() => ""));
        const retryableHttp = response.status === 429 || response.status >= 500;
        if (retryableHttp && attempt < maxAttempts && Date.now() + retryDelayMs < deadline) {
          console.warn("SimpleTex handwriting recognition retrying after HTTP failure", {
            host,
            status: response.status,
            attempt,
            maxAttempts,
            elapsedMs,
            bodySample
          });
          if (retryDelayMs > 0) await sleep(retryDelayMs);
          continue;
        }

        console.error("SimpleTex handwriting recognition failed", {
          host,
          status: response.status,
          attempt,
          maxAttempts,
          elapsedMs,
          bodySample
        });
        return null;
      }

      const data: unknown = await response.json();
      const candidate = normalizeSimpletexCandidate(data);
      if (!candidate) {
        console.warn("SimpleTex handwriting recognition returned no normalized candidate", {
          host,
          attempt,
          maxAttempts,
          elapsedMs,
          preprocessing: image.preprocessing,
          diagnostics: simpletexResponseDiagnostics(data)
        });
      }
      return candidate;
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;
      if (isTransientProviderError(error) && attempt < maxAttempts && Date.now() + retryDelayMs < deadline) {
        console.warn("SimpleTex handwriting recognition retrying after transient request failure", {
          host,
          attempt,
          maxAttempts,
          elapsedMs,
          diagnostics: providerErrorDiagnostics(error)
        });
        if (retryDelayMs > 0) await sleep(retryDelayMs);
        continue;
      }

      console.error("SimpleTex handwriting recognition request failed", {
        host,
        attempt,
        maxAttempts,
        elapsedMs,
        diagnostics: providerErrorDiagnostics(error)
      });
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
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
  const text = typeof value.text === "string" ? normalizeProviderText(value.text) : "";
  const latex = typeof value.latex === "string" ? value.latex.trim() : undefined;
  const confidence = typeof value.confidence === "number" && Number.isFinite(value.confidence)
    ? Math.max(0, Math.min(1, value.confidence > 1 ? value.confidence / 100 : value.confidence))
    : null;
  if (!text) return null;

  const alternatives = Array.isArray(value.alternatives)
    ? value.alternatives
        .map((alternative) => {
          const alternativeText = isRecord(alternative) && typeof alternative.text === "string"
            ? normalizeProviderText(alternative.text)
            : typeof alternative === "string"
              ? normalizeProviderText(alternative)
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
  const governedImage = await governedOcrImageDataUrl({
    imageDataUrl: readImageDataUrl(body.imageDataUrl),
    imageObject: body.imageObject,
    user: authenticated.user
  });
  if (governedImage.response) return governedImage.response;
  const imageDataUrl = governedImage.imageDataUrl;
  const hasPenStroke = hasVisiblePenStroke(strokes);
  if (strokes.length > 0 && !hasPenStroke) {
    return NextResponse.json({ error: "Write with the pen before using handwriting recognition." }, { status: 400 });
  }
  if (!strokes.length && !imageDataUrl) {
    return NextResponse.json({ error: "Write with the pen before using handwriting recognition." }, { status: 400 });
  }

  let rateLimit: Awaited<ReturnType<typeof consumeAiCapabilityRateLimit>>;
  try {
    rateLimit = await consumeAiCapabilityRateLimit({
      userId: authenticated.user.id,
      capability: "ai-tutor-ocr",
      rules: aiCapabilityRateLimitRulesFromEnv("ai-tutor-ocr")
    });
  } catch (error) {
    console.error("Handwriting recognition governance rate-limit lookup failed", providerErrorDiagnostics(error));
    return NextResponse.json(
      { error: "Handwriting recognition governance is temporarily unavailable. Please try again." },
      { status: 503 }
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Handwriting recognition rate limit reached. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
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

  const providerAlternatives: HandwritingRecognitionAlternative[] = [];
  const localCandidate = hasPenStroke ? recognizeLocalNumericDraft(strokes) : null;
  if (isConfidentHandwritingCandidate(localCandidate, readLocalAutoAcceptConfidenceThreshold())) {
    return NextResponse.json(buildResult(localCandidate, providerAlternatives, undefined, {
      confidenceThreshold: readLocalAutoAcceptConfidenceThreshold()
    }));
  }
  if (localCandidate) providerAlternatives.push(...localCandidate.alternatives);

  // HANDWRITING_OCR_PRIMARY=mathpix bypasses the China-hosted SimpleTex hop
  // entirely (US pilot compliance, consultation Q4): strokes go straight to
  // the existing Mathpix path below, with LLM-vision as the final fallback.
  const suppressSimpletex = process.env.HANDWRITING_OCR_PRIMARY?.trim() === "mathpix";
  const simpletexCandidate = suppressSimpletex ? null : await trySimpletexRecognition(imageDataUrl);
  if (simpletexCandidate) {
    const simpletexAutoAcceptConfidence = readSimpletexAutoAcceptConfidenceThreshold();
    const simpletexAssessment = assessSimpletexRouting(simpletexCandidate, {
      autoAcceptConfidence: simpletexAutoAcceptConfidence
    });

    if (simpletexAssessment.canAutoAccept) {
      return NextResponse.json(buildResult(simpletexCandidate, providerAlternatives, undefined, {
        confidenceThreshold: simpletexAutoAcceptConfidence
      }));
    }

    const mathpixCandidate = simpletexAssessment.shouldUpgradeToMathpix && hasPenStroke
      ? await tryMathpixRecognition(strokes)
      : null;

    const selected = selectRoutedHandwritingCandidate({
      simpletex: simpletexCandidate,
      mathpix: mathpixCandidate,
      simpletexAssessment,
      simpletexAutoAcceptConfidence,
      mathpixAutoAcceptConfidence: readMathpixAutoAcceptConfidenceThreshold()
    });
    const routedAlternatives = [
      ...providerAlternatives,
      ...(simpletexCandidate.alternatives ?? [{
        text: simpletexCandidate.text,
        latex: simpletexCandidate.latex,
        confidence: simpletexCandidate.confidence,
        provider: simpletexCandidate.provider
      }]),
      ...(mathpixCandidate?.alternatives ?? []),
      ...(mathpixCandidate ? [{
        text: mathpixCandidate.text,
        latex: mathpixCandidate.latex,
        confidence: mathpixCandidate.confidence,
        provider: mathpixCandidate.provider
      }] : [])
    ];

    return NextResponse.json(buildResult(
      selected.candidate,
      routedAlternatives,
      selected.reason,
      {
        confidenceThreshold: selected.candidate.provider === "mathpix"
          ? readMathpixAutoAcceptConfidenceThreshold()
          : simpletexAutoAcceptConfidence,
        forceReview: selected.forceReview
      }
    ));
  }

  const mathpixCandidate = hasPenStroke ? await tryMathpixRecognition(strokes) : null;
  if (mathpixCandidate) {
    return NextResponse.json(buildResult(mathpixCandidate, providerAlternatives, undefined, {
      confidenceThreshold: readMathpixAutoAcceptConfidenceThreshold()
    }));
  }

  const llmCandidate = await tryLLMRecognition(imageDataUrl);
  if (llmCandidate) {
    return NextResponse.json(buildResult(llmCandidate, providerAlternatives));
  }

  return NextResponse.json(buildResult(null, providerAlternatives, "Draw clearer handwriting, then convert again."));
}
