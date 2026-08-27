# MAIS-MVP Stage C–E delta revalidation

- **Owner / lane:** A25 Git hygiene and release intake
- **Generated:** 2026-08-23T04:23:45Z (Asia/Hong_Kong)
- **Repository:** `/Volumes/Starship/MAIS-MVP`
- **Immutable historical baseline:** [2026-08-23-A25-stage-c-d-e-branch-pr-closure.md](./2026-08-23-A25-stage-c-d-e-branch-pr-closure.md)
- **Machine-readable evidence:** [2026-08-23-A25-stage-c-d-e-delta-revalidation.json](./2026-08-23-A25-stage-c-d-e-delta-revalidation.json)

## Outcome

This is an evidence-only delta pass. The original 14 Stage C rows were not re-executed and the historical ledger was not rewritten. No branch or worktree was deleted, no worktree was force-removed, no push/merge/PR mutation occurred, no GitHub remote branch was deleted, and no product/API/type file was modified.

| Measure | Historical ledger final | Delta pre-write snapshot | Change |
| --- | ---: | ---: | ---: |
| Local branches | 43 | 48 | +5 |
| Worktrees | 32 | 37 | +5 |
| Branch worktrees | 30 | 35 | +5 |
| Detached worktrees | 2 | 2 | 0 |
| Clean worktrees | 17 | 23 | +6 |
| Dirty worktrees | 15 | 14 | -1 |
| Live GitHub remote heads | 53 | 53 | 0 |
| Open PRs | 0 | 0 | 0 |

Live `origin/main` is `b6c7c347a49a813e454e707dd3c16399dcf29909`. Local `main` remains `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6` (1 ahead / 50 behind). The 53 live heads matched all 53 cached tracking refs by name and SHA; `gh pr list --state open` returned `[]`.

Post-write revalidation recorded a concurrent timeline rather than freezing active sessions. At `2026-08-23T04:34:02Z`, `codex/parent-full-remediation-20260823-v3` moved from clean to 2 tracked modifications; by `2026-08-23T04:43:01Z`, that session had committed the two files at a new clean tip. A separate A06 session also created one clean branch/worktree at live `origin/main`. The final evidence cut at `2026-08-23T04:48:17Z` is therefore 49 local branches, 38 worktrees (36 branch / 2 detached), and 24 clean / 14 dirty. The root's untracked count moved from 100 to 102 only because of the two authorized reports.

## Dirty-root preservation boundary

Before either report existed, the root had 2 tracked modifications and 100 untracked entries. Both tracked files are pre-existing owner/agent work and were left byte-for-byte untouched:

- `AGENTS.md`: SHA-256 `bccede9b1cea2c702948eea9ca08ffc9578ac96a53483b02b64a54d298e3d012`
- `CLAUDE.md`: SHA-256 `ea003661c10d290aa27ac77e6a087f34579c5a93b29a92e4399a2b10562643a3`
- tracked diff SHA-256: `137ac2a65b36e7417eb002027c30d47029dc2cee3b8e31741509d2387c206647`
- staged diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty)
- observed root cwd processes: 8 (node_repl:2565, node_repl:38539, node_repl:46427, node_repl:63159, node_repl:63201, node_repl:64142, node_repl:64418, node_repl:72393)

Only the two delta report paths are authorized as new files. No staging, commit, stash, reset, switch, clean, or overwrite is authorized.

## Stage C — sealed terminal states revalidated

Result: 14/14 packages still have exactly one terminal state: 9 `evidence archive`, 2 `reviewed commit`, 0 `owner-approved discard`, and 3 `blocker report`. All 9 archive refs are exact; both reviewed heads are exact and ancestors of live `origin/main`; all 3 blocker head/file/patch fingerprints are unchanged. Reopened rows: **0**.

| branch | owner/session | 终态 | tip | 恢复引用 | 复核 |
| --- | --- | --- | --- | --- | --- |
| `codex/a04-practice-two-doors` | A04 | evidence archive | `f48f118c3da2` | `origin/archive/a04-practice-two-doors-pre-review-20260823` | PASS |
| `codex/a05-15-bug-loop` | A05 | evidence archive | `8c4d06ab2760` | `origin/archive/a05-15-bug-loop-wip-20260823` | PASS |
| `codex/a06-ca-visualization-labs-loop` | A06 | evidence archive | `777f46db6ef1` | `origin/archive/a06-ca-visualization-labs-loop-wip-20260823` | PASS |
| `codex/a06-hk-visualization-labs-loop` | A06 | evidence archive | `d5595131afb3` | `origin/archive/a06-hk-visualization-labs-loop-wip-20260823` | PASS |
| `codex/a14-parent-action-ui-20260823` | A14 | blocker report | `a7416c67222c` | — | PASS |
| `codex/a17-student-rewards-dashboard` | A17 | reviewed commit | `8e39fd054010` | `origin/codex/a17-student-rewards-dashboard` | PASS |
| `codex/a18-hk-all-math-lesson-qa` | A18 | evidence archive | `47dc33955210` | `origin/archive/a18-hk-all-math-lesson-qa-wip-20260823` | PASS |
| `fix/starship-canonical-root` | A22+A25 | blocker report | `ee9b5e63fe8e` | — | PASS |
| `codex/a01-a12-google-oauth-loop` | A01+A12 | evidence archive | `22d7c0f64583` | `origin/archive/google-oauth-loop-blocked-20260823` | PASS |
| `worktree-lesson-remove-viz-completion` | A05 | evidence archive | `93cefbd1c0fa` | `origin/archive/lesson-remove-viz-completion-wip-20260823` | PASS |
| `codex/next16-3-parity` | A10+A22 | evidence archive | `02a6145dd9cc` | `origin/archive/next16-3-parity-hold-20260823` | PASS |
| `qa/learner-teacher-interactions` | A11+A13 | reviewed commit | `a7d7e78aa4b1` | `origin/qa/learner-teacher-interactions` | PASS |
| `security/ai-tutor-voice-moderation` | A07+A12 | blocker report | `5073eb0b9d5f` | — | PASS |
| `feat/tutor-moderation-provider` | A07 | evidence archive | `919d15eb78d5` | `origin/archive/tutor-moderation-provider-pre-hardening-20260823` | PASS |

### Blocker fingerprint gate

| branch | head | tracked/untracked | tracked patch SHA-256 | 文件指纹 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `codex/a14-parent-action-ui-20260823` | `a7416c67222c` | 4/1 | `05bf83d5ddca9cd2cc79d7564a917eaff0fb8ebe69ffaa5538561e3e9650d057` | 5/5 exact | UNCHANGED |
| `fix/starship-canonical-root` | `ee9b5e63fe8e` | 2/1 | `d39d40cf3f05f8b887260d98a24c649d3e0febb82ed2bbf014ae447cc4eabe42` | 3/3 exact | UNCHANGED |
| `security/ai-tutor-voice-moderation` | `5073eb0b9d5f` | 0/1 | `N/A` | 1/1 exact | UNCHANGED |

The three blocker worktrees remain registered and physically present. Their only allowed next states remain reviewed commit, evidence archive, owner-approved discard, or a renewed blocker report. No forced removal is permitted.

`/Volumes/Starship/MAIS-ca-viz-labs-wt` is still physically present but is not a registered worktree. It was not touched. Any physical deletion remains a separate owner/A22-authorized operation.

## Stage D — delta only

Open PR count is 0, so no PR was created, updated, closed, merged, or otherwise mutated.

### Ten parent-remediation branches: OWNER_HOLD_NO_REMOTE

All ten were clean at the pre-write snapshot and no live remote head fully contained any local tip. One row became dirty through concurrent owner/session work, was stopped and fingerprinted, then returned clean at a new local commit. At the final evidence cut all 10 are clean and all 10 remain absent from remote containment. The owner instruction “today's parent remediation branches stay untouched” remains controlling.

| branch | owner/session | tip | ahead/behind origin/main | remote containment | 决策 |
| --- | --- | --- | --- | --- | --- |
| `codex/a11-parent-gates-20260823` | A11 | `a4be48617593` | 2/28 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-guardian-invites-20260823` | A12 | `acb666523f4d` | 3/28 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-messages-20260823` | A12 | `7788db92911b` | 5/0 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-privacy-api-20260823` | A12 | `d965809bf0d7` | 1/28 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-session-revocation-20260823` | A12 | `d61e3201839f` | 3/28 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a13-teacher-report-target-20260823` | A13 | `300f97c5e1a3` | 2/28 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a14-parent-ui-final-20260823` | A14 | `2ac7cc6606e6` | 4/0 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/a23-parent-integration-20260823-v2` | A23 | `56c5c2775ae1` | 2/12 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/parent-full-remediation-20260823-v3` | A23 | `c83d14e35c12` | 17/0 | NONE | `OWNER_HOLD_NO_REMOTE` |
| `codex/parent-gap-ack-report-20260823` | A12+A14 | `8b607eef2c5b` | 10/0 | NONE | `OWNER_HOLD_NO_REMOTE` |

#### Affected-row stop-rule timeline

- Branch: `codex/parent-full-remediation-20260823-v3`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-full-remediation-20260823-v3`.
- Intermediate observation at `2026-08-23T04:34:02Z`: head `56e7a3c8852f35de3defd5f987690e255583c908`, 2 tracked unstaged modifications, 0 untracked entries, 0 persistent cwd processes.
- Intermediate tracked patch SHA-256: `92cf54cb27be479e04a5b2ea13f60632546797ac21042ef88074c06c36932def`.
- `scripts/parent-console-gates.test.mjs`: 18,882 bytes; SHA-256 `833f8e6858709227c4d91befe0161fd4ffdcb0052ae87e1cdd68aea32f081c5e`.
- `tests/e2e/isolated-app.ts`: 17,014 bytes; SHA-256 `181257283a9d60982a4092d73a148a849538b734d2977aa443d49b8bc7fc0590`.
- Final observation at `2026-08-23T04:43:01Z`: clean head `c83d14e35c126cac8920b0487624521967af7693`, 17 ahead / 0 behind live `origin/main`, no remote containment.
- Decision: retain the clean local branch/worktree as `OWNER_HOLD_NO_REMOTE`; no A25 push, archive, removal, or discard action was taken.

### A06 trig active writer hold

- Branch: `codex/a06-trig-unit-wave-redesign-20260823`
- Head: `b6c7c347a49a813e454e707dd3c16399dcf29909`; the committed head is in `origin/main`, but the uncommitted WIP is not.
- Worktree: `/Volumes/Starship/MAIS-trig-unit-wave-redesign-wt`
- Initial observation at `2026-08-23T04:23:45Z`: 5 tracked modifications and 2 untracked tests.
- Intermediate observation at `2026-08-23T04:37:57Z`: 6 tracked modifications and 2 untracked tests; tracked patch SHA-256 at that instant was `976af6c1e950ae84b601ef165c41be2f71f46733ec099758c00b3155f2f31442`.
- Current observation at `2026-08-23T04:48:17Z`: 6 tracked modifications and 4 untracked tests.
- Current exact files:
  - ` M` `components/visualizations/three/manim/MathFormulaOverlay.tsx`
  - ` M` `components/visualizations/three/manim/mathFormulaLayer.ts`
  - ` M` `components/visualizations/three/manim/mathProjectedLabels.ts`
  - ` M` `components/visualizations/three/manim/mathSceneRegistry.test.ts`
  - ` M` `components/visualizations/three/manim/mathSceneRegistry.ts`
  - ` M` `components/visualizations/three/manim/mathSceneTypes.ts`
  - `??` `components/visualizations/three/manim/mathSceneBrowserVideoCapture.test.ts`
  - `??` `components/visualizations/three/manim/mathSceneCaptions.test.ts`
  - `??` `components/visualizations/three/manim/mathSceneProjectedLabels.test.ts`
  - `??` `components/visualizations/three/manim/mathTrigUnitWaveScene.test.ts`
- Cwd processes observed at 2026-08-23T04:23:45Z: 3 (node:66662, node:66687, node:66788).

The added tracked modification is `mathFormulaLayer.ts`; its SHA-256 at the `2026-08-23T04:37:57Z` observation was `637d04d9edca988c653fdb5774edc376f52c3ba5e0df6b72cc70b578901fbaaf`. At `2026-08-23T04:39:55Z`, the same 6+2 path inventory and the same three processes remained, while the tracked patch content had continued changing. The hashes above are therefore point-in-time evidence, not a stability or closure claim. This concurrent drift is direct evidence that committed-head ancestry cannot absorb uncommitted WIP. Disposition remains `ACTIVE_WRITER_HOLD`; it was not modified, archived, removed, staged, committed, or pushed by A25.

### Other dirty/active worktrees

Every remaining dirty/active row is inventory-only. Owner/session closure is required before exact-path slicing and one of the four terminal states.

| branch/detached | owner/session | worktree | tracked/untracked | 进程 | 建议状态 |
| --- | --- | --- | --- | --- | --- |
| `main` | A25 | `/Volumes/Starship/MAIS-MVP` | 2/100 | 8 | `INTEGRATION_INVENTORY` |
| `codex/a18-china-all-math-qa` | A18 | `/Volumes/Starship/MAIS-china-all-math-qa-wt` | 5/2 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-china-visualization-labs-loop` | A06 | `/Volumes/Starship/MAIS-china-viz-labs-wt` | 44/83 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a18-hk-ease-v2-qa` | A18 | `/Volumes/Starship/MAIS-hk-ease-v2-qa-wt` | 0/10 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a01-home-hero-chromebook` | A01 | `/Volumes/Starship/MAIS-home-hero-wt` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `claude/confident-archimedes-43307f` | UNASSIGNED | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/confident-archimedes-43307f` | 0/1 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `fix/starship-canonical-root` | A10+A25 | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/cool-lamarr-a66bd6` | 2/1 | 0 | `BLOCKER_REPORT` |
| `detached@5b044fb169da` | UNASSIGNED | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/fervent-murdock-e2535c` | 0/1 | 0 | `DETACHED_RECOVERY_RETAIN` |
| `security/ai-tutor-voice-moderation` | A07+A12 | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/happy-lamport-055156` | 0/1 | 0 | `BLOCKER_REPORT` |
| `claude/nervous-borg-384852` | UNASSIGNED | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/nervous-borg-384852` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-ca-viz-resume-20260819` | A06 | `/Volumes/Starship/MAIS-MVP/.worktrees/a06-ca-viz-resume-20260819` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `ops/production-observability` | A12+A22 | `/Volumes/Starship/MAIS-observability-wt` | 12/2 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a14-parent-action-ui-20260823` | A14 | `/Volumes/Starship/MAIS-parent-action-ui-wt` | 4/1 | 0 | `BLOCKER_REPORT` |
| `codex/a06-trig-unit-wave-redesign-20260823` | A06 | `/Volumes/Starship/MAIS-trig-unit-wave-redesign-wt` | 6/4 | 3 | `ACTIVE_WRITER_HOLD` |
| `codex/a06-mais-manim-v3-rc-20260823` | A06 | `/Users/dongpinhu/Documents/Codex/2026-08-23/mais-manim-v3-implementation-wt` | 0/0 | 0 persistent | `ACTIVE_OR_OWNER_CONFIRMATION` |

### Detached recovery

| worktree | SHA | recovery ref | dirty | 复核 |
| --- | --- | --- | --- | --- |
| `/Volumes/Starship/MAIS-MVP/.claude/worktrees/fervent-murdock-e2535c` | `5b044fb169da7169ce7e7c7e6e06ff97b6cd9661` | `origin/archive/detached-fervent-murdock-e2535c-20260823` | 0/1 | PASS |
| `/Volumes/Starship/MAIS-qwen-3-8-max-prod-wt` | `bd0928ef52ff000976d9abab279bc79fc1aef1ae` | `origin/archive/detached-qwen-3-8-max-prod-20260823` | 0/0 | PASS |

Both detached worktrees and both exact recovery refs remain retained.

## Stage E — remote deletion remains zero

All 53 live GitHub heads are retained. The 19 `origin/archive/*-20260823` evidence/recovery refs remain present at the exact recorded SHA.

| recovery ref | SHA | exact |
| --- | --- | --- |
| `origin/archive/a01-home-hero-local-tip-20260823` | `419c81eb68a1dc2b2c5b4188efd62c1f183a5cc4` | PASS |
| `origin/archive/a04-practice-two-doors-pre-review-20260823` | `f48f118c3da2e5396d5d6a49bd589272dbf264e0` | PASS |
| `origin/archive/a05-15-bug-loop-wip-20260823` | `8c4d06ab2760b82b34ab2946d0688e75b8740e29` | PASS |
| `origin/archive/a06-ca-visualization-labs-loop-wip-20260823` | `777f46db6ef16c209f3493f58ec1fb13df8daf94` | PASS |
| `origin/archive/a06-hk-visualization-labs-loop-wip-20260823` | `d5595131afb3028e769689998e7a67090865afae` | PASS |
| `origin/archive/a18-hk-all-math-lesson-qa-wip-20260823` | `47dc3395521044ac8728d790c90d30516b9c94fa` | PASS |
| `origin/archive/a23-closeouts-main-merge-20260823` | `543d8ec8b02eae0b42f0690d3929191c777adaac` | PASS |
| `origin/archive/a23-closeouts-main-ready-20260823` | `66fddde4782b125c49f50c43348c1829ef8e1267` | PASS |
| `origin/archive/detached-fervent-murdock-e2535c-20260823` | `5b044fb169da7169ce7e7c7e6e06ff97b6cd9661` | PASS |
| `origin/archive/detached-qwen-3-8-max-prod-20260823` | `bd0928ef52ff000976d9abab279bc79fc1aef1ae` | PASS |
| `origin/archive/google-oauth-loop-blocked-20260823` | `22d7c0f645837f8e1ef2094fdacb037879eb37af` | PASS |
| `origin/archive/lesson-remove-viz-completion-wip-20260823` | `93cefbd1c0fa101e7d26a1fb7bab2d70fe32978d` | PASS |
| `origin/archive/next16-3-parity-hold-20260823` | `02a6145dd9ccac86c7f4f4571a32ae9eac14f6d8` | PASS |
| `origin/archive/pr119-owner-selected-hero-20260823` | `d741a0aa8a14bf428ed3d2fdb98bbb41caff6fbf` | PASS |
| `origin/archive/pr134-app-state-row-tables-20260823` | `e48c2a67e2f0208d4ed8aad4bb5e1feaaf8438ed` | PASS |
| `origin/archive/pr86-legal-accessibility-foundation-20260823` | `4a26ef985f1324bebeec72c8efe5ceb818cc0898` | PASS |
| `origin/archive/pr91-starship-migration-cleanup-20260823` | `d2ffff12aed07cf60ef790c1133c031f74be00a9` | PASS |
| `origin/archive/pr94-check-answer-fast-path-20260823` | `6c5ddfc46c0b3dff8af57e878d35e496ba777cb6` | PASS |
| `origin/archive/tutor-moderation-provider-pre-hardening-20260823` | `919d15eb78d54ad26919c2ce9a8cbfda2e75b1d9` | PASS |

The seven merged-head candidates are still ancestors of live `origin/main`, but remain only a future owner-review queue:

| remote | SHA | origin/main ancestor | 决策 |
| --- | --- | --- | --- |
| `origin/codex/a17-student-rewards-dashboard` | `8e39fd054010a8bca324a752c242154bab8ac1ef` | PASS | future owner-review queue |
| `origin/codex/a04-practice-two-doors-review-20260822` | `a1379c643f3e18d43a137f30593135375b7bcac0` | PASS | future owner-review queue |
| `origin/qa/learner-teacher-interactions` | `a7d7e78aa4b14ced28617fd19b5a41c3d8c2bb56` | PASS | future owner-review queue |
| `origin/test/lesson-menu-phone-e2e-coverage` | `63fdc82bfd3c4167422c0adaf45650d80706c130` | PASS | future owner-review queue |
| `origin/claude/fervent-murdock-e2535c` | `5a2ea9eb89d4066b629d77661415b2ce8db21cb7` | PASS | future owner-review queue |
| `origin/codex/a04-math-keyboard-fix` | `1ee9816948e34fade17b70aa71ebbc07fe81f01f` | PASS | future owner-review queue |
| `origin/qa/teacher-coverage` | `f17ebd898d62e05d84c13a8526a87c2a37c83849` | PASS | future owner-review queue |

A later remote-only batch must re-prove remote existence, zero unique commits, live-main ancestry, clean/ended associated worktree state, and item-specific owner authorization. Remote absence or GitHub auto-delete is not authorization.

## Complete worktree inventory

The following snapshot precedes creation of these two reports, so the root row correctly shows 100 pre-existing untracked entries. After report creation, exactly two additional untracked paths are expected.

<details>
<summary>37 worktrees (35 branch, 2 detached)</summary>

| branch/detached | owner/session | head | worktree | tracked/untracked | cwd proc | 建议状态 |
| --- | --- | --- | --- | --- | --- | --- |
| `main` | A25 | `a444b0dcc6a8` | `/Volumes/Starship/MAIS-MVP` | 2/100 | 8 | `INTEGRATION_INVENTORY` |
| `codex/a04-a05-fix-15-product-bugs` | A04+A05 | `61cd245c8ee5` | `/Volumes/Starship/MAIS-15-bug-product-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a11-practice-pager-two-door-e2e-20260822` | A11 | `9ba0884e7e0c` | `/Volumes/Starship/MAIS-a11-practice-pager-two-door-e2e-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `content/us-ca-math-lesson-qa` | A18+A21 | `9a1ff26e7723` | `/Volumes/Starship/MAIS-ca-content-qa-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `compliance/child-data-legal-baseline` | A10+A12+A18 | `5ac94eb8437c` | `/Volumes/Starship/MAIS-child-legal-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a18-china-all-math-qa` | A18 | `1e9f758c033c` | `/Volumes/Starship/MAIS-china-all-math-qa-wt` | 5/2 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-china-visualization-labs-loop` | A06 | `f865cadd5122` | `/Volumes/Starship/MAIS-china-viz-labs-wt` | 44/83 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `perf/classroom-load-smoke` | A11+A22 | `eb77c9310dae` | `/Volumes/Starship/MAIS-classroom-load-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a18-hk-ease-v2-qa` | A18 | `392bc74bc855` | `/Volumes/Starship/MAIS-hk-ease-v2-qa-wt` | 0/10 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a01-home-hero-chromebook` | A01 | `419c81eb68a1` | `/Volumes/Starship/MAIS-home-hero-wt` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `claude/confident-archimedes-43307f` | UNASSIGNED | `861b96afc690` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/confident-archimedes-43307f` | 0/1 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `fix/starship-canonical-root` | A10+A25 | `ee9b5e63fe8e` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/cool-lamarr-a66bd6` | 2/1 | 0 | `BLOCKER_REPORT` |
| `detached@5b044fb169da` | UNASSIGNED | `5b044fb169da` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/fervent-murdock-e2535c` | 0/1 | 0 | `DETACHED_RECOVERY_RETAIN` |
| `security/ai-tutor-voice-moderation` | A07+A12 | `5073eb0b9d5f` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/happy-lamport-055156` | 0/1 | 0 | `BLOCKER_REPORT` |
| `claude/nervous-borg-384852` | UNASSIGNED | `a444b0dcc6a8` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/nervous-borg-384852` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-ca-viz-resume-20260819` | A06 | `48be11db27be` | `/Volumes/Starship/MAIS-MVP/.worktrees/a06-ca-viz-resume-20260819` | 1/0 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a08-parent-auth-state-20260823` | A08 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a08-parent-auth-state-20260823` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a11-parent-gates-20260823` | A11 | `a4be48617593` | `/Volumes/Starship/MAIS-MVP/.worktrees/a11-parent-gates-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/parent-gap-ack-report-20260823` | A12+A14 | `8b607eef2c5b` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a14-parent-gap-ack-report-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-guardian-invites-20260823` | A12 | `acb666523f4d` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-guardian-invites-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-messages-20260823` | A12 | `7788db92911b` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-messages-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-privacy-api-20260823` | A12 | `d965809bf0d7` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-privacy-api-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-session-revocation-20260823` | A12 | `d61e3201839f` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-session-revocation-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a13-teacher-report-target-20260823` | A13 | `300f97c5e1a3` | `/Volumes/Starship/MAIS-MVP/.worktrees/a13-teacher-report-target-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a14-parent-ui-final-20260823` | A14 | `2ac7cc6606e6` | `/Volumes/Starship/MAIS-MVP/.worktrees/a14-parent-ui-final-20260823` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a14-parent-ui-reliability-20260823` | A14 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a14-parent-ui-reliability-20260823` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a18-hk-safe-closeout-20260822` | A18 | `80f927ceee90` | `/Volumes/Starship/MAIS-MVP/.worktrees/a18-hk-safe-closeout-20260822` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a23-parent-full-remediation-20260823` | A23 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-full-remediation-20260823` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/parent-full-remediation-20260823-v3` | A23 | `56e7a3c8852f` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-full-remediation-20260823-v3` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `codex/a23-parent-integration-20260823-v2` | A23 | `56c5c2775ae1` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-integration-20260823-v2` | 0/0 | 0 | `OWNER_HOLD_NO_REMOTE` |
| `fix/nova-tutor-functions` | A07+A12 | `05841b9900a7` | `/Volumes/Starship/MAIS-nova-tutor-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `ops/production-observability` | A12+A22 | `409d1a987e83` | `/Volumes/Starship/MAIS-observability-wt` | 12/2 | 0 | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a14-parent-action-ui-20260823` | A14 | `a7416c67222c` | `/Volumes/Starship/MAIS-parent-action-ui-wt` | 4/1 | 0 | `BLOCKER_REPORT` |
| `security/phase0-auth-hardening` | A12 | `96f35faf6be5` | `/Volumes/Starship/MAIS-phase0-auth-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `detached@bd0928ef52ff` | UNASSIGNED | `bd0928ef52ff` | `/Volumes/Starship/MAIS-qwen-3-8-max-prod-wt` | 0/0 | 0 | `DETACHED_RECOVERY_RETAIN` |
| `codex/a06-trig-unit-wave-redesign-20260823` | A06 | `b6c7c347a49a` | `/Volumes/Starship/MAIS-trig-unit-wave-redesign-wt` | 5/2 | 3 | `ACTIVE_WRITER_HOLD` |
| `i18n/zh-hans-ratchet` | A09 | `5d6cf7e77552` | `/Volumes/Starship/MAIS-zh-hans-wt` | 0/0 | 0 | `ACTIVE_OR_OWNER_CONFIRMATION` |

</details>

## Complete local branch inventory

<details>
<summary>48 local branches</summary>

| branch | owner/session | head | worktree | same remote | any remote contains | main contains | 建议状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `claude/confident-archimedes-43307f` | UNASSIGNED | `861b96afc690` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/confident-archimedes-43307f` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `claude/fervent-murdock-e2535c` | UNASSIGNED | `5a2ea9eb89d4` | — | yes | yes | yes | `REMOTE_OR_ARCHIVE_BACKED_NO_WORKTREE` |
| `claude/nervous-borg-384852` | UNASSIGNED | `a444b0dcc6a8` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/nervous-borg-384852` | no | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a01-a12-google-oauth-loop` | A01+A12 | `22d7c0f64583` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a01-home-hero-chromebook` | A01 | `419c81eb68a1` | `/Volumes/Starship/MAIS-home-hero-wt` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a04-a05-fix-15-product-bugs` | A04+A05 | `61cd245c8ee5` | `/Volumes/Starship/MAIS-15-bug-product-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a04-practice-two-doors` | A04 | `f48f118c3da2` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a05-15-bug-loop` | A05 | `8c4d06ab2760` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a06-ca-visualization-labs-loop` | A06 | `777f46db6ef1` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a06-ca-viz-resume-20260819` | A06 | `48be11db27be` | `/Volumes/Starship/MAIS-MVP/.worktrees/a06-ca-viz-resume-20260819` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-china-visualization-labs-loop` | A06 | `f865cadd5122` | `/Volumes/Starship/MAIS-china-viz-labs-wt` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a06-hk-visualization-labs-loop` | A06 | `d5595131afb3` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a06-trig-unit-wave-redesign-20260823` | A06 | `b6c7c347a49a` | `/Volumes/Starship/MAIS-trig-unit-wave-redesign-wt` | no | yes | yes | `ACTIVE_WRITER_HOLD` |
| `codex/a08-parent-auth-state-20260823` | A08 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a08-parent-auth-state-20260823` | no | yes | yes | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a11-parent-gates-20260823` | A11 | `a4be48617593` | `/Volumes/Starship/MAIS-MVP/.worktrees/a11-parent-gates-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a11-practice-pager-two-door-e2e-20260822` | A11 | `9ba0884e7e0c` | `/Volumes/Starship/MAIS-a11-practice-pager-two-door-e2e-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a12-parent-guardian-invites-20260823` | A12 | `acb666523f4d` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-guardian-invites-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-messages-20260823` | A12 | `7788db92911b` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-messages-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-privacy-api-20260823` | A12 | `d965809bf0d7` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-privacy-api-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a12-parent-session-revocation-20260823` | A12 | `d61e3201839f` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-parent-session-revocation-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a13-teacher-report-target-20260823` | A13 | `300f97c5e1a3` | `/Volumes/Starship/MAIS-MVP/.worktrees/a13-teacher-report-target-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a14-parent-action-ui-20260823` | A14 | `a7416c67222c` | `/Volumes/Starship/MAIS-parent-action-ui-wt` | no | yes | yes | `SEALED_BLOCKER_REPORT` |
| `codex/a14-parent-ui-final-20260823` | A14 | `2ac7cc6606e6` | `/Volumes/Starship/MAIS-MVP/.worktrees/a14-parent-ui-final-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/a14-parent-ui-reliability-20260823` | A14 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a14-parent-ui-reliability-20260823` | no | yes | yes | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a18-china-all-math-qa` | A18 | `1e9f758c033c` | `/Volumes/Starship/MAIS-china-all-math-qa-wt` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a18-hk-all-math-lesson-qa` | A18 | `47dc33955210` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/a18-hk-ease-v2-qa` | A18 | `392bc74bc855` | `/Volumes/Starship/MAIS-hk-ease-v2-qa-wt` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `codex/a18-hk-safe-closeout-20260822` | A18 | `80f927ceee90` | `/Volumes/Starship/MAIS-MVP/.worktrees/a18-hk-safe-closeout-20260822` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a23-closeouts-main-merge-20260822` | A23 | `543d8ec8b02e` | — | no | yes | no | `REMOTE_OR_ARCHIVE_BACKED_NO_WORKTREE` |
| `codex/a23-closeouts-main-ready-20260822` | A23 | `66fddde4782b` | — | no | yes | no | `REMOTE_OR_ARCHIVE_BACKED_NO_WORKTREE` |
| `codex/a23-parent-full-remediation-20260823` | A23 | `39f0a8f80829` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-full-remediation-20260823` | no | yes | yes | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `codex/a23-parent-integration-20260823-v2` | A23 | `56c5c2775ae1` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-integration-20260823-v2` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/next16-3-parity` | UNASSIGNED | `02a6145dd9cc` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `codex/parent-full-remediation-20260823-v3` | A23 | `56e7a3c8852f` | `/Volumes/Starship/MAIS-MVP/.worktrees/a23-parent-full-remediation-20260823-v3` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `codex/parent-gap-ack-report-20260823` | A12+A14 | `8b607eef2c5b` | `/Volumes/Starship/MAIS-MVP/.worktrees/a12-a14-parent-gap-ack-report-20260823` | no | no | no | `OWNER_HOLD_NO_REMOTE` |
| `compliance/child-data-legal-baseline` | A10+A12+A18 | `5ac94eb8437c` | `/Volumes/Starship/MAIS-child-legal-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `content/us-ca-math-lesson-qa` | A18+A21 | `9a1ff26e7723` | `/Volumes/Starship/MAIS-ca-content-qa-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `feat/legal-accessibility-foundation` | A09+A10 | `9019b8c224f5` | — | yes | yes | no | `REMOTE_OR_ARCHIVE_BACKED_NO_WORKTREE` |
| `feat/tutor-moderation-provider` | A07 | `919d15eb78d5` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |
| `fix/nova-tutor-functions` | A07+A12 | `05841b9900a7` | `/Volumes/Starship/MAIS-nova-tutor-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `fix/starship-canonical-root` | A10+A25 | `ee9b5e63fe8e` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/cool-lamarr-a66bd6` | yes | yes | yes | `SEALED_BLOCKER_REPORT` |
| `i18n/zh-hans-ratchet` | A09 | `5d6cf7e77552` | `/Volumes/Starship/MAIS-zh-hans-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `main` | A25 | `a444b0dcc6a8` | `/Volumes/Starship/MAIS-MVP` | yes | yes | no | `INTEGRATION_INVENTORY` |
| `ops/production-observability` | A12+A22 | `409d1a987e83` | `/Volumes/Starship/MAIS-observability-wt` | yes | yes | no | `ACTIVE_OR_NEEDS_OWNER_INTAKE` |
| `perf/classroom-load-smoke` | A11+A22 | `eb77c9310dae` | `/Volumes/Starship/MAIS-classroom-load-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `security/ai-tutor-voice-moderation` | A07+A12 | `5073eb0b9d5f` | `/Volumes/Starship/MAIS-MVP/.claude/worktrees/happy-lamport-055156` | no | yes | yes | `SEALED_BLOCKER_REPORT` |
| `security/phase0-auth-hardening` | A12 | `96f35faf6be5` | `/Volumes/Starship/MAIS-phase0-auth-wt` | yes | yes | no | `ACTIVE_OR_OWNER_CONFIRMATION` |
| `worktree-lesson-remove-viz-completion` | A05+A06 | `93cefbd1c0fa` | — | no | yes | no | `SEALED_EVIDENCE_ARCHIVE` |

</details>

### Post-write branch/worktree addition

The full tables above are the 48-branch / 37-worktree pre-write inventory. The following concurrent A06 row was added afterward and is part of the final 49/38 evidence cut:

| branch | head | worktree | dirty | remote containment | cwd processes | decision |
| --- | --- | --- | --- | --- | --- | --- |
| `codex/a06-mais-manim-v3-rc-20260823` | `b6c7c347a49a813e454e707dd3c16399dcf29909` | `/Users/dongpinhu/Documents/Codex/2026-08-23/mais-manim-v3-implementation-wt` | 0/0 clean | `origin/main` | 0 persistent at isolated `2026-08-23T04:45:47Z` check | retain; owner/session confirmation required |

The earlier parallel audit briefly saw its own transient `git`/`zsh` subprocesses in this path. They were excluded from owner-process evidence; the isolated follow-up found no persistent cwd process.

## Acceptance and mutation accounting

- `git worktree prune --dry-run --verbose`: empty output; actual prune not run.
- Stage C: 14/14 terminal states, 9/9 archive refs, 2/2 reviewed-main ancestry, 3/3 blocker fingerprints.
- Parent holds: 10/10 clean and 10/10 absent from remote containment at the final evidence cut; one transient dirty row was stopped, fingerprinted, and later observed at its owner-created clean commit.
- A06 trig: final observation 6 tracked / 4 untracked with 3 Node cwd processes; active-writer hold retained.
- Detached recovery: 2/2 exact.
- Stage E archive refs: 19/19 exact; future merged-head candidates: 7/7 live-main ancestors.
- Local deletions: 0.
- Worktree removals: 0; forced removals: 0.
- Pushes: 0; merges: 0; PR mutations: 0.
- GitHub remote deletions: 0.
- Product/API/type modifications: 0.
- Staged files: 0; commits: 0.
- New report files: 2.
- Post-write validation: **PASS_EVIDENCE_ONLY_WITH_CONCURRENT_DELTA_CAPTURED** at the `2026-08-23T04:48:17Z` evidence cut. The original 48/37, 23/14, and A06 5+2 values remain valid for the pre-write snapshot; final topology is 49/38 and 24/14, A06 trig is 6+4 with 3 persistent Node processes, and the newly added A06 worktree is clean with 0 persistent cwd processes. All mutation-zero and preservation gates passed.
