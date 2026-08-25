import {
  calculateArtifactHash,
  canonicalJson,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs";
import {
  jcsHash,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  validateOwnerFrameRightsLineageDecisionV1,
} from "../../research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/build-owner-decision.mjs";
import {
  ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  DESIGN_ID,
  LINEAGE_RULE_HASH_V4,
  RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  V4_LOCALE_POLICY,
  buildC0RandomAuditV3,
  buildCleanSourceEvidenceV3,
  buildClusterAuditV3,
  buildFrameFreezeEvidenceV4,
  buildFrameItemEgressDecisionsV5,
  buildFrameRegistrationV3,
  buildItemEgressScreenEvidenceV4,
  buildRightsEgressDecisionTableV4,
  buildRuntimeConfigEvidenceV4,
  buildRuntimeExtractionSnapshotV3,
  buildRuntimeSourceEnumerationReceiptV1,
  buildSampleManifestV3,
  buildScannerExecutionReceiptInventoryV4,
  buildScannerExecutionReceiptV4,
  buildSourceModuleManifestV4,
  buildThreeRouteSourceParityEvidenceV4,
  calculateExactDuplicateGroupIdV3,
  calculateItemContentHashV4,
  calculateLineageKeyHashV3,
  calculateNormalizedPromptHashV3,
  calculateRuntimeProjectionHashV3,
  calculateTemplateSkeletonHashV3,
  canonicalizeStrictItemJsonV4,
  materializeFrameSamplingWeightsV3,
  validateFreezeTimingV3,
  validateSampleAgainstFrame,
} from "./sample-contract-v5.mjs";
import {
  buildFrameRightsPolicyV5,
  runCaliforniaFrameReadinessV5,
  scanNaturalItemV5,
} from "./frame-readiness-v5";
import {
  validateV5SourceEnumerationHashErratum,
} from "./source-enumeration-hash-erratum-v5.mjs";

const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const ACTIVATION_RECEIPT_HASH = "086c84b661ba9f9720f6afea8c4e0fcd50e3c4d0247da318f23235c52c3d2442";
const OWNER_DECISION_REQUEST_HASH = "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78";
const OWNER_DECISION_RECEIPT_HASH = "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0";
const APPROVED_READINESS_RECEIPT_HASH = "079055365655fa51f2d9d60b98d6c405cac323382869b487f1a6540af9edcd7d";
const A22_ENVIRONMENT_RECEIPT_HASH = "4cf55806ab1feaf41679b12785fc67d84c085317928c9cb7abdbf401869c4b99";
const A11_READINESS_REVIEW_HASH = "8ab31d8269558a9544566e45a90afc8538c35e35567a46a5b38ea9a6d91c6657";
const APPROVED_RUNTIME_CONFIG_HASH = "56848171181749710fc351473c23868b62a903ccbf2cdaa8f7354df6798f36df";
const APPROVED_RUNTIME_INVENTORY_ROOT = "4c6b82e4b2f45ec2b8c9b7d1a1cde64c379c46c49e72a025152e3a5301df7528";
const APPROVED_HOMOLOGY_ROOT = "a4016d0680935b8a5eb2abbf66c2fffcd8ffb47cee689ffd98a4740a04131b31";
const APPROVED_POTENTIAL_CONTENT_ROOT = "58de40eb4db30ec717aa0758fb3aba8b88e63a2e66f24941fcbc47c9193e9ea3";
const APPROVED_POTENTIAL_CLUSTER_SET_ROOT = "58da62ff9d7d17819dd93672ecf761362554d084b9d030f158dfd4932cf7e9d9";
const POTENTIAL_EGRESS_BATCH = "us-ca-k5-knowledge-point-practice-v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OID = /^[0-9a-f]{40}$/u;

type JsonRecord = Record<string, any>;

export type FormalFreezeImplementationHashesV5 = {
  converterImplementationHash: string;
  normalizationImplementationHash: string;
  publicProjectionImplementationHash: string;
  dependencyClosureExtractorImplementationHash: string;
  scannerImplementationHash: string;
  clusteringAlgorithmHash: string;
  extractorImplementationHash: string;
};

export type FormalFreezeSourceModuleFileV5 = {
  repoRelativePath: string;
  gitBlobOid: string;
};

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !SHA256.test(value)) throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
}

function assertGitOid(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !GIT_OID.test(value)) throw new TypeError(`${field} must be a lowercase 40-hex Git object ID`);
}

function assertCanonicalTimestamp(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new TypeError(`${field} must be canonical RFC3339 UTC with milliseconds`);
  }
}

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function atSeconds(startedAt: string, seconds: number) {
  return new Date(Date.parse(startedAt) + seconds * 1_000).toISOString();
}

function strictContentHash(value: unknown) {
  return sha256Hex(canonicalJson(canonicalizeStrictItemJsonV4(value)));
}

function withArtifactHash<T extends JsonRecord, F extends string>(body: T, field: F) {
  return Object.freeze({ ...body, [field]: calculateArtifactHash(body, field) }) as Readonly<T & Record<F, string>>;
}

function nonemptyString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizedSourceIds(rawQuestion: JsonRecord) {
  const sourceIds = Array.isArray(rawQuestion.sourceIds)
    ? [...new Set(rawQuestion.sourceIds.filter((value): value is string => typeof value === "string" && value.length > 0))]
      .sort(codePointCompare)
    : [];
  if (sourceIds.length === 0) throw new TypeError(`runtime item ${String(rawQuestion.id)} has no source IDs`);
  return sourceIds;
}

function countsBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) => ({ value, count }))
    .sort((left, right) => codePointCompare(left.value, right.value));
}

function hasVisualOrAsset(question: JsonRecord) {
  return question.diagram !== null && question.diagram !== undefined
    || Array.isArray(question.questionAssets) && question.questionAssets.length > 0
    || question.questionAssets !== null && question.questionAssets !== undefined && !Array.isArray(question.questionAssets);
}

function lineageFor(rawQuestion: JsonRecord, question: JsonRecord, metadata: JsonRecord | null) {
  const batchId = nonemptyString(rawQuestion.batch) ?? nonemptyString(metadata?.batch);
  const clusterId = nonemptyString(rawQuestion.clusterId);
  const generationTemplate = nonemptyString(rawQuestion.generationTemplate);
  const sourceLessonSlug = nonemptyString(rawQuestion.sourceLessonSlug);
  let lineageKind: "K5" | "G6_12" | "CCSS" | null = null;
  if (batchId === "us-ca-k5-knowledge-point-practice-v1" && clusterId !== null) lineageKind = "K5";
  if (batchId === "us-ca-g6-g12-v2" && generationTemplate !== null) lineageKind = "G6_12";
  if (batchId === "ccss-textbook-practice-v1" && sourceLessonSlug !== null) lineageKind = "CCSS";
  return {
    lineageKind,
    packageId: nonemptyString(rawQuestion.sourcePackageId),
    batchId,
    clusterId,
    sourceClusterId: clusterId,
    generationTemplate,
    sourceLessonSlug,
    sourceModule: nonemptyString(rawQuestion.sourceModule),
    topicId: String(question.topicId),
  };
}

function formalItemPayload(question: JsonRecord) {
  return {
    prompt: question.prompt,
    options: question.options ?? null,
    answer: question.answer ?? null,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanation: question.explanation ?? null,
  };
}

function publicQuestion(question: JsonRecord) {
  return canonicalizeStrictItemJsonV4({
    id: question.id,
    curriculumTrack: question.curriculumTrack,
    curriculumProfile: question.curriculumProfile,
    region: question.region,
    publisher: question.publisher,
    canonicalTopicId: question.canonicalTopicId ?? question.topicId,
    grade: question.grade,
    topicId: question.topicId,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
    diagram: question.diagram,
    questionAssets: question.questionAssets,
  });
}

function routeRunnerReceipt({
  schemaVersion,
  implementationHash,
  sourceCommit,
  runnerCommit,
  runnerHash,
  executedAt,
  entries,
  extraRoots,
}: {
  schemaVersion: string;
  implementationHash: string;
  sourceCommit: string;
  runnerCommit: string;
  runnerHash: string;
  executedAt: string;
  entries: JsonRecord[];
  extraRoots: JsonRecord;
}) {
  return withArtifactHash({
    schemaVersion,
    implementationHash,
    sourceCommit,
    runnerCommit,
    runnerHash,
    executedAt,
    entries,
    entryRootHash: sha256Hex(canonicalJson(entries)),
    ...extraRoots,
  }, "runnerReceiptHash");
}

function buildSourceParityInput({
  records,
  frameRows,
  sourceCommit,
  runnerCommit,
  runnerHash,
  repositoryIdentity,
  implementationHashes,
  timeline,
}: {
  records: JsonRecord[];
  frameRows: JsonRecord[];
  sourceCommit: string;
  runnerCommit: string;
  runnerHash: string;
  repositoryIdentity: string;
  implementationHashes: FormalFreezeImplementationHashesV5;
  timeline: JsonRecord;
}) {
  const rawItems = records.map((record) => canonicalizeStrictItemJsonV4(record.rawQuestion));
  const convertedFullItems = records.map((record) => canonicalizeStrictItemJsonV4(record.convertedQuestion));
  const normalizedFullItems = structuredClone(frameRows);
  const gradePublicItems = Object.fromEntries(RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [
    grade,
    records.filter((record) => record.grade === grade)
      .map((record) => canonicalizeStrictItemJsonV4(record.publicQuestion)),
  ]));

  const rawRootHash = strictContentHash(rawItems);
  const convertedFullRootHash = strictContentHash(convertedFullItems);
  const normalizedFullRootHash = strictContentHash(normalizedFullItems);
  const gradePublicUnion = RUNTIME_SOURCE_ENUMERATION_GRADES.flatMap((grade) => (
    gradePublicItems[grade].map((item: JsonRecord) => ({ grade, publicItem: item }))
  ));
  const gradePublicUnionRootHash = strictContentHash(gradePublicUnion);
  const gradeProjectionInvocations = RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
    grade,
    itemCount: gradePublicItems[grade].length,
    publicContentRootHash: strictContentHash(gradePublicItems[grade]),
  }));
  const gradeProjectionInvocationRootHash = strictContentHash(gradeProjectionInvocations);
  const rawById = new Map(rawItems.map((item: JsonRecord) => [item.id, item]));
  const fullById = new Map(convertedFullItems.map((item: JsonRecord) => [item.id, item]));
  const normalizedById = new Map<string, JsonRecord>(normalizedFullItems.map((item: JsonRecord) => [item.itemId, item]));
  const publicById = new Map<string, { grade: string; publicItem: JsonRecord }>(
    gradePublicUnion.map(({ grade, publicItem }) => [publicItem.id, { grade, publicItem }]),
  );
  const sortedItemIds = [...fullById.keys()].sort(codePointCompare);
  const converterEntries = sortedItemIds.map((itemId) => ({
    itemId,
    rawContentHash: strictContentHash(rawById.get(itemId)),
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
  }));
  const normalizationEntries = sortedItemIds.map((itemId) => ({
    itemId,
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
    normalizedItemHash: normalizedById.get(itemId)!.itemHash,
  }));
  const publicProjectionEntries = sortedItemIds.map((itemId) => ({
    itemId,
    grade: publicById.get(itemId)!.grade,
    convertedFullContentHash: strictContentHash(fullById.get(itemId)),
    publicContentHash: strictContentHash(publicById.get(itemId)!.publicItem),
  }));
  const converterRunnerReceipt = routeRunnerReceipt({
    schemaVersion: "RawToRuntimeQuestionConverterRunnerReceiptV1",
    implementationHash: implementationHashes.converterImplementationHash,
    sourceCommit,
    runnerCommit,
    runnerHash,
    executedAt: timeline.converterExecutedAt,
    entries: converterEntries,
    extraRoots: { rawRootHash, convertedFullRootHash },
  });
  const normalizationRunnerReceipt = routeRunnerReceipt({
    schemaVersion: "RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1",
    implementationHash: implementationHashes.normalizationImplementationHash,
    sourceCommit,
    runnerCommit,
    runnerHash,
    executedAt: timeline.normalizationExecutedAt,
    entries: normalizationEntries,
    extraRoots: { convertedFullRootHash, normalizedFullRootHash },
  });
  const publicProjectionRunnerReceipt = routeRunnerReceipt({
    schemaVersion: "RuntimeQuestionToPublicQuestionRunnerReceiptV1",
    implementationHash: implementationHashes.publicProjectionImplementationHash,
    sourceCommit,
    runnerCommit,
    runnerHash,
    executedAt: timeline.publicProjectionExecutedAt,
    entries: publicProjectionEntries,
    extraRoots: { convertedFullRootHash, gradePublicUnionRootHash, gradeProjectionInvocationRootHash },
  });
  const routeExecutionTrustDescriptor = {
    schemaVersion: "RouteExecutionTrustDescriptorV2",
    repositoryIdentity,
    sourceCommit,
    converter: {
      implementationHash: converterRunnerReceipt.implementationHash,
      runnerCommit,
      runnerHash,
      runnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
      rawRootHash,
      convertedFullRootHash,
    },
    normalization: {
      implementationHash: normalizationRunnerReceipt.implementationHash,
      runnerCommit,
      runnerHash,
      runnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
      convertedFullRootHash,
      normalizedFullRootHash,
    },
    publicProjection: {
      implementationHash: publicProjectionRunnerReceipt.implementationHash,
      runnerCommit,
      runnerHash,
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
      converterImplementationHash: converterRunnerReceipt.implementationHash,
      converterRunnerReceiptHash: converterRunnerReceipt.runnerReceiptHash,
      normalizationImplementationHash: normalizationRunnerReceipt.implementationHash,
      normalizationRunnerReceiptHash: normalizationRunnerReceipt.runnerReceiptHash,
      publicProjectionImplementationHash: publicProjectionRunnerReceipt.implementationHash,
      publicProjectionRunnerReceiptHash: publicProjectionRunnerReceipt.runnerReceiptHash,
    },
    mapFirstWinsUsed: false,
  };
}

function buildTimeline(startedAt: string) {
  assertCanonicalTimestamp(startedAt, "startedAt");
  return Object.freeze({
    startedAt,
    converterExecutedAt: atSeconds(startedAt, 0),
    normalizationExecutedAt: atSeconds(startedAt, 1),
    publicProjectionExecutedAt: atSeconds(startedAt, 2),
    dependencyClosureExecutedAt: atSeconds(startedAt, 3),
    scannerExecutedAt: atSeconds(startedAt, 4),
    scannerInventoryRecordedAt: atSeconds(startedAt, 5),
    sourceEnumeratedAt: atSeconds(startedAt, 6),
    runtimeExtractedAt: atSeconds(startedAt, 7),
    cleanSourceVerifiedAt: atSeconds(startedAt, 8),
    clusterAuditedAt: atSeconds(startedAt, 9),
    frameFrozenAt: atSeconds(startedAt, 10),
    sampleFrozenAt: atSeconds(startedAt, 11),
    c0FrozenAt: atSeconds(startedAt, 12),
  });
}

function assertAuthority(ownerDecisionReceipt: JsonRecord, sourceEnumerationHashErratum: JsonRecord, startedAt: string) {
  const ownerErrors = validateOwnerFrameRightsLineageDecisionV1(ownerDecisionReceipt);
  if (ownerErrors.length > 0 || ownerDecisionReceipt.ownerDecisionReceiptHash !== OWNER_DECISION_RECEIPT_HASH) {
    throw new TypeError(`owner decision failed closed: ${ownerErrors.join("; ") || "unexpected receipt hash"}`);
  }
  if (ownerDecisionReceipt.ownerDecisionRequestHash !== OWNER_DECISION_REQUEST_HASH
    || ownerDecisionReceipt.readinessReceiptHash !== APPROVED_READINESS_RECEIPT_HASH
    || ownerDecisionReceipt.a22EnvironmentReceiptHash !== A22_ENVIRONMENT_RECEIPT_HASH
    || ownerDecisionReceipt.a11IndependentReadinessReviewHash !== A11_READINESS_REVIEW_HASH
    || ownerDecisionReceipt.frameFreezeAuthorized !== true
    || ownerDecisionReceipt.sampleFreezeAuthorized !== true
    || ownerDecisionReceipt.providerExecutionAuthorized !== false
    || ownerDecisionReceipt.credentialReadAuthorized !== false
    || ownerDecisionReceipt.questionEgressAuthorizedNow !== false
    || ownerDecisionReceipt.tokenAuthorizationCreated !== false
    || ownerDecisionReceipt.attemptAuthorizationCreated !== false
    || ownerDecisionReceipt.usdAuthorizationCreated !== false) {
    throw new TypeError("owner decision scope is not the exact frame/sample-only authority");
  }
  const erratumErrors = validateV5SourceEnumerationHashErratum(sourceEnumerationHashErratum);
  if (erratumErrors.length > 0) throw new TypeError(`source-enumeration erratum failed closed: ${erratumErrors.join("; ")}`);
  if (Date.parse(startedAt) <= Date.parse(ownerDecisionReceipt.issuedAt)
    || Date.parse(startedAt) <= Date.parse(sourceEnumerationHashErratum.recordedAt)) {
    throw new TypeError("formal freeze must start strictly after owner approval and the append-only hash erratum");
  }
}

function assertImplementationHashes(hashes: FormalFreezeImplementationHashesV5) {
  for (const [field, value] of Object.entries(hashes)) assertSha256(value, field);
}

export async function runCaliforniaFormalFreezeV5({
  sourceCommit,
  runnerCommit,
  runnerHash,
  repositoryIdentity,
  sourceModuleFiles,
  sourceClosureParityHash,
  approvedReadinessSourceCommit,
  ownerDecisionReceipt,
  sourceEnumerationHashErratum,
  implementationHashes,
  startedAt,
}: {
  sourceCommit: string;
  runnerCommit: string;
  runnerHash: string;
  repositoryIdentity: string;
  sourceModuleFiles: FormalFreezeSourceModuleFileV5[];
  sourceClosureParityHash: string;
  approvedReadinessSourceCommit: string;
  ownerDecisionReceipt: JsonRecord;
  sourceEnumerationHashErratum: JsonRecord;
  implementationHashes: FormalFreezeImplementationHashesV5;
  startedAt: string;
}) {
  assertGitOid(sourceCommit, "sourceCommit");
  assertGitOid(runnerCommit, "runnerCommit");
  assertGitOid(approvedReadinessSourceCommit, "approvedReadinessSourceCommit");
  assertSha256(runnerHash, "runnerHash");
  assertSha256(sourceClosureParityHash, "sourceClosureParityHash");
  if (sourceCommit !== runnerCommit) throw new TypeError("formal freeze requires sourceCommit to equal the clean exact-SHA runnerCommit");
  if (typeof repositoryIdentity !== "string" || repositoryIdentity.length === 0) throw new TypeError("repositoryIdentity is required");
  if (!Array.isArray(sourceModuleFiles) || sourceModuleFiles.length === 0) throw new TypeError("sourceModuleFiles are required");
  assertImplementationHashes(implementationHashes);
  assertAuthority(ownerDecisionReceipt, sourceEnumerationHashErratum, startedAt);
  const timeline = buildTimeline(startedAt);

  const readiness = await runCaliforniaFrameReadinessV5({
    sourceCommit,
    runnerCommit,
    runnerHash,
    createdAt: timeline.startedAt,
  });
  const readinessReceipt = readiness.receipt;
  if (readinessReceipt.runtimeConfigHash !== APPROVED_RUNTIME_CONFIG_HASH
    || readinessReceipt.runtimeInventoryRootHash !== APPROVED_RUNTIME_INVENTORY_ROOT
    || readinessReceipt.fullFrameHomologyRootHash !== APPROVED_HOMOLOGY_ROOT
    || readinessReceipt.potentialEligibleContentRootHash !== APPROVED_POTENTIAL_CONTENT_ROOT
    || readinessReceipt.potentialEligibleClusterSetHash !== APPROVED_POTENTIAL_CLUSTER_SET_ROOT
    || readinessReceipt.potentialEligibleContentRootHash !== ownerDecisionReceipt.potentialEligibleContentRootHash
    || readinessReceipt.potentialEligibleClusterSetHash !== ownerDecisionReceipt.potentialEligibleClusterSetHash
    || readinessReceipt.rightsPolicyHash !== ownerDecisionReceipt.rightsPolicyHash
    || readinessReceipt.lineageRuleHash !== ownerDecisionReceipt.lineageRuleHash
    || readinessReceipt.frameFailureCount !== 0
    || readinessReceipt.potentialEligibleItemCount !== 482
    || readinessReceipt.potentialEligibleClusterCount !== 106
    || readinessReceipt.providerRequestCount !== 0
    || readinessReceipt.credentialReadCount !== 0
    || readinessReceipt.naturalQuestionEgressCount !== 0) {
    throw new TypeError("formal freeze runtime regeneration drifted from the owner-bound potential-content roots");
  }
  if (canonicalJson(readiness.rightsPolicy) !== canonicalJson(buildFrameRightsPolicyV5())) {
    throw new TypeError("formal freeze rights policy drifted from the exact V5 policy");
  }

  const records = [...readiness.protectedArtifacts.itemRecords]
    .map((record) => record as JsonRecord)
    .sort((left, right) => codePointCompare(String(left.itemId), String(right.itemId)));
  const homologyAudit = readiness.protectedArtifacts.homologyAudit as JsonRecord;
  const assignmentByItem = new Map<string, JsonRecord>(
    homologyAudit.itemAssignments.map((assignment: JsonRecord) => [String(assignment.itemId), assignment]),
  );
  const normalizedFiles = sourceModuleFiles.map((file) => ({
    repoRelativePath: file.repoRelativePath,
    gitBlobOid: file.gitBlobOid.toLowerCase(),
  })).sort((left, right) => codePointCompare(left.repoRelativePath, right.repoRelativePath));
  const sourceModuleHash = sha256Hex(canonicalJson(normalizedFiles));
  const allowedSourceIds = new Set(ownerDecisionReceipt.allowedSourceIds as string[]);
  const deniedSourceIds = new Set(ownerDecisionReceipt.deniedSourceIds as string[]);
  const observedSourceIds = new Set<string>();

  const draftRows: JsonRecord[] = [];
  const formalScreens: JsonRecord[] = [];
  for (const record of records) {
    const rawQuestion = record.rawQuestion as JsonRecord;
    const question = (record.attemptQuestion ?? record.convertedQuestion) as JsonRecord;
    const metadata = record.generationMetadata as JsonRecord | null;
    const itemId = String(record.itemId);
    const sourceIds = normalizedSourceIds(rawQuestion);
    sourceIds.forEach((sourceId) => observedSourceIds.add(sourceId));
    for (const sourceId of sourceIds) {
      if (!allowedSourceIds.has(sourceId) && !deniedSourceIds.has(sourceId)) {
        throw new TypeError(`owner source-ID scope does not classify runtime source ${sourceId}`);
      }
    }
    const lineage = lineageFor(rawQuestion, question, metadata);
    const answer = typeof question.answer === "string" ? question.answer : null;
    const acceptedAnswers = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers : [];
    const options = Array.isArray(question.options) ? question.options : null;
    const explanation = question.explanation ?? null;
    const assignment = assignmentByItem.get(itemId);
    if (!assignment || typeof assignment.homologyClusterId !== "string") {
      throw new TypeError(`full-frame homology assignment is missing for ${itemId}`);
    }
    const itemContent = {
      itemId,
      sourceCommit,
      sourceIds,
      region: "CALIFORNIA",
      curriculumProfile: "US_CA_MATH",
      grade: question.grade,
      canonicalTopic: question.canonicalTopicId ?? question.topicId,
      responseForm: question.type,
      difficulty: question.difficulty,
      sourceModuleHash,
      prompt: question.prompt,
      options,
      answer,
      storedAnswer: answer,
      acceptedAnswers,
      explanation,
      diagram: question.diagram ?? null,
      questionAssets: question.questionAssets ?? null,
      localePolicy: V4_LOCALE_POLICY,
      topic: question.topic,
      rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
      lineageKind: lineage.lineageKind,
      batchId: lineage.batchId,
      clusterId: lineage.clusterId,
      topicId: lineage.topicId,
      generationTemplate: lineage.generationTemplate,
      sourceLessonSlug: lineage.sourceLessonSlug,
    };
    const itemHash = calculateItemContentHashV4(itemContent);
    const screen = scanNaturalItemV5({ itemId, itemHash, payload: formalItemPayload(question) }) as JsonRecord;
    formalScreens.push(screen);
    const sourceAuthorized = lineage.batchId === POTENTIAL_EGRESS_BATCH
      && sourceIds.every((sourceId) => allowedSourceIds.has(sourceId));
    const eligible = sourceAuthorized && !hasVisualOrAsset(question) && screen.passed === true;
    const preweighted: JsonRecord = {
      schemaVersion: "SamplingFrameRowV2",
      designId: DESIGN_ID,
      registrationHash: REGISTRATION_HASH,
      frameFrozenAt: timeline.clusterAuditedAt,
      ...itemContent,
      itemHash,
      runtimeConfigHash: APPROVED_RUNTIME_CONFIG_HASH,
      topicId: lineage.topicId,
      exactDuplicateGroupId: "",
      homologyClusterId: assignment.homologyClusterId,
      eligible,
      exclusionCode: eligible ? null : "RESTRICTED_EGRESS_CONTENT",
      inclusionProbability: 0,
      analysisWeight: 0,
      analysisWeightPurpose: eligible
        ? "OUTSIDE_SECONDARY_ESTIMAND_NONREPRESENTATIVE"
        : "EXCLUDED_FROM_ALL_ESTIMANDS",
      clusterInclusionProbability: 0,
      representativeSelectionProbability: 0,
      runtimeOrigin: "QUESTION_STORE_AUTHENTICATED_STUDENT_PROJECTION",
      runtimeVisible: true,
      egressEligibility: eligible ? "ELIGIBLE" : "INELIGIBLE_CLOSED_EXCLUSION",
      egressRights: {
        piiScreenPassed: screen.piiFindingCount === 0,
        secretsScreenPassed: screen.secretFindingCount === 0,
        copyrightExternalizationAuthorized: sourceAuthorized,
        providerEgressAllowed: sourceAuthorized,
      },
      serializationStatus: "SERIALIZED",
      answerPresent: answer !== null || acceptedAnswers.length > 0,
      optionsPresent: options !== null && options.length > 0,
      explanationPresent: explanation !== null,
      normalizedPromptHash: "",
      templateSkeletonHash: "",
      lineageKind: lineage.lineageKind,
      lineageKeyHash: null,
      packageId: lineage.packageId,
      batchId: lineage.batchId,
      clusterId: lineage.clusterId,
      sourceClusterId: lineage.sourceClusterId,
      generationTemplate: lineage.generationTemplate,
      sourceLessonSlug: lineage.sourceLessonSlug,
      sourceModule: lineage.sourceModule,
      assignedClusterStratum: null,
      clusterRepresentative: false,
      provenanceType: "RUNTIME_NATURAL_ITEM",
      rowHash: "",
    };
    preweighted.exactDuplicateGroupId = calculateExactDuplicateGroupIdV3(preweighted);
    preweighted.normalizedPromptHash = calculateNormalizedPromptHashV3(preweighted);
    preweighted.templateSkeletonHash = calculateTemplateSkeletonHashV3(preweighted);
    preweighted.lineageKeyHash = calculateLineageKeyHashV3(preweighted);
    preweighted.rowHash = calculateArtifactHash(preweighted, "rowHash");
    draftRows.push(preweighted);
  }
  const frameRows = materializeFrameSamplingWeightsV3(draftRows, REGISTRATION_HASH) as JsonRecord[];
  const eligibleRows = frameRows.filter((row) => row.eligible);
  if (eligibleRows.length !== 482
    || new Set(eligibleRows.map((row) => row.homologyClusterId)).size !== 106) {
    throw new TypeError("formal eligibility does not reproduce the approved 482-item/106-cluster potential population");
  }
  const approvedPotentialIdentityLeaves = records.filter((record) => {
    const row = frameRows.find((candidate) => candidate.itemId === record.itemId);
    return row?.eligible === true;
  }).map((record) => ({
    itemId: record.itemId,
    itemRecordHash: record.recordHash,
    homologyClusterId: assignmentByItem.get(String(record.itemId))!.homologyClusterId,
  })).sort((left, right) => codePointCompare(String(left.itemId), String(right.itemId)));
  if (jcsHash(approvedPotentialIdentityLeaves) !== APPROVED_POTENTIAL_CONTENT_ROOT) {
    throw new TypeError("formal eligible set does not equal the owner-bound potential-content root");
  }
  const eligibleClusterSet = [...new Set(eligibleRows.map((row) => String(row.homologyClusterId)))].sort(codePointCompare);
  if (jcsHash(eligibleClusterSet) !== APPROVED_POTENTIAL_CLUSTER_SET_ROOT) {
    throw new TypeError("formal eligible cluster set does not equal the owner-bound potential-cluster root");
  }

  const batchCounts = countsBy(records.map((record) => String((record.rawQuestion as JsonRecord).batch ?? "UNKNOWN_BATCH")));
  const runtimeConfigInput = {
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: [...RUNTIME_SOURCE_ENUMERATION_GRADES],
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: V4_LOCALE_POLICY,
    activePackStateHash: jcsHash(batchCounts),
    featureFlagStateHash: jcsHash({ californiaRuntimeFeatureFlags: [] }),
  };
  const runtimeConfigEvidence = buildRuntimeConfigEvidenceV4(runtimeConfigInput) as JsonRecord;
  if (runtimeConfigEvidence.runtimeConfigHash !== APPROVED_RUNTIME_CONFIG_HASH) {
    throw new TypeError("formal runtime configuration drifted from the owner-bound readiness run");
  }

  const sourceParityInput = buildSourceParityInput({
    records,
    frameRows,
    sourceCommit,
    runnerCommit,
    runnerHash,
    repositoryIdentity,
    implementationHashes,
    timeline,
  });
  const sourceParityEvidence = buildThreeRouteSourceParityEvidenceV4(sourceParityInput) as JsonRecord;
  const dependencyClosureRunnerReceipt = withArtifactHash({
    schemaVersion: "DependencyClosureRunnerReceiptV1",
    repositoryIdentity,
    sourceCommit,
    extractorImplementationHash: implementationHashes.dependencyClosureExtractorImplementationHash,
    runnerCommit,
    runnerHash,
    executedAt: timeline.dependencyClosureExecutedAt,
  }, "runnerReceiptHash");
  const dependencyClosureTrustDescriptor = {
    schemaVersion: "DependencyClosureTrustDescriptorV1",
    repositoryIdentity,
    sourceCommit,
    extractorImplementationHash: implementationHashes.dependencyClosureExtractorImplementationHash,
    runnerCommit,
    runnerHash,
    fileCount: normalizedFiles.length,
    sourceModuleHash,
  };
  const trustedDependencyClosureRootHash = sha256Hex(canonicalJson(dependencyClosureTrustDescriptor));
  const sourceModuleManifestInput = {
    repositoryIdentity,
    sourceCommit,
    routeExecutionTrustRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    dependencyClosureExtractorImplementationHash: implementationHashes.dependencyClosureExtractorImplementationHash,
    dependencyClosureRunnerReceipt,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash,
    files: normalizedFiles,
  };
  const sourceModuleManifest = buildSourceModuleManifestV4(sourceModuleManifestInput) as JsonRecord;
  if (sourceModuleManifest.sourceModuleHash !== sourceModuleHash) {
    throw new TypeError("source module manifest root drift");
  }

  const coverage = [...new Set([
    "california-math-common-core-skill",
    "ccss-math-textbook-app",
    ...observedSourceIds,
  ])].sort(codePointCompare);
  const registry = Object.fromEntries(coverage.map((sourceId) => {
    if (allowedSourceIds.has(sourceId)) {
      return [sourceId, {
        disposition: "OWNER_APPROVED",
        ownerApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
        providerEgressAllowed: true,
      }];
    }
    if (deniedSourceIds.has(sourceId)) return [sourceId, { disposition: "DENIED" }];
    throw new TypeError(`unclassified rights source ${sourceId}`);
  }));
  const ownerApprovalClaimsBySource = Object.fromEntries(
    coverage.filter((sourceId) => allowedSourceIds.has(sourceId))
      .map((sourceId) => [sourceId, ownerDecisionReceipt.ownerDecisionReceiptHash]),
  );
  const rightsDecisionInput = { sourceIds: coverage, registry, ownerApprovalClaimsBySource };
  const rightsDecisionTable = buildRightsEgressDecisionTableV4(rightsDecisionInput) as JsonRecord;
  if (rightsDecisionTable.frameFailureLedger.length !== 0) throw new TypeError("rights decision table contains unresolved sources");
  const trustedOwnerApprovalRootHash = rightsDecisionTable.ownerApprovalClaimRootHash;

  const formalScreenById = new Map<string, JsonRecord>(formalScreens.map((screen) => [screen.itemId, screen]));
  const scannerExecutionReceipts = frameRows.map((row) => {
    const screen = formalScreenById.get(row.itemId);
    if (!screen) throw new TypeError(`formal scanner evidence is missing for ${row.itemId}`);
    return buildScannerExecutionReceiptV4({
      itemId: row.itemId,
      itemHash: row.itemHash,
      screeningPolicyHash: screen.scannerPolicyHash,
      scannerImplementationHash: implementationHashes.scannerImplementationHash,
      scannerRunnerHash: runnerHash,
      scannerExecutionStatus: "COMPLETED",
      piiEvidenceRootHash: jcsHash(screen.findings.filter((finding: JsonRecord) => finding.findingKind === "PII")
        .map((finding: JsonRecord) => finding.evidenceHash)),
      secretEvidenceRootHash: jcsHash(screen.findings.filter((finding: JsonRecord) => finding.findingKind === "SECRET")
        .map((finding: JsonRecord) => finding.evidenceHash)),
      piiFindingCount: screen.piiFindingCount,
      secretFindingCount: screen.secretFindingCount,
      executedAt: timeline.scannerExecutedAt,
    });
  });
  const scannerExecutionReceiptInventory = buildScannerExecutionReceiptInventoryV4({
    scannerExecutionReceipts,
    recordedAt: timeline.scannerInventoryRecordedAt,
  });
  const itemScreenEvidence = scannerExecutionReceipts.map((scannerExecutionReceipt) => (
    buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt })
  ));
  const screeningPolicyHash = formalScreens[0]?.scannerPolicyHash;
  assertSha256(screeningPolicyHash, "screeningPolicyHash");
  const itemEgressDecisions = buildFrameItemEgressDecisionsV5({
    items: frameRows,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash,
    screenEvidences: itemScreenEvidence,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: screeningPolicyHash,
    trustedScannerImplementationHash: implementationHashes.scannerImplementationHash,
    trustedScannerRunnerHash: runnerHash,
  });
  for (const [index, decision] of itemEgressDecisions.entries()) {
    if (decision.eligible !== frameRows[index].eligible || decision.exclusionCode !== frameRows[index].exclusionCode) {
      throw new TypeError(`formal egress decision does not match owner-bound eligibility for ${frameRows[index].itemId}`);
    }
  }
  const frameFreezeEvidenceInput = {
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash,
    itemScreenEvidence,
    itemEgressDecisions,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: screeningPolicyHash,
    trustedScannerImplementationHash: implementationHashes.scannerImplementationHash,
    trustedScannerRunnerHash: runnerHash,
  };
  const frameFreezeEvidence = buildFrameFreezeEvidenceV4({ frameRows, ...frameFreezeEvidenceInput });

  const rawById = new Map(records.map((record) => [String(record.itemId), record.rawQuestion]));
  const gradeProjectionInvocations = RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
    grade,
    itemLeaves: frameRows.filter((row) => row.grade === grade).map((row) => ({
      itemId: row.itemId,
      sourceItemHash: strictContentHash(rawById.get(row.itemId)),
      sourceModuleHash,
      runtimeProjectionHash: calculateRuntimeProjectionHashV3(row),
      disposition: row.eligible
        ? "RUNTIME_VISIBLE_SERIALIZED_ELIGIBLE"
        : "RUNTIME_VISIBLE_SERIALIZED_RESTRICTED",
      exclusionCode: row.exclusionCode,
    })),
  }));
  const rawEvidenceArtifactRootHash = jcsHash({
    rawRootHash: sourceParityEvidence.rawRootHash,
    convertedFullRootHash: sourceParityEvidence.convertedFullRootHash,
    normalizedFullRootHash: sourceParityEvidence.normalizedFullRootHash,
    gradePublicUnionRootHash: sourceParityEvidence.gradePublicUnionRootHash,
    routeExecutionTrustRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
  });
  const runtimeSourceEnumerationReceipt = buildRuntimeSourceEnumerationReceiptV1({
    registrationHash: REGISTRATION_HASH,
    sourceCommit,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    runtimeConfigEvidenceHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceParityEvidenceHash: sourceParityEvidence.parityEvidenceHash,
    sourceModuleManifestHash: sourceModuleManifest.sourceModuleManifestHash,
    extractorImplementationHash: implementationHashes.extractorImplementationHash,
    extractorRunnerCommit: runnerCommit,
    extractorRunnerHash: runnerHash,
    rawEvidenceArtifactRootHash,
    enumeratedAt: timeline.sourceEnumeratedAt,
    gradeProjectionInvocations,
  });
  if (runtimeSourceEnumerationReceipt.evidenceContractHash !== RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH) {
    throw new TypeError("runtime source receipt lost the inherited method-contract hash");
  }
  const runtimeExtractionSnapshot = buildRuntimeExtractionSnapshotV3({
    frameRows,
    expectedInventoryLeaves: runtimeSourceEnumerationReceipt.expectedRuntimeInventoryLeaves,
    runtimeSourceEnumerationReceipt,
    serializationFailureLedger: [],
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit,
    extractedAt: timeline.runtimeExtractedAt,
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash,
    frameFreezeEvidenceInput,
    frameFreezeEvidence,
  });
  const cleanSourceEvidence = buildCleanSourceEvidenceV3({
    sourceCommit,
    verifiedAt: timeline.cleanSourceVerifiedAt,
    gitStatusPorcelain: "",
    sourceObjectType: "commit",
    verificationMode: "READ_ONLY_GIT_STATUS_AND_CAT_FILE",
  });
  const clusterAudit = buildClusterAuditV3({
    frameRows,
    registrationHash: REGISTRATION_HASH,
    clusteringAlgorithmHash: implementationHashes.clusteringAlgorithmHash,
    auditedAt: timeline.clusterAuditedAt,
  });
  const frameRegistration = buildFrameRegistrationV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    clusterAudit,
    registrationHash: REGISTRATION_HASH,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit,
    frozenAt: timeline.frameFrozenAt,
    lineageRuleApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
    trustedLineageRuleApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash,
    trustedOwnerApprovalRootHash,
  });
  const sampleManifest = buildSampleManifestV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    manifestFrozenAt: timeline.sampleFrozenAt,
    trustedLineageRuleApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
  });
  const c0RandomAudit = buildC0RandomAuditV3({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    frozenAt: timeline.c0FrozenAt,
    referenceAttemptReceipts: [],
    trustedLineageRuleApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
  });
  const timingErrors = validateFreezeTimingV3({
    frameRegistration,
    sampleManifest,
    c0RandomAudit,
    referenceAttemptReceipts: [],
  });
  if (timingErrors.length > 0) throw new TypeError(`freeze timing validation failed: ${timingErrors.join("; ")}`);
  const sampleErrors = validateSampleAgainstFrame({
    frameRows,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    frameRegistration,
    clusterAudit,
    sampleManifest,
    c0RandomAudit,
    trustedLineageRuleApprovalHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
  });
  if (sampleErrors.length > 0) throw new TypeError(`sample validation failed: ${sampleErrors.join("; ")}`);

  const selectedPublicRows = sampleManifest.selectedRows.map((row: JsonRecord) => ({
    itemIdPseudonym: row.itemIdPseudonym,
    itemHash: row.itemHash,
    homologyClusterHash: jcsHash(row.clusterId),
    stratum: row.stratum,
    selectionDigest: row.selectionDigest,
  }));
  const c0PseudonymByItem = new Map(sampleManifest.selectedRows.map((row: JsonRecord) => [row.itemId, row.itemIdPseudonym]));
  const c0PublicRows = c0RandomAudit.selectedRows.map((row: JsonRecord) => ({
    itemIdPseudonym: c0PseudonymByItem.get(row.itemId),
    itemHash: row.itemHash,
    homologyClusterHash: jcsHash(row.clusterId),
    stratum: row.stratum,
    selectionDigest: row.selectionDigest,
  }));
  const publicReceiptBody = {
    schemaVersion: "NaturalCaFormalFreezeReceiptV1",
    artifactKind: "OFFLINE_FRAME_AND_SAMPLE_FREEZE_NOT_PROVIDER_AUTHORIZATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    activationReceiptHash: ACTIVATION_RECEIPT_HASH,
    ownerDecisionRequestHash: ownerDecisionReceipt.ownerDecisionRequestHash,
    ownerDecisionReceiptHash: ownerDecisionReceipt.ownerDecisionReceiptHash,
    rightsPolicyHash: ownerDecisionReceipt.rightsPolicyHash,
    lineageRuleHash: LINEAGE_RULE_HASH_V4,
    sourceEnumerationHashErratumHash: sourceEnumerationHashErratum.erratumHash,
    inheritedSourceEnumerationMethodContractHash: RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    activeV5ProviderChronologyContractHash: ACTIVE_V5_RUNTIME_SOURCE_ENUMERATION_EVIDENCE_CONTRACT_HASH,
    dualRootErratumBound: true,
    approvedReadinessReceiptHash: APPROVED_READINESS_RECEIPT_HASH,
    a22ReadinessEnvironmentReceiptHash: A22_ENVIRONMENT_RECEIPT_HASH,
    a11ReadinessReviewHash: A11_READINESS_REVIEW_HASH,
    approvedReadinessSourceCommit,
    sourceCommit,
    runnerCommit,
    runnerHash,
    sourceClosureParityHash,
    runtimeConfigHash: frameRegistration.runtimeConfigHash,
    runtimeInventoryRootHash: APPROVED_RUNTIME_INVENTORY_ROOT,
    approvedPotentialEligibleContentRootHash: APPROVED_POTENTIAL_CONTENT_ROOT,
    approvedPotentialEligibleClusterSetHash: APPROVED_POTENTIAL_CLUSTER_SET_ROOT,
    sourceModuleManifestHash: sourceModuleManifest.sourceModuleManifestHash,
    sourceModuleHash,
    routeExecutionTrustRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    dependencyClosureTrustRootHash: trustedDependencyClosureRootHash,
    scannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    rightsDecisionTableHash: rightsDecisionTable.rightsDecisionTableHash,
    runtimeExtractionSnapshotHash: runtimeExtractionSnapshot.runtimeExtractionSnapshotHash,
    clusterAuditHash: clusterAudit.clusterAuditHash,
    frameRegistrationHash: frameRegistration.frameRegistrationHash,
    samplingFrameHash: frameRegistration.samplingFrameHash,
    frameSelectionContentRootHash: frameRegistration.frameSelectionContentRootHash,
    frameRowCount: frameRegistration.frameRowCount,
    eligibleRowCount: frameRegistration.eligibleRowCount,
    excludedRowCount: frameRegistration.excludedRowCount,
    eligibleClusterCount: frameRegistration.eligibleClusterCount,
    singletonCount: clusterAudit.singletonCount,
    singletonRate: clusterAudit.singletonRate,
    componentSizeDistribution: clusterAudit.componentSizeDistribution,
    largest20ComponentSizes: clusterAudit.largest20Components.map((component: JsonRecord) => component.eligibleItemCount),
    crossCellComponentCount: clusterAudit.crossCellComponentCount,
    clusterAnomalyCount: clusterAudit.anomalyLedgerCount,
    sampleManifestHash: sampleManifest.sampleManifestHash,
    sampleManifestTupleRootHash: sampleManifest.manifestTupleRootHash,
    sampleSelectionContentRootHash: sampleManifest.sampleSelectionContentRootHash,
    sampleClusterCount: sampleManifest.clusterCount,
    sampleStratumAllocations: sampleManifest.stratumAllocations,
    sampleSecondaryWeightSummary: sampleManifest.secondaryWeightSummary,
    selectedPublicRows,
    selectedPublicRowsRootHash: jcsHash(selectedPublicRows),
    c0RandomAuditHash: c0RandomAudit.auditHash,
    c0SelectedCount: c0RandomAudit.selectedRows.length,
    c0PublicRows,
    c0PublicRowsRootHash: jcsHash(c0PublicRows),
    frameFrozenAt: frameRegistration.frozenAt,
    sampleFrozenAt: sampleManifest.manifestFrozenAt,
    c0FrozenAt: c0RandomAudit.frozenAt,
    completeFrameProtected: true,
    originalItemIdsProtected: true,
    naturalQuestionTextPublished: false,
    formalFrameFrozen: true,
    formalSampleFrozen: true,
    c0RandomAuditFrozen: true,
    protectedCustodyManifestHash: null,
    protectedCustodyBound: false,
    questionEgressAuthorizedNow: false,
    providerExecutionAuthorized: false,
    credentialReadAuthorized: false,
    tokenAuthorizationCreated: false,
    attemptAuthorizationCreated: false,
    usdAuthorizationCreated: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    naturalQuestionResultCount: 0,
    firstProviderExecutionAllowed: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED",
  };
  const publicReceipt = withArtifactHash(publicReceiptBody, "formalFreezeReceiptHash");

  return Object.freeze({
    schemaVersion: "NaturalCaFormalFreezeBundleV1",
    publicReceipt,
    frameRows,
    runtimeSourceEnumerationReceipt,
    runtimeExtractionSnapshot,
    cleanSourceEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    rightsDecisionInput,
    rightsDecisionTable,
    formalScreens,
    scannerExecutionReceipts,
    scannerExecutionReceiptInventory,
    itemScreenEvidence,
    itemEgressDecisions,
    frameFreezeEvidenceInput,
    frameFreezeEvidence,
    clusterAudit,
    frameRegistration,
    sampleManifest,
    c0RandomAudit,
    ownerDecisionReceipt,
    sourceEnumerationHashErratum,
  });
}
