import { expect, test, type APIResponse, type Locator, type Page, type Response as PageResponse, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { questions } from "../../data/questions";
import { topics } from "../../data/topics";
import type { VisualizationModuleId } from "../../data/visualizationLabs";
import { lessonSlugForTopicId, studentLessonsPath } from "../../lib/lessonLinks";
import type { CurriculumTrack, Difficulty, GradeId, LessonBlock, LessonDetail } from "../../types";

// This is one deliberately long, row-by-row sweep. Recording every DOM snapshot
// and video frame for all 51 lessons produced multi-gigabyte artifacts and made
// browser actions take tens of seconds, which in turn distorted the interaction
// checks themselves. The JSON ledger and bounded finding screenshots remain the
// durable evidence for this suite; focused reproductions can enable tracing in a
// separate diagnostic spec when a finding needs it.
test.use({ trace: "off", video: "off", screenshot: "only-on-failure" });

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
const validDifficulties = new Set<Difficulty>(["Low", "Medium", "High"]);
const validVisualizationModules = new Set<VisualizationModuleId>([
  "coordinate-plane-demo",
  "function-graph-explorer",
  "geometry-explorer",
  "probability-simulator",
  "function-model-comparer",
  "trig-wave-explorer",
  "calculus-stats-lab",
  "configured-visualization-lab"
]);

const placeholderPatterns = [
  { label: "generic lesson title", pattern: /Concept, Model, and Practice/i },
  { label: "generic concept heading", pattern: /^Concept explanation$/i },
  { label: "generic generated description", pattern: /Build .+ through concept explanation/i },
  { label: "generic worked example fallback", pattern: /Use a focused .+ example/i },
  { label: "old seed placeholder", pattern: /Start with the meaning of|Start by naming|Build this topic through concept explanation/i }
] as const;

const invalidNanTextPattern = /\bNaN\b/i;
const exactUndefinedPlaceholderPattern = /^\s*undefined\s*$/i;
const labeledUndefinedPlaceholderPattern =
  /\b(?:title|description|label|value|answer|score|mastery|progress|question|lesson)\s*[:=]\s*undefined\b/i;
const repeatedUndefinedPlaceholderPattern = /\bundefined(?:\s+undefined)+\b/i;
const sourceQuestionById = new Map(questions.map((question) => [question.id, question]));
const requestedLessonQaSlugs = new Set(
  (process.env.LESSON_QA_SLUGS ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
);
const requestedLessonQaOffset = Math.max(0, Number.parseInt(process.env.LESSON_QA_OFFSET ?? "0", 10) || 0);
const requestedLessonQaLimit = (() => {
  const parsed = Number.parseInt(process.env.LESSON_QA_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
})();

function lessonTargets() {
  const targets = topics
    .filter((topic) =>
      topic.curriculumTrack === "HK" ||
      (topic.curriculumTrack === "MAINLAND_PEP_HIGH" && topic.id.startsWith("pep-high-"))
    )
    .map((topic) => ({
      topic,
      curriculumTrack: topic.curriculumTrack,
      slug: lessonSlugForTopicId(topic.id),
      route: `${studentLessonsPath}/${lessonSlugForTopicId(topic.id)}`
    }))
    .filter((target) => requestedLessonQaSlugs.size === 0 || requestedLessonQaSlugs.has(target.slug));
  const offsetTargets = requestedLessonQaOffset ? targets.slice(requestedLessonQaOffset) : targets;
  return requestedLessonQaLimit === null ? offsetTargets : offsetTargets.slice(0, requestedLessonQaLimit);
}

function addFinding(findings: Finding[], finding: Finding) {
  findings.push(finding);
}

function shortEvidence(value: unknown) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 260 ? `${text.slice(0, 260)}...` : text;
}

function invalidUserFacingTextToken(value: unknown) {
  if (typeof value !== "string") return `non-string-${typeof value}`;

  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.match(invalidNanTextPattern)?.[0] ??
    normalized.match(exactUndefinedPlaceholderPattern)?.[0] ??
    normalized.match(labeledUndefinedPlaceholderPattern)?.[0] ??
    normalized.match(repeatedUndefinedPlaceholderPattern)?.[0] ??
    null;
}

async function responseText(response: APIResponse) {
  return shortEvidence(await response.text().catch((error) => `Could not read response body: ${String(error)}`));
}

async function getWithRetry(
  page: Page,
  url: string,
  options: { maxRedirects?: number; timeout?: number } = {}
) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await page.request.get(url, { timeout: 15_000, ...options });
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(250).catch(() => undefined);
    }
  }
  throw lastError;
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
      expected: "One of Low, Medium, or High.",
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
  const invalidTextHits = textValues.flatMap(({ label, value }) => {
    const invalidToken = invalidUserFacingTextToken(value);
    return invalidToken ? [`${label}: ${invalidToken} -> ${shortEvidence(value)}`] : [];
  });
  if (invalidTextHits.length) {
    addFinding(findings, {
      route,
      slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "invalid rendered text tokens",
      expected: "No user-facing text contains NaN or an undefined placeholder/leak.",
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
  let response: APIResponse;
  try {
    response = await getWithRetry(page, `/api/lessons/${encodeURIComponent(slug)}`);
  } catch (error) {
    addFinding(findings, {
      route,
      slug,
      severity: "P0",
      owner: "S10 api/tooling",
      check: "lesson API transport",
      expected: `GET /api/lessons/${slug} returns an HTTP response without resetting the connection.`,
      actual: shortEvidence(error instanceof Error ? error.message : String(error)),
      repro: `GET /api/lessons/${slug}`
    });
    return null;
  }

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

function routeTitleVisibleTexts(lesson: LessonDetail) {
  const titlePrefix = (value: string) => value.split(/[:：]/)[0].trim();
  return Array.from(new Set([
    titlePrefix(lesson.title.en),
    titlePrefix(lesson.title.zh),
    lesson.title.en.trim(),
    lesson.title.zh.trim()
  ].filter(Boolean)));
}

async function visibleBodyText(page: Page, timeout = 5_000) {
  return await page.locator("body").innerText({ timeout }).catch(() => "");
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

function normalizePracticeOptionLabel(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\\,/g, " ")
    .replace(/\\text\{([^{}]+)\}/g, "$1")
    .replace(/\^\s*\{\s*([23])\s*\}/g, "^$1")
    .replace(/[²]/g, "^2")
    .replace(/[³]/g, "^3")
    .replace(/\s+\^/g, "^")
    .trim()
    .toLowerCase();
}

async function clickMatchingPracticeOption(card: Locator, correctOptionText: string) {
  const expected = normalizePracticeOptionLabel(correctOptionText);
  const buttons = card.locator("button");
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const labels = [
      await button.getAttribute("aria-label").catch(() => null),
      await button.innerText().catch(() => null)
    ];
    if (labels.some((label) => label !== null && normalizePracticeOptionLabel(label) === expected)) {
      await button.click();
      return true;
    }
  }

  return false;
}

async function readAttemptResponseBody(response: PageResponse) {
  return await response.json().catch((error) => ({
    error: `Could not parse attempt response JSON: ${String(error)}`
  })) as AttemptResponseBody;
}

async function responseFromAction(
  page: Page,
  predicate: (response: PageResponse) => boolean,
  action: () => Promise<unknown>,
  postActionTimeout = 15_000
) {
  let matchedResponse: PageResponse | null = null;
  let resolveMatch: ((response: PageResponse) => void) | null = null;
  const matchPromise = new Promise<PageResponse>((resolve) => {
    resolveMatch = resolve;
  });
  const listener = (response: PageResponse) => {
    if (matchedResponse) return;

    let matches = false;
    try {
      matches = predicate(response);
    } catch {
      matches = false;
    }
    if (!matches) return;

    matchedResponse = response;
    resolveMatch?.(response);
  };

  page.on("response", listener);
  try {
    // Keep listening for the whole action. On a resource-constrained mobile
    // render, Playwright actionability may take longer than the network round
    // trip timeout; starting that timeout before click() caused false misses.
    await action();
    if (matchedResponse) return matchedResponse;

    return await Promise.race<PageResponse | null>([
      matchPromise,
      page.waitForTimeout(postActionTimeout).then(() => null)
    ]);
  } finally {
    page.off("response", listener);
  }
}

async function centerControlInVisualViewport(page: Page, control: Locator) {
  const configuredViewportHeight = page.viewportSize()?.height ?? null;

  await control.evaluate(async (element, expectedViewportHeight) => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const rect = element.getBoundingClientRect();
      const visualViewportTop = Math.max(0, window.visualViewport?.offsetTop ?? 0);
      const candidateBottoms = [
        expectedViewportHeight,
        window.innerHeight,
        document.documentElement.clientHeight,
        window.visualViewport
          ? visualViewportTop + window.visualViewport.height
          : null
      ].filter((value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value > visualViewportTop
      );
      const viewportBottom = candidateBottoms.length > 0
        ? Math.min(...candidateBottoms)
        : visualViewportTop + 1;
      const targetCenter = visualViewportTop + (viewportBottom - visualViewportTop) / 2;
      const scrollDelta = rect.top + rect.height / 2 - targetCenter;

      if (Math.abs(scrollDelta) > 0.5) {
        window.scrollBy({ top: scrollDelta, behavior: "auto" });
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }
  }, configuredViewportHeight);
}

async function activateStableHitTarget(page: Page, control: Locator, label: string) {
  let previousProbe: { x: number; y: number; scrollY: number } | null = null;
  let consecutiveStableHits = 0;
  let latestProbe: {
    x: number;
    y: number;
    scrollY: number;
    hitMatches: boolean;
    hitTag: string | null;
    hitQuestionId: string | null;
    configuredViewportHeight: number | null;
    innerHeight: number;
    clientHeight: number;
    visualViewportHeight: number | null;
    visualViewportOffsetTop: number | null;
  } | null = null;
  const configuredViewportHeight = page.viewportSize()?.height ?? null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    latestProbe = await control.evaluate((element, expectedViewportHeight) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const hit = document.elementFromPoint(x, y);

      return {
        x,
        y,
        scrollY: window.scrollY,
        hitMatches: hit === element || element.contains(hit),
        hitTag: hit?.tagName.toLowerCase() ?? null,
        hitQuestionId: hit?.closest("[data-question-id]")?.getAttribute("data-question-id") ?? null,
        configuredViewportHeight: expectedViewportHeight,
        innerHeight: window.innerHeight,
        clientHeight: document.documentElement.clientHeight,
        visualViewportHeight: window.visualViewport?.height ?? null,
        visualViewportOffsetTop: window.visualViewport?.offsetTop ?? null
      };
    }, configuredViewportHeight);

    if (!latestProbe.hitMatches && attempt % 4 === 0) {
      previousProbe = null;
      consecutiveStableHits = 0;
      await centerControlInVisualViewport(page, control);
      await page.waitForTimeout(50);
      continue;
    }

    const geometryIsStable = previousProbe !== null &&
      Math.abs(previousProbe.x - latestProbe.x) <= 0.5 &&
      Math.abs(previousProbe.y - latestProbe.y) <= 0.5 &&
      Math.abs(previousProbe.scrollY - latestProbe.scrollY) <= 0.5;

    consecutiveStableHits = latestProbe.hitMatches && geometryIsStable
      ? consecutiveStableHits + 1
      : 0;

    if (consecutiveStableHits >= 2) {
      await control.evaluate((element) => {
        element.setAttribute("data-e2e-pointer-activation", "pending");
        element.addEventListener("click", () => {
          element.setAttribute("data-e2e-pointer-activation", "clicked");
        }, { once: true });
      });
      const hasTouch = await page.evaluate(() => navigator.maxTouchPoints > 0);
      const currentHitProbe = async () => await control.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          x,
          y,
          hitMatches: hit === element || element.contains(hit),
          hitTag: hit?.tagName.toLowerCase() ?? null
        };
      });

      if (hasTouch) {
        await page.touchscreen.tap(latestProbe.x, latestProbe.y);
        if (await control.getAttribute("data-e2e-pointer-activation") !== "clicked") {
          await page.waitForTimeout(100);
          await centerControlInVisualViewport(page, control);
          await page.waitForTimeout(100);
          const secondTouchProbe = await currentHitProbe();
          if (!secondTouchProbe.hitMatches) {
            throw new Error(`LESSON_POINTER_TARGET_AFTER_INPUT_DISMISS:${label}:${JSON.stringify(secondTouchProbe)}`);
          }
          await page.mouse.move(secondTouchProbe.x, secondTouchProbe.y);
          await page.mouse.down();
          await page.mouse.up();
        }
      } else {
        await page.mouse.move(latestProbe.x, latestProbe.y);
        await page.waitForTimeout(100);
        const hoveredProbe = await currentHitProbe();
        if (!hoveredProbe.hitMatches) {
          throw new Error(`LESSON_POINTER_TARGET_HOVER_DRIFT:${label}:${JSON.stringify(hoveredProbe)}`);
        }
        await page.mouse.move(hoveredProbe.x, hoveredProbe.y);
        await page.mouse.down();
        await page.mouse.up();
      }

      if (hasTouch && await control.getAttribute("data-e2e-pointer-activation") !== "clicked") {
        await control.focus();
        await page.keyboard.press("Enter");
      }
      const activation = await control.getAttribute("data-e2e-pointer-activation");
      if (activation !== "clicked") {
        throw new Error(`LESSON_POINTER_CLICK_NOT_DISPATCHED:${label}:${activation ?? "missing"}`);
      }
      return;
    }

    previousProbe = latestProbe;
    await page.waitForTimeout(50);
  }

  throw new Error(`LESSON_POINTER_TARGET_UNSTABLE:${label}:${JSON.stringify(latestProbe)}`);
}

async function withNodeDeadline<T>(operation: Promise<T>, label: string, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`LESSON_INTERACTION_DEADLINE:${label}:${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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

    if (await clickMatchingPracticeOption(card, correctOptionText)) {
      return "selected-normalized";
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
  const expectedQuestionCount = Math.min(lesson.practiceQuestions.length, 5);
  const stats = createQuestionSolvabilityStats(expectedQuestionCount);
  const practiceSection = page.locator("#lesson-practice");
  await page.evaluate(() => {
    document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
    document.body.style.setProperty("scroll-behavior", "auto", "important");
    window.scrollTo({ top: window.scrollY, behavior: "auto" });
  });
  const missionButtons = practiceSection.getByTestId("lesson-mission-trail").getByRole("button");
  const visiblePracticeCard = () => practiceSection.locator("article[data-question-id]:visible").filter({
    has: page.getByRole("button", { name: /^(Check answer|檢查答案|检查答案)$/i })
  }).first();
  if (expectedQuestionCount) {
    await expect(missionButtons).toHaveCount(expectedQuestionCount, { timeout: 5_000 }).catch(() => undefined);
    await visiblePracticeCard().waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);
  }

  const visitedQuestionIds = new Set<string>();

  for (let index = 0; index < expectedQuestionCount; index += 1) {
    const missionButton = missionButtons.nth(index);
    if (await withNodeDeadline(missionButton.count(), `practice-${index + 1}:mission-count`, 15_000) === 0) {
      const fallbackQuestion = lesson.practiceQuestions[index];
      stats.missingRenderedCard += 1;
      noteQuestionFailure(stats, fallbackQuestion?.id ?? `lesson-question-${index + 1}`);
      continue;
    }
    await withNodeDeadline(
      missionButton.click({ timeout: 10_000 }),
      `practice-${index + 1}:mission-click`,
      15_000
    );
    await visiblePracticeCard().waitFor({ state: "visible", timeout: 5_000 }).catch(() => undefined);

    const card = visiblePracticeCard();
    const questionId = await withNodeDeadline(
      card.getAttribute("data-question-id").catch(() => null),
      `practice-${index + 1}:question-id`,
      15_000
    );
    const fallbackQuestion = lesson.practiceQuestions[index];
    const sourceQuestion = questionId ? sourceQuestionById.get(questionId) : fallbackQuestion ? sourceQuestionById.get(fallbackQuestion.id) : null;
    if (!sourceQuestion) {
      stats.missingSourceRecord += 1;
      noteQuestionFailure(stats, questionId ?? fallbackQuestion?.id ?? `lesson-question-${index + 1}`);
      continue;
    }

    if (!questionId || visitedQuestionIds.has(questionId)) {
      stats.missingRenderedCard += 1;
      noteQuestionFailure(stats, sourceQuestion.id);
      continue;
    }
    visitedQuestionIds.add(questionId);

    try {
      await card.scrollIntoViewIfNeeded();

      const selection = await withNodeDeadline(
        selectStoredAnswer({ card, question: sourceQuestion, stats }),
        `practice-${index + 1}:${sourceQuestion.id}:select-answer`,
        20_000
      );
      if (!selection.startsWith("selected")) continue;

      const checkButton = card.getByRole("button", { name: /^(Check answer|檢查答案|检查答案)$/i }).first();
      await expect(checkButton).toBeEnabled({ timeout: 5_000 });
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      });
      await withNodeDeadline(
        centerControlInVisualViewport(page, checkButton),
        `practice-${index + 1}:${sourceQuestion.id}:center-submit-control`,
        15_000
      );
      await expect(checkButton).toBeInViewport({ ratio: 1, timeout: 5_000 });
      const response = await withNodeDeadline(
        responseFromAction(page, (response) => {
          const postData = response.request().postData() ?? "";
          return response.url().includes("/api/attempts") &&
            response.request().method() === "POST" &&
            postData.includes(`"questionId":"${sourceQuestion.id}"`);
        }, () => activateStableHitTarget(page, checkButton, `practice-${index + 1}:${sourceQuestion.id}:submit-control`)),
        `practice-${index + 1}:${sourceQuestion.id}:submit-response`,
        30_000
      );
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
      await expect(card.getByText(/^(Correct\b|正確|正确)/i).first()).toBeVisible({ timeout: 5_000 }).catch(() => {
        stats.wrongFeedback += 1;
        noteQuestionFailure(stats, sourceQuestion.id);
      });
    } catch (error) {
      stats.wrongFeedback += 1;
      noteQuestionFailure(stats, sourceQuestion.id);
      throw error;
    }

  }

  return stats;
}

async function completeLessonProbe(page: Page, grade: GradeId) {
  const checkbox = page.locator('aside input[type="checkbox"]').first();
  if (await checkbox.count() === 0) return "missing-checklist-checkbox";
  await checkbox.check();

  const completeButton = page.getByRole("button", {
    name: /Mark lesson complete|標記課節完成|标记课时完成/i
  }).first();
  await expect(completeButton).toBeEnabled({ timeout: 5_000 });
  const response = await responseFromAction(page, (response) => {
    return response.url().includes("/api/lesson-progress") &&
      response.request().method() === "POST" &&
      (response.request().postData() ?? "").includes('"complete"');
  }, () => completeButton.click());
  if (!response) return "missing-complete-response";
  if (!response.ok()) return `complete-response-${response.status()}`;

  const body = await response.json().catch(() => null) as LessonResponse | null;
  if (body?.lesson?.status !== "completed") {
    return `complete-status-${body?.lesson?.status ?? "missing"}`;
  }
  if (!Number.isFinite(body.lesson.mastery) || body.lesson.mastery < 85) {
    return `complete-mastery-${String(body.lesson.mastery)}`;
  }

  if (grade.startsWith("P")) {
    await expect(page.getByText(/^(Lesson complete|課節已完成|课时已完成)$/i).first()).toBeVisible({ timeout: 5_000 });
  } else {
    await expect(page.getByText(/(?:Mastery:\s*|掌握度[：:]\s*)(85|8[6-9]|9\d|100)%/i).first()).toBeVisible({ timeout: 5_000 });
  }
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
  let response = await page.goto(row.route, { waitUntil: "domcontentloaded" }).catch(() => null);
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

  const titleTexts = routeTitleVisibleTexts(lesson);
  const waitForExpectedLessonContent = () => page.waitForFunction(
    (titles: string[]) =>
      titles.some((title) => document.body.innerText.includes(title)) ||
      document.body.innerText.includes("Lesson not found"),
    titleTexts,
    { timeout: 10_000 }
  ).catch(() => undefined);
  await waitForExpectedLessonContent();

  let bodyText = await visibleBodyText(page);
  const hasExpectedTitle = () => titleTexts.some((title) => bodyText.includes(title));
  const hasNotFoundState = () => /Lesson not found|This page is not available/i.test(bodyText);

  // A long sequential sweep can occasionally observe a successful navigation
  // before the new document paints any body text. Revisit that exact route once
  // and then apply every normal P0/P1/P2 assertion to the final observation.
  // A second empty/missing-title render still fails closed below.
  if (!response || response.status() >= 500 || (!hasExpectedTitle() && !hasNotFoundState())) {
    await page.waitForTimeout(250);
    response = await page.goto(row.route, { waitUntil: "domcontentloaded" }).catch(() => null);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    await waitForExpectedLessonContent();
    bodyText = await visibleBodyText(page, 30_000);
  }
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

  if (!titleTexts.some((title) => bodyText.includes(title))) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P0",
      owner: "S05 lesson",
      check: "lesson page loaded content",
      expected: `Rendered page includes one localized lesson title: ${titleTexts.map((title) => `"${title}"`).join(", ")}.`,
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

  const invalidRenderedToken = invalidUserFacingTextToken(bodyText);
  if (invalidRenderedToken) {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "rendered invalid tokens",
      expected: "Rendered lesson text does not include NaN or an undefined placeholder/leak.",
      actual: shortEvidence(invalidRenderedToken),
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

  const completion = await completeLessonProbe(page, lesson.grade).catch((error) => `error-${String(error)}`);
  row.checks.push(`complete:${completion}`);
  if (completion !== "completed") {
    addFinding(findings, {
      route: row.route,
      slug: row.slug,
      severity: "P1",
      owner: "S05 lesson",
      check: "lesson completion interaction",
      expected: "Checklist can be toggled, the API returns completed with mastery at least 85%, and the grade-appropriate completion card updates.",
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
    const targets = lessonTargets();
    test.setTimeout(Math.max(900_000, targets.length * 60_000));

    const findings: Finding[] = [];
    const rows: LessonRouteRow[] = [];
    const screenshotBudget = { count: 5 };
    const slugs = targets.map((target) => target.slug);
    const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index);

    const mainlandHighTargets = targets.filter((target) => target.curriculumTrack === "MAINLAND_PEP_HIGH");
    const hongKongTargets = targets.filter((target) => target.curriculumTrack === "HK");

    const isFullLessonInventoryRun =
      requestedLessonQaSlugs.size === 0 &&
      requestedLessonQaOffset === 0 &&
      requestedLessonQaLimit === null;

    if (isFullLessonInventoryRun && (hongKongTargets.length === 0 || mainlandHighTargets.length !== 22)) {
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

    const rootResponse = await page.request.get("/lesson", { maxRedirects: 0 });
    const rootLocation = rootResponse.headers()["location"] ?? "";
    if (![307, 308].includes(rootResponse.status()) || !rootLocation.endsWith(studentLessonsPath)) {
      addFinding(findings, {
        route: "/lesson",
        severity: "P1",
        owner: "S05 lesson",
        check: "legacy lesson index redirect",
        expected: "`/lesson` permanently redirects to `/student/lessons`.",
        actual: `${rootResponse.status()} ${rootResponse.statusText()} location=${rootLocation || "(missing)"} ${await responseText(rootResponse)}`,
        repro: "Open /lesson."
      });
    }

    const lessons = new Map<string, LessonDetail>();
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    const exercisedModules = new Set<string>();
    const reportDir = path.join(process.cwd(), "output", "playwright", "lesson-qa");
    const reportPath = path.join(reportDir, `lesson-qa-results-${testInfo.project.name}.json`);
    const writeReport = async () => {
      const questionSolvability = mergeQuestionSolvabilityStats(rows.map((row) => row.questionSolvability));
      const reportBody = JSON.stringify({ rows, questionSolvability, findings }, null, 2);
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportPath, reportBody);
      return { questionSolvability, reportBody };
    };
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
          await writeReport();
          continue;
        }

        const routeFindingCountBefore = findings.length;
        try {
          await withNodeDeadline(
            validateLessonPage({
              exercisedModules,
              findings,
              lesson,
              page,
              row,
              screenshotBudget,
              testInfo
            }),
            `${testInfo.project.name}:${target.slug}`,
            180_000
          );
        } catch (error) {
          const actual = error instanceof Error ? error.message : String(error);
          addFinding(findings, {
            route: row.route,
            slug: row.slug,
            severity: "P1",
            owner: "S05 lesson",
            check: "bounded lesson interaction completion",
            expected: "All page, completion, practice, and visualization probes finish within 180 seconds.",
            actual,
            repro: `Open ${row.route} on ${testInfo.project.name} and run the complete lesson interaction probe.`
          });
          row.status = "fail";
          row.checks.push(`browser:interaction-error:${shortEvidence(actual)}`);
          row.findings = findings.length - routeFindingCountBefore;
          await writeReport();
          throw error;
        }
        await writeReport();
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
        route: "/student/lessons/[lessonSlug]",
        severity: "P2",
        owner: "S06 visualization",
        check: "distinct visualization module coverage",
        expected: "Each distinct lesson visualization module is exercised at least once.",
        actual: `Unexercised: ${unexercisedModules.join(", ")}`,
        repro: "Run the all-lessons browser sweep and inspect visualization interaction rows."
      });
    }

    const { reportBody } = await writeReport();

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
