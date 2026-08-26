import assert from "node:assert/strict";
import test from "node:test";

import { scopeParentPostgresCollections } from "@/lib/server/userStore/parentPostgresScopedCollections";

function mixedFamilyResultFixture() {
  return {
    user_records: [
      { id: "parent-1", role: "parent" },
      { id: "student-1", role: "student" },
      { id: "student-2", role: "student" },
      { id: "student-other", role: "student" },
      { id: "teacher-a", role: "teacher" },
      { id: "teacher-b", role: "teacher" },
      { id: "teacher-other", role: "teacher" }
    ],
    student_profile_records: [
      { id: "profile-1", user_id: "student-1", grade: "S3" },
      { id: "profile-2", user_id: "student-2", grade: "S4" },
      { id: "profile-other", user_id: "student-other", grade: "S5" }
    ],
    user_setting_records: [
      { id: "settings-parent", user_id: "parent-1" },
      { id: "settings-1", user_id: "student-1" },
      { id: "settings-other", user_id: "student-other" }
    ],
    guardian_link_records: [
      { id: "link-1", parent_id: "parent-1", student_id: "student-1", status: "active" },
      { id: "link-2", parent_id: "parent-1", student_id: "student-2", status: "active" },
      { id: "link-other", parent_id: "parent-other", student_id: "student-other", status: "active" }
    ],
    class_enrollment_records: [
      { id: "enrollment-a", class_id: "class-a", student_id: "student-1" },
      { id: "enrollment-b", class_id: "class-b", student_id: "student-1" },
      { id: "enrollment-other", class_id: "class-other", student_id: "student-other" }
    ],
    teacher_class_records: [
      { id: "class-a", teacher_id: "teacher-a", grade: "S3" },
      { id: "class-b", teacher_id: "teacher-b", grade: "S4" },
      { id: "class-other", teacher_id: "teacher-other", grade: "S5" }
    ],
    school_membership_records: [
      { id: "membership-a", user_id: "teacher-a", class_id: "class-a", role: "teacher" },
      { id: "membership-other", user_id: "teacher-other", class_id: "class-other", role: "teacher" }
    ],
    teacher_report_records: [
      { id: "report-a", type: "parent-summary", student_id: "student-1", class_id: "class-a" },
      { id: "report-b", type: "parent-summary", student_id: "student-1", class_id: "class-b" },
      { id: "report-unenrolled", type: "parent-summary", student_id: "student-1", class_id: "class-other" },
      { id: "report-other", type: "parent-summary", student_id: "student-other", class_id: "class-other" }
    ],
    teacher_message_records: [
      { id: "thread-1", guardian_id: "parent-1", student_id: "student-1", class_id: "class-a" },
      { id: "thread-other", guardian_id: "parent-other", student_id: "student-other", class_id: "class-other" }
    ],
    teacher_message_entry_records: [
      { id: "entry-1", thread_id: "thread-1", sender_id: "parent-1", recipient_id: "teacher-a" },
      { id: "entry-collision", thread_id: "thread-1", sender_id: "parent-other", recipient_id: "teacher-other" },
      { id: "entry-other", thread_id: "thread-other" }
    ],
    teacher_notice_recipient_records: [
      { id: "recipient-1", notice_id: "notice-1", guardian_id: "parent-1", student_id: "student-1" },
      { id: "recipient-other", notice_id: "notice-other", guardian_id: "parent-other", student_id: "student-other" }
    ],
    teacher_notice_records: [
      { id: "notice-1", source_kind: "teacher-review-lesson", source_id: "review-1" },
      { id: "notice-other", source_kind: "teacher-review-lesson", source_id: "review-other" }
    ],
    teacher_review_lesson_records: [
      { id: "review-1" },
      { id: "review-other" }
    ],
    assignment_records: [
      { id: "assignment-a", class_id: "class-a" },
      { id: "assignment-other", class_id: "class-other" }
    ],
    submission_records: [
      { id: "submission-1", assignment_id: "assignment-a", student_id: "student-1" },
      { id: "submission-other", assignment_id: "assignment-other", student_id: "student-other" }
    ],
    assignment_submission_attempt_records: [
      { id: "submission-attempt-1", submission_id: "submission-1" },
      { id: "submission-attempt-other", submission_id: "submission-other" }
    ],
    assignment_grading_run_records: [
      { id: "grading-1", submission_id: "submission-1" },
      { id: "grading-other", submission_id: "submission-other" }
    ],
    assignment_teacher_review_records: [
      { id: "assignment-review-1", submission_id: "submission-1" },
      { id: "assignment-review-other", submission_id: "submission-other" }
    ],
    topic_records: [
      { id: "topic-s3", grade: "S3" },
      { id: "topic-s4", grade: "S4" },
      { id: "topic-other", grade: "S5" }
    ],
    question_records: [
      { id: "question-1", topic_id: "topic-s3" },
      { id: "question-other", topic_id: "topic-other" }
    ],
    attempt_records: [
      { id: "attempt-1", user_id: "student-1", question_id: "question-1" },
      { id: "attempt-other", user_id: "student-other", question_id: "question-other" }
    ],
    hot_attempt_records: [
      { id: "hot-attempt-1", user_id: "student-1", question_id: "question-1" },
      { id: "hot-attempt-other", user_id: "student-other", question_id: "question-other" }
    ],
    mistake_records: [
      { id: "mistake-1", user_id: "student-1", question_id: "question-1" },
      { id: "mistake-other", user_id: "student-other", question_id: "question-other" }
    ],
    hot_mistake_records: [
      { id: "hot-mistake-1", user_id: "student-1", question_id: "question-1" },
      { id: "hot-mistake-other", user_id: "student-other", question_id: "question-other" }
    ],
    lesson_progress_records: [
      { id: "progress-1", user_id: "student-1", topic_id: "topic-s3" },
      { id: "progress-other", user_id: "student-other", topic_id: "topic-other" }
    ],
    learning_event_records: [
      { id: "event-1", user_id: "student-1", question_id: "question-1" },
      { id: "event-other", user_id: "student-other", question_id: "question-other" }
    ],
    hot_learning_event_records: [
      { id: "hot-event-1", user_id: "student-1", question_id: "question-1" },
      { id: "hot-event-other", user_id: "student-other", question_id: "question-other" }
    ],
    visualization_session_records: [
      { id: "visualization-1", user_id: "student-1" },
      { id: "visualization-other", user_id: "student-other" }
    ],
    ai_tutor_message_records: [
      { id: "tutor-1", user_id: "student-1" },
      { id: "tutor-other", user_id: "student-other" }
    ],
    reward_point_ledger_records: [
      { id: "ledger-1", student_id: "student-1" },
      { id: "ledger-other", student_id: "student-other" }
    ],
    reward_redemption_records: [
      { id: "redemption-1", student_id: "student-1" },
      { id: "redemption-other", student_id: "student-other" }
    ],
    gamification_event_records: [
      { id: "gamification-1", student_id: "student-1" },
      { id: "gamification-other", student_id: "student-other" }
    ]
  };
}

function ids(value: unknown) {
  return Array.isArray(value)
    ? value.map((record) => (record as { id?: string }).id).filter(Boolean)
    : [];
}

test("parent Postgres result scoping removes every other-family sentinel", () => {
  const scoped = scopeParentPostgresCollections(mixedFamilyResultFixture(), "parent-1");
  assert.ok(scoped);

  assert.deepEqual(ids(scoped.user_records), ["parent-1", "student-1", "student-2", "teacher-a", "teacher-b"]);
  assert.deepEqual(ids(scoped.guardian_link_records), ["link-1", "link-2"]);
  assert.deepEqual(ids(scoped.teacher_message_entry_records), ["entry-1"]);
  assert.deepEqual(ids(scoped.teacher_notice_recipient_records), ["recipient-1"]);
  assert.deepEqual(ids(scoped.teacher_report_records), ["report-a", "report-b"]);
  assert.deepEqual(ids(scoped.submission_records), ["submission-1"]);
  assert.deepEqual(ids(scoped.assignment_submission_attempt_records), ["submission-attempt-1"]);
  assert.deepEqual(ids(scoped.assignment_grading_run_records), ["grading-1"]);
  assert.deepEqual(ids(scoped.assignment_teacher_review_records), ["assignment-review-1"]);
  assert.deepEqual(ids(scoped.topic_records), ["topic-s3", "topic-s4"]);
  assert.deepEqual(ids(scoped.question_records), ["question-1"]);
  assert.deepEqual(ids(scoped.attempt_records), ["attempt-1"]);
  assert.deepEqual(ids(scoped.hot_attempt_records), ["hot-attempt-1"]);
  assert.deepEqual(ids(scoped.mistake_records), ["mistake-1"]);
  assert.deepEqual(ids(scoped.hot_mistake_records), ["hot-mistake-1"]);
  assert.deepEqual(ids(scoped.lesson_progress_records), ["progress-1"]);
  assert.deepEqual(ids(scoped.learning_event_records), ["event-1"]);
  assert.deepEqual(ids(scoped.hot_learning_event_records), ["hot-event-1"]);
  assert.deepEqual(ids(scoped.visualization_session_records), ["visualization-1"]);
  assert.deepEqual(ids(scoped.ai_tutor_message_records), ["tutor-1"]);
  assert.deepEqual(ids(scoped.reward_point_ledger_records), ["ledger-1"]);
  assert.deepEqual(ids(scoped.reward_redemption_records), ["redemption-1"]);
  assert.deepEqual(ids(scoped.gamification_event_records), ["gamification-1"]);
});

test("parent Postgres result scoping requires the exact parent projection", () => {
  const fixture = mixedFamilyResultFixture();
  fixture.user_records = fixture.user_records.filter((user) => user.id !== "parent-1");
  assert.equal(scopeParentPostgresCollections(fixture, "parent-1"), null);
});

test("parent Postgres result scoping rejects a disabled parent projection", () => {
  const fixture = mixedFamilyResultFixture();
  const parent = fixture.user_records.find((user) => user.id === "parent-1");
  assert.ok(parent);
  Object.assign(parent, { disabled_at: "2026-08-23T00:00:00.000Z" });
  assert.equal(scopeParentPostgresCollections(fixture, "parent-1"), null);
});

test("parent Postgres result scoping rejects malformed disabled-at values", () => {
  for (const malformedDisabledAt of [123, {}, []]) {
    const fixture = mixedFamilyResultFixture();
    const parent = fixture.user_records.find((user) => user.id === "parent-1");
    assert.ok(parent);
    Object.assign(parent, { disabled_at: malformedDisabledAt });
    assert.equal(
      scopeParentPostgresCollections(fixture, "parent-1"),
      null,
      `disabled_at=${JSON.stringify(malformedDisabledAt)} must fail closed`
    );
  }
});

test("malformed optional class ids never inherit legacy class-less visibility", () => {
  for (const malformedClassId of [123, {}, []]) {
    const reportFixture = mixedFamilyResultFixture();
    const report = reportFixture.teacher_report_records.find((record) => record.id === "report-a");
    assert.ok(report);
    Object.assign(report, { class_id: malformedClassId });
    assert.deepEqual(
      ids(scopeParentPostgresCollections(reportFixture, "parent-1")?.teacher_report_records),
      ["report-b"],
      `report class_id=${JSON.stringify(malformedClassId)} must fail closed`
    );

    const messageFixture = mixedFamilyResultFixture();
    const thread = messageFixture.teacher_message_records.find((record) => record.id === "thread-1");
    assert.ok(thread);
    Object.assign(thread, { class_id: malformedClassId });
    const scopedMessage = scopeParentPostgresCollections(messageFixture, "parent-1");
    assert.deepEqual(ids(scopedMessage?.teacher_message_records), []);
    assert.deepEqual(ids(scopedMessage?.teacher_message_entry_records), []);

    const noticeFixture = mixedFamilyResultFixture();
    const notice = noticeFixture.teacher_notice_records.find((record) => record.id === "notice-1");
    assert.ok(notice);
    Object.assign(notice, { class_id: malformedClassId });
    const scopedNotice = scopeParentPostgresCollections(noticeFixture, "parent-1");
    assert.deepEqual(ids(scopedNotice?.teacher_notice_records), []);
    assert.deepEqual(ids(scopedNotice?.teacher_notice_recipient_records), []);
  }
});

test("a parent with no active guardian link gets an empty family scope", () => {
  const fixture = mixedFamilyResultFixture();
  fixture.guardian_link_records = fixture.guardian_link_records.filter((link) => link.parent_id !== "parent-1");
  const scoped = scopeParentPostgresCollections(fixture, "parent-1");
  assert.ok(scoped);
  assert.deepEqual(ids(scoped.guardian_link_records), []);
  assert.deepEqual(ids(scoped.teacher_report_records), []);
  assert.deepEqual(ids(scoped.teacher_message_entry_records), []);
  assert.deepEqual(ids(scoped.teacher_notice_recipient_records), []);
  assert.deepEqual(ids(scoped.submission_records), []);
});
