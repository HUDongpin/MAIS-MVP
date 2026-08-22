import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

async function googleStartFields(page: Page) {
  return page.locator('form[action="/api/auth/google/start"]').evaluate((form) =>
    Object.fromEntries(new FormData(form as HTMLFormElement).entries()) as Record<string, string>
  );
}

test.describe("Google OAuth login entry", () => {
  test("public OAuth identity and legal disclosures use the canonical www.mais.ac URLs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveJSProperty("href", "https://www.mais.ac/");
    await expect(page.getByRole("heading", { level: 2, name: /Personalised K–12 mathematics learning/i })).toBeVisible();
    await expect(page.getByText(/Optional Google Sign-In uses a verified Google email address/i)).toBeVisible();
    const publicLegalNav = page.locator("footer nav");
    await expect(publicLegalNav.getByRole("link", { name: /^Privacy Policy$/i })).toHaveAttribute("href", "/privacy");
    await expect(publicLegalNav.getByRole("link", { name: /^Terms of Service$/i })).toHaveAttribute("href", "/terms");

    await page.goto("/privacy");
    await expect(page).toHaveTitle(/Privacy Policy \| MAIS/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.mais.ac/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
    await expect(page.getByText(/Google account identifier, verified email address, and basic profile/i)).toBeVisible();

    await page.goto("/terms");
    await expect(page).toHaveTitle(/Terms of Service \| MAIS/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.mais.ac/terms");
    await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();

    await page.goto("/login");
    const disclosure = page.getByTestId("google-data-disclosure");
    await expect(disclosure).toContainText(/Google account identifier, verified email, and basic profile/i);
    await expect(disclosure.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/privacy");
    await expect(disclosure.getByRole("link", { name: /Terms of Service/i })).toHaveAttribute("href", "/terms");
  });

  test("stateful Google start uses its own POST form and the credential return exception stays exact", () => {
    const loginSource = readFileSync("app/login/page.tsx", "utf8");
    expect(loginSource).toContain('method="post"');
    expect(loginSource).toContain('action="/api/auth/google/start"');
    expect(loginSource).toContain('name="setupConfirmed"');
    expect(loginSource).toContain('nextPath === "/login?googleLink=1"');
    expect(loginSource).toContain("safeWorkspaceTarget(nextPath, result.role)");
    expect(loginSource).toContain('setNextTarget("")');
    expect(loginSource).toContain("googleLinkIntent");
  });

  test("login page explains when an existing account needs explicit Google linking", async ({ page }) => {
    await page.goto("/login?googleError=account_link_required");

    const accountLinkAlert = page.locator('p[role="alert"]');
    await expect(accountLinkAlert).toContainText(/matching MAIS password account is required/i);
    await expect(accountLinkAlert).toContainText(/new parents should create a Parent account first/i);
  });

  test("login page explains missing student setup before retrying Google", async ({ page }) => {
    await page.goto("/login?googleError=student_setup_required");

    const setupAlert = page.locator('p[role="alert"]');
    await expect(setupAlert).toContainText(/select and confirm the student's curriculum and grade/i);
  });

  test("login page prepares role-specific Google start URLs", async ({ page }) => {
    const unsolicitedGoogleStarts: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/auth/google/start") unsolicitedGoogleStarts.push(request.url());
    });
    await page.goto("/login?next=%2Fdashboard");

    const googleForm = page.locator('form[action="/api/auth/google/start"]');
    const action = page.getByRole("button", { name: /Continue with Google/i });
    await expect(action).toBeVisible();
    await expect(action).toBeDisabled();
    await expect(action).toHaveAttribute("aria-disabled", "true");
    await expect(googleForm).toHaveAttribute("method", "post");
    await expect(googleForm.locator('input[type="password"]')).toHaveCount(0);
    await expect(googleForm.locator('input[name="username"]')).toHaveCount(0);
    await expect(page.getByText(/Choose the student's textbook curriculum and grade before continuing/i)).toBeVisible();
    await expect(page.getByTestId("google-g-logo")).toBeVisible();
    await expect(page.getByTestId("google-g-logo").locator("path")).toHaveCount(4);
    await page.waitForTimeout(250);
    expect(unsolicitedGoogleStarts, "rendering the stateful Google start link must not prefetch it").toEqual([]);
    expect(new URL(page.url()).pathname).toBe("/login");
    expect(unsolicitedGoogleStarts, "student Google login must stay blocked until setup is confirmed").toEqual([]);
    await expect(page.getByRole("radiogroup", { name: /Google account type/i })).toHaveCount(0);

    const studentCurriculum = page.getByLabel(/Google student curriculum/i);
    const studentGrade = page.getByLabel(/Google student grade/i);
    await expect(studentCurriculum).toHaveValue("US_CA_MATH");
    await expect(studentGrade).toHaveValue("K");

    await studentCurriculum.selectOption("MAINLAND_BNU");
    await expect(studentGrade).toHaveValue("S4");
    await studentGrade.selectOption("S4");
    await page.getByRole("checkbox", { name: /I confirm this curriculum and grade are correct/i }).check();
    await expect(action).toBeDisabled();
    await page.getByRole("checkbox", { name: /I confirm that I am at least 13 years old/i }).check();
    await expect(action).toBeEnabled();
    await expect(action).toHaveAttribute("aria-disabled", "false");

    const studentFields = await googleStartFields(page);
    expect(studentFields.role).toBe("student");
    expect(studentFields.next).toBe("/dashboard");
    expect(studentFields.grade).toBe("S4");
    expect(studentFields.curriculumTrack).toBe("MAINLAND_PEP_HIGH");
    expect(studentFields.publisher).toBe("MAINLAND_BNU");
    expect(studentFields.setupConfirmed).toBe("true");
    expect(studentFields.studentAge13OrOlder).toBe("true");

    await page.getByRole("button", { name: /Change Google account type/i }).click();
    const roleGroup = page.getByRole("radiogroup", { name: /Google account type/i });
    await expect(roleGroup).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Student$/i })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("radio", { name: /^Parent$/i }).click();
    await expect(page.getByRole("radio", { name: /^Parent$/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel(/Google student curriculum/i)).toHaveCount(0);
    await expect(action).toHaveAttribute("aria-disabled", "false");
    const parentFields = await googleStartFields(page);
    expect(parentFields.role).toBe("parent");
    expect(parentFields.next).toBe("/dashboard");
    expect(parentFields.grade).toBeUndefined();
    expect(parentFields.curriculumTrack).toBeUndefined();
    expect(parentFields.publisher).toBeUndefined();

    await page.getByRole("radio", { name: /^Teacher$/i }).click();
    await expect(page.getByRole("radio", { name: /^Teacher$/i })).toHaveAttribute("aria-checked", "true");
    const teacherFields = await googleStartFields(page);
    expect(teacherFields.role).toBe("teacher");
    expect(teacherFields.next).toBe("/dashboard");
    expect(teacherFields.grade).toBeUndefined();
    expect(teacherFields.curriculumTrack).toBeUndefined();
    expect(teacherFields.publisher).toBeUndefined();
  });

  test("signed-in age-eligible student links Google with the account's saved learning setup", async ({ page }) => {
    const loginResponse = await page.request.post("/api/auth/login", {
      maxRetries: 1,
      data: {
        username: "HK Student Peter",
        password: "12345",
        grade: "S4",
        curriculumTrack: "HK",
        curriculumProfile: { region: "HK", publisher: "HK_UNITED_PRIME_MIA" },
        language: "en",
        theme: "light"
      }
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto("/login?googleLink=1");
    await expect(page.getByText(/finish the secure connection.*confirm your MAIS password.*continue with Google/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Change Google account type/i })).toHaveCount(0);
    await expect(page.getByLabel(/Google student curriculum/i)).toHaveCount(0);

    const action = page.getByRole("button", { name: /Continue with Google/i });
    await expect(action).toBeDisabled();
    await page.getByRole("checkbox", { name: /I confirm that I am at least 13 years old/i }).check();
    await expect(action).toHaveAttribute("aria-disabled", "false");
    const studentFields = await googleStartFields(page);
    expect(studentFields.role).toBe("student");
    expect(studentFields.grade).toBe("S4");
    expect(studentFields.curriculumTrack).toBe("HK");
    expect(studentFields.publisher).toBe("HK_UNITED_PRIME_MIA");
    expect(studentFields.studentAge13OrOlder).toBe("true");
  });

  test("student Google linking fails closed for an age-ineligible saved grade", async ({ page }) => {
    const loginResponse = await page.request.post("/api/auth/login", {
      maxRetries: 1,
      data: {
        username: "Student Shirleen",
        password: "12345",
        grade: "P1",
        curriculumTrack: "US_CA_MATH",
        curriculumProfile: { region: "US", publisher: "US_CA_MATH" },
        language: "en",
        theme: "light"
      }
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto("/login?googleLink=1");
    await expect(page.getByText(/Student Google Sign-In is currently limited to learners aged 13 or older/i)).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /I confirm that I am at least 13 years old/i })).toBeDisabled();
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeDisabled();
  });

  test("signed-in teacher links Google with a locked teacher role", async ({ page }) => {
    const loginResponse = await page.request.post("/api/auth/login", {
      maxRetries: 1,
      data: {
        username: "HK Teacher Chan",
        password: "12345",
        language: "en",
        theme: "light"
      }
    });
    expect(loginResponse.ok(), await loginResponse.text()).toBeTruthy();

    await page.goto("/login?googleLink=1");
    await expect(page.getByText(/finish the secure connection.*confirm your MAIS password.*continue with Google/i)).toBeVisible();
    await expect(page.getByText(/Signing in as Teacher/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Change Google account type/i })).toHaveCount(0);
    await expect(page.getByLabel(/Google student curriculum/i)).toHaveCount(0);

    const action = page.getByRole("button", { name: /Continue with Google/i });
    await expect(action).toBeEnabled();
    const teacherFields = await googleStartFields(page);
    expect(teacherFields.role).toBe("teacher");
    expect(teacherFields.grade).toBeUndefined();
    expect(teacherFields.curriculumTrack).toBeUndefined();
    expect(teacherFields.publisher).toBeUndefined();
  });

  test("password reauthentication issues and consumes a purpose-bound Google-link marker", async ({ page }) => {
    await page.goto("/login?next=%2Flogin%3FgoogleLink%3D1");
    await page.getByLabel(/email or username/i).fill("HK Teacher Chan");
    await page.getByLabel(/^password$/i).fill("12345");
    await page.locator('form[action="/api/auth/login"] button[type="submit"]').click();

    await expect(page).toHaveURL(/\/login\?googleLink=1$/, { timeout: 15_000 });
    const action = page.getByRole("button", { name: /Continue with Google/i });
    await expect(action).toBeEnabled();
    const response = await page.request.post("/api/auth/google/start", {
      form: await googleStartFields(page),
      headers: { origin: new URL(page.url()).origin },
      maxRedirects: 0
    });

    expect(response.status()).toBe(303);
    expect(new URL(response.headers().location ?? "").origin).toBe("https://accounts.google.com");
    const setCookie = response.headers()["set-cookie"] ?? "";
    expect(setCookie).toContain("mais_google_oauth_state=");
    expect(setCookie).toContain("mais_google_link_reauth=");
    expect(setCookie).toContain("Max-Age=0");
  });

  test("confirmed same-origin student POST redirects to Google and direct GET stays blocked", async ({ request, baseURL }) => {
    const origin = new URL(baseURL ?? "http://127.0.0.1").origin;
    const response = await request.post("/api/auth/google/start", {
      form: {
        next: "/dashboard",
        role: "student",
        grade: "S4",
        curriculumTrack: "HK",
        publisher: "HK_UNITED_PRIME_MIA",
        language: "en",
        theme: "dark",
        setupConfirmed: "true",
        studentAge13OrOlder: "true"
      },
      headers: { origin },
      maxRedirects: 0
    });

    expect(response.status()).toBe(303);
    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location ?? "");
    expect(redirectUrl.origin).toBe("https://accounts.google.com");
    expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("scope")).toBe("openid email profile");
    expect(redirectUrl.searchParams.get("state")).toBeTruthy();
    expect(redirectUrl.searchParams.get("nonce")).toBeTruthy();
    expect(redirectUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(redirectUrl.searchParams.get("code_challenge_method")).toBe("S256");

    const cookie = response.headers()["set-cookie"] ?? "";
    expect(cookie).toContain("mais_google_oauth_state=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Max-Age=600");

    const bypass = await request.get(
      "/api/auth/google/start?role=student&grade=S4&publisher=HK_UNITED_PRIME_MIA",
      { maxRedirects: 0 }
    );
    expect(bypass.status()).toBe(307);
    const bypassLocation = new URL(bypass.headers().location ?? "", origin);
    expect(bypassLocation.pathname).toBe("/login");
    expect(bypassLocation.searchParams.get("googleError")).toBe("student_setup_required");
  });
});
