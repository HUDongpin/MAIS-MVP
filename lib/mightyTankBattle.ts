export const mightyTankBattleDraftPath = "/games/mighty-tank-battle" as const;

export type MightyTankBattleTarget = "enemy-tank" | "enemy-base" | "wall" | "miss";
export type MightyTankBattleShell = "standard" | "piercing" | "charged";
export type MightyTankBattleResultReason =
  | "enemy-base-destroyed"
  | "kill-lead-timeout"
  | "player-base-destroyed"
  | "kill-trail-timeout"
  | "battle-in-progress";

export type MightyTankBattleEngagementInput = {
  target: MightyTankBattleTarget;
  targetHp: number;
  baseDamage: number;
  mathCorrect: boolean;
  combo: number;
  shell: MightyTankBattleShell;
  cooldownMs: number;
};

export type MightyTankBattleEngagementResult = {
  damage: number;
  destroyed: boolean;
  coins: number;
  nextCombo: number;
  nextCooldownMs: number;
  specialCharge: number;
};

export type MightyTankBattleRewardInput = {
  cleared: boolean;
  stars: number;
  coins: number;
  accuracyPercent: number;
  timeRemaining: number;
};

export type MightyTankBattleReward = {
  coins: number;
  xp: number;
};

export type MightyTankBattleResultInput = {
  enemyBaseHp: number;
  playerBaseHp: number;
  playerKills: number;
  enemyKills: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
  questionsAnswered: number;
  correctAnswers: number;
  coins: number;
};

export type MightyTankBattleResult = {
  cleared: boolean;
  reason: MightyTankBattleResultReason;
  stars: number;
  accuracyPercent: number;
  timeRemaining: number;
  reward: MightyTankBattleReward;
};

const shellDamageMultiplier: Record<MightyTankBattleShell, number> = {
  standard: 1,
  piercing: 1.5,
  charged: 2.25
};

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));
}

export function resolveMightyTankBattleEngagement(
  input: MightyTankBattleEngagementInput
): MightyTankBattleEngagementResult {
  const targetHp = Math.max(0, Math.round(input.targetHp));
  const baseDamage = Math.max(0, Math.round(input.baseDamage));
  const combo = Math.max(1, Math.floor(input.combo));
  const cooldownMs = clampInteger(input.cooldownMs, 500, 3000);

  if (input.target === "miss") {
    return {
      damage: 0,
      destroyed: false,
      coins: 0,
      nextCombo: 1,
      nextCooldownMs: cooldownMs + 250,
      specialCharge: 0
    };
  }

  const damage = input.mathCorrect
    ? Math.round(baseDamage * shellDamageMultiplier[input.shell])
    : Math.floor(baseDamage * 0.25);
  const destroyed = targetHp > 0 && damage >= targetHp;
  const shellBonus = input.mathCorrect && input.shell !== "standard" ? 10 : 0;
  const targetCoins = input.target === "enemy-base" ? 70 : input.target === "enemy-tank" ? 40 : 12;
  const destroyedBonus = destroyed ? (input.target === "enemy-base" ? 120 : 35) : 0;

  return {
    damage,
    destroyed,
    coins: input.mathCorrect ? targetCoins + combo * 10 + destroyedBonus + shellBonus : 0,
    nextCombo: input.mathCorrect ? combo + 1 : 1,
    nextCooldownMs: input.mathCorrect ? Math.max(650, cooldownMs - 350) : cooldownMs + 550,
    specialCharge: input.mathCorrect ? (input.target === "enemy-base" ? 12 : 18) : 0
  };
}

export function calculateMightyTankBattleReward(input: MightyTankBattleRewardInput): MightyTankBattleReward {
  const coins = Math.max(0, Math.round(input.coins));
  const stars = clampInteger(input.stars, 0, 3);
  const accuracyPercent = clampInteger(input.accuracyPercent, 0, 100);
  const timeRemaining = Math.max(0, Math.round(input.timeRemaining));

  if (!input.cleared) {
    return {
      coins: coins + stars * 10,
      xp: 10 + stars * 8
    };
  }

  const starBonus = stars * 50;
  const accuracyBonus = accuracyPercent >= 80 ? 50 : accuracyPercent >= 60 ? 10 : 0;
  const timeBonus = Math.floor(timeRemaining / 10) * 10;

  return {
    coins: coins + starBonus + accuracyBonus + timeBonus,
    xp: 25 + stars * 15 + (accuracyPercent >= 80 ? 25 : 0)
  };
}

export function resolveMightyTankBattleResult(input: MightyTankBattleResultInput): MightyTankBattleResult {
  const timeLimitSeconds = Math.max(1, Math.round(input.timeLimitSeconds));
  const elapsedSeconds = Math.max(0, Math.round(input.elapsedSeconds));
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const questionsAnswered = Math.max(0, Math.round(input.questionsAnswered));
  const correctAnswers = Math.max(0, Math.round(input.correctAnswers));
  const accuracyPercent = questionsAnswered === 0 ? 0 : Math.round((correctAnswers / questionsAnswered) * 100);

  let cleared = false;
  let reason: MightyTankBattleResultReason = "battle-in-progress";

  if (input.playerBaseHp <= 0) {
    reason = "player-base-destroyed";
  } else if (input.enemyBaseHp <= 0) {
    cleared = true;
    reason = "enemy-base-destroyed";
  } else if (elapsedSeconds >= timeLimitSeconds && input.playerKills > input.enemyKills) {
    cleared = true;
    reason = "kill-lead-timeout";
  } else if (elapsedSeconds >= timeLimitSeconds) {
    reason = "kill-trail-timeout";
  }

  let stars = 0;
  if (cleared && accuracyPercent >= 80 && timeRemaining >= 20 && input.playerBaseHp >= 500) {
    stars = 3;
  } else if (cleared) {
    stars = 2;
  } else if (input.playerKills > 0 || input.coins >= 150 || accuracyPercent >= 50) {
    stars = 1;
  }

  return {
    cleared,
    reason,
    stars,
    accuracyPercent,
    timeRemaining,
    reward: calculateMightyTankBattleReward({
      cleared,
      stars,
      coins: input.coins,
      accuracyPercent,
      timeRemaining
    })
  };
}
