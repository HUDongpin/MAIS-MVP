# MAIS-NATURAL-CA60-V5-R2 fresh A11 independent runner review

- Reviewer lane: `A11`
- Review date: `2026-08-26`
- Registration commit: `385ec33f87294328e637c2ebd165c316a96ae5ad`
- Bound runner commit: `c9fffc6f69257ba70e5a08d27b9f14b202f37e8f`
- Declared and independently recomputed registration hash: `8845a0f08ca0190c855c10b364f83c1a9d424655bc1926895b59360dbea96fb2`
- Independent review receipt hash: `82d5e8edca9896f35f5c2271d84e62344a2eeb9b45ba0fa0e86c7fec354be4dd`
- Decision: **`DISCREPANCY`**

## Outcome

The registration artifact is internally hash-consistent and preserves the frozen V5 design, California frame/sample, rights/privacy roots, taxonomy, labeling method, thresholds, P0/P1/P2 rules, supersedes lineage, decision ceiling, exact provider tuples, and zero-authority boundary. The bound implementation nevertheless has execution-integrity and interface gaps that prevent A11 concurrence.

This decision freezes a discrepancy report. It does not modify the A07 registration, the runner, the frozen frame/sample, or any earlier receipt. No aggregate conclusion may be published from V5-R2, and no provider stage may use this review as concurrence.

## Independently verified evidence

The A11 verifier uses only Node built-ins, reads the reviewed registration and all bound sources from Git object bytes, and does not import the A07 runner, scorer, registration builder, or canonical-hash implementation.

- Registration self-hash: verified.
- Design registration, provider-sequencing receipt, and owner-decision receipt self-hashes: verified.
- All 14 frozen V5 section hashes and the section-root hash: verified.
- Frame, sampling frame, CA60 manifest, selection root, payload-set root, rights/privacy roots, taxonomy, labeling/adjudication, analysis/threshold, and decision-ceiling bindings: verified.
- Pre-activation and formal-freeze supersedes roots: verified.
- Production source manifest/root from `c9fffc6f…`: `194898665c815f8960715307370428f444c2d9038a0a307ef9f003e56fbedcfc` (verified).
- Test source manifest/root from `c9fffc6f…`: `f661fa30d989f2ed53f64ead0fe5bb04b65cee961816b71c4697a89d9ac20a23` (verified).
- OpenAI tuple: `OPENAI_DIRECT` / `gpt-5.6-luna` / `https://us.api.openai.com/v1/responses` / `US_STORAGE_PROCESSING` (verified as a frozen selection, not live route proof).
- DeepSeek tuple: `DEEPSEEK_DIRECT` / `deepseek-v4-pro` / `https://api.deepseek.com/chat/completions` (verified as a frozen selection, not live route proof).
- Exact registered 20-file offline test manifest: `84/84` Node test outcomes passed using localhost/in-memory fixtures only.

Passing fixture tests prove deterministic offline behavior covered by those tests. They do not cure uncovered or contradictory runtime contracts and do not establish provider availability, project entitlement, data residency, billing route, credential readiness, natural-question execution, or QA validity.

## Severity-ranked discrepancies

### Critical

1. `A11-R2-001` — The fresh post-registration A11 review cannot be bound or consumed. Both live guards accept the older `IndependentDesignReviewReceiptV1` and require pre-activation chronology. They do not accept a runner-review receipt or bind `freshA11RunnerReviewHash`, this registration hash, or its production/test roots. Evidence: `authorization-guard-v5.mjs:205,484`; `deepseek-authorization-guard-v5-r2.mjs:73`.

2. `A11-R2-002` — Attempts, per-role attempts, token, USD, and concurrency caps are checked against caller-supplied snapshots, not an authoritative receipt-derived ledger with an atomic pre-dispatch reservation. Repeated or concurrent callers can present the same state. Evidence: `authorization-guard-v5.mjs:411`; `deepseek-authorization-guard-v5-r2.mjs:219`; `runner-storage.mjs:556`.

3. `A11-R2-003` — Some dispatched provider events can be absent or materially incomplete in receipts. Response-body reading occurs outside the dispatch error conversion, parse/schema failures force usage to zero even if a billable envelope exposes usage, cost values are caller-supplied, and origin/model/finish drift can be collapsed or rejected before durable receipt completion. Evidence: `live-provider-http-v5-r2.mjs:228,249`; `openai-live-reference-runner-v5-r2.mjs:74`; `deepseek-live-evaluation-runner-v5-r2.mjs:56`.

4. `A11-R2-004` — DeepSeek accepts any 64-hex `executionRegistrationHash`; neither the guard nor runner authenticates the complete self-hashed execution registration and its reference-seal, authorization, frame/sample, tuple, adapter, and runner bindings. Evidence: `deepseek-live-evaluation-runner-v5-r2.mjs:139`; `deepseek-authorization-guard-v5-r2.mjs:242`.

### High

5. `A11-R2-005` — Prior-role artifacts are not cryptographically revalidated. OpenAI checks only self-hash shape, while the DeepSeek revision adapter checks a critique object's role/item/payload shape without rehashing it or proving its successful-attempt lineage. Evidence: `authorization-guard-v5.mjs:390`; `deepseek-evaluation-adapter-v5-r2.mjs:46`.

6. `A11-R2-006` — OpenAI project-route preflight and DeepSeek route probe return ephemeral run objects but do not build/write the frozen self-hashed route receipts required by later authorization. OpenAI transport also carries no project identifier, so project identity/residency must be established by separate bound console evidence that is not yet implemented. Evidence: `openai-project-route-preflight-v5-r2.mjs:271`; `deepseek-route-probe-v5-r2.mjs:209`; `live-provider-http-v5-r2.mjs:197`.

7. `A11-R2-007` — The public CLI is a static status/receipt reporter. `label-openai`, `authorize-check`, `execute-deepseek`, `score`, and `verify` are not wired to protected artifacts, guards, receipt chains, resume planners, live runners, scoring, or independent verification. Evidence: `cli.mjs:42,92,129`.

8. `A11-R2-008` — Resume planning accepts caller-selected `adjudicationRequired` and `c0Required`; the OpenAI planner also lacks item-hash/pseudonym binding. These decisions must be derived from sealed same-item artifacts and the frozen trigger engine. Evidence: `openai-reference-state-v5-r2.mjs:10`; `deepseek-execution-state-v5-r2.mjs:25`.

9. `A11-R2-009` — The frozen DeepSeek `B_PRIME_REVISION` prompt still says “Qwen” after reference-provider migration to OpenAI. “or final reference labels” provides partial semantic protection, but the provider-specific wording and test coverage are stale. Because its prompt hash is frozen, it may not be silently edited. Evidence: `versions/design-v4/design-contract.mjs:202`; `deepseek-evaluation-adapter-v5-r2.mjs:1`; `versions/design-v5/design-registration.json:1702`.

### Medium

10. `A11-R2-010` — `NaturalCaExecutionRunnerRegistrationV1` leaves `frozenBindings`, both provider implementation objects, and `authorizationState` substantially open, so the schema does not itself freeze the claimed semantics. Evidence: `NaturalCaExecutionRunnerRegistrationV1.schema.json:16`.

11. `A11-R2-011` — Attempt appends are serialized, synced, permissioned, and fail closed on a torn trailing record, but the JSONL write itself is not crash-atomic. This is weaker than the registered `appendOnlyReceiptImplemented`/atomic-write claim. Evidence: `runner-storage.mjs:556,574`.

## Required closure

The code-affecting findings require A07 to create a new runner commit and a new append-only **pre-first-provider superseding runner registration**, followed by a new fresh A11 review. The existing V5-R2 registration and this discrepancy receipt remain immutable.

The stale Qwen prompt must be handled explicitly: either freeze an append-only erratum that accepts the legacy wording while proving the broader reference-blindness contract, or supersede the frozen prompt/design contract. If the prompt bytes/hash change, a design/contract supersession and all affected downstream registrations are required; an in-place edit is prohibited.

Before any future provider authorization, the replacement must at minimum:

1. Define a closed runner-review schema and bind the post-registration `CONCURRED` receipt to both guards and later authorizations.
2. Add authoritative, atomic budget/attempt/concurrency reservation and full post-dispatch receipt finalization.
3. Authenticate final execution registration and every prior-role artifact/attempt lineage.
4. Implement frozen route receipt builders and project/data-region evidence binding.
5. Derive resume decisions from sealed artifacts and wire the public CLI to the actual guarded workflow.
6. Close the registration/permit schemas and retest all failure paths, including body-read, origin/model/finish drift, malformed-but-billable responses, crash recovery, and concurrent reservations.

## Proved boundary

- Credentials read: `0`
- OpenAI provider calls/events: `0`
- DeepSeek provider calls/events: `0`
- Natural questions egressed: `0`
- Reference labels/results created: `0`
- Tokens, attempts, and USD authorized or spent: `0`
- Live question-bank or deployment mutations: `0`

The state remains: frozen CA60 frame/sample plus offline runner evidence, with provider execution blocked. It is not `CA60_EXECUTED`, does not support `PASS`, and does not support `LIMITED_GENERALIZATION_EVIDENCE`.
