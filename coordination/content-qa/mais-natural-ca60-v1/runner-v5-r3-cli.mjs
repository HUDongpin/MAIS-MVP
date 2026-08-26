import { pathToFileURL } from "node:url";

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import { createFilesystemCliDependenciesV5R3 } from "./runner-v5-r3-runtime.mjs";

const COMMANDS = new Set([
  "register", "freeze-frame", "audit-clusters", "freeze-sample", "label-openai",
  "seal-reference-labels", "dry-run", "authorize-check", "execute-deepseek",
  "score", "verify", "export-aggregate-report",
]);
const SUCCESS_STATUSES = new Set([
  "SUCCEEDED", "FIXTURE_SUCCEEDED", "AUTHORIZATION_READY_NO_DISPATCH",
  "CONTEXT_INTEGRITY_VERIFIED", "INCONCLUSIVE_MACHINE_REFERENCE", "CONCURRED",
  "EXPORTED_AGGREGATE_ONLY", "AGGREGATE_EXPORT_READY",
]);

function contextPath(argv) {
  const index = argv.indexOf("--context");
  return index >= 0 && typeof argv[index + 1] === "string" ? argv[index + 1] : null;
}

function result(command, exitCode, status, details = {}) {
  return Object.freeze({
    exitCode,
    receipt: sealV5R3Artifact({
      schemaVersion: "NaturalCaRunnerCommandReceiptV2",
      runnerVersion: "V5-R3",
      command,
      status,
      providerCommandInvoked: details.providerCommandInvoked === true,
      providerEventCount: details.providerEventCount ?? 0,
      httpRequestCount: details.httpRequestCount ?? 0,
      credentialReadCount: details.credentialReadCount ?? 0,
      referenceLabelCount: details.referenceLabelCount ?? 0,
      naturalQuestionResultCount: details.naturalQuestionResultCount ?? 0,
      decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
      passClaimAllowed: false,
    }),
    output: details.output ?? null,
  });
}

async function loadContext(argv, deps, command) {
  const path = contextPath(argv);
  if (!path || typeof deps.loadWorkflowContext !== "function") return { error: result(command, 3, "WORKFLOW_CONTEXT_BLOCKED") };
  const context = await deps.loadWorkflowContext(path);
  if (!context || typeof context !== "object") return { error: result(command, 3, "WORKFLOW_CONTEXT_BLOCKED") };
  return { context };
}

export async function runCliV5R3(argv = [], deps = {}) {
  const [command] = argv;
  if (!COMMANDS.has(command)) return result(command ?? "UNKNOWN", 2, "USAGE_ERROR");
  const loaded = await loadContext(argv, deps, command);
  if (loaded.error) return loaded.error;
  const { context } = loaded;
  const engines = {
    register: "verifyFrozenUpstream",
    "freeze-frame": "verifyFrozenUpstream",
    "audit-clusters": "verifyFrozenUpstream",
    "freeze-sample": "verifyFrozenUpstream",
    "dry-run": "dryRun",
    "label-openai": "executeOpenAIResumeStep",
    "execute-deepseek": "executeDeepSeekResumeStep",
    "seal-reference-labels": "sealReferenceLabels",
    "authorize-check": "authorizeCheck",
    score: "score",
    verify: "verify",
    "export-aggregate-report": "exportAggregateReport",
  };
  const engineName = engines[command];
  const engine = deps[engineName];
  if (typeof engine !== "function") return result(command, 3, "ENGINE_NOT_IMPLEMENTED_OR_NOT_BOUND");
  const output = await engine(context, { argv: Object.freeze([...argv]) });
  if (!output || typeof output !== "object" || typeof output.status !== "string") return result(command, 4, "ENGINE_RESULT_INVALID");
  const succeeded = output.ok === true || (output.ok !== false && SUCCESS_STATUSES.has(output.status));
  const isProviderCommand = command === "label-openai" || command === "execute-deepseek";
  const providerWorkflowEntered = isProviderCommand && (output.dispatchAllowed === true
    || (output.providerEventCount ?? 0) > 0 || (output.httpRequestCount ?? 0) > 0 || (output.credentialReadCount ?? 0) > 0);
  return result(command, succeeded ? 0 : 3, output.status, {
    providerCommandInvoked: providerWorkflowEntered,
    providerEventCount: output.providerEventCount ?? 0,
    httpRequestCount: output.httpRequestCount ?? 0,
    credentialReadCount: output.credentialReadCount ?? 0,
    referenceLabelCount: output.referenceLabelCount ?? 0,
    naturalQuestionResultCount: output.naturalQuestionResultCount ?? 0,
    output,
  });
}

async function main() {
  const outcome = await runCliV5R3(process.argv.slice(2), createFilesystemCliDependenciesV5R3());
  process.stdout.write(`${JSON.stringify(outcome.receipt)}\n`);
  process.exitCode = outcome.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
