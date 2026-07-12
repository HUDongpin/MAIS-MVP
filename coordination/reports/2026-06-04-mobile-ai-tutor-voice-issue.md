# Mobile AI Tutor Reply Voice Issue

- Date/time: 2026-06-04 Asia/Hong_Kong
- Session: S07 AI tutor lead
- Target: mobile AI Tutor voice settings
- Trigger: User screenshot reported that the "volume/speaker button" did not work.

## Root Cause

The screenshot mixes two separate voice flows:

- The bottom red message, `I did not catch that...`, is microphone speech-recognition failure.
- The `Reply voice` switch is reply playback. Before this fix it only affected future Nova replies; turning it on after a reply was already visible did not replay that reply.

There were also two silent-failure paths:

- Guest users could see `Nova replies will be read aloud`, but `/api/ai-tutor/voice` returns `401 Authentication required`.
- If `/api/ai-tutor/voice` failed or the browser rejected `audio.play()`, the UI swallowed the failure and showed no actionable state.

## Change Made

Updated `components/ai/AITutorProvider.tsx`:

- Disables Reply voice for guests and shows `Sign in to hear Nova replies aloud.`
- When a signed-in user turns Reply voice on after a tutor reply already exists, it immediately reads the latest Nova reply.
- Adds a `Read latest reply` button while Reply voice is enabled.
- Adds visible playback states:
  - `Preparing reply voice...`
  - `Playing reply voice...`
  - `Please sign in before using reply voice.`
  - `I could not play the reply voice. Try again, or check device volume and silent mode.`
- Keeps Qwen playback errors from failing silently.

## Verification

Checks run:

- `npm run type-check`: passed.
- Local mobile Playwright smoke with mocked AI/voice endpoints:
  - Guest voice setting disabled and sign-in note visible.
  - Logged-in user sends a reply, then enables Reply voice; latest reply is read immediately.
  - `Read latest reply` button is visible.
  - Voice request fired once and mocked `Audio.play()` was called once.
  - Forced 401 voice response shows visible auth-required error.

Screenshots:

- `output/playwright/2026-06-04-local-mobile-voice-guest-disabled.png`
- `output/playwright/2026-06-04-local-mobile-voice-replay-on-enable.png`
- `output/playwright/2026-06-04-local-mobile-voice-auth-error.png`

## Remaining Note

Production text AI is still currently in local-helper mode, based on the earlier production smoke test. This does not block Qwen reply voice synthesis for signed-in users, but it explains the `Local helper mode` text shown in the mobile screenshot.
