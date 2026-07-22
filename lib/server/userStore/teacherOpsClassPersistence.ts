import { randomUUID } from "crypto";
import {
  curriculumProfilesEqual,
  curriculumTrackForProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import type {
  Assignment,
  ClassEnrollment,
  CurriculumProfile,
  CurriculumRegion,
  CurriculumTrack,
  GradeId,
  TeacherClass,
  TeacherClassDetailData,
  TeacherClassStudentSummary,
  TeacherClassTopicOption,
  TeacherLearningPath,
  TeacherStudentGroup,
  TeacherStudentRiskTag,
  TextbookPublisher
} from "@/types";

type TeacherOpsClassUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsClassUserRecord = {
  id: string;
  role: TeacherOpsClassUserRole;
  normalized_email?: string;
  normalized_username?: string;
  school_id?: string;
  username?: string;
};

type TeacherOpsClassRecord = {
  id: string;
  teacher_id: string;
  school_id?: string;
  class_code?: string;
  name: string;
  grade: GradeId;
  academic_year: string;
  description_en: string;
  description_zh: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsClassSchoolMembershipRecord = {
  user_id: string;
  role: "student" | "teacher" | "parent" | "admin";
  class_id?: string;
};

type TeacherOpsClassEnrollmentRecord = {
  id: string;
  class_id: string;
  student_id: string;
  joined_at: string;
};

type TeacherOpsClassStudentProfileRecord = {
  user_id: string;
  curriculum_region?: CurriculumRegion | null;
  curriculum_track?: CurriculumTrack | null;
  grade?: GradeId;
  name?: string;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsClassAssignmentRecord = {
  id: string;
  class_id: string;
  title_en?: string;
  title_zh?: string;
  description_en?: string;
  description_zh?: string;
  content_type?: string;
  target_id?: string;
  status?: string;
  due_at?: string | null;
  allow_retake?: boolean;
  show_answers?: boolean;
  count_towards_grade?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at: string;
};

type TeacherOpsClassSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  score?: number | null;
  submitted_at?: string | null;
  graded_at?: string | null;
  feedback_en?: string;
  feedback_zh?: string;
  updated_at: string;
};

type TeacherOpsClassAssessmentRecord = {
  id: string;
  class_id: string;
};

type TeacherOpsClassAssessmentSubmissionRecord = {
  id: string;
  assessment_id: string;
  student_id: string;
  status: string;
  attempt_number: number;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  answers: unknown[];
  updated_at: string;
};

type TeacherOpsClassActivityRecord = {
  user_id: string;
  created_at?: string;
  updated_at?: string;
};

type TeacherOpsClassLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  mastery: number;
};

type TeacherOpsClassMistakeRecord = {
  user_id: string;
  mastered: boolean;
  wrong_attempts: number;
};

type TeacherOpsClassTopicRecord = {
  id: string;
  curriculum_region?: CurriculumRegion | null;
  curriculum_track?: CurriculumTrack | null;
  grade: GradeId;
  textbook_publisher?: TextbookPublisher | null;
};

export type TeacherOpsClassPersistenceDatabase = {
  ai_tutor_messages: TeacherOpsClassActivityRecord[];
  assessment_submissions: TeacherOpsClassAssessmentSubmissionRecord[];
  assessments: TeacherOpsClassAssessmentRecord[];
  assignments: TeacherOpsClassAssignmentRecord[];
  attempts: TeacherOpsClassActivityRecord[];
  class_enrollments: TeacherOpsClassEnrollmentRecord[];
  learning_events: TeacherOpsClassActivityRecord[];
  lesson_progress: TeacherOpsClassLessonProgressRecord[];
  mistakes: TeacherOpsClassMistakeRecord[];
  school_memberships?: TeacherOpsClassSchoolMembershipRecord[];
  student_profiles?: TeacherOpsClassStudentProfileRecord[];
  submissions: TeacherOpsClassSubmissionRecord[];
  teacher_classes: TeacherOpsClassRecord[];
  users: TeacherOpsClassUserRecord[];
  visualization_sessions: TeacherOpsClassActivityRecord[];
};

export type TeacherOpsClassPersistenceStoreDependencies = {
  createId?: (kind?: "assessmentSubmission" | "class" | "enrollment" | "invite" | "submission") => string;
  gradeIsValid: (grade: GradeId) => boolean;
  mutateDatabase: <T>(
    mutator: (database: TeacherOpsClassPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  normalizeUsername: (username: string) => string;
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsClassPersistenceDatabase>;
  studentProfileFor?: (
    database: TeacherOpsClassPersistenceDatabase,
    studentId: string
  ) => { grade?: GradeId; name?: string } | null;
  topicIdsForClass: (
    database: TeacherOpsClassPersistenceDatabase,
    teacherClass: TeacherOpsClassRecord
  ) => string[];
  isSubmissionComplete?: (submission: TeacherOpsClassSubmissionRecord) => boolean;
  groupsForClass?: (
    database: TeacherOpsClassPersistenceDatabase,
    classId: string
  ) => TeacherStudentGroup[];
  topicOptionsForClass?: (
    database: TeacherOpsClassPersistenceDatabase,
    teacherClass: TeacherOpsClassRecord
  ) => TeacherClassTopicOption[];
  learningPathsForClass?: (
    database: TeacherOpsClassPersistenceDatabase,
    classId: string
  ) => TeacherLearningPath[];
  toAssignment: (
    database: TeacherOpsClassPersistenceDatabase,
    assignment: TeacherOpsClassAssignmentRecord
  ) => Assignment;
  toClassEnrollment: (
    database: TeacherOpsClassPersistenceDatabase,
    enrollment: TeacherOpsClassEnrollmentRecord
  ) => ClassEnrollment;
  toTeacherClass: (
    database: TeacherOpsClassPersistenceDatabase,
    teacherClass: TeacherOpsClassRecord
  ) => TeacherClass;
};

export type TeacherOpsClassPersistenceStore = ReturnType<typeof createTeacherOpsClassPersistenceStore>;

const dayMs = 24 * 60 * 60 * 1000;

export function teacherOpsUsGradeLabel(grade: GradeId) {
  if (grade === "K") return "Kindergarten";
  if (grade.startsWith("P")) return `Grade ${grade.slice(1)}`;
  return `Grade ${Number(grade.slice(1)) + 6}`;
}

export type TeacherOpsClassRecordNormalizationInput = {
  id: string;
  grade: GradeId;
  school_id?: unknown;
  class_code?: string | null;
  invite_code?: string | null;
};

export type TeacherOpsClassCollectionRecord = Omit<
  TeacherOpsClassRecord,
  "school_id" | "class_code" | "invite_code"
> & TeacherOpsClassRecordNormalizationInput;

export type TeacherOpsClassCollectionRecords = {
  teacher_classes?: TeacherOpsClassCollectionRecord[];
  class_enrollments?: TeacherOpsClassEnrollmentRecord[];
};

export type TeacherOpsClassCollectionNormalizationOptions = {
  demoTeacherId: string;
  demoUserId: string;
  gradeIds: readonly GradeId[];
  internalCaliforniaSuperTeacherId: string;
  mainlandDemoTeacherId: string;
  mainlandDemoUserId: string;
  normalizeClassCode: (classCode: string) => string;
  shouldSeedDemoUser: () => boolean;
  unitedStatesDemoTeacherId: string;
  unitedStatesDemoUserId: string;
};

function mergeTeacherOpsClassSeedRecordsPreservingExisting<T>(
  existingRecords: T[] | undefined,
  seedRecords: T[],
  keyFor: (record: T) => string
) {
  const existingByKey = new Map((existingRecords ?? []).map((record) => [keyFor(record), record]));
  const seedKeys = new Set(seedRecords.map(keyFor));
  const seedOrExistingRecords = seedRecords.map((record) => existingByKey.get(keyFor(record)) ?? record);
  const extraRecords = (existingRecords ?? []).filter((record) => !seedKeys.has(keyFor(record)));
  return [...seedOrExistingRecords, ...extraRecords];
}

export function normalizeTeacherOpsClassRecord<Record extends TeacherOpsClassRecordNormalizationInput>(
  teacherClass: Record,
  normalizeClassCode: (classCode: string) => string
): Record & {
  school_id?: string;
  class_code?: string;
  invite_code: string;
} {
  return {
    ...teacherClass,
    school_id: typeof teacherClass.school_id === "string" && teacherClass.school_id.trim() ? teacherClass.school_id : undefined,
    class_code: teacherClass.class_code ? normalizeClassCode(teacherClass.class_code) : undefined,
    invite_code: teacherClass.invite_code ?? `${teacherClass.grade}-${teacherClass.id.slice(-4).toUpperCase()}`
  };
}

export function teacherOpsSeedTeacherClassRecords(
  now: string,
  {
    demoTeacherId,
    gradeIds,
    internalCaliforniaSuperTeacherId,
    mainlandDemoTeacherId,
    unitedStatesDemoTeacherId
  }: {
    demoTeacherId: string;
    gradeIds: readonly GradeId[];
    internalCaliforniaSuperTeacherId: string;
    mainlandDemoTeacherId: string;
    unitedStatesDemoTeacherId: string;
  }
): TeacherOpsClassRecord[] {
  return [
    {
      id: "class-s3a-2026",
      teacher_id: demoTeacherId,
      name: "S3A Mathematics",
      grade: "S3",
      academic_year: "2025-2026",
      description_en: "Core S3 class for algebra, geometry, and data handling follow-up.",
      description_zh: "中三核心班，跟進代數、幾何及數據處理。",
      invite_code: "S3A-MAIS",
      created_at: now,
      updated_at: now
    },
    {
      id: "class-s1-foundation-2026",
      teacher_id: demoTeacherId,
      name: "S1 Foundation Group",
      grade: "S1",
      academic_year: "2025-2026",
      description_en: "Small-group support for number sense and early algebra routines.",
      description_zh: "小組支援數感及初階代數基礎。",
      invite_code: "S1-FOUND",
      created_at: now,
      updated_at: now
    },
    {
      id: "class-mainland-s4-2026",
      teacher_id: mainlandDemoTeacherId,
      name: "Mainland S4 Mathematics",
      grade: "S4",
      academic_year: "2025-2026",
      description_en: "Demo class for Mainland senior high mathematics content.",
      description_zh: "內地高中數學內容示範班。",
      invite_code: "ML-S4-MAIS",
      created_at: now,
      updated_at: now
    },
    {
      id: "class-us-ca-p1-2026",
      teacher_id: unitedStatesDemoTeacherId,
      name: "California Grade 1 Mathematics",
      grade: "P1",
      academic_year: "2025-2026",
      description_en: "Demo class for California Grade 1 mathematics support.",
      description_zh: "Demo class for California Grade 1 mathematics support.",
      invite_code: "CA-P1-SCOTT",
      created_at: now,
      updated_at: now
    },
    ...gradeIds.map((grade): TeacherOpsClassRecord => ({
      id: `class-us-ca-super-${grade.toLowerCase()}-2026`,
      teacher_id: internalCaliforniaSuperTeacherId,
      name: `California ${teacherOpsUsGradeLabel(grade)} Mathematics`,
      grade,
      academic_year: "2025-2026",
      description_en: `Internal California ${teacherOpsUsGradeLabel(grade)} mathematics access class.`,
      description_zh: `Internal California ${teacherOpsUsGradeLabel(grade)} mathematics access class.`,
      invite_code: `CA-${grade}-RHI`,
      created_at: now,
      updated_at: now
    }))
  ];
}

export function teacherOpsSeedClassEnrollmentRecords(
  now: string,
  {
    demoUserId,
    mainlandDemoUserId,
    shouldSeedDemoUser,
    unitedStatesDemoUserId
  }: {
    demoUserId: string;
    mainlandDemoUserId: string;
    shouldSeedDemoUser: () => boolean;
    unitedStatesDemoUserId: string;
  }
): TeacherOpsClassEnrollmentRecord[] {
  const publicExampleEnrollments: TeacherOpsClassEnrollmentRecord[] = [
    {
      id: "enrollment-us-ca-p1-student-shirleen",
      class_id: "class-us-ca-p1-2026",
      student_id: unitedStatesDemoUserId,
      joined_at: now
    }
  ];

  return shouldSeedDemoUser()
    ? [
        {
          id: "enrollment-s3a-student-peter",
          class_id: "class-s3a-2026",
          student_id: demoUserId,
          joined_at: now
        },
        {
          id: "enrollment-mainland-s4-student-ludwig",
          class_id: "class-mainland-s4-2026",
          student_id: mainlandDemoUserId,
          joined_at: now
        },
        ...publicExampleEnrollments
      ]
    : publicExampleEnrollments;
}

export function normalizeTeacherOpsClassCollections(
  collections: TeacherOpsClassCollectionRecords,
  now: string,
  options: TeacherOpsClassCollectionNormalizationOptions
): {
  teacher_classes: TeacherOpsClassRecord[];
  class_enrollments: TeacherOpsClassEnrollmentRecord[];
} {
  return {
    teacher_classes: mergeTeacherOpsClassSeedRecordsPreservingExisting<
      TeacherOpsClassCollectionRecord | TeacherOpsClassRecord
    >(
      collections.teacher_classes,
      teacherOpsSeedTeacherClassRecords(now, options),
      (teacherClass) => teacherClass.id
    ).map((teacherClass) => normalizeTeacherOpsClassRecord(teacherClass, options.normalizeClassCode)),
    class_enrollments: mergeTeacherOpsClassSeedRecordsPreservingExisting(
      collections.class_enrollments,
      teacherOpsSeedClassEnrollmentRecords(now, options),
      (enrollment) => enrollment.id
    )
  };
}

function canUseTeacherArea(user?: TeacherOpsClassUserRecord | null): user is TeacherOpsClassUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(database: TeacherOpsClassPersistenceDatabase, user: TeacherOpsClassUserRecord) {
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

function teacherCanAccessClass(database: TeacherOpsClassPersistenceDatabase, user: TeacherOpsClassUserRecord, classId: string) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !(database.school_memberships ?? []).some(
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

export function toTeacherOpsClassEnrollment(
  database: {
    student_profiles?: TeacherOpsClassStudentProfileRecord[];
    users: Array<{ id: string; username?: string }>;
  },
  record: TeacherOpsClassEnrollmentRecord
): ClassEnrollment {
  const profile = (database.student_profiles ?? []).find((candidate) => candidate.user_id === record.student_id);
  const user = database.users.find((candidate) => candidate.id === record.student_id);

  return {
    id: record.id,
    classId: record.class_id,
    studentId: record.student_id,
    studentName: profile?.name ?? user?.username ?? "Unknown student",
    studentGrade: profile?.grade ?? "S3",
    joinedAt: record.joined_at
  };
}

export function toTeacherOpsClass(
  database: {
    class_enrollments: Array<{ class_id: string }>;
    student_profiles?: TeacherOpsClassStudentProfileRecord[];
  },
  record: TeacherOpsClassRecord
): TeacherClass {
  const studentCount = database.class_enrollments.filter((enrollment) => enrollment.class_id === record.id).length;
  const profile = (database.student_profiles ?? []).find((candidate) => candidate.user_id === record.teacher_id);
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: profile?.curriculum_track,
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });

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
    studentCount,
    inviteCode: record.invite_code,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function teacherOpsCurriculumProfileForUser(
  database: {
    student_profiles?: TeacherOpsClassStudentProfileRecord[];
  },
  userId?: string | null
) {
  const profile = userId ? (database.student_profiles ?? []).find((candidate) => candidate.user_id === userId) : null;
  return normalizeStoredCurriculumProfile({
    curriculumTrack: profile?.curriculum_track,
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });
}

export function teacherOpsStudentMatchesClassCurriculum(
  database: {
    student_profiles?: TeacherOpsClassStudentProfileRecord[];
  },
  studentId: string,
  teacherClass: Pick<TeacherOpsClassRecord, "teacher_id">
) {
  return curriculumProfilesEqual(
    teacherOpsCurriculumProfileForUser(database, studentId),
    teacherOpsCurriculumProfileForUser(database, teacherClass.teacher_id)
  );
}

export function teacherOpsClassTopicIdsForClass({
  database,
  teacherClass,
  curriculumProfileForClass,
  topicMatchesCurriculumProfile
}: {
  database: { topics?: TeacherOpsClassTopicRecord[] };
  teacherClass: Pick<TeacherOpsClassRecord, "grade">;
  curriculumProfileForClass: (
    database: { topics?: TeacherOpsClassTopicRecord[] },
    teacherClass: Pick<TeacherOpsClassRecord, "grade">
  ) => CurriculumProfile;
  topicMatchesCurriculumProfile: (topic: TeacherOpsClassTopicRecord, curriculumProfile: CurriculumProfile) => boolean;
}) {
  const curriculumProfile = curriculumProfileForClass(database, teacherClass);
  return (database.topics ?? [])
    .filter((topic) => topicMatchesCurriculumProfile(topic, curriculumProfile) && topic.grade === teacherClass.grade)
    .map((topic) => topic.id);
}

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function defaultSubmissionComplete(submission: TeacherOpsClassSubmissionRecord) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

function latestStudentActivityAt(database: TeacherOpsClassPersistenceDatabase, studentId: string) {
  const timestamps = [
    ...database.attempts.filter((attempt) => attempt.user_id === studentId).map((attempt) => attempt.created_at),
    ...database.learning_events.filter((event) => event.user_id === studentId).map((event) => event.created_at),
    ...database.visualization_sessions.filter((session) => session.user_id === studentId).map((session) => session.updated_at),
    ...database.ai_tutor_messages.filter((message) => message.user_id === studentId).map((message) => message.created_at),
    ...database.submissions.filter((submission) => submission.student_id === studentId).map((submission) => submission.updated_at)
  ]
    .map(timestampOf)
    .filter((time): time is number => time !== null);

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
}

function studentAverageMastery(database: TeacherOpsClassPersistenceDatabase, studentId: string, topicIds: string[]) {
  if (!topicIds.length) return 0;

  const masteryValues = topicIds.map((topicId) => {
    return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topicId)?.mastery ?? 0;
  });

  return Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length);
}

function aiTutorMessageCountInWindow(database: TeacherOpsClassPersistenceDatabase, studentId: string, nowMs: number, days: number) {
  const earliest = nowMs - days * dayMs;
  return database.ai_tutor_messages.filter((message) => {
    const createdAt = timestampOf(message.created_at);
    return message.user_id === studentId && createdAt !== null && createdAt >= earliest && createdAt <= nowMs;
  }).length;
}

function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function teacherStudentIdsForClass(database: TeacherOpsClassPersistenceDatabase, classId: string) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

export const teacherOpsTeacherStudentIdsForClass = teacherStudentIdsForClass;

function riskTagsForStudent(
  database: TeacherOpsClassPersistenceDatabase,
  studentId: string,
  topicIds: string[],
  nowMs: number
): TeacherStudentRiskTag[] {
  const tags: TeacherStudentRiskTag[] = [];
  const activeMistakes = database.mistakes.filter((mistake) => mistake.user_id === studentId && !mistake.mastered);
  const latestActivity = latestStudentActivityAt(database, studentId);
  const lateWork = database.submissions.some((submission) => submission.student_id === studentId && submission.status === "late");

  if (studentAverageMastery(database, studentId, topicIds) < 55) tags.push("low-mastery");
  if (activeMistakes.some((mistake) => mistake.wrong_attempts >= 3)) tags.push("repeated-mistakes");
  if (!latestActivity || nowMs - Date.parse(latestActivity) > 7 * dayMs) tags.push("inactive");
  if (aiTutorMessageCountInWindow(database, studentId, nowMs, 7) >= 5) tags.push("high-ai-tutor");
  if (lateWork) tags.push("late-work");

  return tags;
}

export const teacherOpsClassRiskTagsForStudent = riskTagsForStudent;

function classStudentSummary({
  database,
  isSubmissionComplete,
  missingStudentName,
  nowMs,
  studentProfileFor,
  studentId,
  teacherClass,
  topicIds
}: {
  database: TeacherOpsClassPersistenceDatabase;
  isSubmissionComplete: (submission: TeacherOpsClassSubmissionRecord) => boolean;
  missingStudentName?: string;
  nowMs: number;
  studentProfileFor: NonNullable<TeacherOpsClassPersistenceStoreDependencies["studentProfileFor"]>;
  studentId: string;
  teacherClass: TeacherOpsClassRecord;
  topicIds: string[];
}): TeacherClassStudentSummary {
  const studentUser = database.users.find((candidate) => candidate.id === studentId);
  const profile = studentProfileFor(database, studentId);
  const classAssignments = database.assignments.filter((assignment) => assignment.class_id === teacherClass.id);
  const assignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
  const submissions = database.submissions.filter((submission) => submission.student_id === studentId && assignmentIds.has(submission.assignment_id));

  return {
    studentId,
    studentName: profile?.name ?? studentUser?.username ?? missingStudentName ?? studentId,
    grade: profile?.grade ?? teacherClass.grade,
    recentActivityAt: latestStudentActivityAt(database, studentId),
    averageMastery: studentAverageMastery(database, studentId, topicIds),
    assignmentCompletionRate: percent(submissions.filter(isSubmissionComplete).length, submissions.length),
    riskTags: riskTagsForStudent(database, studentId, topicIds, nowMs),
    href: `/teacher/classes/${encodeURIComponent(teacherClass.id)}/students/${encodeURIComponent(studentId)}`
  };
}

export const teacherOpsClassStudentSummary = classStudentSummary;

export function ensureTeacherOpsClassStudentWorkRecords({
  classId,
  createId,
  database,
  now,
  studentId
}: {
  classId: string;
  createId: NonNullable<TeacherOpsClassPersistenceStoreDependencies["createId"]>;
  database: TeacherOpsClassPersistenceDatabase;
  now: string;
  studentId: string;
}) {
  database.assignments
    .filter((assignment) => assignment.class_id === classId)
    .forEach((assignment) => {
      if (database.submissions.some((submission) => submission.assignment_id === assignment.id && submission.student_id === studentId)) return;
      database.submissions.push({
        id: `submission-${createId("submission")}`,
        assignment_id: assignment.id,
        student_id: studentId,
        status: "not-started",
        score: null,
        submitted_at: null,
        graded_at: null,
        feedback_en: "",
        feedback_zh: "",
        updated_at: now
      });
    });

  database.assessments
    .filter((assessment) => assessment.class_id === classId)
    .forEach((assessment) => {
      if (database.assessment_submissions.some((submission) => submission.assessment_id === assessment.id && submission.student_id === studentId)) return;
      database.assessment_submissions.push({
        id: `assessment-submission-${createId("assessmentSubmission")}`,
        assessment_id: assessment.id,
        student_id: studentId,
        status: "not-started",
        attempt_number: 0,
        score: null,
        max_score: 100,
        submitted_at: null,
        graded_at: null,
        answers: [],
        updated_at: now
      });
    });
}

export function createTeacherOpsClassPersistenceStore({
  createId = () => randomUUID(),
  gradeIsValid,
  mutateDatabase,
  normalizeUsername,
  now = () => new Date(),
  readDatabase,
  studentProfileFor = () => null,
  topicIdsForClass,
  isSubmissionComplete = defaultSubmissionComplete,
  groupsForClass = () => [],
  topicOptionsForClass = () => [],
  learningPathsForClass = () => [],
  toAssignment,
  toClassEnrollment,
  toTeacherClass
}: TeacherOpsClassPersistenceStoreDependencies) {
  return {
    async getTeacherClasses(userId: string): Promise<TeacherClass[] | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      return teacherClassRecordsFor(database, user).map((teacherClass) => toTeacherClass(database, teacherClass));
    },

    async getTeacherClassEnrollments(userId: string, classId: string): Promise<ClassEnrollment[] | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
      if (!teacherClass || (user.role !== "admin" && teacherClass.teacher_id !== user.id)) return null;

      return database.class_enrollments
        .filter((enrollment) => enrollment.class_id === classId)
        .map((enrollment) => toClassEnrollment(database, enrollment));
    },

    async createTeacherClass({
      teacherId,
      name,
      grade,
      academicYear,
      description
    }: {
      teacherId: string;
      name: string;
      grade: GradeId;
      academicYear: string;
      description: string;
    }) {
      const trimmedName = name.trim();
      const trimmedYear = academicYear.trim();
      const trimmedDescription = description.trim();
      if (!trimmedName || !gradeIsValid(grade) || !trimmedYear) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const createdAt = now().toISOString();
        const teacherClass: TeacherOpsClassRecord = {
          id: `class-${createId("class")}`,
          teacher_id: user.id,
          school_id: user.school_id,
          class_code: undefined,
          name: trimmedName,
          grade,
          academic_year: trimmedYear,
          description_en: trimmedDescription || `${trimmedName} teaching group.`,
          description_zh: trimmedDescription || `${trimmedName} 教學班級。`,
          invite_code: `${grade}-${createId("invite").slice(0, 6)}`.toUpperCase(),
          created_at: createdAt,
          updated_at: createdAt
        };
        database.teacher_classes.unshift(teacherClass);

        return { status: "created" as const, class: toTeacherClass(database, teacherClass) };
      });
    },

    async addStudentToTeacherClass({
      teacherId,
      classId,
      username
    }: {
      teacherId: string;
      classId: string;
      username: string;
    }) {
      const normalizedUsername = normalizeUsername(username);
      if (!normalizedUsername) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };

        const matchingStudents = database.users.filter(
          (candidate) =>
            candidate.role === "student" &&
            (candidate.normalized_username === normalizedUsername ||
              candidate.normalized_email === normalizedUsername)
        );
        const student = matchingStudents.find((candidate) => teacherOpsStudentMatchesClassCurriculum(database, candidate.id, teacherClass))
          ?? matchingStudents[0];
        if (!student || student.role !== "student") return { status: "student-not-found" as const };
        if (!teacherOpsStudentMatchesClassCurriculum(database, student.id, teacherClass)) return { status: "curriculum-mismatch" as const };

        if (database.class_enrollments.some((enrollment) => enrollment.class_id === classId && enrollment.student_id === student.id)) {
          return { status: "duplicate" as const };
        }

        const joinedAt = now().toISOString();
        database.class_enrollments.push({
          id: `enrollment-${createId("enrollment")}`,
          class_id: classId,
          student_id: student.id,
          joined_at: joinedAt
        });
        ensureTeacherOpsClassStudentWorkRecords({ classId, createId, database, now: joinedAt, studentId: student.id });

        return { status: "added" as const };
      });
    },

    async joinClassByInviteCode({
      studentId,
      inviteCode
    }: {
      studentId: string;
      inviteCode: string;
    }) {
      const normalizedInviteCode = inviteCode.trim().toUpperCase();
      if (!normalizedInviteCode) return { status: "invalid" as const };

      return mutateDatabase((database) => {
        const student = database.users.find((candidate) => candidate.id === studentId);
        if (!student || student.role !== "student") return { status: "forbidden" as const };

        const teacherClass = database.teacher_classes.find((candidate) => candidate.invite_code.toUpperCase() === normalizedInviteCode);
        if (!teacherClass) return { status: "not-found" as const };
        if (!teacherOpsStudentMatchesClassCurriculum(database, studentId, teacherClass)) return { status: "curriculum-mismatch" as const };

        if (database.class_enrollments.some((enrollment) => enrollment.class_id === teacherClass.id && enrollment.student_id === studentId)) {
          return { status: "duplicate" as const, class: toTeacherClass(database, teacherClass) };
        }

        const joinedAt = now().toISOString();
        database.class_enrollments.push({
          id: `enrollment-${createId("enrollment")}`,
          class_id: teacherClass.id,
          student_id: studentId,
          joined_at: joinedAt
        });
        ensureTeacherOpsClassStudentWorkRecords({ classId: teacherClass.id, createId, database, now: joinedAt, studentId });

        return { status: "joined" as const, class: toTeacherClass(database, teacherClass) };
      });
    },

    async getTeacherClassDetailData(userId: string, classId: string): Promise<TeacherClassDetailData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const teacherClass = teacherCanAccessClass(database, user, classId);
      if (!teacherClass) return null;

      const nowMs = now().getTime();
      const topicIds = topicIdsForClass(database, teacherClass);
      const students = teacherStudentIdsForClass(database, classId)
        .map((studentId) => classStudentSummary({
          database,
          isSubmissionComplete,
          nowMs,
          studentProfileFor,
          studentId,
          teacherClass,
          topicIds
        }))
        .sort((a, b) => b.riskTags.length - a.riskTags.length || a.studentName.localeCompare(b.studentName));
      const assignments = database.assignments
        .filter((assignment) => assignment.class_id === classId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((assignment) => toAssignment(database, assignment));

      return {
        class: toTeacherClass(database, teacherClass),
        students,
        assignments,
        groups: groupsForClass(database, classId),
        topicOptions: topicOptionsForClass(database, teacherClass),
        learningPaths: learningPathsForClass(database, classId)
      };
    }
  };
}
