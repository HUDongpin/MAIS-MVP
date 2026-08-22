import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { isTransientApiTransportError, openPracticeFiltersPanel, uniqueSuffix } from "./helpers";

type Language = "en" | "zh" | "zh-Hans";

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

async function registerStudent(
  page: Page,
  testInfo: TestInfo,
  label: string,
  grade = "S1",
  language: Language = "en",
  theme: "light" | "dark" = "dark"
) {
  const suffix = uniqueSuffix(testInfo);
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.request.post("/api/auth/register", {
        data: {
          name: `Keyboard ${label} ${suffix}`,
          username: `keyboard-${label}-${suffix}-${attempt}@example.test`,
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

async function unlockFreeSelection(page: Page, userId: string, grade: string) {
  const response = await page.request.get(`/api/adaptive-learning/next?grade=${grade}`);
  expect(response.ok()).toBeTruthy();
  const { decision } = await response.json() as PracticeDecisionResponse;

  await page.evaluate(({ nextUserId, skillId }) => {
    window.localStorage.setItem(`hk-math-practice-free-selection-unlocked:${nextUserId}:${skillId}`, "true");
  }, { nextUserId: userId, skillId: decision.skill.id });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await openPracticeFiltersPanel(page);
}

async function openPracticeKeyboard(
  page: Page,
  testInfo: TestInfo,
  options: {
    grade?: string;
    questionId?: string;
    questionType?: "fill-in" | "short-answer";
    label: string;
    topicId?: string;
  }
) {
  const grade = options.grade ?? "S1";
  const questionType = options.questionType ?? "fill-in";
  const session = await registerStudent(page, testInfo, options.label, grade);

  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: /Practice Arena/i })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await unlockFreeSelection(page, session.user.id, grade);
  if (options.topicId) {
    await page.getByRole("combobox", { name: /Topic/i }).selectOption(options.topicId);
  }
  await page.getByRole("combobox", { name: /Question type/i }).selectOption(questionType);

  const card = options.questionId
    ? page.locator(`article[data-question-id="${options.questionId}"]:visible`)
    : page.locator("article:visible").first();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: /Math keyboard/i }).click();

  const keyboard = card.getByRole("group", { name: /Math soft keyboard/i });
  const answer = card.getByRole("textbox").first();
  const calculate = keyboard.getByRole("button", { name: /Calculate or insert equals sign/i });
  await expect(keyboard).toBeVisible();
  await expect(answer).toBeVisible();
  await expect(calculate).toHaveAccessibleName("Calculate or insert equals sign");
  return { answer, calculate, card, keyboard };
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

async function selectAnswerRange(answer: Locator, start: number, end: number) {
  await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement, selection) => {
    element.focus();
    element.setSelectionRange(selection.start, selection.end);
  }, { start, end });
}

async function cursorPosition(answer: Locator) {
  return await answer.evaluate((element: HTMLInputElement | HTMLTextAreaElement) => element.selectionStart ?? 0);
}

async function findVisibleLessonPracticeCard(page: Page, text: RegExp, maxSteps = 5) {
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

async function expectNoHorizontalDocumentOverflow(page: Page) {
  const documentWidth = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.clientWidth + 1);
}

function isMobileProject(testInfo: TestInfo) {
  return Boolean(testInfo.project.use.isMobile);
}

function applicationNavigation(page: Page) {
  const mainNavigation = page.getByRole("navigation", { name: /Main navigation|主導覽/ });
  return page.locator("header").filter({ has: mainNavigation });
}

async function expectActiveKeyboardPanelLayout(page: Page, keyboard: Locator) {
  const activePanel = keyboard.getByRole("tabpanel");
  await expect(activePanel).toBeVisible();

  const [keyboardBox, activeKeyBoxes] = await Promise.all([
    keyboard.boundingBox(),
    activePanel.locator("button[data-math-key='true']:visible").evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          height: rect.height,
          label: button.getAttribute("aria-label") ?? button.textContent ?? "unlabelled key",
          left: rect.left,
          right: rect.right,
          width: rect.width
        };
      })
    )
  ]);

  expect(keyboardBox).not.toBeNull();
  expect(activeKeyBoxes.length).toBeGreaterThan(0);
  if (!keyboardBox) return;

  for (const key of activeKeyBoxes) {
    expect(key.height, `${key.label} touch-target height`).toBeGreaterThanOrEqual(43.5);
    expect(key.height, `${key.label} noncompact key height`).toBeLessThanOrEqual(44.5);
    expect(key.width, `${key.label} touch-target width`).toBeGreaterThanOrEqual(43.5);
    expect(key.left, `${key.label} left edge`).toBeGreaterThanOrEqual(keyboardBox.x - 1);
    expect(key.right, `${key.label} right edge`).toBeLessThanOrEqual(keyboardBox.x + keyboardBox.width + 1);
  }

  await expectNoHorizontalDocumentOverflow(page);
}

async function expectMobileKeyboardControlsUnblocked(
  page: Page,
  keyboard: Locator,
  stickyApplicationNavigation: Locator
) {
  const visibleControls = keyboard.locator("button:visible");
  const controlCount = await visibleControls.count();

  for (let index = 0; index < controlCount; index += 1) {
    const control = visibleControls.nth(index);
    await control.evaluate((button) => button.scrollIntoView({ behavior: "auto", block: "start" }));
    const [controlBox, keyboardBox, navigationBox, enabled, disabledState, label] = await Promise.all([
      control.boundingBox(),
      keyboard.boundingBox(),
      stickyApplicationNavigation.boundingBox(),
      control.isEnabled(),
      control.evaluate((button) => {
        return {
          ariaDisabled: button.getAttribute("aria-disabled") === "true",
          nativeDisabled: button instanceof HTMLButtonElement && button.disabled
        };
      }),
      control.evaluate((button) => button.getAttribute("aria-label") ?? button.textContent ?? "unlabelled control")
    ]);

    expect(controlBox, `${label} bounding box`).not.toBeNull();
    expect(keyboardBox, "math keyboard bounding box").not.toBeNull();
    expect(navigationBox, "sticky application navigation bounding box").not.toBeNull();
    if (!controlBox || !keyboardBox || !navigationBox) continue;

    const intersectsNavigation =
      controlBox.x < navigationBox.x + navigationBox.width &&
      controlBox.x + controlBox.width > navigationBox.x &&
      controlBox.y < navigationBox.y + navigationBox.height &&
      controlBox.y + controlBox.height > navigationBox.y;
    expect(intersectsNavigation, `fixed navigation overlapped ${label}`).toBe(false);
    expect(controlBox.height, `${label} touch-target height`).toBeGreaterThanOrEqual(43.5);
    expect(controlBox.width, `${label} touch-target width`).toBeGreaterThanOrEqual(43.5);
    expect(controlBox.x, `${label} left edge`).toBeGreaterThanOrEqual(keyboardBox.x - 1);
    expect(controlBox.x + controlBox.width, `${label} right edge`).toBeLessThanOrEqual(
      keyboardBox.x + keyboardBox.width + 1
    );

    if (enabled) {
      await control.click({ trial: true });
    } else {
      expect(
        disabledState.nativeDisabled || disabledState.ariaDisabled,
        `${label} must expose a legitimate disabled state`
      ).toBe(true);
      await expect(control).toBeDisabled();
    }
  }

  await expectNoHorizontalDocumentOverflow(page);
}

async function expectKeyboardFrameGeometry(
  page: Page,
  card: Locator,
  keyboard: Locator,
  stickyApplicationNavigation: Locator,
  isMobile: boolean
) {
  await keyboard.scrollIntoViewIfNeeded();
  await expect(stickyApplicationNavigation).toBeVisible();
  const [cardBox, keyboardBox, navigationBox, navigationPosition] = await Promise.all([
    card.boundingBox(),
    keyboard.boundingBox(),
    stickyApplicationNavigation.boundingBox(),
    stickyApplicationNavigation.evaluate((element) => window.getComputedStyle(element).position)
  ]);

  expect(cardBox).not.toBeNull();
  expect(keyboardBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(navigationPosition).toBe("sticky");
  if (!cardBox || !keyboardBox || !navigationBox) return;

  expect(keyboardBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
  expect(keyboardBox.x + keyboardBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1);
  expect(keyboardBox.width).toBeLessThanOrEqual((isMobile ? cardBox.width : 768) + 1);
  expect(Math.abs(
    keyboardBox.x + keyboardBox.width / 2 - (cardBox.x + cardBox.width / 2)
  )).toBeLessThanOrEqual(2);
  expect(keyboardBox.y).toBeGreaterThanOrEqual(navigationBox.y + navigationBox.height - 1);

  const visibleControlBoxes = await keyboard.locator("button:visible").evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return {
        height: rect.height,
        label: button.getAttribute("aria-label") ?? button.textContent ?? "unlabelled control",
        width: rect.width
      };
    })
  );
  for (const control of visibleControlBoxes) {
    expect(control.height, `${control.label} touch-target height`).toBeGreaterThanOrEqual(43.5);
    expect(control.width, `${control.label} touch-target width`).toBeGreaterThanOrEqual(43.5);
  }

  const clippedControls = await keyboard.evaluate((root) => {
    const frame = root.getBoundingClientRect();
    return Array.from(root.querySelectorAll<HTMLButtonElement>("button"))
      .filter((button) => button.getClientRects().length > 0)
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.left < frame.left - 1 || rect.right > frame.right + 1;
      })
      .map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "unlabelled control");
  });
  expect(clippedControls).toEqual([]);
  await expectNoHorizontalDocumentOverflow(page);
}

async function lessonMenuGeometry(menu: Locator) {
  return await menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      pageScrollTop: window.scrollY,
      scrollLeft: element.scrollLeft,
      scrollTop: element.scrollTop
    };
  });
}

test.describe("Practice math keyboard responsive layout gate", () => {
  test("stays centered, contained, touch-sized, and fully usable", async ({ page }, testInfo) => {
    test.slow();

    const isMobile = isMobileProject(testInfo);
    const { answer, card, keyboard } = await openPracticeKeyboard(page, testInfo, {
      label: `responsive-${isMobile ? "mobile" : "desktop"}`
    });
    const stickyApplicationNavigation = applicationNavigation(page);
    await expectKeyboardFrameGeometry(page, card, keyboard, stickyApplicationNavigation, isMobile);

    for (const tabName of ["123", "∞≠∈", "abc", "αβγ"]) {
      const tab = keyboard.getByRole("tab", { name: tabName, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");
      await expect(keyboard.getByRole("tabpanel").locator("button[data-math-key='true']")).not.toHaveCount(0);
      await expectActiveKeyboardPanelLayout(page, keyboard);
      if (isMobile) {
        await expectMobileKeyboardControlsUnblocked(page, keyboard, stickyApplicationNavigation);
      }
    }

    await keyboard.getByRole("tab", { name: "123", exact: true }).click();
    const editingControls = keyboard.getByRole("group", { name: /Soft keyboard editing controls/i });
    const undo = editingControls.getByRole("button", { name: /Undo soft keyboard input/i });
    const redo = editingControls.getByRole("button", { name: /Redo soft keyboard input/i });
    const moveLeft = editingControls.getByRole("button", { name: /Move cursor left/i });
    const moveRight = editingControls.getByRole("button", { name: /Move cursor right/i });
    const backspace = editingControls.getByRole("button", { name: /Backspace/i });
    const clear = editingControls.getByRole("button", { name: /Clear answer/i });
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();
    await expect(backspace).toBeDisabled();
    await expect(clear).toBeDisabled();
    await setAnswerValue(answer, "12");
    await expect(moveLeft).toBeEnabled();
    await expect(moveRight).toBeEnabled();
    await expect(backspace).toBeEnabled();
    await expect(clear).toBeEnabled();
    await keyboard.getByRole("tabpanel").getByRole("button", { name: "Insert 0", exact: true }).click();
    await expect(answer).toHaveValue("120");
    await expect(undo).toBeEnabled();
    await undo.click();
    await expect(answer).toHaveValue("12");
    await expect(redo).toBeEnabled();
    await redo.click();
    await expect(answer).toHaveValue("120");
    await moveLeft.click();
    await moveRight.click();
    await backspace.click();
    await expect(answer).toHaveValue("12");
    await clear.click();
    await expect(answer).toHaveValue("");

    await expectKeyboardFrameGeometry(page, card, keyboard, stickyApplicationNavigation, isMobile);
    if (isMobile) {
      await expectMobileKeyboardControlsUnblocked(page, keyboard, stickyApplicationNavigation);
    }
  });

  test("opening and closing in a lesson leaves the desktop directory fixed", async ({ page }, testInfo) => {
    test.skip(isMobileProject(testInfo), "The left lesson directory is a desktop pane.");
    test.slow();

    await registerStudent(page, testInfo, "lesson-directory", "S1", "en", "light");
    await page.goto("/student/lessons/algebra-basics");
    await expect(page.getByRole("heading", { level: 1, name: /Algebra Basics: Expressions and Simple Equations/i })).toBeVisible();

    const menu = page.locator("#lesson-world-menu-panel:visible");
    await expect(menu).toBeVisible();
    const card = await findVisibleLessonPracticeCard(page, /Fill in the blank/i);
    const keyboardToggle = card.getByRole("button", { name: /Math keyboard/i });
    await keyboardToggle.scrollIntoViewIfNeeded();
    const before = await lessonMenuGeometry(menu);

    await keyboardToggle.click();
    const keyboard = card.getByRole("group", { name: /Math soft keyboard/i });
    await expect(keyboard).toBeVisible({ timeout: 60_000 });
    const afterOpen = await lessonMenuGeometry(menu);

    await keyboardToggle.click();
    await expect(keyboard).toBeHidden();
    const afterClose = await lessonMenuGeometry(menu);

    for (const current of [afterOpen, afterClose]) {
      expect(current.x).toBeCloseTo(before.x, 0);
      expect(current.pageScrollTop).toBe(before.pageScrollTop);
      expect(current.scrollLeft).toBe(before.scrollLeft);
      expect(current.scrollTop).toBe(before.scrollTop);
    }

    await keyboardToggle.click();
    await expect(keyboard).toBeVisible({ timeout: 60_000 });
    await expectKeyboardFrameGeometry(page, card, keyboard, applicationNavigation(page), false);
    await expectNoHorizontalDocumentOverflow(page);
  });
});

test.describe("Practice math keyboard required gate", () => {
  test("calculates and submits exact arithmetic as correct", async ({ page }, testInfo) => {
    test.slow();

    const { answer, calculate, card } = await openPracticeKeyboard(page, testInfo, {
      grade: "S6",
      label: "exact-submit",
      questionId: "q12",
      topicId: "statistics-s6"
    });
    await expect(card).toContainText(/normal distribution/i);

    const expression = "(1000000000000.1-1000000000000)*20";
    const completed = `${expression}=2`;
    await setAnswerValue(answer, expression);
    await calculate.click();
    await expect(answer).toHaveValue(completed);

    await card.getByRole("button", { name: /Check answer/i }).click();
    await expect(card.getByText(/Correct - nice reasoning\./i)).toBeVisible();
  });

  test("permanently clears a calculation announcement after physical answer editing", async ({ page }, testInfo) => {
    const { answer, calculate, keyboard } = await openPracticeKeyboard(page, testInfo, { label: "announcement" });

    await expect(answer).toHaveAttribute("maxlength", "500");
    const longestSafeAnswer = "1".repeat(500);
    await setAnswerValue(answer, longestSafeAnswer);
    await keyboard.getByRole("button", { name: "Insert 0", exact: true }).click();
    await expect(answer).toHaveValue(longestSafeAnswer);

    await setAnswerValue(answer, "3+2+4");
    await calculate.click();
    await expect(answer).toHaveValue("3+2+4=9");
    await expect(keyboard.getByRole("status")).toHaveText("Calculation result: 3+2+4=9");

    await answer.press("Backspace");
    await expect(answer).toHaveValue("3+2+4=");
    await expect(keyboard.getByRole("status")).toHaveText("");
    await answer.press("9");
    await expect(answer).toHaveValue("3+2+4=9");
    await expect(keyboard.getByRole("status")).toHaveText("");
  });
});

test.describe("Practice math keyboard interaction contract", () => {
  test("keeps fallback, cursor replacement, and calculation history deterministic", async ({ page }, testInfo) => {
    const { answer, calculate, keyboard } = await openPracticeKeyboard(page, testInfo, { label: "editing" });

    await setAnswerValue(answer, "1/3=");
    await calculate.click();
    await expect(answer).toHaveValue("1/3=");

    await setAnswerValue(answer, "123");
    await selectAnswerRange(answer, 1, 2);
    await calculate.click();
    await expect(answer).toHaveValue("1=3");
    await expect.poll(() => cursorPosition(answer)).toBe(2);

    await setAnswerValue(answer, "3+2+4");
    await calculate.focus();
    await page.keyboard.press("Enter");
    await expect(answer).toHaveValue("3+2+4=9");
    await expect.poll(() => cursorPosition(answer)).toBe("3+2+4=9".length);

    await keyboard.getByRole("button", { name: /Undo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4");
    await keyboard.getByRole("button", { name: /Redo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4=9");
    await keyboard.getByRole("button", { name: /Undo soft keyboard input/i }).click();
    await keyboard.getByRole("button", { name: "Insert 0", exact: true }).click();
    await expect(answer).toHaveValue("3+2+40");
    await expect(keyboard.getByRole("button", { name: /Redo soft keyboard input/i })).toBeDisabled();
  });

  test("calculates an exact terminating decimal in a textarea with Space", async ({ page }, testInfo) => {
    const { answer, calculate, keyboard } = await openPracticeKeyboard(page, testInfo, {
      grade: "S6",
      questionType: "short-answer",
      label: "textarea"
    });
    expect(await answer.evaluate((element) => element.tagName)).toBe("TEXTAREA");

    await setAnswerValue(answer, "0.0000001+0.0000002");
    await calculate.focus();
    await page.keyboard.press("Space");
    await expect(answer).toHaveValue("0.0000001+0.0000002=0.0000003");
    await expect(keyboard.getByRole("status")).toHaveText(
      "Calculation result: 0.0000001+0.0000002=0.0000003"
    );
  });
});

for (const locale of [
  {
    language: "zh" as const,
    label: "hant",
    heading: /代數基礎：代數式與簡單方程/,
    openKeyboard: /數學鍵盤/,
    keyboardName: "數學軟鍵盤",
    calculateName: "計算或輸入等號",
    announcement: "計算結果：3+2+4=9"
  },
  {
    language: "zh-Hans" as const,
    label: "hans",
    heading: /代数基础：代数式与简单方程/,
    openKeyboard: /数学键盘/,
    keyboardName: "数学软键盘",
    calculateName: "计算或输入等号",
    announcement: "计算结果：3+2+4=9"
  }
]) {
  test(`lesson math keyboard localizes calculation for ${locale.label}`, async ({ page }, testInfo) => {
    test.slow();

    await registerStudent(page, testInfo, `locale-${locale.label}`, "S1", locale.language, "light");
    await page.goto("/student/lessons/algebra-basics");
    await expect(page.getByRole("heading", { level: 1, name: locale.heading })).toBeVisible();

    const card = await findVisibleLessonPracticeCard(page, /填空答案/);
    await card.getByRole("button", { name: locale.openKeyboard }).click();
    const keyboard = card.getByRole("group", { name: locale.keyboardName, exact: true });
    const answer = card.getByRole("textbox").first();
    const calculate = keyboard.getByRole("button", { name: locale.calculateName, exact: true });

    await expect(keyboard).toBeVisible({ timeout: 60_000 });
    await expect(calculate).toHaveAccessibleName(locale.calculateName);
    await setAnswerValue(answer, "3+2+4");
    await calculate.click();
    await expect(answer).toHaveValue("3+2+4=9");
    await expect(keyboard.getByRole("status")).toHaveText(locale.announcement);
  });
}
