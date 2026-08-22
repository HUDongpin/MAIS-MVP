import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  isHongKongMathEdBStage,
  isHongKongTopicEligibleForStage
} from "@/lib/rag/hongKongMathTopicRouting";

test("HK optional-module eligibility denies missing or wrong stages and allows only the named module", () => {
  assert.equal(isHongKongTopicEligibleForStage("statistics-s6", undefined), false);
  assert.equal(isHongKongTopicEligibleForStage("statistics-s6", "senior-secondary-m2"), false);
  assert.equal(isHongKongTopicEligibleForStage("statistics-s6", "senior-secondary-m1"), true);
  assert.equal(isHongKongTopicEligibleForStage("differentiation-intro", "senior-secondary-m1"), true);
  assert.equal(isHongKongTopicEligibleForStage("differentiation-intro", "senior-secondary-m2"), true);
  assert.equal(isHongKongTopicEligibleForStage("calculus", "senior-secondary-compulsory"), false);
  assert.equal(isHongKongTopicEligibleForStage("quadratic-patterns", undefined), true);
  assert.equal(isHongKongMathEdBStage("senior-secondary-m1"), true);
  assert.equal(isHongKongMathEdBStage("M1"), false);
});

test("adaptive HK RAG fails closed for optional M1 and M2 topics without an explicit stage", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const functionStart = source.indexOf("function buildAdaptiveRagTopicEvidence({");
  const functionEnd = source.indexOf("\nfunction buildAdaptiveRagEvidence({", functionStart);
  const functionSource = source.slice(functionStart, functionEnd);

  assert.notEqual(functionStart, -1);
  assert.notEqual(functionEnd, -1);
  assert.match(source, /isHongKongTopicEligibleForStage/);
  assert.match(functionSource, /hongKongStage\?: HongKongMathEdBStage/);
  assert.match(functionSource, /if \(!isHongKongTopicEligibleForStage\(topicId, hongKongStage\)\)/);
  assert.match(functionSource, /status: "unavailable"/);
  assert.match(functionSource, /stage: hongKongStage/);
  assert.doesNotMatch(functionSource, /stage:\s*candidate\.topic\.grade/);
});

test("adaptive API callers validate and forward an explicit HK M1/M2 stage to both decision paths", async () => {
  const [storeSource, inputSource, nextRoute, refreshRoute] = await Promise.all([
    readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8"),
    readFile(path.join(process.cwd(), "lib/server/userStore/studentActivityPersistence.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/api/adaptive-learning/next/route.ts"), "utf8"),
    readFile(path.join(process.cwd(), "app/api/adaptive-learning/refresh/route.ts"), "utf8")
  ]);

  assert.match(inputSource, /hongKongStage\?: HongKongMathEdBStage/);
  assert.match(storeSource, /buildAdaptiveRagEvidence\(\{ generated, grade, curriculumTrack, hongKongStage \}\)/);
  for (const source of [nextRoute, refreshRoute]) {
    assert.match(source, /isHongKongMathEdBStage\(stageParam\)/);
    assert.match(source, /hongKongStage: stageParam/);
    assert.match(source, /Invalid Hong Kong curriculum stage/);
  }
});
