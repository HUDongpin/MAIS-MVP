import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildCalibrationDesign } from "./calibration-design.mjs";

import {
  buildA18BlindReviewMaterials,
  canonicalSha256,
  validateA18BlindReviewMaterials,
  writeA18BlindReviewMaterials
} from "./a18-blind-review-materials.mjs";

// This seed and every candidate are synthetic test inputs, not historical protected data.
function buildSyntheticInputs() {
  const design = buildCalibrationDesign({
    seed: "a18-blind-review-offline-fixture-not-for-formal-randomization",
    itemsPerPackage: 100
  });
  return {
    sealedManifest: design.sealedManifest,
    goldLedger: design.goldLedger,
    publicManifest: design.publicManifest,
    packages: design.packages.map((row) => row.content)
  };
}

function collectKeys(value, result = []) {
  if (Array.isArray(value)) {
    for (const row of value) collectKeys(row, result);
    return result;
  }
  if (value && typeof value === "object") {
    for (const [key, row] of Object.entries(value)) {
      result.push(key);
      collectKeys(row, result);
    }
  }
  return result;
}

test("builds two deterministic, answer-blind reviewer packets without mutating the synthetic candidates", async () => {
  const inputs = buildSyntheticInputs();
  const before = canonicalSha256(inputs.packages);
  const materials = buildA18BlindReviewMaterials(inputs);

  assert.equal(canonicalSha256(inputs.packages), before);
  assert.equal(materials.registration.candidateSetSha256, inputs.publicManifest.candidateSetSha256);
  assert.deepEqual(buildA18BlindReviewMaterials(buildSyntheticInputs()), materials);
  assert.deepEqual(materials.registration.counts, {
    blueprintGroups: 12,
    packageBlueprints: 48,
    targetQuestionGroups: 54,
    targetQuestionInstances: 216,
    cleanQuestionGroups: 30,
    cleanQuestionInstances: 120,
    questionGroups: 84,
    questionInstances: 336,
    lessons: 96,
    totalReviewSurfaces: 432,
    reviewerSlots: 2
  });
  assert.equal(materials.registration.cleanQuestionSampling.method, "candidate-commitment-hash-ranked-without-replacement");
  assert.equal(materials.registration.cleanQuestionSampling.perCleanBundleProbability, 0.1);
  assert.equal(materials.reviewers.length, 2);

  const [reviewer1, reviewer2] = materials.reviewers;
  const groupIds1 = reviewer1.phase1.questionGroups.map((row) => row.reviewGroupId);
  const groupIds2 = reviewer2.phase1.questionGroups.map((row) => row.reviewGroupId);
  assert.notDeepEqual(groupIds1, groupIds2);
  assert.deepEqual([...groupIds1].sort(), [...groupIds2].sort());
  assert.ok(reviewer1.phase1.questionGroups.every((row) => row.surfaces.length === 4));
  assert.equal(reviewer1.phase1.lessons.length, 96);
  assert.equal(reviewer1.phase1.blueprints.length, 12);

  const phase1ForbiddenKeys = new Set([
    "answer",
    "acceptedAnswers",
    "answerContract",
    "explanation",
    "expectedLabel",
    "validation",
    "arm",
    "variantId",
    "latentBundleId",
    "latentDefectId",
    "family",
    "severity",
    "goldAnswer",
    "candidateAnswer",
    "classification"
  ]);
  const phase2HiddenKeys = new Set([
    "arm",
    "variantId",
    "latentBundleId",
    "latentDefectId",
    "family",
    "severity",
    "goldAnswer",
    "classification"
  ]);
  for (const reviewer of materials.reviewers) {
    for (const key of collectKeys(reviewer.phase1)) assert.equal(phase1ForbiddenKeys.has(key), false, `phase 1 leaked ${key}`);
    for (const key of collectKeys(reviewer.phase2)) assert.equal(phase2HiddenKeys.has(key), false, `phase 2 leaked ${key}`);
    assert.equal(JSON.stringify(reviewer.phase1).includes("defect-bearing"), false);
    assert.equal(JSON.stringify(reviewer.phase2).includes("defect-bearing"), false);
  }

  assert.equal(materials.adjudicationKey.questionGroups.length, 84);
  assert.equal(materials.adjudicationKey.questionGroups.filter((row) => row.classification === "construction-target").length, 54);
  assert.equal(materials.adjudicationKey.questionGroups.filter((row) => row.classification === "clean-probability-sample").length, 30);
  assert.equal(materials.adjudicationKey.questionGroups.flatMap((row) => row.surfaces).filter((row) => row.classification === "construction-target").length, 216);
  assert.equal(materials.adjudicationKey.questionGroups.flatMap((row) => row.surfaces).filter((row) => row.classification === "clean-probability-sample").length, 120);
  assert.deepEqual(validateA18BlindReviewMaterials(materials), []);
});

test("builder rejects candidate content drift before creating reviewer packets", () => {
  const original = buildSyntheticInputs();
  for (const mutate of [
    (inputs) => { inputs.packages[0].questions[0].prompt.en = "Changed after commitment"; },
    (inputs) => { inputs.packages[0].lessons[0].workedExample.answer = "Changed after commitment"; },
    (inputs) => { inputs.packages[0] = structuredClone(inputs.packages[1]); }
  ]) {
    const inputs = structuredClone(original);
    mutate(inputs);
    assert.throws(() => buildA18BlindReviewMaterials(inputs), /Candidate-set content commitment does not match/);
  }
  const reordered = structuredClone(original);
  reordered.packages.reverse();
  assert.equal(buildA18BlindReviewMaterials(reordered).registration.candidateSetSha256, original.publicManifest.candidateSetSha256);
});

test("validator rejects hidden-label leakage even when packet commitments are recomputed", async () => {
  const materials = buildA18BlindReviewMaterials(buildSyntheticInputs());
  materials.reviewers[0].phase1.questionGroups[0].surfaces[0].arm = "A";
  materials.registration.packetCommitments = materials.reviewers.map((reviewer) => ({
    reviewerSlot: reviewer.reviewerSlot,
    phase1Sha256: canonicalSha256(reviewer.phase1),
    phase2Sha256: canonicalSha256(reviewer.phase2)
  }));
  assert.ok(validateA18BlindReviewMaterials(materials).some((finding) => finding.code === "reviewer-hidden-label-leak"));
});

test("validator rejects a dropped lesson or changed clean-sampling declaration", async () => {
  const materials = buildA18BlindReviewMaterials(buildSyntheticInputs());
  materials.reviewers[1].phase1.lessons.pop();
  materials.registration.cleanQuestionSampling.perCleanBundleProbability = 0.2;
  const codes = validateA18BlindReviewMaterials(materials).map((finding) => finding.code);
  assert.ok(codes.includes("reviewer-surface-topology"));
  assert.ok(codes.includes("clean-sampling-contract"));
});

test("writes a frozen public registration and mode-0600 reviewer/adjudication packets without overwriting drift", async () => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "mais-a18-blind-review-test-"));
  try {
    const materials = buildA18BlindReviewMaterials(buildSyntheticInputs());
    const publicRegistrationPath = path.join(temporaryRoot, "public", "a18-blind-review-registration.json");
    const restrictedRoot = path.join(temporaryRoot, "restricted");
    const result = await writeA18BlindReviewMaterials({ materials, publicRegistrationPath, restrictedRoot });

    assert.equal(result.files.length, 6);
    assert.deepEqual(JSON.parse(await readFile(publicRegistrationPath, "utf8")), materials.registration);
    assert.equal((await stat(publicRegistrationPath)).mode & 0o777, 0o644);
    for (const file of result.files.filter((row) => row.visibility === "restricted")) {
      assert.equal((await stat(file.absolutePath)).mode & 0o777, 0o600);
    }
    assert.equal((await stat(restrictedRoot)).mode & 0o777, 0o700);
    assert.equal(JSON.stringify(materials.registration).includes("latentDefectId"), false);
    assert.equal(JSON.stringify(materials.registration).includes("goldAnswer"), false);

    await writeA18BlindReviewMaterials({ materials, publicRegistrationPath, restrictedRoot });
    const changed = structuredClone(materials);
    changed.reviewers[0].phase1.phase = "tampered";
    changed.registration.packetCommitments[0].phase1Sha256 = canonicalSha256(changed.reviewers[0].phase1);
    const { registrationSha256: _oldRegistrationSha256, ...changedRegistrationBody } = changed.registration;
    changed.registration.registrationSha256 = canonicalSha256(changedRegistrationBody);
    await assert.rejects(
      writeA18BlindReviewMaterials({ materials: changed, publicRegistrationPath, restrictedRoot }),
      /Refusing to overwrite a non-identical frozen review artifact/
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
