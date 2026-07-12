import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createGamificationCampaignPersistenceStore,
  type GamificationCampaignPersistenceDatabase
} from "@/lib/server/userStore/gamificationCampaignPersistence";
import type { TeacherGamificationData } from "@/types";

const now = new Date("2026-06-20T10:00:00.000Z");

function emptyTeacherGamificationData(classId: string): TeacherGamificationData {
  return {
    generatedAt: now.toISOString(),
    classes: [],
    selectedClassId: classId,
    leaderboard: [],
    campaigns: [],
    economy: {
      version: "test",
      expectedWeeklyRewardPoints: {
        min: 0,
        max: 0
      },
      dailyXpCap: 0,
      dailyRewardPointCap: 0,
      teacherManualDailyPointCap: 0,
      basicRewardTargetWeeks: "0",
      premiumRewardTargetWeeks: "0"
    },
    antiAbuseAlerts: [],
    totals: {
      activeCampaigns: 0,
      weeklyXp: 0,
      weeklyRewardPoints: 0,
      flaggedEvents: 0
    }
  };
}

function createDatabase(): GamificationCampaignPersistenceDatabase {
  return {
    class_enrollments: [],
    reward_campaigns: [
      {
        id: "campaign-existing",
        teacher_id: "teacher-1",
        class_id: "class-1",
        title_en: "Existing",
        title_zh: "Existing",
        description_en: "Existing description",
        description_zh: "Existing description",
        status: "active",
        budget_points: 500,
        awarded_points: 150,
        quest_ids: ["daily-correct-answers"],
        starts_at: "2026-06-19T00:00:00.000Z",
        ends_at: "2026-06-26T00:00:00.000Z",
        created_at: "2026-06-19T00:00:00.000Z",
        updated_at: "2026-06-19T00:00:00.000Z"
      }
    ],
    teacher_classes: [
      {
        id: "class-1",
        teacher_id: "teacher-1",
        name: "3A",
        grade: "S3"
      },
      {
        id: "class-2",
        teacher_id: "teacher-2",
        name: "3B",
        grade: "S3"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(database: GamificationCampaignPersistenceDatabase) {
  return createGamificationCampaignPersistenceStore({
    createId: () => "campaign-new",
    now: () => now,
    mutateDatabase: async (mutator) => mutator(database),
    buildTeacherGamificationData: (_database, _user, classId) => emptyTeacherGamificationData(classId ?? "class-1")
  });
}

test("gamification campaign persistence creates campaigns without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/gamificationCampaignPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const database = createDatabase();
  const result = await createTestStore(database).createRewardCampaign({
    teacherId: "teacher-1",
    classId: "class-1",
    titleEn: "  Sprint   Challenge ",
    titleZh: "",
    descriptionEn: "  Keep going  ",
    descriptionZh: "",
    budgetPoints: 250.7,
    questIds: ["daily-repair", "not-a-quest"],
    startsAt: "2026-06-21T08:00:00.000Z",
    endsAt: "2026-06-28T08:00:00.000Z"
  });

  assert.equal(result.status, "created");
  assert.equal(result.gamification.selectedClassId, "class-1");
  assert.deepEqual(database.reward_campaigns[0], {
    id: "campaign-new",
    teacher_id: "teacher-1",
    class_id: "class-1",
    title_en: "Sprint Challenge",
    title_zh: "班級激勵活動",
    description_en: "Keep going",
    description_zh: "獎勵全班穩定學習習慣。",
    status: "active",
    budget_points: 251,
    awarded_points: 0,
    quest_ids: ["daily-repair"],
    starts_at: "2026-06-21T08:00:00.000Z",
    ends_at: "2026-06-28T08:00:00.000Z",
    created_at: now.toISOString(),
    updated_at: now.toISOString()
  });
});

test("gamification campaign persistence rejects invalid or unauthorized campaign creation", async () => {
  const store = createTestStore(createDatabase());

  assert.deepEqual(await store.createRewardCampaign({
    teacherId: "student-1",
    classId: "class-1",
    budgetPoints: 250,
    questIds: []
  }), { status: "forbidden" });
  assert.deepEqual(await store.createRewardCampaign({
    teacherId: "teacher-1",
    classId: "class-2",
    budgetPoints: 250,
    questIds: []
  }), { status: "class-not-found" });
  assert.deepEqual(await store.createRewardCampaign({
    teacherId: "teacher-1",
    classId: "class-1",
    budgetPoints: 99,
    questIds: []
  }), { status: "invalid" });
  assert.deepEqual(await store.createRewardCampaign({
    teacherId: "teacher-1",
    classId: "class-1",
    budgetPoints: 250,
    questIds: [],
    startsAt: "2026-06-28T00:00:00.000Z",
    endsAt: "2026-06-21T00:00:00.000Z"
  }), { status: "invalid" });
});

test("gamification campaign persistence updates campaign status and budget", async () => {
  const database = createDatabase();
  const store = createTestStore(database);

  const result = await store.updateRewardCampaign({
    teacherId: "teacher-1",
    campaignId: "campaign-existing",
    status: "paused",
    budgetPoints: 260.2
  });

  assert.equal(result.status, "updated");
  assert.equal(result.gamification.selectedClassId, "class-1");
  assert.equal(database.reward_campaigns[0]?.status, "paused");
  assert.equal(database.reward_campaigns[0]?.budget_points, 260);
  assert.equal(database.reward_campaigns[0]?.updated_at, now.toISOString());

  assert.deepEqual(await store.updateRewardCampaign({
    teacherId: "teacher-1",
    campaignId: "campaign-existing",
    status: "ended",
    budgetPoints: 149
  }), { status: "invalid" });
  assert.deepEqual(await store.updateRewardCampaign({
    teacherId: "teacher-2",
    campaignId: "campaign-existing",
    status: "ended"
  }), { status: "not-found" });
  assert.deepEqual(await store.updateRewardCampaign({
    teacherId: "teacher-1",
    campaignId: "missing-campaign",
    status: "ended"
  }), { status: "not-found" });
});

test("legacy userStore delegates reward campaign writes through gamification domain store", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(source, /export const createRewardCampaign = gamificationUserStore\.createRewardCampaign/);
  assert.match(source, /export const updateRewardCampaign = gamificationUserStore\.updateRewardCampaign/);
  assert.doesNotMatch(source, /export async function createRewardCampaign/);
  assert.doesNotMatch(source, /export async function updateRewardCampaign/);
});
