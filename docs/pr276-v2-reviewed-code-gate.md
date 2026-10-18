# PR276 append-only phone-font repair admission

The first PR276 admission remains immutable. Its real Linux run [39130914904](https://github.com/HUDongpin/MAIS-MVP/actions/runs/39130914904) passed 28 browser cases and failed three English phone photo/headline separation assertions. The raw browser report SHA-256 is `03a0850fcb44749a39887ae1e54c620ef4b84a0f12b059664bd50d0ebc5cdb4e`. This v2 admits a new exact repair after that recorded failure; it does not relabel the v1 local approval as Linux success.

## Source binding

- PR and main-push base B: `656ac319b2ad5812d31ad952cbb18430b5e58065`.
- Original source S1: `a05d123e75139eeb36e0ca3b564652880fa38545`.
- Published first-attempt E1 / repair parent: `5303de58d090b62967e45ec09d11fe331263f628`, tree `c908bfec08edf28d5e23c947c6892c28f4f8d072`.
- Repair S2: `9938db3f952d6715bca9fbe732da82a184f845df`, with sole parent E1; tree `677eb4bd7bd50febd15c75638d8465dbe1f3fe02`.
- E1-to-S2 source inventory digest: `06f8cce914143b162d190a2d86837d2ce0bb7d894801dd85b8cf9a6871486c1d`.
- Fresh S2 observation SHA-256: `bb0d964567026e41f29dfd8d747ae2c3f971900a2f32ac5a1ba0694f8c4d3766`. Its equality with the previous observation is a recomputed result, not reused authority.

S2 changes only `components/home/PedaNovaHomeHero.tsx`: below 640 px, the visible photo reserves one extra rem beneath it. At the observed 16 px root size this moves only the photo bottom up 16 px, accommodating an extra English line. Text/font/button placement and 640 px-and-wider layouts remain unchanged. The original selected PNG remains byte-identical to S1 (`d6948dc05110a84a859207727f1ae8642a9612321fb0021a34ae5a49f8bc9889`). The existing 31-case browser spec and every 7 px assertion remain unchanged.

## New exact T2/E2 chain

T2 is S2's direct child and changes exactly four tooling paths: this document, the new v2 checker and test, and an additive workflow change. E2 is T2's direct child and first-adds exactly seven files under `coordination/integration/reviewed-code/pr276-v2`: admission with the required `sourceParent` field, newly computed observation/check records, and genuine new A11/A23 report/decision pairs. New reviews bind actual S2/T2, inventories, observations and command output bytes; v1 reviews are not transferred.

The PR number remains 276 and its base remains B. The source parent is E1, not the PR base. The checker pins both identities, E1's tree, S1 ancestry, the original PNG, the sole repair path, direct S2/T2/E2 parents, exact trees and inventories, and full candidate-to-E2 tree equality. A present invalid v2 marker fails without fallback. V2 precedes v1 while preserving every v1 and older workflow step, checker, test and evidence path against E1. Unknown paths, altered old evidence, wrong source parent/base/PR, hidden or dirty source, forged reviews and expanded permissions are rejected.

## Mandatory execution

Run all five old/new contract suites. The current-head checker still executes nonincremental TypeScript and the unchanged 31-case real browser spec using a new isolated production build, one worker, zero retries, offline provider configuration and no skipped/flaky passes. The selected image, text, active layout layers, dark mode, keyboard and touch behavior, and page/console/network assertions remain required. The earlier local preparation React 418 observation remains retained and unexplained; no suppression or fix claim is introduced.

The full native checked-out byte/mode/index verification, newly observed current runtime/content policy and canonical audit, unchanged historical evaluator at its own baseline, and final verification remain mandatory. Local descriptor-relative checks can document a macOS absolute-path limitation, but do not replace native Linux CI. Linux must establish the repaired phone gap; an inferred 16 px improvement or local font emulation is not Linux acceptance.

All admission permissions except `ordinaryCodeEligible` remain false. The owner separately authorized merge and production deployment, which still require exact-SHA GitHub checks and the existing protected production workflow. This repair does not change provider configuration, curriculum content, historical acceptance, or the existing teacher-notice operational-health condition.
