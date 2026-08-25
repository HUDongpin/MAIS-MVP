import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  C0_AUDIT_ALGORITHM_HASH,
  C0_AUDIT_ALGORITHM_VERSION,
  C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER,
  C0_AUDIT_SELECTION_DIGEST_CONTRACT,
  C0_AUDIT_SELECTION_FORMULA,
  C0_AUDIT_SELECTION_GOLDEN_VECTOR,
  DESIGN_ID,
  FRAME_FAILURE_CLASSES_V4,
  LOCALIZED_TEXT_KEYS_V4,
  PUBLIC_ROUTE_REQUIRED_FIELDS_V4,
  RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  SAMPLE_SELECTION_DIGEST_FIELD_ORDER,
  SAMPLE_SELECTION_DIGEST_CONTRACT,
  SAMPLE_SELECTION_FORMULA,
  SAMPLE_SELECTION_GOLDEN_VECTOR,
  SELECTION_DIGEST_BYTE_ENCODING,
  SELECTION_DIGEST_CANONICALIZATION,
  SOURCE_ENUMERATION_EVIDENCE_BOUNDARY,
  SAMPLE_ALGORITHM_HASH,
  SAMPLE_ALGORITHM_VERSION,
  STRICT_ITEM_JSON_CONTRACT_V4,
  V4_LOCALE_POLICY,
  buildC0RandomAuditV3,
  buildCleanSourceEvidenceV3,
  buildClusterAuditV3,
  buildFrameRegistrationV3,
  buildFrameFreezeEvidenceV4,
  buildFrameItemEgressDecisionV4,
  buildItemEgressScreenEvidenceV4,
  buildScannerExecutionReceiptV4,
  buildScannerExecutionReceiptInventoryV4,
  buildSampleBoundProtectedItemEnvelopeV4,
  buildPreResultReplacementV3,
  buildPreResultExclusionEvidenceV4,
  buildPreResultExclusionRunnerReceiptV4,
  buildPreResultExclusionEvidenceInventoryV4,
  buildRuntimeExtractionSnapshotV3,
  buildRuntimeSourceEnumerationReceiptV1,
  buildSampleExecutionLedgerV4,
  buildRuntimeConfigEvidenceV4,
  buildRightsEgressDecisionTableV4,
  buildSourceModuleManifestV4,
  buildThreeRouteSourceParityEvidenceV4,
  buildSampleManifestV3,
  calculateNormalizedPromptHashV3,
  calculateTemplateSkeletonHashV3,
  calculateFrameRowsRootV3,
  calculateFrameSelectionContentRootV3,
  calculateItemContentHashV3,
  calculateKishEffectiveSampleSizeV3,
  calculateRuntimeProjectionHashV3,
  calculateManifestTupleRootV3,
  calculateSampleSelectionContentRootV3,
  canonicalizeStrictItemJsonV4,
  c0SelectionDigestV3,
  deriveSamplePseudonymMappingV4,
  materializeFrameSamplingWeightsV3,
  sampleSelectionDigestPreimageV3,
  c0AuditSelectionDigestPreimageV3,
  selectionDigestV3,
  validateSampleAgainstFrame,
  validateRuntimeSourceEnumerationReceiptV1,
  validateRightsRegistryV4,
  validateFreezeTimingV3,
} from "./sample-contract.mjs";
import {
  calculateArtifactHash,
  canonicalJson,
  sha256Hex,
} from "../design-v2/design-contract.mjs";
import {
  CLUSTERING_ALGORITHM_HASH,
  FROZEN_AT,
  LINEAGE_RULE_APPROVAL_HASH,
  REGISTRATION_HASH,
  RUNTIME_CONFIG_HASH as LEGACY_RUNTIME_CONFIG_HASH,
  SOURCE_COMMIT,
  buildFullSampleContractFixture as buildLegacyFullSampleContractFixture,
  exactGroupFor,
  localHash,
  makeBundle as makeLegacyBundle,
  makeFrameRows as makeLegacyFrameRows,
  makeRuntimeSourceEnumerationReceipt as makeLegacyRuntimeSourceEnumerationReceipt,
  rehashRow,
  rematerializeRows,
  withHash,
} from "./test-fixtures.mjs";

const codePointCompare = (left, right) => left < right ? -1 : left > right ? 1 : 0;

const RUNTIME_CONFIG_INPUT = Object.freeze({
  actor: "AUTHENTICATED_STUDENT",
  curriculumProfile: "US_CA_MATH",
  gradeProjectionUnion: RUNTIME_SOURCE_ENUMERATION_GRADES,
  maxAnswerChoices: 0,
  accommodationOptionTruncation: false,
  perStudentReducedChoicesApplied: false,
  localePolicy: V4_LOCALE_POLICY,
  activePackStateHash: "1".repeat(64),
  featureFlagStateHash: "2".repeat(64),
});
const RUNTIME_CONFIG_EVIDENCE = buildRuntimeConfigEvidenceV4(RUNTIME_CONFIG_INPUT);
const RUNTIME_CONFIG_HASH = RUNTIME_CONFIG_EVIDENCE.runtimeConfigHash;
const ROUTE_EXECUTION_TRUST_DESCRIPTOR = Object.freeze({
  schemaVersion: "RouteExecutionTrustDescriptorV2",
  repositoryIdentity: "wy51ai/MAIS-MVP",
  sourceCommit: SOURCE_COMMIT,
  converter: Object.freeze({
    implementationHash: "6".repeat(64),
    runnerCommit: "7".repeat(40),
    runnerHash: "8".repeat(64),
    runnerReceiptHash: "1".repeat(64),
    rawRootHash: "2".repeat(64),
    convertedFullRootHash: "3".repeat(64),
  }),
  normalization: Object.freeze({
    implementationHash: "9".repeat(64),
    runnerCommit: "7".repeat(40),
    runnerHash: "8".repeat(64),
    runnerReceiptHash: "4".repeat(64),
    convertedFullRootHash: "3".repeat(64),
    normalizedFullRootHash: "5".repeat(64),
  }),
  publicProjection: Object.freeze({
    implementationHash: "a".repeat(64),
    runnerCommit: "7".repeat(40),
    runnerHash: "8".repeat(64),
    runnerReceiptHash: "6".repeat(64),
    convertedFullRootHash: "3".repeat(64),
    gradePublicUnionRootHash: "7".repeat(64),
    gradeProjectionInvocationRootHash: "8".repeat(64),
  }),
});
const ROUTE_EXECUTION_TRUST_ROOT_HASH = sha256Hex(canonicalJson(ROUTE_EXECUTION_TRUST_DESCRIPTOR));
const SOURCE_MODULE_FILES = Object.freeze([
  Object.freeze({ repoRelativePath: "data/california/questions.ts", gitBlobOid: "a".repeat(40) }),
  Object.freeze({ repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "b".repeat(40) }),
]);
const SOURCE_MANIFEST_RUNNER_RECEIPT = withHash({
  schemaVersion: "DependencyClosureRunnerReceiptV1",
  repositoryIdentity: "wy51ai/MAIS-MVP",
  sourceCommit: SOURCE_COMMIT,
  extractorImplementationHash: "c".repeat(64),
  runnerCommit: "8".repeat(40),
  runnerHash: "9".repeat(64),
  executedAt: "2026-08-25T04:55:00.000Z",
}, "runnerReceiptHash");
const DEPENDENCY_CLOSURE_TRUST_DESCRIPTOR = Object.freeze({
  schemaVersion: "DependencyClosureTrustDescriptorV1",
  repositoryIdentity: "wy51ai/MAIS-MVP",
  sourceCommit: SOURCE_COMMIT,
  extractorImplementationHash: "c".repeat(64),
  runnerCommit: SOURCE_MANIFEST_RUNNER_RECEIPT.runnerCommit,
  runnerHash: SOURCE_MANIFEST_RUNNER_RECEIPT.runnerHash,
  fileCount: SOURCE_MODULE_FILES.length,
  sourceModuleHash: sha256Hex(canonicalJson(SOURCE_MODULE_FILES)),
});
const DEPENDENCY_CLOSURE_TRUST_ROOT_HASH = sha256Hex(canonicalJson(DEPENDENCY_CLOSURE_TRUST_DESCRIPTOR));
const SOURCE_MODULE_MANIFEST_INPUT = Object.freeze({
  repositoryIdentity: "wy51ai/MAIS-MVP",
  sourceCommit: SOURCE_COMMIT,
  routeExecutionTrustRootHash: ROUTE_EXECUTION_TRUST_ROOT_HASH,
  dependencyClosureExtractorImplementationHash: "c".repeat(64),
  dependencyClosureRunnerReceipt: SOURCE_MANIFEST_RUNNER_RECEIPT,
  dependencyClosureTrustDescriptor: DEPENDENCY_CLOSURE_TRUST_DESCRIPTOR,
  trustedDependencyClosureRootHash: DEPENDENCY_CLOSURE_TRUST_ROOT_HASH,
  files: SOURCE_MODULE_FILES,
});
const SOURCE_MODULE_MANIFEST = buildSourceModuleManifestV4(SOURCE_MODULE_MANIFEST_INPUT);
const SCREENING_ROOTS = Object.freeze({
  trustedScreeningPolicyHash: "d".repeat(64),
  trustedScannerImplementationHash: "e".repeat(64),
  trustedScannerRunnerHash: "f".repeat(64),
});
const RIGHTS_DECISION_INPUT = Object.freeze({
  sourceIds: RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
  registry: Object.freeze({
    "california-math-common-core-skill": Object.freeze({
      disposition: "OWNER_APPROVED",
      ownerApprovalHash: "a".repeat(64),
      providerEgressAllowed: true,
    }),
    "ccss-math-textbook-app": Object.freeze({ disposition: "DENIED" }),
  }),
  ownerApprovalClaimsBySource: Object.freeze({
    "california-math-common-core-skill": "a".repeat(64),
  }),
});
const RIGHTS_DECISION_TABLE = buildRightsEgressDecisionTableV4(RIGHTS_DECISION_INPUT);
const FIXTURE_TIMESTAMPS = Object.freeze({
  sourceEnumeratedAt: "2026-08-25T04:56:00.000Z",
  runtimeExtractedAt: "2026-08-25T04:57:00.000Z",
  sourceVerifiedAt: "2026-08-25T04:58:00.000Z",
  clusterAuditedAt: FROZEN_AT,
  frameFrozenAt: "2026-08-25T05:02:00.000Z",
  sampleFrozenAt: "2026-08-25T05:03:00.000Z",
  c0FrozenAt: "2026-08-25T05:04:00.000Z",
});

function makeFrameRows(capacities = Array(9).fill(12), {
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  sourceCommit = SOURCE_COMMIT,
  frameFrozenAt = FROZEN_AT,
} = {}) {
  const rows = makeLegacyFrameRows(capacities, {
    crossCell,
    registrationHash,
    runtimeConfigHash,
    sourceCommit,
    frameFrozenAt,
  });
  for (const row of rows) {
    row.grade = "P5";
    row.runtimeConfigHash = runtimeConfigHash;
    row.sourceCommit = sourceCommit;
    row.sourceModuleHash = SOURCE_MODULE_MANIFEST.sourceModuleHash;
    row.sourceIds = [row.eligible ? "california-math-common-core-skill" : "ccss-math-textbook-app"];
    rehashRow(row);
  }
  return materializeFrameSamplingWeightsV3(rows, registrationHash);
}

function strictContentHash(value) {
  return sha256Hex(canonicalJson(canonicalizeStrictItemJsonV4(value)));
}

function withDependencyClosureTrust(input, files) {
  const normalizedFiles = files.map(({ repoRelativePath, gitBlobOid }) => ({
    repoRelativePath,
    gitBlobOid: gitBlobOid.toLowerCase(),
  })).sort((left, right) => codePointCompare(left.repoRelativePath, right.repoRelativePath));
  const dependencyClosureTrustDescriptor = {
    schemaVersion: "DependencyClosureTrustDescriptorV1",
    repositoryIdentity: input.repositoryIdentity,
    sourceCommit: input.sourceCommit,
    extractorImplementationHash: input.dependencyClosureExtractorImplementationHash,
    runnerCommit: input.dependencyClosureRunnerReceipt.runnerCommit,
    runnerHash: input.dependencyClosureRunnerReceipt.runnerHash,
    fileCount: normalizedFiles.length,
    sourceModuleHash: sha256Hex(canonicalJson(normalizedFiles)),
  };
  return {
    ...input,
    files,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash: sha256Hex(canonicalJson(dependencyClosureTrustDescriptor)),
  };
}

function rawGeneratedQuestionFixture(row) {
  return canonicalizeStrictItemJsonV4({
    id: row.itemId,
    batch: "us-ca-k5-knowledge-point-practice-v1",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: row.grade,
    usGradeLabel: "Grade 5",
    topicId: row.canonicalTopic,
    standardIds: ["5.NF.A.1"],
    domainTags: ["fixture-domain"],
    conceptIds: ["fixture-concept"],
    difficulty: { level: row.difficulty, score: 0.5 },
    type: row.responseForm,
    prompt: row.prompt,
    options: Array.isArray(row.options) ? row.options : undefined,
    answer: row.answer ?? row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
    independentAnswer: row.acceptedAnswers.at(-1) ?? row.storedAnswer,
    independentSolution: row.explanation.en,
    evidenceCardIds: ["fixture-evidence-card"],
    sourceIds: row.sourceIds,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "passed-deterministic-solvability",
    manualQaStatus: "accepted-two-round-internal-qa",
    sourcePackageId: "fixture-source-package",
    sourceKind: "k-g5-textbook-lesson",
    domainId: "fixture-domain",
    domainTitle: "Fixture domain",
    clusterId: row.clusterId,
    clusterTitle: "Fixture source cluster",
    knowledgePointId: "fixture-knowledge-point",
    knowledgePointCode: "5.NF.A.1",
    knowledgePointTitle: "Fixture knowledge point",
  });
}

function convertedRuntimeQuestionFixture(row) {
  return canonicalizeStrictItemJsonV4({
    id: row.itemId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: "US_CA_MATH",
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: row.canonicalTopic,
    grade: row.grade,
    topicId: row.canonicalTopic,
    topic: row.topic,
    difficulty: row.difficulty,
    type: row.responseForm,
    prompt: row.prompt,
    options: Array.isArray(row.options) ? row.options : undefined,
    answer: row.answer ?? row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
    diagram: row.diagram ?? undefined,
    questionAssets: Array.isArray(row.questionAssets) && row.questionAssets.length > 0
      ? row.questionAssets
      : undefined,
  });
}

function publicRuntimeQuestionFixture(fullItem) {
  return canonicalizeStrictItemJsonV4({
    id: fullItem.id,
    curriculumTrack: fullItem.curriculumTrack,
    curriculumProfile: fullItem.curriculumProfile,
    region: fullItem.region,
    publisher: fullItem.publisher,
    canonicalTopicId: fullItem.canonicalTopicId ?? fullItem.topicId,
    grade: fullItem.grade,
    topicId: fullItem.topicId,
    topic: fullItem.topic,
    difficulty: fullItem.difficulty,
    type: fullItem.type,
    prompt: fullItem.prompt,
    options: fullItem.options,
    diagram: fullItem.diagram,
    questionAssets: fullItem.questionAssets,
  });
}

function routeRunnerReceiptFixture(schemaVersion, trustBinding, sourceCommit, executedAt, entries, extraRoots) {
  return withHash({
    schemaVersion,
    implementationHash: trustBinding.implementationHash,
    sourceCommit,
    runnerCommit: trustBinding.runnerCommit,
    runnerHash: trustBinding.runnerHash,
    executedAt,
    entries,
    entryRootHash: sha256Hex(canonicalJson(entries)),
    ...extraRoots,
  }, "runnerReceiptHash");
}

function buildSourceParityInput(frameRows) {
  const rawItems = frameRows.map(rawGeneratedQuestionFixture);
  const convertedFullItems = frameRows.map(convertedRuntimeQuestionFixture);
  const normalizedFullItems = structuredClone(frameRows);
  const gradePublicItems = Object.fromEntries(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [
    grade,
    convertedFullItems.filter((item) => item.grade === grade).map(publicRuntimeQuestionFixture),
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
  const rawById = new Map(rawItems.map((item) => [item.id, item]));
  const fullById = new Map(convertedFullItems.map((item) => [item.id, item]));
  const normalizedById = new Map(normalizedFullItems.map((item) => [item.itemId, item]));
  const publicById = new Map(gradePublicUnion.map(({ grade, publicItem }) => [publicItem.id, { grade, publicItem }]));
  const sortedItemIds = [...fullById.keys()].sort(codePointCompare);
  const converterEntries = sortedItemIds.map((itemId) => ({
    itemId,
    rawContentHash: strictContentHash(rawById.get(itemId)),
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
  }));
  const normalizationEntries = sortedItemIds.map((itemId) => ({
    itemId,
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
    normalizedItemHash: normalizedById.get(itemId).itemHash,
  }));
  const publicProjectionEntries = sortedItemIds.map((itemId) => ({
    itemId,
    grade: publicById.get(itemId).grade,
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
    publicContentHash: strictContentHash(publicById.get(itemId).publicItem),
  }));
  const converterRunnerReceipt = routeRunnerReceiptFixture(
    "RawToRuntimeQuestionConverterRunnerReceiptV1",
    ROUTE_EXECUTION_TRUST_DESCRIPTOR.converter,
    SOURCE_COMMIT,
    "2026-08-25T04:50:00.000Z",
    converterEntries,
    { rawRootHash, convertedFullRootHash },
  );
  const normalizationRunnerReceipt = routeRunnerReceiptFixture(
    "RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1",
    ROUTE_EXECUTION_TRUST_DESCRIPTOR.normalization,
    SOURCE_COMMIT,
    "2026-08-25T04:51:00.000Z",
    normalizationEntries,
    { convertedFullRootHash, normalizedFullRootHash },
  );
  const publicProjectionRunnerReceipt = routeRunnerReceiptFixture(
    "RuntimeQuestionToPublicQuestionRunnerReceiptV1",
    ROUTE_EXECUTION_TRUST_DESCRIPTOR.publicProjection,
    SOURCE_COMMIT,
    "2026-08-25T04:52:00.000Z",
    publicProjectionEntries,
    { convertedFullRootHash, gradePublicUnionRootHash, gradeProjectionInvocationRootHash },
  );
  const routeExecutionTrustDescriptor = {
    schemaVersion: "RouteExecutionTrustDescriptorV2",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: SOURCE_COMMIT,
    converter: {
      implementationHash: converterRunnerReceipt.implementationHash,
      runnerCommit: converterRunnerReceipt.runnerCommit,
      runnerHash: converterRunnerReceipt.runnerHash,
      runnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
      rawRootHash,
      convertedFullRootHash,
    },
    normalization: {
      implementationHash: normalizationRunnerReceipt.implementationHash,
      runnerCommit: normalizationRunnerReceipt.runnerCommit,
      runnerHash: normalizationRunnerReceipt.runnerHash,
      runnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
      convertedFullRootHash,
      normalizedFullRootHash,
    },
    publicProjection: {
      implementationHash: publicProjectionRunnerReceipt.implementationHash,
      runnerCommit: publicProjectionRunnerReceipt.runnerCommit,
      runnerHash: publicProjectionRunnerReceipt.runnerHash,
      runnerReceiptHash: publicProjectionRunnerReceipt.runnerReceiptHash,
      convertedFullRootHash,
      gradePublicUnionRootHash,
      gradeProjectionInvocationRootHash,
    },
  };
  return {
    rawItems,
    convertedFullItems,
    normalizedFullItems,
    gradePublicItems,
    converterRunnerReceipt,
    normalizationRunnerReceipt,
    publicProjectionRunnerReceipt,
    routeExecutionTrustDescriptor,
    runtimeLoaderEvidence: {
      rawLoader: "DIRECT_IMPORT",
      convertedFullLoader: "DIRECT_IMPORT",
      gradePublicLoader: "DIRECT_IMPORT",
      optionalQuestionModuleUsed: false,
      apiPreviewUsed: false,
      gradeProjectionCount: 13,
      rawConversionUsed: true,
      converterImplementationHash: ROUTE_EXECUTION_TRUST_DESCRIPTOR.converter.implementationHash,
      converterRunnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
      normalizationImplementationHash: ROUTE_EXECUTION_TRUST_DESCRIPTOR.normalization.implementationHash,
      normalizationRunnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
      publicProjectionImplementationHash: ROUTE_EXECUTION_TRUST_DESCRIPTOR.publicProjection.implementationHash,
      publicProjectionRunnerReceiptHash: publicProjectionRunnerReceipt.runnerReceiptHash,
    },
    mapFirstWinsUsed: false,
  };
}

function buildFrameEvidenceFixture(frameRows) {
  const sourceParityInput = buildSourceParityInput(frameRows);
  const sourceParityEvidence = buildThreeRouteSourceParityEvidenceV4(sourceParityInput);
  const sourceModuleManifestInput = {
    ...SOURCE_MODULE_MANIFEST_INPUT,
    routeExecutionTrustRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
  };
  const sourceModuleManifest = buildSourceModuleManifestV4(sourceModuleManifestInput);
  const scannerExecutionReceipts = frameRows.map((row, index) => buildScannerExecutionReceiptV4({
    itemId: row.itemId,
    itemHash: row.itemHash,
    screeningPolicyHash: SCREENING_ROOTS.trustedScreeningPolicyHash,
    scannerImplementationHash: SCREENING_ROOTS.trustedScannerImplementationHash,
    scannerRunnerHash: SCREENING_ROOTS.trustedScannerRunnerHash,
    scannerExecutionStatus: "COMPLETED",
    piiEvidenceRootHash: sha256Hex(`pii:${index}:${row.itemHash}`),
    secretEvidenceRootHash: sha256Hex(`secret:${index}:${row.itemHash}`),
    piiFindingCount: 0,
    secretFindingCount: 0,
    executedAt: "2026-08-25T04:59:00.000Z",
  }));
  const scannerExecutionReceiptInventory = buildScannerExecutionReceiptInventoryV4({
    scannerExecutionReceipts,
    recordedAt: "2026-08-25T04:59:30.000Z",
  });
  const itemScreenEvidence = scannerExecutionReceipts.map((scannerExecutionReceipt) => (
    buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt })
  ));
  const itemEgressDecisions = frameRows.map((row, index) => buildFrameItemEgressDecisionV4({
    item: row,
    rightsDecisionInput: RIGHTS_DECISION_INPUT,
    rightsDecisionTable: RIGHTS_DECISION_TABLE,
    trustedOwnerApprovalRootHash: RIGHTS_DECISION_TABLE.ownerApprovalClaimRootHash,
    screenEvidence: itemScreenEvidence[index],
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    ...SCREENING_ROOTS,
  }));
  const frameFreezeEvidenceInput = {
    runtimeConfigInput: RUNTIME_CONFIG_INPUT,
    runtimeConfigEvidence: RUNTIME_CONFIG_EVIDENCE,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash: DEPENDENCY_CLOSURE_TRUST_ROOT_HASH,
    rightsDecisionInput: RIGHTS_DECISION_INPUT,
    rightsDecisionTable: RIGHTS_DECISION_TABLE,
    trustedOwnerApprovalRootHash: RIGHTS_DECISION_TABLE.ownerApprovalClaimRootHash,
    itemScreenEvidence,
    itemEgressDecisions,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    ...SCREENING_ROOTS,
  };
  const frameFreezeEvidence = buildFrameFreezeEvidenceV4({ frameRows, ...frameFreezeEvidenceInput });
  return {
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash: DEPENDENCY_CLOSURE_TRUST_ROOT_HASH,
    trustedOwnerApprovalRootHash: RIGHTS_DECISION_TABLE.ownerApprovalClaimRootHash,
    frameFreezeEvidenceInput,
    frameFreezeEvidence,
  };
}

function makeRuntimeSourceEnumerationReceipt(frameRows, {
  registrationHash = frameRows[0]?.registrationHash ?? REGISTRATION_HASH,
  runtimeConfigHash = frameRows[0]?.runtimeConfigHash ?? RUNTIME_CONFIG_HASH,
  sourceCommit = frameRows[0]?.sourceCommit ?? SOURCE_COMMIT,
  enumeratedAt = FIXTURE_TIMESTAMPS.sourceEnumeratedAt,
  failureItemIds = [],
  includeClosedSourceExclusionFixtures = true,
  frameEvidenceFixture = null,
} = {}) {
  const failures = new Set(failureItemIds);
  const leavesByGrade = new Map(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [grade, []]));
  for (const row of frameRows) {
    const failure = failures.has(row.itemId);
    leavesByGrade.get(row.grade).push({
      itemId: row.itemId,
      sourceItemHash: row.itemHash,
      sourceModuleHash: row.sourceModuleHash,
      runtimeProjectionHash: calculateRuntimeProjectionHashV3(row),
      disposition: failure
        ? "RUNTIME_VISIBLE_SERIALIZATION_FAILURE"
        : row.eligible ? "RUNTIME_VISIBLE_SERIALIZED_ELIGIBLE" : "RUNTIME_VISIBLE_SERIALIZED_RESTRICTED",
      exclusionCode: failure ? "UNSTABLE_SERIALIZATION" : row.exclusionCode,
    });
  }
  if (includeClosedSourceExclusionFixtures) {
    for (const [grade, itemId, disposition, exclusionCode] of [
      ["K", "fixture-source-non-ca", "SOURCE_EXCLUDED_NON_CA_TRACK", "NON_CA_TRACK"],
      ["P1", "fixture-source-runtime-hidden", "SOURCE_EXCLUDED_RUNTIME_NOT_VISIBLE", "RUNTIME_NOT_VISIBLE"],
      ["P2", "fixture-source-synthetic", "SOURCE_EXCLUDED_SYNTHETIC_TEST_CANDIDATE_ONLY", "SYNTHETIC_TEST_CANDIDATE_ONLY"],
    ]) {
      leavesByGrade.get(grade).push({
        itemId,
        sourceItemHash: localHash(`source-item:${itemId}`),
        sourceModuleHash: SOURCE_MODULE_MANIFEST.sourceModuleHash,
        runtimeProjectionHash: null,
        disposition,
        exclusionCode,
      });
    }
  }
  const evidenceFixture = frameEvidenceFixture ?? buildFrameEvidenceFixture(frameRows);
  return buildRuntimeSourceEnumerationReceiptV1({
    registrationHash,
    sourceCommit,
    runtimeConfigHash,
    runtimeConfigEvidenceHash: runtimeConfigHash,
    sourceParityEvidenceHash: evidenceFixture.frameFreezeEvidence.sourceParityEvidenceHash,
    sourceModuleManifestHash: evidenceFixture.frameFreezeEvidence.sourceModuleManifestHash,
    extractorImplementationHash: "7".repeat(64),
    extractorRunnerCommit: "8".repeat(40),
    extractorRunnerHash: "9".repeat(64),
    rawEvidenceArtifactRootHash: "a".repeat(64),
    enumeratedAt,
    gradeProjectionInvocations: RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
      grade,
      itemLeaves: leavesByGrade.get(grade),
    })),
  });
}

function makeBundle(capacities = Array(9).fill(12), {
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  timestamps = {},
} = {}) {
  if (runtimeConfigHash !== RUNTIME_CONFIG_HASH) {
    throw new TypeError("fixture runtimeConfigHash must come from the complete frozen RuntimeConfigEvidenceV1 artifact");
  }
  const resolvedTimes = { ...FIXTURE_TIMESTAMPS, ...timestamps };
  resolvedTimes.sourceEnumeratedAt = timestamps.sourceEnumeratedAt
    ?? new Date(Date.parse(resolvedTimes.runtimeExtractedAt) - 60_000).toISOString();
  const frameRows = makeFrameRows(capacities, {
    crossCell,
    registrationHash,
    runtimeConfigHash,
    sourceCommit: SOURCE_COMMIT,
    frameFrozenAt: resolvedTimes.clusterAuditedAt,
  });
  const frameEvidenceFixture = buildFrameEvidenceFixture(frameRows);
  const runtimeSourceEnumerationReceipt = makeRuntimeSourceEnumerationReceipt(frameRows, {
    registrationHash,
    runtimeConfigHash,
    enumeratedAt: resolvedTimes.sourceEnumeratedAt,
    frameEvidenceFixture,
  });
  const runtimeExtractionSnapshot = buildRuntimeExtractionSnapshotV3({
    frameRows,
    expectedInventoryLeaves: runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger: [],
    registrationHash,
    runtimeConfigHash,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: resolvedTimes.runtimeExtractedAt,
    ...frameEvidenceFixture,
  });
  const cleanSourceEvidence = buildCleanSourceEvidenceV3({
    sourceCommit: SOURCE_COMMIT,
    verifiedAt: resolvedTimes.sourceVerifiedAt,
    gitStatusPorcelain: "",
    sourceObjectType: "commit",
    verificationMode: "READ_ONLY_GIT_STATUS_AND_CAT_FILE",
  });
  const clusterAudit = buildClusterAuditV3({
    frameRows,
    registrationHash,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: resolvedTimes.clusterAuditedAt,
  });
  const frameRegistration = buildFrameRegistrationV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash,
    runtimeConfigHash,
    sourceCommit: SOURCE_COMMIT,
    frozenAt: resolvedTimes.frameFrozenAt,
    lineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedRouteExecutionRootHash: frameEvidenceFixture.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameEvidenceFixture.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameEvidenceFixture.trustedOwnerApprovalRootHash,
  });
  const sampleManifest = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: resolvedTimes.sampleFrozenAt,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  const c0RandomAudit = buildC0RandomAuditV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    frozenAt: resolvedTimes.c0FrozenAt,
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  return {
    frameRows,
    runtimeSourceEnumerationReceipt,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    frameRegistration,
    sampleManifest,
    c0RandomAudit,
    ...frameEvidenceFixture,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  };
}

export function buildFullSampleContractFixture({
  capacities = Array(9).fill(12),
  crossCell = false,
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  timestamps = {},
} = {}) {
  return makeBundle(capacities, { crossCell, registrationHash, runtimeConfigHash, timestamps });
}

function rehashSampleManifest(manifest) {
  manifest.manifestTupleRootHash = calculateManifestTupleRootV3(manifest.selectedRows);
  manifest.sampleSelectionContentRootHash = calculateSampleSelectionContentRootV3(manifest);
  manifest.sampleManifestHash = calculateArtifactHash(manifest, "sampleManifestHash");
  return manifest;
}

test("V4 item canonicalization deletes object undefined but rejects every non-JSON or ambiguous value", () => {
  assert.deepEqual(STRICT_ITEM_JSON_CONTRACT_V4, {
    canonicalization: "RFC8785_JCS_AFTER_VALIDATED_JSON_NORMALIZATION",
    objectUndefinedPropertyRule: "DELETE_BEFORE_HASHING",
    arrayUndefinedRule: "REJECT",
    sparseArrayRule: "REJECT",
    nonFiniteNumberRule: "REJECT",
    unsupportedTypeRule: "REJECT_BIGINT_FUNCTION_SYMBOL",
    loneSurrogateRule: "REJECT",
    cycleRule: "REJECT",
  });
  assert.deepEqual(canonicalizeStrictItemJsonV4({ z: undefined, a: 1, nested: { omitted: undefined, kept: "x" } }), {
    a: 1,
    nested: { kept: "x" },
  });
  for (const value of [NaN, Infinity, -Infinity, 1n, () => 1, Symbol("x")]) {
    assert.throws(() => canonicalizeStrictItemJsonV4({ value }), /non-JSON|finite|unsupported/iu);
  }
  const sparse = [];
  sparse[1] = "x";
  assert.throws(() => canonicalizeStrictItemJsonV4(sparse), /sparse/iu);
  assert.throws(() => canonicalizeStrictItemJsonV4([undefined]), /array.*undefined/iu);
  assert.throws(() => canonicalizeStrictItemJsonV4({ value: "\ud800" }), /surrogate/iu);
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => canonicalizeStrictItemJsonV4(cycle), /cycle/iu);
});

test("V4 sampling unit hashes the complete localized prompt/options bundle plus student-visible assets", () => {
  assert.deepEqual(LOCALIZED_TEXT_KEYS_V4, ["en", "zh", "zhHans"]);
  assert.equal(V4_LOCALE_POLICY, "FULL_RUNTIME_LOCALIZED_BUNDLE");
  const row = structuredClone(makeFrameRows()[0]);
  row.prompt = { en: row.prompt, zh: "受保護的數學題目。", zhHans: "受保护的数学题目。" };
  row.options = row.options.map((option) => ({ en: option, zh: option, zhHans: option }));
  row.answer = structuredClone(row.storedAnswer);
  row.explanation = { en: row.explanation, zh: "受保護的解釋。", zhHans: "受保护的解释。" };
  row.localePolicy = V4_LOCALE_POLICY;
  assert.deepEqual(Object.keys(row.prompt), ["en", "zh", "zhHans"]);
  assert.equal(row.localePolicy, V4_LOCALE_POLICY);
  const baselineHash = calculateItemContentHashV3(row);

  const mutations = [
    (copy) => { copy.prompt.zh = `${copy.prompt.zh}（变更）`; },
    (copy) => { copy.prompt.zhHans = `${copy.prompt.zhHans} changed`; },
    (copy) => { copy.options[0].zh = `${copy.options[0].zh}（变更）`; },
    (copy) => { copy.diagram = { kind: "svg", assetId: "diagram-1" }; },
    (copy) => { copy.questionAssets = [{ kind: "image", assetId: "asset-1" }]; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(row);
    mutate(copy);
    assert.notEqual(calculateItemContentHashV3(copy), baselineHash);
  }

  const assetBearing = structuredClone(makeFrameRows()[0]);
  assetBearing.diagram = { kind: "svg", assetId: "diagram-1" };
  assetBearing.assetEgressStatus = "UNAUTHORIZED_STUDENT_VISIBLE_ASSET";
  assetBearing.eligible = false;
  assetBearing.exclusionCode = "RESTRICTED_EGRESS_CONTENT";
  assetBearing.egressEligibility = "INELIGIBLE_CLOSED_EXCLUSION";
  assetBearing.egressRights.copyrightExternalizationAuthorized = false;
  assetBearing.egressRights.providerEgressAllowed = false;
  rehashRow(assetBearing);
  const rows = makeFrameRows();
  rows[0] = assetBearing;
  assert.doesNotThrow(() => rematerializeRows(rows));

  const illegallyEligible = structuredClone(assetBearing);
  illegallyEligible.eligible = true;
  illegallyEligible.exclusionCode = null;
  illegallyEligible.egressEligibility = "ELIGIBLE";
  illegallyEligible.egressRights.copyrightExternalizationAuthorized = true;
  illegallyEligible.egressRights.providerEgressAllowed = true;
  rehashRow(illegallyEligible);
  const illegalRows = makeFrameRows();
  illegalRows[0] = illegallyEligible;
  assert.throws(() => rematerializeRows(illegalRows), /asset|egress|rights/iu);
});

test("V4 runtime configuration is the authenticated standard unaccommodated 13-grade projection", () => {
  const input = {
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: RUNTIME_SOURCE_ENUMERATION_GRADES,
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: V4_LOCALE_POLICY,
    activePackStateHash: "1".repeat(64),
    featureFlagStateHash: "2".repeat(64),
  };
  const runtime = buildRuntimeConfigEvidenceV4(input);
  assert.equal(runtime.maxAnswerChoices, 0);
  assert.equal(runtime.accommodationOptionTruncation, false);
  assert.equal(runtime.standardUnaccommodatedProjection, true);
  assert.throws(() => buildRuntimeConfigEvidenceV4({ ...input, maxAnswerChoices: 2 }), /maxAnswerChoices|unaccommodated/iu);
  assert.throws(() => buildRuntimeConfigEvidenceV4({ ...input, perStudentReducedChoicesApplied: true }), /reduced|unaccommodated/iu);
});

test("V4 source anchoring requires raw-full, full-public, and all 13 public grade routes with collision-first parity", () => {
  const rows = makeFrameRows();
  const input = buildSourceParityInput(rows);
  const { runtimeLoaderEvidence } = input;
  const evidence = buildThreeRouteSourceParityEvidenceV4(input);
  assert.equal(evidence.routeParityProved, true);
  assert.equal(evidence.collisionCheckPrecedesAnyMapOrDeduplication, true);

  assert.throws(() => buildThreeRouteSourceParityEvidenceV4({
    ...input,
    runtimeLoaderEvidence: { ...runtimeLoaderEvidence, optionalQuestionModuleUsed: true },
  }), /optionalQuestionModule|direct import/iu);
  assert.throws(() => buildThreeRouteSourceParityEvidenceV4({
    ...input,
    runtimeLoaderEvidence: { ...runtimeLoaderEvidence, apiPreviewUsed: true },
  }), /API preview|preview/iu);
  assert.throws(() => buildThreeRouteSourceParityEvidenceV4({ ...input, mapFirstWinsUsed: true }), /first.wins|collision/iu);
  assert.throws(() => buildThreeRouteSourceParityEvidenceV4({
    ...input,
    convertedFullItems: input.convertedFullItems.slice(1),
  }), /RAW_FULL_ID_MISMATCH|parity|converted-full/iu);
});

test("sourceModuleHash is a transitive Git blob manifest root and rights/failure classes fail closed", () => {
  const manifestInput = withDependencyClosureTrust(SOURCE_MODULE_MANIFEST_INPUT, [
    { repoRelativePath: "data/california/a.ts", gitBlobOid: "a".repeat(40) },
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "b".repeat(40) },
  ]);
  const manifest = buildSourceModuleManifestV4(manifestInput);
  assert.match(manifest.sourceModuleHash, /^[0-9a-f]{64}$/u);
  assert.deepEqual(manifest.files.map(({ repoRelativePath }) => repoRelativePath), ["data/california/a.ts", "lib/server/questionStore.ts"]);
  const reversed = buildSourceModuleManifestV4({ ...manifestInput, files: [...manifest.files].reverse() });
  assert.equal(reversed.sourceModuleHash, manifest.sourceModuleHash);
  assert.notEqual(
    buildSourceModuleManifestV4(withDependencyClosureTrust(manifestInput, [
      manifest.files[0],
      { ...manifest.files[1], gitBlobOid: "c".repeat(40) },
    ])).sourceModuleHash,
    manifest.sourceModuleHash,
  );

  assert.deepEqual(FRAME_FAILURE_CLASSES_V4, [
    "SOURCE_IMPORT_FAILED",
    "RUNTIME_ENUMERATION_FAILED",
    "ID_COLLISION",
    "RAW_FULL_ID_MISMATCH",
    "FULL_PUBLIC_ID_MISMATCH",
    "PUBLIC_FIELD_MISMATCH",
    "SERIALIZATION_FAILED",
    "RIGHTS_UNRESOLVED",
    "PII_SCREEN_FAILED",
    "ASSET_UNRESOLVED",
    "LINEAGE_FIELD_MISSING",
    "UNSUPPORTED_RESPONSE_FORM",
  ]);
  assert.deepEqual(RIGHTS_REGISTRY_REQUIRED_SOURCES_V4, [
    "california-math-common-core-skill",
    "ccss-math-textbook-app",
  ]);
  assert.equal(validateRightsRegistryV4({
    "california-math-common-core-skill": { disposition: "OWNER_REVIEW_REQUIRED" },
    "ccss-math-textbook-app": { disposition: "DENIED" },
  }).some((error) => error.includes("california-math-common-core-skill") && error.includes("owner-bound")), true);
  assert.deepEqual(validateRightsRegistryV4({
    "california-math-common-core-skill": { disposition: "DENIED" },
    "ccss-math-textbook-app": { disposition: "DENIED" },
  }), []);
});

test("pure sample fixture module imports without registering node:test side effects", () => {
  const fixtureUrl = new URL("./test-fixtures.mjs", import.meta.url).href;
  const script = `import(${JSON.stringify(fixtureUrl)}).then((module) => process.stdout.write(typeof module.buildFullSampleContractFixture))`;
  const imported = spawnSync(process.execPath, ["--input-type=module", "--eval", script], { encoding: "utf8" });

  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stderr, "");
  assert.equal(imported.stdout, "function");
});

test("sample and C0 rankings hash UTF-8 JCS arrays with frozen versions and delimiter-safe golden vectors", () => {
  assert.equal(SELECTION_DIGEST_CANONICALIZATION, "RFC8785_JCS");
  assert.equal(SELECTION_DIGEST_BYTE_ENCODING, "UTF-8");
  assert.equal(
    SAMPLE_SELECTION_FORMULA,
    "SHA256(UTF8(JCS([designHash,frameHash,algorithmVersion,stratum,clusterId,itemHash])))",
  );
  assert.equal(
    C0_AUDIT_SELECTION_FORMULA,
    "SHA256(UTF8(JCS([registrationHash,sampleSelectionContentRootHash,algorithmVersion,stratum,clusterId,itemHash])))",
  );
  assert.deepEqual(SAMPLE_SELECTION_DIGEST_FIELD_ORDER, [
    "designHash", "frameHash", "algorithmVersion", "stratum", "clusterId", "itemHash",
  ]);
  assert.deepEqual(C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER, [
    "registrationHash", "sampleSelectionContentRootHash", "algorithmVersion", "stratum", "clusterId", "itemHash",
  ]);
  assert.equal(
    SAMPLE_SELECTION_DIGEST_CONTRACT.frameHashSemantic,
    "frameHash is the timestamp-excluded frameSelectionContentRootHash; it is not samplingFrameHash and not frameRegistrationHash",
  );
  assert.equal(
    SAMPLE_SELECTION_DIGEST_CONTRACT.designHashSemantic,
    "designHash is the frozen design registrationHash",
  );
  assert.equal(
    C0_AUDIT_SELECTION_DIGEST_CONTRACT.sampleSelectionContentRootHashSemantic,
    "sampleSelectionContentRootHash excludes manifest timestamps and artifact self-hashes; it is not sampleManifestHash",
  );

  const goldenVectorDesignHashSemantic = {
    designId: "MAIS-NATURAL-CA60-V4",
    kind: "NON_EXECUTION_GOLDEN_VECTOR_INPUT",
    semantic: "Actual sample selection designHash is the frozen design registrationHash",
  };
  const sampleInput = {
    designHash: sha256Hex(canonicalJson(goldenVectorDesignHashSemantic)),
    frameHash: "1".repeat(64),
    algorithmVersion: SAMPLE_ALGORITHM_VERSION,
    stratum: "short-answer::High",
    clusterId: "cluster|Ω",
    itemHash: "2".repeat(64),
  };
  const sampleCanonicalBytes = "[\"780ef92c2ebe88c31c76e53b27535a017acffa169205ee051a69a884a08af33e\",\"1111111111111111111111111111111111111111111111111111111111111111\",\"natural-ca60-full-frame-hamilton-v3\",\"short-answer::High\",\"cluster|Ω\",\"2222222222222222222222222222222222222222222222222222222222222222\"]";
  assert.notEqual(sampleInput.designHash, "0".repeat(64), "golden-vector fixture must not masquerade as a zero registrationHash placeholder");
  assert.deepEqual(sampleSelectionDigestPreimageV3(sampleInput), Object.values(sampleInput));
  assert.equal(Buffer.from(canonicalJson(sampleSelectionDigestPreimageV3(sampleInput)), "utf8").toString("hex"), "5b2237383065663932633265626538386333316337366535336232373533356130313761636666613136393230356565303531613639613838346130386166333365222c2231313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c226e61747572616c2d636136302d66756c6c2d6672616d652d68616d696c746f6e2d7633222c2273686f72742d616e737765723a3a48696768222c22636c75737465727ccea9222c2232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232225d");
  assert.equal(canonicalJson(sampleSelectionDigestPreimageV3(sampleInput)), sampleCanonicalBytes);
  assert.equal(selectionDigestV3(sampleInput), "058d40d3dd784ea375698a17f780e84c7a29ad9352adda05a95be77a69c98e28");
  assert.deepEqual(SAMPLE_SELECTION_GOLDEN_VECTOR, {
    input: sampleInput,
    canonicalBytesUtf8Hex: "5b2237383065663932633265626538386333316337366535336232373533356130313761636666613136393230356565303531613639613838346130386166333365222c2231313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131313131222c226e61747572616c2d636136302d66756c6c2d6672616d652d68616d696c746f6e2d7633222c2273686f72742d616e737765723a3a48696768222c22636c75737465727ccea9222c2232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232225d",
    digest: "058d40d3dd784ea375698a17f780e84c7a29ad9352adda05a95be77a69c98e28",
  });

  const c0Input = {
    registrationHash: "a".repeat(64),
    sampleSelectionContentRootHash: "b".repeat(64),
    algorithmVersion: C0_AUDIT_ALGORITHM_VERSION,
    stratum: "multiple-choice::Low",
    clusterId: "audit|α",
    itemHash: "c".repeat(64),
  };
  assert.deepEqual(c0AuditSelectionDigestPreimageV3(c0Input), Object.values(c0Input));
  assert.equal(c0SelectionDigestV3(c0Input), "c9b4f19a72f2d0a8f52f3a120df59cd212ea772999d7b06a468a65653ca05dee");
  assert.deepEqual(C0_AUDIT_SELECTION_GOLDEN_VECTOR, {
    input: c0Input,
    canonicalBytesUtf8Hex: "5b2261616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161222c2262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262626262222c2263302d72616e646f6d2d61756469742d66756c6c2d73616d706c652d7633222c226d756c7469706c652d63686f6963653a3a4c6f77222c2261756469747cceb1222c2263636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363636363225d",
    digest: "c9b4f19a72f2d0a8f52f3a120df59cd212ea772999d7b06a468a65653ca05dee",
  });
  assert.throws(() => selectionDigestV3({ ...sampleInput, algorithmVersion: "reroll-v4" }), /algorithmVersion/u);
  assert.throws(() => c0SelectionDigestV3({ ...c0Input, algorithmVersion: "reroll-v4" }), /algorithmVersion/u);
});

test("runtime inventory is anchored to a 13-grade immutable source-enumeration receipt instead of a caller list", () => {
  const rows = makeFrameRows();
  const frameEvidenceFixture = buildFrameEvidenceFixture(rows);
  const receipt = makeRuntimeSourceEnumerationReceipt(rows, { frameEvidenceFixture });

  assert.equal(receipt.schemaVersion, "RuntimeSourceEnumerationReceiptV1");
  assert.deepEqual(receipt.gradeProjectionInvocations.map((entry) => entry.grade), RUNTIME_SOURCE_ENUMERATION_GRADES);
  assert.equal(receipt.gradeProjectionInvocationCount, 13);
  assert.equal(receipt.sourceItemCount, receipt.runtimeVisibleItemCount + receipt.sourceExclusionCount);
  assert.equal(
    receipt.runtimeVisibleItemCount,
    receipt.eligibleItemCount + receipt.restrictedItemCount + receipt.serializationFailureCount,
  );
  assert.equal(receipt.sourceExclusionCount, 3);
  assert.equal(receipt.exclusionCounts.NON_CA_TRACK, 1);
  assert.equal(receipt.exclusionCounts.RUNTIME_NOT_VISIBLE, 1);
  assert.equal(receipt.exclusionCounts.SYNTHETIC_TEST_CANDIDATE_ONLY, 1);
  assert.equal(receipt.exclusionCounts.RESTRICTED_EGRESS_CONTENT, 1);
  assert.equal(receipt.exclusionCounts.UNSTABLE_SERIALIZATION, 0);
  assert.equal(receipt.sourceCompletenessEvidenceBoundary, SOURCE_ENUMERATION_EVIDENCE_BOUNDARY);
  assert.equal(receipt.sourceCompletenessProvedByDesign, false);
  assert.equal(receipt.evidenceContractHash, RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH);
  assert.match(receipt.extractorImplementationHash, /^[0-9a-f]{64}$/u);
  assert.match(receipt.extractorRunnerCommit, /^[0-9a-f]{40}$/u);
  assert.match(receipt.extractorRunnerHash, /^[0-9a-f]{64}$/u);
  assert.match(receipt.rawEvidenceArtifactRootHash, /^[0-9a-f]{64}$/u);
  assert.match(receipt.fullSourceEnumerationRootHash, /^[0-9a-f]{64}$/u);
  for (const invocation of receipt.gradeProjectionInvocations) {
    assert.equal(
      invocation.sourceItemCount,
      invocation.runtimeVisibleItemCount + invocation.sourceExclusionCount,
    );
    assert.equal(
      invocation.runtimeVisibleItemCount,
      invocation.eligibleItemCount + invocation.restrictedItemCount + invocation.serializationFailureCount,
    );
    assert.match(invocation.orderedItemRootHash, /^[0-9a-f]{64}$/u);
    assert.match(invocation.sourceModuleRootHash, /^[0-9a-f]{64}$/u);
    assert.match(invocation.invocationLeafHash, /^[0-9a-f]{64}$/u);
  }

  const callerExpectedInventory = receipt.expectedRuntimeInventoryLeaves.map((leaf) => ({ ...leaf }));
  const snapshot = buildRuntimeExtractionSnapshotV3({
    frameRows: rows,
    expectedInventoryLeaves: callerExpectedInventory,
    runtimeSourceEnumerationReceipt: receipt,
    serializationFailureLedger: [],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: "2026-08-25T04:57:00.000Z",
    ...frameEvidenceFixture,
  });
  assert.equal(snapshot.runtimeSourceEnumerationReceiptHash, receipt.sourceEnumerationReceiptHash);
  assert.equal(snapshot.fullSourceEnumerationRootHash, receipt.fullSourceEnumerationRootHash);
  assert.equal(snapshot.rawEvidenceArtifactRootHash, receipt.rawEvidenceArtifactRootHash);

  const deletedItemId = rows[0].itemId;
  assert.throws(() => buildRuntimeExtractionSnapshotV3({
    frameRows: rows.filter((row) => row.itemId !== deletedItemId),
    expectedInventoryLeaves: callerExpectedInventory.filter((leaf) => leaf.itemId !== deletedItemId),
    runtimeSourceEnumerationReceipt: receipt,
    serializationFailureLedger: [],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: "2026-08-25T04:57:00.000Z",
    ...frameEvidenceFixture,
  }), /source.enumeration|receipt|caller.*inventory|deletion|RAW_FULL_ID_MISMATCH|exact protected frame/iu);

  assert.throws(() => buildRuntimeSourceEnumerationReceiptV1({
    ...receipt,
    gradeProjectionInvocations: receipt.gradeProjectionInvocations.slice(1),
  }), /13|grade|invocation/iu);
});

test("frame, sample, C0, and full validator carry and revalidate the exact source-enumeration root tuple", () => {
  const bundle = makeBundle();
  const receipt = bundle.runtimeSourceEnumerationReceipt;
  for (const artifact of [bundle.frameRegistration, bundle.sampleManifest, bundle.c0RandomAudit]) {
    assert.equal(artifact.sourceEnumerationEvidenceContractHash, RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH);
    assert.equal(artifact.sourceEnumerationReceiptHash, receipt.sourceEnumerationReceiptHash);
    assert.equal(artifact.fullSourceEnumerationRootHash, receipt.fullSourceEnumerationRootHash);
    assert.equal(artifact.rawEvidenceArtifactRootHash, receipt.rawEvidenceArtifactRootHash);
    assert.equal(artifact.extractorImplementationHash, receipt.extractorImplementationHash);
    assert.equal(artifact.extractorRunnerCommit, receipt.extractorRunnerCommit);
    assert.equal(artifact.extractorRunnerHash, receipt.extractorRunnerHash);
  }

  const forgedC0 = structuredClone(bundle);
  forgedC0.c0RandomAudit.fullSourceEnumerationRootHash = "f".repeat(64);
  withHash(forgedC0.c0RandomAudit, "auditHash");
  assert.equal(validateSampleAgainstFrame(forgedC0).some((error) => error.includes("C0 random audit")), true);

  const forgedReceipt = structuredClone(bundle);
  forgedReceipt.runtimeExtractionSnapshot.runtimeSourceEnumerationReceipt.rawEvidenceArtifactRootHash = "e".repeat(64);
  withHash(forgedReceipt.runtimeExtractionSnapshot, "runtimeExtractionSnapshotHash");
  assert.equal(
    validateSampleAgainstFrame(forgedReceipt).some((error) => /source enumeration|receipt|bound roots/iu.test(error)),
    true,
  );
});

test("source enumeration blocks every repeated stable runtime ID across or within the 13 grade projections", () => {
  const receipt = makeRuntimeSourceEnumerationReceipt(makeFrameRows());
  assert.equal(
    receipt.duplicateIdRule,
    "ANY_REPEATED_ITEM_ID_WITHIN_OR_ACROSS_13_GRADE_PROJECTIONS_BLOCKS_FREEZE_NO_COLLAPSE_NO_FIRST_WINS",
  );
  const invocations = structuredClone(receipt.gradeProjectionInvocations);
  const gradeFiveLeaf = invocations.find((entry) => entry.grade === "P5").itemLeaves[0];
  invocations.find((entry) => entry.grade === "P6").itemLeaves.push(structuredClone(gradeFiveLeaf));
  assert.throws(() => buildRuntimeSourceEnumerationReceiptV1({
    registrationHash: receipt.registrationHash,
    sourceCommit: receipt.sourceCommit,
    runtimeConfigHash: receipt.runtimeConfigHash,
    runtimeConfigEvidenceHash: receipt.runtimeConfigEvidenceHash,
    sourceParityEvidenceHash: receipt.sourceParityEvidenceHash,
    sourceModuleManifestHash: receipt.sourceModuleManifestHash,
    extractorImplementationHash: receipt.extractorImplementationHash,
    extractorRunnerCommit: receipt.extractorRunnerCommit,
    extractorRunnerHash: receipt.extractorRunnerHash,
    rawEvidenceArtifactRootHash: receipt.rawEvidenceArtifactRootHash,
    enumeratedAt: receipt.enumeratedAt,
    gradeProjectionInvocations: invocations,
  }), /duplicate.*itemId.*across grade|repeated.*ID/iu);
});

test("source-enumeration evidence contract is a single registration-ready constant with chronology and independent-rerun boundaries", () => {
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.schemaVersion, "RuntimeSourceEnumerationEvidenceContractV1");
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.receiptSchemaVersion, "RuntimeSourceEnumerationReceiptV1");
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.gradeProjectionInvocationCount, 13);
  assert.deepEqual(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.gradeProjectionOrder, RUNTIME_SOURCE_ENUMERATION_GRADES);
  assert.deepEqual(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.requiredReceiptBindings, [
    "registrationHash",
    "sourceCommit",
    "runtimeConfigHash",
    "runtimeConfigEvidenceHash",
    "sourceParityEvidenceHash",
    "sourceModuleManifestHash",
    "evidenceContractHash",
    "extractorImplementationHash",
    "extractorRunnerCommit",
    "extractorRunnerHash",
    "rawEvidenceArtifactRootHash",
    "fullSourceEnumerationRootHash",
    "expectedRuntimeInventoryRootHash",
    "serializedRuntimeVisibleRootHash",
    "serializationFailureInventoryRootHash",
    "sourceExclusionLedgerRootHash",
    "sourceEnumerationReceiptHash",
  ]);
  assert.deepEqual(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.requiredProtectedSnapshotBindings, [
    "runtimeSourceEnumerationReceiptHash",
    "runtimeConfigEvidenceHash",
    "sourceParityEvidenceHash",
    "sourceModuleManifestHash",
    "sourceEnumerationEvidenceContractHash",
    "fullSourceEnumerationRootHash",
    "rawEvidenceArtifactRootHash",
    "extractorImplementationHash",
    "extractorRunnerCommit",
    "extractorRunnerHash",
    "expectedInventoryRootHash",
    "serializedProjectionRootHash",
    "failureLedgerRootHash",
    "runtimeExtractionSnapshotHash",
  ]);
  assert.deepEqual(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.accountingEquations, [
    "sourceItemCount=runtimeVisibleItemCount+sourceExclusionCount",
    "runtimeVisibleItemCount=eligibleItemCount+restrictedItemCount+serializationFailureCount",
    "sourceItemCount=eligibleItemCount+excludedItemCount",
  ]);
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.duplicateIdRule, "ANY_REPEATED_ITEM_ID_WITHIN_OR_ACROSS_13_GRADE_PROJECTIONS_BLOCKS_FREEZE_NO_COLLAPSE_NO_FIRST_WINS");
  assert.equal(
    RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.chronologyRule,
    "sourceEnumerationReceipt.enumeratedAt<runtimeExtractionSnapshot.extractedAt<frameRegistration.frozenAt<sampleManifest.manifestFrozenAt<c0RandomAudit.frozenAt<firstQwenReferenceAttempt.startedAt",
  );
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.designDoesNotSelfProveSourceCompleteness, true);
  assert.equal(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT.requiresIndependentA11ExtractorRerun, true);
  assert.match(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH, /^[0-9a-f]{64}$/u);
  assert.equal(
    RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    sha256Hex(canonicalJson(RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT)),
  );
});

test("public source-enumeration receipt validator round-trips valid evidence and rejects nested tampering", () => {
  const receipt = makeRuntimeSourceEnumerationReceipt(makeFrameRows());
  assert.equal(validateRuntimeSourceEnumerationReceiptV1(receipt), true);

  const tampered = structuredClone(receipt);
  const populatedInvocation = tampered.gradeProjectionInvocations.find((entry) => entry.itemLeaves.length > 0);
  populatedInvocation.itemLeaves[0].sourceItemHash = "f".repeat(64);
  tampered.sourceEnumerationReceiptHash = calculateArtifactHash(tampered, "sourceEnumerationReceiptHash");
  assert.throws(() => validateRuntimeSourceEnumerationReceiptV1(tampered), /receipt|bound roots|mismatch/iu);
});

test("public frame registration binds protected evidence by roots without recursively exposing item leaves or content", () => {
  const bundle = makeBundle();
  const registration = bundle.frameRegistration;
  assert.equal(Object.hasOwn(registration, "runtimeExtractionSnapshot"), false);
  assert.equal(Object.hasOwn(registration, "cleanSourceEvidence"), false);
  assert.equal(registration.runtimeExtractionSnapshotHash, bundle.runtimeExtractionSnapshot.runtimeExtractionSnapshotHash);
  assert.equal(registration.cleanSourceEvidenceHash, bundle.cleanSourceEvidence.sourceEvidenceHash);

  const forbiddenKeys = new Set([
    "itemId",
    "itemLeaves",
    "expectedInventoryLeaves",
    "serializedProjectionLeaves",
    "serializedRuntimeVisibleLeaves",
    "serializationFailureLedger",
    "serializationFailureInventoryLeaves",
    "sourceExclusionLedger",
    "prompt",
    "options",
    "storedAnswer",
    "acceptedAnswers",
    "explanation",
  ]);
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      assert.equal(forbiddenKeys.has(key), false, `public frame registration leaked ${key}`);
      visit(child);
    }
  };
  visit(registration);
  assert.equal(JSON.stringify(registration).includes(bundle.frameRows[0].itemId), false);

  const missingProtectedSnapshot = structuredClone(bundle);
  delete missingProtectedSnapshot.runtimeExtractionSnapshot;
  assert.equal(
    validateSampleAgainstFrame(missingProtectedSnapshot).some((error) => /protected runtime extraction snapshot|snapshot.*required/iu.test(error)),
    true,
  );

  const mismatchedProtectedSnapshot = structuredClone(bundle);
  mismatchedProtectedSnapshot.runtimeExtractionSnapshot.runtimeExtractionSnapshotHash = "f".repeat(64);
  assert.equal(
    validateSampleAgainstFrame(mismatchedProtectedSnapshot).some((error) => /runtime extraction snapshot.*hash|protected.*root/iu.test(error)),
    true,
  );
});

test("sample and C0 artifacts persist the same-source digest encoding, field order, root semantics, and golden digest", () => {
  const bundle = makeBundle();
  assert.equal(bundle.sampleManifest.selectionDigestCanonicalization, SELECTION_DIGEST_CANONICALIZATION);
  assert.equal(bundle.sampleManifest.selectionDigestByteEncoding, SELECTION_DIGEST_BYTE_ENCODING);
  assert.deepEqual(bundle.sampleManifest.selectionDigestFieldOrder, SAMPLE_SELECTION_DIGEST_FIELD_ORDER);
  assert.equal(bundle.sampleManifest.selectionDesignHashSemantic, SAMPLE_SELECTION_DIGEST_CONTRACT.designHashSemantic);
  assert.equal(bundle.sampleManifest.selectionFrameHashSemantic, SAMPLE_SELECTION_DIGEST_CONTRACT.frameHashSemantic);
  assert.equal(bundle.sampleManifest.selectionGoldenVectorDigest, SAMPLE_SELECTION_GOLDEN_VECTOR.digest);
  assert.equal(bundle.c0RandomAudit.selectionDigestCanonicalization, SELECTION_DIGEST_CANONICALIZATION);
  assert.equal(bundle.c0RandomAudit.selectionDigestByteEncoding, SELECTION_DIGEST_BYTE_ENCODING);
  assert.deepEqual(bundle.c0RandomAudit.selectionDigestFieldOrder, C0_AUDIT_SELECTION_DIGEST_FIELD_ORDER);
  assert.equal(
    bundle.c0RandomAudit.selectionSampleContentRootSemantic,
    C0_AUDIT_SELECTION_DIGEST_CONTRACT.sampleSelectionContentRootHashSemantic,
  );
  assert.equal(bundle.c0RandomAudit.selectionGoldenVectorDigest, C0_AUDIT_SELECTION_GOLDEN_VECTOR.digest);
});

test("full protected frame deterministically yields a valid 60-cluster sample and 12-item C0 audit", () => {
  const bundle = makeBundle(Array(9).fill(12), { crossCell: true });

  assert.equal(DESIGN_ID, "MAIS-NATURAL-CA60-V4");
  assert.equal(SAMPLE_ALGORITHM_VERSION, "natural-ca60-full-frame-hamilton-v3");
  assert.equal(C0_AUDIT_ALGORITHM_VERSION, "c0-random-audit-full-sample-v3");
  assert.match(SAMPLE_ALGORITHM_HASH, /^[0-9a-f]{64}$/u);
  assert.match(C0_AUDIT_ALGORITHM_HASH, /^[0-9a-f]{64}$/u);
  assert.deepEqual(validateSampleAgainstFrame(bundle), []);
  assert.equal(bundle.sampleManifest.selectedRows.length, 60);
  assert.equal(new Set(bundle.sampleManifest.selectedRows.map((row) => row.clusterId)).size, 60);
  assert.equal(bundle.c0RandomAudit.selectedRows.length, 12);
  assert.equal(new Set(bundle.c0RandomAudit.selectedRows.map((row) => row.clusterId)).size, 12);
  assert.equal(bundle.frameRegistration.samplingFrameHash, calculateFrameRowsRootV3(bundle.frameRows));
  assert.equal(bundle.frameRegistration.region, "CALIFORNIA");
  assert.equal(bundle.frameRegistration.curriculumProfile, "US_CA_MATH");
  assert.equal(bundle.frameRegistration.runtimeOrigin, "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION");
  assert.deepEqual(bundle.frameRegistration.responseForms, ["multiple-choice", "fill-in", "short-answer"]);
  assert.deepEqual(bundle.frameRegistration.difficulties, ["Low", "Medium", "High"]);
  assert.deepEqual(bundle.frameRegistration.closedExclusionCodes, [
    "NON_CA_TRACK",
    "RUNTIME_NOT_VISIBLE",
    "SYNTHETIC_TEST_CANDIDATE_ONLY",
    "RESTRICTED_EGRESS_CONTENT",
    "UNSTABLE_SERIALIZATION",
  ]);
  assert.equal(bundle.sampleManifest.algorithmVersion, SAMPLE_ALGORITHM_VERSION);
  assert.equal(bundle.sampleManifest.algorithmHash, SAMPLE_ALGORITHM_HASH);
  assert.equal(bundle.c0RandomAudit.algorithmVersion, C0_AUDIT_ALGORITHM_VERSION);
  assert.equal(bundle.c0RandomAudit.algorithmHash, C0_AUDIT_ALGORITHM_HASH);
  assert.notEqual(bundle.sampleManifest.manifestTupleRootHash, bundle.sampleManifest.sampleManifestHash);
});

test("shared full sample fixture can bind caller-supplied registration and runtime roots without changing the algorithm", () => {
  const registrationHash = "a".repeat(64);
  const runtimeConfigHash = RUNTIME_CONFIG_HASH;
  const timestamps = {
    runtimeExtractedAt: "2026-08-25T06:10:00.000Z",
    sourceVerifiedAt: "2026-08-25T06:11:00.000Z",
    clusterAuditedAt: "2026-08-25T06:12:00.000Z",
    frameFrozenAt: "2026-08-25T06:13:00.000Z",
    sampleFrozenAt: "2026-08-25T06:14:00.000Z",
    c0FrozenAt: "2026-08-25T06:15:00.000Z",
  };
  const bundle = buildFullSampleContractFixture({ registrationHash, runtimeConfigHash, timestamps });
  assert.throws(
    () => buildFullSampleContractFixture({ registrationHash, runtimeConfigHash: "b".repeat(64), timestamps }),
    /RuntimeConfigEvidence|runtimeConfigHash.*complete frozen/iu,
  );

  assert.equal(bundle.frameRows.every((row) => row.registrationHash === registrationHash), true);
  assert.equal(bundle.frameRows.every((row) => row.runtimeConfigHash === runtimeConfigHash), true);
  assert.equal(bundle.runtimeExtractionSnapshot.registrationHash, registrationHash);
  assert.equal(bundle.runtimeExtractionSnapshot.runtimeConfigHash, runtimeConfigHash);
  assert.equal(bundle.clusterAudit.registrationHash, registrationHash);
  assert.equal(bundle.frameRegistration.registrationHash, registrationHash);
  assert.equal(bundle.frameRegistration.runtimeConfigHash, runtimeConfigHash);
  assert.equal(bundle.sampleManifest.registrationHash, registrationHash);
  assert.equal(bundle.c0RandomAudit.registrationHash, registrationHash);
  assert.equal(bundle.runtimeExtractionSnapshot.extractedAt, timestamps.runtimeExtractedAt);
  assert.equal(bundle.cleanSourceEvidence.verifiedAt, timestamps.sourceVerifiedAt);
  assert.equal(bundle.clusterAudit.auditedAt, timestamps.clusterAuditedAt);
  assert.equal(bundle.frameRegistration.frozenAt, timestamps.frameFrozenAt);
  assert.equal(bundle.sampleManifest.manifestFrozenAt, timestamps.sampleFrozenAt);
  assert.equal(bundle.c0RandomAudit.frozenAt, timestamps.c0FrozenAt);
  assert.deepEqual(validateSampleAgainstFrame(bundle), []);
});

test("cluster audit covers every eligible frame member exactly once and cross-cell clusters get one digest-selected representative", () => {
  const bundle = makeBundle(Array(9).fill(12), { crossCell: true });
  const members = bundle.frameRows.filter((row) => row.eligible && row.homologyClusterId === "cluster-00-000");
  assert.equal(members.length, 2);

  const ranked = members.map((row) => {
    const stratum = `${row.responseForm}::${row.difficulty}`;
    return {
      row,
      stratum,
      digest: selectionDigestV3({
        designHash: REGISTRATION_HASH,
        frameHash: bundle.frameRegistration.frameSelectionContentRootHash,
        algorithmVersion: SAMPLE_ALGORITHM_VERSION,
        stratum,
        clusterId: row.homologyClusterId,
        itemHash: row.itemHash,
      }),
    };
  }).sort((left, right) => codePointCompare(left.digest, right.digest) || codePointCompare(left.row.itemId, right.row.itemId));
  const audited = bundle.clusterAudit.clusters.find((cluster) => cluster.clusterId === "cluster-00-000");

  assert.equal(audited.representativeItemId, ranked[0].row.itemId);
  assert.equal(audited.assignedStratum, ranked[0].stratum);
  assert.equal(bundle.sampleManifest.selectedRows.filter((row) => row.clusterId === "cluster-00-000").length <= 1, true);

  const broken = structuredClone(bundle);
  broken.clusterAudit.clusters[0].members[0].itemHash = "9".repeat(64);
  withHash(broken.clusterAudit, "clusterAuditHash");
  broken.frameRegistration.clusterAuditHash = broken.clusterAudit.clusterAuditHash;
  withHash(broken.frameRegistration, "frameRegistrationHash");
  assert.equal(validateSampleAgainstFrame(broken).some((error) => error.includes("cluster audit")), true);
});

test("capacity-aware exact Hamilton uses actual nine-cell cluster capacities", () => {
  const capacities = [1, 2, 3, 4, 5, 6, 7, 15, 30];
  const bundle = makeBundle(capacities);

  assert.deepEqual(bundle.sampleManifest.stratumAllocations.map((cell) => cell.eligibleClusterCount), capacities);
  assert.deepEqual(bundle.sampleManifest.stratumAllocations.map((cell) => cell.finalAllocation), [1, 2, 3, 4, 5, 6, 7, 11, 21]);
  assert.equal(bundle.sampleManifest.hamiltonAudit.length, 1);
  assert.equal(bundle.sampleManifest.hamiltonAudit[0].denominator, 70);
  assert.deepEqual(validateSampleAgainstFrame(bundle), []);
});

test("manifest physical tuple root is the sorted itemId-itemHash-clusterId root and remains separate from self-hash", () => {
  const bundle = makeBundle();
  const tuples = bundle.sampleManifest.selectedRows
    .map(({ itemId, itemHash, clusterId }) => [itemId, itemHash, clusterId])
    .sort((left, right) => codePointCompare(left[0], right[0]) || codePointCompare(left[1], right[1]) || codePointCompare(left[2], right[2]));
  const expectedRoot = sha256Hex(canonicalJson(tuples));

  assert.equal(bundle.sampleManifest.manifestTupleRootHash, expectedRoot);
  assert.notEqual(bundle.sampleManifest.manifestTupleRootHash, bundle.sampleManifest.sampleManifestHash);

  const forged = structuredClone(bundle);
  forged.sampleManifest.manifestTupleRootHash = "f".repeat(64);
  forged.sampleManifest.sampleManifestHash = calculateArtifactHash(forged.sampleManifest, "sampleManifestHash");
  assert.equal(validateSampleAgainstFrame(forged).some((error) => error.includes("tuple root")), true);
});

test("a self-consistent same-stratum substitution is rejected against the full frame ranking", () => {
  const bundle = makeBundle();
  const forged = structuredClone(bundle);
  const selectedIds = new Set(forged.sampleManifest.selectedRows.map((row) => row.itemId));
  const targetIndex = forged.sampleManifest.selectedRows.findIndex((row) => {
    const candidates = forged.clusterAudit.clusters.filter((cluster) => cluster.assignedStratum === row.stratum);
    return candidates.some((cluster) => !selectedIds.has(cluster.representativeItemId));
  });
  assert.notEqual(targetIndex, -1);
  const target = forged.sampleManifest.selectedRows[targetIndex];
  const replacementCluster = forged.clusterAudit.clusters
    .filter((cluster) => cluster.assignedStratum === target.stratum)
    .find((cluster) => !selectedIds.has(cluster.representativeItemId));
  const replacement = forged.frameRows.find((row) => row.itemId === replacementCluster.representativeItemId);
  forged.sampleManifest.selectedRows[targetIndex] = {
    clusterId: replacement.homologyClusterId,
    itemId: replacement.itemId,
    itemHash: replacement.itemHash,
    stratum: replacementCluster.assignedStratum,
    responseForm: replacement.responseForm,
    difficulty: replacement.difficulty,
    selectionDigest: selectionDigestV3({
      designHash: REGISTRATION_HASH,
      frameHash: forged.frameRegistration.frameSelectionContentRootHash,
      algorithmVersion: SAMPLE_ALGORITHM_VERSION,
      stratum: replacementCluster.assignedStratum,
      clusterId: replacement.homologyClusterId,
      itemHash: replacement.itemHash,
    }),
    inclusionProbability: target.inclusionProbability,
    analysisWeight: 1,
  };
  forged.sampleManifest.selectedRows.sort((left, right) => codePointCompare(left.stratum, right.stratum)
    || codePointCompare(left.selectionDigest, right.selectionDigest)
    || codePointCompare(left.itemId, right.itemId));
  rehashSampleManifest(forged.sampleManifest);

  assert.equal(validateSampleAgainstFrame(forged).some((error) => error.includes("top-ranked")), true);
});

test("frame registration counts, row root, and cluster-audit binding are recomputed rather than trusted", () => {
  const bundle = makeBundle();
  const forged = structuredClone(bundle);
  forged.frameRegistration.eligibleRowCount += 1;
  withHash(forged.frameRegistration, "frameRegistrationHash");

  assert.equal(validateSampleAgainstFrame(forged).some((error) => error.includes("frame registration")), true);
});

test("C0 audit selects exactly 12 top-ranked sample rows with minimum one per nonempty cell", () => {
  const bundle = makeBundle();
  const audit = bundle.c0RandomAudit;
  const nonemptyCells = bundle.sampleManifest.stratumAllocations.filter((cell) => cell.finalAllocation > 0);

  assert.equal(audit.selectedRows.length, 12);
  for (const cell of nonemptyCells) {
    assert.equal(audit.stratumAllocations.find((entry) => entry.stratum === cell.stratum).finalAllocation >= 1, true);
  }
  for (const selected of audit.selectedRows) {
    const expectedDigest = c0SelectionDigestV3({
      registrationHash: REGISTRATION_HASH,
      sampleSelectionContentRootHash: bundle.sampleManifest.sampleSelectionContentRootHash,
      algorithmVersion: C0_AUDIT_ALGORITHM_VERSION,
      stratum: selected.stratum,
      clusterId: selected.clusterId,
      itemHash: selected.itemHash,
    });
    assert.equal(selected.selectionDigest, expectedDigest);
  }
  assert.deepEqual(validateSampleAgainstFrame(bundle), []);

  const forged = structuredClone(bundle);
  forged.c0RandomAudit.noReroll = false;
  forged.c0RandomAudit.auditHash = calculateArtifactHash(forged.c0RandomAudit, "auditHash");
  assert.equal(validateSampleAgainstFrame(forged).some((error) => error.includes("C0 random audit")), true);
});

test("sample and C0 registrations forbid reroll and result-dependent replacement", () => {
  const bundle = makeBundle();
  const forged = structuredClone(bundle);
  forged.sampleManifest.rerollAfterAnyLabelOrResult = true;
  forged.sampleManifest.replacementAfterAnyLabelOrResult = true;
  rehashSampleManifest(forged.sampleManifest);

  const errors = validateSampleAgainstFrame(forged);
  assert.equal(errors.some((error) => error.includes("reroll")), true);
  assert.equal(errors.some((error) => error.includes("replacement")), true);
});

test("malformed non-JCS artifact values fail closed as validation errors instead of throwing", () => {
  const malformed = makeBundle();
  malformed.sampleManifest.selectedRows[0].itemHash = undefined;

  assert.doesNotThrow(() => validateSampleAgainstFrame(malformed));
  assert.equal(validateSampleAgainstFrame(malformed).length > 0, true);
});

test("frame rows fail closed when the frozen California runtime projection contract is incomplete", () => {
  const rows = makeFrameRows();
  delete rows[0].canonicalTopic;
  withHash(rows[0], "rowHash");
  assert.throws(() => buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /canonicalTopic/u);
});

test("frame leaves enforce exact CA runtime, egress, exclusion, source OID, and RFC3339 invariants", () => {
  const mutations = [
    ["region", (row) => { row.region = "HK"; }, /region/u],
    ["curriculum profile", (row) => { row.curriculumProfile = "US_TX_MATH"; }, /curriculumProfile/u],
    ["runtime visibility", (row) => { row.runtimeVisible = false; }, /runtimeVisible/u],
    ["runtime origin", (row) => { row.runtimeOrigin = "SOURCE_FILE_SCAN"; }, /runtimeOrigin/u],
    ["source module hash", (row) => { row.sourceModuleHash = null; }, /sourceModuleHash/u],
    ["closed exclusion", (row) => { row.eligible = false; row.exclusionCode = "OTHER"; }, /exclusionCode/u],
    ["egress rights", (row) => { row.egressRights.providerEgressAllowed = false; }, /egress/u],
    ["41-character source oid", (row) => { row.sourceCommit = "5".repeat(41); }, /sourceCommit/u],
    ["63-character source oid", (row) => { row.sourceCommit = "5".repeat(63); }, /sourceCommit/u],
    ["loose timestamp", (row) => { row.frameFrozenAt = "2026-08-25 05:00:00"; }, /RFC3339/u],
    ["invalid calendar instant", (row) => { row.frameFrozenAt = "2026-02-30T05:00:00.000Z"; }, /RFC3339/u],
  ];
  for (const [label, mutate, pattern] of mutations) {
    const rows = makeFrameRows();
    mutate(rows[0]);
    rehashRow(rows[0]);
    assert.throws(() => buildClusterAuditV3({
      frameRows: rows,
      registrationHash: REGISTRATION_HASH,
      clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
      auditedAt: FROZEN_AT,
    }), pattern, label);
  }
  const sha256SourceRows = makeFrameRows();
  for (const row of sha256SourceRows) {
    row.sourceCommit = "a".repeat(64);
    rehashRow(row);
  }
  assert.doesNotThrow(() => buildClusterAuditV3({
    frameRows: sha256SourceRows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }));
});

test("a mathematical prompt is mandatory while missing answer, options, or explanation remains eligible", () => {
  const missingPrompt = makeFrameRows();
  missingPrompt[0].prompt = "";
  rehashRow(missingPrompt[0]);
  assert.throws(() => buildClusterAuditV3({
    frameRows: missingPrompt,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /prompt/u);

  const incompleteMaterials = makeFrameRows();
  Object.assign(incompleteMaterials[0], {
    answerPresent: false,
    answer: null,
    storedAnswer: null,
    acceptedAnswers: [],
    optionsPresent: false,
    options: null,
    explanationPresent: false,
    explanation: null,
    eligible: true,
    exclusionCode: null,
  });
  rehashRow(incompleteMaterials[0]);
  assert.doesNotThrow(() => buildClusterAuditV3({
    frameRows: incompleteMaterials,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }));
});

test("exact duplicate leaves assigned to different homology clusters block the audit", () => {
  const rows = makeFrameRows();
  for (const field of ["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation"]) {
    rows[1][field] = structuredClone(rows[0][field]);
  }
  rows[1].answerPresent = rows[0].answerPresent;
  rows[1].optionsPresent = rows[0].optionsPresent;
  rows[1].explanationPresent = rows[0].explanationPresent;
  rows[0].exactDuplicateGroupId = exactGroupFor(rows[0]);
  rows[1].exactDuplicateGroupId = exactGroupFor(rows[1]);
  rows[1].normalizedPromptHash = calculateNormalizedPromptHashV3(rows[1]);
  rows[1].templateSkeletonHash = calculateTemplateSkeletonHashV3(rows[1]);
  rehashRow(rows[0]);
  rehashRow(rows[1]);

  assert.notEqual(rows[0].homologyClusterId, rows[1].homologyClusterId);
  assert.throws(() => buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /exact duplicate.*homology cluster|connected component/iu);
});

test("source edges use only the frozen fine-grained K5 lineage tuple and never batch alone", () => {
  const rows = makeFrameRows();
  Object.assign(rows[0], {
    lineageKind: "K5",
    batchId: "batch-k5-a",
    clusterId: "generator-cluster-7",
    topicId: "topic-k5-fractions",
  });
  Object.assign(rows[1], {
    lineageKind: "K5",
    batchId: "batch-k5-a",
    clusterId: "generator-cluster-7",
    topicId: "topic-k5-fractions",
    homologyClusterId: rows[0].homologyClusterId,
  });
  const key = ["K5", "batch-k5-a", "generator-cluster-7", "topic-k5-fractions", rows[0].responseForm];
  rows[0].lineageKeyHash = sha256Hex(canonicalJson(key));
  rows[1].lineageKeyHash = rows[0].lineageKeyHash;
  rehashRow(rows[0]);
  rehashRow(rows[1]);
  rematerializeRows(rows);
  assert.doesNotThrow(() => buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }));

  const batchOnly = makeFrameRows();
  Object.assign(batchOnly[0], { lineageKind: "K5", batchId: "same-batch", clusterId: "a", topicId: "topic" });
  Object.assign(batchOnly[1], { lineageKind: "K5", batchId: "same-batch", clusterId: "b", topicId: "topic" });
  batchOnly[0].lineageKeyHash = sha256Hex(canonicalJson(["K5", "same-batch", "a", "topic", batchOnly[0].responseForm]));
  batchOnly[1].lineageKeyHash = sha256Hex(canonicalJson(["K5", "same-batch", "b", "topic", batchOnly[1].responseForm]));
  rehashRow(batchOnly[0]);
  rehashRow(batchOnly[1]);
  rematerializeRows(batchOnly);
  const audit = buildClusterAuditV3({
    frameRows: batchOnly,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  });
  assert.equal(audit.edges.some((edge) => edge.edgeType === "SOURCE" && [batchOnly[0].itemId, batchOnly[1].itemId].includes(edge.leftItemId)), false);
});

test("all three source families require their exact frozen fine-grained tuple", () => {
  const cases = [
    ["K5", { batchId: "b", clusterId: "c", topicId: "t" }],
    ["G6_12", { batchId: "b", generationTemplate: "g", topicId: "t" }],
    ["CCSS", { batchId: "b", sourceLessonSlug: "lesson", topicId: "t" }],
  ];
  for (const [lineageKind, lineageFields] of cases) {
    const rows = makeFrameRows();
    Object.assign(rows[0], { lineageKind, ...lineageFields });
    Object.assign(rows[1], { lineageKind, ...lineageFields, homologyClusterId: rows[0].homologyClusterId });
    rehashRow(rows[0]);
    rehashRow(rows[1]);
    rematerializeRows(rows);
    const audit = buildClusterAuditV3({
      frameRows: rows,
      registrationHash: REGISTRATION_HASH,
      clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
      auditedAt: FROZEN_AT,
    });
    assert.equal(audit.edges.some((edge) => edge.edgeType === "SOURCE"
      && edge.leftItemId === rows[0].itemId && edge.rightItemId === rows[1].itemId), true, lineageKind);

    const missing = makeFrameRows();
    Object.assign(missing[0], { lineageKind, ...lineageFields });
    const requiredField = lineageKind === "K5" ? "clusterId" : lineageKind === "G6_12" ? "generationTemplate" : "sourceLessonSlug";
    missing[0][requiredField] = null;
    assert.throws(() => {
      rehashRow(missing[0]);
      buildClusterAuditV3({
        frameRows: missing,
        registrationHash: REGISTRATION_HASH,
        clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
        auditedAt: FROZEN_AT,
      });
    }, new RegExp(requiredField, "u"), lineageKind);
  }
});

test("template homology is recomputed from normalized literals while retaining topic, form, and operators", () => {
  const rows = makeFrameRows();
  rows[0].prompt = { ...rows[0].prompt, en: "Compute $\\frac{2}{3} + x = 5$." };
  rows[1].prompt = { ...rows[1].prompt, en: "  COMPUTE  17 / 29 + y = 29！ " };
  rows[1].homologyClusterId = rows[0].homologyClusterId;
  for (const row of rows.slice(0, 2)) {
    row.exactDuplicateGroupId = exactGroupFor(row);
    row.normalizedPromptHash = calculateNormalizedPromptHashV3(row);
    row.templateSkeletonHash = calculateTemplateSkeletonHashV3(row);
    rehashRow(row);
  }
  rematerializeRows(rows);
  assert.equal(rows[0].templateSkeletonHash, rows[1].templateSkeletonHash);
  const audit = buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  });
  assert.equal(audit.edges.some((edge) => edge.edgeType === "TEMPLATE"
    && edge.leftItemId === rows[0].itemId && edge.rightItemId === rows[1].itemId), true);

  const changedOperator = structuredClone(rows);
  changedOperator[1].prompt = { ...changedOperator[1].prompt, en: "COMPUTE 17 / 29 - y = 29" };
  changedOperator[1].exactDuplicateGroupId = exactGroupFor(changedOperator[1]);
  changedOperator[1].normalizedPromptHash = calculateNormalizedPromptHashV3(changedOperator[1]);
  changedOperator[1].templateSkeletonHash = calculateTemplateSkeletonHashV3(changedOperator[1]);
  changedOperator[1].homologyClusterId = "different-operator-component";
  rehashRow(changedOperator[1]);
  rematerializeRows(changedOperator);
  assert.doesNotThrow(() => buildClusterAuditV3({
    frameRows: changedOperator,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }));
});

test("near-duplicate edges require both frozen similarities within the same topic and response form", () => {
  const rows = makeFrameRows();
  const common = "A student carefully compares equal fractional quantities on a number line and explains every mathematical step before choosing the final response";
  rows[0].prompt = { ...rows[0].prompt, en: `${common}.` };
  rows[1].prompt = { ...rows[1].prompt, en: `${common.replace("carefully", "carefuly")}.` };
  rows[1].homologyClusterId = rows[0].homologyClusterId;
  for (const row of rows.slice(0, 2)) {
    row.exactDuplicateGroupId = exactGroupFor(row);
    row.normalizedPromptHash = calculateNormalizedPromptHashV3(row);
    row.templateSkeletonHash = calculateTemplateSkeletonHashV3(row);
    rehashRow(row);
  }
  rematerializeRows(rows);
  assert.notEqual(rows[0].templateSkeletonHash, rows[1].templateSkeletonHash);
  const audit = buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  });
  assert.equal(audit.edges.some((edge) => edge.edgeType === "NEAR"
    && edge.leftItemId === rows[0].itemId && edge.rightItemId === rows[1].itemId
    && edge.trigramJaccard >= 0.9 && edge.normalizedEditSimilarity >= 0.92), true);

  const otherTopic = structuredClone(rows);
  otherTopic[1].canonicalTopic = "different-topic";
  otherTopic[1].topic = { en: "different-topic", zh: "不同主題", zhHans: "不同主题" };
  otherTopic[1].templateSkeletonHash = calculateTemplateSkeletonHashV3(otherTopic[1]);
  otherTopic[1].homologyClusterId = "different-topic-component";
  rehashRow(otherTopic[1]);
  rematerializeRows(otherTopic);
  const otherAudit = buildClusterAuditV3({
    frameRows: otherTopic,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  });
  assert.equal(otherAudit.edges.some((edge) => edge.edgeType === "NEAR"
    && [otherTopic[0].itemId, otherTopic[1].itemId].includes(edge.leftItemId)
    && [otherTopic[0].itemId, otherTopic[1].itemId].includes(edge.rightItemId)), false);
});

test("components above five percent or bridging more than two canonical topics block frame freeze", () => {
  const oversized = makeFrameRows();
  const oversizedClusterId = oversized[0].homologyClusterId;
  for (const row of oversized.slice(0, 6)) {
    Object.assign(row, {
      lineageKind: "K5",
      batchId: "oversized-batch",
      clusterId: "oversized-generator-cluster",
      topicId: "oversized-topic",
      homologyClusterId: oversizedClusterId,
    });
    row.lineageKeyHash = sha256Hex(canonicalJson(["K5", row.batchId, row.clusterId, row.topicId, row.responseForm]));
    rehashRow(row);
  }
  assert.throws(() => buildClusterAuditV3({
    frameRows: oversized,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), />5%|five percent|oversized/iu);

  const bridge = makeFrameRows();
  const bridgeIndexes = [0, 12, 24];
  for (const index of bridgeIndexes.slice(1)) {
    for (const field of ["prompt", "options", "storedAnswer", "acceptedAnswers", "explanation"]) {
      bridge[index][field] = structuredClone(bridge[0][field]);
    }
    bridge[index].answerPresent = bridge[0].answerPresent;
    bridge[index].optionsPresent = bridge[0].optionsPresent;
    bridge[index].explanationPresent = bridge[0].explanationPresent;
    bridge[index].homologyClusterId = bridge[0].homologyClusterId;
  }
  for (const index of bridgeIndexes) {
    bridge[index].exactDuplicateGroupId = exactGroupFor(bridge[index]);
    bridge[index].normalizedPromptHash = calculateNormalizedPromptHashV3(bridge[index]);
    bridge[index].templateSkeletonHash = calculateTemplateSkeletonHashV3(bridge[index]);
    rehashRow(bridge[index]);
  }
  assert.equal(new Set(bridgeIndexes.map((index) => bridge[index].canonicalTopic)).size, 3);
  assert.throws(() => buildClusterAuditV3({
    frameRows: bridge,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /bridge.*canonical topics|more than two/iu);
});

test("cluster audit publishes deterministic singleton, largest-component, distribution, and anomaly ledgers", () => {
  const bundle = makeBundle(Array(9).fill(12), { crossCell: true });
  const audit = bundle.clusterAudit;
  assert.equal(audit.componentSizeDistribution.reduce((sum, entry) => sum + entry.componentCount, 0), audit.eligibleClusterCount);
  assert.equal(audit.singletonRate, (audit.eligibleClusterCount - 1) / audit.eligibleClusterCount);
  assert.equal(audit.largest20Components.length, 20);
  assert.equal(audit.largest20Components[0].eligibleItemCount, 2);
  assert.equal(audit.crossCellComponentCount, 1);
  assert.equal(audit.anomalyLedger.length, bundle.frameRows.length);
  assert.equal(audit.anomalyLedger.every((entry) => entry.code === "LINEAGE_UNAVAILABLE_NO_SOURCE_EDGE"), true);
  assert.equal(audit.anomalyLedgerRootHash, sha256Hex(canonicalJson(audit.anomalyLedger.map(({ anomalyHash }) => anomalyHash).sort())));
});

test("runtime extraction inventory and clean-source evidence make deletion and unresolved serialization fail closed", () => {
  const rows = makeFrameRows();
  const frameEvidenceFixture = buildFrameEvidenceFixture(rows);
  const runtimeSourceEnumerationReceipt = makeRuntimeSourceEnumerationReceipt(rows, { frameEvidenceFixture });
  const expectedInventoryLeaves = runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves;
  const snapshot = buildRuntimeExtractionSnapshotV3({
    frameRows: rows,
    expectedInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger: [],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: "2026-08-25T04:57:00.000Z",
    ...frameEvidenceFixture,
  });
  const sourceEvidence = buildCleanSourceEvidenceV3({
    sourceCommit: SOURCE_COMMIT,
    verifiedAt: "2026-08-25T04:58:00.000Z",
    gitStatusPorcelain: "",
    sourceObjectType: "commit",
    verificationMode: "READ_ONLY_GIT_STATUS_AND_CAT_FILE",
  });
  const audit = buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  });
  assert.throws(() => buildFrameRegistrationV3({
    frameRows: rows.slice(1),
    runtimeExtractionSnapshot: snapshot,
    cleanSourceEvidence: sourceEvidence,
    clusterAudit: audit,
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    frozenAt: "2026-08-25T05:01:00.000Z",
    lineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedRouteExecutionRootHash: frameEvidenceFixture.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: frameEvidenceFixture.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: frameEvidenceFixture.trustedOwnerApprovalRootHash,
  }), /inventory|completeness|deletion|frameFreezeEvidence|protected frame/iu);

  const failedItem = rows.at(-1);
  const failedRuntimeSourceEnumerationReceipt = makeRuntimeSourceEnumerationReceipt(rows, {
    failureItemIds: [failedItem.itemId],
  });
  const failureEntry = withHash({
    itemId: failedItem.itemId,
    runtimeProjectionHash: calculateRuntimeProjectionHashV3(failedItem),
    exclusionCode: "UNSTABLE_SERIALIZATION",
    failureClass: "SERIALIZATION_OR_READ_CRASH",
    redactedDetailHash: localHash("redacted fixture failure"),
    recordedAt: "2026-08-25T04:57:30.000Z",
  }, "entryHash");
  assert.throws(() => buildRuntimeExtractionSnapshotV3({
    frameRows: rows.slice(0, -1),
    expectedInventoryLeaves: failedRuntimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt: failedRuntimeSourceEnumerationReceipt,
    serializationFailureLedger: [failureEntry],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: "2026-08-25T04:59:00.000Z",
    ...frameEvidenceFixture,
  }), /frameFreezeEvidence|exact protected frame|serialization|failure/iu);
});

test("itemHash is recomputed from the full frozen item leaf before any root is accepted", () => {
  const rows = makeFrameRows();
  rows[0].prompt = `${rows[0].prompt} tampered`;
  rows[0].exactDuplicateGroupId = exactGroupFor(rows[0]);
  rows[0].normalizedPromptHash = calculateNormalizedPromptHashV3(rows[0]);
  rows[0].templateSkeletonHash = calculateTemplateSkeletonHashV3(rows[0]);
  withHash(rows[0], "rowHash");
  assert.notEqual(rows[0].itemHash, calculateItemContentHashV3(rows[0]));
  assert.throws(() => buildClusterAuditV3({
    frameRows: rows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /itemHash/u);
});

test("timestamp-only mutations change self-hashes but cannot reroll either CA60 or the random C0 audit", () => {
  const first = makeBundle();
  const laterRows = structuredClone(first.frameRows);
  for (const row of laterRows) {
    row.frameFrozenAt = "2026-08-25T06:00:00.000Z";
    withHash(row, "rowHash");
  }
  const laterFrameEvidenceFixture = buildFrameEvidenceFixture(laterRows);
  const laterReceipt = makeRuntimeSourceEnumerationReceipt(laterRows, {
    enumeratedAt: "2026-08-25T05:56:00.000Z",
    frameEvidenceFixture: laterFrameEvidenceFixture,
  });
  const runtimeExtractionSnapshot = buildRuntimeExtractionSnapshotV3({
    frameRows: laterRows,
    expectedInventoryLeaves: laterReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt: laterReceipt,
    serializationFailureLedger: [],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: "2026-08-25T05:57:00.000Z",
    ...laterFrameEvidenceFixture,
  });
  const cleanSourceEvidence = buildCleanSourceEvidenceV3({
    sourceCommit: SOURCE_COMMIT,
    verifiedAt: "2026-08-25T05:58:00.000Z",
    gitStatusPorcelain: "",
    sourceObjectType: "commit",
    verificationMode: "READ_ONLY_GIT_STATUS_AND_CAT_FILE",
  });
  const clusterAudit = buildClusterAuditV3({
    frameRows: laterRows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: "2026-08-25T06:01:00.000Z",
  });
  const frameRegistration = buildFrameRegistrationV3({
    frameRows: laterRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: RUNTIME_CONFIG_HASH,
    sourceCommit: SOURCE_COMMIT,
    frozenAt: "2026-08-25T06:02:00.000Z",
    lineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
    trustedRouteExecutionRootHash: laterFrameEvidenceFixture.trustedRouteExecutionRootHash,
    trustedDependencyClosureRootHash: laterFrameEvidenceFixture.trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash: laterFrameEvidenceFixture.trustedOwnerApprovalRootHash,
  });
  const sampleManifest = buildSampleManifestV3({
    frameRows: laterRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: "2026-08-25T06:03:00.000Z",
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  const c0RandomAudit = buildC0RandomAuditV3({
    frameRows: laterRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    frozenAt: "2026-08-25T06:04:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });

  assert.equal(calculateFrameSelectionContentRootV3(first.frameRows), calculateFrameSelectionContentRootV3(laterRows));
  assert.equal(first.frameRegistration.frameSelectionContentRootHash, frameRegistration.frameSelectionContentRootHash);
  assert.notEqual(first.frameRegistration.frameRegistrationHash, frameRegistration.frameRegistrationHash);
  assert.equal(calculateSampleSelectionContentRootV3(first.sampleManifest), calculateSampleSelectionContentRootV3(sampleManifest));
  assert.notEqual(first.sampleManifest.sampleManifestHash, sampleManifest.sampleManifestHash);
  const withoutManifestPseudonym = (rows) => rows.map(({ itemIdPseudonym: _pseudonym, ...row }) => row);
  assert.deepEqual(
    withoutManifestPseudonym(first.sampleManifest.selectedRows),
    withoutManifestPseudonym(sampleManifest.selectedRows),
  );
  assert.notDeepEqual(
    first.sampleManifest.selectedRows.map((row) => row.itemIdPseudonym),
    sampleManifest.selectedRows.map((row) => row.itemIdPseudonym),
  );
  assert.notEqual(first.sampleManifest.pseudonymSeedRootHash, sampleManifest.pseudonymSeedRootHash);
  assert.notEqual(first.sampleManifest.pseudonymMappingRootHash, sampleManifest.pseudonymMappingRootHash);
  assert.deepEqual(first.c0RandomAudit.selectedRows, c0RandomAudit.selectedRows);
});

test("secondary estimand freezes cluster and representative inclusion probabilities with a recomputed Kish effective n", () => {
  const bundle = makeBundle(Array(9).fill(12), { crossCell: true });
  const members = bundle.frameRows.filter((row) => row.eligible && row.homologyClusterId === "cluster-00-000");
  assert.equal(members.length, 2);
  assert.equal(members.filter((row) => row.clusterRepresentative).length, 1);
  const representative = members.find((row) => row.clusterRepresentative);
  const nonrepresentative = members.find((row) => !row.clusterRepresentative);
  assert.equal(representative.representativeSelectionProbability, 1);
  assert.equal(nonrepresentative.representativeSelectionProbability, 0);
  assert.equal(representative.clusterInclusionProbability, nonrepresentative.clusterInclusionProbability);
  assert.equal(representative.inclusionProbability, representative.clusterInclusionProbability);
  assert.equal(nonrepresentative.inclusionProbability, 0);
  assert.equal(nonrepresentative.analysisWeight, 0);

  const selectedWeights = bundle.sampleManifest.selectedRows.map((row) => row.secondaryAnalysisWeight);
  const expectedKish = (selectedWeights.reduce((sum, weight) => sum + weight, 0) ** 2)
    / selectedWeights.reduce((sum, weight) => sum + (weight ** 2), 0);
  assert.equal(calculateKishEffectiveSampleSizeV3(selectedWeights), expectedKish);
  assert.equal(bundle.sampleManifest.secondaryWeightSummary.kishEffectiveSampleSize, expectedKish);
  assert.equal(bundle.sampleManifest.secondaryEstimand, "FROZEN_ELIGIBLE_HOMOLOGY_CLUSTER_REPRESENTATIVE_INVENTORY");

  const forgedRows = structuredClone(bundle.frameRows);
  forgedRows[0].inclusionProbability = 1;
  forgedRows[0].analysisWeight = 1;
  withHash(forgedRows[0], "rowHash");
  assert.throws(() => buildClusterAuditV3({
    frameRows: forgedRows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: CLUSTERING_ALGORITHM_HASH,
    auditedAt: FROZEN_AT,
  }), /inclusion probability|analysis weight|secondary weighting/iu);

  assert.deepEqual(materializeFrameSamplingWeightsV3(forgedRows, REGISTRATION_HASH), bundle.frameRows);
});

test("C0 construction rejects a hash-valid duplicate 60-row manifest by recomputing the complete upstream sample", () => {
  const bundle = makeBundle();
  const forged = structuredClone(bundle.sampleManifest);
  forged.selectedRows[1] = structuredClone(forged.selectedRows[0]);
  forged.selectedRows.sort((left, right) => codePointCompare(left.stratum, right.stratum)
    || codePointCompare(left.selectionDigest, right.selectionDigest)
    || codePointCompare(left.itemId, right.itemId));
  rehashSampleManifest(forged);
  assert.equal(new Set(forged.selectedRows.map((row) => row.clusterId)).size, 59);
  assert.throws(() => buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: forged,
    frozenAt: "2026-08-25T05:04:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  }), /upstream sample|duplicate|full-frame recomputation/iu);
});

test("freeze timing is derived from the exact frame-to-sample-to-C0 chain and first Qwen receipt", () => {
  const bundle = makeBundle();
  assert.equal("frozenBeforeReferenceLabels" in bundle.c0RandomAudit, false);
  const firstReferenceReceipt = {
    schemaVersion: "ProviderAttemptReceiptV1",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    frameRegistrationHash: bundle.frameRegistration.frameRegistrationHash,
    sampleManifestHash: bundle.sampleManifest.sampleManifestHash,
    requestedProvider: "ALIBABA_CLOUD_MODEL_STUDIO",
    role: "A_SOLVE",
    startedAt: "2026-08-25T05:05:00.000Z",
  };
  assert.deepEqual(validateFreezeTimingV3({
    frameRegistration: bundle.frameRegistration,
    sampleManifest: bundle.sampleManifest,
    c0RandomAudit: bundle.c0RandomAudit,
    referenceAttemptReceipts: [firstReferenceReceipt],
  }), []);

  const early = { ...firstReferenceReceipt, startedAt: "2026-08-25T05:03:30.000Z" };
  assert.equal(validateFreezeTimingV3({
    frameRegistration: bundle.frameRegistration,
    sampleManifest: bundle.sampleManifest,
    c0RandomAudit: bundle.c0RandomAudit,
    referenceAttemptReceipts: [early],
  }).some((error) => error.includes("before first Qwen/reference")), true);

  const forged = structuredClone(bundle.c0RandomAudit);
  forged.freezeSequence = 2;
  withHash(forged, "auditHash");
  assert.equal(validateFreezeTimingV3({
    frameRegistration: bundle.frameRegistration,
    sampleManifest: bundle.sampleManifest,
    c0RandomAudit: forged,
    referenceAttemptReceipts: [firstReferenceReceipt],
  }).some((error) => error.includes("sequence")), true);

  const deepSeekReceipt = {
    ...firstReferenceReceipt,
    requestedProvider: "DEEPSEEK_DIRECT",
    role: "B_PRIME_CRITIQUE",
  };
  assert.equal(validateFreezeTimingV3({
    frameRegistration: bundle.frameRegistration,
    sampleManifest: bundle.sampleManifest,
    c0RandomAudit: bundle.c0RandomAudit,
    referenceAttemptReceipts: [deepSeekReceipt],
  }).some((error) => error.includes("Qwen reference provider/role")), true);

  const wrongQwenRole = { ...firstReferenceReceipt, role: "C0_PRIME_ROLE_1" };
  assert.equal(validateFreezeTimingV3({
    frameRegistration: bundle.frameRegistration,
    sampleManifest: bundle.sampleManifest,
    c0RandomAudit: bundle.c0RandomAudit,
    referenceAttemptReceipts: [wrongQwenRole],
  }).some((error) => error.includes("Qwen reference provider/role")), true);
});

test("pre-result replacement is limited to registered egress or serialization exclusions and the exact next rank", () => {
  const bundle = makeBundle();
  const removed = bundle.sampleManifest.selectedRows[0];
  const removedFrameRow = bundle.frameRows.find((row) => row.itemId === removed.itemId);
  const deniedRightsInput = {
    sourceIds: RIGHTS_REGISTRY_REQUIRED_SOURCES_V4,
    registry: Object.fromEntries(RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId) => [sourceId, { disposition: "DENIED" }])),
    ownerApprovalClaimsBySource: {},
  };
  const deniedRightsTable = buildRightsEgressDecisionTableV4(deniedRightsInput);
  const screenEvidence = bundle.frameFreezeEvidenceInput.itemScreenEvidence.find((entry) => entry.itemId === removed.itemId);
  const egressDecisionInput = {
    item: removedFrameRow,
    rightsDecisionInput: deniedRightsInput,
    rightsDecisionTable: deniedRightsTable,
    trustedOwnerApprovalRootHash: deniedRightsTable.ownerApprovalClaimRootHash,
    screenEvidence,
    scannerExecutionReceiptInventory: bundle.frameFreezeEvidenceInput.scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: bundle.frameFreezeEvidenceInput.trustedScannerExecutionReceiptInventoryHash,
    ...SCREENING_ROOTS,
  };
  const egressDecision = buildFrameItemEgressDecisionV4(egressDecisionInput);
  const makeExclusionEvidence = (registeredAt) => {
    const executedAt = new Date(Date.parse(registeredAt) + 500).toISOString();
    const exclusionRunnerReceipt = buildPreResultExclusionRunnerReceiptV4({
      itemId: removed.itemId,
      itemHash: removed.itemHash,
      exclusionCode: "RESTRICTED_EGRESS_CONTENT",
      reasonCode: "RIGHTS_EXPLICITLY_DENIED",
      registeredAt,
      exclusionSourceArtifactHash: egressDecision.itemEgressDecisionHash,
      issuerImplementationHash: "6".repeat(64),
      runnerCommit: "7".repeat(40),
      runnerHash: "8".repeat(64),
      executedAt,
    });
    return buildPreResultExclusionEvidenceV4({
      exclusionSourceArtifact: egressDecision,
      egressDecisionInput,
      exclusionCode: "RESTRICTED_EGRESS_CONTENT",
      reasonCode: "RIGHTS_EXPLICITLY_DENIED",
      registeredAt,
      exclusionRunnerReceipt,
    });
  };
  const exclusionEvidence = makeExclusionEvidence("2026-08-25T05:05:00.000Z");
  const exclusionEvidenceInventory = buildPreResultExclusionEvidenceInventoryV4({
    exclusionEvidences: [exclusionEvidence],
    recordedAt: "2026-08-25T05:05:00.750Z",
  });
  const recorderRoots = {
    recorderImplementationHash: "8".repeat(64),
    recorderRunnerReceiptHash: "9".repeat(64),
  };
  const beforeExecutionLedger = buildSampleExecutionLedgerV4({
    sampleManifestHash: bundle.sampleManifest.sampleManifestHash,
    previousExecutionLedgerHash: null,
    ...recorderRoots,
    recordedAt: "2026-08-25T05:04:30.000Z",
    entries: [],
  });
  const replacementInput = {
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    previousSampleManifest: bundle.sampleManifest,
    exclusionEvidence,
    exclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash: exclusionEvidenceInventory.exclusionEvidenceInventoryHash,
    newManifestFrozenAt: "2026-08-25T05:05:01.000Z",
    beforeExecutionLedger,
    trustedBeforeExecutionLedgerHash: beforeExecutionLedger.executionLedgerHash,
    trustedExecutionLedgerRecorderImplementationHash: recorderRoots.recorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash: recorderRoots.recorderRunnerReceiptHash,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  };
  assert.throws(() => buildSampleManifestV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    manifestFrozenAt: replacementInput.newManifestFrozenAt,
    registeredPreResultExclusions: [{
      itemId: exclusionEvidence.itemId,
      itemHash: exclusionEvidence.itemHash,
      exclusionCode: exclusionEvidence.exclusionCode,
      evidenceHash: exclusionEvidence.exclusionEvidenceHash,
      registeredAt: exclusionEvidence.registeredAt,
      exclusionEvidence,
    }],
    supersededSampleManifest: bundle.sampleManifest,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  }), /initial sample only|replacement.*unique builder|replacement authority/iu,
  "the public sample builder must not bypass the trusted inventory and before-ledger replacement authority");
  const replacement = buildPreResultReplacementV3(replacementInput);
  assert.equal(replacement.sampleManifest.supersedesSampleManifestHash, bundle.sampleManifest.sampleManifestHash);
  assert.equal(replacement.sampleManifest.sampleVersion, 2);
  assert.equal(
    replacement.sampleManifest.replacementAuthorization.trustedExclusionEvidenceInventoryHash,
    exclusionEvidenceInventory.exclusionEvidenceInventoryHash,
  );
  assert.equal(
    replacement.sampleManifest.replacementAuthorization.beforeExecutionLedgerHash,
    beforeExecutionLedger.executionLedgerHash,
  );
  assert.equal(
    replacement.sampleManifest.replacementAuthorization.afterExecutionLedgerHash,
    replacement.afterExecutionLedger.executionLedgerHash,
  );
  assert.equal(
    replacement.sampleManifest.replacementAuthorization.replacementReceiptHash,
    replacement.replacementReceipt.replacementReceiptHash,
  );
  assert.equal(
    replacement.sampleManifest.replacementAuthorizationHash,
    replacement.sampleManifest.replacementAuthorization.replacementAuthorizationHash,
  );
  assert.equal(
    replacement.sampleManifest.replacementHistory.at(-1).replacementAuthorizationHash,
    replacement.sampleManifest.replacementAuthorizationHash,
  );
  assert.equal(replacement.sampleManifest.selectedRows.some((row) => row.itemId === removed.itemId), false);
  const ranked = bundle.clusterAudit.clusters
    .filter((cluster) => cluster.assignedStratum === removed.stratum)
    .sort((left, right) => codePointCompare(left.representativeSelectionDigest, right.representativeSelectionDigest)
      || codePointCompare(left.representativeItemId, right.representativeItemId));
  const allocation = bundle.sampleManifest.stratumAllocations.find((cell) => cell.stratum === removed.stratum).finalAllocation;
  assert.equal(replacement.sampleManifest.selectedRows.some((row) => row.itemId === ranked[allocation].representativeItemId), true);
  assert.equal(replacement.replacementReceipt.replacementItemId, ranked[allocation].representativeItemId);
  assert.equal(replacement.replacementReceipt.replacementReceiptHash, calculateArtifactHash(replacement.replacementReceipt, "replacementReceiptHash"));
  assert.equal(replacement.replacementReceipt.beforeExecutionLedgerHash, beforeExecutionLedger.executionLedgerHash);
  assert.equal(replacement.replacementReceipt.afterExecutionLedgerHash, replacement.afterExecutionLedger.executionLedgerHash);
  const replacementC0 = buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: replacement.sampleManifest,
    frozenAt: "2026-08-25T05:06:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  assert.deepEqual(validateSampleAgainstFrame({
    ...bundle,
    sampleManifest: replacement.sampleManifest,
    c0RandomAudit: replacementC0,
  }), []);

  const secondRemoved = replacement.sampleManifest.selectedRows[1];
  const secondRemovedFrameRow = bundle.frameRows.find((row) => row.itemId === secondRemoved.itemId);
  const secondScreenEvidence = bundle.frameFreezeEvidenceInput.itemScreenEvidence
    .find((entry) => entry.itemId === secondRemoved.itemId);
  const secondEgressDecisionInput = {
    item: secondRemovedFrameRow,
    rightsDecisionInput: deniedRightsInput,
    rightsDecisionTable: deniedRightsTable,
    trustedOwnerApprovalRootHash: deniedRightsTable.ownerApprovalClaimRootHash,
    screenEvidence: secondScreenEvidence,
    scannerExecutionReceiptInventory: bundle.frameFreezeEvidenceInput.scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: bundle.frameFreezeEvidenceInput.trustedScannerExecutionReceiptInventoryHash,
    ...SCREENING_ROOTS,
  };
  const secondEgressDecision = buildFrameItemEgressDecisionV4(secondEgressDecisionInput);
  const secondExclusionRunnerReceipt = buildPreResultExclusionRunnerReceiptV4({
    itemId: secondRemoved.itemId,
    itemHash: secondRemoved.itemHash,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    reasonCode: "RIGHTS_EXPLICITLY_DENIED",
    registeredAt: "2026-08-25T05:07:00.000Z",
    exclusionSourceArtifactHash: secondEgressDecision.itemEgressDecisionHash,
    issuerImplementationHash: "6".repeat(64),
    runnerCommit: "7".repeat(40),
    runnerHash: "8".repeat(64),
    executedAt: "2026-08-25T05:07:00.500Z",
  });
  const secondExclusionEvidence = buildPreResultExclusionEvidenceV4({
    exclusionSourceArtifact: secondEgressDecision,
    egressDecisionInput: secondEgressDecisionInput,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    reasonCode: "RIGHTS_EXPLICITLY_DENIED",
    registeredAt: "2026-08-25T05:07:00.000Z",
    exclusionRunnerReceipt: secondExclusionRunnerReceipt,
  });
  const secondExclusionEvidenceInventory = buildPreResultExclusionEvidenceInventoryV4({
    exclusionEvidences: [secondExclusionEvidence],
    recordedAt: "2026-08-25T05:07:00.750Z",
  });
  const secondBeforeExecutionLedger = buildSampleExecutionLedgerV4({
    sampleManifestHash: replacement.sampleManifest.sampleManifestHash,
    previousExecutionLedgerHash: replacement.afterExecutionLedger.executionLedgerHash,
    ...recorderRoots,
    recordedAt: "2026-08-25T05:06:30.000Z",
    entries: replacement.afterExecutionLedger.entries,
  });
  const secondReplacement = buildPreResultReplacementV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    previousSampleManifest: replacement.sampleManifest,
    exclusionEvidence: secondExclusionEvidence,
    exclusionEvidenceInventory: secondExclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash: secondExclusionEvidenceInventory.exclusionEvidenceInventoryHash,
    newManifestFrozenAt: "2026-08-25T05:07:01.000Z",
    beforeExecutionLedger: secondBeforeExecutionLedger,
    trustedBeforeExecutionLedgerHash: secondBeforeExecutionLedger.executionLedgerHash,
    trustedExecutionLedgerRecorderImplementationHash: recorderRoots.recorderImplementationHash,
    trustedExecutionLedgerRunnerReceiptHash: recorderRoots.recorderRunnerReceiptHash,
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  assert.equal(secondReplacement.sampleManifest.sampleVersion, 3);
  assert.equal(
    secondReplacement.sampleManifest.replacementAuthorityHistoryRootHash,
    sha256Hex(canonicalJson(secondReplacement.sampleManifest.replacementHistory)),
    "the authority history root must commit to every exact audit and authority field in the append-only history",
  );
  const secondC0 = buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: secondReplacement.sampleManifest,
    frozenAt: "2026-08-25T05:08:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  });
  assert.deepEqual(validateSampleAgainstFrame({
    ...bundle,
    sampleManifest: secondReplacement.sampleManifest,
    c0RandomAudit: secondC0,
  }), []);
  const secondEnvelopeItem = bundle.frameRows.find((row) => (
    row.itemId === secondReplacement.sampleManifest.selectedRows[0].itemId
  ));
  assert.doesNotThrow(() => buildSampleBoundProtectedItemEnvelopeV4({
    item: secondEnvelopeItem,
    sampleManifest: secondReplacement.sampleManifest,
  }));
  const tamperedEarlyHistory = structuredClone(secondReplacement.sampleManifest);
  tamperedEarlyHistory.replacementHistory[0].replacementReceiptHash = localHash("tampered-early-replacement-receipt");
  tamperedEarlyHistory.replacementAuthorityHistoryRootHash = sha256Hex(canonicalJson(
    tamperedEarlyHistory.replacementHistory,
  ));
  rehashSampleManifest(tamperedEarlyHistory);
  assert.throws(
    () => deriveSamplePseudonymMappingV4(tamperedEarlyHistory),
    /replacement.*history.*prefix|authority.*history.*append|superseded.*history/iu,
    "provider-side manifest validation must reject a re-signed non-latest replacement history mutation",
  );
  assert.throws(() => buildSampleBoundProtectedItemEnvelopeV4({
    item: secondEnvelopeItem,
    sampleManifest: tamperedEarlyHistory,
  }), /replacement.*history.*prefix|authority.*history.*append|superseded.*history/iu);
  assert.throws(() => buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: tamperedEarlyHistory,
    frozenAt: "2026-08-25T05:08:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  }), /replacement.*history.*prefix|superseded.*history|full-frame recomputation/iu);
  assert.equal(validateSampleAgainstFrame({
    ...bundle,
    sampleManifest: tamperedEarlyHistory,
    c0RandomAudit: secondC0,
  }).some((error) => /replacement.*history|sample manifest.*recomputation|differs from full-frame/iu.test(error)), true);

  const tamperedEarlyExclusion = structuredClone(secondReplacement.sampleManifest);
  tamperedEarlyExclusion.registeredPreResultExclusions[0].registeredAt = "2026-08-25T05:04:59.999Z";
  rehashSampleManifest(tamperedEarlyExclusion);
  assert.throws(
    () => deriveSamplePseudonymMappingV4(tamperedEarlyExclusion),
    /exclusion history.*exact.*append|superseded.*exclusion/iu,
  );
  assert.throws(() => buildSampleBoundProtectedItemEnvelopeV4({
    item: secondEnvelopeItem,
    sampleManifest: tamperedEarlyExclusion,
  }), /exclusion history.*exact.*append|superseded.*exclusion/iu);
  assert.throws(() => buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: tamperedEarlyExclusion,
    frozenAt: "2026-08-25T05:08:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  }), /exclusion history.*exact.*append|superseded.*exclusion|immutable evidence identity|full-frame recomputation/iu);
  assert.equal(validateSampleAgainstFrame({
    ...bundle,
    sampleManifest: tamperedEarlyExclusion,
    c0RandomAudit: secondC0,
  }).some((error) => /exclusion history|immutable evidence identity|sample manifest recomputation/iu.test(error)), true);

  const tamperedLatestRemoval = structuredClone(secondReplacement.sampleManifest);
  tamperedLatestRemoval.replacementHistory.at(-1).removedItemId = replacement.sampleManifest.replacementHistory[0].removedItemId;
  tamperedLatestRemoval.replacementAuthorityHistoryRootHash = sha256Hex(canonicalJson(
    tamperedLatestRemoval.replacementHistory,
  ));
  rehashSampleManifest(tamperedLatestRemoval);
  assert.throws(
    () => deriveSamplePseudonymMappingV4(tamperedLatestRemoval),
    /latest history removal fields|uniquely derived selected-row transition/iu,
    "the latest audit fields must match both the appended exclusion and the unique selected-row delta",
  );
  const authorityStripped = structuredClone(replacement.sampleManifest);
  delete authorityStripped.replacementAuthorization;
  delete authorityStripped.replacementAuthorizationHash;
  delete authorityStripped.replacementAuthorityHistoryRootHash;
  for (const field of [
    "trustedExclusionEvidenceInventoryHash",
    "beforeExecutionLedgerHash",
    "afterExecutionLedgerHash",
    "replacementReceiptHash",
    "replacementAuthorizationHash",
  ]) delete authorityStripped.replacementHistory.at(-1)[field];
  rehashSampleManifest(authorityStripped);
  assert.throws(() => buildC0RandomAuditV3({
    frameRows: bundle.frameRows,
    runtimeExtractionSnapshot: bundle.runtimeExtractionSnapshot,
    cleanSourceEvidence: bundle.cleanSourceEvidence,
    frameRegistration: bundle.frameRegistration,
    clusterAudit: bundle.clusterAudit,
    sampleManifest: authorityStripped,
    frozenAt: "2026-08-25T05:06:00.000Z",
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: LINEAGE_RULE_APPROVAL_HASH,
  }), /replacement.*authorization/iu);
  assert.equal(validateSampleAgainstFrame({
    ...bundle,
    sampleManifest: authorityStripped,
    c0RandomAudit: replacementC0,
  }).some((error) => /replacement.*authorization/iu.test(error)), true);

  const ledgerWithEvent = (eventType) => {
    const entry = withHash({
      schemaVersion: "SampleExecutionLedgerEntryV1",
      sequenceNumber: 1,
      eventType,
      itemId: removed.itemId,
      itemHash: removed.itemHash,
      eventArtifactHash: localHash(`event:${eventType}`),
      occurredAt: "2026-08-25T05:04:00.000Z",
    }, "entryHash");
    return buildSampleExecutionLedgerV4({
      sampleManifestHash: bundle.sampleManifest.sampleManifestHash,
      previousExecutionLedgerHash: null,
      ...recorderRoots,
      recordedAt: "2026-08-25T05:04:30.000Z",
      entries: [entry],
    });
  };
  for (const eventType of ["PROVIDER_ATTEMPT", "REFERENCE_LABEL_RECORDED", "EVALUATION_RESULT_RECORDED"]) {
    const ledger = ledgerWithEvent(eventType);
    assert.throws(() => buildPreResultReplacementV3({
      ...replacementInput,
      beforeExecutionLedger: ledger,
      trustedBeforeExecutionLedgerHash: ledger.executionLedgerHash,
    }), /after any provider attempt, label, or result|pre-result/iu);
  }
  const falsePriorExclusionLedger = ledgerWithEvent("PRE_RESULT_REPLACEMENT_REGISTERED");
  assert.throws(() => buildPreResultReplacementV3({
    ...replacementInput,
    beforeExecutionLedger: falsePriorExclusionLedger,
    trustedBeforeExecutionLedgerHash: falsePriorExclusionLedger.executionLedgerHash,
  }), /execution ledger.*sample replacement history|initial sample.*empty ledger|append-only.*predecessor/iu,
  "an initial sample cannot acquire a caller-authored prior replacement event");
  assert.throws(() => buildPreResultExclusionEvidenceV4({
    exclusionSourceArtifact: egressDecision,
    egressDecisionInput,
    exclusionCode: "NON_CA_TRACK",
    reasonCode: "RIGHTS_EXPLICITLY_DENIED",
    registeredAt: "2026-08-25T05:05:00.000Z",
    exclusionRunnerReceipt: exclusionEvidence.exclusionRunnerReceipt,
  }), /egress or serialization/iu);
  const earlyExclusionEvidence = makeExclusionEvidence("2026-08-25T05:02:59.000Z");
  const earlyExclusionEvidenceInventory = buildPreResultExclusionEvidenceInventoryV4({
    exclusionEvidences: [earlyExclusionEvidence],
    recordedAt: "2026-08-25T05:02:59.750Z",
  });
  assert.throws(() => buildPreResultReplacementV3({
    ...replacementInput,
    exclusionEvidence: earlyExclusionEvidence,
    exclusionEvidenceInventory: earlyExclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash: earlyExclusionEvidenceInventory.exclusionEvidenceInventoryHash,
  }), /after the superseded sample|replacement registration chronology/iu);

  const futureExclusionEvidenceInventory = buildPreResultExclusionEvidenceInventoryV4({
    exclusionEvidences: [exclusionEvidence],
    recordedAt: "2026-08-25T05:05:02.000Z",
  });
  assert.throws(() => buildPreResultReplacementV3({
    ...replacementInput,
    exclusionEvidenceInventory: futureExclusionEvidenceInventory,
    trustedExclusionEvidenceInventoryHash: futureExclusionEvidenceInventory.exclusionEvidenceInventoryHash,
  }), /inventory.*new freeze|runner.*inventory.*new freeze|replacement.*chronology/iu,
  "the trusted exclusion inventory must be recorded before the new manifest freezes");

  const futureBeforeExecutionLedger = buildSampleExecutionLedgerV4({
    sampleManifestHash: bundle.sampleManifest.sampleManifestHash,
    previousExecutionLedgerHash: null,
    ...recorderRoots,
    recordedAt: "2026-08-25T05:05:02.000Z",
    entries: [],
  });
  assert.throws(() => buildPreResultReplacementV3({
    ...replacementInput,
    beforeExecutionLedger: futureBeforeExecutionLedger,
    trustedBeforeExecutionLedgerHash: futureBeforeExecutionLedger.executionLedgerHash,
  }), /ledger.*chronology|before.*ledger.*new.*freeze|terminate at the new manifest freeze/iu,
  "the trusted before-ledger snapshot must strictly precede the new manifest freeze");
});

test("V4 frame freeze and full sample verification require the trusted fine-grained lineage-rule approval", () => {
  const fixture = buildFullSampleContractFixture();
  assert.match(fixture.frameRegistration.lineageRuleApprovalHash, /^[a-f0-9]{64}$/u);
  assert.match(fixture.frameRegistration.lineageRuleHash, /^[a-f0-9]{64}$/u);
  assert.deepEqual(validateSampleAgainstFrame(fixture), []);

  const missing = structuredClone(fixture);
  delete missing.frameRegistration.lineageRuleApprovalHash;
  missing.frameRegistration.frameRegistrationHash = calculateArtifactHash(missing.frameRegistration, "frameRegistrationHash");
  assert.equal(validateSampleAgainstFrame(missing).some((error) => /lineage.*approval/iu.test(error)), true);

  const untrusted = structuredClone(fixture);
  untrusted.trustedLineageRuleApprovalHash = "f".repeat(64);
  assert.equal(validateSampleAgainstFrame(untrusted).some((error) => /lineage.*approval/iu.test(error)), true);
});

test("V4 frame freeze binds route, dependency-closure, and scanner completion times before registration freeze", () => {
  const bundle = makeBundle();
  assert.equal(bundle.frameFreezeEvidence.routeExecutionCompletedAt, "2026-08-25T04:52:00.000Z");
  assert.equal(bundle.frameFreezeEvidence.dependencyClosureCompletedAt, "2026-08-25T04:55:00.000Z");
  assert.equal(bundle.frameFreezeEvidence.scannerExecutionCompletedAt, "2026-08-25T04:59:30.000Z");
  assert.equal(bundle.frameRegistration.routeExecutionCompletedAt, bundle.frameFreezeEvidence.routeExecutionCompletedAt);
  assert.equal(bundle.frameRegistration.dependencyClosureCompletedAt, bundle.frameFreezeEvidence.dependencyClosureCompletedAt);
  assert.equal(bundle.frameRegistration.scannerExecutionCompletedAt, bundle.frameFreezeEvidence.scannerExecutionCompletedAt);

  assert.throws(() => makeBundle(Array(9).fill(12), {
    timestamps: {
      sourceEnumeratedAt: "2026-08-25T04:55:30.000Z",
      runtimeExtractedAt: "2026-08-25T04:56:30.000Z",
      sourceVerifiedAt: "2026-08-25T04:57:30.000Z",
      clusterAuditedAt: "2026-08-25T04:58:00.000Z",
      frameFrozenAt: "2026-08-25T04:59:15.000Z",
      sampleFrozenAt: "2026-08-25T05:00:00.000Z",
      c0FrozenAt: "2026-08-25T05:01:00.000Z",
    },
  }), /route|dependency|scanner|completion.*precede.*frame freeze/iu);
});
