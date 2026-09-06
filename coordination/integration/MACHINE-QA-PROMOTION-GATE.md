# Machine-QA Promotion Gate

- Document type: `prospective-reusable-A23-checklist-template`
- Template ID: `MAIS-MACHINE-QA-PROMOTION-GATE`
- Template version: `1.0.0`
- Canonical template path: `coordination/integration/MACHINE-QA-PROMOTION-GATE.md`
- Template status: `not-a-completed-promotion-receipt`
- Effective date: `2026-08-24`
- Gate owner: `A23`
- Document custodian: `A10`
- Content-QA prerequisite owner: `A18`
- Regression prerequisite owner: `A11`
- Release prerequisite owner: `A22`

## 1. Use and decision boundary

Copy this template for one exact candidate package/version. Every copied receipt must bind template ID `MAIS-MACHINE-QA-PROMOTION-GATE`, template version `1.0.0`, this canonical path, and the immutable Git blob ID or SHA-256 of the exact template text used. Do not mark this canonical template as completed. Historical promotion artifacts stay in their original package locations; this prospective gate does not relocate or rewrite them.

Machine QA is evidence only. Synthetic calibration validates a workflow under its recorded design; natural-sample evaluation may validate a policy for a registered population; neither substitutes for machine and owner evidence bound to the exact candidate package.

No gate state implies the next. In particular, A18 acceptance does not imply A23 readiness; A23 readiness does not authorize integration; integration does not prove regression or release readiness; a green build or `READY` deployment does not prove deployment on the intended domain or same-SHA live behavior.

## 2. Exact package identity

Complete every field before issuing a gate decision.

| Field | Required value |
| --- | --- |
| Gate template ID/version | `MAIS-MACHINE-QA-PROMOTION-GATE / 1.0.0` |
| Gate template canonical path | `coordination/integration/MACHINE-QA-PROMOTION-GATE.md` |
| Gate template immutable Git blob ID or SHA-256 | `<required>` |
| Gate receipt ID | `<required>` |
| Package ID | `<required>` |
| Candidate version | `<required>` |
| Frozen candidate/package SHA-256 | `<required>` |
| Frozen manifest and provenance SHA-256 | `<required>` |
| Source baseline and source commit | `<required>` |
| Exact candidate scope | `<required>` |
| Explicit held/excluded scope | `<required>` |
| Region/grade/curriculum/type/language | `<required>` |
| Candidate owner (normally A21) | `<required>` |
| A18 decision owner | `<required>` |
| A23 gate owner | `<required>` |
| Named live-surface owner | `<required before integration>` |
| Target files/routes/adapters | `<required before integration>` |
| Policy path/version | `<required>` |
| Protocol path/version | `<required>` |
| Executed code-manifest SHA-256 | `<required>` |
| Latest non-superseded evidence ID/hash | `<required>` |
| Rights/privacy/source-distance posture | `<required>` |
| Public-claim ceiling | `<required>` |

Any candidate text, answer, illustration, evidence, metadata, manifest, scope, or hash change creates a new candidate version and restarts the gate.

## 3. Evidence-record schema

Every evidence row below must record:

- `status`: `not-evaluated`, `missing`, `blocked`, `needs-repair`, `satisfied`, or `not-applicable-with-reason`;
- artifact path and SHA-256;
- issuer lane and issue time;
- exact candidate, package, code-manifest, or integrated-commit binding;
- currentness/supersession result; and
- limitations, deviations, waivers, and claim ceiling.

| Required evidence | Status | Artifact path / SHA-256 | Issuer / time | Exact binding | Limitations/currentness |
| --- | --- | --- | --- | --- | --- |
| Candidate identity, provenance, rights/privacy, and frozen-hash receipt | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Policy/protocol/version and code-manifest binding | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| A25 release-intake/currentness at integration intake and refreshed before release planning | `<not-evaluated>` | `<required>` | `A25 / <time(s)>` | `<exact slice/checkpoint>` | `<freshness/supersession>` |
| Provider, requested model, exact observed model(s), and requested/observed execution-mode traceability | `<not-evaluated>` | `<required>` | `<required>` | `<provider/model/mode record counts>` | `<drift/deviations/currentness>` |
| Deterministic baseline receipt | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| B′ critique and revised-finding receipts | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Escalation-trigger evaluation | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Precommitted stratified-random-audit registration | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Random-audit selection and outcomes | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| C0′ five-role evidence for every triggered/selected case | `<not-evaluated>` | `<required if triggered>` | `<required>` | `<required>` | `<required>` |
| Finding conflicts, invalid responses, missing evidence, and unresolved risks | `<not-evaluated>` | `<required>` | `<required>` | `<required>` | `<required>` |
| A18 exact-scope content-QA decision | `<not-evaluated>` | `<required>` | `A18 / <time>` | `<required>` | `<required>` |
| A24 exact-visual decision | `<not-evaluated>` | `<required if answer-critical visuals>` | `A24 / <time>` | `<required>` | `<required>` |
| A23 exact promoted/held-scope plan | `<not-evaluated>` | `<required>` | `A23 / <time>` | `<required>` | `<required>` |
| Project-owner integration authorization | `<not-evaluated>` | `<required>` | `Project owner / <time>` | `<exact paths/scope/SHA>` | `<limits/currentness>` |
| Live-surface-lane integration authorization | `<not-evaluated>` | `<required>` | `<named live-surface lane / time>` | `<exact paths/scope/SHA>` | `<limits/currentness>` |
| Integrated commit and exact promoted subset | `<not-evaluated>` | `<required after integration>` | `<live owner / time>` | `<commit/SHA>` | `<required>` |
| A11 integrated regression evidence | `<not-evaluated>` | `<required after integration>` | `A11 / <time>` | `<same commit/SHA>` | `<routes/interactions/errors>` |
| A22 clean-source release evidence | `<not-evaluated>` | `<required after integration>` | `A22 / <time>` | `<same commit/SHA>` | `<build/release blockers>` |
| Owner production and public-claim authorization | `<not-evaluated>` | `<required before production>` | `Owner / <time>` | `<exact scope/SHA>` | `<public claims>` |
| Rollback/downlist/disable plan | `<not-evaluated>` | `<required before production>` | `<owner / time>` | `<exact scope>` | `<trigger/owner/timing>` |
| A22 deployment/domain/SHA binding | `<not-evaluated>` | `<required after deploy>` | `A22 / <time>` | `<deployment + domain + SHA>` | `<alias/currentness>` |
| Same-SHA route/interaction/browser/runtime evidence | `<not-evaluated>` | `<required for live claim>` | `A11 or explicitly authorized live-verification lane / <time>` | `<domain + SHA>` | `<routes/interactions/browser/runtime/errors>` |

Project-owner integration authorization and live-surface-lane authorization are independent requirements. If one joint receipt records both, it must preserve two distinct issuer identities, two distinct authorization results, their exact scopes, and their timestamps; one issuer/result must not be inferred from the other.

## 4. Machine-QA package checks

The package cannot advance unless all applicable checks are evidenced:

- [ ] The package/version, candidate, manifest, provenance, code manifest, protocol, policy, deterministic rules, prompt/projection, taxonomy, and schema hashes are frozen.
- [ ] Deterministic checks ran first and their findings remain visible.
- [ ] B′ critique ran and the validated revision revised only the finding set, never the frozen candidate.
- [ ] All mandatory escalation triggers were evaluated before result-dependent selection could occur.
- [ ] The random-audit rate, absolute hard cap, strata, frame hash, selection commitment, replacement rule, and provider resource caps were registered before results.
- [ ] Every triggered or precommitted random-audit case has valid C0′ evidence from all five required roles, or the affected scope is blocked.
- [ ] C0′ aggregation was treated as evidence, not majority-vote approval.
- [ ] No unresolved P0 or P1 remains in the proposed promoted scope.
- [ ] The package-specific P2 threshold and disposition rule were registered before results and explicitly dispositioned by A18.
- [ ] Invalid/unknown taxonomy or schema output, conflicts, missing receipts, retries, failed/lost attempts, false positives, and exclusions are recorded.
- [ ] Any transport/configuration or protocol deviation is disclosed with a reduced claim ceiling.
- [ ] Protected receipts are hash-bound without publishing raw candidate content, credentials, private/provider reasoning, or personal reviewer identities.

If remediation changes candidate content, create a new version/hash and restart every check.

## 5. A18 and A24 decision checks

A18 must bind its decision to the exact proposed promoted subset and record:

- mathematics and answer-key correctness;
- curriculum, region, grade, age, language, and response-form fit;
- source-distance, copyright, licensing, provenance, and privacy posture;
- deterministic/B′/C0′ conflict dispositions;
- invalid, missing, and false-positive dispositions;
- open P0/P1 count and preregistered P2 threshold/disposition;
- exact accepted, held, blocked, and needs-repair scopes; and
- public-claim limits and any waiver's absent evidence/claim ceiling.

If an answer-critical diagram, overlay, graph, measurement, formula, unit, answer label, citation, or evidence surface exists, A24 exact-layer evidence is required. A18 remains the content-decision owner; A24 evidence does not independently approve the package.

## 6. A23 integration plan and live-surface ownership

A23 must record the exact promoted and held scope, integration order, target adapters/files/routes, live-surface owner, public wording, feature flag/downlist mechanism, rollback plan, and unresolved dependencies.

`approved-for-integration-review` is not implementation authorization. The project owner and named live-surface lane must separately authorize the exact paths and scope. A joint receipt is acceptable only when it records the two distinct issuers and results rather than collapsing them into one approval. Integration must produce a new exact commit/SHA binding without absorbing unrelated dirty-tree work.

A25 release-intake/currentness evidence is mandatory before A23 integration intake and must be refreshed again before release planning. An old dirty map, cached remote ref, open-PR ambiguity, dirty worktree, or superseded receipt cannot satisfy currentness.

## 7. A11, A22, production, and live proof

A11 regression evidence must bind the exact integrated commit and cover the named routes, data/receipt identity, key interactions, and clean console/page-error results where browser behavior matters.

A22 release evidence must come from a clean worktree, clean clone, or reviewed clean slice and must bind the same commit. A22 alone supplies the deployment/domain/SHA binding. Build success, deployment metadata, domain aliasing, deployment, and same-SHA live functional proof are separate states.

Before production, the project owner supplies production and public-claim authorization, and a rollback/downlist/disable plan must bind the exact scope and SHA. A11 or another explicitly authorized live-verification lane supplies the actual same-SHA route, interaction, browser, and runtime evidence. A final joint live receipt may link the A22 deployment binding, A11/live-verification evidence, and owner authorization, but none substitutes for either of the others. A `promoted-to-production` decision requires all three evidence classes on the intended surface; `READY`, a green build, or an alias alone is insufficient.

## 8. Independent state matrix

Record each state independently as `true`, `false`, or `not-evaluated`; none implies the next.

| State | Value | Receipt/path/hash |
| --- | --- | --- |
| `a18ContentAccepted` | `not-evaluated` | `<required>` |
| `a23PromotionPlanReady` | `not-evaluated` | `<required>` |
| `a25ReleaseIntakeCurrent` | `not-evaluated` | `<required at integration intake and refreshed before release planning>` |
| `projectOwnerIntegrationAuthorized` | `not-evaluated` | `<required>` |
| `liveSurfaceOwnerAuthorized` | `not-evaluated` | `<required>` |
| `integrated` | `not-evaluated` | `<required>` |
| `a11RegressionPassed` | `not-evaluated` | `<required>` |
| `a22ReleaseReady` | `not-evaluated` | `<required>` |
| `ownerProductionAuthorized` | `not-evaluated` | `<required>` |
| `rollbackReady` | `not-evaluated` | `<required>` |
| `deployed` | `not-evaluated` | `<required>` |
| `liveVerified` | `not-evaluated` | `<required>` |

## 9. Gate decision

Select exactly one value and bind it to an immutable gate receipt:

- `candidate-only`: frozen candidate evidence exists, but required decisions for integration review are not complete.
- `needs-repair`: candidate remediation is required; a new version/hash must restart QA.
- `blocked`: a mandatory requirement, unresolved high-risk finding, authorization, receipt, or currentness condition is absent or failed.
- `approved-for-integration-review`: A18 and A23 prerequisites are complete for an exact scope, but integration is not yet authorized or performed unless separately recorded.
- `integrated-hold-production`: exact authorized integration exists, but one or more regression, release, owner-production, deployment, rollback, or live-verification requirements remain incomplete.
- `promoted-to-production`: explicit owner production authorization, exact-scope deployment, rollback/downlist readiness, and same-SHA live functional evidence are complete.

These six values describe the broader A23-to-production lifecycle. They extend, but do not replace or contradict, the operating policy's four candidate-QA verdicts: the first four preserve those candidate-stage meanings, while `integrated-hold-production` and `promoted-to-production` require separately evidenced downstream states.

Decision: `<select one; this template itself has no decision>`

Rationale and unresolved risks: `<required>`

## 10. Natural-sample non-substitution rule

A current natural-sample evaluation may support A16 validation or revision of the policy. It never substitutes for deterministic, B′, escalation, random-audit, C0′, A18, A24, A23, live-owner, A25, A11, A22, owner-authorization, rollback, deployment, or same-SHA evidence for this exact package.

Likewise, an exact-package promotion receipt does not establish natural-bank generalization.

## 11. Currentness and immutable closeout

Before issuing or reusing a decision, prove that the gate binds the latest non-superseded policy, protocol, candidate, code manifest, content decision, integration state, and release-intake evidence. Every receipt must also bind this template's canonical path, template ID/version, and immutable Git blob ID or SHA-256. A later candidate mutation, finding disposition, integrated commit, deployment, or policy version requires a new receipt or an explicit immutable supersession record.

Later edits to this canonical template do not retroactively govern earlier receipts. A replacement template must increment the version and explicitly identify the superseded template ID/version and immutable content binding. Each earlier receipt remains governed by the exact template version and blob/SHA-256 it recorded unless a newly issued receipt explicitly adopts the successor.

Do not overwrite an earlier gate to make later actions appear simultaneous. Preserve each decision and record its successor.
