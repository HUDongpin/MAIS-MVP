# A13 TeacherOperations queued-client continuation

## Session boundary

- Lane: `A13` Teacher Console, with one narrowly documented `A11` E2E borrow.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a13-teacher-report-target-20260823`.
- Branch: `codex/a13-teacher-report-target-20260823`.
- Preserved committed HEAD: `300f97c5e1a3aa3748d39945d95e84e825547f2e`
  (`fix(teacher): keep report targets paired`).
- The worktree was clean before this continuation. The existing committed
  report-target slice was not rewritten.
- The branch merge-base with local `main` is
  `4d2fdb69f61c44190358a48cfdd0e8c2de0a184f`; local `main` was
  `a444b0dcc6a86b7a679a48fe14703c98aa0f0cf6` at inspection time. This is
  therefore an older-base continuation candidate, not current-main evidence.
- This continuation remains unstaged and uncommitted by instruction.

## Implemented behavior

- Every new notice-send or reminder user intent is rooted in a browser
  `crypto.randomUUID()` idempotency key. A synchronous intent registry rejects
  duplicate in-flight clicks, retains the exact key after retryable or
  ambiguous failure, and clears it after a confirmed response so a later
  deliberate click receives a new key.
- Notice send posts the key in the JSON body and accepts only the reviewed
  `202 { notice, attempt, email }` queued aggregate. UI copy says queued and
  explicitly does not claim provider delivery.
- Reminder requests send `classId`, `assignmentId`, `manual`, `cursor`, and a
  stable page key derived from the strong user-intent key. The client follows
  all `nextCursor` pages, deduplicates runs by durable ID, detects cursor loops,
  and resumes a failed page with the same cursor and page key.
- Notice and every reminder page use a 15-second `AbortSignal` timeout.
  Offline, timeout, rejected fetch, and JSON/shape failures are bounded and the
  component restores busy state in `finally`.
- `400`, `404`, `413`, `429`, `503`, network, conflict, and invalid-response
  paths have distinct safe copy. `Retry-After` supports delta seconds and HTTP
  dates, is displayed, and temporarily disables the operation controls.
- Accepted-but-unreadable responses say the request was queued but refresh
  failed. Terminal HTTP failures say it was not queued. Network failures stay
  explicitly unconfirmed and retain the same key for safe replay.
- Notice/reminder buttons are disabled with visible busy labels and
  `aria-busy`. Success feedback uses `role="status"`; failures use
  `role="alert"`.
- Response guards reject incomplete notice or reminder objects before the UI
  renders them.
- Post-review remediation now persists a schema-v2 recovery record in
  `sessionStorage` under the SHA-256 digest of teacher, class, and operation
  intent. Neither the key nor value contains a raw teacher, class, notice,
  assignment, student, or cursor identifier. The value is exactly the opaque
  base idempotency key plus schema version. A reload deliberately restarts
  reminder pagination at page zero with that same base key; server page
  idempotency makes the replay safe without persisting the backend cursor.
  Terminal outcomes remove the record.
- The reviewed `202` DTO is now validated as a closed allowlist, including the
  complete delivery attempt, exact enums, non-negative safe integer counts,
  acknowledgement and identity/channel invariants, and exact reminder-page
  shape. Malformed accepted responses remain retryable with their original
  key.
- A valid notice `202` immediately updates a local override for every notice,
  including notices supplied in the initial list. `router.refresh()` is only a
  best-effort refresh trigger; the UI no longer treats it as an awaitable read
  or claims to detect its asynchronous failure.
- The client reads only two allowlisted `409` machine codes:
  `IDEMPOTENCY_CONFLICT` and `NO_ELIGIBLE_RECIPIENTS`, with distinct bilingual
  feedback. Unknown or text-only `409` bodies remain generic conflicts.
- A notice `202` now accepts only the queued email aggregate. Recipient
  acknowledgement fields must agree with recipient status, and aggregate
  counts are recomputed from the recipient collection before rendering.
- Every reminder run must match the authenticated teacher, selected class,
  optional requested assignment, and manual-versus-automatic threshold mode.
- A terminal failure after one or more accepted reminder pages no longer
  promises cursor/key reuse: the UI directs the teacher to refresh and review
  results before starting a new request. Retryable failures retain the prior
  same-cursor/same-key message.
- Local queued notice state wins over stale refreshed props, while an equal or
  newer server `updatedAt` wins over the local override so delivery and receipt
  progress cannot remain hidden indefinitely.
- Reminder request JSON now omits `assignmentId` and `cursor` whenever their
  values are `null`; it never serializes explicit nulls across the reviewed A12
  boundary. Teacher, class, optional assignment, and manual-mode intent values
  are validated before fetch, so an empty response cannot make an invalid
  top-level scope appear successful.
- Notice queueing now derives an immutable intent from the original card's
  `id`, `teacherId`, `classId`, and `channelId`. The response must match all four
  fields before a local override is rendered, and malformed/missing intent
  scope fails before fetch.
- Every timestamp consumed by the notice/reminder UI is now checked as a real
  RFC3339 timestamp, including calendar-day and timezone-range validation.
  Recipient acknowledgement identity is exact: `acknowledgedBy` must equal the
  recipient's non-empty `guardianId`. Returned notice and attempt states must
  match one of the reviewed pairs: queued/queued, queued/disabled, sent/sent,
  or failed/failed.

## Strict TDD evidence

- Crypto intent lifecycle/page-key group: RED `0/3`, then GREEN `3/3`.
- HTTP `202`, error, Retry-After, and pagination group: RED `3/8` with the five
  new contracts failing, then GREEN `8/8`.
- TeacherOperations wiring/accessibility group: RED `0/5`, then GREEN `5/5`.
- Timeout group: RED `13/15` with both new AbortSignal contracts failing, then
  GREEN `15/15`.
- Strict response-shape group: RED `9/11` with both incomplete-object cases
  incorrectly accepted, then GREEN `11/11`.
- Post-review reload recovery: RED `0/1` because no recovery store existed,
  then GREEN `1/1` with same-base-key/page-zero restoration and
  content-exclusion assertions.
- Post-review strict aggregate: RED `0/1` because an incomplete attempt was
  accepted, then GREEN `1/1`; a later channel-identity invariant extension was
  also observed RED `0/1` then GREEN `1/1`.
- Post-review existing-notice override: RED `0/1` because no override existed,
  then GREEN `1/1` without an awaitable-refresh claim.
- Post-review stable `409` codes: RED `0/1` because both codes collapsed to a
  generic conflict, then GREEN `1/1` with unknown/text-only bodies still
  generic.
- Post-review per-page durable checkpoint: RED `0/1` because no checkpoint
  callback ran, then GREEN `1/1` with the next exact cursor/page/key state.
- Privacy-safe recovery: RED `0/1` because the first request did not await a
  digest and raw scoped IDs remained in the storage key, then GREEN `1/1` with
  a synchronous intent claim and hashed storage key. The reload migration was
  separately RED `0/1` against cursor restoration, then GREEN `2/2` with page
  zero restart and both storage keys/values scanned against a real
  `assignmentId\0studentId` cursor sentinel.
- Strict queued/receipt DTO: RED `0/1` for an accepted `202 no-eligible`
  aggregate and RED `0/1` for contradictory recipient/acknowledgement state;
  each became GREEN `1/1` after fail-closed validation.
- Reminder scope semantics: RED `0/1` because cross-teacher, cross-class,
  cross-assignment, and manual/automatic threshold drift were accepted, then
  GREEN `1/1` after intent-bound validation.
- Partial terminal feedback: RED `0/1` for the missing pure disposition and RED
  `0/1` for missing component use, then GREEN `1/1 + 1/1` with retry promises
  limited to retryable failures.
- Notice reconciliation: RED `0/1` for the missing pure reconciler and RED
  `0/1` for component bypass, then GREEN `1/1 + 1/1` with stale/equal/newer
  server fixtures.
- Final executable-review closure: RED `30/32` because the component had no
  runtime list reconciler and its terminal-partial copy was not available at
  the executable request boundary. GREEN `32/32` proves old/equal/newer server
  prop reconciliation and a real page-one success/page-two terminal `409`
  flow that clears reload recovery, issues a fresh later key, and never
  promises the old cursor/key.
- Follow-up reminder serialization: RED `0/1` showed explicit
  `assignmentId: null` and `cursor: null`; GREEN `1/1` proves both keys are
  absent. Invalid top-level scope was separately RED `0/1` because a null class
  returned success on an empty page, then GREEN `1/1`; assignment and manual
  runtime drift are included in the same fail-closed matrix.
- Follow-up notice intent: RED `0/1` because the helper accepted only a loose
  notice ID and could not bind the original card; GREEN `1/1` uses the tested
  four-field intent constructor and rejects each response-field drift. A null
  runtime intent separately threw during RED `0/1`, then became a no-fetch,
  non-retryable bad request in GREEN `1/1`.
- Follow-up DTO timestamps: RED `0/1` because malformed and impossible dates
  were accepted; GREEN `1/1` rejects notice, recipient, delivery-attempt, and
  reminder-run timestamp drift before UI consumption.
- Follow-up receipt/status invariants: mismatched `acknowledgedBy` was RED
  `0/1` then GREEN `1/1`; draft/queued and other contradictory notice-attempt
  pairs were RED `0/1` then GREEN `1/1` against the four allowed pairs.
- Latest focused request-state tests: `30/30` passed.
- Latest focused view/source tests: `9/9` passed.
- Latest combined focused component gate: `39/39` passed.
- Full `npm run test:components`: `418/418` passed across 53 component test
  files, including the 39 focused TeacherOperations contracts.
- Latest `npm run type-check`: passed after the remediation and borrowed E2E
  changes.
- Latest `npm run check:imports`: passed; all local import targets resolved.
- Latest `git diff --check`: passed.

## Exact A11 borrow

Only `tests/e2e/teacher-operations.spec.ts` is borrowed from A11. Three
route-mocked cases were added, limited to:

1. notice retry after a page reload reuses the exact key, a valid strict `202`
   immediately updates the existing card, and a later deliberate send uses a
   fresh key;
2. allowlisted idempotency-conflict and no-eligible-recipient `409` codes render
   distinct safe feedback;
3. a reminder page interruption records no raw ID/cursor in sessionStorage; a
   reload reuses the same base key from page zero, terminal success clears the
   record, and a later click starts a fresh intent. Page-zero route assertions
   now also require `assignmentId` and `cursor` to be absent rather than null.

The mocked notice case now reads the original card DTO first and returns that
exact notice/teacher/class/channel scope, so the future browser run exercises
the same stable-intent binding as the executable helper tests instead of using
invented route-fixture IDs.

No other E2E matrix, Playwright configuration, runner, package script, or
artifact routing was changed. The three browser cases were not executed because
this continuation explicitly forbids network/browser-service work; they remain
an integration/browser evidence requirement.

## Exact candidate paths

1. `components/teacher/TeacherOperationsView.tsx`
2. `components/teacher/teacherOperationsRequestState.ts`
3. `components/teacher/teacherOperationsRequestState.test.ts`
4. `components/teacher/teacherOperationsViewActions.test.ts`
5. `tests/e2e/teacher-operations.spec.ts` — exact A11 borrow
6. `coordination/session-logs/2026-08-24-A13-teacher-operations-queued-client.md`

No backend/outbox worktree, `package.json`, shared config, shared types,
provider configuration, secret, or generated output was modified. No stage,
commit, push, merge, deployment, provider contact, production write, or live
domain check was performed.

## Integration boundaries

- This UI candidate expects the separately reviewed A12 notice `202` and
  paginated reminder contracts. The current A13 branch still contains the old
  backend implementation, so same-SHA integration with the A12 slice is not
  proved here. In particular, direct serialization compatibility with the A12
  handler remains an integration-candidate test, not evidence from this A13
  worktree.
- The frozen A12 handler currently emits text-only `409` responses. Emission of
  the stable `IDEMPOTENCY_CONFLICT` and `NO_ELIGIBLE_RECIPIENTS` codes remains
  explicit A12 integration work; A13 does not parse or branch on backend error
  text.
- The new route-mocked E2E cases need an authorized browser run after clean
  integration. Keyboard/screen-reader behavior still needs the broader A11/A09
  accessibility matrix.
- The branch is behind local `main`; integration must rebase or cherry-pick the
  two independent committed/uncommitted A13 slices into a clean current-main
  worktree and rerun the relevant gates before review approval.
