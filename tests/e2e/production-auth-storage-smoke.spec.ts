import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { uniqueSuffix } from "./helpers";

type CookieSummary = {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expiresType: "persistent" | "session";
};

type ProbeResult = {
  attempt: number;
  registerStatus: number;
  loginStatus: number | null;
  cookieCount: number;
  cookies: CookieSummary[];
  meStatus: number | null;
  meSameUser: boolean;
};

type BrowserCookie = {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "Strict" | "Lax" | "None";
  expires: number;
};

const productionAuthStorageEnabled = process.env.PRODUCTION_AUTH_STORAGE_SMOKE === "1";
const expectedProductionOrigin = "https://www.mais.hk";
const sessionCookieName = "hk_math_session";

test.setTimeout(420_000);
test.use({ trace: "off", video: "off", screenshot: "off" });

function smokePassword() {
  return `smoke-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function smokeSuffix(testInfo: TestInfo, label: string) {
  return uniqueSuffix(testInfo).replace(/[^a-z0-9-]+/gi, "-").toLowerCase().slice(0, 48) + `-${label}`;
}

function summarizeCookie(cookie: BrowserCookie): CookieSummary {
  return {
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    expiresType: cookie.expires > 0 ? "persistent" : "session"
  };
}

async function assertProductionTarget(baseURL: string | undefined) {
  expect(process.env.PLAYWRIGHT_SKIP_WEBSERVER).toBe("1");
  expect(baseURL).toBeTruthy();
  const target = new URL(baseURL ?? "");
  const expected = new URL(expectedProductionOrigin);
  expect(target.protocol).toBe(expected.protocol);
  expect(target.host).toBe(expected.host);
}

async function fetchBrowserMe(page: Page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin"
    });
    const bodyText = await response.text();
    let json: unknown = null;
    try {
      json = bodyText ? JSON.parse(bodyText) : null;
    } catch {
      json = null;
    }

    const user = (json as { user?: { username?: unknown } } | null)?.user;
    return {
      status: response.status,
      username: typeof user?.username === "string" ? user.username : null
    };
  });
}

async function runAuthProbe(page: Page, testInfo: TestInfo, attempt: number): Promise<ProbeResult> {
  const suffix = smokeSuffix(testInfo, `attempt-${attempt}`);
  const username = `smoke-auth-storage-${suffix}@example.test`;
  const password = smokePassword();

  await page.context().clearCookies();
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      name: `Smoke Auth Storage ${attempt}`,
      username,
      password,
      grade: "S3",
      curriculumTrack: "HK",
      language: "en",
      theme: "dark"
    }
  });

  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('input[autocomplete="username"]').first().fill(username);
  await page.locator('input[autocomplete="current-password"]').first().fill(password);
  const s3Radio = page.getByRole("radio", { name: /\bS3\b/i }).first();
  if (await s3Radio.isEnabled()) {
    await s3Radio.click();
  } else {
    await expect(s3Radio).toHaveAttribute("aria-checked", "true");
  }

  let loginStatus: number | null = null;
  try {
    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /^log in$/i }).click();
    loginStatus = (await loginResponsePromise).status();
  } catch {
    loginStatus = null;
  }

  await page.waitForTimeout(750);
  const cookies = (await page.context().cookies(expectedProductionOrigin))
    .filter((cookie) => cookie.name === sessionCookieName)
    .map(summarizeCookie);
  const me = await fetchBrowserMe(page).catch(() => ({ status: null, username: null }));

  return {
    attempt,
    registerStatus: registerResponse.status(),
    loginStatus,
    cookieCount: cookies.length,
    cookies,
    meStatus: me.status,
    meSameUser: me.username === username
  };
}

test.describe("Vercel Production auth/storage smoke", () => {
  test.skip(!productionAuthStorageEnabled, "Set PRODUCTION_AUTH_STORAGE_SMOKE=1 to run production-writing auth/storage smoke tests.");

  test.beforeEach(async ({ baseURL }) => {
    await assertProductionTarget(baseURL);
  });

  test("register, browser login, and /api/me stay consistent for five smoke students", async ({ page }, testInfo) => {
    const results: ProbeResult[] = [];

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      results.push(await runAuthProbe(page, testInfo, attempt));
    }

    await testInfo.attach("production-auth-storage-smoke.json", {
      body: JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
      contentType: "application/json"
    });

    expect(results).toEqual(results.map((result) => ({
      ...result,
      registerStatus: 200,
      loginStatus: 200,
      cookieCount: 1,
      meStatus: 200,
      meSameUser: true
    })));
  });
});
