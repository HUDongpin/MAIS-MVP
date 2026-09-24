import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const SYNTHETIC_PROJECTION = Object.freeze({
  packageId: "f3-synthetic-provider-smoke",
  protocolId: "MAIS-RSI-LITE-CAL-V1",
  protocolVersion: "1.1.1-f2-r",
  sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
  region: "SYNTHETIC",
  questions: [Object.freeze({
    id: "synthetic-q-1",
    type: "short-answer",
    gradeBand: "synthetic",
    standardIds: [],
    prompt: Object.freeze({ en: "Compute 2 + 3.", zh: "計算 2 + 3。", zhHans: "计算 2 + 3。" })
  })]
});

export async function runF3ProviderSmoke({ providerAdapter }) {
  if (!providerAdapter || providerAdapter.provider !== "DeepSeek" || typeof providerAdapter.runRole !== "function") {
    throw new Error("F3 provider smoke requires the DeepSeek provider adapter.");
  }
  const providerReceipt = await providerAdapter.runRole({
    role: "answer-blind-solver",
    packageId: SYNTHETIC_PROJECTION.packageId,
    projection: structuredClone(SYNTHETIC_PROJECTION),
    maxOutputTokens: 2_000,
    userId: "mais-rsi-lite-f3-smoke"
  });
  const passed = providerReceipt.httpStatus === 200
    && providerReceipt.model === "deepseek-v4-pro"
    && providerReceipt.finishReason === "stop"
    && providerReceipt.roleResult?.inspectionComplete === true
    && providerReceipt.roleResult?.packageId === SYNTHETIC_PROJECTION.packageId;
  if (!passed) throw new Error("F3 DeepSeek smoke response did not satisfy the strict provider contract.");
  const body = {
    owner: "A19-provider-readiness",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    candidateSetSha256: "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c",
    status: "redacted-live-provider-smoke-pass",
    passed: true,
    provider: providerReceipt.provider,
    model: providerReceipt.model,
    httpStatus: providerReceipt.httpStatus,
    validJson: true,
    finishReason: providerReceipt.finishReason,
    systemFingerprint: providerReceipt.systemFingerprint,
    providerRequestIdSha256: canonicalSha256(providerReceipt.providerRequestId ?? "unavailable"),
    providerResponseSha256: providerReceipt.providerResponseSha256,
    latencyMs: providerReceipt.latencyMs,
    usage: structuredClone(providerReceipt.usage),
    roleResultSha256: canonicalSha256(providerReceipt.roleResult),
    candidateContentSent: false,
    syntheticSurfaceCount: 1,
    credentialStatus: "configured-at-runtime-redacted",
    secretPersisted: false,
    rawReasoningPersisted: false,
    productionAuthorized: false,
    deploymentAuthorized: false
  };
  return { ...body, receiptSha256: canonicalSha256(body) };
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

export async function writeF3ProviderSmokeReceipt(outputPath, receipt) {
  if (!path.isAbsolute(outputPath) || path.extname(outputPath).toLowerCase() !== ".json") throw new Error("F3 provider smoke output must be an absolute JSON path.");
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);
  if (await exists(outputPath)) {
    const stored = JSON.parse(await readFile(outputPath, "utf8"));
    if (canonicalSha256(stored) === canonicalSha256(receipt)) return { resumed: true, outputPath };
    throw new Error("Refusing to overwrite a non-identical F3 provider smoke receipt.");
  }
  const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, outputPath);
  await chmod(outputPath, 0o600);
  return { resumed: false, outputPath };
}
