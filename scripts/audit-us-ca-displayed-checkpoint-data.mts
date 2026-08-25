#!/usr/bin/env node
/**
 * Authenticated browser gate for the nine California checkpoint questions whose
 * answer depends on a picture graph, bar graph, or line plot. Reconstruct the
 * real five-question lesson surface, then require the browser DOM to expose the
 * exact deterministic display and its data-derived accessible description.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { usCaliforniaQuestions } from "@/data/usCaliforniaQuestions";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { questionDiagramAltText } from "@/lib/questionFigure";
import type { PublicQuestion, Question } from "@/types";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.BASE_URL ?? "http://localhost:3318";
const userId = process.env.QA_USER_ID ?? "student-shirleen-us";
const viewport = {
  width: Number(process.env.VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.VIEWPORT_HEIGHT ?? 900)
};
const displayByQuestionId = new Map<string, "picture-graph" | "bar-graph" | "line-plot">([
  ["ccss-textbook-practice-v1-picture-graph-q01", "picture-graph"],
  ["ccss-textbook-practice-v1-picture-graph-q02", "picture-graph"],
  ["ccss-textbook-practice-v1-bar-graph-q01", "bar-graph"],
  ["ccss-textbook-practice-v1-bar-graph-q02", "bar-graph"],
  ["ccss-textbook-practice-v1-measure-line-plot-q01", "line-plot"],
  ["ccss-textbook-practice-v1-measure-line-plot-q02", "line-plot"],
  ["ccss-textbook-practice-v1-line-plot-operations-q01", "line-plot"],
  ["ccss-textbook-practice-v1-line-plot-operations-q02", "line-plot"],
  ["ccss-textbook-practice-v1-line-plot-operations-q03", "line-plot"]
]);
const questionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));
const handwritingCapableTypes = new Set<PublicQuestion["type"]>(["fill-in", "short-answer", "graph"]);

function displayedQuestions(topicId: string) {
  const seed = usCaliforniaLessonSeeds.find((candidate) => candidate.topicId === topicId);
  assert.ok(seed, `missing California lesson seed ${topicId}`);
  const linked = (seed.practiceQuestionIds ?? []).map((questionId) => {
    const question = questionById.get(questionId);
    assert.ok(question, `${topicId} links missing question ${questionId}`);
    return question;
  });
  const deduped = dedupePracticeQuestions(linked);
  const selected = deduped.slice(0, 5);
  const handwritingQuestion = deduped.find((question) => handwritingCapableTypes.has(question.type));
  if (selected.some((question) => handwritingCapableTypes.has(question.type)) || !handwritingQuestion) return selected;
  return [...selected.slice(0, 4), handwritingQuestion];
}

const routeByQuestionId = new Map<string, { topicId: string; question: Question; index: number }>();
for (const seed of usCaliforniaLessonSeeds) {
  displayedQuestions(seed.topicId).forEach((question, index) => {
    if (displayByQuestionId.has(question.id)) routeByQuestionId.set(question.id, { topicId: seed.topicId, question, index });
  });
}
assert.equal(routeByQuestionId.size, displayByQuestionId.size, "all nine data-display checkpoints must remain on the exact 380-slot lesson surface");

const { createSessionToken, SESSION_COOKIE_NAME } = await import(path.join(root, "lib/session.ts"));
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport });
await context.addCookies([{
  name: SESSION_COOKIE_NAME,
  value: await createSessionToken(userId),
  url: base,
  httpOnly: true,
  sameSite: "Lax"
}]);
const page = await context.newPage();
const pageErrors: string[] = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const topicIds = Array.from(new Set(Array.from(routeByQuestionId.values()).map(({ topicId }) => topicId)));
  for (const topicId of topicIds) {
    const expectedPath = `/student/lessons/${topicId}`;
    await page.goto(`${base}${expectedPath}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    assert.equal(new URL(page.url()).pathname, expectedPath, `${topicId}: authenticated session did not land on the lesson`);
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 90_000 });

    const targets = Array.from(routeByQuestionId.entries())
      .filter(([, route]) => route.topicId === topicId)
      .sort((left, right) => left[1].index - right[1].index);
    for (const [questionId, { question, index }] of targets) {
      assert.ok(question.diagram?.kind === "data-display", `${questionId}: runtime question lost its data-display diagram`);
      const expectedDisplay = displayByQuestionId.get(questionId);
      const article = page.locator(`article[data-question-id="${questionId}"]`);
      const missionTrail = page.getByTestId("lesson-mission-trail");
      await missionTrail.waitFor({ state: "visible", timeout: 90_000 });
      await page.waitForFunction(
        (buttonIndex) => {
          const button = document.querySelectorAll('[data-testid="lesson-mission-trail"] button')[buttonIndex];
          return button instanceof HTMLElement && Object.getOwnPropertyNames(button).some(
            (name) => name.startsWith("__reactProps$") || name.startsWith("__reactFiber$")
          );
        },
        index,
        { timeout: 90_000 }
      );
      await missionTrail.getByRole("button").nth(index).click();
      await article.waitFor({ state: "visible", timeout: 90_000 });
      assert.equal(await article.count(), 1, `${questionId}: expected one visible checkpoint card`);
      const figure = article.locator(`[role="img"][data-question-diagram="data-display"][data-display="${expectedDisplay}"]`);
      assert.equal(await figure.count(), 1, `${questionId}: expected one deterministic ${expectedDisplay} wrapper`);
      assert.equal(await figure.getAttribute("aria-label"), questionDiagramAltText(question.diagram).en, `${questionId}: accessible description drifted from checked data`);
      const svg = figure.locator('svg[aria-hidden="true"][focusable="false"]');
      assert.equal(await svg.count(), 1, `${questionId}: expected one visible deterministic SVG`);
      const box = await svg.boundingBox();
      assert.ok(box && box.width > 100 && box.height > 80, `${questionId}: data display has no meaningful rendered area`);
    }

    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth
    }));
    assert.ok(width.scroll <= width.client + 2, `${topicId}: page overflows horizontally at ${viewport.width}px`);
  }

  assert.deepEqual(pageErrors, [], `checkpoint routes raised browser exceptions:\n${pageErrors.join("\n")}`);
  console.log(`audit-us-ca-displayed-checkpoint-data: ${routeByQuestionId.size} graph checkpoints across ${topicIds.length} lesson pages at ${viewport.width}×${viewport.height}`);
  console.log("✓ every displayed graph is deterministic, visible, data-derived, and accessibly described");
} finally {
  await browser.close();
}
