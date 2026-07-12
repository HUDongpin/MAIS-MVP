import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT,
  buildCameraShotCatalog,
  cameraShotCatalogDataAttributes,
  serializeCameraShotCatalog,
  summarizeCameraShotCatalog
} from "./mathCameraShotAuthoring";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";

const expectedCameraShotAuthoringSourceContract =
  "CameraShot authoring: named CameraFrame shots map cameraTo timeline beats to selectable shot controls" as const;

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

test("builds a named CameraFrame shot catalog for authoring controls", () => {
  assert.ok(functionGraphSpec);
  const catalog = buildCameraShotCatalog(functionGraphSpec);

  assert.deepEqual(catalog.map((entry) => entry.shotId), ["overview", "curve-detail"]);
  assert.deepEqual(catalog.map((entry) => entry.label), ["1. overview", "2. curve-detail"]);
  assert.deepEqual(catalog.map((entry) => entry.elapsedSeconds), [0, 8.64]);
  assert.equal(catalog[0].isCanonical, true);
  assert.equal(catalog[0].hasTimelineBeat, false);
  assert.equal(catalog[1].isCanonical, false);
  assert.equal(catalog[1].hasTimelineBeat, true);
});

test("summarizes camera shot catalogs for browser QA evidence", () => {
  assert.ok(functionGraphSpec);
  const summary = summarizeCameraShotCatalog(buildCameraShotCatalog(functionGraphSpec), "curve-detail");
  const attributes = cameraShotCatalogDataAttributes(summary);

  assert.equal(CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT, expectedCameraShotAuthoringSourceContract);
  assert.deepEqual(summary, {
    activeShotId: "curve-detail",
    canonicalShotId: "overview",
    missingTimelineShotCount: 0,
    missingTimelineShotIds: "none",
    shotCount: 2,
    shotIds: "overview,curve-detail",
    sourceContract: CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT,
    summary: "shots=2;canonical=overview;active=curve-detail;timelineShots=curve-detail",
    timelineShotIds: "curve-detail"
  });
  assert.equal(attributes["data-viz-manim-camera-shot-count"], "2");
  assert.equal(attributes["data-viz-manim-camera-shot-ids"], "overview,curve-detail");
  assert.equal(attributes["data-viz-manim-camera-shot-missing-count"], "0");
  assert.equal(attributes["data-viz-manim-camera-shot-missing-ids"], "none");
  assert.equal(attributes["data-viz-manim-camera-shot-selected"], "curve-detail");
  assert.equal(attributes["data-viz-manim-camera-shot-source-contract"], CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-camera-shot-summary"], "shots=2;canonical=overview;active=curve-detail;timelineShots=curve-detail");
});

test("reports cameraTo timeline beats that reference missing CameraFrame shots", () => {
  assert.ok(functionGraphSpec);
  const catalog = buildCameraShotCatalog({
    ...functionGraphSpec,
    timeline: [
      ...functionGraphSpec.timeline,
      { type: "cameraTo", shotId: "missing-detail", duration: 1 }
    ]
  });
  const summary = summarizeCameraShotCatalog(catalog, "missing-detail");
  const attributes = cameraShotCatalogDataAttributes(summary);

  assert.equal(summary.activeShotId, "overview");
  assert.equal(summary.missingTimelineShotCount, 1);
  assert.equal(summary.missingTimelineShotIds, "missing-detail");
  assert.equal(
    summary.summary,
    "shots=2;canonical=overview;active=overview;timelineShots=curve-detail;missingTimelineShots=missing-detail"
  );
  assert.equal(attributes["data-viz-manim-camera-shot-missing-count"], "1");
  assert.equal(attributes["data-viz-manim-camera-shot-missing-ids"], "missing-detail");
});

test("serializes camera shot catalogs for browser QA without unsafe script characters", () => {
  assert.ok(functionGraphSpec);
  const sceneWithUnsafeShots = {
    ...functionGraphSpec,
    cameraShots: [
      ...functionGraphSpec.cameraShots,
      {
        id: "unsafe<script>",
        position: [1, 2, 3] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
        fov: 45
      }
    ],
    timeline: [
      ...functionGraphSpec.timeline,
      { type: "cameraTo" as const, shotId: "unsafe<script>", duration: 1 },
      { type: "cameraTo" as const, shotId: "missing<script>", duration: 1 }
    ]
  };
  const catalog = buildCameraShotCatalog(sceneWithUnsafeShots);
  const json = serializeCameraShotCatalog(catalog, "unsafe<script>");
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.version, "mais-manim-camera-shot-authoring/v1");
  assert.equal(parsed.shotCount, 3);
  assert.equal(parsed.activeShotId, "unsafe<script>");
  assert.equal(parsed.canonicalShotId, "overview");
  assert.equal(parsed.missingTimelineShotCount, 1);
  assert.equal(parsed.missingTimelineShotIds, "missing<script>");
  assert.deepEqual(parsed.missingTimelineShotIdList, ["missing<script>"]);
  assert.equal(parsed.entries.length, 3);
  assert.equal(parsed.entries[0].shotId, "overview");
  assert.equal(parsed.entries[2].shotId, "unsafe<script>");
  assert.equal(parsed.entries[2].hasTimelineBeat, true);
  assert.equal(parsed.entries[2].isCanonical, false);
});

test("Camera shot authoring stays pure and separate from R3F rendering", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathCameraShotAuthoring.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildCameraShotCatalog/);
  assert.match(source, /CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT/);
  assert.match(source, /cameraShotCatalogDataAttributes/);
  assert.match(source, /serializeCameraShotCatalog/);
});
