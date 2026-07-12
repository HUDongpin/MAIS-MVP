import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { materialPropsForMobject } from "./mathMobjectMaterialUniforms";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";
import { buildVMobjectStyle } from "./mathVMobjectStyle";
import {
  buildVMobjectLineRenderEvidence,
  buildVMobjectSurfaceFillRenderEvidence,
  vmobjectLineProps,
  vmobjectSurfaceFillMeshProps,
  vmobjectLineRenderEvidenceDataAttributes,
  vmobjectSurfaceFillRenderEvidenceDataAttributes
} from "./mathVMobjectRenderStyle";

test("adapts VMobject stroke style and Mobject material uniforms into line props", () => {
  const lineProps = vmobjectLineProps({
    fallbackColorRole: "function",
    fallbackOpacity: 1,
    fallbackStrokeWidth: 5,
    materialProps: materialPropsForMobject({ opacity: 0.5 }),
    style: buildVMobjectStyle({
      strokeOpacity: 0.4,
      strokeRole: "attention",
      strokeWidth: 7
    })
  });

  assert.deepEqual(lineProps, {
    colorRole: "attention",
    lineWidth: 7,
    opacity: 0.2,
    strokeOpacity: 0.4,
    strokeWidth: 7,
    transparent: true
  });
});

test("fills missing VMobject style from deterministic fallback line semantics", () => {
  const lineProps = vmobjectLineProps({
    fallbackColorRole: "trace",
    fallbackOpacity: 0.55,
    fallbackStrokeWidth: 3,
    materialProps: materialPropsForMobject()
  });

  assert.deepEqual(lineProps, {
    colorRole: "trace",
    lineWidth: 3,
    opacity: 0.55,
    strokeOpacity: 0.55,
    strokeWidth: 3,
    transparent: true
  });
});

test("triangulates VMobject surface fill style into deterministic mesh props", () => {
  const fillMeshProps = vmobjectSurfaceFillMeshProps({
    fallbackColorRole: "surface",
    materialProps: materialPropsForMobject({ opacity: 0.5 }),
    renderState: {
      columns: 3,
      kind: "surface",
      points: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
        [1, 0, 0],
        [1, 1, 1],
        [1, 2, 0]
      ],
      rows: 2,
      style: buildVMobjectStyle({
        fillOpacity: 0.4,
        fillRole: "area",
        strokeOpacity: 0.8,
        strokeRole: "surface",
        strokeWidth: 2
      }),
      wireframeColumns: [],
      wireframeRows: []
    }
  });

  assert.equal(fillMeshProps.colorRole, "area");
  assert.equal(fillMeshProps.fillOpacity, 0.4);
  assert.equal(fillMeshProps.opacity, 0.2);
  assert.equal(fillMeshProps.transparent, true);
  assert.equal(fillMeshProps.depthWrite, false);
  assert.equal(fillMeshProps.triangleCount, 4);
  assert.equal(fillMeshProps.vertexCount, 12);
  assert.deepEqual(fillMeshProps.positions.slice(0, 9), [0, 0, 0, 1, 0, 0, 0, 1, 0]);
});

test("summarizes runtime VMobject line props for browser QA evidence", () => {
  const scene = buildMathSceneSpecForThreeDFamily({
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
  assert.ok(scene);
  const runtimeState = buildMathSceneRuntimeState(scene, 0);
  const evidence = buildVMobjectLineRenderEvidence(runtimeState.objectGraph);
  const attributes = vmobjectLineRenderEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount, 2);
  assert.equal(evidence.transparentCount, 1);
  assert.equal(evidence.opacityRange, "0.550..1.000");
  assert.equal(evidence.strokeWidthRange, "3.000..5.000");
  assert.equal(evidence.colorRoles, "function,trace");
  assert.equal(evidence.objectIds, "function-curve,probe-trace");
  assert.match(evidence.sourceContract, /vmobjectLineProps/);
  assert.equal(
    evidence.summary,
    "vmobject-line-render:objects=2:transparent=1:opacityRange=0.550..1.000:strokeWidthRange=3.000..5.000:roles=function,trace:ids=function-curve,probe-trace"
  );
  assert.equal(attributes["data-viz-vmobject-render-line-object-count"], "2");
  assert.equal(attributes["data-viz-vmobject-render-line-transparent-count"], "1");
  assert.equal(attributes["data-viz-vmobject-render-line-opacity-range"], "0.550..1.000");
  assert.equal(attributes["data-viz-vmobject-render-line-stroke-width-range"], "3.000..5.000");
  assert.equal(attributes["data-viz-vmobject-render-line-color-roles"], "function,trace");
  assert.equal(attributes["data-viz-vmobject-render-line-object-ids"], "function-curve,probe-trace");
  assert.equal(attributes["data-viz-vmobject-render-line-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-vmobject-render-line-summary"], evidence.summary);
});

test("summarizes runtime VMobject surface fill mesh props for browser QA evidence", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-fill-render-evidence-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    objects: [
      {
        type: "parametricSurface",
        id: "area-surface",
        conceptId: "area-model",
        colorRole: "surface",
        samples: [
          [[0, 0, 0], [0, 1, 0]],
          [[1, 0, 0], [1, 1, 0.5]]
        ],
        style: { fillOpacity: 0.4, fillRole: "area", strokeOpacity: 0.7, strokeWidth: 2 },
        uRange: [0, 1],
        vRange: [0, 1]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [],
    cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const runtimeState = buildMathSceneRuntimeState(scene, 2);
  const evidence = buildVMobjectSurfaceFillRenderEvidence(runtimeState.objectGraph);
  const attributes = vmobjectSurfaceFillRenderEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount >= 1, true);
  assert.equal(evidence.meshObjectCount >= 1, true);
  assert.ok(evidence.triangleCount > 0);
  assert.equal(evidence.vertexCount, evidence.triangleCount * 3);
  assert.notEqual(evidence.opacityRange, "none");
  assert.match(evidence.sourceContract, /surface mesh triangles/);
  assert.match(evidence.summary, /^vmobject-surface-fill-render:/);
  assert.equal(attributes["data-viz-vmobject-render-fill-mesh-object-count"], String(evidence.meshObjectCount));
  assert.equal(attributes["data-viz-vmobject-render-fill-triangle-count"], String(evidence.triangleCount));
  assert.equal(attributes["data-viz-vmobject-render-fill-vertex-count"], String(evidence.vertexCount));
  assert.equal(attributes["data-viz-vmobject-render-fill-source-contract"], evidence.sourceContract);
  assert.equal(attributes["data-viz-vmobject-render-fill-summary"], evidence.summary);
});

test("VMobject render style stays pure and is consumed by runtime state and R3F line rendering", () => {
  const adapterSource = fs.readFileSync("components/visualizations/three/manim/mathVMobjectRenderStyle.ts", "utf8");
  const typeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneTypes.ts", "utf8");
  const runtimeStateSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.doesNotMatch(adapterSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(adapterSource, /lineOpacityForMobject/);
  assert.match(adapterSource, /vmobjectSurfaceFillMeshProps/);
  assert.match(adapterSource, /vmobjectSurfaceFillRenderEvidenceDataAttributes/);
  assert.match(typeSource, /parametricSurface.*style\?: VMobjectStyleInput/);
  assert.match(typeSource, /vector.*style\?: VMobjectStyleInput/);
  assert.match(runtimeStateSource, /VMobjectStyle/);
  assert.match(runtimeStateSource, /style: curve\.style/);
  assert.match(updaterSource, /style: curve\.style/);
  assert.match(runtimeSource, /vmobjectLineProps/);
  assert.match(runtimeSource, /vmobjectSurfaceFillMeshProps/);
  assert.match(runtimeSource, /surfaceFillMeshProps\.positions/);
  assert.match(runtimeSource, /THREE\.DoubleSide/);
  assert.match(runtimeSource, /curveLineProps\.lineWidth/);
  assert.match(runtimeSource, /traceLineProps\.opacity/);
  assert.match(runtimeSource, /surfaceRowLineProps\.lineWidth/);
  assert.match(runtimeSource, /surfaceColumnLineProps\.opacity/);
  assert.match(runtimeSource, /vectorLineProps\.lineWidth/);
});
