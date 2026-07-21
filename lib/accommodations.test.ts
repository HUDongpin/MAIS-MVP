import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accommodationSummaryChips,
  accommodationsAreDefault,
  assessmentTimerSeconds,
  defaultStudentAccommodations,
  extendedTimeMultiplier,
  hasAccommodationsPlan,
  normalizeStudentAccommodations
} from "@/lib/accommodations";

test("defaults are a no-op accommodations profile", () => {
  assert.equal(accommodationsAreDefault(defaultStudentAccommodations), true);
  assert.equal(hasAccommodationsPlan(defaultStudentAccommodations), false);
  assert.deepEqual(accommodationSummaryChips(defaultStudentAccommodations), []);
});

test("normalize coerces malformed input to safe defaults", () => {
  assert.deepEqual(normalizeStudentAccommodations(null), defaultStudentAccommodations);
  assert.deepEqual(normalizeStudentAccommodations("nope"), defaultStudentAccommodations);
  assert.deepEqual(
    normalizeStudentAccommodations({
      extendedTime: "banana",
      readAloud: "yes",
      maxAnswerChoices: "lots",
      calculatorPolicy: "sometimes",
      notes: 42
    }),
    defaultStudentAccommodations
  );

  // A numeric string is coerced (defensive), not rejected.
  assert.equal(normalizeStudentAccommodations({ maxAnswerChoices: "3" }).maxAnswerChoices, 3);
});

test("normalize keeps valid values and bounds the answer-choice cap", () => {
  assert.deepEqual(
    normalizeStudentAccommodations({
      extendedTime: "double",
      readAloud: true,
      maxAnswerChoices: 3,
      calculatorPolicy: "allowed",
      notes: "  504 plan   on file  "
    }),
    {
      extendedTime: "double",
      readAloud: true,
      maxAnswerChoices: 3,
      calculatorPolicy: "allowed",
      notes: "504 plan on file"
    }
  );

  // A cap below the floor snaps up to 2; above the ceiling clamps; <= 0 means "all".
  assert.equal(normalizeStudentAccommodations({ maxAnswerChoices: 1 }).maxAnswerChoices, 2);
  assert.equal(normalizeStudentAccommodations({ maxAnswerChoices: 99 }).maxAnswerChoices, 6);
  assert.equal(normalizeStudentAccommodations({ maxAnswerChoices: 0 }).maxAnswerChoices, 0);
  assert.equal(normalizeStudentAccommodations({ maxAnswerChoices: -4 }).maxAnswerChoices, 0);
});

test("a note alone counts as an active plan", () => {
  const withNote = normalizeStudentAccommodations({ notes: "Needs a quiet space." });
  assert.equal(accommodationsAreDefault(withNote), false);
  assert.equal(hasAccommodationsPlan(withNote), true);
});

test("extended-time multiplier maps each setting", () => {
  assert.equal(extendedTimeMultiplier("none"), 1);
  assert.equal(extendedTimeMultiplier("extra-half"), 1.5);
  assert.equal(extendedTimeMultiplier("double"), 2);
  assert.equal(extendedTimeMultiplier("unlimited"), null);
});

test("assessmentTimerSeconds applies the extended-time accommodation", () => {
  // 30-minute timed assessment under each setting.
  assert.equal(assessmentTimerSeconds(30, "none"), 30 * 60);
  assert.equal(assessmentTimerSeconds(30, "extra-half"), 45 * 60);
  assert.equal(assessmentTimerSeconds(30, "double"), 60 * 60);
  // Unlimited accommodation → no countdown.
  assert.equal(assessmentTimerSeconds(30, "unlimited"), 0);
  // Untimed assessment → no countdown regardless of accommodation.
  assert.equal(assessmentTimerSeconds(null, "double"), 0);
  assert.equal(assessmentTimerSeconds(0, "double"), 0);
});

test("summary chips list only the active accommodations", () => {
  const chips = accommodationSummaryChips({
    extendedTime: "extra-half",
    readAloud: true,
    maxAnswerChoices: 2,
    calculatorPolicy: "not-allowed",
    notes: ""
  });
  const english = chips.map((chip) => chip.en);
  assert.deepEqual(english, [
    "Extended time (1.5×)",
    "Read-aloud",
    "2 answer choices",
    "Calculator not allowed"
  ]);
});
