type ParentPostgresJsonRecord = Record<string, unknown>;

export type ParentPostgresScopedCollections = Record<string, unknown> & {
  ai_tutor_message_records: unknown;
  assignment_grading_run_records: unknown;
  assignment_records: unknown;
  assignment_submission_attempt_records: unknown;
  assignment_teacher_review_records: unknown;
  attempt_records: unknown;
  class_enrollment_records: unknown;
  gamification_event_records: unknown;
  guardian_link_records: unknown;
  hot_attempt_records: unknown;
  hot_learning_event_records: unknown;
  hot_mistake_records: unknown;
  learning_event_records: unknown;
  lesson_progress_records: unknown;
  mistake_records: unknown;
  question_records: unknown;
  reward_point_ledger_records: unknown;
  reward_redemption_records: unknown;
  school_membership_records?: unknown;
  student_profile_records?: unknown;
  submission_records: unknown;
  teacher_class_records: unknown;
  teacher_message_entry_records: unknown;
  teacher_message_records: unknown;
  teacher_notice_recipient_records: unknown;
  teacher_notice_records: unknown;
  teacher_report_records: unknown;
  teacher_review_lesson_records: unknown;
  topic_records: unknown;
  user_setting_records?: unknown;
  user_records: unknown;
  visualization_session_records: unknown;
};

function records(value: unknown) {
  return Array.isArray(value)
    ? value.filter((record): record is ParentPostgresJsonRecord => (
        Boolean(record) && typeof record === "object" && !Array.isArray(record)
      ))
    : [];
}

function field(record: ParentPostgresJsonRecord, key: string) {
  return typeof record[key] === "string" ? record[key] : "";
}

function optionalStringField(record: ParentPostgresJsonRecord, key: string) {
  const value = record[key];
  if (value === undefined || value === null || value === "") {
    return { valid: true as const, value: "" };
  }
  return typeof value === "string"
    ? { valid: true as const, value }
    : { valid: false as const, value: "" };
}

function hasNoDisabledAt(record: ParentPostgresJsonRecord) {
  const disabledAt = record.disabled_at;
  return disabledAt === undefined || disabledAt === null || disabledAt === "";
}

function recordIds(value: ParentPostgresJsonRecord[]) {
  return new Set(value.map((record) => field(record, "id")).filter(Boolean));
}

export function scopeParentPostgresCollections<Row extends ParentPostgresScopedCollections>(
  row: Row,
  parentId: string
): Row | null {
  const userRecords = records(row.user_records);
  if (!userRecords.some((user) => (
    field(user, "id") === parentId
    && field(user, "role") === "parent"
    && hasNoDisabledAt(user)
  ))) {
    return null;
  }

  const guardianLinkRecords = records(row.guardian_link_records).filter((link) => (
    field(link, "parent_id") === parentId
    && field(link, "status") === "active"
    && Boolean(field(link, "student_id"))
  ));
  const studentIds = new Set(guardianLinkRecords.map((link) => field(link, "student_id")));
  const classEnrollmentRecords = records(row.class_enrollment_records).filter((enrollment) => (
    studentIds.has(field(enrollment, "student_id"))
  ));
  const classIds = new Set(classEnrollmentRecords.map((enrollment) => field(enrollment, "class_id")).filter(Boolean));
  const teacherClassRecords = records(row.teacher_class_records).filter((teacherClass) => (
    classIds.has(field(teacherClass, "id"))
  ));
  const teacherReportRecords = records(row.teacher_report_records).filter((report) => {
    const classId = optionalStringField(report, "class_id");
    return field(report, "type") === "parent-summary"
      && studentIds.has(field(report, "student_id"))
      && classId.valid
      && (!classId.value || classIds.has(classId.value));
  });
  const teacherMessageRecords = records(row.teacher_message_records).filter((message) => {
    const classId = optionalStringField(message, "class_id");
    return field(message, "guardian_id") === parentId
      && studentIds.has(field(message, "student_id"))
      && classId.valid
      && (!classId.value || classIds.has(classId.value));
  });
  const messageThreadIds = recordIds(teacherMessageRecords);
  const teacherMessageEntryRecords = records(row.teacher_message_entry_records).filter((entry) => (
    messageThreadIds.has(field(entry, "thread_id"))
    && (field(entry, "sender_id") === parentId || field(entry, "recipient_id") === parentId)
  ));
  const candidateNoticeRecipientRecords = records(row.teacher_notice_recipient_records).filter((recipient) => (
    field(recipient, "guardian_id") === parentId
    && studentIds.has(field(recipient, "student_id"))
  ));
  const candidateNoticeIds = new Set(
    candidateNoticeRecipientRecords.map((recipient) => field(recipient, "notice_id")).filter(Boolean)
  );
  const teacherNoticeRecords = records(row.teacher_notice_records).filter((notice) => {
    const classId = optionalStringField(notice, "class_id");
    return candidateNoticeIds.has(field(notice, "id"))
      && classId.valid
      && (!classId.value || classIds.has(classId.value));
  });
  const noticeIds = recordIds(teacherNoticeRecords);
  const teacherNoticeRecipientRecords = candidateNoticeRecipientRecords.filter((recipient) => (
    noticeIds.has(field(recipient, "notice_id"))
  ));
  const reviewLessonIds = new Set(
    teacherNoticeRecords
      .filter((notice) => field(notice, "source_kind") === "teacher-review-lesson")
      .map((notice) => field(notice, "source_id"))
      .filter(Boolean)
  );
  const teacherReviewLessonRecords = records(row.teacher_review_lesson_records).filter((review) => (
    reviewLessonIds.has(field(review, "id"))
  ));
  const assignmentRecords = records(row.assignment_records).filter((assignment) => (
    classIds.has(field(assignment, "class_id"))
  ));
  const assignmentIds = recordIds(assignmentRecords);
  const submissionRecords = records(row.submission_records).filter((submission) => (
    studentIds.has(field(submission, "student_id"))
    && assignmentIds.has(field(submission, "assignment_id"))
  ));
  const submissionIds = recordIds(submissionRecords);
  const assignmentSubmissionAttemptRecords = records(row.assignment_submission_attempt_records).filter((attempt) => (
    submissionIds.has(field(attempt, "submission_id"))
  ));
  const assignmentGradingRunRecords = records(row.assignment_grading_run_records).filter((run) => (
    submissionIds.has(field(run, "submission_id"))
  ));
  const assignmentTeacherReviewRecords = records(row.assignment_teacher_review_records).filter((review) => (
    submissionIds.has(field(review, "submission_id"))
  ));
  const attemptRecords = records(row.attempt_records).filter((attempt) => (
    studentIds.has(field(attempt, "user_id"))
  ));
  const hotAttemptRecords = records(row.hot_attempt_records).filter((attempt) => (
    studentIds.has(field(attempt, "user_id"))
  ));
  const mistakeRecords = records(row.mistake_records).filter((mistake) => (
    studentIds.has(field(mistake, "user_id"))
  ));
  const hotMistakeRecords = records(row.hot_mistake_records).filter((mistake) => (
    studentIds.has(field(mistake, "user_id"))
  ));
  const lessonProgressRecords = records(row.lesson_progress_records).filter((progress) => (
    studentIds.has(field(progress, "user_id"))
  ));
  const learningEventRecords = records(row.learning_event_records).filter((event) => (
    studentIds.has(field(event, "user_id"))
  ));
  const hotLearningEventRecords = records(row.hot_learning_event_records).filter((event) => (
    studentIds.has(field(event, "user_id"))
  ));
  const visualizationSessionRecords = records(row.visualization_session_records).filter((session) => (
    studentIds.has(field(session, "user_id"))
  ));
  const aiTutorMessageRecords = records(row.ai_tutor_message_records).filter((message) => (
    studentIds.has(field(message, "user_id"))
  ));
  const rewardPointLedgerRecords = records(row.reward_point_ledger_records).filter((entry) => (
    studentIds.has(field(entry, "student_id"))
  ));
  const rewardRedemptionRecords = records(row.reward_redemption_records).filter((redemption) => (
    studentIds.has(field(redemption, "student_id"))
  ));
  const gamificationEventRecords = records(row.gamification_event_records).filter((event) => (
    studentIds.has(field(event, "student_id"))
  ));
  const questionIds = new Set([
    ...attemptRecords,
    ...hotAttemptRecords,
    ...mistakeRecords,
    ...hotMistakeRecords,
    ...learningEventRecords,
    ...hotLearningEventRecords
  ].map((record) => field(record, "question_id")).filter(Boolean));
  const questionRecords = records(row.question_records).filter((question) => (
    questionIds.has(field(question, "id"))
  ));
  const teacherIds = new Set([
    ...teacherClassRecords.map((teacherClass) => field(teacherClass, "teacher_id")),
    ...teacherReportRecords.map((report) => field(report, "generated_by")),
    ...teacherMessageRecords.map((message) => field(message, "teacher_id")),
    ...teacherNoticeRecords.map((notice) => field(notice, "teacher_id"))
  ].filter(Boolean));
  const relevantUserIds = new Set([parentId, ...studentIds, ...teacherIds]);
  const scopedUserRecords = userRecords.filter((user) => relevantUserIds.has(field(user, "id")));
  const studentProfileRecords = records(row.student_profile_records).filter((profile) => (
    relevantUserIds.has(field(profile, "user_id"))
  ));
  const allowedGrades = new Set([
    ...studentProfileRecords
      .filter((profile) => studentIds.has(field(profile, "user_id")))
      .map((profile) => field(profile, "grade")),
    ...teacherClassRecords.map((teacherClass) => field(teacherClass, "grade"))
  ].filter(Boolean));
  const topicRecords = records(row.topic_records).filter((topic) => (
    allowedGrades.has(field(topic, "grade"))
  ));
  const userSettingRecords = records(row.user_setting_records).filter((settings) => {
    const userId = field(settings, "user_id");
    return userId === parentId || studentIds.has(userId);
  });
  const schoolMembershipRecords = records(row.school_membership_records).filter((membership) => (
    teacherIds.has(field(membership, "user_id"))
    && classIds.has(field(membership, "class_id"))
    && field(membership, "role") === "teacher"
  ));

  return {
    ...row,
    ai_tutor_message_records: aiTutorMessageRecords,
    assignment_grading_run_records: assignmentGradingRunRecords,
    assignment_records: assignmentRecords,
    assignment_submission_attempt_records: assignmentSubmissionAttemptRecords,
    assignment_teacher_review_records: assignmentTeacherReviewRecords,
    attempt_records: attemptRecords,
    class_enrollment_records: classEnrollmentRecords,
    gamification_event_records: gamificationEventRecords,
    guardian_link_records: guardianLinkRecords,
    hot_attempt_records: hotAttemptRecords,
    hot_learning_event_records: hotLearningEventRecords,
    hot_mistake_records: hotMistakeRecords,
    learning_event_records: learningEventRecords,
    lesson_progress_records: lessonProgressRecords,
    mistake_records: mistakeRecords,
    question_records: questionRecords,
    reward_point_ledger_records: rewardPointLedgerRecords,
    reward_redemption_records: rewardRedemptionRecords,
    school_membership_records: schoolMembershipRecords,
    student_profile_records: studentProfileRecords,
    submission_records: submissionRecords,
    teacher_class_records: teacherClassRecords,
    teacher_message_entry_records: teacherMessageEntryRecords,
    teacher_message_records: teacherMessageRecords,
    teacher_notice_recipient_records: teacherNoticeRecipientRecords,
    teacher_notice_records: teacherNoticeRecords,
    teacher_report_records: teacherReportRecords,
    teacher_review_lesson_records: teacherReviewLessonRecords,
    topic_records: topicRecords,
    user_records: scopedUserRecords,
    user_setting_records: userSettingRecords,
    visualization_session_records: visualizationSessionRecords
  };
}
