# Two Games — Enhancement by Claude

**Project:** MAIS-MVP — Practice Arena games (Adventure Island & Fishing Master)
**Date:** 2026-07-19
**Author of record:** Dongpin HU (Peter) · Implemented with Claude Code (Fable 5)
**Status:** All four milestones (M1–M4) shipped and verified; uncommitted in the working tree, ready for review.

> **Note on "thinking process":** the model's raw internal thinking tokens are not preserved verbatim for playback. The *Reasoning* callouts throughout this document reconstruct the actual decision-making and trade-offs that drove each step, taken from the work as it happened. Everything else (code, contracts, test results, live-run evidence) is exact.

---

## Table of contents

1. [Original request & context](#1-original-request--context)
2. [Diagnosis of the two games](#2-diagnosis-of-the-two-games)
3. [The plan: design principles + four milestones](#3-the-plan-design-principles--four-milestones)
4. [M1 — Juice kit + Adventure Island kill effect](#4-m1--juice-kit--adventure-island-kill-effect)
5. [M2 — Fishing Master catch-and-reel + rarity](#5-m2--fishing-master-catch-and-reel--rarity)
6. [M3 — Results ceremony + run stars](#6-m3--results-ceremony--run-stars)
7. [M4 — Collections (Fish-dex / relics) + server bonuses](#7-m4--collections-fish-dex--relics--server-bonuses)
8. [Cross-cutting fixes discovered along the way](#8-cross-cutting-fixes-discovered-along-the-way)
9. [The Phaser browser-verification recipe](#9-the-phaser-browser-verification-recipe)
10. [Verification summary](#10-verification-summary)
11. [Complete file inventory](#11-complete-file-inventory)
12. [Reward economy contract — before & after](#12-reward-economy-contract--before--after)
13. [Data hooks & test IDs reference](#13-data-hooks--test-ids-reference)

---

## 1. Original request & context

The Practice Arena's two games — **Adventure Island** (a side-scrolling platformer) and **Fishing Master** (a cannon-net fishing game) — had weak UI/UX for K–12 math learners. Two issues were called out:

- **Issue 1 (UI):** Not "fancy" enough. Example given: when the player knocks off an enemy (e.g. a snail), it should have a real video-game **kill effect**, not just vanish.
- **Issue 2 (UX):** The rewarding system was flat and not interactive; it needed a redesign to make game-based learning more engaging.

The task: propose a smart plan to enhance UI and UX for both games, then implement it.

Both games are **Phaser 4.1** scenes rendered inside React client components, lazy-loading Phaser with a timeout. All art was runtime-drawn primitives (rectangles/ellipses via `make.graphics`). There was **no sound** in either game, despite `lib/practiceSound.ts` existing for the practice pages. Rewards were verified server-side through an anti-abuse pipeline with daily caps.

---

## 2. Diagnosis of the two games

Grounded in a full read of the source (no screenshots came through, so the code told the story):

**Issue 1 (UI) — the flat moment.** The critical failure was literally one line. A defeated enemy in Adventure Island:

```ts
// AdventureIslandGame.tsx — the old kill
this.activeEnemy.disableBody(true, true);   // vanishes in a single frame
```

Same instant-vanish for a caught fish in Fishing Master (`caughtTarget.disableBody(true, true)`). No death animation, no hit-stop, no particles, no camera shake, no sound. The single trophy firework was the only "juice" anywhere.

**Issue 2 (UX) — the flat reward loop.** Binary and end-loaded:
- Adventure Island paid a flat 35 XP / 35 points once per topic.
- Fishing paid 1 XP per coin; a shark was worth exactly what a small fish was worth.
- No in-run combo/momentum, no star rating, no replay reason, no collection.
- The end screens were walls of text.
- Meanwhile the codebase *already had* an `island-star` economy (25 XP / 10 pts) the games didn't touch.

> **Reasoning:** the fix had to respect a hard boundary — the reward APIs already enforce `coins == distinct correct answers` and daily caps (420 XP / 160 pts). So the plan split cleanly into *juice* (pure client polish, zero server risk) and *rewards* (must stay server-verifiable). Every visual effect is cosmetic; every payout stays recomputable server-side.

---

## 3. The plan: design principles + four milestones

**Design principles**
1. **Juice is free** — impact effects, sound, animation never touch the anti-abuse contract.
2. **Every real reward stays server-verifiable** — new bonuses must be recomputable on the server from evidence the client can't fake.
3. **Reward the moment, the run, and the return** — micro (per action), meso (per run), macro (across days).

**Milestones**

| Milestone | Scope | Why in this order |
|---|---|---|
| **M1** | Shared juice kit + SFX + Adventure Island kill effect | Biggest felt improvement, zero server risk |
| **M2** | Fishing catch-and-reel + rarity visuals | Same pattern, reuses M1 kit |
| **M3** | Results ceremony + run stars | Core UX/reward redesign (client-only) |
| **M4** | Collections (Fish-dex / relics) + server star & rarity bonuses | Macro retention; deliberate reward-contract updates |

Each milestone shipped independently and kept both games playable throughout.

---

## 4. M1 — Juice kit + Adventure Island kill effect

### What shipped

**The kill effect** (replacing the one-frame vanish) — a ~1 second sequence:
1. **Hit-stop** (90 ms): the frozen physics world holds one extra beat so the hit lands with weight.
2. **White flash** on the enemy.
3. **Squash-and-tumble launch**: enemy flattens, then spins and flies off-screen *away from the hero* under gravity.
4. **18-particle star/fragment burst** + **camera shake** at the impact point.
5. Floating **"+2" combat text** and **2 coins arcing into the HUD counter**.
6. **Kill SFX**; consecutive kills escalate: **POW! → DOUBLE KO! → RAMPAGE!** with rising-pitch audio.
7. **Reduced-motion** players get a gentle fade instead of the shake/tumble.

**Nine synthesized arcade SFX** added to `lib/practiceSound.ts` (coin, pickup, throw, kill, combo2, combo3, hurt, gameOver, fanfare) — WebAudio chiptune motifs under the same child-safe caps as the practice chimes. A per-user 🔊 toggle defaults **ON** in the arcade (practice pages stay default-off).

### Files

- **`lib/practiceGameJuice.ts`** (new) — pure, unit-tested specs: hit-stop timing, squash/tumble launch, deterministic (no-RNG) particle ring, combo tiers with bilingual labels, camera shake, coin flight, `prefersReducedMotion()`, game-sound storage key.
- **`components/gamification/phaserGameJuice.ts`** (new) — scene helpers: `flashSprite`, `spawnKillBurst`, `spawnCombatText`, `playKillTumble`, `fadeOutKill`, `spawnCoinFly`, `shakeCamera`. **Must not import phaser** (games lazy-load it); uses the global `Phaser` namespace types only — enforced by a regression test.
- **`lib/practiceSound.ts`** — extended with the game SFX kinds.
- **`components/gamification/AdventureIslandGame.tsx`** — kill wired through `playKillEffect`; SFX on coin/pickup/throw/hurt/gameOver/fanfare/correct/wrong; sound toggle.

### Key implementation detail — stats stay synchronous

```ts
// The stats (defeatedEnemies, coins) publish immediately on resolve.
// The celebration is cosmetic and never blocks reward evidence — e2e polls data-defeated.
if (killedEnemy) {
  // ... invulnerability + combo bookkeeping ...
  this.playKillEffect(killedEnemy, reducedMotion);       // cosmetic
  this.publishStats({                                     // synchronous, verifiable
    ...this.localStats,
    defeatedEnemies: this.localStats.defeatedEnemies + 1,
    coins: this.localStats.coins + killCoinReward
  });
}
```

> **Reasoning / gotcha found:** Phaser 4.1 removed `setTintFill(color)` — it's now a dead no-arg deprecation. The hit-flash uses `setTint(0xffffff).setTintMode(1)` (mode 1 = `FILL`), and `clearTint()` restores both color and mode. This surfaced as a `TS2554: Expected 0 arguments, but got 1` during type-check and was fixed in the helper.

### New observability hooks

`data-combo`, `data-kill-effect` (`"" → active → done`), `data-sound-enabled`, plus test id `adventure-island-sound-toggle`.

---

## 5. M2 — Fishing Master catch-and-reel + rarity

### What shipped

**The catch sequence** (replacing the instant vanish):
1. Net **wraps** the creature — splash, expanding **ripple rings**, **bubble burst**.
2. Creature **struggles** (wiggle).
3. Net **reels it in along a sagging rope** back to the cannon, the net circle tightening as it travels, with a rising winch-tick sound.
4. Only when the catch lands does the **math question modal** open (~1.2 s total — inside the e2e's 10 s timing window).

**Creature rarity tiers** — every species has a tier:
- **Common** ★: small fish, blue fish
- **Rare** ★★: octopus, lobster, stingray
- **Epic** ★★★: shark, golden fish

Rare+ creatures swim with a **pulsing colored glow** so aiming at them is a deliberate, higher-stakes shot. The "Nice catch!" card and the challenge modal both show the rarity stars/label.

**Felt consequences:**
- **Correct answer** → a coin arcs from the cannon into the HUD with a "+1" (coin SFX).
- **Wrong answer** → the fish **visibly escapes and swims off-screen** with a descending "got away" sound.

Both are purely cosmetic — the real creature stays consumed and `coins == distinct correct catches` is untouched.

**Four new SFX:** splash, catch, reel, escape. Fishing got the same per-user 🔊 toggle (shared `hk-math-game-sound` key).

### Files

- **`lib/practiceGameJuice.ts`** — added `creatureRarities`, `catchReelSpec`, `escapeSwimSpec`, `rippleSpec`, deterministic `bubbleBurstParticles`.
- **`components/gamification/phaserGameJuice.ts`** — added `spawnRippleRings`, `spawnBubbleBurst`, `playStruggleWiggle`, `playReelIn` (rope path with per-frame redraw), `playEscapeSwim`.
- **`components/gamification/FishingGame.tsx`** — catch choreography, rarity glows, escape, coin-fly, SFX, sound toggle.

### Guardrail — round ending mid-reel

```ts
const openChallenge = () => {
  this.net.clear();
  creature.setVisible(false);
  root.dataset.catchEffect = "landed";
  // If the 120s clock ended the round while reeling, the settlement owns the
  // screen — never open a question over it.
  if (phaseRef.current === "ended" || phaseRef.current === "submitting" || phaseRef.current === "submitted") return;
  caughtQuestionIdsRef.current.add(question.id);
  this.physics.world.pause();
  setChallenge({ creatureName, rarity, species, question });
  setGamePhase("challenge");
};
```

### New hooks

`data-catch-effect` (`"" → reeling → landed`), `data-last-rarity`, test ids `fishing-challenge-rarity`, `fishing-sound-toggle`. **E2e-critical:** the impact card must keep the text "Nice catch" and the reward feedback "+1 coin".

---

## 6. M3 — Results ceremony + run stars

### What shipped

Both games' text-heavy endings became a video-game ceremony, built as one shared component:

- **`components/gamification/GameResultsCeremony.tsx`** (new) — a **`pointer-events-none`** overlay card: the score **counts up live**, up to **three stars slam in one at a time** (chime each), **confetti falls**, stat chips summarize the run, the server's reward shows as a "+XP · +points" line, and beating a previous record fires a **"New best!"** badge with a fanfare.

Because the overlay never intercepts clicks, every button, link, and e2e assertion beneath it keeps working. Reduced-motion players get the full information without the choreography.

**Run stars:**
- **Adventure Island** — ★ Trophy clear, ★ Kept every heart, ★ Beat the clock (< 2:00). Computed client-side the instant you touch the trophy, so the ceremony starts immediately while the reward records in the background.
- **Fishing Master** — ★ / ★★ / ★★★ at 1 / 3 / 5 coins banked, driven by the **server-confirmed** coin count.

**Best-run store:** `hk-math-game-best:<user>` → `{"<game>:<topicId>": stars}`, validated on parse, only ever improves — which is what makes "New best!" and replaying a topic meaningful.

### Files

- `lib/practiceGameJuice.ts` — `adventureRunStars`, `fishingRunStars`, `ceremonyTimeline`, deterministic `confettiPieces`, `readGameBestRecord` / `isNewBestRun` / `withBestRun`.
- `lib/practiceSound.ts` — new `star` kind.
- Both game components — integrate the ceremony; Adventure replaced its old "Congratulations" card (kept the `adventure-island-clear-celebration` test id); Fishing renders `fishing-results-ceremony` over the stage while the e2e-asserted settlement panel stays untouched below.

> **Deliberate scoping call:** star-based **bonus XP** was kept *out* of M3, because the committed e2e suite asserts exact reward amounts (35/35 Adventure, coins×3 Fishing). Changing payouts belonged in M4, where those contracts get updated on purpose.

---

## 7. M4 — Collections (Fish-dex / relics) + server bonuses

The biggest milestone: real, server-verified reward changes plus a persistent collection layer.

### 7.1 Server bonuses

- **Adventure three-star clear bonus:** a clear with **every heart kept AND under two minutes** pays base 35 + **15** = **50 XP / 50 points**. The client sends `livesRemaining` as bounded evidence (0..max, else the run is voided). A new adventure branch in `gamificationRewardForSource` makes XP follow points; with no override it still resolves to 35/35, so eligibility previews and legacy payloads are unchanged.
- **Fishing rarity bonus:** each **correct** catch pays `tier − 1` on top of coins×3 (rare +1, epic +2). The client sends an optional `caughtSpecies` map, validated server-side: known species only, no duplicate creature, keys ⊆ caught ids — bogus claims void the run.

Both bonuses flow through the existing anti-abuse caps and source-key dedupe.

### 7.2 Collections persistence

- **`lib/server/userStore/gamificationCollectionsPersistence.ts`** (new) — `fishing_dex` (first-catch + counts per species) and `adventure_relics` (per-topic clears + best stars) with normalizers.
- Wired into `userStore.ts` — the `Database` type, the store composition, and critically **`normalizeDatabase`'s table whitelist** (a known gotcha: any collection missing from that whitelist has its writes silently discarded on every load).
- Relics record on award **and** on validated duplicate replays (upgrading best stars / clear count). Dex records each correct-catch species.
- New endpoint **`GET /api/gamification/collections`**.

### 7.3 Client surfaces

- **Adventure:** sends `livesRemaining`; ceremony shows the star-bonus line; cleared panel shows a relic chip (`adventure-island-relic`).
- **Fishing:** records species per correct catch (`challenge.species`), sends the claims; ceremony `bonusLine` shows rarity bonus / new species / dex count; welcome screen shows a **Fish-dex strip** (`fishing-dex-strip`) — 7 chips, "?" for uncaught species — loaded from the collections API.

### 7.4 The deliberate e2e contract update

The adventure-island trophy-run test drives a **fresh-restart, full-hearts, fast clear** that now legitimately earns the three-star bonus. So its assertions were updated on purpose:

```ts
// Before: expect(awarded.reward).toMatchObject({ xp: 35, rewardPoints: 35 });
// After:
expect(awarded.reward).toMatchObject({ xp: 50, rewardPoints: 50 });
expect(awarded.starBonus).toMatchObject({ applied: true, rewardPoints: 15 });
expect(awarded.relic).toMatchObject({ isNew: true, bestStars: 3 });
// ...and the +35 gamification-summary deltas moved to +50.
```

The **fishing spec needed zero changes** — its API-only completion sends no species map, and its UI-run assertions have no exact reward numbers.

> **Reasoning:** the reward-contract change was the one place M4 deliberately breaks an existing test. The rule from principle #2 held: the server computes the bonus from bounded, validated evidence; the client only *supplies* evidence and *displays* the result. The e2e change reflects a genuinely better outcome (the star bonus was earned), not a workaround.

---

## 8. Cross-cutting fixes discovered along the way

These weren't in the original plan but were required to ship and verify M1+.

**8.1 The 404 route gap (pre-existing).** The Practice map's game links (`/student/practice/games/adventure-island`) **404'd for real users** — a prior integration snapshot committed the `StudentPracticeGameRoute` component and the e2e specs but never the route page. Fixed:
- Created `app/student/practice/games/[gameSlug]/page.tsx` (with `notFound()` for unknown slugs).
- Moved the three legacy redirects (`/practice/adventure-island`, `/practice/super-platformer-like`, `/practice/fishing-game`) into `next.config.ts` `redirects()`, because a page-level `permanentRedirect` streams a **200** under `app/practice/loading.tsx`, while the specs assert a real **307/308**. Deleted the old page directories.

**8.2 Stray build-junk trees breaking type-check.** Deleting the old route pages exposed accidental git-ignored copies of old Next.js dist output at the repo root (`private/tmp/…`, `Users/dongpinhu/…`) whose stale generated `types/validator.ts` referenced the deleted routes. Fixed by excluding `private` and `Users` in both `tsconfig.json` and `tsconfig.next.json`, and deleting stale `.tmp/<session>/next-dist/types/validator.ts` from dead dev servers. A background task was spun off for the actual junk cleanup.

---

## 9. The Phaser browser-verification recipe

Verifying the games live in the in-app Browser pane required a specific technique, captured here because it recurred every milestone:

- The pane tab reports `document.hidden = true` and delivers **zero real `requestAnimationFrame` ticks**, so Phaser's loop never starts; `setTimeout` is throttled to ~1 s.
- **Working recipe:** reload → *before* clicking Start (Phaser boots lazily), inject overrides: `Document.prototype.hidden`/`visibilityState` getters + a `window.requestAnimationFrame` backed by a self-posting **MessageChannel** (unthrottled), gated to ~15 ms/frame.
- Drive input by dispatching synthetic `KeyboardEvent`s and busy-sleeping via the same MessageChannel (never `setTimeout`).
- Phaser caches the rAF reference at boot — install the shim *before* Start, or reload.
- Screenshots composite stale frames; to *see* the canvas, `drawImage` the game canvas into a 2D canvas inside the frame-driver, stash JPEG data-URLs, then display them in an overlay `<img>` and screenshot that.
- **M4 caveat learned:** Phaser's loop dies if the game idles across separate tool calls (GPU context eviction; focus/visibility dispatches don't revive it). Always **boot AND drive** the game inside one fire-and-forget script, then poll `data-*` attributes for the result.

---

## 10. Verification summary

Every milestone was verified with three layers: unit tests (`tsx --test`), full-repo `type-check`, and **production-build e2e** (`PLAYWRIGHT_ISOLATED_MODE=production`) run from an rsync'd scratch copy of the tree, plus a live in-browser playthrough.

| Milestone | Unit tests | type-check | Production e2e | Live browser proof |
|---|---|---|---|---|
| M1 | pass | clean | 6/6 (3 adventure + 3 fishing) | 3 live kills; combo 1→2→3; coins/defeats synchronous |
| M2 | pass | clean | 6/6 | Rare Stingray reeled to cannon; coin banked (1→3 XP/pts); wrong-answer escape |
| M3 | pass | clean | 6/6 | Fishing ★☆☆ + "New best!"; full Adventure run 1:16 → ★★★ + New best! |
| M4 | 65/65 (6 new server cases) | clean | 6/6 (adventure contract updated to 50/50) | Fresh student golden path (below) |

**M4 live golden path (new student):**
- Adventure trophy in **0:47**, full hearts → ceremony showed **"+50 XP · +50 points"**, **"★★★ Three-star clear bonus +15"**, and **"New relic earned!"**
- Fishing banked an **epic Golden fish + rare Stingray** → **"+9 XP · +9 points"** (6 base + 3 rarity) with **"Rarity bonus +3 · New species: Golden fish, Stingray · Fish-dex 2/7"**
- After reload: `GET /api/gamification/collections` and the welcome-screen dex strip both showed the persisted collection (2/7, correct rarity stars).

---

## 11. Complete file inventory

**New files**
- `lib/practiceGameJuice.ts` — pure juice + rarity + ceremony + best-run specs
- `lib/practiceGameJuice.test.ts` — spec unit tests
- `components/gamification/phaserGameJuice.ts` — Phaser scene helpers
- `components/gamification/GameResultsCeremony.tsx` — shared ceremony overlay
- `components/gamification/adventureIslandGameRegressions.test.ts`
- `components/gamification/fishingGameRegressions.test.ts`
- `components/gamification/gameResultsCeremonyRegressions.test.ts`
- `lib/server/userStore/gamificationCollectionsPersistence.ts` — Fish-dex + relics
- `app/student/practice/games/[gameSlug]/page.tsx` — the missing route page
- `app/api/gamification/collections/route.ts` — collections endpoint

**Modified files**
- `lib/practiceSound.ts` (+ `.test.ts`) — 14 game SFX kinds
- `lib/gamification.ts` — adventure reward branch (xp follows points)
- `components/gamification/AdventureIslandGame.tsx` — kill effect, ceremony, star bonus, relic
- `components/gamification/FishingGame.tsx` — catch-and-reel, rarity, escape, ceremony, dex
- `lib/server/userStore/gamificationGamePersistence.ts` — bonuses + collections wiring
- `lib/server/userStore.ts` — Database type, normalizeDatabase whitelist, store, exports
- `lib/server/userStoreGamificationGamePersistence.test.ts` — 6 new server cases
- `app/api/gamification/adventure-island/route.ts` — accepts `livesRemaining`
- `app/api/gamification/fishing-game/complete/route.ts` — accepts `caughtSpecies`
- `app/practice/{adventure-island,super-platformer-like,fishing-game}/page.tsx` → legacy redirects (later replaced by config redirects; dirs deleted)
- `next.config.ts` — config-level legacy game redirects
- `tsconfig.json`, `tsconfig.next.json` — exclude stray junk trees

---

## 12. Reward economy contract — before & after

| Source | Before | After |
|---|---|---|
| **Adventure Island clear** | 35 XP / 35 pts (flat) | 35/35 base; **50/50** on a three-star clear (full hearts + ≤120 s), via server-verified `livesRemaining` |
| **Fishing per coin** | 3 pts × coins | 3 pts × coins **+ rarity bonus** (rare +1, epic +2 per correct catch), via server-validated `caughtSpecies` |
| **Adventure relic** | — | New: per-topic clear count + best stars (persisted) |
| **Fish-dex** | — | New: per-species first-catch + count (persisted, 7 species) |
| Daily caps (420 XP / 160 pts), source-key dedupe, anti-abuse | unchanged | unchanged — all bonuses flow through them |

---

## 13. Data hooks & test IDs reference

**Adventure Island stage** (`adventure-island-stage`): `data-coins`, `data-axes`, `data-defeated`, `data-lives`, `data-phase`, `data-challenge-kind`, `data-combo`, `data-kill-effect` (`""→active→done`), `data-sound-enabled`.
Test ids: `adventure-island-sound-toggle`, `adventure-island-clear-celebration` (+ `-count`, `-new-best`, `-bonus`), `adventure-island-relic`.

**Fishing Master stage** (`fishing-game-stage`): `data-nets`, `data-coins`, `data-elapsed`, `data-phase`, `data-cannon-angle`, `data-last-cast`, `data-catch-effect` (`""→reeling→landed`), `data-last-rarity`, `data-sound-enabled`.
Test ids: `fishing-sound-toggle`, `fishing-challenge-rarity`, `fishing-results-ceremony` (+ `-count`, `-new-best`, `-bonus`), `fishing-dex-strip`.

**Client storage keys:** `hk-math-game-sound:<user>` (sound, default on), `hk-math-game-best:<user>` (best runs).

**APIs:** `POST /api/gamification/adventure-island` (accepts `livesRemaining`), `POST /api/gamification/fishing-game/complete` (accepts `caughtSpecies`), `GET /api/gamification/collections` (Fish-dex + relics).

---

*Generated from the 2026-07-19 implementation session. All work is uncommitted in the working tree; the dev server config `mais-dev-games-qa` (port 3210) runs the full result.*
