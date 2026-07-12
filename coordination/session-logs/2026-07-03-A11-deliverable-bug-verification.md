# 2026-07-03 A11 Deliverable Bug Verification

Agent IDs: A11 QA and release quality lead, consuming A22-owned production deploy context and routing findings to A01/A02/A03/A05/A06/A07/A12 as applicable.

Objective: Verify every unique bug claim in `/Users/dongpinhu/Downloads/20260703_Deliverable Bug and QA Report.docx` and classify whether each is a real bug against the current production/local evidence.

Scope:
- Read the DOCX report and embedded screenshots.
- Verify the named production routes on `https://mais.hk`.
- Use source/tests only as supporting evidence for expected behavior and ownership routing.
- Write A11 verification evidence under `coordination/reports/`.

Non-scope:
- No feature-code edits.
- No Git staging, commit, branch, merge, rebase, push, delete, reset, clean, or revert.
- No secret values in logs, reports, screenshots, or command output summaries.

Initial unique bug claims:
- Bug 126: About logged-off progress.
- Bug 127: Student Roadmap logged-off progress.
- Bug 128: Primary roadmap missing Kindergarten subway route.
- Bug 129: Nova Tutor AI voice playback not loading; duplicate row present in source DOCX.
- Unnumbered: Lessons database outage.
- Unnumbered: Visualization Lab clipping for `us-ca-math-p5-5-oa-expressions-patterns`.

Planned checks:
- Extract DOCX text/tables/images and confirm item count.
- Run production HTTP/API checks for public/protected route status.
- Run targeted Playwright browser checks for logged-out About/Roadmap, authenticated primary roadmap, authenticated lesson route, Nova Tutor voice capability, and visualization clipping.
- Save a concise A11 verification report with verdicts, evidence, and owner routing.

Completion:
- Extracted DOCX text, tables, and embedded images. Unique claims: Bug 126, Bug 127, Bug 128, duplicate Bug 129/Nova Tutor, unnumbered Lessons outage, unnumbered Visualization Lab clipping.
- Wrote verification report: `coordination/reports/2026-07-03-A11-deliverable-bug-verification.md`.
- Captured screenshots in `coordination/reports/screenshots/2026-07-03-A11-deliverable-bug-verification/`.

Final classification:
- Real as a logged-out UX/state-copy issue: Bug 126.
- Not real as written, but route blank/skeleton issue exists: Bug 127.
- Real, but broader than described: Bug 128 is full primary-roadmap blank rendering, not just Kindergarten route data absence.
- Real endpoint/provider issue: Bug 129 voice playback. The DOCX row is duplicated and has copied/wrong reproduction steps.
- Not current as P0 database outage: Lessons route rendered for the exact screenshot slug after authentication; authenticated lesson API slowness remains a follow-up risk.
- Not reproduced: Visualization Lab clipping at 5/5; measured SVG overflow issue count was 0 after the lab loaded.

Checks run:
- `textutil -convert txt -stdout /Users/dongpinhu/Downloads/20260703_Deliverable\ Bug\ and\ QA\ Report.docx`
- DOCX OOXML table/image extraction via Python standard library.
- Production HTTP checks with `curl` for About, Roadmap, Lessons, and AI Tutor status.
- Targeted Playwright production browser checks for the six unique bug claims.
- Source reads for A03 roadmap, A05 lesson, A06 visualization, and A07 voice endpoint behavior.

No Git staging, commit, branch, merge, rebase, push, delete, reset, clean, or revert was performed.
