# A23 Runtime Policy Revision — Session Log

- Date: 2026-09-01
- Agent ID: A23
- Coordinated lanes: A10 tooling/reporting; independent A11, A22, and A25 review
- Workstream: append-only runtime-policy re-affirmation for the PR #220 semantic-rescope chain
- Repository: `/Volumes/Starship/MAIS的衍生文件/mais-a23-semantic-rescope-composition-20260831`
- Branch: `a23/semantic-rescope-on-pr220-composition-20260831`
- Preparation HEAD: `e170e6260f565abf1a2c576de3b3df388490c669`
- Preparation status: clean before this slice
- Authorization: local append-only policy evidence and binding/execution commits after independent review; ordinary non-force push and PR #220 fast-forward only after validate review passes
- Explicitly not authorized: workflow dispatch, manual Shadow, main merge, deploy, production or live writes

## Objective and invariant

Add a new runtime-policy revision without rewriting the workflow-selected PR220 Manifest (`3792e2e5...`), any prior Receipt, Closure, Registry, or historical evidence. Preserve candidate/source/checker bindings, `liveAllowed=false`, and absence of the future revision Receipt at the execution commit.

The sealed identities remain distinct:

- source baseline: `00929b2bdf88368dd838d7ff11bda13d3707e0e1`
- target baseline: `d0394f016eb91c3b065d4751601be65a7186e5ac`
- observer/preparation execution: `e170e6260f565abf1a2c576de3b3df388490c669`
- sealed exact-delta raw SHA-256: `ddecb0dc10674115ff723b5785f6f5d0f4a934e532049c2d687f174c5aa3423f`

The policy delta is exactly six fields: `edgeCount`, `edgeDigest`, `fsReadAllowlistDigest`, `nextDynamicCallsiteDigest`, `topologyEdgeCount`, and `topologyEdgeDigest`. It records one static graph/topology edge expansion, with no reachable-path, loader-capability, fs-read-capability, dynamic-target, nonliteral-import, or zero-baseline expansion.

## First candidate rejection

The initial five-file draft was frozen at content digest `f4da2305...` and independently rejected by A11/A22/A25. The shared blockers were:

- it incorrectly used observer commit `e170e626...` as the sealed delta target instead of `d0394f01...`;
- it did not contain or select a revised Manifest;
- its custom descriptor shape did not bind `revision.manifest` and was not the repository-native `promotion-reaffirmation.v2` contract;
- it had no evidence-first A11/A22/A25 commit.

That rejected draft was not staged, committed, pushed, selected by the workflow, or used for native validate or Shadow.

## Corrected review subject

The corrected subject contains four exact files:

- `coordination/integration/runtime-policy-revision.mjs`
- `coordination/integration/runtime-policy-revision.test.mjs`
- the new `runtime-policy-proposal.v1.json`
- the new, unselected `promotion-manifest.v2.json`

The subject is machine-described by `review-subject.v1.json`:

- review-subject raw SHA-256: `f4bad0390acbf7e2f8531187635e77f777d50612aa9793516a8e333f08b40076`
- deterministic stable path/mode/raw-SHA content digest: `998c2b633aee559b3d1cbfd82286bd77cafb18cb704cbfe64ec1203183388596`
- changed baseline paths: 77
- changed-path digest: `a71b62019bb590193e5c50ef5aa2e5e3dea0ea1da39d5ccec93faf837bb48d82`

The new Manifest is byte-identical in all non-policy fields to the prior PR220 Manifest and changes only the sealed six policy fields. It remains unselected until the later binding/execution commit.

## TDD evidence

Fresh RED after adding the revised-Manifest contract:

```text
node --test --test-concurrency=1 coordination/integration/runtime-policy-revision.test.mjs
tests 7; pass 6; fail 1
REVISION_DELTA_INVALID: changed-field ordering did not canonicalize to the sealed six-field order
```

After correcting the canonical changed-field projection:

```text
node --test --test-concurrency=1 coordination/integration/runtime-policy-revision.test.mjs
tests 7; pass 7; fail 0; skipped 0
```

The focused suite covers stale-policy fail-closed behavior, sealed source/target/observer identity separation, every changed policy field, every capability ceiling flag, execution-authorization rejection, exact six-field Manifest delta, and candidate/source/baseline/checker binding preservation.

The earlier session-reported RED and Unicode-path package-suite failures remain historical observations only; the independent A11 review did not present them as fresh evidence.

## Independent evidence-first reviews

All three reviewers independently bound the same corrected subject and returned PASS:

- A11 evidence raw SHA-256: `5e8944d32c128f9cfac35eade7e3da4c398645b87bd3607fa9518efe5696352d`
- A22 evidence raw SHA-256: `c9c864befee27dc763f2817d926232fcc456897e96a2e31c9a5ae19f434e0cb0`
- A25 evidence raw SHA-256: `081071ec8180902546a7232533769f4eaacc1901d34b4509f69a739cbf1d6bc7`

A22 additionally ran direct native runtime/legacy collect-only against the draft policy and observed:

- runtime policy digest: `43cd05fdb8cc9accb085cc0dcb83d047ea73659f4e21440b6755395245dea8b5`
- canonical audit digest: `e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91`
- resolution proofs digest: `9c2a5139966e2dbaa007adc083166e3eb231b8c6a7991551634e4c2c5186e092`
- selected candidate identity hits: 0

These reviews are policy evidence only. They do not prove full native validate, Shadow, Receipt comparison, Closure/Registry finalization, CI, PR update, merge, deployment, production, or live state.

## Commit protocol and safety boundary

The next two immutable phases are:

1. evidence commit: proposal, review subject, helper/tests, A11/A22/A25 review records, and this session log; the draft Manifest remains unselected;
2. binding/execution commit: add the exact reviewed Manifest, add a repository-native `promotion-reaffirmation.v2` descriptor binding the evidence commit, and update only the exact workflow/test selectors to the new revision root.

The future revision Receipt must remain absent from the binding/execution tree. No existing Manifest, Receipt, Closure, Registry, candidate, checker, or live surface may be overwritten.
