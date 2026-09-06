import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runF3Campaign } from "./f3-campaign.mjs";
import { buildF3RunPlan } from "./f3-execution-contract.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptDirectory, "../../..");
const restrictedRoot = path.join(worktreeRoot, ".local/rsi-lite-calibration-v1");
const publicManifestPath = path.join(scriptDirectory, "public-manifest.json");
const sealedManifestPath = path.join(restrictedRoot, "sealed-manifest.json");
const packageRoot = path.join(restrictedRoot, "packages");
const PRICES = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const CAPS = Object.freeze({ providerCallCap: 200, tokenCap: 30_000_000, currencyCapUsd: 50 });

function optionValue(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function rehearsalAdapter() {
  let callIndex = 0;
  return {
    provider: "deterministic-rehearsal-adapter",
    model: "deterministic-rehearsal-v1",
    async runRole({ role, packageId, projection }) {
      callIndex += 1;
      const inspectedSurfaceIds = [...(projection.questions ?? []).map((row) => row.id), ...(projection.lessons ?? []).map((row) => row.id)];
      const roleResult = { schemaVersion: 1, role, packageId, inspectionComplete: true, inspectedSurfaceIds, findings: [] };
      return {
        provider: "deterministic-rehearsal-adapter",
        httpStatus: 200,
        model: "deterministic-rehearsal-v1",
        systemFingerprint: "deterministic-rehearsal-v1",
        providerRequestId: `rehearsal-${String(callIndex).padStart(3, "0")}`,
        finishReason: "stop",
        latencyMs: 0,
        usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 },
        providerResponseSha256: canonicalSha256(roleResult),
        roleResult
      };
    }
  };
}

async function writeReceipt(outputPath, receipt) {
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);
  const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, outputPath);
  await chmod(outputPath, 0o600);
}

try {
  if (process.argv.some((argument) => ["--live-provider", "--production", "--deploy"].includes(argument))) {
    throw new Error("F3 rehearsal forbids live-provider, production, and deployment flags.");
  }
  const outputRoot = path.resolve(optionValue("--output-root"));
  const receiptPath = path.resolve(optionValue("--receipt"));
  const publicManifest = JSON.parse(await readFile(publicManifestPath, "utf8"));
  const sealedManifest = JSON.parse(await readFile(sealedManifestPath, "utf8"));
  const plan = buildF3RunPlan({ publicManifest, sealedManifest });
  const campaign = await runF3Campaign({
    plan,
    candidateSetSha256: publicManifest.candidateSetSha256,
    outputRoot,
    loadPackage: async (packageId) => {
      if (!/^pkg-[a-f0-9]{20}$/.test(packageId)) throw new Error("Rehearsal rejected an unsafe package ID.");
      return JSON.parse(await readFile(path.join(packageRoot, `${packageId}.json`), "utf8"));
    },
    providerAdapter: rehearsalAdapter(),
    caps: CAPS,
    pricesUsdPerMillion: PRICES,
    concurrency: 2
  });
  const body = {
    owner: "A16-execution-author",
    protocolId: campaign.protocolId,
    protocolVersion: campaign.protocolVersion,
    executionAmendmentId: campaign.executionAmendmentId,
    sourceBaseline: campaign.sourceBaseline,
    candidateSetSha256: campaign.candidateSetSha256,
    status: "exact-48-run-rehearsal-pass",
    runs: campaign.receiptCount,
    runCountsByArm: campaign.runCountsByArm,
    providerCalls: campaign.resourceUsage.providerCalls,
    childProcesses: campaign.resourceUsage.childProcesses,
    browserLaunches: campaign.resourceUsage.browserLaunches,
    failures: 0,
    campaignReceiptSha256: campaign.campaignReceiptSha256,
    liveProviderUsed: false,
    productionAuthorized: false,
    deploymentAuthorized: false
  };
  const receipt = { ...body, receiptSha256: canonicalSha256(body) };
  await writeReceipt(receiptPath, receipt);
  process.stdout.write(JSON.stringify({ status: receipt.status, runs: receipt.runs, providerCalls: receipt.providerCalls, childProcesses: receipt.childProcesses, failures: receipt.failures, receiptSha256: receipt.receiptSha256 }) + "\n");
} catch (error) {
  process.stderr.write(`F3 rehearsal failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
