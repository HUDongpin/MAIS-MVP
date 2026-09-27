# A22 build attestation sidecar order — local candidate

- Owner: A22; target PR: pending.
- Created: 2026-09-27; expected closeout: 2026-10-04.
- Worktree: `/Users/dongpinhu/.codex/worktrees/a22-build-attestation-sidecar-order-20260926/MAIS-MVP`.
- Branch: `codex/a22-build-attestation-sidecar-order-20260926`.
- Baseline: `4834189e63d74f0e1a27475d9968f5c88c2bc78f`.
- User authorized the local repair, regression and isolated branch/worktree; no commit, push, merge or deployment. Changes remain uncommitted.

## Change and scope

Move the successful build source-after snapshot and artifact attestation from the Next subprocess helper into the outer locked lifecycle, after `next-env.d.ts` preimage restoration. Build failure or restoration failure does not reach attestation. The full source status remains included; no dirty-file whitelist or existing receipt replacement is introduced. Existing source fingerprint semantics are unchanged (porcelain status does not detect changed bytes that retain identical status).

## Verification

TDD red: new lifecycle fixture uses a temporary synthetic Git repository, actual source capture and actual artifact writer, with a stubbed Next compilation phase. On original implementation, four successful-build cases fail with missing attestation (the spawn seam previously owned attestation); nonzero and restore-failure absence checks pass. Production repair then passes all 34 tests in `scripts/next-clean-build.test.mjs`, including existing missing/tampered artifact checks. New scenarios cover clean, pre-existing dirty tracked source, pre-existing dirty sidecar, concurrent tracked changes, new untracked source, nonzero exit and restore failure. They assert capture/build/restore/capture/attest order and canonical lock exclusion during restoration and attestation. Synthetic fixture commits exist only in temporary repositories, not this real branch.

`node --check` passes for both modified JavaScript files.

Command (dependency-limited verification):

```sh
env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE node --loader /private/tmp/a22-typescript-loader.mjs --test scripts/next-clean-build.test.mjs
```

Loader only resolves the existing TypeScript 5.8.3 installation read-only at `/Volumes/Starship/MAIS-MVP/node_modules/typescript/lib/typescript.js`; this matches the candidate lock's TypeScript version. This initial loader run was not proof of complete dependency parity. The primary repository's full lock differs; it was not linked. Subsequently, the A06 worktree lock was verified byte-identical to this candidate (SHA-256 below), and its existing dependency directory was linked read-only. No npm install was run on linked dependencies. The entire 34-test suite also PASSed with normal node and no loader (`final-no-loader-tests.log`).

## Environment limitations and custody

First `npm ci` failed ENOTDIR for the existing user cache. A second attempt using a fresh external cache exited 1 while local storage fell below 1 GiB. Its partial output contains no terminal npm error explanation, so a precise exit-1 cause is unproven; capacity was unsafe for further installation/build. Both attempts are retained as failures. No successful local npm installation or full Next build is claimed. Application type-check was subsequently run using the same-lock dependency link; result is recorded below. The focused real-Git/artifact lifecycle tests are complete; real Next build remains NOT_RUN.

After confirming the installation handle terminal, this attempt's new partial node_modules was moved intact to `/Volumes/Starship/MAIS-MVP/.tmp/a22-partial-node-modules-preserved-20260927`. No pre-existing dependencies or evidence were deleted. Free local space afterward was approximately 2.1 GiB. External attempt cache: `/Volumes/Starship/MAIS-MVP/.tmp/a22-npm-cache-20260927`.

Logs and loader copy are retained in this worktree's `.tmp/a22-sidecar-order-evidence-20260927/` (red, initial green, final 34-test pass, both install logs). No successful clean release receipt has been produced; an actual build from these uncommitted edits must report sourceTreeClean=false.

## Candidate hashes

- `scripts/next-clean-build.mjs`: `d8eea904a5c04ff6b54371a2ecd3ee35dc8513436b77c3f485082d4ed2a5b23d`
- `scripts/next-clean-build.test.mjs`: `684424617bb9ef240183d32ed3d8eeed4cba088d3f48baf22f78b2e1c36614a9`
- Unchanged `package-lock.json`: `58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767`

## Same-lock dependency verification

A06 lock: `/Users/dongpinhu/.codex/worktrees/pr172-student-math-figures-20260924/MAIS-MVP/package-lock.json`, identical SHA-256 `58fe996a95695b26e705e29eafb6d45de9f5444ebbd29e70e9af2895c3137767`. This worktree's ignored `node_modules` is now a read-only-use link to A06's existing `node_modules` (itself linked to AR's dependency installation). No dependency files were edited. Normal no-loader command passed 34/34:

```sh
env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE node --test scripts/next-clean-build.test.mjs
```

Final `npm run type-check`: PASS (exit 0), log `.tmp/a22-sidecar-order-evidence-20260927/type-check.log`. All started installation/test/type-check handles are terminal; no build server was started. `git diff --check` PASS. Real Next build remains unrun due capacity; no build receipt is claimed from synthetic compilation tests.


## Subsequent actual build verification by parent

The earlier NOT_RUN entry is a historical capacity snapshot. Fresh capacity was approximately 3.8 GiB before one actual run of `NEXT_DIST_DIR=.tmp/a22-real-build-20260927/dist npm run build`; process 94684 terminated exit 0 and generated 208/208 pages. Existing same-lock dependencies were used without another install. Source script hashes above were unchanged.

Evidence: `.tmp/a22-real-build-20260927/preflight.json`, `build.log`, `postflight.json`, `dist/mais-build-attestation.json`. BUILD_ID `dIuP7kd7OCM8ixb2siz01`; actual artifact-digest verification passed for 2,561 files / 96,691,279 bytes. Pre-existing next-env was restored byte-for-byte (SHA-256 `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`). Receipt: sourceTreeClean=false (correct for uncommitted edits), sourceTreeStable=true. Stability is the status-snapshot contract, not proof of every source byte. No old receipt was changed and no clean release readiness is claimed. All work remains uncommitted, with no push/merge/deployment.
