import path from "node:path";
import { fileURLToPath } from "node:url";

import V5_R5_REGISTRATION from "../../research/mais-natural-ca60-v1/runner-registrations/v5-r5/runner-registration.json" with { type: "json" };

import {
  calculateFrozenNaturalItemLeafHashV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  canonicalJsonV5R3,
  sealV5R3Artifact,
  sha256V5R3,
} from "./execution-integrity-v5-r3.mjs";
import {
  validateActiveRunnerRegistrationV5R6,
  validateExactRunnerRegistrationEvidenceV5R6,
  validateFreshRunnerReviewV5R6,
} from "./execution-evidence-v5-r6.mjs";
import {
  validateManifestBoundInventoryV5R5,
} from "./execution-evidence-v5-r5.mjs";
import {
  ACTIVE_REGISTRATION_KIND_V5_R6,
  ACTIVE_REVIEW_KIND_V5_R6,
  advanceProtectedWorkflowIndexV5R6,
  loadProtectedWorkflowIndexV5R6,
  resolveActiveRunnerReviewV5R6,
} from "./workflow-index-v5-r6.mjs";
import {
  validateProviderActivationV5R6,
} from "./activation-guard-v5-r6.mjs";
import {
  buildProviderRequestArtifactV5R6,
} from "./provider-request-v5-r6.mjs";
import {
  buildStateBoundDispatchAuditV5R6,
  createResolvedExactProviderTransportV5R6,
  runGuardedProviderAttemptV5R6,
} from "./guarded-provider-attempt-v5-r6.mjs";
import {
  createAtomicExecutionLedgerV5R5,
} from "./atomic-execution-ledger-v5-r5.mjs";
import {
  createRawResponseCustodyStoreV5R6,
} from "./raw-response-custody-v5-r6.mjs";
import {
  createCommandTransitionJournalV5R6,
  runJournaledTransitionSequenceV5R6,
} from "./transition-journal-v5-r6.mjs";
import {
  atomicWriteProtectedJsonV5R4,
  readProtectedJsonV5R4,
} from "./protected-storage-v5-r4.mjs";
import {
  buildTerminalC0ExecutionSetV5R6,
  buildTerminalC0PredicateReceiptV5R6,
} from "./c0-terminal-v5-r6.mjs";
import {
  buildIncompleteExecutionScoreReceiptV5R6,
  deriveExecutionIntegrityEvidenceV5R6,
  validateAggregateScoreReceiptV5R6,
} from "./scorer-v5-r6.mjs";
import {
  buildExternallyAttestedRouteEvidenceV5R6,
} from "./route-evidence-custody-v5-r6.mjs";
import {
  buildDeepSeekExecutionRegistrationV5R6,
  buildMachineReferenceSealV5R6,
  buildReferenceSealValidationReceiptV5R6,
} from "./reference-execution-freeze-v5-r6.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");
const BASE_ROLES = Object.freeze(["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
const C0_ROLES = Object.freeze(["C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5"]);
const ROUTE_KINDS = Object.freeze([
  "ACCOUNT_PROJECT_IDENTITY",
  "DIRECT_BILLING_ROUTE",
  "DATA_REGION",
  "PRICE",
  "ROUTE_PROBE_RESPONSE",
]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function clockIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R6 runner clock is invalid");
  return date.toISOString();
}

function transitionTime(context, desired) {
  const prior = Date.parse(context.index.createdAt);
  const candidate = Date.parse(desired);
  return new Date(Number.isFinite(candidate) && candidate > prior ? candidate : prior + 1).toISOString();
}

function blocked(status, errors = [], extra = {}) {
  return Object.freeze({
    ok: false,
    status,
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
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
    providerEventCount: 0,
    httpRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    referenceLabelCount: 0,
    naturalQuestionResultCount: 0,
    transitionJournal: null,
    errors: Object.freeze([]),
    ...extra,
  });
}

function artifact(context, kind, { required = true } = {}) {
  const value = context?.artifacts?.get?.(kind);
  if (required && value === undefined) throw new Error(`protected R6 workflow artifact ${kind} is absent`);
  return value;
}

function providerPrefix(provider) {
  return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
}

function providerArtifact(context, provider, suffix, options) {
  return artifact(context, `${providerPrefix(provider)}_${suffix}_V5_R6`, options);
}

function fixedLedgerRelativePath(provider, compatibilityAuthorizationHash) {
  return path.join("execution-ledgers-v5-r6", provider === "OPENAI_DIRECT"
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
  const relativePath = path.join("runtime-custody-v5-r6", family, `${value.selfHash}.json`);
  try {
    const existing = await readProtectedJsonV5R4({ trustedRoot, relativePath });
    requireCondition(canonicalJsonV5R3(existing) === canonicalJsonV5R3(value),
      "runtime custody path already contains different canonical bytes");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await atomicWriteProtectedJsonV5R4({ trustedRoot, relativePath, value });
  }
  return Object.freeze({ contentHash: value.selfHash, relativePath });
}

function completedCallsFromLedger({ entries, dispatchAudits }) {
  const reservations = entries.filter(({ entryType }) => entryType === "DISPATCH_RESERVED");
  const auditsByAttempt = new Map(dispatchAudits.map((receipt) => [receipt.attemptId, receipt]));
  return entries.filter(({ entryType }) => entryType === "DISPATCH_COMPLETED").map((completion) => {
    const reservation = reservations.find(({ selfHash }) => selfHash === completion.reservationHash);
    const audit = auditsByAttempt.get(reservation?.attemptId);
    const scoped = reservations.filter(({ itemHash, role }) => itemHash === reservation?.itemHash && role === reservation?.role);
    return {
      itemHash: reservation?.itemHash,
      role: reservation?.role,
      attemptOrdinal: scoped.findIndex(({ selfHash }) => selfHash === reservation?.selfHash) + 1,
      attemptStatus: completion.attemptStatus,
      stateBound: audit?.schemaVersion === "StateBoundDispatchAuditReceiptV2",
      planHash: audit?.executionPlanHash ?? null,
      terminalProviderFailure: completion.attemptStatus !== "SUCCEEDED",
      canaryOrOrderViolation: false,
    };
  });
}

export function createRunnerRuntimeV5R6({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  fetchImplementation = null,
  credentialReaders = Object.freeze({}),
  clock = () => new Date(),
  registrationEvidenceLoader,
  ledgerOwnerPid = process.pid,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    return loadProtectedWorkflowIndexV5R6(indexPath, {
      protectedRoot,
      repoRoot,
      registrationEvidenceLoader,
    });
  }

  async function advance(context, command, appendedArtifacts, at = clockIso(clock)) {
    return advanceProtectedWorkflowIndexV5R6({
      context,
      command,
      appendedArtifacts,
      committedAt: transitionTime(context, at),
    });
  }

  async function adoptR6WorkflowIndex(context, freshReview) {
    try {
      requireCondition(context.needsR6Adoption === true,
        "workflow index is already bound to the active V5-R6 registration");
      const reviewErrors = validateFreshRunnerReviewV5R6({
        activeRegistration: context.activeRegistration,
        registrationEvidence: context.registrationEvidence,
        freshReview,
      });
      requireCondition(reviewErrors.length === 0, reviewErrors.join("; "));
      const transition = await advance(context, "adopt-r6-index", [
        { kind: ACTIVE_REGISTRATION_KIND_V5_R6, family: "runner-registrations", value: context.activeRegistration },
        { kind: ACTIVE_REVIEW_KIND_V5_R6, family: "runner-reviews", value: freshReview },
      ], freshReview.reviewedAt);
      context.needsR6Adoption = false;
      return success("V5_R6_WORKFLOW_SUPERSEDED_WITH_VERSIONED_FRESH_A11_REVIEW_NO_PROVIDER_ACTIVITY", { transition });
    } catch (error) {
      return blocked("V5_R6_WORKFLOW_ADOPTION_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  function upstreamErrors(context, { requireReview = true } = {}) {
    const errors = [
      ...validateExactRunnerRegistrationEvidenceV5R6(context?.registrationEvidence),
      ...validateActiveRunnerRegistrationV5R6(context?.activeRegistration),
    ];
    if (context?.needsR6Adoption) errors.push("protected workflow has not adopted the exact V5-R6 registration");
    const freshReview = artifact(context, ACTIVE_REVIEW_KIND_V5_R6, { required: false });
    if (requireReview) errors.push(...validateFreshRunnerReviewV5R6({
      activeRegistration: context?.activeRegistration,
      registrationEvidence: context?.registrationEvidence,
      freshReview,
    }));
    const inventory = artifact(context, "SAMPLE_INVENTORY", { required: false });
    const sampleManifest = artifact(context, "SAMPLE_MANIFEST", { required: false });
    const c0RandomAudit = artifact(context, "C0_RANDOM_AUDIT", { required: false });
    const screenEvidence = artifact(context, "SCREEN_EVIDENCE", { required: false });
    errors.push(...validateManifestBoundInventoryV5R5({
      registration: context?.registration,
      inventory,
      sampleManifest,
      c0RandomAudit,
      screenEvidence,
    }));
    return [...new Set(errors)];
  }

  async function verifyFrozenUpstream(context) {
    const errors = upstreamErrors(context);
    return errors.length > 0
      ? blocked("UPSTREAM_FROZEN_EVIDENCE_OR_FRESH_A11_REVIEW_BLOCKED", errors)
      : success("EXACT_V5_R6_REGISTRATION_REVIEW_FRAME_SAMPLE_AND_ZERO_AUTHORITY_VERIFIED");
  }

  async function dryRun(context) {
    const verified = await verifyFrozenUpstream(context);
    return verified.ok
      ? success("OFFLINE_V5_R6_DRY_RUN_VERIFIED_NO_CREDENTIAL_READ_NO_PROVIDER_EVENT_NO_EGRESS")
      : verified;
  }

  function activationContext(context, provider, at) {
    const referenceSeal = provider === "DEEPSEEK_DIRECT"
      ? artifact(context, "REFERENCE_SEAL", { required: false }) : null;
    return {
      registrationEvidence: context.registrationEvidence,
      registration: context.registration,
      activeRegistration: context.activeRegistration,
      freshReview: resolveActiveRunnerReviewV5R6(context.artifacts),
      inventory: artifact(context, "SAMPLE_INVENTORY"),
      sampleManifest: artifact(context, "SAMPLE_MANIFEST"),
      c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT"),
      screenEvidence: artifact(context, "SCREEN_EVIDENCE"),
      authenticatedRouteEvidence: providerArtifact(context, provider, "AUTHENTICATED_ROUTE_EVIDENCE"),
      costPreview: providerArtifact(context, provider, "COST_PREVIEW"),
      ownerActivationGrant: providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT"),
      priceSnapshot: providerArtifact(context, provider, "PRICE_SNAPSHOT"),
      inventoryAuthorization: providerArtifact(context, provider, "INVENTORY_AUTHORIZATION", { required: false }),
      authorization: providerArtifact(context, provider, "AUTHORIZATION"),
      provider,
      at,
      executionRegistration: provider === "DEEPSEEK_DIRECT"
        ? artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION", { required: false }) : null,
      referenceSeal,
      referenceSealValidationReceipt: provider === "DEEPSEEK_DIRECT"
        ? artifact(context, "REFERENCE_SEAL_VALIDATION", { required: false }) : null,
      referenceAttemptChainHash: referenceSeal?.attemptChainHash ?? null,
    };
  }

  async function authorizeCheck(context, provider) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const input = activationContext(context, provider, clockIso(clock));
      const errors = validateProviderActivationV5R6(input);
      return errors.length > 0 ? blocked("AUTHORIZATION_BLOCKED", errors)
        : success("V5_R6_AUTHORIZATION_READY_NO_CREDENTIAL_READ_NO_DISPATCH");
    } catch (error) {
      return blocked("AUTHORIZATION_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function registerAuthenticatedRouteEvidence(context, provider) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const captures = ROUTE_KINDS.map((kind) => providerArtifact(context, provider,
        `ROUTE_CAPTURE:${kind}`));
      const rawSourceArtifacts = ROUTE_KINDS.map((kind) => providerArtifact(context, provider,
        `ROUTE_RAW_SOURCE:${kind}`));
      const common = captures[0];
      const receipt = buildExternallyAttestedRouteEvidenceV5R6({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        provider,
        model: common.model,
        endpoint: common.endpoint,
        projectResidency: common.projectResidency,
        dataRegion: common.dataRegion,
        subjectIdentityHash: common.subjectIdentityHash,
        captures,
        rawSourceArtifacts,
        directBillingConfirmed: true,
        inputUsdPerMillionTokens: providerArtifact(context, provider, "ROUTE_RATE_INPUT").value,
        outputUsdPerMillionTokens: providerArtifact(context, provider, "ROUTE_RATE_OUTPUT").value,
        validatedAt: transitionTime(context, clockIso(clock)),
      });
      const transition = await advance(context, "register-route-evidence", [{
        kind: `${providerPrefix(provider)}_AUTHENTICATED_ROUTE_EVIDENCE_V5_R6`,
        family: "authenticated-route-evidence",
        value: receipt,
      }], receipt.validatedAt);
      return success("V5_R6_EXTERNALLY_ATTESTED_ROUTE_EVIDENCE_REGISTERED_NO_PROVIDER_ACTIVITY", {
        receipt,
        transition,
      });
    } catch (error) {
      return blocked("AUTHENTICATED_ROUTE_EVIDENCE_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function openLedger(context, evidence) {
    return createAtomicExecutionLedgerV5R5({
      trustedRoot: context.trustedRoot,
      ledgerRelativePath: fixedLedgerRelativePath(evidence.authorization.provider,
        evidence.authorization.compatibilityAuthorizationHash),
      activeRegistration: V5_R5_REGISTRATION,
      authorization: evidence.authorization.compatibilityAuthorization,
      inventory: evidence.inventory,
      priceSnapshot: evidence.priceSnapshot,
      clock,
      ownerPid: ledgerOwnerPid,
    });
  }

  function dispatchAudits(context) {
    return [...context.artifacts.entries()]
      .filter(([kind]) => kind.startsWith("STATE_BOUND_DISPATCH_AUDIT_V5_R6:"))
      .map(([, value]) => value);
  }

  async function makeJournal(context, command, startedAt) {
    const commandId = sha256V5R3(canonicalJsonV5R3({
      command,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      priorWorkflowIndexHash: context.index.selfHash,
      startedAt,
    }));
    return createCommandTransitionJournalV5R6({
      commandId,
      activeRunnerRegistrationHash: context.activeRegistration.selfHash,
      startedAt,
      persistSubreceipt: (value) => writeContentAddressed({
        trustedRoot: context.trustedRoot,
        family: "transition-subreceipts",
        value,
      }),
      persistFinalJournal: (value) => writeContentAddressed({
        trustedRoot: context.trustedRoot,
        family: "transition-journals",
        value,
      }),
    });
  }

  async function executeNext(context, provider, mode) {
    if (typeof fetchImplementation !== "function" || typeof credentialReaders[provider] !== "function") {
      return blocked("LIVE_BINDINGS_NOT_INSTALLED", [
        "V5-R6 has no default fetch or credential-reader binding; separate provider authorization remains required",
      ]);
    }
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const at = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, provider, at);
      const activationErrors = validateProviderActivationV5R6(evidence);
      requireCondition(activationErrors.length === 0, activationErrors.join("; "));
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      requireCondition(verified.errors.length === 0, verified.errors.join("; "));
      const stateInput = {
        ...evidence,
        mode,
        ledgerEntries: verified.entries,
        canaryPredicateReceipt: artifact(context, "CANARY_C0_PREDICATE", { required: false }),
        c0ExecutionSet: artifact(context, "DEEPSEEK_C0_EXECUTION_SET", { required: false }),
        canaryGate: artifact(context, "CANARY_GATE", { required: false }),
        adjudicationTrigger: null,
      };
      const dispatchAudit = buildStateBoundDispatchAuditV5R6(stateInput);
      const itemLeaf = itemLeafForHash(context, dispatchAudit.itemHash);
      const requestArtifact = buildProviderRequestArtifactV5R6({
        activeRegistration: context.activeRegistration,
        authorization: evidence.authorization,
        registration: context.registration,
        inventory: evidence.inventory,
        sampleManifest: evidence.sampleManifest,
        itemLeaf,
        role: dispatchAudit.role,
        attemptId: dispatchAudit.attemptId,
        ledgerEntries: verified.entries,
      });
      let run = null;
      let attemptTransition = null;
      const rawResponseStore = await createRawResponseCustodyStoreV5R6({ protectedRoot });
      const transport = createResolvedExactProviderTransportV5R6({
        fetchImplementation,
        credentialReader: credentialReaders[provider],
        clock,
      });
      const journal = await makeJournal(context, provider === "OPENAI_DIRECT"
        ? "label-openai" : mode === "DEEPSEEK_CANARY"
          ? "execute-deepseek-canary" : "execute-deepseek-resume", at);
      const journalResult = await runJournaledTransitionSequenceV5R6({
        journal,
        steps: [
          {
            name: "PROVIDER_REQUEST",
            run: () => advance(context, "provider-request", [{
              kind: `PROVIDER_REQUEST_V5_R6:${requestArtifact.selfHash}`,
              family: "provider-requests",
              value: requestArtifact,
            }]),
          },
          {
            name: "STATE_BOUND_DISPATCH_AUDIT",
            run: () => advance(context, "dispatch-audit", [{
              kind: `STATE_BOUND_DISPATCH_AUDIT_V5_R6:${dispatchAudit.selfHash}`,
              family: "dispatch-audits",
              value: dispatchAudit,
            }]),
          },
          {
            name: "RESOLVED_PROVIDER_ATTEMPT",
            run: async () => {
              run = await runGuardedProviderAttemptV5R6({
                ...stateInput,
                requestArtifact,
                ledger,
                transport,
                rawResponseStore,
                dispatchAuditStore: {
                  append: async (actual) => {
                    requireCondition(canonicalJsonV5R3(actual) === canonicalJsonV5R3(dispatchAudit),
                      "guard supplied an audit different from the pre-persisted R6 audit");
                    return { contentHash: actual.selfHash };
                  },
                },
                attemptReceiptStore: {
                  append: async (value) => {
                    attemptTransition = await advance(context, "resolved-provider-attempt", [{
                      kind: `RESOLVED_PROVIDER_ATTEMPT:${value.selfHash}`,
                      family: "resolved-provider-attempts",
                      value,
                    }], value.completedAt);
                    return { contentHash: value.selfHash };
                  },
                },
                failureClock: () => clockIso(clock),
              });
              requireCondition(attemptTransition, "resolved provider attempt did not commit its workflow transition");
              return attemptTransition;
            },
          },
          {
            name: "COMPATIBILITY_LEDGER_AND_RAW_BINDING_EVIDENCE",
            run: () => {
              requireCondition(run?.providerEventReceipt && run?.completion && run?.rawResponseBindingReceipt,
                "provider attempt lacks completion or raw-response binding evidence");
              const additions = [
                { kind: `PROVIDER_EVENT:${run.providerEventReceipt.selfHash}`, family: "provider-events", value: run.providerEventReceipt },
                { kind: `DISPATCH_COMPLETION:${run.completion.selfHash}`, family: "dispatch-completions", value: run.completion },
                { kind: `RAW_RESPONSE_BINDING:${run.rawResponseBindingReceipt.selfHash}`, family: "raw-response-bindings", value: run.rawResponseBindingReceipt },
              ];
              if (run.roleOutput) additions.push({
                kind: `ROLE_OUTPUT:${run.roleOutput.selfHash}`,
                family: "role-outputs",
                value: run.roleOutput,
              });
              return advance(context, "provider-attempt-evidence", additions);
            },
          },
        ],
        finishedAt: new Date(Date.parse(at) + 10_000).toISOString(),
      });
      if (!journalResult.ok) {
        return blocked("JOURNALED_PROVIDER_STEP_FAILED", [journalResult.error], {
          transitionJournal: journalResult.journal,
        });
      }
      return Object.freeze({
        ...run,
        ok: run.status === "SUCCEEDED",
        naturalQuestionEgressCount: run.providerEventCount,
        referenceLabelCount: 0,
        naturalQuestionResultCount: 0,
        transitionJournal: journalResult.journal,
      });
    } catch (error) {
      return blocked("STATE_BOUND_PROVIDER_STEP_BLOCKED", [error instanceof Error ? error.message : String(error)]);
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
      requireCondition(!artifact(context, "REFERENCE_SEAL", { required: false }),
        "R6 reference labels are already sealed; append-only replacement requires a new registration version");
      const sealedAt = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, "OPENAI_DIRECT", sealedAt);
      const activationErrors = validateProviderActivationV5R6(evidence);
      requireCondition(activationErrors.length === 0, activationErrors.join("; "));
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      requireCondition(verified.errors.length === 0, verified.errors.join("; "));
      const built = buildMachineReferenceSealV5R6({
        ...evidence,
        ledgerEntries: verified.entries,
        sealedAt,
      });
      const validatedAt = new Date(Date.parse(sealedAt) + 1).toISOString();
      const validationReceipt = buildReferenceSealValidationReceiptV5R6({
        ...evidence,
        ledgerEntries: verified.entries,
        seal: built.seal,
        compatibilityReferenceSeal: built.compatibilityReferenceSeal,
        validatedAt,
      });
      const transition = await advance(context, "seal-reference-labels", [
        { kind: "REFERENCE_COMPATIBILITY_SEAL", family: "reference-compatibility-seals",
          value: built.compatibilityReferenceSeal },
        { kind: "REFERENCE_SEAL", family: "reference-seals", value: built.seal },
        { kind: "REFERENCE_SEAL_VALIDATION", family: "reference-seal-validations",
          value: validationReceipt },
      ], validatedAt);
      return success("MACHINE_REFERENCE_LABELS_FROZEN_R6_BOUND_NO_PROVIDER_ACTIVITY", {
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
      requireCondition(!artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION", { required: false }),
        "DeepSeek R6 execution registration is already frozen; replacement requires a new version");
      const registeredAt = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, "DEEPSEEK_DIRECT", registeredAt);
      const executionRegistration = buildDeepSeekExecutionRegistrationV5R6({
        ...evidence,
        registeredAt,
      });
      const transition = await advance(context, "freeze-deepseek-registration", [{
        kind: "DEEPSEEK_EXECUTION_REGISTRATION",
        family: "deepseek-execution-registrations",
        value: executionRegistration,
      }], registeredAt);
      return success("DEEPSEEK_EXECUTION_REGISTRATION_V5_R6_FROZEN_NO_PROVIDER_ACTIVITY", {
        executionRegistration,
        transition,
      });
    } catch (error) {
      return blocked("DEEPSEEK_EXECUTION_REGISTRATION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function materializeTerminalDeepSeekDecision(context, {
    terminalEvidenceCode = "ATTEMPT_CAP_EXHAUSTED",
    observedItemResultHashes = [],
  } = {}) {
    try {
      const frozenErrors = upstreamErrors(context);
      requireCondition(frozenErrors.length === 0, frozenErrors.join("; "));
      const at = transitionTime(context, clockIso(clock));
      const evidence = activationContext(context, "DEEPSEEK_DIRECT", at);
      const executionRegistration = artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION");
      const ledger = await openLedger(context, evidence);
      const verified = await ledger.verify();
      const audits = dispatchAudits(context);
      const predicates = evidence.inventory.items.map((item) => buildTerminalC0PredicateReceiptV5R6({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: executionRegistration.selfHash,
        inventoryHash: evidence.inventory.selfHash,
        item,
        critiqueEvidence: null,
        revisionEvidence: null,
        terminalEvidenceCode,
      }));
      const c0ExecutionSet = buildTerminalC0ExecutionSetV5R6({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        executionRegistrationHash: executionRegistration.selfHash,
        inventory: evidence.inventory,
        predicateReceipts: predicates,
      });
      const expectedCallGraph = evidence.inventory.items.flatMap((item) => [
        ...BASE_ROLES.map((role) => ({ itemHash: item.itemHash, role })),
        ...C0_ROLES.map((role) => ({ itemHash: item.itemHash, role })),
      ]);
      const integrityEvidence = deriveExecutionIntegrityEvidenceV5R6({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        expectedCallGraph,
        completedCalls: completedCallsFromLedger({ entries: verified.entries, dispatchAudits: audits }),
        receiptChainErrors: verified.errors,
        providerTupleErrors: [],
        capErrors: [],
        activeAttemptCount: verified.accounting?.active?.length ?? 0,
        postResultDesignDrift: false,
        labelLeakage: false,
        thresholdFrozenAfterLabelOrResult: false,
        derivedAt: at,
      });
      const scoreReceipt = buildIncompleteExecutionScoreReceiptV5R6({
        activeRunnerRegistrationHash: context.activeRegistration.selfHash,
        inventoryHash: evidence.inventory.selfHash,
        c0ExecutionSetHash: c0ExecutionSet.selfHash,
        integrityEvidence,
        observedItemResultHashes,
        scoredAt: new Date(Date.parse(at) + 1).toISOString(),
      });
      const transition = await advance(context, "score-terminal-incomplete-execution", [
        { kind: "DEEPSEEK_C0_EXECUTION_SET_V5_R6_TERMINAL", family: "c0-execution-sets", value: c0ExecutionSet },
        { kind: "EXECUTION_INTEGRITY_EVIDENCE_V5_R6", family: "execution-integrity", value: integrityEvidence },
        { kind: "AGGREGATE_SCORE_RECEIPT_V5_R6", family: "aggregate-scores", value: scoreReceipt },
      ], scoreReceipt.scoredAt);
      return Object.freeze({
        ...success(scoreReceipt.overallDecision),
        ok: false,
        c0ExecutionSet,
        integrityEvidence,
        scoreReceipt,
        transition,
        naturalQuestionResultCount: observedItemResultHashes.length,
      });
    } catch (error) {
      return blocked("TERMINAL_EXECUTION_DECISION_BLOCKED", [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function score(context) {
    const frozenErrors = upstreamErrors(context);
    if (frozenErrors.length > 0) return blocked("SCORING_UPSTREAM_FROZEN_EVIDENCE_BLOCKED", frozenErrors);
    const existing = artifact(context, "AGGREGATE_SCORE_RECEIPT_V5_R6", { required: false });
    if (existing) {
      const errors = validateAggregateScoreReceiptV5R6(existing);
      return errors.length > 0 ? blocked("SCORING_RECEIPT_INVALID", errors)
        : Object.freeze({ ...success(existing.overallDecision), ok: false, scoreReceipt: existing });
    }
    return materializeTerminalDeepSeekDecision(context);
  }

  async function verify(context) {
    const upstream = await verifyFrozenUpstream(context);
    if (!upstream.ok) return upstream;
    const scoreReceipt = artifact(context, "AGGREGATE_SCORE_RECEIPT_V5_R6", { required: false });
    if (!scoreReceipt) return blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED", [
      "no V5-R6 aggregate score receipt exists; no natural-question execution result is claimed",
    ]);
    const errors = validateAggregateScoreReceiptV5R6(scoreReceipt);
    return errors.length > 0 ? blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED", errors)
      : success("V5_R6_INCOMPLETE_EXECUTION_RECEIPT_RECOMPUTED_WITHOUT_PASS_CLAIM", {
        scoreReceipt,
        naturalQuestionResultCount: scoreReceipt.observedItemResultCount,
      });
  }

  async function exportAggregateReport(context) {
    const frozenErrors = upstreamErrors(context);
    if (frozenErrors.length > 0) return blocked("AGGREGATE_EXPORT_UPSTREAM_FROZEN_EVIDENCE_BLOCKED", frozenErrors);
    return blocked("AGGREGATE_EXPORT_BLOCKED", [
      "fresh independent result review and A18 claim-boundary review are not present",
      "V5-R6 does not authorize publication, PASS, APPROVED, PRODUCTION_READY, or LIMITED_GENERALIZATION_EVIDENCE",
    ]);
  }

  return Object.freeze({
    loadWorkflowContext,
    adoptR6WorkflowIndex,
    verifyFrozenUpstream,
    dryRun,
    authorizeCheck,
    registerAuthenticatedRouteEvidence,
    executeOpenAIResumeStep,
    executeDeepSeekCanaryStep,
    executeDeepSeekResumeStep,
    sealReferenceLabels,
    freezeDeepSeekExecutionRegistration,
    materializeTerminalDeepSeekDecision,
    score,
    verify,
    exportAggregateReport,
  });
}

export const V5_R6_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  workflowIndexPattern: "workflow-indexes-v5-r6/<selfHash>.json",
  providerRequestPattern: "derived-v5-r6/provider-requests/<selfHash>.json",
  ledgerPattern: "execution-ledgers-v5-r6/<provider>/<compatibilityAuthorizationHash>/",
  rawResponsePattern: "raw-provider-custody-v5-r6/<provider>/<selfHash>.json",
  defaultLiveBindingsInstalled: false,
});
