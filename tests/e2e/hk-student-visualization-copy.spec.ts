import { expect, test, type Page } from "@playwright/test";
import { loginAsDemoStudentApi } from "./helpers";

async function setStudentLanguage(page: Page, language: "zh" | "zh-Hans", selectedGrade: string) {
  await loginAsDemoStudentApi(page);
  const sessionResponse = await page.request.get("/api/me");
  expect(sessionResponse.ok()).toBeTruthy();
  const session = await sessionResponse.json();
  expect(session.user?.role).toBe("student");
  const settingsResponse = await page.request.patch("/api/me/settings", {
    headers: { "X-MAIS-Expected-User-Id": session.user.id },
    data: { expectedUserId: session.user.id, language, selectedGrade }
  });
  expect(settingsResponse.ok()).toBeTruthy();
  expect((await settingsResponse.json()).settings.language).toBe(language);
}

const lessonCases = [
  { id: "angles", grade: "S1", title: "比較兩個角", detail: "以 15 度為一步設定兩個角" },
  { id: "coordinates", grade: "S2", title: "標示點並移動圖形", detail: "平移固定的三角形" },
  { id: "probability-s2", grade: "S2", title: "設定結果次數並讀出概率", detail: "當總次數至少為 1 時" },
  { id: "coordinate-geometry", grade: "S4", title: "比較圖形與其像", detail: "此面板不計算斜率" },
  { id: "statistics-s6", grade: "S6", title: "探索中心與離散程度", detail: "也不計算 z 分數" }
] as const;

for (const lessonCase of lessonCases) {
  test(`student lesson ${lessonCase.id} describes the actual visualization`, async ({ page }) => {
    await setStudentLanguage(page, "zh", lessonCase.grade);
    await page.goto(`/student/lessons/${lessonCase.id}`);
    const panel = page.locator("#visualization");
    await expect(panel).toBeVisible({ timeout: 45_000 });
    await expect(panel.getByText(lessonCase.title, { exact: true })).toBeVisible();
    await expect(panel.locator(":scope > div").first().locator("p").last()).toContainText(lessonCase.detail);
  });
}

for (const [labId, language, title] of [
  ["calculus", "zh", "微積分視覺化實驗"],
  ["calculus", "zh-Hans", "微积分可视化实验"],
  ["mixed-problem-solving", "zh", "函數族視覺化實驗"]
] as const) {
  test(`student direct ${labId} page renders its localized title in ${language}`, async ({ page }) => {
    await setStudentLanguage(page, language, "S6");
    await page.goto(`/student/tools/visualizations/${labId}`);
    const workspace = page.locator(`[data-viz-requested-lab-id="${labId}"]`);
    await expect(workspace).toBeVisible({ timeout: 45_000 });
    await expect(workspace.getByRole("heading", { name: title, exact: true })).toBeVisible();
  });
}
