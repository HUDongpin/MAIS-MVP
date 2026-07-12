# www.mais.hk AI Tutor Voice Smoke Test

- Date/time: 2026-06-04 09:49-09:51 Asia/Hong_Kong
- Session: S11 QA and release quality
- Target: `https://www.mais.hk`
- Scope: AI tutor voice input control and reply voice playback control
- Account used: public demo student `HK Student Peter`

## Result

Overall: PASS for logged-in reply voice playback and AI tutor voice-control UI smoke coverage, with one important implementation note.

- Voice playback / speaker button: PASS after login. The AI tutor reply voice switch was visible, enabled, toggled from `false` to `true`, and triggered `/api/ai-tutor/voice`.
- Qwen voice synthesis: PASS. Authenticated request returned `200`, `Content-Type: audio/wav`, `X-AI-Tutor-Voice-Provider: qwen`, `X-AI-Tutor-Voice-Model: qwen3.5-omni-flash-realtime`, and a valid WAV payload.
- Voice input button: PASS for UI integration. The microphone button was visible and enabled; a deterministic `SpeechRecognition` test transcript filled the AI tutor input and enabled Send.
- Actual room speaker output: NOT PROVABLE by headless automation. The page created a blob audio URL and called `audio.play()` with no play errors, but physical speaker output still needs a human audible check on a real device.

## Evidence

Production setup status:

```json
{
  "configured": false,
  "mode": "local-helper",
  "model": "deepseek-v4-pro",
  "provider": "deepseek",
  "text": {
    "configured": false,
    "model": "deepseek-v4-pro",
    "provider": "deepseek"
  },
  "image": {
    "configured": true,
    "model": "qwen3.7-plus",
    "provider": "qwen"
  },
  "voice": {
    "configured": true,
    "model": "qwen3.5-omni-flash-realtime",
    "provider": "qwen"
  }
}
```

Unauthenticated voice endpoint behavior:

- `POST /api/ai-tutor/voice` without login returned `401 {"error":"Authentication required."}`.

Authenticated Qwen voice endpoint behavior:

- `POST /api/ai-tutor/voice` with the demo student session returned `200`.
- Response headers included:
  - `content-type: audio/wav`
  - `x-ai-tutor-voice-provider: qwen`
  - `x-ai-tutor-voice-model: qwen3.5-omni-flash-realtime`
- Response payload: 134,444 bytes.
- File identification: `RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 24000 Hz`.

Browser UI smoke:

- Login via `/api/auth/login`: `200`.
- AI tutor status response: voice configured with Qwen realtime model.
- Reply voice switch:
  - visible: `true`
  - disabled before click: `false`
  - aria checked before: `false`
  - aria checked after: `true`
- Microphone button:
  - visible: `true`
  - disabled before click: `false`
  - test transcript after click: `What is two plus three?`
  - Send enabled after transcript: `true`
- AI tutor text request: `503`, expected from current production text setup because text provider is not configured.
- Voice request after AI tutor fallback reply: `200 audio/wav`, provider `qwen`, model `qwen3.5-omni-flash-realtime`.
- Browser media event: `audio.play()` called once for a blob URL, no play errors captured.

Screenshot:

- `output/playwright/2026-06-04-www-mais-ai-tutor-voice.png`

## Important Note

Current implementation separates two voice paths:

- Voice input uses browser `SpeechRecognition` / `webkitSpeechRecognition`.
- Reply playback uses the Qwen realtime voice endpoint `/api/ai-tutor/voice`.

So if the product requirement is "students speak, Qwen transcribes the speech," that is not what the current production path is doing. Qwen is confirmed for reply voice synthesis, not microphone speech-to-text input.

## Risks And Follow-Up

- Production text AI is currently not configured: `/api/ai-tutor/status` reports `text.configured: false`, and `/api/ai-tutor` returned `503`. The tutor still displays local fallback guidance, and Qwen voice can read that fallback aloud.
- Guest users can see/toggle voice UI only after voice status loads, but direct voice playback API requires authentication. In a guest flow, the endpoint returns `401`.
- Manual human check recommended on Chrome/Safari mobile and desktop: speak into the mic with real audio, then verify the external speaker produces audible sound after enabling Reply voice.
