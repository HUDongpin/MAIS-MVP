# Decision: DeepSeek California K–G5 1,500-question pack — keep retired

- **Date:** 2026-07-18 (Asia/Hong_Kong)
- **Deciders:** Owner directive (via development-plan goal) + A18/A23 content gates
- **Status:** **DECIDED — keep downlisted (retired from live consideration).** Not promoted.
- **Pack:** `data/generated-content/us-ca-math-k-g5-generated-bank-v3-deepseek-1500/question-pack.json` (`packageId: us-ca-math-k-g5-generated-bank-v3-deepseek-1500`, 1,500 questions)

## Context

Live California K–5 practice currently rests on the **492-question** knowledge-point pack (`us-ca-k5-knowledge-point-practice-v1`, `knowledgePointPracticeLive: true`). The DeepSeek 1,500-question pack was **downlisted by the owner on 2026-06-19** (`californiaK5LiveContentStatus.practiceLive: false`, `data/usCaliforniaTopics.ts:148`) in favour of the S18-QA'd 492 pack; the grader correctly `404`s DeepSeek IDs. A 12-question DeepSeek subset also seeds an adaptive beta that is likewise off (`adaptiveBetaPracticeLive: false`).

The 2026-07-18 Student Console audit (`20260718_MAIS_Student Console_Bug Report.md`) flagged that any QA attached to this downlisted pack "does not describe what students see today."

## Decision & rationale

**Keep the pack retired (downlisted). Do not promote it to any live student surface.**

1. **Reverses no owner decision blindly.** Downlisting was a deliberate, documented owner choice (2026-06-19). Promotion would reverse it and must be an explicit owner call, not an automatic one.
2. **Promotion requires the full content gate, not just solvability.** Per `AGENTS.md` gate 5, live promotion needs A18 independent QA → A23 promotion planning → owning-surface implementation → A11 regression → A22 release readiness. Solvability-QA is necessary but **not sufficient**: the *live* 492 pack passed `fullQuestionBankSolvability` yet still shipped the P1 Kindergarten cardinality/attributes bugs fixed on 2026-07-18. A solvability-clean DeepSeek pack would carry the same conceptual-QA risk.
3. **No live exposure today, so no urgency.** The pack is gated out of `questionPacks` (`data/usCaliforniaTopics.ts:189`); students never receive it. There is no correctness risk from leaving it dormant.

## Decouple stale QA notes (bug-report rec #4)

- The pack file itself carries **no** embedded live-QA sign-off (its keys are `packageId, generatedAt, curriculumTrack, state, gradeSpan, rawCorpusAllowed, sourcePolicy, questions`), so nothing in the served data misrepresents itself as live.
- `deepseekQaStatus` / `"passed-deepseek-solvability-qa"` in `data/usCaliforniaTopics.ts` are **type definitions**, not live-content claims.
- Per `AGENTS.md` ("Do not rewrite historical artifacts"), historical reports are **not** edited; instead **this record is the authoritative status**: any DeepSeek-pack QA note predating 2026-07-18 describes the *dormant candidate*, **not** served content.

## If ever revisited (promotion path)

1. A18 runs independent conceptual + solvability QA over all 1,500 (the same battery that caught the 492-pack bugs), grade-by-grade.
2. A23 plans candidate→live promotion; A04/A05 own the live-surface wiring; A11 provides regression evidence; A22 confirms release readiness.
3. Owner flips `practiceLive` (and/or `adaptiveBetaPracticeLive`) only after all gates are green.

Until then: **retired.**
