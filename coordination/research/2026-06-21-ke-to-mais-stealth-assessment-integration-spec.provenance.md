# Provenance: KE-to-MAIS Stealth Assessment Integration Spec

Prepared: June 21, 2026

## Source Artifacts

- `work/sources/LAforKE.html`
- `work/sources/aboutKE.html`
- `work/sources/LAforKE.refresh.html`
- `work/sources/aboutKE.refresh.html`
- `outputs/Knowledge Explorer as a stealth assessment.md`
- `outputs/KE-to-MAIS behavior-event-dictionary.csv`

## Freshness Check

On June 21, 2026, the live `https://ke.skoonline.org/LAforKE` and `https://ke.skoonline.org/aboutKE.html` pages were re-fetched. The refreshed HTML matched the previously captured HTML byte-for-byte.

## MAIS-MVP Evidence Inspected

- `/Users/dongpinhu/Desktop/MAIS-MVP/AGENTS.md`
- `/Users/dongpinhu/Desktop/MAIS-MVP/types/index.ts`
- `/Users/dongpinhu/Desktop/MAIS-MVP/lib/learningAnalytics.ts`
- `/Users/dongpinhu/Desktop/MAIS-MVP/app/api/learning-events/route.ts`
- `/Users/dongpinhu/Desktop/MAIS-MVP/lib/server/lrsClient.ts`
- `/Users/dongpinhu/Desktop/MAIS-MVP/lib/adaptiveLearning.ts`
- `/Users/dongpinhu/Desktop/MAIS-MVP/components/dashboard/LearningAnalyticsReport.tsx`
- `/Users/dongpinhu/Desktop/MAIS-MVP/components/dashboard/StudentProfilePanel.tsx`

## Method

The public LAforKE behavior table was parsed into a CSV. Because the public page compresses some behavior IDs into ranges, the CSV preserves visible ID ranges instead of inventing hidden atomic rows. The integration spec then maps those rows into MAIS event sources, payload fields, xAPI verbs, privacy tiers, model consumers, and session ownership.

## Dirty Worktree Note

MAIS-MVP had a large pre-existing dirty worktree before this S16 research artifact was copied into the project. No existing source files were edited by this task.

