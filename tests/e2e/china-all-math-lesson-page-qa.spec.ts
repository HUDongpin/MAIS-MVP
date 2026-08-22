import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo
} from "@playwright/test";
import { toPlainMathText } from "../../components/math/MathText";
import { curriculumProfileForPublisher, curriculumProfileForTrack } from "../../lib/curriculumProfile";
import { lessonSlugForTopicId, studentLessonsPath } from "../../lib/lessonLinks";
import {
  pagePayload,
  reviewPages,
  type ReviewLanguage,
  type ReviewPage
} from "../../scripts/review-china-lesson-page-content";
import type {
  CurriculumProfile,
  GradeId,
  Language,
  PublicQuestion
} from "../../types";

const expectedScopeCounts = {
  "hong-kong": 49,
  "pep-primary": 24,
  "pep-junior": 11,
  "pep-high": 22,
  "bnu-primary": 97,
  "bnu-junior": 35,
  "bnu-high": 24,
  "hjb-primary": 70,
  "hjb-junior": 22,
  "hjb-high": 30
} as const;

type ChinaScope = keyof typeof expectedScopeCounts;
type RunMode = "structure" | "full";

type DisplayedPracticePayload = {
  id: string;
  type: PublicQuestion["type"];
  prompt: string;
  options: string[];
  correctAnswerShownAfterWrongAttempt: string | null;
  explanationShownAfterAttempt: string;
  gradingSemantics: {
    runtimeSelectionChecks: Array<{
      optionIndex: number;
      displayedOption: string;
      submittedOptionValue: string;
      acceptedByProductionGrader: boolean;
    }>;
    acceptedDisplayedOptionIndexes: number[];
    acceptedDisplayedOptionCount: number;
  };
};

type LessonReviewPayload = {
  lessonPage: {
    title: string;
  };
  displayedPractice: DisplayedPracticePayload[];
};

type LessonApiPayload = {
  access?: string;
  lesson?: {
    slug?: string;
    topicId?: string;
    grade?: GradeId;
    curriculumProfile?: CurriculumProfile;
    practiceQuestions?: Array<{
      id?: string;
      diagram?: unknown;
      questionAssets?: Array<{ kind?: string; src?: string }>;
    }>;
    blocks?: Array<{
      type?: string;
      visualizationConfig?: { moduleId?: string };
      illustrations?: Array<{ src?: string }>;
    }>;
  };
};

type BrowserCase = {
  inventoryIndex: number;
  language: ReviewLanguage;
  page: ReviewPage;
  payload: LessonReviewPayload;
};

type QaAccount = {
  password: string;
  username: string;
};

type BrowserDiagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  requestFailures: string[];
  sameOriginHttpErrors: string[];
};

const expectedChinaLessonPageCount = 384;
const expectedPracticeCount = 5;
const basePages = reviewPages("zhHans");
const runMode = parseRunMode(process.env.CHINA_LESSON_QA_MODE);
const requestedLanguages = parseCsvFilter(
  "CHINA_LESSON_QA_LANGUAGES",
  process.env.CHINA_LESSON_QA_LANGUAGES,
  ["en", "zh", "zhHans"] as const
);
const requestedScopes = parseCsvFilter(
  "CHINA_LESSON_QA_SCOPES",
  process.env.CHINA_LESSON_QA_SCOPES,
  Object.keys(expectedScopeCounts) as ChinaScope[]
);
const requestedTopicIds = parseOptionalCsv(process.env.CHINA_LESSON_QA_TOPIC_IDS);
const knownTopicIds = new Set(basePages.map((page) => page.topic.id));
const unknownTopicIds = [...requestedTopicIds].filter((topicId) => !knownTopicIds.has(topicId));
if (unknownTopicIds.length) {
  throw new Error(`CHINA_LESSON_QA_TOPIC_IDS contains unknown China topic ids: ${unknownTopicIds.join(", ")}`);
}

const selectedPages = basePages.filter((page) =>
  requestedScopes.includes(page.scope as ChinaScope) &&
  (requestedTopicIds.size === 0 || requestedTopicIds.has(page.topic.id))
);
if (!selectedPages.length) throw new Error("China lesson browser QA filters selected zero pages.");

const selectedCases: BrowserCase[] = requestedLanguages.flatMap((language) =>
  selectedPages.map((page) => ({
    inventoryIndex: basePages.indexOf(page),
    language,
    page,
    payload: (language === "zhHans"
      ? page.payload
      : pagePayload(page.topic, page.seed, page.practice, language)) as unknown as LessonReviewPayload
  }))
);

const accountCache = new Map<string, QaAccount>();
const forbiddenRenderedCopyPatterns = [
  /\bundefined\b/i,
  /\bNaN\b/i,
  /\bTODO\b/i,
  /\bFIXME\b/i,
  /\[object Object\]/i,
  /\bterm-[a-z0-9][a-z0-9-]*\b/i,
  /source locator|scan artifact|screenshot artifact/i,
  /\b(?:contentHash|reviewContractVersion|gradingSemantics|storedAnswer|acceptedAnswers|practiceQuestionIds|idSuffix|zhHans)\b/,
  /\b(?:API_KEY|AUTH_SESSION_SECRET|NEXTAUTH_SECRET|BEGIN PRIVATE KEY)\b/i
] as const;
const englishCjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/u;
const correctFeedbackPattern = /Correct - nice reasoning\.|正確 - 推理清晰。|正确 - 推理清晰。/i;
const checkAnswerPattern = /^(?:Check Answer|檢查答案|检查答案)$/i;

function parseRunMode(raw: string | undefined): RunMode {
  if (!raw) return "full";
  if (raw === "structure" || raw === "full") return raw;
  throw new Error("CHINA_LESSON_QA_MODE must be structure or full.");
}

function parseOptionalCsv(raw: string | undefined) {
  return new Set((raw ?? "").split(",").map((value) => value.trim()).filter(Boolean));
}

function parseCsvFilter<const T extends string>(name: string, raw: string | undefined, allowed: readonly T[]) {
  if (!raw?.trim()) return [...allowed];
  const values = [...parseOptionalCsv(raw)];
  const unknown = values.filter((value) => !allowed.includes(value as T));
  if (unknown.length) throw new Error(`${name} contains unsupported values: ${unknown.join(", ")}`);
  return values as T[];
}

function runtimeLanguage(language: ReviewLanguage): Language {
  return language === "zhHans" ? "zh-Hans" : language;
}

function curriculumProfileForPage(page: ReviewPage) {
  return page.topic.publisher
    ? curriculumProfileForPublisher(page.topic.publisher)
    : curriculumProfileForTrack(page.topic.curriculumTrack);
}

function cssAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stableSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function expectedRoute(reviewPage: ReviewPage) {
  return `${studentLessonsPath}/${encodeURIComponent(lessonSlugForTopicId(reviewPage.topic.id))}`;
}

function comparableOptionLabel(value: string) {
  return toPlainMathText(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\,/g, "")
    .replace(/[{}$\\\s]/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/[·×*]/g, "×")
    .replace(/\b(?:times|multipliedby)\b/g, "×")
    .replace(/\bdividedby\b/g, "/")
    .trim();
}

function isExpectedNextPrefetchCancellation(url: URL, errorText: string | undefined) {
  return errorText === "net::ERR_ABORTED" && url.searchParams.has("_rsc");
}

function diagnosticsForPage(page: Page): BrowserDiagnostics {
  const diagnostics: BrowserDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    sameOriginHttpErrors: []
  };
  const configuredBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${Number(process.env.PLAYWRIGHT_PORT ?? 3020)}`;
  const expectedOrigin = new URL(configuredBaseUrl).origin;

  page.on("pageerror", (error) => diagnostics.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin !== expectedOrigin || response.status() < 400) return;
    diagnostics.sameOriginHttpErrors.push(`${response.status()} ${response.request().method()} ${url.pathname}${url.search}`);
  });
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    if (url.origin !== expectedOrigin) return;
    const errorText = request.failure()?.errorText;
    if (isExpectedNextPrefetchCancellation(url, errorText)) return;
    diagnostics.requestFailures.push(`${request.method()} ${url.pathname}${url.search}: ${errorText ?? "unknown"}`);
  });
  return diagnostics;
}

async function attachDiagnostics(testInfo: TestInfo, diagnostics: BrowserDiagnostics) {
  if (!Object.values(diagnostics).some((values) => values.length)) return;
  await testInfo.attach("china-lesson-browser-diagnostics.json", {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: "application/json"
  });
}

async function expectNoBrowserDiagnostics(diagnostics: BrowserDiagnostics) {
  expect.soft(diagnostics.pageErrors, "no uncaught page errors").toEqual([]);
  expect.soft(diagnostics.consoleErrors, "no browser console errors").toEqual([]);
  expect.soft(diagnostics.requestFailures, "no failed same-origin requests").toEqual([]);
  expect.soft(diagnostics.sameOriginHttpErrors, "no same-origin HTTP error responses").toEqual([]);
}

async function authenticateForCase(page: Page, browserCase: BrowserCase, testInfo: TestInfo) {
  const language = runtimeLanguage(browserCase.language);
  const profile = curriculumProfileForPage(browserCase.page);
  const accountKey = [profile.publisher, browserCase.page.topic.grade, language, testInfo.project.name, testInfo.workerIndex].join(":");
  let account = accountCache.get(accountKey);

  if (!account) {
    const suffix = stableSlug([
      profile.publisher,
      browserCase.page.topic.grade,
      language,
      testInfo.project.name,
      testInfo.workerIndex,
      process.pid,
      Date.now()
    ].join("-"));
    account = {
      username: `china-lesson-browser-${suffix}@example.test`,
      password: "lesson-browser-qa-12345"
    };
    const register = await page.request.post("/api/auth/register", {
      data: {
        name: `China Lesson Browser QA ${profile.publisher} ${browserCase.page.topic.grade}`,
        username: account.username,
        email: account.username,
        password: account.password,
        grade: browserCase.page.topic.grade,
        curriculumTrack: browserCase.page.topic.curriculumTrack,
        curriculumProfile: profile,
        language,
        theme: "light"
      }
    });
    expect(register.status(), await register.text()).toBe(200);
    accountCache.set(accountKey, account);
  } else {
    const login = await page.request.post("/api/auth/login", {
      data: {
        username: account.username,
        password: account.password,
        grade: browserCase.page.topic.grade,
        curriculumTrack: browserCase.page.topic.curriculumTrack,
        curriculumProfile: profile,
        language,
        theme: "light"
      }
    });
    expect(login.status(), await login.text()).toBe(200);
  }

  const settings = await page.request.patch("/api/me/settings", {
    data: {
      language,
      theme: "light",
      selectedGrade: browserCase.page.topic.grade
    }
  });
  expect(settings.status(), await settings.text()).toBe(200);
  const settingsBody = await settings.json() as { settings?: { language?: string } };
  expect(settingsBody.settings?.language).toBe(language);

  const learnerProfile = await page.request.patch("/api/me/learner-profile", {
    data: {
      status: "skipped",
      answers: { goal: "repair", challenge: "balanced", help: "hint" }
    }
  });
  expect(learnerProfile.ok(), await learnerProfile.text()).toBe(true);
}

async function readFullLesson(page: Page, browserCase: BrowserCase) {
  const slug = lessonSlugForTopicId(browserCase.page.topic.id);
  const response = await page.request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  expect(response.status(), await response.text()).toBe(200);
  const body = await response.json() as LessonApiPayload;
  expect(body.access).toBe("full");
  expect(body.lesson?.slug).toBe(slug);
  expect(body.lesson?.topicId).toBe(browserCase.page.topic.id);
  expect(body.lesson?.grade).toBe(browserCase.page.topic.grade);
  expect(body.lesson?.curriculumProfile).toMatchObject(curriculumProfileForPage(browserCase.page));
  const apiQuestionIds = new Set((body.lesson?.practiceQuestions ?? []).map((question) => question.id));
  browserCase.page.practice.forEach((question) => {
    expect(apiQuestionIds.has(question.id), `${slug} API includes displayed question ${question.id}`).toBe(true);
  });
  return body.lesson;
}

async function optionButtonFor(card: Locator, expectedLabel: string) {
  const expected = comparableOptionLabel(expectedLabel);
  const buttons = card.locator('button[aria-label]');
  const matches: Locator[] = [];
  for (let index = 0; index < await buttons.count(); index += 1) {
    const button = buttons.nth(index);
    const ariaLabel = await button.getAttribute("aria-label");
    if (ariaLabel && comparableOptionLabel(ariaLabel) === expected) matches.push(button);
  }
  return matches;
}

async function assertPracticeCards(page: Page, browserCase: BrowserCase) {
  const practiceSection = page.locator("#lesson-practice");
  await practiceSection.scrollIntoViewIfNeeded();
  await expect(practiceSection).toBeVisible();
  const wrappers = practiceSection.locator('[data-ai-selectable="practice-question"]');
  const articles = practiceSection.locator("article[data-question-id]");
  await expect(wrappers).toHaveCount(expectedPracticeCount);
  await expect(articles).toHaveCount(expectedPracticeCount);
  await expect(page.getByTestId("lesson-mission-trail").getByRole("button")).toHaveCount(expectedPracticeCount);

  const expectedIds = browserCase.page.practice.map((question) => question.id);
  expect(await articles.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-question-id")))).toEqual(expectedIds);
  const visibility = await Promise.all(Array.from({ length: expectedPracticeCount }, (_, index) => articles.nth(index).isVisible()));
  expect(visibility.filter(Boolean), "exactly one pager card is visible at a time").toHaveLength(1);

  for (const [index, expectedQuestion] of browserCase.payload.displayedPractice.entries()) {
    expect(expectedQuestion.id).toBe(expectedIds[index]);
    const article = articles.nth(index);
    await expect(article.locator("h3.practice-question-title")).toHaveAttribute(
      "aria-label",
      toPlainMathText(expectedQuestion.prompt)
    );

    if (expectedQuestion.type === "multiple-choice") {
      expect(expectedQuestion.options.length, `${expectedQuestion.id} has options`).toBeGreaterThan(1);
      for (const option of expectedQuestion.options) {
        expect(await optionButtonFor(article, option), `${expectedQuestion.id} renders option ${option}`).toHaveLength(1);
      }
    } else {
      await expect(article.locator("textarea, input:not([type='checkbox']):not([type='file'])")).toHaveCount(1);
    }
  }

  const firstCounter = browserCase.language === "en"
    ? "Question 1 of 5"
    : browserCase.language === "zh"
      ? "第 1 題，共 5 題"
      : "第 1 题，共 5 题";
  await expect(practiceSection.getByText(firstCounter, { exact: true })).toBeVisible();
  return { articles, practiceSection };
}

async function submitLastQuestionCorrectly(
  page: Page,
  browserCase: BrowserCase,
  practiceSection: Locator,
  articles: Locator
) {
  const questionIndex = expectedPracticeCount - 1;
  const question = browserCase.page.practice[questionIndex];
  const expectedQuestion = browserCase.payload.displayedPractice[questionIndex];
  expect(expectedQuestion.id).toBe(question.id);

  await page.getByTestId("lesson-mission-trail").getByRole("button").nth(questionIndex).click();
  const card = articles.nth(questionIndex);
  await expect(card).toBeVisible();

  if (question.type === "multiple-choice") {
    const acceptedChecks = expectedQuestion.gradingSemantics.runtimeSelectionChecks.filter(
      (check) => check.acceptedByProductionGrader
    );
    expect(acceptedChecks).toHaveLength(1);
    expect(expectedQuestion.gradingSemantics.acceptedDisplayedOptionCount).toBe(1);
    expect(expectedQuestion.gradingSemantics.acceptedDisplayedOptionIndexes).toEqual([acceptedChecks[0]?.optionIndex]);
    const optionButtons = await optionButtonFor(card, acceptedChecks[0].displayedOption);
    expect(optionButtons).toHaveLength(1);
    await optionButtons[0].click();
  } else {
    const localizedAcceptedAnswer = expectedQuestion.correctAnswerShownAfterWrongAttempt?.trim();
    expect(
      localizedAcceptedAnswer,
      `${question.id} has a localized learner-facing answer to submit`
    ).toBeTruthy();
    const answerControl = card.locator("textarea, input:not([type='checkbox']):not([type='file'])").first();
    await answerControl.fill(localizedAcceptedAnswer!);
  }

  const checkAnswer = card.getByRole("button", { name: checkAnswerPattern }).first();
  await expect(checkAnswer).toBeEnabled();
  const attemptResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/attempts" &&
    (response.request().postData() ?? "").includes(`\"questionId\":\"${question.id}\"`)
  );
  await checkAnswer.click();
  const attemptResponse = await attemptResponsePromise;
  expect(attemptResponse.status(), await attemptResponse.text()).toBe(200);
  const attempt = await attemptResponse.json() as { correct?: boolean; explanation?: unknown };
  expect(attempt.correct).toBe(true);
  expect(attempt.explanation).toBeTruthy();

  const feedbackTitle = card.getByText(correctFeedbackPattern).first();
  await expect(feedbackTitle).toBeVisible();
  const renderedExplanation = feedbackTitle.locator("..").locator("p.math-text").first();
  await expect(renderedExplanation).toBeVisible();
  const renderedExplanationSource = await renderedExplanation.evaluate((node) =>
    Array.from(node.childNodes).map((child) => {
      if (child.nodeType === Node.TEXT_NODE) return child.textContent ?? "";
      const annotation = (child as Element).querySelector('annotation[encoding="application/x-tex"]');
      return annotation ? `\\(${annotation.textContent ?? ""}\\)` : child.textContent ?? "";
    }).join("")
  );
  expect(
    toPlainMathText(renderedExplanationSource),
    `${question.id} renders the localized worked feedback`
  ).toBe(toPlainMathText(expectedQuestion.explanationShownAfterAttempt));
  await expect(practiceSection).toContainText(correctFeedbackPattern);
}

async function expectImageLoaded(page: Page, expectedSource: string) {
  const images = page.locator("main img");
  const matchingIndex = await images.evaluateAll((nodes, source) => {
    function decoded(value: string) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }

    return nodes.findIndex((node) => {
      const image = node as HTMLImageElement;
      const values = [image.getAttribute("src") ?? "", image.currentSrc, image.getAttribute("srcset") ?? ""];
      return values.some((value) => decoded(value).includes(source));
    });
  }, expectedSource);
  expect(matchingIndex, `rendered image ${expectedSource}`).toBeGreaterThanOrEqual(0);
  const image = images.nth(matchingIndex);
  await image.scrollIntoViewIfNeeded();
  await expect.poll(async () => image.evaluate((node) => {
    const element = node as HTMLImageElement;
    return element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;
  }), { timeout: 15_000 }).toBe(true);
}

async function assertExpectedVisuals(page: Page, browserCase: BrowserCase, lesson: NonNullable<LessonApiPayload["lesson"]>) {
  const illustrationSources = (lesson.blocks ?? [])
    .flatMap((block) => block.illustrations ?? [])
    .map((illustration) => illustration.src)
    .filter((source): source is string => Boolean(source));
  const practiceImageSources = browserCase.page.practice
    .flatMap((question) => question.questionAssets ?? [])
    .filter((asset) => asset.kind === "image")
    .map((asset) => asset.src);
  for (const source of [...illustrationSources, ...practiceImageSources]) {
    await expectImageLoaded(page, source);
  }

  for (const [index, question] of browserCase.page.practice.entries()) {
    if (!question.diagram) continue;
    const article = page.locator("#lesson-practice article[data-question-id]").nth(index);
    await expect(article.locator('[role="img"]'), `${question.id} diagram surface`).toHaveCount(1);
  }

  const visualizationBlock = (lesson.blocks ?? []).find((block) => block.type === "visualization");
  if (!visualizationBlock) return;
  expect(visualizationBlock.visualizationConfig?.moduleId, "visualization module id").toBeTruthy();
  const visualization = page.locator("section#visualization");
  await visualization.scrollIntoViewIfNeeded();
  await expect(visualization).toBeVisible();
  await expect(visualization).not.toContainText(
    /No interactive module is registered|暫未登記互動模組|暂未登记互动模块/i
  );
  await expect(
    visualization.locator('canvas, [role="img"], input, select, button:not([data-lesson-next-item-button])').first()
  ).toBeAttached({ timeout: 15_000 });
}

async function assertRenderedPage(page: Page, browserCase: BrowserCase) {
  const route = expectedRoute(browserCase.page);
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response, `${route} navigation response`).toBeTruthy();
  expect(response!.status(), `${route} status`).toBeLessThan(400);
  await expect(page).toHaveURL(new RegExp(`${route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[?#]|$)`));
  const main = page.locator("main");
  await expect(main).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1, name: browserCase.payload.lessonPage.title, exact: true })).toBeVisible();
  await expect(main).not.toContainText(/Lesson not found|This page is not available/i);
  await expect(page.locator(".katex-error")).toHaveCount(0);

  const lessonBlock = main.locator(
    `[data-ai-selectable="lesson-block"][data-ai-topic-id="${cssAttributeValue(browserCase.page.topic.id)}"]`
  ).first();
  await expect(lessonBlock).toBeVisible();
  await expect(lessonBlock).toHaveAttribute("data-ai-lesson-slug", lessonSlugForTopicId(browserCase.page.topic.id));
  expect((await lessonBlock.innerText()).trim().length, "visible concept/worked content").toBeGreaterThan(40);

  const renderedText = await main.textContent() ?? "";
  for (const pattern of forbiddenRenderedCopyPatterns) {
    expect(renderedText, `${browserCase.page.topic.id} must not expose ${pattern}`).not.toMatch(pattern);
  }
  if (runMode === "full" && browserCase.language === "en") {
    const lessonContent = await main.locator("#lesson-overview, #visualization, #lesson-practice").allTextContents();
    expect(lessonContent.join("\n"), `${browserCase.page.topic.id} English lesson surface contains CJK`).not.toMatch(englishCjkPattern);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, `${browserCase.page.topic.id} horizontal overflow`).toBeLessThanOrEqual(2);
}

test.describe("China all-math lesson-page browser QA", () => {
  test("locks the exact 384-page and five-question inventory", async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "The source inventory contract only needs one browser project.");
    expect(basePages).toHaveLength(expectedChinaLessonPageCount);
    expect(Object.fromEntries(
      Object.keys(expectedScopeCounts).map((scope) => [
        scope,
        basePages.filter((page) => page.scope === scope).length
      ])
    )).toEqual(expectedScopeCounts);
    expect(new Set(basePages.map((page) => lessonSlugForTopicId(page.topic.id))).size).toBe(expectedChinaLessonPageCount);
    expect(basePages.every((page) => page.practice.length === expectedPracticeCount)).toBe(true);
    const interactionTypes = Object.fromEntries(Array.from(
      Map.groupBy(basePages.map((page) => page.practice[expectedPracticeCount - 1]), (question) => question.type),
      ([type, questions]) => [type, questions.length]
    ));
    expect(interactionTypes["multiple-choice"]).toBeGreaterThan(0);
    expect(
      (interactionTypes["fill-in"] ?? 0) + (interactionTypes["short-answer"] ?? 0) + (interactionTypes.graph ?? 0)
    ).toBeGreaterThan(0);
    await testInfo.attach("china-lesson-browser-inventory.json", {
      body: JSON.stringify({
        pageCount: basePages.length,
        languageCount: 3,
        viewportProjects: 2,
        browserCaseCount: basePages.length * 3 * 2,
        mountedPracticeCardRenderCount: basePages.length * expectedPracticeCount * 3 * 2,
        interactionQuestionTypesPerLanguageAndViewport: interactionTypes
      }, null, 2),
      contentType: "application/json"
    });
  });

  for (const browserCase of selectedCases) {
    const caseNumber = String(browserCase.inventoryIndex + 1).padStart(3, "0");
    test(`[${caseNumber}/384][${browserCase.language}][${browserCase.page.scope}] ${browserCase.page.topic.id}`, async ({ page }, testInfo) => {
      test.setTimeout(runMode === "full" ? 90_000 : 60_000);
      testInfo.annotations.push(
        { type: "china-scope", description: browserCase.page.scope },
        { type: "language", description: browserCase.language },
        { type: "topic-id", description: browserCase.page.topic.id },
        { type: "qa-mode", description: runMode }
      );
      const diagnostics = diagnosticsForPage(page);
      try {
        await authenticateForCase(page, browserCase, testInfo);
        const lesson = await readFullLesson(page, browserCase);
        if (!lesson) throw new Error(`${browserCase.page.topic.id}: lesson API omitted lesson payload`);
        await assertRenderedPage(page, browserCase);
        const { articles, practiceSection } = await assertPracticeCards(page, browserCase);
        await assertExpectedVisuals(page, browserCase, lesson);
        if (runMode === "full") {
          await submitLastQuestionCorrectly(page, browserCase, practiceSection, articles);
        }
        await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
      } finally {
        await attachDiagnostics(testInfo, diagnostics);
        await expectNoBrowserDiagnostics(diagnostics);
      }
    });
  }
});
