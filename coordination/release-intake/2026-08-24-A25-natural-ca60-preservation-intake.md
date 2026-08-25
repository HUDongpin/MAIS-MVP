# A25 MAIS-NATURAL-CA60-V1 preservation-first intake

- Agent ID: **A25**
- Status: **DONE_WITH_CONCERNS**
- Final state: `evidence_archive_candidate_pending_owner_git_authorization`
- Lifecycle state: `DURABLE_ARCHIVE_MANIFEST_VERIFIED_FINAL_REPORT_POST_COPY_ATTESTATION_REQUIRED_DELIVERY_SECRET_SCAN_AND_OWNER_GIT_AUTHORIZATION_PENDING`
- Report generated and finalized at: `2026-08-24T15:36:02Z`
- Worktree closeout blocked: **true**
- Cleanup authorized: **false**
- Durable archive and manifest copy verified before final report copy: **true**
- Final report/inventory post-copy status: `EXTERNAL_POST_COPY_ATTESTATION_REQUIRED`
- External attestation contract: `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-ATTESTATION.json`
- Creation date: 2026-08-24
- Expected closeout date: 2026-08-24
- Target PR: pending
- Artifact owner: A16
- Preservation/release-intake owner: A25

## Chronology and authorization boundary

The exact authorized A16 candidate scopes are preserved in a protected worktree archive and a second owner-only durable archive. The durable archive and manifest were byte-identity and SHA-256 verified before these final report bytes were copied.

This report intentionally does **not** claim that its own final copied bytes or the regenerated `DURABLE-INVENTORY.sha256` are post-copy verified. That non-self-referential result must be recorded only by the later external `DURABLE-ATTESTATION.json`, generated after the reports are finalized, copied, and inventoried.

A later PASS external attestation is evidence only. It does not authorize Git delivery, release, worktree cleanup, or source deletion.

No stage, commit, push, branch creation, merge, deletion, reset, stash, A16 source edit, integration-root tracked-file edit, provider call, or network call occurred.

## Open concerns

1. **Repository-delivery secret scan required.** The filename admission policy passed, but that result does not assess content. A bounded, redacted reviewer classification observed key-shaped strings in test fixtures. No real/live credential was established, but at least one fixture lacks an explicit not-real marker. No value is reproduced here.
2. **External post-copy attestation required.** The final report copies and regenerated durable inventory must be validated by `DURABLE-ATTESTATION.json` after these report bytes are frozen.
3. **Worktree closeout remains blocked.** An external attestation does not authorize cleanup. Immediate pre-closeout revalidation and owner authorization remain required.

## Exact release condition

Release eligibility requires: (1) a repository-delivery content secret scan with no unresolved finding; (2) a PASS external DURABLE-ATTESTATION.json generated after the final report copies and DURABLE-INVENTORY.sha256; (3) owner review of the A25 reports, durable inventory, and external attestation; (4) explicit owner authorization for the exact Git pathspecs and Git operations; and (5) immediate pre-closeout revalidation of source status, report candidates, both archives, both manifests, durable inventory, attestation, and lifecycle state. Neither these reports nor the preservation archives authorize release or cleanup.

## True pre-copy timestamps

| Observation | RFC 3339 UTC | Boundary |
| --- | --- | --- |
| Report generated and finalized | `2026-08-24T15:36:02Z` | Final report bytes; no post-copy result claimed here |
| A16 source verified | `2026-08-24T15:21:48Z` | Read-only source/status validation |
| Worktree archive verified | `2026-08-24T15:22:06Z` | Archive/manifest payload validation |
| Durable archive and manifest verified | `2026-08-24T15:24:34Z` | Pre-final-report-copy archive/manifest validation |

The external attestation timestamp is intentionally absent from this report because the attestation must be generated later.

## Locations

| Artifact | Relative locator | Absolute locator |
| --- | --- | --- |
| A25 worktree | `.worktrees/a25-natural-ca60-intake-20260824` relative to integration root | `/Volumes/Starship/MAIS-MVP/.worktrees/a25-natural-ca60-intake-20260824` |
| A16 source worktree | `.worktrees/a16-rsi-lite-calibration-f0-f2-20260823` relative to integration root | `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823` |
| JSON report candidate | `coordination/release-intake/2026-08-24-A25-natural-ca60-preservation-intake.json` relative to A25 worktree | `/Volumes/Starship/MAIS-MVP/.worktrees/a25-natural-ca60-intake-20260824/coordination/release-intake/2026-08-24-A25-natural-ca60-preservation-intake.json` |
| Markdown report candidate | `coordination/release-intake/2026-08-24-A25-natural-ca60-preservation-intake.md` relative to A25 worktree | `/Volumes/Starship/MAIS-MVP/.worktrees/a25-natural-ca60-intake-20260824/coordination/release-intake/2026-08-24-A25-natural-ca60-preservation-intake.md` |
| Worktree archive | `.local/a25-natural-ca60-intake-20260824/MAIS-NATURAL-CA60-V1-evidence-archive.tar` | `/Volumes/Starship/MAIS-MVP/.worktrees/a25-natural-ca60-intake-20260824/.local/a25-natural-ca60-intake-20260824/MAIS-NATURAL-CA60-V1-evidence-archive.tar` |
| Worktree manifest | `.local/a25-natural-ca60-intake-20260824/MANIFEST.sha256` | `/Volumes/Starship/MAIS-MVP/.worktrees/a25-natural-ca60-intake-20260824/.local/a25-natural-ca60-intake-20260824/MANIFEST.sha256` |
| Durable directory | `.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823` relative to integration root | `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823` |
| Durable inventory | `.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-INVENTORY.sha256` | `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-INVENTORY.sha256` |
| External attestation | `.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-ATTESTATION.json` | `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-ATTESTATION.json` |

The durable directory is an ignored, owner-only local handoff outside the disposable A25 worktree. It is not Git delivery.

## Baseline, live remote, and root distinction

- Controller-verified live `origin/main`: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- This A25 subtask performed no network call.
- A25 branch: `codex/a25-natural-ca60-intake-20260824`.
- A25 starting HEAD/baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- A16 branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`.
- A16 HEAD: `b6c7c347a49a813e454e707dd3c16399dcf29909`.
- Integration root: `/Volumes/Starship/MAIS-MVP`; it is distinct from both worktrees and had no tracked file edited by this subtask.
- The A16 candidates are untracked worktree content above the shared baseline.

## A16 source status

- Command: `git status --porcelain=v1 --untracked-files=all`
- Dirty entries: 126
- Modified entries: 1
- Untracked entries/files: 125
- Status-stream SHA-256: `d6db42a51fb3e9dbd0b6fdd4395b67c5cdde692e46b806fc88c9a8a18ed0e075`
- `AGENTS.md` is modified but remains outside the exact archive scope.

Full porcelain status:

```text
 M AGENTS.md
?? coordination/content-qa/MAIS-MACHINE-QA-OPERATING-POLICY.md
?? coordination/content-qa/rsi-lite-calibration-v1/README.md
?? coordination/content-qa/rsi-lite-calibration-v1/a18-blind-review-materials.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/a18-blind-review-materials.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/a18-owner-waiver.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/a18-owner-waiver.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/arm-contracts.md
?? coordination/content-qa/rsi-lite-calibration-v1/artifact-contract.md
?? coordination/content-qa/rsi-lite-calibration-v1/calibration-design.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/calibration-design.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f0-f2-verification-receipt.json
?? coordination/content-qa/rsi-lite-calibration-v1/f1-artifact-commit.json
?? coordination/content-qa/rsi-lite-calibration-v1/f1-generation-receipt.json
?? coordination/content-qa/rsi-lite-calibration-v1/f2-r-isolation-receipt-candidate.json
?? coordination/content-qa/rsi-lite-calibration-v1/f2-sacrificial-summary.json
?? coordination/content-qa/rsi-lite-calibration-v1/f2-snapshot-commit-manifest.json
?? coordination/content-qa/rsi-lite-calibration-v1/f3-authorization.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-campaign.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-campaign.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-execution-contract.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-execution-contract.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-formal-runner.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-formal-runner.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-persistent-budget-ledger.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-persistent-budget-ledger.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-provider-adapter.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-provider-adapter.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-provider-smoke.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-provider-smoke.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-resource-carryover.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-resource-carryover.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-role-projection-worker.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-score-results.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-score-results.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-start-preflight.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-start-preflight.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-v2-retry-bootstrap.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/f3-v2-retry-bootstrap.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/formal-preflight-cli.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/formal-preflight.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/formal-preflight.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-a18-blind-review-materials.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-a18-blind-review-materials.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-calibration-artifacts.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-calibration-artifacts.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-f3-entrypoint-receipt.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/generate-f3-final-authorization-pack.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/isolation-harness.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/isolation-harness.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/isolation-probe-worker.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/package-artifacts.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/package-artifacts.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/process-lifecycle.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/process-lifecycle.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/public-manifest.json
?? coordination/content-qa/rsi-lite-calibration-v1/refresh-sacrificial-snapshot.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/refresh-sacrificial-snapshot.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/A11-runner-receipt-candidate.md
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/A18-bundle-readiness-candidate.md
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/A18-human-evidence-owner-waiver.json
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/A22-isolation-evidence-candidate.md
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/a18-blind-review-registration-v2.json
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/a18-blind-review-registration.json
?? coordination/content-qa/rsi-lite-calibration-v1/review-gates/owner-budget-signature-template.md
?? coordination/content-qa/rsi-lite-calibration-v1/run-f3-formal-campaign.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-f3-formal-campaign.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-f3-provider-smoke.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-f3-rehearsal.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-isolation-proof.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-isolation-proof.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-sacrificial-dry-run.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/run-sacrificial-dry-run.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-bundle.json
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-receipts/A.json
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-receipts/B.json
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-receipts/C.json
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-receipts/C0.json
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-role-worker.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-runner.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/sacrificial-runner.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/score-f3-formal-results.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/seed-commitment.txt
?? coordination/content-qa/rsi-lite-calibration-v1/verify-f0-f2-local.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/verify-f0-f2.mjs
?? coordination/content-qa/rsi-lite-calibration-v1/verify-f0-f2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/FORMAL-CONCLUSION.md
?? coordination/content-qa/rsi-lite-calibration-v2/NEXT-RUN-PROTOCOL.md
?? coordination/content-qa/rsi-lite-calibration-v2/README.md
?? coordination/content-qa/rsi-lite-calibration-v2/V2-CANDIDATE-READINESS-RECEIPT.json
?? coordination/content-qa/rsi-lite-calibration-v2/call-record-contract.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/call-record-contract.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/candidate-set-builder.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/candidate-set-builder.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/credential-loader-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/credential-loader-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/deterministic-baseline.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/deterministic-baseline.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-authorization-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-authorization-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-campaign-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-campaign-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-dry-rehearsal-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-execution-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-execution-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-runner-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/formal-runner-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/protocol-design.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/protocol-design.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/provider-adapter-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/provider-adapter-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/role-contract.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/role-contract.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/run-formal-v2.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/run-formal-v2.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/scoring.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/scoring.test.mjs
?? coordination/content-qa/rsi-lite-calibration-v2/test-fixtures.mjs
?? coordination/integration/MACHINE-QA-PROMOTION-GATE.md
?? coordination/release-intake/2026-08-23-A25-rsi-lite-f0-f2-worktree-preflight-candidate.md
?? coordination/research/2026-08-23-A16-rsi-lite-f0-f2-status-and-handoff.md
?? coordination/research/2026-08-23-A16-rsi-lite-matched-quadruplets-f0-f2-protocol.md
?? coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md
?? coordination/session-logs/2026-08-23-A16-rsi-lite-calibration-f0-f2.md
?? coordination/session-logs/2026-08-24-A10-machine-qa-policy-integration.md
?? coordination/session-logs/2026-08-24-A16-rsi-lite-calibration-v2.md
```

## Exact candidate scopes and hashes

| Scope | Kind | Files | SHA-256 evidence |
| --- | --- | ---: | --- |
| `coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md` | file | 1 | `85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867` |
| `coordination/content-qa/MAIS-MACHINE-QA-OPERATING-POLICY.md` | file | 1 | `8432e9271594c951fae7b2933079351625efc8f16631f9c0665ab7240cbc903d` |
| `coordination/integration/MACHINE-QA-PROMOTION-GATE.md` | file | 1 | `f0205ed8ebf6eabd9fc9d3bfd01604ccc3374660d0367e1bb267a99f34532c4f` |
| `coordination/content-qa/rsi-lite-calibration-v2/**` | directory tree | 32 | deterministic scope-manifest SHA-256 `bbacd3951d57e8fe91c5d726cbd4434f3bb07a718db52a2cb6769f9fd79c11e1` |

Full candidate manifest:

```text
8432e9271594c951fae7b2933079351625efc8f16631f9c0665ab7240cbc903d  coordination/content-qa/MAIS-MACHINE-QA-OPERATING-POLICY.md
0f0f8f42a6bf04c6f7c483f7f34359ef67e6023e2b9d29af89acfcf758a60fe4  coordination/content-qa/rsi-lite-calibration-v2/FORMAL-CONCLUSION.md
975e82de6d490f3118985f9ff0af1cd928bfd9ba17aa878e1d9d81456e87ba64  coordination/content-qa/rsi-lite-calibration-v2/NEXT-RUN-PROTOCOL.md
ca7c7b2ec28d4526e61dd9afe3acc901aa5dd4d4706eecbf16f49e7710a08404  coordination/content-qa/rsi-lite-calibration-v2/README.md
63600181961d781d57a459d2fac2a6a476ca6bbb90d3dd536670394bb9c1ee02  coordination/content-qa/rsi-lite-calibration-v2/V2-CANDIDATE-READINESS-RECEIPT.json
7e192489b3ce4406c79477324a032d59c54831d1190da0068f11a121017e4221  coordination/content-qa/rsi-lite-calibration-v2/call-record-contract.mjs
b53cccde5be65c2b99e6633d0e8d7cee2227eda65a38832b86c531de5f1bbff9  coordination/content-qa/rsi-lite-calibration-v2/call-record-contract.test.mjs
95ca3be75693a949a01e612596941f2f8bb1793dcb4dd8865afb5f545ce8bf3c  coordination/content-qa/rsi-lite-calibration-v2/candidate-set-builder.mjs
0203b772602516b5f4462a63a5052e6f7acaa5987a07da902dad5c64e0ff8c1f  coordination/content-qa/rsi-lite-calibration-v2/candidate-set-builder.test.mjs
cc7b3cc387b06c34713047052eace4cd59e03a027e62a884315c57186ca49638  coordination/content-qa/rsi-lite-calibration-v2/credential-loader-v2.mjs
22df7461c062a3810b4eba21ec68086612d73edfde5b342276cbe0826c4d8c11  coordination/content-qa/rsi-lite-calibration-v2/credential-loader-v2.test.mjs
47a4f98546caafe3b822e3bfe7709839bcb0ff650f3cfd2e8860884e59d9969b  coordination/content-qa/rsi-lite-calibration-v2/deterministic-baseline.mjs
35343ed23e70e5d0e0fbc96e0f51d30d42e4452ae890bc5a430fc3b941e4cc7c  coordination/content-qa/rsi-lite-calibration-v2/deterministic-baseline.test.mjs
6e3fe5954a5c1f86b65e8645d56717cc9210dc3793b05f5f5dee067ef5cbfddc  coordination/content-qa/rsi-lite-calibration-v2/formal-authorization-v2.mjs
51f0feead09494d058de01748a394f4753a428d92ee7c5cc3075ac515f7ba770  coordination/content-qa/rsi-lite-calibration-v2/formal-authorization-v2.test.mjs
d4c58e865e6f61ee2a21f95d8761395ee7b2b1abf95be42ec11511e3277655f5  coordination/content-qa/rsi-lite-calibration-v2/formal-campaign-v2.mjs
ba71418133671550d07c572faf2ecd33cc10eb9aef91eb00e759ae7b00b2a583  coordination/content-qa/rsi-lite-calibration-v2/formal-campaign-v2.test.mjs
42d87397cbd1371929e4015c06c05c01a6183cd7240f2d3736c34b3552cb1b31  coordination/content-qa/rsi-lite-calibration-v2/formal-dry-rehearsal-v2.test.mjs
dc5aebd7875bc2348c1999a7453b34a86be04b975d559de637fe9850a94238bb  coordination/content-qa/rsi-lite-calibration-v2/formal-execution-v2.mjs
988ca30ab31804a70287877431a15620564e4d980e8a40e842e556aa5b8f1b77  coordination/content-qa/rsi-lite-calibration-v2/formal-execution-v2.test.mjs
12fff36def89b32ff711f790f49c5d2334e919f6ff98d1f3c5297d9c172e05d6  coordination/content-qa/rsi-lite-calibration-v2/formal-runner-v2.mjs
d7d4ce64ff1453204f6675125bec0b5cd9f3542e7478568e40da1b2849bebc89  coordination/content-qa/rsi-lite-calibration-v2/formal-runner-v2.test.mjs
add975e5d8ca12644c2eeab795c9d39652a0d277185a6fef76c0129d8e180cb3  coordination/content-qa/rsi-lite-calibration-v2/protocol-design.mjs
44b04516922ae3a8a6e20fc96199ab0fc7ed1eec744f28468f5a0bcaaa913cb7  coordination/content-qa/rsi-lite-calibration-v2/protocol-design.test.mjs
904ed995c10a4ff051fc95d487b9d611049fb41fb1dd1870d6d924b3dd449989  coordination/content-qa/rsi-lite-calibration-v2/provider-adapter-v2.mjs
1811f20a581594641908f17210872b2a207ca129bed8e1388f25cdcddc46452d  coordination/content-qa/rsi-lite-calibration-v2/provider-adapter-v2.test.mjs
ff6ceac7b3badd91155ba98eec8028133532ccf6b64ffeb503b70c42e3b1e164  coordination/content-qa/rsi-lite-calibration-v2/role-contract.mjs
6ce7b18ee95b226efc88cd78416f94b35764a55806a3fa0753524b3d9d7780bd  coordination/content-qa/rsi-lite-calibration-v2/role-contract.test.mjs
c2ccfdb9212484fdc5dd470ac39814aaeaeb0e5f3b35e366438816275cbfde4c  coordination/content-qa/rsi-lite-calibration-v2/run-formal-v2.mjs
20450044dd940bc48bb2e8585f4e758f4622dd5eb0df975e2084e8192ef77f0a  coordination/content-qa/rsi-lite-calibration-v2/run-formal-v2.test.mjs
3f1413d225be6d41fda12d81699200e678c8e051b099a2c9bfb66571ddd01ca4  coordination/content-qa/rsi-lite-calibration-v2/scoring.mjs
eb4734da9a149789045bbba2616a09e4dd6d5bfcf6c836e772c3abbae96f3da8  coordination/content-qa/rsi-lite-calibration-v2/scoring.test.mjs
3e4dd8098a6198fe8b4b02e440b8a362e5181d07adb63bc8f06b73a30ac1a690  coordination/content-qa/rsi-lite-calibration-v2/test-fixtures.mjs
f0205ed8ebf6eabd9fc9d3bfd01604ccc3374660d0367e1bb267a99f34532c4f  coordination/integration/MACHINE-QA-PROMOTION-GATE.md
85bc51cec9e160c1a23e94e671c85d2de4b52e8b2b8e9afcbcf04b7b19528867  coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md
```

## Secret semantics

- `filename_policy_status`: **PASS**, limited to filename/path admission.
- A filename-policy PASS is not content clearance.
- `content_secret_assessment_status`: `COMPLETED_FIXTURES_ONLY_NO_LIVE_SECRET_ESTABLISHED`.
- Reviewer observation: key-shaped strings exist in test fixtures.
- No real/live credential was established.
- At least one fixture lacks an explicit not-real marker.
- No matching value is reproduced in this report.
- `delivery_secret_scan_required`: **true**
- Delivery disposition: `BLOCKED_PENDING_REPOSITORY_DELIVERY_SECRET_SCAN`

## Verified archive facts

- Worktree recovery directory mode: `0700`
- Worktree archive/manifest modes: `0600`
- Archive SHA-256: `2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71`
- Manifest SHA-256: `79f2a04ce1e66b143b03af0c13f9da73bf0fc2b98bebf2414c59188a893584f6`
- Durable archive/manifest modes: `0600`
- Durable archive/manifest byte identity against the worktree copies: PASS at `2026-08-24T15:24:34Z`
- Archive membership: exactly 35 candidate files plus embedded `MANIFEST.sha256`
- Source files were not modified or deleted

## Structured verification observations

| Observation | Status | Expected | Observed | Hash/contract |
| --- | --- | --- | --- | --- |
| A16 source status | PASS | 126 dirty; 1 modified; 125 untracked | 126 dirty; 1 modified; 125 untracked; no A25 source edit | SHA-256 `d6db42a51fb3e9dbd0b6fdd4395b67c5cdde692e46b806fc88c9a8a18ed0e075` |
| Worktree archive payloads | PASS | 35/35 hashes | 35/35 hashes | SHA-256 `2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71` |
| Embedded manifest identity | PASS | byte-identical | byte-identical | SHA-256 `79f2a04ce1e66b143b03af0c13f9da73bf0fc2b98bebf2414c59188a893584f6` |
| Exact archive members | PASS | 35 candidates + 1 manifest | 36 regular files | Manifest SHA-256 `79f2a04ce1e66b143b03af0c13f9da73bf0fc2b98bebf2414c59188a893584f6` |
| Durable archive copy | PASS | mode 0600 and archive hash | mode 0600, same hash, byte-identical before report copy | SHA-256 `2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71` |
| Durable manifest copy | PASS | mode 0600 and manifest hash | mode 0600, same hash, byte-identical before report copy | SHA-256 `79f2a04ce1e66b143b03af0c13f9da73bf0fc2b98bebf2414c59188a893584f6` |
| Filename admission | PASS | 0 secret-store names | 0; no content clearance claimed | Candidate-path manifest |
| Content-secret delivery readiness | CONCERN | delivery scan required | key-shaped fixture semantics; missing explicit not-real marker; no live secret established | No value hash recorded |
| Final report copies and inventory | EXTERNAL_POST_COPY_ATTESTATION_REQUIRED | 2 final reports, regenerated 4-entry inventory, byte identity, modes, covered mtimes | Not verified within this report by design | `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-ATTESTATION.json` |

## External post-copy attestation contract

After these report bytes are finalized and copied, the A25 process must regenerate `DURABLE-INVENTORY.sha256` and then create `/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/DURABLE-ATTESTATION.json` last.

The attestation must record:

- A PASS status and RFC 3339 UTC timestamp after every covered file mtime.
- Exact SHA-256 values and byte-identity results for the archive, manifest, final JSON, final Markdown, and durable inventory.
- Archive member counts, inventory entry counts, directory/file modes, and covered-file counts.
- Confirmation that the inventory validates 4/4 entries.
- Confirmation that no covered file changed after validation.
- The report and inventory paths.
- No secret values.

The attestation need not hash itself. These report bytes must not be changed or recopied after the attestation is generated.

## Safe restoration recipe

Use the durable archive only after the external attestation passes. Restore to a newly created empty destination outside the integration root and every registered worktree. Never extract over live source.

```zsh
archive_file="/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/MAIS-NATURAL-CA60-V1-evidence-archive.tar"
manifest_file="/Volumes/Starship/MAIS-MVP/.local/evidence-archives/mais-natural-ca60-v1/a16-rsi-lite-20260823/MANIFEST.sha256"
expected_archive_sha="2656f336387ed85c495a6b08b96fdf1e34f1942f0e1b3f83421fdab7f7dd0c71"

printf '%s  %s\n' "$expected_archive_sha" "$archive_file" | shasum -a 256 -c -

diff -u \
  <({ awk '{print $2}' "$manifest_file"; printf '%s\n' MANIFEST.sha256; } | LC_ALL=C sort) \
  <(tar -tf "$archive_file" | sed '/\/$/d' | LC_ALL=C sort)

restore_parent="/owner-selected/path-outside-live-repositories"
restore_dir=$(mktemp -d "$restore_parent/mais-natural-ca60-v1-restore.XXXXXX")
test -z "$(find "$restore_dir" -mindepth 1 -print -quit)"
COPYFILE_DISABLE=1 tar -xf "$archive_file" -C "$restore_dir"
(cd "$restore_dir" && shasum -a 256 -c MANIFEST.sha256)
```

Abort on any hash, member-set, existence, emptiness, or destination-boundary mismatch.

## Explicit action accounting

| Action/state | Value |
| --- | --- |
| `a25_subtask_created_branch` | false |
| `a16_source_worktree_edited` | false |
| `a25_report_files_created` | true |
| `a25_local_archive_created` | true |
| `integration_root_tracked_files_edited` | false |
| `durable_ignored_copy_created` | true |
| `final_report_copy_verification_claimed_inside_report` | false |
| staged / committed / pushed / merged | false / false / false / false |
| deleted / reset / stashed | false / false / false |
| provider called / network called | false / false |

## Lifecycle and self-review

- Current lifecycle state: `DURABLE_ARCHIVE_MANIFEST_VERIFIED_FINAL_REPORT_POST_COPY_ATTESTATION_REQUIRED_DELIVERY_SECRET_SCAN_AND_OWNER_GIT_AUTHORIZATION_PENDING`.
- Worktree closeout is blocked.
- Cleanup is not authorized.
- Source and archive validations recorded before report finalization: PASS.
- Filename/content-secret semantics are separated: PASS.
- External non-self-referential post-copy attestation contract is explicit: PASS.
- Final report/inventory post-copy status within this report: `EXTERNAL_POST_COPY_ATTESTATION_REQUIRED`.
- Repository-delivery secret scan remains required.
- Final status: **DONE_WITH_CONCERNS**.
