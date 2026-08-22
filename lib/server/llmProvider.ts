import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";

export type LLMProviderContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type LLMProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | LLMProviderContentPart[];
};

export type LLMProviderName = "deepseek" | "qwen" | "deepinfra" | "openai-compatible";
export type AITutorPreferredTextProvider = "qwen" | "deepinfra";
export type LLMProviderResponseFormat = "json_object";
export type LLMProviderThinkingMode = "enabled" | "disabled";

export type LLMProviderConfig = {
  apiKey?: string;
  apiUrl: string;
  model: string;
  provider: LLMProviderName;
};
export type AITutorProviderProfile = "offline-fixture" | "mocked-live" | "live-smoke" | "production" | "runtime";
export type AITutorProviderReadiness = "configured" | "missing-key" | "disabled-by-test-profile";
export type AITutorCapabilityStatus = {
  configured: boolean;
  health: {
    checked: false;
    state: "not-checked";
  };
  model: string;
  profile: AITutorProviderProfile;
  provider: LLMProviderName;
  readiness: AITutorProviderReadiness;
};
export type AITutorProviderStatus = AITutorCapabilityStatus & {
  mode: "live" | "local-helper";
  text: AITutorCapabilityStatus & {
    candidates: AITutorCapabilityStatus[];
    preferredProvider: AITutorPreferredTextProvider;
  };
  image: AITutorCapabilityStatus;
  voice: AITutorCapabilityStatus;
  speech: AITutorCapabilityStatus;
};

export type LLMProviderUsage = {
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
};
export type LLMProviderTransportPlan =
  | { mode: "fetch" }
  | {
      mode: "pinned-ip";
      hostHeader: string;
      requestHostname: string;
      requestPort: number;
      servername: string;
    };
export type LLMProviderHttpResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

const defaultDeepSeekApiUrl = "https://api.deepseek.com/chat/completions";
const defaultDeepSeekModel = "deepseek-v4-pro";
const defaultQwenApiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
const defaultQwenTextModel = "qwen3.8-max";
const defaultQwenImageModel = "qwen3.7-plus";
const defaultQwenRealtimeApiUrl = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
const defaultQwenRealtimeModel = "qwen3.5-omni-flash-realtime";
const defaultQwenAsrRealtimeModel = "qwen3-asr-flash-realtime";
// US-hosted open-weight path (consultation Q3): DeepInfra serves the same Qwen
// vision family the tutor is tuned for, US-hosted with a no-train default —
// the compliance-clean default once DEEPINFRA_API_KEY is provisioned.
const defaultDeepInfraApiUrl = "https://api.deepinfra.com/v1/openai/chat/completions";
const defaultDeepInfraTextModel = "Qwen/Qwen3-VL-30B-A3B-Instruct";
const defaultDeepInfraVisionModel = "Qwen/Qwen3-VL-30B-A3B-Instruct";
const aiTutorProviderProfiles = new Set<AITutorProviderProfile>([
  "offline-fixture",
  "mocked-live",
  "live-smoke",
  "production",
  "runtime"
]);

export function boundedLLMNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function resolveLLMProviderTimeoutMs(value: string | undefined, fallback = 8_000, max = 12_000) {
  return boundedLLMNumber(value, fallback, 250, max);
}

export function resolveAITutorProviderTimeoutMs(value: string | undefined) {
  return resolveLLMProviderTimeoutMs(value, 8_000, 12_000);
}

export function resolveLLMMaxCompletionTokens(value: string | undefined, fallback = 450, max = 600) {
  return boundedLLMNumber(value, fallback, 100, max);
}

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function readAITutorProviderProfile(value = process.env.AI_TUTOR_PROVIDER_PROFILE): AITutorProviderProfile {
  const normalized = value?.trim();
  if (normalized && aiTutorProviderProfiles.has(normalized as AITutorProviderProfile)) {
    return normalized as AITutorProviderProfile;
  }
  return "runtime";
}

function isDeepSeekApiUrl(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname === "api.deepseek.com";
  } catch {
    return apiUrl.includes("api.deepseek.com");
  }
}

function isQwenApiUrl(apiUrl: string) {
  try {
    const hostname = new URL(apiUrl).hostname;
    return hostname === "dashscope.aliyuncs.com" ||
      hostname === "dashscope-intl.aliyuncs.com" ||
      hostname === "dashscope-us.aliyuncs.com";
  } catch {
    return apiUrl.includes("dashscope");
  }
}

function isDeepInfraApiUrl(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname === "api.deepinfra.com";
  } catch {
    return apiUrl.includes("api.deepinfra.com");
  }
}

export function resolveLLMProviderName(apiUrl: string): LLMProviderName {
  if (isDeepSeekApiUrl(apiUrl)) return "deepseek";
  if (isQwenApiUrl(apiUrl)) return "qwen";
  if (isDeepInfraApiUrl(apiUrl)) return "deepinfra";
  return "openai-compatible";
}

export function resolveProviderApiPinnedIp(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return isIP(trimmed) ? trimmed : undefined;
}

export function buildLLMProviderTransportPlan(
  config: LLMProviderConfig,
  pinnedIp = process.env.DEEPSEEK_API_RESOLVE_IP
): LLMProviderTransportPlan {
  const resolvedIp = resolveProviderApiPinnedIp(pinnedIp);
  if (!resolvedIp || config.provider !== "deepseek" || !isDeepSeekApiUrl(config.apiUrl)) {
    return { mode: "fetch" };
  }

  try {
    const apiUrl = new URL(config.apiUrl);
    if (apiUrl.protocol !== "https:" && apiUrl.protocol !== "http:") return { mode: "fetch" };
    const defaultPort = apiUrl.protocol === "https:" ? 443 : 80;
    const requestPort = apiUrl.port ? Number(apiUrl.port) : defaultPort;
    if (!Number.isFinite(requestPort)) return { mode: "fetch" };

    return {
      mode: "pinned-ip",
      hostHeader: apiUrl.port ? `${apiUrl.hostname}:${apiUrl.port}` : apiUrl.hostname,
      requestHostname: resolvedIp,
      requestPort,
      servername: apiUrl.hostname
    };
  } catch {
    return { mode: "fetch" };
  }
}

export function readLLMProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.DEEPSEEK_API_URL)
    ?? readOptionalEnv(process.env.LLM_API_URL)
    ?? defaultDeepSeekApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.DEEPSEEK_API_KEY) ?? readOptionalEnv(process.env.LLM_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.DEEPSEEK_MODEL) ?? readOptionalEnv(process.env.LLM_MODEL) ?? defaultDeepSeekModel,
    provider: resolveLLMProviderName(apiUrl)
  };
}

export function readQwenTextProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.QWEN_TEXT_API_URL)
    ?? readOptionalEnv(process.env.QWEN_API_URL)
    ?? defaultQwenApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.QWEN_TEXT_MODEL)
      ?? readOptionalEnv(process.env.QWEN_MODEL)
      ?? defaultQwenTextModel,
    // QWEN_* variables describe a Qwen contract even when Alibaba serves it
    // from a workspace-scoped MAAS hostname rather than the legacy DashScope
    // hostname. Keep that explicit identity instead of guessing from the URL.
    provider: "qwen"
  };
}

export function readDeepInfraTextProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.DEEPINFRA_API_URL) ?? defaultDeepInfraApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.DEEPINFRA_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.DEEPINFRA_TEXT_MODEL)
      ?? readOptionalEnv(process.env.DEEPINFRA_MODEL)
      ?? defaultDeepInfraTextModel,
    provider: resolveLLMProviderName(apiUrl)
  };
}

export function readDeepInfraVisionProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.DEEPINFRA_API_URL) ?? defaultDeepInfraApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.DEEPINFRA_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.DEEPINFRA_VISION_MODEL)
      ?? readOptionalEnv(process.env.DEEPINFRA_MODEL)
      ?? defaultDeepInfraVisionModel,
    provider: resolveLLMProviderName(apiUrl)
  };
}

export function readAITutorPreferredTextProvider(
  value = process.env.AI_TUTOR_PREFERRED_TEXT_PROVIDER
): AITutorPreferredTextProvider {
  return value?.trim() === "deepinfra" ? "deepinfra" : "qwen";
}

export function readAITutorTextProviderConfigs() {
  const qwen = readQwenTextProviderConfig();
  const deepinfra = readDeepInfraTextProviderConfig();
  const preferredProvider = readAITutorPreferredTextProvider();
  const ordered = preferredProvider === "deepinfra" ? [deepinfra, qwen] : [qwen, deepinfra];
  // The preferred provider leads, but a keyless preference never orphans the
  // tutor: the first *configured* candidate becomes primary.
  const primary = ordered.find((candidate) => Boolean(candidate.apiKey)) ?? ordered[0];

  return {
    preferredProvider,
    primary,
    candidates: ordered,
    allCandidates: ordered
  };
}

export function readAITutorImageProviderConfig(): LLMProviderConfig {
  const qwen = readAITutorQwenImageProviderConfig();
  const deepinfra = readDeepInfraVisionProviderConfig();
  const ordered = readAITutorPreferredTextProvider() === "deepinfra" ? [deepinfra, qwen] : [qwen, deepinfra];
  return ordered.find((candidate) => Boolean(candidate.apiKey)) ?? ordered[0];
}

function readAITutorQwenImageProviderConfig(): LLMProviderConfig {
  return {
    ...readQwenImageProviderConfig(),
    model: readOptionalEnv(process.env.AI_TUTOR_QWEN_IMAGE_MODEL) ?? defaultQwenTextModel
  };
}

export function readQwenImageProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.QWEN_IMAGE_API_URL)
    ?? readOptionalEnv(process.env.QWEN_API_URL)
    ?? defaultQwenApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.QWEN_IMAGE_MODEL) ?? defaultQwenImageModel,
    provider: "qwen"
  };
}

export function resolveNovaQwenThinkingMode(
  provider: LLMProviderName,
  model: string
): LLMProviderThinkingMode | undefined {
  if (provider !== "qwen") return undefined;
  return model.trim().toLowerCase() === defaultQwenTextModel ? "disabled" : undefined;
}

export type LLMProviderCircuitBreaker = {
  isOpen: (config: LLMProviderConfig) => boolean;
  recordFailure: (config: LLMProviderConfig) => void;
  recordSuccess: (config: LLMProviderConfig) => void;
  snapshot: (config: LLMProviderConfig) => {
    failures: number;
    openedUntilMs: number | null;
    open: boolean;
  };
};

type LLMProviderCircuitState = {
  failures: number;
  openedUntilMs?: number;
};

export function llmProviderConfigKey(config: LLMProviderConfig) {
  return `${config.provider}:${config.apiUrl}:${config.model}`;
}

export function createLLMProviderCircuitBreaker({
  failureThreshold = 2,
  cooldownMs = 60_000,
  now = Date.now
}: {
  failureThreshold?: number;
  cooldownMs?: number;
  now?: () => number;
} = {}): LLMProviderCircuitBreaker {
  const states = new Map<string, LLMProviderCircuitState>();
  const threshold = Math.max(1, Math.round(failureThreshold));
  const cooldown = Math.max(1_000, Math.round(cooldownMs));

  function getState(config: LLMProviderConfig) {
    const key = llmProviderConfigKey(config);
    const state = states.get(key) ?? { failures: 0 };
    states.set(key, state);
    return state;
  }

  return {
    isOpen(config) {
      const state = getState(config);
      return typeof state.openedUntilMs === "number" && now() < state.openedUntilMs;
    },
    recordFailure(config) {
      const state = getState(config);
      state.failures += 1;
      if (state.failures >= threshold) {
        state.openedUntilMs = now() + cooldown;
      }
    },
    recordSuccess(config) {
      const state = getState(config);
      state.failures = 0;
      delete state.openedUntilMs;
    },
    snapshot(config) {
      const state = getState(config);
      const open = typeof state.openedUntilMs === "number" && now() < state.openedUntilMs;
      return {
        failures: state.failures,
        openedUntilMs: open ? state.openedUntilMs ?? null : null,
        open
      };
    }
  };
}

export function selectAvailableLLMProviderConfig(
  configs: LLMProviderConfig[],
  circuitBreaker?: Pick<LLMProviderCircuitBreaker, "isOpen">
) {
  return configs.find((config) => Boolean(config.apiKey) && !circuitBreaker?.isOpen(config));
}

function normalizeHeaders(headers: HeadersInit | undefined) {
  const normalized: Record<string, string> = {};
  if (!headers) return normalized;

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      normalized[key] = value;
    });
    return normalized;
  }

  Object.entries(headers).forEach(([key, value]) => {
    normalized[key] = value;
  });
  return normalized;
}

function createAbortError() {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

function isSupportedPinnedBody(body: BodyInit | null | undefined): body is string | Buffer {
  return typeof body === "string" || Buffer.isBuffer(body);
}

async function fetchWithPinnedIp(
  apiUrl: string,
  init: RequestInit,
  plan: Extract<LLMProviderTransportPlan, { mode: "pinned-ip" }>
): Promise<LLMProviderHttpResponse> {
  if (!isSupportedPinnedBody(init.body)) return fetch(apiUrl, init);

  const parsedUrl = new URL(apiUrl);
  const requestModule = parsedUrl.protocol === "http:" ? http : https;
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    ...normalizeHeaders(init.headers),
    Host: plan.hostHeader
  };
  const hasContentLength = Object.keys(headers).some((key) => key.toLowerCase() === "content-length");
  if (!hasContentLength) {
    headers["Content-Length"] = String(Buffer.byteLength(init.body));
  }

  return new Promise((resolve, reject) => {
    const signal = init.signal;
    const cleanupAbort = () => {
      signal?.removeEventListener("abort", abortRequest);
    };
    const abortRequest = () => {
      request.destroy(createAbortError());
    };
    const request = requestModule.request({
      hostname: plan.requestHostname,
      port: plan.requestPort,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method,
      headers,
      ...(parsedUrl.protocol === "https:" ? { servername: plan.servername } : {})
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      response.on("end", () => {
        cleanupAbort();
        const bodyText = Buffer.concat(chunks).toString("utf8");
        const status = response.statusCode ?? 0;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          json: async () => JSON.parse(bodyText) as unknown,
          text: async () => bodyText
        });
      });
    });

    request.on("error", (error) => {
      cleanupAbort();
      reject(error);
    });

    if (signal?.aborted) {
      request.destroy(createAbortError());
      return;
    }

    signal?.addEventListener("abort", abortRequest, { once: true });
    request.end(init.body);
  });
}

export function fetchLLMProviderResponse(
  config: LLMProviderConfig,
  init: RequestInit,
  pinnedIp = process.env.DEEPSEEK_API_RESOLVE_IP
): Promise<LLMProviderHttpResponse> {
  const plan = buildLLMProviderTransportPlan(config, pinnedIp);
  if (plan.mode === "fetch") return fetch(config.apiUrl, init);
  return fetchWithPinnedIp(config.apiUrl, init, plan);
}

export function readQwenRealtimeProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.QWEN_REALTIME_API_URL) ?? defaultQwenRealtimeApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.QWEN_REALTIME_MODEL) ?? defaultQwenRealtimeModel,
    provider: "qwen"
  };
}

export function readQwenAsrRealtimeProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.QWEN_ASR_REALTIME_API_URL)
    ?? readOptionalEnv(process.env.QWEN_REALTIME_API_URL)
    ?? defaultQwenRealtimeApiUrl;

  return {
    apiKey: readOptionalEnv(process.env.QWEN_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.QWEN_ASR_REALTIME_MODEL) ?? defaultQwenAsrRealtimeModel,
    provider: "qwen"
  };
}

export function buildAITutorCapabilityStatus(
  config: LLMProviderConfig,
  profile = readAITutorProviderProfile()
): AITutorCapabilityStatus {
  const configured = profile === "offline-fixture" ? false : Boolean(config.apiKey);
  const readiness: AITutorProviderReadiness = profile === "offline-fixture"
    ? "disabled-by-test-profile"
    : configured
      ? "configured"
      : "missing-key";

  return {
    configured,
    health: {
      checked: false,
      state: "not-checked"
    },
    model: config.model,
    profile,
    provider: config.provider,
    readiness
  };
}

export function readAITutorProviderStatus(profile = readAITutorProviderProfile()): AITutorProviderStatus {
  const textProviders = readAITutorTextProviderConfigs();
  const textProvider = textProviders.primary;
  const text = {
    ...buildAITutorCapabilityStatus(textProvider, profile),
    candidates: textProviders.candidates.map((candidate) => buildAITutorCapabilityStatus(candidate, profile)),
    preferredProvider: textProviders.preferredProvider
  };
  const image = buildAITutorCapabilityStatus(readAITutorImageProviderConfig(), profile);
  const voice = buildAITutorCapabilityStatus(readQwenRealtimeProviderConfig(), profile);
  const speech = buildAITutorCapabilityStatus(readQwenAsrRealtimeProviderConfig(), profile);

  return {
    ...text,
    mode: text.configured ? "live" : "local-helper",
    text,
    image,
    voice,
    speech
  };
}

export function buildLLMProviderRequestBody({
  model,
  messages,
  maxTokens,
  provider,
  responseFormat,
  deepSeekThinking,
  qwenThinking
}: {
  model: string;
  messages: LLMProviderMessage[];
  maxTokens: number;
  provider: LLMProviderName;
  responseFormat?: LLMProviderResponseFormat;
  deepSeekThinking?: LLMProviderThinkingMode;
  qwenThinking?: LLMProviderThinkingMode;
}) {
  const structuredOutput = responseFormat ? { response_format: { type: responseFormat } } : {};

  if (provider === "deepseek") {
    const thinkingMode = deepSeekThinking ?? "enabled";
    return {
      model,
      messages,
      ...structuredOutput,
      thinking: { type: thinkingMode },
      ...(thinkingMode === "enabled" ? { reasoning_effort: "high" } : {}),
      stream: false,
      max_tokens: maxTokens
    };
  }

  if (provider === "qwen" || provider === "deepinfra") {
    return {
      model,
      messages,
      ...structuredOutput,
      ...(provider === "qwen" && qwenThinking
        ? { enable_thinking: qwenThinking === "enabled" }
        : {}),
      stream: false,
      max_tokens: maxTokens
    };
  }

  return {
    model,
    messages,
    ...structuredOutput,
    max_completion_tokens: maxTokens
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function extractLLMTextContent(content: unknown): string {
  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!isRecord(part)) return "";
        if (typeof part.text === "string") return part.text;
        if (typeof part.content === "string") return part.content;
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export function extractLLMProviderReply(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) return "";

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return "";

  return extractLLMTextContent(firstChoice.message.content);
}

export function extractLLMProviderFinishReason(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.choices)) return null;

  const firstChoice = value.choices[0];
  if (!isRecord(firstChoice)) return null;

  return typeof firstChoice.finish_reason === "string" ? firstChoice.finish_reason : null;
}

export function extractLLMProviderUsage(value: unknown): LLMProviderUsage {
  if (!isRecord(value) || !isRecord(value.usage)) return {};
  return {
    promptTokens: typeof value.usage.prompt_tokens === "number" ? value.usage.prompt_tokens : null,
    completionTokens: typeof value.usage.completion_tokens === "number" ? value.usage.completion_tokens : null,
    totalTokens: typeof value.usage.total_tokens === "number" ? value.usage.total_tokens : null
  };
}
