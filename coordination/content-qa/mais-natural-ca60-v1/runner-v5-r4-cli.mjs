import { pathToFileURL } from "node:url";

import { sealV5R3Artifact } from "./execution-integrity-v5-r3.mjs";
import { assertClosedSelfHashedArtifactV5R4 } from "./schema-contract-v5-r4.mjs";
import { createRunnerRuntimeV5R4 } from "./runner-v5-r4-runtime.mjs";

const COMMANDS = new Set([
  "register", "freeze-frame", "audit-clusters", "freeze-sample", "label-openai",
  "seal-reference-labels", "dry-run", "authorize-check", "execute-deepseek",
  "score", "verify", "export-aggregate-report",
]);

function commandResult(command, exitCode, status, details = {}) {
  const receipt = sealV5R3Artifact({
    schemaVersion: "NaturalCaRunnerCommandReceiptV3",
    runnerVersion: "V5-R4",
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
  });
  assertClosedSelfHashedArtifactV5R4(receipt, "NaturalCaRunnerCommandReceiptV3");
  return Object.freeze({ exitCode, receipt, output: details.output ?? null });
}

function parseExactArguments(argv) {
  const [command, ...rest] = argv;
  if (!COMMANDS.has(command)) return { error: "USAGE_ERROR_UNKNOWN_COMMAND" };
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!["--context", "--provider", "--canary", "--resume"].includes(token) || flags.has(token)) return { error: "USAGE_ERROR_UNKNOWN_OR_DUPLICATE_ARGUMENT" };
    flags.add(token);
    if (token === "--resume") values.set(token, true);
    else {
      const value = rest[index + 1];
      if (typeof value !== "string" || value.startsWith("--")) return { error: "USAGE_ERROR_MISSING_ARGUMENT_VALUE" };
      values.set(token, value);
      index += 1;
    }
  }
  if (!values.has("--context")) return { error: "WORKFLOW_CONTEXT_REQUIRED" };
  const commonOnly = new Set(["register", "freeze-frame", "audit-clusters", "freeze-sample", "seal-reference-labels", "dry-run", "score", "verify", "export-aggregate-report"]);
  if (commonOnly.has(command) && flags.size !== 1) return { error: "USAGE_ERROR_COMMAND_ARGUMENTS" };
  if (command === "authorize-check" && (flags.size !== 2 || !["openai", "deepseek"].includes(values.get("--provider")))) return { error: "USAGE_ERROR_AUTHORIZE_CHECK_REQUIRES_PROVIDER" };
  if (command === "label-openai" && (flags.size !== 2 || values.get("--resume") !== true)) return { error: "USAGE_ERROR_LABEL_OPENAI_REQUIRES_RESUME" };
  if (command === "execute-deepseek") {
    const canary = values.get("--canary");
    const resume = values.get("--resume") === true;
    if (flags.size !== 2 || !((canary === "1" && !resume) || (canary === undefined && resume))) return { error: "USAGE_ERROR_DEEPSEEK_REQUIRES_EXACT_CANARY_1_OR_RESUME" };
  }
  return { command, contextPath: values.get("--context"), provider: values.get("--provider"), canary: values.get("--canary"), resume: values.get("--resume") === true };
}

export async function runCliV5R4(argv = [], deps = {}) {
  const parsed = parseExactArguments(argv);
  const command = parsed.command ?? argv[0] ?? "UNKNOWN";
  if (parsed.error) return commandResult(command, 2, parsed.error);
  if (typeof deps.loadWorkflowContext !== "function") return commandResult(command, 3, "WORKFLOW_CONTEXT_LOADER_NOT_BOUND");
  let context;
  try { context = await deps.loadWorkflowContext(parsed.contextPath); }
  catch (error) { return commandResult(command, 3, "WORKFLOW_CONTEXT_BLOCKED", { output: { errors: [error instanceof Error ? error.message : String(error)] } }); }
  const engine = command === "label-openai" ? "executeOpenAIResumeStep"
    : command === "execute-deepseek" ? (parsed.canary === "1" ? "executeDeepSeekCanaryStep" : "executeDeepSeekResumeStep")
      : command === "seal-reference-labels" ? "sealReferenceLabels"
        : command === "authorize-check" ? "authorizeCheck"
          : command === "dry-run" ? "dryRun"
            : command === "score" ? "score"
              : command === "verify" ? "verify"
                : command === "export-aggregate-report" ? "exportAggregateReport"
                  : "verifyFrozenUpstream";
  if (typeof deps[engine] !== "function") return commandResult(command, 3, "ENGINE_NOT_IMPLEMENTED_OR_NOT_BOUND");
  let output;
  try {
    output = engine === "authorizeCheck"
      ? await deps[engine](context, parsed.provider === "openai" ? "OPENAI_DIRECT" : "DEEPSEEK_DIRECT")
      : await deps[engine](context);
  } catch (error) {
    output = { ok: false, status: "ENGINE_FAIL_CLOSED", providerEventCount: 0, httpRequestCount: 0, credentialReadCount: 0,
      errors: [error instanceof Error ? error.message : String(error)] };
  }
  if (!output || typeof output.status !== "string") return commandResult(command, 4, "ENGINE_RESULT_INVALID");
  const providerCommand = command === "label-openai" || command === "execute-deepseek";
  const providerWorkflowEntered = providerCommand && ((output.providerEventCount ?? 0) > 0
    || (output.httpRequestCount ?? 0) > 0 || (output.credentialReadCount ?? 0) > 0);
  return commandResult(command, output.ok === true ? 0 : 3, output.status, {
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
  const outcome = await runCliV5R4(process.argv.slice(2), createRunnerRuntimeV5R4());
  process.stdout.write(`${JSON.stringify(outcome.receipt)}\n`);
  process.exitCode = outcome.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

export const V5_R4_CLI_COMMANDS = Object.freeze([...COMMANDS]);
