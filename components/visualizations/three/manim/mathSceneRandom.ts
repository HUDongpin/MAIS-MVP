import type { MathSceneRandomSeedSpec, MathSceneSpec } from "./mathSceneTypes";

export type MathSceneRandomSeedInput = {
  familyId: string;
  sceneId: string;
  stateSummary: string;
};

export type MathSceneRandomSource = {
  next: () => number;
};

function hashString(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash >>> 0;
}

function stableSeed(hash: number) {
  return hash === 0 ? 1 : hash;
}

export function deriveMathSceneRandomSeed({
  familyId,
  sceneId,
  stateSummary
}: MathSceneRandomSeedInput): MathSceneRandomSeedSpec {
  const seed = stableSeed(hashString(`${sceneId}|${familyId}|${stateSummary}`));

  return {
    algorithm: "mulberry32",
    seed,
    signature: `rng-${seed.toString(16).padStart(8, "0")}`,
    source: "scene"
  };
}

export function randomSeedForScene(scene: MathSceneSpec): MathSceneRandomSeedSpec {
  return scene.randomSeed ?? deriveMathSceneRandomSeed({
    familyId: scene.familyId,
    sceneId: scene.sceneId,
    stateSummary: scene.sceneId
  });
}

export function createMathSceneRandomSource(seedSpec: MathSceneRandomSeedSpec): MathSceneRandomSource {
  let state = seedSpec.seed >>> 0;

  return {
    next: () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    }
  };
}

export function randomSeedDataAttributes(seedSpec: MathSceneRandomSeedSpec) {
  return {
    "data-viz-manim-random-seed": String(seedSpec.seed),
    "data-viz-manim-random-seed-algorithm": seedSpec.algorithm,
    "data-viz-manim-random-seed-signature": seedSpec.signature
  } as const;
}
