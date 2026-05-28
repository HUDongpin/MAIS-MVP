# Export Guide

## Required Outputs

| File | Duration | Use |
|---|---:|---|
| `mais-fii-innovators-pitch-master-150s.mp4` | 2:30 | Main application/pitch video |
| `mais-fii-student-console-60s.mp4` | 1:00 | Student console introduction |
| `mais-fii-teacher-console-30s.mp4` | 0:30 | Teacher console introduction |
| `mais-fii-dr-peter-hu-founder-60s.mp4` | 1:00 | Founder/developer introduction |
| `mais-fii-master.en.srt` | 2:30 | English subtitles |
| `mais-fii-thumbnail.png` | 16:9 | Upload thumbnail |

## Export Settings

- Aspect ratio: 16:9 landscape.
- Resolution: 1920x1080.
- Frame rate: 30 fps.
- Video codec: H.264.
- Audio: AAC, 48 kHz, stereo.
- Subtitles: export both burned-in captions for social sharing and a separate `.srt` file for upload.

## QC Rules

- Master duration must be exactly 2:30, with no more than 0.5 seconds tolerance.
- Student chapter must end at exactly 1:00.
- Teacher chapter must end at exactly 1:30.
- Founder chapter must end at exactly 2:30.
- No `.env`, API key, private student data, browser address bar with secrets, or real inbox content may appear.
- Every on-screen product claim must be listed in `claim-check.md`.
- UI text must remain readable. If a screen is dense, crop/zoom/call out the relevant panel.
