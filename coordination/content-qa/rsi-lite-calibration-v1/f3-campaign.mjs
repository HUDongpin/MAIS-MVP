import { randomUUID } from "node:crypto";
import { access, chmod, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { F3_EXECUTION_AMENDMENT_ID } from "./f3-execution-contract.mjs";
import {
  canonicalSha256,
  createBudgetLedger,
  readCommittedF3Run,
  runF3Package,
  writeCommittedF3Run
} from "./f3-formal-runner.mjs";

const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
const PROTOCOL_VERSION = "1.1.1-f2-r";
const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const ARMS = Object.freeze(["A", "B", "C0", "C"]);

function assertSha256(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a SHA-256 value.`);
}

export function validateF3CampaignPlan(plan) {
  if (!Array.isArray(plan) || plan.length !== 48) throw new Error("F3 campaign requires exactly 48 run-plan rows.");
  const ids = plan.map((row) => row?.packageId);
  if (ids.some((id) => typeof id !== "string" || id === "") || new Set(ids).size !== 48) throw new Error("F3 campaign plan contains a duplicate or invalid package ID.");
  const counts = Object.fromEntries(ARMS.map((arm) => [arm, plan.filter((row) => row.arm === arm).length]));
  if (ARMS.some((arm) => counts[arm] !== 12)) throw new Error(`F3 campaign requires exactly 12 per arm: ${JSON.stringify(counts)}`);
  for (const row of plan) {
    assertSha256(row.contentSha256, `content commitment for ${row.packageId}`);
    if (typeof row.latentBundleId !== "string" || typeof row.variantId !== "string" || typeof row.region !== "string") throw new Error(`F3 campaign plan metadata is incomplete for ${row.packageId}.`);
  }
  return counts;
}

function sumReceiptUsage(receipts) {
  return receipts.reduce((totals, receipt) => {
    const usage = receipt.resourceUsage;
    totals.providerCalls += usage.providerCalls;
    totals.providerAttempts += usage.providerAttempts ?? usage.providerCalls;
    totals.failedProviderAttempts += usage.failedProviderAttempts ?? 0;
    totals.promptCacheHitTokens += usage.promptCacheHitTokens;
    totals.promptCacheMissTokens += usage.promptCacheMissTokens;
    totals.outputTokens += usage.outputTokens;
    totals.apiCostUsd = Number((totals.apiCostUsd + usage.apiCostUsd).toFixed(9));
    totals.conservativeFailureDebitTokens += usage.conservativeFailureDebitTokens;
    totals.conservativeFailureDebitUsd = Number((totals.conservativeFailureDebitUsd + usage.conservativeFailureDebitUsd).toFixed(9));
    totals.childProcesses += usage.childProcesses;
    totals.browserLaunches += usage.browserLaunches;
    totals.liveLatencyMilliseconds += usage.liveLatencyMilliseconds;
    return totals;
  }, {
    providerCalls: 0,
    providerAttempts: 0,
    failedProviderAttempts: 0,
    promptCacheHitTokens: 0,
    promptCacheMissTokens: 0,
    outputTokens: 0,
    apiCostUsd: 0,
    conservativeFailureDebitTokens: 0,
    conservativeFailureDebitUsd: 0,
    childProcesses: 0,
    browserLaunches: 0,
    liveLatencyMilliseconds: 0
  });
}

function runOrder(plan, candidateSetSha256) {
  return [...plan].sort((left, right) => {
    const leftOrder = canonicalSha256(`${candidateSetSha256}|${left.packageId}`);
    const rightOrder = canonicalSha256(`${candidateSetSha256}|${right.packageId}`);
    return leftOrder.localeCompare(rightOrder);
  });
}

function assertFormalPackageDenominator(content, row) {
  if (!content || typeof content !== "object" || content.packageId !== row.packageId) throw new Error(`Package loader returned the wrong package for ${row.packageId}.`);
  if (!Array.isArray(content.questions) || content.questions.length !== 100) throw new Error(`Formal package ${row.packageId} must contain exactly 100 questions.`);
  if (!Array.isArray(content.lessons) || content.lessons.length !== 2) throw new Error(`Formal package ${row.packageId} must contain exactly two lessons.`);
  if (!Array.isArray(content.browserRoutes) || content.browserRoutes.length !== 0) throw new Error(`Formal package ${row.packageId} must contain zero browser routes.`);
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

async function writeCampaignReceipt(outputRoot, receipt) {
  const receiptPath = path.join(outputRoot, "CAMPAIGN-COMMITTED.json");
  if (await exists(receiptPath)) {
    const stored = JSON.parse(await readFile(receiptPath, "utf8"));
    const { campaignReceiptSha256, ...body } = stored;
    if (campaignReceiptSha256 !== canonicalSha256(body) || campaignReceiptSha256 !== receipt.campaignReceiptSha256) {
      throw new Error("Existing committed F3 campaign receipt conflicts with the completed run set.");
    }
    return;
  }
  const temporaryPath = path.join(outputRoot, `.CAMPAIGN-COMMITTED.${process.pid}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, receiptPath);
    await chmod(receiptPath, 0o600);
  } catch (error) {
    if (await exists(temporaryPath)) {
      // A failed temporary campaign marker contains no credential and is safe to leave for diagnosis.
    }
    throw error;
  }
}

export async function runF3Campaign({
  plan,
  candidateSetSha256,
  outputRoot,
  loadPackage,
  providerAdapter,
  caps,
  pricesUsdPerMillion,
  concurrency = 2,
  authorizationBinding = null,
  allowedResumeAuthorizationBindingSha256 = [],
  budgetLedgerFactory = null,
  maxTransientAttemptsPerRole = 3
}) {
  const runCountsByArm = validateF3CampaignPlan(plan);
  assertSha256(candidateSetSha256, "candidate-set commitment");
  if (!path.isAbsolute(outputRoot)) throw new Error("F3 campaign output root must be absolute.");
  if (typeof loadPackage !== "function") throw new Error("F3 campaign requires a package loader.");
  if (!providerAdapter || typeof providerAdapter.runRole !== "function") throw new Error("F3 campaign requires a provider adapter.");
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) throw new Error("F3 campaign concurrency must be an integer from one through four.");
  if (!Array.isArray(allowedResumeAuthorizationBindingSha256) || allowedResumeAuthorizationBindingSha256.some((value) => typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value))) throw new Error("F3 predecessor authorization-binding allowlist is invalid.");
  if (budgetLedgerFactory !== null && typeof budgetLedgerFactory !== "function") throw new Error("F3 budget-ledger factory must be a function.");

  const boundPlan = plan.map((row) => ({ ...row, candidateSetSha256, authorizationBinding }));
  const receiptByPackage = new Map();
  let resumedRunCount = 0;
  for (const row of boundPlan) {
    const existing = await readCommittedF3Run({ outputRoot, planRow: row, allowedAuthorizationBindingSha256: allowedResumeAuthorizationBindingSha256 });
    if (existing) {
      receiptByPackage.set(row.packageId, existing.receipt);
      resumedRunCount += 1;
    }
  }
  const existingReceipts = [...receiptByPackage.values()];
  const initialUsage = sumReceiptUsage(existingReceipts);
  const budgetLedger = budgetLedgerFactory
    ? budgetLedgerFactory({ caps, pricesUsdPerMillion, initialUsage, existingReceipts: structuredClone(existingReceipts) })
    : createBudgetLedger({ caps, pricesUsdPerMillion, initialUsage });
  if (!budgetLedger || typeof budgetLedger.reserve !== "function") {
    if (typeof budgetLedger?.close === "function") budgetLedger.close();
    throw new Error("F3 campaign budget-ledger factory returned an invalid ledger.");
  }
  try {
  const pending = runOrder(boundPlan.filter((row) => !receiptByPackage.has(row.packageId)), candidateSetSha256);
  let cursor = 0;
  let firstError = null;

  async function worker() {
    while (firstError === null) {
      const index = cursor;
      cursor += 1;
      if (index >= pending.length) return;
      const row = pending[index];
      try {
        const content = await loadPackage(row.packageId);
        assertFormalPackageDenominator(content, row);
        const receipt = await runF3Package({ planRow: row, packageContent: content, providerAdapter, budgetLedger, maxTransientAttemptsPerRole });
        await writeCommittedF3Run({ outputRoot, receipt });
        receiptByPackage.set(row.packageId, receipt);
        if (typeof budgetLedger.reconcileCommittedUsage === "function") {
          budgetLedger.reconcileCommittedUsage(sumReceiptUsage([...receiptByPackage.values()]));
        }
      } catch (error) {
        firstError = error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, pending.length)) }, () => worker()));
  if (firstError) throw firstError;
  const receipts = [...receiptByPackage.values()].sort((left, right) => left.packageId.localeCompare(right.packageId));
  if (receipts.length !== 48) throw new Error(`F3 campaign ended with ${receipts.length} committed receipts instead of 48.`);
  const resourceUsage = sumReceiptUsage(receipts);
  if (resourceUsage.providerCalls !== 144) throw new Error(`F3 campaign provider-call denominator drifted (${resourceUsage.providerCalls} != 144).`);
  if (resourceUsage.browserLaunches !== 0) throw new Error("F3 content-only campaign unexpectedly launched a browser.");
  const orderedRows = runOrder(boundPlan, candidateSetSha256);
  const campaignBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    executionAmendmentId: F3_EXECUTION_AMENDMENT_ID,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256,
    authorizationBinding,
    allowedResumeAuthorizationBindingSha256: [...allowedResumeAuthorizationBindingSha256].sort(),
    status: "formal-48-run-execution-complete",
    formalExecutionAuthorized: true,
    liveProviderUsed: providerAdapter.provider === "DeepSeek",
    productionAuthorized: false,
    deploymentAuthorized: false,
    receiptCount: receipts.length,
    runCountsByArm,
    executionOrder: orderedRows.map((row) => row.packageId),
    runReceipts: receipts.map((receipt) => ({ packageId: receipt.packageId, arm: receipt.arm, inputSha256: receipt.inputSha256, receiptSha256: receipt.receiptSha256 })),
    resourceCaps: structuredClone(caps),
    resourceUsage,
    budgetLedgerAudit: typeof budgetLedger.auditSnapshot === "function" ? budgetLedger.auditSnapshot() : null,
    completionClaim: {
      executionComplete: true,
      contentAccepted: false,
      goldScoringComplete: false,
      matchedQuadrupletAnalysisComplete: false
    },
    pendingPostRunChecks: ["sealed-gold-scoring", "matched-quadruplet-analysis", "independent-result-validation"]
  };
  const campaignReceipt = { ...campaignBody, campaignReceiptSha256: canonicalSha256(campaignBody) };
  await writeCampaignReceipt(outputRoot, campaignReceipt);
  return { ...campaignReceipt, resumedRunCount };
  } finally {
    if (typeof budgetLedger.close === "function") budgetLedger.close();
  }
}
