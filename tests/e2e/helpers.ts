import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "../../lib/session";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3020);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export const demoStudent = {
  username: "HK Student Peter",
  password: "12345"
} as const;

export const demoTeacher = {
  username: "HK Teacher Chan",
  password: "12345"
} as const;

export const demoMainlandTeacher = {
  username: "Teacher Phoebe",
  password: "12345"
} as const;

export const demoParent = {
  username: "Peter's Parent",
  password: "12345"
} as const;

export const demoStudentUserId = "student-peter";
export const demoTeacherUserId = "teacher-ms-chan";
export const demoParentUserId = "parent-peter-family";

export function uniqueSuffix(testInfo: TestInfo) {
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const titleSlug = testInfo.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 36);
  return `${Date.now()}-${projectSlug}-${titleSlug}`;
}

export function fixturePath(fileName: string) {
  return path.join(process.cwd(), "tests", "e2e", "fixtures", fileName);
}

export function collectPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

export function expectNoPageErrors(errors: string[]) {
  expect(errors).toEqual([]);
}

const guestLoginPromptRouteKeys = ["lesson", "practice", "personalized-learning", "visualization"] as const;

/**
 * Pre-dismiss the guest login prompt (GuestLoginPromptGate) for every guarded
 * route so its delayed modal cannot intercept clicks in specs that browse those
 * surfaces as a guest. Uses the component's own sessionStorage dismissal
 * contract. The prompt's own behavior is covered by guest-login-prompt.spec.ts,
 * which must NOT call this. Must be called before the first navigation.
 */
export async function dismissGuestLoginPrompt(page: Page) {
  await page.addInitScript((keys: readonly string[]) => {
    try {
      for (const key of keys) {
        window.sessionStorage.setItem(`mais-guest-login-prompt-dismissed:${key}`, "true");
      }
    } catch {
      // Session storage may be unavailable; the prompt is non-blocking anyway.
    }
  }, guestLoginPromptRouteKeys);
}

export async function openMobileMenuIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: /open mobile menu|開啟手機選單/i });
  if (await menu.isVisible().catch(() => false)) await menu.click();
}

export async function closeLearnerStartSetupIfVisible(page: Page) {
  const closeSetup = page.getByRole("button", { name: /close 15-second setup|關閉 15 秒設定|关闭 15 秒设置/i }).first();
  await closeSetup.waitFor({ state: "visible", timeout: 1000 }).catch(() => undefined);
  if (!(await closeSetup.isVisible().catch(() => false))) return;

  await page.request.patch("/api/me/learner-profile", {
    data: {
      status: "skipped",
      answers: {
        goal: "repair",
        challenge: "balanced",
        help: "hint"
      }
    }
  }).catch(() => undefined);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog", { name: /comfortable way to start|舒服的開始方式|舒服的开始方式/i }))
    .toBeHidden({ timeout: 5000 })
    .catch(() => undefined);
}

export async function logoutIfVisible(page: Page) {
  await closeLearnerStartSetupIfVisible(page);
  await openMobileMenuIfNeeded(page);
  const logoutButtons = page.getByRole("button", { name: /log out|登出/i });
  const count = await logoutButtons.count();

  for (let index = count - 1; index >= 0; index -= 1) {
    const logout = logoutButtons.nth(index);
    if (!(await logout.isVisible().catch(() => false))) continue;
    await logout.click();
    await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
    return;
  }
}

export async function selectGrade(page: Page, grade: string) {
  const gradeRadio = page.getByRole("radio", { name: new RegExp(`\\b${grade}\\b`, "i") }).first();
  if (!(await gradeRadio.isVisible().catch(() => false))) {
    const gradeStep = page.getByRole("button", { name: /(?:^|\b)(?:\d+\.\s*)?Grade\b/i }).first();
    if (await gradeStep.isVisible().catch(() => false)) await gradeStep.click();
  }
  if (await gradeRadio.isVisible().catch(() => false)) {
    await gradeRadio.click();
    return;
  }

  const gradeButton = page.getByRole("button", { name: new RegExp(`^${grade}\\b`, "i") }).first();
  await gradeButton.click();
}

// Practice Arena hides the Grade/Difficulty/Topic/Question-type selects behind a
// collapsed "Filters" toggle. Open it before interacting with those comboboxes.
export async function openPracticeFiltersPanel(page: Page) {
  const toggle = page.getByRole("button", { name: /^Filters$/i });
  try {
    // The toggle only mounts once free selection resolves, which can lag networkidle.
    await toggle.waitFor({ state: "visible", timeout: 5000 });
  } catch {
    return; // Adaptive mode, or free selection is not unlocked yet: nothing to open.
  }
  if ((await toggle.getAttribute("aria-expanded")) === "true") return;
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
}

export function registrationRoleRadio(page: Page, role: "parent" | "student" | "teacher") {
  return page.getByRole("radio", { name: new RegExp(`^\\s*(?:✓\\s*)?${role}`, "i") }).first();
}

export function loginSubmitButton(page: Page) {
  return page.locator('form button[type="submit"]').last();
}

export async function clickLoginSubmit(page: Page) {
  const submit = loginSubmitButton(page);
  await expect(submit).toBeEnabled({ timeout: 15_000 });
  // The login form deliberately ignores submits until client hydration finishes.
  // On slower CI runners the button can become actionable at the browser layer
  // before the React submit handler is ready, leaving the page silently on /login.
  await expect(submit).not.toHaveText(
    /Preparing secure login|準備安全登入|准备安全登录/i,
    { timeout: 15_000 }
  );
  await submit.click();
}

async function selectRegistrationCurriculum(page: Page, publisher = "HK_UNITED_PRIME_MIA") {
  const curriculumStep = page.getByRole("button", { name: /Curriculum/i }).first();
  if (await curriculumStep.isVisible().catch(() => false)) await curriculumStep.click();

  const curriculumSelect = page.getByLabel(/Saved curriculum|Selected curriculum/i).first();
  if (await curriculumSelect.isVisible().catch(() => false)) {
    await curriculumSelect.selectOption(publisher);
  }
}

export async function loginAs(page: Page, username: string, password: string, expectedPath: RegExp | string) {
  await page.goto("/login");
  await page.getByLabel(/email or username|email or user name|user name/i).fill(username);
  await page.getByLabel(/^password$/i).fill(password);
  await clickLoginSubmit(page);
  await expect(page).toHaveURL(expectedPath, { timeout: 15000 });
}

export async function loginAsDemoStudent(page: Page) {
  await loginAs(page, demoStudent.username, demoStudent.password, /\/dashboard/);
}

function ensureDefaultE2eSessionSecret() {
  process.env.AUTH_SESSION_SECRET ||= "e2e-session-secret";
}

export async function sessionCookieHeaderForUserId(userId: string) {
  ensureDefaultE2eSessionSecret();
  const token = await createSessionToken(userId);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

export async function authenticateAsUserId(page: Page, userId: string) {
  ensureDefaultE2eSessionSecret();
  const token = await createSessionToken(userId);
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: baseURL.startsWith("https://"),
      expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS
    }
  ]);
}

export async function authenticateAsDemoStudent(page: Page) {
  await authenticateAsUserId(page, demoStudentUserId);
}

export async function authenticateAsTeacher(page: Page) {
  await authenticateAsUserId(page, demoTeacherUserId);
}

export async function authenticateAsDemoParent(page: Page) {
  await authenticateAsUserId(page, demoParentUserId);
}

export function isTransientApiTransportError(error: unknown) {
  return error instanceof Error && /ECONNRESET|ECONNREFUSED|ECONNABORTED|socket hang up/i.test(error.message);
}

export async function loginAsDemoStudentApi(page: Page) {
  await authenticateAsDemoStudent(page);
}

export async function loginAsTeacher(page: Page) {
  await authenticateAsTeacher(page);
  await page.goto("/teacher/dashboard");
  await expect(page).toHaveURL(/\/teacher\/dashboard/);
}

export async function loginAsDemoParent(page: Page) {
  await authenticateAsDemoParent(page);
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/parent/);
}

export async function registerStudentApi(page: Page, testInfo: TestInfo, grade = "S2") {
  const suffix = uniqueSuffix(testInfo);
  const student = {
    name: `E2E Student ${suffix}`,
    username: `e2e-${suffix}@example.test`,
    password: "start12345"
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await page.request.post(`${baseURL}/api/auth/register`, {
        data: {
          role: "student",
          name: student.name,
          username: student.username,
          email: student.username,
          password: student.password,
          grade,
          curriculumTrack: "HK",
          curriculumProfile: {
            region: "HK",
            publisher: "HK_UNITED_PRIME_MIA"
          },
          language: "en",
          theme: "dark"
        }
      });
      expect(response.ok(), `student API registration failed with ${response.status()}: ${await response.text()}`).toBeTruthy();
      return student;
    } catch (error) {
      lastError = error;
      if (attempt === 3 || !isTransientApiTransportError(error)) throw error;
      await page.waitForTimeout(350 * attempt);
    }
  }

  throw lastError;
}

export async function registerStudent(page: Page, testInfo: TestInfo, grade = "S2") {
  const suffix = uniqueSuffix(testInfo);
  const student = {
    name: `E2E Student ${suffix}`,
    username: `e2e-${suffix}@example.test`,
    password: "start12345"
  };

  await page.goto("/register");
  const studentRole = registrationRoleRadio(page, "student");
  if (await studentRole.getAttribute("aria-checked") !== "true") {
    await studentRole.click();
  }
  await selectRegistrationCurriculum(page);
  await selectGrade(page, grade);
  const detailsStep = page.getByRole("button", { name: /Account details|Details/i }).first();
  if (await detailsStep.isVisible().catch(() => false)) await detailsStep.click();
  await expect(page.getByRole("region", { name: /Account details/i })).toBeVisible();
  await page.getByLabel(/student name/i).fill(student.name);
  await page.getByLabel(/email/i).fill(student.username);
  await page.getByLabel(/username|student id|user name/i).fill(student.username);
  await page.getByLabel(/^password$/i).fill(student.password);
  await page.getByLabel(/^confirm password$/i).fill(student.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  return student;
}

export async function expectDownloadFrom(page: Page, action: () => Promise<void>, filenamePattern: RegExp) {
  const downloadPromise = page.waitForEvent("download");
  await action();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(filenamePattern);
}
