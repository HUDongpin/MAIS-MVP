export type MathVirusBlasterHitFeedback = "critical" | "hit" | "glancing";

export type MathVirusBlasterHitInput = {
  targetHp: number;
  targetCoinValue: number;
  baseDamage: number;
  combo: number;
  mathCorrect: boolean;
  topicMatched: boolean;
  overcharged: boolean;
};

export type MathVirusBlasterHitResult = {
  damage: number;
  defeated: boolean;
  coins: number;
  nextCombo: number;
  overchargeGain: number;
  feedback: MathVirusBlasterHitFeedback;
};

export type MathVirusBlasterLevelResultInput = {
  totalViruses: number;
  defeatedViruses: number;
  elapsedSeconds: number;
  timeLimitSeconds: number;
  maxCombo: number;
  questionsAnswered: number;
  correctAnswers: number;
  coins: number;
};

export type MathVirusBlasterObjectives = {
  clearEightyPercent: boolean;
  achieveThirtyCombo: boolean;
  finishWithinTime: boolean;
};

export type MathVirusBlasterReward = {
  coins: number;
  xp: number;
};

export type MathVirusBlasterLevelResult = {
  cleared: boolean;
  stars: number;
  virusClearPercent: number;
  accuracyPercent: number;
  timeRemaining: number;
  objectives: MathVirusBlasterObjectives;
  reward: MathVirusBlasterReward;
};

function finiteNumber(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(finiteNumber(value, min))));
}

export function resolveMathVirusBlasterHit(input: MathVirusBlasterHitInput): MathVirusBlasterHitResult {
  const targetHp = Math.max(0, Math.round(finiteNumber(input.targetHp)));
  const targetCoinValue = Math.max(0, Math.round(finiteNumber(input.targetCoinValue)));
  const baseDamage = Math.max(1, Math.round(finiteNumber(input.baseDamage, 1)));
  const combo = Math.max(1, Math.floor(finiteNumber(input.combo, 1)));

  if (!input.mathCorrect) {
    const damage = Math.max(1, Math.floor(baseDamage * 0.35));
    return {
      damage,
      defeated: targetHp > 0 && damage >= targetHp,
      coins: 0,
      nextCombo: 1,
      overchargeGain: 0,
      feedback: "glancing"
    };
  }

  const topicMultiplier = input.topicMatched ? 1.25 : 1;
  const overchargeMultiplier = input.overcharged ? 1.5 : 1;
  const comboDamageBonus = Math.min(combo, 20) * 2;
  const damage = Math.round(baseDamage * topicMultiplier * overchargeMultiplier + comboDamageBonus);
  const defeated = targetHp > 0 && damage >= targetHp;
  const coins = 15 + combo * 2 + (input.topicMatched ? 10 : 0) + (defeated ? targetCoinValue : 0);

  return {
    damage,
    defeated,
    coins,
    nextCombo: combo + 1,
    overchargeGain: 12 + (defeated ? 8 : 0),
    feedback: input.topicMatched || input.overcharged ? "critical" : "hit"
  };
}

export function calculateMathVirusBlasterReward(input: {
  cleared: boolean;
  stars: number;
  coins: number;
  accuracyPercent: number;
  timeRemaining: number;
}): MathVirusBlasterReward {
  const coins = Math.max(0, Math.round(finiteNumber(input.coins)));
  const stars = clampInteger(input.stars, 0, 3);
  const accuracyPercent = clampInteger(input.accuracyPercent, 0, 100);
  const timeRemaining = Math.max(0, Math.round(finiteNumber(input.timeRemaining)));

  if (!input.cleared) {
    return {
      coins: coins + stars * 20,
      xp: 10 + stars * 8
    };
  }

  const starBonus = stars * 60;
  const accuracyBonus = accuracyPercent >= 90 ? 80 : accuracyPercent >= 75 ? 30 : 0;
  const timeBonus = Math.floor(timeRemaining / 10) * 10;

  return {
    coins: coins + starBonus + accuracyBonus + timeBonus,
    xp: 20 + stars * 18 + 25
  };
}

export function resolveMathVirusBlasterLevelResult(
  input: MathVirusBlasterLevelResultInput
): MathVirusBlasterLevelResult {
  const totalViruses = Math.max(1, Math.round(finiteNumber(input.totalViruses, 1)));
  const defeatedViruses = clampInteger(input.defeatedViruses, 0, totalViruses);
  const timeLimitSeconds = Math.max(1, Math.round(finiteNumber(input.timeLimitSeconds, 1)));
  const elapsedSeconds = Math.max(0, Math.round(finiteNumber(input.elapsedSeconds)));
  const questionsAnswered = Math.max(0, Math.round(finiteNumber(input.questionsAnswered)));
  const correctAnswers = clampInteger(input.correctAnswers, 0, questionsAnswered);
  const virusClearPercent = Math.round((defeatedViruses / totalViruses) * 100);
  const accuracyPercent = questionsAnswered === 0 ? 0 : Math.round((correctAnswers / questionsAnswered) * 100);
  const timeRemaining = Math.max(0, timeLimitSeconds - elapsedSeconds);
  const objectives: MathVirusBlasterObjectives = {
    clearEightyPercent: virusClearPercent >= 80,
    achieveThirtyCombo: input.maxCombo >= 30,
    finishWithinTime: elapsedSeconds < timeLimitSeconds
  };
  const cleared = objectives.clearEightyPercent;

  let stars = 0;
  if (cleared && objectives.achieveThirtyCombo && objectives.finishWithinTime && accuracyPercent >= 80) {
    stars = 3;
  } else if (cleared) {
    stars = 2;
  } else if (virusClearPercent >= 50 || accuracyPercent >= 50) {
    stars = 1;
  }

  return {
    cleared,
    stars,
    virusClearPercent,
    accuracyPercent,
    timeRemaining,
    objectives,
    reward: calculateMathVirusBlasterReward({
      cleared,
      stars,
      coins: input.coins,
      accuracyPercent,
      timeRemaining
    })
  };
}
