import { expect, test } from "@playwright/test";

const cjkPattern = /[\u3400-\u9fff\uf900-\ufaff]/u;

test("California middle school replacement textbook student page uses English-only visible copy", async ({ page }) => {
  await page.goto("/student/lessons/california-middle-school-textbook");

  await expect(page.getByRole("heading", { name: "Replacement Grade 6-8 Lessons", level: 1 })).toBeVisible();
  const main = page.locator("main").nth(1);

  await expect(main).toContainText("Grade 6 Ratios and Proportional Relationships: Ratios");
  await expect(main).toContainText("Function A has rate 3");
  await expect(main).not.toContainText("Replacement lessons are in QA");
  await expect(main).not.toContainText(/S18|S05 review|before live integration|QA/i);
  await expect(main.locator('img[src*="/lesson-illustrations/us-ca-middle-school/candidates/"]')).toHaveCount(15);
  await expect(main.locator('img[src*="/lesson-illustrations/us-ca-middle-school/exact-layer-renders/"]')).toHaveCount(0);

  await expect.poll(async () => await main.innerText()).not.toMatch(cjkPattern);
});

test("California practice beta status panel stays English-only for US curriculum users", async ({ page }) => {
  const response = await page.request.post("/api/auth/login", {
    data: {
      username: "Student Shirleen",
      password: "12345",
      grade: "S3",
      curriculumTrack: "US_CA_MATH",
      curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
      language: "zh",
      theme: "light"
    }
  });

  expect(response.ok(), await response.text()).toBeTruthy();

  await page.goto("/practice");

  const panel = page.getByLabel("California Math Practice Beta status");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Active filter");
  await expect.poll(async () => await panel.innerText()).not.toMatch(cjkPattern);
});
