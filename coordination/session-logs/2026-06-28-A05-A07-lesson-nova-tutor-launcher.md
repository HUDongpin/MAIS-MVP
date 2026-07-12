# 2026-06-28 A05/A07 Lesson Nova Tutor Launcher

## Agent

- Agent ID: A05 with A07 coordination
- Role: Lesson surface consuming AI Tutor launcher behavior

## Objective

Fix the owner-reported bug where the Lesson page has no bottom-right Nova Tutor launcher.

## Scope

- Write scope: `components/ai/AITutorProvider.tsx`, this session log.
- Forbidden scope: API/provider behavior, real environment files, unrelated lesson content/layout changes, Git staging/commits/branches, destructive cleanup.

## Evidence And Plan

1. Read `AGENTS.md`, systematic debugging guidance, and MAIS root-cause workflow.
2. Inspect dirty tree and relevant A05/A07 files.
3. Root-cause hypothesis: the A07 global launcher is intentionally hidden on `/lesson` and `/student/lessons` by `showTutorLauncher`, so A05 lesson routes lose the bottom-right Nova Tutor button while other routes keep it.
4. Reproduce with a focused browser/source check.
5. Remove only the lesson-route suppression, preserving immersive game hiding and selected-text lesson tutor flows.
6. Verify with the original lesson route and `npm run type-check` when practical.

## Notes

- Root checkout was already heavily dirty, including A05 and A07 files. No unrelated changes will be reverted.

## Agent Daily Work Report

- Date: 2026-06-28
- Agent ID: A05 with A07 coordination
- Workstream: Lesson surface consuming AI Tutor launcher behavior
- Status: Completed
- Objective: Restore the bottom-right Nova Tutor launcher on Lesson pages.
- Summary of work completed:
  - Reproduced the owner-reported symptom on local dev: authenticated `/student/lessons/functions` had no accessible `Nova Tutor` launcher (`count: 0`, `visible: false`).
  - Identified the root cause in A07-owned `components/ai/AITutorProvider.tsx`: `showTutorLauncher` explicitly hid the launcher on `/lesson` and `/student/lessons` paths.
  - Removed only that lesson-route suppression so the launcher is shown whenever the tutor panel is closed, while preserving the existing immersive-game mobile hiding behavior.
- Files changed:
  - `components/ai/AITutorProvider.tsx`
  - `coordination/session-logs/2026-06-28-A05-A07-lesson-nova-tutor-launcher.md`
- Checks run:
  - Pre-fix browser probe on `http://127.0.0.1:3038/student/lessons/functions`: reproduced missing launcher.
  - Source check: no remaining lesson-route suppression in `showTutorLauncher`; it is now `!tutorPanelOpen`.
  - `npm run type-check`: passed.
- Checks not run:
  - Post-fix full browser probe on the authenticated lesson route could not be completed after the Next dev server hit `ENOSPC: no space left on device` while writing cache; after hot reload, API routes returned 404 in that local dev-server instance.
- Blockers:
  - Disk space is critically low (`/System/Volumes/Data` had about 457 MiB free), which made Next dev-server browser verification unstable.
- Risks:
  - Low product risk: the change is scoped to removing the lesson-route exclusion from the global launcher visibility condition.
- Assumptions:
  - The owner wants the same bottom-right global Nova Tutor launcher on Lesson routes as on other student routes.
- Coordination notes for other agent sessions:
  - A07 owns the AI Tutor launcher behavior; A05 consumes it on lesson routes. A22 may need disk hygiene before further dev-server/browser evidence is reliable.
- Follow-up recommendations:
  - After disk cleanup, rerun a browser smoke on `/student/lessons/functions` to capture visual evidence of the restored bottom-right launcher.
  - Next suggested owner/agent: A22 for disk/dev-server hygiene if more browser verification is needed.
