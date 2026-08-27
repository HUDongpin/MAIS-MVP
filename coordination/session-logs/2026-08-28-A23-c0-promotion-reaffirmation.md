# A23 current-main Promotion re-affirmation after PR #174

- Session slice: `codex/a23-c0-promotion-reaffirmation-20260828`
- Baseline: `c0b00c22171b69c5cc84cc79932656f6c76a380c`
- Owner: A23 integration/promotion, with A18/A11/A22 evidence boundaries
- Target PR: pending
- Created: 2026-08-28
- Expected closeout: 2026-08-28 after protected-main Promotion restoration

## Scope and fail-closed trigger

PR #203 merged the read-only production schema diagnostic at
`9548b6e2408cdfc6055094a717ed4281f27aa8db`, and its exact post-merge CI and
Promotion Shadow workflows passed. Before production preflight dispatch, live
remote `main` advanced to `c0b00c22171b69c5cc84cc79932656f6c76a380c` via
PR #174. The release binding correctly rejected the stale SHA.

The exact `c0b00c` post-merge Promotion run `33090933283` failed closed with
`V2_TARGET_BASELINE_DRIFT`, `changedPathCount: 11`. This slice will not weaken
the Promotion policy or deploy an older SHA. It will first enumerate the
protected path drift, verify PR #174's current CI and content/i18n evidence,
and create an append-only re-affirmation only if the existing immutable checker
permits the exact reviewed change set.

No production schema mutation, deployment, live-content authorization, or
production write is authorized by this re-affirmation. `liveAllowed: false`
remains mandatory. No credential, provider URL, production payload, or raw
student/family data may be recorded here.
