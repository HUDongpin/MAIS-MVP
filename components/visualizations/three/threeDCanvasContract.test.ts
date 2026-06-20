import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { formatThreeDCanvasCameraState, threeDCanvasCameraContract } from "./threeDCanvasCameraContract";
import { formulaForThreeDScene } from "./threeDCanvasContract";
import { threeDCanvasRendererContract } from "./threeDCanvasRendererContract";
import { threeDCanvasWebGLContract } from "./threeDCanvasWebGLContract";
import {
  threeDCanvasKeyboardContract,
  threeDCanvasRequiredDataAttributes,
  threeDCanvasRequiredSelectors,
  threeDCanvasSnapshotContract
} from "./threeDCanvasSurfaceContract";
import {
  familyForVisualizationTemplate,
  threeDFamilyIds,
  threeDFamilyOverrideByLabId,
  threeDTemplateFamilyMap
} from "./threeDSceneMath";
import type { ThreeDFamilyId } from "./threeDSceneTypes";
import type { VisualizationTemplateId } from "../visualizationTemplateIds";

const explicitTemplateByFamilyId = new Map<ThreeDFamilyId, VisualizationTemplateId>(
  Object.entries(threeDTemplateFamilyMap).map(([templateId, familyId]) => [familyId, templateId as VisualizationTemplateId])
);

function templateForFamily(familyId: ThreeDFamilyId): VisualizationTemplateId {
  return explicitTemplateByFamilyId.get(familyId) ?? "vector-conic-3d/strategy-map";
}

test("every approved Three.js family has a stable formula overlay", () => {
  for (const familyId of threeDFamilyIds) {
    const formula = formulaForThreeDScene(familyId, templateForFamily(familyId));

    assert.match(formula, /^\$.+\$$/, `${familyId} formula should be a math overlay`);
    assert.doesNotMatch(formula, /\bundefined\b|\bNaN\b/);
  }
});

test("premium deep Three.js families use specific formulas instead of the generic model fallback", () => {
  const premiumDeepFamilies = Object.values(threeDFamilyOverrideByLabId).filter(Boolean) as ThreeDFamilyId[];
  const formulas = new Map(
    premiumDeepFamilies.map((familyId) => [familyId, formulaForThreeDScene(familyId, templateForFamily(familyId))])
  );

  assert.equal(formulas.get("three-solid-nets-folding"), "$V = lwh$");
  assert.equal(formulas.get("three-cross-section-slicer"), "$A_{slice}$");
  assert.equal(formulas.get("three-space-vectors-lines-planes"), "$\\\\vec n \\\\cdot (\\\\vec r - \\\\vec r_0)=0$");
  assert.equal(formulas.get("three-conic-sections-deep"), "$Ax^2+Bxy+Cy^2+Dx+Ey+F=0$");
  assert.equal(formulas.get("three-optimization-modeling"), "$\\\\nabla f=0$");
  assert.equal(formulas.get("three-statistical-inference-lab"), "$\\\\bar{x} \\\\pm z^*SE$");
  assert.equal(formulas.get("three-curriculum-crosswalk-map"), "$topic \\\\rightarrow representation$");
  assert.equal(formulas.get("three-exam-strategy-capstone"), "$strategy \\\\rightarrow score$");

  for (const [familyId, formula] of formulas) {
    assert.notEqual(formula, "$model \\\\leftrightarrow value$", `${familyId} should avoid the generic formula fallback`);
  }
});

test("ThreeDLabCanvas uses the pure formula contract for its math overlay", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(source, /import \{ formulaForThreeDScene \} from "\.\/threeDCanvasContract"/);
  assert.match(source, /const formulaText = formulaForThreeDScene\(state\.familyId,\s*state\.templateId\)/);
});

test("formula contract keeps template fallback behavior for standard template families", () => {
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("trig-unit-wave"), "trig-unit-wave"), "$y = a\\\\sin(bx+c)$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("calculus-rate-area"), "calculus-rate-area"), "$dy/dx$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("function-family"), "function-family"), "$f(x)$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("statistics-distribution"), "statistics-distribution"), "$\\\\bar{x} \\\\pm s$");
});

test("ThreeDLabCanvas exposes the S11/S22 smoke-test surface contract", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  for (const attribute of threeDCanvasRequiredDataAttributes) {
    assert.match(source, new RegExp(attribute.replace(/-/g, "-")));
  }

  for (const selector of threeDCanvasRequiredSelectors) {
    assert.match(source, new RegExp(selector));
  }

  assert.equal(threeDCanvasRendererContract.gl.preserveDrawingBuffer, true);
  assert.equal(threeDCanvasRendererContract.renderer, threeDCanvasSnapshotContract.renderer);
  assert.match(source, /data-viz-renderer=\{threeDCanvasRendererContract\.renderer\}/);
  assert.match(source, new RegExp(`event\\.key === "${threeDCanvasKeyboardContract.resetCameraKey}"`));
});

test("ThreeDLabCanvas exposes scene metadata for QA and release smoke checks", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const requiredSceneMetadataAttributes = [
    "data-viz-scene-pedagogical-role",
    "data-viz-scene-primitive-floor",
    "data-viz-scene-spatial-model"
  ];

  for (const attribute of requiredSceneMetadataAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(source, new RegExp(attribute));
  }

  assert.match(source, /threeDSceneVariantMetadata\[sceneVariant\]/);
});

test("ThreeDLabCanvas exposes coverage metadata for regional release smoke checks", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const configuredSource = fs.readFileSync("components/visualizations/ConfiguredVisualizationLab.tsx", "utf8");
  const requiredCoverageAttributes = [
    "data-viz-coverage-tier",
    "data-viz-premium-launch",
    "data-viz-regional-priority"
  ];

  for (const attribute of requiredCoverageAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /coverageTier = "standard-3d"/);
  assert.match(canvasSource, /data-viz-coverage-tier=\{coverageTier\}/);
  assert.match(canvasSource, /data-viz-premium-launch=\{premiumLaunch \? "true" : "false"\}/);
  assert.match(canvasSource, /data-viz-regional-priority=\{regionalPriority \?\? "standard"\}/);
  assert.match(configuredSource, /coverageTier=\{lab\?\.threeD\?\.coverageTier\}/);
  assert.match(configuredSource, /premiumLaunch=\{lab\?\.threeD\?\.premiumLaunch\}/);
  assert.match(configuredSource, /regionalPriority=\{lab\?\.threeD\?\.regionalPriority\}/);
});

test("ThreeDLabCanvas reports mark count from scene primitive metadata", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(source, /data-viz-mark-count=\{sceneMetadata\.minPrimitiveCount\}/);
  assert.doesNotMatch(source, /data-viz-mark-count="1"/);
});

test("ThreeDLabCanvas consumes a pure camera framing contract", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const contractPath = "components/visualizations/three/threeDCanvasCameraContract.ts";

  assert.ok(fs.existsSync(contractPath), "Three.js canvas camera framing should live in a pure contract module");

  const contractSource = fs.readFileSync(contractPath, "utf8");

  assert.match(canvasSource, /import \{[^}]*threeDCanvasCameraContract[^}]*\} from "\.\/threeDCanvasCameraContract"/);
  assert.match(canvasSource, /threeDCanvasCameraContract\.defaultCamera/);
  assert.match(canvasSource, /threeDCanvasCameraContract\.cameraTarget/);
  assert.match(canvasSource, /threeDCanvasCameraContract\.orbitBounds/);
  assert.doesNotMatch(canvasSource, /const defaultCamera =/);
  assert.doesNotMatch(canvasSource, /const cameraTarget = new THREE\.Vector3\(0, 0\.42, 0\)/);
  assert.doesNotMatch(contractSource, /"use client"|@react-three\/drei|@react-three\/fiber|from "three"/);
});

test("ThreeDLabCanvas derives the initial camera-state smoke signal from the camera contract", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.equal(formatThreeDCanvasCameraState(threeDCanvasCameraContract.defaultCamera), "azimuth=45.00;elevation=35.00;distance=4.80");
  assert.match(canvasSource, /useState\(formatThreeDCanvasCameraState\(threeDCanvasCameraContract\.defaultCamera\)\)/);
  assert.match(canvasSource, /return formatThreeDCanvasCameraState\(/);
  assert.doesNotMatch(canvasSource, /useState\("azimuth=45\.00;elevation=35\.00;distance=4\.80"\)/);
});

test("ThreeDLabCanvas consumes a pure renderer snapshot contract", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const contractPath = "components/visualizations/three/threeDCanvasRendererContract.ts";

  assert.ok(fs.existsSync(contractPath), "Three.js canvas renderer settings should live in a pure contract module");

  const contractSource = fs.readFileSync(contractPath, "utf8");

  assert.match(canvasSource, /import \{ threeDCanvasRendererContract \} from "\.\/threeDCanvasRendererContract"/);
  assert.match(canvasSource, /new THREE\.Color\(threeDCanvasRendererContract\.backgroundColor\)/);
  assert.match(canvasSource, /data-viz-renderer=\{threeDCanvasRendererContract\.renderer\}/);
  assert.match(canvasSource, /dpr=\{threeDCanvasRendererContract\.devicePixelRatioRange\}/);
  assert.match(canvasSource, /gl=\{threeDCanvasRendererContract\.gl\}/);
  assert.doesNotMatch(canvasSource, /new THREE\.Color\("#0b1420"\)/);
  assert.doesNotMatch(canvasSource, /dpr=\{\[1,\s*2\]\}/);
  assert.doesNotMatch(canvasSource, /gl=\{\{ antialias: true, preserveDrawingBuffer: true \}\}/);
  assert.match(contractSource, /renderer: "three-r3f"/);
  assert.match(contractSource, /preserveDrawingBuffer: true/);
  assert.doesNotMatch(contractSource, /"use client"|@react-three\/drei|@react-three\/fiber|from "three"/);
});

test("ThreeDLabCanvas consumes a pure lighting contract", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const contractPath = "components/visualizations/three/threeDCanvasLightingContract.ts";

  assert.ok(fs.existsSync(contractPath), "Three.js canvas lighting settings should live in a pure contract module");

  const contractSource = fs.readFileSync(contractPath, "utf8");

  assert.match(canvasSource, /import \{ threeDCanvasLightingContract \} from "\.\/threeDCanvasLightingContract"/);
  assert.match(canvasSource, /threeDCanvasLightingContract\.ambient\.intensity/);
  assert.match(canvasSource, /threeDCanvasLightingContract\.directional\.map/);
  assert.doesNotMatch(canvasSource, /<ambientLight intensity=\{0\.72\}/);
  assert.doesNotMatch(canvasSource, /<directionalLight color="#fff7cc" intensity=\{2\.1\} position=\{\[4, 6, 4\]\}/);
  assert.doesNotMatch(canvasSource, /<directionalLight color="#67e8f9" intensity=\{0\.65\} position=\{\[-4, 3, -3\]\}/);
  assert.match(contractSource, /ambient:\s*\{\s*[\s\S]*intensity:\s*0\.72/);
  assert.match(contractSource, /color:\s*"#fff7cc"/);
  assert.match(contractSource, /color:\s*"#67e8f9"/);
  assert.doesNotMatch(contractSource, /"use client"|@react-three\/drei|@react-three\/fiber|from "three"/);
});

test("ThreeDLabCanvas keeps SVG fallback reserved for confirmed WebGL-unavailable browsers", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const contractPath = "components/visualizations/three/threeDCanvasWebGLContract.ts";

  assert.ok(fs.existsSync(contractPath), "Three.js WebGL status handling should live in a pure contract module");
  assert.equal(threeDCanvasWebGLContract.detectingStatus, "detecting");
  assert.equal(threeDCanvasWebGLContract.readyStatus, "ready");
  assert.equal(threeDCanvasWebGLContract.fallbackStatus, "fallback");
  assert.equal(threeDCanvasWebGLContract.fallbackReason, "webgl-unavailable");

  const contractSource = fs.readFileSync(contractPath, "utf8");

  assert.match(canvasSource, /import \{ threeDCanvasWebGLContract \} from "\.\/threeDCanvasWebGLContract"/);
  assert.match(canvasSource, /if \(webglSupported === null\)/);
  assert.match(canvasSource, /data-viz-three-webgl-status=\{threeDCanvasWebGLContract\.detectingStatus\}/);
  assert.match(canvasSource, /if \(webglSupported === false\)/);
  assert.match(canvasSource, /data-viz-three-webgl-status=\{threeDCanvasWebGLContract\.fallbackStatus\}/);
  assert.match(canvasSource, /data-viz-three-fallback-reason=\{threeDCanvasWebGLContract\.fallbackReason\}/);
  assert.match(canvasSource, /data-viz-three-webgl-status=\{threeDCanvasWebGLContract\.readyStatus\}/);
  assert.doesNotMatch(canvasSource, /webglSupported !== true\) return <>\{fallback\}<\/>/);
  assert.doesNotMatch(contractSource, /"use client"|@react-three\/drei|@react-three\/fiber|from "three"/);
});
