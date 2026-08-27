# Attempt 007 append-only baseline re-affirmation — AR K-G5 CoT-leak solution text

- Pilot: `us-ca-math-rag-v2-g6-ratios-v2` / `attempt-007`
- Source revision: `auth-private-no-store-20260827` (baseline `9ab6c8cc9c88982eb8e94c293b25ad1f9eac9c4b`)
- Re-affirmed target baseline: `de31ec494bea1679d1889cace0ef1ad701e31b82`
- Revision root: `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827`
- Prepared: 2026-08-27 (Asia/Hong_Kong)
- Live boundary: `liveAllowed=false`

## Evidence boundary

This record re-affirms the existing candidate-only findings against one reviewed
student-facing solution-text repair. It chains from the
`auth-private-no-store-20260827` revision and does not overwrite that revision,
the finalized attempt-007 Manifest, evidence, canonical Receipt, closure,
lifecycle registry, or legacy registry. It does not promote candidate content,
change candidate bytes, remove the localization hold, authorize a live write, or
change `liveAllowed=false`.

The A-role labels below are the repository routing taxonomy. One
owner-authorized integration session sequentially re-ran the role-specific
checks after the repository owner directed that PR #165 land through the
sanctioned re-affirmation path. This record does not claim that nine separate
humans or nine independent agent sessions performed the re-affirmation.

## Exact protected-path delta

Between the source revision baseline and the re-affirmed target, the complete
protected-path diff is:

- runtime: `data/generated-content/us-ar-math-k-g5-generated-bank-v1-1500/question-pack.json`;
- test-only: none;
- zero changes under `app/`, `components/`, `lib/`, or `public/`;
- zero changes to `middleware.ts`, `next.config.ts`, or `tsconfig.json`.

The runtime edit replaces exactly one field of one item: the
`independentSolution` string of `us-ar-k-g5-v1-g4-4-npv-4-q01` (PR #165). The
prior text leaked a chain-of-thought self-correction ("… 1, 8? Actually
452,318 has 3? …") into a student-visible solution. The replacement states the
same digit-by-digit comparison cleanly. The item's prompt, options, accepted
answer (`452,831`), explanation, tags, and every other item in the pack are
byte-unchanged. The widened audit `LEAK_RE` (PR #152, already in the target
tree) no longer reports this item; the audit's remaining findings are the eight
known pre-existing P2 duplicate-distractor/format findings, none of which
involve this item.

The candidate package remains byte-identical to its immutable source commit
`faf57280778c4b6543d15ce675638ac480b42864` (empty
`git diff faf57280..de31ec494b` over the candidate directory). Its aggregate
candidate digest remains
`c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`. Neither the
candidate records nor their adapter, answer-matching, question-store, lesson, or
visualization paths reference the changed Arkansas K-5 solution string.

## Role-by-role re-affirmation

| Role | Re-affirmed finding |
| --- | --- |
| A21 | Candidate generation evidence remains valid because all candidate package files and the aggregate candidate digest are unchanged. |
| A18 | Independent math and curriculum QA remain valid: the ordered ratio, numeric oracle `12`, accepted answers, standards mapping, and localization hold are untouched; the edited string is an Arkansas K-5 solution outside the CA candidate. |
| A23 | Shadow readiness remains candidate-only and non-live; the revision changes only the reviewed target-baseline binding and creates no live path. |
| A04 | Practice semantics remain exact: grading code, accepted-answer policy, and practice registration are unchanged; the full question-bank suite passed `98/98`, including Arkansas K-G5 solvability, against the target tree. |
| A05 | Lesson semantics remain exact because lesson bytes, instructional spine, remediation targets, and lesson routing are unchanged. |
| A11 | Independent preflight: PR #165's required CI jobs (validate including the isolated-app parent gate, teacher-parent e2e, postgres integrations, snapshot, visualization-browser) completed green on the pre-merge head, and the merge to the target adds no protected-path change beyond the one reviewed pack string. |
| A22 | Build isolation re-run in the clean integration worktree at the target commit: `type-check` pass, release governance suite exit 0, full question-bank suite `98/98`, US math item audit exit 0 (leak finding resolved), and the production `next build` completed successfully. |
| A24 | Exact-layer remains `not_applicable`; a solution-text string cannot alter candidate geometry, formula, coordinate, unit, or label fields. |
| A25 | Release intake: the change rides PR #165 under the required promotion-shadow gate with this recorded revision; no live write, deploy, or release action is authorized by this record. |

## Owner authorization

The repository owner directed in the integration session of 2026-08-27 that
PR #165 (`claude/infallible-aryabhata-439ae9`, one-line AR K-G5 CoT-leak fix)
proceed via the sanctioned baseline re-affirmation path used by
`auth-private-no-store-20260827`, alongside the continued freeze watch. Roles
re-affirmed: A21, A18, A23, A04, A05, A11, A22, A24, A25.
