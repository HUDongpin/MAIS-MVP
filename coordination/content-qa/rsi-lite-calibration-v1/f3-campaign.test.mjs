import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runF3Campaign, validateF3CampaignPlan } from "./f3-campaign.mjs";
import { canonicalSha256 } from "./f3-formal-runner.mjs";

const ARMS = ["A", "B", "C0", "C"];
const PRICES = Object.freeze({ inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 });
const CAPS = Object.freeze({ providerCallCap: 200, tokenCap: 30_000_000, currencyCapUsd: 50 });
const CANDIDATE = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";

function formalPackage(packageId, index) {
  const questions = Array.from({ length: 100 }, (_, questionIndex) => {
    const answer = String(index + questionIndex + 2);
    return {
      id: `${packageId}-q-${questionIndex}`,
      type: "short-answer",
      gradeBand: "2",
      standardIds: ["2.NBT.5"],
      prompt: { en: `${index} + ${questionIndex + 2}`, zh: `${index} + ${questionIndex + 2}`, zhHans: `${index} + ${questionIndex + 2}` },
      answer,
      acceptedAnswers: [answer],
      answerContract: { canonicalAnswer: answer },
      explanation: { en: answer, zh: answer, zhHans: answer },
      evidenceSurface: { expectedLabel: answer, visibleLabel: answer },
      validation: { independentAnswer: answer, independentAnswerProvenance: "tool-derived-from-structured-model" },
      alignment: { grade: "2", primaryStandardId: "2.NBT.5" },
      templateTrace: { publicLabel: null },
      misconceptionMap: {}
    };
  });
  return {
    packageId,
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: "b6c7c347a49a813e454e707dd3c16399dcf29909",
    status: "candidate-only",
    integrationStatus: "candidate-only-not-live",
    region: ["CA", "HK", "MAINLAND"][index % 3],
    curriculumTrack: "fixture",
    publisher: "fixture",
    gradeBand: "2",
    questions,
    lessons: [0, 1].map((lessonIndex) => ({
      id: `${packageId}-lesson-${lessonIndex}`,
      gradeBand: "2",
      title: { en: "Addition", zh: "加法", zhHans: "加法" },
      alignment: { grade: "2", primaryStandardId: "2.NBT.5" },
      workedExample: {
        questionId: questions[lessonIndex].id,
        answer: questions[lessonIndex].answer,
        explanation: questions[lessonIndex].explanation
      }
    })),
    browserRoutes: []
  };
}

function campaignFixture() {
  const packages = new Map();
  const plan = [];
  for (let index = 0; index < 48; index += 1) {
    const packageId = `pkg-fixture-${String(index).padStart(2, "0")}`;
    const content = formalPackage(packageId, index);
    packages.set(packageId, content);
    plan.push({
      packageId,
      latentBundleId: `L${Math.floor(index / 4) + 1}`,
      region: content.region,
      variantId: `V${(index % 4) + 1}`,
      arm: ARMS[index % 4],
      contentSha256: canonicalSha256(content)
    });
  }
  return { plan, packages };
}

function countingAdapter(counter) {
  return {
    provider: "fixture-provider",
    model: "fixture-model",
    async runRole({ role, packageId, projection }) {
      counter.calls += 1;
      const inspectedSurfaceIds = [...(projection.questions ?? []).map((row) => row.id), ...(projection.lessons ?? []).map((row) => row.id)];
      return {
        provider: "fixture-provider",
        model: "fixture-model",
        systemFingerprint: "fixture",
        providerRequestId: `fixture-${counter.calls}`,
        finishReason: "stop",
        latencyMs: 0,
        usage: { promptCacheHitTokens: 0, promptCacheMissTokens: 100, completionTokens: 20, totalTokens: 120 },
        providerResponseSha256: "b".repeat(64),
        roleResult: { schemaVersion: 1, role, packageId, inspectionComplete: true, inspectedSurfaceIds, findings: [] }
      };
    }
  };
}

test("campaign plan requires exactly 48 unique runs with 12 per frozen arm", () => {
  const { plan } = campaignFixture();
  assert.deepEqual(validateF3CampaignPlan(plan), { A: 12, B: 12, C0: 12, C: 12 });
  assert.throws(() => validateF3CampaignPlan(plan.slice(1)), /exactly 48/i);
  assert.throws(() => validateF3CampaignPlan([...plan.slice(0, -1), plan[0]]), /duplicate/i);
  const imbalanced = structuredClone(plan);
  imbalanced[0].arm = "B";
  assert.throws(() => validateF3CampaignPlan(imbalanced), /12 per arm/i);
});

test("always closes a factory-owned persistent ledger when campaign execution fails", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-campaign-close-test-"));
  let closeCount = 0;
  try {
    const { plan } = campaignFixture();
    await assert.rejects(
      runF3Campaign({
        plan,
        candidateSetSha256: CANDIDATE,
        outputRoot: temporaryRoot,
        loadPackage: async () => {
          throw new Error("fixture package-load failure");
        },
        providerAdapter: countingAdapter({ calls: 0 }),
        caps: CAPS,
        pricesUsdPerMillion: PRICES,
        concurrency: 1,
        budgetLedgerFactory: () => ({
          reserve() {
            throw new Error("fixture ledger should not be used");
          },
          close() {
            closeCount += 1;
          }
        })
      }),
      /package-load failure/i
    );
    assert.equal(closeCount, 1);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});

test("the same campaign path commits 48 runs, makes exactly 144 provider calls, and resumes without another call", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-f3-campaign-test-"));
  try {
    const { plan, packages } = campaignFixture();
    const firstCounter = { calls: 0 };
    const first = await runF3Campaign({
      plan,
      candidateSetSha256: CANDIDATE,
      outputRoot: temporaryRoot,
      loadPackage: async (packageId) => structuredClone(packages.get(packageId)),
      providerAdapter: countingAdapter(firstCounter),
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      concurrency: 2
    });
    assert.equal(firstCounter.calls, 144);
    assert.equal(first.receiptCount, 48);
    assert.equal(first.resumedRunCount, 0);
    assert.deepEqual(first.runCountsByArm, { A: 12, B: 12, C0: 12, C: 12 });
    assert.equal(first.resourceUsage.providerCalls, 144);
    assert.equal(first.resourceUsage.browserLaunches, 0);

    const secondCounter = { calls: 0 };
    const resumed = await runF3Campaign({
      plan,
      candidateSetSha256: CANDIDATE,
      outputRoot: temporaryRoot,
      loadPackage: async (packageId) => structuredClone(packages.get(packageId)),
      providerAdapter: countingAdapter(secondCounter),
      caps: CAPS,
      pricesUsdPerMillion: PRICES,
      concurrency: 2
    });
    assert.equal(secondCounter.calls, 0);
    assert.equal(resumed.receiptCount, 48);
    assert.equal(resumed.resumedRunCount, 48);
    assert.equal(resumed.campaignReceiptSha256, first.campaignReceiptSha256);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
