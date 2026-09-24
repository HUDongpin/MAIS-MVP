# Release Bindings, Outcomes, And Reporting

Read the binding section for content-candidate deployment and the reporting sections when preparing or interpreting a release result. Ordinary scope or status questions may summarize the relevant result; a formal release report retains every applicable evidence field.

## Required Upstream Binding for a Content-Candidate Release

Before deploying or performing live mutation, require a current Promotion handoff that binds:

- the exact candidate digest;
- the exact integration SHA intended for build and deployment;
- the current native Manifest/Receipt/Closure/Registry evidence references;
- `currentness: current`;
- Shadow lifecycle state sufficient for handoff;
- `liveBoundary: unproven` or `blocked` rather than a false live claim;
- A18 content acceptance for the same candidate;
- A23 current Promotion handoff;
- A25 clean-slice/release-intake evidence for the same integration SHA;
- A11 regression evidence for the same integration SHA and affected surfaces;
- independently issued A22 release-readiness evidence for the same integration SHA and target;
- exact owner authorization for the requested target/action: preview authorization for preview, or production authorization for production.

Reject a handoff if the candidate digest, integration SHA, source binding, checker binding, or authorization differs from the release slice. Historical-only, stale, replay-only, or validate-only evidence is not release authority.

## Evidence Ladder

Report these as independent fields or sections:

1. `localTest`;
2. `build`;
3. `trackedCommitted`;
4. `main`;
5. `ciRegression`;
6. `providerConfiguration`;
7. `deploymentCreated`;
8. `providerReadyAlias`;
9. `sameShaRouteReadback`;
10. `liveRequiredBehavior`;
11. `rollback`;
12. `monitoring`.

Record `status`, SHA, target, timestamp, evidence reference, and limitations independently for every applicable field. `unknown`, `not-run`, and `not-applicable` are different. No field auto-populates the next.

Examples of invalid promotion:

- local build pass -> CI pass;
- CI pass -> deployed;
- Shadow evidence is not deployment proof;
- provider variables present -> provider behavior works;
- Vercel `READY` -> intended route serves the same SHA;
- Shadow pass -> live content is active;
- route HTTP 200 -> required interaction and data behavior work;
- prepared rollback command -> rollback was verified.

## Release Outcomes

Use precise bounded outcomes such as:

- `inventory-only`;
- `release-blocked`;
- `build-verified`;
- `ci-verified`;
- `deployment-ready-unverified-live`;
- `deployed-unverified-live`;
- `same-sha-live-verified`;
- `rollback-verified`.

Each outcome must list the exact SHA, target, evidence references, missing gates, and next allowed action. Never output a broader state than the strongest independently proven layer.

When route readback or required live behavior is missing, the current outcome stays at the highest independently proven non-live state. Keep current facts separate from future conditions. A clearly labeled hypothetical explanation may name a later enum, but must not present it as achieved or as execution authority. The next action is the missing evidence collection: same-SHA route/alias readback and separate required-behavior verification. A machine-consumed current-outcome field contains only the proven state; keep hypothetical discussion outside it.

## Handoff fields

For a formal release report, include mode, integration SHA, source cleanliness, target/deployment identity, all twelve evidence-ladder states, blockers, claim ceiling, residual risks, and next authorized action. Include candidate digest and Promotion handoff identity/currentness only for content-candidate release; otherwise record Promotion as not applicable. Distinguish unknown, not-run, and not-applicable. Ordinary answers may summarize these fields with a reference to the complete report; do not imply omitted checks passed.

Human-readable prose follows the user's language; normative enums, roles, schema and JSON field names remain English. Never include credentials, environment values, protected content, private corpus, raw provider responses, or unrelated dirty-tree data.
