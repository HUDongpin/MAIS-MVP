# A23 PR #220 Promotion Composition

- Owner: `A23 Integration and Promotion`
- Branch: `chore/a23-pr220-promotion-composition-20260830`
- Target PR: `pending-review-only`
- Creation: `2026-08-30 HKT`
- Expected closeout: `2026-08-30 HKT`
- Parent 1 — A10 strict-parser follow-up: `f1bbff00f40f827eda251c67dc09201dd05d491c`
- Parent 2 — PR #220 owner head: `4399e669d007751bb1b716a257004f04c5b10846`
- Claim ceiling: `composition/source-test only`
- Authorization boundary: local composition commit only. Shadow, workflow dispatch, PR #220 remote-head update, main merge, deploy, production mutation, and remote deletion were not authorized and were not performed.

## 2026-08-30 Quality Finding and TDD Repair Follow-up

- Quality finding: `Important` — the strict JSON guard's five behavioral tests were orphaned from required Promotion commands, so static call-site wiring could remain green while parser behavior regressed.
- Initial A10 TDD repair: commit `539b0198539a1890456e3ef5a88b542d355c6bca` wired `scripts/promotion-workflow-json-guard.test.mjs` into `test:promotion-gate` and froze the wiring assertion.
- A23 committed-state RED: exact committed `539b0198539a1890456e3ef5a88b542d355c6bca` failed the P0 Git-object governance check because the reviewed command-body digest remained `8a59d333637faf9b9507733d8680b0cfc1dd323291193567beacbaafa0c55530` while the new command set recomputed to `61bf6300b6e199ed0a1d1a6efc8f327dc80bd50eb04af260a0ed9186681aab01`.
- Final A10 committed-state correction: `e3556833ccfabbf4fe7e9f227f7f10838904d8da`, whose first parent is `539b0198539a1890456e3ef5a88b542d355c6bca`, updates the frozen reviewed digest and appends the A10 evidence record.
- A10 exact-head evidence: Promotion `45/45`; focused release governance `85` passed, `11` contextual skips, `0` failed; type-check passed.
- Follow-up parent 1 — prior A23 composition: `c1680d23dab08361bdb3abe0f4c4fdeb15143f54`
- Follow-up parent 2 — final A10 guard-test wiring repair: `e3556833ccfabbf4fe7e9f227f7f10838904d8da`
- Exact inherited A10 repair paths relative to `f1bbff00f40f827eda251c67dc09201dd05d491c`: `package.json`, `scripts/release-governance.test.mjs`, and `coordination/session-logs/2026-08-29-A10-promotion-workflow-strict-json.md`.
- Claim ceiling remains `composition/source-test only`; current Shadow, Receipt, lifecycle, release, deployment, and live authority are not claimed.
- Authorization boundary remains local composition only. The composition branch was subsequently ordinary-pushed and still has no PR; no Shadow, Receipt replay, workflow dispatch, PR #220 update, main merge, deploy, production mutation, or remote deletion was authorized or performed. The shared repository config still contains the known `core.worktree` anomaly and contaminated test identity `Promotion Gate Test <promotion-gate-test@example.invalid>`; no shared-config repair is authorized. A23 commits use process-local `Dongpin HU (Peter) <47708816+HUDongpin@users.noreply.github.com>` identity overrides and do not rewrite prior commits.

## 2026-08-30 `.tmp` recovery custody and re-affirmation justification

- The pre-existing `.tmp` ignored container was mistakenly removed by `rmdir` while empty; no file bytes were lost. Corrective reconstruction created a new object, not an unchanged one: original inode `225186808`, current inode `225751051`; original xattr names/values, BSD flags, ACL, and ctime remain unknown. A25 recovery review `3a1c454fb723070ef28692dddbfd1be32589f36d3ebc3a6c88a827467d1992a0` and manifest `e2cfb5ec88d7c5f712a692294eb6e7890a3a676c1e1da2c03b530c579cf5face` record `resumeAllowed=true`, `currentObjectIsReconstructed=true`, `metadataUnchanged=false`, `contentLoss=false`, `lifecycleCustody=retain`, and `liveAllowed=false`.
- Current `.tmp` is retained as a protected ignored hold: direct empty directory, mode `0755`, uid/gid `501/20`, zero files/entries/bytes, current inode `225751051`, mtime `2026-08-30T12:55:00+0800`, ctime `2026-08-30T14:50:38+0800`, flags `0`, no observed ACL, xattr name `com.apple.provenance` (payload not read), and no FD. It must remain `!! .tmp/`; no deletion, recreation, or writes are permitted.
- External owner packages remain exact and unchanged: A11 review `577e12040f9661e5f97c09c5b8889db27e29363016c3d6f2afe7b01ad953f482` / manifest `f756c1122b7faf45215fdf2bce6857a25dd273c663b408c928c3783c7ef4dc94`; A22 review `310e35005aee984c983a1d6814dc97446eedc26b9d24bd5ae0560e33ddce2a1d` / manifest `5adb89e549145e75d5019daf5a1db2f431be2f14ce48751ae94e7274bbb8dfe2`; A25 review `b645935d41d03af1987acdb6b25e43339187cd572d09ad05778232b5f8c760d5` / manifest `34ba4f554e49390f96186d94328f70cb08aafe77beff53e6222a1841bd64f080`. A11 full baseline delta remains `77` paths / `a71b62019bb590193e5c50ef5aa2e5e3dea0ea1da39d5ccec93faf837bb48d82`; A22 native clean/stable remains `false/false` with external final clean/stable `true/true`; A25 lifecycle custody remains retain with closeout/removal false.
- Candidate digest `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`, source commit `faf57280778c4b6543d15ce675638ac480b42864`, checker bundle `1465ea9dcf02b3a1a8d0b738a4715ea861a366c19711e476db15a354c66570ff`, and checker release `f2f01782c93548f0ad5287570cf0cdaa432101b5` remain unchanged. The baseline-only conclusion is candidate/source/checker unchanged; claim ceiling is `composition/source-test only` and `liveAllowed=false`.
- The branch was subsequently ordinary-pushed and has no PR. No PR #220/main mutation, Shadow, Receipt replay/verification, workflow dispatch, deploy, provider/production mutation, or remote deletion occurred. Shared `core.worktree` and test-identity contamination remain a configuration-remediation blocker; no shared config was changed.
