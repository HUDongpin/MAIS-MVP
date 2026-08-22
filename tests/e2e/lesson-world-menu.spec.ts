import { expect, test, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";
import { authenticateAsUserId, collectPageErrors, expectNoPageErrors, uniqueSuffix } from "./helpers";

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
const gradeOneTopicPath = "/student/lessons/us-ca-math-p1-1-oa-add-subtract";
const gradeThreeTopicPath = "/student/lessons/us-ca-math-p3-3-nf-fraction-meaning";
const gradeSixTopicPath = "/student/lessons/us-ca-math-p6-chapter-01";
const highSchoolTopicPath = "/student/lessons/us-ca-math-s3-chapter-03";

async function openLessonPage(page: Page, path: string) {
  await page.goto(path);
  // The world menu hydrates with the lesson shell; the aside is server-rendered
  // but the entry animation can delay stable geometry.
  await expect(page.locator("main")).toBeVisible({ timeout: 30_000 });
}

function applicationNavigation(page: Page) {
  const navigation = page.getByRole("navigation", { name: /Main navigation|主導覽|主导览/ });
  return page.locator("header").filter({ has: navigation });
}

async function registerCaliforniaStudent(
  page: Page,
  testInfo: TestInfo,
  language: "zh" | "zh-Hans"
) {
  const suffix = uniqueSuffix(testInfo);
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `Bug 3 California ${suffix}`,
      username: `bug3-california-${suffix}@example.test`,
      email: `bug3-california-${suffix}@example.test`,
      password: "start12345",
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      language,
      theme: "dark"
    }
  });
  expect(response.ok(), `California student registration failed: ${response.status()} ${await response.text()}`).toBeTruthy();
}

type PaneScrollState = {
  left: { max: number; top: number };
  right: { max: number; top: number };
  windowY: number;
};

type PaneScrollPosition = "bottom" | "middle" | "top";

async function paneScrollState(page: Page, leftPane: Locator, rightPane: Locator): Promise<PaneScrollState> {
  const [left, right, windowY] = await Promise.all([
    leftPane.evaluate((element) => ({
      max: Math.max(0, element.scrollHeight - element.clientHeight),
      top: element.scrollTop
    })),
    rightPane.evaluate((element) => ({
      max: Math.max(0, element.scrollHeight - element.clientHeight),
      top: element.scrollTop
    })),
    page.evaluate(() => window.scrollY)
  ]);
  return { left, right, windowY };
}

async function setPaneScrollPosition(pane: Locator, position: PaneScrollPosition) {
  await pane.evaluate((element, nextPosition) => {
    const max = Math.max(0, element.scrollHeight - element.clientHeight);
    element.scrollTop = nextPosition === "bottom"
      // Overshoot deliberately and let the browser clamp to its true maximum;
      // integer scrollHeight/clientHeight rounding can otherwise leave a
      // transformed/composited scroller one or two physical pixels short.
      ? Number.MAX_SAFE_INTEGER
      : nextPosition === "middle"
        ? Math.round(max / 2)
        : 0;
  }, position);
}

async function wheelInside(page: Page, target: Locator, deltaY: number) {
  const [box, viewport, navigationBox] = await Promise.all([
    target.boundingBox(),
    Promise.resolve(page.viewportSize()),
    applicationNavigation(page).boundingBox()
  ]);
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (!box || !viewport || !navigationBox) return;

  const visibleLeft = Math.max(1, box.x);
  const visibleRight = Math.min(viewport.width - 1, box.x + box.width);
  const visibleTop = Math.max(navigationBox.y + navigationBox.height + 1, box.y);
  const visibleBottom = Math.min(viewport.height - 1, box.y + box.height);
  expect(visibleRight).toBeGreaterThan(visibleLeft);
  expect(visibleBottom).toBeGreaterThan(visibleTop);

  await page.mouse.move(
    visibleLeft + (visibleRight - visibleLeft) / 2,
    visibleTop + (visibleBottom - visibleTop) / 2
  );
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(250);
}

async function wheelScenario({
  deltaY,
  leftPane,
  leftPosition,
  page,
  rightPane,
  rightPosition,
  target
}: {
  deltaY: number;
  leftPane: Locator;
  leftPosition: PaneScrollPosition;
  page: Page;
  rightPane: Locator;
  rightPosition: PaneScrollPosition;
  target: Locator;
}) {
  // Position the pane in the viewport before setting its internal scrollTop.
  // Calling scrollIntoView after the assignment can shave a couple of pixels
  // from a bottom boundary while the entry animation settles, making the
  // subsequent wheel consume that residue instead of exercising containment.
  // `wheelInside` therefore assumes this positioning has already happened.
  await target.scrollIntoViewIfNeeded();
  await Promise.all([
    setPaneScrollPosition(leftPane, leftPosition),
    setPaneScrollPosition(rightPane, rightPosition)
  ]);
  // Moving a long lesson to the bottom can reveal deferred panels and settle
  // font/layout metrics, extending scrollHeight by a pixel or two. Clamp the
  // requested positions again after that work so a boundary scenario really
  // begins at the browser's final boundary.
  await page.waitForTimeout(250);
  await Promise.all([
    setPaneScrollPosition(leftPane, leftPosition),
    setPaneScrollPosition(rightPane, rightPosition)
  ]);
  await page.waitForTimeout(50);
  const before = await paneScrollState(page, leftPane, rightPane);
  await wheelInside(page, target, deltaY);
  const after = await paneScrollState(page, leftPane, rightPane);
  return { after, before };
}

function sameScrollPosition(first: number, second: number) {
  return Math.abs(first - second) <= 1;
}

async function keyboardScrollScenario(
  page: Page,
  leftPane: Locator,
  rightPane: Locator,
  key: "End" | "Home" | "PageDown" | "PageUp"
) {
  const before = await paneScrollState(page, leftPane, rightPane);
  await page.keyboard.press(key);
  await page.waitForTimeout(300);
  const after = await paneScrollState(page, leftPane, rightPane);
  return { after, before };
}

async function settlePaneScrollRangeAtBottom(page: Page, pane: Locator) {
  let previousMax = -1;
  let stableSamples = 0;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await setPaneScrollPosition(pane, "bottom");
    await page.waitForTimeout(250);
    const currentMax = await pane.evaluate((element) =>
      Math.max(0, element.scrollHeight - element.clientHeight)
    );

    if (currentMax === previousMax) stableSamples += 1;
    else stableSamples = 0;
    if (stableSamples >= 2) return currentMax;
    previousMax = currentMax;
  }

  throw new Error(`Pane scroll range did not settle exactly at its bottom boundary; last max=${previousMax}.`);
}

async function exerciseColdDynamicNextItemReveal(
  page: Page,
  { reducedMotion }: { reducedMotion: boolean }
) {
  const dynamicChunkPattern = /\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/;
  const dynamicChunkDelayMs = 1_000;
  let delayNextDynamicChunk = false;
  let resolveDelayedChunk: ((evidence: {
    releasedAt: number;
    requestedAt: number;
    url: string;
  }) => void) | null = null;
  const delayedChunk = new Promise<{
    releasedAt: number;
    requestedAt: number;
    url: string;
  }>((resolve) => {
    resolveDelayedChunk = resolve;
  });
  const routeHandler = async (route: Route) => {
    if (!delayNextDynamicChunk) {
      await route.continue();
      return;
    }

    delayNextDynamicChunk = false;
    const requestedAt = Date.now();
    const url = route.request().url();
    await new Promise<void>((resolve) => setTimeout(resolve, dynamicChunkDelayMs));
    await route.continue();
    resolveDelayedChunk?.({ releasedAt: Date.now(), requestedAt, url });
  };

  await page.route(dynamicChunkPattern, routeHandler);
  try {
    await page.setViewportSize({ width: 1280, height: 640 });
    if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    });
    await openLessonPage(page, gradeOneTopicPath);
    await page.waitForLoadState("networkidle");

    const grid = page.locator("#lesson-galaxy-directory");
    const leftPane = page.getByRole("region", { name: "Lesson directory" });
    const rightPane = page.getByRole("region", { name: "Lesson content" });
    const entryButton = rightPane
      .locator("article [data-lesson-next-item-button='true']")
      .last();
    const revealTarget = rightPane.locator("#visualization");
    const revealedButton = revealTarget
      .locator("[data-lesson-next-item-button='true']")
      .last();
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();
    await expect(entryButton).toBeAttached();
    await expect(revealTarget).toBeAttached();
    await grid.scrollIntoViewIfNeeded();
    await setPaneScrollPosition(leftPane, "middle");

    const baseReadyAt = Date.now();
    delayNextDynamicChunk = true;
    // This is the real entry control immediately before the deferred panel.
    // Arm the route first so scrolling only as far as the control cannot
    // accidentally prewarm the target chunk before the click under test.
    await entryButton.scrollIntoViewIfNeeded();
    const before = await paneScrollState(page, leftPane, rightPane);
    await entryButton.click();

    const chunkEvidence = await Promise.race([
      delayedChunk,
      page.waitForTimeout(15_000).then(() => {
        throw new Error("No post-load dynamic lesson chunk was requested after the real next-item navigation.");
      })
    ]);
    expect(chunkEvidence.requestedAt).toBeGreaterThanOrEqual(baseReadyAt);
    expect(chunkEvidence.releasedAt - chunkEvidence.requestedAt).toBeGreaterThanOrEqual(dynamicChunkDelayMs - 25);
    expect(chunkEvidence.url).toMatch(dynamicChunkPattern);

    await expect(revealedButton).toBeVisible({ timeout: 30_000 });
    let lastRevealGeometry: unknown = null;
    try {
      await expect.poll(async () => {
        const [paneBox, buttonBox, paneMetrics] = await Promise.all([
          rightPane.boundingBox(),
          revealedButton.boundingBox(),
          rightPane.evaluate((element) => ({
            clientHeight: element.clientHeight,
            maxScrollTop: element.scrollHeight - element.clientHeight,
            scrollHeight: element.scrollHeight,
            scrollTop: element.scrollTop
          }))
        ]);
        lastRevealGeometry = { buttonBox, paneBox, paneMetrics };
        return Boolean(
          paneBox &&
          buttonBox &&
          buttonBox.y >= paneBox.y - 1 &&
          buttonBox.y + buttonBox.height + 96 <= paneBox.y + paneBox.height + 1
        );
      }, {
        message: "The late-mounted real CTA must settle inside the right pane with its 96px safe area.",
        timeout: 12_000
      }).toBe(true);
    } catch (error) {
      throw new Error(
        `Bug 3 cold CTA reveal geometry (${reducedMotion ? "reduced" : "normal"} motion):\n${JSON.stringify({
          before,
          chunkEvidence,
          lastRevealGeometry
        }, null, 2)}\n${error instanceof Error ? error.message : String(error)}`
      );
    }

    const after = await paneScrollState(page, leftPane, rightPane);
    const evidence = {
      rightPaneMoved: after.right.top > before.right.top,
      leftPaneStayedFixed: sameScrollPosition(after.left.top, before.left.top),
      windowStayedFixed: sameScrollPosition(after.windowY, before.windowY)
    };
    expect(
      evidence,
      `Bug 3 cold dynamic CTA evidence (${reducedMotion ? "reduced" : "normal"} motion):\n${JSON.stringify({ before, after, chunkEvidence }, null, 2)}`
    ).toEqual(Object.fromEntries(Object.keys(evidence).map((key) => [key, true])));
  } finally {
    await page.unroute(dynamicChunkPattern, routeHandler);
  }
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

  test("Bug 3 desktop lesson pane contract isolates pointer scrolling and clicks", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Desktop has two visible panes; mobile intentionally keeps one document flow.");
    test.slow();

    await page.addInitScript(() => {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    });
    await openLessonPage(page, gradeOneTopicPath);

    const stickyApplicationNavigation = applicationNavigation(page);
    const lessonTitle = page.locator("main h1").first();
    await expect(stickyApplicationNavigation).toBeVisible();
    await expect(lessonTitle).toBeVisible();
    const initialRouteGeometry = await page.evaluate(() => {
      const navigation = document.querySelector<HTMLElement>('header nav[aria-label="Main navigation"]');
      const title = document.querySelector<HTMLElement>("main h1");
      if (!navigation || !title) return null;
      const navigationBox = navigation.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      return {
        titleClearsNavigation: titleBox.top >= navigationBox.bottom,
        titleTop: Math.round(titleBox.top),
        navigationBottom: Math.round(navigationBox.bottom),
        windowY: Math.round(window.scrollY)
      };
    });
    expect(initialRouteGeometry, "Fresh lesson route must not begin underneath the sticky navigation.").toMatchObject({
      titleClearsNavigation: true,
      windowY: 0
    });

    const grid = page.locator("#lesson-galaxy-directory");
    const leftPane = grid.locator("#lesson-world-menu-panel:visible");
    const rightPane = grid.locator(":scope > div").last();
    await expect(grid).toBeVisible();
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();

    const scenarios = {
      leftForward: await wheelScenario({
        deltaY: 640,
        leftPane,
        leftPosition: "top",
        page,
        rightPane,
        rightPosition: "top",
        target: leftPane
      }),
      rightForward: await wheelScenario({
        deltaY: 640,
        leftPane,
        leftPosition: "top",
        page,
        rightPane,
        rightPosition: "top",
        target: rightPane
      }),
      leftTopBoundary: await wheelScenario({
        deltaY: -640,
        leftPane,
        leftPosition: "top",
        page,
        rightPane,
        rightPosition: "middle",
        target: leftPane
      }),
      leftBottomBoundary: await wheelScenario({
        deltaY: 640,
        leftPane,
        leftPosition: "bottom",
        page,
        rightPane,
        rightPosition: "middle",
        target: leftPane
      }),
      rightTopBoundary: await wheelScenario({
        deltaY: -640,
        leftPane,
        leftPosition: "middle",
        page,
        rightPane,
        rightPosition: "top",
        target: rightPane
      }),
      rightBottomBoundary: await wheelScenario({
        deltaY: 640,
        leftPane,
        leftPosition: "middle",
        page,
        rightPane,
        rightPosition: "bottom",
        target: rightPane
      })
    };

    await Promise.all([
      setPaneScrollPosition(leftPane, "middle"),
      setPaneScrollPosition(rightPane, "middle")
    ]);
    await page.waitForTimeout(250);
    await Promise.all([
      setPaneScrollPosition(leftPane, "middle"),
      setPaneScrollPosition(rightPane, "middle")
    ]);
    await page.waitForTimeout(50);
    const beforeLeftClick = await paneScrollState(page, leftPane, rightPane);
    await leftPane.locator("[data-world-progress]").click();
    const afterLeftClick = await paneScrollState(page, leftPane, rightPane);
    const beforeRightClick = afterLeftClick;
    await rightPane.locator("section").first().click({ position: { x: 20, y: 20 } });
    const afterRightClick = await paneScrollState(page, leftPane, rightPane);

    const verdict = {
      leftPaneIsScrollable: scenarios.leftForward.before.left.max > 0,
      rightPaneIsScrollable: scenarios.rightForward.before.right.max > 0,
      leftForwardMovesLeft:
        scenarios.leftForward.after.left.top > scenarios.leftForward.before.left.top,
      leftForwardKeepsRight:
        sameScrollPosition(scenarios.leftForward.after.right.top, scenarios.leftForward.before.right.top),
      leftForwardKeepsWindow:
        sameScrollPosition(scenarios.leftForward.after.windowY, scenarios.leftForward.before.windowY),
      rightForwardMovesRight:
        scenarios.rightForward.after.right.top > scenarios.rightForward.before.right.top,
      rightForwardKeepsLeft:
        sameScrollPosition(scenarios.rightForward.after.left.top, scenarios.rightForward.before.left.top),
      rightForwardKeepsWindow:
        sameScrollPosition(scenarios.rightForward.after.windowY, scenarios.rightForward.before.windowY),
      leftTopBoundaryContained:
        sameScrollPosition(scenarios.leftTopBoundary.after.left.top, scenarios.leftTopBoundary.before.left.top) &&
        sameScrollPosition(scenarios.leftTopBoundary.after.right.top, scenarios.leftTopBoundary.before.right.top) &&
        sameScrollPosition(scenarios.leftTopBoundary.after.windowY, scenarios.leftTopBoundary.before.windowY),
      leftBottomBoundaryContained:
        sameScrollPosition(scenarios.leftBottomBoundary.after.left.top, scenarios.leftBottomBoundary.before.left.top) &&
        sameScrollPosition(scenarios.leftBottomBoundary.after.right.top, scenarios.leftBottomBoundary.before.right.top) &&
        sameScrollPosition(scenarios.leftBottomBoundary.after.windowY, scenarios.leftBottomBoundary.before.windowY),
      rightTopBoundaryContained:
        sameScrollPosition(scenarios.rightTopBoundary.after.right.top, scenarios.rightTopBoundary.before.right.top) &&
        sameScrollPosition(scenarios.rightTopBoundary.after.left.top, scenarios.rightTopBoundary.before.left.top) &&
        sameScrollPosition(scenarios.rightTopBoundary.after.windowY, scenarios.rightTopBoundary.before.windowY),
      rightBottomBoundaryContained:
        sameScrollPosition(scenarios.rightBottomBoundary.after.right.top, scenarios.rightBottomBoundary.before.right.top) &&
        sameScrollPosition(scenarios.rightBottomBoundary.after.left.top, scenarios.rightBottomBoundary.before.left.top) &&
        sameScrollPosition(scenarios.rightBottomBoundary.after.windowY, scenarios.rightBottomBoundary.before.windowY),
      leftClickKeepsRight:
        sameScrollPosition(afterLeftClick.right.top, beforeLeftClick.right.top),
      leftClickKeepsWindow:
        sameScrollPosition(afterLeftClick.windowY, beforeLeftClick.windowY),
      rightClickKeepsLeft:
        sameScrollPosition(afterRightClick.left.top, beforeRightClick.left.top),
      rightClickKeepsWindow:
        sameScrollPosition(afterRightClick.windowY, beforeRightClick.windowY)
    };

    expect(
      verdict,
      `Bug 3 pane-scroll evidence:\n${JSON.stringify({ scenarios, beforeLeftClick, afterLeftClick, beforeRightClick, afterRightClick }, null, 2)}`
    ).toEqual(Object.fromEntries(Object.keys(verdict).map((key) => [key, true])));
  });

  test("Bug 3 desktop lesson pane contract reveals the real next-item CTA inside content", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "The nested lesson-content scroller is desktop-only.");
    test.slow();

    await page.addInitScript(() => {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    });
    await openLessonPage(page, gradeOneTopicPath);

    const grid = page.locator("#lesson-galaxy-directory");
    const leftPane = grid.locator("#lesson-world-menu-panel:visible");
    const rightPane = grid.locator(":scope > div").last();
    const lessonArticle = rightPane.locator("article").first();
    const entryButton = lessonArticle.locator("[data-lesson-next-item-button='true']").last();
    const revealTarget = rightPane.locator("#visualization");
    const revealedButton = revealTarget.locator("[data-lesson-next-item-button='true']").last();
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();
    await expect(entryButton).toBeVisible();
    await expect(revealTarget).toBeAttached();

    await grid.scrollIntoViewIfNeeded();
    await entryButton.scrollIntoViewIfNeeded();
    await setPaneScrollPosition(leftPane, "middle");
    await page.waitForTimeout(300);

    const [paneBefore, targetBefore] = await Promise.all([
      rightPane.boundingBox(),
      revealTarget.boundingBox()
    ]);
    expect(paneBefore).not.toBeNull();
    expect(targetBefore).not.toBeNull();
    if (!paneBefore || !targetBefore) return;
    expect(
      targetBefore.y + targetBefore.height + 96,
      "The representative visualization must naturally extend below the 96px pane safe area before its real entry CTA is activated."
    ).toBeGreaterThan(paneBefore.y + paneBefore.height);

    const before = await paneScrollState(page, leftPane, rightPane);
    await entryButton.click();
    await expect(revealedButton).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1_200);
    const after = await paneScrollState(page, leftPane, rightPane);
    const [paneAfter, targetAfter, revealedAfter] = await Promise.all([
      rightPane.boundingBox(),
      revealTarget.boundingBox(),
      revealedButton.boundingBox()
    ]);

    expect(paneAfter).not.toBeNull();
    expect(targetAfter).not.toBeNull();
    expect(revealedAfter).not.toBeNull();
    if (!paneAfter || !targetAfter || !revealedAfter) return;

    const evidence = {
      targetIntersectsContentPane:
        targetAfter.y < paneAfter.y + paneAfter.height &&
        targetAfter.y + targetAfter.height > paneAfter.y,
      revealedCtaClearsPaneTop: revealedAfter.y >= paneAfter.y - 1,
      revealedCtaKeepsSafeArea:
        revealedAfter.y + revealedAfter.height + 96 <= paneAfter.y + paneAfter.height + 1,
      rightPaneMoved: after.right.top > before.right.top,
      leftPaneStayedFixed: sameScrollPosition(after.left.top, before.left.top),
      windowStayedFixed: sameScrollPosition(after.windowY, before.windowY)
    };
    expect(
      evidence,
      `Bug 3 next-item reveal evidence:\n${JSON.stringify({ before, after, paneAfter, targetAfter, revealedAfter }, null, 2)}`
    ).toEqual(Object.fromEntries(Object.keys(evidence).map((key) => [key, true])));
  });

  test("Bug 3 desktop lesson pane contract survives a dynamic CTA chunk delayed beyond 420ms", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "The nested lesson-content scroller is desktop-only.");
    test.slow();
    await exerciseColdDynamicNextItemReveal(page, { reducedMotion: false });
  });

  test("Bug 3 desktop lesson pane contract reveals a cold dynamic CTA with reduced motion", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "The nested lesson-content scroller is desktop-only.");
    test.slow();
    await exerciseColdDynamicNextItemReveal(page, { reducedMotion: true });
  });

  test("Bug 3 desktop lesson pane contract confines keyboard scrolling to the focused named region", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "Focusable nested scroll regions are desktop-only.");
    test.slow();

    await page.addInitScript(() => {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    });
    await openLessonPage(page, gradeOneTopicPath);

    const grid = page.locator("#lesson-galaxy-directory");
    const leftPane = page.getByRole("region", { name: "Lesson directory" });
    const rightPane = page.getByRole("region", { name: "Lesson content" });
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();
    await expect(leftPane).toHaveAttribute("tabindex", "0");
    await expect(rightPane).toHaveAttribute("tabindex", "0");
    await grid.scrollIntoViewIfNeeded();

    // The visualization is intentionally mounted only when it nears the
    // viewport. Prewarm that real deferred content and wait for an exact,
    // repeated max range before testing End and boundary containment.
    await rightPane.locator("#visualization").scrollIntoViewIfNeeded();
    await expect(
      rightPane.locator("#visualization [data-lesson-next-item-button='true']").last()
    ).toBeVisible({ timeout: 30_000 });
    await settlePaneScrollRangeAtBottom(page, rightPane);
    await grid.scrollIntoViewIfNeeded();

    await Promise.all([
      setPaneScrollPosition(leftPane, "top"),
      setPaneScrollPosition(rightPane, "top")
    ]);
    await leftPane.focus();
    await expect(leftPane).toBeFocused();
    const leftPageDown = await keyboardScrollScenario(page, leftPane, rightPane, "PageDown");
    const leftFocusStyle = await leftPane.evaluate((element) => ({
      boxShadow: window.getComputedStyle(element).boxShadow,
      outlineStyle: window.getComputedStyle(element).outlineStyle
    }));
    const leftEnd = await keyboardScrollScenario(page, leftPane, rightPane, "End");
    const leftBottomBoundary = await keyboardScrollScenario(page, leftPane, rightPane, "PageDown");

    await Promise.all([
      setPaneScrollPosition(leftPane, "middle"),
      setPaneScrollPosition(rightPane, "top")
    ]);
    await rightPane.focus();
    await expect(rightPane).toBeFocused();
    const rightPageDown = await keyboardScrollScenario(page, leftPane, rightPane, "PageDown");
    const rightFocusStyle = await rightPane.evaluate((element) => ({
      boxShadow: window.getComputedStyle(element).boxShadow,
      outlineStyle: window.getComputedStyle(element).outlineStyle
    }));
    const rightEnd = await keyboardScrollScenario(page, leftPane, rightPane, "End");
    const rightBottomBoundary = await keyboardScrollScenario(page, leftPane, rightPane, "PageDown");
    const rightHome = await keyboardScrollScenario(page, leftPane, rightPane, "Home");
    const rightTopBoundary = await keyboardScrollScenario(page, leftPane, rightPane, "PageUp");

    const evidence = {
      leftPageDownMovesLeft: leftPageDown.after.left.top > leftPageDown.before.left.top,
      leftPageDownKeepsRight: sameScrollPosition(leftPageDown.after.right.top, leftPageDown.before.right.top),
      leftPageDownKeepsWindow: sameScrollPosition(leftPageDown.after.windowY, leftPageDown.before.windowY),
      leftEndReachesBottom: leftEnd.after.left.top >= leftEnd.after.left.max - 1,
      leftEndKeepsRight: sameScrollPosition(leftEnd.after.right.top, leftEnd.before.right.top),
      leftEndKeepsWindow: sameScrollPosition(leftEnd.after.windowY, leftEnd.before.windowY),
      leftBottomBoundaryContained:
        sameScrollPosition(leftBottomBoundary.after.left.top, leftBottomBoundary.before.left.top) &&
        sameScrollPosition(leftBottomBoundary.after.right.top, leftBottomBoundary.before.right.top) &&
        sameScrollPosition(leftBottomBoundary.after.windowY, leftBottomBoundary.before.windowY),
      leftHasVisibleFocusTreatment:
        leftFocusStyle.boxShadow !== "none" || leftFocusStyle.outlineStyle !== "none",
      rightPageDownMovesRight: rightPageDown.after.right.top > rightPageDown.before.right.top,
      rightPageDownKeepsLeft: sameScrollPosition(rightPageDown.after.left.top, rightPageDown.before.left.top),
      rightPageDownKeepsWindow: sameScrollPosition(rightPageDown.after.windowY, rightPageDown.before.windowY),
      rightEndReachesBottom: rightEnd.after.right.top >= rightEnd.after.right.max - 1,
      rightEndKeepsLeft: sameScrollPosition(rightEnd.after.left.top, rightEnd.before.left.top),
      rightEndKeepsWindow: sameScrollPosition(rightEnd.after.windowY, rightEnd.before.windowY),
      rightBottomBoundaryContained:
        sameScrollPosition(rightBottomBoundary.after.right.top, rightBottomBoundary.before.right.top) &&
        sameScrollPosition(rightBottomBoundary.after.left.top, rightBottomBoundary.before.left.top) &&
        sameScrollPosition(rightBottomBoundary.after.windowY, rightBottomBoundary.before.windowY),
      rightHomeReachesTop: rightHome.after.right.top <= 1,
      rightHomeKeepsLeft: sameScrollPosition(rightHome.after.left.top, rightHome.before.left.top),
      rightHomeKeepsWindow: sameScrollPosition(rightHome.after.windowY, rightHome.before.windowY),
      rightTopBoundaryContained:
        sameScrollPosition(rightTopBoundary.after.right.top, rightTopBoundary.before.right.top) &&
        sameScrollPosition(rightTopBoundary.after.left.top, rightTopBoundary.before.left.top) &&
        sameScrollPosition(rightTopBoundary.after.windowY, rightTopBoundary.before.windowY),
      rightHasVisibleFocusTreatment:
        rightFocusStyle.boxShadow !== "none" || rightFocusStyle.outlineStyle !== "none"
    };
    expect(
      evidence,
      `Bug 3 keyboard-scroll evidence:\n${JSON.stringify({ leftPageDown, leftEnd, leftBottomBoundary, leftFocusStyle, rightPageDown, rightEnd, rightBottomBoundary, rightHome, rightTopBoundary, rightFocusStyle }, null, 2)}`
    ).toEqual(Object.fromEntries(Object.keys(evidence).map((key) => [key, true])));
  });

  test("Bug 3 desktop lesson pane contract fits short-wide Simplified Chinese geometry", async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), "The short-wide two-pane geometry is a desktop contract.");
    const shortWideViewport = { width: 1280, height: 640 };
    await page.setViewportSize(shortWideViewport);
    await registerCaliforniaStudent(page, testInfo, "zh-Hans");
    await page.addInitScript(() => {
      window.localStorage.setItem("mais.lesson-world-view", "world");
      window.sessionStorage.setItem("mais.lesson-menu-auto-peek-off", "1");
    });
    await openLessonPage(page, gradeOneTopicPath);

    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans-CN");
    const navigation = applicationNavigation(page);
    const lessonTitle = page.locator("main h1").first();
    await expect(navigation).toBeVisible();
    await expect(lessonTitle).toBeVisible();
    const [navigationInitial, titleInitial] = await Promise.all([
      navigation.boundingBox(),
      lessonTitle.boundingBox()
    ]);
    expect(navigationInitial).not.toBeNull();
    expect(titleInitial).not.toBeNull();
    if (!navigationInitial || !titleInitial) return;

    const grid = page.locator("#lesson-galaxy-directory");
    await grid.scrollIntoViewIfNeeded();
    const leftPane = page.getByRole("region", { name: "课时目录" });
    const rightPane = page.getByRole("region", { name: "课时内容" });
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();
    const [gridBox, leftBox, rightBox, navigationBox, ranges, documentWidth] = await Promise.all([
      grid.boundingBox(),
      leftPane.boundingBox(),
      rightPane.boundingBox(),
      navigation.boundingBox(),
      paneScrollState(page, leftPane, rightPane),
      page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        viewportHeight: window.innerHeight,
        windowY: window.scrollY
      }))
    ]);
    expect(gridBox).not.toBeNull();
    expect(leftBox).not.toBeNull();
    expect(rightBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    if (!gridBox || !leftBox || !rightBox || !navigationBox) return;

    const evidence = {
      initialRouteStartsAtTop: titleInitial.y >= navigationInitial.y + navigationInitial.height,
      initialTitleIsReachable: titleInitial.y + titleInitial.height <= shortWideViewport.height,
      gridClearsNavigation: gridBox.y >= navigationBox.y + navigationBox.height,
      gridFitsViewport: gridBox.y + gridBox.height <= documentWidth.viewportHeight + 1,
      leftPaneFitsGrid:
        leftBox.y >= gridBox.y - 1 && leftBox.y + leftBox.height <= gridBox.y + gridBox.height + 1,
      rightPaneFitsGrid:
        rightBox.y >= gridBox.y - 1 && rightBox.y + rightBox.height <= gridBox.y + gridBox.height + 1,
      leftPaneScrollable: ranges.left.max > 0,
      rightPaneScrollable: ranges.right.max > 0,
      noHorizontalDocumentOverflow: documentWidth.scrollWidth <= documentWidth.clientWidth + 1
    };
    expect(
      evidence,
      `Bug 3 short-wide Chinese geometry:\n${JSON.stringify({ navigationInitial, titleInitial, gridBox, leftBox, rightBox, navigationBox, ranges, documentWidth }, null, 2)}`
    ).toEqual(Object.fromEntries(Object.keys(evidence).map((key) => [key, true])));
  });

  test("Bug 3 mobile lesson flow contract preserves a single document scroller", async ({ page }, testInfo) => {
    test.skip(!Boolean(testInfo.project.use.isMobile), "The mobile single-flow guard only applies to the mobile project.");
    await openLessonPage(page, gradeOneTopicPath);

    const grid = page.locator("#lesson-galaxy-directory");
    const leftPane = grid.locator("#lesson-world-menu-panel:visible");
    const rightPane = grid.locator(":scope > div").last();
    await expect(leftPane).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible();
    expect(await leftPane.getAttribute("role")).toBeNull();
    expect(await rightPane.getAttribute("role")).toBeNull();
    expect(await leftPane.getAttribute("tabindex")).toBeNull();
    expect(await rightPane.getAttribute("tabindex")).toBeNull();

    const flow = await page.evaluate(() => {
      const gridElement = document.querySelector<HTMLElement>("#lesson-galaxy-directory");
      const left = gridElement?.querySelector<HTMLElement>("#lesson-world-menu-panel");
      const directChildren = gridElement ? Array.from(gridElement.children) as HTMLElement[] : [];
      const right = directChildren.at(-1);
      if (!gridElement || !left || !right) return null;
      return {
        documentMax: document.documentElement.scrollHeight - document.documentElement.clientHeight,
        gridOverflowY: window.getComputedStyle(gridElement).overflowY,
        leftMax: left.scrollHeight - left.clientHeight,
        leftOverflowY: window.getComputedStyle(left).overflowY,
        rightMax: right.scrollHeight - right.clientHeight,
        rightOverflowY: window.getComputedStyle(right).overflowY
      };
    });

    expect(flow).not.toBeNull();
    expect(flow?.documentMax ?? 0).toBeGreaterThan(0);
    expect(flow?.leftMax ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(flow?.rightMax ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(1);
    expect(flow?.gridOverflowY).not.toBe("hidden");
    expect(flow?.leftOverflowY).not.toBe("auto");
    expect(flow?.rightOverflowY).not.toBe("auto");
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
