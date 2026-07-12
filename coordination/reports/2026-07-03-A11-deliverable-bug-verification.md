# 2026-07-03 A11 Deliverable Bug Verification

- Agent: A11 QA and release quality lead.
- Source report: `/Users/dongpinhu/Downloads/20260703_Deliverable Bug and QA Report.docx`.
- Production target checked: `https://mais.hk`.
- A22 deploy context consumed: `coordination/reports/2026-07-03-A22-mais-domains-production-deploy.md`.
- Scope: verification only. No code edits, no Git operations, no secret values recorded.

## Executive Verdict

The DOCX contains six unique bug claims. Three are real in some form, but two of those are misdescribed. Three are not reproduced as written.

| Report item | Verdict | A11 verification summary | Severity adjustment |
| --- | --- | --- | --- |
| Bug 126 About logged-off progress | Real, but not API/auth | Fresh logged-out `/about` shows the static Personalized Practice Mission with `Start`, `In progress`, and `0/5`. It is a logged-out UX/state-copy issue. | P3/P4, not P2 API |
| Bug 127 Student Roadmap logged-off progress | Not real as written; real route-rendering issue exists | Fresh logged-out `/student/roadmap` did not show another user's grade path or nonzero analytics. Anonymous `/api/me` returned 401 and anonymous `/api/roadmap` returned zero-mastery sample topics. However, the roadmap page itself stayed blank/skeleton. | Route blank is P1/P2; cross-user progress claim not reproduced |
| Bug 128 Primary roadmap missing Kindergarten subway route | Real, but wrong scope/root | Source/API includes Kindergarten: `primaryGrades` includes `K`, authenticated `/api/roadmap` returned 6 K topics. Production `/student/roadmap/primary` rendered no map/SVG after 60s, so Kindergarten is missing because the whole map is blank. | P1 route-rendering bug |
| Bug 129 Nova Tutor voice playback not loading | Real | `/api/ai-tutor/status` reports voice configured, but authenticated `POST /api/ai-tutor/voice` ended with a socket hang-up. The DOCX has duplicate Bug 129 rows and copied roadmap reproduction steps, so the report text is unreliable. | P1 voice endpoint/provider path, not roadmap |
| Lessons database outage | Not current as written | The exact screenshot URL `/student/lessons/us-ca-math-p1-1-oa-add-subtract` now renders the lesson when authenticated. Anonymous API preview returns 200 and anonymous page redirects to login. I did see slow/authenticated lesson API timeouts, so keep a degraded-performance watch, but no current P0 outage. | Not P0; possible P2/P1 performance follow-up |
| Visualization Lab clipping | Not reproduced | The exact P5 lab eventually loaded; with left value 5 and right value 5, measured SVG overflow issue count was 0. Initial load was slow, but the reported corner clipping was not present. | Close clipping claim; optional performance watch |

## Evidence Notes

- DOCX extraction found a duplicate Bug 129 row. The Nova Tutor rows reuse the Kindergarten roadmap steps/expected/actual text, so they cannot be trusted as reproduction instructions.
- Screenshots captured under `coordination/reports/screenshots/2026-07-03-A11-deliverable-bug-verification/`.
- No credential values or session tokens are recorded here.

## Route Evidence

- `/about`: HTTP 200, fresh logged-out context, no session cookie. Page contains the static mission showcase with `Start`, `In progress`, and `0/5`.
- `/student/roadmap`: HTTP 200, fresh logged-out context. No cross-user progress reproduced; page stays on the roadmap shell/skeleton.
- `/student/roadmap/primary`: HTTP 200, authenticated check. Source/API has K topics, but production UI renders no primary map/SVG even after 60s.
- `/api/ai-tutor/status`: HTTP 200; voice readiness reported configured. Authenticated voice synthesis request did not complete successfully.
- `/api/lessons/us-ca-math-p1-1-oa-add-subtract`: anonymous preview returned HTTP 200. Authenticated page rendered the lesson content; authenticated API calls were slow/time-limited in the harness.
- `/student/tools/visualizations?grade=P5&lab=us-ca-math-p5-5-oa-expressions-patterns`: loaded after a long wait. At 5/5, measured SVG overflow issue count was 0.

## Owner Routing

- A01/A09: Bug 126 logged-out About mission state/copy.
- A03/A22: Bug 127 and Bug 128 roadmap route rendering/skeleton behavior.
- A07/A12/A19/A22: Bug 129 voice endpoint/provider path; A19 only for redacted env readiness, not provider behavior.
- A05/A12/A22: Lessons authenticated API slowness watch; no current outage reproduced.
- A06/A22: Visualization Lab slow-load watch; clipping claim not reproduced.

## Recommended Next Actions

1. Treat Bug 128/roadmap blank rendering as the highest-priority confirmed UI failure from this report.
2. Route Nova Tutor voice to A07 with A12/A19/A22 support: status says configured, but live synthesis does not complete.
3. Downgrade or close the Lessons P0 outage claim after owner review, while keeping a separate performance ticket for authenticated lesson API timeouts.
4. Close the Visualization clipping item unless a new screenshot reproduces clipping after the lab has fully loaded.
