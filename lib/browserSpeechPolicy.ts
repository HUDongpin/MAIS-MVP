import { hasUnrestrictedProviderCompanies, type ProviderPolicyRegion } from "./aiProviderCompanyPolicy";

export function mayUseUnverifiedBrowserRecognition(region: ProviderPolicyRegion) {
  return hasUnrestrictedProviderCompanies(region);
}

export function permittedBrowserSpeechVoice<T extends { localService: boolean; lang: string }>(
  region: ProviderPolicyRegion,
  voices: readonly T[],
  language: string
): T | null | undefined {
  if (hasUnrestrictedProviderCompanies(region)) return undefined;
  const local = voices.filter(voice => voice.localService === true);
  const prefix = language.toLowerCase().split("-")[0];
  return local.find(voice => voice.lang.toLowerCase() === language.toLowerCase())
    ?? local.find(voice => voice.lang.toLowerCase().split("-")[0] === prefix)
    ?? null;
}
