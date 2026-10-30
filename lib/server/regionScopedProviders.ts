import { hasUnrestrictedProviderCompanies, isAiProviderAllowedForRegion, resolveAiServiceCompany, type ProviderPolicyRegion } from "@/lib/aiProviderCompanyPolicy";
import {
  buildAITutorCapabilityStatus,
  readAITutorImageProviderConfig,
  readAITutorProviderProfile,
  readAITutorTextProviderConfigs,
  readOpenRouterTextProviderConfig,
  readOpenRouterVisionProviderConfig,
  readLLMProviderConfig,
  readQwenAsrRealtimeProviderConfig,
  readQwenRealtimeProviderConfig,
  readQwenImageProviderConfig,
  type AITutorCapabilityStatus,
  type AITutorProviderStatus,
  type LLMProviderConfig
} from "@/lib/llmProviderConfig";

export function allowedProviderCandidates(region: ProviderPolicyRegion, candidates: readonly LLMProviderConfig[]) {
  return candidates.filter(candidate => isAiProviderAllowedForRegion(region, candidate.apiUrl));
}

export function selectRegionScopedProvider(region: ProviderPolicyRegion, candidates: readonly LLMProviderConfig[]): LLMProviderConfig | null {
  const allowed = allowedProviderCandidates(region, candidates);
  return allowed.find(candidate => Boolean(candidate.apiKey)) ?? allowed[0] ?? null;
}

export function readRegionScopedTutorTextProviders(region: ProviderPolicyRegion): LLMProviderConfig[] {
  if (!hasUnrestrictedProviderCompanies(region)) {
    const config = readOpenRouterTextProviderConfig();
    return resolveAiServiceCompany(config.apiUrl) === "openrouter" ? [config] : [];
  }
  return allowedProviderCandidates(region, readAITutorTextProviderConfigs().candidates);
}

export function readRegionScopedTutorImageConfig(region: ProviderPolicyRegion): LLMProviderConfig | null {
  if (!hasUnrestrictedProviderCompanies(region)) {
    const config = readOpenRouterVisionProviderConfig();
    return resolveAiServiceCompany(config.apiUrl) === "openrouter" ? config : null;
  }
  const preferred = readAITutorImageProviderConfig();
  if (isAiProviderAllowedForRegion(region, preferred.apiUrl)) return preferred;
  return null;
}

export function readRegionScopedGeneralImageConfig(region: ProviderPolicyRegion): LLMProviderConfig | null {
  if (!hasUnrestrictedProviderCompanies(region)) return readRegionScopedTutorImageConfig(region);
  const preferred = readQwenImageProviderConfig();
  if (isAiProviderAllowedForRegion(region, preferred.apiUrl)) return preferred;
  return null;
}

export function readRegionScopedGeneralProviderConfig(region: ProviderPolicyRegion): LLMProviderConfig | null {
  if (!hasUnrestrictedProviderCompanies(region)) return readRegionScopedTutorTextProviders(region)[0] ?? null;
  const preferred = readLLMProviderConfig();
  if (isAiProviderAllowedForRegion(region, preferred.apiUrl)) return preferred;
  return null;
}

export function readRegionScopedAITutorProviderStatus(region: ProviderPolicyRegion): AITutorProviderStatus {
  const profile = readAITutorProviderProfile();
  const originalText = readAITutorTextProviderConfigs();
  const candidates = readRegionScopedTutorTextProviders(region);
  const selectedText = candidates.find(candidate => Boolean(candidate.apiKey)) ?? candidates[0];
  function capability(config: LLMProviderConfig | null | undefined, original: LLMProviderConfig): AITutorCapabilityStatus {
    if (config && isAiProviderAllowedForRegion(region, config.apiUrl)) {
      const status = buildAITutorCapabilityStatus(config, profile);
      return config.provider === "openrouter" && !config.model && profile !== "offline-fixture"
        ? { ...status, configured: false, readiness: "missing-model" }
        : status;
    }
    return { ...buildAITutorCapabilityStatus(original, profile), configured: false, readiness: "blocked-by-region-policy" };
  }
  const text = {
    ...capability(selectedText, originalText.primary),
    candidates: candidates.map(candidate => buildAITutorCapabilityStatus(candidate, profile)),
    preferredProvider: !hasUnrestrictedProviderCompanies(region) ? "openrouter" as const : originalText.preferredProvider
  };
  return {
    ...text,
    mode: text.configured ? "live" : "local-helper",
    text,
    image: capability(readRegionScopedTutorImageConfig(region), readAITutorImageProviderConfig()),
    voice: capability(readQwenRealtimeProviderConfig(), readQwenRealtimeProviderConfig()),
    speech: capability(readQwenAsrRealtimeProviderConfig(), readQwenAsrRealtimeProviderConfig())
  };
}
