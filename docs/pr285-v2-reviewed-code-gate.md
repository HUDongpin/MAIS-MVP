# PR285 v2 admission after PR287

This exact non-live contract updates draft PR285 onto main `00114a71813b589990e95a2ca44745c2650fa499`. It does not change the frozen PR285 v1 or PR287 checker/evidence.

The source sync `6efe84b8ea6cf119a288b561e441c5c3a3560a8e` retains ordered parents old PR285 head `2354960b2d00685cdea7c253c6d4bd0c9f0e48d1` and current main. Its exact 13-path delta preserves the original two-file repair and previous evidence. Only the Promotion workflow needed conflict resolution; both complete historical step sequences remain intact.

A new tooling commit is the source sync's direct child. It changes only the v2 checker, tests, this document and the workflow. Independent A11/A23 reviews bind that actual tooling commit and source inventory. A direct evidence child adds exactly eight first-added records under `coordination/integration/reviewed-code/pr285-v2/`. No historical approval is rewritten or transferred.

The PR event must be PR285 with the fixed main base and exact evidence head. A future main push may use only the ordered merge parents `[base, evidence]` and identical evidence tree. Actual Git ancestry, parents, modes, hashes, clean complete materialization and independent review bytes are checked. An invalid v2 marker fails closed without using another mode.

Current execution preserves the original five commands: 25 repair tests, 5 seed tests, 9 funnel tests, 59 activity tests, and type checking. It also runs all four PR287 groups on the new tree: admission 22, build 33, adjacent build/cleanup 38, and the existing explicitly scoped governance test 1. Full TAP title/count/plan/diagnostic validation rejects incomplete, filtered, skipped, forged or hidden results. The governance name filter is the existing one-test scope, not a full governance-suite claim.

Historical proofs are separate from current acceptance. The unchanged v1 checker executes at old PR285 head with its original PR event. The unchanged PR287 checker executes at exact main with its original push event. Both check, finalize and verify their native proofs; PR287 additionally verifies the original PR283 E2 checkout. A freshly executed shared native baseline at `03717842b19e8b8fa9a3a2dbecf1b359bb842233` and execution `ff709c0141ef8660604a20340b1c476bf2941f60` is reverified by the unchanged consumers. Final v2 decisions bind both historical decisions and reverify them through their own frozen CLIs.

The original 1500-question package, q014 answer `38000`, closed G6–G12 question/topic loaders, 228 non-live candidate and prior evidence stay unchanged. Every permission remains false. A passing check is not merge, deployment, live content, whole-pack approval or cleanup authorization.
