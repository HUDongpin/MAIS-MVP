import {
  canonicalJson,
  sha256Hex,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/design-contract.mjs";
import {
  calculateExactContentHashV3,
  calculateLineageKeyHashV3,
  calculateNormalizedPromptHashV3,
  calculateTemplateSkeletonHashV3,
  canonicalizeStrictItemJsonV4,
  normalizedEditSimilarityV3,
  normalizePromptForNearV3,
  trigramJaccardV3,
} from "../../research/mais-natural-ca60-v1/versions/design-v4/sample-contract.mjs";

const RESPONSE_FORMS = Object.freeze(["multiple-choice", "fill-in", "short-answer"]);

function plainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function codePointCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function stringOrNull(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function lineageFor(rawQuestion, convertedQuestion, metadata) {
  const raw = plainObject(rawQuestion) ? rawQuestion : {};
  const meta = plainObject(metadata) ? metadata : {};
  const batchId = stringOrNull(raw.batch) ?? stringOrNull(meta.batch);
  const clusterId = stringOrNull(raw.clusterId);
  const generationTemplate = stringOrNull(raw.generationTemplate);
  const sourceLessonSlug = stringOrNull(raw.sourceLessonSlug);
  let lineageKind = null;
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
    responseForm: convertedQuestion.type,
  };
  return {
    ...lineageRow,
    packageId: stringOrNull(raw.sourcePackageId),
    lineageKeyHash: calculateLineageKeyHashV3(lineageRow),
  };
}

function auditLeaf(record, index) {
  if (!plainObject(record)) throw new TypeError(`itemRecords[${index}] must be an object`);
  const question = record.convertedQuestion;
  if (!plainObject(question)) throw new TypeError(`itemRecords[${index}] lacks the converted runtime question`);
  const itemId = stringOrNull(record.itemId) ?? stringOrNull(question.id);
  if (itemId === null) throw new TypeError(`itemRecords[${index}] lacks a stable item ID`);
  const responseForm = question.type;
  if (!RESPONSE_FORMS.includes(responseForm)) throw new TypeError(`item ${itemId} response form is outside the frozen set`);
  const canonicalTopic = stringOrNull(question.canonicalTopicId) ?? stringOrNull(question.topicId);
  if (canonicalTopic === null) throw new TypeError(`item ${itemId} canonical topic is missing`);
  const lineage = lineageFor(record.rawQuestion, question, record.generationMetadata);
  const content = canonicalizeStrictItemJsonV4({
    prompt: question.prompt,
    options: question.options ?? null,
    storedAnswer: question.answer ?? null,
    acceptedAnswers: question.acceptedAnswers ?? [],
    explanation: question.explanation ?? null,
  });
  const row = {
    itemId,
    grade: question.grade,
    canonicalTopic,
    responseForm,
    difficulty: question.difficulty,
    prompt: content.prompt,
    options: content.options,
    storedAnswer: content.storedAnswer,
    acceptedAnswers: content.acceptedAnswers,
    explanation: content.explanation,
    ...lineage,
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
  return Object.freeze({
    ...row,
    itemHash,
    exactDuplicateGroupId: `exact-${calculateExactContentHashV3(row)}`,
    normalizedPromptHash: calculateNormalizedPromptHashV3(row),
    templateSkeletonHash: calculateTemplateSkeletonHashV3(row),
    normalizedPrompt: normalizePromptForNearV3(row.prompt),
  });
}

function sortedPair(left, right) {
  return codePointCompare(left.itemId, right.itemId) <= 0 ? [left, right] : [right, left];
}

export function auditRuntimeHomologyV1({ itemRecords }) {
  if (!Array.isArray(itemRecords) || itemRecords.length === 0) throw new TypeError("full runtime item records are required");
  const leaves = itemRecords.map(auditLeaf).sort((left, right) => codePointCompare(left.itemId, right.itemId));
  const itemIds = new Set();
  for (const leaf of leaves) {
    if (itemIds.has(leaf.itemId)) throw new TypeError(`duplicate item ID ${leaf.itemId} before clustering`);
    itemIds.add(leaf.itemId);
  }

  const parent = leaves.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot === rightRoot) return;
    if (leftRoot < rightRoot) parent[rightRoot] = leftRoot;
    else parent[leftRoot] = rightRoot;
  };
  const edges = [];

  const connectByHash = (field, edgeType) => {
    const firstByHash = new Map();
    for (const [index, leaf] of leaves.entries()) {
      const value = leaf[field];
      if (value === null) continue;
      const prior = firstByHash.get(value);
      if (prior === undefined) {
        firstByHash.set(value, index);
        continue;
      }
      union(prior, index);
      const [left, right] = sortedPair(leaves[prior], leaf);
      edges.push({
        edgeType,
        leftItemId: left.itemId,
        rightItemId: right.itemId,
        evidenceHash: value,
      });
    }
  };
  connectByHash("exactDuplicateGroupId", "EXACT");
  connectByHash("templateSkeletonHash", "TEMPLATE");
  connectByHash("lineageKeyHash", "SOURCE");

  const nearBuckets = new Map();
  for (const [index, leaf] of leaves.entries()) {
    const key = canonicalJson([leaf.responseForm, leaf.canonicalTopic]);
    const bucket = nearBuckets.get(key) ?? [];
    bucket.push(index);
    nearBuckets.set(key, bucket);
  }
  for (const bucket of nearBuckets.values()) {
    for (let leftPosition = 0; leftPosition < bucket.length; leftPosition += 1) {
      for (let rightPosition = leftPosition + 1; rightPosition < bucket.length; rightPosition += 1) {
        const leftIndex = bucket[leftPosition];
        const rightIndex = bucket[rightPosition];
        const left = leaves[leftIndex];
        const right = leaves[rightIndex];
        const trigramJaccard = trigramJaccardV3(left.normalizedPrompt, right.normalizedPrompt);
        if (trigramJaccard < 0.9) continue;
        const normalizedEditSimilarity = normalizedEditSimilarityV3(left.normalizedPrompt, right.normalizedPrompt);
        if (normalizedEditSimilarity < 0.92) continue;
        union(leftIndex, rightIndex);
        const [orderedLeft, orderedRight] = sortedPair(left, right);
        edges.push({
          edgeType: "NEAR",
          leftItemId: orderedLeft.itemId,
          rightItemId: orderedRight.itemId,
          trigramJaccard,
          normalizedEditSimilarity,
          evidenceHash: sha256Hex(canonicalJson({
            leftNormalizedPromptHash: orderedLeft.normalizedPromptHash,
            rightNormalizedPromptHash: orderedRight.normalizedPromptHash,
            trigramJaccard,
            normalizedEditSimilarity,
          })),
        });
      }
    }
  }

  const membersByRoot = new Map();
  for (const [index, leaf] of leaves.entries()) {
    const root = find(index);
    const members = membersByRoot.get(root) ?? [];
    members.push(leaf);
    membersByRoot.set(root, members);
  }
  const blockingAnomalies = [];
  const components = [...membersByRoot.values()].map((members) => {
    const orderedMembers = [...members].sort((left, right) => codePointCompare(left.itemId, right.itemId));
    const homologyClusterId = `homology-${sha256Hex(canonicalJson(orderedMembers.map(({ itemId, itemHash }) => [itemId, itemHash])))}`;
    const canonicalTopics = [...new Set(orderedMembers.map((member) => member.canonicalTopic))]
      .sort(codePointCompare);
    const frameShare = orderedMembers.length / leaves.length;
    if (frameShare > 0.05) {
      blockingAnomalies.push({
        code: "OVERSIZED_COMPONENT_GT_5_PERCENT",
        homologyClusterId,
        itemCount: orderedMembers.length,
        frameShare,
      });
    }
    if (canonicalTopics.length > 2) {
      blockingAnomalies.push({
        code: "BRIDGE_COMPONENT_GT_2_TOPICS",
        homologyClusterId,
        itemCount: orderedMembers.length,
        canonicalTopics,
      });
    }
    return {
      homologyClusterId,
      itemCount: orderedMembers.length,
      frameShare,
      canonicalTopics,
      itemIds: orderedMembers.map((member) => member.itemId),
    };
  }).sort((left, right) => codePointCompare(left.homologyClusterId, right.homologyClusterId));

  const clusterByItemId = new Map();
  for (const component of components) {
    for (const itemId of component.itemIds) clusterByItemId.set(itemId, component.homologyClusterId);
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
    codePointCompare(left.leftItemId, right.leftItemId)
      || codePointCompare(left.rightItemId, right.rightItemId)
      || codePointCompare(left.edgeType, right.edgeType)
  ));
  blockingAnomalies.sort((left, right) => (
    codePointCompare(left.homologyClusterId, right.homologyClusterId)
      || codePointCompare(left.code, right.code)
  ));
  const sizeCounts = new Map();
  for (const component of components) sizeCounts.set(component.itemCount, (sizeCounts.get(component.itemCount) ?? 0) + 1);
  const componentSizeDistribution = [...sizeCounts.entries()]
    .map(([itemCount, componentCount]) => ({ itemCount, componentCount }))
    .sort((left, right) => left.itemCount - right.itemCount);
  const largest20Components = [...components]
    .sort((left, right) => right.itemCount - left.itemCount || codePointCompare(left.homologyClusterId, right.homologyClusterId))
    .slice(0, 20);
  const singletonCount = components.filter((component) => component.itemCount === 1).length;
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
  return Object.freeze({ ...body, auditRootHash: sha256Hex(canonicalJson(body)) });
}
