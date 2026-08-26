# 2026-08-26 A18 Promotion Shadow QA v2

- Owner: A18 Curriculum QA and content quality lead
- Branch: `codex/a18-promotion-shadow-qa-v2-20260826`
- Worktree: `.worktrees/a18-promotion-shadow-qa-v2-20260826`
- Target PR: compose into draft PR #162 (`https://github.com/HUDongpin/MAIS-MVP/pull/162`)
- Created: 2026-08-26 (Asia/Hong_Kong)
- Expected closeout: 2026-08-27
- Baseline: `codex/a23-promotion-shadow-attempt-002-20260826@191eba74a1`
- Declared slice: independently review all three records in candidate digest
  `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`
  for math, standards scope, answer policy, pedagogy, misconception coverage,
  language boundary, and Shadow/live disposition.
- Hard boundary: A18 supplies QA evidence only; no candidate rewrite, runtime
  integration, live authorization, Preview, deploy, or production action.

## Decision

- All three records are accepted for non-live Shadow.
- The practice numeric answer is independently recomputed as 12: preserve the
  oats:fruit order `3:5`, calculate `20 ÷ 5 = 4`, then `3 × 4 = 12`.
- The practice directly assesses `6.RP.3`, uses `6.RP.1` as a prerequisite, and
  does not by itself demonstrate `6.RP.2`; the cluster card may retain
  `6.RP.1`–`6.RP.3` as cluster scope.
- The lesson worked example matches the practice, both guided and independent
  checks are answerable, and remediation covers ratio reversal and failure to
  normalize/scale the paired quantity.
- English-only localization remains a live blocker. Shadow adapters must report
  missing `zh` / `zhHans` fields and must not invent them.

## Handoff / closeout

- Machine evidence is bound to the exact candidate digest, candidate source
  commit, clean runtime baseline, and checker version. Candidate is
  Shadow-eligible and live-ineligible.
- Applied the `california-math-common-core` source-policy, K-8 progression,
  standards-index, and MAIS integration rules. The local standards index
  validator passed with 11 grade records, 67 domains, and 392 standard entries;
  its Grade 6 `6.RP.ratios` row confirms the exact cluster IDs and the two
  misconception targets. This skill kept the evidence at identifier/structure
  and MAIS-authored-summary level rather than copying standard prose.
- The skill's generic pack auditor reports zero records for this intentionally
  single-record v2 shape, so that no-op result is not used as approval evidence.
  A separate exact cross-record assertion checked the index cluster, one primary
  assessed standard, arithmetic, accepted forms, lesson binding, answerable
  practice/rubric, both misconception remediations, localization blocker, and
  negative live eligibility; all checks passed.
