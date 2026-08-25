import assert from "node:assert/strict";
import test from "node:test";

import * as contract from "./sample-contract.mjs";
import { calculateArtifactHash, canonicalJson, sha256Hex } from "../design-v2/design-contract.mjs";
import {
  calculateFrozenNaturalItemLeafHashV4,
  DEEPSEEK_ITEM_EGRESS_ALLOWLIST,
  deriveDeepSeekProviderInputV4,
} from "./design-contract.mjs";
import {
  CLUSTERING_ALGORITHM_HASH as LEGACY_CLUSTERING_ALGORITHM_HASH,
  FROZEN_AT as LEGACY_FROZEN_AT,
  REGISTRATION_HASH as LEGACY_REGISTRATION_HASH,
  makeFrameRows as makeLegacyFrameRows,
  makeRow as makeLegacyRow,
  rehashRow as rehashFixtureRow,
} from "./test-fixtures.mjs";

const hash = (character) => character.repeat(64);

function localized(en, zh, zhHans = undefined) {
  return zhHans === undefined ? { en, zh } : { en, zh, zhHans };
}

function frameItem(overrides = {}) {
  return {
    itemId: "ca-item-001",
    region: "CALIFORNIA",
    curriculumProfile: "US_CA_MATH",
    grade: "P5",
    canonicalTopic: "fractions",
    topic: localized("Fractions", "分數", "分数"),
    responseForm: "multiple-choice",
    difficulty: "Medium",
    sourceCommit: "a".repeat(40),
    sourceModuleHash: hash("a"),
    homologyClusterId: "sample-cluster-001",
    prompt: localized("What is 1/2 + 1/2?", "二分之一加二分之一是多少？", "二分之一加二分之一是多少？"),
    options: [
      localized("1", "1", "1"),
      localized("2", "2", "2"),
    ],
    answer: "1",
    acceptedAnswers: ["1", "one"],
    explanation: localized("Two halves make one.", "兩個一半合成一。", "两个一半合成一。"),
    diagram: null,
    questionAssets: [],
    localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
    rubric: "MAIS_NATURAL_CA60_QA_RUBRIC_V4",
    lineageKind: "K5",
    batchId: "batch-001",
    clusterId: "cluster-001",
    topicId: "fractions",
    generationTemplate: null,
    sourceLessonSlug: null,
    sourceIds: ["california-math-common-core-skill"],
    sourceModulePath: "data/usCaliforniaQuestions.ts",
    rightsRegistryPath: "coordination/private/rights.json",
    egressRights: {
      piiScreenPassed: true,
      secretsScreenPassed: true,
    },
    ...overrides,
  };
}

function frozenSampleManifestForItem(item, overrides = {}) {
  const itemHash = contract.calculateItemContentHashV4(item);
  const clusterId = item.homologyClusterId;
  const selectedIdentityRows = [
    { itemId: item.itemId, itemHash, clusterId },
    ...Array.from({ length: 59 }, (_, index) => ({
      itemId: `fixture-sample-filler-${String(index + 1).padStart(2, "0")}`,
      itemHash: sha256Hex(canonicalJson(["fixture-sample-filler", index + 1])),
      clusterId: `fixture-sample-cluster-${String(index + 1).padStart(2, "0")}`,
    })),
  ];
  const manifestTupleRootHash = contract.calculateManifestTupleRootV3(selectedIdentityRows);
  const seedFields = {
    designId: contract.DESIGN_ID,
    registrationHash: hash("3"),
    frameRegistrationHash: hash("4"),
    manifestFrozenAt: "2026-08-25T06:00:00.000Z",
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    algorithmVersion: contract.SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash,
    ...overrides,
  };
  const pseudonymSeedRootHash = sha256Hex(canonicalJson(seedFields));
  const selectedRows = selectedIdentityRows.map((row) => ({
    ...row,
    itemIdPseudonym: `ca60-${sha256Hex(canonicalJson([
      pseudonymSeedRootHash,
      row.itemId,
      row.itemHash,
      row.clusterId,
    ])).slice(0, 32)}`,
  }));
  const pseudonymMappingRootHash = sha256Hex(canonicalJson(selectedRows.map((row) => [
    row.itemId,
    row.itemHash,
    row.clusterId,
    row.itemIdPseudonym,
  ]).sort((left, right) => left[0].localeCompare(right[0]))));
  const manifest = {
    schemaVersion: "SampleManifestV2",
    ...seedFields,
    pseudonymFormula: "ca60- + FIRST_32_HEX(SHA256(JCS([pseudonymSeedRootHash,itemId,itemHash,clusterId])))",
    pseudonymSeedRootHash,
    pseudonymMappingRootHash,
    selectedRows,
  };
  manifest.sampleManifestHash = calculateArtifactHash(manifest, "sampleManifestHash");
  return manifest;
}

function runtimeConfigInputFixture() {
  return {
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: contract.RUNTIME_SOURCE_ENUMERATION_GRADES,
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: contract.V4_LOCALE_POLICY,
    activePackStateHash: hash("1"),
    featureFlagStateHash: hash("2"),
  };
}

function sourceManifestInputFixture(
  routeExecutionTrustRootHash = sha256Hex(canonicalJson(routeExecutionTrustDescriptorFixture("c".repeat(40)))),
) {
  const files = [
    { repoRelativePath: "data/california/a.ts", gitBlobOid: "a".repeat(40) },
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "b".repeat(40) },
  ];
  const dependencyClosureRunnerReceipt = {
    schemaVersion: "DependencyClosureRunnerReceiptV1",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: "c".repeat(40),
    extractorImplementationHash: hash("d"),
    runnerCommit: "e".repeat(40),
    runnerHash: hash("f"),
    executedAt: "2026-08-25T05:20:00.000Z",
  };
  dependencyClosureRunnerReceipt.runnerReceiptHash = calculateArtifactHash(
    dependencyClosureRunnerReceipt,
    "runnerReceiptHash",
  );
  const dependencyClosureTrustDescriptor = dependencyClosureTrustDescriptorFixture(files);
  return {
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: "c".repeat(40),
    routeExecutionTrustRootHash,
    dependencyClosureExtractorImplementationHash: hash("d"),
    dependencyClosureRunnerReceipt,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash: sha256Hex(canonicalJson(dependencyClosureTrustDescriptor)),
    files,
  };
}

function dependencyClosureTrustDescriptorFixture(files, {
  repositoryIdentity = "wy51ai/MAIS-MVP",
  sourceCommit = "c".repeat(40),
  extractorImplementationHash = hash("d"),
  runnerCommit = "e".repeat(40),
  runnerHash = hash("f"),
} = {}) {
  const normalizedFiles = files.map(({ repoRelativePath, gitBlobOid }) => ({
    repoRelativePath,
    gitBlobOid: gitBlobOid.toLowerCase(),
  })).sort((left, right) => left.repoRelativePath.localeCompare(right.repoRelativePath));
  return {
    schemaVersion: "DependencyClosureTrustDescriptorV1",
    repositoryIdentity,
    sourceCommit,
    extractorImplementationHash,
    runnerCommit,
    runnerHash,
    fileCount: normalizedFiles.length,
    sourceModuleHash: sha256Hex(canonicalJson(normalizedFiles)),
  };
}

function withDependencyClosureTrust(input, files) {
  const dependencyClosureTrustDescriptor = dependencyClosureTrustDescriptorFixture(files, {
    repositoryIdentity: input.repositoryIdentity,
    sourceCommit: input.sourceCommit,
    extractorImplementationHash: input.dependencyClosureExtractorImplementationHash,
    runnerCommit: input.dependencyClosureRunnerReceipt.runnerCommit,
    runnerHash: input.dependencyClosureRunnerReceipt.runnerHash,
  });
  return {
    ...input,
    files,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash: sha256Hex(canonicalJson(dependencyClosureTrustDescriptor)),
  };
}

function approvedRightsInputFixture() {
  return {
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    registry: Object.fromEntries(contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId, index) => [sourceId, {
      disposition: "OWNER_APPROVED",
      ownerApprovalHash: hash(index === 0 ? "a" : "b"),
      providerEgressAllowed: true,
    }])),
    ownerApprovalClaimsBySource: Object.fromEntries(contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId, index) => [
      sourceId,
      hash(index === 0 ? "a" : "b"),
    ])),
  };
}

function strictContentHash(value) {
  return sha256Hex(canonicalJson(contract.canonicalizeStrictItemJsonV4(value)));
}

function rawGeneratedQuestionFromFrameItem(item) {
  return {
    id: item.itemId,
    batch: "us-ca-k5-knowledge-point-practice-v1",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    grade: item.grade,
    usGradeLabel: "Grade 5",
    topicId: item.canonicalTopic,
    standardIds: ["5.NF.A.1"],
    domainTags: ["number-and-operations-fractions"],
    conceptIds: ["add-fractions"],
    difficulty: { level: item.difficulty, score: 0.5 },
    type: item.responseForm,
    prompt: localized(`DeepSeek practice: ${item.prompt.en}`, item.prompt.zh, item.prompt.zhHans),
    options: structuredClone(item.options),
    answer: item.answer,
    acceptedAnswers: [item.answer],
    explanation: structuredClone(item.explanation),
    independentAnswer: item.acceptedAnswers?.at(-1) ?? item.answer,
    independentSolution: item.explanation.en,
    evidenceCardIds: ["evidence-card-1"],
    sourceIds: structuredClone(item.sourceIds),
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "passed-deterministic-solvability",
    manualQaStatus: "accepted-two-round-internal-qa",
    sourcePackageId: "source-package-1",
    sourceKind: "k-g5-textbook-lesson",
    domainId: "number-and-operations-fractions",
    domainTitle: "Number and Operations—Fractions",
    clusterId: item.clusterId,
    clusterTitle: "Add fractions",
    knowledgePointId: "kp-add-fractions",
    knowledgePointCode: "5.NF.A.1",
    knowledgePointTitle: "Add fractions",
  };
}

function runtimeQuestionFromFrameItem(item) {
  return contract.canonicalizeStrictItemJsonV4({
    id: item.itemId,
    curriculumTrack: "US_CA_MATH",
    curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
    region: "US",
    publisher: "US_CA_MATH",
    canonicalTopicId: item.canonicalTopic,
    grade: item.grade,
    topicId: item.canonicalTopic,
    topic: structuredClone(item.topic),
    difficulty: item.difficulty,
    type: item.responseForm,
    prompt: structuredClone(item.prompt),
    options: structuredClone(item.options),
    answer: item.answer,
    acceptedAnswers: structuredClone(item.acceptedAnswers),
    explanation: structuredClone(item.explanation),
    diagram: item.diagram ?? undefined,
    questionAssets: item.questionAssets?.length ? structuredClone(item.questionAssets) : undefined,
  });
}

function runtimePublicQuestionFromFull(full) {
  return contract.canonicalizeStrictItemJsonV4({
    id: full.id,
    curriculumTrack: full.curriculumTrack,
    curriculumProfile: full.curriculumProfile,
    region: full.region,
    publisher: full.publisher,
    canonicalTopicId: full.canonicalTopicId ?? full.topicId,
    grade: full.grade,
    topicId: full.topicId,
    topic: full.topic ?? { en: full.topicId, zh: full.topicId },
    difficulty: full.difficulty,
    type: full.type,
    prompt: full.prompt,
    options: full.options,
    diagram: full.diagram,
    questionAssets: full.questionAssets,
  });
}

function routeRunnerReceipt(schemaVersion, implementationHash, sourceCommit, executedAt, entries, extraRoots) {
  const receipt = {
    schemaVersion,
    implementationHash,
    sourceCommit,
    runnerCommit: "9".repeat(40),
    runnerHash: hash("8"),
    executedAt,
    entries,
    entryRootHash: sha256Hex(canonicalJson(entries)),
    ...extraRoots,
  };
  receipt.runnerReceiptHash = calculateArtifactHash(receipt, "runnerReceiptHash");
  return receipt;
}

function routeExecutionTrustDescriptorFor(parityInput, repositoryIdentity = "wy51ai/MAIS-MVP") {
  return {
    schemaVersion: "RouteExecutionTrustDescriptorV2",
    repositoryIdentity,
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

function routeExecutionTrustDescriptorFixture(sourceCommit) {
  return {
    schemaVersion: "RouteExecutionTrustDescriptorV2",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit,
    converter: {
      implementationHash: hash("6"),
      runnerCommit: "9".repeat(40),
      runnerHash: hash("8"),
      runnerReceiptHash: hash("1"),
      rawRootHash: hash("2"),
      convertedFullRootHash: hash("3"),
    },
    normalization: {
      implementationHash: hash("7"),
      runnerCommit: "9".repeat(40),
      runnerHash: hash("8"),
      runnerReceiptHash: hash("4"),
      convertedFullRootHash: hash("3"),
      normalizedFullRootHash: hash("5"),
    },
    publicProjection: {
      implementationHash: hash("a"),
      runnerCommit: "9".repeat(40),
      runnerHash: hash("8"),
      runnerReceiptHash: hash("6"),
      convertedFullRootHash: hash("3"),
      gradePublicUnionRootHash: hash("7"),
      gradeProjectionInvocationRootHash: hash("8"),
    },
  };
}

function parityInputFixture(item) {
  const rawItems = [rawGeneratedQuestionFromFrameItem(item)];
  const convertedFullItems = [runtimeQuestionFromFrameItem(item)];
  const normalizedFullItems = [structuredClone(item)];
  const gradePublicItems = Object.fromEntries(contract.RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => [
    grade,
    grade === item.grade ? convertedFullItems.map(runtimePublicQuestionFromFull) : [],
  ]));
  const rawRootHash = strictContentHash(rawItems);
  const convertedFullRootHash = strictContentHash(convertedFullItems);
  const normalizedFullRootHash = strictContentHash(normalizedFullItems);
  const gradePublicUnion = contract.RUNTIME_SOURCE_ENUMERATION_GRADES.flatMap((grade) => (
    gradePublicItems[grade].map((publicItem) => ({ grade, publicItem }))
  ));
  const gradePublicUnionRootHash = strictContentHash(gradePublicUnion);
  const gradeProjectionInvocations = contract.RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
    grade,
    itemCount: gradePublicItems[grade].length,
    publicContentRootHash: strictContentHash(gradePublicItems[grade]),
  }));
  const gradeProjectionInvocationRootHash = strictContentHash(gradeProjectionInvocations);
  const converterImplementationHash = hash("6");
  const normalizationImplementationHash = hash("7");
  const publicProjectionImplementationHash = hash("a");
  const converterRunnerReceipt = routeRunnerReceipt(
    "RawToRuntimeQuestionConverterRunnerReceiptV1",
    converterImplementationHash,
    item.sourceCommit,
    "2026-08-25T05:10:00.000Z",
    [{
      itemId: item.itemId,
      rawContentHash: strictContentHash(rawItems[0]),
      convertedFullContentHash: strictContentHash(convertedFullItems[0]),
    }],
    { rawRootHash, convertedFullRootHash },
  );
  const normalizationRunnerReceipt = routeRunnerReceipt(
    "RuntimeQuestionToResearchLeafNormalizerRunnerReceiptV1",
    normalizationImplementationHash,
    item.sourceCommit,
    "2026-08-25T05:11:00.000Z",
    [{
      itemId: item.itemId,
      convertedFullContentHash: strictContentHash(convertedFullItems[0]),
      normalizedItemHash: item.itemHash ?? contract.calculateItemContentHashV4(item),
    }],
    { convertedFullRootHash, normalizedFullRootHash },
  );
  const publicProjectionRunnerReceipt = routeRunnerReceipt(
    "RuntimeQuestionToPublicQuestionRunnerReceiptV1",
    publicProjectionImplementationHash,
    item.sourceCommit,
    "2026-08-25T05:12:00.000Z",
    [{
      itemId: item.itemId,
      grade: item.grade,
      convertedFullContentHash: strictContentHash(convertedFullItems[0]),
      publicContentHash: strictContentHash(gradePublicItems[item.grade][0]),
    }],
    { convertedFullRootHash, gradePublicUnionRootHash, gradeProjectionInvocationRootHash },
  );
  const parityInput = {
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
  parityInput.routeExecutionTrustDescriptor = routeExecutionTrustDescriptorFor(parityInput);
  return parityInput;
}

function screenEvidenceBundleFor(item, {
  piiFindingCount = 0,
  secretFindingCount = 0,
  scannerExecutionStatus = "COMPLETED",
} = {}) {
  const scannerExecutionReceipt = contract.buildScannerExecutionReceiptV4({
    itemId: item.itemId,
    itemHash: contract.calculateItemContentHashV4(item),
    screeningPolicyHash: hash("1"),
    scannerImplementationHash: hash("2"),
    scannerRunnerHash: hash("3"),
    piiEvidenceRootHash: hash("4"),
    secretEvidenceRootHash: hash("5"),
    scannerExecutionStatus,
    piiFindingCount,
    secretFindingCount,
    executedAt: "2026-08-25T05:30:00.000Z",
  });
  const scannerExecutionReceiptInventory = contract.buildScannerExecutionReceiptInventoryV4({
    scannerExecutionReceipts: [scannerExecutionReceipt],
    recordedAt: "2026-08-25T05:31:00.000Z",
  });
  return {
    scannerExecutionReceipt,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    screenEvidence: contract.buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt }),
  };
}

function screenEvidenceFor(item, options = {}) {
  return screenEvidenceBundleFor(item, options).screenEvidence;
}

function egressScreenBindingsFor(item, options = {}) {
  const bundle = screenEvidenceBundleFor(item, options);
  return {
    screenEvidence: bundle.screenEvidence,
    scannerExecutionReceiptInventory: bundle.scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: bundle.trustedScannerExecutionReceiptInventoryHash,
  };
}

function secureLocalizedRow(row) {
  const prompt = row.prompt;
  const options = row.options;
  const explanation = row.explanation;
  row.prompt = localized(prompt, `受保護題目 ${row.itemId}`, `受保护题目 ${row.itemId}`);
  row.options = Array.isArray(options)
    ? options.map((option) => localized(option, option, option))
    : null;
  row.answer = row.storedAnswer;
  row.explanation = localized(explanation, "受保護解釋。", "受保护解释。");
  row.topic = localized(row.canonicalTopic, `主題 ${row.canonicalTopic}`, `主题 ${row.canonicalTopic}`);
  row.localePolicy = contract.V4_LOCALE_POLICY;
  row.grade = "P5";
  delete row.locale;
  row.diagram = null;
  row.questionAssets = [];
  row.sourceIds = ["california-math-common-core-skill"];
  return rehashFixtureRow(row);
}

function makeSecureFrameRows(capacities = Array(9).fill(12)) {
  const rows = [];
  let sequence = 0;
  for (const [cellIndex, stratum] of contract.STRATA.entries()) {
    const [responseForm, difficulty] = stratum.split("::");
    for (let clusterIndex = 0; clusterIndex < capacities[cellIndex]; clusterIndex += 1) {
      sequence += 1;
      rows.push(secureLocalizedRow(makeLegacyRow({
        itemId: `secure-item-${String(sequence).padStart(4, "0")}`,
        clusterId: `secure-cluster-${String(cellIndex).padStart(2, "0")}-${String(clusterIndex).padStart(3, "0")}`,
        responseForm,
        difficulty,
      })));
    }
  }
  sequence += 1;
  rows.push(secureLocalizedRow(makeLegacyRow({
    itemId: `secure-item-${String(sequence).padStart(4, "0")}`,
    clusterId: "secure-excluded-cluster",
    responseForm: "multiple-choice",
    difficulty: "Low",
    eligible: false,
  })));
  return contract.materializeFrameSamplingWeightsV3(rows, LEGACY_REGISTRATION_HASH);
}

function requiredFunction(name) {
  assert.equal(typeof contract[name], "function", `${name} must be an executable V4 frame contract`);
  return contract[name];
}

test("P0 V4 item identity and provider projection bind the complete localized runtime bundle without inventing nulls", () => {
  const bindSampleItem = requiredFunction("buildSampleBoundProtectedItemEnvelopeV4");
  assert.equal(contract.buildProviderItemProjectionV4, undefined, "generic provider export must not expose the private DeepSeek QA payload");
  assert.equal(contract.buildDeepSeekProviderItemProjectionV4, undefined, "sample contract must not define a second DeepSeek payload allowlist");
  assert.equal(contract.buildQwenProviderItemProjectionV4, undefined, "Qwen has no access to the wide private-label payload from the frame contract");
  const item = frameItem();
  assert.notEqual(item.clusterId, item.homologyClusterId, "source lineage cluster and sampled homology cluster are distinct identities");
  const sampleManifest = frozenSampleManifestForItem(item);
  const baseline = contract.calculateItemContentHashV4(item);
  assert.equal(
    baseline,
    calculateFrozenNaturalItemLeafHashV4(item),
    "frame sampling itemHash must equal the method contract's complete protected leaf hash",
  );

  const mutations = [
    (copy) => { copy.itemId = "ca-item-identity-changed"; },
    (copy) => { copy.sourceIds = ["ccss-math-textbook-app"]; },
    (copy) => { copy.sourceCommit = "b".repeat(40); },
    (copy) => { copy.clusterId = "different-source-lineage-cluster"; },
    (copy) => { copy.prompt.zh = `${copy.prompt.zh}變更`; },
    (copy) => { copy.options[0].zhHans = `${copy.options[0].zhHans} changed`; },
    (copy) => { copy.answer = "2"; },
    (copy) => { copy.acceptedAnswers.push("unity"); },
    (copy) => { copy.explanation.en = `${copy.explanation.en} Changed.`; },
    (copy) => { copy.diagram = { kind: "number-line", range: [0, 2] }; },
    (copy) => { copy.questionAssets = [{ kind: "image", src: "/asset.png", alt: localized("asset", "資產", "资产") }]; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(item);
    mutate(changed);
    assert.notEqual(contract.calculateItemContentHashV4(changed), baseline);
  }
  const changedHomology = frameItem({ homologyClusterId: "different-sampled-homology-cluster" });
  assert.equal(
    contract.calculateItemContentHashV4(changedHomology),
    baseline,
    "homology assignment is sample membership metadata, not source content lineage",
  );
  assert.throws(
    () => bindSampleItem({ item: changedHomology, sampleManifest }),
    /cluster membership|frozen sample manifest/iu,
    "changing only homology assignment must still fail the frozen sample membership binding",
  );

  const protectedEnvelope = bindSampleItem({ item, sampleManifest });
  assert.equal(protectedEnvelope.itemPseudonym, sampleManifest.selectedRows[0].itemIdPseudonym);
  assert.equal(protectedEnvelope.itemId, item.itemId, "real identity remains protected-local in the membership envelope");
  assert.equal(protectedEnvelope.projectionDisposition, "PROTECTED_LOCAL_ONLY_NOT_PROVIDER_PAYLOAD");
  for (const forbidden of ["prompt", "options", "answer", "storedAnswer", "acceptedAnswers", "explanation", "rubric"]) {
    assert.equal(Object.hasOwn(protectedEnvelope, forbidden), false, `${forbidden} belongs only to the method-owned role projection`);
  }
  const projection = deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf: item,
    sampleManifest,
  });
  assert.deepEqual(Object.keys(projection).sort(), [...DEEPSEEK_ITEM_EGRESS_ALLOWLIST].sort());
  assert.equal(projection.itemPseudonym, protectedEnvelope.itemPseudonym);
  assert.deepEqual(projection.prompt, item.prompt);
  assert.deepEqual(projection.options, { presence: "PRESENT", value: item.options });
  assert.deepEqual(projection.storedAnswer, { presence: "PRESENT", sourceField: "answer", value: item.answer });
  assert.deepEqual(projection.acceptedAnswers, { presence: "PRESENT", value: item.acceptedAnswers });
  assert.deepEqual(projection.explanation, { presence: "PRESENT", value: item.explanation });

  const absentOptionals = frameItem({ diagram: undefined, questionAssets: undefined });
  const absentProjection = bindSampleItem({
    item: absentOptionals,
    sampleManifest: frozenSampleManifestForItem(absentOptionals),
  });
  assert.equal(Object.hasOwn(absentProjection, "diagram"), false);
  assert.equal(Object.hasOwn(absentProjection, "questionAssets"), false);

  const missingChinese = frameItem({ prompt: { en: "English only" } });
  assert.throws(
    () => bindSampleItem({
      item: missingChinese,
      sampleManifest: frozenSampleManifestForItem(missingChinese),
    }),
    /LANGUAGE_SEMANTIC_MISMATCH|LocalizedText|localized/iu,
  );
  const nestedSourceMetadata = frameItem({
    topic: { en: "Fractions", zh: "分數", sourceIds: ["must-not-egress"] },
  });
  assert.throws(
    () => bindSampleItem({
      item: nestedSourceMetadata,
      sampleManifest: frozenSampleManifestForItem(nestedSourceMetadata),
    }),
    /LocalizedText|localized|topic/iu,
  );
});

test("P0 production frame and DeepSeek projection preserve the real runtime string private-label shape", () => {
  const runtimeItem = frameItem();
  const runtimeSampleManifest = frozenSampleManifestForItem(runtimeItem);
  const binding = contract.buildSampleBoundProtectedItemEnvelopeV4({
    item: runtimeItem,
    sampleManifest: runtimeSampleManifest,
  });
  const projection = deriveDeepSeekProviderInputV4({
    role: "B_PRIME_CRITIQUE",
    itemLeaf: runtimeItem,
    sampleManifest: runtimeSampleManifest,
  });
  assert.deepEqual(projection.storedAnswer, { presence: "PRESENT", sourceField: "answer", value: "1" });
  assert.deepEqual(projection.acceptedAnswers, { presence: "PRESENT", value: ["1", "one"] });

  const runtimeFrameRows = makeSecureFrameRows();
  assert.doesNotThrow(
    () => contract.buildClusterAuditV3({
      frameRows: runtimeFrameRows,
      registrationHash: LEGACY_REGISTRATION_HASH,
      clusteringAlgorithmHash: LEGACY_CLUSTERING_ALGORITHM_HASH,
      auditedAt: LEGACY_FROZEN_AT,
    }),
  );

  const inventedLocalizedPrivateLabel = frameItem({ answer: localized("1", "1", "1") });
  assert.throws(
    () => contract.buildSampleBoundProtectedItemEnvelopeV4({
      item: inventedLocalizedPrivateLabel,
      sampleManifest: frozenSampleManifestForItem(inventedLocalizedPrivateLabel),
    }),
    /answer|string/iu,
  );

  const absentAcceptedAnswers = frameItem({ itemId: "runtime-optional-accepted-answers", acceptedAnswers: undefined });
  absentAcceptedAnswers.itemHash = contract.calculateItemContentHashV4(absentAcceptedAnswers);
  const absentAcceptedParityInput = parityInputFixture(absentAcceptedAnswers);
  assert.equal(Object.hasOwn(absentAcceptedParityInput.convertedFullItems[0], "acceptedAnswers"), false);
  assert.doesNotThrow(
    () => contract.buildThreeRouteSourceParityEvidenceV4(absentAcceptedParityInput),
    "the real Question.acceptedAnswers optional absence must remain absent rather than being invented or rejected",
  );
});

test("P0 V4 strict JSON projection rejects array accessors/extra keys and non-enumerable object state", () => {
  const accessorArray = [];
  Object.defineProperty(accessorArray, 0, {
    enumerable: true,
    configurable: true,
    get() { return "hidden execution"; },
  });
  accessorArray.length = 1;
  assert.throws(
    () => contract.canonicalizeStrictItemJsonV4(accessorArray),
    /accessor|array.*property|non-JSON/iu,
  );

  const namedArray = ["x"];
  namedArray.extra = "silently ignored by JSON.stringify";
  assert.throws(
    () => contract.canonicalizeStrictItemJsonV4(namedArray),
    /array.*extra|array.*property|non-JSON/iu,
  );

  const hiddenObject = { visible: true };
  Object.defineProperty(hiddenObject, "hidden", { value: "silent state", enumerable: false });
  assert.throws(
    () => contract.canonicalizeStrictItemJsonV4(hiddenObject),
    /non-enumerable|hidden|non-JSON/iu,
  );

  let proxyTrapCalls = 0;
  const proxied = new Proxy({}, {
    getPrototypeOf() {
      proxyTrapCalls += 1;
      throw new Error("proxy trap must never execute");
    },
    ownKeys() {
      proxyTrapCalls += 1;
      throw new Error("proxy trap must never execute");
    },
    getOwnPropertyDescriptor() {
      proxyTrapCalls += 1;
      throw new Error("proxy trap must never execute");
    },
  });
  assert.throws(
    () => contract.canonicalizeStrictItemJsonV4({ nested: proxied }),
    /proxy|non-JSON/iu,
  );
  assert.equal(proxyTrapCalls, 0, "strict normalization must reject a Proxy before any reflection trap");
});

test("P0 V4 strict JSON projection matches an independently fixed JCS UTF-8 golden vector", () => {
  const projected = contract.canonicalizeStrictItemJsonV4({
    z: [true, null, "😀"],
    absent: undefined,
    n: 1,
    a: { omitted: undefined, c: "é" },
  });
  const expectedCanonicalUtf8 = '{"a":{"c":"é"},"n":1,"z":[true,null,"😀"]}';
  const expectedSha256FromShasum = "418d365aacefcf91af617ab4f307cd8737657beef586952a2f232beffb354cb0";
  assert.equal(canonicalJson(projected), expectedCanonicalUtf8);
  assert.equal(sha256Hex(expectedCanonicalUtf8), expectedSha256FromShasum);
  assert.equal(Object.hasOwn(projected, "absent"), false, "object undefined is absence, never null");
});

test("P0 exported frame builders normalize the complete descriptor-safe input before reading it", () => {
  let builderProxyTrapCalls = 0;
  const proxiedClusterInput = new Proxy({}, {
    get() {
      builderProxyTrapCalls += 1;
      throw new Error("builder proxy get trap must never execute");
    },
    getPrototypeOf() {
      builderProxyTrapCalls += 1;
      throw new Error("builder proxy reflection trap must never execute");
    },
  });
  assert.throws(
    () => contract.buildClusterAuditV3(proxiedClusterInput),
    /proxy|non-JSON/iu,
  );
  assert.equal(builderProxyTrapCalls, 0, "cluster builder must reject its input Proxy before destructuring");

  let rowProxyTrapCalls = 0;
  const proxiedRow = new Proxy({}, {
    get() {
      rowProxyTrapCalls += 1;
      throw new Error("row proxy get trap must never execute");
    },
    getPrototypeOf() {
      rowProxyTrapCalls += 1;
      throw new Error("row proxy reflection trap must never execute");
    },
  });
  assert.throws(
    () => contract.materializeFrameSamplingWeightsV3([proxiedRow], LEGACY_REGISTRATION_HASH),
    /proxy|non-JSON/iu,
  );
  assert.equal(rowProxyTrapCalls, 0, "frame materializer must reject a nested row Proxy before field reads");

  let getterCalls = 0;
  const itemWithGetter = frameItem();
  Object.defineProperty(itemWithGetter, "prompt", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return localized("trap", "陷阱", "陷阱");
    },
  });
  assert.throws(() => contract.calculateItemContentHashV4(itemWithGetter), /accessor|non-JSON/iu);
  assert.equal(getterCalls, 0, "item identity must reject a getter without executing it");

  for (const [builderName, builder] of [
    ["clean source evidence", contract.buildCleanSourceEvidenceV3],
    ["sample manifest", contract.buildSampleManifestV3],
    ["C0 audit", contract.buildC0RandomAuditV3],
  ]) {
    let publicBuilderTrapCalls = 0;
    const proxyInput = new Proxy({}, {
      get() {
        publicBuilderTrapCalls += 1;
        throw new Error(`${builderName} proxy get trap must never execute`);
      },
      getPrototypeOf() {
        publicBuilderTrapCalls += 1;
        throw new Error(`${builderName} proxy reflection trap must never execute`);
      },
    });
    assert.throws(() => builder(proxyInput), /proxy|non-JSON/iu);
    assert.equal(publicBuilderTrapCalls, 0, `${builderName} must reject its input Proxy before destructuring`);
  }
});

test("P0 V4 runtime evidence freezes the exact standard unaccommodated 13-grade configuration", () => {
  assert.deepEqual(
    contract.RUNTIME_SOURCE_ENUMERATION_GRADES,
    ["K", "P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"],
    "the 13 direct runtime projections must use the actual GradeId values",
  );
  const input = {
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: contract.RUNTIME_SOURCE_ENUMERATION_GRADES,
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: "FULL_RUNTIME_LOCALIZED_BUNDLE",
    activePackStateHash: hash("1"),
    featureFlagStateHash: hash("2"),
  };
  const evidence = contract.buildRuntimeConfigEvidenceV4(input);
  assert.equal(evidence.maxAnswerChoices, 0);
  assert.equal(evidence.accommodationOptionTruncation, false);
  assert.equal(evidence.standardUnaccommodatedProjection, true);
  assert.equal(evidence.localePolicy, "FULL_RUNTIME_LOCALIZED_BUNDLE");

  for (const mutation of [
    { maxAnswerChoices: 2 },
    { accommodationOptionTruncation: true },
    { perStudentReducedChoicesApplied: true },
    { localePolicy: "ENGLISH_ONLY" },
    { gradeProjectionUnion: contract.RUNTIME_SOURCE_ENUMERATION_GRADES.slice(0, 12) },
    { accommodationTruncationEnabled: false },
    { accommodationProfile: "IEP_REDUCED_CHOICES" },
  ]) {
    assert.throws(
      () => contract.buildRuntimeConfigEvidenceV4({ ...input, ...mutation }),
      /runtime configuration|unaccommodated|13|unknown|localePolicy|maxAnswerChoices|accommodation/iu,
    );
  }

  let getterCalls = 0;
  const accessorInput = { ...input };
  Object.defineProperty(accessorInput, "actor", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "AUTHENTICATED_STUDENT";
    },
  });
  assert.throws(
    () => contract.buildRuntimeConfigEvidenceV4(accessorInput),
    /accessor|non-JSON/iu,
  );
  assert.equal(getterCalls, 0, "runtime-config builder must reject accessors without executing them");
});

test("P0 V4 visual and asset content is hash-bound but default-denied from provider egress with an asset ledger", () => {
  const decide = requiredFunction("buildFrameItemEgressDecisionV4");
  const rightsDecisionInput = approvedRightsInputFixture();
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const trustedRoots = {
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  };
  const safeItem = frameItem({ sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4] });
  const safe = decide({
    item: safeItem,
    rightsDecisionInput,
    rightsDecisionTable,
    ...egressScreenBindingsFor(safeItem),
    ...trustedRoots,
  });
  assert.equal(safe.eligible, true);
  assert.equal(safe.exclusionCode, null);
  assert.deepEqual(safe.assetLedger, []);
  for (const field of ["providerPayload", "providerPayloadHash", "sampleManifestHash", "itemPseudonym"]) {
    assert.equal(Object.hasOwn(safe, field), false, "frame screening must remain pre-sample and protected");
  }
  const protectedBinding = contract.buildSampleBoundProtectedItemEnvelopeV4({
    item: safeItem,
    sampleManifest: frozenSampleManifestForItem(safeItem),
  });
  assert.equal(protectedBinding.itemPseudonym.startsWith("ca60-"), true);
  assert.equal(Object.hasOwn(protectedBinding, "prompt"), false, "sample binding is protected metadata, not a second provider allowlist");

  const variants = [
    frameItem({ sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4], diagram: { kind: "number-line", range: [0, 2] } }),
    frameItem({ sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4], questionAssets: [{ kind: "image", src: "/asset.png", alt: localized("asset", "資產", "资产") }] }),
  ];
  for (const item of variants) {
    const decision = decide({
      item,
      rightsDecisionInput,
      rightsDecisionTable,
      ...egressScreenBindingsFor(item),
      ...trustedRoots,
    });
    assert.equal(decision.eligible, false);
    assert.equal(decision.exclusionCode, "RESTRICTED_EGRESS_CONTENT");
    assert.equal(decision.exclusionReasonCodes.includes("UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS"), true);
    assert.equal(decision.assetLedger.length, 1);
    assert.equal(decision.assetLedger[0].itemHash, decision.itemHash);
    assert.notEqual(decision.itemHash, contract.calculateItemContentHashV4(safeItem));
    assert.throws(
      () => contract.buildSampleBoundProtectedItemEnvelopeV4({
        item,
        sampleManifest: frozenSampleManifestForItem(item),
      }),
      /UNAUTHORIZED_VISUAL_OR_ASSET_EGRESS|visual|asset.*egress/iu,
    );
  }

  const assetWithPiiRestriction = decide({
    item: frameItem({
      sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
      diagram: { kind: "number-line", range: [0, 2] },
    }),
    rightsDecisionInput,
    rightsDecisionTable,
    ...egressScreenBindingsFor(frameItem({
      sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
      diagram: { kind: "number-line", range: [0, 2] },
    }), { piiFindingCount: 1 }),
    ...trustedRoots,
  });
  assert.equal(assetWithPiiRestriction.assetLedger.length, 1, "asset ledger coverage must survive an independent PII content restriction");
  assert.deepEqual(assetWithPiiRestriction.frameFailureLedger, [], "completed screens with findings restrict the item but do not invalidate the frame");
  assert.equal(assetWithPiiRestriction.exclusionReasonCodes.includes("PII_OR_SECRET_CONTENT_RESTRICTED"), true);

  const screenExecutionFailureItem = frameItem({ sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4] });
  const screenExecutionFailure = decide({
    item: screenExecutionFailureItem,
    rightsDecisionInput,
    rightsDecisionTable,
    ...egressScreenBindingsFor(screenExecutionFailureItem, { scannerExecutionStatus: "FAILED" }),
    ...trustedRoots,
  });
  assert.deepEqual(screenExecutionFailure.frameFailureLedger.map(({ code }) => code), ["PII_SCREEN_FAILED"]);
  assert.equal(screenExecutionFailure.exclusionReasonCodes.includes("PII_OR_SECRET_SCREEN_EXECUTION_FAILED"), true);

  const unresolvedRightsInput = {
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    registry: {},
    ownerApprovalClaimsBySource: {},
  };
  const rightsFailureItem = frameItem({
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    questionAssets: [{ kind: "image", src: "/asset.png" }],
  });
  const assetWithRightsFailure = decide({
    item: rightsFailureItem,
    rightsDecisionInput: unresolvedRightsInput,
    rightsDecisionTable: contract.buildRightsEgressDecisionTableV4(unresolvedRightsInput),
    ...egressScreenBindingsFor(rightsFailureItem),
    ...trustedRoots,
    trustedOwnerApprovalRootHash: contract.buildRightsEgressDecisionTableV4(unresolvedRightsInput).ownerApprovalClaimRootHash,
  });
  assert.equal(assetWithRightsFailure.assetLedger.length, 1, "asset ledger coverage must survive an independent rights failure");
  assert.deepEqual(
    assetWithRightsFailure.frameFailureLedger.map(({ code, sourceId }) => [code, sourceId]),
    contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId) => ["RIGHTS_UNRESOLVED", sourceId]),
    "asset restrictions must not collapse distinct unresolved rights-source details",
  );
});

test("P0 V4 three-route parity is collision-first and compares public fields only after exact ID parity", () => {
  const full = frameItem({ itemId: "ca-item-001" });
  full.itemHash = contract.calculateItemContentHashV4(full);
  const base = parityInputFixture(full);
  const { gradePublicItems, runtimeLoaderEvidence } = base;
  const evidence = contract.buildThreeRouteSourceParityEvidenceV4(base);
  assert.equal(evidence.routeParityProved, true);
  assert.equal(evidence.collisionCheckPrecedesAnyMapOrDeduplication, true);
  assert.deepEqual(evidence.runtimeLoaderEvidence, runtimeLoaderEvidence);
  assert.equal(evidence.converterRunnerReceiptHash, base.converterRunnerReceipt.runnerReceiptHash);
  assert.equal(evidence.normalizationRunnerReceiptHash, base.normalizationRunnerReceipt.runnerReceiptHash);
  assert.equal(evidence.publicProjectionRunnerReceiptHash, base.publicProjectionRunnerReceipt.runnerReceiptHash);
  assert.deepEqual(contract.PUBLIC_ROUTE_REQUIRED_FIELDS_V4, [
    "id",
    "curriculumTrack",
    "curriculumProfile",
    "region",
    "publisher",
    "canonicalTopicId",
    "grade",
    "topicId",
    "topic",
    "difficulty",
    "type",
    "prompt",
  ]);

  const duplicateRaw = [
    { id: full.itemId, malformedBeforeShapeValidation: true },
    { id: full.itemId, alsoMalformed: true },
  ];
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, rawItems: duplicateRaw }),
    /ID_COLLISION/iu,
    "duplicate detection must precede leaf/hash validation",
  );
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({
      ...base,
      rawItems: duplicateRaw,
      runtimeLoaderEvidence: { ...runtimeLoaderEvidence, apiPreviewUsed: true },
      mapFirstWinsUsed: true,
    }),
    /ID_COLLISION/iu,
    "duplicate detection must precede loader-evidence and first-wins rejection",
  );
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({
      ...base,
      rawItems: duplicateRaw,
      previewOnlyUnknownField: true,
    }),
    /ID_COLLISION/iu,
    "every safely inspectable route must be collision-scanned before unknown-field rejection",
  );
  const duplicateWithMissingGrade = structuredClone(base);
  duplicateWithMissingGrade.rawItems.push(structuredClone(duplicateWithMissingGrade.rawItems[0]));
  delete duplicateWithMissingGrade.gradePublicItems.K;
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4(duplicateWithMissingGrade),
    /ID_COLLISION/iu,
    "every safely inspectable route must be collision-scanned before 13-grade coverage rejection",
  );
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, rawItems: [] }),
    /RAW_FULL_ID_MISMATCH/iu,
  );
  const missingPublic = structuredClone(gradePublicItems);
  missingPublic.P5 = [];
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, gradePublicItems: missingPublic }),
    /FULL_PUBLIC_ID_MISMATCH/iu,
  );
  const changedPublic = structuredClone(gradePublicItems);
  changedPublic.P5[0].prompt.zh = "不一致";
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, gradePublicItems: changedPublic }),
    /PUBLIC_FIELD_MISMATCH|public.*receipt/iu,
  );
  for (const missingRequiredField of ["prompt", "options"]) {
    const incompletePublic = structuredClone(gradePublicItems);
    delete incompletePublic.P5[0][missingRequiredField];
    assert.throws(
      () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, gradePublicItems: incompletePublic }),
      /PUBLIC_FIELD_MISMATCH/iu,
      `public projection must exactly match the full-derived optional/required ${missingRequiredField} disposition`,
    );
  }
  const changedRaw = structuredClone(base.rawItems[0]);
  changedRaw.prompt.zh = "原始路徑內容不同";
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, rawItems: [changedRaw] }),
    /RAW_FULL_ID_MISMATCH|converter.*receipt|raw.*root/iu,
    "same runtime ID with different raw content is not covered by the frozen converter receipt",
  );
  const changedConverted = structuredClone(base.convertedFullItems);
  changedConverted[0].prompt.zh = "轉換結果不同";
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, convertedFullItems: changedConverted }),
    /RAW_FULL_ID_MISMATCH|converter.*receipt|converted.*root/iu,
    "same runtime ID with different converted content is not covered by the frozen converter receipt",
  );
  const changedNormalized = structuredClone(base.normalizedFullItems);
  changedNormalized[0].prompt.zh = "研究正規化結果不同";
  changedNormalized[0].itemHash = contract.calculateItemContentHashV4(changedNormalized[0]);
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, normalizedFullItems: changedNormalized }),
    /RAW_FULL_ID_MISMATCH|normalization.*receipt|normalized.*root/iu,
  );
  const misbucketedPublic = structuredClone(gradePublicItems);
  misbucketedPublic.P5 = [];
  misbucketedPublic.P4 = [structuredClone(gradePublicItems.P5[0])];
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4({ ...base, gradePublicItems: misbucketedPublic }),
    /PUBLIC_FIELD_MISMATCH|grade-public.*grade/iu,
  );
  for (const loaderMutation of [
    { optionalQuestionModuleUsed: true },
    { apiPreviewUsed: true },
    { gradeProjectionCount: 12 },
    { rawLoader: "OPTIONAL_QUESTION_MODULE" },
    { converterImplementationHash: hash("f") },
  ]) {
    assert.throws(
      () => contract.buildThreeRouteSourceParityEvidenceV4({
        ...base,
        runtimeLoaderEvidence: { ...runtimeLoaderEvidence, ...loaderMutation },
      }),
      /RUNTIME_ENUMERATION_FAILED|direct import|optionalQuestionModule|API preview|13/iu,
    );
  }

  let getterCalls = 0;
  const accessorInput = { ...base };
  Object.defineProperty(accessorInput, "rawItems", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return base.rawItems;
    },
  });
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4(accessorInput),
    /accessor|non-JSON/iu,
  );
  assert.equal(getterCalls, 0, "parity builder must reject accessors without executing them");
});

test("P0 route runner receipts cannot self-sign a different source commit or implementation trust root", () => {
  const full = frameItem({ itemId: "route-trust-item" });
  full.itemHash = contract.calculateItemContentHashV4(full);
  const base = parityInputFixture(full);
  const routeExecutionTrustDescriptor = routeExecutionTrustDescriptorFor(base);
  const trusted = {
    ...base,
    routeExecutionTrustDescriptor,
  };
  const evidence = contract.buildThreeRouteSourceParityEvidenceV4(trusted);
  assert.equal(evidence.sourceCommit, full.sourceCommit);
  assert.equal(
    evidence.routeExecutionTrustRootHash,
    sha256Hex(canonicalJson(routeExecutionTrustDescriptor)),
  );

  const forged = structuredClone(trusted);
  for (const [receiptField, loaderHashField] of [
    ["converterRunnerReceipt", "converterRunnerReceiptHash"],
    ["normalizationRunnerReceipt", "normalizationRunnerReceiptHash"],
    ["publicProjectionRunnerReceipt", "publicProjectionRunnerReceiptHash"],
  ]) {
    forged[receiptField].sourceCommit = "b".repeat(40);
    forged[receiptField].runnerReceiptHash = calculateArtifactHash(forged[receiptField], "runnerReceiptHash");
    forged.runtimeLoaderEvidence[loaderHashField] = forged[receiptField].runnerReceiptHash;
  }
  assert.throws(
    () => contract.buildThreeRouteSourceParityEvidenceV4(forged),
    /source commit|trust descriptor|trusted route execution/iu,
    "a self-consistent replacement receipt must still fail against the independently frozen trust descriptor",
  );
});

test("P0 V4 sourceModuleHash is the JCS root of a sorted repo-relative transitive Git blob manifest", () => {
  const files = [
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "B".repeat(40) },
    { repoRelativePath: "data/california/a.ts", gitBlobOid: "a".repeat(64) },
  ];
  const input = withDependencyClosureTrust(sourceManifestInputFixture(), files);
  const manifest = contract.buildSourceModuleManifestV4(input);
  const expectedFiles = [
    { repoRelativePath: "data/california/a.ts", gitBlobOid: "a".repeat(64) },
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "b".repeat(40) },
  ];
  assert.deepEqual(manifest.files, expectedFiles);
  assert.equal(manifest.sourceModuleHash, sha256Hex(canonicalJson(expectedFiles)));
  assert.equal(
    contract.buildSourceModuleManifestV4({ ...input, files: [...files].reverse() }).sourceModuleHash,
    manifest.sourceModuleHash,
  );
  assert.notEqual(
    contract.buildSourceModuleManifestV4(withDependencyClosureTrust(input, [
      expectedFiles[0],
      { ...expectedFiles[1], gitBlobOid: "c".repeat(40) },
    ])).sourceModuleHash,
    manifest.sourceModuleHash,
    "a transitive dependency blob change must change sourceModuleHash",
  );

  for (const repoRelativePath of [
    "/absolute.ts",
    "./relative.ts",
    "data//a.ts",
    "data/./a.ts",
    "data/../a.ts",
    "data\\a.ts",
  ]) {
    assert.throws(
      () => contract.buildSourceModuleManifestV4({ ...input, files: [{ repoRelativePath, gitBlobOid: "a".repeat(40) }] }),
      /repoRelativePath|repository path|normalized relative/iu,
    );
  }
  assert.throws(
    () => contract.buildSourceModuleManifestV4({ ...input, files: [
      { repoRelativePath: "a.ts", gitBlobOid: "a".repeat(40) },
      { repoRelativePath: "a.ts", gitBlobOid: "b".repeat(40) },
    ] }),
    /duplicate/iu,
  );
  assert.throws(
    () => contract.buildSourceModuleManifestV4({ ...input, files: [{ repoRelativePath: "a.ts", gitBlobOid: "a".repeat(39) }] }),
    /40|64|OID|hex/iu,
  );
  assert.throws(
    () => contract.buildSourceModuleManifestV4({ ...input, files: [{ path: "a.ts", gitBlobOid: "a".repeat(40) }] }),
    /repoRelativePath/iu,
  );
});

test("P0 V4 closed failure ledger blocks frame freeze on every nonempty failure", () => {
  const expectedCodes = [
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
  ];
  assert.deepEqual(contract.FRAME_FAILURE_CODES_V4, expectedCodes);
  assert.deepEqual(contract.FRAME_FAILURE_CLASSES_V4, expectedCodes);
  const assertEmpty = requiredFunction("assertFrameFailureLedgerEmptyV4");
  assert.equal(assertEmpty([]), true);
  for (const code of expectedCodes) {
    assert.throws(
      () => assertEmpty([{ code, detail: `${code} evidence` }]),
      new RegExp(`frame freeze.*${code}|${code}.*frame freeze`, "iu"),
    );
  }
  assert.throws(
    () => assertEmpty([{ code: "UNRECOGNIZED_FAIL_OPEN_CODE" }]),
    /unknown|closed|UNRECOGNIZED_FAIL_OPEN_CODE/iu,
  );
  assert.throws(
    () => contract.buildFrameRegistrationV3({
      frameFailureLedger: [{ code: "SOURCE_IMPORT_FAILED", detail: "direct import threw" }],
    }),
    /complete frame freeze evidence|caller frameFailureLedger.*forbidden/iu,
    "frame registration must derive failures internally and reject a caller-injected ledger",
  );
});

test("P0 V4 rights decisions are owner-bound per source and PII failures cannot produce provider payloads", () => {
  const buildRights = requiredFunction("buildRightsEgressDecisionTableV4");
  const unresolved = buildRights({
    sourceIds: ["california-math-common-core-skill", "ccss-math-textbook-app"],
    registry: {},
    ownerApprovalClaimsBySource: {},
  });
  assert.equal(unresolved.allSourcesEgressEligible, false);
  assert.deepEqual(
    unresolved.decisions.map(({ sourceId, disposition, egressEligible, failureCode }) => ({
      sourceId, disposition, egressEligible, failureCode,
    })),
    [
      {
        sourceId: "california-math-common-core-skill",
        disposition: "OWNER_REVIEW_REQUIRED",
        egressEligible: false,
        failureCode: "RIGHTS_UNRESOLVED",
      },
      {
        sourceId: "ccss-math-textbook-app",
        disposition: "OWNER_REVIEW_REQUIRED",
        egressEligible: false,
        failureCode: "RIGHTS_UNRESOLVED",
      },
    ],
  );

  const ownerHashes = {
    "california-math-common-core-skill": hash("a"),
    "ccss-math-textbook-app": hash("b"),
  };
  const registry = {
    "california-math-common-core-skill": {
      disposition: "OWNER_APPROVED",
      ownerApprovalHash: hash("a"),
      providerEgressAllowed: true,
      registryPath: "coordination/private/rights.json",
    },
    "ccss-math-textbook-app": {
      disposition: "OWNER_APPROVED",
      ownerApprovalHash: hash("b"),
      providerEgressAllowed: true,
      registryPath: "coordination/private/rights.json",
    },
  };
  const approved = buildRights({
    sourceIds: Object.keys(registry),
    registry,
    ownerApprovalClaimsBySource: ownerHashes,
  });
  assert.equal(approved.allSourcesEgressEligible, true);
  assert.deepEqual(approved.decisions.map(({ disposition }) => disposition), ["OWNER_APPROVED", "OWNER_APPROVED"]);
  assert.equal(approved.builderProvesOwnerAuthorization, false);
  assert.equal(approved.authorizationBoundary, "REQUIRES_OUT_OF_BAND_OWNER_APPROVAL_ROOT_AT_FINAL_EGRESS_VALIDATION");
  assert.match(approved.ownerApprovalClaimRootHash, /^[a-f0-9]{64}$/u);
  assert.equal(Object.hasOwn(approved, "trustedOwnerApprovalRootHash"), false, "the table contains claims, not self-proclaimed trust");
  assert.throws(
    () => buildRights({
      sourceIds: Object.keys(registry),
      registry,
      trustedOwnerApprovalHashes: ownerHashes,
    }),
    /unknown|caller-asserted trust|trustedOwnerApprovalHashes/iu,
  );

  const forged = structuredClone(registry);
  forged["california-math-common-core-skill"].ownerApprovalHash = hash("c");
  const forgedDecision = buildRights({
    sourceIds: Object.keys(forged),
    registry: forged,
    ownerApprovalClaimsBySource: ownerHashes,
  });
  assert.equal(forgedDecision.allSourcesEgressEligible, false);
  assert.equal(forgedDecision.decisions[0].disposition, "OWNER_REVIEW_REQUIRED");

  const piiItem = frameItem({
    sourceIds: Object.keys(registry),
  });
  const piiDecision = contract.buildFrameItemEgressDecisionV4({
    item: piiItem,
    rightsDecisionInput: {
      sourceIds: Object.keys(registry),
      registry,
      ownerApprovalClaimsBySource: ownerHashes,
    },
    rightsDecisionTable: approved,
    trustedOwnerApprovalRootHash: approved.ownerApprovalClaimRootHash,
    ...egressScreenBindingsFor(piiItem, { piiFindingCount: 1 }),
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  });
  assert.equal(piiDecision.eligible, false);
  assert.equal(Object.hasOwn(piiDecision, "providerPayload"), false);
  assert.deepEqual(piiDecision.frameFailureLedger, []);
  assert.equal(piiDecision.exclusionReasonCodes.includes("PII_OR_SECRET_CONTENT_RESTRICTED"), true);
  for (const forbidden of ["sourceIds", "registryPath", "rightsRegistryPath", "sourceModulePath"]) {
    assert.equal(Object.hasOwn(piiDecision, forbidden), false);
  }

  assert.deepEqual(contract.validateRightsRegistryV4(registry, {
    sourceIds: Object.keys(registry),
    ownerApprovalClaimsBySource: ownerHashes,
  }), []);
  assert.equal(contract.validateRightsRegistryV4({}, {
    sourceIds: Object.keys(registry),
    ownerApprovalClaimsBySource: ownerHashes,
  }).length, 2);

  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      item: piiItem,
      rightsDecisionInput: {
        sourceIds: Object.keys(registry),
        registry,
        ownerApprovalClaimsBySource: ownerHashes,
      },
      rightsDecisionTable: approved,
      trustedOwnerApprovalRootHash: hash("f"),
      ...egressScreenBindingsFor(piiItem),
      trustedScreeningPolicyHash: hash("1"),
      trustedScannerImplementationHash: hash("2"),
      trustedScannerRunnerHash: hash("3"),
    }),
    /out-of-band|owner approval root|trusted.*rights/iu,
    "caller-coordinated registry and approval claims cannot replace the out-of-band trust root",
  );
});

test("P1 rights failure ledger preserves distinct unresolved source details", () => {
  const item = frameItem({ sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4] });
  item.itemHash = contract.calculateItemContentHashV4(item);
  const rightsDecisionInput = {
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    registry: Object.fromEntries(contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId) => [sourceId, {
      disposition: "OWNER_REVIEW_REQUIRED",
      providerEgressAllowed: false,
    }])),
    ownerApprovalClaimsBySource: {},
  };
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const scannerReceipt = contract.buildScannerExecutionReceiptV4({
    itemId: item.itemId,
    itemHash: item.itemHash,
    screeningPolicyHash: hash("1"),
    scannerImplementationHash: hash("2"),
    scannerRunnerHash: hash("3"),
    scannerExecutionStatus: "COMPLETED",
    piiEvidenceRootHash: hash("4"),
    secretEvidenceRootHash: hash("5"),
    piiFindingCount: 0,
    secretFindingCount: 0,
    executedAt: "2026-08-25T05:30:00.000Z",
  });
  const scannerExecutionReceiptInventory = contract.buildScannerExecutionReceiptInventoryV4({
    scannerExecutionReceipts: [scannerReceipt],
    recordedAt: "2026-08-25T05:31:00.000Z",
  });
  const decision = contract.buildFrameItemEgressDecisionV4({
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    screenEvidence: contract.buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt: scannerReceipt }),
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash: scannerExecutionReceiptInventory.scannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  });
  const rightsFailures = decision.frameFailureLedger.filter(({ code }) => code === "RIGHTS_UNRESOLVED");
  assert.deepEqual(
    rightsFailures.map(({ sourceId }) => sourceId),
    [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4].sort(),
    "each unresolved source must retain its own stable failure-ledger detail",
  );
});

test("P0 V4 fine lineage distinguishes legitimate absence from a damaged claimed compound key", () => {
  const decideLineage = requiredFunction("buildFrameItemLineageDecisionV4");
  const preflightItem = requiredFunction("buildFrameItemPreflightV4");
  const absent = frameItem({
    lineageKind: null,
    packageId: "broad-package",
    batchId: "broad-batch",
    clusterId: null,
    sourceIds: ["umbrella-source-id"],
    sourceModule: "umbrella/module.ts",
  });
  const absentDecision = decideLineage(absent);
  assert.equal(absentDecision.lineageKeyHash, null);
  assert.equal(absentDecision.sourceEdgeEligible, false);
  assert.deepEqual(absentDecision.frameFailureLedger, []);
  assert.deepEqual(absentDecision.anomalyLedger.map(({ code }) => code), ["LINEAGE_UNAVAILABLE_NO_SOURCE_EDGE"]);
  assert.equal(absentDecision.anomalyLedger[0].itemId, absent.itemId);
  assert.equal(absentDecision.anomalyLedger[0].itemHash, contract.calculateItemContentHashV4(absent));
  assert.equal(
    absentDecision.anomalyLedger[0].anomalyHash,
    calculateArtifactHash(absentDecision.anomalyLedger[0], "anomalyHash"),
  );

  const complete = frameItem();
  const completeDecision = decideLineage(complete);
  assert.equal(completeDecision.sourceEdgeEligible, true);
  assert.deepEqual(completeDecision.compoundKeyFields, ["batchId", "clusterId", "topicId", "responseForm"]);
  assert.match(completeDecision.lineageKeyHash, /^[a-f0-9]{64}$/u);
  const broadMutation = frameItem({
    packageId: "different-package",
    sourceIds: ["different-source"],
    sourceModule: "different/umbrella.ts",
  });
  assert.equal(decideLineage(broadMutation).lineageKeyHash, completeDecision.lineageKeyHash);

  const damaged = frameItem({ clusterId: undefined });
  const damagedDecision = decideLineage(damaged);
  assert.equal(damagedDecision.sourceEdgeEligible, false);
  assert.deepEqual(damagedDecision.frameFailureLedger.map(({ code }) => code), ["LINEAGE_FIELD_MISSING"]);

  assert.deepEqual(preflightItem(absent).frameFailureLedger, []);
  assert.deepEqual(
    preflightItem(frameItem({ responseForm: "graph" })).frameFailureLedger.map(({ code }) => code),
    ["UNSUPPORTED_RESPONSE_FORM"],
  );
  const serializationFailure = frameItem();
  serializationFailure.acceptedAnswers = [undefined];
  assert.deepEqual(
    preflightItem(serializationFailure).frameFailureLedger.map(({ code }) => code),
    ["SERIALIZATION_FAILED"],
  );
});

test("P0 production cluster/frame path rejects legacy English-only leaves before freeze", () => {
  assert.throws(
    () => {
      const legacyRows = makeLegacyFrameRows();
      legacyRows[0].prompt = legacyRows[0].prompt.en;
      rehashFixtureRow(legacyRows[0]);
      return contract.buildClusterAuditV3({
        frameRows: legacyRows,
        registrationHash: LEGACY_REGISTRATION_HASH,
        clusteringAlgorithmHash: LEGACY_CLUSTERING_ALGORITHM_HASH,
        auditedAt: LEGACY_FROZEN_AT,
      });
    },
    /LocalizedText|localized|FULL_RUNTIME_LOCALIZED_BUNDLE/iu,
  );
});

test("P0 sample-bound protected item rejects caller-chosen pseudonyms without a frozen sample manifest", () => {
  const item = frameItem();
  assert.throws(
    () => contract.buildSampleBoundProtectedItemEnvelopeV4(item, {
      itemPseudonym: "caller-chosen-pseudonym",
      sampleManifestHash: hash("f"),
    }),
    /frozen sample manifest|sampleManifest artifact|sample-bound protected/iu,
  );
});

test("P0 frozen sample manifest derives and validates the only protected provider pseudonym binding", () => {
  const item = frameItem();
  const sampleManifest = frozenSampleManifestForItem(item);
  const projection = contract.buildSampleBoundProtectedItemEnvelopeV4({ item, sampleManifest });
  assert.equal(projection.itemPseudonym, sampleManifest.selectedRows[0].itemIdPseudonym);
  assert.equal(projection.itemId, item.itemId);
  assert.equal(projection.sampleManifestHash, sampleManifest.sampleManifestHash);
  assert.equal(projection.projectionDisposition, "PROTECTED_LOCAL_ONLY_NOT_PROVIDER_PAYLOAD");

  const forgedMapping = structuredClone(sampleManifest);
  forgedMapping.selectedRows[0].itemIdPseudonym = "ca60-forged-caller-value";
  forgedMapping.pseudonymMappingRootHash = sha256Hex(canonicalJson(forgedMapping.selectedRows.map((row) => [
    row.itemId, row.itemHash, row.clusterId, row.itemIdPseudonym,
  ])));
  forgedMapping.sampleManifestHash = calculateArtifactHash(forgedMapping, "sampleManifestHash");
  assert.throws(
    () => contract.buildSampleBoundProtectedItemEnvelopeV4({ item, sampleManifest: forgedMapping }),
    /pseudonym|mapping|frozen sample/iu,
  );

  const crossManifestReuse = frozenSampleManifestForItem(item, {
    manifestFrozenAt: "2026-08-25T06:01:00.000Z",
  });
  crossManifestReuse.selectedRows[0].itemIdPseudonym = sampleManifest.selectedRows[0].itemIdPseudonym;
  crossManifestReuse.pseudonymMappingRootHash = sha256Hex(canonicalJson(crossManifestReuse.selectedRows.map((row) => [
    row.itemId, row.itemHash, row.clusterId, row.itemIdPseudonym,
  ])));
  crossManifestReuse.sampleManifestHash = calculateArtifactHash(crossManifestReuse, "sampleManifestHash");
  assert.throws(
    () => contract.buildSampleBoundProtectedItemEnvelopeV4({ item, sampleManifest: crossManifestReuse }),
    /pseudonym|mapping|cross-manifest|frozen sample/iu,
  );
});

test("P0 production sample pseudonym materialization is non-circular and mapping-root bound", () => {
  const materializePseudonyms = requiredFunction("materializeSamplePseudonymFieldsV4");
  const draft = {
    schemaVersion: "SampleManifestV2",
    designId: contract.DESIGN_ID,
    registrationHash: hash("3"),
    frameRegistrationHash: hash("4"),
    manifestFrozenAt: "2026-08-25T06:00:00.000Z",
    sampleVersion: 1,
    supersedesSampleManifestHash: null,
    algorithmVersion: contract.SAMPLE_ALGORITHM_VERSION,
    manifestTupleRootHash: sha256Hex(canonicalJson([["item-a", hash("a"), "cluster-a"]])),
    selectedRows: [{ itemId: "item-a", itemHash: hash("a"), clusterId: "cluster-a" }],
  };
  const materialized = materializePseudonyms(draft);
  const expectedSeed = sha256Hex(canonicalJson({
    designId: draft.designId,
    registrationHash: draft.registrationHash,
    frameRegistrationHash: draft.frameRegistrationHash,
    manifestFrozenAt: draft.manifestFrozenAt,
    sampleVersion: draft.sampleVersion,
    supersedesSampleManifestHash: draft.supersedesSampleManifestHash,
    algorithmVersion: draft.algorithmVersion,
    manifestTupleRootHash: draft.manifestTupleRootHash,
  }));
  const expectedPseudonym = `ca60-${sha256Hex(canonicalJson([
    expectedSeed,
    "item-a",
    hash("a"),
    "cluster-a",
  ])).slice(0, 32)}`;
  assert.equal(materialized.pseudonymSeedRootHash, expectedSeed);
  assert.equal(materialized.selectedRows[0].itemIdPseudonym, expectedPseudonym);
  assert.equal(
    materialized.pseudonymMappingRootHash,
    sha256Hex(canonicalJson([["item-a", hash("a"), "cluster-a", expectedPseudonym]])),
  );
});

test("P0 frame egress screening rejects a forged rights decision table", () => {
  const forgedRightsTable = {
    allSourcesEgressEligible: true,
    decisions: [{
      sourceId: "california-math-common-core-skill",
      disposition: "OWNER_APPROVED",
      egressEligible: true,
    }],
  };
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      item: frameItem({ diagram: { kind: "number-line" } }),
      rightsDecisionTable: forgedRightsTable,
    }),
    /rights.*table.*hash|recompute.*rights|trusted owner approval root/iu,
  );
});

test("P0 frame egress screening recomputes rights decisions from trusted owner-bound input", () => {
  const rightsDecisionInput = {
    sourceIds: ["california-math-common-core-skill", "ccss-math-textbook-app"],
    registry: {
      "california-math-common-core-skill": { disposition: "DENIED" },
      "ccss-math-textbook-app": { disposition: "DENIED" },
    },
    ownerApprovalClaimsBySource: {},
  };
  const valid = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const forged = structuredClone(valid);
  forged.decisions[0] = {
    ...forged.decisions[0],
    disposition: "OWNER_APPROVED",
    egressEligible: true,
  };
  forged.allSourcesEgressEligible = false;
  forged.rightsDecisionTableHash = calculateArtifactHash(forged, "rightsDecisionTableHash");
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      item: frameItem({ diagram: { kind: "number-line" } }),
      rightsDecisionInput,
      rightsDecisionTable: forged,
    }),
    /recompute.*rights|rights.*trusted.*input|decision table mismatch/iu,
  );
});

test("P0 PII and secret screening is a rooted item-bound evidence artifact", () => {
  const buildScreenEvidence = requiredFunction("buildItemEgressScreenEvidenceV4");
  const item = frameItem();
  const scannerExecutionReceipt = contract.buildScannerExecutionReceiptV4({
    itemId: item.itemId,
    itemHash: contract.calculateItemContentHashV4(item),
    screeningPolicyHash: hash("1"),
    scannerImplementationHash: hash("2"),
    scannerRunnerHash: hash("3"),
    scannerExecutionStatus: "COMPLETED",
    piiEvidenceRootHash: hash("4"),
    secretEvidenceRootHash: hash("5"),
    piiFindingCount: 0,
    secretFindingCount: 0,
    executedAt: "2026-08-25T05:30:00.000Z",
  });
  const evidence = buildScreenEvidence({ scannerExecutionReceipt });
  assert.equal(evidence.screenDisposition, "PASSED");
  assert.equal(evidence.scannerExecutionReceiptHash, scannerExecutionReceipt.scannerExecutionReceiptHash);
  assert.equal(evidence.screenEvidenceHash, calculateArtifactHash(evidence, "screenEvidenceHash"));

  const changedIdentity = structuredClone(evidence);
  changedIdentity.itemId = "different-item";
  assert.notEqual(changedIdentity.screenEvidenceHash, calculateArtifactHash(changedIdentity, "screenEvidenceHash"));
});

test("P0 scanner PASSED disposition requires an exact out-of-band execution receipt inventory", () => {
  const buildScannerReceipt = requiredFunction("buildScannerExecutionReceiptV4");
  const buildScannerInventory = requiredFunction("buildScannerExecutionReceiptInventoryV4");
  const item = frameItem();
  item.itemHash = contract.calculateItemContentHashV4(item);
  const receiptInput = {
    itemId: item.itemId,
    itemHash: item.itemHash,
    screeningPolicyHash: hash("1"),
    scannerImplementationHash: hash("2"),
    scannerRunnerHash: hash("3"),
    scannerExecutionStatus: "COMPLETED",
    piiEvidenceRootHash: hash("4"),
    secretEvidenceRootHash: hash("5"),
    piiFindingCount: 0,
    secretFindingCount: 0,
    executedAt: "2026-08-25T05:30:00.000Z",
  };
  const receipt = buildScannerReceipt(receiptInput);
  const inventory = buildScannerInventory({
    scannerExecutionReceipts: [receipt],
    recordedAt: "2026-08-25T05:31:00.000Z",
  });
  const screenEvidence = contract.buildItemEgressScreenEvidenceV4({ scannerExecutionReceipt: receipt });
  const rightsDecisionInput = approvedRightsInputFixture();
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const decisionInput = {
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    screenEvidence,
    scannerExecutionReceiptInventory: inventory,
    trustedScannerExecutionReceiptInventoryHash: inventory.scannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  };
  assert.equal(contract.buildFrameItemEgressDecisionV4(decisionInput).eligible, true);
  const invalidTimestampInventory = structuredClone(inventory);
  invalidTimestampInventory.recordedAt = "not-a-timestamp";
  invalidTimestampInventory.scannerExecutionReceiptInventoryHash = calculateArtifactHash(
    invalidTimestampInventory,
    "scannerExecutionReceiptInventoryHash",
  );
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      ...decisionInput,
      scannerExecutionReceiptInventory: invalidTimestampInventory,
      trustedScannerExecutionReceiptInventoryHash: invalidTimestampInventory.scannerExecutionReceiptInventoryHash,
    }),
    /strict RFC3339|inventory.*recordedAt|timestamp/iu,
    "a self-hashed scanner inventory must still carry a strict recordedAt instant",
  );
  const predatedInventory = structuredClone(inventory);
  predatedInventory.recordedAt = "2026-08-25T05:29:59.000Z";
  predatedInventory.scannerExecutionReceiptInventoryHash = calculateArtifactHash(
    predatedInventory,
    "scannerExecutionReceiptInventoryHash",
  );
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      ...decisionInput,
      scannerExecutionReceiptInventory: predatedInventory,
      trustedScannerExecutionReceiptInventoryHash: predatedInventory.scannerExecutionReceiptInventoryHash,
    }),
    /inventory.*predate|scanner.*execut.*recordedAt|chronology/iu,
    "the exact receipt execution must not occur after its trusted inventory is recorded",
  );
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({ ...decisionInput, callerCertifiedPassed: true }),
    /unknown.*field|closed.*input|caller.*certif/iu,
    "frame egress decisions must reject caller-certified state outside the closed evidence inputs",
  );

  const resignedReceipt = buildScannerReceipt({
    ...receiptInput,
    piiEvidenceRootHash: hash("9"),
  });
  const resignedInventory = buildScannerInventory({
    scannerExecutionReceipts: [resignedReceipt],
    recordedAt: "2026-08-25T05:31:00.000Z",
  });
  const resignedScreenEvidence = contract.buildItemEgressScreenEvidenceV4({
    scannerExecutionReceipt: resignedReceipt,
  });
  assert.throws(
    () => contract.buildFrameItemEgressDecisionV4({
      ...decisionInput,
      screenEvidence: resignedScreenEvidence,
      scannerExecutionReceiptInventory: resignedInventory,
    }),
    /out-of-band.*scanner|execution receipt inventory|trusted.*inventory/iu,
    "a caller-re-signed zero-finding receipt must not replace the independently frozen scanner inventory",
  );
});

test("P0 frame egress screening aggregates every failure and hashes each asset without pre-sample provider fields", () => {
  const item = frameItem({
    responseForm: "graph",
    clusterId: undefined,
    diagram: { kind: "number-line", range: [0, 2] },
    questionAssets: "invalid-asset-container",
  });
  const itemHash = contract.calculateItemContentHashV4(item);
  const rightsDecisionInput = {
    sourceIds: ["california-math-common-core-skill", "ccss-math-textbook-app"],
    registry: {},
    ownerApprovalClaimsBySource: {},
  };
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const screenBindings = egressScreenBindingsFor(item, {
    scannerExecutionStatus: "FAILED",
    piiFindingCount: 1,
    secretFindingCount: 1,
  });
  const decision = contract.buildFrameItemEgressDecisionV4({
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    ...screenBindings,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  });
  assert.deepEqual(decision.frameFailureLedger.map(({ code }) => code), [
    "RIGHTS_UNRESOLVED",
    "PII_SCREEN_FAILED",
    "ASSET_UNRESOLVED",
    "LINEAGE_FIELD_MISSING",
    "UNSUPPORTED_RESPONSE_FORM",
  ]);
  assert.equal(decision.eligible, false);
  assert.equal(decision.exclusionCode, "RESTRICTED_EGRESS_CONTENT");
  assert.equal(decision.assetLedger.length, 2);
  assert.equal(decision.assetLedger.every((entry) => /^[a-f0-9]{64}$/u.test(entry.assetContentHash)), true);
  for (const preSampleForbidden of ["itemPseudonym", "sampleManifestHash", "providerPayload", "providerPayloadHash"]) {
    assert.equal(Object.hasOwn(decision, preSampleForbidden), false);
  }
  assert.equal(decision.itemEgressDecisionHash, calculateArtifactHash(decision, "itemEgressDecisionHash"));
});

test("P0 frame freeze evidence recomputes every runtime, parity, source, rights, screen, and asset decision", () => {
  const buildFrameFreezeEvidence = requiredFunction("buildFrameFreezeEvidenceV4");
  const runtimeConfigInput = runtimeConfigInputFixture();
  const runtimeConfigEvidence = contract.buildRuntimeConfigEvidenceV4(runtimeConfigInput);
  const provisionalSourceModuleManifest = contract.buildSourceModuleManifestV4(sourceManifestInputFixture());
  const item = frameItem({
    eligible: true,
    exclusionCode: null,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit: provisionalSourceModuleManifest.sourceCommit,
    sourceModuleHash: provisionalSourceModuleManifest.sourceModuleHash,
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
  });
  item.itemHash = contract.calculateItemContentHashV4(item);
  const sourceParityInput = parityInputFixture(item);
  const sourceParityEvidence = contract.buildThreeRouteSourceParityEvidenceV4(sourceParityInput);
  const sourceModuleManifestInput = sourceManifestInputFixture(sourceParityEvidence.routeExecutionTrustRootHash);
  const sourceModuleManifest = contract.buildSourceModuleManifestV4(sourceModuleManifestInput);
  const rightsDecisionInput = approvedRightsInputFixture();
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const screenBundle = screenEvidenceBundleFor(item);
  const { screenEvidence, scannerExecutionReceiptInventory, trustedScannerExecutionReceiptInventoryHash } = screenBundle;
  const itemEgressDecision = contract.buildFrameItemEgressDecisionV4({
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    screenEvidence,
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  });
  const input = {
    frameRows: [item],
    runtimeConfigInput,
    runtimeConfigEvidence,
    sourceParityInput,
    sourceParityEvidence,
    sourceModuleManifestInput,
    sourceModuleManifest,
    trustedRouteExecutionRootHash: sourceParityEvidence.routeExecutionTrustRootHash,
    trustedDependencyClosureRootHash: sourceModuleManifest.dependencyClosureTrustRootHash,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    itemScreenEvidence: [screenEvidence],
    itemEgressDecisions: [itemEgressDecision],
    scannerExecutionReceiptInventory,
    trustedScannerExecutionReceiptInventoryHash,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  };
  const evidence = buildFrameFreezeEvidence(input);
  assert.equal(evidence.runtimeConfigHash, runtimeConfigEvidence.runtimeConfigHash);
  assert.equal(evidence.sourceParityEvidenceHash, sourceParityEvidence.parityEvidenceHash);
  assert.equal(evidence.sourceModuleManifestHash, sourceModuleManifest.sourceModuleManifestHash);
  assert.equal(evidence.trustedRouteExecutionRootHash, sourceParityEvidence.routeExecutionTrustRootHash);
  assert.equal(evidence.trustedDependencyClosureRootHash, sourceModuleManifest.dependencyClosureTrustRootHash);
  assert.equal(evidence.rightsDecisionTableHash, rightsDecisionTable.rightsDecisionTableHash);
  assert.deepEqual(evidence.frameFailureLedger, []);
  assert.equal(evidence.frameFreezeEvidenceHash, calculateArtifactHash(evidence, "frameFreezeEvidenceHash"));

  const forgedDecision = structuredClone(itemEgressDecision);
  forgedDecision.eligible = false;
  forgedDecision.exclusionCode = "RESTRICTED_EGRESS_CONTENT";
  forgedDecision.itemEgressDecisionHash = calculateArtifactHash(forgedDecision, "itemEgressDecisionHash");
  assert.throws(
    () => buildFrameFreezeEvidence({ ...input, itemEgressDecisions: [forgedDecision] }),
    /egress decision.*recomput|exact protected item|mismatch/iu,
  );

  const forgedParityInput = structuredClone(sourceParityInput);
  for (const receiptField of [
    "converterRunnerReceipt",
    "normalizationRunnerReceipt",
    "publicProjectionRunnerReceipt",
  ]) {
    forgedParityInput[receiptField].sourceCommit = "b".repeat(40);
    forgedParityInput[receiptField].runnerReceiptHash = calculateArtifactHash(
      forgedParityInput[receiptField],
      "runnerReceiptHash",
    );
  }
  forgedParityInput.runtimeLoaderEvidence.converterRunnerReceiptHash = forgedParityInput.converterRunnerReceipt.runnerReceiptHash;
  forgedParityInput.runtimeLoaderEvidence.normalizationRunnerReceiptHash = forgedParityInput.normalizationRunnerReceipt.runnerReceiptHash;
  forgedParityInput.runtimeLoaderEvidence.publicProjectionRunnerReceiptHash = forgedParityInput.publicProjectionRunnerReceipt.runnerReceiptHash;
  forgedParityInput.routeExecutionTrustDescriptor = routeExecutionTrustDescriptorFor(forgedParityInput);
  const forgedParityEvidence = contract.buildThreeRouteSourceParityEvidenceV4(forgedParityInput);
  assert.throws(
    () => buildFrameFreezeEvidence({
      ...input,
      sourceParityInput: forgedParityInput,
      sourceParityEvidence: forgedParityEvidence,
    }),
    /source commit|route execution|source manifest|trusted/iu,
    "self-hashed route receipts from another commit must not cross the frozen source-manifest trust boundary",
  );

  const omittedFiles = sourceModuleManifestInput.files.slice(0, 1);
  const forgedClosureDescriptor = dependencyClosureTrustDescriptorFixture(omittedFiles);
  const forgedClosureRootHash = sha256Hex(canonicalJson(forgedClosureDescriptor));
  const forgedSourceManifestInput = {
    ...sourceModuleManifestInput,
    files: omittedFiles,
    dependencyClosureTrustDescriptor: forgedClosureDescriptor,
    trustedDependencyClosureRootHash: forgedClosureRootHash,
  };
  const forgedSourceManifest = contract.buildSourceModuleManifestV4(forgedSourceManifestInput);
  assert.throws(
    () => buildFrameFreezeEvidence({
      ...input,
      sourceModuleManifestInput: forgedSourceManifestInput,
      sourceModuleManifest: forgedSourceManifest,
    }),
    /trusted dependency|closure root|transitive source manifest/iu,
    "a self-consistent shorter dependency manifest must fail against the independently supplied closure root",
  );
});

test("P0 out-of-band route execution trust binds exact receipts and every route output root", () => {
  const runtimeConfigInput = runtimeConfigInputFixture();
  const runtimeConfigEvidence = contract.buildRuntimeConfigEvidenceV4(runtimeConfigInput);
  const provisionalSourceManifest = contract.buildSourceModuleManifestV4(sourceManifestInputFixture());
  const originalItem = frameItem({
    eligible: true,
    exclusionCode: null,
    runtimeConfigHash: runtimeConfigEvidence.runtimeConfigHash,
    sourceCommit: provisionalSourceManifest.sourceCommit,
    sourceModuleHash: provisionalSourceManifest.sourceModuleHash,
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
  });
  originalItem.itemHash = contract.calculateItemContentHashV4(originalItem);
  const originalParityInput = parityInputFixture(originalItem);
  const originalParityEvidence = contract.buildThreeRouteSourceParityEvidenceV4(originalParityInput);
  const originalRouteTrustRoot = originalParityEvidence.routeExecutionTrustRootHash;
  const sourceModuleManifestInput = sourceManifestInputFixture(originalRouteTrustRoot);
  const sourceModuleManifest = contract.buildSourceModuleManifestV4(sourceModuleManifestInput);
  assert.equal(originalParityEvidence.routeExecutionTrustRootHash, originalRouteTrustRoot);

  const resignedItem = structuredClone(originalItem);
  resignedItem.prompt.en = "Resigned four-route content that was not in the trusted extraction";
  resignedItem.itemHash = contract.calculateItemContentHashV4(resignedItem);
  const resignedParityInput = parityInputFixture(resignedItem);
  const resignedParityEvidence = contract.buildThreeRouteSourceParityEvidenceV4(resignedParityInput);
  const rightsDecisionInput = approvedRightsInputFixture();
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const screenBindings = egressScreenBindingsFor(resignedItem);
  const itemEgressDecision = contract.buildFrameItemEgressDecisionV4({
    item: resignedItem,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    ...screenBindings,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  });

  assert.throws(
    () => contract.buildFrameFreezeEvidenceV4({
      frameRows: [resignedItem],
      runtimeConfigInput,
      runtimeConfigEvidence,
      sourceParityInput: resignedParityInput,
      sourceParityEvidence: resignedParityEvidence,
      sourceModuleManifestInput,
      sourceModuleManifest,
      trustedRouteExecutionRootHash: originalRouteTrustRoot,
      trustedDependencyClosureRootHash: sourceModuleManifest.dependencyClosureTrustRootHash,
      rightsDecisionInput,
      rightsDecisionTable,
      trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
      itemScreenEvidence: [screenBindings.screenEvidence],
      itemEgressDecisions: [itemEgressDecision],
      scannerExecutionReceiptInventory: screenBindings.scannerExecutionReceiptInventory,
      trustedScannerExecutionReceiptInventoryHash: screenBindings.trustedScannerExecutionReceiptInventoryHash,
      trustedScreeningPolicyHash: hash("1"),
      trustedScannerImplementationHash: hash("2"),
      trustedScannerRunnerHash: hash("3"),
    }),
    /trusted route execution|execution root|route output|receipt/iu,
    "changing every route byte and self-signing new receipts must not preserve the out-of-band trusted route root",
  );
});

test("P0 frame registration has no caller-empty-ledger bypass when complete frame evidence is absent", () => {
  assert.throws(
    () => contract.buildFrameRegistrationV3({ frameFailureLedger: [] }),
    /complete frame freeze evidence|frameFreezeEvidence|runtimeConfigEvidence|sourceParityEvidence/iu,
  );
});

test("P0 parity, runtime-config, and transitive-source roots are bound into the source enumeration receipt", () => {
  const roots = {
    runtimeConfigEvidenceHash: hash("1"),
    sourceParityEvidenceHash: hash("2"),
    sourceModuleManifestHash: hash("3"),
  };
  const sourceModuleHash = hash("4");
  const receipt = contract.buildRuntimeSourceEnumerationReceiptV1({
    registrationHash: hash("5"),
    sourceCommit: "6".repeat(40),
    runtimeConfigHash: roots.runtimeConfigEvidenceHash,
    ...roots,
    extractorImplementationHash: hash("7"),
    extractorRunnerCommit: "8".repeat(40),
    extractorRunnerHash: hash("9"),
    rawEvidenceArtifactRootHash: hash("a"),
    enumeratedAt: "2026-08-25T05:40:00.000Z",
    gradeProjectionInvocations: contract.RUNTIME_SOURCE_ENUMERATION_GRADES.map((grade) => ({
      grade,
      itemLeaves: grade === "P5" ? [{
        itemId: "receipt-item-001",
        sourceItemHash: hash("b"),
        sourceModuleHash,
        runtimeProjectionHash: hash("c"),
        disposition: "RUNTIME_VISIBLE_SERIALIZED_ELIGIBLE",
        exclusionCode: null,
      }] : [],
    })),
  });
  assert.equal(receipt.runtimeConfigEvidenceHash, roots.runtimeConfigEvidenceHash);
  assert.equal(receipt.sourceParityEvidenceHash, roots.sourceParityEvidenceHash);
  assert.equal(receipt.sourceModuleManifestHash, roots.sourceModuleManifestHash);
  assert.equal(contract.validateRuntimeSourceEnumerationReceiptV1(receipt), true);
});

test("P0 replacement evidence uses immutable item-bound exclusion and append-only execution-ledger artifacts", () => {
  const buildLedger = requiredFunction("buildSampleExecutionLedgerV4");
  const buildExclusion = requiredFunction("buildPreResultExclusionEvidenceV4");
  const item = frameItem({
    eligible: false,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
  });
  const rightsDecisionInput = {
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
    registry: Object.fromEntries(contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId) => [sourceId, {
      disposition: "DENIED",
    }])),
    ownerApprovalClaimsBySource: {},
  };
  const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
  const screenBindings = egressScreenBindingsFor(item);
  const egressDecisionInput = {
    item,
    rightsDecisionInput,
    rightsDecisionTable,
    trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
    ...screenBindings,
    trustedScreeningPolicyHash: hash("1"),
    trustedScannerImplementationHash: hash("2"),
    trustedScannerRunnerHash: hash("3"),
  };
  const egressDecision = contract.buildFrameItemEgressDecisionV4(egressDecisionInput);
  const exclusionRunnerReceipt = contract.buildPreResultExclusionRunnerReceiptV4({
    itemId: item.itemId,
    itemHash: egressDecision.itemHash,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    reasonCode: "RIGHTS_EXPLICITLY_DENIED",
    registeredAt: "2026-08-25T05:50:00.000Z",
    exclusionSourceArtifactHash: egressDecision.itemEgressDecisionHash,
    issuerImplementationHash: hash("6"),
    runnerCommit: "7".repeat(40),
    runnerHash: hash("8"),
    executedAt: "2026-08-25T05:51:00.000Z",
  });
  const exclusionEvidence = buildExclusion({
    exclusionSourceArtifact: egressDecision,
    egressDecisionInput,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    reasonCode: "RIGHTS_EXPLICITLY_DENIED",
    registeredAt: "2026-08-25T05:50:00.000Z",
    exclusionRunnerReceipt,
  });
  const exclusionEvidenceInventory = contract.buildPreResultExclusionEvidenceInventoryV4({
    exclusionEvidences: [exclusionEvidence],
    recordedAt: "2026-08-25T05:52:00.000Z",
  });
  assert.equal(exclusionEvidence.itemId, item.itemId);
  assert.equal(exclusionEvidence.itemHash, contract.calculateItemContentHashV4(item));
  assert.equal(
    exclusionEvidence.exclusionEvidenceHash,
    calculateArtifactHash(exclusionEvidence, "exclusionEvidenceHash"),
  );

  const beforeLedger = buildLedger({
    sampleManifestHash: hash("8"),
    previousExecutionLedgerHash: null,
    recorderImplementationHash: hash("9"),
    recorderRunnerReceiptHash: hash("a"),
    recordedAt: "2026-08-25T05:49:00.000Z",
    entries: [],
  });
  assert.equal(beforeLedger.executionLedgerHash, calculateArtifactHash(beforeLedger, "executionLedgerHash"));
  assert.equal(beforeLedger.entryCount, 0);

  let getterCalls = 0;
  const accessorLedgerInput = {
    sampleManifestHash: hash("8"),
    previousExecutionLedgerHash: null,
    recorderImplementationHash: hash("9"),
    recorderRunnerReceiptHash: hash("a"),
    recordedAt: "2026-08-25T05:49:00.000Z",
  };
  Object.defineProperty(accessorLedgerInput, "entries", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return [{ eventType: "PROVIDER_ATTEMPT" }];
    },
  });
  assert.throws(() => buildLedger(accessorLedgerInput), /accessor|non-JSON/iu);
  assert.equal(getterCalls, 0, "hidden attempts must be rejected without executing their getter");

  const reverseChronologyEntries = [
    {
      schemaVersion: "SampleExecutionLedgerEntryV1",
      sequenceNumber: 1,
      eventType: "PRE_RESULT_REPLACEMENT_REGISTERED",
      itemId: item.itemId,
      itemHash: exclusionEvidence.itemHash,
      eventArtifactHash: hash("b"),
      occurredAt: "2026-08-25T05:48:00.000Z",
    },
    {
      schemaVersion: "SampleExecutionLedgerEntryV1",
      sequenceNumber: 2,
      eventType: "PRE_RESULT_REPLACEMENT_REGISTERED",
      itemId: item.itemId,
      itemHash: exclusionEvidence.itemHash,
      eventArtifactHash: hash("c"),
      occurredAt: "2026-08-25T05:47:00.000Z",
    },
  ].map((entry) => ({
    ...entry,
    entryHash: calculateArtifactHash(entry, "entryHash"),
  }));
  assert.throws(() => buildLedger({
    sampleManifestHash: hash("8"),
    previousExecutionLedgerHash: null,
    recorderImplementationHash: hash("9"),
    recorderRunnerReceiptHash: hash("a"),
    recordedAt: "2026-08-25T05:49:00.000Z",
    entries: reverseChronologyEntries,
  }), /chronolog|nondecreasing|monotonic/iu,
  "append-only ledger occurrence times must be monotonic with sequence order");

  const forgedExclusion = structuredClone(exclusionEvidence);
  forgedExclusion.itemId = "different-item";
  assert.throws(
    () => contract.buildPreResultReplacementV3({
      exclusionEvidence: forgedExclusion,
      exclusionEvidenceInventory,
      trustedExclusionEvidenceInventoryHash: exclusionEvidenceInventory.exclusionEvidenceInventoryHash,
      beforeExecutionLedger: beforeLedger,
      trustedBeforeExecutionLedgerHash: beforeLedger.executionLedgerHash,
    }),
    /exclusion evidence.*hash|immutable.*exclusion|item-bound/iu,
  );
});

test("P0 replacement rejects a fully re-signed exclusion outside the exact out-of-band evidence inventory", () => {
  const buildExclusionRunnerReceipt = requiredFunction("buildPreResultExclusionRunnerReceiptV4");
  const buildExclusionInventory = requiredFunction("buildPreResultExclusionEvidenceInventoryV4");
  const buildRestrictedChain = (item) => {
    item.itemHash = contract.calculateItemContentHashV4(item);
    const scannerReceipt = contract.buildScannerExecutionReceiptV4({
      itemId: item.itemId,
      itemHash: item.itemHash,
      screeningPolicyHash: hash("1"),
      scannerImplementationHash: hash("2"),
      scannerRunnerHash: hash("3"),
      scannerExecutionStatus: "COMPLETED",
      piiEvidenceRootHash: hash("4"),
      secretEvidenceRootHash: hash("5"),
      piiFindingCount: 0,
      secretFindingCount: 0,
      executedAt: "2026-08-25T05:30:00.000Z",
    });
    const scannerInventory = contract.buildScannerExecutionReceiptInventoryV4({
      scannerExecutionReceipts: [scannerReceipt],
      recordedAt: "2026-08-25T05:31:00.000Z",
    });
    const screenEvidence = contract.buildItemEgressScreenEvidenceV4({
      scannerExecutionReceipt: scannerReceipt,
    });
    const rightsDecisionInput = {
      sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
      registry: Object.fromEntries(contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4.map((sourceId) => [sourceId, {
        disposition: "DENIED",
      }])),
      ownerApprovalClaimsBySource: {},
    };
    const rightsDecisionTable = contract.buildRightsEgressDecisionTableV4(rightsDecisionInput);
    const egressDecisionInput = {
      item,
      rightsDecisionInput,
      rightsDecisionTable,
      trustedOwnerApprovalRootHash: rightsDecisionTable.ownerApprovalClaimRootHash,
      screenEvidence,
      scannerExecutionReceiptInventory: scannerInventory,
      trustedScannerExecutionReceiptInventoryHash: scannerInventory.scannerExecutionReceiptInventoryHash,
      trustedScreeningPolicyHash: hash("1"),
      trustedScannerImplementationHash: hash("2"),
      trustedScannerRunnerHash: hash("3"),
    };
    const egressDecision = contract.buildFrameItemEgressDecisionV4(egressDecisionInput);
    const exclusionRunnerReceipt = buildExclusionRunnerReceipt({
      itemId: item.itemId,
      itemHash: item.itemHash,
      exclusionCode: "RESTRICTED_EGRESS_CONTENT",
      reasonCode: "RIGHTS_EXPLICITLY_DENIED",
      registeredAt: "2026-08-25T05:50:00.000Z",
      exclusionSourceArtifactHash: egressDecision.itemEgressDecisionHash,
      issuerImplementationHash: hash("6"),
      runnerCommit: "7".repeat(40),
      runnerHash: hash("8"),
      executedAt: "2026-08-25T05:51:00.000Z",
    });
    const exclusionEvidence = contract.buildPreResultExclusionEvidenceV4({
      exclusionSourceArtifact: egressDecision,
      egressDecisionInput,
      exclusionCode: "RESTRICTED_EGRESS_CONTENT",
      reasonCode: "RIGHTS_EXPLICITLY_DENIED",
      registeredAt: "2026-08-25T05:50:00.000Z",
      exclusionRunnerReceipt,
    });
    const exclusionInventory = buildExclusionInventory({
      exclusionEvidences: [exclusionEvidence],
      recordedAt: "2026-08-25T05:52:00.000Z",
    });
    return { exclusionEvidence, exclusionInventory };
  };

  const original = buildRestrictedChain(frameItem({
    eligible: false,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
  }));
  const resigned = buildRestrictedChain(frameItem({
    itemId: "ca-item-resigned-002",
    eligible: false,
    exclusionCode: "RESTRICTED_EGRESS_CONTENT",
    sourceIds: [...contract.RIGHTS_REGISTRY_REQUIRED_SOURCES_V4],
  }));
  assert.throws(
    () => contract.buildPreResultReplacementV3({
      exclusionEvidence: resigned.exclusionEvidence,
      exclusionEvidenceInventory: resigned.exclusionInventory,
      trustedExclusionEvidenceInventoryHash: original.exclusionInventory.exclusionEvidenceInventoryHash,
    }),
    /out-of-band.*exclusion|trusted.*evidence inventory|exclusion evidence inventory/iu,
    "a completely re-signed exclusion chain must fail before replacement against the original exact inventory",
  );

  const callerExtendedInventory = structuredClone(original.exclusionInventory);
  callerExtendedInventory.entries[0].callerCertified = true;
  callerExtendedInventory.exclusionEvidenceRootHash = sha256Hex(canonicalJson(callerExtendedInventory.entries));
  callerExtendedInventory.exclusionEvidenceInventoryHash = calculateArtifactHash(
    callerExtendedInventory,
    "exclusionEvidenceInventoryHash",
  );
  assert.throws(
    () => contract.buildPreResultReplacementV3({
      exclusionEvidence: original.exclusionEvidence,
      exclusionEvidenceInventory: callerExtendedInventory,
      trustedExclusionEvidenceInventoryHash: callerExtendedInventory.exclusionEvidenceInventoryHash,
    }),
    /exclusion evidence inventory.*closed|inventory entry.*field|caller.*certif/iu,
    "even an out-of-band hash must identify a closed exact exclusion evidence tuple",
  );
});

test("P0 replacement rejects caller empty arrays and arbitrary hashes before sample recomputation", () => {
  assert.throws(
    () => contract.buildPreResultReplacementV3({
      providerAttemptReceipts: [],
      referenceLabels: [],
      evaluationResults: [],
      exclusion: {
        itemId: "arbitrary-item",
        itemHash: hash("1"),
        exclusionCode: "RESTRICTED_EGRESS_CONTENT",
        evidenceHash: hash("2"),
        registeredAt: "2026-08-25T05:50:00.000Z",
      },
    }),
    /append-only execution ledger|caller empty arrays|immutable exclusion evidence/iu,
  );
});

test("P1 null-lineage warnings are item-bound and aggregated into the real cluster audit", () => {
  const frameRows = makeSecureFrameRows();
  const audit = contract.buildClusterAuditV3({
    frameRows,
    registrationHash: LEGACY_REGISTRATION_HASH,
    clusteringAlgorithmHash: LEGACY_CLUSTERING_ALGORITHM_HASH,
    auditedAt: LEGACY_FROZEN_AT,
  });
  assert.equal(audit.anomalyLedger.length, frameRows.length);
  assert.equal(audit.anomalyLedger.every((entry) => entry.code === "LINEAGE_UNAVAILABLE_NO_SOURCE_EDGE"), true);
  assert.equal(audit.anomalyLedger.every((entry) => entry.itemId && entry.itemHash && entry.anomalyHash), true);
  assert.equal(
    audit.anomalyLedgerRootHash,
    sha256Hex(canonicalJson(audit.anomalyLedger.map(({ anomalyHash }) => anomalyHash).sort())),
  );
});

test("P1 source manifest binds repository, commit, and dependency-closure runner evidence", () => {
  const files = [
    { repoRelativePath: "data/california/a.ts", gitBlobOid: "a".repeat(40) },
    { repoRelativePath: "lib/server/questionStore.ts", gitBlobOid: "b".repeat(40) },
  ];
  const dependencyClosureRunnerReceipt = {
    schemaVersion: "DependencyClosureRunnerReceiptV1",
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: "c".repeat(40),
    extractorImplementationHash: hash("d"),
    runnerCommit: "e".repeat(40),
    runnerHash: hash("f"),
    executedAt: "2026-08-25T05:20:00.000Z",
  };
  dependencyClosureRunnerReceipt.runnerReceiptHash = calculateArtifactHash(
    dependencyClosureRunnerReceipt,
    "runnerReceiptHash",
  );
  const dependencyClosureTrustDescriptor = dependencyClosureTrustDescriptorFixture(files);
  const manifest = contract.buildSourceModuleManifestV4({
    repositoryIdentity: "wy51ai/MAIS-MVP",
    sourceCommit: "c".repeat(40),
    routeExecutionTrustRootHash: sha256Hex(canonicalJson(routeExecutionTrustDescriptorFixture("c".repeat(40)))),
    dependencyClosureExtractorImplementationHash: hash("d"),
    dependencyClosureRunnerReceipt,
    dependencyClosureTrustDescriptor,
    trustedDependencyClosureRootHash: sha256Hex(canonicalJson(dependencyClosureTrustDescriptor)),
    files,
  });
  assert.equal(manifest.repositoryIdentity, "wy51ai/MAIS-MVP");
  assert.equal(manifest.sourceCommit, "c".repeat(40));
  assert.equal(manifest.dependencyClosureRunnerReceiptHash, dependencyClosureRunnerReceipt.runnerReceiptHash);
  assert.equal(manifest.sourceModuleHash, sha256Hex(canonicalJson(files)));
  assert.equal(manifest.sourceModuleManifestHash, calculateArtifactHash(manifest, "sourceModuleManifestHash"));
});

test("P0 dependency-closure evidence cannot omit a transitive file and self-sign new extractor roots", () => {
  const input = sourceManifestInputFixture();
  const manifest = contract.buildSourceModuleManifestV4(input);
  assert.equal(manifest.dependencyClosureTrustRootHash, input.trustedDependencyClosureRootHash);
  assert.equal(manifest.dependencyClosureTrustDescriptor.sourceModuleHash, manifest.sourceModuleHash);

  const omittedFiles = input.files.slice(0, 1);
  const forgedDescriptor = dependencyClosureTrustDescriptorFixture(omittedFiles);
  const forgedReceipt = {
    ...input.dependencyClosureRunnerReceipt,
    runnerHash: hash("0"),
  };
  forgedReceipt.runnerReceiptHash = calculateArtifactHash(forgedReceipt, "runnerReceiptHash");
  forgedDescriptor.runnerHash = forgedReceipt.runnerHash;
  assert.throws(
    () => contract.buildSourceModuleManifestV4({
      ...input,
      files: omittedFiles,
      dependencyClosureRunnerReceipt: forgedReceipt,
      dependencyClosureTrustDescriptor: forgedDescriptor,
    }),
    /trusted dependency|closure root|transitive|trust descriptor/iu,
    "deleting a dependency and recomputing caller-controlled receipt/descriptor hashes must fail against the frozen root",
  );
});
