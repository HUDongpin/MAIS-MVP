/**
 * Structural view of the app-state snapshot for account erasure.
 *
 * Erasure has to touch nearly every collection in `Database`, so rather than
 * import the real record types (which would drag most of `userStore.ts` into
 * this module and into its tests), each collection is declared with only the
 * fields the erasure policy reads or writes. The real `Database` is structurally
 * assignable to this type, and `accountErasureCompleteness.test.ts` asserts that
 * this view lists exactly the same collections as the real one — so a new
 * collection in `userStore.ts` fails the build here until it is classified.
 */

type Row = Record<string, unknown>;

/** Any row carrying one user-id column; extra fields are read dynamically. */
type Linked<Fields extends string> = { [K in Fields]?: unknown } & Row;

export type ErasureUserRow = {
  id: string;
  role: string;
  school_id?: string;
} & Row;

export type ErasureGuardianLinkRow = {
  parent_id: string;
  student_id: string;
  status: string;
} & Row;

export type ErasureSchoolMembershipRow = {
  user_id: string;
  school_id: string;
} & Row;

export type ErasureStudentProfileRow = {
  user_id: string;
  avatar_media_object_key?: string;
} & Row;

export type Database = {
  // Identity and account state
  users: ErasureUserRow[];
  auth_identities: Linked<"user_id">[];
  student_profiles: ErasureStudentProfileRow[];
  user_settings: Linked<"user_id">[];
  learner_profiles: Linked<"user_id">[];
  password_reset_tokens: Linked<"user_id">[];
  schools: Linked<"created_by">[];
  school_memberships: ErasureSchoolMembershipRow[];
  guardian_links: ErasureGuardianLinkRow[];
  provisioning_batches: Linked<"requested_by">[];
  provisioning_row_results: Linked<"user_id">[];

  // Curriculum content (no user link)
  topics: Row[];
  lessons: Row[];
  lesson_blocks: Row[];
  questions: Row[];

  // Learner work and telemetry
  attempts: Linked<"user_id">[];
  mistakes: Linked<"user_id">[];
  lesson_progress: Linked<"user_id">[];
  teacher_mastery_targets: Linked<"student_id">[];
  student_accommodations: Linked<"student_id" | "updated_by">[];
  teacher_student_groups: Linked<"teacher_id" | "member_student_ids">[];
  teacher_learning_paths: Linked<"teacher_id">[];
  learning_path_step_progress: Linked<"student_id">[];
  adaptive_skill_state: Linked<"user_id">[];
  adaptive_recommendation_cache: Linked<"user_id">[];
  visualization_events: Linked<"user_id">[];
  learning_events: Linked<"user_id">[];
  learning_event_clears: Linked<"user_id">[];
  visualization_sessions: Linked<"user_id">[];

  // AI transcripts, governance, and safeguarding
  ai_tutor_messages: Linked<"user_id">[];
  ai_tutor_usage: Linked<"user_id">[];
  ai_governance_events: Linked<"user_id">[];
  content_safety_flags: Linked<"student_id" | "acknowledged_by" | "resolved_by">[];
  class_ai_tutor_policies: Linked<"updated_by">[];
  nova_lens_runs: Linked<"user_id">[];
  nova_lens_policy: Linked<"updated_by">;
  nova_lens_policy_events: Linked<"actor_id">[];
  ai_tutor_transcript_access_events: Linked<"viewer_id" | "student_id">[];

  // Classroom
  teacher_classes: Linked<"teacher_id">[];
  class_enrollments: Linked<"student_id">[];
  class_roster_profiles: Linked<"enrollment_id">[];
  assignments: Linked<"created_by">[];
  deleted_assignment_ids: string[];
  submissions: Linked<"student_id">[];
  assignment_submission_attempts: Linked<"student_id" | "image_object_key">[];
  assignment_grading_runs: Linked<"submission_id">[];
  assignment_teacher_reviews: Linked<"submission_id" | "reviewed_by">[];

  // Communications
  teacher_messages: Linked<"student_id" | "teacher_id" | "guardian_id">[];
  teacher_message_entries: Linked<"thread_id" | "sender_id" | "recipient_id">[];
  teacher_notices: Linked<"teacher_id">[];
  teacher_notice_recipients: Linked<"student_id" | "guardian_id" | "acknowledged_by">[];
  teacher_notice_delivery_attempts: Linked<"notice_id">[];
  teacher_reminder_runs: Linked<"teacher_id" | "student_id">[];

  // Teacher assets
  teaching_resources: Linked<"uploaded_by">[];
  teacher_lesson_kits: Linked<"teacher_id">[];
  teacher_review_lessons: Linked<"teacher_id">[];
  teacher_class_collaborators: Linked<"teacher_id" | "invited_by">[];
  prep_teams: Linked<"created_by" | "teacher_ids">[];
  prep_team_shares: Linked<"created_by">[];
  assessments: Linked<"created_by">[];
  assessment_submissions: Linked<"student_id">[];
  teacher_reports: Linked<"student_id">[];
  term_archives: Linked<"created_by">[];

  // Live sessions
  teacher_live_sessions: Linked<"teacher_id">[];
  teacher_live_prompts: Row[];
  teacher_live_responses: Linked<"student_id">[];
  classroom_work_samples: Linked<"student_id" | "image_object_key">[];
  teacher_live_tool_states: Row[];

  // Gamification
  reward_catalog: Row[];
  reward_point_ledger: Linked<"student_id" | "awarded_by">[];
  reward_redemptions: Linked<"student_id" | "decided_by">[];
  gamification_events: Linked<"student_id">[];
  practice_island_stars?: Linked<"student_id">[];
  fishing_dex?: Linked<"student_id">[];
  adventure_relics?: Linked<"student_id">[];
  reward_campaigns: Linked<"teacher_id">[];

  // Forum
  forum_threads: Row[];
  forum_reports: Linked<"reporterId">[];
  forum_audit_events: Linked<"actorId">[];
  forum_notifications: Linked<"recipientId">[];
};
