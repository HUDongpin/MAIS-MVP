import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMathVirusBlasterHit,
  resolveMathVirusBlasterLevelResult
} from "./mathVirusBlaster";

test("resolveMathVirusBlasterHit rewards a correct overcharged topic hit with damage, coins, and combo", () => {
  const result = resolveMathVirusBlasterHit({
    targetHp: 42,
    targetCoinValue: 25,
    baseDamage: 20,
    combo: 4,
    mathCorrect: true,
    topicMatched: true,
    overcharged: true
  });

  assert.deepEqual(result, {
    damage: 46,
    defeated: true,
    coins: 58,
    nextCombo: 5,
    overchargeGain: 20,
    feedback: "critical"
  });
});

test("resolveMathVirusBlasterHit applies a glancing hit and resets combo after a wrong answer", () => {
  const result = resolveMathVirusBlasterHit({
    targetHp: 72,
    targetCoinValue: 40,
    baseDamage: 20,
    combo: 18,
    mathCorrect: false,
    topicMatched: false,
    overcharged: false
  });

  assert.deepEqual(result, {
    damage: 7,
    defeated: false,
    coins: 0,
    nextCombo: 1,
    overchargeGain: 0,
    feedback: "glancing"
  });
});

test("resolveMathVirusBlasterLevelResult clears at 80 percent with objective stars and rewards", () => {
  assert.deepEqual(
    resolveMathVirusBlasterLevelResult({
      totalViruses: 80,
      defeatedViruses: 66,
      elapsedSeconds: 92,
      timeLimitSeconds: 120,
      maxCombo: 32,
      questionsAnswered: 10,
      correctAnswers: 9,
      coins: 240
    }),
    {
      cleared: true,
      stars: 3,
      virusClearPercent: 83,
      accuracyPercent: 90,
      timeRemaining: 28,
      objectives: {
        clearEightyPercent: true,
        achieveThirtyCombo: true,
        finishWithinTime: true
      },
      reward: {
        coins: 520,
        xp: 99
      }
    }
  );

  assert.deepEqual(
    resolveMathVirusBlasterLevelResult({
      totalViruses: 80,
      defeatedViruses: 36,
      elapsedSeconds: 120,
      timeLimitSeconds: 120,
      maxCombo: 16,
      questionsAnswered: 5,
      correctAnswers: 3,
      coins: 100
    }),
    {
      cleared: false,
      stars: 1,
      virusClearPercent: 45,
      accuracyPercent: 60,
      timeRemaining: 0,
      objectives: {
        clearEightyPercent: false,
        achieveThirtyCombo: false,
        finishWithinTime: false
      },
      reward: {
        coins: 120,
        xp: 18
      }
    }
  );
});
