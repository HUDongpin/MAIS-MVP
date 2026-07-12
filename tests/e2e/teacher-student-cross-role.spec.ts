import { expect, test } from "@playwright/test";
import { loginAs, loginAsTeacher, logoutIfVisible, registerStudentApi, uniqueSuffix } from "./helpers";

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

    const student = await registerStudentApi(page, testInfo, "S3");
    await page.request.post("/api/auth/logout");

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

    await page.goto("/teacher/communications/inbox");
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
    const newSubmissionCard = page.locator("article").filter({ hasText: student.name }).first();
    await expect(newSubmissionCard).toContainText(/not started/i);
    await logoutIfVisible(page);

    await loginAs(page, student.username, student.password, /\/dashboard/);
    await page.goto("/messages");
    const studentThread = page.getByRole("button", { name: new RegExp(escapeRegex(messageSubject), "i") });
    if (await studentThread.isVisible().catch(() => false)) await studentThread.click();
    await expect(page.locator("main").getByText(teacherReply).last()).toBeVisible();

    await page.goto("/personalized-learning");
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
    const studentSubmissionResponse = await page.request.post(`/api/assignments/${assignmentPayload.assignment.id}/submissions`, {
      data: {
        answerText: "I completed the linked quadratic lesson and can explain the vertex step.",
        inputType: "text"
      }
    });
    expect(studentSubmissionResponse.ok()).toBeTruthy();
    await page.goto("/personalized-learning");
    await expect(page.getByRole("link", { name: new RegExp(escapeRegex(assignmentTitle), "i") })).toBeVisible();
    await logoutIfVisible(page);

    await loginAsTeacher(page);
    await page.goto(`/teacher/assignments/${assignmentPayload.assignment.id}`);
    const completedSubmissionCard = page.locator("article").filter({ hasText: student.name }).first();
    await expect(completedSubmissionCard).toContainText(/submitted/i);
    await completedSubmissionCard.getByRole("spinbutton", { name: /^Score$/i }).fill("100");
    const scoreResponse = page.waitForResponse((response) =>
      response.url().includes("/api/teacher/submissions/") &&
      response.url().includes("/reviews") &&
      response.request().method() === "PATCH"
    );
    await completedSubmissionCard.getByRole("button", { name: /Save score/i }).click();
    expect((await scoreResponse).ok()).toBeTruthy();
    await expect(completedSubmissionCard).toContainText(/graded/i);
    await expect(completedSubmissionCard).toContainText(/100/);
  });
});
