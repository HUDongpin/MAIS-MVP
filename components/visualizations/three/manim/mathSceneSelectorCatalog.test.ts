import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathSceneSelectorCatalog,
  mathSceneSelectorDataAttributes,
  summarizeMathSceneSelectorCatalog
} from "./mathSceneSelectorCatalog";
import { maisManimFamilyIds } from "./mathSceneRegistry";

const functionGraphState = {
  comparison: 5,
  depthValue: 1.4,
  familyId: "three-function-graph" as const,
  mode: 0,
  primaryValue: 6,
  secondaryValue: 5,
  stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
  templateId: "function-graph" as const,
  value: 6
};

test("builds a selectable catalog for every registered MAIS Manim scene spec", () => {
  const catalog = buildMathSceneSelectorCatalog({
    accent: "#22d3ee",
    state: functionGraphState
  });
  const functionGraphEntry = catalog.find((entry) => entry.familyId === "three-function-graph");

  assert.equal(catalog.length, maisManimFamilyIds.length);
  assert.ok(functionGraphEntry);
  assert.equal(functionGraphEntry.sceneId, "mais-manim-function-graph");
  assert.equal(functionGraphEntry.approvedForRuntime, true);
  assert.equal(functionGraphEntry.objectCount, 4);
  assert.equal(functionGraphEntry.timelineStepCount, 6);
  assert.equal(functionGraphEntry.formulaTokenCount, 2);
  assert.equal(functionGraphEntry.semanticBindingCount, 2);
  assert.match(functionGraphEntry.signature, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(functionGraphEntry.label, "mais-manim-function-graph");
});

test("summarizes the selected scene spec for browser authoring evidence", () => {
  const catalog = buildMathSceneSelectorCatalog({
    accent: "#22d3ee",
    state: functionGraphState
  });
  const summary = summarizeMathSceneSelectorCatalog(catalog, "three-function-graph");
  const attributes = mathSceneSelectorDataAttributes(summary);

  assert.equal(summary.activeFamilyId, "three-function-graph");
  assert.equal(summary.activeSceneId, "mais-manim-function-graph");
  assert.equal(summary.approvedSceneCount, catalog.length);
  assert.equal(summary.sceneCount, catalog.length);
  assert.match(summary.familyIds, /three-function-graph/);
  assert.match(summary.sceneIds, /mais-manim-function-graph/);
  assert.equal(attributes["data-viz-manim-scene-selector-count"], String(catalog.length));
  assert.equal(attributes["data-viz-manim-scene-selector-approved-count"], String(catalog.length));
  assert.equal(attributes["data-viz-manim-scene-selector-selected-family-id"], "three-function-graph");
  assert.equal(attributes["data-viz-manim-scene-selector-selected-scene-id"], "mais-manim-function-graph");
  assert.match(attributes["data-viz-manim-scene-selector-family-ids"], /three-function-graph/);
  assert.match(attributes["data-viz-manim-scene-selector-scene-ids"], /mais-manim-function-graph/);
  assert.match(attributes["data-viz-manim-scene-selector-summary"], /selected=mais-manim-function-graph/);
});

test("falls back to the first selectable scene when the selected family is missing", () => {
  const catalog = buildMathSceneSelectorCatalog({
    accent: "#22d3ee",
    state: functionGraphState
  });
  const summary = summarizeMathSceneSelectorCatalog(catalog, "missing-family");

  assert.equal(summary.activeFamilyId, catalog[0].familyId);
  assert.equal(summary.activeSceneId, catalog[0].sceneId);
});

test("scene selector catalog stays pure and separate from R3F rendering", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneSelectorCatalog.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMathSceneSelectorCatalog/);
  assert.match(source, /mathSceneSelectorDataAttributes/);
});
