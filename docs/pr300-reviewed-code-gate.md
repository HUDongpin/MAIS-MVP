# Exact PR300 classroom safety admission

PR300 is the current-main successor to PR286. The manual classroom tool now rejects value-bearing unknown arguments without echoing them, enforces integer load/budget bounds, rechecks cookie-bound student identity and origin before workload rounds, distinguishes actual identities from virtual seats, and rejects oversized UTF-8 reports before filesystem mutation. It also supplies the expected-user identity required by the current lesson-progress API. This package is an ordinary-code required-check admission, not a native content Manifest, Shadow Receipt, content approval or live classroom acceptance.

## Frozen source

- Base B: `1b03f8f1300c360188ada33a382070eba06cb075`.
- Source S: `bc967e739480db7c66a824bb1369ef3a7268b93f`, sole parent B.
- Source tree: `df2adb27f2ccf3ae5fd2f4fb15270d35b1936ebb`.
- Source inventory digest: `77bf12baca47b784396acc6a1ccc1707b7f8c9567caf7019eb373f88c094a27b`.
- Exact source paths: `RELEASE.md`, `scripts/classroom-load-smoke.mjs`, `scripts/classroom-load-smoke.test.mjs`, and `coordination/session-logs/2026-10-28-A22-pr286-current-main-01a1824f.md`.

The old PR286 source and historical session record remain preserved in their original branch. PR300 is a reviewed port, not a claim that the original branch's complete history has been merged. The source commit's preparation record is historical; subsequent owner authorization governs this PR's completion and associated branch closeout.

## Source, tooling and evidence separation

T is a direct child of S and changes exactly four tooling paths: this document, the new PR300 checker, its adversarial tests, and deterministic additions to the Promotion workflow. E is a direct child of T and first-adds exactly seven evidence files under `coordination/integration/reviewed-code/pr300-v1/`: source inventory/checks, actual A11 and A23 JSON/Markdown review pairs, and the admission marker. Reviewers inspect immutable T and the source execution records before E is sealed. Synthetic fixtures in the contract tests are not actual review evidence.

Only same-repository PR300, exact base B and head E are admitted. A separately authorized main merge must have ordered parents `[B, E]` and exactly E's tree. Other PRs, forks, changed bases, descendants, squash/rebase, extra source/tooling/evidence paths, changed modes or hashes, future/predating reviews, malformed JSON, or permission widening fail closed. The prospective main-event check does not itself grant merge authority.

The new selector runs before PR299. Removing exactly the deterministic new selector, mode and check/upload additions reconstructs the previous workflow byte-for-byte. Existing checkers, action pins, historical review/receipt bytes and step controls remain unchanged. Failure of a present PR300 marker cannot fall through to an older approval.

## Verification and limits

Frozen clean-source execution is bound by SHA-256 `f640470c34ad93416b5283352a6cb08b6fba7cc0503f5b5ac9094404eef89e9b`. Under Node 24, the gate reruns 70 classroom cases, 7 release-build-tool cases and 24 production-certification-tool cases. Each command must produce the exact complete TAP test names/counts with zero failures, cancellations, skips or TODOs, a successful process exit, and bound stdout/stderr hashes. The new contract suite has 35 adversarial tests. Child execution excludes inherited provider/database credentials, `NODE_OPTIONS` and `NODE_PATH`, and uses a fresh private temporary output directory outside the repository.

The broader existing release-governance suite was separately run for the source: 163 passed and 11 explicitly skipped historical Promotion fixtures. Those skips are not represented as revalidated historical contracts and are not hidden by the zero-skip source commands above. Ordinary CI remains separate and must pass on the final head. The existing full source-materialization guard is retained; any local filesystem limitation must be reported and the actual Ubuntu guard must succeed.

All six permission fields remain false: historical Promotion revalidation, live, Preview, deploy, whole-pack acceptance and historical authority transfer. The decision also records `liveClassroomProven=false`. All source tests use offline fixtures or loopback HTTP; no real classroom capacity, provider, production database or deployment acceptance is implied.

## Lifecycle

- Owner: A10/A22 in chat `01a1824f-6f28-7501-8fb9-4491c7949150`; A11 `/root/pr286_source_review` and A23 `/root/pr300_a23` review independently.
- Branch/worktree: `codex/pr286-current-main-20261028` / `/Users/dongpinhu/.codex/worktrees/p286/MAIS-MVP`.
- Target PR: #300, successor to #286.
- Created: 2026-10-28 Asia/Taipei; expected closeout: 2026-10-29 after actual PR/main verification and preservation of needed evidence.
- Owner objective: finish #300 and its #286 relationship, then #258 → #269 → #275 → #225, cleaning corresponding branches after each completed item. Unrelated branches and both historical source branches remain outside this closeout.
