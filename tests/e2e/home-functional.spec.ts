import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectPageErrors,
  expectNoPageErrors,
  loginAsDemoStudent,
  logoutIfVisible,
  openMobileMenuIfNeeded
} from "./helpers";

function header(page: Page) {
  return page.locator("header");
}

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

async function expectHomeLinkToRoute(page: Page, link: Locator, target: RegExp) {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /MAIS/i })).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(target);
}

async function expectStoredValue(page: Page, key: string, value: string) {
  await expect.poll(() => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), key)).toBe(value);
}

test.describe("homepage functional QA", () => {
  test("guest homepage buttons, cards, grade selector, footer, and AI Tutor shell work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /MAIS/i })).toBeVisible();
    await expect(header(page).getByRole("navigation", { name: /main navigation/i })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("button", { name: /^AI Tutor$/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, "guest homepage");

    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /^Start Learning$/i }), /\/login$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /^Explore Visualizations$/i }).first(), /\/visualization-lab$/);
    await expectHomeLinkToRoute(
      page,
      page.locator("section").filter({ hasText: /Ready for class or self-study/i }).getByRole("link", { name: /^Explore Visualizations$/i }),
      /\/visualization-lab$/
    );

    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Grades:\s*12/i }), /\/learning-path$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Visualization labs:\s*100/i }), /\/visualization-lab$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Practice questions:/i }), /\/practice$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /US\/China\/HK SAR Curriculum:\s*3/i }), /\/register$/);

    await page.goto("/");
    const primaryToggle = page.getByRole("button", { name: /^Primary/i });
    const secondaryToggle = page.getByRole("button", { name: /^Secondary/i });
    await expect(primaryToggle).toHaveAttribute("aria-expanded", "false");
    await primaryToggle.click();
    await expect(primaryToggle).toHaveAttribute("aria-expanded", "true");
    await primaryToggle.click();
    await expect(primaryToggle).toHaveAttribute("aria-expanded", "false");
    await secondaryToggle.click();
    await expect(secondaryToggle).toHaveAttribute("aria-expanded", "true");
    await secondaryToggle.click();
    await expect(secondaryToggle).toHaveAttribute("aria-expanded", "false");

    await primaryToggle.click();
    const p2Radio = page.getByRole("radio", { name: /\bP2\b/i }).first();
    await p2Radio.click();
    await expect(p2Radio).toHaveAttribute("aria-checked", "true");
    await expectStoredValue(page, "hk-math-grade", "P2");
    await page.reload();
    await page.getByRole("button", { name: /^Primary/i }).click();
    await expect(page.getByRole("radio", { name: /\bP2\b/i }).first()).toHaveAttribute("aria-checked", "true");

    const emailLink = page.getByRole("link", { name: /hudongpin@126\.com/i });
    await expect(emailLink).toHaveAttribute("href", "mailto:hudongpin@126.com");
    const websiteLink = page.getByRole("link", { name: /hudongpin\.com/i });
    await expect(websiteLink).toHaveAttribute("href", "https://hudongpin.com");
    await expect(websiteLink).toHaveAttribute("target", "_blank");
    await expect(websiteLink).toHaveAttribute("rel", "noreferrer");

    await page.getByRole("button", { name: /^AI Tutor$/i }).click();
    const tutorDialog = page.getByRole("dialog", { name: /^AI Tutor$/i });
    await expect(tutorDialog).toBeVisible();
    await expect(tutorDialog.getByText(/Professor Nova|AI Tutor/i).first()).toBeVisible();
    await tutorDialog.getByRole("button", { name: /^Close AI Tutor$/i }).click();
    await expect(tutorDialog).toBeHidden();

    expectNoPageErrors(pageErrors);
  });

  test("guest language and theme controls persist", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await page.getByRole("button", { name: /Use Traditional Chinese|使用繁體中文/i }).click();
    await expect(page.getByRole("link", { name: /^開始學習$/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hant-HK");
    await expectStoredValue(page, "hk-math-language", "zh");
    await page.reload();
    await expect(page.getByRole("link", { name: /^開始學習$/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hant-HK");

    await page.getByRole("button", { name: /使用簡體中文|使用简体中文/i }).click();
    await expect(page.getByRole("link", { name: /^开始学习$/ })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hans-CN");
    await expectStoredValue(page, "hk-math-language", "zh-Hans");

    await page.getByRole("button", { name: /Use English|使用英文/i }).click();
    await expect(page.getByRole("link", { name: /^Start Learning$/i })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("en-HK");
    await expectStoredValue(page, "hk-math-language", "en");

    await page.getByRole("button", { name: /^Switch to dark mode$/i }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    await expectStoredValue(page, "hk-math-theme", "dark");
    await page.getByRole("button", { name: /^Switch to light mode$/i }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
    await expectStoredValue(page, "hk-math-theme", "light");

    expectNoPageErrors(pageErrors);
  });

  test("desktop navigation links route correctly and expose active state", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Desktop navbar links are hidden behind the mobile menu on small screens.");
    const pageErrors = collectPageErrors(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(header(page).getByRole("navigation", { name: /main navigation/i })).toBeVisible();

    await header(page).getByRole("link", { name: /^Lesson$/i }).click();
    await expect(page).toHaveURL(/\/lesson(\/|$)/);

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Adaptive Learning$/i }).click();
    await expect(page).toHaveURL(/\/adaptive-learning$/);
    await expect(header(page).getByRole("link", { name: /^Adaptive Learning$/i })).toHaveAttribute("aria-current", "page");

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Visualization Lab$/i }).click();
    await expect(page).toHaveURL(/\/visualization-lab$/);
    await expect(header(page).getByRole("link", { name: /^Visualization Lab$/i })).toHaveAttribute("aria-current", "page");

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Practice Arena$/i }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(header(page).getByRole("link", { name: /^Practice Arena$/i })).toHaveAttribute("aria-current", "page");

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Log In$/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/practice");
    await header(page).locator('a[href="/"]').first().click();
    await expect(page).toHaveURL(/\/$/);

    expectNoPageErrors(pageErrors);
  });

  test("mobile menu opens, closes, routes, and avoids homepage overflow", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile menu coverage runs only in the mobile project.");
    const pageErrors = collectPageErrors(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page, "mobile homepage");

    const menuButton = page.getByRole("button", { name: /Open mobile menu|開啟手機選單/i });
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expectNoHorizontalOverflow(page, "mobile homepage with menu open");
    await menuButton.click();
    await expect(menuButton).toHaveAttribute("aria-expanded", "false");

    await menuButton.click();
    await page.getByRole("link", { name: /^Practice Arena$/i }).click();
    await expect(page).toHaveURL(/\/practice$/);
    await expect(page.getByRole("button", { name: /Open mobile menu|開啟手機選單/i })).toHaveAttribute("aria-expanded", "false");

    expectNoPageErrors(pageErrors);
  });

  test("student homepage account, back-to-top, and locked grade behavior work", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);

    if (testInfo.project.name === "desktop-chrome") {
      await page.setViewportSize({ width: 1440, height: 700 });
    }

    await loginAsDemoStudent(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Use English|使用英文/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: /MAIS/i })).toBeVisible();

    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /HK Student Peter/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/");
    await page.getByRole("button", { name: /^Secondary/i }).click();
    const selectedGrade = page.getByRole("radio", { name: /\bS3\b/i }).first();
    await expect(selectedGrade).toHaveAttribute("aria-checked", "true");
    await expect(selectedGrade).toBeDisabled();
    await page.getByRole("button", { name: /^Primary/i }).click();
    await expect(page.getByRole("radio", { name: /\bP2\b/i }).first()).toBeDisabled();

    await page.evaluate(() => {
      const scroller = document.scrollingElement ?? document.documentElement;
      window.scrollTo(0, scroller.scrollHeight);
      scroller.scrollTop = scroller.scrollHeight;
    });
    await expect.poll(() => page.evaluate(() => {
      const scroller = document.scrollingElement ?? document.documentElement;
      return window.scrollY || scroller.scrollTop;
    })).toBeGreaterThan(300);
    await page.getByRole("button", { name: /^Back to top$/i }).click();
    await expect.poll(() => page.evaluate(() => {
      const scroller = document.scrollingElement ?? document.documentElement;
      return window.scrollY || scroller.scrollTop;
    }), { timeout: 5000 }).toBeLessThan(80);

    await logoutIfVisible(page);
    expectNoPageErrors(pageErrors);
  });
});
