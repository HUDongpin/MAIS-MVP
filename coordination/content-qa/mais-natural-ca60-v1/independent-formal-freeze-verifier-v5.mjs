#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  canonicalJson,
} from "../../research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPOSITORY_ROOT = path.resolve(HERE, "../../..");
const DESIGN_ID = "MAIS-NATURAL-CA60-V5";
const REGISTRATION_HASH = "e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632";
const SOURCE_COMMIT = "57d78fb0be194e3eaf035a4ea6e6448d60e64b67";
const APPROVED_READINESS_SOURCE_COMMIT = "bd44971158979b5e31acf5bf0b1fabc360c9a53a";
const OWNER_DECISION_REQUEST_HASH = "2d0e8c24f270aa39292fea1ef8d1d11c4e9bd5d9ecd1bdf5a5bbf5119b964f78";
const OWNER_DECISION_RECEIPT_HASH = "855af9696548359bc7364a987aa0dc3a3f9cd5883f87911edd8067bc78ac3ad0";
const RIGHTS_POLICY_HASH = "c7f2832a701d813e928f1fa34f1b74d1d26a62c96f5bdea8be58d8bff134fe66";
const LINEAGE_RULE_HASH = "8130bcd70f3e42332478a284b5a5b54e0c73b9f3696b1c1c06f25254ea0fe449";
const ERRATUM_HASH = "d4050ab3070985dd4689dda4f51f44cf1d2f5f8f286cc548ac98919c8e8b540d";
const A22_REPORT_HASH = "dfd11a391356b88bbd2433b8c80bc0f6dffa2d1d7951682f3b71e65633bf8269";
const SAMPLE_ALGORITHM_VERSION = "natural-ca60-full-frame-hamilton-v3";
const SAMPLE_ALGORITHM_HASH = "952bf9d73d0aeec80add57af3b7da9b11ba892feb52eb4bcaa31e7691187ba94";
const C0_ALGORITHM_VERSION = "c0-random-audit-full-sample-v3";
const C0_ALGORITHM_HASH = "c503026d8ecb4b00c491b2c28be4a2704cddff884706c0fea03ca177bb063899";
const STRATA = Object.freeze([
  "multiple-choice::Low",
  "multiple-choice::Medium",
  "multiple-choice::High",
  "fill-in::Low",
  "fill-in::Medium",
  "fill-in::High",
  "short-answer::Low",
  "short-answer::Medium",
  "short-answer::High",
]);
const LINEAGE_FIELDS = Object.freeze({
  K5: Object.freeze(["batchId", "clusterId", "topicId", "responseForm"]),
  G6_12: Object.freeze(["batchId", "generationTemplate", "topicId", "responseForm"]),
  CCSS: Object.freeze(["batchId", "sourceLessonSlug", "topicId", "responseForm"]),
});

const RUNTIME_SOURCE_PATHS = Object.freeze([
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
  "data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
  "data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json",
  "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json",
  "data/usCaliforniaKnowledgePoints.ts",
  "data/usCaliforniaMathematicalPractices.ts",
  "data/usCaliforniaMicroLessons.ts",
  "data/usCaliforniaPracticeFigures.ts",
  "data/usCaliforniaQuestions.ts",
  "data/usCaliforniaTopics.ts",
  "lib/curriculumProfile.ts",
  "lib/difficulty.ts",
  "lib/server/answerMatching.ts",
  "lib/server/hongKongBaseQuestions.ts",
  "lib/server/questionStore.ts",
  "types/index.ts",
]);

const RUNNER_SOURCE_PATHS = Object.freeze([
  "coordination/content-qa/mais-natural-ca60-v1/clustering-audit.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5-cli.ts",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5-storage.ts",
  "coordination/content-qa/mais-natural-ca60-v1/formal-freeze-v5.ts",
  "coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5.ts",
  "coordination/content-qa/mais-natural-ca60-v1/question-store-source.ts",
  "coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.ts",
  "coordination/content-qa/mais-natural-ca60-v1/sample-contract-v5.mjs",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeCustodyManifestV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaFormalFreezeReceiptV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/schemas/NaturalCaV5SourceEnumerationHashErratumV1.schema.json",
  "coordination/content-qa/mais-natural-ca60-v1/source-enumeration-hash-erratum-v5.mjs",
  "coordination/research/mais-natural-ca60-v1/errata/2026-08-26-v5-source-enumeration-hash/erratum.json",
  "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/build-owner-decision.mjs",
  "coordination/research/mais-natural-ca60-v1/owner-decisions/2026-08-26-frame-rights-lineage/owner-decision-receipt.json",
  "coordination/research/mais-natural-ca60-v1/versions/design-v2/design-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs",
  "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-registration.json",
]);

const PROTECTED_CONTENT_FILES = Object.freeze([
  "c0-random-audit.json",
  "clean-source-evidence.json",
  "cluster-audit.json",
  "formal-item-screens.jsonl",
  "frame-freeze-evidence-input.json",
  "frame-freeze-evidence.json",
  "frame-registration.json",
  "item-egress-decisions.jsonl",
  "item-screen-evidence.jsonl",
  "owner-decision-receipt.json",
  "rights-decision-input.json",
  "rights-decision-table.json",
  "runtime-extraction-snapshot.json",
  "runtime-source-enumeration-receipt.json",
  "sample-manifest.json",
  "sampling-frame.jsonl",
  "scanner-execution-receipt-inventory.json",
  "scanner-execution-receipts.jsonl",
  "source-enumeration-hash-erratum.json",
  "source-module-manifest-input.json",
  "source-module-manifest.json",
  "source-parity-evidence.json",
  "source-parity-input.json",
]);

class ReviewFailure extends Error {
  constructor(checkId, kind = "DISCREPANCY") {
    super(checkId);
    this.name = "ReviewFailure";
    this.checkId = checkId;
    this.kind = kind;
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hashJson(value) {
  return sha256(canonicalJson(value));
}

function artifactHash(value, selfHashField) {
  const preimage = { ...value };
  delete preimage[selfHashField];
  return hashJson(preimage);
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function definedObject(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}

function requireMatch(checks, checkId, condition) {
  checks.push({ checkId, status: condition ? "MATCH" : "MISMATCH" });
  if (!condition) throw new ReviewFailure(checkId);
}

function git(repositoryRoot, args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding,
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function committedEntry(repositoryRoot, sourceCommit, repoRelativePath) {
  const gitBlobOid = String(git(repositoryRoot, ["rev-parse", `${sourceCommit}:${repoRelativePath}`])).trim();
  const bytes = git(repositoryRoot, ["show", `${sourceCommit}:${repoRelativePath}`], null);
  return { repoRelativePath, gitBlobOid, byteLength: bytes.byteLength, sha256: sha256(bytes) };
}

async function readJson(root, filename) {
  return JSON.parse(await readFile(path.join(root, filename), "utf8"));
}

async function readJsonl(root, filename) {
  const text = await readFile(path.join(root, filename), "utf8");
  return text.trimEnd().split("\n").map((line) => JSON.parse(line));
}

function localizedEnglish(value) {
  return typeof value === "string" ? value : value?.en;
}

function normalizeLatexAndUnicode(value) {
  return value.normalize("NFKC")
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/gu, "$1 / $2")
    .replace(/\\(?:left|right)/gu, "")
    .replace(/\\(?:times|cdot)/gu, "*")
    .replace(/\\div/gu, "/")
    .replace(/\\leq?/gu, "<=")
    .replace(/\\geq?/gu, ">=")
    .replace(/\\neq/gu, "!=")
    .replace(/[×·]/gu, "*")
    .replace(/÷/gu, "/")
    .replace(/≤/gu, "<=")
    .replace(/≥/gu, ">=")
    .replace(/≠/gu, "!=")
    .replace(/[−–—]/gu, "-")
    .replace(/[$]/gu, "")
    .toLowerCase();
}

function normalizePrompt(value) {
  return normalizeLatexAndUnicode(localizedEnglish(value))
    .replace(/[，。；：！？,.!?;:"'“”‘’（）()\[\]{}]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function templateText(value) {
  return normalizePrompt(value)
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\s*\/\s*\d+(?![\p{L}\p{N}])/gu, " <fraction> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\.\d+%(?![\p{L}\p{N}])/gu, " <decimal-percent> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+%(?![\p{L}\p{N}])/gu, " <integer-percent> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+\.\d+(?![\p{L}\p{N}])/gu, " <decimal> ")
    .replace(/(?<![\p{L}\p{N}])[-+]?\d+(?![\p{L}\p{N}])/gu, " <integer> ")
    .replace(/\b[a-z]\b/gu, " <variable> ")
    .replace(/\s+/gu, " ")
    .trim();
}

function exactContentHash(row) {
  return hashJson({
    prompt: row.prompt,
    options: row.options,
    storedAnswer: row.storedAnswer,
    acceptedAnswers: row.acceptedAnswers,
    explanation: row.explanation,
  });
}

function itemContentHash(row) {
  return hashJson(definedObject([
    ["itemId", row.itemId],
    ["sourceCommit", row.sourceCommit],
    ["sourceIds", row.sourceIds],
    ["region", row.region],
    ["curriculumProfile", row.curriculumProfile],
    ["grade", row.grade],
    ["canonicalTopic", row.canonicalTopic],
    ["responseForm", row.responseForm],
    ["difficulty", row.difficulty],
    ["sourceModuleHash", row.sourceModuleHash],
    ["prompt", row.prompt],
    ["options", row.options],
    ["answer", row.answer],
    ["storedAnswer", row.storedAnswer],
    ["acceptedAnswers", row.acceptedAnswers],
    ["explanation", row.explanation],
    ["diagram", row.diagram],
    ["questionAssets", row.questionAssets],
    ["locale", row.locale],
    ["localePolicy", row.localePolicy],
    ["topic", row.topic],
    ["rubric", row.rubric],
    ["lineageKind", row.lineageKind],
    ["batchId", row.batchId],
    ["clusterId", row.clusterId],
    ["topicId", row.topicId],
    ["generationTemplate", row.generationTemplate],
    ["sourceLessonSlug", row.sourceLessonSlug],
  ]));
}

function templateSkeletonHash(row) {
  const options = Array.isArray(row.options)
    ? row.options.map((option) => templateText(option)).sort(codePointCompare)
    : null;
  return hashJson({
    canonicalTopic: row.canonicalTopic,
    responseForm: row.responseForm,
    prompt: templateText(row.prompt),
    options,
  });
}

function lineageKeyHash(row) {
  if (row.lineageKind === null) return null;
  const fields = LINEAGE_FIELDS[row.lineageKind];
  if (!fields) return "INVALID_LINEAGE_KIND";
  return hashJson([row.lineageKind, ...fields.map((field) => row[field])]);
}

function characterTrigrams(value) {
  const characters = [...value];
  if (characters.length < 3) return new Set([value]);
  const grams = new Set();
  for (let index = 0; index <= characters.length - 3; index += 1) {
    grams.add(characters.slice(index, index + 3).join(""));
  }
  return grams;
}

function trigramJaccard(left, right) {
  const leftGrams = characterTrigrams(left);
  const rightGrams = characterTrigrams(right);
  let intersection = 0;
  for (const gram of leftGrams) if (rightGrams.has(gram)) intersection += 1;
  const union = leftGrams.size + rightGrams.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function editSimilarity(left, right) {
  const leftCharacters = [...left];
  const rightCharacters = [...right];
  if (leftCharacters.length === 0 && rightCharacters.length === 0) return 1;
  let previous = Array.from({ length: rightCharacters.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= leftCharacters.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= rightCharacters.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (leftCharacters[leftIndex - 1] === rightCharacters[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return 1 - (previous[rightCharacters.length] / Math.max(leftCharacters.length, rightCharacters.length));
}

function computeHomologyGraph(rows) {
  const parent = rows.map((_, index) => index);
  const find = (input) => {
    let cursor = input;
    while (parent[cursor] !== cursor) cursor = parent[cursor];
    let value = input;
    while (parent[value] !== value) {
      const next = parent[value];
      parent[value] = cursor;
      value = next;
    }
    return cursor;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[Math.max(leftRoot, rightRoot)] = Math.min(leftRoot, rightRoot);
  };
  const edges = [];
  for (const [hashFunction, edgeType] of [
    [exactContentHash, "EXACT"],
    [templateSkeletonHash, "TEMPLATE"],
    [lineageKeyHash, "SOURCE"],
  ]) {
    const firstByHash = new Map();
    for (const [index, row] of rows.entries()) {
      const evidenceHash = hashFunction(row);
      if (evidenceHash === null) continue;
      const first = firstByHash.get(evidenceHash);
      if (first === undefined) firstByHash.set(evidenceHash, index);
      else {
        union(first, index);
        edges.push({ edgeType, leftItemId: rows[first].itemId, rightItemId: row.itemId, evidenceHash });
      }
    }
  }
  const nearBuckets = new Map();
  for (const [index, row] of rows.entries()) {
    const key = canonicalJson([row.responseForm, row.canonicalTopic]);
    const bucket = nearBuckets.get(key) ?? [];
    bucket.push({ index, normalized: normalizePrompt(row.prompt) });
    nearBuckets.set(key, bucket);
  }
  for (const bucket of nearBuckets.values()) {
    for (let leftPosition = 0; leftPosition < bucket.length; leftPosition += 1) {
      for (let rightPosition = leftPosition + 1; rightPosition < bucket.length; rightPosition += 1) {
        const left = bucket[leftPosition];
        const right = bucket[rightPosition];
        const jaccard = trigramJaccard(left.normalized, right.normalized);
        if (jaccard < 0.90) continue;
        const similarity = editSimilarity(left.normalized, right.normalized);
        if (similarity < 0.92) continue;
        union(left.index, right.index);
        edges.push({
          edgeType: "NEAR",
          leftItemId: rows[left.index].itemId,
          rightItemId: rows[right.index].itemId,
          trigramJaccard: jaccard,
          normalizedEditSimilarity: similarity,
          evidenceHash: hashJson({
            leftNormalizedPromptHash: rows[left.index].normalizedPromptHash,
            rightNormalizedPromptHash: rows[right.index].normalizedPromptHash,
            trigramJaccard: jaccard,
            normalizedEditSimilarity: similarity,
          }),
        });
      }
    }
  }
  const membersByRoot = new Map();
  for (const [index, row] of rows.entries()) {
    const root = find(index);
    const members = membersByRoot.get(root) ?? [];
    members.push(row);
    membersByRoot.set(root, members);
  }
  const eligibleCount = rows.filter((row) => row.eligible).length;
  const components = [...membersByRoot.values()].map((members) => ({
    clusterId: members[0].homologyClusterId,
    itemIds: members.map((row) => row.itemId).sort(codePointCompare),
    eligibleItemCount: members.filter((row) => row.eligible).length,
    eligibleFrameShare: eligibleCount === 0 ? 0 : members.filter((row) => row.eligible).length / eligibleCount,
    canonicalTopics: [...new Set(members.filter((row) => row.eligible).map((row) => row.canonicalTopic))].sort(codePointCompare),
  })).sort((left, right) => codePointCompare(left.clusterId, right.clusterId));
  return {
    edges: edges.sort((left, right) => codePointCompare(left.leftItemId, right.leftItemId)
      || codePointCompare(left.rightItemId, right.rightItemId)
      || codePointCompare(left.edgeType, right.edgeType)),
    components,
  };
}

function frameRowsRoot(rows) {
  const tuples = rows.map((row) => [row.itemId, row.itemHash, row.homologyClusterId, row.rowHash, row.eligible])
    .sort((left, right) => codePointCompare(left[0], right[0])
      || codePointCompare(left[1], right[1])
      || codePointCompare(left[2], right[2])
      || codePointCompare(left[3], right[3])
      || Number(left[4]) - Number(right[4]));
  return hashJson(tuples);
}

function frameSelectionRoot(rows) {
  const excluded = new Set([
    "frameFrozenAt",
    "rowHash",
    "inclusionProbability",
    "analysisWeight",
    "clusterInclusionProbability",
    "representativeSelectionProbability",
    "clusterRepresentative",
    "assignedClusterStratum",
    "analysisWeightPurpose",
  ]);
  const leaves = rows.map((row) => Object.fromEntries(Object.entries(row).filter(([field]) => !excluded.has(field))))
    .sort((left, right) => codePointCompare(left.itemId, right.itemId));
  return hashJson(leaves);
}

function selectionDigest({ registrationHash, frameRoot, stratum, clusterId, itemHash }) {
  return hashJson([registrationHash, frameRoot, SAMPLE_ALGORITHM_VERSION, stratum, clusterId, itemHash]);
}

function deriveClusters(rows, registrationHash, frameRoot) {
  const grouped = new Map();
  for (const row of rows.filter((entry) => entry.eligible)) {
    const members = grouped.get(row.homologyClusterId) ?? [];
    members.push(row);
    grouped.set(row.homologyClusterId, members);
  }
  return [...grouped.entries()].map(([clusterId, members]) => {
    const ranked = members.map((row) => {
      const assignedStratum = `${row.responseForm}::${row.difficulty}`;
      return {
        row,
        assignedStratum,
        digest: selectionDigest({ registrationHash, frameRoot, stratum: assignedStratum, clusterId, itemHash: row.itemHash }),
      };
    }).sort((left, right) => codePointCompare(left.digest, right.digest) || codePointCompare(left.row.itemId, right.row.itemId));
    const representative = ranked[0];
    return {
      clusterId,
      assignedStratum: representative.assignedStratum,
      representativeItemId: representative.row.itemId,
      representativeItemHash: representative.row.itemHash,
      representativeSelectionDigest: representative.digest,
      members: [...members].sort((left, right) => codePointCompare(left.itemId, right.itemId)).map((row) => ({
        itemId: row.itemId,
        itemHash: row.itemHash,
        rowHash: row.rowHash,
        responseForm: row.responseForm,
        difficulty: row.difficulty,
      })),
    };
  }).sort((left, right) => codePointCompare(left.clusterId, right.clusterId));
}

export function independentHamilton(capacities, target, basePerNonempty) {
  if (!Array.isArray(capacities) || capacities.length !== 9) throw new TypeError("nine capacities required");
  const allocation = capacities.map((capacity) => Math.min(basePerNonempty, capacity));
  const baseAllocation = [...allocation];
  let remaining = target - allocation.reduce((sum, value) => sum + value, 0);
  const rounds = [];
  let roundNumber = 0;
  while (remaining > 0) {
    const active = capacities.map((capacity, index) => ({ index, capacity, residual: capacity - allocation[index], weight: capacity }))
      .filter((entry) => entry.residual > 0);
    const denominator = active.reduce((sum, entry) => sum + entry.weight, 0);
    const before = remaining;
    const round = active.map((entry) => {
      const numerator = before * entry.weight;
      const floorQuota = Math.floor(numerator / denominator);
      const floorAward = Math.min(floorQuota, entry.residual);
      allocation[entry.index] += floorAward;
      remaining -= floorAward;
      return { ...entry, numerator, denominator, floorQuota, floorAward, remainderNumerator: numerator % denominator, remainderAward: 0 };
    });
    const ranked = round.filter((entry) => allocation[entry.index] < capacities[entry.index])
      .sort((left, right) => (right.remainderNumerator * left.denominator - left.remainderNumerator * right.denominator) || left.index - right.index);
    for (const entry of ranked) {
      if (remaining === 0) break;
      allocation[entry.index] += 1;
      remaining -= 1;
      entry.remainderAward = 1;
    }
    rounds.push({
      round: roundNumber += 1,
      remainingBefore: before,
      remainingAfter: remaining,
      denominator,
      cells: round.map(({ index, weight, residual, numerator, floorQuota, floorAward, remainderNumerator, remainderAward }) => ({
        stratum: STRATA[index], index, weight, residualBefore: residual, numerator, denominator, floorQuota, floorAward, remainderNumerator, remainderAward,
      })),
    });
  }
  return { target, basePerNonEmpty: basePerNonempty, capacities: [...capacities], baseAllocation, finalAllocation: allocation, rounds };
}

function sortSelectionRows(rows) {
  return [...rows].sort((left, right) => codePointCompare(left.stratum, right.stratum)
    || codePointCompare(left.selectionDigest, right.selectionDigest)
    || codePointCompare(left.itemId, right.itemId));
}

function manifestTupleRoot(rows) {
  return hashJson(rows.map((row) => [row.itemId, row.itemHash, row.clusterId])
    .sort((left, right) => codePointCompare(left[0], right[0])
      || codePointCompare(left[1], right[1])
      || codePointCompare(left[2], right[2])));
}

function sampleSelectionContentRoot(sample) {
  return hashJson({
    designId: sample.designId,
    registrationHash: sample.registrationHash,
    frameSelectionContentRootHash: sample.frameSelectionContentRootHash,
    clusterAuditSelectionContentHash: sample.clusterAuditSelectionContentHash,
    algorithmVersion: sample.algorithmVersion,
    algorithmHash: sample.algorithmHash,
    selectionFormula: sample.selectionFormula,
    allocationMethod: sample.allocationMethod,
    stratumAllocations: sample.stratumAllocations,
    hamiltonAudit: sample.hamiltonAudit,
    selectedRows: sample.selectedRows.map(({ itemIdPseudonym: _pseudonym, ...row }) => row),
    secondaryEstimand: sample.secondaryEstimand,
    representativeSelectionRule: sample.representativeSelectionRule,
    secondaryWeightSummary: sample.secondaryWeightSummary,
    registeredPreResultExclusions: (sample.registeredPreResultExclusions ?? []).map(({ registeredAt: _registeredAt, ...entry }) => entry),
    replacementHistory: (sample.replacementHistory ?? []).map((entry) => ({
      exclusionIndex: entry.exclusionIndex,
      removedItemId: entry.removedItemId,
      removedItemHash: entry.removedItemHash,
      exclusionCode: entry.exclusionCode,
      exclusionEvidenceHash: entry.exclusionEvidenceHash,
      replacementItemId: entry.replacementItemId,
      replacementItemHash: entry.replacementItemHash,
      replacementClusterId: entry.replacementClusterId,
      replacementStratum: entry.replacementStratum,
    })),
  });
}

function kish(weights) {
  const sum = weights.reduce((total, weight) => total + weight, 0);
  const sumSquares = weights.reduce((total, weight) => total + weight ** 2, 0);
  return (sum ** 2) / sumSquares;
}

function verifyFrameAndClusters({ checks, rows, clusterAudit, frameRegistration }) {
  requireMatch(checks, "FRAME_ROW_COUNT_2802", rows.length === 2_802);
  requireMatch(checks, "FRAME_ID_UNIQUENESS", new Set(rows.map((row) => row.itemId)).size === rows.length);
  requireMatch(checks, "FRAME_ROW_SELF_HASHES", rows.every((row) => artifactHash(row, "rowHash") === row.rowHash));
  requireMatch(checks, "FRAME_ITEM_CONTENT_HASHES", rows.every((row) => itemContentHash(row) === row.itemHash));
  requireMatch(checks, "FRAME_NORMALIZATION_HASHES", rows.every((row) => sha256(normalizePrompt(row.prompt)) === row.normalizedPromptHash));
  requireMatch(checks, "FRAME_TEMPLATE_HASHES", rows.every((row) => templateSkeletonHash(row) === row.templateSkeletonHash));
  requireMatch(checks, "FRAME_EXACT_GROUP_HASHES", rows.every((row) => `exact-${exactContentHash(row)}` === row.exactDuplicateGroupId));
  requireMatch(checks, "FRAME_LINEAGE_HASHES", rows.every((row) => lineageKeyHash(row) === row.lineageKeyHash));

  const physicalRoot = frameRowsRoot(rows);
  const selectionRoot = frameSelectionRoot(rows);
  requireMatch(checks, "SAMPLING_FRAME_ROOT", physicalRoot === frameRegistration.samplingFrameHash && physicalRoot === clusterAudit.samplingFrameHash);
  requireMatch(checks, "FRAME_SELECTION_CONTENT_ROOT", selectionRoot === frameRegistration.frameSelectionContentRootHash
    && selectionRoot === clusterAudit.frameSelectionContentRootHash);
  requireMatch(checks, "FRAME_REGISTRATION_SELF_HASH", artifactHash(frameRegistration, "frameRegistrationHash") === frameRegistration.frameRegistrationHash);
  requireMatch(checks, "CLUSTER_AUDIT_SELF_HASH", artifactHash(clusterAudit, "clusterAuditHash") === clusterAudit.clusterAuditHash);

  const graph = computeHomologyGraph(rows);
  requireMatch(checks, "HOMOLOGY_EDGE_RECOMPUTATION", canonicalEqual(graph.edges, clusterAudit.edges));
  requireMatch(checks, "HOMOLOGY_COMPONENT_RECOMPUTATION", canonicalEqual(graph.components, clusterAudit.connectedComponents));
  const clusters = deriveClusters(rows, REGISTRATION_HASH, selectionRoot);
  requireMatch(checks, "CLUSTER_REPRESENTATIVE_RECOMPUTATION", canonicalEqual(clusters, clusterAudit.clusters));
  const anomalyRoot = hashJson(clusterAudit.anomalyLedger.map((entry) => entry.anomalyHash).sort(codePointCompare));
  const clusterSelectionRoot = hashJson({
    registrationHash: REGISTRATION_HASH,
    frameSelectionContentRootHash: selectionRoot,
    clusteringAlgorithmHash: clusterAudit.clusteringAlgorithmHash,
    edges: graph.edges,
    connectedComponents: graph.components,
    anomalyLedgerRootHash: anomalyRoot,
    clusters: clusters.map((cluster) => ({
      ...cluster,
      members: cluster.members.map(({ rowHash: _rowHash, ...member }) => member),
    })),
  });
  requireMatch(checks, "CLUSTER_SELECTION_CONTENT_ROOT", clusterSelectionRoot === clusterAudit.clusterAuditSelectionContentHash);

  const eligible = rows.filter((row) => row.eligible);
  requireMatch(checks, "ELIGIBLE_FRAME_CARDINALITY", eligible.length === 482 && new Set(eligible.map((row) => row.homologyClusterId)).size === 106);
  requireMatch(checks, "CLUSTER_SIZE_BLOCKER", graph.components.filter((component) => component.eligibleItemCount > 0)
    .every((component) => component.eligibleFrameShare <= 0.05 && component.canonicalTopics.length <= 2));

  const byStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const cluster of clusters) byStratum.get(cluster.assignedStratum).push(cluster);
  const capacities = STRATA.map((stratum) => byStratum.get(stratum).length);
  const allocation = independentHamilton(capacities, 60, 2);
  const allocationByStratum = new Map(STRATA.map((stratum, index) => [stratum, allocation.finalAllocation[index]]));
  const capacityByStratum = new Map(STRATA.map((stratum, index) => [stratum, capacities[index]]));
  const clusterById = new Map(clusters.map((cluster) => [cluster.clusterId, cluster]));
  requireMatch(checks, "FRAME_DERIVED_WEIGHTS", rows.every((row) => {
    if (!row.eligible) return row.assignedClusterStratum === null && row.clusterRepresentative === false
      && row.clusterInclusionProbability === 0 && row.representativeSelectionProbability === 0
      && row.inclusionProbability === 0 && row.analysisWeight === 0;
    const cluster = clusterById.get(row.homologyClusterId);
    const probability = allocationByStratum.get(cluster.assignedStratum) / capacityByStratum.get(cluster.assignedStratum);
    const representative = row.itemId === cluster.representativeItemId;
    return row.assignedClusterStratum === cluster.assignedStratum
      && row.clusterRepresentative === representative
      && row.clusterInclusionProbability === probability
      && row.representativeSelectionProbability === (representative ? 1 : 0)
      && row.inclusionProbability === (representative ? probability : 0)
      && row.analysisWeight === (representative ? 1 / probability : 0);
  }));
  return { physicalRoot, selectionRoot, graph, clusters, capacities, allocation };
}

function verifySample({ checks, rows, clusterAudit, frameRegistration, sample, clusters, capacities, allocation }) {
  requireMatch(checks, "SAMPLE_ALGORITHM_IDENTITY", sample.algorithmVersion === SAMPLE_ALGORITHM_VERSION
    && sample.algorithmHash === SAMPLE_ALGORITHM_HASH);
  requireMatch(checks, "SAMPLE_UPSTREAM_LINKS", sample.frameRegistrationHash === frameRegistration.frameRegistrationHash
    && sample.clusterAuditHash === clusterAudit.clusterAuditHash
    && sample.frameSelectionContentRootHash === frameRegistration.frameSelectionContentRootHash);
  requireMatch(checks, "SAMPLE_SELF_HASH", artifactHash(sample, "sampleManifestHash") === sample.sampleManifestHash);
  requireMatch(checks, "SAMPLE_NO_REPLACEMENT", sample.sampleVersion === 1 && sample.supersedesSampleManifestHash === null
    && sample.supersededSampleManifest === null && sample.registeredPreResultExclusions.length === 0
    && sample.replacementHistory.length === 0 && sample.resultBlind === true
    && sample.rerollAfterAnyLabelOrResult === false && sample.replacementAfterAnyLabelOrResult === false);

  const rowById = new Map(rows.map((row) => [row.itemId, row]));
  const expectedAllocations = STRATA.map((stratum, index) => {
    const [responseForm, difficulty] = stratum.split("::");
    return {
      stratum,
      responseForm,
      difficulty,
      eligibleClusterCount: capacities[index],
      executionEligibleClusterCount: capacities[index],
      baseMinimumAllocation: allocation.baseAllocation[index],
      finalAllocation: allocation.finalAllocation[index],
    };
  });
  requireMatch(checks, "SAMPLE_HAMILTON_RECOMPUTATION", canonicalEqual(sample.stratumAllocations, expectedAllocations)
    && canonicalEqual(sample.hamiltonAudit, allocation.rounds));

  const clustersByStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const cluster of clusters) clustersByStratum.get(cluster.assignedStratum).push(cluster);
  const expectedRows = [];
  for (const [index, stratum] of STRATA.entries()) {
    const ranked = [...clustersByStratum.get(stratum)].sort((left, right) => codePointCompare(left.representativeSelectionDigest, right.representativeSelectionDigest)
      || codePointCompare(left.representativeItemId, right.representativeItemId));
    for (const cluster of ranked.slice(0, allocation.finalAllocation[index])) {
      const row = rowById.get(cluster.representativeItemId);
      expectedRows.push({
        clusterId: cluster.clusterId,
        itemId: row.itemId,
        itemHash: row.itemHash,
        stratum,
        responseForm: row.responseForm,
        difficulty: row.difficulty,
        selectionDigest: cluster.representativeSelectionDigest,
        clusterInclusionProbability: row.clusterInclusionProbability,
        representativeSelectionProbability: row.representativeSelectionProbability,
        itemInclusionProbability: row.inclusionProbability,
        inclusionProbability: row.inclusionProbability,
        analysisWeight: 1,
        secondaryAnalysisWeight: row.analysisWeight,
      });
    }
  }
  const orderedExpected = sortSelectionRows(expectedRows);
  const observedWithoutPseudonyms = sample.selectedRows.map(({ itemIdPseudonym: _pseudonym, ...row }) => row);
  requireMatch(checks, "SAMPLE_60_UNIQUE_CLUSTER_SELECTION", sample.selectedRows.length === 60
    && new Set(sample.selectedRows.map((row) => row.clusterId)).size === 60
    && canonicalEqual(observedWithoutPseudonyms, orderedExpected));
  requireMatch(checks, "SAMPLE_MANIFEST_TUPLE_ROOT", manifestTupleRoot(sample.selectedRows) === sample.manifestTupleRootHash);

  const pseudonymSeed = hashJson({
    designId: sample.designId,
    registrationHash: sample.registrationHash,
    frameRegistrationHash: sample.frameRegistrationHash,
    manifestFrozenAt: sample.manifestFrozenAt,
    sampleVersion: sample.sampleVersion,
    supersedesSampleManifestHash: sample.supersedesSampleManifestHash,
    algorithmVersion: sample.algorithmVersion,
    manifestTupleRootHash: sample.manifestTupleRootHash,
  });
  requireMatch(checks, "SAMPLE_PSEUDONYM_SEED", pseudonymSeed === sample.pseudonymSeedRootHash);
  const mappings = sample.selectedRows.map((row) => ({
    itemId: row.itemId,
    itemHash: row.itemHash,
    clusterId: row.clusterId,
    itemIdPseudonym: `ca60-${hashJson([pseudonymSeed, row.itemId, row.itemHash, row.clusterId]).slice(0, 32)}`,
  })).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  requireMatch(checks, "SAMPLE_PSEUDONYM_MAPPING", mappings.every((mapping) => sample.selectedRows.some((row) => row.itemId === mapping.itemId
    && row.itemIdPseudonym === mapping.itemIdPseudonym))
    && hashJson(mappings.map((row) => [row.itemId, row.itemHash, row.clusterId, row.itemIdPseudonym])) === sample.pseudonymMappingRootHash);

  const secondaryWeights = sample.selectedRows.map((row) => row.secondaryAnalysisWeight);
  const expectedWeightSummary = {
    itemCount: 60,
    sumWeights: secondaryWeights.reduce((sum, value) => sum + value, 0),
    sumSquaredWeights: secondaryWeights.reduce((sum, value) => sum + value ** 2, 0),
    kishEffectiveSampleSize: kish(secondaryWeights),
  };
  requireMatch(checks, "SAMPLE_SECONDARY_WEIGHT_SUMMARY", canonicalEqual(expectedWeightSummary, sample.secondaryWeightSummary));
  requireMatch(checks, "SAMPLE_SELECTION_CONTENT_ROOT", sampleSelectionContentRoot(sample) === sample.sampleSelectionContentRootHash);
}

function verifyC0({ checks, sample, c0 }) {
  requireMatch(checks, "C0_ALGORITHM_IDENTITY", c0.algorithmVersion === C0_ALGORITHM_VERSION && c0.algorithmHash === C0_ALGORITHM_HASH);
  requireMatch(checks, "C0_UPSTREAM_LINKS", c0.sampleManifestHash === sample.sampleManifestHash
    && c0.sampleSelectionContentRootHash === sample.sampleSelectionContentRootHash
    && c0.predecessorArtifactHash === sample.sampleManifestHash);
  requireMatch(checks, "C0_SELF_HASH", artifactHash(c0, "auditHash") === c0.auditHash);
  const byStratum = new Map(STRATA.map((stratum) => [stratum, []]));
  for (const row of sample.selectedRows) byStratum.get(row.stratum).push(row);
  const capacities = STRATA.map((stratum) => byStratum.get(stratum).length);
  const allocation = independentHamilton(capacities, 12, 1);
  const expectedAllocations = STRATA.map((stratum, index) => ({
    stratum,
    sampleClusterCount: capacities[index],
    baseMinimumAllocation: allocation.baseAllocation[index],
    finalAllocation: allocation.finalAllocation[index],
  }));
  requireMatch(checks, "C0_HAMILTON_RECOMPUTATION", canonicalEqual(c0.stratumAllocations, expectedAllocations)
    && canonicalEqual(c0.hamiltonAudit, allocation.rounds));
  const selected = [];
  for (const [index, stratum] of STRATA.entries()) {
    const ranked = byStratum.get(stratum).map((row) => ({
      row,
      digest: hashJson([REGISTRATION_HASH, sample.sampleSelectionContentRootHash, C0_ALGORITHM_VERSION, stratum, row.clusterId, row.itemHash]),
    })).sort((left, right) => codePointCompare(left.digest, right.digest) || codePointCompare(left.row.itemId, right.row.itemId));
    for (const entry of ranked.slice(0, allocation.finalAllocation[index])) {
      selected.push({ clusterId: entry.row.clusterId, itemId: entry.row.itemId, itemHash: entry.row.itemHash, stratum, selectionDigest: entry.digest });
    }
  }
  const expectedRows = sortSelectionRows(selected);
  requireMatch(checks, "C0_12_ITEM_SELECTION", c0.selectedRows.length === 12 && canonicalEqual(c0.selectedRows, expectedRows));
  requireMatch(checks, "C0_TUPLE_ROOT", manifestTupleRoot(c0.selectedRows) === c0.selectedTupleRootHash);
  requireMatch(checks, "FREEZE_CHRONOLOGY", Date.parse(sample.manifestFrozenAt) < Date.parse(c0.frozenAt)
    && c0.freezeSequence === 3 && sample.freezeSequence === 2);
}

async function verifyCustodyAndRights({ checks, protectedRoot, rows, sample, c0, receipt, custody, ownerDecision }) {
  requireMatch(checks, "CUSTODY_MANIFEST_SELF_HASH", artifactHash(custody, "custodyManifestHash") === custody.custodyManifestHash);
  requireMatch(checks, "FINAL_RECEIPT_SELF_HASH", artifactHash(receipt, "formalFreezeReceiptHash") === receipt.formalFreezeReceiptHash);
  requireMatch(checks, "CUSTODY_RECEIPT_BINDING", receipt.protectedCustodyManifestHash === custody.custodyManifestHash
    && receipt.protectedCustodyBound === true);
  requireMatch(checks, "CUSTODY_FILE_SET", custody.fileCount === 23
    && canonicalEqual(custody.entries.map((entry) => entry.relativePath).sort(codePointCompare), [...PROTECTED_CONTENT_FILES].sort(codePointCompare)));
  requireMatch(checks, "CUSTODY_DIRECTORY_MODE", ((await stat(protectedRoot)).mode & 0o777) === 0o700);
  for (const entry of custody.entries) {
    const filePath = path.join(protectedRoot, entry.relativePath);
    const metadata = await lstat(filePath);
    requireMatch(checks, `CUSTODY_FILE_${entry.relativePath.replace(/[^A-Za-z0-9]+/gu, "_").toUpperCase()}`, metadata.isFile()
      && (metadata.mode & 0o777) === 0o600
      && metadata.size === entry.byteLength
      && sha256(await readFile(filePath)) === entry.sha256);
  }
  for (const name of ["custody-manifest.json", "formal-freeze-receipt.json"]) {
    requireMatch(checks, `CUSTODY_CONTROL_${name.replace(/[^A-Za-z0-9]+/gu, "_").toUpperCase()}`,
      ((await stat(path.join(protectedRoot, name))).mode & 0o777) === 0o600);
  }

  requireMatch(checks, "OWNER_DECISION_SELF_HASH", artifactHash(ownerDecision, "ownerDecisionReceiptHash") === OWNER_DECISION_RECEIPT_HASH);
  requireMatch(checks, "OWNER_DECISION_ROOTS", ownerDecision.ownerDecisionRequestHash === OWNER_DECISION_REQUEST_HASH
    && ownerDecision.rightsPolicyHash === RIGHTS_POLICY_HASH && ownerDecision.lineageRuleHash === LINEAGE_RULE_HASH);
  requireMatch(checks, "OWNER_NON_EXECUTION_AUTHORITY", ownerDecision.frameFreezeAuthorized === true
    && ownerDecision.sampleFreezeAuthorized === true && ownerDecision.providerExecutionAuthorized === false
    && ownerDecision.credentialReadAuthorized === false && ownerDecision.questionEgressAuthorizedNow === false
    && ownerDecision.tokenAuthorizationCreated === false && ownerDecision.attemptAuthorizationCreated === false
    && ownerDecision.usdAuthorizationCreated === false);
  const allowed = new Set(ownerDecision.allowedSourceIds);
  const denied = new Set(ownerDecision.deniedSourceIds);
  const eligible = rows.filter((row) => row.eligible);
  requireMatch(checks, "RIGHTS_ALLOWED_SOURCE_SCOPE", eligible.every((row) => row.sourceIds.length > 0
    && row.sourceIds.every((sourceId) => allowed.has(sourceId) && !denied.has(sourceId))));
  requireMatch(checks, "VISUAL_ASSET_EXCLUSION", eligible.every((row) => row.diagram === null
    && (!Array.isArray(row.questionAssets) || row.questionAssets.length === 0)));

  const publicReceiptText = await readFile(path.join(protectedRoot, "formal-freeze-receipt.json"), "utf8");
  requireMatch(checks, "PUBLIC_RECEIPT_CONTENT_BLINDNESS", !/"prompt"|"answer"|"explanation"/u.test(publicReceiptText)
    && sample.selectedRows.every((row) => !publicReceiptText.includes(row.itemId)));
  requireMatch(checks, "PUBLIC_SAMPLE_PROJECTION", receipt.selectedPublicRows.length === 60
    && hashJson(receipt.selectedPublicRows) === receipt.selectedPublicRowsRootHash
    && receipt.selectedPublicRows.every((row) => /^ca60-[0-9a-f]{32}$/u.test(row.itemIdPseudonym)));
  requireMatch(checks, "PUBLIC_C0_PROJECTION", receipt.c0PublicRows.length === 12
    && hashJson(receipt.c0PublicRows) === receipt.c0PublicRowsRootHash
    && c0.selectedRows.length === receipt.c0SelectedCount);
  requireMatch(checks, "ZERO_PROVIDER_AND_RESULT_COUNTERS", receipt.providerRequestCount === 0
    && receipt.credentialReadCount === 0 && receipt.naturalQuestionEgressCount === 0
    && receipt.naturalQuestionResultCount === 0 && receipt.firstProviderExecutionAllowed === false
    && receipt.providerExecutionAuthorized === false && receipt.credentialReadAuthorized === false
    && receipt.tokenAuthorizationCreated === false && receipt.attemptAuthorizationCreated === false
    && receipt.usdAuthorizationCreated === false);
}

export async function verifyIndependentFormalFreezeV5({ protectedRoot, repositoryRoot = DEFAULT_REPOSITORY_ROOT, reviewedAt }) {
  if (!path.isAbsolute(protectedRoot) || !path.isAbsolute(repositoryRoot)) throw new TypeError("absolute roots are required");
  if (typeof reviewedAt !== "string" || new Date(reviewedAt).toISOString() !== reviewedAt) throw new TypeError("canonical reviewedAt required");
  const checks = [];
  const verifierStatus = String(git(repositoryRoot, ["status", "--porcelain", "--untracked-files=all"]));
  requireMatch(checks, "VERIFIER_CLEAN_EXACT_SHA", verifierStatus.length === 0);
  const verifierCommit = String(git(repositoryRoot, ["rev-parse", "HEAD"])).trim();
  const verifierEntries = [
    "coordination/content-qa/mais-natural-ca60-v1/independent-formal-freeze-verifier-v5.mjs",
    "coordination/research/mais-natural-ca60-v1/versions/design-v5/design-contract.mjs",
  ].map((repoRelativePath) => committedEntry(repositoryRoot, verifierCommit, repoRelativePath));
  const verifierHash = hashJson(verifierEntries);

  const receipt = await readJson(protectedRoot, "formal-freeze-receipt.json");
  const custody = await readJson(protectedRoot, "custody-manifest.json");
  const rows = await readJsonl(protectedRoot, "sampling-frame.jsonl");
  const clusterAudit = await readJson(protectedRoot, "cluster-audit.json");
  const frameRegistration = await readJson(protectedRoot, "frame-registration.json");
  const sample = await readJson(protectedRoot, "sample-manifest.json");
  const c0 = await readJson(protectedRoot, "c0-random-audit.json");
  const ownerDecision = await readJson(protectedRoot, "owner-decision-receipt.json");
  const erratum = await readJson(protectedRoot, "source-enumeration-hash-erratum.json");
  const a22Report = JSON.parse(await readFile(path.join(repositoryRoot, "coordination/reports/2026-08-26-A22-MAIS-NATURAL-CA60-V5-FORMAL-FREEZE.json"), "utf8"));

  requireMatch(checks, "DESIGN_AND_REGISTRATION_IDENTITY", receipt.designId === DESIGN_ID && receipt.registrationHash === REGISTRATION_HASH);
  requireMatch(checks, "SOURCE_AND_RUNNER_COMMIT_IDENTITY", receipt.sourceCommit === SOURCE_COMMIT && receipt.runnerCommit === SOURCE_COMMIT);
  requireMatch(checks, "ERRATUM_SELF_HASH", artifactHash(erratum, "erratumHash") === ERRATUM_HASH
    && receipt.sourceEnumerationHashErratumHash === ERRATUM_HASH);
  requireMatch(checks, "A22_REPORT_SELF_HASH", artifactHash(a22Report, "reportHash") === A22_REPORT_HASH
    && a22Report.protectedCustody.formalFreezeReceiptHash === receipt.formalFreezeReceiptHash);

  const sourceParityEntries = RUNTIME_SOURCE_PATHS.map((repoRelativePath) => {
    const approved = committedEntry(repositoryRoot, APPROVED_READINESS_SOURCE_COMMIT, repoRelativePath);
    const current = committedEntry(repositoryRoot, SOURCE_COMMIT, repoRelativePath);
    requireMatch(checks, `SOURCE_PARITY_${repoRelativePath.replace(/[^A-Za-z0-9]+/gu, "_").toUpperCase()}`,
      approved.gitBlobOid === current.gitBlobOid && approved.sha256 === current.sha256);
    return {
      repoRelativePath,
      approvedReadinessGitBlobOid: approved.gitBlobOid,
      currentGitBlobOid: current.gitBlobOid,
      contentSha256: current.sha256,
    };
  });
  requireMatch(checks, "SOURCE_CLOSURE_PARITY_ROOT", hashJson(sourceParityEntries) === receipt.sourceClosureParityHash);
  const runnerEntries = RUNNER_SOURCE_PATHS.map((repoRelativePath) => committedEntry(repositoryRoot, SOURCE_COMMIT, repoRelativePath));
  requireMatch(checks, "RUNNER_CLOSURE_ROOT", hashJson(runnerEntries) === receipt.runnerHash);

  const frame = verifyFrameAndClusters({ checks, rows, clusterAudit, frameRegistration });
  verifySample({ checks, rows, clusterAudit, frameRegistration, sample, ...frame });
  verifyC0({ checks, sample, c0 });
  await verifyCustodyAndRights({ checks, protectedRoot, rows, sample, c0, receipt, custody, ownerDecision });

  const formalScreens = await readJsonl(protectedRoot, "formal-item-screens.jsonl");
  const scannerReceipts = await readJsonl(protectedRoot, "scanner-execution-receipts.jsonl");
  const screenEvidence = await readJsonl(protectedRoot, "item-screen-evidence.jsonl");
  const egressDecisions = await readJsonl(protectedRoot, "item-egress-decisions.jsonl");
  requireMatch(checks, "SCREEN_AND_EGRESS_COVERAGE", [formalScreens, scannerReceipts, screenEvidence, egressDecisions]
    .every((entries) => entries.length === rows.length && new Set(entries.map((entry) => entry.itemId)).size === rows.length));
  requireMatch(checks, "FORMAL_SCREEN_SELF_HASHES", formalScreens.every((entry) => artifactHash(entry, "selfHash") === entry.selfHash));
  requireMatch(checks, "SCANNER_RECEIPT_SELF_HASHES", scannerReceipts.every((entry) => artifactHash(entry, "scannerExecutionReceiptHash") === entry.scannerExecutionReceiptHash));
  requireMatch(checks, "SCREEN_EVIDENCE_SELF_HASHES", screenEvidence.every((entry) => artifactHash(entry, "screenEvidenceHash") === entry.screenEvidenceHash));
  requireMatch(checks, "EGRESS_DECISION_SELF_HASHES", egressDecisions.every((entry) => artifactHash(entry, "itemEgressDecisionHash") === entry.itemEgressDecisionHash));
  const rowById = new Map(rows.map((row) => [row.itemId, row]));
  requireMatch(checks, "EGRESS_DECISION_FRAME_BINDING", egressDecisions.every((entry) => rowById.get(entry.itemId)?.itemHash === entry.itemHash
    && rowById.get(entry.itemId)?.eligible === entry.eligible && rowById.get(entry.itemId)?.exclusionCode === entry.exclusionCode));

  requireMatch(checks, "FRAME_SAMPLE_C0_RECEIPT_ROOTS", receipt.frameRegistrationHash === frameRegistration.frameRegistrationHash
    && receipt.samplingFrameHash === frameRegistration.samplingFrameHash
    && receipt.clusterAuditHash === clusterAudit.clusterAuditHash
    && receipt.sampleManifestHash === sample.sampleManifestHash
    && receipt.c0RandomAuditHash === c0.auditHash);
  requireMatch(checks, "CLAIM_BOUNDARY", receipt.decisionCeiling === "INCONCLUSIVE_MACHINE_REFERENCE"
    && receipt.claimCeiling === "FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED");

  const body = {
    schemaVersion: "IndependentFrameSampleFreezeReviewReceiptV1",
    artifactKind: "A11_INDEPENDENT_RECOMPUTATION_NOT_GOLD_LABEL_REVIEW_NOT_PROVIDER_AUTHORIZATION",
    designId: DESIGN_ID,
    registrationHash: REGISTRATION_HASH,
    reviewResult: "CONCURRED",
    reviewedExecutionReportHash: A22_REPORT_HASH,
    reviewedSourceCommit: receipt.sourceCommit,
    reviewedRunnerCommit: receipt.runnerCommit,
    reviewedRunnerHash: receipt.runnerHash,
    verifierCommit,
    verifierHash,
    independence: {
      importedA21FormalBuilder: false,
      importedA21SampleContract: false,
      importedA21StorageImplementation: false,
      importedMainScorerOrDecisionEngine: false,
      recomputedHomologyEdgesAndComponents: true,
      recomputedHamiltonSample: true,
      recomputedC0Selection: true,
      recomputedCustodyAndGitClosure: true,
    },
    checkCount: checks.length,
    matchedCheckCount: checks.filter((entry) => entry.status === "MATCH").length,
    mismatchCount: 0,
    checks,
    recomputedCounts: {
      frameRowCount: rows.length,
      eligibleRowCount: rows.filter((row) => row.eligible).length,
      eligibleClusterCount: frame.clusters.length,
      sampleClusterCount: sample.selectedRows.length,
      c0SelectedCount: c0.selectedRows.length,
      protectedFileCount: custody.fileCount + 2,
    },
    recomputedRoots: {
      samplingFrameHash: frame.physicalRoot,
      frameSelectionContentRootHash: frame.selectionRoot,
      clusterAuditHash: clusterAudit.clusterAuditHash,
      frameRegistrationHash: frameRegistration.frameRegistrationHash,
      sampleManifestHash: sample.sampleManifestHash,
      sampleSelectionContentRootHash: sample.sampleSelectionContentRootHash,
      c0RandomAuditHash: c0.auditHash,
      custodyManifestHash: custody.custodyManifestHash,
      formalFreezeReceiptHash: receipt.formalFreezeReceiptHash,
    },
    ownerSourceScopeConcurred: true,
    visualAssetExclusionConcurred: true,
    publicReceiptContentBlindnessConcurred: true,
    providerExecutionAuthorized: false,
    credentialReadAuthorized: false,
    questionEgressAuthorizedNow: false,
    providerRequestCount: 0,
    credentialReadCount: 0,
    naturalQuestionEgressCount: 0,
    naturalQuestionResultCount: 0,
    aggregateConclusionPublicationAllowedNow: false,
    decisionCeiling: "INCONCLUSIVE_MACHINE_REFERENCE",
    claimCeiling: "FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED_INDEPENDENTLY_REVIEWED",
    reviewedAt,
  };
  return Object.freeze({ ...body, independentReviewHash: hashJson(body) });
}

export function parseIndependentReviewCliArgs(argv) {
  if (argv.length !== 4 || argv[0] !== "--protected-root" || argv[2] !== "--reviewed-at") {
    throw new TypeError("usage: independent verifier --protected-root ABSOLUTE_PATH --reviewed-at RFC3339");
  }
  if (!path.isAbsolute(argv[1]) || new Date(argv[3]).toISOString() !== argv[3]) {
    throw new TypeError("protected root and reviewed-at must be canonical");
  }
  return { protectedRoot: argv[1], reviewedAt: argv[3] };
}

async function main() {
  const input = parseIndependentReviewCliArgs(process.argv.slice(2));
  const receipt = await verifyIndependentFormalFreezeV5(input);
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    const status = error instanceof ReviewFailure && error.kind === "DISCREPANCY" ? "DISCREPANCY" : "UNREVIEWABLE";
    process.stderr.write(`${JSON.stringify({
      schemaVersion: "IndependentFrameSampleFreezeReviewFailureV1",
      reviewResult: status,
      failedCheckId: error instanceof ReviewFailure ? error.checkId : "UNREVIEWABLE_INTERNAL_OR_IO_FAILURE",
      providerRequestCount: 0,
      credentialReadCount: 0,
      naturalQuestionEgressCount: 0,
      naturalQuestionResultCount: 0,
    })}\n`);
    process.exitCode = 1;
  });
}
