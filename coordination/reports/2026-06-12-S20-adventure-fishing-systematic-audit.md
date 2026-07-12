# 2026-06-12 S20 Adventure Island and Fishing Master Systematic Audit

## Scope

- Session: S20 Game design and game-based learning lead.
- Owner objective: alongside the S06 Visualization enterprise run-through, systematically identify current issues in the two mini-games: Adventure Island (`探险岛`) and Fishing Master (`捕鱼达人`).
- Game routes reviewed:
  - `/student/practice/games/adventure-island`
  - `/student/practice/games/fishing-master`
  - legacy redirects `/practice/adventure-island`, `/practice/super-platformer-like`, and `/practice/fishing-game`
- Main files reviewed:
  - `components/gamification/AdventureIslandGame.tsx`
  - `components/gamification/FishingGame.tsx`
  - `app/practice/page.tsx`
  - `app/api/gamification/adventure-island/route.ts`
  - `app/api/gamification/fishing-game/complete/route.ts`
  - `lib/server/userStore.ts`
  - `tests/e2e/adventure-island.spec.ts`
  - `tests/e2e/fishing-game.spec.ts`
  - `tests/e2e/fishing-master-adventure.spec.ts`

## Visualization Status Cross-Reference

Visualization itself is covered by S06, not S20. Current S06 evidence in `coordination/reports/2026-06-12-S06-visualization-lab-enterprise-audit.md` shows:

- 756/756 desktop deep-link full interaction sweep passed.
- 756/756 current-state desktop full smoke passed.
- 31/31 mobile representative sweep passed.
- 16/16 changed-mapping desktop and 16/16 changed-mapping mobile sweeps passed.
- No hard unplayable Visualization Lab remains under those probes.

Remaining Visualization work is curriculum/math signoff and automation alignment, especially S18 review for capstone/multidomain/probability-statistics/vector-conic exactness and S11/S18 updates from the old all-cards-expanded assumption to deep-linked `#lab-example-{labId}` routes.

## Fix Applied

### Adventure Island Renderer Failure Observability

Issue: `AdventureIslandGame.tsx` directly awaited `import("phaser")` during game boot. If the Phaser chunk failed or stalled, Adventure Island did not expose a testable renderer failure state equivalent to Fishing Master.

Change made in `components/gamification/AdventureIslandGame.tsx`:

- Added `ResourceLoadState` and a 12-second `importPhaserWithTimeout()`.
- Added `rendererLoadState` and `loadErrorCode` state.
- Exposed `data-renderer-load` and `data-load-error` on `data-testid="adventure-island-stage"`.
- Converted Phaser import and constructor failures into page-level locked/failure states:
  - `phaser-timeout`
  - `phaser-runtime`
- Preserved existing play loop, reward API contract, route shape, and practice-unlock logic.

## Current Verification

### Passed

- Local TypeScript compiler API check for `components/gamification/AdventureIslandGame.tsx` passed.
- Adventure Island core desktop E2E passed:
  - Command: `npx playwright test tests/e2e/adventure-island.spec.ts --project=desktop-chrome --reporter=line --grep "uses Practice Arena topic evidence"`
  - Result: `1 passed (2.7m)`
  - Coverage: practice evidence, legacy redirects, eligibility API, Phaser canvas, movement, contact/attack challenges, game-over/restart, trophy reward, duplicate protection, nonblank canvas.
- Fishing Master formal chain desktop E2E passed:
  - Command: `npx playwright test tests/e2e/fishing-game.spec.ts --project=desktop-chrome --reporter=line --grep "Fishing Game renders"`
  - Result: `1 passed (2.6m)`
  - Coverage: Practice Arena round, Adventure Island completion, second post-Adventure same-topic practice round, Fishing renderer, catch challenge, coins x3 completion, duplicate reward protection.

### Blocked / Not Clean

- `npm run type-check` is not currently a clean release signal because it includes the nested `MAIS-MVP-california-practice-beta-clean/` folder. The run failed on existing unrelated errors in that nested copy, including provider-name drift, missing lesson/visualization files, teacher type drift, and curriculum-track mismatches. No reported error referenced the root `components/gamification/AdventureIslandGame.tsx` file changed here.
- A direct single-file `tsc` command could not use `@/*` path aliases from the project config because TypeScript only allows `paths` from `tsconfig.json`; this is why the TypeScript Compiler API check above was used for the target component.
- Existing local port `3000` dev server returned a stale Turbopack runtime-chunk 500 for `/student/tools/visualizations` during earlier probing:
  - missing generated chunk: `[turbopack]_runtime.js`
  - This is a generated `.next` / dev-server state issue, not evidence of a source route failure. S22 should own cleanup/restart guidance if it keeps recurring.

## Findings

### P1: Fishing Master 100-run stress harness does not seed the actual unlock chain

Evidence:

- `tests/e2e/fishing-master-adventure.spec.ts` `prepareFishingRound()` registers a student, submits a same-topic 5-question practice round, and creates a Fishing payload.
- It does not complete Adventure Island for the topic.
- It does not submit the required second same-topic 5-question 80%+ round after Adventure completion.
- Product code intentionally requires both:
  - `FishingGame.tsx` checks Adventure eligibility and requires `alreadyCompleted && postAdventurePracticeEligible`.
  - `lib/server/userStore.ts` `completeFishingGame()` requires an Adventure completion event and validates the Fishing round with `afterCreatedAt: adventureCompletion.created_at`.

Impact:

- The June 6 S11 stress report recorded 90/90 failures, but many failures are expected from invalid setup rather than proof that the Fishing product path is broken.
- Happy runs 6-15 returning `not-eligible` are consistent with the missing Adventure chain.
- Later `Target page/context/browser has been closed` failures appear to cascade after earlier timeout/failure conditions.

Recommendation:

- S11/S20 should update `tests/e2e/fishing-master-adventure.spec.ts` to reuse the formal setup pattern from `tests/e2e/fishing-game.spec.ts`:
  1. Complete a qualifying Practice Arena topic round.
  2. Complete Adventure Island for that topic.
  3. Submit a second same-topic 5-question 80%+ round after Adventure completion.
  4. Only then store/use the Fishing payload.
- After that, rerun desktop/mobile stress to separate real gameplay failures from harness setup failures.

### P2: Adventure Island had weaker renderer diagnostics than Fishing Master

Status: fixed in this session.

Fishing already exposed `data-renderer-load`, `data-load-error`, and Phaser timeout handling. Adventure now has equivalent observable states. A future S11 test assertion should explicitly wait for `data-renderer-load="ready"` or record `data-load-error` on failure.

### P2: Chinese copy has Traditional/Simplified mixing in game surfaces

Evidence examples:

- Traditional `zh` strings contain simplified `探险岛`, `练习场`, and `开始游戏`.
- `zhHans` variants exist in some Practice Arena strings, but game component strings are not consistently tri-lingual.
- Existing labels also mix `捕魚達人` Traditional with simplified Adventure terms.

Impact:

- This is not a runtime blocker, but it weakens polish for an enterprise bilingual product.

Recommendation:

- S09 should harmonize game copy:
  - `zh`: Traditional Hong Kong copy, likely `探險島`, `練習場`, `開始遊戲`.
  - `zhHans`: Simplified copy, likely `探险岛`, `练习场`, `开始游戏`.

### P2: Old Fishing stress report contains mixed signal

The June 6 stress report is useful as a failure inventory, but its aggregate red status should not be treated as product truth until the harness chain is corrected.

Observed categories:

- First happy-path failures include static chunk `net::ERR_ABORTED` and stage not reaching `welcome`; this may be dev-server/resource noise or a real renderer load issue depending on reproduction.
- Later happy-path failures show `not-eligible`, explained by missing Adventure/post-Adventure practice setup.
- Most later scenarios appear to cascade after browser/page closure.

Recommendation:

- Rerun after harness correction.
- Keep the new Adventure renderer attributes and Fishing's existing renderer attributes in the stress report so failures classify as `auth`, `eligibility`, `adventure-chain`, `questions`, `phaser-timeout`, or `phaser-runtime` instead of only timeout text.

## Acceptance Status

- Visualization enterprise runtime: passed by S06 evidence; remaining exactness/signoff is S18/S11 follow-up.
- Adventure Island product core desktop path: passed after S20 renderer observability fix.
- Fishing Master product core desktop path: passed with the intended unlock chain.
- Fishing Master 100-run stress: not accepted yet because current harness setup contradicts product eligibility rules.
- Mobile game enterprise acceptance: still needs a corrected S11/S20 stress rerun across mobile after harness repair.

## Files Changed By S20

- `components/gamification/AdventureIslandGame.tsx`
- `coordination/reports/2026-06-12-S20-adventure-fishing-systematic-audit.md`
- `coordination/session-logs/2026-06-12-S20.md`

## Notes

- No secrets were read, printed, or modified.
- No git staging, committing, branching, pushing, reset, or deletion was performed.
