# 2026-08-24 A10 — Machine-QA policy integration

- Status: `DONE / implementation-and-verification-complete`
- Lane: `A10` coordination and documentation
- Cross-lane documentation scope: owner-approved A16 research evidence, A18 content-QA policy, and A23 promotion gate
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-rsi-lite-calibration-f0-f2-20260823`
- Branch: `codex/a16-rsi-lite-calibration-f0-f2-20260823`
- Source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`

## Slice

This session integrates the accepted machine-QA documentation architecture without changing live app/data/API code, protected `.local/` evidence, raw candidate content, provider behavior, or the immutable registered experimental body.

Files in the assigned slice:

- `coordination/content-qa/rsi-lite-calibration-v2/FORMAL-CONCLUSION.md`
- `coordination/content-qa/rsi-lite-calibration-v2/README.md`
- `coordination/content-qa/rsi-lite-calibration-v2/NEXT-RUN-PROTOCOL.md` (top post-execution blockquote only)
- `coordination/content-qa/MAIS-MACHINE-QA-OPERATING-POLICY.md`
- `coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md`
- `coordination/integration/MACHINE-QA-PROMOTION-GATE.md`
- `AGENTS.md` (Daily Operational Gates item 5 only)
- this session log

The pre-existing v1/v2 packages and unrelated untracked coordination evidence remain owner work and were preserved.

## Evidence boundary captured

- Formal synthetic execution: 168 core plus 21 repeat successful calls; 192 attempts; three failed/lost attempts.
- Synthetic automatic evidence supports a provisional operating policy only.
- Natural-bank generalization is pending; production content is not accepted; live promotion is not authorized.
- The registration fixed `stream: false`, while the adapter and all 189 successful records used `stream: true` with thinking enabled and `reasoningEffort: high`; exact protocol adherence is not claimed.
- The baseline predates the untracked v2 implementation, so reproducibility is bound to the recorded code-manifest hash, not baseline alone.
- The B′ repeat supplement did not repeat an end-to-end critique → revision chain; no determinism claim is made.
- Successful-usage estimate, conservative enforcement-ledger debit, and authoritative provider invoice/balance are explicitly separate.
- Authorization and all 189 successful records bind provider `DeepSeek`, requested model `deepseek-v4-pro`, and exact observed model `deepseek-v4-pro`; requested/observed execution mode and the registered transport deviation remain explicit.
- No raw candidate content, credentials, private/provider reasoning, or named-person reviewer evidence was read into or reproduced in public documentation.

## Governance integration

- Deterministic checks precede B′ default review.
- Predefined high-risk, conflict, out-of-distribution, and precommitted stratified-random-audit cases escalate to C0′.
- B′ revision changes findings only; candidate remediation creates a new version/hash and restarts QA.
- C0′ aggregation is evidence, never majority-vote approval.
- Natural policy validation remains separate from exact-package promotion.
- A16, A18, A21, A24, A23, live-surface owners, A11, A22, A25, and owner decisions remain separate.

## Spec-review correction round

- Replaced the previously incomplete specificity presentation with the authoritative 2,340 reference-negative surfaces per arm: A′ `2339/2340`, B′ `2339/2340`, and C0′ `2340/2340`.
- Added the `2026-08-24` rate line items—`$0.003625/M` cache-hit input, `$0.435/M` cache-miss input, and `$0.87/M` output—which reproduce the `$4.622896699` successful-usage estimate. The source label is `DeepSeek official Models & Pricing page`; no captured rate-card artifact/hash exists, so the external snapshot is not independently hash-verifiable and is not an invoice/balance.
- Added provider/requested-model/exact-observed-model and requested/observed execution-mode traceability to the formal conclusion.
- Added the corresponding provider/model/execution-mode evidence row to the prospective A23 promotion gate.

## Final quality-review governance fix round

Exact files updated in this round:

- `AGENTS.md`
- `coordination/content-qa/MAIS-MACHINE-QA-OPERATING-POLICY.md`
- `coordination/content-qa/rsi-lite-calibration-v2/FORMAL-CONCLUSION.md`
- `coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md`
- `coordination/integration/MACHINE-QA-PROMOTION-GATE.md`
- `coordination/session-logs/2026-08-24-A10-machine-qa-policy-integration.md`

Governance fixes:

- Added the provider-agnostic rule that neither `AGENTS.md` nor the operating policy authorizes calls, credential access, external egress, or spend. Every live B′/C0′ execution now requires a fresh exact owner-authorization ID/hash binding privacy/rights, credential-access, egress, provider/model/role scope, and attempt/token/USD caps. Local credential-free deterministic checks remain outside that provider-authorization requirement.
- Split project-owner integration authorization from live-surface-lane authorization in both the promotion evidence and independent states. A joint receipt must preserve two issuer identities and two authorization results.
- Added explicit `a25ReleaseIntakeCurrent`, `liveSurfaceOwnerAuthorized`, and `rollbackReady` states and aligned the policy's minimum independent-state vocabulary.
- Assigned A22 the deployment/domain/SHA binding, A11 or an explicitly authorized live-verification lane the route/interaction/browser/runtime evidence, and the owner the production/public-claim authorization. A joint final receipt may link these but cannot substitute one for another.
- Added stable design/template IDs and versions plus immutable Git-blob-or-SHA bindings and prospective supersession rules to the natural-sample design and promotion template.
- Marked A25 as a cross-cutting currentness prerequisite before A23 integration intake and again before release planning in both the formal conclusion and operating policy.

## Verification

- `git diff --check`: passed.
- New-file whitespace check with `git diff --no-index --check /dev/null <file>`: passed for every new document and this log.
- `node --test coordination/content-qa/rsi-lite-calibration-v2/*.test.mjs`: 51 passed, 0 failed, 0 skipped.
- All five canonical paths linked by the v2 README exist.
- `NEXT-RUN-PROTOCOL.md` pre-edit SHA-256 was `7e9627f77fb994f6e742e33ed088abacab315b8a3e30d6cf557a9ecc3f9bf8f0`. Removing only post-edit lines 3-4 (the blockquote and its following blank line) reproduces that exact SHA-256, proving the registered body is byte-identical.
- Protected raw receipt byte hashes remained unchanged:
  - formal: `5932c4a929d074393223ff569748041406bed4bc1db9fc16eb1b967adffa4685`
  - scoring: `addad77a233a251d0b0038407eccf657b1d86705fb88a8087ccb1113fd8f08b8`
  - repeatability: `b3c630d348417fbe9ca889ef2ddf44814b38f83dadda442d33f4974dedf91c53`
  - core campaign: `9ed5d4de7a82cf46026d0e76b96bf5348a5d00ba41b0104d21dca3f7bbf498eb`
  - repeat campaign: `d1fdd2037508674b45a6d8de35e6dc52d0563af0119d3ca3df30b0179140df1d`
  - persistent ledger: `3236f340f9e95ed0021e9b7a79e9af2feb139d4c0dd2da0421222d11e178b97d`
- Independent read-only documentation review checked the requirement list, links, scope, deviation disclosures, and claim boundaries. Its initial findings were resolved, and the later specification review supplied the authoritative 2,340 reference-negative denominator now used in the formal table. AGENTS scopes evidence classes to machine-QA artifacts; the dated rate line items reproduce the post-run estimate and remain distinguished from the preregistration estimate and invoice/balance; and the promotion lifecycle decisions are explicitly distinguished from package-QA verdicts.
- Final Git review found no staged paths. `AGENTS.md` has only the Daily Operational Gates item 5 hunk; the seven assigned documentation paths are new or updated as listed above. Pre-existing unrelated untracked v1/v2 and coordination artifacts remain preserved.

### Post-spec-review verification rerun

- `git diff --check`: passed.
- `node --test coordination/content-qa/rsi-lite-calibration-v2/*.test.mjs`: 51 passed, 0 failed, 0 skipped.
- Five canonical linked-path existence check: passed.
- Protocol annotation-only proof: passed; normalized body SHA-256 remains `7e9627f77fb994f6e742e33ed088abacab315b8a3e30d6cf557a9ecc3f9bf8f0`.
- Successful-usage arithmetic from the three dated line items: reproduced `$4.622896699` exactly.
- All six protected raw receipt byte hashes: matched the expected unchanged values recorded above.
- Staged-state check: no staged paths.
- Targeted self-review of only the spec-review changes: `2339/2340` rounds to `99.9573%`, `2340/2340` is `100%`, the three rate subtotals sum to the recorded estimate, the model coverage is consistently `189/189`, and the promotion-gate traceability row requires both requested and observed values. No new claim-boundary or scope issue remains.

### Post-final-quality-review verification

- `git diff --check`: passed.
- New-file whitespace checks for the five new governance documents/log: passed.
- `node --test coordination/content-qa/rsi-lite-calibration-v2/*.test.mjs`: 51 passed, 0 failed, 0 skipped.
- Five canonical linked-path existence check: passed.
- Protocol annotation-only proof: passed; normalized registered-body SHA-256 remains `7e9627f77fb994f6e742e33ed088abacab315b8a3e30d6cf557a9ecc3f9bf8f0`.
- All six protected raw receipt byte hashes: matched the expected unchanged values recorded above.
- Staged-state check: no staged paths.
- Targeted governance self-review: confirmed the fresh live-provider authorization/stop rule and local-deterministic exemption; distinct project-owner and live-surface authorizations; the three added lifecycle states; distinct A22, A11/live-verification, and owner same-SHA responsibilities; immutable design/template version bindings and non-retroactive supersession; A25 ordering; and the single allowed `AGENTS.md` item 5 hunk. No unresolved review issue remains.

## Git and release boundary

No file was staged, committed, pushed, merged, deployed, or promoted. A later commit or integration is not authorized by this session. Because the worktree baseline and untracked v2 implementation must be reconciled with current repository state, a fresh-current-baseline A10/A25 integration review is required before any later commit or release intake.
