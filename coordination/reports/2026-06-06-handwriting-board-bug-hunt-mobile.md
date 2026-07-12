# 2026-06-06 Lesson / Practice Handwriting Board Bug Hunt

- Session: S11
- Scope: Practice Arena and Lesson handwriting board, including mocked UI state paths and authenticated live OCR route smoke.
- Findings: 7 total (P0 0, P1 4, P2 3)
- Secret hygiene: no provider credentials, cookies, auth headers, or token values are recorded.

## HWB-01 [P1] New-student learner setup modal blocks handwriting board controls
- Surface: Practice
- Expected: A student who reaches Practice or Lesson handwriting controls can switch to the handwriting board without an unrelated modal intercepting clicks, or the modal is localized and intentionally handled by the page flow.
- Actual: The fixed `LearnerStartSetupGate` dialog appears above Practice/Lesson and intercepts clicks on the visible `Handwriting board` tab; the dialog copy is Simplified Chinese even though the registered student language is English.
- Repro: Register a new English HK student, open `/practice`, unlock free selection, select Fill-in, then click the visible `Handwriting board` tab.
- Evidence: /Users/dongpinhu/Desktop/MAIS-MVP/.tmp/s11-handwriting-board/bug-hunt-mobile/practice-learner-setup-blocks-handwriting.png
- Root cause hypothesis: `components/layout/LearnerStartSetupGate.tsx` is global in `app/layout.tsx`, uses hard-coded Simplified Chinese strings, and is not excluded from Practice/Lesson handwriting flows.

## HWB-02 [P1] Convert remains enabled while collapsed but sends no canvas image to OCR
- Surface: Practice
- Expected: If a learner collapses the handwriting canvas after drawing, Convert either expands/captures the canvas or is disabled until the canvas is visible.
- Actual: The request still submits strokes, but `imageDataUrl` is missing because the `<canvas>` is unmounted while collapsed.
- Repro: In Practice fill-in, switch to Handwriting board, draw a stroke, collapse the canvas, then click Convert to text.
- Root cause hypothesis: `HandwritingAnswerBoard.buildOcrImageDataUrl()` returns `undefined` when `canvasRef.current` is null, while the Convert button only checks `hasDraft`.

## HWB-03 [P2] Blank eraser-only drafts enable OCR conversion
- Surface: Practice
- Expected: Drawing only with the eraser on a blank board should not count as recognizable handwriting or enable Convert.
- Actual: The Convert button becomes enabled and the payload contains only eraser strokes.
- Repro: Open Practice handwriting board, choose eraser on a blank canvas, drag once, then inspect the Convert button.
- Root cause hypothesis: `HandwritingAnswerBoard.hasDraft` counts all strokes, including eraser-only strokes, instead of requiring visible pen ink.

## HWB-04 [P2] OCR payload accepts eraser-only stroke telemetry
- Surface: API
- Expected: The client should suppress OCR submission when no visible pen stroke exists.
- Actual: A request reached `/api/handwriting-recognition` with eraser-only stroke telemetry.
- Repro: Use the eraser on an empty Practice handwriting board and click Convert.
- Root cause hypothesis: `sanitizeHandwritingStrokes` preserves eraser strokes and the client submits them without visible-ink validation.

## HWB-05 [P1] Handwriting OCR rate-limit errors are replaced by a misleading handwriting-quality message
- Surface: Practice
- Expected: When `/api/handwriting-recognition` returns 429, the learner sees the retry-after/rate-limit message.
- Actual: The UI displayed: Draw clearer separated digits, then convert again.
- Repro: Force `/api/handwriting-recognition` to return 429 while converting a Practice handwriting draft.
- Root cause hypothesis: `HandwritingAnswerBoard.convertHandwritingToText()` treats every non-OK response as generic `convertError` and discards the API JSON error body.

## HWB-06 [P1] Lesson practice card with handwriting-capable type is missing in the DOM
- Surface: Lesson
- Expected: Lesson `algebra-basics` renders a non-multiple-choice practice card with the handwriting input mode.
- Actual: The Lesson API had a handwriting-capable question, but the visible Lesson page did not expose a matching card.
- Repro: Open /student/lessons/algebra-basics and search for Fill-in, Short answer, or Graph practice cards.
- Root cause hypothesis: `components/lesson/LessonView.tsx` rendering may be filtering or relabeling linked practice questions.

## HWB-07 [P2] Live OCR route returns empty text for clear common math expressions
- Surface: API
- Expected: Clear math images for equations and trigonometric expressions return recognized text or at least non-empty alternatives for learner review.
- Actual: 3/5 live OCR calls returned HTTP 200 from a provider but `accepted=false` with empty text.
- Repro: POST generated PNG data URLs for common math expressions such as `2x+3=9` and `sin30=1/2` to `/api/handwriting-recognition`.
- Evidence: [{"caseId":"live-1","input":"x^2+4x","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":17490},{"caseId":"live-4","input":"2x+3=9","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":2015},{"caseId":"live-5","input":"sin30=1/2","httpStatus":200,"provider":"simpletex","accepted":false,"text":"","reason":"Recognition requires review: low-confidence.","alternativesCount":1,"latencyMs":1391}]
- Root cause hypothesis: The route/provider acceptance threshold or post-processing may be dropping usable OCR candidates instead of surfacing them for learner review.

## Live OCR Rows

| Case | Input | HTTP | Provider | Accepted | Text | Latency |
| --- | --- | ---: | --- | --- | --- | ---: |
| live-1 | `x^2+4x` | 200 | simpletex | false | `` | 17490 ms |
| live-2 | `3/5+1/2` | 200 | simpletex | true | `3/5+1/2` | 1189 ms |
| live-3 | `0.9+0.1` | 200 | simpletex | true | `0.9+0.1` | 1647 ms |
| live-4 | `2x+3=9` | 200 | simpletex | false | `` | 2015 ms |
| live-5 | `sin30=1/2` | 200 | simpletex | false | `` | 1391 ms |