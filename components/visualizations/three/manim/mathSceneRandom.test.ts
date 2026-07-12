import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  createMathSceneRandomSource,
  deriveMathSceneRandomSeed,
  randomSeedDataAttributes
} from "./mathSceneRandom";

test("derives deterministic Manim-style scene random seeds from stable scene identity", () => {
  const seed = deriveMathSceneRandomSeed({
    familyId: "three-probability-machine",
    sceneId: "mais-manim-probability-machine",
    stateSummary: "family=three-probability-machine;template=probability-machine;value=6.000"
  });
  const sameSeed = deriveMathSceneRandomSeed({
    familyId: "three-probability-machine",
    sceneId: "mais-manim-probability-machine",
    stateSummary: "family=three-probability-machine;template=probability-machine;value=6.000"
  });
  const changedSeed = deriveMathSceneRandomSeed({
    familyId: "three-probability-machine",
    sceneId: "mais-manim-probability-machine",
    stateSummary: "family=three-probability-machine;template=probability-machine;value=7.000"
  });

  assert.equal(seed.algorithm, "mulberry32");
  assert.equal(seed.source, "scene");
  assert.equal(Number.isInteger(seed.seed), true);
  assert.equal(seed.seed > 0, true);
  assert.match(seed.signature, /^rng-[0-9a-f]{8}$/);
  assert.deepEqual(sameSeed, seed);
  assert.notEqual(changedSeed.signature, seed.signature);
});

test("creates deterministic finite random streams without Math.random", () => {
  const seed = deriveMathSceneRandomSeed({
    familyId: "three-probability-machine",
    sceneId: "mais-manim-probability-machine",
    stateSummary: "probability-demo"
  });
  const first = createMathSceneRandomSource(seed);
  const second = createMathSceneRandomSource(seed);
  const values = [first.next(), first.next(), first.next(), first.next()];
  const replayedValues = [second.next(), second.next(), second.next(), second.next()];

  assert.deepEqual(replayedValues, values);
  assert.equal(values.every((value) => Number.isFinite(value) && value >= 0 && value < 1), true);
  assert.deepEqual(randomSeedDataAttributes(seed), {
    "data-viz-manim-random-seed": String(seed.seed),
    "data-viz-manim-random-seed-algorithm": "mulberry32",
    "data-viz-manim-random-seed-signature": seed.signature
  });
});

test("MathSceneRandom stays pure and renderer independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRandom.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|Math\.random/);
});
