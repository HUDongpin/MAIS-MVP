# Release Checklist

## Before Mutation

- Live `origin/main`, branch, exact integration SHA, worktrees, dirty state, owner, and active writers verified.
- Exact Git/deployment/live authorization is current and target-bound.
- Mode is explicitly `inventory-only`, `application-runtime-release`, or `content-candidate-release`.
- For content only, the current A18/A23 Promotion handoff binds the same candidate digest and integration SHA.
- Stage is explicit: readiness generation begins with A25-reviewed clean source and produces local/build/A11/A22 evidence; deployment/live mutation consumes current same-SHA A11/A22/A25, owner authorization, and relevant A19 environment-parity evidence.
- Clean source and exact pathspecs exclude unrelated runtime, content, coordination, private, local, and generated artifacts.

## Build and CI

- Current repository-native preflights selected from actual scripts/workflows, not invented commands.
- Type/build/focused tests and required CI recorded by command/check, SHA, timestamp, result, and limitations.
- Local test, build, tracked commit, main, and CI/regression are recorded independently; a green layer does not fill another.

## Deployment and Live

- Exact provider project/account/target and owner authorization confirmed without exposing secret values.
- Deployment identity, integration SHA, target, readiness, aliases, and timestamps recorded.
- Fresh route/alias readback proves the intended surface serves the same SHA.
- Fresh browser/API interactions separately prove only the required live behaviors actually exercised.
- Console/page/network errors, viewport, interactions, data persistence/provider behavior, and known gaps are recorded when relevant.
- Rollback and monitoring state describe only what was actually verified.

## Handoff

- Highest proven release outcome, claim ceiling, blockers, residual risk, and exact next action are explicit.
- No Shadow/CI/build/READY/provider-config/HTTP-200 state is translated into live behavior pass.
