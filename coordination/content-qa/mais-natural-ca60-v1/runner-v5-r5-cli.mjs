import { pathToFileURL } from "node:url";

import {
  sealV5R3Artifact,
} from "./execution-integrity-v5-r3.mjs";
import {
  assertClosedSelfHashedArtifactV5R5,
} from "./schema-contract-v5-r5.mjs";
import {
  createRunnerRuntimeV5R5,
} from "./runner-v5-r5-runtime.mjs";

const COMMANDS = new Set([
  "register", "freeze-frame", "audit-clusters", "freeze-sample", "adopt-r5-index",
  "register-route-evidence", "build-cost-preview", "label-openai", "seal-reference-labels",
  "dry-run", "authorize-check", "freeze-deepseek-registration", "execute-deepseek",
    "recover-stale-lock", "recover-interrupted-attempt", "score", "verify", "export-aggregate-report",
]);

function commandReceipt(command, status, context, details = {}) {
  const transitions = [details.output?.transition, details.output?.requestTransition,
    details.output?.auditTransition, details.output?.workflowTransition].filter(Boolean);
  const firstTransition = transitions[0] ?? null;
  const lastTransition = transitions.at(-1) ?? null;
  const receipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaRunnerCommandReceiptV4",
    runnerVersion: "V5-R5",
    designId: "MAIS-NATURAL-CA60-V5",
    command,
    status,
    activeRunnerRegistrationHash: context?.activeRegistration?.selfHash ?? null,
    providerCommandInvoked: (details.providerEventCount ?? 0) > 0 || (details.httpRequestCount ?? 0) > 0
      || (details.credentialReadCount ?? 0) > 0,
    providerEventCount: details.providerEventCount ?? 0,
    httpRequestCount: details.httpRequestCount ?? 0,
    credentialReadCount: details.credentialReadCount ?? 0,
    naturalQuestionEgressCount: details.naturalQuestionEgressCount ?? 0,
    referenceLabelCount: details.referenceLabelCount ?? 0,
    naturalQuestionResultCount: details.naturalQuestionResultCount ?? 0,
    stateTransitionCommitted: transitions.some((transition) => Boolean(transition?.nextIndex)),
    priorWorkflowIndexHash: firstTransition?.transitionReceipt?.priorWorkflowIndexHash ?? null,
    nextWorkflowIndexHash: lastTransition?.nextIndex?.selfHash ?? null,
    derivedArtifactHashes: [...new Set(transitions.flatMap((transition) =>
      transition?.persistedArtifacts?.map(({ contentHash }) => contentHash) ?? []))],
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: (details.providerEventCount ?? 0) > 0
      ? "CALIFORNIA_RUNTIME_EGRESS_ELIGIBLE_MACHINE_REFERENCE_PILOT_ONLY"
      : "FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED",
    passClaimAllowed: false,
    limitedGeneralizationEvidenceAllowed: false,
  });
  assertClosedSelfHashedArtifactV5R5(receipt, "NaturalCaRunnerCommandReceiptV4");
  return receipt;
}

function outcome(command, exitCode, status, context = null, output = null) {
  const details = output ?? {};
  const receipt = commandReceipt(command, status, context, { ...details, output: details });
  const transition = [details.transition, details.requestTransition, details.auditTransition,
    details.workflowTransition].filter(Boolean).at(-1) ?? null;
  return Object.freeze({ exitCode, receipt, output: details,
    nextWorkflowIndexPath: transition?.nextIndexPath ?? null,
    transitionReceiptPath: transition?.transitionRelativePath ?? null });
}

function parseNumber(value, integer = false) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && (!integer || Number.isSafeInteger(parsed)) ? parsed : null;
}

function parseExactArguments(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.has(command)) return { error: "USAGE_ERROR_UNKNOWN_COMMAND", command: command ?? "UNKNOWN" };
  const valued = new Set(["--context", "--provider", "--canary", "--maximum-input-tokens", "--maximum-output-tokens", "--maximum-usd"]);
  const flagsOnly = new Set(["--resume"]);
  const values = new Map();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if ((!valued.has(token) && !flagsOnly.has(token)) || values.has(token)) return { error: "USAGE_ERROR_UNKNOWN_OR_DUPLICATE_ARGUMENT", command };
    if (flagsOnly.has(token)) values.set(token, true);
    else {
      const value = rest[index + 1];
      if (typeof value !== "string" || value.startsWith("--")) return { error: "USAGE_ERROR_MISSING_ARGUMENT_VALUE", command };
      values.set(token, value); index += 1;
    }
  }
  if (!values.has("--context")) return { error: "WORKFLOW_CONTEXT_REQUIRED", command };
  const provider = values.get("--provider");
  const providerCommands = new Set(["register-route-evidence", "build-cost-preview", "authorize-check", "recover-stale-lock", "recover-interrupted-attempt"]);
  if (providerCommands.has(command) && !["openai", "deepseek"].includes(provider)) return { error: "USAGE_ERROR_PROVIDER_REQUIRED", command };
  const commonOnly = new Set(["register", "freeze-frame", "audit-clusters", "freeze-sample", "adopt-r5-index",
    "seal-reference-labels", "dry-run", "freeze-deepseek-registration", "score", "verify", "export-aggregate-report"]);
  if (commonOnly.has(command) && values.size !== 1) return { error: "USAGE_ERROR_COMMAND_ARGUMENTS", command };
  if (command === "register-route-evidence" || command === "authorize-check" || command === "recover-stale-lock" || command === "recover-interrupted-attempt") {
    if (values.size !== 2) return { error: "USAGE_ERROR_COMMAND_ARGUMENTS", command };
  }
  if (command === "build-cost-preview" && values.size !== 5) return { error: "USAGE_ERROR_COST_PREVIEW_CAPS_REQUIRED", command };
  if (command === "label-openai" && !(values.size === 2 && values.get("--resume") === true)) return { error: "USAGE_ERROR_LABEL_OPENAI_REQUIRES_RESUME", command };
  if (command === "execute-deepseek") {
    const canary = values.get("--canary"); const resume = values.get("--resume") === true;
    if (values.size !== 2 || !((canary === "1" && !resume) || (canary === undefined && resume))) {
      return { error: "USAGE_ERROR_DEEPSEEK_REQUIRES_EXACT_CANARY_1_OR_RESUME", command };
    }
  }
  const tokenAllocation = command === "build-cost-preview" ? {
    maximumInputTokens: parseNumber(values.get("--maximum-input-tokens"), true),
    maximumOutputTokens: parseNumber(values.get("--maximum-output-tokens"), true),
    maximumEstimatedUsd: parseNumber(values.get("--maximum-usd")),
  } : null;
  if (tokenAllocation && Object.values(tokenAllocation).some((value) => value === null)) return { error: "USAGE_ERROR_COST_PREVIEW_CAPS_INVALID", command };
  return { command, contextPath: values.get("--context"), provider: provider === "openai" ? "OPENAI_DIRECT" : provider === "deepseek" ? "DEEPSEEK_DIRECT" : null,
    canary: values.get("--canary"), resume: values.get("--resume") === true, tokenAllocation };
}

export async function runCliV5R5(argv = [], deps = createRunnerRuntimeV5R5()) {
  const parsed = parseExactArguments(argv);
  if (parsed.error) return outcome(parsed.command, 2, parsed.error);
  if (typeof deps.loadWorkflowContext !== "function") return outcome(parsed.command, 3, "WORKFLOW_CONTEXT_LOADER_NOT_BOUND");
  let context;
  try { context = await deps.loadWorkflowContext(parsed.contextPath); }
  catch (error) { return outcome(parsed.command, 3, "WORKFLOW_CONTEXT_BLOCKED", null,
    { errors: [error instanceof Error ? error.message : String(error)] }); }
  let engine;
  let args = [context];
  if (["register", "freeze-frame", "audit-clusters", "freeze-sample"].includes(parsed.command)) engine = "verifyFrozenUpstream";
  else if (parsed.command === "adopt-r5-index") engine = "adoptR5WorkflowIndex";
  else if (parsed.command === "dry-run") engine = "dryRun";
  else if (parsed.command === "authorize-check") { engine = "authorizeCheck"; args.push(parsed.provider); }
  else if (parsed.command === "register-route-evidence") { engine = "registerAuthenticatedRouteEvidence"; args.push(parsed.provider); }
  else if (parsed.command === "build-cost-preview") { engine = "buildCostPreview"; args.push(parsed.provider, parsed.tokenAllocation); }
  else if (parsed.command === "label-openai") engine = "executeOpenAIResumeStep";
  else if (parsed.command === "seal-reference-labels") engine = "sealReferenceLabels";
  else if (parsed.command === "freeze-deepseek-registration") engine = "freezeDeepSeekExecutionRegistration";
  else if (parsed.command === "execute-deepseek") engine = parsed.canary === "1" ? "executeDeepSeekCanaryStep" : "executeDeepSeekResumeStep";
  else if (parsed.command === "recover-stale-lock") {
    engine = "recoverStaleLedgerLock";
    const recoveryAuthorization = context.artifacts.get(`${parsed.provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK"}_LEDGER_RECOVERY_AUTHORIZATION`);
    args.push(parsed.provider, recoveryAuthorization, recoveryAuthorization?.authorizedBy);
  } else if (parsed.command === "score") engine = "score";
  else if (parsed.command === "recover-interrupted-attempt") {
    engine = "recoverInterruptedAttempt";
    const recoveryAuthorization = context.artifacts.get(`${parsed.provider === "OPENAI_DIRECT" ? "OPENAI" : "DEEPSEEK"}_INTERRUPTED_RECOVERY_AUTHORIZATION`);
    args.push(parsed.provider, recoveryAuthorization, recoveryAuthorization?.authorizedBy);
  }
  else if (parsed.command === "verify") engine = "verify";
  else engine = "exportAggregateReport";
  if (typeof deps[engine] !== "function") return outcome(parsed.command, 3, "ENGINE_NOT_IMPLEMENTED_OR_NOT_BOUND", context);
  let output;
  try { output = await deps[engine](...args); }
  catch (error) { output = { ok: false, status: "ENGINE_FAIL_CLOSED", providerEventCount: 0, httpRequestCount: 0,
    credentialReadCount: 0, naturalQuestionEgressCount: 0, errors: [error instanceof Error ? error.message : String(error)] }; }
  if (!output || typeof output.status !== "string") return outcome(parsed.command, 4, "ENGINE_RESULT_INVALID", context);
  return outcome(parsed.command, output.ok === true ? 0 : 3, output.status, context, output);
}

async function main() {
  const result = await runCliV5R5(process.argv.slice(2));
  process.stdout.write(`${JSON.stringify({ receipt: result.receipt, nextWorkflowIndexPath: result.nextWorkflowIndexPath,
    transitionReceiptPath: result.transitionReceiptPath })}\n`);
  process.exitCode = result.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export const V5_R5_CLI_COMMANDS = Object.freeze([...COMMANDS]);
