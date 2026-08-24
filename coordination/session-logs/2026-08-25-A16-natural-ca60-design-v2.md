# A16 session — MAIS Natural CA60 design registration v2

- Lane: `A16` research and learning science
- Date: `2026-08-25` Asia/Hong_Kong
- Branch: `codex/a16-natural-ca60-registration-v1-20260824`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-natural-ca60-registration-v1-20260824`
- Clean source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Immutable predecessor commit: `b34f92a20ca81381a373d720840abfad620f9176`
- Target PR: `pending`
- Expected closeout: after A18 method review, independent code-quality review, and owner-directed integration

## Declared slice

This session may add only:

- `coordination/research/mais-natural-ca60-v1/ACTIVE-DESIGN-REGISTRATION.json`
- `coordination/research/mais-natural-ca60-v1/versions/design-v2/**`
- this session log

The 19 files committed in the predecessor remain immutable. No application, API, question-bank, provider credential, deployment, or live-content path is in scope.

## Why v2 exists

The predecessor source-lineage rule admitted broad source/module grouping. Aggregate preflight identified approximate groups of 492, 1,500, and 810 items. Those groups would breach the registered component-size guardrail. This happened before any frame freeze, sample freeze, label production, authorization, or provider call. V2 therefore narrows source edges to fine-grained, explicit lineage keys and supersedes v1 append-only.

## TDD evidence

- Inherited interrupted state recorded by the assignment: 54 tests, 39 pass, 15 expected fail.
- First independently resumed full run: 56 tests, 50 pass, 6 fail. Failures were stale v1 artifacts/schemas/power and unfinished semantic checks.
- New red tests were observed before fixes for:
  - ambiguous-literal metric exclusion;
  - deterministic C0 missing/malformed-input handling and arrival-order-invariant reduction;
  - full receipt conclusion/integrity semantics;
  - schema-required runtime, authorization, attempt, final, and review fields;
  - active pointer, predecessor golden hashes, and v2 README.
- Final v2 suite: 76 tests, 76 pass, 0 fail.
- Immutable predecessor suite: 12 tests, 12 pass, 0 fail.
- V2 zero-network validator: `ok=true`, 9 schemas, 0 provider events.
- V1 zero-network validator: `ok=true`, 9 schemas, 0 provider events.

## Frozen v2 identity

- Design ID: `MAIS-NATURAL-CA60-V2`
- Schema: `NaturalCaPilotDesignRegistrationV2`
- Registration hash: `a1b7d7ac6cf23b059dddc015c75b876d26a3576f9e5e3e07724ef8c5b8429de8`
- Predecessor registration hash: `663303a7331f5c230f3e3238f0253edea81e37dbd9674ab84db28c02d64c6ce7`
- Decision ceiling: `INCONCLUSIVE_MACHINE_REFERENCE`
- Provider events: `0`
- Current lifecycle: `AUTHORIZATION_BLOCKED`

## A18 B1–B4 treatment

- `FALSE_ACCEPT_CORRECT_RESPONSE` is a preserved raw literal only. It always forces adjudication, resolves to `SCHEMA_GAP` plus `UNRESOLVED_REFERENCE`, and is excluded from final findings, accepted-code sets, matching, P0 opportunities, false negatives, and all metrics.
- Status codes never enter finding matching. Metric keys are unique `(itemId,family,code)` and family-map keys must exactly equal label codes.
- Missing-item finding counterfactuals use exactly 16 operational codes, with maximum opportunities 16/16/7/4 per missing item and 48/48/21/12 for three missing items. Counterfactual counts remain separate from observed counts; P0 uses observed false negatives only.
- C0 uses deterministic Boolean predicates with unknown/malformed/missing input triggering review. The C0 set is the unique union of the registered random 12 and mandatory items. Five roles are reduced once with frozen role order, schema/hash binding, duplicate/conflict handling, arrival-order invariance, and no sixth call.

A18’s earlier objection is treated as unresolved until A18 reviews this final hash. This session does not self-approve its method.

## Preservation and delivery boundary

`predecessor-golden-hashes.json` verifies all 19 predecessor files byte-for-byte. The active pointer explicitly states that it is not a registration. The pointer enables design discovery only; it does not enable provider execution.

No secrets were read or written. No network call, credential check, provider request, frame freeze, sample freeze, Qwen label, DeepSeek evaluation, deployment, live question mutation, push, or merge occurred in this session.

## Handoff

Next gates are:

1. A18 re-review of the exact v2 hash and claim boundary.
2. Independent code-quality review.
3. A21 implementation of the frame/cluster/sample/runner package against this frozen design.
4. A19 redacted credential readiness and two separately issued exact-hash-bound authorizations.

Until those gates complete, the accurate state is `DESIGN_REGISTERED_V2 / FRAME_NOT_FROZEN / AUTHORIZATION_BLOCKED / NOT_EXECUTED`.
