import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  curriculumContentMatchesScope,
  getAdaptiveContentUnavailableForCurriculum,
  getContentUnavailableForCurriculum,
  isGradeAllowedForCurriculumProfile,
  normalizeCurriculumTrackFromScope,
  validCurriculumTrackSet
} from "@/lib/server/userStore/curriculumAvailability";
import type { CurriculumProfile } from "@/types";

const floridaProfile: CurriculumProfile = {
  region: "US",
  publisher: "US_FL_MATH"
};

const californiaProfile: CurriculumProfile = {
  region: "US",
  publisher: "US_CA_MATH"
};

const northCarolinaProfile: CurriculumProfile = {
  region: "US",
  publisher: "US_NC_MATH"
};

const mainlandPepProfile: CurriculumProfile = {
  region: "MAINLAND",
  publisher: "MAINLAND_PEP"
};

test("curriculum availability restricts Florida middle school grades", () => {
  assert.equal(isGradeAllowedForCurriculumProfile("P6", floridaProfile), true);
  assert.equal(isGradeAllowedForCurriculumProfile("S1", floridaProfile), true);
  assert.equal(isGradeAllowedForCurriculumProfile("S2", floridaProfile), true);
  assert.equal(isGradeAllowedForCurriculumProfile("P5", floridaProfile), false);
  assert.equal(isGradeAllowedForCurriculumProfile("S3", floridaProfile), false);
});

test("curriculum availability reports unavailable content for candidate US publishers", () => {
  assert.equal(getContentUnavailableForCurriculum(californiaProfile), null);

  const unavailable = getContentUnavailableForCurriculum(northCarolinaProfile);
  assert.ok(unavailable);
  assert.match(unavailable.en, /not open in MAIS yet/);
});

test("curriculum availability respects Mainland PEP deployment switch", () => {
  const previousValue = process.env.MAINLAND_PEP_CONTENT_ENABLED;
  process.env.MAINLAND_PEP_CONTENT_ENABLED = "false";

  try {
    const unavailable = getContentUnavailableForCurriculum(mainlandPepProfile);
    assert.ok(unavailable);
    assert.match(unavailable.en, /not enabled/);
  } finally {
    if (previousValue === undefined) {
      delete process.env.MAINLAND_PEP_CONTENT_ENABLED;
    } else {
      process.env.MAINLAND_PEP_CONTENT_ENABLED = previousValue;
    }
  }
});

test("curriculum availability keeps California adaptive beta scoped to K through P5", () => {
  assert.equal(getAdaptiveContentUnavailableForCurriculum(californiaProfile, "P5"), null);

  const unavailable = getAdaptiveContentUnavailableForCurriculum(californiaProfile, "S1");
  assert.ok(unavailable);
  assert.match(unavailable.en, /Kindergarten through Grade 5/);
});

test("curriculum availability module does not import legacy userStore", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/curriculumAvailability.ts"), "utf8");

  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);
});

test("curriculum availability owns content scope matcher for legacy userStore", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/curriculumAvailability.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const previousValue = process.env.MAINLAND_PEP_CONTENT_ENABLED;

  try {
    process.env.MAINLAND_PEP_CONTENT_ENABLED = "false";

    assert.match(source, /export function curriculumContentMatchesScope\b/);
    assert.match(rootSource, /curriculumContentMatchesScope as curriculumContentMatchesScopeFromAvailability/);
    assert.doesNotMatch(rootSource, /function isCurriculumTopic\(/);
    assert.doesNotMatch(rootSource, /function isCurriculumQuestion\(/);
    assert.equal(curriculumContentMatchesScope({
      curriculum_track: "HK",
      curriculum_region: "HK",
      textbook_publisher: "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY"
    }, "HK"), true);
    assert.equal(curriculumContentMatchesScope({
      curriculum_track: "US_CA_MATH",
      curriculum_region: "US",
      textbook_publisher: "US_CA_MATH"
    }, californiaProfile), true);
    assert.equal(curriculumContentMatchesScope({
      curriculum_track: "US_NC_MATH",
      curriculum_region: "US",
      textbook_publisher: "US_NC_MATH"
    }, californiaProfile), false);
    assert.equal(curriculumContentMatchesScope({
      curriculum_track: "MAINLAND_PEP_HIGH",
      curriculum_region: "MAINLAND",
      textbook_publisher: "MAINLAND_PEP"
    }, mainlandPepProfile), false);
  } finally {
    if (previousValue === undefined) {
      delete process.env.MAINLAND_PEP_CONTENT_ENABLED;
    } else {
      process.env.MAINLAND_PEP_CONTENT_ENABLED = previousValue;
    }
  }
});

test("curriculum availability owns curriculum track normalization for legacy userStore", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/curriculumAvailability.ts"), "utf8");
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const validCurriculumTrackSet\b/);
  assert.match(source, /export function isValidCurriculumTrackFromScope\b/);
  assert.match(source, /export function normalizeCurriculumTrackFromScope\b/);
  assert.match(rootSource, /normalizeCurriculumTrackFromScope as normalizeCurriculumTrackFromAvailability/);
  assert.match(rootSource, /validCurriculumTrackSet as validCurriculumTracksFromAvailability/);
  assert.doesNotMatch(rootSource, /function isValidCurriculumTrack\b/);
  assert.doesNotMatch(rootSource, /function normalizeCurriculumTrack\b/);
  assert.doesNotMatch(rootSource, /new Set<CurriculumTrack>\(\["HK", "MAINLAND_PEP_HIGH"/);

  assert.equal(validCurriculumTrackSet.has("HK"), true);
  assert.equal(validCurriculumTrackSet.has("US_FL_MATH"), true);
  assert.equal(normalizeCurriculumTrackFromScope("MAINLAND_PEP_HIGH"), "MAINLAND_PEP_HIGH");
  assert.equal(normalizeCurriculumTrackFromScope("not-a-track"), undefined);
});

test("legacy userStore delegates curriculum availability helpers through domain stores", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const isGradeAllowedForCurriculumProfile = authUserStore\.isGradeAllowedForCurriculumProfile/);
  assert.match(source, /export const getContentUnavailableForCurriculum = studentActivityUserStore\.getContentUnavailableForCurriculum/);
  assert.match(source, /export const getAdaptiveContentUnavailableForCurriculum = studentActivityUserStore\.getAdaptiveContentUnavailableForCurriculum/);
  assert.doesNotMatch(source, /export function isGradeAllowedForCurriculumProfile/);
  assert.doesNotMatch(source, /export function getContentUnavailableForCurriculum/);
  assert.doesNotMatch(source, /export function getAdaptiveContentUnavailableForCurriculum/);
});
