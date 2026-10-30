"use client";

import { useContext } from "react";
import { SettingsContext } from "./AppProviders";
import { providerPolicyRegionForUser } from "@/lib/aiProviderCompanyPolicy";

// UI capability hints only; server handlers derive their own authenticated policy.
export function useAiProviderRegion() {
  const settings = useContext(SettingsContext);
  return providerPolicyRegionForUser(settings?.currentUser ?? {});
}
