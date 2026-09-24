import assert from "node:assert/strict";
import test from "node:test";
import { canonicalSha256 } from "./candidate-set-builder.mjs";
import { samplePackage, offlineRunFixtureV2 } from "./test-fixtures.mjs";

async function subject() {
  return import("./scoring.mjs");
}

function expectedPackage(packageId) {
  const content = samplePackage();
  content.packageId = packageId;
  content.questions = content.questions.slice(0, 2).map((question, index) => ({ ...question,
    id: `${packageId}-${index === 0 ? "gold" : "clean"}`, prompt: { ...question.prompt, en: `${index + 1}. ${question.prompt.en}` } }));
  content.lessons = [];
  return content;
}

async function receipt({ arm, packageId, finding }) {
  const role = arm === "C0_PRIME" ? "evidence-verifier" : "same-reviewer-revision";
  const { receipt } = await offlineRunFixtureV2({ arm, packageContent: expectedPackage(packageId),
    findingsByRole: finding ? { [role]: [{ ...finding, detail: "Synthetic scoring evidence for the declared finding." }] } : {} });
  return receipt;
}

test("scores surface detection separately from code-family-concordant detection", async () => {
  const { scoreCalibrationV2 } = await subject();
  const runReceipts = [
    await receipt({ arm: "A_PRIME", packageId: "p-a" }),
    await receipt({
      arm: "B_PRIME",
      packageId: "p-b",
      finding: {
        findingId: "b-wrong-family",
        surfaceId: "p-b-gold",
        family: "F2",
        severity: "P1",
        code: "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS"
      }
    }),
    await receipt({
      arm: "C0_PRIME",
      packageId: "p-c0",
      finding: {
        findingId: "c0-right-family",
        surfaceId: "p-c0-gold",
        family: "F8",
        severity: "P0",
        code: "TEMPLATE_IDENTITY_LEAKAGE"
      }
    })
  ];
  const goldInstances = [
    { latentDefectId: "ld-1", arm: "A_PRIME", packageId: "p-a", surfaceId: "p-a-gold", family: "F8", acceptedCodes: ["TEMPLATE_IDENTITY_LEAKAGE"] },
    { latentDefectId: "ld-1", arm: "B_PRIME", packageId: "p-b", surfaceId: "p-b-gold", family: "F8", acceptedCodes: ["TEMPLATE_IDENTITY_LEAKAGE"] },
    { latentDefectId: "ld-1", arm: "C0_PRIME", packageId: "p-c0", surfaceId: "p-c0-gold", family: "F8", acceptedCodes: ["TEMPLATE_IDENTITY_LEAKAGE"] }
  ];
  const score = scoreCalibrationV2({ runReceipts, goldInstances, expectedPackages: runReceipts.map((row) => expectedPackage(row.packageId)) });

  assert.equal(score.armMetrics.B_PRIME.surfaceDetection.truePositives, 1);
  assert.equal(score.armMetrics.B_PRIME.familyConcordantDetection.truePositives, 0);
  assert.equal(score.armMetrics.B_PRIME.familyConcordantDetection.falseNegatives, 1);
  assert.equal(score.armMetrics.B_PRIME.codeFamilyConcordantDetection.truePositives, 0);
  assert.equal(score.armMetrics.B_PRIME.discordantGoldSurfaceFindingCount, 1);
  assert.equal(score.armMetrics.C0_PRIME.surfaceDetection.truePositives, 1);
  assert.equal(score.armMetrics.C0_PRIME.familyConcordantDetection.truePositives, 1);
  assert.equal(score.armMetrics.C0_PRIME.codeFamilyConcordantDetection.truePositives, 1);
  assert.equal(score.armMetrics.C0_PRIME.familyConcordantDetection.concordanceRateAmongSurfaceDetectedGold, 1);
});

test("separates an exact accepted-code miss from a broader family hit", async () => {
  const { scoreCalibrationV2 } = await subject();
  const runReceipts = [
    await receipt({ arm: "A_PRIME", packageId: "p-a" }),
    await receipt({
      arm: "B_PRIME",
      packageId: "p-b",
      finding: {
        findingId: "b-same-family-wrong-code",
        surfaceId: "p-b-gold",
        family: "F1",
        severity: "P0",
        code: "UNSOLVABLE_OR_UNIT_DOMAIN_BOUNDARY"
      }
    }),
    await receipt({ arm: "C0_PRIME", packageId: "p-c0" })
  ];
  const goldInstances = [
    { latentDefectId: "ld-1", arm: "A_PRIME", packageId: "p-a", surfaceId: "p-a-gold", family: "F1", acceptedCodes: ["ANSWER_INDEPENDENT_MISMATCH"] },
    { latentDefectId: "ld-1", arm: "B_PRIME", packageId: "p-b", surfaceId: "p-b-gold", family: "F1", acceptedCodes: ["ANSWER_INDEPENDENT_MISMATCH"] },
    { latentDefectId: "ld-1", arm: "C0_PRIME", packageId: "p-c0", surfaceId: "p-c0-gold", family: "F1", acceptedCodes: ["ANSWER_INDEPENDENT_MISMATCH"] }
  ];
  const score = scoreCalibrationV2({ runReceipts, goldInstances, expectedPackages: runReceipts.map((row) => expectedPackage(row.packageId)) });

  assert.equal(score.armMetrics.B_PRIME.surfaceDetection.truePositives, 1);
  assert.equal(score.armMetrics.B_PRIME.familyConcordantDetection.truePositives, 1);
  assert.equal(score.armMetrics.B_PRIME.codeFamilyConcordantDetection.truePositives, 0);
});

test("compares only A-prime, B-prime, and C0-prime under both detection definitions", async () => {
  const { scoreCalibrationV2 } = await subject();
  const runReceipts = [
    await receipt({ arm: "A_PRIME", packageId: "p-a" }),
    await receipt({ arm: "B_PRIME", packageId: "p-b" }),
    await receipt({ arm: "C0_PRIME", packageId: "p-c0" })
  ];
  const goldInstances = [
    { latentDefectId: "ld-1", arm: "A_PRIME", packageId: "p-a", surfaceId: "p-a-gold", family: "F8" },
    { latentDefectId: "ld-1", arm: "B_PRIME", packageId: "p-b", surfaceId: "p-b-gold", family: "F8" },
    { latentDefectId: "ld-1", arm: "C0_PRIME", packageId: "p-c0", surfaceId: "p-c0-gold", family: "F8" }
  ];
  const score = scoreCalibrationV2({ runReceipts, goldInstances, expectedPackages: runReceipts.map((row) => expectedPackage(row.packageId)) });

  assert.deepEqual(Object.keys(score.armMetrics), ["A_PRIME", "B_PRIME", "C0_PRIME"]);
  assert.deepEqual(Object.keys(score.matchedComparisons), [
    "B_PRIME_vs_A_PRIME",
    "C0_PRIME_vs_A_PRIME",
    "C0_PRIME_vs_B_PRIME"
  ]);
  for (const comparison of Object.values(score.matchedComparisons)) {
    assert.ok(comparison.surfaceDetection);
    assert.ok(comparison.familyConcordantDetection);
    assert.ok(comparison.codeFamilyConcordantDetection);
  }
  assert.equal(score.claimBoundary.naturalQuestionBankGeneralizationClaim, false);
  assert.equal(score.claimBoundary.productionReadinessClaim, false);
});

test("rejects a finding whose declared family disagrees with its allowlisted code", async () => {
  const { scoreCalibrationV2 } = await subject();
  const row = await receipt({ arm: "B_PRIME", packageId: "p-b", finding: {
    findingId: "wrong-family", surfaceId: "p-b-gold", family: "F2", severity: "P1", code: "EQUIVALENT_OR_MULTIPLE_CORRECT_OPTIONS"
  } });
  const execution = row.roleExecutions.find((value) => value.role === "same-reviewer-revision");
  execution.providerReceipt.roleResult.findings[0].family = "F8";
  const { executionSha256, ...executionBody } = execution;
  execution.executionSha256 = canonicalSha256(executionBody);
  const { receiptSha256, ...body } = row;
  row.receiptSha256 = canonicalSha256(body);
  assert.throws(() => scoreCalibrationV2({ runReceipts: [row], goldInstances: [], expectedPackages: [expectedPackage("p-b")] }), /family.*code|code.*family/i);
});

for (const [name, mutate] of [
  ["not-inspected disposition", (row) => { row.surfaceResults[0].disposition = "not-inspected"; }],
  ["unknown disposition", (row) => { row.surfaceResults[0].disposition = "unknown"; }],
  ["clean disposition carrying a finding", (row) => {
    row.findings.push({ findingId: "finding-1", surfaceId: "p-a-gold", family: "F2", code: "MISSING_OPTIONS", severity: "P1" });
    row.surfaceResults[0].findingIds = ["finding-1"];
  }],
  ["orphan finding ID", (row) => { row.surfaceResults[0].findingIds = ["missing-finding"]; row.surfaceResults[0].disposition = "finding"; }],
  ["wrong finding ID with a correct finding disposition", (row) => {
    row.findings.push({ findingId: "finding-1", surfaceId: "p-a-gold", family: "F2", code: "MISSING_OPTIONS", severity: "P1" });
    row.surfaceResults[0].disposition = "finding";
    row.surfaceResults[0].findingIds = ["different-finding"];
  }],
  ["duplicate finding IDs across surfaces", (row) => {
    for (const surface of row.surfaceResults) {
      row.findings.push({ findingId: "duplicate-id", surfaceId: surface.surfaceId, family: "F2", code: "MISSING_OPTIONS", severity: "P1" });
      surface.disposition = "finding";
      surface.findingIds = ["duplicate-id"];
    }
  }],
  ["omitted clean surface with forged coverage", (row) => {
    row.surfaceResults.pop(); row.coverage.questions = 1; row.coverage.requiredSurfaces = 1; row.coverage.inspectedSurfaces = 1;
  }],
  ["uninspected clean evidence", (row) => { row.surfaceResults[0].inspectedByRoles = []; }]
]) {
  test(`scoring rejects ${name} even when surface hashes are consistent`, async () => {
    const { scoreCalibrationV2 } = await subject();
    const runReceipts = await Promise.all(["A_PRIME", "B_PRIME", "C0_PRIME"].map((arm, index) => receipt({ arm, packageId: ["p-a", "p-b", "p-c0"][index] })));
    const expectedPackages = runReceipts.map((row) => expectedPackage(row.packageId));
    mutate(runReceipts[0]);
    for (const surface of runReceipts[0].surfaceResults) {
      const { evidenceSha256, ...body } = surface;
      surface.evidenceSha256 = canonicalSha256(body);
    }
    const { receiptSha256, ...body } = runReceipts[0];
    runReceipts[0].receiptSha256 = canonicalSha256(body);
    assert.throws(() => scoreCalibrationV2({ runReceipts, goldInstances: [], expectedPackages }), /surface|finding|coverage|inspection|disposition/i);
  });
}

test("scoring requires an independent expected package denominator", async () => {
  const { scoreCalibrationV2 } = await subject();
  const runReceipts = [await receipt({ arm: "A_PRIME", packageId: "p-a" })];
  assert.throws(() => scoreCalibrationV2({ runReceipts, goldInstances: [] }), /expected.*package|denominator/i);
});
