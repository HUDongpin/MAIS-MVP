# Mobile AI Tutor Microphone Button Issue

- Date/time: 2026-06-04 Asia/Hong_Kong
- Session: S07 AI tutor lead
- Target: mobile AI Tutor microphone input button
- Trigger: Mobile screenshot reported "voice button cannot touch and play."

## Diagnosis

The button shown at the bottom of the screenshot is the microphone input button, not the reply playback button.

The red state `I did not catch that...` means browser speech recognition started but produced no usable transcript. On the screenshot page (`/lesson/pep-high`) the UI language is ENG, so the current browser speech recognizer uses `en-HK`; if the learner speaks Chinese, Chrome can easily return no transcript.

The previous UI made this feel like a dead button because it did not distinguish:

- microphone permission blocked
- no microphone/audio capture
- speech recognition network failure
- no speech / no transcript
- browser unsupported

## Change Made

Updated `components/ai/AITutorProvider.tsx`:

- Added explicit microphone input issue states:
  - `not-allowed`
  - `audio-capture`
  - `network`
  - `no-speech`
  - `unsupported`
  - `unknown`
- Mapped browser `SpeechRecognition` error codes into user-facing messages.
- Treats `onend` with no transcript as a retryable `no-speech` error instead of silently resetting.
- Clears the previous microphone error when the learner taps mic again or gets a transcript.
- Updated red status panel and bottom mic label to show the same actionable message.
- Enlarged the mobile microphone touch target to 48px and added `touch-manipulation`.

## Verification

Checks run:

- `git diff --check -- components/ai/AITutorProvider.tsx coordination/session-logs/2026-06-04-S07.md`: passed.
- `npm run type-check`: attempted, but currently blocked by unrelated existing `lib/server/userStore.ts` type errors around `Database` missing `teacher_lesson_kits`, `classroom_work_samples`, `teacher_live_tool_states`, and OCR alternative confidence typing.
- Local mobile Playwright mock:
  - `no-speech` scenario confirmed the new no-speech message rendered in both the red status panel and bottom status text. The first script stopped on Playwright strict-mode because the same expected message appeared twice, which is the intended UI result.
  - A full second pass was blocked by local dev-server `.next/routes-manifest.json` ENOENT instability, so physical/visual recheck remains needed after deployment.

## Remaining Note

This fix improves browser speech-recognition UX. It does not convert microphone input to Qwen ASR. If the product requirement is "use Qwen to transcribe student speech," that is a separate architecture task: capture microphone audio, send it to a server-side Qwen ASR/realtime endpoint, and return transcript text.
