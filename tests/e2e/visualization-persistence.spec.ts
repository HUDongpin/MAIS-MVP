import { expect, test, type Page } from "@playwright/test";
import {
  buildVisualizationLabHref,
  buildVisualizationSessionModuleId,
  visualizationLabSectionSelector
} from "../../components/visualizations/visualizationDiagnostics";
import { visualizationLabCatalog } from "../../data/visualizationLabs";
import { collectPageErrors, expectNoPageErrors, uniqueSuffix } from "./helpers";

const persistenceLab =
  visualizationLabCatalog.find((lab) => lab.grade === "S3" && lab.curriculumTrack === "HK") ??
  visualizationLabCatalog[0];

test.describe("Visualization Lab explored persistence", () => {
  test.describe.configure({ timeout: 90_000 });

  test("Mark explored persists after reload and relogin on desktop and mobile", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo);
    const student = {
      username: `viz-persist-${suffix}@example.test`,
      password: "start12345"
    };
    const registerResponse = await page.request.post("/api/auth/register", {
      data: {
        name: `Visualization Persistence ${suffix}`,
        username: student.username,
        password: student.password,
        grade: "S3",
        curriculumTrack: "HK",
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en",
        theme: "dark"
      }
    });
    expect(registerResponse.ok()).toBeTruthy();

    await page.goto(buildVisualizationLabHref(persistenceLab));
    await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
    await expect(page.locator(`[data-viz-active-lab-id=${JSON.stringify(persistenceLab.labId)}]`)).toBeVisible();

    const labCard = page.locator(visualizationLabSectionSelector(persistenceLab));
    await expect(labCard).toBeVisible();
    const labElementId = await labCard.evaluate((element) => element.id);
    const expectedSessionId = buildVisualizationSessionModuleId(persistenceLab);

    const exploredResponse = page.waitForResponse((response) =>
      response.url().includes("/api/visualization-sessions") && response.request().method() === "POST"
    );
    await labCard.getByRole("button", { name: /Mark explored/i }).click();
    const exploredResult = await exploredResponse;
    expect(exploredResult.ok()).toBeTruthy();
    const exploredPayload = await exploredResult.json() as { session?: { moduleId?: string; module_id?: string } };
    const targetSessionId = exploredPayload.session?.moduleId ?? exploredPayload.session?.module_id ?? "";
    expect(targetSessionId).toBe(expectedSessionId);
    await expect(labCard.getByRole("button", { name: /^Saved$/i })).toBeVisible();
    await expectExploredSession(page, targetSessionId);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
    await expect(labCardById(page, labElementId).getByRole("button", { name: /^Saved$/i })).toBeVisible({ timeout: 15_000 });

    await page.request.post("/api/auth/logout");
    await loginStudentWithSameCurriculum(page, student.username, student.password);
    await expectExploredSession(page, targetSessionId);
    await page.goto(buildVisualizationLabHref(persistenceLab));
    await expect(page.locator('[data-viz-panel-mode="lab"]')).toBeVisible();
    await expect(labCardById(page, labElementId).getByRole("button", { name: /^Saved$/i })).toBeVisible({ timeout: 15_000 });

    expectNoPageErrors(pageErrors);
  });
});

function labCardById(page: Page, labElementId: string) {
  return page.locator(`[id=${JSON.stringify(labElementId)}]`);
}

async function loginStudentWithSameCurriculum(page: Page, username: string, password: string) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username,
      password,
      grade: "S3",
      curriculumTrack: "HK",
      curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
      language: "en",
      theme: "dark"
    }
  });
  expect(response.ok()).toBeTruthy();
}

async function expectExploredSession(page: Page, moduleId: string) {
  const response = await page.request.get("/api/visualization-sessions");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json() as { sessions?: Array<{ explored?: boolean; moduleId?: string }> };
  expect(payload.sessions).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        explored: true,
        moduleId
      })
    ])
  );
}
