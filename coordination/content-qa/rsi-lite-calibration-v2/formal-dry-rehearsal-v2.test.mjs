import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createProviderCallRecordV2 } from "./call-record-contract.mjs";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import {
  buildCorePlanV2,
  buildRepeatPlanV2,
  runCoreCampaignV2,
  runRepeatCampaignV2
} from "./formal-campaign-v2.mjs";
import { loadFrozenCandidateBlindV2, loadVerifiedGoldAfterCampaignV2 } from "./formal-execution-v2.mjs";
import { scoreCalibrationV2 } from "./scoring.mjs";
import { createFrozenCandidateFixtureV2 } from "./test-fixtures.mjs";
import { createBudgetLedger } from "../rsi-lite-calibration-v1/f3-formal-runner.mjs";

test("rehearses all 72 core runs, six repeats, 189 successful calls, and sealed scoring without network", async () => {
  const taskTmp = process.env.TMPDIR;
  assert.ok(taskTmp && path.isAbsolute(taskTmp), "Rehearsal requires an explicit Starship TMPDIR.");
  const outputRoot = await mkdtemp(path.join(taskTmp, "mais-v2-full-rehearsal-"));
  try {
    const { candidateRoot } = await createFrozenCandidateFixtureV2(outputRoot);
    const frozen = await loadFrozenCandidateBlindV2({ candidateRoot });
    const repeatPlan = buildRepeatPlanV2({ sealedManifest: frozen.sealedManifest, candidateSetSha256: frozen.bundleReadiness.candidateSetSha256 });
    const authorizationBinding = { authorizationSha256: "a".repeat(64) };
    const corePlan = buildCorePlanV2({
      sealedManifest: frozen.sealedManifest,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256,
      authorizationBinding,
      repeatPlan
    });
    let responseCounter = 0;
    const providerAdapter = {
      executionMode: "offline-mock",
      provider: "DeepSeek",
      model: "deepseek-v4-pro",
      async runRole({ role, packageId, projection, maxOutputTokens, repeatGroupId }) {
        responseCounter += 1;
        const roleResult = {
          schemaVersion: 2,
          role,
          packageId,
          inspectionComplete: true,
          inspectedSurfaceIds: [
            ...(projection.questions ?? []).map((row) => row.id),
            ...(projection.lessons ?? []).map((row) => row.id)
          ],
          findings: []
        };
        const request = {
          provider: "DeepSeek",
          model: "deepseek-v4-pro",
          temperature: 0,
          topP: 1,
          maxOutputTokens,
          stream: true,
          requestedSeed: null,
          seedSupport: "not-assumed"
        };
        const callRecord = createProviderCallRecordV2({
          packageId,
          role,
          projectionSha256: canonicalSha256(projection),
          repeatGroupId,
          request,
          response: {
            responseId: `dry-response-${responseCounter}`,
            observedModel: "deepseek-v4-pro",
            createdAt: "2026-08-24T00:00:00.000Z",
            finishReason: "stop",
            usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, outputTokens: 20 }
          }
        });
        return {
          provider: "DeepSeek",
          requestedModel: "deepseek-v4-pro",
          requestBodySha256: canonicalSha256(request),
          projectionSha256: canonicalSha256(projection),
          providerResponseSha256: canonicalSha256(`dry-response-${responseCounter}`),
          latencyMs: 1,
          usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 },
          callRecord,
          roleResult
        };
      }
    };
    const budgetLedger = createBudgetLedger({
      caps: { currencyCapUsd: 25, providerCallCap: 220, tokenCap: 40_000_000 },
      pricesUsdPerMillion: { inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 }
    });
    const core = await runCoreCampaignV2({
      corePlan,
      outputRoot,
      loadPackage: async (packageId) => structuredClone(frozen.packages.get(packageId)),
      providerAdapter,
      budgetLedger,
      concurrency: 6
    });
    assert.equal(core.receipts.length, 72);
    assert.equal(core.successfulProviderCalls, 168);
    const repeats = await runRepeatCampaignV2({
      repeatPlan,
      coreReceipts: core.receipts,
      loadPackage: async (packageId) => structuredClone(frozen.packages.get(packageId)),
      outputRoot,
      providerAdapter,
      budgetLedger,
      concurrency: 3
    });
    assert.equal(repeats.receipts.length, 6);
    assert.equal(repeats.successfulProviderCalls, 21);
    assert.equal(responseCounter, 189);
    for (const receipt of [core, repeats, ...core.receipts, ...repeats.receipts]) {
      assert.equal(receipt.liveProviderUsed, false);
      assert.equal(receipt.formalExecutionAuthorized, false);
      assert.equal(receipt.executionMode, "offline-mock");
    }
    const gold = await loadVerifiedGoldAfterCampaignV2({
      candidateRoot,
      bundleReadiness: frozen.bundleReadiness,
      candidateSetSha256: frozen.bundleReadiness.candidateSetSha256
    });
    const score = scoreCalibrationV2({ runReceipts: core.receipts, goldInstances: gold.instances, expectedPackages: [...frozen.packages.values()] });
    assert.deepEqual(Object.values(score.armMetrics).map((row) => row.runs), [24, 24, 24]);
    assert.equal(JSON.parse(await readFile(path.join(outputRoot, "CORE-CAMPAIGN-COMMITTED.json"), "utf8")).runCount, 72);
    assert.equal(JSON.parse(await readFile(path.join(outputRoot, "REPEAT-CAMPAIGN-COMMITTED.json"), "utf8")).repeatRunCount, 6);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
