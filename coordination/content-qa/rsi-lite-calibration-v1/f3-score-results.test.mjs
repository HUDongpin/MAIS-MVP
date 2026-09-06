import assert from "node:assert/strict";
import test from "node:test";

import { scoreF3CampaignResults } from "./f3-score-results.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const ARMS = ["A", "B", "C0", "C"];
const CANDIDATE = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";

function fixture() {
  const assignments = [];
  const latentBundles = [];
  const latentDefects = [];
  const instances = [];
  const receipts = [];
  const detections = { A: 3, B: 5, C0: 6, C: 8 };
  const falsePositiveBundles = { A: new Set(), B: new Set([0]), C0: new Set([0, 1]), C: new Set([0]) };
  for (let bundleIndex = 0; bundleIndex < 12; bundleIndex += 1) {
    const latentBundleId = `L${bundleIndex + 1}`;
    latentBundles.push({ id: latentBundleId, region: ["CA", "HK", "MAINLAND"][bundleIndex % 3], status: bundleIndex < 9 ? "defect-bearing" : "clean" });
    const latentDefectId = `ld-${bundleIndex}`;
    if (bundleIndex < 9) latentDefects.push({ id: latentDefectId, latentBundleId, family: "F1", severity: "P0" });
    for (const [armIndex, arm] of ARMS.entries()) {
      const packageId = `pkg-${String(bundleIndex).padStart(2, "0")}-${arm.toLowerCase()}`;
      const goldSurfaceId = `${packageId}-gold`;
      const cleanSurfaceId = `${packageId}-clean`;
      assignments.push({ packageId, latentBundleId, arm, variantId: `V${armIndex + 1}`, region: latentBundles.at(-1).region });
      if (bundleIndex < 9) instances.push({ id: `di-${bundleIndex}-${arm}`, latentDefectId, packageId, arm, surfaceId: goldSurfaceId, family: "F1", severity: "P0" });
      const foundGold = bundleIndex < detections[arm];
      const foundClean = falsePositiveBundles[arm].has(bundleIndex);
      const findings = [
        ...(foundGold ? [{ findingId: `${packageId}-tp`, surfaceId: goldSurfaceId, severity: "P0", code: "detected", sourceRole: "fixture" }] : []),
        ...(foundClean ? [{ findingId: `${packageId}-fp`, surfaceId: cleanSurfaceId, severity: "P2", code: "false-positive", sourceRole: "fixture" }] : [])
      ];
      const body = {
        protocolId: "MAIS-RSI-LITE-CAL-V1",
        protocolVersion: "1.1.1-f2-r",
        executionAmendmentId: "MAIS-RSI-LITE-CAL-V1-F3-1",
        sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
        candidateSetSha256: CANDIDATE,
        runId: `f3-${arm.toLowerCase()}-${packageId}`,
        packageId,
        latentBundleId,
        arm,
        status: "formal-evaluation-run-complete",
        surfaceResults: [
          { surfaceId: goldSurfaceId, disposition: foundGold ? "finding" : "clean-with-evidence" },
          { surfaceId: cleanSurfaceId, disposition: foundClean ? "finding" : "clean-with-evidence" }
        ],
        findings,
        resourceUsage: { providerCalls: arm === "A" ? 0 : arm === "B" ? 2 : 5, promptCacheHitTokens: 0, promptCacheMissTokens: 100, outputTokens: 20, apiCostUsd: arm === "A" ? 0 : 0.01, childProcesses: arm === "C" ? 5 : 0, browserLaunches: 0, liveLatencyMilliseconds: 10 },
        completionClaim: { executionComplete: true, contentAccepted: false }
      };
      receipts.push({ ...body, receiptSha256: canonicalSha256(body) });
    }
  }
  const campaignBody = {
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    executionAmendmentId: "MAIS-RSI-LITE-CAL-V1-F3-1",
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    candidateSetSha256: CANDIDATE,
    status: "formal-48-run-execution-complete",
    receiptCount: 48,
    completionClaim: { executionComplete: true, goldScoringComplete: false },
    runReceipts: receipts.map((row) => ({ packageId: row.packageId, arm: row.arm, receiptSha256: row.receiptSha256 }))
  };
  return {
    campaignReceipt: { ...campaignBody, campaignReceiptSha256: canonicalSha256(campaignBody) },
    runReceipts: receipts,
    sealedManifest: { protocolId: campaignBody.protocolId, protocolVersion: campaignBody.protocolVersion, sourceBaseline: campaignBody.sourceBaseline, candidateSetSha256: CANDIDATE, latentBundles, packageAssignments: assignments },
    goldLedger: { protocolId: campaignBody.protocolId, protocolVersion: campaignBody.protocolVersion, sourceBaseline: campaignBody.sourceBaseline, candidateSetSha256: CANDIDATE, status: "sealed-candidate-gold-not-adjudicated", latentDefects, instances }
  };
}

test("scores exact surface-level sensitivity, specificity, false positives, cost, and matched C contrasts without treating synthetic gold as adjudicated", () => {
  const result = scoreF3CampaignResults(fixture());
  assert.equal(result.runCount, 48);
  assert.equal(result.matchedLatentBundleCount, 12);
  assert.equal(result.matchedLatentDefectCount, 9);
  assert.deepEqual(Object.fromEntries(ARMS.map((arm) => [arm, result.armMetrics[arm].truePositives])), { A: 3, B: 5, C0: 6, C: 8 });
  assert.deepEqual(Object.fromEntries(ARMS.map((arm) => [arm, result.armMetrics[arm].falsePositives])), { A: 0, B: 1, C0: 2, C: 1 });
  assert.equal(result.armMetrics.C.sensitivity, 8 / 9);
  assert.equal(result.armMetrics.C.specificity, 14 / 15);
  assert.equal(result.matchedComparisons.C_vs_A.cWins, 5);
  assert.equal(result.matchedComparisons.C_vs_A.otherWins, 0);
  assert.equal(result.matchedComparisons.C_vs_A.exactMcNemarP, 0.0625);
  assert.equal(result.goldStatus, "synthetic-induced-gold-not-independent-human-adjudicated");
  assert.equal(result.claimBoundary.definitiveCausalClaim, false);
});

test("scoring fails closed before a complete 48-run campaign or when a committed run receipt drifts", () => {
  const incomplete = fixture();
  incomplete.campaignReceipt.status = "running";
  assert.throws(() => scoreF3CampaignResults(incomplete), /campaign.*complete/i);

  const drifted = fixture();
  drifted.runReceipts[0].surfaceResults[0].disposition = "clean-with-evidence";
  assert.throws(() => scoreF3CampaignResults(drifted), /receipt.*hash/i);
});
