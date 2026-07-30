import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type { Database } from "@/lib/server/userStore/accountErasureDatabase";
import {
  accountErasurePolicy,
  classifiedErasureCollections,
  eraseUserFromDatabase,
  resolveErasureAuthorization,
  ERASED_USER_TOMBSTONE_ID,
  ERASED_USER_TOMBSTONE_NAME
} from "@/lib/server/userStore/accountErasurePersistence";

const CHILD = "student-ada";
const OTHER_CHILD = "student-ben";
const GUARDIAN = "parent-ada";
const OTHER_GUARDIAN = "parent-ben";
const TEACHER = "teacher-reed";
const SCHOOL_ADMIN = "admin-oakfield";
const OTHER_SCHOOL_ADMIN = "admin-rivendell";
const PLATFORM_ADMIN = "admin-platform";

function createDatabase(): Database {
  return {
    users: [
      { id: CHILD, role: "student", school_id: "school-oakfield", normalized_username: "ada" },
      { id: OTHER_CHILD, role: "student", school_id: "school-oakfield" },
      { id: GUARDIAN, role: "parent" },
      { id: OTHER_GUARDIAN, role: "parent" },
      { id: TEACHER, role: "teacher", school_id: "school-oakfield" },
      { id: SCHOOL_ADMIN, role: "admin", school_id: "school-oakfield" },
      { id: OTHER_SCHOOL_ADMIN, role: "admin", school_id: "school-rivendell" },
      { id: PLATFORM_ADMIN, role: "admin" }
    ],
    auth_identities: [{ user_id: CHILD, email_at_link: "ada@example.test" }],
    student_profiles: [
      { user_id: CHILD, name: "Ada", avatar_media_object_key: "avatar/2026/07/abc/one" },
      { user_id: OTHER_CHILD, name: "Ben" }
    ],
    user_settings: [{ user_id: CHILD }, { user_id: OTHER_CHILD }],
    learner_profiles: [{ user_id: CHILD }],
    password_reset_tokens: [{ user_id: CHILD, token_hash: "hash" }],
    schools: [{ id: "school-oakfield", created_by: SCHOOL_ADMIN }],
    school_memberships: [
      { user_id: CHILD, school_id: "school-oakfield" },
      { user_id: SCHOOL_ADMIN, school_id: "school-oakfield" },
      { user_id: OTHER_SCHOOL_ADMIN, school_id: "school-rivendell" }
    ],
    guardian_links: [
      { parent_id: GUARDIAN, student_id: CHILD, status: "active" },
      { parent_id: OTHER_GUARDIAN, student_id: CHILD, status: "pending" },
      { parent_id: OTHER_GUARDIAN, student_id: OTHER_CHILD, status: "active" }
    ],
    provisioning_batches: [{ id: "batch-1", requested_by: SCHOOL_ADMIN }],
    provisioning_row_results: [{ id: "row-1", user_id: CHILD, temporary_password: "Mais-secret" }],

    topics: [{ id: "topic-1" }],
    lessons: [{ slug: "lesson-1" }],
    lesson_blocks: [{ lesson_slug: "lesson-1" }],
    questions: [{ id: "question-1" }],

    attempts: [{ user_id: CHILD }, { user_id: OTHER_CHILD }],
    mistakes: [{ user_id: CHILD }],
    lesson_progress: [{ user_id: CHILD }],
    teacher_mastery_targets: [{ teacher_id: TEACHER, student_id: CHILD }],
    student_accommodations: [
      { student_id: CHILD, updated_by: TEACHER, updated_by_name: "Ms. Reed" },
      { student_id: OTHER_CHILD, updated_by: TEACHER, updated_by_name: "Ms. Reed" }
    ],
    teacher_student_groups: [
      { id: "group-1", teacher_id: TEACHER, member_student_ids: [CHILD, OTHER_CHILD] }
    ],
    teacher_learning_paths: [{ id: "path-1", teacher_id: TEACHER }],
    learning_path_step_progress: [{ id: "step-1", student_id: CHILD }],
    adaptive_skill_state: [{ user_id: CHILD }],
    adaptive_recommendation_cache: [{ user_id: CHILD }],
    visualization_events: [{ user_id: CHILD }],
    learning_events: [{ user_id: CHILD }],
    learning_event_clears: [{ user_id: CHILD }],
    visualization_sessions: [{ user_id: CHILD }],

    ai_tutor_messages: [
      { id: "msg-1", user_id: CHILD, content: "i am scared about the test" },
      { id: "msg-2", user_id: OTHER_CHILD, content: "hello" }
    ],
    ai_tutor_usage: [{ user_id: CHILD }],
    ai_governance_events: [{ id: "gov-1", user_id: CHILD, capability: "ai-tutor" }],
    content_safety_flags: [
      {
        id: "flag-1",
        student_id: CHILD,
        student_name: "Ada",
        excerpt: "a quote of the child's words",
        resolved_by: TEACHER,
        resolved_by_name: "Ms. Reed",
        resolution_note: "spoke with the family",
        acknowledged_by: null,
        acknowledged_by_name: null
      }
    ],
    class_ai_tutor_policies: [{ class_id: "class-1", updated_by: TEACHER }],
    nova_lens_runs: [{ user_id: CHILD, selected_text_preview: "some selected text" }],
    nova_lens_policy: { updated_by: SCHOOL_ADMIN },
    nova_lens_policy_events: [{ id: "policy-event-1", actor_id: SCHOOL_ADMIN }],
    ai_tutor_transcript_access_events: [
      { id: "access-1", viewer_id: TEACHER, viewer_name: "Ms. Reed", student_id: CHILD, student_name: "Ada" }
    ],

    teacher_classes: [{ id: "class-1", teacher_id: TEACHER }],
    class_enrollments: [
      { id: "enrol-1", class_id: "class-1", student_id: CHILD },
      { id: "enrol-2", class_id: "class-1", student_id: OTHER_CHILD }
    ],
    class_roster_profiles: [
      { enrollment_id: "enrol-1", seat_label: "A1" },
      { enrollment_id: "enrol-2", seat_label: "A2" }
    ],
    assignments: [{ id: "assignment-1", class_id: "class-1", created_by: TEACHER }],
    deleted_assignment_ids: ["assignment-old"],
    submissions: [
      { id: "sub-1", assignment_id: "assignment-1", student_id: CHILD },
      { id: "sub-2", assignment_id: "assignment-1", student_id: OTHER_CHILD }
    ],
    assignment_submission_attempts: [
      { id: "attempt-1", submission_id: "sub-1", student_id: CHILD, image_object_key: "assignment-image/2026/07/abc/two" },
      { id: "attempt-2", submission_id: "sub-2", student_id: OTHER_CHILD }
    ],
    assignment_grading_runs: [
      { id: "run-1", submission_id: "sub-1" },
      { id: "run-2", submission_id: "sub-2" }
    ],
    assignment_teacher_reviews: [
      { id: "review-1", submission_id: "sub-1", reviewed_by: TEACHER },
      { id: "review-2", submission_id: "sub-2", reviewed_by: TEACHER }
    ],

    teacher_messages: [
      { id: "thread-1", student_id: CHILD, teacher_id: TEACHER, guardian_id: GUARDIAN },
      { id: "thread-2", student_id: OTHER_CHILD, teacher_id: TEACHER, guardian_id: OTHER_GUARDIAN }
    ],
    teacher_message_entries: [
      { id: "entry-1", thread_id: "thread-1", sender_id: TEACHER, recipient_id: GUARDIAN, body: "about Ada" },
      { id: "entry-2", thread_id: "thread-2", sender_id: TEACHER, recipient_id: OTHER_GUARDIAN, body: "about Ben" }
    ],
    teacher_notices: [{ id: "notice-1", teacher_id: TEACHER }],
    teacher_notice_recipients: [
      { id: "recipient-1", notice_id: "notice-1", student_id: CHILD, guardian_id: GUARDIAN },
      { id: "recipient-2", notice_id: "notice-1", student_id: OTHER_CHILD, guardian_id: OTHER_GUARDIAN }
    ],
    teacher_notice_delivery_attempts: [{ id: "delivery-1", notice_id: "notice-1" }],
    teacher_reminder_runs: [{ id: "reminder-1", teacher_id: TEACHER, student_id: CHILD }],

    teaching_resources: [{ id: "resource-1", uploaded_by: TEACHER }],
    teacher_lesson_kits: [{ id: "kit-1", teacher_id: TEACHER }],
    teacher_review_lessons: [{ id: "review-lesson-1", teacher_id: TEACHER }],
    teacher_class_collaborators: [{ id: "collab-1", teacher_id: TEACHER, invited_by: SCHOOL_ADMIN }],
    prep_teams: [{ id: "prep-1", created_by: TEACHER, teacher_ids: [TEACHER, "teacher-other"] }],
    prep_team_shares: [{ id: "share-1", created_by: TEACHER }],
    assessments: [{ id: "assessment-1", class_id: "class-1", created_by: TEACHER }],
    assessment_submissions: [
      { id: "asub-1", assessment_id: "assessment-1", student_id: CHILD },
      { id: "asub-2", assessment_id: "assessment-1", student_id: OTHER_CHILD }
    ],
    teacher_reports: [{ id: "report-1", student_id: CHILD, generated_by: TEACHER }],
    term_archives: [{ id: "archive-1", created_by: TEACHER }],

    teacher_live_sessions: [{ id: "session-1", teacher_id: TEACHER }],
    teacher_live_prompts: [{ id: "prompt-1", session_id: "session-1" }],
    teacher_live_responses: [
      { id: "response-1", session_id: "session-1", student_id: CHILD },
      { id: "response-2", session_id: "session-1", student_id: OTHER_CHILD }
    ],
    classroom_work_samples: [
      { id: "sample-1", session_id: "session-1", student_id: CHILD, image_object_key: "classroom-work-sample/2026/07/abc/three" }
    ],
    teacher_live_tool_states: [
      {
        session_id: "session-1",
        attendance: [
          { studentId: CHILD, studentName: "Ada", status: "present" },
          { studentId: OTHER_CHILD, studentName: "Ben", status: "present" }
        ],
        random_call: { currentStudentId: CHILD, currentStudentName: "Ada", selectedStudentIds: [CHILD, OTHER_CHILD] },
        buzzer: { id: "round-1", entries: [{ studentId: CHILD }, { studentId: OTHER_CHILD }] },
        teams: { teams: [{ id: "team-1", studentIds: [CHILD, OTHER_CHILD], score: 3 }] }
      }
    ],

    reward_catalog: [{ id: "reward-1" }],
    reward_point_ledger: [
      { id: "ledger-1", student_id: CHILD, awarded_by: TEACHER },
      { id: "ledger-2", student_id: OTHER_CHILD, awarded_by: TEACHER }
    ],
    reward_redemptions: [{ id: "redemption-1", student_id: CHILD, decided_by: TEACHER }],
    gamification_events: [{ id: "event-1", student_id: CHILD }],
    practice_island_stars: [{ student_id: CHILD, region_id: "region-1", stars: 3 }],
    fishing_dex: [{ student_id: CHILD, species: "carp" }],
    adventure_relics: [{ student_id: CHILD, topic_id: "topic-1" }],
    reward_campaigns: [{ id: "campaign-1", teacher_id: TEACHER }],

    forum_threads: [
      {
        threadId: "thread-solo",
        classId: "class-1",
        author: { id: CHILD, name: "Ada" },
        title: { en: "my question", zh: "我的問題" },
        body: { en: "i do not understand", zh: "我不明白" },
        replies: [],
        meTooUserIds: [],
        meTooCount: 0
      },
      {
        threadId: "thread-shared",
        classId: "class-1",
        author: { id: CHILD, name: "Ada" },
        title: { en: "another question", zh: "另一個問題" },
        body: { en: "help please", zh: "請幫忙" },
        attachments: [{ name: "photo.png" }],
        replies: [
          { replyId: "reply-1", author: { id: TEACHER, name: "Ms. Reed" }, body: { en: "sure" } },
          { replyId: "reply-2", author: { id: CHILD, name: "Ada" }, body: { en: "thanks" } }
        ],
        meTooUserIds: [CHILD, OTHER_CHILD],
        meTooCount: 2,
        live: {
          sessionId: "live-1",
          pulses: [
            { pulseId: "pulse-1", author: { id: CHILD, name: "Ada" }, body: { en: "still stuck" } },
            { pulseId: "pulse-2", author: { id: OTHER_CHILD, name: "Ben" }, body: { en: "me too" } }
          ]
        }
      },
      {
        threadId: "thread-other",
        classId: "class-1",
        author: { id: OTHER_CHILD, name: "Ben" },
        title: { en: "ben's question" },
        body: { en: "hello" },
        replies: [],
        meTooUserIds: [],
        meTooCount: 0,
        moderation: { status: "reviewed", reviewedBy: TEACHER, reportCount: 1 }
      }
    ],
    forum_reports: [
      { reportId: "report-1", reporterId: CHILD, reporterName: "Ada", note: "this is mean", threadId: "thread-other" }
    ],
    forum_audit_events: [{ auditId: "audit-1", actorId: TEACHER, actorName: "Ms. Reed" }],
    forum_notifications: [
      { notificationId: "notif-1", recipientId: CHILD, actorId: TEACHER, actorName: "Ms. Reed" },
      { notificationId: "notif-2", recipientId: OTHER_CHILD, actorId: TEACHER, actorName: "Ms. Reed" }
    ]
  };
}

function erase(database: Database, subjectId: string) {
  return eraseUserFromDatabase({ database, subjectId, now: new Date("2026-07-31T09:00:00Z") });
}

// --- Authorization -----------------------------------------------------------

test("the account holder may erase their own account", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: CHILD, subjectId: CHILD });
  assert.deepEqual(result, { status: "authorized", basis: "self" });
});

test("an active guardian may erase their linked child", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: GUARDIAN, subjectId: CHILD });
  assert.deepEqual(result, { status: "authorized", basis: "guardian" });
});

test("a guardian whose link is not active may not erase the child", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: OTHER_GUARDIAN, subjectId: CHILD });
  assert.equal(result.status, "denied");
  assert.equal(result.status === "denied" && result.code, "not-authorized");
});

test("a school admin may erase a learner at their own school", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: SCHOOL_ADMIN, subjectId: CHILD });
  assert.deepEqual(result, { status: "authorized", basis: "school-admin" });
});

test("a school admin may not erase a learner at another school", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: OTHER_SCHOOL_ADMIN, subjectId: CHILD });
  assert.equal(result.status, "denied");
  assert.equal(result.status === "denied" && result.code, "not-authorized");
});

test("an unscoped platform admin may erase anyone", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: PLATFORM_ADMIN, subjectId: CHILD });
  assert.deepEqual(result, { status: "authorized", basis: "platform-admin" });
});

test("a teacher may not erase a learner in their class", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: TEACHER, subjectId: CHILD });
  assert.equal(result.status, "denied");
  assert.equal(result.status === "denied" && result.code, "not-authorized");
});

test("one learner may not erase another", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: OTHER_CHILD, subjectId: CHILD });
  assert.equal(result.status, "denied");
});

test("erasing an unknown subject is refused", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({ database, requesterId: PLATFORM_ADMIN, subjectId: "ghost" });
  assert.equal(result.status === "denied" && result.code, "subject-not-found");
});

test("a seeded demo account is refused rather than falsely reported erased", () => {
  const database = createDatabase();
  const result = resolveErasureAuthorization({
    database,
    requesterId: PLATFORM_ADMIN,
    subjectId: CHILD,
    seededAccountIds: [CHILD]
  });
  assert.equal(result.status === "denied" && result.code, "seeded-account-protected");
});

// --- Identity and credentials ------------------------------------------------

test("identity, credentials, and reset tokens are hard-deleted", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.equal(database.users.some((row) => row.id === CHILD), false);
  assert.equal(database.auth_identities.length, 0);
  assert.equal(database.student_profiles.some((row) => row.user_id === CHILD), false);
  assert.equal(database.user_settings.some((row) => row.user_id === CHILD), false);
  assert.equal(database.learner_profiles.length, 0);
  assert.equal(database.password_reset_tokens.length, 0);
  assert.equal(database.school_memberships.some((row) => row.user_id === CHILD), false);
  assert.equal(database.provisioning_row_results.length, 0, "roster rows carry a temporary password");
});

test("the guardian relationship is removed from both directions", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(database.guardian_links.some((link) => link.student_id === CHILD), false);
  assert.equal(database.guardian_links.length, 1, "the unrelated family link survives");
});

// --- Learner data ------------------------------------------------------------

test("learner work, telemetry, and gamification are hard-deleted", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.equal(database.attempts.length, 1, "the other learner's attempts survive");
  assert.equal(database.mistakes.length, 0);
  assert.equal(database.lesson_progress.length, 0);
  assert.equal(database.adaptive_skill_state.length, 0);
  assert.equal(database.adaptive_recommendation_cache.length, 0);
  assert.equal(database.learning_events.length, 0);
  assert.equal(database.learning_event_clears.length, 0);
  assert.equal(database.visualization_events.length, 0);
  assert.equal(database.visualization_sessions.length, 0);
  assert.equal(database.learning_path_step_progress.length, 0);
  assert.equal(database.gamification_events.length, 0);
  assert.equal(database.practice_island_stars?.length, 0);
  assert.equal(database.fishing_dex?.length, 0);
  assert.equal(database.adventure_relics?.length, 0);
  assert.equal(database.reward_redemptions.length, 0);
});

test("accommodations, a special category of data, are hard-deleted", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(database.student_accommodations.some((row) => row.student_id === CHILD), false);
  assert.equal(database.student_accommodations.length, 1);
});

test("AI tutor transcripts and usage are hard-deleted", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.deepEqual(database.ai_tutor_messages.map((row) => row.id), ["msg-2"]);
  assert.equal(database.ai_tutor_usage.length, 0);
  assert.equal(database.nova_lens_runs.length, 0, "selected-text previews are the learner's own words");
});

test("no free text written by the erased learner survives anywhere in the snapshot", () => {
  const database = createDatabase();
  erase(database, CHILD);
  const serialized = JSON.stringify(database);
  for (const phrase of [
    "i am scared about the test",
    "a quote of the child's words",
    "some selected text",
    "i do not understand",
    "help please",
    "thanks",
    "still stuck",
    "this is mean",
    "Mais-secret"
  ]) {
    assert.equal(serialized.includes(phrase), false, `"${phrase}" survived erasure`);
  }
});

test("the subject id does not survive anywhere in the snapshot", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(JSON.stringify(database).includes(CHILD), false);
});

// --- Institutional records survive, anonymised -------------------------------

test("a teacher's classes and assignments survive their erasure, tombstoned", () => {
  const database = createDatabase();
  erase(database, TEACHER);

  assert.equal(database.teacher_classes.length, 1, "deleting the class would delete every learner's work");
  assert.equal(database.teacher_classes[0].teacher_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.assignments[0].created_by, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.assessments[0].created_by, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.teaching_resources[0].uploaded_by, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.term_archives[0].created_by, ERASED_USER_TOMBSTONE_ID);

  assert.equal(database.submissions.length, 2, "learners' submissions are untouched");
  assert.equal(database.assessment_submissions.length, 2);
});

test("a teacher's erasure strips their name from another learner's records", () => {
  const database = createDatabase();
  erase(database, TEACHER);

  const otherChildAccommodations = database.student_accommodations.find((row) => row.student_id === OTHER_CHILD);
  assert.equal(otherChildAccommodations?.updated_by, ERASED_USER_TOMBSTONE_ID);
  assert.equal(otherChildAccommodations?.updated_by_name, ERASED_USER_TOMBSTONE_NAME);
  assert.equal(database.reward_point_ledger.every((row) => row.awarded_by === ERASED_USER_TOMBSTONE_ID), true);
});

test("a teacher is dropped from prep-team and small-group membership arrays", () => {
  const database = createDatabase();
  erase(database, TEACHER);
  assert.deepEqual(database.prep_teams[0].teacher_ids, ["teacher-other"]);
});

test("a learner is dropped from small-group membership without deleting the group", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(database.teacher_student_groups.length, 1);
  assert.deepEqual(database.teacher_student_groups[0].member_student_ids, [OTHER_CHILD]);
});

test("the safeguarding trail survives without the child's identity or words", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.equal(database.content_safety_flags.length, 1, "the school's duty-of-care record survives");
  const flag = database.content_safety_flags[0];
  assert.equal(flag.student_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(flag.student_name, ERASED_USER_TOMBSTONE_NAME);
  assert.notEqual(flag.excerpt, "a quote of the child's words");
  assert.equal(flag.resolved_by, TEACHER, "the responding teacher is not the erasure subject");
});

test("erasing one person named in a shared record leaves the others' names intact", () => {
  const database = createDatabase();
  // The teacher resolved a flag ABOUT the child. Erasing the teacher must not
  // blank the child's name or destroy the excerpt quoting the child.
  erase(database, TEACHER);

  const flag = database.content_safety_flags[0];
  assert.equal(flag.resolved_by, ERASED_USER_TOMBSTONE_ID);
  assert.equal(flag.resolved_by_name, ERASED_USER_TOMBSTONE_NAME);
  assert.notEqual(flag.resolution_note, "spoke with the family", "the teacher's own note is their words");
  assert.equal(flag.student_id, CHILD, "the child is not being erased");
  assert.equal(flag.student_name, "Ada");
  assert.equal(flag.excerpt, "a quote of the child's words", "the child's record is untouched");

  const access = database.ai_tutor_transcript_access_events[0];
  assert.equal(access.viewer_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(access.viewer_name, ERASED_USER_TOMBSTONE_NAME);
  assert.equal(access.student_id, CHILD);
  assert.equal(access.student_name, "Ada");
});

test("erasing the child clears the child's side of a shared record only", () => {
  const database = createDatabase();
  erase(database, CHILD);

  const flag = database.content_safety_flags[0];
  assert.equal(flag.student_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(flag.excerpt, "[removed on account deletion]");
  assert.equal(flag.resolved_by, TEACHER, "the responding teacher is untouched");
  assert.equal(flag.resolved_by_name, "Ms. Reed");
  assert.equal(flag.resolution_note, "spoke with the family", "the teacher's note is the teacher's data");
});

test("the AI-governance and transcript-access audit trails survive, anonymised", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.equal(database.ai_governance_events.length, 1);
  assert.equal(database.ai_governance_events[0].user_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.ai_tutor_transcript_access_events.length, 1);
  assert.equal(database.ai_tutor_transcript_access_events[0].student_id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.ai_tutor_transcript_access_events[0].student_name, ERASED_USER_TOMBSTONE_NAME);
  assert.equal(database.ai_tutor_transcript_access_events[0].viewer_id, TEACHER);
});

// --- Cascades ----------------------------------------------------------------

test("rows reachable only through a deleted parent are cascaded away", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.deepEqual(database.submissions.map((row) => row.id), ["sub-2"]);
  assert.deepEqual(database.assignment_grading_runs.map((row) => row.id), ["run-2"]);
  assert.deepEqual(database.assignment_teacher_reviews.map((row) => row.id), ["review-2"]);
  assert.deepEqual(database.assignment_submission_attempts.map((row) => row.id), ["attempt-2"]);
  assert.deepEqual(database.class_roster_profiles.map((row) => row.enrollment_id), ["enrol-2"]);
  assert.deepEqual(database.teacher_message_entries.map((row) => row.id), ["entry-2"]);
  assert.deepEqual(database.teacher_messages.map((row) => row.id), ["thread-2"]);
});

test("a notice delivered to other families keeps its delivery telemetry", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(database.teacher_notice_recipients.length, 1);
  assert.equal(
    database.teacher_notice_delivery_attempts.length,
    1,
    "another family still received this notice"
  );
});

// --- Live sessions -----------------------------------------------------------

test("live-session state keeps the room but loses the erased learner", () => {
  const database = createDatabase();
  erase(database, CHILD);

  const state = database.teacher_live_tool_states[0] as Record<string, any>;
  assert.deepEqual(state.attendance.map((entry: any) => entry.studentId), [OTHER_CHILD]);
  assert.equal(state.random_call.currentStudentId, null);
  assert.equal(state.random_call.currentStudentName, null);
  assert.deepEqual(state.random_call.selectedStudentIds, [OTHER_CHILD]);
  assert.deepEqual(state.buzzer.entries.map((entry: any) => entry.studentId), [OTHER_CHILD]);
  assert.deepEqual(state.teams.teams[0].studentIds, [OTHER_CHILD]);
  assert.deepEqual(database.teacher_live_responses.map((row) => row.id), ["response-2"]);
});

// --- Forum -------------------------------------------------------------------

test("a thread nobody replied to is deleted outright", () => {
  const database = createDatabase();
  erase(database, CHILD);
  assert.equal(database.forum_threads.some((thread: any) => thread.threadId === "thread-solo"), false);
});

test("a thread others joined survives, tombstoned, keeping their replies", () => {
  const database = createDatabase();
  erase(database, CHILD);

  const thread = database.forum_threads.find((row: any) => row.threadId === "thread-shared") as any;
  assert.ok(thread, "the thread survives so the teacher's reply keeps its context");
  assert.equal(thread.author.id, ERASED_USER_TOMBSTONE_ID);
  assert.equal(thread.author.name, ERASED_USER_TOMBSTONE_NAME);
  assert.deepEqual(Object.keys(thread.title).sort(), ["en", "zh"], "the LocalizedText shape is preserved");
  assert.deepEqual(thread.attachments, []);
  assert.deepEqual(thread.replies.map((reply: any) => reply.replyId), ["reply-1"]);
  assert.deepEqual(thread.live.pulses.map((pulse: any) => pulse.pulseId), ["pulse-2"]);
  assert.deepEqual(thread.meTooUserIds, [OTHER_CHILD]);
  assert.equal(thread.meTooCount, 1);
});

test("forum moderation and notification records lose the erased identity", () => {
  const database = createDatabase();
  erase(database, CHILD);

  assert.equal(database.forum_reports[0].reporterId, ERASED_USER_TOMBSTONE_ID);
  assert.equal(database.forum_reports[0].reporterName, ERASED_USER_TOMBSTONE_NAME);
  assert.deepEqual(database.forum_notifications.map((row: any) => row.notificationId), ["notif-2"]);
});

test("a moderator's erasure leaves the reviewed content in place", () => {
  const database = createDatabase();
  erase(database, TEACHER);
  const thread = database.forum_threads.find((row: any) => row.threadId === "thread-other") as any;
  assert.equal(thread.moderation.reviewedBy, ERASED_USER_TOMBSTONE_ID);
  assert.equal(thread.moderation.status, "reviewed");
});

// --- Receipt and idempotency -------------------------------------------------

test("the receipt reports the media object keys the object store must purge", () => {
  const database = createDatabase();
  const receipt = erase(database, CHILD);
  assert.deepEqual(receipt.mediaObjectKeys.sort(), [
    "assignment-image/2026/07/abc/two",
    "avatar/2026/07/abc/one",
    "classroom-work-sample/2026/07/abc/three"
  ]);
});

test("the receipt tallies what was deleted and what was anonymised", () => {
  const database = createDatabase();
  const receipt = erase(database, CHILD);
  assert.equal(receipt.subjectId, CHILD);
  assert.equal(receipt.subjectRole, "student");
  assert.equal(receipt.erasedAt, "2026-07-31T09:00:00.000Z");
  assert.equal(receipt.deleted.ai_tutor_messages, 1);
  assert.equal(receipt.deleted.submissions, 1);
  assert.equal(receipt.anonymised.content_safety_flags, 1);
});

test("erasure is idempotent", () => {
  const database = createDatabase();
  erase(database, CHILD);
  const snapshot = JSON.stringify(database);

  const second = erase(database, CHILD);
  assert.equal(JSON.stringify(database), snapshot, "a repeat run changes nothing");
  assert.deepEqual(second.deleted, {});
  assert.deepEqual(second.anonymised, {});
  assert.deepEqual(second.mediaObjectKeys, []);
});

test("erasing one learner leaves the other learner's record intact", () => {
  const database = createDatabase();
  const before = JSON.stringify(
    createDatabase().attempts.filter((row) => row.user_id === OTHER_CHILD)
  );
  erase(database, CHILD);
  assert.equal(JSON.stringify(database.attempts.filter((row) => row.user_id === OTHER_CHILD)), before);
  assert.equal(database.users.some((row) => row.id === OTHER_CHILD), true);
});

// --- Policy completeness -----------------------------------------------------

/**
 * The real risk with erasure is drift: someone adds a collection to `Database`
 * in `userStore.ts` and nobody classifies it, so personal data quietly survives
 * deletion. `Database` is a type, so there is nothing to reflect over at
 * runtime — read the declaration and compare it against the policy.
 */
function snapshotCollectionNames() {
  const source = readFileSync(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const block = source.split("\ntype Database = {")[1]?.split("\n};")[0];
  assert.ok(block, "could not locate `type Database` in lib/server/userStore.ts");
  return block
    .split("\n")
    .map((line) => line.trim().match(/^([a-z_]+)\??:/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => match[1]);
}

test("every snapshot collection is classified by the erasure policy", () => {
  const classified = classifiedErasureCollections();
  const unclassified = snapshotCollectionNames().filter((name) => !classified.has(name));
  assert.deepEqual(
    unclassified,
    [],
    `Unclassified collections in lib/server/userStore.ts. Add each to SUBJECT_OWNED_COLLECTIONS, ` +
      `ACTOR_REFERENCE_COLLECTIONS, MEMBERSHIP_ARRAY_COLLECTIONS or RETAINED_COLLECTIONS in ` +
      `accountErasurePersistence.ts, and document it in docs/compliance/data-erasure.md: ` +
      unclassified.join(", ")
  );
});

test("the erasure policy names no collection that has left the snapshot", () => {
  const live = new Set(snapshotCollectionNames());
  const stale = [...classifiedErasureCollections()].filter((name) => !live.has(name));
  assert.deepEqual(stale, [], `Policy references collections that no longer exist: ${stale.join(", ")}`);
});

test("every classified collection carries a documented reason", () => {
  accountErasurePolicy().forEach((entry) => {
    assert.ok(
      entry.reason.trim().length > 10,
      `${entry.collection} (${entry.disposition}) needs a reason a DPA reviewer can read`
    );
  });
});
