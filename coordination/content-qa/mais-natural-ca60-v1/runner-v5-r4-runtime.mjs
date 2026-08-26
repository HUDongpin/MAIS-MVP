import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateFrozenNaturalItemLeafHashV4 } from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R4,
  validateClosedSelfHashedArtifactV5R4,
} from "./schema-contract-v5-r4.mjs";
import {
  establishProtectedRootV5R4,
  readProtectedJsonV5R4,
  atomicWriteProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  loadExactTrackedRunnerRegistrationV5R4,
  validateExactRunnerRegistrationEvidenceV5R4,
  validateSampleExecutionInventoryV2,
} from "./execution-evidence-v5-r4.mjs";
import { validateProviderAuthorizationV5R4 } from "./route-authorization-v5-r4.mjs";
import { createAtomicExecutionLedgerV5R4 } from "./atomic-execution-ledger-v5-r4.mjs";
import { buildProviderRequestArtifactV5R4 } from "./provider-request-v5-r4.mjs";
import {
  createExactProviderTransportV5R4,
  runGuardedProviderAttemptV5R4,
} from "./guarded-provider-attempt-v5-r4.mjs";
import {
  buildCanaryGateReceiptV5R4,
  planDeepSeekExecutionV5R4,
  planOpenAIReferenceResumeV5R4,
} from "./execution-state-v5-r4.mjs";
import {
  buildMachineReferenceSealV5R4,
  buildReferenceSealValidationReceiptV5R4,
} from "./reference-label-seal-v5-r4.mjs";
import {
  buildDeepSeekC0ExecutionSetV5R4,
} from "./deepseek-execution-control-v5-r4.mjs";
import {
  scoreNaturalCaV5R4,
} from "./scorer-v5-r4.mjs";
import {
  buildFinalExecutionVerificationReceiptV5R4,
  evaluateAggregateExportGateV5R4,
} from "./verification-publication-v5-r4.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function blocked(status, errors = []) {
  return Object.freeze({ ok: false, status, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    referenceLabelCount: 0, naturalQuestionResultCount: 0, errors: Object.freeze([...new Set(errors)]) });
}
function clockIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("runner clock is invalid");
  return date.toISOString();
}
function clockIsoStrictlyAfter(clock, earlier) {
  const observed = clockIso(clock);
  return Date.parse(observed) > Date.parse(earlier) ? observed : new Date(Date.parse(earlier) + 1).toISOString();
}

function relativeInside(root, candidate) {
  const relative = path.relative(root, candidate);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("workflow index must be a file strictly inside the protected root");
  return relative;
}

function artifact(context, kind, { required = true } = {}) {
  const value = context.artifacts.get(kind);
  if (required && value === undefined) throw new Error(`protected workflow artifact ${kind} is absent`);
  return value;
}

export function buildProtectedWorkflowIndexV5R4({ registration, artifactEntries, createdAt }) {
  assertClosedSelfHashedArtifactV5R4(registration, "NaturalCaExecutionRunnerRegistrationV3");
  requireCondition(Array.isArray(artifactEntries) && artifactEntries.length > 0, "workflow index requires at least one protected artifact entry");
  const entries = artifactEntries.map((entry) => {
    requireCondition(entry && typeof entry === "object" && !Array.isArray(entry)
      && typeof entry.kind === "string" && typeof entry.relativePath === "string"
      && Object.hasOwn(entry, "value"), "workflow index entry is incomplete");
    return {
      kind: entry.kind,
      relativePath: entry.relativePath,
      contentHash: sha256V5R3(Buffer.from(canonicalJsonV5R3(entry.value), "utf8")),
    };
  });
  requireCondition(new Set(entries.map(({ kind }) => kind)).size === entries.length
    && new Set(entries.map(({ relativePath }) => relativePath)).size === entries.length, "workflow index kinds and paths must each be unique");
  const index = sealV5R3Artifact({
    schemaVersion: "ProtectedWorkflowIndexV1",
    designId: "MAIS-NATURAL-CA60-V5",
    runnerRegistrationHash: registration.selfHash,
    artifactEntries: entries,
    createdAt,
  });
  assertClosedSelfHashedArtifactV5R4(index, "ProtectedWorkflowIndexV1");
  return index;
}

export async function loadProtectedWorkflowIndexV5R4(indexPath, {
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  registrationEvidenceLoader = () => loadExactTrackedRunnerRegistrationV5R4({ repoRoot }),
} = {}) {
  requireCondition(path.isAbsolute(indexPath) && path.isAbsolute(protectedRoot), "workflow index and protected root must be absolute");
  const trustedRoot = await establishProtectedRootV5R4(protectedRoot);
  const indexRelativePath = relativeInside(trustedRoot.root, path.resolve(indexPath));
  const index = await readProtectedJsonV5R4({ trustedRoot, relativePath: indexRelativePath });
  assertClosedSelfHashedArtifactV5R4(index, "ProtectedWorkflowIndexV1");
  const kinds = index.artifactEntries.map(({ kind }) => kind);
  const paths = index.artifactEntries.map(({ relativePath }) => relativePath);
  requireCondition(new Set(kinds).size === kinds.length && new Set(paths).size === paths.length, "workflow index kinds and paths must each be unique");
  const registrationEvidence = await registrationEvidenceLoader();
  const evidenceErrors = validateExactRunnerRegistrationEvidenceV5R4(registrationEvidence);
  requireCondition(evidenceErrors.length === 0 && index.runnerRegistrationHash === registrationEvidence.registration.selfHash,
    `workflow index exact registration evidence failed: ${evidenceErrors.join("; ")}`);
  const artifacts = new Map();
  for (const entry of index.artifactEntries) {
    const value = await readProtectedJsonV5R4({ trustedRoot, relativePath: entry.relativePath });
    requireCondition(sha256V5R3(Buffer.from(canonicalJsonV5R3(value), "utf8")) === entry.contentHash, `protected artifact ${entry.kind} content hash is invalid`);
    artifacts.set(entry.kind, value);
  }
  return Object.freeze({ index, registrationEvidence, registration: registrationEvidence.registration, trustedRoot, artifacts });
}

function providerEvidence(context, provider, at) {
  const prefix = provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
  return {
    registration: context.registration,
    review: artifact(context, "FRESH_RUNNER_REVIEW"),
    inventory: artifact(context, "SAMPLE_INVENTORY"),
    routeEvidence: artifact(context, `${prefix}_ROUTE_EVIDENCE`),
    priceSnapshot: artifact(context, `${prefix}_PRICE_SNAPSHOT`),
    ownerGrant: artifact(context, `${prefix}_OWNER_GRANT`),
    credentialReadinessReceipt: artifact(context, `${prefix}_CREDENTIAL_READINESS`),
    authorization: artifact(context, `${prefix}_AUTHORIZATION`),
    at,
  };
}

function fixedLedgerRelativePath(provider, authorizationHash) {
  return path.join("execution-ledgers", provider === "OPENAI_DIRECT" ? "openai-reference" : "deepseek-evaluation", authorizationHash);
}

async function openLedger(context, evidence) {
  return createAtomicExecutionLedgerV5R4({
    trustedRoot: context.trustedRoot,
    ledgerRelativePath: fixedLedgerRelativePath(evidence.authorization.provider, evidence.authorization.selfHash),
    authorization: evidence.authorization,
    inventory: evidence.inventory,
    priceSnapshot: evidence.priceSnapshot,
  });
}

function itemLeafForHash(context, itemHash) {
  const leaves = artifact(context, "ITEM_LEAF_SET");
  requireCondition(Array.isArray(leaves) && leaves.length === 60, "protected item-leaf set must contain exactly 60 rows");
  const matches = leaves.filter((leaf) => calculateFrozenNaturalItemLeafHashV4(leaf) === itemHash);
  requireCondition(matches.length === 1, "planned item does not resolve to exactly one protected frozen item leaf");
  return matches[0];
}

async function persistDerivedArtifact(context, family, value) {
  const relativePath = path.join("derived", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot: context.trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value), "existing derived artifact has the expected hash path but different canonical content");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot: context.trustedRoot, relativePath, value });
  }
  return relativePath;
}

async function requestArtifactsForLedger(context, ledgerEntries) {
  const hashes = [...new Set(ledgerEntries.filter((entry) => entry.entryType === "DISPATCH_RESERVED").map(({ requestArtifactHash }) => requestArtifactHash))];
  const values = [];
  for (const hash of hashes) values.push(await readProtectedJsonV5R4({ trustedRoot: context.trustedRoot, relativePath: path.join("derived", "provider-requests", `${hash}.json`) }));
  return values;
}

function attemptId(authorization, plan, entries) {
  return `${authorization.provider.toLowerCase()}-${authorization.selfHash.slice(0, 12)}-${String(entries.length + 1).padStart(6, "0")}-${String(plan.manifestOrdinal).padStart(2, "0")}-${plan.role.toLowerCase()}`;
}

function authorizationErrors(context, provider, at) {
  try {
    const evidence = providerEvidence(context, provider, at);
    return { evidence, errors: validateProviderAuthorizationV5R4(evidence) };
  } catch (error) {
    return { evidence: null, errors: [error instanceof Error ? error.message : String(error)] };
  }
}

export function createRunnerRuntimeV5R4({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  fetchImplementation = globalThis.fetch,
  credentialReaders = Object.freeze({}),
  clock = () => new Date(),
  registrationEvidenceLoader,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    return loadProtectedWorkflowIndexV5R4(indexPath, { protectedRoot, repoRoot, registrationEvidenceLoader });
  }

  async function verifyFrozenUpstream(context) {
    const errors = [
      ...validateExactRunnerRegistrationEvidenceV5R4(context.registrationEvidence),
      ...validateSampleExecutionInventoryV2({ registration: context.registration, inventory: artifact(context, "SAMPLE_INVENTORY") }),
    ];
    return errors.length > 0 ? blocked("UPSTREAM_FROZEN_EVIDENCE_BLOCKED", errors) : Object.freeze({ ok: true,
      status: "EXACT_V5_R4_REGISTRATION_FRAME_SAMPLE_AND_ZERO_AUTHORITY_VERIFIED", providerEventCount: 0,
      httpRequestCount: 0, credentialReadCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0 });
  }

  async function dryRun(context) {
    const upstream = await verifyFrozenUpstream(context);
    if (!upstream.ok) return upstream;
    return Object.freeze({ ...upstream, status: "OFFLINE_DRY_RUN_VERIFIED_NO_CREDENTIAL_READ_NO_PROVIDER_EVENT_NO_EGRESS" });
  }

  async function authorizeCheck(context, provider) {
    const at = clockIso(clock);
    const { errors } = authorizationErrors(context, provider, at);
    return errors.length > 0 ? blocked("AUTHORIZATION_BLOCKED", errors) : Object.freeze({ ok: true,
      status: "AUTHORIZATION_READY_NO_CREDENTIAL_READ_NO_DISPATCH", providerEventCount: 0, httpRequestCount: 0,
      credentialReadCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0 });
  }

  async function executeNext(context, { provider, mode }) {
    const at = clockIso(clock);
    const checked = authorizationErrors(context, provider, at);
    if (checked.errors.length > 0) return blocked("AUTHORIZATION_BLOCKED", checked.errors);
    const evidence = checked.evidence;
    const ledger = await openLedger(context, evidence);
    const verified = await ledger.verify();
    if (verified.errors.length > 0) return blocked("EXECUTION_LEDGER_BLOCKED", verified.errors);
    const common = {
      registration: context.registration,
      inventory: evidence.inventory,
      sampleManifest: artifact(context, "SAMPLE_MANIFEST"),
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      ledgerEntries: verified.entries,
      generatedAt: at,
    };
    let plan;
    if (provider === "OPENAI_DIRECT") plan = planOpenAIReferenceResumeV5R4({ ...common, authorization: evidence.authorization });
    else plan = planDeepSeekExecutionV5R4({
      ...common,
      mode,
      executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION"),
      deepSeekAuthorization: evidence.authorization,
      canaryGate: artifact(context, "CANARY_GATE", { required: false }),
      c0ExecutionSet: artifact(context, "DEEPSEEK_C0_EXECUTION_SET", { required: false }),
    });
    if (plan.planStatus === "C0_SET_REQUIRED") {
      const c0ExecutionSet = buildDeepSeekC0ExecutionSetV5R4({ ...common,
        executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION"), deepSeekAuthorization: evidence.authorization });
      const protectedArtifactPath = await persistDerivedArtifact(context, "deepseek-c0-sets", c0ExecutionSet);
      return Object.freeze({ ok: true, status: "C0_EXECUTION_SET_FROZEN_NO_PROVIDER_EVENT", plan, c0ExecutionSet,
        protectedArtifactPath, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        referenceLabelCount: 0, naturalQuestionResultCount: 0 });
    }
    if (plan.planStatus === "PHASE_COMPLETE" && provider === "DEEPSEEK_DIRECT" && mode === "DEEPSEEK_CANARY"
      && !artifact(context, "CANARY_GATE", { required: false })) {
      const canaryGate = buildCanaryGateReceiptV5R4({ ...common,
        executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION"), deepSeekAuthorization: evidence.authorization, passedAt: at });
      const protectedArtifactPath = await persistDerivedArtifact(context, "canary-gates", canaryGate);
      return Object.freeze({ ok: true, status: "REGISTERED_CANARY_INTEGRITY_CLEARED_NO_TUNING", plan, canaryGate,
        protectedArtifactPath, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        referenceLabelCount: 0, naturalQuestionResultCount: 1 });
    }
    if (plan.planStatus !== "NEXT_ACTION") return Object.freeze({ ok: plan.planStatus === "PHASE_COMPLETE",
      status: plan.planStatus, plan, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
      referenceLabelCount: 0, naturalQuestionResultCount: 0 });
    const itemLeaf = itemLeafForHash(context, plan.itemHash);
    const requestArtifact = buildProviderRequestArtifactV5R4({
      registration: context.registration,
      authorization: evidence.authorization,
      inventory: evidence.inventory,
      sampleManifest: common.sampleManifest,
      itemLeaf,
      role: plan.role,
      attemptId: attemptId(evidence.authorization, plan, verified.entries),
      ledgerEntries: verified.entries,
    });
    await persistDerivedArtifact(context, "provider-requests", requestArtifact);
    const credentialReader = credentialReaders[provider];
    const transport = createExactProviderTransportV5R4({
      fetchImplementation: typeof fetchImplementation === "function" ? fetchImplementation : async () => { throw new Error("fetch implementation unavailable"); },
      credentialReader: typeof credentialReader === "function" ? credentialReader : async () => null,
      clock,
    });
    return runGuardedProviderAttemptV5R4({
      ...evidence,
      sampleManifest: common.sampleManifest,
      itemLeaf,
      requestArtifact,
      ledgerEntries: verified.entries,
      ledger,
      transport,
      at,
      failureClock: () => clockIso(clock),
    });
  }

  async function executeOpenAIResumeStep(context) { return executeNext(context, { provider: "OPENAI_DIRECT", mode: "REFERENCE_RESUME" }); }
  async function executeDeepSeekCanaryStep(context) { return executeNext(context, { provider: "DEEPSEEK_DIRECT", mode: "DEEPSEEK_CANARY" }); }
  async function executeDeepSeekResumeStep(context) { return executeNext(context, { provider: "DEEPSEEK_DIRECT", mode: "DEEPSEEK_RESUME" }); }

  async function sealReferenceLabels(context) {
    const at = clockIso(clock);
    const checked = authorizationErrors(context, "OPENAI_DIRECT", at);
    if (checked.errors.length > 0) return blocked("REFERENCE_LABEL_SEAL_BLOCKED", checked.errors);
    const ledger = await openLedger(context, checked.evidence);
    const verified = await ledger.verify();
    if (verified.errors.length > 0) return blocked("REFERENCE_LABEL_SEAL_BLOCKED", verified.errors);
    try {
      const referenceSeal = buildMachineReferenceSealV5R4({ registration: context.registration,
        authorization: checked.evidence.authorization, inventory: checked.evidence.inventory, ledgerEntries: verified.entries, sealedAt: at });
      const validationReceipt = buildReferenceSealValidationReceiptV5R4({ registration: context.registration,
        authorization: checked.evidence.authorization, inventory: checked.evidence.inventory, ledgerEntries: verified.entries,
        seal: referenceSeal, validatedAt: clockIsoStrictlyAfter(clock, referenceSeal.sealedAt) });
      await persistDerivedArtifact(context, "reference-seals", referenceSeal);
      await persistDerivedArtifact(context, "reference-seal-validations", validationReceipt);
      return Object.freeze({ ok: true, status: "MACHINE_REFERENCE_LABELS_FROZEN", referenceSeal, validationReceipt,
        providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0, referenceLabelCount: 60, naturalQuestionResultCount: 0 });
    } catch (error) { return blocked("REFERENCE_LABEL_SEAL_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function assembleEvidence(context, scoredAt = clockIso(clock)) {
    const openAI = providerEvidence(context, "OPENAI_DIRECT", scoredAt);
    const deepSeek = providerEvidence(context, "DEEPSEEK_DIRECT", scoredAt);
    const referenceLedger = await openLedger(context, openAI);
    const deepSeekLedger = await openLedger(context, deepSeek);
    const referenceVerified = await referenceLedger.verify();
    const deepSeekVerified = await deepSeekLedger.verify();
    requireCondition(referenceVerified.errors.length + deepSeekVerified.errors.length === 0, [...referenceVerified.errors, ...deepSeekVerified.errors].join("; "));
    const referenceSeal = artifact(context, "REFERENCE_SEAL");
    const referenceSealValidationReceipt = artifact(context, "REFERENCE_SEAL_VALIDATION");
    const executionRegistration = artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION");
    const c0ExecutionSet = artifact(context, "DEEPSEEK_C0_EXECUTION_SET");
    const requestArtifacts = await requestArtifactsForLedger(context, deepSeekVerified.entries);
    const common = {
      registration: context.registration,
      review: artifact(context, "FRESH_RUNNER_REVIEW"),
      inventory: artifact(context, "SAMPLE_INVENTORY"),
      sampleManifest: artifact(context, "SAMPLE_MANIFEST"),
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      openAIAuthorization: openAI.authorization,
      deepSeekAuthorization: deepSeek.authorization,
      referenceLedgerEntries: referenceVerified.entries,
      deepSeekLedgerEntries: deepSeekVerified.entries,
      referenceSeal,
      referenceSealValidationReceipt,
      executionRegistration,
      c0ExecutionSet,
      requestArtifacts,
      canaryGate: artifact(context, "CANARY_GATE"),
      priceSnapshot: deepSeek.priceSnapshot,
      routeEvidence: deepSeek.routeEvidence,
      ownerGrant: deepSeek.ownerGrant,
      credentialReadinessReceipt: deepSeek.credentialReadinessReceipt,
      referenceSealContext: { authorization: openAI.authorization, ledgerEntries: referenceVerified.entries },
      executionRegistrationContext: {
        review: artifact(context, "FRESH_RUNNER_REVIEW"),
        deepSeekAuthorization: deepSeek.authorization,
        referenceSeal,
        referenceSealValidationReceipt,
        referenceSealContext: { authorization: openAI.authorization, ledgerEntries: referenceVerified.entries },
        deepSeekAuthorizationContext: deepSeek,
      },
      scoredAt,
    };
    return common;
  }

  async function score(context) {
    try {
      const input = await assembleEvidence(context);
      const scoreReceipt = scoreNaturalCaV5R4(input);
      for (const marker of scoreReceipt.completedItemMarkers) await persistDerivedArtifact(context, "completed-item-markers", marker);
      await persistDerivedArtifact(context, "aggregate-scores", scoreReceipt);
      return Object.freeze({ ok: !["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED"].includes(scoreReceipt.overallDecision),
        status: scoreReceipt.overallDecision, scoreReceipt, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
        referenceLabelCount: 60, naturalQuestionResultCount: scoreReceipt.itemResults.filter(({ executionDisposition }) => executionDisposition === "COMPLETE").length });
    } catch (error) { return blocked("SCORING_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function verify(context) {
    try {
      const verifiedAt = clockIso(clock);
      const input = await assembleEvidence(context, verifiedAt);
      input.scoreReceipt = artifact(context, "AGGREGATE_SCORE_RECEIPT");
      const finalVerificationReceipt = buildFinalExecutionVerificationReceiptV5R4({ ...input, verifiedAt });
      await persistDerivedArtifact(context, "final-verifications", finalVerificationReceipt);
      return Object.freeze({ ok: true, status: "FULL_EXECUTION_CHAIN_RECOMPUTED", finalVerificationReceipt,
        providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0, referenceLabelCount: 60,
        naturalQuestionResultCount: finalVerificationReceipt.naturalQuestionResultCount });
    } catch (error) { return blocked("FULL_CHAIN_VERIFICATION_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function exportAggregateReport(context) {
    try {
      const input = await assembleEvidence(context);
      input.scoreReceipt = artifact(context, "AGGREGATE_SCORE_RECEIPT");
      input.finalVerificationReceipt = artifact(context, "FINAL_EXECUTION_VERIFICATION");
      input.independentResultReview = artifact(context, "A11_RESULT_REVIEW");
      input.claimBoundaryReview = artifact(context, "A18_CLAIM_BOUNDARY_REVIEW");
      const gate = evaluateAggregateExportGateV5R4(input);
      return Object.freeze({ ok: false, status: gate.status, gate, providerEventCount: 0, httpRequestCount: 0,
        credentialReadCount: 0, referenceLabelCount: 60, naturalQuestionResultCount: input.finalVerificationReceipt.naturalQuestionResultCount });
    } catch (error) { return blocked("AGGREGATE_EXPORT_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  return Object.freeze({ loadWorkflowContext, verifyFrozenUpstream, dryRun, authorizeCheck,
    executeOpenAIResumeStep, executeDeepSeekCanaryStep, executeDeepSeekResumeStep,
    sealReferenceLabels, score, verify, exportAggregateReport });
}

export const V5_R4_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  requestArtifactPattern: "derived/provider-requests/<selfHash>.json",
  openAILedgerPattern: "execution-ledgers/openai-reference/<authorizationHash>/",
  deepSeekLedgerPattern: "execution-ledgers/deepseek-evaluation/<authorizationHash>/",
});
