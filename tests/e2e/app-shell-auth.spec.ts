import { expect, test, type Page, type TestInfo } from "@playwright/test";
import {
  clickLoginSubmit,
  collectPageErrors,
  expectNoPageErrors,
  loginAs,
  loginAsDemoStudent,
  loginSubmitButton,
  logoutIfVisible,
  openMobileMenuIfNeeded,
  registerStudent,
  registrationRoleRadio,
  uniqueSuffix
} from "./helpers";

async function registerStudentThroughApi(page: Page, testInfo: TestInfo, grade = "S5") {
  const suffix = `${grade.toLowerCase()}-${uniqueSuffix(testInfo)}`;
  const student = {
    name: `Auth Grade Lock ${suffix}`,
    username: `auth-grade-lock-${suffix}`,
    password: "AuthGradeLock123!",
    email: `auth-grade-lock-${suffix}@example.test`,
    grade,
  };

  const response = await page.request.post("/api/auth/register", {
    data: {
      role: "student",
      name: student.name,
      username: student.username,
      email: student.email,
      password: student.password,
      grade: student.grade,
      curriculumProfile: {
        region: "HK",
        publisher: "HK_UNITED_PRIME_MIA",
      },
      curriculumTrack: "HK",
      language: "en",
      theme: "dark",
    },
  });

  expect(response.status(), await response.text()).toBe(200);
  await page.request.post("/api/auth/logout");
  return student;
}

test.describe("app shell, preferences, and auth", () => {
  test("guest shell, preferences, mobile navigation, protected redirects, and 404 work", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: /MAIS Personalized interactive math learning|Math learning should be\s*fun and personalized/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /MAIS/i }).first()).toHaveAttribute("href", "/");

    await page.getByRole("button", { name: /Language selector|語言選擇|语言选择/i }).click();
    await page.getByRole("menuitemradio", { name: /Use Traditional Chinese|使用繁體中文|使用繁体中文/i }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hant-HK");
    const wasDark = (await page.locator("html").getAttribute("class") ?? "").includes("dark");
    await page.getByRole("button", { name: /切換至深色模式|切換至淺色模式|Switch to dark mode|Switch to light mode/i }).click();
    if (wasDark) {
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    } else {
      await expect(page.locator("html")).toHaveClass(/dark/);
    }

    await openMobileMenuIfNeeded(page);
    await page.getByRole("link", { name: /個人化學習|Personalized Learning/i }).first().click();
    await expect(page).toHaveURL(/\/personalized-learning/);

    await page.goto("/progress");
    await expect(page).toHaveURL(/\/login\?next=%2Fprogress/);
    await expect(page.getByText(/登入後即可查看|Log in to view your saved progress/i)).toBeVisible();

    await page.goto("/definitely-not-a-real-route");
    await openMobileMenuIfNeeded(page);
    await expect(page.getByRole("link", { name: /個人化學習|Personalized Learning/i }).first()).toBeVisible();

    expectNoPageErrors(pageErrors);
  });

  test("registration, invalid login, registered student login, demo student login, and logout work", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const suffix = uniqueSuffix(testInfo);

    const student = await registerStudent(page, testInfo, "S5");
    await logoutIfVisible(page);

    await page.goto("/login");
    await expect(page.getByLabel(/email or username/i)).toHaveValue("");
    await page.getByLabel(/email or username/i).fill(`missing-${suffix}@example.test`);
    await page.getByLabel(/^password$/i).fill("bad-password");
    await clickLoginSubmit(page);
    await expect(page.getByText(/Check your email\/username and password/i)).toBeVisible();

    await page.getByLabel(/email or username/i).fill(student.username);
    await page.getByLabel(/^password$/i).fill(student.password);
    await clickLoginSubmit(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: new RegExp(`Welcome back, ${student.name}`, "i") })).toBeVisible();
    await page.waitForTimeout(900);
    await expect(page.getByRole("dialog", { name: /comfortable way to start|舒服的開始方式|舒服的开始方式/i }))
      .toBeHidden();
    await logoutIfVisible(page);

    await loginAsDemoStudent(page);
    await expect(page.getByRole("heading", { name: /Welcome back, HK Student Peter|歡迎回來，?\s*彼得同學|欢迎回来，?\s*彼得同学/i })).toBeVisible();
    await logoutIfVisible(page);

    expectNoPageErrors(pageErrors);
  });

  test("registered student grade stays fixed after login", async ({ page }, testInfo) => {
    const pageErrors = collectPageErrors(page);
    const student = await registerStudentThroughApi(page, testInfo, "S5");

    await page.goto("/login");
    await page.locator("#login-grade").selectOption("S1");
    await page.getByLabel(/email or username/i).fill(student.username);
    await page.getByLabel(/^password$/i).fill(student.password);
    await clickLoginSubmit(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

    const sessionResponse = await page.request.get("/api/me");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json() as { user?: { grade?: string }; settings?: { selectedGrade?: string } };
    const fixedGrade = session.user?.grade;
    expect(fixedGrade).toMatch(/^S[1-6]$/);
    expect(session.settings?.selectedGrade).toBe(fixedGrade);
    await expect(page.getByTestId(`dashboard-grade-${fixedGrade}`)).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId(`dashboard-grade-${fixedGrade}`)).toBeDisabled();
    await expect(page.getByTestId("dashboard-grade-S1")).toBeDisabled();
    await expect(page.getByTestId("dashboard-grade-S4")).toBeDisabled();

    expectNoPageErrors(pageErrors);
  });

  test("US CA student example account logs in immediately without exposing passwords", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await page.goto("/login?next=%2Fdashboard");

    await expect(page.getByText("HK Student Peter / 12345")).toHaveCount(0);
    await expect(page.getByText("HK Teacher Chan / 12345")).toHaveCount(0);
    await expect(page.getByText("Teacher Scott / 12345")).toHaveCount(0);
    await expect(page.getByText("Student Shirleen / 12345")).toHaveCount(0);

    await expect(loginSubmitButton(page)).toBeEnabled({ timeout: 15_000 });
    const demoButton = page.getByRole("button", { name: /Use example account: Student Shirleen/i });
    await expect(demoButton).toBeEnabled();
    const loginResponse = page.waitForResponse((response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST"
    );
    await demoButton.click();
    const response = await loginResponse;
    expect(response.status(), await response.text()).toBe(200);

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 });
    const sessionResponse = await page.request.get("/api/me?includeLessonEntry=false");
    expect(sessionResponse.ok()).toBeTruthy();
    const session = await sessionResponse.json() as { user?: { username?: string; curriculumTrack?: string }; settings?: { selectedGrade?: string } };
    expect(session.user?.username).toBe("Student Shirleen");
    expect(session.user?.curriculumTrack).toBe("US_CA_MATH");
    expect(session.settings?.selectedGrade).toBe("P1");
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
    const parentRole = registrationRoleRadio(page, "parent");
    await parentRole.click();
    await expect(parentRole).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: /Account details|Details/i }).last().click();
    await expect(page.getByLabel(/parent name/i)).toBeVisible();
    await page.getByLabel(/parent name/i).fill(parent.name);
    await page.getByLabel(/^email$/i).fill(parent.email);
    await page.getByLabel(/^password$/i).fill(parent.password);
    await page.getByLabel(/^confirm password$/i).fill(parent.password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/parent\/connect/);
    await expect(page.getByRole("heading", { name: /Use a parent invite code/i })).toBeVisible();

    await logoutIfVisible(page);
    await page.getByLabel(/email or username/i).fill(parent.email);
    await page.getByLabel(/^password$/i).fill(parent.password);
    await clickLoginSubmit(page);
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
