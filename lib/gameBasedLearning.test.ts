import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMathMatchQuestReward,
  completedPracticeRoundStorageKey,
  completedPracticeRoundStoragePrefix,
  findMathMatchQuestMatches,
  practiceAdventureRoundStorageKey,
  resolveMathMatchQuestLevelResult,
  type MathMatchQuestTile
} from "./gameBasedLearning";

function tile(id: string, family: MathMatchQuestTile["family"]): MathMatchQuestTile {
  return {
    id,
    family,
    label: id.toUpperCase(),
    value: 1
  };
}

test("findMathMatchQuestMatches detects horizontal and vertical runs without duplicate cells", () => {
  const board: MathMatchQuestTile[][] = [
    [tile("a1", "addition"), tile("a2", "addition"), tile("a3", "addition"), tile("m1", "multiplication")],
    [tile("f1", "fraction"), tile("g1", "geometry"), tile("s1", "subtraction"), tile("m2", "multiplication")],
    [tile("g2", "geometry"), tile("f2", "fraction"), tile("s2", "subtraction"), tile("m3", "multiplication")],
    [tile("f3", "fraction"), tile("g3", "geometry"), tile("f4", "fraction"), tile("p1", "pattern")]
  ];

  const matches = findMathMatchQuestMatches(board);

  assert.deepEqual(
    matches.map((match) => ({
      family: match.family,
      orientation: match.orientation,
      cells: match.cells
    })),
    [
      {
        family: "addition",
        orientation: "horizontal",
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 }
        ]
      },
      {
        family: "multiplication",
        orientation: "vertical",
        cells: [
          { row: 0, col: 3 },
          { row: 1, col: 3 },
          { row: 2, col: 3 }
        ]
      }
    ]
  );
});

test("calculateMathMatchQuestReward pays match coins, math bonus, combo bonus, and clear bonus", () => {
  const reward = calculateMathMatchQuestReward({
    matchedTileCount: 4,
    mathCorrect: true,
    combo: 3,
    movesRemaining: 6,
    levelCleared: true
  });

  assert.equal(reward.coins, 104);
  assert.equal(reward.score, 500);
  assert.equal(reward.comboMultiplier, 1.4);
});

test("resolveMathMatchQuestLevelResult uses target progress, answer accuracy, and move efficiency for stars", () => {
  assert.deepEqual(
    resolveMathMatchQuestLevelResult({
      score: 1800,
      targetScore: 1500,
      movesUsed: 10,
      movesLimit: 18,
      questionsAnswered: 6,
      correctAnswers: 6
    }),
    {
      cleared: true,
      stars: 3,
      accuracyPercent: 100,
      efficiencyPercent: 44
    }
  );

  assert.deepEqual(
    resolveMathMatchQuestLevelResult({
      score: 820,
      targetScore: 1500,
      movesUsed: 16,
      movesLimit: 18,
      questionsAnswered: 5,
      correctAnswers: 3
    }),
    {
      cleared: false,
      stars: 1,
      accuracyPercent: 60,
      efficiencyPercent: 11
    }
  );
});

test("practice game storage keys are stable and scoped per user", () => {
  assert.equal(practiceAdventureRoundStorageKey, "hk-math-practice-adventure-round");
  assert.equal(completedPracticeRoundStoragePrefix, "hk-math-practice-completed-round");
  assert.equal(completedPracticeRoundStorageKey("student-123"), "hk-math-practice-completed-round:student-123");
  assert.equal(completedPracticeRoundStorageKey(undefined), "hk-math-practice-completed-round:guest");
});
