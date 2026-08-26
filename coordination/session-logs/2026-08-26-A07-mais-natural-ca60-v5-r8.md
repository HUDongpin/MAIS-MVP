# 2026-08-26 A07 — MAIS-NATURAL-CA60-V5-R8 offline runner remediation

## Session identity and lifecycle

- Lane: `A07` provider integration, using the owner-authorized V5-R8 offline runner/adapter/receipt/authorization-guard slice.
- Branch: `codex/a07-natural-ca60-live-runner-v5-r2-20260826`.
- Upstream: `origin/codex/a07-natural-ca60-live-runner-v5-r2-20260826`.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a07-natural-ca60-live-runner-v5-r2-20260826`.
- Starting HEAD and exact R7 A11 review commit: `ef6bb7da5151ec114882b9c349559afaaa145859`.
- Exact predecessor registration commit/hash: `aa07d9b72cf06fbcf100ed0f6bf358fedd94222d` / `97b65940b0573064b4d1206e1f80dfb555c1a41e6c782e7439f9ec53df66b003`.
- Exact predecessor runner source commit: `237413734a41431e51c8a29ecef6628b67bbafb1`.
- Exact predecessor A11 discrepancy receipt hash: `20d261e83982b29323383eec56c1df99e4f6b45fa7051482a47860e8bcaadd91`.
- Owner offline-implementation authorization text hash: `36233641da9de2db0dfa31fc6970db9e6b01ab11104ed8c89376925f669e0288`.
- Target PR: `pending`.
- Created: `2026-08-26`.
- Expected closeout date: `2026-08-26`, contingent on immutable registration and fresh A11 review.
- Worktree lifecycle action: retain this clean worktree and branch through registration and fresh A11 review; do not remove while the branch is open or any review evidence remains uncommitted.
- Source-identity note: a file cannot embed the hash of the commit that contains its own bytes. The exact V5-R8 runner source commit is therefore defined and mechanically verified as the first parent of the immutable single-add registration commit; the fresh A11 receipt must record both literal commit hashes after those objects exist.

## Owner authority and immutable boundary

The owner authorized a pre-first-provider superseding execution-runner registration, offline runner/adapter/receipt/authorization-guard implementation, fixture tests, and a fresh A11 review. This authority does not include credential reads, provider calls, natural-question egress, tokens, attempts, USD spending, deployment, or live question-bank mutation.

The reference tuple remains exactly:

`OPENAI_DIRECT / gpt-5.6-luna / https://us.api.openai.com/v1/responses / US_STORAGE_PROCESSING`

The frozen California frame/sample, rights/privacy screens, taxonomy, labeling/adjudication rules, thresholds, P0/P1/P2 rules, statistical method, and `INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling are unchanged. `qwen3.8-max` remains superseded and the legacy command is rejected without provider activity. This slice cannot emit `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`.

## R7 discrepancy remediation map

| R7 finding | V5-R8 implementation boundary |
| --- | --- |
| `A11-R7-001` | Unified 60-row item-result ledger, disjoint missing/unresolved/invalid accounting, valid 57–60 receipt handling, exact surface worlds, `[0,1]` unidentified finding bounds, and sealed completion markers. |
| `A11-R7-002` | Native literal counter-SHA256/rejection PRNG, all three frozen golden vectors, 10,000 cluster bootstrap replicates, Wilson/worst-case bounds, one-to-one exact-first matching, and frozen code-point tie order. |
| `A11-R7-003` | Closed `TerminalExecutionDecisionReceiptV1`, 60 missing-row fallback custody, append-only persistence, CLI binding, and independent reconstruction without metric inference. |
| `A11-R7-004` | Closed A11 V6 receipt with eight recomputable process-evidence fields plus exact single-add Git-object custody and direct registration-parent enforcement. |
| `A11-R7-005` | Signed trusted-provider evidence envelope, pinned Ed25519 trust-anchor requirement, authenticated source types, exact route/project/billing/region/price/probe claims, and unresolved fail-closed behavior when no anchor exists. |
| `A11-R7-006` | Public `audit-attempt-custody` and owner-authorized `reconcile-interrupted-attempt` commands; zero-HTTP reservation/intent/completion/resolved-receipt recovery; later dispatch blocked until custody is exact. |
| `A11-R7-007` | Bidirectional set equality and dangling-evidence rejection for all request/audit/authority/permit/raw/binding/intent/resolved-attempt collections. |
| `A11-R7-008` | This complete closeout record: predecessor identities, file inventory, checks and omissions, assumptions, risks, final-state enum, upstream, and worktree action. |

## Changed-file inventory

- Production modules: `activation-guard-v5-r8.mjs`, `attempt-graph-v5-r8.mjs`, `attempt-recovery-v5-r8.mjs`, `execution-evidence-v5-r8.mjs`, `native-provider-adapter-v5-r8.mjs`, `review-evidence-v5-r8.mjs`, `runner-v5-r8-cli.mjs`, `runner-v5-r8-runtime.mjs`, `schema-contract-v5-r8.mjs`, `scorer-verifier-v5-r8.mjs`, `statistical-kernel-v5-r8.mjs`, `trusted-provider-evidence-v5-r8.mjs`, and `workflow-index-v5-r8.mjs`.
- Tests: `runner-v5-r8-cli.test.mjs`, `runner-v5-r8-evidence.test.mjs`, `runner-v5-r8-remediation.test.mjs`, `runner-v5-r8-runtime.test.mjs`, `runner-v5-r8-schemas.test.mjs`, and `runner-v5-r8-scorer-verifier.test.mjs`.
- Closed schemas: 19 V5-R8 schemas for attempt custody/graph, statistical ledgers/final/terminal receipts, trusted route evidence, A11 process evidence, exact registration evidence, command receipt, aggregate score, and superseding registration.
- Registration package: `runner-registrations/v5-r8/build-runner-registration.mjs` and `runner-registration-artifact.test.mjs`.
- Session evidence: this log.
- Intentionally absent from the source commit: `runner-registrations/v5-r8/runner-registration.json`; it must be generated only from the exact source Git object and added in a separate immutable direct-child commit.

## Verification evidence

- All V5-R8 production modules, tests, and registration-builder modules passed `node --check`.
- Pre-registration registered V5-R8 suite: `26 tests`, `24 passed`, `0 failed`, `2 intentionally skipped`. The skipped tests are the exact registration rebuild and immutable-single-add/current-byte loader checks; they cannot run before `runner-registration.json` exists and must pass after registration.
- The suite covers: 57/59/60-item custody, unified nonresolution, counter-SHA256 golden vectors, one-to-one matching, authoritative terminal decisions, recomputable A11 process evidence, signed route evidence, every dangling attempt-graph collection, four interrupted-attempt states, zero-read/zero-HTTP activation guards, CLI ambiguity and unknown-activity handling, exact completed-item markers, terminal 60-row construction, schemas, and synthetic registration construction.
- Filesystem source-closure preflight resolved `202` production paths / `411` import edges and `210` test-closure paths / `437` import edges; the registered test manifest adds this session log for `211` paths total.
- All `162` package JSON Schema files parsed successfully.
- `npm run type-check`: passed (`tsc --noEmit --incremental false`, exit `0`). No TypeScript application files are changed by this slice.
- Live provider integration, endpoint probe, credential availability, provider billing, and natural-question execution tests were intentionally not run because the owner explicitly withheld those authorities.
- No deployment, browser test, app build, or live question-bank regression was run because this slice changes only offline research tooling under `coordination/` and does not alter the student application, API routes, or question content.

## Exact activity accounting

- Credential-source files, environment variables, `.env*`, and `All API Keys.docx` read: `0`.
- OpenAI provider events / HTTP requests: `0 / 0`.
- DeepSeek provider events / HTTP requests: `0 / 0`.
- Natural-question text read by this implementation session: `0`.
- Natural-question egress: `0`.
- Tokens / attempts / USD authorized or spent: `0 / 0 / 0`.
- Reference labels / natural-question results produced: `0 / 0`.
- Live content, student app, public API, deployment, and immutable R7 receipts changed: `0`.

## Assumptions, risks, blockers, and follow-up

- The owner-specified OpenAI tuple is treated as a frozen research contract, not as proof that the endpoint, model, account, billing route, residency, pricing, or credentials are currently available.
- V5-R8 intentionally pins no provider trust key. Its registration therefore remains `ROUTE_AUTHENTICITY_BLOCKED_NO_PINNED_TRUST_ANCHOR`; no authorization or provider dispatch can pass. A later owner-authorized, pre-provider superseding registration is required to add a real trust anchor.
- The native adapter contains a future dispatch path but has no default fetch or credential binding. Tests prove absent activation evidence stops before credential access and HTTP.
- Fixture success proves offline contract behavior only. It does not prove provider behavior, natural-question QA accuracy, reference validity, human validity, generalization, deployment readiness, or production safety.
- Fresh A11 review is still a hard gate. Any `DISCREPANCY` or `UNREVIEWABLE` outcome blocks adoption and requires another append-only superseding version; it must not be overwritten.
- The CA60 structural precision limitation remains: even perfect observed point estimates cannot satisfy all frozen confidence-bound thresholds, so the normal successful ceiling is still `INCONCLUSIVE_MACHINE_REFERENCE`.

## Final disposition

- Release-package final-state enum: `reviewed commit` once the source commit and its immutable direct-child registration commit are created and pushed; until then this remains a reviewable uncommitted slice.
- Research execution state: `OFFLINE_IMPLEMENTED_PENDING_FRESH_A11_V5_R8_REVIEW_PROVIDER_EXECUTION_BLOCKED`.
- Claim ceiling: `FRAME_AND_SAMPLE_FROZEN_RUNNER_OFFLINE_IMPLEMENTED_NOT_EXECUTED`.
- Provider-execution authority: `false`.
- Worktree action: retain; do not clean, remove, merge, or deploy from it during the pending A11 review.
