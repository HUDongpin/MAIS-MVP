# 2026-08-25 A23 Promotion Gate Shadow v1

- Owner/lane: A23 Integration and Promotion. The gate contract routes independently authored inputs from A21, A18, A04, A05, A23, A11, A22, A24, and A25; this core slice does not claim those separate owner artifacts as authored here.
- Branch: `codex/a23-promotion-shadow-v1-20260825`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a23-promotion-shadow-v1-20260825`
- Baseline: `origin/main` at `b6c7c347a49a813e454e707dd3c16399dcf29909`, verified by live `git ls-remote` on 2026-08-25 HKT.
- Target PR: pending.
- Creation date: 2026-08-25.
- Expected closeout date: 2026-08-26.
- Authorized implementation scope: Promotion Gate core library, standalone CLI, synthetic/real-shaped contract tests, Manifest/Receipt JSON Schemas, and this session log. CI wiring, the real pilot Manifest/Receipt, owner evidence files, registry/ratchet inputs, independent replay, and lifecycle closeout remain separate slices.
- Explicit exclusions: Preview or production deployment, live data or route mutation, provider/database calls, production aliases, credentials, and claims that the parent candidate package is approved.

## Preserve-first preflight

- The primary `/Volumes/Starship/MAIS-MVP` checkout remains a dirty integration inventory and is not the implementation or validation source.
- `npm run release:dirty-map -- --reason "A23 promotion shadow v1 implementation preflight" --json --no-report` recorded 52 collapsed status entries and no secret-quarantine entries. Repository inspection subsequently confirmed that `--no-report` still refreshes the ignored `latest-A25-dirty-tree-map.json`; it does not create timestamped reports or tracked changes, but it is not a zero-write mode.
- The truly read-only `--assert-current --max-age-minutes 60 --json` check fails on the primary root's 56 existing strict unmapped entries. The inventory is therefore recorded, but A25 strict release intake is not claimed as passing.
- This session uses a clean linked worktree from the refreshed remote baseline and stages only exact authored paths.

## Handoff status

- Core implementation is frozen for composition review. It remains non-live and has not executed the real pilot.
- TDD evidence: focused tests were introduced before their implementations and observed failing for the new Manifest, owner-evidence, real-record adapter, worktree, reachability, ratchet, controlled Receipt, and schema contracts. A later schema-sync review found one stale executable/schema agreement assertion for `attemptHistoryProof`; the assertion was corrected before the final run.
- Draft 2020 runtime validation is now committed in the core test bundle. It constructs an executable Manifest and core-generated `pass`, `blocked`, and `fail` Receipts, compiles both schemas with Ajv `8.17.1` using `{ allErrors: true, strict: true, strictTypes: false, strictRequired: false }` plus a local RFC 3339 `date-time` format, and rejects six negative instances: unknown Manifest field, uppercase `reviewedCommit`, invalid content-addressed `sourceVersion`, missing Receipt `mode`, missing per-check `evidenceDigest`, and an unknown check-result field.
- Verification on 2026-08-25 HKT:
  - `node --check coordination/integration/promotion-gate-lib.mjs`
  - `node --check coordination/integration/promotion-gate.mjs`
  - `node --check coordination/integration/promotion-gate.test.mjs`
  - Both v1 JSON Schema documents parse as JSON.
  - The Ajv-focused test passed `1/1` using the owner-provided external dependency tree because this isolated baseline branch intentionally predates the separate A10 `package.json`/lockfile slice.
  - A first full run without the external Ajv resolution proved `109` non-Ajv tests pass and failed only at module resolution for the new Ajv test; this is the expected branch-composition dependency boundary, not a product assertion failure.
  - `TMPDIR=/Volumes/Starship/.promotion-gate-test-tmp.hVyj3o NODE_PATH=/Volumes/Starship/.promotion-gate-ajv-ci-20260825.7OHYVY/node_modules node --test coordination/integration/promotion-gate.test.mjs` -> `110/110` pass in `119262 ms`.
  - The final composition must rerun the same suite after merging the exact A10 Ajv dependency; this branch does not claim composition-level package installation or CI success.
- Proven boundary: local core behavior and synthetic/real-shaped fixture contracts only. No Preview, deploy, live mutation, provider/network/database call, canonical Receipt, independent second-worktree replay, CI success, PR, merge, or production behavior is claimed.
- Known live boundary: the selected unit is eligible only for Shadow. Eight content/compatibility blockers plus the time-bounded legacy 492-question conflict remain explicit and live-blocking; blocked attempts leave `shadow_ready` unchanged and name the next owner.
- Closeout state: this session is authorized to exact-stage, commit, and push only the six core files listed in its assignment. The real pilot inputs, Receipts, lifecycle artifacts, CI workflow, package files, and application/live surfaces are excluded.
