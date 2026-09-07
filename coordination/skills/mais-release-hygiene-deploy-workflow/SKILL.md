---
name: mais-release-hygiene-deploy-workflow
description: Audit release readiness or execute an authorized MAIS application/content release, with clean-source, same-SHA deployment and live-behavior evidence. Excludes Promotion artifact validation, standalone QA, and provider configuration.
---

# MAIS Release Hygiene Deploy Workflow

Produce the release result the user requested, bounded to its exact source, target, and evidence. A request for inventory or explanation does not authorize deployment. Existing exact authorization remains usable while its target, action, source and validity conditions still match; do not request the same authorization again merely to advance a checklist.

## Select the mode and stage

| Object | Required context |
| --- | --- |
| `inventory-only` | Read-only branch/worktree/owner/writer/dirty-state and live remote/main evidence; missing facts remain findings. No Promotion handoff or mutation authority. |
| `application-runtime-release` | Exact integration SHA and A25-reviewed clean source. Do not invent candidate fields. |
| `content-candidate-release` | Ordinary release controls plus same-candidate/same-SHA A18 acceptance and current A23 Promotion handoff. |

For release work, distinguish `release-readiness-evaluation` from `deploy-or-live-verification`. Readiness evaluation may produce local/build/A11/A22 evidence from an A25-reviewed clean source; it does not presuppose the A22 artifact it is creating. Deployment or live mutation consumes already-current same-SHA A11/A22/A25, exact owner target/action authorization, and A19 parity when relevant. Preview, production, rollback, and monitoring have separate target/action boundaries.

## Scope and non-negotiable boundaries

- A25 owns inventory/slicing recommendations; A22 owns release readiness and authorized deployment. No Git mutation, deletion, deployment or production side effect without exact applicable authorization. A25's stricter Git-mutation boundary remains in force.
- Work from a reviewed clean worktree/clone/slice or pruned staging. A dirty-root deployment needs an explicit named owner risk exception; a clean source or green check is not deployment authority.
- This Skill consumes A19's redacted environment parity. It never edits provider/environment configuration or treats configuration as successful provider behavior.
- Manifest, Shadow, canonical/fresh/replay Receipt, checker/currentness, attempts, reaffirmation, Closure and Registry are owned by `mais-content-promotion-gate`. Route those decisions there; this Skill consumes a current handoff and never manufactures or validates Promotion authority. Pause only the release action dependent on a missing/mismatched handoff.
- Bind commands, evidence, integration SHA, provider project/account, target, owner and current writers to the actual checkout. Use live remote evidence for current remote claims; a cached tracking ref alone is insufficient.
- Local test, tracked commit/main, CI, provider configuration, deployment/READY, route readback, live behavior, rollback and monitoring prove different things. No layer fills another. In particular, HTTP 200 does not prove interaction/persistence/provider behavior.
- Keep credentials, environment values, private/protected material and unrelated dirty work out of commands' output, reports and upload packages. Source rights, cost, network and live-side-effect limits still apply.

## Read only the applicable reference

| Task | Source |
| --- | --- |
| Plan or execute the release's stage-specific work | [Workflow](references/workflow.md) |
| Prepare an external mutation | [Checklist](references/checklist.md), using only its applicable sections |
| Bind a content release or issue/interpret a formal result | [Bindings and reporting](references/outcomes-and-reporting.md) |
| Resolve a blocker or issue a favorable release decision | [Stop conditions](references/stop-conditions.md) |

Use current repository-native commands relevant to the assigned stage and changed surface. Preserve release gates; do not rerun unchanged successful checks or start unrelated rollback/monitoring work just because they appear in the reference. Record those stages as not run or not applicable when appropriate. Completing a dry run does not authorize the real deploy.

## Completion

Deliver the highest independently proven current result, source/target binding, supporting evidence, material gaps, and the next authorized action. Formal release reports use the complete evidence ladder in the reporting reference; ordinary explanations may summarize it. Distinguish current outcome from clearly labeled future conditions, and never claim a later state has occurred. Follow the user's language for prose and keep normative enum/role/schema/JSON names in English.
