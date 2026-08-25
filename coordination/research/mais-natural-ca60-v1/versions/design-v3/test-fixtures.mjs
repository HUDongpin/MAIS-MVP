import { createHash } from "node:crypto";

import { calculateArtifactHash } from "../design-v2/design-contract.mjs";
import {
  DESIGN_ID,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  STRATA,
  buildC0RandomAuditV3,
  buildCleanSourceEvidenceV3,
  buildClusterAuditV3,
  buildFrameRegistrationV3,
  buildRuntimeExtractionSnapshotV3,
  buildRuntimeSourceEnumerationReceiptV1,
  buildSampleManifestV3,
  calculateExactDuplicateGroupIdV3,
  calculateItemContentHashV3,
  calculateLineageKeyHashV3,
  calculateNormalizedPromptHashV3,
  calculateRuntimeProjectionHashV3,
  calculateTemplateSkeletonHashV3,
  materializeFrameSamplingWeightsV3,
} from "./sample-contract.mjs";

export const REGISTRATION_HASH = "3".repeat(64);
export const RUNTIME_CONFIG_HASH = "4".repeat(64);
export const SOURCE_COMMIT = "5".repeat(40);
export const CLUSTERING_ALGORITHM_HASH = "6".repeat(64);
export const FROZEN_AT = "2026-08-25T05:00:00.000Z";
export const EXTRACTOR_IMPLEMENTATION_HASH = "7".repeat(64);
export const EXTRACTOR_RUNNER_COMMIT = "8".repeat(40);
export const EXTRACTOR_RUNNER_HASH = "9".repeat(64);
export const RAW_SOURCE_EVIDENCE_ARTIFACT_ROOT_HASH = "a".repeat(64);
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
  registrationHash = REGISTRATION_HASH,
  runtimeConfigHash = RUNTIME_CONFIG_HASH,
  sourceCommit = SOURCE_COMMIT,
  frameFrozenAt = FROZEN_AT,
}) {
  const protectedPrompt = `Solve the protected fixture token ${localHash(itemId).slice(0, 16)}.`;
  const row = {
    schemaVersion: "SamplingFrameRowV2",
    designId: DESIGN_ID,
    registrationHash,
    frameFrozenAt,
    itemId,
    canonicalTopic: `topic-${responseForm}-${difficulty}`,
    itemHash: null,
    runtimeConfigHash,
    sourceCommit,
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    grade: "5",
    sourceModuleHash: localHash(`source-module:${itemId}`),
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
    prompt: protectedPrompt,
    options: responseForm === "multiple-choice" ? ["1", "2", "3"] : null,
    storedAnswer: "2",
    acceptedAnswers: ["2"],
    explanation: "Fixture-only explanation.",
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
        registrationHash,
        runtimeConfigHash,
        sourceCommit,
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
      registrationHash,
      runtimeConfigHash,
      sourceCommit,
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
    registrationHash,
    runtimeConfigHash,
    sourceCommit,
    frameFrozenAt,
  }));
  return materializeFrameSamplingWeightsV3(rows, registrationHash);
}

export function makeRuntimeSourceEnumerationReceipt(frameRows, {
  registrationHash = frameRows[0]?.registrationHash ?? REGISTRATION_HASH,
  runtimeConfigHash = frameRows[0]?.runtimeConfigHash ?? RUNTIME_CONFIG_HASH,
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
      ["1", "fixture-source-runtime-hidden", "SOURCE_EXCLUDED_RUNTIME_NOT_VISIBLE", "RUNTIME_NOT_VISIBLE"],
      ["2", "fixture-source-synthetic", "SOURCE_EXCLUDED_SYNTHETIC_TEST_CANDIDATE_ONLY", "SYNTHETIC_TEST_CANDIDATE_ONLY"],
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
  const frameRows = makeFrameRows(capacities, {
    crossCell,
    registrationHash,
    runtimeConfigHash,
    frameFrozenAt: clusterAuditedAt,
  });
  const runtimeSourceEnumerationReceipt = makeRuntimeSourceEnumerationReceipt(frameRows, {
    registrationHash,
    runtimeConfigHash,
    enumeratedAt: sourceEnumeratedAt,
  });
  const runtimeExtractionSnapshot = buildRuntimeExtractionSnapshotV3({
    frameRows,
    expectedInventoryLeaves: runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger: [],
    registrationHash,
    runtimeConfigHash,
    sourceCommit: SOURCE_COMMIT,
    extractedAt: runtimeExtractedAt,
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
    runtimeConfigHash,
    sourceCommit: SOURCE_COMMIT,
    frozenAt: frameFrozenAt,
  });
  const sampleManifest = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: sampleFrozenAt,
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
