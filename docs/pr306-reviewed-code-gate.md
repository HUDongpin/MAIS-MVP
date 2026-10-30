# Exact PR306 regional provider policy admission

The owner assigned commit, push, PR creation and related CI corrections for the regional AI company policy, excluding merge, deployment and real environment changes. The inherited Promotion selector rejects the new source with `PR305_EVIDENCE_TREE`; PR305's evidence cannot authorize a different tree.

This ordinary-code admission follows the existing source/tooling/evidence partition. It produces only a bounded required-check result and does not revalidate historical native promotion or grant deployment authority. All six permission flags remain false.

## Source and custody

- Owner: /root; A07/A12 source, A10/A22 CI tooling, independent A11/A23 review.
- Branch: `codex/provider-company-policy-20261030`; PR: [#306](https://github.com/HUDongpin/MAIS-MVP/pull/306).
- Created 2026-10-30 Asia/Taipei; expected closeout 2026-10-30 PR handoff after checks. Retain the open-PR branch/worktree.
- Base B: `4532f5a3e2d8c91ad387e3875925fba8a5091b86`.
- Source S: `dd0c4a51d7e6cd23d734da3f7f8e292d7e426042`; source tree: `ff3dd1ea83b47cc61bdb79bdaa1b43be3c7d7db5`.
- Exact source history: B → `037499f8102570602d4ef2610c55b6da4b245e63` → `465196f63df4766404fd35e0cd447fcd8193a211` → S. The two follow-up commits preserve the new nullable region field in joined-auth and parent-safe bootstrap assertions while retaining the existing privacy checks.
- B-to-S contains exactly 57 reviewed source/test/document files. Inventory digest: `d1785da97c30aeed268bdef4d08b6e89fcd5566d3c5e7f0008af021a4c08af56`.
- Clean-S source check bytes: `3caf16cdb3f5d9e15b21d51254c67b84f618adc7b1d16806930fd437bc615591`. Raw stdout/stderr are retained locally for independent verification.

## Tooling and evidence phases

Initial tooling T1 (`6bf3c1d444c56be7fbb14fc7ee1e89521578f43c`, tree `4563be973471ccd14660793f02b83200103b06af`, S→T1 inventory `108c6d4d9c8a6e4b866febdcb1f2628318bd04be8f23f67144da0e8ab8b73d16`) is preserved as a direct child of S. Its four paths are this document, `scripts/promotion-reviewed-code-pr306.mjs`, its test, and `.github/workflows/promotion-shadow.yml`.

Final tooling T is a direct child of that exact T1. Its aggregate S→T partition contains those four paths plus `tests/e2e/reported-bug-source-regressions.test.ts` and `components/visualizations/signature/audit-teennumbers.mjs`. The voice assertion requires both regional permission and a configured key for external moderation, preserving local safety alerts before either refusal. The Teen Numbers audit permits exactly React and the two first-party regional speech helpers, checks their use, and preserves all numerical/layout assertions and the 46,855-check count. Runtime source S is unchanged. The checker pins T1's tree/inventory and its exact parent, then requires the complete six-path final tooling inventory; arbitrary descendants or extra paths remain invalid. T1's independent reports stay historical and cannot approve T.

The workflow adds only a selector, an accepted mode, and conditional check/upload steps. Removing those additions reconstructs S's workflow byte-for-byte. The PR305 checker, admission/reviews, native PR304 evidence, and historical failure records remain unchanged.

Independent A11 `/root/pr306_gate_a11` and A23 `/root/pr306_gate_a23` review actual immutable T. They author their own decision/report, binding the real source/tree/inventory, T/tree/inventory, checks digest and report bytes. E directly follows reviewed T and first-adds exactly seven records under `coordination/integration/reviewed-code/pr306-v1/`. Future T/E hashes are not predeclared. Synthetic fixtures test rejection behavior and never substitute for actual review evidence.

The checker accepts only same-repository PR306 with exact B/E, or the exact ordered same-tree main merge if separately authorized later. It rejects changed/forked events, source/tooling/evidence drift, aliases, duplicate/unknown JSON fields, stale or shared review identities, permission widening, empty descendants, altered workflow controls and hidden index state.

## Validation and boundaries

The unchanged clean-S evidence binds strict TypeScript; 49 provider/speech/proof tests; 169 authentication-admission tests; 7 parent-safe boundary tests; and the unchanged 17 historical activation contract tests. Fresh execution reruns those commands plus the final-tooling source-regression suite (26 tests), Teen Numbers audit (46,855 checks), and 45 admission contracts. Tooling checks are separate commands, never presented as evidence executed on S before their corrections. Expected source/tooling test counts and names are bound; failures, skips, cancellations and TODOs fail. The numeric audit requires its exact zero-failure stdout, empty stderr and a successful exit; type output must be empty. Admission contracts are also bound by reviewed tooling bytes. Their bounded 600-second budget accommodates the measured 222-second local run; type-check is bounded to 300 seconds and each remaining suite to 180 seconds, with a 20-minute workflow step limit.

Children receive an allowlisted offline environment. Each command has a bounded timeout and its stdout/stderr hashes are preserved in a fresh private runner-temp directory. Full tracked-tree materialization and currentness are checked before and after execution. Local filesystem limitations cannot waive the final Ubuntu checks.

This decision proves ordinary-code CI admission only. It is not content approval, a native Shadow receipt/currentness result, whole-pack acceptance, provider configuration acceptance, actual OpenRouter behavior, a merge decision, or deployment. Real final-head CI remains necessary for review handoff.
