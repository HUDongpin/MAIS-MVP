import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildOwnerBudgetAuthorization,
  buildOwnerF3StartAuthorization,
  F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT,
  validateCanonicalSelfHash
} from "./f3-authorization.mjs";
import { buildF3StartPreflightDecision } from "./f3-start-preflight.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";
import {
  buildF3ExplicitExternalEgressAuthorization,
  buildF3PriorExternalUsageCarryover
} from "./f3-resource-carryover.mjs";
import { buildF3V2RetryBootstrap } from "./f3-v2-retry-bootstrap.mjs";

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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function writeProtected(outputPath, value) {
  await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputPath), 0o700);
  if (await exists(outputPath)) {
    const current = await readJson(outputPath);
    if (canonicalSha256(current) === canonicalSha256(value)) return;
    throw new Error(`Refusing to overwrite a non-identical authorization artifact: ${path.basename(outputPath)}`);
  }
  const temporaryPath = path.join(path.dirname(outputPath), `.${path.basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporaryPath, 0o600);
  await rename(temporaryPath, outputPath);
  await chmod(outputPath, 0o600);
}

async function readCommittedReceipts(campaignRoot) {
  const entries = await readdir(campaignRoot, { withFileTypes: true });
  const receipts = [];
  for (const entry of entries.filter((row) => row.isDirectory() && row.name.startsWith("f3-")).sort((left, right) => left.name.localeCompare(right.name))) {
    receipts.push(await readJson(path.join(campaignRoot, entry.name, "receipt.json")));
  }
  return receipts;
}

try {
  const outputDirectory = path.resolve(optionValue("--output-directory"));
  const campaignRoot = path.resolve(optionValue("--campaign-root"));
  const predecessorAuthorizationBindingSha256 = optionValue("--predecessor-authorization-binding-sha256");
  const entrypointReceipt = await readJson(path.resolve(optionValue("--entrypoint")));
  const gateReceipts = {
    A18: await readJson(path.resolve(optionValue("--a18"))),
    A11: await readJson(path.resolve(optionValue("--a11"))),
    A22: await readJson(path.resolve(optionValue("--a22"))),
    A25: await readJson(path.resolve(optionValue("--a25")))
  };
  const waiver = await readJson(path.resolve(optionValue("--waiver")));
  if (!validateCanonicalSelfHash(entrypointReceipt, "receiptSha256")) throw new Error("Entrypoint receipt self-hash is invalid.");
  for (const owner of ["A11", "A22", "A25"]) {
    if (!validateCanonicalSelfHash(gateReceipts[owner], "receiptSha256")) throw new Error(`${owner} execution receipt self-hash is invalid.`);
  }
  const ownerBudget = buildOwnerBudgetAuthorization({
    reviewedReceipts: gateReceipts,
    a18Waiver: waiver,
    entrypointReceipt,
    sourceInstructionExact: F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT
  });
  const ownerStartAuthorization = buildOwnerF3StartAuthorization({
    ownerBudget,
    entrypointReceipt,
    sourceInstructionExact: F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT
  });
  const explicitEgressAuthorization = buildF3ExplicitExternalEgressAuthorization({
    sourceInstructionExact: F3_OWNER_FORMAL_EXECUTION_SOURCE_EXACT,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudget
  });
  const priorExternalUsageCarryover = buildF3PriorExternalUsageCarryover({
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudget
  });
  const v2RetryBootstrap = buildF3V2RetryBootstrap({
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    predecessorAuthorizationBindingSha256,
    outputRoot: campaignRoot,
    committedReceipts: await readCommittedReceipts(campaignRoot),
    ownerBudget
  });
  const finalPreflight = buildF3StartPreflightDecision({
    entrypointReceipt,
    gateReceipts,
    a18HumanEvidenceOwnerWaiver: waiver,
    ownerBudget,
    ownerStartAuthorization
  });
  if (finalPreflight.formalExecutionAuthorized !== true || finalPreflight.blockers.length !== 0) {
    throw new Error(`Final F3 preflight remains blocked: ${finalPreflight.blockers.map((row) => row.code).join(",")}`);
  }
  const artifacts = {
    "F3-entrypoint-receipt.json": entrypointReceipt,
    "A18-machine-ready-receipt.json": gateReceipts.A18,
    "A18-human-evidence-owner-waiver.json": waiver,
    "A11-F3-execution-receipt.json": gateReceipts.A11,
    "A22-F3-execution-receipt.json": gateReceipts.A22,
    "A25-F3-execution-intake-receipt.json": gateReceipts.A25,
    "F3-owner-budget-authorization.json": ownerBudget,
    "F3-owner-start-authorization.json": ownerStartAuthorization,
    "F3-final-start-preflight.json": finalPreflight,
    "F3-owner-explicit-external-egress-authorization.json": explicitEgressAuthorization,
    "F3-prior-external-usage-carryover.json": priorExternalUsageCarryover,
    "F3-v2-persistent-retry-bootstrap.json": v2RetryBootstrap
  };
  for (const [filename, value] of Object.entries(artifacts)) await writeProtected(path.join(outputDirectory, filename), value);
  process.stdout.write(JSON.stringify({
    status: "F3-final-authorization-pack-complete",
    formalExecutionAuthorized: finalPreflight.formalExecutionAuthorized,
    currencyCapUsd: ownerBudget.currencyCapUsd,
    providerCallCap: ownerBudget.providerCallCap,
    tokenCap: ownerBudget.tokenCap,
    browserMinutesCap: ownerBudget.browserMinutesCap,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudgetSignatureSha256: ownerBudget.signatureSha256,
    ownerStartAuthorizationSha256: ownerStartAuthorization.signatureSha256,
    finalPreflightSha256: finalPreflight.preflightSha256,
    explicitExternalEgressAuthorizationSha256: explicitEgressAuthorization.authorizationSha256,
    priorExternalUsageCarryoverSha256: priorExternalUsageCarryover.carryoverSha256,
    v2RetryBootstrapSha256: v2RetryBootstrap.bootstrapSha256
  }) + "\n");
} catch (error) {
  process.stderr.write(`F3 authorization pack generation failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
