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

function dataVizAttributesFromSource(source: string) {
  return [...new Set(source.match(/data-viz-[a-z0-9-]+/g) ?? [])].sort();
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

test("ThreeDLabCanvas exposes VMobject pointwise_become_partial source evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const curveSource = fs.readFileSync("components/visualizations/three/manim/mathCurveObject.ts", "utf8");
  const curvePartialSource = fs.readFileSync("components/visualizations/three/manim/mathCurvePartialEvidence.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  for (const attribute of [
    "data-viz-curve-partial-source-contract",
    "data-viz-curve-partial-visibility-policy"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose VMobject pointwise_become_partial source evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(curveSource, new RegExp(attribute));
  }

  assert.match(curveSource, /VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT/);
  assert.match(curveSource, /VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY/);
  assert.match(curvePartialSource, /buildActiveCurvePartialFrame/);
  assert.match(curvePartialSource, /serializeCurvePartialFrame/);
  assert.match(curvePartialSource, /pointwiseBecomePartialCurveObject/);
  assert.match(evidenceSource, /buildActiveCurvePartialFrame/);
  assert.match(evidenceSource, /curvePartialSourceContract/);
  assert.match(evidenceSource, /curvePartialVisibilityPolicy/);
  assert.match(
    canvasSource,
    /import \{ VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT, VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY \} from "\.\/manim\/mathCurveObject"/
  );
  assert.match(
    canvasSource,
    /import \{ buildActiveCurvePartialFrame, serializeCurvePartialFrame \} from "\.\/manim\/mathCurvePartialEvidence"/
  );
  assert.match(canvasSource, /buildActiveCurvePartialFrame\(manimRuntimeState\)/);
  assert.match(canvasSource, /serializeCurvePartialFrame\(manimCurvePartialFrame\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCurvePartialJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-curve-partial-plan",
    "data-viz-manim-curve-partial-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose VMobject pointwise_become_partial JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /curvePartialSourceContract:\s*VMOBJECT_PARTIAL_CURVE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /curvePartialVisibilityPolicy:\s*VMOBJECT_PARTIAL_CURVE_VISIBILITY_POLICY/);
  assert.doesNotMatch(
    canvasSource,
    /"VMobject\.pointwise_become_partial preserves object identity and style while swapping in a partial path"/
  );
  assert.doesNotMatch(canvasSource, /"showcreation-uses-partial-path-by-alpha"/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-curve-partial-source-contract"\]/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-curve-partial-visibility-policy"\]/);
});

test("ThreeDLabCanvas passes MAIS Manim runtime state into the formula overlay for projected labels", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const overlaySource = fs.readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");
  const surfaceSource = `${canvasSource}\n${overlaySource}`;

  assert.match(
    canvasSource,
    /import \{ PROJECTED_LABEL_SOURCE_CONTRACT, buildProjectedLabelAnchorsFromRuntimeState, serializeProjectedLabelAnchors, summarizeProjectedLabelAnchors, type ProjectionViewport \} from "\.\/manim\/mathProjectedLabels"/
  );
  assert.match(canvasSource, /const surfaceRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(canvasSource, /const \[manimFormulaOverlayViewport, setManimFormulaOverlayViewport\] = useState<ProjectionViewport>\(\{ width: 800, height: 450 \}\)/);
  assert.match(canvasSource, /const \[manimFormulaOverlayViewportSource, setManimFormulaOverlayViewportSource\] = useState<"fallback" \| "measured">\("fallback"\)/);
  assert.match(canvasSource, /ResizeObserver/);
  assert.match(canvasSource, /ref=\{surfaceRef\}/);
  assert.match(canvasSource, /FORMULA_LAYER_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildFormulaLayerState/);
  assert.match(canvasSource, /buildActiveProjectedLabelTextByObjectId/);
  assert.match(canvasSource, /formulaLayerProjectedLabelTextDataAttributes/);
  assert.match(canvasSource, /summarizeActiveProjectedLabelText/);
  assert.match(canvasSource, /manimFormulaLayerActiveIds/);
  assert.match(canvasSource, /activeConceptIds=\{manimFormulaLayerActiveIds\}/);
  assert.match(canvasSource, /buildFormulaOverlayCollisionDiagnostics\(/);
  assert.match(canvasSource, /formulaOverlayCollisionDataAttributes\(manimFormulaCollisionDiagnostics\)/);
  assert.match(canvasSource, /serializeFormulaOverlayCollisionDiagnostics\(manimFormulaCollisionDiagnostics\)/);
  assert.match(canvasSource, /const manimFormulaCollisionJson = useMemo/);
  assert.match(canvasSource, /buildProjectedLabelAnchorsFromRuntimeState\(manimRuntimeState, manimFormulaOverlayViewport/);
  assert.match(canvasSource, /summarizeProjectedLabelAnchors\(manimMeasuredProjectedLabels\)/);
  assert.match(canvasSource, /serializeProjectedLabelAnchors\(manimMeasuredProjectedLabels\)/);
  assert.match(canvasSource, /const manimProjectedLabelJson = useMemo/);
  assert.match(canvasSource, /<MathFormulaOverlay[\s\S]*runtimeState=\{manimRuntimeState \?\? undefined\}/);
  assert.match(canvasSource, /projectedLabelViewport=\{manimFormulaOverlayViewport\}/);
  assert.match(canvasSource, /projectedLabelViewportSource=\{manimFormulaOverlayViewportSource\}/);
  assert.doesNotMatch(canvasSource, /projectedLabelViewport=\{\{ width: 800, height: 450 \}\}/);
  assert.match(
    overlaySource,
    /maxWidth: `\$\{formulaCollisionDiagnostics\.formulaBox\.width\.toFixed\(2\)\}px`/
  );
  assert.match(
    overlaySource,
    /maxHeight: `\$\{formulaCollisionDiagnostics\.formulaBox\.height\.toFixed\(2\)\}px`/
  );
  assert.match(
    overlaySource,
    /data-viz-manim-formula-overlay[\s\S]*?tabIndex=\{0\}[\s\S]*?className="[^"]*overflow-auto/
  );

  for (const attribute of [
    "data-viz-manim-formula-collision-count",
    "data-viz-manim-formula-collision-label-ids",
    "data-viz-manim-formula-collision-source-contract",
    "data-viz-manim-formula-layer-source-contract",
    "data-viz-manim-formula-mobile-viewport",
    "data-viz-manim-formula-safe-area-status",
    "data-viz-manim-formula-safe-area-summary",
    "data-viz-manim-formula-viewport-height",
    "data-viz-manim-formula-viewport-source",
    "data-viz-manim-formula-viewport-width",
    "data-viz-manim-projected-label-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose FormulaLayer mobile collision diagnostics`
    );
    assert.match(surfaceSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-projected-label-plan",
    "data-viz-manim-projected-label-json",
    "data-viz-manim-formula-collision-plan",
    "data-viz-manim-formula-collision-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured FormulaLayer collision payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /data-viz-manim-formula-collision-count=\{manimFormulaCollisionAttributes\["data-viz-manim-formula-collision-count"\]\}/
  );
  assert.match(canvasSource, /FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /data-viz-manim-formula-collision-source-contract=\{\s*manimFormulaCollisionAttributes\["data-viz-manim-formula-collision-source-contract"\]\s*\?\?\s*FORMULA_OVERLAY_COLLISION_SOURCE_CONTRACT\s*\}/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-formula-mobile-viewport=\{manimFormulaCollisionAttributes\["data-viz-manim-formula-mobile-viewport"\]\}/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-formula-safe-area-summary=\{manimFormulaCollisionAttributes\["data-viz-manim-formula-safe-area-summary"\]\}/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-formula-layer-source-contract=\{manimEvidenceAttributes\?\.\["data-viz-manim-formula-layer-source-contract"\] \?\? manimFormulaLayer\?\.sourceContract \?\? FORMULA_LAYER_SOURCE_CONTRACT\}/
  );
  assert.doesNotMatch(
    canvasSource,
    /data-viz-manim-formula-collision-count=\{manimEvidenceAttributes\?\.\["data-viz-manim-formula-collision-count"\]/
  );

  for (const selector of [
    "data-viz-manim-formula-token",
    "data-viz-manim-projected-label-layer",
    "data-viz-manim-mark"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should be a first-class FormulaLayer/mark smoke selector`
    );
    assert.match(surfaceSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas owns the MAIS Manim runtime clock shared by evidence, overlay, and R3F", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/ThreeDLabSceneRegistry.tsx", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(canvasSource, /const \[manimElapsedSeconds, setManimElapsedSeconds\] = useState\(0\)/);
  assert.match(canvasSource, /const \[manimFrameIndex, setManimFrameIndex\] = useState\(0\)/);
  assert.match(canvasSource, /const \[steppedManimFrameStep, setSteppedManimFrameStep\] = useState<MathSceneFrameStep \| null>\(null\)/);
  assert.match(canvasSource, /function ManimRuntimeClock/);
  assert.match(canvasSource, /useFrame/);
  assert.match(
    canvasSource,
    /import \{ frameStepDataAttributes, SCENE_FRAME_STEPPER_SOURCE_CONTRACT, serializeMathSceneFrameStepCapture, stepMathSceneFrame, type MathSceneFrameStep \} from "\.\/manim\/mathSceneFrameStepper"/
  );
  assert.match(canvasSource, /stepMathSceneFrame\(manimScene,\s*\{/);
  assert.match(canvasSource, /stepMathSceneFrame\(manimScene,[\s\S]*formulaLayerViewport: manimFormulaOverlayViewport/);
  assert.match(canvasSource, /setSteppedManimFrameStep\(null\)/);
  assert.match(canvasSource, /const fallbackManimFrameStep = useMemo<MathSceneFrameStep \| null>/);
  assert.match(canvasSource, /const manimFrameStep = steppedManimFrameStep !== null &&\s*steppedManimFrameStep\.runtimeState\.sceneId === manimScene\?\.sceneId/);
  assert.doesNotMatch(canvasSource, /buildMathSceneRuntimeState\(manimScene, manimElapsedSeconds\)/);
  assert.doesNotMatch(canvasSource, /applyMathUpdaters\(manimScene, baseRuntimeState/);
  assert.match(canvasSource, /data-viz-manim-elapsed-seconds=\{manimElapsedSeconds\.toFixed\(3\)\}/);
  assert.match(canvasSource, /data-viz-manim-frame-index=\{manimScene \? manimFrameIndex : 0\}/);
  assert.match(canvasSource, /<ThreeDLabSceneRegistry[\s\S]*manimElapsedSeconds=\{manimElapsedSeconds\}/);
  assert.match(canvasSource, /<ThreeDLabSceneRegistry[\s\S]*manimRuntimeState=\{manimRuntimeState\}/);
  assert.match(registrySource, /manimElapsedSeconds\?: number/);
  assert.match(registrySource, /runtimeState=\{props\.manimRuntimeState\}/);
  assert.doesNotMatch(runtimeSource, /useFrame/);
  assert.doesNotMatch(runtimeSource, /useState/);
  assert.match(runtimeSource, /elapsedSeconds = 0/);
  assert.match(runtimeSource, /runtimeState: providedRuntimeState/);
});

test("ThreeDLabCanvas exposes current Manim frame-stepper capture evidence for browser QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const frameStepperSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameStepper.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-frame-stepper-active-step",
    "data-viz-manim-frame-stepper-camera-shot",
    "data-viz-manim-frame-stepper-delta-seconds",
    "data-viz-manim-frame-stepper-elapsed-seconds",
    "data-viz-manim-frame-stepper-frame-index",
    "data-viz-manim-frame-stepper-playback-phase",
    "data-viz-manim-frame-stepper-render-group-ids",
    "data-viz-manim-frame-stepper-render-group-overlap-ids",
    "data-viz-manim-frame-stepper-scene-id",
    "data-viz-manim-frame-stepper-source-contract",
    "data-viz-manim-frame-stepper-summary",
    "data-viz-manim-frame-stepper-updater-active-count",
    "data-viz-manim-frame-stepper-updater-suspended-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose the current Scene.update_frame stepper capture to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(frameStepperSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ frameStepDataAttributes, SCENE_FRAME_STEPPER_SOURCE_CONTRACT, serializeMathSceneFrameStepCapture, stepMathSceneFrame, type MathSceneFrameStep \} from "\.\/manim\/mathSceneFrameStepper"/
  );
  assert.match(frameStepperSource, /SCENE_FRAME_STEPPER_SOURCE_CONTRACT/);
  assert.match(frameStepperSource, /serializeMathSceneFrameStepCapture/);
  assert.match(canvasSource, /data-viz-manim-frame-stepper-source-contract=/);
  assert.match(canvasSource, /SCENE_FRAME_STEPPER_SOURCE_CONTRACT/);
  assert.match(canvasSource, /const manimFrameStepAttributes = useMemo/);
  assert.match(canvasSource, /frameStepDataAttributes\(manimFrameStep\)/);
  for (const selector of [
    "data-viz-manim-frame-stepper-capture",
    "data-viz-manim-frame-stepper-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Scene.update_frame capture JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /serializeMathSceneFrameStepCapture\(manimFrameStep\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFrameStepJson \?\? "" \}\}/);
});

test("ThreeDLabCanvas passes previous frame runtime state into MAIS Manim invalidation evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(canvasSource, /const previousManimRuntimeStateRef = useRef<MathSceneFrameStep\["runtimeState"\] \| null>\(null\)/);
  assert.match(canvasSource, /previousRuntimeStateRef: MutableRefObject<MathSceneFrameStep\["runtimeState"\] \| null>/);
  assert.match(canvasSource, /previousRuntimeState: previousRuntimeStateRef\.current\?\.sceneId === scene\.sceneId/);
  assert.match(canvasSource, /setFrameStep\(nextFrame\)/);
  assert.match(canvasSource, /previousRuntimeStateRef\.current = nextFrame\.runtimeState/);
  assert.match(canvasSource, /previousManimRuntimeStateRef\.current\?\.sceneId === manimScene\.sceneId/);
  assert.match(canvasSource, /previousRuntimeState,/);
  assert.match(canvasSource, /previousManimRuntimeStateRef\.current = manimRuntimeState/);
  assert.match(canvasSource, /previousManimRuntimeStateRef\.current = null/);
  assert.match(canvasSource, /data-viz-mobject-invalidated-ids/);
  assert.match(canvasSource, /data-viz-mobject-invalidation-reasons/);
  assert.match(canvasSource, /data-viz-mobject-animation-owned-invalidation-count/);
  assert.match(canvasSource, /data-viz-mobject-updater-active-invalidation-count/);
  assert.match(canvasSource, /data-viz-mobject-unknown-invalidation-count/);
  assert.match(canvasSource, /data-viz-mobject-invalidation-ownership-summary/);
  assert.match(canvasSource, /data-viz-mobject-invalidation-summary/);
  assert.match(canvasSource, /data-viz-mobject-data-changed-count/);
});

test("ThreeDLabCanvas exposes FormulaBinding anchor evidence for projected-label browser QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const anchorSource = fs.readFileSync("components/visualizations/three/manim/mathFormulaBindingAnchors.ts", "utf8");
  const formulaBindingSource = fs.readFileSync("components/visualizations/three/manim/mathFormulaBindings.ts", "utf8");

  for (const attribute of [
    "data-viz-formula-binding-anchor-count",
    "data-viz-formula-binding-missing-anchor-count",
    "data-viz-formula-binding-missing-anchor-token-ids",
    "data-viz-formula-binding-anchor-source-contract",
    "data-viz-semantic-binding-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose FormulaBinding projected-label anchor coverage to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
  }

  assert.match(anchorSource, /FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT/);
  assert.match(formulaBindingSource, /FORMULA_BINDING_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /formulaBindingAnchorSourceContract/);
  assert.match(evidenceSource, /semanticBindingSourceContract/);
  assert.match(evidenceSource, /summarizeFormulaBindingAnchors/);
  assert.match(canvasSource, /formulaBindingAnchorCount/);
  assert.match(canvasSource, /formulaBindingMissingAnchorCount/);
  assert.match(canvasSource, /formulaBindingMissingAnchorTokenIds/);
  assert.match(canvasSource, /FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT/);
  assert.match(canvasSource, /FORMULA_BINDING_SOURCE_CONTRACT/);
});

test("ThreeDLabCanvas exposes projected formula label evidence for browser QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const projectedLabelSource = fs.readFileSync("components/visualizations/three/manim/mathProjectedLabels.ts", "utf8");
  const formulaLayerSource = fs.readFileSync("components/visualizations/three/manim/mathFormulaLayer.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-projected-label-count",
    "data-viz-manim-projected-label-visible-count",
    "data-viz-manim-projected-label-hidden-count",
    "data-viz-manim-projected-label-object-count",
    "data-viz-manim-projected-label-object-ids",
    "data-viz-manim-projected-label-concept-ids",
    "data-viz-manim-projected-label-hidden-object-ids",
    "data-viz-manim-projected-label-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose projected formula-label coverage to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(projectedLabelSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-projected-label-text-object-count",
    "data-viz-manim-projected-label-text-object-ids",
    "data-viz-manim-projected-label-text-policy",
    "data-viz-manim-projected-label-text-source",
    "data-viz-manim-projected-label-text-source-contract",
    "data-viz-manim-projected-label-text-summary",
    "data-viz-manim-projected-label-text-token-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose projected formula-label coverage to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(formulaLayerSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /buildProjectedLabelAnchorsFromRuntimeState/);
  assert.match(evidenceSource, /formulaLayerProjectedLabelTextDataAttributes/);
  assert.match(evidenceSource, /projectedLabelAnchorDataAttributes/);
  assert.match(evidenceSource, /summarizeProjectedLabelAnchors/);
  assert.match(projectedLabelSource, /serializeProjectedLabelAnchors/);
  assert.match(canvasSource, /data-viz-manim-projected-label-plan/);
  assert.match(canvasSource, /data-viz-manim-projected-label-json/);
  assert.match(canvasSource, /manimProjectedLabelCount/);
  assert.match(canvasSource, /manimProjectedLabelVisibleCount/);
  assert.match(canvasSource, /manimProjectedLabelObjectIds/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject uniform evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");
  const runtimeGraphSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeGraph.ts", "utf8");
  const uniformsSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectUniforms.ts", "utf8");
  const materialSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectMaterialUniforms.ts", "utf8");

  for (const attribute of [
    "data-viz-mobject-uniform-count",
    "data-viz-mobject-fixed-in-frame-uniform-count",
    "data-viz-mobject-shade-in-3d-count",
    "data-viz-mobject-clipping-plane-count",
    "data-viz-mobject-transparent-count",
    "data-viz-mobject-uniform-summary",
    "data-viz-mobject-uniforms-changed-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject uniform evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
  }

  assert.match(runtimeSource, /normalizeMobjectUniforms/);
  assert.match(runtimeSource, /buildMathSceneRuntimeGraphFrame/);
  assert.match(runtimeGraphSource, /fixedInFrameUniformObjectIds/);
  assert.match(evidenceSource, /summarizeMobjectUniforms/);
  assert.match(canvasSource, /mobjectUniformSummary/);
  assert.match(uniformsSource, /MOBJECT_UNIFORM_SOURCE_CONTRACT/);
  assert.match(uniformsSource, /buildMobjectUniformPayload/);
  assert.match(uniformsSource, /serializeMobjectUniformPayload/);
  for (const selector of ["data-viz-mobject-uniform-plan", "data-viz-mobject-uniform-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject uniform JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ buildMobjectUniformPayload, MOBJECT_UNIFORM_SOURCE_CONTRACT, serializeMobjectUniformPayload \} from "\.\/manim\/mathMobjectUniforms"/
  );
  assert.match(canvasSource, /const manimMobjectUniformPayload = useMemo/);
  assert.match(canvasSource, /buildMobjectUniformPayload\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /const manimMobjectUniformJson = useMemo/);
  assert.match(canvasSource, /serializeMobjectUniformPayload\(manimMobjectUniformPayload\)/);

  for (const attribute of [
    "data-viz-mobject-material-object-count",
    "data-viz-mobject-material-transparent-count",
    "data-viz-mobject-material-depth-write-enabled-count",
    "data-viz-mobject-material-shade-in-3d-count",
    "data-viz-mobject-material-clipping-plane-count",
    "data-viz-mobject-material-opacity-range",
    "data-viz-mobject-material-object-ids",
    "data-viz-mobject-material-source-contract",
    "data-viz-mobject-material-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject material uniform evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(materialSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /buildMobjectMaterialUniformEvidence/);
  assert.match(evidenceSource, /mobjectMaterialUniformEvidenceDataAttributes/);
  assert.match(materialSource, /MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT/);
  assert.match(materialSource, /serializeMobjectMaterialUniformEvidence/);
  for (const selector of ["data-viz-mobject-material-plan", "data-viz-mobject-material-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject material uniform JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ buildMobjectMaterialUniformEvidence, MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT, serializeMobjectMaterialUniformEvidence \} from "\.\/manim\/mathMobjectMaterialUniforms"/
  );
  assert.match(canvasSource, /const manimMobjectMaterialUniformEvidence = useMemo/);
  assert.match(canvasSource, /buildMobjectMaterialUniformEvidence\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /const manimMobjectMaterialUniformJson = useMemo/);
  assert.match(canvasSource, /serializeMobjectMaterialUniformEvidence\(manimMobjectMaterialUniformEvidence\)/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-mobject-material-source-contract"\]\s*\?\?\s*MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-mobject-material-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(materialSource, /materialPropsForMobject/);
  assert.match(materialSource, /depthWrite/);
  assert.match(materialSource, /clippingPlaneCount/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject critical-point anchor evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const anchorSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectAnchors.ts", "utf8");

  for (const attribute of [
    "data-viz-mobject-anchor-object-count",
    "data-viz-mobject-anchor-name-count",
    "data-viz-mobject-anchor-point-count",
    "data-viz-mobject-anchor-finite-point-count",
    "data-viz-mobject-anchor-empty-bounding-box-count",
    "data-viz-mobject-anchor-names",
    "data-viz-mobject-anchor-object-ids",
    "data-viz-mobject-anchor-source-contract",
    "data-viz-mobject-anchor-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject critical-point anchor evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(anchorSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /buildMobjectAnchorEvidence/);
  assert.match(evidenceSource, /mobjectAnchorEvidenceDataAttributes/);
  assert.match(anchorSource, /MOBJECT_ANCHOR_SOURCE_CONTRACT/);
  assert.match(anchorSource, /serializeMobjectAnchorEvidence/);
  for (const selector of ["data-viz-mobject-anchor-plan", "data-viz-mobject-anchor-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject critical-point anchor JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ buildMobjectAnchorEvidence, MOBJECT_ANCHOR_SOURCE_CONTRACT, serializeMobjectAnchorEvidence \} from "\.\/manim\/mathMobjectAnchors"/
  );
  assert.match(canvasSource, /const manimMobjectAnchorEvidence = useMemo/);
  assert.match(canvasSource, /buildMobjectAnchorEvidence\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /const manimMobjectAnchorJson = useMemo/);
  assert.match(canvasSource, /serializeMobjectAnchorEvidence\(manimMobjectAnchorEvidence\)/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-mobject-anchor-source-contract"\]\s*\?\?\s*MOBJECT_ANCHOR_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-mobject-anchor-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(anchorSource, /mobjectCriticalPoint/);
  assert.match(anchorSource, /get_critical_point/);
});

test("ThreeDLabCanvas exposes Manim-style VMobject style evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const styleEvidenceModulePath = "components/visualizations/three/manim/mathVMobjectStyleEvidence.ts";

  for (const attribute of [
    "data-viz-vmobject-style-count",
    "data-viz-vmobject-transparent-stroke-count",
    "data-viz-vmobject-fill-count",
    "data-viz-vmobject-max-stroke-width",
    "data-viz-vmobject-min-stroke-opacity",
    "data-viz-vmobject-max-anti-alias-width",
    "data-viz-vmobject-max-joint-angle",
    "data-viz-vmobject-base-normal-object-ids",
    "data-viz-vmobject-stroke-zoom-screen-space-count",
    "data-viz-vmobject-stroke-zoom-world-space-count",
    "data-viz-vmobject-style-object-ids",
    "data-viz-vmobject-style-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style VMobject stroke/fill evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.ok(fs.existsSync(styleEvidenceModulePath), "MAIS Manim should provide a pure VMobject style evidence module");
  const styleEvidenceSource = fs.readFileSync(styleEvidenceModulePath, "utf8");

  for (const attribute of [
    "data-viz-vmobject-style-count",
    "data-viz-vmobject-transparent-stroke-count",
    "data-viz-vmobject-fill-count",
    "data-viz-vmobject-max-stroke-width",
    "data-viz-vmobject-min-stroke-opacity",
    "data-viz-vmobject-max-anti-alias-width",
    "data-viz-vmobject-max-joint-angle",
    "data-viz-vmobject-base-normal-object-ids",
    "data-viz-vmobject-stroke-zoom-screen-space-count",
    "data-viz-vmobject-stroke-zoom-world-space-count",
    "data-viz-vmobject-style-object-ids",
    "data-viz-vmobject-style-summary"
  ]) {
    assert.match(styleEvidenceSource, new RegExp(attribute));
  }

  assert.doesNotMatch(styleEvidenceSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(styleEvidenceSource, /summarizeVMobjectStyleEvidence/);
  assert.match(styleEvidenceSource, /vmobjectStyleEvidenceDataAttributes/);
  assert.match(styleEvidenceSource, /strokeZoomBehavior/);
  assert.match(styleEvidenceSource, /baseNormal/);
  assert.match(evidenceSource, /summarizeVMobjectStyleEvidence/);
  assert.match(evidenceSource, /vmobjectStyleEvidenceDataAttributes/);
  assert.match(canvasSource, /vmobjectStyleSummary/);
});

test("ThreeDLabCanvas exposes VMobject render line and fill props evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const renderStyleSource = fs.readFileSync("components/visualizations/three/manim/mathVMobjectRenderStyle.ts", "utf8");

  for (const attribute of [
    "data-viz-vmobject-render-line-object-count",
    "data-viz-vmobject-render-line-transparent-count",
    "data-viz-vmobject-render-line-opacity-range",
    "data-viz-vmobject-render-line-stroke-width-range",
    "data-viz-vmobject-render-line-color-roles",
    "data-viz-vmobject-render-line-object-ids",
    "data-viz-vmobject-render-line-source-contract",
    "data-viz-vmobject-render-line-summary",
    "data-viz-vmobject-render-fill-object-count",
    "data-viz-vmobject-render-fill-mesh-object-count",
    "data-viz-vmobject-render-fill-triangle-count",
    "data-viz-vmobject-render-fill-vertex-count",
    "data-viz-vmobject-render-fill-opacity-range",
    "data-viz-vmobject-render-fill-color-roles",
    "data-viz-vmobject-render-fill-mesh-object-ids",
    "data-viz-vmobject-render-fill-source-contract",
    "data-viz-vmobject-render-fill-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose VMobject stroke/fill style to R3F line prop evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(renderStyleSource, new RegExp(attribute));
  }

  assert.match(renderStyleSource, /vmobjectLineProps/);
  assert.match(renderStyleSource, /vmobjectSurfaceFillMeshProps/);
  assert.match(renderStyleSource, /materialPropsForMobject/);
  assert.match(renderStyleSource, /VMOBJECT_LINE_RENDER_SOURCE_CONTRACT/);
  assert.match(renderStyleSource, /VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /VMOBJECT_LINE_RENDER_SOURCE_CONTRACT, VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-vmobject-render-line-source-contract"\]\s*\?\?\s*VMOBJECT_LINE_RENDER_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-vmobject-render-fill-source-contract"\]\s*\?\?\s*VMOBJECT_SURFACE_FILL_RENDER_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-vmobject-render-line-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(evidenceSource, /buildVMobjectLineRenderEvidence/);
  assert.match(evidenceSource, /buildVMobjectSurfaceFillRenderEvidence/);
  assert.match(evidenceSource, /vmobjectLineRenderEvidenceDataAttributes/);
  assert.match(evidenceSource, /vmobjectSurfaceFillRenderEvidenceDataAttributes/);
});

test("ThreeDLabCanvas exposes RuntimeRenderState source evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const runtimeRenderStateSource = fs.readFileSync("components/visualizations/three/manim/mathRuntimeRenderState.ts", "utf8");

  for (const attribute of [
    "data-viz-runtime-render-state-object-count",
    "data-viz-runtime-render-state-kind-summary",
    "data-viz-runtime-render-state-point-count",
    "data-viz-runtime-render-state-finite-point-count",
    "data-viz-runtime-render-state-zero-point-object-count",
    "data-viz-runtime-render-state-styled-object-count",
    "data-viz-runtime-render-state-wireframe-curve-count",
    "data-viz-runtime-render-state-object-ids",
    "data-viz-runtime-render-state-source-contract",
    "data-viz-runtime-render-state-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose RuntimeRenderState point extraction evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(runtimeRenderStateSource, new RegExp(attribute));
  }

  assert.match(runtimeRenderStateSource, /buildRuntimeRenderStateEvidence/);
  assert.match(runtimeRenderStateSource, /runtimeRenderStateEvidenceDataAttributes/);
  assert.match(runtimeRenderStateSource, /pointsForRuntimeRenderState/);
  assert.match(runtimeRenderStateSource, /mapRuntimeRenderState/);
  assert.match(runtimeRenderStateSource, /RUNTIME_RENDER_STATE_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /import \{ RUNTIME_RENDER_STATE_SOURCE_CONTRACT \} from "\.\/manim\/mathRuntimeRenderState"/
  );
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-runtime-render-state-source-contract"\]\s*\?\?\s*RUNTIME_RENDER_STATE_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-runtime-render-state-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(evidenceSource, /buildRuntimeRenderStateEvidence/);
});

test("ThreeDLabCanvas exposes Manim timeline source evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const timelineSource = fs.readFileSync("components/visualizations/three/manim/mathTimeline.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-timeline-step-count",
    "data-viz-manim-timeline-total-duration",
    "data-viz-manim-timeline-elapsed-seconds",
    "data-viz-manim-timeline-active-step-type",
    "data-viz-manim-timeline-active-step-index",
    "data-viz-manim-timeline-active-concept-id",
    "data-viz-manim-timeline-focus-target-count",
    "data-viz-manim-timeline-focus-target-ids",
    "data-viz-manim-timeline-focus-target-policy",
    "data-viz-manim-timeline-focus-target-primary-id",
    "data-viz-manim-timeline-focus-target-summary",
    "data-viz-manim-timeline-progress",
    "data-viz-manim-timeline-completed-step-count",
    "data-viz-manim-timeline-pending-step-count",
    "data-viz-manim-timeline-wait-step-count",
    "data-viz-manim-timeline-camera-step-count",
    "data-viz-manim-timeline-reduced-motion",
    "data-viz-manim-timeline-skip-animations",
    "data-viz-manim-timeline-step-type-summary",
    "data-viz-manim-timeline-source-contract",
    "data-viz-manim-timeline-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose deterministic Manim Scene.play timeline evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(timelineSource, new RegExp(attribute));
  }

  assert.match(timelineSource, /buildTimelineEvidence/);
  assert.match(timelineSource, /timelineEvidenceDataAttributes/);
  assert.match(timelineSource, /serializeTimelineEvidence/);
  assert.match(timelineSource, /timelineFocusTargetIds/);
  assert.match(timelineSource, /TIMELINE_FOCUS_TARGET_POLICY/);
  assert.match(timelineSource, /buildTimelineState/);
  assert.match(timelineSource, /TIMELINE_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /buildTimelineEvidence/);
  assert.match(evidenceSource, /timelineFocusTargetIds/);
  assert.match(canvasSource, /TIMELINE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /TIMELINE_FOCUS_TARGET_POLICY/);
  assert.match(canvasSource, /timelineFocusTargetIds/);
  for (const selector of [
    "data-viz-manim-timeline-plan",
    "data-viz-manim-timeline-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose deterministic Manim Scene.play timeline JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ TIMELINE_FOCUS_TARGET_POLICY, TIMELINE_SOURCE_CONTRACT, serializeTimelineEvidence, timelineFocusTargetIds, type MathTimelineEvidence \} from "\.\/manim\/mathTimeline"/
  );
  assert.match(canvasSource, /useMemo<MathTimelineEvidence \| null>/);
  assert.match(canvasSource, /serializeTimelineEvidence\(manimTimelineEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTimelineJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-timeline-source-contract"\]\s*\?\?\s*TIMELINE_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-timeline-source-contract"\]\s*\?\?\s*"none"/
  );
});

test("ThreeDLabCanvas exposes Manim-style VMobject Bezier path evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const bezierModulePath = "components/visualizations/three/manim/mathVMobjectBezierPath.ts";

  assert.ok(fs.existsSync(bezierModulePath), "MAIS Manim should provide a pure VMobject Bezier path module");
  const bezierSource = fs.readFileSync(bezierModulePath, "utf8");

  for (const attribute of [
    "data-viz-vmobject-bezier-path-count",
    "data-viz-vmobject-bezier-segment-count",
    "data-viz-vmobject-bezier-cubic-segment-count",
    "data-viz-vmobject-bezier-anchor-count",
    "data-viz-vmobject-bezier-handle-count",
    "data-viz-vmobject-bezier-sample-count",
    "data-viz-vmobject-bezier-source-contract",
    "data-viz-vmobject-bezier-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style VMobject Bezier path evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(bezierSource, new RegExp(attribute));
  }

  assert.doesNotMatch(bezierSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bezierSource, /VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT/);
  assert.match(bezierSource, /buildVMobjectBezierPathFromSvgPath/);
  assert.match(bezierSource, /sampleVMobjectBezierPath/);
  assert.match(evidenceSource, /summarizeVMobjectBezierPaths/);
  assert.match(evidenceSource, /VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /vmobjectBezierPathDataAttributes/);
  assert.match(canvasSource, /VMOBJECT_BEZIER_PATH_SOURCE_CONTRACT/);
  assert.match(canvasSource, /vmobjectBezierSummary/);
});

test("ThreeDLabCanvas exposes Manim-style VMobject path-builder evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const pathBuilderModulePath = "components/visualizations/three/manim/mathVMobjectPathBuilder.ts";

  assert.ok(fs.existsSync(pathBuilderModulePath), "MAIS Manim should provide a pure VMobject path-builder module");
  const pathBuilderSource = fs.readFileSync(pathBuilderModulePath, "utf8");

  for (const attribute of [
    "data-viz-vmobject-path-builder-add-cubic-bezier-count",
    "data-viz-vmobject-path-builder-add-line-to-count",
    "data-viz-vmobject-path-builder-anchor-point-count",
    "data-viz-vmobject-path-builder-close-path-count",
    "data-viz-vmobject-path-builder-closed-path-count",
    "data-viz-vmobject-path-builder-command-count",
    "data-viz-vmobject-path-builder-cubic-segment-count",
    "data-viz-vmobject-path-builder-handle-point-count",
    "data-viz-vmobject-path-builder-line-segment-count",
    "data-viz-vmobject-path-builder-operation-summary",
    "data-viz-vmobject-path-builder-path-count",
    "data-viz-vmobject-path-builder-path-ids",
    "data-viz-vmobject-path-builder-set-points-as-corners-count",
    "data-viz-vmobject-path-builder-signature",
    "data-viz-vmobject-path-builder-source-contract",
    "data-viz-vmobject-path-builder-start-new-path-count",
    "data-viz-vmobject-path-builder-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim VMobject path-construction evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(pathBuilderSource, new RegExp(attribute));
  }

  assert.doesNotMatch(pathBuilderSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(pathBuilderSource, /VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT/);
  assert.match(pathBuilderSource, /start_new_path/);
  assert.match(pathBuilderSource, /add_line_to/);
  assert.match(pathBuilderSource, /add_cubic_bezier_curve_to/);
  assert.match(pathBuilderSource, /set_points_as_corners/);
  assert.match(pathBuilderSource, /close_path/);
  assert.match(evidenceSource, /buildVMobjectPathConstructionPlansFromObjectGraph/);
  assert.match(evidenceSource, /vmobjectPathConstructionDataAttributes/);
  assert.match(canvasSource, /VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-vmobject-path-builder-source-contract"\]\s*\?\?\s*VMOBJECT_PATH_BUILDER_SOURCE_CONTRACT/
  );
});

test("ThreeDLabCanvas exposes Manim-style VMobject smooth-path evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const smoothPathModulePath = "components/visualizations/three/manim/mathVMobjectSmoothPath.ts";

  assert.ok(fs.existsSync(smoothPathModulePath), "MAIS Manim should provide a pure VMobject smooth-path module");
  const smoothPathSource = fs.readFileSync(smoothPathModulePath, "utf8");

  for (const attribute of [
    "data-viz-vmobject-smooth-path-anchor-point-count",
    "data-viz-vmobject-smooth-path-change-anchor-mode-count",
    "data-viz-vmobject-smooth-path-command-count",
    "data-viz-vmobject-smooth-path-continuity-pass-count",
    "data-viz-vmobject-smooth-path-cubic-segment-count",
    "data-viz-vmobject-smooth-path-handle-point-count",
    "data-viz-vmobject-smooth-path-ids",
    "data-viz-vmobject-smooth-path-insert-n-curves-count",
    "data-viz-vmobject-smooth-path-make-smooth-count",
    "data-viz-vmobject-smooth-path-max-handle-length",
    "data-viz-vmobject-smooth-path-operation-summary",
    "data-viz-vmobject-smooth-path-count",
    "data-viz-vmobject-smooth-path-set-points-smoothly-count",
    "data-viz-vmobject-smooth-path-signature",
    "data-viz-vmobject-smooth-path-smoothing-mode-summary",
    "data-viz-vmobject-smooth-path-source-contract",
    "data-viz-vmobject-smooth-path-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim VMobject smooth-path evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(smoothPathSource, new RegExp(attribute));
  }

  assert.doesNotMatch(smoothPathSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(smoothPathSource, /VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT/);
  assert.match(smoothPathSource, /set_points_smoothly/);
  assert.match(smoothPathSource, /make_smooth/);
  assert.match(smoothPathSource, /change_anchor_mode/);
  assert.match(evidenceSource, /buildVMobjectSmoothPathPlansFromObjectGraph/);
  assert.match(evidenceSource, /vmobjectSmoothPathDataAttributes/);
  assert.match(canvasSource, /VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-vmobject-smooth-path-source-contract"\]\s*\?\?\s*VMOBJECT_SMOOTH_PATH_SOURCE_CONTRACT/
  );
});

test("ThreeDLabCanvas exposes Manim-style ODE trajectory evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const odeModulePath = "components/visualizations/three/manim/mathOdeTrajectory.ts";

  assert.ok(fs.existsSync(odeModulePath), "MAIS Manim should provide a pure ODE trajectory module");
  const odeSource = fs.readFileSync(odeModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-ode-trajectory-count",
    "data-viz-manim-ode-sample-count",
    "data-viz-manim-ode-finite-sample-count",
    "data-viz-manim-ode-stopped-count",
    "data-viz-manim-ode-tail-sample-count",
    "data-viz-manim-ode-source-contract",
    "data-viz-manim-ode-solver-contract",
    "data-viz-manim-ode-method-ids",
    "data-viz-manim-ode-initial-state-summary",
    "data-viz-manim-ode-step-count-summary",
    "data-viz-manim-ode-bounds-summary",
    "data-viz-manim-ode-system-summary",
    "data-viz-manim-ode-step-size-summary",
    "data-viz-manim-ode-time-range-summary",
    "data-viz-manim-ode-stopped-reason-summary",
    "data-viz-manim-ode-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style ODE solution trajectory evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(odeSource, new RegExp(attribute));
  }

  assert.doesNotMatch(odeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(odeSource, /buildOdeTrajectory/);
  assert.match(odeSource, /ODE_TRAJECTORY_SOURCE_CONTRACT/);
  assert.match(odeSource, /ode_solution_points/);
  assert.match(odeSource, /resolveOdeSystem/);
  assert.match(odeSource, /buildSceneOdeTrajectories/);
  assert.match(odeSource, /buildOdeTrajectoryEvidenceForScene/);
  assert.match(odeSource, /serializeOdeTrajectoryPayload/);
  assert.match(evidenceSource, /buildOdeTrajectoryEvidenceForScene/);
  assert.match(evidenceSource, /ODE_TRAJECTORY_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /odeTrajectoryDataAttributes/);
  assert.match(canvasSource, /ODE_TRAJECTORY_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildSceneOdeTrajectories\(manimScene\)/);
  assert.match(canvasSource, /summarizeOdeTrajectories\(manimOdeTrajectories\)/);
  assert.match(canvasSource, /serializeOdeTrajectoryPayload\(manimOdeTrajectories\)/);
  assert.match(canvasSource, /const manimOdeTrajectoryJson = useMemo/);
  assert.match(canvasSource, /odeTrajectorySummary/);

  for (const selector of ["data-viz-manim-ode-trajectory-plan", "data-viz-manim-ode-trajectory-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim ODE trajectory payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim ODE trajectory runtime object bridge evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const bridgeModulePath = "components/visualizations/three/manim/mathOdeTrajectoryObjects.ts";

  assert.ok(fs.existsSync(bridgeModulePath), "MAIS Manim should provide a pure ODE trajectory object bridge");
  const bridgeSource = fs.readFileSync(bridgeModulePath, "utf8");

  for (const attribute of ["data-viz-manim-ode-object-source-contract"]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style ODE runtime object bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(bridgeSource, new RegExp(attribute));
  }

  assert.doesNotMatch(bridgeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bridgeSource, /ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(bridgeSource, /ode_solution_points/);
  assert.match(bridgeSource, /odeTrajectoryRuntimeObjectIds/);
  assert.match(bridgeSource, /buildOdeTrajectoryObjectSpecs/);
  assert.match(bridgeSource, /buildOdeTrajectoryObjectBridgeEvidence/);
  assert.match(bridgeSource, /serializeOdeTrajectoryObjectBridgePayload/);
  assert.match(bridgeSource, /expandSceneOdeTrajectoryObjects/);
  assert.match(evidenceSource, /ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /ODE_TRAJECTORY_OBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildOdeTrajectoryObjectSpecs\(manimScene\)/);
  assert.match(canvasSource, /buildOdeTrajectoryObjectBridgeEvidence\(manimOdeTrajectoryObjects\)/);
  assert.match(canvasSource, /serializeOdeTrajectoryObjectBridgePayload\(manimOdeTrajectoryObjects\)/);
  assert.match(canvasSource, /const manimOdeTrajectoryObjectJson = useMemo/);

  for (const selector of ["data-viz-manim-ode-trajectory-object-plan", "data-viz-manim-ode-trajectory-object-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim ODE trajectory object bridge payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim-style VectorField evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const vectorFieldModulePath = "components/visualizations/three/manim/mathVectorFieldObjects.ts";

  assert.ok(fs.existsSync(vectorFieldModulePath), "MAIS Manim should provide a pure VectorField scene bridge");
  const vectorFieldSource = fs.readFileSync(vectorFieldModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-vector-field-count",
    "data-viz-manim-vector-field-sample-count",
    "data-viz-manim-vector-field-sample-grid-summary",
    "data-viz-manim-vector-field-finite-vector-count",
    "data-viz-manim-vector-field-zero-vector-count",
    "data-viz-manim-vector-field-high-band-count",
    "data-viz-manim-vector-field-mid-band-count",
    "data-viz-manim-vector-field-low-band-count",
    "data-viz-manim-vector-field-zero-band-count",
    "data-viz-manim-vector-field-arrow-count",
    "data-viz-manim-vector-field-finite-arrow-length-count",
    "data-viz-manim-vector-field-arrow-length-range",
    "data-viz-manim-vector-field-length-encoding-monotonic",
    "data-viz-manim-vector-field-length-encoding-summary",
    "data-viz-manim-vector-field-max-magnitude",
    "data-viz-manim-vector-field-color-band-summary",
    "data-viz-manim-vector-field-coordinate-mode-summary",
    "data-viz-manim-vector-field-source-contract",
    "data-viz-manim-vector-field-system-summary",
    "data-viz-manim-vector-field-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style VectorField evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(vectorFieldSource, new RegExp(attribute));
  }

  assert.doesNotMatch(vectorFieldSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(vectorFieldSource, /VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(vectorFieldSource, /sampleVectorField2D/);
  assert.match(vectorFieldSource, /buildSceneVectorFields/);
  assert.match(vectorFieldSource, /buildVectorFieldEvidenceForScene/);
  assert.match(vectorFieldSource, /serializeVectorFieldPayload/);
  assert.match(vectorFieldSource, /colorBand/);
  assert.match(evidenceSource, /buildVectorFieldEvidenceForScene/);
  assert.match(evidenceSource, /VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /vectorFieldDataAttributes/);
  assert.match(canvasSource, /VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildSceneVectorFields\(manimScene\)/);
  assert.match(canvasSource, /summarizeSceneVectorFields\(manimVectorFields\)/);
  assert.match(canvasSource, /serializeVectorFieldPayload\(manimVectorFields\)/);
  assert.match(canvasSource, /const manimVectorFieldJson = useMemo/);
  assert.match(canvasSource, /vectorFieldSampleGridSummary/);
  assert.match(canvasSource, /vectorFieldHighBandCount/);
  assert.match(canvasSource, /vectorFieldSummary/);

  for (const selector of ["data-viz-manim-vector-field-plan", "data-viz-manim-vector-field-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim VectorField payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim move_along_vector_field updater evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");
  const moveAlongVectorFieldModulePath = "components/visualizations/three/manim/mathMoveAlongVectorField.ts";

  assert.ok(fs.existsSync(moveAlongVectorFieldModulePath), "MAIS Manim should provide a pure move_along_vector_field module");
  const moveAlongVectorFieldSource = fs.readFileSync(moveAlongVectorFieldModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-move-along-vector-field-blocked-count",
    "data-viz-manim-move-along-vector-field-coordinate-modes",
    "data-viz-manim-move-along-vector-field-count",
    "data-viz-manim-move-along-vector-field-delta-summary",
    "data-viz-manim-move-along-vector-field-displacement-magnitude-range",
    "data-viz-manim-move-along-vector-field-finite-displacement-count",
    "data-viz-manim-move-along-vector-field-finite-vector-count",
    "data-viz-manim-move-along-vector-field-ids",
    "data-viz-manim-move-along-vector-field-moved-count",
    "data-viz-manim-move-along-vector-field-object-ids",
    "data-viz-manim-move-along-vector-field-speed-summary",
    "data-viz-manim-move-along-vector-field-source-contract",
    "data-viz-manim-move-along-vector-field-status-summary",
    "data-viz-manim-move-along-vector-field-summary",
    "data-viz-manim-move-along-vector-field-vector-magnitude-range"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim move_along_vector_field evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(moveAlongVectorFieldSource, new RegExp(attribute));
  }

  assert.doesNotMatch(moveAlongVectorFieldSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(moveAlongVectorFieldSource, /evaluateMoveAlongVectorFieldUpdater/);
  assert.match(moveAlongVectorFieldSource, /MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(moveAlongVectorFieldSource, /buildMoveAlongVectorFieldPayload/);
  assert.match(moveAlongVectorFieldSource, /serializeMoveAlongVectorFieldPayload/);
  assert.match(moveAlongVectorFieldSource, /moveAlongVectorFieldEvidenceDataAttributes/);
  assert.match(updaterSource, /evaluateMoveAlongVectorFieldUpdater/);
  assert.match(evidenceSource, /buildMoveAlongVectorFieldEvidence/);
  assert.match(evidenceSource, /MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /moveAlongVectorFieldEvidenceDataAttributes/);
  assert.match(evidenceSource, /\.\.\.moveAlongVectorFieldAttributes/);
  assert.match(
    canvasSource,
    /import \{ buildMoveAlongVectorFieldPayloadForRuntimeState, MOVE_ALONG_VECTOR_FIELD_SOURCE_CONTRACT, serializeMoveAlongVectorFieldPayload \} from "\.\/manim\/mathMoveAlongVectorField"/
  );
  assert.match(canvasSource, /const manimMoveAlongVectorFieldPayload = useMemo/);
  assert.match(canvasSource, /buildMoveAlongVectorFieldPayloadForRuntimeState\(/);
  assert.match(canvasSource, /const manimMoveAlongVectorFieldJson = useMemo/);
  assert.match(canvasSource, /serializeMoveAlongVectorFieldPayload\(manimMoveAlongVectorFieldPayload\)/);
  assert.match(canvasSource, /data-viz-manim-move-along-vector-field-plan/);
  assert.match(canvasSource, /data-viz-manim-move-along-vector-field-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMoveAlongVectorFieldJson \}\}/);

  for (const selector of [
    "data-viz-manim-move-along-vector-field-plan",
    "data-viz-manim-move-along-vector-field-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim move_along_vector_field payload evidence`
    );
  }
});

test("ThreeDLabCanvas exposes Manim-style StreamLine evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const streamLineModulePath = "components/visualizations/three/manim/mathStreamLineObjects.ts";

  assert.ok(fs.existsSync(streamLineModulePath), "MAIS Manim should provide a pure StreamLine scene bridge");
  const streamLineSource = fs.readFileSync(streamLineModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-stream-line-set-count",
    "data-viz-manim-stream-line-count",
    "data-viz-manim-stream-line-completed-line-count",
    "data-viz-manim-stream-line-stopped-line-count",
    "data-viz-manim-stream-line-point-count",
    "data-viz-manim-stream-line-animated-window-count",
    "data-viz-manim-stream-line-wrapped-window-count",
    "data-viz-manim-stream-line-frame-plan-segment-count",
    "data-viz-manim-stream-line-frame-plan-source-contract",
    "data-viz-manim-stream-line-frame-plan-visible-line-count",
    "data-viz-manim-stream-line-frame-finite-visible-length-count",
    "data-viz-manim-stream-line-frame-visible-length-range",
    "data-viz-manim-stream-line-frame-visible-length-summary",
    "data-viz-manim-stream-line-frame-window-range-summary",
    "data-viz-manim-stream-line-frame-phase-order",
    "data-viz-manim-stream-line-coordinate-mode-summary",
    "data-viz-manim-stream-line-phase-offset-range",
    "data-viz-manim-stream-line-cycle-seconds-summary",
    "data-viz-manim-stream-line-integration-step-summary",
    "data-viz-manim-stream-line-reveal-window-summary",
    "data-viz-manim-stream-line-seed-grid-summary",
    "data-viz-manim-stream-line-source-contract",
    "data-viz-manim-stream-line-system-summary",
    "data-viz-manim-stream-line-visible-progress-summary",
    "data-viz-manim-stream-line-visible-point-count",
    "data-viz-manim-stream-line-object-count",
    "data-viz-manim-stream-line-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style StreamLine evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(streamLineSource, new RegExp(attribute));
  }

  assert.doesNotMatch(streamLineSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(streamLineSource, /sampleStreamLineSeeds2D/);
  assert.match(streamLineSource, /STREAM_LINE_SOURCE_CONTRACT/);
  assert.match(streamLineSource, /buildStreamLines/);
  assert.match(streamLineSource, /buildAnimatedStreamLineFrame/);
  assert.match(streamLineSource, /buildStreamLineEvidenceForScene/);
  assert.match(streamLineSource, /buildAnimatedStreamLinePayloadFrames/);
  assert.match(streamLineSource, /serializeStreamLinePayload/);
  assert.match(evidenceSource, /buildStreamLineEvidenceForScene/);
  assert.match(evidenceSource, /STREAM_LINE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /STREAM_LINE_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /streamLineDataAttributes/);
  assert.match(canvasSource, /buildSceneStreamLines\(manimScene\)/);
  assert.match(canvasSource, /summarizeSceneStreamLines\(manimStreamLineSets, \{ elapsedSeconds: manimElapsedSeconds \}\)/);
  assert.match(canvasSource, /serializeStreamLinePayload\(manimStreamLineSets, \{ elapsedSeconds: manimElapsedSeconds \}\)/);
  assert.match(canvasSource, /const manimStreamLineJson = useMemo/);
  assert.match(canvasSource, /streamLineSeedGridSummary/);
  assert.match(canvasSource, /streamLineSummary/);

  for (const selector of ["data-viz-manim-stream-line-plan", "data-viz-manim-stream-line-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim StreamLine payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim-style creation primitive evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const creationPrimitiveModulePath = "components/visualizations/three/manim/mathCreationPrimitives.ts";
  const showCreationModulePath = "components/visualizations/three/manim/mathShowCreationEvidence.ts";
  const drawBorderFillModulePath = "components/visualizations/three/manim/mathDrawBorderThenFillEvidence.ts";
  const fadeGrowModulePath = "components/visualizations/three/manim/mathFadeGrowEvidence.ts";

  assert.ok(fs.existsSync(creationPrimitiveModulePath), "MAIS Manim should provide a pure creation primitive module");
  const creationSource = fs.readFileSync(creationPrimitiveModulePath, "utf8");
  assert.ok(fs.existsSync(showCreationModulePath), "MAIS Manim should expose a pure ShowCreation partial-stroke evidence module");
  const showCreationSource = fs.readFileSync(showCreationModulePath, "utf8");
  assert.ok(fs.existsSync(drawBorderFillModulePath), "MAIS Manim should expose a pure DrawBorderThenFill phase-evidence module");
  const drawBorderFillSource = fs.readFileSync(drawBorderFillModulePath, "utf8");
  assert.ok(fs.existsSync(fadeGrowModulePath), "MAIS Manim should expose a pure Fade/Grow phase-evidence module");
  const fadeGrowSource = fs.readFileSync(fadeGrowModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-creation-primitive-count",
    "data-viz-manim-creation-show-count",
    "data-viz-manim-creation-draw-border-count",
    "data-viz-manim-creation-fade-count",
    "data-viz-manim-creation-grow-count",
    "data-viz-manim-creation-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style creation primitive evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(creationSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /import \{ buildSceneCreationPrimitivePlan, creationPrimitivePlanDataAttributes, summarizeSceneCreationPrimitivePlan \} from "\.\/manim\/mathCreationPrimitives"/);
  assert.match(canvasSource, /const manimCreationPrimitivePlan = useMemo/);
  assert.match(canvasSource, /buildSceneCreationPrimitivePlan\(manimScene\)/);
  assert.match(canvasSource, /creationPrimitivePlanDataAttributes\(summarizeSceneCreationPrimitivePlan\(manimCreationPrimitivePlan\)\)/);
  assert.match(creationSource, /buildCreationPrimitiveFrame/);
  assert.match(creationSource, /buildDrawBorderThenFillFrame/);

  for (const attribute of [
    "data-viz-manim-show-creation-draw-ranges",
    "data-viz-manim-show-creation-frame-count",
    "data-viz-manim-show-creation-object-ids",
    "data-viz-manim-show-creation-opacity-schedule",
    "data-viz-manim-show-creation-partial-policy",
    "data-viz-manim-show-creation-phase-sequence",
    "data-viz-manim-show-creation-primitive-count",
    "data-viz-manim-show-creation-progress-range",
    "data-viz-manim-show-creation-source-contract",
    "data-viz-manim-show-creation-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim ShowCreation partial-stroke evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(showCreationSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ buildShowCreationEvidence, SHOW_CREATION_PARTIAL_POLICY, SHOW_CREATION_SOURCE_CONTRACT, serializeShowCreationEvidence, showCreationEvidenceDataAttributes \} from "\.\/manim\/mathShowCreationEvidence"/
  );
  assert.match(canvasSource, /buildShowCreationEvidence\(manimCreationPrimitivePlan\)/);
  assert.match(canvasSource, /serializeShowCreationEvidence\(manimShowCreationEvidence\)/);
  assert.match(canvasSource, /showCreationEvidenceDataAttributes\(manimShowCreationEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimShowCreationJson \}\}/);
  assert.match(canvasSource, /data-viz-manim-show-creation-partial-policy=/);
  assert.match(canvasSource, /data-viz-manim-show-creation-source-contract=/);
  assert.match(showCreationSource, /SHOW_CREATION_PARTIAL_POLICY/);
  assert.match(showCreationSource, /SHOW_CREATION_SOURCE_CONTRACT/);
  assert.match(showCreationSource, /serializeShowCreationEvidence/);
  assert.match(showCreationSource, /pointwise_become_partial/);
  for (const selector of [
    "data-viz-manim-show-creation-plan",
    "data-viz-manim-show-creation-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose ShowCreation JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /manimShowCreationAttributes\?\.\["data-viz-manim-show-creation-partial-policy"\]\s*\?\?\s*SHOW_CREATION_PARTIAL_POLICY/
  );
  assert.match(
    canvasSource,
    /manimShowCreationAttributes\?\.\["data-viz-manim-show-creation-source-contract"\]\s*\?\?\s*SHOW_CREATION_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(canvasSource, /"partial-stroke-reveal-from-zero-to-alpha"/);
  assert.doesNotMatch(
    canvasSource,
    /"ShowCreation uses pointwise_become_partial\(vmobject, 0, alpha\) to reveal a VMobject stroke"/
  );

  for (const attribute of [
    "data-viz-manim-draw-border-fill-border-frame-count",
    "data-viz-manim-draw-border-fill-draw-ranges",
    "data-viz-manim-draw-border-fill-fill-frame-count",
    "data-viz-manim-draw-border-fill-fill-opacity-schedule",
    "data-viz-manim-draw-border-fill-frame-count",
    "data-viz-manim-draw-border-fill-object-ids",
    "data-viz-manim-draw-border-fill-phase-policy",
    "data-viz-manim-draw-border-fill-phase-sequence",
    "data-viz-manim-draw-border-fill-primitive-count",
    "data-viz-manim-draw-border-fill-source-contract",
    "data-viz-manim-draw-border-fill-stroke-opacity-schedule",
    "data-viz-manim-draw-border-fill-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim DrawBorderThenFill phase evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(drawBorderFillSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /buildDrawBorderThenFillEvidence\(manimCreationPrimitivePlan\)/);
  assert.match(canvasSource, /serializeDrawBorderThenFillEvidence\(manimDrawBorderThenFillEvidence\)/);
  assert.match(canvasSource, /drawBorderThenFillEvidenceDataAttributes\(manimDrawBorderThenFillEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimDrawBorderThenFillJson \}\}/);
  assert.match(canvasSource, /data-viz-manim-draw-border-fill-phase-policy=/);
  assert.match(canvasSource, /data-viz-manim-draw-border-fill-source-contract=/);
  assert.match(drawBorderFillSource, /buildCreationPrimitiveFrame/);
  assert.match(drawBorderFillSource, /DRAW_BORDER_THEN_FILL_PHASE_POLICY/);
  assert.match(drawBorderFillSource, /DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT/);
  assert.match(drawBorderFillSource, /DrawBorderThenFill/);
  assert.match(drawBorderFillSource, /serializeDrawBorderThenFillEvidence/);
  assert.match(
    canvasSource,
    /import \{ buildDrawBorderThenFillEvidence, DRAW_BORDER_THEN_FILL_PHASE_POLICY, DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT, drawBorderThenFillEvidenceDataAttributes, serializeDrawBorderThenFillEvidence \} from "\.\/manim\/mathDrawBorderThenFillEvidence"/
  );
  for (const selector of [
    "data-viz-manim-draw-border-fill-plan",
    "data-viz-manim-draw-border-fill-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose DrawBorderThenFill JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /manimDrawBorderThenFillAttributes\?\.\["data-viz-manim-draw-border-fill-phase-policy"\]\s*\?\?\s*DRAW_BORDER_THEN_FILL_PHASE_POLICY/
  );
  assert.match(
    canvasSource,
    /manimDrawBorderThenFillAttributes\?\.\["data-viz-manim-draw-border-fill-source-contract"\]\s*\?\?\s*DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(canvasSource, /"border-then-fill"/);
  assert.doesNotMatch(
    canvasSource,
    /"DrawBorderThenFill traces outline first, then interpolates fill\/style"/
  );

  for (const attribute of [
    "data-viz-manim-fade-grow-fade-frame-count",
    "data-viz-manim-fade-grow-frame-count",
    "data-viz-manim-fade-grow-grow-frame-count",
    "data-viz-manim-fade-grow-kind-sequence",
    "data-viz-manim-fade-grow-object-ids",
    "data-viz-manim-fade-grow-opacity-schedule",
    "data-viz-manim-fade-grow-phase-policy",
    "data-viz-manim-fade-grow-phase-sequence",
    "data-viz-manim-fade-grow-primitive-count",
    "data-viz-manim-fade-grow-scale-schedule",
    "data-viz-manim-fade-grow-source-contract",
    "data-viz-manim-fade-grow-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Fade/Grow phase evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(fadeGrowSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ buildFadeGrowEvidence, FADE_GROW_PHASE_POLICY, FADE_GROW_SOURCE_CONTRACT, fadeGrowEvidenceDataAttributes, serializeFadeGrowEvidence \} from "\.\/manim\/mathFadeGrowEvidence"/
  );
  assert.match(canvasSource, /buildFadeGrowEvidence\(manimCreationPrimitivePlan\)/);
  assert.match(canvasSource, /serializeFadeGrowEvidence\(manimFadeGrowEvidence\)/);
  assert.match(canvasSource, /fadeGrowEvidenceDataAttributes\(manimFadeGrowEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFadeGrowJson \}\}/);
  assert.match(canvasSource, /data-viz-manim-fade-grow-phase-policy=/);
  assert.match(canvasSource, /data-viz-manim-fade-grow-source-contract=/);
  assert.match(fadeGrowSource, /FADE_GROW_PHASE_POLICY/);
  assert.match(fadeGrowSource, /FADE_GROW_SOURCE_CONTRACT/);
  assert.match(fadeGrowSource, /FadeIn/);
  assert.match(fadeGrowSource, /FadeOut/);
  assert.match(fadeGrowSource, /GrowFromCenter/);
  assert.match(fadeGrowSource, /serializeFadeGrowEvidence/);
  for (const selector of [
    "data-viz-manim-fade-grow-plan",
    "data-viz-manim-fade-grow-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Fade/Grow JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /manimFadeGrowAttributes\?\.\["data-viz-manim-fade-grow-phase-policy"\]\s*\?\?\s*FADE_GROW_PHASE_POLICY/
  );
  assert.match(
    canvasSource,
    /manimFadeGrowAttributes\?\.\["data-viz-manim-fade-grow-source-contract"\]\s*\?\?\s*FADE_GROW_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(canvasSource, /"fade-opacity-grow-center-scale"/);
  assert.doesNotMatch(
    canvasSource,
    /"FadeIn\/FadeOut animate opacity while GrowFromCenter scales from center"/
  );
});

test("ThreeDLabCanvas exposes Manim-style indication primitive evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const indicationPrimitiveModulePath = "components/visualizations/three/manim/mathIndicationPrimitives.ts";

  assert.ok(fs.existsSync(indicationPrimitiveModulePath), "MAIS Manim should provide a pure indication primitive module");
  const indicationSource = fs.readFileSync(indicationPrimitiveModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-indication-count",
    "data-viz-manim-indication-highlight-beat-count",
    "data-viz-manim-indication-target-object-count",
    "data-viz-manim-indication-missing-target-count",
    "data-viz-manim-indication-pulse-count",
    "data-viz-manim-indication-circumscribe-count",
    "data-viz-manim-indication-flash-count",
    "data-viz-manim-indication-concept-ids",
    "data-viz-manim-indication-source-contract",
    "data-viz-manim-indication-state-policy",
    "data-viz-manim-indication-target-object-ids",
    "data-viz-manim-indication-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style indication primitive evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(indicationSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ buildSceneIndicationPrimitivePlan, INDICATION_PRIMITIVE_SOURCE_CONTRACT, INDICATION_PRIMITIVE_STATE_POLICY, indicationPrimitivePlanDataAttributes, serializeSceneIndicationPrimitivePlan, summarizeSceneIndicationPrimitivePlan \} from "\.\/manim\/mathIndicationPrimitives"/
  );
  assert.match(canvasSource, /const manimIndicationPrimitivePlan = useMemo/);
  assert.match(canvasSource, /buildSceneIndicationPrimitivePlan\(manimScene\)/);
  assert.match(canvasSource, /serializeSceneIndicationPrimitivePlan\(manimIndicationPrimitivePlan\)/);
  assert.match(canvasSource, /indicationPrimitivePlanDataAttributes\(summarizeSceneIndicationPrimitivePlan\(manimIndicationPrimitivePlan\)\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimIndicationPrimitiveJson \}\}/);
  assert.match(evidenceSource, /buildSceneIndicationPrimitivePlan/);
  assert.match(evidenceSource, /indicationPrimitivePlanDataAttributes/);
  assert.match(evidenceSource, /\.\.\.indicationPrimitiveAttributes/);
  assert.match(indicationSource, /buildFlashFrame/);
  assert.match(indicationSource, /buildCircumscribeFrame/);
  assert.match(indicationSource, /buildHighlightPulseFrame/);
  assert.match(indicationSource, /INDICATION_PRIMITIVE_SOURCE_CONTRACT/);
  assert.match(indicationSource, /INDICATION_PRIMITIVE_STATE_POLICY/);
  assert.match(indicationSource, /serializeSceneIndicationPrimitivePlan/);
  assert.match(canvasSource, /data-viz-manim-indication-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-indication-state-policy=/);
  for (const selector of [
    "data-viz-manim-indication-plan",
    "data-viz-manim-indication-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim-style indication primitive JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /manimIndicationPrimitiveAttributes\?\.\["data-viz-manim-indication-source-contract"\]\s*\?\?\s*INDICATION_PRIMITIVE_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /manimIndicationPrimitiveAttributes\?\.\["data-viz-manim-indication-state-policy"\]\s*\?\?\s*INDICATION_PRIMITIVE_STATE_POLICY/
  );
  assert.doesNotMatch(
    canvasSource,
    /"Indication animations add transient attention geometry without changing target math objects"/
  );
  assert.doesNotMatch(canvasSource, /"attention-overlays-preserve-target-state"/);
  assert.doesNotMatch(indicationSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});

test("ThreeDLabCanvas exposes active runtime indication overlay evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const runtimeOverlaySource = fs.readFileSync("components/visualizations/three/manim/mathRuntimeIndicationOverlay.ts", "utf8");

  assert.match(
    canvasSource,
    /import \{ buildRuntimeIndicationOverlayFrames, runtimeIndicationOverlayActiveConceptId, runtimeIndicationOverlayDataAttributes, serializeRuntimeIndicationOverlayPayload, summarizeRuntimeIndicationOverlayFrames \} from "\.\/manim\/mathRuntimeIndicationOverlay"/
  );
  assert.match(canvasSource, /const manimRuntimeIndicationOverlayFrames = useMemo/);
  assert.match(canvasSource, /buildRuntimeIndicationOverlayFrames\(manimRuntimeState, \{ focusTargetIds: manimTimelineFocusTargetIds \}\)/);
  assert.match(canvasSource, /runtimeIndicationOverlayActiveConceptId\(manimRuntimeState\)/);
  assert.match(canvasSource, /summarizeRuntimeIndicationOverlayFrames/);
  assert.match(canvasSource, /const manimRuntimeIndicationOverlayAttributes = useMemo/);
  assert.match(canvasSource, /runtimeIndicationOverlayDataAttributes\(manimRuntimeIndicationOverlaySummary\)/);
  assert.match(canvasSource, /serializeRuntimeIndicationOverlayPayload\(manimRuntimeIndicationOverlayFrames, manimRuntimeIndicationOverlaySummary\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRuntimeIndicationOverlayJson \}\}/);
  for (const attribute of [
    "data-viz-manim-indication-runtime-overlay-active-concept-id",
    "data-viz-manim-indication-runtime-overlay-count",
    "data-viz-manim-indication-runtime-overlay-focus-target-count",
    "data-viz-manim-indication-runtime-overlay-focus-target-ids",
    "data-viz-manim-indication-runtime-overlay-focus-target-policy",
    "data-viz-manim-indication-runtime-overlay-focus-target-primary-id",
    "data-viz-manim-indication-runtime-overlay-focus-target-summary",
    "data-viz-manim-indication-runtime-overlay-line-count",
    "data-viz-manim-indication-runtime-overlay-object-count",
    "data-viz-manim-indication-runtime-overlay-object-ids",
    "data-viz-manim-indication-runtime-overlay-point-count",
    "data-viz-manim-indication-runtime-overlay-source-contract",
    "data-viz-manim-indication-runtime-overlay-state-policy",
    "data-viz-manim-indication-runtime-overlay-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose active Manim indication overlay runtime evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }
  assert.match(runtimeOverlaySource, /RUNTIME_INDICATION_OVERLAY_SOURCE_CONTRACT/);
  assert.match(runtimeOverlaySource, /RUNTIME_INDICATION_OVERLAY_FOCUS_TARGET_POLICY/);
  assert.match(runtimeOverlaySource, /RUNTIME_INDICATION_OVERLAY_STATE_POLICY/);
  assert.match(runtimeOverlaySource, /runtimeIndicationOverlayDataAttributes/);
  assert.match(runtimeOverlaySource, /serializeRuntimeIndicationOverlayPayload/);
  for (const selector of [
    "data-viz-manim-indication-runtime-overlay-plan",
    "data-viz-manim-indication-runtime-overlay-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose active Manim indication overlay runtime JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /manimRuntimeIndicationOverlayAttributes\["data-viz-manim-indication-runtime-overlay-count"\]/);
  assert.doesNotMatch(canvasSource, /manimRuntimeIndicationOverlaySummary\.frameCount/);
  assert.doesNotMatch(
    canvasSource,
    /"FormulaBinding active highlight beats render transient attention overlays for matched runtime math objects"/
  );
  assert.doesNotMatch(canvasSource, /"attention-overlays-preserve-target-state"/);
  assert.doesNotMatch(runtimeOverlaySource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});

test("ThreeDLabCanvas exposes Manim-style axis tick and label evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const axisTickModulePath = "components/visualizations/three/manim/mathAxisTicks.ts";

  assert.ok(fs.existsSync(axisTickModulePath), "MAIS Manim should provide a pure axis tick planning module");
  const axisTickSource = fs.readFileSync(axisTickModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-axis-object-count",
    "data-viz-manim-axis-tick-count",
    "data-viz-manim-axis-label-count",
    "data-viz-manim-axis-label-anchor-count",
    "data-viz-manim-axis-label-anchor-finite-count",
    "data-viz-manim-axis-label-anchor-summary",
    "data-viz-manim-axis-finite-tick-count",
    "data-viz-manim-axis-major-tick-count",
    "data-viz-manim-axis-spacing-max-delta",
    "data-viz-manim-axis-spacing-summary",
    "data-viz-manim-axis-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Axes/NumberLine tick evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(axisTickSource, new RegExp(attribute));
  }

  for (const selector of ["data-viz-manim-axis-tick-plan", "data-viz-manim-axis-tick-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim-style Axes/NumberLine tick payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ axisTickPlanDataAttributes, buildAxisTickPlan, serializeAxisTickPlan \} from "\.\/manim\/mathAxisTicks"/
  );
  assert.match(canvasSource, /const manimAxisTickPlan = useMemo/);
  assert.match(canvasSource, /buildAxisTickPlan\(manimScene\)/);
  assert.match(canvasSource, /axisTickPlanDataAttributes\(manimAxisTickPlan\)/);
  assert.match(canvasSource, /const manimAxisTickJson = useMemo/);
  assert.match(canvasSource, /serializeAxisTickPlan\(manimAxisTickPlan\)/);
  assert.match(axisTickSource, /serializeAxisTickPlan/);
});

test("ThreeDLabCanvas exposes Manim CoordinateSystem c2p/p2c evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const coordinateSource = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSystem3D.ts", "utf8");
  const coordinateAttributes = [
    "data-viz-manim-coordinate-axis-count",
    "data-viz-manim-coordinate-c2p-finite-count",
    "data-viz-manim-coordinate-math-range",
    "data-viz-manim-coordinate-origin-world-point",
    "data-viz-manim-coordinate-p2c-roundtrip-error",
    "data-viz-manim-coordinate-sample-count",
    "data-viz-manim-coordinate-scale",
    "data-viz-manim-coordinate-summary",
    "data-viz-manim-coordinate-system-ready",
    "data-viz-manim-coordinate-world-range"
  ];

  for (const attribute of coordinateAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim CoordinateSystem c2p/p2c evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(coordinateSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-coordinate-system-plan",
    "data-viz-manim-coordinate-system-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim CoordinateSystem c2p/p2c JSON evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(coordinateSource, /buildCoordinateSystemEvidence/);
  assert.match(coordinateSource, /coordinateSystemEvidenceDataAttributes/);
  assert.match(coordinateSource, /serializeCoordinateSystemEvidence/);
  assert.match(canvasSource, /buildCoordinateSystemEvidence\(manimScene\.coordinateSpace\)/);
  assert.match(canvasSource, /serializeCoordinateSystemEvidence\(manimCoordinateSystemEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCoordinateSystemJson \?\? "" \}\}/);
  assert.match(coordinateSource, /c2p/);
  assert.match(coordinateSource, /p2c/);
  assert.match(evidenceSource, /buildCoordinateSystemEvidence/);
  assert.match(evidenceSource, /coordinateSystemEvidenceDataAttributes/);
  assert.match(evidenceSource, /\.\.\.coordinateSystemAttributes/);
});

test("ThreeDLabCanvas exposes CoordinateSpace math-world mapping and arc-length evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const coordinateSpaceSource = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSpace.ts", "utf8");
  const coordinateSpaceAttributes = [
    "data-viz-manim-coordinate-space-source-contract",
    "data-viz-manim-coordinate-space-math-range",
    "data-viz-manim-coordinate-space-world-range",
    "data-viz-manim-coordinate-space-scale",
    "data-viz-manim-coordinate-space-c2p-summary",
    "data-viz-manim-coordinate-space-p2c-summary",
    "data-viz-manim-coordinate-space-vector-delta",
    "data-viz-manim-coordinate-space-sample-count",
    "data-viz-manim-coordinate-space-finite-sample-count",
    "data-viz-manim-coordinate-space-roundtrip-error",
    "data-viz-manim-coordinate-space-curve-sample-count",
    "data-viz-manim-coordinate-space-arc-length",
    "data-viz-manim-coordinate-space-resampled-count",
    "data-viz-manim-coordinate-space-endpoints",
    "data-viz-manim-coordinate-space-summary"
  ];

  for (const attribute of coordinateSpaceAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose CoordinateSpace math-world and arc-length evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(coordinateSpaceSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-coordinate-space-plan",
    "data-viz-manim-coordinate-space-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose CoordinateSpace math-world and arc-length JSON evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(coordinateSpaceSource, /COORDINATE_SPACE_SOURCE_CONTRACT/);
  assert.match(coordinateSpaceSource, /buildCoordinateSpaceEvidence/);
  assert.match(coordinateSpaceSource, /coordinateSpaceEvidenceDataAttributes/);
  assert.match(coordinateSpaceSource, /serializeCoordinateSpaceEvidence/);
  assert.match(coordinateSpaceSource, /mapMathPointToWorld/);
  assert.match(coordinateSpaceSource, /mapWorldPointToMath/);
  assert.match(coordinateSpaceSource, /resampleCurveByArcLength/);
  assert.match(evidenceSource, /buildCoordinateSpaceEvidence/);
  assert.match(evidenceSource, /coordinateSpaceEvidenceDataAttributes/);
  assert.match(canvasSource, /from "\.\/manim\/mathCoordinateSpace"/);
  assert.match(canvasSource, /buildCoordinateSpaceEvidence\(manimScene\.coordinateSpace\)/);
  assert.match(canvasSource, /serializeCoordinateSpaceEvidence\(manimCoordinateSpaceEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCoordinateSpaceJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-coordinate-space-source-contract"\]\s*\?\?\s*COORDINATE_SPACE_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(canvasSource, /"CoordinateSystem\.c2p\/p2c\|get_graph\|arc-length sampling"/);
});

test("ThreeDLabCanvas exposes Manim SurfaceObject sampling evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const surfaceSource = fs.readFileSync("components/visualizations/three/manim/mathSurfaceObject.ts", "utf8");
  const surfaceAttributes = [
    "data-viz-manim-surface-bounds",
    "data-viz-manim-surface-cell-count",
    "data-viz-manim-surface-finite-normal-count",
    "data-viz-manim-surface-finite-sample-count",
    "data-viz-manim-surface-grid-summary",
    "data-viz-manim-surface-normal-count",
    "data-viz-manim-surface-object-count",
    "data-viz-manim-surface-object-ids",
    "data-viz-manim-surface-range-summary",
    "data-viz-manim-surface-sample-count",
    "data-viz-manim-surface-source-contract",
    "data-viz-manim-surface-summary",
    "data-viz-manim-surface-topology-summary",
    "data-viz-manim-surface-triangle-count",
    "data-viz-manim-surface-wireframe-column-count",
    "data-viz-manim-surface-wireframe-row-count"
  ];

  for (const attribute of surfaceAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim SurfaceObject sampling evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(surfaceSource, new RegExp(attribute));
  }

  assert.match(surfaceSource, /buildSurfaceObjectEvidence/);
  assert.match(surfaceSource, /buildSurfaceObjectsForScene/);
  assert.match(surfaceSource, /buildSurfaceObjectEvidenceForScene/);
  assert.match(surfaceSource, /serializeSurfaceObjectPayload/);
  assert.match(surfaceSource, /SURFACE_OBJECT_SOURCE_CONTRACT/);
  assert.match(surfaceSource, /surfaceObjectEvidenceDataAttributes/);
  assert.match(surfaceSource, /surfaceWireframeCurves/);
  assert.match(evidenceSource, /buildSurfaceObjectEvidenceForScene/);
  assert.match(evidenceSource, /SURFACE_OBJECT_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /surfaceObjectEvidenceDataAttributes/);
  assert.match(evidenceSource, /\.\.\.surfaceObjectAttributes/);
  assert.match(canvasSource, /SURFACE_OBJECT_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildSurfaceObjectsForScene\(manimScene\)/);
  assert.match(canvasSource, /buildSurfaceObjectEvidence\(manimSurfaceObjects\)/);
  assert.match(canvasSource, /serializeSurfaceObjectPayload\(manimSurfaceObjects\)/);
  assert.match(canvasSource, /const manimSurfaceObjectJson = useMemo/);

  for (const selector of ["data-viz-manim-surface-object-plan", "data-viz-manim-surface-object-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim SurfaceObject payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim TracedPath/TracingTail evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const tracingTailSource = fs.readFileSync("components/visualizations/three/manim/mathTracingTail.ts", "utf8");
  const tracingTailAttributes = [
    "data-viz-manim-tracing-tail-age-range",
    "data-viz-manim-tracing-tail-buffer-capacity",
    "data-viz-manim-tracing-tail-buffer-policy-summary",
    "data-viz-manim-tracing-tail-count",
    "data-viz-manim-tracing-tail-duration-summary",
    "data-viz-manim-tracing-tail-fill-ratio-summary",
    "data-viz-manim-tracing-tail-finite-sample-count",
    "data-viz-manim-tracing-tail-fresh-point-summary",
    "data-viz-manim-tracing-tail-gradient-direction-summary",
    "data-viz-manim-tracing-tail-gradient-monotonic",
    "data-viz-manim-tracing-tail-gradient-summary",
    "data-viz-manim-tracing-tail-ids",
    "data-viz-manim-tracing-tail-opacity-range",
    "data-viz-manim-tracing-tail-sample-cadence-summary",
    "data-viz-manim-tracing-tail-sample-count",
    "data-viz-manim-tracing-tail-sample-time-order-summary",
    "data-viz-manim-tracing-tail-source-contract",
    "data-viz-manim-tracing-tail-source-ids",
    "data-viz-manim-tracing-tail-stale-point-summary",
    "data-viz-manim-tracing-tail-stroke-width-range",
    "data-viz-manim-tracing-tail-summary",
    "data-viz-manim-tracing-tail-timestamp-range",
    "data-viz-manim-tracing-tail-traced-point-source-summary"
  ];

  for (const attribute of tracingTailAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim TracedPath/TracingTail evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(tracingTailSource, new RegExp(attribute));
  }

  assert.match(tracingTailSource, /buildTracingTailEvidence/);
  assert.match(tracingTailSource, /buildTracingTailEvidenceEntriesForScene/);
  assert.match(tracingTailSource, /buildTracingTailEvidenceForScene/);
  assert.match(tracingTailSource, /buildTracingTailFromPoints/);
  assert.match(tracingTailSource, /serializeTracingTailEvidencePayload/);
  assert.match(tracingTailSource, /TRACING_TAIL_SOURCE_CONTRACT/);
  assert.match(tracingTailSource, /tracingTailEvidenceDataAttributes/);
  assert.match(evidenceSource, /buildTracingTailEvidenceForScene/);
  assert.match(evidenceSource, /tracingTailEvidenceDataAttributes/);
  assert.match(evidenceSource, /\.\.\.tracingTailAttributes/);
  assert.match(canvasSource, /buildTracingTailEvidenceEntriesForScene\(manimScene, manimRuntimeState\)/);
  assert.match(canvasSource, /buildTracingTailEvidence\(manimTracingTailEntries\)/);
  assert.match(canvasSource, /serializeTracingTailEvidencePayload\(manimTracingTailEntries\)/);
  assert.match(canvasSource, /const manimTracingTailJson = useMemo/);

  for (const selector of ["data-viz-manim-tracing-tail-plan", "data-viz-manim-tracing-tail-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured TracedPath/TracingTail payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
});

test("ThreeDLabCanvas exposes Manim-style Mobject data-array evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const dataArrayModulePath = "components/visualizations/three/manim/mathMobjectDataArray.ts";

  assert.ok(fs.existsSync(dataArrayModulePath), "MAIS Manim should provide a pure Mobject data-array module");
  const dataArraySource = fs.readFileSync(dataArrayModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-data-array-row-count",
    "data-viz-mobject-data-array-point-count",
    "data-viz-mobject-data-array-finite-point-count",
    "data-viz-mobject-data-array-rgba-count",
    "data-viz-mobject-data-array-role-count",
    "data-viz-mobject-data-array-object-ids",
    "data-viz-mobject-data-array-signature",
    "data-viz-mobject-data-array-source-contract",
    "data-viz-mobject-data-array-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject.data table evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(dataArraySource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-data-array",
    "data-viz-mobject-data-array-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose the structured Manim Mobject.data payload to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ MOBJECT_DATA_ARRAY_SOURCE_CONTRACT, buildMobjectDataTable, mobjectDataTableDataAttributes, serializeMobjectDataTable \} from "\.\/manim\/mathMobjectDataArray"/);
  assert.match(dataArraySource, /MOBJECT_DATA_ARRAY_SOURCE_CONTRACT/);
  assert.match(canvasSource, /const manimMobjectDataTable = useMemo/);
  assert.match(canvasSource, /buildMobjectDataTable\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectDataTableDataAttributes\(manimMobjectDataTable\)/);
  assert.match(canvasSource, /serializeMobjectDataTable\(manimMobjectDataTable\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectDataJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject bounding-box payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const boundingBoxModulePath = "components/visualizations/three/manim/mathMobjectBoundingBox.ts";

  assert.ok(fs.existsSync(boundingBoxModulePath), "MAIS Manim should provide a pure Mobject bounding-box module");
  const boundingBoxSource = fs.readFileSync(boundingBoxModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-bounding-box-count",
    "data-viz-mobject-bounding-box-empty-count",
    "data-viz-mobject-bounding-box-finite-count",
    "data-viz-mobject-bounding-box-object-ids",
    "data-viz-mobject-bounding-box-signature",
    "data-viz-mobject-bounding-box-source-contract",
    "data-viz-mobject-bounding-box-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject.get_bounding_box evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(boundingBoxSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-bounding-box",
    "data-viz-mobject-bounding-box-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim bounding-box payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ MOBJECT_BOUNDING_BOX_SOURCE_CONTRACT, buildMobjectBoundingBoxTable, mobjectBoundingBoxDataAttributes, serializeMobjectBoundingBoxTable \} from "\.\/manim\/mathMobjectBoundingBox"/);
  assert.match(canvasSource, /const manimMobjectBoundingBoxTable = useMemo/);
  assert.match(canvasSource, /buildMobjectBoundingBoxTable\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectBoundingBoxDataAttributes\(manimMobjectBoundingBoxTable\)/);
  assert.match(canvasSource, /serializeMobjectBoundingBoxTable\(manimMobjectBoundingBoxTable\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectBoundingBoxJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject family point-cloud payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const pointCloudModulePath = "components/visualizations/three/manim/mathMobjectPointCloud.ts";

  assert.ok(fs.existsSync(pointCloudModulePath), "MAIS Manim should provide a pure Mobject point-cloud module");
  const pointCloudSource = fs.readFileSync(pointCloudModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-point-cloud-empty-family-count",
    "data-viz-mobject-point-cloud-family-count",
    "data-viz-mobject-point-cloud-family-ids",
    "data-viz-mobject-point-cloud-family-with-points-count",
    "data-viz-mobject-point-cloud-object-with-points-count",
    "data-viz-mobject-point-cloud-point-count",
    "data-viz-mobject-point-cloud-signature",
    "data-viz-mobject-point-cloud-source-contract",
    "data-viz-mobject-point-cloud-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style family_members_with_points/get_all_points evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(pointCloudSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-point-cloud",
    "data-viz-mobject-point-cloud-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim point-cloud payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ MOBJECT_POINT_CLOUD_SOURCE_CONTRACT, buildMobjectPointCloudTable, mobjectPointCloudDataAttributes, serializeMobjectPointCloudTable \} from "\.\/manim\/mathMobjectPointCloud"/);
  assert.match(canvasSource, /const manimMobjectPointCloudTable = useMemo/);
  assert.match(canvasSource, /buildMobjectPointCloudTable\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectPointCloudDataAttributes\(manimMobjectPointCloudTable\)/);
  assert.match(canvasSource, /serializeMobjectPointCloudTable\(manimMobjectPointCloudTable\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectPointCloudJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject point-generation evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const pointGenerationModulePath = "components/visualizations/three/manim/mathMobjectPointGeneration.ts";

  assert.ok(fs.existsSync(pointGenerationModulePath), "MAIS Manim should provide a pure Mobject point-generation module");
  const pointGenerationSource = fs.readFileSync(pointGenerationModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-point-generation-finite-point-count",
    "data-viz-mobject-point-generation-generated-object-count",
    "data-viz-mobject-point-generation-generator-kind-summary",
    "data-viz-mobject-point-generation-non-finite-point-count",
    "data-viz-mobject-point-generation-object-count",
    "data-viz-mobject-point-generation-point-count",
    "data-viz-mobject-point-generation-signature",
    "data-viz-mobject-point-generation-source-contract",
    "data-viz-mobject-point-generation-summary",
    "data-viz-mobject-point-generation-zero-point-object-count",
    "data-viz-mobject-point-generation-zero-point-object-ids"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject.generate_points/init_points evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(pointGenerationSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ MOBJECT_POINT_GENERATION_SOURCE_CONTRACT \} from "\.\/manim\/mathMobjectPointGeneration"/
  );
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-mobject-point-generation-source-contract"\]/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject point-transform evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const pointTransformModulePath = "components/visualizations/three/manim/mathMobjectPointTransforms.ts";

  assert.ok(fs.existsSync(pointTransformModulePath), "MAIS Manim should provide a pure Mobject point-transform module");
  const pointTransformSource = fs.readFileSync(pointTransformModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-point-transform-changed-point-count",
    "data-viz-mobject-point-transform-finite-transformed-point-count",
    "data-viz-mobject-point-transform-max-displacement",
    "data-viz-mobject-point-transform-object-count",
    "data-viz-mobject-point-transform-operation-count",
    "data-viz-mobject-point-transform-operation-ids",
    "data-viz-mobject-point-transform-row-count",
    "data-viz-mobject-point-transform-signature",
    "data-viz-mobject-point-transform-source-contract",
    "data-viz-mobject-point-transform-source-point-count",
    "data-viz-mobject-point-transform-summary",
    "data-viz-mobject-point-transform-transformable-object-count",
    "data-viz-mobject-point-transform-transformed-point-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject.apply_points_function_about_point evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(pointTransformSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ MOBJECT_POINT_TRANSFORM_SOURCE_CONTRACT \} from "\.\/manim\/mathMobjectPointTransforms"/
  );
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-mobject-point-transform-source-contract"\]/);
  assert.doesNotMatch(pointTransformSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(pointTransformSource, /applyPointsFunctionAboutPointToRenderState/);
  assert.match(pointTransformSource, /shiftRuntimeRenderState/);
  assert.match(pointTransformSource, /scaleRuntimeRenderState/);
  assert.match(pointTransformSource, /rotateRuntimeRenderState/);
  assert.match(evidenceSource, /buildMobjectPointTransformEvidence/);
  assert.match(evidenceSource, /mobjectPointTransformDataAttributes/);
});

test("ThreeDLabCanvas exposes Manim digest_config evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const configDigestModulePath = "components/visualizations/three/manim/mathConfigDigest.ts";

  assert.ok(fs.existsSync(configDigestModulePath), "MAIS Manim should provide a pure digest_config module");
  const configDigestSource = fs.readFileSync(configDigestModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-config-digest-class-summary",
    "data-viz-manim-config-digest-clipping-plane-count",
    "data-viz-manim-config-digest-defaulted-value-count",
    "data-viz-manim-config-digest-explicit-override-count",
    "data-viz-manim-config-digest-fixed-in-frame-count",
    "data-viz-manim-config-digest-object-count",
    "data-viz-manim-config-digest-opacity-range",
    "data-viz-manim-config-digest-row-summary",
    "data-viz-manim-config-digest-shade-in-3d-count",
    "data-viz-manim-config-digest-signature",
    "data-viz-manim-config-digest-source-contract",
    "data-viz-manim-config-digest-summary",
    "data-viz-manim-config-digest-vmobject-count",
    "data-viz-manim-config-digest-z-index-range"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim digest_config evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(configDigestSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ MANIM_CONFIG_DIGEST_SOURCE_CONTRACT \} from "\.\/manim\/mathConfigDigest"/
  );
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-config-digest-source-contract"\]/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject copy-plan payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const copyPlanModulePath = "components/visualizations/three/manim/mathMobjectCopyPlan.ts";

  assert.ok(fs.existsSync(copyPlanModulePath), "MAIS Manim should provide a pure Mobject copy-plan module");
  const copyPlanSource = fs.readFileSync(copyPlanModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-copy-child-link-count",
    "data-viz-mobject-copy-clone-isolated",
    "data-viz-mobject-copy-clone-isolation-summary",
    "data-viz-mobject-copy-family-count",
    "data-viz-mobject-copy-id-map-summary",
    "data-viz-mobject-copy-parent-link-count",
    "data-viz-mobject-copy-point-count",
    "data-viz-mobject-copy-render-data-count",
    "data-viz-mobject-copy-root-id",
    "data-viz-mobject-copy-signature",
    "data-viz-mobject-copy-shared-reference-count",
    "data-viz-mobject-copy-source-contract",
    "data-viz-mobject-copy-source-id",
    "data-viz-mobject-copy-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject.copy evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(copyPlanSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-copy-plan",
    "data-viz-mobject-copy-plan-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject.copy payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(copyPlanSource, /MOBJECT_COPY_SOURCE_CONTRACT/);
  assert.match(canvasSource, /import \{ buildMobjectCopyPlan, MOBJECT_COPY_SOURCE_CONTRACT, mobjectCopyPlanDataAttributes, serializeMobjectCopyPlan \} from "\.\/manim\/mathMobjectCopyPlan"/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-mobject-copy-source-contract"\]\s*\?\?\s*manimMobjectCopyPlanAttributes\?\.\["data-viz-mobject-copy-source-contract"\]\s*\?\?\s*MOBJECT_COPY_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /const manimMobjectCopyPlan = useMemo/);
  assert.match(canvasSource, /buildMobjectCopyPlan\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectCopyPlanDataAttributes\(manimMobjectCopyPlan\)/);
  assert.match(canvasSource, /serializeMobjectCopyPlan\(manimMobjectCopyPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectCopyPlanJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject arrange and align_to layout payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const layoutModulePath = "components/visualizations/three/manim/mathMobjectLayout.ts";

  assert.ok(fs.existsSync(layoutModulePath), "MAIS Manim should provide a pure Mobject arrange/layout module");
  const layoutSource = fs.readFileSync(layoutModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-layout-align-target-id",
    "data-viz-mobject-layout-aligned-axes",
    "data-viz-mobject-layout-buff",
    "data-viz-mobject-layout-centering-delta",
    "data-viz-mobject-layout-direction",
    "data-viz-mobject-layout-frame-anchor",
    "data-viz-mobject-layout-frame-bounds",
    "data-viz-mobject-layout-frame-target",
    "data-viz-mobject-layout-group-center",
    "data-viz-mobject-layout-group-size",
    "data-viz-mobject-layout-kind",
    "data-viz-mobject-layout-missing-count",
    "data-viz-mobject-layout-missing-ids",
    "data-viz-mobject-layout-next-gap",
    "data-viz-mobject-layout-next-target-id",
    "data-viz-mobject-layout-object-count",
    "data-viz-mobject-layout-object-ids",
    "data-viz-mobject-layout-signature",
    "data-viz-mobject-layout-source-contract",
    "data-viz-mobject-layout-summary",
    "data-viz-mobject-layout-target-centers"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject layout evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(layoutSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-layout",
    "data-viz-mobject-layout-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject layout payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildMobjectArrangeLayoutPlan, MOBJECT_LAYOUT_SOURCE_CONTRACT, mobjectLayoutDataAttributes, serializeMobjectLayoutPlan \} from "\.\/manim\/mathMobjectLayout"/
  );
  assert.match(layoutSource, /buildMobjectAlignToLayoutPlan/);
  assert.match(layoutSource, /buildMobjectNextToLayoutPlan/);
  assert.match(layoutSource, /buildMobjectToEdgeLayoutPlan/);
  assert.match(layoutSource, /buildMobjectToCornerLayoutPlan/);
  assert.match(layoutSource, /MOBJECT_LAYOUT_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-mobject-layout-source-contract=/);
  assert.match(canvasSource, /MOBJECT_LAYOUT_SOURCE_CONTRACT/);
  assert.match(canvasSource, /const manimMobjectLayoutPlan = useMemo/);
  assert.match(canvasSource, /buildMobjectArrangeLayoutPlan\(manimRuntimeState\.objectGraph,\s*manimRuntimeState\.sceneGraph\.topLevelIds/);
  assert.match(canvasSource, /mobjectLayoutDataAttributes\(manimMobjectLayoutPlan\)/);
  assert.match(canvasSource, /serializeMobjectLayoutPlan\(manimMobjectLayoutPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectLayoutJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim-style Mobject render-order payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const renderOrderModulePath = "components/visualizations/three/manim/mathMobjectRenderOrder.ts";

  assert.ok(renderOrderModulePath, "MAIS Manim should name the pure Mobject render-order module path");
  assert.ok(fs.existsSync(renderOrderModulePath), "MAIS Manim should provide a pure Mobject render-order module");
  const renderOrderSource = fs.readFileSync(renderOrderModulePath, "utf8");

  for (const attribute of [
    "data-viz-mobject-render-order-all-ids",
    "data-viz-mobject-render-order-fixed-count",
    "data-viz-mobject-render-order-fixed-ids",
    "data-viz-mobject-render-order-foreground-count",
    "data-viz-mobject-render-order-foreground-ids",
    "data-viz-mobject-render-order-rendered-count",
    "data-viz-mobject-render-order-scene-ids",
    "data-viz-mobject-render-order-signature",
    "data-viz-mobject-render-order-summary",
    "data-viz-mobject-render-order-top-level-count",
    "data-viz-mobject-render-order-top-level-ids"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim-style Mobject render-order evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(renderOrderSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-render-order",
    "data-viz-mobject-render-order-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject render-order payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMobjectRenderOrderPlan, mobjectRenderOrderDataAttributes, serializeMobjectRenderOrderPlan \} from "\.\/manim\/mathMobjectRenderOrder"/);
  assert.match(canvasSource, /const manimMobjectRenderOrderPlan = useMemo/);
  assert.match(canvasSource, /buildMobjectRenderOrderPlan\(manimRuntimeState\.sceneGraph,\s*buildMobjectFamilyIndex\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectRenderOrderDataAttributes\(manimMobjectRenderOrderPlan\)/);
  assert.match(canvasSource, /serializeMobjectRenderOrderPlan\(manimMobjectRenderOrderPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectRenderOrderJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim TransformMatching payload evidence", () => {
  const transformMatchingModulePath = "components/visualizations/three/manim/mathTransformMatching.ts";
  assert.ok(fs.existsSync(transformMatchingModulePath), "MAIS Manim should provide a pure TransformMatching module");
  const transformMatchingSource = fs.readFileSync(transformMatchingModulePath, "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const surfaceSource = fs.readFileSync("components/visualizations/three/threeDCanvasSurfaceContract.ts", "utf8");

  const attributes = [
    "data-viz-manim-transform-matching-entering-count",
    "data-viz-manim-transform-matching-entering-ids",
    "data-viz-manim-transform-matching-exiting-count",
    "data-viz-manim-transform-matching-exiting-ids",
    "data-viz-manim-transform-matching-fade-in-count",
    "data-viz-manim-transform-matching-fade-out-count",
    "data-viz-manim-transform-matching-issue-count",
    "data-viz-manim-transform-matching-issue-summary",
    "data-viz-manim-transform-matching-key-strategies",
    "data-viz-manim-transform-matching-matched-count",
    "data-viz-manim-transform-matching-matched-pair-ids",
    "data-viz-manim-transform-matching-plan-count",
    "data-viz-manim-transform-matching-row-count",
    "data-viz-manim-transform-matching-signature",
    "data-viz-manim-transform-matching-source-contract",
    "data-viz-manim-transform-matching-summary",
    "data-viz-manim-transform-matching-transform-count"
  ];

  for (const attribute of attributes) {
    assert.match(surfaceSource, new RegExp(attribute), `${attribute} should be in the browser QA surface contract`);
    assert.match(canvasSource, new RegExp(attribute), `${attribute} should be exposed by ThreeDLabCanvas`);
    assert.match(transformMatchingSource, new RegExp(attribute), `${attribute} should be produced by the pure TransformMatching helper`);
  }

  for (const selector of ["data-viz-manim-transform-matching-plan", "data-viz-manim-transform-matching-json"]) {
    assert.match(surfaceSource, new RegExp(selector), `${selector} should be in the required selector contract`);
    assert.match(canvasSource, new RegExp(selector), `${selector} should be present on the Canvas surface`);
  }

  assert.match(transformMatchingSource, /TRANSFORM_MATCHING_SOURCE_CONTRACT/);
  assert.match(transformMatchingSource, /TransformMatchingTex/);
  assert.match(transformMatchingSource, /TransformMatchingShapes/);
  assert.match(transformMatchingSource, /ReplacementTransform/);
  assert.match(transformMatchingSource, /buildTransformMatchingPlan/);
  assert.match(transformMatchingSource, /serializeTransformMatchingPlan/);
  assert.match(transformMatchingSource, /transformMatchingDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ TRANSFORM_MATCHING_SOURCE_CONTRACT, buildTransformMatchingPlan, serializeTransformMatchingPlan, transformMatchingDataAttributes \} from "\.\/manim\/mathTransformMatching"/
  );
  assert.match(canvasSource, /const manimTransformMatchingPlan = useMemo/);
  assert.match(canvasSource, /buildTransformMatchingPlan\(manimScene\)/);
  assert.match(canvasSource, /transformMatchingDataAttributes\(manimTransformMatchingPlan\)/);
  assert.match(canvasSource, /serializeTransformMatchingPlan\(manimTransformMatchingPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformMatchingJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Animation.begin and finish lifecycle payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const lifecycleModulePath = "components/visualizations/three/manim/mathAnimationLifecycle.ts";

  assert.ok(
    fs.existsSync(lifecycleModulePath),
    "MAIS Manim should provide a pure Animation.begin/finish lifecycle payload module"
  );
  const lifecycleSource = fs.readFileSync(lifecycleModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-animation-lifecycle-animating-status",
    "data-viz-manim-animation-lifecycle-begin-node-count",
    "data-viz-manim-animation-lifecycle-begin-source-policy",
    "data-viz-manim-animation-lifecycle-copied-node-count",
    "data-viz-manim-animation-lifecycle-family-tuple-count",
    "data-viz-manim-animation-lifecycle-final-alpha",
    "data-viz-manim-animation-lifecycle-final-interpolate-count",
    "data-viz-manim-animation-lifecycle-finish-animating-status",
    "data-viz-manim-animation-lifecycle-finish-color-role-count",
    "data-viz-manim-animation-lifecycle-finish-node-count",
    "data-viz-manim-animation-lifecycle-initial-alpha",
    "data-viz-manim-animation-lifecycle-initial-interpolate-count",
    "data-viz-manim-animation-lifecycle-object-id",
    "data-viz-manim-animation-lifecycle-persistent-node-count",
    "data-viz-manim-animation-lifecycle-plan-id",
    "data-viz-manim-animation-lifecycle-signature",
    "data-viz-manim-animation-lifecycle-source-contract",
    "data-viz-manim-animation-lifecycle-summary",
    "data-viz-manim-animation-lifecycle-suspended-updater-count",
    "data-viz-manim-animation-lifecycle-timing-frame-count",
    "data-viz-manim-animation-lifecycle-timing-lag-ratio",
    "data-viz-manim-animation-lifecycle-timing-rate-function",
    "data-viz-manim-animation-lifecycle-timing-run-time",
    "data-viz-manim-animation-lifecycle-target-id"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Animation.begin/finish lifecycle evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(lifecycleSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-animation-lifecycle",
    "data-viz-manim-animation-lifecycle-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim animation lifecycle payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY, ANIMATION_LIFECYCLE_SOURCE_CONTRACT, animationLifecycleDataAttributes, buildMathAnimationLifecyclePlan, serializeMathAnimationLifecyclePlan \} from "\.\/manim\/mathAnimationLifecycle"/);
  assert.match(canvasSource, /const manimAnimationLifecyclePlan = useMemo/);
  assert.match(lifecycleSource, /ANIMATION_LIFECYCLE_BEGIN_SOURCE_POLICY/);
  assert.match(lifecycleSource, /ANIMATION_LIFECYCLE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildMathAnimationLifecyclePlan\(manimScene, manimRuntimeState, manimAnimationPlans\[0\]\)/);
  assert.match(canvasSource, /animationLifecycleDataAttributes\(manimAnimationLifecyclePlan\)/);
  assert.match(canvasSource, /serializeMathAnimationLifecyclePlan\(manimAnimationLifecyclePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAnimationLifecycleJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Transform.begin alignment and data-lock evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const transformBeginModulePath = "components/visualizations/three/manim/mathTransformBeginPlan.ts";

  assert.ok(
    fs.existsSync(transformBeginModulePath),
    "MAIS Manim should provide a pure Transform.begin alignment/data-lock payload module"
  );
  const transformBeginSource = fs.readFileSync(transformBeginModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-transform-begin-aligned-entry-count",
    "data-viz-manim-transform-begin-aligned-point-pair-count",
    "data-viz-manim-transform-begin-data-lock-count",
    "data-viz-manim-transform-begin-data-lock-alignment-summary",
    "data-viz-manim-transform-begin-data-lock-kind-summary",
    "data-viz-manim-transform-begin-data-lock-summary",
    "data-viz-manim-transform-begin-entering-count",
    "data-viz-manim-transform-begin-exiting-count",
    "data-viz-manim-transform-begin-family-pair-ids",
    "data-viz-manim-transform-begin-family-pair-summary",
    "data-viz-manim-transform-begin-locked-object-ids",
    "data-viz-manim-transform-begin-locked-point-count",
    "data-viz-manim-transform-begin-matched-count",
    "data-viz-manim-transform-begin-max-depth",
    "data-viz-manim-transform-begin-moving-object-ids",
    "data-viz-manim-transform-begin-moving-point-count",
    "data-viz-manim-transform-begin-object-id",
    "data-viz-manim-transform-begin-plan-id",
    "data-viz-manim-transform-begin-signature",
    "data-viz-manim-transform-begin-source-family-ids",
    "data-viz-manim-transform-begin-source-policy",
    "data-viz-manim-transform-begin-summary",
    "data-viz-manim-transform-begin-target-created",
    "data-viz-manim-transform-begin-target-family-ids",
    "data-viz-manim-transform-begin-target-id",
    "data-viz-manim-transform-begin-total-point-count",
    "data-viz-manim-transform-begin-type-mismatch-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Transform.begin alignment/data-lock evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(transformBeginSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-transform-begin",
    "data-viz-manim-transform-begin-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Transform.begin payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(transformBeginSource, /TRANSFORM_BEGIN_SOURCE_POLICY/);
  assert.match(canvasSource, /import \{ TRANSFORM_BEGIN_SOURCE_POLICY, buildMathTransformBeginPlan, serializeMathTransformBeginPlan, transformBeginPlanDataAttributes \} from "\.\/manim\/mathTransformBeginPlan"/);
  assert.match(canvasSource, /const manimTransformBeginPlan = useMemo/);
  assert.match(canvasSource, /buildMathTransformBeginPlan\(manimScene, manimRuntimeState, manimAnimationPlans\[0\]\)/);
  assert.match(canvasSource, /transformBeginPlanDataAttributes\(manimTransformBeginPlan\)/);
  assert.match(canvasSource, /serializeMathTransformBeginPlan\(manimTransformBeginPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformBeginJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Scene.update_frame director-loop evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const updateFrameModulePath = "components/visualizations/three/manim/mathSceneUpdateFrame.ts";

  assert.ok(
    fs.existsSync(updateFrameModulePath),
    "MAIS Manim should provide a pure Scene.update_frame director-loop contract module"
  );
  const updateFrameSource = fs.readFileSync(updateFrameModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-update-frame-action",
    "data-viz-manim-update-frame-capture",
    "data-viz-manim-update-frame-dispatch-events",
    "data-viz-manim-update-frame-dt",
    "data-viz-manim-update-frame-force-draw",
    "data-viz-manim-update-frame-frame-policy",
    "data-viz-manim-update-frame-increment-time",
    "data-viz-manim-update-frame-render-group-count",
    "data-viz-manim-update-frame-render-group-ids",
    "data-viz-manim-update-frame-scene-time",
    "data-viz-manim-update-frame-skip",
    "data-viz-manim-update-frame-sleep",
    "data-viz-manim-update-frame-source-contract",
    "data-viz-manim-update-frame-summary",
    "data-viz-manim-update-frame-update-mobjects",
    "data-viz-manim-update-frame-update-mobjects-dt"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.update_frame director-loop evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(updateFrameSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-update-frame",
    "data-viz-manim-update-frame-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.update_frame payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneUpdateFramePlan/);
  assert.match(evidenceSource, /SCENE_UPDATE_FRAME_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /SCENE_UPDATE_FRAME_FRAME_POLICY/);
  assert.match(evidenceSource, /sceneUpdateFrameDataAttributes/);
  assert.match(evidenceSource, /\.\.\.updateFrameAttributes/);
  assert.match(updateFrameSource, /serializeSceneUpdateFramePlan/);
  assert.match(canvasSource, /buildSceneUpdateFramePlan\(\{/);
  assert.match(canvasSource, /serializeSceneUpdateFramePlan\(manimUpdateFramePlan\)/);
  assert.match(canvasSource, /data-viz-manim-update-frame-json/);
  assert.match(canvasSource, /SCENE_UPDATE_FRAME_SOURCE_CONTRACT/);
  assert.match(canvasSource, /SCENE_UPDATE_FRAME_FRAME_POLICY/);
  assert.match(canvasSource, /data-viz-manim-update-frame-action=/);
  assert.match(canvasSource, /data-viz-manim-update-frame-increment-time=/);
  assert.match(canvasSource, /data-viz-manim-update-frame-summary=/);
  assert.match(canvasSource, /data-viz-manim-update-frame-update-mobjects=/);
  assert.match(canvasSource, /data-viz-manim-update-frame-update-mobjects-dt=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-update-frame-capture"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.should_update_mobjects policy evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const runtimeStateSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");
  const updatePolicyModulePath = "components/visualizations/three/manim/mathSceneUpdatePolicy.ts";

  assert.ok(
    fs.existsSync(updatePolicyModulePath),
    "MAIS Manim should provide a pure Scene.should_update_mobjects policy module"
  );
  const updatePolicySource = fs.readFileSync(updatePolicyModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-always-update-mobjects",
    "data-viz-manim-force-draw",
    "data-viz-manim-has-updaters",
    "data-viz-manim-should-capture-frame",
    "data-viz-manim-should-update-mobjects",
    "data-viz-manim-update-policy-reason",
    "data-viz-manim-update-policy-source-contract",
    "data-viz-manim-update-policy-summary",
    "data-viz-manim-updater-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.should_update_mobjects policy evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(updatePolicySource, new RegExp(attribute));
  }

  assert.match(runtimeStateSource, /buildSceneUpdatePolicy/);
  assert.match(updatePolicySource, /SCENE_UPDATE_POLICY_SOURCE_CONTRACT/);
  assert.match(updatePolicySource, /serializeSceneUpdatePolicy/);
  assert.match(evidenceSource, /sceneUpdatePolicyDataAttributes/);
  assert.match(evidenceSource, /\.\.\.updatePolicyAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_UPDATE_POLICY_SOURCE_CONTRACT, serializeSceneUpdatePolicy \} from "\.\/manim\/mathSceneUpdatePolicy"/
  );
  assert.match(canvasSource, /const manimSceneUpdatePolicyPayload = useMemo/);
  assert.match(canvasSource, /manimRuntimeState\?\.updatePolicy \?\? null/);
  assert.match(canvasSource, /const manimSceneUpdatePolicyJson = useMemo/);
  assert.match(canvasSource, /serializeSceneUpdatePolicy\(manimSceneUpdatePolicyPayload\)/);
  assert.match(canvasSource, /data-viz-manim-update-policy-summary=/);
  assert.match(canvasSource, /data-viz-manim-update-policy-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-should-update-mobjects=/);
  assert.match(canvasSource, /data-viz-manim-update-policy-plan/);
  assert.match(canvasSource, /data-viz-manim-update-policy-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneUpdatePolicyJson \}\}/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-update-policy-reason"\]/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-update-policy-source-contract"\]\s*\?\?\s*SCENE_UPDATE_POLICY_SOURCE_CONTRACT/
  );

  for (const selector of [
    "data-viz-manim-update-policy-plan",
    "data-viz-manim-update-policy-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Scene.should_update_mobjects payload evidence`
    );
  }
});

test("ThreeDLabCanvas exposes Manim updater suspension source-contract evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const suspensionModulePath = "components/visualizations/three/manim/mathUpdaterSuspension.ts";

  assert.ok(
    fs.existsSync(suspensionModulePath),
    "MAIS Manim should provide a pure updater suspension contract module"
  );
  const suspensionSource = fs.readFileSync(suspensionModulePath, "utf8");

  for (const attribute of [
    "data-viz-updater-suspension-policy",
    "data-viz-updater-suspension-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Animation.begin updater suspension evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.match(suspensionSource, /UPDATER_SUSPENSION_SOURCE_CONTRACT/);
  assert.match(suspensionSource, /UPDATER_SUSPENSION_POLICY/);
  assert.match(suspensionSource, /serializeUpdaterSuspensionPlan/);
  assert.match(evidenceSource, /updaterSuspensionSourceContract/);
  assert.match(evidenceSource, /updaterSuspensionPolicy/);
  assert.match(
    canvasSource,
    /import \{ UPDATER_SUSPENSION_POLICY, UPDATER_SUSPENSION_SOURCE_CONTRACT, buildUpdaterSuspensionPlan, serializeUpdaterSuspensionPlan \} from "\.\/manim\/mathUpdaterSuspension"/
  );
  assert.match(canvasSource, /const manimUpdaterSuspensionPlan = useMemo/);
  assert.match(canvasSource, /buildUpdaterSuspensionPlan\(\{[\s\S]*familyIndex: manimMobjectFamilyIndex/);
  assert.match(canvasSource, /scene: manimScene \?\? undefined/);
  assert.match(canvasSource, /timeline: manimRuntimeState\.timeline/);
  assert.match(canvasSource, /updaters: manimRuntimeState\.updaters/);
  assert.match(canvasSource, /const manimUpdaterSuspensionJson = useMemo/);
  assert.match(canvasSource, /serializeUpdaterSuspensionPlan\(manimUpdaterSuspensionPlan\)/);
  assert.match(canvasSource, /data-viz-manim-updater-suspension-plan/);
  assert.match(canvasSource, /data-viz-manim-updater-suspension-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimUpdaterSuspensionJson \}\}/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-updater-suspension-source-contract"\]/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-updater-suspension-policy"\]/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-updater-suspension-source-contract"\]\s*\?\?\s*UPDATER_SUSPENSION_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-updater-suspension-policy"\]\s*\?\?\s*UPDATER_SUSPENSION_POLICY/
  );
  assert.doesNotMatch(
    canvasSource,
    /"Animation\.begin may suspend mobject updating for animated families until finish"/
  );
  assert.doesNotMatch(canvasSource, /"animated-family-updaters-suspended-during-animation"/);

  for (const selector of [
    "data-viz-manim-updater-suspension-plan",
    "data-viz-manim-updater-suspension-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured updater-suspension payload evidence`
    );
  }
});

test("ThreeDLabCanvas exposes Manim Scene.emit_frame and SceneFileWriter.write_frame evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const emitFrameModulePath = "components/visualizations/three/manim/mathSceneEmitFrame.ts";

  assert.ok(
    fs.existsSync(emitFrameModulePath),
    "MAIS Manim should provide a pure Scene.emit_frame / SceneFileWriter.write_frame contract module"
  );
  const emitFrameSource = fs.readFileSync(emitFrameModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-emit-frame-camera-id",
    "data-viz-manim-emit-frame-calls-file-writer",
    "data-viz-manim-emit-frame-called",
    "data-viz-manim-emit-frame-frame-index",
    "data-viz-manim-emit-frame-progress-display",
    "data-viz-manim-emit-frame-raw-fbo",
    "data-viz-manim-emit-frame-skip",
    "data-viz-manim-emit-frame-source-contract",
    "data-viz-manim-emit-frame-status",
    "data-viz-manim-emit-frame-summary",
    "data-viz-manim-emit-frame-updates-progress-display",
    "data-viz-manim-emit-frame-write-policy",
    "data-viz-manim-emit-frame-write-movie",
    "data-viz-manim-emit-frame-write-to-movie"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.emit_frame / SceneFileWriter.write_frame evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(emitFrameSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-emit-frame",
    "data-viz-manim-emit-frame-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.emit_frame / SceneFileWriter.write_frame payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneEmitFramePlan/);
  assert.match(evidenceSource, /SCENE_EMIT_FRAME_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /SCENE_EMIT_FRAME_WRITE_POLICY/);
  assert.match(evidenceSource, /sceneEmitFrameDataAttributes/);
  assert.match(emitFrameSource, /serializeSceneEmitFramePlan/);
  assert.match(canvasSource, /buildSceneEmitFramePlan\(\{/);
  assert.match(canvasSource, /serializeSceneEmitFramePlan\(manimEmitFramePlan\)/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-json/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-status=/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-summary=/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-updates-progress-display=/);
  assert.match(canvasSource, /data-viz-manim-emit-frame-write-policy=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-emit-frame-write-movie"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.progress_through_animations evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const progressThroughModulePath = "components/visualizations/three/manim/mathSceneProgressThroughAnimations.ts";

  assert.ok(
    fs.existsSync(progressThroughModulePath),
    "MAIS Manim should provide a pure Scene.progress_through_animations contract module"
  );
  const progressThroughSource = fs.readFileSync(progressThroughModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-progress-through-animation-count",
    "data-viz-manim-progress-through-emit-frame-count",
    "data-viz-manim-progress-through-emit-frame-statuses",
    "data-viz-manim-progress-through-final-alpha-summary",
    "data-viz-manim-progress-through-final-time",
    "data-viz-manim-progress-through-fps",
    "data-viz-manim-progress-through-frame-interval",
    "data-viz-manim-progress-through-frame-policy",
    "data-viz-manim-progress-through-frame-operation-sequence",
    "data-viz-manim-progress-through-frame-order-summary",
    "data-viz-manim-progress-through-frame-count",
    "data-viz-manim-progress-through-interpolate-count",
    "data-viz-manim-progress-through-raw-alpha-overshoot-animation-ids",
    "data-viz-manim-progress-through-raw-alpha-overshoot-count",
    "data-viz-manim-progress-through-raw-alpha-sequence-summary",
    "data-viz-manim-progress-through-run-time",
    "data-viz-manim-progress-through-skip",
    "data-viz-manim-progress-through-source-contract",
    "data-viz-manim-progress-through-summary",
    "data-viz-manim-progress-through-update-frame-action-summary",
    "data-viz-manim-progress-through-update-frame-count",
    "data-viz-manim-progress-through-update-mobject-exclusion-policy",
    "data-viz-manim-progress-through-update-mobject-object-dt-summary",
    "data-viz-manim-progress-through-update-mobject-object-count",
    "data-viz-manim-progress-through-update-mobject-target-summary",
    "data-viz-manim-progress-through-update-mobjects-count",
    "data-viz-manim-progress-through-update-mobjects-dt-summary",
    "data-viz-manim-progress-through-written-frame-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.progress_through_animations evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(progressThroughSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-progress-through",
    "data-viz-manim-progress-through-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.progress_through_animations payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneProgressThroughAnimationsPlan/);
  assert.match(evidenceSource, /PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY/);
  assert.match(evidenceSource, /PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY/);
  assert.match(evidenceSource, /sceneProgressThroughAnimationsDataAttributes/);
  assert.match(evidenceSource, /\.\.\.progressThroughAttributes/);
  assert.match(progressThroughSource, /serializeSceneProgressThroughAnimationsPlan/);
  assert.match(canvasSource, /buildSceneProgressThroughAnimationsPlan\(\{/);
  assert.match(canvasSource, /serializeSceneProgressThroughAnimationsPlan\(manimProgressThroughAnimationsPlan\)/);
  assert.match(canvasSource, /data-viz-manim-progress-through-json/);
  assert.match(canvasSource, /data-viz-manim-progress-through-frame-policy=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-summary=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-source-contract=/);
  assert.match(progressThroughSource, /PROGRESS_THROUGH_ANIMATIONS_FRAME_POLICY/);
  assert.match(progressThroughSource, /PROGRESS_THROUGH_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(progressThroughSource, /PROGRESS_THROUGH_ANIMATIONS_UPDATE_MOBJECTS_POLICY/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-frame-action-summary=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-mobject-exclusion-policy=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-mobject-object-dt-summary=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-mobject-object-count=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-mobject-target-summary=/);
  assert.match(canvasSource, /data-viz-manim-progress-through-update-mobjects-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-progress-through-final-alpha-summary"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.get_time_progression frame sampling evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const timeProgressionModulePath = "components/visualizations/three/manim/mathSceneTimeProgression.ts";

  assert.ok(
    fs.existsSync(timeProgressionModulePath),
    "MAIS Manim should provide a pure Scene.get_time_progression frame sampling contract module"
  );
  const timeProgressionSource = fs.readFileSync(timeProgressionModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-time-progression-description",
    "data-viz-manim-time-progression-final-time",
    "data-viz-manim-time-progression-fps",
    "data-viz-manim-time-progression-frame-count",
    "data-viz-manim-time-progression-frame-interval",
    "data-viz-manim-time-progression-mode",
    "data-viz-manim-time-progression-n-iterations",
    "data-viz-manim-time-progression-override-skip",
    "data-viz-manim-time-progression-overshoot",
    "data-viz-manim-time-progression-run-time",
    "data-viz-manim-time-progression-sampling-policy",
    "data-viz-manim-time-progression-skip-animations",
    "data-viz-manim-time-progression-source-contract",
    "data-viz-manim-time-progression-summary",
    "data-viz-manim-time-progression-times-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.get_time_progression frame sampling evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(timeProgressionSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-time-progression",
    "data-viz-manim-time-progression-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.get_time_progression payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneTimeProgression/);
  assert.match(evidenceSource, /SCENE_TIME_PROGRESSION_SAMPLING_POLICY/);
  assert.match(evidenceSource, /SCENE_TIME_PROGRESSION_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /sceneTimeProgressionDataAttributes/);
  assert.match(evidenceSource, /\.\.\.timeProgressionAttributes/);
  assert.match(timeProgressionSource, /serializeSceneTimeProgression/);
  assert.match(canvasSource, /buildSceneTimeProgression\(\{/);
  assert.match(canvasSource, /serializeSceneTimeProgression\(manimTimeProgressionPlan\)/);
  assert.match(canvasSource, /data-viz-manim-time-progression-json/);
  assert.match(canvasSource, /data-viz-manim-time-progression-sampling-policy=/);
  assert.match(canvasSource, /data-viz-manim-time-progression-summary=/);
  assert.match(canvasSource, /data-viz-manim-time-progression-times-summary=/);
  assert.match(canvasSource, /data-viz-manim-time-progression-frame-interval=/);
  assert.match(timeProgressionSource, /SCENE_TIME_PROGRESSION_SAMPLING_POLICY/);
  assert.match(timeProgressionSource, /SCENE_TIME_PROGRESSION_SOURCE_CONTRACT/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-time-progression-overshoot"\]/);
});

test("ThreeDLabCanvas exposes Manim transform path-function evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const pathFunctionModulePath = "components/visualizations/three/manim/mathPathFunctions.ts";

  assert.ok(
    fs.existsSync(pathFunctionModulePath),
    "MAIS Manim should provide a pure transform path-function module"
  );
  const pathFunctionSource = fs.readFileSync(pathFunctionModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-transform-path-plan-count",
    "data-viz-manim-transform-path-authored-count",
    "data-viz-manim-transform-path-arc-count",
    "data-viz-manim-transform-path-arc-angle-range",
    "data-viz-manim-transform-path-arc-axis-summary",
    "data-viz-manim-transform-path-arc-midpoint-deviation-range",
    "data-viz-manim-transform-path-degenerate-arc-count",
    "data-viz-manim-transform-path-midpoint-deviation-summary",
    "data-viz-manim-transform-path-sample-alpha",
    "data-viz-manim-transform-path-sampled-count",
    "data-viz-manim-transform-path-sampled-midpoints",
    "data-viz-manim-transform-path-straight-count",
    "data-viz-manim-transform-path-object-ids",
    "data-viz-manim-transform-path-pointlike-field-policy",
    "data-viz-manim-transform-path-summaries",
    "data-viz-manim-transform-path-non-point-field-policy",
    "data-viz-manim-transform-path-source-contract",
    "data-viz-manim-transform-path-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim transform path-function evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(pathFunctionSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-transform-path-plan",
    "data-viz-manim-transform-path-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose the serialized transform path-function catalog`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(pathFunctionSource, /pathAlongArc/);
  assert.match(pathFunctionSource, /TRANSFORM_PATH_POINTLIKE_FIELD_POLICY/);
  assert.match(pathFunctionSource, /TRANSFORM_PATH_NON_POINT_FIELD_POLICY/);
  assert.match(pathFunctionSource, /TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT/);
  assert.match(pathFunctionSource, /buildTransformPathFunctionCatalog/);
  assert.match(pathFunctionSource, /transformPathFunctionCatalogDataAttributes/);
  assert.match(pathFunctionSource, /serializeTransformPathFunctionCatalog/);
  assert.match(evidenceSource, /buildTransformPathFunctionCatalog/);
  assert.match(evidenceSource, /transformPathFunctionCatalogDataAttributes/);
  assert.match(evidenceSource, /manimTransformPathPointlikeFieldPolicy/);
  assert.match(evidenceSource, /manimTransformPathNonPointFieldPolicy/);
  assert.match(evidenceSource, /manimTransformPathSourceContract/);
  assert.match(
    canvasSource,
    /import \{ TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT, TRANSFORM_PATH_NON_POINT_FIELD_POLICY, TRANSFORM_PATH_POINTLIKE_FIELD_POLICY, serializeTransformPathFunctionCatalog, type TransformPathFunctionCatalog \} from "\.\/manim\/mathPathFunctions"/
  );
  assert.match(canvasSource, /useMemo<TransformPathFunctionCatalog \| null>/);
  assert.match(canvasSource, /manimTransformPathFunctionCatalog/);
  assert.match(canvasSource, /serializeTransformPathFunctionCatalog\(manimTransformPathFunctionCatalog\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformPathJson \?\? "" \}\}/);
  assert.match(canvasSource, /manimTransformPathPointlikeFieldPolicy:\s*TRANSFORM_PATH_POINTLIKE_FIELD_POLICY/);
  assert.match(canvasSource, /manimTransformPathNonPointFieldPolicy:\s*TRANSFORM_PATH_NON_POINT_FIELD_POLICY/);
  assert.match(canvasSource, /manimTransformPathSourceContract:\s*TRANSFORM_PATH_FUNCTION_SOURCE_CONTRACT/);
  assert.doesNotMatch(canvasSource, /"pointlike-fields-use-path-function"/);
  assert.doesNotMatch(canvasSource, /"non-point-data-linear-blend"/);
  assert.doesNotMatch(
    canvasSource,
    /"Mobject\.interpolate\(start,target,alpha,path_func\): pointlike fields follow path functions while non-point data blends linearly"/
  );
  assert.match(canvasSource, /manimTransformPathArcCount/);
  assert.match(canvasSource, /data-viz-manim-transform-path-pointlike-field-policy=/);
  assert.match(canvasSource, /data-viz-manim-transform-path-non-point-field-policy=/);
  assert.match(canvasSource, /data-viz-manim-transform-path-source-contract=/);
  assert.match(canvasSource, /manimTransformPathSummary/);
});

test("ThreeDLabCanvas exposes Manim rate-function timing evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const rateFunctionModulePath = "components/visualizations/three/manim/mathRateFunctions.ts";

  assert.ok(
    fs.existsSync(rateFunctionModulePath),
    "MAIS Manim should provide a pure rate-function timing module"
  );
  const rateFunctionSource = fs.readFileSync(rateFunctionModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-rate-function-step-count",
    "data-viz-manim-rate-function-linear-count",
    "data-viz-manim-rate-function-smooth-count",
    "data-viz-manim-rate-function-linear-duration",
    "data-viz-manim-rate-function-smooth-duration",
    "data-viz-manim-rate-function-ids",
    "data-viz-manim-rate-function-step-types",
    "data-viz-manim-rate-function-source-contract",
    "data-viz-manim-rate-function-alpha-policy",
    "data-viz-manim-rate-function-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim rate-function timing evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(rateFunctionSource, new RegExp(attribute));
  }

  assert.match(rateFunctionSource, /applyRateFunction/);
  assert.match(rateFunctionSource, /RATE_FUNCTION_SOURCE_CONTRACT/);
  assert.match(rateFunctionSource, /RATE_FUNCTION_ALPHA_POLICY/);
  assert.match(rateFunctionSource, /buildRateFunctionCatalog/);
  assert.match(rateFunctionSource, /rateFunctionCatalogDataAttributes/);
  assert.match(rateFunctionSource, /serializeRateFunctionCatalog/);
  assert.match(evidenceSource, /buildRateFunctionCatalog/);
  assert.match(evidenceSource, /rateFunctionCatalogDataAttributes/);
  assert.match(evidenceSource, /manimRateFunctionSourceContract/);
  assert.match(evidenceSource, /manimRateFunctionAlphaPolicy/);
  assert.match(canvasSource, /manimRateFunctionLinearDuration/);
  assert.match(canvasSource, /data-viz-manim-rate-function-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-rate-function-alpha-policy=/);
  assert.match(canvasSource, /manimRateFunctionSummary/);
  for (const selector of [
    "data-viz-manim-rate-function-plan",
    "data-viz-manim-rate-function-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim rate-function catalog JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ RATE_FUNCTION_ALPHA_POLICY, RATE_FUNCTION_SOURCE_CONTRACT, serializeRateFunctionCatalog, type MathRateFunctionCatalog \} from "\.\/manim\/mathRateFunctions"/
  );
  assert.match(canvasSource, /useMemo<MathRateFunctionCatalog \| null>/);
  assert.match(canvasSource, /serializeRateFunctionCatalog\(manimRateFunctionCatalog\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRateFunctionJson \?\? "" \}\}/);
});

test("ThreeDLabCanvas exposes Manim lag-ratio timing evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const lagRatioModulePath = "components/visualizations/three/manim/mathLagRatios.ts";

  assert.ok(
    fs.existsSync(lagRatioModulePath),
    "MAIS Manim should provide a pure lag-ratio timing module"
  );
  const lagRatioSource = fs.readFileSync(lagRatioModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-lag-ratio-animation-plan-count",
    "data-viz-manim-lag-ratio-composition-count",
    "data-viz-manim-lag-ratio-authored-count",
    "data-viz-manim-lag-ratio-nonzero-count",
    "data-viz-manim-lag-ratio-zero-count",
    "data-viz-manim-lag-ratio-max",
    "data-viz-manim-lag-ratio-object-ids",
    "data-viz-manim-lag-ratio-composition-ids",
    "data-viz-manim-lag-ratio-source-contract",
    "data-viz-manim-lag-ratio-sub-alpha-policy",
    "data-viz-manim-lag-ratio-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim lag-ratio timing evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(lagRatioSource, new RegExp(attribute));
  }

  assert.match(lagRatioSource, /LAG_RATIO_SOURCE_CONTRACT/);
  assert.match(lagRatioSource, /LAG_RATIO_SUB_ALPHA_POLICY/);
  assert.match(lagRatioSource, /buildLagRatioCatalog/);
  assert.match(lagRatioSource, /lagRatioCatalogDataAttributes/);
  assert.match(lagRatioSource, /serializeLagRatioCatalog/);
  assert.match(evidenceSource, /buildLagRatioCatalog/);
  assert.match(evidenceSource, /lagRatioCatalogDataAttributes/);
  assert.match(evidenceSource, /manimLagRatioSourceContract/);
  assert.match(evidenceSource, /manimLagRatioSubAlphaPolicy/);
  assert.match(canvasSource, /manimLagRatioMax/);
  assert.match(canvasSource, /data-viz-manim-lag-ratio-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-lag-ratio-sub-alpha-policy=/);
  assert.match(canvasSource, /manimLagRatioSummary/);
  for (const selector of [
    "data-viz-manim-lag-ratio-plan",
    "data-viz-manim-lag-ratio-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim lag-ratio catalog JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ LAG_RATIO_SOURCE_CONTRACT, LAG_RATIO_SUB_ALPHA_POLICY, serializeLagRatioCatalog, type MathLagRatioCatalog \} from "\.\/manim\/mathLagRatios"/
  );
  assert.match(canvasSource, /useMemo<MathLagRatioCatalog \| null>/);
  assert.match(canvasSource, /serializeLagRatioCatalog\(manimLagRatioCatalog\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimLagRatioJson \?\? "" \}\}/);
});

test("ThreeDLabCanvas exposes Manim interpolate_mobject sub-alpha schedule evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const subAlphaModulePath = "components/visualizations/three/manim/mathSubAlphaSchedule.ts";

  assert.ok(
    fs.existsSync(subAlphaModulePath),
    "MAIS Manim should provide a pure interpolate_mobject sub-alpha schedule module"
  );
  const subAlphaSource = fs.readFileSync(subAlphaModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-sub-alpha-active-plan-count",
    "data-viz-manim-sub-alpha-node-count",
    "data-viz-manim-sub-alpha-staggered-node-count",
    "data-viz-manim-sub-alpha-leading-node-count",
    "data-viz-manim-sub-alpha-delayed-node-count",
    "data-viz-manim-sub-alpha-zero-node-count",
    "data-viz-manim-sub-alpha-partial-node-count",
    "data-viz-manim-sub-alpha-complete-node-count",
    "data-viz-manim-sub-alpha-raw-min",
    "data-viz-manim-sub-alpha-raw-max",
    "data-viz-manim-sub-alpha-raw-range",
    "data-viz-manim-sub-alpha-lagged-min",
    "data-viz-manim-sub-alpha-lagged-max",
    "data-viz-manim-sub-alpha-lagged-range",
    "data-viz-manim-sub-alpha-eased-min",
    "data-viz-manim-sub-alpha-eased-max",
    "data-viz-manim-sub-alpha-eased-range",
    "data-viz-manim-sub-alpha-node-window-summary",
    "data-viz-manim-sub-alpha-family-zip-covered-node-count",
    "data-viz-manim-sub-alpha-family-zip-missing-node-count",
    "data-viz-manim-sub-alpha-family-zip-policy",
    "data-viz-manim-sub-alpha-family-zip-sequence",
    "data-viz-manim-sub-alpha-family-zip-tuple-count",
    "data-viz-manim-sub-alpha-family-zip-uncovered-object-ids",
    "data-viz-manim-sub-alpha-rate-function-ids",
    "data-viz-manim-sub-alpha-object-ids",
    "data-viz-manim-sub-alpha-source-contract",
    "data-viz-manim-sub-alpha-window-policy",
    "data-viz-manim-sub-alpha-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim interpolate_mobject sub-alpha schedule evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(subAlphaSource, new RegExp(attribute));
  }

  assert.match(subAlphaSource, /SUB_ALPHA_SOURCE_CONTRACT/);
  assert.match(subAlphaSource, /SUB_ALPHA_WINDOW_POLICY/);
  assert.match(subAlphaSource, /buildSubAlphaSchedule/);
  assert.match(subAlphaSource, /subAlphaScheduleDataAttributes/);
  assert.match(subAlphaSource, /serializeSubAlphaSchedule/);
  assert.match(subAlphaSource, /interpolate_mobject/);
  assert.match(evidenceSource, /buildSubAlphaSchedule/);
  assert.match(evidenceSource, /subAlphaScheduleDataAttributes/);
  assert.match(evidenceSource, /manimSubAlphaSourceContract/);
  assert.match(evidenceSource, /manimSubAlphaWindowPolicy/);
  assert.match(evidenceSource, /manimSubAlphaFamilyZipPolicy/);
  assert.match(canvasSource, /manimSubAlphaStaggeredNodeCount/);
  assert.match(canvasSource, /manimSubAlphaFamilyZipCoveredNodeCount/);
  assert.match(canvasSource, /data-viz-manim-sub-alpha-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-sub-alpha-window-policy=/);
  assert.match(canvasSource, /data-viz-manim-sub-alpha-node-window-summary=/);
  assert.match(canvasSource, /manimSubAlphaSummary/);
  for (const selector of [
    "data-viz-manim-sub-alpha-plan",
    "data-viz-manim-sub-alpha-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim sub-alpha schedule JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ SUB_ALPHA_SOURCE_CONTRACT, SUB_ALPHA_WINDOW_POLICY, serializeSubAlphaSchedule, type MathSubAlphaSchedule \} from "\.\/manim\/mathSubAlphaSchedule"/
  );
  assert.match(canvasSource, /useMemo<MathSubAlphaSchedule \| null>/);
  assert.match(canvasSource, /serializeSubAlphaSchedule\(manimSubAlphaSchedule\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSubAlphaJson \?\? "" \}\}/);
});

test("ThreeDLabCanvas exposes Manim updater dt-signature payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const updaterSignatureModulePath = "components/visualizations/three/manim/mathUpdaterSignature.ts";

  assert.ok(
    fs.existsSync(updaterSignatureModulePath),
    "MAIS Manim should provide a pure updater dt-signature payload module"
  );
  const updaterSignatureSource = fs.readFileSync(updaterSignatureModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-updater-signature-count",
    "data-viz-manim-updater-signature-call-signatures",
    "data-viz-manim-updater-signature-dependency-count",
    "data-viz-manim-updater-signature-dependency-ids",
    "data-viz-manim-updater-signature-dt-aware-count",
    "data-viz-manim-updater-signature-dt-aware-ids",
    "data-viz-manim-updater-signature-receives-dt-ids",
    "data-viz-manim-updater-signature-receives-timeline-ids",
    "data-viz-manim-updater-signature-signature",
    "data-viz-manim-updater-signature-source-summary",
    "data-viz-manim-updater-signature-summary",
    "data-viz-manim-updater-signature-timeline-count",
    "data-viz-manim-updater-signature-timeline-ids"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose which Manim updaters receive dt versus timeline/dependency inputs`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(updaterSignatureSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-updater-signature",
    "data-viz-manim-updater-signature-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim updater signature payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMathUpdaterSignaturePlan, serializeMathUpdaterSignaturePlan, updaterSignatureDataAttributes \} from "\.\/manim\/mathUpdaterSignature"/);
  assert.match(canvasSource, /const manimUpdaterSignaturePlan = useMemo/);
  assert.match(canvasSource, /buildMathUpdaterSignaturePlan\(manimRuntimeState\.updaters\)/);
  assert.match(canvasSource, /updaterSignatureDataAttributes\(manimUpdaterSignaturePlan\)/);
  assert.match(canvasSource, /serializeMathUpdaterSignaturePlan\(manimUpdaterSignaturePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimUpdaterSignatureJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim always/f_always/always_redraw authoring evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const alwaysSource = fs.readFileSync("components/visualizations/three/manim/mathAlwaysRedraw.ts", "utf8");
  const alwaysMethodSource = fs.readFileSync("components/visualizations/three/manim/mathAlwaysMethodUpdater.ts", "utf8");
  const alwaysUpdaterAttributes = [
    "data-viz-manim-always-updater-count",
    "data-viz-manim-always-updater-always-method-count",
    "data-viz-manim-always-updater-always-redraw-count",
    "data-viz-manim-always-updater-dependency-tracker-count",
    "data-viz-manim-always-updater-dependency-tracker-ids",
    "data-viz-manim-always-updater-factory-count",
    "data-viz-manim-always-updater-missing-tracker-count",
    "data-viz-manim-always-updater-object-ids",
    "data-viz-manim-always-updater-operation-types",
    "data-viz-manim-always-updater-source-contract",
    "data-viz-manim-always-updater-summary",
    "data-viz-manim-always-updater-updater-ids"
  ];
  const alwaysMethodAttributes = [
    "data-viz-manim-always-method-source-contract",
    "data-viz-manim-always-method-count",
    "data-viz-manim-always-method-placed-count",
    "data-viz-manim-always-method-missing-object-count",
    "data-viz-manim-always-method-missing-target-count",
    "data-viz-manim-always-method-dynamic-buff-count",
    "data-viz-manim-always-method-updater-ids",
    "data-viz-manim-always-method-object-ids",
    "data-viz-manim-always-method-target-object-ids",
    "data-viz-manim-always-method-operation-types",
    "data-viz-manim-always-method-buff-summary",
    "data-viz-manim-always-method-direction-summary",
    "data-viz-manim-always-method-placement-summary",
    "data-viz-manim-always-method-bounding-box-summary",
    "data-viz-manim-always-method-max-placement-error",
    "data-viz-manim-always-method-summary"
  ];

  for (const attribute of alwaysUpdaterAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim always/f_always/always_redraw authoring evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(alwaysSource, new RegExp(attribute));
  }

  for (const attribute of alwaysMethodAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim always-method geometry evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(alwaysMethodSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-always-updater-plan",
    "data-viz-manim-always-updater-json",
    "data-viz-manim-always-method-plan",
    "data-viz-manim-always-method-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim always/f_always/always_redraw JSON evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(alwaysSource, /buildAlwaysUpdaterAuthoringCatalog/);
  assert.match(alwaysSource, /ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT/);
  assert.match(alwaysSource, /alwaysUpdaterAuthoringDataAttributes/);
  assert.match(alwaysSource, /serializeAlwaysUpdaterAuthoringCatalog/);
  assert.match(alwaysMethodSource, /ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT/);
  assert.match(alwaysMethodSource, /serializeAlwaysMethodUpdaterEvidence/);
  assert.match(
    canvasSource,
    /from "\.\/manim\/mathAlwaysMethodUpdater"/
  );
  assert.match(
    canvasSource,
    /from "\.\/manim\/mathAlwaysRedraw"/
  );
  assert.match(canvasSource, /buildAlwaysUpdaterAuthoringCatalog\(\{/);
  assert.match(canvasSource, /serializeAlwaysUpdaterAuthoringCatalog\(manimAlwaysUpdaterCatalog\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAlwaysUpdaterJson \?\? "" \}\}/);
  assert.match(canvasSource, /buildAlwaysMethodUpdaterEvidence\(manimScene, manimRuntimeState\)/);
  assert.match(canvasSource, /serializeAlwaysMethodUpdaterEvidence\(manimAlwaysMethodEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAlwaysMethodJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-always-updater-source-contract"\]\s*\?\?\s*ALWAYS_UPDATER_AUTHORING_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-always-method-source-contract"\]\s*\?\?\s*ALWAYS_METHOD_UPDATER_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-always-method-source-contract"\]\s*\?\?\s*"Manim always\(mobject\.method, \.\.\.\): method relationship is re-evaluated after frame\/object updaters"/
  );
  assert.match(alwaysMethodSource, /buildAlwaysMethodUpdaterEvidence/);
  assert.match(alwaysMethodSource, /alwaysMethodUpdaterEvidenceDataAttributes/);
  assert.match(evidenceSource, /buildAlwaysUpdaterAuthoringCatalog/);
  assert.match(evidenceSource, /manimAlwaysUpdaterSourceContract/);
  assert.match(evidenceSource, /alwaysUpdaterAuthoringDataAttributes/);
  assert.match(evidenceSource, /buildAlwaysMethodUpdaterEvidence/);
  assert.match(evidenceSource, /alwaysMethodUpdaterEvidenceDataAttributes/);
  assert.match(evidenceSource, /\.\.\.alwaysUpdaterAttributes/);
  assert.match(evidenceSource, /\.\.\.alwaysMethodAttributes/);
});

test("ThreeDLabCanvas exposes Manim recursive updater execution-plan payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const updaterExecutionModulePath = "components/visualizations/three/manim/mathUpdaterExecutionPlan.ts";

  assert.ok(
    fs.existsSync(updaterExecutionModulePath),
    "MAIS Manim should provide a pure recursive updater execution-plan payload module"
  );
  const updaterExecutionSource = fs.readFileSync(updaterExecutionModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-updater-execution-active-call-sequence",
    "data-viz-manim-updater-execution-active-count",
    "data-viz-manim-updater-execution-dependency-count",
    "data-viz-manim-updater-execution-dt-aware-count",
    "data-viz-manim-updater-execution-family-paths",
    "data-viz-manim-updater-execution-family-traversal-object-ids",
    "data-viz-manim-updater-execution-family-traversal-summary",
    "data-viz-manim-updater-execution-idle-object-ids",
    "data-viz-manim-updater-execution-max-depth",
    "data-viz-manim-updater-execution-object-ids",
    "data-viz-manim-updater-execution-order-summary",
    "data-viz-manim-updater-execution-phase",
    "data-viz-manim-updater-execution-recursive-order",
    "data-viz-manim-updater-execution-row-count",
    "data-viz-manim-updater-execution-signature",
    "data-viz-manim-updater-execution-source-contract",
    "data-viz-manim-updater-execution-summary",
    "data-viz-manim-updater-execution-suspended-count",
    "data-viz-manim-updater-execution-timeline-count",
    "data-viz-manim-updater-execution-updater-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim children-first updater execution evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(updaterExecutionSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-updater-execution",
    "data-viz-manim-updater-execution-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim updater execution payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildMathUpdaterExecutionPlan, MOBJECT_UPDATE_SOURCE_CONTRACT, serializeMathUpdaterExecutionPlan, updaterExecutionPlanDataAttributes \} from "\.\/manim\/mathUpdaterExecutionPlan"/
  );
  assert.match(canvasSource, /const manimUpdaterExecutionPlan = useMemo/);
  assert.match(canvasSource, /buildMathUpdaterExecutionPlan\(manimRuntimeState\)/);
  assert.match(updaterExecutionSource, /MOBJECT_UPDATE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /updaterExecutionPlanDataAttributes\(manimUpdaterExecutionPlan\)/);
  assert.match(
    canvasSource,
    /manimUpdaterExecutionAttributes\?\.\["data-viz-manim-updater-execution-source-contract"\]\s*\?\?\s*MOBJECT_UPDATE_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimUpdaterExecutionAttributes\?\.\["data-viz-manim-updater-execution-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(canvasSource, /serializeMathUpdaterExecutionPlan\(manimUpdaterExecutionPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimUpdaterExecutionJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim ValueTracker payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const valueTrackerPayloadModulePath = "components/visualizations/three/manim/mathValueTrackerPayload.ts";

  assert.ok(
    fs.existsSync(valueTrackerPayloadModulePath),
    "MAIS Manim should provide a pure ValueTracker payload module"
  );
  const valueTrackerPayloadSource = fs.readFileSync(valueTrackerPayloadModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-value-tracker-control-count",
    "data-viz-manim-value-tracker-count",
    "data-viz-manim-value-tracker-hidden-mobject-ids",
    "data-viz-manim-value-tracker-ids",
    "data-viz-manim-value-tracker-normalized-summary",
    "data-viz-manim-value-tracker-object-count",
    "data-viz-manim-value-tracker-parameter-count",
    "data-viz-manim-value-tracker-progress-count",
    "data-viz-manim-value-tracker-range-summary",
    "data-viz-manim-value-tracker-signature",
    "data-viz-manim-value-tracker-source-contract",
    "data-viz-manim-value-tracker-source-summary",
    "data-viz-manim-value-tracker-summary",
    "data-viz-manim-value-tracker-timeline-count",
    "data-viz-manim-value-tracker-uniform-key-summary",
    "data-viz-manim-value-tracker-uniform-pair-count",
    "data-viz-manim-value-tracker-uniform-value-summary",
    "data-viz-manim-value-tracker-value-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim ValueTracker hidden-mobject evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(valueTrackerPayloadSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-value-tracker",
    "data-viz-manim-value-tracker-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim ValueTracker payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ VALUE_TRACKER_SOURCE_CONTRACT, buildMathValueTrackerPayload, serializeMathValueTrackerPayload, valueTrackerPayloadDataAttributes \} from "\.\/manim\/mathValueTrackerPayload"/);
  assert.match(canvasSource, /const manimValueTrackerPayload = useMemo/);
  assert.match(canvasSource, /buildMathValueTrackerPayload\(manimRuntimeState\.trackers\)/);
  assert.match(canvasSource, /valueTrackerPayloadDataAttributes\(manimValueTrackerPayload\)/);
  assert.match(canvasSource, /serializeMathValueTrackerPayload\(manimValueTrackerPayload\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimValueTrackerJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Mobject state payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const mobjectStateSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectState.ts", "utf8");

  for (const attribute of [
    "data-viz-mobject-state-become-applied-count",
    "data-viz-mobject-state-become-node-count",
    "data-viz-mobject-state-become-point-count",
    "data-viz-mobject-state-become-ready-count",
    "data-viz-mobject-state-become-render-data-count",
    "data-viz-mobject-state-family-root-count",
    "data-viz-mobject-state-node-count",
    "data-viz-mobject-state-restorable-count",
    "data-viz-mobject-state-source-contract",
    "data-viz-mobject-state-restore-mismatch-count",
    "data-viz-mobject-state-restore-node-count",
    "data-viz-mobject-state-restore-point-count",
    "data-viz-mobject-state-restore-ready-count",
    "data-viz-mobject-state-restore-render-data-count",
    "data-viz-mobject-state-restore-source-summary",
    "data-viz-mobject-state-restore-uniform-node-count",
    "data-viz-mobject-state-signature",
    "data-viz-mobject-state-snapshot-count",
    "data-viz-mobject-state-summary",
    "data-viz-mobject-state-target-count",
    "data-viz-mobject-state-target-ids",
    "data-viz-mobject-state-target-node-count",
    "data-viz-mobject-state-target-point-count",
    "data-viz-mobject-state-target-render-data-count",
    "data-viz-mobject-state-targetable-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject save_state/generate_target evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(mobjectStateSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-state",
    "data-viz-mobject-state-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject state payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(mobjectStateSource, /MOBJECT_STATE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /import \{ buildMobjectStatePayload, MOBJECT_STATE_SOURCE_CONTRACT, mobjectStatePayloadDataAttributes, serializeMobjectStatePayload \} from "\.\/manim\/mathMobjectState"/);
  assert.match(
    canvasSource,
    /manimMobjectStateAttributes\?\.\["data-viz-mobject-state-source-contract"\]\s*\?\?\s*MOBJECT_STATE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /const manimMobjectStatePayload = useMemo/);
  assert.match(canvasSource, /buildMobjectStatePayload\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /mobjectStatePayloadDataAttributes\(manimMobjectStatePayload\)/);
  assert.match(canvasSource, /serializeMobjectStatePayload\(manimMobjectStatePayload\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectStateJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Mobject save_state restore bridge evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const restoreBridgeSource = fs.readFileSync(
    "components/visualizations/three/manim/mathMobjectStateRestoreBridge.ts",
    "utf8"
  );

  for (const attribute of [
    "data-viz-mobject-state-restore-bridge-after-family-ids",
    "data-viz-mobject-state-restore-bridge-after-object-ids",
    "data-viz-mobject-state-restore-bridge-before-family-ids",
    "data-viz-mobject-state-restore-bridge-before-object-ids",
    "data-viz-mobject-state-restore-bridge-current-signature",
    "data-viz-mobject-state-restore-bridge-family-ids",
    "data-viz-mobject-state-restore-bridge-family-preserved",
    "data-viz-mobject-state-restore-bridge-identity-preserved",
    "data-viz-mobject-state-restore-bridge-object-id",
    "data-viz-mobject-state-restore-bridge-restored",
    "data-viz-mobject-state-restore-bridge-restored-signature",
    "data-viz-mobject-state-restore-bridge-restore-mismatch-count",
    "data-viz-mobject-state-restore-bridge-saved-node-count",
    "data-viz-mobject-state-restore-bridge-saved-point-count",
    "data-viz-mobject-state-restore-bridge-saved-signature",
    "data-viz-mobject-state-restore-bridge-source-contract",
    "data-viz-mobject-state-restore-bridge-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject.save_state/restore bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(restoreBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-state-restore-bridge-plan",
    "data-viz-mobject-state-restore-bridge-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject.save_state/restore bridge payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(restoreBridgeSource, /MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT/);
  assert.match(restoreBridgeSource, /saveMobjectState/);
  assert.match(restoreBridgeSource, /restoreMobjectState/);
  assert.match(canvasSource, /import \{ buildMobjectStateRestoreBridgePlan, MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT, mobjectStateRestoreBridgeDataAttributes, serializeMobjectStateRestoreBridgePlan \} from "\.\/manim\/mathMobjectStateRestoreBridge"/);
  assert.match(
    canvasSource,
    /manimMobjectStateRestoreBridgeAttributes\?\.\["data-viz-mobject-state-restore-bridge-source-contract"\]\s*\?\?\s*MOBJECT_STATE_RESTORE_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /const manimMobjectStateRestoreBridgePlan = useMemo/);
  assert.match(canvasSource, /buildMobjectStateRestoreBridgePlan\(\{ graph: manimRuntimeState\.objectGraph \}\)/);
  assert.match(canvasSource, /mobjectStateRestoreBridgeDataAttributes\(manimMobjectStateRestoreBridgePlan\)/);
  assert.match(canvasSource, /serializeMobjectStateRestoreBridgePlan\(manimMobjectStateRestoreBridgePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectStateRestoreBridgeJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Mobject MoveToTarget bridge evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const moveToTargetSource = fs.readFileSync(
    "components/visualizations/three/manim/mathMobjectMoveToTargetBridge.ts",
    "utf8"
  );

  for (const attribute of [
    "data-viz-mobject-move-to-target-after-family-ids",
    "data-viz-mobject-move-to-target-after-signature",
    "data-viz-mobject-move-to-target-applied-node-count",
    "data-viz-mobject-move-to-target-become-applied",
    "data-viz-mobject-move-to-target-family-preserved",
    "data-viz-mobject-move-to-target-identity-preserved",
    "data-viz-mobject-move-to-target-object-id",
    "data-viz-mobject-move-to-target-render-state-changed",
    "data-viz-mobject-move-to-target-source-contract",
    "data-viz-mobject-move-to-target-source-family-ids",
    "data-viz-mobject-move-to-target-source-node-count",
    "data-viz-mobject-move-to-target-source-signature",
    "data-viz-mobject-move-to-target-summary",
    "data-viz-mobject-move-to-target-target-family-ids",
    "data-viz-mobject-move-to-target-target-generated",
    "data-viz-mobject-move-to-target-target-id",
    "data-viz-mobject-move-to-target-target-node-count",
    "data-viz-mobject-move-to-target-target-point-count",
    "data-viz-mobject-move-to-target-target-signature"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject.generate_target/MoveToTarget bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(moveToTargetSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-move-to-target-plan",
    "data-viz-mobject-move-to-target-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim MoveToTarget bridge payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(moveToTargetSource, /MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT/);
  assert.match(moveToTargetSource, /generateMobjectTarget/);
  assert.match(moveToTargetSource, /becomeMobjectState/);
  assert.match(canvasSource, /import \{ buildMobjectMoveToTargetBridgePlan, MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT, mobjectMoveToTargetBridgeDataAttributes, serializeMobjectMoveToTargetBridgePlan \} from "\.\/manim\/mathMobjectMoveToTargetBridge"/);
  assert.match(
    canvasSource,
    /manimMobjectMoveToTargetBridgeAttributes\?\.\["data-viz-mobject-move-to-target-source-contract"\]\s*\?\?\s*MOBJECT_MOVE_TO_TARGET_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /const manimMobjectMoveToTargetBridgePlan = useMemo/);
  assert.match(canvasSource, /buildMobjectMoveToTargetBridgePlan\(\{ graph: manimRuntimeState\.objectGraph \}\)/);
  assert.match(canvasSource, /mobjectMoveToTargetBridgeDataAttributes\(manimMobjectMoveToTargetBridgePlan\)/);
  assert.match(canvasSource, /serializeMobjectMoveToTargetBridgePlan\(manimMobjectMoveToTargetBridgePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectMoveToTargetBridgeJson \}\}/);
});

test("ThreeDLabCanvas exposes Manim Mobject dirty-state payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const dirtyStateModulePath = "components/visualizations/three/manim/mathMobjectDirtyStatePayload.ts";

  assert.ok(
    fs.existsSync(dirtyStateModulePath),
    "MAIS Manim should provide a pure Mobject dirty-state payload module"
  );
  const dirtyStateSource = fs.readFileSync(dirtyStateModulePath, "utf8");
  const invalidationSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectInvalidation.ts", "utf8");

  for (const attribute of [
    "data-viz-mobject-dirty-animation-owned-count",
    "data-viz-mobject-dirty-bounding-box-stale-count",
    "data-viz-mobject-dirty-cache-status",
    "data-viz-mobject-dirty-data-changed-count",
    "data-viz-mobject-dirty-family-cache-reusable",
    "data-viz-mobject-dirty-family-changed-count",
    "data-viz-mobject-dirty-invalidated-count",
    "data-viz-mobject-dirty-invalidated-ids",
    "data-viz-mobject-dirty-metadata-changed-count",
    "data-viz-mobject-dirty-recomputed-family-count",
    "data-viz-mobject-dirty-reused-family-count",
    "data-viz-mobject-dirty-signature",
    "data-viz-mobject-dirty-source-contract",
    "data-viz-mobject-dirty-summary",
    "data-viz-mobject-dirty-unknown-count",
    "data-viz-mobject-dirty-uniforms-changed-count",
    "data-viz-mobject-dirty-updater-active-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject dirty-state/cache evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(dirtyStateSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-mobject-dirty-state",
    "data-viz-mobject-dirty-state-json",
    "data-viz-mobject-invalidation-plan",
    "data-viz-mobject-invalidation-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Manim Mobject dirty-state payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMobjectDirtyStatePayload, mobjectDirtyStatePayloadDataAttributes, serializeMobjectDirtyStatePayload \} from "\.\/manim\/mathMobjectDirtyStatePayload"/);
  assert.match(canvasSource, /import \{ MOBJECT_INVALIDATION_SOURCE_CONTRACT, buildMobjectInvalidationPlan, serializeMobjectInvalidationPlan, summarizeMobjectInvalidation \} from "\.\/manim\/mathMobjectInvalidation"/);
  assert.match(invalidationSource, /serializeMobjectInvalidationPlan/);
  assert.match(canvasSource, /const manimMobjectDirtyStatePayload = useMemo/);
  assert.match(canvasSource, /const manimMobjectInvalidationPlan = useMemo/);
  assert.match(canvasSource, /buildMobjectDirtyStatePayload\(\{/);
  assert.match(canvasSource, /buildMobjectInvalidationPlan\(/);
  assert.match(canvasSource, /previousRuntimeState: previousManimRuntimeStateRef\.current\?\.sceneId === manimRuntimeState\.sceneId/);
  assert.match(canvasSource, /mobjectDirtyStatePayloadDataAttributes\(manimMobjectDirtyStatePayload\)/);
  assert.match(canvasSource, /serializeMobjectDirtyStatePayload\(manimMobjectDirtyStatePayload\)/);
  assert.match(canvasSource, /serializeMobjectInvalidationPlan\(manimMobjectInvalidationPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectDirtyStateJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimMobjectInvalidationJson \}\}/);
});

test("ThreeDLabCanvas subscribes the rendering camera to the MAIS Manim CameraFrame", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(canvasSource, /import \{ cameraFrameAdapterForThree \} from "\.\/manim\/mathCameraFrameAdapter"/);
  assert.match(canvasSource, /import type \{ CameraFrameState \} from "\.\/manim\/mathCameraFrame"/);
  assert.match(canvasSource, /manimCameraFrame\?: CameraFrameState \| null/);
  assert.match(canvasSource, /const adaptedFrame = cameraFrameAdapterForThree\(manimCameraFrame\)/);
  assert.match(canvasSource, /camera\.position\.set\(adaptedFrame\.position\.x,\s*adaptedFrame\.position\.y,\s*adaptedFrame\.position\.z\)/);
  assert.match(canvasSource, /controlsRef\.current\?\.target\.set\(adaptedFrame\.target\.x,\s*adaptedFrame\.target\.y,\s*adaptedFrame\.target\.z\)/);
  assert.match(canvasSource, /camera\.lookAt\(adaptedTarget\)/);
  assert.match(canvasSource, /resetCamera[\s\S]*updateCameraProjection\(camera, threeDCanvasCameraContract\.defaultCamera\.fov\)/);
  assert.match(canvasSource, /const reportOrbitCameraState = useCallback\(\(\) => \{/);
  assert.match(canvasSource, /if \(manimCameraMode === "guided" && manimCameraFrame\) return/);
  assert.match(canvasSource, /onChange=\{reportOrbitCameraState\}/);
  assert.match(canvasSource, /updateProjectionMatrix/);
  assert.match(canvasSource, /updateCameraProjection\(camera, adaptedFrame\.fov\)/);
  assert.doesNotMatch(canvasSource, /onCameraState\(adaptedFrame\.smokeState\)/);
  assert.match(canvasSource, /data-viz-manim-camera-frame-summary=/);
  assert.match(canvasSource, /<CameraContract[\s\S]*manimCameraFrame=\{manimCameraMode === "guided" \? manimRuntimeState\?\.cameraDirector\.frame \?\? null : null\}/);
});

test("ThreeDLabCanvas exposes Manim CameraFrame payload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const cameraFramePayloadPath = "components/visualizations/three/manim/mathCameraFramePayload.ts";

  assert.ok(
    fs.existsSync(cameraFramePayloadPath),
    "MAIS Manim should provide a pure CameraFrame payload module"
  );
  const payloadSource = fs.readFileSync(cameraFramePayloadPath, "utf8");

  for (const attribute of [
    "data-viz-manim-camera-frame-active-shot",
    "data-viz-manim-camera-frame-canonical-shot",
    "data-viz-manim-camera-frame-count",
    "data-viz-manim-camera-frame-current-id",
    "data-viz-manim-camera-frame-euler-summary",
    "data-viz-manim-camera-frame-finite-matrix-count",
    "data-viz-manim-camera-frame-fixed-overlay-count",
    "data-viz-manim-camera-frame-fov",
    "data-viz-manim-camera-frame-gamma",
    "data-viz-manim-camera-frame-inverse-view-matrix-determinant",
    "data-viz-manim-camera-frame-inverse-view-matrix-summary",
    "data-viz-manim-camera-frame-matrix-determinant-max-error",
    "data-viz-manim-camera-frame-matrix-determinant-ready",
    "data-viz-manim-camera-frame-matrix-determinant-summary",
    "data-viz-manim-camera-frame-matrix-count",
    "data-viz-manim-camera-frame-orientation-orthonormal-max-error",
    "data-viz-manim-camera-frame-orientation-orthonormal-ready",
    "data-viz-manim-camera-frame-phi",
    "data-viz-manim-camera-frame-position",
    "data-viz-manim-camera-frame-point-roundtrip-max-error",
    "data-viz-manim-camera-frame-point-roundtrip-ready",
    "data-viz-manim-camera-frame-point-roundtrip-source-contract",
    "data-viz-manim-camera-frame-point-roundtrip-summary",
    "data-viz-manim-camera-frame-progress",
    "data-viz-manim-camera-frame-reset-shot",
    "data-viz-manim-camera-frame-restorable-count",
    "data-viz-manim-camera-frame-signature",
    "data-viz-manim-camera-frame-source-contract",
    "data-viz-manim-camera-frame-summary",
    "data-viz-manim-camera-frame-target",
    "data-viz-manim-camera-frame-target-camera-point",
    "data-viz-manim-camera-frame-theta",
    "data-viz-manim-camera-frame-origin-camera-point",
    "data-viz-manim-camera-frame-uniform-center",
    "data-viz-manim-camera-frame-uniform-count",
    "data-viz-manim-camera-frame-uniform-fovy",
    "data-viz-manim-camera-frame-uniform-orientation-quaternion",
    "data-viz-manim-camera-frame-uniform-quaternion-max-error",
    "data-viz-manim-camera-frame-uniform-quaternion-ready",
    "data-viz-manim-camera-frame-uniform-shape",
    "data-viz-manim-camera-frame-uniform-summary",
    "data-viz-manim-camera-frame-view-inverse-max-error",
    "data-viz-manim-camera-frame-view-inverse-ready",
    "data-viz-manim-camera-frame-view-matrix-determinant",
    "data-viz-manim-camera-frame-view-matrix-summary",
    "data-viz-manim-camera-frame-operation-count",
    "data-viz-manim-camera-frame-operation-ids",
    "data-viz-manim-camera-frame-operation-summary",
    "data-viz-manim-camera-frame-shifted-center",
    "data-viz-manim-camera-frame-scaled-fovy",
    "data-viz-manim-camera-frame-rotated-theta",
    "data-viz-manim-camera-frame-restored-id"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose CameraFrame Mobject evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(payloadSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-camera-frame",
    "data-viz-manim-camera-frame-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured CameraFrame payloads to browser QA`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildCameraFramePayload, cameraFramePayloadDataAttributes, serializeCameraFramePayload \} from "\.\/manim\/mathCameraFramePayload"/);
  assert.match(canvasSource, /CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT, CAMERA_FRAME_SOURCE_CONTRACT/);
  assert.match(canvasSource, /const manimCameraFramePayload = useMemo/);
  assert.match(canvasSource, /buildCameraFramePayload\(\{/);
  assert.match(canvasSource, /cameraDirector: manimRuntimeState\.cameraDirector/);
  assert.match(canvasSource, /cameraFramePayloadDataAttributes\(manimCameraFramePayload\)/);
  assert.match(canvasSource, /data-viz-manim-camera-frame-source-contract=\{manimCameraFrameAttributes\?\.\["data-viz-manim-camera-frame-source-contract"\] \?\? CAMERA_FRAME_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /data-viz-manim-camera-frame-point-roundtrip-source-contract=\{\s*manimCameraFrameAttributes\?\.\["data-viz-manim-camera-frame-point-roundtrip-source-contract"\] \?\? CAMERA_FRAME_POINT_ROUNDTRIP_SOURCE_CONTRACT\s*\}/);
  assert.match(canvasSource, /serializeCameraFramePayload\(manimCameraFramePayload\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCameraFrameJson \}\}/);
});

test("ThreeDLabCanvas separates guided Manim camera playback from free orbit exploration", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.ok(
    threeDCanvasRequiredDataAttributes.includes("data-viz-manim-camera-mode" as (typeof threeDCanvasRequiredDataAttributes)[number]),
    "MAIS Manim camera mode should be part of the shared canvas smoke-test contract"
  );
  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-camera-mode-control" as (typeof threeDCanvasRequiredSelectors)[number]),
    "MAIS Manim camera mode control should be discoverable by browser smoke tests"
  );
  assert.match(canvasSource, /type ManimCameraMode = "guided" \| "explore"/);
  assert.match(canvasSource, /const \[manimCameraMode, setManimCameraMode\] = useState<ManimCameraMode>\("guided"\)/);
  assert.match(canvasSource, /data-viz-manim-camera-mode=\{manimScene \? manimCameraMode : "primitive"\}/);
  assert.match(canvasSource, /if \(manimCameraMode === "explore"\) return/);
  assert.match(canvasSource, /manimCameraFrame=\{manimCameraMode === "guided" \? manimRuntimeState\?\.cameraDirector\.frame \?\? null : null\}/);
  assert.match(canvasSource, /data-viz-manim-camera-mode-control/);
  assert.match(canvasSource, /data-viz-manim-camera-mode-option="guided"/);
  assert.match(canvasSource, /data-viz-manim-camera-mode-option="explore"/);
  assert.match(canvasSource, /onStart=\{onUserExplore\}/);
  assert.match(canvasSource, /setManimCameraMode\("guided"\)/);
});

test("ThreeDLabCanvas exposes named CameraFrame shot authoring controls", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const authoringSource = fs.readFileSync("components/visualizations/three/manim/mathCameraShotAuthoring.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-camera-shot-count",
    "data-viz-manim-camera-shot-ids",
    "data-viz-manim-camera-shot-missing-count",
    "data-viz-manim-camera-shot-missing-ids",
    "data-viz-manim-camera-shot-selected",
    "data-viz-manim-camera-shot-source-contract",
    "data-viz-manim-camera-shot-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose named CameraFrame shot authoring evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(authoringSource, new RegExp(attribute));
  }

  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-camera-shot-control" as (typeof threeDCanvasRequiredSelectors)[number]),
    "named CameraFrame shot control should be discoverable by browser smoke tests"
  );
  for (const selector of ["data-viz-manim-camera-shot-plan", "data-viz-manim-camera-shot-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured CameraShot authoring payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT, buildCameraShotCatalog, cameraShotCatalogDataAttributes, serializeCameraShotCatalog, summarizeCameraShotCatalog \} from "\.\/manim\/mathCameraShotAuthoring"/);
  assert.match(authoringSource, /serializeCameraShotCatalog/);
  assert.match(canvasSource, /const manimCameraShotCatalog = useMemo/);
  assert.match(canvasSource, /const manimCameraShotJson = useMemo/);
  assert.match(canvasSource, /serializeCameraShotCatalog\(manimCameraShotCatalog, runtimeDiagnostics\.cameraShot\)/);
  assert.match(canvasSource, /data-viz-manim-camera-shot-source-contract=\{manimScene \? manimCameraShotAttributes\["data-viz-manim-camera-shot-source-contract"\] : CAMERA_SHOT_AUTHORING_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /jumpToManimCameraShot/);
  assert.match(canvasSource, /data-viz-manim-camera-shot-control/);
  assert.match(canvasSource, /value=\{runtimeDiagnostics\.cameraShot\}/);
  assert.match(canvasSource, /setManimCameraMode\("guided"\)/);
  assert.match(canvasSource, /setManimPlaybackState\("paused"\)/);
});

test("ThreeDLabCanvas exposes CameraDirector timeline transition evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const directorSource = fs.readFileSync("components/visualizations/three/manim/mathCameraDirector.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-camera-director-active-shot",
    "data-viz-manim-camera-director-canonical-shot",
    "data-viz-manim-camera-director-reset-shot",
    "data-viz-manim-camera-director-timeline-shot",
    "data-viz-manim-camera-director-progress",
    "data-viz-manim-camera-director-transition-summary",
    "data-viz-manim-camera-director-updater-count",
    "data-viz-manim-camera-director-active-updater-count",
    "data-viz-manim-camera-director-active-updater-ids",
    "data-viz-manim-camera-director-ambient-rotation-degrees",
    "data-viz-manim-camera-director-shot-position",
    "data-viz-manim-camera-director-shot-target",
    "data-viz-manim-camera-director-shot-fov",
    "data-viz-manim-camera-director-source-contract",
    "data-viz-manim-camera-director-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose CameraDirector timeline evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(directorSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /runtimeDiagnostics\.manimCameraDirectorActiveShotId/);
  assert.match(evidenceSource, /buildCameraDirectorEvidence/);
  assert.match(evidenceSource, /cameraDirectorEvidenceDataAttributes/);
  assert.match(directorSource, /CAMERA_DIRECTOR_SOURCE_CONTRACT/);
  assert.match(directorSource, /serializeCameraDirectorEvidence/);
  assert.match(directorSource, /CameraFrame->CameraDirector\|timeline cameraTo/);
  assert.match(
    canvasSource,
    /import \{ CAMERA_DIRECTOR_SOURCE_CONTRACT, serializeCameraDirectorEvidence, type CameraDirectorEvidence \} from "\.\/manim\/mathCameraDirector"/
  );
  assert.match(canvasSource, /useMemo<CameraDirectorEvidence \| null>/);
  assert.match(canvasSource, /serializeCameraDirectorEvidence\(manimCameraDirectorEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCameraDirectorJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-camera-director-plan",
    "data-viz-manim-camera-director-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose CameraDirector JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /manimCameraDirectorSourceContract:\s*CAMERA_DIRECTOR_SOURCE_CONTRACT/);
  assert.doesNotMatch(canvasSource, /"CameraFrame->CameraDirector\|timeline cameraTo"/);
});

test("ThreeDLabCanvas exposes MAIS Manim parameter panel authoring controls", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const panelSource = fs.readFileSync("components/visualizations/three/manim/mathParameterPanel.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-parameter-panel-count",
    "data-viz-manim-parameter-panel-control-count",
    "data-viz-manim-parameter-panel-derived-count",
    "data-viz-manim-parameter-panel-selected",
    "data-viz-manim-parameter-panel-ids",
    "data-viz-manim-parameter-panel-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim parameter panel evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(panelSource, new RegExp(attribute));
  }

  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-parameter-panel-control" as (typeof threeDCanvasRequiredSelectors)[number]),
    "MAIS Manim parameter panel control should be discoverable by browser smoke tests"
  );
  for (const selector of ["data-viz-manim-parameter-panel-plan", "data-viz-manim-parameter-panel-json"]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured MAIS Manim parameter-panel payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildParameterPanelCatalog, parameterPanelDataAttributes, serializeParameterPanelCatalog, summarizeParameterPanelCatalog \} from "\.\/manim\/mathParameterPanel"/);
  assert.match(panelSource, /serializeParameterPanelCatalog/);
  assert.match(canvasSource, /const \[manimSelectedParameterId, setManimSelectedParameterId\] = useState\("value"\)/);
  assert.match(canvasSource, /const manimParameterPanelCatalog = useMemo/);
  assert.match(canvasSource, /const manimParameterPanelJson = useMemo/);
  assert.match(canvasSource, /serializeParameterPanelCatalog\(manimParameterPanelCatalog, activeManimParameterId\)/);
  assert.match(canvasSource, /data-viz-manim-parameter-panel-control/);
  assert.match(canvasSource, /data-viz-manim-parameter-panel-value/);
  assert.match(canvasSource, /value=\{activeManimParameterId\}/);
  assert.match(canvasSource, /setManimSelectedParameterId/);
});

test("ThreeDLabCanvas exposes a MAIS Manim scene-spec selector for authoring", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const selectorSource = fs.readFileSync("components/visualizations/three/manim/mathSceneSelectorCatalog.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-scene-selector-count",
    "data-viz-manim-scene-selector-approved-count",
    "data-viz-manim-scene-selector-selected-family-id",
    "data-viz-manim-scene-selector-selected-scene-id",
    "data-viz-manim-scene-selector-family-ids",
    "data-viz-manim-scene-selector-scene-ids",
    "data-viz-manim-scene-selector-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim scene selector evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(selectorSource, new RegExp(attribute));
  }

  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-scene-selector-control" as (typeof threeDCanvasRequiredSelectors)[number]),
    "MAIS Manim scene selector should be discoverable by browser smoke tests"
  );
  assert.match(
    canvasSource,
    /import \{[\s\S]*buildMathSceneSelectorCatalogEntry[\s\S]*mathSceneSelectorDataAttributes[\s\S]*summarizeMathSceneSelectorCatalog[\s\S]*\} from "\.\/manim\/mathSceneSelectorCatalog"/
  );
  assert.match(canvasSource, /const \[manimSelectedSceneFamilyId, setManimSelectedSceneFamilyId\] = useState<ThreeDFamilyId>\(state\.familyId\)/);
  assert.match(canvasSource, /const selectedManimSceneState = useMemo/);
  assert.match(canvasSource, /familyId: manimSelectedSceneFamilyId/);
  assert.match(canvasSource, /const \[manimSceneSelectorCatalog, setManimSceneSelectorCatalog\] = useState<MathSceneSelectorCatalogEntry\[]>\(\[]\)/);
  assert.match(canvasSource, /const familyQueue = \[\.\.\.maisManimFamilyIds\]/);
  assert.match(canvasSource, /buildMathSceneSelectorCatalogEntry\(\{ accent, familyId, state: catalogStateRef\.current \}\)/);
  assert.match(canvasSource, /scheduleSlice\(buildNextFamily\)/);
  assert.match(canvasSource, /buildMathSceneSpecForThreeDFamily\(\{ accent, state: selectedManimSceneState \}\)/);
  assert.match(canvasSource, /data-viz-manim-scene-selector-control/);
  assert.match(canvasSource, /value=\{manimSelectedSceneFamilyId\}/);
  assert.match(canvasSource, /setManimSelectedSceneFamilyId\(event\.currentTarget\.value as ThreeDFamilyId\)/);
});

test("ThreeDLabCanvas exposes browser timeline scrubber and checkpoint controls for MAIS Manim scenes", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  for (const attribute of [
    "data-viz-manim-playback-state",
    "data-viz-manim-scrub-progress",
    "data-viz-manim-total-duration",
    "data-viz-manim-checkpoint-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-playback-control",
    "data-viz-manim-timeline-scrubber",
    "data-viz-manim-checkpoint-control"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should be discoverable by browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildScenePlaybackPlan[\s\S]*\} from "\.\/manim\/mathScenePlayback"/);
  assert.match(canvasSource, /import \{[\s\S]*createCheckpointStore[\s\S]*listCheckpointKeys[\s\S]*restoreCheckpoint[\s\S]*saveCheckpoint[\s\S]*type SceneCheckpointStore[\s\S]*\} from "\.\/manim\/mathSceneCheckpoint"/);
  assert.match(canvasSource, /type ManimPlaybackState = "playing" \| "paused" \| "scrubbing" \| "checkpoint"/);
  assert.match(canvasSource, /const \[manimPlaybackState, setManimPlaybackState\] = useState<ManimPlaybackState>\("paused"\)/);
  assert.match(canvasSource, /buildScenePlaybackPlan\(manimScene\.timeline/);
  assert.match(canvasSource, /const \[manimCheckpointStore, setManimCheckpointStore\] = useState<SceneCheckpointStore<ManimCheckpointState>>/);
  assert.match(canvasSource, /saveCheckpoint\(currentStore/);
  assert.match(canvasSource, /restoreCheckpoint\(manimCheckpointStore/);
  assert.match(canvasSource, /listCheckpointKeys\(manimCheckpointStore\)/);
  assert.match(canvasSource, /playing=\{manimPlaybackState === "playing"\}/);
  assert.match(canvasSource, /setManimElapsedSeconds\(nextElapsedSeconds\)/);
  assert.match(canvasSource, /data-viz-manim-timeline-scrubber[\s\S]*role="slider"/);
  assert.doesNotMatch(canvasSource, /<input[\s\S]*type="range"[\s\S]*data-viz-manim-timeline-scrubber/);
});

test("ThreeDLabCanvas docks MAIS Manim authoring controls outside the mobile scene frame", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.ok(
    threeDCanvasRequiredDataAttributes.includes("data-viz-manim-mobile-layout" as (typeof threeDCanvasRequiredDataAttributes)[number]),
    "MAIS Manim mobile layout should be part of the shared canvas smoke-test contract"
  );

  for (const selector of [
    "data-viz-manim-scene-frame",
    "data-viz-manim-control-dock",
    "data-viz-manim-control-row"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should be discoverable by browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /data-viz-manim-mobile-layout=\{manimScene \? "docked" : "primitive"\}/);
  assert.match(canvasSource, /data-viz-manim-scene-frame[\s\S]{0,240}className="relative aspect-\[16\/9\]/);

  for (const row of ["camera", "capture", "playback"]) {
    assert.match(canvasSource, new RegExp(`data-viz-manim-control-row="${row}"`));
  }

  assert.match(
    canvasSource,
    /data-viz-manim-control-row="camera"[\s\S]{0,1800}data-viz-three-reset-camera/
  );
  assert.doesNotMatch(
    canvasSource,
    /data-viz-manim-camera-mode-control[\s\S]{0,220}className="absolute bottom-3 left-3/
  );
  assert.doesNotMatch(
    canvasSource,
    /data-viz-manim-capture-control[\s\S]{0,220}className="absolute right-3 top-3/
  );
  assert.doesNotMatch(
    canvasSource,
    /data-viz-manim-playback-control[\s\S]{0,220}className="absolute bottom-14 left-3 right-3/
  );
});

test("ThreeDLabCanvas keeps authoring tools out of the direct learner presentation", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const typeSource = fs.readFileSync("components/visualizations/three/threeDSceneTypes.ts", "utf8");

  assert.match(typeSource, /export type ThreeDPresentation = "authoring" \| "learner";/);
  assert.match(typeSource, /presentation\?: ThreeDPresentation;/);
  assert.match(canvasSource, /presentation = "authoring"/);
  assert.match(canvasSource, /const showAuthoringControls = presentation === "authoring";/);
  assert.match(
    canvasSource,
    /const presentationResetPlaybackState: ManimPlaybackState = presentation === "learner" \? "paused" : "playing";/
  );
  assert.equal(
    canvasSource.match(/setManimPlaybackState\(presentationResetPlaybackState\)/g)?.length,
    2,
    "both learner reset and scene-identity reset must remain paused while authoring retains autoplay"
  );
  const resetStart = canvasSource.indexOf("const resetCameraAndTimeline = useCallback");
  const resetEnd = canvasSource.indexOf("const switchManimCameraMode = useCallback", resetStart);
  const sceneIdentityResetStart = canvasSource.indexOf(
    'setManimHistoryStore(createSceneHistoryStore(initialManimCheckpointState(manimHistorySceneId), { label: "initial" }))'
  );
  const sceneIdentityResetEnd = canvasSource.indexOf("useEffect(() => {", sceneIdentityResetStart + 1);
  const runFromBeatStart = canvasSource.indexOf("const runManimFromBeat = useCallback");
  const runFromBeatEnd = canvasSource.indexOf("const showManimFinalFrame = useCallback", runFromBeatStart);
  assert.ok(resetStart >= 0 && resetEnd > resetStart, "learner reset callback must remain inspectable");
  assert.ok(
    sceneIdentityResetStart >= 0 && sceneIdentityResetEnd > sceneIdentityResetStart,
    "scene-identity reset effect must remain inspectable"
  );
  assert.ok(runFromBeatStart >= 0 && runFromBeatEnd > runFromBeatStart, "run-from-beat callback must remain inspectable");
  assert.match(
    canvasSource.slice(resetStart, resetEnd),
    /setManimPlaybackState\(presentationResetPlaybackState\)/
  );
  assert.match(
    canvasSource.slice(sceneIdentityResetStart, sceneIdentityResetEnd),
    /setManimPlaybackState\(presentationResetPlaybackState\)/
  );
  assert.match(canvasSource.slice(runFromBeatStart, runFromBeatEnd), /setManimPlaybackState\("playing"\)/);
  assert.doesNotMatch(
    canvasSource.slice(runFromBeatStart, runFromBeatEnd),
    /setManimPlaybackState\(presentationResetPlaybackState\)/
  );
  assert.match(
    canvasSource,
    /\}, \[manimHistorySceneId, presentationResetPlaybackState, state\.familyId\]\);/
  );
  assert.match(
    canvasSource,
    /\}, \[manimHistorySceneId, presentationResetPlaybackState, runtime, state\.familyId\]\);/
  );
  assert.match(canvasSource, /data-viz-manim-presentation=\{presentation\}/);
  assert.match(canvasSource, /data-viz-manim-authoring-controls-visible=\{String\(showAuthoringControls\)\}/);

  for (const selector of [
    "data-viz-manim-camera-mode-control",
    "data-viz-manim-control-row=\"capture\"",
    "data-viz-manim-parameter-panel-control",
    "data-viz-manim-checkpoint-control",
    "data-viz-manim-history-control",
    "data-viz-manim-authoring-control"
  ]) {
    assert.match(
      canvasSource,
      new RegExp(`showAuthoringControls \\? \\(\\s*[\\s\\S]{0,160}<[^>]+${selector}`),
      `${selector} must be rendered only for the authoring presentation`
    );
  }

  assert.match(
    canvasSource,
    /data-viz-manim-control-row="playback"[\s\S]*data-viz-manim-playback-toggle[\s\S]*data-viz-manim-timeline-scrubber/
  );
});

test("ThreeDLabCanvas exposes safe checkpoint-paste authoring evidence for MAIS Manim scenes", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const pastePlanSource = fs.readFileSync("components/visualizations/three/manim/mathCheckpointPastePlan.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-checkpoint-paste-key",
    "data-viz-manim-checkpoint-paste-line-count",
    "data-viz-manim-checkpoint-paste-operation-count",
    "data-viz-manim-checkpoint-paste-invalidates-count",
    "data-viz-manim-checkpoint-paste-invalidated-keys",
    "data-viz-manim-checkpoint-paste-retained-keys-after-restore",
    "data-viz-manim-checkpoint-paste-restore-action",
    "data-viz-manim-checkpoint-paste-elapsed-seconds",
    "data-viz-manim-checkpoint-paste-progress-bar",
    "data-viz-manim-checkpoint-paste-ready",
    "data-viz-manim-checkpoint-paste-record",
    "data-viz-manim-checkpoint-paste-replay-policy",
    "data-viz-manim-checkpoint-paste-restores-existing",
    "data-viz-manim-checkpoint-paste-restore-mode",
    "data-viz-manim-checkpoint-paste-skip",
    "data-viz-manim-checkpoint-paste-source-contract",
    "data-viz-manim-checkpoint-paste-source-label",
    "data-viz-manim-checkpoint-paste-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose safe checkpoint-paste authoring evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    if (attribute === "data-viz-manim-checkpoint-paste-ready") {
      const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
      assert.match(evidenceSource, new RegExp(attribute));
    } else {
      assert.match(pastePlanSource, new RegExp(attribute));
    }
  }

  for (const selector of [
    "data-viz-manim-checkpoint-paste-control",
    "data-viz-manim-checkpoint-paste-input",
    "data-viz-manim-checkpoint-paste-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should be discoverable by browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /from "\.\/manim\/mathCheckpointPastePlan"/);
  for (const symbol of [
    "buildMathCheckpointPastePlan",
    "checkpointPastePlanDataAttributes",
    "SCENE_CHECKPOINT_PASTE_REPLAY_POLICY",
    "SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT",
    "serializeMathCheckpointPastePlan"
  ]) {
    assert.match(canvasSource, new RegExp(symbol));
  }
  assert.match(canvasSource, /const \[manimCheckpointPasteText, setManimCheckpointPasteText\] = useState\(""\)/);
  assert.match(canvasSource, /const manimCheckpointPastePlan = useMemo/);
  assert.match(canvasSource, /checkpointPastePlanDataAttributes\(manimCheckpointPastePlan\)/);
  assert.match(canvasSource, /serializeMathCheckpointPastePlan\(manimCheckpointPastePlan\)/);
  assert.match(canvasSource, /data-viz-manim-checkpoint-paste-json/);
  assert.match(canvasSource, /function applyManimCheckpointPastePlan/);
  assert.match(canvasSource, /restoreCheckpoint\(manimCheckpointStore, manimCheckpointPastePlan\.checkpointKey, \{ invalidateLater: true \}\)/);
  assert.match(canvasSource, /saveCheckpoint\(currentStore, manimCheckpointPastePlan\.checkpointKey/);
  assert.match(pastePlanSource, /SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT/);
  assert.match(pastePlanSource, /SCENE_CHECKPOINT_PASTE_REPLAY_POLICY/);
  assert.match(pastePlanSource, /serializeMathCheckpointPastePlan/);
  assert.doesNotMatch(canvasSource, /eval\(|new Function/);
});

test("ThreeDLabCanvas exposes Manim CheckpointManager store evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const checkpointSource = fs.readFileSync("components/visualizations/three/manim/mathSceneCheckpoint.ts", "utf8");
  const checkpointAttributes = [
    "data-viz-manim-checkpoint-store-can-restore",
    "data-viz-manim-checkpoint-store-count",
    "data-viz-manim-checkpoint-store-invalidated-count",
    "data-viz-manim-checkpoint-store-invalidated-keys",
    "data-viz-manim-checkpoint-store-invalidate-later",
    "data-viz-manim-checkpoint-store-keys",
    "data-viz-manim-checkpoint-store-latest-key",
    "data-viz-manim-checkpoint-store-latest-state-signature",
    "data-viz-manim-checkpoint-store-next-order",
    "data-viz-manim-checkpoint-store-requested-key",
    "data-viz-manim-checkpoint-store-retained-keys-after-restore",
    "data-viz-manim-checkpoint-store-restore-action",
    "data-viz-manim-checkpoint-store-restored-order",
    "data-viz-manim-checkpoint-store-restored-state-signature",
    "data-viz-manim-checkpoint-store-source-contract",
    "data-viz-manim-checkpoint-store-state-signature-summary",
    "data-viz-manim-checkpoint-store-summary"
  ];

  for (const attribute of checkpointAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim CheckpointManager store evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(checkpointSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-checkpoint-store",
    "data-viz-manim-checkpoint-store-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim CheckpointManager store JSON to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /buildSceneCheckpointStoreManifest\(manimCheckpointStore/);
  assert.match(canvasSource, /sceneCheckpointStoreDataAttributes\(manimCheckpointStoreManifest\)/);
  assert.match(canvasSource, /serializeSceneCheckpointStoreManifest\(manimCheckpointStoreManifest\)/);
  assert.match(canvasSource, /data-viz-manim-checkpoint-store-json/);
  assert.match(checkpointSource, /SCENE_CHECKPOINT_STORE_SOURCE_CONTRACT/);
  assert.match(checkpointSource, /serializeSceneCheckpointStoreManifest/);
  assert.match(evidenceSource, /buildSceneCheckpointStoreManifest/);
  assert.match(evidenceSource, /manimCheckpointStoreSourceContract/);
  assert.match(evidenceSource, /sceneCheckpointStoreDataAttributes/);
  assert.match(evidenceSource, /\.\.\.checkpointStoreAttributes/);
});

test("ThreeDLabCanvas exposes Manim Mobject.animate builder evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const animationBuilderSource = fs.readFileSync("components/visualizations/three/manim/mathAnimationBuilder.ts", "utf8");
  const animateBuilderAttributes = [
    "data-viz-manim-animate-builder-changed-field-count",
    "data-viz-manim-animate-builder-changed-node-count",
    "data-viz-manim-animate-builder-changed-node-ids",
    "data-viz-manim-animate-builder-first-plan-id",
    "data-viz-manim-animate-builder-lagged-count",
    "data-viz-manim-animate-builder-object-ids",
    "data-viz-manim-animate-builder-operation-count",
    "data-viz-manim-animate-builder-operation-types",
    "data-viz-manim-animate-builder-path-count",
    "data-viz-manim-animate-builder-plan-count",
    "data-viz-manim-animate-builder-source-contract",
    "data-viz-manim-animate-builder-summary",
    "data-viz-manim-animate-builder-target-ids",
    "data-viz-manim-animate-builder-total-duration"
  ];

  for (const attribute of animateBuilderAttributes) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Mobject.animate builder evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(animationBuilderSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-animate-builder-plan",
    "data-viz-manim-animate-builder-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Mobject.animate builder JSON evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /buildMathAnimateBuilderCatalog\(manimAnimationPlans\)/);
  assert.match(canvasSource, /serializeMathAnimateBuilderCatalog\(manimAnimateBuilderCatalog\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAnimateBuilderJson \?\? "" \}\}/);
  assert.match(evidenceSource, /buildMathAnimateBuilderCatalog/);
  assert.match(animationBuilderSource, /ANIMATION_BUILDER_SOURCE_CONTRACT/);
  assert.match(animationBuilderSource, /serializeMathAnimateBuilderCatalog/);
  assert.match(evidenceSource, /mathAnimateBuilderCatalogDataAttributes/);
  assert.match(evidenceSource, /\.\.\.animateBuilderAttributes/);
});

test("ThreeDLabCanvas exposes Scene.play lifecycle evidence for MAIS Manim playback", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const playbackSource = fs.readFileSync("components/visualizations/three/manim/mathScenePlayback.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-playback-active-play-index",
    "data-viz-manim-playback-completed-play-count",
    "data-viz-manim-playback-event-count",
    "data-viz-manim-playback-active-event-summary",
    "data-viz-manim-playback-lifecycle-phase",
    "data-viz-manim-playback-lifecycle-summary",
    "data-viz-manim-playback-pending-play-count",
    "data-viz-manim-playback-source-contract",
    "data-viz-manim-playback-updates-during-active-play"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /import \{ buildScenePlaybackPlan[\s\S]*serializeScenePlaybackPlan[\s\S]*SCENE_PLAYBACK_SOURCE_CONTRACT[\s\S]*\} from "\.\/manim\/mathScenePlayback"/);
  assert.match(canvasSource, /data-viz-manim-playback-source-contract=\{manimEvidenceAttributes\?\.\["data-viz-manim-playback-source-contract"\] \?\? SCENE_PLAYBACK_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /const manimPlaybackPlanJson = useMemo/);
  assert.match(canvasSource, /serializeScenePlaybackPlan\(manimPlaybackPlan\)/);
  assert.match(canvasSource, /data-viz-manim-playback-plan/);
  assert.match(canvasSource, /data-viz-manim-playback-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimPlaybackPlanJson \}\}/);
  assert.match(playbackSource, /SCENE_PLAYBACK_SOURCE_CONTRACT/);
  assert.match(playbackSource, /serializeScenePlaybackPlan/);
  assert.match(playbackSource, /sampleScenePlaybackLifecycle/);
  assert.match(playbackSource, /buildScenePlaybackEventStream/);
  assert.match(evidenceSource, /manimPlaybackSourceContract/);
  assert.match(evidenceSource, /sampleScenePlaybackLifecycle\(scene\.timeline,\s*runtimeState\.timeline\.elapsedSeconds/);
  assert.match(evidenceSource, /summarizeScenePlaybackEventStream/);
  assert.match(evidenceSource, /manimPlaybackLifecyclePhase/);

  for (const selector of [
    "data-viz-manim-playback-plan",
    "data-viz-manim-playback-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured Scene.play playback-plan evidence`
    );
  }
});

test("ThreeDLabCanvas exposes Manim Scene.play compilation evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const playCompilationModulePath = "components/visualizations/three/manim/mathScenePlayCompilation.ts";

  assert.ok(
    fs.existsSync(playCompilationModulePath),
    "MAIS Manim should provide a pure Scene.play compilation contract module"
  );
  const playCompilationSource = fs.readFileSync(playCompilationModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-play-compilation-animation-count",
    "data-viz-manim-play-compilation-builder-count",
    "data-viz-manim-play-compilation-call-order",
    "data-viz-manim-play-compilation-call-order-ready",
    "data-viz-manim-play-compilation-error-summary",
    "data-viz-manim-play-compilation-invalid-count",
    "data-viz-manim-play-compilation-pipeline",
    "data-viz-manim-play-compilation-prepare-policy",
    "data-viz-manim-play-compilation-prepared-ids",
    "data-viz-manim-play-compilation-proto-count",
    "data-viz-manim-play-compilation-run-time",
    "data-viz-manim-play-compilation-source-contract",
    "data-viz-manim-play-compilation-summary",
    "data-viz-manim-play-compilation-update-rate-count",
    "data-viz-manim-play-compilation-warning-empty",
    "data-viz-manim-play-compilation-warning-message"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.play compilation evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(playCompilationSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-play-compilation",
    "data-viz-manim-play-compilation-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.play compilation payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildScenePlayCompilationPlan/);
  assert.match(evidenceSource, /scenePlayCompilationDataAttributes/);
  assert.match(evidenceSource, /manimPlayCompilationPreparePolicy/);
  assert.match(evidenceSource, /manimPlayCompilationSourceContract/);
  assert.match(evidenceSource, /\.\.\.playCompilationAttributes/);
  assert.match(playCompilationSource, /SCENE_PLAY_COMPILATION_PREPARE_POLICY/);
  assert.match(playCompilationSource, /SCENE_PLAY_COMPILATION_SOURCE_CONTRACT/);
  assert.match(playCompilationSource, /serializeScenePlayCompilationPlan/);
  assert.match(canvasSource, /buildScenePlayCompilationPlan\(\{/);
  assert.match(canvasSource, /serializeScenePlayCompilationPlan\(manimPlayCompilationPlan\)/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-json/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-call-order=/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-call-order-ready=/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-pipeline=/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-prepare-policy=/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-play-compilation-summary=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-play-compilation-prepared-ids"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.begin_animations evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const beginAnimationsModulePath = "components/visualizations/three/manim/mathSceneBeginAnimations.ts";

  assert.ok(
    fs.existsSync(beginAnimationsModulePath),
    "MAIS Manim should provide a pure Scene.begin_animations contract module"
  );
  const beginAnimationsSource = fs.readFileSync(beginAnimationsModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-begin-animations-added-count",
    "data-viz-manim-begin-animations-added-ids",
    "data-viz-manim-begin-animations-begin-count",
    "data-viz-manim-begin-animations-count",
    "data-viz-manim-begin-animations-lifecycle-summary",
    "data-viz-manim-begin-animations-family-count-after",
    "data-viz-manim-begin-animations-family-count-before",
    "data-viz-manim-begin-animations-interpolate-zero-count",
    "data-viz-manim-begin-animations-run-time",
    "data-viz-manim-begin-animations-scene-add-count",
    "data-viz-manim-begin-animations-set-animating-status-count",
    "data-viz-manim-begin-animations-source-contract",
    "data-viz-manim-begin-animations-start-state-policy",
    "data-viz-manim-begin-animations-starting-copy-count",
    "data-viz-manim-begin-animations-starting-copy-ids",
    "data-viz-manim-begin-animations-summary",
    "data-viz-manim-begin-animations-suspend-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.begin_animations evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(beginAnimationsSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-begin-animations",
    "data-viz-manim-begin-animations-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.begin_animations payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneBeginAnimationsPlan/);
  assert.match(evidenceSource, /sceneBeginAnimationsDataAttributes/);
  assert.match(evidenceSource, /manimBeginAnimationsSourceContract/);
  assert.match(evidenceSource, /manimBeginAnimationsStartStatePolicy/);
  assert.match(evidenceSource, /\.\.\.beginAnimationsAttributes/);
  assert.match(beginAnimationsSource, /SCENE_BEGIN_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(beginAnimationsSource, /SCENE_BEGIN_ANIMATIONS_START_STATE_POLICY/);
  assert.match(beginAnimationsSource, /serializeSceneBeginAnimationsPlan/);
  assert.match(canvasSource, /buildSceneBeginAnimationsPlan\(\{/);
  assert.match(canvasSource, /serializeSceneBeginAnimationsPlan\(manimBeginAnimationsPlan\)/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-json/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-start-state-policy=/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-summary=/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-scene-add-count=/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-set-animating-status-count=/);
  assert.match(canvasSource, /data-viz-manim-begin-animations-starting-copy-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-begin-animations-added-ids"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.finish_animations evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const finishAnimationsModulePath = "components/visualizations/three/manim/mathSceneFinishAnimations.ts";

  assert.ok(
    fs.existsSync(finishAnimationsModulePath),
    "MAIS Manim should provide a pure Scene.finish_animations contract module"
  );
  const finishAnimationsSource = fs.readFileSync(finishAnimationsModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-finish-animations-cleanup-count",
    "data-viz-manim-finish-animations-cleanup-policy",
    "data-viz-manim-finish-animations-count",
    "data-viz-manim-finish-animations-final-alpha-summary",
    "data-viz-manim-finish-animations-finish-count",
    "data-viz-manim-finish-animations-lifecycle-summary",
    "data-viz-manim-finish-animations-removed-count",
    "data-viz-manim-finish-animations-removed-ids",
    "data-viz-manim-finish-animations-resume-count",
    "data-viz-manim-finish-animations-resume-dt-summary",
    "data-viz-manim-finish-animations-resume-ids",
    "data-viz-manim-finish-animations-resume-policy",
    "data-viz-manim-finish-animations-run-time",
    "data-viz-manim-finish-animations-scene-update-dt",
    "data-viz-manim-finish-animations-set-animating-status-false-count",
    "data-viz-manim-finish-animations-skip",
    "data-viz-manim-finish-animations-source-contract",
    "data-viz-manim-finish-animations-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.finish_animations evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(finishAnimationsSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-finish-animations",
    "data-viz-manim-finish-animations-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.finish_animations payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneFinishAnimationsPlan/);
  assert.match(evidenceSource, /sceneFinishAnimationsDataAttributes/);
  assert.match(evidenceSource, /manimFinishAnimationsCleanupPolicy/);
  assert.match(evidenceSource, /manimFinishAnimationsSourceContract/);
  assert.match(evidenceSource, /SCENE_FINISH_ANIMATIONS_RESUME_POLICY/);
  assert.match(evidenceSource, /\.\.\.finishAnimationsAttributes/);
  assert.match(finishAnimationsSource, /SCENE_FINISH_ANIMATIONS_CLEANUP_POLICY/);
  assert.match(finishAnimationsSource, /SCENE_FINISH_ANIMATIONS_RESUME_POLICY/);
  assert.match(finishAnimationsSource, /SCENE_FINISH_ANIMATIONS_SOURCE_CONTRACT/);
  assert.match(finishAnimationsSource, /serializeSceneFinishAnimationsPlan/);
  assert.match(canvasSource, /buildSceneFinishAnimationsPlan\(\{/);
  assert.match(canvasSource, /serializeSceneFinishAnimationsPlan\(manimFinishAnimationsPlan\)/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-json/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-cleanup-policy=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-final-alpha-summary=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-lifecycle-summary=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-summary=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-set-animating-status-false-count=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-scene-update-dt=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-resume-count=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-resume-dt-summary=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-resume-ids=/);
  assert.match(canvasSource, /data-viz-manim-finish-animations-resume-policy=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-finish-animations-removed-ids"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.pre_play control evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const prePlayModulePath = "components/visualizations/three/manim/mathScenePrePlayControl.ts";

  assert.ok(
    fs.existsSync(prePlayModulePath),
    "MAIS Manim should provide a pure Scene.pre_play control contract module"
  );
  const prePlaySource = fs.readFileSync(prePlayModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-pre-play-begin-animation-count",
    "data-viz-manim-pre-play-constructor-forced-skip",
    "data-viz-manim-pre-play-end-scene-play",
    "data-viz-manim-pre-play-final-skip",
    "data-viz-manim-pre-play-has-window",
    "data-viz-manim-pre-play-presenter-hold-count",
    "data-viz-manim-pre-play-processed-play-count",
    "data-viz-manim-pre-play-skip-gate-policy",
    "data-viz-manim-pre-play-source-contract",
    "data-viz-manim-pre-play-start-gate-count",
    "data-viz-manim-pre-play-summary",
    "data-viz-manim-pre-play-truncated",
    "data-viz-manim-pre-play-window-clock-reset-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.pre_play control evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(prePlaySource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-pre-play",
    "data-viz-manim-pre-play-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.pre_play control payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildScenePrePlayControlPlan/);
  assert.match(evidenceSource, /scenePrePlayControlDataAttributes/);
  assert.match(evidenceSource, /manimPrePlaySkipGatePolicy/);
  assert.match(evidenceSource, /manimPrePlaySourceContract/);
  assert.match(evidenceSource, /\.\.\.prePlayControlAttributes/);
  assert.match(prePlaySource, /SCENE_PRE_PLAY_SKIP_GATE_POLICY/);
  assert.match(prePlaySource, /SCENE_PRE_PLAY_SOURCE_CONTRACT/);
  assert.match(prePlaySource, /serializeScenePrePlayControlPlan/);
  assert.match(canvasSource, /buildScenePrePlayControlPlan\(\{/);
  assert.match(canvasSource, /serializeScenePrePlayControlPlan\(manimPrePlayControlPlan\)/);
  assert.match(canvasSource, /data-viz-manim-pre-play-json/);
  assert.match(canvasSource, /data-viz-manim-pre-play-skip-gate-policy=/);
  assert.match(canvasSource, /data-viz-manim-pre-play-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-pre-play-summary=/);
  assert.match(canvasSource, /data-viz-manim-pre-play-start-gate-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-pre-play-end-scene-play"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.post_play preview evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const postPlayModulePath = "components/visualizations/three/manim/mathScenePostPlayPreview.ts";

  assert.ok(
    fs.existsSync(postPlayModulePath),
    "MAIS Manim should provide a pure Scene.post_play preview contract module"
  );
  const postPlaySource = fs.readFileSync(postPlayModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-post-play-preview-end-animation-count",
    "data-viz-manim-post-play-preview-forced-count",
    "data-viz-manim-post-play-preview-has-window",
    "data-viz-manim-post-play-preview-num-plays-ready",
    "data-viz-manim-post-play-preview-num-plays-sequence",
    "data-viz-manim-post-play-preview-play-count",
    "data-viz-manim-post-play-preview-policy",
    "data-viz-manim-post-play-preview-preview",
    "data-viz-manim-post-play-preview-skip",
    "data-viz-manim-post-play-preview-source-contract",
    "data-viz-manim-post-play-preview-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.post_play preview evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(postPlaySource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-post-play-preview",
    "data-viz-manim-post-play-preview-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.post_play preview payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildScenePostPlayPreviewPlan/);
  assert.match(evidenceSource, /scenePostPlayPreviewDataAttributes/);
  assert.match(evidenceSource, /manimPostPlayPreviewPolicy/);
  assert.match(evidenceSource, /manimPostPlayPreviewSourceContract/);
  assert.match(evidenceSource, /\.\.\.postPlayPreviewAttributes/);
  assert.match(postPlaySource, /SCENE_POST_PLAY_PREVIEW_POLICY/);
  assert.match(postPlaySource, /SCENE_POST_PLAY_SOURCE_CONTRACT/);
  assert.match(postPlaySource, /serializeScenePostPlayPreviewPlan/);
  assert.match(canvasSource, /buildScenePostPlayPreviewPlan\(\{/);
  assert.match(canvasSource, /serializeScenePostPlayPreviewPlan\(manimPostPlayPreviewPlan\)/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-json/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-policy=/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-summary=/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-num-plays-ready=/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-num-plays-sequence=/);
  assert.match(canvasSource, /data-viz-manim-post-play-preview-forced-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-post-play-preview-skip"\]/);
});

test("ThreeDLabCanvas exposes Manim post-cell redraw evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const postCellModulePath = "components/visualizations/three/manim/mathScenePostCellRedraw.ts";

  assert.ok(
    fs.existsSync(postCellModulePath),
    "MAIS Manim should provide a pure InteractiveSceneEmbed post-cell redraw contract module"
  );
  const postCellSource = fs.readFileSync(postCellModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-post-cell-redraw-action",
    "data-viz-manim-post-cell-redraw-checkpoint-key",
    "data-viz-manim-post-cell-redraw-comment-count",
    "data-viz-manim-post-cell-redraw-comment-label-policy",
    "data-viz-manim-post-cell-redraw-dt",
    "data-viz-manim-post-cell-redraw-force-draw",
    "data-viz-manim-post-cell-redraw-has-window",
    "data-viz-manim-post-cell-redraw-line-count",
    "data-viz-manim-post-cell-redraw-operation-count",
    "data-viz-manim-post-cell-redraw-policy",
    "data-viz-manim-post-cell-redraw-ready",
    "data-viz-manim-post-cell-redraw-skip",
    "data-viz-manim-post-cell-redraw-source-contract",
    "data-viz-manim-post-cell-redraw-source-label",
    "data-viz-manim-post-cell-redraw-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim post-cell redraw evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(postCellSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-post-cell-redraw",
    "data-viz-manim-post-cell-redraw-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim post-cell redraw payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildScenePostCellRedrawPlan/);
  assert.match(evidenceSource, /scenePostCellRedrawDataAttributes/);
  assert.match(evidenceSource, /manimPostCellRedrawPolicy/);
  assert.match(evidenceSource, /manimPostCellRedrawSourceContract/);
  assert.match(evidenceSource, /manimPostCellRedrawCommentLabelPolicy/);
  assert.match(evidenceSource, /manimPostCellRedrawSourceLabel/);
  assert.match(evidenceSource, /\.\.\.postCellRedrawAttributes/);
  assert.match(postCellSource, /SCENE_POST_CELL_COMMENT_LABEL_POLICY/);
  assert.match(postCellSource, /SCENE_POST_CELL_REDRAW_POLICY/);
  assert.match(postCellSource, /SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT/);
  assert.match(postCellSource, /serializeScenePostCellRedrawPlan/);
  assert.match(canvasSource, /buildScenePostCellRedrawPlan\(\{/);
  assert.match(canvasSource, /serializeScenePostCellRedrawPlan\(manimPostCellRedrawPlan\)/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-json/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-policy=/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-comment-label-policy=/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-source-label=/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-summary=/);
  assert.match(canvasSource, /data-viz-manim-post-cell-redraw-force-draw=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-post-cell-redraw-action"\]/);
});

test("ThreeDLabCanvas exposes Manim InteractiveScene shortcut catalog evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const shortcutModulePath = "components/visualizations/three/manim/mathSceneShortcutCatalog.ts";

  assert.ok(
    fs.existsSync(shortcutModulePath),
    "MAIS Manim should provide a pure InteractiveScene shortcut catalog module"
  );
  const shortcutSource = fs.readFileSync(shortcutModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-shortcut-checkpoint-count",
    "data-viz-manim-shortcut-count",
    "data-viz-manim-shortcut-history-count",
    "data-viz-manim-shortcut-ids",
    "data-viz-manim-shortcut-playback-count",
    "data-viz-manim-shortcut-redraw-count",
    "data-viz-manim-shortcut-reload-ready",
    "data-viz-manim-shortcut-scene-graph-count",
    "data-viz-manim-shortcut-source-contract",
    "data-viz-manim-shortcut-state-count",
    "data-viz-manim-shortcut-authoring-policy",
    "data-viz-manim-shortcut-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose InteractiveScene shortcut catalog evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(shortcutSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-shortcut-catalog",
    "data-viz-manim-shortcut-catalog-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose InteractiveScene shortcut catalog JSON to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneShortcutCatalog/);
  assert.match(evidenceSource, /sceneShortcutCatalogDataAttributes/);
  assert.match(evidenceSource, /manimShortcutSourceContract/);
  assert.match(evidenceSource, /manimShortcutAuthoringPolicy/);
  assert.match(evidenceSource, /\.\.\.shortcutCatalogAttributes/);
  assert.match(shortcutSource, /SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT/);
  assert.match(shortcutSource, /SCENE_SHORTCUT_AUTHORING_POLICY/);
  assert.match(shortcutSource, /serializeSceneShortcutCatalog/);
  assert.match(canvasSource, /buildSceneShortcutCatalog\(\)/);
  assert.match(canvasSource, /serializeSceneShortcutCatalog\(manimShortcutCatalog\)/);
  assert.match(canvasSource, /data-viz-manim-shortcut-catalog-json/);
  assert.match(canvasSource, /data-viz-manim-shortcut-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-shortcut-authoring-policy=/);
  assert.match(canvasSource, /data-viz-manim-shortcut-summary=/);
  assert.match(canvasSource, /data-viz-manim-shortcut-ids=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-shortcut-count"\]/);
});

test("ThreeDLabCanvas exposes Manim InteractiveScene reload evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const surfaceContractSource = fs.readFileSync("components/visualizations/three/threeDCanvasSurfaceContract.ts", "utf8");
  const reloadModulePath = "components/visualizations/three/manim/mathSceneReloadPlan.ts";

  assert.ok(
    fs.existsSync(reloadModulePath),
    "MAIS Manim should provide a pure InteractiveScene reload planner module"
  );
  const reloadSource = fs.readFileSync(reloadModulePath, "utf8");
  const reloadAttributes = [
    "data-viz-manim-reload-checkpoint-count",
    "data-viz-manim-reload-clears-snippet",
    "data-viz-manim-reload-frame-after",
    "data-viz-manim-reload-history-label",
    "data-viz-manim-reload-ready",
    "data-viz-manim-reload-reset-policy",
    "data-viz-manim-reload-resets-elapsed",
    "data-viz-manim-reload-resets-frame",
    "data-viz-manim-reload-scene-id",
    "data-viz-manim-reload-selected-family-id",
    "data-viz-manim-reload-source-contract",
    "data-viz-manim-reload-summary"
  ];

  for (const attribute of reloadAttributes) {
    assert.match(
      surfaceContractSource,
      new RegExp(`"${attribute}"`),
      `${attribute} should be listed in the ThreeDLabCanvas surface contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(reloadSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-reload",
    "data-viz-manim-reload-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose InteractiveScene reload JSON to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneReloadPlan/);
  assert.match(evidenceSource, /sceneReloadPlanDataAttributes/);
  assert.match(evidenceSource, /manimReloadResetPolicy/);
  assert.match(evidenceSource, /manimReloadSourceContract/);
  assert.match(evidenceSource, /\.\.\.reloadPlanAttributes/);
  assert.match(reloadSource, /SCENE_RELOAD_RESET_POLICY/);
  assert.match(reloadSource, /SCENE_RELOAD_SOURCE_CONTRACT/);
  assert.match(reloadSource, /serializeSceneReloadPlan/);
  assert.match(canvasSource, /buildSceneReloadPlan\(\{/);
  assert.match(canvasSource, /serializeSceneReloadPlan\(manimReloadPlan\)/);
  assert.match(canvasSource, /data-viz-manim-reload-json/);
  assert.match(canvasSource, /data-viz-manim-reload-reset-policy=/);
  assert.match(canvasSource, /data-viz-manim-reload-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-reload-summary=/);
  assert.match(canvasSource, /data-viz-manim-reload-scene-id=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-reload-ready"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.wait control and presenter-hold evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const waitControlModulePath = "components/visualizations/three/manim/mathSceneWaitControl.ts";
  const waitFrameStepperBridgeModulePath = "components/visualizations/three/manim/mathSceneWaitFrameStepperBridge.ts";
  const presenterHoldModulePath = "components/visualizations/three/manim/mathScenePresenterHold.ts";

  assert.ok(
    fs.existsSync(waitControlModulePath),
    "MAIS Manim should provide a pure Scene.wait control contract module"
  );
  assert.ok(
    fs.existsSync(presenterHoldModulePath),
    "MAIS Manim should provide a pure presenter-hold contract module"
  );
  assert.ok(
    fs.existsSync(waitFrameStepperBridgeModulePath),
    "MAIS Manim should provide a pure Scene.wait frame-stepper bridge module"
  );
  const waitControlSource = fs.readFileSync(waitControlModulePath, "utf8");
  const waitFrameStepperBridgeSource = fs.readFileSync(waitFrameStepperBridgeModulePath, "utf8");
  const presenterHoldSource = fs.readFileSync(presenterHoldModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-wait-control-called-emit-frame-count",
    "data-viz-manim-wait-control-called-update-frame-count",
    "data-viz-manim-wait-control-description",
    "data-viz-manim-wait-control-emit-frame-statuses",
    "data-viz-manim-wait-control-effective-duration",
    "data-viz-manim-wait-control-emitted-frame-count",
    "data-viz-manim-wait-control-emitted-time-range",
    "data-viz-manim-wait-control-emitted-times",
    "data-viz-manim-wait-control-fps",
    "data-viz-manim-wait-control-frame-interval",
    "data-viz-manim-wait-control-frame-policy",
    "data-viz-manim-wait-control-frame-operation-summary",
    "data-viz-manim-wait-control-increments-scene-time",
    "data-viz-manim-wait-control-max-time",
    "data-viz-manim-wait-control-mode",
    "data-viz-manim-wait-control-n-iterations",
    "data-viz-manim-wait-control-override-skip",
    "data-viz-manim-wait-control-run-time",
    "data-viz-manim-wait-control-skip-animations",
    "data-viz-manim-wait-control-source-contract",
    "data-viz-manim-wait-control-stop-condition-id",
    "data-viz-manim-wait-control-stop-condition-satisfied",
    "data-viz-manim-wait-control-summary",
    "data-viz-manim-wait-control-update-frame-actions",
    "data-viz-manim-wait-control-update-mobject-frame-count",
    "data-viz-manim-wait-control-update-mobject-dts",
    "data-viz-manim-wait-control-update-mobject-total-dt",
    "data-viz-manim-wait-control-updater-final-value",
    "data-viz-manim-wait-control-updater-value-summary",
    "data-viz-manim-wait-control-updater-values",
    "data-viz-manim-wait-control-updates-mobjects-during-presenter-hold",
    "data-viz-manim-wait-control-updates-mobjects-during-wait",
    "data-viz-manim-wait-control-updates-mobjects-while-skipping",
    "data-viz-manim-wait-control-updates-mobjects",
    "data-viz-manim-wait-control-updater-policy",
    "data-viz-manim-wait-control-written-frame-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.wait control evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(waitControlSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-wait-frame-stepper-active-steps",
    "data-viz-manim-wait-frame-stepper-camera-shots",
    "data-viz-manim-wait-frame-stepper-frame-step-count",
    "data-viz-manim-wait-frame-stepper-mismatch-count",
    "data-viz-manim-wait-frame-stepper-scene-ids",
    "data-viz-manim-wait-frame-stepper-source-contract",
    "data-viz-manim-wait-frame-stepper-summary",
    "data-viz-manim-wait-frame-stepper-update-frame-actions",
    "data-viz-manim-wait-frame-stepper-updater-active-counts",
    "data-viz-manim-wait-frame-stepper-updater-suspended-counts",
    "data-viz-manim-wait-frame-stepper-updater-value-after-frames",
    "data-viz-manim-wait-frame-stepper-wait-frame-count",
    "data-viz-manim-wait-frame-stepper-wait-updates-mobjects",
    "data-viz-manim-wait-frame-stepper-write-frame-flags",
    "data-viz-manim-wait-frame-stepper-wait-times"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.wait frame-stepper bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(waitFrameStepperBridgeSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-presenter-hold-duration",
    "data-viz-manim-presenter-hold-final-hold-on-wait",
    "data-viz-manim-presenter-hold-frame-count",
    "data-viz-manim-presenter-hold-ignore",
    "data-viz-manim-presenter-hold-mode",
    "data-viz-manim-presenter-hold-note-logged",
    "data-viz-manim-presenter-hold-presenter-mode",
    "data-viz-manim-presenter-hold-release-event",
    "data-viz-manim-presenter-hold-should-use-timeline-wait",
    "data-viz-manim-presenter-hold-skip-animations",
    "data-viz-manim-presenter-hold-source-contract",
    "data-viz-manim-presenter-hold-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim presenter-hold evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(presenterHoldSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-wait-control",
    "data-viz-manim-wait-control-json",
    "data-viz-manim-presenter-hold-plan",
    "data-viz-manim-presenter-hold-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.wait JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /sceneWaitControlDataAttributes/);
  assert.match(evidenceSource, /manimWaitControlFramePolicy/);
  assert.match(evidenceSource, /manimWaitControlSourceContract/);
  assert.match(evidenceSource, /manimWaitControlUpdaterPolicy/);
  assert.match(waitControlSource, /SCENE_WAIT_CONTROL_FRAME_POLICY/);
  assert.match(waitControlSource, /SCENE_WAIT_CONTROL_SOURCE_CONTRACT/);
  assert.match(waitControlSource, /SCENE_WAIT_CONTROL_UPDATER_POLICY/);
  assert.match(waitControlSource, /serializeSceneWaitControlPlan/);
  assert.match(presenterHoldSource, /SCENE_PRESENTER_HOLD_SOURCE_CONTRACT/);
  assert.match(presenterHoldSource, /serializeScenePresenterHoldPlan/);
  assert.match(waitControlSource, /scenePresenterHoldDataAttributes/);
  assert.match(evidenceSource, /manimPresenterHoldSourceContract/);
  assert.match(evidenceSource, /\.\.\.waitControlAttributes/);
  assert.match(canvasSource, /import \{ SCENE_PRESENTER_HOLD_SOURCE_CONTRACT, serializeScenePresenterHoldPlan \} from "\.\/manim\/mathScenePresenterHold"/);
  assert.match(canvasSource, /buildSceneWaitControl\(\{/);
  assert.match(canvasSource, /serializeSceneWaitControlPlan\(manimWaitControlPlan\)/);
  assert.match(canvasSource, /const manimPresenterHoldJson = useMemo/);
  assert.match(canvasSource, /serializeScenePresenterHoldPlan\(manimWaitControlPlan\.presenterHold\)/);
  assert.match(canvasSource, /data-viz-manim-wait-control-json/);
  assert.match(canvasSource, /data-viz-manim-presenter-hold-plan/);
  assert.match(canvasSource, /data-viz-manim-presenter-hold-json/);
  assert.match(canvasSource, /data-viz-manim-wait-control-frame-policy=/);
  assert.match(canvasSource, /data-viz-manim-wait-control-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-wait-control-summary=/);
  assert.match(canvasSource, /data-viz-manim-wait-control-updater-policy=/);
  assert.match(canvasSource, /data-viz-manim-presenter-hold-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-presenter-hold-summary=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-wait-control-emitted-frame-count"\]/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-wait-control-emitted-time-range"\]/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-wait-control-emitted-times"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene skipping-window evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const skippingWindowModulePath = "components/visualizations/three/manim/mathSceneSkippingWindow.ts";

  assert.ok(
    fs.existsSync(skippingWindowModulePath),
    "MAIS Manim should provide a pure Scene skipping-window contract module"
  );
  const skippingWindowSource = fs.readFileSync(skippingWindowModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-skipping-window-constructor-forced-skip",
    "data-viz-manim-skipping-window-end-at",
    "data-viz-manim-skipping-window-end-scene-play",
    "data-viz-manim-skipping-window-final-skip",
    "data-viz-manim-skipping-window-gate-policy",
    "data-viz-manim-skipping-window-play-count",
    "data-viz-manim-skipping-window-rendered-play-count",
    "data-viz-manim-skipping-window-skipped-play-count",
    "data-viz-manim-skipping-window-source-contract",
    "data-viz-manim-skipping-window-start-at",
    "data-viz-manim-skipping-window-summary",
    "data-viz-manim-skipping-window-truncated"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene skipping-window evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(skippingWindowSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-skipping-window",
    "data-viz-manim-skipping-window-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene skipping-window JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ SCENE_SKIPPING_WINDOW_GATE_POLICY, SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT, buildSceneSkippingWindowPlan, serializeSceneSkippingWindowPlan \} from "\.\/manim\/mathSceneSkippingWindow"/
  );
  assert.match(evidenceSource, /buildSceneSkippingWindowPlan/);
  assert.match(evidenceSource, /sceneSkippingWindowDataAttributes/);
  assert.match(evidenceSource, /manimSkippingWindowGatePolicy/);
  assert.match(evidenceSource, /manimSkippingWindowSourceContract/);
  assert.match(skippingWindowSource, /SCENE_SKIPPING_WINDOW_GATE_POLICY/);
  assert.match(skippingWindowSource, /SCENE_SKIPPING_WINDOW_SOURCE_CONTRACT/);
  assert.match(skippingWindowSource, /serializeSceneSkippingWindowPlan/);
  assert.match(evidenceSource, /\.\.\.skippingWindowAttributes/);
  assert.match(canvasSource, /buildSceneSkippingWindowPlan\(\{/);
  assert.match(canvasSource, /startAtAnimationNumber: manimRunFromBeatIndex > 0 \? manimRunFromBeatIndex : null/);
  assert.match(canvasSource, /serializeSceneSkippingWindowPlan\(manimSkippingWindowPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSkippingWindowJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-skipping-window-gate-policy=/);
  assert.match(canvasSource, /data-viz-manim-skipping-window-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-skipping-window-summary=/);
  assert.match(canvasSource, /data-viz-manim-skipping-window-rendered-play-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-skipping-window-final-skip"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene skip-control evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const skipControlModulePath = "components/visualizations/three/manim/mathSceneSkipControl.ts";

  assert.ok(
    fs.existsSync(skipControlModulePath),
    "MAIS Manim should provide a pure Scene skip-control contract module"
  );
  const skipControlSource = fs.readFileSync(skipControlModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-skip-control-action-summary",
    "data-viz-manim-skip-control-final-original-status",
    "data-viz-manim-skip-control-final-skip",
    "data-viz-manim-skip-control-final-temp-previous",
    "data-viz-manim-skip-control-has-original-status",
    "data-viz-manim-skip-control-skipped-transition-count",
    "data-viz-manim-skip-control-source-contract",
    "data-viz-manim-skip-control-state-policy",
    "data-viz-manim-skip-control-stopped-transition-count",
    "data-viz-manim-skip-control-summary",
    "data-viz-manim-skip-control-transition-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene skip-control evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(skipControlSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-skip-control",
    "data-viz-manim-skip-control-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene skip-control JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ SCENE_SKIP_CONTROL_SOURCE_CONTRACT, SCENE_SKIP_CONTROL_STATE_POLICY, buildSceneSkipControlPlan, serializeSceneSkipControlPlan \} from "\.\/manim\/mathSceneSkipControl"/
  );
  assert.match(evidenceSource, /buildSceneSkipControlPlan/);
  assert.match(evidenceSource, /sceneSkipControlDataAttributes/);
  assert.match(evidenceSource, /manimSkipControlSourceContract/);
  assert.match(evidenceSource, /manimSkipControlStatePolicy/);
  assert.match(skipControlSource, /SCENE_SKIP_CONTROL_SOURCE_CONTRACT/);
  assert.match(skipControlSource, /SCENE_SKIP_CONTROL_STATE_POLICY/);
  assert.match(skipControlSource, /serializeSceneSkipControlPlan/);
  assert.match(evidenceSource, /\.\.\.skipControlAttributes/);
  assert.match(canvasSource, /buildSceneSkipControlPlan\(\{/);
  assert.match(canvasSource, /serializeSceneSkipControlPlan\(manimSkipControlPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSkipControlJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-skip-control-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-skip-control-state-policy=/);
  assert.match(canvasSource, /data-viz-manim-skip-control-summary=/);
  assert.match(canvasSource, /data-viz-manim-skip-control-stopped-transition-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-skip-control-final-skip"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene progress-control evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const progressControlModulePath = "components/visualizations/three/manim/mathSceneProgressControl.ts";

  assert.ok(
    fs.existsSync(progressControlModulePath),
    "MAIS Manim should provide a pure Scene progress-control contract module"
  );
  const progressControlSource = fs.readFileSync(progressControlModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-progress-control-action-summary",
    "data-viz-manim-progress-control-final-progress",
    "data-viz-manim-progress-control-initial-progress",
    "data-viz-manim-progress-control-previous-progress",
    "data-viz-manim-progress-control-requested",
    "data-viz-manim-progress-control-restored-previous",
    "data-viz-manim-progress-control-source-contract",
    "data-viz-manim-progress-control-state-policy",
    "data-viz-manim-progress-control-summary",
    "data-viz-manim-progress-control-transition-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene progress-control evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(progressControlSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-progress-control",
    "data-viz-manim-progress-control-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene progress-control JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT, SCENE_PROGRESS_CONTROL_STATE_POLICY, buildSceneProgressControlPlan, serializeSceneProgressControlPlan \} from "\.\/manim\/mathSceneProgressControl"/
  );
  assert.match(evidenceSource, /buildSceneProgressControlPlan/);
  assert.match(evidenceSource, /sceneProgressControlDataAttributes/);
  assert.match(evidenceSource, /manimProgressControlSourceContract/);
  assert.match(evidenceSource, /manimProgressControlStatePolicy/);
  assert.match(progressControlSource, /SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT/);
  assert.match(progressControlSource, /SCENE_PROGRESS_CONTROL_STATE_POLICY/);
  assert.match(progressControlSource, /serializeSceneProgressControlPlan/);
  assert.match(evidenceSource, /\.\.\.progressControlAttributes/);
  assert.match(canvasSource, /buildSceneProgressControlPlan\(\{/);
  assert.match(canvasSource, /requested: manimPlaybackState === "playing" \|\| manimCaptureKind === "video"/);
  assert.match(canvasSource, /serializeSceneProgressControlPlan\(manimProgressControlPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimProgressControlJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-progress-control-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-progress-control-state-policy=/);
  assert.match(canvasSource, /data-viz-manim-progress-control-summary=/);
  assert.match(canvasSource, /data-viz-manim-progress-control-restored-previous=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-progress-control-requested"\]/);
});

test("ThreeDLabCanvas exposes Manim InteractiveScene event evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const eventSource = [
    evidenceSource,
    fs.readFileSync("components/visualizations/three/manim/mathSceneFloorPlane.ts", "utf8"),
    fs.readFileSync("components/visualizations/three/manim/mathSceneKeyControls.ts", "utf8"),
    fs.readFileSync("components/visualizations/three/manim/mathScenePicking.ts", "utf8"),
    fs.readFileSync("components/visualizations/three/manim/mathScenePointerControls.ts", "utf8"),
    fs.readFileSync("components/visualizations/three/manim/mathSceneWindowEvents.ts", "utf8")
  ].join("\n");

  for (const modulePath of [
    "components/visualizations/three/manim/mathSceneFloorPlane.ts",
    "components/visualizations/three/manim/mathSceneKeyControls.ts",
    "components/visualizations/three/manim/mathScenePicking.ts",
    "components/visualizations/three/manim/mathScenePointerControls.ts",
    "components/visualizations/three/manim/mathSceneWindowEvents.ts"
  ]) {
    assert.ok(fs.existsSync(modulePath), `MAIS Manim should provide ${modulePath}`);
  }

  for (const attribute of [
    "data-viz-manim-floor-plane",
    "data-viz-manim-floor-plane-error",
    "data-viz-manim-floor-plane-euler-axes",
    "data-viz-manim-floor-plane-raises-error",
    "data-viz-manim-floor-plane-source-contract",
    "data-viz-manim-floor-plane-summary",
    "data-viz-manim-floor-plane-valid",
    "data-viz-manim-key-action",
    "data-viz-manim-key-can-redo",
    "data-viz-manim-key-can-undo",
    "data-viz-manim-key-dispatches-event",
    "data-viz-manim-key-event-type",
    "data-viz-manim-key-final-hold-on-wait",
    "data-viz-manim-key-final-quit-interaction",
    "data-viz-manim-key-key",
    "data-viz-manim-key-plays-camera-reset",
    "data-viz-manim-key-prevents-propagation",
    "data-viz-manim-key-redo-requested",
    "data-viz-manim-key-release-event",
    "data-viz-manim-key-reset-key",
    "data-viz-manim-key-source-contract",
    "data-viz-manim-key-summary",
    "data-viz-manim-key-undo-requested",
    "data-viz-manim-pick-buff",
    "data-viz-manim-pick-concept-id",
    "data-viz-manim-pick-distance-to-center",
    "data-viz-manim-pick-group",
    "data-viz-manim-pick-hit",
    "data-viz-manim-pick-object-id",
    "data-viz-manim-pick-render-index",
    "data-viz-manim-pick-search-order-index",
    "data-viz-manim-pick-source-contract",
    "data-viz-manim-pick-summary",
    "data-viz-manim-pointer-button",
    "data-viz-manim-pointer-buttons",
    "data-viz-manim-pointer-control-version",
    "data-viz-manim-pointer-delta-point",
    "data-viz-manim-pointer-dispatches-event",
    "data-viz-manim-pointer-event-type",
    "data-viz-manim-pointer-frame-action",
    "data-viz-manim-pointer-frame-shift",
    "data-viz-manim-pointer-modifiers",
    "data-viz-manim-pointer-mouse-drag-point-updated",
    "data-viz-manim-pointer-mouse-point-updated",
    "data-viz-manim-pointer-offset",
    "data-viz-manim-pointer-phi-delta",
    "data-viz-manim-pointer-point",
    "data-viz-manim-pointer-propagation-stopped",
    "data-viz-manim-pointer-scale-about-point",
    "data-viz-manim-pointer-scale-factor",
    "data-viz-manim-pointer-scroll-relative-offset",
    "data-viz-manim-pointer-source-contract",
    "data-viz-manim-pointer-summary",
    "data-viz-manim-pointer-theta-delta",
    "data-viz-manim-pointer-window-ok",
    "data-viz-manim-window-calls-focus",
    "data-viz-manim-window-event-type",
    "data-viz-manim-window-has-window",
    "data-viz-manim-window-height",
    "data-viz-manim-window-no-op",
    "data-viz-manim-window-returned-early",
    "data-viz-manim-window-source-contract",
    "data-viz-manim-window-summary",
    "data-viz-manim-window-width"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim InteractiveScene event evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(eventSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-floor-plane-plan",
    "data-viz-manim-floor-plane-json",
    "data-viz-manim-pick-result",
    "data-viz-manim-pick-json",
    "data-viz-manim-key-control",
    "data-viz-manim-key-control-json",
    "data-viz-manim-pointer-control",
    "data-viz-manim-pointer-control-json",
    "data-viz-manim-window-event",
    "data-viz-manim-window-event-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim InteractiveScene event JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneFloorPlanePlan/);
  assert.match(eventSource, /SCENE_FLOOR_PLANE_SOURCE_CONTRACT/);
  assert.match(eventSource, /serializeSceneFloorPlanePlan/);
  assert.match(evidenceSource, /sceneFloorPlaneDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_FLOOR_PLANE_SOURCE_CONTRACT, buildSceneFloorPlanePlan, serializeSceneFloorPlanePlan \} from "\.\/manim\/mathSceneFloorPlane"/
  );
  assert.match(canvasSource, /buildSceneFloorPlanePlan\(\{ plane: "xz" \}\)/);
  assert.match(canvasSource, /serializeSceneFloorPlanePlan\(manimFloorPlanePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFloorPlaneJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-floor-plane-source-contract=/);
  assert.match(evidenceSource, /buildSceneKeyControlPlan/);
  assert.match(eventSource, /SCENE_KEY_CONTROL_SOURCE_CONTRACT/);
  assert.match(eventSource, /serializeSceneKeyControlPlan/);
  assert.match(evidenceSource, /manimKeyControlSourceContract/);
  assert.match(evidenceSource, /sceneKeyControlDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_KEY_CONTROL_SOURCE_CONTRACT, buildSceneKeyControlPlan, serializeSceneKeyControlPlan \} from "\.\/manim\/mathSceneKeyControls"/
  );
  assert.match(canvasSource, /buildSceneKeyControlPlan\(\{/);
  assert.match(canvasSource, /key: "r"/);
  assert.match(canvasSource, /serializeSceneKeyControlPlan\(manimKeyControlPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimKeyControlJson \?\? "" \}\}/);
  assert.match(evidenceSource, /pointToSceneMobject/);
  assert.match(eventSource, /SCENE_PICKING_SOURCE_CONTRACT/);
  assert.match(eventSource, /serializeScenePickResult/);
  assert.match(evidenceSource, /manimPickSourceContract/);
  assert.match(evidenceSource, /scenePickDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_PICKING_SOURCE_CONTRACT, serializeScenePickResult, type MathScenePickResult \} from "\.\/manim\/mathScenePicking"/
  );
  assert.match(canvasSource, /useMemo<MathScenePickResult \| null>/);
  assert.match(canvasSource, /serializeScenePickResult\(manimPickResult\)/);
  assert.match(canvasSource, /data-viz-manim-pick-summary=\{manimPickResult\?\.summary \?\? "pick:miss"\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimPickJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-pick-source-contract=/);
  assert.match(evidenceSource, /buildScenePointerControlPlan/);
  assert.match(eventSource, /SCENE_POINTER_CONTROL_SOURCE_CONTRACT/);
  assert.match(eventSource, /serializeScenePointerControlPlan/);
  assert.match(evidenceSource, /manimPointerControlSourceContract/);
  assert.match(evidenceSource, /scenePointerControlDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_POINTER_CONTROL_SOURCE_CONTRACT, buildScenePointerControlPlan, serializeScenePointerControlPlan \} from "\.\/manim\/mathScenePointerControls"/
  );
  assert.match(canvasSource, /buildScenePointerControlPlan\(\{/);
  assert.match(canvasSource, /eventType: "mouse-motion"/);
  assert.match(canvasSource, /hasWindow: canvasReady/);
  assert.match(canvasSource, /serializeScenePointerControlPlan\(manimPointerControlPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimPointerControlJson \?\? "" \}\}/);
  assert.match(evidenceSource, /buildSceneWindowEventPlan/);
  assert.match(eventSource, /SCENE_WINDOW_EVENT_SOURCE_CONTRACT/);
  assert.match(eventSource, /serializeSceneWindowEventPlan/);
  assert.match(evidenceSource, /sceneWindowEventDataAttributes/);
  assert.match(
    canvasSource,
    /import \{ SCENE_WINDOW_EVENT_SOURCE_CONTRACT, buildSceneWindowEventPlan, serializeSceneWindowEventPlan \} from "\.\/manim\/mathSceneWindowEvents"/
  );
  assert.match(canvasSource, /buildSceneWindowEventPlan\(\{/);
  assert.match(canvasSource, /eventType: "resize"/);
  assert.match(canvasSource, /height: manimFormulaOverlayViewport\.height/);
  assert.match(canvasSource, /serializeSceneWindowEventPlan\(manimWindowEventPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimWindowEventJson \?\? "" \}\}/);
  assert.match(canvasSource, /data-viz-manim-key-final-quit-interaction=/);
  assert.match(canvasSource, /data-viz-manim-pointer-window-ok=/);
  assert.match(canvasSource, /data-viz-manim-window-height=/);
  assert.match(canvasSource, /data-viz-manim-window-returned-early=/);
  assert.match(canvasSource, /data-viz-manim-window-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-window-width=/);
});

test("ThreeDLabCanvas exposes Manim Scene.add_sound cue evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const soundCueModulePath = "components/visualizations/three/manim/mathSceneSoundCue.ts";

  assert.ok(fs.existsSync(soundCueModulePath), "MAIS Manim should provide a pure Scene.add_sound cue module");
  const soundCueSource = fs.readFileSync(soundCueModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-sound-cue-audible-count",
    "data-viz-manim-sound-cue-count",
    "data-viz-manim-sound-cue-gain-summary",
    "data-viz-manim-sound-cue-includes-sound",
    "data-viz-manim-sound-cue-issue-count",
    "data-viz-manim-sound-cue-ids",
    "data-viz-manim-sound-cue-row-count",
    "data-viz-manim-sound-cue-scheduled-ids",
    "data-viz-manim-sound-cue-scheduled-time-summary",
    "data-viz-manim-sound-cue-skipped-count",
    "data-viz-manim-sound-cue-sound-file-count",
    "data-viz-manim-sound-cue-source-contract",
    "data-viz-manim-sound-cue-status-summary",
    "data-viz-manim-sound-cue-summary",
    "data-viz-manim-sound-cue-time-offset-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.add_sound cue evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(soundCueSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-sound-cue",
    "data-viz-manim-sound-cue-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.add_sound JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(evidenceSource, /buildSceneSoundCuePlan/);
  assert.match(evidenceSource, /sceneSoundCueDataAttributes/);
  assert.match(evidenceSource, /\.\.\.soundCueAttributes/);
  assert.match(soundCueSource, /SCENE_SOUND_CUE_SOURCE_CONTRACT/);
  assert.match(soundCueSource, /serializeSceneSoundCuePlan/);
  assert.match(
    canvasSource,
    /import \{ SCENE_SOUND_CUE_SOURCE_CONTRACT, buildSceneSoundCuePlan, serializeSceneSoundCuePlan \} from "\.\/manim\/mathSceneSoundCue"/
  );
  assert.match(canvasSource, /buildSceneSoundCuePlan\(\{/);
  assert.match(canvasSource, /cues: manimScene\.soundCues \?\? \[\]/);
  assert.match(canvasSource, /serializeSceneSoundCuePlan\(manimSoundCuePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSoundCueJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-sound-cue-source-contract"\]\s*\?\?\s*SCENE_SOUND_CUE_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-sound-cue-source-contract"\]\s*\?\?\s*"Scene\.add_sound\|SceneFileWriter\.add_sound\|negative timestamp guard"/
  );
  assert.match(canvasSource, /data-viz-manim-sound-cue-summary=/);
  assert.match(canvasSource, /data-viz-manim-sound-cue-scheduled-ids=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-sound-cue-includes-sound"\]/);
});

test("ThreeDLabCanvas exposes Manim Scene.interact loop evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const interactLoopModulePath = "components/visualizations/three/manim/mathSceneInteractLoop.ts";

  assert.ok(fs.existsSync(interactLoopModulePath), "MAIS Manim should provide a pure Scene.interact loop module");
  const interactLoopSource = fs.readFileSync(interactLoopModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-interact-dt",
    "data-viz-manim-interact-final-scene-time",
    "data-viz-manim-interact-frame-count",
    "data-viz-manim-interact-has-window",
    "data-viz-manim-interact-logs-tips",
    "data-viz-manim-interact-sets-skip-false",
    "data-viz-manim-interact-source-contract",
    "data-viz-manim-interact-state-policy",
    "data-viz-manim-interact-summary",
    "data-viz-manim-interact-termination",
    "data-viz-manim-interact-update-frame-actions",
    "data-viz-manim-interact-update-frame-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.interact authoring-loop evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(interactLoopSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-interact-loop",
    "data-viz-manim-interact-loop-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.interact loop JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ SCENE_INTERACT_LOOP_SOURCE_CONTRACT, SCENE_INTERACT_LOOP_STATE_POLICY, buildSceneInteractLoopPlan, serializeSceneInteractLoopPlan \} from "\.\/manim\/mathSceneInteractLoop"/
  );
  assert.match(evidenceSource, /buildSceneInteractLoopPlan/);
  assert.match(evidenceSource, /SCENE_INTERACT_LOOP_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /SCENE_INTERACT_LOOP_STATE_POLICY/);
  assert.match(evidenceSource, /sceneInteractLoopDataAttributes/);
  assert.match(evidenceSource, /\.\.\.interactLoopAttributes/);
  assert.match(interactLoopSource, /serializeSceneInteractLoopPlan/);
  assert.match(canvasSource, /buildSceneInteractLoopPlan\(\{/);
  assert.match(canvasSource, /maxFrames: 2/);
  assert.match(canvasSource, /serializeSceneInteractLoopPlan\(manimInteractLoopPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimInteractLoopJson \?\? "" \}\}/);
  assert.match(canvasSource, /SCENE_INTERACT_LOOP_SOURCE_CONTRACT/);
  assert.match(canvasSource, /SCENE_INTERACT_LOOP_STATE_POLICY/);
  assert.match(canvasSource, /data-viz-manim-interact-summary=/);
  assert.match(canvasSource, /data-viz-manim-interact-update-frame-count=/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-interact-termination"\]/);
});

test("ThreeDLabCanvas exposes Scene.run lifecycle evidence for MAIS Manim scenes", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const runLifecycleModulePath = "components/visualizations/three/manim/mathSceneRunLifecycle.ts";
  const runInteractBridgeModulePath = "components/visualizations/three/manim/mathSceneRunInteractBridge.ts";
  const finishBridgeModulePath = "components/visualizations/three/manim/mathSceneRunFileWriterFinishBridge.ts";

  assert.ok(fs.existsSync(runLifecycleModulePath), "MAIS Manim should provide a pure Scene.run lifecycle module");
  assert.ok(fs.existsSync(runInteractBridgeModulePath), "MAIS Manim should provide a pure Scene.run/interact bridge module");
  assert.ok(fs.existsSync(finishBridgeModulePath), "MAIS Manim should provide a pure Scene.run/FileWriter.finish bridge module");
  const runLifecycleSource = fs.readFileSync(runLifecycleModulePath, "utf8");
  const runInteractBridgeSource = fs.readFileSync(runInteractBridgeModulePath, "utf8");
  const finishBridgeSource = fs.readFileSync(finishBridgeModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-scene-run-ready",
    "data-viz-manim-scene-run-signature",
    "data-viz-manim-scene-run-scene-id",
    "data-viz-manim-scene-run-scene-signature",
    "data-viz-manim-scene-run-setup-actions",
    "data-viz-manim-scene-run-setup-complete",
    "data-viz-manim-scene-run-active-phase",
    "data-viz-manim-scene-run-active-phase-index",
    "data-viz-manim-scene-run-construct-actions",
    "data-viz-manim-scene-run-construct-binding-count",
    "data-viz-manim-scene-run-construct-complete",
    "data-viz-manim-scene-run-construct-formula-count",
    "data-viz-manim-scene-run-construct-object-count",
    "data-viz-manim-scene-run-phase-count",
    "data-viz-manim-scene-run-phase-status-summary",
    "data-viz-manim-scene-run-elapsed-seconds",
    "data-viz-manim-scene-run-play-duration",
    "data-viz-manim-scene-run-total-duration",
    "data-viz-manim-scene-run-source-contract",
    "data-viz-manim-scene-run-interactive",
    "data-viz-manim-scene-run-num-plays",
    "data-viz-manim-scene-run-call-order",
    "data-viz-manim-scene-run-skipped-phase-count",
    "data-viz-manim-scene-run-skipped-phase-ids",
    "data-viz-manim-scene-run-teardown-actions",
    "data-viz-manim-scene-run-teardown-ready",
    "data-viz-manim-scene-run-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim Scene.run lifecycle evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(runLifecycleSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-scene-run-interact-active-phase",
    "data-viz-manim-scene-run-interact-call-order",
    "data-viz-manim-scene-run-interact-calls-interact",
    "data-viz-manim-scene-run-interact-enabled",
    "data-viz-manim-scene-run-interact-loop-frame-count",
    "data-viz-manim-scene-run-interact-loop-has-window",
    "data-viz-manim-scene-run-interact-ready-for-teardown",
    "data-viz-manim-scene-run-interact-scene-id",
    "data-viz-manim-scene-run-interact-source-contract",
    "data-viz-manim-scene-run-interact-state-policy",
    "data-viz-manim-scene-run-interact-status",
    "data-viz-manim-scene-run-interact-summary",
    "data-viz-manim-scene-run-interact-termination",
    "data-viz-manim-scene-run-interact-update-frame-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Scene.run optional interact bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(runInteractBridgeSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-scene-run-file-writer-finish-call-order",
    "data-viz-manim-scene-run-file-writer-finish-combine-action",
    "data-viz-manim-scene-run-file-writer-finish-concat-manifest-path",
    "data-viz-manim-scene-run-file-writer-finish-final-path",
    "data-viz-manim-scene-run-file-writer-finish-partial-count",
    "data-viz-manim-scene-run-file-writer-finish-ready",
    "data-viz-manim-scene-run-file-writer-finish-required",
    "data-viz-manim-scene-run-file-writer-finish-scene-id",
    "data-viz-manim-scene-run-file-writer-finish-source-contract",
    "data-viz-manim-scene-run-file-writer-finish-status",
    "data-viz-manim-scene-run-file-writer-finish-summary",
    "data-viz-manim-scene-run-file-writer-finish-teardown-actions",
    "data-viz-manim-scene-run-file-writer-finish-teardown-ready"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Scene.run tear_down/FileWriter.finish bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(finishBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-scene-run",
    "data-viz-manim-scene-run-json",
    "data-viz-manim-scene-run-interact",
    "data-viz-manim-scene-run-interact-json",
    "data-viz-manim-scene-run-file-writer-finish",
    "data-viz-manim-scene-run-file-writer-finish-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Scene.run lifecycle evidence to browser tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT, buildMathSceneRunLifecyclePlan, sceneRunLifecycleDataAttributes, serializeMathSceneRunLifecyclePlan \} from "\.\/manim\/mathSceneRunLifecycle"/);
  assert.match(
    canvasSource,
    /import \{ buildSceneRunFileWriterFinishBridgePlan, SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT, sceneRunFileWriterFinishBridgeDataAttributes, serializeSceneRunFileWriterFinishBridgePlan \} from "\.\/manim\/mathSceneRunFileWriterFinishBridge"/
  );
  assert.match(
    canvasSource,
    /import \{ buildSceneRunInteractBridgePlan, SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT, sceneRunInteractBridgeDataAttributes, serializeSceneRunInteractBridgePlan \} from "\.\/manim\/mathSceneRunInteractBridge"/
  );
  assert.match(canvasSource, /const manimSceneRunLifecycle = useMemo/);
  assert.match(canvasSource, /const manimSceneRunInteractBridgePlan = useMemo/);
  assert.match(canvasSource, /const manimSceneRunFileWriterFinishBridgePlan = useMemo/);
  assert.match(canvasSource, /buildMathSceneRunLifecyclePlan\(\{/);
  assert.match(canvasSource, /buildSceneRunInteractBridgePlan\(\{/);
  assert.match(canvasSource, /buildSceneRunFileWriterFinishBridgePlan\(\{/);
  assert.match(canvasSource, /interactLoopPlan: manimInteractLoopPlan/);
  assert.match(canvasSource, /fileWriterCombinePlan: manimFileWriterCombinePlan/);
  assert.match(canvasSource, /sceneRunLifecycle: manimSceneRunLifecycle/);
  assert.match(canvasSource, /elapsedSeconds: manimElapsedSeconds/);
  assert.match(canvasSource, /sceneSignature: manimSceneExport\.signature/);
  assert.match(canvasSource, /sceneRunLifecycleDataAttributes\(manimSceneRunLifecycle\)/);
  assert.match(canvasSource, /sceneRunInteractBridgeDataAttributes\(manimSceneRunInteractBridgePlan\)/);
  assert.match(canvasSource, /sceneRunFileWriterFinishBridgeDataAttributes\(manimSceneRunFileWriterFinishBridgePlan\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-scene-run-source-contract=\{manimSceneRunLifecycleAttributes\?\.\["data-viz-manim-scene-run-source-contract"\] \?\? SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT\}/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-scene-run-file-writer-finish-source-contract=\{[\s\S]*SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-scene-run-interact-source-contract=\{[\s\S]*SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /serializeMathSceneRunLifecyclePlan\(manimSceneRunLifecycle\)/);
  assert.match(canvasSource, /serializeSceneRunInteractBridgePlan\(manimSceneRunInteractBridgePlan\)/);
  assert.match(canvasSource, /serializeSceneRunFileWriterFinishBridgePlan\(manimSceneRunFileWriterFinishBridgePlan\)/);
  assert.match(canvasSource, /data-viz-manim-scene-run-json/);
  assert.match(canvasSource, /data-viz-manim-scene-run-interact-json/);
  assert.match(canvasSource, /data-viz-manim-scene-run-file-writer-finish-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRunLifecycleJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRunInteractBridgeJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRunFileWriterFinishBridgePlanJson \}\}/);
});

test("ThreeDLabCanvas exposes deterministic Scene random seed evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const typeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneTypes.ts", "utf8");
  const randomModulePath = "components/visualizations/three/manim/mathSceneRandom.ts";

  assert.ok(fs.existsSync(randomModulePath), "MAIS Manim should provide a pure scene random seed module");
  const randomSource = fs.readFileSync(randomModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-random-seed",
    "data-viz-manim-random-seed-algorithm",
    "data-viz-manim-random-seed-signature"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose deterministic scene random seeds to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.match(typeSource, /randomSeed\?: MathSceneRandomSeedSpec/);
  assert.match(registrySource, /deriveMathSceneRandomSeed/);
  assert.match(evidenceSource, /randomSeedDataAttributes/);
  assert.doesNotMatch(randomSource, /Math\.random|@react-three\/fiber|from "three"/);
});

test("ThreeDLabCanvas exposes Manim Scene.__init__ readiness evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const initializationModulePath = "components/visualizations/three/manim/mathSceneInitialization.ts";

  assert.ok(fs.existsSync(initializationModulePath), "MAIS Manim should provide a pure Scene.__init__ evidence module");
  const initializationSource = fs.readFileSync(initializationModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-scene-init-ready",
    "data-viz-manim-scene-init-camera-ready",
    "data-viz-manim-scene-init-camera-frame-ready",
    "data-viz-manim-scene-init-file-writer-ready",
    "data-viz-manim-scene-init-top-level-mobject-count",
    "data-viz-manim-scene-init-render-group-count",
    "data-viz-manim-scene-init-render-group-ids",
    "data-viz-manim-scene-init-time-seconds",
    "data-viz-manim-scene-init-num-plays",
    "data-viz-manim-scene-init-undo-count",
    "data-viz-manim-scene-init-redo-count",
    "data-viz-manim-scene-init-random-seed-signature",
    "data-viz-manim-scene-init-source-contract",
    "data-viz-manim-scene-init-source-summary",
    "data-viz-manim-scene-init-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.__init__ readiness evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(initializationSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /buildMathSceneInitializationEvidence/);
  assert.match(initializationSource, /SCENE_INITIALIZATION_SOURCE_CONTRACT/);
  assert.match(initializationSource, /serializeMathSceneInitializationEvidence/);
  assert.match(initializationSource, /Scene\.__init__/);
  assert.match(canvasSource, /SCENE_INITIALIZATION_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-scene-init-source-contract=/);
  for (const selector of [
    "data-viz-manim-scene-init-plan",
    "data-viz-manim-scene-init-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.__init__ JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ SCENE_INITIALIZATION_SOURCE_CONTRACT, serializeMathSceneInitializationEvidence, type MathSceneInitializationEvidence \} from "\.\/manim\/mathSceneInitialization"/
  );
  assert.match(canvasSource, /useMemo<MathSceneInitializationEvidence \| null>/);
  assert.match(canvasSource, /serializeMathSceneInitializationEvidence\(manimSceneInitializationEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneInitializationJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-scene-init-source-contract"\]\s*\?\?\s*SCENE_INITIALIZATION_SOURCE_CONTRACT/
  );
});

test("ThreeDLabCanvas exposes Manim-style undo and redo history for authoring state", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  for (const attribute of [
    "data-viz-manim-history-can-undo",
    "data-viz-manim-history-can-redo",
    "data-viz-manim-history-branch-invalidated-redo-count",
    "data-viz-manim-history-branch-invalidated-redo-labels",
    "data-viz-manim-history-branch-policy",
    "data-viz-manim-history-undo-count",
    "data-viz-manim-history-redo-count",
    "data-viz-manim-history-revision",
    "data-viz-manim-history-current-label",
    "data-viz-manim-history-max-undo-entries",
    "data-viz-manim-history-dropped-undo-count",
    "data-viz-manim-history-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-history",
    "data-viz-manim-history-control",
    "data-viz-manim-history-json",
    "data-viz-manim-undo",
    "data-viz-manim-redo"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose undo/redo authoring controls to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /from "\.\/manim\/mathSceneHistory"/);
  for (const symbol of [
    "SCENE_HISTORY_SOURCE_CONTRACT",
    "buildSceneHistoryManifest",
    "createSceneHistoryStore",
    "pushSceneHistory",
    "redoSceneHistory",
    "sceneHistoryDataAttributes",
    "serializeSceneHistoryManifest",
    "summarizeSceneHistory",
    "undoSceneHistory",
    "type MathSceneHistoryStore"
  ]) {
    assert.match(canvasSource, new RegExp(symbol));
  }
  assert.match(canvasSource, /const \[manimHistoryStore, setManimHistoryStore\] = useState<MathSceneHistoryStore<ManimCheckpointState>>/);
  assert.match(canvasSource, /pushSceneHistory\(currentStore/);
  assert.match(canvasSource, /undoSceneHistory\(manimHistoryStore\)/);
  assert.match(canvasSource, /redoSceneHistory\(manimHistoryStore\)/);
  assert.match(canvasSource, /sceneHistoryDataAttributes\(summarizeSceneHistory\(manimHistoryStore\)\)/);
  assert.match(canvasSource, /buildSceneHistoryManifest\(manimHistoryStore\)/);
  assert.match(canvasSource, /serializeSceneHistoryManifest\(manimHistoryManifest\)/);
  assert.match(canvasSource, /data-viz-manim-history-json/);
  assert.match(canvasSource, /data-viz-manim-history-source-contract=\{manimScene \? manimHistoryAttributes\["data-viz-manim-history-source-contract"\] : SCENE_HISTORY_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /applyManimHistoryState/);
});

test("ThreeDLabCanvas exposes run-from-beat and show-final authoring controls for MAIS Manim scenes", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const runFromBeatModulePath = "components/visualizations/three/manim/mathSceneRunFromBeat.ts";

  assert.ok(
    fs.existsSync(runFromBeatModulePath),
    "MAIS Manim should provide a pure run-from-beat replay contract module"
  );
  const runFromBeatSource = fs.readFileSync(runFromBeatModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-authoring-mode",
    "data-viz-manim-run-from-beat-checkpoint-count",
    "data-viz-manim-run-from-beat-checkpoint-keys",
    "data-viz-manim-run-from-beat-checkpoint-policy",
    "data-viz-manim-run-from-beat-checkpoint-restore-key",
    "data-viz-manim-run-from-beat-checkpoint-restore-mode",
    "data-viz-manim-run-from-beat-checkpoint-restore-ready",
    "data-viz-manim-run-from-beat-checkpoint-summary",
    "data-viz-manim-run-from-beat-composition-id",
    "data-viz-manim-run-from-beat-composition-replay-policy",
    "data-viz-manim-run-from-beat-composition-replay-ready",
    "data-viz-manim-run-from-beat-composition-replay-summary",
    "data-viz-manim-run-from-beat-composition-type",
    "data-viz-manim-run-from-beat-composition-window-count",
    "data-viz-manim-run-from-beat-composition-window-ids",
    "data-viz-manim-run-from-beat-composition-window-summary",
    "data-viz-manim-run-from-beat-elapsed-before",
    "data-viz-manim-run-from-beat-final-elapsed",
    "data-viz-manim-run-from-beat-index",
    "data-viz-manim-run-from-beat-normalized-index",
    "data-viz-manim-run-from-beat-prepared-count",
    "data-viz-manim-run-from-beat-prepared-indices",
    "data-viz-manim-run-from-beat-ready",
    "data-viz-manim-run-from-beat-replay-count",
    "data-viz-manim-run-from-beat-replay-indices",
    "data-viz-manim-run-from-beat-replay-policy",
    "data-viz-manim-run-from-beat-requested-index",
    "data-viz-manim-run-from-beat-source-contract",
    "data-viz-manim-run-from-beat-summary",
    "data-viz-manim-run-from-beat-total-play-count",
    "data-viz-manim-skip-animations"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
    if (attribute.startsWith("data-viz-manim-run-from-beat-") && attribute !== "data-viz-manim-run-from-beat-index") {
      assert.match(runFromBeatSource, new RegExp(attribute));
    }
  }

  for (const selector of [
    "data-viz-manim-authoring-control",
    "data-viz-manim-run-from-beat",
    "data-viz-manim-run-from-beat-plan",
    "data-viz-manim-run-from-beat-json",
    "data-viz-manim-show-final"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should be discoverable by browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /type ManimAuthoringMode = "playback" \| "run-from-beat" \| "show-final"/);
  assert.match(canvasSource, /const \[manimAuthoringMode, setManimAuthoringMode\] = useState<ManimAuthoringMode>\("playback"\)/);
  assert.match(canvasSource, /const \[manimRunFromBeatIndex, setManimRunFromBeatIndex\] = useState\(0\)/);
  assert.match(canvasSource, /function labelForManimBeat/);
  assert.match(canvasSource, /runManimFromBeat/);
  assert.match(canvasSource, /showManimFinalFrame/);
  assert.match(canvasSource, /elapsedSecondsForPlaybackBeat\(manimPlaybackPlan,\s*play\.playIndex\)/);
  assert.match(canvasSource, /finalElapsedSecondsForPlaybackPlan\(manimPlaybackPlan\)/);
  assert.match(canvasSource, /from "\.\/manim\/mathSceneRunFromBeat"/);
  assert.match(canvasSource, /SCENE_RUN_FROM_BEAT_COMPOSITION_REPLAY_POLICY/);
  assert.match(canvasSource, /SCENE_RUN_FROM_BEAT_REPLAY_POLICY/);
  assert.match(canvasSource, /SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT/);
  assert.match(canvasSource, /buildSceneAnimationCompositionPlans/);
  assert.match(canvasSource, /manimRunFromBeatCompositionReplay/);
  assert.match(canvasSource, /buildSceneRunFromBeatPlan/);
  assert.match(canvasSource, /sceneRunFromBeatDataAttributes/);
  assert.match(canvasSource, /serializeSceneRunFromBeatPlan/);
  assert.match(canvasSource, /const manimRunFromBeatPlan = useMemo/);
  assert.match(canvasSource, /buildSceneRunFromBeatPlan\(\{/);
  assert.match(canvasSource, /requestedBeatIndex: manimRunFromBeatIndex/);
  assert.match(canvasSource, /playStartSeconds: manimPlaybackPlan\.plays\.map\(\(play\) => play\.startSeconds\)/);
  assert.match(canvasSource, /playEndSeconds: manimPlaybackPlan\.plays\.map\(\(play\) => play\.endSeconds\)/);
  assert.match(canvasSource, /checkpointKeys: manimCheckpointKeys/);
  assert.match(canvasSource, /checkpointRestoreKey: manimCheckpointKeys\.at\(-1\)/);
  assert.match(canvasSource, /compositionReplay: manimRunFromBeatCompositionReplay/);
  assert.match(canvasSource, /sceneRunFromBeatDataAttributes\(manimRunFromBeatPlan\)/);
  assert.match(canvasSource, /serializeSceneRunFromBeatPlan\(manimRunFromBeatPlan\)/);
  assert.match(canvasSource, /data-viz-manim-run-from-beat-plan/);
  assert.match(canvasSource, /data-viz-manim-run-from-beat-json/);
  assert.match(canvasSource, /const manimSkipAnimations = manimAuthoringMode === "show-final"/);
  assert.match(canvasSource, /reducedMotion: manimSkipAnimations/);
  assert.match(canvasSource, /reducedMotion=\{manimSkipAnimations\}/);
  assert.match(canvasSource, /manimPlaybackPlan\??\.plays\.map/);
  assert.match(canvasSource, /setManimPlaybackState\("paused"\)/);
  assert.match(canvasSource, /data-viz-manim-show-final/);
});

test("ThreeDLabCanvas exposes approved MAIS Manim SceneSpec exports for QA promotion", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  for (const attribute of [
    "data-viz-manim-scene-export-ready",
    "data-viz-manim-scene-export-signature",
    "data-viz-manim-scene-export-object-count",
    "data-viz-manim-scene-export-beat-count",
    "data-viz-manim-scene-export-formula-token-count",
    "data-viz-manim-scene-export-semantic-binding-count",
    "data-viz-manim-scene-export-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-scene-export",
    "data-viz-manim-scene-export-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose approved SceneSpec export evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildApprovedSceneSpecExport, SCENE_EXPORT_SOURCE_CONTRACT, sceneSpecExportDataAttributes \} from "\.\/manim\/mathSceneExport"/
  );
  assert.match(canvasSource, /const manimSceneExport = useMemo/);
  assert.match(canvasSource, /buildApprovedSceneSpecExport\(manimScene\)/);
  assert.match(canvasSource, /const manimSceneExportAttributes = useMemo/);
  assert.match(canvasSource, /sceneSpecExportDataAttributes\(manimSceneExport\)/);
  assert.match(canvasSource, /data-viz-manim-scene-export-ready=\{manimSceneExportAttributes\?\.\["data-viz-manim-scene-export-ready"\] \?\? "false"\}/);
  assert.match(canvasSource, /data-viz-manim-scene-export-signature=\{manimSceneExportAttributes\?\.\["data-viz-manim-scene-export-signature"\] \?\? "none"\}/);
  assert.match(
    canvasSource,
    /data-viz-manim-scene-export-source-contract=\{[\s\S]*SCENE_EXPORT_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /type="application\/json"/);
});

test("ThreeDLabCanvas exposes MAIS Manim authoring state snapshots for replay QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const snapshotSource = fs.readFileSync("components/visualizations/three/manim/mathSceneStateSnapshot.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-state-snapshot-ready",
    "data-viz-manim-state-snapshot-signature",
    "data-viz-manim-state-snapshot-scene-id",
    "data-viz-manim-state-snapshot-elapsed-seconds",
    "data-viz-manim-state-snapshot-frame-index",
    "data-viz-manim-state-snapshot-active-step",
    "data-viz-manim-state-snapshot-camera-shot",
    "data-viz-manim-state-snapshot-checkpoint-count",
    "data-viz-manim-state-snapshot-history-revision",
    "data-viz-manim-state-snapshot-history-dropped-undo-count",
    "data-viz-manim-state-snapshot-history-max-undo-entries",
    "data-viz-manim-state-snapshot-object-ids",
    "data-viz-manim-state-snapshot-root-ids",
    "data-viz-manim-state-snapshot-family-root-ids",
    "data-viz-manim-state-snapshot-object-identity-summary",
    "data-viz-manim-state-snapshot-source-contract",
    "data-viz-manim-state-snapshot-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim state snapshot evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(snapshotSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-state-snapshot",
    "data-viz-manim-state-snapshot-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose state snapshot evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildMathSceneStateSnapshot, SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT, sceneStateSnapshotDataAttributes, serializeMathSceneStateSnapshot \} from "\.\/manim\/mathSceneStateSnapshot"/
  );
  assert.match(canvasSource, /const manimStateSnapshot = useMemo/);
  assert.match(canvasSource, /buildMathSceneStateSnapshot\(\{/);
  assert.match(canvasSource, /checkpointKeys: manimCheckpointKeys/);
  assert.match(canvasSource, /historySummary: manimHistorySummary/);
  assert.match(canvasSource, /objectGraphIdentity:/);
  assert.match(canvasSource, /sceneSignature: manimSceneExport\.signature/);
  assert.match(canvasSource, /sceneStateSnapshotDataAttributes\(manimStateSnapshot\)/);
  assert.match(canvasSource, /serializeMathSceneStateSnapshot\(manimStateSnapshot\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-state-snapshot-source-contract=\{[\s\S]*SCENE_STATE_SNAPSHOT_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /data-viz-manim-state-snapshot-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimStateSnapshotJson \}\}/);
});

test("ThreeDLabCanvas exposes a MAIS Manim Playwright smoke-hook manifest", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const smokeHookSource = fs.readFileSync("components/visualizations/three/manim/mathSceneSmokeHook.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-smoke-hook-ready",
    "data-viz-manim-smoke-hook-signature",
    "data-viz-manim-smoke-hook-scene-id",
    "data-viz-manim-smoke-hook-selector-count",
    "data-viz-manim-smoke-hook-attribute-count",
    "data-viz-manim-smoke-hook-converted-selector-count",
    "data-viz-manim-smoke-hook-selector-conversion-summary",
    "data-viz-manim-smoke-hook-json-payload-count",
    "data-viz-manim-smoke-hook-source-contract",
    "data-viz-manim-smoke-hook-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim smoke-hook evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(smokeHookSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-name",
    "data-viz-manim-smoke-hook",
    "data-viz-manim-smoke-hook-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose smoke-hook evidence to browser tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(smokeHookSource, /SCENE_SMOKE_HOOK_SOURCE_CONTRACT/);
  assert.match(canvasSource, /import \{ SCENE_SMOKE_HOOK_SOURCE_CONTRACT, buildMathSceneSmokeHookManifest, sceneSmokeHookDataAttributes, serializeMathSceneSmokeHookManifest \} from "\.\/manim\/mathSceneSmokeHook"/);
  assert.match(canvasSource, /const manimSmokeHookManifest = useMemo/);
  assert.match(canvasSource, /buildMathSceneSmokeHookManifest\(\{/);
  assert.match(canvasSource, /sceneExport: manimSceneExport/);
  assert.match(canvasSource, /stateSnapshot: manimStateSnapshot/);
  assert.match(canvasSource, /sceneSmokeHookDataAttributes\(manimSmokeHookManifest\)/);
  assert.match(canvasSource, /serializeMathSceneSmokeHookManifest\(manimSmokeHookManifest\)/);
  assert.match(canvasSource, /data-viz-manim-smoke-hook-source-contract=\{manimSmokeHookAttributes\?\.\["data-viz-manim-smoke-hook-source-contract"\] \?\? SCENE_SMOKE_HOOK_SOURCE_CONTRACT\}/);
  assert.match(canvasSource, /data-viz-manim-smoke-hook-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSmokeHookJson \}\}/);
});

test("ThreeDLabCanvas exposes a MAIS Manim TeX/SVG cache manifest for formula pipeline QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const cacheSourcePath = "components/visualizations/three/manim/mathTexCacheManifest.ts";
  const compileSourcePath = "components/visualizations/three/manim/mathTexCompilePipeline.ts";

  assert.ok(fs.existsSync(cacheSourcePath), "MAIS Manim should provide a pure TeX/SVG cache manifest module");
  const cacheSource = fs.readFileSync(cacheSourcePath, "utf8");
  assert.ok(fs.existsSync(compileSourcePath), "MAIS Manim should provide a pure TeX latex_to_svg compile-pipeline module");
  const compileSource = fs.readFileSync(compileSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-tex-cache-ready",
    "data-viz-manim-tex-cache-signature",
    "data-viz-manim-tex-cache-scene-id",
    "data-viz-manim-tex-cache-formula-count",
    "data-viz-manim-tex-cache-token-count",
    "data-viz-manim-tex-cache-isolation-entry-count",
    "data-viz-manim-tex-cache-svg-morph-plan-count",
    "data-viz-manim-tex-cache-entry-count",
    "data-viz-manim-tex-cache-source-contract",
    "data-viz-manim-tex-cache-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim TeX/SVG cache manifest evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(cacheSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-formula",
    "data-viz-manim-formula-svg",
    "data-viz-manim-svg-morph",
    "data-viz-manim-tex-cache",
    "data-viz-manim-tex-cache-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose TeX/SVG cache manifest evidence to browser tests`
    );
    const surfaceSource = `${canvasSource}\n${fs.readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8")}`;
    assert.match(surfaceSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMathTexCacheManifest, serializeMathTexCacheManifest, TEX_CACHE_MANIFEST_SOURCE_CONTRACT, texCacheManifestDataAttributes \} from "\.\/manim\/mathTexCacheManifest"/);
  assert.match(canvasSource, /const manimTexCacheManifest = useMemo/);
  assert.match(canvasSource, /buildMathTexCacheManifest\(manimScene\)/);
  assert.match(canvasSource, /texCacheManifestDataAttributes\(manimTexCacheManifest\)/);
  assert.match(canvasSource, /serializeMathTexCacheManifest\(manimTexCacheManifest\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-tex-cache-source-contract=\{[\s\S]*TEX_CACHE_MANIFEST_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /data-viz-manim-tex-cache-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTexCacheJson \}\}/);
  assert.match(cacheSource, /buildTexIsolationPlan/);
  assert.match(cacheSource, /buildFormulaSvgMorphPlan/);

  for (const attribute of [
    "data-viz-manim-tex-compile-cache-hit-eligible-count",
    "data-viz-manim-tex-compile-cache-key-count",
    "data-viz-manim-tex-compile-command-count",
    "data-viz-manim-tex-compile-document-count",
    "data-viz-manim-tex-compile-document-source-length-range",
    "data-viz-manim-tex-compile-document-template-count",
    "data-viz-manim-tex-compile-dvisvgm-count",
    "data-viz-manim-tex-compile-engine-ids",
    "data-viz-manim-tex-compile-formula-count",
    "data-viz-manim-tex-compile-intermediate-extensions",
    "data-viz-manim-tex-compile-source-contract",
    "data-viz-manim-tex-compile-source-summary",
    "data-viz-manim-tex-compile-step-sequence",
    "data-viz-manim-tex-compile-svg-output-count",
    "data-viz-manim-tex-compile-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim TeX latex_to_svg compile-pipeline evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(compileSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-tex-compile",
    "data-viz-manim-tex-compile-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose TeX compile-pipeline details to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMathTexCompilePipeline, serializeMathTexCompilePipeline, TEX_COMPILE_PIPELINE_SOURCE_CONTRACT, texCompilePipelineDataAttributes \} from "\.\/manim\/mathTexCompilePipeline"/);
  assert.match(canvasSource, /const manimTexCompilePipeline = useMemo/);
  assert.match(canvasSource, /buildMathTexCompilePipeline\(manimScene\)/);
  assert.match(canvasSource, /texCompilePipelineDataAttributes\(manimTexCompilePipeline\)/);
  assert.match(canvasSource, /serializeMathTexCompilePipeline\(manimTexCompilePipeline\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-tex-compile-source-contract=\{[\s\S]*TEX_COMPILE_PIPELINE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /data-viz-manim-tex-compile-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTexCompileJson \}\}/);
  assert.match(compileSource, /latex_to_svg/);
  assert.match(compileSource, /TEX_COMPILE_PIPELINE_SOURCE_CONTRACT/);
  assert.match(compileSource, /dvisvgm/);
});

test("ThreeDLabCanvas exposes Formula SVG morph runtime evidence for formula glyph continuity", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSourcePath = "components/visualizations/three/manim/mathFormulaSvgMorphEvidence.ts";

  assert.ok(fs.existsSync(evidenceSourcePath), "MAIS Manim should provide a pure Formula SVG morph evidence module");
  const evidenceSource = fs.readFileSync(evidenceSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-svg-morph-count",
    "data-viz-manim-svg-morph-compatible-count",
    "data-viz-manim-svg-morph-issue-count",
    "data-viz-manim-svg-morph-command-count",
    "data-viz-manim-svg-morph-cache-key-count",
    "data-viz-manim-svg-morph-ids",
    "data-viz-manim-svg-morph-progress",
    "data-viz-manim-svg-morph-frame-path-preview",
    "data-viz-manim-svg-morph-issue-summary",
    "data-viz-manim-svg-morph-source-contract",
    "data-viz-manim-svg-morph-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Formula SVG morph evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /formulaSvgMorphEvidenceDataAttributes/);
  assert.match(evidenceSource, /buildFormulaSvgMorphPlan/);
  assert.match(evidenceSource, /interpolateSvgPathMorph/);
  assert.doesNotMatch(evidenceSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});

test("MathFormulaOverlay renders scene-authored Formula SVG morph frames", () => {
  const overlaySource = fs.readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");
  const runtimeSourcePath = "components/visualizations/three/manim/mathFormulaSvgMorphRuntime.ts";

  assert.ok(fs.existsSync(runtimeSourcePath), "MAIS Manim should provide a pure Formula SVG morph runtime module");
  const runtimeSource = fs.readFileSync(runtimeSourcePath, "utf8");

  for (const selector of [
    "data-viz-manim-svg-morph-runtime-frame",
    "data-viz-manim-svg-morph-runtime-source-contract"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose SVG morph runtime frames to browser tests`
    );
    assert.match(overlaySource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-manim-svg-morph-runtime-scene-id",
    "data-viz-manim-svg-morph-runtime-formula-id",
    "data-viz-manim-svg-morph-runtime-frame-count",
    "data-viz-manim-svg-morph-runtime-compatible-frame-count",
    "data-viz-manim-svg-morph-runtime-issue-count",
    "data-viz-manim-svg-morph-runtime-frame-ids",
    "data-viz-manim-svg-morph-runtime-progress",
    "data-viz-manim-svg-morph-runtime-frame-path-preview",
    "data-viz-manim-svg-morph-runtime-summary"
  ]) {
    assert.match(overlaySource, new RegExp(attribute));
    assert.match(runtimeSource, new RegExp(attribute));
  }

  assert.match(overlaySource, /buildFormulaSvgMorphRuntime\(scene/);
  assert.match(overlaySource, /formulaSvgMorphRuntimeDataAttributes\(svgMorphRuntime\)/);
  assert.match(overlaySource, /runtimeState\?\.timeline\.easedLocalProgress/);
  assert.match(overlaySource, /<svg[\s\S]*data-viz-manim-svg-morph-runtime-frame/);
  assert.match(overlaySource, /<path d=\{frame\.path\}/);
  assert.match(runtimeSource, /FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT/);
  assert.match(runtimeSource, /scene\.formulaSvgMorphs/);
  assert.match(runtimeSource, /interpolateSvgPathMorph/);
  assert.doesNotMatch(runtimeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document/);
});

test("ThreeDLabCanvas exposes Formula SVG morph runtime evidence on the Canvas root", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const runtimeSourcePath = "components/visualizations/three/manim/mathFormulaSvgMorphRuntime.ts";

  assert.ok(fs.existsSync(runtimeSourcePath), "MAIS Manim should provide a pure Formula SVG morph runtime module");
  const runtimeSource = fs.readFileSync(runtimeSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-svg-morph-runtime-scene-id",
    "data-viz-manim-svg-morph-runtime-formula-id",
    "data-viz-manim-svg-morph-runtime-frame-count",
    "data-viz-manim-svg-morph-runtime-compatible-frame-count",
    "data-viz-manim-svg-morph-runtime-issue-count",
    "data-viz-manim-svg-morph-runtime-frame-ids",
    "data-viz-manim-svg-morph-runtime-progress",
    "data-viz-manim-svg-morph-runtime-frame-path-preview",
    "data-viz-manim-svg-morph-runtime-source-contract",
    "data-viz-manim-svg-morph-runtime-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Formula SVG morph runtime evidence on the Canvas root`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(runtimeSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /buildFormulaSvgMorphRuntime/);
  assert.match(canvasSource, /formulaSvgMorphRuntimeDataAttributes/);
  assert.match(canvasSource, /FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT/);
});

test("ThreeDLabCanvas exposes a MAIS Manim TeX color map for formula-to-object semantics", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const colorMapSourcePath = "components/visualizations/three/manim/mathTexColorMap.ts";

  assert.ok(fs.existsSync(colorMapSourcePath), "MAIS Manim should provide a pure TeX color-map module");
  const colorMapSource = fs.readFileSync(colorMapSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-tex-color-map-scene-id",
    "data-viz-manim-tex-color-map-entry-count",
    "data-viz-manim-tex-color-map-token-count",
    "data-viz-manim-tex-color-map-bound-token-count",
    "data-viz-manim-tex-color-map-source-contract",
    "data-viz-manim-tex-color-map-binding-source-count",
    "data-viz-manim-tex-color-map-tex-isolation-source-count",
    "data-viz-manim-tex-color-map-reference-source-count",
    "data-viz-manim-tex-color-map-source-summary",
    "data-viz-manim-tex-color-map-tex-isolated-token-count",
    "data-viz-manim-tex-color-map-tex-isolation-selector-count",
    "data-viz-manim-tex-color-map-unmatched-token-count",
    "data-viz-manim-tex-color-map-unmatched-selector-count",
    "data-viz-manim-tex-color-map-unmatched-selectors",
    "data-viz-manim-tex-color-map-role-count",
    "data-viz-manim-tex-color-map-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim TeX color-map evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(colorMapSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-tex-color-map",
    "data-viz-manim-tex-color-map-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose TeX color-map evidence to browser tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildTexColorMap, serializeTexColorMap, TEX_COLOR_MAP_SOURCE_CONTRACT, texColorMapDataAttributes \} from "\.\/manim\/mathTexColorMap"/
  );
  assert.match(canvasSource, /const manimTexColorMap = useMemo/);
  assert.match(canvasSource, /buildTexColorMap\(manimScene\)/);
  assert.match(canvasSource, /texColorMapDataAttributes\(manimTexColorMap\)/);
  assert.match(canvasSource, /serializeTexColorMap\(manimTexColorMap\)/);
  assert.match(colorMapSource, /TEX_COLOR_MAP_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /manimTexColorMapAttributes\?\.\["data-viz-manim-tex-color-map-source-contract"\]\s*\?\?\s*TEX_COLOR_MAP_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimTexColorMapAttributes\?\.\["data-viz-manim-tex-color-map-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(canvasSource, /data-viz-manim-tex-color-map-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTexColorMapJson \}\}/);
  assert.match(colorMapSource, /buildTexIsolationPlan/);
  assert.match(colorMapSource, /tex_to_color_map/);
  assert.match(colorMapSource, /t2c/);
  assert.doesNotMatch(colorMapSource, /"use client"/);
  assert.doesNotMatch(colorMapSource, /@react-three\/fiber|three/);
});

test("ThreeDLabCanvas exposes a MAIS Manim TeX isolation selector plan for FormulaLayer QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const isolationSourcePath = "components/visualizations/three/manim/mathTexIsolation.ts";

  assert.ok(fs.existsSync(isolationSourcePath), "MAIS Manim should provide a pure TeX isolation module");
  const isolationSource = fs.readFileSync(isolationSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-tex-isolation-scene-id",
    "data-viz-manim-tex-isolation-formula-count",
    "data-viz-manim-tex-isolation-token-count",
    "data-viz-manim-tex-isolation-isolated-token-count",
    "data-viz-manim-tex-isolation-selector-count",
    "data-viz-manim-tex-isolation-selector-summary",
    "data-viz-manim-tex-isolation-unmatched-selector-count",
    "data-viz-manim-tex-isolation-unmatched-selectors",
    "data-viz-manim-tex-isolation-cache-key-count",
    "data-viz-manim-tex-isolation-occurrence-summary",
    "data-viz-manim-tex-isolation-source-contract",
    "data-viz-manim-tex-isolation-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim TeX isolation evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(isolationSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-tex-isolation",
    "data-viz-manim-tex-isolation-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose TeX isolation evidence to browser tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildTexIsolationEvidence, serializeTexIsolationEvidence, TEX_ISOLATION_SOURCE_CONTRACT, texIsolationEvidenceDataAttributes \} from "\.\/manim\/mathTexIsolation"/
  );
  assert.match(canvasSource, /const manimTexIsolationEvidence = useMemo/);
  assert.match(canvasSource, /buildTexIsolationEvidence\(manimScene\)/);
  assert.match(canvasSource, /texIsolationEvidenceDataAttributes\(manimTexIsolationEvidence\)/);
  assert.match(canvasSource, /serializeTexIsolationEvidence\(manimTexIsolationEvidence\)/);
  assert.match(isolationSource, /TEX_ISOLATION_SOURCE_CONTRACT/);
  assert.match(
    canvasSource,
    /manimTexIsolationAttributes\?\.\["data-viz-manim-tex-isolation-source-contract"\]\s*\?\?\s*TEX_ISOLATION_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimTexIsolationAttributes\?\.\["data-viz-manim-tex-isolation-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(canvasSource, /data-viz-manim-tex-isolation-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTexIsolationJson \}\}/);
  assert.match(isolationSource, /Tex\.isolate/);
  assert.match(isolationSource, /tex_to_color_map/);
  assert.doesNotMatch(isolationSource, /"use client"/);
  assert.doesNotMatch(isolationSource, /@react-three\/fiber|three/);
});

test("MathFormulaOverlay feeds TeX color-map roles into the rendered KaTeX formula", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const overlaySource = fs.readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");
  const colorizedSourcePath = "components/visualizations/three/manim/mathTexColorizedFormula.ts";

  assert.ok(fs.existsSync(colorizedSourcePath), "MAIS Manim should provide a pure TeX colorized-formula adapter");
  const colorizedSource = fs.readFileSync(colorizedSourcePath, "utf8");

  for (const attribute of [
    "data-viz-manim-tex-colorized-formula-id",
    "data-viz-manim-tex-colorized-source-contract",
    "data-viz-manim-tex-colorized-token-count",
    "data-viz-manim-tex-colorized-colored-token-count",
    "data-viz-manim-tex-colorized-colored-token-ids",
    "data-viz-manim-tex-colorized-colored-character-count",
    "data-viz-manim-tex-colorized-coverage-ratio",
    "data-viz-manim-tex-colorized-coverage-summary",
    "data-viz-manim-tex-colorized-uncolored-token-count",
    "data-viz-manim-tex-colorized-uncolored-token-ids",
    "data-viz-manim-tex-colorized-source-character-count",
    "data-viz-manim-tex-colorized-role-summary",
    "data-viz-manim-tex-colorized-interval-order-summary",
    "data-viz-manim-tex-colorized-interval-summary",
    "data-viz-manim-tex-colorized-summary"
  ]) {
    assert.match(overlaySource, new RegExp(attribute));
    assert.match(colorizedSource, new RegExp(attribute));
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be root-level smoke-checkable from ThreeDLabCanvas`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-tex-colorized-source-contract" as (typeof threeDCanvasRequiredSelectors)[number]),
    "TeX colorized formula runtime evidence should be smoke-checkable from the overlay"
  );
  assert.match(overlaySource, /buildTexColorizedFormula\(formula\)/);
  assert.match(overlaySource, /texColorizedFormulaDataAttributes\(colorizedFormula\)/);
  assert.match(overlaySource, /serializeTexColorizedFormula\(colorizedFormula\)/);
  assert.match(overlaySource, /text=\{colorizedFormula\.latex\}/);
  assert.match(overlaySource, /data-viz-manim-tex-colorized-json/);
  assert.match(overlaySource, /dangerouslySetInnerHTML=\{\{ __html: colorizedFormulaJson \}\}/);
  assert.match(colorizedSource, /serializeTexColorizedFormula/);
  assert.match(colorizedSource, /TEX_COLORIZED_FORMULA_SOURCE_CONTRACT/);
  assert.match(colorizedSource, /tex_to_color_map/);
  assert.match(colorizedSource, /KaTeX color command injection/);
  assert.doesNotMatch(colorizedSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document/);
});

test("ThreeDLabCanvas exposes screenshot and video capture hooks for MAIS Manim authoring", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  for (const attribute of [
    "data-viz-manim-render-quality-alpha",
    "data-viz-manim-render-quality-antialias",
    "data-viz-manim-render-quality-background",
    "data-viz-manim-render-quality-capture",
    "data-viz-manim-render-quality-dpr",
    "data-viz-manim-render-quality-pixel-count",
    "data-viz-manim-render-quality-preset",
    "data-viz-manim-render-quality-renderer-mode",
    "data-viz-manim-render-quality-samples",
    "data-viz-manim-render-quality-size",
    "data-viz-manim-render-quality-source-contract",
    "data-viz-manim-render-quality-summary",
    "data-viz-manim-render-quality-transparent",
    "data-viz-manim-renderer-bridge-alpha",
    "data-viz-manim-renderer-bridge-antialias",
    "data-viz-manim-renderer-bridge-background-alpha",
    "data-viz-manim-renderer-bridge-background-color",
    "data-viz-manim-renderer-bridge-dpr",
    "data-viz-manim-renderer-bridge-gl-summary",
    "data-viz-manim-renderer-bridge-preserve-drawing-buffer",
    "data-viz-manim-renderer-bridge-power-preference",
    "data-viz-manim-renderer-bridge-renderer-mode",
    "data-viz-manim-renderer-bridge-samples",
    "data-viz-manim-renderer-bridge-sampling-policy",
    "data-viz-manim-renderer-bridge-source-contract",
    "data-viz-manim-renderer-bridge-summary",
    "data-viz-manim-renderer-bridge-transparent",
    "data-viz-manim-capture-kind",
    "data-viz-manim-capture-status",
    "data-viz-manim-capture-frame-count",
    "data-viz-manim-capture-height",
    "data-viz-manim-capture-scene-signature",
    "data-viz-manim-capture-elapsed-seconds",
    "data-viz-manim-capture-framebuffer-id",
    "data-viz-manim-capture-framebuffer-status",
    "data-viz-manim-capture-fps",
    "data-viz-manim-capture-camera-shot",
    "data-viz-manim-capture-byte-count",
    "data-viz-manim-capture-request-count",
    "data-viz-manim-capture-quality-preset",
    "data-viz-manim-capture-renderer-mode",
    "data-viz-manim-capture-render-group-count",
    "data-viz-manim-capture-render-group-ids",
    "data-viz-manim-capture-render-group-summary",
    "data-viz-manim-capture-render-pass-summary",
    "data-viz-manim-capture-dpr",
    "data-viz-manim-capture-samples",
    "data-viz-manim-capture-transparent",
    "data-viz-manim-capture-background",
    "data-viz-manim-capture-alpha",
    "data-viz-manim-capture-source-contract",
    "data-viz-manim-capture-target",
    "data-viz-manim-capture-width"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should be part of the shared canvas smoke-test contract`
    );
    assert.match(canvasSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-capture-control",
    "data-viz-manim-capture-screenshot",
    "data-viz-manim-render-quality-control",
    "data-viz-manim-render-quality-transparent-control",
    "data-viz-manim-render-quality-json",
    "data-viz-manim-renderer-bridge-json",
    "data-viz-manim-capture-video-plan",
    "data-viz-manim-capture-plan-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose screenshot/video capture workflow evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(
    canvasSource,
    /import \{ buildMathSceneCapturePlan, capturePlanDataAttributes, SCENE_CAPTURE_SOURCE_CONTRACT, serializeMathSceneCapturePlan, type MathSceneCaptureKind, type MathSceneCaptureStatus \} from "\.\/manim\/mathSceneCapture"/
  );
  assert.match(
    canvasSource,
    /import \{ buildMathSceneRenderQualityPlan, MANIM_RENDER_QUALITY_SOURCE_CONTRACT, renderQualityDataAttributes, serializeMathSceneRenderQualityPlan, type MathSceneRenderQualityPreset \} from "\.\/manim\/mathSceneRenderQuality"/
  );
  assert.match(
    canvasSource,
    /import \{ buildMathSceneRenderQualityBridgePlan, MANIM_RENDER_QUALITY_BRIDGE_SOURCE_CONTRACT, renderQualityBridgeDataAttributes, serializeMathSceneRenderQualityBridgePlan \} from "\.\/manim\/mathSceneRenderQualityBridge"/
  );
  assert.match(canvasSource, /const \[manimCaptureKind, setManimCaptureKind\] = useState<MathSceneCaptureKind>\("screenshot"\)/);
  assert.match(canvasSource, /const \[manimCaptureQualityPreset, setManimCaptureQualityPreset\] = useState<MathSceneRenderQualityPreset>\("interactive"\)/);
  assert.match(canvasSource, /const \[manimRenderQualityPreset, setManimRenderQualityPreset\] = useState<MathSceneRenderQualityPreset>\("interactive"\)/);
  assert.match(canvasSource, /const \[manimRenderTransparentBackground, setManimRenderTransparentBackground\] = useState\(false\)/);
  assert.match(canvasSource, /const webglCanvasRef = useRef<HTMLCanvasElement \| null>\(null\)/);
  assert.match(canvasSource, /webglCanvasRef\.current = gl\.domElement/);
  assert.match(canvasSource, /const manimRenderQualityPlan = useMemo\(/);
  assert.match(canvasSource, /buildMathSceneRenderQualityPlan\(\{[\s\S]*preset: manimRenderQualityPreset/);
  assert.match(canvasSource, /preset: manimRenderQualityPreset,[\s\S]{0,120}rendererMode: "interactive"/);
  assert.match(canvasSource, /const manimCaptureRenderQualityPlan = useMemo\(/);
  assert.match(canvasSource, /preset: manimCaptureQualityPreset,[\s\S]{0,120}rendererMode: manimCaptureKind === "video" \? "capture" : "interactive"/);
  assert.match(canvasSource, /transparentBackground: manimRenderTransparentBackground/);
  assert.match(canvasSource, /renderQualityDataAttributes\(manimRenderQualityPlan\)/);
  assert.match(canvasSource, /const manimRenderQualityBridgePlan = useMemo\(/);
  assert.match(canvasSource, /buildMathSceneRenderQualityBridgePlan\(manimRenderQualityPlan\)/);
  assert.match(canvasSource, /renderQualityBridgeDataAttributes\(manimRenderQualityBridgePlan\)/);
  assert.match(canvasSource, /const manimRenderQualityBridgeJson = useMemo\(/);
  assert.match(canvasSource, /serializeMathSceneRenderQualityBridgePlan\(manimRenderQualityBridgePlan\)/);
  assert.match(canvasSource, /const manimRenderQualityPlanJson = useMemo\(/);
  assert.match(canvasSource, /serializeMathSceneRenderQualityPlan\(manimRenderQualityPlan\)/);
  assert.match(canvasSource, /const canvasBackgroundColor = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.backgroundColor : threeDCanvasRendererContract\.backgroundColor/);
  assert.match(canvasSource, /const canvasBackgroundAlpha = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.backgroundAlpha : 1/);
  assert.match(canvasSource, /const canvasTransparentBackground = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.transparentBackground : false/);
  assert.match(canvasSource, /alpha: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.alpha : false/);
  assert.match(canvasSource, /antialias: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.antialias : threeDCanvasRendererContract\.gl\.antialias/);
  assert.match(canvasSource, /preserveDrawingBuffer: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.preserveDrawingBuffer : threeDCanvasRendererContract\.gl\.preserveDrawingBuffer/);
  assert.match(canvasSource, /powerPreference: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.powerPreference : "default"/);
  assert.match(canvasSource, /const canvasDevicePixelRatio = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.devicePixelRatio : threeDCanvasRendererContract\.devicePixelRatioRange/);
  assert.match(canvasSource, /buildMathSceneCapturePlan\(\{/);
  assert.match(canvasSource, /renderQuality: manimCaptureRenderQualityPlan/);
  assert.match(canvasSource, /renderGroups: manimRuntimeState\?\.sceneGraph\.renderGroups/);
  assert.match(canvasSource, /height: manimCaptureKind === "video" \? undefined : manimFormulaOverlayViewport\.height/);
  assert.match(canvasSource, /width: manimCaptureKind === "video" \? undefined : manimFormulaOverlayViewport\.width/);
  assert.doesNotMatch(canvasSource, /buildMathSceneCapturePlan\(\{[\s\S]*height: 450[\s\S]*width: 800/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-render-quality-preset"\]/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-manim-render-quality-source-contract"\]/);
  assert.match(canvasSource, /data-viz-manim-render-quality-control/);
  assert.match(canvasSource, /data-viz-manim-render-quality-transparent-control/);
  assert.match(canvasSource, /data-viz-manim-render-quality-json/);
  assert.match(canvasSource, /data-viz-manim-renderer-bridge-json/);
  assert.match(canvasSource, /setManimRenderQualityPreset\(event\.currentTarget\.value as MathSceneRenderQualityPreset\)/);
  assert.match(canvasSource, /setManimRenderTransparentBackground\(event\.currentTarget\.checked\)/);
  assert.match(canvasSource, /capturePlanDataAttributes\(manimCapturePlan\)/);
  assert.match(canvasSource, /serializeMathSceneCapturePlan\(manimCapturePlan\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-capture-source-contract=\{[\s\S]*SCENE_CAPTURE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /webglCanvasRef\.current\?\.toDataURL\("image\/png"\)/);
  assert.match(canvasSource, /data-viz-manim-capture-plan-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRenderQualityPlanJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRenderQualityBridgeJson \}\}/);
});

test("ThreeDLabCanvas exposes a MAIS Manim SceneFileWriter artifact manifest", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const fileWriterModulePath = "components/visualizations/three/manim/mathSceneFileWriterPlan.ts";

  assert.ok(fs.existsSync(fileWriterModulePath), "MAIS Manim should expose a pure SceneFileWriter-style artifact manifest module");
  const fileWriterSource = fs.readFileSync(fileWriterModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-file-writer-ready",
    "data-viz-manim-file-writer-signature",
    "data-viz-manim-file-writer-scene-id",
    "data-viz-manim-file-writer-output-slug",
    "data-viz-manim-file-writer-artifact-count",
    "data-viz-manim-file-writer-artifact-file-summary",
    "data-viz-manim-file-writer-artifact-kind-summary",
    "data-viz-manim-file-writer-artifact-mime-summary",
    "data-viz-manim-file-writer-frame-count",
    "data-viz-manim-file-writer-byte-count",
    "data-viz-manim-file-writer-capture-alpha",
    "data-viz-manim-file-writer-capture-background",
    "data-viz-manim-file-writer-capture-dpr",
    "data-viz-manim-file-writer-capture-fps",
    "data-viz-manim-file-writer-capture-height",
    "data-viz-manim-file-writer-capture-kind",
    "data-viz-manim-file-writer-capture-quality-preset",
    "data-viz-manim-file-writer-capture-renderer-mode",
    "data-viz-manim-file-writer-capture-samples",
    "data-viz-manim-file-writer-capture-status",
    "data-viz-manim-file-writer-capture-transparent",
    "data-viz-manim-file-writer-capture-width",
    "data-viz-manim-file-writer-json-artifact-count",
    "data-viz-manim-file-writer-media-artifact-count",
    "data-viz-manim-file-writer-source-contract",
    "data-viz-manim-file-writer-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose MAIS Manim file writer evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(fileWriterSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-manim-file-writer",
    "data-viz-manim-file-writer-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose file writer evidence to browser tests`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(canvasSource, /import \{ buildMathSceneFileWriterPlan, SCENE_FILE_WRITER_SOURCE_CONTRACT, sceneFileWriterDataAttributes, serializeMathSceneFileWriterPlan \} from "\.\/manim\/mathSceneFileWriterPlan"/);
  assert.match(canvasSource, /const manimFileWriterPlan = useMemo/);
  assert.match(canvasSource, /buildMathSceneFileWriterPlan\(\{/);
  assert.match(canvasSource, /capturePlan: manimCapturePlan/);
  assert.match(canvasSource, /sceneExport: manimSceneExport/);
  assert.match(canvasSource, /stateSnapshot: manimStateSnapshot/);
  assert.match(canvasSource, /smokeHook: manimSmokeHookManifest/);
  assert.match(canvasSource, /sceneFileWriterDataAttributes\(manimFileWriterPlan\)/);
  assert.match(canvasSource, /serializeMathSceneFileWriterPlan\(manimFileWriterPlan\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-file-writer-source-contract=\{[\s\S]*SCENE_FILE_WRITER_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /data-viz-manim-file-writer-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFileWriterPlanJson \}\}/);
});

test("ThreeDLabCanvas exposes MAIS Manim SceneFileWriter segment evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const segmentModulePath = "components/visualizations/three/manim/mathSceneFileWriterSegments.ts";
  const bridgeModulePath = "components/visualizations/three/manim/mathScenePlaybackFileWriterBridge.ts";
  const combineModulePath = "components/visualizations/three/manim/mathSceneFileWriterCombinePlan.ts";
  const checkpointBridgeModulePath = "components/visualizations/three/manim/mathCheckpointPasteFileWriterBridge.ts";

  assert.ok(fs.existsSync(segmentModulePath), "MAIS Manim should expose a pure SceneFileWriter segment planner module");
  assert.ok(fs.existsSync(bridgeModulePath), "MAIS Manim should expose a pure playback/FileWriter bridge module");
  assert.ok(fs.existsSync(combineModulePath), "MAIS Manim should expose a pure SceneFileWriter.finish combine planner module");
  assert.ok(fs.existsSync(checkpointBridgeModulePath), "MAIS Manim should expose a pure checkpoint_paste/FileWriter bridge module");
  const segmentSource = fs.readFileSync(segmentModulePath, "utf8");
  const bridgeSource = fs.readFileSync(bridgeModulePath, "utf8");
  const combineSource = fs.readFileSync(combineModulePath, "utf8");
  const checkpointBridgeSource = fs.readFileSync(checkpointBridgeModulePath, "utf8");

  for (const attribute of [
    "data-viz-manim-file-writer-segment-action-summary",
    "data-viz-manim-file-writer-segment-close-count",
    "data-viz-manim-file-writer-segment-count",
    "data-viz-manim-file-writer-segment-final-file-summary",
    "data-viz-manim-file-writer-segment-insert-index",
    "data-viz-manim-file-writer-segment-insert-path",
    "data-viz-manim-file-writer-segment-open-count",
    "data-viz-manim-file-writer-segment-partial-index",
    "data-viz-manim-file-writer-segment-partial-index-padded",
    "data-viz-manim-file-writer-segment-partial-path",
    "data-viz-manim-file-writer-segment-partial-path-ready",
    "data-viz-manim-file-writer-segment-skipped-count",
    "data-viz-manim-file-writer-segment-source-contract",
    "data-viz-manim-file-writer-segment-subdivide-output",
    "data-viz-manim-file-writer-segment-summary",
    "data-viz-manim-file-writer-segment-temp-file-count",
    "data-viz-manim-file-writer-segment-temp-record",
    "data-viz-manim-file-writer-segment-write-to-movie"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose SceneFileWriter segment planning to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(segmentSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-playback-file-writer-bridge-mismatch-count",
    "data-viz-manim-playback-file-writer-bridge-partial-index-sequence",
    "data-viz-manim-playback-file-writer-bridge-partial-path-summary",
    "data-viz-manim-playback-file-writer-bridge-ready",
    "data-viz-manim-playback-file-writer-bridge-row-count",
    "data-viz-manim-playback-file-writer-bridge-source-contract",
    "data-viz-manim-playback-file-writer-bridge-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Scene.play/FileWriter bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(bridgeSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-file-writer-combine-action",
    "data-viz-manim-file-writer-combine-concat-manifest-path",
    "data-viz-manim-file-writer-combine-duplicate-partial-count",
    "data-viz-manim-file-writer-combine-final-path",
    "data-viz-manim-file-writer-combine-mismatch-count",
    "data-viz-manim-file-writer-combine-ordered",
    "data-viz-manim-file-writer-combine-partial-count",
    "data-viz-manim-file-writer-combine-partial-index-sequence",
    "data-viz-manim-file-writer-combine-partial-path-summary",
    "data-viz-manim-file-writer-combine-ready",
    "data-viz-manim-file-writer-combine-source-contract",
    "data-viz-manim-file-writer-combine-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose SceneFileWriter.finish combine evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(combineSource, new RegExp(attribute));
  }

  for (const attribute of [
    "data-viz-manim-checkpoint-file-writer-close-insert-pipe",
    "data-viz-manim-checkpoint-file-writer-insert-index",
    "data-viz-manim-checkpoint-file-writer-insert-path",
    "data-viz-manim-checkpoint-file-writer-key",
    "data-viz-manim-checkpoint-file-writer-open-insert-pipe",
    "data-viz-manim-checkpoint-file-writer-ready",
    "data-viz-manim-checkpoint-file-writer-record",
    "data-viz-manim-checkpoint-file-writer-scene-id",
    "data-viz-manim-checkpoint-file-writer-segment-action-summary",
    "data-viz-manim-checkpoint-file-writer-segment-count",
    "data-viz-manim-checkpoint-file-writer-source-contract",
    "data-viz-manim-checkpoint-file-writer-summary",
    "data-viz-manim-checkpoint-file-writer-temp-record"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose checkpoint_paste(record=True) FileWriter temp_record bridge evidence`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(checkpointBridgeSource, new RegExp(attribute));
  }

  assert.match(
    canvasSource,
    /import \{ buildSceneFileWriterSegmentPlan, SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT, sceneFileWriterSegmentDataAttributes, serializeSceneFileWriterSegmentPlan \} from "\.\/manim\/mathSceneFileWriterSegments"/
  );
  assert.match(
    canvasSource,
    /import \{ buildScenePlaybackFileWriterBridgePlan, SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, scenePlaybackFileWriterBridgeDataAttributes, serializeScenePlaybackFileWriterBridgePlan \} from "\.\/manim\/mathScenePlaybackFileWriterBridge"/
  );
  assert.match(
    canvasSource,
    /import \{ buildSceneFileWriterCombinePlan, SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT, sceneFileWriterCombineDataAttributes, serializeSceneFileWriterCombinePlan \} from "\.\/manim\/mathSceneFileWriterCombinePlan"/
  );
  assert.match(
    canvasSource,
    /import \{ buildCheckpointPasteFileWriterBridgePlan, checkpointPasteFileWriterBridgeDataAttributes, checkpointPasteFileWriterSegmentInput, SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT, serializeCheckpointPasteFileWriterBridgePlan \} from "\.\/manim\/mathCheckpointPasteFileWriterBridge"/
  );
  for (const selector of [
    "data-viz-manim-file-writer-segment",
    "data-viz-manim-file-writer-segment-json",
    "data-viz-manim-playback-file-writer-bridge",
    "data-viz-manim-playback-file-writer-bridge-json",
    "data-viz-manim-file-writer-combine",
    "data-viz-manim-file-writer-combine-json",
    "data-viz-manim-checkpoint-file-writer-bridge",
    "data-viz-manim-checkpoint-file-writer-bridge-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose SceneFileWriter segment JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(segmentSource, /serializeSceneFileWriterSegmentPlan/);
  assert.match(bridgeSource, /serializeScenePlaybackFileWriterBridgePlan/);
  assert.match(combineSource, /serializeSceneFileWriterCombinePlan/);
  assert.match(checkpointBridgeSource, /serializeCheckpointPasteFileWriterBridgePlan/);
  assert.match(canvasSource, /const manimFileWriterSegmentPlan = useMemo/);
  assert.match(canvasSource, /const manimCheckpointFileWriterBridgePlan = useMemo/);
  assert.match(canvasSource, /const manimPlaybackFileWriterBridgePlan = useMemo/);
  assert.match(canvasSource, /const manimFileWriterCombinePlan = useMemo/);
  assert.match(canvasSource, /buildSceneFileWriterSegmentPlan\(checkpointPasteFileWriterSegmentInput\(\{/);
  assert.match(canvasSource, /checkpointPastePlan: manimCheckpointPastePlan/);
  assert.match(canvasSource, /buildCheckpointPasteFileWriterBridgePlan\(\{/);
  assert.match(canvasSource, /buildScenePlaybackFileWriterBridgePlan\(\{/);
  assert.match(canvasSource, /buildSceneFileWriterCombinePlan\(\{/);
  assert.match(canvasSource, /numPlays: manimPlaybackPlan\.plays\.length/);
  assert.match(canvasSource, /outputSlug: manimFileWriterPlan\.outputSlug/);
  assert.match(canvasSource, /sceneFileWriterSegmentDataAttributes\(manimFileWriterSegmentPlan\)/);
  assert.match(canvasSource, /checkpointPasteFileWriterBridgeDataAttributes\(manimCheckpointFileWriterBridgePlan\)/);
  assert.match(canvasSource, /scenePlaybackFileWriterBridgeDataAttributes\(manimPlaybackFileWriterBridgePlan\)/);
  assert.match(canvasSource, /sceneFileWriterCombineDataAttributes\(manimFileWriterCombinePlan\)/);
  assert.match(canvasSource, /serializeSceneFileWriterSegmentPlan\(manimFileWriterSegmentPlan\)/);
  assert.match(canvasSource, /serializeCheckpointPasteFileWriterBridgePlan\(manimCheckpointFileWriterBridgePlan\)/);
  assert.match(canvasSource, /serializeScenePlaybackFileWriterBridgePlan\(manimPlaybackFileWriterBridgePlan\)/);
  assert.match(canvasSource, /serializeSceneFileWriterCombinePlan\(manimFileWriterCombinePlan\)/);
  assert.match(
    canvasSource,
    /data-viz-manim-file-writer-segment-source-contract=\{[\s\S]*SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-file-writer-combine-source-contract=\{[\s\S]*SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT/
  );
  assert.match(
    canvasSource,
    /data-viz-manim-checkpoint-file-writer-source-contract=\{[\s\S]*SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFileWriterSegmentPlanJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCheckpointFileWriterBridgePlanJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimPlaybackFileWriterBridgePlanJson \}\}/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimFileWriterCombinePlanJson \}\}/);
});

test("formula contract keeps template fallback behavior for standard template families", () => {
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("trig-unit-wave"), "trig-unit-wave"), "$y = a\\\\sin(bx+c)$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("calculus-rate-area"), "calculus-rate-area"), "$dy/dx$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("function-family"), "function-family"), "$f(x)$");
  assert.equal(formulaForThreeDScene(familyForVisualizationTemplate("statistics-distribution"), "statistics-distribution"), "$\\\\bar{x} \\\\pm s$");
});

test("ThreeDLabCanvas exposes the S11/S22 smoke-test surface contract", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const overlaySource = fs.readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");
  const surfaceSource = `${source}\n${overlaySource}`;

  for (const attribute of threeDCanvasRequiredDataAttributes) {
    assert.match(source, new RegExp(attribute.replace(/-/g, "-")));
  }

  for (const selector of threeDCanvasRequiredSelectors) {
    assert.match(surfaceSource, new RegExp(selector));
  }

  assert.equal(threeDCanvasRendererContract.gl.preserveDrawingBuffer, true);
  assert.equal(threeDCanvasRendererContract.renderer, threeDCanvasSnapshotContract.renderer);
  assert.match(source, /data-viz-renderer=\{threeDCanvasRendererContract\.renderer\}/);
  assert.match(source, new RegExp(`event\\.key === "${threeDCanvasKeyboardContract.resetCameraKey}"`));
});

test("ThreeDLabCanvas surface contract covers every EvidenceHarness data attribute", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const evidenceAttributes = dataVizAttributesFromSource(evidenceSource);
  const requiredAttributes = new Set(threeDCanvasRequiredDataAttributes);
  const canvasAttributes = new Set(dataVizAttributesFromSource(canvasSource));

  assert.deepEqual(
    evidenceAttributes.filter((attribute) => !requiredAttributes.has(attribute as (typeof threeDCanvasRequiredDataAttributes)[number])),
    []
  );
  assert.deepEqual(
    evidenceAttributes.filter((attribute) => !canvasAttributes.has(attribute)),
    []
  );
});

test("ThreeDLabCanvas exposes MAIS Manim Scene-level render group evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const familyCacheSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectFamilyCache.ts", "utf8");
  const familySource = fs.readFileSync("components/visualizations/three/manim/mathMobjectFamily.ts", "utf8");
  const graphSource = fs.readFileSync("components/visualizations/three/manim/mathSceneGraph.ts", "utf8");
  const addBridgeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneAddMobjectBridge.ts", "utf8");
  const clearBridgeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneClearMobjectBridge.ts", "utf8");
  const removeAllExceptBridgeSource = fs.readFileSync(
    "components/visualizations/three/manim/mathSceneRemoveAllExceptMobjectBridge.ts",
    "utf8"
  );
  const bringToFrontBridgeSource = fs.readFileSync(
    "components/visualizations/three/manim/mathSceneBringToFrontMobjectBridge.ts",
    "utf8"
  );
  const sendToBackBridgeSource = fs.readFileSync(
    "components/visualizations/three/manim/mathSceneSendToBackMobjectBridge.ts",
    "utf8"
  );
  const replaceBridgeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneReplaceMobjectBridge.ts", "utf8");
  const removeBridgeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRemoveMobjectBridge.ts", "utf8");
  const renderBatchSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRenderBatches.ts", "utf8");
  const runtimeGraphSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeGraph.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");

  for (const attribute of [
    "data-viz-mobject-family-cache-data-dirty-count",
    "data-viz-mobject-family-cache-family-dirty-count",
    "data-viz-mobject-family-cache-recomputed-count",
    "data-viz-mobject-family-cache-recomputed-ids",
    "data-viz-mobject-family-cache-reusable",
    "data-viz-mobject-family-cache-reused-count",
    "data-viz-mobject-family-cache-reused-ids",
    "data-viz-mobject-family-cache-source-contract",
    "data-viz-mobject-family-cache-status",
    "data-viz-mobject-family-cache-summary",
    "data-viz-mobject-family-cycle-count",
    "data-viz-mobject-family-max-depth",
    "data-viz-mobject-family-orphan-count",
    "data-viz-mobject-family-source-contract",
    "data-viz-scene-top-level-mobject-count",
    "data-viz-scene-render-group-count",
    "data-viz-scene-render-group-ids",
    "data-viz-scene-render-group-overlap-count",
    "data-viz-scene-render-group-overlap-ids",
    "data-viz-scene-renderable-count",
    "data-viz-scene-renderable-ids",
    "data-viz-scene-foreground-count",
    "data-viz-scene-foreground-ids",
    "data-viz-scene-fixed-in-frame-count",
    "data-viz-scene-fixed-in-frame-ids",
    "data-viz-manim-runtime-graph-excluded-object-ids",
    "data-viz-manim-runtime-graph-finite-bounding-box-count",
    "data-viz-manim-runtime-graph-fixed-in-frame-ids",
    "data-viz-manim-runtime-graph-foreground-ids",
    "data-viz-manim-runtime-graph-object-count",
    "data-viz-manim-runtime-graph-render-group-count",
    "data-viz-manim-runtime-graph-render-group-ids",
    "data-viz-manim-runtime-graph-source-contract",
    "data-viz-manim-runtime-graph-summary",
    "data-viz-manim-runtime-graph-top-level-ids"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene render-group evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(`${evidenceSource}\n${familyCacheSource}\n${runtimeGraphSource}`, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-graph-plan",
    "data-viz-scene-graph-json",
    "data-viz-manim-runtime-graph",
    "data-viz-manim-runtime-graph-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene graph JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(graphSource, /serializeSceneGraphSummary/);
  assert.match(familySource, /serializeMobjectFamilyIndex/);
  for (const selector of [
    "data-viz-mobject-family-plan",
    "data-viz-mobject-family-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Mobject.get_family JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ MOBJECT_FAMILY_SOURCE_CONTRACT, buildMobjectFamilyIndex, serializeMobjectFamilyIndex, summarizeMobjectFamilies \} from "\.\/manim\/mathMobjectFamily"/
  );
  assert.match(canvasSource, /const manimMobjectFamilyIndex = useMemo/);
  assert.match(canvasSource, /buildMobjectFamilyIndex\(manimRuntimeState\.objectGraph\)/);
  assert.match(canvasSource, /const manimMobjectFamilyJson = useMemo/);
  assert.match(canvasSource, /serializeMobjectFamilyIndex\(manimMobjectFamilyIndex\)/);
  assert.match(familyCacheSource, /serializeMobjectFamilyCachePlan/);
  for (const selector of [
    "data-viz-mobject-family-cache-plan",
    "data-viz-mobject-family-cache-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Mobject family-cache JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /from "\.\/manim\/mathMobjectFamilyCache"/
  );
  assert.match(canvasSource, /MOBJECT_FAMILY_CACHE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /const manimMobjectFamilyCachePlan = useMemo/);
  assert.match(canvasSource, /buildMobjectFamilyCachePlan\(\{/);
  assert.match(canvasSource, /const manimMobjectFamilyCacheJson = useMemo/);
  assert.match(canvasSource, /serializeMobjectFamilyCachePlan\(manimMobjectFamilyCachePlan\)/);
  assert.match(
    canvasSource,
    /import \{[^}]*serializeSceneGraphSummary[^}]*type MathSceneGraphSummary[^}]*\} from "\.\/manim\/mathSceneGraph"/
  );
  assert.match(canvasSource, /useMemo<MathSceneGraphSummary \| null>/);
  assert.match(canvasSource, /serializeSceneGraphSummary\(manimSceneGraphSummary\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneGraphJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /import \{[^}]*RUNTIME_SCENE_GRAPH_REFRESH_SOURCE_CONTRACT[^}]*runtimeGraphFrameDataAttributes[^}]*serializeMathSceneRuntimeGraphFrame[^}]*\} from "\.\/manim\/mathSceneRuntimeGraph"/
  );
  assert.match(runtimeGraphSource, /runtimeGraphFrameDataAttributes/);
  assert.match(runtimeGraphSource, /serializeMathSceneRuntimeGraphFrame/);
  assert.match(canvasSource, /const manimRuntimeGraphFrameAttributes = useMemo/);
  assert.match(canvasSource, /runtimeGraphFrameDataAttributes\(manimRuntimeGraphFrame\)/);
  assert.match(canvasSource, /serializeMathSceneRuntimeGraphFrame\(manimRuntimeGraphFrame\)/);
  assert.match(canvasSource, /data-viz-manim-runtime-graph-source-contract=/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRuntimeGraphFrameJson \}\}/);

  for (const attribute of [
    "data-viz-scene-membership-event-summary",
    "data-viz-scene-membership-source-contract",
    "data-viz-scene-membership-source-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene membership source evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(graphSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /sceneMembershipDataAttributes/);
  assert.match(graphSource, /SCENE_MEMBERSHIP_SOURCE_CONTRACT/);
  assert.match(graphSource, /serializeSceneMembershipState/);
  for (const selector of [
    "data-viz-scene-membership-plan",
    "data-viz-scene-membership-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.play membership JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_MEMBERSHIP_SOURCE_CONTRACT[^}]*SCENE_RESTRUCTURE_SOURCE_CONTRACT[^}]*serializeSceneMembershipState[^}]*serializeSceneRestructurePlan[^}]*type MathSceneMembershipState[^}]*type MathSceneRestructurePlan[^}]*\} from "\.\/manim\/mathSceneGraph"/
  );
  assert.match(canvasSource, /useMemo<MathSceneMembershipState \| null>/);
  assert.match(canvasSource, /serializeSceneMembershipState\(manimSceneMembershipState\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneMembershipJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-membership-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneMembershipSourceContract\s*\?\?\s*SCENE_MEMBERSHIP_SOURCE_CONTRACT/
  );

  for (const attribute of [
    "data-viz-manim-render-batch-count",
    "data-viz-manim-render-batch-object-count",
    "data-viz-manim-render-batch-ids",
    "data-viz-manim-render-batch-skipped-count",
    "data-viz-manim-render-batch-skipped-ids",
    "data-viz-manim-render-batch-source-contract",
    "data-viz-manim-render-batch-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim assemble_render_groups batch evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(renderBatchSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /buildSceneRenderBatches/);
  assert.match(evidenceSource, /sceneRenderBatchDataAttributes/);
  assert.match(renderBatchSource, /SCENE_RENDER_BATCH_SOURCE_CONTRACT/);
  assert.match(renderBatchSource, /serializeSceneRenderBatchPlan/);
  for (const selector of [
    "data-viz-manim-render-batch-plan",
    "data-viz-manim-render-batch-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim assemble_render_groups JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /import \{ SCENE_RENDER_BATCH_SOURCE_CONTRACT, serializeSceneRenderBatchPlan, type MathSceneRenderBatchPlan \} from "\.\/manim\/mathSceneRenderBatches"/
  );
  assert.match(canvasSource, /useMemo<MathSceneRenderBatchPlan \| null>/);
  assert.match(canvasSource, /serializeSceneRenderBatchPlan\(manimRenderBatchPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimRenderBatchJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-render-batch-source-contract"\]\s*\?\?\s*SCENE_RENDER_BATCH_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /"Scene\.assemble_render_groups\|render_groups replacement\|adjacent batch clustering"/
  );

  for (const attribute of [
    "data-viz-scene-restructure-detached-root-count",
    "data-viz-scene-restructure-detached-root-ids",
    "data-viz-scene-restructure-parent-count",
    "data-viz-scene-restructure-parent-ids",
    "data-viz-scene-restructure-removed-count",
    "data-viz-scene-restructure-removed-ids",
    "data-viz-scene-restructure-requested-count",
    "data-viz-scene-restructure-requested-ids",
    "data-viz-scene-restructure-source-contract",
    "data-viz-scene-restructure-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene restructure evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(graphSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-restructure-plan",
    "data-viz-scene-restructure-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.restructure_mobjects JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-clear-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-clear-mobject-after-foreground-ids",
    "data-viz-scene-clear-mobject-after-render-group-ids",
    "data-viz-scene-clear-mobject-after-scene-ids",
    "data-viz-scene-clear-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-clear-mobject-before-foreground-ids",
    "data-viz-scene-clear-mobject-before-render-group-ids",
    "data-viz-scene-clear-mobject-before-scene-ids",
    "data-viz-scene-clear-mobject-cleared",
    "data-viz-scene-clear-mobject-cleared-object-count",
    "data-viz-scene-clear-mobject-cleared-object-ids",
    "data-viz-scene-clear-mobject-object-catalog-count",
    "data-viz-scene-clear-mobject-source-contract",
    "data-viz-scene-clear-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.clear bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(clearBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-clear-mobject-plan",
    "data-viz-scene-clear-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.clear JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-remove-all-except-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-remove-all-except-mobject-after-foreground-ids",
    "data-viz-scene-remove-all-except-mobject-after-render-group-ids",
    "data-viz-scene-remove-all-except-mobject-after-scene-ids",
    "data-viz-scene-remove-all-except-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-remove-all-except-mobject-before-foreground-ids",
    "data-viz-scene-remove-all-except-mobject-before-render-group-ids",
    "data-viz-scene-remove-all-except-mobject-before-scene-ids",
    "data-viz-scene-remove-all-except-mobject-changed",
    "data-viz-scene-remove-all-except-mobject-kept-count",
    "data-viz-scene-remove-all-except-mobject-kept-ids",
    "data-viz-scene-remove-all-except-mobject-object-catalog-count",
    "data-viz-scene-remove-all-except-mobject-removed-count",
    "data-viz-scene-remove-all-except-mobject-removed-ids",
    "data-viz-scene-remove-all-except-mobject-requested-keep-ids",
    "data-viz-scene-remove-all-except-mobject-source-contract",
    "data-viz-scene-remove-all-except-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.remove_all_except bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(removeAllExceptBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-remove-all-except-mobject-plan",
    "data-viz-scene-remove-all-except-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.remove_all_except JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-bring-to-front-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-bring-to-front-mobject-after-foreground-ids",
    "data-viz-scene-bring-to-front-mobject-after-render-group-ids",
    "data-viz-scene-bring-to-front-mobject-after-scene-ids",
    "data-viz-scene-bring-to-front-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-bring-to-front-mobject-before-foreground-ids",
    "data-viz-scene-bring-to-front-mobject-before-render-group-ids",
    "data-viz-scene-bring-to-front-mobject-before-scene-ids",
    "data-viz-scene-bring-to-front-mobject-group",
    "data-viz-scene-bring-to-front-mobject-moved",
    "data-viz-scene-bring-to-front-mobject-next-index",
    "data-viz-scene-bring-to-front-mobject-object-id",
    "data-viz-scene-bring-to-front-mobject-previous-index",
    "data-viz-scene-bring-to-front-mobject-source-contract",
    "data-viz-scene-bring-to-front-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.bring_to_front bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(bringToFrontBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-bring-to-front-mobject-plan",
    "data-viz-scene-bring-to-front-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.bring_to_front JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-send-to-back-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-send-to-back-mobject-after-foreground-ids",
    "data-viz-scene-send-to-back-mobject-after-render-group-ids",
    "data-viz-scene-send-to-back-mobject-after-scene-ids",
    "data-viz-scene-send-to-back-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-send-to-back-mobject-before-foreground-ids",
    "data-viz-scene-send-to-back-mobject-before-render-group-ids",
    "data-viz-scene-send-to-back-mobject-before-scene-ids",
    "data-viz-scene-send-to-back-mobject-group",
    "data-viz-scene-send-to-back-mobject-moved",
    "data-viz-scene-send-to-back-mobject-next-index",
    "data-viz-scene-send-to-back-mobject-object-id",
    "data-viz-scene-send-to-back-mobject-previous-index",
    "data-viz-scene-send-to-back-mobject-source-contract",
    "data-viz-scene-send-to-back-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.send_to_back bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(sendToBackBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-send-to-back-mobject-plan",
    "data-viz-scene-send-to-back-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.send_to_back JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-add-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-add-mobject-after-foreground-ids",
    "data-viz-scene-add-mobject-after-render-group-ids",
    "data-viz-scene-add-mobject-after-scene-ids",
    "data-viz-scene-add-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-add-mobject-before-foreground-ids",
    "data-viz-scene-add-mobject-before-render-group-ids",
    "data-viz-scene-add-mobject-before-scene-ids",
    "data-viz-scene-add-mobject-added",
    "data-viz-scene-add-mobject-group",
    "data-viz-scene-add-mobject-object-id",
    "data-viz-scene-add-mobject-restored-family-count",
    "data-viz-scene-add-mobject-restored-family-ids",
    "data-viz-scene-add-mobject-source-contract",
    "data-viz-scene-add-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.add bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(addBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-add-mobject-plan",
    "data-viz-scene-add-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.add JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-replace-mobject-after-render-group-ids",
    "data-viz-scene-replace-mobject-before-render-group-ids",
    "data-viz-scene-replace-mobject-group",
    "data-viz-scene-replace-mobject-object-id",
    "data-viz-scene-replace-mobject-removed-family-ids",
    "data-viz-scene-replace-mobject-replaced",
    "data-viz-scene-replace-mobject-replacement-count",
    "data-viz-scene-replace-mobject-replacement-ids",
    "data-viz-scene-replace-mobject-requested-replacement-ids",
    "data-viz-scene-replace-mobject-restored-replacement-family-ids",
    "data-viz-scene-replace-mobject-source-contract",
    "data-viz-scene-replace-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.replace bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(replaceBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-replace-mobject-plan",
    "data-viz-scene-replace-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.replace JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  for (const attribute of [
    "data-viz-scene-remove-mobject-after-fixed-in-frame-ids",
    "data-viz-scene-remove-mobject-after-foreground-ids",
    "data-viz-scene-remove-mobject-after-render-group-ids",
    "data-viz-scene-remove-mobject-after-scene-ids",
    "data-viz-scene-remove-mobject-before-fixed-in-frame-ids",
    "data-viz-scene-remove-mobject-before-foreground-ids",
    "data-viz-scene-remove-mobject-before-render-group-ids",
    "data-viz-scene-remove-mobject-before-scene-ids",
    "data-viz-scene-remove-mobject-descendant-removed-ids",
    "data-viz-scene-remove-mobject-object-id",
    "data-viz-scene-remove-mobject-removed",
    "data-viz-scene-remove-mobject-removed-family-count",
    "data-viz-scene-remove-mobject-removed-family-ids",
    "data-viz-scene-remove-mobject-source-contract",
    "data-viz-scene-remove-mobject-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose Manim Scene.remove bridge evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(removeBridgeSource, new RegExp(attribute));
  }

  for (const selector of [
    "data-viz-scene-remove-mobject-plan",
    "data-viz-scene-remove-mobject-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Manim Scene.remove JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }

  assert.match(runtimeSource, /buildMathSceneRuntimeGraphFrame/);
  assert.match(runtimeGraphSource, /buildSceneGraphStore/);
  assert.match(runtimeGraphSource, /buildSceneMembershipState/);
  assert.match(runtimeGraphSource, /sceneRenderGroupIds/);
  assert.match(runtimeGraphSource, /summarizeSceneGraph/);
  assert.match(runtimeSource, /sceneGraph:/);
  assert.match(canvasSource, /sceneTopLevelMobjectCount/);
  assert.match(canvasSource, /sceneRenderGroupCount/);
  assert.match(canvasSource, /sceneRenderGroupIds/);
  assert.match(canvasSource, /sceneRenderGroupOverlapCount/);
  assert.match(canvasSource, /sceneRenderGroupOverlapIds/);
  assert.match(canvasSource, /sceneRenderableIds/);
  assert.match(canvasSource, /sceneForegroundIds/);
  assert.match(canvasSource, /sceneFixedInFrameIds/);
  assert.match(canvasSource, /sceneRestructureSummary/);
  assert.match(graphSource, /SCENE_RESTRUCTURE_SOURCE_CONTRACT/);
  assert.match(graphSource, /serializeSceneRestructurePlan/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_RESTRUCTURE_SOURCE_CONTRACT[^}]*serializeSceneRestructurePlan[^}]*type MathSceneRestructurePlan[^}]*\} from "\.\/manim\/mathSceneGraph"/
  );
  assert.match(canvasSource, /useMemo<MathSceneRestructurePlan \| null>/);
  assert.match(canvasSource, /serializeSceneRestructurePlan\(manimSceneRestructurePlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRestructureJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-restructure-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneRestructureSourceContract\s*\?\?\s*SCENE_RESTRUCTURE_SOURCE_CONTRACT/
  );
  assert.match(evidenceSource, /mathMobjectFamilyCache/);
  assert.match(evidenceSource, /restructureSceneMobjects/);
  assert.match(evidenceSource, /sceneRestructureSourceContract/);
  assert.match(evidenceSource, /sceneRestructureDataAttributes/);
  assert.match(clearBridgeSource, /SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(clearBridgeSource, /buildSceneClearMobjectBridgePlan/);
  assert.match(clearBridgeSource, /serializeSceneClearMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneClearMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneClearMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneClearMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneClearMobjectBridgePlan[^}]*type MathSceneClearMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneClearMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneClearMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneClearMobjectBridgePlan\(manimSceneClearMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneClearMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-clear-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneClearMobjectSourceContract\s*\?\?\s*SCENE_CLEAR_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(removeAllExceptBridgeSource, /SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(removeAllExceptBridgeSource, /buildSceneRemoveAllExceptMobjectBridgePlan/);
  assert.match(removeAllExceptBridgeSource, /serializeSceneRemoveAllExceptMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneRemoveAllExceptMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneRemoveAllExceptMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneRemoveAllExceptMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneRemoveAllExceptMobjectBridgePlan[^}]*type MathSceneRemoveAllExceptMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneRemoveAllExceptMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneRemoveAllExceptMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneRemoveAllExceptMobjectBridgePlan\(manimSceneRemoveAllExceptMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRemoveAllExceptMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-remove-all-except-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneRemoveAllExceptMobjectSourceContract\s*\?\?\s*SCENE_REMOVE_ALL_EXCEPT_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(bringToFrontBridgeSource, /SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(bringToFrontBridgeSource, /buildSceneBringToFrontMobjectBridgePlan/);
  assert.match(bringToFrontBridgeSource, /serializeSceneBringToFrontMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneBringToFrontMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneBringToFrontMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneBringToFrontMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneBringToFrontMobjectBridgePlan[^}]*type MathSceneBringToFrontMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneBringToFrontMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneBringToFrontMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneBringToFrontMobjectBridgePlan\(manimSceneBringToFrontMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneBringToFrontMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-bring-to-front-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneBringToFrontMobjectSourceContract\s*\?\?\s*SCENE_BRING_TO_FRONT_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(sendToBackBridgeSource, /SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(sendToBackBridgeSource, /buildSceneSendToBackMobjectBridgePlan/);
  assert.match(sendToBackBridgeSource, /serializeSceneSendToBackMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneSendToBackMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneSendToBackMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneSendToBackMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneSendToBackMobjectBridgePlan[^}]*type MathSceneSendToBackMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneSendToBackMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneSendToBackMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneSendToBackMobjectBridgePlan\(manimSceneSendToBackMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneSendToBackMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-send-to-back-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneSendToBackMobjectSourceContract\s*\?\?\s*SCENE_SEND_TO_BACK_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(addBridgeSource, /SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(addBridgeSource, /buildSceneAddMobjectBridgePlan/);
  assert.match(addBridgeSource, /serializeSceneAddMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneAddMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneAddMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneAddMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneAddMobjectBridgePlan[^}]*type MathSceneAddMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneAddMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneAddMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneAddMobjectBridgePlan\(manimSceneAddMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneAddMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-add-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneAddMobjectSourceContract\s*\?\?\s*SCENE_ADD_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(replaceBridgeSource, /SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(replaceBridgeSource, /buildSceneReplaceMobjectBridgePlan/);
  assert.match(replaceBridgeSource, /serializeSceneReplaceMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneReplaceMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneReplaceMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneReplaceMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneReplaceMobjectBridgePlan[^}]*type MathSceneReplaceMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneReplaceMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneReplaceMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneReplaceMobjectBridgePlan\(manimSceneReplaceMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneReplaceMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-replace-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneReplaceMobjectSourceContract\s*\?\?\s*SCENE_REPLACE_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(removeBridgeSource, /SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(removeBridgeSource, /buildSceneRemoveMobjectBridgePlan/);
  assert.match(removeBridgeSource, /serializeSceneRemoveMobjectBridgePlan/);
  assert.match(evidenceSource, /buildSceneRemoveMobjectBridgePlan/);
  assert.match(evidenceSource, /sceneRemoveMobjectBridgeDataAttributes/);
  assert.match(evidenceSource, /sceneRemoveMobjectSourceContract/);
  assert.match(
    canvasSource,
    /import \{[^}]*SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT[^}]*serializeSceneRemoveMobjectBridgePlan[^}]*type MathSceneRemoveMobjectBridgePlan[^}]*\} from "\.\/manim\/mathSceneRemoveMobjectBridge"/
  );
  assert.match(canvasSource, /useMemo<MathSceneRemoveMobjectBridgePlan \| null>/);
  assert.match(canvasSource, /serializeSceneRemoveMobjectBridgePlan\(manimSceneRemoveMobjectPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimSceneRemoveMobjectJson \?\? "" \}\}/);
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-scene-remove-mobject-source-contract"\]\s*\?\?\s*runtimeDiagnostics\.sceneRemoveMobjectSourceContract\s*\?\?\s*SCENE_REMOVE_MOBJECT_BRIDGE_SOURCE_CONTRACT/
  );
  assert.match(canvasSource, /mobjectFamilyCacheStatus/);
  assert.match(canvasSource, /mobjectFamilyCacheSummary/);
});

test("ThreeDLabCanvas exposes MAIS Manim scene-authored animation plan evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const animationRuntimeSource = fs.readFileSync("components/visualizations/three/manim/mathAnimationRuntime.ts", "utf8");
  const animationCompositionSource = fs.readFileSync("components/visualizations/three/manim/mathAnimationComposition.ts", "utf8");
  const transformFamilyAlignmentSource = fs.readFileSync("components/visualizations/three/manim/mathTransformFamilyAlignment.ts", "utf8");
  const transformPointAlignmentSource = fs.readFileSync("components/visualizations/three/manim/mathTransformPointAlignmentBridge.ts", "utf8");
  const transformDataLockSource = fs.readFileSync("components/visualizations/three/manim/mathTransformDataLock.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-active-animation-node-count",
    "data-viz-manim-active-animation-object-id",
    "data-viz-manim-active-animation-plan-id",
    "data-viz-manim-active-animation-plan-ids",
    "data-viz-manim-active-animation-progress",
    "data-viz-manim-active-animation-node-progress-summary",
    "data-viz-manim-active-animation-target-id",
    "data-viz-manim-animation-runtime-source-contract",
    "data-viz-manim-animation-runtime-mobject-interpolate-policy",
    "data-viz-manim-animation-runtime-active",
    "data-viz-manim-animation-runtime-active-plan-count",
    "data-viz-manim-animation-runtime-active-plan-ids",
    "data-viz-manim-animation-runtime-node-count",
    "data-viz-manim-animation-runtime-object-id",
    "data-viz-manim-animation-runtime-object-ids",
    "data-viz-manim-animation-runtime-target-object-id",
    "data-viz-manim-animation-runtime-progress",
    "data-viz-manim-animation-runtime-raw-progress-range",
    "data-viz-manim-animation-runtime-lagged-progress-range",
    "data-viz-manim-animation-runtime-eased-progress-range",
    "data-viz-manim-animation-runtime-rate-functions",
    "data-viz-manim-animation-runtime-render-kind-summary",
    "data-viz-manim-animation-runtime-finite-bounding-box-count",
    "data-viz-manim-animation-runtime-summary",
    "data-viz-manim-transform-interpolate-bounding-box-count",
    "data-viz-manim-transform-interpolate-bounding-box-finite-count",
    "data-viz-manim-transform-interpolate-bounding-box-empty-count",
    "data-viz-manim-transform-interpolate-bounding-box-object-ids",
    "data-viz-manim-transform-interpolate-bounding-box-summary",
    "data-viz-manim-transform-interpolate-uniform-clipping-plane-count",
    "data-viz-manim-transform-interpolate-uniform-count",
    "data-viz-manim-transform-interpolate-uniform-object-ids",
    "data-viz-manim-transform-interpolate-uniform-opacity-range",
    "data-viz-manim-transform-interpolate-uniform-opacity-sample-count",
    "data-viz-manim-transform-interpolate-uniform-source-summary",
    "data-viz-manim-transform-interpolate-uniform-summary",
    "data-viz-manim-transform-interpolate-field-arc-path-node-count",
    "data-viz-manim-transform-interpolate-field-bounding-box-node-count",
    "data-viz-manim-transform-interpolate-field-node-count",
    "data-viz-manim-transform-interpolate-field-non-point-count",
    "data-viz-manim-transform-interpolate-field-non-point-policy",
    "data-viz-manim-transform-interpolate-field-object-ids",
    "data-viz-manim-transform-interpolate-field-path-summary",
    "data-viz-manim-transform-interpolate-field-pointlike-count",
    "data-viz-manim-transform-interpolate-field-pointlike-policy",
    "data-viz-manim-transform-interpolate-field-pointlike-summary",
    "data-viz-manim-transform-interpolate-field-source-summary",
    "data-viz-manim-transform-interpolate-field-straight-path-node-count",
    "data-viz-manim-transform-interpolate-field-style-node-count",
    "data-viz-manim-transform-interpolate-field-summary",
    "data-viz-manim-transform-interpolate-field-uniform-node-count",
    "data-viz-manim-transform-family-alignment-entering-count",
    "data-viz-manim-transform-family-alignment-entry-count",
    "data-viz-manim-transform-family-alignment-exiting-count",
    "data-viz-manim-transform-family-alignment-family-pair-sequence",
    "data-viz-manim-transform-family-alignment-family-zip-complete-count",
    "data-viz-manim-transform-family-alignment-family-zip-incomplete-count",
    "data-viz-manim-transform-family-alignment-family-zip-policy",
    "data-viz-manim-transform-family-alignment-family-zip-sequence",
    "data-viz-manim-transform-family-alignment-family-zip-tuple-count",
    "data-viz-manim-transform-family-alignment-matched-count",
    "data-viz-manim-transform-family-alignment-max-depth",
    "data-viz-manim-transform-family-alignment-point-count-policy",
    "data-viz-manim-transform-family-alignment-source-contract",
    "data-viz-manim-transform-family-alignment-source-root-id",
    "data-viz-manim-transform-family-alignment-summary",
    "data-viz-manim-transform-family-alignment-target-root-id",
    "data-viz-manim-transform-family-alignment-type-mismatch-count",
    "data-viz-manim-transform-point-alignment-compatible-count",
    "data-viz-manim-transform-point-alignment-matched-count",
    "data-viz-manim-transform-point-alignment-policy-summary",
    "data-viz-manim-transform-point-alignment-resampled-count",
    "data-viz-manim-transform-point-alignment-row-summary",
    "data-viz-manim-transform-point-alignment-source-contract",
    "data-viz-manim-transform-point-alignment-source-root-id",
    "data-viz-manim-transform-point-alignment-summary",
    "data-viz-manim-transform-point-alignment-target-root-id",
    "data-viz-manim-transform-point-alignment-total-point-count",
    "data-viz-manim-transform-point-alignment-vmobject-aligned-curve-count",
    "data-viz-manim-transform-point-alignment-vmobject-source-contract",
    "data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count",
    "data-viz-manim-transform-point-alignment-vmobject-target-insert-n-curves-count",
    "data-viz-manim-transform-data-lock-alignment-summary",
    "data-viz-manim-transform-data-lock-kind-summary",
    "data-viz-manim-transform-data-lock-locked-point-count",
    "data-viz-manim-transform-data-lock-moving-point-count",
    "data-viz-manim-transform-data-lock-object-ids",
    "data-viz-manim-transform-data-lock-plan-count",
    "data-viz-manim-transform-data-lock-source-contract",
    "data-viz-manim-transform-data-lock-summary",
    "data-viz-manim-transform-data-lock-target-object-ids",
    "data-viz-manim-transform-data-lock-total-point-count",
    "data-viz-manim-animation-plan-count",
    "data-viz-manim-animation-operation-count",
    "data-viz-manim-animation-object-count",
    "data-viz-manim-animation-composition-count",
    "data-viz-manim-animation-composition-window-count",
    "data-viz-manim-animation-composition-modes",
    "data-viz-manim-animation-composition-duration",
    "data-viz-manim-animation-composition-issue-count",
    "data-viz-manim-animation-composition-active-id",
    "data-viz-manim-animation-composition-active-type",
    "data-viz-manim-animation-composition-active-window-count",
    "data-viz-manim-animation-composition-active-window-ids",
    "data-viz-manim-animation-composition-completed-window-count",
    "data-viz-manim-animation-composition-completed-window-ids",
    "data-viz-manim-animation-composition-pending-window-count",
    "data-viz-manim-animation-composition-pending-window-ids",
    "data-viz-manim-animation-composition-frame-elapsed-seconds",
    "data-viz-manim-animation-composition-frame-progress",
    "data-viz-manim-animation-composition-timing-policy",
    "data-viz-manim-animation-composition-window-summary",
    "data-viz-manim-animation-composition-source-contract",
    "data-viz-manim-animation-composition-frame-summary",
    "data-viz-manim-transform-step-count"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose scene-authored Manim animation plans to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /summarizeSceneAnimationPlans/);
  assert.match(evidenceSource, /buildAnimationCompositionFrameEvidence/);
  assert.match(evidenceSource, /animationCompositionFrameEvidenceDataAttributes/);
  assert.match(animationCompositionSource, /ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT/);
  assert.match(animationCompositionSource, /serializeAnimationCompositionFrameEvidence/);
  assert.match(
    canvasSource,
    /import \{ ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT, buildSceneAnimationCompositionPlans, serializeAnimationCompositionFrameEvidence, type AnimationCompositionFrameEvidence \} from "\.\/manim\/mathAnimationComposition"/
  );
  assert.match(canvasSource, /useMemo<AnimationCompositionFrameEvidence \| null>/);
  assert.match(canvasSource, /serializeAnimationCompositionFrameEvidence\(manimAnimationCompositionEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAnimationCompositionJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-animation-composition-plan",
    "data-viz-manim-animation-composition-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose AnimationGroup/LaggedStart JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-animation-composition-source-contract"\]\s*\?\?\s*ANIMATION_COMPOSITION_FRAME_SOURCE_CONTRACT/
  );
  assert.doesNotMatch(
    canvasSource,
    /manimEvidenceAttributes\?\.\["data-viz-manim-animation-composition-source-contract"\]\s*\?\?\s*"none"/
  );
  assert.match(evidenceSource, /buildMathAnimationRuntimeFrame/);
  assert.match(evidenceSource, /buildMathAnimationRuntimeEvidence/);
  assert.match(evidenceSource, /animationRuntimeEvidenceDataAttributes/);
  assert.match(animationRuntimeSource, /ANIMATION_RUNTIME_SOURCE_CONTRACT/);
  assert.match(animationRuntimeSource, /MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY/);
  assert.match(animationRuntimeSource, /MOBJECT_INTERPOLATE_RENDER_POLICY/);
  assert.match(animationRuntimeSource, /buildMathAnimationRuntimeBoundingBoxEvidence/);
  assert.match(animationRuntimeSource, /buildMathAnimationRuntimeInterpolateFieldEvidence/);
  assert.match(animationRuntimeSource, /serializeMathAnimationRuntimeBoundingBoxEvidence/);
  assert.match(animationRuntimeSource, /serializeMathAnimationRuntimeInterpolateFieldEvidence/);
  assert.match(animationRuntimeSource, /serializeMathAnimationRuntimeEvidence/);
  assert.match(animationRuntimeSource, /serializeMathAnimationRuntimeUniformEvidence/);
  for (const importedName of [
    "ANIMATION_RUNTIME_SOURCE_CONTRACT",
    "MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY",
    "MOBJECT_INTERPOLATE_RENDER_POLICY",
    "serializeMathAnimationRuntimeBoundingBoxEvidence",
    "serializeMathAnimationRuntimeEvidence",
    "serializeMathAnimationRuntimeInterpolateFieldEvidence",
    "serializeMathAnimationRuntimeUniformEvidence",
    "type MathAnimationRuntimeBoundingBoxEvidence",
    "type MathAnimationRuntimeEvidence",
    "type MathAnimationRuntimeInterpolateFieldEvidence",
    "type MathAnimationRuntimeUniformEvidence"
  ]) {
    assert.match(canvasSource, new RegExp(importedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(canvasSource, /useMemo<MathAnimationRuntimeEvidence \| null>/);
  assert.match(canvasSource, /serializeMathAnimationRuntimeEvidence\(manimAnimationRuntimeEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimAnimationRuntimeJson \?\? "" \}\}/);
  assert.match(canvasSource, /useMemo<MathAnimationRuntimeBoundingBoxEvidence \| null>/);
  assert.match(canvasSource, /sourceSummary: MOBJECT_INTERPOLATE_DATA_SOURCE_SUMMARY/);
  assert.match(canvasSource, /serializeMathAnimationRuntimeBoundingBoxEvidence\(manimTransformInterpolateBoundingBoxEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformInterpolateBoundingBoxJson \?\? "" \}\}/);
  assert.match(canvasSource, /useMemo<MathAnimationRuntimeUniformEvidence \| null>/);
  assert.match(canvasSource, /serializeMathAnimationRuntimeUniformEvidence\(manimTransformInterpolateUniformEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformInterpolateUniformJson \?\? "" \}\}/);
  assert.match(canvasSource, /useMemo<MathAnimationRuntimeInterpolateFieldEvidence \| null>/);
  assert.match(canvasSource, /serializeMathAnimationRuntimeInterpolateFieldEvidence\(manimTransformInterpolateFieldEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformInterpolateFieldJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-animation-runtime-plan",
    "data-viz-manim-animation-runtime-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Animation.interpolate runtime JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  for (const selector of [
    "data-viz-manim-transform-interpolate-bounding-box-plan",
    "data-viz-manim-transform-interpolate-bounding-box-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject.interpolate bounding-box JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  for (const selector of [
    "data-viz-manim-transform-interpolate-uniform-plan",
    "data-viz-manim-transform-interpolate-uniform-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject.interpolate uniform JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  for (const selector of [
    "data-viz-manim-transform-interpolate-field-plan",
    "data-viz-manim-transform-interpolate-field-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject.interpolate field JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /data-viz-manim-animation-runtime-source-contract=\{[\s\S]*ANIMATION_RUNTIME_SOURCE_CONTRACT/);
  assert.doesNotMatch(
    canvasSource,
    /"Animation\.interpolate\(alpha\)->interpolate_mobject with lagged sub-alpha and Mobject\.interpolate render-state updates"/
  );
  assert.match(animationRuntimeSource, /buildMathAnimationRuntimeEvidence/);
  assert.match(animationRuntimeSource, /animationRuntimeEvidenceDataAttributes/);
  assert.match(evidenceSource, /buildTransformFamilyAlignment/);
  assert.match(evidenceSource, /transformFamilyAlignmentDataAttributes/);
  assert.match(evidenceSource, /manimTransformFamilyAlignmentFamilyPairSequence/);
  assert.match(evidenceSource, /manimTransformFamilyAlignmentFamilyZipSequence/);
  assert.match(evidenceSource, /manimTransformFamilyAlignmentPointCountPolicy/);
  assert.match(evidenceSource, /TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY/);
  assert.match(transformFamilyAlignmentSource, /serializeTransformFamilyAlignmentPlan/);
  assert.match(canvasSource, /TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY/);
  assert.match(canvasSource, /TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT/);
  assert.match(canvasSource, /TRANSFORM_FAMILY_ALIGNMENT_ZIP_POLICY/);
  assert.match(canvasSource, /serializeTransformFamilyAlignmentPlan/);
  assert.match(canvasSource, /type TransformFamilyAlignmentPlan/);
  assert.match(canvasSource, /useMemo<TransformFamilyAlignmentPlan \| null>/);
  assert.match(canvasSource, /serializeTransformFamilyAlignmentPlan\(manimTransformFamilyAlignmentPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformFamilyAlignmentJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-transform-family-alignment-plan",
    "data-viz-manim-transform-family-alignment-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Transform.begin family-alignment JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /manimTransformFamilyAlignmentPointCountPolicy:\s*TRANSFORM_FAMILY_ALIGNMENT_POINT_COUNT_POLICY/);
  assert.match(canvasSource, /manimTransformFamilyAlignmentSourceContract:\s*TRANSFORM_FAMILY_ALIGNMENT_SOURCE_CONTRACT/);
  assert.doesNotMatch(canvasSource, /"align-point-counts-before-interpolate"/);
  assert.doesNotMatch(
    canvasSource,
    /"Transform\.begin -> Mobject\.align_data_and_family: recursively align submobject families and point counts before interpolation"/
  );
  assert.match(evidenceSource, /buildTransformPointAlignmentBridgePlan/);
  assert.match(evidenceSource, /transformPointAlignmentBridgeDataAttributes/);
  assert.match(evidenceSource, /TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(evidenceSource, /manimTransformPointAlignmentRowSummary/);
  assert.match(transformPointAlignmentSource, /pointsForRuntimeRenderState/);
  assert.match(transformPointAlignmentSource, /serializeTransformPointAlignmentBridgePlan/);
  assert.match(transformPointAlignmentSource, /transformPointAlignmentBridgeDataAttributes/);
  for (const importedName of [
    "buildTransformPointAlignmentBridgePlan",
    "serializeTransformPointAlignmentBridgePlan",
    "TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT",
    "transformPointAlignmentBridgeDataAttributes",
    "type TransformPointAlignmentBridgePlan"
  ]) {
    assert.match(canvasSource, new RegExp(importedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(canvasSource, /useMemo<TransformPointAlignmentBridgePlan \| null>/);
  assert.match(canvasSource, /buildTransformPointAlignmentBridgePlan\(manimTransformFamilyAlignmentPlan\)/);
  assert.match(canvasSource, /transformPointAlignmentBridgeDataAttributes\(manimTransformPointAlignmentPlan\)/);
  assert.match(canvasSource, /serializeTransformPointAlignmentBridgePlan\(manimTransformPointAlignmentPlan\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformPointAlignmentJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-transform-point-alignment-plan",
    "data-viz-manim-transform-point-alignment-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Mobject.align_points point-count JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /manimTransformPointAlignmentSourceContract:\s*TRANSFORM_POINT_ALIGNMENT_BRIDGE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-transform-point-alignment-summary=/);
  assert.match(canvasSource, /data-viz-manim-transform-point-alignment-row-summary=/);
  assert.match(canvasSource, /data-viz-manim-transform-point-alignment-policy-summary=/);
  assert.match(canvasSource, /data-viz-manim-transform-point-alignment-vmobject-source-insert-n-curves-count=/);
  assert.doesNotMatch(
    canvasSource,
    /"Mobject\.align_data_and_family\|align_points: align matched source\/target render-data point counts before Transform\.interpolate_mobject"/
  );
  assert.match(evidenceSource, /summarizeTransformDataLockEvidence/);
  assert.match(evidenceSource, /transformDataLockEvidenceDataAttributes/);
  assert.match(evidenceSource, /manimTransformDataLockAlignmentSummary/);
  assert.match(evidenceSource, /TRANSFORM_DATA_LOCK_SOURCE_CONTRACT/);
  assert.match(transformDataLockSource, /alignmentSummary/);
  assert.match(transformDataLockSource, /data-viz-manim-transform-data-lock-alignment-summary/);
  assert.match(transformDataLockSource, /serializeTransformDataLockEvidence/);
  assert.match(
    canvasSource,
    /import \{ TRANSFORM_DATA_LOCK_SOURCE_CONTRACT, serializeTransformDataLockEvidence, type TransformDataLockEvidence \} from "\.\/manim\/mathTransformDataLock"/
  );
  assert.match(canvasSource, /useMemo<TransformDataLockEvidence \| null>/);
  assert.match(canvasSource, /serializeTransformDataLockEvidence\(manimTransformDataLockEvidence\)/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimTransformDataLockJson \?\? "" \}\}/);
  for (const selector of [
    "data-viz-manim-transform-data-lock-plan",
    "data-viz-manim-transform-data-lock-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose Transform.begin data-lock JSON payload evidence`
    );
    assert.match(canvasSource, new RegExp(selector));
  }
  assert.match(canvasSource, /manimTransformDataLockSourceContract: TRANSFORM_DATA_LOCK_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-transform-data-lock-alignment-summary=/);
  assert.doesNotMatch(canvasSource, /"Transform\.begin:lock_matching_data"/);
  assert.match(canvasSource, /manimAnimationPlanCount/);
  assert.match(canvasSource, /manimAnimationCompositionCount/);
  assert.match(canvasSource, /manimActiveAnimationPlanId/);
  assert.match(canvasSource, /manimActiveAnimationPlanIds/);
  assert.match(canvasSource, /manimActiveAnimationProgress/);
  assert.match(canvasSource, /data-viz-manim-transform-family-alignment-summary=/);
  assert.match(canvasSource, /data-viz-manim-transform-family-alignment-family-pair-sequence=/);
  assert.match(canvasSource, /data-viz-manim-transform-family-alignment-family-zip-sequence=/);
  assert.match(canvasSource, /data-viz-manim-transform-family-alignment-family-zip-policy=/);
  assert.match(canvasSource, /data-viz-manim-transform-family-alignment-point-count-policy=/);
  assert.match(canvasSource, /data-viz-manim-transform-data-lock-summary=/);
  assert.match(canvasSource, /manimTransformStepCount/);
});

test("ThreeDLabCanvas exposes MAIS Manim frame-audit evidence for browser QA", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const frameAuditSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameAudit.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-frame-audit-active-frame-count",
    "data-viz-manim-frame-audit-active-animation-node-progress-summary",
    "data-viz-manim-frame-audit-active-plan-ids",
    "data-viz-manim-frame-audit-animation-plan-frame-summary",
    "data-viz-manim-frame-audit-authored-plan-count",
    "data-viz-manim-frame-audit-camera-shot-summary",
    "data-viz-manim-frame-audit-capture-height",
    "data-viz-manim-frame-audit-capture-width",
    "data-viz-manim-frame-audit-director-trace-camera-to-key-frame-count",
    "data-viz-manim-frame-audit-director-trace-formula-fixed-key-frame-count",
    "data-viz-manim-frame-audit-director-trace-key-frame-count",
    "data-viz-manim-frame-audit-director-trace-source-contract",
    "data-viz-manim-frame-audit-director-trace-summary",
    "data-viz-manim-frame-audit-director-trace-svg-morph-progress-range",
    "data-viz-manim-frame-audit-director-trace-timeline",
    "data-viz-manim-frame-audit-delta-summary",
    "data-viz-manim-frame-audit-fps",
    "data-viz-manim-frame-audit-frame-interval",
    "data-viz-manim-frame-audit-frame-count",
    "data-viz-manim-frame-audit-formula-mobile-frame-count",
    "data-viz-manim-frame-audit-formula-layer-active-object-ids",
    "data-viz-manim-frame-audit-formula-layer-active-object-summary",
    "data-viz-manim-frame-audit-formula-layer-active-token-count-range",
    "data-viz-manim-frame-audit-formula-layer-bound-token-count-range",
    "data-viz-manim-frame-audit-formula-layer-camera-to-frame-count",
    "data-viz-manim-frame-audit-formula-layer-camera-to-screen-fixed-frame-count",
    "data-viz-manim-frame-audit-formula-layer-frame-count",
    "data-viz-manim-frame-audit-formula-layer-screen-fixed-frame-count",
    "data-viz-manim-frame-audit-formula-layer-source-contract",
    "data-viz-manim-frame-audit-formula-layer-summary",
    "data-viz-manim-frame-audit-formula-layer-token-count-range",
    "data-viz-manim-frame-audit-svg-morph-runtime-compatible-path-frame-count",
    "data-viz-manim-frame-audit-svg-morph-runtime-formula-ids",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-ids",
    "data-viz-manim-frame-audit-svg-morph-runtime-frame-path-preview",
    "data-viz-manim-frame-audit-svg-morph-runtime-issue-count",
    "data-viz-manim-frame-audit-svg-morph-runtime-path-frame-count",
    "data-viz-manim-frame-audit-svg-morph-runtime-progress-range",
    "data-viz-manim-frame-audit-svg-morph-runtime-sampled-frame-count",
    "data-viz-manim-frame-audit-svg-morph-runtime-source-contract",
    "data-viz-manim-frame-audit-svg-morph-runtime-summary",
    "data-viz-manim-frame-audit-max-progress",
    "data-viz-manim-frame-audit-max-updater-active-count",
    "data-viz-manim-frame-audit-max-updater-suspended-count",
    "data-viz-manim-frame-audit-min-progress",
    "data-viz-manim-frame-audit-mobject-point-frame-count",
    "data-viz-manim-frame-audit-mobject-point-ids",
    "data-viz-manim-frame-audit-mobject-point-position-range-summary",
    "data-viz-manim-frame-audit-move-along-vector-field-frame-count",
    "data-viz-manim-frame-audit-move-along-vector-field-moved-frame-count",
    "data-viz-manim-frame-audit-move-along-vector-field-object-ids",
    "data-viz-manim-frame-audit-move-along-vector-field-delta-summary",
    "data-viz-manim-frame-audit-move-along-vector-field-displacement-magnitude-range-summary",
    "data-viz-manim-frame-audit-move-along-vector-field-status-summary",
    "data-viz-manim-frame-audit-move-along-vector-field-summary",
    "data-viz-manim-frame-audit-move-along-vector-field-source-contract",
    "data-viz-manim-frame-audit-play-lifecycle-event-count",
    "data-viz-manim-frame-audit-play-lifecycle-event-first-key",
    "data-viz-manim-frame-audit-play-lifecycle-event-last-key",
    "data-viz-manim-frame-audit-play-lifecycle-event-phase-summary",
    "data-viz-manim-frame-audit-play-lifecycle-event-source-contract",
    "data-viz-manim-frame-audit-play-lifecycle-event-summary",
    "data-viz-manim-frame-audit-play-lifecycle-trace-animation-plan-summary",
    "data-viz-manim-frame-audit-play-lifecycle-trace-key-frame-count",
    "data-viz-manim-frame-audit-play-lifecycle-trace-phase-summary",
    "data-viz-manim-frame-audit-play-lifecycle-trace-source-contract",
    "data-viz-manim-frame-audit-play-lifecycle-trace-summary",
    "data-viz-manim-frame-audit-play-lifecycle-trace-timeline",
    "data-viz-manim-frame-audit-playback-phase-summary",
    "data-viz-manim-frame-audit-primary-animation-plan-frame-summary",
    "data-viz-manim-frame-audit-primary-animation-plan-progress-summary",
    "data-viz-manim-frame-audit-quality-preset",
    "data-viz-manim-frame-audit-renderer-mode",
    "data-viz-manim-frame-audit-expected-render-group-ids",
    "data-viz-manim-frame-audit-render-group-coverage-ready",
    "data-viz-manim-frame-audit-render-group-missing-frame-count",
    "data-viz-manim-frame-audit-render-group-overlap-summary",
    "data-viz-manim-frame-audit-render-group-summary",
    "data-viz-manim-frame-audit-sampled-camera-shot-ids",
    "data-viz-manim-frame-audit-sampled-playback-phase-ids",
    "data-viz-manim-frame-audit-sampled-render-group-ids",
    "data-viz-manim-frame-audit-sampling-mode",
    "data-viz-manim-frame-audit-sampled-step-ids",
    "data-viz-manim-frame-audit-camera-frame-active-shot-ids",
    "data-viz-manim-frame-audit-camera-frame-camera-to-frame-count",
    "data-viz-manim-frame-audit-camera-frame-current-frame-ids",
    "data-viz-manim-frame-audit-camera-frame-finite-matrix-entry-frame-count",
    "data-viz-manim-frame-audit-camera-frame-fixed-overlay-frame-count",
    "data-viz-manim-frame-audit-camera-frame-fov-range",
    "data-viz-manim-frame-audit-camera-frame-frame-count",
    "data-viz-manim-frame-audit-camera-frame-gamma-range",
    "data-viz-manim-frame-audit-camera-frame-phi-range",
    "data-viz-manim-frame-audit-camera-frame-position-range-summary",
    "data-viz-manim-frame-audit-camera-frame-progress-range",
    "data-viz-manim-frame-audit-camera-frame-source-contract",
    "data-viz-manim-frame-audit-camera-frame-summary",
    "data-viz-manim-frame-audit-camera-frame-target-range-summary",
    "data-viz-manim-frame-audit-camera-frame-theta-range",
    "data-viz-manim-frame-audit-camera-frame-uniform-center-range-summary",
    "data-viz-manim-frame-audit-camera-frame-uniform-summary",
    "data-viz-manim-frame-audit-camera-frame-view-inverse-max-error",
    "data-viz-manim-frame-audit-camera-frame-view-inverse-ready-frame-count",
    "data-viz-manim-frame-audit-scene-id",
    "data-viz-manim-frame-audit-skip-animations",
    "data-viz-manim-frame-audit-source-contract",
    "data-viz-manim-frame-audit-step-summary",
    "data-viz-manim-frame-audit-transform-interpolate-field-arc-path-node-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-bounding-box-node-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-node-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-non-point-policy",
    "data-viz-manim-frame-audit-transform-interpolate-field-object-ids",
    "data-viz-manim-frame-audit-transform-interpolate-field-path-summary",
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-policy",
    "data-viz-manim-frame-audit-transform-interpolate-field-pointlike-summary",
    "data-viz-manim-frame-audit-transform-interpolate-field-source-summary",
    "data-viz-manim-frame-audit-transform-interpolate-field-straight-path-node-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-style-node-frame-count",
    "data-viz-manim-frame-audit-transform-interpolate-field-summary",
    "data-viz-manim-frame-audit-transform-interpolate-field-uniform-node-frame-count",
    "data-viz-manim-frame-audit-value-tracker-animate-frame-count",
    "data-viz-manim-frame-audit-value-tracker-count",
    "data-viz-manim-frame-audit-value-tracker-frame-count",
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-count",
    "data-viz-manim-frame-audit-value-tracker-hidden-mobject-ids",
    "data-viz-manim-frame-audit-value-tracker-ids",
    "data-viz-manim-frame-audit-value-tracker-normalized-range-summary",
    "data-viz-manim-frame-audit-value-tracker-source-contract",
    "data-viz-manim-frame-audit-value-tracker-source-summary",
    "data-viz-manim-frame-audit-value-tracker-summary",
    "data-viz-manim-frame-audit-value-tracker-uniform-value-range-summary",
    "data-viz-manim-frame-audit-sub-alpha-complete-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-delayed-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-eased-range",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-covered-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-max-tuple-count",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-missing-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-policy",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-sequence-summary",
    "data-viz-manim-frame-audit-sub-alpha-family-zip-uncovered-object-ids",
    "data-viz-manim-frame-audit-sub-alpha-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-lagged-range",
    "data-viz-manim-frame-audit-sub-alpha-leading-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-node-window-summary",
    "data-viz-manim-frame-audit-sub-alpha-object-ids",
    "data-viz-manim-frame-audit-sub-alpha-partial-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-rate-function-ids",
    "data-viz-manim-frame-audit-sub-alpha-raw-range",
    "data-viz-manim-frame-audit-sub-alpha-staggered-node-frame-count",
    "data-viz-manim-frame-audit-sub-alpha-summary",
    "data-viz-manim-frame-audit-sub-alpha-zero-node-frame-count",
    "data-viz-manim-frame-audit-transform-frame-count",
    "data-viz-manim-frame-audit-updater-summary",
    "data-viz-manim-frame-audit-updater-execution-active-call-sequence-summary",
    "data-viz-manim-frame-audit-updater-execution-family-traversal-summary",
    "data-viz-manim-frame-audit-updater-execution-order-summary",
    "data-viz-manim-frame-audit-updater-execution-summary",
    "data-viz-manim-frame-audit-updater-suspension-owned-object-ids",
    "data-viz-manim-frame-audit-updater-suspension-owned-object-summary",
    "data-viz-manim-frame-audit-updater-suspension-count-summary",
    "data-viz-manim-frame-audit-updater-suspension-phase-summary",
    "data-viz-manim-frame-audit-updater-suspension-policy",
    "data-viz-manim-frame-audit-updater-suspension-reason-summary",
    "data-viz-manim-frame-audit-updater-suspension-source-contract",
    "data-viz-manim-frame-audit-updater-suspension-suspended-frame-count",
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-ids",
    "data-viz-manim-frame-audit-updater-suspension-suspended-object-summary",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-frame-count",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-ids",
    "data-viz-manim-frame-audit-updater-suspension-suspended-updater-summary",
    "data-viz-manim-frame-audit-updater-suspension-summary"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose pure frame-audit coverage to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(frameAuditSource, new RegExp(attribute));
  }

  assert.match(frameAuditSource, /SCENE_FRAME_AUDIT_SOURCE_CONTRACT/);
  assert.ok(
    threeDCanvasRequiredSelectors.includes("data-viz-manim-frame-audit-json"),
    "data-viz-manim-frame-audit-json should expose frame-audit summary evidence to browser tests"
  );
  assert.match(canvasSource, /data-viz-manim-frame-audit-json/);
  assert.match(
    canvasSource,
    /import \{ SCENE_FRAME_AUDIT_SOURCE_CONTRACT, SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT, buildMathSceneFrameAudit, frameAuditDataAttributes, serializeMathSceneFrameAuditSummary, summarizeMathSceneFrameAudit \} from "\.\/manim\/mathSceneFrameAudit"/
  );
  assert.match(canvasSource, /buildMathSceneFrameAudit\(manimScene, \{[\s\S]*fps: manimCaptureRenderQualityPlan\.captureFps/);
  assert.match(canvasSource, /renderQuality: manimCaptureRenderQualityPlan/);
  assert.match(canvasSource, /const manimFrameAuditSummary = useMemo\(/);
  assert.match(canvasSource, /summarizeMathSceneFrameAudit\(manimFrameAudit\)/);
  assert.match(canvasSource, /frameAuditDataAttributes\(manimFrameAuditSummary\)/);
  assert.match(canvasSource, /serializeMathSceneFrameAuditSummary\(manimFrameAuditSummary\)/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-source-contract=\{manimFrameAuditAttributes\?\.\["data-viz-manim-frame-audit-source-contract"\] \?\? SCENE_FRAME_AUDIT_SOURCE_CONTRACT\}/);
  assert.match(frameAuditSource, /SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /SCENE_PLAYBACK_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /directorTraceKeyFrames/);
  assert.match(frameAuditSource, /directorTraceTimeline/);
  assert.match(frameAuditSource, /buildScenePlaybackEventStream/);
  assert.match(frameAuditSource, /lifecycleEventPhaseSummary/);
  assert.match(frameAuditSource, /playLifecycleTraceKeyFrames/);
  assert.match(frameAuditSource, /playLifecycleTraceTimeline/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-director-trace-source-contract=/);
  assert.match(canvasSource, /SCENE_FRAME_DIRECTOR_TRACE_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-play-lifecycle-event-source-contract=/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-play-lifecycle-trace-source-contract=/);
  assert.match(canvasSource, /SCENE_PLAYBACK_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /subAlphaSummary/);
  assert.match(frameAuditSource, /subAlphaNodeFrameCount/);
  assert.match(frameAuditSource, /subAlphaFamilyZipCoveredNodeFrameCount/);
  assert.match(frameAuditSource, /buildMathValueTrackerPayload/);
  assert.match(frameAuditSource, /VALUE_TRACKER_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-value-tracker-source-contract=/);
  assert.match(canvasSource, /VALUE_TRACKER_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /buildCameraFramePayload/);
  assert.match(frameAuditSource, /CAMERA_FRAME_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-camera-frame-source-contract=/);
  assert.match(canvasSource, /CAMERA_FRAME_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /buildFormulaLayerState/);
  assert.match(frameAuditSource, /FORMULA_LAYER_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-formula-layer-source-contract=/);
  assert.match(canvasSource, /FORMULA_LAYER_SOURCE_CONTRACT/);
  assert.match(frameAuditSource, /buildFormulaSvgMorphRuntime/);
  assert.match(frameAuditSource, /FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-svg-morph-runtime-source-contract=/);
  assert.match(canvasSource, /FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-sub-alpha-family-zip-policy=/);
  assert.match(canvasSource, /data-viz-manim-frame-audit-sub-alpha-summary=/);
});

test("ThreeDLabCanvas exposes MAIS Manim ambient CameraFrame updater evidence", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathCameraFrameUpdater.ts", "utf8");

  for (const attribute of [
    "data-viz-manim-camera-ambient-rotation-degrees",
    "data-viz-manim-camera-updater-active-count",
    "data-viz-manim-camera-updater-active-ids",
    "data-viz-manim-camera-updater-active-seconds",
    "data-viz-manim-camera-updater-active-window-summary",
    "data-viz-manim-camera-updater-count",
    "data-viz-manim-camera-updater-source-contract",
    "data-viz-manim-camera-updater-time-mode"
  ]) {
    assert.ok(
      threeDCanvasRequiredDataAttributes.includes(attribute as (typeof threeDCanvasRequiredDataAttributes)[number]),
      `${attribute} should expose CameraFrame updater evidence to browser smoke tests`
    );
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(evidenceSource, new RegExp(attribute));
    assert.match(updaterSource, new RegExp(attribute));
  }

  assert.match(evidenceSource, /cameraAmbientRotationDegrees/);
  assert.match(evidenceSource, /cameraUpdaterActiveIds/);
  assert.match(
    canvasSource,
    /import \{ CAMERA_FRAME_UPDATER_SOURCE_CONTRACT, buildCameraFrameUpdaterPayload, serializeCameraFrameUpdaterPayload \} from "\.\/manim\/mathCameraFrameUpdater"/
  );
  assert.match(updaterSource, /buildCameraFrameUpdaterPayload/);
  assert.match(updaterSource, /serializeCameraFrameUpdaterPayload/);
  assert.match(canvasSource, /const manimCameraFrameUpdaterPayload = useMemo/);
  assert.match(canvasSource, /buildCameraFrameUpdaterPayload\(manimScene, manimElapsedSeconds\)/);
  assert.match(canvasSource, /const manimCameraFrameUpdaterJson = useMemo/);
  assert.match(canvasSource, /serializeCameraFrameUpdaterPayload\(manimCameraFrameUpdaterPayload\)/);
  assert.match(canvasSource, /data-viz-manim-camera-updater-plan/);
  assert.match(canvasSource, /data-viz-manim-camera-updater-json/);
  assert.match(canvasSource, /dangerouslySetInnerHTML=\{\{ __html: manimCameraFrameUpdaterJson \}\}/);
  assert.match(canvasSource, /runtimeDiagnostics\.cameraAmbientRotationDegrees\.toFixed\(3\)/);
  assert.match(canvasSource, /runtimeDiagnostics\.cameraUpdaterActiveIds/);
  assert.match(canvasSource, /data-viz-manim-camera-updater-source-contract=\{manimEvidenceAttributes\?\.\["data-viz-manim-camera-updater-source-contract"\] \?\? CAMERA_FRAME_UPDATER_SOURCE_CONTRACT\}/);

  for (const selector of [
    "data-viz-manim-camera-updater-plan",
    "data-viz-manim-camera-updater-json"
  ]) {
    assert.ok(
      threeDCanvasRequiredSelectors.includes(selector as (typeof threeDCanvasRequiredSelectors)[number]),
      `${selector} should expose structured CameraFrame updater payload evidence`
    );
  }
});

test("ThreeDLabCanvas marks readiness from the created WebGL canvas", () => {
  const source = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");

  assert.match(source, /const hasCreatedCanvasRef = useRef\(false\)/);
  assert.match(source, /const scheduleCanvasReady = useCallback/);
  assert.match(source, /hasCreatedCanvasRef\.current = true/);
  assert.match(source, /if \(hasCreatedCanvasRef\.current\) scheduleCanvasReady\(\)/);
  assert.match(source, /scheduleCanvasReady\(\)/);
  assert.doesNotMatch(source, /onCreated=\{\(\{ camera, gl, scene \}\) => \{\s*scene\.background = background;\s*gl\.setClearColor\(background\);\s*setCameraState\(formatCameraState\(camera\)\);\s*\}\}/);
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
  assert.match(configuredSource, /coverageTier: lab\?\.threeD\?\.coverageTier/);
  assert.match(configuredSource, /premiumLaunch: lab\?\.threeD\?\.premiumLaunch/);
  assert.match(configuredSource, /regionalPriority: lab\?\.threeD\?\.regionalPriority/);
  assert.match(configuredSource, /coverageTier=\{threeDRenderPlan\.coverageTier\}/);
  assert.match(configuredSource, /premiumLaunch=\{threeDRenderPlan\.premiumLaunch\}/);
  assert.match(configuredSource, /regionalPriority=\{threeDRenderPlan\.regionalPriority\}/);
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
  assert.match(
    canvasSource,
    /const resetCameraAndTimeline = useCallback\(\(\) => \{[\s\S]{0,1200}setCameraState\(formatThreeDCanvasCameraState\(threeDCanvasCameraContract\.defaultCamera\)\)/
  );
  assert.doesNotMatch(canvasSource, /onCameraState\(adaptedFrame\.smokeState\)/);
  assert.doesNotMatch(canvasSource, /useState\("azimuth=45\.00;elevation=35\.00;distance=4\.80"\)/);
});

test("ThreeDLabCanvas consumes a pure renderer snapshot contract", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const contractPath = "components/visualizations/three/threeDCanvasRendererContract.ts";

  assert.ok(fs.existsSync(contractPath), "Three.js canvas renderer settings should live in a pure contract module");

  const contractSource = fs.readFileSync(contractPath, "utf8");

  assert.match(canvasSource, /import \{ threeDCanvasRendererContract \} from "\.\/threeDCanvasRendererContract"/);
  assert.match(
    canvasSource,
    /const canvasBackgroundColor = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.backgroundColor : threeDCanvasRendererContract\.backgroundColor/
  );
  assert.match(canvasSource, /const background = useMemo\(\(\) => new THREE\.Color\(canvasBackgroundColor\), \[canvasBackgroundColor\]\)/);
  assert.match(
    canvasSource,
    /const canvasBackgroundAlpha = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.backgroundAlpha : 1/
  );
  assert.match(
    canvasSource,
    /const canvasTransparentBackground = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.transparentBackground : false/
  );
  assert.match(
    canvasSource,
    /const canvasRendererGl = useMemo\(\(\) => \(\{[\s\S]*\.\.\.threeDCanvasRendererContract\.gl[\s\S]*alpha: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.alpha : false[\s\S]*antialias: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.antialias : threeDCanvasRendererContract\.gl\.antialias[\s\S]*preserveDrawingBuffer: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.preserveDrawingBuffer : threeDCanvasRendererContract\.gl\.preserveDrawingBuffer[\s\S]*powerPreference: runtime === "mais-manim" \? manimRenderQualityBridgePlan\.powerPreference : "default"[\s\S]*\}\), \[manimRenderQualityBridgePlan, runtime\]\)/
  );
  assert.match(canvasSource, /function CanvasRenderQualityBridge\(/);
  assert.match(canvasSource, /scene\.background = transparentBackground \? null : background/);
  assert.match(canvasSource, /gl\.setClearColor\(background, backgroundAlpha\)/);
  assert.match(canvasSource, /<CanvasRenderQualityBridge[\s\S]*background=\{background\}[\s\S]*backgroundAlpha=\{canvasBackgroundAlpha\}[\s\S]*transparentBackground=\{canvasTransparentBackground\}/);
  assert.match(canvasSource, /data-viz-renderer=\{threeDCanvasRendererContract\.renderer\}/);
  assert.match(
    canvasSource,
    /const canvasDevicePixelRatio = runtime === "mais-manim" \? manimRenderQualityBridgePlan\.devicePixelRatio : threeDCanvasRendererContract\.devicePixelRatioRange/
  );
  assert.match(canvasSource, /dpr=\{canvasDevicePixelRatio\}/);
  assert.match(canvasSource, /gl=\{canvasRendererGl\}/);
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
