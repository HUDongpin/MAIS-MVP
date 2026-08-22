import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildConfiguredVisualizationLessonSessionRecord,
  deriveConfiguredVisualizationMachineState,
  isConfiguredVisualizationControlKey,
  resolveConfiguredVisualizationProductionRenderer
} from "./ConfiguredVisualizationLab";
import {
  HK_DEDICATED_LAB_IDS,
  HK_PASS_THROUGH_LAB_IDS,
  HK_VISUALIZATION_LAB_IDS
} from "./hk/hkVisualizationLabRegistry";
import { visualizationLabCatalog } from "@/data/visualizationLabs";

const combinedVisualizationLabCatalog = visualizationLabCatalog;
const byLabId = new Map(combinedVisualizationLabCatalog.map((lab) => [lab.labId, lab]));

test("P2 multiplication machine state names the object total without leaking a formal area field", () => {
  const state = deriveConfiguredVisualizationMachineState({
    comparison: 5,
    family: "equal-groups-array",
    height: 3,
    mode: 0,
    topic: "p2-multiplication-foundations",
    value: 4,
    variant: "p2-multiplication-foundations"
  });

  assert.equal(state.rows, 4);
  assert.equal(state.columns, 5);
  assert.equal(state.total, 20);
  assert.equal("product" in state, false);
  assert.equal("area" in state, false);
});

test("lesson-safe Advanced Functions and calculus machine states exclude unproven comparison, secant, and area payloads", () => {
  const advanced = deriveConfiguredVisualizationMachineState({
    comparison: 4,
    family: "function-properties",
    height: 3,
    mode: 2,
    topic: "advanced-functions",
    value: 5,
    variant: "advanced-functions"
  });
  assert.equal(advanced.mode, 0);
  assert.equal(advanced.family, "quadratic");
  assert.equal(advanced.scale, 5 / 6);
  assert.equal(advanced.verticalShift, -1);
  assert.equal(advanced.selectedCurveOnly, true);
  assert.equal("comparisonFamily" in advanced, false);
  assert.equal("comparisonSeries" in advanced, false);

  for (const topic of ["differentiation-intro", "calculus"] as const) {
    const tangent = deriveConfiguredVisualizationMachineState({
      comparison: 4,
      family: "derivative-rate-area",
      height: 3,
      mode: 2,
      topic,
      value: 5,
      variant: topic
    });
    assert.equal(tangent.activeMode, "tangent");
    assert.equal(tangent.mode, 0, "legacy mode input must project to the exact lesson-safe tangent mode");
    assert.equal(tangent.slope, -0.4);
    for (const forbiddenKey of [
      "approximateArea",
      "areaError",
      "exactArea",
      "exactIntegral",
      "lowerBound",
      "midpointApproximation",
      "secantSlope",
      "signedError",
      "stripCount",
      "tangentSlope",
      "x1"
    ]) {
      assert.equal(forbiddenKey in tangent, false, `${topic} must exclude ${forbiddenKey}`);
    }
    assert.doesNotMatch(String(tangent.formula), /secant|midpoint|area|integral|∫/iu);
    assert.doesNotMatch(String(tangent.check), /secant|midpoint|area|integral|∫/iu);
  }
});

test("Configured production routing reaches all 44 HK dedicated labs and preserves all 7 pass-through labs", () => {
  const hongKongLabs = combinedVisualizationLabCatalog.filter((lab) => lab.curriculumTrack === "HK");
  assert.equal(hongKongLabs.length, 51);
  assert.deepEqual(
    [...hongKongLabs.map((lab) => lab.labId)].sort(),
    [...HK_VISUALIZATION_LAB_IDS].sort()
  );

  assert.equal(HK_DEDICATED_LAB_IDS.length, 44);
  for (const labId of HK_DEDICATED_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(lab.curriculumTrack, "HK");
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "hk-dedicated",
      `${labId} must reach HKVisualizationLab instead of the generic template.`
    );
  }

  assert.equal(HK_PASS_THROUGH_LAB_IDS.length, 7);
  for (const labId of HK_PASS_THROUGH_LAB_IDS) {
    const lab = byLabId.get(labId);
    assert.ok(lab, `${labId} must be present in the production catalog.`);
    assert.equal(lab.curriculumTrack, "HK");
    assert.equal(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "configured",
      `${labId} must retain the shared Configured semantic surface.`
    );
  }

  for (const lab of combinedVisualizationLabCatalog.filter((candidate) => candidate.curriculumTrack !== "HK")) {
    assert.notEqual(
      resolveConfiguredVisualizationProductionRenderer(lab),
      "hk-dedicated",
      `${lab.labId} must never enter the HK-only dispatcher.`
    );
  }
});

test("the final HK catalog keeps the two legacy S4 routes separate from the two new S3 routes", () => {
  assert.equal(
    visualizationLabCatalog.filter((lab) => lab.labId === "identities-square-patterns").length,
    1,
    "The A18 topic source must generate exactly one identities lab row."
  );
  assert.equal(
    visualizationLabCatalog.filter((lab) => lab.labId === "arc-length-sector-area").length,
    1,
    "The A18 topic source must generate exactly one arc-and-sector lab row."
  );
  assert.equal(byLabId.get("quadratic-patterns")?.grade, "S4");
  assert.equal(byLabId.get("circles")?.grade, "S4");
  assert.equal(byLabId.get("identities-square-patterns")?.grade, "S3");
  assert.equal(byLabId.get("arc-length-sector-area")?.grade, "S3");

  assert.match(byLabId.get("quadratic-patterns")?.title.en ?? "", /Quadratic Functions/);
  assert.match(byLabId.get("circles")?.title.en ?? "", /Circle Geometry/);
  assert.match(byLabId.get("identities-square-patterns")?.templateConfig.formula?.en ?? "", /≡/);
  assert.match(byLabId.get("arc-length-sector-area")?.templateConfig.formula?.en ?? "", /theta\/360.*2πr.*πr\^2/);
});

test("standalone and lesson surfaces have exactly one explicit active-lab owner by contract", async () => {
  const [configuredSource, pageSource, lessonSource] = await Promise.all([
    readFile(path.join(process.cwd(), "components/visualizations/ConfiguredVisualizationLab.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/visualizations/VisualizationLabPage.tsx"), "utf8"),
    readFile(path.join(process.cwd(), "components/lesson/LessonView.tsx"), "utf8")
  ]);

  assert.match(pageSource, /data-viz-active-lab-id=\{activeDirectoryLab\?\.labId \?\? ""\}/);
  assert.match(pageSource, /<ActiveDirectoryLabComponent[\s\S]*?labId=\{activeDirectoryLab\.labId\}/);
  assert.match(configuredSource, /const ownsActiveLabIdentity = !labId/);
  assert.match(
    configuredSource,
    /data-viz-active-lab-id=\{ownsActiveLabIdentity \? configuredTopicId : undefined\}/
  );

  const lessonVisualizationCall = lessonSource.slice(
    lessonSource.indexOf("<VisualizationModule"),
    lessonSource.indexOf("</>", lessonSource.indexOf("<VisualizationModule"))
  );
  assert.match(lessonVisualizationCall, /topicId=\{visualizationTopicId\}/);
  assert.match(lessonVisualizationCall, /lab=\{visualizationLab\}/);
  assert.doesNotMatch(lessonVisualizationCall, /\blabId=/);

  assert.match(configuredSource, /<HKVisualizationLab lab=\{lab\} controlFooterAction=\{controlFooterAction\} \/>/);
  assert.match(configuredSource, /data-viz-module-id=\{configuredVisualizationModuleId\}/);
  assert.match(configuredSource, /data-viz-topic-id=\{configuredTopicId\}/);
  assert.match(
    configuredSource,
    /data-viz-reset-model[\s\S]{0,400}data-viz-reset-module-id=\{configuredModuleId\}[\s\S]{0,200}data-viz-reset-topic-id=\{configuredTopicId\}/
  );
  assert.equal([...configuredSource.matchAll(/data-viz-reset-module-id=/g)].length, 1);
  assert.equal([...configuredSource.matchAll(/data-viz-reset-topic-id=/g)].length, 1);
});

test("Configured reset evidence uses the projected lesson-safe mode rather than stale raw topic state", async () => {
  const configuredSource = await readFile(
    path.join(process.cwd(), "components/visualizations/ConfiguredVisualizationLab.tsx"),
    "utf8"
  );
  assert.match(configuredSource, /data-viz-reset-mode=\{cappedMode\}/u);
  assert.doesNotMatch(configuredSource, /data-viz-reset-mode=\{mode\}/u);
  assert.match(configuredSource, /data-viz-mode=\{visibleMode\}/u);
  assert.match(configuredSource, /data-viz-renderer-mode=\{modelMode\}/u);
  assert.match(configuredSource, /data-viz-semantic-control-mode=\{cappedMode\}/u);
});

test("lesson-only session records are exact per user and topic while standalone keeps the outer card owner", async () => {
  const identities = byLabId.get("identities-square-patterns");
  const arc = byLabId.get("arc-length-sector-area");
  assert.ok(identities);
  assert.ok(arc);

  const identityRecord = buildConfiguredVisualizationLessonSessionRecord({
    currentUserId: "student-a",
    lab: identities,
    labId: undefined,
    queuedAt: 1_234,
    topicId: identities.topicId
  });
  const arcRecord = buildConfiguredVisualizationLessonSessionRecord({
    currentUserId: "student-a",
    lab: arc,
    labId: undefined,
    queuedAt: 1_235,
    topicId: arc.topicId
  });
  assert.deepEqual(identityRecord, {
    userId: "student-a",
    moduleId: "configured-visualization-lab",
    topicId: "identities-square-patterns",
    source: identities.analyticsSource,
    queuedAt: 1_234
  });
  assert.deepEqual(arcRecord, {
    userId: "student-a",
    moduleId: "configured-visualization-lab",
    topicId: "arc-length-sector-area",
    source: arc.analyticsSource,
    queuedAt: 1_235
  });
  assert.notEqual(identityRecord?.topicId, arcRecord?.topicId);
  assert.equal(buildConfiguredVisualizationLessonSessionRecord({
    currentUserId: null,
    lab: identities,
    labId: undefined,
    queuedAt: 1_236,
    topicId: identities.topicId
  }), null);
  assert.equal(buildConfiguredVisualizationLessonSessionRecord({
    currentUserId: "student-a",
    lab: identities,
    labId: identities.labId,
    queuedAt: 1_237,
    topicId: identities.topicId
  }), null);

  const configuredSource = await readFile(
    path.join(process.cwd(), "components/visualizations/ConfiguredVisualizationLab.tsx"),
    "utf8"
  );
  assert.match(configuredSource, /onPointerUpCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(configuredSource, /onKeyUpCapture=\{recordLessonSessionFromInteraction\}/);
  assert.match(configuredSource, /\[data-viz-lesson-action-slot\]/);
  assert.match(configuredSource, /queueVisualizationSessionOutbox\(window\.localStorage, record\)/);
  assert.match(configuredSource, /visualizationSessionOutboxUpdatedEventName/);
});

test("lesson session ownership ignores focus-only keys and accepts real keyboard control changes", () => {
  for (const key of [
    " ",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "End",
    "Enter",
    "Home",
    "PageDown",
    "PageUp"
  ]) {
    assert.equal(isConfiguredVisualizationControlKey(key), true, key);
  }
  for (const key of ["Tab", "Escape", "Shift", "Control", "Alt", "Meta", "a", ""]) {
    assert.equal(isConfiguredVisualizationControlKey(key), false, key);
  }
  assert.equal(isConfiguredVisualizationControlKey(undefined), false);
});
