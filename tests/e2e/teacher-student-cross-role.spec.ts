import { expect, test } from "@playwright/test";
import { loginAs, loginAsTeacher, logoutIfVisible, registerStudent, uniqueSuffix } from "./helpers";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe.serial("teacher-student cross-role workflows", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Cross-role write suite uses local/staging data and runs once.");
  });

  test("class join, assignment completion, grading visibility, and messaging stay synchronized", async ({ page }, testInfo) => {
    test.slow();
    const suffix = uniqueSuffix(testInfo).slice(0, 28);
    const className = `QA S3 Console ${suffix}`;
    const assignmentTitle = `QA lesson assignment ${suffix}`;
    const messageSubject = `QA help request ${suffix}`;
    const teacherReply = `QA reply ${suffix}: show the vertex step first.`;

    const student = await registerStudent(page, testInfo, "S3");
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    const classResponse = await page.request.post("/api/teacher/classes", {
      data: {
        name: className,
        grade: "S3",
        academicYear: "2026-2027",
        description: "Created by teacher-student cross-role QA."
      }
    });
    expect(classResponse.ok()).toBeTruthy();
    const classPayload = (await classResponse.json()) as { class: { id: string; inviteCode: string } };
    await logoutIfVisible(page);

    await loginAs(page, student.username, student.password, /\/dashboard/);
    await page.goto("/classroom/join");
    await page.getByPlaceholder(/Invite code/i).fill(classPayload.class.inviteCode);
    await page.getByRole("button", { name: /^Join$/i }).click();
    await expect(page.getByText(new RegExp(`Joined ${escapeRegex(className)}`, "i"))).toBeVisible();

    await page.goto("/messages");
    await page.getByPlaceholder(/Subject/i).fill(messageSubject);
    await page.getByPlaceholder(/What would you like help with/i).fill("Can you check my first graphing step?");
    await page.getByRole("button", { name: /Send message/i }).click({ force: true });
    await expect(page.getByText(/Message sent/i)).toBeVisible();
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    await page.goto(`/teacher/classes/${classPayload.class.id}`);
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(className), "i") })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(student.name), "i") })).toBeVisible();

    await page.goto("/teacher/inbox");
    const teacherThread = page.getByRole("link", { name: new RegExp(escapeRegex(messageSubject), "i") });
    await expect(teacherThread).toBeVisible();
    await teacherThread.click();
    await expect(page.getByRole("heading", { name: new RegExp(escapeRegex(messageSubject), "i") })).toBeVisible();
    await page.getByPlaceholder(/Reply to the student/i).fill(teacherReply);
    await page.getByRole("button", { name: /Send reply/i }).click();
    await expect(page.getByPlaceholder(/Reply to the student/i)).toBeEmpty();

    const assignmentResponse = await page.request.post("/api/teacher/assignments", {
      data: {
        classId: classPayload.class.id,
        title: assignmentTitle,
        description: "Complete the linked lesson from the QA assignment.",
        contentType: "lesson",
        targetId: "quadratic-functions",
        allowRetake: true,
        showAnswers: false,
        countTowardsGrade: true
      }
    });
    expect(assignmentResponse.ok()).toBeTruthy();
    const assignmentPayload = (await assignmentResponse.json()) as { assignment: { id: string } };
    await page.goto(`/teacher/assignments/${assignmentPayload.assignment.id}`);
    const newSubmissionRow = page.locator("tr").filter({ hasText: student.name }).first();
    await expect(newSubmissionRow).toContainText(/not-started/i);
    await logoutIfVisible(page);

    await loginAs(page, student.username, student.password, /\/dashboard/);
    await page.goto("/messages");
    const studentThread = page.getByRole("button", { name: new RegExp(escapeRegex(messageSubject), "i") });
    if (await studentThread.isVisible().catch(() => false)) await studentThread.click();
    await expect(page.locator("main").getByText(teacherReply).last()).toBeVisible();

    await page.goto("/adaptive-learning");
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
    await page.goto("/lesson/quadratic-functions");
    await page.locator('input[type="checkbox"]').first().check();
    await page.getByRole("button", { name: /Mark lesson complete/i }).click();
    await expect(page.getByText(/Mastery: 85%|Mastery: 100%/i)).toBeVisible();
    await page.goto("/adaptive-learning");
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toContainText(/graded/i);
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    await page.goto(`/teacher/assignments/${assignmentPayload.assignment.id}`);
    const completedSubmissionRow = page.locator("tr").filter({ hasText: student.name }).first();
    await expect(completedSubmissionRow).toContainText(/graded/i);
    await expect(completedSubmissionRow).toContainText(/100/);
  });
});
