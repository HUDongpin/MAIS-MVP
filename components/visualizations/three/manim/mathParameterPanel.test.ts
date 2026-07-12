import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildParameterPanelCatalog,
  parameterPanelDataAttributes,
  serializeParameterPanelCatalog,
  summarizeParameterPanelCatalog
} from "./mathParameterPanel";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
  accent: "#22d3ee",
  state: {
    comparison: 5,
    depthValue: 1.4,
    familyId: "three-function-graph",
    mode: 0,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
    templateId: "function-graph",
    value: 6
  }
});

test("builds a deterministic Manim parameter panel catalog from scene parameters", () => {
  assert.ok(functionGraphSpec);
  const catalog = buildParameterPanelCatalog(functionGraphSpec);

  assert.deepEqual(
    catalog.map((entry) => entry.id),
    ["value", "comparison", "mode", "depth", "primary", "secondary"]
  );
  assert.deepEqual(
    catalog.map((entry) => entry.label),
    ["Primary value", "Comparison value", "Mode", "Depth", "Primary display value", "Secondary display value"]
  );
  assert.deepEqual(
    catalog.map((entry) => entry.role),
    ["control", "control", "control", "derived", "derived", "derived"]
  );
  assert.equal(catalog[0].value, 6);
  assert.equal(catalog[0].normalizedValue, 0.5);
  assert.equal(catalog[3].value, 1.4);
  assert.equal(catalog[3].normalizedValue, 0.35);
});

test("summarizes parameter panel catalogs for browser authoring evidence", () => {
  assert.ok(functionGraphSpec);
  const summary = summarizeParameterPanelCatalog(buildParameterPanelCatalog(functionGraphSpec), "depth");
  const attributes = parameterPanelDataAttributes(summary);

  assert.deepEqual(summary, {
    activeParameterId: "depth",
    controlCount: 3,
    derivedCount: 3,
    parameterCount: 6,
    parameterIds: "value,comparison,mode,depth,primary,secondary",
    summary: "parameters=6;controls=3;derived=3;timeline=0;active=depth;ids=value,comparison,mode,depth,primary,secondary",
    timelineCount: 0
  });
  assert.equal(attributes["data-viz-manim-parameter-panel-count"], "6");
  assert.equal(attributes["data-viz-manim-parameter-panel-control-count"], "3");
  assert.equal(attributes["data-viz-manim-parameter-panel-derived-count"], "3");
  assert.equal(attributes["data-viz-manim-parameter-panel-selected"], "depth");
  assert.equal(attributes["data-viz-manim-parameter-panel-ids"], "value,comparison,mode,depth,primary,secondary");
  assert.equal(
    attributes["data-viz-manim-parameter-panel-summary"],
    "parameters=6;controls=3;derived=3;timeline=0;active=depth;ids=value,comparison,mode,depth,primary,secondary"
  );
});

test("falls back to the first available parameter when the selected parameter is missing", () => {
  assert.ok(functionGraphSpec);
  const summary = summarizeParameterPanelCatalog(buildParameterPanelCatalog(functionGraphSpec), "missing");

  assert.equal(summary.activeParameterId, "value");
});

test("serializes parameter panel catalogs for browser QA without unsafe script characters", () => {
  assert.ok(functionGraphSpec);
  const catalog = [
    ...buildParameterPanelCatalog(functionGraphSpec),
    {
      conceptId: "unsafe<script>",
      id: "unsafe<script>",
      label: "Unsafe <parameter>",
      normalizedValue: 0.25,
      role: "control" as const,
      value: 2.5
    }
  ];
  const json = serializeParameterPanelCatalog(catalog, "unsafe<script>");
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.version, "mais-manim-parameter-panel/v1");
  assert.equal(parsed.parameterCount, 7);
  assert.equal(parsed.controlCount, 4);
  assert.equal(parsed.derivedCount, 3);
  assert.equal(parsed.activeParameterId, "unsafe<script>");
  assert.equal(parsed.entries.length, 7);
  assert.equal(parsed.entries[0].id, "value");
  assert.equal(parsed.entries[0].normalizedValue, 0.5);
  assert.equal(parsed.entries[6].id, "unsafe<script>");
  assert.equal(parsed.entries[6].label, "Unsafe <parameter>");
  assert.equal(parsed.entries[6].conceptId, "unsafe<script>");
});

test("parameter panel authoring stays pure and separate from R3F rendering", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathParameterPanel.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildParameterPanelCatalog/);
  assert.match(source, /parameterPanelDataAttributes/);
  assert.match(source, /serializeParameterPanelCatalog/);
});
