# 2026-06-04 S11 Live Classroom Tools QA Brief

## Owner Request

Dr. Peter Hu accepted the recommendation to coordinate targeted QA for the new teacher live classroom tools.

## Scope

Target routes:

- `/teacher/live`
- `/classroom`
- `POST /api/teacher/live/tools`
- `GET /api/classroom/live`
- `POST /api/classroom/live/actions`

## Required Test Matrix

- Teacher starts a live classroom session and sees the join code, command stage, tool rail, and event stream.
- Teacher opens attendance; enrolled student checks in; teacher can set student status to present, late, absent, and excused.
- Random call defaults to present/late students and does not pick absent/excused students unless no eligible present students exist.
- Random call no-repeat history is respected until reset; allow-repeat mode can pick previously selected students.
- Buzzer opens a new round; first valid student submit is rank 1; duplicate submit by the same student does not create another ranking entry.
- Buzzer close prevents further student buzzer submissions.
- Countdown and stopwatch timer states are visible on both teacher and student views after polling refresh.
- Teams can be auto-created; teacher +1/-1 updates score and score remains in the current session.
- Answer projector defaults to anonymous display; teacher explicit show-names command reveals student names.
- Student screen sync command changes the student task context and student can acknowledge sync.
- Teacher whiteboard supports drawing, undo, and clear; student readonly whiteboard reflects strokes after polling.
- Math workbench push displays tool type and parameters on student view.
- Non-enrolled student cannot join or submit.
- Ended session cannot accept classroom actions.

## Suggested Checks

- Add focused Playwright coverage under `tests/e2e/` using existing auth/test helper patterns.
- Prefer deterministic test users/classes already seeded by the app.
- Use polling waits instead of fixed long sleeps where possible.

## Acceptance Criteria

- Targeted Playwright spec passes locally.
- Failures identify whether the issue is API state, auth/enrollment, polling latency, or UI rendering.
- QA report records any remaining manual-only checks for projector/fullscreen presentation.
