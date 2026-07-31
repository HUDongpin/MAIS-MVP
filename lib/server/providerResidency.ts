import type { CurriculumRegion, CurriculumTrack } from "@/types";

/**
 * Data-residency gate for the third-party providers that receive learner content.
 *
 * Why this exists: provider selection is configuration-driven and global —
 * `readAITutorTextProviderConfigs()` picks from `AI_TUTOR_PREFERRED_TEXT_PROVIDER`
 * and whichever API keys happen to be set, with no reference to the learner. A
 * California learner's tutor prompt, voice audio and handwriting photograph
 * therefore go to whatever provider the deployment configured, which today can be
 * a PRC-hosted service. That is the single hardest item to clear in a United
 * States district data-protection agreement, and `/subprocessors` discloses it.
 *
 * This module does not choose providers. It answers one question — *may this
 * provider receive this learner's data?* — so the selection code can filter its
 * candidate list before it calls anything.
 *
 * Deliberate design decisions:
 *
 * 1. **Fail closed.** If nothing configured is allowed for the learner's region,
 *    callers must surface an error rather than fall back. A fallback that reaches
 *    a disallowed provider defeats the entire control, and silent fallback is
 *    exactly what a district audit looks for.
 * 2. **US tightens, HK and Mainland keep today's behaviour.** The US default
 *    allowlist is US-only; HK and Mainland default to permitting everything they
 *    already reach. Gating HK away from its current providers would break the
 *    platform's primary market to solve a US procurement problem, so that is a
 *    deployment decision, made through the env overrides below, not a silent
 *    code change.
 * 3. **Unknown hosts are not assumed safe.** A custom or self-hosted endpoint
 *    resolves to `UNKNOWN`, which the US allowlist excludes. Operators running one
 *    declare it explicitly via `PROVIDER_RESIDENCY_HOST_OVERRIDES` rather than
 *    having the gate guess.
 */

export type ProviderJurisdiction = "CN" | "US" | "SG" | "UNKNOWN";

/**
 * Hostname → jurisdiction for every provider in the subprocessor map that
 * receives learner content. Kept as exact hostnames rather than substrings: a
 * substring match on "dashscope" would silently classify the Singapore and US
 * DashScope hosts as PRC, which is the exact mistake this gate exists to prevent.
 *
 * Sources: docs/compliance/data-inventory.md §3, lib/server/llmProvider.ts,
 * lib/server/handwritingOcrRouting.ts, app/api/handwriting-recognition/route.ts.
 */
const providerHostJurisdictions: Readonly<Record<string, ProviderJurisdiction>> = {
  "dashscope.aliyuncs.com": "CN",
  "dashscope-intl.aliyuncs.com": "SG",
  "dashscope-us.aliyuncs.com": "US",
  "api.deepseek.com": "CN",
  "server.simpletex.cn": "CN",
  "api.deepinfra.com": "US",
  "api.mathpix.com": "US"
};

const jurisdictionValues: readonly ProviderJurisdiction[] = ["CN", "US", "SG", "UNKNOWN"];

/**
 * Default allowlists per curriculum region.
 *
 * US is the restrictive one on purpose — see decision 2 above. HK and MAINLAND
 * enumerate every jurisdiction so that turning this gate on is a no-op for them
 * until an operator narrows it.
 */
const defaultRegionAllowlists: Readonly<Record<CurriculumRegion, readonly ProviderJurisdiction[]>> = {
  US: ["US"],
  HK: ["CN", "US", "SG", "UNKNOWN"],
  MAINLAND: ["CN", "US", "SG", "UNKNOWN"]
};

const regionEnvNames: Readonly<Record<CurriculumRegion, string>> = {
  US: "PROVIDER_RESIDENCY_ALLOWED_US",
  HK: "PROVIDER_RESIDENCY_ALLOWED_HK",
  MAINLAND: "PROVIDER_RESIDENCY_ALLOWED_MAINLAND"
};

function parseJurisdictionList(value: string | undefined): readonly ProviderJurisdiction[] | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const parsed = trimmed
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean)
    .filter((entry): entry is ProviderJurisdiction =>
      (jurisdictionValues as readonly string[]).includes(entry)
    );

  // An override that parses to nothing usable is a misconfiguration. Returning
  // null falls back to the default allowlist rather than to "allow nothing",
  // which would take the tutor down for a typo, or "allow everything", which
  // would silently drop the control.
  return parsed.length > 0 ? parsed : null;
}

function parseHostOverrides(
  value = process.env.PROVIDER_RESIDENCY_HOST_OVERRIDES
): Readonly<Record<string, ProviderJurisdiction>> {
  const trimmed = value?.trim();
  if (!trimmed) return {};

  const overrides: Record<string, ProviderJurisdiction> = {};
  for (const entry of trimmed.split(",")) {
    const [rawHost, rawJurisdiction] = entry.split("=");
    const host = rawHost?.trim().toLowerCase();
    const jurisdiction = rawJurisdiction?.trim().toUpperCase();
    if (!host || !jurisdiction) continue;
    if (!(jurisdictionValues as readonly string[]).includes(jurisdiction)) continue;
    overrides[host] = jurisdiction as ProviderJurisdiction;
  }
  return overrides;
}

export function hostnameFromApiUrl(apiUrl: string): string | null {
  const trimmed = apiUrl?.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Classify a provider endpoint. Anything not in the table — including a
 * malformed URL — is `UNKNOWN`, never a guess.
 */
export function resolveProviderJurisdiction(
  apiUrl: string,
  hostOverrides = parseHostOverrides()
): ProviderJurisdiction {
  const hostname = hostnameFromApiUrl(apiUrl);
  if (!hostname) return "UNKNOWN";
  return hostOverrides[hostname] ?? providerHostJurisdictions[hostname] ?? "UNKNOWN";
}

export function readRegionAllowlist(region: CurriculumRegion): readonly ProviderJurisdiction[] {
  return parseJurisdictionList(process.env[regionEnvNames[region]]) ?? defaultRegionAllowlists[region];
}

export function isProviderAllowedForRegion(apiUrl: string, region: CurriculumRegion): boolean {
  return readRegionAllowlist(region).includes(resolveProviderJurisdiction(apiUrl));
}

/**
 * Work out which region's rules apply to a learner.
 *
 * The stored `curriculum_region` is authoritative when present, but it is
 * nullable, and a US learner whose profile has not been populated must not slip
 * past the gate just because a column is empty. The curriculum track encodes the
 * same fact (`US_CA_MATH`, `MAINLAND_PEP_HIGH`, `HK`) and is set for anyone doing
 * real work, so it serves as the backstop.
 *
 * Returns null only when neither is known — a learner on no track at all, who by
 * construction is not on a US track. Callers treat null as "no region rules to
 * apply" rather than failing closed, so that an incomplete profile cannot take
 * the tutor down for the Hong Kong and Mainland cohorts.
 */
export function resolveLearnerResidencyRegion(input: {
  profileRegion?: CurriculumRegion | null;
  curriculumTrack?: CurriculumTrack | string | null;
}): CurriculumRegion | null {
  if (input.profileRegion) return input.profileRegion;

  const track = input.curriculumTrack?.trim().toUpperCase();
  if (!track) return null;
  if (track.startsWith("US_")) return "US";
  if (track.startsWith("MAINLAND")) return "MAINLAND";
  if (track === "HK" || track.startsWith("HK_")) return "HK";
  return null;
}

export type ResidencyDecision<T> = {
  /** Candidates the learner's region permits, in the caller's original order. */
  allowed: readonly T[];
  /** Candidates withheld, with the jurisdiction that disqualified each one. */
  blocked: readonly { candidate: T; jurisdiction: ProviderJurisdiction }[];
  region: CurriculumRegion;
  allowlist: readonly ProviderJurisdiction[];
};

/**
 * Split a candidate provider list into what this learner's region permits and
 * what it does not. Order is preserved so an existing preference ordering keeps
 * its meaning among the survivors.
 *
 * Callers must treat an empty `allowed` as a hard failure — see decision 1.
 */
export function partitionByResidency<T>(
  candidates: readonly T[],
  region: CurriculumRegion,
  apiUrlOf: (candidate: T) => string
): ResidencyDecision<T> {
  const allowlist = readRegionAllowlist(region);
  const allowed: T[] = [];
  const blocked: { candidate: T; jurisdiction: ProviderJurisdiction }[] = [];

  for (const candidate of candidates) {
    const jurisdiction = resolveProviderJurisdiction(apiUrlOf(candidate));
    if (allowlist.includes(jurisdiction)) {
      allowed.push(candidate);
    } else {
      blocked.push({ candidate, jurisdiction });
    }
  }

  return { allowed, blocked, region, allowlist };
}

/**
 * Operator-facing explanation for a fail-closed outcome. Deliberately names the
 * region and the blocked jurisdictions but not the endpoint, so it can be logged
 * or returned without disclosing deployment configuration to a learner.
 */
export function describeResidencyBlock(decision: ResidencyDecision<unknown>): string {
  const blockedJurisdictions = Array.from(
    new Set(decision.blocked.map((entry) => entry.jurisdiction))
  ).sort();

  return (
    `No provider is permitted for curriculum region ${decision.region}. ` +
    `Allowed jurisdictions: ${decision.allowlist.join(", ") || "(none)"}. ` +
    `Configured providers resolved to: ${blockedJurisdictions.join(", ") || "(none configured)"}.`
  );
}
