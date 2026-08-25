# 2026-08-26 A04 Promotion Legacy Live Repair

- Owner: A04 Practice lead
- Branch: `codex/a04-promotion-legacy-live-repair-20260826`
- Worktree: `.worktrees/a04-promotion-legacy-live-repair-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@2f6b6d192d024c2e6a16811f81ca7e4faa7e4375` (`origin/main@7f7c4859877c9808fb4bdf98287bb5645b6e751b` plus the reviewed Promotion Gate composition)
- Declared slice: remove live reachability for candidate-only or incompletely approved practice packages identified by the fail-closed Promotion Gate audit; retain only exact owner-approved runtime packages; hand the resulting contract to A11 for independent regression assertions.
- Explicit package scope: mainland BNU primary v1/v2, mainland HJB primary v1, mainland HJB high v1/v2/v3/v4, Arkansas G6-G12 v1, Florida middle-school v1, and the California 492-question knowledge-point package.
- Hard boundary: candidate source packages remain immutable; no content rewrite, live promotion, Preview, deploy, provider, database, credential, production write, or `liveAllowed=true` action is authorized.
- Preserve-first intake: A25 refresh `promotion-attempt-002-intake-20260826-b` completed before the parent A23 worktree was created; the shared root is not used as an implementation or evidence source.

## Initial state

- The worktree was created cleanly from the exact A23 composition commit.
- Promotion Gate discovery on current `main` reports sixteen unregistered candidate/live conflicts plus one opaque conflict and the known 492-question conflict. This slice addresses A04-owned runtime reachability; exact approved exceptions remain subject to A18/A23 digest-bound resolution records.

## Handoff / closeout

- Runtime selection changes:
  - removed BNU primary v1/v2, HJB primary v1, HJB high v1-v4, and Florida middle-school v1 from the public question/topic aggregates;
  - removed the Arkansas G6-G12 candidate import while retaining the independently reviewed Arkansas K-G5 package;
  - removed both the California 492-question package and the opaque adaptive-beta identity/import chain while retaining the separate hand-checked CCSS textbook-practice package;
  - changed the HJB high compatibility adapter so it no longer turns embedded pending QA states into `pass`/`approved`, and made its generic runtime export empty.
- Evidence correction: A18's exact-package audit shows HJB high v2 authorized integration planning only, not student publication. It is therefore de-reached together with v1, v3, and v4; no HJB high exception is claimed.
- Verification:
  - `npm ci` completed from the clean worktree (dependency audit separately reported 1 moderate and 4 high advisories; no dependency mutation was attempted).
  - `npm run type-check` passed.
  - A compiled aggregate inspection reported zero IDs for all six forbidden runtime families: BNU primary, HJB primary, HJB high v1-v4, Arkansas G6-G12, California K-G5 knowledge-point practice, and Florida middle-school. It retained 1,500 BNU junior, 1,500 BNU high, 1,500 HJB junior, 1,500 Arkansas K-G5, and 810 CCSS textbook-practice questions.
  - `npm run test:question-bank` completed 78/98 tests and intentionally remained red on 20 assertions that still encode the old live assumptions or depend on pending A03/A05/A12 de-reach slices. This is recorded as a blocker, not represented as a green gate.
- Required composition follow-up:
  - A03 must remove candidate-only HJB primary/high roadmap reachability.
  - A05 must remove BNU primary, HJB primary/high, Arkansas textbook, California K-G5 candidate textbook, old California review textbook, and Florida lesson reachability.
  - A12 must remove the corresponding dynamic question loaders and replace the California demo-assessment IDs with IDs from an approved live package.
  - A11 must update broad regression expectations and independently prove that candidate IDs are absent while approved secondary/K-G5/CCSS surfaces remain intact.
- Candidate JSON files were not modified. No live promotion, Preview, deployment, provider, database, credential, or production write occurred; `liveAllowed` remains false.
