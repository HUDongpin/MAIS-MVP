import { expect, test, type Page } from "@playwright/test";
import { loginAsDemoStudent, loginAsTeacher, logoutIfVisible } from "./helpers";

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentOverflow = document.documentElement.scrollWidth - viewportWidth;
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (style.position === "absolute" || style.position === "fixed") return false;
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.left < -4 || rect.right > viewportWidth + 4;
      })
      .slice(0, 5)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          viewportWidth
        };
      });

    return { documentOverflow, offenders };
  });

  expect(overflow.documentOverflow, `${label} document should not scroll horizontally`).toBeLessThanOrEqual(4);
  expect(overflow.offenders, `${label} should not have obvious overflowing elements`).toEqual([]);
}

test.describe("console UI and UX regression guards", () => {
  test("student console keeps responsive layout, bilingual label, disabled state, and keyboard focus usable", async ({ page }) => {
    await loginAsDemoStudent(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: /使用繁體中文/i })).toHaveText("繁");
    await expectNoHorizontalOverflow(page, "student dashboard");

    await page.getByRole("button", { name: /使用繁體中文/i }).click();
    await expect(page.getByRole("button", { name: /Use English/i })).toBeVisible();
    await page.getByRole("button", { name: /Use English/i }).click();
    await expect(page.getByRole("button", { name: /使用繁體中文/i })).toHaveText("繁");

    await page.goto("/student/assessments/assessment-s3-algebra-quiz");
    await expect(page.getByRole("button", { name: /Submit assessment/i })).toBeDisabled();
    await expectNoHorizontalOverflow(page, "student assessment");

    await logoutIfVisible(page);
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const activeElementTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(["a", "button", "input"]).toContain(activeElementTag);
  });

  test("teacher console exposes export affordances and high-risk form labels without layout overflow", async ({ page }, testInfo) => {
    test.fail(testInfo.project.name === "mobile-chrome", "Known mobile overflow on teacher reports is tracked as UX-D3 in the console QA matrix.");

    await loginAsTeacher(page);
    await page.goto("/teacher/reports");
    await expect(page.getByRole("link", { name: /Export PDF/i })).toHaveAttribute("href", /\/api\/teacher\/reports\/pdf/);
    await expect(page.getByRole("link", { name: /Export CSV/i })).toHaveAttribute("href", /\/api\/teacher\/reports\/export/);
    await expectNoHorizontalOverflow(page, "teacher reports");

    await page.goto("/teacher/assignments/new");
    await expect(page.getByLabel(/Content type/i)).toBeVisible();
    await expect(page.getByLabel(/Target ID/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Selected students/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, "teacher assignment form");
  });
});
