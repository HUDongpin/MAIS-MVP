import { curriculumTrackForProfile } from "@/lib/curriculumProfile";
import type {
  Assessment,
  Assignment,
  GradeId,
  StudentSession,
  TeacherClass,
  TeacherFoundationData,
  TeacherMessage,
  TeachingResource
} from "@/types";

type TeacherOpsFoundationUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsFoundationUserRecord = {
  id: string;
  role: TeacherOpsFoundationUserRole;
  username?: string;
};

type TeacherOpsFoundationClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year?: string;
  description_en?: string;
  description_zh?: string;
  invite_code?: string;
  created_at?: string;
  updated_at?: string;
};

type TeacherOpsFoundationProjectedClassRecord = TeacherOpsFoundationClassRecord & {
  academic_year: string;
  description_en: string;
  description_zh: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsFoundationSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsFoundationUserRole;
  class_id?: string;
};

type TeacherOpsFoundationClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsFoundationAssignmentRecord = {
  id: string;
  class_id: string;
  status: "draft" | "scheduled" | "active" | "closed";
  updated_at: string;
};

type TeacherOpsFoundationMessageRecord = {
  id: string;
  teacher_id: string;
  class_id?: string;
  status: "unread" | "open" | "resolved";
  last_message_at: string;
};

type TeacherOpsFoundationResourceRecord = {
  id: string;
  uploaded_by: string;
  created_at: string;
};

type TeacherOpsFoundationAssessmentRecord = {
  id: string;
  class_id: string;
  created_at: string;
};

type TeacherOpsFoundationStudentProfileRecord = {
  user_id: string;
  name?: string;
};

export type TeacherOpsFoundationShellData = Pick<TeacherFoundationData, "teacher" | "classes">;

export type TeacherOpsFoundationPersistenceDatabase = {
  assignments: TeacherOpsFoundationAssignmentRecord[];
  assessments: TeacherOpsFoundationAssessmentRecord[];
  class_enrollments?: TeacherOpsFoundationClassEnrollmentRecord[];
  school_memberships?: TeacherOpsFoundationSchoolMembershipRecord[];
  teacher_classes: TeacherOpsFoundationClassRecord[];
  teacher_messages: TeacherOpsFoundationMessageRecord[];
  teaching_resources: TeacherOpsFoundationResourceRecord[];
  student_profiles?: TeacherOpsFoundationStudentProfileRecord[];
  users: TeacherOpsFoundationUserRecord[];
};

export type TeacherOpsFoundationPersistenceStoreDependencies = {
  readDatabase: () => Promise<TeacherOpsFoundationPersistenceDatabase>;
  getStorageFreeTeacherShellData: (userId: string) => TeacherOpsFoundationShellData | null;
  getTeacherShellDataFromPostgresProjection: (userId: string) => Promise<TeacherOpsFoundationShellData | null | undefined>;
  teacherSessionProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    user: TeacherOpsFoundationUserRecord
  ) => StudentSession | null;
  classProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    teacherClass: TeacherOpsFoundationClassRecord
  ) => TeacherClass;
  assignmentProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    assignment: TeacherOpsFoundationAssignmentRecord
  ) => Assignment;
  messageProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    message: TeacherOpsFoundationMessageRecord
  ) => TeacherMessage;
  resourceProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    resource: TeacherOpsFoundationResourceRecord
  ) => TeachingResource;
  assessmentProjection: (
    database: TeacherOpsFoundationPersistenceDatabase,
    assessment: TeacherOpsFoundationAssessmentRecord
  ) => Assessment;
};

export type TeacherOpsFoundationPersistenceStore = ReturnType<typeof createTeacherOpsFoundationPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsFoundationUserRecord | null): user is TeacherOpsFoundationUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

export const teacherOpsCanUseTeacherArea = canUseTeacherArea;

export function teacherOpsProjectionArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function teacherOpsProjectedClassesFromRecords<ClassRecord extends TeacherOpsFoundationProjectedClassRecord>({
  classRecords,
  enrollmentRecords,
  teacher
}: {
  classRecords: ClassRecord[];
  enrollmentRecords: TeacherOpsFoundationClassEnrollmentRecord[];
  teacher: StudentSession;
}): TeacherClass[] {
  const enrollmentCountByClassId = new Map<string, number>();
  enrollmentRecords.forEach((enrollment) => {
    enrollmentCountByClassId.set(enrollment.class_id, (enrollmentCountByClassId.get(enrollment.class_id) ?? 0) + 1);
  });

  return [...classRecords]
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name))
    .map((record) => {
      const curriculumProfile = teacher.curriculumProfile;
      return {
        id: record.id,
        teacherId: record.teacher_id,
        schoolId: record.school_id,
        classCode: record.class_code,
        name: record.name,
        grade: record.grade,
        curriculumTrack: curriculumTrackForProfile(curriculumProfile),
        curriculumProfile,
        academicYear: record.academic_year,
        description: {
          en: record.description_en,
          zh: record.description_zh
        },
        studentCount: enrollmentCountByClassId.get(record.id) ?? 0,
        inviteCode: record.invite_code,
        createdAt: record.created_at,
        updatedAt: record.updated_at
      };
    });
}

export function teacherClassRecordsFor<ClassRecord extends TeacherOpsFoundationClassRecord>(
  database: {
    school_memberships?: TeacherOpsFoundationSchoolMembershipRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsFoundationUserRecord
) {
  const membershipClassIds = new Set(
    (database.school_memberships ?? [])
      .filter((membership) => (
        membership.user_id === user.id &&
        membership.class_id &&
        (membership.role === "teacher" || membership.role === "admin")
      ))
      .map((membership) => membership.class_id as string)
  );

  return database.teacher_classes
    .filter((teacherClass) => user.role === "admin" || teacherClass.teacher_id === user.id || membershipClassIds.has(teacherClass.id))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name));
}

export function teacherCanAccessClass<ClassRecord extends TeacherOpsFoundationClassRecord>(
  database: {
    school_memberships?: TeacherOpsFoundationSchoolMembershipRecord[];
    teacher_classes: ClassRecord[];
  },
  user: TeacherOpsFoundationUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  return teacherClassRecordsFor(database, user).some((candidate) => candidate.id === classId) ? teacherClass : null;
}

export function teacherOpsTeacherDisplayName(
  database: {
    student_profiles?: TeacherOpsFoundationStudentProfileRecord[];
    users: Array<{ id: string; username?: string }>;
  },
  userId: string
) {
  const user = database.users.find((candidate) => candidate.id === userId);
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === userId);
  return profile?.name ?? user?.username ?? "Teacher";
}

export function createTeacherOpsFoundationPersistenceStore({
  readDatabase,
  getStorageFreeTeacherShellData,
  getTeacherShellDataFromPostgresProjection,
  teacherSessionProjection,
  classProjection,
  assignmentProjection,
  messageProjection,
  resourceProjection,
  assessmentProjection
}: TeacherOpsFoundationPersistenceStoreDependencies) {
  async function getTeacherFoundationData(userId: string): Promise<TeacherFoundationData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const teacher = teacherSessionProjection(database, user);
    if (!teacher) return null;

    const classRecords = teacherClassRecordsFor(database, user);
    const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
    const classes = classRecords.map((teacherClass) => classProjection(database, teacherClass));
    const assignments = database.assignments
      .filter((assignment) => classIds.has(assignment.class_id))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    const messages = database.teacher_messages
      .filter((message) => user.role === "admin" || message.teacher_id === user.id || (message.class_id && classIds.has(message.class_id)))
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    const resources = database.teaching_resources
      .filter((resource) => user.role === "admin" || resource.uploaded_by === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((resource) => resourceProjection(database, resource));
    const assessments = database.assessments
      .filter((assessment) => classIds.has(assessment.class_id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((assessment) => assessmentProjection(database, assessment));
    const studentIds = new Set(
      (database.class_enrollments ?? [])
        .filter((enrollment) => classIds.has(enrollment.class_id))
        .map((enrollment) => enrollment.student_id)
    );

    return {
      teacher,
      classes,
      totals: {
        classes: classes.length,
        students: studentIds.size,
        activeAssignments: assignments.filter((assignment) => assignment.status === "active").length,
        unreadMessages: messages.filter((message) => message.status === "unread").length,
        resources: resources.length,
        assessments: assessments.length
      },
      recentAssignments: assignments.slice(0, 5).map((assignment) => assignmentProjection(database, assignment)),
      inboxPreview: messages.slice(0, 5).map((message) => messageProjection(database, message)),
      resources: resources.slice(0, 5),
      assessments: assessments.slice(0, 5)
    };
  }

  async function getTeacherShellData(userId: string): Promise<TeacherOpsFoundationShellData | null> {
    // Live data must win: serving the storage-free demo shell unconditionally hid
    // classes that example teachers created (they exist in the mutable database but
    // never in the static demo dataset). The storage-free shell is only a fallback
    // for sessions whose rows are genuinely absent from storage.
    const projected = await getTeacherShellDataFromPostgresProjection(userId);
    if (projected !== undefined) return projected ?? getStorageFreeTeacherShellData(userId);

    const foundation = await getTeacherFoundationData(userId);
    return foundation ? { teacher: foundation.teacher, classes: foundation.classes } : getStorageFreeTeacherShellData(userId);
  }

  return {
    getTeacherFoundationData,
    getTeacherShellData
  };
}
