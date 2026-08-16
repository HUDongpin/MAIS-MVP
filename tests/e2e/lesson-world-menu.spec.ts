import { expect, test, type Locator, type Page } from "@playwright/test";
import { lessonWorldThemeForGrade } from "../../components/lesson/worlds/worldThemes";
import { usCaliforniaQuestions } from "../../data/usCaliforniaQuestions";
import { authenticateAsUserId, collectPageErrors, expectNoPageErrors } from "./helpers";

/**
 * MAIS Learning Worlds menu (porting plan §3, Phase 3).
 *
 * The California lesson page renders the unit directory as the grade band's
 * world map — Sprout Meadow for K–2, Voyager Seas for 3–5 — with the
 * accordion directory always one "List view" tap away. These specs cover the
 * world render per band, stop navigation, the list-view toggle contract
 * (including persistence), reduced-motion rendering, and the mobile ribbon.
 */

const californiaSuperStudentId = "student-jon-us-ca-super";
const kindergartenTopicPath = "/student/lessons/us-ca-math-k-k-cc-count-sequence";
const kindergartenOtherTopicPath = "/student/lessons/us-ca-math-k-k-oa-compose-decompose";
const gradeOneAddSubtractTopicPath = "/student/lessons/us-ca-math-p1-1-oa-add-subtract";
const gradeOnePlaceValueTopicPath = "/student/lessons/us-ca-math-p1-1-nbt-place-value";
const gradeOneShapeReasoningTopicPath = "/student/lessons/us-ca-math-p1-1-g-shape-reasoning";
const gradeThreeTopicPath = "/student/lessons/us-ca-math-p3-3-nf-fraction-meaning";
const gradeSixTopicPath = "/student/lessons/us-ca-math-p6-chapter-01";
const highSchoolTopicPath = "/student/lessons/us-ca-math-s3-chapter-03";
const gradeOneWorldTheme = lessonWorldThemeForGrade("P1");
if (!gradeOneWorldTheme) throw new Error("Grade 1 must keep its configured lesson world.");
const gradeOneWorldStopEmojiPalette = gradeOneWorldTheme.stopEmojiPalette;
const nextLessonItemCtaName = /Go to next item|前往下一項|前往下一项/i;
const sourceQuestionById = new Map(usCaliforniaQuestions.map((question) => [question.id, question]));

function sourceQuestionForRenderedId(questionId: string | null) {
  if (!questionId) throw new Error("The visible lesson-practice card must expose its question id.");
  const question = sourceQuestionById.get(questionId);
  if (!question) throw new Error(`No authoritative question record exists for ${questionId}.`);
  return question;
}

async function openLessonPage(page: Page, path: string) {
  await page.goto(path);
  // The world menu hydrates with the lesson shell; the aside is server-rendered
  // but the entry animation can delay stable geometry.
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
}

async function keepLessonWorldMenuOpen(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.removeItem("mais.lesson-menu-hidden");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    } catch {
      // Storage may be unavailable; the menu defaults to the world view and open state.
    }
  });
}

async function moveMouseToVisibleCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("The lesson pane must have visible pointer geometry.");

  const visibleLeft = Math.max(0, box.x);
  const visibleRight = Math.min(viewport.width, box.x + box.width);
  const visibleTop = Math.max(0, box.y);
  const visibleBottom = Math.min(viewport.height, box.y + box.height);
  if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
    throw new Error("The lesson pane must intersect the desktop viewport.");
  }

  await page.mouse.move(
    visibleLeft + (visibleRight - visibleLeft) / 2,
    visibleTop + (visibleBottom - visibleTop) / 2
  );
}

async function waitForAnimationFrames(page: Page, frameCount = 4) {
  await page.evaluate((requestedFrames) => new Promise<void>((resolve) => {
    let remainingFrames = requestedFrames;
    const nextFrame = () => {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(nextFrame);
    };
    window.requestAnimationFrame(nextFrame);
  }), frameCount);
}

async function visibleUnitStopMarker(stop: Locator) {
  const marker = stop.locator('[data-lesson-unit-stop-marker="true"]');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveAttribute("aria-hidden", "true");
  await expect(marker).toBeVisible();
  const geometry = await marker.evaluate((element) => {
    const circle = element.closest("a");
    if (!circle) return null;
    const markerRect = element.getBoundingClientRect();
    const circleRect = circle.getBoundingClientRect();
    return {
      circle: {
        bottom: circleRect.bottom,
        left: circleRect.left,
        right: circleRect.right,
        top: circleRect.top
      },
      marker: {
        bottom: markerRect.bottom,
        height: markerRect.height,
        left: markerRect.left,
        right: markerRect.right,
        top: markerRect.top,
        width: markerRect.width
      }
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.marker.width).toBeGreaterThan(0);
  expect(geometry!.marker.height).toBeGreaterThan(0);
  expect(geometry!.marker.left).toBeGreaterThanOrEqual(geometry!.circle.left - 1);
  expect(geometry!.marker.right).toBeLessThanOrEqual(geometry!.circle.right + 1);
  expect(geometry!.marker.top).toBeGreaterThanOrEqual(geometry!.circle.top - 1);
  expect(geometry!.marker.bottom).toBeLessThanOrEqual(geometry!.circle.bottom + 1);
  return (await marker.textContent())?.trim() ?? "";
}

async function expectLessonTargetVisible(target: Locator) {
  await expect(target).toBeAttached();
  await expect.poll(() => target.evaluate((element) => {
    const targetRect = element.getBoundingClientRect();
    if (window.matchMedia("(min-width: 1024px)").matches) {
      const pane = element.closest<HTMLElement>("[data-lesson-content-pane]");
      if (!pane) return false;
      const paneRect = pane.getBoundingClientRect();
      return targetRect.bottom > paneRect.top + 1 && targetRect.top < paneRect.bottom - 1;
    }
    return targetRect.bottom > 1 && targetRect.top < window.innerHeight - 1;
  }), { timeout: 10_000 }).toBe(true);
}

test.describe("Learning Worlds lesson menu", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAsUserId(page, californiaSuperStudentId);
  });

  test("renders Sprout Meadow for a Kindergarten topic with stops, greeting, and progress", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("[data-world-progress]")).toContainText(/of 6 clearings|6 個|6 个/i);
    await expect(world.locator("[data-world-greeting]")).toBeVisible();

    const isMobile = Boolean(testInfo.project.use.isMobile);
    if (isMobile) {
      // Mobile shows the horizontal ribbon; the full map opens on demand.
      const ribbon = world.locator("[data-world-ribbon]");
      await expect(ribbon).toBeVisible();
      await expect(ribbon.getByRole("link")).toHaveCount(6);
      await world.getByRole("button", { name: /open the full map/i }).click();
      await expect(world.getByRole("link", { name: /Unit 3 clearing/i }).last()).toBeVisible();
    } else {
      // Desktop shows the full winding map with one stop per unit and the
      // current unit's quick-jump stones.
      await expect(world.getByRole("link", { name: /clearing/i })).toHaveCount(6);
      await expect(world.getByRole("link", { name: /Unit 1 clearing.*you are here/i })).toBeVisible();
      await expect(world.getByRole("button", { name: /1\.1/ }).first()).toBeVisible();
    }

    expectNoPageErrors(errors);
  });

  test("navigates between units by tapping stops", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Stop navigation is covered on desktop; the mobile ribbon shares the same links.");
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await world.getByRole("link", { name: /Unit 3 clearing/i }).click();
    await expect(page).toHaveURL(new RegExp(kindergartenOtherTopicPath.replace(/[/.]/g, "\\$&")), { timeout: 30_000 });

    const movedWorld = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(movedWorld).toBeVisible({ timeout: 30_000 });
    await expect(movedWorld.getByRole("link", { name: /Unit 3 clearing.*you are here/i })).toBeVisible();
  });

  test("desktop 1.7 quick jump scrolls only the right lesson pane", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Desktop independent-pane geometry is covered in the desktop project.");
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneAddSubtractTopicPath);

    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const world = leftPane.locator('[data-lesson-world="sprout-meadow"]');
    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    const practice = rightPane.locator("#lesson-practice");
    const practiceJump = quickJumpMap.getByRole("button", { name: /^1\.7(?:\s|$)/ });

    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    await expect(quickJumpMap.getByRole("link")).toHaveCount(16);
    await expect(currentUnit).toHaveCount(1);
    await expect(practice).toBeAttached();
    await practiceJump.scrollIntoViewIfNeeded();
    await expect(practiceJump).toBeVisible();

    const before = {
      currentHref: await currentUnit.getAttribute("href"),
      currentLabel: await currentUnit.getAttribute("aria-label"),
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      rightScrollTop: await rightPane.evaluate((pane) => pane.scrollTop),
      url: page.url(),
      windowY: await page.evaluate(() => window.scrollY)
    };
    expect(before.currentHref).toBe(gradeOneAddSubtractTopicPath);
    const currentWasVisible = await currentUnit.evaluate((current) => {
      const pane = current.closest<HTMLElement>("[data-lesson-directory-pane]");
      if (!pane) return false;
      const paneRect = pane.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      return currentRect.top >= paneRect.top - 1 && currentRect.bottom <= paneRect.bottom + 1;
    });
    expect(currentWasVisible).toBeTruthy();

    await practiceJump.click();
    await expect.poll(
      () => rightPane.evaluate((pane) => pane.scrollTop),
      { timeout: 5_000 }
    ).toBeGreaterThan(before.rightScrollTop + 1);
    await expect.poll(
      () => rightPane.evaluate((pane) => {
        const target = pane.querySelector<HTMLElement>("#lesson-practice");
        if (!target) return false;
        const paneRect = pane.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        return targetRect.bottom > paneRect.top + 1 &&
          targetRect.top >= paneRect.top - 1 &&
          targetRect.top < paneRect.bottom - 1;
      }),
      { timeout: 5_000 }
    ).toBe(true);

    const after = {
      currentHref: await currentUnit.getAttribute("href"),
      currentLabel: await currentUnit.getAttribute("aria-label"),
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      rightScrollTop: await rightPane.evaluate((pane) => pane.scrollTop),
      url: page.url(),
      windowY: await page.evaluate(() => window.scrollY)
    };
    const currentIsStillVisible = await currentUnit.evaluate((current) => {
      const pane = current.closest<HTMLElement>("[data-lesson-directory-pane]");
      if (!pane) return false;
      const paneRect = pane.getBoundingClientRect();
      const currentRect = current.getBoundingClientRect();
      return currentRect.top >= paneRect.top - 1 && currentRect.bottom <= paneRect.bottom + 1;
    });

    expect(Math.abs(after.windowY - before.windowY)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.leftScrollTop - before.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(after.rightScrollTop).toBeGreaterThan(before.rightScrollTop + 1);
    expect(after.url).toBe(before.url);
    expect(after.currentHref).toBe(before.currentHref);
    expect(after.currentLabel).toBe(before.currentLabel);
    expect(currentIsStillVisible).toBeTruthy();
    expectNoPageErrors(errors);
  });

  test("desktop Unit 2 moves lesson markers behind menu titles and numbers matching content headings", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Desktop title and pane geometry are covered in the desktop project.");
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOnePlaceValueTopicPath);

    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const world = leftPane.locator('[data-lesson-world="sprout-meadow"]');
    const quickJumpMap = world.locator("ol:visible");
    const countingJump = quickJumpMap.getByRole("button", { name: "2.1 Counting to 120 1️⃣", exact: true });
    const tensOnesJump = quickJumpMap.getByRole("button", { name: "2.2 Tens and Ones 🏗️", exact: true });
    const labJump = quickJumpMap.getByRole("button", { name: "2.5 Interactive lab", exact: true });
    const practiceJump = quickJumpMap.getByRole("button", { name: "2.6 Practice check", exact: true });
    const countingHeading = rightPane.getByRole("heading", { level: 2, name: "2.1 Counting to 120", exact: true });
    const tensOnesHeading = rightPane.getByRole("heading", { level: 2, name: "2.2 Tens and Ones", exact: true });
    const labHeading = rightPane.getByRole("heading", { level: 2, name: "2.5 Interactive lab", exact: true });
    const practiceHeading = rightPane.getByRole("heading", { level: 2, name: "2.6 Practice check", exact: true });

    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    await expect(quickJumpMap.locator('a[aria-current="page"]')).toHaveAttribute("href", gradeOnePlaceValueTopicPath);
    await expect(countingJump).toHaveCount(1);
    await expect(tensOnesJump).toHaveCount(1);
    await expect(labJump).toHaveCount(1);
    await expect(practiceJump).toHaveCount(1);
    await expect(countingHeading).toHaveCount(1);
    await expect(tensOnesHeading).toHaveCount(1);
    await expect(labHeading).toHaveCount(1);
    await expect(practiceHeading).toHaveCount(1);
    await expect(rightPane.getByRole("heading", { level: 2, name: /^1️⃣/ })).toHaveCount(0);
    await expect(rightPane.getByRole("heading", { level: 2, name: /^🏗️/ })).toHaveCount(0);

    await tensOnesJump.scrollIntoViewIfNeeded();
    await expect(tensOnesJump).toBeVisible();
    const before = {
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };

    await tensOnesJump.click();
    await expect.poll(() => tensOnesHeading.evaluate((heading) => {
      const pane = heading.closest<HTMLElement>("[data-lesson-content-pane]");
      if (!pane) return false;
      const paneRect = pane.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      return headingRect.bottom > paneRect.top + 1 && headingRect.top < paneRect.bottom - 1;
    }), { timeout: 5_000 }).toBe(true);

    expect(Math.abs(await leftPane.evaluate((pane) => pane.scrollTop) - before.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - before.windowY)).toBeLessThanOrEqual(1);
    await expect(page).toHaveURL(new RegExp(`${gradeOnePlaceValueTopicPath.replace(/[/.]/g, "\\$&")}$`));
    expectNoPageErrors(errors);
  });

  test("Grade 1 Unit 2 uses a cartoon unit stop while preserving numbering, quick jumps, and navigation", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOnePlaceValueTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });

    const isMobile = Boolean(testInfo.project.use.isMobile);
    const firstVisibleCurrentStop = isMobile
      ? world.locator('[data-world-ribbon] a[aria-current="page"]')
      : world.locator('ol:visible a[aria-current="page"]');
    await expect(firstVisibleCurrentStop).toHaveCount(1);
    await expect(firstVisibleCurrentStop).toHaveAccessibleName(/^Unit 2 clearing: .+ \(you are here\)$/);
    const firstMarkerText = await visibleUnitStopMarker(firstVisibleCurrentStop);
    expect(firstMarkerText).not.toBe("");
    expect(gradeOneWorldStopEmojiPalette).toContain(firstMarkerText);
    await expect(firstVisibleCurrentStop).not.toHaveAccessibleName(new RegExp(firstMarkerText, "u"));
    expect(/[0-9\u20E3]/u.test(firstMarkerText)).toBe(false);
    expect(["🔟", "🔢", "💯"].includes(firstMarkerText)).toBe(false);
    const countingHeading = page.getByRole("heading", { level: 2, name: "2.1 Counting to 120", exact: true });
    await expect(countingHeading).toHaveCount(1);
    expect((await countingHeading.textContent())?.trim()).toBe("2.1 Counting to 120");

    if (isMobile) {
      await world.getByRole("button", { name: /open the full map/i }).click();
    }
    const quickJumpMap = world.locator("ol:visible");
    const unitLinks = quickJumpMap.getByRole("link");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    await expect(unitLinks).toHaveCount(16);
    await expect(currentUnit).toHaveCount(1);
    await expect(currentUnit).toHaveAttribute("href", gradeOnePlaceValueTopicPath);
    await expect(currentUnit).toHaveAccessibleName(/^Unit 2 clearing: .+ \(you are here\)$/);
    const mapMarkerText = await visibleUnitStopMarker(currentUnit);
    expect(mapMarkerText).toBe(firstMarkerText);
    expect(gradeOneWorldStopEmojiPalette).toContain(mapMarkerText);
    await expect(currentUnit).not.toHaveAccessibleName(new RegExp(mapMarkerText, "u"));
    expect(/[0-9\u20E3]/u.test(mapMarkerText)).toBe(false);
    const unitOne = quickJumpMap.getByRole("link", { name: /^Unit 1 clearing:/ });
    await expect(unitOne).toHaveCount(1);
    expect(await visibleUnitStopMarker(unitOne)).toBe("📖");
    await expect(
      quickJumpMap.getByRole("button", { name: "2.1 Counting to 120 1️⃣", exact: true })
    ).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      )
    ).toBe(false);

    const nextUnit = quickJumpMap.getByRole("link", { name: /Unit 3 clearing/i });
    await expect(nextUnit).toHaveCount(1);
    const nextHref = await nextUnit.getAttribute("href");
    expect(nextHref).toBeTruthy();
    await nextUnit.click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(nextHref!);
    expectNoPageErrors(errors);
  });

  test("Grade 1 Unit 2 omits next-item CTAs while every lesson target remains usable", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOnePlaceValueTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });

    if (Boolean(testInfo.project.use.isMobile)) {
      await world.getByRole("button", { name: /open the full map/i }).click();
    }

    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    await expect(currentUnit).toHaveCount(1);
    const currentHref = await currentUnit.getAttribute("href");
    const currentAccessibleName = await currentUnit.getAttribute("aria-label");
    expect(currentHref).toBe(gradeOnePlaceValueTopicPath);
    expect(currentAccessibleName).toBeTruthy();

    await expect(page.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(rightPane.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(page.locator("[data-lesson-next-item-button]")).toHaveCount(0);
    await expect(rightPane.locator("[data-lesson-next-item-button]")).toHaveCount(0);

    for (let part = 1; part <= 6; part += 1) {
      const ordinal = new RegExp(`^2\\.${part}\\s`);
      await expect(quickJumpMap.getByRole("button", { name: ordinal })).toHaveCount(1);
      await expect(rightPane.getByRole("heading", { level: 2, name: ordinal })).toHaveCount(1);
    }

    const lessonUrl = page.url();
    for (const { ordinal, targetId } of [
      { ordinal: "2.2", targetId: null },
      { ordinal: "2.5", targetId: "visualization" },
      { ordinal: "2.6", targetId: "lesson-practice" }
    ]) {
      const jump = quickJumpMap.getByRole("button", { name: new RegExp(`^${ordinal.replace(".", "\\.")}\\s`) });
      await jump.scrollIntoViewIfNeeded();
      await expect(jump).toBeVisible();
      await jump.click();
      const contentTarget = targetId
        ? rightPane.locator(`#${targetId}`)
        : rightPane.getByRole("heading", { level: 2, name: /^2\.2\s/ });
      await expectLessonTargetVisible(contentTarget);
      await expect.poll(() => new URL(page.url()).pathname).toBe(gradeOnePlaceValueTopicPath);
      await expect(currentUnit).toHaveAttribute("href", currentHref!);
      await expect(currentUnit).toHaveAttribute("aria-label", currentAccessibleName!);
    }

    expect(page.url()).toBe(lessonUrl);
    await expect(page.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(page.locator("[data-lesson-next-item-button]")).toHaveCount(0);
    await expect(page.locator("[data-viz-lesson-action-slot]")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      )
    ).toBe(false);
    expectNoPageErrors(errors);
  });

  test("Grade 1 Shape Reasoning removes the reported visualization CTA without removing lesson content", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneShapeReasoningTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const visualization = rightPane.locator("#visualization");
    const checklist = rightPane.locator('[data-tour="student-lesson-checklist"]');
    const practice = rightPane.locator("#lesson-practice");
    const isMobile = Boolean(testInfo.project.use.isMobile);
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });

    if (isMobile) {
      await world.getByRole("button", { name: /open the full map/i }).click();
    }

    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    const visualizationJump = quickJumpMap.getByRole("button", { name: "4.4 Interactive lab", exact: true });
    const practiceJump = quickJumpMap.getByRole("button", { name: "4.5 Practice check", exact: true });
    await expect(currentUnit).toHaveCount(1);
    await expect(currentUnit).toHaveAttribute("href", gradeOneShapeReasoningTopicPath);
    await expect(visualizationJump).toHaveCount(1);
    await expect(practiceJump).toHaveCount(1);

    for (const { contentTitle, menuTitle } of [
      { menuTitle: "4.1 What Makes a Shape 🔺", contentTitle: "4.1 What Makes a Shape" },
      { menuTitle: "4.2 Composing New Shapes 🏠", contentTitle: "4.2 Composing New Shapes" },
      { menuTitle: "4.3 Halves and Fourths 🍕", contentTitle: "4.3 Halves and Fourths" },
      { menuTitle: "4.4 Interactive lab", contentTitle: "4.4 Interactive lab" },
      { menuTitle: "4.5 Practice check", contentTitle: "4.5 Practice check" }
    ]) {
      await expect(quickJumpMap.getByRole("button", { name: menuTitle, exact: true })).toHaveCount(1);
      await expect(rightPane.getByRole("heading", { level: 2, name: contentTitle, exact: true })).toHaveCount(1);
    }

    await practiceJump.scrollIntoViewIfNeeded();
    await visualizationJump.scrollIntoViewIfNeeded();
    await expect(visualizationJump).toBeVisible();
    await expect(practiceJump).toBeVisible();
    const currentHref = await currentUnit.getAttribute("href");
    const currentAccessibleName = await currentUnit.getAttribute("aria-label");
    const lessonUrl = page.url();
    const desktopDirectoryBaseline = isMobile
      ? null
      : {
          leftScrollTop: await page.locator("[data-lesson-directory-pane]:visible").evaluate((pane) => pane.scrollTop),
          windowY: await page.evaluate(() => window.scrollY)
        };

    await visualizationJump.click();
    await expectLessonTargetVisible(visualization);
    const valueControl = visualization.locator('input[type="range"]').first();
    const resetModel = visualization.locator("[data-viz-reset-model]");
    await expect(valueControl).toBeVisible({ timeout: 30_000 });
    await expect(resetModel).toBeVisible({ timeout: 30_000 });
    const initialValue = Number(await valueControl.inputValue());
    const minimumValue = Number(await valueControl.getAttribute("min"));
    const maximumValue = Number(await valueControl.getAttribute("max"));
    const changedValue = initialValue === maximumValue ? minimumValue : maximumValue;
    expect(initialValue).toBe(5);
    expect(changedValue).not.toBe(initialValue);
    await valueControl.fill(String(changedValue));
    await expect(valueControl).toHaveValue(String(changedValue));
    await expect(resetModel).toHaveAttribute("data-viz-reset-value", String(changedValue));
    await resetModel.click();
    await expect(resetModel).toHaveAttribute("data-viz-reset-value", "5");
    await expect(valueControl).toHaveValue(String(initialValue));
    await expect(visualization.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(visualization.locator("[data-lesson-next-item-button]")).toHaveCount(0);

    if (isMobile) {
      await checklist.scrollIntoViewIfNeeded();
    } else {
      await rightPane.evaluate((pane) => {
        const target = pane.querySelector<HTMLElement>('[data-tour="student-lesson-checklist"]');
        if (!target) throw new Error("The lesson checklist must render inside the right lesson pane.");
        const paneRect = pane.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        pane.scrollTo({
          behavior: "auto",
          top: Math.max(0, pane.scrollTop + targetRect.top - paneRect.top - 16)
        });
      });
      await waitForAnimationFrames(page);
    }
    await expectLessonTargetVisible(checklist);
    if (desktopDirectoryBaseline) {
      const checklistScrollState = {
        leftScrollTop: await page.locator("[data-lesson-directory-pane]:visible").evaluate((pane) => pane.scrollTop),
        windowY: await page.evaluate(() => window.scrollY)
      };
      expect(Math.abs(checklistScrollState.leftScrollTop - desktopDirectoryBaseline.leftScrollTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(checklistScrollState.windowY - desktopDirectoryBaseline.windowY)).toBeLessThanOrEqual(1);
    }
    await expect(checklist.getByRole("checkbox").first()).toBeVisible();
    await expect(
      checklist.getByRole("button", { name: /Mark lesson complete|標記課節完成|标记课时完成|Lesson complete|課節已完成|课时已完成/i })
    ).toBeVisible();
    await expect(practice).toHaveCount(1);
    await expect(practice.getByRole("heading", { level: 2, name: "4.5 Practice check", exact: true })).toHaveCount(1);

    await practiceJump.click();
    await expectLessonTargetVisible(practice);
    await expect(practice.getByText(/Question 1 of/i)).toBeVisible();
    const nextQuestion = practice.getByRole("button", { name: /Next question/i });
    await expect(nextQuestion).toBeVisible();
    await expect(nextQuestion).toBeEnabled();
    await nextQuestion.click();
    await expect(practice.getByText(/Question 2 of/i)).toBeVisible();

    await expect(page.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(rightPane.getByRole("button", { name: nextLessonItemCtaName })).toHaveCount(0);
    await expect(page.locator("[data-lesson-next-item-button]")).toHaveCount(0);
    await expect(page.locator("[data-viz-lesson-action-slot]")).toHaveCount(0);
    expect(page.url()).toBe(lessonUrl);
    await expect(currentUnit).toHaveAttribute("href", currentHref!);
    await expect(currentUnit).toHaveAttribute("aria-label", currentAccessibleName!);
    if (desktopDirectoryBaseline) {
      const desktopDirectoryAfter = {
        leftScrollTop: await page.locator("[data-lesson-directory-pane]:visible").evaluate((pane) => pane.scrollTop),
        windowY: await page.evaluate(() => window.scrollY)
      };
      expect(Math.abs(desktopDirectoryAfter.leftScrollTop - desktopDirectoryBaseline.leftScrollTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(desktopDirectoryAfter.windowY - desktopDirectoryBaseline.windowY)).toBeLessThanOrEqual(1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      )
    ).toBe(false);
    expectNoPageErrors(errors);
  });

  test("Shape Reasoning lesson practice waits three seconds and manual navigation cancels a pending move", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await page.clock.install();
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneShapeReasoningTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const practice = rightPane.locator("#lesson-practice");
    await expect(world).toBeVisible({ timeout: 30_000 });
    if (Boolean(testInfo.project.use.isMobile)) {
      await world.getByRole("button", { name: /open the full map/i }).click();
    }

    const practiceJump = world.locator("ol:visible").getByRole("button", {
      name: "4.5 Practice check",
      exact: true
    });
    await practiceJump.scrollIntoViewIfNeeded();
    await practiceJump.click();
    await expectLessonTargetVisible(practice);

    const questionCards = practice.locator('[data-ai-selectable="practice-question"]');
    const visibleQuestionCard = () => practice.locator('[data-ai-selectable="practice-question"]:not([hidden])');
    const questionIds = await questionCards.evaluateAll((cards) => cards.map(
      (card) => card.getAttribute("data-ai-question-id")
    ));
    expect(questionIds).toHaveLength(5);
    const firstQuestion = sourceQuestionForRenderedId(questionIds[0] ?? null);
    const secondQuestion = sourceQuestionForRenderedId(questionIds[1] ?? null);
    expect(firstQuestion.topicId).toBe("us-ca-math-p1-1-g-shape-reasoning");
    expect(secondQuestion.topicId).toBe("us-ca-math-p1-1-g-shape-reasoning");
    expect(firstQuestion.type).toBe("multiple-choice");
    expect(secondQuestion.type).toBe("multiple-choice");
    await expect(visibleQuestionCard()).toHaveCount(1);
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", firstQuestion.id);
    await expect(practice.getByText(/Question 1 of 5/i)).toBeVisible();
    const missionTrail = practice.locator('[data-testid="lesson-mission-trail"]');
    const firstStone = missionTrail.getByRole("button", { name: /Question 1/i });
    const secondStone = missionTrail.getByRole("button", { name: /Go to question 2/i });
    await expect(firstStone).toHaveAttribute("aria-current", "step");

    await page.clock.pauseAt(await page.evaluate(() => Date.now()));
    const firstCard = visibleQuestionCard();
    await firstCard.getByRole("button", { name: firstQuestion.answer, exact: true }).click();
    const firstAttempt = page.waitForResponse((response) => {
      const postData = response.request().postData() ?? "";
      return response.url().includes("/api/attempts")
        && response.request().method() === "POST"
        && postData.includes(`"questionId":"${firstQuestion.id}"`);
    });
    await firstCard.getByRole("button", { name: /^(Check Answer|檢查答案|检查答案)$/i }).click();
    const firstResponse = await firstAttempt;
    expect(firstResponse.ok()).toBe(true);
    expect((await firstResponse.json() as { correct?: boolean }).correct).toBe(true);
    await expect(firstCard.getByText(/^(Correct\b|正確|正确)/i).first()).toBeVisible();

    await page.clock.fastForward(2_999);
    await expect(practice.getByText(/Question 1 of 5/i)).toBeVisible();
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", firstQuestion.id);
    await expect(firstStone).toHaveAttribute("aria-current", "step");
    await page.clock.fastForward(1);
    await expect(practice.getByText(/Question 2 of 5/i)).toBeVisible();
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", secondQuestion.id);
    await expect(secondStone).toHaveAttribute("aria-current", "step");

    const secondCard = visibleQuestionCard();
    await secondCard.getByRole("button", { name: secondQuestion.answer, exact: true }).click();
    const secondAttempt = page.waitForResponse((response) => {
      const postData = response.request().postData() ?? "";
      return response.url().includes("/api/attempts")
        && response.request().method() === "POST"
        && postData.includes(`"questionId":"${secondQuestion.id}"`);
    });
    await secondCard.getByRole("button", { name: /^(Check Answer|檢查答案|检查答案)$/i }).click();
    const secondResponse = await secondAttempt;
    expect(secondResponse.ok()).toBe(true);
    expect((await secondResponse.json() as { correct?: boolean }).correct).toBe(true);
    await expect(secondCard.getByText(/^(Correct\b|正確|正确)/i).first()).toBeVisible();

    const fourthStone = missionTrail.getByRole("button", { name: /Go to question 4/i });
    await fourthStone.click();
    await expect(fourthStone).toBeFocused();
    await expect(fourthStone).toHaveAttribute("aria-current", "step");
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", questionIds[3]!);
    await page.clock.fastForward(3_001);
    await expect(practice.getByText(/Question 4 of 5/i)).toBeVisible();
    await expect(fourthStone).toHaveAttribute("aria-current", "step");
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", questionIds[3]!);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      )
    ).toBe(false);
    expectNoPageErrors(errors);
  });

  test("desktop lesson mission stones change questions without moving the left directory", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Desktop independent-pane geometry is covered in the desktop project.");
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneAddSubtractTopicPath);

    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const world = leftPane.locator('[data-lesson-world="sprout-meadow"]');
    const unitLinks = world.locator("ol:visible").getByRole("link");
    const currentUnit = world.locator('ol:visible a[aria-current="page"]');
    const practice = rightPane.locator("#lesson-practice");
    const missionTrail = practice.locator('[data-testid="lesson-mission-trail"]');

    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    await expect(unitLinks).toHaveCount(16);
    await expect(currentUnit).toHaveCount(1);
    await expect(practice).toBeAttached();

    const leftBounds = await leftPane.evaluate((pane) => {
      const maxScrollTop = pane.scrollHeight - pane.clientHeight;
      pane.scrollTop = Math.round(maxScrollTop * 0.62);
      return { maxScrollTop };
    });
    await waitForAnimationFrames(page);
    const leftScrollTop = await leftPane.evaluate((pane) => pane.scrollTop);
    expect(leftBounds.maxScrollTop).toBeGreaterThan(1);
    expect(leftScrollTop).toBeGreaterThan(leftBounds.maxScrollTop * 0.35);

    const anchorIndex = await unitLinks.evaluateAll((links) => {
      const pane = links[0]?.closest<HTMLElement>("[data-lesson-directory-pane]");
      if (!pane) return -1;
      const paneRect = pane.getBoundingClientRect();
      return links.findIndex((link) => {
        const rect = link.getBoundingClientRect();
        return rect.top >= paneRect.top + 4 && rect.bottom <= paneRect.bottom - 4;
      });
    });
    expect(anchorIndex).toBeGreaterThanOrEqual(0);
    const leftAnchor = unitLinks.nth(anchorIndex);
    await expect(leftAnchor).toBeVisible();
    const leftAnchorHandle = await leftAnchor.elementHandle();
    const currentUnitHandle = await currentUnit.elementHandle();
    if (!leftAnchorHandle || !currentUnitHandle) {
      throw new Error("Stable left-directory anchors must remain attached during the mission-trail test.");
    }

    await rightPane.evaluate((pane) => {
      const target = pane.querySelector<HTMLElement>("#lesson-practice");
      if (!target) throw new Error("Lesson practice must render inside the right pane.");
      const paneRect = pane.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      pane.scrollTo({
        behavior: "auto",
        top: Math.max(0, pane.scrollTop + targetRect.top - paneRect.top - 16)
      });
    });
    await expect(missionTrail).toBeVisible({ timeout: 30_000 });
    await expect(missionTrail.getByRole("button")).toHaveCount(5);

    const questionCards = practice.locator('[data-ai-selectable="practice-question"]');
    await expect(questionCards).toHaveCount(5);
    const questionIds = await questionCards.evaluateAll((cards) => cards.map((card) => card.getAttribute("data-ai-question-id")));
    expect(questionIds.every(Boolean)).toBe(true);
    expect(new Set(questionIds).size).toBe(5);

    const readPaneRelativeAnchor = (anchor: Locator) => anchor.evaluate((element) => {
      const pane = element.closest<HTMLElement>("[data-lesson-directory-pane]");
      if (!pane) throw new Error("The stable anchor must remain inside the left lesson pane.");
      const paneRect = pane.getBoundingClientRect();
      const anchorRect = element.getBoundingClientRect();
      return {
        bottom: anchorRect.bottom - paneRect.top,
        href: element.getAttribute("href"),
        label: element.getAttribute("aria-label"),
        top: anchorRect.top - paneRect.top
      };
    });

    const baseline = {
      currentUnit: await readPaneRelativeAnchor(currentUnit),
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      stableAnchor: await readPaneRelativeAnchor(leftAnchor),
      url: page.url(),
      windowHash: await page.evaluate(() => window.location.hash),
      windowY: await page.evaluate(() => window.scrollY)
    };
    expect(baseline.leftScrollTop).toBeGreaterThan(0);
    await leftPane.evaluate((pane) => {
      const evidence = {
        leftScrollTops: [pane.scrollTop],
        windowYs: [window.scrollY]
      };
      const recordLeftScroll = () => evidence.leftScrollTops.push(pane.scrollTop);
      const recordWindowScroll = () => evidence.windowYs.push(window.scrollY);
      pane.addEventListener("scroll", recordLeftScroll, { passive: true });
      window.addEventListener("scroll", recordWindowScroll, { passive: true });
      const evidenceOwner = window as typeof window & {
        __lessonMissionScrollEvidence?: typeof evidence & { cleanup: () => void };
      };
      evidenceOwner.__lessonMissionScrollEvidence = {
        ...evidence,
        cleanup: () => {
          pane.removeEventListener("scroll", recordLeftScroll);
          window.removeEventListener("scroll", recordWindowScroll);
        }
      };
    });

    for (const questionNumber of [2, 3, 4, 1]) {
      const missionStone = missionTrail.getByRole("button", { name: `Go to question ${questionNumber}`, exact: true });
      await expect(missionStone).toHaveCount(1);
      await missionStone.click();

      await expect(missionStone).toBeFocused();
      await expect(missionStone).toHaveAttribute("aria-current", "step");
      await expect(practice.getByText(`Question ${questionNumber} of 5`, { exact: true })).toBeVisible();
      const visibleQuestion = practice.locator('[data-ai-selectable="practice-question"]:not([hidden])');
      await expect(visibleQuestion).toHaveCount(1);
      await expect(visibleQuestion).toHaveAttribute(
        "data-ai-question-id",
        questionIds[questionNumber - 1]!
      );

      const after = {
        currentUnit: await readPaneRelativeAnchor(currentUnit),
        leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
        stableAnchor: await readPaneRelativeAnchor(leftAnchor),
        url: page.url(),
        windowHash: await page.evaluate(() => window.location.hash),
        windowY: await page.evaluate(() => window.scrollY)
      };
      expect(await leftAnchor.evaluate((candidate, original) => candidate.isSameNode(original), leftAnchorHandle)).toBe(true);
      expect(await currentUnit.evaluate((candidate, original) => candidate.isSameNode(original), currentUnitHandle)).toBe(true);
      expect(after.stableAnchor.href).toBe(baseline.stableAnchor.href);
      expect(after.stableAnchor.label).toBe(baseline.stableAnchor.label);
      expect(Math.abs(after.stableAnchor.top - baseline.stableAnchor.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.stableAnchor.bottom - baseline.stableAnchor.bottom)).toBeLessThanOrEqual(1);
      expect(after.currentUnit.href).toBe(baseline.currentUnit.href);
      expect(after.currentUnit.label).toBe(baseline.currentUnit.label);
      expect(Math.abs(after.currentUnit.top - baseline.currentUnit.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.currentUnit.bottom - baseline.currentUnit.bottom)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.leftScrollTop - baseline.leftScrollTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.windowY - baseline.windowY)).toBeLessThanOrEqual(1);
      expect(after.url).toBe(baseline.url);
      expect(after.windowHash).toBe(baseline.windowHash);
    }

    const scrollEvidence = await page.evaluate(() => {
      const evidenceOwner = window as typeof window & {
        __lessonMissionScrollEvidence?: {
          cleanup: () => void;
          leftScrollTops: number[];
          windowYs: number[];
        };
      };
      const evidence = evidenceOwner.__lessonMissionScrollEvidence;
      if (!evidence) throw new Error("Mission-trail scroll evidence recorder was not installed.");
      evidence.cleanup();
      return { leftScrollTops: evidence.leftScrollTops, windowYs: evidence.windowYs };
    });
    expect(scrollEvidence.leftScrollTops.every((value) => Math.abs(value - baseline.leftScrollTop) <= 1)).toBe(true);
    expect(scrollEvidence.windowYs.every((value) => Math.abs(value - baseline.windowY) <= 1)).toBe(true);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);

    expectNoPageErrors(errors);
  });

  test("desktop wheel input stays with the lesson pane under the pointer", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Desktop native wheel containment is covered in the desktop project.");
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneAddSubtractTopicPath);

    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const world = leftPane.locator('[data-lesson-world="sprout-meadow"]');
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("ol:visible").getByRole("link")).toHaveCount(16);

    // Let the deferred visualization finish replacing its short placeholder so
    // the right-pane bottom remains a real boundary throughout this test.
    const visualization = rightPane.locator("#visualization");
    await expect(visualization).toBeAttached();
    const beforeVisualizationSetup = {
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    await rightPane.evaluate((pane) => {
      const target = pane.querySelector<HTMLElement>("#visualization");
      if (!target) throw new Error("The lesson visualization must render inside the right pane.");
      const paneRect = pane.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetCenterWithinPane = pane.scrollTop + targetRect.top - paneRect.top + targetRect.height / 2;
      pane.scrollTo({
        behavior: "auto",
        top: Math.max(0, targetCenterWithinPane - pane.clientHeight / 2)
      });
    });
    await expect.poll(() => visualization.evaluate((target) => {
      const pane = target.closest<HTMLElement>("[data-lesson-content-pane]");
      if (!pane) return false;
      const paneRect = pane.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      return targetRect.bottom > paneRect.top + 1 && targetRect.top < paneRect.bottom - 1;
    })).toBe(true);
    await expect(
      visualization.locator(":scope > [aria-hidden='true'].animate-pulse")
    ).toHaveCount(0, { timeout: 30_000 });
    await waitForAnimationFrames(page);
    const afterVisualizationSetup = {
      leftScrollTop: await leftPane.evaluate((pane) => pane.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    expect(Math.abs(afterVisualizationSetup.leftScrollTop - beforeVisualizationSetup.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterVisualizationSetup.windowY - beforeVisualizationSetup.windowY)).toBeLessThanOrEqual(1);

    await Promise.all([
      leftPane.evaluate((pane) => { pane.scrollTop = 0; }),
      rightPane.evaluate((pane) => { pane.scrollTop = 0; })
    ]);
    await waitForAnimationFrames(page);

    const readScrollState = async () => {
      const [leftScrollTop, rightScrollTop, windowY] = await Promise.all([
        leftPane.evaluate((pane) => pane.scrollTop),
        rightPane.evaluate((pane) => pane.scrollTop),
        page.evaluate(() => window.scrollY)
      ]);
      return { leftScrollTop, rightScrollTop, windowY };
    };
    const readPaneBounds = async () => {
      const [left, right] = await Promise.all([
        leftPane.evaluate((pane) => ({ clientHeight: pane.clientHeight, scrollHeight: pane.scrollHeight })),
        rightPane.evaluate((pane) => ({ clientHeight: pane.clientHeight, scrollHeight: pane.scrollHeight }))
      ]);
      return {
        leftMax: left.scrollHeight - left.clientHeight,
        rightMax: right.scrollHeight - right.clientHeight
      };
    };

    const bounds = await readPaneBounds();
    expect(bounds.leftMax).toBeGreaterThan(1);
    expect(bounds.rightMax).toBeGreaterThan(1);

    const beforeLeftWheel = await readScrollState();
    await moveMouseToVisibleCenter(page, leftPane);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => leftPane.evaluate((pane) => pane.scrollTop)).toBeGreaterThan(
      beforeLeftWheel.leftScrollTop + 1
    );
    await waitForAnimationFrames(page);
    const afterLeftWheel = await readScrollState();
    expect(Math.abs(afterLeftWheel.rightScrollTop - beforeLeftWheel.rightScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterLeftWheel.windowY - beforeLeftWheel.windowY)).toBeLessThanOrEqual(1);

    const beforeRightWheel = await readScrollState();
    await moveMouseToVisibleCenter(page, rightPane);
    await page.mouse.wheel(0, 700);
    await expect.poll(() => rightPane.evaluate((pane) => pane.scrollTop)).toBeGreaterThan(
      beforeRightWheel.rightScrollTop + 1
    );
    await waitForAnimationFrames(page);
    const afterRightWheel = await readScrollState();
    expect(Math.abs(afterRightWheel.leftScrollTop - beforeRightWheel.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRightWheel.windowY - beforeRightWheel.windowY)).toBeLessThanOrEqual(1);

    await leftPane.evaluate((pane) => { pane.scrollTop = pane.scrollHeight; });
    await waitForAnimationFrames(page);
    const leftBottomBounds = await readPaneBounds();
    const beforeLeftBoundaryWheel = await readScrollState();
    expect(Math.abs(beforeLeftBoundaryWheel.leftScrollTop - leftBottomBounds.leftMax)).toBeLessThanOrEqual(1);
    await moveMouseToVisibleCenter(page, leftPane);
    await page.mouse.wheel(0, 900);
    await waitForAnimationFrames(page);
    const afterLeftBoundaryWheel = await readScrollState();
    expect(Math.abs(afterLeftBoundaryWheel.leftScrollTop - beforeLeftBoundaryWheel.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterLeftBoundaryWheel.rightScrollTop - beforeLeftBoundaryWheel.rightScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterLeftBoundaryWheel.windowY - beforeLeftBoundaryWheel.windowY)).toBeLessThanOrEqual(1);

    await rightPane.evaluate((pane) => { pane.scrollTop = pane.scrollHeight; });
    await waitForAnimationFrames(page);
    const rightBottomBounds = await readPaneBounds();
    const beforeRightBoundaryWheel = await readScrollState();
    expect(Math.abs(beforeRightBoundaryWheel.rightScrollTop - rightBottomBounds.rightMax)).toBeLessThanOrEqual(1);
    await moveMouseToVisibleCenter(page, rightPane);
    await page.mouse.wheel(0, 900);
    await waitForAnimationFrames(page);
    const afterRightBoundaryWheel = await readScrollState();
    expect(Math.abs(afterRightBoundaryWheel.rightScrollTop - beforeRightBoundaryWheel.rightScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRightBoundaryWheel.leftScrollTop - beforeRightBoundaryWheel.leftScrollTop)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRightBoundaryWheel.windowY - beforeRightBoundaryWheel.windowY)).toBeLessThanOrEqual(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
    expectNoPageErrors(errors);
  });

  test("mobile 1.7 quick jump keeps a single document scroll flow", async ({ page }, testInfo) => {
    test.skip(!Boolean(testInfo.project.use.isMobile), "Mobile document-flow behavior is covered in the mobile project.");
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneAddSubtractTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await world.getByRole("button", { name: /open the full map/i }).click();

    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    const practiceJump = quickJumpMap.getByRole("button", { name: /^1\.7(?:\s|$)/ });
    const practice = rightPane.locator("#lesson-practice");
    await expect(quickJumpMap.getByRole("link")).toHaveCount(16);
    await expect(currentUnit).toHaveCount(1);
    await practiceJump.scrollIntoViewIfNeeded();
    await expect(practiceJump).toBeVisible();

    const before = {
      currentHref: await currentUnit.getAttribute("href"),
      currentLabel: await currentUnit.getAttribute("aria-label"),
      url: page.url(),
      windowY: await page.evaluate(() => window.scrollY)
    };
    expect(before.currentHref).toBe(gradeOneAddSubtractTopicPath);
    const mobileInnerScrollRootCount = () => page
      .locator("[data-lesson-directory-pane]:visible, [data-lesson-content-pane]:visible")
      .evaluateAll((panes) => panes.filter((pane) => {
        const overflowY = window.getComputedStyle(pane).overflowY;
        return (overflowY === "auto" || overflowY === "scroll") && pane.scrollHeight > pane.clientHeight + 1;
      }).length);
    expect(await mobileInnerScrollRootCount()).toBe(0);

    await practiceJump.click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeGreaterThan(before.windowY + 1);
    await expect(practice).toBeInViewport({ ratio: 0.01 });
    expect(await mobileInnerScrollRootCount()).toBe(0);

    expect(page.url()).toBe(before.url);
    await expect(quickJumpMap.locator('a[aria-current="page"]')).toHaveCount(1);
    expect(await quickJumpMap.locator('a[aria-current="page"]').getAttribute("href")).toBe(before.currentHref);
    expect(await quickJumpMap.locator('a[aria-current="page"]').getAttribute("aria-label")).toBe(before.currentLabel);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(hasHorizontalOverflow).toBe(false);
    expectNoPageErrors(errors);
  });

  test("List view swaps to the accordion directory and the preference survives reload", async ({ page }) => {
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await world.getByRole("button", { name: /list view/i }).click();

    const accordion = page.getByRole("complementary", { name: /course unit directory/i });
    await expect(accordion).toBeVisible();
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("complementary", { name: /course unit directory/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);

    await page.getByRole("button", { name: /map view/i }).click();
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toBeVisible();
  });

  test("renders Voyager Seas for an upper-elementary topic", async ({ page }) => {
    const errors = collectPageErrors(page);
    await openLessonPage(page, gradeThreeTopicPath);

    const world = page.locator('[data-lesson-world="voyager-seas"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("[data-world-progress]")).toContainText(/islands charted|島|岛/i);
    await expect(world.getByRole("link", { name: /island/i }).first()).toBeVisible();

    expectNoPageErrors(errors);
  });

  test("renders Skyline Heights for a middle-school chapter", async ({ page }) => {
    await openLessonPage(page, gradeSixTopicPath);

    const world = page.locator('[data-lesson-world="skyline-heights"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("[data-world-progress]")).toContainText(/districts connected|城區|城区/i);
  });

  test("renders Deep Space for a high-school course chapter", async ({ page }) => {
    await openLessonPage(page, highSchoolTopicPath);

    const world = page.locator('[data-lesson-world="deep-space"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("[data-world-progress]")).toContainText(/star systems ignited|星系/i);
  });

  test("renders calmly under prefers-reduced-motion", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Reduced-motion styling is viewport-independent; covered on desktop.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });

    // The current stop's pulse is motion-safe only: with reduced motion the
    // computed animation must be effectively disabled.
    const currentStop = world.getByRole("link", { name: /you are here/i }).first();
    await expect(currentStop).toBeVisible();
    const animation = await currentStop.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { name: style.animationName, duration: style.animationDuration };
    });
    const disabled = animation.name === "none" || parseFloat(animation.duration) <= 0.01;
    expect(disabled, `expected no pulse under reduced motion, got ${JSON.stringify(animation)}`).toBeTruthy();
  });
});
