import { expect, test, type Page } from "@playwright/test";

const californiaLessonSlug = "us-ca-math-k-k-cc-count-sequence";
const lessonRoute = `/student/lessons/${californiaLessonSlug}`;

type LessonApiBody = {
  access?: string;
  lesson?: {
    blocks?: Array<{
      type?: string;
      visualizationConfig?: {
        moduleId?: string;
        topicId?: string;
      };
    }>;
    slug?: string;
    topic?: {
      curriculumTrack?: string;
    };
    topicId?: string;
  };
};

type ScrollTraceWindow = Window & {
  __nonHkLessonScrollTrace?: string[];
  __restoreNonHkLessonScrollTrace?: () => void;
};

async function loginAsCaliforniaKindergartenStudent(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade: "K",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light",
    },
  });

  expect(response.ok(), await response.text()).toBe(true);
}

test.describe.configure({ mode: "serial", retries: 0 });

test("US Visualization Lab Next Item goes directly to practice without HK extension or checklist routing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await loginAsCaliforniaKindergartenStudent(page);

  const lessonResponse = await page.request.get(
    `/api/lessons/${encodeURIComponent(californiaLessonSlug)}`,
  );
  expect(lessonResponse.ok(), await lessonResponse.text()).toBe(true);
  const body = (await lessonResponse.json()) as LessonApiBody;
  const lesson = body.lesson;
  expect(body.access).toBe("full");
  expect(lesson?.slug).toBe(californiaLessonSlug);
  expect(lesson?.topicId).toBe(californiaLessonSlug);
  expect(lesson?.topic?.curriculumTrack).toBe("US_CA_MATH");

  const blocks = lesson?.blocks ?? [];
  const blockTypes = blocks.map((block) => block.type);
  expect(blockTypes).toContain("visualization");
  expect(blockTypes).toContain("checklist");
  expect(blockTypes).toContain("practice");
  expect(blockTypes).toContain("extension");
  expect(blockTypes.indexOf("practice")).toBeLessThan(
    blockTypes.indexOf("extension"),
  );

  const visualizationBlock = blocks.find(
    (block) => block.type === "visualization",
  );
  expect(visualizationBlock?.visualizationConfig?.moduleId).toBeTruthy();
  expect(visualizationBlock?.visualizationConfig?.topicId).toBe(
    californiaLessonSlug,
  );

  await page.goto(lessonRoute);
  await expect(page).toHaveURL(new RegExp(`${californiaLessonSlug}$`));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Counting and Cardinality: Count Sequence/i,
    }),
  ).toBeVisible();

  const main = page.getByRole("main");
  const visualization = main.locator("#visualization");
  const practice = main.locator("#lesson-practice");
  const checklist = main.locator("#lesson-checklist");
  const renderedExtensions = main.locator(
    '[data-lesson-block-type="extension"]',
  );

  await visualization.scrollIntoViewIfNeeded();
  await expect(visualization).toBeVisible();
  await expect(practice).toHaveCount(1);
  await expect(checklist).toHaveCount(1);
  await expect(renderedExtensions).toHaveCount(0);

  const nextItemButton = visualization.locator(
    '[data-lesson-next-item-button="true"]',
  );
  await expect(nextItemButton).toHaveCount(1);
  await expect(nextItemButton).toHaveAccessibleName("Go to next item");
  await expect(nextItemButton).toBeVisible();

  await page.evaluate(() => {
    const instrumentedWindow = window as ScrollTraceWindow;
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const trace: string[] = [];

    instrumentedWindow.__nonHkLessonScrollTrace = trace;
    instrumentedWindow.__restoreNonHkLessonScrollTrace = () => {
      Element.prototype.scrollIntoView = originalScrollIntoView;
      delete instrumentedWindow.__restoreNonHkLessonScrollTrace;
    };
    Element.prototype.scrollIntoView = function scrollIntoViewWithNonHkTrace(
      options?: boolean | ScrollIntoViewOptions,
    ) {
      const element = this as HTMLElement;
      trace.push(
        element.id ||
          element.getAttribute("data-lesson-block-type") ||
          element.tagName.toLowerCase(),
      );
      originalScrollIntoView.call(this, options);
    };
  });

  await nextItemButton.click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (window as ScrollTraceWindow).__nonHkLessonScrollTrace?.length ?? 0,
        ),
      {
        message:
          "The rendered Next Item control must issue a browser scroll target.",
        timeout: 2_000,
      },
    )
    .toBeGreaterThan(0);

  const scrollTrace = await page.evaluate(
    () => (window as ScrollTraceWindow).__nonHkLessonScrollTrace ?? null,
  );
  expect(
    scrollTrace,
    "The browser instrumentation must remain fail-closed and readable.",
  ).not.toBeNull();
  expect(scrollTrace).toEqual(["lesson-practice"]);

  await expect(practice).toBeInViewport();
  const geometry = await page.evaluate(() => {
    const practiceElement = document.getElementById("lesson-practice");
    const checklistElement = document.getElementById("lesson-checklist");
    if (!practiceElement || !checklistElement) return null;

    const practiceRect = practiceElement.getBoundingClientRect();
    const checklistRect = checklistElement.getBoundingClientRect();
    return {
      checklistTop: checklistRect.top,
      practiceTop: practiceRect.top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(
    geometry,
    "Both checklist and practice geometry must be measurable after navigation.",
  ).not.toBeNull();
  expect(geometry!.practiceTop).toBeGreaterThanOrEqual(0);
  expect(geometry!.practiceTop).toBeLessThan(
    Math.min(200, geometry!.viewportHeight / 3),
  );
  expect(Math.abs(geometry!.practiceTop)).toBeLessThan(
    Math.abs(geometry!.checklistTop),
  );
  expect(page.url()).toMatch(new RegExp(`${californiaLessonSlug}$`));

  await page.evaluate(() => {
    const instrumentedWindow = window as ScrollTraceWindow;
    instrumentedWindow.__restoreNonHkLessonScrollTrace?.();
    delete instrumentedWindow.__nonHkLessonScrollTrace;
  });
});
