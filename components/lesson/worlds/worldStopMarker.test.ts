import assert from "node:assert/strict";
import test from "node:test";
import { ccssLessonAssignments, ccssLessonMetasForTopic } from "@/data/ccssLessonAssignments";
import { ccssTextbookLessons } from "@/data/ccssTextbookRegistry";
import type { GradeId } from "@/types";
import { selectLessonWorldStopMarker } from "./worldStopMarker";
import { lessonWorldThemeForGrade, lessonWorldThemesByBand } from "./worldThemes";

const earlyWorldPalette = ["🌼", "🐝", "🦋", "🐞"] as const;
const unicodeNumberPattern = new RegExp("\\p{Number}", "u");

function isNumericWayfindingMarker(marker: string) {
  return (
    unicodeNumberPattern.test(marker) ||
    marker.includes("\u20e3") ||
    /[🔟🔢💯]/u.test(marker)
  );
}

function select(candidate: string | null | undefined, stableKey = "us-ca-math-p1-1-nbt-place-value") {
  return selectLessonWorldStopMarker({
    candidate,
    fallback: "🌼",
    palette: earlyWorldPalette,
    stableKey
  });
}

test("replaces numeric and keycap-style unit markers with a stable curated cartoon", () => {
  const digitKeycaps = Array.from({ length: 10 }, (_, digit) => `${digit}\uFE0F\u20e3`);
  const digitKeycapsWithoutVariationSelector = Array.from({ length: 10 }, (_, digit) => `${digit}\u20e3`);
  const numericMarkers = [
    ...digitKeycaps,
    ...digitKeycapsWithoutVariationSelector,
    "0",
    "9",
    "10",
    " 10 ",
    `1\u20e3`,
    "1️⃣",
    "1️⃣0️⃣",
    "2️⃣",
    "🔟",
    "2",
    `2\uFE0F`,
    "1️⃣2️⃣",
    `2\uFE0F\u200D✨`,
    "２",
    "٢",
    "②",
    "Ⅻ",
    "#️⃣",
    "*️⃣",
    "💯",
    "🔢"
  ];

  for (const numericMarker of numericMarkers) {
    const marker = select(numericMarker);
    assert.ok(earlyWorldPalette.includes(marker as (typeof earlyWorldPalette)[number]));
    assert.notEqual(marker, numericMarker);
    assert.equal(marker, select(numericMarker), "The same topic must always choose the same fallback marker.");
    assert.equal(isNumericWayfindingMarker(marker), false);
  }
});

test("preserves genuine non-numeric thematic emoji including VS16 and ZWJ sequences", () => {
  for (const marker of ["🏗️", "⚖️", "👩🏽‍🔬", "🇭🇰", "📖", "🌼"]) {
    assert.equal(select(marker), marker);
  }
});

test("chooses missing markers from the palette deterministically and fails over to the theme fallback", () => {
  for (const missingMarker of [null, undefined, "", " \t "] as const) {
    const selected = select(missingMarker, "missing-topic");
    assert.ok(earlyWorldPalette.includes(selected as (typeof earlyWorldPalette)[number]));
    assert.equal(selected, select(missingMarker, "missing-topic"));
  }
  assert.equal(
    selectLessonWorldStopMarker({
      candidate: null,
      fallback: "🌼",
      palette: [],
      stableKey: "missing-topic"
    }),
    "🌼"
  );
  assert.equal(
    selectLessonWorldStopMarker({
      candidate: null,
      fallback: "🌼",
      palette: ["", "2️⃣", "🐝"],
      stableKey: "mixed-palette"
    }),
    "🐝"
  );
  assert.equal(
    selectLessonWorldStopMarker({
      candidate: null,
      fallback: "1️⃣",
      palette: ["", "2️⃣"],
      stableKey: "numeric-only-palette"
    }),
    "🌟"
  );
});

test("all four real themes give every K–12 grade a unique non-numeric curated palette", () => {
  const grades: readonly GradeId[] = [
    "K",
    "P1",
    "P2",
    "P3",
    "P4",
    "P5",
    "P6",
    "S1",
    "S2",
    "S3",
    "S4",
    "S5",
    "S6"
  ];
  assert.equal(Object.keys(lessonWorldThemesByBand).length, 4);

  for (const [band, theme] of Object.entries(lessonWorldThemesByBand)) {
    assert.ok(theme, `${band} must have a world theme.`);
    assert.ok(theme.stopEmojiPalette.length > 0, `${theme.id} must have a non-empty marker palette.`);
    assert.equal(
      new Set(theme.stopEmojiPalette).size,
      theme.stopEmojiPalette.length,
      `${theme.id} marker palette must not contain duplicates.`
    );
    for (const marker of theme.stopEmojiPalette) {
      assert.equal(isNumericWayfindingMarker(marker), false, `${theme.id} palette contains numeric marker ${marker}.`);
      assert.equal(
        selectLessonWorldStopMarker({
          candidate: marker,
          fallback: theme.fallbackStopEmoji,
          palette: theme.stopEmojiPalette,
          stableKey: `${theme.id}-palette-contract`
        }),
        marker,
        `${theme.id} palette marker ${marker} must remain intact.`
      );
    }
  }

  for (const grade of grades) {
    const theme = lessonWorldThemeForGrade(grade);
    assert.ok(theme, `${grade} must resolve one of the four configured worlds.`);
    assert.ok(theme.stopEmojiPalette.length > 0, `${grade} must resolve a non-empty marker palette.`);
  }
});

test("all 64 assigned K–12 topics render safe primary stop markers without changing raw registry emoji", () => {
  const assignments = Object.entries(ccssLessonAssignments);
  assert.equal(assignments.length, 64);

  for (const [topicId, assignment] of assignments) {
    const primaryMeta = ccssLessonMetasForTopic(topicId)[0];
    assert.ok(primaryMeta, `${topicId} must keep its primary lesson metadata.`);
    assert.equal(primaryMeta.slug, assignment.primary);
    const theme = lessonWorldThemeForGrade(primaryMeta.grade);
    assert.ok(theme, `${topicId} must resolve a world theme for ${primaryMeta.grade}.`);
    const marker = selectLessonWorldStopMarker({
      candidate: primaryMeta.emoji,
      fallback: theme.fallbackStopEmoji,
      palette: theme.stopEmojiPalette,
      stableKey: topicId
    });
    assert.equal(isNumericWayfindingMarker(marker), false, `${topicId} rendered numeric marker ${marker}.`);
  }

  const placeValueTopicId = "us-ca-math-p1-1-nbt-place-value";
  const multiDigitTopicId = "us-ca-math-p4-4-nbt-multi-digit";
  const placeValueMeta = ccssLessonMetasForTopic(placeValueTopicId)[0];
  const multiDigitMeta = ccssLessonMetasForTopic(multiDigitTopicId)[0];
  assert.equal(
    ccssTextbookLessons["count-to-120"].emoji,
    "1️⃣",
    "The raw textbook registry marker must remain unchanged."
  );
  assert.equal(placeValueMeta?.emoji, "1️⃣", "The raw Counting to 120 registry marker must remain unchanged.");
  assert.equal(multiDigitMeta?.emoji, "🔟");

  for (const [topicId, meta] of [
    [placeValueTopicId, placeValueMeta],
    [multiDigitTopicId, multiDigitMeta]
  ] as const) {
    assert.ok(meta);
    const theme = lessonWorldThemeForGrade(meta.grade);
    assert.ok(theme);
    const marker = selectLessonWorldStopMarker({
      candidate: meta.emoji,
      fallback: theme.fallbackStopEmoji,
      palette: theme.stopEmojiPalette,
      stableKey: topicId
    });
    assert.notEqual(marker, meta.emoji, `${topicId} must replace its raw numeric marker.`);
    assert.equal(isNumericWayfindingMarker(marker), false);
  }
});
