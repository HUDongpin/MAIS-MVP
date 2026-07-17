import { expect, test, type Page } from "@playwright/test";
import { collectPageErrors, expectNoPageErrors, loginAsDemoStudent, loginAsTeacher } from "./helpers";

type ConsoleRoute = {
  path: string;
  heading: RegExp;
  label: string;
};

const studentRoutes: ConsoleRoute[] = [
  { path: "/dashboard", heading: /Welcome back,\s*HK Student Peter/i, label: "student dashboard" },
  { path: "/personalized-learning", heading: /Knowledge galaxy/i, label: "personalized learning" },
  { path: "/progress", heading: /^Progress$/i, label: "progress" },
  { path: "/student/roadmap", heading: /Learning Path/i, label: "learning path" },
  { path: "/student/roadmap/primary", heading: /Primary Math Subway Map/i, label: "primary roadmap" },
  { path: "/student/roadmap/secondary", heading: /Secondary Math Subway Map/i, label: "secondary roadmap" },
  { path: "/student/lessons/quadratic-functions", heading: /How coefficients shape a parabola/i, label: "lesson" },
  { path: "/practice", heading: /Practice Arena/i, label: "practice arena" },
  { path: "/mistake-book", heading: /Mistake Book/i, label: "mistake book" },
  { path: "/student/tools/visualizations", heading: /Visualization Lab/i, label: "visualization lab" },
  { path: "/messages", heading: /Ask your teacher/i, label: "student messages" },
  { path: "/classroom/join", heading: /Join a teacher class/i, label: "join class" },
  { path: "/classroom?code=S3A82", heading: /Join live classroom/i, label: "live classroom student view" },
  { path: "/student/assessments/assessment-s3-algebra-quiz", heading: /S3 algebra readiness quiz/i, label: "assigned assessment" }
];

const teacherRoutes: ConsoleRoute[] = [
  { path: "/teacher", heading: /Today.?s teaching queue/i, label: "teacher overview" },
  { path: "/teacher/classes", heading: /Class and student management/i, label: "classes" },
  { path: "/teacher/classes/class-s3a-2026", heading: /S3A Mathematics/i, label: "class detail" },
  { path: "/teacher/students/student-peter", heading: /HK Student Peter/i, label: "student profile" },
  { path: "/teacher/analytics", heading: /Class insight and intervention/i, label: "analytics" },
  { path: "/teacher/rewards", heading: /Rewards and gift redemptions/i, label: "rewards" },
  { path: "/teacher/live", heading: /S3A quadratic checkpoint|Start a classroom check/i, label: "live classroom" },
  { path: "/teacher/assignments", heading: /Assignment distribution/i, label: "assignments" },
  { path: "/teacher/assignments/new", heading: /Create assignment/i, label: "new assignment" },
  { path: "/teacher/assignments/assignment-quadratics-checkpoint", heading: /Quadratic functions checkpoint/i, label: "assignment detail" },
  { path: "/teacher/resources", heading: /Teaching resources and papers/i, label: "resources" },
  { path: "/teacher/assessments", heading: /Quiz, test, and mock exam management/i, label: "assessments" },
  { path: "/teacher/assessments/new", heading: /Create assessment/i, label: "new assessment" },
  { path: "/teacher/assessments/assessment-s3-algebra-quiz", heading: /S3 algebra readiness quiz/i, label: "assessment detail" },
  { path: "/teacher/reports", heading: /Bilingual learning reports/i, label: "reports" },
  { path: "/teacher/inbox", heading: /^Inbox$/i, label: "inbox" }
];

async function expectUsableRoute(page: Page, route: ConsoleRoute) {
  const response = await page.goto(route.path);
  expect(response?.status(), `${route.label} should not return HTTP error`).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: route.heading }).first(), `${route.label} heading`).toBeVisible();
  await expect(page.getByRole("heading", { name: /This page is not available|Page not found/i })).toHaveCount(0);
  await expect(page.locator("main"), `${route.label} should expose one main landmark`).toHaveCount(1);
  const mainText = await page.locator("main").innerText();
  expect(mainText.trim().length, `${route.label} should not render a blank main area`).toBeGreaterThan(40);
}

test.describe.serial("console readonly audit", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Full route matrix runs once; responsive UX has its own suite.");
  });

  test("student console routes render without not-found, blank, or page-error states", async ({ page }) => {
    const pageErrors = collectPageErrors(page);

    await loginAsDemoStudent(page);
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toContainText(/Lesson/);
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toContainText(/Personalized Learning/);
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toContainText(/Visualization Lab/);
    await expect(page.getByRole("navigation", { name: /Main navigation/i })).toContainText(/Practice Arena/);

    for (const route of studentRoutes) await expectUsableRoute(page, route);

    expectNoPageErrors(pageErrors);
  });

  test("teacher console routes render without not-found, blank, or page-error states", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    const expectedTeacherNav = ["Overview", "Classes", "Analytics", "Rewards", "Live", "Assignments", "Resources", "Assessments", "Reports", "Inbox"];

    await loginAsTeacher(page);
    const teacherNav = page.getByRole("navigation", { name: /Teacher navigation/i });
    await expect(teacherNav).toBeVisible();
    for (const label of expectedTeacherNav) await expect(teacherNav).toContainText(label);

    for (const route of teacherRoutes) await expectUsableRoute(page, route);

    expectNoPageErrors(pageErrors);
  });
});
