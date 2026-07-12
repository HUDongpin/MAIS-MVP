import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors } from "./helpers";

type AuthSnapshot = {
  hasLoginLink: boolean;
  hasLogoutButton: boolean;
  hasRegisterLink: boolean;
  hasShirleenLink: boolean;
  meStatus: number | null;
  pathname: string;
  username: string | null;
};

type RouteSnapshot = AuthSnapshot & {
  label: string;
  relativeUrl: string;
  timestamp: string;
};

const shirleenAccount = {
  username: "Student Shirleen",
  password: "12345"
} as const;

const californiaLabUrl = "/visualization-lab?grade=P1&track=all&lab=us-ca-math-p1-1-oa-add-subtract";
const routeSweep = [
  { label: "dashboard", url: "/dashboard" },
  { label: "lesson", url: "/lesson" },
  { label: "learning path", url: "/learning-path" },
  { label: "visualization lab directory", url: "/visualization-lab" },
  { label: "california visualization lab", url: californiaLabUrl },
  { label: "practice arena", url: "/practice" },
  { label: "about", url: "/about" }
] as const;

test.use({ trace: "off", video: "off", screenshot: "only-on-failure" });

async function browserMe(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/me?includeLessonEntry=false", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const text = await response.text();
    let body: { user?: { id?: unknown; username?: unknown; curriculumTrack?: unknown } } | null = null;

    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }

    return {
      status: response.status,
      userId: typeof body?.user?.id === "string" ? body.user.id : null,
      username: typeof body?.user?.username === "string" ? body.user.username : null,
      curriculumTrack: typeof body?.user?.curriculumTrack === "string" ? body.user.curriculumTrack : null
    };
  });
}

async function authSnapshot(page: Page): Promise<AuthSnapshot> {
  const shell = await page.evaluate(() => {
    const visibleText = (element: Element | null) => element?.textContent?.trim() ?? "";
    return {
      hasLoginLink: Array.from(document.querySelectorAll("a[href='/login']")).some((link) => visibleText(link) === "Log In"),
      hasRegisterLink: Array.from(document.querySelectorAll("a[href='/register']")).some((link) => visibleText(link) === "Register"),
      hasLogoutButton: Array.from(document.querySelectorAll("button")).some((button) => visibleText(button) === "Log out"),
      hasShirleenLink: Array.from(document.querySelectorAll("a")).some((link) => visibleText(link).includes("Student Shirleen")),
      pathname: window.location.pathname
    };
  });
  const me = await browserMe(page).catch(() => ({ status: null, username: null }));

  return {
    ...shell,
    meStatus: me.status,
    username: me.username
  };
}

async function expectShirleenAuthenticated(page: Page, label: string): Promise<AuthSnapshot> {
  const snapshot = await authSnapshot(page);
  expect(snapshot.hasShirleenLink, `${label}: shell should still show Student Shirleen`).toBe(true);
  expect(snapshot.hasLogoutButton, `${label}: shell should still show Log out`).toBe(true);
  expect(snapshot.hasLoginLink, `${label}: shell should not show the logged-out login link`).toBe(false);
  expect(snapshot.hasRegisterLink, `${label}: shell should not show the logged-out register link`).toBe(false);
  expect(snapshot.meStatus, `${label}: /api/me should remain authenticated`).toBe(200);
  expect(snapshot.username, `${label}: /api/me user should remain Shirleen`).toBe(shirleenAccount.username);
  return snapshot;
}

async function loginAsShirleenViaUi(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  const exampleButton = page.getByRole("button", { name: /Use example account: Student Shirleen/i });
  await expect(exampleButton).toBeVisible({ timeout: 30_000 });
  const loginResponse = page.waitForResponse((response) =>
    response.url().endsWith("/api/auth/login") &&
    response.request().method() === "POST"
  );
  await exampleButton.click();
  const response = await loginResponse;
  expect(response.status(), await response.text()).toBe(200);

  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });
  await expectShirleenAuthenticated(page, "after UI login");
}

async function interactWithVisualizationIfPresent(page: Page) {
  const numberA = page.locator('input[aria-label="Number A"]');
  if (await numberA.isVisible().catch(() => false)) {
    await numberA.press("ArrowRight");
  }

  const addButton = page.getByRole("button", { name: /^Add$/i });
  if (await addButton.isVisible().catch(() => false)) {
    await addButton.click();
  }

  const compareButton = page.getByRole("button", { name: /^Compare$/i });
  if (await compareButton.isVisible().catch(() => false)) {
    await compareButton.click();
  }
}

test.describe("Shirleen 3-minute navbar auth experiment", () => {
  test.describe.configure({ timeout: 300_000 });

  test("Shirleen stays signed in while browsing common navbar pages for three minutes", async ({ page }, testInfo: TestInfo) => {
    const pageErrors = collectPageErrors(page);
    const snapshots: RouteSnapshot[] = [];
    const rejectedApiResponses: { method: string; pathname: string; status: number; timestamp: string }[] = [];

    page.on("response", (response) => {
      const url = new URL(response.url());
      if (!url.pathname.startsWith("/api/")) return;
      const status = response.status();
      if (status !== 401 && status !== 403) return;
      rejectedApiResponses.push({
        method: response.request().method(),
        pathname: url.pathname,
        status,
        timestamp: new Date().toISOString()
      });
    });

    await loginAsShirleenViaUi(page);

    const startedAt = Date.now();
    const deadline = startedAt + 180_000;
    let sweepIndex = 0;

    while (Date.now() < deadline) {
      const target = routeSweep[sweepIndex % routeSweep.length];
      await page.goto(target.url, { waitUntil: "domcontentloaded" });
      if (target.url === californiaLabUrl) {
        await page.locator('[data-viz-panel-mode="lab"]').waitFor({ state: "visible", timeout: 30_000 }).catch(() => undefined);
        await interactWithVisualizationIfPresent(page);
      }

      const snapshot = await expectShirleenAuthenticated(page, target.label);
      snapshots.push({
        ...snapshot,
        label: target.label,
        relativeUrl: target.url,
        timestamp: new Date().toISOString()
      });

      const remainingMs = deadline - Date.now();
      await page.waitForTimeout(Math.min(15_000, Math.max(0, remainingMs)));
      sweepIndex += 1;
    }

    const finalSnapshot = await expectShirleenAuthenticated(page, "after 3-minute navbar sweep");
    snapshots.push({
      ...finalSnapshot,
      label: "final",
      relativeUrl: page.url(),
      timestamp: new Date().toISOString()
    });

    await testInfo.attach("shirleen-navbar-three-minute-auth.json", {
      body: JSON.stringify({
        generatedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
        rejectedApiResponses,
        snapshots
      }, null, 2),
      contentType: "application/json"
    });

    expect(rejectedApiResponses).toEqual([]);
    expect(snapshots.map((snapshot) => snapshot.label)).toEqual(expect.arrayContaining(routeSweep.map((route) => route.label)));
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(180_000);
    expectNoPageErrors(pageErrors);
  });
});
