import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  classifyPracticeIslandTopic,
  mastersKeepUnlockStarTotal,
  practiceIslandMaxStarsPerRegion,
  practiceIslandRegions,
  practiceIslandStarTotalMax
} from "./practiceIslandRegions";

test("defines six regions with unique ids covering every kind", () => {
  equal(practiceIslandRegions.length, 6);
  equal(new Set(practiceIslandRegions.map((region) => region.id)).size, 6);
  deepEqual(
    [...new Set(practiceIslandRegions.map((region) => region.kind))].sort(),
    ["adaptive", "challenge", "domain", "review"]
  );
  equal(practiceIslandRegions.filter((region) => region.kind === "domain").length, 3);
});

test("localizes every region label and subtitle in en, zh and zh-Hans", () => {
  for (const region of practiceIslandRegions) {
    for (const localized of [region.label, region.subtitle]) {
      ok(localized.en.length > 0, `${region.id} needs an English label`);
      ok((localized.zh ?? "").length > 0, `${region.id} needs a Traditional Chinese label`);
      ok((localized.zhHans ?? "").length > 0, `${region.id} needs a Simplified Chinese label`);
    }
  }
});

test("star totals stay consistent with the region list", () => {
  equal(practiceIslandStarTotalMax, practiceIslandRegions.length * practiceIslandMaxStarsPerRegion);
  ok(mastersKeepUnlockStarTotal < practiceIslandStarTotalMax);
  ok(mastersKeepUnlockStarTotal > 0);
});

test("classifies California topicIds by CCSS domain code", () => {
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-k-k-cc-cardinality-compare" }), "number-forest");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-p2-2-nbt-three-digit-place-value" }), "number-forest");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-p3-3-nf-fraction-meaning" }), "number-forest");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-k-k-oa-compose-decompose" }), "algebra-peaks");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-p4-4-oa-factors-patterns" }), "algebra-peaks");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-p1-1-g-shape-reasoning" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-p3-3-md-time-data-area-perimeter" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "us-ca-math-k-k-md-attributes-data" }), "geometry-garden");
});

test("classifies mainland and Hong Kong topics by localized keywords", () => {
  equal(classifyPracticeIslandTopic({ topicId: "hjb-junior-s1-lower-triangles" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-junior-s2-lower-coordinate-plane" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-high-s5-圆锥曲线" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-high-s6-成对数据的统计分析" }), "geometry-garden");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-junior-s1-upper-factorization" }), "algebra-peaks");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-high-s4-集合与逻辑" }), "algebra-peaks");
  equal(classifyPracticeIslandTopic({ topicId: "hjb-high-s5-数列" }), "algebra-peaks");
  equal(
    classifyPracticeIslandTopic({
      topicId: "hk-p4-mystery",
      topic: { en: "Long division practice", zh: "長除法練習" }
    }),
    "algebra-peaks"
  );
  equal(
    classifyPracticeIslandTopic({
      topicId: "hk-p2-mystery",
      topic: { en: "Reading big numerals", zh: "認識大數" }
    }),
    "number-forest"
  );
});

test("falls back to Number Forest for unrecognized topics", () => {
  equal(classifyPracticeIslandTopic({ topicId: "totally-unknown-topic" }), "number-forest");
});
