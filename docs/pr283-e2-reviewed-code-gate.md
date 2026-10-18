# PR #283 evidence E2

This commit binds the two independent reviews of source S `64e2fad979f2a936e8347843fe1952fc1cf059f2` and tooling T `f88aaaecfa74f5688df019ee4a7906108865cdc7`. It does not change S. It does not edit the PR #282/#281/#280 checker, and it does not change any older workflow step.

A11 (`independent-a11-pr283`) returned `approved-for-ordinary-code-required-check`. The report sha256 is `3780c79a12a24153eef8bb38bff7c1af10bab6718e5aa0a2e43939f9d67c6305`. The decision sha256 is `c6110aded13b6740d6412f0df80442d4fc5508425265297ddd166ed61815559e`.

A23 (`/root/a23_pr282_pr281_pr280_review`) returned `approved-for-later-ordinary-code-admission`. The report sha256 is `6d867c3b58e9bc6459af1261a62b68044f63b112e5f1993b8ba7125e7a019d2a`. The decision sha256 is `093cf6c450b93d4f2e2f30ebd112f1b6daad1c545fee9a12c1cb936a1e094671`. That verdict accepts S and T for this later admission. It does not set `ordinaryCodeEligible`. Merge, preview, deploy, and production database writes stay unauthorized.

The pending self-authored reports are replaced at the v1 paths by these exact bytes. The active marker is `coordination/integration/reviewed-code/pr283-e2/admission.json`. HEAD must equal this evidence commit. A present invalid marker does not fall through to the pending contract. Every permission stays false.
