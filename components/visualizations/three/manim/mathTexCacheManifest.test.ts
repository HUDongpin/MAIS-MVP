import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildMathTexCacheManifest,
  serializeMathTexCacheManifest,
  TEX_CACHE_MANIFEST_SOURCE_CONTRACT,
  texCacheManifestDataAttributes
} from "./mathTexCacheManifest";

const fixtureScene: MathSceneSpec = {
  bindings: [
    { conceptId: "input", formulaId: "curve-formula", objectId: "curve", tokenId: "input-token" },
    { conceptId: "output", formulaId: "curve-formula", objectId: "probe", tokenId: "output-token" }
  ],
  cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 2,
    expectedObjectCount: 2,
    expectedTokenCount: 2
  },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "curve-formula",
      latex: "$f(x)=x^2$",
      tokens: [
        { conceptId: "input", id: "input-token", text: "x" },
        { conceptId: "output", id: "output-token", text: "f(x)" }
      ]
    }
  ],
  objects: [
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "input" },
    { type: "movingPoint", id: "probe", pathObjectId: "curve", colorRole: "probe", conceptId: "output" }
  ],
  sceneId: "mais-manim-tex-cache-fixture",
  timeline: [{ type: "wait", duration: 1 }]
};

test("TeX cache manifest summarizes formula HTML, SVG, isolation, and morph entries deterministically", () => {
  const manifest = buildMathTexCacheManifest(fixtureScene, {
    svgPathMorphs: [
      {
        formulaId: "curve-formula",
        id: "x-to-fx",
        sourcePath: "M 0 0 L 1 1",
        sourceTokenId: "input-token",
        targetPath: "M 0 0 L 2 2",
        targetTokenId: "output-token"
      }
    ],
    texIsolationRules: [
      { colorRole: "function", selector: "concept:input" },
      { colorRole: "probe", selector: "output-token" }
    ]
  });

  assert.equal(manifest.cacheVersion, "mais-manim-tex-cache/v1");
  assert.equal(manifest.sourceContract, TEX_CACHE_MANIFEST_SOURCE_CONTRACT);
  assert.match(manifest.sourceContract, /Tex/);
  assert.match(manifest.sourceContract, /latex_to_svg/);
  assert.match(manifest.sourceContract, /isolate/);
  assert.match(manifest.sourceContract, /SVG/);
  assert.match(manifest.sourceContract, /cache/);
  assert.equal(manifest.sceneId, fixtureScene.sceneId);
  assert.equal(manifest.familyId, "three-function-graph");
  assert.equal(manifest.formulaCount, 1);
  assert.equal(manifest.tokenCount, 2);
  assert.equal(manifest.isolationEntryCount, 2);
  assert.equal(manifest.svgMorphPlanCount, 1);
  assert.equal(manifest.cacheEntryCount, 5);
  assert.equal(manifest.cacheHitEligibleCount, 5);
  assert.equal(manifest.staleEntryCount, 0);
  assert.equal(manifest.ready, true);
  assert.match(manifest.signature, /^tex-cache-[0-9a-f]{8}$/);
  assert.equal(manifest.summary, "tex-cache:mais-manim-tex-cache-fixture:formulas=1:tokens=2:entries=5:ready=true");
  assert.deepEqual([...new Set(manifest.cacheKeys)], manifest.cacheKeys);
  assert.deepEqual(
    manifest.entries.map((entry) => entry.kind),
    ["formula-html", "formula-svg", "token-isolation", "token-isolation", "svg-morph"]
  );
  assert.deepEqual(
    manifest.entries.map((entry) => entry.selector),
    [
      "[data-viz-manim-formula=\"curve-formula\"]",
      "[data-viz-manim-formula-svg=\"curve-formula\"]",
      "[data-viz-manim-formula-token=\"input-token\"]",
      "[data-viz-manim-formula-token=\"output-token\"]",
      "[data-viz-manim-svg-morph=\"x-to-fx\"]"
    ]
  );
});

test("TeX cache manifest exposes browser QA data attributes and escaped JSON", () => {
  const manifest = buildMathTexCacheManifest(fixtureScene);
  const attributes = texCacheManifestDataAttributes(manifest);
  const json = serializeMathTexCacheManifest(manifest);

  assert.equal(attributes["data-viz-manim-tex-cache-ready"], "true");
  assert.equal(attributes["data-viz-manim-tex-cache-scene-id"], fixtureScene.sceneId);
  assert.equal(attributes["data-viz-manim-tex-cache-formula-count"], "1");
  assert.equal(attributes["data-viz-manim-tex-cache-token-count"], "2");
  assert.equal(attributes["data-viz-manim-tex-cache-entry-count"], "4");
  assert.equal(attributes["data-viz-manim-tex-cache-isolation-entry-count"], "2");
  assert.equal(attributes["data-viz-manim-tex-cache-svg-morph-plan-count"], "0");
  assert.equal(attributes["data-viz-manim-tex-cache-source-contract"], TEX_CACHE_MANIFEST_SOURCE_CONTRACT);
  assert.match(attributes["data-viz-manim-tex-cache-signature"], /^tex-cache-[0-9a-f]{8}$/);
  assert.equal(attributes["data-viz-manim-tex-cache-summary"], "tex-cache:mais-manim-tex-cache-fixture:formulas=1:tokens=2:entries=4:ready=true");
  assert.doesNotMatch(json, /</);
  assert.equal(JSON.parse(json).cacheEntryCount, 4);
  assert.equal(JSON.parse(json).sourceContract, TEX_CACHE_MANIFEST_SOURCE_CONTRACT);
});

test("TeX cache manifest consumes scene-authored SVG morph specs without extra options", () => {
  const manifest = buildMathTexCacheManifest({
    ...fixtureScene,
    formulaSvgMorphs: [
      {
        formulaId: "curve-formula",
        id: "scene-authored-x-to-fx",
        sourcePath: "M 0 0 L 1 1",
        sourceTokenId: "input-token",
        targetPath: "M 0 0 L 2 2",
        targetTokenId: "output-token"
      }
    ]
  });

  assert.equal(manifest.svgMorphPlanCount, 1);
  assert.equal(manifest.cacheEntryCount, 5);
  assert.equal(manifest.entries.at(-1)?.kind, "svg-morph");
  assert.equal(manifest.entries.at(-1)?.selector, "[data-viz-manim-svg-morph=\"scene-authored-x-to-fx\"]");
});
