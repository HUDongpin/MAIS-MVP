export type KillBurstParticleSpec = {
  angleDeg: number;
  distancePx: number;
  sizePx: number;
  shape: "star" | "circle";
  colorIndex: number;
  durationMs: number;
};

export type KillLaunchSpec = {
  directionX: 1 | -1;
  hopPx: number;
  driftPx: number;
  fallToY: number;
  spinDeg: number;
};

export type ComboTier = {
  tier: number;
  minCombo: number;
  label: { en: string; zh: string };
  textColor: string;
  textScale: number;
  soundKind: "kill" | "combo2" | "combo3";
};

// Timing is tuned so the whole kill lands inside one second: long enough to
// feel like a real video-game payoff, short enough that controls never feel
// taken away from a young player.
export const killHitStopMs = 90;
export const killFlashMs = 90;
export const killSquashMs = 110;
export const killLaunchMs = 640;
export const reducedMotionKillFadeMs = 260;

export const killCoinReward = 2;

export const killSquashScale = { x: 1.35, y: 0.45 } as const;

export const cameraShakeSpec = { durationMs: 130, intensity: 0.004 } as const;

export const combatTextSpec = { riseDistancePx: 72, durationMs: 780, fontSizePx: 26 } as const;

export const coinFlightSpec = {
  durationMs: 520,
  staggerMs: 90,
  arcLiftPx: 90,
  hudOffset: { x: 74, y: 40 }
} as const;

export const killBurstColors = [0xfacc15, 0xfb7185, 0x38bdf8, 0x34d399, 0xa78bfa, 0xf97316] as const;

// Deterministic ring layout (no RNG): identical for tests, replays, and both
// games, so a burst can be asserted on instead of eyeballed.
export function killBurstParticles(count = 18): KillBurstParticleSpec[] {
  const safeCount = Math.max(1, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => ({
    angleDeg: (360 / safeCount) * index + (index % 2) * 9,
    distancePx: 58 + (index % 3) * 26,
    sizePx: 4 + (index % 3) * 2,
    shape: index % 5 === 0 ? ("star" as const) : ("circle" as const),
    colorIndex: index % killBurstColors.length,
    durationMs: 620 + (index % 4) * 90
  }));
}

// The defeated enemy is always knocked away from the hero, hops up, then
// tumbles off the bottom of the level while spinning.
export function killLaunchSpec(enemyX: number, heroX: number, levelHeight: number): KillLaunchSpec {
  const directionX: 1 | -1 = enemyX >= heroX ? 1 : -1;
  return {
    directionX,
    hopPx: 130,
    driftPx: directionX * 190,
    fallToY: levelHeight + 90,
    spinDeg: directionX * 630
  };
}

export const comboTiers: ComboTier[] = [
  { tier: 1, minCombo: 1, label: { en: "POW!", zh: "命中！" }, textColor: "#fef3c7", textScale: 1, soundKind: "kill" },
  { tier: 2, minCombo: 2, label: { en: "DOUBLE KO!", zh: "連擊 x2！" }, textColor: "#fbbf24", textScale: 1.2, soundKind: "combo2" },
  { tier: 3, minCombo: 3, label: { en: "RAMPAGE!", zh: "勢不可擋！" }, textColor: "#fb7185", textScale: 1.42, soundKind: "combo3" }
];

export function comboTierFor(comboCount: number): ComboTier {
  const clamped = Math.max(1, Math.floor(comboCount));
  return (
    comboTiers
      .slice()
      .reverse()
      .find((candidate) => clamped >= candidate.minCombo) ?? comboTiers[0]
  );
}

export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export type CreatureRarity = {
  id: "common" | "rare" | "epic";
  tier: 1 | 2 | 3;
  stars: 1 | 2 | 3;
  label: { en: string; zh: string };
  color: string;
  glowColor: number;
};

const commonRarity: CreatureRarity = {
  id: "common",
  tier: 1,
  stars: 1,
  label: { en: "Common catch", zh: "常見捕獲" },
  color: "#7dd3fc",
  glowColor: 0x7dd3fc
};
const rareRarity: CreatureRarity = {
  id: "rare",
  tier: 2,
  stars: 2,
  label: { en: "Rare catch", zh: "稀有捕獲" },
  color: "#c084fc",
  glowColor: 0xc084fc
};
const epicRarity: CreatureRarity = {
  id: "epic",
  tier: 3,
  stars: 3,
  label: { en: "Epic catch", zh: "史詩捕獲" },
  color: "#facc15",
  glowColor: 0xfacc15
};

// Keyed by the Phaser texture key each Fishing Master creature is created with.
export const creatureRarities: Record<string, CreatureRarity> = {
  smallFish: commonRarity,
  blueFish: commonRarity,
  octopus: rareRarity,
  lobster: rareRarity,
  stingray: rareRarity,
  shark: epicRarity,
  goldFish: epicRarity
};

export function creatureRarityFor(species: string): CreatureRarity {
  return creatureRarities[species] ?? commonRarity;
}

// Display names for the Fish-dex; keyed like creatureRarities.
export const creatureDisplayNames: Record<string, { en: string; zh: string }> = {
  smallFish: { en: "Small fish", zh: "小魚" },
  blueFish: { en: "Blue fish", zh: "藍魚" },
  goldFish: { en: "Golden fish", zh: "金魚" },
  shark: { en: "Shark", zh: "鯊魚" },
  octopus: { en: "Octopus", zh: "章魚" },
  lobster: { en: "Lobster", zh: "龍蝦" },
  stingray: { en: "Stingray", zh: "魟魚" }
};

export const fishingSpeciesTotal = Object.keys(creatureRarities).length;

// The server pays this per correct catch on top of the base coin rate:
// common +0, rare +1, epic +2 — always tier minus one.
export function rarityBonusForSpecies(species: string) {
  return creatureRarityFor(species).tier - 1;
}

// Catch choreography: wrap + struggle + reel must resolve fast enough that the
// math question never feels far away.
export const catchReelSpec = {
  struggleWiggleAngleDeg: 14,
  struggleWigglePeriodMs: 90,
  struggleRepeats: 2,
  reelMs: 700,
  netRadiusStartPx: 26,
  netRadiusEndPx: 14,
  ropeSagPx: 46,
  bubbleEveryMs: 90,
  reducedMotionDelayMs: 200
} as const;

export const escapeSwimSpec = {
  durationMs: 900,
  wiggleAngleDeg: 10,
  exitMarginPx: 90
} as const;

export const rippleSpec = {
  rings: 3,
  ringDelayMs: 110,
  startRadiusPx: 12,
  maxScale: 5,
  durationMs: 520
} as const;

// Deterministic upward-drifting bubbles (no RNG), same reasoning as the kill
// burst: reproducible for tests and identical between games.
export type BubbleSpec = {
  offsetX: number;
  risePx: number;
  sizePx: number;
  durationMs: number;
  delayMs: number;
};

export function bubbleBurstParticles(count = 10): BubbleSpec[] {
  const safeCount = Math.max(1, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => ({
    offsetX: (index - (safeCount - 1) / 2) * 9,
    risePx: 46 + (index % 4) * 18,
    sizePx: 2 + (index % 3) * 2,
    durationMs: 480 + (index % 5) * 90,
    delayMs: (index % 4) * 60
  }));
}

// ── M3: run stars + results ceremony ────────────────────────────────────────

export type RunStar = {
  id: string;
  earned: boolean;
  label: { en: string; zh: string };
};

// Adventure Island: the ceremony only shows on a trophy clear, so the first
// star is always earned; the other two reward careful play and pace.
export function adventureRunStars(run: {
  livesRemaining: number;
  maxLives: number;
  elapsedSeconds: number;
  targetSeconds: number;
}): RunStar[] {
  return [
    { id: "clear", earned: true, label: { en: "Trophy clear", zh: "獎盃通關" } },
    { id: "hearts", earned: run.livesRemaining >= run.maxLives, label: { en: "Kept every heart", zh: "保住所有愛心" } },
    { id: "clock", earned: run.elapsedSeconds <= run.targetSeconds, label: { en: "Beat the clock", zh: "跑贏時鐘" } }
  ];
}

export const fishingStarThresholds = { one: 1, two: 3, three: 5 } as const;

// Fishing Master: stars follow banked coins (distinct correct answers), the
// same number the server verifies — no client-only scorekeeping.
export function fishingRunStars(coins: number): RunStar[] {
  const safeCoins = Math.max(0, Math.floor(coins));
  return [
    { id: "first-coin", earned: safeCoins >= fishingStarThresholds.one, label: { en: "Banked a coin", zh: "收入金幣" } },
    { id: "three-coins", earned: safeCoins >= fishingStarThresholds.two, label: { en: "Banked 3 coins", zh: "收入 3 枚金幣" } },
    { id: "five-coins", earned: safeCoins >= fishingStarThresholds.three, label: { en: "Banked 5 coins", zh: "收入 5 枚金幣" } }
  ];
}

export function earnedStarCount(stars: RunStar[]) {
  return stars.filter((star) => star.earned).length;
}

export const ceremonyTimeline = {
  panelInMs: 320,
  countUpMs: 800,
  countUpStepMs: 40,
  starStaggerMs: 450,
  starPopMs: 380,
  newBestDelayMs: 500,
  confettiCount: 26
} as const;

export function ceremonyStarDelayMs(starIndex: number) {
  return ceremonyTimeline.panelInMs + ceremonyTimeline.countUpMs + starIndex * ceremonyTimeline.starStaggerMs;
}

export type ConfettiPiece = {
  leftPct: number;
  delayMs: number;
  durationMs: number;
  colorIndex: number;
  driftPx: number;
  rotateDeg: number;
  sizePx: number;
};

// Deterministic confetti (no RNG), same reasoning as every other juice spec.
export function confettiPieces(count = ceremonyTimeline.confettiCount): ConfettiPiece[] {
  const safeCount = Math.max(1, Math.floor(count));
  return Array.from({ length: safeCount }, (_, index) => ({
    leftPct: (index * 37) % 100,
    delayMs: (index % 7) * 130,
    durationMs: 1400 + (index % 5) * 260,
    colorIndex: index % killBurstColors.length,
    driftPx: ((index % 5) - 2) * 34,
    rotateDeg: 180 + (index % 4) * 140,
    sizePx: 6 + (index % 3) * 3
  }));
}

// ── Best-run store (per user, per game+topic; localStorage-first like the
// island star store) ─────────────────────────────────────────────────────────

export const gameBestStoragePrefix = "hk-math-game-best";

export function gameBestStorageKey(userId: string | null | undefined) {
  return `${gameBestStoragePrefix}:${userId ?? "guest"}`;
}

export function bestRunKey(gameId: string, topicId: string) {
  return `${gameId}:${topicId}`;
}

export function readGameBestRecord(value: string | null): Record<string, number> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, unknown> | null;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isInteger(entry[1]) && entry[1] >= 0 && entry[1] <= 3
      )
    );
  } catch {
    return {};
  }
}

export function isNewBestRun(record: Record<string, number>, key: string, stars: number) {
  return stars > 0 && stars > (record[key] ?? 0);
}

export function withBestRun(record: Record<string, number>, key: string, stars: number): Record<string, number> {
  const clamped = Math.max(0, Math.min(3, Math.floor(stars)));
  return { ...record, [key]: Math.max(clamped, record[key] ?? 0) };
}

export const gameSoundStoragePrefix = "hk-math-game-sound";

export function gameSoundStorageKey(userId: string | null | undefined) {
  return `${gameSoundStoragePrefix}:${userId ?? "guest"}`;
}

// Unlike quiet practice pages, the arcade games default to sound ON; only an
// explicit opt-out mutes them. Audio still needs the Start-button gesture
// before the browser lets an AudioContext run.
export function readGameSoundEnabled(value: string | null) {
  return value !== "false";
}
