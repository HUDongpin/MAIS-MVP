import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import * as primitiveSceneModule from "./scenes/TemplatePrimitiveScene";
import {
  implementedThreeDSceneVariants,
  threeDSceneRendererByVariant
} from "./scenes/TemplatePrimitiveScene";
import { sceneVariantForThreeDFamily, threeDFamilyIds, threeDSceneVariantByFamilyId } from "./threeDSceneMath";
import type { ThreeDSceneVariant } from "./threeDSceneTypes";

test("every approved Three.js family resolves to an implemented scene variant", () => {
  const implementedVariants = new Set(implementedThreeDSceneVariants);
  const missingFamilies = threeDFamilyIds
    .filter((familyId) => !implementedVariants.has(sceneVariantForThreeDFamily(familyId)))
    .map((familyId) => ({
      familyId,
      sceneVariant: sceneVariantForThreeDFamily(familyId)
    }));

  assert.deepEqual(missingFamilies, []);
});

test("scene variant implementation manifest covers every active variant exactly once", () => {
  const activeVariants = new Set(Object.values(threeDSceneVariantByFamilyId));

  assert.equal(new Set(implementedThreeDSceneVariants).size, implementedThreeDSceneVariants.length);
  assert.deepEqual(new Set(implementedThreeDSceneVariants), activeVariants);
});

test("scene variant renderer map explicitly routes every active variant", () => {
  const activeVariants = new Set(Object.values(threeDSceneVariantByFamilyId));
  const rendererVariants = new Set(Object.keys(threeDSceneRendererByVariant));
  const source = fs.readFileSync("components/visualizations/three/scenes/TemplatePrimitiveScene.tsx", "utf8");

  assert.deepEqual(rendererVariants, activeVariants);
  assert.deepEqual(new Set(implementedThreeDSceneVariants), rendererVariants);
  assert.doesNotMatch(source, /return <StrategyStack accent=\{props\.accent\} state=\{props\.state\} \/>;/);
});

test("scene variant metadata documents every active variant with sufficient 3D visual density", () => {
  const activeVariants = new Set(Object.values(threeDSceneVariantByFamilyId));
  const metadata = (
    primitiveSceneModule as typeof primitiveSceneModule & {
      threeDSceneVariantMetadata?: Record<ThreeDSceneVariant, { minPrimitiveCount: number; pedagogicalRole: string; spatialModel: string }>;
    }
  ).threeDSceneVariantMetadata;

  assert.ok(metadata, "TemplatePrimitiveScene should export threeDSceneVariantMetadata");

  const metadataVariants = new Set(Object.keys(metadata));
  assert.deepEqual(metadataVariants, activeVariants);

  for (const [variant, details] of Object.entries(metadata)) {
    assert.ok(details.minPrimitiveCount >= 4, `${variant} should declare enough 3D primitives for a meaningful lab scene`);
    assert.match(details.pedagogicalRole, /\S/);
    assert.match(details.spatialModel, /\S/);
  }
});

test("scene variant metadata is isolated in a pure module for QA contracts", () => {
  const sceneSource = fs.readFileSync("components/visualizations/three/scenes/TemplatePrimitiveScene.tsx", "utf8");
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const metadataSource = fs.readFileSync("components/visualizations/three/threeDSceneVariantMetadata.ts", "utf8");

  assert.match(sceneSource, /export \{ threeDSceneVariantMetadata \} from "\.\.\/threeDSceneVariantMetadata";/);
  assert.match(canvasSource, /import \{ threeDSceneVariantMetadata \} from "\.\/threeDSceneVariantMetadata";/);
  assert.doesNotMatch(canvasSource, /from "\.\/scenes\/TemplatePrimitiveScene"/);
  assert.doesNotMatch(metadataSource, /"use client"|@react-three\/drei|@react-three\/fiber|from "three"/);
  assert.match(metadataSource, /satisfies Record<ThreeDSceneVariant, ThreeDSceneVariantMetadata>/);
});
