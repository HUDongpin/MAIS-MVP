import { expect, test } from "@playwright/test";
import { loginAsDemoStudentApi } from "./helpers";

const titles = [
  ["en", "Trigonometry Basics — Advanced Preview"],
  ["zh", "三角學基礎 — 進階預覽"],
  ["zh-Hans", "三角学基础 — 进阶预览"]
] as const;

for (const [language, title] of titles) {
  test(`student direct trigonometry page visibly identifies advanced preview in ${language}`, async ({ page }) => {
    await loginAsDemoStudentApi(page);
    const sessionResponse = await page.request.get("/api/me");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json();
    expect(session.user?.role).toBe("student");
    const response = await page.request.patch("/api/me/settings", {
      headers: { "X-MAIS-Expected-User-Id": session.user.id },
      data: { expectedUserId: session.user.id, language, selectedGrade: "S3" }
    });
    expect(response.ok()).toBeTruthy();
    expect((await response.json()).settings.language).toBe(language);
    await page.goto("/student/tools/visualizations/trigonometry-basics");
    const workspace = page.locator('[data-viz-requested-lab-id="trigonometry-basics"]');
    await expect(workspace).toBeVisible();
    await expect(workspace.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(workspace).toHaveAttribute("data-viz-current-grade", "S3");
  });
}
