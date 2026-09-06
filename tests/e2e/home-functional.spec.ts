import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectPageErrors,
  demoTeacher,
  demoTeacherUserId,
  expectNoPageErrors,
  loginAsDemoStudent
} from "./helpers";

function header(page: Page) {
  return page.locator("header");
}

async function openHomeAccountMenu(page: Page) {
  await expect(page.locator('[data-mais-session-react-guard-ready="true"]')).toBeAttached();
  await expect(page.locator('[data-session-verification-gate="true"]')).toHaveCount(0);
  const menu = page.getByRole("button", { name: /open mobile menu|開啟手機選單/i });
  if (await menu.isVisible() && await menu.getAttribute("aria-expanded") === "false") {
    await menu.click();
  }
}

async function expectCurrentHomeHeading(page: Page) {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Math learning should be\s*fun and personalized!/i
    })
  ).toBeVisible();
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

async function expectCurrentMobileHero(page: Page, width: 360 | 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/");
  await expectCurrentHomeHeading(page);
  await expect(page.getByRole("link", { name: /^Start Learning$/i })).toBeVisible();
  await expectNoHorizontalOverflow(page, `mobile homepage at ${width}px`);
}

async function expectHomeLinkToRoute(page: Page, link: Locator, target: RegExp) {
  await page.goto("/");
  await expectCurrentHomeHeading(page);
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
  test("guest homepage hero, footer, and Nova Tutor shell work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await expectCurrentHomeHeading(page);
    await expect(header(page).getByRole("navigation", { name: /main navigation/i })).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Nova Tutor$/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, "guest homepage");

    await expectHomeLinkToRoute(page, page.getByRole("link", { name: /Start Learning/i }).first(), /\/login$/);

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
    await expect(page).toHaveURL(
      (url) => url.pathname === "/login" && url.searchParams.get("next") === "/student/lessons"
    );

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

  test("desktop Lesson nav keeps its guest auth redirect during delayed foreground session revalidation", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Desktop navbar links are hidden behind the mobile menu on small screens.");
    const pageErrors = collectPageErrors(page);
    let releaseSessionLookup!: () => void;
    let sessionLookupRequested = false;
    const sessionLookupGate = new Promise<void>((resolve) => {
      releaseSessionLookup = resolve;
    });

    await page.route(
      (url) => url.pathname === "/api/auth/session-state" && url.searchParams.get("includeLessonEntry") === "false",
      async (route) => {
        sessionLookupRequested = true;
        await sessionLookupGate;
        await route.fulfill({
          body: JSON.stringify({ user: null }),
          contentType: "application/json",
          status: 200
        });
      }
    );

    try {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await expectCurrentHomeHeading(page);
      await expect(page.locator('[data-mais-session-react-guard-ready="true"]')).toBeAttached();
      await page.evaluate(() => {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
      });
      await expect.poll(() => sessionLookupRequested).toBe(true);

      const mainNav = header(page).getByRole("navigation", { name: /main navigation/i });
      const lessonLink = mainNav.getByRole("link", { name: /^Lesson$/i });
      await expect(lessonLink).toBeVisible();
      await expect(lessonLink).toHaveAttribute("href", "/login?next=%2Fstudent%2Flessons");
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

      const guestDocument = page.waitForNavigation({ waitUntil: "domcontentloaded" });
      releaseSessionLookup();
      await guestDocument;
      await expect(page.locator('[data-mais-session-react-guard-ready="true"]')).toBeAttached();
      await expectCurrentHomeHeading(page);
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

  test("mobile hero remains usable at narrow widths", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chrome", "Mobile hero regression runs only in the mobile project.");
    const pageErrors = collectPageErrors(page);

    await expectCurrentMobileHero(page, 360);
    await expectCurrentMobileHero(page, 390);

    expectNoPageErrors(pageErrors);
  });

  test("student homepage account controls work", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);

    if (testInfo.project.name === "desktop-chrome") {
      await page.setViewportSize({ width: 1440, height: 700 });
    }

    await loginAsDemoStudent(page);
    await page.goto("/");
    await chooseLanguage(page, /Use English|使用英文/i);
    await expectCurrentHomeHeading(page);

    await openHomeAccountMenu(page);
    await page.getByRole("link", { name: /HK Student Peter/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto("/");
    await openHomeAccountMenu(page);
    await expect(page.getByRole("link", { name: /HK Student Peter/i }).first()).toBeVisible();

    await page.getByRole("button", { name: /log out|登出/i }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 30_000 });
    await expect(page.getByLabel(/email or username|email or user name|user name/i)).toBeVisible();
    expectNoPageErrors(pageErrors);
  });

  test("student logout keeps its login destination while document navigation is delayed", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsDemoStudent(page);
    await page.goto("/");
    await openHomeAccountMenu(page);
    const logoutButton = page.getByRole("button", { name: /log out|登出/i }).filter({ visible: true });
    await expect(logoutButton).toBeVisible();

    let releaseNavigation!: () => void;
    const navigationGate = new Promise<void>((resolve) => {
      releaseNavigation = resolve;
    });
    const documentDestinations: string[] = [];
    let sessionLookups = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/auth/session-state") sessionLookups += 1;
    });
    await page.route((url) => url.pathname === "/login" || url.pathname === "/", async (route) => {
      const request = route.request();
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        documentDestinations.push(new URL(request.url()).pathname);
        await navigationGate;
      }
      await route.continue();
    });

    try {
      // Start the probe before navigation. Playwright locators wait for a
      // pending document navigation to finish, so they cannot inspect the
      // outgoing account gate while the route is deliberately held.
      const clearedDocument = page.evaluate(() => new Promise<{ gateVisible: boolean; accountLinks: number }>((resolve) => {
        const waitForClearedIdentity = () => {
          const signal = JSON.parse(window.localStorage.getItem("hk-math-session-sync") ?? "null");
          if (!signal || signal.userId !== null) {
            requestAnimationFrame(waitForClearedIdentity);
            return;
          }
          // Let React commit clear-session and run its layout effects before
          // observing the outgoing document and competing network requests.
          requestAnimationFrame(() => requestAnimationFrame(() => {
            const gate = document.querySelector<HTMLElement>('[data-session-verification-gate="true"]');
            resolve({
              gateVisible: Boolean(gate && gate.getClientRects().length > 0),
              accountLinks: Array.from(document.querySelectorAll("a"))
                .filter((link) => /HK Student Peter/i.test(link.textContent ?? "")).length
            });
          }));
        };
        requestAnimationFrame(waitForClearedIdentity);
      }));
      const logoutResponse = page.waitForResponse((response) =>
        new URL(response.url()).pathname === "/api/auth/logout" && response.request().method() === "POST"
      );
      await logoutButton.click();
      expect((await logoutResponse).status()).toBe(200);
      await expect.poll(() => documentDestinations.length).toBeGreaterThan(0);
      expect(await clearedDocument).toEqual({ gateVisible: true, accountLinks: 0 });
      expect(sessionLookups, "successful logout must not restart session revalidation").toBe(0);
      expect(documentDestinations, "logout must not be superseded by a homepage reload").toEqual(["/login"]);

      const loginDocument = page.waitForNavigation({ waitUntil: "domcontentloaded" });
      releaseNavigation();
      await loginDocument;
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByLabel(/email or username|email or user name|user name/i)).toBeVisible();
      await expect(page.locator('[data-mais-session-react-guard-ready="true"]')).toBeAttached();
      await expect(page.locator('[data-session-verification-gate="true"]')).toHaveCount(0);
    } finally {
      releaseNavigation();
    }

    expectNoPageErrors(pageErrors);
  });

  test("stale homepage logout preserves a replacement account after a 409 conflict", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await loginAsDemoStudent(page);
    await page.goto("/");
    await openHomeAccountMenu(page);
    const logoutButton = page.getByRole("button", { name: /log out|登出/i }).filter({ visible: true });
    await expect(logoutButton).toBeVisible();

    // A different tab can replace the shared cookie before this document
    // receives its identity signal. Keep the student document mounted while
    // the real login endpoint establishes the replacement teacher session.
    const replacementLogin = await page.request.post("/api/auth/login", {
      data: { ...demoTeacher, language: "en", theme: "light" }
    });
    expect(replacementLogin.status()).toBe(200);
    await expect(page.getByRole("link", { name: /HK Student Peter/i }).first()).toBeVisible();

    const logoutResponse = page.waitForResponse((response) =>
      new URL(response.url()).pathname === "/api/auth/logout" && response.request().method() === "POST"
    );
    const replacementDocument = page.waitForNavigation({ waitUntil: "domcontentloaded" });
    await logoutButton.click();
    const conflict = await logoutResponse;
    expect(conflict.status()).toBe(409);
    expect(conflict.headers()).not.toHaveProperty("set-cookie");
    await replacementDocument;
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-mais-session-react-guard-ready="true"]')).toBeAttached();
    await expect(page.locator('[data-session-verification-gate="true"]')).toHaveCount(0);
    await openHomeAccountMenu(page);
    await expect(page.getByRole("link", { name: /HK Teacher Chan/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /HK Student Peter/i })).toHaveCount(0);
    const sessionResponse = await page.request.get("/api/auth/session-state?includeLessonEntry=false");
    expect(sessionResponse.status()).toBe(200);
    expect((await sessionResponse.json()).user).toMatchObject({ id: demoTeacherUserId, role: "teacher" });
    expectNoPageErrors(pageErrors);
  });
});
