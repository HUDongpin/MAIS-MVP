# A22 Release-Source Clean Blocker Evidence

Generated: 2026-07-06T15:50:05.318Z

Release-source gate command: `node coordination/release-intake/assert-release-source-clean.mjs`

This is A25 release-intake evidence for the A22-owned release-source clean gate. It records only status counts, hashes, command status, and path-only samples. It does not copy file contents and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Release source clean: no
- Release source blocked: yes
- Root status entries: 5183
- Dirty-map expanded entries: 5183
- Dirty-map collapsed entries: 1461
- Cleanup-authorized rows: 0
- Executable rows: 0
- Content-captured rows: 0

## Gate Result

- Status: 1
- Passed: no

| Gate output |
| --- |
| `A22 release-source clean gate failed.` |
| `Release source is dirty: 5183 expanded status entries in /Users/dongpinhu/Desktop/MAIS-MVP.` |
| `Branch: main` |
| `HEAD: ce2ae5258` |
| `Sample:` |
| `M .env.local.example` |
| ` M .gitignore` |
| ` M .vercelignore` |
| ` M AGENTS.md` |
| ` M README.md` |
| ` M app/adaptive-learning/loading.tsx` |
| ` M app/adaptive-learning/page.tsx` |
| ` M app/api/adaptive-learning/next/route.ts` |
| ` M app/api/adaptive-learning/refresh/route.ts` |
| ` M app/api/ai-tutor/route.ts` |
| ` M app/api/ai-tutor/status/route.ts` |
| ` M app/api/analytics/export/route.ts` |
| ` M app/api/analytics/summary/route.ts` |
| ` M app/api/attempts/route.ts` |
| ` M app/api/auth/login/route.ts` |
| ` M app/api/auth/logout/route.ts` |
| ` M app/api/auth/password-change/route.ts` |
| ` M app/api/auth/password-reset/confirm/route.ts` |
| ` M app/api/auth/password-reset/request/route.ts` |
| ` M app/api/auth/register/route.ts` |
| ` M app/api/dashboard/route.ts` |
| ` M app/api/handwriting-recognition/route.ts` |
| ` M app/api/learning-events/route.ts` |
| ` M app/api/lesson-entry/route.ts` |
| ` M app/api/lessons/[slug]/route.ts` |
| `Allowed sources: clean worktree, clean clone, reviewed clean release slice, or explicitly owner-approved pruned staging package.` |

## Status Counts

- Status signature: `e5d4828e9fae476ba7926888b1265ece75ccc53ac9c9916db51cdd28a65f85d8`
- Dirty-map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

| Status code | Count |
| --- | ---: |
| ` D` | 1 |
| ` M` | 390 |
| `??` | 4791 |
| `M ` | 1 |

## Status Sample

| Path-only status sample |
| --- |
| `M .env.local.example` |
| ` M .gitignore` |
| ` M .vercelignore` |
| ` M AGENTS.md` |
| ` M README.md` |
| ` M app/adaptive-learning/loading.tsx` |
| ` M app/adaptive-learning/page.tsx` |
| ` M app/api/adaptive-learning/next/route.ts` |
| ` M app/api/adaptive-learning/refresh/route.ts` |
| ` M app/api/ai-tutor/route.ts` |
| ` M app/api/ai-tutor/status/route.ts` |
| ` M app/api/analytics/export/route.ts` |
| ` M app/api/analytics/summary/route.ts` |
| ` M app/api/attempts/route.ts` |
| ` M app/api/auth/login/route.ts` |
| ` M app/api/auth/logout/route.ts` |
| ` M app/api/auth/password-change/route.ts` |
| ` M app/api/auth/password-reset/confirm/route.ts` |
| ` M app/api/auth/password-reset/request/route.ts` |
| ` M app/api/auth/register/route.ts` |
| ` M app/api/dashboard/route.ts` |
| ` M app/api/handwriting-recognition/route.ts` |
| ` M app/api/learning-events/route.ts` |
| ` M app/api/lesson-entry/route.ts` |
| ` M app/api/lessons/[slug]/route.ts` |
| ` M app/api/me/profile/route.ts` |
| ` M app/api/me/route.ts` |
| ` M app/api/me/settings/route.ts` |
| ` M app/api/parent/children/link/route.ts` |
| ` M app/api/parent/messages/[threadId]/reply/route.ts` |

## Allowed Release Sources

- clean worktree
- clean clone
- reviewed clean release slice
- explicitly owner-approved pruned staging package

## Boundary

Every row remains non-executable. This evidence preserves why the A22 release-source clean gate is blocked; it does not make any root dirty entry eligible for cleanup, discard, staging, commit, deploy, or worktree lifecycle action.
