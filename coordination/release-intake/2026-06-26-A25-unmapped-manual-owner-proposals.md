# 2026-06-26 A25 Unmapped Manual Owner Proposals

Generated: 2026-06-26T11:15:03.887Z

Dirty map: `coordination/release-intake/latest-A25-dirty-tree-map.json`

Source owner bucket: Unmapped/manual owner needed

Source entries: 8

## Proposed Owner Buckets

| Proposed owner | Entries | Pathspec |
| --- | ---: | --- |
| A10 tooling, docs, and report | 3 | `coordination/release-intake/latest-A25-proposed-manual-owner-a10-tooling-docs-and-report.pathspec` |
| A08 state and analytics lead | 2 | `coordination/release-intake/latest-A25-proposed-manual-owner-a08-state-and-analytics-lead.pathspec` |
| A22 production reliability and release engineering | 1 | `coordination/release-intake/latest-A25-proposed-manual-owner-a22-production-reliability-and-release-engineering.pathspec` |
| A23 integration and promotion lead | 1 | `coordination/release-intake/latest-A25-proposed-manual-owner-a23-integration-and-promotion-lead.pathspec` |
| A25 git hygiene and release intake | 1 | `coordination/release-intake/latest-A25-proposed-manual-owner-a25-git-hygiene-and-release-intake.pathspec` |

## Confidence

- medium: 5
- high: 3

## Proposals

| Status | Path | Proposed owner | Confidence | Coordination | Rationale |
| --- | --- | --- | --- | --- | --- |
| `M` | `next-env.d.ts` | A10 tooling, docs, and report | medium | A22 production reliability and release engineering | Next.js generated type surface should be reviewed as tooling/build metadata. |
| `??` | `coordination/integration/2026-06-21-S23-generated-content-source-package-gate.md` | A23 integration and promotion lead | high | A18 curriculum QA / A21 content pipeline; A25 git hygiene and release intake | Integration gate evidence is A23-owned by coordination contract. |
| `??` | `design-qa.md` | A10 tooling, docs, and report | medium | A11 QA and release quality | Root design QA note is coordination/report evidence unless a feature owner claims it. |
| `??` | `scripts/bug-triage.js` | A10 tooling, docs, and report | high | A11 QA and release quality | General triage tooling belongs with A10 coordination/tooling. |
| `??` | `scripts/refresh-dirty-tree-map.mjs` | A25 git hygiene and release intake | high | A10 tooling, docs, and report | Dirty-tree map generation is A25 release-intake tooling. |
| `??` | `scripts/resend-local-smoke.mjs` | A22 production reliability and release engineering | medium | A19 API configuration and deployment env lead | Local smoke tooling affects release/deployment readiness and env parity. |
| `??` | `scripts/run-analytics-tests.mjs` | A08 state and analytics lead | medium | A10 tooling, docs, and report | Analytics test runner should be reviewed by A08 with A10 tooling coordination. |
| `??` | `tsconfig.analytics.json` | A08 state and analytics lead | medium | A10 tooling, docs, and report; A22 production reliability and release engineering | Analytics TypeScript config supports A08 analytics checks with A10/A22 build coordination. |
