import type {
  AITutorTranscriptMessage,
  Assignment,
  GradeId,
  GuardianLink,
  LocalizedText,
  MistakeBookItem,
  StudentSession,
  Submission,
  TeacherClass,
  TeacherMessage,
  TeacherStudentMasteryTarget,
  TeacherStudentProfileData,
  TopicStatus
} from "@/types";

export type TeacherStudentAiTutorTranscriptResult =
  | { status: "ok"; studentName: string; messages: AITutorTranscriptMessage[] }
  | { status: "forbidden" }
  | { status: "student-not-found" };

type TeacherOpsStudentProfileUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsStudentProfileUserRecord = {
  id: string;
  role: TeacherOpsStudentProfileUserRole;
};

type TeacherOpsStudentProfileClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsStudentProfileSchoolMembershipRecord = {
  user_id: string;
  role: string;
  class_id?: string;
};

type TeacherOpsStudentProfileClassEnrollmentRecord = {
  id?: string;
  class_id: string;
  student_id: string;
};

type TeacherOpsStudentProfileGuardianLinkRecord = {
  id: string;
  parent_id: string;
  student_id: string;
  status: string;
};

type TeacherOpsStudentProfileAssignmentRecord = {
  id: string;
  class_id: string;
  updated_at: string;
};

type TeacherOpsStudentProfileSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  updated_at: string;
};

type TeacherOpsStudentProfileMessageRecord = {
  id: string;
  teacher_id: string;
  student_id: string;
  last_message_at: string;
};

type TeacherOpsStudentProfileAiTutorMessageRecord = {
  id: string;
  user_id: string;
  role: "student" | "tutor";
  content: string;
  created_at: string;
};

type TeacherOpsStudentProfileTopicRecord = {
  id: string;
  grade: GradeId;
  title_en: string;
  title_zh: string;
};

type TeacherOpsStudentProfileLessonProgressRecord = {
  user_id: string;
  topic_id: string;
  mastery: number;
  status: TopicStatus;
  updated_at?: string | null;
};

type TeacherOpsStudentProfileAttemptRecord = {
  id: string;
  user_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  duration_seconds: number | null;
  created_at: string;
};

type TeacherOpsStudentProfileQuestionRecord = {
  id: string;
  topic_id: string;
};

type TeacherOpsStudentProfileMistakeRecord = {
  user_id: string;
  question_id: string;
  wrong_attempts: number;
  mastered: boolean;
  last_attempt_at: string;
};

type TeacherOpsStudentProfileLearningEventRecord = {
  id?: string;
  user_id: string;
  created_at: string;
};

type TeacherOpsStudentProfileVisualizationSessionRecord = {
  id?: string;
  user_id: string;
  updated_at: string;
};

type TeacherOpsStudentProfileMasteryTargetRecord = {
  id: string;
  teacher_id: string;
  student_id: string;
  topic_id: string;
  mastery: number;
  note: string;
  updated_at: string;
};

export type TeacherOpsStudentProfilePersistenceDatabase = {
  ai_tutor_messages: TeacherOpsStudentProfileAiTutorMessageRecord[];
  assignments: TeacherOpsStudentProfileAssignmentRecord[];
  attempts: TeacherOpsStudentProfileAttemptRecord[];
  class_enrollments: TeacherOpsStudentProfileClassEnrollmentRecord[];
  guardian_links: TeacherOpsStudentProfileGuardianLinkRecord[];
  learning_events: TeacherOpsStudentProfileLearningEventRecord[];
  lesson_progress: TeacherOpsStudentProfileLessonProgressRecord[];
  mistakes: TeacherOpsStudentProfileMistakeRecord[];
  questions: TeacherOpsStudentProfileQuestionRecord[];
  school_memberships?: TeacherOpsStudentProfileSchoolMembershipRecord[];
  submissions: TeacherOpsStudentProfileSubmissionRecord[];
  teacher_classes: TeacherOpsStudentProfileClassRecord[];
  teacher_mastery_targets: TeacherOpsStudentProfileMasteryTargetRecord[];
  teacher_messages: TeacherOpsStudentProfileMessageRecord[];
  topics: TeacherOpsStudentProfileTopicRecord[];
  users: TeacherOpsStudentProfileUserRecord[];
  visualization_sessions: TeacherOpsStudentProfileVisualizationSessionRecord[];
};

export type TeacherOpsStudentProfilePersistenceStoreDependencies = {
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsStudentProfilePersistenceDatabase>;
  ensureParentInviteCodeForStudent: (studentId: string) => Promise<string | null>;
  studentSessionProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    user: TeacherOpsStudentProfileUserRecord
  ) => StudentSession | null;
  classProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    teacherClass: TeacherOpsStudentProfileClassRecord
  ) => TeacherClass;
  guardianLinkProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    link: TeacherOpsStudentProfileGuardianLinkRecord
  ) => GuardianLink;
  assignmentProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    assignment: TeacherOpsStudentProfileAssignmentRecord
  ) => Assignment;
  submissionProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    submission: TeacherOpsStudentProfileSubmissionRecord
  ) => Submission;
  messageProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    message: TeacherOpsStudentProfileMessageRecord
  ) => TeacherMessage;
  mistakeProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    mistake: TeacherOpsStudentProfileMistakeRecord
  ) => MistakeBookItem | null;
  topicIdsForClass: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    teacherClass: TeacherOpsStudentProfileClassRecord
  ) => string[];
  topicTitleProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    topic: TeacherOpsStudentProfileTopicRecord
  ) => LocalizedText;
  topicLabelForQuestion: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    question: TeacherOpsStudentProfileQuestionRecord
  ) => LocalizedText;
  masteryTargetProjection: (
    database: TeacherOpsStudentProfilePersistenceDatabase,
    target: TeacherOpsStudentProfileMasteryTargetRecord
  ) => TeacherStudentMasteryTarget;
};

export type TeacherOpsStudentProfilePersistenceStore = ReturnType<typeof createTeacherOpsStudentProfilePersistenceStore>;

const dayMs = 24 * 60 * 60 * 1000;

function canUseTeacherArea(user?: TeacherOpsStudentProfileUserRecord | null): user is TeacherOpsStudentProfileUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(
  database: TeacherOpsStudentProfilePersistenceDatabase,
  user: TeacherOpsStudentProfileUserRecord
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

function teacherClassForStudent(
  database: TeacherOpsStudentProfilePersistenceDatabase,
  user: TeacherOpsStudentProfileUserRecord,
  studentId: string
) {
  const classRecords = teacherClassRecordsFor(database, user);
  const classIds = new Set(classRecords.map((teacherClass) => teacherClass.id));
  const enrollment = database.class_enrollments.find(
    (candidate) => candidate.student_id === studentId && classIds.has(candidate.class_id)
  );
  return enrollment ? classRecords.find((teacherClass) => teacherClass.id === enrollment.class_id) ?? null : null;
}

function timestampOf(value?: string | null) {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : null;
}

function latestStudentActivityAt(database: TeacherOpsStudentProfilePersistenceDatabase, studentId: string) {
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

function studentAverageMastery(
  database: TeacherOpsStudentProfilePersistenceDatabase,
  studentId: string,
  topicIds: string[]
) {
  if (!topicIds.length) return 0;

  const masteryValues = topicIds.map((topicId) => {
    return database.lesson_progress.find((progress) => progress.user_id === studentId && progress.topic_id === topicId)?.mastery ?? 0;
  });

  return Math.round(masteryValues.reduce((sum, mastery) => sum + mastery, 0) / masteryValues.length);
}

function aiTutorMessageCountInWindow(
  database: TeacherOpsStudentProfilePersistenceDatabase,
  studentId: string,
  nowMs: number,
  days: number
) {
  const earliest = nowMs - days * dayMs;
  return database.ai_tutor_messages.filter((message) => {
    const createdAt = timestampOf(message.created_at);
    return message.user_id === studentId && createdAt !== null && createdAt >= earliest && createdAt <= nowMs;
  }).length;
}

function isSubmissionComplete(submission: TeacherOpsStudentProfileSubmissionRecord) {
  return (
    submission.status === "submitted" ||
    submission.status === "graded" ||
    submission.status === "late" ||
    submission.status === "correction-required" ||
    submission.status === "correction-submitted" ||
    submission.status === "resolved"
  );
}

export function createTeacherOpsStudentProfilePersistenceStore({
  now = () => new Date(),
  readDatabase,
  ensureParentInviteCodeForStudent,
  studentSessionProjection,
  classProjection,
  guardianLinkProjection,
  assignmentProjection,
  submissionProjection,
  messageProjection,
  mistakeProjection,
  topicIdsForClass,
  topicTitleProjection,
  topicLabelForQuestion,
  masteryTargetProjection
}: TeacherOpsStudentProfilePersistenceStoreDependencies) {
  return {
    async getTeacherStudentProfileData(userId: string, studentId: string): Promise<TeacherStudentProfileData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const teacherClass = teacherClassForStudent(database, user, studentId);
      if (!teacherClass) return null;

      const studentUser = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!studentUser) return null;

      const student = studentSessionProjection(database, studentUser);
      if (!student) return null;

      const classRecords = teacherClassRecordsFor(database, user).filter((candidate) =>
        database.class_enrollments.some((enrollment) => enrollment.class_id === candidate.id && enrollment.student_id === studentId)
      );
      const topicIds = new Set(classRecords.flatMap((candidate) => topicIdsForClass(database, candidate)));
      const masteryTargetsByTopic = new Map(
        database.teacher_mastery_targets
          .filter((target) => target.teacher_id === user.id && target.student_id === studentId && topicIds.has(target.topic_id))
          .map((target) => [target.topic_id, target])
      );
      const assignments = database.assignments
        .filter((assignment) => classRecords.some((candidate) => candidate.id === assignment.class_id))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((assignment) => ({
          assignment: assignmentProjection(database, assignment),
          submission: database.submissions
            .filter((submission) => submission.assignment_id === assignment.id && submission.student_id === studentId)
            .map((submission) => submissionProjection(database, submission))[0] ?? null
        }));
      const messages = database.teacher_messages
        .filter((message) => message.student_id === studentId && (user.role === "admin" || message.teacher_id === user.id))
        .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
        .map((message) => messageProjection(database, message));
      const recentTutorMessages = database.ai_tutor_messages
        .filter((message) => message.user_id === studentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5);
      const topicProgress = database.topics
        .filter((topic) => topicIds.has(topic.id))
        .map((topic) => {
          const progress = database.lesson_progress.find((candidate) => candidate.user_id === studentId && candidate.topic_id === topic.id);
          const masteryTarget = masteryTargetsByTopic.get(topic.id);
          return {
            topicId: topic.id,
            title: topicTitleProjection(database, topic),
            grade: topic.grade,
            mastery: progress?.mastery ?? 0,
            status: progress?.status ?? "not-started",
            updatedAt: progress?.updated_at ?? null,
            teacherMasteryTarget: masteryTarget ? masteryTargetProjection(database, masteryTarget) : null
          };
        })
        .sort((a, b) => a.mastery - b.mastery);
      const recentAttempts = database.attempts
        .filter((attempt) => attempt.user_id === studentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8)
        .map((attempt) => {
          const question = database.questions.find((candidate) => candidate.id === attempt.question_id);
          return {
            id: attempt.id,
            questionId: attempt.question_id,
            topic: question ? topicLabelForQuestion(database, question) : { en: "Unknown topic", zh: "未知課題" },
            selectedAnswer: attempt.selected_answer,
            isCorrect: attempt.is_correct,
            durationSeconds: attempt.duration_seconds,
            createdAt: attempt.created_at
          };
        });
      const parentInviteCode = await ensureParentInviteCodeForStudent(studentId);
      const topicIdList = Array.from(topicIds);
      const nowMs = now().getTime();

      return {
        student,
        classes: classRecords.map((record) => classProjection(database, record)),
        parentInviteCode: parentInviteCode ?? "",
        guardianLinks: database.guardian_links
          .filter((link) => link.student_id === studentId && link.status === "active")
          .map((link) => guardianLinkProjection(database, link)),
        averageMastery: studentAverageMastery(database, studentId, topicIdList),
        recentActivityAt: latestStudentActivityAt(database, studentId),
        progress: topicProgress,
        mistakes: database.mistakes
          .filter((mistake) => mistake.user_id === studentId)
          .sort((a, b) => Number(a.mastered) - Number(b.mastered) || b.last_attempt_at.localeCompare(a.last_attempt_at))
          .map((mistake) => mistakeProjection(database, mistake))
          .filter((mistake): mistake is MistakeBookItem => Boolean(mistake)),
        recentAttempts,
        assignments,
        messages,
        aiTutor: {
          messageCount7d: aiTutorMessageCountInWindow(database, studentId, nowMs, 7),
          lastMessageAt: recentTutorMessages[0]?.created_at ?? null
        }
      };
    },

    async getStudentAiTutorTranscriptForTeacher({
      userId,
      studentId,
      limit = 50
    }: {
      userId: string;
      studentId: string;
      limit?: number;
    }): Promise<TeacherStudentAiTutorTranscriptResult> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" };

      const teacherClass = teacherClassForStudent(database, user, studentId);
      if (!teacherClass) return { status: "forbidden" };

      const studentUser = database.users.find((candidate) => candidate.id === studentId && candidate.role === "student");
      if (!studentUser) return { status: "student-not-found" };

      const student = studentSessionProjection(database, studentUser);
      if (!student) return { status: "student-not-found" };

      const boundedLimit = Math.min(200, Math.max(1, Math.round(limit)));
      const messages = database.ai_tutor_messages
        .filter((message) => message.user_id === studentId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, boundedLimit)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: message.created_at
        }));

      return { status: "ok", studentName: student.name, messages };
    }
  };
}
