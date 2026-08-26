import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };
import {
  canonicalJsonV5R3,
  deriveProviderCostUsd,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
  validateFreshA11RunnerReviewV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  validateRunnerRegistrationV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5 } from "./openai-reference-adapter-v5.mjs";
import { DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS } from "./deepseek-evaluation-adapter-v5-r2.mjs";

const OPENAI_ROLES = Object.freeze(["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL", "ADJUDICATOR"]);
const DEEPSEEK_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION", "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const NON_AUTHORIZATIONS = Object.freeze(["NO_DEPLOYMENT", "NO_LIVE_QUESTION_BANK_MUTATION", "NO_GIT_MUTATION", "NO_MODEL_FALLBACK", "NO_BUDGET_TRANSFER", "NO_PROMPT_TUNING", "NO_RESULT_DEPENDENT_REPLACEMENT"]);
const DENYLIST = Object.freeze(["OPENAI_REFERENCE_FINAL_REFERENCE_TO_DEEPSEEK", "DEEPSEEK_OUTPUT_TO_OPENAI_REFERENCE", "SOURCE_PATH", "GIT_METADATA", "CREDENTIAL", "STUDENT_OR_USER_DATA", "OTHER_ITEM", "UNAUTHORIZED_COPYRIGHT_CONTENT", "INTERNAL_RESEARCH_RECORD"]);
const OPENAI_ALLOWLIST = Object.freeze(["prompt", "options", "locale", "grade", "topic", "responseForm", "storedAnswer", "acceptedAnswers", "explanation", "itemSolveArtifact", "aSolveArtifact", "aLabelArtifact", "bSolveArtifact", "bLabelArtifact"]);
const DEEPSEEK_ALLOWLIST = Object.freeze(["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation", "rubric", "difficulty", "itemPseudonym", "bPrimeCritiqueArtifact"]);

function exactSet(actual, expected) {
  return Array.isArray(actual) && new Set(actual).size === actual.length
    && canonicalJsonV5R3([...actual].sort()) === canonicalJsonV5R3([...expected].sort());
}

function add(errors, condition, message) { if (!condition && !errors.includes(message)) errors.push(message); }
function iso(value) { return typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }

function tuple(provider) {
  return provider === "OPENAI_DIRECT"
    ? Object.freeze({ provider, model: "gpt-5.6-luna", endpoint: "https://us.api.openai.com/v1/responses", projectResidency: "US_STORAGE_PROCESSING", roles: OPENAI_ROLES, maximumAttempts: 610, maximumSuccessfulCalls: 300, maximumTokens: 4_000_000, maximumUsd: 25 })
    : provider === "DEEPSEEK_DIRECT"
      ? Object.freeze({ provider, model: "deepseek-v4-pro", endpoint: "https://api.deepseek.com/chat/completions", projectResidency: "UNKNOWN_PENDING_ROUTE_PROBE_EVIDENCE", roles: DEEPSEEK_ROLES, maximumAttempts: 850, maximumSuccessfulCalls: 420, maximumTokens: 6_000_000, maximumUsd: 25 })
      : null;
}

export function providerEgressPolicyV5R4(provider) {
  const allowlist = provider === "OPENAI_DIRECT" ? OPENAI_ALLOWLIST : provider === "DEEPSEEK_DIRECT" ? DEEPSEEK_ALLOWLIST : null;
  if (!allowlist) throw new TypeError("provider egress policy tuple is unknown");
  const body = { schemaVersion: "ProviderEgressPolicyV2", provider, allowlist: [...allowlist].sort(), denylist: [...DENYLIST].sort(), enforcement: "REBUILD_EXACT_WIRE_BYTES_FROM_PROTECTED_MANIFEST_BOUND_ITEM" };
  return Object.freeze({ ...body, policyHash: sha256V5R3(canonicalJsonV5R3(body)) });
}

export function frozenRouteProbeWireRequestV5R4(provider) {
  if (provider === "OPENAI_DIRECT") return Object.freeze({
    model: "gpt-5.6-luna", stream: false, store: false, background: false,
    reasoning: { effort: "low", context: "current_turn" },
    input: [{ role: "system", content: [{ type: "input_text", text: "MAIS route probe. Return the exact JSON object requested; no natural-question content is present." }] }, { role: "user", content: [{ type: "input_text", text: "{\"routeProbe\":true}" }] }],
    text: { verbosity: "low", format: { type: "json_schema", name: "mais_route_probe", strict: true, schema: { type: "object", additionalProperties: false, required: ["routeProbe"], properties: { routeProbe: { const: true } } } } },
    max_output_tokens: 64, tools: [],
  });
  if (provider === "DEEPSEEK_DIRECT") return Object.freeze({
    model: "deepseek-v4-pro", stream: false, thinking: { type: "enabled" }, reasoning_effort: "low", temperature: 0,
    messages: [{ role: "system", content: "MAIS route probe. No natural-question content is present." }, { role: "user", content: "Return exactly {\"routeProbe\":true}." }],
    response_format: { type: "json_object" }, max_tokens: 64,
  });
  throw new TypeError("route probe provider is unknown");
}

export function routeProbeWireHashV5R4(provider) {
  return sha256V5R3(canonicalJsonV5R3(frozenRouteProbeWireRequestV5R4(provider)));
}

export function validateRouteEvidenceBundleV1({ registration, bundle, at }) {
  const errors = [...validateRunnerRegistrationV5R4(registration), ...validateClosedSelfHashedArtifactV5R4(bundle, "RouteEvidenceBundleV1")];
  const routeAuthorization = bundle?.routeProbeAuthorization;
  const attempt = bundle?.routeProbeAttemptReceipt;
  const leaves = [bundle?.accountEvidence, bundle?.billingEvidence, bundle?.dataRegionEvidence];
  const price = bundle?.priceSnapshot;
  errors.push(...validateClosedSelfHashedArtifactV5R4(routeAuthorization, "RouteProbeAuthorizationV1"));
  errors.push(...validateClosedSelfHashedArtifactV5R4(attempt, "ProviderRouteProbeAttemptReceiptV1"));
  for (const leaf of leaves) errors.push(...validateClosedSelfHashedArtifactV5R4(leaf, "ProviderRouteEvidenceLeafV1"));
  errors.push(...validateClosedSelfHashedArtifactV5R4(price, "ProviderPriceSnapshotV2"));
  const expected = tuple(bundle?.provider);
  add(errors, expected !== null && [bundle, routeAuthorization, price, ...leaves].every((artifact) => artifact?.provider === expected.provider
    && artifact?.model === expected.model && artifact?.endpoint === expected.endpoint)
    && attempt?.provider === expected.provider && attempt?.requestedModel === expected.model
    && attempt?.requestedEndpoint === expected.endpoint, "route evidence provider/model/endpoint tuple is inconsistent");
  add(errors, [bundle, routeAuthorization, attempt, ...leaves].every((artifact) => artifact?.projectResidency === expected?.projectResidency), "route evidence residency tuple is inconsistent");
  add(errors, bundle?.runnerRegistrationHash === registration?.selfHash && routeAuthorization?.runnerRegistrationHash === registration?.selfHash, "route evidence runner registration binding is invalid");
  add(errors, attempt?.authorizationHash === routeAuthorization?.selfHash, "route probe attempt does not bind its exact authorization");
  add(errors, attempt?.requestBodyHash === routeProbeWireHashV5R4(bundle?.provider), "route probe request body differs from the registered zero-natural-content request");
  add(errors, bundle?.containsNaturalQuestionText === false && routeAuthorization?.containsNaturalQuestionText === false && attempt?.containsNaturalQuestionText === false, "route evidence contains or claims authority for natural-question text");
  add(errors, attempt?.requestedModel === expected?.model && attempt?.observedModel === expected?.model
    && attempt?.requestedEndpoint === expected?.endpoint && attempt?.observedEndpoint === expected?.endpoint && attempt?.attemptStatus === "SUCCEEDED", "route probe did not confirm the exact requested/observed tuple");
  const subjectHashes = new Set(leaves.map((leaf) => leaf?.subjectIdentityHash));
  add(errors, subjectHashes.size === 1 && /^[0-9a-f]{64}$/u.test([...subjectHashes][0] ?? ""), "route evidence subject/project identity is inconsistent");
  add(errors, leaves.map((leaf) => leaf?.evidenceKind).sort().join("|") === ["ACCOUNT_PROJECT_IDENTITY", "DATA_REGION", "DIRECT_BILLING_ROUTE"].sort().join("|"), "route evidence leaf kinds are incomplete");
  add(errors, leaves.every((leaf) => leaf.sourceAttemptReceiptHash === null || leaf.sourceAttemptReceiptHash === attempt?.selfHash), "route evidence leaf references an unrelated provider attempt");
  add(errors, bundle?.priceSnapshot?.selfHash === price?.selfHash, "route evidence price snapshot binding is invalid");
  const now = Date.parse(at);
  add(errors, Number.isFinite(now) && iso(bundle?.validatedAt) && Date.parse(bundle.validatedAt) <= now, "route evidence validation timestamp is invalid");
  add(errors, [routeAuthorization, price, ...leaves].every((artifact) => iso(artifact?.expiresAt) && now < Date.parse(artifact.expiresAt)), "route, billing, region, account, or price evidence is expired");
  add(errors, iso(routeAuthorization?.issuedAt) && Date.parse(routeAuthorization.issuedAt) < Date.parse(attempt?.startedAt)
    && Date.parse(attempt?.finishedAt) <= Date.parse(bundle?.validatedAt), "route evidence chronology is invalid");
  add(errors, price?.capturedAt <= bundle?.validatedAt, "price snapshot postdates route validation");
  return Object.freeze([...new Set(errors)]);
}

export function buildRouteEvidenceBundleV1(input) {
  const body = {
    schemaVersion: "RouteEvidenceBundleV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: input.registration?.selfHash,
    provider: input.routeProbeAuthorization?.provider,
    model: input.routeProbeAuthorization?.model,
    endpoint: input.routeProbeAuthorization?.endpoint,
    projectResidency: input.routeProbeAuthorization?.projectResidency,
    routeProbeAuthorization: structuredClone(input.routeProbeAuthorization),
    routeProbeAttemptReceipt: structuredClone(input.routeProbeAttemptReceipt),
    accountEvidence: structuredClone(input.accountEvidence),
    billingEvidence: structuredClone(input.billingEvidence),
    dataRegionEvidence: structuredClone(input.dataRegionEvidence),
    priceSnapshot: structuredClone(input.priceSnapshot),
    containsNaturalQuestionText: false,
    validatedAt: input.validatedAt,
  };
  const bundle = sealV5R3Artifact(body);
  const errors = validateRouteEvidenceBundleV1({ registration: input.registration, bundle, at: input.validatedAt });
  if (errors.length > 0) throw new TypeError(errors.join("; "));
  return bundle;
}

function validateOwnerGrantAndCredential({ registration, review, inventory, routeEvidence, priceSnapshot, ownerGrant, credentialReadinessReceipt, authorization }) {
  const errors = [];
  errors.push(...validateClosedSelfHashedArtifactV5R4(ownerGrant, "OwnerProviderGrantV2"));
  errors.push(...validateClosedSelfHashedArtifactV5R4(credentialReadinessReceipt, "CredentialReadinessReceiptV2"));
  add(errors, ownerGrant?.runnerRegistrationHash === registration?.selfHash && ownerGrant?.freshRunnerReviewHash === review?.selfHash
    && ownerGrant?.sampleExecutionInventoryHash === inventory?.selfHash, "owner grant exact runner/review/inventory binding is invalid");
  add(errors, ownerGrant?.selfHash === authorization?.ownerGrantHash && credentialReadinessReceipt?.selfHash === authorization?.credentialReadinessReceiptHash, "authorization owner grant or credential receipt hash is invalid");
  add(errors, credentialReadinessReceipt?.runnerRegistrationHash === registration?.selfHash && credentialReadinessReceipt?.provider === authorization?.provider
    && credentialReadinessReceipt?.credentialValueRecorded === false, "credential readiness receipt binding or redaction state is invalid");
  for (const field of ["provider", "model", "endpoint", "projectResidency", "routeEvidenceBundleHash", "priceSnapshotHash", "egressPolicyHash", "referenceSealHash", "referenceAttemptChainHash", "roleContractRootHash", "adapterTransformHash", "providerImplementationHash", "issuedAt", "expiresAt", "authorizedBy", "maximumAttempts", "maximumSuccessfulCalls", "maximumInputTokens", "maximumOutputTokens", "maximumTokens", "maximumEstimatedUsd", "concurrencyCap", "maximumAttemptsPerItemRole", "worstCaseCostPreviewUsd", "bufferedWorstCaseUsd", "currency"]) {
    add(errors, ownerGrant?.[field] === authorization?.[field], `owner grant ${field} differs from authorization`);
  }
  add(errors, exactSet(ownerGrant?.nonAuthorizations, NON_AUTHORIZATIONS) && exactSet(authorization?.nonAuthorizations, NON_AUTHORIZATIONS), "owner grant or authorization non-authorizations are incomplete");
  add(errors, authorization?.routeEvidenceBundleHash === routeEvidence?.selfHash && authorization?.priceSnapshotHash === priceSnapshot?.selfHash, "authorization route or price binding is invalid");
  return errors;
}

export function validateProviderAuthorizationV5R4(input) {
  const { registration, review, inventory, routeEvidence, priceSnapshot, ownerGrant, credentialReadinessReceipt, authorization } = input;
  const errors = [...validateRunnerRegistrationV5R4(registration), ...validateFreshA11RunnerReviewV5R4({ registration, review }), ...validateSampleExecutionInventoryV2({ registration, inventory })];
  errors.push(...validateClosedSelfHashedArtifactV5R4(authorization, "ProviderAuthorizationV4"));
  errors.push(...validateClosedSelfHashedArtifactV5R4(priceSnapshot, "ProviderPriceSnapshotV2"));
  errors.push(...validateRouteEvidenceBundleV1({ registration, bundle: routeEvidence, at: input.at }));
  errors.push(...validateOwnerGrantAndCredential({ registration, review, inventory, routeEvidence, priceSnapshot, ownerGrant, credentialReadinessReceipt, authorization }));
  const expected = tuple(authorization?.provider);
  add(errors, expected !== null && authorization?.model === expected.model && authorization?.endpoint === expected.endpoint
    && authorization?.projectResidency === expected.projectResidency, "authorization provider tuple differs from the frozen design");
  add(errors, exactSet(authorization?.roleSet, expected?.roles ?? []), "authorization role set differs from the exact frozen provider roles");
  add(errors, authorization?.maximumAttempts <= expected?.maximumAttempts && authorization?.maximumSuccessfulCalls <= expected?.maximumSuccessfulCalls
    && authorization?.maximumTokens <= expected?.maximumTokens && authorization?.maximumEstimatedUsd <= expected?.maximumUsd
    && authorization?.maximumInputTokens + authorization?.maximumOutputTokens <= authorization?.maximumTokens
    && authorization?.maximumAttemptsPerItemRole === 2 && authorization?.concurrencyCap <= 4, "authorization caps exceed the provider-specific frozen design maxima");
  add(errors, authorization?.runnerRegistrationHash === registration?.selfHash && authorization?.runnerSourceCommit === registration?.runnerSourceCommit
    && authorization?.productionSourceRootHash === registration?.productionSourceRootHash && authorization?.testSourceRootHash === registration?.testSourceRootHash
    && authorization?.freshRunnerReviewHash === review?.selfHash && authorization?.sampleExecutionInventoryHash === inventory?.selfHash, "authorization exact runner/review/inventory binding is invalid");
  add(errors, authorization?.frameRegistrationHash === registration?.frameRegistrationHash && authorization?.sampleManifestHash === registration?.sampleManifestHash
    && authorization?.samplePayloadSetHash === registration?.samplePayloadSetHash && authorization?.privacyScreenHash === registration?.privacyScreenHash
    && authorization?.rightsScreenHash === registration?.rightsScreenHash, "authorization frozen frame/sample/screen roots are invalid");
  const policy = expected ? providerEgressPolicyV5R4(expected.provider) : null;
  add(errors, authorization?.egressPolicyHash === policy?.policyHash && ownerGrant?.egressPolicyHash === policy?.policyHash, "authorization egress policy hash is invalid");
  const expectedRoleRoot = authorization?.provider === "OPENAI_DIRECT"
    ? DESIGN.providerControls.openaiReferenceRoleContractCatalog.roleContractRootHash
    : DESIGN.providerControls.deepSeekRoleContractCatalog.inheritedRoleContractRootHash;
  const expectedAdapterTransform = authorization?.provider === "OPENAI_DIRECT"
    ? OPENAI_REFERENCE_ADAPTER_TRANSFORM_HASH_V5
    : DEEPSEEK_EVALUATION_ADAPTER_V5_R2_CONSTANTS.adapterTransformHash;
  const implementation = authorization?.provider === "OPENAI_DIRECT"
    ? registration?.providerImplementations?.openAI
    : registration?.providerImplementations?.deepSeek;
  add(errors, authorization?.roleContractRootHash === expectedRoleRoot
    && authorization?.adapterTransformHash === expectedAdapterTransform
    && authorization?.providerImplementationHash === implementation?.adapterHash, "authorization prompt/schema role root, adapter transform, or registered provider implementation binding is invalid");
  add(errors, authorization?.credentialReadAuthorized === true && authorization?.providerExecutionAuthorized === true
    && authorization?.naturalQuestionEgressAuthorized === true && authorization?.tokenAuthorizationCreated === true
    && authorization?.attemptAuthorizationCreated === true && authorization?.usdAuthorizationCreated === true, "authorization grant booleans are incomplete");
  const now = Date.parse(input.at);
  add(errors, Number.isFinite(now) && iso(authorization?.issuedAt) && iso(authorization?.expiresAt)
    && Date.parse(authorization.issuedAt) > Date.parse(review?.reviewedAt) && now >= Date.parse(authorization.issuedAt) && now < Date.parse(authorization.expiresAt), "authorization chronology or expiry is invalid");
  add(errors, authorization?.priceSnapshotHash === priceSnapshot?.selfHash && priceSnapshot?.provider === authorization?.provider
    && priceSnapshot?.model === authorization?.model && priceSnapshot?.endpoint === authorization?.endpoint, "price snapshot tuple or binding is invalid");
  add(errors, authorization?.bufferedWorstCaseUsd === Number((authorization?.worstCaseCostPreviewUsd * 1.2).toFixed(12))
    && authorization?.bufferedWorstCaseUsd <= authorization?.maximumEstimatedUsd, "20 percent worst-case cost buffer is invalid or exceeds the owner cap");
  add(errors, authorization?.projectIdentityHash === routeEvidence?.accountEvidence?.subjectIdentityHash, "authorization project/account identity is not bound to route evidence");
  if (authorization?.provider === "OPENAI_DIRECT") {
    add(errors, authorization.referenceSealHash === null && authorization.referenceAttemptChainHash === null, "OpenAI reference authorization must precede and therefore not bind a reference seal");
  } else if (authorization?.provider === "DEEPSEEK_DIRECT") {
    add(errors, /^[0-9a-f]{64}$/u.test(authorization.referenceSealHash ?? "")
      && /^[0-9a-f]{64}$/u.test(authorization.referenceAttemptChainHash ?? ""), "DeepSeek authorization must bind the completed reference seal and attempt chain");
  }
  return Object.freeze([...new Set(errors)]);
}

export function deriveReservedCostV5R4(requestArtifact, priceSnapshot) {
  assertClosedSelfHashedArtifactV5R4(requestArtifact, "ProviderRequestArtifactV4");
  assertClosedSelfHashedArtifactV5R4(priceSnapshot, "ProviderPriceSnapshotV2");
  const compatiblePrice = sealV5R3Artifact({
    schemaVersion: "ProviderPriceSnapshotV1",
    provider: priceSnapshot.provider,
    model: priceSnapshot.model,
    currency: priceSnapshot.currency,
    inputUsdPerMillionTokens: priceSnapshot.inputUsdPerMillionTokens,
    outputUsdPerMillionTokens: priceSnapshot.outputUsdPerMillionTokens,
    capturedAt: priceSnapshot.capturedAt,
  });
  return deriveProviderCostUsd({ inputTokens: requestArtifact.reservedInputTokens, outputTokens: requestArtifact.reservedOutputTokens }, compatiblePrice);
}

export const V5_R4_AUTHORIZATION_CONSTANTS = Object.freeze({
  openAIRoles: OPENAI_ROLES,
  deepSeekRoles: DEEPSEEK_ROLES,
  nonAuthorizations: NON_AUTHORIZATIONS,
  denylist: DENYLIST,
  openAIAllowlist: OPENAI_ALLOWLIST,
  deepSeekAllowlist: DEEPSEEK_ALLOWLIST,
  openAIDesignCaps: Object.freeze({ attempts: DESIGN.providerControls.openaiReferenceEnvelope.attemptCap, successfulCalls: DESIGN.providerControls.openaiReferenceEnvelope.successfulCallCap, tokens: DESIGN.providerControls.openaiReferenceEnvelope.totalTokenCap, usd: DESIGN.providerControls.openaiReferenceEnvelope.usdCap }),
  deepSeekDesignCaps: Object.freeze({ attempts: DESIGN.providerControls.deepSeekEnvelope.attemptCap, successfulCalls: DESIGN.providerControls.deepSeekEnvelope.successfulCallsMaximum, tokens: DESIGN.providerControls.deepSeekEnvelope.tokenCap, usd: DESIGN.providerControls.deepSeekEnvelope.usdCap }),
});
