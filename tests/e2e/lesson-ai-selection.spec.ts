import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginAsDemoStudentApi } from "./helpers";

test.setTimeout(60_000);

async function selectTextInside(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.evaluate((element) => {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    const textNode = walker.nextNode();
    if (!textNode?.textContent) throw new Error("No selectable text found.");

    const range = document.createRange();
    const startOffset = textNode.textContent.search(/\S/);
    const endOffset = Math.min(textNode.textContent.length, Math.max(startOffset + 12, startOffset + 36));
    range.setStart(textNode, Math.max(0, startOffset));
    range.setEnd(textNode, endOffset);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
}

async function dismissLearnerStartSetup(page: Page) {
  const setupDialog = page.getByRole("dialog", { name: /开始方式|開始方式/i }).first();
  if (await setupDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press("Escape");
    await expect(setupDialog).toBeHidden({ timeout: 5000 });
  }
}

async function suppressLearnerStartSetup(page: Page) {
  await page.route("**/api/me/learner-profile", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ shouldShowOnboarding: false })
      });
      return;
    }

    await route.continue();
  });
}

function expectSelectionPayload(payload: Record<string, unknown> | null) {
  expect(payload).toBeTruthy();
  const context = payload?.context as Record<string, unknown> | undefined;
  expect(context).toBeTruthy();
  expect(payload?.selectedText).toEqual(expect.any(String));
  expect(String(payload?.selectedText)).not.toHaveLength(0);
  expect(payload?.surface).toBe("lesson");
  expect(context?.lessonSlug).toEqual(expect.any(String));
  expect(context?.topicId).toEqual(expect.any(String));
  return { payload: payload as Record<string, unknown>, context };
}

async function openCurrentLesson(page: Page) {
  await suppressLearnerStartSetup(page);
  await page.goto("/student/lessons");
  await expect(page.locator("[data-ai-selectable='lesson-block']").first()).toBeVisible({ timeout: 20000 });
  await dismissLearnerStartSetup(page);
}

test("student can ask Nova about selected lesson text with personalized scopes", async ({ page }) => {
  await loginAsDemoStudentApi(page);
  let capturedPayload: Record<string, unknown> | null = null;
  let aiTutorPostCount = 0;

  await page.route("**/api/nova-lens/runs", async (route) => {
    capturedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "nova-lens",
        status: "completed",
        runId: "run-lesson",
        reply: "Mocked selected lesson explanation.",
        context: {
          mode: "concept",
          title: "Mocked lesson context",
          topicId: "quadratic-functions",
          lessonSlug: "quadratic-functions",
          dataScopes: ["student-dashboard", "adaptive-engine"],
          selection: {
            selectedText: "Mocked selected text",
            helpType: "why-step",
            lessonSlug: "quadratic-functions",
            topicId: "quadratic-functions"
          }
        }
      })
    });
  });
  await page.route("**/api/ai-tutor", async (route) => {
    if (route.request().method() === "POST") aiTutorPostCount += 1;
    await route.continue();
  });

  await openCurrentLesson(page);
  await selectTextInside(page.locator("[data-ai-selectable='lesson-block']").first());

  const popover = page.getByTestId("lesson-ai-selection-popover");
  await expect(popover).toBeVisible();
  await page.getByTestId("lesson-ai-help-why-step").click({ force: true });

  const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor|Nova 導師|Nova 导师/i });
  await expect(tutorPanel.getByText("Mocked selected lesson explanation.", { exact: true })).toBeVisible({ timeout: 10000 });

  const payload = capturedPayload as Record<string, unknown> | null;
  const { context, payload: novaPayload } = expectSelectionPayload(payload);
  expect(novaPayload.action).toBe("why-step");
  expect(context?.blockId).toEqual(expect.any(String));
  expect(aiTutorPostCount).toBe(0);
});

test("student can ask Nova about selected practice question text with questionId", async ({ page }) => {
  await loginAsDemoStudentApi(page);
  let capturedPayload: Record<string, unknown> | null = null;

  await page.route("**/api/nova-lens/runs", async (route) => {
    capturedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "nova-lens",
        status: "completed",
        runId: "run-question",
        reply: "Mocked selected question explanation.",
        context: {
          mode: "question",
          title: "Mocked question context",
          topicId: "quadratic-functions",
          questionId: "question-1",
          lessonSlug: "quadratic-functions",
          dataScopes: ["student-dashboard", "adaptive-engine"],
          selection: {
            selectedText: "Mocked selected question",
            helpType: "explain",
            lessonSlug: "quadratic-functions",
            topicId: "quadratic-functions",
            questionId: "question-1"
          }
        }
      })
    });
  });

  await openCurrentLesson(page);
  const question = page.locator("[data-ai-selectable='practice-question']").first();
  await question.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await selectTextInside(question);

  await expect(page.getByTestId("lesson-ai-selection-popover")).toBeVisible();
  await page.getByTestId("lesson-ai-help-explain").click({ force: true });

  const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor|Nova 導師|Nova 导师/i });
  await expect(tutorPanel.getByText("Mocked selected question explanation.", { exact: true })).toBeVisible({ timeout: 10000 });

  const payload = capturedPayload as Record<string, unknown> | null;
  const { context, payload: novaPayload } = expectSelectionPayload(payload);
  expect(novaPayload.action).toBe("explain");
  expect(context?.questionId).toEqual(expect.any(String));
});

test("guest lesson selection is gated before content renders", async ({ page }) => {
  await suppressLearnerStartSetup(page);
  await page.goto("/student/lessons");
  await expect(page).toHaveURL(/\/login\?next=%2Fstudent%2Flessons/);
  await expect(page.locator("[data-ai-selectable='lesson-block']")).toHaveCount(0);
});

test("student can use Nova Tutor from the practice surface", async ({ page }) => {
  await suppressLearnerStartSetup(page);
  await loginAsDemoStudentApi(page);
  let capturedPayload: Record<string, unknown> | null = null;

  await page.route("**/api/nova-lens/runs", async (route) => {
    capturedPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mode: "nova-lens",
        status: "completed",
        runId: "run-practice",
        reply: "Mocked practice surface explanation.",
        context: {
          mode: "general",
          title: "Practice Arena",
          dataScopes: ["student-dashboard", "adaptive-engine"],
          selection: {
            selectedText: "Mocked practice selection",
            helpType: "explain"
          }
        }
      })
    });
  });

  await page.goto("/practice");
  const heading = page.getByRole("heading", { name: /Practice Arena|练习|練習/i }).first();
  await expect(heading).toBeVisible({ timeout: 20000 });
  await selectTextInside(heading);

  await expect(page.getByTestId("lesson-ai-selection-popover")).toBeVisible();
  await page.getByTestId("lesson-ai-help-explain").click({ force: true });

  const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor|Nova 導師|Nova 导师/i });
  await expect(tutorPanel.getByText("Mocked practice surface explanation.", { exact: true })).toBeVisible({ timeout: 10000 });
  const payload = capturedPayload as Record<string, unknown> | null;
  expect(payload?.surface).toBe("practice");
  expect(payload?.selectedText).toEqual(expect.any(String));
});
