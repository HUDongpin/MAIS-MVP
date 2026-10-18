# A23 review of committed PR201 non-live candidate source

Reviewer: /root/pr201_minimal_gate_review
Reviewed at: 2026-10-18T12:52:41Z
Result: approved-for-nonlive-candidate-admission

This review approves the exact committed source for the dedicated non-live
admission process. It permits attaching this A23 evidence and running the new
required check. It does not establish that GitHub CI or native Shadow has passed,
and grants no merge, deployment, live-access or whole-pack acceptance.

## Independently verified source

- Source S: 2288c5efff2469108d61f84e7598246f0b9fe19d.
- Sole parent: 656ac319b2ad5812d31ad952cbb18430b5e58065.
- Source tree: db8b41ba09a2a33d4148496418be480b41b9906a.
- Source inventory digest: 86401681cc60d04fee55029f67196367b54afae737c3e129a73d70b790e4c878.
- Working-source digest: c5ff21480db96707f450286b59c231ebe9747531970b3520a1fe8d63ee1ccc35.
- Plan SHA-256: 4d17dc2824446dc8c000960ef5778ffd0e9b030eea409011df6bebf4405d1049.

The actual S delta contains exactly the 21 planned paths: 20 additions and the
additive Promotion workflow edit. Every resulting file has mode 100644. The
path inventory and all content hashes match the reviewed plan. The checkout
was clean before and after this review.

Read-only local inspection passed independently. It verified the exact
228-row candidate, original A18 evidence and row hashes, the 228/1272 mask,
unchanged original 1500-row bank and q014=38000. No runtime loader, topic,
catalog, type or historical contract change is included.

## Admission and execution boundaries

The dedicated selector fails closed when the real admission is absent or
invalid. Formal preflight binds real S/E ancestry, the closed path inventory,
independent A11/A23 records, the actual GitHub base/head/PR event and the exact
evidence tree. Local inspection cannot substitute for current CI proof.

The first-pass observation-context defect was repaired before S. The new
checker uses a candidate-specific observation and preserves all historical
observations. An independent, fresh, read-only observePreparation call followed
by assertObservation passed: covered files increased from 3886 to 3887; all
other runtime-policy fields and the canonical audit matched the fixed baseline.

- Runtime policy digest: 7e90b694e2bd7a20309cda02db1631ab20c8cfe4cb771a30d92ef3b325f3d671.
- Canonical audit digest: e340d3f2cc3ae20e4e5a7ffaef12b642a2e3811138fd161714d8bb7a837abc91.

The checker requires fresh contract, grading, isolation and type checks before
creating current proof. Finalization revalidates current proof and observation,
then separately verifies native historical evidence at its own fixed baseline.
Historical success alone cannot admit this candidate.

## Verification evidence and limits

The reviewer checked the retained raw-log hashes against the local verification
record. They matched for 17/17 new-contract tests, 55/55 prior-contract tests,
2/2 grading tests including 1281 matcher cases, 3/3 isolation/q018/q014 tests,
and the type-check log. These suites were executed by the coordinator; the
reviewer independently reran local inspection and the narrow current observation.

An additional attempt to run the complete observeCurrent wrapper locally stopped
at unchanged assertMaterializedTree code with macOS ENAMETOOLONG on a deeply
nested historical g07 evidence path. The narrower observation passed, but this
is not a complete local-checker pass. Actual GitHub runner execution remains
required; the historical materialization guard was not removed or weakened.

No remaining concrete source-review blocker was found. The real E evidence
commit, actual PR-bound preflight, fresh GitHub required checks and native Shadow
outcome remain to be verified. This decision must not be represented as an
already successful CI result or authorization to merge or deploy.
