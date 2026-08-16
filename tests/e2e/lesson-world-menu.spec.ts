import { expect, test, type Locator, type Page } from "@playwright/test";
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
const gradeThreeTopicPath = "/student/lessons/us-ca-math-p3-3-nf-fraction-meaning";
const gradeSixTopicPath = "/student/lessons/us-ca-math-p6-chapter-01";
const highSchoolTopicPath = "/student/lessons/us-ca-math-s3-chapter-03";

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
