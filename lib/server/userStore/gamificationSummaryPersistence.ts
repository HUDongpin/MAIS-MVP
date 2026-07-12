import {
  awardedSourceKeys,
  buildQuestProgress,
  calculateHongKongStreak,
  economySummary,
  hongKongDayKey,
  levelForXp,
  rankLeaderboard,
  resolveStudentBadges,
  totalAwardedXp
} from "@/lib/gamification";
import { curriculumTrackForProfile, normalizeStoredCurriculumProfile } from "@/lib/curriculumProfile";
import type {
  CurriculumRegion,
  CurriculumTrack,
  GamificationEvent,
  GamificationEventSource,
  GamificationEventStatus,
  GamificationSummary,
  GradeId,
  LearningAnalyticsEvent,
  RewardCampaign,
  RewardCampaignStatus,
  RewardPointReason,
  RewardPointSummary,
  RewardRedemptionStatus,
  TeacherClass,
  TeacherGamificationData,
  TextbookPublisher
} from "@/types";

const dayMs = 24 * 60 * 60 * 1000;

type UserRole = "student" | "teacher" | "parent" | "admin";

type GamificationSummaryUserRecord = {
  id: string;
  username?: string;
  role: UserRole;
};

type GamificationSummaryStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
  curriculum_track?: CurriculumTrack;
  curriculum_region?: CurriculumRegion;
  textbook_publisher?: TextbookPublisher;
};

type GamificationSummaryAttemptRecord = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
};

type GamificationSummaryLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  status: string;
  mastery: number;
  completed_at: string | null;
  updated_at: string;
};

type GamificationSummaryLearningEventRecord = {
  id: string;
  user_id: string;
  type: LearningAnalyticsEvent["type"];
  source: LearningAnalyticsEvent["source"];
  grade: GradeId;
  topic_id: string;
  question_id?: string;
  duration_seconds?: number;
  created_at: string;
};

type GamificationSummaryVisualizationSessionRecord = {
  user_id: string;
  module_id: string;
  topic_id: string;
  source: LearningAnalyticsEvent["source"];
  explored: boolean;
  completed_at: string | null;
  updated_at: string;
};

type GamificationSummaryTeacherClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year: string;
  description_en: string;
  description_zh: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

type GamificationSummaryClassEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type GamificationSummarySchoolMembershipRecord = {
  user_id: string;
  role: UserRole;
  class_id?: string;
};

type GamificationSummaryRewardPointLedgerRecord = {
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

type GamificationSummaryRewardRedemptionRecord = {
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

type GamificationSummaryEventRecord = {
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

type GamificationSummaryRewardCampaignRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  description_en: string;
  description_zh: string;
  status: RewardCampaignStatus;
  budget_points: number;
  awarded_points: number;
  quest_ids: string[];
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

export type GamificationSummaryPersistenceDatabase = {
  users: GamificationSummaryUserRecord[];
  student_profiles: GamificationSummaryStudentProfileRecord[];
  attempts: GamificationSummaryAttemptRecord[];
  learning_events: GamificationSummaryLearningEventRecord[];
  lesson_progress: GamificationSummaryLessonProgressRecord[];
  visualization_sessions: GamificationSummaryVisualizationSessionRecord[];
  class_enrollments: GamificationSummaryClassEnrollmentRecord[];
  teacher_classes: GamificationSummaryTeacherClassRecord[];
  school_memberships?: GamificationSummarySchoolMembershipRecord[];
  reward_point_ledger: GamificationSummaryRewardPointLedgerRecord[];
  reward_redemptions: GamificationSummaryRewardRedemptionRecord[];
  gamification_events: GamificationSummaryEventRecord[];
  reward_campaigns: GamificationSummaryRewardCampaignRecord[];
};

export type GamificationSummaryPersistenceStoreDependencies = {
  getFastStudentGamificationSummary?: (studentId: string) => Promise<GamificationSummary | null | undefined>;
  now?: () => Date;
  readDatabase: () => Promise<GamificationSummaryPersistenceDatabase>;
};

export type GamificationSummaryPersistenceStore = ReturnType<typeof createGamificationSummaryPersistenceStore>;

function studentProfileFor(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  return database.student_profiles.find((profile) => profile.user_id === studentId);
}

function studentNameFor(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  const profile = studentProfileFor(database, studentId);
  const user = database.users.find((candidate) => candidate.id === studentId);
  return profile?.name ?? user?.username ?? "Unknown student";
}

function canUseTeacherArea(user?: GamificationSummaryUserRecord | null): user is GamificationSummaryUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function curriculumProfileForUser(database: GamificationSummaryPersistenceDatabase, userId?: string | null) {
  const profile = userId ? studentProfileFor(database, userId) : null;
  return normalizeStoredCurriculumProfile({
    curriculumTrack: profile?.curriculum_track,
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });
}

function teacherClassRecordsFor(
  database: GamificationSummaryPersistenceDatabase,
  user: GamificationSummaryUserRecord
) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => membership.user_id === user.id && membership.class_id && (membership.role === "teacher" || membership.role === "admin"))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes
    .filter((teacherClass) => user.role === "admin" || teacherClass.teacher_id === user.id || membershipClassIds.has(teacherClass.id))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

function toTeacherClass(
  database: GamificationSummaryPersistenceDatabase,
  record: GamificationSummaryTeacherClassRecord
): TeacherClass {
  const curriculumProfile = curriculumProfileForUser(database, record.teacher_id);

  return {
    id: record.id,
    teacherId: record.teacher_id,
    schoolId: record.school_id,
    classCode: record.class_code,
    name: record.name,
    grade: record.grade,
    curriculumTrack: curriculumTrackForProfile(curriculumProfile),
    curriculumProfile,
    academicYear: record.academic_year,
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    studentCount: database.class_enrollments.filter((enrollment) => enrollment.class_id === record.id).length,
    inviteCode: record.invite_code,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function rewardReservedPointsForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  return database.reward_redemptions
    .filter((redemption) => redemption.student_id === studentId && (redemption.status === "pending" || redemption.status === "approved"))
    .reduce((sum, redemption) => sum + redemption.points_cost, 0);
}

function rewardSummaryForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string): RewardPointSummary {
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

function toGamificationEvent(record: GamificationSummaryEventRecord): GamificationEvent {
  return {
    id: record.id,
    studentId: record.student_id,
    xp: record.xp,
    rewardPoints: record.reward_points,
    source: record.source,
    sourceKey: record.source_key,
    label: {
      en: record.label_en,
      zh: record.label_zh
    },
    status: record.status,
    antiAbuseFlags: record.anti_abuse_flags,
    economyVersion: record.economy_version,
    campaignId: record.campaign_id,
    createdAt: record.created_at
  };
}

function gamificationEventsForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  return database.gamification_events
    .filter((event) => event.student_id === studentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(toGamificationEvent);
}

function toRewardCampaign(record: GamificationSummaryRewardCampaignRecord): RewardCampaign {
  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    description: {
      en: record.description_en,
      zh: record.description_zh
    },
    status: record.status,
    budgetPoints: record.budget_points,
    awardedPoints: record.awarded_points,
    questIds: record.quest_ids,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function allClassNamesForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.student_id === studentId)
    .map((enrollment) => database.teacher_classes.find((teacherClass) => teacherClass.id === enrollment.class_id)?.name)
    .filter((className): className is string => Boolean(className));
}

function activityTimestampsForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  return [
    ...database.attempts.filter((attempt) => attempt.user_id === studentId).map((attempt) => attempt.created_at),
    ...database.learning_events.filter((event) => event.user_id === studentId).map((event) => event.created_at),
    ...database.lesson_progress
      .filter((progress) => progress.user_id === studentId && progress.completed_at)
      .map((progress) => progress.completed_at)
      .filter((value): value is string => Boolean(value)),
    ...database.visualization_sessions
      .filter((session) => session.user_id === studentId && session.completed_at)
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
    ...database.gamification_events.filter((event) => event.student_id === studentId).map((event) => event.created_at)
  ];
}

function questEvidenceForStudent(database: GamificationSummaryPersistenceDatabase, studentId: string, dayKey: string) {
  const onDay = (value: string | null | undefined) => Boolean(value && hongKongDayKey(value) === dayKey);
  const events = database.gamification_events.filter((event) => event.student_id === studentId && onDay(event.created_at));

  return {
    "answer-correct": database.attempts.filter((attempt) => attempt.user_id === studentId && attempt.is_correct && onDay(attempt.created_at)).length,
    "lesson-complete": database.lesson_progress.filter((progress) => progress.user_id === studentId && progress.status === "completed" && onDay(progress.completed_at)).length,
    "visualization-complete": Math.max(
      events.filter((event) => event.source === "visualization-complete").length,
      database.visualization_sessions.filter((session) => session.user_id === studentId && Boolean(session.completed_at) && onDay(session.completed_at)).length
    ),
    "mistake-review": Math.max(
      events.filter((event) => event.source === "mistake-review").length,
      database.learning_events.filter((event) => event.user_id === studentId && event.type === "mistake-review" && onDay(event.created_at)).length
    )
  };
}

function classStudentIdsForLeaderboard(database: GamificationSummaryPersistenceDatabase, studentId: string) {
  const classId = database.class_enrollments.find((enrollment) => enrollment.student_id === studentId)?.class_id;
  if (!classId) return [studentId];
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

function leaderboardForStudents(
  database: GamificationSummaryPersistenceDatabase,
  studentIds: string[],
  now: Date,
  currentStudentId?: string
) {
  const nowMs = now.getTime();
  const weekStartMs = nowMs - 7 * dayMs;

  return rankLeaderboard(studentIds.map((studentId) => {
    const events = gamificationEventsForStudent(database, studentId);
    const weeklyEvents = events.filter((event) => {
      const createdAt = Date.parse(event.createdAt);
      return event.status === "awarded" && Number.isFinite(createdAt) && createdAt >= weekStartMs && createdAt <= nowMs;
    });
    const xp = totalAwardedXp(events);
    const level = levelForXp(xp).current.level;
    const streakDays = calculateHongKongStreak(activityTimestampsForStudent(database, studentId), now);
    const badgeCount = resolveStudentBadges({ events, streakDays, level }).filter((badge) => badge.earned).length;
    const profile = studentProfileFor(database, studentId);

    return {
      studentId,
      studentName: studentNameFor(database, studentId),
      grade: profile?.grade ?? "S3",
      classNames: allClassNamesForStudent(database, studentId),
      weeklyXp: weeklyEvents.reduce((sum, event) => sum + Math.max(0, event.xp), 0),
      weeklyRewardPoints: weeklyEvents.reduce((sum, event) => sum + Math.max(0, event.rewardPoints), 0),
      level,
      badgeCount,
      streakDays,
      isCurrentStudent: studentId === currentStudentId
    };
  }));
}

function teacherRewardStudentIds(
  database: GamificationSummaryPersistenceDatabase,
  user: GamificationSummaryUserRecord
) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return Array.from(
    new Set(
      database.class_enrollments
        .filter((enrollment) => classIds.has(enrollment.class_id))
        .map((enrollment) => enrollment.student_id)
    )
  );
}

export function buildTeacherGamificationDataForUser(
  database: GamificationSummaryPersistenceDatabase,
  user: GamificationSummaryUserRecord,
  classId: string | null | undefined,
  now: Date
): TeacherGamificationData {
  const classRecords = teacherClassRecordsFor(database, user);
  const classes = classRecords.map((teacherClass) => toTeacherClass(database, teacherClass));
  const selectedClassId = classId && classRecords.some((teacherClass) => teacherClass.id === classId)
    ? classId
    : classRecords[0]?.id ?? null;
  const studentIds = selectedClassId
    ? database.class_enrollments
        .filter((enrollment) => enrollment.class_id === selectedClassId)
        .map((enrollment) => enrollment.student_id)
    : teacherRewardStudentIds(database, user);
  const studentIdSet = new Set(studentIds);
  const leaderboard = leaderboardForStudents(database, studentIds, now);
  const nowMs = now.getTime();
  const weekStartMs = nowMs - 7 * dayMs;
  const recentEvents = database.gamification_events.filter((event) => {
    const createdAt = Date.parse(event.created_at);
    return studentIdSet.has(event.student_id) && Number.isFinite(createdAt) && createdAt >= weekStartMs && createdAt <= nowMs;
  });
  const classIdSet = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const statusRank = { active: 0, draft: 1, paused: 2, ended: 3 } satisfies Record<RewardCampaignStatus, number>;
  const campaigns = database.reward_campaigns
    .filter((campaign) => classIdSet.has(campaign.class_id) && (!selectedClassId || campaign.class_id === selectedClassId))
    .sort((a, b) => statusRank[a.status] - statusRank[b.status] || b.updated_at.localeCompare(a.updated_at))
    .map(toRewardCampaign);
  const flaggedEvents = recentEvents.filter((event) => event.status === "capped" || event.status === "flagged");

  return {
    generatedAt: now.toISOString(),
    classes,
    selectedClassId,
    leaderboard,
    campaigns,
    economy: economySummary(),
    antiAbuseAlerts: flaggedEvents.slice(0, 4).map((event) => ({
      en: `${studentNameFor(database, event.student_id)} hit ${event.anti_abuse_flags.join(", ") || "a reward limit"}.`,
      zh: `${studentNameFor(database, event.student_id)} 觸發${event.anti_abuse_flags.join("、") || "獎勵上限"}。`
    })),
    totals: {
      activeCampaigns: campaigns.filter((campaign) => campaign.status === "active").length,
      weeklyXp: recentEvents.reduce((sum, event) => sum + Math.max(0, event.xp), 0),
      weeklyRewardPoints: recentEvents.reduce((sum, event) => sum + Math.max(0, event.reward_points), 0),
      flaggedEvents: flaggedEvents.length
    }
  };
}

export function buildGamificationSummaryForDatabase(
  database: GamificationSummaryPersistenceDatabase,
  studentId: string,
  now: Date
): GamificationSummary | null {
  const user = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
  if (!user) return null;

  const events = gamificationEventsForStudent(database, studentId);
  const xp = totalAwardedXp(events);
  const level = levelForXp(xp);
  const streakDays = calculateHongKongStreak(activityTimestampsForStudent(database, studentId), now);
  const badges = resolveStudentBadges({ events, streakDays, level: level.current.level });
  const todayKey = hongKongDayKey(now);
  const quests = buildQuestProgress(questEvidenceForStudent(database, studentId, todayKey), awardedSourceKeys(events), todayKey);
  const earnedBadges = badges.filter((badge) => badge.earned);
  const leaderboard = leaderboardForStudents(database, classStudentIdsForLeaderboard(database, studentId), now, studentId).slice(0, 6);
  const nextQuest = quests.find((quest) => !quest.completed);

  return {
    generatedAt: now.toISOString(),
    studentId,
    xp,
    level,
    streakDays,
    badges,
    earnedBadges,
    quests,
    leaderboard,
    recentEvents: events.slice(0, 8),
    rewardSummary: rewardSummaryForStudent(database, studentId),
    economy: economySummary(),
    motivation: {
      celebrate: [
        earnedBadges[0]
          ? { en: `${earnedBadges[0].name.en} badge is unlocked.`, zh: `已解鎖「${earnedBadges[0].name.zh}」徽章。` }
          : { en: `Level ${level.current.level} growth is building.`, zh: `第 ${level.current.level} 級成長正在累積。` },
        streakDays > 0
          ? { en: `${streakDays}-day learning rhythm is active.`, zh: `已保持 ${streakDays} 日學習節奏。` }
          : { en: "A short first session today can start the streak.", zh: "今天完成一次短學習即可開始連續紀錄。" }
      ],
      support: [
        nextQuest
          ? { en: `Next small step: ${nextQuest.quest.title.en}.`, zh: `下一個小目標：${nextQuest.quest.title.zh}。` }
          : { en: "All daily quests are complete.", zh: "今天的每日任務已完成。" },
        { en: "XP builds levels and is never spent when gifts are redeemed.", zh: "XP 用於成長等級，兌換獎品時不會扣減。" }
      ]
    }
  };
}

export function createGamificationSummaryPersistenceStore({
  getFastStudentGamificationSummary = async () => undefined,
  now = () => new Date(),
  readDatabase
}: GamificationSummaryPersistenceStoreDependencies) {
  return {
    async getStudentGamificationSummary(studentId: string) {
      const fastSummary = await getFastStudentGamificationSummary(studentId);
      if (fastSummary !== undefined) return fastSummary;

      const database = await readDatabase();
      return buildGamificationSummaryForDatabase(database, studentId, now());
    },
    async getTeacherGamificationData(teacherId: string, classId?: string | null) {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return null;

      return buildTeacherGamificationDataForUser(database, user, classId, now());
    }
  };
}
