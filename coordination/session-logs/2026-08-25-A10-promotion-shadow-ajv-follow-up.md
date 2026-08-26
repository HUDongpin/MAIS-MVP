# A10 follow-up — exact Ajv Draft 2020-12 dependency

## Session custody

- Owner / lane: `A10` tooling and dependency coordination.
- Branch: `codex/a10-promotion-shadow-fetch-depth-20260825`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a10-promotion-shadow-fetch-depth-20260825`.
- Exact baseline: `0032cbcace3fe7cff7fe43f59d4edcc627da69d0` (`fix(ci): retain failed promotion receipts`).
- Target PR: `pending` (A23 clean composition PR).
- Creation date: `2026-08-25` Asia/Hong_Kong.
- Expected closeout date: `2026-08-25` Asia/Hong_Kong.
- Exact write scope:
  - `package.json`
  - `package-lock.json`
  - `scripts/release-governance.test.mjs`
  - `coordination/session-logs/2026-08-25-A10-promotion-shadow-ajv-follow-up.md`

## Dependency decision

Promotion Gate tests compile both versioned JSON Schemas with a real Draft 2020-12 validator and validate executable pass, fail, and blocked instances. The repository therefore needs the validator as a reproducible direct development dependency rather than relying on an ambient or transitively installed package.

The dependency is fixed exactly as:

```json
"ajv": "8.17.1"
```

No caret, tilde, wildcard, override, runtime dependency, npm script, core implementation, Schema, Manifest, Receipt, candidate, live file, CI workflow, or branch-protection setting changed in this slice.

## Lockfile provenance and review

- `package.json` was edited first to declare the exact development dependency.
- npm's normal lockfile mechanism was then run with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, using cache `/Volumes/Starship/.promotion-gate-npm-cache-20260825` and temp root `/Volumes/Starship/.promotion-gate-test-tmp.hVyj3o`.
- The lock delta changes exactly five package records: the root development-dependency map, `ajv@8.17.1`, `fast-deep-equal@3.1.3`, `fast-uri@3.1.6`, and `json-schema-traverse@1.0.0`. The required `require-from-string@2.0.2` record already existed and is byte-semantically unchanged. No existing package version, resolution, integrity, dependency edge, or metadata record is upgraded or rewritten.

## Verification evidence and environment boundary

- A bounded external install was created at `/Volumes/Starship/.promotion-gate-ajv-ci-20260825.7OHYVY` so the worktree's symlink to the shared root `node_modules` was not mutated.
- `npm ci --ignore-scripts --no-audit --no-fund` in that external directory remained silent and did not exit after approximately 5 minutes 22 seconds. It was stopped with `SIGINT` at the agreed bounded timeout. This is an installation-time/environment blocker, not evidence that the package or lockfile is invalid; the full clean-install claim remains unproved in this local session.
- The partially installed isolated tree contained `ajv@8.17.1`. `npm ls ajv --all` resolved exactly that direct version.
- A real `Ajv2020` instance compiled a schema declaring `https://json-schema.org/draft/2020-12/schema`, accepted the valid integer instance, rejected the string-typed instance, and rejected an unevaluated property.
- An offline `npm install --package-lock-only --ignore-scripts --offline --no-audit --no-fund` completed successfully in 837 ms and left the lockfile SHA-256 unchanged at `d2ce8b4862d6cb0789ed5075f450dac6c342ff7dc493f592bd6d824729daf18b`.
- `npm ls --package-lock-only ajv --all` resolved `ajv@8.17.1` from the committed dependency graph without using the partially installed external tree.
- Governance RED: with the package and lock exactly staged, the full release-governance suite passed `88/89`; `P0 package delta and default release gates are self-contained in Git objects` rejected Ajv because its exact development-dependency allowlist still described the pre-Ajv graph. The explicit task scope was then expanded to permit the necessary test contract update.
- The P0 contract now adds only exact `ajv: 8.17.1`, requires root-lock parity, deep-compares the complete Ajv lock node including its exact registry URL, SHA-512 integrity, dev flag, license, dependency edges, and funding metadata, and fixes the exact resolved versions of all four dependency nodes. It does not relax any other dependency or script delta.
- Assertion RED: an initial assertion assumed an `engines` record on `fast-uri`; the actual npm-generated lock node has no such field. That invented constraint was removed, while the exact Ajv-node deep comparison continues to reject any unreviewed field or metadata drift. The focused P0 test then passed `1/1`.
- Full `scripts/release-governance.test.mjs` passed `89/89` with zero failures after the exact contract update.
- The parent integration controller independently reran the same full release-governance suite from this worktree and observed `89/89` passing in 21.8 seconds.
- `git diff --cached --check` passed for the exact four-file staged slice. Exact commit, upstream, and final clean-status evidence are recorded in the parent handoff after Git closeout.

## Claim boundary

This slice establishes an exact, lockfile-backed Ajv development dependency and local Draft 2020-12 compiler behavior. It does not independently prove the A23 Promotion Gate suite, a completed clean `npm ci`, CI runner behavior, Receipt validity, Shadow passage, required-check enforcement, deployment, or live behavior. No provider, network application service, database, Vercel, production, or live-promotion operation was invoked.
