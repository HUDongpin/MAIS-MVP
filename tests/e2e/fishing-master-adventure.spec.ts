import { expect, test, type APIResponse, type Locator, type Page, type Response as PlaywrightResponse, type TestInfo } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { questions } from "../../data/questions";
import { uniqueSuffix } from "./helpers";
import { startIsolatedApp, type IsolatedApp } from "./isolated-app";

type AuthenticatedResponse = {
  user: {
    id: string;
  };
};

type AttemptCheck = {
  correct: boolean;
};

type FishingRoundPayload = {
  topicId: string;
  roundQuestionIds: string[];
  correctRoundQuestionIds: string[];
  accuracyPercent: number;
  roundKey: string;
};

type FishingCompletion = {
  status: string;
  reward: {
    xp: number;
    rewardPoints: number;
  };
  coins: number;
  gamification: unknown;
};

type QuestionSummary = {
  id: string;
  topicId: string;
  answer: string;
};

type RuntimeEvent = {
  at: string;
  kind: string;
  message: string;
};

type ScenarioCategory =
  | "happy-path"
  | "locked-boundary"
  | "operation-exploration"
  | "api-adversarial"
  | "desktop-visual"
  | "network-resource"
  | "long-boundary"
  | "mobile";

type ScenarioSpec = {
  id: string;
  category: ScenarioCategory;
  variant: string;
  index: number;
};

type AdventureResult = {
  id: string;
  category: ScenarioCategory;
  variant: string;
  project: string;
  status: "passed" | "failed";
  durationMs: number;
  startedAt: string;
  finishedAt: string;
  grade?: string;
  topicId?: string;
  accuracyPercent?: number;
  roundKey?: string;
  phases: Array<{ label: string; phase: string | null; nets: string | null; coins: string | null; elapsed: string | null }>;
  metrics: Record<string, number | string | boolean>;
  apiStatuses: Array<{ label: string; status: number; responseStatus?: string }>;
  runtimeEvents: RuntimeEvent[];
  fatalEvents: RuntimeEvent[];
  error?: string;
};

type ScenarioContext = {
  app: IsolatedApp;
  page: Page;
  testInfo: TestInfo;
  diagnostics: ReturnType<typeof attachFishingRuntimeDiagnostics>;
};

const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const fishingAppOptions = { warmPaths: ["/student/practice/games/fishing-master"] };
const defaultTopicId = "quadratic-patterns";
const fatalFishingRuntimePattern = /Application error|ChunkLoadError|Loading chunk \d+ failed/i;
const answerByQuestionId = new Map(questions.map((question) => [question.id, question.answer]));

test.setTimeout(900_000);
test.use({ trace: "off", video: "off", screenshot: "off" });

function hkReportDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function reportPaths() {
  const reportDir = path.join(process.cwd(), "coordination", "reports");
  const date = hkReportDate();
  return {
    reportDir,
    resultsPath: path.join(reportDir, `${date}-fishing-master-adventure-results.json`),
    reportPath: path.join(reportDir, `${date}-fishing-master-adventure-qa.md`)
  };
}

function scenarioSpecsForProject(projectName: string) {
  if (projectName === "mobile-chrome") {
    return buildSpecs("mobile", 10, "mobile", [
      "mobile-ready-canvas",
      "mobile-catch-correct",
      "mobile-locked-no-payload",
      "mobile-rapid-fire",
      "mobile-keyboard-space",
      "mobile-catch-wrong",
      "mobile-visual-hud",
      "mobile-no-auth",
      "mobile-canvas-repeat",
      "mobile-touch-fire"
    ]);
  }

  return [
    ...buildSpecs("happy", 20, "happy-path", ["one-catch-100", "one-catch-80"]),
    ...buildSpecs("locked", 15, "locked-boundary", [
      "unauthenticated",
      "missing-payload",
      "malformed-storage",
      "accuracy-0",
      "accuracy-60",
      "accuracy-79",
      "short-round",
      "non-string-round-ids",
      "nonexistent-topic"
    ]),
    ...buildSpecs("ops", 20, "operation-exploration", [
      "rapid-click-fire",
      "keyboard-extreme-miss",
      "space-spam",
      "challenge-wait",
      "wrong-answer"
    ]),
    ...buildSpecs("api", 15, "api-adversarial", [
      "duplicate-round-key",
      "unauthenticated-post",
      "coins-mismatch",
      "correct-not-caught",
      "caught-cross-topic",
      "nets-overflow",
      "coins-overflow",
      "duration-overflow",
      "duration-negative",
      "missing-topic",
      "four-round-ids",
      "correct-round-not-in-round",
      "unverified-round-correct",
      "empty-round-key",
      "caught-more-than-nets"
    ]),
    ...buildSpecs("desktop", 10, "desktop-visual", [
      "desktop-ready-canvas",
      "desktop-hud",
      "desktop-challenge-modal",
      "desktop-fire-button",
      "desktop-heading",
      "desktop-canvas-repeat",
      "desktop-locked-copy",
      "desktop-correct-catch",
      "desktop-wrong-catch",
      "desktop-return-link"
    ]),
    ...buildSpecs("network", 5, "network-resource", [
      "questions-500",
      "questions-empty",
      "questions-timeout",
      "completion-500",
      "completion-retry"
    ]),
    ...buildSpecs("boundary", 5, "long-boundary", [
      "ui-all-miss-zero-coins",
      "api-zero-coin-legal",
      "api-max-coin-legal",
      "api-duration-120-legal",
      "ui-catch-then-exhaust"
    ])
  ];
}

function buildSpecs(prefix: string, count: number, category: ScenarioCategory, variants: string[]) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${String(index + 1).padStart(2, "0")}`,
    category,
    variant: variants[index % variants.length],
    index
  }));
}

function answeredQuestionsForTopic(topicId: string, count: number, offset = 0): QuestionSummary[] {
  const candidates = questions
    .filter((question) => question.topicId === topicId && typeof question.answer === "string" && question.answer.trim())
    .map((question) => ({ id: question.id, topicId: question.topicId, answer: question.answer }));
  expect(candidates.length, `Need ${count} answered questions for ${topicId}`).toBeGreaterThanOrEqual(count);
  return Array.from({ length: count }, (_, index) => candidates[(offset + index) % candidates.length]);
}

function alternateTopicQuestion(count = 1) {
  const topicId = questions.find((question) => question.topicId !== defaultTopicId && answerByQuestionId.has(question.id))?.topicId;
  expect(topicId, "Need an alternate topic for cross-topic Fishing checks").toBeTruthy();
  return answeredQuestionsForTopic(topicId ?? defaultTopicId, count);
}

async function readJson<T>(response: APIResponse | PlaywrightResponse, expectedStatus?: number) {
  const bodyText = await response.text();
  if (expectedStatus !== undefined) expect(response.status(), bodyText).toBe(expectedStatus);
  return {
    status: response.status(),
    bodyText,
    json: bodyText ? JSON.parse(bodyText) as T : null
  };
}

function sanitizedError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .split("\n")
    .slice(0, 4)
    .join(" ")
    .replace(/hk_math_session=[^\s;]+/g, "hk_math_session=[redacted]")
    .replace(/password[\"'\s:=]+[^,\"'\s}]+/gi, "password=[redacted]");
}

function escapedAnswerPattern(answer: string) {
  return new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
}

function attachFishingRuntimeDiagnostics(page: Page) {
  const events: RuntimeEvent[] = [];

  const record = (kind: string, message: string) => {
    events.push({ at: new Date().toISOString(), kind, message });
  };

  page.on("pageerror", (error) => {
    record("pageerror", error.message);
  });

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()) || fatalFishingRuntimePattern.test(message.text())) {
      record(`console:${message.type()}`, message.text());
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (url.includes("/_next/static/") || url.includes("/student/practice/games/fishing-master") || url.includes("/api/questions") || url.includes("/api/gamification/fishing-game")) {
      record("requestfailed", `${request.method()} ${url} ${request.failure()?.errorText ?? "unknown failure"}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    if ((url.includes("/api/questions") || url.includes("/api/gamification/fishing-game/complete")) && response.status() >= 400) {
      record("badresponse", `${response.status()} ${response.request().method()} ${url}`);
    }
  });

  return {
    mark() {
      return events.length;
    },
    since(mark: number) {
      return events.slice(mark);
    },
    fatalSince(mark: number) {
      return events.slice(mark).filter(isFatalRuntimeEvent);
    },
    async attach(testInfo: TestInfo) {
      if (!events.length) return;
      await testInfo.attach("fishing-master-adventure-runtime.log", {
        body: events.map((event) => `[${event.at}] ${event.kind}: ${event.message}`).join("\n"),
        contentType: "text/plain"
      });
    }
  };
}

function isFatalRuntimeEvent(event: RuntimeEvent) {
  if (fatalFishingRuntimePattern.test(event.message)) return true;
  return (
    event.kind === "requestfailed" &&
    event.message.includes("/_next/static/chunks/app/student/practice/games") &&
    !event.message.includes("net::ERR_ABORTED")
  );
}

async function registerStudent(app: IsolatedApp, page: Page, testInfo: TestInfo, label: string, grade = "S3") {
  const suffix = uniqueSuffix(testInfo).replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
  const safeLabel = label.replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 36);
  let lastBody = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.request.post(app.url("/api/auth/register"), {
        data: {
          name: `Fishing Master ${safeLabel}`,
          username: `fishing-master-${safeLabel}-${attempt}-${suffix}@example.test`,
          password: "start12345",
          grade,
          curriculumTrack: "HK",
          language: "en",
          theme: "dark"
        }
      });
      lastBody = await response.text();
      if (response.ok()) return JSON.parse(lastBody) as AuthenticatedResponse;
    } catch (error) {
      lastBody = sanitizedError(error);
    }
    await page.waitForTimeout(400);
  }

  expect(false, lastBody).toBeTruthy();
  throw new Error(`Could not register Fishing Master student for ${label}.`);
}

async function submitCorrectAttempts(app: IsolatedApp, page: Page, questionIds: string[], expectedUserId: string) {
  for (const questionId of questionIds) {
    const answer = answerByQuestionId.get(questionId);
    expect(answer, `Missing local answer for ${questionId}`).toBeTruthy();
    const response = await page.request.post(app.url("/api/attempts"), {
      headers: { "X-MAIS-Expected-User-Id": expectedUserId },
      data: {
        expectedUserId,
        questionId,
        selectedAnswer: answer,
        durationSeconds: 8
      }
    });
    const { json } = await readJson<AttemptCheck>(response, 200);
    expect(json?.correct, `Expected seeded attempt ${questionId} to be correct`).toBe(true);
  }
}

async function prepareFishingRound({
  app,
  page,
  testInfo,
  label,
  topicId = defaultTopicId,
  grade = "S3",
  correctCount = 5,
  questionCount = 5,
  offset = 0,
  roundKeySuffix = ""
}: {
  app: IsolatedApp;
  page: Page;
  testInfo: TestInfo;
  label: string;
  topicId?: string;
  grade?: string;
  correctCount?: number;
  questionCount?: number;
  offset?: number;
  roundKeySuffix?: string;
}) {
  const session = await registerStudent(app, page, testInfo, label, grade);
  const roundQuestions = answeredQuestionsForTopic(topicId, Math.max(questionCount, 5), offset).slice(0, questionCount);
  const correctRoundQuestionIds = roundQuestions.slice(0, correctCount).map((question) => question.id);
  await submitCorrectAttempts(app, page, correctRoundQuestionIds, session.user.id);
  const payload: FishingRoundPayload = {
    topicId,
    roundQuestionIds: roundQuestions.map((question) => question.id),
    correctRoundQuestionIds,
    accuracyPercent: Math.round((correctCount / Math.max(1, questionCount)) * 100),
    roundKey: `${label}-${Date.now()}-${roundKeySuffix || "round"}`
  };

  return { session, payload, roundQuestions };
}

async function setFishingPayload(page: Page, app: IsolatedApp, payload: FishingRoundPayload | string | null) {
  await page.goto(app.url("/student/practice/games/fishing-master"), { waitUntil: "domcontentloaded" });
  await page.evaluate(({ key, value }) => {
    if (value === null) window.sessionStorage.removeItem(key);
    else if (typeof value === "string") window.sessionStorage.setItem(key, value);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  }, { key: fishingRoundStorageKey, value: payload });
  await page.reload({ waitUntil: "domcontentloaded" });
}

async function recordStage(result: AdventureResult, page: Page, label: string) {
  const stage = page.getByTestId("fishing-game-stage");
  if (await stage.count() === 0) {
    result.phases.push({ label, phase: null, nets: null, coins: null, elapsed: null });
    return;
  }

  result.phases.push({
    label,
    phase: await stage.getAttribute("data-phase"),
    nets: await stage.getAttribute("data-nets"),
    coins: await stage.getAttribute("data-coins"),
    elapsed: await stage.getAttribute("data-elapsed")
  });
}

async function expectCanvasNonBlank(page: Page, testInfo: TestInfo, attachmentName: string) {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
  expect(dataUrlLength).toBeGreaterThan(1000);

  if (attachmentName.endsWith("-01")) {
    await testInfo.attach(`${attachmentName}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png"
    });
  }

  return dataUrlLength;
}

async function openReadyFishingGame(ctx: ScenarioContext, result: AdventureResult, payload: FishingRoundPayload) {
  await setFishingPayload(ctx.page, ctx.app, payload);
  const stage = ctx.page.getByTestId("fishing-game-stage");
  await expect(stage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
  await expect(stage).toHaveAttribute("data-renderer-load", "ready", { timeout: 20_000 });
  await expect(stage).toHaveAttribute("data-fish-count", /\d+/, { timeout: 20_000 });
  result.metrics.canvasDataUrlLength = await expectCanvasNonBlank(ctx.page, ctx.testInfo, `${result.id}-${result.project}`);
  await recordStage(result, ctx.page, "welcome");
  await ctx.page.getByTestId("fishing-start-button").click();
  await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
  await recordStage(result, ctx.page, "ready");
  return stage;
}

async function answerVisibleQuestion(page: Page, correctAnswer: string, shouldAnswerCorrectly: boolean, scope: Locator) {
  const card = scope.locator("article:visible").first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  const textbox = card.getByRole("textbox").first();

  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(shouldAnswerCorrectly ? correctAnswer : `wrong-${Date.now()}`);
  } else {
    if (shouldAnswerCorrectly) {
      await card.getByRole("button", { name: escapedAnswerPattern(correctAnswer) }).first().click();
    } else {
      const buttons = card.locator("button");
      const buttonCount = await buttons.count();
      let clickedWrongOption = false;

      for (let index = 0; index < buttonCount; index += 1) {
        const button = buttons.nth(index);
        const text = ((await button.textContent()) ?? "").replace(/\s+/g, " ").trim();
        if (!text || /Check Answer|Reset|Math keyboard|Add photos/i.test(text)) continue;
        if (escapedAnswerPattern(correctAnswer).test(text)) continue;
        await button.click();
        clickedWrongOption = true;
        break;
      }

      expect(clickedWrongOption, `Could not find a wrong multiple-choice option for ${correctAnswer}`).toBe(true);
    }
  }

  const checkButton = card.getByRole("button", { name: /Check Answer/i });
  const attemptResponse = page.waitForResponse((response) =>
    response.url().includes("/api/attempts") && response.request().method() === "POST"
  );
  await expect(checkButton).toBeEnabled();
  await checkButton.click();
  const { json } = await readJson<AttemptCheck>(await attemptResponse, 200);
  return json ?? { correct: false };
}

async function answerFishingChallenge(ctx: ScenarioContext, correct: boolean) {
  const challenge = ctx.page.getByTestId("fishing-challenge");
  await expect(challenge).toBeVisible({ timeout: 10_000 });
  const questionId = await challenge.getAttribute("data-question-id");
  expect(questionId).toBeTruthy();
  const correctAnswer = answerByQuestionId.get(questionId ?? "");
  expect(correctAnswer, `Missing answer for Fishing challenge ${questionId}`).toBeTruthy();
  const feedback = await answerVisibleQuestion(ctx.page, correctAnswer ?? "", correct, challenge);
  expect(feedback.correct).toBe(correct);
  return { questionId: questionId ?? "", correct: feedback.correct };
}

async function fireFirstCatch(ctx: ScenarioContext, result: AdventureResult, correct: boolean) {
  const stage = ctx.page.getByTestId("fishing-game-stage");
  await ctx.page.getByRole("button", { name: /Fire net/i }).click();
  await expect(stage).toHaveAttribute("data-last-cast", "hit", { timeout: 10_000 });
  await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 10_000 });
  await recordStage(result, ctx.page, "challenge");
  const answered = await answerFishingChallenge(ctx, correct);
  await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
  await recordStage(result, ctx.page, correct ? "answered-correct" : "answered-wrong");
  return answered;
}

async function postFishingCompletion(
  app: IsolatedApp,
  page: Page,
  payload: FishingRoundPayload,
  body: {
    caughtQuestionIds: string[];
    correctCaughtQuestionIds: string[];
    coins: number;
    netsUsed: number;
    durationSeconds: number;
  },
  expectedStatus?: number
) {
  const response = await page.request.post(app.url("/api/gamification/fishing-game/complete"), {
    data: {
      ...payload,
      ...body
    }
  });
  return readJson<FishingCompletion>(response, expectedStatus);
}

async function exhaustNetsWithMisses(ctx: ScenarioContext, result: AdventureResult) {
  const page = ctx.page;
  const stage = page.getByTestId("fishing-game-stage");
  const fireButton = page.getByRole("button", { name: /Fire net/i });

  for (let press = 0; press < 18; press += 1) await page.keyboard.press("ArrowRight");

  let currentNets = Number(await stage.getAttribute("data-nets"));
  while (currentNets > 0) {
    await fireButton.click();
    await expect(stage).toHaveAttribute("data-nets", String(currentNets - 1), { timeout: 10_000 });
    if (await page.getByTestId("fishing-challenge").isVisible().catch(() => false)) {
      await answerFishingChallenge(ctx, false);
    }
    currentNets -= 1;
    if (currentNets > 0) await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
  }

  await recordStage(result, page, "nets-exhausted");
}

async function runHappyPath(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  const correctCount = spec.variant.includes("80") ? 4 : 5;
  const setup = await prepareFishingRound({
    ...ctx,
    label: spec.id,
    correctCount,
    offset: spec.index
  });
  Object.assign(result, {
    grade: "S3",
    topicId: setup.payload.topicId,
    accuracyPercent: setup.payload.accuracyPercent,
    roundKey: setup.payload.roundKey
  });

  if (spec.index >= 5) {
    const caught = answeredQuestionsForTopic(defaultTopicId, 1, spec.index + 20);
    await submitCorrectAttempts(ctx.app, ctx.page, [caught[0].id], setup.session.user.id);
    const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
      caughtQuestionIds: [caught[0].id],
      correctCaughtQuestionIds: [caught[0].id],
      coins: 1,
      netsUsed: 1,
      durationSeconds: 15
    }, 201);
    result.apiStatuses.push({ label: "legal-completion-fast", status: completion.status, responseStatus: completion.json?.status });
    expect(["awarded", "capped"]).toContain(completion.json?.status);
    expect(completion.json?.reward.rewardPoints).toBe(3);
    result.metrics.fastProbe = true;
    result.metrics.coins = 1;
    result.metrics.rewardPoints = completion.json?.reward.rewardPoints ?? 0;
    return;
  }

  await openReadyFishingGame(ctx, result, setup.payload);
  const catchResult = await fireFirstCatch(ctx, result, true);
  const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
    caughtQuestionIds: [catchResult.questionId],
    correctCaughtQuestionIds: [catchResult.questionId],
    coins: 1,
    netsUsed: 1,
    durationSeconds: 15
  }, 201);
  result.apiStatuses.push({ label: "legal-completion", status: completion.status, responseStatus: completion.json?.status });
  expect(["awarded", "capped"]).toContain(completion.json?.status);
  expect(completion.json?.reward.rewardPoints).toBe(3);
  result.metrics.coins = 1;
  result.metrics.rewardPoints = completion.json?.reward.rewardPoints ?? 0;
}

async function runLockedBoundary(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  if (spec.variant === "unauthenticated") {
    await ctx.page.context().clearCookies();
    await setFishingPayload(ctx.page, ctx.app, null);
  } else {
    await registerStudent(ctx.app, ctx.page, ctx.testInfo, spec.id);

    if (spec.variant === "missing-payload") {
      await setFishingPayload(ctx.page, ctx.app, null);
    } else if (spec.variant === "malformed-storage") {
      await setFishingPayload(ctx.page, ctx.app, "{not-json");
    } else {
      const setup = await prepareFishingRound({
        ...ctx,
        label: `${spec.id}-payload`,
        correctCount: spec.variant === "accuracy-0" ? 0 : spec.variant === "accuracy-60" ? 3 : 4,
        questionCount: spec.variant === "short-round" ? 4 : 5,
        offset: spec.index
      });
      const payload = {
        ...setup.payload,
        accuracyPercent: spec.variant === "accuracy-0" ? 0 : spec.variant === "accuracy-60" ? 60 : spec.variant === "accuracy-79" ? 79 : setup.payload.accuracyPercent,
        roundQuestionIds: spec.variant === "non-string-round-ids" ? ["valid", 3, null] as unknown as string[] : setup.payload.roundQuestionIds,
        topicId: spec.variant === "nonexistent-topic" ? "missing-fishing-topic" : setup.payload.topicId
      };
      await setFishingPayload(ctx.page, ctx.app, payload);
      result.topicId = payload.topicId;
      result.accuracyPercent = payload.accuracyPercent;
    }
  }

  await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
  await recordStage(result, ctx.page, "locked");
  result.metrics.locked = true;
}

async function runOperationExploration(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  result.topicId = setup.payload.topicId;
  result.accuracyPercent = setup.payload.accuracyPercent;
  result.roundKey = setup.payload.roundKey;

  if (spec.index >= 5) {
    const caught = answeredQuestionsForTopic(defaultTopicId, 2, spec.index + 30);
    const shouldAwardCoin = spec.variant !== "wrong-answer" && spec.variant !== "keyboard-extreme-miss";
    if (shouldAwardCoin) await submitCorrectAttempts(ctx.app, ctx.page, [caught[0].id], setup.session.user.id);
    const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
      caughtQuestionIds: spec.variant === "keyboard-extreme-miss" ? [] : [caught[0].id],
      correctCaughtQuestionIds: shouldAwardCoin ? [caught[0].id] : [],
      coins: shouldAwardCoin ? 1 : 0,
      netsUsed: spec.variant === "rapid-click-fire" || spec.variant === "space-spam" ? 2 : 1,
      durationSeconds: spec.variant === "challenge-wait" ? 45 : 12
    }, 201);
    result.apiStatuses.push({ label: `operation-fast-${spec.variant}`, status: completion.status, responseStatus: completion.json?.status });
    result.metrics.fastProbe = true;
    result.metrics.operationVariant = spec.variant;
    return;
  }

  const stage = await openReadyFishingGame(ctx, result, setup.payload);
  const fireButton = ctx.page.getByRole("button", { name: /Fire net/i });

  if (spec.variant === "rapid-click-fire") {
    await ctx.page.evaluate(() => {
      const fire = Array.from(document.querySelectorAll("button")).find((button) => /Fire net/i.test(button.textContent ?? ""));
      for (let index = 0; index < 5; index += 1) fire?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await expect(stage).toHaveAttribute("data-nets", /9|10/, { timeout: 10_000 });
    if (await ctx.page.getByTestId("fishing-challenge").isVisible().catch(() => false)) await answerFishingChallenge(ctx, true);
  } else if (spec.variant === "keyboard-extreme-miss") {
    for (let press = 0; press < 20; press += 1) await ctx.page.keyboard.press("ArrowRight");
    await fireButton.click();
    await expect(stage).toHaveAttribute("data-last-cast", "miss", { timeout: 10_000 });
    await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
  } else if (spec.variant === "space-spam") {
    for (let press = 0; press < 5; press += 1) await ctx.page.keyboard.press("Space");
    await expect(stage).toHaveAttribute("data-nets", /9|10/, { timeout: 10_000 });
    if (await ctx.page.getByTestId("fishing-challenge").isVisible().catch(() => false)) await answerFishingChallenge(ctx, true);
  } else if (spec.variant === "challenge-wait") {
    await fireButton.click();
    await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 10_000 });
    await ctx.page.waitForTimeout(1000);
    await expect(stage).toHaveAttribute("data-phase", "challenge");
    await answerFishingChallenge(ctx, true);
  } else {
    await fireFirstCatch(ctx, result, false);
    await expect(stage).toHaveAttribute("data-coins", "0");
  }

  await recordStage(result, ctx.page, spec.variant);
}

async function runApiAdversarial(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  if (spec.variant === "unauthenticated-post") {
    const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
    await ctx.page.context().clearCookies();
    const response = await ctx.page.request.post(ctx.app.url("/api/gamification/fishing-game/complete"), {
      data: {
        ...setup.payload,
        caughtQuestionIds: [],
        correctCaughtQuestionIds: [],
        coins: 0,
        netsUsed: 0,
        durationSeconds: 0
      }
    });
    const payload = await readJson<{ error?: string }>(response, 401);
    result.apiStatuses.push({ label: spec.variant, status: payload.status, responseStatus: payload.json?.error });
    return;
  }

  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  const caught = answeredQuestionsForTopic(defaultTopicId, 3, spec.index + 5);
  await submitCorrectAttempts(ctx.app, ctx.page, caught.slice(0, 2).map((question) => question.id), setup.session.user.id);
  const baseBody = {
    caughtQuestionIds: caught.slice(0, 2).map((question) => question.id),
    correctCaughtQuestionIds: caught.slice(0, 2).map((question) => question.id),
    coins: 2,
    netsUsed: 2,
    durationSeconds: 30
  };

  if (spec.variant === "duplicate-round-key") {
    const first = await postFishingCompletion(ctx.app, ctx.page, setup.payload, baseBody, 201);
    const duplicate = await postFishingCompletion(ctx.app, ctx.page, setup.payload, baseBody, 409);
    result.apiStatuses.push(
      { label: "first-legal", status: first.status, responseStatus: first.json?.status },
      { label: "duplicate", status: duplicate.status, responseStatus: duplicate.json?.status }
    );
    expect(duplicate.json?.status).toBe("duplicate");
    return;
  }

  let payload = setup.payload;
  let body = { ...baseBody };
  let expectedStatus = 422;

  if (spec.variant === "coins-mismatch") body = { ...body, coins: 1 };
  if (spec.variant === "correct-not-caught") body = { ...body, correctCaughtQuestionIds: [caught[2].id] };
  if (spec.variant === "caught-cross-topic") body = { ...body, caughtQuestionIds: [alternateTopicQuestion()[0].id], correctCaughtQuestionIds: [], coins: 0, netsUsed: 1 };
  if (spec.variant === "nets-overflow") body = { ...body, netsUsed: 11 };
  if (spec.variant === "coins-overflow") body = { ...body, coins: 11 };
  if (spec.variant === "duration-overflow") body = { ...body, durationSeconds: 121 };
  if (spec.variant === "duration-negative") body = { ...body, durationSeconds: -1 };
  if (spec.variant === "missing-topic") payload = { ...payload, topicId: "" };
  if (spec.variant === "four-round-ids") payload = { ...payload, roundQuestionIds: payload.roundQuestionIds.slice(0, 4), correctRoundQuestionIds: payload.correctRoundQuestionIds.slice(0, 4) };
  if (spec.variant === "correct-round-not-in-round") payload = { ...payload, correctRoundQuestionIds: [payload.roundQuestionIds[0], payload.roundQuestionIds[1], payload.roundQuestionIds[2], payload.roundQuestionIds[3], caught[2].id] };
  if (spec.variant === "unverified-round-correct") {
    const session = await registerStudent(ctx.app, ctx.page, ctx.testInfo, `${spec.id}-unverified`);
    expect(session.user.id).toBeTruthy();
    const rawQuestions = answeredQuestionsForTopic(defaultTopicId, 5, spec.index + 8);
    payload = {
      topicId: defaultTopicId,
      roundQuestionIds: rawQuestions.map((question) => question.id),
      correctRoundQuestionIds: rawQuestions.map((question) => question.id),
      accuracyPercent: 100,
      roundKey: `${spec.id}-unverified-${Date.now()}`
    };
    body = { caughtQuestionIds: [], correctCaughtQuestionIds: [], coins: 0, netsUsed: 0, durationSeconds: 0 };
  }
  if (spec.variant === "empty-round-key") payload = { ...payload, roundKey: "" };
  if (spec.variant === "caught-more-than-nets") body = { ...body, caughtQuestionIds: caught.slice(0, 2).map((question) => question.id), correctCaughtQuestionIds: [], coins: 0, netsUsed: 1 };

  const response = await postFishingCompletion(ctx.app, ctx.page, payload, body, expectedStatus);
  result.apiStatuses.push({ label: spec.variant, status: response.status, responseStatus: response.json?.status });
  expect(response.json?.status).toBe("invalid-run");
}

async function runDesktopVisual(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  if (spec.variant === "desktop-locked-copy") {
    await registerStudent(ctx.app, ctx.page, ctx.testInfo, spec.id);
    await setFishingPayload(ctx.page, ctx.app, null);
    await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
    await expect(ctx.page.getByRole("link", { name: /Back to Practice Arena/i })).toBeVisible();
    await recordStage(result, ctx.page, "desktop-locked-copy");
    return;
  }

  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  result.topicId = setup.payload.topicId;
  const stage = await openReadyFishingGame(ctx, result, setup.payload);
  await expect(ctx.page.getByRole("heading", { name: /Math Fishing Challenge/i })).toBeVisible();
  await expect(ctx.page.getByRole("button", { name: /Fire net/i })).toBeEnabled();
  await expect(stage).toHaveAttribute("data-nets", "10");
  await expect(stage).toHaveAttribute("data-coins", "0");

  if (spec.variant === "desktop-challenge-modal" || spec.variant === "desktop-correct-catch") {
    await fireFirstCatch(ctx, result, true);
  }
  if (spec.variant === "desktop-wrong-catch") {
    await fireFirstCatch(ctx, result, false);
  }
  if (spec.variant === "desktop-return-link") {
    await expect(ctx.page.getByRole("link", { name: /Back to Practice/i })).toBeVisible();
  }

  await recordStage(result, ctx.page, spec.variant);
}

async function runNetworkResource(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  result.topicId = setup.payload.topicId;
  const questionsPattern = "**/api/questions?**";
  const completionPattern = "**/api/gamification/fishing-game/complete";

  if (spec.variant === "questions-500") {
    await ctx.page.route(questionsPattern, (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "forced questions failure" }) }));
    try {
      await setFishingPayload(ctx.page, ctx.app, setup.payload);
      await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
    } finally {
      await ctx.page.unroute(questionsPattern).catch(() => undefined);
    }
  } else if (spec.variant === "questions-empty") {
    await ctx.page.route(questionsPattern, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) }));
    try {
      await setFishingPayload(ctx.page, ctx.app, setup.payload);
      await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
    } finally {
      await ctx.page.unroute(questionsPattern).catch(() => undefined);
    }
  } else if (spec.variant === "questions-timeout") {
    await ctx.page.route(questionsPattern, async (route) => {
      await ctx.page.waitForTimeout(13_000);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ questions: [] }) });
    });
    try {
      await setFishingPayload(ctx.page, ctx.app, setup.payload);
      await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 25_000 });
    } finally {
      await ctx.page.unroute(questionsPattern).catch(() => undefined);
    }
  } else if (spec.variant === "completion-500") {
    await ctx.page.route(completionPattern, (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "forced completion failure" }) }));
    try {
      await openReadyFishingGame(ctx, result, setup.payload);
      await exhaustNetsWithMisses(ctx, result);
      await expect(ctx.page.getByRole("button", { name: /Submit result/i })).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctx.page.unroute(completionPattern).catch(() => undefined);
    }
  } else {
    let attempt = 0;
    await ctx.page.route(completionPattern, (route) => {
      attempt += 1;
      if (attempt === 1) {
        return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "forced first completion failure" }) });
      }
      return route.fallback();
    });
    try {
      await openReadyFishingGame(ctx, result, setup.payload);
      await exhaustNetsWithMisses(ctx, result);
      await expect(ctx.page.getByRole("button", { name: /Submit result/i })).toBeVisible({ timeout: 15_000 });
      await ctx.page.getByRole("button", { name: /Submit result/i }).click();
      await expect(ctx.page.getByTestId("fishing-game-stage")).toHaveAttribute("data-phase", "submitted", { timeout: 15_000 });
    } finally {
      await ctx.page.unroute(completionPattern).catch(() => undefined);
    }
  }

  await recordStage(result, ctx.page, spec.variant);
}

async function runLongBoundary(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  result.topicId = setup.payload.topicId;

  if (spec.variant === "ui-all-miss-zero-coins") {
    await openReadyFishingGame(ctx, result, setup.payload);
    await exhaustNetsWithMisses(ctx, result);
    await expect(ctx.page.getByTestId("fishing-game-stage")).toHaveAttribute("data-phase", "submitted", { timeout: 15_000 });
    await expect(ctx.page.getByText(/0 coin\(s\) converted/i)).toBeVisible();
  } else if (spec.variant === "api-zero-coin-legal") {
    const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
      caughtQuestionIds: [],
      correctCaughtQuestionIds: [],
      coins: 0,
      netsUsed: 0,
      durationSeconds: 0
    }, 201);
    result.apiStatuses.push({ label: spec.variant, status: completion.status, responseStatus: completion.json?.status });
    expect(completion.json?.reward.rewardPoints).toBe(0);
  } else if (spec.variant === "api-max-coin-legal") {
    const caught = answeredQuestionsForTopic(defaultTopicId, 10, spec.index + 10);
    await submitCorrectAttempts(ctx.app, ctx.page, caught.map((question) => question.id), setup.session.user.id);
    const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
      caughtQuestionIds: caught.map((question) => question.id),
      correctCaughtQuestionIds: caught.map((question) => question.id),
      coins: 10,
      netsUsed: 10,
      durationSeconds: 120
    }, 201);
    result.apiStatuses.push({ label: spec.variant, status: completion.status, responseStatus: completion.json?.status });
    expect(completion.json?.reward.rewardPoints).toBe(30);
  } else if (spec.variant === "api-duration-120-legal") {
    const caught = answeredQuestionsForTopic(defaultTopicId, 1, spec.index + 4);
    await submitCorrectAttempts(ctx.app, ctx.page, [caught[0].id], setup.session.user.id);
    const completion = await postFishingCompletion(ctx.app, ctx.page, setup.payload, {
      caughtQuestionIds: [caught[0].id],
      correctCaughtQuestionIds: [caught[0].id],
      coins: 1,
      netsUsed: 1,
      durationSeconds: 120
    }, 201);
    result.apiStatuses.push({ label: spec.variant, status: completion.status, responseStatus: completion.json?.status });
  } else {
    await openReadyFishingGame(ctx, result, setup.payload);
    await fireFirstCatch(ctx, result, true);
    await exhaustNetsWithMisses(ctx, result);
    await expect(ctx.page.getByTestId("fishing-game-stage")).toHaveAttribute("data-phase", "submitted", { timeout: 15_000 });
  }
}

async function runMobileScenario(spec: ScenarioSpec, ctx: ScenarioContext, result: AdventureResult) {
  if (spec.variant === "mobile-no-auth") {
    await ctx.page.context().clearCookies();
    await setFishingPayload(ctx.page, ctx.app, null);
    await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
    return;
  }
  if (spec.variant === "mobile-locked-no-payload") {
    await registerStudent(ctx.app, ctx.page, ctx.testInfo, spec.id);
    await setFishingPayload(ctx.page, ctx.app, null);
    await expect(ctx.page.getByText(/Fishing Game locked/i)).toBeVisible({ timeout: 20_000 });
    return;
  }

  const setup = await prepareFishingRound({ ...ctx, label: spec.id, offset: spec.index });
  const stage = await openReadyFishingGame(ctx, result, setup.payload);
  await expect(ctx.page.getByRole("navigation", { name: /Main navigation/i })).toBeHidden();
  await expect(ctx.page.getByRole("contentinfo")).toBeHidden();
  await expect(ctx.page.getByRole("button", { name: /Nova Tutor/i })).toHaveCount(0);
  await expect(ctx.page.getByRole("link", { name: /Back to Practice/i })).toBeVisible();

  if (spec.variant === "mobile-catch-correct") await fireFirstCatch(ctx, result, true);
  if (spec.variant === "mobile-catch-wrong") await fireFirstCatch(ctx, result, false);
  if (spec.variant === "mobile-rapid-fire") {
    await ctx.page.evaluate(() => {
      const fire = Array.from(document.querySelectorAll("button")).find((button) => /Fire net/i.test(button.textContent ?? ""));
      for (let index = 0; index < 3; index += 1) fire?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    if (await ctx.page.getByTestId("fishing-challenge").isVisible().catch(() => false)) await answerFishingChallenge(ctx, true);
  }
  if (spec.variant === "mobile-keyboard-space") {
    await ctx.page.keyboard.press("Space");
    if (await ctx.page.getByTestId("fishing-challenge").isVisible().catch(() => false)) await answerFishingChallenge(ctx, true);
  }
  if (spec.variant === "mobile-touch-fire") {
    await ctx.page.getByRole("button", { name: /Fire net/i }).tap();
    if (await ctx.page.getByTestId("fishing-challenge").isVisible().catch(() => false)) await answerFishingChallenge(ctx, true);
  }

  await expect(stage).toHaveAttribute("data-phase", /ready|casting|challenge/, { timeout: 10_000 });
  await recordStage(result, ctx.page, spec.variant);
}

async function executeScenario(spec: ScenarioSpec, ctx: ScenarioContext) {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  const mark = ctx.diagnostics.mark();
  const result: AdventureResult = {
    id: spec.id,
    category: spec.category,
    variant: spec.variant,
    project: ctx.testInfo.project.name,
    status: "passed",
    durationMs: 0,
    startedAt,
    finishedAt: startedAt,
    phases: [],
    metrics: {},
    apiStatuses: [],
    runtimeEvents: [],
    fatalEvents: []
  };

  try {
    if (spec.category === "happy-path") await runHappyPath(spec, ctx, result);
    if (spec.category === "locked-boundary") await runLockedBoundary(spec, ctx, result);
    if (spec.category === "operation-exploration") await runOperationExploration(spec, ctx, result);
    if (spec.category === "api-adversarial") await runApiAdversarial(spec, ctx, result);
    if (spec.category === "desktop-visual") await runDesktopVisual(spec, ctx, result);
    if (spec.category === "network-resource") await runNetworkResource(spec, ctx, result);
    if (spec.category === "long-boundary") await runLongBoundary(spec, ctx, result);
    if (spec.category === "mobile") await runMobileScenario(spec, ctx, result);
  } catch (error) {
    result.status = "failed";
    result.error = sanitizedError(error);
  } finally {
    result.durationMs = Date.now() - startMs;
    result.finishedAt = new Date().toISOString();
    result.runtimeEvents = ctx.diagnostics.since(mark);
    result.fatalEvents = ctx.diagnostics.fatalSince(mark);
    if (result.fatalEvents.length) result.status = "failed";
  }

  return result;
}

function mergeAndWriteReport(projectName: string, projectResults: AdventureResult[]) {
  const { reportDir, resultsPath, reportPath } = reportPaths();
  mkdirSync(reportDir, { recursive: true });

  const shouldReset = projectName === "desktop-chrome" || !existsSync(resultsPath);
  const previous = shouldReset ? { results: [] as AdventureResult[] } : JSON.parse(readFileSync(resultsPath, "utf8")) as { results?: AdventureResult[] };
  const results = [
    ...(previous.results ?? []).filter((result) => result.project !== projectName),
    ...projectResults
  ];
  const payload = {
    generatedAt: new Date().toISOString(),
    reportDate: hkReportDate(),
    suite: "Fishing Master adventure stress QA",
    expectedRunsForFullDesktopMobileCommand: 100,
    actualRunsInAggregate: results.length,
    results
  };

  writeFileSync(resultsPath, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(reportPath, buildMarkdownReport(payload), "utf8");

  return { resultsPath, reportPath, aggregateResults: results };
}

function buildMarkdownReport(payload: { generatedAt: string; reportDate: string; actualRunsInAggregate: number; expectedRunsForFullDesktopMobileCommand: number; results: AdventureResult[] }) {
  const results = payload.results;
  const failures = results.filter((result) => result.status === "failed");
  const categoryRows = Array.from(new Set(results.map((result) => result.category))).map((category) => {
    const categoryResults = results.filter((result) => result.category === category);
    const passed = categoryResults.filter((result) => result.status === "passed").length;
    const failed = categoryResults.length - passed;
    return `| ${category} | ${categoryResults.length} | ${passed} | ${failed} |`;
  });
  const apiRows = results.flatMap((result) =>
    result.apiStatuses.map((api) => `| ${result.id} | ${result.category} | ${api.label} | ${api.status} | ${api.responseStatus ?? ""} |`)
  );
  const failureRows = failures.length
    ? failures.map((result) => {
        const evidence = result.runtimeEvents
          .filter((event) => ["pageerror", "badresponse", "requestfailed"].includes(event.kind))
          .slice(-2)
          .map((event) => `${event.kind}: ${event.message}`)
          .join(" / ");
        return `| ${result.id} | ${result.project} | ${result.category} | ${result.variant} | ${[result.error ?? result.fatalEvents.map((event) => event.message).join("; "), evidence].filter(Boolean).join(" / ")} |`;
      })
    : ["| None | - | - | - | - |"];
  const canvasFailures = results.filter((result) => /canvas|toDataURL|toBeGreaterThan/i.test(result.error ?? ""));
  const completionRecoveryVariants = new Set(["completion-500", "completion-retry"]);
  const completionRecoveryResults = results.filter((result) => completionRecoveryVariants.has(result.variant));
  const completionRecoveryFailures = completionRecoveryResults.filter((result) => result.status === "failed");
  const completionRecoveryStatus = completionRecoveryResults.length === 0
    ? "not covered in this run"
    : completionRecoveryFailures.length
      ? "failed in completion API failure/retry scenarios"
      : "passed in covered completion API failure/retry scenarios";

  return [
    "# Fishing Master Adventure QA Report",
    "",
    `- Report date: ${payload.reportDate}`,
    `- Generated at: ${payload.generatedAt}`,
    "- Session: S11 QA and release quality",
    "- Scope: /student/practice/games/fishing-master, Fishing Master gameplay, reward API, runtime diagnostics",
    `- Aggregate runs: ${payload.actualRunsInAggregate}/${payload.expectedRunsForFullDesktopMobileCommand}`,
    `- Result: ${failures.length ? "Failed - review findings below" : "Passed in covered runs"}`,
    "",
    "## Summary",
    "",
    `This adventure run executed ${results.length} local isolated Fishing Master checks across desktop/mobile project slices. It uses temporary students and the isolated database only; no production users or live provider calls are touched.`,
    "",
    "## Category Results",
    "",
    "| Category | Runs | Passed | Failed |",
    "| --- | ---: | ---: | ---: |",
    ...categoryRows,
    "",
    "## API Status Evidence",
    "",
    apiRows.length ? "| Run | Category | Check | HTTP | Response status |\n| --- | --- | --- | ---: | --- |\n" + apiRows.join("\n") : "No direct completion API checks were recorded.",
    "",
    "## Failures",
    "",
    "| Run | Project | Category | Variant | Error |",
    "| --- | --- | --- | --- | --- |",
    ...failureRows,
    "",
    "## Acceptance Criteria",
    "",
    `- 100-run target: ${results.length >= 100 ? "met" : "not met in current aggregate; run both desktop and mobile projects together"}.`,
    `- Fatal runtime errors: ${results.some((result) => result.fatalEvents.length) ? "found" : "none found"}.`,
    `- Illegal API payloads: ${results.some((result) => result.category === "api-adversarial" && result.status === "failed") ? "one or more failed expectations" : "returned expected guarded statuses in covered runs"}.`,
    `- Canvas checks: ${canvasFailures.length ? "one or more canvas checks failed" : "nonblank in covered playable runs"}.`,
    `- Network completion recovery: ${completionRecoveryStatus}.`,
    "",
    "## Follow-up",
    "",
    failures.length
      ? "S20 should review gameplay failures after S11 confirms they reproduce outside the stress harness. S12 should review reward/API failures. S01/S20 should review mobile immersive layout failures."
      : "No P0/P1 Fishing Master issue was found by this adventure harness in the covered local isolated runs."
  ].join("\n");
}

test.describe.serial("Fishing Master 100-run adventure stress QA", () => {
  test("runs the assigned Fishing Master adventure slice and writes QA report", async ({ page }, testInfo) => {
    const specs = scenarioSpecsForProject(testInfo.project.name);
    expect(specs).toHaveLength(testInfo.project.name === "mobile-chrome" ? 10 : 90);

    const app = await startIsolatedApp(`fishing-master-adventure-${testInfo.project.name}`, testInfo, fishingAppOptions);
    const diagnostics = attachFishingRuntimeDiagnostics(page);
    const results: AdventureResult[] = [];

    try {
      for (const spec of specs) {
        results.push(await executeScenario(spec, { app, page, testInfo, diagnostics }));
      }
    } finally {
      const { resultsPath, reportPath } = mergeAndWriteReport(testInfo.project.name, results);
      await testInfo.attach("fishing-master-adventure-results-path.txt", {
        body: `${resultsPath}\n${reportPath}\n`,
        contentType: "text/plain"
      });
      await diagnostics.attach(testInfo);
      await app.attachLogs(testInfo);
      await app.stop();
    }

    const failures = results.filter((result) => result.status === "failed");
    expect(failures.map((failure) => `${failure.id} ${failure.variant}: ${failure.error ?? failure.fatalEvents.map((event) => event.message).join("; ")}`)).toEqual([]);
  });
});
