export type LLMProviderName = "deepseek" | "qwen" | "deepinfra" | "openai-compatible";
export type AITutorPreferredTextProvider = "qwen" | "deepinfra";
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

export const defaultDeepSeekApiUrl = "https://api.deepseek.com/chat/completions";
export const defaultDeepSeekModel = "deepseek-v4-pro";
export const defaultQwenApiUrl = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
export const dashScopeRegionalHosts = [
  "dashscope-intl.aliyuncs.com",
  "dashscope-us.aliyuncs.com",
  "dashscope.aliyuncs.com"
] as const;
export const defaultQwenTextModel = "qwen3.8-max";
export const defaultQwenImageModel = "qwen3.7-plus";
export const defaultQwenRealtimeApiUrl = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime";
export const defaultQwenRealtimeModel = "qwen3.5-omni-flash-realtime";
export const defaultQwenAsrRealtimeModel = "qwen3-asr-flash-realtime";
// US-hosted open-weight path (consultation Q3): DeepInfra serves the same Qwen
// vision family the tutor is tuned for, US-hosted with a no-train default —
// the compliance-clean default once DEEPINFRA_API_KEY is provisioned.
export const defaultDeepInfraApiUrl = "https://api.deepinfra.com/v1/openai/chat/completions";
export const defaultDeepInfraTextModel = "Qwen/Qwen3-VL-30B-A3B-Instruct";
export const defaultDeepInfraVisionModel = "Qwen/Qwen3-VL-30B-A3B-Instruct";

const aiTutorProviderProfiles = new Set<AITutorProviderProfile>([
  "offline-fixture",
  "mocked-live",
  "live-smoke",
  "production",
  "runtime"
]);

export function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.length >= 2 && trimmed.endsWith(quote)) {
    const unquoted = trimmed.slice(1, -1).trim();
    return unquoted || undefined;
  }
  return trimmed;
}

export function readProviderApiKey(value: string | undefined) {
  const normalized = readOptionalEnv(value);
  if (!normalized) return undefined;
  return normalized.replace(/^bearer\s+/i, "").trim() || undefined;
}

export function readAITutorProviderProfile(value = process.env.AI_TUTOR_PROVIDER_PROFILE): AITutorProviderProfile {
  const normalized = value?.trim();
  if (normalized && aiTutorProviderProfiles.has(normalized as AITutorProviderProfile)) {
    return normalized as AITutorProviderProfile;
  }
  return "runtime";
}

export function isDeepSeekApiUrl(apiUrl: string) {
  try {
    return new URL(apiUrl).hostname === "api.deepseek.com";
  } catch {
    return apiUrl.includes("api.deepseek.com");
  }
}

export function isDashScopeRegionalHost(hostname: string) {
  return (dashScopeRegionalHosts as readonly string[]).includes(hostname);
}

function isQwenApiUrl(apiUrl: string) {
  try {
    return isDashScopeRegionalHost(new URL(apiUrl).hostname);
  } catch {
    return apiUrl.includes("dashscope");
  }
}

export function rewriteDashScopeApiUrlHost(apiUrl: string, hostname: string) {
  if (!isDashScopeRegionalHost(hostname)) return undefined;
  try {
    const url = new URL(apiUrl);
    if (!isDashScopeRegionalHost(url.hostname)) return undefined;
    url.hostname = hostname;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function dashScopeRegionalApiUrls(apiUrl: string) {
  try {
    const url = new URL(apiUrl);
    if (!isDashScopeRegionalHost(url.hostname)) return [apiUrl];
    return dashScopeRegionalHosts.map((hostname) => {
      const next = new URL(url);
      next.hostname = hostname;
      return next.toString();
    });
  } catch {
    return [apiUrl];
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

export function readLLMProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.DEEPSEEK_API_URL)
    ?? readOptionalEnv(process.env.LLM_API_URL)
    ?? defaultDeepSeekApiUrl;

  return {
    apiKey: readProviderApiKey(process.env.DEEPSEEK_API_KEY) ?? readProviderApiKey(process.env.LLM_API_KEY),
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
    apiKey: readProviderApiKey(process.env.QWEN_API_KEY),
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
    apiKey: readProviderApiKey(process.env.DEEPINFRA_API_KEY),
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
    apiKey: readProviderApiKey(process.env.DEEPINFRA_API_KEY),
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
    apiKey: readProviderApiKey(process.env.QWEN_API_KEY),
    apiUrl,
    model: readOptionalEnv(process.env.QWEN_IMAGE_MODEL) ?? defaultQwenImageModel,
    provider: "qwen"
  };
}

export function readAITutorImageProviderConfig(): LLMProviderConfig {
  const qwen = readAITutorQwenImageProviderConfig();
  const deepinfra = readDeepInfraVisionProviderConfig();
  const ordered = readAITutorPreferredTextProvider() === "deepinfra" ? [deepinfra, qwen] : [qwen, deepinfra];
  return ordered.find((candidate) => Boolean(candidate.apiKey)) ?? ordered[0];
}

export function readQwenRealtimeProviderConfig(): LLMProviderConfig {
  const apiUrl = readOptionalEnv(process.env.QWEN_REALTIME_API_URL) ?? defaultQwenRealtimeApiUrl;

  return {
    apiKey: readProviderApiKey(process.env.QWEN_API_KEY),
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
    apiKey: readProviderApiKey(process.env.QWEN_API_KEY),
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
