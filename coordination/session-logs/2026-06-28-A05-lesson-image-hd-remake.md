# 2026-06-28 A05 Lesson Image HD Remake

## Agent

- A05 lesson lead.

## Objective

Remake the Add & Subtract Stories concept illustration as a real high-resolution source image while preserving the lesson scene, characters, and instructional content.

## Files Changed

- `public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`
- `data/usCaliforniaLessonIllustrations.ts`
- `components/lesson/lessonVisualPlacement.test.ts`

## Work Completed

- Used built-in imagegen edit mode with the existing classroom illustration as the edit target/reference.
- Selected the closer restoration-style generation, then resized it to the lesson source dimensions `2368x1536`.
- Redrew the number-line panel deterministically so the blue point lands on 8 and the green point lands on 11.
- Added the HD PNG as a sibling asset, leaving the previous reference PNG in place.
- Updated the California Grade 1 concept illustration metadata to use the HD source and kept `preserveRasterFidelity: true`.
- Added a regression assertion so this illustration keeps pointing at the remade HD source.

## Checks

- `identify -format '%w %h %m %[colorspace] %b\n' public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`
  - Result: `2368 1536 PNG sRGB 3.06026MB`
- `node --test components/lesson/lessonVisualPlacement.test.ts`
  - Result: 3 tests passed.
- `curl -I http://127.0.0.1:3007/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`
  - Result: `200 OK`, `Content-Type: image/png`, `Content-Length: 3060262`.
- Playwright on `http://127.0.0.1:3007/student/lessons/us-ca-math-p1-1-oa-add-subtract` with the California Grade 1 example account.
  - Result: concept image renders from `/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-source-hd.png`.
  - DOM image metadata: `naturalWidth: 2368`, `naturalHeight: 1536`.
  - Screenshot evidence: `.playwright-cli/element-2026-06-28T11-00-53-943Z.png`.

## Notes And Risks

- The source was remade through generative restoration, so it is not pixel-identical to the earlier low-resolution/upscaled image. It preserves the same scene, two children, story text, lesson panels, and equation family.
- Built-in imagegen drifted on the number-line landing point; A05 corrected that panel deterministically before wiring the asset into the lesson.
- The older `add-subtract-stories-single-panel-reference.png` remains available as a fallback/reference artifact.
