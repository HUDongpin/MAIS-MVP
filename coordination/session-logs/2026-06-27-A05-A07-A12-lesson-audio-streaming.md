# 2026-06-27 A05/A07/A12 Lesson Audio Streaming

## Scope

- A05-owned Lesson page audio playback experience in `components/lesson/`.
- A07-owned lesson TTS provider behavior for DashScope/CosyVoice transport.
- A12-owned `app/api/lesson-audio/` API contract and streaming/fallback behavior.

## Plan

1. Add focused red tests for lesson audio chunking and DashScope SSE stream decoding.
2. Implement shared lesson-audio queue helpers for first-chunk playback.
3. Extend `/api/lesson-audio` to support provider streaming with a non-stream fallback.
4. Update `ConceptAudioPlayer` to prefer streaming playback where supported and otherwise use chunk queue prefetch.
5. Run targeted tests and type-check; record visual/runtime checks and risks.

## Initial Notes

- Current root is heavily dirty; no staging, committing, branching, resetting, or reverting performed.
- Current lesson-audio route is untracked and is treated as the authoritative in-progress implementation for this assignment.
- No real credential values will be read, printed, or logged.

## Handoff

### Changed

- Added `components/lesson/lessonAudioQueue.ts` and tests for natural-boundary narration chunking.
- Added `app/api/lesson-audio/lessonAudioSse.ts` and tests for DashScope HTTP SSE audio-byte decoding.
- Updated `app/api/lesson-audio/route.ts`:
  - `stream: true` / `responseFormat: "stream"` now returns `audio/mpeg` with `Transfer-Encoding: chunked`.
  - Native DashScope SSE is preferred when available and marked with `X-Lesson-Audio-Streaming: dashscope-sse`.
  - Server-side chunked streaming remains as fallback for one-request first-segment playback.
  - Existing non-streaming full-audio response remains available for compatibility.
- Updated `components/lesson/LessonView.tsx`:
  - Audio player tries MediaSource streaming first.
  - Falls back to chunk queue playback with first-chunk load and next-chunk prefetch.
  - Adds an in-flight load guard to avoid duplicate same-click audio requests.
  - Updates loading copy to "Preparing the first audio segment...".

### Checks

- `node --import tsx --test components/lesson/lessonAudioQueue.test.ts app/api/lesson-audio/lessonAudioSse.test.ts` passed: 4/4.
- `npm run type-check` remained blocked by pre-existing dirty-tree issues outside this scope:
  - `components/visualizations/three/manim/*` evidence/begin-animation type drift.
  - generated validator artifacts under `tmp/` and `/var/folders/.../T/...` referencing removed `app/student/lessons/page.js`.
  - no `lesson-audio`, `LessonView`, or `lessonAudioQueue` errors appeared in the final run.
- Browser smoke via Playwright:
  - Logged in with public demo account `HK Student Peter` / example password from E2E helpers.
  - Opened `http://localhost:3000/student/lessons/quadratic-functions`.
  - Confirmed AI audio guide renders on desktop and mobile widths.
  - Clicked Play once; control entered `Pause audio` / `Reading aloud now`, and progress advanced.
  - Network response headers showed `X-Lesson-Audio-Streaming: dashscope-sse` and `Content-Type: audio/mpeg`.

### Risks / Follow-Up

- Full type-check remains blocked by unrelated visualization/manim type drift and generated `tmp` validator artifacts in the current dirty root.
- MediaSource support varies by browser; unsupported browsers use chunk queue fallback, which can consume more than one `lesson-audio` rate-limit event for long narrations.
- The browser smoke used one short live TTS playback and did not print, store, or expose any credential values.
