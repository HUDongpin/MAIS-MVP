import { expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";

export const demoStudent = {
  username: "HK Student Peter",
  password: "12345"
} as const;

export const demoTeacher = {
  username: "HK Teacher Chan",
  password: "12345"
} as const;

export const demoMainlandTeacher = {
  username: "Mainland Teacher Phoebe",
  password: "12345"
} as const;

export const demoParent = {
  username: "Peter's Parent",
  password: "12345"
} as const;

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

export async function openMobileMenuIfNeeded(page: Page) {
  const menu = page.getByRole("button", { name: /open mobile menu|開啟手機選單/i });
  if (await menu.isVisible().catch(() => false)) await menu.click();
}

export async function logoutIfVisible(page: Page) {
  await openMobileMenuIfNeeded(page);
  const logout = page.getByRole("button", { name: /log out|登出/i }).first();
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await expect(page).toHaveURL(/\/login/);
  }
}

export async function selectGrade(page: Page, grade: string) {
  await page.getByRole("radio", { name: new RegExp(`\\b${grade}\\b`, "i") }).first().click();
}

export async function loginAs(page: Page, username: string, password: string, expectedPath: RegExp | string) {
  await page.goto("/login");
  await page.getByLabel(/email or username|email or user name|user name/i).fill(username);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^log in$/i }).click();
  await expect(page).toHaveURL(expectedPath);
}

export async function loginAsDemoStudent(page: Page) {
  await loginAs(page, demoStudent.username, demoStudent.password, /\/dashboard/);
}

export async function loginAsTeacher(page: Page) {
  await loginAs(page, demoTeacher.username, demoTeacher.password, /\/teacher/);
}

export async function loginAsDemoParent(page: Page) {
  await loginAs(page, demoParent.username, demoParent.password, /\/parent/);
}

export async function registerStudent(page: Page, testInfo: TestInfo, grade = "S2") {
  const suffix = uniqueSuffix(testInfo);
  const student = {
    name: `E2E Student ${suffix}`,
    username: `e2e-${suffix}@example.test`,
    password: "start12345"
  };

  await page.goto("/register");
  await page.getByRole("radio", { name: /individual student/i }).click();
  await selectGrade(page, grade);
  await page.getByLabel(/student name/i).fill(student.name);
  await page.getByLabel(/email/i).fill(student.username);
  await page.getByLabel(/username|student id|user name/i).fill(student.username);
  await page.getByLabel(/^password$/i).fill(student.password);
  await page.getByLabel(/confirm password/i).fill(student.password);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  return student;
}

export async function expectDownloadFrom(page: Page, action: () => Promise<void>, filenamePattern: RegExp) {
  const downloadPromise = page.waitForEvent("download");
  await action();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(filenamePattern);
}
