import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMobjectMaterialUniformEvidence,
  lineOpacityForMobject,
  lineTransparencyForMobject,
  mobjectMaterialUniformEvidenceDataAttributes,
  MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT,
  materialPropsForMobject,
  serializeMobjectMaterialUniformEvidence,
  type MobjectMaterialUniformEvidence
} from "./mathMobjectMaterialUniforms";
import type { MathObjectGraph } from "./mathSceneRuntimeState";

test("builds renderer material props from normalized Mobject uniforms", () => {
  const materialProps = materialPropsForMobject({
    clippingPlanes: [
      { constant: 1.25, normal: [0, 2, 0] },
      { constant: Number.NaN, normal: [0, 0, 0] }
    ],
    opacity: 0.35,
    shadeIn3D: true
  });

  assert.equal(materialProps.opacity, 0.35);
  assert.equal(materialProps.transparent, true);
  assert.equal(materialProps.depthWrite, false);
  assert.equal(materialProps.shadeIn3D, true);
  assert.equal(materialProps.clippingPlaneCount, 1);
  assert.deepEqual(materialProps.clippingPlanes, [{ constant: 1.25, normal: [0, 1, 0] }]);
});

test("keeps default material props opaque and unclipped", () => {
  assert.deepEqual(materialPropsForMobject(), {
    clippingPlaneCount: 0,
    clippingPlanes: [],
    depthWrite: true,
    opacity: 1,
    shadeIn3D: false,
    transparent: false
  });
});

test("combines base layer opacity with Mobject opacity deterministically", () => {
  const materialProps = materialPropsForMobject({ opacity: 0.5 });

  assert.equal(lineOpacityForMobject(0.7, materialProps), 0.35);
  assert.equal(lineOpacityForMobject(Number.NaN, materialProps), 0.5);
  assert.equal(lineTransparencyForMobject(0.7, materialProps), true);
  assert.equal(lineTransparencyForMobject(1, materialPropsForMobject()), false);
  assert.equal(lineTransparencyForMobject(0.7, materialPropsForMobject()), true);
});

test("summarizes renderer material props derived from Mobject uniforms for browser QA", () => {
  const objectGraph = {
    byId: {
      curve: {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "function-rule",
        id: "curve",
        renderState: { kind: "polyline", points: [[0, 0, 0], [1, 1, 0]] },
        spec: { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" },
        type: "parametricCurve",
        uniforms: { clippingPlanes: [{ constant: 1, normal: [0, 3, 0] }], fixedInFrame: false, opacity: 0.25, shadeIn3D: true }
      },
      label: {
        boundingBox: { kind: "empty" },
        childIds: [],
        conceptId: "formula-label",
        id: "label",
        renderState: { kind: "empty" },
        spec: { type: "vector", id: "label", from: [0, 0, 0], to: [1, 0, 0], colorRole: "reference", conceptId: "formula-label" },
        type: "vector",
        uniforms: { clippingPlanes: [], fixedInFrame: true, opacity: 1, shadeIn3D: false }
      }
    },
    rootIds: ["curve", "label"]
  } satisfies MathObjectGraph;

  const evidence = buildMobjectMaterialUniformEvidence(objectGraph);
  const attributes = mobjectMaterialUniformEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount, 2);
  assert.equal(evidence.transparentCount, 1);
  assert.equal(evidence.depthWriteEnabledCount, 1);
  assert.equal(evidence.shadeIn3DCount, 1);
  assert.equal(evidence.clippingPlaneCount, 1);
  assert.equal(evidence.opacityRange, "0.250..1.000");
  assert.equal(evidence.objectIds, "curve,label");
  assert.equal(evidence.sourceContract, MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "material-uniforms:objects=2:transparent=1:depthWrite=1:shade3d=1:clipPlanes=1:opacityRange=0.250..1.000:ids=curve,label"
  );
  assert.equal(attributes["data-viz-mobject-material-object-count"], "2");
  assert.equal(attributes["data-viz-mobject-material-transparent-count"], "1");
  assert.equal(attributes["data-viz-mobject-material-depth-write-enabled-count"], "1");
  assert.equal(attributes["data-viz-mobject-material-clipping-plane-count"], "1");
  assert.equal(attributes["data-viz-mobject-material-source-contract"], MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT);
});

test("serializes Mobject material uniform evidence for browser QA without unsafe script characters", () => {
  const evidence: MobjectMaterialUniformEvidence = {
    clippingPlaneCount: 1,
    depthWriteEnabledCount: 0,
    objectCount: 1,
    objectIds: "curve<script>",
    opacityRange: "0.250..0.250",
    shadeIn3DCount: 1,
    sourceContract: MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT,
    summary: "material-uniforms:<script>",
    transparentCount: 1
  };
  const json = serializeMobjectMaterialUniformEvidence(evidence);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.summary, "material-uniforms:<script>");
  assert.equal(parsed.objectIds, "curve<script>");
  assert.equal(parsed.opacityRange, "0.250..0.250");
  assert.equal(parsed.sourceContract, MOBJECT_MATERIAL_UNIFORM_SOURCE_CONTRACT);
  assert.equal(serializeMobjectMaterialUniformEvidence(JSON.parse(JSON.stringify(evidence)) as typeof evidence), json);
});

test("Mobject material uniforms stay pure and are consumed by the R3F runtime", () => {
  const materialSource = fs.readFileSync("components/visualizations/three/manim/mathMobjectMaterialUniforms.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.doesNotMatch(materialSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(materialSource, /normalizeMobjectUniforms/);
  assert.match(materialSource, /serializeMobjectMaterialUniformEvidence/);
  assert.match(materialSource, /stableSerialize/);
  assert.match(runtimeSource, /materialPropsForMobject/);
  assert.match(runtimeSource, /runtimeObject\.uniforms/);
  assert.match(runtimeSource, /lineOpacityForMobject/);
  assert.match(runtimeSource, /lineTransparencyForMobject/);
  assert.match(runtimeSource, /clippingPlanes=\{clippingPlanes\}/);
  assert.match(runtimeSource, /shadeIn3D/);
});
