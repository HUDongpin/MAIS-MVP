import assert from "node:assert/strict";
import test from "node:test";

import { getPremiumThreeDDirectLab } from "@/components/visualizations/premiumThreeDDirectLabs";
import { premiumThreeDLaunchLabIds } from "@/components/visualizations/three/threeDSceneMath";
import { topics } from "@/data/topics";

/**
 * The direct route `/student/tools/visualizations/[labId]` builds most of its
 * labs from the lab id alone. Where that id is also a topic id, the catalogue is
 * the authority — inference from the string is a fallback, not a source of
 * truth.
 *
 * Guessing used to be the only path, and it was wrong for 4 of the 9 Hong Kong
 * routes: HK topic ids are bare (`calculus`, `quadratic-patterns`) rather than
 * carrying an `-sN-` segment, so they fell through to a hard-coded `return
 * "S4"` and the page badge told an S6 student they were in S4.
 */

const topicById = new Map(topics.map((topic) => [topic.id, topic]));
const premiumLabIds = [...premiumThreeDLaunchLabIds];

test("every premium direct lab that names a topic reports that topic's grade", () => {
  const mismatches: string[] = [];

  for (const labId of premiumLabIds) {
    const topic = topicById.get(labId);
    if (!topic) continue;

    const lab = getPremiumThreeDDirectLab(labId);
    assert.ok(lab, `${labId}: premium launch lab must resolve`);

    if (lab.grade !== topic.grade) {
      mismatches.push(`${labId}: route says ${lab.grade}, catalogue says ${topic.grade}`);
    }
  }

  assert.deepEqual(mismatches, [], "premium direct routes must not invent a grade");
});

test("hand-written direct-route copy still matches the catalogue it mirrors", () => {
  // premiumThreeDDirectLabs.ts may not import data/topics — the direct route
  // exists to stay off the full catalog path, and visualizationBundleBoundaries
  // pins that. Its local copy table is therefore checked here instead, where
  // importing the catalogue costs nothing.
  const drift: string[] = [];

  for (const labId of premiumLabIds) {
    const topic = topicById.get(labId);
    if (!topic) continue;

    const lab = getPremiumThreeDDirectLab(labId);
    assert.ok(lab, `${labId}: premium launch lab must resolve`);

    const usesGenericCopy = lab.description.en.startsWith("Use a focused 3D visualization model");
    if (usesGenericCopy) continue;

    if (lab.description.en !== topic.description.en) {
      drift.push(`${labId}: route says "${lab.description.en}", catalogue says "${topic.description.en}"`);
    }
    if (!lab.title.en.includes(topic.title.en)) {
      drift.push(`${labId}: title "${lab.title.en}" does not name the topic "${topic.title.en}"`);
    }
  }

  assert.deepEqual(drift, [], "hand-written direct-route copy has drifted from data/topics.ts");
});

test("every premium direct lab is localized in both Chinese scripts", () => {
  for (const labId of premiumLabIds) {
    const lab = getPremiumThreeDDirectLab(labId);
    assert.ok(lab, `${labId}: premium launch lab must resolve`);

    assert.ok(lab.title.zh.length > 0, `${labId}: zh title must be present`);
    assert.ok(lab.description.zh.length > 0, `${labId}: zh description must be present`);
    assert.ok((lab.description.zhHans ?? "").length > 0, `${labId}: zhHans description must be present`);
  }
});

test("Hong Kong premium routes each describe their own topic", () => {
  const hongKongPremiumLabIds = premiumLabIds.filter((labId) => {
    const topic = topicById.get(labId);
    return topic?.curriculumTrack === "HK";
  });

  assert.equal(hongKongPremiumLabIds.length, 9, "HK is expected to hold 9 premium-3D routes");

  const descriptions = new Set(hongKongPremiumLabIds.map((labId) => getPremiumThreeDDirectLab(labId)!.description.en));
  assert.equal(
    descriptions.size,
    hongKongPremiumLabIds.length,
    "all nine HK routes used to ship one identical sentence; each must now describe its own topic"
  );

  const grades = hongKongPremiumLabIds.map((labId) => getPremiumThreeDDirectLab(labId)!.grade);
  assert.ok(new Set(grades).size > 1, "HK premium routes span several grades; a single grade means inference regressed");
});

test("axis labels follow the template's mathematics rather than a generic input/output pair", () => {
  const genericPairs: string[] = [];

  for (const labId of premiumLabIds) {
    const lab = getPremiumThreeDDirectLab(labId);
    if (!lab) continue;

    const { xLabel, yLabel } = lab.templateConfig;
    if (xLabel === "input" && yLabel === "output") {
      genericPairs.push(labId);
    }
  }

  assert.deepEqual(genericPairs, [], "premium routes must not label every axis input/output");
});
