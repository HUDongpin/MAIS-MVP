# AI Tutor Qwen ASR / Realtime Voice Input Plan

- Date/time: 2026-06-04 Asia/Hong_Kong
- Session: S07 AI tutor lead
- Trigger: Dr. Peter Hu clarified that "student speech should also be recognized by Qwen" is a new feature, not a small mobile microphone-button fix.
- Scope: AI Tutor voice input architecture and acceptance plan. No code implementation in this report.

## Decision

Treat Qwen-based student speech recognition as a new S07 feature.

The current mobile microphone issue has two separate layers:

1. Existing UX bug: the browser speech-recognition button can fail silently or with vague copy.
2. New product requirement: replace student speech recognition with Qwen ASR/realtime so student voice input is not dependent on Chrome/Safari Web Speech behavior.

The second item should not be shipped as a quick patch inside the current microphone handler.

## Current Implementation

- `components/ai/AITutorProvider.tsx` currently uses browser `SpeechRecognition` / `webkitSpeechRecognition` for student speech input.
- The recognition language is derived from UI language, e.g. English UI maps to English recognition; Chinese speech on English UI can be missed.
- `app/api/ai-tutor/voice/route.ts` is reply playback only: it sends tutor text to Qwen Realtime and returns `audio/wav`.
- `app/api/ai-tutor/status/route.ts` exposes `voice.configured`, but there is no separate `speech` or `asr` capability status yet.

## Provider Notes

- Alibaba Cloud documents Qwen-ASR-Realtime as a WebSocket API where the client sends `session.update`, then audio-buffer events, and receives transcription events.
- Qwen-ASR-Realtime supports language hints including `zh`, `yue`, and `en`.
- Qwen-ASR-Realtime supports VAD mode and Manual mode. Manual mode is a good first release fit for a push-to-talk chat button: record one utterance, commit it, receive the final transcript, and place it into the AI Tutor input.
- Qwen-Omni-Realtime can also enable `input_audio_transcription` with `qwen3-asr-flash-realtime`, but it is broader than needed for simple speech-to-text input.

References:

- Alibaba Cloud Qwen-ASR-Realtime client events: https://www.alibabacloud.com/help/zh/model-studio/qwen-asr-realtime-client-events
- Qwen Cloud realtime speech recognition guide: https://docs.qwencloud.com/developer-guides/speech/asr-realtime
- Alibaba Cloud Qwen-Omni-Realtime guide: https://help.aliyun.com/zh/model-studio/realtime
- Alibaba Cloud realtime server events: https://help.aliyun.com/zh/model-studio/server-events

## Recommended Architecture

### Phase 1: Push-To-Talk Qwen ASR

Implement a new server endpoint, separate from the existing TTS endpoint:

- `POST /api/ai-tutor/speech`
- Auth required, same student/session model as AI Tutor.
- Rate limited separately from reply playback.
- Request body contains one short recorded utterance as 16 kHz mono PCM16 or a tightly defined supported audio payload.
- Server opens Qwen-ASR-Realtime WebSocket, sends:
  - `session.update`
  - `input_audio_buffer.append` chunks
  - `input_audio_buffer.commit`
  - `session.finish`
- Server returns JSON:
  - `transcript`
  - `language`
  - `provider: "qwen"`
  - `model: "qwen3-asr-flash-realtime"`
  - optional timing/error metadata

Client behavior:

- Replace production microphone transcription with Qwen ASR when `status.speech.configured === true`.
- Keep browser `SpeechRecognition` only as local/dev fallback if Qwen ASR is not configured.
- Show explicit states: recording, transcribing, transcript ready, permission blocked, provider unavailable, provider timeout, and no speech detected.
- Preserve the current flow: recognized text fills the input; the student still taps Send.

### Phase 2: Streaming Partial Transcript

After Phase 1 is stable, add partial transcript UI:

- Stream interim transcript text from server to client using a fetch stream or SSE-style response.
- Display interim transcript while recording/transcribing.
- Use `conversation.item.input_audio_transcription.delta` for preview and `conversation.item.input_audio_transcription.completed` for final text.

### Deferred: Full Duplex Voice Conversation

Do not combine ASR, AI response generation, and TTS into one continuous duplex voice-agent release yet.

That requires a broader design for interruption handling, echo cancellation, turn taking, teacher/student privacy rules, and provider-cost guardrails.

## Configuration

Add explicit ASR configuration instead of overloading TTS names:

- `QWEN_ASR_REALTIME_API_URL`
- `QWEN_ASR_REALTIME_MODEL`
- `AI_TUTOR_SPEECH_MAX_REQUESTS_PER_MINUTE`
- `AI_TUTOR_SPEECH_PROVIDER_TIMEOUT_MS`
- `AI_TUTOR_SPEECH_MAX_AUDIO_SECONDS`

Use `QWEN_API_KEY` as the secret key unless S19 chooses a separate key.

## Acceptance Criteria

- On mobile Chrome and Safari, tapping the mic records an utterance and fills the input with Qwen transcript text.
- Chinese speech works even when the UI is English, provided language selection or auto/default Chinese handling is configured.
- Cantonese / Hong Kong Chinese is tested with `yue` or a product-approved language fallback.
- Permission-denied and provider-failure states are visible and actionable.
- No Qwen API key is exposed to the browser.
- Guest users cannot call the ASR endpoint.
- ASR and TTS rate limits are separate.
- `npm run type-check` passes.
- Mocked Playwright mobile coverage verifies:
  - Qwen transcript fills input.
  - permission denied shows the correct copy.
  - provider `401`, `429`, `503`, and `502` errors surface correctly.
- Live provider verification is run only with owner approval because it calls Qwen.

## Risks / Open Decisions

- Audio capture format: the most robust path is browser-side Web Audio conversion to 16 kHz mono PCM16, then server relay to Qwen. Raw `MediaRecorder` output is browser-dependent and may require transcoding.
- Region: current TTS defaults use DashScope China endpoint; ASR docs also show international endpoint examples. S19 should confirm region and entitlement for the production key.
- Language policy: decide whether to auto-detect, default to Chinese for mainland/HK lessons, or expose a small language selector in AI Tutor voice settings.
- Cost controls: ASR should cap utterance length and requests per minute before production rollout.
- Privacy: recorded audio should be processed transiently and not stored unless the owner explicitly approves a retention policy.
