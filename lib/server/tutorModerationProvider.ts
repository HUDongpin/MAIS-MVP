// Provider-moderation layer for the MAIS AI Tutor — the upgrade documented at the
// top of lib/server/tutorModeration.ts.
//
// Layering, not replacement. The lexical net in tutorModeration.ts stays the
// zero-latency first line of defence and keeps its exact semantics:
//
//   layer 1 (lexical, sync, always on)  — a "block" verdict refuses the model
//     call immediately. No network hop is made, so the worst case for the
//     highest-harm content is unchanged.
//   layer 2 (provider, async, opt-in)   — only runs when layer 1 let the content
//     through. It catches what a conservative phrase list cannot: paraphrase,
//     obfuscation, and the comprehensive hate/sexual coverage the lexical module
//     explicitly declares out of scope.
//
// The layer is INERT unless both TUTOR_MODERATION_API_URL and
// TUTOR_MODERATION_API_KEY are set. Requiring both (rather than a URL alone) is
// deliberate: a half-provisioned environment must not start shipping student
// text to an endpoint it cannot authenticate against. With the env unset,
// `resolveTutorInputModeration` / `resolveTutorOutputModeration` do exactly what
// the route did before this module existed — same verdicts, same audit strings,
// no network hop, no added latency.
//
// Fail open, never fail closed. A moderation endpoint that is slow, down, or
// returning garbage must not take the tutor down with it, and must not silently
// degrade either: every unavailable call falls back to the lexical verdict AND
// emits a governance audit event with reason "provider-moderation-unavailable"
// so the gap is visible in the audit log rather than invisible in production.
//
// Provider responses are untrusted input. Nothing in the response is executed or
// echoed to the student — it is parsed into the closed
// TutorModerationClassification shape and anything unrecognised is discarded.

import { boundedLLMNumber } from "@/lib/server/llmProvider";
import {
  applyTutorOutputModeration,
  buildModerationRedirectReply,
  classifyTutorModeration,
  shouldBlockTutorInput,
  shouldWithholdTutorOutput,
  type TutorModerationCategory,
  type TutorModerationClassification,
  type TutorModerationSeverity,
  type TutorModerationSource,
  type TutorRole
} from "@/lib/server/tutorModeration";

// Mirrors LLMProviderConfig from lib/server/llmProvider.ts. `apiUrl` is optional
// here because — unlike the tutor model — there is no sensible default endpoint:
// an unset URL is how the layer stays off.
export type TutorModerationProviderConfig = {
  apiKey?: string;
  apiUrl?: string;
  model: string;
};

export type TutorModerationProviderStatus =
  // No call was made: not configured, nothing to scan, or layer 1 already blocked.
  | "skipped"
  // The provider answered and the answer was understood.
  | "completed"
  // The provider timed out, errored, or answered with something unparseable.
  | "unavailable";

export type TutorModerationProviderFailure =
  | "timeout"
  | "deadline-exhausted"
  | "http-error"
  | "malformed-response"
  | "request-failed";

export type TutorModerationProviderResult = {
  status: TutorModerationProviderStatus;
  // Always the existing shape, so every downstream helper
  // (shouldBlockTutorInput / shouldWithholdTutorOutput / …) works unchanged.
  // On "skipped" and "unavailable" this is the not-flagged classification —
  // that is what failing open means.
  classification: TutorModerationClassification;
  failure?: TutorModerationProviderFailure;
};

// A structural subset of the global fetch that a test can supply. The global
// `fetch` is assignable to it.
export type TutorModerationFetch = (
  input: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export type TutorModerationProviderOptions = {
  config?: TutorModerationProviderConfig;
  timeoutMs?: number;
  fetchImpl?: TutorModerationFetch;
};

// Which layer produced the decision that was acted on.
export type TutorModerationLayer = "lexical" | "provider";

// Governance events are returned as data rather than written here: the resolve
// route owns the audit write (it batches every side effect until after the
// response is flushed). Returning them keeps the audit trail — including the
// legacy lexical strings, which are reproduced byte-for-byte — under test.
export type TutorModerationGovernanceEvent = {
  action: "content-moderation-blocked" | "request-admitted";
  reason: string;
  metadata: Record<string, unknown>;
};

export type TutorInputModerationResolution = {
  classification: TutorModerationClassification;
  blocked: boolean;
  layer?: TutorModerationLayer;
  governanceEvents: TutorModerationGovernanceEvent[];
  providerStatus: TutorModerationProviderStatus;
  providerFailure?: TutorModerationProviderFailure;
};

export type TutorOutputModerationResolution = {
  // The reply to actually send: the model's own text, or the neutral redirect.
  reply: string;
  redirected: boolean;
  mode?: "moderation-redirect";
  classification: TutorModerationClassification;
  layer?: TutorModerationLayer;
  governanceEvents: TutorModerationGovernanceEvent[];
  providerStatus: TutorModerationProviderStatus;
  providerFailure?: TutorModerationProviderFailure;
};

// OpenAI's hosted moderation model is the reference shape this client speaks; it
// is only a default for the *name* sent in the request body, and is inert until
// TUTOR_MODERATION_API_URL points somewhere.
const defaultTutorModerationModel = "omni-moderation-latest";
const defaultTutorModerationTimeoutMs = 800;
const minTutorModerationTimeoutMs = 100;
const maxTutorModerationTimeoutMs = 2_000;
// Used only when a provider reports scores without boolean category verdicts.
const providerScoreThreshold = 0.5;
const maxExcerptLength = 160;
const maxScanLength = 4_000;
const maxMatchedTerms = 6;

const notFlagged: TutorModerationClassification = {
  flagged: false,
  matchedTerms: [],
  excerpt: ""
};

const severityRank: Record<TutorModerationSeverity, number> = {
  block: 2,
  flag: 1
};

// Ties between equally severe categories break toward the earlier entry, which
// mirrors the rule order in tutorModeration.ts so both layers agree on which
// category "wins" when content trips several at once.
const categoryRank: Record<TutorModerationCategory, number> = {
  sexual: 0,
  hate: 1,
  dangerous: 2,
  profanity: 3,
  insult: 4
};

type MappedCategory = {
  category: TutorModerationCategory;
  severity: TutorModerationSeverity;
};

// Provider category key -> this module's closed category/severity pair. Keys are
// matched case-insensitively after normalising "_" to "-" and stripping a
// "categories." prefix, so both OpenAI-style ("sexual/minors", "hate/threatening")
// and snake_case ("self_harm") vocabularies land here.
//
// Deliberately NOT mapped: self-harm, suicide, and crisis categories. Those are
// duty-of-care signals and belong to lib/server/contentSafety.ts, which raises a
// teacher alert. Routing them through this module would file a student in crisis
// as a policy violation in the governance log and never reach their teacher.
// Anything unmapped is discarded rather than guessed at.
const providerCategoryMap: Record<string, MappedCategory> = {
  sexual: { category: "sexual", severity: "block" },
  "sexual/minors": { category: "sexual", severity: "block" },
  "sexual-minors": { category: "sexual", severity: "block" },
  csam: { category: "sexual", severity: "block" },
  hate: { category: "hate", severity: "block" },
  "hate/threatening": { category: "hate", severity: "block" },
  "hate-threatening": { category: "hate", severity: "block" },
  "harassment/threatening": { category: "hate", severity: "block" },
  "harassment-threatening": { category: "hate", severity: "block" },
  harassment: { category: "insult", severity: "flag" },
  violence: { category: "dangerous", severity: "block" },
  "violence/graphic": { category: "dangerous", severity: "block" },
  "violence-graphic": { category: "dangerous", severity: "block" },
  illicit: { category: "dangerous", severity: "block" },
  "illicit/violent": { category: "dangerous", severity: "block" },
  "illicit-violent": { category: "dangerous", severity: "block" },
  dangerous: { category: "dangerous", severity: "block" },
  weapons: { category: "dangerous", severity: "block" },
  profanity: { category: "profanity", severity: "flag" },
  insult: { category: "insult", severity: "flag" }
};

function readOptionalEnv(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

// A structural view of just the three variables this module reads, so callers
// (and tests) can supply a plain object without standing up a whole ProcessEnv.
export type TutorModerationEnv = {
  TUTOR_MODERATION_API_URL?: string;
  TUTOR_MODERATION_API_KEY?: string;
  TUTOR_MODERATION_MODEL?: string;
  [key: string]: string | undefined;
};

export function readTutorModerationProviderConfig(
  env: TutorModerationEnv = process.env
): TutorModerationProviderConfig {
  return {
    apiKey: readOptionalEnv(env.TUTOR_MODERATION_API_KEY),
    apiUrl: readOptionalEnv(env.TUTOR_MODERATION_API_URL),
    model: readOptionalEnv(env.TUTOR_MODERATION_MODEL) ?? defaultTutorModerationModel
  };
}

// The single on/off switch for the whole layer.
export function isTutorModerationProviderConfigured(
  config: TutorModerationProviderConfig = readTutorModerationProviderConfig()
) {
  return Boolean(config.apiUrl && config.apiKey);
}

// Strict by construction: the moderation hop is capped well below the tutor's own
// provider timeout, because it is a gate in front of the model call, not the call
// itself.
export function resolveTutorModerationProviderTimeoutMs(
  value = process.env.TUTOR_MODERATION_TIMEOUT_MS
) {
  return boundedLLMNumber(
    value,
    defaultTutorModerationTimeoutMs,
    minTutorModerationTimeoutMs,
    maxTutorModerationTimeoutMs
  );
}

// Takes the more severe of two verdicts, so a lexical "flag" and a provider
// "block" on the same message resolve to the block. Ties break toward the first
// argument, i.e. toward the lexical layer.
export function mergeTutorModerationClassifications(
  ...classifications: TutorModerationClassification[]
): TutorModerationClassification {
  let best: TutorModerationClassification | null = null;

  for (const candidate of classifications) {
    if (!candidate?.flagged || !candidate.severity) continue;
    if (!best?.severity) {
      best = candidate;
      continue;
    }
    if (severityRank[candidate.severity] > severityRank[best.severity]) {
      best = candidate;
    }
  }

  return best ?? notFlagged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorKind(error: unknown) {
  if (error instanceof Error) return error.name;
  return typeof error;
}

function buildProviderExcerpt(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxExcerptLength) return collapsed;
  return `${collapsed.slice(0, maxExcerptLength).trim()}…`;
}

function normalizeProviderCategoryKey(key: string) {
  return key.trim().toLowerCase().replace(/_/g, "-").replace(/^categories[./-]/, "");
}

// Unwraps the response envelope. Three shapes are accepted so the same env vars
// work against a dedicated moderation endpoint or a chat model asked to answer in
// JSON (which is what TUTOR_MODERATION_MODEL is for):
//   1. { results: [ { flagged, categories, category_scores } ] }
//   2. { flagged, categories }
//   3. { choices: [ { message: { content: "<json>" } } ] }
function unwrapModerationPayload(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!isRecord(value) || depth > 2) return null;

  if (Array.isArray(value.results)) {
    const first = value.results[0];
    return isRecord(first) ? first : null;
  }

  if (Array.isArray(value.choices)) {
    const firstChoice = value.choices[0];
    if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null;
    const content = firstChoice.message.content;
    if (typeof content !== "string") return null;
    const unfenced = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      return unwrapModerationPayload(JSON.parse(unfenced) as unknown, depth + 1);
    } catch {
      return null;
    }
  }

  if ("flagged" in value || "categories" in value || "category_scores" in value) return value;

  return null;
}

// Collects the provider category keys the response marks positive. Boolean
// verdicts win when present (they are the calibrated signal); raw scores are only
// consulted when no boolean map was supplied.
function collectPositiveCategoryKeys(payload: Record<string, unknown>) {
  const keys: string[] = [];
  const categories = payload.categories;

  if (Array.isArray(categories)) {
    for (const entry of categories) {
      if (typeof entry === "string" && entry.trim()) keys.push(entry);
    }
  } else if (isRecord(categories)) {
    for (const [key, value] of Object.entries(categories)) {
      if (value === true) keys.push(key);
      else if (typeof value === "number" && value >= providerScoreThreshold) keys.push(key);
    }
  }

  if (!keys.length && isRecord(payload.category_scores)) {
    for (const [key, value] of Object.entries(payload.category_scores)) {
      if (typeof value === "number" && value >= providerScoreThreshold) keys.push(key);
    }
  }

  return keys;
}

// Reduces a provider payload to the existing classification shape. Returns null —
// meaning "understood, nothing to act on" — when the response is well-formed but
// carries no category this module recognises (e.g. a self-harm-only verdict,
// which contentSafety owns).
export function classificationFromProviderPayload(
  payload: unknown,
  text: string
): TutorModerationClassification | null {
  const record = unwrapModerationPayload(payload);
  if (!record) return null;

  const positiveKeys = collectPositiveCategoryKeys(record);
  if (!positiveKeys.length) return null;

  let best: (MappedCategory & { key: string }) | null = null;
  const matchedTerms: string[] = [];

  for (const rawKey of positiveKeys) {
    const mapped = providerCategoryMap[normalizeProviderCategoryKey(rawKey)];
    if (!mapped) continue;
    matchedTerms.push(`provider:${normalizeProviderCategoryKey(rawKey)}`);

    const moreSevere = !best || severityRank[mapped.severity] > severityRank[best.severity];
    const sameSeverityHigherPriority = best
      && severityRank[mapped.severity] === severityRank[best.severity]
      && categoryRank[mapped.category] < categoryRank[best.category];
    if (moreSevere || sameSeverityHigherPriority) {
      best = { ...mapped, key: rawKey };
    }
  }

  if (!best) return null;

  return {
    flagged: true,
    category: best.category,
    severity: best.severity,
    // The provider reports categories, not literal phrases, so the audit context
    // records which provider signals fired rather than inventing matched text.
    matchedTerms: Array.from(new Set(matchedTerms)).slice(0, maxMatchedTerms),
    excerpt: buildProviderExcerpt(text)
  };
}

function unavailable(failure: TutorModerationProviderFailure): TutorModerationProviderResult {
  return { status: "unavailable", classification: notFlagged, failure };
}

// Calls the configured moderation endpoint under a hard wall-clock cap. The cap
// is enforced by a race as well as by AbortController, so a provider that ignores
// the abort signal still cannot hold the tutor past the deadline.
export async function classifyTutorModerationWithProvider(
  text: string,
  options: TutorModerationProviderOptions & { source?: TutorModerationSource } = {}
): Promise<TutorModerationProviderResult> {
  const config = options.config ?? readTutorModerationProviderConfig();
  if (!isTutorModerationProviderConfigured(config) || !config.apiUrl) {
    return { status: "skipped", classification: notFlagged };
  }
  if (typeof text !== "string" || !text.trim()) {
    return { status: "skipped", classification: notFlagged };
  }

  const timeoutMs = options.timeoutMs ?? resolveTutorModerationProviderTimeoutMs();
  // A caller that has already burned its request deadline gets an audited
  // fail-open rather than a silently unmoderated turn.
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return unavailable("deadline-exhausted");

  const doFetch = options.fetchImpl ?? (fetch as unknown as TutorModerationFetch);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), timeoutMs);
    });
    const request = doFetch(config.apiUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        input: text.slice(0, maxScanLength)
      })
    });
    // A rejection that lands after the race has already been decided must not
    // surface as an unhandled rejection.
    request.catch(() => {});

    const settled = await Promise.race([request, timeout]);
    if (settled === "timeout") {
      controller.abort();
      console.warn("AI Tutor moderation provider unavailable", { failure: "timeout" });
      return unavailable("timeout");
    }

    if (!settled.ok) {
      console.warn("AI Tutor moderation provider unavailable", {
        failure: "http-error",
        status: settled.status
      });
      return unavailable("http-error");
    }

    let payload: unknown;
    try {
      payload = await settled.json();
    } catch {
      console.warn("AI Tutor moderation provider unavailable", { failure: "malformed-response" });
      return unavailable("malformed-response");
    }

    const classification = classificationFromProviderPayload(payload, text);
    return { status: "completed", classification: classification ?? notFlagged };
  } catch (error) {
    console.warn("AI Tutor moderation provider unavailable", {
      failure: "request-failed",
      errorKind: errorKind(error)
    });
    return unavailable("request-failed");
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function providerUnavailableEvent(
  source: TutorModerationSource,
  failure: TutorModerationProviderFailure,
  fallbackVerdict: string
): TutorModerationGovernanceEvent {
  return {
    // The request WAS admitted — it proceeded on the lexical verdict alone. This
    // is not a block, and must not be counted as one in the governance summary.
    action: "request-admitted",
    reason: "provider-moderation-unavailable",
    metadata: {
      source,
      failure,
      fallbackVerdict,
      layer: "provider"
    }
  };
}

// STUDENT INPUT, both layers.
//
// Layer 1 keeps its exact behaviour: a lexical "block" refuses the model call
// with no network hop, and the audit string it emits is unchanged. Only when the
// input survived layer 1 does the provider get a look — and only when it is
// configured.
export async function resolveTutorInputModeration({
  input,
  role,
  config,
  timeoutMs,
  fetchImpl
}: {
  input: string;
  role: TutorRole;
} & TutorModerationProviderOptions): Promise<TutorInputModerationResolution> {
  const governanceEvents: TutorModerationGovernanceEvent[] = [];

  // Scoped to students, mirroring the lexical gate and content-safety.
  if (role !== "student") {
    return {
      classification: notFlagged,
      blocked: false,
      governanceEvents,
      providerStatus: "skipped"
    };
  }

  const lexical = classifyTutorModeration(input, { source: "student-input" });
  if (lexical.flagged && lexical.category && lexical.severity) {
    const blocked = shouldBlockTutorInput(lexical);
    governanceEvents.push({
      action: "content-moderation-blocked",
      reason: `content-moderation:student-input:${lexical.category}:${lexical.severity}${blocked ? ":blocked" : ""}`,
      metadata: {
        category: lexical.category,
        severity: lexical.severity,
        source: "student-input",
        blocked
      }
    });

    // Layer 1 block is terminal: refuse now, spend nothing on the network.
    if (blocked) {
      return {
        classification: lexical,
        blocked: true,
        layer: "lexical",
        governanceEvents,
        providerStatus: "skipped"
      };
    }
  }

  const resolvedConfig = config ?? readTutorModerationProviderConfig();
  if (!isTutorModerationProviderConfigured(resolvedConfig)) {
    return {
      classification: lexical,
      blocked: false,
      governanceEvents,
      providerStatus: "skipped"
    };
  }

  const provider = await classifyTutorModerationWithProvider(input, {
    source: "student-input",
    config: resolvedConfig,
    timeoutMs,
    fetchImpl
  });

  if (provider.status === "unavailable" && provider.failure) {
    governanceEvents.push(
      providerUnavailableEvent(
        "student-input",
        provider.failure,
        lexical.flagged ? `lexical:${lexical.severity}` : "lexical:allow"
      )
    );
    return {
      classification: lexical,
      blocked: false,
      governanceEvents,
      providerStatus: provider.status,
      providerFailure: provider.failure
    };
  }

  const merged = mergeTutorModerationClassifications(lexical, provider.classification);
  if (provider.classification.flagged && provider.classification.category && provider.classification.severity) {
    // Input policy is unchanged across layers: only "block" severity refuses.
    // A provider "flag" (e.g. harassment) is audited and still tutored — a
    // frustrated student is not denied math help.
    const blocked = shouldBlockTutorInput(merged);
    governanceEvents.push({
      action: "content-moderation-blocked",
      reason: `content-moderation:student-input:${provider.classification.category}:${provider.classification.severity}${blocked ? ":blocked" : ""}:provider`,
      metadata: {
        category: provider.classification.category,
        severity: provider.classification.severity,
        source: "student-input",
        blocked,
        layer: "provider",
        providerSignals: provider.classification.matchedTerms
      }
    });

    return {
      classification: merged,
      blocked,
      layer: "provider",
      governanceEvents,
      providerStatus: provider.status
    };
  }

  return {
    classification: merged,
    blocked: false,
    governanceEvents,
    providerStatus: provider.status
  };
}

// TUTOR OUTPUT, both layers.
//
// The tutor is held to a higher bar than the student: ANY flag — block or flag
// severity, lexical or provider — withholds the model reply in favour of the
// neutral redirect.
export async function resolveTutorOutputModeration({
  modelReply,
  role,
  language,
  config,
  timeoutMs,
  fetchImpl
}: {
  modelReply: string;
  role: TutorRole;
  language: string;
} & TutorModerationProviderOptions): Promise<TutorOutputModerationResolution> {
  const governanceEvents: TutorModerationGovernanceEvent[] = [];
  const lexical = applyTutorOutputModeration({ modelReply, role, language });

  if (lexical.redirected && lexical.classification.category && lexical.classification.severity) {
    governanceEvents.push({
      action: "content-moderation-blocked",
      reason: `content-moderation:tutor-output:${lexical.classification.category}:${lexical.classification.severity}:withheld`,
      metadata: {
        category: lexical.classification.category,
        severity: lexical.classification.severity,
        source: "tutor-output",
        blockedReply: true
      }
    });

    return {
      reply: lexical.reply,
      redirected: true,
      mode: "moderation-redirect",
      classification: lexical.classification,
      layer: "lexical",
      governanceEvents,
      providerStatus: "skipped"
    };
  }

  const passthrough: TutorOutputModerationResolution = {
    reply: lexical.reply,
    redirected: false,
    classification: lexical.classification,
    governanceEvents,
    providerStatus: "skipped"
  };

  // applyTutorOutputModeration already scoped itself to students; do not spend a
  // network hop on a teacher/parent/admin reply it deliberately left alone.
  if (role !== "student") return passthrough;

  const resolvedConfig = config ?? readTutorModerationProviderConfig();
  if (!isTutorModerationProviderConfigured(resolvedConfig)) return passthrough;

  const provider = await classifyTutorModerationWithProvider(modelReply, {
    source: "tutor-output",
    config: resolvedConfig,
    timeoutMs,
    fetchImpl
  });

  if (provider.status === "unavailable" && provider.failure) {
    governanceEvents.push(
      providerUnavailableEvent("tutor-output", provider.failure, "lexical:allow")
    );
    return {
      ...passthrough,
      providerStatus: provider.status,
      providerFailure: provider.failure
    };
  }

  if (
    shouldWithholdTutorOutput(provider.classification)
    && provider.classification.category
    && provider.classification.severity
  ) {
    governanceEvents.push({
      action: "content-moderation-blocked",
      reason: `content-moderation:tutor-output:${provider.classification.category}:${provider.classification.severity}:withheld:provider`,
      metadata: {
        category: provider.classification.category,
        severity: provider.classification.severity,
        source: "tutor-output",
        blockedReply: true,
        layer: "provider",
        providerSignals: provider.classification.matchedTerms
      }
    });

    return {
      reply: buildModerationRedirectReply(language),
      redirected: true,
      mode: "moderation-redirect",
      classification: provider.classification,
      layer: "provider",
      governanceEvents,
      providerStatus: provider.status
    };
  }

  return { ...passthrough, providerStatus: provider.status };
}
