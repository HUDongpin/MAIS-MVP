import { expect, test, type APIResponse, type Locator, type Page, type Response as PlaywrightResponse, type TestInfo } from "@playwright/test";
import { questions } from "../../data/questions";
import { uniqueSuffix } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

type AuthenticatedResponse = {
  user: {
    id: string;
  };
};

type PracticeDecisionResponse = {
  decision: {
    skill: {
      id: string;
    };
  };
};

type FishingCompletion = {
  status: string;
  reward: {
    xp: number;
    rewardPoints: number;
  };
  coins: number;
  gamification: {
    xp: number;
    rewardSummary: {
      available: number;
    };
  } | null;
};

type StudentGamificationPayload = {
  gamification: {
    xp: number;
    rewardSummary: {
      available: number;
    };
  };
};

type AttemptCheck = {
  correct: boolean;
};

const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const adventureRoundStorageKey = "hk-math-practice-adventure-round";
const fishingAppOptions = { warmPaths: ["/student/practice/games/fishing-master"] };
const fatalFishingRuntimePattern = /Application error|ChunkLoadError|Loading chunk \d+ failed|\/_next\/static\/chunks\/app\/student\/practice\/games/i;

test.setTimeout(210_000);

function practiceRegion(page: Page) {
  return page.getByRole("region", { name: /Practice questions/i });
}

async function readJson<T>(response: APIResponse | PlaywrightResponse, expectedStatus = 200) {
  const body = await response.text();
  expect(response.status(), body).toBe(expectedStatus);
  return JSON.parse(body) as T;
}

async function registerStudentThroughApi(app: IsolatedApp, page: Page, testInfo: TestInfo, grade = "S3") {
  const suffix = uniqueSuffix(testInfo);
  let lastBody = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.request.post(app.url("/api/auth/register"), {
      data: {
        name: `Fishing ${suffix}`,
        username: `fishing-${suffix}-${attempt}@example.test`,
        password: "start12345",
        grade,
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      }
    });
    lastBody = await response.text();
    if (response.ok()) return JSON.parse(lastBody) as AuthenticatedResponse;
    await page.waitForTimeout(1200);
  }

  expect(false, lastBody).toBeTruthy();
  throw new Error("Could not register test student.");
}

async function unlockFreeSelection(app: IsolatedApp, page: Page, userId: string, grade = "S3") {
  const skillIds = new Set<string>();
  const response = await page.request.get(app.url(`/api/adaptive-learning/next?grade=${grade}`));
  const { decision } = await readJson<PracticeDecisionResponse>(response);
  skillIds.add(decision.skill.id);

  const refreshResponse = await page.request.post(app.url("/api/adaptive-learning/refresh"), {
    data: { grade }
  });
  if (refreshResponse.ok()) {
    const refreshed = await refreshResponse.json() as PracticeDecisionResponse;
    skillIds.add(refreshed.decision.skill.id);
  }

  await page.evaluate(({ nextUserId, nextSkillIds }) => {
    nextSkillIds.forEach((skillId) => {
      window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${nextUserId}:${skillId}`, "true");
    });
  }, { nextUserId: userId, nextSkillIds: Array.from(skillIds) });
}

async function expectQuestion(page: Page, current: number, total = 5) {
  await expect(practiceRegion(page).getByText(new RegExp(`Question ${current} of ${total}`, "i"))).toBeVisible({ timeout: 15_000 });
}

function escapedAnswerPattern(answer: string) {
  return new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
}

async function answerVisibleQuestion(page: Page, answer: string, scope?: Locator) {
  const card = (scope ?? practiceRegion(page)).locator("article:visible").first();
  await expect(card).toBeVisible();
  const textbox = card.getByRole("textbox").first();

  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(answer);
  } else {
    await card.getByRole("button", { name: escapedAnswerPattern(answer) }).first().click();
  }

  const checkButton = card.getByRole("button", { name: /Check Answer/i });
  let lastBody = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(checkButton).toBeEnabled();
    const attemptResponse = page.waitForResponse((response) => (
      response.url().includes("/api/attempts") && response.request().method() === "POST"
    ));
    await checkButton.click();
    const response = await attemptResponse;
    lastBody = await response.text();
    if (response.ok()) return JSON.parse(lastBody) as AttemptCheck;
    const retryableDevResponse =
      response.status() >= 500 ||
      lastBody.includes("missing required error components") ||
      lastBody.includes("This page could not be found");
    if (!retryableDevResponse) break;
    await page.waitForTimeout(1200);
  }

  expect(false, lastBody).toBeTruthy();
  return { correct: false };
}

async function completeFreeSelectionRound({
  app,
  page,
  testInfo,
  grade = "S3",
  topicId,
  difficulty,
  wrongIndexes = []
}: {
  app: IsolatedApp;
  page: Page;
  testInfo: TestInfo;
  grade?: string;
  topicId?: string;
  difficulty?: string;
  wrongIndexes?: number[];
}) {
  const session = await registerStudentThroughApi(app, page, testInfo, grade);
  await page.goto(app.url("/practice"));
  await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
  await unlockFreeSelection(app, page, session.user.id, grade);
  let freeSelectionReady = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(app.url("/practice"));
    await page.waitForLoadState("networkidle");
    freeSelectionReady = await page.getByRole("combobox", { name: /Difficulty/i }).isVisible().catch(() => false);
    if (freeSelectionReady) break;
    await page.waitForTimeout(1200);
  }
  expect(freeSelectionReady).toBe(true);

  if (topicId) await page.getByRole("combobox", { name: /Topic/i }).selectOption(topicId);
  if (difficulty) await page.getByRole("combobox", { name: /Difficulty/i }).selectOption(difficulty);
  await expectQuestion(page, 1);

  const params = new URLSearchParams();
  params.set("grade", grade);
  if (topicId) params.set("topicId", topicId);
  if (difficulty) params.set("difficulty", difficulty);
  const payload = await readJson<{ questions: Array<{ id: string; topicId: string }> }>(
    await page.request.get(app.url(`/api/questions?${params.toString()}`))
  );
  const roundQuestions = payload.questions.slice(0, 5);
  expect(roundQuestions).toHaveLength(5);
  const answersById = new Map(questions.map((question) => [question.id, question.answer]));

  for (const [index, question] of roundQuestions.entries()) {
    await expectQuestion(page, index + 1);
    await answerVisibleQuestion(page, wrongIndexes.includes(index) ? `wrong-${index}` : answersById.get(question.id) ?? "wrong");
    if (index < roundQuestions.length - 1) await expectQuestion(page, index + 2);
  }

  await expect(page.getByRole("dialog", { name: /Free selection round complete/i })).toBeVisible({ timeout: 10_000 });
  return { roundQuestions, session };
}

function majorityTopicId(roundQuestions: Array<{ topicId: string }>) {
  const [firstQuestion] = roundQuestions;
  const counts = new Map<string, number>();
  let bestTopicId = firstQuestion.topicId;
  let bestCount = 0;

  roundQuestions.forEach((question) => {
    const nextCount = (counts.get(question.topicId) ?? 0) + 1;
    counts.set(question.topicId, nextCount);
    if (nextCount > bestCount) {
      bestTopicId = question.topicId;
      bestCount = nextCount;
    }
  });

  return bestTopicId;
}

async function submitCorrectAttempts(app: IsolatedApp, page: Page, questionIds: string[], expectedUserId: string) {
  const answersById = new Map(questions.map((question) => [question.id, question.answer]));
  for (const questionId of questionIds) {
    const response = await page.request.post(app.url("/api/attempts"), {
      headers: { "X-MAIS-Expected-User-Id": expectedUserId },
      data: {
        expectedUserId,
        questionId,
        selectedAnswer: answersById.get(questionId),
        durationSeconds: 10
      }
    });
    await readJson<{ correct: boolean }>(response);
  }
}

async function submitAttempts(app: IsolatedApp, page: Page, questionIds: string[], correctCount: number, expectedUserId: string) {
  const answersById = new Map(questions.map((question) => [question.id, question.answer]));
  for (const [index, questionId] of questionIds.entries()) {
    const response = await page.request.post(app.url("/api/attempts"), {
      headers: { "X-MAIS-Expected-User-Id": expectedUserId },
      data: {
        expectedUserId,
        questionId,
        selectedAnswer: index < correctCount ? answersById.get(questionId) : `wrong-${index}`,
        durationSeconds: 10
      }
    });
    const feedback = await readJson<{ correct: boolean }>(response);
    expect(feedback.correct).toBe(index < correctCount);
  }
}

function roundPayload(topicId: string, roundQuestions: Array<{ id: string }>, correctCount: number, roundKey: string) {
  const roundQuestionIds = roundQuestions.map((question) => question.id);
  return {
    topicId,
    roundQuestionIds,
    correctRoundQuestionIds: roundQuestionIds.slice(0, correctCount),
    accuracyPercent: Math.round((correctCount / roundQuestionIds.length) * 100),
    roundKey
  };
}

async function completeAdventureForPayload(app: IsolatedApp, page: Page, payload: ReturnType<typeof roundPayload>) {
  const response = await page.request.post(app.url("/api/gamification/adventure-island"), {
    data: {
      ...payload,
      correctQuestionIds: payload.correctRoundQuestionIds.slice(0, 3),
      durationSeconds: 45,
      defeatedEnemies: 3
    }
  });
  const body = await response.text();
  expect(response.status(), body).toBe(201);
}

function attachFishingRuntimeDiagnostics(page: Page) {
  const events: string[] = [];

  const record = (kind: string, message: string) => {
    events.push(`[${new Date().toISOString()}] ${kind}: ${message}`);
  };

  page.on("pageerror", (error) => {
    record("pageerror", error.message);
  });

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) record(`console:${message.type()}`, message.text());
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("/_next/static/") || url.includes("/student/practice/games/fishing-master")) {
      record("requestfailed", `${request.method()} ${url} ${request.failure()?.errorText ?? "unknown failure"}`);
    }
  });

  return {
    async attach(testInfo: TestInfo) {
      if (!events.length) return;
      await testInfo.attach("fishing-runtime-diagnostics.log", {
        body: events.join("\n"),
        contentType: "text/plain"
      });
    },
    expectNoFatalErrors() {
      const fatalEvents = events.filter((event) => fatalFishingRuntimePattern.test(event));
      expect(fatalEvents.join("\n")).toBe("");
    }
  };
}

test.describe.serial("Practice Arena Fishing Game", () => {
  test("free-selection rounds use 5 same-topic questions and unlock Adventure Island at 80%", async ({ page }, testInfo) => {
    const app = await startIsolatedApp("fishing-game-free-selection", testInfo, fishingAppOptions);
    const diagnostics = attachFishingRuntimeDiagnostics(page);

    try {
      const { roundQuestions } = await completeFreeSelectionRound({
        app,
        page,
        testInfo,
        grade: "S3",
        topicId: "quadratic-patterns",
        wrongIndexes: [4]
      });

      await expect(page.getByRole("link", { name: /Start Adventure Island/i })).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("link", { name: /Start Fishing Master/i })).toHaveCount(0);
      const stored = await page.evaluate((key) => JSON.parse(window.sessionStorage.getItem(key) ?? "null"), adventureRoundStorageKey) as {
        topicId: string;
        accuracyPercent: number;
        roundQuestionIds: string[];
        correctRoundQuestionIds: string[];
      };
      expect(stored.accuracyPercent).toBe(80);
      expect(stored.roundQuestionIds).toHaveLength(5);
      expect(stored.correctRoundQuestionIds).toHaveLength(4);
      expect(stored.topicId).toBe("quadratic-patterns");
      const fishingStored = await page.evaluate((key) => window.sessionStorage.getItem(key), fishingRoundStorageKey);
      expect(fishingStored).toBeNull();
      diagnostics.expectNoFatalErrors();
    } finally {
      await diagnostics.attach(testInfo);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("free-selection summary hides Fishing entry below 80%", async ({ page }, testInfo) => {
    const app = await startIsolatedApp("fishing-game-locked-summary", testInfo, fishingAppOptions);
    const diagnostics = attachFishingRuntimeDiagnostics(page);

    try {
      await completeFreeSelectionRound({
        app,
        page,
        testInfo,
        topicId: "quadratic-patterns",
        wrongIndexes: [3, 4]
      });

      await expect(page.getByRole("link", { name: /Start Adventure Island/i })).toHaveCount(0);
      await expect(page.getByRole("link", { name: /Start Fishing Master/i })).toHaveCount(0);
      diagnostics.expectNoFatalErrors();
    } finally {
      await diagnostics.attach(testInfo);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("Fishing Game renders, catches a fish question, and completion awards coins x3 once", async ({ page }, testInfo) => {
    const app = await startIsolatedApp("fishing-game-play-reward", testInfo, fishingAppOptions);
    const diagnostics = attachFishingRuntimeDiagnostics(page);

    try {
      const { roundQuestions, session } = await completeFreeSelectionRound({
        app,
        page,
        testInfo,
        topicId: "quadratic-patterns"
      });
      const firstPayload = roundPayload("quadratic-patterns", roundQuestions, 5, `adventure-${Date.now()}`);
      await completeAdventureForPayload(app, page, firstPayload);

      const secondPayload = roundPayload("quadratic-patterns", roundQuestions, 5, `post-adventure-${Date.now()}`);
      await submitAttempts(app, page, secondPayload.roundQuestionIds, 5, session.user.id);
      await page.evaluate(({ key, payload }) => {
        window.sessionStorage.setItem(key, JSON.stringify(payload));
      }, { key: fishingRoundStorageKey, payload: secondPayload });

      const legacyRoute = await page.request.get(app.url("/practice/fishing-game"), { maxRedirects: 0 });
      expect([307, 308]).toContain(legacyRoute.status());
      expect(legacyRoute.headers().location ?? "").toContain("/student/practice/games/fishing-master");

      await page.goto(app.url("/student/practice/games/fishing-master"), { waitUntil: "domcontentloaded" });
      diagnostics.expectNoFatalErrors();
      await expect(page.getByText(/Application error: a client-side exception/i)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /Fishing Master/i })).toBeVisible();
      diagnostics.expectNoFatalErrors();
      if (testInfo.project.name === "mobile-chrome") {
        await expect(page.getByRole("navigation", { name: /Main navigation/i })).toBeHidden();
        await expect(page.getByRole("contentinfo")).toBeHidden();
        await expect(page.getByRole("button", { name: /Nova Tutor/i })).toHaveCount(0);
        await expect(page.getByRole("link", { name: /Back to Practice/i })).toBeVisible();
      }
      const stage = page.getByTestId("fishing-game-stage");
      await expect(stage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-nets", "10");
      await expect(stage).toHaveAttribute("data-coins", "0");
      await expect(stage).toHaveAttribute("data-elapsed", "0");
      await expect(stage).toHaveAttribute("data-renderer-load", "ready", { timeout: 45_000 });
      await expect(stage).toHaveAttribute("data-fish-count", /\d+/);
      await expect(stage).toHaveAttribute("data-creature-names", /Stingray/);
      await expect(page.getByTestId("fishing-welcome")).toBeVisible();

      await page.getByTestId("fishing-start-button").click();
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expect(page.getByTestId("fishing-aim-controls")).toBeVisible();
      await expect(stage).toHaveAttribute("data-cannon-angle", /-?\d+/, { timeout: 10_000 });

      const readCannonAngle = async () => Number(await stage.getAttribute("data-cannon-angle"));
      const initialCannonAngle = await readCannonAngle();
      await page.keyboard.press("ArrowRight");
      await expect.poll(readCannonAngle, { timeout: 5_000 }).toBeGreaterThan(initialCannonAngle);
      const afterRightTapAngle = await readCannonAngle();
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(260);
      await page.keyboard.up("ArrowLeft");
      await expect.poll(readCannonAngle, { timeout: 5_000 }).toBeLessThan(afterRightTapAngle - 8);

      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 10_000 });
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).toBeTruthy();
      await page.mouse.click((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) * 0.76, (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) * 0.36);
      await expect.poll(readCannonAngle, { timeout: 5_000 }).toBeGreaterThan(-115);
      await page.mouse.click((canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) * 0.14, (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) * 0.22);
      await expect.poll(readCannonAngle, { timeout: 5_000 }).toBeLessThan(-145);

      const topicQuestions = questions.filter((question) => question.topicId === "quadratic-patterns");
      const answersById = new Map(questions.map((question) => [question.id, question.answer]));
      const fireButton = page.getByRole("button", { name: /Fire net/i });
      await fireButton.click();
      await expect(stage).toHaveAttribute("data-last-cast", "hit", { timeout: 10_000 });
      await expect(page.getByTestId("fishing-impact-feedback")).toContainText(/Nice catch/i);
      await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 10_000 });
      const fishingChallenge = page.getByTestId("fishing-challenge");
      const challengeQuestionId = await fishingChallenge.getAttribute("data-question-id");
      expect(challengeQuestionId).toBeTruthy();
      const caughtAttempt = await answerVisibleQuestion(page, answersById.get(challengeQuestionId ?? "") ?? "wrong", fishingChallenge);
      expect(caughtAttempt.correct).toBe(true);
      await expect(page.getByTestId("fishing-reward-feedback")).toContainText(/\+1 coin/i);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-coins", "1", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-nets", "9");
      await expect.poll(async () => Number(await stage.getAttribute("data-elapsed"))).toBeGreaterThan(0);

      for (let index = 0; index < 32; index += 1) await page.keyboard.press("ArrowRight");
      await expect.poll(readCannonAngle, { timeout: 5_000 }).toBeGreaterThan(-45);
      await fireButton.click();
      await expect(stage).toHaveAttribute("data-last-cast", "miss", { timeout: 10_000 });
      await expect(page.getByTestId("fishing-impact-feedback")).toContainText(/miss/i);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-nets", "8");
      await expect(page.getByTestId("fishing-challenge")).toHaveCount(0);

      let delayedCompletionRequest = false;
      await page.route("**/api/gamification/fishing-game/complete", async (route) => {
        if (!delayedCompletionRequest && route.request().method() === "POST") {
          delayedCompletionRequest = true;
          await page.waitForTimeout(6500);
        }
        await route.continue();
      });

      for (let expectedNets = 7; expectedNets >= 0; expectedNets -= 1) {
        await fireButton.click();
        await expect(stage).toHaveAttribute("data-nets", String(expectedNets), { timeout: 10_000 });
        if (expectedNets > 0) {
          await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
        }
      }

      await expect(page.getByTestId("fishing-settlement-panel")).toContainText(/Securing your reward/i);
      await expect(page.getByTestId("fishing-settlement-progress")).toBeVisible();
      await expect(page.getByTestId("fishing-retry-submit")).toBeVisible({ timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-phase", "submitted", { timeout: 15_000 });
      await expect(page.getByText(/Fishing Master complete/i)).toBeVisible();
      await expect(page.getByText(/coin\(s\) converted into/i)).toBeVisible();
      await page.unroute("**/api/gamification/fishing-game/complete");

      const before = await readJson<StudentGamificationPayload>(await page.request.get(app.url("/api/gamification/summary")));
      await submitCorrectAttempts(app, page, topicQuestions.slice(1, 2).map((question) => question.id), session.user.id);
      const apiRoundKey = `e2e-fishing-${Date.now()}`;
      const completion = await readJson<FishingCompletion>(await page.request.post(app.url("/api/gamification/fishing-game/complete"), {
        data: {
          topicId: "quadratic-patterns",
          roundQuestionIds: secondPayload.roundQuestionIds,
          correctRoundQuestionIds: secondPayload.correctRoundQuestionIds,
          caughtQuestionIds: topicQuestions.slice(0, 2).map((question) => question.id),
          correctCaughtQuestionIds: topicQuestions.slice(0, 2).map((question) => question.id),
          coins: 2,
          netsUsed: 2,
          durationSeconds: 60,
          roundKey: apiRoundKey
        }
      }), 201);
      expect(completion.status).toBe("awarded");
      expect(completion.reward).toMatchObject({ xp: 6, rewardPoints: 6 });
      expect(completion.gamification?.xp).toBe(before.gamification.xp + 6);
      expect(completion.gamification?.rewardSummary.available).toBe(before.gamification.rewardSummary.available + 6);

      const duplicate = await readJson<FishingCompletion>(await page.request.post(app.url("/api/gamification/fishing-game/complete"), {
        data: {
          topicId: "quadratic-patterns",
          roundQuestionIds: secondPayload.roundQuestionIds,
          correctRoundQuestionIds: secondPayload.correctRoundQuestionIds,
          caughtQuestionIds: topicQuestions.slice(0, 2).map((question) => question.id),
          correctCaughtQuestionIds: topicQuestions.slice(0, 2).map((question) => question.id),
          coins: 2,
          netsUsed: 2,
          durationSeconds: 60,
          roundKey: apiRoundKey
        }
      }), 409);
      expect(duplicate.status).toBe("duplicate");
      expect(duplicate.reward).toMatchObject({ xp: 0, rewardPoints: 0 });
      diagnostics.expectNoFatalErrors();
    } finally {
      await diagnostics.attach(testInfo);
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
