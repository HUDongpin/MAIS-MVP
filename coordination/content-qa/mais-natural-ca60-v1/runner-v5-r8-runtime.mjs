import path from "node:path";
import { fileURLToPath } from "node:url";

import DESIGN from "../../research/mais-natural-ca60-v1/versions/design-v5/design-registration.json" with { type: "json" };

import {
  validateExactRunnerRegistrationEvidenceV5R8,
} from "./execution-evidence-v5-r8.mjs";
import {
  validateFreshRunnerReviewV5R8,
} from "./review-evidence-v5-r8.mjs";
import {
  validateProviderActivationV5R8,
} from "./activation-guard-v5-r8.mjs";
import {
  validateTrustedProviderEvidenceEnvelopeV5R8,
} from "./trusted-provider-evidence-v5-r8.mjs";
import {
  applyInterruptedAttemptReconciliationV5R8,
  validateResumeCustodyV5R8,
} from "./attempt-recovery-v5-r8.mjs";
import {
  buildTerminalMissingItemResultsV5R8,
  scoreNaturalCaV5R8,
  verifyNaturalCaScoreFromRawEvidenceV5R8,
} from "./scorer-verifier-v5-r8.mjs";
import {
  buildTerminalExecutionDecisionReceiptV5R8,
  verifyTerminalExecutionDecisionReceiptV5R8,
} from "./statistical-kernel-v5-r8.mjs";
import {
  ACTIVE_REGISTRATION_KIND_V5_R8,
  ACTIVE_REVIEW_KIND_V5_R8,
  advanceProtectedWorkflowIndexV5R8,
  loadProtectedWorkflowIndexV5R8,
} from "./workflow-index-v5-r8.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_ROOT, "../../..");
const DEFAULT_PROTECTED_ROOT = path.resolve(DEFAULT_REPO_ROOT, ".local/mais-natural-ca60-v1");
const PROVIDERS = new Set(["OPENAI_DIRECT", "DEEPSEEK_DIRECT"]);

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function clockIso(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  requireCondition(Number.isFinite(date.getTime()), "R8 runner clock is invalid");
  return date.toISOString();
}

function later(value, milliseconds = 1) {
  return new Date(Date.parse(value) + milliseconds).toISOString();
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

function artifact(context, kind, { required = true } = {}) {
  const value = context?.artifacts?.get?.(kind);
  if (required && value === undefined) throw new Error(`protected R8 workflow artifact ${kind} is absent`);
  return value;
}

function values(context) {
  return [...(context?.artifacts?.values?.() ?? [])];
}

function valuesBySchema(context, schemaVersion) {
  return values(context).filter((value) => value?.schemaVersion === schemaVersion);
}

function providerPrefix(provider) {
  requireCondition(PROVIDERS.has(provider), "R8 provider is invalid");
  return provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK";
}

function providerArtifact(context, provider, suffix, options) {
  return artifact(context, `${providerPrefix(provider)}_${suffix}_V5_R8`, options);
}

function reviewInput(context) {
  return {
    activeRegistration: context.activeRegistration,
    registrationEvidence: context.registrationEvidence,
    freshReview: context.freshReview,
    processArtifacts: context.processArtifacts,
    reviewCustody: context.reviewCustody,
  };
}

function upstreamErrors(context) {
  return [...validateExactRunnerRegistrationEvidenceV5R8(context?.registrationEvidence),
    ...validateFreshRunnerReviewV5R8(reviewInput(context))];
}

function defaultAttemptCustody(context, provider) {
  return context?.attemptCustodyByProvider?.[provider] ?? {
    ledgerEntries: [],
    attemptCommitIntents: [],
    resolvedAttemptReceipts: [],
  };
}

function activationInput(context, provider, at) {
  const routeEvidenceEnvelope = providerArtifact(context, provider, "TRUSTED_ROUTE_ENVELOPE",
    { required: false });
  return {
    ...reviewInput(context),
    at,
    registration: context.compatibilityRegistration
      ?? artifact(context, "COMPATIBILITY_RUNNER_REGISTRATION", { required: false }),
    inventory: artifact(context, "SAMPLE_EXECUTION_INVENTORY_V2", { required: false }),
    sampleManifest: artifact(context, "SAMPLE_MANIFEST", { required: false }),
    c0RandomAudit: artifact(context, "C0_RANDOM_AUDIT", { required: false }),
    screenEvidence: context.screenEvidence ?? artifact(context, "SCREEN_EVIDENCE", { required: false }),
    routeEvidenceEnvelope,
    routeEvidenceArtifacts: valuesBySchema(context, "TrustedProviderEvidenceSourceV1")
      .filter((value) => value.provider === provider),
    authorization: providerArtifact(context, provider, "AUTHORIZATION", { required: false }),
    ownerActivationGrant: providerArtifact(context, provider, "OWNER_ACTIVATION_GRANT",
      { required: false }),
    costPreview: providerArtifact(context, provider, "COST_PREVIEW", { required: false }),
    priceSnapshot: providerArtifact(context, provider, "PRICE_SNAPSHOT", { required: false }),
    attemptCustody: defaultAttemptCustody(context, provider),
    referenceSeal: artifact(context, "REFERENCE_SEAL_V5_R8", { required: false }),
    compatibilityReferenceSeal: artifact(context, "REFERENCE_COMPATIBILITY_SEAL_V5_R8",
      { required: false }),
    referenceSealValidationReceipt: artifact(context, "REFERENCE_SEAL_VALIDATION_V5_R8",
      { required: false }),
    referenceSealContext: context.referenceSealContext,
    executionRegistration: artifact(context, "DEEPSEEK_EXECUTION_REGISTRATION_V5_R8",
      { required: false }),
  };
}

async function persistResult(advanceWorkflow, context, command, entries, at) {
  requireCondition(Array.isArray(entries) && entries.length > 0,
    "R8 result persistence requires at least one sealed artifact");
  return advanceWorkflow({ context, command, appendedArtifacts: entries, committedAt: at });
}

function statisticalTerminalInput(base, itemResults, causeCodes, scoredAt) {
  return {
    activeRunnerRegistrationHash: base.activeRegistration.selfHash,
    sampleExecutionInventoryHash: base.inventory.selfHash,
    sampleManifestHash: base.activeRegistration.sampleManifestHash,
    referenceSealHash: base.referenceSeal.selfHash,
    executionRegistrationHash: base.executionRegistration.selfHash,
    deepSeekAuthorizationHash: base.deepSeekAuthorization.selfHash,
    c0ExecutionSetHash: base.c0ExecutionSet.selfHash,
    itemResults,
    thresholdsFrozenAt: DESIGN.thresholdsFrozenAt,
    firstReferenceAttemptAt: base.firstReferenceAttemptAt ?? scoredAt,
    firstEvaluationAttemptAt: base.firstEvaluationAttemptAt ?? scoredAt,
    receiptChainValid: base.receiptChainValid ?? false,
    providerTupleValid: base.providerTupleValid ?? false,
    capsValid: base.capsValid ?? false,
    terminalProviderFailure: base.terminalProviderFailure ?? true,
    materialDeviation: base.materialDeviation ?? false,
    postResultDesignDrift: base.postResultDesignDrift ?? false,
    labelLeakage: base.labelLeakage ?? false,
    unauthorizedProviderCall: base.unauthorizedProviderCall ?? false,
    terminalCauseCodes: causeCodes,
    scoredAt,
  };
}

export function createRunnerRuntimeV5R8({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  repoRoot = DEFAULT_REPO_ROOT,
  clock = () => new Date(),
  advanceWorkflow = advanceProtectedWorkflowIndexV5R8,
  providerAttemptExecutor = null,
  providerAttemptPlanner = null,
  scoringInputBuilder = async (context) => context.scoringInput,
  terminalEvidenceBuilder = async (context) => context.terminalEvidenceBase,
  registrationEvidenceLoader,
  freshReviewLoader,
} = {}) {
  async function loadWorkflowContext(indexPath) {
    requireCondition(path.isAbsolute(indexPath ?? ""),
      "R8 workflow index path must be absolute");
    return loadProtectedWorkflowIndexV5R8(indexPath, {
      protectedRoot,
      repoRoot,
      registrationEvidenceLoader,
      freshReviewLoader,
    });
  }

  async function adoptR8WorkflowIndex(context) {
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      if (!context.needsR8Adoption) {
        return success("V5_R8_WORKFLOW_INDEX_ALREADY_ACTIVE_NO_PROVIDER_ACTIVITY");
      }
      const committedAt = transitionTime(context, clockIso(clock));
      const process = context.processArtifacts;
      const transition = await persistResult(advanceWorkflow, context, "register-v5-r8", [
        { kind: ACTIVE_REGISTRATION_KIND_V5_R8, family: "runner-registrations",
          value: context.activeRegistration },
        { kind: ACTIVE_REVIEW_KIND_V5_R8, family: "runner-reviews", value: context.freshReview },
        { kind: `A11_STATIC_IMPORT_GRAPH_V5_R8:${process.staticImportGraphReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.staticImportGraphReceipt },
        { kind: `A11_FORBIDDEN_PATH_SCAN_V5_R8:${process.forbiddenPrimaryScorerPathScanReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.forbiddenPrimaryScorerPathScanReceipt },
        { kind: `A11_COMMAND_RUNTIME_V5_R8:${process.commandRuntimeReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.commandRuntimeReceipt },
        { kind: `A11_SOURCE_ENUMERATION_V5_R8:${process.independentSourceEnumerationReceipt.selfHash}`,
          family: "runner-review-process-evidence", value: process.independentSourceEnumerationReceipt },
      ], committedAt);
      context.needsR8Adoption = false;
      return success("V5_R8_WORKFLOW_INDEX_ADOPTED_NO_PROVIDER_ACTIVITY", { transition });
    } catch (error) {
      return blocked("V5_R8_WORKFLOW_INDEX_ADOPTION_BLOCKED",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function verifyFrozenUpstream(context) {
    const errors = upstreamErrors(context);
    return errors.length > 0 ? blocked("FROZEN_UPSTREAM_VERIFICATION_BLOCKED", errors)
      : success("V5_R8_FROZEN_FRAME_SAMPLE_METHOD_AND_CLAIM_CEILING_VERIFIED_NO_PROVIDER_ACTIVITY");
  }

  async function dryRun(context) {
    const errors = upstreamErrors(context);
    if (errors.length > 0) return blocked("V5_R8_DRY_RUN_BLOCKED", errors);
    const noAnchor = context.activeRegistration.trustedProviderEvidenceAnchors.length === 0;
    return success(noAnchor
      ? "V5_R8_OFFLINE_DRY_RUN_READY_ROUTE_AUTHENTICITY_BLOCKED_NO_PROVIDER_ACTIVITY"
      : "V5_R8_OFFLINE_DRY_RUN_READY_NO_PROVIDER_ACTIVITY", {
      routeAuthenticityState: context.activeRegistration.routeAuthenticityState,
    });
  }

  async function authorizeCheck(context, provider) {
    const at = transitionTime(context, clockIso(clock));
    const input = activationInput(context, provider, at);
    const errors = validateProviderActivationV5R8(input);
    return errors.length > 0 ? blocked("PROVIDER_ACTIVATION_BLOCKED_ZERO_HTTP", errors, {
      provider,
      routeAuthenticityState: context.activeRegistration.routeAuthenticityState,
    }) : success("PROVIDER_ACTIVATION_VERIFIED_NO_PROVIDER_ACTIVITY", { provider });
  }

  async function registerTrustedRouteEvidence(context, provider) {
    try {
      const at = transitionTime(context, clockIso(clock));
      const envelope = providerArtifact(context, provider, "TRUSTED_ROUTE_ENVELOPE");
      const evidenceArtifacts = valuesBySchema(context, "TrustedProviderEvidenceSourceV1")
        .filter((value) => value.provider === provider);
      const errors = validateTrustedProviderEvidenceEnvelopeV5R8({ envelope,
        activeRegistration: context.activeRegistration, evidenceArtifacts, at });
      requireCondition(errors.length === 0, errors.join("; "));
      const transition = await persistResult(advanceWorkflow, context, "register-route-evidence", [
        { kind: `${providerPrefix(provider)}_TRUSTED_ROUTE_ENVELOPE_V5_R8`,
          family: "trusted-route-evidence", value: envelope },
        ...evidenceArtifacts.map((value) => ({
          kind: `${providerPrefix(provider)}_TRUSTED_ROUTE_SOURCE_V5_R8:${value.selfHash}`,
          family: "trusted-route-evidence-sources", value,
        })),
      ], at);
      return success("TRUST_ANCHORED_PROVIDER_ROUTE_EVIDENCE_REGISTERED_NO_PROVIDER_ACTIVITY",
        { provider, transition });
    } catch (error) {
      return blocked("ROUTE_AUTHENTICITY_BLOCKED_ZERO_HTTP",
        [error instanceof Error ? error.message : String(error)], { provider });
    }
  }

  async function executeProviderStep(context, provider, executionMode) {
    const at = transitionTime(context, clockIso(clock));
    const activation = activationInput(context, provider, at);
    const errors = validateProviderActivationV5R8(activation);
    if (errors.length > 0) return blocked("PROVIDER_EXECUTION_BLOCKED_ZERO_HTTP", errors, { provider });
    if (providerAttemptExecutor?.kind !== "V5_R8_NATIVE_EXACT_PROVIDER_ATTEMPT_EXECUTOR"
      || typeof providerAttemptExecutor.execute !== "function"
      || typeof providerAttemptPlanner !== "function") {
      return blocked("NATIVE_PROVIDER_ATTEMPT_EXECUTOR_NOT_BOUND_ZERO_HTTP",
        ["R8 live attempt executor is not installed"], { provider });
    }
    const custodyErrors = validateResumeCustodyV5R8(defaultAttemptCustody(context, provider));
    if (custodyErrors.length > 0) {
      return blocked("INTERRUPTED_ATTEMPT_RECONCILIATION_REQUIRED_ZERO_HTTP", custodyErrors,
        { provider });
    }
    try {
      const planned = await providerAttemptPlanner({ context, provider, executionMode, at, activation });
      const result = await providerAttemptExecutor.execute({ ...planned, ...activation });
      return Object.freeze({ ok: result.status === "SUCCEEDED", status: result.status,
        providerEventCount: result.providerEventCount,
        httpRequestCount: result.httpRequestCount,
        credentialReadCount: result.credentialReadCount,
        naturalQuestionEgressCount: result.naturalQuestionEgressCount,
        activityAccountingStatus: "EXACT",
        referenceLabelCount: provider === "OPENAI_DIRECT" && result.status === "SUCCEEDED" ? 1 : 0,
        naturalQuestionResultCount: provider === "DEEPSEEK_DIRECT" && result.status === "SUCCEEDED" ? 1 : 0,
        errors: Object.freeze([]), attemptResult: result });
    } catch (error) {
      const activity = error?.activity;
      return blocked("PROVIDER_ATTEMPT_FAILED_CLOSED", [error instanceof Error ? error.message : String(error)], {
        provider,
        providerEventCount: activity?.providerEventCount ?? null,
        httpRequestCount: activity?.httpRequestCount ?? null,
        credentialReadCount: activity?.credentialReadCount ?? null,
        naturalQuestionEgressCount: activity?.naturalQuestionEgressCount ?? null,
        activityAccountingStatus: activity ? "EXACT" : "UNKNOWN_FAIL_CLOSED",
      });
    }
  }

  async function auditAttemptCustody(context, provider) {
    const errors = validateResumeCustodyV5R8(defaultAttemptCustody(context, provider));
    return errors.length > 0 ? blocked("ATTEMPT_CUSTODY_RECONCILIATION_REQUIRED", errors, { provider })
      : success("ATTEMPT_CUSTODY_FULLY_RECONCILED_NO_PROVIDER_ACTIVITY", { provider });
  }

  async function reconcileInterruptedAttempt(context, recoveryInput) {
    try {
      const result = await applyInterruptedAttemptReconciliationV5R8(recoveryInput);
      return success(result.resumeAllowedAfterPlannedAppend
        ? "INTERRUPTED_ATTEMPT_RECONCILIATION_APPLIED_ZERO_HTTP"
        : "INTERRUPTED_ATTEMPT_DISPOSITION_UNCERTAIN_RESUME_BLOCKED_ZERO_HTTP", {
        reconciliationReceipt: result.receipt,
        resumeAllowedAfterPlannedAppend: result.resumeAllowedAfterPlannedAppend,
      });
    } catch (error) {
      return blocked("INTERRUPTED_ATTEMPT_RECONCILIATION_BLOCKED_ZERO_HTTP",
        [error instanceof Error ? error.message : String(error)]);
    }
  }

  async function persistScoringBundle(context, built, terminalReceipt, committedAt) {
    const entries = [
      ...built.itemResults.map((value) => ({ kind: `ITEM_RESULT_V5_R8:${value.itemHash}`,
        family: "item-results", value })),
      ...built.completedItemMarkers.map((value) => ({
        kind: `COMPLETED_ITEM_MARKER_V5_R8:${value.itemHash}`,
        family: "completed-item-markers", value })),
      { kind: `OBSERVED_LEDGER_V5_R8:${built.observedLedger.selfHash}`,
        family: "observed-ledgers", value: built.observedLedger },
      { kind: `COUNTERFACTUAL_LEDGER_V5_R8:${built.counterfactualLedger.selfHash}`,
        family: "counterfactual-ledgers", value: built.counterfactualLedger },
      { kind: `METRIC_INPUT_LEDGER_V5_R8:${built.metricInputLedger.selfHash}`,
        family: "metric-input-ledgers", value: built.metricInputLedger },
      { kind: `FINAL_EVALUATION_V5_R8:${built.finalReceipt.selfHash}`,
        family: "final-evaluations", value: built.finalReceipt },
      { kind: `AGGREGATE_SCORE_V5_R8:${built.scoreReceipt.selfHash}`,
        family: "aggregate-scores", value: built.scoreReceipt },
    ];
    if (terminalReceipt) entries.push({ kind: `TERMINAL_DECISION_V5_R8:${terminalReceipt.selfHash}`,
      family: "terminal-decisions", value: terminalReceipt });
    return persistResult(advanceWorkflow, context, "score-v5-r8", entries, committedAt);
  }

  async function score(context) {
    const scoredAt = transitionTime(context, clockIso(clock));
    try {
      const errors = upstreamErrors(context);
      requireCondition(errors.length === 0, errors.join("; "));
      const input = await scoringInputBuilder(context, scoredAt);
      requireCondition(input && typeof input === "object", "R8 raw scoring input is unavailable");
      const built = scoreNaturalCaV5R8({ ...input, scoredAt: later(scoredAt, 1) });
      const terminalReceipt = built.finalReceipt.overallDecision === "EXECUTION_INTEGRITY_FAILED"
        ? buildTerminalExecutionDecisionReceiptV5R8({ ...built.statisticalInput,
          terminalCauseCodes: built.executionIntegrity.causeCodes }) : null;
      const transition = await persistScoringBundle(context, built, terminalReceipt,
        later(scoredAt, 2));
      return success(built.scoreReceipt.overallDecision, { ...built, terminalReceipt, transition,
        naturalQuestionResultCount: built.observedLedger.accounting.completeReceiptItemCount });
    } catch (error) {
      try {
        const base = await terminalEvidenceBuilder(context, scoredAt);
        requireCondition(base && typeof base === "object",
          "R8 terminal evidence base is unavailable after scoring failure");
        const causeCodes = ["RAW_ATTEMPT_GRAPH_OR_SCORING_CUSTODY_UNRECONSTRUCTABLE"];
        const itemResults = buildTerminalMissingItemResultsV5R8({ ...base, reasonCodes: causeCodes });
        const terminalInput = statisticalTerminalInput(base, itemResults, causeCodes, later(scoredAt, 1));
        const terminalReceipt = buildTerminalExecutionDecisionReceiptV5R8(terminalInput);
        const transition = await persistResult(advanceWorkflow, context, "score-terminal-v5-r8", [
          ...itemResults.map((value) => ({ kind: `ITEM_RESULT_V5_R8:${value.itemHash}`,
            family: "item-results", value })),
          { kind: `TERMINAL_DECISION_V5_R8:${terminalReceipt.selfHash}`,
            family: "terminal-decisions", value: terminalReceipt },
        ], later(scoredAt, 2));
        return blocked(terminalReceipt.overallDecision,
          [error instanceof Error ? error.message : String(error)], {
            terminalReceipt, transition, naturalQuestionResultCount: 0,
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
      const scoreReceipt = valuesBySchema(context, "NaturalCaAggregateScoreReceiptV6").at(-1);
      if (scoreReceipt) {
        const input = await scoringInputBuilder(context, scoreReceipt.scoredAt);
        const verifyErrors = verifyNaturalCaScoreFromRawEvidenceV5R8({ ...input, scoreReceipt });
        return verifyErrors.length > 0
          ? blocked("EXECUTION_RESULT_VERIFICATION_BLOCKED", verifyErrors)
          : success("V5_R8_RAW_EVIDENCE_SCORE_RECOMPUTED_NO_PASS_CLAIM", { scoreReceipt,
            naturalQuestionResultCount: scoreReceipt.completeItemCount });
      }
      const terminalReceipt = valuesBySchema(context, "TerminalExecutionDecisionReceiptV1").at(-1);
      requireCondition(terminalReceipt, "no R8 aggregate or terminal execution receipt exists");
      const base = await terminalEvidenceBuilder(context, terminalReceipt.derivedAt);
      const causeCodes = terminalReceipt.terminalCauseCodes;
      const itemResults = buildTerminalMissingItemResultsV5R8({ ...base, reasonCodes: causeCodes });
      const terminalInput = statisticalTerminalInput(base, itemResults, causeCodes,
        terminalReceipt.derivedAt);
      const verifyErrors = verifyTerminalExecutionDecisionReceiptV5R8({
        ...terminalInput, receipt: terminalReceipt,
      });
      return verifyErrors.length > 0
        ? blocked("TERMINAL_EXECUTION_RESULT_VERIFICATION_BLOCKED", verifyErrors)
        : success("V5_R8_TERMINAL_DECISION_RECOMPUTED_NO_METRIC_INFERENCE_NO_PASS_CLAIM",
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
    adoptR8WorkflowIndex,
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
    reconcileInterruptedAttempt,
    score,
    verify,
    exportAggregateReport,
    sealReferenceLabels: async () => blocked("REFERENCE_LABEL_SEAL_REQUIRES_COMPLETED_OPENAI_GRAPH",
      ["no complete R8 OpenAI reference attempt graph is registered"]),
    freezeDeepSeekExecutionRegistration: async () => blocked(
      "DEEPSEEK_EXECUTION_REGISTRATION_REQUIRES_SEALED_REFERENCE_AND_LIVE_AUTHORITY",
      ["reference seal or live DeepSeek authority is absent"]),
  });
}

export const V5_R8_RUNTIME_PATHS = Object.freeze({
  repoRoot: DEFAULT_REPO_ROOT,
  protectedRoot: DEFAULT_PROTECTED_ROOT,
  workflowIndexPattern: "workflow-indexes-v5-r8/<selfHash>.json",
  derivedArtifactRoot: "derived-v5-r8",
  terminalDecisions: "terminal-decisions",
  itemResults: "item-results",
  completedItemMarkers: "completed-item-markers",
});
