import { randomUUID } from "node:crypto";
import { access, chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalSha256 } from "./candidate-set-builder.mjs";
import {
  authorizationBindingV2,
  HARD_CAPS_V2,
  validateFormalAuthorizationV2,
  verifyAuthorizationCodeFilesV2
} from "./formal-authorization-v2.mjs";
import {
  buildCorePlanV2,
  buildRepeatPlanV2,
  collectCommittedCoreReceiptsV2,
  collectCommittedRepeatReceiptsV2,
  computeRepeatabilityV2,
  runCoreCampaignV2,
  runRepeatCampaignV2,
  sumReceiptUsageV2,
  validateRepeatPlanV2
} from "./formal-campaign-v2.mjs";
import { createDeepSeekProviderAdapterV2 } from "./provider-adapter-v2.mjs";
import { scoreCalibrationV2 } from "./scoring.mjs";
import { createPersistentF3BudgetLedger } from "../rsi-lite-calibration-v1/f3-persistent-budget-ledger.mjs";

export const ENFORCEMENT_PRICE_CEILING_V2 = Object.freeze({
  inputCacheHit: 0.044,
  inputCacheMiss: 1.32,
  output: 3.96
});

export const CURRENT_LISTED_PRICES_V2 = Object.freeze({
  inputCacheHit: 0.003625,
  inputCacheMiss: 0.435,
  output: 0.87,
  observedDate: "2026-08-24",
  source: "DeepSeek official Models & Pricing page"
});

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

export async function loadFrozenCandidateBlindV2({ candidateRoot }) {
  if (!path.isAbsolute(candidateRoot)) throw new Error("Frozen candidate root must be absolute.");
  const bundleReadiness = await readJson(path.join(candidateRoot, "BUNDLE-READINESS.json"));
  const { receiptSha256, ...receiptBody } = bundleReadiness;
  if (receiptSha256 !== canonicalSha256(receiptBody)) throw new Error("Bundle-readiness receipt self-hash drifted.");
  const publicManifest = await readJson(path.join(candidateRoot, "public-manifest.json"));
  const sealedManifest = await readJson(path.join(candidateRoot, "sealed-manifest.json"));
  if (canonicalSha256(publicManifest) !== bundleReadiness.publicManifestSha256 || canonicalSha256(sealedManifest) !== bundleReadiness.sealedManifestSha256) throw new Error("Frozen public or sealed manifest drifted.");
  if (publicManifest.candidateSetSha256 !== bundleReadiness.candidateSetSha256 || sealedManifest.candidateSetSha256 !== bundleReadiness.candidateSetSha256) throw new Error("Frozen candidate-set commitment drifted.");
  if (bundleReadiness.packageFileCount !== 72 || publicManifest.packages?.length !== 72 || sealedManifest.packageAssignments?.length !== 72) throw new Error("Frozen V2 package denominator drifted.");
  const packages = new Map();
  for (const row of publicManifest.packages) {
    if (!/^pkgv2-[a-f0-9]{20}$/.test(row.packageId)) throw new Error(`Unsafe frozen V2 package ID: ${row.packageId}.`);
    const content = await readJson(path.join(candidateRoot, "packages", `${row.packageId}.json`));
    if (content.packageId !== row.packageId || canonicalSha256(content) !== row.contentSha256) throw new Error(`Frozen V2 package content drifted: ${row.packageId}.`);
    const assignment = sealedManifest.packageAssignments.find((candidate) => candidate.packageId === row.packageId);
    if (!assignment || assignment.contentSha256 !== row.contentSha256) throw new Error(`Frozen V2 assignment drifted: ${row.packageId}.`);
    packages.set(row.packageId, content);
  }
  return { bundleReadiness, publicManifest, sealedManifest, packages };
}

export async function loadVerifiedGoldAfterCampaignV2({ candidateRoot, bundleReadiness, candidateSetSha256 }) {
  const goldLedger = await readJson(path.join(candidateRoot, "gold-ledger.json"));
  if (canonicalSha256(goldLedger) !== bundleReadiness.goldLedgerSha256 || goldLedger.candidateSetSha256 !== candidateSetSha256) throw new Error("Sealed gold ledger drifted before post-campaign scoring.");
  if (goldLedger.latentDefects?.length !== 108 || goldLedger.instances?.length !== 324) throw new Error("Sealed V2 gold denominator drifted.");
  return goldLedger;
}

export function assertOwnerCapsV2(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Budget snapshot is required.");
  if ((snapshot.activeReservations ?? 0) !== 0) throw new Error("Budget ledger still contains an active reservation.");
  if ((snapshot.providerCalls ?? 0) > HARD_CAPS_V2.providerAttemptCap) throw new Error(`Owner provider-attempt cap exceeded (${snapshot.providerCalls} > ${HARD_CAPS_V2.providerAttemptCap}).`);
  const accountedTokens = (snapshot.promptCacheHitTokens ?? 0)
    + (snapshot.promptCacheMissTokens ?? 0)
    + (snapshot.outputTokens ?? 0)
    + (snapshot.conservativeFailureDebitTokens ?? 0);
  if (accountedTokens > HARD_CAPS_V2.tokenCap) throw new Error(`Owner token cap exceeded (${accountedTokens} > ${HARD_CAPS_V2.tokenCap}).`);
  const accountedCostUsd = Number(((snapshot.apiCostUsd ?? 0) + (snapshot.conservativeFailureDebitUsd ?? 0)).toFixed(9));
  if (accountedCostUsd > HARD_CAPS_V2.currencyCapUsd) throw new Error(`Owner currency cap exceeded (${accountedCostUsd} > ${HARD_CAPS_V2.currencyCapUsd}).`);
  return true;
}

export function estimateCurrentListedPriceUsdV2(usage) {
  return Number(((
    (usage.promptCacheHitTokens ?? 0) * CURRENT_LISTED_PRICES_V2.inputCacheHit
    + (usage.promptCacheMissTokens ?? 0) * CURRENT_LISTED_PRICES_V2.inputCacheMiss
    + (usage.outputTokens ?? 0) * CURRENT_LISTED_PRICES_V2.output
  ) / 1_000_000).toFixed(9));
}

async function writeProtectedSingleton(filePath, value, hashKey) {
  if (await exists(filePath)) {
    const stored = await readJson(filePath);
    const { [hashKey]: storedHash, ...storedBody } = stored;
    if (storedHash !== canonicalSha256(storedBody) || storedHash !== value[hashKey]) throw new Error(`Protected formal output conflicts: ${path.basename(filePath)}.`);
    return stored;
  }
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
  await chmod(temporary, 0o600);
  await rename(temporary, filePath);
  await chmod(filePath, 0o600);
  return value;
}

function formalReport(body, hashKey) {
  return { ...body, [hashKey]: canonicalSha256(body) };
}

export const HISTORICAL_V2_LIVE_DISABLED = "Historical V2 live execution is disabled as of 2026-09-06; a separately reviewed current authorization and executable closure are required before restoration.";

// Fail before even inspecting caller arguments. Historical manifest validation
// is evidence of selected bytes, not current permission to execute a campaign.
export async function executeFormalCalibrationV2() {
  throw new Error(HISTORICAL_V2_LIVE_DISABLED);
}

// Preserved for historical interpretation; no exported path invokes this body.
async function historicalExecuteFormalCalibrationV2({
  apiKey,
  worktreeRoot,
  candidateRoot,
  authorizationPath,
  outputRoot,
  onProgress = () => {}
}) {
  if (typeof apiKey !== "string" || apiKey.trim() === "") throw new Error("DeepSeek API credential is absent.");
  for (const [label, value] of Object.entries({ worktreeRoot, candidateRoot, authorizationPath, outputRoot })) {
    if (!path.isAbsolute(value)) throw new Error(`${label} must be absolute.`);
  }
  const authorization = await readJson(authorizationPath);
  const authorizationIssues = validateFormalAuthorizationV2(authorization);
  if (authorizationIssues.length > 0) throw new Error(`Formal V2 authorization is invalid (${authorizationIssues.map((row) => row.code).join(",")}).`);
  if (authorization.worktreeIdentity.absolutePath !== worktreeRoot) throw new Error("Formal authorization belongs to a different isolated worktree.");
  await verifyAuthorizationCodeFilesV2({ authorization, worktreeRoot });
  const frozen = await loadFrozenCandidateBlindV2({ candidateRoot });
  if (
    frozen.bundleReadiness.receiptSha256 !== authorization.candidateBinding.bundleReadinessReceiptSha256
    || frozen.bundleReadiness.candidateSetSha256 !== authorization.candidateBinding.candidateSetSha256
  ) throw new Error("Formal authorization does not bind this frozen candidate set.");
  const repeatPlan = buildRepeatPlanV2({ sealedManifest: frozen.sealedManifest, candidateSetSha256: frozen.bundleReadiness.candidateSetSha256 });
  const repeatIssues = validateRepeatPlanV2(repeatPlan, frozen.sealedManifest, frozen.bundleReadiness.candidateSetSha256);
  if (repeatIssues.length > 0 || repeatPlan.repeatPlanSha256 !== authorization.repeatBinding.repeatPlanSha256) throw new Error("Formal repeat plan drifted from owner authorization.");
  const authorizationBinding = authorizationBindingV2(authorization);
  const corePlan = buildCorePlanV2({
    sealedManifest: frozen.sealedManifest,
    candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
    authorizationBinding,
    repeatPlan
  });
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await chmod(outputRoot, 0o700);
  const existingCore = await collectCommittedCoreReceiptsV2({ outputRoot, corePlan });
  const existingRepeats = await collectCommittedRepeatReceiptsV2({ outputRoot, repeatPlan, coreReceipts: existingCore });
  const committedUsage = sumReceiptUsageV2([...existingCore, ...existingRepeats]);
  const budgetLedger = createPersistentF3BudgetLedger({
    journalPath: path.join(outputRoot, ".V2-PERSISTENT-BUDGET-LEDGER.json"),
    binding: {
      protocolId: authorization.protocolId,
      authorizationSha256: authorization.authorizationSha256,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
      repeatPlanSha256: repeatPlan.repeatPlanSha256,
      codeManifestSha256: authorization.codeManifestSha256,
      outputRootSha256: canonicalSha256(outputRoot)
    },
    caps: {
      currencyCapUsd: HARD_CAPS_V2.currencyCapUsd,
      providerCallCap: HARD_CAPS_V2.providerAttemptCap,
      tokenCap: HARD_CAPS_V2.tokenCap
    },
    pricesUsdPerMillion: ENFORCEMENT_PRICE_CEILING_V2,
    committedUsage,
    priorUncommittedDebit: {},
    maxUncommittedProviderCalls: 43
  });
  try {
    const adapter = createDeepSeekProviderAdapterV2({ apiKey, model: "deepseek-v4-pro" });
    const coreCampaign = await runCoreCampaignV2({
      corePlan,
      outputRoot,
      loadPackage: async (packageId) => structuredClone(frozen.packages.get(packageId)),
      providerAdapter: adapter,
      budgetLedger,
      concurrency: authorization.executionControls.coreConcurrency,
      maxAttemptsPerRole: authorization.executionControls.maxAttemptsPerRole,
      onProgress
    });
    const repeatCampaign = await runRepeatCampaignV2({
      repeatPlan,
      coreReceipts: coreCampaign.receipts,
      outputRoot,
      providerAdapter: adapter,
      budgetLedger,
      concurrency: authorization.executionControls.repeatConcurrency,
      maxAttemptsPerRole: authorization.executionControls.maxAttemptsPerRole,
      onProgress
    });
    const budgetAudit = budgetLedger.auditSnapshot();
    assertOwnerCapsV2({ ...budgetAudit.usage, activeReservations: budgetAudit.activeReservations });
    const successfulUsage = sumReceiptUsageV2([...coreCampaign.receipts, ...repeatCampaign.receipts]);
    if (successfulUsage.providerCalls !== 189) throw new Error(`Formal successful-call target drifted (${successfulUsage.providerCalls} != 189).`);
    const goldLedger = await loadVerifiedGoldAfterCampaignV2({
      candidateRoot,
      bundleReadiness: frozen.bundleReadiness,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256
    });
    const score = scoreCalibrationV2({ runReceipts: coreCampaign.receipts, goldInstances: goldLedger.instances });
    const scoringReport = formalReport({
      ...score,
      status: "formal-synthetic-calibration-scoring-complete",
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
      coreCampaignReceiptSha256: coreCampaign.campaignReceiptSha256,
      goldLedgerSha256: frozen.bundleReadiness.goldLedgerSha256,
      repeatResultsExcludedFromCoreScoring: true
    }, "scoringReportSha256");
    const repeatability = computeRepeatabilityV2({ coreReceipts: coreCampaign.receipts, repeatReceipts: repeatCampaign.receipts });
    const repeatabilityReport = formalReport({
      ...repeatability,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
      repeatCampaignReceiptSha256: repeatCampaign.campaignReceiptSha256
    }, "repeatabilityReportSha256");
    await writeProtectedSingleton(path.join(outputRoot, "SCORING-REPORT.json"), scoringReport, "scoringReportSha256");
    await writeProtectedSingleton(path.join(outputRoot, "REPEATABILITY-REPORT.json"), repeatabilityReport, "repeatabilityReportSha256");
    const capAccountedTokens = budgetAudit.usage.promptCacheHitTokens
      + budgetAudit.usage.promptCacheMissTokens
      + budgetAudit.usage.outputTokens
      + budgetAudit.usage.conservativeFailureDebitTokens;
    const capAccountedCostUsd = Number((budgetAudit.usage.apiCostUsd + budgetAudit.usage.conservativeFailureDebitUsd).toFixed(9));
    const finalBody = {
      receiptType: "MAIS_RSI_LITE_CAL_V2_FORMAL_EXECUTION_FINAL",
      protocolId: authorization.protocolId,
      protocolVersion: authorization.protocolVersion,
      sourceBaseline: authorization.sourceBaseline,
      status: "formal-168-core-plus-21-repeat-successful-calls-complete",
      authorizationSha256: authorization.authorizationSha256,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
      repeatPlanSha256: repeatPlan.repeatPlanSha256,
      coreCampaignReceiptSha256: coreCampaign.campaignReceiptSha256,
      repeatCampaignReceiptSha256: repeatCampaign.campaignReceiptSha256,
      scoringReportSha256: scoringReport.scoringReportSha256,
      repeatabilityReportSha256: repeatabilityReport.repeatabilityReportSha256,
      successfulProviderCalls: { core: 168, repeat: 21, total: successfulUsage.providerCalls },
      providerAttempts: budgetAudit.usage.providerCalls,
      failedOrLostProviderAttempts: budgetAudit.usage.providerCalls - successfulUsage.providerCalls,
      successfulUsage: {
        promptCacheHitTokens: successfulUsage.promptCacheHitTokens,
        promptCacheMissTokens: successfulUsage.promptCacheMissTokens,
        outputTokens: successfulUsage.outputTokens,
        totalTokens: successfulUsage.totalTokens
      },
      capAccounting: {
        tokenCap: HARD_CAPS_V2.tokenCap,
        capAccountedTokens,
        currencyCapUsd: HARD_CAPS_V2.currencyCapUsd,
        enforcementPriceCeilingUsdPerMillion: { ...ENFORCEMENT_PRICE_CEILING_V2 },
        capAccountedCostUsd,
        providerAttemptCap: HARD_CAPS_V2.providerAttemptCap
      },
      currentListedPriceSuccessfulUsageEstimate: {
        estimatedUsd: estimateCurrentListedPriceUsdV2(successfulUsage),
        pricesUsdPerMillion: { ...CURRENT_LISTED_PRICES_V2 },
        billingClaim: false,
        note: "Estimate from successful-call token receipts only; provider invoice or balance deduction remains authoritative."
      },
      budgetLedgerAudit: budgetAudit,
      contentDecisionBoundary: {
        syntheticCalibrationCompleted: true,
        machineReviewerResultsAreAutomaticEvidence: true,
        productionContentAccepted: false,
        naturalQuestionBankGeneralizationProven: false,
        livePromotionAuthorized: false
      },
      prohibitedActionsObserved: {
        deploymentPerformed: false,
        gitStagePerformed: false,
        gitCommitPerformed: false,
        gitPushPerformed: false
      },
      secretHandling: {
        credentialSource: "owner-approved-local-DOCX",
        credentialPersisted: false,
        credentialPrinted: false,
        providerReasoningPersisted: false
      }
    };
    const finalReceipt = { ...finalBody, finalReceiptSha256: canonicalSha256(finalBody) };
    await writeProtectedSingleton(path.join(outputRoot, "FORMAL-EXECUTION-RECEIPT.json"), finalReceipt, "finalReceiptSha256");
    return { finalReceipt, scoringReport, repeatabilityReport };
  } finally {
    budgetLedger.close();
  }
}
