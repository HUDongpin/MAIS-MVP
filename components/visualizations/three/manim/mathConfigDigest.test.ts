import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";

type ManimConfigDigestRow = {
  classChain: "Mobject" | "Mobject>VMobject";
  configKeyCount: number;
  defaultedKeyCount: number;
  explicitConfigKeys: string[];
  objectId: string;
  objectType: string;
  resolvedClippingPlaneCount: number;
  resolvedFillOpacity: number | null;
  resolvedFixedInFrame: boolean;
  resolvedOpacity: number;
  resolvedShadeIn3D: boolean;
  resolvedStrokeOpacity: number | null;
  resolvedStrokeWidth: number | null;
  resolvedStrokeZoomBehavior: string;
  resolvedZIndex: number;
};

type ManimConfigDigest = {
  classSummary: string;
  clippingPlaneCount: number;
  defaultedValueCount: number;
  explicitOverrideCount: number;
  familyId: string;
  fixedInFrameCount: number;
  objectCount: number;
  opacityRange: string;
  rowSummary: string;
  rows: ManimConfigDigestRow[];
  sceneId: string;
  shadeIn3DCount: number;
  signature: string;
  sourceContract: typeof expectedSourceContract;
  summary: string;
  version: "mais-manim-config-digest/v1";
  vmobjectCount: number;
  zIndexRange: string;
};

type ManimConfigDigestModule = {
  MANIM_CONFIG_DIGEST_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildManimConfigDigest: (scene: MathSceneSpec) => ManimConfigDigest;
  manimConfigDigestDataAttributes: (digest: ManimConfigDigest) => Record<string, string>;
  serializeManimConfigDigest: (digest: ManimConfigDigest) => string;
};

const modulePath = "components/visualizations/three/manim/mathConfigDigest.ts";
const expectedSourceContract = "digest_config|CONFIG inheritance|explicit kwargs override class defaults" as const;

function digestScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", position: [0, 0, 8], target: [0, 0, 0] }],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        conceptId: "axes",
        id: "axes",
        range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
        type: "axis3d",
        uniforms: { fixedInFrame: true }
      },
      {
        colorRole: "function",
        conceptId: "curve",
        id: "curve",
        samples: [[0, 0, 0], [1, 1, 0]],
        style: { strokeOpacity: 0.4, strokeWidth: 3, strokeZoomBehavior: "world-space" },
        type: "parametricCurve",
        uniforms: {
          clippingPlanes: [{ constant: 1, normal: [0, 2, 0] }],
          opacity: 0.5,
          shadeIn3D: true
        },
        zIndex: 2
      },
      {
        colorRole: "probe",
        conceptId: "probe",
        id: "dot",
        pathObjectId: "curve",
        type: "movingPoint"
      }
    ],
    sceneId: "config-digest-scene",
    timeline: []
  };
}

async function importDigestModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure digest_config-style config module");
  return (await import("./mathConfigDigest")) as ManimConfigDigestModule;
}

test("buildManimConfigDigest merges CONFIG defaults with explicit scene object overrides", async () => {
  const { MANIM_CONFIG_DIGEST_SOURCE_CONTRACT, buildManimConfigDigest } = await importDigestModule();
  const digest = buildManimConfigDigest(digestScene());

  assert.equal(MANIM_CONFIG_DIGEST_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(digest.sourceContract, MANIM_CONFIG_DIGEST_SOURCE_CONTRACT);
  assert.equal(digest.version, "mais-manim-config-digest/v1");
  assert.equal(digest.sceneId, "config-digest-scene");
  assert.equal(digest.familyId, "three-function-graph");
  assert.equal(digest.objectCount, 3);
  assert.equal(digest.vmobjectCount, 1);
  assert.equal(digest.explicitOverrideCount, 8);
  assert.equal(digest.defaultedValueCount, 16);
  assert.equal(digest.fixedInFrameCount, 1);
  assert.equal(digest.shadeIn3DCount, 1);
  assert.equal(digest.clippingPlaneCount, 1);
  assert.equal(digest.opacityRange, "0.500..1.000");
  assert.equal(digest.zIndexRange, "0..2");
  assert.equal(digest.classSummary, "Mobject=2;VMobject=1");
  assert.equal(
    digest.rowSummary,
    "axes:fixedInFrame|curve:clippingPlanes,opacity,shadeIn3D,strokeOpacity,strokeWidth,strokeZoomBehavior,zIndex|dot:none"
  );
  assert.match(digest.signature, /^config-digest-[0-9a-f]{8}$/);
  assert.equal(
    digest.summary,
    "config-digest:config-digest-scene:objects=3:vmobjects=1:explicit=8:defaulted=16:classes=Mobject=2;VMobject=1"
  );

  assert.deepEqual(digest.rows.map((row) => row.objectId), ["axes", "curve", "dot"]);
  assert.deepEqual(digest.rows[0].explicitConfigKeys, ["fixedInFrame"]);
  assert.deepEqual(digest.rows[1].explicitConfigKeys, [
    "clippingPlanes",
    "opacity",
    "shadeIn3D",
    "strokeOpacity",
    "strokeWidth",
    "strokeZoomBehavior",
    "zIndex"
  ]);
  assert.equal(digest.rows[1].classChain, "Mobject>VMobject");
  assert.equal(digest.rows[1].resolvedOpacity, 0.5);
  assert.equal(digest.rows[1].resolvedStrokeOpacity, 0.4);
  assert.equal(digest.rows[1].resolvedStrokeWidth, 3);
  assert.equal(digest.rows[1].resolvedStrokeZoomBehavior, "world-space");
  assert.equal(digest.rows[1].resolvedFillOpacity, 0);
  assert.equal(digest.rows[1].resolvedZIndex, 2);
  assert.deepEqual(digest.rows[2].explicitConfigKeys, []);
  assert.equal(digest.rows[2].defaultedKeyCount, 5);
});

test("manimConfigDigestDataAttributes exposes digest_config evidence for browser QA", async () => {
  const {
    MANIM_CONFIG_DIGEST_SOURCE_CONTRACT,
    buildManimConfigDigest,
    manimConfigDigestDataAttributes
  } = await importDigestModule();
  const digest = buildManimConfigDigest(digestScene());

  assert.deepEqual(manimConfigDigestDataAttributes(digest), {
    "data-viz-manim-config-digest-class-summary": "Mobject=2;VMobject=1",
    "data-viz-manim-config-digest-clipping-plane-count": "1",
    "data-viz-manim-config-digest-defaulted-value-count": "16",
    "data-viz-manim-config-digest-explicit-override-count": "8",
    "data-viz-manim-config-digest-fixed-in-frame-count": "1",
    "data-viz-manim-config-digest-object-count": "3",
    "data-viz-manim-config-digest-opacity-range": "0.500..1.000",
    "data-viz-manim-config-digest-row-summary": digest.rowSummary,
    "data-viz-manim-config-digest-shade-in-3d-count": "1",
    "data-viz-manim-config-digest-signature": digest.signature,
    "data-viz-manim-config-digest-source-contract": MANIM_CONFIG_DIGEST_SOURCE_CONTRACT,
    "data-viz-manim-config-digest-summary": digest.summary,
    "data-viz-manim-config-digest-vmobject-count": "1",
    "data-viz-manim-config-digest-z-index-range": "0..2"
  });
});

test("config digest serialization is deterministic and script-safe", async () => {
  const { buildManimConfigDigest, serializeManimConfigDigest } = await importDigestModule();
  const digest = buildManimConfigDigest(digestScene());
  const serialized = serializeManimConfigDigest(digest);

  assert.equal(serializeManimConfigDigest(JSON.parse(JSON.stringify(digest)) as ManimConfigDigest), serialized);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
  assert.match(serialized, /"sourceContract":"digest_config\|CONFIG inheritance\|explicit kwargs override class defaults"/);
});

test("config digest stays pure and documents the Manim source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathConfigDigest.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /digest_config/);
  assert.match(source, /CONFIG inheritance/);
  assert.match(source, /buildManimConfigDigest/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
