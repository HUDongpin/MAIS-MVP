import assert from "node:assert/strict";
import test from "node:test";
import { getPrimaryVisualizationLabForTopic } from "@/data/visualizationLabs";
import { productionLessonSeeds } from "@/data/lessons";

// Topics whose dedicated instrument the shared two-slider template cannot
// express. Before this routing existed the components were referenced by no
// reachable code path, so every learner got the weaker template: base-ten caps
// place value at 99 for a lesson teaching 1000, and number-line is integer-only
// for a lesson teaching tenths and hundredths.
const BESPOKE_TOPIC_MODULES: Record<string, string> = {
  "p1-counting-number-bonds": "coordinate-plane-demo",
  "p1-addition-subtraction": "coordinate-plane-demo",
  "p2-place-value": "coordinate-plane-demo",
  "p4-decimals": "coordinate-plane-demo",
  "p6-speed": "coordinate-plane-demo",
  "p1-shapes-patterns": "geometry-explorer",
  "p2-multiplication-foundations": "geometry-explorer",
  "p2-length-data": "geometry-explorer",
  "p3-fractions-intro": "geometry-explorer",
  "p3-geometry-patterns": "geometry-explorer",
  "p4-angles": "geometry-explorer",
  "p4-perimeter-area": "geometry-explorer",
  "p5-fractions-operations": "geometry-explorer",
  "p5-volume": "geometry-explorer",
  "p6-percentages": "function-model-comparer"
};

test("topics with a purpose-built instrument resolve to it in the lab registry", () => {
  const wrong: string[] = [];
  for (const [topicId, moduleId] of Object.entries(BESPOKE_TOPIC_MODULES)) {
    const lab = getPrimaryVisualizationLabForTopic(topicId);
    if (!lab) {
      wrong.push(`${topicId}: no lab record`);
      continue;
    }
    if (lab.moduleId !== moduleId) wrong.push(`${topicId}: lab module ${lab.moduleId} !== ${moduleId}`);
  }
  assert.deepEqual(wrong, []);
});

test("the lesson embed and the lab page resolve the same module for every topic", () => {
  // A divergence here means a learner sees one model inside the lesson and a
  // different one on the Visualization Lab page for the same topic.
  const diverged: string[] = [];
  for (const lesson of productionLessonSeeds) {
    const block = lesson.blocks.find((candidate) => candidate.visualizationConfig);
    const config = block?.visualizationConfig;
    if (!config) continue;
    const lab = getPrimaryVisualizationLabForTopic(config.topicId ?? lesson.topicId);
    if (!lab) continue;
    if (lab.moduleId !== config.moduleId) {
      diverged.push(`${lesson.topicId}: lesson ${config.moduleId} !== lab ${lab.moduleId}`);
    }
  }
  assert.deepEqual(diverged, []);
});

test("the purpose-built instruments cover the capability the template lacks", async () => {
  // Guards the reason for the routing, not just the wiring: if these components
  // ever lose the third place-value slider or decimal resolution, the routing is
  // pointless and the template would be no worse.
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const source = await readFile(join(process.cwd(), "components/visualizations/CoordinatePlaneDemo.tsx"), "utf8");
  assert.match(source, /hundreds \* 100 \+ tens \* 10 \+ ones/, "place value must reach the hundreds column");
  assert.match(source, /tenths \/ 10 \+ hundredths \/ 100/, "decimals must resolve tenths and hundredths");
});
