import {
  badgeDefinitions,
  dailyQuestDefinitions,
  gamificationEconomy,
  levelDefinitions
} from "../data/gamification";
import type {
  AntiAbuseDecision,
  BadgeCriteriaKind,
  ClassLeaderboardEntry,
  GamificationEconomySummary,
  GamificationEvent,
  GamificationEventSource,
  LevelDefinition,
  LocalizedText,
  QuestTargetType,
  StudentBadge,
  StudentQuestProgress
} from "@/types";

const hongKongTimeZone = "Asia/Hong_Kong";
const dayMs = 24 * 60 * 60 * 1000;

export type GamificationStats = {
  lessonCompletions: number;
  practiceAccuracyAwards: number;
  visualizationCompletions: number;
  mistakeReviews: number;
  streakDays: number;
  level: number;
};

export type QuestEvidence = Partial<Record<QuestTargetType, number>>;

export function hongKongDayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: hongKongTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addDaysToDayKey(dayKey: string, delta: number) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function calculateHongKongStreak(activityTimestamps: string[], asOf: string | Date = new Date()) {
  const activeDays = new Set(activityTimestamps.map((timestamp) => hongKongDayKey(timestamp)));
  let cursor = hongKongDayKey(asOf);
  let streak = 0;

  while (activeDays.has(cursor)) {
    streak += 1;
    cursor = addDaysToDayKey(cursor, -1);
  }

  return streak;
}

export function levelForXp(xp: number, levels = levelDefinitions) {
  const safeXp = Math.max(0, Math.floor(xp));
  const current = levels
    .slice()
    .reverse()
    .find((level) => safeXp >= level.minXp) ?? levels[0];
  const next = levels.find((level) => level.minXp > current.minXp) ?? null;
  const xpForNextLevel = next ? Math.max(1, next.minXp - current.minXp) : Math.max(1, (current.maxXp ?? current.minXp + 1) - current.minXp + 1);
  const xpIntoLevel = next ? safeXp - current.minXp : xpForNextLevel;
  const progressPercent = next ? Math.round(Math.min(1, Math.max(0, xpIntoLevel / xpForNextLevel)) * 100) : 100;

  return {
    current,
    next,
    xpIntoLevel,
    xpForNextLevel,
    progressPercent
  };
}

function eventCountForCriteria(events: GamificationEvent[], kind: BadgeCriteriaKind) {
  const sourceByKind: Partial<Record<BadgeCriteriaKind, GamificationEventSource>> = {
    "lesson-complete": "lesson-complete",
    "practice-accuracy": "practice-accuracy",
    "visualization-complete": "visualization-complete",
    "mistake-review": "mistake-review",
    "adventure-island-complete": "adventure-island-complete",
    "island-star": "island-star"
  };
  const source = sourceByKind[kind];
  return source ? events.filter((event) => event.status === "awarded" && event.source === source).length : 0;
}

export function resolveStudentBadges({
  events,
  streakDays,
  level
}: {
  events: GamificationEvent[];
  streakDays: number;
  level: number;
}): StudentBadge[] {
  return badgeDefinitions
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((definition) => {
      const rawProgress =
        definition.criteria.kind === "streak-days"
          ? streakDays
          : definition.criteria.kind === "level"
            ? level
            : eventCountForCriteria(events, definition.criteria.kind);
      const progress = Math.min(definition.criteria.target, rawProgress);
      const earned = progress >= definition.criteria.target;
      const earnedAt = earned
        ? events
            .filter((event) => event.status === "awarded")
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[Math.max(0, definition.criteria.target - 1)]?.createdAt ?? null
        : null;

      return {
        ...definition,
        earned,
        earnedAt,
        progress
      };
    });
}

export function buildQuestProgress(evidence: QuestEvidence, completedSourceKeys: Set<string>, dayKey: string): StudentQuestProgress[] {
  return dailyQuestDefinitions
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((quest) => {
      const progress = Math.min(quest.targetCount, Math.max(0, evidence[quest.targetType] ?? 0));
      const sourceKey = `quest-complete:${quest.id}:${dayKey}`;

      return {
        quest,
        progress,
        target: quest.targetCount,
        completed: progress >= quest.targetCount,
        claimed: completedSourceKeys.has(sourceKey),
        xpReward: quest.xp,
        rewardPointReward: quest.rewardPoints
      };
    });
}

export function gamificationRewardForSource(source: GamificationEventSource, rewardPoints?: number) {
  const reward = gamificationEconomy.sourceRewards[source];
  const cleanRewardPoints = Math.max(0, Math.round(rewardPoints ?? reward.rewardPoints));
  if (source === "fishing-game-complete") {
    return {
      xp: Math.min(gamificationEconomy.dailyXpCap, cleanRewardPoints),
      rewardPoints: cleanRewardPoints
    };
  }
  if (source === "teacher-award") {
    return {
      xp: Math.min(gamificationEconomy.dailyXpCap, cleanRewardPoints * reward.xp),
      rewardPoints: cleanRewardPoints
    };
  }
  return {
    xp: reward.xp,
    rewardPoints: cleanRewardPoints
  };
}

export function evaluateAntiAbuseEvent({
  source,
  sourceKey,
  requestedXp,
  requestedRewardPoints,
  existingEvents,
  now = new Date().toISOString()
}: {
  source: GamificationEventSource;
  sourceKey: string;
  requestedXp: number;
  requestedRewardPoints: number;
  existingEvents: GamificationEvent[];
  now?: string;
}): AntiAbuseDecision {
  const cleanSourceKey = sourceKey.trim().replace(/\s+/g, "-").slice(0, 240);
  const dayKey = hongKongDayKey(now);
  const awardedToday = existingEvents.filter((event) => event.status === "awarded" && hongKongDayKey(event.createdAt) === dayKey);
  const dailyXpTotal = awardedToday.reduce((sum, event) => sum + Math.max(0, event.xp), 0);
  const dailyRewardPointsTotal = awardedToday.reduce((sum, event) => sum + Math.max(0, event.rewardPoints), 0);
  const reason: LocalizedText = { en: "Award accepted.", zh: "獎勵已接受。" };

  if (!cleanSourceKey || existingEvents.some((event) => event.status === "awarded" && event.sourceKey === cleanSourceKey)) {
    return {
      allowed: false,
      status: "duplicate",
      reason: { en: "This learning signal was already rewarded.", zh: "此學習訊號已獎勵過。" },
      flags: ["duplicate-source-key"],
      appliedXp: 0,
      appliedRewardPoints: 0,
      dailyXpTotal,
      dailyRewardPointsTotal
    };
  }

  const teacherManualToday = awardedToday
    .filter((event) => event.source === "teacher-award")
    .reduce((sum, event) => sum + Math.max(0, event.rewardPoints), 0);
  if (source === "teacher-award" && teacherManualToday + requestedRewardPoints > gamificationEconomy.teacherManualDailyPointCap) {
    return {
      allowed: false,
      status: "capped",
      reason: { en: "Daily teacher-awarded points cap reached.", zh: "已達每日教師加分上限。" },
      flags: ["teacher-daily-cap"],
      appliedXp: 0,
      appliedRewardPoints: 0,
      dailyXpTotal,
      dailyRewardPointsTotal
    };
  }

  const remainingXp = Math.max(0, gamificationEconomy.dailyXpCap - dailyXpTotal);
  const remainingRewardPoints = Math.max(0, gamificationEconomy.dailyRewardPointCap - dailyRewardPointsTotal);
  const appliedXp = Math.min(Math.max(0, Math.round(requestedXp)), remainingXp);
  const appliedRewardPoints = Math.min(Math.max(0, Math.round(requestedRewardPoints)), remainingRewardPoints);
  const capped = appliedXp < requestedXp || appliedRewardPoints < requestedRewardPoints;

  if (appliedXp <= 0 && appliedRewardPoints <= 0) {
    return {
      allowed: false,
      status: "capped",
      reason: { en: "Daily reward cap reached.", zh: "已達每日獎勵上限。" },
      flags: ["daily-cap"],
      appliedXp: 0,
      appliedRewardPoints: 0,
      dailyXpTotal,
      dailyRewardPointsTotal
    };
  }

  return {
    allowed: true,
    status: capped ? "capped" : "awarded",
    reason: capped ? { en: "Award was limited by the daily cap.", zh: "獎勵已按每日上限調整。" } : reason,
    flags: capped ? ["daily-cap-partial"] : [],
    appliedXp,
    appliedRewardPoints,
    dailyXpTotal,
    dailyRewardPointsTotal
  };
}

export function economySummary(): GamificationEconomySummary {
  return {
    version: gamificationEconomy.version,
    expectedWeeklyRewardPoints: gamificationEconomy.expectedWeeklyRewardPoints,
    dailyXpCap: gamificationEconomy.dailyXpCap,
    dailyRewardPointCap: gamificationEconomy.dailyRewardPointCap,
    teacherManualDailyPointCap: gamificationEconomy.teacherManualDailyPointCap,
    basicRewardTargetWeeks: gamificationEconomy.basicRewardTargetWeeks,
    premiumRewardTargetWeeks: gamificationEconomy.premiumRewardTargetWeeks
  };
}

export function rankLeaderboard(entries: Array<Omit<ClassLeaderboardEntry, "rank">>): ClassLeaderboardEntry[] {
  return entries
    .slice()
    .sort((a, b) =>
      b.weeklyXp - a.weeklyXp ||
      b.streakDays - a.streakDays ||
      b.badgeCount - a.badgeCount ||
      a.studentName.localeCompare(b.studentName)
    )
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
}

export function totalAwardedXp(events: GamificationEvent[]) {
  return events
    .filter((event) => event.status === "awarded" || event.status === "capped")
    .reduce((sum, event) => sum + Math.max(0, event.xp), 0);
}

export function awardedSourceKeys(events: GamificationEvent[]) {
  return new Set(events.filter((event) => event.status === "awarded" || event.status === "capped").map((event) => event.sourceKey));
}

export function currentLevelDefinition(xp: number): LevelDefinition {
  return levelForXp(xp).current;
}
