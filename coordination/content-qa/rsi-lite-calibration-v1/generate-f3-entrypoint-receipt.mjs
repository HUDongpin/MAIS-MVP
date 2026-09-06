import { createHash, randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildF3EntrypointReceipt } from "./f3-authorization.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const CODE_PATHS = Object.freeze([
  "a18-owner-waiver.mjs",
  "calibration-design.mjs",
  "f3-authorization.mjs",
  "f3-campaign.mjs",
  "f3-execution-contract.mjs",
  "f3-formal-runner.mjs",
  "f3-persistent-budget-ledger.mjs",
  "f3-provider-adapter.mjs",
  "f3-provider-smoke.mjs",
  "f3-resource-carryover.mjs",
  "f3-v2-retry-bootstrap.mjs",
  "f3-role-projection-worker.mjs",
  "f3-start-preflight.mjs",
  "isolation-harness.mjs",
  "process-lifecycle.mjs",
  "run-f3-formal-campaign.mjs",
  "f3-campaign.test.mjs",
  "f3-execution-contract.test.mjs",
  "f3-formal-runner.test.mjs",
  "f3-persistent-budget-ledger.test.mjs",
  "f3-provider-adapter.test.mjs",
  "f3-provider-smoke.test.mjs",
  "f3-resource-carryover.test.mjs",
  "f3-v2-retry-bootstrap.test.mjs",
  "f3-start-preflight.test.mjs",
  "run-f3-formal-campaign.test.mjs"
]);

function optionValue(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
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

async function writeProtected(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);
  if (await exists(outputPath)) throw new Error("Refusing to overwrite an existing F3 entrypoint receipt.");
  const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, outputPath);
  await chmod(outputPath, 0o600);
}

try {
  const rehearsalPath = path.resolve(optionValue("--rehearsal"));
  const smokePath = path.resolve(optionValue("--smoke"));
  const outputPath = path.resolve(optionValue("--output"));
  const rehearsal = JSON.parse(await readFile(rehearsalPath, "utf8"));
  const smoke = JSON.parse(await readFile(smokePath, "utf8"));
  const rehearsalBody = structuredClone(rehearsal);
  delete rehearsalBody.receiptSha256;
  const smokeBody = structuredClone(smoke);
  delete smokeBody.receiptSha256;
  if (rehearsal.receiptSha256 !== canonicalSha256(rehearsalBody) || smoke.receiptSha256 !== canonicalSha256(smokeBody)) {
    throw new Error("Rehearsal or provider-smoke self-hash is invalid.");
  }
  const codeFiles = [];
  for (const relativePath of CODE_PATHS) {
    const data = await readFile(path.join(scriptDirectory, relativePath));
    codeFiles.push({ path: relativePath, sha256: createHash("sha256").update(data).digest("hex") });
  }
  const receipt = buildF3EntrypointReceipt({
    codeFiles,
    rehearsal: {
      runs: rehearsal.runs,
      runCountsByArm: rehearsal.runCountsByArm,
      providerCalls: rehearsal.providerCalls,
      failures: rehearsal.failures,
      receiptSha256: rehearsal.receiptSha256
    },
    liveProviderSmoke: {
      passed: smoke.passed,
      provider: smoke.provider,
      model: smoke.model,
      httpStatus: smoke.httpStatus,
      validJson: smoke.validJson,
      receiptSha256: smoke.receiptSha256
    }
  });
  await writeProtected(outputPath, receipt);
  process.stdout.write(JSON.stringify({ status: receipt.status, codeFileCount: receipt.codeFiles.length, codePathsetSha256: receipt.codePathsetSha256, rehearsalReceiptSha256: receipt.rehearsal.receiptSha256, liveProviderSmokeReceiptSha256: receipt.liveProviderSmoke.receiptSha256, receiptSha256: receipt.receiptSha256 }) + "\n");
} catch (error) {
  process.stderr.write(`F3 entrypoint receipt generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
