import { createHash } from "node:crypto";

import { calculateArtifactHash, canonicalJson } from "../design-v2/design-contract.mjs";
import {
  DESIGN_ID,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  STRATA,
  buildC0RandomAuditV3,
  buildCleanSourceEvidenceV3,
  buildClusterAuditV3,
  buildFrameFreezeEvidenceV4,
  buildFrameItemEgressDecisionV4,
  buildFrameRegistrationV3,
  buildItemEgressScreenEvidenceV4,
  buildRightsEgressDecisionTableV4,
  buildRuntimeConfigEvidenceV4,
  buildRuntimeExtractionSnapshotV3,
  buildRuntimeSourceEnumerationReceiptV1,
  buildScannerExecutionReceiptInventoryV4,
  buildScannerExecutionReceiptV4,
  buildSampleManifestV3,
  buildSourceModuleManifestV4,
  buildThreeRouteSourceParityEvidenceV4,
  canonicalizeStrictItemJsonV4,
  calculateExactDuplicateGroupIdV3,
  calculateItemContentHashV3,
  calculateLineageKeyHashV3,
  calculateNormalizedPromptHashV3,
  calculateRuntimeProjectionHashV3,
  calculateTemplateSkeletonHashV3,
  materializeFrameSamplingWeightsV3,
  LINEAGE_RULE_HASH_V4,
  RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
  V4_LOCALE_POLICY,
} from "./sample-contract.mjs";

export const REGISTRATION_HASH = "3".repeat(64);
const DEFAULT_RUNTIME_CONFIG_INPUT = Object.freeze({
  actor: "AUTHENTICATED_STUDENT",
  curriculumProfile: "US_CA_MATH",
  gradeProjectionUnion: Object.freeze([...RUNTIME_SOURCE_ENUMERATION_GRADES]),
  maxAnswerChoices: 0,
  accommodationOptionTruncation: false,
  perStudentReducedChoicesApplied: false,
  localePolicy: V4_LOCALE_POLICY,
  activePackStateHash: localHash("fixture-active-pack-state"),
  featureFlagStateHash: localHash("fixture-feature-flag-state"),
});
export const RUNTIME_CONFIG_HASH = buildRuntimeConfigEvidenceV4(DEFAULT_RUNTIME_CONFIG_INPUT).runtimeConfigHash;
export const SOURCE_COMMIT = "5".repeat(40);
export const CLUSTERING_ALGORITHM_HASH = "6".repeat(64);
export const FROZEN_AT = "2026-08-25T05:00:00.000Z";
export const EXTRACTOR_IMPLEMENTATION_HASH = "7".repeat(64);
export const EXTRACTOR_RUNNER_COMMIT = "8".repeat(40);
export const EXTRACTOR_RUNNER_HASH = "9".repeat(64);
export const RAW_SOURCE_EVIDENCE_ARTIFACT_ROOT_HASH = "a".repeat(64);
export const LINEAGE_RULE_APPROVAL_HASH = "b".repeat(64);
export const FRAME_REGISTRATION_FROZEN_AT = "2026-08-25T05:02:00.000Z";
export const SAMPLE_FROZEN_AT = "2026-08-25T05:03:00.000Z";
export const C0_FROZEN_AT = "2026-08-25T05:04:00.000Z";
export const DEFAULT_FIXTURE_TIMESTAMPS = Object.freeze({
  sourceEnumeratedAt: "2026-08-25T04:56:00.000Z",
  runtimeExtractedAt: "2026-08-25T04:57:00.000Z",
  sourceVerifiedAt: "2026-08-25T04:58:00.000Z",
  clusterAuditedAt: FROZEN_AT,
  frameFrozenAt: FRAME_REGISTRATION_FROZEN_AT,
  sampleFrozenAt: SAMPLE_FROZEN_AT,
  c0FrozenAt: C0_FROZEN_AT,
});

export function localHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function withHash(artifact, field) {
  artifact[field] = calculateArtifactHash(artifact, field);
  return artifact;
}

export function exactGroupFor(row) {
  return calculateExactDuplicateGroupIdV3(row);
}

export function rehashRow(row) {
  row.lineageKeyHash = calculateLineageKeyHashV3(row);
  row.itemHash = calculateItemContentHashV3(row);
  row.exactDuplicateGroupId = exactGroupFor(row);
  row.normalizedPromptHash = calculateNormalizedPromptHashV3(row);
  row.templateSkeletonHash = calculateTemplateSkeletonHashV3(row);
  return withHash(row, "rowHash");
}

export function rematerializeRows(rows, registrationHash = rows[0]?.registrationHash ?? REGISTRATION_HASH) {
  const materialized = materializeFrameSamplingWeightsV3(rows, registrationHash);
  rows.splice(0, rows.length, ...materialized);
  return rows;
}

export function makeRow({
  itemId,
  clusterId,
  responseForm,
  difficulty,
  eligible = true,
  runtimeLocalized = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  sourceCommit = SOURCE_COMMIT,
  sourceModuleHash = null,
  sourceIds = ["california-math-common-core-skill"],
  frameFrozenAt = FROZEN_AT,
}) {
  const protectedPrompt = `Solve the protected fixture token ${localHash(itemId).slice(0, 16)}.`;
  const protectedOptions = responseForm === "multiple-choice" ? ["1", "2", "3"] : null;
  const protectedExplanation = "Fixture-only explanation.";
  const canonicalTopic = `topic-${responseForm}-${difficulty}`;
  const localized = (value, prefix) => ({
    en: value,
    zh: `${prefix} ${value}`,
    zhHans: `${prefix} ${value}`,
  });
  const row = {
    schemaVersion: "SamplingFrameRowV2",
    designId: DESIGN_ID,
    registrationHash,
    frameFrozenAt,
    itemId,
    canonicalTopic,
    itemHash: null,
    runtimeConfigHash,
    sourceCommit,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    grade: "P5",
    sourceModuleHash: sourceModuleHash ?? localHash(`source-module:${itemId}`),
    homologyClusterId: clusterId,
    exactDuplicateGroupId: null,
    sourceClusterId: null,
    responseForm,
    difficulty,
    eligible,
    exclusionCode: eligible ? null : "RESTRICTED_EGRESS_CONTENT",
    inclusionProbability: eligible ? 1 : 0,
    analysisWeight: eligible ? 1 : 0,
    clusterInclusionProbability: eligible ? 1 : 0,
    representativeSelectionProbability: eligible ? 1 : 0,
    clusterRepresentative: eligible,
    assignedClusterStratum: eligible ? `${responseForm}::${difficulty}` : null,
    analysisWeightPurpose: eligible
      ? "SECONDARY_CLUSTER_REPRESENTATIVE_INVENTORY_IPW"
      : "EXCLUDED_FROM_ALL_ESTIMANDS",
    runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
    runtimeVisible: true,
    egressEligibility: eligible ? "ELIGIBLE" : "INELIGIBLE_CLOSED_EXCLUSION",
    egressRights: {
      piiScreenPassed: true,
      secretsScreenPassed: true,
      copyrightExternalizationAuthorized: eligible,
      providerEgressAllowed: eligible,
    },
    serializationStatus: "SERIALIZED",
    answerPresent: true,
    optionsPresent: responseForm === "multiple-choice",
    explanationPresent: true,
    prompt: runtimeLocalized ? localized(protectedPrompt, "受保護") : protectedPrompt,
    options: runtimeLocalized && protectedOptions !== null
      ? protectedOptions.map((option) => localized(option, "選項"))
      : protectedOptions,
    ...(runtimeLocalized ? { answer: "2" } : {}),
    storedAnswer: "2",
    acceptedAnswers: ["2"],
    explanation: runtimeLocalized ? localized(protectedExplanation, "受保護") : protectedExplanation,
    ...(runtimeLocalized ? {
      topic: localized(canonicalTopic, "主題"),
      localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
      diagram: null,
      questionAssets: [],
      sourceIds: [...sourceIds],
    } : {
      locale: "en-US",
      topic: canonicalTopic,
    }),
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
    normalizedPromptHash: null,
    templateSkeletonHash: null,
    lineageKind: null,
    lineageKeyHash: null,
    packageId: null,
    batchId: null,
    clusterId: null,
    topicId: null,
    generationTemplate: null,
    sourceLessonSlug: null,
    sourceModule: `fixture/${itemId}.ts`,
    provenanceType: "RUNTIME_NATURAL_ITEM",
  };
  return rehashRow(row);
}

export function makeFrameRows(capacities = Array(9).fill(12), {
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  sourceCommit = SOURCE_COMMIT,
  sourceModuleHash = null,
  frameFrozenAt = FROZEN_AT,
} = {}) {
  const rows = [];
  let itemSequence = 0;
  for (let cellIndex = 0; cellIndex < STRATA.length; cellIndex += 1) {
    const [responseForm, difficulty] = STRATA[cellIndex].split("::");
    for (let clusterIndex = 0; clusterIndex < capacities[cellIndex]; clusterIndex += 1) {
      itemSequence += 1;
      rows.push(makeRow({
        itemId: `item-${String(itemSequence).padStart(4, "0")}`,
        clusterId: `cluster-${String(cellIndex).padStart(2, "0")}-${String(clusterIndex).padStart(3, "0")}`,
        responseForm,
        difficulty,
        runtimeLocalized: true,
        registrationHash,
        runtimeConfigHash,
        sourceCommit,
        sourceModuleHash,
        frameFrozenAt,
      }));
    }
  }
  if (crossCell) {
    const [responseForm, difficulty] = STRATA[8].split("::");
    itemSequence += 1;
    const crossRow = makeRow({
      itemId: `item-${String(itemSequence).padStart(4, "0")}`,
      clusterId: "cluster-00-000",
      responseForm,
      difficulty,
      runtimeLocalized: true,
      registrationHash,
      runtimeConfigHash,
      sourceCommit,
      sourceModuleHash,
      frameFrozenAt,
    });
    for (const field of ["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation"]) {
      crossRow[field] = structuredClone(rows[0][field]);
    }
    crossRow.answerPresent = rows[0].answerPresent;
    crossRow.optionsPresent = rows[0].optionsPresent;
    crossRow.explanationPresent = rows[0].explanationPresent;
    rehashRow(crossRow);
    rows.push(crossRow);
  }
  itemSequence += 1;
  rows.push(makeRow({
    itemId: `item-${String(itemSequence).padStart(4, "0")}`,
    clusterId: "excluded-cluster",
    responseForm: "multiple-choice",
    difficulty: "Low",
    eligible: false,
    runtimeLocalized: true,
    registrationHash,
    runtimeConfigHash,
    sourceCommit,
    sourceModuleHash,
    sourceIds: ["ccss-math-textbook-app"],
    frameFrozenAt,
  }));
  return materializeFrameSamplingWeightsV3(rows, registrationHash);
}

export function makeRuntimeSourceEnumerationReceipt(frameRows, {
  registrationHash = frameRows[0]?.registrationHash ?? REGISTRATION_HASH,
  runtimeConfigHash = frameRows[0]?.runtimeConfigHash ?? RUNTIME_CONFIG_HASH,
  runtimeConfigEvidenceHash = runtimeConfigHash,
  sourceParityEvidenceHash = localHash("fixture-source-parity-evidence"),
  sourceModuleManifestHash = localHash("fixture-source-module-manifest"),
  sourceCommit = frameRows[0]?.sourceCommit ?? SOURCE_COMMIT,
  enumeratedAt = DEFAULT_FIXTURE_TIMESTAMPS.sourceEnumeratedAt,
  failureItemIds = [],
  includeClosedSourceExclusionFixtures = true,
} = {}) {
  const failures = new Set(failureItemIds);
  const leavesByGrade = new Map(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [grade, []]));
  for (const row of frameRows) {
    let disposition;
    let exclusionCode;
    if (failures.has(row.itemId)) {
      disposition = "RUNTIME_VISIBLE_SERIALIZATION_FAILURE";
      exclusionCode = "UNSTABLE_SERIALIZATION";
    } else if (row.eligible) {
      disposition = "RUNTIME_VISIBLE_SERIALIZED_ELIGIBLE";
      exclusionCode = null;
    } else if (row.exclusionCode === "RESTRICTED_EGRESS_CONTENT") {
      disposition = "RUNTIME_VISIBLE_SERIALIZED_RESTRICTED";
      exclusionCode = "RESTRICTED_EGRESS_CONTENT";
    } else {
      throw new TypeError(`fixture frame row ${row.itemId} has no runtime source-enumeration disposition`);
    }
    leavesByGrade.get(row.grade).push({
      itemId: row.itemId,
      sourceItemHash: row.itemHash,
      sourceModuleHash: row.sourceModuleHash,
      runtimeProjectionHash: calculateRuntimeProjectionHashV3(row),
      disposition,
      exclusionCode,
    });
  }
  if (includeClosedSourceExclusionFixtures) {
    const excludedFixtures = [
      ["K", "fixture-source-non-ca", "SOURCE_EXCLUDED_NON_CA_TRACK", "NON_CA_TRACK"],
      ["P1", "fixture-source-runtime-hidden", "SOURCE_EXCLUDED_RUNTIME_NOT_VISIBLE", "RUNTIME_NOT_VISIBLE"],
      ["P2", "fixture-source-synthetic", "SOURCE_EXCLUDED_SYNTHETIC_TEST_CANDIDATE_ONLY", "SYNTHETIC_TEST_CANDIDATE_ONLY"],
    ];
    for (const [grade, itemId, disposition, exclusionCode] of excludedFixtures) {
      leavesByGrade.get(grade).push({
        itemId,
        sourceItemHash: localHash(`source-item:${itemId}`),
        sourceModuleHash: localHash(`source-module:${itemId}`),
        runtimeProjectionHash: null,
        disposition,
        exclusionCode,
      });
    }
  }
  return buildRuntimeSourceEnumerationReceiptV1({
    registrationHash,
    sourceCommit,
    runtimeConfigHash,
    runtimeConfigEvidenceHash,
    sourceParityEvidenceHash,
    sourceModuleManifestHash,
    extractorImplementationHash: EXTRACTOR_IMPLEMENTATION_HASH,
    extractorRunnerCommit: EXTRACTOR_RUNNER_COMMIT,
    extractorRunnerHash: EXTRACTOR_RUNNER_HASH,
    rawEvidenceArtifactRootHash: RAW_SOURCE_EVIDENCE_ARTIFACT_ROOT_HASH,
    enumeratedAt,
    gradeProjectionInvocations: RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
      grade,
      itemLeaves: leavesByGrade.get(grade),
    })),
  });
}

function runtimeConfigEvidenceFixture() {
  const input = structuredClone(DEFAULT_RUNTIME_CONFIG_INPUT);
  return { input, evidence: buildRuntimeConfigEvidenceV4(input) };
}

function dependencyClosureDescriptor(files) {
  const normalizedFiles = files.map(({ repoRelativePath, gitBlobOid }) => ({ repoRelativePath, gitBlobOid }))
    .sort((left, right) => left.repoRelativePath.localeCompare(right.repoRelativePath));
  return {
    schemaVersion: "DependencyClosureTrustDescriptorV1",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: SOURCE_COMMIT,
    extractorImplementationHash: localHash("fixture-dependency-extractor"),
    runnerCommit: EXTRACTOR_RUNNER_COMMIT,
    runnerHash: EXTRACTOR_RUNNER_HASH,
    fileCount: normalizedFiles.length,
    sourceModuleHash: localHash(canonicalJson(normalizedFiles)),
  };
}

function sourceModuleManifestInputFixture(routeExecutionTrustRootHash) {
  const files = [
    { repoRelativePath: "data/usCaliforniaQuestions.ts", gitBlobOid: "1".repeat(40) },
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "2".repeat(40) },
  ];
  const dependencyClosureTrustDescriptor = dependencyClosureDescriptor(files);
  const dependencyClosureRunnerReceipt = withHash({
    schemaVersion: "DependencyClosureRunnerReceiptV1",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: SOURCE_COMMIT,
    extractorImplementationHash: localHash("fixture-dependency-extractor"),
    runnerCommit: EXTRACTOR_RUNNER_COMMIT,
    runnerHash: EXTRACTOR_RUNNER_HASH,
    executedAt: "2026-08-25T04:50:00.000Z",
  }, "runnerReceiptHash");
  return {
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: SOURCE_COMMIT,
    routeExecutionTrustRootHash,
    dependencyClosureExtractorImplementationHash: localHash("fixture-dependency-extractor"),
    dependencyClosureRunnerReceipt,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash: localHash(canonicalJson(dependencyClosureTrustDescriptor)),
    files,
  };
}

function strictContentHash(value) {
  return localHash(canonicalJson(canonicalizeStrictItemJsonV4(value)));
}

function rawQuestionFixture(row) {
  return {
    id: row.itemId,
    batch: "mais-natural-ca60-v4-fixture",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: row.grade,
    usGradeLabel: "Grade 5",
    topicId: row.canonicalTopic,
    standardIds: ["5.NF.A.1"],
    domainTags: ["number-and-operations-fractions"],
    conceptIds: ["fixture-concept"],
    difficulty: { level: row.difficulty, score: 0.5 },
    type: row.responseForm,
    prompt: structuredClone(row.prompt),
    ...(Array.isArray(row.options) ? { options: structuredClone(row.options) } : {}),
    answer: row.answer,
    acceptedAnswers: structuredClone(row.acceptedAnswers),
    explanation: structuredClone(row.explanation),
    independentAnswer: row.acceptedAnswers?.at(-1) ?? row.answer,
    independentSolution: row.explanation.en,
    evidenceCardIds: ["fixture-evidence-card"],
    sourceIds: structuredClone(row.sourceIds),
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "passed-deterministic-solvability",
    manualQaStatus: "accepted-two-round-internal-qa",
    sourcePackageId: "fixture-source-package",
    sourceKind: "k-g5-textbook-lesson",
    domainId: "number-and-operations-fractions",
    domainTitle: "Number and Operations—Fractions",
    clusterId: row.clusterId,
    clusterTitle: "Fixture cluster",
    knowledgePointId: "fixture-kp",
    knowledgePointCode: "5.NF.A.1",
    knowledgePointTitle: "Fixture knowledge point",
  };
}

function runtimeQuestionFixture(row) {
  return canonicalizeStrictItemJsonV4({
    id: row.itemId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: row.canonicalTopic,
    grade: row.grade,
    topicId: row.canonicalTopic,
    topic: structuredClone(row.topic),
    difficulty: row.difficulty,
    type: row.responseForm,
    prompt: structuredClone(row.prompt),
    ...(Array.isArray(row.options) ? { options: structuredClone(row.options) } : {}),
    answer: row.answer,
    acceptedAnswers: structuredClone(row.acceptedAnswers),
    explanation: structuredClone(row.explanation),
    diagram: row.diagram,
    questionAssets: structuredClone(row.questionAssets),
  });
}

function publicQuestionFixture(full) {
  return canonicalizeStrictItemJsonV4({
    id: full.id,
    curriculumTrack: full.curriculumTrack,
    curriculumProfile: full.curriculumProfile,
    region: full.region,
    publisher: full.publisher,
    canonicalTopicId: full.canonicalTopicId,
    grade: full.grade,
    topicId: full.topicId,
    topic: full.topic,
    difficulty: full.difficulty,
    type: full.type,
    prompt: full.prompt,
    ...(Array.isArray(full.options) ? { options: full.options } : {}),
    diagram: full.diagram,
    questionAssets: full.questionAssets,
  });
}

function routeRunnerReceipt(schemaVersion, implementationHash, sourceCommit, executedAt, entries, extraRoots) {
  return withHash({
    schemaVersion,
    implementationHash,
    sourceCommit,
    runnerCommit: EXTRACTOR_RUNNER_COMMIT,
    runnerHash: EXTRACTOR_RUNNER_HASH,
    executedAt,
    entries,
    entryRootHash: strictContentHash(entries),
    ...extraRoots,
  }, "runnerReceiptHash");
}

function routeExecutionTrustDescriptor(parityInput) {
  return {
    schemaVersion: "RouteExecutionTrustDescriptorV2",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: parityInput.converterRunnerReceipt.sourceCommit,
    converter: {
      implementationHash: parityInput.converterRunnerReceipt.implementationHash,
      runnerCommit: parityInput.converterRunnerReceipt.runnerCommit,
      runnerHash: parityInput.converterRunnerReceipt.runnerHash,
      runnerReceiptHash: parityInput.converterRunnerReceipt.runnerReceiptHash,
      rawRootHash: parityInput.converterRunnerReceipt.rawRootHash,
      convertedFullRootHash: parityInput.converterRunnerReceipt.convertedFullRootHash,
    },
    normalization: {
      implementationHash: parityInput.normalizationRunnerReceipt.implementationHash,
      runnerCommit: parityInput.normalizationRunnerReceipt.runnerCommit,
      runnerHash: parityInput.normalizationRunnerReceipt.runnerHash,
      runnerReceiptHash: parityInput.normalizationRunnerReceipt.runnerReceiptHash,
      convertedFullRootHash: parityInput.normalizationRunnerReceipt.convertedFullRootHash,
      normalizedFullRootHash: parityInput.normalizationRunnerReceipt.normalizedFullRootHash,
    },
    publicProjection: {
      implementationHash: parityInput.publicProjectionRunnerReceipt.implementationHash,
      runnerCommit: parityInput.publicProjectionRunnerReceipt.runnerCommit,
      runnerHash: parityInput.publicProjectionRunnerReceipt.runnerHash,
      runnerReceiptHash: parityInput.publicProjectionRunnerReceipt.runnerReceiptHash,
      convertedFullRootHash: parityInput.publicProjectionRunnerReceipt.convertedFullRootHash,
      gradePublicUnionRootHash: parityInput.publicProjectionRunnerReceipt.gradePublicUnionRootHash,
      gradeProjectionInvocationRootHash: parityInput.publicProjectionRunnerReceipt.gradeProjectionInvocationRootHash,
    },
  };
}

function threeRouteParityInputFixture(frameRows) {
  const rawItems = frameRows.map(rawQuestionFixture);
  const convertedFullItems = frameRows.map(runtimeQuestionFixture);
  const normalizedFullItems = structuredClone(frameRows);
  const gradePublicItems = Object.fromEntries(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [
    grade,
    convertedFullItems.filter((item) => item.grade === grade).map(publicQuestionFixture),
  ]));
  const rawRootHash = strictContentHash(rawItems);
  const convertedFullRootHash = strictContentHash(convertedFullItems);
  const normalizedFullRootHash = strictContentHash(normalizedFullItems);
  const gradePublicUnion = RUNTIME_SOURCE_ENUMERATION_GRADES.flatMap((grade) => (
    gradePublicItems[grade].map((publicItem) => ({ grade, publicItem }))
  ));
  const gradePublicUnionRootHash = strictContentHash(gradePublicUnion);
  const gradeProjectionInvocations = RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
    grade,
    itemCount: gradePublicItems[grade].length,
    publicContentRootHash: strictContentHash(gradePublicItems[grade]),
  }));
  const gradeProjectionInvocationRootHash = strictContentHash(gradeProjectionInvocations);
  const converterImplementationHash = localHash("fixture-converter-implementation");
  const normalizationImplementationHash = localHash("fixture-normalizer-implementation");
  const publicProjectionImplementationHash = localHash("fixture-public-projection-implementation");
  const converterRunnerReceipt = routeRunnerReceipt(
    "RawToRuntimeQuestionConverterRunnerReceiptV1",
    converterImplementationHash,
    SOURCE_COMMIT,
    "2026-08-25T04:51:00.000Z",
    frameRows.map((row, index) => ({
      itemId: row.itemId,
      rawContentHash: strictContentHash(rawItems[index]),
      convertedFullContentHash: strictContentHash(convertedFullItems[index]),
    })),
    { rawRootHash, convertedFullRootHash },
  );
  const normalizationRunnerReceipt = routeRunnerReceipt(
    "RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1",
    normalizationImplementationHash,
    SOURCE_COMMIT,
    "2026-08-25T04:52:00.000Z",
    frameRows.map((row, index) => ({
      itemId: row.itemId,
      convertedFullContentHash: strictContentHash(convertedFullItems[index]),
      normalizedItemHash: row.itemHash,
    })),
    { convertedFullRootHash, normalizedFullRootHash },
  );
  const publicProjectionRunnerReceipt = routeRunnerReceipt(
    "RuntimeQuestionToPublicQuestionRunnerReceiptV1",
    publicProjectionImplementationHash,
    SOURCE_COMMIT,
    "2026-08-25T04:53:00.000Z",
    frameRows.map((row, index) => ({
      itemId: row.itemId,
      grade: row.grade,
      convertedFullContentHash: strictContentHash(convertedFullItems[index]),
      publicContentHash: strictContentHash(publicQuestionFixture(convertedFullItems[index])),
    })),
    { convertedFullRootHash, gradePublicUnionRootHash, gradeProjectionInvocationRootHash },
  );
  const input = {
    rawItems,
    convertedFullItems,
    normalizedFullItems,
    gradePublicItems,
    converterRunnerReceipt,
    normalizationRunnerReceipt,
    publicProjectionRunnerReceipt,
    runtimeLoaderEvidence: {
      rawLoader: "DIRECT_IMPORT",
      convertedFullLoader: "DIRECT_IMPORT",
      gradePublicLoader: "DIRECT_IMPORT",
      optionalQuestionModuleUsed: false,
      apiPreviewUsed: false,
      gradeProjectionCount: 13,
      rawConversionUsed: true,
      converterImplementationHash,
      converterRunnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
      normalizationImplementationHash,
      normalizationRunnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
      publicProjectionImplementationHash,
      publicProjectionRunnerReceiptHash: publicProjectionRunnerReceipt.runnerReceiptHash,
    },
    mapFirstWinsUsed: false,
  };
  input.routeExecutionTrustDescriptor = routeExecutionTrustDescriptor(input);
  return input;
}

function completeFrameFreezeEvidenceFixture(frameRows, runtimeConfigInput, runtimeConfigEvidence, sourceParityInput, sourceParityEvidence, sourceModuleManifestInput, sourceModuleManifest) {
  const rightsDecisionInput = {
    sourceIds: [...RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    registry: {
      "california-math-common-core-skill": {
        disposition: "OWNER_APPROVED",
        ownerApprovalHash: localHash("fixture-california-owner-approval"),
        providerEgressAllowed: true,
      },
      "ccss-math-textbook-app": { disposition: "DENIED" },
    },
    ownerApprovalClaimsBySource: {
      "california-math-common-core-skill": localHash("fixture-california-owner-approval"),
    },
  };
  const rightsDecisionTable = buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const scannerExecutionReceipts = frameRows.map((row, index) => buildScannerExecutionReceiptV4({
    itemId: row.itemId,
    itemHash: row.itemHash,
    screeningPolicyHash: localHash("fixture-screening-policy"),
    scannerImplementationHash: localHash("fixture-scanner-implementation"),
    scannerRunnerHash: localHash("fixture-scanner-runner"),
    piiEvidenceRootHash: localHash(`fixture-pii-evidence-${index}`),
    secretEvidenceRootHash: localHash(`fixture-secret-evidence-${index}`),
    scannerExecutionStatus: "COMPLETED",
    piiFindingCount: 0,
    secretFindingCount: 0,
    executedAt: "2026-08-25T04:54:00.000Z",
  }));
  const scannerExecutionReceiptInventory = buildScannerExecutionReceiptInventoryV4({
    scannerExecutionReceipts,
    recordedAt: "2026-08-25T04:55:00.000Z",
  });
  const itemScreenEvidence = scannerExecutionReceipts.map((scannerExecutionReceipt) => (
    buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt })
  ));
  const trusted = {
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash: sourceModuleManifest.dependencyClosureTrustRootHash,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: localHash("fixture-screening-policy"),
    trustedScannerImplementationHash: localHash("fixture-scanner-implementation"),
    trustedScannerRunnerHash: localHash("fixture-scanner-runner"),
  };
  const itemEgressDecisions = frameRows.map((item, index) => buildFrameItemEgressDecisionV4({
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: trusted.trustedOwnerApprovalRootHash,
    screenEvidence: itemScreenEvidence[index],
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: trusted.trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: trusted.trustedScreeningPolicyHash,
    trustedScannerImplementationHash: trusted.trustedScannerImplementationHash,
    trustedScannerRunnerHash: trusted.trustedScannerRunnerHash,
  }));
  const input = {
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    trustedRouteExecutionRootHash: trusted.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: trusted.trustedDependencyClosureRootHash,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: trusted.trustedOwnerApprovalRootHash,
    itemScreenEvidence,
    itemEgressDecisions,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: trusted.trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: trusted.trustedScreeningPolicyHash,
    trustedScannerImplementationHash: trusted.trustedScannerImplementationHash,
    trustedScannerRunnerHash: trusted.trustedScannerRunnerHash,
  };
  return { input, evidence: buildFrameFreezeEvidenceV4({ frameRows, ...input }), ...trusted };
}

export function makeBundle(capacities = Array(9).fill(12), {
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  timestamps = {},
} = {}) {
  const {
    runtimeExtractedAt = DEFAULT_FIXTURE_TIMESTAMPS.runtimeExtractedAt,
    sourceVerifiedAt = DEFAULT_FIXTURE_TIMESTAMPS.sourceVerifiedAt,
    clusterAuditedAt = DEFAULT_FIXTURE_TIMESTAMPS.clusterAuditedAt,
    frameFrozenAt = DEFAULT_FIXTURE_TIMESTAMPS.frameFrozenAt,
    sampleFrozenAt = DEFAULT_FIXTURE_TIMESTAMPS.sampleFrozenAt,
    c0FrozenAt = DEFAULT_FIXTURE_TIMESTAMPS.c0FrozenAt,
  } = timestamps;
  const sourceEnumeratedAt = timestamps.sourceEnumeratedAt
    ?? new Date(Date.parse(runtimeExtractedAt) - 60_000).toISOString();
  const { input: runtimeConfigInput, evidence: runtimeConfigEvidence } = runtimeConfigEvidenceFixture();
  if (runtimeConfigHash !== runtimeConfigEvidence.runtimeConfigHash) {
    throw new TypeError("runtimeConfigHash must equal the complete frozen RuntimeConfigEvidence root; caller-chosen roots are forbidden");
  }
  const provisionalSourceModuleManifestInput = sourceModuleManifestInputFixture(localHash("fixture-provisional-route-trust-root"));
  const provisionalSourceModuleManifest = buildSourceModuleManifestV4(provisionalSourceModuleManifestInput);
  const frameRows = makeFrameRows(capacities, {
    crossCell,
    registrationHash,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit: provisionalSourceModuleManifest.sourceCommit,
    sourceModuleHash: provisionalSourceModuleManifest.sourceModuleHash,
    frameFrozenAt: clusterAuditedAt,
  });
  const sourceParityInput = threeRouteParityInputFixture(frameRows);
  const sourceParityEvidence = buildThreeRouteSourceParityEvidenceV4(sourceParityInput);
  const sourceModuleManifestInput = sourceModuleManifestInputFixture(sourceParityEvidence.routeExecutionTrustRootHash);
  const sourceModuleManifest = buildSourceModuleManifestV4(sourceModuleManifestInput);
  if (sourceModuleManifest.sourceModuleHash !== provisionalSourceModuleManifest.sourceModuleHash) {
    throw new TypeError("fixture transitive source module hash changed when binding the route execution trust root");
  }
  const frameFreeze = completeFrameFreezeEvidenceFixture(
    frameRows,
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
  );
  const runtimeSourceEnumerationReceipt = makeRuntimeSourceEnumerationReceipt(frameRows, {
    registrationHash,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    runtimeConfigEvidenceHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceParityEvidenceHash: sourceParityEvidence.parityEvidenceHash,
    sourceModuleManifestHash: sourceModuleManifest.sourceModuleManifestHash,
    enumeratedAt: sourceEnumeratedAt,
  });
  const runtimeExtractionSnapshot = buildRuntimeExtractionSnapshotV3({
    frameRows,
    expectedInventoryLeaves: runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger: [],
    registrationHash,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit: sourceModuleManifest.sourceCommit,
    extractedAt: runtimeExtractedAt,
    trustedRouteExecutionRootHash: frameFreeze.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameFreeze.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameFreeze.trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput: frameFreeze.input,
    frameFreezeEvidence: frameFreeze.evidence,
  });
  const cleanSourceEvidence = buildCleanSourceEvidenceV3({
    sourceCommit: SOURCE_COMMIT,
    verifiedAt: sourceVerifiedAt,
    gitStatusPorcelain: "",
    sourceObjectType: "commit",
    verificationMode: "READ_ONLY_GIT_STATUS_AND_CAT_FILE",
  });
  const clusterAudit = buildClusterAuditV3({
    frameRows,
    registrationHash,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: clusterAuditedAt,
  });
  const frameRegistration = buildFrameRegistrationV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit: sourceModuleManifest.sourceCommit,
    frozenAt: frameFrozenAt,
    lineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedRouteExecutionRootHash: frameFreeze.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameFreeze.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameFreeze.trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput: frameFreeze.input,
    frameFreezeEvidence: frameFreeze.evidence,
  });
  const sampleManifest = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: sampleFrozenAt,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  const c0RandomAudit = buildC0RandomAuditV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    frozenAt: c0FrozenAt,
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  return {
    frameRows,
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    frameFreezeEvidenceInput: frameFreeze.input,
    frameFreezeEvidence: frameFreeze.evidence,
    runtimeSourceEnumerationReceipt,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    frameRegistration,
    sampleManifest,
    c0RandomAudit,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    lineageRuleHash: LINEAGE_RULE_HASH_V4,
  };
}

/** Shared, deterministic, synthetic full-root fixture for V3 integration tests. */
export function buildFullSampleContractFixture({
  capacities = Array(9).fill(12),
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  timestamps = {},
} = {}) {
  return makeBundle(capacities, { crossCell, registrationHash, runtimeConfigHash, timestamps });
}
