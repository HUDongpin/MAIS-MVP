import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const directorySource = readFileSync("components/lesson/LessonGalaxyDirectory.tsx", "utf8");
const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");

test("unit directory navigation preserves the lesson menu", () => {
  assert.equal(
    directorySource.includes("fromGalaxy=planet"),
    false,
    "Cross-unit directory links must not add the planet-entry query that collapses the left menu."
  );
  assert.equal(
    directorySource.includes("onEnterPlanet?."),
    false,
    "Cross-unit directory links must not write the planet-entry session flag that collapses the left menu."
  );
  assert.match(
    lessonViewSource,
    /const shouldRenderGalaxyDirectory = true;/,
    "LessonView must keep the unit directory layout mounted for every lesson route."
  );
});

test("unit directory uses grade-level California course names", () => {
  assert.match(
    directorySource,
    /californiaCourseTitleForGrade/,
    "The directory header should use grade-level California course names instead of active unit names."
  );
  assert.equal(
    directorySource.includes("text={cleanLessonDisplayTitle(text(lesson.topic.title))}"),
    false,
    "The directory header must not render the current unit title as the course name."
  );
});
