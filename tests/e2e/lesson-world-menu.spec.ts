import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { lessonWorldThemeForGrade } from "../../components/lesson/worlds/worldThemes";
import { formatPracticeOptionDisplayText } from "../../components/practice/practiceOptionDisplayText";
import { usCaliforniaQuestions } from "../../data/usCaliforniaQuestions";
import { authenticateAsUserId, collectPageErrors, expectNoPageErrors, uniqueSuffix } from "./helpers";
import { auditMathDiagramPage, waitForDiagramLayoutStable } from "./mathDiagramBoundaryAudit";
import { strokedPolygonPaintBounds } from "./svgPolygonPaintGeometry";

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
const gradeTwoFluencyArraysTopicPath = "/student/lessons/us-ca-math-p2-2-oa-fluency-arrays";
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

function simplifiedChineseCorrectOptionDisplayText(
  question: ReturnType<typeof sourceQuestionForRenderedId>
) {
  const option = question.options?.find((candidate) =>
    candidate.en === question.answer
    || candidate.zh === question.answer
    || candidate.zhHans === question.answer
  );
  if (!option) {
    throw new Error(`Question ${question.id} must expose its authoritative answer through a localized option.`);
  }
  return formatPracticeOptionDisplayText(option.zhHans ?? option.zh ?? option.en);
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

async function composeRoofPaintSnapshot(composeLesson: Locator) {
  const roof = composeLesson.getByRole("img").locator("polygon").first();
  await expect(roof).toBeVisible();
  const geometry = await roof.evaluate((element: SVGPolygonElement) => {
    const svg = element.ownerSVGElement;
    const square = svg?.querySelector<SVGRectElement>("rect");
    if (!svg || !square) throw new Error("Compose Shapes must render one roof above its square base.");

    const roofRect = element.getBoundingClientRect();
    const squareRect = square.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const matrix = element.getScreenCTM();
    const svgMatrix = svg.getScreenCTM();
    const style = getComputedStyle(element);
    const strokeWidth = Number.parseFloat(style.strokeWidth);
    const strokeMiterLimit = Number.parseFloat(style.getPropertyValue("stroke-miterlimit"));
    if (
      !matrix ||
      !svgMatrix ||
      !Number.isFinite(strokeWidth) ||
      !Number.isFinite(strokeMiterLimit)
    ) {
      throw new Error("The roof needs measurable painted geometry.");
    }
    const axisTolerance = 1e-6;
    if (
      Math.abs(matrix.b) > axisTolerance ||
      Math.abs(matrix.c) > axisTolerance ||
      Math.abs(svgMatrix.b) > axisTolerance ||
      Math.abs(svgMatrix.c) > axisTolerance
    ) {
      throw new Error("Compose Shapes paint bounds require an axis-aligned SVG viewport.");
    }

    return {
      matrix: {
        a: matrix.a,
        b: matrix.b,
        c: matrix.c,
        d: matrix.d,
        e: matrix.e,
        f: matrix.f
      },
      points: Array.from({ length: element.points.numberOfItems }, (_, index) => {
        const point = element.points.getItem(index);
        return { x: point.x, y: point.y };
      }),
      roofToSquareGap: squareRect.top - roofRect.bottom,
      strokeLinejoin: style.getPropertyValue("stroke-linejoin"),
      strokeMiterLimit,
      strokeWidth,
      svgRect: {
        bottom: svgRect.bottom,
        left: svgRect.left,
        right: svgRect.right,
        top: svgRect.top
      }
    };
  });
  if (geometry.strokeLinejoin !== "miter") {
    throw new Error(`Compose Shapes roof must retain its expected miter join, got ${geometry.strokeLinejoin}.`);
  }
  const paintBounds = strokedPolygonPaintBounds({
    matrix: geometry.matrix,
    points: geometry.points,
    strokeLinejoin: geometry.strokeLinejoin,
    strokeMiterLimit: geometry.strokeMiterLimit,
    strokeWidth: geometry.strokeWidth
  });

  return {
    bottomClearance: geometry.svgRect.bottom - paintBounds.bottom,
    leftClearance: paintBounds.left - geometry.svgRect.left,
    rightClearance: geometry.svgRect.right - paintBounds.right,
    roofToSquareGap: geometry.roofToSquareGap,
    topClearance: paintBounds.top - geometry.svgRect.top,
    vertexCount: geometry.points.length
  };
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

type LessonUnitStopVisualState = "completed" | "current" | "locked";

async function expectUnitStopVisualState(stop: Locator, expectedState: LessonUnitStopVisualState) {
  await expect(stop).toHaveAttribute("data-lesson-unit-stop-state", expectedState);
  await expect(stop).not.toHaveAttribute("aria-disabled", /.+/);
  const markerText = await visibleUnitStopMarker(stop);
  const adornment = stop.locator(`[data-lesson-unit-stop-adornment="${expectedState}"]`);
  await expect(adornment).toHaveCount(1);
  await expect(adornment).toHaveAttribute("aria-hidden", "true");
  await expect(adornment).toBeVisible();

  const geometry = await adornment.evaluate((element) => {
    const circle = element.closest("a");
    const marker = circle?.querySelector<HTMLElement>('[data-lesson-unit-stop-marker="true"]');
    if (!circle || !marker) return null;
    const circleRect = circle.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const adornmentRect = element.getBoundingClientRect();
    const center = {
      x: circleRect.left + circleRect.width / 2,
      y: circleRect.top + circleRect.height / 2
    };
    const radius = Math.min(circleRect.width, circleRect.height) / 2;
    const corners = [
      [adornmentRect.left, adornmentRect.top],
      [adornmentRect.right, adornmentRect.top],
      [adornmentRect.right, adornmentRect.bottom],
      [adornmentRect.left, adornmentRect.bottom]
    ].map(([x, y]) => Math.hypot(x - center.x, y - center.y));
    const overlapWidth = Math.max(
      0,
      Math.min(adornmentRect.right, markerRect.right) - Math.max(adornmentRect.left, markerRect.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(adornmentRect.bottom, markerRect.bottom) - Math.max(adornmentRect.top, markerRect.top)
    );

    return {
      adornmentHeight: adornmentRect.height,
      adornmentWidth: adornmentRect.width,
      corners,
      overlapArea: overlapWidth * overlapHeight,
      pointerEvents: getComputedStyle(element).pointerEvents,
      radius
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry!.adornmentWidth).toBeGreaterThan(0);
  expect(geometry!.adornmentHeight).toBeGreaterThan(0);
  expect(geometry!.pointerEvents).toBe("none");
  if (expectedState === "current") {
    expect(geometry!.overlapArea).toBeGreaterThan(0);
  } else {
    for (const cornerDistance of geometry!.corners) {
      expect(cornerDistance).toBeLessThanOrEqual(geometry!.radius + 1);
    }
  }

  return markerText;
}

async function expectLessonWorldCurrentAvatarCursor(
  map: Locator,
  currentStop: Locator,
  expectedGlyph: string
) {
  const currentItem = currentStop.locator("xpath=ancestor::li[1]");
  await expect(currentItem).toHaveCount(1);
  const cursor = currentItem.locator('[data-lesson-current-avatar-cursor="true"]');
  await expect(map.locator('[data-lesson-current-avatar-cursor="true"]')).toHaveCount(1);
  await expect(cursor).toHaveCount(1);
  await expect(cursor).toHaveAttribute("aria-hidden", "true");
  await expect(cursor).toBeVisible();
  await expect(cursor.locator('[data-lesson-current-avatar-fallback="true"]')).toHaveText(expectedGlyph);
  await expect(cursor.locator('[data-lesson-current-avatar-image="true"]')).toHaveCount(0);
  await expect(cursor.locator('[data-lesson-current-avatar-presence="true"]')).toBeVisible();

  const geometry = await cursor.evaluate((element) => {
    const item = element.closest("li");
    const stop = item?.querySelector<HTMLElement>('a[aria-current="page"]');
    const presence = element.querySelector<HTMLElement>('[data-lesson-current-avatar-presence="true"]');
    if (!stop || !presence) return null;
    const cursorRect = element.getBoundingClientRect();
    const stopRect = stop.getBoundingClientRect();
    const presenceRect = presence.getBoundingClientRect();
    const overlapWidth = Math.max(
      0,
      Math.min(cursorRect.right, stopRect.right) - Math.max(cursorRect.left, stopRect.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(cursorRect.bottom, stopRect.bottom) - Math.max(cursorRect.top, stopRect.top)
    );
    return {
      borderRadius: Number.parseFloat(getComputedStyle(element).borderRadius),
      height: cursorRect.height,
      overlapArea: overlapWidth * overlapHeight,
      pointerEvents: getComputedStyle(element).pointerEvents,
      presence: {
        bottom: presenceRect.bottom,
        left: presenceRect.left,
        right: presenceRect.right,
        top: presenceRect.top
      },
      cursor: {
        bottom: cursorRect.bottom,
        left: cursorRect.left,
        right: cursorRect.right,
        top: cursorRect.top
      },
      width: cursorRect.width
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry!.width).toBeGreaterThanOrEqual(31);
  expect(geometry!.width).toBeLessThanOrEqual(33);
  expect(geometry!.height).toBeGreaterThanOrEqual(31);
  expect(geometry!.height).toBeLessThanOrEqual(33);
  expect(geometry!.borderRadius).toBeGreaterThanOrEqual(15);
  expect(geometry!.pointerEvents).toBe("none");
  expect(geometry!.overlapArea).toBeLessThanOrEqual(1);
  expect(geometry!.presence.left).toBeGreaterThanOrEqual(geometry!.cursor.right - 12);
  expect(geometry!.presence.top).toBeGreaterThanOrEqual(geometry!.cursor.bottom - 12);
  expect(geometry!.presence.right).toBeLessThanOrEqual(geometry!.cursor.right + 3);
  expect(geometry!.presence.bottom).toBeLessThanOrEqual(geometry!.cursor.bottom + 3);
}

async function registerCaliforniaStudent(
  page: Page,
  testInfo: TestInfo,
  language: "en" | "zh-Hans" = "en",
  grade: "P1" | "P2" = "P1"
) {
  const suffix = uniqueSuffix(testInfo);
  const username = `world-stop-${suffix}@example.test`;
  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: `World Stop ${suffix}`,
      username,
      email: username,
      password: "world-stop-12345",
      grade,
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language,
      theme: "light"
    }
  });
  const responseText = await response.text();
  expect(response.status(), responseText).toBe(200);
  const body = JSON.parse(responseText) as { user?: { id?: string; role?: string } };
  expect(body.user?.id).toBeTruthy();
  expect(body.user?.role).toBe("student");
  return body.user!.id!;
}

async function lessonSummaryHitTestSnapshot(closeButton: Locator) {
  return closeButton.evaluate((button: HTMLButtonElement) => {
    const dialog = button.closest<HTMLElement>('[role="dialog"]');
    const overlay = button.closest<HTMLElement>('[data-lesson-summary-overlay="true"]');
    const navbar = document.querySelector<HTMLElement>("body header");
    if (!dialog || !overlay || !navbar) {
      throw new Error("The lesson summary must render above the app navbar in its dedicated overlay.");
    }

    const buttonRect = button.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const navbarRect = navbar.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewport = {
      bottom: (visualViewport?.offsetTop ?? 0) + (visualViewport?.height ?? window.innerHeight),
      left: visualViewport?.offsetLeft ?? 0,
      right: (visualViewport?.offsetLeft ?? 0) + (visualViewport?.width ?? window.innerWidth),
      top: visualViewport?.offsetTop ?? 0
    };
    const elementBelongsTo = (owner: Element, candidate: Element | null) =>
      candidate !== null && (candidate === owner || owner.contains(candidate));
    const buttonCenterHit = document.elementFromPoint(
      buttonRect.left + buttonRect.width / 2,
      buttonRect.top + buttonRect.height / 2
    );
    const buttonTopCenterHit = document.elementFromPoint(
      buttonRect.left + buttonRect.width / 2,
      buttonRect.top + 2
    );
    const navbarCenterHit = document.elementFromPoint(
      navbarRect.left + navbarRect.width / 2,
      navbarRect.top + navbarRect.height / 2
    );

    return {
      button: {
        bottom: buttonRect.bottom,
        height: buttonRect.height,
        left: buttonRect.left,
        right: buttonRect.right,
        top: buttonRect.top,
        width: buttonRect.width
      },
      buttonCenterHit: elementBelongsTo(button, buttonCenterHit),
      buttonTopCenterHit: elementBelongsTo(button, buttonTopCenterHit),
      dialog: {
        bottom: dialogRect.bottom,
        left: dialogRect.left,
        right: dialogRect.right,
        top: dialogRect.top
      },
      navbarBottom: navbarRect.bottom,
      navbarCenterOwnedByOverlay: elementBelongsTo(overlay, navbarCenterHit),
      portalParentIsBody: overlay.parentElement === document.body,
      viewport
    };
  });
}

async function alignLessonControlInItsScrollRoot(control: Locator) {
  await control.evaluate((element: HTMLElement) => {
    const pane = element.closest<HTMLElement>(
      "[data-lesson-content-pane], [data-lesson-directory-pane]"
    );
    if (pane && window.matchMedia("(min-width: 1024px)").matches) {
      const paneRect = pane.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const previousScrollBehavior = pane.style.scrollBehavior;
      pane.style.scrollBehavior = "auto";
      pane.scrollTo({
        behavior: "auto",
        top: Math.max(0, pane.scrollTop + elementRect.top - paneRect.top - 24)
      });
      pane.style.scrollBehavior = previousScrollBehavior;
      return;
    }
    const root = document.documentElement;
    const body = document.body;
    const previousRootScrollBehavior = root.style.scrollBehavior;
    const previousBodyScrollBehavior = body.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";
    element.scrollIntoView({ behavior: "auto", block: "center" });
    root.style.scrollBehavior = previousRootScrollBehavior;
    body.style.scrollBehavior = previousBodyScrollBehavior;
  });
  await control.evaluate(async (element: HTMLElement) => {
    const pane = element.closest<HTMLElement>(
      "[data-lesson-content-pane], [data-lesson-directory-pane]"
    );
    const desktop = window.matchMedia("(min-width: 1024px)").matches;
    const sample = () => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        paneScrollTop: desktop && pane ? pane.scrollTop : null,
        windowY: window.scrollY,
        top: rect.top
      };
    };
    let previous = sample();
    let stableSamples = 0;
    for (let attempt = 0; attempt < 90; attempt += 1) {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const current = sample();
      const delta = Math.max(
        Math.abs(current.left - previous.left),
        Math.abs(current.top - previous.top),
        Math.abs(current.windowY - previous.windowY),
        current.paneScrollTop === null || previous.paneScrollTop === null
          ? 0
          : Math.abs(current.paneScrollTop - previous.paneScrollTop)
      );
      stableSamples = delta <= 0.25 ? stableSamples + 1 : 0;
      if (stableSamples >= 2) return;
      previous = current;
    }
    throw new Error("The lesson control did not settle before pointer input.");
  });
}

async function wheelHorizontalScrollRoot(page: Page, scrollRoot: Locator) {
  const box = await scrollRoot.boundingBox();
  expect(box).not.toBeNull();
  const point = {
    x: box!.x + box!.width / 2,
    y: box!.y + box!.height / 2
  };
  await page.mouse.move(point.x, point.y);
  expect(await scrollRoot.evaluate((row, candidate) => {
    const hit = document.elementFromPoint(candidate.x, candidate.y);
    return Boolean(hit && (hit === row || row.contains(hit)));
  }, point), "The wheel gesture must hit the intended keyboard row").toBe(true);
  await page.mouse.wheel(240, 0);
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

async function wordProblemTapeGeometry(lesson: Locator) {
  const tape = lesson.locator('[data-word-problem-tape="two-step"]');
  await expect(tape).toBeVisible();
  return tape.evaluate((element: HTMLElement) => {
    const figureStage = element.closest<HTMLElement>("[data-figure-stage]");
    if (!figureStage) throw new Error("The word-problem tape must remain inside its Figure stage.");

    const rect = (target: Element) => {
      const bounds = target.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width
      };
    };
    const tapeRect = rect(element);
    const figureRect = rect(figureStage);
    const stages = Array.from(
      element.querySelectorAll<HTMLElement>("[data-word-problem-tape-stage]")
    ).map((stage) => {
      const id = stage.dataset.wordProblemTapeStage;
      const bar = stage.querySelector<HTMLElement>(`[data-word-problem-tape-bar="${id}"]`);
      const image = bar?.querySelector<HTMLElement>('[role="img"]');
      if (!bar || !image) throw new Error(`Tape stage ${id ?? "unknown"} needs one visible bar image.`);
      return {
        bar: rect(bar),
        id,
        image: rect(image),
        segments: Array.from(
          image.querySelectorAll<HTMLElement>("[data-word-problem-tape-segment]")
        ).map((segment) => ({
          id: segment.dataset.wordProblemTapeSegment,
          rect: rect(segment),
          value: Number(segment.dataset.tapeValue)
        })),
        total: Number(image.dataset.tapeTotal)
      };
    });

    return {
      documentHorizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      figureHorizontalOverflow: figureStage.scrollWidth > figureStage.clientWidth + 1,
      figureRect,
      stages,
      tapeRect
    };
  });
}

async function fluentWithin20FrameGeometry(lesson: Locator) {
  const operandFrames = lesson.locator("[data-operand-ten-frames]");
  await expect(operandFrames).toBeVisible();
  return operandFrames.evaluate((element: HTMLElement) => {
    const lessonElement = element.closest<HTMLElement>('[data-ccss-lesson="fluent-within-20"]');
    const figureStage = element.closest<HTMLElement>("[data-figure-stage]");
    if (!lessonElement) throw new Error("The ten-frames must remain inside Mental Math Within 20.");
    if (!figureStage) throw new Error("Mental Math Within 20 must remain inside its Figure stage.");

    const rect = (target: Element) => {
      const bounds = target.getBoundingClientRect();
      return {
        bottom: bounds.bottom,
        height: bounds.height,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        width: bounds.width
      };
    };
    const readFrame = (target: HTMLElement) => {
      const frameRect = rect(target);
      const cells = Array.from(
        target.querySelectorAll<HTMLElement>("[data-ten-frame-cell]")
      ).map((cell) => {
        const style = getComputedStyle(cell);
        return {
          backgroundColor: style.backgroundColor,
          boxShadow: style.boxShadow,
          rect: rect(cell),
          role: cell.dataset.makingTenCounterRole ?? "original",
          source:
            cell.dataset.makingTenCounterSource
            ?? cell.dataset.operandCounterSource
            ?? "empty"
        };
      });
      return {
        allCellsInside:
          cells.every((cell) =>
            cell.rect.left >= frameRect.left - 1
            && cell.rect.right <= frameRect.right + 1
            && cell.rect.top >= frameRect.top - 1
            && cell.rect.bottom <= frameRect.bottom + 1
          ),
        cells,
        filledPaintDiffersFromEmpty: (() => {
          const filled = cells.filter((cell) => cell.source !== "empty");
          const empty = cells.filter((cell) => cell.source === "empty");
          return filled.length === 0 || empty.length === 0 || filled.every((filledCell) =>
            empty.every((emptyCell) => filledCell.backgroundColor !== emptyCell.backgroundColor)
          );
        })(),
        rect: frameRect
      };
    };
    const frameEntries = [
      ...Array.from(lessonElement.querySelectorAll<HTMLElement>("[data-operand-frame]"))
        .map((frame) => [frame.dataset.operandFrame!, readFrame(frame)] as const),
      ...Array.from(lessonElement.querySelectorAll<HTMLElement>("[data-making-ten-frame]"))
        .map((frame) => [frame.dataset.makingTenFrame!, readFrame(frame)] as const)
    ];
    const frames = Object.fromEntries(frameEntries);
    const makingTenDiagram = lessonElement.querySelector<HTMLElement>("[data-making-ten-diagram]");
    const diagramRect = makingTenDiagram ? rect(makingTenDiagram) : null;
    const figureRect = rect(figureStage);
    const supplementalFrames = [frames.ten, frames.remainder].filter(Boolean);
    const supplementalFramesDoNotOverlap = supplementalFrames.length < 2 || !(
      supplementalFrames[0]!.rect.left < supplementalFrames[1]!.rect.right
      && supplementalFrames[0]!.rect.right > supplementalFrames[1]!.rect.left
      && supplementalFrames[0]!.rect.top < supplementalFrames[1]!.rect.bottom
      && supplementalFrames[0]!.rect.bottom > supplementalFrames[1]!.rect.top
    );
    const sourceColor = (source: string) => {
      const cell = [frames.first, frames.second]
        .flatMap((frame) => frame?.cells ?? [])
        .find((candidate) => candidate.source === source);
      return cell?.backgroundColor ?? null;
    };
    const supplementalColorsMatchOperands = supplementalFrames.every((frame) =>
      frame!.cells.every((cell) =>
        cell.source === "empty" || cell.backgroundColor === sourceColor(cell.source)
      )
    );

    return {
      diagramInsideFigure: diagramRect === null || (
        diagramRect.left >= figureRect.left - 1
        && diagramRect.right <= figureRect.right + 1
      ),
      documentHorizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      figureHorizontalOverflow: figureStage.scrollWidth > figureStage.clientWidth + 1,
      frames,
      supplementalColorsMatchOperands,
      supplementalFramesDoNotOverlap
    };
  });
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

  test("personalized unit stops show current stars, completed stars, and navigable not-learned locks", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await registerCaliforniaStudent(page, testInfo);

    const firstCompletion = await page.request.post("/api/lesson-progress", {
      data: { slug: gradeOneAddSubtractTopicPath.split("/").at(-1), action: "complete", checklistState: {} }
    });
    const firstCompletionText = await firstCompletion.text();
    expect(firstCompletion.status(), firstCompletionText).toBe(200);
    const firstCompletionBody = JSON.parse(firstCompletionText) as { lesson?: { slug?: string; status?: string } };
    expect(firstCompletionBody.lesson).toMatchObject({
      slug: gradeOneAddSubtractTopicPath.split("/").at(-1),
      status: "completed"
    });

    const firstRoadmapResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && url.pathname === "/api/roadmap" && url.searchParams.get("grade") === "P1";
    });
    await openLessonPage(page, gradeOnePlaceValueTopicPath);
    expect((await firstRoadmapResponse).status()).toBe(200);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    await expect(world.locator("[data-world-progress]")).toContainText(/1 of 16 clearings/i, { timeout: 10_000 });

    const isMobile = Boolean(testInfo.project.use.isMobile);
    const stateSnapshot = async (surface: Locator) => {
      const unitOne = surface.getByRole("link", { name: /^Unit 1 clearing: .+ \(completed\)$/ });
      const unitTwo = surface.getByRole("link", { name: /^Unit 2 clearing: .+ \(you are here\)$/ });
      const unitThree = surface.getByRole("link", { name: /^Unit 3 clearing: .+ \(next stop, not learned yet\)$/ });
      const unitFour = surface.getByRole("link", { name: /^Unit 4 clearing: .+ \(not learned yet\)$/ });
      await expect(surface.locator('a[aria-current="page"]')).toHaveCount(1);
      await expect(unitTwo).toHaveAttribute("aria-current", "page");
      await expect(unitThree).toHaveAttribute("href", /\/student\/lessons\//);
      await expect(unitFour).toHaveAttribute("href", /\/student\/lessons\//);
      return {
        one: await expectUnitStopVisualState(unitOne, "completed"),
        two: await expectUnitStopVisualState(unitTwo, "current"),
        three: await expectUnitStopVisualState(unitThree, "locked"),
        four: await expectUnitStopVisualState(unitFour, "locked")
      };
    };

    const firstSurface = isMobile ? world.locator("[data-world-ribbon]") : world.locator("ol:visible");
    const firstState = await stateSnapshot(firstSurface);
    expect(firstState.one).toBe("📖");
    for (const marker of Object.values(firstState)) {
      expect(marker).not.toBe("");
      expect(/[0-9\u20E3]/u.test(marker)).toBe(false);
      expect(["🔟", "🔢", "💯"].includes(marker)).toBe(false);
    }

    if (isMobile) {
      await world.getByRole("button", { name: /open the full map/i }).click();
      const mapState = await stateSnapshot(world.locator("ol:visible"));
      expect(mapState).toEqual(firstState);
    }
    const mapSurface = world.locator("ol:visible");

    const checklist = rightPane.locator('[data-tour="student-lesson-checklist"]');
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
    const markComplete = checklist.getByRole("button", { name: /^(Mark lesson complete|標記課節完成|标记课时完成)$/i });
    await expect(markComplete).toBeVisible();
    const completionResponsePromise = page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === "/api/lesson-progress" &&
      (response.request().postData() ?? "").includes('"action":"complete"')
    );
    await markComplete.click();
    const completionResponse = await completionResponsePromise;
    expect(completionResponse.status()).toBe(200);
    const completionBody = await completionResponse.json() as { lesson?: { slug?: string; status?: string } };
    expect(completionBody.lesson).toMatchObject({
      slug: gradeOnePlaceValueTopicPath.split("/").at(-1),
      status: "completed"
    });
    await expect(checklist.getByRole("button", { name: /^(Lesson complete|課節已完成|课时已完成)$/i })).toBeVisible();
    await expect(world.locator("[data-world-progress]")).toContainText(/2 of 16 clearings/i);

    const currentAfterCompletion = mapSurface.locator('a[aria-current="page"]');
    await expect(currentAfterCompletion).toHaveAccessibleName(/^Unit 2 clearing: .+ \(completed, you are here\)$/);
    await expectUnitStopVisualState(currentAfterCompletion, "current");
    if (isMobile) {
      const ribbonCurrent = world.locator('[data-world-ribbon] a[aria-current="page"]');
      await expect(ribbonCurrent).toHaveAccessibleName(/^Unit 2 clearing: .+ \(completed, you are here\)$/);
      expect(await expectUnitStopVisualState(ribbonCurrent, "current")).toBe(
        await visibleUnitStopMarker(currentAfterCompletion)
      );
    }

    const lockedNextUnit = mapSurface.getByRole("link", {
      name: /^Unit 3 clearing: .+ \(next stop, not learned yet\)$/
    });
    const nextHref = await lockedNextUnit.getAttribute("href");
    expect(nextHref).toBeTruthy();
    const nextRoadmapResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return response.request().method() === "GET" && url.pathname === "/api/roadmap" && url.searchParams.get("grade") === "P1";
    });
    await lockedNextUnit.click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(nextHref!);
    expect((await nextRoadmapResponse).status()).toBe(200);

    const movedWorld = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(movedWorld.locator("[data-world-progress]")).toContainText(/2 of 16 clearings/i, { timeout: 10_000 });
    if (isMobile && await movedWorld.locator("ol:visible").count() === 0) {
      await movedWorld.getByRole("button", { name: /open the full map/i }).click();
    }
    const movedMap = movedWorld.locator("ol:visible");
    const completedUnitTwo = movedMap.getByRole("link", { name: /^Unit 2 clearing: .+ \(completed\)$/ });
    const currentUnitThree = movedMap.getByRole("link", { name: /^Unit 3 clearing: .+ \(you are here\)$/ });
    const lockedUnitFour = movedMap.getByRole("link", {
      name: /^Unit 4 clearing: .+ \(next stop, not learned yet\)$/
    });
    await expect(movedMap.locator('a[aria-current="page"]')).toHaveCount(1);
    await expectUnitStopVisualState(completedUnitTwo, "completed");
    await expectUnitStopVisualState(currentUnitThree, "current");
    await expectUnitStopVisualState(lockedUnitFour, "locked");

    if (isMobile) {
      const movedRibbon = movedWorld.locator("[data-world-ribbon]");
      expect(await expectUnitStopVisualState(
        movedRibbon.getByRole("link", { name: /^Unit 2 clearing: .+ \(completed\)$/ }),
        "completed"
      )).toBe(await visibleUnitStopMarker(completedUnitTwo));
      expect(await expectUnitStopVisualState(
        movedRibbon.getByRole("link", { name: /^Unit 3 clearing: .+ \(you are here\)$/ }),
        "current"
      )).toBe(await visibleUnitStopMarker(currentUnitThree));
      expect(await expectUnitStopVisualState(
        movedRibbon.getByRole("link", { name: /^Unit 4 clearing: .+ \(next stop, not learned yet\)$/ }),
        "locked"
      )).toBe(await visibleUnitStopMarker(lockedUnitFour));
    }

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);
    expectNoPageErrors(errors);
  });

  test("Grade 2 Unit 1 replaces the here chip with the learner avatar cursor", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await registerCaliforniaStudent(page, testInfo, "zh-Hans", "P2");

    const profileResponse = await page.request.patch("/api/me/profile", {
      data: { avatarId: "sigma" }
    });
    const profileResponseText = await profileResponse.text();
    expect(profileResponse.status(), profileResponseText).toBe(200);
    const profileBody = JSON.parse(profileResponseText) as { user?: { avatarId?: string } };
    expect(profileBody.user?.avatarId).toBe("sigma");

    await openLessonPage(page, gradeTwoFluencyArraysTopicPath);
    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(world).toBeVisible({ timeout: 30_000 });
    const isMobile = Boolean(testInfo.project.use.isMobile);

    if (isMobile) {
      const ribbon = world.locator("[data-world-ribbon]");
      const ribbonCurrent = ribbon.locator('a[aria-current="page"]');
      await expect(ribbonCurrent).toHaveCount(1);
      await expect(ribbonCurrent).toHaveAccessibleName(/^第 1 单元空地：.+（你在这里）$/);
      expect(await expectUnitStopVisualState(ribbonCurrent, "current")).toBe("📝");
      await expect(ribbon.locator('[data-lesson-current-avatar-cursor="true"]')).toHaveCount(0);
      await expect(ribbon.getByText(/^(?:You are here|你在這裡|你在这里)$/)).toHaveCount(0);
      await world.getByRole("button", { name: /open the full map|展開完整地圖|展开完整地图/i }).click();
    }

    const map = world.locator("ol:visible");
    const currentUnit = map.locator('a[aria-current="page"]');
    await expect(map).toBeVisible();
    await expect(currentUnit).toHaveCount(1);
    await expect(currentUnit).toHaveAttribute("href", gradeTwoFluencyArraysTopicPath);
    await expect(currentUnit).toHaveAccessibleName(/^第 1 单元空地：.+（你在这里）$/);
    expect(await expectUnitStopVisualState(currentUnit, "current")).toBe("📝");
    await expectLessonWorldCurrentAvatarCursor(map, currentUnit, "🐶");
    await expect(map.getByText(/^(?:You are here|你在這裡|你在这里)$/)).toHaveCount(0);
    await expect(
      map.getByRole("button", { name: "1.1 Word Problems Within 100 📝", exact: true })
    ).toHaveCount(1);
    await expect(
      page.locator("[data-lesson-content-pane]:visible").getByRole("heading", {
        level: 2,
        name: "1.1 Word Problems Within 100",
        exact: true
      })
    ).toHaveCount(1);

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);

    const nextUnit = map.getByRole("link", {
      name: /^第 2 单元空地：.+（下一站，尚未学习）$/
    });
    await expect(nextUnit).toHaveCount(1);
    const nextHref = await nextUnit.getAttribute("href");
    expect(nextHref).toBeTruthy();
    await nextUnit.click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(nextHref!);

    const movedWorld = page.locator('[data-lesson-world="sprout-meadow"]');
    await expect(movedWorld).toBeVisible({ timeout: 30_000 });
    if (isMobile && await movedWorld.locator("ol:visible").count() === 0) {
      await movedWorld.getByRole("button", { name: /open the full map|展開完整地圖|展开完整地图/i }).click();
    }
    const movedMap = movedWorld.locator("ol:visible");
    const movedCurrent = movedMap.locator('a[aria-current="page"]');
    await expect(movedCurrent).toHaveAccessibleName(/^第 2 单元空地：.+（你在这里）$/);
    await expectUnitStopVisualState(movedCurrent, "current");
    await expectLessonWorldCurrentAvatarCursor(movedMap, movedCurrent, "🐶");
    await expect(movedMap.getByText(/^(?:You are here|你在這裡|你在这里)$/)).toHaveCount(0);

    if (isMobile) {
      const movedRibbon = movedWorld.locator("[data-world-ribbon]");
      const movedRibbonCurrent = movedRibbon.locator('a[aria-current="page"]');
      await expect(movedRibbonCurrent).toHaveAccessibleName(/^第 2 单元空地：.+（你在这里）$/);
      await expectUnitStopVisualState(movedRibbonCurrent, "current");
      await expect(movedRibbon.locator('[data-lesson-current-avatar-cursor="true"]')).toHaveCount(0);
      await expect(movedRibbon.getByText(/^(?:You are here|你在這裡|你在这里)$/)).toHaveCount(0);
    }

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);
    expectNoPageErrors(errors);
  });

  test("Grade 2 Unit 1 shows all 18 removed birds in its responsive two-step tape", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeTwoFluencyArraysTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    if (Boolean(testInfo.project.use.isMobile)) {
      await world.getByRole("button", {
        name: /open the full map|展開完整地圖|展开完整地图/i
      }).click();
    }

    const quickJumpMap = world.locator("ol:visible");
    const wordProblemJump = quickJumpMap.getByRole("button", {
      name: "1.1 Word Problems Within 100 📝",
      exact: true
    });
    await expect(wordProblemJump).toBeVisible();
    await alignLessonControlInItsScrollRoot(wordProblemJump);
    await wordProblemJump.click();

    const wordLesson = rightPane.locator('[data-ccss-lesson="word-problems-100"]');
    await expect(wordLesson).toHaveAttribute("data-ccss-diagram-hydrated", "true", {
      timeout: 30_000
    });
    await expectLessonTargetVisible(wordLesson);
    await expect(rightPane.getByRole("heading", {
      level: 2,
      name: "1.1 Word Problems Within 100",
      exact: true
    })).toHaveCount(1);

    const modeGroup = wordLesson.getByRole("group", {
      name: "Choose a word-problem story",
      exact: true
    });
    const oneStep = modeGroup.getByRole("button", { name: "One step", exact: true });
    const twoStep = modeGroup.getByRole("button", { name: "Two step", exact: true });
    const equation = wordLesson.locator("[data-word-problem-equation]");
    await expect(oneStep).toHaveAttribute("aria-pressed", "true");
    await expect(twoStep).toHaveAttribute("aria-pressed", "false");
    const oneStepTape = wordLesson.locator('[data-word-problem-tape="one-step"]');
    await expect(oneStepTape).toHaveCount(1);
    await expect(oneStepTape.getByRole("img", {
      name: "One-step tape diagram: 63 books split into 45 at the start and 18 added.",
      exact: true
    })).toBeVisible();
    await expect(equation).toHaveText("45 + 18 = 63");
    await expect(equation).toHaveAttribute("aria-live", "polite");
    await expect(equation).toHaveAttribute("aria-atomic", "true");

    await alignLessonControlInItsScrollRoot(twoStep);
    const isMobile = Boolean(testInfo.project.use.isMobile);
    const firstDesktopScrollBaseline = isMobile ? null : {
      leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    await twoStep.click();
    await expect(twoStep).toHaveAttribute("aria-pressed", "true");
    await expect(oneStep).toHaveAttribute("aria-pressed", "false");
    await expect(wordLesson.getByText(
      "45 birds sat on a wire. 18 flew away. Then 12 more landed. How many birds now?",
      { exact: true }
    )).toBeVisible();
    await expect(equation).toHaveText("45 − 18 + 12 = 39");

    const tape = wordLesson.locator('[data-word-problem-tape="two-step"]');
    const stepOne = tape.locator('[data-word-problem-tape-stage="step-1"]');
    const stepTwo = tape.locator('[data-word-problem-tape-stage="step-2"]');
    await expect(tape.locator("[data-word-problem-tape-stage]")).toHaveCount(2);
    await expect(stepOne.getByRole("img", {
      name: "Step 1 tape diagram: 45 birds split into 27 stayed and 18 flew away.",
      exact: true
    })).toBeVisible();
    await expect(stepTwo.getByRole("img", {
      name: "Step 2 tape diagram: 39 birds split into 27 stayed and 12 landed.",
      exact: true
    })).toBeVisible();
    await expect(stepOne.locator('[data-word-problem-tape-segment="stayed"]')).toHaveAttribute(
      "data-tape-value",
      "27"
    );
    await expect(stepOne.locator('[data-word-problem-tape-segment="flew-away"]')).toHaveAttribute(
      "data-tape-value",
      "18"
    );
    await expect(stepTwo.locator('[data-word-problem-tape-segment="stayed"]')).toHaveAttribute(
      "data-tape-value",
      "27"
    );
    await expect(stepTwo.locator('[data-word-problem-tape-segment="landed"]')).toHaveAttribute(
      "data-tape-value",
      "12"
    );

    const geometry = await wordProblemTapeGeometry(wordLesson);
    expect(geometry.stages).toHaveLength(2);
    const [stepOneGeometry, stepTwoGeometry] = geometry.stages;
    expect(stepOneGeometry?.id).toBe("step-1");
    expect(stepTwoGeometry?.id).toBe("step-2");
    expect(stepOneGeometry?.total).toBe(45);
    expect(stepTwoGeometry?.total).toBe(39);
    expect(stepOneGeometry!.bar.width).toBeGreaterThan(0);
    expect(stepTwoGeometry!.bar.width).toBeGreaterThan(0);
    expect(
      Math.abs(stepTwoGeometry!.bar.width / stepOneGeometry!.bar.width - 39 / 45)
    ).toBeLessThanOrEqual(0.03);
    expect(
      Math.abs(
        stepOneGeometry!.segments[0]!.rect.width / stepOneGeometry!.image.width - 27 / 45
      )
    ).toBeLessThanOrEqual(0.03);
    expect(
      Math.abs(
        stepOneGeometry!.segments[1]!.rect.width / stepOneGeometry!.image.width - 18 / 45
      )
    ).toBeLessThanOrEqual(0.03);
    expect(
      Math.abs(
        stepTwoGeometry!.segments[0]!.rect.width / stepTwoGeometry!.image.width - 27 / 39
      )
    ).toBeLessThanOrEqual(0.03);
    expect(
      Math.abs(
        stepTwoGeometry!.segments[1]!.rect.width / stepTwoGeometry!.image.width - 12 / 39
      )
    ).toBeLessThanOrEqual(0.03);
    const stepOneStayed = stepOneGeometry!.segments.find((segment) => segment.id === "stayed");
    const stepTwoStayed = stepTwoGeometry!.segments.find((segment) => segment.id === "stayed");
    expect(stepOneStayed).toBeTruthy();
    expect(stepTwoStayed).toBeTruthy();
    expect(Math.abs(stepOneStayed!.rect.width - stepTwoStayed!.rect.width)).toBeLessThanOrEqual(1);
    for (const stage of geometry.stages) {
      expect(stage.bar.left).toBeGreaterThanOrEqual(geometry.tapeRect.left - 1);
      expect(stage.bar.right).toBeLessThanOrEqual(geometry.tapeRect.right + 1);
      expect(stage.bar.left).toBeGreaterThanOrEqual(geometry.figureRect.left - 1);
      expect(stage.bar.right).toBeLessThanOrEqual(geometry.figureRect.right + 1);
      expect(stage.segments.reduce((sum, segment) => sum + segment.value, 0)).toBe(stage.total);
    }
    expect(geometry.figureHorizontalOverflow).toBe(false);
    expect(geometry.documentHorizontalOverflow).toBe(false);
    await expect(wordLesson.locator("[data-figure-stage]")).not.toHaveAttribute(
      "data-figure-overflowing",
      "true"
    );

    const decreaseFlewAway = wordLesson.getByRole("button", {
      name: "Decrease Flew away",
      exact: true
    });
    const increaseFlewAway = wordLesson.getByRole("button", {
      name: "Increase Flew away",
      exact: true
    });
    const increaseLanded = wordLesson.getByRole("button", {
      name: "Increase Landed",
      exact: true
    });
    const decreaseLanded = wordLesson.getByRole("button", {
      name: "Decrease Landed",
      exact: true
    });
    await decreaseFlewAway.click();
    await expect(equation).toHaveText("45 − 17 + 12 = 40");
    await expect(stepOne.getByRole("img", {
      name: "Step 1 tape diagram: 45 birds split into 28 stayed and 17 flew away.",
      exact: true
    })).toBeVisible();
    await increaseFlewAway.click();
    await expect(equation).toHaveText("45 − 18 + 12 = 39");
    await increaseLanded.click();
    await expect(equation).toHaveText("45 − 18 + 13 = 40");
    await expect(stepTwo.getByRole("img", {
      name: "Step 2 tape diagram: 40 birds split into 27 stayed and 13 landed.",
      exact: true
    })).toBeVisible();
    await decreaseLanded.click();
    await expect(equation).toHaveText("45 − 18 + 12 = 39");

    await oneStep.click();
    await expect(equation).toHaveText("45 + 18 = 63");
    const decreaseStart = wordLesson.getByRole("button", {
      name: "Decrease Start",
      exact: true
    });
    for (let start = 45; start > 17; start -= 1) {
      await decreaseStart.click();
    }
    await expect(equation).toHaveText("17 + 18 = 35");

    await twoStep.click();
    await expect(equation).toHaveText("17 − 17 + 12 = 12");
    await expect(wordLesson.getByRole("button", {
      name: "Increase Flew away",
      exact: true
    })).toBeDisabled();
    await wordLesson.getByRole("button", { name: "Increase Start", exact: true }).click();
    await expect(equation).toHaveText("18 − 17 + 12 = 13");
    await oneStep.click();
    await expect(equation).toHaveText("18 + 17 = 35");
    await expect(oneStep).toHaveAttribute("aria-pressed", "true");

    if (firstDesktopScrollBaseline) {
      const firstDesktopScrollAfter = {
        leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
        windowY: await page.evaluate(() => window.scrollY)
      };
      expect(
        Math.abs(firstDesktopScrollAfter.leftScrollTop - firstDesktopScrollBaseline.leftScrollTop)
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(firstDesktopScrollAfter.windowY - firstDesktopScrollBaseline.windowY)
      ).toBeLessThanOrEqual(1);
    }

    await openLessonPage(page, gradeTwoFluencyArraysTopicPath);
    const boundaryWorld = page.locator('[data-lesson-world="sprout-meadow"]');
    const boundaryLeftPane = page.locator("[data-lesson-directory-pane]:visible");
    const boundaryRightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(boundaryWorld).toBeVisible({ timeout: 30_000 });
    await expect(boundaryRightPane).toBeVisible({ timeout: 30_000 });
    if (isMobile) {
      await boundaryWorld.getByRole("button", {
        name: /open the full map|展開完整地圖|展开完整地图/i
      }).click();
    }
    const boundaryWordProblemJump = boundaryWorld.locator("ol:visible").getByRole("button", {
      name: "1.1 Word Problems Within 100 📝",
      exact: true
    });
    await alignLessonControlInItsScrollRoot(boundaryWordProblemJump);
    await boundaryWordProblemJump.click();

    const boundaryLesson = boundaryRightPane.locator('[data-ccss-lesson="word-problems-100"]');
    await expect(boundaryLesson).toHaveAttribute("data-ccss-diagram-hydrated", "true", {
      timeout: 30_000
    });
    await expectLessonTargetVisible(boundaryLesson);
    const boundaryEquation = boundaryLesson.locator("[data-word-problem-equation]");
    const increaseStart = boundaryLesson.getByRole("button", {
      name: "Increase Start",
      exact: true
    });
    await expect(boundaryEquation).toHaveText("45 + 18 = 63");
    await alignLessonControlInItsScrollRoot(increaseStart);
    const boundaryDesktopScrollBaseline = isMobile ? null : {
      leftScrollTop: await boundaryLeftPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    for (let start = 45; start < 80; start += 1) {
      await increaseStart.click();
    }
    await expect(boundaryEquation).toHaveText("80 + 18 = 98");
    const increaseAdded = boundaryLesson.getByRole("button", {
      name: "Increase Added",
      exact: true
    });
    await increaseAdded.click();
    await increaseAdded.click();
    await expect(boundaryEquation).toHaveText("80 + 20 = 100");
    await expect(increaseAdded).toBeDisabled();
    await expect(boundaryLesson.getByRole("img", {
      name: "One-step tape diagram: 100 books split into 80 at the start and 20 added.",
      exact: true
    })).toBeVisible();
    if (boundaryDesktopScrollBaseline) {
      const boundaryDesktopScrollAfter = {
        leftScrollTop: await boundaryLeftPane.evaluate((element: HTMLElement) => element.scrollTop),
        windowY: await page.evaluate(() => window.scrollY)
      };
      expect(
        Math.abs(
          boundaryDesktopScrollAfter.leftScrollTop - boundaryDesktopScrollBaseline.leftScrollTop
        )
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(boundaryDesktopScrollAfter.windowY - boundaryDesktopScrollBaseline.windowY)
      ).toBeLessThanOrEqual(1);
    }

    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);
    expect(new URL(page.url()).pathname).toBe(gradeTwoFluencyArraysTopicPath);
    expectNoPageErrors(errors);
  });

  test("Grade 2 Unit 1 shows a complete making-a-ten model beside every crossing-ten fact", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeTwoFluencyArraysTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const isMobile = Boolean(testInfo.project.use.isMobile);
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    if (isMobile) {
      await world.getByRole("button", {
        name: /open the full map|展開完整地圖|展开完整地图/i
      }).click();
    }

    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    const mentalMathJump = quickJumpMap.getByRole("button", {
      name: "1.2 Mental Math Within 20 ⚡",
      exact: true
    });
    await expect(currentUnit).toHaveCount(1);
    const currentHref = await currentUnit.getAttribute("href");
    const currentLabel = await currentUnit.getAttribute("aria-label");
    expect(currentHref).toBeTruthy();
    expect(currentLabel).toBeTruthy();
    await expect(mentalMathJump).toBeVisible();
    await alignLessonControlInItsScrollRoot(mentalMathJump);
    await mentalMathJump.click();

    const lesson = rightPane.locator('[data-ccss-lesson="fluent-within-20"]');
    await expect(lesson).toHaveAttribute("data-ccss-diagram-hydrated", "true", {
      timeout: 30_000
    });
    await expectLessonTargetVisible(lesson);
    await expect(rightPane.getByRole("heading", {
      level: 2,
      name: "1.2 Mental Math Within 20",
      exact: true
    })).toHaveCount(1);

    const originalDiagram = lesson.locator('[data-operand-ten-frames]');
    const makingTenDiagram = lesson.locator('[data-making-ten-diagram="active"]');
    const makingTenTitle = lesson.locator("[data-making-ten-title]");
    const transfer = lesson.locator("[data-making-ten-transfer]");
    const splitEquation = lesson.locator("[data-making-ten-split]");
    const fillEquation = lesson.locator("[data-making-ten-fill-equation]");
    const totalEquation = lesson.locator("[data-making-ten-equation]");
    const liveModel = lesson.locator("[data-fluent-within-20-live]");
    const decreaseFirst = lesson.getByRole("button", { name: "Decrease First", exact: true });
    const increaseFirst = lesson.getByRole("button", { name: "Increase First", exact: true });
    const increaseSecond = lesson.getByRole("button", { name: "Increase Second", exact: true });
    const decreaseSecond = lesson.getByRole("button", { name: "Decrease Second", exact: true });

    const expectFrameState = async (
      expected: {
        first: number;
        second: number;
        ten?: { first: number; second: number };
        remainder?: { first: number; second: number };
      }
    ) => {
      const geometry = await fluentWithin20FrameGeometry(lesson);
      const frame = (id: string) => {
        const value = geometry.frames[id];
        expect(value, `ten-frame ${id} must exist`).toBeTruthy();
        return value!;
      };
      const count = (id: string, source: string, role?: string) =>
        frame(id).cells.filter((cell) =>
          cell.source === source && (role === undefined || cell.role === role)
        ).length;
      for (const id of Object.keys(geometry.frames)) {
        expect(frame(id).cells).toHaveLength(10);
        expect(frame(id).allCellsInside).toBe(true);
        expect(frame(id).filledPaintDiffersFromEmpty).toBe(true);
        for (const cell of frame(id).cells.filter((candidate) => candidate.source !== "empty")) {
          expect(cell.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
        }
      }
      expect(count("first", "first", "original")).toBe(expected.first);
      expect(count("second", "second", "original")).toBe(expected.second);
      if (expected.ten && expected.remainder) {
        expect(Object.keys(geometry.frames).sort()).toEqual(["first", "remainder", "second", "ten"]);
        expect(frame("ten").cells.length + frame("remainder").cells.length).toBe(20);
        expect(count("ten", "first")).toBe(expected.ten.first);
        expect(count("ten", "second")).toBe(expected.ten.second);
        expect(count("remainder", "first")).toBe(expected.remainder.first);
        expect(count("remainder", "second")).toBe(expected.remainder.second);
        for (const source of ["first", "second"] as const) {
          if (expected.remainder[source] > 0) {
            expect(count("ten", source, "moved")).toBe(expected.ten[source]);
            expect(count("remainder", source, "remaining")).toBe(expected.remainder[source]);
          } else if (expected.ten[source] > 0) {
            expect(count("ten", source, "anchor")).toBe(expected.ten[source]);
          }
        }
        expect(geometry.supplementalColorsMatchOperands).toBe(true);
        expect(geometry.supplementalFramesDoNotOverlap).toBe(true);
        const movedCells = frame("ten").cells.filter((cell) => cell.role === "moved");
        const anchorCells = frame("ten").cells.filter((cell) => cell.role === "anchor");
        const remainingCells = frame("remainder").cells.filter((cell) => cell.role === "remaining");
        expect(movedCells.length).toBeGreaterThan(0);
        expect(anchorCells.length).toBeGreaterThan(0);
        expect(remainingCells.length).toBeGreaterThan(0);
        for (const moved of movedCells) {
          expect(moved.boxShadow).not.toBe("none");
          expect(moved.boxShadow).not.toBe(anchorCells[0]!.boxShadow);
          expect(moved.boxShadow).not.toBe(remainingCells[0]!.boxShadow);
        }
      } else {
        expect(Object.keys(geometry.frames).sort()).toEqual(["first", "second"]);
      }
      expect(geometry.diagramInsideFigure).toBe(true);
      expect(geometry.figureHorizontalOverflow).toBe(false);
      expect(geometry.documentHorizontalOverflow).toBe(false);
      await expect(lesson.locator("[data-figure-stage]")).not.toHaveAttribute(
        "data-figure-overflowing",
        "true"
      );
    };

    await expect(originalDiagram).toHaveAttribute(
      "aria-label",
      "Original addends: the first ten-frame shows 8 orange counters and the second ten-frame shows 7 blue counters. 8 plus 7 equals 15."
    );
    await expect(makingTenDiagram).toHaveAttribute(
      "aria-label",
      "Making a ten diagram for 8 plus 7: keep 8 orange counters together, split 7 blue counters into 2 and 5, move 2 blue counters to make 10, then add the remaining 5 to make 15."
    );
    await expect(originalDiagram).toBeVisible();
    await expect(makingTenDiagram).toBeVisible();
    await expect(lesson.getByRole("img", {
      name: "Original addends: the first ten-frame shows 8 orange counters and the second ten-frame shows 7 blue counters. 8 plus 7 equals 15.",
      exact: true
    })).toBeVisible();
    await expect(makingTenTitle).toHaveText("Another way: Make a ten");
    await expect(makingTenTitle).toBeVisible();
    await expect(transfer).toHaveText(/Move 2$/u);
    await expect(transfer).toBeVisible();
    await expect(splitEquation).toHaveText("7 = 2 + 5");
    await expect(fillEquation).toHaveText("8 + 2 = 10");
    await expect(totalEquation).toHaveText("8 + 7 = 10 + 5 = 15");
    await expect(splitEquation).toBeVisible();
    await expect(fillEquation).toBeVisible();
    await expect(totalEquation).toBeVisible();
    await expect(lesson.getByRole("img", {
      name: "Making a ten diagram for 8 plus 7: keep 8 orange counters together, split 7 blue counters into 2 and 5, move 2 blue counters to make 10, then add the remaining 5 to make 15.",
      exact: true
    })).toBeVisible();
    await expect(lesson.getByText("Near double", { exact: true })).toBeVisible();
    await expect(lesson.getByText(
      "8 + 7 = 7 + 7 + 1 = 14 + 1 = 15.",
      { exact: true }
    )).toBeVisible();
    await expect(liveModel).toHaveCount(1);
    await expect(liveModel).toHaveAttribute("aria-live", "polite");
    await expect(liveModel).toHaveAttribute("aria-atomic", "true");
    await expect(liveModel).toHaveText(
      "Making a ten diagram for 8 plus 7: keep 8 orange counters together, split 7 blue counters into 2 and 5, move 2 blue counters to make 10, then add the remaining 5 to make 15. Automatic strategy: Near double. 8 + 7 = 7 + 7 + 1 = 14 + 1 = 15."
    );
    await expectFrameState({
      first: 8,
      remainder: { first: 0, second: 5 },
      second: 7,
      ten: { first: 8, second: 2 }
    });

    await alignLessonControlInItsScrollRoot(decreaseFirst);
    for (const control of [decreaseFirst, increaseFirst, increaseSecond, decreaseSecond]) {
      const box = await control.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const desktopScrollBaseline = isMobile ? null : {
      leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };

    await decreaseFirst.click();
    await decreaseFirst.click();
    await decreaseSecond.click();
    await expect(originalDiagram).toHaveAttribute(
      "aria-label",
      "Original addends: the first ten-frame shows 6 orange counters and the second ten-frame shows 6 blue counters. 6 plus 6 equals 12."
    );
    await expect(lesson.getByText("Doubles", { exact: true })).toBeVisible();
    await expect(lesson.getByText(
      "6 + 6 is a double you can memorize = 12.",
      { exact: true }
    )).toBeVisible();
    await expect(splitEquation).toHaveText("6 = 4 + 2");
    await expect(fillEquation).toHaveText("6 + 4 = 10");
    await expect(totalEquation).toHaveText("6 + 6 = 10 + 2 = 12");
    await expect(liveModel).toHaveText(
      "Making a ten diagram for 6 plus 6: keep 6 orange counters together, split 6 blue counters into 4 and 2, move 4 blue counters to make 10, then add the remaining 2 to make 12. Automatic strategy: Doubles. 6 + 6 is a double you can memorize = 12."
    );
    await expectFrameState({
      first: 6,
      remainder: { first: 0, second: 2 },
      second: 6,
      ten: { first: 6, second: 4 }
    });

    await decreaseFirst.click();
    await decreaseFirst.click();
    await increaseSecond.click();
    await increaseSecond.click();
    await expect(originalDiagram).toHaveAttribute(
      "aria-label",
      "Original addends: the first ten-frame shows 4 orange counters and the second ten-frame shows 8 blue counters. 4 plus 8 equals 12."
    );
    await expect(makingTenDiagram).toHaveAttribute(
      "aria-label",
      "Making a ten diagram for 4 plus 8: keep 8 blue counters together, split 4 orange counters into 2 and 2, move 2 orange counters to make 10, then add the remaining 2 to make 12."
    );
    await expect(makingTenDiagram).toBeVisible();
    await expect(lesson.getByText("Make a ten", { exact: true })).toBeVisible();
    await expect(lesson.getByText(
      "Fill a ten: 8 + 2 = 10. Split 4 into 2 + 2, then 10 + 2 = 12.",
      { exact: true }
    )).toBeVisible();
    await expect(transfer).toHaveText(/Move 2$/u);
    await expect(splitEquation).toHaveText("4 = 2 + 2");
    await expect(fillEquation).toHaveText("8 + 2 = 10");
    await expect(totalEquation).toHaveText("4 + 8 = 10 + 2 = 12");
    await expect(liveModel).toHaveText(
      "Making a ten diagram for 4 plus 8: keep 8 blue counters together, split 4 orange counters into 2 and 2, move 2 orange counters to make 10, then add the remaining 2 to make 12. Automatic strategy: Make a ten. Fill a ten: 8 + 2 = 10. Split 4 into 2 + 2, then 10 + 2 = 12."
    );
    await expectFrameState({
      first: 4,
      remainder: { first: 2, second: 0 },
      second: 8,
      ten: { first: 2, second: 8 }
    });

    await decreaseSecond.click();
    await decreaseSecond.click();
    await expect(originalDiagram).toHaveAttribute(
      "aria-label",
      "Original addends: the first ten-frame shows 4 orange counters and the second ten-frame shows 6 blue counters. 4 plus 6 equals 10."
    );
    await expect(lesson.getByText("Count on", { exact: true })).toBeVisible();
    await expect(lesson.getByText(
      "Start at 6 and count on 4 = 10.",
      { exact: true }
    )).toBeVisible();
    await expect(makingTenDiagram).toHaveCount(0);
    await expect(makingTenTitle).toHaveCount(0);
    await expect(transfer).toHaveCount(0);
    await expect(splitEquation).toHaveCount(0);
    await expect(fillEquation).toHaveCount(0);
    await expect(totalEquation).toHaveCount(0);
    await expect(liveModel).toHaveText(
      "Original ten-frame diagram: the first frame shows 4 orange counters and the second frame shows 6 blue counters. 4 plus 6 equals 10. Automatic strategy: Count on. Start at 6 and count on 4 = 10."
    );
    await expectFrameState({ first: 4, second: 6 });

    await decreaseSecond.click();
    await expect(originalDiagram).toHaveAttribute(
      "aria-label",
      "Original addends: the first ten-frame shows 4 orange counters and the second ten-frame shows 5 blue counters. 4 plus 5 equals 9."
    );
    await expect(lesson.getByText("Near double", { exact: true })).toBeVisible();
    await expect(lesson.getByText(
      "4 + 5 = 4 + 4 + 1 = 8 + 1 = 9.",
      { exact: true }
    )).toBeVisible();
    await expect(makingTenDiagram).toHaveCount(0);
    await expect(makingTenTitle).toHaveCount(0);
    await expect(transfer).toHaveCount(0);
    await expect(splitEquation).toHaveCount(0);
    await expect(fillEquation).toHaveCount(0);
    await expect(totalEquation).toHaveCount(0);
    await expect(liveModel).toHaveText(
      "Original ten-frame diagram: the first frame shows 4 orange counters and the second frame shows 5 blue counters. 4 plus 5 equals 9. Automatic strategy: Near double. 4 + 5 = 4 + 4 + 1 = 8 + 1 = 9."
    );
    await expectFrameState({ first: 4, second: 5 });

    if (desktopScrollBaseline) {
      expect(Math.abs(
        await leftPane.evaluate((element: HTMLElement) => element.scrollTop)
          - desktopScrollBaseline.leftScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await page.evaluate(() => window.scrollY) - desktopScrollBaseline.windowY
      )).toBeLessThanOrEqual(1);
    }
    await expect(currentUnit).toHaveAttribute("href", currentHref!);
    await expect(currentUnit).toHaveAttribute("aria-label", currentLabel!);

    expect(new URL(page.url()).pathname).toBe(gradeTwoFluencyArraysTopicPath);
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);
    expectNoPageErrors(errors);
  });

  test("Grade 2 Unit 1 lesson practice keeps the full math keyboard compact and touch-safe", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const errors = collectPageErrors(page);
    const isMobile = Boolean(testInfo.project.use.isMobile);
    await keepLessonWorldMenuOpen(page);
    await registerCaliforniaStudent(page, testInfo, "en", "P2");
    await openLessonPage(page, gradeTwoFluencyArraysTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const leftPane = page.locator("[data-lesson-directory-pane]:visible");
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    if (isMobile) {
      await world.getByRole("button", {
        name: /open the full map|展開完整地圖|展开完整地图/i
      }).click();
    }

    const quickJumpMap = world.locator("ol:visible");
    const currentUnit = quickJumpMap.locator('a[aria-current="page"]');
    const practiceJump = quickJumpMap.getByRole("button", {
      name: "1.6 Practice check",
      exact: true
    });
    await expect(currentUnit).toHaveCount(1);
    await expect(currentUnit).toHaveAttribute("href", gradeTwoFluencyArraysTopicPath);
    const currentLabel = await currentUnit.getAttribute("aria-label");
    expect(currentLabel).toBeTruthy();
    await expect(practiceJump).toBeVisible();
    await practiceJump.click();

    const practice = rightPane.locator("#lesson-practice");
    await expectLessonTargetVisible(practice);
    await expect(rightPane.getByRole("heading", {
      level: 2,
      name: "1.6 Practice check",
      exact: true
    })).toHaveCount(1);

    const practiceCards = practice.locator('[data-ai-selectable="practice-question"]');
    const missionTrail = practice.locator('[data-testid="lesson-mission-trail"]');
    await expect(practiceCards).toHaveCount(5);
    await expect(missionTrail.getByRole("button")).toHaveCount(5);
    const renderedQuestionIds = await practiceCards.evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-ai-question-id"))
    );
    expect(renderedQuestionIds.every(Boolean)).toBe(true);
    const keyboardQuestionIndex = renderedQuestionIds.findIndex((questionId) => {
      const question = sourceQuestionForRenderedId(questionId);
      return question.type === "fill-in" || question.type === "short-answer";
    });
    expect(keyboardQuestionIndex).toBeGreaterThanOrEqual(0);
    const keyboardQuestionId = renderedQuestionIds[keyboardQuestionIndex]!;
    const keyboardQuestion = sourceQuestionForRenderedId(keyboardQuestionId);
    expect(["fill-in", "short-answer"]).toContain(keyboardQuestion.type);
    const keyboardMissionStone = missionTrail.getByRole("button").nth(keyboardQuestionIndex);
    await keyboardMissionStone.click();
    await expect(keyboardMissionStone).toBeFocused();
    await expect(keyboardMissionStone).toHaveAttribute("aria-current", "step");

    const card = practice.locator(
      `[data-ai-selectable="practice-question"][data-ai-question-id="${keyboardQuestionId}"]:visible`
    );
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("data-ai-question-id", keyboardQuestionId);
    const keyboardToggle = card.getByRole("button", {
      name: /Show math keyboard|顯示數學鍵盤|显示数学键盘/i
    });
    await alignLessonControlInItsScrollRoot(keyboardToggle);
    const keyboardToggleBounds = await keyboardToggle.boundingBox();
    expect(keyboardToggleBounds).not.toBeNull();
    expect(keyboardToggleBounds!.height).toBeGreaterThanOrEqual(44);
    const desktopScrollBaseline = isMobile ? null : {
      leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    await keyboardToggle.click();

    const keyboard = card.getByRole("group", {
      name: /Math soft keyboard|數學軟鍵盤|数学软键盘/i
    });
    const answer = card.getByRole("textbox").first();
    await expect(keyboard).toBeVisible();
    await expect(keyboard).toHaveAttribute("data-math-keyboard-layout", "compact");
    const keyboardCloseToggle = card.getByRole("button", {
      name: /Hide math keyboard|收起數學鍵盤|收起数学键盘/i
    });
    await expect(keyboardCloseToggle).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();
    const scrollHint = keyboard.getByText(
      /Swipe or scroll each row for more keys|滑動或捲動每一列以查看更多按鍵|滑动或滚动每一行以查看更多按键/
    );
    await expect(scrollHint).toBeVisible();

    const expectedTabKeyCounts = new Map([
      ["123", 47],
      ["∞≠∈", 46],
      ["abc", 47],
      ["αβγ", 36]
    ]);
    const tablist = keyboard.getByRole("tablist", {
      name: /Math keyboard categories|數學鍵盤分類|数学键盘分类/i
    });
    const editingControls = keyboard.getByRole("group", {
      name: /Soft keyboard editing controls|軟鍵盤編輯控制|软键盘编辑控制/i
    });
    await expect(tablist.getByRole("tab")).toHaveCount(4);
    await expect(editingControls.getByRole("button")).toHaveCount(6);

    const editingGeometry = await editingControls.evaluate((row) => {
      const keys = Array.from(row.querySelectorAll<HTMLElement>('button[data-math-key="true"]'));
      const keyRects = keys.map((key) => key.getBoundingClientRect());
      return {
        clientWidth: row.clientWidth,
        keyTopDelta: keyRects.length
          ? Math.max(...keyRects.map((rect) => rect.top)) - Math.min(...keyRects.map((rect) => rect.top))
          : Number.POSITIVE_INFINITY,
        overscrollBehaviorX: getComputedStyle(row).overscrollBehaviorX,
        overflowX: getComputedStyle(row).overflowX,
        scrollbarWidth: getComputedStyle(row).scrollbarWidth,
        scrollLeft: row.scrollLeft,
        scrollWidth: row.scrollWidth,
        tabIndex: row.tabIndex
      };
    });
    expect(editingGeometry.keyTopDelta, "Editing controls must stay on one logical row").toBeLessThanOrEqual(1);
    expect(["auto", "scroll"]).toContain(editingGeometry.overflowX);
    expect(editingGeometry.overscrollBehaviorX).toBe("contain");
    expect(editingGeometry.scrollbarWidth).toBe("thin");
    expect(editingGeometry.tabIndex, "The scroll root must not add a keyboard tab stop").toBe(-1);
    expect(editingGeometry.scrollLeft).toBeLessThanOrEqual(1);
    if (isMobile) {
      expect(
        editingGeometry.scrollWidth,
        "The six 44px editing controls must use real horizontal overflow in the narrow lesson card"
      ).toBeGreaterThan(editingGeometry.clientWidth + 1);

      await alignLessonControlInItsScrollRoot(editingControls);
      await expect(editingControls).toBeVisible();
      const activeRows = keyboard.getByRole("tabpanel").locator("[data-math-keyboard-row]");
      const activeRowScrollBefore = await activeRows.evaluateAll((rows) => rows.map((row) => row.scrollLeft));
      const editingWheelBaseline = {
        documentX: await page.evaluate(() => window.scrollX),
        leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
        rightScrollTop: await rightPane.evaluate((element: HTMLElement) => element.scrollTop),
        windowY: await page.evaluate(() => window.scrollY)
      };
      await wheelHorizontalScrollRoot(page, editingControls);
      await expect.poll(() => editingControls.evaluate((row) => row.scrollLeft)).toBeGreaterThan(1);

      const clearAnswer = editingControls.getByRole("button", { name: /Clear answer/i });
      const clearAnswerGeometry = await clearAnswer.evaluate((key) => {
        const row = key.closest<HTMLElement>('[data-math-keyboard-row="editing-controls"]');
        if (!row) throw new Error("Clear answer must remain inside the editing-controls row.");
        const keyRect = key.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        return {
          keyLeft: keyRect.left,
          keyRight: keyRect.right,
          rowLeft: rowRect.left,
          rowRight: rowRect.right
        };
      });
      expect(clearAnswerGeometry.keyLeft).toBeGreaterThanOrEqual(clearAnswerGeometry.rowLeft - 1);
      expect(clearAnswerGeometry.keyRight).toBeLessThanOrEqual(clearAnswerGeometry.rowRight + 1);
      expect(await activeRows.evaluateAll((rows) => rows.map((row) => row.scrollLeft))).toEqual(activeRowScrollBefore);
      expect(await page.evaluate(() => window.scrollX)).toBe(editingWheelBaseline.documentX);
      expect(Math.abs(
        await leftPane.evaluate((element: HTMLElement) => element.scrollTop)
          - editingWheelBaseline.leftScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await rightPane.evaluate((element: HTMLElement) => element.scrollTop)
          - editingWheelBaseline.rightScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await page.evaluate(() => window.scrollY) - editingWheelBaseline.windowY
      )).toBeLessThanOrEqual(1);
    }

    const interactiveTargetGeometry = await keyboard.locator("button:visible").evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          height: rect.height,
          label: button.getAttribute("aria-label") ?? "",
          size: button.getAttribute("data-math-key-size"),
          width: rect.width
        };
      })
    );
    for (const target of interactiveTargetGeometry) {
      expect(target.width, `${target.label} must remain at least 44px wide`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${target.label} must remain at least 44px tall`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${target.label} must stay compact`).toBeLessThanOrEqual(48);
      if (target.size === "editing") {
        expect(target.width, `${target.label} must stay within the compact control width`).toBeLessThanOrEqual(48);
      }
    }

    for (const [tabName, expectedCount] of expectedTabKeyCounts) {
      const tab = tablist.getByRole("tab", { name: tabName, exact: true });
      await tab.click();
      await expect(tab).toHaveAttribute("aria-selected", "true");

      const panel = keyboard.getByRole("tabpanel");
      const rows = panel.locator("[data-math-keyboard-row]");
      const keys = panel.locator('button[data-math-key="true"]');
      await expect(keys).toHaveCount(expectedCount);
      await expect(rows).toHaveCount(tabName === "αβγ" ? 4 : 5);

      const tabGeometry = await panel.evaluate((element) => {
        const rows = Array.from(element.querySelectorAll<HTMLElement>("[data-math-keyboard-row]"));
        const keys = Array.from(element.querySelectorAll<HTMLElement>('button[data-math-key="true"]'));
        return {
          keys: keys.map((key) => {
            const rect = key.getBoundingClientRect();
            const paintedContent = key.querySelector<HTMLElement>(":scope > span");
            const paintedRect = paintedContent?.getBoundingClientRect();
            const mainLabel = paintedContent?.firstElementChild as HTMLElement | null;
            const subLabel = paintedContent?.children[1] as HTMLElement | undefined;
            return {
              clientHeight: key.clientHeight,
              clientWidth: key.clientWidth,
              contentBottom: paintedRect?.bottom ?? Number.NaN,
              contentLeft: paintedRect?.left ?? Number.NaN,
              contentRight: paintedRect?.right ?? Number.NaN,
              contentTop: paintedRect?.top ?? Number.NaN,
              height: rect.height,
              label: key.getAttribute("aria-label") ?? "",
              left: rect.left,
              mainLabelFontSize: mainLabel ? Number.parseFloat(getComputedStyle(mainLabel).fontSize) : Number.NaN,
              right: rect.right,
              scrollHeight: key.scrollHeight,
              scrollWidth: key.scrollWidth,
              size: key.getAttribute("data-math-key-size"),
              subLabelFontSize: subLabel ? Number.parseFloat(getComputedStyle(subLabel).fontSize) : null,
              top: rect.top,
              bottom: rect.bottom,
              width: rect.width
            };
          }),
          rows: rows.map((row) => {
            const keyTops = Array.from(row.querySelectorAll<HTMLElement>('button[data-math-key="true"]'))
              .map((key) => key.getBoundingClientRect().top);
            return {
              clientWidth: row.clientWidth,
              keyTopDelta: keyTops.length
                ? Math.max(...keyTops) - Math.min(...keyTops)
                : Number.POSITIVE_INFINITY,
              overscrollBehaviorX: getComputedStyle(row).overscrollBehaviorX,
              overflowX: getComputedStyle(row).overflowX,
              scrollbarWidth: getComputedStyle(row).scrollbarWidth,
              scrollWidth: row.scrollWidth
            };
          })
        };
      });
      for (const key of tabGeometry.keys) {
        expect(key.width, `${key.label} must keep a 44px touch width`).toBeGreaterThanOrEqual(44);
        expect(key.height, `${key.label} must keep a 44px touch height`).toBeGreaterThanOrEqual(44);
        expect(key.height, `${key.label} must not regain the old 64px height`).toBeLessThanOrEqual(48);
        expect(key.scrollWidth, `${key.label} must not clip its formula horizontally`).toBeLessThanOrEqual(key.clientWidth + 1);
        expect(key.scrollHeight, `${key.label} must not clip its formula vertically`).toBeLessThanOrEqual(key.clientHeight + 1);
        expect(key.contentLeft, `${key.label} painted content must remain inside the button`).toBeGreaterThanOrEqual(key.left - 1);
        expect(key.contentRight, `${key.label} painted content must remain inside the button`).toBeLessThanOrEqual(key.right + 1);
        expect(key.contentTop, `${key.label} painted content must remain inside the button`).toBeGreaterThanOrEqual(key.top - 1);
        expect(key.contentBottom, `${key.label} painted content must remain inside the button`).toBeLessThanOrEqual(key.bottom + 1);
        expect(key.mainLabelFontSize, `${key.label} main label must remain readable`).toBeGreaterThanOrEqual(14);
        if (key.subLabelFontSize !== null) {
          expect(key.subLabelFontSize, `${key.label} sub-label must remain readable`).toBeGreaterThanOrEqual(10);
        }
        const widthLimit = key.size === "extra-wide" ? 192 : key.size === "wide" ? 128 : 96;
        expect(key.width, `${key.label} must respect its ${key.size ?? "regular"} width budget`).toBeLessThanOrEqual(widthLimit);
      }
      for (const row of tabGeometry.rows) {
        expect(row.keyTopDelta, "A logical keyboard row must not wrap into extra vertical rows").toBeLessThanOrEqual(1);
        expect(["auto", "scroll"]).toContain(row.overflowX);
        expect(row.overscrollBehaviorX).toBe("contain");
        expect(row.scrollbarWidth).toBe("thin");
        expect(row.scrollWidth).toBeGreaterThanOrEqual(row.clientWidth);
      }
    }

    const numbersTab = tablist.getByRole("tab", { name: "123", exact: true });
    await numbersTab.click();
    const numberPanel = keyboard.getByRole("tabpanel");
    const numberRows = numberPanel.locator("[data-math-keyboard-row]");
    const overflowingRowIndex = await numberRows.evaluateAll((rows) =>
      rows.findIndex((row) => row.scrollWidth > row.clientWidth + 1)
    );
    expect(overflowingRowIndex, "At least one real number row must overflow inside the compact panel").toBeGreaterThanOrEqual(0);
    const overflowingRow = numberRows.nth(overflowingRowIndex);
    await alignLessonControlInItsScrollRoot(overflowingRow);
    await expect(overflowingRow).toBeVisible();

    const rowScrollBeforeWheel = await numberRows.evaluateAll((rows) =>
      rows.map((row) => row.scrollLeft)
    );
    const wheelIsolationBefore = {
      documentX: await page.evaluate(() => window.scrollX),
      leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
      rightScrollTop: await rightPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    await wheelHorizontalScrollRoot(page, overflowingRow);
    await expect.poll(() => overflowingRow.evaluate((row) => row.scrollLeft)).toBeGreaterThan(
      rowScrollBeforeWheel[overflowingRowIndex]! + 1
    );
    const rowScrollAfterWheel = await numberRows.evaluateAll((rows) =>
      rows.map((row) => row.scrollLeft)
    );
    for (let rowIndex = 0; rowIndex < rowScrollBeforeWheel.length; rowIndex += 1) {
      if (rowIndex === overflowingRowIndex) continue;
      expect(Math.abs(rowScrollAfterWheel[rowIndex]! - rowScrollBeforeWheel[rowIndex]!)).toBeLessThanOrEqual(1);
    }
    expect(await page.evaluate(() => window.scrollX)).toBe(wheelIsolationBefore.documentX);
    expect(Math.abs(
      await leftPane.evaluate((element: HTMLElement) => element.scrollTop)
        - wheelIsolationBefore.leftScrollTop
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(
      await rightPane.evaluate((element: HTMLElement) => element.scrollTop)
        - wheelIsolationBefore.rightScrollTop
    )).toBeLessThanOrEqual(1);
    expect(Math.abs(
      await page.evaluate(() => window.scrollY) - wheelIsolationBefore.windowY
    )).toBeLessThanOrEqual(1);

    const numberKeys = numberPanel.locator('button[data-math-key="true"]');
    const overflowingRowKeys = overflowingRow.locator('button[data-math-key="true"]');
    const overflowingRowKeyCount = await overflowingRowKeys.count();
    const enabledKeysBeforeOverflowingRow = await overflowingRow.evaluate((row) => {
      const panel = row.closest<HTMLElement>('[role="tabpanel"]');
      const firstRowKey = row.querySelector('button[data-math-key="true"]');
      if (!panel || !firstRowKey) return -1;
      const keys = Array.from(panel.querySelectorAll<HTMLButtonElement>('button[data-math-key="true"]'));
      const firstRowKeyIndex = keys.indexOf(firstRowKey as HTMLButtonElement);
      if (firstRowKeyIndex < 0) return -1;
      return keys.slice(0, firstRowKeyIndex).filter((key) => !key.disabled).length;
    });
    expect(enabledKeysBeforeOverflowingRow).toBeGreaterThanOrEqual(0);
    expect(overflowingRowKeyCount).toBeGreaterThan(1);
    await numbersTab.click();
    await numbersTab.focus();
    await expect(numbersTab).toBeFocused();
    const remainingTabs = tablist.getByRole("tab");
    const enabledEditingControls = editingControls.locator("button:not([disabled])");
    const enabledKeysInPanel = numberPanel.locator('button[data-math-key="true"]:not([disabled])');
    const firstOverflowingKey = overflowingRowKeys.first();
    const lastOverflowingKey = overflowingRowKeys.last();
    const focusRowScrollBaseline = await numberRows.evaluateAll((rows) => rows.map((row) => row.scrollLeft));
    const focusIsolationBaseline = {
      documentX: await page.evaluate(() => window.scrollX),
      leftScrollTop: await leftPane.evaluate((element: HTMLElement) => element.scrollTop),
      rightScrollTop: await rightPane.evaluate((element: HTMLElement) => element.scrollTop),
      windowY: await page.evaluate(() => window.scrollY)
    };
    const expectFocusStayedInsideTargetRow = async () => {
      const currentRowScroll = await numberRows.evaluateAll((rows) => rows.map((row) => row.scrollLeft));
      for (let rowIndex = 0; rowIndex < focusRowScrollBaseline.length; rowIndex += 1) {
        if (rowIndex === overflowingRowIndex) continue;
        expect(
          Math.abs(currentRowScroll[rowIndex]! - focusRowScrollBaseline[rowIndex]!),
          `Focusing an overflow key must not scroll logical row ${rowIndex + 1}`
        ).toBeLessThanOrEqual(1);
      }
      expect(await page.evaluate(() => window.scrollX)).toBe(focusIsolationBaseline.documentX);
      expect(Math.abs(
        await leftPane.evaluate((element: HTMLElement) => element.scrollTop)
          - focusIsolationBaseline.leftScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await rightPane.evaluate((element: HTMLElement) => element.scrollTop)
          - focusIsolationBaseline.rightScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await page.evaluate(() => window.scrollY) - focusIsolationBaseline.windowY
      )).toBeLessThanOrEqual(1);
    };

    for (let tabIndex = 1; tabIndex < 4; tabIndex += 1) {
      await page.keyboard.press("Tab");
      await expect(remainingTabs.nth(tabIndex)).toBeFocused();
    }
    const enabledEditingControlCount = await enabledEditingControls.count();
    for (let controlIndex = 0; controlIndex < enabledEditingControlCount; controlIndex += 1) {
      await page.keyboard.press("Tab");
      await expect(enabledEditingControls.nth(controlIndex)).toBeFocused();
    }
    for (let keyIndex = 0; keyIndex < enabledKeysBeforeOverflowingRow; keyIndex += 1) {
      await page.keyboard.press("Tab");
      await expect(enabledKeysInPanel.nth(keyIndex)).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(firstOverflowingKey).toBeFocused();
    for (let step = 1; step < overflowingRowKeyCount; step += 1) {
      await page.keyboard.press("Tab");
    }
    await expect(lastOverflowingKey).toBeFocused();
    await expect.poll(() => lastOverflowingKey.evaluate((key) => {
      const row = key.closest<HTMLElement>("[data-math-keyboard-row]");
      if (!row) return false;
      const keyRect = key.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return keyRect.left >= rowRect.left + 1 && keyRect.right <= rowRect.right - 1;
    })).toBe(true);
    const focusedLastGeometry = await lastOverflowingKey.evaluate((key) => {
      const row = key.closest<HTMLElement>("[data-math-keyboard-row]");
      if (!row) throw new Error("The focused key must stay inside its logical row.");
      const keyRect = key.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return {
        boxShadow: getComputedStyle(key).boxShadow,
        keyLeft: keyRect.left,
        keyRight: keyRect.right,
        rowLeft: rowRect.left,
        rowRight: rowRect.right
      };
    });
    expect(focusedLastGeometry.keyLeft).toBeGreaterThanOrEqual(focusedLastGeometry.rowLeft + 1);
    expect(focusedLastGeometry.keyRight).toBeLessThanOrEqual(focusedLastGeometry.rowRight - 1);
    expect(focusedLastGeometry.boxShadow).toContain("inset");
    await expectFocusStayedInsideTargetRow();
    for (let step = 1; step < overflowingRowKeyCount; step += 1) {
      await page.keyboard.press("Shift+Tab");
    }
    await expect(firstOverflowingKey).toBeFocused();
    await expect.poll(() => firstOverflowingKey.evaluate((key) => {
      const row = key.closest<HTMLElement>("[data-math-keyboard-row]");
      if (!row) return false;
      const keyRect = key.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return keyRect.left >= rowRect.left + 1 && keyRect.right <= rowRect.right - 1;
    })).toBe(true);
    const focusedFirstGeometry = await firstOverflowingKey.evaluate((key) => {
      const row = key.closest<HTMLElement>("[data-math-keyboard-row]");
      if (!row) throw new Error("The focused key must stay inside its logical row.");
      const keyRect = key.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      return {
        boxShadow: getComputedStyle(key).boxShadow,
        keyLeft: keyRect.left,
        keyRight: keyRect.right,
        rowLeft: rowRect.left,
        rowRight: rowRect.right
      };
    });
    expect(focusedFirstGeometry.keyLeft).toBeGreaterThanOrEqual(focusedFirstGeometry.rowLeft + 1);
    expect(focusedFirstGeometry.keyRight).toBeLessThanOrEqual(focusedFirstGeometry.rowRight - 1);
    expect(focusedFirstGeometry.boxShadow).toContain("inset");
    await expectFocusStayedInsideTargetRow();
    await expect(numberKeys).toHaveCount(47);

    const symbolsTab = tablist.getByRole("tab", { name: "∞≠∈", exact: true });
    await symbolsTab.click();
    const limitKey = keyboard.getByRole("tabpanel").getByRole("button", {
      name: "Insert limit to infinity",
      exact: true
    });
    await limitKey.scrollIntoViewIfNeeded();
    await expect(limitKey).toBeVisible();
    await limitKey.click();
    await expect(answer).toHaveValue("lim(x->infinity)");
    await expect(answer).toBeFocused();

    await answer.fill("");
    await numbersTab.click();
    const pressNumberKey = async (name: string) => {
      const key = keyboard.getByRole("tabpanel").getByRole("button", { name, exact: true });
      await key.scrollIntoViewIfNeeded();
      await key.click();
    };
    for (const keyName of [
      "Insert 3",
      "Insert plus sign",
      "Insert 2",
      "Insert plus sign",
      "Insert 4",
      "Calculate or insert equals sign"
    ]) {
      await pressNumberKey(keyName);
    }
    await expect(answer).toHaveValue("3+2+4=9");
    await editingControls.getByRole("button", { name: /Undo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4");
    await editingControls.getByRole("button", { name: /Redo soft keyboard input/i }).click();
    await expect(answer).toHaveValue("3+2+4=9");
    await expect(answer).toBeFocused();
    await expect.poll(() => answer.evaluate((input: HTMLInputElement | HTMLTextAreaElement) => ({
      end: input.selectionEnd,
      length: input.value.length,
      start: input.selectionStart
    }))).toEqual({ end: 7, length: 7, start: 7 });

    const keyboardBounds = await keyboard.evaluate((element) => {
      const keyboardRect = element.getBoundingClientRect();
      const card = element.closest<HTMLElement>('[data-ai-selectable="practice-question"]');
      const cardRect = card?.getBoundingClientRect();
      return {
        cardLeft: cardRect?.left ?? Number.NaN,
        cardRight: cardRect?.right ?? Number.NaN,
        clientWidth: element.clientWidth,
        height: keyboardRect.height,
        left: keyboardRect.left,
        right: keyboardRect.right,
        scrollWidth: element.scrollWidth,
        width: keyboardRect.width
      };
    });
    expect(keyboardBounds.width).toBeLessThanOrEqual(609);
    expect(keyboardBounds.height).toBeLessThanOrEqual(isMobile ? 410 : 390);
    expect(keyboardBounds.scrollWidth).toBeLessThanOrEqual(keyboardBounds.clientWidth + 1);
    expect(keyboardBounds.left).toBeGreaterThanOrEqual(keyboardBounds.cardLeft - 1);
    expect(keyboardBounds.right).toBeLessThanOrEqual(keyboardBounds.cardRight + 1);
    expect(await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    )).toBe(false);

    if (desktopScrollBaseline) {
      expect(Math.abs(
        await leftPane.evaluate((element: HTMLElement) => element.scrollTop)
          - desktopScrollBaseline.leftScrollTop
      )).toBeLessThanOrEqual(1);
      expect(Math.abs(
        await page.evaluate(() => window.scrollY) - desktopScrollBaseline.windowY
      )).toBeLessThanOrEqual(1);
    }
    await expect(currentUnit).toHaveAttribute("href", gradeTwoFluencyArraysTopicPath);
    await expect(currentUnit).toHaveAttribute("aria-label", currentLabel!);
    expect(new URL(page.url()).pathname).toBe(gradeTwoFluencyArraysTopicPath);
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

  test("Grade 1 Compose Shapes keeps the complete triangle painted inside its SVG before and after Join", async ({ page }, testInfo) => {
    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await openLessonPage(page, gradeOneShapeReasoningTopicPath);

    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    if (testInfo.project.use.isMobile) {
      await world.getByRole("button", { name: /open the full map/i }).click();
    }

    const composeJump = world.locator("ol:visible").getByRole("button", {
      name: "4.2 Composing New Shapes 🏠",
      exact: true
    });
    await expect(composeJump).toBeVisible();
    await composeJump.click();

    const composeLesson = rightPane.locator('[data-ccss-lesson="compose-2d"]');
    await expect(composeLesson).toHaveAttribute("data-ccss-diagram-hydrated", "true", { timeout: 30_000 });
    await expectLessonTargetVisible(composeLesson);
    const rootSelector = '[data-ccss-lesson="compose-2d"]';
    await waitForDiagramLayoutStable(page, {
      minimumCandidateSurfaceCount: 2,
      rootSelector,
      stableSampleCount: 3,
      timeoutMs: 10_000
    });

    const figureStage = composeLesson.locator("[data-figure-stage]");
    const separatedSvg = composeLesson.getByRole("img", { name: "a square and a triangle", exact: true });
    await expect(figureStage).not.toHaveAttribute("data-figure-overflowing", "true");
    await expect(separatedSvg).toBeVisible();
    const separatedRoof = await composeRoofPaintSnapshot(composeLesson);
    expect(separatedRoof.vertexCount).toBe(3);
    expect(separatedRoof.topClearance).toBeGreaterThanOrEqual(0.5);
    expect(separatedRoof.leftClearance).toBeGreaterThan(0);
    expect(separatedRoof.rightClearance).toBeGreaterThan(0);
    expect(separatedRoof.bottomClearance).toBeGreaterThan(0);
    expect(separatedRoof.roofToSquareGap).toBeGreaterThan(16);

    const separatedAudit = await auditMathDiagramPage(page, { rootSelector });
    expect(separatedAudit.coverage.diagramSvgCount).toBe(1);
    expect(separatedAudit.coverage.checkedGraphicElementCount).toBe(2);
    expect(separatedAudit.issues).toEqual([]);

    const join = composeLesson.getByRole("button", { name: "Join them →", exact: true });
    await expect(join).toBeVisible();
    await join.click();
    await expect(composeLesson.getByRole("img", { name: "a house", exact: true })).toBeVisible();
    const takeApart = composeLesson.getByRole("button", { name: "← Take apart", exact: true });
    await expect(takeApart).toBeVisible();
    await expect.poll(async () => {
      const roof = await composeRoofPaintSnapshot(composeLesson);
      return {
        joinedAtSquare: Math.abs(roof.roofToSquareGap) <= 1,
        reachedJoinedTop: roof.topClearance > separatedRoof.topClearance + 16
      };
    }, { timeout: 5_000 }).toEqual({ joinedAtSquare: true, reachedJoinedTop: true });

    const joinedRoof = await composeRoofPaintSnapshot(composeLesson);
    expect(joinedRoof.vertexCount).toBe(3);
    expect(joinedRoof.topClearance).toBeGreaterThan(separatedRoof.topClearance + 16);
    expect(joinedRoof.leftClearance).toBeGreaterThan(0);
    expect(joinedRoof.rightClearance).toBeGreaterThan(0);
    expect(joinedRoof.bottomClearance).toBeGreaterThan(0);
    expect(Math.abs(joinedRoof.roofToSquareGap)).toBeLessThanOrEqual(1);

    const joinedAudit = await auditMathDiagramPage(page, { rootSelector });
    expect(joinedAudit.coverage.diagramSvgCount).toBe(1);
    expect(joinedAudit.coverage.checkedGraphicElementCount).toBe(2);
    expect(joinedAudit.issues).toEqual([]);

    await takeApart.click();
    await expect(composeLesson.getByRole("img", { name: "a square and a triangle", exact: true })).toBeVisible();
    await expect(join).toBeVisible();
    await expect.poll(async () => {
      const roof = await composeRoofPaintSnapshot(composeLesson);
      return {
        returnedToSeparatedGap: roof.roofToSquareGap > 16,
        returnedToSeparatedTop: Math.abs(roof.topClearance - separatedRoof.topClearance) <= 0.25
      };
    }, { timeout: 5_000 }).toEqual({ returnedToSeparatedGap: true, returnedToSeparatedTop: true });

    const separatedAgainRoof = await composeRoofPaintSnapshot(composeLesson);
    expect(separatedAgainRoof.vertexCount).toBe(3);
    expect(Math.abs(separatedAgainRoof.topClearance - separatedRoof.topClearance)).toBeLessThanOrEqual(0.25);
    expect(Math.abs(separatedAgainRoof.roofToSquareGap - separatedRoof.roofToSquareGap)).toBeLessThanOrEqual(0.25);
    expect(separatedAgainRoof.leftClearance).toBeGreaterThan(0);
    expect(separatedAgainRoof.rightClearance).toBeGreaterThan(0);
    expect(separatedAgainRoof.bottomClearance).toBeGreaterThan(0);
    await expect(figureStage).not.toHaveAttribute("data-figure-overflowing", "true");
    const separatedAgainAudit = await auditMathDiagramPage(page, { rootSelector });
    expect(separatedAgainAudit.coverage.diagramSvgCount).toBe(1);
    expect(separatedAgainAudit.coverage.checkedGraphicElementCount).toBe(2);
    expect(separatedAgainAudit.issues).toEqual([]);
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
    const firstCard = visibleQuestionCard();
    const firstAnswer = firstCard.getByRole("button", {
      name: formatPracticeOptionDisplayText(firstQuestion.answer),
      exact: true
    });
    const firstCheckAnswer = firstCard.getByRole("button", { name: /^(Check Answer|檢查答案|检查答案)$/i });
    await expect(firstAnswer).toBeVisible();
    await expect(firstAnswer).toBeEnabled();
    await firstAnswer.click();
    await expect(firstCheckAnswer).toBeVisible();
    await expect(firstCheckAnswer).toBeEnabled();

    // pauseAt rejects a target that becomes past during the RPC. At this point
    // no answer has scheduled the 3000ms timer, so this headroom cannot consume
    // any part of the auto-advance boundary asserted below.
    const pauseTarget = await page.evaluate(() => Date.now() + 1_000);
    await page.clock.pauseAt(pauseTarget);
    expect(await page.evaluate(() => Date.now())).toBe(pauseTarget);
    await expect(visibleQuestionCard()).toHaveAttribute("data-ai-question-id", firstQuestion.id);
    await expect(firstStone).toHaveAttribute("aria-current", "step");
    await expect(firstCheckAnswer).toBeVisible();
    await expect(firstCheckAnswer).toBeEnabled();
    const firstAttempt = page.waitForResponse((response) => {
      const postData = response.request().postData() ?? "";
      return response.url().includes("/api/attempts")
        && response.request().method() === "POST"
        && postData.includes(`"questionId":"${firstQuestion.id}"`);
    });
    // The intentionally paused clock also freezes actionability's rAF stability
    // probes. Force is limited to controls already proven visible and enabled.
    await firstCheckAnswer.click({ force: true });
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
    const secondAnswer = secondCard.getByRole("button", {
      name: formatPracticeOptionDisplayText(secondQuestion.answer),
      exact: true
    });
    const secondCheckAnswer = secondCard.getByRole("button", { name: /^(Check Answer|檢查答案|检查答案)$/i });
    await expect(secondAnswer).toBeVisible();
    await expect(secondAnswer).toBeEnabled();
    await secondAnswer.click({ force: true });
    await expect(secondCheckAnswer).toBeVisible();
    await expect(secondCheckAnswer).toBeEnabled();
    const secondAttempt = page.waitForResponse((response) => {
      const postData = response.request().postData() ?? "";
      return response.url().includes("/api/attempts")
        && response.request().method() === "POST"
        && postData.includes(`"questionId":"${secondQuestion.id}"`);
    });
    await secondCheckAnswer.click({ force: true });
    const secondResponse = await secondAttempt;
    expect(secondResponse.ok()).toBe(true);
    expect((await secondResponse.json() as { correct?: boolean }).correct).toBe(true);
    await expect(secondCard.getByText(/^(Correct\b|正確|正确)/i).first()).toBeVisible();

    const fourthStone = missionTrail.getByRole("button", { name: /Go to question 4/i });
    await expect(fourthStone).toBeVisible();
    await expect(fourthStone).toBeEnabled();
    await fourthStone.click({ force: true });
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

  test("Shape Reasoning score summary keeps its close control below the navbar and normally clickable", async ({ page }, testInfo) => {
    const isMobile = Boolean(testInfo.project.use.isMobile);
    if (!isMobile) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    const errors = collectPageErrors(page);
    await keepLessonWorldMenuOpen(page);
    await registerCaliforniaStudent(page, testInfo, "zh-Hans");
    await openLessonPage(page, gradeOneShapeReasoningTopicPath);

    const lessonUrl = page.url();
    const world = page.locator('[data-lesson-world="sprout-meadow"]');
    const rightPane = page.locator("[data-lesson-content-pane]:visible");
    const practice = rightPane.locator("#lesson-practice");
    await expect(world).toBeVisible({ timeout: 30_000 });
    await expect(rightPane).toBeVisible({ timeout: 30_000 });
    if (isMobile) {
      await world.getByRole("button", { name: /open the full map|展開完整地圖|展开完整地图/i }).click();
    }

    const practiceJump = world.locator("ol:visible").getByRole("button", {
      name: /^4\.5 (Practice check|練習檢查|练习检查)$/,
      exact: true
    });
    await alignLessonControlInItsScrollRoot(practiceJump);
    await expect(practiceJump).toBeVisible();
    await practiceJump.click();
    await expectLessonTargetVisible(practice);

    const bodyOverflowBeforeSummary = await page.evaluate(() => document.body.style.overflow);
    const questionCards = practice.locator('[data-ai-selectable="practice-question"]');
    const visibleQuestionCard = () => practice.locator('[data-ai-selectable="practice-question"]:not([hidden])');
    const questionIds = await questionCards.evaluateAll((cards) => cards.map(
      (card) => card.getAttribute("data-ai-question-id")
    ));
    expect(questionIds).toHaveLength(5);
    expect(questionIds.every(Boolean)).toBe(true);

    const missionTrail = practice.locator('[data-testid="lesson-mission-trail"]');
    for (let questionIndex = 0; questionIndex < questionIds.length; questionIndex += 1) {
      const question = sourceQuestionForRenderedId(questionIds[questionIndex]);
      expect(question.topicId).toBe("us-ca-math-p1-1-g-shape-reasoning");
      expect(question.type).toBe("multiple-choice");
      const card = visibleQuestionCard();
      await expect(card).toHaveCount(1);
      await expect(card).toHaveAttribute("data-ai-question-id", question.id);

      const correctOption = card.getByRole("button", {
        name: simplifiedChineseCorrectOptionDisplayText(question),
        exact: true
      });
      await expect(correctOption).toBeVisible();
      await expect(correctOption).toBeEnabled();
      await correctOption.click();

      const checkAnswer = card.getByRole("button", { name: /^(Check Answer|檢查答案|检查答案)$/i });
      await expect(checkAnswer).toBeVisible();
      await expect(checkAnswer).toBeEnabled();
      const attemptResponsePromise = page.waitForResponse((response) => {
        const postData = response.request().postData() ?? "";
        return response.request().method() === "POST"
          && new URL(response.url()).pathname === "/api/attempts"
          && postData.includes(`"questionId":"${question.id}"`);
      });
      await checkAnswer.click();
      const attemptResponse = await attemptResponsePromise;
      expect(attemptResponse.ok()).toBe(true);
      expect((await attemptResponse.json() as { correct?: boolean }).correct).toBe(true);
      await expect(card.getByText(/^(Correct\b|正確|正确)/i).first()).toBeVisible();

      if (questionIndex < questionIds.length - 1) {
        const nextQuestionNumber = questionIndex + 2;
        const nextStone = missionTrail.getByRole("button", {
          name: new RegExp(`^(Go to question ${nextQuestionNumber}|跳到第 ${nextQuestionNumber} 題|跳到第 ${nextQuestionNumber} 题)$`)
        });
        await expect(nextStone).toBeVisible();
        await expect(nextStone).toBeEnabled();
        await nextStone.click();
        await expect(visibleQuestionCard()).toHaveAttribute(
          "data-ai-question-id",
          questionIds[questionIndex + 1]!
        );
      }
    }

    const summaryTitle = "5/5 全部正确，前往练习场继续";
    const summaryDialog = page.getByRole("dialog", { name: summaryTitle, exact: true });
    const closeSummary = summaryDialog.getByRole("button", {
      name: /^(Close lesson summary|關閉課節摘要|关闭课时摘要)$/
    });
    await expect(summaryDialog).toBeVisible({ timeout: 15_000 });
    await expect(closeSummary).toBeVisible();
    await expect(closeSummary).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");

    await expect.poll(async () => {
      const snapshot = await lessonSummaryHitTestSnapshot(closeSummary);
      return snapshot.buttonCenterHit
        && snapshot.buttonTopCenterHit
        && snapshot.navbarCenterOwnedByOverlay
        && snapshot.portalParentIsBody;
    }).toBe(true);
    const initialGeometry = await lessonSummaryHitTestSnapshot(closeSummary);
    expect(initialGeometry.button.width).toBeGreaterThanOrEqual(44);
    expect(initialGeometry.button.height).toBeGreaterThanOrEqual(44);
    expect(initialGeometry.button.top).toBeGreaterThanOrEqual(initialGeometry.navbarBottom + 8);
    expect(initialGeometry.button.left).toBeGreaterThanOrEqual(initialGeometry.viewport.left - 1);
    expect(initialGeometry.button.right).toBeLessThanOrEqual(initialGeometry.viewport.right + 1);
    expect(initialGeometry.button.top).toBeGreaterThanOrEqual(initialGeometry.viewport.top - 1);
    expect(initialGeometry.button.bottom).toBeLessThanOrEqual(initialGeometry.viewport.bottom + 1);
    expect(initialGeometry.dialog.left).toBeGreaterThanOrEqual(initialGeometry.viewport.left - 1);
    expect(initialGeometry.dialog.right).toBeLessThanOrEqual(initialGeometry.viewport.right + 1);
    expect(initialGeometry.dialog.top).toBeGreaterThanOrEqual(initialGeometry.viewport.top - 1);
    expect(initialGeometry.dialog.bottom).toBeLessThanOrEqual(initialGeometry.viewport.bottom + 1);

    await page.keyboard.press("Escape");
    await expect(summaryDialog).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(bodyOverflowBeforeSummary);

    const reopenSummary = page.getByRole("button", { name: /^(View next step|查看下一步)$/ });
    await alignLessonControlInItsScrollRoot(reopenSummary);
    await expect(reopenSummary).toBeVisible();
    await reopenSummary.focus();
    await expect(reopenSummary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(summaryDialog).toBeVisible();
    await expect(closeSummary).toBeFocused();
    await page.keyboard.press("Space");
    await expect(summaryDialog).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(bodyOverflowBeforeSummary);

    await alignLessonControlInItsScrollRoot(reopenSummary);
    await expect(reopenSummary).toBeVisible();
    await reopenSummary.click();
    await expect(summaryDialog).toBeVisible();
    await expect(closeSummary).toBeFocused();
    const clickGeometry = await lessonSummaryHitTestSnapshot(closeSummary);
    expect(clickGeometry.buttonCenterHit).toBe(true);
    expect(clickGeometry.buttonTopCenterHit).toBe(true);
    await closeSummary.click();
    await expect(summaryDialog).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe(bodyOverflowBeforeSummary);

    expect(await page.evaluate(() => {
      const navbar = document.querySelector<HTMLElement>("body header");
      if (!navbar) return false;
      const rect = navbar.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit !== null && (hit === navbar || navbar.contains(hit));
    })).toBe(true);
    expect(page.url()).toBe(lessonUrl);
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

    const avatarCursor = world.locator('ol:visible [data-lesson-current-avatar-cursor="true"]');
    await expect(avatarCursor).toHaveCount(1);
    await expect(avatarCursor).toBeVisible();
    const avatarAnimation = await avatarCursor.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return { name: style.animationName, duration: style.animationDuration };
    });
    const avatarAnimationDisabled =
      avatarAnimation.name === "none" || parseFloat(avatarAnimation.duration) <= 0.01;
    expect(
      avatarAnimationDisabled,
      `expected no avatar cursor animation under reduced motion, got ${JSON.stringify(avatarAnimation)}`
    ).toBeTruthy();
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
