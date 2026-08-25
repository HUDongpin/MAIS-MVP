# A11/A06 — G01 C2 production browser contract

Date: 2026-08-20  
Lane: A11 QA, borrowing A06 Visualization Lab context  
Scope: G01 C2 new receipt/browser contract files only

## Outcome

- The exact receipt validator seals one complete project payload against the frozen G01 plan: all 9 labs, 6 visual axes per project, 90 interaction states per lab/project, exact reset/model/control observations, non-hollow collision/contrast/layout/touch evidence, diagnostics, source hashes, and once-only durable lesson sessions.
- The browser producer derives all state IDs and axes from the frozen plan in canonical order. It uses real desktop pointer/keyboard actions and real mobile touchscreen taps plus CDP `Input.dispatchTouchEvent` swipes; no range value setter, `dispatchEvent`, `fill`, or `selectOption` shortcut is allowed.
- Each non-initial logical action has an exact ordered physical-subaction ledger. Mode, select pointer, select keyboard, range pointer, range keyboard correction, and reset phases use independent analytics request/ACK windows. Every setup, primary, reset-after, and visual-reset subaction serializes exactly one raw `visualization-action` event plus exact endpoint/method, request owner header/user, request event ID/body identity, HTTP 200 response, and same-order/same-cardinality acknowledged event ID. Event IDs are globally unique across the complete payload. Zero, extra, replayed, malformed, or evidence-free events fail closed.
- The visualization-session production acknowledgement is exactly HTTP 200, matching the live route rather than the earlier false 201 assumption.
- The first target session ACK is awaited and validated inside the primary first-action gate before reset-after can run. Reset-after proves zero additional session POSTs. Every target user first seeds all eight other G01 labs; the receipt persists the authenticated `userId`, all sibling setup subactions, exact target server session, owner-and-identity-bound SHA session ID, and same-user target/sibling snapshot counts across baseline, mount, first, reset, second, reload, and final stages. Arbitrary session IDs and any sibling drift fail closed.
- Playwright 1.59.1 keeps CLI selection in internal `cliProjectFilter`, `cliGrep`, and `cliGrepInvert`; its public `FullConfig.projects/grep/grepInvert` is not accepted as CLI authority. The five-file C2 scope can define an exact canonical invocation (raw args, both projects implicitly, exact spec/config/worker/retry/reporter) and validate canonical environment JSON plus SHA-256, but it has no runner that owns spawn/wait and an immutable receipt. Therefore the payload binds `authorityAvailable: false`, `releaseReady: false`, `runnerReceiptSha256: null`, and `execution.complete: false`; direct Playwright, missing/inherited variables, desktop-only/grep narrowing, and even caller-forged exact JSON plus matching SHA cannot produce a passing production spec. A future dedicated runner slice is required before executable release authority exists.
- Every `/api/learning-events` POST is retained without lab/event prefiltering as raw request text, raw event IDs, parsed events, owner, response status, ACK IDs, and request/response malformed state. Each subaction uses pre-quiesce, action/settle, response completion, and post-quiesce boundaries and requires exactly one complete delivery. The terminal receipt proves exact sorted equality of all observed delivery event IDs, raw event IDs, serialized IDs, and the consumed set; delivery count must also equal event count. Valid-plus-malformed, valid-plus-other-lab, surplus, unconsumed, and late-post evidence all fail closed.
- Receipt source hashes are recomputed from raw bytes of the exact plan, producer, receipt validator, and routing spec files.

## TDD and pure gates

- Receipt exact-200 correction: red 43/44, then green 44/44.
- Initial browser source contract: red because the producer file was absent; minimal binding made 1/1 green; expanded requirements were red 1/8; initial producer reached 8/8.
- DIFFERENT frozen review returned HOLD with four P1 and three P2 findings. The first C3 canary run was red 49 pass / 9 fail: four independent source-contract failures plus reused-event-ID and fake raw-source-hash mutations. Those corrections reached receipt 49/49 and source 9/9.
- Freeze self-audit then exposed select pointer/keyboard coalescing, incomplete sibling coverage, and insufficient receipt semantic/source binding. Seven added canaries were independently red (`55 pass / 7 fail`, including three `Missing expected exception` mutations), then green.
- Final receipt pure gate: 52/52. Final browser source-contract gate: 14/14, including independent two-project, grep, grepInvert, shard, and retry mutation canaries. Final combined pure gate: 66/66.
- A second DIFFERENT review returned C4 HOLD because runtime ACK assertions were not persisted, durability identity/sibling evidence was underbound, and configured-project retry/status evidence was incomplete. Initial C4 canaries were red at 64 pass / 7 fail; `EVIDENCE_FREE`, corrected self-consistent `TWO_EVENTS`, and `UNBOUND_SESSION` each reproduced the intended receipt rejection gap.
- C4 GREEN adds direct mutations for ACK ID/cardinality, request owner, reset-after/visual-reset evidence, `HAS_USER`, `HAS_SIBLING`, target identity/surplus keys, and configured-project narrowing. Final receipt pure gate: 65/65. Final browser source-contract gate: 16/16. Final combined pure gate: 81/81.
- C5 RED reproduced four receipt failures (`65 pass / 4 fail`) for runner authority, narrowed/forged invocation, raw malformed/other-lab delivery, and terminal late delivery; source contract reproduced five failures (`14 pass / 5 fail`). C5 GREEN adds the installed Playwright 1.59.1 CLI-model canary, runner fail-closed canaries, raw-delivery and terminal-set canaries, plus direct payload mutations for false completion, narrowed runner args, forged authority, late delivery, and unconsumed delivery. Final receipt pure gate: 80/80. Final browser source-contract gate: 19/19. Final combined pure gate: 99/99.
- Full `npm run type-check`: GREEN after the final C5 code and canaries.
- Every subprocess used `TEMP`, `TMP`, and `TMPDIR` set to `/Volumes/Starship/mais-g01-c2-tmp-20260820-a11`.

## Frozen contract hashes

C5 hashes are recorded at final handoff after the pure/type gates.

## Deliberate runtime boundary and blocker

No build, browser, Git, network, or database test was run in this slice while the exact92 infrastructure was active. A browser run is additionally unavailable until a dedicated trusted runner owns the canonical invocation receipt. After that runner exists, the current `MultiDigitOperationsLab` learner controls still do not emit per-control learning analytics, so the authorized browser run must fail at the first non-initial action with `zero per-action analytics evidence` until the product owner adds real action analytics. The receipt and producer do not synthesize events or weaken either release gate.
