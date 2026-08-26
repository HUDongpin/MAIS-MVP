import { chmod, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createAtomicExecutionLedgerV5R3 } from "./atomic-execution-ledger-v5-r3.mjs";
import { evaluateProviderAuthorizationV5R3 } from "./authorization-guard-v5-r3.mjs";
import { runDeepSeekEvaluationAttemptV5R3 } from "./deepseek-live-evaluation-runner-v5-r3.mjs";
import { canonicalJsonV5R3, validateSampleExecutionInventoryV1, validateSelfHashV5R3 } from "./execution-integrity-v5-r3.mjs";
import { createLiveProviderTransportV5R3 } from "./live-provider-http-v5-r3.mjs";
import { runOpenAIReferenceAttemptV5R3 } from "./openai-live-reference-runner-v5-r3.mjs";
import { planDeepSeekResumeV5R3, planOpenAIReferenceResumeV5R3 } from "./resume-state-v5-r3.mjs";
import { buildMachineReferenceSealV2 } from "./reference-label-seal-v5-r3.mjs";
import { scoreNaturalCaV5R3 } from "./scorer-v5-r3.mjs";

const MODULE_ROOT = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROTECTED_ROOT = path.resolve(MODULE_ROOT, "../../../.local/mais-natural-ca60-v1");

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export async function loadProtectedWorkflowContextV5R3(contextPath, { protectedRoot = DEFAULT_PROTECTED_ROOT } = {}) {
  if (!path.isAbsolute(contextPath) || !path.isAbsolute(protectedRoot)) throw new TypeError("workflow context and protected root must be absolute");
  const resolvedRoot = path.resolve(protectedRoot);
  const resolvedPath = path.resolve(contextPath);
  if (!inside(resolvedRoot, resolvedPath)) throw new Error("workflow context is outside the protected root");
  const metadata = await stat(resolvedPath);
  if (!metadata.isFile() || (metadata.mode & 0o777) !== 0o600) throw new Error("workflow context must be a regular 0600 file");
  const bytes = await readFile(resolvedPath, "utf8");
  let context;
  try { context = JSON.parse(bytes); } catch { throw new Error("workflow context JSON is malformed"); }
  if (bytes !== canonicalJsonV5R3(context) || context.schemaVersion !== "NaturalCaProtectedWorkflowContextV1" || !validateSelfHashV5R3(context)) {
    throw new Error("workflow context canonical bytes or self-hash are invalid");
  }
  return Object.freeze(context);
}

function resolveLedgerRoot(protectedRoot, relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)) throw new Error("ledger path is not a safe protected relative path");
  const candidate = path.resolve(protectedRoot, relativePath);
  if (!inside(path.resolve(protectedRoot), candidate)) throw new Error("ledger path escapes the protected root");
  return candidate;
}

function guardInput(context, request, now) {
  return {
    registration: context.registration,
    review: context.runnerReview,
    authorization: context.authorization,
    ownerGrant: context.ownerGrant,
    credentialReadinessReceipt: context.credentialReadinessReceipt,
    routeReceipt: context.routeReceipt,
    priceSnapshot: context.priceSnapshot,
    executionRegistration: context.executionRegistration,
    sampleExecutionInventory: context.sampleExecutionInventory,
    request,
    now,
    priorRoleBindings: [],
  };
}

function blocked(status, errors = []) {
  return Object.freeze({ ok: false, status, providerEventCount: 0, naturalQuestionResultCount: 0, errors: Object.freeze(errors) });
}

export function createFilesystemCliDependenciesV5R3({
  protectedRoot = DEFAULT_PROTECTED_ROOT,
  env = process.env,
  fetchImpl = globalThis.fetch,
  clock = () => new Date().toISOString(),
} = {}) {
  async function loadWorkflowContext(contextPath) {
    return loadProtectedWorkflowContextV5R3(contextPath, { protectedRoot });
  }

  async function authorizeCheck(context) {
    const state = context.provider === "DEEPSEEK_DIRECT" ? context.deepSeekState : context.openAIState;
    const plan = context.provider === "DEEPSEEK_DIRECT"
      ? planDeepSeekResumeV5R3({ item: state?.item, attempts: state?.attempts, c0Trigger: state?.c0Trigger })
      : planOpenAIReferenceResumeV5R3({ item: state?.item, attempts: state?.attempts, adjudicationTrigger: state?.adjudicationTrigger });
    const request = plan.valid && plan.nextRole ? context.requests?.[plan.nextRole] : null;
    if (!request) return blocked("AUTHORIZATION_BLOCKED", ["no dependency-ready frozen request exists"]);
    const evaluated = evaluateProviderAuthorizationV5R3(guardInput(context, request, clock()));
    return evaluated.dispatchAllowed
      ? Object.freeze({ ok: true, status: "AUTHORIZATION_READY_NO_DISPATCH", providerEventCount: 0, errors: Object.freeze([]) })
      : blocked("AUTHORIZATION_BLOCKED", evaluated.errors);
  }

  async function executeOpenAIResumeStep(context) {
    const state = context.openAIState;
    const plan = planOpenAIReferenceResumeV5R3({ item: state?.item, attempts: state?.attempts, adjudicationTrigger: state?.adjudicationTrigger });
    if (!plan.valid) return blocked("RESUME_STATE_BLOCKED", plan.errors);
    if (plan.complete) return blocked("REFERENCE_ITEM_ALREADY_COMPLETE");
    const request = context.requests?.[plan.nextRole];
    if (!request) return blocked("REQUEST_NOT_FROZEN", [`request for ${plan.nextRole} is absent`]);
    const now = clock();
    const staticGuard = evaluateProviderAuthorizationV5R3(guardInput(context, request, now));
    if (!staticGuard.dispatchAllowed) return blocked("AUTHORIZATION_BLOCKED", staticGuard.errors);
    const ledger = await createAtomicExecutionLedgerV5R3({
      root: resolveLedgerRoot(protectedRoot, context.ledgerRelativePath),
      authorization: context.authorization,
      priceSnapshot: context.priceSnapshot,
    });
    const transport = createLiveProviderTransportV5R3({
      fetchImpl,
      credentialReader: async () => ({ apiKey: env.OPENAI_API_KEY, projectId: env.OPENAI_PROJECT_ID }),
    });
    return runOpenAIReferenceAttemptV5R3({
      ...guardInput(context, request, now),
      completedAt: clock(),
      ledger,
      transport,
      priorArtifacts: context.priorArtifacts ?? {},
    });
  }

  async function executeDeepSeekResumeStep(context) {
    const state = context.deepSeekState;
    const plan = planDeepSeekResumeV5R3({ item: state?.item, attempts: state?.attempts, c0Trigger: state?.c0Trigger });
    if (!plan.valid) return blocked("RESUME_STATE_BLOCKED", plan.errors);
    if (plan.complete) return blocked("DEEPSEEK_ITEM_ALREADY_COMPLETE");
    const request = context.requests?.[plan.nextRole];
    if (!request) return blocked("REQUEST_NOT_FROZEN", [`request for ${plan.nextRole} is absent`]);
    const now = clock();
    const staticGuard = evaluateProviderAuthorizationV5R3(guardInput(context, request, now));
    if (!staticGuard.dispatchAllowed) return blocked("AUTHORIZATION_BLOCKED", staticGuard.errors);
    const ledger = await createAtomicExecutionLedgerV5R3({
      root: resolveLedgerRoot(protectedRoot, context.ledgerRelativePath),
      authorization: context.authorization,
      priceSnapshot: context.priceSnapshot,
    });
    const transport = createLiveProviderTransportV5R3({
      fetchImpl,
      credentialReader: async () => ({ apiKey: env.DEEPSEEK_API_KEY }),
    });
    return runDeepSeekEvaluationAttemptV5R3({
      ...guardInput(context, request, now),
      completedAt: clock(),
      ledger,
      transport,
      priorArtifacts: context.priorArtifacts ?? {},
    });
  }

  async function verifyFrozenUpstream(context) {
    const errors = [];
    if (!validateSelfHashV5R3(context.registration)
      || context.registration?.schemaVersion !== "NaturalCaExecutionRunnerRegistrationV2"
      || context.registration?.runnerVersion !== "V5-R3") errors.push("V5-R3 execution-runner registration is absent or invalid");
    errors.push(...validateSampleExecutionInventoryV1({
      registration: context.registration,
      inventory: context.sampleExecutionInventory,
    }));
    if (context.registration?.decisionCeiling !== "INCONCLUSIVE_MACHINE_REFERENCE") errors.push("decision ceiling drifted from INCONCLUSIVE_MACHINE_REFERENCE");
    if (context.registration?.authorizationState?.providerExecutionAuthorized !== false
      || context.registration?.authorizationState?.credentialReadAuthorized !== false
      || context.registration?.authorizationState?.naturalQuestionEgressAuthorized !== false) {
      errors.push("runner registration zero-authority boundary is invalid");
    }
    return errors.length === 0
      ? Object.freeze({ ok: true, status: "UPSTREAM_V5_FRAME_SAMPLE_AND_RUNNER_REGISTRATION_VERIFIED", providerEventCount: 0, naturalQuestionResultCount: 0 })
      : blocked("UPSTREAM_FROZEN_EVIDENCE_BLOCKED", errors);
  }

  async function verify(context) {
    if (!validateSelfHashV5R3(context)) return blocked("CONTEXT_INTEGRITY_FAILED", ["protected workflow context self-hash is invalid"]);
    const upstream = await verifyFrozenUpstream(context);
    return upstream.ok === true
      ? Object.freeze({ ...upstream, status: "CONTEXT_AND_FROZEN_UPSTREAM_INTEGRITY_VERIFIED" })
      : upstream;
  }

  async function dryRun(context) {
    const upstream = await verifyFrozenUpstream(context);
    if (upstream.ok !== true) return upstream;
    if (context.registration.authorizationState.providerEventCount !== 0
      || context.registration.authorizationState.credentialReadCount !== 0
      || context.registration.authorizationState.naturalQuestionEgressCount !== 0) {
      return blocked("OFFLINE_DRY_RUN_AUTHORITY_BOUNDARY_FAILED", ["registration records nonzero external activity"]);
    }
    return Object.freeze({
      ok: true,
      status: "OFFLINE_DRY_RUN_VERIFIED_NO_PROVIDER_EXECUTION",
      providerEventCount: 0,
      httpRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionResultCount: 0,
    });
  }

  async function score(context) {
    const scoring = context.scoringInput;
    const inventoryByHash = new Map((context.sampleExecutionInventory?.items ?? []).map((item) => [item.itemHash, item]));
    const upstreamBound = validateSelfHashV5R3(scoring)
      && validateSelfHashV5R3(context.referenceSeal)
      && context.referenceSeal?.schemaVersion === "MachineReferenceSealV2"
      && validateSelfHashV5R3(context.executionRegistration)
      && context.executionRegistration?.schemaVersion === "DeepSeekExecutionRegistrationV1"
      && scoring?.registrationHash === context.registration?.selfHash
      && scoring?.referenceSealHash === context.referenceSeal?.selfHash
      && scoring?.executionRegistrationHash === context.executionRegistration?.selfHash
      && context.executionRegistration?.referenceSealHash === context.referenceSeal?.selfHash
      && scoring?.expectedItemCount === 60
      && Array.isArray(scoring?.items) && scoring.items.length >= 57
      && scoring.items.every((item) => inventoryByHash.get(item.itemHash)?.clusterId === item.clusterId);
    if (!upstreamBound) return blocked("SCORING_INPUT_BLOCKED", ["scoring input does not bind the frozen inventory, reference seal, and DeepSeek execution registration"]);
    const scoreReceipt = scoreNaturalCaV5R3(context.scoringInput);
    const integrityValid = !["INVALID_FOR_GENERALIZATION", "EXECUTION_INTEGRITY_FAILED"].includes(scoreReceipt.overallDecision);
    return Object.freeze({
      ok: integrityValid,
      status: scoreReceipt.overallDecision,
      providerEventCount: 0,
      naturalQuestionResultCount: scoreReceipt.completeItemCount,
      scoreReceipt,
    });
  }

  async function exportAggregateReport(context) {
    if (context.independentReview?.decision !== "CONCURRED" || !validateSelfHashV5R3(context.aggregateReport)) return blocked("AGGREGATE_EXPORT_BLOCKED");
    return Object.freeze({ ok: true, status: "AGGREGATE_EXPORT_READY", providerEventCount: 0, naturalQuestionResultCount: context.aggregateReport.naturalQuestionResultCount ?? 0 });
  }

  async function sealReferenceLabels(context) {
    try {
      const referenceSeal = buildMachineReferenceSealV2({
        registration: context.registration,
        authorization: context.authorization,
        inventory: context.sampleExecutionInventory,
        ledgerEntries: context.referenceLedgerEntries,
        itemBundles: context.referenceItemBundles,
        sealedAt: context.referenceSealAt,
      });
      return Object.freeze({
        ok: true,
        status: "REFERENCE_LABELS_SEALED_MACHINE_REFERENCE",
        providerEventCount: 0,
        naturalQuestionResultCount: 0,
        referenceLabelCount: referenceSeal.itemCount,
        referenceSeal,
      });
    } catch (error) {
      return blocked("REFERENCE_LABEL_SEAL_BLOCKED", [error instanceof Error ? error.message : "reference label seal failed"]);
    }
  }

  return Object.freeze({
    loadWorkflowContext,
    verifyFrozenUpstream,
    dryRun,
    authorizeCheck,
    executeOpenAIResumeStep,
    executeDeepSeekResumeStep,
    verify,
    score,
    exportAggregateReport,
    sealReferenceLabels,
  });
}

export const V5_R3_PROTECTED_ROOT = DEFAULT_PROTECTED_ROOT;
