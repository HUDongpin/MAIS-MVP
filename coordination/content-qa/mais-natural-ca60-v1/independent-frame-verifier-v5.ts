#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { generatedCaliforniaQuestions } from "@/data/usCaliforniaTopics";
import {
  usCaliforniaQuestionGenerationMetadata,
  usCaliforniaQuestions,
} from "@/data/usCaliforniaQuestions";
import {
  __questionStoreTestHooks,
  getPublicQuestionsFromStore,
  getQuestionForAttemptFromStore,
  getQuestionTopicCatalogFromStore,
} from "@/lib/server/questionStore";
import type { CurriculumProfile, GradeId } from "@/types";

import {
  canonicalJson,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  RUNTIME_SOURCE_ENUMERATION_GRADES,
  V4_LOCALE_POLICY,
  buildRuntimeConfigEvidenceV4,
  calculateExactContentHashV3,
  calculateLineageKeyHashV3,
  calculateNormalizedPromptHashV3,
  calculateTemplateSkeletonHashV3,
  canonicalizeStrictItemJsonV4,
  normalizedEditSimilarityV3,
  normalizePromptForNearV3,
  trigramJaccardV3,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs";
import { jcsHash } from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const POTENTIAL_EGRESS_BATCH = "us-ca-k5-knowledge-point-practice-v1";
const SHA256 = /^[0-9a-f]{64}$/u;
const REVIEWER_ONLY_PATHS = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/independent-frame-verifier-v5.test.ts",
  "coordination/content-qa/mais-natural-ca60-v1/independent-frame-verifier-v5.ts",
  "coordination/session-logs/2026-08-26-A11-natural-ca60-frame-readiness-v5.md",
]);
const OWNER_APPROVAL_SOURCE_IDS = Object.freeze([
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
const CALIFORNIA_PROFILE = Object.freeze({
  region: "US",
  publisher: "US_CA_MATH",
}) satisfies CurriculumProfile;
const RESPONSE_FORMS = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);
const SCANNER_POLICY = Object.freeze({
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

type HomologyLeaf = {
  itemId: string;
  grade: unknown;
  canonicalTopic: string;
  responseForm: string;
  difficulty: unknown;
  prompt: unknown;
  options: unknown;
  storedAnswer: unknown;
  acceptedAnswers: unknown;
  explanation: unknown;
  lineageKind: string | null;
  batchId: string | null;
  clusterId: string | null;
  generationTemplate: string | null;
  sourceLessonSlug: string | null;
  topicId: unknown;
  packageId: string | null;
  lineageKeyHash: string | null;
  itemHash: string;
  exactDuplicateGroupId: string;
  normalizedPromptHash: string;
  templateSkeletonHash: string;
  normalizedPrompt: string;
};

function plainObject(value: unknown): value is JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function codePointCompare(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function strictNormalized(value: unknown) {
  return canonicalizeStrictItemJsonV4(value);
}

function strictHash(value: unknown) {
  return sha256Hex(canonicalJson(strictNormalized(value)));
}

function strictEqual(left: unknown, right: unknown) {
  return canonicalJson(strictNormalized(left)) === canonicalJson(strictNormalized(right));
}

function withoutField(value: JsonRecord, field: string) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
}

function withSelfHash<T extends JsonRecord>(body: T) {
  return Object.freeze({ ...body, selfHash: jcsHash(body) });
}

function sha256Bytes(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function git(args: string[], encoding: BufferEncoding | null = "utf8") {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding,
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function parseIndependentFrameVerifierArgsV5(argv: string[]) {
  if (argv.length !== 6
    || argv[0] !== "--protected-root"
    || argv[2] !== "--a22-receipt"
    || argv[4] !== "--reviewed-at") {
    throw new TypeError("usage: independent-frame-verifier-v5.ts --protected-root ABSOLUTE_PATH --a22-receipt ABSOLUTE_PATH --reviewed-at RFC3339");
  }
  const protectedRoot = argv[1];
  const a22ReceiptPath = argv[3];
  const reviewedAt = argv[5];
  if (!path.isAbsolute(protectedRoot) || !path.isAbsolute(a22ReceiptPath)) {
    throw new TypeError("protected root and A22 receipt path must be absolute");
  }
  if (!Number.isFinite(Date.parse(reviewedAt)) || new Date(reviewedAt).toISOString() !== reviewedAt) {
    throw new TypeError("reviewed-at must be canonical RFC3339 UTC with milliseconds");
  }
  return { protectedRoot, a22ReceiptPath, reviewedAt };
}

async function readJson(filePath: string) {
  const value: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!plainObject(value)) throw new TypeError(`protected artifact ${path.basename(filePath)} must be an object`);
  return value;
}

async function readJsonl(filePath: string) {
  const text = await readFile(filePath, "utf8");
  return text.split("\n").filter((line) => line.length > 0).map((line, index) => {
    const value: unknown = JSON.parse(line);
    if (!plainObject(value)) throw new TypeError(`protected JSONL row ${index} must be an object`);
    return value;
  });
}

function assertUniqueStableIds(rows: JsonRecord[], label: string) {
  const ids = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (typeof row.id !== "string" || row.id.length === 0) throw new TypeError(`${label}[${index}] lacks a stable ID`);
    if (ids.has(row.id)) throw new TypeError(`${label} contains a duplicate ID`);
    ids.add(row.id);
  }
}

function idSet(rows: JsonRecord[]) {
  return new Set(rows.map((row) => String(row.id)));
}

function sameSet(left: Set<string>, right: Set<string>) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function publicProjection(question: JsonRecord) {
  return {
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
  };
}

function materialPresence(question: JsonRecord) {
  return {
    answer: typeof question.answer === "string" && question.answer.length > 0
      || Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0,
    options: Array.isArray(question.options) && question.options.length > 0,
    explanation: plainObject(question.explanation),
  };
}

async function independentlyExtractRuntime(protectedRows: JsonRecord[]) {
  __questionStoreTestHooks.clearCaches();
  const rawRows = structuredClone(generatedCaliforniaQuestions) as unknown as JsonRecord[];
  const convertedRows = structuredClone(usCaliforniaQuestions) as unknown as JsonRecord[];
  assertUniqueStableIds(rawRows, "raw source");
  assertUniqueStableIds(convertedRows, "converted source");
  const invariantFailures: string[] = [];
  if (!sameSet(idSet(rawRows), idSet(convertedRows))) invariantFailures.push("RAW_CONVERTED_ID_SET_MISMATCH");
  const publicRows: JsonRecord[] = [];
  const gradeCounts: Array<{ grade: string; itemCount: number }> = [];
  for (const grade of RUNTIME_SOURCE_ENUMERATION_GRADES) {
    const rows = structuredClone(await getPublicQuestionsFromStore({
      curriculumProfile: CALIFORNIA_PROFILE,
      grade: grade as GradeId,
    })) as unknown as JsonRecord[];
    const catalog = structuredClone(await getQuestionTopicCatalogFromStore({
      curriculumProfile: CALIFORNIA_PROFILE,
      grade: grade as GradeId,
    })) as unknown as JsonRecord;
    assertUniqueStableIds(rows, `public grade ${grade}`);
    const topics = Array.isArray(catalog.topics) ? catalog.topics.filter(plainObject) : [];
    const topicIds = new Set(topics.map((topic) => String(topic.topicId)));
    if (catalog.totalQuestions !== rows.length) invariantFailures.push("TOPIC_CATALOG_COUNT_MISMATCH");
    for (const row of rows) {
      const profile = plainObject(row.curriculumProfile) ? row.curriculumProfile : {};
      if (row.grade !== grade || row.curriculumTrack !== "US_CA_MATH"
        || !(row.publisher === "US_CA_MATH" || profile.publisher === "US_CA_MATH")
        || !(row.region === "US" || profile.region === "US")) {
        invariantFailures.push("PUBLIC_GRADE_OR_PROFILE_MISMATCH");
      }
      if (!topicIds.has(String(row.topicId))) invariantFailures.push("TOPIC_CATALOG_MEMBERSHIP_MISMATCH");
      strictNormalized(row);
    }
    gradeCounts.push({ grade, itemCount: rows.length });
    publicRows.push(...rows);
  }
  assertUniqueStableIds(publicRows, "13-grade public union");
  if (!sameSet(idSet(convertedRows), idSet(publicRows))) invariantFailures.push("CONVERTED_PUBLIC_ID_SET_MISMATCH");
  const rawById = new Map(rawRows.map((row) => [String(row.id), row]));
  const convertedById = new Map(convertedRows.map((row) => [String(row.id), row]));
  const metadataById = usCaliforniaQuestionGenerationMetadata as unknown as Record<string, unknown>;
  const recomputedRows: JsonRecord[] = [];
  for (const publicQuestion of publicRows) {
    const itemId = String(publicQuestion.id);
    const rawQuestion = rawById.get(itemId) ?? null;
    const convertedQuestion = convertedById.get(itemId) ?? null;
    const attemptValue = await getQuestionForAttemptFromStore(itemId, CALIFORNIA_PROFILE);
    const attemptQuestion = attemptValue === null ? null : structuredClone(attemptValue) as unknown as JsonRecord;
    const metadata = metadataById[itemId] === undefined ? null : structuredClone(metadataById[itemId]);
    if (convertedQuestion === null || attemptQuestion === null
      || !strictEqual(convertedQuestion, attemptQuestion)
      || !strictEqual(publicProjection(convertedQuestion), publicQuestion)) {
      invariantFailures.push("ROUTE_PARITY_MISMATCH");
    }
    const record = {
      itemId,
      grade: publicQuestion.grade,
      rawQuestion,
      convertedQuestion,
      publicQuestion,
      attemptQuestion,
      generationMetadata: metadata,
      materialPresence: materialPresence(attemptQuestion ?? publicQuestion),
      retainedForDefectReview: true,
      exclusionCode: null,
    };
    strictNormalized(record);
    recomputedRows.push({ ...record, recordHash: strictHash(record) });
  }
  recomputedRows.sort((left, right) => codePointCompare(String(left.itemId), String(right.itemId)));
  const protectedById = new Map(protectedRows.map((row) => [String(row.itemId), row]));
  const mismatchEvidenceHashes: string[] = [];
  if (protectedById.size !== protectedRows.length) invariantFailures.push("PROTECTED_DUPLICATE_ITEM_ID");
  for (const row of recomputedRows) {
    const itemId = String(row.itemId);
    const protectedRow = protectedById.get(itemId);
    if (protectedRow === undefined || !strictEqual(row, protectedRow)) {
      mismatchEvidenceHashes.push(jcsHash(["RUNTIME_ROW_MISMATCH", jcsHash(itemId)]));
    }
  }
  for (const protectedId of protectedById.keys()) {
    if (!recomputedRows.some((row) => row.itemId === protectedId)) {
      mismatchEvidenceHashes.push(jcsHash(["PROTECTED_ONLY_ITEM", jcsHash(protectedId)]));
    }
  }
  mismatchEvidenceHashes.sort(codePointCompare);
  const recordHashes = recomputedRows.map((row) => String(row.recordHash)).sort(codePointCompare);
  return {
    recomputedRows,
    runtimeVisibleItemCount: recomputedRows.length,
    itemRecordRootHash: jcsHash(recordHashes),
    frameFailureLedgerRootHash: jcsHash([]),
    invariantFailureCount: invariantFailures.length,
    invariantFailureCodeRootHash: jcsHash(invariantFailures.sort(codePointCompare)),
    itemMismatchCount: mismatchEvidenceHashes.length,
    itemMismatchEvidenceRootHash: jcsHash(mismatchEvidenceHashes),
    gradeCounts,
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function lineageFor(rawQuestion: unknown, convertedQuestion: JsonRecord, metadata: unknown) {
  const raw = plainObject(rawQuestion) ? rawQuestion : {};
  const meta = plainObject(metadata) ? metadata : {};
  const batchId = stringOrNull(raw.batch) ?? stringOrNull(meta.batch);
  const clusterId = stringOrNull(raw.clusterId);
  const generationTemplate = stringOrNull(raw.generationTemplate);
  const sourceLessonSlug = stringOrNull(raw.sourceLessonSlug);
  let lineageKind: string | null = null;
  if (batchId === "us-ca-k5-knowledge-point-practice-v1" && clusterId !== null) lineageKind = "K5";
  if (batchId === "us-ca-g6-g12-v2" && generationTemplate !== null) lineageKind = "G6_12";
  if (batchId === "ccss-textbook-practice-v1" && sourceLessonSlug !== null) lineageKind = "CCSS";
  const lineageRow = {
    lineageKind,
    batchId,
    clusterId,
    generationTemplate,
    sourceLessonSlug,
    topicId: convertedQuestion.topicId,
    responseForm: String(convertedQuestion.type),
  };
  return {
    ...lineageRow,
    packageId: stringOrNull(raw.sourcePackageId),
    lineageKeyHash: calculateLineageKeyHashV3(lineageRow),
  };
}

function buildHomologyLeaf(record: JsonRecord): HomologyLeaf {
  const question = record.convertedQuestion;
  if (!plainObject(question)) throw new TypeError("protected runtime record lacks a converted question");
  const itemId = stringOrNull(record.itemId) ?? stringOrNull(question.id);
  const responseForm = stringOrNull(question.type);
  const canonicalTopic = stringOrNull(question.canonicalTopicId) ?? stringOrNull(question.topicId);
  if (itemId === null || responseForm === null || canonicalTopic === null || !RESPONSE_FORMS.includes(responseForm)) {
    throw new TypeError("runtime record is outside the frozen homology domain");
  }
  const lineage = lineageFor(record.rawQuestion, question, record.generationMetadata);
  const content = canonicalizeStrictItemJsonV4({
    prompt: question.prompt,
    options: question.options ?? null,
    storedAnswer: question.answer ?? null,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanation: question.explanation ?? null,
  }) as JsonRecord;
  const row = {
    itemId,
    grade: question.grade,
    canonicalTopic,
    difficulty: question.difficulty,
    prompt: content.prompt,
    options: content.options,
    storedAnswer: content.storedAnswer,
    acceptedAnswers: content.acceptedAnswers,
    explanation: content.explanation,
    ...lineage,
    responseForm,
  };
  const itemHash = sha256Hex(canonicalJson(canonicalizeStrictItemJsonV4({
    itemId,
    grade: row.grade,
    canonicalTopic,
    responseForm,
    difficulty: row.difficulty,
    ...content,
    lineage,
  })));
  return {
    ...row,
    itemHash,
    exactDuplicateGroupId: `exact-${calculateExactContentHashV3(row)}`,
    normalizedPromptHash: calculateNormalizedPromptHashV3(row),
    templateSkeletonHash: calculateTemplateSkeletonHashV3(row),
    normalizedPrompt: normalizePromptForNearV3(row.prompt),
  };
}

function independentlyAuditHomology(itemRecords: JsonRecord[]) {
  const leaves = itemRecords.map(buildHomologyLeaf)
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const parent = leaves.map((_, index) => index);
  const find = (start: number) => {
    let root = start;
    while (parent[root] !== root) root = parent[root];
    let cursor = start;
    while (parent[cursor] !== cursor) {
      const next = parent[cursor];
      parent[cursor] = root;
      cursor = next;
    }
    return root;
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (leftRoot < rightRoot) parent[rightRoot] = leftRoot;
    else parent[leftRoot] = rightRoot;
  };
  const edges: JsonRecord[] = [];
  const connectBy = (field: "exactDuplicateGroupId" | "templateSkeletonHash" | "lineageKeyHash", edgeType: string) => {
    const firstByHash = new Map<string, number>();
    for (const [index, leaf] of leaves.entries()) {
      const value = leaf[field];
      if (value === null) continue;
      const prior = firstByHash.get(value);
      if (prior === undefined) {
        firstByHash.set(value, index);
        continue;
      }
      union(prior, index);
      const [left, right] = codePointCompare(leaves[prior].itemId, leaf.itemId) <= 0
        ? [leaves[prior], leaf] : [leaf, leaves[prior]];
      edges.push({ edgeType, leftItemId: left.itemId, rightItemId: right.itemId, evidenceHash: value });
    }
  };
  connectBy("exactDuplicateGroupId", "EXACT");
  connectBy("templateSkeletonHash", "TEMPLATE");
  connectBy("lineageKeyHash", "SOURCE");
  const nearBuckets = new Map<string, number[]>();
  for (const [index, leaf] of leaves.entries()) {
    const key = canonicalJson([leaf.responseForm, leaf.canonicalTopic]);
    nearBuckets.set(key, [...(nearBuckets.get(key) ?? []), index]);
  }
  for (const bucket of nearBuckets.values()) {
    for (let leftPosition = 0; leftPosition < bucket.length; leftPosition += 1) {
      for (let rightPosition = leftPosition + 1; rightPosition < bucket.length; rightPosition += 1) {
        const leftIndex = bucket[leftPosition];
        const rightIndex = bucket[rightPosition];
        const left = leaves[leftIndex];
        const right = leaves[rightIndex];
        const jaccard = trigramJaccardV3(left.normalizedPrompt, right.normalizedPrompt);
        if (jaccard < 0.9) continue;
        const edit = normalizedEditSimilarityV3(left.normalizedPrompt, right.normalizedPrompt);
        if (edit < 0.92) continue;
        union(leftIndex, rightIndex);
        const [orderedLeft, orderedRight] = codePointCompare(left.itemId, right.itemId) <= 0
          ? [left, right] : [right, left];
        edges.push({
          edgeType: "NEAR",
          leftItemId: orderedLeft.itemId,
          rightItemId: orderedRight.itemId,
          trigramJaccard: jaccard,
          normalizedEditSimilarity: edit,
          evidenceHash: sha256Hex(canonicalJson({
            leftNormalizedPromptHash: orderedLeft.normalizedPromptHash,
            rightNormalizedPromptHash: orderedRight.normalizedPromptHash,
            trigramJaccard: jaccard,
            normalizedEditSimilarity: edit,
          })),
        });
      }
    }
  }
  const membersByRoot = new Map<number, HomologyLeaf[]>();
  for (const [index, leaf] of leaves.entries()) {
    const root = find(index);
    membersByRoot.set(root, [...(membersByRoot.get(root) ?? []), leaf]);
  }
  const blockingAnomalies: JsonRecord[] = [];
  const components = [...membersByRoot.values()].map((members) => {
    const ordered = [...members].sort((left, right) => codePointCompare(left.itemId, right.itemId));
    const homologyClusterId = `homology-${sha256Hex(canonicalJson(ordered.map(({ itemId, itemHash }) => [itemId, itemHash])))}`;
    const canonicalTopics = [...new Set(ordered.map((member) => member.canonicalTopic))].sort(codePointCompare);
    const frameShare = ordered.length / leaves.length;
    if (frameShare > 0.05) blockingAnomalies.push({
      code: "OVERSIZED_COMPONENT_GT_5_PERCENT", homologyClusterId, itemCount: ordered.length, frameShare,
    });
    if (canonicalTopics.length > 2) blockingAnomalies.push({
      code: "BRIDGE_COMPONENT_GT_2_TOPICS", homologyClusterId, itemCount: ordered.length, canonicalTopics,
    });
    return {
      homologyClusterId,
      itemCount: ordered.length,
      frameShare,
      canonicalTopics,
      itemIds: ordered.map((member) => member.itemId),
    };
  }).sort((left, right) => codePointCompare(left.homologyClusterId, right.homologyClusterId));
  const clusterByItemId = new Map<string, string>();
  for (const component of components) {
    component.itemIds.forEach((itemId) => clusterByItemId.set(itemId, component.homologyClusterId));
  }
  const itemAssignments = leaves.map((leaf) => ({
    itemId: leaf.itemId,
    itemHash: leaf.itemHash,
    exactDuplicateGroupId: leaf.exactDuplicateGroupId,
    normalizedPromptHash: leaf.normalizedPromptHash,
    templateSkeletonHash: leaf.templateSkeletonHash,
    lineageKind: leaf.lineageKind,
    lineageKeyHash: leaf.lineageKeyHash,
    homologyClusterId: clusterByItemId.get(leaf.itemId),
  }));
  edges.sort((left, right) => (
    codePointCompare(String(left.leftItemId), String(right.leftItemId))
      || codePointCompare(String(left.rightItemId), String(right.rightItemId))
      || codePointCompare(String(left.edgeType), String(right.edgeType))
  ));
  blockingAnomalies.sort((left, right) => (
    codePointCompare(String(left.homologyClusterId), String(right.homologyClusterId))
      || codePointCompare(String(left.code), String(right.code))
  ));
  const sizeCounts = new Map<number, number>();
  components.forEach((component) => sizeCounts.set(component.itemCount, (sizeCounts.get(component.itemCount) ?? 0) + 1));
  const componentSizeDistribution = [...sizeCounts.entries()]
    .map(([itemCount, componentCount]) => ({ itemCount, componentCount }))
    .sort((left, right) => left.itemCount - right.itemCount);
  const largest20Components = [...components]
    .sort((left, right) => right.itemCount - left.itemCount
      || codePointCompare(left.homologyClusterId, right.homologyClusterId))
    .slice(0, 20);
  const singletonCount = components.filter(({ itemCount }) => itemCount === 1).length;
  const body = {
    schemaVersion: "RuntimeHomologyAuditDiagnosticV1",
    designId: "MAIS-NATURAL-CA60-V4",
    diagnosticOnly: true,
    runtimeVisibleItemCount: leaves.length,
    clusterCount: components.length,
    singletonCount,
    singletonRate: singletonCount / components.length,
    edgeCount: edges.length,
    edges,
    components,
    componentSizeDistribution,
    largest20Components,
    itemAssignments,
    blockingAnomalies,
    freezeEligible: blockingAnomalies.length === 0,
    providerRequestCount: 0,
  };
  return { ...body, auditRootHash: sha256Hex(canonicalJson(body)) };
}

function stringLeaves(value: unknown, fieldPath = "$", seen = new Set<object>()): Array<{ fieldPath: string; value: string }> {
  if (typeof value === "string") return [{ fieldPath, value }];
  if (value === null || typeof value !== "object") return [];
  if (seen.has(value)) throw new TypeError("scanner rejects cyclic input");
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.flatMap((entry, index) => stringLeaves(entry, `${fieldPath}[${index}]`, seen));
    return Object.keys(value as JsonRecord).sort(codePointCompare)
      .flatMap((key) => stringLeaves((value as JsonRecord)[key], `${fieldPath}.${key}`, seen));
  } finally {
    seen.delete(value);
  }
}

function independentScan(record: JsonRecord) {
  const itemId = String(record.itemId);
  const itemHash = String(record.recordHash);
  const question = plainObject(record.attemptQuestion) ? record.attemptQuestion : {};
  const payload = {
    prompt: question.prompt ?? null,
    options: question.options ?? null,
    answer: question.answer ?? null,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanation: question.explanation ?? null,
  };
  const findings: JsonRecord[] = [];
  const groups = [
    { findingKind: "PII", rules: SCANNER_POLICY.piiRules },
    { findingKind: "SECRET", rules: SCANNER_POLICY.secretRules },
  ] as const;
  for (const { fieldPath, value } of stringLeaves(payload)) {
    for (const { findingKind, rules } of groups) {
      for (const rule of rules) {
        for (const match of value.matchAll(new RegExp(rule.source, rule.flags))) {
          findings.push({
            findingKind,
            code: rule.code,
            fieldPathHash: jcsHash(fieldPath),
            evidenceHash: jcsHash([itemId, itemHash, findingKind, rule.code, fieldPath, match[0]]),
          });
        }
      }
    }
  }
  findings.sort((left, right) => codePointCompare(String(left.evidenceHash), String(right.evidenceHash)));
  const body = {
    schemaVersion: "NaturalCaItemPiiSecretScreenV1",
    itemId,
    itemHash,
    scannerPolicyHash: jcsHash(SCANNER_POLICY),
    piiFindingCount: findings.filter(({ findingKind }) => findingKind === "PII").length,
    secretFindingCount: findings.filter(({ findingKind }) => findingKind === "SECRET").length,
    passed: findings.length === 0,
    findings,
  };
  return { ...body, selfHash: jcsHash(body) };
}

function batchFor(record: JsonRecord) {
  const raw = plainObject(record.rawQuestion) ? record.rawQuestion : {};
  return typeof raw.batch === "string" ? raw.batch : "UNKNOWN_BATCH";
}

function sourceIdsFor(record: JsonRecord) {
  const raw = plainObject(record.rawQuestion) ? record.rawQuestion : {};
  return Array.isArray(raw.sourceIds)
    ? raw.sourceIds.filter((value): value is string => typeof value === "string").sort(codePointCompare)
    : [];
}

function hasVisualOrAsset(record: JsonRecord) {
  const question = plainObject(record.convertedQuestion) ? record.convertedQuestion : {};
  return question.diagram !== null && question.diagram !== undefined
    || Array.isArray(question.questionAssets) && question.questionAssets.length > 0
    || question.questionAssets !== null && question.questionAssets !== undefined && !Array.isArray(question.questionAssets);
}

function countsBy(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].map(([value, count]) => ({ value, count }))
    .sort((left, right) => codePointCompare(left.value, right.value));
}

function independentlyRecomputeEligibility(records: JsonRecord[], homology: JsonRecord, protectedScans: JsonRecord[]) {
  const scans = records.map(independentScan);
  const protectedScanByItem = new Map(protectedScans.map((row) => [String(row.itemId), row]));
  const scannerMismatchEvidence = scans
    .filter((row) => !strictEqual(row, protectedScanByItem.get(row.itemId)))
    .map((row) => jcsHash(["SCANNER_ROW_MISMATCH", jcsHash(row.itemId)]))
    .sort(codePointCompare);
  const assignments = Array.isArray(homology.itemAssignments)
    ? homology.itemAssignments.filter(plainObject) : [];
  const assignmentByItem = new Map(assignments.map((row) => [String(row.itemId), row]));
  const scanByItem = new Map(scans.map((row) => [row.itemId, row]));
  const candidates = records.filter((record) => {
    const sourceIds = sourceIdsFor(record);
    const scan = scanByItem.get(String(record.itemId));
    return batchFor(record) === POTENTIAL_EGRESS_BATCH
      && sourceIds.length > 0
      && sourceIds.every((sourceId) => OWNER_APPROVAL_SOURCE_IDS.includes(sourceId as never))
      && !hasVisualOrAsset(record)
      && scan?.passed === true
      && typeof record.recordHash === "string" && SHA256.test(record.recordHash);
  });
  const candidateClusterIds = [...new Set(candidates.map((record) => (
    String(assignmentByItem.get(String(record.itemId))?.homologyClusterId)
  )))].sort(codePointCompare);
  const candidateIdentityLeaves = candidates.map((record) => ({
    itemId: record.itemId,
    itemRecordHash: record.recordHash,
    homologyClusterId: assignmentByItem.get(String(record.itemId))?.homologyClusterId,
  })).sort((left, right) => codePointCompare(String(left.itemId), String(right.itemId)));
  const representativeByCluster = new Map<string, JsonRecord>();
  for (const record of candidates) {
    const clusterId = String(assignmentByItem.get(String(record.itemId))?.homologyClusterId);
    const previous = representativeByCluster.get(clusterId);
    if (!previous || codePointCompare(String(record.itemId), String(previous.itemId)) < 0) {
      representativeByCluster.set(clusterId, record);
    }
  }
  const potentialStratumClusterCounts = countsBy([...representativeByCluster.values()].map((record) => {
    const question = plainObject(record.convertedQuestion) ? record.convertedQuestion : {};
    return `${String(question.type)}::${String(question.difficulty)}`;
  })).map(({ value: stratum, count: clusterCount }) => ({ stratum, clusterCount }));
  const batchCounts = countsBy(records.map(batchFor));
  const sourceIdCounts = countsBy(records.flatMap(sourceIdsFor));
  const config = buildRuntimeConfigEvidenceV4({
    actor: "AUTHENTICATED_STUDENT",
    curriculumProfile: "US_CA_MATH",
    gradeProjectionUnion: [...RUNTIME_SOURCE_ENUMERATION_GRADES],
    maxAnswerChoices: 0,
    accommodationOptionTruncation: false,
    perStudentReducedChoicesApplied: false,
    localePolicy: V4_LOCALE_POLICY,
    activePackStateHash: jcsHash(batchCounts),
    featureFlagStateHash: jcsHash({ californiaRuntimeFeatureFlags: [] }),
  }) as JsonRecord;
  return {
    scannerMismatchCount: scannerMismatchEvidence.length,
    scannerMismatchEvidenceRootHash: jcsHash(scannerMismatchEvidence),
    scannerPolicyHash: jcsHash(SCANNER_POLICY),
    scannerResultRootHash: jcsHash(scans.map(({ itemId, selfHash }) => [itemId, selfHash])),
    piiRestrictedCount: scans.filter(({ piiFindingCount }) => piiFindingCount > 0).length,
    secretRestrictedCount: scans.filter(({ secretFindingCount }) => secretFindingCount > 0).length,
    batchCounts,
    sourceIdCounts,
    runtimeConfigHash: String(config.runtimeConfigHash),
    potentialEligibleItemCount: candidates.length,
    potentialEligibleClusterCount: candidateClusterIds.length,
    potentialEligibleContentRootHash: jcsHash(candidateIdentityLeaves),
    potentialEligibleClusterSetHash: jcsHash(candidateClusterIds),
    potentialStratumClusterCounts,
    nonemptyPotentialStrata: potentialStratumClusterCounts.length,
    visualOrAssetRestrictedCount: records.filter((record) => (
      batchFor(record) === POTENTIAL_EGRESS_BATCH && hasVisualOrAsset(record)
    )).length,
  };
}

function equalCanonical(left: unknown, right: unknown) {
  return canonicalJson(canonicalizeStrictItemJsonV4(left)) === canonicalJson(canonicalizeStrictItemJsonV4(right));
}

export async function independentlyVerifyFrameReadinessV5({
  protectedRoot,
  a22ReceiptPath,
  reviewedAt,
}: {
  protectedRoot: string;
  a22ReceiptPath: string;
  reviewedAt: string;
}) {
  const files = {
    inventory: path.join(protectedRoot, "runtime-inventory.jsonl"),
    homology: path.join(protectedRoot, "homology-audit.json"),
    scanners: path.join(protectedRoot, "scanner-results.jsonl"),
    rights: path.join(protectedRoot, "rights-policy.json"),
    custody: path.join(protectedRoot, "custody-manifest.json"),
    readiness: path.join(protectedRoot, "frame-readiness-receipt.json"),
    ownerRequest: path.join(protectedRoot, "owner-decision-request.json"),
  };
  const [protectedRows, protectedHomology, protectedScans, rights, custody, readiness, ownerRequest, a22Receipt] = await Promise.all([
    readJsonl(files.inventory),
    readJson(files.homology),
    readJsonl(files.scanners),
    readJson(files.rights),
    readJson(files.custody),
    readJson(files.readiness),
    readJson(files.ownerRequest),
    readJson(a22ReceiptPath),
  ]);
  if (readiness.designId !== DESIGN_ID || readiness.registrationHash !== REGISTRATION_HASH) {
    throw new Error("reviewed readiness identity mismatch");
  }
  const reviewedSourceCommit = String(readiness.sourceCommit);
  if (!/^[0-9a-f]{40}$/u.test(reviewedSourceCommit)) throw new Error("reviewed source commit is invalid");
  const verifierCommit = String(git(["rev-parse", "HEAD"])).trim();
  const gitStatus = String(git(["status", "--porcelain", "--untracked-files=all"]));
  const diffPaths = String(git(["diff", "--name-only", `${reviewedSourceCommit}..${verifierCommit}`]))
    .trim().split("\n").filter(Boolean).sort(codePointCompare);
  const sourceTreeRuntimeUnchanged = diffPaths.every((repoPath) => REVIEWER_ONLY_PATHS.includes(repoPath as never));
  const verifierBytes = git(["show", `${verifierCommit}:coordination/content-qa/mais-natural-ca60-v1/independent-frame-verifier-v5.ts`], null) as Buffer;
  const verifierImplementationHash = sha256Bytes(verifierBytes);
  const checks: Array<{ code: string; passed: boolean }> = [];
  const check = (code: string, passed: boolean) => checks.push({ code, passed });
  check("VERIFIER_WORKTREE_CLEAN", gitStatus.length === 0);
  check("REVIEWED_RUNTIME_SOURCE_UNCHANGED", sourceTreeRuntimeUnchanged);
  const protectedRootStat = await stat(protectedRoot);
  check("PROTECTED_ROOT_MODE_0700", (protectedRootStat.mode & 0o777) === 0o700);
  const protectedFileStats = await Promise.all(Object.values(files).map((filePath) => stat(filePath)));
  check("PROTECTED_FILE_MODES_0600", protectedFileStats.every((metadata) => (metadata.mode & 0o777) === 0o600));
  check("CUSTODY_SELF_HASH", jcsHash(withoutField(custody, "selfHash")) === custody.selfHash);
  const custodyEntries = Array.isArray(custody.entries) ? custody.entries.filter(plainObject) : [];
  const allowedPayloadNames = new Set(["runtime-inventory.jsonl", "homology-audit.json", "scanner-results.jsonl", "rights-policy.json"]);
  let custodyEntriesMatch = custodyEntries.length === 4;
  for (const entry of custodyEntries) {
    const relativePath = String(entry.relativePath);
    if (!allowedPayloadNames.has(relativePath) || path.basename(relativePath) !== relativePath) {
      custodyEntriesMatch = false;
      continue;
    }
    const bytes = await readFile(path.join(protectedRoot, relativePath));
    custodyEntriesMatch = custodyEntriesMatch
      && bytes.byteLength === entry.byteLength
      && sha256Bytes(bytes) === entry.sha256;
  }
  check("CUSTODY_ENTRY_BYTE_HASHES", custodyEntriesMatch);
  check("READINESS_SELF_HASH", jcsHash(withoutField(readiness, "selfHash")) === readiness.selfHash);
  check("OWNER_REQUEST_SELF_HASH", jcsHash(withoutField(ownerRequest, "requestHash")) === ownerRequest.requestHash);
  check("RIGHTS_POLICY_SELF_HASH", jcsHash(withoutField(rights, "selfHash")) === rights.selfHash);
  check("READINESS_BINDS_CUSTODY", readiness.protectedCustodyManifestHash === custody.selfHash);
  check("OWNER_REQUEST_BINDS_READINESS", ownerRequest.readinessReceiptHash === readiness.selfHash);
  check("A22_RECEIPT_SELF_HASH", jcsHash(withoutField(a22Receipt, "selfHash")) === a22Receipt.selfHash);
  const a22Protected = plainObject(a22Receipt.protectedEvidence) ? a22Receipt.protectedEvidence : {};
  check("A22_RECEIPT_BINDS_PROTECTED_CHAIN", a22Protected.custodyManifestHash === custody.selfHash
    && a22Protected.readinessReceiptHash === readiness.selfHash
    && a22Protected.ownerDecisionRequestHash === ownerRequest.requestHash);
  const runtime = await independentlyExtractRuntime(protectedRows);
  check("RUNTIME_INVARIANTS", runtime.invariantFailureCount === 0);
  check("ALL_RUNTIME_ROWS_MATCH", runtime.itemMismatchCount === 0);
  check("RUNTIME_COUNT_MATCH", runtime.runtimeVisibleItemCount === readiness.runtimeVisibleItemCount);
  check("RUNTIME_ROOT_MATCH", runtime.itemRecordRootHash === readiness.runtimeInventoryRootHash);
  check("FRAME_FAILURE_ROOT_MATCH", runtime.frameFailureLedgerRootHash === readiness.frameFailureLedgerRootHash
    && readiness.frameFailureCount === 0);
  const homology = independentlyAuditHomology(runtime.recomputedRows) as unknown as JsonRecord;
  check("HOMOLOGY_PROTECTED_ROOT_MATCH", homology.auditRootHash === protectedHomology.auditRootHash);
  check("HOMOLOGY_READINESS_ROOT_MATCH", homology.auditRootHash === readiness.fullFrameHomologyRootHash);
  check("HOMOLOGY_COUNTS_MATCH", homology.clusterCount === readiness.fullFrameClusterCount
    && homology.singletonCount === readiness.fullFrameSingletonCount);
  const eligibility = independentlyRecomputeEligibility(runtime.recomputedRows, homology, protectedScans);
  check("SCANNER_ROWS_MATCH", eligibility.scannerMismatchCount === 0);
  check("SCANNER_ROOTS_MATCH", eligibility.scannerPolicyHash === readiness.scannerPolicyHash
    && eligibility.scannerResultRootHash === readiness.scannerResultRootHash);
  check("RUNTIME_CONFIG_MATCH", eligibility.runtimeConfigHash === readiness.runtimeConfigHash);
  check("BATCH_AND_SOURCE_COUNTS_MATCH", equalCanonical(eligibility.batchCounts, readiness.batchCounts)
    && equalCanonical(eligibility.sourceIdCounts, readiness.sourceIdCounts));
  check("ELIGIBLE_CONTENT_ROOT_MATCH", eligibility.potentialEligibleContentRootHash === readiness.potentialEligibleContentRootHash);
  check("ELIGIBLE_CLUSTER_ROOT_MATCH", eligibility.potentialEligibleClusterSetHash === readiness.potentialEligibleClusterSetHash);
  check("ELIGIBLE_COUNTS_MATCH", eligibility.potentialEligibleItemCount === readiness.potentialEligibleItemCount
    && eligibility.potentialEligibleClusterCount === readiness.potentialEligibleClusterCount
    && eligibility.nonemptyPotentialStrata === readiness.nonemptyPotentialStrata);
  check("RESTRICTION_COUNTS_MATCH", eligibility.visualOrAssetRestrictedCount === readiness.visualOrAssetRestrictedCount
    && eligibility.piiRestrictedCount === readiness.piiRestrictedCount
    && eligibility.secretRestrictedCount === readiness.secretRestrictedCount);
  check("STRATUM_COUNTS_MATCH", equalCanonical(eligibility.potentialStratumClusterCounts, readiness.potentialStratumClusterCounts));
  check("RIGHTS_POLICY_SCOPE_MATCH", equalCanonical(rights.ownerApprovalRequiredSourceIds, OWNER_APPROVAL_SOURCE_IDS)
    && equalCanonical(rights.deniedSourceIds, DENIED_SOURCE_IDS)
    && rights.providerEgressAuthorized === false);
  check("ZERO_EXECUTION_EVENTS", readiness.providerRequestCount === 0
    && readiness.credentialReadCount === 0
    && readiness.naturalQuestionEgressCount === 0);
  const discrepancies = checks.filter(({ passed }) => !passed).map(({ code }) => code).sort(codePointCompare);
  const body = {
    schemaVersion: "IndependentFrameReadinessReviewReceiptV1",
    artifactKind: "INDEPENDENT_PRE_FRAME_REVIEW_NOT_FINAL_EVALUATION_REVIEW",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    reviewedSourceCommit,
    verifierCommit,
    verifierImplementationHash,
    a22EnvironmentReceiptHash: String(a22Receipt.selfHash),
    protectedCustodyManifestHash: String(custody.selfHash),
    readinessReceiptHash: String(readiness.selfHash),
    ownerDecisionRequestHash: String(ownerRequest.requestHash),
    runtimeInventoryRootHash: runtime.itemRecordRootHash,
    fullFrameHomologyRootHash: String(homology.auditRootHash),
    potentialEligibleContentRootHash: eligibility.potentialEligibleContentRootHash,
    potentialEligibleClusterSetHash: eligibility.potentialEligibleClusterSetHash,
    runtimeVisibleItemCount: runtime.runtimeVisibleItemCount,
    fullFrameClusterCount: Number(homology.clusterCount),
    fullFrameSingletonCount: Number(homology.singletonCount),
    potentialEligibleItemCount: eligibility.potentialEligibleItemCount,
    potentialEligibleClusterCount: eligibility.potentialEligibleClusterCount,
    runtimeItemMismatchCount: runtime.itemMismatchCount,
    runtimeItemMismatchEvidenceRootHash: runtime.itemMismatchEvidenceRootHash,
    scannerMismatchCount: eligibility.scannerMismatchCount,
    scannerMismatchEvidenceRootHash: eligibility.scannerMismatchEvidenceRootHash,
    checkCount: checks.length,
    passedCheckCount: checks.length - discrepancies.length,
    discrepancyCount: discrepancies.length,
    discrepancyCodeRootHash: jcsHash(discrepancies),
    reviewDecision: discrepancies.length === 0 ? "CONCURRED" : "DISCREPANCY",
    formalFrameFrozen: false,
    formalSampleFrozen: false,
    providerExecutionAuthorized: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    naturalQuestionResultCount: 0,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "INDEPENDENT_READINESS_REVIEW_ONLY_NOT_FRAME_OR_SAMPLE_REGISTRATION",
    reviewedAt,
  };
  return withSelfHash(body);
}

async function main() {
  const args = parseIndependentFrameVerifierArgsV5(process.argv.slice(2));
  const receipt = await independentlyVerifyFrameReadinessV5(args);
  process.stdout.write(`${canonicalJson(receipt)}\n`);
  if (receipt.reviewDecision !== "CONCURRED") process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "IndependentFrameReadinessReviewFailureV1",
      reviewDecision: "UNREVIEWABLE",
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      redactedError: error instanceof Error ? error.name : "UnknownError",
    })}\n`);
    process.exitCode = 1;
  });
}
