import type {
  ClassRosterProfile,
  GradeId,
  GuardianLinkStatus,
  TeacherClassCollaboratorRole
} from "@/types";

type TeacherOpsRosterProfileUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsRosterProfileUserRecord = {
  id: string;
  role: TeacherOpsRosterProfileUserRole;
  username?: string;
};

type TeacherOpsRosterProfileClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
};

type TeacherOpsRosterProfileEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsRosterProfileRecord = {
  enrollment_id: string;
  student_no?: string;
  seat_label?: string;
  seat_row?: number | null;
  seat_column?: number | null;
  display_order: number;
  updated_at: string;
};

type TeacherOpsRosterProfileStudentProfileRecord = {
  user_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsRosterProfileGuardianLinkRecord = {
  id?: string;
  parent_id: string;
  student_id: string;
  status: GuardianLinkStatus;
};

type TeacherOpsRosterProfileSchoolMembershipRecord = {
  user_id: string;
  class_id?: string;
  role: TeacherOpsRosterProfileUserRole;
};

type TeacherOpsRosterProfileCollaboratorRecord = {
  class_id: string;
  teacher_id: string;
  role: TeacherClassCollaboratorRole;
  status: "active" | "revoked";
};

export type TeacherOpsRosterProfilePersistenceDatabase = {
  class_enrollments: TeacherOpsRosterProfileEnrollmentRecord[];
  class_roster_profiles: TeacherOpsRosterProfileRecord[];
  guardian_links: TeacherOpsRosterProfileGuardianLinkRecord[];
  school_memberships: TeacherOpsRosterProfileSchoolMembershipRecord[];
  student_profiles: TeacherOpsRosterProfileStudentProfileRecord[];
  teacher_class_collaborators: TeacherOpsRosterProfileCollaboratorRecord[];
  teacher_classes: TeacherOpsRosterProfileClassRecord[];
  users: TeacherOpsRosterProfileUserRecord[];
};

export type TeacherOpsRosterProfilePersistenceStoreDependencies = {
  now?: () => Date;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsRosterProfilePersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
};

export type TeacherOpsRosterProfilePersistenceStore = ReturnType<typeof createTeacherOpsRosterProfilePersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsRosterProfileUserRecord | null): user is TeacherOpsRosterProfileUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherCanAccessClass(
  database: TeacherOpsRosterProfilePersistenceDatabase,
  user: TeacherOpsRosterProfileUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !database.school_memberships.some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function teacherCanMutateOperationsClass(
  database: TeacherOpsRosterProfilePersistenceDatabase,
  user: TeacherOpsRosterProfileUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (teacherCanAccessClass(database, user, classId)) return teacherClass;
  const collaborator = database.teacher_class_collaborators.find(
    (candidate) =>
      candidate.class_id === classId &&
      candidate.teacher_id === user.id &&
      candidate.status === "active" &&
      candidate.role === "co-teacher"
  );
  return collaborator ? teacherClass : null;
}

function studentProfileFor(database: TeacherOpsRosterProfilePersistenceDatabase, userId: string) {
  return database.student_profiles.find((profile) => profile.user_id === userId);
}

function rosterProfileForEnrollment(
  database: TeacherOpsRosterProfilePersistenceDatabase,
  enrollment: TeacherOpsRosterProfileEnrollmentRecord,
  index = 0
): ClassRosterProfile {
  const stored = database.class_roster_profiles.find((profile) => profile.enrollment_id === enrollment.id);
  const profile = studentProfileFor(database, enrollment.student_id);
  const student = database.users.find((candidate) => candidate.id === enrollment.student_id);
  const guardianCount = database.guardian_links.filter(
    (link) => link.student_id === enrollment.student_id && link.status === "active"
  ).length;

  return {
    enrollmentId: enrollment.id,
    classId: enrollment.class_id,
    studentId: enrollment.student_id,
    studentName: profile?.name ?? student?.username ?? "Unknown student",
    grade: profile?.grade ?? "S3",
    studentNo: stored?.student_no,
    seatLabel: stored?.seat_label,
    seatRow: stored?.seat_row ?? null,
    seatColumn: stored?.seat_column ?? null,
    displayOrder: stored?.display_order ?? index + 1,
    guardianCount,
    guardianStatus: guardianCount > 0 ? "linked" : "unlinked",
    updatedAt: stored?.updated_at ?? enrollment.joined_at
  };
}

export function teacherOpsRosterProfilesForClass(database: TeacherOpsRosterProfilePersistenceDatabase, classId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment, index) => rosterProfileForEnrollment(database, enrollment, index))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.studentName.localeCompare(b.studentName));
}

export function createTeacherOpsRosterProfilePersistenceStore({
  now = () => new Date(),
  mutateDatabase
}: TeacherOpsRosterProfilePersistenceStoreDependencies) {
  return {
    async updateClassRosterProfile({
      teacherId,
      classId,
      enrollmentId,
      studentNo,
      seatLabel,
      seatRow,
      seatColumn,
      displayOrder
    }: {
      teacherId: string;
      classId: string;
      enrollmentId: string;
      studentNo?: string;
      seatLabel?: string;
      seatRow?: number | null;
      seatColumn?: number | null;
      displayOrder?: number;
    }) {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const teacherClass = teacherCanMutateOperationsClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };
        const enrollment = database.class_enrollments.find((candidate) => candidate.id === enrollmentId && candidate.class_id === classId);
        if (!enrollment) return { status: "not-found" as const };

        const updatedAt = now().toISOString();
        let profile = database.class_roster_profiles.find((candidate) => candidate.enrollment_id === enrollmentId);
        if (!profile) {
          profile = {
            enrollment_id: enrollmentId,
            display_order: displayOrder ?? teacherOpsRosterProfilesForClass(database, classId).length + 1,
            updated_at: updatedAt
          };
          database.class_roster_profiles.push(profile);
        }
        if (studentNo !== undefined) profile.student_no = studentNo.trim() || undefined;
        if (seatLabel !== undefined) profile.seat_label = seatLabel.trim() || undefined;
        if (seatRow !== undefined) profile.seat_row = seatRow;
        if (seatColumn !== undefined) profile.seat_column = seatColumn;
        if (displayOrder !== undefined) profile.display_order = Math.max(1, Math.round(displayOrder));
        profile.updated_at = updatedAt;

        return { status: "updated" as const, roster: rosterProfileForEnrollment(database, enrollment) };
      });
    }
  };
}
