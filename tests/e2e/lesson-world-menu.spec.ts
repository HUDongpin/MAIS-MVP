import { expect, test, type Page } from "@playwright/test";
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
const gradeThreeTopicPath = "/student/lessons/us-ca-math-p3-3-nf-fraction-meaning";
const gradeSixTopicPath = "/student/lessons/us-ca-math-p6-chapter-01";
const highSchoolTopicPath = "/student/lessons/us-ca-math-s3-chapter-03";

async function openLessonPage(page: Page, path: string) {
  await page.goto(path);
  // The world menu hydrates with the lesson shell; the aside is server-rendered
  // but the entry animation can delay stable geometry.
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
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

/**
 * Hiding the menu ("Hide the map, give me the page").
 *
 * The load-bearing rule is that the menu never collapses to nothing: a hidden
 * menu always leaves a visible way back — the rail on wide screens, the
 * floating pill below `lg` — and keyboard focus follows the control the learner
 * just pressed, so nobody is stranded. Auto-peek's timing is not covered here
 * (12–20s of real waiting per case); these specs pin the manual contract and
 * the "never a dead end" invariant that auto-peek also lands on.
 *
 * Which control is the way back depends on the width, so every case resolves it
 * through `revealSelector`: the rail from `lg` up, the floating pill below it.
 */
test.describe("Lesson menu hide and reveal", () => {
  const hideButton = "#lesson-world-menu-hide";
  const railButton = "#lesson-world-menu-rail";
  const pillButton = "#lesson-world-menu-pill";
  // iPad 10.2" portrait — a real pilot device, and below the `lg` breakpoint
  // where the menu stacks over the content and the pill replaces the rail.
  const tabletPortrait = { width: 810, height: 1080 };

  /** The rail is a two-column affordance; below `lg` the pill stands in. */
  const revealSelector = (page: Page) => ((page.viewportSize()?.width ?? 0) >= 1024 ? railButton : pillButton);

  test.beforeEach(async ({ page }) => {
    await authenticateAsUserId(page, californiaSuperStudentId);
  });

  test("Hide tucks the map away and the reveal control brings it back", async ({ page }) => {
    const errors = collectPageErrors(page);
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });

    await page.locator(hideButton).click();
    await expect(world).toHaveCount(0);

    // The menu is never hidden without a door back into it.
    const reveal = page.locator(revealSelector(page));
    await expect(reveal).toBeVisible();
    await expect(reveal).toHaveAttribute("aria-expanded", "false");
    // Focus follows the manual toggle, so a keyboard learner is not stranded.
    await expect(reveal).toBeFocused();

    await reveal.click();
    await expect(world).toBeVisible();
    await expect(page.locator(hideButton)).toBeFocused();

    expectNoPageErrors(errors);
  });

  test("the lesson page fits a phone screen, so every menu control is reachable", async ({ page }) => {
    // Regression guard for the grid that used to drag the page into horizontal
    // overflow: an implicit `auto` column below `lg` was sized by its content,
    // laying the directory out ~562px wide inside a 393px screen and pushing the
    // header row's rightmost control (Hide) off the side of the display.
    await page.setViewportSize({ width: 393, height: 850 });
    await openLessonPage(page, kindergartenTopicPath);
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toBeVisible({ timeout: 30_000 });

    const overflow = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const origins: string[] = [];
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= limit + 1) return;
        const parent = el.parentElement;
        if (!parent || parent.getBoundingClientRect().width > limit + 1) return;
        // A wide child inside its own horizontal scroller is deliberate.
        if (getComputedStyle(parent).overflowX === "auto") return;
        origins.push(`${el.tagName}.${(el.className || "").toString().slice(0, 60)} @${Math.round(rect.width)}px`);
      });
      return { docScrollWidth: document.documentElement.scrollWidth, limit, origins };
    });

    expect(overflow.origins, `elements wider than the screen: ${overflow.origins.join(" | ")}`).toEqual([]);
    expect(overflow.docScrollWidth).toBe(overflow.limit);

    // The end of that chain: Hide is on screen and actually operable.
    await page.locator(hideButton).click();
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);
    await expect(page.locator(pillButton)).toBeVisible();
  });

  test("below lg the way back is the floating pill, not the rail", async ({ page }) => {
    await page.setViewportSize(tabletPortrait);
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });

    await page.locator(hideButton).click();
    await expect(world).toHaveCount(0);

    // The rail is a two-column-layout affordance; here the menu sits above the
    // content, so the pill has to follow the learner instead.
    await expect(page.locator(railButton)).toBeHidden();
    const pill = page.locator(pillButton);
    await expect(pill).toBeVisible();
    await expect(pill).toBeFocused();

    await pill.click();
    await expect(world).toBeVisible();
  });

  test("a hidden menu stays hidden across a reload in the same session", async ({ page }) => {
    await openLessonPage(page, kindergartenTopicPath);
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toBeVisible({ timeout: 30_000 });

    await page.locator(hideButton).click();
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);

    await page.reload();
    await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
    // Hiding is an explicit choice, so it outlives the page it was made on.
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);
  });

  test("hiding keeps the view the learner chose", async ({ page }) => {
    await openLessonPage(page, kindergartenTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    await world.getByRole("button", { name: /list view/i }).click();

    const accordion = page.getByRole("complementary", { name: /course unit directory/i });
    await expect(accordion).toBeVisible();

    // Hide is in the shared header, so it is present in list view too.
    await page.locator(hideButton).click();
    await expect(accordion).toHaveCount(0);

    await page.locator(revealSelector(page)).click();
    // Re-opening restores the list, not the map: hiding is not a view reset.
    await expect(page.getByRole("complementary", { name: /course unit directory/i })).toBeVisible();
    await expect(page.locator('[data-lesson-world="sprout-meadow"]')).toHaveCount(0);
  });
});
