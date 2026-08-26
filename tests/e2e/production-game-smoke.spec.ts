import { expect, test, type APIResponse, type Locator, type Page, type Request as PlaywrightRequest, type Response as PlaywrightResponse, type TestInfo } from "@playwright/test";
import { questions } from "../../data/questions";
import { uniqueSuffix } from "./helpers";

type AuthenticatedResponse = {
  user: {
    id: string;
    username?: string;
  };
};

type PublicQuestionSummary = {
  id: string;
  topicId?: string;
};

type QuestionPayload = {
  questions: PublicQuestionSummary[];
};

type AttemptFeedback = {
  correct: boolean;
};

type GamificationSummaryPayload = {
  gamification: {
    xp: number;
    rewardSummary: {
      available: number;
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
  gamification: GamificationSummaryPayload["gamification"] | null;
};

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
  gamification: (GamificationSummaryPayload["gamification"] & {
    earnedBadges?: Array<{ id: string }>;
  }) | null;
};

type SmokeStudent = {
  username: string;
  password: string;
  grade: string;
  userId: string;
  suffix: string;
};

type BrowserFetchOptions = {
  method?: "GET" | "POST";
  data?: unknown;
  headers?: Record<string, string>;
  expectedStatus?: number;
};

const productionSmokeEnabled = process.env.PRODUCTION_GAME_SMOKE === "1";
const expectedProductionOrigin = "https://www.mais.hk";
const fishingRoundStorageKey = "hk-math-practice-fishing-round";
const answerByQuestionId = new Map(questions.map((question) => [question.id, question.answer]));
const fatalRuntimePattern = /Application error|ChunkLoadError|Loading chunk \d+ failed|\/_next\/static\/chunks\/app\/student\/practice\/games/i;

test.setTimeout(180_000);
test.use({ trace: "off", video: "off", screenshot: "off" });

async function readJson<T>(response: APIResponse | PlaywrightResponse, expectedStatus = 200) {
  const body = await response.text();
  expect(response.status(), body).toBe(expectedStatus);
  return JSON.parse(body) as T;
}

function sanitizedErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .split("\n")[0]
    .replace(/hk_math_session=[^\s;]+/g, "hk_math_session=[redacted]")
    .replace(/password[\"'\s:=]+[^,\"'\s}]+/gi, "password=[redacted]");
}

async function requestWithRetries(
  page: Page,
  method: "GET" | "POST",
  url: string,
  options: Parameters<Page["request"]["get"]>[1] & Parameters<Page["request"]["post"]>[1] = {},
  attempts = 3
) {
  let lastError = "";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = method === "GET"
        ? await page.request.get(url, options)
        : await page.request.post(url, options);

      if (response.status() >= 500 && attempt < attempts - 1) {
        lastError = `${response.status()} ${url}`;
        await page.waitForTimeout(1200 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      lastError = sanitizedErrorMessage(error);
      if (attempt < attempts - 1) {
        await page.waitForTimeout(1200 * (attempt + 1));
        continue;
      }
    }
  }

  throw new Error(`${method} ${url} failed after ${attempts} attempt(s): ${lastError}`);
}

function escapedAnswerPattern(answer: string) {
  return new RegExp(answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*"), "i");
}

function smokeSuffix(testInfo: TestInfo, label: string) {
  return `${label}-${uniqueSuffix(testInfo)}`
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 40);
}

function smokePassword() {
  return `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function attachProductionRuntimeDiagnostics(page: Page, routePaths: string[], apiPaths: string[] = []) {
  const events: string[] = [];
  const requestStarts = new WeakMap<PlaywrightRequest, number>();

  const record = (kind: string, message: string) => {
    events.push(`[${new Date().toISOString()}] ${kind}: ${message}`);
  };

  const relevantUrlKind = (url: string) => {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/_next/static/")) return "static";
      if (routePaths.some((routePath) => parsed.pathname.startsWith(routePath))) return "route";
      if (apiPaths.some((apiPath) => parsed.pathname.startsWith(apiPath))) return "api";
      return null;
    } catch {
      if (url.includes("/_next/static/")) return "static";
      if (routePaths.some((routePath) => url.includes(routePath))) return "route";
      if (apiPaths.some((apiPath) => url.includes(apiPath))) return "api";
      return null;
    }
  };

  const relevantUrl = (url: string) => Boolean(relevantUrlKind(url));

  page.on("request", (request) => {
    if (relevantUrl(request.url())) {
      requestStarts.set(request, Date.now());
    }
  });

  page.on("pageerror", (error) => {
    record("pageerror", error.message);
  });

  page.on("console", (message) => {
    const text = message.text();
    if (["error", "warning"].includes(message.type()) || fatalRuntimePattern.test(text)) {
      record(`console:${message.type()}`, text);
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (relevantUrl(url)) {
      record("requestfailed", `${request.method()} ${url} ${request.failure()?.errorText ?? "unknown failure"}`);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    const kind = relevantUrlKind(url);
    if (kind === "api") {
      const elapsedMs = Date.now() - (requestStarts.get(response.request()) ?? Date.now());
      const parsed = new URL(url);
      record("apiresponse", `${response.status()} ${response.request().method()} ${parsed.pathname}${parsed.search} ${elapsedMs}ms`);
      return;
    }
    if (kind && response.status() >= 400) {
      record("badresponse", `${response.status()} ${url}`);
    }
  });

  return {
    async attach(testInfo: TestInfo) {
      if (!events.length) return;
      await testInfo.attach("production-game-runtime-diagnostics.log", {
        body: events.join("\n"),
        contentType: "text/plain"
      });
    },
    expectClean() {
      const fatalEvents = events.filter((event) => fatalRuntimePattern.test(event));
      expect(fatalEvents, fatalEvents.join("\n")).toEqual([]);

      const failedStaticChunks = events.filter((event) =>
        event.includes("/_next/static/") &&
        (event.includes("badresponse") || event.includes("requestfailed"))
      );
      expect(failedStaticChunks, failedStaticChunks.join("\n")).toEqual([]);

      const failedRouteRequests = events.filter((event) =>
        routePaths.some((routePath) => event.includes(routePath)) &&
        (event.includes("badresponse") || event.includes("requestfailed"))
      );
      expect(failedRouteRequests, failedRouteRequests.join("\n")).toEqual([]);
    }
  };
}

async function browserFetchJson<T>(
  page: Page,
  url: string,
  { method = "GET", data, headers = {}, expectedStatus = 200 }: BrowserFetchOptions = {}
) {
  const result = await page.evaluate(async ({ requestUrl, requestMethod, requestData, requestHeaders }) => {
    const response = await fetch(requestUrl, {
      method: requestMethod,
      credentials: "same-origin",
      headers: {
        ...(requestData === undefined ? {} : { "Content-Type": "application/json" }),
        ...requestHeaders
      },
      body: requestData === undefined ? undefined : JSON.stringify(requestData)
    });
    const bodyText = await response.text();
    let json: unknown = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      json = null;
    }
    return {
      status: response.status,
      bodyText,
      json
    };
  }, {
    requestUrl: url,
    requestMethod: method,
    requestData: data,
    requestHeaders: headers
  });

  expect(result.status, result.bodyText.slice(0, 1000)).toBe(expectedStatus);
  return result.json as T;
}

async function expectBrowserSession(page: Page, student: SmokeStudent) {
  const session = await browserFetchJson<AuthenticatedResponse>(page, "/api/me");
  expect(session.user.id).toBe(student.userId);
  expect(session.user.username).toBe(student.username);
}

async function expectAdventureEligibilityReady(page: Page) {
  let latest: AdventureIslandEligibility | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    latest = await browserFetchJson<AdventureIslandEligibility>(page, "/api/gamification/adventure-island");
    expect(latest).toMatchObject({
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
  }

  return latest;
}

async function registerSmokeStudent(page: Page, testInfo: TestInfo, label: string, grade: string) {
  const suffix = smokeSuffix(testInfo, label);
  const password = smokePassword();
  let lastBody = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const username = `smoke-${suffix}-${attempt}@example.test`;
    const response = await requestWithRetries(page, "POST", "/api/auth/register", {
      data: {
        name: `Smoke ${label} ${suffix}`,
        username,
        password,
        grade,
        curriculumTrack: "HK",
        language: "en",
        theme: "dark"
      }
    });
    lastBody = await response.text();

    if (response.ok()) {
      const session = JSON.parse(lastBody) as AuthenticatedResponse;
      return { username, password, grade, userId: session.user.id, suffix };
    }

    await page.waitForTimeout(1000);
  }

  expect(false, lastBody).toBeTruthy();
  throw new Error(`Could not register ${label} production smoke student.`);
}

async function gotoWithRetries(page: Page, url: string, attempts = 3) {
  let lastError = "";

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = sanitizedErrorMessage(error);
      if (attempt < attempts - 1) await page.waitForTimeout(1200 * (attempt + 1));
    }
  }

  throw new Error(`Could not open ${url} after ${attempts} attempt(s): ${lastError}`);
}

async function loginThroughBrowser(page: Page, student: SmokeStudent) {
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.context().clearCookies();
    await gotoWithRetries(page, "/login");
    const usernameInput = page.locator('input[autocomplete="username"]').first();
    const passwordInput = page.locator('input[autocomplete="current-password"]').first();
    await usernameInput.fill(student.username);
    await passwordInput.fill(student.password);
    await expect(usernameInput).toHaveValue(student.username);
    await expect(passwordInput).toHaveValue(student.password);
    await page.getByRole("radio", { name: new RegExp(`\\b${student.grade}\\b`, "i") }).first().click();

    try {
      const loginResponsePromise = page.waitForResponse((response) =>
        response.url().endsWith("/api/auth/login") &&
        response.request().method() === "POST"
      );
      await page.getByRole("button", { name: /^log in$/i }).click();
      const loginResponse = await loginResponsePromise;
      if (loginResponse.status() === 200) {
        const session = await loginResponse.json().catch(() => null) as { user?: { username?: unknown } } | null;
        if (session?.user?.username !== student.username) {
          lastError = "UI login returned a different user than the smoke account";
          await passwordInput.fill("");
          if (attempt < 2) await page.waitForTimeout(1200 * (attempt + 1));
          continue;
        }
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
        return;
      }
      lastError = `UI login returned HTTP ${loginResponse.status()}`;
    } catch (error) {
      lastError = sanitizedErrorMessage(error);
    }

    await passwordInput.fill("").catch(() => undefined);
    if (attempt < 2) await page.waitForTimeout(1200 * (attempt + 1));
  }

  throw new Error(`Could not log in production smoke student through browser after 3 attempt(s): ${lastError}`);
}

async function fetchAnsweredQuestions(page: Page, query: string, count: number) {
  const payload = await readJson<QuestionPayload>(await requestWithRetries(page, "GET", `/api/questions?${query}`));
  const answeredQuestions = payload.questions.filter((question) => answerByQuestionId.has(question.id));
  expect(answeredQuestions.length).toBeGreaterThanOrEqual(count);
  return answeredQuestions.slice(0, count);
}

async function submitCorrectAttempts(page: Page, questionsToSubmit: PublicQuestionSummary[], expectedUserId: string) {
  for (const question of questionsToSubmit) {
    const selectedAnswer = answerByQuestionId.get(question.id);
    expect(selectedAnswer, `Missing local answer for production question ${question.id}`).toBeTruthy();

    const response = await requestWithRetries(page, "POST", "/api/attempts", {
      headers: { "X-MAIS-Expected-User-Id": expectedUserId },
      data: {
        expectedUserId,
        questionId: question.id,
        selectedAnswer,
        durationSeconds: 12
      }
    });
    const feedback = await readJson<AttemptFeedback>(response);
    expect(feedback.correct).toBeTruthy();
  }
}

async function answerVisibleQuestion(page: Page, scope: Locator) {
  const card = scope.locator("article:visible").first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  const questionId = await card.getAttribute("data-question-id");
  expect(questionId).toBeTruthy();
  const answer = answerByQuestionId.get(questionId ?? "");
  expect(answer, `Missing local answer for challenge question ${questionId}`).toBeTruthy();

  const textbox = card.getByRole("textbox").first();
  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(answer ?? "");
  } else {
    await card.getByRole("button", { name: escapedAnswerPattern(answer ?? "") }).first().click();
  }

  const attemptResponse = page.waitForResponse((response) =>
    response.url().includes("/api/attempts") &&
    response.request().method() === "POST"
  );
  await expect(card.getByRole("button", { name: /Check Answer/i })).toBeEnabled();
  await card.getByRole("button", { name: /Check Answer/i }).click();
  const feedback = await readJson<AttemptFeedback>(await attemptResponse);
  expect(feedback.correct).toBeTruthy();
}

async function expectCanvasNonBlank(page: Page, testInfo: TestInfo, attachmentName: string) {
  const canvas = page.locator("canvas").first();
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const dataUrlLength = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL("image/png").length);
  expect(dataUrlLength).toBeGreaterThan(1000);
  await testInfo.attach(`${attachmentName}.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
}

async function expectNoRuntimeErrorCopy(page: Page) {
  await expect(page.getByText(/Application error|ChunkLoadError|Loading chunk \d+ failed/i)).toHaveCount(0);
}

async function assertProductionTarget(baseURL: string | undefined) {
  expect(process.env.PLAYWRIGHT_SKIP_WEBSERVER).toBe("1");
  expect(baseURL).toBeTruthy();
  const target = new URL(baseURL ?? "");
  const expected = new URL(expectedProductionOrigin);
  expect(target.protocol).toBe(expected.protocol);
  expect(target.host).toBe(expected.host);
}

test.describe("Vercel Production authenticated game smoke", () => {
  test.skip(!productionSmokeEnabled, "Set PRODUCTION_GAME_SMOKE=1 to run production-writing game smoke tests.");

  test.beforeEach(async ({ baseURL }) => {
    await assertProductionTarget(baseURL);
  });

  test("Fishing Game authenticates, renders gameplay, answers one challenge, and awards once", async ({ page }, testInfo) => {
    const diagnostics = attachProductionRuntimeDiagnostics(page, ["/student/practice/games/fishing-master", "/practice/fishing-game"], [
      "/api/me",
      "/api/questions",
      "/api/attempts",
      "/api/gamification/summary",
      "/api/gamification/fishing-game/complete"
    ]);
    const student = await registerSmokeStudent(page, testInfo, "fishing-s3", "S3");
    const roundQuestions = await fetchAnsweredQuestions(page, "grade=S3&topicId=quadratic-patterns", 5);
    await submitCorrectAttempts(page, roundQuestions, student.userId);

    try {
      await loginThroughBrowser(page, student);
      await expectBrowserSession(page, student);

      const legacyRoute = await requestWithRetries(page, "GET", "/practice/fishing-game", { maxRedirects: 0 });
      expect([307, 308]).toContain(legacyRoute.status());
      expect(legacyRoute.headers().location ?? "").toContain("/student/practice/games/fishing-master");

      await page.evaluate(({ key, payload }) => {
        window.sessionStorage.setItem(key, JSON.stringify(payload));
      }, {
        key: fishingRoundStorageKey,
        payload: {
          topicId: "quadratic-patterns",
          roundQuestionIds: roundQuestions.map((question) => question.id),
          correctRoundQuestionIds: roundQuestions.map((question) => question.id),
          accuracyPercent: 100,
          roundKey: `production-ui-fishing-${student.suffix}`
        }
      });

      await page.goto("/student/practice/games/fishing-master", { waitUntil: "domcontentloaded" });
      await expectNoRuntimeErrorCopy(page);
      await expect(page.getByRole("heading", { name: /Math Fishing Challenge/i })).toBeVisible({ timeout: 20_000 });
      const stage = page.getByTestId("fishing-game-stage");
      await expect(stage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-nets", "10");
      await expect(stage).toHaveAttribute("data-coins", "0");
      await expect(stage).toHaveAttribute("data-fish-count", /\d+/, { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-creature-names", /Stingray/, { timeout: 20_000 });

      await page.getByTestId("fishing-start-button").click();
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expectCanvasNonBlank(page, testInfo, "production-fishing-game-stage");

      await page.getByRole("button", { name: /Fire net/i }).click();
      await expect(stage).toHaveAttribute("data-last-cast", "hit", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-phase", "challenge", { timeout: 10_000 });
      await answerVisibleQuestion(page, page.getByTestId("fishing-challenge"));
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-coins", "1", { timeout: 10_000 });
      await expect(stage).toHaveAttribute("data-nets", "9");

      const beforeSummary = await browserFetchJson<GamificationSummaryPayload>(page, "/api/gamification/summary");
      const apiRoundKey = `production-api-fishing-${student.suffix}`;
      const completion = await browserFetchJson<FishingCompletion>(page, "/api/gamification/fishing-game/complete", {
        method: "POST",
        expectedStatus: 201,
        data: {
          topicId: "quadratic-patterns",
          roundQuestionIds: roundQuestions.map((question) => question.id),
          correctRoundQuestionIds: roundQuestions.map((question) => question.id),
          caughtQuestionIds: roundQuestions.slice(0, 2).map((question) => question.id),
          correctCaughtQuestionIds: roundQuestions.slice(0, 2).map((question) => question.id),
          coins: 2,
          netsUsed: 2,
          durationSeconds: 60,
          roundKey: apiRoundKey
        }
      });
      expect(completion.status).toBe("awarded");
      expect(completion.reward).toMatchObject({ xp: 6, rewardPoints: 6 });
      expect(completion.gamification?.xp).toBe(beforeSummary.gamification.xp + 6);
      expect(completion.gamification?.rewardSummary.available).toBe(beforeSummary.gamification.rewardSummary.available + 6);

      const duplicate = await browserFetchJson<FishingCompletion>(page, "/api/gamification/fishing-game/complete", {
        method: "POST",
        expectedStatus: 409,
        data: {
          topicId: "quadratic-patterns",
          roundQuestionIds: roundQuestions.map((question) => question.id),
          correctRoundQuestionIds: roundQuestions.map((question) => question.id),
          caughtQuestionIds: roundQuestions.slice(0, 2).map((question) => question.id),
          correctCaughtQuestionIds: roundQuestions.slice(0, 2).map((question) => question.id),
          coins: 2,
          netsUsed: 2,
          durationSeconds: 60,
          roundKey: apiRoundKey
        }
      });
      expect(duplicate.status).toBe("duplicate");
      expect(duplicate.reward).toMatchObject({ xp: 0, rewardPoints: 0 });
      const afterDuplicateSummary = await browserFetchJson<GamificationSummaryPayload>(page, "/api/gamification/summary");
      expect(afterDuplicateSummary.gamification.xp).toBe(completion.gamification?.xp);
      expect(afterDuplicateSummary.gamification.rewardSummary.available).toBe(completion.gamification?.rewardSummary.available);
      diagnostics.expectClean();
    } finally {
      await diagnostics.attach(testInfo);
    }
  });

  test("Adventure Island authenticates, renders gameplay, redirects legacy route, and awards once", async ({ page }, testInfo) => {
    const diagnostics = attachProductionRuntimeDiagnostics(page, ["/student/practice/games/adventure-island", "/practice/adventure-island", "/practice/super-platformer-like"], [
      "/api/me",
      "/api/questions",
      "/api/attempts",
      "/api/gamification/summary",
      "/api/gamification/adventure-island"
    ]);
    const student = await registerSmokeStudent(page, testInfo, "adventure-p5", "P5");
    const gradeQuestions = await fetchAnsweredQuestions(page, "grade=P5", 5);
    await submitCorrectAttempts(page, gradeQuestions, student.userId);

    try {
      await loginThroughBrowser(page, student);
      await expectBrowserSession(page, student);

      for (const legacyPath of ["/practice/adventure-island", "/practice/super-platformer-like"]) {
        const legacyRoute = await requestWithRetries(page, "GET", legacyPath, { maxRedirects: 0 });
        expect([307, 308]).toContain(legacyRoute.status());
        expect(legacyRoute.headers().location ?? "").toContain("/student/practice/games/adventure-island");
      }

      await expectAdventureEligibilityReady(page);

      await page.goto("/student/practice/games/adventure-island", { waitUntil: "domcontentloaded" });
      await expectNoRuntimeErrorCopy(page);
      await expect(page.getByRole("heading", { name: /P5 Practice Quest/i })).toBeVisible({ timeout: 20_000 });
      const stage = page.getByTestId("adventure-island-stage");
      await expect(stage).toHaveAttribute("data-phase", "welcome", { timeout: 20_000 });
      await expect(page.getByTestId("adventure-island-welcome")).toBeVisible();

      await page.getByTestId("adventure-island-start-button").click();
      await expect(stage).toHaveAttribute("data-phase", "ready", { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-player-x", /\d+/, { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-lives", "2", { timeout: 20_000 });
      await expect(stage).toHaveAttribute("data-snail1-x", /\d+/, { timeout: 10_000 });
      await expectCanvasNonBlank(page, testInfo, "production-adventure-island-stage");

      const startX = Number(await stage.getAttribute("data-player-x"));
      if (testInfo.project.name === "mobile-chrome") {
        await page.getByRole("button", { name: /Move right/i }).first().click();
        await page.waitForTimeout(700);
      } else {
        await page.keyboard.down("ArrowRight");
        await page.waitForTimeout(700);
        await page.keyboard.up("ArrowRight");
      }
      await expect.poll(async () => Number(await stage.getAttribute("data-player-x")), { timeout: 8_000 }).toBeGreaterThan(startX);

      const beforeSummary = await browserFetchJson<GamificationSummaryPayload>(page, "/api/gamification/summary");
      const completion = await browserFetchJson<AdventureIslandCompletion>(page, "/api/gamification/adventure-island", {
        method: "POST",
        expectedStatus: 201,
        data: {
          correctQuestionIds: gradeQuestions.slice(0, 3).map((question) => question.id),
          durationSeconds: 75,
          defeatedEnemies: 3
        }
      });
      expect(completion.status).toBe("awarded");
      expect(completion.reward).toMatchObject({ xp: 35, rewardPoints: 35 });
      expect(completion.gamification?.xp).toBe(beforeSummary.gamification.xp + 35);
      expect(completion.gamification?.rewardSummary.available).toBe(beforeSummary.gamification.rewardSummary.available + 35);

      const duplicate = await browserFetchJson<AdventureIslandCompletion>(page, "/api/gamification/adventure-island", {
        method: "POST",
        expectedStatus: 409,
        data: {
          correctQuestionIds: gradeQuestions.slice(0, 3).map((question) => question.id),
          durationSeconds: 75,
          defeatedEnemies: 3
        }
      });
      expect(duplicate.status).toBe("duplicate");
      expect(duplicate.reward).toMatchObject({ xp: 0, rewardPoints: 0 });
      const afterDuplicateSummary = await browserFetchJson<GamificationSummaryPayload>(page, "/api/gamification/summary");
      expect(afterDuplicateSummary.gamification.xp).toBe(completion.gamification?.xp);
      expect(afterDuplicateSummary.gamification.rewardSummary.available).toBe(completion.gamification?.rewardSummary.available);
      diagnostics.expectClean();
    } finally {
      await diagnostics.attach(testInfo);
    }
  });
});
