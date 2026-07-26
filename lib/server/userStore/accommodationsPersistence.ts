import {
  accommodationsAreDefault,
  defaultStudentAccommodations,
  hasAccommodationsPlan,
  normalizeStudentAccommodations
} from "@/lib/accommodations";
import type {
  StudentAccommodations,
  StudentAccommodationsProfile,
  StudentAccommodationsProfileResult
} from "@/types";

// Persistence for per-student accommodations (IEP / Section 504).
//
// Unlike per-teacher records (e.g. mastery targets), an accommodations profile
// attaches to the *student* and is shared across every teacher who serves them —
// mirroring how a real IEP/504 plan works. There is exactly one record per
// student (keyed by student_id); the last educator to save is recorded for
// attribution. Teacher visibility follows the shared rule used elsewhere in the
// store: a teacher may view/update a student's profile when that student is
// enrolled in a class they own or co-teach; admins may see and edit all.

type UserRole = "student" | "teacher" | "parent" | "admin";

type AccommodationsUserRecord = {
  id: string;
  // The users table keys the display handle as `username`; some seeded/session
  // records also carry `name`. Prefer `name`, fall back to `username`.
  name?: string;
  username?: string;
  role: UserRole;
};

type AccommodationsTeacherClassRecord = {
  id: string;
  teacher_id: string;
};

type AccommodationsClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type AccommodationsSchoolMembershipRecord = {
  user_id: string;
  role: string;
  class_id?: string;
};

export type StudentAccommodationsRecord = {
  student_id: string;
  extended_time: StudentAccommodations["extendedTime"];
  read_aloud: boolean;
  max_answer_choices: number;
  calculator_policy: StudentAccommodations["calculatorPolicy"];
  notes: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_name: string | null;
};

export type AccommodationsPersistenceDatabase = {
  student_accommodations: StudentAccommodationsRecord[];
  class_enrollments?: AccommodationsClassEnrollmentRecord[];
  teacher_classes?: AccommodationsTeacherClassRecord[];
  school_memberships?: AccommodationsSchoolMembershipRecord[];
  users: AccommodationsUserRecord[];
};

export type AccommodationsPersistenceStoreDependencies = {
  now?: () => Date;
  readDatabase: () => Promise<AccommodationsPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: AccommodationsPersistenceDatabase) => T | Promise<T>) => Promise<T>;
};

export type AccommodationsPersistenceStore = ReturnType<typeof createAccommodationsPersistenceStore>;

function displayNameForUser(user: AccommodationsUserRecord | undefined, fallback: string) {
  return user?.name || user?.username || fallback;
}

// Turn a persisted record's fields into the shared client-facing accommodations,
// running everything through the same normalizer used at write time so a stored
// value can never widen past the allowed set.
function accommodationsFromRecord(record: StudentAccommodationsRecord): StudentAccommodations {
  return normalizeStudentAccommodations({
    extendedTime: record.extended_time,
    readAloud: record.read_aloud,
    maxAnswerChoices: record.max_answer_choices,
    calculatorPolicy: record.calculator_policy,
    notes: record.notes
  });
}

export function normalizeStudentAccommodationsRecord(
  value: unknown,
  now = new Date().toISOString()
): StudentAccommodationsRecord | null {
  const record = typeof value === "object" && value !== null
    ? value as Partial<StudentAccommodationsRecord>
    : null;
  if (!record) return null;

  const studentId = typeof record.student_id === "string" ? record.student_id.trim() : "";
  if (!studentId) return null;

  const accommodations = accommodationsFromRecord(record as StudentAccommodationsRecord);
  return {
    student_id: studentId,
    extended_time: accommodations.extendedTime,
    read_aloud: accommodations.readAloud,
    max_answer_choices: accommodations.maxAnswerChoices,
    calculator_policy: accommodations.calculatorPolicy,
    notes: accommodations.notes,
    updated_at: typeof record.updated_at === "string" && record.updated_at ? record.updated_at : now,
    updated_by: typeof record.updated_by === "string" && record.updated_by ? record.updated_by : null,
    updated_by_name: typeof record.updated_by_name === "string" && record.updated_by_name ? record.updated_by_name : null
  };
}

// Collapse to at most one record per student (last write wins), dropping any
// malformed rows. Used on the DB load path.
export function normalizeStudentAccommodationsRecords(
  records: unknown[] | undefined,
  now = new Date().toISOString()
): StudentAccommodationsRecord[] {
  const byStudent = new Map<string, StudentAccommodationsRecord>();
  for (const value of records ?? []) {
    const record = normalizeStudentAccommodationsRecord(value, now);
    if (record) byStudent.set(record.student_id, record);
  }
  return Array.from(byStudent.values());
}

function recordToProfile(
  record: StudentAccommodationsRecord | undefined,
  studentId: string,
  studentName: string
): StudentAccommodationsProfile {
  const accommodations = record ? accommodationsFromRecord(record) : { ...defaultStudentAccommodations };
  return {
    ...accommodations,
    studentId,
    studentName,
    hasPlan: hasAccommodationsPlan(accommodations),
    updatedAt: record?.updated_at ?? null,
    updatedBy: record?.updated_by ?? null,
    updatedByName: record?.updated_by_name ?? null
  };
}

// A teacher sees a student's profile when the student is enrolled in a class the
// teacher owns or co-teaches (via a school membership). Admins see everything.
function studentIdsVisibleToViewer(
  database: AccommodationsPersistenceDatabase,
  viewer: AccommodationsUserRecord
): "all" | Set<string> {
  if (viewer.role === "admin") return "all";
  if (viewer.role !== "teacher") return new Set<string>();

  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === viewer.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );
  const visibleClassIds = new Set(
    (database.teacher_classes ?? [])
      .filter((teacherClass) => teacherClass.teacher_id === viewer.id || membershipClassIds.has(teacherClass.id))
      .map((teacherClass) => teacherClass.id)
  );
  return new Set(
    (database.class_enrollments ?? [])
      .filter((enrollment) => visibleClassIds.has(enrollment.class_id))
      .map((enrollment) => enrollment.student_id)
  );
}

function canViewerSeeStudent(visibleStudentIds: "all" | Set<string>, studentId: string) {
  return visibleStudentIds === "all" || visibleStudentIds.has(studentId);
}

export function createAccommodationsPersistenceStore({
  now: currentTime = () => new Date(),
  readDatabase,
  mutateDatabase
}: AccommodationsPersistenceStoreDependencies) {
  return {
    // Resolve the effective accommodations for a single student. This is the
    // read the student's own learning experience uses, so it takes no viewer —
    // callers pass the authenticated student's own id. Returns the standard
    // (no-op) defaults when the student has no plan on record.
    async getStudentAccommodations(studentId: string): Promise<StudentAccommodations> {
      const database = await readDatabase();
      const record = (database.student_accommodations ?? []).find((candidate) => candidate.student_id === studentId);
      return record ? accommodationsFromRecord(record) : { ...defaultStudentAccommodations };
    },

    async getStudentAccommodationsProfileForTeacher(
      viewerId: string,
      studentId: string
    ): Promise<StudentAccommodationsProfileResult> {
      const database = await readDatabase();
      const viewer = database.users.find((user) => user.id === viewerId);
      if (!viewer || (viewer.role !== "teacher" && viewer.role !== "admin")) return { status: "forbidden" };

      const student = database.users.find((user) => user.id === studentId && user.role === "student");
      if (!student) return { status: "student-not-found" };

      const visibleStudentIds = studentIdsVisibleToViewer(database, viewer);
      if (!canViewerSeeStudent(visibleStudentIds, studentId)) return { status: "forbidden" };

      const record = (database.student_accommodations ?? []).find((candidate) => candidate.student_id === studentId);
      return {
        status: "ok",
        profile: recordToProfile(record, studentId, displayNameForUser(student, "Student"))
      };
    },

    async setStudentAccommodationsForTeacher(input: {
      teacherId: string;
      studentId: string;
      accommodations: StudentAccommodations;
    }): Promise<StudentAccommodationsProfileResult> {
      const nowIso = currentTime().toISOString();
      const nextAccommodations = normalizeStudentAccommodations(input.accommodations);

      return mutateDatabase((database) => {
        if (!Array.isArray(database.student_accommodations)) database.student_accommodations = [];
        const actor = database.users.find((user) => user.id === input.teacherId);
        if (!actor || (actor.role !== "teacher" && actor.role !== "admin")) return { status: "forbidden" };

        const student = database.users.find((user) => user.id === input.studentId && user.role === "student");
        if (!student) return { status: "student-not-found" };

        const visibleStudentIds = studentIdsVisibleToViewer(database, actor);
        if (!canViewerSeeStudent(visibleStudentIds, input.studentId)) return { status: "forbidden" };

        const actorName = displayNameForUser(actor, "Educator");
        const record: StudentAccommodationsRecord = {
          student_id: input.studentId,
          extended_time: nextAccommodations.extendedTime,
          read_aloud: nextAccommodations.readAloud,
          max_answer_choices: nextAccommodations.maxAnswerChoices,
          calculator_policy: nextAccommodations.calculatorPolicy,
          notes: nextAccommodations.notes,
          updated_at: nowIso,
          updated_by: actor.id,
          updated_by_name: actorName
        };

        // When a teacher clears every accommodation back to the defaults, drop the
        // record entirely so "no plan on record" stays truthful.
        database.student_accommodations = database.student_accommodations.filter(
          (candidate) => candidate.student_id !== input.studentId
        );
        if (!accommodationsAreDefault(nextAccommodations)) {
          database.student_accommodations.push(record);
        }

        return {
          status: "ok",
          profile: recordToProfile(
            accommodationsAreDefault(nextAccommodations) ? undefined : record,
            input.studentId,
            displayNameForUser(student, "Student")
          )
        };
      });
    }
  };
}
