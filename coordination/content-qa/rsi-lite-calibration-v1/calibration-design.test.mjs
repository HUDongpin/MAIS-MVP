import assert from "node:assert/strict";
import test from "node:test";

import {
  ARMS,
  DEFECT_FAMILIES,
  REGIONS,
  VARIANTS,
  auditCandidateContent,
  auditCalibrationDesign,
  buildCalibrationDesign
} from "./calibration-design.mjs";

const seed = "f0f2-test-seed-not-for-formal-randomization";

const EXPECTED_SEVERITY = Object.freeze({
  F1: "P0",
  F2: "P1",
  F3: "P1",
  F4: "P0",
  F5: "P1",
  F6: "P1",
  F7: "P1",
  F8: "P0",
  F9: "P0"
});

const EXPECTED_PRIMARY_STANDARD = Object.freeze({
  CA: Object.freeze({
    L1: "2.NBT.5",
    L2: "4.NF.3",
    L3: "3.MD.7",
    L4: "8.F.1"
  }),
  HK: Object.freeze({
    L1: "EDB.2017.1N4",
    L2: "EDB.2017.4N6",
    L3: "EDB.2017.4M2",
    L4: "EDB.2017.KS3.LU7.4"
  }),
  MAINLAND: Object.freeze({
    L1: "MOE.2022.STAGE1.NUMBER_OPERATIONS",
    L2: "MOE.2022.STAGE3.FRACTION_OPERATIONS",
    L3: "MOE.2022.STAGE2.AREA_MEASUREMENT",
    L4: "MOE.2022.STAGE4.FUNCTIONS"
  })
});

test("builds twelve matched latent bundles and forty-eight concealed packages", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  assert.equal(design.sealedManifest.latentBundles.length, 12);
  assert.equal(design.sealedManifest.packageAssignments.length, 48);
  assert.equal(design.packages.length, 48);
  assert.equal(design.packages.reduce((sum, row) => sum + row.content.questions.length, 0), 4_800);
  assert.equal(design.packages.reduce((sum, row) => sum + row.content.lessons.length, 0), 96);
  assert.equal(design.packages.reduce((sum, row) => sum + row.content.browserRoutes.length, 0), 0);
  assert.equal(design.publicManifest.protocolVersion, "1.1.1-f2-r");
  assert.equal(design.publicManifest.estimandScope, "content-surfaces-only");

  for (const region of REGIONS) {
    const bundles = design.sealedManifest.latentBundles.filter((row) => row.region === region.id);
    assert.equal(bundles.length, 4);
    assert.equal(bundles.filter((row) => row.status === "clean").length, 1);
    assert.equal(bundles.filter((row) => row.status === "defect-bearing").length, 3);
  }
});

test("balances arms and surface variants within every region", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  for (const region of REGIONS) {
    const assignments = design.sealedManifest.packageAssignments.filter((row) => row.region === region.id);
    for (const arm of ARMS) {
      const armRows = assignments.filter((row) => row.arm === arm);
      assert.equal(armRows.length, 4);
      assert.deepEqual([...new Set(armRows.map((row) => row.variantId))].sort(), [...VARIANTS].sort());
    }

    const byBundle = Map.groupBy(assignments, (row) => row.latentBundleId);
    for (const rows of byBundle.values()) {
      assert.deepEqual([...new Set(rows.map((row) => row.arm))].sort(), [...ARMS].sort());
      assert.deepEqual([...new Set(rows.map((row) => row.variantId))].sort(), [...VARIANTS].sort());
    }
  }
});

test("creates fifty-four balanced latent defects and 216 homologous instances", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  assert.equal(design.goldLedger.latentDefects.length, 54);
  assert.equal(design.goldLedger.instances.length, 216);

  for (const family of DEFECT_FAMILIES) {
    assert.equal(
      design.goldLedger.latentDefects.filter((row) => row.family === family.id).length,
      6,
      family.id
    );
  }

  for (const region of REGIONS) {
    const regionDefects = design.goldLedger.latentDefects.filter((row) => row.region === region.id);
    assert.equal(regionDefects.length, 18);
    for (const family of DEFECT_FAMILIES) {
      assert.equal(regionDefects.filter((row) => row.family === family.id).length, 2);
    }
  }

  for (const latentDefect of design.goldLedger.latentDefects) {
    const instances = design.goldLedger.instances.filter((row) => row.latentDefectId === latentDefect.id);
    assert.equal(instances.length, 4);
    assert.deepEqual([...new Set(instances.map((row) => row.arm))].sort(), [...ARMS].sort());
  }
});

test("keeps secret assignment and defect fields out of public manifests and campaign payloads", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const publicText = JSON.stringify(design.publicManifest);

  for (const forbidden of ["latentBundleId", "variantId", "arm", "defect-bearing", "mutation", seed]) {
    assert.equal(publicText.includes(forbidden), false, forbidden);
  }

  for (const row of design.packages) {
    const payloadText = JSON.stringify(row.content);
    for (const forbidden of ["latentBundleId", "variantId", "armAssignment", "defectFamily", seed]) {
      assert.equal(payloadText.includes(forbidden), false, `${row.packageId}:${forbidden}`);
    }
    assert.equal(row.content.status, "candidate-only");
    assert.equal(row.content.integrationStatus, "candidate-only-not-live");
  }
});

test("emits internally consistent candidate surfaces and opaque unique identifiers", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const packageIds = new Set();
  const surfaceIds = new Set();
  const intentionalTemplateLeakageIds = new Set(
    design.goldLedger.instances.filter((instance) => instance.family === "F8").map((instance) => instance.surfaceId)
  );
  const intentionalAlignmentMismatchIds = new Set(
    design.goldLedger.instances.filter((instance) => instance.family === "F7").map((instance) => instance.surfaceId)
  );
  const intentionalAnswerMismatchIds = new Set(
    design.goldLedger.instances.filter((instance) => instance.family === "F1").map((instance) => instance.surfaceId)
  );
  const intentionalEvidenceMismatchIds = new Set(
    design.goldLedger.instances.filter((instance) => instance.family === "F5").map((instance) => instance.surfaceId)
  );

  for (const row of design.packages) {
    assert.equal(packageIds.has(row.packageId), false);
    packageIds.add(row.packageId);
    assert.equal(row.content.questions.length, 100);
    assert.equal(row.content.lessons.length, 2);
    assert.equal(row.content.browserRoutes.length, 0);

    for (const question of row.content.questions) {
      assert.equal(surfaceIds.has(question.id), false);
      surfaceIds.add(question.id);
      assert.ok(["multiple-choice", "fill-in", "short-answer"].includes(question.type));
      assert.ok(question.prompt.en.trim());
      assert.ok(question.prompt.zh.trim());
      assert.ok(question.prompt.zhHans.trim());
      assert.ok(question.answer.trim());
      assert.ok(question.acceptedAnswers.length >= 1);
      assert.equal(question.alignment.primaryStandardId, question.standardIds[0]);
      if (!intentionalAlignmentMismatchIds.has(question.id)) {
        assert.equal(question.alignment.primaryStandardId, EXPECTED_PRIMARY_STANDARD[row.content.region][row.content.stratumId]);
      }
      assert.equal(question.alignment.sourceDocument.authority.length > 0, true);
      assert.match(question.alignment.sourceDocument.url, /^https:\/\//);
      assert.equal(question.alignment.sourceDocument.lastChecked, "2026-08-23");
      assert.ok(question.alignment.sourceLocator.trim());
      assert.ok(question.alignment.deliveryContext.edition.trim());
      assert.ok(question.alignment.deliveryContext.volume.trim());
      assert.ok(question.alignment.deliveryContext.chapterScope.trim());
      assert.equal(question.alignment.humanRatificationRequired, true);
      if (!intentionalAnswerMismatchIds.has(question.id)) assert.equal(question.answerContract.canonicalAnswer, question.answer);
      assert.ok(question.answerContract.normalizationRule.trim());
      assert.ok(question.misconceptionMap.id.trim());
      assert.ok(question.misconceptionMap.primary.trim());
      assert.ok(question.evidenceSurface.kind.trim());
      if (!intentionalEvidenceMismatchIds.has(question.id)) {
        assert.equal(question.evidenceSurface.expectedLabel, question.evidenceSurface.visibleLabel);
      }
      if (!intentionalTemplateLeakageIds.has(question.id)) assert.equal(question.templateTrace.publicLabel, null);
    }

    assert.equal(new Set(row.content.questions.map((question) => JSON.stringify(question.prompt))).size, 100);
    assert.ok(row.content.lessons.every((lesson) => !/[a-z]+-[a-z]+/.test(lesson.title.zh)));
    assert.ok(row.content.lessons.every((lesson) => !/[a-z]+-[a-z]+/.test(lesson.title.zhHans)));
  }

  assert.equal(packageIds.size, 48);
  assert.equal(surfaceIds.size, 4_800);
  assert.deepEqual(auditCalibrationDesign(design), []);
});

test("is deterministic for one seed and changes the concealed design for a different seed", () => {
  const first = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const second = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const changed = buildCalibrationDesign({ seed: `${seed}-changed`, itemsPerPackage: 100 });

  assert.deepEqual(first.publicManifest, second.publicManifest);
  assert.deepEqual(first.sealedManifest, second.sealedManifest);
  assert.deepEqual(first.goldLedger, second.goldLedger);
  assert.equal(first.seedCommitment, second.seedCommitment);
  assert.notEqual(first.seedCommitment, changed.seedCommitment);
  assert.notDeepEqual(first.sealedManifest.packageAssignments, changed.sealedManifest.packageAssignments);
});

test("uses the frozen two-PEP one-BNU one-HJB Mainland publisher allocation", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const publishers = design.sealedManifest.latentBundles
    .filter((row) => row.region === "MAINLAND")
    .map((row) => row.publisher)
    .sort();

  assert.deepEqual(publishers, ["BNU", "HJB", "PEP", "PEP"]);
});

test("keeps California fraction denominators and Grade 3 rectangle products inside the official curriculum envelope", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const californiaPackages = design.packages.filter((row) => row.content.region === "CA");
  const allowedGrade4Denominators = new Set([2, 3, 4, 5, 6, 8, 10, 12, 100]);
  const fractionQuestions = californiaPackages
    .filter((row) => row.content.stratumId === "L2")
    .flatMap((row) => row.content.questions);
  const areaQuestions = californiaPackages
    .filter((row) => row.content.stratumId === "L3")
    .flatMap((row) => row.content.questions);

  assert.equal(fractionQuestions.length, 400);
  for (const question of fractionQuestions) {
    const match = /Add \d+\/(\d+) and \d+\/\1\./.exec(question.prompt.en);
    assert.ok(match, question.id);
    assert.equal(allowedGrade4Denominators.has(Number(match[1])), true, `${question.id}:${match[1]}`);
  }

  assert.equal(areaQuestions.length, 400);
  for (const question of areaQuestions) {
    const match = /rectangle is (\d+) units wide and (\d+) units high/.exec(question.prompt.en);
    assert.ok(match, question.id);
    const product = Number(match[1]) * Number(match[2]);
    assert.ok(product <= 100, `${question.id}:${match[1]}x${match[2]}=${product}`);
  }
});

test("instantiates every sealed defect family as the intended observable QA condition", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const numericValue = (value) => {
    const fractionMatch = /^(\d+)\/(\d+)$/.exec(value);
    return fractionMatch ? Number(fractionMatch[1]) / Number(fractionMatch[2]) : Number(value);
  };

  for (const instance of design.goldLedger.instances) {
    const packageRow = design.packages.find((row) => row.packageId === instance.packageId);
    const question = packageRow.content.questions.find((row) => row.id === instance.surfaceId);
    assert.ok(question, instance.id);

    if (instance.family === "F1") {
      assert.notEqual(question.answer, question.validation.independentAnswer);
    } else if (instance.family === "F2") {
      const normalizedAnswer = numericValue(question.answer);
      assert.equal(question.options.filter((row) => row.en === question.answer).length, 1);
      assert.ok(question.options.filter((row) => numericValue(row.en) === normalizedAnswer).length >= 2);
    } else if (instance.family === "F3") {
      assert.match(question.explanation.en, /intermediate calculation/);
    } else if (instance.family === "F4") {
      assert.equal(question.acceptedAnswers.includes(question.answer), false);
    } else if (instance.family === "F5") {
      assert.notEqual(question.evidenceSurface.visibleLabel, question.evidenceSurface.expectedLabel);
    } else if (instance.family === "F6") {
      assert.notEqual(question.prompt.en.match(/\d+/g)?.join("|"), question.prompt.zhHans.match(/\d+/g)?.join("|"));
    } else if (instance.family === "F7") {
      assert.equal(question.gradeBand, "UNALIGNED-GRADE");
    } else if (instance.family === "F8") {
      assert.match(question.templateTrace.publicLabel, /^internal-template:/);
      assert.equal(
        packageRow.content.questions.some((row) => row.id !== question.id && JSON.stringify(row.prompt) === JSON.stringify(question.prompt)),
        false
      );
      assert.equal(question.answer, question.validation.independentAnswer);
      assert.equal(question.acceptedAnswers.includes(question.answer), true);
    } else if (instance.family === "F9") {
      assert.equal(question.validation.independentAnswerProvenance, "metadata-copy-from-candidate-answer");
      assert.equal(question.validation.independentAnswer, question.answer);
    }
  }
});

test("uses family-based severity and records one bounded semantic mutation per latent defect", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  for (const defect of design.goldLedger.latentDefects) {
    assert.equal(defect.severity, EXPECTED_SEVERITY[defect.family], defect.id);
  }

  for (const instance of design.goldLedger.instances) {
    assert.equal(instance.semanticMutationCount, 1, instance.id);
    assert.ok(instance.changedFieldGroup.trim(), instance.id);
    assert.ok(instance.changedPaths.length >= 1, instance.id);
    assert.equal(instance.unmodifiedFieldsSha256Before, instance.unmodifiedFieldsSha256After, instance.id);
  }
});

test("keeps V1-V4 reasoning and detection burden isomorphic at every latent item", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });

  for (const bundle of design.sealedManifest.latentBundles) {
    const assignments = design.sealedManifest.packageAssignments.filter((row) => row.latentBundleId === bundle.id);
    const packages = assignments.map((assignment) => design.packages.find((row) => row.packageId === assignment.packageId));

    for (let itemIndex = 0; itemIndex < 100; itemIndex += 1) {
      const homologousContracts = packages.map((row) => row.content.questions[itemIndex].homologyContract);
      assert.ok(homologousContracts.every((contract) => contract && typeof contract === "object"), `${bundle.id}:${itemIndex}`);
      assert.ok(homologousContracts[0].knowledgeComponent.trim(), `${bundle.id}:${itemIndex}`);
      assert.ok(Number.isInteger(homologousContracts[0].reasoningStepCount), `${bundle.id}:${itemIndex}`);
      assert.ok(homologousContracts[0].misconceptionMapId.trim(), `${bundle.id}:${itemIndex}`);
      assert.deepEqual(homologousContracts.slice(1), Array(3).fill(homologousContracts[0]), `${bundle.id}:${itemIndex}`);
    }
  }
});

test("keeps all clean packages free of deterministic natural-defect signals", () => {
  const design = buildCalibrationDesign({ seed, itemsPerPackage: 100 });
  const cleanPackageIds = new Set(
    design.sealedManifest.packageAssignments.filter((row) => row.status === "clean").map((row) => row.packageId)
  );

  for (const row of design.packages.filter((packageRow) => cleanPackageIds.has(packageRow.packageId))) {
    assert.deepEqual(auditCandidateContent(row.content), [], row.packageId);
    for (const question of row.content.questions) {
      if (question.type !== "multiple-choice") continue;
      const numeric = question.options.map((option) => Number(option.en.includes("/")
        ? option.en.split("/")[0] / option.en.split("/")[1]
        : option.en));
      assert.equal(new Set(numeric).size, numeric.length, question.id);
      assert.equal(question.options.filter((option) => option.en === question.answer).length, 1, question.id);
      assert.equal(question.options.some((option) => /-\d+$/.test(option.en)), false, question.id);
    }
  }
});
