import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");

test("LessonView renders authored extension blocks between the lab and completion surfaces", () => {
  assert.match(
    lessonViewSource,
    /const isHongKongLesson = lesson\?\.topic\.curriculumTrack === "HK";/,
    "the HK content repair must not silently reorder Mainland or US lesson surfaces"
  );
  assert.match(lessonViewSource, /\(\) => isHongKongLesson \? blocksByType\(lesson, "extension"\) : \[\]/);
  assert.match(lessonViewSource, /isHongKongLesson && checklistItems\.length/);
  assert.match(lessonViewSource, /extensionBlocks\.map/);
  assert.match(lessonViewSource, /kind:\s*"extension"/);
  assert.match(lessonViewSource, /data-lesson-block-type=\{block\.type\}/);

  const visualizationRender = lessonViewSource.indexOf("{visualizationBlock ? (");
  const extensionRender = lessonViewSource.indexOf("{extensionBlocks.map");
  const checklistRender = lessonViewSource.indexOf("{checklistItems.length ? (");
  const practiceRender = lessonViewSource.indexOf("<LessonQuestionPager");

  assert.ok(visualizationRender >= 0, "visualization section must exist");
  assert.ok(extensionRender > visualizationRender, "extension must render after the visualization");
  assert.ok(checklistRender > extensionRender, "completion checklist must render after the extension");
  assert.ok(practiceRender > checklistRender, "practice must render after the completion checklist");
});
