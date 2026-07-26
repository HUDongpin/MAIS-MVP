import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const lessonViewSource = readFileSync("components/lesson/LessonView.tsx", "utf8");
const usCaliforniaLessonIllustrationsSource = readFileSync("data/usCaliforniaLessonIllustrations.ts", "utf8");

test("concept illustrations render after audio and before the concept text", () => {
  // Matched by pattern, not by exact string: the guard has since grown to cover
  // `interactive-lesson` too, and what this test is actually pinning is the
  // render ORDER, not the precise shape of the condition.
  const audioIndex = lessonViewSource.search(/displayContent && \(?block\.type === "concept"/);
  const conceptIllustrationIndex = lessonViewSource.indexOf("{block.type === \"concept\" ? illustrationFigures : null}");
  const contentIndex = lessonViewSource.indexOf("<LessonContentWithAnswerReveal");
  const nonConceptIllustrationIndex = lessonViewSource.indexOf("{block.type === \"concept\" ? null : illustrationFigures}");

  assert.notEqual(audioIndex, -1, "Concept audio render guard should be explicit");
  assert.notEqual(conceptIllustrationIndex, -1, "Concept illustrations should render before concept text");
  assert.notEqual(contentIndex, -1, "Lesson text render should still be present");
  assert.notEqual(nonConceptIllustrationIndex, -1, "Non-concept illustrations should keep the original after-text position");
  assert.ok(audioIndex < conceptIllustrationIndex, "Concept audio guide should stay before the illustration");
  assert.ok(conceptIllustrationIndex < contentIndex, "Concept illustration should appear before the concept text");
  assert.ok(contentIndex < nonConceptIllustrationIndex, "Worked-example and other illustrations should stay after their text");
});

test("lesson illustration images are allowed to enlarge within the lesson panel", () => {
  assert.match(
    lessonViewSource,
    /className="mx-auto h-auto w-full max-w-5xl object-contain"/,
    "Lesson illustration images should fill the available figure width instead of staying at small intrinsic size"
  );
});

test("text-heavy raster lesson illustrations can bypass lossy image optimization", () => {
  assert.match(
    lessonViewSource,
    /unoptimized=\{illustration\.preserveRasterFidelity === true\}/,
    "Lesson illustrations should honor the high-fidelity raster flag"
  );
  assert.match(
    usCaliforniaLessonIllustrationsSource,
    /id: "us-ca-math-p1-1-oa-add-subtract-concept"[\s\S]*preserveRasterFidelity: true/,
    "The Add & Subtract Stories concept PNG should preserve raster fidelity"
  );
  assert.match(
    usCaliforniaLessonIllustrationsSource,
    /add-subtract-stories-single-panel-source-hd\.png/,
    "The Add & Subtract Stories concept image should use the remade HD source"
  );
});
