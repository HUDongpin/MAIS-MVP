import { expect, test } from "@playwright/test";

function googleStartUrl(href: string | null, pageUrl: string) {
  expect(href).toBeTruthy();
  return new URL(href ?? "", pageUrl);
}

async function googleOAuthAvailability(request: { get: (url: string) => Promise<{ json: () => Promise<unknown> }> }) {
  const response = await request.get("/api/auth/google/status");
  const body = await response.json() as { available?: unknown };
  return body.available === true;
}

test.describe("Google OAuth login entry", () => {
  test("hides Google sign-in and keeps password login when OAuth is unset", async ({ page, request }) => {
    test.skip(await googleOAuthAvailability(request), "Google OAuth is configured in this environment");

    const status = await request.get("/api/auth/google/status");
    expect(status.ok()).toBeTruthy();
    expect(status.headers()["cache-control"]).toContain("no-store");
    await expect(status.json()).resolves.toEqual({ available: false });

    await page.goto("/login");
    await expect(page.locator("#login-identifier")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
    await expect(page.getByRole("link", { name: /Continue with Google/i })).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /Google sign-in is not available/i })).toBeVisible();
    await expect(page.getByText(/Use your email and password to log in/i)).toBeVisible();

    await page.goto("/login?googleError=setup");
    await expect(page.getByRole("link", { name: /Continue with Google/i })).toHaveCount(0);
    await expect(page.getByText(/not configured for this environment/i)).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: /Google sign-in is not available/i })).toBeVisible();
    await expect(page.getByText(/Use your email and password to log in/i)).toBeVisible();
    await expect(page.locator("#login-identifier")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("start route redirects to login setup when Google OAuth is unset", async ({ request }) => {
    test.skip(await googleOAuthAvailability(request), "Google OAuth is configured in this environment");

    const response = await request.get(
      "/api/auth/google/start?next=%2Fdashboard&role=student&grade=S4&curriculumTrack=HK&language=en&theme=dark",
      { maxRedirects: 0 }
    );

    expect(response.status()).toBe(307);
    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location ?? "", "http://127.0.0.1");
    expect(redirectUrl.pathname).toBe("/login");
    expect(redirectUrl.searchParams.get("googleError")).toBe("setup");
  });

  test("login page prepares role-specific Google start URLs", async ({ page, request }) => {
    test.skip(!(await googleOAuthAvailability(request)), "Google OAuth is not configured");

    await page.goto("/login?next=%2Fdashboard");

    const action = page.getByRole("link", { name: /Continue with Google/i });
    await expect(action).toBeVisible();
    await expect(page.getByRole("radiogroup", { name: /Google account type/i })).toHaveCount(0);

    const studentUrl = googleStartUrl(await action.getAttribute("href"), page.url());
    expect(studentUrl.pathname).toBe("/api/auth/google/start");
    expect(studentUrl.searchParams.get("role")).toBe("student");
    expect(studentUrl.searchParams.get("next")).toBe("/dashboard");
    expect(studentUrl.searchParams.get("grade")).toBeTruthy();
    expect(studentUrl.searchParams.get("curriculumTrack")).toBeTruthy();

    await page.getByRole("button", { name: /Change Google account type/i }).click();
    const roleGroup = page.getByRole("radiogroup", { name: /Google account type/i });
    await expect(roleGroup).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Student$/i })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("radio", { name: /^Parent$/i }).click();
    await expect(page.getByRole("radio", { name: /^Parent$/i })).toHaveAttribute("aria-checked", "true");
    const parentUrl = googleStartUrl(await action.getAttribute("href"), page.url());
    expect(parentUrl.searchParams.get("role")).toBe("parent");
    expect(parentUrl.searchParams.get("next")).toBe("/dashboard");
    expect(parentUrl.searchParams.has("grade")).toBe(false);
    expect(parentUrl.searchParams.has("curriculumTrack")).toBe(false);

    await page.getByRole("radio", { name: /^Teacher$/i }).click();
    await expect(page.getByRole("radio", { name: /^Teacher$/i })).toHaveAttribute("aria-checked", "true");
    const teacherUrl = googleStartUrl(await action.getAttribute("href"), page.url());
    expect(teacherUrl.searchParams.get("role")).toBe("teacher");
    expect(teacherUrl.searchParams.get("next")).toBe("/dashboard");
    expect(teacherUrl.searchParams.has("grade")).toBe(false);
    expect(teacherUrl.searchParams.has("curriculumTrack")).toBe(false);
  });

  test("Google start route redirects to Google and sets pending state cookie", async ({ request }) => {
    test.skip(!(await googleOAuthAvailability(request)), "Google OAuth is not configured");

    const response = await request.get(
      "/api/auth/google/start?next=%2Fdashboard&role=student&grade=S4&curriculumTrack=HK&language=en&theme=dark",
      { maxRedirects: 0 }
    );

    expect(response.status()).toBe(307);
    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location ?? "");
    expect(redirectUrl.origin).toBe("https://accounts.google.com");
    expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(redirectUrl.searchParams.get("state")).toBeTruthy();
    expect(redirectUrl.searchParams.get("nonce")).toBeTruthy();

    const cookie = response.headers()["set-cookie"] ?? "";
    expect(cookie).toContain("mais_google_oauth_state=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Max-Age=600");
  });
});
