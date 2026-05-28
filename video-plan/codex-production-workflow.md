# Codex Production Workflow

This is the practical workflow for using Codex to turn the video packet into a finished pitch asset.

## 1. Prepare Demo State

Ask Codex to verify that the MAIS demo app can run locally and that the target routes load:

```bash
npm run dev
```

Target routes:

- `/`
- `/dashboard`
- `/adaptive-learning`
- `/learning-path`
- `/practice`
- `/visualization-lab`
- `/teacher`
- `/teacher/analytics`
- `/teacher/live`

If a route requires login, use only a demo account or local seeded data. Do not expose real records.

## 2. Capture Screen Clips

Use Codex with browser automation to move through the routes in `shot-checklist.md`. Ask for one clip or screenshot set per route, then review for:

- clean UI state
- no console errors
- no private data
- readable text
- enough motion to feel alive

## 3. Generate Editing Assets

Ask Codex to produce or update:

- SRT subtitles from `voiceover-script.md`
- caption overlays from `on-screen-captions.md`
- chapter exports from `chapter-markers.csv`
- thumbnail copy from `assets/thumbnail-brief.md`

## 4. Claim QA

Before final export, ask Codex:

```text
Review the final transcript and on-screen captions against video-plan/claim-check.md. Flag any unsupported traction, revenue, adoption, or learning-outcome claims.
```

## 5. Accessibility QA

Ask Codex to check:

- captions are synchronized
- captions are readable on mobile
- dense UI screens are zoomed or highlighted
- no on-screen text disappears too quickly

## 6. Final Export QA

Ask Codex to verify the exported files:

- exact duration
- filename matches `export-guide.md`
- audio present
- subtitles included
- no private information visible

## Helpful Codex Prompts

### Route Capture Prompt

Open the MAIS app in the browser and capture clean screenshots for the FII video from `/dashboard`, `/adaptive-learning`, `/practice`, `/visualization-lab`, `/teacher`, `/teacher/analytics`, and `/teacher/live`. Use demo data only and flag any route that requires setup.

### Claim Review Prompt

Compare `video-plan/voiceover-script.md`, `video-plan/on-screen-captions.md`, and the final transcript against `video-plan/claim-check.md`. Return only claims that need evidence or softer wording.

### Editor Handoff Prompt

Turn `video-plan/storyboard.md` into a shot-by-shot editor checklist with clip names, expected duration, caption text, and notes for crop/zoom/callouts.
