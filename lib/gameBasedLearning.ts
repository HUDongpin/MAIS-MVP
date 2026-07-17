export const studentPracticeGamesPath = "/student/practice/games" as const;
export const mathMatchQuestDraftPath = `${studentPracticeGamesPath}/math-match-quest` as const;
export const legacyMathMatchQuestDraftPath = "/games/math-match-quest" as const;
export const practiceAdventureRoundStorageKey = "hk-math-practice-adventure-round" as const;
export const completedPracticeRoundStoragePrefix = "hk-math-practice-completed-round" as const;

export function completedPracticeRoundStorageKey(userId: string | null | undefined) {
  return `${completedPracticeRoundStoragePrefix}:${userId ?? "guest"}`;
}

export const studentPracticeGameSlugs = {
  adventureIsland: "adventure-island",
  fishingMaster: "fishing-master"
} as const;

export type StudentPracticeGameSlug = typeof studentPracticeGameSlugs[keyof typeof studentPracticeGameSlugs];

export const studentPracticeGameHrefs = {
  adventureIsland: `${studentPracticeGamesPath}/${studentPracticeGameSlugs.adventureIsland}`,
  fishingMaster: `${studentPracticeGamesPath}/${studentPracticeGameSlugs.fishingMaster}`
} as const;

const studentPracticeGameSlugSet = new Set<string>(Object.values(studentPracticeGameSlugs));

export function isStudentPracticeGameSlug(value: string): value is StudentPracticeGameSlug {
  return studentPracticeGameSlugSet.has(value);
}

export function isImmersiveStudentPracticeGamePath(pathname: string) {
  return (
    pathname === mathMatchQuestDraftPath ||
    pathname === legacyMathMatchQuestDraftPath ||
    pathname === studentPracticeGamesPath ||
    pathname.startsWith(`${studentPracticeGamesPath}/`)
  );
}

export type MathMatchQuestTileFamily =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "fraction"
  | "geometry"
  | "pattern"
  | "algebra";

export type MathMatchQuestTile = {
  id: string;
  family: MathMatchQuestTileFamily;
  label: string;
  value: number;
  accent?: string;
  ariaLabel?: string;
};

export type MathMatchQuestMatchCell = {
  row: number;
  col: number;
};

export type MathMatchQuestMatch = {
  family: MathMatchQuestTileFamily;
  orientation: "horizontal" | "vertical";
  cells: MathMatchQuestMatchCell[];
};

export type MathMatchQuestRewardInput = {
  matchedTileCount: number;
  mathCorrect: boolean;
  combo: number;
  movesRemaining: number;
  levelCleared: boolean;
};

export type MathMatchQuestReward = {
  coins: number;
  score: number;
  comboMultiplier: number;
};

export type MathMatchQuestLevelResultInput = {
  score: number;
  targetScore: number;
  movesUsed: number;
  movesLimit: number;
  questionsAnswered: number;
  correctAnswers: number;
};

export type MathMatchQuestLevelResult = {
  cleared: boolean;
  stars: number;
  accuracyPercent: number;
  efficiencyPercent: number;
};

function sameTileFamily(a: MathMatchQuestTile | undefined, b: MathMatchQuestTile | undefined) {
  return Boolean(a && b && a.family === b.family);
}

function isValidBoard(board: readonly (readonly MathMatchQuestTile[])[]) {
  if (board.length === 0) return false;
  const width = board[0]?.length ?? 0;
  return width > 0 && board.every((row) => row.length === width);
}

export function findMathMatchQuestMatches(
  board: readonly (readonly MathMatchQuestTile[])[],
  minimumRunLength = 3
): MathMatchQuestMatch[] {
  if (!isValidBoard(board) || minimumRunLength < 2) return [];

  const height = board.length;
  const width = board[0].length;
  const matches: MathMatchQuestMatch[] = [];

  for (let row = 0; row < height; row += 1) {
    let startCol = 0;
    for (let col = 1; col <= width; col += 1) {
      if (col < width && sameTileFamily(board[row][startCol], board[row][col])) continue;
      const runLength = col - startCol;
      if (runLength >= minimumRunLength) {
        matches.push({
          family: board[row][startCol].family,
          orientation: "horizontal",
          cells: Array.from({ length: runLength }, (_, offset) => ({ row, col: startCol + offset }))
        });
      }
      startCol = col;
    }
  }

  for (let col = 0; col < width; col += 1) {
    let startRow = 0;
    for (let row = 1; row <= height; row += 1) {
      if (row < height && sameTileFamily(board[startRow][col], board[row][col])) continue;
      const runLength = row - startRow;
      if (runLength >= minimumRunLength) {
        matches.push({
          family: board[startRow][col].family,
          orientation: "vertical",
          cells: Array.from({ length: runLength }, (_, offset) => ({ row: startRow + offset, col }))
        });
      }
      startRow = row;
    }
  }

  return matches;
}

export function calculateMathMatchQuestReward(input: MathMatchQuestRewardInput): MathMatchQuestReward {
  const matchedTileCount = Math.max(0, Math.floor(input.matchedTileCount));
  const combo = Math.max(1, Math.floor(input.combo));
  const comboMultiplier = Number((1 + Math.min(combo - 1, 4) * 0.2).toFixed(1));
  const matchCoins = matchedTileCount * 6;
  const mathBonusCoins = input.mathCorrect ? 20 : 0;
  const comboCoins = Math.max(0, combo - 1) * 5;
  const clearCoins = input.levelCleared ? 50 : 0;
  const score = matchedTileCount * 90 + (input.mathCorrect ? 80 : 0) + Math.max(0, combo - 1) * 30;

  return {
    coins: matchCoins + mathBonusCoins + comboCoins + clearCoins,
    score,
    comboMultiplier
  };
}

export function resolveMathMatchQuestLevelResult(
  input: MathMatchQuestLevelResultInput
): MathMatchQuestLevelResult {
  const targetScore = Math.max(1, input.targetScore);
  const movesLimit = Math.max(1, input.movesLimit);
  const questionsAnswered = Math.max(0, input.questionsAnswered);
  const correctAnswers = Math.max(0, input.correctAnswers);
  const movesRemaining = Math.max(0, movesLimit - Math.max(0, input.movesUsed));
  const accuracyPercent = questionsAnswered === 0 ? 0 : Math.round((correctAnswers / questionsAnswered) * 100);
  const efficiencyPercent = Math.round((movesRemaining / movesLimit) * 100);
  const cleared = input.score >= targetScore;

  let stars = 0;
  if (cleared && accuracyPercent >= 85 && efficiencyPercent >= 30) {
    stars = 3;
  } else if (cleared) {
    stars = 2;
  } else if (input.score >= targetScore * 0.5 || accuracyPercent >= 60) {
    stars = 1;
  }

  return {
    cleared,
    stars,
    accuracyPercent,
    efficiencyPercent
  };
}
