import assert from "node:assert/strict";
import test from "node:test";
import { mainlandBnuPrimaryLessonSeeds } from "@/data/mainlandBnuPrimaryLessons";
import { mainlandHjbPrimaryLessonSeeds } from "@/data/mainlandHjbPrimaryLessons";
import type { ProductionLessonSeed } from "@/data/lessons";

const genericConceptPattern = /(?:build .+ by identifying the given information|study .+ by connecting its definitions or rules|本[課课]圍繞《[^》]+》學習：先(?:找出已知信息|確認定義或規則)|本课围绕《[^》]+》学习：先(?:找出已知信息|确认定义或规则))/iu;

function assertRepresentativePrimaryConcepts(scope: string, seeds: ProductionLessonSeed[], expectedCount: number) {
  assert.equal(seeds.length, expectedCount, `${scope} inventory changed; review the complete depth contract`);

  seeds.forEach((seed) => {
    const concept = seed.blocks.find((block) => block.type === "concept")?.content;
    assert.ok(concept, `${seed.topicId} needs a concept block`);
    assert.ok(
      concept.en.startsWith(seed.description.en),
      `${seed.topicId} English concept must begin with its topic-specific learning description`
    );
    assert.ok(
      concept.en.length >= seed.description.en.length + 35,
      `${seed.topicId} English concept must include a representative solution method`
    );
    assert.match(concept.en, /A representative method is:/u, `${seed.topicId} lacks its English method bridge`);
    assert.match(concept.zhHans ?? "", /代表性思路：/u, `${seed.topicId} lacks its Simplified Chinese method bridge`);
    assert.doesNotMatch(concept.en, genericConceptPattern, `${seed.topicId} still exposes the generic concept factory`);
    assert.doesNotMatch(concept.zhHans ?? "", genericConceptPattern, `${seed.topicId} still exposes the generic concept factory`);
  });
}

test("all BNU primary concepts expose topic-specific descriptions and representative methods", () => {
  assertRepresentativePrimaryConcepts("BNU primary", mainlandBnuPrimaryLessonSeeds, 97);
});

test("all HJB primary concepts expose topic-specific descriptions and representative methods", () => {
  assertRepresentativePrimaryConcepts("HJB primary", mainlandHjbPrimaryLessonSeeds, 70);
});
