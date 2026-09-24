import * as http from "node:http";
import * as https from "node:https";
import { isIP } from "node:net";
import {
  dashScopeRegionalApiUrls,
  isDashScopeRegionalHost,
  isDeepSeekApiUrl,
  rewriteDashScopeApiUrlHost,
  type LLMProviderConfig,
  type LLMProviderName
} from "../llmProviderConfig";

export type {
  AITutorCapabilityStatus,
  AITutorPreferredTextProvider,
  AITutorProviderProfile,
  AITutorProviderReadiness,
  AITutorProviderStatus,
  LLMProviderConfig,
  LLMProviderName
} from "../llmProviderConfig";
export {
  buildAITutorCapabilityStatus,
  dashScopeRegionalApiUrls,
  dashScopeRegionalHosts,
  isDashScopeRegionalHost,
  readAITutorImageProviderConfig,
  readAITutorPreferredTextProvider,
  readAITutorProviderProfile,
  readAITutorProviderStatus,
  readAITutorTextProviderConfigs,
  readDeepInfraTextProviderConfig,
  readDeepInfraVisionProviderConfig,
  readLLMProviderConfig,
  readOptionalEnv,
  readProviderApiKey,
  readQwenAsrRealtimeProviderConfig,
  readQwenImageProviderConfig,
  readQwenRealtimeProviderConfig,
  readQwenTextProviderConfig,
  resolveLLMProviderName,
  rewriteDashScopeApiUrlHost
} from "../llmProviderConfig";

export type LLMProviderContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } };

export type LLMProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | LLMProviderContentPart[];
};

export type LLMProviderResponseFormat = "json_object";
export type LLMProviderThinkingMode = "enabled" | "disabled";

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

export const AI_TUTOR_DEFAULT_MAX_COMPLETION_TOKENS = 900;
export const AI_TUTOR_MAX_COMPLETION_TOKENS_CAP = 1_200;

export function resolveLLMMaxCompletionTokens(
  value: string | undefined,
  fallback = AI_TUTOR_DEFAULT_MAX_COMPLETION_TOKENS,
  max = AI_TUTOR_MAX_COMPLETION_TOKENS_CAP
) {
  return boundedLLMNumber(value, fallback, 100, max);
}

export function isTransientLLMProviderHttpStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function isDashScopeRegionalAuthFailureStatus(status: number) {
  return status === 401;
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

export function resolveNovaQwenThinkingMode(
  provider: LLMProviderName,
  _model: string
): LLMProviderThinkingMode | undefined {
  if (provider !== "qwen") return undefined;
  return "disabled";
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
  if (config.provider !== "qwen") {
    return fetchLLMProviderOnce(config.apiUrl, init, config, pinnedIp);
  }
  return fetchQwenWithDashScopeRegionalFailover(config, init, pinnedIp);
}

async function fetchLLMProviderOnce(
  apiUrl: string,
  init: RequestInit,
  config: LLMProviderConfig,
  pinnedIp?: string
): Promise<LLMProviderHttpResponse> {
  const plan = buildLLMProviderTransportPlan({ ...config, apiUrl }, pinnedIp);
  if (plan.mode === "fetch") return fetch(apiUrl, init);
  return fetchWithPinnedIp(apiUrl, init, plan);
}

let rememberedDashScopeHost: string | undefined;

export function resetDashScopeRegionalPreferenceForTests() {
  rememberedDashScopeHost = undefined;
}

function hostnameOf(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname;
  } catch {
    return "";
  }
}

function rememberDashScopeHostFromUrl(apiUrl: string) {
  const hostname = hostnameOf(apiUrl);
  if (isDashScopeRegionalHost(hostname)) {
    rememberedDashScopeHost = hostname;
  }
}

function orderedDashScopeRequestUrls(apiUrl: string) {
  const preferred = rememberedDashScopeHost
    ? rewriteDashScopeApiUrlHost(apiUrl, rememberedDashScopeHost) ?? apiUrl
    : apiUrl;
  const urls = [preferred];
  for (const candidate of dashScopeRegionalApiUrls(apiUrl)) {
    if (!urls.includes(candidate)) urls.push(candidate);
  }
  return urls;
}

async function fetchQwenWithDashScopeRegionalFailover(
  config: LLMProviderConfig,
  init: RequestInit,
  pinnedIp?: string
): Promise<LLMProviderHttpResponse> {
  const urls = orderedDashScopeRequestUrls(config.apiUrl);
  const firstUrl = urls[0] ?? config.apiUrl;
  let lastResponse = await fetchLLMProviderOnce(firstUrl, init, config, pinnedIp);
  if (lastResponse.ok) {
    rememberDashScopeHostFromUrl(firstUrl);
    return lastResponse;
  }
  if (!isDashScopeRegionalAuthFailureStatus(lastResponse.status) || urls.length <= 1) {
    return lastResponse;
  }

  const fromHost = hostnameOf(firstUrl);
  for (const apiUrl of urls.slice(1)) {
    console.info("LLM provider DashScope regional failover", {
      fromHost,
      toHost: hostnameOf(apiUrl),
      status: lastResponse.status
    });
    lastResponse = await fetchLLMProviderOnce(apiUrl, init, config, pinnedIp);
    if (lastResponse.ok) {
      rememberDashScopeHostFromUrl(apiUrl);
      return lastResponse;
    }
    if (!isDashScopeRegionalAuthFailureStatus(lastResponse.status)) {
      return lastResponse;
    }
  }

  return lastResponse;
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
