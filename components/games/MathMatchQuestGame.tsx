"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  mathMatchQuestFamilyMeta,
  mathMatchQuestLevels,
  mathMatchQuestQuestions,
  type MathMatchQuestLevel,
  type MathMatchQuestQuestion
} from "@/data/gameBasedLearning";
import {
  calculateMathMatchQuestReward,
  findMathMatchQuestMatches,
  resolveMathMatchQuestLevelResult,
  type MathMatchQuestMatch,
  type MathMatchQuestMatchCell,
  type MathMatchQuestTile,
  type MathMatchQuestTileFamily
} from "@/lib/gameBasedLearning";
import { cn } from "@/lib/utils";
import { useSettings } from "@/components/providers/AppProviders";
import type { LocalizedText } from "@/types";

type Board = MathMatchQuestTile[][];
type Position = { row: number; col: number };
type GamePhase = "playing" | "question" | "cleared" | "failed";
type GameView = "map" | "board";

type PendingMatch = {
  matches: MathMatchQuestMatch[];
  cells: MathMatchQuestMatchCell[];
  family: MathMatchQuestTileFamily;
};

type RuntimeStats = {
  score: number;
  coins: number;
  movesUsed: number;
  combo: number;
  questionsAnswered: number;
  correctAnswers: number;
};

type DraftProgress = {
  bankedCoins: number;
  completedLevelIds: string[];
  starsByLevelId: Record<string, number>;
  bestScoreByLevelId: Record<string, number>;
};

const boardRows = 6;
const boardColumns = 7;
const progressStorageKey = "mais-math-match-quest-draft-progress-v1";
const referenceArtMode = true;
const referenceArtInteractiveLayer = referenceArtMode ? "!opacity-0" : "";
const referenceArtDecorLayer = referenceArtMode ? "pointer-events-none !opacity-0" : "";
const defaultProgress: DraftProgress = {
  bankedCoins: 0,
  completedLevelIds: [],
  starsByLevelId: {},
  bestScoreByLevelId: {}
};
const defaultStats: RuntimeStats = {
  score: 0,
  coins: 0,
  movesUsed: 0,
  combo: 1,
  questionsAnswered: 0,
  correctAnswers: 0
};
const mapNodePositions = [
  { levelNumber: 1, x: 54, y: 73 },
  { levelNumber: 2, x: 37, y: 65 },
  { levelNumber: 3, x: 51, y: 58 },
  { levelNumber: 4, x: 60, y: 50 },
  { levelNumber: 5, x: 33, y: 45 },
  { levelNumber: 6, x: 45, y: 39 },
  { levelNumber: 7, x: 60, y: 29 }
] as const;
const boosterItems = [
  { label: "Star", count: 3, color: "from-yellow-200 via-amber-300 to-orange-500", mark: "★" },
  { label: "Hammer", count: 3, color: "from-red-200 via-orange-400 to-rose-500", mark: "T" },
  { label: "Swap", count: 3, color: "from-pink-200 via-fuchsia-400 to-indigo-500", mark: "~" },
  { label: "Freeze", count: 3, color: "from-cyan-100 via-sky-300 to-blue-500", mark: "=" },
  { label: "Hand", count: 3, color: "from-lime-100 via-emerald-300 to-teal-500", mark: "5" }
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cellKey(cell: MathMatchQuestMatchCell) {
  return `${cell.row}:${cell.col}`;
}

function readProgress(value: string | null): DraftProgress {
  if (!value) return defaultProgress;

  try {
    const parsed = JSON.parse(value) as Partial<DraftProgress>;
    if (!Array.isArray(parsed.completedLevelIds)) return defaultProgress;
    return {
      bankedCoins: typeof parsed.bankedCoins === "number" && Number.isFinite(parsed.bankedCoins) ? parsed.bankedCoins : 0,
      completedLevelIds: parsed.completedLevelIds.filter((id): id is string => typeof id === "string"),
      starsByLevelId: typeof parsed.starsByLevelId === "object" && parsed.starsByLevelId !== null ? parsed.starsByLevelId as Record<string, number> : {},
      bestScoreByLevelId: typeof parsed.bestScoreByLevelId === "object" && parsed.bestScoreByLevelId !== null ? parsed.bestScoreByLevelId as Record<string, number> : {}
    };
  } catch {
    return defaultProgress;
  }
}

function chooseFamily(level: MathMatchQuestLevel, row: number, col: number, salt: number) {
  const families = level.families;
  const index = Math.abs(level.boardSeed + salt * 3 + row * 11 + col * 7 + row * col) % families.length;
  return families[index];
}

function createsImmediateRun(board: Board, row: number, col: number, family: MathMatchQuestTileFamily) {
  const leftRun =
    col >= 2 &&
    board[row]?.[col - 1]?.family === family &&
    board[row]?.[col - 2]?.family === family;
  const upperRun =
    row >= 2 &&
    board[row - 1]?.[col]?.family === family &&
    board[row - 2]?.[col]?.family === family;
  return leftRun || upperRun;
}

function buildTile(level: MathMatchQuestLevel, row: number, col: number, salt: number, board: Board): MathMatchQuestTile {
  let family = chooseFamily(level, row, col, salt);
  let guard = 0;
  while (createsImmediateRun(board, row, col, family) && guard < level.families.length) {
    family = level.families[(level.families.indexOf(family) + 1) % level.families.length];
    guard += 1;
  }
  const meta = mathMatchQuestFamilyMeta[family];

  return {
    id: `${level.id}-${row}-${col}-${salt}-${family}`,
    family,
    label: meta.tileLabel,
    value: row * boardColumns + col + salt,
    accent: meta.accent,
    ariaLabel: `${family} tile at row ${row + 1}, column ${col + 1}`
  };
}

function createBoard(level: MathMatchQuestLevel, salt = 0): Board {
  const board: Board = [];
  for (let row = 0; row < boardRows; row += 1) {
    board[row] = [];
    for (let col = 0; col < boardColumns; col += 1) {
      board[row][col] = buildTile(level, row, col, salt, board);
    }
  }
  return board;
}

function swapBoardTiles(board: Board, first: Position, second: Position): Board {
  const next = board.map((row) => row.slice());
  const firstTile = next[first.row][first.col];
  next[first.row][first.col] = next[second.row][second.col];
  next[second.row][second.col] = firstTile;
  return next;
}

function areAdjacent(first: Position, second: Position) {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function uniqueCells(matches: MathMatchQuestMatch[]) {
  const seen = new Set<string>();
  const cells: MathMatchQuestMatchCell[] = [];
  matches.forEach((match) => {
    match.cells.forEach((cell) => {
      const key = cellKey(cell);
      if (seen.has(key)) return;
      seen.add(key);
      cells.push(cell);
    });
  });
  return cells;
}

function refillMatchedCells(board: Board, level: MathMatchQuestLevel, cells: MathMatchQuestMatchCell[], salt: number): Board {
  const next = board.map((row) => row.slice());
  cells.forEach((cell, index) => {
    next[cell.row][cell.col] = buildTile(level, cell.row, cell.col, salt + index + 1, next);
  });
  return next;
}

function findAvailableSwap(board: Board): [Position, Position] | null {
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const first = { row, col };
      const candidates = [
        { row, col: col + 1 },
        { row: row + 1, col }
      ];
      for (const second of candidates) {
        if (!board[second.row]?.[second.col]) continue;
        if (findMathMatchQuestMatches(swapBoardTiles(board, first, second)).length > 0) {
          return [first, second];
        }
      }
    }
  }
  return null;
}

function questionForFamily(family: MathMatchQuestTileFamily, offset: number) {
  const candidates = mathMatchQuestQuestions.filter((question) => question.family === family);
  const fallback = mathMatchQuestQuestions;
  const list = candidates.length > 0 ? candidates : fallback;
  return list[offset % list.length];
}

function progressForLevel(score: number, targetScore: number) {
  return clamp(Math.round((score / targetScore) * 100), 0, 100);
}

function Stars({ count, label }: { count: number; label: string }) {
  return (
    <div className="flex items-center gap-1" aria-label={label}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "grid h-6 w-6 place-items-center rounded-full border text-xs font-black",
            index < count
              ? "border-amber-300 bg-amber-300 text-slate-950 shadow-sm shadow-amber-300/40"
              : "border-white/20 bg-white/10 text-white/40"
          )}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StatPill({ label, value, tone }: { label: string; value: string | number; tone: "cyan" | "amber" | "emerald" | "rose" }) {
  const toneClass = {
    cyan: "border-cyan-300/40 bg-cyan-300/10 text-cyan-50",
    amber: "border-amber-300/40 bg-amber-300/10 text-amber-50",
    emerald: "border-emerald-300/40 bg-emerald-300/10 text-emerald-50",
    rose: "border-rose-300/40 bg-rose-300/10 text-rose-50"
  }[tone];

  return (
    <div className={cn("rounded-lg border px-3 py-2 shadow-sm backdrop-blur", toneClass)}>
      <p className="text-[0.65rem] font-black uppercase text-white/60">{label}</p>
      <p className="mt-1 text-lg font-black leading-none">{value}</p>
    </div>
  );
}

function ResourcePill({ mark, value, tone }: { mark: string; value: string | number; tone: "gold" | "heart" | "blue" }) {
  const toneClass = {
    gold: "from-yellow-200 via-amber-300 to-orange-500 text-amber-950",
    heart: "from-rose-200 via-red-400 to-pink-600 text-white",
    blue: "from-sky-100 via-cyan-300 to-blue-500 text-blue-950"
  }[tone];

  return (
    <div className="flex h-10 items-center gap-2 rounded-full border border-white/55 bg-white/35 px-2 pr-3 text-sm font-black text-white shadow-lg shadow-sky-950/20 backdrop-blur-md">
      <span className={cn("grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br shadow-inner", toneClass)}>{mark}</span>
      <span className="drop-shadow-sm">{value}</span>
      <span className="grid h-6 w-6 place-items-center rounded-full bg-lime-400 text-sm text-lime-950 shadow-md shadow-lime-900/20">+</span>
    </div>
  );
}

function RoundIconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/55 bg-sky-500/70 text-lg font-black text-white shadow-lg shadow-sky-950/25 backdrop-blur transition hover:scale-105 focus-ring"
    >
      {children}
    </button>
  );
}

function CreatureTile({
  tile,
  selected,
  matched,
  disabled,
  onClick
}: {
  tile: MathMatchQuestTile;
  selected: boolean;
  matched: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const family = mathMatchQuestFamilyMeta[tile.family];
  const creatureShape = {
    addition: "rounded-[45%_55%_48%_52%]",
    subtraction: "rounded-[58%_42%_52%_48%]",
    multiplication: "rounded-[44%_44%_58%_58%]",
    division: "rounded-[52%_48%_44%_56%]",
    fraction: "rounded-[48%]",
    geometry: "rounded-[42%_58%_42%_58%]",
    pattern: "rounded-[55%_45%_55%_45%]",
    algebra: "rounded-[46%_54%_46%_54%]"
  }[tile.family];

  return (
    <button
      type="button"
      aria-label={tile.ariaLabel}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative aspect-square min-h-0 rounded-xl border border-sky-900/55 bg-sky-950/50 p-1 shadow-inner shadow-sky-950 transition duration-200 focus-ring",
        selected && "scale-105 border-white ring-4 ring-white/55",
        matched && "animate-pulse border-amber-200 ring-4 ring-amber-200/45",
        !disabled && "hover:-translate-y-0.5 hover:brightness-110"
      )}
    >
      <span className={cn("relative grid h-full w-full place-items-center overflow-hidden rounded-[0.65rem] bg-gradient-to-br text-white shadow-lg", family.accent, family.glow)}>
        <span className="absolute left-1 top-1 h-2 w-2 rounded-full bg-white/55" />
        <span className={cn("relative h-[72%] w-[78%] bg-white/24 shadow-inner shadow-white/30", creatureShape)}>
          <span className="absolute -left-[12%] top-[34%] h-[25%] w-[20%] rounded-full bg-white/24" />
          <span className="absolute -right-[12%] top-[34%] h-[25%] w-[20%] rounded-full bg-white/24" />
          <span className="absolute left-[22%] top-[28%] h-[14%] w-[14%] rounded-full bg-slate-900" />
          <span className="absolute right-[22%] top-[28%] h-[14%] w-[14%] rounded-full bg-slate-900" />
          <span className="absolute left-[30%] top-[55%] h-[10%] w-[40%] rounded-b-full border-b-4 border-slate-900/75" />
          <span className="absolute left-[18%] top-[47%] h-[10%] w-[13%] rounded-full bg-white/30" />
          <span className="absolute right-[18%] top-[47%] h-[10%] w-[13%] rounded-full bg-white/30" />
        </span>
        <span className="absolute bottom-1 right-1 grid h-6 min-w-6 place-items-center rounded-full border border-white/60 bg-white/85 px-1 text-sm font-black leading-none text-blue-900 shadow-md">
          {tile.label}
        </span>
      </span>
    </button>
  );
}

function BoosterButton({ item, disabled, onClick }: { item: typeof boosterItems[number]; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={item.label}
      disabled={disabled}
      onClick={onClick}
      className="relative grid aspect-square min-h-14 place-items-center rounded-2xl border border-white/45 bg-white/25 p-2 shadow-lg shadow-blue-950/20 backdrop-blur transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 focus-ring"
    >
      <span className={cn("grid h-full w-full place-items-center rounded-xl bg-gradient-to-br text-xl font-black text-white shadow-inner", item.color)}>
        {item.mark}
      </span>
      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-lime-400 text-sm font-black text-lime-950 shadow-md">
        {item.count}
      </span>
    </button>
  );
}

export function MathMatchQuestGame() {
  const { t } = useSettings();
  const [activeLevelId, setActiveLevelId] = useState(mathMatchQuestLevels[0].id);
  const activeLevel = useMemo(
    () => mathMatchQuestLevels.find((level) => level.id === activeLevelId) ?? mathMatchQuestLevels[0],
    [activeLevelId]
  );
  const [board, setBoard] = useState<Board>(() => createBoard(mathMatchQuestLevels[0]));
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [selected, setSelected] = useState<Position | null>(null);
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [question, setQuestion] = useState<MathMatchQuestQuestion | null>(null);
  const [stats, setStats] = useState<RuntimeStats>(defaultStats);
  const [boardSalt, setBoardSalt] = useState(100);
  const [view, setView] = useState<GameView>("board");
  const [feedback, setFeedback] = useState<LocalizedText>({
    en: "Swap adjacent tiles to build your first match.",
    zh: "交換相鄰方塊，開始第一組消除。",
    zhHans: "交换相邻方块，开始第一组消除。"
  });
  const [progress, setProgress] = useState<DraftProgress>(defaultProgress);
  const [progressReady, setProgressReady] = useState(false);

  const matchedCellKeys = useMemo(() => {
    if (!pendingMatch) return new Set<string>();
    return new Set(pendingMatch.cells.map(cellKey));
  }, [pendingMatch]);

  const levelResult = useMemo(
    () =>
      resolveMathMatchQuestLevelResult({
        score: stats.score,
        targetScore: activeLevel.targetScore,
        movesUsed: stats.movesUsed,
        movesLimit: activeLevel.movesLimit,
        questionsAnswered: stats.questionsAnswered,
        correctAnswers: stats.correctAnswers
      }),
    [activeLevel.movesLimit, activeLevel.targetScore, stats.correctAnswers, stats.movesUsed, stats.questionsAnswered, stats.score]
  );

  useEffect(() => {
    setProgress(readProgress(window.localStorage.getItem(progressStorageKey)));
    setProgressReady(true);
  }, []);

  useEffect(() => {
    document.body.classList.add("math-match-quest-immersive");
    return () => {
      document.body.classList.remove("math-match-quest-immersive");
    };
  }, []);

  useEffect(() => {
    if (!progressReady) return;
    window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  }, [progress, progressReady]);

  const resetLevel = useCallback((level: MathMatchQuestLevel) => {
    setActiveLevelId(level.id);
    setBoard(createBoard(level, level.boardSeed));
    setView("board");
    setPhase("playing");
    setSelected(null);
    setPendingMatch(null);
    setQuestion(null);
    setStats(defaultStats);
    setBoardSalt(level.boardSeed * 10);
    setFeedback({
      en: "Fresh board ready. Build matches to trigger math gates.",
      zh: "新棋盤已就緒，消除方塊即可觸發數學關卡。",
      zhHans: "新棋盘已就绪，消除方块即可触发数学关卡。"
    });
  }, []);

  const saveRunProgress = useCallback(
    (nextStats: RuntimeStats, resultPhase: GamePhase) => {
      const result = resolveMathMatchQuestLevelResult({
        score: nextStats.score,
        targetScore: activeLevel.targetScore,
        movesUsed: nextStats.movesUsed,
        movesLimit: activeLevel.movesLimit,
        questionsAnswered: nextStats.questionsAnswered,
        correctAnswers: nextStats.correctAnswers
      });

      setProgress((current) => {
        const alreadyCompleted = current.completedLevelIds.includes(activeLevel.id);
        const completedLevelIds = result.cleared && !alreadyCompleted
          ? [...current.completedLevelIds, activeLevel.id]
          : current.completedLevelIds;
        const bankedCoins = result.cleared && !alreadyCompleted
          ? current.bankedCoins + nextStats.coins
          : current.bankedCoins;

        return {
          bankedCoins,
          completedLevelIds,
          starsByLevelId: {
            ...current.starsByLevelId,
            [activeLevel.id]: Math.max(current.starsByLevelId[activeLevel.id] ?? 0, result.stars)
          },
          bestScoreByLevelId: {
            ...current.bestScoreByLevelId,
            [activeLevel.id]: Math.max(current.bestScoreByLevelId[activeLevel.id] ?? 0, nextStats.score)
          }
        };
      });

      setPhase(resultPhase);
    },
    [activeLevel.id, activeLevel.movesLimit, activeLevel.targetScore]
  );

  const showHint = useCallback(() => {
    if (phase !== "playing") return;
    const swap = findAvailableSwap(board);
    if (!swap) {
      setFeedback({
        en: "No clean move is available. Shuffle the board to keep the run fair.",
        zh: "暫時沒有清晰走法，洗牌可保持本局公平。",
        zhHans: "暂时没有清晰走法，洗牌可保持本局公平。"
      });
      return;
    }

    setSelected(swap[0]);
    setFeedback({
      en: "Hint selected. Swap it with the neighboring target to open a math gate.",
      zh: "提示已選中。把它與相鄰目標交換即可打開數學關卡。",
      zhHans: "提示已选中。把它与相邻目标交换即可打开数学关卡。"
    });
  }, [board, phase]);

  const shuffleBoard = useCallback(() => {
    if (phase !== "playing") return;
    const nextSalt = boardSalt + 31;
    setBoard(createBoard(activeLevel, nextSalt));
    setBoardSalt(nextSalt);
    setSelected(null);
    setFeedback({
      en: "Board shuffled. Score and moves stay untouched.",
      zh: "棋盤已洗牌，分數與步數保持不變。",
      zhHans: "棋盘已洗牌，分数与步数保持不变。"
    });
  }, [activeLevel, boardSalt, phase]);

  const handleTileClick = useCallback(
    (position: Position) => {
      if (phase !== "playing") return;
      if (!selected) {
        setSelected(position);
        return;
      }
      if (selected.row === position.row && selected.col === position.col) {
        setSelected(null);
        return;
      }
      if (!areAdjacent(selected, position)) {
        setSelected(position);
        setFeedback({
          en: "Choose a neighboring tile for a valid swap.",
          zh: "請選擇相鄰方塊來交換。",
          zhHans: "请选择相邻方块来交换。"
        });
        return;
      }

      const swapped = swapBoardTiles(board, selected, position);
      const matches = findMathMatchQuestMatches(swapped);
      if (matches.length === 0) {
        setSelected(null);
        setFeedback({
          en: "That swap does not make a match. Try setting up a three-tile line.",
          zh: "這次交換未形成消除，試試排成三個同類方塊。",
          zhHans: "这次交换未形成消除，试试排成三个同类方块。"
        });
        return;
      }

      const cells = uniqueCells(matches);
      const largestMatch = matches.slice().sort((a, b) => b.cells.length - a.cells.length)[0];
      const nextQuestion = questionForFamily(largestMatch.family, stats.questionsAnswered);
      setBoard(swapped);
      setSelected(null);
      setPendingMatch({ matches, cells, family: largestMatch.family });
      setQuestion(nextQuestion);
      setPhase("question");
      setFeedback({
        en: "Match found. Answer the math gate to cash in the combo.",
        zh: "成功消除。答對數學題即可兌換連擊獎勵。",
        zhHans: "成功消除。答对数学题即可兑换连击奖励。"
      });
    },
    [board, phase, selected, stats.questionsAnswered]
  );

  const handleAnswer = useCallback(
    (optionId: string) => {
      if (!pendingMatch || !question) return;
      const correct = question.options.find((option) => option.id === optionId)?.correct === true;
      const comboForReward = correct ? stats.combo : 1;
      const projectedBase = calculateMathMatchQuestReward({
        matchedTileCount: pendingMatch.cells.length,
        mathCorrect: correct,
        combo: comboForReward,
        movesRemaining: activeLevel.movesLimit - stats.movesUsed - 1,
        levelCleared: false
      });
      const projectedScore = stats.score + projectedBase.score;
      const willClear = projectedScore >= activeLevel.targetScore;
      const reward = calculateMathMatchQuestReward({
        matchedTileCount: pendingMatch.cells.length,
        mathCorrect: correct,
        combo: comboForReward,
        movesRemaining: activeLevel.movesLimit - stats.movesUsed - 1,
        levelCleared: willClear
      });
      const nextStats: RuntimeStats = {
        score: stats.score + reward.score,
        coins: stats.coins + reward.coins,
        movesUsed: stats.movesUsed + 1,
        combo: correct ? clamp(stats.combo + 1, 1, 5) : 1,
        questionsAnswered: stats.questionsAnswered + 1,
        correctAnswers: stats.correctAnswers + (correct ? 1 : 0)
      };
      const nextSalt = boardSalt + pendingMatch.cells.length + 7;
      const nextBoard = refillMatchedCells(board, activeLevel, pendingMatch.cells, nextSalt);

      setBoard(nextBoard);
      setBoardSalt(nextSalt);
      setStats(nextStats);
      setPendingMatch(null);
      setQuestion(null);
      setSelected(null);

      const nextResult = resolveMathMatchQuestLevelResult({
        score: nextStats.score,
        targetScore: activeLevel.targetScore,
        movesUsed: nextStats.movesUsed,
        movesLimit: activeLevel.movesLimit,
        questionsAnswered: nextStats.questionsAnswered,
        correctAnswers: nextStats.correctAnswers
      });

      if (nextResult.cleared) {
        setFeedback(correct ? question.explanation : {
          en: "The board cleared, but accuracy held back the star rating.",
          zh: "棋盤已達標，但答題準確率會影響星級。",
          zhHans: "棋盘已达标，但答题准确率会影响星级。"
        });
        saveRunProgress(nextStats, "cleared");
        return;
      }

      if (nextStats.movesUsed >= activeLevel.movesLimit) {
        setFeedback({
          en: "Moves are out. Bank the practice, then retry for a cleaner route.",
          zh: "步數用完了。保留這次練習，再挑戰更好的路線。",
          zhHans: "步数用完了。保留这次练习，再挑战更好的路线。"
        });
        saveRunProgress(nextStats, "failed");
        return;
      }

      setPhase("playing");
      setFeedback(correct ? question.explanation : {
        en: "Not quite. The match still cleared, but the combo reset.",
        zh: "未答對。方塊仍會消除，但連擊已重置。",
        zhHans: "未答对。方块仍会消除，但连击已重置。"
      });
    },
    [activeLevel, board, boardSalt, pendingMatch, question, saveRunProgress, stats]
  );

  const completedSet = useMemo(() => new Set(progress.completedLevelIds), [progress.completedLevelIds]);
  const activeLevelIndex = mathMatchQuestLevels.findIndex((level) => level.id === activeLevel.id);
  const nextLevel = mathMatchQuestLevels[activeLevelIndex + 1] ?? null;
  const scorePercent = progressForLevel(stats.score, activeLevel.targetScore);
  const movesRemaining = Math.max(0, activeLevel.movesLimit - stats.movesUsed);

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_20%_0%,#7dd3fc_0%,#22d3ee_22%,#0f8eba_42%,#063c6d_70%,#08142e_100%)] text-white">
      <style>{`
        body.math-match-quest-immersive header,
        body.math-match-quest-immersive footer,
        body.math-match-quest-immersive button[class*="z-[70]"][class*="fixed"] {
          display: none !important;
        }
        body.math-match-quest-immersive {
          background: #08142e;
        }
      `}</style>
      <div className="mx-auto flex min-h-dvh w-full max-w-[1335px] items-start justify-center px-0 py-0">
        <section className="grid w-full gap-2 bg-white lg:grid-cols-[minmax(0,618fr)_minmax(0,709fr)]">
          <section
            className={cn(
              "relative aspect-[618/1178] min-h-0 overflow-hidden bg-sky-400 bg-cover bg-center bg-no-repeat",
              view !== "map" && "hidden lg:block"
            )}
            style={{ backgroundImage: "url(/games/math-match-quest/map-reference.png)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-cyan-950/10" />

            <div className={cn("relative z-10 flex items-center justify-between gap-2 p-4", referenceArtInteractiveLayer)}>
              <ResourcePill mark="$" value="20,000" tone="gold" />
              <ResourcePill mark="♥" value="50" tone="heart" />
              <RoundIconButton label="Menu">≡</RoundIconButton>
            </div>

            <div className={cn("relative z-10 mx-auto mt-8 w-[78%] rounded-[1.35rem] border-[6px] border-orange-900/20 bg-gradient-to-b from-yellow-100 via-amber-300 to-orange-500 px-4 py-4 text-center shadow-[0_12px_0_rgba(146,64,14,.45),0_25px_45px_rgba(120,53,15,.35)]", referenceArtDecorLayer)}>
              <h1 className="text-5xl font-black leading-none text-yellow-500 [-webkit-text-stroke:2px_#8a3a04] [text-shadow:_0_4px_0_#fff7ad,_0_7px_0_#92400e]">
                消消乐
              </h1>
              <p className="mt-2 rounded-full bg-blue-600 px-3 py-1 text-lg font-black text-white shadow-inner [text-shadow:_0_2px_0_rgba(0,0,0,.25)]">
                Math Match Quest
              </p>
            </div>

            <div className="absolute inset-0 z-30">
              {mapNodePositions.map((node) => {
                const level = mathMatchQuestLevels[node.levelNumber - 1] ?? null;
                const unlocked = node.levelNumber === 1 || Boolean(level && completedSet.has(mathMatchQuestLevels[node.levelNumber - 2]?.id ?? ""));
                const active = level?.id === activeLevel.id;
                const stars = level ? progress.starsByLevelId[level.id] ?? 0 : 0;
                return (
                  <button
                    key={node.levelNumber}
                    type="button"
                    disabled={!level || !unlocked}
                    onClick={() => level && resetLevel(level)}
                    className={cn(
                      "absolute grid h-16 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[1.15rem] border-[5px] border-yellow-100 bg-gradient-to-b from-yellow-200 via-amber-300 to-orange-500 text-3xl font-black text-white shadow-[0_8px_0_rgba(146,64,14,.55),0_16px_25px_rgba(120,53,15,.28)] transition focus-ring",
                      active && !referenceArtMode && "scale-110 ring-4 ring-sky-200",
                      (!level || !unlocked) && "bg-gradient-to-b from-stone-200 to-stone-400 text-stone-600 opacity-90 grayscale",
                      referenceArtInteractiveLayer
                    )}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    {node.levelNumber}
                    <span className="absolute -bottom-4 flex gap-0.5 text-xs text-yellow-200">
                      {[0, 1, 2].map((star) => (
                        <span key={star} className={star < stars ? "text-yellow-200" : "text-white/50"}>★</span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={cn("absolute right-5 top-[34%] z-20 grid gap-3", referenceArtDecorLayer)}>
              {[
                { label: "Gift", mark: "D", count: 3, color: "from-pink-300 to-rose-500" },
                { label: "Rank", mark: "R", count: 1, color: "from-yellow-200 to-amber-500" },
                { label: "Quest", mark: "Q", count: 2, color: "from-sky-200 to-blue-500" }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="relative flex h-14 w-28 items-center gap-2 rounded-2xl border-2 border-white/70 bg-white/35 px-2 text-left text-xs font-black text-white shadow-lg shadow-cyan-950/20 backdrop-blur transition hover:scale-105 focus-ring"
                >
                  <span className={cn("grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br shadow-inner", item.color)}>
                    {item.mark}
                  </span>
                  <span>{item.label}</span>
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-red-500 text-xs text-white">
                    {item.count}
                  </span>
                </button>
              ))}
            </div>

            <div className={cn("absolute bottom-24 right-12 z-20 h-24 w-28 rounded-[48%] bg-gradient-to-b from-violet-200 to-purple-500 shadow-xl shadow-purple-900/20", referenceArtDecorLayer)}>
              <span className="absolute left-[28%] top-[30%] h-3 w-3 rounded-full bg-slate-950" />
              <span className="absolute right-[28%] top-[30%] h-3 w-3 rounded-full bg-slate-950" />
              <span className="absolute left-[35%] top-[55%] h-2 w-8 rounded-full bg-slate-950/75" />
              <span className="absolute -left-4 bottom-3 h-10 w-8 rounded-full bg-purple-400" />
              <span className="absolute -right-4 bottom-3 h-10 w-8 rounded-full bg-purple-400" />
              <span className="absolute -top-3 right-5 h-5 w-5 rounded-full bg-rose-300" />
            </div>

            <div className={cn("absolute bottom-4 left-4 right-4 z-20 grid grid-cols-5 gap-2 rounded-3xl border border-white/45 bg-blue-500/85 p-2 shadow-xl shadow-blue-950/25 backdrop-blur", referenceArtInteractiveLayer)}>
              {[
                { label: "Shop", mark: "S", action: undefined },
                { label: "Events", mark: "E", action: undefined },
                { label: "Home", mark: "H", action: () => setView("map") },
                { label: "Play", mark: "P", action: () => setView("board") },
                { label: "Settings", mark: "G", action: undefined }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.action}
                  className={cn(
                    "grid min-h-14 place-items-center rounded-2xl px-1 text-xs font-black text-white transition hover:bg-white/15 focus-ring",
                    item.label === "Home" && "bg-lime-400 text-lime-950 shadow-lg shadow-lime-900/20"
                  )}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/25 text-base">{item.mark}</span>
                  <span className="mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section
            className={cn(
              "relative aspect-[709/1178] min-h-0 overflow-hidden bg-blue-950 bg-cover bg-center bg-no-repeat",
              view !== "board" && "hidden lg:block"
            )}
            style={{ backgroundImage: "url(/games/math-match-quest/board-reference.png)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-blue-950/5 via-blue-950/0 to-blue-950/20" />
            <div className={cn("relative z-20 flex items-center justify-between gap-3 p-4", referenceArtInteractiveLayer)}>
              <RoundIconButton label="Map" onClick={() => setView("map")}>‹</RoundIconButton>
              <div className="rounded-full border-4 border-sky-200/80 bg-gradient-to-b from-sky-300 to-blue-600 px-10 py-2 text-xl font-black shadow-lg shadow-blue-950/30">
                {t({ en: `Level ${activeLevel.order}`, zh: `關卡 ${activeLevel.order}`, zhHans: `关卡 ${activeLevel.order}` })}
              </div>
              <ResourcePill mark="$" value={stats.coins || 200} tone="gold" />
            </div>

            <div className={cn("relative z-10 mx-auto grid max-w-3xl grid-cols-[7rem_minmax(0,1fr)] gap-3 px-4 sm:grid-cols-[8rem_minmax(0,1fr)]", referenceArtDecorLayer)}>
              <div className="grid aspect-square place-items-center rounded-full border-4 border-sky-100 bg-gradient-to-b from-cyan-100 to-sky-400 text-center text-blue-950 shadow-xl shadow-blue-950/25">
                <span className="text-sm font-black">Moves</span>
                <span className="-mt-2 text-5xl font-black">{movesRemaining}</span>
              </div>
              <div>
                <div className="flex min-h-20 items-center justify-between gap-3 rounded-[1.5rem] border-4 border-white/60 bg-gradient-to-b from-orange-50 to-amber-100 px-5 text-blue-950 shadow-xl shadow-blue-950/25">
                  <div>
                    <p className="text-sm font-black uppercase text-blue-800/70">Target</p>
                    <p className="text-3xl font-black">{activeLevel.targetScore}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black uppercase text-blue-800/70">Score</p>
                    <p className="text-3xl font-black">{stats.score}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-full border-4 border-sky-300 bg-blue-950/65 p-1 shadow-inner">
                  <div className="relative h-5 overflow-hidden rounded-full bg-blue-900">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-400 transition-all duration-500"
                      style={{ width: `${scorePercent}%` }}
                    />
                    {[33, 66, 96].map((left, index) => (
                      <span
                        key={left}
                        className={cn(
                          "absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-slate-200 bg-slate-500 text-sm text-slate-200 shadow",
                          scorePercent >= left && "border-yellow-100 bg-yellow-300 text-yellow-800"
                        )}
                        style={{ left: `${left}%` }}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "z-20",
                referenceArtMode
                  ? "absolute left-[12.4%] top-[36.4%] w-[74.6%] opacity-0"
                  : "relative mx-auto mt-12 w-[82%] max-w-[34rem] rounded-[1.35rem] border-4 border-blue-950/65 bg-blue-950/72 p-2 shadow-2xl shadow-blue-950/55 sm:p-3"
              )}
            >
              <div className={cn("grid", referenceArtMode ? "gap-0" : "gap-1.5 sm:gap-2")} style={{ gridTemplateColumns: `repeat(${boardColumns}, minmax(0, 1fr))` }}>
                {board.map((row, rowIndex) =>
                  row.map((tile, colIndex) => {
                    const isSelected = selected?.row === rowIndex && selected.col === colIndex;
                    const isMatched = matchedCellKeys.has(`${rowIndex}:${colIndex}`);
                    return (
                      <CreatureTile
                        key={tile.id}
                        tile={tile}
                        selected={isSelected}
                        matched={isMatched}
                        disabled={phase !== "playing"}
                        onClick={() => handleTileClick({ row: rowIndex, col: colIndex })}
                      />
                    );
                  })
                )}
              </div>
            </div>

            <div
              className={cn(
                "z-20 grid grid-cols-5 gap-2 rounded-[1.5rem] border border-white/40 bg-sky-500/55 p-2 shadow-xl shadow-blue-950/35 backdrop-blur",
                referenceArtMode
                  ? "absolute bottom-[5.4%] left-[8%] right-[8%] opacity-0"
                  : "relative mx-auto mt-5 w-[94%] max-w-[39rem]",
                referenceArtInteractiveLayer
              )}
            >
              {boosterItems.map((item, index) => (
                <BoosterButton
                  key={item.label}
                  item={item}
                  disabled={phase !== "playing"}
                  onClick={index === 0 ? showHint : index === 2 ? shuffleBoard : () => resetLevel(activeLevel)}
                />
              ))}
            </div>

            <div className={cn("relative z-20 mx-auto mt-4 flex w-[94%] max-w-[39rem] items-center justify-between gap-3 rounded-2xl border border-white/35 bg-white/20 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/25 backdrop-blur", referenceArtDecorLayer)}>
              <span className="line-clamp-2">{t(feedback)}</span>
              <Stars count={levelResult.stars} label={t({ en: `${levelResult.stars} stars`, zh: `${levelResult.stars} 星`, zhHans: `${levelResult.stars} 星` })} />
            </div>
          </section>
        </section>
      </div>

      {phase === "question" && question ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-blue-950/65 p-4 backdrop-blur-sm">
          <section className="w-full max-w-xl rounded-[2rem] border-4 border-sky-100 bg-gradient-to-b from-sky-50 via-white to-blue-100 p-5 text-blue-950 shadow-2xl shadow-blue-950/50">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
              {t(mathMatchQuestFamilyMeta[pendingMatch?.family ?? question.family].label)}
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">{t(question.prompt)}</h2>
            <div className="mt-5 grid gap-3">
              {question.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleAnswer(option.id)}
                  className="rounded-2xl border-4 border-sky-100 bg-gradient-to-b from-white to-sky-100 px-4 py-3 text-left text-lg font-black text-blue-950 shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:border-yellow-200 hover:from-yellow-50 hover:to-amber-100 focus-ring"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {(phase === "cleared" || phase === "failed") ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-blue-950/65 p-4 backdrop-blur-sm">
          <section className="w-full max-w-lg rounded-[2rem] border-4 border-sky-100 bg-gradient-to-b from-sky-50 via-white to-blue-100 p-5 text-center text-blue-950 shadow-2xl shadow-blue-950/50">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-600">
              {phase === "cleared" ? t({ en: "Level cleared", zh: "關卡完成", zhHans: "关卡完成" }) : t({ en: "Run complete", zh: "本局結束", zhHans: "本局结束" })}
            </p>
            <h2 className="mt-3 text-3xl font-black">
              {phase === "cleared" ? t({ en: "Nice route.", zh: "路線漂亮。", zhHans: "路线漂亮。" }) : t({ en: "One more run.", zh: "再來一局。", zhHans: "再来一局。" })}
            </h2>
            <div className="mt-5 flex justify-center">
              <Stars count={levelResult.stars} label={t({ en: `${levelResult.stars} stars`, zh: `${levelResult.stars} 星`, zhHans: `${levelResult.stars} 星` })} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <StatPill label={t({ en: "Score", zh: "分數", zhHans: "分数" })} value={stats.score} tone="cyan" />
              <StatPill label={t({ en: "Coins", zh: "金幣", zhHans: "金币" })} value={stats.coins} tone="amber" />
              <StatPill label={t({ en: "Accuracy", zh: "準確", zhHans: "准确" })} value={`${levelResult.accuracyPercent}%`} tone="emerald" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => resetLevel(activeLevel)}
                className="rounded-2xl border-4 border-sky-100 bg-gradient-to-b from-white to-sky-100 px-4 py-3 text-sm font-black text-blue-950 shadow-md shadow-blue-900/15 transition hover:-translate-y-0.5 hover:from-yellow-50 hover:to-amber-100 focus-ring"
              >
                {t({ en: "Replay", zh: "重玩", zhHans: "重玩" })}
              </button>
              <button
                type="button"
                disabled={phase !== "cleared" || !nextLevel}
                onClick={() => nextLevel && resetLevel(nextLevel)}
                className="rounded-2xl border-4 border-yellow-100 bg-gradient-to-b from-yellow-200 to-orange-400 px-4 py-3 text-sm font-black text-amber-950 shadow-md shadow-amber-900/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 focus-ring"
              >
                {nextLevel ? t({ en: "Next level", zh: "下一關", zhHans: "下一关" }) : t({ en: "All levels clear", zh: "全部完成", zhHans: "全部完成" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
