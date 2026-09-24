import { fileURLToPath } from "node:url";
import path from "node:path";

import { extractDeepSeekCredentialFromDocxXml } from "./credential-loader-v2.mjs";
import { executeFormalCalibrationV2, HISTORICAL_V2_LIVE_DISABLED } from "./formal-execution-v2.mjs";

const EXECUTION_FLAG = "--execute-formal-168-plus-21";
const FORBIDDEN_FLAGS = new Set(["--deploy", "--stage", "--commit", "--push", "--production"]);

export function validateFormalCliArgsV2(argv) {
  const forbidden = argv.find((value) => FORBIDDEN_FLAGS.has(value));
  if (forbidden) throw new Error(`${forbidden} is outside the owner authorization.`);
  if (!argv.includes(EXECUTION_FLAG)) throw new Error("The exact formal execution flag is required; no provider call was started.");
  return true;
}

async function readStdinUtf8(stream) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of stream) {
    bytes += chunk.length;
    if (bytes > 25 * 1024 * 1024) throw new Error("Credential DOCX XML input exceeds the bounded launcher size.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function runFormalCliV2() {
  throw new Error(HISTORICAL_V2_LIVE_DISABLED);
}

// Retained historical launcher, unreachable from the exported/CLI entrypoint.
async function historicalRunFormalCliV2({ argv = process.argv, stdin = process.stdin, stdout = process.stdout }) {
  validateFormalCliArgsV2(argv);
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const worktreeRoot = path.resolve(scriptDirectory, "../../..");
  const localRoot = path.join(worktreeRoot, ".local/rsi-lite-calibration-v2");
  let apiKey = null;
  try {
    const credentialXml = await readStdinUtf8(stdin);
    apiKey = extractDeepSeekCredentialFromDocxXml(credentialXml);
    const result = await executeFormalCalibrationV2({
      apiKey,
      worktreeRoot,
      candidateRoot: path.join(localRoot, "candidate-set"),
      authorizationPath: path.join(localRoot, "authorization", "FORMAL-AUTHORIZATION.json"),
      outputRoot: path.join(localRoot, "execution"),
      onProgress: async (progress) => {
        stdout.write(`${JSON.stringify({ event: "v2-formal-progress", ...progress })}\n`);
      }
    });
    stdout.write(`${JSON.stringify({
      event: "v2-formal-complete",
      status: result.finalReceipt.status,
      successfulProviderCalls: result.finalReceipt.successfulProviderCalls,
      providerAttempts: result.finalReceipt.providerAttempts,
      capAccountedTokens: result.finalReceipt.capAccounting.capAccountedTokens,
      capAccountedCostUsd: result.finalReceipt.capAccounting.capAccountedCostUsd,
      listedPriceSuccessfulUsageEstimateUsd: result.finalReceipt.currentListedPriceSuccessfulUsageEstimate.estimatedUsd,
      finalReceiptSha256: result.finalReceipt.finalReceiptSha256,
      productionAuthorized: false,
      deploymentPerformed: false,
      gitCommitPerformed: false,
      gitPushPerformed: false,
      credentialPersisted: false
    })}\n`);
    return result;
  } finally {
    apiKey = null;
  }
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
  try {
    await runFormalCliV2({});
  } catch (error) {
    process.stderr.write(`MAIS-RSI-LITE-CAL-V2 stopped fail-closed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
