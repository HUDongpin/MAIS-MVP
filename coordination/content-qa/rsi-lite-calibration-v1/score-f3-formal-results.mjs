import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { scoreF3CampaignResults } from "./f3-score-results.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptDirectory, "../../..");
const restrictedRoot = path.join(worktreeRoot, ".local/rsi-lite-calibration-v1");

function optionValue(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeProtected(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);
  if (await exists(outputPath)) throw new Error("Refusing to overwrite an existing F3 scoring result.");
  const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, outputPath);
  await chmod(outputPath, 0o600);
}

try {
  if (process.argv.some((argument) => ["--provider", "--production", "--deploy"].includes(argument))) throw new Error("F3 scoring is offline-only and forbids provider, production, and deployment flags.");
  const campaignRoot = path.resolve(optionValue("--campaign-root"));
  const outputPath = path.resolve(optionValue("--output"));
  if (!isInside(restrictedRoot, campaignRoot) || !isInside(restrictedRoot, outputPath)) throw new Error("F3 scoring inputs and outputs must remain inside the protected calibration root.");
  const campaignReceipt = await readJson(path.join(campaignRoot, "CAMPAIGN-COMMITTED.json"));
  if (campaignReceipt.status !== "formal-48-run-execution-complete" || campaignReceipt.completionClaim?.executionComplete !== true) {
    throw new Error("Campaign is incomplete; gold ledger remains sealed and was not read.");
  }
  const runReceipts = [];
  for (const row of campaignReceipt.runReceipts) {
    const runId = `f3-${row.arm.toLowerCase()}-${row.packageId}`;
    runReceipts.push(await readJson(path.join(campaignRoot, runId, "receipt.json")));
  }
  // Gold and concealed assignments are opened only after the campaign commit above is verified as complete.
  const sealedManifest = await readJson(path.join(restrictedRoot, "sealed-manifest.json"));
  const goldLedger = await readJson(path.join(restrictedRoot, "gold-ledger.json"));
  const result = scoreF3CampaignResults({ campaignReceipt, runReceipts, sealedManifest, goldLedger });
  await writeProtected(outputPath, result);
  process.stdout.write(JSON.stringify({
    status: result.status,
    runCount: result.runCount,
    matchedLatentBundleCount: result.matchedLatentBundleCount,
    matchedLatentDefectCount: result.matchedLatentDefectCount,
    armMetrics: Object.fromEntries(Object.entries(result.armMetrics).map(([arm, metrics]) => [arm, { sensitivity: metrics.sensitivity, specificity: metrics.specificity, falsePositives: metrics.falsePositives, providerCalls: metrics.resourceUsage.providerCalls, peakPriceCostUsd: metrics.resourceUsage.apiCostUsd }])),
    matchedComparisons: result.matchedComparisons,
    resultSha256: result.resultSha256,
    claimBoundary: result.claimBoundary
  }) + "\n");
} catch (error) {
  process.stderr.write(`F3 formal scoring failed closed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
