import { randomUUID } from "crypto";
import {
  createGamificationRecordId,
  recordGamificationEventOnce
} from "@/lib/server/userStore/gamificationEventPersistence";
import type {
  GamificationEventSource,
  GamificationEventStatus,
  GradeId,
  LocalizedText,
  RewardCatalogCategory,
  RewardCatalogItem,
  RewardEarnRule,
  RewardPointLedgerEntry,
  RewardPointReason,
  RewardPointSummary,
  RewardRedemptionRequest,
  RewardRedemptionStatus,
  StudentRewardsData,
  TeacherRewardsData
} from "@/types";

type UserRole = "student" | "teacher" | "parent" | "admin";

type GamificationRewardRedemptionUserRecord = {
  id: string;
  username?: string;
  role: UserRole;
};

type GamificationRewardRedemptionStudentProfileRecord = {
  user_id: string;
  name?: string;
  grade?: GradeId;
};

type GamificationRewardTeacherClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year?: string;
  description_en?: string;
  description_zh?: string;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
};

type GamificationRewardClassEnrollmentRecord = {
  id?: string;
  class_id: string;
  student_id: string;
  joined_at?: string;
};

type GamificationRewardSchoolMembershipRecord = {
  id?: string;
  school_id?: string;
  user_id: string;
  role: "student" | "teacher" | "parent" | "admin";
  class_id?: string;
  created_at?: string;
};

type GamificationRewardCatalogRecord = {
  id: string;
  name_en: string;
  name_zh: string;
  description_en: string;
  description_zh: string;
  category: RewardCatalogCategory;
  points_cost: number;
  available: boolean;
  accent: string;
  thumbnail_label: string;
  sort_order: number;
};

type GamificationRewardPointLedgerRecord = {
  id: string;
  student_id: string;
  amount: number;
  reason: RewardPointReason;
  label_en: string;
  label_zh: string;
  note?: string;
  awarded_by?: string;
  redemption_id?: string;
  source_key?: string;
  created_at: string;
};

type GamificationRewardRedemptionRecord = {
  id: string;
  student_id: string;
  item_id: string;
  points_cost: number;
  status: RewardRedemptionStatus;
  requested_at: string;
  decided_at: string | null;
  fulfilled_at: string | null;
  decided_by?: string;
  teacher_note?: string;
};

type GamificationRewardEventRecord = {
  id: string;
  student_id: string;
  xp: number;
  reward_points: number;
  source: GamificationEventSource;
  source_key: string;
  label_en: string;
  label_zh: string;
  status: GamificationEventStatus;
  anti_abuse_flags: string[];
  economy_version: string;
  campaign_id?: string;
  created_at: string;
};

type GamificationRewardLearningEventRecord = {
  id?: string;
  user_id: string;
  type?: string;
  source?: string;
  grade?: GradeId;
  topic_id?: string;
  question_id?: string;
  duration_seconds?: number;
  created_at: string;
};

type GamificationRewardAttemptRecord = {
  id?: string;
  user_id: string;
  question_id: string;
  is_correct: boolean | null;
  created_at: string;
};

type GamificationRewardQuestionRecord = {
  id: string;
  topic_id: string;
  topic_title_en?: string;
  topic_title_zh?: string;
};

type GamificationRewardTopicRecord = {
  id: string;
  title_en: string;
  title_zh: string;
};

type GamificationRewardLessonRecord = {
  slug: string;
  title_en: string;
  title_zh: string;
};

export type GamificationRewardRedemptionPersistenceDatabase = {
  attempts?: GamificationRewardAttemptRecord[];
  class_enrollments?: GamificationRewardClassEnrollmentRecord[];
  gamification_events?: GamificationRewardEventRecord[];
  learning_events?: GamificationRewardLearningEventRecord[];
  questions?: GamificationRewardQuestionRecord[];
  reward_catalog: GamificationRewardCatalogRecord[];
  reward_point_ledger: GamificationRewardPointLedgerRecord[];
  reward_redemptions: GamificationRewardRedemptionRecord[];
  school_memberships?: GamificationRewardSchoolMembershipRecord[];
  student_profiles?: GamificationRewardRedemptionStudentProfileRecord[];
  teacher_classes?: GamificationRewardTeacherClassRecord[];
  topics?: GamificationRewardTopicRecord[];
  users: GamificationRewardRedemptionUserRecord[];
};

export type GamificationRewardRedemptionPersistenceStoreDependencies = {
  createId?: () => string;
  mutateDatabase: <T>(
    mutator: (database: GamificationRewardRedemptionPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
  readDatabase: () => Promise<GamificationRewardRedemptionPersistenceDatabase>;
};

export type GamificationRewardRedemptionPersistenceStore = ReturnType<typeof createGamificationRewardRedemptionPersistenceStore>;

type RewardRedemptionResult =
  | { status: "created"; rewards: StudentRewardsData }
  | { status: "insufficient-points"; rewards: StudentRewardsData }
  | { status: "item-unavailable" | "student-not-found"; rewards?: undefined };

export type AutomaticRewardReason = Exclude<RewardPointReason, "teacher-award" | "redemption-spent">;

const validRewardRedemptionStatuses = new Set<RewardRedemptionStatus>(["pending", "approved", "rejected", "fulfilled"]);

const rewardEarnRules: RewardEarnRule[] = [
  {
    id: "lesson-complete",
    label: { en: "Complete a lesson", zh: "完成課節" },
    detail: {
      en: "Build up mastery in lesson practice — the lesson completes automatically.",
      zh: "在課節練習中提升掌握度，課節會自動完成。",
      zhHans: "在课节练习中提升掌握度，课节会自动完成。"
    },
    points: 40
  },
  {
    id: "practice-accuracy",
    label: { en: "Show strong practice accuracy", zh: "練習準確率良好" },
    detail: { en: "Answer practice questions carefully and improve accuracy.", zh: "細心完成練習題並提升準確率。" },
    points: 30
  },
  {
    id: "streak",
    label: { en: "Keep a learning streak", zh: "保持連續學習" },
    detail: { en: "Return regularly and keep a positive study rhythm.", zh: "定期回來學習，保持良好節奏。" },
    points: 25
  },
  {
    id: "visualization-complete",
    label: { en: "Explore a visualization", zh: "完成視覺化探索" },
    detail: { en: "Use interactive math models to explain what changed.", zh: "使用互動數學模型並解釋變化。" },
    points: 20
  },
  {
    id: "mistake-review",
    label: { en: "Review mistakes", zh: "重溫錯題" },
    detail: { en: "Use the mistake book to correct misunderstandings.", zh: "使用錯題簿修正誤解。" },
    points: 15
  },
  {
    id: "adventure-island-complete",
    label: { en: "Clear an Adventure Island math game", zh: "完成探险岛数学游戏" },
    detail: { en: "Unlock Adventure Island from Practice Arena and clear it with checked quadratic answers.", zh: "由练习场解锁探险岛，并用已批改的二次函数答案通关。" },
    points: 35
  },
  {
    id: "fishing-game-complete",
    label: { en: "Clear a Fishing math game", zh: "完成捕魚數學遊戲" },
    detail: { en: "Earn up to 30 points from a Practice Arena free-selection Fishing Game.", zh: "由練習場自由選題捕魚遊戲最多取得 30 分。" },
    points: 30
  }
];

function rewardEarnRuleFor(reason: AutomaticRewardReason) {
  return rewardEarnRules.find((rule) => rule.id === reason) ?? null;
}

export function awardAutomaticRewardOnce(
  database: GamificationRewardRedemptionPersistenceDatabase,
  {
    studentId,
    reason,
    sourceKey,
    label,
    note,
    createdAt = new Date().toISOString()
  }: {
    studentId: string;
    reason: AutomaticRewardReason;
    sourceKey: string;
    label: LocalizedText;
    note?: string;
    createdAt?: string;
  },
  createId: () => string = randomUUID
) {
  const student = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  const rule = rewardEarnRuleFor(reason);
  const cleanSourceKey = sourceKey.trim().replace(/\s+/g, "-").slice(0, 240);
  if (!student || !rule || !cleanSourceKey) return false;
  if (database.reward_point_ledger.some((entry) => entry.source_key === cleanSourceKey)) return false;
  const decision = recordGamificationEventOnce(database, createId, {
    studentId,
    source: reason,
    sourceKey: cleanSourceKey,
    label,
    rewardPoints: rule.points,
    createdAt
  });
  if (!decision.allowed || decision.appliedRewardPoints <= 0) return false;

  database.reward_point_ledger.unshift({
    id: createGamificationRecordId("reward-ledger", createId),
    student_id: studentId,
    amount: decision.appliedRewardPoints,
    reason,
    label_en: label.en,
    label_zh: label.zh,
    note: note?.trim().replace(/\s+/g, " ").slice(0, 180) || undefined,
    source_key: cleanSourceKey,
    created_at: createdAt
  });
  return true;
}

function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function learningStreakDays(
  database: GamificationRewardRedemptionPersistenceDatabase,
  userId: string,
  asOf: Date
) {
  const activeDates = new Set(
    (database.learning_events ?? [])
      .filter((event) => event.user_id === userId)
      .map((event) => startOfUtcDay(new Date(event.created_at)).toISOString().slice(0, 10))
  );
  let cursor = startOfUtcDay(asOf);
  let count = 0;

  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }

  return count;
}

export function maybeAwardLearningStreakReward(
  database: GamificationRewardRedemptionPersistenceDatabase,
  userId: string,
  asOf: Date,
  createId: () => string = randomUUID
) {
  const streakDays = learningStreakDays(database, userId, asOf);
  if (streakDays < 3) return false;

  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "streak",
    sourceKey: `streak:${userId}:3-day`,
    label: {
      en: "Kept a three-day learning streak",
      zh: "保持三日連續學習"
    },
    createdAt: asOf.toISOString()
  }, createId);
}

function questionForId(
  database: GamificationRewardRedemptionPersistenceDatabase,
  questionId: string
) {
  return (database.questions ?? []).find((question) => question.id === questionId);
}

function topicRecordForId(
  database: GamificationRewardRedemptionPersistenceDatabase,
  topicId: string
) {
  return (database.topics ?? []).find((topic) => topic.id === topicId);
}

export function maybeAwardPracticeAccuracyReward(
  database: GamificationRewardRedemptionPersistenceDatabase,
  userId: string,
  question: GamificationRewardQuestionRecord,
  now: string,
  createId: () => string = randomUUID
) {
  const dayStart = startOfUtcDay(new Date(now));
  const nextDayStart = new Date(dayStart.getTime() + dayMs);
  const topicAttempts = (database.attempts ?? []).filter((attempt) => {
    if (attempt.user_id !== userId) return false;
    const attemptedQuestion = questionForId(database, attempt.question_id);
    if (attemptedQuestion?.topic_id !== question.topic_id) return false;
    const attemptMs = Date.parse(attempt.created_at);
    return attemptMs >= dayStart.getTime() && attemptMs < nextDayStart.getTime();
  });
  const correctAttempts = topicAttempts.filter((attempt) => attempt.is_correct).length;
  if (topicAttempts.length < 5 || correctAttempts / topicAttempts.length < 0.8) return false;

  const topic = topicRecordForId(database, question.topic_id);
  const title = topic
    ? { en: topic.title_en, zh: topic.title_zh }
    : { en: question.topic_id, zh: question.topic_id };

  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "practice-accuracy",
    sourceKey: `practice-accuracy:${userId}:${question.topic_id}:${dayStart.toISOString().slice(0, 10)}`,
    label: {
      en: `Strong ${title.en} practice accuracy`,
      zh: `${title.zh}練習準確率表現良好`
    },
    createdAt: now
  }, createId);
}

export function awardMistakeReviewReward(
  database: GamificationRewardRedemptionPersistenceDatabase,
  {
    userId,
    questionId,
    topic,
    masteredAt
  }: {
    userId: string;
    questionId: string;
    topic?: GamificationRewardTopicRecord | null;
    masteredAt: string;
  },
  createId: () => string = randomUUID
) {
  const title = topic ? { en: topic.title_en, zh: topic.title_zh } : { en: "math", zh: "數學" };
  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "mistake-review",
    sourceKey: `mistake-review:${userId}:${questionId}`,
    label: {
      en: `Reviewed a ${title.en} mistake`,
      zh: `重溫${title.zh}錯題`
    },
    createdAt: masteredAt
  }, createId);
}

export function awardVisualizationCompletionReward(
  database: GamificationRewardRedemptionPersistenceDatabase,
  {
    userId,
    moduleId,
    topicId,
    topic,
    completedAt
  }: {
    userId: string;
    moduleId: string;
    topicId: string;
    topic?: GamificationRewardTopicRecord | null;
    completedAt: string;
  },
  createId: () => string = randomUUID
) {
  const title = topic ? { en: topic.title_en, zh: topic.title_zh } : { en: topicId, zh: topicId };
  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "visualization-complete",
    sourceKey: `visualization-complete:${userId}:${moduleId}`,
    label: {
      en: `Explored the ${title.en} visualization`,
      zh: `完成${title.zh}視覺化探索`
    },
    createdAt: completedAt
  }, createId);
}

export function awardLessonCompletionReward(
  database: GamificationRewardRedemptionPersistenceDatabase,
  {
    userId,
    lesson,
    completedAt
  }: {
    userId: string;
    lesson: GamificationRewardLessonRecord;
    completedAt: string;
  },
  createId: () => string = randomUUID
) {
  return awardAutomaticRewardOnce(database, {
    studentId: userId,
    reason: "lesson-complete",
    sourceKey: `lesson-complete:${userId}:${lesson.slug}`,
    label: {
      en: `Completed ${lesson.title_en}`,
      zh: `完成${lesson.title_zh}`
    },
    createdAt: completedAt
  }, createId);
}

const teacherRewardReasonPresets: RewardEarnRule[] = [
  {
    id: "great-effort",
    label: { en: "Great effort", zh: "努力學習" },
    detail: { en: "For persistence, careful working, or improved study habits.", zh: "獎勵堅持、細心演算或學習習慣進步。" },
    points: 20
  },
  {
    id: "helping-classmates",
    label: { en: "Helping classmates", zh: "幫助同學" },
    detail: { en: "For explaining ideas clearly or supporting peers.", zh: "獎勵清楚解釋想法或支援同學。" },
    points: 15
  },
  {
    id: "improved-accuracy",
    label: { en: "Improved accuracy", zh: "準確率進步" },
    detail: { en: "For reducing repeated mistakes and checking answers.", zh: "獎勵減少重複錯誤及檢查答案。" },
    points: 25
  },
  {
    id: "completed-challenge",
    label: { en: "Completed challenge", zh: "完成挑戰" },
    detail: { en: "For completing a challenge or extension task.", zh: "獎勵完成挑戰題或延伸任務。" },
    points: 30
  }
];

const dayMs = 24 * 60 * 60 * 1000;

function timestampOf(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function canUseTeacherArea(user?: GamificationRewardRedemptionUserRecord | null): user is GamificationRewardRedemptionUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function createRecordId(prefix: string, createId: () => string) {
  const id = createId();
  return id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`;
}

function rewardCatalogFor(database: GamificationRewardRedemptionPersistenceDatabase) {
  return database.reward_catalog
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en));
}

function toRewardCatalogItem(record: GamificationRewardCatalogRecord): RewardCatalogItem {
  return {
    id: record.id,
    name: {
      en: record.name_en,
      zh: record.name_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    category: record.category,
    pointsCost: record.points_cost,
    available: record.available,
    accent: record.accent,
    thumbnailLabel: record.thumbnail_label
  };
}

function rewardCatalogItemFor(database: GamificationRewardRedemptionPersistenceDatabase, itemId: string) {
  return rewardCatalogFor(database).find((item) => item.id === itemId) ?? null;
}

function fallbackRewardCatalogRecord(itemId: string): GamificationRewardCatalogRecord {
  return {
    id: itemId,
    name_en: "Unknown reward",
    name_zh: "未知獎品",
    description_en: "This reward item is no longer in the catalog.",
    description_zh: "此獎品已不在兌換目錄內。",
    category: "stationery",
    points_cost: 1,
    available: false,
    accent: "from-slate-300 via-slate-400 to-slate-500",
    thumbnail_label: "?",
    sort_order: 999
  };
}

function studentNameFor(database: GamificationRewardRedemptionPersistenceDatabase, studentId: string) {
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === studentId);
  const user = database.users.find((candidate) => candidate.id === studentId);
  return profile?.name ?? user?.username ?? "Unknown student";
}

function teacherNameFor(database: GamificationRewardRedemptionPersistenceDatabase, teacherId?: string) {
  if (!teacherId) return undefined;
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === teacherId);
  const user = database.users.find((candidate) => candidate.id === teacherId);
  return profile?.name ?? user?.username;
}

function teacherClassRecordsFor(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord
) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === user.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );

  return (database.teacher_classes ?? [])
    .filter((teacherClass) => (
      user.role === "admin" ||
      teacherClass.teacher_id === user.id ||
      membershipClassIds.has(teacherClass.id)
    ))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

function teacherRewardStudentIds(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord
) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return Array.from(
    new Set(
      (database.class_enrollments ?? [])
        .filter((enrollment) => classIds.has(enrollment.class_id))
        .map((enrollment) => enrollment.student_id)
    )
  );
}

function teacherCanAccessRewardStudent(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord,
  studentId: string
) {
  if (user.role === "admin") return true;
  return teacherClassRecordsFor(database, user).some((teacherClass) =>
    (database.class_enrollments ?? []).some((enrollment) => (
      enrollment.class_id === teacherClass.id &&
      enrollment.student_id === studentId
    ))
  );
}

function classNamesForStudent(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord,
  studentId: string
) {
  const classRecords = teacherClassRecordsFor(database, user);
  return classRecords
    .filter((teacherClass) =>
      (database.class_enrollments ?? []).some((enrollment) => (
        enrollment.class_id === teacherClass.id &&
        enrollment.student_id === studentId
      ))
    )
    .map((teacherClass) => teacherClass.name);
}

function toRewardPointLedgerEntry(
  database: GamificationRewardRedemptionPersistenceDatabase,
  record: GamificationRewardPointLedgerRecord
): RewardPointLedgerEntry {
  return {
    id: record.id,
    studentId: record.student_id,
    studentName: studentNameFor(database, record.student_id),
    amount: record.amount,
    reason: record.reason,
    label: {
      en: record.label_en,
      zh: record.label_zh
    },
    note: record.note,
    awardedBy: record.awarded_by,
    awardedByName: teacherNameFor(database, record.awarded_by),
    redemptionId: record.redemption_id,
    sourceKey: record.source_key,
    createdAt: record.created_at
  };
}

function toRewardRedemptionRequest(
  database: GamificationRewardRedemptionPersistenceDatabase,
  record: GamificationRewardRedemptionRecord
): RewardRedemptionRequest {
  const itemRecord = rewardCatalogItemFor(database, record.item_id) ?? fallbackRewardCatalogRecord(record.item_id);
  const item = toRewardCatalogItem(itemRecord);

  return {
    id: record.id,
    studentId: record.student_id,
    studentName: studentNameFor(database, record.student_id),
    item,
    pointsCost: record.points_cost,
    status: record.status,
    requestedAt: record.requested_at,
    decidedAt: record.decided_at,
    fulfilledAt: record.fulfilled_at,
    decidedBy: record.decided_by,
    decidedByName: teacherNameFor(database, record.decided_by),
    teacherNote: record.teacher_note
  };
}

function rewardReservedPointsForStudent(database: GamificationRewardRedemptionPersistenceDatabase, studentId: string) {
  return database.reward_redemptions
    .filter((redemption) => (
      redemption.student_id === studentId &&
      (redemption.status === "pending" || redemption.status === "approved")
    ))
    .reduce((sum, redemption) => sum + redemption.points_cost, 0);
}

export function rewardSummaryForStudent(
  database: GamificationRewardRedemptionPersistenceDatabase,
  studentId: string
): RewardPointSummary {
  const ledger = database.reward_point_ledger.filter((entry) => entry.student_id === studentId);
  const balance = ledger.reduce((sum, entry) => sum + entry.amount, 0);
  const lifetimeEarned = ledger.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0);
  const spent = Math.abs(ledger.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0));
  const reserved = rewardReservedPointsForStudent(database, studentId);
  const studentRedemptions = database.reward_redemptions.filter((redemption) => redemption.student_id === studentId);

  return {
    balance,
    available: Math.max(0, balance - reserved),
    reserved,
    lifetimeEarned,
    spent,
    pendingRequests: studentRedemptions.filter((redemption) => redemption.status === "pending").length,
    approvedRequests: studentRedemptions.filter((redemption) => redemption.status === "approved").length
  };
}

function buildStudentRewardsData(
  database: GamificationRewardRedemptionPersistenceDatabase,
  studentId: string
): StudentRewardsData {
  return {
    summary: rewardSummaryForStudent(database, studentId),
    earnRules: rewardEarnRules,
    catalog: rewardCatalogFor(database).map(toRewardCatalogItem),
    ledger: database.reward_point_ledger
      .filter((entry) => entry.student_id === studentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((entry) => toRewardPointLedgerEntry(database, entry)),
    redemptions: database.reward_redemptions
      .filter((redemption) => redemption.student_id === studentId)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
      .map((redemption) => toRewardRedemptionRequest(database, redemption))
  };
}

export function teacherRewardDashboardSummary(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord,
  nowMs: number
) {
  const studentIds = teacherRewardStudentIds(database, user);
  const studentSummaries = studentIds
    .map((studentId) => ({
      studentId,
      studentName: studentNameFor(database, studentId),
      summary: rewardSummaryForStudent(database, studentId)
    }))
    .sort((a, b) => b.summary.available - a.summary.available || a.studentName.localeCompare(b.studentName));
  const studentIdSet = new Set(studentIds);
  const recentCutoff = nowMs - 7 * dayMs;

  return {
    pendingRedemptions: database.reward_redemptions.filter((redemption) =>
      studentIdSet.has(redemption.student_id) && redemption.status === "pending"
    ).length,
    approvedRedemptions: database.reward_redemptions.filter((redemption) =>
      studentIdSet.has(redemption.student_id) && redemption.status === "approved"
    ).length,
    pointsAwardedThisWeek: database.reward_point_ledger
      .filter((entry) => {
        const createdAt = timestampOf(entry.created_at);
        return studentIdSet.has(entry.student_id) && entry.amount > 0 && createdAt !== null && createdAt >= recentCutoff && createdAt <= nowMs;
      })
      .reduce((sum, entry) => sum + entry.amount, 0),
    topStudentName: studentSummaries[0]?.studentName ?? null,
    topStudentAvailablePoints: studentSummaries[0]?.summary.available ?? 0
  };
}

function buildTeacherRewardsData(
  database: GamificationRewardRedemptionPersistenceDatabase,
  user: GamificationRewardRedemptionUserRecord,
  nowMs: number
): TeacherRewardsData {
  const studentIds = teacherRewardStudentIds(database, user);
  const studentIdSet = new Set(studentIds);
  const dashboardSummary = teacherRewardDashboardSummary(database, user, nowMs);
  const students = studentIds
    .map((studentId): TeacherRewardsData["students"][number] => {
      const profile = database.student_profiles?.find((candidate) => candidate.user_id === studentId);
      return {
        studentId,
        studentName: studentNameFor(database, studentId),
        grade: profile?.grade ?? "S3",
        classNames: classNamesForStudent(database, user, studentId),
        summary: rewardSummaryForStudent(database, studentId)
      };
    })
    .sort((a, b) => b.summary.available - a.summary.available || a.studentName.localeCompare(b.studentName));

  return {
    generatedAt: new Date(nowMs).toISOString(),
    totals: {
      students: students.length,
      availablePoints: students.reduce((sum, student) => sum + student.summary.available, 0),
      pendingRedemptions: dashboardSummary.pendingRedemptions,
      approvedRedemptions: dashboardSummary.approvedRedemptions,
      fulfilledRedemptions: database.reward_redemptions.filter((redemption) =>
        studentIdSet.has(redemption.student_id) && redemption.status === "fulfilled"
      ).length,
      pointsAwardedThisWeek: dashboardSummary.pointsAwardedThisWeek
    },
    reasonPresets: teacherRewardReasonPresets,
    students,
    catalog: rewardCatalogFor(database).map(toRewardCatalogItem),
    redemptions: database.reward_redemptions
      .filter((redemption) => studentIdSet.has(redemption.student_id))
      .sort((a, b) => {
        const statusRank = { pending: 0, approved: 1, fulfilled: 2, rejected: 3 } satisfies Record<RewardRedemptionStatus, number>;
        return statusRank[a.status] - statusRank[b.status] || b.requested_at.localeCompare(a.requested_at);
      })
      .map((redemption) => toRewardRedemptionRequest(database, redemption)),
    recentLedger: database.reward_point_ledger
      .filter((entry) => studentIdSet.has(entry.student_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 12)
      .map((entry) => toRewardPointLedgerEntry(database, entry))
  };
}

export function createGamificationRewardRedemptionPersistenceStore({
  createId = randomUUID,
  mutateDatabase,
  now = () => new Date(),
  readDatabase
}: GamificationRewardRedemptionPersistenceStoreDependencies) {
  return {
    async getStudentRewardsData(studentId: string): Promise<StudentRewardsData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!user) return null;

      return buildStudentRewardsData(database, studentId);
    },
    async getTeacherRewardsData(teacherId: string): Promise<TeacherRewardsData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return null;

      return buildTeacherRewardsData(database, user, now().getTime());
    },
    async requestRewardRedemption({
      studentId,
      itemId
    }: {
      studentId: string;
      itemId: string;
    }): Promise<RewardRedemptionResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
        if (!user) return { status: "student-not-found" };

        const item = rewardCatalogItemFor(database, itemId);
        if (!item || !item.available) return { status: "item-unavailable" };

        if (rewardSummaryForStudent(database, studentId).available < item.points_cost) {
          return {
            status: "insufficient-points",
            rewards: buildStudentRewardsData(database, studentId)
          };
        }

        database.reward_redemptions.unshift({
          id: createRecordId("reward-redemption", createId),
          student_id: studentId,
          item_id: item.id,
          points_cost: item.points_cost,
          status: "pending",
          requested_at: now().toISOString(),
          decided_at: null,
          fulfilled_at: null
        });

        return {
          status: "created",
          rewards: buildStudentRewardsData(database, studentId)
        };
      });
    },
    async awardTeacherRewardPoints({
      teacherId,
      studentId,
      amount,
      reasonPresetId,
      note
    }: {
      teacherId: string;
      studentId: string;
      amount: number;
      reasonPresetId: string;
      note?: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        if (!teacherCanAccessRewardStudent(database, user, studentId)) return { status: "student-not-found" as const };

        const cleanAmount = Math.round(Number(amount));
        if (!Number.isFinite(cleanAmount) || cleanAmount < 1 || cleanAmount > 500) return { status: "invalid" as const };

        const preset = teacherRewardReasonPresets.find((candidate) => candidate.id === reasonPresetId) ?? teacherRewardReasonPresets[0];
        const cleanNote = note?.trim().replace(/\s+/g, " ").slice(0, 180);
        const awardedAt = now();
        const awardedAtIso = awardedAt.toISOString();
        const sourceKey = `teacher-award:${teacherId}:${studentId}:${awardedAtIso}:${createId()}`;
        const label = {
          en: `Teacher bonus: ${preset.label.en}`,
          zh: `教師獎勵：${preset.label.zh}`
        };
        const decision = recordGamificationEventOnce(database, createId, {
          studentId,
          source: "teacher-award",
          sourceKey,
          label,
          rewardPoints: cleanAmount,
          createdAt: awardedAtIso
        });
        if (!decision.allowed || decision.appliedRewardPoints < cleanAmount) {
          return { status: "capped" as const, rewards: buildTeacherRewardsData(database, user, awardedAt.getTime()) };
        }

        database.reward_point_ledger.unshift({
          id: createRecordId("reward-ledger", createId),
          student_id: studentId,
          amount: cleanAmount,
          reason: "teacher-award",
          label_en: label.en,
          label_zh: label.zh,
          note: cleanNote || undefined,
          awarded_by: teacherId,
          source_key: sourceKey,
          created_at: awardedAtIso
        });

        return { status: "awarded" as const, rewards: buildTeacherRewardsData(database, user, awardedAt.getTime()) };
      });
    },
    async updateTeacherRewardRedemption({
      teacherId,
      requestId,
      status,
      teacherNote
    }: {
      teacherId: string;
      requestId: string;
      status: RewardRedemptionStatus;
      teacherNote?: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const redemption = database.reward_redemptions.find((candidate) => candidate.id === requestId);
        if (!redemption || !teacherCanAccessRewardStudent(database, user, redemption.student_id)) return { status: "not-found" as const };
        if (status === "pending" || !validRewardRedemptionStatuses.has(status)) return { status: "invalid" as const };

        const updatedAt = now();
        const updatedAtIso = updatedAt.toISOString();
        const cleanNote = teacherNote?.trim().replace(/\s+/g, " ").slice(0, 180);

        if (status === "approved") {
          if (redemption.status !== "pending") return { status: "invalid-transition" as const };
          redemption.status = "approved";
          redemption.decided_at = updatedAtIso;
          redemption.decided_by = teacherId;
          redemption.teacher_note = cleanNote || redemption.teacher_note;
          return { status: "updated" as const, rewards: buildTeacherRewardsData(database, user, updatedAt.getTime()) };
        }

        if (status === "rejected") {
          if (redemption.status !== "pending" && redemption.status !== "approved") return { status: "invalid-transition" as const };
          redemption.status = "rejected";
          redemption.decided_at = updatedAtIso;
          redemption.fulfilled_at = null;
          redemption.decided_by = teacherId;
          redemption.teacher_note = cleanNote || redemption.teacher_note;
          return { status: "updated" as const, rewards: buildTeacherRewardsData(database, user, updatedAt.getTime()) };
        }

        if (redemption.status !== "approved") return { status: "invalid-transition" as const };

        const summary = rewardSummaryForStudent(database, redemption.student_id);
        if (summary.balance < redemption.points_cost) return { status: "insufficient-points" as const };

        redemption.status = "fulfilled";
        redemption.decided_at = redemption.decided_at ?? updatedAtIso;
        redemption.fulfilled_at = updatedAtIso;
        redemption.decided_by = teacherId;
        redemption.teacher_note = cleanNote || redemption.teacher_note;

        if (!database.reward_point_ledger.some((entry) => entry.redemption_id === redemption.id && entry.reason === "redemption-spent")) {
          const item = rewardCatalogItemFor(database, redemption.item_id);
          database.reward_point_ledger.unshift({
            id: createRecordId("reward-ledger", createId),
            student_id: redemption.student_id,
            amount: -redemption.points_cost,
            reason: "redemption-spent",
            label_en: `Redeemed ${item?.name_en ?? "reward"}`,
            label_zh: `兌換${item?.name_zh ?? "獎品"}`,
            redemption_id: redemption.id,
            awarded_by: teacherId,
            created_at: updatedAtIso
          });
        }

        return { status: "updated" as const, rewards: buildTeacherRewardsData(database, user, updatedAt.getTime()) };
      });
    }
  };
}
