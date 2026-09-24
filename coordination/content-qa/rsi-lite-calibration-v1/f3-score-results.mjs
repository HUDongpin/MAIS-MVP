import { canonicalSha256 } from "./f3-formal-runner.mjs";

const PROTOCOL_ID = "MAIS-RSI-LITE-CAL-V1";
const PROTOCOL_VERSION = "1.1.1-f2-r";
const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const CANDIDATE_SET_SHA256 = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";
const ARMS = Object.freeze(["A", "B", "C0", "C"]);

function assertBinding(value, label) {
  if (
    !value
    || value.protocolId !== PROTOCOL_ID
    || value.protocolVersion !== PROTOCOL_VERSION
    || value.sourceBaseline !== SOURCE_BASELINE
    || value.candidateSetSha256 !== CANDIDATE_SET_SHA256
  ) throw new Error(`${label} is not bound to the frozen F3 candidate.`);
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function binomialCoefficient(n, k) {
  const reduced = Math.min(k, n - k);
  let value = 1;
  for (let index = 1; index <= reduced; index += 1) value = value * (n - reduced + index) / index;
  return value;
}

function exactMcNemarP(leftWins, rightWins) {
  const discordant = leftWins + rightWins;
  if (discordant === 0) return 1;
  const tail = Math.min(leftWins, rightWins);
  let cumulative = 0;
  for (let count = 0; count <= tail; count += 1) cumulative += binomialCoefficient(discordant, count) / (2 ** discordant);
  return Math.min(1, 2 * cumulative);
}

function validateRunReceipts(campaignReceipt, runReceipts, sealedManifest) {
  if (!Array.isArray(runReceipts) || runReceipts.length !== 48) throw new Error("Scoring requires exactly 48 run receipts.");
  const assignments = new Map(sealedManifest.packageAssignments.map((row) => [row.packageId, row]));
  if (assignments.size !== 48) throw new Error("Sealed assignment denominator is not exactly 48 unique packages.");
  const campaignRows = new Map(campaignReceipt.runReceipts.map((row) => [row.packageId, row]));
  if (campaignRows.size !== 48) throw new Error("Campaign commit does not bind exactly 48 unique receipts.");
  const seen = new Set();
  for (const receipt of runReceipts) {
    assertBinding(receipt, `run receipt ${receipt?.packageId ?? "<unknown>"}`);
    const { receiptSha256, ...body } = receipt;
    if (receiptSha256 !== canonicalSha256(body)) throw new Error(`Run receipt hash drifted for ${receipt.packageId}.`);
    if (seen.has(receipt.packageId)) throw new Error(`Duplicate run receipt for ${receipt.packageId}.`);
    seen.add(receipt.packageId);
    const assignment = assignments.get(receipt.packageId);
    const campaignRow = campaignRows.get(receipt.packageId);
    if (!assignment || assignment.arm !== receipt.arm || receipt.latentBundleId !== assignment.latentBundleId) throw new Error(`Run receipt assignment drifted for ${receipt.packageId}.`);
    if (!campaignRow || campaignRow.receiptSha256 !== receiptSha256 || campaignRow.arm !== receipt.arm) throw new Error(`Campaign-to-run receipt binding drifted for ${receipt.packageId}.`);
    if (receipt.status !== "formal-evaluation-run-complete" || receipt.completionClaim?.executionComplete !== true) throw new Error(`Run receipt is incomplete for ${receipt.packageId}.`);
    const surfaces = receipt.surfaceResults;
    if (!Array.isArray(surfaces) || new Set(surfaces.map((row) => row.surfaceId)).size !== surfaces.length || surfaces.some((row) => !["finding", "clean-with-evidence"].includes(row.disposition))) {
      throw new Error(`Run receipt has an incomplete or duplicate surface denominator for ${receipt.packageId}.`);
    }
    if (receipt.resourceUsage?.browserLaunches !== 0) throw new Error(`Run receipt escaped the zero-browser estimand for ${receipt.packageId}.`);
  }
  return assignments;
}

function armMetrics(arm, receipts, goldInstances) {
  const armReceipts = receipts.filter((receipt) => receipt.arm === arm);
  const allSurfaceIds = new Set(armReceipts.flatMap((receipt) => receipt.surfaceResults.map((row) => row.surfaceId)));
  const predictedPositive = new Set(armReceipts.flatMap((receipt) => receipt.surfaceResults.filter((row) => row.disposition === "finding").map((row) => row.surfaceId)));
  const goldPositive = new Set(goldInstances.filter((instance) => instance.arm === arm).map((instance) => instance.surfaceId));
  const truePositives = [...goldPositive].filter((surfaceId) => predictedPositive.has(surfaceId)).length;
  const falseNegatives = goldPositive.size - truePositives;
  const falsePositives = [...predictedPositive].filter((surfaceId) => !goldPositive.has(surfaceId)).length;
  const trueNegatives = allSurfaceIds.size - goldPositive.size - falsePositives;
  const sensitivity = ratio(truePositives, truePositives + falseNegatives);
  const specificity = ratio(trueNegatives, trueNegatives + falsePositives);
  const precision = ratio(truePositives, truePositives + falsePositives);
  const f1 = precision === null || sensitivity === null || precision + sensitivity === 0 ? null : 2 * precision * sensitivity / (precision + sensitivity);
  const resourceUsage = armReceipts.reduce((total, receipt) => {
    total.providerCalls += receipt.resourceUsage.providerCalls;
    total.inputTokens += receipt.resourceUsage.promptCacheHitTokens + receipt.resourceUsage.promptCacheMissTokens;
    total.outputTokens += receipt.resourceUsage.outputTokens;
    total.apiCostUsd = Number((total.apiCostUsd + receipt.resourceUsage.apiCostUsd).toFixed(9));
    total.childProcesses += receipt.resourceUsage.childProcesses;
    total.liveLatencyMilliseconds += receipt.resourceUsage.liveLatencyMilliseconds;
    return total;
  }, { providerCalls: 0, inputTokens: 0, outputTokens: 0, apiCostUsd: 0, childProcesses: 0, liveLatencyMilliseconds: 0 });
  return {
    runs: armReceipts.length,
    totalSurfaces: allSurfaceIds.size,
    goldPositiveSurfaces: goldPositive.size,
    truePositives,
    falseNegatives,
    falsePositives,
    trueNegatives,
    sensitivity,
    specificity,
    precision,
    f1,
    falsePositiveRate: ratio(falsePositives, falsePositives + trueNegatives),
    resourceUsage,
    meanProviderCallsPerRun: resourceUsage.providerCalls / armReceipts.length,
    meanPeakPriceCostUsdPerRun: resourceUsage.apiCostUsd / armReceipts.length,
    meanLiveLatencyMillisecondsPerRun: resourceUsage.liveLatencyMilliseconds / armReceipts.length
  };
}

function matchedComparisons(runReceipts, goldLedger) {
  const receiptByPackage = new Map(runReceipts.map((receipt) => [receipt.packageId, receipt]));
  const instancesByLatentDefect = Map.groupBy(goldLedger.instances, (row) => row.latentDefectId);
  const detectionRows = [];
  for (const [latentDefectId, instances] of instancesByLatentDefect) {
    if (instances.length !== 4 || new Set(instances.map((row) => row.arm)).size !== 4) throw new Error(`Latent defect ${latentDefectId} is not matched across all four arms.`);
    const detected = {};
    for (const instance of instances) {
      const receipt = receiptByPackage.get(instance.packageId);
      detected[instance.arm] = receipt.surfaceResults.some((row) => row.surfaceId === instance.surfaceId && row.disposition === "finding");
    }
    detectionRows.push({ latentDefectId, detected });
  }
  return Object.fromEntries(["A", "B", "C0"].map((otherArm) => {
    let cWins = 0;
    let otherWins = 0;
    let bothDetect = 0;
    let neitherDetect = 0;
    for (const row of detectionRows) {
      const c = row.detected.C;
      const other = row.detected[otherArm];
      if (c && !other) cWins += 1;
      else if (!c && other) otherWins += 1;
      else if (c && other) bothDetect += 1;
      else neitherDetect += 1;
    }
    return [`C_vs_${otherArm}`, {
      matchedDefects: detectionRows.length,
      cWins,
      otherWins,
      bothDetect,
      neitherDetect,
      pairedDetectionDifference: ratio(cWins - otherWins, detectionRows.length),
      discordantPairs: cWins + otherWins,
      exactMcNemarP: exactMcNemarP(cWins, otherWins),
      inferenceStatus: "exploratory-small-cluster-feasibility"
    }];
  }));
}

export function scoreF3CampaignResults({ campaignReceipt, runReceipts, sealedManifest, goldLedger }) {
  assertBinding(campaignReceipt, "campaign receipt");
  if (campaignReceipt.status !== "formal-48-run-execution-complete" || campaignReceipt.receiptCount !== 48 || campaignReceipt.completionClaim?.executionComplete !== true) {
    throw new Error("Campaign is not complete; sealed gold scoring is forbidden.");
  }
  const { campaignReceiptSha256, ...campaignBody } = campaignReceipt;
  if (campaignReceiptSha256 !== canonicalSha256(campaignBody)) throw new Error("Campaign receipt self-hash is invalid.");
  assertBinding(sealedManifest, "sealed manifest");
  assertBinding(goldLedger, "gold ledger");
  const assignments = validateRunReceipts(campaignReceipt, runReceipts, sealedManifest);
  if (!Array.isArray(goldLedger.instances) || !Array.isArray(goldLedger.latentDefects)) throw new Error("Gold ledger denominator is missing.");
  for (const instance of goldLedger.instances) {
    const assignment = assignments.get(instance.packageId);
    if (!assignment || assignment.arm !== instance.arm) throw new Error(`Gold instance assignment drifted for ${instance.id}.`);
  }
  const metrics = Object.fromEntries(ARMS.map((arm) => [arm, armMetrics(arm, runReceipts, goldLedger.instances)]));
  if (ARMS.some((arm) => metrics[arm].runs !== 12)) throw new Error("Scored result is not balanced at 12 runs per arm.");
  const comparisons = matchedComparisons(runReceipts, goldLedger);
  const ranked = [...ARMS].sort((left, right) => (metrics[right].sensitivity ?? -1) - (metrics[left].sensitivity ?? -1) || (metrics[left].falsePositiveRate ?? 1) - (metrics[right].falsePositiveRate ?? 1));
  const body = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256: CANDIDATE_SET_SHA256,
    status: "formal-48-run-synthetic-gold-scoring-complete",
    campaignReceiptSha256,
    runCount: runReceipts.length,
    runCountsByArm: Object.fromEntries(ARMS.map((arm) => [arm, metrics[arm].runs])),
    matchedLatentBundleCount: sealedManifest.latentBundles.length,
    matchedLatentDefectCount: goldLedger.latentDefects.length,
    defectInstanceCount: goldLedger.instances.length,
    goldStatus: "synthetic-induced-gold-not-independent-human-adjudicated",
    armMetrics: metrics,
    matchedComparisons: comparisons,
    armRankingBySensitivityThenFalsePositiveRate: ranked,
    incrementalSensitivityVsA: Object.fromEntries(["B", "C0", "C"].map((arm) => [arm, metrics[arm].sensitivity - metrics.A.sensitivity])),
    claimBoundary: {
      feasibilityCalibrationOnly: true,
      definitiveCausalClaim: false,
      naturalQuestionBankGeneralizationClaim: false,
      independentHumanGoldClaim: false,
      browserQualityClaim: false,
      productionReadinessClaim: false
    },
    interpretationRule: "Use matched detection gain, false-positive burden, runtime reliability, latency, and cost jointly. Do not select an arm from sensitivity alone."
  };
  return { ...body, resultSha256: canonicalSha256(body) };
}
