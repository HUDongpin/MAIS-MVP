import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ok } from "node:assert/strict";
import { test } from "node:test";

const gameSource = readFileSync(
  join(process.cwd(), "components/gamification/FishingGame.tsx"),
  "utf8"
);

test("a caught creature reels to the cannon instead of vanishing in one frame", () => {
  ok(
    !gameSource.includes("caughtTarget.disableBody(true, true)"),
    "the old instant-vanish catch must stay gone"
  );
  ok(gameSource.includes("this.playCatchAndReel(caughtTarget"), "catches must route through playCatchAndReel");
  ok(gameSource.includes("playStruggleWiggle"), "the wrapped creature must struggle before reeling");
  ok(gameSource.includes("playReelIn"), "the net must reel the creature back along the rope");
  ok(gameSource.includes("spawnRippleRings"), "hits and misses need water ripples");
});

test("the reel keeps the e2e catch contract intact", () => {
  ok(gameSource.includes('root.dataset.lastCast = "hit"'), "data-last-cast=hit must fire at the moment of impact");
  ok(gameSource.includes("Nice catch!"), "the impact card must keep the Nice catch text the e2e asserts on");
  ok(gameSource.includes('root.dataset.catchEffect = "reeling"'), "the reel lifecycle must be observable");
  ok(gameSource.includes('root.dataset.catchEffect = "landed"'));
  ok(
    gameSource.includes('phaseRef.current === "ended" || phaseRef.current === "submitting" || phaseRef.current === "submitted"'),
    "a round that ends mid-reel must not reopen a challenge over the settlement"
  );
  ok(
    gameSource.includes("coins: correctCaughtQuestionIdsRef.current.size"),
    "coins must stay equal to distinct correct catches — the reward API rejects mismatches"
  );
});

test("answers get a felt consequence: banked coin or escaping fish", () => {
  ok(gameSource.includes("celebrateCatch"), "correct answers bank the coin visually");
  ok(gameSource.includes("escapeCatch"), "wrong answers let the fish get away visually");
  ok(gameSource.includes("playEscapeSwim"), "the escape must swim off screen");
  ok(gameSource.includes("spawnCoinFly"), "the banked coin must fly to the HUD");
});

test("rarity is visible before and during the challenge", () => {
  ok(gameSource.includes('creature.setData("species"'), "creatures must carry their species for rarity lookups");
  ok(gameSource.includes("creatureRarityFor"), "rarity must come from the shared juice spec");
  ok(gameSource.includes('creature.setData("glow"'), "rare+ creatures need their glow");
  ok(gameSource.includes('data-testid="fishing-challenge-rarity"'), "the challenge modal must show the rarity line");
  ok(gameSource.includes("root.dataset.lastRarity = rarity.id"), "the caught rarity must be observable for tests");
});

test("game sound is wired with a persisted per-user toggle", () => {
  for (const soundCall of [
    'playGameSound("throw")',
    'playGameSound("splash")',
    'playGameSound("catch")',
    'playGameSound("reel")',
    'playGameSound("coin")',
    'playGameSound("escape")',
    'playGameSound("fanfare")'
  ]) {
    ok(gameSource.includes(soundCall), `expected the game to fire ${soundCall}`);
  }
  ok(gameSource.includes('data-testid="fishing-sound-toggle"'), "players need a visible sound toggle");
  ok(gameSource.includes("aria-pressed={soundEnabled}"), "the toggle must expose its state");
  ok(gameSource.includes("gameSoundStorageKey(currentUser?.id)"), "the preference must persist per user");
});

test("M4: species claims flow from catch to payload to dex UI", () => {
  ok(gameSource.includes("correctCaughtSpeciesRef.current[question.id] = challenge.species"), "correct catches must record their species");
  ok(gameSource.includes("caughtSpecies: correctCaughtSpeciesRef.current"), "the completion payload must carry the species claims");
  ok(gameSource.includes("Rarity bonus +"), "a paid rarity bonus must be celebrated in the ceremony");
  ok(gameSource.includes('data-testid="fishing-dex-strip"'), "the welcome screen must show Fish-dex progress");
  ok(gameSource.includes("/api/gamification/collections"), "the dex strip loads from the collections API");
});

test("reduced motion skips the choreography but still reaches the question", () => {
  ok(gameSource.includes("prefersReducedMotion()"), "reduced-motion players skip the struggle and reel");
  ok(gameSource.includes("catchReelSpec.reducedMotionDelayMs"), "reduced motion still gets a short beat before the modal");
});
