import { deepEqual, equal, ok } from "node:assert/strict";
import { test } from "node:test";
import {
  adventureRunStars,
  bestRunKey,
  bubbleBurstParticles,
  cameraShakeSpec,
  catchReelSpec,
  ceremonyStarDelayMs,
  ceremonyTimeline,
  coinFlightSpec,
  combatTextSpec,
  comboTierFor,
  comboTiers,
  confettiPieces,
  creatureDisplayNames,
  creatureRarities,
  creatureRarityFor,
  fishingSpeciesTotal,
  rarityBonusForSpecies,
  earnedStarCount,
  escapeSwimSpec,
  fishingRunStars,
  gameBestStorageKey,
  gameSoundStorageKey,
  isNewBestRun,
  killBurstColors,
  killBurstParticles,
  killCoinReward,
  killHitStopMs,
  killLaunchMs,
  killLaunchSpec,
  killSquashMs,
  killSquashScale,
  readGameBestRecord,
  readGameSoundEnabled,
  rippleSpec,
  withBestRun
} from "./practiceGameJuice";

test("hit-stop is long enough to feel but never steals control", () => {
  ok(killHitStopMs >= 50, "a shorter freeze reads as a glitch, not impact");
  ok(killHitStopMs <= 120, "a longer freeze makes controls feel broken");
});

test("the full kill sequence resolves in under a second", () => {
  ok(killSquashMs + killLaunchMs < 1000, "kill celebration must not stall the run");
});

test("squash flattens the enemy instead of shrinking it", () => {
  ok(killSquashScale.x > 1, "squash should widen horizontally");
  ok(killSquashScale.y < 1, "squash should flatten vertically");
});

test("kill launch knocks the enemy away from the hero and off the level", () => {
  const levelHeight = 620;
  const away = killLaunchSpec(500, 400, levelHeight);
  equal(away.directionX, 1, "enemy right of hero flies right");
  ok(away.driftPx > 0 && away.spinDeg > 0);

  const back = killLaunchSpec(300, 400, levelHeight);
  equal(back.directionX, -1, "enemy left of hero flies left");
  ok(back.driftPx < 0 && back.spinDeg < 0);

  ok(away.fallToY > levelHeight, "the tumble must end below the visible level");
  ok(away.hopPx > 0, "the enemy hops up before falling");
});

test("kill burst particles are deterministic and stay in child-friendly ranges", () => {
  const first = killBurstParticles();
  const second = killBurstParticles();
  deepEqual(first, second, "no RNG: bursts must be reproducible for tests and replays");
  equal(first.length, 18);
  ok(first.some((particle) => particle.shape === "star"), "a burst needs celebratory stars");

  for (const particle of first) {
    ok(particle.angleDeg >= 0 && particle.angleDeg < 400);
    ok(particle.distancePx >= 30 && particle.distancePx <= 160, "burst stays near the impact");
    ok(particle.sizePx >= 2 && particle.sizePx <= 14, "particles stay small");
    ok(particle.durationMs >= 300 && particle.durationMs <= 1200, "particles clear quickly");
    ok(particle.colorIndex >= 0 && particle.colorIndex < killBurstColors.length);
  }
});

test("combo tiers escalate label, scale, and sound", () => {
  equal(comboTierFor(0).tier, 1, "combo never goes below the base tier");
  equal(comboTierFor(1).tier, 1);
  equal(comboTierFor(2).tier, 2);
  equal(comboTierFor(3).tier, 3);
  equal(comboTierFor(99).tier, 3, "the top tier caps the escalation");

  for (const tier of comboTiers) {
    ok(tier.label.en.length > 0 && tier.label.zh.length > 0, "combo labels must be bilingual");
  }
  ok(comboTierFor(2).textScale > comboTierFor(1).textScale, "bigger combo, bigger text");
  ok(comboTierFor(3).textScale > comboTierFor(2).textScale);
  equal(comboTierFor(1).soundKind, "kill");
  equal(comboTierFor(2).soundKind, "combo2");
  equal(comboTierFor(3).soundKind, "combo3");
});

test("supporting specs stay subtle", () => {
  ok(cameraShakeSpec.durationMs <= 200, "camera shake is a punctuation mark, not an earthquake");
  ok(cameraShakeSpec.intensity <= 0.01);
  ok(combatTextSpec.durationMs <= 1000);
  ok(coinFlightSpec.durationMs + coinFlightSpec.staggerMs * (killCoinReward - 1) <= 1000, "coins reach the HUD fast");
});

test("every Fishing Master species has a rarity with bilingual labels", () => {
  const species = ["smallFish", "blueFish", "goldFish", "shark", "octopus", "lobster", "stingray"];
  for (const key of species) {
    const rarity = creatureRarities[key];
    ok(rarity, `${key} needs a rarity entry`);
    ok([1, 2, 3].includes(rarity.tier));
    equal(rarity.stars, rarity.tier, "stars mirror the tier so kids can read them at a glance");
    ok(rarity.label.en.length > 0 && rarity.label.zh.length > 0);
  }
  equal(creatureRarityFor("shark").id, "epic", "the shark is a trophy catch");
  equal(creatureRarityFor("goldFish").id, "epic", "the golden fish is a trophy catch");
  equal(creatureRarityFor("smallFish").id, "common");
  equal(creatureRarityFor("mystery-species").id, "common", "unknown species fall back to common");
});

test("every species has a display name and a tier-minus-one rarity bonus", () => {
  for (const species of Object.keys(creatureRarities)) {
    const name = creatureDisplayNames[species];
    ok(name && name.en.length > 0 && name.zh.length > 0, `${species} needs bilingual display names`);
    equal(rarityBonusForSpecies(species), creatureRarities[species].tier - 1);
  }
  equal(fishingSpeciesTotal, 7, "the dex tracks the seven tank species");
  equal(rarityBonusForSpecies("smallFish"), 0, "commons earn no bonus");
  equal(rarityBonusForSpecies("stingray"), 1, "rares earn +1");
  equal(rarityBonusForSpecies("shark"), 2, "epics earn +2");
  equal(rarityBonusForSpecies("unknown"), 0, "unknown species fall back to common");
});

test("the catch-and-reel sequence never keeps the question waiting long", () => {
  const struggleMs = catchReelSpec.struggleWigglePeriodMs * 2 * (catchReelSpec.struggleRepeats + 1);
  ok(struggleMs + catchReelSpec.reelMs <= 1600, "wrap + struggle + reel must stay under 1.6s");
  ok(catchReelSpec.netRadiusEndPx < catchReelSpec.netRadiusStartPx, "the net tightens as it reels");
  ok(catchReelSpec.reducedMotionDelayMs <= 400, "reduced motion goes almost straight to the question");
});

test("escape and splash effects stay quick and readable", () => {
  ok(escapeSwimSpec.durationMs <= 1200, "the escaping fish must clear the screen quickly");
  ok(rippleSpec.rings >= 2, "a splash needs at least two rings to read as water");
  ok(rippleSpec.durationMs + rippleSpec.ringDelayMs * (rippleSpec.rings - 1) <= 1000);
});

test("bubble bursts are deterministic and drift upward", () => {
  const first = bubbleBurstParticles();
  deepEqual(first, bubbleBurstParticles(), "no RNG in bubbles");
  equal(first.length, 10);
  for (const bubble of first) {
    ok(bubble.risePx > 0, "bubbles rise, never sink");
    ok(bubble.sizePx >= 2 && bubble.sizePx <= 8);
    ok(bubble.durationMs <= 1000);
  }
});

test("adventure run stars reward the clear, careful hearts, and pace", () => {
  const perfect = adventureRunStars({ livesRemaining: 2, maxLives: 2, elapsedSeconds: 100, targetSeconds: 120 });
  equal(earnedStarCount(perfect), 3);
  equal(perfect[0].id, "clear");
  ok(perfect[0].earned, "reaching the ceremony means the trophy was cleared");

  const bruised = adventureRunStars({ livesRemaining: 1, maxLives: 2, elapsedSeconds: 100, targetSeconds: 120 });
  equal(earnedStarCount(bruised), 2, "losing a heart costs the hearts star");

  const slow = adventureRunStars({ livesRemaining: 2, maxLives: 2, elapsedSeconds: 300, targetSeconds: 120 });
  equal(earnedStarCount(slow), 2, "a slow run costs the clock star");

  for (const star of perfect) ok(star.label.en.length > 0 && star.label.zh.length > 0, "star labels must be bilingual");
});

test("fishing run stars follow the server-verified coin count", () => {
  equal(earnedStarCount(fishingRunStars(0)), 0, "no coins, no stars");
  equal(earnedStarCount(fishingRunStars(1)), 1);
  equal(earnedStarCount(fishingRunStars(3)), 2);
  equal(earnedStarCount(fishingRunStars(5)), 3);
  equal(earnedStarCount(fishingRunStars(99)), 3);
});

test("the ceremony timeline stays snappy and stars land one at a time", () => {
  ok(ceremonyStarDelayMs(0) >= ceremonyTimeline.panelInMs, "stars wait for the panel");
  ok(ceremonyStarDelayMs(1) - ceremonyStarDelayMs(0) === ceremonyTimeline.starStaggerMs);
  ok(ceremonyStarDelayMs(2) + ceremonyTimeline.starPopMs <= 4000, "the whole ceremony resolves fast");
});

test("confetti is deterministic, colorful, and short-lived", () => {
  const first = confettiPieces();
  deepEqual(first, confettiPieces(), "no RNG in confetti");
  equal(first.length, ceremonyTimeline.confettiCount);
  for (const piece of first) {
    ok(piece.leftPct >= 0 && piece.leftPct < 100);
    ok(piece.durationMs <= 3000, "confetti must clear quickly");
    ok(piece.colorIndex >= 0 && piece.colorIndex < killBurstColors.length);
  }
});

test("best-run records are per user, validated, and only improve", () => {
  equal(gameBestStorageKey("student-1"), "hk-math-game-best:student-1");
  equal(gameBestStorageKey(null), "hk-math-game-best:guest");
  equal(bestRunKey("adventure-island", "quadratic-patterns"), "adventure-island:quadratic-patterns");

  deepEqual(readGameBestRecord(null), {});
  deepEqual(readGameBestRecord("not json"), {});
  deepEqual(readGameBestRecord('{"a:b": 2, "bad": "x", "toobig": 9}'), { "a:b": 2 }, "invalid entries are dropped");

  const record = { "adventure-island:t1": 2 };
  ok(isNewBestRun(record, "adventure-island:t1", 3), "beating the best is a new best");
  ok(!isNewBestRun(record, "adventure-island:t1", 2), "matching the best is not");
  ok(isNewBestRun(record, "fishing-master:t1", 1), "a first run with stars is a new best");
  ok(!isNewBestRun(record, "fishing-master:t1", 0), "zero stars never counts as a best");

  deepEqual(withBestRun(record, "adventure-island:t1", 1), { "adventure-island:t1": 2 }, "a worse run never downgrades");
  deepEqual(withBestRun(record, "adventure-island:t1", 3), { "adventure-island:t1": 3 });
});

test("game sound is scoped per user and defaults to ON with explicit opt-out", () => {
  equal(gameSoundStorageKey("student-1"), "hk-math-game-sound:student-1");
  equal(gameSoundStorageKey(undefined), "hk-math-game-sound:guest");
  equal(gameSoundStorageKey(null), "hk-math-game-sound:guest");

  equal(readGameSoundEnabled(null), true, "arcade games default to sound on");
  equal(readGameSoundEnabled("true"), true);
  equal(readGameSoundEnabled("false"), false, "only an explicit opt-out mutes");
});
