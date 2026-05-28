import { expect, test, type APIResponse, type Locator, type Page, type Response as PageResponse, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { questions } from "../../data/questions";
import { topics } from "../../data/topics";
import { gradeLabGroups, type VisualizationModuleId } from "../../data/visualizationLabs";
import { lessonSlugForTopicId } from "../../lib/lessonLinks";
import type { CurriculumTrack, Difficulty, GradeId, LessonBlock, LessonDetail } from "../../types";

type Severity = "P0" | "P1" | "P2" | "P3";
type Owner = "S04 practice" | "S05 lesson" | "S06 visualization" | "S10 api/tooling";

type Finding = {
  route: string;
  slug?: string;
  severity: Severity;
  owner: Owner;
  check: string;
  expected: string;
  actual: string;
  repro: string;
  evidence?: string[];
};

type LessonRouteRow = {
  route: string;
  slug: string;
  topicId: string;
  curriculumTrack: CurriculumTrack;
  grade: GradeId;
  project: string;
  status: "pass" | "fail";
  checks: string[];
  findings: number;
  questionSolvability: LessonQuestionSolvabilityStats;
};

type LessonResponse = {
  lesson?: LessonDetail;
  error?: string;
};

type LessonQuestionSolvabilityStats = {
  totalQuestionsExpected: number;
  submitted: number;
  correct: number;
  missingSourceRecord: number;
  missingRenderedCard: number;
  wrongFeedback: number;
  failedQuestionIds: string[];
};

type AttemptResponseBody = {
  correct?: unknown;
  explanation?: unknown;
  correctAnswer?: unknown;
  error?: unknown;
};

const validGrades = new Set<GradeId>(["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"]);
const validDifficulties = new Set<Difficulty>(["Foundation", "Core", "Challenge", "Exam"]);
const validVisualizationModules = new Set<VisualizationModuleId>(
  gradeLabGroups.flatMap((group) => group.labs.map((lab) => lab.moduleId))
);

const placeholderPatterns = [
  { label: "generic lesson title", pattern: /Concept, Model, and Practice/i },
  { label: "generic concept heading", pattern: /^Concept explanation$/i },
  { label: "generic generated description", pattern: /Build .+ through concept explanation/i },
  { label: "generic worked example fallback", pattern: /Use a focused .+ example/i },
  { label: "old seed placeholder", pattern: /Start with the meaning of|Start by naming|Build this topic through concept explanation/i }
] as const;

const invalidTextPattern = /\b(?:undefined|NaN)\b/i;
const sourceQuestionById = new Map(questions.map((question) => [question.id, question]));

function lessonTargets() {
  return topics
    .filter((topic) => topic.curriculumTrack === "HK" || (topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.grade.startsWith("S")))
    .map((topic) => ({
      topic,
      curriculumTrack: topic.curriculumTrack,
      slug: lessonSlugForTopicId(topic.id),
      route: `/lesson/${lessonSlugForTopicId(topic.id)}`
    }));
}

function addFinding(findings: Finding[], finding: Finding) {
  findings.push(finding);
}

function shortEvidence(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

async function responseText(response: APIResponse) {
  return shortEvidence(await response.text().catch((error) => `Could not read response body: ${String(error)}`));
}

function textValuesFromLesson(lesson: LessonDetail) {
  const values: Array<{ label: string; value: string }> = [
    { label: "title.en", value: lesson.title.en },
    { label: "title.zh", value: lesson.title.zh },
    { label: "description.en", value: lesson.description.en },
    { label: "description.zh", value: lesson.description.zh }
  ];

  lesson.blocks.forEach((block) => {
    values.push({ label: `${block.id}.title.en`, value: block.title.en });
    values.push({ label: `${block.id}.title.zh`, value: block.title.zh });
    if (block.content) {
      values.push({ label: `${block.id}.content.en`, value: block.content.en });
      values.push({ label: `${block.id}.content.zh`, value: block.content.zh });
    }
    block.items?.forEach((item, index) => {
      values.push({ label: `${block.id}.items.${index}.en`, value: item.en });
      values.push({ label: `${block.id}.items.${index}.zh`, value: item.zh });
    });
  });

  lesson.practiceQuestions.forEach((question, index) => {
    values.push({ label: `practice.${index}.prompt.en`, value: question.prompt.en });
    values.push({ label: `practice.${index}.prompt.zh`, value: question.prompt.zh });
    question.options?.forEach((option, optionIndex) => {
      values.push({ label: `practice.${index}.options.${optionIndex}.en`, value: option.en });
      values.push({ label: `practice.${index}.options.${optionIndex}.zh`, value: option.zh });
    });
  });

  return values;
}

function hasBalancedMathDelimiters(value: string) {
  const pairs = [
    ["\\(", "\\)"],
    ["\\[", "\\]"],
    ["$$", "$$"]
  ] as const;

  return pairs.every(([open, close]) => {
    const openCount = value.split(open).length - 1;
    const closeCount = value.split(close).length - 1;
    return open === close ? openCount % 2 === 0 : openCount === closeCount;
  });
}

function blockTypes(lesson: LessonDetail) {
  return new Set(lesson.blocks.map((block) => block.type));
}

function validateLessonPayload({
  findings,
  lesson,
  route,
  slug
}: {
  findings: Finding[];
  lesson: LessonDetail;
  route: string;
  slug: string;
}) {
  if (!lesson.title.en.trim() || !lesson.title.zh.trim()) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "lesson title localization",
      expected: "English and Chinese titles are non-empty.",
      actual: shortEvidence(lesson.title),
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (!lesson.description.en.trim() || !lesson.description.zh.trim()) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "lesson description localization",
      expected: "English and Chinese descriptions are non-empty.",
      actual: shortEvidence(lesson.description),
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (!validGrades.has(lesson.grade)) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S10 api/tooling",
      check: "lesson grade",
      expected: "A valid P1-S6 grade.",
      actual: String(lesson.grade),
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (!validDifficulties.has(lesson.difficulty)) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S10 api/tooling",
      check: "lesson difficulty",
      expected: "One of Foundation, Core, Challenge, or Exam.",
      actual: String(lesson.difficulty),
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (!Number.isFinite(lesson.estimatedMinutes) || lesson.estimatedMinutes <= 0) {
    addFinding(findings, {
      route,
      slug,
      severity: "P2",
      owner: "S05 lesson",
      check: "estimated lesson time",
      expected: "A positive estimatedMinutes value.",
      actual: String(lesson.estimatedMinutes),
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (!Number.isFinite(lesson.mastery) || lesson.mastery < 0 || lesson.mastery > 100) {
    addFinding(findings, {
      route,
      slug,
      severity: "P2",
      owner: "S10 api/tooling",
      check: "lesson mastery",
      expected: "A mastery percentage from 0 to 100.",
      actual: String(lesson.mastery),
      repro: `GET /api/lessons/${slug}`
    });
  }

  const types = blockTypes(lesson);
  (["concept", "worked-example", "checklist", "practice"] satisfies LessonBlock["type"][]).forEach((type) => {
    if (!types.has(type)) {
      addFinding(findings, {
        route,
        slug,
        severity: "P1",
        owner: "S05 lesson",
        check: "required lesson block",
        expected: `Lesson includes a ${type} block.`,
        actual: `Block types: ${Array.from(types).join(", ") || "none"}`,
        repro: `GET /api/lessons/${slug}`
      });
    }
  });

  const checklist = lesson.blocks.find((block) => block.type === "checklist");
  if (!checklist?.items?.length) {
    addFinding(findings, {
      route,
      slug,
      severity: "P2",
      owner: "S05 lesson",
      check: "checklist content",
      expected: "The checklist block has at least one item.",
      actual: checklist ? "Checklist block has no items." : "No checklist block.",
      repro: `GET /api/lessons/${slug}`
    });
  }

  if (lesson.practiceQuestions.length === 0) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S04 practice",
      check: "linked practice",
      expected: "Every lesson has at least one linked practice question.",
      actual: "No practiceQuestions returned.",
      repro: `GET /api/lessons/${slug}`
    });
  }

  lesson.blocks
    .filter((block) => block.type === "visualization")
    .forEach((block) => {
      const moduleId = block.visualizationConfig?.moduleId;
      if (!moduleId || !validVisualizationModules.has(moduleId as VisualizationModuleId)) {
        addFinding(findings, {
          route,
          slug,
          severity: "P1",
          owner: "S06 visualization",
          check: "visualization module registration",
          expected: "Visualization blocks use a registered moduleId.",
          actual: String(moduleId ?? "missing moduleId"),
          repro: `GET /api/lessons/${slug}`,
          evidence: [shortEvidence(block.visualizationConfig)]
        });
      }
    });

  const textValues = textValuesFromLesson(lesson);
  const invalidTextHits = textValues
    .filter(({ value }) => invalidTextPattern.test(value))
    .map(({ label, value }) => `${label}: ${shortEvidence(value)}`);
  if (invalidTextHits.length) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "invalid rendered text tokens",
      expected: "No user-facing text contains undefined or NaN.",
      actual: invalidTextHits.slice(0, 8).join("; "),
      repro: `GET /api/lessons/${slug}`,
      evidence: invalidTextHits.slice(0, 12)
    });
  }

  const placeholderHits = textValues.flatMap(({ label, value }) =>
    placeholderPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ label: patternLabel }) => `${label}: ${patternLabel} -> ${shortEvidence(value)}`)
  );
  if (placeholderHits.length) {
    addFinding(findings, {
      route,
      slug,
      severity: "P2",
      owner: "S05 lesson",
      check: "placeholder lesson content",
      expected: "Lesson text is production-specific and not generic scaffold copy.",
      actual: placeholderHits.slice(0, 8).join("; "),
      repro: `GET /api/lessons/${slug}`,
      evidence: placeholderHits.slice(0, 12)
    });
  }

  const brokenMathHits = textValues
    .filter(({ value }) => !hasBalancedMathDelimiters(value))
    .map(({ label, value }) => `${label}: ${shortEvidence(value)}`);
  if (brokenMathHits.length) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "math delimiter balance",
      expected: "Math delimiters are balanced before KaTeX rendering.",
      actual: brokenMathHits.slice(0, 8).join("; "),
      repro: `GET /api/lessons/${slug}`,
      evidence: brokenMathHits.slice(0, 12)
    });
  }
}

async function fetchLesson(page: Page, findings: Finding[], slug: string, route: string) {
  const response = await page.request.get(`/api/lessons/${encodeURIComponent(slug)}`);
  if (!response.ok()) {
    addFinding(findings, {
      route,
      slug,
      severity: "P0",
      owner: "S10 api/tooling",
      check: "lesson API response",
      expected: `GET /api/lessons/${slug} returns 200 JSON.`,
      actual: `${response.status()} ${response.statusText()} ${await responseText(response)}`,
      repro: `curl -i ${new URL(`/api/lessons/${slug}`, page.url() || "http://127.0.0.1").pathname}`
    });
    return null;
  }

  let body: LessonResponse;
  try {
    body = await response.json() as LessonResponse;
  } catch (error) {
    addFinding(findings, {
      route,
      slug,
      severity: "P0",
      owner: "S10 api/tooling",
      check: "lesson API JSON",
      expected: `GET /api/lessons/${slug} returns parseable JSON.`,
      actual: String(error),
      repro: `GET /api/lessons/${slug}`
    });
    return null;
  }

  if (!body.lesson) {
    addFinding(findings, {
      route,
      slug,
      severity: "P0",
      owner: "S10 api/tooling",
      check: "lesson API payload",
      expected: "Response includes a lesson object.",
      actual: shortEvidence(body),
      repro: `GET /api/lessons/${slug}`
    });
    return null;
  }

  validateLessonPayload({ findings, lesson: body.lesson, route, slug });
  return body.lesson;
}

async function registerDisposableStudent(
  page: Page,
  testInfo: TestInfo,
  findings: Finding[],
  target: { curriculumTrack: CurriculumTrack; grade: GradeId }
) {
  const suffix = `${Date.now()}-${testInfo.workerIndex}-${testInfo.project.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const trackLabel = target.curriculumTrack.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const username = `lesson-qa-${trackLabel}-${target.grade.toLowerCase()}-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      name: `Lesson QA ${target.curriculumTrack} ${target.grade} ${suffix}`,
      username,
      email: username,
      password: "lesson12345",
      grade: target.grade,
      curriculumTrack: target.curriculumTrack,
      language: target.curriculumTrack === "MAINLAND_PEP_HIGH" ? "zh-Hans" : "en",
      theme: "dark"
    }
  });

  if (!response.ok()) {
    addFinding(findings, {
      route: "/api/auth/register",
      severity: "P0",
      owner: "S10 api/tooling",
      check: "disposable student setup",
      expected: `A disposable ${target.curriculumTrack} ${target.grade} student account can be created for lesson interaction checks.`,
      actual: `${response.status()} ${response.statusText()} ${await responseText(response)}`,
      repro: "POST /api/auth/register with a unique lesson QA student payload."
    });
    return false;
  }

  return true;
}

function shouldReportFailedGet(response: PageResponse) {
  if (response.request().method() !== "GET" || response.status() < 400) return false;
  const url = new URL(response.url());
  if (url.pathname.startsWith("/_next/")) return false;
  if (url.pathname === "/favicon.ico" || url.pathname.startsWith("/icon.svg")) return false;
  if (url.pathname === "/api/me" && response.status() === 401) return false;
  return true;
}

async function maybeAttachScreenshot(testInfo: TestInfo, page: Page, name: string, remainingBudget: { count: number }) {
  if (remainingBudget.count <= 0) return;
  remainingBudget.count -= 1;
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png"
  });
}

function routeTitleVisibleText(lesson: LessonDetail) {
  return lesson.title.en.split(":")[0].trim();
}

async function visibleBodyText(page: Page) {
  return await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
}

async function checkLayoutHeuristics(page: Page) {
  return await page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const clippedControls = Array.from(document.querySelectorAll("button, a, input, textarea, select"))
      .filter((element) => {
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        const isVisible = typeof htmlElement.checkVisibility === "function"
          ? htmlElement.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          : style.display !== "none" && style.visibility !== "hidden" && htmlElement.getClientRects().length > 0;
        if (!isVisible) return false;
        const rect = htmlElement.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2);
      })
      .slice(0, 5)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return `${element.tagName.toLowerCase()} "${(element.textContent ?? element.getAttribute("aria-label") ?? "").trim().slice(0, 60)}" x=${Math.round(rect.left)}..${Math.round(rect.right)}`;
      });

    return { overflow, clippedControls };
  });
}

async function exerciseVisualizationOnce(page: Page, moduleId: string, exercisedModules: Set<string>) {
  if (exercisedModules.has(moduleId)) return "already-exercised";
  const panel = page.locator("section").filter({ hasText: /Interactive visualization panel/i }).last();
  if (await panel.count() === 0) return "missing-panel";

  const range = panel.locator('input[type="range"]').first();
  if (await range.count()) {
    await range.focus();
    await range.press("ArrowRight");
    exercisedModules.add(moduleId);
    return "range-keyboard";
  }

  const button = panel.getByRole("button").first();
  if (await button.count()) {
    await button.click();
    exercisedModules.add(moduleId);
    return "button-click";
  }

  if (await panel.getByRole("img").count()) {
    exercisedModules.add(moduleId);
    return "visual-only";
  }

  return "no-interactive-control";
}

function createQuestionSolvabilityStats(totalQuestionsExpected = 0): LessonQuestionSolvabilityStats {
  return {
    totalQuestionsExpected,
    submitted: 0,
    correct: 0,
    missingSourceRecord: 0,
    missingRenderedCard: 0,
    wrongFeedback: 0,
    failedQuestionIds: []
  };
}

function noteQuestionFailure(stats: LessonQuestionSolvabilityStats, questionId: string) {
  if (!stats.failedQuestionIds.includes(questionId)) {
    stats.failedQuestionIds.push(questionId);
  }
}

function mergeQuestionSolvabilityStats(statsList: LessonQuestionSolvabilityStats[]) {
  const merged = createQuestionSolvabilityStats();
  statsList.forEach((stats) => {
    merged.totalQuestionsExpected += stats.totalQuestionsExpected;
    merged.submitted += stats.submitted;
    merged.correct += stats.correct;
    merged.missingSourceRecord += stats.missingSourceRecord;
    merged.missingRenderedCard += stats.missingRenderedCard;
    merged.wrongFeedback += stats.wrongFeedback;
    stats.failedQuestionIds.forEach((questionId) => noteQuestionFailure(merged, questionId));
  });
  return merged;
}

function correctOptionTextFor(question: (typeof questions)[number]) {
  return question.options?.find((option) => option.en === question.answer || option.zh === question.answer)?.en ?? null;
}

async function readAttemptResponseBody(response: PageResponse) {
  return await response.json().catch((error) => ({
    error: `Could not parse attempt response JSON: ${String(error)}`
  })) as AttemptResponseBody;
}

async function selectStoredAnswer({
  card,
  question,
  stats
}: {
  card: Locator;
  question: (typeof questions)[number];
  stats: LessonQuestionSolvabilityStats;
}) {
  if (!question.answer.trim()) {
    stats.missingSourceRecord += 1;
    noteQuestionFailure(stats, question.id);
    return "missing-answer-key";
  }

  if (question.type === "multiple-choice") {
    const correctOptionText = correctOptionTextFor(question);
    if (!correctOptionText) {
      stats.missingSourceRecord += 1;
      noteQuestionFailure(stats, question.id);
      return "missing-correct-option";
    }

    const exactOption = card.getByRole("button", { name: correctOptionText, exact: true });
    if (await exactOption.count()) {
      await exactOption.first().click();
      return "selected";
    }

    const optionWithText = card.locator("button").filter({ hasText: correctOptionText }).first();
    if (await optionWithText.count()) {
      await optionWithText.click();
      return "selected-fallback";
    }

    stats.missingRenderedCard += 1;
    noteQuestionFailure(stats, question.id);
    return `missing-rendered-option:${correctOptionText}`;
  }

  const answerControl = card.locator("textarea, input:not([type='checkbox']):not([type='file'])").first();
  if (await answerControl.count() === 0) {
    stats.missingRenderedCard += 1;
    noteQuestionFailure(stats, question.id);
    return "missing-answer-input";
  }

  await answerControl.fill(question.answer);
  return "selected";
}

async function submitAllPracticeQuestions(page: Page, lesson: LessonDetail) {
  const stats = createQuestionSolvabilityStats(lesson.practiceQuestions.length);
  const cards = page.locator("article").filter({ has: page.getByRole("button", { name: /^Check answer$/i }) });
  if (lesson.practiceQuestions.length) {
    await cards.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  }

  const renderedCardCount = await cards.count();

  for (const [index, publicQuestion] of lesson.practiceQuestions.entries()) {
    const sourceQuestion = sourceQuestionById.get(publicQuestion.id);
    if (!sourceQuestion) {
      stats.missingSourceRecord += 1;
      noteQuestionFailure(stats, publicQuestion.id);
      continue;
    }

    if (index >= renderedCardCount) {
      stats.missingRenderedCard += 1;
      noteQuestionFailure(stats, sourceQuestion.id);
      continue;
    }

    try {
      const card = cards.nth(index);
      await card.scrollIntoViewIfNeeded();

      const selection = await selectStoredAnswer({ card, question: sourceQuestion, stats });
      if (!selection.startsWith("selected")) continue;

      const checkButton = card.getByRole("button", { name: /^Check answer$/i }).first();
      await expect(checkButton).toBeEnabled({ timeout: 5_000 });
      const attemptResponse = page.waitForResponse((response) => {
        const postData = response.request().postData() ?? "";
        return response.url().includes("/api/attempts") &&
          response.request().method() === "POST" &&
          postData.includes(`"questionId":"${sourceQuestion.id}"`);
      }, { timeout: 10_000 }).catch(() => null);

      await checkButton.click();
      const response = await attemptResponse;
      if (!response) {
        stats.wrongFeedback += 1;
        noteQuestionFailure(stats, sourceQuestion.id);
        continue;
      }

      stats.submitted += 1;
      const body = await readAttemptResponseBody(response);
      if (!response.ok() || body.correct !== true) {
        stats.wrongFeedback += 1;
        noteQuestionFailure(stats, sourceQuestion.id);
        continue;
      }

      stats.correct += 1;
      await expect(card.getByText(/^Correct\b/i).first()).toBeVisible({ timeout: 5_000 }).catch(() => {
        stats.wrongFeedback += 1;
        noteQuestionFailure(stats, sourceQuestion.id);
      });
    } catch {
      stats.wrongFeedback += 1;
      noteQuestionFailure(stats, sourceQuestion.id);
    }
  }

  return stats;
}

async function completeLessonProbe(page: Page) {
  const checkbox = page.locator('aside input[type="checkbox"]').first();
  if (await checkbox.count() === 0) return "missing-checklist-checkbox";
  await checkbox.check();

  const completeResponse = page.waitForResponse((response) => {
    return response.url().includes("/api/lesson-progress") &&
      response.request().method() === "POST" &&
      (response.request().postData() ?? "").includes('"complete"');
  }, { timeout: 10_000 }).catch(() => null);
  await page.getByRole("button", { name: /Mark lesson complete/i }).click();
  const response = await completeResponse;
  if (!response) return "missing-complete-response";
  if (!response.ok()) return `complete-response-${response.status()}`;

  await expect(page.getByText(/Mastery:\s*(85|8[6-9]|9\d|100)%/i).first()).toBeVisible({ timeout: 5_000 });
  return "completed";
}

async function validateLessonPage({
  exercisedModules,
  findings,
  lesson,
  page,
  row,
  screenshotBudget,
  testInfo
}: {
  exercisedModules: Set<string>;
  findings: Finding[];
  lesson: LessonDetail;
  page: Page;
  row: LessonRouteRow;
  screenshotBudget: { count: number };
  testInfo: TestInfo;
}) {
  const routeFindingsBefore = findings.length;
  const failedGets: string[] = [];
  const responseListener = (response: PageResponse) => {
    if (shouldReportFailedGet(response)) {
      failedGets.push(`${response.status()} ${response.url()}`);
    }
  };

  page.on("response", responseListener);
  const response = await page.goto(row.route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  page.off("response", responseListener);

  if (!response || response.status() >= 400) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P0",
      owner: "S05 lesson",
      check: "lesson route response",
      expected: `${row.route} returns a successful rendered lesson page.`,
      actual: response ? `${response.status()} ${response.statusText()}` : "No navigation response.",
      repro: `Open ${row.route}`
    });
    await maybeAttachScreenshot(testInfo, page, `${row.slug}-route-response.png`, screenshotBudget);
  }

  const titleText = routeTitleVisibleText(lesson);
  await page.waitForFunction(
    ([title]) => document.body.innerText.includes(title) || document.body.innerText.includes("Lesson not found"),
    [titleText],
    { timeout: 10_000 }
  ).catch(() => undefined);

  const bodyText = await visibleBodyText(page);
  if (!bodyText.includes(titleText)) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P0",
      owner: "S05 lesson",
      check: "lesson page loaded content",
      expected: `Rendered page includes lesson title text "${titleText}".`,
      actual: shortEvidence(bodyText),
      repro: `Open ${row.route}`
    });
    await maybeAttachScreenshot(testInfo, page, `${row.slug}-missing-title.png`, screenshotBudget);
  }

  if (/Lesson not found|This page is not available/i.test(bodyText)) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P0",
      owner: "S05 lesson",
      check: "not-found state",
      expected: "Known lesson slugs do not render the not-found page.",
      actual: shortEvidence(bodyText),
      repro: `Open ${row.route}`
    });
    await maybeAttachScreenshot(testInfo, page, `${row.slug}-not-found.png`, screenshotBudget);
  }

  if (failedGets.length) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S10 api/tooling",
      check: "unexpected failed GETs",
      expected: "No unexpected failed GET requests while rendering the lesson.",
      actual: failedGets.slice(0, 8).join("; "),
      repro: `Open ${row.route} and inspect network responses.`,
      evidence: failedGets.slice(0, 12)
    });
  }

  const katexErrors = await page.locator(".katex-error").count();
  if (katexErrors > 0) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "KaTeX render errors",
      expected: "No `.katex-error` elements are rendered.",
      actual: `${katexErrors} KaTeX error elements.`,
      repro: `Open ${row.route} and search for .katex-error.`
    });
    await maybeAttachScreenshot(testInfo, page, `${row.slug}-katex-error.png`, screenshotBudget);
  }

  if (invalidTextPattern.test(bodyText)) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "rendered invalid tokens",
      expected: "Rendered lesson text does not include undefined or NaN.",
      actual: shortEvidence(bodyText.match(invalidTextPattern)?.[0] ?? "matched invalid token"),
      repro: `Open ${row.route} and search rendered text.`
    });
  }

  const layout = await checkLayoutHeuristics(page);
  if (layout.overflow > 2 || layout.clippedControls.length) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P2",
      owner: "S05 lesson",
      check: "layout overflow and clipped controls",
      expected: "No horizontal overflow or clipped visible controls at the project viewport.",
      actual: `overflow=${layout.overflow}; clipped=${layout.clippedControls.join("; ") || "none"}`,
      repro: `Open ${row.route} on ${testInfo.project.name}.`,
      evidence: layout.clippedControls
    });
    await maybeAttachScreenshot(testInfo, page, `${row.slug}-layout.png`, screenshotBudget);
  }

  const completion = await completeLessonProbe(page).catch((error) => `error-${String(error)}`);
  row.checks.push(`complete:${completion}`);
  if (completion !== "completed") {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "lesson completion interaction",
      expected: "Checklist can be toggled and Mark lesson complete updates mastery to at least 85%.",
      actual: completion,
      repro: `Open ${row.route}, tick the first checklist item, click Mark lesson complete.`
    });
  }

  row.questionSolvability = await submitAllPracticeQuestions(page, lesson);
  row.checks.push(`practice:correct-${row.questionSolvability.correct}/${row.questionSolvability.totalQuestionsExpected}`);
  if (
    row.questionSolvability.correct !== row.questionSolvability.totalQuestionsExpected ||
    row.questionSolvability.submitted !== row.questionSolvability.totalQuestionsExpected ||
    row.questionSolvability.failedQuestionIds.length
  ) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S04 practice",
      check: "lesson practice solvability",
      expected: "Every linked practice question can be answered on the Lesson page using its stored right answer and returns Correct feedback.",
      actual: shortEvidence(row.questionSolvability),
      repro: `Open ${row.route}, answer every practice card with the stored answer from data/questions.ts, click Check answer.`,
      evidence: row.questionSolvability.failedQuestionIds.slice(0, 12)
    });
  }

  const visualizationBlock = lesson.blocks.find((block) => block.type === "visualization");
  if (visualizationBlock?.visualizationConfig?.moduleId) {
    const moduleId = visualizationBlock.visualizationConfig.moduleId;
    const exercise = await exerciseVisualizationOnce(page, moduleId, exercisedModules).catch((error) => `error-${String(error)}`);
    row.checks.push(`visualization:${moduleId}:${exercise}`);
    if (exercise === "missing-panel" || exercise === "no-interactive-control" || exercise.startsWith("error-")) {
      addFinding(findings, {
        route: row.route,
        slug: row.slug,
        severity: "P2",
        owner: "S06 visualization",
        check: "visualization interaction",
        expected: `The ${moduleId} visualization renders and can be exercised at least once.`,
        actual: exercise,
        repro: `Open ${row.route}, inspect the Interactive visualization panel, interact with its first range or button.`
      });
      await maybeAttachScreenshot(testInfo, page, `${row.slug}-visualization.png`, screenshotBudget);
    }
  }

  row.status = findings.length === routeFindingsBefore ? "pass" : "fail";
  row.findings = findings.length - routeFindingsBefore;
}

function formatFinding(finding: Finding, index: number) {
  return [
    `${index + 1}. [${finding.severity}] ${finding.route}${finding.slug ? ` (${finding.slug})` : ""}`,
    `owner=${finding.owner}`,
    `check=${finding.check}`,
    `expected=${finding.expected}`,
    `actual=${finding.actual}`,
    `repro=${finding.repro}`
  ].join(" | ");
}

test.describe("lesson page all-slug bug detection", () => {
  test("detects root, API, rendering, interaction, and visualization bugs for every lesson", async ({ page }, testInfo) => {
    test.slow();
    test.setTimeout(900_000);

    const findings: Finding[] = [];
    const rows: LessonRouteRow[] = [];
    const screenshotBudget = { count: 5 };
    const targets = lessonTargets();
    const slugs = targets.map((target) => target.slug);
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

    const mainlandHighTargets = targets.filter((target) => target.curriculumTrack === "MAINLAND_PEP_HIGH");
    const hongKongTargets = targets.filter((target) => target.curriculumTrack === "HK");

    if (hongKongTargets.length === 0 || mainlandHighTargets.length !== 22) {
      addFinding(findings, {
        route: "data/topics.ts",
        severity: "P2",
        owner: "S10 api/tooling",
        check: "lesson inventory size",
        expected: "The lesson inventory includes all HK lesson targets and exactly 22 Mainland PEP high-school targets.",
        actual: `${hongKongTargets.length} HK targets; ${mainlandHighTargets.length} Mainland PEP high-school targets.`,
        repro: "Run lessonTargets() in tests/e2e/lesson-all.spec.ts."
      });
    }

    if (duplicateSlugs.length) {
      addFinding(findings, {
        route: "data/topics.ts",
        severity: "P1",
        owner: "S10 api/tooling",
        check: "unique lesson slugs",
        expected: "Generated lesson slugs are unique.",
        actual: duplicateSlugs.join(", "),
        repro: "Run topics.map(topic => lessonSlugForTopicId(topic.id))."
      });
    }

    const rootResponse = await page.request.get("/lesson");
    if (rootResponse.status() === 404) {
      addFinding(findings, {
        route: "/lesson",
        severity: "P1",
        owner: "S05 lesson",
        check: "lesson index route",
        expected: "`/lesson` is the user-requested Lesson page and should not return 404.",
        actual: `404 ${rootResponse.statusText()} ${await responseText(rootResponse)}`,
        repro: "Open http://localhost:3015/lesson."
      });
    } else if (rootResponse.status() >= 400) {
      addFinding(findings, {
        route: "/lesson",
        severity: "P1",
        owner: "S05 lesson",
        check: "lesson index route",
        expected: "`/lesson` returns a successful page or redirect.",
        actual: `${rootResponse.status()} ${rootResponse.statusText()} ${await responseText(rootResponse)}`,
        repro: "Open /lesson."
      });
    }

    const lessons = new Map<string, LessonDetail>();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const exercisedModules = new Set<string>();
    const targetGroups = new Map<string, typeof targets>();
    targets.forEach((target) => {
      const key = `${target.curriculumTrack}:${target.topic.grade}`;
      targetGroups.set(key, [...(targetGroups.get(key) ?? []), target]);
    });

    for (const groupTargets of targetGroups.values()) {
      const firstTarget = groupTargets[0];
      const registered = await registerDisposableStudent(page, testInfo, findings, {
        curriculumTrack: firstTarget.curriculumTrack,
        grade: firstTarget.topic.grade
      });

      if (!registered) {
        groupTargets.forEach((target) => {
          rows.push({
            route: target.route,
            slug: target.slug,
            topicId: target.topic.id,
            curriculumTrack: target.curriculumTrack,
            grade: target.topic.grade,
            project: testInfo.project.name,
            status: "fail",
            checks: ["browser:skipped-registration-failed"],
            findings: 1,
            questionSolvability: createQuestionSolvabilityStats(lessons.get(target.slug)?.practiceQuestions.length ?? 0)
          });
        });
        continue;
      }

      const roadmapResponse = await page.request.get("/api/roadmap");
      if (!roadmapResponse.ok()) {
        addFinding(findings, {
          route: "/api/roadmap",
          severity: "P0",
          owner: "S10 api/tooling",
          check: "roadmap API availability",
          expected: `GET /api/roadmap returns 200 JSON for ${firstTarget.curriculumTrack} ${firstTarget.topic.grade}.`,
          actual: `${roadmapResponse.status()} ${roadmapResponse.statusText()} ${await responseText(roadmapResponse)}`,
          repro: `GET /api/roadmap after registering ${firstTarget.curriculumTrack} ${firstTarget.topic.grade} student.`
        });
      }

      for (const target of groupTargets) {
        const fetchedLesson = await fetchLesson(page, findings, target.slug, target.route);
        if (fetchedLesson) lessons.set(target.slug, fetchedLesson);
        const lesson = lessons.get(target.slug);
        const row: LessonRouteRow = {
          route: target.route,
          slug: target.slug,
          topicId: target.topic.id,
          curriculumTrack: target.curriculumTrack,
          grade: target.topic.grade,
          project: testInfo.project.name,
          status: "pass",
          checks: [],
          findings: 0,
          questionSolvability: createQuestionSolvabilityStats(lesson?.practiceQuestions.length ?? 0)
        };
        rows.push(row);

        if (!lesson) {
          row.status = "fail";
          row.findings += 1;
          row.checks.push("browser:skipped-no-api-lesson");
          continue;
        }

        await validateLessonPage({
          exercisedModules,
          findings,
          lesson,
          page,
          row,
          screenshotBudget,
          testInfo
        });
      }
    }

    if (pageErrors.length) {
      addFinding(findings, {
        route: "browser runtime",
        severity: "P1",
        owner: "S10 api/tooling",
        check: "client page errors",
        expected: "No uncaught browser page errors during the lesson sweep.",
        actual: pageErrors.slice(0, 8).join("; "),
        repro: "Run the all-lessons browser sweep and inspect pageerror events.",
        evidence: pageErrors.slice(0, 20)
      });
    }

    const allReferencedModules = Array.from(new Set(
      Array.from(lessons.values()).flatMap((lesson) =>
        lesson.blocks
          .filter((block) => block.type === "visualization")
          .map((block) => block.visualizationConfig?.moduleId)
          .filter((moduleId): moduleId is string => Boolean(moduleId))
      )
    ));
    const unexercisedModules = allReferencedModules.filter((moduleId) => !exercisedModules.has(moduleId));
    const anyRegisteredGroup = rows.some((row) => !row.checks.includes("browser:skipped-registration-failed"));
    if (anyRegisteredGroup && unexercisedModules.length) {
      addFinding(findings, {
        route: "/lesson/[slug]",
        severity: "P2",
        owner: "S06 visualization",
        check: "distinct visualization module coverage",
        expected: "Each distinct lesson visualization module is exercised at least once.",
        actual: `Unexercised: ${unexercisedModules.join(", ")}`,
        repro: "Run the all-lessons browser sweep and inspect visualization interaction rows."
      });
    }

    const questionSolvability = mergeQuestionSolvabilityStats(rows.map((row) => row.questionSolvability));
    const reportBody = JSON.stringify({ rows, questionSolvability, findings }, null, 2);
    const reportDir = path.join(process.cwd(), "output", "playwright", "lesson-qa");
    const reportPath = path.join(reportDir, `lesson-qa-results-${testInfo.project.name}.json`);
    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(reportPath, reportBody);

    await testInfo.attach("lesson-qa-results.json", {
      body: reportBody,
      contentType: "application/json"
    });

    if (findings.length) {
      const summary = findings.slice(0, 80).map(formatFinding).join("\n");
      throw new Error(`Lesson QA found ${findings.length} issue(s). Full JSON report is attached as lesson-qa-results.json.\n${summary}`);
    }
  });
});
