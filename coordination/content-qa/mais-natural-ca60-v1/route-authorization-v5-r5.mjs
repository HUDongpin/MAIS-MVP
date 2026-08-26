import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
  validateClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";

const REQUIRED_KINDS = Object.freeze([
  "ACCOUNT_PROJECT_IDENTITY",
  "DIRECT_BILLING_ROUTE",
  "DATA_REGION",
  "PRICE",
  "ROUTE_PROBE_RESPONSE",
]);

const PROVIDER_TUPLES = Object.freeze({
  OPENAI_DIRECT: Object.freeze({
    model: "gpt-5.6-luna",
    endpoint: "https://us.api.openai.com/v1/responses",
    projectResidency: "US_STORAGE_PROCESSING",
    dataRegion: "US",
    maximumSuccessfulCalls: 300,
    maximumAttempts: 610,
    maximumTokens: 4_000_000,
  }),
  DEEPSEEK_DIRECT: Object.freeze({
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
    projectResidency: null,
    dataRegion: null,
    maximumSuccessfulCalls: 420,
    maximumAttempts: 850,
    maximumTokens: 6_000_000,
  }),
});

function round(value) { return Number(value.toFixed(12)); }
function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function add(errors, condition, message) { if (!condition && !errors.includes(message)) errors.push(message); }
function isHash(value) { return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value); }
function isIso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }

function parseProtectedSource(input) {
  requireCondition(REQUIRED_KINDS.includes(input?.evidenceKind), "route source evidence kind is invalid");
  requireCondition(typeof input?.sourceBytes === "string" && input.sourceBytes.length > 0, "route source bytes are absent");
  requireCondition(input.mediaType === "application/json", "route source media type must be application/json");
  requireCondition(typeof input.sourceLocator === "string" && input.sourceLocator.length > 0, "route source locator is absent");
  requireCondition(isIso(input.capturedAt) && isIso(input.expiresAt) && Date.parse(input.capturedAt) < Date.parse(input.expiresAt), "route source chronology is invalid");
  let parsed;
  try { parsed = JSON.parse(input.sourceBytes); } catch { throw new TypeError("route source bytes are not valid JSON"); }
  requireCondition(parsed && typeof parsed === "object" && !Array.isArray(parsed), "route source bytes must decode to an object");
  const forbiddenKeys = Object.keys(parsed).filter((key) => /^(?:password|secret|token|api[_-]?key|authorization|cookie|access[_-]?token|refresh[_-]?token)$/iu.test(key));
  requireCondition(forbiddenKeys.length === 0 && !/(?:bearer\s+|\bsk-[A-Za-z0-9_-]{8,})/iu.test(input.sourceBytes), "route source bytes contain credential-like material");
  requireCondition(parsed.evidenceKind === input.evidenceKind, "route source evidence kind differs from its bytes");
  return parsed;
}

function buildSource(input) {
  const parsed = parseProtectedSource(input);
  const source = sealV5R3Artifact({
    schemaVersion: "AuthenticatedRouteEvidenceSourceV1",
    evidenceKind: input.evidenceKind,
    sourceKind: input.sourceKind,
    mediaType: input.mediaType,
    sourceLocatorHash: sha256V5R3(input.sourceLocator),
    sourceByteLength: Buffer.byteLength(input.sourceBytes, "utf8"),
    sourceBytesHash: sha256V5R3(Buffer.from(input.sourceBytes, "utf8")),
    sourceBytes: input.sourceBytes,
    parsedClaimsHash: sha256V5R3(canonicalJsonV5R3(parsed)),
    capturedAt: input.capturedAt,
    expiresAt: input.expiresAt,
    credentialLikeMaterialDetected: false,
  });
  assertClosedSelfHashedArtifactV5R5(source, "AuthenticatedRouteEvidenceSourceV1");
  return source;
}

function validateSource(source) {
  const errors = [...validateClosedSelfHashedArtifactV5R5(source, "AuthenticatedRouteEvidenceSourceV1")];
  add(errors, validateSelfHashV5R3(source), "route source artifact self-hash is invalid");
  add(errors, source?.schemaVersion === "AuthenticatedRouteEvidenceSourceV1", "route source schema version is invalid");
  add(errors, REQUIRED_KINDS.includes(source?.evidenceKind), "route source evidence kind is invalid");
  add(errors, source?.mediaType === "application/json" && typeof source?.sourceBytes === "string", "route source bytes or media type is invalid");
  add(errors, source?.sourceByteLength === Buffer.byteLength(source?.sourceBytes ?? "", "utf8")
    && source?.sourceBytesHash === sha256V5R3(Buffer.from(source?.sourceBytes ?? "", "utf8")), "route source bytes do not match their recorded hash and length");
  try {
    const parsed = JSON.parse(source.sourceBytes);
    add(errors, source.parsedClaimsHash === sha256V5R3(canonicalJsonV5R3(parsed)), "route source parsed-claims hash is invalid");
    add(errors, parsed.evidenceKind === source.evidenceKind, "route source bytes evidence kind is inconsistent");
  } catch { errors.push("route source bytes cannot be independently reconstructed"); }
  add(errors, source?.credentialLikeMaterialDetected === false, "route source contains credential-like material");
  return errors;
}

function exactCommonClaims(source, provider, tuple) {
  const parsed = JSON.parse(source.sourceBytes);
  requireCondition(parsed.provider === provider && parsed.model === tuple.model && parsed.endpoint === tuple.endpoint,
    `${source.evidenceKind} source provider/model/endpoint tuple is invalid`);
  requireCondition(typeof parsed.subjectIdentityHash === "string" && isHash(parsed.subjectIdentityHash),
    `${source.evidenceKind} source subject identity hash is invalid`);
  requireCondition(typeof parsed.projectResidency === "string" && parsed.projectResidency.length > 0,
    `${source.evidenceKind} source project residency is absent`);
  return parsed;
}

function reconstructReceipt(input) {
  const tuple = PROVIDER_TUPLES[input?.provider];
  requireCondition(tuple, "route evidence provider is unknown");
  requireCondition(isHash(input.activeRunnerRegistrationHash), "active runner registration hash is invalid");
  requireCondition(Array.isArray(input.sources) && input.sources.length === REQUIRED_KINDS.length, "complete route evidence requires exactly five protected source artifacts");
  const sources = input.sources.map((source) => source.schemaVersion === "AuthenticatedRouteEvidenceSourceV1" ? source : buildSource(source));
  requireCondition(new Set(sources.map(({ evidenceKind }) => evidenceKind)).size === REQUIRED_KINDS.length
    && REQUIRED_KINDS.every((kind) => sources.some(({ evidenceKind }) => evidenceKind === kind)), "complete route evidence source kinds are missing or duplicated");
  const parsedByKind = Object.fromEntries(sources.map((source) => [source.evidenceKind, exactCommonClaims(source, input.provider, tuple)]));
  const identities = new Set(Object.values(parsedByKind).map(({ subjectIdentityHash }) => subjectIdentityHash));
  requireCondition(identities.size === 1, "route/account/billing/region/price sources do not identify the same provider subject");
  const residences = new Set(Object.values(parsedByKind).map(({ projectResidency }) => projectResidency));
  requireCondition(residences.size === 1, "route sources disagree on project residency");
  const projectResidency = [...residences][0];
  const dataRegion = parsedByKind.DATA_REGION.dataRegion;
  if (input.provider === "OPENAI_DIRECT") {
    requireCondition(projectResidency === tuple.projectResidency && dataRegion === tuple.dataRegion, "OpenAI route source does not prove US storage processing and US data region");
  } else {
    requireCondition(!/UNKNOWN|PENDING|UNRESOLVED/iu.test(projectResidency ?? "")
      && typeof dataRegion === "string" && dataRegion.length > 0 && !/UNKNOWN|PENDING|UNRESOLVED/iu.test(dataRegion),
    "DeepSeek route authorization requires a resolved project residency and data region");
  }
  requireCondition(parsedByKind.DIRECT_BILLING_ROUTE.directBilling === true, "direct billing route is not confirmed by its protected source bytes");
  const route = parsedByKind.ROUTE_PROBE_RESPONSE;
  requireCondition(route.httpStatus >= 200 && route.httpStatus <= 299 && route.attemptStatus === "SUCCEEDED"
    && route.containsNaturalQuestionText === false, "route probe response bytes do not prove a successful zero-natural-content attempt");
  const price = parsedByKind.PRICE;
  requireCondition(price.currency === "USD" && Number.isFinite(price.inputUsdPerMillionTokens) && price.inputUsdPerMillionTokens > 0
    && Number.isFinite(price.outputUsdPerMillionTokens) && price.outputUsdPerMillionTokens > 0,
  "authenticated price source must contain positive applicable USD rates");
  requireCondition(isIso(input.validatedAt) && sources.every(({ capturedAt, expiresAt }) => Date.parse(capturedAt) <= Date.parse(input.validatedAt)
    && Date.parse(input.validatedAt) < Date.parse(expiresAt)), "route evidence validation time is outside source custody validity");
  const receipt = sealV5R3Artifact({
    schemaVersion: "AuthenticatedRouteEvidenceReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    model: tuple.model,
    endpoint: tuple.endpoint,
    projectResidency,
    dataRegion,
    subjectIdentityHash: [...identities][0],
    directBillingConfirmed: true,
    routeProbeConfirmed: true,
    routeProbeContainsNaturalQuestionText: false,
    priceCurrency: "USD",
    inputUsdPerMillionTokens: price.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: price.outputUsdPerMillionTokens,
    sources: sources.map((source) => structuredClone(source)),
    sourceSetHash: sha256V5R3(canonicalJsonV5R3(sources.map(({ selfHash }) => selfHash))),
    validatedAt: input.validatedAt,
    authorizationEligibility: "ELIGIBLE_PENDING_SEPARATE_OWNER_PROVIDER_GRANT",
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "AuthenticatedRouteEvidenceReceiptV1");
  return receipt;
}

export function buildAuthenticatedRouteEvidenceV5R5(input) { return reconstructReceipt(input); }

export function validateAuthenticatedRouteEvidenceV5R5({ receipt }) {
  const errors = [];
  add(errors, validateSelfHashV5R3(receipt), "authenticated route receipt self-hash is invalid");
  for (const source of receipt?.sources ?? []) errors.push(...validateSource(source));
  try {
    const rebuilt = reconstructReceipt({
      activeRunnerRegistrationHash: receipt.activeRunnerRegistrationHash,
      provider: receipt.provider,
      sources: receipt.sources,
      validatedAt: receipt.validatedAt,
    });
    add(errors, canonicalJsonV5R3(rebuilt) === canonicalJsonV5R3(receipt), "authenticated route receipt differs from exact protected-source reconstruction");
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return Object.freeze([...new Set(errors)]);
}

export function buildProviderCostPreviewV5R5(input) {
  const tuple = PROVIDER_TUPLES[input?.provider];
  requireCondition(tuple, "cost preview provider is unknown");
  requireCondition(isHash(input.activeRunnerRegistrationHash) && isHash(input.priceEvidenceHash), "cost preview registration or price evidence hash is invalid");
  requireCondition(input.maximumSuccessfulCalls === tuple.maximumSuccessfulCalls && input.maximumAttempts === tuple.maximumAttempts
    && input.maximumTokens === tuple.maximumTokens, "cost preview call graph or token cap differs from the frozen provider envelope");
  requireCondition(Number.isSafeInteger(input.maximumInputTokens) && input.maximumInputTokens >= 0
    && Number.isSafeInteger(input.maximumOutputTokens) && input.maximumOutputTokens >= tuple.maximumSuccessfulCalls * 8192
    && input.maximumInputTokens + input.maximumOutputTokens === input.maximumTokens, "cost preview token reservations do not cover the complete successful-call graph");
  requireCondition(Number.isFinite(input.inputUsdPerMillionTokens) && input.inputUsdPerMillionTokens > 0
    && Number.isFinite(input.outputUsdPerMillionTokens) && input.outputUsdPerMillionTokens > 0, "cost preview requires independently authenticated positive rates");
  const worstCaseCostPreviewUsd = round(((input.maximumInputTokens * input.inputUsdPerMillionTokens)
    + (input.maximumOutputTokens * input.outputUsdPerMillionTokens)) / 1_000_000);
  const bufferedWorstCaseUsd = round(worstCaseCostPreviewUsd * 1.2);
  requireCondition(Number.isFinite(input.maximumEstimatedUsd) && bufferedWorstCaseUsd <= input.maximumEstimatedUsd,
    "independently recomputed 20 percent buffered worst-case cost exceeds the owner cap");
  requireCondition(isIso(input.computedAt), "cost preview timestamp is invalid");
  const preview = sealV5R3Artifact({
    schemaVersion: "ProviderCostPreviewReceiptV1",
    designId: "MAIS-NATURAL-CA60-V5",
    activeRunnerRegistrationHash: input.activeRunnerRegistrationHash,
    provider: input.provider,
    maximumSuccessfulCalls: input.maximumSuccessfulCalls,
    maximumAttempts: input.maximumAttempts,
    maximumInputTokens: input.maximumInputTokens,
    maximumOutputTokens: input.maximumOutputTokens,
    maximumTokens: input.maximumTokens,
    reservedOutputTokensPerSuccessfulCall: 8192,
    completeSuccessfulCallGraphOutputTokens: tuple.maximumSuccessfulCalls * 8192,
    inputUsdPerMillionTokens: input.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: input.outputUsdPerMillionTokens,
    priceEvidenceHash: input.priceEvidenceHash,
    worstCaseCostPreviewUsd,
    bufferMultiplier: 1.2,
    bufferedWorstCaseUsd,
    maximumEstimatedUsd: input.maximumEstimatedUsd,
    computedAt: input.computedAt,
  });
  assertClosedSelfHashedArtifactV5R5(preview, "ProviderCostPreviewReceiptV1");
  return preview;
}

export const V5_R5_ROUTE_CONSTANTS = Object.freeze({ requiredEvidenceKinds: REQUIRED_KINDS, providerTuples: PROVIDER_TUPLES });
