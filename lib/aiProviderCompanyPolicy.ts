import type { CurriculumRegion } from "@/types";

export type ProviderPolicyRegion = CurriculumRegion | null;
export type AiServiceCompany = "openrouter" | "deepinfra" | "mathpix" | "openai" | "anthropic" | "alibaba" | "deepseek" | "simpletex" | "unknown";

// Company identity follows the API operator, not the model or datacenter label.
// Evidence and the owner's policy are recorded in the implementation plan.
const companiesByHost: Readonly<Record<string, AiServiceCompany>> = Object.freeze({
  "openrouter.ai": "openrouter",
  "api.deepinfra.com": "deepinfra",
  "api.mathpix.com": "mathpix",
  "api.openai.com": "openai",
  "api.anthropic.com": "anthropic",
  "dashscope.aliyuncs.com": "alibaba",
  "dashscope-intl.aliyuncs.com": "alibaba",
  "dashscope-us.aliyuncs.com": "alibaba",
  "api.deepseek.com": "deepseek",
  "server.simpletex.cn": "simpletex"
});
const usCompanies = new Set<AiServiceCompany>(["openrouter", "deepinfra", "mathpix", "openai", "anthropic"]);
// OpenRouter is the gateway; its inference providers must also satisfy the
// owner's US-company rule. These are documented OpenRouter provider slugs.
export const openRouterUsProviderSlugs = Object.freeze(["openai", "anthropic", "google-vertex", "amazon-bedrock", "azure", "deepinfra"]);

export function hasUnrestrictedProviderCompanies(region: ProviderPolicyRegion) {
  return region === "HK" || region === "MAINLAND";
}

export function normalizeProviderVoiceText(value: unknown) {
  return typeof value === "string" ? value.replace(/\$\$?/g, " ").replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_[\]^]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200).trimEnd() : "";
}

export function resolveAiServiceCompany(apiUrl: string | undefined): AiServiceCompany {
  try {
    const url = new URL(apiUrl ?? "");
    if (!["https:", "wss:"].includes(url.protocol) || url.username || url.password || url.port) return "unknown";
    return companiesByHost[url.hostname] ?? "unknown";
  } catch {
    return "unknown";
  }
}

export function isAiProviderAllowedForRegion(region: ProviderPolicyRegion, apiUrl: string | undefined): boolean {
  if (hasUnrestrictedProviderCompanies(region)) return true;
  // An unresolved context cannot silently acquire the unrestricted policy.
  return usCompanies.has(resolveAiServiceCompany(apiUrl));
}

export function providerPolicyRegionFromProfile(input: {
  region?: string | null;
  curriculumTrack?: string | null;
  publisher?: string | null;
}): ProviderPolicyRegion {
  const track = input.curriculumTrack?.trim().toUpperCase();
  if (input.region === "US" || input.region === "HK" || input.region === "MAINLAND") return input.region;
  if (track === "US" || track?.startsWith("US_") || input.publisher?.startsWith("US_")) return "US";
  if (track === "HK" || track?.startsWith("HK_")) return "HK";
  if (track?.startsWith("MAINLAND")) return "MAINLAND";
  return null;
}

export function providerPolicyRegionForUser(user: {
  curriculumProfile?: { region?: string | null; publisher?: string | null } | null;
  curriculumTrack?: string | null;
  providerPolicyRegion?: ProviderPolicyRegion;
}): ProviderPolicyRegion {
  // Auth projects this directly from stored identity before display defaults
  // and publisher normalization. Display fields cannot replace that decision.
  if (Object.hasOwn(user, "providerPolicyRegion")) {
    return user.providerPolicyRegion === "US" || user.providerPolicyRegion === "HK" || user.providerPolicyRegion === "MAINLAND"
      ? user.providerPolicyRegion : null;
  }
  return providerPolicyRegionFromProfile({ ...user.curriculumProfile, curriculumTrack: user.curriculumTrack });
}

export function combineProviderPolicyRegions(...regions: ProviderPolicyRegion[]): ProviderPolicyRegion {
  if (regions.includes("US")) return "US";
  if (!regions.length || regions.includes(null)) return null;
  return regions[0];
}

export function providerRequestInit(region: ProviderPolicyRegion, init: RequestInit): RequestInit {
  return hasUnrestrictedProviderCompanies(region) ? init : { ...init, redirect: "error" };
}

export function companyScopedProviderRequestInit(region: ProviderPolicyRegion, apiUrl: string, init: RequestInit): RequestInit {
  assertAiProviderAllowed(region, apiUrl);
  const request = providerRequestInit(region, init);
  if (hasUnrestrictedProviderCompanies(region) || resolveAiServiceCompany(apiUrl) !== "openrouter") return request;
  const url = new URL(apiUrl);
  if (url.pathname !== "/api/v1/chat/completions" || typeof init.body !== "string") throw new AiProviderCompanyPolicyError();
  const body: unknown = JSON.parse(init.body);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AiProviderCompanyPolicyError();
  return { ...request, body: JSON.stringify({ ...body, provider: {
    only: [...openRouterUsProviderSlugs], order: [...openRouterUsProviderSlugs], allow_fallbacks: false
  } }) };
}

export class AiProviderCompanyPolicyError extends Error {
  readonly code = "AI_PROVIDER_REGION_UNAVAILABLE";
  constructor() {
    super("No permitted AI service company is available for this region.");
    this.name = "AiProviderCompanyPolicyError";
  }
}

export function assertAiProviderAllowed(region: ProviderPolicyRegion, apiUrl: string | undefined): void {
  if (!isAiProviderAllowedForRegion(region, apiUrl)) throw new AiProviderCompanyPolicyError();
}

export function fetchCompanyAllowedProvider(
  region: ProviderPolicyRegion,
  apiUrl: string,
  init: RequestInit,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  assertAiProviderAllowed(region, apiUrl);
  return fetchImpl(apiUrl, companyScopedProviderRequestInit(region, apiUrl, init));
}
