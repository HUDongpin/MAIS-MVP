import { deepEqual, equal } from "node:assert/strict";
import { test } from "node:test";
import {
  awardPracticeIslandStars,
  mergePracticeIslandStarRecords,
  practiceIslandStarStorageKey,
  practiceIslandStarTotal,
  practiceIslandStarsForAccuracy,
  readPracticeIslandStarRecord
} from "./practiceIslandProgress";

test("maps round accuracy to stars: complete=1, 80%+=2, perfect=3", () => {
  equal(practiceIslandStarsForAccuracy(0), 1);
  equal(practiceIslandStarsForAccuracy(60), 1);
  equal(practiceIslandStarsForAccuracy(79), 1);
  equal(practiceIslandStarsForAccuracy(80), 2);
  equal(practiceIslandStarsForAccuracy(99), 2);
  equal(practiceIslandStarsForAccuracy(100), 3);
});

test("scopes the storage key per user with a guest fallback", () => {
  equal(practiceIslandStarStorageKey("student-1"), "hk-math-practice-island-stars:student-1");
  equal(practiceIslandStarStorageKey(undefined), "hk-math-practice-island-stars:guest");
  equal(practiceIslandStarStorageKey(null), "hk-math-practice-island-stars:guest");
});

test("reads only known regions and clamps stored values", () => {
  deepEqual(readPracticeIslandStarRecord(null), {});
  deepEqual(readPracticeIslandStarRecord("not-json"), {});
  deepEqual(readPracticeIslandStarRecord("[1,2]"), {});
  deepEqual(
    readPracticeIslandStarRecord(
      JSON.stringify({
        "number-forest": 2,
        "geometry-garden": 99,
        "masters-keep": -3,
        "unknown-region": 3,
        "algebra-peaks": "3"
      })
    ),
    { "number-forest": 2, "geometry-garden": 3 }
  );
});

test("awarding stars keeps the best result per region", () => {
  const first = awardPracticeIslandStars({}, "number-forest", 2);
  deepEqual(first, { "number-forest": 2 });

  const lower = awardPracticeIslandStars(first, "number-forest", 1);
  equal(lower, first, "a weaker round must not overwrite a better result");

  const higher = awardPracticeIslandStars(first, "number-forest", 3);
  deepEqual(higher, { "number-forest": 3 });

  const clamped = awardPracticeIslandStars(first, "challenge-shore", 42);
  deepEqual(clamped, { "number-forest": 2, "challenge-shore": 3 });
});

test("totals stars across all regions", () => {
  equal(practiceIslandStarTotal({}), 0);
  equal(practiceIslandStarTotal({ "number-forest": 2, "question-cavern": 3 }), 5);
  equal(practiceIslandStarTotal({ "number-forest": 99 }), 3);
});

test("merging records keeps the best stars from either side and preserves identity when nothing improves", () => {
  const base = { "number-forest": 2, "question-cavern": 3 } as const;
  const merged = mergePracticeIslandStarRecords(base, { "number-forest": 3, "algebra-peaks": 1 });
  deepEqual(merged, { "number-forest": 3, "question-cavern": 3, "algebra-peaks": 1 });

  const unchanged = mergePracticeIslandStarRecords(base, { "number-forest": 1 });
  equal(unchanged, base, "merges that add nothing must return the same object for cheap change detection");
  equal(mergePracticeIslandStarRecords(base, {}), base);
});
