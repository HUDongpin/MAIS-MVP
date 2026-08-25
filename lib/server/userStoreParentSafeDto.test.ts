import assert from "node:assert/strict";
import test from "node:test";

const generatedAt = "2026-08-23T08:00:00.000Z";

function assertExactKeys(value: unknown, expected: string[], label: string) {
  assert.ok(value && typeof value === "object", `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} must use an explicit allowlist`);
}

function assertNoForbiddenKeys(value: unknown) {
  const forbidden = new Set([
    "email", "username", "passwordMustChange", "avatarImageDataUrl", "avatarImageObjectKey", "avatarImageUrl",
    "classCode", "inviteCode", "guardianInviteCode", "answerText", "correctAnswer", "imageDataUrl",
    "imageObjectKey", "imageUrl", "imageFileName", "ocrResult", "provider", "model", "error", "errorCode",
    "errorMessage", "usage", "promptTokens", "completionTokens", "totalTokens", "deliveryAttempts",
    "providerMessageId", "guardianId", "guardianName", "acknowledgedBy", "teacherRemarks", "generatedBy", "generatedByName",
    "sourceKey", "antiAbuseFlags", "leaderboard", "recentEvents", "economy"
  ]);

  const visit = (candidate: unknown, at: string) => {
    if (!candidate || typeof candidate !== "object") return;
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${at}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(candidate)) {
      assert.ok(!forbidden.has(key), `${at}.${key} is forbidden in a parent-safe DTO`);
      visit(child, `${at}.${key}`);
    }
  };

  visit(value, "dto");
}

function unsafeReport() {
  return {
    id: "report-1",
    type: "parent-summary",
    title: { en: "Weekly report", zh: "每週報告" },
    classId: "class-1",
    studentId: "student-1",
    generatedBy: "teacher-1",
    generatedByName: "Teacher Chan",
    generatedAt,
    summary: { en: "Steady progress", zh: "穩步進展" },
    preview: {
      id: "preview-1",
      type: "parent-summary",
      language: "en",
      title: "Weekly report",
      subtitle: "S3 Algebra",
      generatedAt,
      subjectName: "Ada Student",
      classId: "class-1",
      className: "S3 Algebra",
      studentId: "student-1",
      metrics: { learningMinutes: 90, masteryChange: 5, averageMastery: 82, accuracy: 88, completionRate: 75 },
      strengths: ["Algebra"],
      weaknesses: ["Graph reading"],
      mistakeTypes: ["Sign errors"],
      suggestedPractice: ["Review examples"],
      teacherRemarks: "private teacher remark",
      provider: "poison-provider",
      model: "poison-model"
    }
  };
}

function unsafeChild() {
  return {
    student: {
      id: "student-1",
      name: "Ada Student",
      username: "ada@example.test",
      email: "minor@example.test",
      passwordMustChange: true,
      avatarImageDataUrl: "data:image/png;base64,private",
      grade: "S3"
    },
    classes: [{ id: "class-1", name: "S3 Algebra", grade: "S3", classCode: "PRIVATE-CLASS-CODE", inviteCode: "PRIVATE-INVITE-CODE" }],
    generatedAt,
    averageMastery: 82,
    learningMinutes7d: 90,
    latestActivityAt: generatedAt,
    weeklyActivity: [{ day: "Sun", minutes: 15, provider: "poison-provider" }],
    strengths: [{
      id: "topic-1",
      title: { en: "Algebra", zh: "代數", provider: "poison-provider" },
      mastery: 88,
      description: { en: "Internal detail", zh: "內部細節" },
      model: "poison-model"
    }],
    supportTopics: [],
    pendingAssignmentCount: 8,
    assignments: [{
      assignment: {
        id: "assignment-1",
        title: { en: "Practice", zh: "練習" },
        status: "active",
        dueAt: generatedAt,
        description: { en: "Private teacher detail", zh: "教師內部詳情" },
        createdBy: "teacher-1"
      },
      submission: {
        id: "submission-1",
        status: "correction-required",
        score: 70,
        submittedAt: generatedAt,
        gradedAt: generatedAt,
        feedback: { en: "Try again", zh: "再試一次" },
        correctionRequest: { en: "Check signs", zh: "檢查正負號" },
        correctionDueAt: generatedAt,
        correctionRound: 1,
        maxCorrectionRounds: 2,
        resolvedAt: null,
        attempts: [{ answerText: "raw minor answer", imageDataUrl: "private", ocrResult: { provider: "simpletex", text: "raw OCR" } }],
        latestAttempt: { answerText: "raw minor answer" },
        latestGradingRun: { provider: "llm", model: "private-model", errorCode: "provider-error", usage: { totalTokens: 120 } },
        latestTeacherReview: { reviewedBy: "teacher-1" },
        updatedAt: generatedAt
      },
      className: "S3 Algebra",
      classGrade: "S3"
    }],
    rewardSummary: { balance: 20, available: 15, reserved: 5, lifetimeEarned: 50, spent: 30, pendingRequests: 1, approvedRequests: 2 },
    motivationSummary: {
      generatedAt,
      studentId: "student-1",
      xp: 120,
      level: {
        current: { level: 2, title: { en: "Builder", zh: "建構者" }, minXp: 100, maxXp: 200 },
        next: { level: 3, title: { en: "Explorer", zh: "探索者" }, minXp: 200 },
        xpIntoLevel: 20,
        xpForNextLevel: 100,
        progressPercent: 20
      },
      streakDays: 3,
      badges: [],
      earnedBadges: [],
      quests: [],
      leaderboard: [{ studentId: "other-minor", studentName: "Other Minor" }],
      recentEvents: [{ sourceKey: "private-source", antiAbuseFlags: ["internal"] }],
      rewardSummary: { balance: 20, available: 15, reserved: 5, lifetimeEarned: 50, spent: 30, pendingRequests: 1, approvedRequests: 2 },
      economy: { version: "internal-economy" },
      motivation: { celebrate: [{ en: "Great routine", zh: "好習慣" }], support: [{ en: "Keep it calm", zh: "保持平靜" }] }
    },
    latestParentReport: unsafeReport(),
    celebrate: [{ en: "Celebrate", zh: "鼓勵" }],
    support: [{ en: "Support", zh: "支援" }]
  };
}

test("parent API DTOs rebuild foundation, summary, reports and notices from explicit safe allowlists", async () => {
  let helpers: Record<string, unknown> = {};
  try {
    helpers = await import("@/lib/server/userStore/parentSafeDto") as Record<string, unknown>;
  } catch {
    // The first TDD run intentionally reaches this assertion before the projector exists.
  }

  assert.equal(typeof helpers.toParentFoundationSafeData, "function");
  assert.equal(typeof helpers.toParentChildSummarySafe, "function");
  assert.equal(typeof helpers.toParentReportDataSafe, "function");
  assert.equal(typeof helpers.toParentNoticeDataSafe, "function");
  if (
    typeof helpers.toParentFoundationSafeData !== "function" ||
    typeof helpers.toParentChildSummarySafe !== "function" ||
    typeof helpers.toParentReportDataSafe !== "function" ||
    typeof helpers.toParentNoticeDataSafe !== "function"
  ) return;

  const child = unsafeChild();
  const foundation = helpers.toParentFoundationSafeData({
    parent: { id: "parent-1", name: "Pat Parent", username: "parent@example.test", email: "parent@example.test", passwordMustChange: true },
    children: [child],
    selectedChild: child,
    links: [{
      id: "link-1",
      parentId: "parent-1",
      parentName: "Pat Parent",
      studentId: "student-1",
      studentName: "Ada Student",
      studentGrade: "S3",
      relationship: "guardian",
      status: "active",
      inviteCode: "PRIVATE-GUARDIAN-CODE",
      guardianInviteCode: "PRIVATE-GUARDIAN-CODE-2",
      createdBy: "teacher-1",
      createdAt: generatedAt,
      updatedAt: generatedAt
    }],
    totals: { children: 1, activeReports: 1, openMessages: 0, pendingAssignments: 1 }
  });

  assertExactKeys(foundation, ["parent", "children", "selectedChild", "links", "totals"], "foundation");
  assertExactKeys(foundation.parent, ["id", "name"], "foundation.parent");
  assertExactKeys(foundation.links[0], ["id", "studentId", "studentName", "studentGrade", "relationship", "status", "createdAt", "updatedAt"], "foundation.links[0]");
  assertExactKeys(foundation.children[0], [
    "student", "classes", "generatedAt", "averageMastery", "learningMinutes7d", "latestActivityAt", "weeklyActivity",
    "strengths", "supportTopics", "assignments", "pendingAssignmentCount", "rewardSummary", "motivationSummary", "latestParentReport", "celebrate", "support"
  ], "foundation.children[0]");
  assert.equal(foundation.children[0].pendingAssignmentCount, 8);
  assertExactKeys(foundation.children[0].student, ["id", "name", "grade"], "child.student");
  assertExactKeys(foundation.children[0].classes[0], ["id", "name", "grade"], "child.classes[0]");
  assertExactKeys(foundation.children[0].strengths[0], ["id", "title", "mastery"], "child.strengths[0]");
  assertExactKeys(foundation.children[0].assignments[0].assignment, ["id", "title", "status", "dueAt"], "assignment");
  assertExactKeys(foundation.children[0].assignments[0].submission, [
    "id", "status", "score", "submittedAt", "gradedAt", "feedback", "correctionRequest", "correctionDueAt",
    "correctionRound", "maxCorrectionRounds", "resolvedAt", "updatedAt"
  ], "submission");
  assertExactKeys(foundation.children[0].latestParentReport, ["id", "type", "title", "classId", "studentId", "teacherId", "teacherName", "generatedAt", "summary", "preview"], "latest report");
  assert.equal(foundation.children[0].latestParentReport.teacherId, "teacher-1");
  assert.equal(foundation.children[0].latestParentReport.teacherName, "Teacher Chan");
  assertExactKeys(foundation.children[0].latestParentReport.preview, [
    "id", "type", "language", "title", "subtitle", "generatedAt", "subjectName", "classId", "className", "studentId",
    "metrics", "strengths", "weaknesses", "mistakeTypes", "suggestedPractice"
  ], "report preview");
  assertExactKeys(foundation.children[0].motivationSummary, [
    "generatedAt", "studentId", "xp", "level", "streakDays", "badges", "earnedBadges", "quests", "rewardSummary", "motivation"
  ], "motivation summary");
  assertNoForbiddenKeys(foundation);

  const summary = helpers.toParentChildSummarySafe(child);
  assert.deepEqual(summary, foundation.children[0]);
  assertNoForbiddenKeys(summary);

  const reports = helpers.toParentReportDataSafe({ generatedAt, children: [child], selectedChild: child, reports: [unsafeReport()] });
  assertExactKeys(reports, ["generatedAt", "children", "selectedChild", "reports"], "reports");
  assertExactKeys(reports.reports[0], ["id", "type", "title", "classId", "studentId", "teacherId", "teacherName", "generatedAt", "summary", "preview"], "reports.reports[0]");
  assertNoForbiddenKeys(reports);

  const notices = helpers.toParentNoticeDataSafe({
    generatedAt,
    children: [child],
    notices: [{
      id: "notice-1",
      teacherId: "teacher-1",
      classId: "class-1",
      className: "S3 Algebra",
      audience: "parents",
      channelId: "channel-1",
      channelName: "Class channel",
      subject: { en: "Reminder", zh: "提醒" },
      body: { en: "Review today", zh: "今天重溫" },
      status: "sent",
      source: { kind: "teacher-review-lesson", id: "private-review-lesson-id" },
      dueAt: generatedAt,
      createdAt: generatedAt,
      updatedAt: generatedAt,
      sentAt: generatedAt,
      recipients: [{
        id: "recipient-1", noticeId: "notice-1", studentId: "student-1", studentName: "Ada Student",
        guardianId: "parent-1", guardianName: "Pat Parent", status: "pending", acknowledgedBy: "parent-1",
        acknowledgedAt: null, createdAt: generatedAt
      }],
      deliveryAttempts: [{
        id: "delivery-1", providerMessageId: "private-provider-id", errorCode: "private-error-code",
        errorMessage: "private provider diagnostic"
      }],
      acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
    }],
    parentSafeDrafts: [{
      id: "draft-1", noticeId: "notice-1", sourceReviewLessonId: "private-review-lesson-id", classId: "class-1",
      className: "S3 Algebra", teacherId: "teacher-1", teacherName: "Teacher Chan", title: { en: "Review", zh: "重溫" },
      summary: { en: "Safe summary", zh: "安全摘要" }, status: "sent", publishedAt: generatedAt,
      acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
    }]
  });

  assertExactKeys(notices, ["generatedAt", "children", "notices", "parentSafeDrafts"], "notices");
  assertExactKeys(notices.notices[0], [
    "id", "className", "audience", "channelName", "subject", "body", "status", "source", "dueAt",
    "createdAt", "updatedAt", "sentAt", "recipients", "acknowledgement"
  ], "notices.notices[0]");
  assertExactKeys(notices.notices[0].source, ["kind"], "notice source");
  assertExactKeys(notices.notices[0].recipients[0], ["id", "noticeId", "studentId", "studentName", "status", "acknowledgedAt", "createdAt"], "notice recipient");
  assertExactKeys(notices.parentSafeDrafts[0], ["id", "noticeId", "className", "teacherName", "title", "summary", "status", "publishedAt", "acknowledgement"], "parent-safe draft");
  assertNoForbiddenKeys(notices);

  for (const [label, dto] of Object.entries({ foundation, summary, reports, notices })) {
    const rscSerialized = JSON.parse(JSON.stringify(dto)) as unknown;
    assertNoForbiddenKeys(rscSerialized);
    assert.doesNotMatch(
      JSON.stringify(rscSerialized),
      /PRIVATE-|private teacher remark|private-model|poison-provider|poison-model|raw minor answer/i,
      `${label} must stay clean after the RSC serialization boundary`
    );
  }
});

test("parent report projector rejects runtime-deceived nested preview values", async () => {
  const { toParentReportDataSafe } = await import("@/lib/server/userStore/parentSafeDto");
  const report = unsafeReport();
  const runtimePreview = report.preview as unknown as Record<string, unknown>;
  const pollutedEntry = {
    answerText: "SENSITIVE-raw-minor-answer",
    providerMessageId: "SENSITIVE-provider-message-id"
  };
  runtimePreview.strengths = [pollutedEntry];
  runtimePreview.weaknesses = [pollutedEntry];
  runtimePreview.mistakeTypes = [pollutedEntry];
  runtimePreview.suggestedPractice = [pollutedEntry];

  assert.throws(
    () => toParentReportDataSafe({
      generatedAt,
      children: [],
      selectedChild: null,
      reports: [report]
    } as never),
    /Invalid teacher report preview/
  );
});

test("parent API safe DTOs replace email-shaped display names with neutral labels", async () => {
  const {
    toParentFoundationSafeData,
    toParentNoticeDataSafe
  } = await import("@/lib/server/userStore/parentSafeDto");
  const guardianEmail = "guardian.private@example.test";
  const studentEmail = "student.private@example.test";
  const teacherEmail = "teacher.private@example.test";
  const child = unsafeChild();
  child.student.name = studentEmail;
  child.latestParentReport.generatedByName = teacherEmail;
  child.latestParentReport.preview.subjectName = studentEmail;

  const foundation = toParentFoundationSafeData({
    parent: { ...child.student, id: "parent-1", name: guardianEmail, role: "parent" },
    children: [child],
    selectedChild: child,
    links: [{
      id: "link-1",
      parentId: "parent-1",
      parentName: guardianEmail,
      studentId: "student-1",
      studentName: studentEmail,
      studentGrade: "S3",
      relationship: "guardian",
      status: "active",
      inviteCode: "",
      createdBy: "parent-1",
      createdAt: generatedAt,
      updatedAt: generatedAt
    }],
    totals: { children: 1, activeReports: 1, openMessages: 0, pendingAssignments: 1 }
  } as never);
  const notices = toParentNoticeDataSafe({
    generatedAt,
    children: [child],
    notices: [{
      id: "notice-private-name",
      teacherId: "teacher-1",
      classId: "class-1",
      className: "S3 Algebra",
      audience: "parents",
      channelId: "channel-1",
      channelName: "Class channel",
      subject: { en: "Reminder", zh: "提醒" },
      body: { en: "Review today", zh: "今天重溫" },
      status: "sent",
      dueAt: null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
      sentAt: generatedAt,
      recipients: [{
        id: "recipient-private-name",
        noticeId: "notice-private-name",
        studentId: "student-1",
        studentName: studentEmail,
        guardianId: "parent-1",
        guardianName: guardianEmail,
        status: "pending",
        acknowledgedAt: null,
        createdAt: generatedAt
      }],
      deliveryAttempts: [],
      acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
    }],
    parentSafeDrafts: [{
      id: "draft-private-name",
      noticeId: "notice-private-name",
      sourceReviewLessonId: "review-1",
      classId: "class-1",
      className: "S3 Algebra",
      teacherId: "teacher-1",
      teacherName: teacherEmail,
      title: { en: "Review", zh: "重溫" },
      summary: { en: "Safe summary", zh: "安全摘要" },
      status: "sent",
      publishedAt: generatedAt,
      acknowledgement: { total: 1, acknowledged: 0, pending: 1 }
    }]
  } as never);

  assert.equal(foundation.parent.name, "Parent");
  assert.equal(foundation.children[0]?.student.name, "Student");
  assert.equal(foundation.links[0]?.studentName, "Student");
  assert.equal(foundation.children[0]?.latestParentReport?.teacherName, "Teacher");
  assert.equal(foundation.children[0]?.latestParentReport?.preview?.subjectName, "Student");
  assert.equal(notices.notices[0]?.recipients[0]?.studentName, "Unknown student");
  assert.equal(notices.parentSafeDrafts[0]?.teacherName, "Teacher");
  assert.doesNotMatch(
    JSON.stringify({ foundation, notices }),
    new RegExp(`${guardianEmail}|${studentEmail}|${teacherEmail}`, "i")
  );
});
