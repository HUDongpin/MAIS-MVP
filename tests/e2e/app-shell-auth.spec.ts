import { expect, test } from "@playwright/test";
import {
  collectPageErrors,
  expectNoPageErrors,
  loginAs,
  loginAsDemoStudent,
  openMobileMenuIfNeeded,
  registerStudent,
  selectGrade,
  uniqueSuffix
} from "./helpers";

test.describe("app shell, preferences, and auth", () => {
  test("guest shell, preferences, mobile navigation, protected redirects, and 404 work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /MAIS/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /MAIS/i }).first()).toHaveAttribute("href", "/");

    await page.getByRole("button", { name: /使用繁體中文|使用中文/ }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-HK");
    await page.getByRole("button", { name: /切換至淺色模式|Switch to light mode/i }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /適性學習|Adaptive Learning/i }).first().click();
    await expect(page).toHaveURL(/\/adaptive-learning/);

    await page.goto("/progress");
    await expect(page).toHaveURL(/\/login\?next=%2Fprogress/);
    await expect(page.getByText(/登入後即可查看|Log in to view your saved progress/i)).toBeVisible();

    await page.goto("/definitely-not-a-real-route");
    await expect(page.getByRole("link", { name: /適性學習|Adaptive Learning/i }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("registration, invalid login, registered student login, demo student login, and logout work", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo);

    const student = await registerStudent(page, testInfo, "S5");
    await openMobileMenuIfNeeded(page);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/login");
    await expect(page.getByLabel(/email or username/i)).toHaveValue("");
    await page.getByLabel(/email or username/i).fill(`missing-${suffix}@example.test`);
    await page.getByLabel(/^password$/i).fill("bad-password");
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page.getByText(/Check your email\/username and password/i)).toBeVisible();

    await page.getByLabel(/email or username/i).fill(student.username);
    await page.getByLabel(/^password$/i).fill(student.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${student.name}`, "i") })).toBeVisible();
    await openMobileMenuIfNeeded(page);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await loginAsDemoStudent(page);
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter/i })).toBeVisible();
    await openMobileMenuIfNeeded(page);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    expectNoPageErrors(pageErrors);
  });

  test("student grade chosen before login stays fixed after login", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const student = await registerStudent(page, testInfo, "S5");

    await openMobileMenuIfNeeded(page);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await selectGrade(page, "S2");
    await page.getByLabel(/email or username/i).fill(student.username);
    await page.getByLabel(/^password$/i).fill(student.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const sessionResponse = await page.request.get("/api/me");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json() as { user?: { grade?: string }; settings?: { selectedGrade?: string } };
    expect(session.user?.grade).toBe("S2");
    expect(session.settings?.selectedGrade).toBe("S2");
    await expect(page.getByTestId("dashboard-grade-S2")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("dashboard-grade-S2")).toBeDisabled();
    await expect(page.getByTestId("dashboard-grade-S4")).toBeDisabled();

    expectNoPageErrors(pageErrors);
  });

  test("parent registration opens child connection and parent login accepts email", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo);
    const parent = {
      name: `E2E Parent ${suffix}`,
      email: `parent-${suffix}@example.test`,
      password: "start12345"
    };

    await page.goto("/register");
    await expect(page.getByRole("radio", { name: /parent/i })).toHaveAttribute("aria-checked", "true");
    await page.getByLabel(/parent name/i).fill(parent.name);
    await page.getByLabel(/^email$/i).fill(parent.email);
    await page.getByLabel(/^password$/i).fill(parent.password);
    await page.getByLabel(/confirm password/i).fill(parent.password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/parent\/connect/);
    await expect(page.getByRole("heading", { name: /Use a parent invite code/i })).toBeVisible();

    await openMobileMenuIfNeeded(page);
    await page.getByRole("button", { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel(/email or username/i).fill(parent.email);
    await page.getByLabel(/^password$/i).fill(parent.password);
    await page.getByRole("button", { name: /^log in$/i }).click();
    await expect(page).toHaveURL(/\/parent/);

    expectNoPageErrors(pageErrors);
  });

  test("teacher login routes to the teacher workspace", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAs(page, "HK Teacher Chan", "12345", /\/teacher/);
    await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Overview/i })).toHaveAttribute("aria-current", "page");

    expectNoPageErrors(pageErrors);
  });
});
