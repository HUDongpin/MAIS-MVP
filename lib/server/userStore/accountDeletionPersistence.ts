// Account deletion and subject-access export for the app-state blob.
//
// This module is a compliance artifact as much as it is code: it declares, for
// every table in the application state, what happens to that table's rows when a
// data subject asks to be deleted. `accountDeletionPlan` must therefore stay
// exhaustive — userStoreAccountDeletion.test.ts parses the `Database` type in
// lib/server/userStore.ts and fails if any table is missing an entry, so a new
// table cannot be added without someone deciding whether it holds user data.
//
// Deletion semantics, applied consistently:
//   * subject rows  — the user is who the row is *about* → the row is removed.
//   * cascade rows  — the row hangs off a removed row by id → removed with it.
//   * actor fields  — the user merely *acted on* someone else's row (a teacher
//     who acknowledged another child's safety flag) → the row survives and only
//     the departing user's identifiers/names are cleared, because the row is the
//     other person's record and deleting it would destroy their data.
//   * list membership — the user's id is pulled out of a roster array on a row
//     that belongs to someone else (a teacher's student group).
//   * content rows  — curriculum/catalogue data with no personal data at all.
//
// Teacher deletion deliberately refuses to cascade through owned classes; see
// `assessAccountDeletion`.

export type AccountDeletionActorField = {
  idField: string;
  nameFields?: readonly string[];
};

export type AccountDeletionCustomHandler =
  | "forum-threads"
  | "nova-lens-policy"
  | "teacher-live-tool-states";

export type AccountDeletionTableRule = {
  /** Row is removed when any of these scalar fields equals the user id. */
  purgeWhen?: readonly string[];
  /** Row is removed when it hangs off an already-removed row. */
  cascadeFrom?: readonly { table: string; fromField?: string; toField: string }[];
  /** User id is pulled out of these string[] fields; the row survives. */
  dropFromList?: readonly string[];
  /** Row survives; these identify the user only as a third-party actor. */
  scrubActors?: readonly AccountDeletionActorField[];
  /** Table holds no personal data. */
  content?: true;
  /** Non-array or nested-shape table handled by a named routine below. */
  custom?: AccountDeletionCustomHandler;
  /** Why this table is treated this way. Required — this doc is the audit trail. */
  note: string;
};

export type AccountDeletionPlan = Record<string, AccountDeletionTableRule>;

const subjectOf = (...fields: string[]) => fields;

export const accountDeletionPlan: AccountDeletionPlan = {
  users: { purgeWhen: subjectOf("id"), note: "The account record itself." },
  auth_identities: { purgeWhen: subjectOf("user_id"), note: "Federated (Google) identity links for the account." },
  student_profiles: { purgeWhen: subjectOf("user_id"), note: "Name, grade, avatar and parent invite code." },
  user_settings: { purgeWhen: subjectOf("user_id"), note: "Language/theme/selected grade preferences." },
  learner_profiles: { purgeWhen: subjectOf("user_id"), note: "Onboarding questionnaire answers." },
  schools: {
    scrubActors: [{ idField: "created_by" }],
    note: "A school is an institution that outlives whoever created it; only the creator reference is cleared."
  },
  school_memberships: { purgeWhen: subjectOf("user_id"), note: "The user's membership of a school." },
  provisioning_batches: {
    scrubActors: [{ idField: "requested_by" }],
    note: "Batch is an institutional provisioning record; only the requesting admin reference is cleared."
  },
  provisioning_row_results: { purgeWhen: subjectOf("user_id"), note: "Per-user result of a provisioning import." },
  guardian_links: {
    purgeWhen: subjectOf("parent_id", "student_id"),
    scrubActors: [{ idField: "created_by" }],
    note: "Parent-child link; removed when either party is deleted."
  },
  password_reset_tokens: { purgeWhen: subjectOf("user_id"), note: "Outstanding reset tokens for the account." },

  topics: { content: true, note: "Curriculum content." },
  lessons: { content: true, note: "Curriculum content." },
  lesson_blocks: { content: true, note: "Curriculum content." },
  questions: { content: true, note: "Curriculum content." },
  reward_catalog: { content: true, note: "Reward catalogue definitions; no personal data." },
  deleted_assignment_ids: { content: true, note: "Tombstone list of assignment ids; contains no user identifiers." },

  attempts: { purgeWhen: subjectOf("user_id"), note: "Every practice answer the learner submitted." },
  mistakes: { purgeWhen: subjectOf("user_id"), note: "Mistake-book entries." },
  lesson_progress: { purgeWhen: subjectOf("user_id"), note: "Per-topic lesson progress and mastery." },
  adaptive_skill_state: { purgeWhen: subjectOf("user_id"), note: "Adaptive-engine skill estimates." },
  adaptive_recommendation_cache: { purgeWhen: subjectOf("user_id"), note: "Cached adaptive recommendations." },
  visualization_events: { purgeWhen: subjectOf("user_id"), note: "Visualization interaction telemetry." },
  visualization_sessions: { purgeWhen: subjectOf("user_id"), note: "Visualization session records." },
  learning_events: { purgeWhen: subjectOf("user_id"), note: "Learning analytics event stream." },
  learning_event_clears: { purgeWhen: subjectOf("user_id"), note: "Analytics clear markers." },

  ai_tutor_messages: { purgeWhen: subjectOf("user_id"), note: "AI tutor chat transcripts — free-text authored by a child." },
  ai_tutor_usage: { purgeWhen: subjectOf("user_id"), note: "Per-user AI tutor quota/usage counters." },
  ai_governance_events: { purgeWhen: subjectOf("user_id"), note: "AI governance audit events attributed to the user." },
  content_safety_flags: {
    purgeWhen: subjectOf("student_id"),
    scrubActors: [
      { idField: "acknowledged_by", nameFields: ["acknowledged_by_name"] },
      { idField: "resolved_by", nameFields: ["resolved_by_name"] }
    ],
    note: "Safety flags about the child are removed with them; staff who merely triaged another child's flag are de-identified."
  },
  ai_tutor_transcript_access_events: {
    purgeWhen: subjectOf("student_id"),
    scrubActors: [{ idField: "viewer_id", nameFields: ["viewer_name"] }],
    note: "Access log about the child is removed; a departing viewer is de-identified on other children's rows."
  },
  nova_lens_runs: { purgeWhen: subjectOf("user_id"), note: "Nova Lens run history, including selected-text previews." },
  nova_lens_policy: { custom: "nova-lens-policy", note: "Singleton policy object; only its updated_by reference is cleared." },
  nova_lens_policy_events: { purgeWhen: subjectOf("actor_id"), note: "Policy changes the user made." },
  class_ai_tutor_policies: {
    scrubActors: [{ idField: "updated_by" }],
    note: "Class-scoped policy belonging to the class, not the editor."
  },

  teacher_classes: { purgeWhen: subjectOf("teacher_id"), note: "Classes the teacher owns; guarded by assessAccountDeletion." },
  class_enrollments: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "The learner's place on a roster."
  },
  class_roster_profiles: {
    cascadeFrom: [{ table: "class_enrollments", toField: "enrollment_id" }],
    note: "Seat/number metadata hanging off an enrollment."
  },
  teacher_mastery_targets: { purgeWhen: subjectOf("teacher_id", "student_id"), note: "Per-student mastery targets." },
  student_accommodations: {
    purgeWhen: subjectOf("student_id"),
    scrubActors: [{ idField: "updated_by", nameFields: ["updated_by_name"] }],
    note: "Accessibility accommodations — sensitive; removed with the learner."
  },
  teacher_student_groups: {
    purgeWhen: subjectOf("teacher_id"),
    dropFromList: ["member_student_ids"],
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Teacher-owned grouping; a deleted learner is pulled from the membership array."
  },
  teacher_learning_paths: {
    purgeWhen: subjectOf("teacher_id"),
    dropFromList: ["assigned_student_ids"],
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Teacher-owned path; a deleted learner is pulled from the assignment array."
  },
  learning_path_step_progress: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "teacher_learning_paths", toField: "path_id" }],
    note: "The learner's step completions."
  },

  assignments: {
    purgeWhen: subjectOf("created_by"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Assignments the teacher authored."
  },
  submissions: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "assignments", toField: "assignment_id" }],
    note: "The learner's submitted work."
  },
  assignment_submission_attempts: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "submissions", toField: "submission_id" }],
    note: "Uploaded attempt images/OCR text for a submission."
  },
  assignment_grading_runs: {
    cascadeFrom: [{ table: "submissions", toField: "submission_id" }],
    note: "Machine grading runs for a submission."
  },
  assignment_teacher_reviews: {
    cascadeFrom: [{ table: "submissions", toField: "submission_id" }],
    scrubActors: [{ idField: "reviewed_by" }],
    note: "Teacher review of a submission; reviewer de-identified on other learners' rows."
  },
  assessments: {
    purgeWhen: subjectOf("created_by"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Assessments the teacher authored."
  },
  assessment_submissions: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "assessments", toField: "assessment_id" }],
    note: "The learner's assessment answers."
  },

  teacher_messages: {
    purgeWhen: subjectOf("student_id", "teacher_id", "guardian_id"),
    note: "Message thread about a learner; inherently joint, removed on any participant's deletion."
  },
  teacher_message_entries: {
    purgeWhen: subjectOf("sender_id", "recipient_id"),
    cascadeFrom: [{ table: "teacher_messages", toField: "thread_id" }],
    note: "Individual messages, including free text about a child."
  },
  teacher_notices: { purgeWhen: subjectOf("teacher_id"), note: "Notices the teacher sent." },
  teacher_notice_recipients: {
    purgeWhen: subjectOf("student_id", "guardian_id"),
    cascadeFrom: [{ table: "teacher_notices", toField: "notice_id" }],
    scrubActors: [{ idField: "acknowledged_by" }],
    note: "Per-recipient delivery/acknowledgement state."
  },
  teacher_notice_delivery_attempts: {
    cascadeFrom: [{ table: "teacher_notices", toField: "notice_id" }],
    note: "Delivery attempt log for a notice."
  },
  teacher_reminder_runs: { purgeWhen: subjectOf("teacher_id", "student_id"), note: "Missing-work reminder runs." },
  teacher_reports: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    scrubActors: [{ idField: "generated_by" }],
    note: "Generated progress reports about the learner."
  },
  term_archives: {
    purgeWhen: subjectOf("created_by"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "End-of-term archive the teacher created."
  },
  teaching_resources: { purgeWhen: subjectOf("uploaded_by"), note: "Files the teacher uploaded." },
  teacher_lesson_kits: {
    purgeWhen: subjectOf("teacher_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Teacher-authored lesson kits."
  },
  teacher_review_lessons: {
    purgeWhen: subjectOf("teacher_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Teacher-authored review lessons."
  },
  teacher_class_collaborators: {
    purgeWhen: subjectOf("teacher_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    scrubActors: [{ idField: "invited_by" }],
    note: "Co-teacher grants."
  },
  prep_teams: {
    purgeWhen: subjectOf("created_by"),
    dropFromList: ["teacher_ids"],
    note: "Prep team the teacher created; membership array pruned otherwise."
  },
  prep_team_shares: {
    purgeWhen: subjectOf("created_by"),
    cascadeFrom: [{ table: "prep_teams", toField: "prep_team_id" }],
    note: "Resources shared into a prep team."
  },

  teacher_live_sessions: {
    purgeWhen: subjectOf("teacher_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Live classroom sessions the teacher ran."
  },
  teacher_live_prompts: {
    cascadeFrom: [{ table: "teacher_live_sessions", toField: "session_id" }],
    note: "Prompts posed during a live session."
  },
  teacher_live_responses: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "teacher_live_sessions", toField: "session_id" }],
    note: "The learner's live-session responses."
  },
  classroom_work_samples: {
    purgeWhen: subjectOf("student_id"),
    cascadeFrom: [{ table: "teacher_live_sessions", toField: "session_id" }],
    note: "Captured work samples — may contain a child's handwriting."
  },
  teacher_live_tool_states: {
    cascadeFrom: [{ table: "teacher_live_sessions", toField: "session_id" }],
    custom: "teacher-live-tool-states",
    note: "Live tool state embedding attendance and random-call rosters that name learners."
  },

  reward_point_ledger: {
    purgeWhen: subjectOf("student_id"),
    scrubActors: [{ idField: "awarded_by" }],
    note: "The learner's point ledger."
  },
  reward_redemptions: {
    purgeWhen: subjectOf("student_id"),
    scrubActors: [{ idField: "decided_by" }],
    note: "The learner's reward redemptions."
  },
  gamification_events: { purgeWhen: subjectOf("student_id"), note: "Gamification event stream." },
  practice_island_stars: { purgeWhen: subjectOf("student_id"), note: "Practice island star awards." },
  fishing_dex: { purgeWhen: subjectOf("student_id"), note: "Fishing game collection." },
  adventure_relics: { purgeWhen: subjectOf("student_id"), note: "Adventure island collection." },
  reward_campaigns: {
    purgeWhen: subjectOf("teacher_id"),
    cascadeFrom: [{ table: "teacher_classes", toField: "class_id" }],
    note: "Teacher-run reward campaigns."
  },

  forum_threads: { custom: "forum-threads", note: "Threads, nested replies, live pulses and me-too rosters authored by the user." },
  forum_reports: { purgeWhen: subjectOf("reporterId"), note: "Content reports the user filed." },
  forum_audit_events: { purgeWhen: subjectOf("actorId"), note: "Forum audit events attributed to the user." },
  forum_notifications: { purgeWhen: subjectOf("recipientId", "actorId"), note: "Forum notifications to or about the user." }
};

export type AccountDeletionSummary = {
  userId: string;
  removed: Record<string, number>;
  scrubbed: Record<string, number>;
  totalRemoved: number;
};

type Row = Record<string, unknown>;
type MutableDatabase = Record<string, unknown>;

const isRow = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);
const rowsOf = (database: MutableDatabase, table: string): Row[] | null => {
  const value = database[table];
  return Array.isArray(value) ? (value as Row[]) : null;
};

function matchesSubject(row: Row, fields: readonly string[], userId: string) {
  return fields.some((field) => row[field] === userId);
}

function bump(counter: Record<string, number>, table: string, amount: number) {
  if (amount <= 0) return;
  counter[table] = (counter[table] ?? 0) + amount;
}

/** Clears a departing user's identity from a row that belongs to somebody else. */
function scrubActorFields(row: Row, actors: readonly AccountDeletionActorField[], userId: string) {
  let changed = false;
  for (const actor of actors) {
    if (row[actor.idField] !== userId) continue;
    row[actor.idField] = null;
    for (const nameField of actor.nameFields ?? []) {
      if (nameField in row) row[nameField] = null;
    }
    changed = true;
  }
  return changed;
}

function dropFromListFields(row: Row, listFields: readonly string[], userId: string) {
  let changed = false;
  for (const field of listFields) {
    const list = row[field];
    if (!Array.isArray(list)) continue;
    const next = list.filter((entry) => entry !== userId);
    if (next.length !== list.length) {
      row[field] = next;
      changed = true;
    }
  }
  return changed;
}

function scrubForumAuthor(value: unknown, userId: string) {
  if (!isRow(value)) return false;
  if (value.id !== userId) return false;
  value.id = null;
  value.name = "";
  return true;
}

/** Threads authored by the user go; otherwise their replies, pulses and me-too votes go. */
function applyForumThreads(database: MutableDatabase, userId: string, summary: AccountDeletionSummary) {
  const threads = rowsOf(database, "forum_threads");
  if (!threads) return;

  const kept: Row[] = [];
  let removed = 0;
  let scrubbed = 0;

  for (const thread of threads) {
    const author = thread.author;
    if (isRow(author) && author.id === userId) {
      removed += 1;
      continue;
    }

    let touched = false;
    if (Array.isArray(thread.replies)) {
      const next = thread.replies.filter((reply) => !(isRow(reply) && isRow(reply.author) && reply.author.id === userId));
      if (next.length !== thread.replies.length) {
        thread.replies = next;
        touched = true;
      }
    }
    const live = thread.live;
    if (isRow(live) && Array.isArray(live.pulses)) {
      const next = live.pulses.filter((pulse) => !(isRow(pulse) && isRow(pulse.author) && pulse.author.id === userId));
      if (next.length !== live.pulses.length) {
        live.pulses = next;
        touched = true;
      }
    }
    if (Array.isArray(thread.meTooUserIds)) {
      const next = thread.meTooUserIds.filter((entry) => entry !== userId);
      if (next.length !== thread.meTooUserIds.length) {
        thread.meTooUserIds = next;
        thread.meTooCount = typeof thread.meTooCount === "number" ? Math.max(0, thread.meTooCount - 1) : thread.meTooCount;
        touched = true;
      }
    }
    const moderation = thread.moderation;
    if (isRow(moderation) && moderation.reviewedBy === userId) {
      moderation.reviewedBy = undefined;
      touched = true;
    }
    if (touched) scrubbed += 1;
    kept.push(thread);
  }

  database.forum_threads = kept;
  bump(summary.removed, "forum_threads", removed);
  bump(summary.scrubbed, "forum_threads", scrubbed);
  summary.totalRemoved += removed;
}

function applyNovaLensPolicy(database: MutableDatabase, userId: string, summary: AccountDeletionSummary) {
  const policy = database.nova_lens_policy;
  if (!isRow(policy)) return;
  if (scrubActorFields(policy, [{ idField: "updated_by" }], userId)) {
    bump(summary.scrubbed, "nova_lens_policy", 1);
  }
}

/** Live tool state names learners inside attendance and random-call sub-objects. */
function applyLiveToolStates(database: MutableDatabase, userId: string, summary: AccountDeletionSummary) {
  const states = rowsOf(database, "teacher_live_tool_states");
  if (!states) return;

  let scrubbed = 0;
  for (const state of states) {
    let touched = false;
    if (Array.isArray(state.attendance)) {
      const next = state.attendance.filter((entry) => !(isRow(entry) && entry.studentId === userId));
      if (next.length !== state.attendance.length) {
        state.attendance = next;
        touched = true;
      }
    }
    const randomCall = state.random_call;
    if (isRow(randomCall)) {
      if (randomCall.currentStudentId === userId) {
        randomCall.currentStudentId = null;
        randomCall.currentStudentName = null;
        touched = true;
      }
      if (Array.isArray(randomCall.selectedStudentIds)) {
        const next = randomCall.selectedStudentIds.filter((entry) => entry !== userId);
        if (next.length !== randomCall.selectedStudentIds.length) {
          randomCall.selectedStudentIds = next;
          touched = true;
        }
      }
    }
    if (touched) scrubbed += 1;
  }
  bump(summary.scrubbed, "teacher_live_tool_states", scrubbed);
}

/**
 * Removes every trace of `userId` from the application state, in place.
 *
 * Cascades are resolved to a fixed point so chains (class -> assignment ->
 * submission -> grading run) fully unwind regardless of plan ordering.
 */
export function deleteUserFromDatabase(database: MutableDatabase, userId: string): AccountDeletionSummary {
  const summary: AccountDeletionSummary = { userId, removed: {}, scrubbed: {}, totalRemoved: 0 };
  if (!userId) return summary;

  // Ids removed per table, consumed by cascade edges.
  const removedIds = new Map<string, Set<string>>();
  const idsFor = (table: string) => {
    let set = removedIds.get(table);
    if (!set) {
      set = new Set<string>();
      removedIds.set(table, set);
    }
    return set;
  };

  // Pass 1 — direct subject rows, plus non-removal edits.
  for (const [table, rule] of Object.entries(accountDeletionPlan)) {
    if (rule.content) continue;
    const rows = rowsOf(database, table);
    if (!rows) continue;

    if (rule.purgeWhen?.length) {
      const kept: Row[] = [];
      let removed = 0;
      for (const row of rows) {
        if (matchesSubject(row, rule.purgeWhen, userId)) {
          removed += 1;
          if (typeof row.id === "string") idsFor(table).add(row.id);
          continue;
        }
        kept.push(row);
      }
      if (removed) {
        database[table] = kept;
        bump(summary.removed, table, removed);
        summary.totalRemoved += removed;
      }
    }

    const survivors = rowsOf(database, table) ?? [];
    let scrubbed = 0;
    for (const row of survivors) {
      let touched = false;
      if (rule.dropFromList?.length) touched = dropFromListFields(row, rule.dropFromList, userId) || touched;
      if (rule.scrubActors?.length) touched = scrubActorFields(row, rule.scrubActors, userId) || touched;
      if (touched) scrubbed += 1;
    }
    bump(summary.scrubbed, table, scrubbed);
  }

  // Pass 2 — cascade to a fixed point.
  for (let guard = 0; guard < Object.keys(accountDeletionPlan).length + 1; guard += 1) {
    let progressed = false;

    for (const [table, rule] of Object.entries(accountDeletionPlan)) {
      if (!rule.cascadeFrom?.length) continue;
      const rows = rowsOf(database, table);
      if (!rows?.length) continue;

      const kept: Row[] = [];
      let removed = 0;
      for (const row of rows) {
        const orphaned = rule.cascadeFrom.some((edge) => {
          const parentIds = removedIds.get(edge.table);
          if (!parentIds?.size) return false;
          const key = row[edge.toField];
          return typeof key === "string" && parentIds.has(key);
        });
        if (orphaned) {
          removed += 1;
          if (typeof row.id === "string") idsFor(table).add(row.id);
          continue;
        }
        kept.push(row);
      }
      if (removed) {
        database[table] = kept;
        bump(summary.removed, table, removed);
        summary.totalRemoved += removed;
        progressed = true;
      }
    }

    if (!progressed) break;
  }

  // Pass 3 — nested/singleton shapes the table rules cannot express.
  applyForumThreads(database, userId, summary);
  applyNovaLensPolicy(database, userId, summary);
  applyLiveToolStates(database, userId, summary);

  return summary;
}

export type AccountDeletionBlocker = {
  code: "owns-active-classes";
  message: string;
  classIds: string[];
};

/**
 * Deleting a teacher would cascade through their classes and take other
 * children's enrollments, submissions and reports with it. Refuse while any
 * owned class still has enrollments or collaborators — those must be reassigned
 * or archived first. Students and parents are never blocked.
 */
export function assessAccountDeletion(database: MutableDatabase, userId: string, role: string): AccountDeletionBlocker[] {
  if (role !== "teacher" && role !== "admin") return [];

  const classes = rowsOf(database, "teacher_classes") ?? [];
  const ownedClassIds = classes
    .filter((row) => row.teacher_id === userId && typeof row.id === "string")
    .map((row) => row.id as string);
  if (!ownedClassIds.length) return [];

  const owned = new Set(ownedClassIds);
  const enrollments = rowsOf(database, "class_enrollments") ?? [];
  const collaborators = rowsOf(database, "teacher_class_collaborators") ?? [];
  const occupied = new Set<string>();

  for (const row of enrollments) {
    if (typeof row.class_id === "string" && owned.has(row.class_id)) occupied.add(row.class_id);
  }
  for (const row of collaborators) {
    if (typeof row.class_id === "string" && owned.has(row.class_id) && row.teacher_id !== userId) occupied.add(row.class_id);
  }

  if (!occupied.size) return [];
  return [
    {
      code: "owns-active-classes",
      message:
        "This teacher still owns classes with enrolled learners or co-teachers. Reassign or archive those classes before deleting the account, so other learners' records are not destroyed.",
      classIds: [...occupied].sort()
    }
  ];
}

export type AccountDataExport = {
  exportedAt: string;
  userId: string;
  tables: Record<string, unknown[]>;
  scope: {
    includedTables: string[];
    note: string;
  };
};

/**
 * Subject-access export: every row the user is the *subject* of, i.e. the same
 * rows `deleteUserFromDatabase` would remove via `purgeWhen`. Third-party rows
 * the user merely acted on are excluded — they are somebody else's data.
 */
export function buildAccountDataExport(
  database: MutableDatabase,
  userId: string,
  exportedAt: string
): AccountDataExport {
  const tables: Record<string, unknown[]> = {};

  for (const [table, rule] of Object.entries(accountDeletionPlan)) {
    if (rule.content || !rule.purgeWhen?.length) continue;
    const rows = rowsOf(database, table);
    if (!rows?.length) continue;
    const owned = rows.filter((row) => matchesSubject(row, rule.purgeWhen!, userId));
    if (owned.length) tables[table] = owned.map((row) => redactSecrets(table, row));
  }

  const threads = rowsOf(database, "forum_threads") ?? [];
  const authored = threads.filter((thread) => isRow(thread.author) && thread.author.id === userId);
  if (authored.length) tables.forum_threads = authored;

  return {
    exportedAt,
    userId,
    tables,
    scope: {
      includedTables: Object.keys(tables).sort(),
      note:
        "Contains records for which this account is the data subject. Credentials and reset-token hashes are omitted. Records belonging to other people that merely reference this account are excluded."
    }
  };
}

const secretFieldsByTable: Record<string, readonly string[]> = {
  users: ["password_hash", "password_salt"],
  password_reset_tokens: ["token_hash"]
};

function redactSecrets(table: string, row: Row): Row {
  const secrets = secretFieldsByTable[table];
  if (!secrets) return row;
  const copy: Row = { ...row };
  for (const field of secrets) delete copy[field];
  return copy;
}
