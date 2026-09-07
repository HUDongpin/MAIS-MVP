# Release and Live Evidence Workflow

## Intake

Classify the object as `inventory-only`, `application-runtime-release`, or `content-candidate-release`. For a release, also classify the stage as `release-readiness-evaluation` or `deploy-or-live-verification`. Resolve the exact integration SHA, target, owner authorization, repository-native release commands, live remote/main, worktrees, writers, and dirtiness. Resolve a candidate digest and current Promotion handoff only for content-candidate release. Do not rely on cached tracking refs or a status heading when live/current evidence is cheap to obtain.

## Promotion Boundary

Candidate Manifest, canonical/fresh/replay Shadow, Receipt verification, currentness, mutation invalidation, reaffirmation, Closure, and Registry belong to `mais-content-promotion-gate`. A content-candidate release starts only after a current handoff binds the same candidate digest and integration SHA. Read-only inventory and non-content runtime release do not invent or require candidate evidence.

## Sequence

1. Run non-destructive repository and dirty-tree discovery.
2. Confirm exact authorization for any Git write, provider action, deployment, live test, rollback, or monitoring mutation.
3. Apply stage-specific gates: inventory stays read-only; readiness generation starts from an A25-reviewed clean source and may generate local/build evidence plus A11/A22 receipts; deploy/live mutation consumes current same-SHA A11/A22/A25, owner target/action authorization, and A19 evidence when relevant. Content deployment consumes and cross-binds an already-current A18 decision and Promotion handoff to the exact candidate digest and integration SHA; Manifest, Receipt, Closure, Registry, and Promotion-currentness validation stay with `mais-content-promotion-gate`.
4. Define exact pathspecs and an isolated clean release source.
5. Run current repository-native preflight, type, build, and focused regression commands appropriate to touched surfaces.
6. Preserve independent evidence for local test, build, tracked commit, main, CI/regression, provider configuration, deployment creation, provider readiness/alias, same-SHA route readback, required live behavior, rollback, and monitoring.
7. Deploy only to the exact authorized target.
8. Inspect deployment identity, SHA/target/alias readiness, and timestamps.
9. Verify the intended route/alias reads back the same SHA, then separately verify required live behavior; an HTTP success does not prove interaction, persistence, or provider behavior.
10. Verify the authorized rollback and monitoring boundary, then state the exact highest proven outcome.

## Claim Rules

- Build verifies buildability of the tested bytes only.
- CI verifies the named workflow/checks for the named SHA only.
- Provider configuration verifies placement/presence only, never successful provider behavior.
- Deployment `READY` verifies the provider's deployment state only.
- Live proof requires fresh evidence from the intended public/private route and required behavior, bound to the deployed integration SHA.
- Rollback proof requires an exercised or otherwise directly verified rollback outcome, not a prepared command.
- If same-SHA route readback or required live behavior is absent, the current outcome remains non-live. Clearly labeled future conditions may explain a later enum, but do not place it in a current-outcome field or imply it occurred. List the missing evidence actions; see [bindings and reporting](outcomes-and-reporting.md).
