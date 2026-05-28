# S18 Mainland HJB High V2 Lesson Page Readiness Update

- Date: 2026-05-24
- Session ID: S18
- Scope: Mainland HJB high-school V2 question package and lesson/practice release readiness
- Status: Superseded by final V2 QA and production-wiring checks on 2026-05-24

## Current Source Of Truth

The current Mainland HJB high-school candidate package is V2:

- Package directory: `coordination/content-qa/mainland-hjb-high-generated-bank-v2/`
- Production input: `question-pack.json`
- App batch metadata: `hjb-v2`
- Default app export: `mainlandHjbHighV2Questions` via `mainlandHjbHighQuestions`

Earlier same-day notes described a blocked pre-remediation state. That state is no longer the release basis. The final package QA is green: 1500/1500 rows are independently solvable and answer-key matched, with 0 P0/P1/P2, 0 failing rows, and 370/370 manual queue rows reviewed.

## Release Gate

Use `coordination/content-qa/mainland-hjb-high-generated-bank-v2/qa-report.md`, `quality-audit.md`, `solvability-audit.md`, `s18-promotability-decision.md`, and `release-note.md` as the final V2 QA evidence.

Formal student/teacher release still requires owner approval and the normal app release checklist, but the version label is now unified as V2 across QA, product copy, exports, and tests.
