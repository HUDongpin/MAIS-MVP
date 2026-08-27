---
name: mais-release-hygiene-deploy-workflow
description: Use this skill when the primary object is a MAIS release inventory or slice, or an exact integration SHA, including A22/A25 dirty-tree intake, release-bound build or CI evidence, authorized Vercel deployment, same-SHA route and live-behavior proof, rollback, or monitoring. For a content release, consume but never create or validate a current Promotion handoff. Do not use for Manifest, Shadow, Receipt, replay, Closure, Registry, or Promotion currentness, standalone A11 regression debugging, standalone A19 provider or environment configuration or provider calls, A18 content review, natural evaluation, or release-like fields inside an RSI machine packet. A green build, required check, configured provider, or READY deployment is never live proof by itself.
---

# MAIS Release Hygiene Deploy Workflow

Use this skill for three explicitly distinguished modes: read-only release inventory, application/runtime release engineering, and content-candidate release engineering. A current Promotion handoff is mandatory only for a content-candidate release. The skill owns release slicing, build/deployment evidence, same-SHA route and behavior proof, rollback, and monitoring; it does not redo content QA or manufacture Promotion evidence.

## Default Posture

- Begin read-only with live remote/main, branch/worktree inventory, exact integration SHA, owner assignment, current writers, and dirty-tree evidence.
- Do not stage, commit, branch, push, merge, reset, delete, deploy, or exercise production side effects without fresh exact authorization for that action. This Skill never mutates provider/environment configuration; route placement or change to A19 and consume only its redacted parity evidence.
- Prefer a clean isolated worktree, clean clone, reviewed clean release slice, or pruned staging directory. A dirty root is not a deploy source without an explicit named risk exception.
- Keep local test, tracked commit, main, CI, provider configuration, deployment status, route readback, live behavior, rollback, and monitoring as separate claims.
- A25 owns non-destructive inventory, ownership mapping, and slice recommendations. It performs no Git mutation unless the owner authorizes the exact operation and target.
- A22 owns clean-source build, release readiness, authorized deployment, and live verification. A19 owns provider/environment placement and issues a redacted parity receipt; this skill consumes that receipt and never infers provider behavior from configuration.

## Negative Routing: Promotion Comes First

If the request concerns any of the following, stop release work and route it to `mais-content-promotion-gate`:

- candidate or source digest binding;
- Manifest/schema validation;
- canonical Shadow Receipt, fresh Shadow, or distinct replay;
- Receipt semantic comparison or currentness;
- mutation invalidation, new attempt, append-only reaffirmation, Closure, or Registry.

Do not translate a Shadow pass or GitHub required check into deployed/live state. This skill consumes a Promotion handoff; it does not produce one.

## Mode Classification and Upstream Gates

Classify before applying prerequisites:

- `inventory-only`: resolve live remote/main, SHA, worktrees, owners, writers, dirtiness, conflicts, and a proposed exact-path slice. No Promotion handoff is required, and the result grants no Git or deployment authority.
- `application-runtime-release`: bind the exact integration SHA and do not invent a candidate digest. Readiness generation requires a reviewed clean source/slice and current A25 intake evidence; the authorized workflow may then generate local/build evidence, request or consume A11 regression, and issue an A22 release-readiness result. Deployment or live mutation additionally requires current same-SHA A11, A22, A25, owner target/action authorization, and A19 environment-parity evidence when provider configuration matters.
- `content-candidate-release`: require the complete same-candidate and same-integration-SHA chain below in addition to ordinary release gates.

Then classify the stage independently:

- `release-readiness-evaluation`: from an exact SHA and A25-reviewed clean source, run or consume authorized local/build/test evidence, request or consume A11 regression, consume A19 parity when relevant, and issue a bounded A22 readiness artifact. It cannot deploy or verify live behavior and does not presuppose the A22 artifact it is producing.
- `deploy-or-live-verification`: consume the already-current same-SHA A11/A22/A25 evidence, exact owner target/action authorization, and relevant A19 parity receipt before any deployment, readback, live, rollback, or monitoring mutation.

### Required Upstream Binding for a Content-Candidate Release

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

## Release Sequence

1. Classify the object as `inventory-only`, `application-runtime-release`, or `content-candidate-release`; for a release, classify the stage as `release-readiness-evaluation` or `deploy-or-live-verification`, then name the exact preview/production/rollback/monitoring target.
2. Resolve live `origin/main`, exact integration SHA, branch/worktrees, dirty state, owner, active writers, and authorization.
3. Apply gates at the correct stage. Inventory remains read-only. Readiness generation starts from an A25-reviewed clean source and produces rather than presupposes local/build/A11/A22 evidence. Before deployment or live mutation, consume current same-SHA A11/A22/A25 and owner/A19 evidence; for content, consume and cross-bind the already-current A18 decision and Promotion handoff to the exact candidate digest and integration SHA. Route any Manifest, Receipt, Closure, Registry, or Promotion-currentness validation back to `mais-content-promotion-gate`. For runtime, do not invent candidate evidence.
4. Produce an exact pathspec release slice; quarantine generated/local/private artifacts and unrelated changes.
5. Use a clean authorized source. Run only the relevant, current repository-native preflights, type checks, builds, and regression gates.
6. Record each evidence layer independently. A successful layer does not promote another layer.
7. Deploy only to the explicitly authorized target using the authorized provider/project/account path.
8. Record deployment identity, target, SHA binding, inspect/readiness state, aliases, and timestamps.
9. First prove that the intended route/alias reads back the same SHA; separately prove required live behavior with fresh browser/API interactions. Record console/page/network errors and viewport/route as applicable.
10. Exercise or verify the authorized rollback path and monitoring boundary; record what was actually tested.

Read `references/workflow.md` for the detailed sequence, `references/checklist.md` before any external action, and `references/stop-conditions.md` before any favorable release outcome.

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

When route readback or required live behavior is missing, output only the highest currently proven non-live outcome and the missing evidence actions. Do not print, preview, quote, or name any later live-success outcome enum, even as a hypothetical “only after” state; mentioning a later success token can be misread as the current result. The next action should be phrased as evidence collection—fresh same-SHA route/alias readback, then separate required-behavior verification—not as advancement to a named live outcome.

## Safe Handoff

Return a redacted release report containing:

- Follow the user's language for human-readable prose; retain normative enum, role, schema, and JSON field names in English. / 人类可读说明跟随用户语言，规范枚举、角色、Schema 与 JSON 字段名保留英文。
- mode, exact integration SHA, and—only for content-candidate release—the exact candidate digest;
- only for `content-candidate-release`, Promotion handoff identity/currentness; otherwise record Promotion as `not-applicable` and do not invent candidate fields;
- release slice/source cleanliness;
- all twelve independent evidence-ladder states;
- target and deployment identifiers without secrets;
- blockers, claim ceiling, residual risks, and next authorized action.

Do not include credentials, environment values, protected content, private corpus, raw provider responses, or unrelated dirty-tree data.
