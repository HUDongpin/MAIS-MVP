import {
  buildTeacherAssessmentAnalysis,
  normalizeAssessmentAnalysisSettings,
  type TeacherAssessmentAnalysisItemInput,
  type TeacherAssessmentGradeComparisonCohortInput
} from "@/lib/teacherAssessmentAnalysis";
import {
  contentMatchesCurriculumProfile,
  curriculumTrackForProfile,
  normalizeStoredCurriculumProfile
} from "@/lib/curriculumProfile";
import { curriculumContentEnabledFor } from "@/lib/server/userStore/curriculumAvailability";
import {
  difficultyMatchesAnyActiveFilter,
  isActiveDifficulty
} from "@/lib/difficulty";
import { isRetiredHongKongQuestionId } from "@/lib/hongKongQuestionRetirement";
import { normalizeQuestionDiagram } from "@/lib/questionFigure";
import type {
  BuildTeacherReviewLessonDraftInput,
  TeacherReviewLessonAnalyticsInput,
  TeacherReviewLessonPracticeBankInput
} from "@/lib/teacherReviewLesson";
import type {
  Assessment,
  AssessmentAnalysisSettings,
  AssessmentEmbeddedQuestion,
  AssessmentManualQuestion,
  AssessmentPaperItem,
  AssessmentPaperItemSource,
  AssessmentPaperSection,
  AssessmentSourceType,
  AssessmentStatus,
  AssessmentSubmission,
  AssessmentSubmissionAnswer,
  AssessmentSubmissionStatus,
  AssessmentType,
  CurriculumRegion,
  CurriculumTrack,
  Difficulty,
  GradeId,
  LocalizedText,
  ParentSafeTeacherDraft,
  QuestionType,
  TeacherAssessmentCreateData,
  TeacherAssessmentDetailData,
  TeacherAssessmentListData,
  TeacherAssessmentQuestionOption,
  TeacherClass,
  TeacherReviewLessonDetailData,
  TeacherReviewLessonPlan,
  TeacherReviewLessonSource,
  TeacherReviewLessonStatus,
  TeachingResource,
  TeachingResourceType,
  TextbookPublisher
} from "@/types";

type TeacherOpsAssessmentUserRole = "student" | "teacher" | "parent" | "admin";

const assessmentQuestionTypes = new Set<QuestionType>(["multiple-choice", "fill-in", "short-answer", "graph"]);

export function isValidAssessmentQuestionType(questionType: unknown): questionType is QuestionType {
  return assessmentQuestionTypes.has(questionType as QuestionType);
}

export function normalizeAssessmentQuestionType(questionType: unknown): AssessmentEmbeddedQuestion["type"] {
  if (questionType === "manual") return "manual";
  return isValidAssessmentQuestionType(questionType) ? questionType : "short-answer";
}

function normalizeAssessmentLocalizedText(value: unknown, fallback: string): LocalizedText {
  if (typeof value === "object" && value !== null) {
    const localized = value as { en?: unknown; zh?: unknown; zhHans?: unknown };
    const en = typeof localized.en === "string" && localized.en.trim() ? localized.en.trim().slice(0, 6000) : fallback;
    const zh = typeof localized.zh === "string" && localized.zh.trim() ? localized.zh.trim().slice(0, 6000) : en;
    const zhHans = typeof localized.zhHans === "string" && localized.zhHans.trim()
      ? localized.zhHans.trim().slice(0, 6000)
      : undefined;
    return zhHans ? { en, zh, zhHans } : { en, zh };
  }

  const text = typeof value === "string" && value.trim() ? value.trim().slice(0, 6000) : fallback;
  return { en: text, zh: text };
}

function curriculumProfileForUser(
  database: TeacherOpsAssessmentPersistenceDatabase,
  userId?: string | null
) {
  const profile = userId
    ? database.student_profiles?.find((candidate) => candidate.user_id === userId)
    : null;
  return normalizeStoredCurriculumProfile({
    curriculumTrack: profile?.curriculum_track,
    region: profile?.curriculum_region,
    publisher: profile?.textbook_publisher
  });
}

function curriculumProfileForClass(
  database: TeacherOpsAssessmentPersistenceDatabase,
  teacherClass: TeacherOpsAssessmentClassRecord
) {
  return curriculumProfileForUser(database, teacherClass.teacher_id);
}

function topicMatchesUserCurriculum(
  database: TeacherOpsAssessmentPersistenceDatabase,
  topic: TeacherOpsAssessmentTopicRecord,
  user: TeacherOpsAssessmentUserRecord
) {
  const curriculumProfile = curriculumProfileForUser(database, user.id);
  return curriculumContentEnabledFor(curriculumProfile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: topic.curriculum_track,
      region: topic.curriculum_region,
      publisher: topic.textbook_publisher
    },
    curriculumProfile
  );
}

function questionMatchesUserCurriculum(
  database: TeacherOpsAssessmentPersistenceDatabase,
  question: TeacherOpsAssessmentQuestionRecord,
  user: TeacherOpsAssessmentUserRecord
) {
  const curriculumProfile = curriculumProfileForUser(database, user.id);
  return curriculumContentEnabledFor(curriculumProfile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: question.curriculum_track,
      region: question.curriculum_region,
      publisher: question.textbook_publisher
    },
    curriculumProfile
  );
}

function questionMatchesClassCurriculum(
  database: TeacherOpsAssessmentPersistenceDatabase,
  question: TeacherOpsAssessmentQuestionRecord,
  teacherClass: TeacherOpsAssessmentClassRecord
) {
  const curriculumProfile = curriculumProfileForClass(database, teacherClass);
  return curriculumContentEnabledFor(curriculumProfile) && contentMatchesCurriculumProfile(
    {
      curriculumTrack: question.curriculum_track,
      region: question.curriculum_region,
      publisher: question.textbook_publisher
    },
    curriculumProfile
  );
}

function teachingResourceReferenceCounts(
  database: TeacherOpsAssessmentPersistenceDatabase,
  resourceId: string
) {
  return {
    assignments: (database.assignments ?? [])
      .filter((assignment) => assignment.content_type === "resource" && assignment.target_id === resourceId).length,
    assessments: database.assessments
      .filter((assessment) => assessment.source_resource_id === resourceId).length,
    classroom: 0
  };
}

function toTeachingResource(
  database: TeacherOpsAssessmentPersistenceDatabase,
  record: TeacherOpsAssessmentResourceRecord
): TeachingResource {
  return {
    id: record.id,
    title: {
      en: record.title_en,
      zh: record.title_zh
    },
    type: record.type,
    fileName: record.file_name,
    fileType: record.file_type,
    mimeType: record.mime_type,
    fileSizeBytes: record.file_size_bytes,
    storagePath: record.storage_path,
    grade: record.grade,
    topicId: record.topic_id,
    difficulty: record.difficulty,
    uploadedBy: record.uploaded_by,
    createdAt: record.created_at,
    referenceCounts: teachingResourceReferenceCounts(database, record.id)
  };
}

function toTeacherClass(
  database: TeacherOpsAssessmentPersistenceDatabase,
  record: TeacherOpsAssessmentClassRecord
): TeacherClass {
  const curriculumProfile = curriculumProfileForClass(database, record);

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
    studentCount: (database.class_enrollments ?? []).filter((enrollment) => enrollment.class_id === record.id).length,
    inviteCode: record.invite_code,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

type TeacherOpsAssessmentUserRecord = {
  id: string;
  role: TeacherOpsAssessmentUserRole;
  username?: string;
};

type TeacherOpsAssessmentStudentProfileRecord = {
  user_id: string;
  name?: string;
  grade?: GradeId;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsAssessmentClassRecord = {
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

type TeacherOpsAssessmentSchoolMembershipRecord = {
  user_id: string;
  role: "student" | "teacher" | "parent" | "admin";
  class_id?: string;
};

type TeacherOpsAssessmentResourceRecord = {
  id: string;
  title_en: string;
  title_zh: string;
  type: TeachingResourceType;
  file_name: string;
  file_type: string;
  mime_type: string;
  file_size_bytes: number;
  storage_path?: string;
  grade: GradeId;
  topic_id?: string;
  difficulty?: Difficulty;
  uploaded_by: string;
  created_at: string;
};

type TeacherOpsAssessmentAssignmentRecord = {
  id?: string;
  class_id?: string;
  content_type: string;
  target_id?: string;
  status?: string;
};

type TeacherOpsAssessmentAssignmentSubmissionRecord = {
  id?: string;
  assignment_id: string;
  student_id: string;
  status: string;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  feedback_en?: string;
  feedback_zh?: string;
  updated_at: string;
};

type TeacherOpsAssessmentTopicRecord = {
  id: string;
  grade: GradeId;
  sort_order: number;
  title_en: string;
  title_zh: string;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsAssessmentQuestionRecord = {
  id: string;
  grade: GradeId;
  topic_id: string;
  difficulty: Difficulty;
  type: QuestionType;
  prompt_en: string;
  prompt_zh: string;
  answer?: string;
  explanation_en?: string;
  explanation_zh?: string;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

type TeacherOpsAssessmentClassEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsAssessmentMistakeRecord = {
  user_id: string;
  question_id: string;
  mastered?: boolean;
};

type TeacherOpsAssessmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh?: string;
  type?: AssessmentType;
  status: AssessmentStatus;
  source_type?: AssessmentSourceType;
  source_resource_id?: string;
  question_ids?: string[];
  manual_questions?: AssessmentManualQuestion[];
  opens_at?: string | null;
  closes_at?: string | null;
  time_limit_minutes?: number | null;
  max_attempts?: number;
  randomize_question_order?: boolean;
  show_answers_immediately?: boolean;
  grade_weight?: number;
  analysis_settings?: Partial<AssessmentAnalysisSettings> | null;
  exam_group_id?: string;
  exam_group_name_en?: string;
  exam_group_name_zh?: string;
  created_by?: string;
  created_at?: string;
  updated_at: string;
  paper_sections?: AssessmentPaperSection[];
};

type TeacherOpsAssessmentSubmissionRecord = {
  id?: string;
  assessment_id: string;
  student_id?: string;
  status: string;
  attempt_number?: number;
  score: number | null;
  max_score: number;
  submitted_at?: string | null;
  graded_at?: string | null;
  answers?: AssessmentSubmissionAnswer[];
  updated_at?: string;
};

function normalizeTeacherOpsAssessmentOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeTeacherOpsAssessmentRecord<
  Record extends {
    source_type?: AssessmentSourceType | null;
    source_resource_id?: string | null;
    analysis_settings?: Partial<AssessmentAnalysisSettings> | null;
    exam_group_id?: string;
    exam_group_name_en?: string;
    exam_group_name_zh?: string;
    question_ids?: string[];
    manual_questions?: AssessmentManualQuestion[];
    paper_sections?: unknown;
    max_attempts?: number;
    randomize_question_order?: boolean;
    show_answers_immediately?: boolean;
    grade_weight?: number;
    created_at: string;
    updated_at?: string | null;
  }
>(
  assessment: Record
): Record & {
  source_type: AssessmentSourceType;
  source_resource_id: string | undefined;
  analysis_settings: AssessmentAnalysisSettings;
  exam_group_id: string | undefined;
  exam_group_name_en: string | undefined;
  exam_group_name_zh: string | undefined;
  question_ids: string[];
  manual_questions: AssessmentManualQuestion[];
  paper_sections: AssessmentPaperSection[];
  max_attempts: number;
  randomize_question_order: boolean;
  show_answers_immediately: boolean;
  grade_weight: number;
  updated_at: string;
} {
  return {
    ...assessment,
    source_type: assessment.source_type ?? "question-bank",
    source_resource_id: assessment.source_resource_id ?? undefined,
    analysis_settings: normalizeAssessmentAnalysisSettings(assessment.analysis_settings),
    exam_group_id: normalizeTeacherOpsAssessmentOptionalText(assessment.exam_group_id),
    exam_group_name_en: normalizeTeacherOpsAssessmentOptionalText(assessment.exam_group_name_en),
    exam_group_name_zh: normalizeTeacherOpsAssessmentOptionalText(assessment.exam_group_name_zh),
    question_ids: assessment.question_ids ?? [],
    manual_questions: assessment.manual_questions ?? [],
    paper_sections: Array.isArray(assessment.paper_sections) ? assessment.paper_sections : [],
    max_attempts: assessment.max_attempts ?? 1,
    randomize_question_order: assessment.randomize_question_order ?? false,
    show_answers_immediately: assessment.show_answers_immediately ?? false,
    grade_weight: assessment.grade_weight ?? 10,
    updated_at: assessment.updated_at ?? assessment.created_at
  };
}

export function normalizeTeacherOpsAssessmentSubmissionRecord<
  Record extends {
    status?: AssessmentSubmissionStatus | null;
    attempt_number?: number | null;
    score?: number | null;
    max_score?: number | null;
    submitted_at?: string | null;
    graded_at?: string | null;
    answers?: Array<AssessmentSubmissionAnswer & { teacherFeedback?: unknown }> | null;
    updated_at?: string | null;
  }
>(
  submission: Record,
  now: string
): Record & {
  status: AssessmentSubmissionStatus;
  attempt_number: number;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  answers: AssessmentSubmissionAnswer[];
  updated_at: string;
} {
  return {
    ...submission,
    status: submission.status ?? "not-started",
    attempt_number: submission.attempt_number ?? 1,
    score: submission.score ?? null,
    max_score: submission.max_score ?? 100,
    submitted_at: submission.submitted_at ?? null,
    graded_at: submission.graded_at ?? null,
    answers: (submission.answers ?? []).map((answer) => ({
      ...answer,
      teacherFeedback: answer.teacherFeedback ?? null
    })),
    updated_at: submission.updated_at ?? submission.submitted_at ?? now
  };
}

export type TeacherOpsSeedAssessmentRecord = {
  id: string;
  class_id: string;
  title_en: string;
  title_zh: string;
  type: AssessmentType;
  status: AssessmentStatus;
  source_type: AssessmentSourceType;
  source_resource_id: string | undefined;
  analysis_settings?: AssessmentAnalysisSettings;
  exam_group_id?: string;
  exam_group_name_en?: string;
  exam_group_name_zh?: string;
  question_ids: string[];
  manual_questions: AssessmentManualQuestion[];
  paper_sections: AssessmentPaperSection[];
  opens_at: string | null;
  closes_at: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  randomize_question_order: boolean;
  show_answers_immediately: boolean;
  grade_weight: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type TeacherOpsSeedAssessmentRecordsOptions = {
  demoTeacherId: string;
  questionExists: (questionId: string) => boolean;
};

// The California Grade 1 demo classroom, its teacher, and four questions from the
// Grade 1 add-and-subtract checkpoint pack. Kept as named constants because the
// only thing that makes this assessment openable is that all three agree with the
// seeded class, enrollment, and question bank.
const californiaGradeOneClassId = "class-us-ca-p1-2026";
const californiaGradeOneTeacherId = "teacher-scott-us";
const californiaGradeOneCheckQuestionIds = [
  "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q01",
  "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q02",
  "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q03",
  "us-ca-k5-knowledge-point-practice-v1-us-ca-math-p1-1-oa-add-subtract-q04"
];

export function teacherOpsSeedAssessmentRecords(
  now: string,
  options: TeacherOpsSeedAssessmentRecordsOptions
): TeacherOpsSeedAssessmentRecord[] {
  const nextWeek = new Date(Date.parse(now) + 7 * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "assessment-s3-algebra-quiz",
      class_id: "class-s3a-2026",
      title_en: "S3 algebra readiness quiz",
      title_zh: "中三代數預備測驗",
      type: "quiz",
      status: "draft",
      source_type: "question-bank",
      source_resource_id: undefined,
      question_ids: ["q5", "q6"].filter((questionId) => options.questionExists(questionId)),
      manual_questions: [],
      paper_sections: [],
      opens_at: null,
      closes_at: nextWeek,
      time_limit_minutes: 25,
      max_attempts: 1,
      randomize_question_order: true,
      show_answers_immediately: false,
      grade_weight: 10,
      created_by: options.demoTeacherId,
      created_at: now,
      updated_at: now
    },
    // The demo classroom needs one assessment a student can actually open: the
    // quiz above is a draft, so every student who follows an assessment link
    // lands on "Assessment unavailable". This one is open, has no window and no
    // timer, and allows repeat attempts so a demo can be run more than once.
    {
      id: "assessment-us-ca-p1-add-subtract-check",
      class_id: californiaGradeOneClassId,
      title_en: "Grade 1 add and subtract check",
      title_zh: "小一加減法檢測",
      type: "quiz",
      status: "open",
      source_type: "question-bank",
      source_resource_id: undefined,
      question_ids: californiaGradeOneCheckQuestionIds.filter((questionId) => options.questionExists(questionId)),
      manual_questions: [],
      paper_sections: [],
      opens_at: null,
      closes_at: null,
      time_limit_minutes: null,
      max_attempts: 3,
      randomize_question_order: false,
      show_answers_immediately: true,
      grade_weight: 10,
      created_by: californiaGradeOneTeacherId,
      created_at: now,
      updated_at: now
    }
  ];
}

export type TeacherOpsSeedAssessmentSubmissionRecord = {
  id: string;
  assessment_id: string;
  student_id: string;
  status: AssessmentSubmissionStatus;
  attempt_number: number;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  answers: AssessmentSubmissionAnswer[];
  updated_at: string;
};

type TeacherOpsSeedAssessmentSubmissionRecordsOptions = {
  demoUserId: string;
  shouldSeedDemoUser: () => boolean;
};

export function teacherOpsSeedAssessmentSubmissionRecords(
  now: string,
  options: TeacherOpsSeedAssessmentSubmissionRecordsOptions
): TeacherOpsSeedAssessmentSubmissionRecord[] {
  return options.shouldSeedDemoUser()
    ? [
        {
          id: "assessment-submission-s3-algebra-peter",
          assessment_id: "assessment-s3-algebra-quiz",
          student_id: options.demoUserId,
          status: "graded",
          attempt_number: 1,
          score: 72,
          max_score: 100,
          submitted_at: now,
          graded_at: now,
          answers: [
            {
              questionId: "q5",
              answer: "x = 2",
              isCorrect: true,
              pointsEarned: 50,
              maxPoints: 50
            },
            {
              questionId: "q6",
              answer: "x = -2",
              isCorrect: false,
              pointsEarned: 22,
              maxPoints: 50
            }
          ],
          updated_at: now
        }
      ]
    : [];
}

export type TeacherOpsAssessmentCollectionRecord = Omit<
  TeacherOpsSeedAssessmentRecord,
  | "analysis_settings"
  | "exam_group_id"
  | "exam_group_name_en"
  | "exam_group_name_zh"
  | "grade_weight"
  | "manual_questions"
  | "max_attempts"
  | "paper_sections"
  | "question_ids"
  | "randomize_question_order"
  | "show_answers_immediately"
  | "source_resource_id"
  | "source_type"
  | "updated_at"
> & {
  analysis_settings?: Partial<AssessmentAnalysisSettings> | null;
  exam_group_id?: string;
  exam_group_name_en?: string;
  exam_group_name_zh?: string;
  grade_weight?: number;
  manual_questions?: AssessmentManualQuestion[];
  max_attempts?: number;
  paper_sections?: unknown;
  question_ids?: string[];
  randomize_question_order?: boolean;
  show_answers_immediately?: boolean;
  source_resource_id?: string | null;
  source_type?: AssessmentSourceType | null;
  updated_at?: string | null;
};

export type TeacherOpsAssessmentSubmissionCollectionRecord = Omit<
  TeacherOpsSeedAssessmentSubmissionRecord,
  | "answers"
  | "attempt_number"
  | "graded_at"
  | "max_score"
  | "score"
  | "status"
  | "submitted_at"
  | "updated_at"
> & {
  answers?: Array<AssessmentSubmissionAnswer & { teacherFeedback?: unknown }> | null;
  attempt_number?: number | null;
  graded_at?: string | null;
  max_score?: number | null;
  score?: number | null;
  status?: AssessmentSubmissionStatus | null;
  submitted_at?: string | null;
  updated_at?: string | null;
};

export type TeacherOpsAssessmentCollectionRecords = {
  assessment_submissions?: TeacherOpsAssessmentSubmissionCollectionRecord[];
  assessments?: TeacherOpsAssessmentCollectionRecord[];
};

export type TeacherOpsAssessmentCollectionNormalizationOptions = {
  demoTeacherId: string;
  demoUserId: string;
  questionExists: (questionId: string) => boolean;
  shouldSeedDemoUser: () => boolean;
};

function mergeTeacherOpsAssessmentSeedRecordsPreservingExisting<T>(
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

export function normalizeTeacherOpsAssessmentCollections(
  collections: TeacherOpsAssessmentCollectionRecords,
  now: string,
  options: TeacherOpsAssessmentCollectionNormalizationOptions
): {
  assessment_submissions: Array<TeacherOpsAssessmentSubmissionCollectionRecord & {
    answers: AssessmentSubmissionAnswer[];
    attempt_number: number;
    graded_at: string | null;
    max_score: number;
    score: number | null;
    status: AssessmentSubmissionStatus;
    submitted_at: string | null;
    updated_at: string;
  }>;
  assessments: Array<TeacherOpsAssessmentCollectionRecord & {
    analysis_settings: AssessmentAnalysisSettings;
    exam_group_id: string | undefined;
    exam_group_name_en: string | undefined;
    exam_group_name_zh: string | undefined;
    grade_weight: number;
    manual_questions: AssessmentManualQuestion[];
    max_attempts: number;
    paper_sections: AssessmentPaperSection[];
    question_ids: string[];
    randomize_question_order: boolean;
    show_answers_immediately: boolean;
    source_resource_id: string | undefined;
    source_type: AssessmentSourceType;
    updated_at: string;
  }>;
} {
  return {
    assessments: mergeTeacherOpsAssessmentSeedRecordsPreservingExisting<
      TeacherOpsAssessmentCollectionRecord | TeacherOpsSeedAssessmentRecord
    >(
      collections.assessments,
      teacherOpsSeedAssessmentRecords(now, {
        demoTeacherId: options.demoTeacherId,
        questionExists: options.questionExists
      }),
      (assessment) => assessment.id
    ).map((assessment) => normalizeTeacherOpsAssessmentRecord(assessment)),
    assessment_submissions: mergeTeacherOpsAssessmentSeedRecordsPreservingExisting<
      TeacherOpsAssessmentSubmissionCollectionRecord | TeacherOpsSeedAssessmentSubmissionRecord
    >(
      collections.assessment_submissions,
      teacherOpsSeedAssessmentSubmissionRecords(now, {
        demoUserId: options.demoUserId,
        shouldSeedDemoUser: options.shouldSeedDemoUser
      }),
      (submission) => submission.id
    ).map((submission) => normalizeTeacherOpsAssessmentSubmissionRecord(submission, now))
  };
}

type TeacherOpsReviewLessonRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  assessment_id: string;
  title_en: string;
  title_zh: string;
  language: TeacherReviewLessonPlan["language"];
  duration_minutes: number;
  status: TeacherReviewLessonPlan["status"];
  source: TeacherReviewLessonPlan["source"];
  source_snapshot: TeacherReviewLessonPlan["sourceSnapshot"];
  objectives: TeacherReviewLessonPlan["objectives"];
  timeline: TeacherReviewLessonPlan["timeline"];
  items: TeacherReviewLessonPlan["items"];
  slides: TeacherReviewLessonPlan["slides"];
  board_columns: TeacherReviewLessonPlan["boardColumns"];
  variation_questions: TeacherReviewLessonPlan["variationQuestions"];
  remediation_questions: TeacherReviewLessonPlan["remediationQuestions"];
  individual_groups: TeacherReviewLessonPlan["individualGroups"];
  generation_notes_en: string;
  generation_notes_zh: string;
  created_at: string;
  updated_at: string;
  generated_at: string;
  reviewed_at: string | null;
  remediation_assessment_id?: string;
};

type TeacherOpsNoticeRecord = {
  id: string;
  teacher_id: string;
  class_id: string;
  audience: "parents" | "students" | "both";
  channel_id: string;
  channel_name: string;
  subject_en: string;
  subject_zh: string;
  body_en: string;
  body_zh: string;
  status: ParentSafeTeacherDraft["status"];
  source_kind?: "manual" | "teacher-review-lesson" | "assignment-reminder" | "system";
  source_id?: string;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

type TeacherOpsNoticeRecipientRecord = {
  id: string;
  notice_id: string;
  student_id: string;
  guardian_id?: string;
  status: "pending" | "acknowledged";
  acknowledged_by?: string;
  acknowledged_at: string | null;
  created_at: string;
};

type TeacherOpsGuardianLinkRecord = {
  student_id: string;
  parent_id: string;
  status: string;
};

export type TeacherOpsAssessmentPersistenceDatabase = {
  assessment_submissions: TeacherOpsAssessmentSubmissionRecord[];
  assessments: TeacherOpsAssessmentRecord[];
  assignments?: TeacherOpsAssessmentAssignmentRecord[];
  class_enrollments?: TeacherOpsAssessmentClassEnrollmentRecord[];
  guardian_links?: TeacherOpsGuardianLinkRecord[];
  mistakes?: TeacherOpsAssessmentMistakeRecord[];
  questions: TeacherOpsAssessmentQuestionRecord[];
  school_memberships?: TeacherOpsAssessmentSchoolMembershipRecord[];
  student_profiles?: TeacherOpsAssessmentStudentProfileRecord[];
  submissions?: TeacherOpsAssessmentAssignmentSubmissionRecord[];
  teacher_classes: TeacherOpsAssessmentClassRecord[];
  teacher_notices?: TeacherOpsNoticeRecord[];
  teacher_notice_recipients?: TeacherOpsNoticeRecipientRecord[];
  teacher_review_lessons?: TeacherOpsReviewLessonRecord[];
  teaching_resources: TeacherOpsAssessmentResourceRecord[];
  topics: TeacherOpsAssessmentTopicRecord[];
  users: TeacherOpsAssessmentUserRecord[];
};

export type TeacherOpsAssessmentBuilderQuestionsInput = {
  teacherId: string;
  classId: string;
  topicIds?: string[];
  difficulties?: Difficulty[];
  questionTypes?: QuestionType[];
  keyword?: string;
  source: "question-bank" | "mistakes";
  page: number;
  pageSize: number;
};

export type TeacherOpsAssessmentBuilderQuestionsData = {
  questions: TeacherAssessmentQuestionOption[];
  total: number;
  page: number;
  pageSize: number;
};

export type TeacherOpsAssessmentCloneResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "created"; assessment: Assessment };

export type TeacherOpsAssessmentCreateInput = {
  teacherId: string;
  classId: string;
  title: string;
  type: AssessmentType;
  sourceType: AssessmentSourceType;
  sourceResourceId?: string | null;
  questionIds?: string[];
  manualQuestions?: AssessmentManualQuestion[];
  paperSections?: AssessmentPaperSection[];
  statusIntent?: "draft" | "publish";
  opensAt?: string | null;
  closesAt?: string | null;
  timeLimitMinutes?: number | null;
  maxAttempts?: number | null;
  randomizeQuestionOrder: boolean;
  showAnswersImmediately: boolean;
  gradeWeight?: number | null;
};

export type TeacherOpsAssessmentCreateResult =
  | { status: "invalid" }
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "resource-not-found" }
  | { status: "created"; assessment: Assessment };

export type TeacherOpsAssessmentUpdateInput = {
  teacherId: string;
  assessmentId: string;
  title?: string;
  type?: AssessmentType;
  sourceType?: AssessmentSourceType;
  sourceResourceId?: string | null;
  questionIds?: string[];
  manualQuestions?: AssessmentManualQuestion[];
  paperSections?: AssessmentPaperSection[];
  statusIntent?: "draft" | "publish";
  opensAt?: string | null;
  closesAt?: string | null;
  timeLimitMinutes?: number | null;
  maxAttempts?: number | null;
  randomizeQuestionOrder?: boolean;
  showAnswersImmediately?: boolean;
  gradeWeight?: number | null;
};

export type TeacherOpsAssessmentUpdateResult =
  | { status: "invalid" }
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "locked" }
  | { status: "resource-not-found" }
  | { status: "updated"; assessment: Assessment };

export type TeacherOpsReviewLessonRemediationAssessmentResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "needs-review" }
  | { status: "created"; assessment: Assessment; reviewLesson: TeacherReviewLessonPlan };

export type TeacherOpsReviewLessonGenerateInput = {
  teacherId: string;
  assessmentId: string;
  language?: TeacherReviewLessonPlan["language"];
  durationMinutes?: number;
};

export type TeacherOpsReviewLessonGenerateResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "generated"; reviewLesson: TeacherReviewLessonPlan };

export type TeacherOpsReviewLessonUpdateInput = {
  teacherId: string;
  reviewLessonId: string;
  title?: string;
  status?: TeacherReviewLessonPlan["status"];
  objectives?: TeacherReviewLessonPlan["objectives"];
  timeline?: TeacherReviewLessonPlan["timeline"];
  items?: TeacherReviewLessonPlan["items"];
  slides?: TeacherReviewLessonPlan["slides"];
  boardColumns?: TeacherReviewLessonPlan["boardColumns"];
  variationQuestions?: TeacherReviewLessonPlan["variationQuestions"];
  remediationQuestions?: TeacherReviewLessonPlan["remediationQuestions"];
  individualGroups?: TeacherReviewLessonPlan["individualGroups"];
};

export type TeacherOpsReviewLessonUpdateResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "updated"; reviewLesson: TeacherReviewLessonPlan };

export type TeacherOpsReviewLessonParentDraftPublishInput = {
  teacherId: string;
  reviewLessonId: string;
};

export type TeacherOpsReviewLessonParentDraftPublishResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "needs-review" }
  | { status: "failed" }
  | { status: "published"; draft: ParentSafeTeacherDraft };

export type TeacherOpsReviewLessonExportFormat = "json" | "markdown" | "pptx";

export type TeacherOpsReviewLessonExportResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "ready"; bytes: Uint8Array; mimeType: string; fileName: string };

export type TeacherOpsAssessmentAnalysisSettingsInput = {
  teacherId: string;
  assessmentId: string;
  analysisSettings: Partial<AssessmentAnalysisSettings>;
  examGroupId?: string | null;
  examGroupName?: string | null;
};

export type TeacherOpsAssessmentAnalysisSettingsResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "updated"; assessment: Assessment };

export type TeacherOpsAssessmentSubmissionMarkingInput = {
  teacherId: string;
  assessmentId: string;
  submissionId: string;
  answers: Array<{
    questionId: string;
    pointsEarned?: number | null;
    isCorrect?: boolean | null;
    teacherFeedback?: string | null;
  }>;
};

export type TeacherOpsAssessmentSubmissionMarkingResult =
  | { status: "forbidden" }
  | { status: "not-found" }
  | { status: "updated"; submission: AssessmentSubmission; assessment: Assessment };

export type TeacherOpsAssessmentPersistenceStoreDependencies = {
  createId: () => string;
  now?: () => Date;
  safeExportFileName: (fileName: string) => string;
  buildReviewLessonDraft: (input: BuildTeacherReviewLessonDraftInput) => TeacherReviewLessonPlan;
  enrichReviewLessonPlan: (plan: TeacherReviewLessonPlan) => Promise<TeacherReviewLessonPlan>;
  renderReviewLessonMarkdown: (plan: TeacherReviewLessonPlan, language: TeacherReviewLessonPlan["language"]) => string;
  renderReviewLessonPptx: (plan: TeacherReviewLessonPlan) => Promise<Uint8Array>;
  readDatabase: () => Promise<TeacherOpsAssessmentPersistenceDatabase>;
  mutateDatabase: <Result>(
    mutator: (database: TeacherOpsAssessmentPersistenceDatabase) => Result | Promise<Result>
  ) => Promise<Result>;
};

export type TeacherOpsAssessmentPersistenceStore = ReturnType<typeof createTeacherOpsAssessmentPersistenceStore>;

const validAssessmentTypes = new Set<AssessmentType>(["quiz", "test", "mock-exam", "exam"]);
const validAssessmentSourceTypes = new Set<AssessmentSourceType>(["question-bank", "manual", "resource", "mistake-generated", "mixed"]);
const validAssessmentPaperItemSources = new Set<AssessmentPaperItemSource>(["question-bank", "manual", "ai-generated", "mistake"]);
const validTeacherReviewLessonStatuses = new Set<TeacherReviewLessonStatus>(["draft", "generated", "reviewed"]);
const validTeacherReviewLessonSources = new Set<TeacherReviewLessonSource>(["assessment", "frequent-mistakes"]);

export function isValidAssessmentType(type: unknown): type is AssessmentType {
  return validAssessmentTypes.has(type as AssessmentType);
}

export function normalizeAssessmentType(type: unknown, fallback: AssessmentType = "quiz"): AssessmentType {
  return isValidAssessmentType(type) ? type : fallback;
}

export function isValidAssessmentSourceType(sourceType: unknown): sourceType is AssessmentSourceType {
  return validAssessmentSourceTypes.has(sourceType as AssessmentSourceType);
}

export function normalizeAssessmentSourceType(
  sourceType: unknown,
  fallback: AssessmentSourceType = "question-bank"
): AssessmentSourceType {
  return isValidAssessmentSourceType(sourceType) ? sourceType : fallback;
}

export function normalizeAssessmentPaperItemSource(source: unknown): AssessmentPaperItemSource {
  return validAssessmentPaperItemSources.has(source as AssessmentPaperItemSource) ? source as AssessmentPaperItemSource : "question-bank";
}

export function isValidTeacherReviewLessonStatus(status: unknown): status is TeacherReviewLessonStatus {
  return validTeacherReviewLessonStatuses.has(status as TeacherReviewLessonStatus);
}

export function normalizeTeacherReviewLessonStatus(status: unknown): TeacherReviewLessonStatus {
  return isValidTeacherReviewLessonStatus(status) ? status : "draft";
}

export function normalizeTeacherReviewLessonSource(source: unknown): TeacherReviewLessonSource {
  return validTeacherReviewLessonSources.has(source as TeacherReviewLessonSource) ? source as TeacherReviewLessonSource : "assessment";
}

function cleanReviewLessonString(value: unknown, fallback = "", maxLength = 4000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeReviewLessonLocalizedText(value: unknown, fallback: LocalizedText): LocalizedText {
  if (typeof value === "string") {
    const text = cleanReviewLessonString(value, fallback.en);
    return { en: text, zh: text, zhHans: text };
  }

  const record = value as Partial<LocalizedText> | null;
  const en = cleanReviewLessonString(record?.en, fallback.en);
  const zh = cleanReviewLessonString(record?.zhHans ?? record?.zh, fallback.zh);
  return { en, zh, zhHans: zh };
}

export function normalizeTeacherOpsReviewLessonRecord(
  record: Partial<TeacherOpsReviewLessonRecord> & { id: string },
  now: string
): TeacherOpsReviewLessonRecord {
  const status = normalizeTeacherReviewLessonStatus(record.status);
  const source = normalizeTeacherReviewLessonSource(record.source);
  const title = normalizeReviewLessonLocalizedText(
    { en: record.title_en, zh: record.title_zh },
    { en: "Review lesson", zh: "讲评课" }
  );
  const sourceSnapshot = record.source_snapshot ?? {
    assessmentId: record.assessment_id,
    assessmentTitle: title,
    assessmentUpdatedAt: now,
    classId: record.class_id,
    className: record.class_id,
    submittedCount: 0,
    totalStudents: 0,
    questionCount: 0,
    generatedAt: now
  };

  return {
    ...record,
    teacher_id: cleanReviewLessonString(record.teacher_id, "system", 160),
    class_id: cleanReviewLessonString(record.class_id, "", 160),
    assessment_id: cleanReviewLessonString(record.assessment_id, sourceSnapshot.assessmentId, 160),
    title_en: title.en,
    title_zh: title.zhHans ?? title.zh,
    language: record.language === "en" || record.language === "zh" || record.language === "zh-Hans" ? record.language : "zh-Hans",
    duration_minutes: typeof record.duration_minutes === "number" && Number.isFinite(record.duration_minutes)
      ? Math.max(20, Math.min(90, Math.round(record.duration_minutes)))
      : 45,
    status,
    source,
    source_snapshot: {
      ...sourceSnapshot,
      assessmentId: sourceSnapshot.assessmentId ?? record.assessment_id ?? "",
      classId: sourceSnapshot.classId ?? record.class_id ?? "",
      className: sourceSnapshot.className ?? record.class_id ?? "",
      assessmentTitle: normalizeReviewLessonLocalizedText(sourceSnapshot.assessmentTitle, title),
      submittedCount: Math.max(0, Math.round(Number(sourceSnapshot.submittedCount) || 0)),
      totalStudents: Math.max(0, Math.round(Number(sourceSnapshot.totalStudents) || 0)),
      questionCount: Math.max(0, Math.round(Number(sourceSnapshot.questionCount) || 0)),
      generatedAt: sourceSnapshot.generatedAt ?? record.generated_at ?? now,
      assessmentUpdatedAt: sourceSnapshot.assessmentUpdatedAt ?? now
    },
    objectives: Array.isArray(record.objectives) ? record.objectives : [],
    timeline: Array.isArray(record.timeline) ? record.timeline : [],
    items: Array.isArray(record.items) ? record.items : [],
    slides: Array.isArray(record.slides) ? record.slides : [],
    board_columns: Array.isArray(record.board_columns) ? record.board_columns : [],
    variation_questions: Array.isArray(record.variation_questions) ? record.variation_questions : [],
    remediation_questions: Array.isArray(record.remediation_questions) ? record.remediation_questions : [],
    individual_groups: Array.isArray(record.individual_groups) ? record.individual_groups : [],
    generation_notes_en: cleanReviewLessonString(record.generation_notes_en, "Deterministic review lesson draft."),
    generation_notes_zh: cleanReviewLessonString(record.generation_notes_zh, "确定性讲评课草稿。"),
    remediation_assessment_id: cleanReviewLessonString(record.remediation_assessment_id, "", 160) || undefined,
    created_at: record.created_at ?? now,
    updated_at: record.updated_at ?? record.created_at ?? now,
    generated_at: record.generated_at ?? sourceSnapshot.generatedAt ?? now,
    reviewed_at: record.reviewed_at ?? null
  };
}

function canUseTeacherArea(user?: TeacherOpsAssessmentUserRecord | null): user is TeacherOpsAssessmentUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord
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

function teacherResourceRecordsFor(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord
) {
  return database.teaching_resources.filter((resource) => user.role === "admin" || resource.uploaded_by === user.id);
}

export function teacherAssessmentRecordsFor(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord
) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return database.assessments.filter((assessment) => classIds.has(assessment.class_id));
}

function teacherCanAccessClass(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord,
  classId: string
) {
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

function teacherCanMutateOperationsClass(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord,
  classId: string
) {
  return teacherCanAccessClass(database, user, classId);
}

function teacherStudentIdsForClass(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "class_enrollments">,
  classId: string
) {
  return (database.class_enrollments ?? [])
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

  function assessmentHasSubmittedSubmissions(database: TeacherOpsAssessmentPersistenceDatabase, assessmentId: string) {
    return database.assessment_submissions.some((submission) =>
      submission.assessment_id === assessmentId &&
      (submission.status === "submitted" || submission.status === "graded" || submission.status === "late")
    );
  }

export function teacherOpsAssessmentSubmittedCount(
  database: {
    assessment_submissions: Array<{
      assessment_id?: string;
      status?: string;
    }>;
  },
  assessmentId: string
) {
  return database.assessment_submissions.filter((submission) =>
    submission.assessment_id === assessmentId &&
    (submission.status === "submitted" || submission.status === "graded" || submission.status === "late")
  ).length;
}

export function toTeacherOpsAssessmentSubmission(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "student_profiles">,
  record: TeacherOpsAssessmentSubmissionRecord
): AssessmentSubmission {
  const studentId = record.student_id ?? "missing-student-id";
  const profile = database.student_profiles?.find((candidate) => candidate.user_id === studentId);

  return {
    id: record.id ?? "missing-submission-id",
    assessmentId: record.assessment_id,
    studentId,
    studentName: profile?.name ?? "Unknown student",
    status: record.status as AssessmentSubmissionStatus,
    attemptNumber: record.attempt_number ?? 0,
    score: record.score,
    maxScore: record.max_score,
    submittedAt: record.submitted_at ?? null,
    gradedAt: record.graded_at ?? null,
    answers: (record.answers ?? []).map((answer) => ({
      ...answer,
      teacherFeedback: answer.teacherFeedback ?? null
    })),
    updatedAt: record.updated_at ?? "missing-updated-at"
  };
}

export function teacherOpsAssessmentPaperSectionsForRecord(
  record: Pick<TeacherOpsAssessmentRecord, "question_ids" | "manual_questions" | "paper_sections">
): AssessmentPaperSection[] {
  const storedSections = (record.paper_sections ?? [])
    .map((section, sectionIndex) => {
      const title = normalizeAssessmentLocalizedText(
        section.title,
        sectionIndex === 0 ? "Questions" : `Section ${sectionIndex + 1}`
      );
      const instructions = section.instructions
        ? normalizeAssessmentLocalizedText(section.instructions, "")
        : undefined;
      const items = (section.items ?? [])
        .map((item, itemIndex) => {
          const source = normalizeAssessmentPaperItemSource(item.source);
          const points = typeof item.points === "number" && Number.isFinite(item.points) && item.points > 0
            ? Math.round(item.points)
            : 10;
          return {
            ...item,
            id: item.id || `paper-item-${sectionIndex + 1}-${itemIndex + 1}`,
            source,
            points,
            order: typeof item.order === "number" && Number.isFinite(item.order) ? item.order : itemIndex
          };
        })
        .filter((item) => Boolean(item.questionId || item.embeddedQuestion));
      return {
        id: section.id || `section-${sectionIndex + 1}`,
        title,
        instructions,
        order: typeof section.order === "number" && Number.isFinite(section.order) ? section.order : sectionIndex,
        items
      };
    })
    .filter((section) => section.items.length)
    .sort((a, b) => a.order - b.order);
  if (storedSections.length) return storedSections;

  const legacyQuestionIds = record.question_ids ?? [];
  const legacyManualQuestions = record.manual_questions ?? [];
  const total = legacyQuestionIds.length + legacyManualQuestions.length;
  if (!total) return [];
  const defaultQuestionPoints = Math.max(1, Math.round(100 / Math.max(1, total)));
  return [
    {
      id: "section-1",
      title: { en: "Questions", zh: "題目" },
      order: 0,
      items: [
        ...legacyQuestionIds.map((questionId, index) => ({
          id: questionId,
          source: "question-bank" as const,
          questionId,
          points: defaultQuestionPoints,
          order: index
        })),
        ...legacyManualQuestions.map((question, index) => ({
          id: question.id,
          source: "manual" as const,
          embeddedQuestion: {
            type: "manual" as const,
            prompt: question.prompt,
            answer: question.answer,
            explanation: { en: question.answer, zh: question.answer }
          },
          points: question.points,
          order: legacyQuestionIds.length + index
        }))
      ]
    }
  ];
}

export function teacherOpsAssessmentPaperItemsForRecord(
  assessment: Pick<TeacherOpsAssessmentRecord, "question_ids" | "manual_questions" | "paper_sections">
) {
  return teacherOpsAssessmentPaperSectionsForRecord(assessment)
    .flatMap((section) => section.items.map((item) => ({ section, item })))
    .sort((a, b) => a.section.order - b.section.order || a.item.order - b.item.order);
}

function teacherOpsAssessmentPaperItemQuestion(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions">,
  item: AssessmentPaperItem
) {
  return item.questionId ? database.questions.find((question) => question.id === item.questionId) ?? null : null;
}

function teacherOpsAssessmentPaperItemPrompt(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions">,
  item: AssessmentPaperItem
): LocalizedText {
  if (item.embeddedQuestion) return item.embeddedQuestion.prompt;
  const question = teacherOpsAssessmentPaperItemQuestion(database, item);
  return question ? { en: question.prompt_en, zh: question.prompt_zh } : { en: item.id, zh: item.id };
}

function teacherOpsAssessmentPaperItemCorrectAnswer(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions">,
  item: AssessmentPaperItem
) {
  if (item.embeddedQuestion) return item.embeddedQuestion.answer;
  return teacherOpsAssessmentPaperItemQuestion(database, item)?.answer ?? "";
}

function teacherOpsAssessmentPaperItemExplanation(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions">,
  item: AssessmentPaperItem
): LocalizedText | undefined {
  if (item.embeddedQuestion?.explanation) return item.embeddedQuestion.explanation;
  const question = teacherOpsAssessmentPaperItemQuestion(database, item);
  if (!question?.explanation_en && !question?.explanation_zh) return undefined;
  return {
    en: question.explanation_en ?? question.explanation_zh ?? "",
    zh: question.explanation_zh ?? question.explanation_en ?? ""
  };
}

function teacherOpsAssessmentPaperItemTopic(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions" | "topics">,
  item: AssessmentPaperItem
) {
  const question = teacherOpsAssessmentPaperItemQuestion(database, item);
  const topicId = item.embeddedQuestion?.topicId ?? question?.topic_id;
  const topicTitle = topicId
    ? database.topics
      .filter((topic) => topic.id === topicId)
      .map((topic) => ({ en: topic.title_en, zh: topic.title_zh }))[0] ?? { en: topicId, zh: topicId }
    : undefined;
  return { topicId, topicTitle };
}

export function teacherOpsAssessmentAnalysisItems(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "questions" | "topics">,
  assessment: Pick<TeacherOpsAssessmentRecord, "question_ids" | "manual_questions" | "paper_sections">
): TeacherAssessmentAnalysisItemInput[] {
  return teacherOpsAssessmentPaperItemsForRecord(assessment).map(({ section, item }) => {
    const { topicId, topicTitle } = teacherOpsAssessmentPaperItemTopic(database, item);
    const question = teacherOpsAssessmentPaperItemQuestion(database, item);
    return {
      questionId: item.id,
      prompt: teacherOpsAssessmentPaperItemPrompt(database, item),
      correctAnswer: teacherOpsAssessmentPaperItemCorrectAnswer(database, item),
      explanation: teacherOpsAssessmentPaperItemExplanation(database, item),
      sectionId: section.id,
      sectionTitle: section.title,
      topicId,
      topicTitle,
      questionType: item.embeddedQuestion?.type ?? question?.type,
      maxPoints: item.points
    };
  });
}

function teacherOpsAssessmentExamGroupId(assessment: Pick<TeacherOpsAssessmentRecord, "exam_group_id" | "id">) {
  return assessment.exam_group_id || assessment.id;
}

function teacherOpsAssessmentSubmissionPercentages(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "assessment_submissions">,
  assessmentId: string
) {
  return database.assessment_submissions
    .filter((submission) => submission.assessment_id === assessmentId && submission.score !== null && submission.max_score > 0)
    .map((submission) => Math.round(((submission.score ?? 0) / submission.max_score) * 100));
}

export function teacherOpsAssessmentGradeComparisonCohorts(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "assessments" | "assessment_submissions" | "class_enrollments" | "teacher_classes">,
  assessment: TeacherOpsAssessmentRecord,
  teacherClass: TeacherOpsAssessmentClassRecord
): TeacherAssessmentGradeComparisonCohortInput[] {
  const currentExamGroupId = teacherOpsAssessmentExamGroupId(assessment);
  const candidates = database.assessments.filter((candidate) => {
    const candidateClass = database.teacher_classes.find((teacherClassRecord) => teacherClassRecord.id === candidate.class_id);
    if (!candidateClass) return false;
    if (teacherOpsAssessmentExamGroupId(candidate) !== currentExamGroupId) return false;
    if (candidateClass.grade !== teacherClass.grade || candidateClass.academic_year !== teacherClass.academic_year) return false;
    if (!teacherClass.school_id) return candidate.id === assessment.id;
    return candidateClass.school_id === teacherClass.school_id;
  });

  return candidates.map((candidate) => {
    const candidateClass = database.teacher_classes.find((teacherClassRecord) => teacherClassRecord.id === candidate.class_id) ?? teacherClass;
    return {
      classId: candidateClass.id,
      className: candidateClass.name,
      assessmentId: candidate.id,
      studentCount: teacherStudentIdsForClass(database, candidateClass.id).length,
      scorePercentages: teacherOpsAssessmentSubmissionPercentages(database, candidate.id)
    };
  });
}

function isCompletedAssessmentSubmission(submission: Pick<AssessmentSubmission, "status">) {
  return submission.status === "submitted" || submission.status === "graded" || submission.status === "late";
}

function assessmentAnswerIsWrong(answer: AssessmentSubmissionAnswer | undefined) {
  if (!answer) return false;
  if (answer.isCorrect === false) return true;
  return answer.pointsEarned !== null && answer.maxPoints > 0 && answer.pointsEarned < answer.maxPoints;
}

function reviewLessonWrongStats(submissions: AssessmentSubmission[], questionId: string) {
  const wrongStudentIds: string[] = [];
  const wrongStudentNames: string[] = [];
  const wrongCounts = new Map<string, number>();

  submissions.filter(isCompletedAssessmentSubmission).forEach((submission) => {
    const answer = submission.answers.find((candidate) => candidate.questionId === questionId);
    if (!assessmentAnswerIsWrong(answer)) return;
    wrongStudentIds.push(submission.studentId);
    wrongStudentNames.push(submission.studentName);
    const wrongAnswer = answer?.answer.trim();
    if (wrongAnswer) wrongCounts.set(wrongAnswer, (wrongCounts.get(wrongAnswer) ?? 0) + 1);
  });

  return {
    wrongStudentIds,
    wrongStudentNames,
    wrongCounts
  };
}

export function teacherOpsAssessmentReviewLessonAnalytics(
  submissions: AssessmentSubmission[],
  questionAnalytics: TeacherAssessmentDetailData["questionAnalytics"]
): TeacherReviewLessonAnalyticsInput[] {
  return questionAnalytics.map((question) => {
    const wrongStats = reviewLessonWrongStats(submissions, question.questionId);
    const commonWrongAnswerCount = question.commonWrongAnswer
      ? wrongStats.wrongCounts.get(question.commonWrongAnswer) ?? 0
      : Array.from(wrongStats.wrongCounts.values()).sort((a, b) => b - a)[0] ?? 0;
    return {
      ...question,
      wrongStudentIds: wrongStats.wrongStudentIds,
      wrongStudentNames: wrongStats.wrongStudentNames,
      commonWrongAnswerCount
    };
  });
}

export function teacherOpsReviewLessonPracticeBank(
  database: TeacherOpsAssessmentPersistenceDatabase,
  teacherClass: TeacherOpsAssessmentClassRecord,
  analytics: TeacherReviewLessonAnalyticsInput[]
): TeacherReviewLessonPracticeBankInput[] {
  const topicIds = new Set(analytics.map((item) => item.topicId).filter((topicId): topicId is string => Boolean(topicId)));
  return database.questions
    .filter((question) =>
      !isRetiredHongKongQuestionId(question.id) &&
      question.grade === teacherClass.grade &&
      questionMatchesClassCurriculum(database, question, teacherClass) &&
      (!topicIds.size || topicIds.has(question.topic_id))
    )
    .sort((a, b) => a.topic_id.localeCompare(b.topic_id) || a.difficulty.localeCompare(b.difficulty) || a.id.localeCompare(b.id))
    .slice(0, 60)
    .map((question) => ({
      questionId: question.id,
      prompt: { en: question.prompt_en, zh: question.prompt_zh, zhHans: question.prompt_zh },
      answer: question.answer ?? "",
      explanation: { en: question.explanation_en ?? "", zh: question.explanation_zh ?? "", zhHans: question.explanation_zh ?? "" },
      topicId: question.topic_id,
      difficulty: question.difficulty
    }));
}

export function teacherOpsReviewLessonRecordFor(
  database: TeacherOpsAssessmentPersistenceDatabase,
  user: TeacherOpsAssessmentUserRecord,
  reviewLessonId: string
) {
  const record = (database.teacher_review_lessons ?? []).find((candidate) => candidate.id === reviewLessonId);
  if (!record) return null;
  return teacherCanAccessClass(database, user, record.class_id) ? record : null;
}

export function toTeacherOpsAssessment(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "assessment_submissions">,
  record: TeacherOpsAssessmentRecord
): Assessment {
  return {
    id: record.id,
    classId: record.class_id,
    title: {
      en: record.title_en,
      zh: record.title_zh ?? record.title_en
    },
    type: record.type ?? "quiz",
    status: record.status,
    sourceType: record.source_type ?? "question-bank",
    sourceResourceId: record.source_resource_id,
    analysisSettings: normalizeAssessmentAnalysisSettings(record.analysis_settings),
    examGroupId: record.exam_group_id ?? record.id,
    examGroupName: {
      en: record.exam_group_name_en ?? record.title_en,
      zh: record.exam_group_name_zh ?? record.title_zh ?? record.title_en
    },
    questionIds: record.question_ids ?? [],
    manualQuestions: record.manual_questions ?? [],
    paperSections: teacherOpsAssessmentPaperSectionsForRecord(record),
    opensAt: record.opens_at ?? null,
    closesAt: record.closes_at ?? null,
    timeLimitMinutes: record.time_limit_minutes ?? null,
    maxAttempts: record.max_attempts ?? 1,
    randomizeQuestionOrder: record.randomize_question_order ?? false,
    showAnswersImmediately: record.show_answers_immediately ?? true,
    gradeWeight: record.grade_weight ?? 1,
    createdBy: record.created_by ?? "",
    createdAt: record.created_at ?? record.updated_at,
    updatedAt: record.updated_at,
    submissionCount: database.assessment_submissions.filter((submission) => submission.assessment_id === record.id).length,
    submittedCount: teacherOpsAssessmentSubmittedCount(database, record.id)
  };
}

export function teacherOpsReviewLessonSnapshotIsStale(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "assessments" | "assessment_submissions">,
  record: TeacherOpsReviewLessonRecord
) {
  const assessment = database.assessments.find((candidate) => candidate.id === record.assessment_id);
  if (!assessment) return true;
  return (
    assessment.updated_at !== record.source_snapshot.assessmentUpdatedAt ||
    teacherOpsAssessmentSubmittedCount(database, assessment.id) !== record.source_snapshot.submittedCount
  );
}

export function toTeacherOpsReviewLesson(
  database: Pick<TeacherOpsAssessmentPersistenceDatabase, "assessments" | "assessment_submissions" | "teacher_classes">,
  record: TeacherOpsReviewLessonRecord
): TeacherReviewLessonPlan {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === record.class_id);
  return {
    id: record.id,
    teacherId: record.teacher_id,
    classId: record.class_id,
    className: teacherClass?.name ?? record.source_snapshot.className ?? record.class_id,
    assessmentId: record.assessment_id,
    title: {
      en: record.title_en,
      zh: record.title_zh,
      zhHans: record.title_zh
    },
    language: record.language,
    durationMinutes: record.duration_minutes,
    status: record.status,
    source: record.source,
    sourceSnapshot: record.source_snapshot,
    sourceSnapshotStale: teacherOpsReviewLessonSnapshotIsStale(database, record),
    objectives: record.objectives,
    timeline: record.timeline,
    items: record.items,
    slides: record.slides,
    boardColumns: record.board_columns,
    variationQuestions: record.variation_questions,
    remediationQuestions: record.remediation_questions,
    individualGroups: record.individual_groups,
    generationNotes: {
      en: record.generation_notes_en,
      zh: record.generation_notes_zh,
      zhHans: record.generation_notes_zh
    },
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    generatedAt: record.generated_at,
    reviewedAt: record.reviewed_at,
    remediationAssessmentId: record.remediation_assessment_id
  };
}

export function teacherOpsReviewLessonToRecord(plan: TeacherReviewLessonPlan): TeacherOpsReviewLessonRecord {
  return {
    id: plan.id,
    teacher_id: plan.teacherId,
    class_id: plan.classId,
    assessment_id: plan.assessmentId,
    title_en: plan.title.en,
    title_zh: plan.title.zhHans ?? plan.title.zh,
    language: plan.language,
    duration_minutes: plan.durationMinutes,
    status: plan.status,
    source: plan.source,
    source_snapshot: plan.sourceSnapshot,
    objectives: plan.objectives,
    timeline: plan.timeline,
    items: plan.items,
    slides: plan.slides,
    board_columns: plan.boardColumns,
    variation_questions: plan.variationQuestions,
    remediation_questions: plan.remediationQuestions,
    individual_groups: plan.individualGroups,
    generation_notes_en: plan.generationNotes.en,
    generation_notes_zh: plan.generationNotes.zhHans ?? plan.generationNotes.zh,
    remediation_assessment_id: plan.remediationAssessmentId,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
    generated_at: plan.generatedAt,
    reviewed_at: plan.reviewedAt
  };
}

function normalizeManualQuestions(value: AssessmentManualQuestion[] | undefined): AssessmentManualQuestion[] {
  return (value ?? [])
    .map((question, index) => {
      const promptEn = question.prompt?.en?.trim() ?? "";
      const promptZh = question.prompt?.zh?.trim() || promptEn;
      const answer = question.answer?.trim() ?? "";
      const points = Number.isFinite(question.points) && question.points > 0 ? Math.round(question.points) : 10;
      if (!promptEn || !answer) return null;
      return {
        id: question.id || `manual-${index + 1}`,
        prompt: { en: promptEn, zh: promptZh },
        answer,
        points
      };
    })
    .filter((question): question is AssessmentManualQuestion => Boolean(question));
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || typeof value === "undefined" ? "" : String(value);
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function createTeacherOpsAssessmentPersistenceStore({
  createId,
  now = () => new Date(),
  safeExportFileName,
  buildReviewLessonDraft,
  enrichReviewLessonPlan,
  renderReviewLessonMarkdown,
  renderReviewLessonPptx,
  readDatabase,
  mutateDatabase
}: TeacherOpsAssessmentPersistenceStoreDependencies) {
  function normalizeEmbeddedQuestion(value: unknown): AssessmentEmbeddedQuestion | null {
    const input = value as Partial<AssessmentEmbeddedQuestion> | null;
    const prompt = normalizeAssessmentLocalizedText(input?.prompt, "");
    const answer = typeof input?.answer === "string" ? input.answer.trim().slice(0, 1000) : "";
    if (!prompt.en || !answer) return null;
    const type = normalizeAssessmentQuestionType(input?.type);
    const options = Array.isArray(input?.options)
      ? input.options.map((option) => normalizeAssessmentLocalizedText(option, "")).filter((option) => option.en)
      : undefined;
    const acceptedAnswers = Array.isArray(input?.acceptedAnswers)
      ? input.acceptedAnswers
        .filter((candidate): candidate is string => typeof candidate === "string" && candidate.trim().length > 0)
        .map((candidate) => candidate.trim().slice(0, 1000))
      : undefined;
    const difficulty = isActiveDifficulty(input?.difficulty) ? input.difficulty : undefined;
    const diagram = input?.diagram ? normalizeQuestionDiagram(input.diagram) : undefined;
    return {
      type,
      prompt,
      options: options?.length ? options : undefined,
      answer,
      acceptedAnswers,
      explanation: input?.explanation ? normalizeAssessmentLocalizedText(input.explanation, answer) : { en: answer, zh: answer },
      topicId: typeof input?.topicId === "string" && input.topicId.trim() ? input.topicId.trim().slice(0, 120) : undefined,
      difficulty,
      diagram
    };
  }

  function isValidAssessmentQuestionForClass(
    database: TeacherOpsAssessmentPersistenceDatabase,
    assessmentClass: TeacherOpsAssessmentClassRecord,
    questionId: string
  ) {
    if (isRetiredHongKongQuestionId(questionId)) return false;
    const question = database.questions.find((candidate) => candidate.id === questionId);
    return Boolean(question && question.grade === assessmentClass.grade && questionMatchesClassCurriculum(database, question, assessmentClass));
  }

  function assessmentAuthoringInputReferencesRetiredQuestion(
    questionIds: string[] | undefined,
    paperSections: AssessmentPaperSection[] | undefined
  ) {
    return (questionIds ?? []).some((questionId) => isRetiredHongKongQuestionId(questionId.trim())) ||
      (paperSections ?? []).some((section) => section.items.some((item) => (
        typeof item.questionId === "string" && isRetiredHongKongQuestionId(item.questionId.trim())
      )));
  }

  function normalizePaperSectionsInput(
    database: TeacherOpsAssessmentPersistenceDatabase,
    assessmentClass: TeacherOpsAssessmentClassRecord,
    value: AssessmentPaperSection[] | undefined
  ): AssessmentPaperSection[] {
    return (value ?? [])
      .map((section, sectionIndex) => {
        const items = (section.items ?? [])
          .map((item, itemIndex): AssessmentPaperItem | null => {
            const source = normalizeAssessmentPaperItemSource(item.source);
            const points = typeof item.points === "number" && Number.isFinite(item.points) && item.points > 0
              ? Math.round(item.points)
              : 10;
            const id = item.id && typeof item.id === "string" ? item.id.trim().slice(0, 120) : `paper-item-${createId()}`;
            if ((source === "question-bank" || source === "mistake") && item.questionId) {
              if (!isValidAssessmentQuestionForClass(database, assessmentClass, item.questionId)) return null;
              return {
                id,
                source,
                questionId: item.questionId,
                points,
                order: typeof item.order === "number" && Number.isFinite(item.order) ? item.order : itemIndex
              };
            }
            const embeddedQuestion = normalizeEmbeddedQuestion(item.embeddedQuestion);
            if (!embeddedQuestion) return null;
            return {
              id,
              source: source === "ai-generated" ? "ai-generated" : "manual",
              embeddedQuestion,
              points,
              order: typeof item.order === "number" && Number.isFinite(item.order) ? item.order : itemIndex
            };
          })
          .filter((item): item is AssessmentPaperItem => Boolean(item));
        return {
          id: section.id || `section-${sectionIndex + 1}`,
          title: normalizeAssessmentLocalizedText(section.title, sectionIndex === 0 ? "Questions" : `Section ${sectionIndex + 1}`),
          instructions: section.instructions ? normalizeAssessmentLocalizedText(section.instructions, "") : undefined,
          order: typeof section.order === "number" && Number.isFinite(section.order) ? section.order : sectionIndex,
          items
        };
      })
      .filter((section) => section.items.length)
      .sort((a, b) => a.order - b.order);
  }

  function studentClassIds(database: TeacherOpsAssessmentPersistenceDatabase, userId: string) {
    return new Set(
      (database.class_enrollments ?? [])
        .filter((enrollment) => enrollment.student_id === userId)
        .map((enrollment) => enrollment.class_id)
    );
  }

  function completeAssessmentAssignmentSubmission({
    database,
    userId,
    assignment,
    now,
    score,
    graded,
    feedbackEn,
    feedbackZh
  }: {
    database: TeacherOpsAssessmentPersistenceDatabase;
    userId: string;
    assignment: TeacherOpsAssessmentAssignmentRecord;
    now: string;
    score?: number | null;
    graded?: boolean;
    feedbackEn: string;
    feedbackZh: string;
  }) {
    if (!assignment.id) return;
    const submission = (database.submissions ?? []).find(
      (candidate) => candidate.assignment_id === assignment.id && candidate.student_id === userId
    );
    if (!submission) return;

    const nextScore = typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : score;
    submission.status = graded ? "graded" : "submitted";
    submission.score = typeof nextScore === "number" || nextScore === null ? nextScore : submission.score;
    submission.submitted_at = submission.submitted_at ?? now;
    submission.graded_at = graded ? now : submission.graded_at;
    submission.feedback_en = feedbackEn;
    submission.feedback_zh = feedbackZh;
    submission.updated_at = now;
  }

  function completeMatchingAssessmentAssignments({
    database,
    userId,
    targetIds,
    now,
    score,
    graded,
    feedbackEn,
    feedbackZh
  }: {
    database: TeacherOpsAssessmentPersistenceDatabase;
    userId: string;
    targetIds: string[];
    now: string;
    score?: number | null;
    graded?: boolean;
    feedbackEn: string;
    feedbackZh: string;
  }) {
    const classIds = studentClassIds(database, userId);
    if (!classIds.size) return;
    const targetSet = new Set(targetIds.filter(Boolean));

    (database.assignments ?? [])
      .filter((assignment) => {
        if (!assignment.class_id || !classIds.has(assignment.class_id) || assignment.content_type !== "assessment" || assignment.status !== "active") {
          return false;
        }
        return !assignment.target_id || targetSet.has(assignment.target_id);
      })
      .forEach((assignment) => {
        completeAssessmentAssignmentSubmission({
          database,
          userId,
          assignment,
          now,
          score,
          graded,
          feedbackEn,
          feedbackZh
        });
      });
  }

  function topicOptionForRecord(record: TeacherOpsAssessmentTopicRecord) {
    const curriculumProfile = normalizeStoredCurriculumProfile({
      curriculumTrack: record.curriculum_track,
      region: record.curriculum_region,
      publisher: record.textbook_publisher
    });
    return {
      id: record.id,
      grade: record.grade,
      title: {
        en: record.title_en,
        zh: record.title_zh
      },
      curriculumProfile,
      publisher: curriculumProfile.publisher
    };
  }

  function questionOptionForRecord(
    database: TeacherOpsAssessmentPersistenceDatabase,
    question: TeacherOpsAssessmentQuestionRecord
  ): TeacherAssessmentQuestionOption {
    const topic = database.topics.find((candidate) => candidate.id === question.topic_id);
    return {
      id: question.id,
      grade: question.grade,
      topicId: question.topic_id,
      topicTitle: topic
        ? { en: topic.title_en, zh: topic.title_zh }
        : { en: question.topic_id, zh: question.topic_id },
      difficulty: question.difficulty,
      type: question.type,
      prompt: {
        en: question.prompt_en,
        zh: question.prompt_zh
      }
    };
  }

  function questionSearchTextForRecord(
    database: TeacherOpsAssessmentPersistenceDatabase,
    question: TeacherOpsAssessmentQuestionRecord
  ) {
    const topicTitle = questionOptionForRecord(database, question).topicTitle;
    return `${question.prompt_en} ${question.prompt_zh} ${topicTitle.en} ${topicTitle.zh}`;
  }

  function assessmentQuestionIdsForSource(
    database: TeacherOpsAssessmentPersistenceDatabase,
    assessmentClass: TeacherOpsAssessmentClassRecord,
    sourceType: AssessmentSourceType,
    questionIds: string[],
    sourceResource?: TeacherOpsAssessmentResourceRecord | null
  ) {
    if (sourceType === "question-bank") {
      const selectedIds = questionIds.filter((questionId) => isValidAssessmentQuestionForClass(database, assessmentClass, questionId));
      if (selectedIds.length) return selectedIds;
    }

    if (sourceType === "mistake-generated") {
      const studentIds = new Set(teacherStudentIdsForClass(database, assessmentClass.id));
      const mistakeQuestionIds = (database.mistakes ?? [])
        .filter((mistake) => studentIds.has(mistake.user_id) && !mistake.mastered)
        .map((mistake) => mistake.question_id)
        .filter((questionId) => isValidAssessmentQuestionForClass(database, assessmentClass, questionId))
        .filter((questionId, index, all) => all.indexOf(questionId) === index);
      if (mistakeQuestionIds.length) return mistakeQuestionIds.slice(0, 8);
    }

    if (sourceType === "resource" && sourceResource?.topic_id) {
      const resourceTopicQuestions = database.questions
        .filter((question) => (
          !isRetiredHongKongQuestionId(question.id) &&
          question.grade === assessmentClass.grade &&
          question.topic_id === sourceResource.topic_id &&
          questionMatchesClassCurriculum(database, question, assessmentClass)
        ))
        .map((question) => question.id);
      if (resourceTopicQuestions.length) return resourceTopicQuestions.slice(0, 8);
    }

    return database.questions
      .filter((question) => (
        !isRetiredHongKongQuestionId(question.id) &&
        question.grade === assessmentClass.grade &&
        questionMatchesClassCurriculum(database, question, assessmentClass)
      ))
      .slice(0, 5)
      .map((question) => question.id);
  }

  function ensureAssessmentSubmissions(
    database: TeacherOpsAssessmentPersistenceDatabase,
    assessment: TeacherOpsAssessmentRecord,
    nowIso: string
  ) {
    const existingStudentIds = new Set(database.assessment_submissions
      .filter((submission) => submission.assessment_id === assessment.id)
      .map((submission) => submission.student_id));
    teacherStudentIdsForClass(database, assessment.class_id).forEach((studentId) => {
      if (existingStudentIds.has(studentId)) return;
      database.assessment_submissions.push({
        id: `assessment-submission-${createId()}`,
        assessment_id: assessment.id,
        student_id: studentId,
        status: "not-started" satisfies AssessmentSubmissionStatus,
        attempt_number: 0,
        score: null,
        max_score: 100,
        submitted_at: null,
        graded_at: null,
        answers: [],
        updated_at: nowIso
      });
    });
  }

  async function getTeacherAssessmentDetailData(
    userId: string,
    assessmentId: string
  ): Promise<TeacherAssessmentDetailData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
    const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
    if (!assessment || !teacherClass) return null;

    const submissions = database.assessment_submissions
      .filter((submission) => submission.assessment_id === assessmentId)
      .map((submission) => toTeacherOpsAssessmentSubmission(database, submission))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
    const totalStudents = Math.max(submissions.length, teacherStudentIdsForClass(database, teacherClass.id).length);
    const analysis = buildTeacherAssessmentAnalysis({
      settings: normalizeAssessmentAnalysisSettings(assessment.analysis_settings),
      submissions,
      items: teacherOpsAssessmentAnalysisItems(database, assessment),
      totalStudents,
      gradeComparisonCohorts: teacherOpsAssessmentGradeComparisonCohorts(database, assessment, teacherClass),
      currentClassId: teacherClass.id,
      currentAssessmentId: assessment.id
    });
    const questionAnalytics = analysis.itemAnalysis;

    return {
      assessment: toTeacherOpsAssessment(database, assessment),
      class: toTeacherClass(database, teacherClass),
      sourceResource: assessment.source_resource_id
        ? database.teaching_resources
          .filter((resource) => resource.id === assessment.source_resource_id)
          .map((resource) => toTeachingResource(database, resource))[0] ?? null
        : null,
      submissions,
      averageScore: analysis.summary.averageScore,
      submittedCount: submissions.filter((submission) => (
        submission.status === "submitted" || submission.status === "graded" || submission.status === "late"
      )).length,
      scoreDistribution: analysis.scoreBands,
      questionAnalytics,
      commonWrongQuestions: questionAnalytics
        .filter((question) => question.totalResponses > 0 && question.correctRate !== null)
        .sort((a, b) => (a.correctRate ?? 100) - (b.correctRate ?? 100))
        .slice(0, 5),
      analysis
    };
  }

  function teacherDisplayName(database: TeacherOpsAssessmentPersistenceDatabase, teacherId: string) {
    const user = database.users.find((candidate) => candidate.id === teacherId);
    return user?.username ?? "Teacher";
  }

  function parentSafeDraftForReviewLesson(
    database: TeacherOpsAssessmentPersistenceDatabase,
    reviewLessonId: string
  ): ParentSafeTeacherDraft | null {
    return (database.teacher_notices ?? [])
      .filter((notice) => notice.source_kind === "teacher-review-lesson" && notice.source_id === reviewLessonId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map((notice): ParentSafeTeacherDraft | null => {
        const reviewLesson = (database.teacher_review_lessons ?? []).find((candidate) => candidate.id === notice.source_id);
        if (!reviewLesson) return null;
        const teacherClass = database.teacher_classes.find((candidate) => candidate.id === notice.class_id);
        const recipients = (database.teacher_notice_recipients ?? []).filter((recipient) => recipient.notice_id === notice.id);
        const acknowledged = recipients.filter((recipient) => recipient.status === "acknowledged").length;

        return {
          id: `parent-safe-draft-${notice.id}`,
          noticeId: notice.id,
          sourceReviewLessonId: reviewLesson.id,
          classId: notice.class_id,
          className: teacherClass?.name ?? notice.class_id,
          teacherId: notice.teacher_id,
          teacherName: teacherDisplayName(database, notice.teacher_id),
          title: { en: notice.subject_en, zh: notice.subject_zh },
          summary: { en: notice.body_en, zh: notice.body_zh },
          status: notice.status,
          publishedAt: notice.sent_at ?? notice.updated_at,
          acknowledgement: {
            total: recipients.length,
            acknowledged,
            pending: Math.max(0, recipients.length - acknowledged)
          }
        };
      })
      .find((draft): draft is ParentSafeTeacherDraft => Boolean(draft)) ?? null;
  }

  function noticeRecipientRecordsForClass({
    database,
    classId,
    noticeId,
    now
  }: {
    database: TeacherOpsAssessmentPersistenceDatabase;
    classId: string;
    noticeId: string;
    now: string;
  }) {
    return (database.class_enrollments ?? [])
      .filter((enrollment) => enrollment.class_id === classId)
      .flatMap((enrollment): TeacherOpsNoticeRecipientRecord[] => {
        const activeGuardians = (database.guardian_links ?? []).filter(
          (link) => link.student_id === enrollment.student_id && link.status === "active"
        );
        if (activeGuardians.length) {
          return activeGuardians.map((guardian) => ({
            id: `notice-recipient-${createId()}`,
            notice_id: noticeId,
            student_id: enrollment.student_id,
            guardian_id: guardian.parent_id,
            status: "pending",
            acknowledged_at: null,
            created_at: now
          }));
        }

        return [{
          id: `notice-recipient-${createId()}`,
          notice_id: noticeId,
          student_id: enrollment.student_id,
          status: "pending",
          acknowledged_at: null,
          created_at: now
        }];
      });
  }

  function parentSafeReviewLessonNoticeCopy(record: TeacherOpsReviewLessonRecord) {
    const mustTeachCount = record.items.filter((item) => item.category === "must-teach").length;
    const reviewedPracticeCount = record.remediation_questions.filter((question) => question.validationStatus === "validated").length;
    const assessmentTitleEn = record.source_snapshot.assessmentTitle.en;
    const assessmentTitleZh = record.source_snapshot.assessmentTitle.zhHans ?? record.source_snapshot.assessmentTitle.zh;
    const objectiveEn = record.objectives.slice(0, 3).map((objective) => objective.en).filter(Boolean).join("; ");
    const objectiveZh = record.objectives.slice(0, 3).map((objective) => objective.zhHans ?? objective.zh).filter(Boolean).join("；");

    return {
      subject: `Teacher-approved review: ${record.title_en} / 教師已審核講評：${record.title_zh}`,
      body: [
        `English: The teacher has approved a class-level review lesson for ${assessmentTitleEn}.`,
        objectiveEn ? `Focus: ${objectiveEn}.` : "",
        `The plan includes ${mustTeachCount} class discussion focus item(s) and ${reviewedPracticeCount} reviewed follow-up practice task(s).`,
        "This parent copy does not include individual student names, rankings, wrong-answer rosters, or teacher-only notes.",
        "",
        `中文：老師已審核 ${assessmentTitleZh} 的班級講評方案。`,
        objectiveZh ? `重點：${objectiveZh}。` : "",
        `方案包含 ${mustTeachCount} 個班級講評重點，以及 ${reviewedPracticeCount} 個已審核的課後跟進練習。`,
        "此家長版本不包含個別學生姓名、排名、錯答名單或教師私人備註。"
      ].filter(Boolean).join("\n")
    };
  }

  function createParentSafeDraftNoticeRecord({
    database,
    teacher,
    teacherClass,
    reviewLesson,
    nowIso
  }: {
    database: TeacherOpsAssessmentPersistenceDatabase;
    teacher: TeacherOpsAssessmentUserRecord;
    teacherClass: TeacherOpsAssessmentClassRecord;
    reviewLesson: TeacherOpsReviewLessonRecord;
    nowIso: string;
  }) {
    const copy = parentSafeReviewLessonNoticeCopy(reviewLesson);
    const notice: TeacherOpsNoticeRecord = {
      id: `notice-${createId()}`,
      teacher_id: teacher.id,
      class_id: teacherClass.id,
      audience: "parents",
      channel_id: "manual-wecom",
      channel_name: "Manual / unconfigured WeCom group",
      subject_en: copy.subject,
      subject_zh: copy.subject,
      body_en: copy.body,
      body_zh: copy.body,
      status: "queued",
      source_kind: "teacher-review-lesson",
      source_id: reviewLesson.id,
      due_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      sent_at: nowIso
    };
    const notices = database.teacher_notices ?? (database.teacher_notices = []);
    const recipients = database.teacher_notice_recipients ?? (database.teacher_notice_recipients = []);
    notices.unshift(notice);
    recipients.push(...noticeRecipientRecordsForClass({
      database,
      classId: teacherClass.id,
      noticeId: notice.id,
      now: nowIso
    }));
    return notice;
  }

  async function generateTeacherReviewLessonPlan({
    teacherId,
    assessmentId,
    language = "zh-Hans",
    durationMinutes = 45
  }: TeacherOpsReviewLessonGenerateInput): Promise<TeacherOpsReviewLessonGenerateResult> {
    const result = await mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
      const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
      const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
      if (!assessment || !teacherClass) return { status: "not-found" as const };

      const submissions = database.assessment_submissions
        .filter((submission) => submission.assessment_id === assessment.id)
        .map((submission) => toTeacherOpsAssessmentSubmission(database, submission))
        .sort((a, b) => a.studentName.localeCompare(b.studentName));
      const totalStudents = Math.max(submissions.length, teacherStudentIdsForClass(database, teacherClass.id).length);
      const analysis = buildTeacherAssessmentAnalysis({
        settings: normalizeAssessmentAnalysisSettings(assessment.analysis_settings),
        submissions,
        items: teacherOpsAssessmentAnalysisItems(database, assessment),
        totalStudents,
        gradeComparisonCohorts: teacherOpsAssessmentGradeComparisonCohorts(database, assessment, teacherClass),
        currentClassId: teacherClass.id,
        currentAssessmentId: assessment.id
      });
      const reviewAnalytics = teacherOpsAssessmentReviewLessonAnalytics(submissions, analysis.itemAnalysis);
      const nowIso = now().toISOString();
      const plan = buildReviewLessonDraft({
        id: `review-lesson-${createId()}`,
        teacherId: user.id,
        classId: teacherClass.id,
        className: teacherClass.name,
        assessmentId: assessment.id,
        assessmentTitle: { en: assessment.title_en, zh: assessment.title_zh ?? assessment.title_en, zhHans: assessment.title_zh ?? assessment.title_en },
        assessmentUpdatedAt: assessment.updated_at,
        language,
        durationMinutes,
        now: nowIso,
        submittedCount: submissions.filter(isCompletedAssessmentSubmission).length,
        totalStudents,
        analytics: reviewAnalytics,
        practiceBank: teacherOpsReviewLessonPracticeBank(database, teacherClass, reviewAnalytics)
      });
      const record = teacherOpsReviewLessonToRecord(plan);
      const reviewLessons = database.teacher_review_lessons ?? (database.teacher_review_lessons = []);
      reviewLessons.unshift(record);
      return { status: "generated" as const, reviewLesson: toTeacherOpsReviewLesson(database, record) };
    });

    if (result.status !== "generated") return result;
    const enrichedPlan = await enrichReviewLessonPlan(result.reviewLesson);
    if (enrichedPlan === result.reviewLesson) return result;

    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return result;
      const record = teacherOpsReviewLessonRecordFor(database, user, enrichedPlan.id);
      const reviewLessons = database.teacher_review_lessons ?? [];
      const index = record ? reviewLessons.findIndex((candidate) => candidate.id === record.id) : -1;
      if (!record || index < 0) return result;

      const nextPlan: TeacherReviewLessonPlan = {
        ...enrichedPlan,
        updatedAt: now().toISOString()
      };
      reviewLessons[index] = {
        ...teacherOpsReviewLessonToRecord(nextPlan),
        remediation_assessment_id: record.remediation_assessment_id,
        created_at: record.created_at,
        generated_at: record.generated_at,
        reviewed_at: record.reviewed_at
      };
      return {
        status: "generated" as const,
        reviewLesson: toTeacherOpsReviewLesson(database, reviewLessons[index])
      };
    });
  }

  async function getTeacherReviewLessonDetailData(
    userId: string,
    reviewLessonId: string
  ): Promise<TeacherReviewLessonDetailData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;
    const record = teacherOpsReviewLessonRecordFor(database, user, reviewLessonId);
    const assessment = record ? database.assessments.find((candidate) => candidate.id === record.assessment_id) : null;
    const teacherClass = record ? teacherCanAccessClass(database, user, record.class_id) : null;
    if (!record || !assessment || !teacherClass) return null;
    return {
      reviewLesson: toTeacherOpsReviewLesson(database, record),
      assessment: toTeacherOpsAssessment(database, assessment),
      class: toTeacherClass(database, teacherClass),
      parentSafeDraft: parentSafeDraftForReviewLesson(database, record.id)
    };
  }

  async function getTeacherReviewLessonExportData(
    userId: string,
    reviewLessonId: string,
    format: TeacherOpsReviewLessonExportFormat
  ): Promise<TeacherOpsReviewLessonExportResult> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
    const record = teacherOpsReviewLessonRecordFor(database, user, reviewLessonId);
    if (!record) return { status: "not-found" as const };
    const plan = toTeacherOpsReviewLesson(database, record);
    const safeName = safeExportFileName(plan.title.en).replace(/\.[^.]+$/, "") || "review-lesson";

    if (format === "pptx") {
      return {
        status: "ready" as const,
        bytes: await renderReviewLessonPptx(plan),
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        fileName: `${safeName}.pptx`
      };
    }

    if (format === "markdown") {
      return {
        status: "ready" as const,
        bytes: new TextEncoder().encode(renderReviewLessonMarkdown(plan, plan.language)),
        mimeType: "text/markdown; charset=utf-8",
        fileName: `${safeName}.md`
      };
    }

    return {
      status: "ready" as const,
      bytes: new TextEncoder().encode(JSON.stringify(plan, null, 2)),
      mimeType: "application/json; charset=utf-8",
      fileName: `${safeName}.json`
    };
  }

  return {
    generateTeacherReviewLessonPlan,
    getTeacherAssessmentDetailData,
    getTeacherReviewLessonDetailData,
    getTeacherReviewLessonExportData,
    async publishTeacherReviewLessonParentDraft({
      teacherId,
      reviewLessonId
    }: TeacherOpsReviewLessonParentDraftPublishInput): Promise<TeacherOpsReviewLessonParentDraftPublishResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const record = teacherOpsReviewLessonRecordFor(database, user, reviewLessonId);
        if (!record) return { status: "not-found" as const };
        if (record.status !== "reviewed") return { status: "needs-review" as const };
        const teacherClass = teacherCanMutateOperationsClass(database, user, record.class_id);
        if (!teacherClass) return { status: "forbidden" as const };

        const existing = parentSafeDraftForReviewLesson(database, record.id);
        if (existing) return { status: "published" as const, draft: existing };

        const notice = createParentSafeDraftNoticeRecord({
          database,
          teacher: user,
          teacherClass,
          reviewLesson: record,
          nowIso: now().toISOString()
        });
        const draft = parentSafeDraftForReviewLesson(database, notice.source_id ?? record.id);
        if (!draft) return { status: "failed" as const };

        return { status: "published" as const, draft };
      });
    },
    async createTeacherAssessment({
      teacherId,
      classId,
      title,
      type,
      sourceType,
      sourceResourceId,
      questionIds,
      manualQuestions,
      paperSections,
      statusIntent,
      opensAt,
      closesAt,
      timeLimitMinutes,
      maxAttempts,
      randomizeQuestionOrder,
      showAnswersImmediately,
      gradeWeight
    }: TeacherOpsAssessmentCreateInput): Promise<TeacherOpsAssessmentCreateResult> {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || !isValidAssessmentType(type) || !isValidAssessmentSourceType(sourceType)) {
        return { status: "invalid" };
      }

      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const teacherClass = teacherCanAccessClass(database, user, classId);
        if (!teacherClass) return { status: "not-found" as const };
        if (assessmentAuthoringInputReferencesRetiredQuestion(questionIds, paperSections)) {
          return { status: "invalid" as const };
        }

        const resource =
          sourceResourceId && sourceType === "resource"
            ? teacherResourceRecordsFor(database, user).find((candidate) => candidate.id === sourceResourceId)
            : null;
        if (sourceType === "resource" && !resource) return { status: "resource-not-found" as const };

        const normalizedManualQuestions = normalizeManualQuestions(manualQuestions);
        const normalizedPaperSections = normalizePaperSectionsInput(database, teacherClass, paperSections);
        const normalizedQuestionIds =
          sourceType === "manual" || sourceType === "mixed"
            ? []
            : assessmentQuestionIdsForSource(database, teacherClass, sourceType, questionIds ?? [], resource);
        if (sourceType === "manual" && !normalizedManualQuestions.length) return { status: "invalid" as const };
        if (sourceType === "mixed" && !normalizedPaperSections.length) return { status: "invalid" as const };

        const nowIso = now().toISOString();
        const assessmentId = `assessment-${createId()}`;
        const shouldPublish = statusIntent !== "draft";
        const mixedQuestionIds = normalizedPaperSections.flatMap((section) => (
          section.items.map((item) => item.questionId).filter((questionId): questionId is string => Boolean(questionId))
        ));
        const record: TeacherOpsAssessmentRecord = {
          id: assessmentId,
          class_id: classId,
          title_en: trimmedTitle,
          title_zh: trimmedTitle,
          type,
          status: shouldPublish ? (opensAt ? "scheduled" : "open") : "draft",
          source_type: sourceType,
          source_resource_id: sourceType === "resource" ? resource?.id : undefined,
          analysis_settings: normalizeAssessmentAnalysisSettings(null),
          exam_group_id: assessmentId,
          exam_group_name_en: trimmedTitle,
          exam_group_name_zh: trimmedTitle,
          question_ids: sourceType === "mixed" ? mixedQuestionIds : normalizedQuestionIds,
          manual_questions: sourceType === "mixed" ? [] : normalizedManualQuestions,
          paper_sections: sourceType === "mixed" ? normalizedPaperSections : [],
          opens_at: opensAt ? new Date(opensAt).toISOString() : null,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          time_limit_minutes:
            typeof timeLimitMinutes === "number" && Number.isFinite(timeLimitMinutes) && timeLimitMinutes > 0
              ? Math.round(timeLimitMinutes)
              : null,
          max_attempts: typeof maxAttempts === "number" && Number.isFinite(maxAttempts) && maxAttempts > 0 ? Math.round(maxAttempts) : 1,
          randomize_question_order: randomizeQuestionOrder,
          show_answers_immediately: showAnswersImmediately,
          grade_weight:
            typeof gradeWeight === "number" && Number.isFinite(gradeWeight) && gradeWeight >= 0
              ? Math.round(gradeWeight)
              : 10,
          created_by: user.id,
          created_at: nowIso,
          updated_at: nowIso
        };

        database.assessments.unshift(record);
        if (shouldPublish) {
          teacherStudentIdsForClass(database, classId).forEach((studentId) => {
            database.assessment_submissions.push({
              id: `assessment-submission-${createId()}`,
              assessment_id: assessmentId,
              student_id: studentId,
              status: "not-started" satisfies AssessmentSubmissionStatus,
              attempt_number: 0,
              score: null,
              max_score: 100,
              submitted_at: null,
              graded_at: null,
              answers: [],
              updated_at: nowIso
            });
          });
        }

        return { status: "created" as const, assessment: toTeacherOpsAssessment(database, record) };
      });
    },
    async updateTeacherAssessment({
      teacherId,
      assessmentId,
      title,
      type,
      sourceType,
      sourceResourceId,
      questionIds,
      manualQuestions,
      paperSections,
      statusIntent,
      opensAt,
      closesAt,
      timeLimitMinutes,
      maxAttempts,
      randomizeQuestionOrder,
      showAnswersImmediately,
      gradeWeight
    }: TeacherOpsAssessmentUpdateInput): Promise<TeacherOpsAssessmentUpdateResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
        const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
        if (!assessment || !teacherClass) return { status: "not-found" as const };
        if (assessmentHasSubmittedSubmissions(database, assessment.id)) return { status: "locked" as const };
        if (assessmentAuthoringInputReferencesRetiredQuestion(questionIds, paperSections)) {
          return { status: "invalid" as const };
        }

        const nextType = normalizeAssessmentType(type, assessment.type ?? "quiz");
        const nextSourceType = normalizeAssessmentSourceType(sourceType, assessment.source_type ?? "question-bank");
        const resource =
          sourceResourceId && nextSourceType === "resource"
            ? teacherResourceRecordsFor(database, user).find((candidate) => candidate.id === sourceResourceId)
            : null;
        if (nextSourceType === "resource" && sourceResourceId && !resource) return { status: "resource-not-found" as const };

        const normalizedManualQuestions = normalizeManualQuestions(manualQuestions);
        const normalizedPaperSections = normalizePaperSectionsInput(
          database,
          teacherClass,
          paperSections ?? teacherOpsAssessmentPaperSectionsForRecord(assessment)
        );
        const normalizedQuestionIds =
          nextSourceType === "manual" || nextSourceType === "mixed"
            ? []
            : assessmentQuestionIdsForSource(database, teacherClass, nextSourceType, questionIds ?? assessment.question_ids ?? [], resource);
        if (nextSourceType === "manual" && !normalizedManualQuestions.length && !(assessment.manual_questions ?? []).length) {
          return { status: "invalid" as const };
        }
        if (nextSourceType === "mixed" && !normalizedPaperSections.length) return { status: "invalid" as const };

        const nextTitle = title?.trim() || assessment.title_en;
        const shouldPublish = statusIntent === "publish" || (statusIntent !== "draft" && assessment.status !== "draft");
        const nowIso = now().toISOString();
        const mixedQuestionIds = normalizedPaperSections.flatMap((section) => (
          section.items.map((item) => item.questionId).filter((questionId): questionId is string => Boolean(questionId))
        ));

        assessment.title_en = nextTitle;
        assessment.title_zh = nextTitle;
        assessment.type = nextType;
        assessment.status = shouldPublish ? (opensAt ? "scheduled" : "open") : "draft";
        assessment.source_type = nextSourceType;
        assessment.source_resource_id = nextSourceType === "resource" ? resource?.id : undefined;
        assessment.question_ids = nextSourceType === "mixed" ? mixedQuestionIds : normalizedQuestionIds;
        assessment.manual_questions = nextSourceType === "mixed"
          ? []
          : (normalizedManualQuestions.length ? normalizedManualQuestions : assessment.manual_questions ?? []);
        assessment.paper_sections = nextSourceType === "mixed" ? normalizedPaperSections : [];
        assessment.opens_at = opensAt ? new Date(opensAt).toISOString() : null;
        assessment.closes_at = closesAt ? new Date(closesAt).toISOString() : null;
        assessment.time_limit_minutes =
          typeof timeLimitMinutes === "number" && Number.isFinite(timeLimitMinutes) && timeLimitMinutes > 0
            ? Math.round(timeLimitMinutes)
            : null;
        assessment.max_attempts =
          typeof maxAttempts === "number" && Number.isFinite(maxAttempts) && maxAttempts > 0
            ? Math.round(maxAttempts)
            : assessment.max_attempts;
        assessment.randomize_question_order =
          typeof randomizeQuestionOrder === "boolean" ? randomizeQuestionOrder : assessment.randomize_question_order;
        assessment.show_answers_immediately =
          typeof showAnswersImmediately === "boolean" ? showAnswersImmediately : assessment.show_answers_immediately;
        assessment.grade_weight =
          typeof gradeWeight === "number" && Number.isFinite(gradeWeight) && gradeWeight >= 0
            ? Math.round(gradeWeight)
            : assessment.grade_weight;
        assessment.updated_at = nowIso;

        if (shouldPublish) ensureAssessmentSubmissions(database, assessment, nowIso);
        return { status: "updated" as const, assessment: toTeacherOpsAssessment(database, assessment) };
      });
    },
    async createReviewLessonRemediationAssessment(
      teacherId: string,
      reviewLessonId: string
    ): Promise<TeacherOpsReviewLessonRemediationAssessmentResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const record = teacherOpsReviewLessonRecordFor(database, user, reviewLessonId);
        if (!record) return { status: "not-found" as const };
        if (record.remediation_assessment_id) {
          const existing = database.assessments.find((assessment) => assessment.id === record.remediation_assessment_id);
          if (existing) {
            return {
              status: "created" as const,
              assessment: toTeacherOpsAssessment(database, existing),
              reviewLesson: toTeacherOpsReviewLesson(database, record)
            };
          }
        }

        const approvedQuestions = record.remediation_questions.filter((question) => question.validationStatus === "validated");
        if (!approvedQuestions.length) return { status: "needs-review" as const };

        const nowIso = now().toISOString();
        const assessmentId = `assessment-${createId()}`;
        const title = `Remediation: ${record.title_en}`;
        const titleZh = `补救练习：${record.title_zh}`;
        const paperSections: AssessmentPaperSection[] = [{
          id: `section-remediation-${assessmentId}`,
          title: { en: "Remediation practice", zh: "课后补救练习", zhHans: "课后补救练习" },
          instructions: {
            en: "Draft assessment generated from reviewed remediation questions.",
            zh: "根据已审核补救题生成的测验草稿。",
            zhHans: "根据已审核补救题生成的测验草稿。"
          },
          order: 0,
          items: approvedQuestions.slice(0, 20).map((question, index) => ({
            id: `remediation-${index + 1}`,
            source: "manual",
            embeddedQuestion: {
              type: "short-answer",
              prompt: question.prompt,
              answer: question.answer,
              explanation: question.explanation,
              topicId: question.topicId,
              difficulty: question.difficulty
            },
            points: 10,
            order: index
          }))
        }];
        const assessment: TeacherOpsAssessmentRecord = {
          id: assessmentId,
          class_id: record.class_id,
          title_en: title,
          title_zh: titleZh,
          type: "quiz",
          status: "draft",
          source_type: "mixed",
          analysis_settings: normalizeAssessmentAnalysisSettings(null),
          exam_group_id: assessmentId,
          exam_group_name_en: title,
          exam_group_name_zh: titleZh,
          question_ids: [],
          manual_questions: [],
          paper_sections: paperSections,
          opens_at: null,
          closes_at: null,
          time_limit_minutes: 20,
          max_attempts: 1,
          randomize_question_order: false,
          show_answers_immediately: false,
          grade_weight: 0,
          created_by: user.id,
          created_at: nowIso,
          updated_at: nowIso
        };
        database.assessments.unshift(assessment);
        record.remediation_assessment_id = assessment.id;
        record.updated_at = nowIso;

        return {
          status: "created" as const,
          assessment: toTeacherOpsAssessment(database, assessment),
          reviewLesson: toTeacherOpsReviewLesson(database, record)
        };
      });
    },
    async updateTeacherReviewLessonPlan({
      teacherId,
      reviewLessonId,
      title,
      status,
      objectives,
      timeline,
      items,
      slides,
      boardColumns,
      variationQuestions,
      remediationQuestions,
      individualGroups
    }: TeacherOpsReviewLessonUpdateInput): Promise<TeacherOpsReviewLessonUpdateResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };
        const record = teacherOpsReviewLessonRecordFor(database, user, reviewLessonId);
        if (!record) return { status: "not-found" as const };

        const nowIso = now().toISOString();
        if (typeof title === "string" && title.trim()) {
          record.title_en = title.trim().slice(0, 180);
          record.title_zh = title.trim().slice(0, 180);
        }
        if (status && isValidTeacherReviewLessonStatus(status)) {
          record.status = status;
          record.reviewed_at = status === "reviewed" ? nowIso : record.reviewed_at;
        }
        if (Array.isArray(objectives)) record.objectives = objectives.slice(0, 8);
        if (Array.isArray(timeline)) record.timeline = timeline.slice(0, 10);
        if (Array.isArray(items)) record.items = items.slice(0, 80);
        if (Array.isArray(slides)) record.slides = slides.slice(0, 40);
        if (Array.isArray(boardColumns)) record.board_columns = boardColumns.slice(0, 6);
        if (Array.isArray(variationQuestions)) record.variation_questions = variationQuestions.slice(0, 40);
        if (Array.isArray(remediationQuestions)) record.remediation_questions = remediationQuestions.slice(0, 40);
        if (Array.isArray(individualGroups)) record.individual_groups = individualGroups.slice(0, 40);
        record.updated_at = nowIso;

        return { status: "updated" as const, reviewLesson: toTeacherOpsReviewLesson(database, record) };
      });
    },
    async getTeacherAssessmentCreateData(userId: string): Promise<TeacherAssessmentCreateData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const classes = teacherClassRecordsFor(database, user);
      const classGrades = new Set(classes.map((teacherClass) => teacherClass.grade));
      return {
        classes: classes.map((teacherClass) => toTeacherClass(database, teacherClass)),
        resources: teacherResourceRecordsFor(database, user)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((resource) => toTeachingResource(database, resource)),
        topicOptions: database.topics
          .filter((topic) => topicMatchesUserCurriculum(database, topic, user))
          .sort((a, b) => a.grade.localeCompare(b.grade) || a.sort_order - b.sort_order)
          .map(topicOptionForRecord),
        questionBank: database.questions
          .filter((question) => (
            !isRetiredHongKongQuestionId(question.id) &&
            questionMatchesUserCurriculum(database, question, user) &&
            classGrades.has(question.grade)
          ))
          .slice(0, 80)
          .map((question) => questionOptionForRecord(database, question))
      };
    },
    async getTeacherAssessmentListData(userId: string): Promise<TeacherAssessmentListData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const assessmentRecords = teacherAssessmentRecordsFor(database, user).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      const assessments = assessmentRecords.map((assessment) => toTeacherOpsAssessment(database, assessment));
      const assessmentIds = new Set(assessmentRecords.map((assessment) => assessment.id));
      const scoredSubmissions = database.assessment_submissions.filter((submission) => {
        return assessmentIds.has(submission.assessment_id) && submission.score !== null && submission.max_score > 0;
      });
      const averageScore = scoredSubmissions.length
        ? Math.round(
          scoredSubmissions.reduce((sum, submission) => sum + ((submission.score ?? 0) / submission.max_score) * 100, 0) /
            scoredSubmissions.length
        )
        : null;

      return {
        generatedAt: now().toISOString(),
        classes: teacherClassRecordsFor(database, user).map((teacherClass) => toTeacherClass(database, teacherClass)),
        assessments,
        totals: {
          assessments: assessments.length,
          openAssessments: assessments.filter((assessment) => assessment.status === "open" || assessment.status === "scheduled").length,
          submittedCount: assessments.reduce((sum, assessment) => sum + assessment.submittedCount, 0),
          averageScore
        }
      };
    },
    async getTeacherAssessmentBuilderQuestions({
      teacherId,
      classId,
      topicIds,
      difficulties,
      questionTypes,
      keyword,
      source,
      page,
      pageSize
    }: TeacherOpsAssessmentBuilderQuestionsInput): Promise<TeacherOpsAssessmentBuilderQuestionsData | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return null;
      const teacherClass = teacherCanAccessClass(database, user, classId);
      if (!teacherClass) return null;

      const cleanTopicIds = new Set((topicIds ?? []).filter(Boolean));
      const cleanDifficulties = new Set((difficulties ?? []).filter(isActiveDifficulty));
      const cleanQuestionTypes = new Set((questionTypes ?? []).filter(isValidAssessmentQuestionType));
      const cleanKeyword = keyword?.trim().toLowerCase() ?? "";
      const mistakeCounts = new Map<string, number>();

      if (source === "mistakes") {
        const studentIds = new Set(
          (database.class_enrollments ?? [])
            .filter((enrollment) => enrollment.class_id === teacherClass.id)
            .map((enrollment) => enrollment.student_id)
        );
        (database.mistakes ?? [])
          .filter((mistake) => studentIds.has(mistake.user_id) && !mistake.mastered)
          .forEach((mistake) => {
            mistakeCounts.set(mistake.question_id, (mistakeCounts.get(mistake.question_id) ?? 0) + 1);
          });
      }

      const questions = database.questions.filter((question) => {
        if (isRetiredHongKongQuestionId(question.id)) return false;
        if (!questionMatchesClassCurriculum(database, question, teacherClass) || question.grade !== teacherClass.grade) return false;
        if (source === "mistakes" && !mistakeCounts.has(question.id)) return false;
        if (cleanTopicIds.size && !cleanTopicIds.has(question.topic_id)) return false;
        if (!difficultyMatchesAnyActiveFilter(question.difficulty, cleanDifficulties)) return false;
        if (cleanQuestionTypes.size && !cleanQuestionTypes.has(question.type)) return false;
        if (cleanKeyword && !questionSearchTextForRecord(database, question).toLowerCase().includes(cleanKeyword)) return false;
        return true;
      });

      const sortedQuestions = questions.sort((a, b) => {
        if (source === "mistakes") {
          const countDelta = (mistakeCounts.get(b.id) ?? 0) - (mistakeCounts.get(a.id) ?? 0);
          if (countDelta !== 0) return countDelta;
        }
        return a.topic_id.localeCompare(b.topic_id) || a.difficulty.localeCompare(b.difficulty) || a.id.localeCompare(b.id);
      });
      const safePageSize = Math.max(1, Math.min(50, Math.round(pageSize || 12)));
      const safePage = Math.max(1, Math.round(page || 1));
      const start = (safePage - 1) * safePageSize;

      return {
        questions: sortedQuestions.slice(start, start + safePageSize).map((question) => ({
          ...questionOptionForRecord(database, question),
          source: source === "mistakes" ? "mistake" as const : "question-bank" as const,
          usageCount: source === "mistakes" ? mistakeCounts.get(question.id) ?? 0 : undefined
        })),
        total: sortedQuestions.length,
        page: safePage,
        pageSize: safePageSize
      };
    },
    async cloneTeacherAssessment(userId: string, assessmentId: string): Promise<TeacherOpsAssessmentCloneResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === userId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
        if (!assessment || !teacherCanAccessClass(database, user, assessment.class_id)) {
          return { status: "not-found" as const };
        }

        const nowIso = now().toISOString();
        const copy: TeacherOpsAssessmentRecord = {
          ...assessment,
          id: `assessment-${createId()}`,
          title_en: `Copy of ${assessment.title_en}`,
          title_zh: `Copy of ${assessment.title_zh ?? assessment.title_en}`,
          status: "draft",
          opens_at: null,
          closes_at: assessment.closes_at ?? null,
          created_by: user.id,
          created_at: nowIso,
          updated_at: nowIso,
          paper_sections: teacherOpsAssessmentPaperSectionsForRecord(assessment)
        };
        database.assessments.unshift(copy);
        return { status: "created" as const, assessment: toTeacherOpsAssessment(database, copy) };
      });
    },
    async updateTeacherAssessmentAnalysisSettings({
      teacherId,
      assessmentId,
      analysisSettings,
      examGroupId,
      examGroupName
    }: TeacherOpsAssessmentAnalysisSettingsInput): Promise<TeacherOpsAssessmentAnalysisSettingsResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
        const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
        if (!assessment || !teacherClass) return { status: "not-found" as const };

        const nowIso = now().toISOString();
        assessment.analysis_settings = {
          ...normalizeAssessmentAnalysisSettings(analysisSettings),
          updatedAt: nowIso
        };
        const cleanExamGroupId = examGroupId?.trim().slice(0, 120);
        assessment.exam_group_id = cleanExamGroupId || assessment.id;
        const cleanExamGroupName = examGroupName?.trim().slice(0, 160);
        assessment.exam_group_name_en = cleanExamGroupName || assessment.title_en;
        assessment.exam_group_name_zh = cleanExamGroupName || assessment.title_zh || assessment.title_en;
        assessment.updated_at = nowIso;

        return { status: "updated" as const, assessment: toTeacherOpsAssessment(database, assessment) };
      });
    },
    async updateTeacherAssessmentSubmissionMarking({
      teacherId,
      assessmentId,
      submissionId,
      answers
    }: TeacherOpsAssessmentSubmissionMarkingInput): Promise<TeacherOpsAssessmentSubmissionMarkingResult> {
      return mutateDatabase((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

        const assessment = database.assessments.find((candidate) => candidate.id === assessmentId);
        const teacherClass = assessment ? teacherCanAccessClass(database, user, assessment.class_id) : null;
        const submission = database.assessment_submissions.find((candidate) => (
          candidate.id === submissionId &&
          candidate.assessment_id === assessmentId &&
          Boolean(candidate.student_id)
        ));
        if (!assessment || !teacherClass || !submission || !submission.student_id) return { status: "not-found" as const };

        const nowIso = now().toISOString();
        const answerUpdates = new Map(answers.filter((answer) => typeof answer.questionId === "string").map((answer) => [answer.questionId, answer]));
        const existingAnswers = new Map((submission.answers ?? []).map((answer) => [answer.questionId, answer]));
        const scoredAnswers = teacherOpsAssessmentPaperItemsForRecord(assessment).map(({ item }) => {
          const existingAnswer = existingAnswers.get(item.id);
          const update = answerUpdates.get(item.id);
          const rawPoints = typeof update?.pointsEarned === "number" && Number.isFinite(update.pointsEarned)
            ? update.pointsEarned
            : existingAnswer?.pointsEarned ?? 0;
          const pointsEarned = Math.max(0, Math.min(item.points, Math.round(rawPoints * 10) / 10));
          const isCorrect = typeof update?.isCorrect === "boolean"
            ? update.isCorrect
            : pointsEarned >= item.points
              ? true
              : pointsEarned <= 0
                ? false
                : existingAnswer?.isCorrect ?? null;
          const feedback = typeof update?.teacherFeedback === "string" && update.teacherFeedback.trim()
            ? normalizeAssessmentLocalizedText(update.teacherFeedback, "")
            : existingAnswer?.teacherFeedback ?? null;
          return {
            questionId: item.id,
            answer: existingAnswer?.answer ?? "",
            isCorrect,
            pointsEarned,
            maxPoints: item.points,
            teacherFeedback: feedback
          };
        });
        const maxScore = scoredAnswers.reduce((sum, answer) => sum + answer.maxPoints, 0);
        const score = scoredAnswers.reduce((sum, answer) => sum + (answer.pointsEarned ?? 0), 0);
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

        submission.status = "graded";
        submission.attempt_number = Math.max(1, submission.attempt_number ?? 0);
        submission.score = score;
        submission.max_score = maxScore;
        submission.submitted_at = submission.submitted_at ?? nowIso;
        submission.graded_at = nowIso;
        submission.answers = scoredAnswers;
        submission.updated_at = nowIso;

        completeMatchingAssessmentAssignments({
          database,
          userId: submission.student_id,
          targetIds: [assessmentId],
          now: nowIso,
          score: percentage,
          graded: true,
          feedbackEn: "Updated by teacher marking.",
          feedbackZh: "已由教師閱卷更新。"
        });

        return {
          status: "updated" as const,
          submission: toTeacherOpsAssessmentSubmission(database, submission),
          assessment: toTeacherOpsAssessment(database, assessment)
        };
      });
    },
    async getTeacherAssessmentCsv(userId: string, assessmentId: string): Promise<string | null> {
      const detail = await getTeacherAssessmentDetailData(userId, assessmentId);
      if (!detail) return null;

      const rankingByStudentId = new Map(detail.analysis.rankings.map((entry) => [entry.studentId, entry]));
      const questionHeaders = detail.questionAnalytics.map((question, index) => `Q${index + 1} score (${question.maxPoints})`);
      const rows = [
        [
          "Rank",
          "Student",
          "Status",
          "Attempt",
          "Score",
          "Max score",
          "Percentage",
          "Borderline tags",
          "Submitted at",
          "Graded at",
          ...questionHeaders
        ],
        ...detail.submissions.map((submission) => [
          rankingByStudentId.get(submission.studentId)?.rank ?? "",
          submission.studentName,
          submission.status,
          submission.attemptNumber,
          submission.score ?? "",
          submission.maxScore,
          submission.score === null || submission.maxScore <= 0 ? "" : Math.round((submission.score / submission.maxScore) * 100),
          rankingByStudentId.get(submission.studentId)?.borderlineTypes.join("|") ?? "",
          submission.submittedAt ?? "",
          submission.gradedAt ?? "",
          ...detail.questionAnalytics.map((question) => {
            const answer = submission.answers.find((candidate) => candidate.questionId === question.questionId);
            return answer?.pointsEarned === null || typeof answer?.pointsEarned === "undefined"
              ? ""
              : `${answer.pointsEarned}/${answer.maxPoints}`;
          })
        ])
      ];

      return rows.map((row) => row.map(csvCell).join(",")).join("\n");
    }
  };
}
