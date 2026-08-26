import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { demoParent, demoParentUserId, demoStudent, demoTeacher } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

type StudentGamificationPayload = {
  gamification: {
    xp: number;
    level: { current: { level: number; title: { en: string } }; progressPercent?: number };
    streakDays: number;
    badges: unknown[];
    earnedBadges: unknown[];
    quests: unknown[];
    leaderboard: Array<{ rank: number; studentName: string; weeklyXp: number }>;
    rewardSummary: { available: number; reserved: number };
    economy: {
      version: string;
      expectedWeeklyRewardPoints: { min: number; max: number };
      dailyXpCap: number;
      dailyRewardPointCap: number;
      teacherManualDailyPointCap: number;
      basicRewardTargetWeeks: string;
      premiumRewardTargetWeeks: string;
    };
  };
};

type TeacherGamificationPayload = {
  gamification: {
    selectedClassId: string;
    leaderboard: Array<{ rank: number; studentName: string; weeklyXp: number }>;
    campaigns: Array<{ id: string; status: string; title: { en: string } }>;
    economy: StudentGamificationPayload["gamification"]["economy"];
    antiAbuseAlerts: unknown[];
  };
};

type ParentChildSummaryPayload = {
  summary: {
    motivationSummary: StudentGamificationPayload["gamification"] | null;
  };
};

test.setTimeout(150_000);

async function loginThroughApi(app: IsolatedApp, page: Page, username: string, password: string) {
  const response = await page.request.post(app.url("/api/auth/login"), {
    data: {
      username,
      password,
      grade: "S3",
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
}

async function gotoAppPage(page: Page, url: string) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (error) {
    if (!String(error).includes("net::ERR_ABORTED")) throw error;
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
  }
}

async function skipLearnerStartSetup(app: IsolatedApp, page: Page) {
  const response = await page.request.patch(app.url("/api/me/learner-profile"), {
    data: {
      status: "skipped",
      answers: {
        goal: "repair",
        challenge: "balanced",
        help: "hint"
      }
    }
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function readJson<T>(response: APIResponse, expectedStatus = 200) {
  const responseText = await response.text();
  expect(response.status(), responseText).toBe(expectedStatus);
  return JSON.parse(responseText) as T;
}

async function studentSummary(app: IsolatedApp, page: Page) {
  const response = await page.request.get(app.url("/api/gamification/summary"));
  if (response.status() !== 200) {
    throw new Error([
      `GET /api/gamification/summary returned ${response.status()}: ${await response.text()}`,
      "Server logs:",
      app.logs.slice(-120).join("")
    ].join("\n"));
  }
  return JSON.parse(await response.text()) as StudentGamificationPayload;
}

async function teacherGamification(app: IsolatedApp, page: Page) {
  const response = await page.request.get(app.url("/api/teacher/gamification?classId=class-s3a-2026"));
  if (response.status() !== 200) {
    throw new Error([
      `GET /api/teacher/gamification returned ${response.status()}: ${await response.text()}`,
      "Server logs:",
      app.logs.slice(-120).join("")
    ].join("\n"));
  }
  return JSON.parse(await response.text()) as TeacherGamificationPayload;
}

async function expectVisibleWithPageErrors(page: Page, locator: ReturnType<Page["locator"]>, pageErrors: string[], timeout = 10_000) {
  try {
    await expect(locator).toBeVisible({ timeout });
  } catch (error) {
    const bodyText = await page.locator("body").innerText({ timeout: 1_000 }).catch(() => "(body unavailable)");
    throw new Error([
      error instanceof Error ? error.message : String(error),
      "",
      `Current URL: ${page.url()}`,
      "",
      `Body text:\n${bodyText.slice(0, 2000)}`,
      "",
      `Page errors:\n${pageErrors.join("\n") || "(none captured)"}`
    ].join("\n"));
  }
}

test.describe.serial("gamification core workflows", () => {
  test("student, teacher, parent, anti-abuse, and campaign flows stay isolated", async ({ page }, testInfo) => {
    test.slow();
    testInfo.setTimeout(150_000);
    const app = await startIsolatedApp("gamification", testInfo);
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    try {
      expect(app.dbPath).toContain(".tmp/e2e-isolated/gamification/");

      await loginThroughApi(app, page, demoStudent.username, demoStudent.password);
      await skipLearnerStartSetup(app, page);
      await gotoAppPage(page, app.url("/dashboard"));
      await expect(page.getByText(/Motivation hub/i)).toBeVisible();
      await expect(page.getByText(/Open motivation hub/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Daily quests/i })).toBeHidden();
      await page.getByText(/Open motivation hub/i).click();
      await expect(page.getByText(/Hide motivation hub/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Level \d+/i })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: /Daily quests/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /^Badges$/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Class leaderboard/i })).toHaveCount(0);
      await expect(page.getByText(/streak days/i)).toBeVisible();
      await expect(page.getByText(/spendable points/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Points balance/i })).toBeVisible();
      await expect(page.getByText(/Reward shop/i)).toBeVisible();

      const initialStudent = await studentSummary(app, page);
      expect(initialStudent.gamification.xp).toBeGreaterThan(0);
      expect(initialStudent.gamification.level.current.level).toBeGreaterThanOrEqual(1);
      expect(initialStudent.gamification.streakDays).toBeGreaterThan(0);
      expect(initialStudent.gamification.badges.length).toBeGreaterThan(0);
      expect(initialStudent.gamification.earnedBadges.length).toBeGreaterThan(0);
      expect(initialStudent.gamification.quests.length).toBeGreaterThan(0);
      expect(initialStudent.gamification.leaderboard[0]?.studentName).toMatch(/HK Student Peter/i);
      expect(initialStudent.gamification.economy.version).toBe("gamification-core-v1");
      expect(initialStudent.gamification.economy.expectedWeeklyRewardPoints).toEqual({ min: 120, max: 180 });
      expect(initialStudent.gamification.economy.basicRewardTargetWeeks).toBe("1-2");
      expect(initialStudent.gamification.economy.premiumRewardTargetWeeks).toBe("6-8");

      const duplicateLessonPayload = { data: { slug: "quadratic-functions", action: "complete" } };
      expect((await page.request.post(app.url("/api/lesson-progress"), duplicateLessonPayload)).ok()).toBeTruthy();
      const afterFirstLesson = await studentSummary(app, page);
      expect((await page.request.post(app.url("/api/lesson-progress"), duplicateLessonPayload)).ok()).toBeTruthy();
      const afterDuplicateLesson = await studentSummary(app, page);
      expect(afterDuplicateLesson.gamification.rewardSummary.available).toBe(afterFirstLesson.gamification.rewardSummary.available);

      const xpBeforeRedemption = afterDuplicateLesson.gamification.xp;
      const levelBeforeRedemption = afterDuplicateLesson.gamification.level.current.level;
      const reservedBeforeRedemption = afterDuplicateLesson.gamification.rewardSummary.reserved;
      const pencilCard = page.locator("article").filter({ hasText: /Pencil set/i }).first();
      await expect(pencilCard.getByRole("button", { name: /Request gift/i })).toBeVisible();
      await pencilCard.getByRole("button", { name: /Request gift/i }).click();
      await expect(page.getByText(/Gift request sent to HK Teacher Chan/i)).toBeVisible();
      const afterRedemption = await studentSummary(app, page);
      expect(afterRedemption.gamification.xp).toBe(xpBeforeRedemption);
      expect(afterRedemption.gamification.level.current.level).toBe(levelBeforeRedemption);
      expect(afterRedemption.gamification.rewardSummary.reserved).toBeGreaterThan(reservedBeforeRedemption);

      await page.request.post(app.url("/api/auth/logout"));
      await loginThroughApi(app, page, demoTeacher.username, demoTeacher.password);
      await gotoAppPage(page, app.url("/teacher/rewards"));
      await expectVisibleWithPageErrors(page, page.getByRole("heading", { name: /Rewards and gift redemptions/i }), pageErrors, 15_000);
      await expect(page.getByText(/Rewards and campaigns/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Gamification core/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Weekly class leaderboard/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /^Campaigns$/i })).toBeVisible();

      const teacherData = await teacherGamification(app, page);
      expect(teacherData.gamification.selectedClassId).toBe("class-s3a-2026");
      expect(teacherData.gamification.leaderboard.length).toBeGreaterThan(0);
      expect(teacherData.gamification.campaigns.length).toBeGreaterThan(0);
      expect(teacherData.gamification.economy.teacherManualDailyPointCap).toBe(120);
      expect(Array.isArray(teacherData.gamification.antiAbuseAlerts)).toBeTruthy();

      const createdCampaign = await readJson<TeacherGamificationPayload>(
        await page.request.post(app.url("/api/teacher/gamification/campaigns"), {
          data: {
            classId: "class-s3a-2026",
            titleEn: "QA Motivation Sprint",
            titleZh: "QA Motivation Sprint",
            descriptionEn: "Reward careful practice during QA.",
            descriptionZh: "Reward careful practice during QA.",
            budgetPoints: 900,
            questIds: ["daily-correct-answers", "daily-lesson-step"]
          }
        }),
        201
      );
      const campaign = createdCampaign.gamification.campaigns.find((item) => item.title.en === "QA Motivation Sprint");
      expect(campaign).toBeTruthy();
      expect(campaign?.status).toBe("active");

      const pausedCampaign = await readJson<TeacherGamificationPayload>(
        await page.request.patch(app.url(`/api/teacher/gamification/campaigns/${campaign?.id}`), {
          data: { status: "paused" }
        })
      );
      expect(pausedCampaign.gamification.campaigns.find((item) => item.id === campaign?.id)?.status).toBe("paused");

      const cappedAward = await page.request.post(app.url("/api/teacher/rewards/award"), {
        data: {
          studentId: "student-peter",
          reasonPresetId: "completed-challenge",
          amount: 500,
          note: "Intentional cap check"
        }
      });
      expect(cappedAward.status()).toBe(429);

      await page.request.post(app.url("/api/auth/logout"));
      await loginThroughApi(app, page, demoParent.username, demoParent.password);
      await gotoAppPage(page, app.url("/parent"));
      await expect(page.getByText(/Family learning hub/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("heading", { name: /^HK Student Peter$/i }).first()).toBeVisible();
      await expect(page.getByText(/^points$/i).first()).toBeVisible();
      await expect(page.getByText(/^level$/i).first()).toBeVisible();

      await gotoAppPage(page, app.url("/parent/children/student-peter"));
      await expect(page.getByRole("heading", { name: /Motivation report/i })).toBeVisible();
      await expect(page.getByText(/Growth XP stays with the child/i)).toBeVisible();
      await expect(page.getByText(/calm next step/i)).toBeVisible();

      const parentSummary = await readJson<ParentChildSummaryPayload>(
        await page.request.get(app.url("/api/parent/children/student-peter/summary"), {
          headers: { "X-MAIS-Expected-User-Id": demoParentUserId }
        })
      );
      expect(parentSummary.summary.motivationSummary?.level.current.level).toBeGreaterThanOrEqual(1);
      expect(parentSummary.summary.motivationSummary?.rewardSummary.available).toBe(afterRedemption.gamification.rewardSummary.available);
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
