import { pathToFileURL } from "node:url";

import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R11,
} from "./schema-contract-v5-r11.mjs";
import {
  createRunnerRuntimeV5R11,
} from "./runner-v5-r11-runtime.mjs";

const COMMANDS = new Set([
  "register", "freeze-frame", "audit-clusters", "freeze-sample", "register-route-evidence",
  "label-reference", "label-qwen", "seal-reference-labels", "dry-run", "authorize-check",
  "freeze-deepseek-registration", "execute-deepseek", "score", "verify",
  "export-aggregate-report", "audit-attempt-custody", "reconcile-interrupted-attempt",
]);
const PROVIDER_EXECUTION_COMMANDS = new Set(["label-reference", "execute-deepseek"]);

function exactZero(extra = {}) {
  return { providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
    naturalQuestionEgressCount: 0, referenceLabelCount: 0, naturalQuestionResultCount: 0,
    activityAccountingStatus: "EXACT", ...extra };
}

function commandReceipt(command, status, context, output = {}) {
  const accounting = output.activityAccountingStatus ?? "EXACT";
  const maybeCount = (name) => output[name] !== undefined ? output[name]
    : accounting === "UNKNOWN_FAIL_CLOSED" ? null : 0;
  const providerEventCount = maybeCount("providerEventCount");
  const httpRequestCount = maybeCount("httpRequestCount");
  const credentialReadCount = maybeCount("credentialReadCount");
  const naturalQuestionEgressCount = maybeCount("naturalQuestionEgressCount");
  const activityPossible = [providerEventCount, httpRequestCount, credentialReadCount,
    naturalQuestionEgressCount].some((value) => value === null || value > 0);
  const transition = output.transition ?? null;
  return assertClosedSelfHashedArtifactV5R11(sealV5R3Artifact({
    schemaVersion: "NaturalCaRunnerCommandReceiptV10",
    runnerVersion: "V5-R11",
    designId: "MAIS-NATURAL-CA60-V5",
    command,
    status,
    activeRunnerRegistrationHash: context?.activeRegistration?.selfHash ?? null,
    providerCommandInvoked: activityPossible,
    providerEventCount,
    httpRequestCount,
    credentialReadCount,
    naturalQuestionEgressCount,
    referenceLabelCount: output.referenceLabelCount ?? 0,
    naturalQuestionResultCount: output.naturalQuestionResultCount ?? 0,
    activityAccountingStatus: accounting,
    observedDurableTransitionCount: transition?.nextIndex?.selfHash ? 1 : 0,
    lastObservedDurableWorkflowIndexHash: transition?.nextIndex?.selfHash ?? null,
    terminalDecisionReceiptHash: output.terminalReceipt?.selfHash ?? null,
    reconciliationReceiptHash: output.reconciliationReceipt?.selfHash ?? null,
    routeAuthenticityState: output.routeAuthenticityState
      ?? context?.activeRegistration?.routeAuthenticityState ?? null,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: activityPossible
      ? "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY"
      : "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
  }), "NaturalCaRunnerCommandReceiptV10");
}

function outcome(command, exitCode, status, context = null, output = null) {
  return Object.freeze({ exitCode,
    receipt: commandReceipt(command, status, context, output ?? exactZero()) });
}

export function parseExactArgumentsV5R11(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.has(command)) return { error: "USAGE_ERROR_UNKNOWN_COMMAND", command: command ?? "dry-run" };
  const valued = new Set(["--context", "--provider", "--canary", "--recovery"]);
  const flagsOnly = new Set(["--resume"]);
  const values = new Map();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if ((!valued.has(token) && !flagsOnly.has(token)) || values.has(token)) {
      return { error: "USAGE_ERROR_UNKNOWN_OR_DUPLICATE_ARGUMENT", command };
    }
    if (flagsOnly.has(token)) values.set(token, true);
    else {
      const value = rest[index + 1];
      if (typeof value !== "string" || value.startsWith("--")) {
        return { error: "USAGE_ERROR_MISSING_ARGUMENT_VALUE", command };
      }
      values.set(token, value);
      index += 1;
    }
  }
  if (!values.has("--context")) return { error: "WORKFLOW_CONTEXT_REQUIRED", command };
  const providerText = values.get("--provider");
  const provider = providerText === "openai" ? "OPENAI_DIRECT"
    : providerText === "deepseek" ? "DEEPSEEK_DIRECT" : null;
  const noExtra = new Set(["register", "freeze-frame", "audit-clusters", "freeze-sample",
    "label-qwen", "seal-reference-labels", "dry-run", "freeze-deepseek-registration",
    "score", "verify", "export-aggregate-report"]);
  if (noExtra.has(command) && values.size !== 1) return { error: "USAGE_ERROR_COMMAND_ARGUMENTS", command };
  if (["register-route-evidence", "authorize-check", "audit-attempt-custody"].includes(command)
    && (!provider || values.size !== 2)) return { error: "USAGE_ERROR_PROVIDER_REQUIRED", command };
  if (command === "label-reference"
    && !(values.size === 2 && values.get("--resume") === true)) {
    return { error: "USAGE_ERROR_LABEL_REFERENCE_REQUIRES_RESUME", command };
  }
  if (command === "execute-deepseek") {
    const canary = values.get("--canary");
    const resume = values.get("--resume") === true;
    if (values.size !== 2 || !((canary === "1" && !resume) || (canary === undefined && resume))) {
      return { error: "USAGE_ERROR_DEEPSEEK_REQUIRES_EXACT_CANARY_1_OR_RESUME", command };
    }
  }
  if (command === "reconcile-interrupted-attempt"
    && (!provider || typeof values.get("--recovery") !== "string" || values.size !== 3)) {
    return { error: "USAGE_ERROR_RECONCILIATION_REQUIRES_PROVIDER_AND_RECOVERY", command };
  }
  return { command, contextPath: values.get("--context"), provider,
    canary: values.get("--canary"), resume: values.get("--resume") === true,
    recoveryPath: values.get("--recovery") ?? null };
}

export async function runCliV5R11(argv = [], deps = createRunnerRuntimeV5R11()) {
  const parsed = parseExactArgumentsV5R11(argv);
  if (parsed.error) return outcome(parsed.command, 2, parsed.error);
  if (typeof deps.loadWorkflowContext !== "function") {
    return outcome(parsed.command, 3, "WORKFLOW_CONTEXT_LOADER_NOT_BOUND");
  }
  let context;
  try { context = await deps.loadWorkflowContext(parsed.contextPath); }
  catch { return outcome(parsed.command, 3, "WORKFLOW_CONTEXT_BLOCKED"); }
  let engine;
  let args = [context];
  if (parsed.command === "register") engine = "adoptPredecessorWorkflowIndex";
  else if (["freeze-frame", "audit-clusters", "freeze-sample"].includes(parsed.command)) {
    engine = "verifyFrozenUpstream";
  } else if (parsed.command === "dry-run") engine = "dryRun";
  else if (parsed.command === "authorize-check") { engine = "authorizeCheck"; args.push(parsed.provider); }
  else if (parsed.command === "register-route-evidence") {
    engine = "registerTrustedRouteEvidence"; args.push(parsed.provider);
  } else if (parsed.command === "label-reference") engine = "executeOpenAIResumeStep";
  else if (parsed.command === "label-qwen") engine = "rejectLegacyQwenCommand";
  else if (parsed.command === "execute-deepseek") {
    engine = parsed.canary === "1" ? "executeDeepSeekCanaryStep" : "executeDeepSeekResumeStep";
  } else if (parsed.command === "audit-attempt-custody") {
    engine = "auditAttemptCustody"; args.push(parsed.provider);
  } else if (parsed.command === "reconcile-interrupted-attempt") {
    if (typeof deps.loadRecoveryInput !== "function") {
      return outcome(parsed.command, 3, "RECOVERY_INPUT_LOADER_NOT_BOUND", context);
    }
    let recovery;
    try { recovery = await deps.loadRecoveryInput(parsed.recoveryPath, parsed.provider, context); }
    catch { return outcome(parsed.command, 3, "RECOVERY_INPUT_BLOCKED", context); }
    engine = "reconcileInterruptedAttempt";
    args.push(recovery);
  } else if (parsed.command === "score") engine = "score";
  else if (parsed.command === "verify") engine = "verify";
  else if (parsed.command === "export-aggregate-report") engine = "exportAggregateReport";
  else engine = parsed.command === "seal-reference-labels"
    ? "sealReferenceLabels" : "freezeDeepSeekExecutionRegistration";
  if (typeof deps[engine] !== "function") {
    return outcome(parsed.command, 3, "ENGINE_NOT_IMPLEMENTED_OR_NOT_BOUND", context);
  }
  let output;
  try { output = await deps[engine](...args); }
  catch {
    output = PROVIDER_EXECUTION_COMMANDS.has(parsed.command)
      ? { ok: false, status: "ENGINE_FAIL_CLOSED_PROVIDER_ACTIVITY_UNKNOWN",
        providerEventCount: null, httpRequestCount: null, credentialReadCount: null,
        naturalQuestionEgressCount: null, referenceLabelCount: 0, naturalQuestionResultCount: 0,
        activityAccountingStatus: "UNKNOWN_FAIL_CLOSED" }
      : { ok: false, status: "ENGINE_FAIL_CLOSED", ...exactZero() };
  }
  if (!output || typeof output.status !== "string") {
    return outcome(parsed.command, 4, "ENGINE_RESULT_INVALID", context,
      PROVIDER_EXECUTION_COMMANDS.has(parsed.command)
        ? exactZero({ providerEventCount: null, httpRequestCount: null, credentialReadCount: null,
          naturalQuestionEgressCount: null, activityAccountingStatus: "UNKNOWN_FAIL_CLOSED" })
        : exactZero());
  }
  return outcome(parsed.command, output.ok === true ? 0 : 3, output.status, context, output);
}

async function main() {
  const result = await runCliV5R11(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify({ receipt: result.receipt })}\n`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export const V5_R11_CLI_COMMANDS = Object.freeze([...COMMANDS]);
