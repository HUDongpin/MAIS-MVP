import { createHash } from "node:crypto";
import { chmod, link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { PROTOCOL_ID, PROTOCOL_VERSION, SOURCE_BASELINE, stableStringify } from "./calibration-design.mjs";
const CLEAN_SAMPLE_PER_BUNDLE = 10;
const ITEMS_PER_PACKAGE = 100;
const REVIEWER_SLOTS = Object.freeze(["reviewer-1", "reviewer-2"]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function canonicalSha256(value) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function opaqueId(prefix, ...parts) {
  return `${prefix}-${canonicalSha256(parts).slice(0, 20)}`;
}

function orderedByCommitment(rows, label, idOf) {
  return [...rows].sort((left, right) => {
    const leftScore = canonicalSha256([label, idOf(left)]);
    const rightScore = canonicalSha256([label, idOf(right)]);
    return leftScore.localeCompare(rightScore);
  });
}

function clone(value) {
  return structuredClone(value);
}

function phase1Question(question, reviewSurfaceId) {
  return {
    reviewSurfaceId,
    curriculumTrack: question.curriculumTrack,
    publisher: question.publisher,
    gradeBand: question.gradeBand,
    standardIds: clone(question.standardIds),
    alignment: clone(question.alignment),
    type: question.type,
    prompt: clone(question.prompt),
    options: clone(question.options),
    misconceptionMap: clone(question.misconceptionMap),
    evidenceSurface: {
      kind: question.evidenceSurface.kind,
      renderMode: question.evidenceSurface.renderMode,
      visibleLabel: question.evidenceSurface.visibleLabel
    },
    templateTrace: clone(question.templateTrace),
    homologyContract: clone(question.homologyContract)
  };
}

function phase2Question(question, reviewSurfaceId) {
  return {
    reviewSurfaceId,
    answer: question.answer,
    acceptedAnswers: clone(question.acceptedAnswers),
    answerContract: clone(question.answerContract),
    explanation: clone(question.explanation),
    evidenceSurface: clone(question.evidenceSurface),
    templateTrace: clone(question.templateTrace),
    validation: clone(question.validation)
  };
}

function phase1Lesson({ lesson, referencedQuestion, reviewSurfaceId }) {
  return {
    reviewSurfaceId,
    curriculumTrack: lesson.curriculumTrack,
    publisher: lesson.publisher,
    gradeBand: lesson.gradeBand,
    alignment: clone(lesson.alignment),
    title: clone(lesson.title),
    workedExample: {
      prompt: clone(referencedQuestion?.prompt ?? null),
      type: referencedQuestion?.type ?? null,
      options: clone(referencedQuestion?.options ?? null)
    }
  };
}

function phase2Lesson({ lesson, reviewSurfaceId }) {
  return {
    reviewSurfaceId,
    workedExample: {
      answer: lesson.workedExample.answer,
      explanation: clone(lesson.workedExample.explanation)
    }
  };
}

function expectedProtocolObject(value, name) {
  if (!value || typeof value !== "object") throw new Error(`${name} must be an object.`);
  if (value.protocolId !== PROTOCOL_ID || value.protocolVersion !== PROTOCOL_VERSION || value.sourceBaseline !== SOURCE_BASELINE) {
    throw new Error(`${name} does not match the frozen protocol and source baseline.`);
  }
}

function buildBlueprints(packages, candidateSetSha256) {
  const groups = new Map();
  for (const packageContent of packages) {
    const key = `${packageContent.region}:${packageContent.stratumId}`;
    const row = groups.get(key) ?? {
      reviewBlueprintId: opaqueId("rb", candidateSetSha256, key),
      region: packageContent.region,
      stratumId: packageContent.stratumId,
      packageBlueprints: []
    };
    row.packageBlueprints.push({
      reviewPackageId: opaqueId("rp", candidateSetSha256, packageContent.packageId),
      curriculumTrack: packageContent.curriculumTrack,
      canonicalLocale: packageContent.canonicalLocale,
      publisher: packageContent.publisher,
      gradeBand: packageContent.gradeBand,
      questionCount: packageContent.questionCount,
      lessonCount: packageContent.lessonCount,
      browserRouteCount: packageContent.browserRouteCount
    });
    groups.set(key, row);
  }
  return [...groups.values()]
    .map((row) => ({ ...row, packageBlueprints: row.packageBlueprints.sort((a, b) => a.reviewPackageId.localeCompare(b.reviewPackageId)) }))
    .sort((a, b) => a.reviewBlueprintId.localeCompare(b.reviewBlueprintId));
}

function selectCleanIndices(candidateSetSha256, latentBundleId) {
  return orderedByCommitment(
    Array.from({ length: ITEMS_PER_PACKAGE }, (_, index) => index),
    `${candidateSetSha256}:a18-clean-sample-v1:${latentBundleId}`,
    (index) => String(index)
  ).slice(0, CLEAN_SAMPLE_PER_BUNDLE).sort((a, b) => a - b);
}

function buildQuestionGroups({ sealedManifest, goldLedger, packages, candidateSetSha256 }) {
  const packagesById = new Map(packages.map((row) => [row.packageId, row]));
  const assignmentsByPackage = new Map(sealedManifest.packageAssignments.map((row) => [row.packageId, row]));
  const targetGroups = [];
  const targetKeyGroups = [];

  for (const latentDefect of [...goldLedger.latentDefects].sort((a, b) => a.id.localeCompare(b.id))) {
    const instances = goldLedger.instances.filter((row) => row.latentDefectId === latentDefect.id);
    if (instances.length !== 4) throw new Error(`Latent defect ${latentDefect.id} must have exactly four homologous instances.`);
    const reviewGroupId = opaqueId("rg", candidateSetSha256, "target", latentDefect.id);
    const reviewSurfaces = [];
    const keySurfaces = [];
    for (const instance of instances) {
      const packageContent = packagesById.get(instance.packageId);
      const question = packageContent?.questions.find((row) => row.id === instance.surfaceId);
      if (!packageContent || !question) throw new Error(`Target surface ${instance.surfaceId} is absent from ${instance.packageId}.`);
      const reviewSurfaceId = opaqueId("rs", candidateSetSha256, instance.packageId, instance.surfaceId);
      reviewSurfaces.push({
        reviewSurfaceId,
        phase1: phase1Question(question, reviewSurfaceId),
        phase2: phase2Question(question, reviewSurfaceId)
      });
      keySurfaces.push({
        reviewSurfaceId,
        classification: "construction-target",
        packageId: instance.packageId,
        surfaceId: instance.surfaceId,
        latentDefectId: instance.latentDefectId,
        arm: instance.arm,
        variantId: instance.variantId,
        family: instance.family,
        severity: instance.severity,
        goldAnswer: instance.goldAnswer,
        candidateAnswer: instance.candidateAnswer
      });
    }
    targetGroups.push({ reviewGroupId, surfaces: reviewSurfaces });
    targetKeyGroups.push({
      reviewGroupId,
      classification: "construction-target",
      latentBundleId: latentDefect.latentBundleId,
      latentDefectId: latentDefect.id,
      latentItemIndex: latentDefect.latentItemIndex,
      family: latentDefect.family,
      severity: latentDefect.severity,
      surfaces: keySurfaces.sort((a, b) => a.reviewSurfaceId.localeCompare(b.reviewSurfaceId))
    });
  }

  const cleanGroups = [];
  const cleanKeyGroups = [];
  const cleanBundles = sealedManifest.latentBundles.filter((row) => row.status === "clean");
  for (const latentBundle of cleanBundles) {
    const assignments = sealedManifest.packageAssignments.filter((row) => row.latentBundleId === latentBundle.id);
    if (assignments.length !== 4) throw new Error(`Clean bundle ${latentBundle.id} must have exactly four packages.`);
    for (const latentItemIndex of selectCleanIndices(candidateSetSha256, latentBundle.id)) {
      const reviewGroupId = opaqueId("rg", candidateSetSha256, "clean", latentBundle.id, latentItemIndex);
      const reviewSurfaces = [];
      const keySurfaces = [];
      for (const assignment of assignments) {
        const packageContent = packagesById.get(assignment.packageId);
        const question = packageContent?.questions[latentItemIndex];
        if (!packageContent || !question) throw new Error(`Clean sample index ${latentItemIndex} is absent from ${assignment.packageId}.`);
        const reviewSurfaceId = opaqueId("rs", candidateSetSha256, assignment.packageId, question.id);
        reviewSurfaces.push({
          reviewSurfaceId,
          phase1: phase1Question(question, reviewSurfaceId),
          phase2: phase2Question(question, reviewSurfaceId)
        });
        keySurfaces.push({
          reviewSurfaceId,
          classification: "clean-probability-sample",
          packageId: assignment.packageId,
          surfaceId: question.id,
          latentBundleId: assignment.latentBundleId,
          arm: assignment.arm,
          variantId: assignment.variantId,
          latentItemIndex
        });
      }
      cleanGroups.push({ reviewGroupId, surfaces: reviewSurfaces });
      cleanKeyGroups.push({
        reviewGroupId,
        classification: "clean-probability-sample",
        latentBundleId: latentBundle.id,
        latentItemIndex,
        surfaces: keySurfaces.sort((a, b) => a.reviewSurfaceId.localeCompare(b.reviewSurfaceId))
      });
    }
  }

  return {
    reviewGroups: [...targetGroups, ...cleanGroups],
    keyGroups: [...targetKeyGroups, ...cleanKeyGroups].sort((a, b) => a.reviewGroupId.localeCompare(b.reviewGroupId))
  };
}

function buildLessons(packages, candidateSetSha256) {
  const reviewLessons = [];
  const keyLessons = [];
  for (const packageContent of packages) {
    const questionsById = new Map(packageContent.questions.map((row) => [row.id, row]));
    for (const lesson of packageContent.lessons) {
      const reviewSurfaceId = opaqueId("rl", candidateSetSha256, packageContent.packageId, lesson.id);
      const referencedQuestion = questionsById.get(lesson.workedExample.questionId);
      reviewLessons.push({
        reviewSurfaceId,
        phase1: phase1Lesson({ lesson, referencedQuestion, reviewSurfaceId }),
        phase2: phase2Lesson({ lesson, reviewSurfaceId })
      });
      keyLessons.push({
        reviewSurfaceId,
        classification: "full-lesson-census",
        packageId: packageContent.packageId,
        surfaceId: lesson.id,
        referencedQuestionId: lesson.workedExample.questionId
      });
    }
  }
  return {
    reviewLessons,
    keyLessons: keyLessons.sort((a, b) => a.reviewSurfaceId.localeCompare(b.reviewSurfaceId))
  };
}

function reviewerPacket({ reviewerSlot, blueprints, reviewGroups, reviewLessons, candidateSetSha256 }) {
  const label = `${candidateSetSha256}:a18:${reviewerSlot}`;
  const orderedGroups = orderedByCommitment(reviewGroups, `${label}:groups`, (row) => row.reviewGroupId);
  const groupSurfaceOrders = new Map(orderedGroups.map((group) => [
    group.reviewGroupId,
    orderedByCommitment(group.surfaces, `${label}:${group.reviewGroupId}:surfaces`, (row) => row.reviewSurfaceId)
  ]));
  const orderedLessons = orderedByCommitment(reviewLessons, `${label}:lessons`, (row) => row.reviewSurfaceId);
  const orderedBlueprints = orderedByCommitment(blueprints, `${label}:blueprints`, (row) => row.reviewBlueprintId);
  const shared = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256,
    reviewerSlot,
    armBlind: true,
    defectStatusBlind: true,
    adjudicationKeyExcluded: true,
    requiresIndependentReviewerIdentityAndQualification: true
  };
  return {
    reviewerSlot,
    phase1: {
      ...shared,
      phase: "phase-1-independent-solution-and-content-judgment",
      answerBlind: true,
      blueprints: orderedBlueprints,
      questionGroups: orderedGroups.map((group) => ({
        reviewGroupId: group.reviewGroupId,
        surfaces: groupSurfaceOrders.get(group.reviewGroupId).map((row) => row.phase1)
      })),
      lessons: orderedLessons.map((row) => row.phase1)
    },
    phase2: {
      ...shared,
      phase: "phase-2-candidate-contract-comparison-after-phase-1-commitment",
      phase1DecisionCommitmentRequired: true,
      questionGroups: orderedGroups.map((group) => ({
        reviewGroupId: group.reviewGroupId,
        surfaces: groupSurfaceOrders.get(group.reviewGroupId).map((row) => row.phase2)
      })),
      lessons: orderedLessons.map((row) => row.phase2)
    }
  };
}

export function buildA18BlindReviewMaterials({ sealedManifest, goldLedger, publicManifest, packages }) {
  expectedProtocolObject(sealedManifest, "sealedManifest");
  expectedProtocolObject(goldLedger, "goldLedger");
  expectedProtocolObject(publicManifest, "publicManifest");
  if (!Array.isArray(packages) || packages.length !== 48) throw new Error("Exactly 48 candidate packages are required.");
  for (const packageContent of packages) expectedProtocolObject(packageContent, `package ${packageContent?.packageId ?? "<unknown>"}`);
  const candidateSetSha256 = publicManifest.candidateSetSha256;
  if (candidateSetSha256 !== sealedManifest.candidateSetSha256 || candidateSetSha256 !== goldLedger.candidateSetSha256) {
    throw new Error("Candidate-set commitments do not match.");
  }
  const candidateSetRows = packages.map((content) => ({
    packageId: content.packageId,
    contentSha256: createHash("sha256").update(stableStringify(content)).digest("hex")
  })).sort((left, right) => left.packageId.localeCompare(right.packageId));
  if (createHash("sha256").update(stableStringify(candidateSetRows)).digest("hex") !== candidateSetSha256) {
    throw new Error("Candidate-set content commitment does not match.");
  }

  const blueprints = buildBlueprints(packages, candidateSetSha256);
  const { reviewGroups, keyGroups } = buildQuestionGroups({ sealedManifest, goldLedger, packages, candidateSetSha256 });
  const { reviewLessons, keyLessons } = buildLessons(packages, candidateSetSha256);
  const reviewers = REVIEWER_SLOTS.map((reviewerSlot) => reviewerPacket({
    reviewerSlot,
    blueprints,
    reviewGroups,
    reviewLessons,
    candidateSetSha256
  }));

  const counts = {
    blueprintGroups: blueprints.length,
    packageBlueprints: blueprints.reduce((sum, row) => sum + row.packageBlueprints.length, 0),
    targetQuestionGroups: keyGroups.filter((row) => row.classification === "construction-target").length,
    targetQuestionInstances: keyGroups.filter((row) => row.classification === "construction-target").flatMap((row) => row.surfaces).length,
    cleanQuestionGroups: keyGroups.filter((row) => row.classification === "clean-probability-sample").length,
    cleanQuestionInstances: keyGroups.filter((row) => row.classification === "clean-probability-sample").flatMap((row) => row.surfaces).length,
    questionGroups: keyGroups.length,
    questionInstances: keyGroups.flatMap((row) => row.surfaces).length,
    lessons: keyLessons.length,
    totalReviewSurfaces: keyGroups.flatMap((row) => row.surfaces).length + keyLessons.length,
    reviewerSlots: reviewers.length
  };
  const adjudicationBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256,
    status: "restricted-adjudication-key-not-for-reviewers",
    counts,
    questionGroups: keyGroups,
    lessons: keyLessons
  };
  const adjudicationKey = { ...adjudicationBody, keySha256: canonicalSha256(adjudicationBody) };
  const registrationBody = {
    protocolId: PROTOCOL_ID,
    protocolVersion: PROTOCOL_VERSION,
    sourceBaseline: SOURCE_BASELINE,
    candidateSetSha256,
    status: "frozen-human-review-input-candidate",
    formalExecutionAuthorized: false,
    liveProviderAuthorized: false,
    productionAuthorized: false,
    counts,
    cleanQuestionSampling: {
      method: "candidate-commitment-hash-ranked-without-replacement",
      populationPerCleanBundle: ITEMS_PER_PACKAGE,
      samplePerCleanBundle: CLEAN_SAMPLE_PER_BUNDLE,
      perCleanBundleProbability: CLEAN_SAMPLE_PER_BUNDLE / ITEMS_PER_PACKAGE,
      cleanBundleCount: sealedManifest.latentBundles.filter((row) => row.status === "clean").length,
      selectionLabel: "a18-clean-sample-v1"
    },
    reviewerBoundary: {
      requiredReviewerSlots: [...REVIEWER_SLOTS],
      twoQualifiedBilingualMathematicsEducationReviewersRequired: true,
      thirdIndependentAdjudicatorRequired: true,
      phase1MustBeCommittedBeforePhase2Release: true,
      reviewersMustNotReceiveAdjudicationKey: true,
      modelOnlyApprovalForbidden: true
    },
    packetCommitments: reviewers.map((reviewer) => ({
      reviewerSlot: reviewer.reviewerSlot,
      phase1Sha256: canonicalSha256(reviewer.phase1),
      phase2Sha256: canonicalSha256(reviewer.phase2)
    })),
    adjudicationKeySha256: adjudicationKey.keySha256
  };
  const registration = { ...registrationBody, registrationSha256: canonicalSha256(registrationBody) };
  return { registration, reviewers, adjudicationKey };
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

export function validateA18BlindReviewMaterials(materials) {
  const findings = [];
  const push = (code, detail) => findings.push({ code, detail });
  const { registration, reviewers, adjudicationKey } = materials ?? {};
  if (!registration || !Array.isArray(reviewers) || !adjudicationKey) return [{ code: "material-shape", detail: "Registration, two reviewer packets, and adjudication key are required." }];
  const counts = registration.counts ?? {};
  const expectedCounts = {
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
  };
  if (canonicalSha256(counts) !== canonicalSha256(expectedCounts)) push("reviewer-surface-topology", "Registration counts do not match the frozen A18 review topology.");
  if (
    registration.cleanQuestionSampling?.method !== "candidate-commitment-hash-ranked-without-replacement"
    || registration.cleanQuestionSampling?.populationPerCleanBundle !== 100
    || registration.cleanQuestionSampling?.samplePerCleanBundle !== 10
    || registration.cleanQuestionSampling?.perCleanBundleProbability !== 0.1
    || registration.cleanQuestionSampling?.cleanBundleCount !== 3
  ) push("clean-sampling-contract", "Clean-bundle sampling is not the frozen 10-of-100 per clean bundle contract.");
  if (reviewers.length !== 2 || canonicalSha256(reviewers.map((row) => row.reviewerSlot).sort()) !== canonicalSha256([...REVIEWER_SLOTS].sort())) {
    push("reviewer-slot-topology", "Exactly two independent reviewer slots are required.");
  }

  const phase1Forbidden = new Set(["answer", "acceptedAnswers", "answerContract", "explanation", "expectedLabel", "validation", "arm", "variantId", "latentBundleId", "latentDefectId", "family", "severity", "goldAnswer", "candidateAnswer", "classification"]);
  const phase2Forbidden = new Set(["arm", "variantId", "latentBundleId", "latentDefectId", "family", "severity", "goldAnswer", "classification"]);
  const expectedGroupIds = new Set(adjudicationKey.questionGroups?.map((row) => row.reviewGroupId));
  const expectedLessonIds = new Set(adjudicationKey.lessons?.map((row) => row.reviewSurfaceId));
  for (const reviewer of reviewers) {
    if (collectKeys(reviewer.phase1).some((key) => phase1Forbidden.has(key)) || JSON.stringify(reviewer.phase1).includes("defect-bearing")) {
      push("reviewer-hidden-label-leak", `${reviewer.reviewerSlot} phase 1 leaks an answer or hidden allocation field.`);
    }
    if (collectKeys(reviewer.phase2).some((key) => phase2Forbidden.has(key)) || JSON.stringify(reviewer.phase2).includes("defect-bearing")) {
      push("reviewer-hidden-label-leak", `${reviewer.reviewerSlot} phase 2 leaks a hidden allocation field.`);
    }
    const phase1Groups = reviewer.phase1?.questionGroups ?? [];
    const phase2Groups = reviewer.phase2?.questionGroups ?? [];
    const phase1GroupIds = new Set(phase1Groups.map((row) => row.reviewGroupId));
    const phase2GroupIds = new Set(phase2Groups.map((row) => row.reviewGroupId));
    const phase1LessonIds = new Set((reviewer.phase1?.lessons ?? []).map((row) => row.reviewSurfaceId));
    const phase2LessonIds = new Set((reviewer.phase2?.lessons ?? []).map((row) => row.reviewSurfaceId));
    const topologyValid = phase1Groups.length === 84
      && phase2Groups.length === 84
      && phase1Groups.every((row) => row.surfaces?.length === 4)
      && phase2Groups.every((row) => row.surfaces?.length === 4)
      && reviewer.phase1?.blueprints?.length === 12
      && reviewer.phase1?.blueprints?.reduce((sum, row) => sum + (row.packageBlueprints?.length ?? 0), 0) === 48
      && phase1LessonIds.size === 96
      && phase2LessonIds.size === 96
      && canonicalSha256([...phase1GroupIds].sort()) === canonicalSha256([...expectedGroupIds].sort())
      && canonicalSha256([...phase2GroupIds].sort()) === canonicalSha256([...expectedGroupIds].sort())
      && canonicalSha256([...phase1LessonIds].sort()) === canonicalSha256([...expectedLessonIds].sort())
      && canonicalSha256([...phase2LessonIds].sort()) === canonicalSha256([...expectedLessonIds].sort());
    if (!topologyValid) push("reviewer-surface-topology", `${reviewer.reviewerSlot} is missing a blueprint, question group, question surface, or lesson.`);
    const commitment = registration.packetCommitments?.find((row) => row.reviewerSlot === reviewer.reviewerSlot);
    if (commitment?.phase1Sha256 !== canonicalSha256(reviewer.phase1) || commitment?.phase2Sha256 !== canonicalSha256(reviewer.phase2)) {
      push("reviewer-packet-commitment", `${reviewer.reviewerSlot} packet commitment is stale.`);
    }
  }

  const targetGroups = adjudicationKey.questionGroups?.filter((row) => row.classification === "construction-target") ?? [];
  const cleanGroups = adjudicationKey.questionGroups?.filter((row) => row.classification === "clean-probability-sample") ?? [];
  if (
    targetGroups.length !== 54
    || targetGroups.flatMap((row) => row.surfaces ?? []).length !== 216
    || cleanGroups.length !== 30
    || cleanGroups.flatMap((row) => row.surfaces ?? []).length !== 120
    || adjudicationKey.lessons?.length !== 96
  ) push("adjudication-topology", "Adjudication key does not bind the complete target census, clean sample, and lesson census.");
  const { keySha256, ...adjudicationBody } = adjudicationKey;
  if (keySha256 !== canonicalSha256(adjudicationBody) || registration.adjudicationKeySha256 !== keySha256) push("adjudication-key-commitment", "Adjudication key commitment is invalid.");
  const { registrationSha256, ...registrationBody } = registration;
  if (registrationSha256 !== canonicalSha256(registrationBody)) push("registration-commitment", "Registration self-commitment is invalid.");
  if (
    registration.formalExecutionAuthorized !== false
    || registration.liveProviderAuthorized !== false
    || registration.productionAuthorized !== false
    || registration.reviewerBoundary?.modelOnlyApprovalForbidden !== true
  ) push("authorization-boundary", "A18 review registration must remain human-gated and fail closed on F3/provider/production.");
  return findings;
}

function exactByteSha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function writeFrozenExact(filePath, text, mode) {
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    const existing = await readFile(filePath, "utf8");
    if (existing !== text) throw new Error(`Refusing to overwrite a non-identical frozen review artifact: ${filePath}`);
    await chmod(filePath, mode);
    return;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const temporaryPath = `${filePath}.${process.pid}.${canonicalSha256([filePath, text]).slice(0, 16)}.tmp`;
  try {
    await writeFile(temporaryPath, text, { encoding: "utf8", mode, flag: "wx" });
    await chmod(temporaryPath, mode);
    try {
      await link(temporaryPath, filePath);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await readFile(filePath, "utf8");
      if (existing !== text) throw new Error(`Refusing to overwrite a non-identical frozen review artifact: ${filePath}`);
    }
    await chmod(filePath, mode);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

export async function writeA18BlindReviewMaterials({ materials, publicRegistrationPath, restrictedRoot }) {
  const findings = validateA18BlindReviewMaterials(materials);
  if (findings.length > 0) throw new Error(`A18 blind-review materials are invalid: ${findings.map((row) => row.code).join(", ")}`);
  await mkdir(path.dirname(publicRegistrationPath), { recursive: true });
  await mkdir(restrictedRoot, { recursive: true, mode: 0o700 });
  await chmod(restrictedRoot, 0o700);

  const files = [];
  const writeOne = async ({ absolutePath, value, visibility, mode }) => {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    await writeFrozenExact(absolutePath, text, mode);
    files.push({ absolutePath, visibility, sha256: exactByteSha256(text) });
  };
  await writeOne({
    absolutePath: publicRegistrationPath,
    value: materials.registration,
    visibility: "public",
    mode: 0o644
  });
  for (const reviewer of materials.reviewers) {
    await writeOne({
      absolutePath: path.join(restrictedRoot, `${reviewer.reviewerSlot}-phase1.json`),
      value: reviewer.phase1,
      visibility: "restricted",
      mode: 0o600
    });
    await writeOne({
      absolutePath: path.join(restrictedRoot, `${reviewer.reviewerSlot}-phase2.json`),
      value: reviewer.phase2,
      visibility: "restricted",
      mode: 0o600
    });
  }
  await writeOne({
    absolutePath: path.join(restrictedRoot, "adjudication-key.json"),
    value: materials.adjudicationKey,
    visibility: "restricted",
    mode: 0o600
  });
  return { files };
}
