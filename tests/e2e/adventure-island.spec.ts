import { expect, test, type APIResponse, type Locator, type Page, type Response as PlaywrightResponse, type TestInfo } from "@playwright/test";
import { questions } from "../../data/questions";
import { uniqueSuffix } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

type AdventureIslandEligibility = {
  eligible: boolean;
  reason: string;
  attemptCount: number;
  correctCount: number;
  accuracyPercent: number;
  alreadyCompleted: boolean;
  rewardPreview: {
    xp: number;
    rewardPoints: number;
  };
};

type AdventureIslandCompletion = {
  status: string;
  reward: {
    xp: number;
    rewardPoints: number;
  };
  gamification: {
    xp: number;
    earnedBadges: Array<{ id: string }>;
    rewardSummary: {
      available: number;
    };
  } | null;
};

type AdventureIslandQuestion = {
  id: string;
};

type StudentGamificationPayload = {
  gamification: {
    xp: number;
    rewardSummary: {
      available: number;
    };
  };
};

type StudentRewardsPayload = {
  rewards: {
    summary: {
      available: number;
    };
  };
};

type AuthenticatedResponse = {
  user: {
    id: string;
  };
};

type StudentRegistrationOptions = {
  curriculumTrack?: "HK" | "US_CA_MATH";
  curriculumProfile?: {
    region: "HK" | "US";
    publisher: "HK_LOCAL" | "US_CA_MATH";
  };
  theme?: "light" | "dark";
};

type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

test.setTimeout(150_000);

const answerByQuestionId = new Map(questions.map((question) => [question.id, question.answer]));
const adventureIslandObjectivePattern = /Goal:\s*defeat 3 enemies with axes, then reach the trophy\./i;
const questionById = new Map(questions.map((question) => [question.id, question]));
const adventureRoundStorageKey = "hk-math-practice-adventure-round";
const adventureTopicId = "quadratic-patterns";

function escapedAnswerPattern(answer: string) {
  return new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
}

function normalizeAnswerLabel(answer: string) {
  return answer.replace(/\s+/g, "").toLowerCase();
}

async function readJson<T>(response: APIResponse | PlaywrightResponse, expectedStatus = 200) {
  const body = await response.text();
  expect(response.status(), body).toBe(expectedStatus);
  return JSON.parse(body) as T;
}

async function registerStudentThroughApi(
  app: IsolatedApp,
  page: Page,
  testInfo: TestInfo,
  grade = "P5",
  options: StudentRegistrationOptions = {}
) {
  const suffix = uniqueSuffix(testInfo);
  let lastBody = "";
  const curriculumTrack = options.curriculumTrack ?? "HK";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.request.post(app.url("/api/auth/register"), {
      data: {
        name: `Adventure Island ${suffix}`,
        username: `adventure-island-${suffix}-${attempt}@example.test`,
        password: "start12345",
        grade,
        curriculumTrack,
        ...(options.curriculumProfile ? { curriculumProfile: options.curriculumProfile } : {}),
        language: "en",
        theme: options.theme ?? "dark"
      }
    });
    lastBody = await response.text();
    if (response.ok()) return JSON.parse(lastBody) as AuthenticatedResponse;
    await page.waitForTimeout(1200);
  }

  expect(false, lastBody).toBeTruthy();
  throw new Error("Could not register test student.");
}

function topicRoundQuestions(topicId = adventureTopicId) {
  const topicQuestions = questions.filter((question) => question.topicId === topicId).slice(0, 5);
  expect(topicQuestions.length).toBeGreaterThanOrEqual(5);
  return topicQuestions;
}

function roundPayloadFor(questionIds: string[], correctQuestionIds: string[], roundKey: string, topicId = adventureTopicId) {
  return {
    topicId,
    roundQuestionIds: questionIds,
    correctRoundQuestionIds: correctQuestionIds,
    accuracyPercent: Math.round((correctQuestionIds.length / questionIds.length) * 100),
    roundKey
  };
}

function adventureEligibilityUrl(app: IsolatedApp, payload: ReturnType<typeof roundPayloadFor>) {
  const params = new URLSearchParams({
    topicId: payload.topicId,
    roundKey: payload.roundKey
  });
  payload.roundQuestionIds.forEach((questionId) => params.append("roundQuestionIds", questionId));
  payload.correctRoundQuestionIds.forEach((questionId) => params.append("correctRoundQuestionIds", questionId));
  return app.url(`/api/gamification/adventure-island?${params.toString()}`);
}

async function submitTopicAttempts(app: IsolatedApp, page: Page, roundQuestions: Array<{ id: string; answer: string }>, correctCount: number) {
  for (const [index, question] of roundQuestions.entries()) {
    const response = await page.request.post(app.url("/api/attempts"), {
      data: {
        questionId: question.id,
        selectedAnswer: index < correctCount ? question.answer : "__wrong__",
        durationSeconds: 12
      }
    });
    const feedback = await readJson<{ correct: boolean }>(response);
    expect(feedback.correct).toBe(index < correctCount);
  }
}

function visiblePracticeAnswer(questionId: string, shouldBeCorrect: boolean) {
  const question = questionById.get(questionId);
  expect(question).toBeTruthy();
  if (!question) return "__wrong__";
  if (shouldBeCorrect) return question.answer;

  if (question.type === "multiple-choice") {
    const incorrectOption = question.options?.find((option) =>
      option.en !== question.answer &&
      option.zh !== question.answer
    );
    return incorrectOption?.en ?? "__wrong__";
  }

  return "__wrong__";
}

async function clickVisiblePracticeOption(card: Locator, answer: string) {
  const optionByName = card.getByRole("button", { name: escapedAnswerPattern(answer) }).first();
  if (await optionByName.isVisible().catch(() => false)) {
    await optionByName.click();
    return;
  }

  const normalizedAnswer = normalizeAnswerLabel(answer);
  const optionButtons = card.locator(".mt-5.grid button");
  const optionCount = await optionButtons.count();
  for (let index = 0; index < optionCount; index += 1) {
    const option = optionButtons.nth(index);
    const ariaLabel = await option.getAttribute("aria-label");
    const text = await option.innerText().catch(() => "");
    if (
      (ariaLabel && normalizeAnswerLabel(ariaLabel) === normalizedAnswer) ||
      normalizeAnswerLabel(text) === normalizedAnswer
    ) {
      await option.click();
      return;
    }
  }

  throw new Error(`Could not select visible Practice Arena option "${answer}".`);
}

async function answerVisiblePracticeQuestion(page: Page, shouldBeCorrect = true) {
  const card = page.locator("article:visible").first();
  await expect(card).toBeVisible();
  const questionId = await card.getAttribute("data-question-id");
  expect(questionId).toBeTruthy();

  const answer = visiblePracticeAnswer(questionId ?? "", shouldBeCorrect);
  const answerField = card.getByRole("textbox").first();
  if (await answerField.isVisible().catch(() => false)) {
    await answerField.fill(answer);
  } else {
    await clickVisiblePracticeOption(card, answer);
  }

  const attemptResponse = page.waitForResponse((response) =>
    response.url().includes("/api/attempts") &&
    response.request().method() === "POST"
  );
  await expect(card.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
  await card.getByRole("button", { name: /Check Answer/i }).click();
  const feedback = await readJson<{ correct: boolean }>(await attemptResponse);
  expect(feedback.correct).toBe(shouldBeCorrect);

  return questionId;
}

function boxesOverlap(first: BoundingBox, second: BoundingBox) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

async function expectMobileVirtualControlsHaveTouchTargets(page: Page) {
  const hudBox = await page.getByTestId("adventure-island-hud").boundingBox();
  expect(hudBox).toBeTruthy();
  const objectiveStatus = page.getByTestId("adventure-island-status-message");
  await expect(objectiveStatus).toBeVisible();
  await expect(objectiveStatus).toContainText(adventureIslandObjectivePattern);
  const objectiveBox = await objectiveStatus.boundingBox();
  expect(objectiveBox).toBeTruthy();
  expect(boxesOverlap(objectiveBox as BoundingBox, hudBox as BoundingBox)).toBeFalsy();

  for (const name of [/Move left/i, /Move right/i, /^Jump$/i, /Throw axe/i]) {
    const control = page.getByRole("button", { name }).first();
    await expect(control).toBeVisible();
    const controlBox = await control.boundingBox();
    expect(controlBox).toBeTruthy();
    expect(controlBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(controlBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(boxesOverlap(controlBox as BoundingBox, hudBox as BoundingBox)).toBeFalsy();
    expect(boxesOverlap(controlBox as BoundingBox, objectiveBox as BoundingBox)).toBeFalsy();
  }
}

type StageNumberAttribute = "player-x" | "coins" | "axes" | "defeated" | "lives" | "upper-coins" | "snail1-x";

async function readStageNumber(page: Page, attribute: StageNumberAttribute) {
  const value = await page.getByTestId("adventure-island-stage").getAttribute(`data-${attribute}`);
  return Number(value ?? 0);
}

async function readStagePhase(page: Page) {
  return await page.getByTestId("adventure-island-stage").getAttribute("data-phase");
}

async function moveRightUntil(page: Page, targetX: number) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await readStageNumber(page, "player-x") >= targetX) return;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(450);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error(`Player did not reach x=${targetX}.`);
}

async function moveRightUntilChallenge(page: Page, targetX: number) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await readStagePhase(page) === "challenge") return;
    if (await readStageNumber(page, "player-x") > targetX + 320) break;
    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(320);
    await page.keyboard.up("ArrowRight");
  }
  throw new Error(`Player did not reach x=${targetX} or trigger a challenge.`);
}

async function moveRightUntilTrophyOrContactChallenge(page: Page, targetX: number) {
  const stage = page.getByTestId("adventure-island-stage");

  for (let attempt = 0; attempt < 90; attempt += 1) {
    const phase = await readStagePhase(page);
    if (phase === "submitting" || phase === "cleared" || await readStageNumber(page, "player-x") >= targetX) return;

    if (phase === "challenge") {
      await expect(stage).toHaveAttribute("data-challenge-kind", "contact", { timeout: 4_000 });
      await answerCurrentChallenge(page);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 8_000 });
      continue;
    }

    await page.keyboard.down("ArrowRight");
    await page.waitForTimeout(450);
    await page.keyboard.up("ArrowRight");
  }

  throw new Error(`Player did not reach x=${targetX} or trophy clear.`);
}

async function holdRightIntoChallengeAndRelease(page: Page, targetX: number) {
  let triggered = false;
  await page.keyboard.down("ArrowRight");
  try {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (await readStagePhase(page) === "challenge") {
        triggered = true;
        break;
      }
      if (await readStageNumber(page, "player-x") > targetX + 320) break;
      await page.waitForTimeout(120);
    }
  } finally {
    await page.keyboard.up("ArrowRight");
  }

  if (!triggered) throw new Error(`Player did not trigger a challenge while holding right toward x=${targetX}.`);
}

async function answerForVisibleQuestion(page: Page) {
  const card = page.locator("article:visible").first();
  const questionId = await card.getAttribute("data-question-id");
  expect(questionId).toBeTruthy();
  const answer = answerByQuestionId.get(questionId ?? "");
  expect(answer).toBeTruthy();
  return answer as string;
}

async function submitCurrentChallengeAnswer(page: Page, answer: string, expectedCorrect: boolean) {
  const card = page.locator("article:visible").first();
  const answerField = card.getByRole("textbox").first();
  if (await answerField.isVisible().catch(() => false)) {
    await answerField.fill(answer);
  } else {
    await clickVisiblePracticeOption(card, answer);
  }

  const attemptResponse = page.waitForResponse((response) =>
    response.url().includes("/api/attempts") &&
    response.request().method() === "POST"
  );
  await expect(card.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
  await card.getByRole("button", { name: /Check Answer/i }).click();
  const feedback = await readJson<{ correct: boolean }>(await attemptResponse);
  expect(feedback.correct).toBe(expectedCorrect);
}

async function answerCurrentChallenge(page: Page, answer?: string) {
  const resolvedAnswer = answer ?? await answerForVisibleQuestion(page);
  await submitCurrentChallengeAnswer(page, resolvedAnswer, true);
}

async function answerWrongCurrentChallenge(page: Page) {
  const card = page.locator("article:visible").first();
  const questionId = await card.getAttribute("data-question-id");
  expect(questionId).toBeTruthy();
  await submitCurrentChallengeAnswer(page, visiblePracticeAnswer(questionId ?? "", false), false);
}

async function jumpRightForUpperCoin(page: Page) {
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.waitForTimeout(520);
  await page.keyboard.up("ArrowUp");
  await page.waitForTimeout(120);
  await page.keyboard.up("ArrowRight");
}

async function throwAxeAndAnswer(page: Page) {
  const stage = page.getByTestId("adventure-island-stage");
  const axesBeforeThrow = await readStageNumber(page, "axes");
  expect(axesBeforeThrow).toBeGreaterThan(0);

  await page.keyboard.press("t");
  await expect.poll(() => readStageNumber(page, "axes"), { timeout: 4_000 }).toBe(axesBeforeThrow - 1);
  await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 8_000 });
  await expect(stage).toHaveAttribute("data-challenge-kind", "attack", { timeout: 4_000 });

  await answerCurrentChallenge(page);
  await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 8_000 });
}

async function startAdventureIslandRun(page: Page) {
  const stage = page.getByTestId("adventure-island-stage");
  const welcome = page.getByTestId("adventure-island-welcome");

  await expect(stage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
  await expect(welcome).toBeVisible();
  await expect(welcome).toContainText("Jump across storybook steps");
  await expect(welcome.getByTestId("adventure-island-objective-tip")).toContainText(adventureIslandObjectivePattern);
  await page.getByTestId("adventure-island-start-button").click();
  await expect(welcome).toBeHidden({ timeout: 10_000 });
  await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 20_000 });
  await expect(page.getByTestId("adventure-island-status-message")).toContainText(adventureIslandObjectivePattern);
}

test.describe.serial("topic-bound Adventure Island game", () => {
  test("starts from the personalized 100% summary Adventure Island CTA", async ({ page }, testInfo) => {
    test.slow();
    const app = await startIsolatedApp("adventure-island-personalized-summary", testInfo, {
      warmPaths: ["/practice", "/student/practice/games/adventure-island"]
    });

    try {
      await registerStudentThroughApi(app, page, testInfo, "P1", {
        curriculumTrack: "US_CA_MATH",
        curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
        theme: "light"
      });

      await page.goto(app.url("/practice"), { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
      const adaptivePanel = page.locator("#adaptive-practice-round");
      await expect(adaptivePanel).toBeVisible({ timeout: 20_000 });
      await expect(adaptivePanel.getByRole("region", { name: /Practice questions/i }).getByText(/Question 1 of 5/i)).toBeVisible({ timeout: 20_000 });

      for (let questionNumber = 1; questionNumber <= 5; questionNumber += 1) {
        await expect(adaptivePanel.getByText(new RegExp(`Question ${questionNumber} of 5`, "i"))).toBeVisible({ timeout: 20_000 });
        await answerVisiblePracticeQuestion(page, true);
        if (questionNumber < 5) {
          await expect(adaptivePanel.getByText(new RegExp(`Question ${questionNumber + 1} of 5`, "i"))).toBeVisible({ timeout: 10_000 });
        }
      }

      const summaryDialog = page.getByRole("dialog", { name: /Personalized practice round complete/i });
      await expect(summaryDialog).toBeVisible({ timeout: 15_000 });
      await expect(summaryDialog).toContainText(/100%/);
      const startAdventureIsland = summaryDialog.getByRole("link", { name: /Start Adventure Island/i });
      await expect(startAdventureIsland).toBeVisible({ timeout: 20_000 });
      await expect(startAdventureIsland).toHaveAttribute("href", "/student/practice/games/adventure-island");

      await startAdventureIsland.click();

      await expect(page).toHaveURL(/\/student\/practice\/games\/adventure-island$/);
      await expect(page.getByTestId("adventure-island-stage")).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
      await expect(page.getByTestId("adventure-island-welcome")).toBeVisible();
      await expect(page.getByText(/Adventure Island locked/i)).toHaveCount(0);
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("opens from Practice Arena evidence after a strong same-topic 5-question round", async ({ page }, testInfo) => {
    const app = await startIsolatedApp("adventure-island-practice-unlock", testInfo, { warmPaths: ["/practice", "/student/practice/games/adventure-island"] });
    const grade = "S3";

    try {
      await registerStudentThroughApi(app, page, testInfo, grade);
      const roundQuestions = topicRoundQuestions();
      const roundQuestionIds = roundQuestions.map((question) => question.id);

      const initialEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(app.url("/api/gamification/adventure-island"))
      );
      expect(initialEligibility).toMatchObject({
        eligible: false,
        reason: "need-round-context",
        attemptCount: 0,
        correctCount: 0,
        accuracyPercent: 0
      });

      await submitTopicAttempts(app, page, roundQuestions, 3);
      const lowPayload = roundPayloadFor(roundQuestionIds, roundQuestionIds.slice(0, 3), `low-${Date.now()}`);
      const lowCumulativeEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(adventureEligibilityUrl(app, lowPayload))
      );
      expect(lowCumulativeEligibility).toMatchObject({
        eligible: false,
        reason: "need-accuracy",
        attemptCount: 5,
        correctCount: 3,
        accuracyPercent: 60
      });

      await submitTopicAttempts(app, page, roundQuestions, 4);
      const strongPayload = roundPayloadFor(roundQuestionIds, roundQuestionIds.slice(0, 4), `strong-${Date.now()}`);

      const unlockedEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(adventureEligibilityUrl(app, strongPayload))
      );
      expect(unlockedEligibility).toMatchObject({
        eligible: true,
        reason: "ready",
        attemptCount: 5,
        correctCount: 4,
        accuracyPercent: 80,
        alreadyCompleted: false
      });

      await page.goto(app.url("/practice"), { waitUntil: "domcontentloaded" });
      await page.evaluate(({ key, payload }) => {
        window.sessionStorage.setItem(key, JSON.stringify(payload));
      }, { key: adventureRoundStorageKey, payload: strongPayload });
      await page.goto(app.url("/student/practice/games/adventure-island"), { waitUntil: "domcontentloaded" });
      await expect(page.getByTestId("adventure-island-stage")).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
      await expect(page.getByTestId("adventure-island-welcome")).toBeVisible();
      await expect(page.getByText(/Adventure Island locked/i)).toHaveCount(0);
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });

  test("uses Practice Arena topic evidence and awards the Adventure Island reward once from a trophy clear", async ({ page }, testInfo) => {
    const app = await startIsolatedApp("adventure-island", testInfo, { warmPaths: ["/student/practice/games/adventure-island"] });
    const grade = "S3";

    try {
      await registerStudentThroughApi(app, page, testInfo, grade);
      const roundQuestions = topicRoundQuestions();
      const roundQuestionIds = roundQuestions.map((question) => question.id);
      await submitTopicAttempts(app, page, roundQuestions, 5);
      const strongPayload = roundPayloadFor(roundQuestionIds, roundQuestionIds, `adventure-${Date.now()}`);

      const initialEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(app.url("/api/gamification/adventure-island"))
      );
      expect(initialEligibility.eligible).toBeFalsy();
      expect(initialEligibility.reason).toBe("need-round-context");

      for (const legacyPath of ["/practice/adventure-island", "/practice/super-platformer-like"]) {
        const legacyRoute = await page.request.get(app.url(legacyPath), { maxRedirects: 0 });
        expect([307, 308]).toContain(legacyRoute.status());
        expect(legacyRoute.headers().location ?? "").toContain("/student/practice/games/adventure-island");
      }

      const legacyEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(app.url("/api/gamification/bonus-games/quadratic"))
      );
      expect(legacyEligibility.reason).toBe(initialEligibility.reason);

      const unlockedEligibility = await readJson<AdventureIslandEligibility>(
        await page.request.get(adventureEligibilityUrl(app, strongPayload))
      );
      expect(unlockedEligibility).toMatchObject({
        eligible: true,
        reason: "ready",
        attemptCount: 5,
        correctCount: 5,
        accuracyPercent: 100,
        alreadyCompleted: false,
        rewardPreview: {
          xp: 35,
          rewardPoints: 35
        }
      });

      const invalidRun = await page.request.post(app.url("/api/gamification/adventure-island"), {
        data: {
          ...strongPayload,
          correctQuestionIds: roundQuestions.slice(0, 3).map((question) => question.id),
          durationSeconds: 45,
          defeatedEnemies: 2
        }
      });
      await readJson<AdventureIslandCompletion>(invalidRun, 422);
      const beforeAdventureIslandSummary = await readJson<StudentGamificationPayload>(
        await page.request.get(app.url("/api/gamification/summary"))
      );
      const beforeAdventureIslandRewards = await readJson<StudentRewardsPayload>(
        await page.request.get(app.url("/api/rewards"))
      );

      await page.goto(app.url("/practice"), { waitUntil: "domcontentloaded" });
      await page.evaluate(({ key, payload }) => {
        window.sessionStorage.setItem(key, JSON.stringify(payload));
      }, { key: adventureRoundStorageKey, payload: strongPayload });
      await page.goto(app.url("/student/practice/games/adventure-island"), { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: /Quadratic Patterns Adventure/i })).toBeVisible({ timeout: 20_000 });
      if (testInfo.project.name === "mobile-chrome") {
        await expect(page.getByRole("navigation", { name: /Main navigation/i })).toBeHidden();
        await expect(page.getByRole("contentinfo")).toBeHidden();
        await expect(page.getByRole("button", { name: /Nova Tutor/i })).toHaveCount(0);
        await expect(page.getByRole("link", { name: /Back to Practice/i })).toBeVisible();
      }
      const adventureIslandQuestionPayload = await readJson<{ questions: AdventureIslandQuestion[] }>(
        await page.request.get(app.url(`/api/questions?topicId=${adventureTopicId}`))
      );
      expect(adventureIslandQuestionPayload.questions.length).toBeGreaterThanOrEqual(4);
      expect(adventureIslandQuestionPayload.questions.every((question) => answerByQuestionId.has(question.id))).toBeTruthy();
      const stage = page.getByTestId("adventure-island-stage");
      await startAdventureIslandRun(page);
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-player-x", /\d+/, { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-lives", "2", { timeout: 20_000 });
      await expect(page.getByTestId("adventure-island-hud-coins").locator("svg")).toHaveCount(1);
      await expect(page.getByTestId("adventure-island-hud-axes").locator("svg")).toHaveCount(1);
      await expect(page.getByTestId("adventure-island-hud-enemies").locator("svg")).toHaveCount(1);
      await expect(page.getByTestId("adventure-island-hud-hp").locator("svg")).toHaveCount(2);
      await expect(page.getByTestId("adventure-island-hud-time").locator("svg")).toHaveCount(1);
      if (testInfo.project.name === "mobile-chrome") {
        await expectMobileVirtualControlsHaveTouchTargets(page);
      }
      await expect(stage).toHaveAttribute("data-snail1-x", /\d+/, { timeout: 8_000 });
      const firstEnemyStartX = await readStageNumber(page, "snail1-x");
      await expect.poll(() => readStageNumber(page, "snail1-x"), { timeout: 5_000 }).not.toBe(firstEnemyStartX);

      const startX = Number(await stage.getAttribute("data-player-x"));
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(550);
      await page.keyboard.up("ArrowRight");
      const movedRightX = Number(await stage.getAttribute("data-player-x"));
      expect(movedRightX).toBeGreaterThan(startX + 40);

      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(350);
      await page.keyboard.up("ArrowLeft");
      const movedLeftX = Number(await stage.getAttribute("data-player-x"));
      expect(movedLeftX).toBeLessThan(movedRightX - 20);

      await moveRightUntil(page, 260);
      await expect.poll(() => readStageNumber(page, "coins"), { timeout: 5_000 }).toBeGreaterThan(0);
      await expect.poll(() => readStageNumber(page, "axes"), { timeout: 5_000 }).toBeGreaterThan(0);
      const axesBeforeMiss = await readStageNumber(page, "axes");
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(180);
      await page.keyboard.up("ArrowLeft");
      await page.keyboard.press("t");
      await expect.poll(() => readStageNumber(page, "axes"), { timeout: 4_000 }).toBe(axesBeforeMiss - 1);
      await page.waitForTimeout(900);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 4_000 });

      await jumpRightForUpperCoin(page);
      await expect.poll(() => readStageNumber(page, "upper-coins"), { timeout: 5_000 }).toBeGreaterThan(0);

      await moveRightUntilChallenge(page, 700);
      await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-challenge-kind", "contact", { timeout: 4_000 });
      await answerWrongCurrentChallenge(page);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-lives", "1", { timeout: 5_000 });
      await expect(stage).toHaveAttribute("data-invulnerable", "true", { timeout: 4_000 });
      await expect.poll(async () => await stage.getAttribute("data-invulnerable"), { timeout: 6_000 }).toBe("false");

      await moveRightUntilChallenge(page, 700);
      await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-challenge-kind", "contact", { timeout: 4_000 });
      await answerWrongCurrentChallenge(page);
      await expect(stage).toHaveAttribute("data-phase", "game-over", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-lives", "0", { timeout: 5_000 });
      await expect(page.getByTestId("adventure-island-game-over")).toContainText("GAME OVER");
      await page.getByTestId("adventure-island-game-over").getByRole("button", { name: /Restart run/i }).click();
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-lives", "2", { timeout: 5_000 });
      await expect.poll(() => readStageNumber(page, "player-x"), { timeout: 5_000 }).toBeLessThan(140);

      await moveRightUntil(page, 330);
      await expect.poll(() => readStageNumber(page, "axes"), { timeout: 5_000 }).toBeGreaterThan(0);
      await holdRightIntoChallengeAndRelease(page, 700);
      await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-challenge-kind", "contact", { timeout: 4_000 });
      const defeatedBeforeContactAnswer = await readStageNumber(page, "defeated");
      await answerCurrentChallenge(page);
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 8_000 });
      await expect(stage).toHaveAttribute("data-lives", "2", { timeout: 5_000 });
      await expect(stage).toHaveAttribute("data-invulnerable", "true", { timeout: 4_000 });
      await expect.poll(() => readStageNumber(page, "defeated"), { timeout: 5_000 }).toBe(defeatedBeforeContactAnswer);
      const xAfterContactAnswer = await readStageNumber(page, "player-x");
      await page.waitForTimeout(650);
      const xWithoutInputAfterContact = await readStageNumber(page, "player-x");
      expect(Math.abs(xWithoutInputAfterContact - xAfterContactAnswer)).toBeLessThanOrEqual(8);

      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(300);
      await page.keyboard.up("ArrowLeft");
      const xAfterRenewedLeft = await readStageNumber(page, "player-x");
      expect(xAfterRenewedLeft).toBeLessThan(xWithoutInputAfterContact - 18);

      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(360);
      await page.keyboard.up("ArrowRight");
      await expect.poll(() => readStageNumber(page, "player-x"), { timeout: 5_000 }).toBeGreaterThan(xAfterRenewedLeft + 28);

      const coinsAfterPickup = await readStageNumber(page, "coins");
      await throwAxeAndAnswer(page);
      await expect.poll(() => readStageNumber(page, "defeated"), { timeout: 5_000 }).toBe(1);
      await expect.poll(() => readStageNumber(page, "coins"), { timeout: 5_000 }).toBeGreaterThanOrEqual(coinsAfterPickup + 2);

      const xAfterFirstDefeat = await readStageNumber(page, "player-x");
      await page.waitForTimeout(650);
      const xWithoutInputAfterDefeat = await readStageNumber(page, "player-x");
      expect(Math.abs(xWithoutInputAfterDefeat - xAfterFirstDefeat)).toBeLessThanOrEqual(8);

      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(450);
      await page.keyboard.up("ArrowRight");
      await expect.poll(() => readStageNumber(page, "player-x"), { timeout: 5_000 }).toBeGreaterThan(xWithoutInputAfterDefeat + 40);

      await moveRightUntil(page, 720);
      await expect.poll(() => readStageNumber(page, "axes"), { timeout: 5_000 }).toBeGreaterThan(0);
      await throwAxeAndAnswer(page);
      await expect.poll(() => readStageNumber(page, "defeated"), { timeout: 5_000 }).toBe(2);

      await moveRightUntil(page, 1020);
      await expect.poll(() => readStageNumber(page, "axes"), { timeout: 5_000 }).toBeGreaterThan(0);
      await throwAxeAndAnswer(page);
      await expect.poll(() => readStageNumber(page, "defeated"), { timeout: 5_000 }).toBe(3);

      const completionResponse = page.waitForResponse((response) =>
        response.url().endsWith("/api/gamification/adventure-island") &&
        response.request().method() === "POST"
      );
      await moveRightUntilTrophyOrContactChallenge(page, 4000);
      const awarded = await readJson<AdventureIslandCompletion>(await completionResponse, 201);
      expect(awarded.status).toBe("awarded");
      expect(awarded.reward).toMatchObject({ xp: 35, rewardPoints: 35 });
      expect(awarded.gamification?.xp).toBe(beforeAdventureIslandSummary.gamification.xp + 35);
      expect(awarded.gamification?.rewardSummary.available).toBe(beforeAdventureIslandSummary.gamification.rewardSummary.available + 35);
      expect(awarded.gamification?.earnedBadges.some((badge) => badge.id === "adventure-island-clear")).toBeTruthy();
      const afterAdventureIslandRewards = await readJson<StudentRewardsPayload>(
        await page.request.get(app.url("/api/rewards"))
      );
      expect(afterAdventureIslandRewards.rewards.summary.available).toBe(beforeAdventureIslandRewards.rewards.summary.available + 35);
      await expect(stage).toHaveAttribute("data-phase", "cleared", { timeout: 10_000 });

      const duplicate = await page.request.post(app.url("/api/gamification/bonus-games/quadratic"), {
        data: {
          ...strongPayload,
          correctQuestionIds: roundQuestions.slice(0, 3).map((question) => question.id),
          durationSeconds: 45,
          defeatedEnemies: 3
        }
      });
      const duplicateBody = await readJson<AdventureIslandCompletion>(duplicate, 409);
      expect(duplicateBody.status).toBe("duplicate");

      const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
      expect(dataUrlLength).toBeGreaterThan(1000);
    } finally {
      await app.attachLogs(testInfo);
      await app.stop();
    }
  });
});
