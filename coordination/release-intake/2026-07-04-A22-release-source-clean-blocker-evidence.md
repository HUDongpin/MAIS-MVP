# A22 Release-Source Clean Blocker Evidence

Generated: 2026-07-04T15:49:56.045Z

Release-source gate command: `node coordination/release-intake/assert-release-source-clean.mjs`

This is A25 release-intake evidence for the A22-owned release-source clean gate. It records only status counts, hashes, command status, and path-only samples. It does not copy file contents and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Release source clean: no
- Release source blocked: yes
- Root status entries: 4323
- Dirty-map expanded entries: 4323
- Dirty-map collapsed entries: 1457
- Cleanup-authorized rows: 0
- Executable rows: 0
- Content-captured rows: 0

## Gate Result

- Status: 1
- Passed: no

| Gate output |
| --- |
| `A22 release-source clean gate failed.` |
| `Release source is dirty: 4323 expanded status entries in /Users/dongpinhu/Desktop/MAIS-MVP.` |
| `Branch: main` |
| `HEAD: e909992b0` |
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

- Status signature: `026bcdae29a6f7a5bfe870be5392ea4e1be9ebc6129b83d9e01e76f9e0bb04dd`
- Dirty-map signature: `0ed815279a9afc7897df7ef48f2e250da494e4a227adc0a6da14547ba9048571`

| Status code | Count |
| --- | ---: |
| ` D` | 1 |
| ` M` | 390 |
| `??` | 3931 |
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
