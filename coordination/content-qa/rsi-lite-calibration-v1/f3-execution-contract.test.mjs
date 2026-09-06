import assert from "node:assert/strict";
import test from "node:test";

import {
  F3_EXECUTION_AMENDMENT_ID,
  accumulateProviderUsage,
  assertBudgetReservationAllowed,
  buildF3RunPlan,
  buildRoleProjection,
  estimateF3Budget,
  validateRoleResult
} from "./f3-execution-contract.mjs";

const SOURCE_BASELINE = "b6c7c347a49a813e454e707dd3c16399dcf29909";
const CANDIDATE_SHA = "e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c";
const ARMS = ["A", "B", "C0", "C"];

function syntheticManifest() {
  const packageAssignments = [];
  const packages = [];
  for (let cluster = 0; cluster < 12; cluster += 1) {
    for (let variant = 0; variant < 4; variant += 1) {
      const packageId = `pkg-${String(cluster).padStart(2, "0")}-${variant}`;
      packageAssignments.push({
        packageId,
        latentBundleId: `latent-${String(cluster).padStart(2, "0")}`,
        region: ["california", "hong-kong", "mainland"][Math.floor(cluster / 4)],
        variantId: `V${variant + 1}`,
        arm: ARMS[(cluster + variant) % ARMS.length],
        status: cluster % 4 === 3 ? "clean" : "defect-bearing",
        defectBlock: cluster % 4 === 3 ? "clean" : "D1"
      });
      packages.push({ packageId, contentSha256: String(cluster * 4 + variant).padStart(64, "0") });
    }
  }
  return {
    sealedManifest: {
      protocolId: "MAIS-RSI-LITE-CAL-V1",
      protocolVersion: "1.1.1-f2-r",
      sourceBaseline: SOURCE_BASELINE,
      candidateSetSha256: CANDIDATE_SHA,
      packageAssignments
    },
    publicManifest: {
      protocolId: "MAIS-RSI-LITE-CAL-V1",
      protocolVersion: "1.1.1-f2-r",
      sourceBaseline: SOURCE_BASELINE,
      candidateSetSha256: CANDIDATE_SHA,
      counts: { independentClusters: 12, packages: 48, questions: 4_800, lessons: 96, browserRoutes: 0 },
      packages
    }
  };
}

function samplePackage() {
  return {
    packageId: "pkg-safe",
    protocolId: "MAIS-RSI-LITE-CAL-V1",
    protocolVersion: "1.1.1-f2-r",
    sourceBaseline: SOURCE_BASELINE,
    region: "california",
    curriculumTrack: "California Common Core",
    publisher: "owner-authored-synthetic",
    gradeBand: "Grade 4",
    questions: [
      {
        id: "q-1",
        type: "multiple-choice",
        gradeBand: "Grade 4",
        standardIds: ["4.NF.3"],
        alignment: { grade: "4", primaryStandardId: "4.NF.3", sourceLocator: "official", humanRatificationRequired: true },
        prompt: { en: "What is 1/4 + 1/4?", zh: "四分之一加四分之一是多少？", zhHans: "四分之一加四分之一是多少？" },
        answer: "1/2",
        acceptedAnswers: ["1/2", "2/4"],
        answerContract: { canonicalAnswer: "1/2", normalizationRule: "fraction-equivalence" },
        options: ["1/2", "1/4", "3/4", "1"].map((value) => ({ en: value, zh: value, zhHans: value })),
        explanation: { en: "1/4 + 1/4 = 2/4 = 1/2.", zh: "1/4 + 1/4 = 2/4 = 1/2。", zhHans: "1/4 + 1/4 = 2/4 = 1/2。" },
        misconceptionMap: { id: "fraction-addition", primary: "add-denominators" },
        evidenceSurface: { kind: "equation-result-label", expectedLabel: "1/2", visibleLabel: "1/2" },
        templateTrace: { publicLabel: "fraction-practice" },
        homologyContract: { knowledgeComponent: "fraction-addition", reasoningStepCount: 2 },
        validation: { independentAnswer: "1/2", independentAnswerProvenance: "tool-derived", sourceDistance: "synthetic" }
      }
    ],
    lessons: [
      {
        id: "lesson-1",
        gradeBand: "Grade 4",
        alignment: { grade: "4", primaryStandardId: "4.NF.3" },
        title: { en: "Adding like fractions", zh: "同分母分數加法", zhHans: "同分母分数加法" },
        workedExample: { questionId: "q-1", answer: "1/2", explanation: { en: "Reduce 2/4.", zh: "約簡 2/4。", zhHans: "约分 2/4。" } }
      }
    ],
    browserRoutes: []
  };
}

function objectKeysDeep(value, into = []) {
  if (Array.isArray(value)) {
    for (const row of value) objectKeysDeep(row, into);
  } else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      into.push(key);
      objectKeysDeep(child, into);
    }
  }
  return into;
}

test("builds an exact forty-eight-run plan without leaking concealed defect labels", () => {
  const { sealedManifest, publicManifest } = syntheticManifest();
  const plan = buildF3RunPlan({ sealedManifest, publicManifest });

  assert.equal(F3_EXECUTION_AMENDMENT_ID, "MAIS-RSI-LITE-CAL-V1-F3-1");
  assert.equal(plan.length, 48);
  assert.deepEqual(Object.fromEntries(ARMS.map((arm) => [arm, plan.filter((row) => row.arm === arm).length])), {
    A: 12,
    B: 12,
    C0: 12,
    C: 12
  });
  assert.equal(new Set(plan.map((row) => row.packageId)).size, 48);
  assert.equal(plan.some((row) => "defectBlock" in row || "status" in row || "gold" in row), false);
});

test("rejects a duplicate, missing, or candidate-drifted run plan before execution", () => {
  const duplicate = syntheticManifest();
  duplicate.sealedManifest.packageAssignments[1].packageId = duplicate.sealedManifest.packageAssignments[0].packageId;
  assert.throws(() => buildF3RunPlan(duplicate), /duplicate package assignment/i);

  const missing = syntheticManifest();
  missing.sealedManifest.packageAssignments.pop();
  assert.throws(() => buildF3RunPlan(missing), /exactly 48/i);

  const drifted = syntheticManifest();
  drifted.publicManifest.candidateSetSha256 = "f".repeat(64);
  assert.throws(() => buildF3RunPlan(drifted), /candidate-set/i);
});

test("answer-blind projection structurally excludes stored answers, explanations, validation, and evidence labels", () => {
  const projection = buildRoleProjection({ role: "answer-blind-solver", packageContent: samplePackage() });
  const keys = new Set(objectKeysDeep(projection));

  for (const forbidden of ["answer", "acceptedAnswers", "answerContract", "explanation", "validation", "evidenceSurface", "workedExample"]) {
    assert.equal(keys.has(forbidden), false, `${forbidden} leaked into answer-blind input`);
  }
  assert.deepEqual(projection.questions[0].prompt, samplePackage().questions[0].prompt);
  assert.deepEqual(projection.questions[0].options, samplePackage().questions[0].options);
});

test("C0 and C receive byte-identical role projections while concealed assignment data stays controller-only", () => {
  const content = samplePackage();
  for (const role of ["answer-blind-solver", "tool-verifier", "adversarial-grader", "bilingual-curriculum-critic", "evidence-verifier"]) {
    const c0 = buildRoleProjection({ arm: "C0", role, packageContent: content });
    const c = buildRoleProjection({ arm: "C", role, packageContent: content });
    assert.deepEqual(c0, c);
    const keys = new Set(objectKeysDeep(c));
    for (const forbidden of ["arm", "variantId", "latentBundleId", "defectBlock", "goldLedger", "randomizationSeed"]) {
      assert.equal(keys.has(forbidden), false, `${forbidden} leaked into ${role}`);
    }
  }
});

test("estimates a 144-call campaign and rounds conservative peak-price caps upward", () => {
  const estimate = estimateF3Budget({
    runCountsByArm: { A: 12, B: 12, C0: 12, C: 12 },
    estimatedInputTokensPerProviderCall: 112_388,
    maxOutputTokensPerProviderCall: 16_000,
    pricesUsdPerMillion: {
      offPeakInputCacheMiss: 0.66,
      peakInputCacheMiss: 1.32,
      offPeakOutput: 1.98,
      peakOutput: 3.96
    }
  });

  assert.equal(estimate.plannedProviderCalls, 144);
  assert.equal(estimate.providerCallCap, 200);
  assert.equal(estimate.tokenCap, 30_000_000);
  assert.equal(estimate.currencyCapUsd, 50);
  assert.equal(estimate.browserMinutesCap, 0);
  assert.equal(estimate.expectedOffPeakCostUsd > 0, true);
  assert.equal(estimate.peakCostBeforeSafetyUsd > estimate.expectedOffPeakCostUsd, true);
  assert.equal(estimate.currencyCapUsd > estimate.peakCostBeforeSafetyUsd, true);
});

test("budget reservation fails before a provider call can cross any hard cap", () => {
  const caps = { providerCallCap: 2, tokenCap: 1_000, currencyCapUsd: 1 };
  const prices = { inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 };
  const usage = { providerCalls: 1, promptCacheHitTokens: 0, promptCacheMissTokens: 400, outputTokens: 100, apiCostUsd: 0.001 };

  assert.doesNotThrow(() => assertBudgetReservationAllowed({ usage, reservation: { providerCalls: 1, maxInputTokens: 100, maxOutputTokens: 50 }, caps, pricesUsdPerMillion: prices }));
  assert.throws(() => assertBudgetReservationAllowed({ usage, reservation: { providerCalls: 2, maxInputTokens: 100, maxOutputTokens: 50 }, caps, pricesUsdPerMillion: prices }), /provider-call cap/i);
  assert.throws(() => assertBudgetReservationAllowed({ usage, reservation: { providerCalls: 1, maxInputTokens: 600, maxOutputTokens: 50 }, caps, pricesUsdPerMillion: prices }), /token cap/i);
  const currencyOnlyCaps = { ...caps, tokenCap: 1_000_000 };
  assert.throws(() => assertBudgetReservationAllowed({ usage, reservation: { providerCalls: 1, maxInputTokens: 100, maxOutputTokens: 300_000 }, caps: currencyOnlyCaps, pricesUsdPerMillion: prices }), /currency cap/i);
});

test("provider usage accounting separates cache hit, cache miss, output, and exact API cost", () => {
  const next = accumulateProviderUsage({
    usage: { providerCalls: 2, promptCacheHitTokens: 10, promptCacheMissTokens: 20, outputTokens: 30, apiCostUsd: 0.5 },
    providerUsage: { promptCacheHitTokens: 100, promptCacheMissTokens: 200, completionTokens: 50 },
    pricesUsdPerMillion: { inputCacheHit: 0.044, inputCacheMiss: 1.32, output: 3.96 }
  });

  assert.deepEqual(next, {
    providerCalls: 3,
    promptCacheHitTokens: 110,
    promptCacheMissTokens: 220,
    outputTokens: 80,
    apiCostUsd: 0.500_466_4
  });
});

test("role-result validation rejects missing surfaces, unknown findings, duplicate IDs, and gold-shaped output", () => {
  const expectedSurfaceIds = ["q-1", "lesson-1"];
  const valid = {
    schemaVersion: 1,
    role: "evidence-verifier",
    packageId: "pkg-safe",
    inspectionComplete: true,
    inspectedSurfaceIds: expectedSurfaceIds,
    findings: []
  };
  assert.deepEqual(validateRoleResult({ result: valid, role: "evidence-verifier", packageId: "pkg-safe", expectedSurfaceIds }), []);

  assert.match(validateRoleResult({ result: { ...valid, inspectedSurfaceIds: ["q-1"] }, role: valid.role, packageId: valid.packageId, expectedSurfaceIds })[0].code, /surface/i);
  assert.match(validateRoleResult({ result: { ...valid, findings: [{ findingId: "f-1", surfaceId: "unknown", severity: "P1", code: "x", detail: "x" }] }, role: valid.role, packageId: valid.packageId, expectedSurfaceIds })[0].code, /finding/i);
  assert.match(validateRoleResult({ result: { ...valid, inspectedSurfaceIds: ["q-1", "q-1", "lesson-1"] }, role: valid.role, packageId: valid.packageId, expectedSurfaceIds })[0].code, /duplicate/i);
  assert.match(validateRoleResult({ result: { ...valid, goldLedger: {} }, role: valid.role, packageId: valid.packageId, expectedSurfaceIds })[0].code, /forbidden/i);
});
