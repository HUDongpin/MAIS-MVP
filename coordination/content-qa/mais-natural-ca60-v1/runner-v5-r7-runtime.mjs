import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateFrozenNaturalItemLeafHashV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R7,
  validateExactRunnerRegistrationEvidenceV5R7,
  validateFreshRunnerReviewV5R7,
} from "./execution-evidence-v5-r7.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  ACTIVE_REGISTRATION_KIND_V5_R7,
  ACTIVE_REVIEW_KIND_V5_R7,
  advanceProtectedWorkflowIndexV5R7,
  loadProtectedWorkflowIndexV5R7,
  resolveActiveRunnerReviewV5R7,
} from "./workflow-index-v5-r7.mjs";
import {
  validateProviderActivationV5R7,
} from "./activation-guard-v5-r7.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildReferenceDispatchAuthorityV5R7,
} from "./dispatch-authority-v5-r7.mjs";
import {
  buildSemanticDispatchAuthorityV5R7,
  buildSemanticDispatchVerificationReceiptV5R7,
} from "./semantic-dispatch-v5-r7.mjs";
import {
  NativeProviderAttemptFailureV5R7,
  createNativeProviderTransportV5R7,
  runNativeProviderAttemptV5R7,
} from "./native-provider-attempt-v5-r7.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  createCommandTransitionJournalV5R7,
  prepareProviderDispatchIntentV5R7,
  recordObservedProviderActivityV5R7,
  runJournaledTransitionSequenceV5R7,
} from "./transition-journal-v5-r7.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  reconstructAttemptGraphV5R7,
  roleOutputByEvidenceV5R7,
  validateAttemptGraphReconstructionReceiptV5R7,
} from "./attempt-graph-v5-r7.mjs";
import {
  buildC0PredicateInputMapV5R7,
  buildCanaryGateReceiptV5R7,
  buildCanaryPredicateInputMapV5R7,
  buildCanaryPredicateReceiptV5R7,
  buildNormalC0ExecutionSetV5R7,
  validateCanaryGateReceiptV5R7,
  validateNormalC0ExecutionSetV5R7,
} from "./c0-state-v5-r7.mjs";
import {
  buildRawAuthoritativeMachineReferenceSealV5R7,
  buildRawAuthoritativeReferenceValidationV5R7,
} from "./raw-authoritative-reference-v5-r7.mjs";
import {
  buildDeepSeekExecutionRegistrationV5R7,
} from "./execution-freeze-v5-r7.mjs";
import {
  scoreNaturalCaV5R7,
  verifyNaturalCaScoreFromRawEvidenceV5R7,
} from "./scorer-verifier-v5-r7.mjs";
import {
  buildAttestedRouteEvidenceV5R7,
  buildProviderCostPreviewV5R7,
  validateAttestedRouteEvidenceV5R7,
  validateProviderCostPreviewV5R7,
} from "./evidence-attestation-v5-r7.mjs";
import {
  validateClosedSelfHashedArtifactV5R7,
} from "./schema-contract-v5-r7.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");
const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const PROVIDER_COMMANDS = new Set(["label-reference", "execute-deepseek"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function clockIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R7 runner clock is invalid");
  return date.toISOString();
}

function later(value, milliseconds = 1) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

function transitionTime(context, desired) {
  const prior = Date.parse(context.index.createdAt);
  const candidate = Date.parse(desired);
  return new Date(Number.isFinite(candidate) && candidate > prior ? candidate : prior + 1).toISOString();
}

function exactActivity(extra = {}) {
  return {
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    activityAccountingStatus: "EXACT",
    ...extra,
  };
}

function blocked(status, errors = [], extra = {}) {
  return Object.freeze({
    ok: false,
    status,
    ...exactActivity(),
    referenceLabelCount: 0,
    naturalQuestionResultCount: 0,
    transitionJournal: null,
    errors: Object.freeze([...new Set(errors)]),
    ...extra,
  });
}

function success(status, extra = {}) {
  return Object.freeze({
    ok: true,
    status,
    ...exactActivity(),
    referenceLabelCount: 0,
    naturalQuestionResultCount: 0,
    transitionJournal: null,
    errors: Object.freeze([]),
    ...extra,
  });
}

function activityFromJournal(journal) {
  if (!journal) return exactActivity();
  if (journal.activityAccountingStatus === "UNKNOWN_FAIL_CLOSED") {
    return {
      providerEventCount: null,
      httpRequestCount: null,
      credentialReadCount: null,
      naturalQuestionEgressCount: null,
      activityAccountingStatus: "UNKNOWN_FAIL_CLOSED",
    };
  }
  return {
    providerEventCount: journal.providerEventCountLowerBound,
    httpRequestCount: journal.httpRequestCountLowerBound,
    credentialReadCount: journal.credentialReadCountLowerBound,
    naturalQuestionEgressCount: journal.naturalQuestionEgressCountLowerBound,
    activityAccountingStatus: journal.activityAccountingStatus,
  };
}

function artifact(context, kind, { required = true } = {}) {
  const value = context?.artifacts?.get?.(kind);
  if (required && value === undefined) throw new Error(`protected R7 workflow artifact ${kind} is absent`);
  return value;
}

function providerPrefix(provider) {
  requireCondition(["OPENAI_DIRECT", "DEEPSEEK_DIRECT"].includes(provider), "R7 provider is invalid");
  return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
}

function providerArtifact(context, provider, suffix, options) {
  return artifact(context, `${providerPrefix(provider)}_${suffix}_V5_R7`, options);
}

function valuesWithExtras(context, extras = []) {
  const values = [...(context?.artifacts?.values?.() ?? []), ...extras];
  const unique = new Map();
  for (const value of values) if (value?.selfHash) unique.set(value.selfHash, value);
  return [...unique.values()];
}

function valuesBySchema(context, schemaVersion, extras = []) {
  return valuesWithExtras(context, extras).filter((value) => value?.schemaVersion === schemaVersion);
}

function findByHash(context, selfHash, extras = []) {
  return valuesWithExtras(context, extras).find((value) => value.selfHash === selfHash);
}

function fixedLedgerRelativePath(provider, compatibilityAuthorizationHash) {
  return path.join("execution-ledgers-v5-r7", provider === "OPENAI_DIRECT"
    ? "openai-reference" : "deepseek-evaluation", compatibilityAuthorizationHash);
}

function itemLeafForHash(context, itemHash) {
  const leaves = artifact(context, "ITEM_LEAF_SET");
  requireCondition(Array.isArray(leaves) && leaves.length === 60,
    "protected item-leaf set must contain exactly 60 frozen rows");
  const matches = leaves.filter((leaf) => calculateFrozenNaturalItemLeafHashV4(leaf) === itemHash);
  requireCondition(matches.length === 1, "planned item does not resolve to one exact frozen protected leaf");
  return matches[0];
}

async function writeContentAddressed({ trustedRoot, family, value }) {
  const relativePath = path.join("runtime-custody-v5-r7", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R7 runtime custody path already contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return Object.freeze({ contentHash: value.selfHash, relativePath });
}

function appendStore(context, family) {
  return Object.freeze({ append: (value) => writeContentAddressed({
    trustedRoot: context.trustedRoot,
    family,
    value,
  }) });
}

function graphEvidenceCollections(context, authorization, extras = []) {
  const activeHash = context.activeRegistration.selfHash;
  const requests = valuesBySchema(context, "ProviderRequestArtifactV5", extras)
    .filter((value) => value.activeRunnerRegistrationHash === activeHash
      && value.authorizationHash === authorization.selfHash);
  const resolved = valuesBySchema(context, "ResolvedProviderAttemptReceiptV2", extras)
    .filter((value) => value.activeRunnerRegistrationHash === activeHash
      && value.authorizationHash === authorization.selfHash);
  const referenced = (field) => new Set(resolved.map((value) => value[field]));
  const auditHashes = referenced("dispatchAuditHash");
  const permitHashes = referenced("dispatchPermitHash");
  const compatibilityPermitHashes = referenced("compatibilityDispatchPermitHash");
  const rawHashes = referenced("rawResponseArtifactHash");
  const bindingHashes = referenced("rawResponseBindingReceiptHash");
  const intentHashes = referenced("attemptCommitIntentHash");
  const all = valuesWithExtras(context, extras);
  const dispatchAudits = all.filter((value) => auditHashes.has(value.selfHash));
  return Object.freeze({
    requestArtifacts: requests,
    dispatchAudits,
    semanticDispatchAuthorities: authorization.provider === "DEEPSEEK_DIRECT"
      ? dispatchAudits.filter(({ schemaVersion }) => schemaVersion === "SemanticDispatchAuthorityReceiptV1") : [],
    dispatchPermits: all.filter((value) => permitHashes.has(value.selfHash)),
    compatibilityDispatchPermits: all.filter((value) => compatibilityPermitHashes.has(value.selfHash)),
    rawResponseArtifacts: all.filter((value) => rawHashes.has(value.selfHash)),
    rawResponseBindingReceipts: all.filter((value) => bindingHashes.has(value.selfHash)),
    attemptCommitIntents: all.filter((value) => intentHashes.has(value.selfHash)),
    resolvedAttemptReceipts: resolved,
  });
}

function graphForTerminal(context, provider, terminalHash, extras = []) {
  return valuesBySchema(context, "AttemptGraphReconstructionReceiptV1", extras)
    .filter((value) => value.provider === provider && value.ledgerTerminalHash === terminalHash)
    .sort((left, right) => left.derivedAt.localeCompare(right.derivedAt)).at(-1) ?? null;
}

function successfulEvidence(graph, roles = null) {
  return graph.roleAttemptEvidenceReceipts.filter((value) => value.attemptStatus === "SUCCEEDED"
    && (roles === null || roles.includes(value.role)));
}

export function deriveImmutableTerminalCauseV5R7({ ledgerEntries, authorization }) {
  const reservations = ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const completions = ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED");
  const completedByReservation = new Map(completions.map((value) => [value.reservationHash, value]));
  if (reservations.some((value) => !completedByReservation.has(value.selfHash))) {
    return "ACTIVE_RESERVATION_REQUIRES_EXACT_OWNER_AUTHORIZED_RECOVERY";
  }
  const failures = completions.filter(({ attemptStatus }) => attemptStatus !== "SUCCEEDED");
  const grouped = new Map();
  for (const reservation of reservations) {
    const key = `${reservation.itemHash}:${reservation.role}`;
    grouped.set(key, (grouped.get(key) ?? 0)
      + (completedByReservation.get(reservation.selfHash)?.attemptStatus === "SUCCEEDED" ? 0 : 1));
  }
  if ([...grouped.values()].some((count) => count >= authorization.maximumAttemptsPerItemRole)) {
    return "ITEM_ROLE_ATTEMPT_CAP_EXHAUSTED_FROM_LEDGER";
  }
  if (reservations.length >= authorization.maximumAttempts) return "PROVIDER_ATTEMPT_CAP_EXHAUSTED_FROM_LEDGER";
  if (failures.some(({ attemptStatus }) => attemptStatus === "PROVIDER_TUPLE_DRIFT")) {
    return "PROVIDER_TUPLE_DRIFT_FROM_COMPLETION";
  }
  if (failures.some(({ attemptStatus }) => attemptStatus === "CAP_INTEGRITY_FAILED")) {
    return "TOKEN_OR_COST_CAP_INTEGRITY_FAILED_FROM_COMPLETION";
  }
  if (failures.length > 0) return "RETRYABLE_OR_TERMINAL_PROVIDER_FAILURES_PRESENT_IN_LEDGER";
  return "EXECUTION_INCOMPLETE_WITHOUT_FABRICATED_TERMINAL_CAUSE";
}

export function createRunnerRuntimeV5R7({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  fetchImplementation = null,
  credentialReaders = Object.freeze({}),
  clock = () => new Date(),
  registrationEvidenceLoader,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    return loadProtectedWorkflowIndexV5R7(indexPath, {
      protectedRoot,
      repoRoot,
      registrationEvidenceLoader,
    });
  }

  async function loadFreshReview(reviewPath) {
    requireCondition(path.isAbsolute(reviewPath ?? ""), "fresh A11 review path must be absolute");
    return JSON.parse(await readFile(reviewPath, "utf8"));
  }

  async function advance(context, command, appendedArtifacts, at = clockIso(clock)) {
    return advanceProtectedWorkflowIndexV5R7({
      context,
      command,
      appendedArtifacts,
      committedAt: transitionTime(context, at),
    });
  }

  async function adoptR7WorkflowIndex(context, freshReview) {
    try {
      const reviewErrors = validateFreshRunnerReviewV5R7({
        activeRegistration: context.activeRegistration,
        registrationEvidence: context.registrationEvidence,
        freshReview,
      });
      requireCondition(reviewErrors.length === 0, reviewErrors.join("; "));
      if (context.needsR7Adoption !== true) {
        const existing = artifact(context, ACTIVE_REVIEW_KIND_V5_R7, { required: false });
        requireCondition(existing?.selfHash === freshReview.selfHash,
          "active R7 workflow already exists with a different or absent fresh review");
        return success("V5_R7_WORKFLOW_ALREADY_ADOPTED_EXACT_REVIEW_VERIFIED_NO_PROVIDER_ACTIVITY");
      }
      const transition = await advance(context, "adopt-r7-index", [
        { kind: ACTIVE_REGISTRATION_KIND_V5_R7, family: "runner-registrations", value: context.activeRegistration },
        { kind: ACTIVE_REVIEW_KIND_V5_R7, family: "runner-reviews", value: freshReview },
      ], freshReview.reviewedAt);
      context.needsR7Adoption = false;
      return success("V5_R7_WORKFLOW_SUPERSEDED_WITH_FRESH_A11_REVIEW_NO_PROVIDER_ACTIVITY", { transition });
    } catch (error) {
      return blocked("V5_R7_WORKFLOW_ADOPTION_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  function upstreamErrors(context, { requireReview = true } = {}) {
    const errors = [];
    try { errors.push(...validateExactRunnerRegistrationEvidenceV5R7(context?.registrationEvidence)); }
    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    try { errors.push(...validateActiveRunnerRegistrationV5R7(context?.activeRegistration)); }
    catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    if (context?.needsR7Adoption) errors.push("protected workflow has not adopted the exact V5-R7 registration");
    if (requireReview) {
      try {
        errors.push(...validateFreshRunnerReviewV5R7({
          activeRegistration: context?.activeRegistration,
          registrationEvidence: context?.registrationEvidence,
          freshReview: artifact(context, ACTIVE_REVIEW_KIND_V5_R7, { required: false }),
        }));
      } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    }
    try {
      errors.push(...validateManifestBoundInventoryV5R5({
        registration: context?.registration,
        inventory: artifact(context, "SAMPLE_INVENTORY", { required: false }),
        sampleManifest: artifact(context, "SAMPLE_MANIFEST", { required: false }),
        c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT", { required: false }),
        screenEvidence: artifact(context, "SCREEN_EVIDENCE", { required: false }),
      }));
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
    return [...new Set(errors)];
  }

  async function verifyFrozenUpstream(context) {
    const errors = upstreamErrors(context);
    return errors.length > 0
      ? blocked("UPSTREAM_FROZEN_EVIDENCE_OR_FRESH_A11_REVIEW_BLOCKED", errors)
      : success("EXACT_V5_R7_REGISTRATION_REVIEW_FRAME_SAMPLE_AND_ZERO_AUTHORITY_VERIFIED");
  }

  async function dryRun(context) {
    const verified = await verifyFrozenUpstream(context);
    return verified.ok
      ? success("OFFLINE_V5_R7_DRY_RUN_VERIFIED_NO_CREDENTIAL_READ_NO_PROVIDER_EVENT_NO_EGRESS")
      : verified;
  }

  function evidenceBase(context, provider) {
    return {
      registrationEvidence: context.registrationEvidence,
      registration: context.registration,
      activeRegistration: context.activeRegistration,
      freshReview: resolveActiveRunnerReviewV5R7(context.artifacts),
      inventory: artifact(context, "SAMPLE_INVENTORY"),
      sampleManifest: artifact(context, "SAMPLE_MANIFEST"),
      c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT"),
      screenEvidence: artifact(context, "SCREEN_EVIDENCE"),
      authenticatedRouteEvidence: providerArtifact(context, provider, "AUTHENTICATED_ROUTE_EVIDENCE"),
      costPreview: providerArtifact(context, provider, "COST_PREVIEW"),
      ownerActivationGrant: providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT"),
      priceSnapshot: providerArtifact(context, provider, "PRICE_SNAPSHOT"),
      authorization: providerArtifact(context, provider, "AUTHORIZATION"),
      inventoryAuthorization: providerArtifact(context, provider, "INVENTORY_AUTHORIZATION", { required: false }),
      provider,
    };
  }

  async function openLedger(context, evidence) {
    return createAtomicExecutionLedgerV5R7({
      trustedRoot: context.trustedRoot,
      ledgerRelativePath: fixedLedgerRelativePath(evidence.authorization.provider,
        evidence.authorization.compatibilityAuthorizationHash),
      authorization: evidence.authorization.compatibilityAuthorization,
      inventory: evidence.inventory,
      priceSnapshot: evidence.priceSnapshot,
    });
  }

  function roleOutputsForEvidence(evidenceReceipts, ledgerEntries) {
    return roleOutputByEvidenceV5R7({ roleAttemptEvidenceReceipts: evidenceReceipts, ledgerEntries });
  }

  function canaryPredicateState(context, evidence, ledgerEntries, extras = []) {
    const predicate = artifact(context, "CANARY_C0_PREDICATE_V5_R7", { required: false });
    if (!predicate) return { predicate: null, inputMap: null, input: null };
    const graphs = valuesBySchema(context, "AttemptGraphReconstructionReceiptV1", extras)
      .filter((value) => value.provider === "DEEPSEEK_DIRECT" && value.graphStatus === "COMPLETE_VALID")
      .sort((left, right) => left.completionCount - right.completionCount);
    const canaryHash = evidence.inventory.items[0].itemHash;
    const graph = graphs.find((value) => {
      const base = successfulEvidence(value, BASE_ROLES).filter(({ itemHash }) => itemHash === canaryHash);
      return base.length === 2 && value.roleAttemptEvidenceReceipts.every(({ itemHash }) => itemHash === canaryHash);
    });
    requireCondition(graph, "R7 canary predicate source graph is absent");
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    const outputs = roleOutputsForEvidence(baseEvidence, ledgerEntries);
    const inputMap = buildCanaryPredicateInputMapV5R7({
      inventory: evidence.inventory,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      roleAttemptEvidenceReceipts: baseEvidence,
      roleOutputs: outputs,
    });
    return { predicate, inputMap, input: inputMap.get(canaryHash) };
  }

  function normalC0State(context, evidence, ledgerEntries, extras = []) {
    const c0ExecutionSet = artifact(context, "DEEPSEEK_C0_EXECUTION_SET_V5_R7", { required: false });
    if (!c0ExecutionSet) return { c0ExecutionSet: null, predicateInputsByItem: null };
    const graphs = valuesBySchema(context, "AttemptGraphReconstructionReceiptV1", extras)
      .filter((value) => value.provider === "DEEPSEEK_DIRECT" && value.graphStatus === "COMPLETE_VALID")
      .sort((left, right) => left.completionCount - right.completionCount);
    const graph = graphs.find((value) => {
      const base = successfulEvidence(value, BASE_ROLES);
      return new Set(base.map(({ itemHash, role }) => `${itemHash}:${role}`)).size === 120;
    });
    requireCondition(graph, "R7 full base-role source graph for the C0 set is absent");
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    const outputs = roleOutputsForEvidence(baseEvidence, ledgerEntries);
    const predicateInputsByItem = buildC0PredicateInputMapV5R7({
      inventory: evidence.inventory,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      roleAttemptEvidenceReceipts: baseEvidence,
      roleOutputs: outputs,
    });
    const errors = validateNormalC0ExecutionSetV5R7({
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7").selfHash,
      inventory: evidence.inventory,
      predicateInputsByItem,
      c0ExecutionSet,
    });
    requireCondition(errors.length === 0, errors.join("; "));
    return { c0ExecutionSet, predicateInputsByItem };
  }

  function canaryGateState(context, evidence, ledgerEntries, extras = []) {
    const canaryGate = artifact(context, "CANARY_GATE_V5_R7", { required: false });
    if (!canaryGate) return { canaryGate: null, canaryGateContext: null };
    const graph = graphForTerminal(context, "DEEPSEEK_DIRECT", canaryGate.ledgerTerminalHash, extras);
    requireCondition(graph, "R7 canary gate source graph is absent");
    const predicateState = canaryPredicateState(context, evidence, ledgerEntries, extras);
    const semantic = findByHash(context, canaryGate.semanticDispatchVerificationReceiptHash, extras);
    const prefixEnd = ledgerEntries.findIndex(({ selfHash }) => selfHash === canaryGate.ledgerTerminalHash);
    requireCondition(prefixEnd >= 0 && semantic, "R7 canary ledger prefix or semantic receipt is absent");
    const prefix = ledgerEntries.slice(0, prefixEnd + 1);
    const roleEvidence = graph.roleAttemptEvidenceReceipts;
    const roleOutputs = roleOutputsForEvidence(roleEvidence, prefix);
    const canaryGateContext = {
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7").selfHash,
      deepSeekAuthorizationHash: evidence.authorization.selfHash,
      inventory: evidence.inventory,
      canaryPredicateReceipt: predicateState.predicate,
      canaryPredicateInput: predicateState.input,
      roleAttemptEvidenceReceipts: roleEvidence,
      roleOutputs,
      semanticDispatchVerificationReceipt: semantic,
    };
    const errors = validateCanaryGateReceiptV5R7({ canaryGate, ...canaryGateContext });
    requireCondition(errors.length === 0, errors.join("; "));
    return { canaryGate, canaryGateContext };
  }

  function buildGraphContext(context, evidence, ledgerEntries, extras = [], overrides = {}) {
    const predicateState = overrides.predicateState ?? canaryPredicateState(context, evidence, ledgerEntries, extras);
    const c0State = overrides.c0State ?? normalC0State(context, evidence, ledgerEntries, extras);
    const gateState = overrides.gateState ?? canaryGateState(context, evidence, ledgerEntries, extras);
    return {
      ...evidence,
      ledgerEntries,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      executionRegistration: evidence.provider === "DEEPSEEK_DIRECT"
        ? artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7") : null,
      canaryPredicateReceipt: predicateState.predicate,
      canaryPredicateInput: predicateState.input,
      canaryGate: gateState.canaryGate,
      canaryGateContext: gateState.canaryGateContext,
      c0ExecutionSet: c0State.c0ExecutionSet,
      predicateInputsByItem: c0State.predicateInputsByItem,
      ...graphEvidenceCollections(context, evidence.authorization, extras),
    };
  }

  function reconstructGraph(context, evidence, ledgerEntries, extras, derivedAt, overrides = {}) {
    const graphContext = buildGraphContext(context, evidence, ledgerEntries, extras, overrides);
    const built = reconstructAttemptGraphV5R7({ ...graphContext, derivedAt });
    return { ...built, graphContext };
  }

  function semanticAuthorityContexts(context, evidence, ledgerEntries, graphContext, graph) {
    const byHash = new Map(graphContext.semanticDispatchAuthorities.map((value) => [value.selfHash, value]));
    const reservations = ledgerEntries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
    const contexts = new Map();
    for (const roleEvidence of graph.roleAttemptEvidenceReceipts) {
      const authority = byHash.get(roleEvidence.semanticDispatchAuthorityHash);
      requireCondition(authority, "R7 semantic evidence lacks its exact authority");
      const reservationIndex = ledgerEntries.findIndex(({ entryType, attemptId }) =>
        entryType === "DISPATCH_RESERVED" && attemptId === authority.attemptId);
      requireCondition(reservationIndex >= 0, "R7 semantic authority reservation is absent");
      contexts.set(authority.selfHash, {
        ...evidence,
        executionRegistration: graphContext.executionRegistration,
        mode: authority.mode,
        ledgerEntries: ledgerEntries.slice(0, reservationIndex),
        canaryPredicateReceipt: authority.canaryPredicateReceiptHash
          ? graphContext.canaryPredicateReceipt : null,
        canaryPredicateInput: authority.canaryPredicateReceiptHash
          ? graphContext.canaryPredicateInput : null,
        canaryGate: authority.canaryGateHash ? graphContext.canaryGate : null,
        canaryGateContext: authority.canaryGateHash ? graphContext.canaryGateContext : null,
        c0ExecutionSet: authority.c0ExecutionSetHash ? graphContext.c0ExecutionSet : null,
        predicateInputsByItem: authority.c0ExecutionSetHash
          ? graphContext.predicateInputsByItem : null,
      });
    }
    return contexts;
  }

  function buildSemanticVerification(context, evidence, ledgerEntries, built, verifiedAt, mode,
    roleEvidenceReceipts = built.receipt.roleAttemptEvidenceReceipts) {
    const graph = built.receipt;
    const authorityByHash = new Map(built.graphContext.semanticDispatchAuthorities
      .map((value) => [value.selfHash, value]));
    const authorities = roleEvidenceReceipts
      .map((value) => authorityByHash.get(value.semanticDispatchAuthorityHash));
    requireCondition(authorities.every(Boolean), "R7 graph evidence lacks ordered semantic authorities");
    return buildSemanticDispatchVerificationReceiptV5R7({
      activeRegistration: context.activeRegistration,
      authorization: evidence.authorization,
      executionRegistration: built.graphContext.executionRegistration,
      inventory: evidence.inventory,
      mode,
      ledgerEntries,
      semanticDispatchAuthorities: authorities,
      semanticAuthorityContextsByHash: semanticAuthorityContexts(context, evidence,
        ledgerEntries, built.graphContext, graph),
      roleAttemptEvidenceReceipts: roleEvidenceReceipts,
      canaryPredicateReceipt: built.graphContext.canaryPredicateReceipt,
      canaryGate: built.graphContext.canaryGate,
      c0ExecutionSet: built.graphContext.c0ExecutionSet,
      verifiedAt,
    });
  }

  async function referenceSealContextFromContext(context, { derivedAt = clockIso(clock) } = {}) {
    const evidence = evidenceBase(context, "OPENAI_DIRECT");
    const ledger = await openLedger(context, evidence);
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0, verified.errors.join("; "));
    const seal = artifact(context, "REFERENCE_SEAL_V5_R7", { required: false });
    const graph = seal ? findByHash(context, seal.attemptGraphReconstructionReceiptHash)
      : null;
    const built = reconstructGraph(context, evidence, verified.entries, [], graph?.derivedAt ?? derivedAt, {
      predicateState: { predicate: null, inputMap: null, input: null },
      c0State: { c0ExecutionSet: null, predicateInputsByItem: null },
      gateState: { canaryGate: null, canaryGateContext: null },
    });
    if (graph) requireCondition(canonicalJsonV5R3(graph) === canonicalJsonV5R3(built.receipt),
      "stored reference graph differs from raw-attempt reconstruction");
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID", built.receipt.lineageErrors.join("; "));
    return {
      activeRegistration: context.activeRegistration,
      freshReview: evidence.freshReview,
      authorization: evidence.authorization,
      registration: context.registration,
      inventory: evidence.inventory,
      attemptGraphReceipt: built.receipt,
      attemptGraphContext: built.graphContext,
    };
  }

  async function activationContext(context, provider, at) {
    const evidence = { ...evidenceBase(context, provider), at };
    if (provider !== "DEEPSEEK_DIRECT") return evidence;
    const referenceSealContext = await referenceSealContextFromContext(context, { derivedAt: at });
    return {
      ...evidence,
      executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7", { required: false }),
      referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R7", { required: false }),
      compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R7", { required: false }),
      referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R7", { required: false }),
      referenceSealContext,
      referenceAttemptChainHash: artifact(context, "REFERENCE_SEAL_V5_R7", { required: false })
        ?.attemptChainHash ?? null,
    };
  }

  async function authorizeCheck(context, provider) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const input = await activationContext(context, provider, clockIso(clock));
      const errors = validateProviderActivationV5R7(input);
      return errors.length > 0 ? blocked("AUTHORIZATION_BLOCKED", errors)
        : success("V5_R7_AUTHORIZATION_READY_NO_CREDENTIAL_READ_NO_DISPATCH");
    } catch (error) {
      return blocked("AUTHORIZATION_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function registerAuthenticatedRouteEvidence(context, provider) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      let routeEvidence = providerArtifact(context, provider, "AUTHENTICATED_ROUTE_EVIDENCE",
        { required: false });
      const routeAlreadyRegistered = Boolean(routeEvidence);
      if (!routeEvidence) {
        routeEvidence = providerArtifact(context, provider, "ROUTE_EVIDENCE_CANDIDATE", { required: false });
        if (!routeEvidence) {
          const buildInput = providerArtifact(context, provider, "ROUTE_EVIDENCE_BUILD_INPUT");
          routeEvidence = buildAttestedRouteEvidenceV5R7({
            ...buildInput,
            activeRunnerRegistrationHash: context.activeRegistration.selfHash,
            provider,
          });
        }
      }
      const routeErrors = validateAttestedRouteEvidenceV5R7(routeEvidence);
      requireCondition(routeErrors.length === 0 && routeEvidence.provider === provider
        && routeEvidence.activeRunnerRegistrationHash === context.activeRegistration.selfHash,
      routeErrors.join("; "));
      const additions = routeAlreadyRegistered ? [] : [{
          kind: `${providerPrefix(provider)}_AUTHENTICATED_ROUTE_EVIDENCE_V5_R7`,
          family: "authenticated-route-evidence",
          value: routeEvidence,
        }];
      const previewCandidate = providerArtifact(context, provider, "COST_PREVIEW_CANDIDATE", { required: false });
      if (previewCandidate && !providerArtifact(context, provider, "COST_PREVIEW", { required: false })) {
        const previewErrors = validateProviderCostPreviewV5R7({ routeEvidence, preview: previewCandidate });
        requireCondition(previewErrors.length === 0, previewErrors.join("; "));
        additions.push({ kind: `${providerPrefix(provider)}_COST_PREVIEW_V5_R7`,
          family: "provider-cost-previews", value: previewCandidate });
      }
      const authorizationCandidate = providerArtifact(context, provider, "AUTHORIZATION_CANDIDATE",
        { required: false });
      const grantCandidate = providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT_CANDIDATE",
        { required: false });
      const priceCandidate = providerArtifact(context, provider, "PRICE_SNAPSHOT_CANDIDATE",
        { required: false });
      const liveBundleCandidateCount = [authorizationCandidate, grantCandidate, priceCandidate]
        .filter(Boolean).length;
      if (liveBundleCandidateCount > 0) {
        requireCondition(liveBundleCandidateCount === 3
          && (previewCandidate || providerArtifact(context, provider, "COST_PREVIEW", { required: false })),
        "R7 authorization adoption requires an all-or-none authorization/grant/price/cost candidate bundle");
        const candidateErrors = [
          ...validateClosedSelfHashedArtifactV5R7(authorizationCandidate, "ProviderAuthorizationV5"),
          ...validateClosedSelfHashedArtifactV5R7(grantCandidate, "OwnerRunnerActivationGrantV1"),
          ...validateClosedSelfHashedArtifactV5R7(priceCandidate, "ProviderPriceSnapshotV2"),
        ];
        requireCondition(candidateErrors.length === 0
          && authorizationCandidate.provider === provider
          && authorizationCandidate.activeRunnerRegistrationHash === context.activeRegistration.selfHash
          && authorizationCandidate.freshRunnerReviewHash
            === resolveActiveRunnerReviewV5R7(context.artifacts).selfHash
          && authorizationCandidate.authenticatedRouteEvidenceHash === routeEvidence.selfHash
          && authorizationCandidate.compatibilityAuthorization.priceSnapshotHash === priceCandidate.selfHash
          && priceCandidate.inputUsdPerMillionTokens === routeEvidence.inputUsdPerMillionTokens
          && priceCandidate.outputUsdPerMillionTokens === routeEvidence.outputUsdPerMillionTokens
          && grantCandidate.providerAuthorizationHash === authorizationCandidate.selfHash
          && grantCandidate.authenticatedRouteEvidenceHash === routeEvidence.selfHash,
        `R7 authorization candidate bundle is invalid: ${candidateErrors.join("; ")}`);
        for (const [suffix, family, value] of [
          ["AUTHORIZATION", "provider-authorizations", authorizationCandidate],
          ["OWNER_ACTIVATION_GRANT", "owner-activation-grants", grantCandidate],
          ["PRICE_SNAPSHOT", "provider-price-snapshots", priceCandidate],
        ]) {
          requireCondition(!providerArtifact(context, provider, suffix, { required: false }),
            `R7 ${provider} ${suffix} is already registered; replacement requires a new registration version`);
          additions.push({ kind: `${providerPrefix(provider)}_${suffix}_V5_R7`, family, value });
        }
      }
      requireCondition(additions.length > 0,
        "R7 route/authorization bundle is already registered or no new candidate artifact is present");
      const transition = await advance(context, "register-route-evidence", additions,
        routeEvidence.validatedAt);
      return success("V5_R7_RAW_DERIVED_ATTESTED_ROUTE_EVIDENCE_REGISTERED_NO_PROVIDER_ACTIVITY", {
        receipt: routeEvidence,
        transition,
      });
    } catch (error) {
      return blocked("AUTHENTICATED_ROUTE_EVIDENCE_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function makeJournal(context, command, startedAt) {
    const commandId = sha256V5R3(canonicalJsonV5R3({
      command,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      priorWorkflowIndexHash: context.index.selfHash,
      startedAt,
    }));
    return createCommandTransitionJournalV5R7({
      commandId,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      startedAt,
      persistIntent: (value) => writeContentAddressed({ trustedRoot: context.trustedRoot,
        family: "transition-intents", value }),
      persistSubreceipt: (value) => writeContentAddressed({ trustedRoot: context.trustedRoot,
        family: "transition-subreceipts", value }),
      persistFinalJournal: (value) => writeContentAddressed({ trustedRoot: context.trustedRoot,
        family: "transition-journals", value }),
    });
  }

  function attemptArtifactAdditions(run) {
    return [
      { kind: `DISPATCH_PERMIT_V5_R7:${run.permit.selfHash}`, family: "dispatch-permits", value: run.permit },
      { kind: `COMPATIBILITY_DISPATCH_PERMIT_V5_R7:${run.compatibilityPermit.selfHash}`,
        family: "compatibility-dispatch-permits", value: run.compatibilityPermit },
      { kind: `RAW_RESPONSE_ARTIFACT_V5_R7:${run.rawResponseArtifact.selfHash}`,
        family: "raw-response-artifacts", value: run.rawResponseArtifact },
      { kind: `RAW_RESPONSE_BINDING_V5_R7:${run.rawResponseBindingReceipt.selfHash}`,
        family: "raw-response-bindings", value: run.rawResponseBindingReceipt },
      { kind: `PROVIDER_EVENT_V5_R7:${run.providerEventReceipt.selfHash}`,
        family: "provider-events", value: run.providerEventReceipt },
      { kind: `ATTEMPT_COMMIT_INTENT_V5_R7:${run.attemptCommitIntent.selfHash}`,
        family: "attempt-commit-intents", value: run.attemptCommitIntent },
      { kind: `RESOLVED_PROVIDER_ATTEMPT_V5_R7:${run.resolvedAttemptReceipt.selfHash}`,
        family: "resolved-provider-attempts", value: run.resolvedAttemptReceipt },
      ...(run.roleOutput ? [{ kind: `ROLE_OUTPUT_V5_R7:${run.roleOutput.selfHash}`,
        family: "role-outputs", value: run.roleOutput }] : []),
    ];
  }

  function derivePostAttemptArtifacts(context, evidence, ledgerEntries, extras, at) {
    const graphAt = later(at, 1);
    const built = reconstructGraph(context, evidence, ledgerEntries, extras, graphAt);
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID", built.receipt.lineageErrors.join("; "));
    const additions = [{ kind: `ATTEMPT_GRAPH_V5_R7:${built.receipt.selfHash}`,
      family: "attempt-graphs", value: built.receipt }];
    if (evidence.provider !== "DEEPSEEK_DIRECT") return additions;

    const graph = built.receipt;
    const canaryHash = evidence.inventory.items[0].itemHash;
    let predicate = built.graphContext.canaryPredicateReceipt;
    let predicateInput = built.graphContext.canaryPredicateInput;
    const canaryBase = successfulEvidence(graph, BASE_ROLES)
      .filter(({ itemHash }) => itemHash === canaryHash);
    if (!predicate && canaryBase.length === 2) {
      const outputs = roleOutputsForEvidence(canaryBase, ledgerEntries);
      const inputMap = buildCanaryPredicateInputMapV5R7({ inventory: evidence.inventory,
        itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: canaryBase,
        roleOutputs: outputs });
      predicateInput = inputMap.get(canaryHash);
      predicate = buildCanaryPredicateReceiptV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        inventory: evidence.inventory,
        predicateInputsByItem: inputMap,
      });
      additions.push({ kind: "CANARY_C0_PREDICATE_V5_R7", family: "canary-predicates", value: predicate });
    }

    const requiredCanaryCount = predicate ? 2 + (predicate.selectedForC0 ? 5 : 0) : null;
    const canaryEvidence = graph.roleAttemptEvidenceReceipts
      .filter(({ itemHash, attemptStatus }) => itemHash === canaryHash && attemptStatus === "SUCCEEDED");
    if (!built.graphContext.canaryGate && predicate && canaryEvidence.length === requiredCanaryCount) {
      const verificationContext = {
        ...built,
        graphContext: { ...built.graphContext, canaryPredicateReceipt: predicate,
          canaryPredicateInput: predicateInput },
      };
      const semantic = buildSemanticVerification(context, evidence, ledgerEntries,
        verificationContext, later(at, 2), "DEEPSEEK_CANARY", canaryEvidence);
      const outputs = roleOutputsForEvidence(canaryEvidence, ledgerEntries);
      const gate = buildCanaryGateReceiptV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        deepSeekAuthorizationHash: evidence.authorization.selfHash,
        inventory: evidence.inventory,
        canaryPredicateReceipt: predicate,
        canaryPredicateInput: predicateInput,
        roleAttemptEvidenceReceipts: canaryEvidence,
        roleOutputs: outputs,
        semanticDispatchVerificationReceipt: semantic,
        ledgerTerminalHash: graph.ledgerTerminalHash,
        passedAt: later(at, 3),
      });
      additions.push(
        { kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R7:${semantic.selfHash}`,
          family: "semantic-dispatch-verifications", value: semantic },
        { kind: "CANARY_GATE_V5_R7", family: "canary-gates", value: gate },
      );
    }

    let c0ExecutionSet = built.graphContext.c0ExecutionSet;
    let predicateInputsByItem = built.graphContext.predicateInputsByItem;
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    const baseKeys = new Set(baseEvidence.map(({ itemHash, role }) => `${itemHash}:${role}`));
    if (!c0ExecutionSet && baseKeys.size === 120) {
      const outputs = roleOutputsForEvidence(baseEvidence, ledgerEntries);
      predicateInputsByItem = buildC0PredicateInputMapV5R7({ inventory: evidence.inventory,
        itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: baseEvidence,
        roleOutputs: outputs });
      c0ExecutionSet = buildNormalC0ExecutionSetV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        inventory: evidence.inventory,
        predicateInputsByItem,
      });
      additions.push({ kind: "DEEPSEEK_C0_EXECUTION_SET_V5_R7", family: "c0-execution-sets",
        value: c0ExecutionSet });
    }

    if (c0ExecutionSet) {
      const expected = 120 + c0ExecutionSet.selectedItemHashes.length * C0_ROLES.length;
      const succeeded = successfulEvidence(graph);
      if (succeeded.length === expected) {
        const verificationContext = {
          ...built,
          graphContext: { ...built.graphContext, c0ExecutionSet, predicateInputsByItem },
        };
        const semantic = buildSemanticVerification(context, evidence, ledgerEntries,
          verificationContext, later(at, 4), "DEEPSEEK_RESUME");
        additions.push({ kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R7:${semantic.selfHash}`,
          family: "semantic-dispatch-verifications", value: semantic });
      }
    }
    return additions;
  }

  async function executeNext(context, provider, mode) {
    if (typeof fetchImplementation !== "function" || typeof credentialReaders[provider] !== "function") {
      return blocked("LIVE_BINDINGS_NOT_INSTALLED", [
        "V5-R7 has no default fetch or credential-reader binding; separate provider/egress/token/attempt/USD authorization remains required",
      ]);
    }
    let journal = null;
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const at = transitionTime(context, clockIso(clock));
      const evidence = await activationContext(context, provider, at);
      const activationErrors = validateProviderActivationV5R7(evidence);
      requireCondition(activationErrors.length === 0, activationErrors.join("; "));
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      requireCondition(verified.errors.length === 0, verified.errors.join("; "));
      const predicateState = provider === "DEEPSEEK_DIRECT"
        ? canaryPredicateState(context, evidence, verified.entries) : { predicate: null, input: null };
      const c0State = provider === "DEEPSEEK_DIRECT"
        ? normalC0State(context, evidence, verified.entries)
        : { c0ExecutionSet: null, predicateInputsByItem: null };
      const gateState = provider === "DEEPSEEK_DIRECT"
        ? canaryGateState(context, evidence, verified.entries)
        : { canaryGate: null, canaryGateContext: null };
      const authorityContext = {
        ...evidence,
        mode,
        ledgerEntries: verified.entries,
        executionRegistration: evidence.executionRegistration,
        canaryPredicateReceipt: predicateState.predicate,
        canaryPredicateInput: predicateState.input,
        canaryGate: gateState.canaryGate,
        canaryGateContext: gateState.canaryGateContext,
        c0ExecutionSet: c0State.c0ExecutionSet,
        predicateInputsByItem: c0State.predicateInputsByItem,
        issuedAt: at,
      };
      const dispatchAuthority = provider === "OPENAI_DIRECT"
        ? buildReferenceDispatchAuthorityV5R7(authorityContext)
        : buildSemanticDispatchAuthorityV5R7(authorityContext);
      const requestArtifact = buildProviderRequestArtifactV5R6({
        activeRegistration: context.activeRegistration,
        authorization: evidence.authorization,
        registration: context.registration,
        inventory: evidence.inventory,
        sampleManifest: evidence.sampleManifest,
        itemLeaf: itemLeafForHash(context, dispatchAuthority.itemHash),
        role: dispatchAuthority.role,
        attemptId: dispatchAuthority.attemptId,
        ledgerEntries: verified.entries,
      });
      const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
      const transport = createNativeProviderTransportV5R7({ fetchImplementation,
        credentialReader: credentialReaders[provider], clock });
      journal = await makeJournal(context, provider === "OPENAI_DIRECT"
        ? "label-reference" : mode === "DEEPSEEK_CANARY"
          ? "execute-deepseek-canary" : "execute-deepseek-resume", at);
      let run = null;
      const journalResult = await runJournaledTransitionSequenceV5R7({
        journal,
        steps: [
          {
            name: "REQUEST_AND_DISPATCH_AUTHORITY",
            preparedAt: at,
            priorWorkflowIndexHash: context.index.selfHash,
            run: () => advance(context, "request-and-dispatch-authority", [
              { kind: `PROVIDER_REQUEST_V5_R7:${requestArtifact.selfHash}`,
                family: "provider-requests", value: requestArtifact },
              { kind: `DISPATCH_AUTHORITY_V5_R7:${dispatchAuthority.selfHash}`,
                family: "dispatch-authorities", value: dispatchAuthority },
            ], later(at, 1)),
          },
          {
            name: "NATIVE_PROVIDER_ATTEMPT_AND_DERIVED_STATE",
            preparedAt: later(at, 2),
            priorWorkflowIndexHash: () => context.index.selfHash,
            run: async () => {
              await prepareProviderDispatchIntentV5R7(journal, {
                attemptId: dispatchAuthority.attemptId,
                stepName: "NATIVE_PROVIDER_ATTEMPT",
                priorWorkflowIndexHash: context.index.selfHash,
                naturalQuestionEgressPossible: true,
                preparedAt: later(at, 3),
              });
              try {
                run = await runNativeProviderAttemptV5R7({
                  ...authorityContext,
                  at,
                  requestArtifact,
                  dispatchAuthority,
                  dispatchAuthorityContext: authorityContext,
                  ledger,
                  transport,
                  rawResponseStore,
                  dispatchAuthorityStore: appendStore(context, "dispatch-authorities-native"),
                  dispatchPermitStore: appendStore(context, "dispatch-permits-native"),
                  compatibilityDispatchPermitStore: appendStore(context, "compatibility-dispatch-permits-native"),
                  attemptCommitIntentStore: appendStore(context, "attempt-commit-intents-native"),
                  resolvedAttemptReceiptStore: appendStore(context, "resolved-provider-attempts-native"),
                });
                recordObservedProviderActivityV5R7(journal, run);
              } catch (error) {
                const activity = error instanceof NativeProviderAttemptFailureV5R7 ? error.activity : null;
                if (activity?.activityStatus === "EXACT") recordObservedProviderActivityV5R7(journal, activity);
                throw error;
              }
              const after = await ledger.verify();
              requireCondition(after.errors.length === 0, after.errors.join("; "));
              const attemptAdditions = attemptArtifactAdditions(run);
              const extras = [requestArtifact, dispatchAuthority,
                ...attemptAdditions.map(({ value }) => value)];
              const derived = derivePostAttemptArtifacts(context, evidence, after.entries, extras, later(at, 4));
              return advance(context, "native-provider-attempt-and-derived-state",
                [...attemptAdditions, ...derived], later(at, 10));
            },
          },
        ],
        finishedAt: later(at, 20),
      });
      if (!journalResult.ok) {
        return blocked("JOURNALED_PROVIDER_STEP_FAILED", [journalResult.error], {
          ...activityFromJournal(journalResult.journal),
          transitionJournal: journalResult.journal,
        });
      }
      return Object.freeze({
        ...run,
        ok: run.status === "SUCCEEDED",
        status: run.status === "SUCCEEDED" ? "V5_R7_PROVIDER_ATTEMPT_SUCCEEDED_AND_RECONSTRUCTED"
          : `V5_R7_PROVIDER_ATTEMPT_RECORDED_${run.status}`,
        naturalQuestionEgressCount: run.providerEventCount,
        referenceLabelCount: 0,
        naturalQuestionResultCount: 0,
        activityAccountingStatus: "EXACT",
        transitionJournal: journalResult.journal,
        errors: Object.freeze([]),
      });
    } catch (error) {
      const activity = error instanceof NativeProviderAttemptFailureV5R7 ? error.activity : null;
      const journalActivity = journal ? activityFromJournal(journal) : exactActivity();
      return blocked("STATE_BOUND_PROVIDER_STEP_BLOCKED", [error instanceof Error ? error.message : String(error)], {
        ...(activity?.activityStatus === "EXACT" ? activity : journalActivity),
        transitionJournal: null,
      });
    }
  }

  async function executeOpenAIResumeStep(context) {
    return executeNext(context, "OPENAI_DIRECT", "REFERENCE_RESUME");
  }

  async function executeDeepSeekCanaryStep(context) {
    return executeNext(context, "DEEPSEEK_DIRECT", "DEEPSEEK_CANARY");
  }

  async function executeDeepSeekResumeStep(context) {
    return executeNext(context, "DEEPSEEK_DIRECT", "DEEPSEEK_RESUME");
  }

  async function sealReferenceLabels(context) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      requireCondition(!artifact(context, "REFERENCE_SEAL_V5_R7", { required: false }),
        "R7 reference labels are already sealed; append-only replacement requires a new registration version");
      const sealedAt = transitionTime(context, clockIso(clock));
      const evidence = await activationContext(context, "OPENAI_DIRECT", sealedAt);
      const activationErrors = validateProviderActivationV5R7(evidence);
      requireCondition(activationErrors.length === 0, activationErrors.join("; "));
      const referenceSealContext = await referenceSealContextFromContext(context, { derivedAt: sealedAt });
      const built = buildRawAuthoritativeMachineReferenceSealV5R7({
        ...referenceSealContext,
        sealedAt,
      });
      const validatedAt = later(sealedAt, 1);
      const validationReceipt = buildRawAuthoritativeReferenceValidationV5R7({
        ...referenceSealContext,
        seal: built.seal,
        compatibilityReferenceSeal: built.compatibilityReferenceSeal,
        validatedAt,
      });
      const transition = await advance(context, "seal-reference-labels", [
        { kind: `ATTEMPT_GRAPH_V5_R7:${referenceSealContext.attemptGraphReceipt.selfHash}`,
          family: "attempt-graphs", value: referenceSealContext.attemptGraphReceipt },
        { kind: "REFERENCE_COMPATIBILITY_SEAL_V5_R7", family: "reference-compatibility-seals",
          value: built.compatibilityReferenceSeal },
        { kind: "REFERENCE_SEAL_V5_R7", family: "reference-seals", value: built.seal },
        { kind: "REFERENCE_SEAL_VALIDATION_V5_R7", family: "reference-seal-validations",
          value: validationReceipt },
      ], validatedAt);
      return success("MACHINE_REFERENCE_LABELS_FROZEN_RAW_AUTHORITATIVE_V5_R7_NO_PROVIDER_ACTIVITY", {
        referenceSeal: built.seal,
        compatibilityReferenceSeal: built.compatibilityReferenceSeal,
        validationReceipt,
        transition,
        referenceLabelCount: 60,
      });
    } catch (error) {
      return blocked("REFERENCE_LABEL_SEAL_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function freezeDeepSeekExecutionRegistration(context) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      requireCondition(!artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7", { required: false }),
        "DeepSeek R7 execution registration is already frozen; replacement requires a new version");
      const registeredAt = transitionTime(context, clockIso(clock));
      const evidence = evidenceBase(context, "DEEPSEEK_DIRECT");
      const referenceSealContext = await referenceSealContextFromContext(context, { derivedAt: registeredAt });
      const executionRegistration = buildDeepSeekExecutionRegistrationV5R7({
        ...evidence,
        referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R7"),
        compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R7"),
        referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R7"),
        referenceSealContext,
        registeredAt,
      });
      const transition = await advance(context, "freeze-deepseek-registration", [{
        kind: "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7",
        family: "deepseek-execution-registrations",
        value: executionRegistration,
      }], registeredAt);
      return success("DEEPSEEK_EXECUTION_REGISTRATION_V5_R7_FROZEN_NO_PROVIDER_ACTIVITY", {
        executionRegistration,
        transition,
      });
    } catch (error) {
      return blocked("DEEPSEEK_EXECUTION_REGISTRATION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function scoringEvidence(context, scoredAt, expected = {}) {
    const evidence = evidenceBase(context, "DEEPSEEK_DIRECT");
    const ledger = await openLedger(context, evidence);
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0, verified.errors.join("; "));
    const built = reconstructGraph(context, evidence, verified.entries, [],
      expected.graphReceipt?.derivedAt ?? scoredAt);
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID", built.receipt.lineageErrors.join("; "));
    if (expected.graphReceipt) requireCondition(canonicalJsonV5R3(expected.graphReceipt)
      === canonicalJsonV5R3(built.receipt), "stored DeepSeek graph differs from exact reconstruction");
    const c0State = normalC0State(context, evidence, verified.entries);
    requireCondition(c0State.c0ExecutionSet, "R7 scoring requires the frozen normal C0 set");
    const expectedSuccessfulCount = 120
      + c0State.c0ExecutionSet.selectedItemHashes.length * C0_ROLES.length;
    requireCondition(successfulEvidence(built.receipt).length === expectedSuccessfulCount,
      "R7 execution is incomplete; frozen-metric inference is forbidden");
    const semantic = buildSemanticVerification(context, evidence, verified.entries,
      built, expected.semanticReceipt?.verifiedAt ?? later(scoredAt, 1), "DEEPSEEK_RESUME");
    if (expected.semanticReceipt) requireCondition(canonicalJsonV5R3(expected.semanticReceipt)
      === canonicalJsonV5R3(semantic), "stored semantic verification differs from exact reconstruction");
    const referenceSealContext = await referenceSealContextFromContext(context, { derivedAt: scoredAt });
    return {
      activeRegistration: context.activeRegistration,
      inventory: evidence.inventory,
      executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R7"),
      c0ExecutionSet: c0State.c0ExecutionSet,
      predicateInputsByItem: c0State.predicateInputsByItem,
      deepSeekAuthorization: evidence.authorization,
      deepSeekAttemptGraphReceipt: built.receipt,
      deepSeekAttemptGraphContext: built.graphContext,
      semanticDispatchVerificationReceipt: semantic,
      referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R7"),
      compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R7"),
      referenceSealContext,
    };
  }

  async function score(context) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const scoredAt = transitionTime(context, clockIso(clock));
      let input;
      try {
        input = await scoringEvidence(context, scoredAt);
      } catch (error) {
        const evidence = evidenceBase(context, "DEEPSEEK_DIRECT");
        const ledger = await openLedger(context, evidence);
        const verified = await ledger.verify();
        return blocked("INCOMPLETE_EXECUTION_NO_METRIC_INFERENCE", [
          error instanceof Error ? error.message : String(error),
        ], {
          terminalEvidenceCode: deriveImmutableTerminalCauseV5R7({
            ledgerEntries: verified.entries,
            authorization: evidence.authorization,
          }),
          naturalQuestionResultCount: new Set(verified.entries
            .filter(({ entryType, attemptStatus, providerEventReceipt }) => entryType === "DISPATCH_COMPLETED"
              && attemptStatus === "SUCCEEDED" && providerEventReceipt?.role === "B_PRIME_REVISION")
            .map(({ providerEventReceipt }) => providerEventReceipt.itemHash)).size,
        });
      }
      const built = scoreNaturalCaV5R7({ ...input, scoredAt: later(scoredAt, 2) });
      const transition = await advance(context, "score-complete-execution", [
        { kind: `ATTEMPT_GRAPH_V5_R7:${input.deepSeekAttemptGraphReceipt.selfHash}`,
          family: "attempt-graphs", value: input.deepSeekAttemptGraphReceipt },
        { kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R7:${input.semanticDispatchVerificationReceipt.selfHash}`,
          family: "semantic-dispatch-verifications", value: input.semanticDispatchVerificationReceipt },
        { kind: `SCORING_INPUT_V5_R7:${built.scoringInput.selfHash}`,
          family: "scoring-inputs", value: built.scoringInput },
        { kind: `BASE_AGGREGATE_SCORE_V5_R7:${built.baseAggregateScoreReceipt.selfHash}`,
          family: "base-aggregate-scores", value: built.baseAggregateScoreReceipt },
        { kind: `AGGREGATE_SCORE_V5_R7:${built.scoreReceipt.selfHash}`,
          family: "aggregate-scores", value: built.scoreReceipt },
      ], built.scoreReceipt.scoredAt);
      return success(built.scoreReceipt.overallDecision, {
        ...built,
        transition,
        naturalQuestionResultCount: 60,
      });
    } catch (error) {
      return blocked("SCORING_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function verify(context) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const scoreReceipts = valuesBySchema(context, "NaturalCaAggregateScoreReceiptV5");
      const scoreReceipt = scoreReceipts.at(-1);
      requireCondition(scoreReceipt, "no R7 aggregate score receipt exists; no execution result is claimed");
      const baseAggregateScoreReceipt = findByHash(context, scoreReceipt.baseAggregateScoreReceiptHash);
      const scoringInput = findByHash(context, scoreReceipt.scoringInputHash);
      const graphReceipt = findByHash(context, scoreReceipt.deepSeekAttemptGraphReceiptHash);
      const semanticReceipt = findByHash(context, scoreReceipt.semanticDispatchVerificationReceiptHash);
      requireCondition(graphReceipt && semanticReceipt,
        "score-bound DeepSeek graph or semantic verification receipt is absent");
      const input = await scoringEvidence(context, scoreReceipt.scoredAt, { graphReceipt, semanticReceipt });
      const errors = verifyNaturalCaScoreFromRawEvidenceV5R7({
        ...input,
        scoreReceipt,
        baseAggregateScoreReceipt,
        scoringInput,
      });
      return errors.length > 0 ? blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED", errors)
        : success("V5_R7_RAW_EVIDENCE_SCORE_RECOMPUTED_NO_PASS_CLAIM", {
          scoreReceipt,
          naturalQuestionResultCount: 60,
        });
    } catch (error) {
      return blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function exportAggregateReport(context) {
    const frozenErrors = upstreamErrors(context);
    if (frozenErrors.length > 0) {
      return blocked("AGGREGATE_EXPORT_UPSTREAM_FROZEN_EVIDENCE_BLOCKED", frozenErrors);
    }
    return blocked("AGGREGATE_EXPORT_BLOCKED", [
      "fresh independent execution-result review and A18 claim-boundary review are not present",
      "V5-R7 never authorizes PASS, APPROVED, PRODUCTION_READY, or LIMITED_GENERALIZATION_EVIDENCE",
    ]);
  }

  async function rejectLegacyQwenCommand() {
    return blocked("QWEN_COMMAND_SUPERSEDED_GPT_5_6_LUNA_ONLY_NO_PROVIDER_ACTIVITY", [
      "qwen3.8-max is superseded and cannot be dispatched by V5-R7",
    ]);
  }

  return Object.freeze({
    loadWorkflowContext,
    loadFreshReview,
    adoptR7WorkflowIndex,
    verifyFrozenUpstream,
    dryRun,
    authorizeCheck,
    registerAuthenticatedRouteEvidence,
    executeOpenAIResumeStep,
    executeDeepSeekCanaryStep,
    executeDeepSeekResumeStep,
    sealReferenceLabels,
    freezeDeepSeekExecutionRegistration,
    score,
    verify,
    exportAggregateReport,
    rejectLegacyQwenCommand,
  });
}

export const V5_R7_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  workflowIndexPattern: "workflow-indexes-v5-r7/<selfHash>.json",
  providerRequestPattern: "derived-v5-r7/provider-requests/<selfHash>.json",
  ledgerPattern: "execution-ledgers-v5-r7/<provider>/<compatibilityAuthorizationHash>/",
  rawResponsePattern: "raw-provider-custody-v5-r6/<provider>/<selfHash>.json",
  defaultLiveBindingsInstalled: false,
  providerCommands: Object.freeze([...PROVIDER_COMMANDS]),
});
