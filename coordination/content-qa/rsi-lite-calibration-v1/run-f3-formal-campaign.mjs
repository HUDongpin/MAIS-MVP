import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runF3Campaign } from "./f3-campaign.mjs";
import { F3_CANDIDATE_SET_SHA256 } from "./f3-authorization.mjs";
import { buildF3RunPlan } from "./f3-execution-contract.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";
import { createDeepSeekProviderAdapter } from "./f3-provider-adapter.mjs";
import { createPersistentF3BudgetLedger } from "./f3-persistent-budget-ledger.mjs";
import {
  F3_EXPLICIT_EGRESS_SOURCE_EXACT,
  remainingF3CapsAfterCarryover,
  validateF3ExplicitExternalEgressAuthorization
} from "./f3-resource-carryover.mjs";
import { buildF3StartPreflightDecision } from "./f3-start-preflight.mjs";
import { validateF3V2RetryBootstrap } from "./f3-v2-retry-bootstrap.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const worktreeRoot = path.resolve(scriptDirectory, "../../..");
const restrictedRoot = path.join(worktreeRoot, ".local/rsi-lite-calibration-v1");
const packageRoot = path.join(restrictedRoot, "packages");
const publicManifestPath = path.join(scriptDirectory, "public-manifest.json");
const sealedManifestPath = path.join(restrictedRoot, "sealed-manifest.json");
const PEAK_PRICES = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });

class AuthorizationBoundaryError extends Error {}

function optionValue(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : null;
  if (!value || value.startsWith("--")) throw new AuthorizationBoundaryError(`${name} requires a value.`);
  return value;
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function verifyEntrypointFiles(entrypointReceipt) {
  for (const row of entrypointReceipt.codeFiles ?? []) {
    if (path.isAbsolute(row.path) || row.path.split(path.sep).includes("..")) throw new Error(`Unsafe F3 entrypoint path: ${row.path}`);
    const filePath = path.join(scriptDirectory, row.path);
    const observed = createHash("sha256").update(await readFile(filePath)).digest("hex");
    if (observed !== row.sha256) throw new Error(`F3 entrypoint code drifted: ${row.path}`);
  }
}

try {
  const forbidden = ["--production", "--deploy", "--commit", "--push"].find((flag) => process.argv.includes(flag));
  if (forbidden) throw new AuthorizationBoundaryError(`${forbidden} is outside the F3 formal-calibration authorization.`);
  if (!process.argv.includes("--execute-formal-48")) throw new AuthorizationBoundaryError("The exact --execute-formal-48 flag is required; no execution was started.");
  const authorizationDirectory = path.resolve(optionValue("--authorization-directory"));
  const outputRoot = path.resolve(optionValue("--output-root"));
  if (!isInside(restrictedRoot, authorizationDirectory) || !isInside(restrictedRoot, outputRoot)) {
    throw new AuthorizationBoundaryError("F3 authorization and output paths must stay inside the protected .local calibration root.");
  }
  const files = {
    entrypointReceipt: "F3-entrypoint-receipt.json",
    A18: "A18-machine-ready-receipt.json",
    waiver: "A18-human-evidence-owner-waiver.json",
    A11: "A11-F3-execution-receipt.json",
    A22: "A22-F3-execution-receipt.json",
    A25: "A25-F3-execution-intake-receipt.json",
    budget: "F3-owner-budget-authorization.json",
    start: "F3-owner-start-authorization.json",
    finalPreflight: "F3-final-start-preflight.json",
    explicitEgress: "F3-owner-explicit-external-egress-authorization.json",
    priorUsageCarryover: "F3-prior-external-usage-carryover.json",
    v2RetryBootstrap: "F3-v2-persistent-retry-bootstrap.json"
  };
  const entrypointReceipt = await readJson(path.join(authorizationDirectory, files.entrypointReceipt));
  const gateReceipts = {
    A18: await readJson(path.join(authorizationDirectory, files.A18)),
    A11: await readJson(path.join(authorizationDirectory, files.A11)),
    A22: await readJson(path.join(authorizationDirectory, files.A22)),
    A25: await readJson(path.join(authorizationDirectory, files.A25))
  };
  const a18HumanEvidenceOwnerWaiver = await readJson(path.join(authorizationDirectory, files.waiver));
  const ownerBudget = await readJson(path.join(authorizationDirectory, files.budget));
  const ownerStartAuthorization = await readJson(path.join(authorizationDirectory, files.start));
  const storedPreflight = await readJson(path.join(authorizationDirectory, files.finalPreflight));
  const explicitEgressAuthorization = await readJson(path.join(authorizationDirectory, files.explicitEgress));
  const priorUsageCarryover = await readJson(path.join(authorizationDirectory, files.priorUsageCarryover));
  const v2RetryBootstrap = await readJson(path.join(authorizationDirectory, files.v2RetryBootstrap));
  const preflight = buildF3StartPreflightDecision({ entrypointReceipt, gateReceipts, a18HumanEvidenceOwnerWaiver, ownerBudget, ownerStartAuthorization });
  if (preflight.formalExecutionAuthorized !== true || preflight.liveProviderAuthorized !== true || preflight.blockers.length !== 0) {
    throw new AuthorizationBoundaryError(`F3 final preflight is not authorized: ${preflight.blockers.map((row) => row.code).join(",") || "unknown-blocker"}`);
  }
  if (canonicalSha256(preflight) !== canonicalSha256(storedPreflight)) throw new AuthorizationBoundaryError("Stored F3 final preflight differs from the independently recomputed decision.");
  await verifyEntrypointFiles(entrypointReceipt);
  if (!validateF3ExplicitExternalEgressAuthorization({
    authorization: explicitEgressAuthorization,
    sourceInstructionExact: F3_EXPLICIT_EGRESS_SOURCE_EXACT,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudget
  })) throw new AuthorizationBoundaryError("Explicit payload-and-destination external-egress authorization is absent, invalid, or drifted.");
  const remainingCaps = remainingF3CapsAfterCarryover({
    carryover: priorUsageCarryover,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudget
  });
  const { bootstrapSha256, ...v2RetryBootstrapBody } = v2RetryBootstrap;
  if (
    bootstrapSha256 !== canonicalSha256(v2RetryBootstrapBody)
    || v2RetryBootstrap.entrypointReceiptSha256 !== entrypointReceipt.receiptSha256
    || v2RetryBootstrap.outputRoot !== outputRoot
    || v2RetryBootstrap.concurrency !== 1
    || v2RetryBootstrap.maxTransientAttemptsPerRole !== 3
    || v2RetryBootstrap.maxUncommittedProviderCalls !== 30
    || v2RetryBootstrap.remainingAdditionalFailureOrLostCallSlots !== 15
    || !Array.isArray(v2RetryBootstrap.allowedResumeAuthorizationBindingSha256)
    || v2RetryBootstrap.allowedResumeAuthorizationBindingSha256.length !== 1
    || v2RetryBootstrap.allowedResumeAuthorizationBindingSha256[0] !== v2RetryBootstrap.predecessorAuthorizationBindingSha256
  ) throw new AuthorizationBoundaryError("F3 v2 persistent-retry bootstrap is absent, invalid, or not bound to this exact entrypoint and campaign root.");
  const publicManifest = await readJson(publicManifestPath);
  const sealedManifest = await readJson(sealedManifestPath);
  if (publicManifest.candidateSetSha256 !== F3_CANDIDATE_SET_SHA256 || sealedManifest.candidateSetSha256 !== F3_CANDIDATE_SET_SHA256) {
    throw new AuthorizationBoundaryError("Frozen candidate-set commitment drifted before formal execution.");
  }
  const plan = buildF3RunPlan({ publicManifest, sealedManifest });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (typeof apiKey !== "string" || apiKey.trim() === "") throw new AuthorizationBoundaryError("DEEPSEEK_API_KEY is not configured at runtime.");
  const authorizationBinding = {
    preflightSha256: preflight.preflightSha256,
    entrypointReceiptSha256: entrypointReceipt.receiptSha256,
    ownerBudgetSignatureSha256: ownerBudget.signatureSha256,
    ownerStartAuthorizationSha256: ownerStartAuthorization.signatureSha256,
    gateReceiptSha256: Object.fromEntries(Object.entries(gateReceipts).map(([owner, receipt]) => [owner, receipt.receiptSha256])),
    a18HumanEvidenceOwnerWaiverSha256: a18HumanEvidenceOwnerWaiver.waiverSha256,
    explicitExternalEgressAuthorizationSha256: explicitEgressAuthorization.authorizationSha256,
    priorExternalUsageCarryoverSha256: priorUsageCarryover.carryoverSha256,
    persistentRetryBootstrapSha256: v2RetryBootstrap.bootstrapSha256,
    predecessorAuthorizationBindingSha256: v2RetryBootstrap.predecessorAuthorizationBindingSha256
  };
  const providerAdapter = createDeepSeekProviderAdapter({ apiKey, model: "deepseek-v4-pro" });
  const campaign = await runF3Campaign({
    plan,
    candidateSetSha256: F3_CANDIDATE_SET_SHA256,
    outputRoot,
    loadPackage: async (packageId) => {
      if (!/^pkg-[a-f0-9]{20}$/.test(packageId)) throw new Error("Formal runner rejected an unsafe package ID.");
      return readJson(path.join(packageRoot, `${packageId}.json`));
    },
    providerAdapter,
    caps: remainingCaps,
    pricesUsdPerMillion: PEAK_PRICES,
    concurrency: v2RetryBootstrap.concurrency,
    authorizationBinding,
    allowedResumeAuthorizationBindingSha256: v2RetryBootstrap.allowedResumeAuthorizationBindingSha256,
    maxTransientAttemptsPerRole: v2RetryBootstrap.maxTransientAttemptsPerRole,
    budgetLedgerFactory: ({ caps, pricesUsdPerMillion, initialUsage, existingReceipts }) => {
      if (!validateF3V2RetryBootstrap({
        bootstrap: v2RetryBootstrap,
        entrypointReceiptSha256: entrypointReceipt.receiptSha256,
        predecessorAuthorizationBindingSha256: v2RetryBootstrap.predecessorAuthorizationBindingSha256,
        outputRoot,
        committedReceipts: existingReceipts,
        ownerBudget
      })) throw new AuthorizationBoundaryError("F3 v2 persistent-retry bootstrap drifted from the ten committed receipts or owner envelope.");
      return createPersistentF3BudgetLedger({
        journalPath: path.join(outputRoot, ".F3-PERSISTENT-BUDGET-LEDGER.json"),
        binding: {
          candidateSetSha256: F3_CANDIDATE_SET_SHA256,
          entrypointReceiptSha256: entrypointReceipt.receiptSha256,
          bootstrapSha256: v2RetryBootstrap.bootstrapSha256,
          campaignRootSha256: canonicalSha256(outputRoot)
        },
        caps,
        pricesUsdPerMillion,
        committedUsage: initialUsage,
        priorUncommittedDebit: v2RetryBootstrap.priorV2UncommittedDebit,
        maxUncommittedProviderCalls: v2RetryBootstrap.maxUncommittedProviderCalls
      });
    }
  });
  process.stdout.write(JSON.stringify({
    status: campaign.status,
    receiptCount: campaign.receiptCount,
    runCountsByArm: campaign.runCountsByArm,
    providerCalls: campaign.resourceUsage.providerCalls,
    conservativePeakPriceCostUsd: campaign.resourceUsage.apiCostUsd,
    priorExternalUsageDebit: priorUsageCarryover.debit,
    remainingCapsAtV2Start: priorUsageCarryover.remainingCaps,
    persistentBudgetLedger: campaign.budgetLedgerAudit,
    browserLaunches: campaign.resourceUsage.browserLaunches,
    campaignReceiptSha256: campaign.campaignReceiptSha256,
    productionAuthorized: false,
    deploymentAuthorized: false,
    secretPersisted: false
  }) + "\n");
} catch (error) {
  process.stderr.write(`F3 formal campaign did not start or stopped fail-closed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = error instanceof AuthorizationBoundaryError ? 2 : 1;
}
