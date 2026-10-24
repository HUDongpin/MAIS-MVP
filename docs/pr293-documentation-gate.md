# Exact PR293 documentation admission

PR293 preserves twenty historical reports, adds two archive indexes and fixes
five owner-routing gaps in two configuration files. Its source merge is
dfe90dbcfee1d6dd4a827d40a31af206604a0c90, with ordered parents the original
documentation head 3e554af94e14cefd689fb3a34e8c16046add2d95 and reviewed main
b69384c4036fe347275b363768cd497c50c131b5. The original documentation commits
remain intact. The exact 24-file inventory and source tree are pinned in the
checker. All other baseline blobs, including runtime, content, prior checkers
and frozen evidence, are unchanged.

A direct tooling child contains only this document, the new checker, its tests
and an exact additive workflow insertion. A direct evidence child contains
seven new records: source inventory, current local checks, independent A11/A23
decisions and reports, and admission. Reviews bind the actual tooling commit,
inventory and checks. None of the historical decisions is rewritten.

The selector accepts only PR293 from this repository, the fixed main base and
the exact evidence head. The post-merge check accepts only a merge with ordered
parents [base, evidence] and the identical evidence tree. Another PR, later
descendant, changed baseline, changed document, extra file, altered historical
workflow step, mismatched review, unsafe file mode or hidden worktree change
fails closed. There is no generic documentation bypass.

Current verification checks complete materialization, runs all 22 new positive
and negative contract tests, the three relevant owner-routing regressions and
the native owner package gate. The GitHub validate check remains required.
The checker writes a bounded documentation decision, not a Promotion Shadow
Receipt. It neither revalidates nor transfers historical content approval.
Deployment, preview, live content, whole-pack acceptance and historical
authority transfer all remain false. Source-file cleanup is governed by the
owner's separate exact-path assignment.
