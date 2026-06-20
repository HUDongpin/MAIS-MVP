import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMightyTankBattleReward,
  resolveMightyTankBattleEngagement,
  resolveMightyTankBattleResult
} from "./mightyTankBattle";

test("resolveMightyTankBattleEngagement turns a correct enemy hit into damage, coins, and combo", () => {
  const result = resolveMightyTankBattleEngagement({
    target: "enemy-tank",
    targetHp: 90,
    baseDamage: 80,
    mathCorrect: true,
    combo: 2,
    shell: "piercing",
    cooldownMs: 1300
  });

  assert.equal(result.damage, 120);
  assert.equal(result.destroyed, true);
  assert.equal(result.coins, 105);
  assert.equal(result.nextCombo, 3);
  assert.equal(result.nextCooldownMs, 950);
  assert.equal(result.specialCharge, 18);
});

test("resolveMightyTankBattleEngagement applies a glancing hit and resets combo after a wrong answer", () => {
  const result = resolveMightyTankBattleEngagement({
    target: "enemy-base",
    targetHp: 900,
    baseDamage: 120,
    mathCorrect: false,
    combo: 4,
    shell: "standard",
    cooldownMs: 1300
  });

  assert.equal(result.damage, 30);
  assert.equal(result.destroyed, false);
  assert.equal(result.coins, 0);
  assert.equal(result.nextCombo, 1);
  assert.equal(result.nextCooldownMs, 1850);
  assert.equal(result.specialCharge, 0);
});

test("resolveMightyTankBattleResult clears by base destruction or kill lead and assigns stars", () => {
  assert.deepEqual(
    resolveMightyTankBattleResult({
      enemyBaseHp: 0,
      playerBaseHp: 820,
      playerKills: 5,
      enemyKills: 1,
      elapsedSeconds: 88,
      timeLimitSeconds: 120,
      questionsAnswered: 6,
      correctAnswers: 5,
      coins: 430
    }),
    {
      cleared: true,
      reason: "enemy-base-destroyed",
      stars: 3,
      accuracyPercent: 83,
      timeRemaining: 32,
      reward: { coins: 660, xp: 95 }
    }
  );

  assert.deepEqual(
    resolveMightyTankBattleResult({
      enemyBaseHp: 340,
      playerBaseHp: 380,
      playerKills: 4,
      enemyKills: 2,
      elapsedSeconds: 120,
      timeLimitSeconds: 120,
      questionsAnswered: 5,
      correctAnswers: 3,
      coins: 210
    }),
    {
      cleared: true,
      reason: "kill-lead-timeout",
      stars: 2,
      accuracyPercent: 60,
      timeRemaining: 0,
      reward: { coins: 320, xp: 55 }
    }
  );
});

test("calculateMightyTankBattleReward scales payout with stars, accuracy, and remaining time", () => {
  assert.deepEqual(
    calculateMightyTankBattleReward({
      cleared: true,
      stars: 3,
      coins: 430,
      accuracyPercent: 83,
      timeRemaining: 32
    }),
    { coins: 660, xp: 95 }
  );

  assert.deepEqual(
    calculateMightyTankBattleReward({
      cleared: false,
      stars: 1,
      coins: 180,
      accuracyPercent: 50,
      timeRemaining: 0
    }),
    { coins: 190, xp: 18 }
  );
});
