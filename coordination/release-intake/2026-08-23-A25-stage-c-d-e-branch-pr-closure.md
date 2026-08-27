# A25 Stage C-D-E Branch and PR Closure

- Generated at: 2026-08-22T21:53:39Z (2026-08-23 05:53:39 Asia/Hong_Kong)
- Repository: `/Volumes/Starship/MAIS-MVP`
- Intake owner: A25 Git hygiene and release intake
- Live integration ref at final snapshot: `origin/main` = `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Root checkout: local `main` = `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6`, dirty, ahead 1 / behind 50; it was not switched, reset, stashed, staged, committed, or used as a merge source.
- Remote deletion policy: **zero GitHub remote branches deleted**. GitHub branches automatically deleted by merged PRs were recreated at their exact reviewed heads.

## Outcome

Stages C and D are closed under the preserve-first contract:

- All 14 original `MERGED_DIRTY` worktrees have exactly one recorded Stage C final state: 9 `evidence archive`, 2 `reviewed commit`, and 3 `blocker report`.
- All PRs that were open at the Stage D intake are no longer open. `gh pr list --state open` returned `[]` at the final snapshot.
- Every reviewed/archived local tip touched by this closeout has a named GitHub recovery ref or is proven contained by live `origin/main`.
- Both detached worktrees have exact named remote recovery refs.
- Ordinary `git worktree prune --dry-run --verbose` produced no output.
- No worktree was force-removed and no local branch was force-deleted.

## Inventory change

The Stage A snapshot and the final snapshot are not a claim that all remaining work is finished; active and owner-held worktrees remain intentionally present.

| Metric | Stage A snapshot | Final snapshot |
|---|---:|---:|
| Local branches | 53 | 43 |
| Registered worktrees | 46 | 32 |
| Detached worktrees | 2 | 2 |
| Clean worktrees | 20 | 17 |
| Dirty worktrees | 26 | 15 |
| Open PRs | 9 at Stage A; 10 at Stage D intake | 0 |
| GitHub remote branches, excluding `origin/HEAD` | 26 | 53 |

The remote count increased because evidence, detached-recovery, local-tip-protection, and restored merged-PR refs were added. It did not increase through remote deletion/recreation churn except for GitHub's automatic merged-head deletion followed by exact restoration.

## Stage C: all 14 `MERGED_DIRTY` final states

| Branch | Final state | Recovery commit/ref | Worktree disposition |
|---|---|---|---|
| `codex/a04-practice-two-doors` | evidence archive | `f48f118c3da2e5396d5d6a49bd589272dbf264e0`; `origin/archive/a04-practice-two-doors-pre-review-20260823` | `/Volumes/Starship/MAIS-practice-two-doors-wt` removed normally; reviewed successor merged via PR #141 |
| `codex/a05-15-bug-loop` | evidence archive | `8c4d06ab2760b82b34ab2946d0688e75b8740e29`; `origin/archive/a05-15-bug-loop-wip-20260823` | `/Volumes/Starship/MAIS-15-bug-loop-wt` removed normally |
| `codex/a06-ca-visualization-labs-loop` | evidence archive | `777f46db6ef16c209f3493f58ec1fb13df8daf94`; `origin/archive/a06-ca-visualization-labs-loop-wip-20260823` | Git worktree registration removed normally; physical path retained after permission denial |
| `codex/a06-hk-visualization-labs-loop` | evidence archive | `d5595131afb3028e769689998e7a67090865afae`; `origin/archive/a06-hk-visualization-labs-loop-wip-20260823` | `/Volumes/Starship/MAIS-hk-viz-labs-wt` removed normally |
| `codex/a14-parent-action-ui-20260823` | blocker report | local head `a7416c67222c92c25fac8c26fccf765eeb4c75a6`; exact dirty fingerprints in its report | `/Volumes/Starship/MAIS-parent-action-ui-wt` retained and still registered |
| `codex/a17-student-rewards-dashboard` | reviewed commit | `8e39fd054010a8bca324a752c242154bab8ac1ef`; retained same-name remote; PR #139 merge `feb16a61bd23e8cac6b2270f62b85f4c0c6f447e` | worktree removed normally; local branch deleted normally |
| `codex/a18-hk-all-math-lesson-qa` | evidence archive | `47dc3395521044ac8728d790c90d30516b9c94fa`; `origin/archive/a18-hk-all-math-lesson-qa-wip-20260823` | `/Volumes/Starship/MAIS-hk-content-qa-wt` removed normally |
| `fix/starship-canonical-root` | blocker report | local head `ee9b5e63fe8e2666850ae5bed7855cffa7d6b7dc`; exact dirty fingerprints in its report | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/cool-lamarr-a66bd6` retained and still registered |
| `codex/a01-a12-google-oauth-loop` | evidence archive | `22d7c0f645837f8e1ef2094fdacb037879eb37af`; `origin/archive/google-oauth-loop-blocked-20260823` | `/Volumes/Starship/MAIS-google-oauth-wt` removed normally |
| `worktree-lesson-remove-viz-completion` | evidence archive | `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d`; `origin/archive/lesson-remove-viz-completion-wip-20260823` | worktree removed normally |
| `codex/next16-3-parity` | evidence archive | `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8`; `origin/archive/next16-3-parity-hold-20260823` | `/Volumes/Starship/MAIS-MVP-next16-3-parity` removed normally |
| `qa/learner-teacher-interactions` | reviewed commit | reviewed head `a7d7e78aa4b14ced28617fd19b5a41c3d8c2bb56`; PR #140 merge `4e8e2a7e6153cfc3319b2687dd42dd413f867a77` | worktree removed normally; local branch deleted normally; same-name remote restored exactly |
| `security/ai-tutor-voice-moderation` | blocker report | local head `5073eb0b9d5f4a7cec1a9479f57d3a8584c3be17`; exact untracked-file fingerprint in its report | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/happy-lamport-055156` retained and still registered |
| `feat/tutor-moderation-provider` | evidence archive | `919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9`; `origin/archive/tutor-moderation-provider-pre-hardening-20260823` | `/Volumes/Starship/MAIS-tutor-moderation-wt` removed normally |

### Stage C worktree-state audit

- Ten final-state worktrees are physically absent and no longer registered.
- The three blocker-report worktrees are physically present and registered.
- `/Volumes/Starship/MAIS-ca-viz-labs-wt` is physically present but not registered as a Git worktree.
- All 9 evidence archive refs resolve exactly to the archive commits recorded above.
- Both reviewed heads resolve exactly on their retained same-name remotes and are ancestors of final live `origin/main`.
- All 14 individual JSON records parse successfully with `jq`.

### California residual exception

The ordinary non-forced removal removed the Git registration and then encountered filesystem permission denial. No `--force`, permission mutation, broad cleanup, or destructive retry was used. The retained path is approximately 150 GB, of which approximately 149 GB is `.tmp`; the recorded audit found 1,090,191 `.tmp` files. Outside `.tmp`, 184 of 187 files exactly match the archive commit, zero differ, and the remaining three are generated `tsconfig.dist-tmp-*.json` files. A22 or the owner must make a separate evidence-retention decision before physical deletion.

## Stage D: PR disposition

### Reviewed and merged

| PR | Final reviewed head | Merge commit | Verification and closure |
|---|---|---|---|
| #79 | `63fdc82bfd3c4167422c0adaf45650d80706c130` | `8ff82043437422d280ca3578b14745f6fb94fe13` | current-main focused run: 40 passed, 2 project-condition skips, 0 failed; same-name remote retained; stale local branch deleted normally |
| #93 | `5a2ea9eb89d4066b629d77661415b2ce8db21cb7` | `19c0c95a141760c24ac9b0a8fbd91caa1ff5712c` | 57/57 focused tests plus full CI; same-name remote retained; original detached SHA separately archived; dirty detached worktree retained |
| #117 | `1ee9816948e34fade17b70aa71ebbc07fe81f01f` | `40a2d61ad170b1f5fa0f3ed8969c6945ed9b6a87` | 16/16 focused tests, type-check, and full CI; worktree and local branch closed normally; remote retained |
| #133 | `f17ebd898d62e05d84c13a8526a87c2a37c83849` | `b6c7c347a49a813e454e707dd3c16399dcf29909` | local config safety 25/25, teacher 6/6, rewards 1/1, type-check; final CI run `32599890657` all green; worktree and local branch closed normally; remote retained |
| #140 | `a7d7e78aa4b14ced28617fd19b5a41c3d8c2bb56` | `4e8e2a7e6153cfc3319b2687dd42dd413f867a77` | focused E2E and full CI run `32597844658` all green; worktree and local branch closed normally; remote retained |

Stage C also created and completed PR #139 (`8e39fd054010a8bca324a752c242154bab8ac1ef` -> `feb16a61bd23e8cac6b2270f62b85f4c0c6f447e`) and PR #141 (`a1379c643f3e18d43a137f30593135375b7bcac0` -> `e9b6243a423e18a5141bf1c6d140fea0f25b7b20`).

For PR #133, final CI durations were: snapshot 39s, PostgreSQL integration 3m01s, visualization browser 8m19s, teacher/parent E2E 11m13s, and validate including production build 15m38s.

### Closed as remote evidence archives, not merged

| PR | Archived head | Recovery ref | Reason for closure |
|---|---|---|---|
| #86 | `4a26ef985f1324bebeec72c8efe5ceb818cc0898` | `origin/archive/pr86-legal-accessibility-foundation-20260823` | conflicted and contained legal/compliance statements requiring current owner review |
| #91 | `d2ffff12aed07cf60ef790c1133c031f74be00a9` | `origin/archive/pr91-starship-migration-cleanup-20260823` | conflicted cleanup package included obsolete generated/content artifacts |
| #94 | `6c5ddfc46c0b3dff8af57e878d35e496ba777cb6` | `origin/archive/pr94-check-answer-fast-path-20260823` | high-value but stale/conflicted and overlapping shared storage work |
| #119 | `d741a0aa8a14bf428ed3d2fdb98bbb41caff6fbf` | `origin/archive/pr119-owner-selected-hero-20260823` | local owner branch has newer committed and dirty hero work; the old PR was not allowed to overwrite it |
| #134 | `e48c2a67e2f0208d4ed8aad4bb5e1feaaf8438ed` | `origin/archive/pr134-app-state-row-tables-20260823` | high-value but stale/conflicted shared persistence change requiring a fresh owner slice |

The clean worktrees for PRs #91, #94, and #134 were removed normally and their local branches deleted normally after their exact archive refs were proven. The dirty home-hero worktree for #119 remains untouched.

## Stage D: non-PR local-tip protection

The following previously local-only or locally divergent committed tips now have exact GitHub refs. Dirty/uncommitted material is not claimed by these refs.

| Local source | Protected ref | Exact committed tip |
|---|---|---|
| `codex/a01-home-hero-chromebook` local tip | `origin/archive/a01-home-hero-local-tip-20260823` | `419c81eb68a1dc2b2c5b4188efd62c1f183a5cc4` |
| `codex/a04-a05-fix-15-product-bugs` | same-name remote | `61cd245c8ee5e1a41ba8474ef27a74e301fea4a0` |
| `codex/a11-practice-pager-two-door-e2e-20260822` | same-name remote | `9ba0884e7e0cf4ee983c4e81ac4be7c463ca73ab` |
| `codex/a18-hk-safe-closeout-20260822` | same-name remote | `80f927ceee90e825e57093f810a6ab4fac63feee` |
| `codex/a18-china-all-math-qa` committed tip | same-name remote | `1e9f758c033cfcb1cfa8544e0b21a6536c1cd71f` |
| `codex/a18-hk-ease-v2-qa` committed tip | same-name remote | `392bc74bc855fb0dc8eb2c07a6f548d4c6b23c47` |
| `codex/a23-closeouts-main-merge-20260822` | `origin/archive/a23-closeouts-main-merge-20260823` | `543d8ec8b02eae0b42f0690d3929191c777adaac` |
| `codex/a23-closeouts-main-ready-20260822` | `origin/archive/a23-closeouts-main-ready-20260823` | `66fddde4782b125c49f50c43348c1829ef8e1267` |

## Local-only deletion batch already separated from remote retention

These four local refs are absent while their exact GitHub same-name refs remain:

| Branch | Retained GitHub tip |
|---|---|
| `claude/focused-lehmann-5027fa` | `d9bf553ef864bbeb830e666bf8171bf90aad6106` |
| `docs/compliance-data-inventory` | `f4d23db56ce4c4b2da1ff62ca1e1dd44f1216fd6` |
| `feat/account-deletion-erasure` | `9ec3281ce5f4902b1c89893154869b5e10a7618a` |
| `feat/region-gated-provider-routing` | `f1e8ca01049305f859d9ac5209b2b45d0cc3b934` |

No GitHub remote deletion was coupled to that local-only deletion batch.

## Detached recovery

| Detached worktree | Detached SHA | Exact recovery ref | Disposition |
|---|---|---|---|
| `/Volumes/Starship/MAIS-MVP/.claude/worktrees/fervent-murdock-e2535c` | `5b044fb169da7169ce7e7c7e6e06ff97b6cd9661` | `origin/archive/detached-fervent-murdock-e2535c-20260823` | retained because `.codex/` remains untracked |
| `/Volumes/Starship/MAIS-qwen-3-8-max-prod-wt` | `bd0928ef52ff000976d9abab279bc79fc1aef1ae` | `origin/archive/detached-qwen-3-8-max-prod-20260823` | retained; exact recovery ref verified |

## Owner-held parent remediation branches

At final audit, these are the only local branch tips not contained by any fetched `origin/*` ref. They are all same-day parent-remediation slices and therefore remain untouched under the owner's explicit hold:

| Branch | Tip | Worktree | Final status |
|---|---|---|---|
| `codex/a11-parent-gates-20260823` | `45a9dbfbb9d7918cf1bdc1fe490888a2f779ff81` | `.worktrees/a11-parent-gates-20260823` | hold; active/dirty |
| `codex/a12-parent-guardian-invites-20260823` | `8d01a4bcb994c39c80291c5abcda8b33ed4f2829` | `.worktrees/a12-parent-guardian-invites-20260823` | hold; created/updated concurrently and dirty |
| `codex/a12-parent-privacy-api-20260823` | `d965809bf0d7f151921d8ac10be64c3c3c310143` | `.worktrees/a12-parent-privacy-api-20260823` | hold |
| `codex/a12-parent-session-revocation-20260823` | `8d01a4bcb994c39c80291c5abcda8b33ed4f2829` | `.worktrees/a12-parent-session-revocation-20260823` | hold |
| `codex/a13-teacher-report-target-20260823` | `300f97c5e1a3aa3748d39945d95e84e825547f2e` | `.worktrees/a13-teacher-report-target-20260823` | hold |
| `codex/a23-parent-integration-20260823-v2` | `56c5c2775ae12eeefad0848247bd3a1699127007` | `.worktrees/a23-parent-integration-20260823-v2` | hold |

## Stage E: remote branch decision queue

### Current action

- GitHub remote branches deleted: **0**.
- Automatic merged-PR head deletions were reversed by recreating the exact reviewed tip.
- Local deletion and remote deletion remain separate authorization batches.

### Future owner-review candidates; not deleted

These seven merged-PR head refs are exact ancestors of live `origin/main` and can be considered in a future remote-only deletion batch after owner confirmation:

1. `origin/codex/a17-student-rewards-dashboard`
2. `origin/codex/a04-practice-two-doors-review-20260822`
3. `origin/qa/learner-teacher-interactions`
4. `origin/test/lesson-menu-phone-e2e-coverage`
5. `origin/claude/fervent-murdock-e2535c`
6. `origin/codex/a04-math-keyboard-fix`
7. `origin/qa/teacher-coverage`

### Must retain pending separate evidence decisions

All 19 `origin/archive/*-20260823` refs are recovery/evidence refs and are not deletion candidates in this phase. The other 27 remote branches, including `origin/main` and active/out-of-scope branches, also remain untouched.

## Verification record

- `gh pr list --state open --limit 100 --json ...` -> `[]`.
- Stage C final-state count -> 9 evidence archives, 2 reviewed commits, 3 blocker reports.
- 14 Stage C JSON records -> all `jq -e .` PASS.
- Nine Stage C archive refs -> exact SHA PASS.
- Two Stage C reviewed remotes -> exact SHA and live-main ancestry PASS.
- Five closed-PR archive refs -> exact SHA PASS.
- Five Stage D merged-PR retained heads -> exact SHA and live-main ancestry PASS.
- Three blocker-report worktrees -> branch heads and every recorded file SHA-256/byte count unchanged; recorded tracked patches unchanged.
- Detached recovery refs -> 2/2 exact SHA PASS.
- Local-only deletion batch -> 4/4 local refs absent and same-name remotes present at exact recorded SHAs.
- Unprotected local-tip scan -> only the six owner-held same-day parent branches listed above.
- Worktree count -> 32; branch worktrees 30; detached 2; clean 17; dirty 15.
- `git worktree prune --dry-run --verbose` -> no output.
- Root integration checkout remains dirty and was not mutated by closure operations.

## Recovery methods

Evidence archive example:

```bash
git fetch origin archive/a04-practice-two-doors-pre-review-20260823
git worktree add /Volumes/Starship/MAIS-recovery-a04 origin/archive/a04-practice-two-doors-pre-review-20260823
```

Merged retained head example:

```bash
git fetch origin qa/teacher-coverage
git worktree add -b recovery/qa-teacher-coverage /Volumes/Starship/MAIS-recovery-teacher origin/qa/teacher-coverage
```

Detached recovery example:

```bash
git fetch origin archive/detached-fervent-murdock-e2535c-20260823
git worktree add --detach /Volumes/Starship/MAIS-recovery-fervent origin/archive/detached-fervent-murdock-e2535c-20260823
```

The three blocker worktrees require no reconstruction: their exact local paths and dirty fingerprints remain intact. Do not remove them until the relevant owner assigns `reviewed commit`, `evidence archive`, `owner-approved discard`, or another explicit blocker resolution.

## Remaining owner decisions

1. Route the three blocker reports to their owners; do not remove those worktrees before a new final disposition.
2. Decide whether to retain or physically remove the California residual only after A22/owner evidence review.
3. Let the six same-day parent-remediation sessions finish; do not archive or delete their refs as part of this closure.
4. If desired, authorize a new, remote-only Stage E batch for some or all seven merged-head candidates. No such authorization was inferred here.
