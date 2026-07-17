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

async function expectPedaNovaCardVisibleOnMobile(page: Page, width: 360 | 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/");

  const card = page.locator('aside[aria-label="PedaNova TRUST-MAIS adaptive engine status"]');
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();

  await expect(card.getByText(/^Global$/)).toBeVisible();
  await expect(card.getByText(/^school and district partnerships expanding$/)).toBeVisible();

  const visualState = await card.evaluate((cardElement) => {
    const card = cardElement as HTMLElement;
    const content = card.querySelector<HTMLElement>("[data-pedanova-card-content]");
    const paragraphElements = Array.from(card.querySelectorAll<HTMLElement>("p"));
    const globalLabel = paragraphElements.find((element) => element.textContent?.trim() === "Global");
    const globalDetail = paragraphElements.find((element) => element.textContent?.trim() === "school and district partnerships expanding");
    const beforeContent = getComputedStyle(card, "::before").content;
    const afterContent = getComputedStyle(card, "::after").content;
    const contentStyle = content ? getComputedStyle(content) : null;
    const contentZIndex = Number.parseInt(contentStyle?.zIndex ?? "0", 10);

    function topElementIsContent(element: HTMLElement | undefined) {
      if (!element || !content) return false;

      const rect = element.getBoundingClientRect();
      const x = Math.max(1, Math.min(window.innerWidth - 1, rect.left + rect.width / 2));
      const y = Math.max(1, Math.min(window.innerHeight - 1, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);

      return Boolean(hit && (hit === element || element.contains(hit) || hit === content || content.contains(hit)));
    }

    const cardRect = card.getBoundingClientRect();
    const blockingBottomLayers = Array.from(card.querySelectorAll<HTMLElement>("*"))
      .filter((element) => {
        if (element === content || content?.contains(element)) return false;

        const style = getComputedStyle(element);
        if (style.position !== "absolute") return false;

        const rect = element.getBoundingClientRect();
        const zIndex = Number.parseInt(style.zIndex, 10);
        const overlapsLowerCard = rect.bottom > cardRect.top + cardRect.height * 0.55 && rect.top < cardRect.bottom;
        const sitsAboveContent = Number.isFinite(zIndex) && Number.isFinite(contentZIndex) && zIndex >= contentZIndex;

        return overlapsLowerCard && (style.pointerEvents !== "none" || sitsAboveContent);
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);

        return {
          className: element.className,
          height: Math.round(rect.height),
          pointerEvents: style.pointerEvents,
          zIndex: style.zIndex
        };
      });

    return {
      afterContent,
      beforeContent,
      blockingBottomLayers,
      detailTopmost: topElementIsContent(globalDetail),
      globalTopmost: topElementIsContent(globalLabel)
    };
  });

  expect(visualState.beforeContent, `PedaNova card should not use ::before overlay at ${width}px`).toBe("none");
  expect(visualState.afterContent, `PedaNova card should not use ::after overlay at ${width}px`).toBe("none");
  expect(visualState.globalTopmost, `Global label should not be covered at ${width}px`).toBe(true);
  expect(visualState.detailTopmost, `Global detail should not be covered at ${width}px`).toBe(true);
  expect(visualState.blockingBottomLayers, `No bottom overlay should sit above PedaNova content at ${width}px`).toEqual([]);
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

async function chooseLanguage(page: Page, optionName: RegExp) {
  await page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i }).click();
  await page.getByRole("menuitemradio", { name: optionName }).click();
}

test.describe("homepage functional QA", () => {
  test("guest homepage buttons, cards, footer, and Nova Tutor shell work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /MAIS/i })).toBeVisible();
    await expect(header(page).getByRole("navigation", { name: /main navigation/i })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Nova Tutor$/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, "guest homepage");

    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Start Learning/i }).first(), /\/login$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Grades:\s*\d+/i }), /\/student\/roadmap$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Visualization labs:\s*\d+/i }), /\/student\/tools\/visualizations$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Practice questions:/i }), /\/practice$/);
    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /China\/HK SAR\/US Curriculum:\s*\d+/i }), /\/student\/roadmap$/);

    await page.goto("/");
    const emailLink = page.getByRole("link", { name: /hudongpin@126\.com/i });
    await expect(emailLink).toHaveAttribute("href", "mailto:hudongpin@126.com");
    const websiteLink = page.getByRole("link", { name: /hudongpin\.com/i });
    await expect(websiteLink).toHaveAttribute("href", "https://hudongpin.com");
    await expect(websiteLink).toHaveAttribute("target", "_blank");
    await expect(websiteLink).toHaveAttribute("rel", "noreferrer");

    await page.getByRole("button", { name: /^Nova Tutor$/i }).click();
    const tutorDialog = page.getByRole("dialog", { name: /^Nova Tutor$/i });
    await expect(tutorDialog).toBeVisible();
    await expect(tutorDialog.getByText(/Professor Nova|Nova Tutor/i).first()).toBeVisible();
    await tutorDialog.getByRole("button", { name: /^Close Nova Tutor$/i }).click();
    await expect(tutorDialog).toBeHidden();

    expectNoPageErrors(pageErrors);
  });

  test("guest language and theme controls persist", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await chooseLanguage(page, /Use Traditional Chinese|使用繁體中文|使用繁体中文/i);
    await expect(page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i })).toContainText(/繁體中文/);
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hant-HK");
    await expectStoredValue(page, "hk-math-language", "zh");
    await page.reload();
    await expect(page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i })).toContainText(/繁體中文/);
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hant-HK");

    await chooseLanguage(page, /Use Simplified Chinese|使用簡體中文|使用简体中文/i);
    await expect(page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i })).toContainText(/简体中文/);
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe("zh-Hans-CN");
    await expectStoredValue(page, "hk-math-language", "zh-Hans");

    await chooseLanguage(page, /Use English|使用英文/i);
    await expect(page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i })).toContainText(/English/);
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
    await expect(page).toHaveURL(/\/student\/lessons(\/|$)/);

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Personalized Learning$/i }).click();
    await expect(page).toHaveURL(/\/personalized-learning$/);
    await expect(header(page).getByRole("link", { name: /^Personalized Learning$/i })).toHaveAttribute("aria-current", "page");

    await page.goto("/");
    await header(page).getByRole("link", { name: /^Visualization Lab$/i }).click();
    await expect(page).toHaveURL(/\/student\/tools\/visualizations$/);
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

  test("desktop Lesson nav stays active while session lookup is delayed", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Desktop navbar links are hidden behind the mobile menu on small screens.");
    const pageErrors = collectPageErrors(page);
    let releaseSessionLookup!: () => void;
    let sessionLookupRequested = false;
    const sessionLookupGate = new Promise<void>((resolve) => {
      releaseSessionLookup = resolve;
    });

    await page.route(
      (url) => url.pathname === "/api/me" && url.searchParams.get("includeLessonEntry") === "false",
      async (route) => {
        sessionLookupRequested = true;
        await sessionLookupGate;
        await route.fulfill({
          body: JSON.stringify({ error: "Not authenticated." }),
          contentType: "application/json",
          status: 401
        });
      }
    );

    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: /MAIS/i })).toBeVisible();
      await expect.poll(() => sessionLookupRequested).toBe(true);

      const mainNav = header(page).getByRole("navigation", { name: /main navigation/i });
      const lessonLink = mainNav.getByRole("link", { name: /^Lesson$/i });
      await expect(lessonLink).toBeVisible();
      await expect(lessonLink).toHaveAttribute("href", /\/student\/lessons/);
      await expect(mainNav.getByRole("button", { name: /^Lesson$/i })).toHaveCount(0);

      const navStyles = await mainNav.evaluate((navElement) => {
        const items = Array.from(navElement.querySelectorAll("a, button")).map((element) => ({
          cursor: getComputedStyle(element).cursor,
          opacity: getComputedStyle(element).opacity,
          color: getComputedStyle(element).color,
          tag: element.tagName.toLowerCase(),
          text: element.textContent?.trim().replace(/\s+/g, " ") ?? ""
        }));

        return {
          adaptive: items.find((item) => item.text === "Personalized Learning"),
          lesson: items.find((item) => item.text === "Lesson")
        };
      });

      expect(navStyles.lesson).toMatchObject({
        color: navStyles.adaptive?.color,
        cursor: navStyles.adaptive?.cursor,
        opacity: navStyles.adaptive?.opacity,
        tag: "a"
      });
    } finally {
      releaseSessionLookup();
    }

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

  test("mobile PedaNova engine card keeps Global status visible at narrow widths", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "PedaNova mobile visual regression runs only in the mobile project.");
    const pageErrors = collectPageErrors(page);

    await expectPedaNovaCardVisibleOnMobile(page, 360);
    await expectPedaNovaCardVisibleOnMobile(page, 390);

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
    await expect(page.getByRole("link", { name: /HK Student Peter/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Grades:\s*\d+/i })).toBeVisible();

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
