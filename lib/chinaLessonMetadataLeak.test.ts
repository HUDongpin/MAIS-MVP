import assert from "node:assert/strict";
import test from "node:test";
import { mainlandBnuJuniorLessonSeeds } from "@/data/mainlandBnuJuniorLessons";
import { mainlandHjbJuniorLessonSeeds } from "@/data/mainlandHjbJuniorLessons";
import type { ProductionLessonSeed } from "@/data/lessons";

const internalAuthoringPattern = /(?:MAIS|\bS\d+\s+(?:upper|lower)\b|production[- ]integrated|source[- ]distance|textbook wording|原創情境|原创情境|版本中)/iu;

function displayedLessonText(seed: ProductionLessonSeed) {
  return [
    seed.title.en,
    seed.title.zh,
    seed.title.zhHans,
    seed.description.en,
    seed.description.zh,
    seed.description.zhHans,
    ...seed.blocks.flatMap((block) => [
      block.title.en,
      block.title.zh,
      block.title.zhHans,
      block.content?.en,
      block.content?.zh,
      block.content?.zhHans,
      ...block.items?.flatMap((item) => [item.en, item.zh, item.zhHans]) ?? []
    ])
  ].filter((value): value is string => typeof value === "string");
}

function assertNoInternalAuthoringMetadata(scope: string, seeds: ProductionLessonSeed[]) {
  const leaks = seeds.flatMap((seed) =>
    displayedLessonText(seed)
      .filter((value) => internalAuthoringPattern.test(value))
      .map((value) => `${seed.topicId}: ${value}`)
  );
  assert.deepEqual(leaks, [], `${scope} learner pages must not expose internal authoring or release metadata`);
}

test("BNU junior lesson pages contain no internal authoring metadata", () => {
  assertNoInternalAuthoringMetadata("BNU junior", mainlandBnuJuniorLessonSeeds);
});

test("HJB junior lesson pages contain no internal authoring metadata", () => {
  assertNoInternalAuthoringMetadata("HJB junior", mainlandHjbJuniorLessonSeeds);
});
