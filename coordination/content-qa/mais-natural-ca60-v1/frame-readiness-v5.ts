import { createHash } from "node:crypto";
import { chmod, link, mkdir, open, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";

import {
  jcsHash,
  canonicalJson,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";
import {
  LINEAGE_RULE_HASH_V4,
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  V4_LOCALE_POLICY,
  buildRuntimeConfigEvidenceV4,
  canonicalizeStrictItemJsonV4,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs";
import {
  auditRuntimeHomologyV1,
} from "./clustering-audit.mjs";
import {
  createQuestionStoreCaliforniaAdapterV1,
} from "./question-store-source";
import {
  extractCaliforniaRuntimeInventoryV1,
} from "./runtime-extractor";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const ACTIVATION_RECEIPT_HASH = "086c84b661ba9f9720f6afea8c4e0fcd50e3c4d0247da318f23235c52c3d2442";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OID = /^[0-9a-f]{40}$/u;
const POTENTIAL_EGRESS_BATCH = "us-ca-k5-knowledge-point-practice-v1";

const OWNER_APPROVAL_REQUIRED_SOURCE_IDS = Object.freeze([
  "california-math-common-core-skill",
  "cde-ca-ccss-math-resources",
  "common-core-state-standards-public-license",
]);

const DENIED_SOURCE_IDS = Object.freeze([
  "caaspp-math-blueprints-and-specifications",
  "caaspp-smarter-balanced-public-assessment-resources",
  "ccss-math-textbook-app",
  "cde-2023-math-framework",
  "cde-copyright-statement",
  "cde-math-instructional-materials-adoption",
  "owner-provided-authorized-us-math-materials",
  "us-copyright-office-ideas-facts-methods",
]);

const SCANNER_POLICY_V5 = Object.freeze({
  schemaVersion: "NaturalCaLocalPiiSecretScreenPolicyV1",
  treatment: "MATCH_HASH_ONLY_NO_RAW_MATCH_RETENTION",
  piiRules: Object.freeze([
    Object.freeze({ code: "EMAIL_ADDRESS", source: "\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b", flags: "giu" }),
    Object.freeze({ code: "US_SSN", source: "\\b\\d{3}-\\d{2}-\\d{4}\\b", flags: "gu" }),
  ]),
  secretRules: Object.freeze([
    Object.freeze({ code: "API_KEY_LIKE", source: "\\b(?:sk|xox[baprs]|ghp|github_pat|AIza)[-_A-Za-z0-9]{8,}\\b", flags: "gu" }),
    Object.freeze({ code: "AUTHORIZATION_BEARER", source: "\\bBearer\\s+[A-Za-z0-9._~+/-]{8,}", flags: "giu" }),
    Object.freeze({ code: "PRIVATE_KEY_HEADER", source: "-----BEGIN(?: RSA| EC| OPENSSH)? PRIVATE KEY-----", flags: "gu" }),
    Object.freeze({ code: "CREDENTIAL_URI", source: "\\b(?:mongodb(?:\\+srv)?|postgres(?:ql)?|mysql|redis):\\/\\/[^\\s]+", flags: "giu" }),
    Object.freeze({ code: "INTERNAL_ABSOLUTE_PATH", source: "(?:\\/Users\\/|\\/Volumes\\/|[A-Za-z]:\\\\Users\\\\)[^\\s]+", flags: "gu" }),
  ]),
});

type JsonRecord = Record<string, unknown>;

type ScannerFindingV5 = {
  findingKind: "PII" | "SECRET";
  code: string;
  fieldPathHash: string;
  evidenceHash: string;
};

type ScannerResultV5 = {
  schemaVersion: "NaturalCaItemPiiSecretScreenV1";
  itemId: string;
  itemHash: string;
  scannerPolicyHash: string;
  piiFindingCount: number;
  secretFindingCount: number;
  passed: boolean;
  findings: ScannerFindingV5[];
  selfHash: string;
};

function assertGitOid(value: string, field: string) {
  if (!GIT_OID.test(value)) throw new TypeError(`${field} must be an exact lowercase 40-hex Git object ID`);
}

function assertSha256(value: string, field: string) {
  if (!SHA256.test(value)) throw new TypeError(`${field} must be an exact lowercase SHA-256 digest`);
}

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function withSelfHash<T extends JsonRecord, F extends string = "selfHash">(
  body: T,
  field: F = "selfHash" as F,
) {
  return Object.freeze({ ...body, [field]: jcsHash(body) }) as Readonly<T & Record<F, string>>;
}

function countsBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => codePointCompare(left.value, right.value));
}

export function buildFrameRightsPolicyV5() {
  const decisions = [
    ...OWNER_APPROVAL_REQUIRED_SOURCE_IDS.map((sourceId) => ({
      sourceId,
      disposition: "OWNER_APPROVAL_REQUIRED_FOR_MAIS_ORIGINAL_OUTPUT_EGRESS",
      providerEgressAllowed: false,
      rationaleCode: "ORIGINAL_OUTPUT_EGRESS_REQUIRES_EXACT_OWNER_HASH",
    })),
    ...DENIED_SOURCE_IDS.map((sourceId) => ({
      sourceId,
      disposition: "DENIED_FOR_CA60_V1_PROVIDER_EGRESS",
      providerEgressAllowed: false,
      rationaleCode: sourceId === "ccss-math-textbook-app"
        ? "UPSTREAM_PRACTICE_WAS_PORTED_WITHOUT_AN_EGRESS_LICENSE_ROOT"
        : "SOURCE_POLICY_IS_METADATA_OR_LOCAL_ANALYSIS_ONLY_OR_PERMISSION_REQUIRED",
    })),
  ].sort((left, right) => codePointCompare(left.sourceId, right.sourceId));
  return withSelfHash({
    schemaVersion: "NaturalCaFrameRightsPolicyV1",
    artifactKind: "CONSERVATIVE_OWNER_DECISION_REQUEST_NOT_EGRESS_AUTHORIZATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    policyVersion: "ca60-frame-rights-v5-1",
    potentialEgressBatch: POTENTIAL_EGRESS_BATCH,
    ownerApprovalRequiredSourceIds: [...OWNER_APPROVAL_REQUIRED_SOURCE_IDS],
    deniedSourceIds: [...DENIED_SOURCE_IDS],
    decisions,
    copyrightedLongFormSourceAllowed: false,
    providerEgressAuthorized: false,
    rightsApprovalHash: null,
  });
}

function stringLeaves(value: unknown, fieldPath = "$", seen = new Set<object>()): Array<{ fieldPath: string; value: string }> {
  if (typeof value === "string") return [{ fieldPath, value }];
  if (value === null || typeof value !== "object") return [];
  if (seen.has(value)) throw new TypeError("natural item scanner rejects cyclic input");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.flatMap((entry, index) => stringLeaves(entry, `${fieldPath}[${index}]`, seen));
    }
    return Object.keys(value as JsonRecord).sort(codePointCompare)
      .flatMap((key) => stringLeaves((value as JsonRecord)[key], `${fieldPath}.${key}`, seen));
  } finally {
    seen.delete(value);
  }
}

function findingsForRules({
  itemId,
  itemHash,
  payload,
  findingKind,
  rules,
}: {
  itemId: string;
  itemHash: string;
  payload: unknown;
  findingKind: "PII" | "SECRET";
  rules: ReadonlyArray<{ code: string; source: string; flags: string }>;
}) {
  const findings: ScannerFindingV5[] = [];
  for (const { fieldPath, value } of stringLeaves(payload)) {
    for (const rule of rules) {
      const expression = new RegExp(rule.source, rule.flags);
      for (const match of value.matchAll(expression)) {
        const matched = match[0];
        findings.push({
          findingKind,
          code: rule.code,
          fieldPathHash: jcsHash(fieldPath),
          evidenceHash: jcsHash([itemId, itemHash, findingKind, rule.code, fieldPath, matched]),
        });
      }
    }
  }
  return findings;
}

export function scanNaturalItemV5({
  itemId,
  itemHash,
  payload,
}: {
  itemId: string;
  itemHash: string;
  payload: unknown;
}): ScannerResultV5 {
  if (typeof itemId !== "string" || itemId.length === 0) throw new TypeError("scanner itemId is required");
  assertSha256(itemHash, "scanner itemHash");
  const findings = [
    ...findingsForRules({ itemId, itemHash, payload, findingKind: "PII", rules: SCANNER_POLICY_V5.piiRules }),
    ...findingsForRules({ itemId, itemHash, payload, findingKind: "SECRET", rules: SCANNER_POLICY_V5.secretRules }),
  ].sort((left, right) => codePointCompare(left.evidenceHash, right.evidenceHash));
  const piiFindingCount = findings.filter(({ findingKind }) => findingKind === "PII").length;
  const secretFindingCount = findings.filter(({ findingKind }) => findingKind === "SECRET").length;
  return withSelfHash({
    schemaVersion: "NaturalCaItemPiiSecretScreenV1" as const,
    itemId,
    itemHash,
    scannerPolicyHash: jcsHash(SCANNER_POLICY_V5),
    piiFindingCount,
    secretFindingCount,
    passed: findings.length === 0,
    findings,
  }) as ScannerResultV5;
}

function batchFor(record: JsonRecord) {
  const raw = record.rawQuestion as JsonRecord | null;
  return typeof raw?.batch === "string" ? raw.batch : "UNKNOWN_BATCH";
}

function sourceIdsFor(record: JsonRecord) {
  const raw = record.rawQuestion as JsonRecord | null;
  return Array.isArray(raw?.sourceIds)
    ? raw.sourceIds.filter((value): value is string => typeof value === "string").sort(codePointCompare)
    : [];
}

function hasVisualOrAsset(record: JsonRecord) {
  const question = record.convertedQuestion as JsonRecord | null;
  return question?.diagram !== null && question?.diagram !== undefined
    || Array.isArray(question?.questionAssets) && question.questionAssets.length > 0
    || question?.questionAssets !== null && question?.questionAssets !== undefined && !Array.isArray(question.questionAssets);
}

function itemPayload(record: JsonRecord) {
  const question = record.attemptQuestion as JsonRecord | null;
  return {
    prompt: question?.prompt ?? null,
    options: question?.options ?? null,
    answer: question?.answer ?? null,
    acceptedAnswers: question?.acceptedAnswers ?? [],
    explanation: question?.explanation ?? null,
  };
}

function potentialCandidate(record: JsonRecord, scan: ScannerResultV5) {
  const sources = sourceIdsFor(record);
  return batchFor(record) === POTENTIAL_EGRESS_BATCH
    && sources.length > 0
    && sources.every((sourceId) => OWNER_APPROVAL_REQUIRED_SOURCE_IDS.includes(sourceId as never))
    && !hasVisualOrAsset(record)
    && scan.passed
    && typeof record.recordHash === "string"
    && SHA256.test(record.recordHash);
}

function runtimeConfigEvidence(batchCounts: Array<{ value: string; count: number }>) {
  return buildRuntimeConfigEvidenceV4({
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: [...RUNTIME_SOURCE_ENUMERATION_GRADES],
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: V4_LOCALE_POLICY,
    activePackStateHash: jcsHash(batchCounts),
    featureFlagStateHash: jcsHash({ californiaRuntimeFeatureFlags: [] }),
  }) as unknown as JsonRecord & { runtimeConfigHash: string };
}

export async function runCaliforniaFrameReadinessV5({
  sourceCommit,
  runnerCommit,
  runnerHash,
  createdAt = new Date().toISOString(),
}: {
  sourceCommit: string;
  runnerCommit: string;
  runnerHash: string;
  createdAt?: string;
}) {
  assertGitOid(sourceCommit, "sourceCommit");
  assertGitOid(runnerCommit, "runnerCommit");
  assertSha256(runnerHash, "runnerHash");
  if (!Number.isFinite(Date.parse(createdAt))) throw new TypeError("createdAt must be an RFC3339 timestamp");

  const inventory = await extractCaliforniaRuntimeInventoryV1({
    adapter: createQuestionStoreCaliforniaAdapterV1(),
  });
  const itemRecords = [...inventory.itemRecords]
    .sort((left, right) => codePointCompare(left.itemId, right.itemId)) as unknown as JsonRecord[];
  const homologyAudit = auditRuntimeHomologyV1({ itemRecords });
  const rightsPolicy = buildFrameRightsPolicyV5();
  const scannerResults = itemRecords.map((record) => scanNaturalItemV5({
    itemId: String(record.itemId),
    itemHash: String(record.recordHash),
    payload: itemPayload(record),
  }));
  const scanByItem = new Map(scannerResults.map((screen) => [screen.itemId, screen]));
  const assignmentByItem = new Map(homologyAudit.itemAssignments.map((row: JsonRecord) => [row.itemId, row]));
  const candidateRecords = itemRecords.filter((record) => potentialCandidate(record, scanByItem.get(String(record.itemId))!));
  const candidateClusterIds = [...new Set(candidateRecords.map((record) => (
    String(assignmentByItem.get(record.itemId)?.homologyClusterId)
  )))].sort(codePointCompare);
  const representativeByCluster = new Map<string, JsonRecord>();
  for (const record of candidateRecords) {
    const clusterId = String(assignmentByItem.get(record.itemId)?.homologyClusterId);
    const previous = representativeByCluster.get(clusterId);
    if (!previous || codePointCompare(String(record.itemId), String(previous.itemId)) < 0) {
      representativeByCluster.set(clusterId, record);
    }
  }
  const potentialStratumClusterCounts = countsBy([...representativeByCluster.values()].map((record) => {
    const question = record.convertedQuestion as JsonRecord;
    return `${String(question.type)}::${String(question.difficulty)}`;
  })).map(({ value: stratum, count: clusterCount }) => ({ stratum, clusterCount }));
  const batchCounts = countsBy(itemRecords.map(batchFor));
  const sourceIdCounts = countsBy(itemRecords.flatMap(sourceIdsFor));
  const configEvidence = runtimeConfigEvidence(batchCounts);
  const candidateIdentityLeaves = candidateRecords.map((record) => ({
    itemId: record.itemId,
    itemRecordHash: record.recordHash,
    homologyClusterId: assignmentByItem.get(record.itemId)?.homologyClusterId,
  })).sort((left, right) => codePointCompare(String(left.itemId), String(right.itemId)));
  const visualOrAssetRestrictedCount = itemRecords.filter((record) => (
    batchFor(record) === POTENTIAL_EGRESS_BATCH && hasVisualOrAsset(record)
  )).length;
  const piiRestrictedCount = scannerResults.filter(({ piiFindingCount }) => piiFindingCount > 0).length;
  const secretRestrictedCount = scannerResults.filter(({ secretFindingCount }) => secretFindingCount > 0).length;
  const observedSourceIds = sourceIdCounts.map(({ value }) => value);
  const policySourceIds = [...OWNER_APPROVAL_REQUIRED_SOURCE_IDS, ...DENIED_SOURCE_IDS].sort(codePointCompare);
  const unclassifiedSourceIds = observedSourceIds.filter((sourceId) => !policySourceIds.includes(sourceId));
  const missingPolicySourceIds = policySourceIds.filter((sourceId) => !observedSourceIds.includes(sourceId));
  const blockers = [
    "OWNER_RIGHTS_APPROVAL_HASH_REQUIRED",
    "OWNER_LINEAGE_RULE_APPROVAL_HASH_REQUIRED",
    "A11_INDEPENDENT_EXTRACTOR_RERUN_REQUIRED",
    "A22_CLEAN_EXECUTION_ENVIRONMENT_RECEIPT_REQUIRED",
    "FORMAL_FRAME_FREEZE_NOT_PERFORMED",
    "FORMAL_SAMPLE_FREEZE_NOT_PERFORMED",
    ...(unclassifiedSourceIds.length > 0 ? ["UNCLASSIFIED_SOURCE_ID"] : []),
    ...(candidateClusterIds.length < 60 ? ["FEWER_THAN_60_POTENTIAL_ELIGIBLE_CLUSTERS"] : []),
  ];
  const receipt = withSelfHash({
    schemaVersion: "NaturalCaFrameReadinessReceiptV1",
    artifactKind: "DESCRIPTIVE_LOCAL_FRAME_READINESS_NOT_FRAME_REGISTRATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    activationReceiptHash: ACTIVATION_RECEIPT_HASH,
    status: "OWNER_RIGHTS_AND_LINEAGE_CONFIRMATION_REQUIRED",
    sourceCommit,
    runnerCommit,
    runnerHash,
    runtimeConfigHash: configEvidence.runtimeConfigHash,
    runtimeVisibleItemCount: inventory.runtimeVisibleItemCount,
    runtimeInventoryRootHash: inventory.itemRecordRootHash,
    fullFrameClusterCount: homologyAudit.clusterCount,
    fullFrameSingletonCount: homologyAudit.singletonCount,
    fullFrameHomologyRootHash: homologyAudit.auditRootHash,
    frameFailureCount: inventory.frameFailureLedger.length,
    frameFailureLedgerRootHash: inventory.frameFailureLedgerRootHash,
    batchCounts,
    sourceIdCounts,
    observedSourceIdSetHash: jcsHash(observedSourceIds),
    rightsPolicyHash: rightsPolicy.selfHash,
    lineageRuleHash: LINEAGE_RULE_HASH_V4,
    potentialEligibleBatch: POTENTIAL_EGRESS_BATCH,
    potentialEligibleItemCount: candidateRecords.length,
    potentialEligibleContentRootHash: jcsHash(candidateIdentityLeaves),
    potentialEligibleClusterCount: candidateClusterIds.length,
    potentialEligibleClusterSetHash: jcsHash(candidateClusterIds),
    visualOrAssetRestrictedCount,
    piiRestrictedCount,
    secretRestrictedCount,
    scannerPolicyHash: jcsHash(SCANNER_POLICY_V5),
    scannerResultRootHash: jcsHash(scannerResults.map(({ itemId, selfHash }) => [itemId, selfHash])),
    nonemptyPotentialStrata: potentialStratumClusterCounts.length,
    potentialStratumClusterCounts,
    unclassifiedSourceIds,
    missingPolicySourceIds,
    formalFrameFrozen: false,
    formalSampleFrozen: false,
    questionEgressAuthorized: false,
    providerExecutionAuthorized: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    protectedCustodyManifestHash: null,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "READINESS_ONLY_NOT_A_FRAME_OR_SAMPLE_REGISTRATION",
    blockers,
    createdAt,
  });
  const ownerDecisionRequest = withSelfHash({
    schemaVersion: "NaturalCaFrameOwnerDecisionRequestV1",
    artifactKind: "OWNER_DECISION_REQUEST_NOT_AUTHORIZATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    sourceCommit,
    runnerCommit,
    runnerHash,
    readinessReceiptHash: receipt.selfHash,
    runtimeConfigHash: configEvidence.runtimeConfigHash,
    runtimeInventoryRootHash: inventory.itemRecordRootHash,
    fullFrameHomologyRootHash: homologyAudit.auditRootHash,
    rightsPolicyHash: rightsPolicy.selfHash,
    requestedOwnerApprovedSourceIds: [...OWNER_APPROVAL_REQUIRED_SOURCE_IDS],
    explicitDeniedSourceIds: [...DENIED_SOURCE_IDS],
    requestedLineageRuleHash: LINEAGE_RULE_HASH_V4,
    potentialEligibleItemCount: candidateRecords.length,
    potentialEligibleClusterCount: candidateClusterIds.length,
    potentialEligibleContentRootHash: jcsHash(candidateIdentityLeaves),
    requestedDecision: "APPROVE_EXACT_THREE_SOURCE_MAIS_ORIGINAL_TEXT_EGRESS_AND_FINE_GRAINED_LINEAGE_RULE_OR_KEEP_FRAME_BLOCKED",
    requestedEgressScope: "FROZEN_CA60_SAMPLE_ITEMS_SELECTED_ONLY_FROM_THE_POTENTIAL_ELIGIBLE_CONTENT_ROOT",
    copyrightedLongFormSourceAllowed: false,
    visualOrAssetEgressAllowed: false,
    questionEgressAuthorized: false,
    providerExecutionAuthorized: false,
    authorizationCreatedByThisArtifact: false,
    createdAt,
  }, "requestHash");

  return Object.freeze({
    receipt,
    ownerDecisionRequest,
    rightsPolicy,
    protectedArtifacts: Object.freeze({ itemRecords, homologyAudit, scannerResults }),
  });
}

function sha256Bytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function writeExclusiveAtomic(filePath: string, bytes: Buffer) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(filePath), 0o700);
  const temporaryPath = `${filePath}.tmp-${process.pid}-${sha256Bytes(bytes).slice(0, 16)}`;
  let handle;
  try {
    handle = await open(temporaryPath, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporaryPath, filePath);
    await unlink(temporaryPath);
  } catch (error) {
    if (handle) await handle.close();
    try { await unlink(temporaryPath); } catch { /* absent temporary file is expected */ }
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(filePath);
    if (!existing.equals(bytes)) throw new Error(`append-only protected artifact conflict at ${path.basename(filePath)}`);
  }
  await chmod(filePath, 0o600);
}

function jsonBytes(value: unknown) {
  return Buffer.from(`${canonicalJson(canonicalizeStrictItemJsonV4(value))}\n`, "utf8");
}

function jsonlBytes(values: unknown[]) {
  return Buffer.from(`${values.map((value) => canonicalJson(canonicalizeStrictItemJsonV4(value))).join("\n")}\n`, "utf8");
}

export async function persistProtectedFrameReadinessV5({
  outputRoot,
  result,
}: {
  outputRoot: string;
  result: Awaited<ReturnType<typeof runCaliforniaFrameReadinessV5>>;
}) {
  if (!path.isAbsolute(outputRoot)) throw new TypeError("protected output root must be absolute");
  await mkdir(outputRoot, { recursive: true, mode: 0o700 });
  await chmod(outputRoot, 0o700);
  const payloads = new Map<string, Buffer>([
    ["runtime-inventory.jsonl", jsonlBytes(result.protectedArtifacts.itemRecords)],
    ["homology-audit.json", jsonBytes(result.protectedArtifacts.homologyAudit)],
    ["scanner-results.jsonl", jsonlBytes(result.protectedArtifacts.scannerResults)],
    ["rights-policy.json", jsonBytes(result.rightsPolicy)],
  ]);
  for (const [relativePath, bytes] of payloads) {
    await writeExclusiveAtomic(path.join(outputRoot, relativePath), bytes);
  }
  const entries = [...payloads.entries()].map(([relativePath, bytes]) => ({
    relativePath,
    byteLength: bytes.byteLength,
    sha256: sha256Bytes(bytes),
  })).sort((left, right) => codePointCompare(left.relativePath, right.relativePath));
  const custodyManifest = withSelfHash({
    schemaVersion: "NaturalCaFrameReadinessCustodyManifestV1",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    sourceCommit: result.receipt.sourceCommit,
    runnerCommit: result.receipt.runnerCommit,
    runnerHash: result.receipt.runnerHash,
    fileCount: entries.length,
    entries,
    containsNaturalQuestionText: true,
    protectedStorageRequired: true,
    gitTrackingAllowed: false,
    providerExecutionAuthorized: false,
    createdAt: result.receipt.createdAt,
  });
  const custodyBytes = jsonBytes(custodyManifest);
  await writeExclusiveAtomic(path.join(outputRoot, "custody-manifest.json"), custodyBytes);
  const persistedReceiptBody = {
    ...result.receipt,
    protectedCustodyManifestHash: custodyManifest.selfHash,
  } as JsonRecord;
  delete persistedReceiptBody.selfHash;
  const persistedReceipt = withSelfHash(persistedReceiptBody);
  const receiptBytes = jsonBytes(persistedReceipt);
  const persistedOwnerDecisionRequestBody = {
    ...result.ownerDecisionRequest,
    readinessReceiptHash: persistedReceipt.selfHash,
  } as JsonRecord;
  delete persistedOwnerDecisionRequestBody.requestHash;
  const persistedOwnerDecisionRequest = withSelfHash(persistedOwnerDecisionRequestBody, "requestHash");
  const requestBytes = jsonBytes(persistedOwnerDecisionRequest);
  await writeExclusiveAtomic(path.join(outputRoot, "frame-readiness-receipt.json"), receiptBytes);
  await writeExclusiveAtomic(path.join(outputRoot, "owner-decision-request.json"), requestBytes);
  const files = [
    ...payloads.keys(),
    "custody-manifest.json",
    "frame-readiness-receipt.json",
    "owner-decision-request.json",
  ].sort(codePointCompare);
  for (const relativePath of files) {
    const metadata = await stat(path.join(outputRoot, relativePath));
    if ((metadata.mode & 0o777) !== 0o600) throw new Error(`protected artifact mode drift at ${relativePath}`);
  }
  return Object.freeze({
    schemaVersion: "NaturalCaFrameReadinessPersistenceResultV1",
    outputRoot,
    files,
    custodyManifestHash: custodyManifest.selfHash,
    persistedReceiptHash: persistedReceipt.selfHash,
    ownerDecisionRequestHash: persistedOwnerDecisionRequest.requestHash,
    runCompletionHash: jcsHash([
      custodyManifest.selfHash,
      persistedReceipt.selfHash,
      persistedOwnerDecisionRequest.requestHash,
    ]),
    receipt: persistedReceipt,
    ownerDecisionRequest: persistedOwnerDecisionRequest,
    providerRequestCount: 0,
  });
}
