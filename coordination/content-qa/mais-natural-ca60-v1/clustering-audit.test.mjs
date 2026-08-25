import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./clustering-audit.mjs");
}

function localized(value) {
  return { en: value, zh: `ZH ${value}`, zhHans: `ZH-HANS ${value}` };
}

function record({
  id,
  prompt = `Solve item ${id}`,
  topic = "topic-a",
  responseForm = "short-answer",
  answer = "4",
  batch = "us-ca-k-g5-v3-deepseek",
  clusterId = null,
  generationTemplate = null,
  sourceLessonSlug = null,
}) {
  const convertedQuestion = {
    id,
    canonicalTopicId: topic,
    topicId: topic,
    topic: localized(topic),
    grade: "P5",
    type: responseForm,
    difficulty: "Medium",
    prompt: localized(prompt),
    options: responseForm === "multiple-choice" ? [localized("3"), localized("4")] : undefined,
    answer,
    acceptedAnswers: [answer],
    explanation: localized(`Because ${answer}`),
  };
  return {
    itemId: id,
    grade: "P5",
    rawQuestion: {
      ...structuredClone(convertedQuestion),
      batch,
      clusterId,
      generationTemplate,
      sourceLessonSlug,
      sourceIds: ["california-math-common-core-skill"],
    },
    convertedQuestion,
    publicQuestion: {},
    attemptQuestion: structuredClone(convertedQuestion),
    generationMetadata: { batch },
    materialPresence: { answer: true, options: responseForm === "multiple-choice", explanation: true },
    retainedForDefectReview: true,
    exclusionCode: null,
    recordHash: "1".repeat(64),
  };
}

test("exact, template, near, and fine-grained source edges form deterministic connected components", async () => {
  const api = await subject();
  const longPrompt = "Determine the requested mathematical value from the carefully specified expression and report the result alpha";
  const records = [
    record({ id: "exact-a", prompt: "Compute 2 + 3", answer: "5" }),
    record({ id: "exact-b", prompt: "Compute 2 + 3", answer: "5" }),
    record({ id: "template-c", prompt: "Compute 7 + 9", answer: "16" }),
    record({ id: "near-a", prompt: longPrompt, topic: "topic-near" }),
    record({ id: "near-b", prompt: `${longPrompt.slice(0, -1)}b`, topic: "topic-near" }),
    record({ id: "source-a", prompt: "A source lineage question", topic: "topic-source", batch: "us-ca-g6-g12-v2", generationTemplate: "linear-v1" }),
    record({ id: "source-b", prompt: "Completely different wording", topic: "topic-source", batch: "us-ca-g6-g12-v2", generationTemplate: "linear-v1" }),
  ];
  const first = api.auditRuntimeHomologyV1({ itemRecords: records });
  const second = api.auditRuntimeHomologyV1({ itemRecords: structuredClone(records) });
  assert.equal(first.auditRootHash, second.auditRootHash);
  assert.deepEqual(first.itemAssignments, second.itemAssignments);
  assert.ok(first.edges.some((edge) => edge.edgeType === "EXACT"));
  assert.ok(first.edges.some((edge) => edge.edgeType === "TEMPLATE"));
  assert.ok(first.edges.some((edge) => edge.edgeType === "NEAR"));
  assert.ok(first.edges.some((edge) => edge.edgeType === "SOURCE"));
  assert.equal(first.providerRequestCount, 0);

  const assignment = new Map(first.itemAssignments.map((row) => [row.itemId, row.homologyClusterId]));
  assert.equal(assignment.get("exact-a"), assignment.get("exact-b"));
  assert.equal(assignment.get("exact-a"), assignment.get("template-c"));
  assert.equal(assignment.get("near-a"), assignment.get("near-b"));
  assert.equal(assignment.get("source-a"), assignment.get("source-b"));
});

test("near edges require both Jaccard >= 0.90 and edit similarity >= 0.92 in the same form/topic bucket", async () => {
  const api = await subject();
  const base = "This deliberately long prompt asks the learner to determine one numerical result from a stable mathematical relation";
  const records = [
    record({ id: "near-left", prompt: `${base} alpha`, topic: "near-topic" }),
    record({ id: "near-right", prompt: `${base} alphb`, topic: "near-topic" }),
    record({ id: "different-topic", prompt: `${base} alphb`, topic: "other-topic" }),
    record({ id: "different-form", prompt: `${base} alphb`, topic: "near-topic", responseForm: "fill-in" }),
  ];
  const result = api.auditRuntimeHomologyV1({ itemRecords: records });
  const near = result.edges.filter((edge) => edge.edgeType === "NEAR");
  assert.equal(near.length, 1);
  assert.deepEqual([near[0].leftItemId, near[0].rightItemId], ["near-left", "near-right"]);
  assert.ok(near[0].trigramJaccard >= 0.9);
  assert.ok(near[0].normalizedEditSimilarity >= 0.92);
});

test("a component over five percent or spanning over two topics creates a freeze blocker", async () => {
  const api = await subject();
  const oversized = Array.from({ length: 40 }, (_, index) => record({
    id: `oversized-${String(index).padStart(2, "0")}`,
    prompt: index < 3 ? "Same exact protected content" : `Unique protected content ${index} with token ${String.fromCharCode(65 + index)}`,
    topic: index < 3 ? `topic-${index}` : `unique-topic-${index}`,
    answer: index < 3 ? "same" : String(index),
  }));
  const result = api.auditRuntimeHomologyV1({ itemRecords: oversized });
  assert.equal(result.freezeEligible, false);
  assert.ok(result.blockingAnomalies.some((entry) => entry.code === "OVERSIZED_COMPONENT_GT_5_PERCENT"));
  assert.ok(result.blockingAnomalies.some((entry) => entry.code === "BRIDGE_COMPONENT_GT_2_TOPICS"));
});

test("unsupported response forms and duplicate item IDs fail before clustering", async () => {
  const api = await subject();
  assert.throws(
    () => api.auditRuntimeHomologyV1({ itemRecords: [record({ id: "graph", responseForm: "graph" })] }),
    /response form/iu,
  );
  assert.throws(
    () => api.auditRuntimeHomologyV1({ itemRecords: [record({ id: "dup" }), record({ id: "dup" })] }),
    /duplicate.*dup|dup.*duplicate/iu,
  );
});
