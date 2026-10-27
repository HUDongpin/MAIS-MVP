import { expect, test, type Page } from "@playwright/test";
import { demoStudent, demoStudentUserId } from "./helpers";

async function authenticateCourseStudent(page: Page) {
  // Reset this owned fixture through the real login API; the last language test
  // persists zh-Hans, which must not leak into later independent test runs.
  const login = await page.request.post("/api/auth/login", {
    data: { ...demoStudent, language: "en", theme: "light" }
  });
  expect(login.ok(), await login.text()).toBeTruthy();
  const session = await page.request.get("/api/auth/session-state?includeLessonEntry=false");
  expect(session.ok()).toBeTruthy();
  expect((await session.json()).user?.id, "course UI checks require the authenticated student, not the guest roadmap").toBe(demoStudentUserId);
}

test("student roadmap displays the named course delivered by its roadmap API", async ({ page }) => {
  await authenticateCourseStudent(page);
  let injected = false;
  await page.route(/\/api\/roadmap(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = await response.json() as {
      roadmap?: { topics?: Array<{ courseId?: string; courseLabel?: { en: string; zh: string } }> };
    };
    const firstTopic = body.roadmap?.topics?.[0];
    if (firstTopic) {
      firstTopic.courseId = "e2e-reviewed-course";
      firstTopic.courseLabel = { en: "Reviewed course label", zh: "已審課程名稱" };
      injected = true;
    }
    await route.fulfill({ response, json: body });
  });

  await page.goto("/student/roadmap");
  await expect.poll(() => injected).toBe(true);
  await expect(page.getByText("Reviewed course label", { exact: true })).toBeVisible();
});

test("the subway map's selected topic route shows its named course", async ({ page }) => {
  await authenticateCourseStudent(page);
  let injected = false;
  let injectedTopicId: string | undefined;
  const longCourseLabel = "Reviewed integrated mathematics course — foundations and reasoning";
  await page.route(/\/api\/roadmap(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = await response.json() as {
      roadmap?: { topics?: Array<{ id: string; grade: string; courseId?: string; courseLabel?: { en: string; zh: string } }> };
    };
    const firstPrimaryTopic = body.roadmap?.topics?.find((topic) => topic.grade.startsWith("P"));
    if (firstPrimaryTopic) {
      firstPrimaryTopic.courseId = "e2e-reviewed-course";
      firstPrimaryTopic.courseLabel = { en: longCourseLabel, zh: "已審課程名稱" };
      injectedTopicId = firstPrimaryTopic.id;
      injected = true;
    }
    await route.fulfill({ response, json: body });
  });

  await page.goto("/student/roadmap/primary");
  await expect.poll(() => injected).toBe(true);
  await page.getByRole("button", { name: "Zoom in" }).click();
  const badge = page.locator("g[data-route-badge]").first();
  await expect(badge).toHaveAttribute("data-route-badge", injectedTopicId!);
  const bounds = await badge.evaluate((element) => {
    const rect = element.querySelector("rect")!.getBBox();
    const label = (element.querySelector("text[data-route-badge-text]") as SVGGraphicsElement).getBBox();
    return { left: rect.x, right: rect.x + rect.width, labelLeft: label.x, labelRight: label.x + label.width };
  });
  expect(bounds.labelLeft).toBeGreaterThanOrEqual(bounds.left + 6);
  expect(bounds.labelRight).toBeLessThanOrEqual(bounds.right - 6);
  await expect(badge.locator("text[data-route-badge-text]")).toContainText("…");
  const firstStation = page.locator('svg g[role="button"]').first();
  await firstStation.focus();
  await firstStation.press("Enter");
  await expect(page.getByText(new RegExp(longCourseLabel)).first()).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(`Close BUS ${longCourseLabel}`) }).first()).toBeVisible();
});

for (const language of ["en", "zh-Hans"] as const) {
  test(`California roadmap preserves English-only course labels (requested ${language})`, async ({ page }) => {
    const login = await page.request.post("/api/auth/login", {
      data: {
        username: "Student Shirleen", password: "12345", grade: "P1",
        curriculumTrack: "US_CA_MATH",
        curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
        language, theme: "light"
      }
    });
    expect(login.ok(), await login.text()).toBeTruthy();
    const labels = {
      en: "Reviewed integrated mathematics course — foundations and reasoning",
      zh: "已審綜合數學課程：基礎概念與數學推理",
      zhHans: "已审综合数学课程：基础概念与数学推理"
    };
    let injected = false;
    await page.route(/\/api\/roadmap(?:\?.*)?$/, async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      const firstTopic = body.roadmap?.topics?.[0];
      if (firstTopic) {
        expect(firstTopic.curriculumTrack).toBe("US_CA_MATH");
        firstTopic.courseId = "e2e-synthetic-course";
        firstTopic.courseLabel = labels;
        injected = true;
      }
      await route.fulfill({ response, json: body });
    });
    await page.goto("/student/roadmap");
    await expect.poll(() => injected).toBe(true);
    // The owner policy fixes US curricula to English even if login requested Chinese.
    await expect(page.getByRole("button", { name: "Language selector", exact: true })).toHaveText("English");
    await expect(page.getByText(labels.en, { exact: true })).toBeVisible();
    await expect(page.getByText(labels.zhHans, { exact: true })).toHaveCount(0);
  });
}

test("Hong Kong roadmap renders a long Simplified Chinese course label after language selection", async ({ page }) => {
  await authenticateCourseStudent(page);
  const label = "已审综合数学课程：基础概念与数学推理";
  let injected = false;
  await page.route(/\/api\/roadmap(?:\?.*)?$/, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const firstTopic = body.roadmap?.topics?.[0];
    const firstPrimaryTopic = body.roadmap?.topics?.find((topic: { grade: string }) => topic.grade.startsWith("P"));
    for (const topic of [firstTopic, firstPrimaryTopic]) {
      if (!topic) continue;
      expect(topic.curriculumTrack).toBe("HK");
      topic.courseId = "e2e-synthetic-hk-course";
      topic.courseLabel = {
        en: "Reviewed course label", zh: "已審綜合數學課程：基礎概念與數學推理", zhHans: label
      };
      injected = true;
    }
    await route.fulfill({ response, json: body });
  });
  await page.goto("/student/roadmap");
  await expect.poll(() => injected).toBe(true);
  await page.getByRole("button", { name: "Language selector", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Use Simplified Chinese", exact: true }).click();
  await expect(page.getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "语言选择", exact: true })).toHaveText("简体中文");
  // Wait for this page's roadmap response before zooming: the previous page's
  // injection flag must not race the map's initial fit-to-viewport effect.
  injected = false;
  await page.goto("/student/roadmap/primary");
  await expect.poll(() => injected).toBe(true);
  await page.getByRole("button", { name: "放大" }).click();
  const badge = page.locator("g[data-route-badge]").first();
  await expect(badge.locator("text[data-route-badge-text]")).toHaveAttribute("aria-label", new RegExp(label));
  const bounds = await badge.evaluate((element) => {
    const rect = element.querySelector("rect")!.getBBox();
    const text = (element.querySelector("text[data-route-badge-text]") as SVGGraphicsElement).getBBox();
    return { left: rect.x, right: rect.x + rect.width, labelLeft: text.x, labelRight: text.x + text.width };
  });
  expect(bounds.labelLeft).toBeGreaterThanOrEqual(bounds.left + 6);
  expect(bounds.labelRight).toBeLessThanOrEqual(bounds.right - 6);
});

test("a requested zoom survives a pending full-screen map fit", async ({ page }) => {
  await authenticateCourseStudent(page);
  await page.clock.install({ time: new Date("2026-10-27T08:00:00Z") });
  await page.goto("/student/roadmap/primary");
  await expect(page.getByRole("button", { name: "Open full-screen roadmap", exact: true })).toBeVisible();
  // Finish initial layout, then deterministically hold the full-screen fit timer.
  await page.clock.pauseAt(new Date("2026-10-27T09:00:00Z"));
  await page.getByRole("button", { name: "Open full-screen roadmap", exact: true }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const zoomLabel = page.getByText(/^(?:Overview|Detail) · \d+%$/);
  const requestedZoom = await zoomLabel.textContent();
  await page.clock.runFor(100);
  await expect(zoomLabel).toHaveText(requestedZoom!);
});
