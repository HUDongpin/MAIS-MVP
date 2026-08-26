import assert from "node:assert/strict";
import test from "node:test";

import {
  capstoneVisualizationLabs,
  getPrimaryVisualizationLabForTopic,
  visualizationLabCatalog
} from "@/data/visualizationLabs";
import { topics } from "@/data/topics";

/**
 * All five cross-region CAPSTONE labs reuse a Hong Kong topic id:
 *
 *   capstone-primary-number-sense-bridge          -> p6-pre-secondary-problem-solving
 *   capstone-primary-measurement-proportion-bridge -> p6-ratio-proportion
 *   capstone-junior-algebra-geometry-bridge        -> mixed-problem-solving
 *   capstone-senior-function-calculus-stats-bridge -> statistics-s6
 *   capstone-hk-mainland-crosswalk-explorer        -> exam-revision
 *
 * Three of those five ask for a different template than the HK lab does, so
 * whichever definition wins decides which model a Hong Kong student is taught
 * from. Today the HK lab wins, because capstone labs carry
 * `primaryForTopic: false` and `primaryVisualizationLabByTopicId` is built from
 * the primary labs only.
 *
 * That is correct, and it is currently an accident of two flags agreeing. These
 * tests make it a contract: a capstone lab may share a topic id, but it may
 * never become that topic's primary.
 */

const topicById = new Map(topics.map((topic) => [topic.id, topic]));

test("no capstone lab claims to be the primary lab for a topic", () => {
  const claimed = capstoneVisualizationLabs
    .filter((lab) => lab.primaryForTopic)
    .map((lab) => `${lab.labId} -> ${lab.topicId}`);

  assert.deepEqual(claimed, [], "a capstone lab must never be a topic's primary lab");
});

test("every topic resolves its primary lab to a lab on its own track", () => {
  const wrongTrack: string[] = [];

  for (const topic of topics) {
    const primary = getPrimaryVisualizationLabForTopic(topic.id);
    if (!primary) continue;

    // US labs carry a track of "US" across CA/AR/FL/NC publishers, so compare
    // by publisher there and by track elsewhere.
    const sameOwner =
      primary.curriculumTrack === "CAPSTONE"
        ? false
        : primary.publisher === topic.publisher || primary.topicId === topic.id;

    if (!sameOwner) {
      wrongTrack.push(`${topic.id} (${topic.curriculumTrack}) -> ${primary.labId} (${primary.curriculumTrack})`);
    }
  }

  assert.deepEqual(wrongTrack, [], "a topic's primary lab must belong to that topic, not another track");
});

test("a shared topic id never leaves a topic with two primaries", () => {
  const primariesByTopic = new Map<string, string[]>();

  for (const lab of visualizationLabCatalog) {
    if (!lab.primaryForTopic) continue;
    const existing = primariesByTopic.get(lab.topicId) ?? [];
    existing.push(lab.labId);
    primariesByTopic.set(lab.topicId, existing);
  }

  const duplicated = [...primariesByTopic.entries()]
    .filter(([, labIds]) => labIds.length > 1)
    .map(([topicId, labIds]) => `${topicId}: ${labIds.join(", ")}`);

  assert.deepEqual(duplicated, [], "exactly one lab may be primary for a topic");
});

test("every Hong Kong topic whose id a capstone reuses still resolves to its HK lab", () => {
  const sharedTopicIds = capstoneVisualizationLabs
    .map((lab) => lab.topicId)
    .filter((topicId) => topicById.get(topicId)?.curriculumTrack === "HK");

  assert.equal(sharedTopicIds.length, 5, "five HK topic ids are reused by capstone labs");

  for (const topicId of sharedTopicIds) {
    const primary = getPrimaryVisualizationLabForTopic(topicId);
    assert.ok(primary, `${topicId}: must resolve a primary lab`);
    assert.equal(
      primary.curriculumTrack,
      "HK",
      `${topicId}: a capstone lab must not take over a Hong Kong topic`
    );
  }
});
