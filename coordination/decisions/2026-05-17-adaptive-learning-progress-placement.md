# Adaptive Learning Progress Placement Decision

- Date: 2026-05-17
- Session: S10
- Topic: Student Adaptive Learning Progress page placement
- Status: Owner-approved product decision

## Decision

Adaptive Learning Progress should remain on the standalone `/adaptive-learning` page.

The full Adaptive Learning Progress panel is not required to be embedded directly in `/dashboard`.

## Product Direction

`/dashboard` may provide navigation, a lightweight summary, or an entry point to adaptive learning, but it should not be treated as incomplete solely because it does not contain the full Adaptive Learning Progress module.

`/adaptive-learning` remains the canonical student surface for:

- adaptive recommendations
- skill mastery and progress details
- weekly activity and review cues
- teacher-assigned adaptive work
- adaptive engine status and explainability

## Coordination Notes

- S02 owns dashboard/adaptive-learning UI surfaces.
- S15 owns adaptive engine semantics and recommendation quality.
- S11 should treat the previous dashboard-placement QA gap as resolved by product decision, not as a release blocker, unless a later owner decision changes the placement requirement.
- Future president reports should not list dashboard embedding as an open owner decision.

