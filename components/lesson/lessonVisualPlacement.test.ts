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

test("section audio stays compact beside the heading and exposes every playback speed", () => {
  assert.match(
    lessonViewSource,
    /const lessonAudioRates = \[0\.85, 1, 1\.25\] as const;/,
    "Audio speeds should render in the requested slow-to-fast order"
  );
  assert.match(
    lessonViewSource,
    /className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"/,
    "The section heading and its audio control should share one responsive header row"
  );
  assert.match(
    lessonViewSource,
    /lessonAudioRates\.map\(\(audioRate\) =>/,
    "Every supported playback speed should be visible instead of hidden behind a cycle button"
  );
  assert.match(
    lessonViewSource,
    /aria-pressed=\{isActive\}/,
    "The selected playback speed should be exposed to assistive technology"
  );
  assert.doesNotMatch(
    lessonViewSource,
    /lessonAudioWaveBars/,
    "The section-level control should not retain the full-width decorative waveform"
  );
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

test("China lesson pages never render an inferred generic worked-example diagram", () => {
  assert.match(
    lessonViewSource,
    /function shouldRenderGeneratedWorkedExampleIllustration\(lesson: LessonDetail\)/,
    "LessonView should make the generated worked-example fallback policy explicit"
  );
  for (const publisher of ["MAINLAND_PEP", "MAINLAND_BNU", "MAINLAND_HJB"]) {
    assert.match(
      lessonViewSource,
      new RegExp(`lesson\\.publisher === "${publisher}"`),
      `${publisher} lessons should be excluded from inferred diagrams`
    );
  }
  for (const publisher of [
    "HK_MODERN_EDUCATIONAL_RESEARCH_SOCIETY",
    "HK_UNITED_PRIME_MIA",
    "HK_EPH_MIF"
  ]) {
    assert.match(
      lessonViewSource,
      new RegExp(`lesson\\.publisher === "${publisher}"`),
      `${publisher} lessons should require reviewed illustration assets`
    );
  }
  assert.match(
    lessonViewSource,
    /illustrations\.length === 0 && shouldRenderGeneratedWorkedExampleIllustration\(lesson\)/,
    "The fallback component should only mount after the China-specific safety gate"
  );
});

test("authored extension blocks are included in navigation and rendered after practice", () => {
  const extensionSelectionIndex = lessonViewSource.indexOf(
    'const extensionBlocks = useMemo(() => blocksByType(lesson, "extension"), [lesson]);'
  );
  const practiceSectionIndex = lessonViewSource.indexOf('<section ref={lessonPracticeSectionRef} id={lessonPracticeSectionId}');
  const extensionRenderIndex = lessonViewSource.indexOf('{extensionBlocks.length ? (');

  assert.notEqual(extensionSelectionIndex, -1, "LessonView should select authored extension blocks");
  assert.match(
    lessonViewSource,
    /extensionBlocks\.forEach\(\(block\) => \{[\s\S]*kind: "extension"/,
    "Extension blocks should be reachable from the lesson directory"
  );
  assert.notEqual(practiceSectionIndex, -1, "Lesson practice should remain rendered");
  assert.notEqual(extensionRenderIndex, -1, "Extension blocks should render on the lesson page");
  assert.ok(practiceSectionIndex < extensionRenderIndex, "Extension and reflection should follow the lesson practice section");
});

test("mathematically invalid PEP junior diagrams stay hidden pending reviewed replacements", () => {
  for (const illustrationId of [
    "pep-junior-s1-upper-expressions-linear-equations-worked-example",
    "pep-junior-s3-upper-quadratics-circle-probability-worked-example",
    "pep-junior-s3-lower-inverse-similarity-trigonometry-concept",
    "pep-junior-s3-lower-inverse-similarity-trigonometry-worked-example"
  ]) {
    assert.match(
      lessonViewSource,
      new RegExp(`"${illustrationId}"`),
      `${illustrationId} should remain in the reviewed illustration quarantine`
    );
  }
  assert.match(
    lessonViewSource,
    /!hiddenLessonIllustrationIds\.has\(illustration\.id\)/,
    "The lesson illustration selector should enforce the quarantine"
  );
});
