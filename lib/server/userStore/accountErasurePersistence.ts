import type { Database } from "@/lib/server/userStore/accountErasureDatabase";

/**
 * Account deletion / data erasure over the app-state snapshot.
 *
 * The snapshot in `app_state.payload` is the source of truth for every
 * user-linked collection. On Postgres, `syncPostgresHotAuthTablesWith` and
 * `syncPostgresProjectionTablesWith` reconcile the `auth_*` and `projection_*`
 * tables against the snapshot on every write (they DELETE rows whose key is no
 * longer present), so erasing a subject from the snapshot inside
 * `mutateDatabase` propagates to those tables automatically. Two stores are NOT
 * reconciled and are erased separately by the orchestrator in `userStore.ts`:
 * the Postgres fast-path rows in `practiceAttemptStore.ts` and the encrypted
 * media objects on disk.
 *
 * Everything here is pure: it mutates the passed database object and returns a
 * receipt. No I/O, so the whole policy is unit-testable without a backend.
 */

export type ErasureSubjectRole = "student" | "teacher" | "parent" | "admin";

/** Disposition applied to a collection for the erasure subject. */
export type ErasureDisposition =
  /** Rows belonging to the subject are removed outright. */
  | "delete"
  /** Rows survive; the subject's identity inside them is replaced with a tombstone. */
  | "anonymise"
  /** Rows are untouched because they hold no data linked to an identifiable person. */
  | "retain";

export type ErasureAuthorizationBasis =
  | "self"
  | "guardian"
  | "school-admin"
  | "platform-admin";

export type ErasureAuthorizationResult =
  | { status: "authorized"; basis: ErasureAuthorizationBasis }
  | {
      status: "denied";
      code:
        | "subject-not-found"
        | "requester-not-found"
        | "not-authorized"
        | "seeded-account-protected";
      message: string;
    };

export type ErasureReceipt = {
  subjectId: string;
  subjectRole: ErasureSubjectRole;
  basis: ErasureAuthorizationBasis;
  erasedAt: string;
  /** Stable, non-reversing marker left in records that survive anonymisation. */
  tombstoneId: string;
  /** Rows removed, per collection. Only non-zero entries appear. */
  deleted: Record<string, number>;
  /** Rows whose subject reference was tombstoned, per collection. */
  anonymised: Record<string, number>;
  /**
   * Encrypted media objects the subject owned. The orchestrator deletes these
   * from the object store; they are collected here because the rows that
   * reference them are about to be removed from the snapshot.
   */
  mediaObjectKeys: string[];
};

/**
 * Anonymisation replaces a user id with a per-subject tombstone. It is a
 * one-way hash-free constant: the id is destroyed, not pseudonymised, so the
 * result is anonymous data outside the scope of GDPR Art.4(1) rather than
 * pseudonymised data still within it. Every erased subject collapses to the
 * same marker, so surviving records cannot be re-linked to each other either.
 */
export const ERASED_USER_TOMBSTONE_ID = "deleted-user";
export const ERASED_USER_TOMBSTONE_NAME = "Deleted user";
const ERASED_CONTENT_MARKER = "[removed on account deletion]";

/**
 * Collections whose rows are the subject's own record or their own generated
 * content. Matching rows are removed outright (COPPA 312.6 / GDPR Art.17 /
 * PIPL Art.47 erasure, and the destruction obligation in district DPAs).
 *
 * A row matches when ANY listed field equals the subject id.
 */
const SUBJECT_OWNED_COLLECTIONS: ReadonlyArray<{
  collection: keyof Database;
  fields: readonly string[];
  reason: string;
}> = [
  // --- Identity, credentials, and account state -----------------------------
  { collection: "users", fields: ["id"], reason: "The account record itself: username, email, password hash and salt." },
  { collection: "auth_identities", fields: ["user_id"], reason: "Federated (Google) identity link and the email captured at link time." },
  { collection: "student_profiles", fields: ["user_id"], reason: "Learner name, grade, curriculum, avatar, and the parent invite code." },
  { collection: "user_settings", fields: ["user_id"], reason: "Language, theme, and selected grade preferences." },
  { collection: "learner_profiles", fields: ["user_id"], reason: "Onboarding questionnaire answers." },
  { collection: "password_reset_tokens", fields: ["user_id"], reason: "Outstanding reset tokens; leaving them would allow post-deletion account takeover." },
  { collection: "school_memberships", fields: ["user_id"], reason: "Ties the person to a school and class." },
  { collection: "guardian_links", fields: ["parent_id", "student_id"], reason: "Family relationship graph — personal data for both parties." },
  { collection: "provisioning_row_results", fields: ["user_id"], reason: "Roster-import rows carry username, name, and temporary password." },

  // --- Learner-generated work and telemetry ---------------------------------
  { collection: "attempts", fields: ["user_id"], reason: "Practice answers." },
  { collection: "mistakes", fields: ["user_id"], reason: "Mistake book: wrong answers and the questions behind them." },
  { collection: "lesson_progress", fields: ["user_id"], reason: "Per-topic progress and mastery." },
  { collection: "adaptive_skill_state", fields: ["user_id"], reason: "Per-skill BKT mastery estimates." },
  { collection: "adaptive_recommendation_cache", fields: ["user_id"], reason: "Cached adaptive recommendations derived from the learner's history." },
  { collection: "learning_events", fields: ["user_id"], reason: "Learning-analytics event stream." },
  { collection: "learning_event_clears", fields: ["user_id"], reason: "Per-user clear watermark." },
  { collection: "visualization_events", fields: ["user_id"], reason: "Visualization interaction telemetry." },
  { collection: "visualization_sessions", fields: ["user_id"], reason: "Per-module exploration state." },
  { collection: "learning_path_step_progress", fields: ["student_id"], reason: "Progress through a teacher-authored path." },
  { collection: "student_accommodations", fields: ["student_id"], reason: "IEP/504 accommodations — special-category data under GDPR Art.9." },
  { collection: "teacher_mastery_targets", fields: ["student_id"], reason: "Per-student mastery target set by a teacher." },
  { collection: "class_enrollments", fields: ["student_id"], reason: "Class membership is the learner's own relationship, not the class's asset." },

  // --- Free-text and AI transcripts (highest-sensitivity child data) ---------
  { collection: "ai_tutor_messages", fields: ["user_id"], reason: "Free-text child/tutor transcripts." },
  { collection: "ai_tutor_usage", fields: ["user_id"], reason: "Per-user model token usage." },
  { collection: "nova_lens_runs", fields: ["user_id"], reason: "Stores a preview of the text the user selected on screen." },

  // --- Assignment and assessment work ---------------------------------------
  { collection: "submissions", fields: ["student_id"], reason: "Assignment submissions, scores, and teacher feedback about the learner." },
  { collection: "assignment_submission_attempts", fields: ["student_id"], reason: "Submitted answer text and uploaded work images." },
  { collection: "assessment_submissions", fields: ["student_id"], reason: "Assessment answers and scores." },
  { collection: "classroom_work_samples", fields: ["student_id"], reason: "Photographed classroom work." },
  { collection: "teacher_live_responses", fields: ["student_id"], reason: "Live-session answers." },

  // --- Gamification -----------------------------------------------------------
  { collection: "reward_point_ledger", fields: ["student_id"], reason: "Point ledger tied to the learner." },
  { collection: "reward_redemptions", fields: ["student_id"], reason: "Reward redemption history." },
  { collection: "gamification_events", fields: ["student_id"], reason: "XP and reward event stream." },
  { collection: "practice_island_stars", fields: ["student_id"], reason: "Per-region star totals." },
  { collection: "fishing_dex", fields: ["student_id"], reason: "Collection progress." },
  { collection: "adventure_relics", fields: ["student_id"], reason: "Collection progress." },

  // --- Communications about or from the subject ------------------------------
  { collection: "teacher_messages", fields: ["student_id"], reason: "Guardian/teacher threads are about a named learner; the thread has no meaning without them." },
  { collection: "teacher_message_entries", fields: ["sender_id", "recipient_id"], reason: "Free-text message bodies written by or addressed to the subject." },
  { collection: "teacher_notice_recipients", fields: ["student_id", "guardian_id"], reason: "Per-recipient delivery and acknowledgement state." },
  { collection: "teacher_reminder_runs", fields: ["student_id"], reason: "Per-student nagging history." },
  { collection: "teacher_reports", fields: ["student_id"], reason: "Generated reports about an individual learner." },
  { collection: "forum_notifications", fields: ["recipientId"], reason: "Notifications addressed to the subject." }
];

/**
 * Collections that belong to a school or another user but carry the subject's
 * id as an actor. Deleting these would destroy other people's data (a class,
 * every learner's assignment, a safeguarding audit trail), so the record
 * survives with the subject's identity removed.
 *
 * Each entry in `fields` is one id column, paired with the display-name and
 * free-text columns that belong to THAT actor. The pairing matters: a row can
 * name several people (a safeguarding flag names the child, the teacher who
 * acknowledged it, and the teacher who resolved it), and erasing one of them
 * must not blank out another's name or another's words.
 */
type ActorFieldRule = {
  /** Id column set to the tombstone when it names the subject. */
  field: string;
  /** Display-name column for this actor, set to the tombstone name. */
  nameField?: string;
  /** Free-text columns this actor authored, cleared as their own words. */
  textFields?: readonly string[];
};

const ACTOR_REFERENCE_COLLECTIONS: ReadonlyArray<{
  collection: keyof Database;
  fields: readonly ActorFieldRule[];
  reason: string;
}> = [
  { collection: "schools", fields: [{ field: "created_by" }], reason: "The school outlives the admin who created it." },
  { collection: "teacher_classes", fields: [{ field: "teacher_id" }], reason: "Deleting the class would delete every enrolled learner's assignments and submissions." },
  { collection: "teacher_class_collaborators", fields: [{ field: "teacher_id" }, { field: "invited_by" }], reason: "Co-teaching grants on a class that survives." },
  { collection: "assignments", fields: [{ field: "created_by" }], reason: "Other learners' submissions hang off the assignment." },
  { collection: "assessments", fields: [{ field: "created_by" }], reason: "Other learners' assessment submissions hang off it." },
  { collection: "assignment_teacher_reviews", fields: [{ field: "reviewed_by" }], reason: "Grading decision on another learner's work." },
  { collection: "teacher_notices", fields: [{ field: "teacher_id" }], reason: "Notice delivered to other families." },
  { collection: "teaching_resources", fields: [{ field: "uploaded_by" }], reason: "Teaching material is a school asset, not personal data." },
  { collection: "teacher_lesson_kits", fields: [{ field: "teacher_id" }], reason: "Lesson material is a school asset." },
  { collection: "teacher_review_lessons", fields: [{ field: "teacher_id" }], reason: "Lesson material is a school asset." },
  { collection: "teacher_student_groups", fields: [{ field: "teacher_id" }], reason: "Grouping of learners who are not being erased." },
  { collection: "teacher_learning_paths", fields: [{ field: "teacher_id" }], reason: "Path other learners are working through." },
  { collection: "teacher_live_sessions", fields: [{ field: "teacher_id" }], reason: "Session containing other learners' responses." },
  { collection: "prep_teams", fields: [{ field: "created_by" }], reason: "Shared teacher workspace." },
  { collection: "prep_team_shares", fields: [{ field: "created_by" }], reason: "Shared teacher workspace." },
  { collection: "term_archives", fields: [{ field: "created_by" }], reason: "End-of-term academic record retained under school policy." },
  { collection: "reward_campaigns", fields: [{ field: "teacher_id" }], reason: "Campaign other learners earn against." },
  { collection: "provisioning_batches", fields: [{ field: "requested_by" }], reason: "Roster-import audit trail for the school." },
  {
    collection: "student_accommodations",
    fields: [{ field: "updated_by", nameField: "updated_by_name" }],
    reason: "Another learner's accommodations record edited by the subject."
  },
  {
    collection: "reward_point_ledger",
    fields: [{ field: "awarded_by" }],
    reason: "Points awarded by the subject to a learner who is not being erased."
  },
  {
    collection: "reward_redemptions",
    fields: [{ field: "decided_by" }],
    reason: "Redemption decision on another learner's request."
  },
  {
    collection: "teacher_notice_recipients",
    fields: [{ field: "acknowledged_by" }],
    reason: "Acknowledgement on another family's notice."
  },
  {
    collection: "ai_governance_events",
    fields: [{ field: "user_id" }],
    reason:
      "AI-governance audit trail. Retained without the subject's identity so a regulator can still evidence that guardrails ran, per GDPR Art.17(3)(b)."
  },
  {
    collection: "ai_tutor_transcript_access_events",
    fields: [
      { field: "viewer_id", nameField: "viewer_name" },
      { field: "student_id", nameField: "student_name" }
    ],
    reason:
      "Records which adult opened which child's transcript. The accountability record must survive the child's erasure; the names must not. Erasing the viewer must not blank the child's name, or vice versa."
  },
  {
    collection: "content_safety_flags",
    fields: [
      // The excerpt quotes the child, so it goes with the child — not with a
      // teacher who merely acknowledged or resolved the flag.
      { field: "student_id", nameField: "student_name", textFields: ["excerpt"] },
      { field: "acknowledged_by", nameField: "acknowledged_by_name" },
      { field: "resolved_by", nameField: "resolved_by_name", textFields: ["resolution_note"] }
    ],
    reason:
      "Safeguarding escalations. The school's duty-of-care trail survives, but the child's identity and quoted words, and each responder's identity and notes, are destroyed with that person."
  },
  {
    collection: "nova_lens_policy_events",
    fields: [{ field: "actor_id" }],
    reason: "Platform policy-change audit trail."
  },
  {
    collection: "forum_reports",
    fields: [{ field: "reporterId", nameField: "reporterName", textFields: ["note"] }],
    reason: "Moderation trail on content that other class members can still see."
  },
  {
    collection: "forum_audit_events",
    fields: [{ field: "actorId", nameField: "actorName" }],
    reason: "Moderation audit trail."
  }
];

/** Collections holding a bare array of user ids the subject must be dropped from. */
const MEMBERSHIP_ARRAY_COLLECTIONS: ReadonlyArray<{
  collection: keyof Database;
  field: string;
  reason: string;
}> = [
  { collection: "prep_teams", field: "teacher_ids", reason: "Membership of a shared teacher workspace." },
  { collection: "teacher_student_groups", field: "member_student_ids", reason: "Membership of a differentiated small group." }
];

/**
 * Collections that hold no user-linked data at all, recorded explicitly so the
 * completeness test can prove nothing was simply forgotten.
 */
const RETAINED_COLLECTIONS: ReadonlyArray<{ collection: keyof Database; reason: string }> = [
  { collection: "topics", reason: "Curriculum content." },
  { collection: "lessons", reason: "Curriculum content." },
  { collection: "lesson_blocks", reason: "Curriculum content." },
  { collection: "questions", reason: "Curriculum content." },
  { collection: "reward_catalog", reason: "Catalogue definition, no user reference." },
  { collection: "class_ai_tutor_policies", reason: "Class-level policy; the `updated_by` actor is tombstoned by the class-policy rule below." },
  { collection: "nova_lens_policy", reason: "Single platform-wide policy object; its `updated_by` actor is tombstoned separately." },
  { collection: "deleted_assignment_ids", reason: "Opaque assignment ids, no user reference." },
  { collection: "assignment_grading_runs", reason: "Machine grading output; removed by cascade when its submission is deleted." },
  { collection: "class_roster_profiles", reason: "Seat/roster metadata; removed by cascade when its enrolment is deleted." },
  { collection: "teacher_live_prompts", reason: "Teacher-authored prompt text, no learner reference." },
  { collection: "teacher_notice_delivery_attempts", reason: "Delivery telemetry; removed by cascade when its notice recipient is deleted." },
  { collection: "teacher_live_tool_states", reason: "Handled explicitly: learner ids are stripped from the nested live-tool state." },
  { collection: "forum_threads", reason: "Handled explicitly: authored posts are removed and co-authored threads tombstoned." }
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function rowsOf(database: Database, collection: keyof Database): Record<string, unknown>[] {
  const value = database[collection];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

function tally(counter: Record<string, number>, key: string, amount: number) {
  if (amount <= 0) return;
  counter[key] = (counter[key] ?? 0) + amount;
}

/**
 * True when the subject is one of the demo/example accounts that
 * `syncDemoAccountsFromAuthSessionPersistence` recreates on every snapshot
 * read. Erasing one would appear to succeed and then silently reappear, so the
 * request is refused instead of reported as fulfilled.
 */
export function isSeededAccountId(subjectId: string, seededAccountIds: readonly string[]) {
  return seededAccountIds.includes(subjectId);
}

export function resolveErasureAuthorization({
  database,
  requesterId,
  subjectId,
  seededAccountIds = []
}: {
  database: Database;
  requesterId: string;
  subjectId: string;
  seededAccountIds?: readonly string[];
}): ErasureAuthorizationResult {
  const subject = database.users.find((candidate) => candidate.id === subjectId);
  if (!subject) {
    return { status: "denied", code: "subject-not-found", message: "No such account." };
  }

  const requester = database.users.find((candidate) => candidate.id === requesterId);
  if (!requester) {
    return { status: "denied", code: "requester-not-found", message: "Not authenticated." };
  }

  if (isSeededAccountId(subjectId, seededAccountIds)) {
    return {
      status: "denied",
      code: "seeded-account-protected",
      message:
        "This is a built-in demo account. It is recreated automatically from seed data, so it cannot be erased."
    };
  }

  const basis = erasureAuthorizationBasis({ database, requester, subject });
  if (!basis) {
    return {
      status: "denied",
      code: "not-authorized",
      message: "You may only delete your own account, your linked child's, or a learner at your school."
    };
  }

  return { status: "authorized", basis };
}

function erasureAuthorizationBasis({
  database,
  requester,
  subject
}: {
  database: Database;
  requester: Database["users"][number];
  subject: Database["users"][number];
}): ErasureAuthorizationBasis | null {
  if (requester.id === subject.id) return "self";

  // A guardian may act for a learner they hold an ACTIVE link to. Pending or
  // revoked links confer nothing.
  const hasActiveGuardianLink = database.guardian_links.some(
    (link) => link.parent_id === requester.id && link.student_id === subject.id && link.status === "active"
  );
  if (hasActiveGuardianLink) return "guardian";

  if (requester.role !== "admin") return null;

  // A school admin may act for members of their own school only. An admin with
  // no school scope is a platform operator and may act for anyone.
  const requesterSchoolIds = schoolIdsForUser(database, requester.id);
  if (!requesterSchoolIds.size) return "platform-admin";

  const subjectSchoolIds = schoolIdsForUser(database, subject.id);
  for (const schoolId of subjectSchoolIds) {
    if (requesterSchoolIds.has(schoolId)) return "school-admin";
  }

  return null;
}

function schoolIdsForUser(database: Database, userId: string) {
  const schoolIds = new Set<string>();
  const user = database.users.find((candidate) => candidate.id === userId);
  if (user?.school_id) schoolIds.add(user.school_id);
  database.school_memberships.forEach((membership) => {
    if (membership.user_id === userId && membership.school_id) schoolIds.add(membership.school_id);
  });
  return schoolIds;
}

/**
 * Removes the subject from the snapshot. The caller is responsible for having
 * authorized the request (see `resolveErasureAuthorization`) and for erasing
 * the fast-path rows and media objects the receipt points at.
 *
 * Safe to run twice: the second run finds nothing and returns empty tallies.
 */
export function eraseUserFromDatabase({
  database,
  subjectId,
  now = new Date()
}: {
  database: Database;
  subjectId: string;
  now?: Date;
}): Omit<ErasureReceipt, "basis"> {
  const subject = database.users.find((candidate) => candidate.id === subjectId);
  const subjectRole = (subject?.role ?? "student") as ErasureSubjectRole;
  const deleted: Record<string, number> = {};
  const anonymised: Record<string, number> = {};
  const mediaObjectKeys = collectMediaObjectKeys(database, subjectId);

  // Cascades run FIRST: they need the parent rows that are about to be deleted
  // in order to find their children.
  cascadeDeleteChildren({ database, subjectId, deleted });

  SUBJECT_OWNED_COLLECTIONS.forEach(({ collection, fields }) => {
    const rows = rowsOf(database, collection);
    if (!rows.length) return;
    const kept = rows.filter((row) => !fields.some((field) => row[field] === subjectId));
    const removed = rows.length - kept.length;
    if (!removed) return;
    (database as Record<string, unknown>)[collection as string] = kept;
    tally(deleted, collection as string, removed);
  });

  ACTOR_REFERENCE_COLLECTIONS.forEach(({ collection, fields }) => {
    rowsOf(database, collection).forEach((row) => {
      // Only the matching actor's own name and words are cleared: a row can
      // name several people, and the others are not being erased.
      const matched = fields.filter((rule) => row[rule.field] === subjectId);
      if (!matched.length) return;
      matched.forEach(({ field, nameField, textFields }) => {
        row[field] = ERASED_USER_TOMBSTONE_ID;
        if (nameField && row[nameField] !== null && row[nameField] !== undefined) {
          row[nameField] = ERASED_USER_TOMBSTONE_NAME;
        }
        textFields?.forEach((textField) => {
          if (typeof row[textField] === "string" && row[textField]) {
            row[textField] = ERASED_CONTENT_MARKER;
          }
        });
      });
      tally(anonymised, collection as string, 1);
    });
  });

  MEMBERSHIP_ARRAY_COLLECTIONS.forEach(({ collection, field }) => {
    rowsOf(database, collection).forEach((row) => {
      const members = row[field];
      if (!Array.isArray(members) || !members.includes(subjectId)) return;
      row[field] = members.filter((member) => member !== subjectId);
      tally(anonymised, collection as string, 1);
    });
  });

  eraseClassPolicyActors({ database, subjectId, anonymised });
  eraseLiveToolState({ database, subjectId, anonymised });
  eraseForumContent({ database, subjectId, deleted, anonymised });

  return {
    subjectId,
    subjectRole,
    erasedAt: now.toISOString(),
    tombstoneId: ERASED_USER_TOMBSTONE_ID,
    deleted,
    anonymised,
    mediaObjectKeys
  };
}

/**
 * Media lives in the encrypted object store keyed by `objectKey`, referenced
 * from rows that are about to disappear. Collect the keys before the rows go.
 *
 * These keys are needed in addition to an owner sweep of the store, because
 * objects are owned by whoever uploaded them: a classroom work sample
 * photographed by a teacher belongs to the teacher, even though it depicts an
 * erased learner's work.
 */
export function collectErasableMediaObjectKeys(database: Database, subjectId: string) {
  return collectMediaObjectKeys(database, subjectId);
}

function collectMediaObjectKeys(database: Database, subjectId: string) {
  const keys = new Set<string>();
  const push = (value: unknown) => {
    if (typeof value === "string" && value) keys.add(value);
  };

  database.student_profiles.forEach((profile) => {
    if (profile.user_id === subjectId) push(profile.avatar_media_object_key);
  });
  rowsOf(database, "assignment_submission_attempts").forEach((row) => {
    if (row.student_id === subjectId) push(row.image_object_key);
  });
  rowsOf(database, "classroom_work_samples").forEach((row) => {
    if (row.student_id === subjectId) push(row.image_object_key);
  });

  return [...keys];
}

/**
 * Children keyed by a parent row's id rather than by the subject. Once the
 * parent is deleted these rows are unreachable, so they must go with it.
 */
function cascadeDeleteChildren({
  database,
  subjectId,
  deleted
}: {
  database: Database;
  subjectId: string;
  deleted: Record<string, number>;
}) {
  const removeWhere = (collection: keyof Database, predicate: (row: Record<string, unknown>) => boolean) => {
    const rows = rowsOf(database, collection);
    if (!rows.length) return;
    const kept = rows.filter((row) => !predicate(row));
    const removed = rows.length - kept.length;
    if (!removed) return;
    (database as Record<string, unknown>)[collection as string] = kept;
    tally(deleted, collection as string, removed);
  };

  const submissionIds = new Set(
    rowsOf(database, "submissions")
      .filter((row) => row.student_id === subjectId)
      .map((row) => row.id as string)
  );
  if (submissionIds.size) {
    removeWhere("assignment_grading_runs", (row) => submissionIds.has(row.submission_id as string));
    removeWhere("assignment_teacher_reviews", (row) => submissionIds.has(row.submission_id as string));
  }

  const enrollmentIds = new Set(
    rowsOf(database, "class_enrollments")
      .filter((row) => row.student_id === subjectId)
      .map((row) => row.id as string)
  );
  if (enrollmentIds.size) {
    removeWhere("class_roster_profiles", (row) => enrollmentIds.has(row.enrollment_id as string));
  }

  const threadIds = new Set(
    rowsOf(database, "teacher_messages")
      .filter((row) => row.student_id === subjectId)
      .map((row) => row.id as string)
  );
  if (threadIds.size) {
    removeWhere("teacher_message_entries", (row) => threadIds.has(row.thread_id as string));
  }

  const noticeRecipientIds = new Set(
    rowsOf(database, "teacher_notice_recipients")
      .filter((row) => row.student_id === subjectId || row.guardian_id === subjectId)
      .map((row) => row.id as string)
  );
  if (noticeRecipientIds.size) {
    // Delivery attempts are keyed by notice_id + channel; drop the ones whose
    // only recipient was the subject.
    const survivingNoticeIds = new Set(
      rowsOf(database, "teacher_notice_recipients")
        .filter((row) => !noticeRecipientIds.has(row.id as string))
        .map((row) => row.notice_id as string)
    );
    const orphanedNoticeIds = new Set(
      rowsOf(database, "teacher_notice_recipients")
        .filter((row) => noticeRecipientIds.has(row.id as string))
        .map((row) => row.notice_id as string)
    );
    removeWhere(
      "teacher_notice_delivery_attempts",
      (row) =>
        orphanedNoticeIds.has(row.notice_id as string) && !survivingNoticeIds.has(row.notice_id as string)
    );
  }
}

/** `class_ai_tutor_policies.updated_by` and the singleton Nova Lens policy. */
function eraseClassPolicyActors({
  database,
  subjectId,
  anonymised
}: {
  database: Database;
  subjectId: string;
  anonymised: Record<string, number>;
}) {
  rowsOf(database, "class_ai_tutor_policies").forEach((row) => {
    if (row.updated_by !== subjectId) return;
    row.updated_by = ERASED_USER_TOMBSTONE_ID;
    tally(anonymised, "class_ai_tutor_policies", 1);
  });

  const policy = database.nova_lens_policy;
  if (isRecord(policy) && policy.updated_by === subjectId) {
    policy.updated_by = ERASED_USER_TOMBSTONE_ID;
    tally(anonymised, "nova_lens_policy", 1);
  }
}

/**
 * Live-session tool state nests learner ids inside attendance, random call,
 * buzzer entries, and team rosters. The session belongs to the teacher and to
 * the other learners in the room, so the state survives with the subject
 * stripped out of it.
 */
function eraseLiveToolState({
  database,
  subjectId,
  anonymised
}: {
  database: Database;
  subjectId: string;
  anonymised: Record<string, number>;
}) {
  rowsOf(database, "teacher_live_tool_states").forEach((row) => {
    let touched = false;

    const attendance = row.attendance;
    if (Array.isArray(attendance)) {
      const kept = attendance.filter((entry) => !(isRecord(entry) && entry.studentId === subjectId));
      if (kept.length !== attendance.length) {
        row.attendance = kept;
        touched = true;
      }
    }

    const randomCall = row.random_call;
    if (isRecord(randomCall)) {
      if (randomCall.currentStudentId === subjectId) {
        randomCall.currentStudentId = null;
        randomCall.currentStudentName = null;
        touched = true;
      }
      if (Array.isArray(randomCall.selectedStudentIds) && randomCall.selectedStudentIds.includes(subjectId)) {
        randomCall.selectedStudentIds = randomCall.selectedStudentIds.filter((id) => id !== subjectId);
        touched = true;
      }
    }

    const buzzer = row.buzzer;
    if (isRecord(buzzer) && Array.isArray(buzzer.entries)) {
      const kept = buzzer.entries.filter((entry) => !(isRecord(entry) && entry.studentId === subjectId));
      if (kept.length !== buzzer.entries.length) {
        buzzer.entries = kept;
        touched = true;
      }
    }

    const teams = row.teams;
    if (isRecord(teams) && Array.isArray(teams.teams)) {
      teams.teams.forEach((team) => {
        if (!isRecord(team) || !Array.isArray(team.studentIds)) return;
        if (!team.studentIds.includes(subjectId)) return;
        team.studentIds = team.studentIds.filter((id) => id !== subjectId);
        touched = true;
      });
    }

    if (touched) tally(anonymised, "teacher_live_tool_states", 1);
  });
}

/**
 * Forum content is a shared class conversation. The subject's own words are
 * their personal data and are removed; a thread other people replied to is
 * tombstoned rather than deleted so the surviving replies keep their context.
 */
function eraseForumContent({
  database,
  subjectId,
  deleted,
  anonymised
}: {
  database: Database;
  subjectId: string;
  deleted: Record<string, number>;
  anonymised: Record<string, number>;
}) {
  const threads = rowsOf(database, "forum_threads");
  if (!threads.length) return;

  const authoredBySubject = (value: unknown) => isRecord(value) && isRecord(value.author) && value.author.id === subjectId;

  const keptThreads = threads.filter((thread) => {
    const replies = Array.isArray(thread.replies) ? thread.replies : [];
    const liveState = isRecord(thread.live) ? thread.live : null;
    const pulses = liveState && Array.isArray(liveState.pulses) ? liveState.pulses : [];

    const othersRepliesRemain = replies.some((reply) => !authoredBySubject(reply));
    const othersPulsesRemain = pulses.some((pulse) => !authoredBySubject(pulse));

    // A thread the subject started, with nothing from anyone else, is theirs alone.
    if (authoredBySubject(thread) && !othersRepliesRemain && !othersPulsesRemain) return false;
    return true;
  });
  if (keptThreads.length !== threads.length) {
    tally(deleted, "forum_threads", threads.length - keptThreads.length);
    (database as Record<string, unknown>).forum_threads = keptThreads;
  }

  keptThreads.forEach((thread) => {
    let touched = false;

    if (authoredBySubject(thread)) {
      // Kept only because others replied: strip the subject's identity and words.
      anonymiseForumAuthor(thread);
      thread.title = localizedRemovalMarker(thread.title);
      thread.body = localizedRemovalMarker(thread.body);
      thread.attachments = [];
      touched = true;
    }

    if (Array.isArray(thread.replies)) {
      const kept = thread.replies.filter((reply) => !authoredBySubject(reply));
      if (kept.length !== thread.replies.length) {
        thread.replies = kept;
        touched = true;
      }
    }

    if (Array.isArray(thread.meTooUserIds) && thread.meTooUserIds.includes(subjectId)) {
      thread.meTooUserIds = thread.meTooUserIds.filter((id) => id !== subjectId);
      thread.meTooCount = Math.max(0, Number(thread.meTooCount ?? 0) - 1);
      touched = true;
    }

    const liveState = isRecord(thread.live) ? thread.live : null;
    if (liveState && Array.isArray(liveState.pulses)) {
      const kept = liveState.pulses.filter((pulse) => !authoredBySubject(pulse));
      if (kept.length !== liveState.pulses.length) {
        liveState.pulses = kept;
        touched = true;
      }
    }

    // `moderation.reviewedBy` on any surviving node names the subject as a moderator.
    if (anonymiseModerationReviewer(thread, subjectId)) touched = true;
    (Array.isArray(thread.replies) ? thread.replies : []).forEach((reply) => {
      if (anonymiseModerationReviewer(reply, subjectId)) touched = true;
    });
    (liveState && Array.isArray(liveState.pulses) ? liveState.pulses : []).forEach((pulse) => {
      if (anonymiseModerationReviewer(pulse, subjectId)) touched = true;
    });

    if (touched) tally(anonymised, "forum_threads", 1);
  });
}

function anonymiseForumAuthor(node: Record<string, unknown>) {
  if (!isRecord(node.author)) return;
  node.author.id = ERASED_USER_TOMBSTONE_ID;
  node.author.name = ERASED_USER_TOMBSTONE_NAME;
}

function anonymiseModerationReviewer(node: unknown, subjectId: string) {
  if (!isRecord(node) || !isRecord(node.moderation)) return false;
  if (node.moderation.reviewedBy !== subjectId) return false;
  node.moderation.reviewedBy = ERASED_USER_TOMBSTONE_ID;
  return true;
}

function localizedRemovalMarker(previous: unknown) {
  if (!isRecord(previous)) return ERASED_CONTENT_MARKER;
  // Preserve the LocalizedText shape (en/zh/...) so renderers keep working.
  return Object.fromEntries(Object.keys(previous).map((key) => [key, ERASED_CONTENT_MARKER]));
}

/**
 * Every collection this policy knows about, with its disposition. The
 * completeness test compares this against the live `Database` type so a newly
 * added collection cannot ship unclassified.
 */
export function accountErasurePolicy(): Array<{
  collection: string;
  disposition: ErasureDisposition;
  reason: string;
}> {
  const entries: Array<{ collection: string; disposition: ErasureDisposition; reason: string }> = [];
  SUBJECT_OWNED_COLLECTIONS.forEach(({ collection, reason }) =>
    entries.push({ collection: collection as string, disposition: "delete", reason })
  );
  ACTOR_REFERENCE_COLLECTIONS.forEach(({ collection, reason }) =>
    entries.push({ collection: collection as string, disposition: "anonymise", reason })
  );
  MEMBERSHIP_ARRAY_COLLECTIONS.forEach(({ collection, reason }) =>
    entries.push({ collection: collection as string, disposition: "anonymise", reason })
  );
  RETAINED_COLLECTIONS.forEach(({ collection, reason }) =>
    entries.push({ collection: collection as string, disposition: "retain", reason })
  );
  return entries;
}

/** Collection names the policy classifies, for the completeness test. */
export function classifiedErasureCollections() {
  return new Set(accountErasurePolicy().map((entry) => entry.collection));
}
