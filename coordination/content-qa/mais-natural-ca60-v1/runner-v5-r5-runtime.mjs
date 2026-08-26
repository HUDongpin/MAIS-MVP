import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateFrozenNaturalItemLeafHashV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R5,
  validateExactRunnerRegistrationEvidenceV5R5,
  validateFreshRunnerReviewV5R5,
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  advanceProtectedWorkflowIndexV5R5,
  loadProtectedWorkflowIndexV5R5,
} from "./workflow-index-v5-r5.mjs";
import {
  validateProviderActivationV5R5,
} from "./activation-guard-v5-r5.mjs";
import {
  buildAuthenticatedRouteEvidenceV5R5,
  buildProviderCostPreviewV5R5,
  V5_R5_ROUTE_CONSTANTS,
} from "./route-authorization-v5-r5.mjs";
import {
  createAtomicExecutionLedgerV5R5,
} from "./atomic-execution-ledger-v5-r5.mjs";
import {
  buildCanaryGateReceiptV5R5,
  buildStateBoundDispatchAuditV5R5,
  planStateBoundNextActionV5R5,
} from "./state-bound-dispatch-v5-r5.mjs";
import {
  buildProviderRequestArtifactV5R4,
} from "./provider-request-v5-r4.mjs";
import {
  createStateBoundExactProviderTransportV5R5,
  runGuardedProviderAttemptV5R5,
} from "./guarded-provider-attempt-v5-r5.mjs";
import {
  buildOpenAIAdjudicationTriggerV5R4,
  buildRawMachineReferenceLabelV5R4,
} from "./reference-label-seal-v5-r4.mjs";
import {
  resolveSuccessfulRoleOutputV5R4,
} from "./atomic-execution-ledger-v5-r4.mjs";
import {
  buildC0PredicateInputFromProtectedEvidenceV5R5,
  buildC0PredicateReceiptV5R5,
  buildDeepSeekC0ExecutionSetV5R5,
} from "./c0-trigger-v5-r5.mjs";
import {
  buildMachineReferenceSealV5R5,
} from "./reference-label-seal-v5-r5.mjs";
import {
  buildDeepSeekExecutionRegistrationV5R5,
  buildReferenceSealValidationReceiptV5R5,
} from "./deepseek-execution-registration-v5-r5.mjs";
import {
  scoreNaturalCaV5R5,
} from "./scorer-v5-r5.mjs";
import {
  buildFinalExecutionVerificationReceiptV5R5,
  evaluateAggregateExportGateV5R5,
} from "./verification-publication-v5-r5.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");
const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const ROUTE_KINDS = Object.freeze(["ACCOUNT_PROJECT_IDENTITY", "DIRECT_BILLING_ROUTE", "DATA_REGION", "PRICE", "ROUTE_PROBE_RESPONSE"]);

function requireCondition(condition, message) { if (!condition) throw new TypeError(message); }
function clockIso(clock) {
  const value = clock(); const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("runner clock is invalid");
  return date.toISOString();
}
function transitionTime(context, desired) {
  const prior = Date.parse(context.index.createdAt);
  const candidate = Date.parse(desired);
  return new Date(Number.isFinite(candidate) && candidate > prior ? candidate : prior + 1).toISOString();
}
function blocked(status, errors = []) {
  return Object.freeze({ ok: false, status, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
    errors: Object.freeze([...new Set(errors)]) });
}
function success(status, extra = {}) {
  return Object.freeze({ ok: true, status, providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0, ...extra });
}
function artifact(context, kind, { required = true } = {}) {
  const value = context.artifacts.get(kind);
  if (required && value === undefined) throw new Error(`protected workflow artifact ${kind} is absent`);
  return value;
}
function providerPrefix(provider) { return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK"; }
function providerArtifact(context, provider, suffix, options) { return artifact(context, `${providerPrefix(provider)}_${suffix}`, options); }
function fixedLedgerRelativePath(provider, authorizationHash) {
  return path.join("execution-ledgers-v5-r5", provider === "OPENAI_DIRECT" ? "openai-reference" : "deepseek-evaluation", authorizationHash);
}
function itemLeafForHash(context, itemHash) {
  const leaves = artifact(context, "ITEM_LEAF_SET");
  requireCondition(Array.isArray(leaves) && leaves.length === 60, "protected item leaf set must contain exactly 60 rows");
  const matches = leaves.filter((leaf) => calculateFrozenNaturalItemLeafHashV4(leaf) === itemHash);
  requireCondition(matches.length === 1, "planned item does not resolve to exactly one frozen protected leaf");
  return matches[0];
}
function dispatchAudits(context) {
  return [...context.artifacts.entries()].filter(([kind]) => kind.startsWith("STATE_BOUND_DISPATCH_AUDIT:"))
    .map(([, value]) => value);
}
function completedRole(entries, itemHash, role) {
  return entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED" && entry.attemptStatus === "SUCCEEDED"
    && entry.roleOutput?.itemHash === itemHash && entry.roleOutput?.role === role);
}

export function createRunnerRuntimeV5R5({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  fetchImplementation = null,
  credentialReaders = Object.freeze({}),
  clock = () => new Date(),
  registrationEvidenceLoader,
  ledgerOwnerPid = process.pid,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    return loadProtectedWorkflowIndexV5R5(indexPath, { protectedRoot, repoRoot, registrationEvidenceLoader });
  }

  async function advance(context, command, appendedArtifacts, at = clockIso(clock)) {
    return advanceProtectedWorkflowIndexV5R5({ context, command, appendedArtifacts,
      committedAt: transitionTime(context, at) });
  }

  async function adoptR5WorkflowIndex(context) {
    if (context.index.schemaVersion !== "ProtectedWorkflowIndexV1") return blocked("WORKFLOW_INDEX_ALREADY_V5_R5", ["adoption is only valid from the immutable V5-R4 index"]);
    const transition = await advance(context, "adopt-r5-index", [{ kind: "ACTIVE_RUNNER_REGISTRATION",
      family: "runner-registrations", value: context.activeRegistration }]);
    return success("V5_R5_WORKFLOW_INDEX_SUPERSEDED_NO_PROVIDER_ACTIVITY", { transition });
  }

  function upstreamErrors(context, { requireReview = true } = {}) {
    const errors = [
      ...validateExactRunnerRegistrationEvidenceV5R5(context.registrationEvidence),
      ...validateActiveRunnerRegistrationV5R5({ activeRegistration: context.activeRegistration, baseRegistration: context.registration }),
    ];
    if (context.index.schemaVersion !== "ProtectedWorkflowIndexV2") errors.push("active workflow index has not superseded V5-R4");
    const freshReview = artifact(context, "FRESH_RUNNER_REVIEW", { required: false });
    if (requireReview) errors.push(...validateFreshRunnerReviewV5R5({ activeRegistration: context.activeRegistration, freshReview }));
    const inventory = artifact(context, "SAMPLE_INVENTORY", { required: false });
    const sampleManifest = artifact(context, "SAMPLE_MANIFEST", { required: false });
    const c0RandomAudit = artifact(context, "C0_RANDOM_AUDIT", { required: false });
    const screenEvidence = artifact(context, "SCREEN_EVIDENCE", { required: false });
    errors.push(...validateManifestBoundInventoryV5R5({ registration: context.registration, inventory, sampleManifest, c0RandomAudit, screenEvidence }));
    return [...new Set(errors)];
  }

  async function verifyFrozenUpstream(context) {
    const errors = upstreamErrors(context);
    return errors.length > 0 ? blocked("UPSTREAM_FROZEN_EVIDENCE_BLOCKED", errors)
      : success("EXACT_V5_R5_REGISTRATION_REVIEW_FRAME_SAMPLE_AND_ZERO_AUTHORITY_VERIFIED");
  }

  async function dryRun(context) {
    const verified = await verifyFrozenUpstream(context);
    return verified.ok ? success("OFFLINE_DRY_RUN_VERIFIED_NO_CREDENTIAL_READ_NO_PROVIDER_EVENT_NO_EGRESS") : verified;
  }

  function activationContext(context, provider, at) {
    return {
      registration: context.registration,
      activeRegistration: context.activeRegistration,
      freshReview: artifact(context, "FRESH_RUNNER_REVIEW"),
      inventory: artifact(context, "SAMPLE_INVENTORY"),
      sampleManifest: artifact(context, "SAMPLE_MANIFEST"),
      c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT"),
      screenEvidence: artifact(context, "SCREEN_EVIDENCE"),
      authenticatedRouteEvidence: providerArtifact(context, provider, "AUTHENTICATED_ROUTE_EVIDENCE"),
      costPreview: providerArtifact(context, provider, "COST_PREVIEW"),
      ownerActivationGrant: providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT"),
      routeEvidence: providerArtifact(context, provider, "ROUTE_EVIDENCE"),
      priceSnapshot: providerArtifact(context, provider, "PRICE_SNAPSHOT"),
      ownerGrant: providerArtifact(context, provider, "OWNER_GRANT"),
      credentialReadinessReceipt: providerArtifact(context, provider, "CREDENTIAL_READINESS"),
      authorization: providerArtifact(context, provider, "AUTHORIZATION"),
      provider,
      at,
    };
  }

  async function authorizeCheck(context, provider) {
    try {
      const at = clockIso(clock);
      const input = activationContext(context, provider, at);
      const errors = validateProviderActivationV5R5(input);
      return errors.length > 0 ? blocked("AUTHORIZATION_BLOCKED", errors)
        : success("AUTHORIZATION_READY_NO_CREDENTIAL_READ_NO_DISPATCH");
    } catch (error) { return blocked("AUTHORIZATION_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function registerAuthenticatedRouteEvidence(context, provider) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const sources = ROUTE_KINDS.map((kind) => providerArtifact(context, provider, `AUTH_ROUTE_SOURCE:${kind}`));
      const receipt = buildAuthenticatedRouteEvidenceV5R5({ activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        provider, sources, validatedAt: at });
      const transition = await advance(context, "register-route-evidence", [{ kind: `${providerPrefix(provider)}_AUTHENTICATED_ROUTE_EVIDENCE`,
        family: "authenticated-route-evidence", value: receipt }]);
      return success("AUTHENTICATED_ROUTE_EVIDENCE_REGISTERED_NO_PROVIDER_ACTIVITY", { receipt, transition });
    } catch (error) { return blocked("AUTHENTICATED_ROUTE_EVIDENCE_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function buildCostPreview(context, provider, tokenAllocation) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const route = providerArtifact(context, provider, "AUTHENTICATED_ROUTE_EVIDENCE");
      const tuple = V5_R5_ROUTE_CONSTANTS.providerTuples[provider];
      const preview = buildProviderCostPreviewV5R5({ activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        provider, maximumSuccessfulCalls: tuple.maximumSuccessfulCalls, maximumAttempts: tuple.maximumAttempts,
        maximumInputTokens: tokenAllocation.maximumInputTokens, maximumOutputTokens: tokenAllocation.maximumOutputTokens,
        maximumTokens: tuple.maximumTokens, maximumEstimatedUsd: tokenAllocation.maximumEstimatedUsd,
        inputUsdPerMillionTokens: route.inputUsdPerMillionTokens, outputUsdPerMillionTokens: route.outputUsdPerMillionTokens,
        priceEvidenceHash: route.selfHash, computedAt: at });
      const transition = await advance(context, "build-cost-preview", [{ kind: `${providerPrefix(provider)}_COST_PREVIEW`,
        family: "cost-previews", value: preview }]);
      return success("PROVIDER_COST_PREVIEW_FROZEN_NO_PROVIDER_ACTIVITY", { preview, transition });
    } catch (error) { return blocked("PROVIDER_COST_PREVIEW_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function openLedger(context, evidence) {
    return createAtomicExecutionLedgerV5R5({ trustedRoot: context.trustedRoot,
      ledgerRelativePath: fixedLedgerRelativePath(evidence.authorization.provider, evidence.authorization.selfHash),
      activeRegistration: context.activeRegistration, authorization: evidence.authorization,
      inventory: evidence.inventory, priceSnapshot: evidence.priceSnapshot, clock, ownerPid: ledgerOwnerPid });
  }

  async function referenceSealContext(context) {
    const at = clockIso(clock);
    const openAI = activationContext(context, "OPENAI_DIRECT", at);
    const ledger = await openLedger(context, openAI);
    const verified = await ledger.verify();
    requireCondition(verified.errors.length === 0, verified.errors.join("; "));
    return { ...openAI, ledger, ledgerEntries: verified.entries };
  }

  async function deepSeekRegistrationContext(context, deepSeek, executionRegistration) {
    const reference = await referenceSealContext(context);
    return { ...deepSeek, executionRegistration, referenceSeal: artifact(context, "REFERENCE_SEAL"),
      referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION"),
      referenceSealContext: { authorization: reference.authorization, ledgerEntries: reference.ledgerEntries },
      deepSeekActivationContext: deepSeek };
  }

  function c0PredicateFor(context, evidence, ledgerEntries, item) {
    const critiqueOutput = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization: evidence.authorization,
      inventory: evidence.inventory, itemHash: item.itemHash, role: "B_PRIME_CRITIQUE" }).output;
    const revisionOutput = resolveSuccessfulRoleOutputV5R4({ entries: ledgerEntries, authorization: evidence.authorization,
      inventory: evidence.inventory, itemHash: item.itemHash, role: "B_PRIME_REVISION" }).output;
    const predicateInput = buildC0PredicateInputFromProtectedEvidenceV5R5({ item,
      itemLeaf: itemLeafForHash(context, item.itemHash), critiqueOutput, revisionOutput });
    return { predicateInput, receipt: buildC0PredicateReceiptV5R5({
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION").selfHash,
      inventoryHash: evidence.inventory.selfHash, item, predicateInput,
    }) };
  }

  async function ensureDeepSeekDerivedState(context, evidence, ledgerEntries, mode) {
    const executionRegistration = artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION");
    if (mode === "DEEPSEEK_CANARY") {
      const canary = evidence.inventory.items[0];
      if (BASE_ROLES.every((role) => completedRole(ledgerEntries, canary.itemHash, role))
        && !artifact(context, "CANARY_C0_PREDICATE", { required: false })) {
        const { receipt } = c0PredicateFor(context, evidence, ledgerEntries, canary);
        const transition = await advance(context, "freeze-c0-set", [{ kind: "CANARY_C0_PREDICATE", family: "c0-predicates", value: receipt }]);
        return success("CANARY_C0_PREDICATE_FROZEN_NO_PROVIDER_ACTIVITY", { predicateReceipt: receipt, transition });
      }
      const predicate = artifact(context, "CANARY_C0_PREDICATE", { required: false });
      const requiredRoles = predicate ? [...BASE_ROLES, ...(predicate.selectedForC0 ? C0_ROLES : [])] : BASE_ROLES;
      if (predicate && requiredRoles.every((role) => completedRole(ledgerEntries, canary.itemHash, role))
        && !artifact(context, "CANARY_GATE", { required: false })) {
        const gate = buildCanaryGateReceiptV5R5({ ...evidence, executionRegistration, canaryPredicateReceipt: predicate,
          ledgerEntries, dispatchAudits: dispatchAudits(context), passedAt: transitionTime(context, clockIso(clock)) });
        const transition = await advance(context, "execute-deepseek-canary", [{ kind: "CANARY_GATE", family: "canary-gates", value: gate }]);
        return success("REGISTERED_CANARY_INTEGRITY_CLEARED_NO_TUNING", { canaryGate: gate, transition, naturalQuestionResultCount: 1 });
      }
    } else if (mode === "DEEPSEEK_RESUME") {
      const allBaseComplete = evidence.inventory.items.every((item) => BASE_ROLES.every((role) => completedRole(ledgerEntries, item.itemHash, role)));
      if (allBaseComplete && !artifact(context, "DEEPSEEK_C0_EXECUTION_SET", { required: false })) {
        const inputs = new Map(evidence.inventory.items.map((item) => [item.itemHash, c0PredicateFor(context, evidence, ledgerEntries, item).predicateInput]));
        const set = buildDeepSeekC0ExecutionSetV5R5({ activeRunnerRegistrationHash: context.activeRegistration.selfHash,
          executionRegistrationHash: executionRegistration.selfHash, inventory: evidence.inventory, predicateInputsByItem: inputs });
        const transition = await advance(context, "freeze-c0-set", [{ kind: "DEEPSEEK_C0_EXECUTION_SET", family: "c0-execution-sets", value: set }]);
        return success("DEEPSEEK_C0_EXECUTION_SET_FROZEN_NO_PROVIDER_ACTIVITY", { c0ExecutionSet: set, transition });
      }
    }
    return null;
  }

  async function executeNext(context, provider, mode) {
    try {
      if (typeof fetchImplementation !== "function" || typeof credentialReaders[provider] !== "function") {
        return blocked("LIVE_BINDINGS_NOT_INSTALLED", ["registered runtime requires separately authorized injected fetch and credential-reader bindings"]);
      }
      const at = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, provider, at);
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      if (verified.errors.length > 0) return blocked("EXECUTION_LEDGER_BLOCKED", verified.errors);
      let executionRegistrationContext = null;
      if (provider === "DEEPSEEK_DIRECT") {
        executionRegistrationContext = await deepSeekRegistrationContext(context, evidence, artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION"));
        const derived = await ensureDeepSeekDerivedState(context, { ...evidence, ...executionRegistrationContext }, verified.entries, mode);
        if (derived) return derived;
      }
      const stateInput = {
        ...evidence,
        provider,
        mode,
        ledgerEntries: verified.entries,
        executionRegistration: provider === "DEEPSEEK_DIRECT" ? artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION") : null,
        executionRegistrationContext,
        canaryPredicateReceipt: artifact(context, "CANARY_C0_PREDICATE", { required: false }),
        c0ExecutionSet: artifact(context, "DEEPSEEK_C0_EXECUTION_SET", { required: false }),
        c0ExecutionSetContext: provider === "DEEPSEEK_DIRECT" ? {
          activeRunnerRegistrationHash: context.activeRegistration.selfHash,
          executionRegistrationHash: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION").selfHash,
          inventory: evidence.inventory,
          predicateInputsByItem: new Map(evidence.inventory.items.map((item) => [item.itemHash,
            provider === "DEEPSEEK_DIRECT" && completedRole(verified.entries, item.itemHash, "B_PRIME_REVISION")
              ? c0PredicateFor(context, evidence, verified.entries, item).predicateInput : null])),
        } : null,
        canaryGate: artifact(context, "CANARY_GATE", { required: false }),
        dispatchAudits: dispatchAudits(context),
        at,
      };
      const plan = planStateBoundNextActionV5R5(stateInput);
      if (!plan) return success("PROVIDER_PHASE_COMPLETE_NO_NEXT_ACTION");
      let adjudicationTrigger = null;
      if (provider === "OPENAI_DIRECT" && plan.role === "ADJUDICATOR") {
        const item = evidence.inventory.items[plan.manifestOrdinal - 1];
        const outputA = resolveSuccessfulRoleOutputV5R4({ entries: verified.entries, authorization: evidence.authorization,
          inventory: evidence.inventory, itemHash: item.itemHash, role: "A_LABEL" }).output;
        const outputB = resolveSuccessfulRoleOutputV5R4({ entries: verified.entries, authorization: evidence.authorization,
          inventory: evidence.inventory, itemHash: item.itemHash, role: "B_LABEL" }).output;
        adjudicationTrigger = buildOpenAIAdjudicationTriggerV5R4({ item,
          labelA: buildRawMachineReferenceLabelV5R4(outputA), labelB: buildRawMachineReferenceLabelV5R4(outputB) });
      }
      const requested = { ...stateInput, role: plan.role, itemHash: plan.itemHash, adjudicationTrigger };
      const dispatchAudit = buildStateBoundDispatchAuditV5R5(requested);
      const itemLeaf = itemLeafForHash(context, plan.itemHash);
      const requestArtifact = buildProviderRequestArtifactV5R4({ registration: context.registration,
        authorization: evidence.authorization, inventory: evidence.inventory, sampleManifest: evidence.sampleManifest,
        itemLeaf, role: plan.role, attemptId: dispatchAudit.attemptId, ledgerEntries: verified.entries });
      const requestTransition = await advance(context, provider === "OPENAI_DIRECT" ? "label-openai" : mode === "DEEPSEEK_CANARY" ? "execute-deepseek-canary" : "execute-deepseek-resume",
        [{ kind: `PROVIDER_REQUEST:${requestArtifact.selfHash}`, family: "provider-requests", value: requestArtifact }]);
      let auditTransition = null;
      const dispatchAuditStore = { append: async (actual) => {
        requireCondition(canonicalJsonV5R3(actual) === canonicalJsonV5R3(dispatchAudit), "guard supplied a different state-bound dispatch audit");
        auditTransition = await advance(context, provider === "OPENAI_DIRECT" ? "label-openai" : mode === "DEEPSEEK_CANARY" ? "execute-deepseek-canary" : "execute-deepseek-resume",
          [{ kind: `STATE_BOUND_DISPATCH_AUDIT:${actual.selfHash}`, family: "dispatch-audits", value: actual }]);
        return { contentHash: actual.selfHash };
      } };
      const transport = createStateBoundExactProviderTransportV5R5({ fetchImplementation,
        credentialReader: credentialReaders[provider], clock });
      const run = await runGuardedProviderAttemptV5R5({ ...requested, requestArtifact, ledger, transport,
        dispatchAuditStore, failureClock: () => clockIso(clock) });
      let workflowTransition = null;
      if (run.providerEventReceipt) {
        const additions = [
          { kind: `PROVIDER_EVENT:${run.providerEventReceipt.selfHash}`, family: "provider-events", value: run.providerEventReceipt },
          { kind: `DISPATCH_COMPLETION:${run.completion.selfHash}`, family: "dispatch-completions", value: run.completion },
        ];
        if (run.roleOutput) additions.push({ kind: `ROLE_OUTPUT:${run.roleOutput.selfHash}`, family: "role-outputs", value: run.roleOutput });
        workflowTransition = await advance(context, provider === "OPENAI_DIRECT" ? "label-openai" : mode === "DEEPSEEK_CANARY" ? "execute-deepseek-canary" : "execute-deepseek-resume", additions);
      }
      return Object.freeze({ ...run, ok: run.status === "SUCCEEDED", naturalQuestionEgressCount: run.providerEventCount,
        referenceLabelCount: 0, naturalQuestionResultCount: 0, requestTransition, auditTransition, workflowTransition });
    } catch (error) { return blocked("STATE_BOUND_PROVIDER_STEP_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function executeOpenAIResumeStep(context) { return executeNext(context, "OPENAI_DIRECT", "REFERENCE_RESUME"); }
  async function executeDeepSeekCanaryStep(context) { return executeNext(context, "DEEPSEEK_DIRECT", "DEEPSEEK_CANARY"); }
  async function executeDeepSeekResumeStep(context) { return executeNext(context, "DEEPSEEK_DIRECT", "DEEPSEEK_RESUME"); }

  async function sealReferenceLabels(context) {
    try {
      const reference = await referenceSealContext(context);
      const at = transitionTime(context, clockIso(clock));
      const referenceSeal = buildMachineReferenceSealV5R5({ activeRegistration: context.activeRegistration,
        registration: context.registration, authorization: reference.authorization, inventory: reference.inventory,
        ledgerEntries: reference.ledgerEntries, sealedAt: at });
      const validationReceipt = buildReferenceSealValidationReceiptV5R5({ activeRegistration: context.activeRegistration,
        registration: context.registration, inventory: reference.inventory, referenceSeal,
        referenceSealContext: { authorization: reference.authorization, ledgerEntries: reference.ledgerEntries },
        validatedAt: new Date(Date.parse(at) + 1).toISOString() });
      const transition = await advance(context, "seal-reference-labels", [
        { kind: "REFERENCE_SEAL", family: "reference-seals", value: referenceSeal },
        { kind: "REFERENCE_SEAL_VALIDATION", family: "reference-seal-validations", value: validationReceipt },
      ], validationReceipt.validatedAt);
      return success("MACHINE_REFERENCE_LABELS_FROZEN", { referenceSeal, validationReceipt, transition, referenceLabelCount: 60 });
    } catch (error) { return blocked("REFERENCE_LABEL_SEAL_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function freezeDeepSeekExecutionRegistration(context) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const deepSeek = activationContext(context, "DEEPSEEK_DIRECT", at);
      const input = await deepSeekRegistrationContext(context, deepSeek, null);
      const executionRegistration = buildDeepSeekExecutionRegistrationV5R5({ ...input, registeredAt: at });
      const transition = await advance(context, "freeze-deepseek-registration", [{ kind: "DEEPSEEK_EXECUTION_REGISTRATION",
        family: "deepseek-execution-registrations", value: executionRegistration }]);
      return success("DEEPSEEK_EXECUTION_REGISTRATION_FROZEN_NO_PROVIDER_ACTIVITY", { executionRegistration, transition });
    } catch (error) { return blocked("DEEPSEEK_EXECUTION_REGISTRATION_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function recoverStaleLedgerLock(context, provider, recoveryAuthorization, recoveredBy, pidProbe) {
    try {
      const recoveredAt = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, provider, recoveredAt);
      const ledger = await openLedger(context, evidence);
      const recovery = await ledger.recoverStaleLock({ recoveryAuthorization, recoveredBy, recoveredAt, pidProbe });
      const transition = await advance(context, "recover-stale-lock", [{ kind: `STALE_LOCK_RECOVERY:${recovery.receipt.selfHash}`,
        family: "stale-lock-recoveries", value: recovery.receipt }], recovery.receipt.recoveredAt);
      return success("STALE_LEDGER_LOCK_RECOVERED_WITH_EXPLICIT_OWNER_AUTHORIZATION", { recovery, transition });
    } catch (error) { return blocked("STALE_LEDGER_LOCK_RECOVERY_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function recoverInterruptedAttempt(context, provider, recoveryAuthorization, recoveredBy) {
    try {
      const recoveredAt = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, provider, recoveredAt);
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      if (verified.errors.length > 0) return blocked("INTERRUPTED_ATTEMPT_RECOVERY_BLOCKED", verified.errors);
      const reservation = verified.entries.find((entry) => entry.entryType === "DISPATCH_RESERVED"
        && entry.selfHash === recoveryAuthorization?.exactTargetHash);
      requireCondition(reservation, "interrupted recovery authorization does not identify an active reservation");
      requireCondition(!verified.entries.some((entry) => entry.entryType === "DISPATCH_COMPLETED"
        && entry.reservationHash === reservation.selfHash), "interrupted recovery reservation is already completed");
      const requestArtifact = artifact(context, `PROVIDER_REQUEST:${reservation.requestArtifactHash}`);
      const matchingAudits = dispatchAudits(context).filter((audit) => audit.attemptId === reservation.attemptId
        && audit.providerAuthorizationHash === evidence.authorization.selfHash);
      requireCondition(matchingAudits.length === 1, "interrupted recovery requires exactly one persisted state-bound dispatch audit");
      const recovery = await ledger.recoverInterruptedReservation({ recoveryAuthorization, requestArtifact,
        dispatchAudit: matchingAudits[0], freshReview: evidence.freshReview, recoveredBy, recoveredAt });
      const transition = await advance(context, "recover-interrupted-attempt", [
        { kind: `INTERRUPTED_ATTEMPT_RECOVERY:${recovery.recoveryReceipt.selfHash}`, family: "interrupted-attempt-recoveries", value: recovery.recoveryReceipt },
        { kind: `RECOVERED_PROVIDER_EVENT:${recovery.providerEventReceipt.selfHash}`, family: "recovered-provider-events", value: recovery.providerEventReceipt },
        { kind: `RECOVERED_DISPATCH_COMPLETION:${recovery.completion.selfHash}`, family: "recovered-dispatch-completions", value: recovery.completion },
      ], recovery.recoveryReceipt.recoveredAt);
      return success("INTERRUPTED_ATTEMPT_TERMINATED_CONSERVATIVE_WORST_CASE_NO_NEW_PROVIDER_ACTIVITY", { recovery, transition });
    } catch (error) { return blocked("INTERRUPTED_ATTEMPT_RECOVERY_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function assembleScoreEvidence(context, at = transitionTime(context, clockIso(clock))) {
    const openAI = activationContext(context, "OPENAI_DIRECT", at);
    const deepSeek = activationContext(context, "DEEPSEEK_DIRECT", at);
    const referenceLedger = await openLedger(context, openAI);
    const deepSeekLedger = await openLedger(context, deepSeek);
    const referenceVerified = await referenceLedger.verify();
    const deepSeekVerified = await deepSeekLedger.verify();
    requireCondition(referenceVerified.errors.length + deepSeekVerified.errors.length === 0,
      [...referenceVerified.errors, ...deepSeekVerified.errors].join("; "));
    const executionRegistration = artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION");
    const c0ExecutionSet = artifact(context, "DEEPSEEK_C0_EXECUTION_SET");
    const referenceSeal = artifact(context, "REFERENCE_SEAL");
    const referenceSealValidationReceipt = artifact(context, "REFERENCE_SEAL_VALIDATION");
    const requestArtifacts = deepSeekVerified.entries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED")
      .map(({ requestArtifactHash }) => artifact(context, `PROVIDER_REQUEST:${requestArtifactHash}`));
    const predicateInputsByItem = new Map(deepSeek.inventory.items.map((item) => [item.itemHash,
      c0PredicateFor(context, deepSeek, deepSeekVerified.entries, item).predicateInput]));
    const canaryPredicateReceipt = artifact(context, "CANARY_C0_PREDICATE");
    const canarySetDecision = c0ExecutionSet.decisions.find(({ itemHash }) => itemHash === deepSeek.inventory.canaryItemHash);
    requireCondition(canarySetDecision && canonicalJsonV5R3(canarySetDecision) === canonicalJsonV5R3(canaryPredicateReceipt),
      "authoritative full C0 set differs from the frozen canary predicate receipt");
    return {
      activeRegistration: context.activeRegistration,
      registration: context.registration,
      freshReview: artifact(context, "FRESH_RUNNER_REVIEW"),
      inventory: deepSeek.inventory,
      sampleManifest: deepSeek.sampleManifest,
      c0RandomAudit: deepSeek.c0RandomAudit,
      screenEvidence: deepSeek.screenEvidence,
      itemLeaves: artifact(context, "ITEM_LEAF_SET"),
      openAIAuthorization: openAI.authorization,
      deepSeekAuthorization: deepSeek.authorization,
      authorization: deepSeek.authorization,
      referenceLedgerEntries: referenceVerified.entries,
      deepSeekLedgerEntries: deepSeekVerified.entries,
      referenceSeal,
      referenceSealValidationReceipt,
      executionRegistration,
      c0ExecutionSet,
      predicateInputsByItem,
      canaryPredicateReceipt,
      canaryPredicateContext: { activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: executionRegistration.selfHash, inventoryHash: deepSeek.inventory.selfHash,
        item: deepSeek.inventory.items[0], predicateInput: canaryPredicateReceipt.predicateInput },
      canaryGate: artifact(context, "CANARY_GATE"),
      requestArtifacts,
      dispatchAudits: dispatchAudits(context),
      referenceSealContext: { authorization: openAI.authorization, ledgerEntries: referenceVerified.entries },
      deepSeekActivationContext: deepSeek,
      authenticatedRouteEvidence: deepSeek.authenticatedRouteEvidence,
      costPreview: deepSeek.costPreview,
      scoredAt: at,
    };
  }

  async function score(context) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const evidence = await assembleScoreEvidence(context, at);
      const scored = scoreNaturalCaV5R5(evidence);
      const additions = [
        ...scored.itemResults.map((value) => ({ kind: `ITEM_RESULT:${value.selfHash}`, family: "item-results", value })),
        ...scored.completedItemMarkers.map((value) => ({ kind: `COMPLETED_ITEM_MARKER:${value.selfHash}`, family: "completed-item-markers", value })),
        { kind: "AGGREGATE_SCORE_RECEIPT", family: "aggregate-scores", value: scored.scoreReceipt },
      ];
      const transition = await advance(context, "score", additions, scored.scoreReceipt.scoredAt);
      const naturalQuestionResultCount = scored.itemResults.filter(({ executionDisposition }) => executionDisposition === "COMPLETE").length;
      return Object.freeze({ ...success(scored.scoreReceipt.overallDecision),
        ok: !["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED"].includes(scored.scoreReceipt.overallDecision),
        scoreReceipt: scored.scoreReceipt, executionIntegrityEvidence: scored.executionIntegrityEvidence,
        transition, referenceLabelCount: 60, naturalQuestionResultCount });
    } catch (error) { return blocked("SCORING_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function verify(context) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const evidence = await assembleScoreEvidence(context, at);
      evidence.scoreReceipt = artifact(context, "AGGREGATE_SCORE_RECEIPT");
      const finalVerificationReceipt = buildFinalExecutionVerificationReceiptV5R5({ ...evidence, verifiedAt: at });
      const transition = await advance(context, "verify", [{ kind: "FINAL_EXECUTION_VERIFICATION",
        family: "final-verifications", value: finalVerificationReceipt }], finalVerificationReceipt.verifiedAt);
      return success("FULL_AUTHORITATIVE_R5_EXECUTION_CHAIN_RECOMPUTED", { finalVerificationReceipt, transition,
        referenceLabelCount: 60, naturalQuestionResultCount: finalVerificationReceipt.naturalQuestionResultCount });
    } catch (error) { return blocked("FULL_CHAIN_VERIFICATION_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  async function exportAggregateReport(context) {
    try {
      const evidence = await assembleScoreEvidence(context);
      evidence.scoreReceipt = artifact(context, "AGGREGATE_SCORE_RECEIPT");
      evidence.finalVerificationReceipt = artifact(context, "FINAL_EXECUTION_VERIFICATION");
      evidence.independentResultReview = artifact(context, "A11_RESULT_REVIEW", { required: false });
      evidence.claimBoundaryReview = artifact(context, "A18_CLAIM_BOUNDARY_REVIEW", { required: false });
      evidence.publicationAuthorization = artifact(context, "PUBLICATION_AUTHORIZATION", { required: false });
      const gate = evaluateAggregateExportGateV5R5(evidence);
      return blocked(gate.status, gate.errors);
    } catch (error) { return blocked("AGGREGATE_EXPORT_BLOCKED", [error instanceof Error ? error.message : String(error)]); }
  }

  return Object.freeze({ loadWorkflowContext, adoptR5WorkflowIndex, verifyFrozenUpstream, dryRun, authorizeCheck,
    registerAuthenticatedRouteEvidence, buildCostPreview, executeOpenAIResumeStep, executeDeepSeekCanaryStep,
    executeDeepSeekResumeStep, sealReferenceLabels, freezeDeepSeekExecutionRegistration,
    recoverStaleLedgerLock, recoverInterruptedAttempt, score, verify, exportAggregateReport });
}

export const V5_R5_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  workflowIndexPattern: "workflow-indexes-v5-r5/<selfHash>.json",
  providerRequestPattern: "derived-v5-r5/provider-requests/<selfHash>.json",
  ledgerPattern: "execution-ledgers-v5-r5/<provider>/<authorizationHash>/",
});
