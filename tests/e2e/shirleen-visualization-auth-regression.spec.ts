import { expect, test, type Page } from "@playwright/test";
import {
  buildVisualizationLabHref,
  buildVisualizationSessionModuleId,
  visualizationLabSectionSelector
} from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

type ApiResponseLog = {
  method: string;
  pathname: string;
  status: number;
  timestamp: number;
};

const shirleenAccount = {
  username: "Student Shirleen",
  password: "12345"
} as const;

const californiaGradeOneLab =
  visualizationLabCatalog.find((lab) =>
    lab.grade === "P1" &&
    lab.curriculumTrack === "US" &&
    lab.publisher === "US_CA_MATH"
  ) ?? visualizationLabCatalog[0];

async function loginAsShirleenCaliforniaStudent(page: Page) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: shirleenAccount.username,
      password: shirleenAccount.password,
      grade: "P1",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "en",
      theme: "light"
    }
  });

  expect(response.ok(), await response.text()).toBeTruthy();
}

async function expectShirleenSession(page: Page) {
  const response = await page.request.get("/api/me");
  expect(response.status(), "Shirleen session should remain authenticated").toBe(200);
  const payload = await response.json() as { user?: { id?: string; username?: string; curriculumTrack?: string } };
  expect(payload.user?.id).toBe("student-shirleen-us");
  expect(payload.user?.username).toBe(shirleenAccount.username);
  expect(payload.user?.curriculumTrack).toBe("US_CA_MATH");
}

test.describe("Shirleen California Visualization Lab auth regression", () => {
  test.describe.configure({ timeout: 150_000 });

  test("Shirleen stays signed in after saving a California Visualization Lab and the analytics flush", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const apiResponses: ApiResponseLog[] = [];

    page.on("response", (response) => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith("/api/")) return;

      apiResponses.push({
        method: response.request().method(),
        pathname: url.pathname,
        status: response.status(),
        timestamp: Date.now()
      });
    });

    await loginAsShirleenCaliforniaStudent(page);
    await page.goto(buildVisualizationLabHref(californiaGradeOneLab), { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("link", { name: /Student Shirleen/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator(`[data-viz-active-lab-id=${JSON.stringify(californiaGradeOneLab.labId)}]`)).toBeVisible();

    const labCard = page.locator(visualizationLabSectionSelector(californiaGradeOneLab));
    await expect(labCard).toBeVisible();

    const expectedSessionId = buildVisualizationSessionModuleId(californiaGradeOneLab);
    const exploredResponse = page.waitForResponse((response) =>
      response.url().includes("/api/visualization-sessions") &&
      response.request().method() === "POST"
    );
    await labCard.getByRole("button", { name: /Mark explored/i }).click();
    const exploredResult = await exploredResponse;
    expect(exploredResult.ok()).toBeTruthy();
    const exploredPayload = await exploredResult.json() as { session?: { moduleId?: string; module_id?: string } };
    expect(exploredPayload.session?.moduleId ?? exploredPayload.session?.module_id).toBe(expectedSessionId);
    await expect(labCard.getByRole("button", { name: /^Saved$/i })).toBeVisible();

    await expectShirleenSession(page);

    const longUseStartedAt = Date.now();
    await page.waitForTimeout(65_000);

    await expect(page.getByRole("link", { name: /Student Shirleen/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Saved$/i })).toBeVisible();
    await expectShirleenSession(page);

    const rejectedAuthenticatedApiResponses = apiResponses.filter((entry) =>
      (entry.status === 401 || entry.status === 403) &&
      entry.timestamp >= longUseStartedAt
    );
    expect(rejectedAuthenticatedApiResponses).toEqual([]);
    expect(apiResponses.some((entry) =>
      entry.pathname === "/api/learning-events" &&
      entry.method === "POST" &&
      entry.status === 200 &&
      entry.timestamp >= longUseStartedAt
    )).toBe(true);

    expectNoPageErrors(pageErrors);
  });
});
