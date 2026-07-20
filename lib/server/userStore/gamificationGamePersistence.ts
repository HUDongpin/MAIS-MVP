import { createHash, randomUUID } from "crypto";
import { gamificationRewardForSource, hongKongDayKey } from "@/lib/gamification";
import { creatureRarityFor, creatureRarities, fishingSpeciesTotal } from "@/lib/practiceGameJuice";
import {
  recordAdventureRelicInPersistence,
  recordFishingDexCatchesInPersistence,
  type AdventureRelicPersistenceRecord,
  type FishingDexPersistenceRecord
} from "@/lib/server/userStore/gamificationCollectionsPersistence";
import {
  createGamificationRecordId,
  recordGamificationEventOnce,
  type GamificationEventPersistenceRecord
} from "@/lib/server/userStore/gamificationEventPersistence";
import type {
  GamificationSummary,
  LocalizedText
} from "@/types";

type UserRole = "student" | "teacher" | "parent" | "admin";

type GamificationGameUserRecord = {
  id: string;
  role: UserRole;
};

type GamificationGameAttemptRecord = {
  id?: string;
  user_id: string;
  question_id: string;
  is_correct: boolean;
  created_at: string;
};

type GamificationGameQuestionRecord = {
  id: string;
  topic_id: string;
};

type GamificationGameTopicRecord = {
  id: string;
  title_en: string;
  title_zh: string;
};

type GamificationGameEventRecord = GamificationEventPersistenceRecord;

type GamificationGameRewardPointLedgerRecord = {
  id: string;
  student_id: string;
  amount: number;
  reason: string;
  label_en: string;
  label_zh: string;
  note?: string;
  source_key?: string;
  created_at: string;
};

export type GamificationGameAdventureIslandEligibility = {
  eligible: boolean;
  reason: "ready" | "need-round-context" | "need-attempts" | "need-accuracy" | "mixed-topic" | "already-completed" | "invalid-round";
  dayKey: string;
  topicId: string | null;
  topicTitle: LocalizedText | null;
  roundKey: string;
  roundQuestionCount: number;
  requiredQuestionCount: number;
  attemptCount: number;
  correctCount: number;
  accuracyPercent: number;
  alreadyCompleted: boolean;
  completedAt: string | null;
  postAdventurePracticeEligible: boolean;
  rewardPreview: {
    xp: number;
    rewardPoints: number;
  };
};

export type GamificationGameAdventureIslandEligibilityInput = {
  studentId: string;
  topicId?: string;
  roundKey?: string;
  roundQuestionIds?: string[];
  correctRoundQuestionIds?: string[];
};

export type GamificationGameAdventureIslandCompletionInput = {
  studentId: string;
  topicId: string;
  roundKey: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  correctQuestionIds: string[];
  durationSeconds: number;
  defeatedEnemies?: number;
  livesRemaining?: number;
};

export type GamificationGameAdventureIslandCompletionResult = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  eligibility: GamificationGameAdventureIslandEligibility;
  reward: {
    xp: number;
    rewardPoints: number;
    label: LocalizedText;
  };
  starBonus?: {
    applied: boolean;
    rewardPoints: number;
  };
  relic?: {
    topicId: string;
    isNew: boolean;
    clearCount: number;
    bestStars: number;
  } | null;
  gamification: GamificationSummary | null;
};

export type GamificationGameFishingCompletionInput = {
  studentId: string;
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  caughtQuestionIds: string[];
  correctCaughtQuestionIds: string[];
  caughtSpecies?: Record<string, string>;
  coins: number;
  netsUsed: number;
  durationSeconds: number;
  roundKey: string;
};

export type GamificationGameFishingCompletionResult = {
  status: "awarded" | "duplicate" | "capped" | "not-eligible" | "invalid-run";
  reward: {
    xp: number;
    rewardPoints: number;
    label: LocalizedText;
  };
  coins: number;
  rarityBonus?: number;
  dex?: {
    newSpecies: string[];
    caughtCount: number;
    totalSpecies: number;
  } | null;
  topicId: string;
  gamification: GamificationSummary | null;
};

export type GamificationGamePersistenceDatabase = {
  attempts?: GamificationGameAttemptRecord[];
  adventure_relics?: AdventureRelicPersistenceRecord[];
  fishing_dex?: FishingDexPersistenceRecord[];
  gamification_events?: GamificationGameEventRecord[];
  questions?: GamificationGameQuestionRecord[];
  reward_point_ledger?: GamificationGameRewardPointLedgerRecord[];
  topics?: GamificationGameTopicRecord[];
  users: GamificationGameUserRecord[];
};

export type GamificationGamePersistenceStoreDependencies = {
  adventureIslandEligibilityFromDatabase?: (
    database: GamificationGamePersistenceDatabase,
    input: GamificationGameAdventureIslandEligibilityInput,
    now: Date
  ) => GamificationGameAdventureIslandEligibility | null;
  buildGamificationSummaryForStudent?: (
    database: GamificationGamePersistenceDatabase,
    studentId: string
  ) => GamificationSummary | null;
  completeAdventureIslandInDatabase?: (
    database: GamificationGamePersistenceDatabase,
    input: GamificationGameAdventureIslandCompletionInput
  ) => GamificationGameAdventureIslandCompletionResult | null;
  completeFishingGameInDatabase?: (
    database: GamificationGamePersistenceDatabase,
    input: GamificationGameFishingCompletionInput
  ) => GamificationGameFishingCompletionResult | null;
  mutateDatabase?: <T>(
    mutator: (database: GamificationGamePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  createId?: () => string;
  now?: () => Date;
  readDatabase: () => Promise<GamificationGamePersistenceDatabase>;
};

export type GamificationGamePersistenceStore = ReturnType<typeof createGamificationGamePersistenceStore>;

const practiceGameRequiredRoundQuestions = 5;
const practiceGameAccuracyPercent = 80;
const practiceGameMinCorrectQuestions = Math.ceil((practiceGameRequiredRoundQuestions * practiceGameAccuracyPercent) / 100);
const adventureIslandMinCorrectQuestions = 3;
const adventureIslandMinDurationSeconds = 30;
const adventureIslandMaxDurationSeconds = 20 * 60;
const adventureIslandMaxLives = 2;
const adventureIslandThreeStarTargetSeconds = 120;
const adventureIslandThreeStarBonusPoints = 15;
const fishingGameMaxNets = 10;
const fishingGameMaxDurationSeconds = 120;
const fishingGameRewardPerCoin = 3;

// Run stars mirror the client's ceremony: the clear itself, keeping every
// heart, and beating the two-minute clock. livesRemaining is optional client
// evidence (bounded like defeatedEnemies); without it a run counts as a
// plain one-star clear and earns no bonus.
function adventureRunEvidence(livesRemaining: number | undefined, durationSeconds: number) {
  if (livesRemaining === undefined) return { stars: 1, threeStar: false };
  const keptEveryHeart = livesRemaining >= adventureIslandMaxLives;
  const beatTheClock = durationSeconds <= adventureIslandThreeStarTargetSeconds;
  return {
    stars: 1 + (keptEveryHeart ? 1 : 0) + (beatTheClock ? 1 : 0),
    threeStar: keptEveryHeart && beatTheClock
  };
}

function cleanUniqueIds(questionIds: string[]) {
  return Array.from(new Set(questionIds.map((questionId) => questionId.trim()).filter(Boolean)));
}

function cleanGameRoundKey(roundKey: string) {
  return roundKey.trim().replace(/\s+/g, "-").slice(0, 180);
}

function gameRoundFingerprint(roundKey: string) {
  return createHash("sha256").update(roundKey).digest("hex").slice(0, 16);
}

export function adventureIslandSourceKey(studentId: string, topicId: string, roundKey: string) {
  return `adventure-island-complete:${studentId}:${topicId}:${gameRoundFingerprint(roundKey)}`;
}

function topicForId(database: GamificationGamePersistenceDatabase, topicId: string) {
  return (database.topics ?? []).find((topic) => topic.id === topicId) ?? null;
}

function questionForId(database: GamificationGamePersistenceDatabase, questionId: string) {
  return (database.questions ?? []).find((question) => question.id === questionId) ?? null;
}

function topicTitleForId(database: GamificationGamePersistenceDatabase, topicId: string): LocalizedText {
  const topic = topicForId(database, topicId);
  return topic ? { en: topic.title_en, zh: topic.title_zh } : { en: topicId, zh: topicId };
}

function verifiedAttemptIds(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  questionIds: string[],
  afterCreatedAt?: string | null
) {
  const allowedIds = new Set(questionIds);
  return new Set(
    (database.attempts ?? [])
      .filter((attempt) =>
        attempt.user_id === studentId &&
        allowedIds.has(attempt.question_id) &&
        (!afterCreatedAt || attempt.created_at > afterCreatedAt)
      )
      .map((attempt) => attempt.question_id)
  );
}

function verifiedCorrectAttemptIds(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  questionIds: string[],
  afterCreatedAt?: string | null
) {
  const allowedIds = new Set(questionIds);
  return new Set(
    (database.attempts ?? [])
      .filter((attempt) =>
        attempt.user_id === studentId &&
        attempt.is_correct &&
        allowedIds.has(attempt.question_id) &&
        (!afterCreatedAt || attempt.created_at > afterCreatedAt)
      )
      .map((attempt) => attempt.question_id)
  );
}

type PracticeGameRoundValidationReason =
  | "ready"
  | "need-round-context"
  | "need-attempts"
  | "need-accuracy"
  | "mixed-topic"
  | "invalid-round";

type PracticeGameRoundValidation = {
  reason: PracticeGameRoundValidationReason;
  topicId: string | null;
  topicTitle: LocalizedText | null;
  roundKey: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  attemptedCount: number;
  correctCount: number;
  accuracyPercent: number;
};

function validatePracticeGameRound(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  {
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds,
    afterCreatedAt
  }: {
    topicId: string;
    roundKey: string;
    roundQuestionIds: string[];
    correctRoundQuestionIds: string[];
    afterCreatedAt?: string | null;
  }
): PracticeGameRoundValidation {
  const cleanTopicId = topicId.trim();
  const cleanRoundKey = cleanGameRoundKey(roundKey);
  const cleanRoundIds = cleanUniqueIds(roundQuestionIds);
  const cleanCorrectRoundIds = cleanUniqueIds(correctRoundQuestionIds);
  const fallback = (
    reason: PracticeGameRoundValidationReason,
    extras: Partial<PracticeGameRoundValidation> = {}
  ): PracticeGameRoundValidation => ({
    reason,
    topicId: cleanTopicId || extras.topicId || null,
    topicTitle: cleanTopicId ? topicTitleForId(database, cleanTopicId) : null,
    roundKey: cleanRoundKey,
    roundQuestionIds: cleanRoundIds,
    correctRoundQuestionIds: cleanCorrectRoundIds,
    attemptedCount: 0,
    correctCount: 0,
    accuracyPercent: 0,
    ...extras
  });

  if (!cleanTopicId || !cleanRoundKey || !cleanRoundIds.length) return fallback("need-round-context");
  if (cleanRoundIds.length !== practiceGameRequiredRoundQuestions) return fallback("need-attempts");

  const roundQuestions = cleanRoundIds.map((questionId) => questionForId(database, questionId));
  if (roundQuestions.some((question) => !question)) return fallback("invalid-round");

  const roundTopicIds = new Set((roundQuestions as GamificationGameQuestionRecord[]).map((question) => question.topic_id));
  if (roundTopicIds.size !== 1 || !roundTopicIds.has(cleanTopicId)) {
    return fallback("mixed-topic", {
      topicId: roundTopicIds.size === 1 ? Array.from(roundTopicIds)[0] ?? cleanTopicId : cleanTopicId
    });
  }

  const roundIdSet = new Set(cleanRoundIds);
  if (cleanCorrectRoundIds.some((questionId) => !roundIdSet.has(questionId))) return fallback("invalid-round");

  const attemptedIds = verifiedAttemptIds(database, studentId, cleanRoundIds, afterCreatedAt);
  const attemptedCount = cleanRoundIds.filter((questionId) => attemptedIds.has(questionId)).length;
  if (attemptedCount < practiceGameRequiredRoundQuestions) {
    return fallback("need-attempts", {
      attemptedCount,
      topicTitle: topicTitleForId(database, cleanTopicId)
    });
  }

  const verifiedCorrectIds = verifiedCorrectAttemptIds(database, studentId, cleanRoundIds, afterCreatedAt);
  if (cleanCorrectRoundIds.some((questionId) => !verifiedCorrectIds.has(questionId))) {
    return fallback("invalid-round", {
      attemptedCount,
      topicTitle: topicTitleForId(database, cleanTopicId)
    });
  }

  const correctCount = cleanCorrectRoundIds.length;
  const accuracyPercent = Math.round((correctCount / practiceGameRequiredRoundQuestions) * 100);
  const base = {
    topicId: cleanTopicId,
    topicTitle: topicTitleForId(database, cleanTopicId),
    attemptedCount,
    correctCount,
    accuracyPercent
  };

  if (correctCount < practiceGameMinCorrectQuestions || accuracyPercent < practiceGameAccuracyPercent) {
    return fallback("need-accuracy", base);
  }

  return fallback("ready", base);
}

function adventureIslandTopicCompletionFor(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  topicId: string
) {
  const sourceKeyPrefix = `adventure-island-complete:${studentId}:${topicId}:`;
  return (database.gamification_events ?? [])
    .filter((event) =>
      event.student_id === studentId &&
      event.source === "adventure-island-complete" &&
      event.source_key.startsWith(sourceKeyPrefix) &&
      (event.status === "awarded" || event.status === "capped")
    )
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0] ?? null;
}

export function verifiedTopicAdventureIslandQuestionCount(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  questionIds: string[],
  topicId: string
) {
  const requestedIds = new Set(questionIds.map((questionId) => questionId.trim()).filter(Boolean));
  const correctQuestionIds = new Set(
    (database.attempts ?? [])
      .filter((attempt) => {
        const question = questionForId(database, attempt.question_id);
        return (
          attempt.user_id === studentId &&
          attempt.is_correct &&
          question?.topic_id === topicId
        );
      })
      .map((attempt) => attempt.question_id)
  );

  return Array.from(requestedIds).filter((questionId) => correctQuestionIds.has(questionId)).length;
}

export function buildAdventureIslandEligibility(
  database: GamificationGamePersistenceDatabase,
  studentId: string,
  {
    topicId = "",
    roundKey = "",
    roundQuestionIds = [],
    correctRoundQuestionIds = []
  }: Omit<GamificationGameAdventureIslandEligibilityInput, "studentId"> = {},
  now = new Date()
): GamificationGameAdventureIslandEligibility {
  const dayKey = hongKongDayKey(now);
  const roundValidation = validatePracticeGameRound(database, studentId, {
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds
  });
  const completed = roundValidation.topicId
    ? adventureIslandTopicCompletionFor(database, studentId, roundValidation.topicId)
    : null;
  const postAdventureRoundValidation = completed
    ? validatePracticeGameRound(database, studentId, {
        topicId,
        roundKey,
        roundQuestionIds,
        correctRoundQuestionIds,
        afterCreatedAt: completed.created_at
      })
    : null;
  const alreadyCompleted = Boolean(completed);
  const reward = gamificationRewardForSource("adventure-island-complete");
  const base = {
    dayKey,
    topicId: roundValidation.topicId,
    topicTitle: roundValidation.topicTitle,
    roundKey: roundValidation.roundKey,
    roundQuestionCount: roundValidation.roundQuestionIds.length,
    requiredQuestionCount: practiceGameRequiredRoundQuestions,
    attemptCount: roundValidation.attemptedCount,
    correctCount: roundValidation.correctCount,
    accuracyPercent: roundValidation.accuracyPercent,
    alreadyCompleted,
    completedAt: completed?.created_at ?? null,
    postAdventurePracticeEligible: postAdventureRoundValidation?.reason === "ready",
    rewardPreview: reward
  };

  if (alreadyCompleted) return { ...base, eligible: false, reason: "already-completed" };
  if (roundValidation.reason === "ready") return { ...base, eligible: true, reason: "ready" };
  return { ...base, eligible: false, reason: roundValidation.reason };
}

function completeAdventureIslandInPersistence(
  database: GamificationGamePersistenceDatabase,
  {
    studentId,
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds,
    correctQuestionIds,
    durationSeconds,
    defeatedEnemies = 0,
    livesRemaining
  }: GamificationGameAdventureIslandCompletionInput,
  {
    buildGamificationSummaryForStudent,
    createId,
    now
  }: {
    buildGamificationSummaryForStudent: (
      database: GamificationGamePersistenceDatabase,
      studentId: string
    ) => GamificationSummary | null;
    createId: () => string;
    now: Date;
  }
): GamificationGameAdventureIslandCompletionResult | null {
  const eligibility = buildAdventureIslandEligibility(database, studentId, {
    topicId,
    roundKey,
    roundQuestionIds,
    correctRoundQuestionIds
  }, now);
  const topicTitle = eligibility.topicId ? topicTitleForId(database, eligibility.topicId) : { en: "Adventure Island", zh: "探险岛" };
  const label = {
    en: `Adventure Island: ${topicTitle.en}`,
    zh: `探险岛：${topicTitle.zh}`
  };
  const emptyReward = { xp: 0, rewardPoints: 0, label };
  const summary = () => buildGamificationSummaryForStudent(database, studentId);
  const validLivesEvidence =
    livesRemaining === undefined ||
    (Number.isFinite(livesRemaining) && livesRemaining >= 0 && livesRemaining <= adventureIslandMaxLives);
  const validRunShape = (candidateTopicId: string | null): candidateTopicId is string =>
    Number.isFinite(durationSeconds) &&
    durationSeconds >= adventureIslandMinDurationSeconds &&
    durationSeconds <= adventureIslandMaxDurationSeconds &&
    Boolean(candidateTopicId) &&
    validLivesEvidence &&
    defeatedEnemies >= adventureIslandMinCorrectQuestions &&
    verifiedTopicAdventureIslandQuestionCount(database, studentId, correctQuestionIds, candidateTopicId ?? "") >= adventureIslandMinCorrectQuestions;

  if (eligibility.reason === "already-completed") {
    // A replay of a completed topic still cleared THIS run; if the replay
    // passes the same run validation, it upgrades the topic relic even
    // though no reward is repeated.
    const relic = validRunShape(eligibility.topicId)
      ? recordAdventureRelicInPersistence(database, {
          studentId,
          topicId: eligibility.topicId,
          stars: adventureRunEvidence(livesRemaining, durationSeconds).stars
        }, { createId, now: now.toISOString() })
      : null;
    return {
      status: "duplicate",
      eligibility,
      reward: emptyReward,
      relic: relic ? { topicId: eligibility.topicId ?? "", ...relic } : null,
      gamification: summary()
    };
  }
  if (!eligibility.eligible) {
    return { status: "not-eligible", eligibility, reward: emptyReward, gamification: summary() };
  }
  if (!validRunShape(eligibility.topicId)) {
    return { status: "invalid-run", eligibility, reward: emptyReward, gamification: summary() };
  }

  const createdAt = now.toISOString();
  const sourceKey = adventureIslandSourceKey(studentId, eligibility.topicId, eligibility.roundKey);
  const runEvidence = adventureRunEvidence(livesRemaining, durationSeconds);
  const baseRewardPoints = gamificationRewardForSource("adventure-island-complete").rewardPoints;
  const starBonusPoints = runEvidence.threeStar ? adventureIslandThreeStarBonusPoints : 0;
  const decision = recordGamificationEventOnce(database, createId, {
    studentId,
    source: "adventure-island-complete",
    sourceKey,
    label,
    rewardPoints: baseRewardPoints + starBonusPoints,
    createdAt
  });

  if (!decision.allowed) {
    return {
      status: decision.status === "duplicate" ? "duplicate" : "capped",
      eligibility: buildAdventureIslandEligibility(database, studentId, {
        topicId,
        roundKey,
        roundQuestionIds,
        correctRoundQuestionIds
      }, now),
      reward: emptyReward,
      gamification: summary()
    };
  }

  if (decision.appliedRewardPoints > 0) {
    database.reward_point_ledger ??= [];
    database.reward_point_ledger.unshift({
      id: createGamificationRecordId("reward-ledger", createId),
      student_id: studentId,
      amount: decision.appliedRewardPoints,
      reason: "adventure-island-complete",
      label_en: label.en,
      label_zh: label.zh,
      note: starBonusPoints > 0
        ? `Verified ${adventureIslandMinCorrectQuestions} Adventure Island answers for topic ${eligibility.topicId}. Includes the three-star clear bonus (+${starBonusPoints}).`
        : `Verified ${adventureIslandMinCorrectQuestions} Adventure Island answers for topic ${eligibility.topicId}.`,
      source_key: sourceKey,
      created_at: createdAt
    });
  }

  const relic = recordAdventureRelicInPersistence(database, {
    studentId,
    topicId: eligibility.topicId,
    stars: runEvidence.stars
  }, { createId, now: createdAt });

  return {
    status: decision.status === "capped" ? "capped" : "awarded",
    eligibility: buildAdventureIslandEligibility(database, studentId, {
      topicId,
      roundKey,
      roundQuestionIds,
      correctRoundQuestionIds
    }, now),
    reward: {
      xp: decision.appliedXp,
      rewardPoints: decision.appliedRewardPoints,
      label
    },
    starBonus: {
      applied: starBonusPoints > 0,
      rewardPoints: starBonusPoints
    },
    relic: { topicId: eligibility.topicId, ...relic },
    gamification: summary()
  };
}

function completeFishingGameInPersistence(
  database: GamificationGamePersistenceDatabase,
  {
    studentId,
    topicId,
    roundQuestionIds,
    correctRoundQuestionIds,
    caughtQuestionIds,
    correctCaughtQuestionIds,
    caughtSpecies,
    coins,
    netsUsed,
    durationSeconds,
    roundKey
  }: GamificationGameFishingCompletionInput,
  {
    buildGamificationSummaryForStudent,
    createId,
    now
  }: {
    buildGamificationSummaryForStudent: (
      database: GamificationGamePersistenceDatabase,
      studentId: string
    ) => GamificationSummary | null;
    createId: () => string;
    now: Date;
  }
): GamificationGameFishingCompletionResult | null {
  const cleanTopicId = topicId.trim();
  const cleanRoundKey = cleanGameRoundKey(roundKey);
  const cleanCaughtIds = cleanUniqueIds(caughtQuestionIds);
  const cleanCorrectCaughtIds = cleanUniqueIds(correctCaughtQuestionIds);
  const label = {
    en: "Cleared Fishing Master",
    zh: "完成捕魚達人"
  };
  const emptyReward = { xp: 0, rewardPoints: 0, label };
  const summary = () => buildGamificationSummaryForStudent(database, studentId);
  const invalid = (topicForResponse = cleanTopicId): GamificationGameFishingCompletionResult => ({
    status: "invalid-run",
    reward: emptyReward,
    coins: 0,
    topicId: topicForResponse,
    gamification: summary()
  });

  if (
    !cleanTopicId ||
    !cleanRoundKey ||
    !Number.isFinite(coins) ||
    !Number.isFinite(netsUsed) ||
    !Number.isFinite(durationSeconds) ||
    coins < 0 ||
    coins > fishingGameMaxNets ||
    netsUsed < 0 ||
    netsUsed > fishingGameMaxNets ||
    durationSeconds < 0 ||
    durationSeconds > fishingGameMaxDurationSeconds
  ) {
    return invalid();
  }

  const adventureCompletion = adventureIslandTopicCompletionFor(database, studentId, cleanTopicId);
  if (!adventureCompletion) {
    return {
      status: "not-eligible",
      reward: emptyReward,
      coins: 0,
      topicId: cleanTopicId,
      gamification: summary()
    };
  }

  const roundValidation = validatePracticeGameRound(database, studentId, {
    topicId: cleanTopicId,
    roundKey: cleanRoundKey,
    roundQuestionIds,
    correctRoundQuestionIds,
    afterCreatedAt: adventureCompletion.created_at
  });
  if (roundValidation.reason === "invalid-round") return invalid(roundValidation.topicId ?? cleanTopicId);
  if (roundValidation.reason !== "ready" || !roundValidation.topicId) {
    return {
      status: "not-eligible",
      reward: emptyReward,
      coins: 0,
      topicId: roundValidation.topicId ?? cleanTopicId,
      gamification: summary()
    };
  }

  const resolvedTopicId = roundValidation.topicId;
  const caughtQuestions = cleanCaughtIds.map((questionId) => questionForId(database, questionId));
  const correctCaughtQuestions = cleanCorrectCaughtIds.map((questionId) => questionForId(database, questionId));
  if (
    caughtQuestions.some((question) => !question || question.topic_id !== resolvedTopicId) ||
    correctCaughtQuestions.some((question) => !question || question.topic_id !== resolvedTopicId)
  ) {
    return invalid(resolvedTopicId);
  }

  const caughtIdSet = new Set(cleanCaughtIds);
  if (cleanCorrectCaughtIds.some((questionId) => !caughtIdSet.has(questionId))) return invalid(resolvedTopicId);
  if (cleanCaughtIds.length > netsUsed || cleanCorrectCaughtIds.length > cleanCaughtIds.length) return invalid(resolvedTopicId);

  const verifiedCaughtCorrect = verifiedCorrectAttemptIds(database, studentId, cleanCorrectCaughtIds);
  if (cleanCorrectCaughtIds.some((questionId) => !verifiedCaughtCorrect.has(questionId))) return invalid(resolvedTopicId);
  if (coins !== cleanCorrectCaughtIds.length) return invalid(resolvedTopicId);

  // Optional species claims power the rarity bonus and the Fish-dex. Claims
  // must come from the actual tank: known species only, each unique creature
  // caught at most once, and only for questions this run actually caught.
  const speciesEntries = Object.entries(caughtSpecies ?? {});
  const claimedSpecies = speciesEntries.map(([, species]) => species);
  if (
    speciesEntries.some(([questionId]) => !caughtIdSet.has(questionId)) ||
    claimedSpecies.some((species) => !(species in creatureRarities)) ||
    new Set(claimedSpecies).size !== claimedSpecies.length
  ) {
    return invalid(resolvedTopicId);
  }
  const correctCaughtIdSet = new Set(cleanCorrectCaughtIds);
  const correctSpecies = speciesEntries
    .filter(([questionId]) => correctCaughtIdSet.has(questionId))
    .map(([, species]) => species);
  const rarityBonus = correctSpecies.reduce((sum, species) => sum + (creatureRarityFor(species).tier - 1), 0);

  const topicTitle = topicTitleForId(database, resolvedTopicId);
  const rewardPoints = coins * fishingGameRewardPerCoin + rarityBonus;
  if (rewardPoints <= 0) {
    return {
      status: "awarded",
      reward: emptyReward,
      coins,
      rarityBonus: 0,
      dex: null,
      topicId: resolvedTopicId,
      gamification: summary()
    };
  }

  const createdAt = now.toISOString();
  const sourceKey = `fishing-game-complete:${studentId}:${resolvedTopicId}:${gameRoundFingerprint(cleanRoundKey)}`;
  const eventLabel = {
    en: `Fishing Master: ${topicTitle.en}`,
    zh: `捕魚達人：${topicTitle.zh}`
  };
  const decision = recordGamificationEventOnce(database, createId, {
    studentId,
    source: "fishing-game-complete",
    sourceKey,
    label: eventLabel,
    rewardPoints,
    createdAt
  });

  if (!decision.allowed) {
    return {
      status: decision.status === "duplicate" ? "duplicate" : "capped",
      reward: emptyReward,
      coins,
      topicId: resolvedTopicId,
      gamification: summary()
    };
  }

  if (decision.appliedRewardPoints > 0) {
    database.reward_point_ledger ??= [];
    database.reward_point_ledger.unshift({
      id: createGamificationRecordId("reward-ledger", createId),
      student_id: studentId,
      amount: decision.appliedRewardPoints,
      reason: "fishing-game-complete",
      label_en: eventLabel.en,
      label_zh: eventLabel.zh,
      note: rarityBonus > 0
        ? `Converted ${coins} fishing coin(s) at ${fishingGameRewardPerCoin} points each plus a rarity bonus of ${rarityBonus}.`
        : `Converted ${coins} fishing coin(s) at ${fishingGameRewardPerCoin} points each.`,
      source_key: sourceKey,
      created_at: createdAt
    });
  }

  const dexResult = recordFishingDexCatchesInPersistence(database, {
    studentId,
    species: correctSpecies
  }, { createId, now: createdAt });

  return {
    status: decision.status === "capped" ? "capped" : "awarded",
    reward: {
      xp: decision.appliedXp,
      rewardPoints: decision.appliedRewardPoints,
      label
    },
    coins,
    rarityBonus,
    dex: {
      newSpecies: dexResult.newSpecies,
      caughtCount: dexResult.caughtCount,
      totalSpecies: fishingSpeciesTotal
    },
    topicId: resolvedTopicId,
    gamification: summary()
  };
}

export function createGamificationGamePersistenceStore({
  adventureIslandEligibilityFromDatabase = (database, input, eligibilityNow) =>
    buildAdventureIslandEligibility(database, input.studentId, input, eligibilityNow),
  buildGamificationSummaryForStudent = () => null,
  createId = randomUUID,
  now = () => new Date(),
  completeAdventureIslandInDatabase = (database, input) =>
    completeAdventureIslandInPersistence(database, input, {
      buildGamificationSummaryForStudent,
      createId,
      now: now()
    }),
  completeFishingGameInDatabase = (database, input) =>
    completeFishingGameInPersistence(database, input, {
      buildGamificationSummaryForStudent,
      createId,
      now: now()
    }),
  mutateDatabase = () => {
    throw new Error("Gamification game mutation dependency is not configured.");
  },
  readDatabase
}: GamificationGamePersistenceStoreDependencies) {
  return {
    async getAdventureIslandEligibility(
      studentId: string,
      input: Omit<GamificationGameAdventureIslandEligibilityInput, "studentId"> = {}
    ): Promise<GamificationGameAdventureIslandEligibility | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!user) return null;

      return adventureIslandEligibilityFromDatabase(database, {
        ...input,
        studentId
      }, now());
    },

    async completeAdventureIsland(
      input: GamificationGameAdventureIslandCompletionInput
    ): Promise<GamificationGameAdventureIslandCompletionResult | null> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === input.studentId && candidate.role === "student");
        if (!user) return null;

        return completeAdventureIslandInDatabase(database, input);
      });
    },

    async completeFishingGame(
      input: GamificationGameFishingCompletionInput
    ): Promise<GamificationGameFishingCompletionResult | null> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === input.studentId && candidate.role === "student");
        if (!user) return null;

        return completeFishingGameInDatabase(database, input);
      });
    }
  };
}
