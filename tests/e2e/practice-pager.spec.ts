import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { choosePracticeModeIfVisible, isTransientApiTransportError, openPracticeFiltersPanel, uniqueSuffix } from "./helpers";

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

type HandwritingRecognitionPayload = {
  strokes?: unknown[];
  imageDataUrl?: string;
  language?: string;
};

function practiceRegion(page: Page) {
  return page.getByRole("region", { name: /Practice questions/i });
}

async function chooseGuidedUnitExercise(page: Page) {
  const guidedButton = page.getByRole("button", { name: /Choose Unit Exercise/i });
  await expect(guidedButton).toBeVisible();
  await expect(guidedButton).toBeEnabled();
  await guidedButton.click();
  await expect(page.locator('[data-practice-mode="unit"]')).toHaveCount(1);
}

async function chooseFreeExploration(page: Page) {
  const exploreButton = page.getByRole("button", { name: /Choose Free Exploration/i });
  await expect(exploreButton).toBeVisible();
  await exploreButton.click();
  await expect(page.locator('[data-practice-mode="explore"]')).toHaveCount(1);
}

async function registerStudentThroughApi(
  page: Page,
  testInfo: TestInfo,
  label: string,
  grade = "S3",
  language: "en" | "zh" | "zh-Hans" = "en",
  theme: "light" | "dark" = "dark"
) {
  const suffix = uniqueSuffix(testInfo);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.request.post("/api/auth/register", {
        data: {
          name: `Pager ${label} ${suffix}`,
          username: `pager-${label}-${suffix}-${attempt}@example.test`,
          password: "start12345",
          grade,
          curriculumTrack: "HK",
          language,
          theme
        }
      });
      expect(response.ok(), `student API registration failed with ${response.status()}: ${await response.text()}`).toBeTruthy();
      return await response.json() as AuthenticatedResponse;
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isTransientApiTransportError(error)) throw error;
      await page.waitForTimeout(350 * attempt);
    }
  }

  throw lastError;
}

async function readPageHtmlWithTransientRetry(page: Page, path: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.request.get(path);
      expect(response.ok(), `HTML evidence request failed with ${response.status()}`).toBeTruthy();
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isTransientApiTransportError(error)) throw error;
      await page.waitForTimeout(350 * attempt);
    }
  }

  throw lastError;
}

async function unlockFreeSelection(page: Page, userId: string, grade = "S3") {
  const response = await page.request.get(`/api/adaptive-learning/next?grade=${grade}`);
  expect(response.ok()).toBeTruthy();
  const { decision } = await response.json() as PracticeDecisionResponse;

  await page.evaluate(({ nextUserId, skillId }) => {
    window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${nextUserId}:${skillId}`, "true");
  }, { nextUserId: userId, skillId: decision.skill.id });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await choosePracticeModeIfVisible(page, "explore");
  await openPracticeFiltersPanel(page);

  // Students practise at their own grade: Practice Arena locks the grade to the
  // signed-in student's profile, so the filter panel offers no Grade select. The
  // round is already scoped to `grade` because the student was registered with it.
  await expect(page.getByRole("combobox", { name: /Grade/i })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
}

async function expectQuestion(page: Page, current: number, total?: number) {
  const pattern = total ? new RegExp(`Question ${current} of ${total}`, "i") : new RegExp(`Question ${current} of \\d+`, "i");
  await expect(practiceRegion(page).getByText(pattern)).toBeVisible();
}

async function currentQuestionCount(page: Page) {
  const value = await practiceRegion(page).getByRole("spinbutton", { name: /Jump to/i }).getAttribute("max");
  const count = Number(value);
  expect(Number.isFinite(count)).toBeTruthy();
  expect(count).toBeGreaterThan(1);
  return count;
}

async function missionTrailLabels(page: Page) {
  return await page.getByTestId("mission-trail").getByRole("button").evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute("aria-label") ?? "")
  );
}

async function practiceRewardLabel(page: Page) {
  const reward = practiceRegion(page).locator('[aria-label*="stars earned so far"]').first();
  await expect(reward).toBeVisible();
  return await reward.getAttribute("aria-label");
}

async function visiblePracticeCardState(page: Page) {
  const card = page.locator("article:visible").first();
  const feedback = (await card.getByText(/Correct|Not yet/i).first().textContent())?.trim() ?? "";
  const textbox = card.getByRole("textbox").first();
  const selectedAnswer = await textbox.isVisible().catch(() => false)
    ? await textbox.inputValue()
    : await card.locator("button.border-cyan-400").first().getAttribute("aria-label") ?? "";

  return { feedback, selectedAnswer };
}

async function answerFirstFourQuestions(page: Page, answerPrefix: string) {
  const total = await currentQuestionCount(page);
  expect(total).toBe(5);
  let firstCardState: Awaited<ReturnType<typeof visiblePracticeCardState>> | null = null;

  for (let questionNumber = 1; questionNumber <= 4; questionNumber += 1) {
    await expectQuestion(page, questionNumber, total);
    await makeVisibleQuestionAnswerable(page, `${answerPrefix}-${questionNumber}`);
    await submitVisibleQuestion(page);
    if (questionNumber === 1) firstCardState = await visiblePracticeCardState(page);

    if (questionNumber < 4) {
      await page.getByTestId("mission-trail").getByRole("button").nth(questionNumber).click();
      await expectQuestion(page, questionNumber + 1, total);
    }
  }

  expect(firstCardState).not.toBeNull();
  return firstCardState!;
}

async function expectCompletedRoundMatchesReward(page: Page, answerKind: "personalized" | "free-selection") {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(new RegExp(`5 ${answerKind} answers checked`, "i"));
  const scoreText = (await dialog.getByText(/\d+\/5 correct/i).textContent())?.trim() ?? "";
  const correctCount = Number.parseInt(scoreText.split("/")[0] ?? "", 10);
  expect(Number.isFinite(correctCount)).toBeTruthy();
  expect(await practiceRewardLabel(page)).toBe(`${correctCount} of 5 stars earned so far`);
}

async function makeVisibleQuestionAnswerable(page: Page, typedAnswer = "not the answer") {
  const card = page.locator("article:visible").first();
  await expect(card).toBeVisible();
  const textbox = card.getByRole("textbox").first();

  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(typedAnswer);
  } else {
    await card.locator("button").filter({ hasNotText: /Check Answer|Reset|Read aloud|Stop|讀給我聽|读给我听|停止/i }).first().click();
  }

  await expect(card.getByRole("button", { name: /check answer/i })).toBeEnabled();
  return card;
}

async function submitVisibleQuestion(page: Page) {
  const card = page.locator("article:visible").first();
  await card.getByRole("button", { name: /check answer/i }).click();
  await expect(card.getByText(/Correct|Not yet/i).first()).toBeVisible();
  return card;
}

async function drawDraftStroke(page: Page, canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Handwriting canvas was not visible.");

  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.32);
  await page.mouse.up();
}

async function drawStrokePath(page: Page, box: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>, points: Array<{ x: number; y: number }>) {
  const [startPoint, ...remainingPoints] = points;
  await page.mouse.move(box.x + box.width * startPoint.x, box.y + box.height * startPoint.y);
  await page.mouse.down();

  for (const point of remainingPoints) {
    await page.mouse.move(box.x + box.width * point.x, box.y + box.height * point.y, { steps: 5 });
  }

  await page.mouse.up();
}

async function drawNumericDraft25(page: Page, canvas: Locator) {
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Handwriting canvas was not visible.");

  await drawStrokePath(page, box, [
    { x: 0.16, y: 0.24 },
    { x: 0.23, y: 0.18 },
    { x: 0.31, y: 0.2 },
    { x: 0.35, y: 0.32 },
    { x: 0.29, y: 0.45 },
    { x: 0.16, y: 0.68 },
    { x: 0.36, y: 0.7 }
  ]);
  await drawStrokePath(page, box, [
    { x: 0.68, y: 0.2 },
    { x: 0.52, y: 0.2 },
    { x: 0.52, y: 0.43 },
    { x: 0.63, y: 0.42 },
    { x: 0.7, y: 0.53 },
    { x: 0.68, y: 0.67 },
    { x: 0.59, y: 0.74 },
    { x: 0.51, y: 0.7 }
  ]);
}

async function expectNoOverlap(first: Locator, second: Locator) {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  if (!firstBox || !secondBox) throw new Error("Expected visible elements for overlap check.");

  const overlaps =
    firstBox.x < secondBox.x + secondBox.width &&
    firstBox.x + firstBox.width > secondBox.x &&
    firstBox.y < secondBox.y + secondBox.height &&
    firstBox.y + firstBox.height > secondBox.y;
  expect(overlaps).toBe(false);
}

async function setAnswerValue(answer: Locator, value: string, cursorPosition = value.length) {
  await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement, nextValue) => {
    const prototype = Object.getPrototypeOf(element) as HTMLInputElement | HTMLTextAreaElement;
    const valueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    valueSetter?.call(element, nextValue);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await expect(answer).toHaveValue(value);
  await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement, position) => {
    element.focus();
    element.setSelectionRange(position, position);
  }, cursorPosition);
}

async function selectAnswerText(answer: Locator) {
  await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement) => {
    element.focus();
    element.setSelectionRange(0, element.value.length);
  });
}

async function cursorPosition(answer: Locator) {
  return await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement) => element.selectionStart ?? 0);
}

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1);
}

async function expectKeyboardButtonsDoNotOverlap(keyboard: Locator) {
  const boxes = await keyboard.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        label: button.getAttribute("aria-label") ?? button.textContent ?? ""
      };
    })
  );

  for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
      const first = boxes[firstIndex];
      const second = boxes[secondIndex];
      const overlaps =
        first.x < second.x + second.width - 1 &&
        first.x + first.width > second.x + 1 &&
        first.y < second.y + second.height - 1 &&
        first.y + first.height > second.y + 1;
      expect(overlaps, `${first.label} overlapped ${second.label}`).toBe(false);
    }
  }
}

async function openMathKeyboardForFillIn(page: Page, testInfo: TestInfo) {
  const session = await registerStudentThroughApi(page, testInfo, "keyboard", "S1");
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await unlockFreeSelection(page, session.user.id, "S1");
  await page.getByRole("combobox", { name: /Question type/i }).selectOption("fill-in");
  await expectQuestion(page, 1);

  const card = page.locator("article:visible").first();
  await card.getByRole("button", { name: /Math keyboard/i }).click();
  const keyboard = card.getByRole("group", { name: /Math soft keyboard/i });
  const answer = card.getByRole("textbox").first();
  await expect(keyboard).toBeVisible();
  await expect(answer).toBeVisible();
  return { card, keyboard, answer };
}

async function selectKeyboardTab(keyboard: Locator, tabName: string) {
  const tab = keyboard.getByRole("tab", { name: tabName, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

async function pressSoftKey(keyboard: Locator, tabName: string, keyName: string | RegExp) {
  await selectKeyboardTab(keyboard, tabName);
  const options = typeof keyName === "string"
    ? { name: keyName, exact: true }
    : { name: keyName };
  await keyboard.getByRole("tabpanel").getByRole("button", options).click();
}

async function findVisibleLessonPracticeCard(page: Page, text: RegExp, maxSteps = 5) {
  // The practice pager loads after the lesson shell; without this gate the
  // instant isVisible() checks below can page past the target question
  // before its card has rendered. Scoped to main because lesson pages keep a
  // hidden SSR copy of the pager outside it.
  await expect(
    page.getByRole("main").getByText(/Question \d+ of \d+|第\s*\d+\s*[題题]，共\s*\d+\s*[題题]/i).first()
  ).toBeVisible();

  for (let step = 0; step < maxSteps; step += 1) {
    const card = page.locator("article:visible").filter({ hasText: text }).first();
    if (await card.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) return card;

    const nextButton = page.getByRole("button", { name: /Next question|下一[題题]/i });
    if (!await nextButton.isEnabled().catch(() => false)) break;
    await nextButton.click();
  }

  throw new Error(`Could not find visible lesson practice card matching ${text}`);
}

test.describe("Practice Arena question pager", () => {
  test("a new locked student can use Explore's main, Question Cavern, and Challenge Shore entries", async ({ page }, testInfo) => {
    test.slow();

    const session = await registerStudentThroughApi(page, testInfo, "locked-explore");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate((userId) => {
      const prefix = `hk-math-practice-free-selection-unlocked:${userId}:`;
      return Object.keys(window.localStorage).some((key) => key.startsWith(prefix));
    }, session.user.id)).toBe(false);

    await chooseFreeExploration(page);
    await openPracticeFiltersPanel(page);
    const topicFilter = page.getByRole("combobox", { name: /Topic/i });
    await expect(topicFilter).toHaveValue("all");
    await page.getByRole("button", { name: /^Start Mission$/i }).click();
    await expect(page.locator("#free-selection")).toBeVisible();
    await expect(topicFilter).not.toHaveValue("all");
    await expectQuestion(page, 1, 5);

    await topicFilter.selectOption("all");
    await page.locator('[data-island-region-chip="question-cavern"]').click();
    await expect(topicFilter).not.toHaveValue("all");
    await expect(page.locator("#free-selection")).toBeVisible();
    await expectQuestion(page, 1, 5);

    await page.locator('[data-island-region-chip="challenge-shore"]').click();
    await expect(topicFilter).toHaveValue("all");
    await expect(page.locator("#free-selection")).toBeVisible();
    await expectQuestion(page, 1, 5);
  });

  test("Guided mode round trips preserve card, trail, reward, and summary state", async ({ page }, testInfo) => {
    test.slow();

    await registerStudentThroughApi(page, testInfo, "guided-round-trip");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await chooseGuidedUnitExercise(page);

    const firstCardState = await answerFirstFourQuestions(page, "guided-round-trip");
    const trailBefore = await missionTrailLabels(page);
    const rewardBefore = await practiceRewardLabel(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.locator("[data-choose-practice-mode]").click();
    await expect(page.locator('[data-practice-mode="chooser"]')).toBeVisible();
    await chooseGuidedUnitExercise(page);

    await expectQuestion(page, 5, 5);
    expect(await missionTrailLabels(page)).toEqual(trailBefore);
    expect(await practiceRewardLabel(page)).toBe(rewardBefore);
    await page.getByTestId("mission-trail").getByRole("button").first().click();
    await expectQuestion(page, 1, 5);
    expect(await visiblePracticeCardState(page)).toEqual(firstCardState);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByTestId("mission-trail").getByRole("button").nth(4).click();
    await expectQuestion(page, 5, 5);
    await makeVisibleQuestionAnswerable(page, "guided-round-trip-5");
    await submitVisibleQuestion(page);
    await expectCompletedRoundMatchesReward(page, "personalized");
  });

  test("Explore mode round trips preserve card, trail, reward, and summary state", async ({ page }, testInfo) => {
    test.slow();

    const session = await registerStudentThroughApi(page, testInfo, "explore-round-trip");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id);

    const firstCardState = await answerFirstFourQuestions(page, "explore-round-trip");
    const trailBefore = await missionTrailLabels(page);
    const rewardBefore = await practiceRewardLabel(page);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.locator("[data-adjust-practice]").click();
    await expect(page.locator('[data-practice-mode="chooser"]')).toBeVisible();
    await chooseFreeExploration(page);

    await expectQuestion(page, 5, 5);
    expect(await missionTrailLabels(page)).toEqual(trailBefore);
    expect(await practiceRewardLabel(page)).toBe(rewardBefore);
    await page.getByTestId("mission-trail").getByRole("button").first().click();
    await expectQuestion(page, 1, 5);
    expect(await visiblePracticeCardState(page)).toEqual(firstCardState);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByTestId("mission-trail").getByRole("button").nth(4).click();
    await expectQuestion(page, 5, 5);
    await makeVisibleQuestionAnswerable(page, "explore-round-trip-5");
    await submitVisibleQuestion(page);
    await expectCompletedRoundMatchesReward(page, "free-selection");
  });

  test("adaptive locked mode supports navigation, jump bounds, state persistence, and auto-advance guards", async ({ page }, testInfo) => {
    test.slow();

    await registerStudentThroughApi(page, testInfo, "adaptive");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await choosePracticeModeIfVisible(page, "guided");
    await expect(page.getByRole("combobox", { name: /difficulty/i })).toHaveCount(0);
    await expectQuestion(page, 1);

    const region = practiceRegion(page);
    const total = await currentQuestionCount(page);
    await expect(region.getByRole("button", { name: /Previous question/i })).toBeDisabled();
    await expect(region.getByRole("button", { name: /Next question/i })).toBeEnabled();
    await expect(page.locator("article:visible")).toHaveCount(1);
    expect(await page.locator("article").count()).toBeGreaterThan(1);

    await region.getByRole("button", { name: /Next question/i }).click();
    await expectQuestion(page, 2, total);
    await page.keyboard.press("ArrowLeft");
    await expectQuestion(page, 1, total);
    await page.keyboard.press("ArrowRight");
    await expectQuestion(page, 2, total);

    const jumpInput = region.getByRole("spinbutton", { name: /Jump to/i });
    await expect(region.getByRole("button", { name: /Increase question number/i })).toHaveCount(0);
    await expect(region.getByRole("button", { name: /Decrease question number/i })).toHaveCount(0);
    await jumpInput.focus();
    await page.keyboard.press("ArrowLeft");
    await expectQuestion(page, 2, total);
    await jumpInput.fill("3");
    await expect(jumpInput).toHaveValue("3");
    await jumpInput.fill("2");
    await expect(jumpInput).toHaveValue("2");

    await jumpInput.fill("0");
    await region.getByRole("button", { name: /^Jump$/i }).click();
    await expectQuestion(page, 1, total);

    await jumpInput.fill(String(total + 20));
    await region.getByRole("button", { name: /^Jump$/i }).click();
    await expectQuestion(page, total, total);

    await jumpInput.fill("");
    await region.getByRole("button", { name: /^Jump$/i }).click();
    await expectQuestion(page, total, total);
    await expect(jumpInput).toHaveValue(String(total));

    await jumpInput.fill("1");
    await region.getByRole("button", { name: /^Jump$/i }).click();
    await expectQuestion(page, 1, total);
    await makeVisibleQuestionAnswerable(page, "state-check");
    await region.getByRole("button", { name: /Next question/i }).click();
    await expectQuestion(page, 2, total);
    await region.getByRole("button", { name: /Previous question/i }).click();
    await expectQuestion(page, 1, total);
    await expect(page.locator("article:visible").first().getByRole("button", { name: /check answer/i })).toBeEnabled();

    await submitVisibleQuestion(page);
    await jumpInput.fill(String(total));
    await region.getByRole("button", { name: /^Jump$/i }).click();
    await expectQuestion(page, total, total);
    await page.waitForTimeout(1500);
    await expectQuestion(page, total, total);

    await makeVisibleQuestionAnswerable(page, "last-question-answer");
    await submitVisibleQuestion(page);
    await page.waitForTimeout(1500);
    await expectQuestion(page, total, total);
  });

  test("free-selection mode resets on filters, auto-advances after correct feedback, and leaves lesson practice unchanged", async ({ page }, testInfo) => {
    test.slow();

    const session = await registerStudentThroughApi(page, testInfo, "free");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id);

    await expect(page.getByRole("combobox", { name: /difficulty/i })).toBeVisible();
    await page.getByRole("combobox", { name: /difficulty/i }).selectOption("High");
    await page.getByRole("combobox", { name: /Question type/i }).selectOption("multiple-choice");
    await expectQuestion(page, 1);
    await expect(page.locator("article:visible")).toHaveCount(1);

    const total = await currentQuestionCount(page);
    const firstCard = page.locator("article:visible").first();
    await expect(firstCard).toContainText(/axis of symmetry/i);
    await firstCard.getByRole("button").filter({ hasText: /x\s*=\s*2/ }).first().click();
    await firstCard.getByRole("button", { name: /check answer/i }).click();
    await expect(firstCard.getByText(/Correct/i)).toBeVisible();
    await page.waitForTimeout(1500);
    await expectQuestion(page, 2, total);

    // Narrowing to the answered question's own topic keeps that question in the
    // new round. A filter change must still start a fresh round at question 1.
    await page.getByRole("combobox", { name: /Topic/i }).selectOption("quadratic-patterns");
    await expectQuestion(page, 1);

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("short-answer");
    await expectQuestion(page, 1);
    await expect(page.locator("article:visible")).toHaveCount(1);

    await page.goto("/student/lessons/quadratic-functions");
    await expect(page.getByRole("heading", { name: /Quadratic Functions/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lesson practice/i })).toBeVisible();
    await expect(page.getByRole("spinbutton", { name: /Jump to/i })).toBeVisible();
    // Scoped to main: the pager status paragraph has a hidden SSR duplicate
    // outside it, which intermittently trips strict mode.
    await expect(page.getByRole("main").getByText(/Question 1 of \d+/i).first()).toBeVisible();
    expect(await page.locator("article:visible").count()).toBeGreaterThan(0);

    // The lesson route must render inline in the shell. A loading.tsx boundary
    // here makes React stream the lesson into a hidden segment (<div hidden
    // id="S:0">) whose reveal is deferred; hydration client-renders first and
    // the document briefly holds two full copies of the lesson, which is what
    // made the strict-mode assertions above flake.
    expect(await page.locator("#lesson-practice").count()).toBe(1);
    const lessonHtml = await readPageHtmlWithTransientRetry(page, "/student/lessons/quadratic-functions");
    expect(lessonHtml).not.toContain('<template id="B:');
    expect(lessonHtml).not.toContain('<div hidden id="S:');
  });

  test("math soft keyboard tabs, keys, formulas, and responsive layout work", async ({ page }, testInfo) => {
    test.slow();

    const { keyboard, answer } = await openMathKeyboardForFillIn(page, testInfo);
    const tabNames = ["123", "∞≠∈", "abc", "αβγ"];

    for (const tabName of tabNames) {
      await selectKeyboardTab(keyboard, tabName);
      await expect(keyboard.getByRole("tabpanel").locator("button[data-math-key='true']")).not.toHaveCount(0);
    }

    for (const tabName of tabNames) {
      await selectKeyboardTab(keyboard, tabName);
      const keys = keyboard.getByRole("tabpanel").locator("button[data-math-key='true']");
      const count = await keys.count();

      for (let index = 0; index < count; index += 1) {
        const key = keys.nth(index);
        const meta = await key.evaluate((button) => ({
          kind: button.getAttribute("data-math-key-kind"),
          action: button.getAttribute("data-math-key-action"),
          insert: button.getAttribute("data-math-key-insert"),
          wrapBefore: button.getAttribute("data-math-key-wrap-before"),
          wrapAfter: button.getAttribute("data-math-key-wrap-after"),
          label: button.getAttribute("aria-label") ?? ""
        }));

        await key.scrollIntoViewIfNeeded();

        if (meta.kind === "insert") {
          await setAnswerValue(answer, "");
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect(answer, meta.label).toHaveValue(meta.insert ?? "");
          continue;
        }

        if (meta.kind === "wrap") {
          await setAnswerValue(answer, "x");
          await selectAnswerText(answer);
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect(answer, meta.label).toHaveValue(`${meta.wrapBefore ?? ""}x${meta.wrapAfter ?? ""}`);
          continue;
        }

        if (meta.action === "clear") {
          await setAnswerValue(answer, "abc");
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect(answer, meta.label).toHaveValue("");
          continue;
        }

        if (meta.action === "move-left") {
          await setAnswerValue(answer, "abc");
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect.poll(() => cursorPosition(answer), { message: meta.label }).toBe(2);
          continue;
        }

        if (meta.action === "move-right") {
          await setAnswerValue(answer, "abc", 0);
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect.poll(() => cursorPosition(answer), { message: meta.label }).toBe(1);
          continue;
        }

        if (meta.action === "toggle-sign") {
          await setAnswerValue(answer, "5");
          await expect(key, meta.label).toBeEnabled();
          await key.click();
          await expect(answer, meta.label).toHaveValue("-5");
          continue;
        }

        if (meta.action === "toggle-shift") {
          const pressedBefore = await key.getAttribute("aria-pressed");
          await key.click();
          await expect(key, meta.label).not.toHaveAttribute("aria-pressed", pressedBefore ?? "");
        }
      }
    }

    await setAnswerValue(answer, "");
    await pressSoftKey(keyboard, "123", "Insert 3");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "123", "Insert 2");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "123", "Insert 4");
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await expect(answer).toHaveValue("3+2+4=9");
    await keyboard.getByRole("button", { name: /Undo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4");
    await keyboard.getByRole("button", { name: /Redo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4=9");

    await setAnswerValue(answer, "3+2+4=");
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await expect(answer).toHaveValue("3+2+4=9");

    await setAnswerValue(answer, "123", 1);
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await expect(answer).toHaveValue("1=23");

    await setAnswerValue(answer, "123");
    await selectAnswerText(answer);
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await expect(answer).toHaveValue("=");

    await setAnswerValue(answer, "");
    await pressSoftKey(keyboard, "∞≠∈", "Insert Euler's number");
    await pressSoftKey(keyboard, "123", "Insert exponent marker");
    await pressSoftKey(keyboard, "abc", "Wrap with parentheses");
    await pressSoftKey(keyboard, "123", "Insert imaginary unit");
    await pressSoftKey(keyboard, "123", "Insert multiplication sign");
    await pressSoftKey(keyboard, "αβγ", "Insert pi");
    await pressSoftKey(keyboard, "abc", "Insert closing parenthesis");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "123", "Insert 1");
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await pressSoftKey(keyboard, "123", "Insert 0");
    await expect(answer).toHaveValue("e^(i*pi)+1=0");

    await setAnswerValue(answer, "");
    await pressSoftKey(keyboard, "abc", "Insert f");
    await pressSoftKey(keyboard, "abc", "Wrap with parentheses");
    await pressSoftKey(keyboard, "abc", "Insert x");
    await pressSoftKey(keyboard, "abc", "Insert closing parenthesis");
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await pressSoftKey(keyboard, "abc", "Insert a");
    await pressSoftKey(keyboard, "abc", "Insert x");
    await pressSoftKey(keyboard, "123", "Insert exponent 2");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "abc", "Insert b");
    await pressSoftKey(keyboard, "abc", "Insert x");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "abc", "Insert c");
    await expect(answer).toHaveValue("f(x)=ax^2+bx+c");

    await setAnswerValue(answer, "");
    await pressSoftKey(keyboard, "abc", "Insert f");
    await pressSoftKey(keyboard, "123", "Insert prime mark");
    await pressSoftKey(keyboard, "abc", "Wrap with parentheses");
    await pressSoftKey(keyboard, "abc", "Insert x");
    await pressSoftKey(keyboard, "abc", "Insert closing parenthesis");
    await pressSoftKey(keyboard, "123", "Calculate or insert equals sign");
    await pressSoftKey(keyboard, "123", "Insert 2");
    await pressSoftKey(keyboard, "abc", "Insert a");
    await pressSoftKey(keyboard, "abc", "Insert x");
    await pressSoftKey(keyboard, "123", "Insert plus sign");
    await pressSoftKey(keyboard, "abc", "Insert b");
    await expect(answer).toHaveValue("f'(x)=2ax+b");

    await keyboard.getByRole("button", { name: /Undo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("f'(x)=2ax+");
    await keyboard.getByRole("button", { name: /Redo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("f'(x)=2ax+b");
    await keyboard.getByRole("button", { name: /Backspace/i }).click();
    await expect(answer).toHaveValue("f'(x)=2ax+");
    await keyboard.getByRole("button", { name: /Clear answer/i }).first().click();
    await expect(answer).toHaveValue("");

    await expectNoHorizontalDocumentOverflow(page);
    await expectKeyboardButtonsDoNotOverlap(keyboard);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(keyboard).toBeVisible();
    await expectNoHorizontalDocumentOverflow(page);
    await expectKeyboardButtonsDoNotOverlap(keyboard);
  });

  test("fill-in questions support handwriting board draft, answer text, and reset", async ({ page }, testInfo) => {
    test.slow();

    let recognitionRequestCount = 0;
    await page.route("**/api/handwriting-recognition", async (route) => {
      recognitionRequestCount += 1;
      const payload = route.request().postDataJSON() as HandwritingRecognitionPayload;
      expect(Array.isArray(payload.strokes)).toBeTruthy();
      expect(payload.strokes?.length).toBeGreaterThan(0);
      expect(payload.imageDataUrl?.startsWith("data:image/png")).toBeTruthy();
      expect(payload.language).toBe("en");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "25",
          confidence: 0.96,
          provider: "simpletex",
          alternatives: [{ text: "25", confidence: 0.96, provider: "simpletex" }],
          accepted: true
        })
      });
    });

    const session = await registerStudentThroughApi(page, testInfo, "handwriting-fill", "S1");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id, "S1");

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("fill-in");
    await expectQuestion(page, 1);

    const card = page.locator("article:visible").first();
    await expect(card.getByRole("tab", { name: /Keyboard input/i })).toHaveAttribute("aria-selected", "true");
    await expect(card.getByRole("button", { name: /Math keyboard/i })).toBeVisible();

    await card.getByRole("tab", { name: /Handwriting board/i }).click();
    await expect(card.getByRole("tab", { name: /Handwriting board/i })).toHaveAttribute("aria-selected", "true");
    await expect(card.getByRole("button", { name: /Math keyboard/i })).toHaveCount(0);

    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const convertButton = card.getByRole("button", { name: /Convert handwriting to answer text/i });
    await expect(canvas).toBeVisible();
    await expect(convertButton).toBeDisabled();

    await card.getByRole("button", { name: /Collapse handwriting canvas/i }).click();
    await expect(card.getByRole("img", { name: /Handwriting draft canvas/i })).toHaveCount(0);
    await card.getByRole("button", { name: /Expand handwriting canvas/i }).click();
    await expect(canvas).toBeVisible();

    await card.getByRole("button", { name: /Use eraser tool/i }).click();
    await drawDraftStroke(page, canvas);
    await expect(card.getByRole("button", { name: /Undo last handwriting stroke/i })).toBeEnabled();
    await card.getByRole("button", { name: /Undo last handwriting stroke/i }).click();
    await expect(card.getByRole("button", { name: /Undo last handwriting stroke/i })).toBeDisabled();
    await expect(convertButton).toBeDisabled();

    await card.getByRole("button", { name: /Use pen tool/i }).click();
    await drawNumericDraft25(page, canvas);
    await expect(convertButton).toBeEnabled();
    await expect(card.getByRole("button", { name: /Undo last handwriting stroke/i })).toBeEnabled();

    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });
    await convertButton.click();
    await expect(handwrittenAnswer).toHaveValue("25");
    await expect(card.getByRole("status")).toContainText(/Converted to "25"/i);
    expect(recognitionRequestCount).toBe(1);
    await handwrittenAnswer.fill("5x");
    await expect(card.getByRole("button", { name: /check answer/i })).toBeEnabled();

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await expect(card.getByRole("button", { name: /Undo last handwriting stroke/i })).toBeDisabled();

    await drawDraftStroke(page, canvas);
    await handwrittenAnswer.fill("state-check");
    await card.getByRole("button", { name: /^Reset$/i }).click();
    await expect(handwrittenAnswer).toHaveValue("");
    await expect(card.getByRole("button", { name: /Undo last handwriting stroke/i })).toBeDisabled();
  });

  test("handwriting conversion reviews low-confidence, algebra, fraction, and failure responses", async ({ page }, testInfo) => {
    test.slow();

    let recognitionRequestCount = 0;
    await page.route("**/api/handwriting-recognition", async (route) => {
      recognitionRequestCount += 1;
      const payload = route.request().postDataJSON() as HandwritingRecognitionPayload;
      expect(Array.isArray(payload.strokes)).toBeTruthy();
      expect(payload.strokes?.length).toBeGreaterThan(0);
      expect(payload.imageDataUrl?.startsWith("data:image/png")).toBeTruthy();
      expect(payload.language).toBe("en");

      const responses = [
        {
          text: "",
          confidence: 0.42,
          provider: "mathpix",
          alternatives: [{ text: "25", confidence: 0.42, provider: "mathpix" }],
          accepted: false,
          reason: "Recognition confidence is below the review threshold."
        },
        {
          text: "5x",
          confidence: 0.96,
          provider: "simpletex",
          alternatives: [{ text: "5x", confidence: 0.96, provider: "simpletex" }],
          accepted: true
        },
        {
          text: "3/5",
          latex: "\\frac{3}{5}",
          confidence: 0.94,
          provider: "simpletex",
          alternatives: [{ text: "3/5", latex: "\\frac{3}{5}", confidence: 0.94, provider: "simpletex" }],
          accepted: true
        },
        {
          text: "",
          confidence: 0,
          provider: "none",
          alternatives: [],
          accepted: false,
          reason: "Draw clearer handwriting, then convert again."
        }
      ];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responses[recognitionRequestCount - 1] ?? responses.at(-1))
      });
    });

    const session = await registerStudentThroughApi(page, testInfo, "handwriting-provider", "S1");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id, "S1");

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("fill-in");
    await expectQuestion(page, 1);

    const card = page.locator("article:visible").first();
    await card.getByRole("tab", { name: /Handwriting board/i }).click();
    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const convertButton = card.getByRole("button", { name: /Convert handwriting to answer text/i });
    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });

    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/Low confidence/i);
    await card.getByRole("button", { name: /Use suggestion 25/i }).click();
    await expect(handwrittenAnswer).toHaveValue("25");

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(handwrittenAnswer).toHaveValue("5x");
    await expect(card.getByRole("status")).toContainText(/Converted to "5x"/i);

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(handwrittenAnswer).toHaveValue("3/5");
    await expect(card.getByRole("status")).toContainText(/Converted to "3\/5"/i);

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/Draw clearer handwriting/i);
    await expect(handwrittenAnswer).toHaveValue("3/5");
    expect(recognitionRequestCount).toBe(4);
  });

  test("handwriting conversion handles auth, rate-limit, and network failures without replacing the answer", async ({ page }, testInfo) => {
    test.slow();

    let recognitionRequestCount = 0;
    const recognitionResponses = [
      {
        status: 401,
        body: { error: "Log in before using handwriting recognition." }
      },
      {
        status: 429,
        body: { error: "Handwriting recognition rate limit reached. Try again in 30 seconds." }
      },
      {
        abort: true
      }
    ];

    await page.route("**/api/handwriting-recognition", async (route) => {
      const payload = route.request().postDataJSON() as HandwritingRecognitionPayload;
      expect(Array.isArray(payload.strokes)).toBeTruthy();
      expect(payload.strokes?.length).toBeGreaterThan(0);
      expect(payload.imageDataUrl?.startsWith("data:image/png")).toBeTruthy();
      expect(payload.language).toBe("en");

      const response = recognitionResponses[recognitionRequestCount] ?? recognitionResponses.at(-1);
      recognitionRequestCount += 1;

      if (response?.abort) {
        await route.abort("failed");
        return;
      }

      await route.fulfill({
        status: response?.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify(response?.body ?? { error: "Recognition unavailable." })
      });
    });

    const session = await registerStudentThroughApi(page, testInfo, "handwriting-errors", "S1");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id, "S1");

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("fill-in");
    await expectQuestion(page, 1);

    const card = page.locator("article:visible").first();
    await card.getByRole("tab", { name: /Handwriting board/i }).click();
    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const convertButton = card.getByRole("button", { name: /Convert handwriting to answer text/i });
    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });

    await handwrittenAnswer.fill("keep-me");
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/Log in before using handwriting recognition/i);
    await expect(handwrittenAnswer).toHaveValue("keep-me");

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/rate limit reached|Try again in 30 seconds/i);
    await expect(handwrittenAnswer).toHaveValue("keep-me");

    await card.getByRole("button", { name: /Clear handwriting board/i }).click();
    await drawDraftStroke(page, canvas);
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/Draw clearer separated digits/i);
    await expect(handwrittenAnswer).toHaveValue("keep-me");
    expect(recognitionRequestCount).toBe(3);
  });

  test("short-answer handwriting board coexists with photo upload controls", async ({ page }, testInfo) => {
    test.slow();

    // The isolated E2E server intentionally has no media encryption key. This
    // scenario verifies the two controls' layout, so make only the capability
    // probe deterministic without exercising or weakening the upload route.
    await page.route("**/api/media-objects", async (route) => {
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ uploadsAvailable: true })
      });
    });

    const session = await registerStudentThroughApi(page, testInfo, "handwriting-short", "S1");
    await page.goto("/practice");
    await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await unlockFreeSelection(page, session.user.id, "S1");

    await page.getByRole("combobox", { name: /Question type/i }).selectOption("short-answer");
    await expectQuestion(page, 1);

    const card = page.locator("article:visible").first();
    await card.getByRole("tab", { name: /Handwriting board/i }).click();
    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const uploadButton = card.getByRole("button", { name: /Add photos/i });
    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });

    await expect(canvas).toBeVisible();
    await expect(handwrittenAnswer).toBeVisible();
    await expect(uploadButton).toBeVisible();
    await expectNoOverlap(canvas, uploadButton);
  });

  test("lesson fill-in math keyboard calculates in Simplified Chinese and preserves symbolic equals", async ({ page }, testInfo) => {
    test.slow();

    await registerStudentThroughApi(page, testInfo, "lesson-calculator", "S1", "zh-Hans", "light");

    await page.goto("/student/lessons/algebra-basics");
    await expect(page.getByRole("heading", { level: 1, name: /代数基础：代数式与简单方程/ })).toBeVisible();

    const card = await findVisibleLessonPracticeCard(page, /填空答案/);
    await card.getByRole("button", { name: /数学键盘/ }).click();

    const keyboard = card.getByRole("group", { name: "数学软键盘", exact: true });
    const answer = card.getByRole("textbox").first();
    const calculate = keyboard.getByRole("button", { name: "计算或输入等号", exact: true });
    const pressInsert = async (insert: string) => {
      await keyboard.getByRole("tabpanel").locator(`button[data-math-key-insert="${insert}"]`).click();
    };

    await expect(keyboard).toBeVisible({ timeout: 60_000 });
    await expect(calculate).toBeVisible();
    for (const token of ["3", "+", "2", "+", "4"]) await pressInsert(token);
    await calculate.click();
    await expect(answer).toHaveValue("3+2+4=9");

    await keyboard.getByRole("button", { name: "复原软键盘输入", exact: true }).click();
    await expect(answer).toHaveValue("3+2+4");
    await keyboard.getByRole("button", { name: "重做软键盘输入", exact: true }).click();
    await expect(answer).toHaveValue("3+2+4=9");

    await setAnswerValue(answer, "f(x)");
    await calculate.click();
    await expect(answer).toHaveValue("f(x)=");

    await setAnswerValue(answer, "3+2+4=");
    await calculate.click();
    await expect(answer).toHaveValue("3+2+4=9");

    await expectNoHorizontalDocumentOverflow(page);
    await expectKeyboardButtonsDoNotOverlap(keyboard);

    const [attemptRequest, attemptResponse] = await Promise.all([
      page.waitForRequest((request) => (
        request.method() === "POST" && new URL(request.url()).pathname === "/api/attempts"
      )),
      page.waitForResponse((response) => (
        response.request().method() === "POST" && new URL(response.url()).pathname === "/api/attempts"
      )),
      card.getByRole("button", { name: /检查答案/ }).click()
    ]);
    const submittedPayload = attemptRequest.postDataJSON() as { selectedAnswer?: unknown };
    expect(submittedPayload.selectedAnswer).toBe("3+2+4=9");
    expect(attemptResponse.ok()).toBeTruthy();
  });

  test("lesson fill-in questions expose and convert with the handwriting input mode", async ({ page }, testInfo) => {
    await registerStudentThroughApi(page, testInfo, "lesson-fill-in", "S1");

    let recognitionRequestCount = 0;
    await page.route("**/api/handwriting-recognition", async (route) => {
      recognitionRequestCount += 1;
      const payload = route.request().postDataJSON() as HandwritingRecognitionPayload;
      expect(Array.isArray(payload.strokes)).toBeTruthy();
      expect(payload.strokes?.length).toBeGreaterThan(0);
      expect(payload.imageDataUrl?.startsWith("data:image/png")).toBeTruthy();
      expect(payload.language).toBe("en");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "23",
          confidence: 0.95,
          provider: "simpletex",
          alternatives: [{ text: "23", confidence: 0.95, provider: "simpletex" }],
          accepted: true
        })
      });
    });

    await page.goto("/student/lessons/algebra-basics");
    await expect(page.getByRole("heading", { level: 1, name: /Algebra Basics: Expressions and Simple Equations/i })).toBeVisible();

    const card = await findVisibleLessonPracticeCard(page, /Fill in the blank/i);
    await expect(card.getByRole("tab", { name: /Keyboard input/i })).toHaveAttribute("aria-selected", "true");
    await card.getByRole("tab", { name: /Handwriting board/i }).click();

    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const convertButton = card.getByRole("button", { name: /Convert handwriting to answer text/i });
    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });
    await expect(canvas).toBeVisible();
    await expect(handwrittenAnswer).toBeVisible();
    await expect(convertButton).toBeDisabled();

    await drawDraftStroke(page, canvas);
    await expect(convertButton).toBeEnabled();
    await convertButton.click();
    await expect(handwrittenAnswer).toHaveValue("23");
    await expect(card.getByRole("status")).toContainText(/Converted to "23"/i);
    expect(recognitionRequestCount).toBe(1);
  });

  test("circles lesson handwriting review does not auto-fill ambiguous local 26", async ({ page }, testInfo) => {
    await registerStudentThroughApi(page, testInfo, "lesson-circles", "S1");

    let recognitionRequestCount = 0;
    await page.route("**/api/handwriting-recognition", async (route) => {
      recognitionRequestCount += 1;
      const payload = route.request().postDataJSON() as HandwritingRecognitionPayload;
      expect(Array.isArray(payload.strokes)).toBeTruthy();
      expect(payload.strokes?.length).toBeGreaterThan(0);
      expect(payload.imageDataUrl?.startsWith("data:image/png")).toBeTruthy();
      expect(payload.language).toBe("en");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          text: "",
          confidence: 0,
          provider: "none",
          alternatives: [{ text: "26", confidence: 0.66, provider: "local" }],
          accepted: false,
          reason: "Recognition confidence is below the review threshold."
        })
      });
    });

    await page.goto("/student/lessons/circles");
    await expect(page.getByRole("heading", { level: 1, name: /Circles: Chords, Tangents, Arcs, Angles/i })).toBeVisible();

    const card = await findVisibleLessonPracticeCard(page, /A tangent meets a radius/i);
    await card.getByRole("tab", { name: /Handwriting board/i }).click();

    const canvas = card.getByRole("img", { name: /Handwriting draft canvas/i });
    const convertButton = card.getByRole("button", { name: /Convert handwriting to answer text/i });
    const handwrittenAnswer = card.getByRole("textbox", { name: /Handwritten answer text/i });

    await drawNumericDraft25(page, canvas);
    await expect(convertButton).toBeEnabled();
    await convertButton.click();
    await expect(card.getByRole("status")).toContainText(/Low confidence/i);
    await expect(card.getByRole("button", { name: /Use suggestion 26/i })).toBeVisible();
    await expect(handwrittenAnswer).toHaveValue("");
    expect(recognitionRequestCount).toBe(1);
  });

  test("lesson multiple-choice questions do not expose draft input tools", async ({ page }, testInfo) => {
    await registerStudentThroughApi(page, testInfo, "lesson-mcq", "S1");

    await page.goto("/student/lessons/integers");
    await expect(page.getByRole("heading", { level: 1, name: /Integers: Direction, Zero, and Operations/i })).toBeVisible();

    const card = await findVisibleLessonPracticeCard(page, /When starting a Integers question/i);
    await expect(card.getByRole("tablist", { name: /Answer input mode/i })).toHaveCount(0);
    await expect(card.getByRole("tab")).toHaveCount(0);
    await expect(card.getByRole("img", { name: /Handwriting draft canvas/i })).toHaveCount(0);
    await expect(card.getByRole("textbox", { name: /Handwritten answer text/i })).toHaveCount(0);
  });
});
