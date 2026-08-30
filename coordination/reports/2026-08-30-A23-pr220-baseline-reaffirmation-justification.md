# A23 PR #220 baseline re-affirmation justification

## Scope and exact target

- Owner / lane: `A23` Integration and Promotion.
- Branch: `chore/a23-pr220-promotion-composition-20260830`.
- Target commit: `d0394f016eb91c3b065d4751601be65a7186e5ac`.
- Target PR: `pending-review-only`; no composition PR exists.
- Creation and expected closeout: `2026-08-30 HKT`.
- Revision root (append-only): `coordination/integration/pilots/us-ca-math-rag-v2-g6-ratios-v2/attempt-007/reaffirmations/auth-private-no-store-20260827/reaffirmations/k-g5-cot-leak-20260827/reaffirmations/app-storage-schema-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-readiness-marker-20260827/reaffirmations/runtime-loader-policy-20260827/reaffirmations/legacy-compat-readiness-v2-20260827/reaffirmations/runtime-loader-policy-v2-20260827/reaffirmations/parent-instance-proof-inline-20260827/reaffirmations/production-schema-diagnostic-20260827/reaffirmations/production-schema-diagnostic-v2-tooling-20260827/reaffirmations/c0-i18n-content-legacy-byte-review-20260828/reaffirmations/session-privacy-ux-20260828/reaffirmations/pr220-strict-json-composition-20260830`.
- Required roles, in inherited order: `A21,A18,A23,A04,A05,A11,A22,A24,A25`.

## Source, owner evidence, and unchanged conclusion

The workflow-selected source Manifest is the `session-privacy-ux-20260828/promotion-manifest.v2.json` at the inherited source root. Its exact source facts are retained: target baseline `00929b2bdf88368dd838d7ff11bda13d3707e0e1`, candidate digest `c83c47392c79256ee47726dafe3c53b72e5e7454edcb313a421eb3b32066cbf6`, source commit `faf57280778c4b6543d15ce675638ac480b42864`, checker `promotion-gate-shadow-v2.6`, checker bundle `1465ea9dcf02b3a1a8d0b738a4715ea861a366c19711e476db15a354c66570ff`, and checker release `f2f01782c93548f0ad5287570cf0cdaa432101b5`.

The three external owner-review packages were revalidated as exact, independent records (not three independent reviewers):

| Lane | Review raw SHA-256 | Manifest raw SHA-256 | Result / boundary |
| --- | --- | --- | --- |
| A11 | `577e12040f9661e5f97c09c5b8889db27e29363016c3d6f2afe7b01ad953f482` | `f756c1122b7faf45215fdf2bce6857a25dd273c663b408c928c3783c7ef4dc94` | `pass`, target exact, `candidateUnrelatedBaseline=true`, `liveAllowed=false`; full baseline delta `77` paths / `a71b62019bb590193e5c50ef5aa2e5e3dea0ea1da39d5ccec93faf837bb48d82` |
| A22 | `310e35005aee984c983a1d6814dc97446eedc26b9d24bd5ae0560e33ddce2a1d` | `5adb89e549145e75d5019daf5a1db2f431be2f14ce48751ae94e7274bbb8dfe2` | `pass`, native source clean/stable `false/false`, external final clean/stable `true/true`, `liveAllowed=false` |
| A25 | `b645935d41d03af1987acdb6b25e43339187cd572d09ad05778232b5f8c760d5` | `34ba4f554e49390f96186d94328f70cb08aafe77beff53e6222a1841bd64f080` | `pass`, lifecycle custody `retain`, closeout/removal `false`, `liveAllowed=false` |

The recovery custody package was independently re-audited and remains bound:
review `3a1c454fb723070ef28692dddbfd1be32589f36d3ebc3a6c88a827467d1992a0`, README `446bdc0076aa42157473f47ce021a637e3c575368da6d2fd054b485fcd99b575`, manifest `e2cfb5ec88d7c5f712a692294eb6e7890a3a676c1e1da2c03b530c579cf5face`. It is a narrow resume pass with `resumeAllowed=true`, `liveAllowed=false`, `lifecycleCustody=retain`, `currentObjectIsReconstructed=true`, `metadataUnchanged=false`, and `contentLoss=false`.

The protected delta is therefore baseline-only and unrelated to candidate, source, or checker bytes. A11's full delta is `77` paths / digest `a71b62019bb590193e5c50ef5aa2e5e3dea0ea1da39d5ccec93faf837bb48d82`; candidate/source/checker facts remain unchanged. A22's native-attestation caveat is retained exactly: native source clean/stable was `false/false`, while its external final clean/stable evidence was `true/true`. A25's retain hold remains active; no closeout or removal is authorized.

## Recovery and protected `.tmp` custody

The pre-existing `.tmp` empty ignored container was mistakenly removed by `rmdir`; no file bytes were present or lost. Corrective reconstruction created a new object and must not be represented as unchanged metadata: original inode `225186808` versus current inode `225751051`; original xattr names/values, BSD flags, ACL, and ctime were unknown. The current protected object is an empty direct directory with mode `0755`, uid `501`, gid `20`, size `64`, links `2`, mtime `2026-08-30T12:55:00+0800`, ctime `2026-08-30T14:50:38+0800`, flags `0`, no observed ACL, current xattr name `com.apple.provenance` (payload not read), zero files/entries/bytes, and no open/write FD. It remains a retained protected ignored hold (`!! .tmp/`) and will not be deleted, recreated again, or written during this protocol. Post-recovery A25 evidence is the boundary for this fact, not proof of metadata identity.

## Git/config and authorization boundary

The shared repository config has a known `core.worktree` anomaly and also contains the contaminated test identity `Promotion Gate Test <promotion-gate-test@example.invalid>`. No shared config repair is authorized. Every Git command is explicitly bound to this physical worktree and dedicated gitdir; every A23 commit must use the historical branch identity `Dongpin HU (Peter) <47708816+HUDongpin@users.noreply.github.com>` through process-local environment overrides. Prior commits are not rewritten.

The composition branch was subsequently ordinary-pushed, has no PR, and did not mutate PR #220, `main`, or production. No Shadow, Receipt replay/verification, workflow dispatch, PR #220 update, main merge, deploy, provider/production mutation, or remote deletion is authorized or performed in this re-affirmation. Claim ceiling is `composition/source-test only`; `liveAllowed=false` remains mandatory.
