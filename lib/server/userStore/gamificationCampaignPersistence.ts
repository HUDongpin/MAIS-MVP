import { randomUUID } from "crypto";
import { dailyQuestDefinitions } from "@/data/gamification";
import type {
  GradeId,
  RewardCampaign,
  RewardCampaignStatus,
  TeacherGamificationData
} from "@/types";

type GamificationCampaignUserRole = "student" | "teacher" | "parent" | "admin";

type GamificationCampaignUserRecord = {
  id: string;
  role: GamificationCampaignUserRole;
};

type GamificationCampaignTeacherClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade?: GradeId;
};

type GamificationCampaignClassEnrollmentRecord = {
  id?: string;
  class_id: string;
  student_id: string;
};

type GamificationCampaignRecord = {
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

export type GamificationCampaignPersistenceDatabase = {
  class_enrollments?: GamificationCampaignClassEnrollmentRecord[];
  reward_campaigns: GamificationCampaignRecord[];
  teacher_classes: GamificationCampaignTeacherClassRecord[];
  users: GamificationCampaignUserRecord[];
};

export type GamificationCampaignPersistenceStoreDependencies = {
  buildTeacherGamificationData: (
    database: GamificationCampaignPersistenceDatabase,
    user: GamificationCampaignUserRecord,
    classId?: string | null
  ) => TeacherGamificationData;
  createId?: () => string;
  mutateDatabase: <T>(
    mutator: (database: GamificationCampaignPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  now?: () => Date;
};

export type GamificationCampaignPersistenceStore = ReturnType<typeof createGamificationCampaignPersistenceStore>;

const validRewardCampaignStatuses = new Set<RewardCampaignStatus>(["draft", "active", "paused", "ended"]);
const dayMs = 24 * 60 * 60 * 1000;

function canUseTeacherArea(user?: GamificationCampaignUserRecord | null): user is GamificationCampaignUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(
  database: GamificationCampaignPersistenceDatabase,
  user: GamificationCampaignUserRecord
) {
  if (user.role === "admin") return database.teacher_classes;
  return database.teacher_classes.filter((teacherClass) => teacherClass.teacher_id === user.id);
}

function cleanLocalizedInput(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ").slice(0, 120) : fallback;
}

function createRecordId(prefix: string, createId: () => string) {
  const id = createId();
  return id.startsWith(`${prefix}-`) ? id : `${prefix}-${id}`;
}

export function toRewardCampaign(record: GamificationCampaignRecord): RewardCampaign {
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

export function createGamificationCampaignPersistenceStore({
  buildTeacherGamificationData,
  createId = () => randomUUID(),
  mutateDatabase,
  now = () => new Date()
}: GamificationCampaignPersistenceStoreDependencies) {
  return {
    async createRewardCampaign({
      teacherId,
      classId,
      titleEn,
      titleZh,
      descriptionEn,
      descriptionZh,
      budgetPoints,
      questIds,
      startsAt,
      endsAt
    }: {
      teacherId: string;
      classId: string;
      titleEn?: string;
      titleZh?: string;
      descriptionEn?: string;
      descriptionZh?: string;
      budgetPoints: number;
      questIds: string[];
      startsAt?: string;
      endsAt?: string;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const classRecord = teacherClassRecordsFor(database, user).find((candidate) => candidate.id === classId);
        if (!classRecord) return { status: "class-not-found" as const };

        const cleanBudget = Math.max(0, Math.round(Number(budgetPoints) || 0));
        if (cleanBudget < 100 || cleanBudget > 20000) return { status: "invalid" as const };
        const validQuestIds = questIds.filter((questId) => dailyQuestDefinitions.some((quest) => quest.id === questId));
        const createdAt = now().toISOString();
        const start = startsAt && !Number.isNaN(Date.parse(startsAt)) ? new Date(startsAt).toISOString() : createdAt;
        const end = endsAt && !Number.isNaN(Date.parse(endsAt)) ? new Date(endsAt).toISOString() : new Date(Date.parse(start) + 7 * dayMs).toISOString();
        if (Date.parse(end) <= Date.parse(start)) return { status: "invalid" as const };

        database.reward_campaigns.unshift({
          id: createRecordId("campaign", createId),
          teacher_id: teacherId,
          class_id: classRecord.id,
          title_en: cleanLocalizedInput(titleEn, "Class motivation campaign"),
          title_zh: cleanLocalizedInput(titleZh, "班級激勵活動"),
          description_en: cleanLocalizedInput(descriptionEn, "Reward steady learning routines across the class."),
          description_zh: cleanLocalizedInput(descriptionZh, "獎勵全班穩定學習習慣。"),
          status: "active",
          budget_points: cleanBudget,
          awarded_points: 0,
          quest_ids: validQuestIds.length ? validQuestIds : dailyQuestDefinitions.map((quest) => quest.id),
          starts_at: start,
          ends_at: end,
          created_at: createdAt,
          updated_at: createdAt
        });

        return {
          status: "created" as const,
          gamification: buildTeacherGamificationData(database, user, classRecord.id)
        };
      });
    },
    async updateRewardCampaign({
      teacherId,
      campaignId,
      status,
      budgetPoints
    }: {
      teacherId: string;
      campaignId: string;
      status?: RewardCampaignStatus;
      budgetPoints?: number;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const campaign = database.reward_campaigns.find((candidate) => candidate.id === campaignId);
        const classRecord = campaign
          ? teacherClassRecordsFor(database, user).find((candidate) => candidate.id === campaign.class_id)
          : null;
        if (!campaign || !classRecord) return { status: "not-found" as const };
        if (status && !validRewardCampaignStatuses.has(status)) return { status: "invalid" as const };

        if (typeof budgetPoints === "number") {
          const cleanBudget = Math.max(0, Math.round(Number(budgetPoints) || 0));
          if (cleanBudget < campaign.awarded_points || cleanBudget > 20000) return { status: "invalid" as const };
          campaign.budget_points = cleanBudget;
        }
        if (status) campaign.status = status;
        campaign.updated_at = now().toISOString();

        return {
          status: "updated" as const,
          gamification: buildTeacherGamificationData(database, user, classRecord.id)
        };
      });
    }
  };
}
