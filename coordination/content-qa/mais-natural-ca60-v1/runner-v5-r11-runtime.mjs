import path from "node:path";
import { fileURLToPath } from "node:url";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };

import {
  calculateFrozenNaturalItemLeafHashV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
  validateSelfHashV5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateExactRunnerRegistrationEvidenceV5R11,
} from "./execution-evidence-v5-r11.mjs";
import {
  validateFreshRunnerReviewV5R11,
} from "./review-evidence-v5-r11.mjs";
import {
  validateProviderActivationV5R11,
} from "./activation-guard-v5-r11.mjs";
import {
  validateRouteProbeArtifactSetV5R11,
  validateTrustedProviderEvidenceEnvelopeV5R11,
} from "./trusted-provider-evidence-v5-r11.mjs";
import {
  applyInterruptedAttemptReconciliationV5R11,
  inspectInterruptedAttemptCustodyV5R11,
  validateResumeCustodyV5R11,
} from "./attempt-recovery-v5-r11.mjs";
import {
  buildTerminalExecutionBundleFromRawCustodyV5R11,
  scoreNaturalCaV5R11,
  verifyNaturalCaScoreFromRawEvidenceV5R11,
} from "./scorer-verifier-v5-r11.mjs";
import {
  verifyTerminalExecutionDecisionReceiptV5R11,
} from "./statistical-kernel-v5-r11.mjs";
import {
  ACTIVE_REGISTRATION_KIND_V5_R11,
  ACTIVE_REVIEW_KIND_V5_R11,
  advanceProtectedWorkflowIndexV5R11,
  loadProtectedWorkflowIndexV5R11,
  executionLedgerRelativePathV5R11,
} from "./workflow-index-v5-r11.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildReferenceDispatchAuthorityV5R11,
} from "./dispatch-authority-v5-r11.mjs";
import {
  buildSemanticDispatchAuthorityV5R11,
  buildSemanticDispatchVerificationReceiptV5R11,
} from "./semantic-dispatch-v5-r11.mjs";
import {
  NativeProviderAttemptFailureV5R11,
  createNativeProviderTransportV5R11,
  runNativeProviderAttemptV5R11,
} from "./native-provider-attempt-v5-r11.mjs";
import {
  createAtomicExecutionLedgerV5R7,
} from "./atomic-execution-ledger-v5-r7.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  createAttemptCustodyStoreV5R11,
  reloadAttemptCustodyStoreV5R11,
} from "./attempt-custody-store-v5-r11.mjs";
import {
  reconstructAttemptGraphV5R11,
  roleOutputByEvidenceV5R11,
  validateAttemptGraphReconstructionReceiptV5R11,
} from "./attempt-graph-v5-r11.mjs";
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
  buildRawAuthoritativeMachineReferenceSealV5R11,
  buildRawAuthoritativeReferenceValidationV5R11,
} from "./raw-authoritative-reference-v5-r11.mjs";
import {
  buildDeepSeekExecutionRegistrationV5R11,
} from "./execution-freeze-v5-r11.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  buildResolvedProviderAttemptReceiptV5R11,
} from "./attempt-transaction-v5-r11.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
  validateClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";
import {
  createCommandTransitionJournalV5R7,
  prepareProviderDispatchIntentV5R7,
  recordObservedProviderActivityV5R7,
  runJournaledTransitionSequenceV5R7,
} from "./transition-journal-v5-r7.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");
const PROVIDERS = new Set(["OPENAI_DIRECT", "DEEPSEEK_DIRECT"]);
const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3",
  "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function clockIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R11 runner clock is invalid");
  return date.toISOString();
}

function later(value, milliseconds = 1) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
}

export function buildNativeReferenceSealAndValidationV5R11({
  referenceSealContext,
  sealedAt,
  validatedAt = later(sealedAt, 1),
}) {
  requireCondition(referenceSealContext && typeof referenceSealContext === "object",
    "R11 native reference workflow requires the exact raw-authoritative context");
  const built = buildRawAuthoritativeMachineReferenceSealV5R11({
    ...referenceSealContext,
    sealedAt,
  });
  const validationReceipt = buildRawAuthoritativeReferenceValidationV5R11({
    ...referenceSealContext,
    seal: built.seal,
    compatibilityReferenceSeal: built.compatibilityReferenceSeal,
    validatedAt,
  });
  requireCondition(built.seal.schemaVersion === "MachineReferenceSealV7"
    && validationReceipt.schemaVersion === "ReferenceSealValidationReceiptV5",
  "R11 native reference workflow emitted a stale seal or validation schema");
  return Object.freeze({ ...built, validationReceipt });
}

export function buildNativeDeepSeekExecutionRegistrationV5R11(input) {
  const executionRegistration = buildDeepSeekExecutionRegistrationV5R11(input);
  requireCondition(executionRegistration.schemaVersion === "DeepSeekExecutionRegistrationV4",
    "R11 native execution-freeze workflow emitted a stale registration schema");
  return executionRegistration;
}

function transitionTime(context, desired) {
  const prior = Date.parse(context?.index?.createdAt ?? "1970-01-01T00:00:00.000Z");
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
  return Object.freeze({ ok: false, status, ...exactActivity(), referenceLabelCount: 0,
    naturalQuestionResultCount: 0, errors: Object.freeze([...new Set(errors)]), ...extra });
}

function success(status, extra = {}) {
  return Object.freeze({ ok: true, status, ...exactActivity(), referenceLabelCount: 0,
    naturalQuestionResultCount: 0, errors: Object.freeze([]), ...extra });
}

function activityFromJournal(journal) {
  if (!journal) return exactActivity();
  const counts = [journal.providerEventCountLowerBound ?? journal.providerEventCount,
    journal.httpRequestCountLowerBound ?? journal.httpRequestCount,
    journal.credentialReadCountLowerBound ?? journal.credentialReadCount,
    journal.naturalQuestionEgressCountLowerBound ?? journal.naturalQuestionEgressCount];
  if (journal.activityAccountingStatus === "UNKNOWN_FAIL_CLOSED"
    || counts.some((value) => !Number.isSafeInteger(value) || value < 0)) {
    return { providerEventCount: null, httpRequestCount: null, credentialReadCount: null,
      naturalQuestionEgressCount: null, activityAccountingStatus: "UNKNOWN_FAIL_CLOSED" };
  }
  return {
    providerEventCount: counts[0] ?? 0,
    httpRequestCount: counts[1] ?? 0,
    credentialReadCount: counts[2] ?? 0,
    naturalQuestionEgressCount: counts[3] ?? 0,
    activityAccountingStatus: journal.activityAccountingStatus ?? "EXACT",
  };
}

function artifact(context, kind, { required = true } = {}) {
  const value = context?.artifacts?.get?.(kind);
  if (required && value === undefined) throw new Error(`protected R11 workflow artifact ${kind} is absent`);
  return value;
}

function values(context) {
  return [...(context?.artifacts?.values?.() ?? [])];
}

function valuesBySchema(context, schemaVersion) {
  return values(context).filter((value) => value?.schemaVersion === schemaVersion);
}

function valuesWithExtras(context, extras = []) {
  const unique = new Map();
  for (const value of [...values(context), ...extras]) {
    if (value?.selfHash) unique.set(value.selfHash, value);
  }
  return [...unique.values()];
}

function valuesBySchemaWithExtras(context, schemaVersion, extras = []) {
  return valuesWithExtras(context, extras).filter((value) => value?.schemaVersion === schemaVersion);
}

function findByHash(context, selfHash, extras = []) {
  return valuesWithExtras(context, extras).find((value) => value.selfHash === selfHash) ?? null;
}

function itemLeafForHash(context, itemHash) {
  const leaves = artifact(context, "ITEM_LEAF_SET");
  requireCondition(Array.isArray(leaves) && leaves.length === 60,
    "protected item-leaf set must contain exactly 60 frozen rows");
  const matches = leaves.filter((leaf) => calculateFrozenNaturalItemLeafHashV4(leaf) === itemHash);
  requireCondition(matches.length === 1,
    "planned item does not resolve to one exact frozen protected leaf");
  return matches[0];
}

async function writeContentAddressedV5R11({ trustedRoot, family, value }) {
  requireCondition(validateSelfHashV5R3(value), "R11 runtime custody value is not self-hashed");
  const relativePath = path.join("runtime-custody-v5-r11", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "R11 runtime custody path already contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return Object.freeze({ contentHash: value.selfHash, relativePath });
}

function appendStore(context, family) {
  return Object.freeze({ append: (value) => writeContentAddressedV5R11({
    trustedRoot: context.trustedRoot, family, value,
  }) });
}

function graphEvidenceCollections(context, authorization, extras = []) {
  const activeHash = context.activeRegistration.selfHash;
  const requests = valuesBySchemaWithExtras(context, "ProviderRequestArtifactV5", extras)
    .filter((value) => value.activeRunnerRegistrationHash === activeHash
      && value.authorizationHash === authorization.selfHash);
  const resolved = valuesBySchemaWithExtras(context, "ResolvedProviderAttemptReceiptV2", extras)
    .filter((value) => value.activeRunnerRegistrationHash === activeHash
      && value.authorizationHash === authorization.selfHash);
  const referenced = (field) => new Set(resolved.map((value) => value[field]).filter(Boolean));
  const all = valuesWithExtras(context, extras);
  const auditHashes = referenced("dispatchAuditHash");
  return Object.freeze({
    requestArtifacts: requests,
    dispatchAudits: all.filter((value) => auditHashes.has(value.selfHash)),
    semanticDispatchAuthorities: [],
    dispatchPermits: all.filter((value) => referenced("dispatchPermitHash").has(value.selfHash)),
    compatibilityDispatchPermits: all.filter((value) =>
      referenced("compatibilityDispatchPermitHash").has(value.selfHash)),
    rawResponseArtifacts: all.filter((value) => referenced("rawResponseArtifactHash").has(value.selfHash)),
    rawResponseBindingReceipts: all.filter((value) =>
      referenced("rawResponseBindingReceiptHash").has(value.selfHash)),
    attemptCommitIntents: all.filter((value) => referenced("attemptCommitIntentHash").has(value.selfHash)),
    resolvedAttemptReceipts: resolved,
  });
}

function successfulEvidence(graph, roles = null) {
  return graph.roleAttemptEvidenceReceipts.filter((value) => value.attemptStatus === "SUCCEEDED"
    && (roles === null || roles.includes(value.role)));
}

function providerPrefix(provider) {
  requireCondition(PROVIDERS.has(provider), "R11 provider is invalid");
  return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
}

function providerArtifact(context, provider, suffix, options) {
  return artifact(context, `${providerPrefix(provider)}_${suffix}_V5_R11`, options);
}

function reviewInput(context) {
  return {
    activeRegistration: context.activeRegistration,
    registrationEvidence: context.registrationEvidence,
    freshReview: context.freshReview,
    processArtifacts: context.processArtifacts,
    reviewCustody: context.reviewCustody,
    reviewerIdentityAnchor: context.reviewerIdentityAnchor,
  };
}

function upstreamErrors(context, { requireAdoption = true } = {}) {
  const errors = [...validateExactRunnerRegistrationEvidenceV5R11(context?.registrationEvidence),
    ...validateFreshRunnerReviewV5R11(reviewInput(context))];
  if (requireAdoption && context?.needsPredecessorAdoption) {
    errors.push("protected workflow has not adopted the exact V5-R11 registration");
  }
  try {
    errors.push(...validateManifestBoundInventoryV5R5({
      registration: context?.compatibilityRegistration
        ?? artifact(context, "COMPATIBILITY_RUNNER_REGISTRATION", { required: false }),
      inventory: artifact(context, "SAMPLE_EXECUTION_INVENTORY_V2", { required: false })
        ?? artifact(context, "SAMPLE_INVENTORY", { required: false }),
      sampleManifest: artifact(context, "SAMPLE_MANIFEST", { required: false }),
      c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT", { required: false }),
      screenEvidence: context?.screenEvidence
        ?? artifact(context, "SCREEN_EVIDENCE", { required: false }),
    }));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return [...new Set(errors)];
}

function defaultAttemptCustody(context, provider) {
  return context?.attemptCustodyByProvider?.[provider] ?? {
    ledgerEntries: [],
    preparedCompletions: [],
    attemptCommitIntents: [],
    resolvedAttemptReceipts: [],
    commandJournals: [],
  };
}

function activationInput(context, provider, at) {
  const routeEvidenceEnvelope = providerArtifact(context, provider, "TRUSTED_ROUTE_ENVELOPE",
    { required: false });
  const routeProbeArtifactSet = providerArtifact(context, provider, "ROUTE_PROBE_ARTIFACT_SET",
    { required: false });
  return {
    ...reviewInput(context),
    at,
    registration: context.compatibilityRegistration
      ?? artifact(context, "COMPATIBILITY_RUNNER_REGISTRATION", { required: false }),
    inventory: artifact(context, "SAMPLE_EXECUTION_INVENTORY_V2", { required: false })
      ?? artifact(context, "SAMPLE_INVENTORY", { required: false }),
    sampleManifest: artifact(context, "SAMPLE_MANIFEST", { required: false }),
    c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT", { required: false }),
    screenEvidence: context.screenEvidence ?? artifact(context, "SCREEN_EVIDENCE", { required: false }),
    routeEvidenceEnvelope,
    authenticatedRouteEvidence: providerArtifact(context, provider,
      "AUTHENTICATED_ROUTE_EVIDENCE", { required: false }),
    routeProbeArtifacts: routeProbeArtifactSet ?? null,
    authorization: providerArtifact(context, provider, "AUTHORIZATION", { required: false }),
    ownerActivationGrant: providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT",
      { required: false }),
    costPreview: providerArtifact(context, provider, "COST_PREVIEW", { required: false }),
    priceSnapshot: providerArtifact(context, provider, "PRICE_SNAPSHOT", { required: false }),
    attemptCustody: defaultAttemptCustody(context, provider),
    referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R11", { required: false }),
    compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R11",
      { required: false }),
    referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R11",
      { required: false }),
    referenceSealContext: context.referenceSealContext,
    executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11",
      { required: false }),
    provider,
  };
}

async function persistResult(advanceWorkflow, context, command, entries, at) {
  requireCondition(Array.isArray(entries) && entries.length > 0,
    "R11 result persistence requires at least one sealed artifact");
  return advanceWorkflow({ context, command, appendedArtifacts: entries, committedAt: at });
}

export async function persistFinalCommandJournalV5R11({ advanceWorkflow, context, journal,
  command, committedAt }) {
  requireCondition(typeof advanceWorkflow === "function"
    && context?.activeRegistration?.selfHash
    && typeof command === "string" && command.length > 0
    && Number.isFinite(Date.parse(committedAt ?? "")),
  "R11 final command-journal persistence requires an active context, command, and chronology");
  const errors = validateClosedSelfHashedArtifactV5R11(journal,
    "CommandTransitionJournalReceiptV2");
  requireCondition(errors.length === 0
    && journal.activeRunnerRegistrationHash === context.activeRegistration.selfHash,
  `R11 final command journal is invalid or registration-drifted: ${errors.join("; ")}`);
  return persistResult(advanceWorkflow, context, command, [{
    kind: `COMMAND_TRANSITION_JOURNAL_V5_R11:${journal.selfHash}`,
    family: "transition-journals-indexed",
    value: journal,
  }], committedAt);
}

export function createRunnerRuntimeV5R11({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  clock = () => new Date(),
  advanceWorkflow = advanceProtectedWorkflowIndexV5R11,
  fetchImplementation = globalThis.fetch,
  credentialReaders = Object.freeze({}),
  nativeAttemptRunner = runNativeProviderAttemptV5R11,
  transportFactory = createNativeProviderTransportV5R11,
  registrationEvidenceLoader,
  freshReviewLoader,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    requireCondition(path.isAbsolute(indexPath ?? ""),
      "R11 workflow index path must be absolute");
    return loadProtectedWorkflowIndexV5R11(indexPath, {
      protectedRoot,
      repoRoot,
      registrationEvidenceLoader,
      freshReviewLoader,
    });
  }

  function evidenceBase(context, provider, at) {
    return activationInput(context, provider, at);
  }

  async function openLedger(context, evidence) {
    return createAtomicExecutionLedgerV5R7({
      trustedRoot: context.trustedRoot,
      ledgerRelativePath: executionLedgerRelativePathV5R11(evidence.authorization.provider,
        evidence.authorization.compatibilityAuthorizationHash),
      authorization: evidence.authorization.compatibilityAuthorization,
      inventory: evidence.inventory,
      priceSnapshot: evidence.priceSnapshot,
    });
  }

  function graphForTerminal(context, provider, terminalHash, extras = []) {
    return valuesBySchemaWithExtras(context, "AttemptGraphReconstructionReceiptV2", extras)
      .filter((value) => value.provider === provider && value.ledgerTerminalHash === terminalHash)
      .sort((left, right) => left.derivedAt.localeCompare(right.derivedAt)).at(-1) ?? null;
  }

  function roleOutputsForEvidence(evidenceReceipts, ledgerEntries) {
    return roleOutputByEvidenceV5R11({ roleAttemptEvidenceReceipts: evidenceReceipts, ledgerEntries });
  }

  function canaryPredicateState(context, evidence, ledgerEntries, extras = []) {
    const predicate = artifact(context, "CANARY_C0_PREDICATE_V5_R11", { required: false });
    if (!predicate) return { predicate: null, inputMap: null, input: null };
    const canaryHash = evidence.inventory.items[0].itemHash;
    const graph = valuesBySchemaWithExtras(context, "AttemptGraphReconstructionReceiptV2", extras)
      .filter((value) => value.provider === "DEEPSEEK_DIRECT" && value.graphStatus === "COMPLETE_VALID")
      .sort((left, right) => left.completionCount - right.completionCount)
      .find((value) => {
        const base = successfulEvidence(value, BASE_ROLES).filter(({ itemHash }) => itemHash === canaryHash);
        return base.length === 2 && value.roleAttemptEvidenceReceipts
          .every(({ itemHash }) => itemHash === canaryHash);
      });
    requireCondition(graph, "R11 canary predicate source graph is absent");
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    const inputMap = buildCanaryPredicateInputMapV5R7({ inventory: evidence.inventory,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: baseEvidence,
      roleOutputs: roleOutputsForEvidence(baseEvidence, ledgerEntries) });
    return { predicate, inputMap, input: inputMap.get(canaryHash) };
  }

  function normalC0State(context, evidence, ledgerEntries, extras = []) {
    const c0ExecutionSet = artifact(context, "DEEPSEEK_C0_EXECUTION_SET_V5_R11", { required: false });
    if (!c0ExecutionSet) return { c0ExecutionSet: null, predicateInputsByItem: null };
    const graph = valuesBySchemaWithExtras(context, "AttemptGraphReconstructionReceiptV2", extras)
      .filter((value) => value.provider === "DEEPSEEK_DIRECT" && value.graphStatus === "COMPLETE_VALID")
      .sort((left, right) => left.completionCount - right.completionCount)
      .find((value) => new Set(successfulEvidence(value, BASE_ROLES)
        .map(({ itemHash, role }) => `${itemHash}:${role}`)).size === 120);
    requireCondition(graph, "R11 full base-role source graph for the C0 set is absent");
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    const predicateInputsByItem = buildC0PredicateInputMapV5R7({ inventory: evidence.inventory,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: baseEvidence,
      roleOutputs: roleOutputsForEvidence(baseEvidence, ledgerEntries) });
    const errors = validateNormalC0ExecutionSetV5R7({
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11").selfHash,
      inventory: evidence.inventory, predicateInputsByItem, c0ExecutionSet,
    });
    requireCondition(errors.length === 0, errors.join("; "));
    return { c0ExecutionSet, predicateInputsByItem };
  }

  function canaryGateState(context, evidence, ledgerEntries, extras = []) {
    const canaryGate = artifact(context, "CANARY_GATE_V5_R11", { required: false });
    if (!canaryGate) return { canaryGate: null, canaryGateContext: null };
    const graph = graphForTerminal(context, "DEEPSEEK_DIRECT", canaryGate.ledgerTerminalHash, extras);
    const predicateState = canaryPredicateState(context, evidence, ledgerEntries, extras);
    const semantic = findByHash(context, canaryGate.semanticDispatchVerificationReceiptHash, extras);
    const prefixEnd = ledgerEntries.findIndex(({ selfHash }) => selfHash === canaryGate.ledgerTerminalHash);
    requireCondition(graph && prefixEnd >= 0 && semantic,
      "R11 canary gate graph, ledger prefix, or semantic receipt is absent");
    const prefix = ledgerEntries.slice(0, prefixEnd + 1);
    const roleEvidence = graph.roleAttemptEvidenceReceipts;
    const canaryGateContext = {
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11").selfHash,
      deepSeekAuthorizationHash: evidence.authorization.selfHash,
      inventory: evidence.inventory,
      canaryPredicateReceipt: predicateState.predicate,
      canaryPredicateInput: predicateState.input,
      roleAttemptEvidenceReceipts: roleEvidence,
      roleOutputs: roleOutputsForEvidence(roleEvidence, prefix),
      semanticDispatchVerificationReceipt: semantic,
    };
    const errors = validateCanaryGateReceiptV5R7({ canaryGate, ...canaryGateContext });
    requireCondition(errors.length === 0, errors.join("; "));
    return { canaryGate, canaryGateContext };
  }

  function buildGraphContext(context, evidence, ledgerEntries, extras = [], overrides = {}) {
    const predicateState = overrides.predicateState
      ?? canaryPredicateState(context, evidence, ledgerEntries, extras);
    const c0State = overrides.c0State ?? normalC0State(context, evidence, ledgerEntries, extras);
    const gateState = overrides.gateState ?? canaryGateState(context, evidence, ledgerEntries, extras);
    return {
      ...evidence,
      ledgerEntries,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      executionRegistration: evidence.provider === "DEEPSEEK_DIRECT"
        ? artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11") : null,
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
    const built = reconstructAttemptGraphV5R11({ ...graphContext, derivedAt });
    return { ...built, graphContext };
  }

  function semanticAuthorityContexts(context, evidence, ledgerEntries, graphContext, graph) {
    const byHash = new Map(graphContext.dispatchAudits
      .filter(({ schemaVersion }) => schemaVersion === "SemanticDispatchAuthorityReceiptV1")
      .map((value) => [value.selfHash, value]));
    const contexts = new Map();
    for (const roleEvidence of graph.roleAttemptEvidenceReceipts) {
      const authority = byHash.get(roleEvidence.semanticDispatchAuthorityHash);
      requireCondition(authority, "R11 semantic evidence lacks its exact authority");
      const reservationIndex = ledgerEntries.findIndex(({ entryType, attemptId }) =>
        entryType === "DISPATCH_RESERVED" && attemptId === authority.attemptId);
      requireCondition(reservationIndex >= 0, "R11 semantic authority reservation is absent");
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
    const authorityByHash = new Map(built.graphContext.dispatchAudits
      .filter(({ schemaVersion }) => schemaVersion === "SemanticDispatchAuthorityReceiptV1")
      .map((value) => [value.selfHash, value]));
    const authorities = roleEvidenceReceipts
      .map((value) => authorityByHash.get(value.semanticDispatchAuthorityHash));
    requireCondition(authorities.every(Boolean),
      "R11 graph evidence lacks ordered semantic authorities");
    return buildSemanticDispatchVerificationReceiptV5R11({
      activeRegistration: context.activeRegistration,
      authorization: evidence.authorization,
      executionRegistration: built.graphContext.executionRegistration,
      inventory: evidence.inventory,
      mode,
      ledgerEntries,
      semanticDispatchAuthorities: authorities,
      semanticAuthorityContextsByHash: semanticAuthorityContexts(context, evidence,
        ledgerEntries, built.graphContext, built.receipt),
      roleAttemptEvidenceReceipts,
      canaryPredicateReceipt: built.graphContext.canaryPredicateReceipt,
      canaryGate: built.graphContext.canaryGate,
      c0ExecutionSet: built.graphContext.c0ExecutionSet,
      verifiedAt,
    });
  }

  async function referenceSealContextFromContext(context, { derivedAt = clockIso(clock) } = {}) {
    const evidence = evidenceBase(context, "OPENAI_DIRECT", derivedAt);
    const ledger = await openLedger(context, evidence);
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0, verified.errors.join("; "));
    const seal = artifact(context, "REFERENCE_SEAL_V5_R11", { required: false });
    const graph = seal ? findByHash(context, seal.attemptGraphReconstructionReceiptHash) : null;
    const built = reconstructGraph(context, evidence, verified.entries, [], graph?.derivedAt ?? derivedAt, {
      predicateState: { predicate: null, inputMap: null, input: null },
      c0State: { c0ExecutionSet: null, predicateInputsByItem: null },
      gateState: { canaryGate: null, canaryGateContext: null },
    });
    if (graph) requireCondition(canonicalJsonV5R3(graph) === canonicalJsonV5R3(built.receipt),
      "stored R11 reference graph differs from raw-attempt reconstruction");
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID",
      built.receipt.lineageErrors.join("; "));
    return {
      activeRegistration: context.activeRegistration,
      freshReview: context.freshReview,
      authorization: evidence.authorization,
      registration: evidence.registration,
      inventory: evidence.inventory,
      attemptGraphReceipt: built.receipt,
      attemptGraphContext: built.graphContext,
    };
  }

  async function activationContext(context, provider, at) {
    const evidence = evidenceBase(context, provider, at);
    if (provider !== "DEEPSEEK_DIRECT") return evidence;
    const referenceSealContext = await referenceSealContextFromContext(context, { derivedAt: at });
    return {
      ...evidence,
      referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R11", { required: false }),
      compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R11",
        { required: false }),
      referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R11",
        { required: false }),
      referenceSealContext,
      executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11",
        { required: false }),
    };
  }

  async function adoptPredecessorWorkflowIndex(context) {
    try {
      const errors = upstreamErrors(context, { requireAdoption: false });
      requireCondition(errors.length === 0, errors.join("; "));
      if (!context.needsPredecessorAdoption) {
        return success("V5_R11_WORKFLOW_INDEX_ALREADY_ACTIVE_NO_PROVIDER_ACTIVITY");
      }
      const committedAt = transitionTime(context, clockIso(clock));
      const process = context.processArtifacts;
      const transition = await persistResult(advanceWorkflow, context, "register-v5-r11", [
        { kind: ACTIVE_REGISTRATION_KIND_V5_R11, family: "runner-registrations",
          value: context.activeRegistration },
        { kind: ACTIVE_REVIEW_KIND_V5_R11, family: "runner-reviews", value: context.freshReview },
        { kind: `A11_STATIC_IMPORT_GRAPH_V5_R11:${process.staticImportGraphReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.staticImportGraphReceipt },
        { kind: `A11_FORBIDDEN_PATH_SCAN_V5_R11:${process.forbiddenPrimaryScorerPathScanReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.forbiddenPrimaryScorerPathScanReceipt },
        { kind: `A11_COMMAND_RUNTIME_V5_R11:${process.commandRuntimeReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.commandRuntimeReceipt },
        { kind: `A11_SOURCE_ENUMERATION_V5_R11:${process.independentSourceEnumerationReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.independentSourceEnumerationReceipt },
      ], committedAt);
      context.needsPredecessorAdoption = false;
      return success("V5_R11_WORKFLOW_INDEX_ADOPTED_NO_PROVIDER_ACTIVITY", { transition });
    } catch (error) {
      return blocked("V5_R11_WORKFLOW_INDEX_ADOPTION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function verifyFrozenUpstream(context) {
    const errors = upstreamErrors(context);
    return errors.length > 0 ? blocked("FROZEN_UPSTREAM_VERIFICATION_BLOCKED", errors)
      : success("V5_R11_FROZEN_FRAME_SAMPLE_METHOD_AND_CLAIM_CEILING_VERIFIED_NO_PROVIDER_ACTIVITY");
  }

  async function dryRun(context) {
    const errors = upstreamErrors(context);
    if (errors.length > 0) return blocked("V5_R11_DRY_RUN_BLOCKED", errors);
    const noAnchor = context.activeRegistration.trustedProviderEvidenceAnchors.length === 0;
    return success(noAnchor
      ? "V5_R11_OFFLINE_DRY_RUN_READY_ROUTE_AUTHENTICITY_BLOCKED_NO_PROVIDER_ACTIVITY"
      : "V5_R11_OFFLINE_DRY_RUN_READY_NO_PROVIDER_ACTIVITY", {
      routeAuthenticityState: context.activeRegistration.routeAuthenticityState,
    });
  }

  async function authorizeCheck(context, provider) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const input = await activationContext(context, provider, at);
      const errors = [...upstreamErrors(context), ...validateProviderActivationV5R11(input)];
      return errors.length > 0 ? blocked("PROVIDER_ACTIVATION_BLOCKED_ZERO_HTTP", errors, {
        provider,
        routeAuthenticityState: context.activeRegistration.routeAuthenticityState,
      }) : success("PROVIDER_ACTIVATION_VERIFIED_NO_PROVIDER_ACTIVITY", { provider });
    } catch (error) {
      return blocked("PROVIDER_ACTIVATION_BLOCKED_ZERO_HTTP",
        [error instanceof Error ? error.message : String(error)], { provider });
    }
  }

  async function registerTrustedRouteEvidence(context, provider) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const routeAlreadyRegistered = Boolean(providerArtifact(context, provider,
        "TRUSTED_ROUTE_ENVELOPE", { required: false }));
      const envelope = providerArtifact(context, provider, routeAlreadyRegistered
        ? "TRUSTED_ROUTE_ENVELOPE" : "TRUSTED_ROUTE_ENVELOPE_CANDIDATE");
      const authenticatedRouteEvidence = providerArtifact(context, provider,
        routeAlreadyRegistered ? "AUTHENTICATED_ROUTE_EVIDENCE"
          : "AUTHENTICATED_ROUTE_EVIDENCE_CANDIDATE");
      const routeProbeArtifactSet = providerArtifact(context, provider,
        routeAlreadyRegistered ? "ROUTE_PROBE_ARTIFACT_SET"
          : "ROUTE_PROBE_ARTIFACT_SET_CANDIDATE");
      const priceSnapshot = providerArtifact(context, provider,
        routeAlreadyRegistered ? "PRICE_SNAPSHOT" : "PRICE_SNAPSHOT_CANDIDATE");
      const setErrors = validateRouteProbeArtifactSetV5R11(routeProbeArtifactSet);
      requireCondition(setErrors.length === 0, setErrors.join("; "));
      const errors = validateTrustedProviderEvidenceEnvelopeV5R11({ envelope,
        activeRegistration: context.activeRegistration, authenticatedRouteEvidence,
        routeProbeArtifacts: routeProbeArtifactSet, priceSnapshot, at });
      requireCondition(errors.length === 0, errors.join("; "));
      const additions = routeAlreadyRegistered ? [] : [
        { kind: `${providerPrefix(provider)}_TRUSTED_ROUTE_ENVELOPE_V5_R11`,
          family: "trusted-route-evidence", value: envelope },
        { kind: `${providerPrefix(provider)}_AUTHENTICATED_ROUTE_EVIDENCE_V5_R11`,
          family: "authenticated-route-evidence", value: authenticatedRouteEvidence },
        { kind: `${providerPrefix(provider)}_ROUTE_PROBE_ARTIFACT_SET_V5_R11`,
          family: "route-probe-artifact-sets", value: routeProbeArtifactSet },
        { kind: `${providerPrefix(provider)}_PRICE_SNAPSHOT_V5_R11`,
          family: "provider-price-snapshots", value: priceSnapshot },
      ];
      const liveCandidates = [
        ["AUTHORIZATION", "provider-authorizations"],
        ["OWNER_ACTIVATION_GRANT", "owner-activation-grants"],
        ["COST_PREVIEW", "provider-cost-previews"],
      ].map(([suffix, family]) => ({ suffix, family,
        value: providerArtifact(context, provider, `${suffix}_CANDIDATE`, { required: false }) }));
      const presentLiveCandidates = liveCandidates.filter(({ value }) => value);
      requireCondition(presentLiveCandidates.length === 0 || presentLiveCandidates.length === 3,
        "R11 authorization, owner-grant, and cost-preview candidates must be adopted all-or-none");
      requireCondition(presentLiveCandidates.length === 0
        || !providerArtifact(context, provider, "AUTHORIZATION", { required: false }),
      "R11 live authorization is already registered; replacement requires a new registration version");
      if (presentLiveCandidates.length === 3) {
        const candidateBySuffix = new Map(presentLiveCandidates
          .map(({ suffix, value }) => [suffix, value]));
        const activation = {
          ...activationInput(context, provider, at),
          routeEvidenceEnvelope: envelope,
          authenticatedRouteEvidence,
          routeProbeArtifacts: routeProbeArtifactSet,
          priceSnapshot,
          authorization: candidateBySuffix.get("AUTHORIZATION"),
          ownerActivationGrant: candidateBySuffix.get("OWNER_ACTIVATION_GRANT"),
          costPreview: candidateBySuffix.get("COST_PREVIEW"),
        };
        if (provider === "DEEPSEEK_DIRECT") {
          const referenceSealContext = await referenceSealContextFromContext(context,
            { derivedAt: at });
          const referenceInputs = {
            referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R11", { required: false }),
            compatibilityReferenceSeal: artifact(context,
              "REFERENCE_COMPATIBILITY_SEAL_V5_R11", { required: false }),
            referenceSealValidationReceipt: artifact(context,
              "REFERENCE_SEAL_VALIDATION_V5_R11", { required: false }),
            referenceSealContext,
          };
          const provisionalExecutionRegistration = buildDeepSeekExecutionRegistrationV5R11({
            ...activation,
            ...referenceInputs,
            registeredAt: later(at, 1),
          });
          Object.assign(activation, referenceInputs, {
            executionRegistration: provisionalExecutionRegistration,
            at: later(at, 2),
          });
        }
        const activationErrors = validateProviderActivationV5R11(activation);
        requireCondition(activationErrors.length === 0,
          `R11 candidate live bundle is invalid: ${activationErrors.join("; ")}`);
      }
      for (const { suffix, family, value } of presentLiveCandidates) additions.push({
        kind: `${providerPrefix(provider)}_${suffix}_V5_R11`, family, value,
      });
      requireCondition(additions.length > 0,
        "R11 route and authorization evidence are already registered or no complete candidate exists");
      const transition = await persistResult(advanceWorkflow, context, "register-route-evidence",
        additions, at);
      return success("TRUST_ANCHORED_PROVIDER_ROUTE_EVIDENCE_REGISTERED_NO_PROVIDER_ACTIVITY",
        { provider, transition });
    } catch (error) {
      return blocked("ROUTE_AUTHENTICITY_BLOCKED_ZERO_HTTP",
        [error instanceof Error ? error.message : String(error)], { provider });
    }
  }

  async function makeJournal(context, command, startedAt) {
    const commandId = sha256V5R3(canonicalJsonV5R3({ command,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      priorWorkflowIndexHash: context.index.selfHash, startedAt }));
    return createCommandTransitionJournalV5R7({
      commandId,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      startedAt,
      persistIntent: (value) => writeContentAddressedV5R11({ trustedRoot: context.trustedRoot,
        family: "transition-intents", value }),
      persistSubreceipt: (value) => writeContentAddressedV5R11({ trustedRoot: context.trustedRoot,
        family: "transition-subreceipts", value }),
      persistFinalJournal: (value) => writeContentAddressedV5R11({ trustedRoot: context.trustedRoot,
        family: "transition-journals", value }),
    });
  }

  function attemptArtifactAdditions(run) {
    return [
      { kind: `DISPATCH_PERMIT_V5_R11:${run.permit.selfHash}`,
        family: "dispatch-permits", value: run.permit },
      { kind: `COMPATIBILITY_DISPATCH_PERMIT_V5_R11:${run.compatibilityPermit.selfHash}`,
        family: "compatibility-dispatch-permits", value: run.compatibilityPermit },
      { kind: `RAW_RESPONSE_ARTIFACT_V5_R11:${run.rawResponseArtifact.selfHash}`,
        family: "raw-response-artifacts", value: run.rawResponseArtifact },
      { kind: `RAW_RESPONSE_BINDING_V5_R11:${run.rawResponseBindingReceipt.selfHash}`,
        family: "raw-response-bindings", value: run.rawResponseBindingReceipt },
      { kind: `PROVIDER_EVENT_V5_R11:${run.providerEventReceipt.selfHash}`,
        family: "provider-events", value: run.providerEventReceipt },
      { kind: `ATTEMPT_COMMIT_INTENT_V5_R11:${run.attemptCommitIntent.selfHash}`,
        family: "attempt-commit-intents", value: run.attemptCommitIntent },
      { kind: `RESOLVED_PROVIDER_ATTEMPT_V5_R11:${run.resolvedAttemptReceipt.selfHash}`,
        family: "resolved-provider-attempts", value: run.resolvedAttemptReceipt },
      ...(run.roleOutput ? [{ kind: `ROLE_OUTPUT_V5_R11:${run.roleOutput.selfHash}`,
        family: "role-outputs", value: run.roleOutput }] : []),
    ];
  }

  function derivePostAttemptArtifacts(context, evidence, ledgerEntries, extras, at) {
    const built = reconstructGraph(context, evidence, ledgerEntries, extras, later(at, 1));
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID",
      built.receipt.lineageErrors.join("; "));
    const additions = [{ kind: `ATTEMPT_GRAPH_V5_R11:${built.receipt.selfHash}`,
      family: "attempt-graphs", value: built.receipt }];
    if (evidence.provider !== "DEEPSEEK_DIRECT") return additions;

    const graph = built.receipt;
    const canaryHash = evidence.inventory.items[0].itemHash;
    let predicate = built.graphContext.canaryPredicateReceipt;
    let predicateInput = built.graphContext.canaryPredicateInput;
    const canaryBase = successfulEvidence(graph, BASE_ROLES)
      .filter(({ itemHash }) => itemHash === canaryHash);
    if (!predicate && canaryBase.length === 2) {
      const inputMap = buildCanaryPredicateInputMapV5R7({ inventory: evidence.inventory,
        itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: canaryBase,
        roleOutputs: roleOutputsForEvidence(canaryBase, ledgerEntries) });
      predicateInput = inputMap.get(canaryHash);
      predicate = buildCanaryPredicateReceiptV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        inventory: evidence.inventory,
        predicateInputsByItem: inputMap,
      });
      additions.push({ kind: "CANARY_C0_PREDICATE_V5_R11",
        family: "canary-predicates", value: predicate });
    }

    const requiredCanaryCount = predicate ? 2 + (predicate.selectedForC0 ? 5 : 0) : null;
    const canaryEvidence = graph.roleAttemptEvidenceReceipts
      .filter(({ itemHash, attemptStatus }) => itemHash === canaryHash && attemptStatus === "SUCCEEDED");
    if (!built.graphContext.canaryGate && predicate && canaryEvidence.length === requiredCanaryCount) {
      const verificationContext = { ...built, graphContext: { ...built.graphContext,
        canaryPredicateReceipt: predicate, canaryPredicateInput: predicateInput } };
      const semantic = buildSemanticVerification(context, evidence, ledgerEntries,
        verificationContext, later(at, 2), "DEEPSEEK_CANARY", canaryEvidence);
      const gate = buildCanaryGateReceiptV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        deepSeekAuthorizationHash: evidence.authorization.selfHash,
        inventory: evidence.inventory,
        canaryPredicateReceipt: predicate,
        canaryPredicateInput: predicateInput,
        roleAttemptEvidenceReceipts: canaryEvidence,
        roleOutputs: roleOutputsForEvidence(canaryEvidence, ledgerEntries),
        semanticDispatchVerificationReceipt: semantic,
        ledgerTerminalHash: graph.ledgerTerminalHash,
        passedAt: later(at, 3),
      });
      additions.push({ kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R11:${semantic.selfHash}`,
        family: "semantic-dispatch-verifications", value: semantic },
      { kind: "CANARY_GATE_V5_R11", family: "canary-gates", value: gate });
    }

    let c0ExecutionSet = built.graphContext.c0ExecutionSet;
    let predicateInputsByItem = built.graphContext.predicateInputsByItem;
    const baseEvidence = successfulEvidence(graph, BASE_ROLES);
    if (!c0ExecutionSet && new Set(baseEvidence
      .map(({ itemHash, role }) => `${itemHash}:${role}`)).size === 120) {
      predicateInputsByItem = buildC0PredicateInputMapV5R7({ inventory: evidence.inventory,
        itemLeaves: artifact(context, "ITEM_LEAF_SET"), roleAttemptEvidenceReceipts: baseEvidence,
        roleOutputs: roleOutputsForEvidence(baseEvidence, ledgerEntries) });
      c0ExecutionSet = buildNormalC0ExecutionSetV5R7({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: built.graphContext.executionRegistration.selfHash,
        inventory: evidence.inventory,
        predicateInputsByItem,
      });
      additions.push({ kind: "DEEPSEEK_C0_EXECUTION_SET_V5_R11",
        family: "c0-execution-sets", value: c0ExecutionSet });
    }
    if (c0ExecutionSet) {
      const expected = 120 + c0ExecutionSet.selectedItemHashes.length * C0_ROLES.length;
      const succeeded = successfulEvidence(graph);
      if (succeeded.length === expected) {
        const verificationContext = { ...built, graphContext: { ...built.graphContext,
          c0ExecutionSet, predicateInputsByItem } };
        const semantic = buildSemanticVerification(context, evidence, ledgerEntries,
          verificationContext, later(at, 4), "DEEPSEEK_RESUME");
        additions.push({ kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R11:${semantic.selfHash}`,
          family: "semantic-dispatch-verifications", value: semantic });
      }
    }
    return additions;
  }

  async function executeProviderStep(context, provider, executionMode) {
    let journal = null;
    try {
      const at = transitionTime(context, clockIso(clock));
      const activation = await activationContext(context, provider, at);
      const errors = [...upstreamErrors(context), ...validateProviderActivationV5R11(activation)];
      requireCondition(errors.length === 0, errors.join("; "));
      const custodyErrors = validateResumeCustodyV5R11(defaultAttemptCustody(context, provider));
      requireCondition(custodyErrors.length === 0, custodyErrors.join("; "));
      const ledger = await openLedger(context, activation);
      const before = await ledger.verify();
      requireCondition(before.errors.length === 0, before.errors.join("; "));
      const predicateState = provider === "DEEPSEEK_DIRECT"
        ? canaryPredicateState(context, activation, before.entries)
        : { predicate: null, input: null };
      const c0State = provider === "DEEPSEEK_DIRECT"
        ? normalC0State(context, activation, before.entries)
        : { c0ExecutionSet: null, predicateInputsByItem: null };
      const gateState = provider === "DEEPSEEK_DIRECT"
        ? canaryGateState(context, activation, before.entries)
        : { canaryGate: null, canaryGateContext: null };
      const mode = provider === "OPENAI_DIRECT" ? "REFERENCE_RESUME"
        : executionMode === "CANARY_1" ? "DEEPSEEK_CANARY" : "DEEPSEEK_RESUME";
      const authorityContext = { ...activation, mode, ledgerEntries: before.entries,
        executionRegistration: activation.executionRegistration,
        canaryPredicateReceipt: predicateState.predicate,
        canaryPredicateInput: predicateState.input,
        canaryGate: gateState.canaryGate,
        canaryGateContext: gateState.canaryGateContext,
        c0ExecutionSet: c0State.c0ExecutionSet,
        predicateInputsByItem: c0State.predicateInputsByItem,
        issuedAt: at };
      const dispatchAuthority = provider === "OPENAI_DIRECT"
        ? buildReferenceDispatchAuthorityV5R11(authorityContext)
        : buildSemanticDispatchAuthorityV5R11(authorityContext);
      const requestArtifact = buildProviderRequestArtifactV5R6({
        activeRegistration: context.activeRegistration,
        authorization: activation.authorization,
        registration: activation.registration,
        inventory: activation.inventory,
        sampleManifest: activation.sampleManifest,
        itemLeaf: itemLeafForHash(context, dispatchAuthority.itemHash),
        role: dispatchAuthority.role,
        attemptId: dispatchAuthority.attemptId,
        ledgerEntries: before.entries,
      });
      const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
      const custodyStore = await createAttemptCustodyStoreV5R11({ trustedRoot: context.trustedRoot,
        provider, authorizationHash: activation.authorization.selfHash });
      const transport = transportFactory({ fetchImplementation,
        credentialReader: credentialReaders[provider], repoRoot, protectedRoot, clock });
      requireCondition(transport?.kind === "V5_R11_NATIVE_EXACT_TRANSPORT",
        "R11 native transport factory did not return the exact transport contract");
      journal = await makeJournal(context, provider === "OPENAI_DIRECT"
        ? "label-reference" : mode === "DEEPSEEK_CANARY"
          ? "execute-deepseek-canary" : "execute-deepseek-resume", at);
      let run = null;
      const journalResult = await runJournaledTransitionSequenceV5R7({ journal, steps: [
        { name: "REQUEST_AND_DISPATCH_AUTHORITY", preparedAt: at,
          priorWorkflowIndexHash: context.index.selfHash,
          run: () => persistResult(advanceWorkflow, context, "request-and-dispatch-authority", [
            { kind: `PROVIDER_REQUEST_V5_R11:${requestArtifact.selfHash}`,
              family: "provider-requests", value: requestArtifact },
            { kind: `DISPATCH_AUTHORITY_V5_R11:${dispatchAuthority.selfHash}`,
              family: "dispatch-authorities", value: dispatchAuthority },
          ], later(at, 1)) },
        { name: "NATIVE_PROVIDER_ATTEMPT_AND_DERIVED_STATE", preparedAt: later(at, 2),
          priorWorkflowIndexHash: () => context.index.selfHash,
          run: async () => {
            await prepareProviderDispatchIntentV5R7(journal, { attemptId: dispatchAuthority.attemptId,
              stepName: "NATIVE_PROVIDER_ATTEMPT", priorWorkflowIndexHash: context.index.selfHash,
              naturalQuestionEgressPossible: true, preparedAt: later(at, 3) });
            try {
              run = await nativeAttemptRunner({ ...authorityContext, at, requestArtifact,
                dispatchAuthority, dispatchAuthorityContext: authorityContext, ledger, transport,
                rawResponseStore,
                dispatchAuthorityStore: appendStore(context, "dispatch-authorities-native"),
                dispatchPermitStore: appendStore(context, "dispatch-permits-native"),
                compatibilityDispatchPermitStore: appendStore(context,
                  "compatibility-dispatch-permits-native"),
                preparedCompletionStore: custodyStore.preparedCompletionStore,
                attemptCommitIntentStore: custodyStore.attemptCommitIntentStore,
                resolvedAttemptReceiptStore: custodyStore.resolvedAttemptReceiptStore });
              recordObservedProviderActivityV5R7(journal, run);
            } catch (error) {
              const activity = error instanceof NativeProviderAttemptFailureV5R11
                ? error.activity : null;
              if (activity?.activityStatus === "EXACT") {
                recordObservedProviderActivityV5R7(journal, activity);
              }
              throw error;
            }
            const after = await ledger.verify();
            requireCondition(after.errors.length === 0, after.errors.join("; "));
            const attemptAdditions = attemptArtifactAdditions(run);
            const extras = [requestArtifact, dispatchAuthority,
              ...attemptAdditions.map(({ value }) => value)];
            const derived = derivePostAttemptArtifacts(context, activation, after.entries,
              extras, later(at, 4));
            return persistResult(advanceWorkflow, context,
              "native-provider-attempt-and-derived-state", [...attemptAdditions, ...derived],
              later(at, 10));
          } },
      ], finishedAt: later(at, 20) });
      if (!journalResult.ok) {
        let failedJournalTransition = null;
        try {
          failedJournalTransition = await persistFinalCommandJournalV5R11({ advanceWorkflow,
            context, journal: journalResult.journal,
            command: "commit-failed-provider-command-journal", committedAt: later(at, 21) });
        } catch (persistenceError) {
          return blocked("JOURNALED_PROVIDER_STEP_FAILED_INDEX_CUSTODY_BLOCKED",
            [journalResult.error, persistenceError instanceof Error
              ? persistenceError.message : String(persistenceError)], {
              provider,
              ...activityFromJournal(journalResult.journal),
              transitionJournal: journalResult.journal,
            });
        }
        return blocked("JOURNALED_PROVIDER_STEP_FAILED",
          [journalResult.error], { provider, ...activityFromJournal(journalResult.journal),
            transitionJournal: journalResult.journal, transition: failedJournalTransition });
      }
      const journalTransition = await persistFinalCommandJournalV5R11({ advanceWorkflow,
        context, journal: journalResult.journal, command: "commit-provider-command-journal",
        committedAt: later(at, 21) });
      const after = await ledger.verify();
      const reloaded = await reloadAttemptCustodyStoreV5R11({ trustedRoot: context.trustedRoot,
        provider, authorizationHash: activation.authorization.selfHash,
        ledgerEntries: after.entries });
      context.attemptCustodyByProvider ??= {};
      context.attemptCustodyByProvider[provider] = Object.freeze({ ledgerEntries: after.entries,
        preparedCompletions: reloaded.preparedCompletions,
        attemptCommitIntents: reloaded.attemptCommitIntents,
        resolvedAttemptReceipts: reloaded.resolvedAttemptReceipts,
        reconciliationReceipts: reloaded.reconciliationReceipts,
        commandJournals: [...valuesBySchema(context, "CommandTransitionJournalReceiptV2"),
          journalResult.journal], ledger, custodyStore: reloaded.store,
        custodyErrors: validateResumeCustodyV5R11({ ledgerEntries: after.entries,
          preparedCompletions: reloaded.preparedCompletions,
          attemptCommitIntents: reloaded.attemptCommitIntents,
          resolvedAttemptReceipts: reloaded.resolvedAttemptReceipts }) });
      return Object.freeze({ ...run, ok: run.status === "SUCCEEDED",
        status: run.status === "SUCCEEDED"
          ? "V5_R11_PROVIDER_ATTEMPT_SUCCEEDED_AND_RECONSTRUCTED"
          : `V5_R11_PROVIDER_ATTEMPT_RECORDED_${run.status}`,
        naturalQuestionEgressCount: run.naturalQuestionEgressCount,
        referenceLabelCount: provider === "OPENAI_DIRECT" && run.status === "SUCCEEDED" ? 1 : 0,
        naturalQuestionResultCount: provider === "DEEPSEEK_DIRECT" && run.status === "SUCCEEDED" ? 1 : 0,
        activityAccountingStatus: "EXACT", transitionJournal: journalResult.journal,
        journalTransition, transition: journalTransition,
        errors: Object.freeze([]) });
    } catch (error) {
      const activity = error instanceof NativeProviderAttemptFailureV5R11 ? error.activity : error?.activity;
      const journalActivity = journal ? activityFromJournal(journal) : exactActivity();
      return blocked("PROVIDER_ATTEMPT_FAILED_CLOSED", [error instanceof Error ? error.message : String(error)], {
        provider,
        ...(activity?.activityStatus === "EXACT" ? activity : journalActivity),
        transitionJournal: null,
      });
    }
  }

  async function sealReferenceLabels(context) {
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      requireCondition(!artifact(context, "REFERENCE_SEAL_V5_R11", { required: false }),
        "R11 reference labels are already sealed; replacement requires a new registration version");
      const sealedAt = transitionTime(context, clockIso(clock));
      const activation = await activationContext(context, "OPENAI_DIRECT", sealedAt);
      const activationErrors = validateProviderActivationV5R11(activation);
      requireCondition(activationErrors.length === 0, activationErrors.join("; "));
      const referenceSealContext = await referenceSealContextFromContext(context,
        { derivedAt: sealedAt });
      const validatedAt = later(sealedAt, 1);
      const built = buildNativeReferenceSealAndValidationV5R11({
        referenceSealContext,
        sealedAt,
        validatedAt,
      });
      const transition = await persistResult(advanceWorkflow, context,
        "seal-reference-labels", [
          { kind: `ATTEMPT_GRAPH_V5_R11:${referenceSealContext.attemptGraphReceipt.selfHash}`,
            family: "attempt-graphs", value: referenceSealContext.attemptGraphReceipt },
          { kind: "REFERENCE_COMPATIBILITY_SEAL_V5_R11",
            family: "reference-compatibility-seals", value: built.compatibilityReferenceSeal },
          { kind: "REFERENCE_SEAL_V5_R11", family: "reference-seals", value: built.seal },
          { kind: "REFERENCE_SEAL_VALIDATION_V5_R11",
            family: "reference-seal-validations", value: built.validationReceipt },
        ], validatedAt);
      return success("MACHINE_REFERENCE_LABELS_FROZEN_RAW_AUTHORITATIVE_V5_R11_NO_PROVIDER_ACTIVITY", {
        referenceSeal: built.seal,
        compatibilityReferenceSeal: built.compatibilityReferenceSeal,
        validationReceipt: built.validationReceipt,
        transition,
        referenceLabelCount: 60,
      });
    } catch (error) {
      return blocked("REFERENCE_LABEL_SEAL_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function freezeDeepSeekExecutionRegistration(context) {
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      requireCondition(!artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11",
        { required: false }),
      "R11 DeepSeek execution registration is already frozen");
      const registeredAt = transitionTime(context, clockIso(clock));
      const evidence = evidenceBase(context, "DEEPSEEK_DIRECT", registeredAt);
      const referenceSealContext = await referenceSealContextFromContext(context,
        { derivedAt: registeredAt });
      const executionRegistration = buildNativeDeepSeekExecutionRegistrationV5R11({
        ...evidence,
        referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R11"),
        compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R11"),
        referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R11"),
        referenceSealContext,
        registeredAt,
      });
      const transition = await persistResult(advanceWorkflow, context,
        "freeze-deepseek-registration", [{ kind: "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11",
          family: "deepseek-execution-registrations", value: executionRegistration }], registeredAt);
      return success("DEEPSEEK_EXECUTION_REGISTRATION_V5_R11_FROZEN_NO_PROVIDER_ACTIVITY", {
        executionRegistration, transition,
      });
    } catch (error) {
      return blocked("DEEPSEEK_EXECUTION_REGISTRATION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function auditAttemptCustody(context, provider) {
    const errors = validateResumeCustodyV5R11(defaultAttemptCustody(context, provider));
    return errors.length > 0 ? blocked("ATTEMPT_CUSTODY_RECONCILIATION_REQUIRED", errors, { provider })
      : success("ATTEMPT_CUSTODY_FULLY_RECONCILED_NO_PROVIDER_ACTIVITY", { provider });
  }

  function rebuildResolvedAttemptFromCustody(context, provider, authorization, custody) {
    const preparedCompletion = custody.prepared ?? custody.completion;
    requireCondition(preparedCompletion && custody.intent,
      "R11 recovery cannot rebuild a resolved receipt without exact intent/completion custody");
    const requestArtifact = valuesBySchema(context, "ProviderRequestArtifactV5")
      .find((value) => value.compatibilityRequestArtifactHash
        === custody.reservation.requestArtifactHash);
    const dispatchAudit = findByHash(context, custody.intent.dispatchAuditHash);
    const dispatchPermit = findByHash(context, custody.intent.dispatchPermitHash);
    const compatibilityDispatchPermit = findByHash(context,
      custody.intent.compatibilityDispatchPermitHash);
    const rawResponseArtifact = findByHash(context, custody.intent.rawResponseArtifactHash);
    const rawResponseBindingReceipt = findByHash(context,
      custody.intent.rawResponseBindingReceiptHash);
    const providerEventReceipt = preparedCompletion.providerEventReceipt;
    const roleOutput = preparedCompletion.roleOutput;
    requireCondition([requestArtifact, dispatchAudit, dispatchPermit, compatibilityDispatchPermit,
      rawResponseArtifact, rawResponseBindingReceipt, providerEventReceipt].every(Boolean),
    "R11 recovery is missing exact request/audit/permit/raw/binding/event custody");
    return buildResolvedProviderAttemptReceiptV5R11({
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      authorizationHash: authorization.selfHash,
      authenticatedRouteEvidenceHash: providerArtifact(context, provider,
        "TRUSTED_ROUTE_ENVELOPE").selfHash,
      requestArtifact,
      dispatchAudit,
      reservation: custody.reservation,
      dispatchPermit,
      compatibilityDispatchPermit,
      rawResponseArtifact,
      rawResponseBindingReceipt,
      providerEventReceipt,
      roleOutput,
      preparedCompletion,
      rawAndBindingDurable: true,
      projectResidency: authorization.projectResidency,
      dataRegion: authorization.dataRegion,
      credentialReadCount: 1,
      preparedAt: custody.intent.preparedAt,
      intent: custody.intent,
      committedCompletion: custody.completion ?? preparedCompletion,
    });
  }

  async function loadRecoveryInput(recoveryPath, provider, context) {
    requireCondition(path.isAbsolute(recoveryPath ?? "") && PROVIDERS.has(provider),
      "R11 recovery loader requires an absolute protected path and exact provider");
    const relativePath = path.relative(context.trustedRoot.root, recoveryPath);
    requireCondition(relativePath.length > 0 && !relativePath.startsWith("..")
      && !path.isAbsolute(relativePath),
    "R11 recovery authorization path must remain inside the established protected root");
    const bundle = await readProtectedJsonV5R4({ trustedRoot: context.trustedRoot, relativePath });
    const schemaErrors = validateClosedSelfHashedArtifactV5R11(bundle,
      "AttemptRecoveryCommandAuthorizationBundleV1");
    requireCondition(schemaErrors.length === 0 && bundle.provider === provider
      && bundle.activeRunnerRegistrationHash === context.activeRegistration.selfHash,
    `R11 recovery authorization bundle is invalid: ${schemaErrors.join("; ")}`);
    const authorization = providerArtifact(context, provider, "AUTHORIZATION");
    requireCondition(bundle.providerAuthorizationHash === authorization.selfHash,
      "R11 recovery bundle provider authorization differs from the active custody");
    const providerCustody = defaultAttemptCustody(context, provider);
    const custody = inspectInterruptedAttemptCustodyV5R11({ ...providerCustody,
      reservationHash: bundle.reservationHash });
    const recoveredCompletion = custody.prepared ?? custody.completion ?? null;
    const recoveredResolvedAttemptReceipt = custody.resolved
      ?? (["INTENT_WITHOUT_LEDGER_COMPLETION", "COMPLETION_WITHOUT_RESOLVED_RECEIPT"]
        .includes(custody.state)
        ? rebuildResolvedAttemptFromCustody(context, provider, authorization, custody) : null);
    return {
      ...providerCustody,
      provider,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      providerAuthorizationHash: authorization.selfHash,
      reservationHash: bundle.reservationHash,
      recoveryAuthorization: bundle.reconciliationAuthorization,
      ledgerRecoveryAuthorization: bundle.ledgerRecoveryAuthorization,
      recoveredCompletion,
      recoveredResolvedAttemptReceipt,
      ledger: providerCustody.ledger,
      resolvedAttemptReceiptStore: providerCustody.custodyStore.resolvedAttemptReceiptStore,
      reconciliationReceiptStore: providerCustody.custodyStore.reconciliationReceiptStore,
      at: transitionTime(context, clockIso(clock)),
    };
  }

  async function reconcileInterruptedAttempt(context, recoveryInput) {
    try {
      const result = await applyInterruptedAttemptReconciliationV5R11(recoveryInput);
      const additions = [{ kind: `ATTEMPT_CUSTODY_RECONCILIATION_V5_R11:${result.receipt.selfHash}`,
        family: "attempt-custody-reconciliations", value: result.receipt }];
      if (recoveryInput.recoveredResolvedAttemptReceipt) additions.push({
        kind: `RESOLVED_PROVIDER_ATTEMPT_V5_R11:${recoveryInput.recoveredResolvedAttemptReceipt.selfHash}`,
        family: "resolved-provider-attempts", value: recoveryInput.recoveredResolvedAttemptReceipt,
      });
      const transition = await persistResult(advanceWorkflow, context,
        "reconcile-interrupted-attempt-zero-http", additions, later(recoveryInput.at, 1));
      context.attemptCustodyByProvider = await (async () => {
        const current = { ...(context.attemptCustodyByProvider ?? {}) };
        const provider = recoveryInput.provider;
        requireCondition(PROVIDERS.has(provider), "R11 recovery input provider is absent");
        const authorization = providerArtifact(context, provider, "AUTHORIZATION");
        const ledger = current[provider].ledger;
        const verified = await ledger.verify();
        const reloaded = await reloadAttemptCustodyStoreV5R11({ trustedRoot: context.trustedRoot,
          provider, authorizationHash: authorization.selfHash, ledgerEntries: verified.entries });
        current[provider] = Object.freeze({ ...current[provider], ledgerEntries: verified.entries,
          preparedCompletions: reloaded.preparedCompletions,
          attemptCommitIntents: reloaded.attemptCommitIntents,
          resolvedAttemptReceipts: reloaded.resolvedAttemptReceipts,
          reconciliationReceipts: reloaded.reconciliationReceipts,
          custodyStore: reloaded.store,
          custodyErrors: validateResumeCustodyV5R11({ ledgerEntries: verified.entries,
            preparedCompletions: reloaded.preparedCompletions,
            attemptCommitIntents: reloaded.attemptCommitIntents,
            resolvedAttemptReceipts: reloaded.resolvedAttemptReceipts }) });
        return current;
      })();
      return success(result.resumeAllowedAfterPlannedAppend
        ? "INTERRUPTED_ATTEMPT_RECONCILIATION_APPLIED_ZERO_HTTP"
        : "INTERRUPTED_ATTEMPT_DISPOSITION_UNCERTAIN_RESUME_BLOCKED_ZERO_HTTP", {
        reconciliationReceipt: result.receipt,
        resumeAllowedAfterPlannedAppend: result.resumeAllowedAfterPlannedAppend,
        transition,
      });
    } catch (error) {
      return blocked("INTERRUPTED_ATTEMPT_RECONCILIATION_BLOCKED_ZERO_HTTP",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  function terminalC0Scope(context, inventory) {
    const receipt = assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
      schemaVersion: "TerminalC0RequirementScopeV1",
      designId: "MAIS-NATURAL-CA60-V5",
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      sampleExecutionInventoryHash: inventory.selfHash,
      selectedItemHashes: inventory.items.map(({ itemHash }) => itemHash),
      selectionStatus: "NORMAL_C0_SET_NOT_YET_DERIVABLE_TERMINAL_CONSERVATIVE_SCOPE",
      conservativePotentialC0Scope: true,
    }), "TerminalC0RequirementScopeV1");
    return receipt;
  }

  async function nativeScoringEvidence(context, scoredAt, { terminal = false,
    expectedGraph = null, expectedSemantic = null } = {}) {
    const evidence = await activationContext(context, "DEEPSEEK_DIRECT", scoredAt);
    const ledger = await openLedger(context, evidence);
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0, verified.errors.join("; "));
    const built = reconstructGraph(context, evidence, verified.entries, [],
      expectedGraph?.derivedAt ?? scoredAt);
    requireCondition(built.receipt.graphStatus === "COMPLETE_VALID",
      built.receipt.lineageErrors.join("; "));
    if (expectedGraph) requireCondition(canonicalJsonV5R3(expectedGraph)
      === canonicalJsonV5R3(built.receipt),
    "stored R11 DeepSeek graph differs from exact raw-custody reconstruction");
    const c0State = normalC0State(context, evidence, verified.entries);
    const c0ExecutionSet = c0State.c0ExecutionSet
      ?? (terminal ? terminalC0Scope(context, evidence.inventory) : null);
    requireCondition(c0ExecutionSet,
      "R11 complete scoring requires the frozen normal C0 execution set");
    let semanticDispatchVerificationReceipt = null;
    if (!terminal) {
      const expectedSuccessfulCount = 120
        + c0ExecutionSet.selectedItemHashes.length * C0_ROLES.length;
      requireCondition(successfulEvidence(built.receipt).length === expectedSuccessfulCount,
        "R11 execution is incomplete; complete frozen-metric scoring is forbidden");
      semanticDispatchVerificationReceipt = buildSemanticVerification(context, evidence,
        verified.entries, built, expectedSemantic?.verifiedAt ?? later(scoredAt, 1),
        "DEEPSEEK_RESUME");
      if (expectedSemantic) requireCondition(canonicalJsonV5R3(expectedSemantic)
        === canonicalJsonV5R3(semanticDispatchVerificationReceipt),
      "stored R11 semantic verification differs from exact reconstruction");
    }
    const referenceSealContext = await referenceSealContextFromContext(context,
      { derivedAt: scoredAt });
    const authorizations = [providerArtifact(context, "OPENAI_DIRECT", "AUTHORIZATION"),
      evidence.authorization];
    const commandJournals = valuesBySchema(context, "CommandTransitionJournalReceiptV2");
    return {
      activeRegistration: context.activeRegistration,
      inventory: evidence.inventory,
      executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R11"),
      c0ExecutionSet,
      predicateInputsByItem: c0State.predicateInputsByItem,
      deepSeekAuthorization: evidence.authorization,
      deepSeekAttemptGraphReceipt: built.receipt,
      deepSeekAttemptGraphContext: built.graphContext,
      semanticDispatchVerificationReceipt,
      referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R11"),
      compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R11"),
      referenceSealContext,
      referenceAttemptGraphReceipt: referenceSealContext.attemptGraphReceipt,
      referenceLedgerEntries: referenceSealContext.attemptGraphContext.ledgerEntries,
      thresholdsFrozenAt: DESIGN.thresholdsFrozenAt,
      commandJournals,
      decisionEvidenceInput: {
        authorizations,
        commandJournals,
      },
      scoredAt,
    };
  }

  async function persistScoringBundle(context, built, terminalReceipt, committedAt) {
    const entries = [
      { kind: `ATTEMPT_GRAPH_V5_R11:${built.rawEvidence.deepSeekAttemptGraphReceipt.selfHash}`,
        family: "attempt-graphs", value: built.rawEvidence.deepSeekAttemptGraphReceipt },
      { kind: `SEMANTIC_DISPATCH_VERIFICATION_V5_R11:${built.rawEvidence.semanticDispatchVerificationReceipt.selfHash}`,
        family: "semantic-dispatch-verifications",
        value: built.rawEvidence.semanticDispatchVerificationReceipt },
      { kind: `DECISION_EVIDENCE_V5_R11:${built.decisionEvidenceReceipt.selfHash}`,
        family: "decision-evidence", value: built.decisionEvidenceReceipt },
      ...built.itemResults.map((value) => ({ kind: `ITEM_RESULT_V5_R11:${value.itemHash}`,
        family: "item-results", value })),
      ...built.completedItemMarkers.map((value) => ({
        kind: `COMPLETED_ITEM_MARKER_V5_R11:${value.itemHash}`,
        family: "completed-item-markers", value })),
      { kind: `OBSERVED_LEDGER_V5_R11:${built.observedLedger.selfHash}`,
        family: "observed-ledgers", value: built.observedLedger },
      { kind: `COUNTERFACTUAL_LEDGER_V5_R11:${built.counterfactualLedger.selfHash}`,
        family: "counterfactual-ledgers", value: built.counterfactualLedger },
      { kind: `METRIC_INPUT_LEDGER_V5_R11:${built.metricInputLedger.selfHash}`,
        family: "metric-input-ledgers", value: built.metricInputLedger },
      { kind: `FINAL_EVALUATION_V5_R11:${built.finalReceipt.selfHash}`,
        family: "final-evaluations", value: built.finalReceipt },
      { kind: `AGGREGATE_SCORE_V5_R11:${built.scoreReceipt.selfHash}`,
        family: "aggregate-scores", value: built.scoreReceipt },
    ];
    if (terminalReceipt) entries.push({ kind: `TERMINAL_DECISION_V5_R11:${terminalReceipt.selfHash}`,
      family: "terminal-decisions", value: terminalReceipt });
    return persistResult(advanceWorkflow, context, "score-v5-r11", entries, committedAt);
  }

  async function persistTerminalBundle(context, built, committedAt) {
    const entries = [
      { kind: `ATTEMPT_GRAPH_V5_R11:${built.rawEvidence.deepSeekAttemptGraphReceipt.selfHash}`,
        family: "attempt-graphs", value: built.rawEvidence.deepSeekAttemptGraphReceipt },
      { kind: `TERMINAL_C0_SCOPE_V5_R11:${built.rawEvidence.c0ExecutionSet.selfHash}`,
        family: "terminal-c0-scopes", value: built.rawEvidence.c0ExecutionSet },
      { kind: `DECISION_EVIDENCE_V5_R11:${built.decisionEvidenceReceipt.selfHash}`,
        family: "decision-evidence", value: built.decisionEvidenceReceipt },
      ...built.itemResults.map((value) => ({ kind: `ITEM_RESULT_V5_R11:${value.itemHash}`,
        family: "item-results", value })),
      ...built.completedItemMarkers.map((value) => ({
        kind: `COMPLETED_ITEM_MARKER_V5_R11:${value.itemHash}`,
        family: "completed-item-markers", value })),
      { kind: `TERMINAL_DECISION_V5_R11:${built.terminalReceipt.selfHash}`,
        family: "terminal-decisions", value: built.terminalReceipt },
    ];
    return persistResult(advanceWorkflow, context, "score-terminal-v5-r11", entries, committedAt);
  }

  async function score(context) {
    const scoredAt = transitionTime(context, clockIso(clock));
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      const input = await nativeScoringEvidence(context, scoredAt);
      const built = scoreNaturalCaV5R11({ ...input, scoredAt: later(scoredAt, 1) });
      if (built.finalReceipt.overallDecision === "EXECUTION_INTEGRITY_FAILED") {
        const terminal = buildTerminalExecutionBundleFromRawCustodyV5R11({
          ...input, scoredAt: later(scoredAt, 1),
        });
        const terminalBuilt = { ...terminal, rawEvidence: input };
        const transition = await persistTerminalBundle(context, terminalBuilt, later(scoredAt, 2));
        return blocked(terminal.terminalReceipt.overallDecision,
          terminal.terminalReceipt.terminalCauseCodes, { ...terminalBuilt, transition,
            naturalQuestionResultCount: terminal.itemResults.filter(({ executionDisposition }) =>
              executionDisposition === "COMPLETE").length });
      }
      const persisted = { ...built, rawEvidence: input };
      const transition = await persistScoringBundle(context, persisted, null, later(scoredAt, 2));
      return success(built.scoreReceipt.overallDecision, { ...persisted, terminalReceipt: null, transition,
        naturalQuestionResultCount: built.observedLedger.accounting.completeReceiptItemCount });
    } catch (error) {
      try {
        const input = await nativeScoringEvidence(context, scoredAt, { terminal: true });
        const terminal = buildTerminalExecutionBundleFromRawCustodyV5R11({
          ...input, scoredAt: later(scoredAt, 1),
        });
        const built = { ...terminal, rawEvidence: input };
        const transition = await persistTerminalBundle(context, built, later(scoredAt, 2));
        return blocked(terminal.terminalReceipt.overallDecision,
          [error instanceof Error ? error.message : String(error),
            ...terminal.terminalReceipt.terminalCauseCodes], {
            ...built, transition,
            naturalQuestionResultCount: terminal.itemResults.filter(({ executionDisposition }) =>
              executionDisposition === "COMPLETE").length,
          });
      } catch (terminalError) {
        return blocked("TERMINAL_EXECUTION_DECISION_PERSISTENCE_BLOCKED", [
          error instanceof Error ? error.message : String(error),
          terminalError instanceof Error ? terminalError.message : String(terminalError),
        ]);
      }
    }
  }

  async function verify(context) {
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      const scoreReceipt = valuesBySchema(context, "NaturalCaAggregateScoreReceiptV7").at(-1);
      if (scoreReceipt) {
        const graphReceipt = findByHash(context, scoreReceipt.deepSeekAttemptGraphReceiptHash);
        const semanticReceipt = findByHash(context,
          scoreReceipt.semanticDispatchVerificationReceiptHash);
        requireCondition(graphReceipt && semanticReceipt,
          "R11 score-bound graph or semantic receipt is absent");
        const input = await nativeScoringEvidence(context, scoreReceipt.scoredAt,
          { expectedGraph: graphReceipt, expectedSemantic: semanticReceipt });
        const verifyErrors = verifyNaturalCaScoreFromRawEvidenceV5R11({ ...input, scoreReceipt });
        return verifyErrors.length > 0
          ? blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED", verifyErrors)
          : success("V5_R11_RAW_EVIDENCE_SCORE_RECOMPUTED_NO_PASS_CLAIM", { scoreReceipt,
            naturalQuestionResultCount: scoreReceipt.completeItemCount });
      }
      const terminalReceipt = valuesBySchema(context, "TerminalExecutionDecisionReceiptV2").at(-1);
      requireCondition(terminalReceipt, "no R11 aggregate or terminal execution receipt exists");
      const graphReceipt = findByHash(context, terminalReceipt.attemptGraphReceiptHash);
      requireCondition(graphReceipt, "R11 terminal graph receipt is absent");
      const input = await nativeScoringEvidence(context, terminalReceipt.derivedAt,
        { terminal: true, expectedGraph: graphReceipt });
      const rebuilt = buildTerminalExecutionBundleFromRawCustodyV5R11({
        ...input, scoredAt: terminalReceipt.derivedAt,
      });
      const verifyErrors = [...verifyTerminalExecutionDecisionReceiptV5R11({
        ...rebuilt.statisticalInput,
        terminalCauseCodes: rebuilt.terminalReceipt.terminalCauseCodes,
        attemptGraphReceiptHash: graphReceipt.selfHash,
        ledgerEntryRootHash: graphReceipt.ledgerEntryRootHash,
        resolvedAttemptReceiptRootHash: rebuilt.decisionEvidenceReceipt.resolvedAttemptReceiptRootHash,
        commandJournalRootHash: rebuilt.decisionEvidenceReceipt.commandJournalRootHash,
        decisionEvidenceReceiptHash: rebuilt.decisionEvidenceReceipt.selfHash,
        terminalCauseEvidenceRootHash: rebuilt.terminalCauseEvidenceRootHash,
        receipt: terminalReceipt,
      })];
      if (canonicalJsonV5R3(rebuilt.terminalReceipt) !== canonicalJsonV5R3(terminalReceipt)) {
        verifyErrors.push("R11 terminal receipt differs from raw-custody reconstruction");
      }
      return verifyErrors.length > 0
        ? blocked("TERMINAL_EXECUTION_RESULT_VERIFICATION_BLOCKED", verifyErrors)
        : success("V5_R11_TERMINAL_DECISION_RECOMPUTED_NO_METRIC_INFERENCE_NO_PASS_CLAIM",
          { terminalReceipt });
    } catch (error) {
      return blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function exportAggregateReport(context) {
    const verified = await verify(context);
    return verified.ok ? success("AGGREGATE_REPORT_ELIGIBLE_CLAIM_CEILING_ENFORCED", {
      decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      passClaimAllowed: false,
      limitedGeneralizationEvidenceAllowed: false,
      naturalQuestionResultCount: verified.naturalQuestionResultCount,
    }) : blocked("AGGREGATE_REPORT_EXPORT_BLOCKED", verified.errors);
  }

  return Object.freeze({
    loadWorkflowContext,
    adoptPredecessorWorkflowIndex,
    verifyFrozenUpstream,
    dryRun,
    authorizeCheck,
    registerTrustedRouteEvidence,
    executeOpenAIResumeStep: (context) => executeProviderStep(context, "OPENAI_DIRECT", "RESUME"),
    executeDeepSeekCanaryStep: (context) => executeProviderStep(context, "DEEPSEEK_DIRECT", "CANARY_1"),
    executeDeepSeekResumeStep: (context) => executeProviderStep(context, "DEEPSEEK_DIRECT", "RESUME"),
    rejectLegacyQwenCommand: async () => blocked("LEGACY_QWEN_COMMAND_REJECTED_ZERO_HTTP",
      ["qwen3.8-max is superseded and forbidden by V5"]),
    auditAttemptCustody,
    loadRecoveryInput,
    reconcileInterruptedAttempt,
    sealReferenceLabels,
    freezeDeepSeekExecutionRegistration,
    score,
    verify,
    exportAggregateReport,
  });
}

export const V5_R11_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  workflowIndexPattern: "workflow-indexes-v5-r11/<selfHash>.json",
  derivedArtifactRoot: "derived-v5-r11",
  terminalDecisions: "terminal-decisions",
  itemResults: "item-results",
  completedItemMarkers: "completed-item-markers",
  defaultNativePlannerExecutorInstalled: true,
  callerSuppliedScoringDecisionFactsAccepted: false,
  defaultRecoveryLoaderInstalled: true,
});
