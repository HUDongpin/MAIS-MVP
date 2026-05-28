import { expect, test } from "@playwright/test";
import {
  expectDownloadFrom,
  fixturePath,
  loginAsTeacher,
  uniqueSuffix
} from "./helpers";

test.describe.serial("teacher workspace frontend workflows", () => {
  test("teacher navigation, search, class creation, resources, and assessments work", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo);
    const shortSuffix = suffix.slice(0, 18);
    const className = `E2E S4 Clinic ${shortSuffix}`;
    const resourceTitle = `E2E PDF ${shortSuffix}`;
    const assessmentTitle = `E2E quiz ${shortSuffix}`;

    await loginAsTeacher(page);
    await expect(page.getByRole("navigation", { name: /Teacher navigation/i })).toBeVisible();

    const routes = [
      ["/teacher", /Teacher Console|Class command center/i],
      ["/teacher/classes", /Class and student management/i],
      ["/teacher/analytics", /Class insight and intervention/i],
      ["/teacher/rewards", /Rewards and gift redemptions/i],
      ["/teacher/live", /Live classroom|Start a classroom check/i],
      ["/teacher/assignments", /Assignment distribution/i],
      ["/teacher/resources", /Teaching resources and papers/i],
      ["/teacher/assessments", /Quiz, test, and mock exam management/i],
      ["/teacher/reports", /Bilingual learning reports/i],
      ["/teacher/inbox", /^Inbox$/i]
    ] as const;

    for (const [route, visibleText] of routes) {
      await page.goto(route);
      await expect(page.getByText(visibleText).first()).toBeVisible();
    }

    await page.goto("/teacher");
    await page.getByPlaceholder(/Search students, assignments, resources/i).fill("quadratic");
    await page.getByPlaceholder(/Search students, assignments, resources/i).press("Enter");
    await expect(page).toHaveURL(/\/teacher\?q=quadratic/);
    await page.getByLabel(/Class focus/i).selectOption("class-s3a-2026");
    await expect(page).toHaveURL(/classId=class-s3a-2026/);

    await page.goto("/teacher/classes");
    const classSection = page.locator("section").filter({ hasText: /Class and student management/i }).first();
    await classSection.getByLabel(/Class name/i).fill(className);
    await classSection.getByLabel(/Grade/i).selectOption("S4");
    await classSection.getByLabel(/Academic year/i).fill("2026-2027");
    await classSection.getByLabel(/Notes/i).fill("Created by frontend e2e coverage.");
    const createClassResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/classes") && response.request().method() === "POST"
    );
    await classSection.getByRole("button", { name: /^Create$/i }).click({ force: true });
    expect((await createClassResponse).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByRole("link", { name: new RegExp(className, "i") })).toBeVisible();

    await page.goto("/teacher/resources");
    const uploadSection = page.locator("section").filter({ hasText: /Upload resource/i }).first();
    await uploadSection.getByLabel(/Title/i).fill(resourceTitle);
    await uploadSection.getByLabel(/Grade/i).selectOption("S3");
    await uploadSection.getByLabel(/Type/i).selectOption("worksheet");
    await uploadSection.getByLabel(/Difficulty/i).selectOption("Core");
    await uploadSection.locator('input[name="file"]').setInputFiles(fixturePath("sample-resource.pdf"));
    const uploadResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/resources") && response.request().method() === "POST"
    );
    await uploadSection.getByRole("button", { name: /Upload/i }).click();
    expect((await uploadResponse).ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText(resourceTitle)).toBeVisible();
    await page.getByLabel(/Recent/i).check();
    const uploadedResourceRow = page.locator("tr").filter({ hasText: resourceTitle }).first();
    await expect(uploadedResourceRow).toBeVisible();
    await expectDownloadFrom(page, () => uploadedResourceRow.getByRole("link", { name: /Download/i }).click(), /sample-resource\.pdf/);

    await page.goto("/teacher/assessments/new");
    await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
    await page.getByRole("combobox", { name: /Assessment type/i }).selectOption("quiz");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assessmentTitle);
    await page.getByRole("spinbutton", { name: /Time limit/i }).fill("20");
    await page.getByRole("spinbutton", { name: /Weight/i }).fill("15");
    await page.getByRole("spinbutton", { name: /Attempts/i }).fill("2");
    await page.getByRole("button", { name: /^Create assessment$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assessments\/assessment-/);
    await expect(page.getByRole("heading", { name: new RegExp(assessmentTitle, "i") })).toBeVisible();
    await expect(page.getByText(/Score distribution/i)).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click(), /assessment-.*-scores\.csv/);

  });

  test("teacher assignments, analytics, live classroom, reports, and inbox actions work", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo);
    const assignmentTitle = `E2E lesson assignment ${suffix}`;

    await loginAsTeacher(page);

    await page.goto("/teacher/assignments/new");
    await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
    await page.getByRole("combobox", { name: /Content type/i }).selectOption("lesson");
    await page.getByRole("textbox", { name: /^Title$/i }).fill(assignmentTitle);
    await page.getByRole("textbox", { name: /Target ID/i }).fill("quadratic-functions");
    await page.getByRole("textbox", { name: /Description/i }).fill("Frontend e2e grading coverage.");
    await page.getByRole("button", { name: /^Create assignment$/i }).click();
    await expect(page).toHaveURL(/\/teacher\/assignments\/assignment-/);
    await expect(page.getByRole("heading", { name: new RegExp(assignmentTitle, "i") })).toBeVisible();
    const submissionRow = page.locator("tr").filter({ hasText: /HK Student Peter/i }).first();
    await submissionRow.locator("input").fill("88");
    await submissionRow.getByRole("button", { name: /Save/i }).click();
    await expect(submissionRow.getByText("88")).toBeVisible();

    await page.goto("/teacher/analytics");
    await expect(page.getByRole("heading", { name: /Class insight and intervention/i })).toBeVisible();
    await expect(page.getByText(/Topic mastery heatmap/i)).toBeVisible();
    const followUp = page.getByRole("button", { name: /Create follow-up/i }).first();
    if (await followUp.isVisible().catch(() => false)) {
      await followUp.click();
      await expect(page.getByRole("button", { name: /Added/i }).first()).toBeVisible();
    }

    await page.goto("/teacher/live");
    await expect(page.getByRole("heading", { name: /quadratic checkpoint|Start a classroom check/i })).toBeVisible();
    if (await page.getByText(/Join code/i).first().isVisible().catch(() => false)) {
      await expect(page.getByRole("link", { name: /Open student view/i })).toHaveAttribute("href", /\/classroom\?code=/);
    } else {
      await page.getByRole("combobox", { name: /^Class$/i }).selectOption("class-s3a-2026");
      await page.getByRole("textbox", { name: /Question/i }).fill("Which option shows the next step?");
      await page.getByRole("textbox", { name: /Topic ID/i }).fill("quadratic-patterns");
      await page.getByRole("button", { name: /^Start$/i }).click();
      await expect(page.getByText(/Join code/i).first()).toBeVisible();
    }
    const studentViewLink = page.getByRole("link", { name: /Open student view/i });
    await expect(studentViewLink).toHaveAttribute("href", /\/classroom\?code=/);
    await studentViewLink.click();
    await expect(page.getByRole("heading", { name: /Join live classroom/i })).toBeVisible();
    await expect(page.getByText(/Teacher preview/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^A ·/i }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: /Preview only/i })).toBeDisabled();

    await page.goto("/teacher/reports");
    await page.getByRole("combobox", { name: /^Type$/i }).selectOption("student");
    await page.getByRole("combobox", { name: /Language/i }).selectOption("en");
    await page.getByRole("textbox", { name: /Teacher remarks/i }).fill("Keep practising vertex form and explain each graph move.");
    await expect(page.getByText(/Teacher remarks/i).last()).toBeVisible();
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export CSV/i }).click({ force: true }), /student-report-.*\.csv/);
    await expectDownloadFrom(page, () => page.getByRole("link", { name: /Export PDF/i }).click({ force: true }), /student-report-.*\.pdf/);
    await page.getByRole("button", { name: /Save report/i }).click({ force: true });
    await expect(page.getByText(/Report saved to history/i)).toBeVisible();

    await page.goto("/teacher/inbox");
    await expect(page.getByRole("heading", { name: /^Inbox$/i })).toBeVisible();
    await page.getByRole("button", { name: /Draft reply/i }).click();
    const replyBox = page.getByPlaceholder(/Reply to the student/i);
    await expect(replyBox).not.toBeEmpty();
    const starToggle = page.getByRole("button", { name: /Star|Unstar/i });
    await starToggle.click();
    await page.getByRole("button", { name: /Resolve|Reopen/i }).click();
    await page.getByRole("button", { name: /Send reply/i }).click();
    await expect(replyBox).toBeEmpty();

  });
});
