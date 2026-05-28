# S18 Hard-Gate Remediation Report - Mainland BNU Primary V1

- Date: 2026-05-27
- Session ID: S18
- Strategy: minimal repair; preserve IDs, grades, types, topics, and candidate package scope.
- Original hard-gate rows repaired: 40
- Residual rerun rows repaired: 4
- Total edited rows: 44
- Candidate data edited: `questions.jsonl`, `questions.csv`, `question-pack.json`
- App integration status: candidate-only; not approved for public integration.

## Repair Summary

- Fixed 15 missing-condition / unsolvable rows by replacing blank visual references with complete textual conditions.
- Fixed 25 solvable-but-answer-mismatch rows by correcting answers, accepted answers, explanations, or single-choice distractors.
- Fixed 4 additional residual rows found by forced reruns: `bnu-primary-ds-v1-p1-215`, `bnu-primary-ds-v1-p2-109`, `bnu-primary-ds-v1-p3-073`, `bnu-primary-ds-v1-p6-140`.
- Kept all row IDs, grade counts, type counts, evidence card IDs, and assessment pattern card IDs unchanged.

## Repaired IDs

- `bnu-primary-ds-v1-p1-103`
- `bnu-primary-ds-v1-p1-131`
- `bnu-primary-ds-v1-p1-215`
- `bnu-primary-ds-v1-p2-010`
- `bnu-primary-ds-v1-p2-109`
- `bnu-primary-ds-v1-p3-175`
- `bnu-primary-ds-v1-p3-183`
- `bnu-primary-ds-v1-p3-073`
- `bnu-primary-ds-v1-p4-009`
- `bnu-primary-ds-v1-p4-010`
- `bnu-primary-ds-v1-p4-011`
- `bnu-primary-ds-v1-p4-013`
- `bnu-primary-ds-v1-p4-014`
- `bnu-primary-ds-v1-p4-017`
- `bnu-primary-ds-v1-p4-028`
- `bnu-primary-ds-v1-p4-069`
- `bnu-primary-ds-v1-p4-244`
- `bnu-primary-ds-v1-p5-104`
- `bnu-primary-ds-v1-p5-119`
- `bnu-primary-ds-v1-p5-150`
- `bnu-primary-ds-v1-p5-202`
- `bnu-primary-ds-v1-p5-204`
- `bnu-primary-ds-v1-p5-206`
- `bnu-primary-ds-v1-p5-208`
- `bnu-primary-ds-v1-p5-228`
- `bnu-primary-ds-v1-p5-230`
- `bnu-primary-ds-v1-p6-018`
- `bnu-primary-ds-v1-p6-024`
- `bnu-primary-ds-v1-p6-041`
- `bnu-primary-ds-v1-p6-042`
- `bnu-primary-ds-v1-p6-043`
- `bnu-primary-ds-v1-p6-044`
- `bnu-primary-ds-v1-p6-045`
- `bnu-primary-ds-v1-p6-046`
- `bnu-primary-ds-v1-p6-047`
- `bnu-primary-ds-v1-p6-048`
- `bnu-primary-ds-v1-p6-049`
- `bnu-primary-ds-v1-p6-050`
- `bnu-primary-ds-v1-p6-051`
- `bnu-primary-ds-v1-p6-052`
- `bnu-primary-ds-v1-p6-053`
- `bnu-primary-ds-v1-p6-054`
- `bnu-primary-ds-v1-p6-140`
- `bnu-primary-ds-v1-p6-221`

## Verification Status

- Deterministic audit: passed with 1500 rows and 300 manual-review queue rows.
- DeepSeek V4 Pro hard-gate rerun: passed with `hard-gate-green`.
- Solvability: 1500/1500 yes.
- Answer/question match: 1500/1500 yes.
- Hard-gate issue rows: 0.
- `hard-gate-issues.csv`: header only.
- Secret-pattern scan: no `sk-...` or API-key assignment matches.
- Final decision: hard-gate-green, still candidate-only and not approved for public app integration.

## Notes

- Row `bnu-primary-ds-v1-p3-175` was repaired to the mathematically correct answer `25×42`; the earlier model rationale incorrectly named `19×49`.
- Row `bnu-primary-ds-v1-p3-183` also needed a distractor change because the old `200个5千克的书包` option equaled 1 ton.
- Row `bnu-primary-ds-v1-p6-221` was repaired by changing the capacity requirement from at least 30 L to at least 20 L so exactly one existing option satisfies the condition.
