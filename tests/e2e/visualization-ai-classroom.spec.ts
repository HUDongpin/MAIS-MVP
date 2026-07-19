import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { gradeLabGroups, visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, fixturePath, loginAsDemoStudent } from "./helpers";

const allVisualizationLabs = visualizationLabCatalog.map((lab) => ({
  grade: lab.grade,
  labId: lab.labId,
  title: lab.title.en,
  gradeLabel: lab.gradeLabel.en,
  moduleId: lab.moduleId
}));
const labTitleCounts = allVisualizationLabs.reduce<Record<string, number>>((counts, lab) => {
  counts[lab.title] = (counts[lab.title] ?? 0) + 1;
  return counts;
}, {});
const expectedModuleIds = new Set(allVisualizationLabs.map((lab) => lab.moduleId));
const tutorDraftStorageKey = "mais-ai-tutor-draft-v1";

async function fulfillTutorApiFailure(route: Route) {
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "No live provider in this UI test." })
  });
}

async function routeTutorFailure(page: Page) {
  await page.route("**/api/ai-tutor/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        configured: false,
        mode: "local-helper",
        model: "deepseek-v4-pro",
        provider: "deepseek"
      })
    });
  });
  await page.route("**/api/ai-tutor", fulfillTutorApiFailure);
}

async function askTutor(panel: Locator, input: string, expected: RegExp | string) {
  await panel.getByLabel(/Ask Nova Tutor|詢問 Nova 導師/i).fill(input);
  await panel.getByRole("button", { name: /^Send$|^送出$/i }).click();
  await expect(panel.getByText(expected)).toBeVisible({ timeout: 10000 });
}

async function openVisualizationLab(page: Page, labId: string) {
  const labCard = page.locator(`#lab-example-${labId}`);
  await expect(labCard).toBeVisible();
  await labCard.scrollIntoViewIfNeeded();
  if ((await labCard.locator("[data-viz-surface]").count()) === 0) {
    await labCard.getByRole("button", { name: /Open lab|開啟實驗|开启实验/i }).click();
  }
  await expect(labCard.locator("[data-viz-surface]").first()).toBeVisible();
}

test.describe("visualization lab, Nova Tutor, and live classroom", () => {
  test("floating Nova Tutor opens globally, preserves drafts, and shows sending states", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    let tutorRequestCount = 0;

    await page.route("**/api/ai-tutor", async (route) => {
      tutorRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 350));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Mocked UI tutor reply." })
      });
    });

    await loginAsDemoStudent(page);
    await page.goto("/practice");
    const launcher = page.getByRole("button", { name: /^Nova Tutor$/i });
    await launcher.click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });

    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel.getByText("Professor Nova", { exact: true })).toBeVisible();
    await expect(tutorPanel.getByText(/HK Student Peter · S3 · \/practice/)).toBeVisible();
    await expect(tutorPanel.getByRole("button", { name: /^Send$/i })).toBeDisabled();

    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Please keep this draft.");
    await tutorPanel.getByRole("button", { name: /Close Nova Tutor/i }).click();
    await expect(tutorPanel).toBeHidden();

    await launcher.click({ force: true });
    await expect(tutorPanel.getByLabel(/Ask Nova Tutor/i)).toHaveValue("Please keep this draft.");

    await page.goto("/dashboard");
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel.getByLabel(/Ask Nova Tutor/i)).toHaveValue("Please keep this draft.");

    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Give me one hint about factorising.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByRole("button", { name: /^Sending/i })).toBeDisabled();
    await expect(tutorPanel.getByText(/^Thinking/i)).toBeVisible();
    await expect(tutorPanel.getByText("Mocked UI tutor reply.", { exact: true })).toBeVisible({ timeout: 10000 });
    expect(tutorRequestCount).toBe(1);

    expectNoPageErrors(pageErrors);
  });

  test("local helper mode gives Socratic, concept, and support guidance", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await routeTutorFailure(page);
    await loginAsDemoStudent(page);
    await page.goto("/practice");
    await page.getByRole("button", { name: /^Nova Tutor$/i }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel.getByText("Local helper mode", { exact: true })).toBeVisible();

    await askTutor(tutorPanel, "I am stuck and confused.", /feeling stuck usually means/i);
    await askTutor(tutorPanel, "Explain why a quadratic graph turns.", /teacher version/i);
    await askTutor(tutorPanel, "What is the answer?", /Socratic route/i);

    expectNoPageErrors(pageErrors);
  });

  test("Chinese local helper flow stays localized", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await routeTutorFailure(page);
    await loginAsDemoStudent(page);
    await page.getByRole("button", { name: "使用繁體中文" }).click();
    await expect(page.getByRole("button", { name: "Use English" })).toBeVisible();
    await page.goto("/practice");
    const chineseToggle = page.getByRole("button", { name: "使用繁體中文" });
    if (await chineseToggle.isVisible().catch(() => false)) {
      await chineseToggle.click();
      await expect(page.getByRole("button", { name: "Use English" })).toBeVisible();
    }
    await page.getByRole("button", { name: /^Nova 導師$/ }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova 導師/ });

    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel.getByText("Nova 導師", { exact: true })).toBeVisible();
    await expect(tutorPanel.locator("#ai-tutor-input")).toHaveAttribute("placeholder", /輸入提示/);

    await tutorPanel.getByLabel(/詢問 Nova 導師/).fill("我好難，唔識點開始。");
    await tutorPanel.getByRole("button", { name: /^送出$/ }).click();

    await expect(tutorPanel.getByText("本機輔助模式", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(tutorPanel.getByText(/這裡先提供本機提示/)).toBeVisible();
    await expect(tutorPanel.getByText(/Local helper mode|Here is a local fallback hint/i)).toHaveCount(0);

    expectNoPageErrors(pageErrors);
  });

  test("Nova Tutor attachments cap at six, submit multipart data, and clear after a reply", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    let contentType = "";
    let multipartBody = "";
    const filePayloads = Array.from({ length: 7 }, (_, index) => ({
      name: `note-${index + 1}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from(`Tutor note ${index + 1}`, "utf8")
    }));

    await page.route("**/api/ai-tutor", async (route) => {
      contentType = route.request().headers()["content-type"] ?? "";
      multipartBody = route.request().postData() ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Files received." })
      });
    });

    await loginAsDemoStudent(page);
    await page.goto("/practice");
    await page.getByRole("button", { name: /^Nova Tutor$/i }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await tutorPanel.getByRole("button", { name: /Add photos and files/i }).click({ force: true });
    await page.locator("#ai-tutor-attachments").setInputFiles(filePayloads);

    await expect(tutorPanel.getByText("note-1.txt")).toBeVisible();
    await expect(tutorPanel.getByText("note-6.txt")).toBeVisible();
    await expect(tutorPanel.getByText("note-7.txt")).toHaveCount(0);

    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Please read these files.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByText("Files received.", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(tutorPanel.getByText(/note-[1-6]\.txt/)).toHaveCount(0);
    expect(contentType).toContain("multipart/form-data");
    expect(multipartBody).toContain("note-1.txt");
    expect(multipartBody).toContain("note-6.txt");
    expect(multipartBody).not.toContain("note-7.txt");

    expectNoPageErrors(pageErrors);
  });

  test("question context hides stored correct answers before sending to the tutor API", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    let capturedPayload: {
      context?: { mode?: string; details?: string };
    } = {};

    await page.route("**/api/ai-tutor", async (route) => {
      capturedPayload = JSON.parse(route.request().postData() ?? "{}") as typeof capturedPayload;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ reply: "Safe context received." })
      });
    });

    await loginAsDemoStudent(page);
    await page.evaluate((key) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          updatedAt: Date.now(),
          open: true,
          context: {
            mode: "question",
            title: "Hidden answer check",
            details: "Student attempt: 24. Correct answer: 42. Wrong attempts: 1."
          },
          input: "",
          messages: [{ id: "stored-opening", role: "tutor", content: "Stored opening message." }]
        })
      );
    }, tutorDraftStorageKey);
    await page.goto("/practice");

    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Help without revealing the answer.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByText("Safe context received.", { exact: true })).toBeVisible({ timeout: 10000 });

    expect(capturedPayload.context?.mode).toBe("question");
    expect(capturedPayload.context?.details).toContain("Student attempt: 24");
    expect(capturedPayload.context?.details).not.toContain("Correct answer");
    expect(capturedPayload.context?.details).not.toContain("42");

    expectNoPageErrors(pageErrors);
  });

  test("mistake-book tutor launch uses mistake context and records Nova Tutor analytics", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const learningEvents: Array<{ type?: string; source?: string; topicId?: string }> = [];

    await page.route("**/api/learning-events", async (route) => {
      if (route.request().method() === "POST") {
        const body = JSON.parse(route.request().postData() ?? "{}") as {
          events?: Array<{ type?: string; source?: string; topicId?: string }>;
        };
        learningEvents.push(...(body.events ?? []));
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ accepted: learningEvents.length })
      });
    });

    await loginAsDemoStudent(page);
    await page.request.post("/api/attempts", {
      data: { questionId: "q1", selectedAnswer: "wrong answer", durationSeconds: 12 }
    });
    await page.goto("/mistake-book");
    await page.getByRole("button", { name: /^Ask Nova Tutor$/i }).first().click();

    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await expect(tutorPanel.getByText(/mistake-book item/i)).toBeVisible();
    await expect.poll(() =>
      learningEvents.some((event) =>
        event.type === "hint-request" &&
        event.source === "ai-tutor" &&
        event.topicId === "mistake"
      )
    ).toBeTruthy();

    expectNoPageErrors(pageErrors);
  });

  test("visualization directory exposes every grade module and core interactive controls", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await routeTutorFailure(page);
    await loginAsDemoStudent(page);
    await page.goto("/student/tools/visualizations");
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /HK Student Peter's S3 visualizations/i })).toBeVisible();

    await page.getByRole("button", { name: /Explore all labs|Explore my curriculum|Explore other grades/i }).click();
    await expect(page.getByRole("heading", { name: /HK Student Peter is exploring P1-S6 visualizations/i })).toBeVisible();
    await expect(page.locator('[id^="lab-example-"]')).toHaveCount(allVisualizationLabs.length);
    for (const group of gradeLabGroups) {
      await expect(page.getByRole("heading", { name: new RegExp(`^${group.grade} ·`) })).toBeVisible();
    }
    for (const moduleTitle of Object.keys(labTitleCounts)) {
      await expect(page.getByText(moduleTitle, { exact: true }).first()).toBeVisible();
    }
    for (const lab of allVisualizationLabs) {
      await expect(page.getByText(lab.gradeLabel, { exact: true }).first()).toBeVisible();
    }
    expect(expectedModuleIds).toEqual(new Set([
      "coordinate-plane-demo",
      "function-graph-explorer",
      "geometry-explorer",
      "probability-simulator",
      "function-model-comparer",
      "trig-wave-explorer",
      "calculus-stats-lab",
      "configured-visualization-lab"
    ]));

    await openVisualizationLab(page, "coordinates");
    await page.getByRole("button", { name: /Add point/i }).first().click();
    await page.getByRole("button", { name: /Translate \(\+2, \+1\)/i }).first().click();
    await page.getByRole("button", { name: /Reset plane/i }).first().click();
    await openVisualizationLab(page, "angles");
    await page.getByRole("button", { name: /Reset triangle/i }).first().click();
    await openVisualizationLab(page, "probability-s2");
    await page.getByRole("button", { name: /Roll 20/i }).first().click();
    await expect(page.getByText(/Total rolls/i).first()).toBeVisible();
    await openVisualizationLab(page, "functions");
    await page.getByRole("button", { name: /Exponential/i }).first().click();
    await openVisualizationLab(page, "quadratic-patterns");
    await page.getByLabel(/a: stretch \/ flip/i).first().fill("1.5");
    await openVisualizationLab(page, "trigonometry-s5");
    await page.locator("label").filter({ hasText: /^Amplitude/ }).locator("input").first().fill("3");
    await openVisualizationLab(page, "statistics-s6");
    await page.getByRole("button", { name: /^Normal$/i }).first().click();
    await page.locator("label").filter({ hasText: /^Observed value/ }).locator("input").first().fill("70");

    // Exploration is earned: the interactions above plus a short on-screen
    // dwell complete the engagement gate. Wait for the card to report the
    // saved state, then confirm the system persisted an explored session.
    await expect(page.locator('[data-viz-card][data-viz-save-state="saved"]')).toBeVisible({ timeout: 15_000 });
    const sessionsResponse = await page.request.get("/api/visualization-sessions");
    expect(sessionsResponse.ok()).toBeTruthy();
    const sessionsPayload = await sessionsResponse.json() as { sessions?: Array<{ explored?: boolean }> };
    expect(sessionsPayload.sessions?.some((session) => session.explored)).toBeTruthy();

    await page.getByRole("button", { name: "使用繁體中文" }).click();
    await expect(page.getByRole("heading", { name: /視覺化實驗室/ })).toBeVisible();
    await page.getByRole("button", { name: "Use English" }).click();
    await expect(page.getByRole("heading", { name: /Visualization Lab/i })).toBeVisible();

    await page.getByRole("button", { name: /^Nova Tutor$/i }).first().click();
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByLabel(/Ask Nova Tutor/i).fill("Give me one hint about this visualization.");
    await tutorPanel.getByRole("button", { name: /^Send$/i }).click();
    await expect(tutorPanel.getByText("Local helper mode", { exact: true })).toBeVisible();
    await tutorPanel.getByRole("button", { name: /Close Nova Tutor/i }).click();
    await expect(tutorPanel).toBeHidden();

    expectNoPageErrors(pageErrors);
  });

  test("floating Nova Tutor attachments and classroom student response flow work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudent(page);
    await page.goto("/practice");
    await page.getByRole("button", { name: /^Nova Tutor$/i }).click({ force: true });
    const tutorPanel = page.getByRole("dialog", { name: /Nova Tutor/i });
    await expect(tutorPanel).toBeVisible();
    await tutorPanel.getByRole("button", { name: /Add photos and files/i }).click({ force: true });
    await page.locator("#ai-tutor-attachments").setInputFiles(fixturePath("sample-resource.pdf"));
    await expect(tutorPanel.getByText("sample-resource.pdf")).toBeVisible();
    await tutorPanel.getByRole("button", { name: /Remove sample-resource\.pdf/i }).click();
    await expect(tutorPanel.getByText("sample-resource.pdf")).toHaveCount(0);
    await tutorPanel.getByRole("button", { name: /Close Nova Tutor/i }).click({ force: true });

    await page.goto("/classroom?code=S3A82");
    await expect(page.getByRole("heading", { name: /Join live classroom/i })).toBeVisible();
    await page.getByRole("button", { name: /^Join$/i }).click();
    await expect(page.getByRole("button", { name: /^A ·/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /^A ·/i }).first().click();
    const submitButton = page.getByRole("button", { name: /Submit answer|Submitted/i });
    if (await submitButton.isEnabled()) {
      await submitButton.click();
      await expect(page.getByText(/Submitted\./i)).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /Submitted/i })).toBeDisabled();

    expectNoPageErrors(pageErrors);
  });
});
