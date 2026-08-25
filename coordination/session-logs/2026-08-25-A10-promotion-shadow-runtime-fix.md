# A10 follow-up — Promotion Shadow workflow runtime and authentic-failure handling

## Session custody

- Owner / lane: `A10` tooling and CI coordination.
- Branch: `codex/a10-promotion-workflow-runtime-fix-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-workflow-runtime-fix-20260825`.
- Exact baseline: `4015da8c8343e6dfae0a185b200dcce1ff0e668a` (`docs(release): record promotion shadow blocker disposition`).
- Target PR: `pending` (A23 clean composition review).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Exact write scope:
  - `.github/workflows/promotion-shadow.yml`
  - `scripts/release-governance.test.mjs`
  - `coordination/session-logs/2026-08-25-A10-promotion-shadow-runtime-fix.md`

The branch intentionally remains based on the assigned composition commit. It was not rebased onto the independently advancing `origin/main`.

## Defects and exact remediation

GitHub rejected the workflow before job creation because `runner.temp` is unavailable in job-level `env`. The workflow now derives all temporary paths from the runner-provided `RUNNER_TEMP` inside an executable setup step, rejects collisions, creates one mode-`0700` artifact directory, and exports subsequent paths through `GITHUB_ENV`. Job-level expressions retain only contexts valid at that scope.

The three official actions are pinned to freshly resolved full commits while retaining their major-version comments:

- `actions/checkout@11d5960a326750d5838078e36cf38b85af677262` (`v4`), with `fetch-depth: 0` and `persist-credentials: false`.
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020` (`v4`).
- `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` (`v4`).

The real immutable attempt is a controlled `fail`, and the v1 CLI lawfully maps `pass`, `fail`, and `blocked` to exits `0`, `1`, and `2`. Validation, both Shadow runs, and all three Receipt-verification commands now capture their exact exit status, parse the emitted JSON, and require exit/result parity. A malformed envelope, `internal` result, wrong run identity, or exit/result drift still fails the step. A valid failed Receipt and its valid `result: fail` verification envelope are therefore green as authenticity checks; they are not converted into a passing Gate.

The dedicated final enforcement step reads the current validation, fresh/replay/canonical Receipts, and all verification envelopes. It exits nonzero unless every result is `pass`. The committed controlled-failure attempt therefore keeps `promotion-shadow-gate` red.

Before upload, an always-run preflight requires exactly six named artifacts in the dedicated directory, rejects missing or extra entries, symlinks, hardlinks, empty files, path escapes, and invalid JSON. Upload runs only when that preflight succeeds. The semantic comparison also requires fresh, replay, and canonical results to agree in addition to requiring the same `semanticReceiptDigest`.

## Executable verification

- RED: the pre-remediation workflow produced zero GitHub jobs, and actionlint identified job-level `runner.temp` context errors at the eight temporary-path declarations.
- `actionlint v1.7.12 -no-color .github/workflows/promotion-shadow.yml` — passed with zero diagnostics, including the available ShellCheck integration.
- Focused `Promotion Shadow` governance suite — `10/10` passed.
- Full `npm run test:release-governance` — `94/94` passed in 22.9 seconds.
- Full `npm run test:promotion-gate` — `120/120` passed in 161.5 seconds.
- All 17 parsed workflow `run` blocks passed `bash -n`.
- `node scripts/release-package-gate.mjs --json` — `valid: true` with 8 release packages, 37 owner-path packages, and 25 exact resolution checks; the workflow resolves unambiguously to `A10`.
- The artifact fixture removes each of the six expected files in turn and proves each absence fails closed. It also rejects an extra file, invalid JSON, and a symlinked artifact.
- The verification fixture proves `verification.result === receipt.result`, including a valid controlled `fail`, and rejects result drift plus every digest/schema/key mismatch.
- The final-outcome fixture passes only when all seven inputs report `pass` and proves an authentic canonical `fail` keeps enforcement red.

To avoid consuming the constrained system volume, local Node checks reused the clean composition worktree's lock-compatible installed dependency tree through an ignored temporary `node_modules` symlink. No dependency manifest or lockfile changed. This local reuse does not replace the workflow's two committed-lockfile `npm ci` operations or prove a hosted-runner installation.

## Explicit unresolved and no-live boundary

This slice does **not** solve terminal-aware current-HEAD auditing. Current HEAD still runs the frozen unit/security suite and current Manifest validation, while canonical attempt replay remains correctly bound to the historical execution commit. A separate A23 contract change is required if terminal disposition/registry artifacts themselves are to become part of a machine-verifiable current-HEAD audit. This A10 slice does not claim that gap is green.

No hosted GitHub Actions job, artifact upload, required-check enforcement, branch-protection mutation, PR merge, Preview, provider call, database operation, Vercel command, deployment, production write, live registry change, or live promotion was performed. The Gate remains a controlled red `repair_required` boundary, not `Shadow-mature` and not CI-enforced.

The frozen seven-file checker bundle, Manifest, Receipts, disposition, lifecycle registry, A25 record, candidate content, and every live file were left byte-unchanged.
