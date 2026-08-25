import { randomUUID } from "crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { validGradeSet } from "@/data/grades";
import {
  normalizeStoredCurriculumProfile,
  publisherLabels
} from "@/lib/curriculumProfile";
import {
  isSupportedDifficultyRecord,
  mapDifficultyToActive
} from "@/lib/difficulty";
import type {
  AssessmentPaperItem,
  AssessmentPaperSection,
  CurriculumRegion,
  CurriculumTrack,
  GradeId,
  LocalizedText,
  TeacherClass,
  TeacherLessonKit,
  TeacherLessonKitCreateData,
  TeacherLessonKitListData,
  TeacherLessonKitPublishResult,
  TeacherLessonKitReviewStatus,
  TeacherLessonKitSection,
  TeacherLessonKitSectionQuestion,
  TeacherLessonKitSectionKind,
  TeacherLessonKitStatus,
  TeacherTopicOption,
  TeachingResourceType,
  TextbookPublisher
} from "@/types";

type TeacherOpsLessonKitUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsLessonKitUserRecord = {
  id: string;
  role: TeacherOpsLessonKitUserRole;
};

type TeacherOpsLessonKitClassRecord = {
  id: string;
  teacher_id: string;
  name: string;
  grade: GradeId;
};

type TeacherOpsLessonKitSchoolMembershipRecord = {
  user_id: string;
  role: TeacherOpsLessonKitUserRole;
  class_id?: string;
};

type TeacherOpsLessonKitEnrollmentRecord = {
  class_id: string;
  student_id: string;
};

type TeacherOpsLessonKitRecord = {
  id: string;
  teacher_id?: string;
  class_id: string;
  grade?: GradeId;
  curriculum_region?: "MAINLAND";
  textbook_publisher?: TextbookPublisher;
  topic_id?: string;
  topic_title_en?: string;
  topic_title_zh?: string;
  lesson_slug?: string;
  lesson_title_en?: string;
  lesson_title_zh?: string;
  chapter_title_en?: string;
  chapter_title_zh?: string;
  lesson_period?: number;
  lesson_type?: TeacherLessonKit["lessonType"];
  duration_minutes?: number;
  status: TeacherLessonKit["status"];
  source?: TeacherLessonKit["source"];
  review_status: TeacherLessonKit["reviewStatus"];
  generation_notes_en?: string;
  generation_notes_zh?: string;
  sections?: TeacherLessonKitSection[];
  published_resource_ids?: string[];
  assignment_id?: string;
  assessment_id?: string;
  live_session_id?: string;
  created_at?: string;
  updated_at: string;
  generated_at?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
};

export type TeacherOpsNormalizedLessonKitRecord = TeacherOpsLessonKitRecord & {
  teacher_id: string;
  class_id: string;
  grade: GradeId;
  curriculum_region: "MAINLAND";
  textbook_publisher: TextbookPublisher;
  topic_id: string;
  topic_title_en: string;
  topic_title_zh: string;
  lesson_title_en: string;
  lesson_title_zh: string;
  chapter_title_en: string;
  chapter_title_zh: string;
  lesson_period: number;
  lesson_type: TeacherLessonKit["lessonType"];
  duration_minutes: number;
  status: TeacherLessonKitStatus;
  source: TeacherLessonKit["source"];
  review_status: TeacherLessonKitReviewStatus;
  generation_notes_en: string;
  generation_notes_zh: string;
  sections: TeacherLessonKitSection[];
  published_resource_ids: string[];
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  reviewed_at: string | null;
  published_at: string | null;
};

type TeacherOpsLessonKitGenericRecord = {
  id: string;
  [key: string]: unknown;
};

type TeacherOpsLessonKitLiveSessionRecord = TeacherOpsLessonKitGenericRecord & {
  class_id: string;
  status: string;
  ended_at?: string | null;
  updated_at: string;
};

type TeacherOpsLessonKitResourceRecord = {
  id: string;
  title_en: string;
  title_zh: string;
  type: TeachingResourceType;
  file_name: string;
  file_type: "HTML";
  mime_type: "text/html; charset=utf-8";
  file_size_bytes: number;
  storage_path: string;
  grade?: GradeId;
  topic_id?: string;
  uploaded_by?: string;
  created_at: string;
};

type ResolvedTeacherOpsLessonKitTopic = {
  id: string;
  title: LocalizedText;
  lesson?: {
    slug?: string;
    title: LocalizedText;
  };
};

type TeacherOpsLessonKitTopicRecord = {
  id: string;
  grade: GradeId;
  sort_order: number;
  title_en: string;
  title_zh: string;
  curriculum_track?: CurriculumTrack | null;
  curriculum_region?: CurriculumRegion | null;
  textbook_publisher?: TextbookPublisher | null;
};

export type TeacherOpsLessonKitPersistenceDatabase = {
  assessment_submissions: TeacherOpsLessonKitGenericRecord[];
  assessments: TeacherOpsLessonKitGenericRecord[];
  assignments: TeacherOpsLessonKitGenericRecord[];
  class_enrollments: TeacherOpsLessonKitEnrollmentRecord[];
  school_memberships?: TeacherOpsLessonKitSchoolMembershipRecord[];
  submissions: TeacherOpsLessonKitGenericRecord[];
  teaching_resources: TeacherOpsLessonKitResourceRecord[];
  teacher_classes: TeacherOpsLessonKitClassRecord[];
  teacher_lesson_kits: TeacherOpsLessonKitRecord[];
  teacher_live_prompts: TeacherOpsLessonKitGenericRecord[];
  teacher_live_sessions: TeacherOpsLessonKitLiveSessionRecord[];
  users: TeacherOpsLessonKitUserRecord[];
};

export type TeacherOpsLessonKitAiGenerationResult =
  | {
      status: "generated";
      sections: TeacherLessonKitSection[];
      notesEn: string;
      notesZh: string;
    }
  | { status: "missing-config" }
  | { status: "provider-error" }
  | { status: "invalid-output" };

export type TeacherOpsLessonKitPersistenceStoreDependencies<TGenerationContext = unknown> = {
  buildGenerationContext: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    lessonKit: TeacherOpsLessonKitRecord
  ) => TGenerationContext | null;
  buildInitialSections: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    lessonKit: TeacherOpsLessonKitRecord
  ) => TeacherLessonKitSection[];
  createId?: () => string;
  createResourceId?: (suffix: string) => string;
  createLiveJoinCode: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    teacherClass: TeacherOpsLessonKitClassRecord
  ) => string;
  generateSectionsWithAi: (context: TGenerationContext) => Promise<TeacherOpsLessonKitAiGenerationResult>;
  livePromptOptionsFor: (type: "exit-ticket") => unknown[];
  mutateDatabase?: <T>(
    mutator: (database: TeacherOpsLessonKitPersistenceDatabase) => T | Promise<T>
  ) => Promise<T>;
  normalizeSections: (sections: TeacherLessonKitSection[]) => TeacherLessonKitSection[];
  now?: () => Date;
  readDatabase: () => Promise<TeacherOpsLessonKitPersistenceDatabase>;
  removeResourceFile?: (storagePath: string) => Promise<void>;
  resourceUploadDirectory: string;
  resolveLessonKitTopic: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    teacherClass: TeacherOpsLessonKitClassRecord,
    topicId: string,
    publisher: TextbookPublisher
  ) => ResolvedTeacherOpsLessonKitTopic | null;
  toTeacherClass: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    teacherClass: TeacherOpsLessonKitClassRecord
  ) => TeacherClass;
  topicOptionsForClasses: (
    database: TeacherOpsLessonKitPersistenceDatabase,
    classRecords: TeacherOpsLessonKitClassRecord[]
  ) => TeacherTopicOption[];
  writeResourceFile?: (storagePath: string, html: string) => Promise<void>;
};

export type TeacherOpsLessonKitPersistenceStore = ReturnType<typeof createTeacherOpsLessonKitPersistenceStore>;

export type TeacherOpsLessonKitCreationInput = {
  teacherId: string;
  classId: string;
  publisher: TextbookPublisher;
  topicId: string;
  lessonPeriod: number;
  lessonType: TeacherLessonKit["lessonType"];
  durationMinutes: number;
};

export type TeacherOpsLessonKitCreationResult =
  | { status: "created"; kit: TeacherLessonKit }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "topic-not-found" };

export type TeacherOpsLessonKitUpdateInput = {
  teacherId: string;
  kitId: string;
  sections?: TeacherLessonKitSection[];
  reviewStatus?: TeacherLessonKitReviewStatus;
  status?: TeacherLessonKitStatus;
};

export type TeacherOpsLessonKitUpdateResult =
  | { status: "updated"; kit: TeacherLessonKit }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "not-found" };

export type TeacherOpsLessonKitAiGenerationInput = {
  teacherId: string;
  kitId: string;
};

export type TeacherOpsLessonKitAiGenerationStoreResult =
  | { status: "generated"; kit: TeacherLessonKit }
  | { status: "forbidden" }
  | { status: "invalid" }
  | { status: "not-found" }
  | { status: "missing-config" }
  | { status: "provider-error" }
  | { status: "invalid-output" };

export type TeacherOpsLessonKitPublishInput = {
  teacherId: string;
  kitId: string;
};

export type TeacherOpsLessonKitPublishStoreResult =
  | { status: "published"; result: TeacherLessonKitPublishResult; kit: TeacherLessonKit | null }
  | { status: "forbidden" }
  | { status: "needs-review" }
  | { status: "not-found" };

const mainlandLessonKitPublishers = new Set<TextbookPublisher>(["MAINLAND_PEP", "MAINLAND_BNU"]);
const validLessonTypes = new Set<TeacherLessonKit["lessonType"]>(["new-lesson", "review", "practice", "exam-prep"]);
const validReviewStatuses = new Set<TeacherLessonKitReviewStatus>(["needs-review", "approved", "rejected"]);
const validStatuses = new Set<TeacherLessonKitStatus>(["draft", "generated", "reviewed", "published"]);
const validSources = new Set<TeacherLessonKit["source"]>(["manual", "deterministic", "ai"]);
const validSectionKinds = new Set<TeacherLessonKitSectionKind>([
  "lesson-plan",
  "learning-guide",
  "slides",
  "blackboard-design",
  "objectives",
  "key-points",
  "worked-examples",
  "class-practice",
  "homework",
  "classroom-activity"
]);

export function teacherOpsLessonKitTopicOptionFor(record: TeacherOpsLessonKitTopicRecord): TeacherTopicOption {
  const curriculumProfile = normalizeStoredCurriculumProfile({
    curriculumTrack: record.curriculum_track,
    region: record.curriculum_region,
    publisher: record.textbook_publisher
  });
  return {
    id: record.id,
    grade: record.grade,
    curriculumProfile,
    publisher: curriculumProfile.publisher,
    title: {
      en: record.title_en,
      zh: record.title_zh
    }
  };
}

export function teacherOpsIsMainlandLessonKitTopic(
  topic: TeacherOpsLessonKitTopicRecord,
  publisher?: TextbookPublisher
) {
  const profile = normalizeStoredCurriculumProfile({
    curriculumTrack: topic.curriculum_track,
    region: topic.curriculum_region,
    publisher: topic.textbook_publisher
  });
  return profile.region === "MAINLAND" && mainlandLessonKitPublishers.has(profile.publisher) && (!publisher || profile.publisher === publisher);
}

export function teacherOpsMainlandLessonKitTopicOptions(
  database: { topics: TeacherOpsLessonKitTopicRecord[] },
  classRecords: Array<{ grade: GradeId }>
) {
  const grades = new Set(classRecords.map((teacherClass) => teacherClass.grade));
  return database.topics
    .filter((topic) => grades.has(topic.grade) && teacherOpsIsMainlandLessonKitTopic(topic))
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.sort_order - b.sort_order)
    .map(teacherOpsLessonKitTopicOptionFor);
}

export function isValidTeacherLessonKitStatus(status: unknown): status is TeacherLessonKitStatus {
  return validStatuses.has(status as TeacherLessonKitStatus);
}

export function normalizeTeacherLessonKitStatus(status: unknown): TeacherLessonKitStatus {
  return isValidTeacherLessonKitStatus(status) ? status : "draft";
}

export function normalizeTeacherLessonKitSource(source: unknown): TeacherLessonKit["source"] {
  return validSources.has(source as TeacherLessonKit["source"]) ? source as TeacherLessonKit["source"] : "manual";
}

export function normalizeTeacherLessonKitReviewStatus(status: unknown): TeacherLessonKitReviewStatus {
  return validReviewStatuses.has(status as TeacherLessonKitReviewStatus) ? status as TeacherLessonKitReviewStatus : "needs-review";
}

export function normalizeTeacherLessonKitLessonType(lessonType: unknown): TeacherLessonKit["lessonType"] {
  return validLessonTypes.has(lessonType as TeacherLessonKit["lessonType"]) ? lessonType as TeacherLessonKit["lessonType"] : "new-lesson";
}

export function isValidTeacherLessonKitSectionKind(kind: unknown): kind is TeacherLessonKitSectionKind {
  return validSectionKinds.has(kind as TeacherLessonKitSectionKind);
}

export function normalizeTeacherLessonKitSectionKind(kind: unknown): TeacherLessonKitSectionKind | null {
  return isValidTeacherLessonKitSectionKind(kind) ? kind : null;
}

function cleanLessonKitString(value: unknown, fallback = "", maxLength = 4000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : fallback;
}

function normalizeLessonKitLocalizedText(value: unknown, fallback: LocalizedText): LocalizedText {
  if (typeof value === "string") {
    const text = cleanLessonKitString(value, fallback.en);
    return { en: text, zh: text, zhHans: text };
  }

  const record = value as Partial<LocalizedText> | null;
  const en = cleanLessonKitString(record?.en, fallback.en);
  const zh = cleanLessonKitString(record?.zhHans ?? record?.zh, fallback.zh);
  return { en, zh, zhHans: zh };
}

function normalizeTeacherLessonKitSectionQuestion(value: unknown): TeacherLessonKitSectionQuestion | null {
  const record = value as Partial<TeacherLessonKitSectionQuestion> | null;
  const prompt = normalizeLessonKitLocalizedText(record?.prompt, { en: "", zh: "" });
  const answer = cleanLessonKitString(record?.answer, "", 1200);
  if (!prompt.en || !answer) return null;
  const source = record?.source === "question-bank" || record?.source === "manual" || record?.source === "ai-generated"
    ? record.source
    : "manual";
  return {
    questionId: cleanLessonKitString(record?.questionId, "", 160) || undefined,
    prompt,
    answer,
    explanation: record?.explanation
      ? normalizeLessonKitLocalizedText(record.explanation, { en: answer, zh: answer })
      : undefined,
    difficulty: isSupportedDifficultyRecord(record?.difficulty) ? mapDifficultyToActive(record.difficulty) : undefined,
    source,
    validationStatus: record?.validationStatus === "validated" && source === "question-bank" ? "validated" : "needs-review"
  };
}

export function normalizeTeacherOpsLessonKitSections(value: unknown): TeacherLessonKitSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((section, index): TeacherLessonKitSection | null => {
      const record = section as Partial<TeacherLessonKitSection> | null;
      if (!record) return null;
      const kind = normalizeTeacherLessonKitSectionKind(record.kind);
      if (!kind) return null;
      const titleFallback = { en: kind, zh: kind };
      const content = normalizeLessonKitLocalizedText(record.content, titleFallback);
      if (!content.en && !content.zh) return null;
      return {
        id: cleanLessonKitString(record.id, `section-${kind}`, 120),
        kind,
        title: normalizeLessonKitLocalizedText(record.title, titleFallback),
        content,
        items: Array.isArray(record.items)
          ? record.items.slice(0, 16).map((item) => normalizeLessonKitLocalizedText(item, { en: "", zh: "" })).filter((item) => item.en || item.zh)
          : [],
        questions: Array.isArray(record.questions)
          ? record.questions.map(normalizeTeacherLessonKitSectionQuestion).filter((question): question is TeacherLessonKitSectionQuestion => Boolean(question))
          : [],
        estimatedMinutes: typeof record.estimatedMinutes === "number" && Number.isFinite(record.estimatedMinutes)
          ? Math.max(1, Math.min(90, Math.round(record.estimatedMinutes)))
          : undefined,
        teacherNotes: record.teacherNotes ? normalizeLessonKitLocalizedText(record.teacherNotes, { en: "", zh: "" }) : undefined,
        order: typeof record.order === "number" && Number.isFinite(record.order) ? record.order : index
      };
    })
    .filter((section): section is TeacherLessonKitSection => Boolean(section))
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({ ...section, order: index }));
}

export function normalizeTeacherOpsLessonKitRecord(
  kit: TeacherOpsLessonKitRecord,
  now: string
): TeacherOpsNormalizedLessonKitRecord {
  const publisher = kit.textbook_publisher && mainlandLessonKitPublishers.has(kit.textbook_publisher)
    ? kit.textbook_publisher
    : "MAINLAND_PEP";
  const status = normalizeTeacherLessonKitStatus(kit.status);
  const source = normalizeTeacherLessonKitSource(kit.source);
  const reviewStatus = normalizeTeacherLessonKitReviewStatus(kit.review_status);
  const lessonType = normalizeTeacherLessonKitLessonType(kit.lesson_type);
  const grade: GradeId = validGradeSet.has(kit.grade as GradeId) ? kit.grade as GradeId : "S1";
  return {
    ...kit,
    teacher_id: cleanLessonKitString(kit.teacher_id, "system", 160),
    class_id: cleanLessonKitString(kit.class_id, "", 160),
    grade,
    curriculum_region: "MAINLAND",
    textbook_publisher: publisher,
    topic_id: cleanLessonKitString(kit.topic_id, "", 160),
    topic_title_en: cleanLessonKitString(kit.topic_title_en, kit.topic_id || "Topic"),
    topic_title_zh: cleanLessonKitString(kit.topic_title_zh, kit.topic_title_en || kit.topic_id || "课题"),
    lesson_slug: cleanLessonKitString(kit.lesson_slug, "", 180) || undefined,
    lesson_title_en: cleanLessonKitString(kit.lesson_title_en, kit.topic_title_en || kit.topic_id || "Lesson"),
    lesson_title_zh: cleanLessonKitString(kit.lesson_title_zh, kit.topic_title_zh || kit.topic_id || "课时"),
    chapter_title_en: cleanLessonKitString(kit.chapter_title_en, kit.topic_title_en || kit.topic_id || "Chapter"),
    chapter_title_zh: cleanLessonKitString(kit.chapter_title_zh, kit.topic_title_zh || kit.topic_id || "章节"),
    lesson_period: typeof kit.lesson_period === "number" && Number.isFinite(kit.lesson_period)
      ? Math.max(1, Math.min(12, Math.round(kit.lesson_period)))
      : 1,
    lesson_type: lessonType,
    duration_minutes: typeof kit.duration_minutes === "number" && Number.isFinite(kit.duration_minutes)
      ? Math.max(20, Math.min(120, Math.round(kit.duration_minutes)))
      : 45,
    status,
    source,
    review_status: reviewStatus,
    generation_notes_en: cleanLessonKitString(kit.generation_notes_en, "Manual kit, awaiting teacher review."),
    generation_notes_zh: cleanLessonKitString(kit.generation_notes_zh, "手动备课包，待教师审核。"),
    sections: normalizeTeacherOpsLessonKitSections(kit.sections),
    published_resource_ids: Array.isArray(kit.published_resource_ids)
      ? kit.published_resource_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : [],
    assignment_id: cleanLessonKitString(kit.assignment_id, "", 160) || undefined,
    assessment_id: cleanLessonKitString(kit.assessment_id, "", 160) || undefined,
    live_session_id: cleanLessonKitString(kit.live_session_id, "", 160) || undefined,
    created_at: kit.created_at ?? now,
    updated_at: kit.updated_at ?? kit.created_at ?? now,
    generated_at: kit.generated_at ?? null,
    reviewed_at: kit.reviewed_at ?? null,
    published_at: kit.published_at ?? null
  };
}

const deterministicGenerationNotes = {
  en: "Deterministic draft scaffold from verified lesson, topic, and question-bank data. Teacher review is required.",
  zh: "已基于课时、课题与已验证题库生成本地草稿骨架，需教师审核。"
};
const publishDueMs = 7 * 24 * 60 * 60 * 1000;

function canUseTeacherArea(user?: TeacherOpsLessonKitUserRecord | null): user is TeacherOpsLessonKitUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

function teacherClassRecordsFor(
  database: TeacherOpsLessonKitPersistenceDatabase,
  user: TeacherOpsLessonKitUserRecord
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

function lessonKitRecordsFor(
  database: TeacherOpsLessonKitPersistenceDatabase,
  user: TeacherOpsLessonKitUserRecord
) {
  const classIds = new Set(teacherClassRecordsFor(database, user).map((teacherClass) => teacherClass.id));
  return database.teacher_lesson_kits
    .filter((kit) => classIds.has(kit.class_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function teacherOpsLessonKitStudentIdsForClass(
  database: TeacherOpsLessonKitPersistenceDatabase,
  classId: string
) {
  return database.class_enrollments
    .filter((enrollment) => enrollment.class_id === classId)
    .map((enrollment) => enrollment.student_id);
}

export function teacherOpsLessonKitAssessmentSections(
  lessonKit: Pick<TeacherOpsLessonKitRecord, "sections" | "topic_id">
): AssessmentPaperSection[] {
  return (lessonKit.sections ?? [])
    .filter((section) => section.kind === "class-practice" || section.kind === "homework")
    .map((section, sectionIndex): AssessmentPaperSection | null => {
      const items = (section.questions ?? [])
        .map((question, questionIndex): AssessmentPaperItem | null => {
          if (!question.prompt.en || !question.answer) return null;
          if (question.source === "question-bank" && question.questionId) {
            return {
              id: question.questionId,
              source: "question-bank",
              questionId: question.questionId,
              points: 10,
              order: questionIndex
            };
          }
          return {
            id: `kit-item-${sectionIndex + 1}-${questionIndex + 1}`,
            source: question.source === "ai-generated" ? "ai-generated" : "manual",
            embeddedQuestion: {
              type: "short-answer",
              prompt: question.prompt,
              answer: question.answer,
              acceptedAnswers: [question.answer],
              explanation: question.explanation,
              topicId: lessonKit.topic_id,
              difficulty: question.difficulty
            },
            points: 10,
            order: questionIndex
          };
        })
        .filter((item): item is AssessmentPaperItem => Boolean(item));
      if (!items.length) return null;
      return {
        id: `lesson-kit-${section.kind}`,
        title: section.title,
        instructions: { en: "Answer with checked working.", zh: "写出必要过程并完成验算。", zhHans: "写出必要过程并完成验算。" },
        order: sectionIndex,
        items
      };
    })
    .filter((section): section is AssessmentPaperSection => Boolean(section));
}

export function teacherOpsLessonKitProjection(
  database: TeacherOpsLessonKitPersistenceDatabase,
  record: TeacherOpsLessonKitRecord
): TeacherLessonKit | null {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === record.class_id);
  if (!teacherClass) return null;

  const lessonKit = record as TeacherOpsNormalizedLessonKitRecord;
  return {
    id: lessonKit.id,
    teacherId: lessonKit.teacher_id,
    classId: lessonKit.class_id,
    className: teacherClass.name,
    grade: lessonKit.grade,
    curriculumProfile: { region: "MAINLAND", publisher: lessonKit.textbook_publisher },
    publisher: lessonKit.textbook_publisher,
    topicId: lessonKit.topic_id,
    topicTitle: { en: lessonKit.topic_title_en, zh: lessonKit.topic_title_zh, zhHans: lessonKit.topic_title_zh },
    lessonSlug: lessonKit.lesson_slug,
    lessonTitle: { en: lessonKit.lesson_title_en, zh: lessonKit.lesson_title_zh, zhHans: lessonKit.lesson_title_zh },
    chapterTitle: { en: lessonKit.chapter_title_en, zh: lessonKit.chapter_title_zh, zhHans: lessonKit.chapter_title_zh },
    lessonPeriod: lessonKit.lesson_period,
    lessonType: lessonKit.lesson_type,
    durationMinutes: lessonKit.duration_minutes,
    status: lessonKit.status,
    source: lessonKit.source,
    reviewStatus: lessonKit.review_status,
    generationNotes: { en: lessonKit.generation_notes_en, zh: lessonKit.generation_notes_zh, zhHans: lessonKit.generation_notes_zh },
    sections: lessonKit.sections,
    publishedResourceIds: lessonKit.published_resource_ids,
    assignmentId: lessonKit.assignment_id,
    assessmentId: lessonKit.assessment_id,
    liveSessionId: lessonKit.live_session_id,
    createdAt: lessonKit.created_at,
    updatedAt: lessonKit.updated_at,
    generatedAt: lessonKit.generated_at,
    reviewedAt: lessonKit.reviewed_at,
    publishedAt: lessonKit.published_at
  };
}

function teacherOpsLessonKitHtmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function teacherOpsLessonKitHtml(
  kit: TeacherOpsLessonKitRecord,
  kind: "slides" | "learning-guide" | "homework"
) {
  const sections = kind === "slides"
    ? (kit.sections ?? []).filter((section) => section.kind === "slides" || section.kind === "classroom-activity" || section.kind === "blackboard-design")
    : kind === "learning-guide"
      ? (kit.sections ?? []).filter((section) => section.kind === "learning-guide" || section.kind === "objectives" || section.kind === "key-points" || section.kind === "worked-examples")
      : (kit.sections ?? []).filter((section) => section.kind === "class-practice" || section.kind === "homework");
  const body = sections.map((section) => `
    <section>
      <h2>${teacherOpsLessonKitHtmlEscape(section.title.zhHans ?? section.title.zh)}</h2>
      <p>${teacherOpsLessonKitHtmlEscape(section.content.zhHans ?? section.content.zh)}</p>
      ${section.items.length ? `<ul>${section.items.map((item) => `<li>${teacherOpsLessonKitHtmlEscape(item.zhHans ?? item.zh)}</li>`).join("")}</ul>` : ""}
      ${section.questions?.length ? `<ol>${section.questions.map((question) => `<li><strong>${teacherOpsLessonKitHtmlEscape(question.prompt.zhHans ?? question.prompt.zh)}</strong><br/>答案：${teacherOpsLessonKitHtmlEscape(question.answer)}${question.explanation ? `<br/>解析：${teacherOpsLessonKitHtmlEscape(question.explanation.zhHans ?? question.explanation.zh)}` : ""}</li>`).join("")}</ol>` : ""}
    </section>
  `).join("\n");
  const publisher = kit.textbook_publisher ?? "MAINLAND_PEP";
  const publisherLabel = publisherLabels[publisher];
  const lessonTitleZh = kit.lesson_title_zh ?? kit.id;
  const chapterTitleZh = kit.chapter_title_zh ?? kit.topic_title_zh ?? kit.id;
  const lessonPeriod = kit.lesson_period ?? 1;
  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <title>${teacherOpsLessonKitHtmlEscape(lessonTitleZh)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 40px; color: #0f172a; line-height: 1.65; }
    header { border-bottom: 2px solid #0ea5e9; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { font-size: 30px; margin: 0 0 8px; }
    h2 { break-after: avoid; color: #0369a1; margin-top: 28px; }
    section { page-break-inside: avoid; margin-bottom: 24px; }
    li { margin: 8px 0; }
    @media print { body { margin: 18mm; } }
  </style>
</head>
<body>
  <header>
    <h1>${teacherOpsLessonKitHtmlEscape(lessonTitleZh)}</h1>
    <p>${teacherOpsLessonKitHtmlEscape(publisherLabel.zhHans ?? publisherLabel.zh)} · ${teacherOpsLessonKitHtmlEscape(chapterTitleZh)} · 第 ${lessonPeriod} 课时</p>
  </header>
  ${body}
</body>
</html>`;
}

export function prepareTeacherOpsLessonKitResource({
  createResourceId = (suffix: string) => `resource-${randomUUID()}`,
  html,
  lessonKit,
  now,
  suffix,
  type,
  uploadDirectory
}: {
  createResourceId?: (suffix: string) => string;
  html: string;
  lessonKit: TeacherOpsLessonKitRecord;
  now: string;
  suffix: string;
  type: TeachingResourceType;
  uploadDirectory: string;
}): TeacherOpsLessonKitResourceRecord {
  const resourceId = createResourceId(suffix);
  const fileName = `${resourceId}-${suffix}.html`;
  const storagePath = path.join(uploadDirectory, fileName);
  if (path.dirname(path.resolve(storagePath)) !== path.resolve(uploadDirectory)) {
    throw new Error("Teacher lesson-kit resource path must stay inside the configured upload directory.");
  }
  return {
    id: resourceId,
    title_en: `${lessonKit.lesson_title_en ?? lessonKit.id} ${suffix}`,
    title_zh: `${lessonKit.lesson_title_zh ?? lessonKit.id}${suffix === "slides" ? "课件" : suffix === "guide" ? "导学案" : "练习作业"}`,
    type,
    file_name: fileName,
    file_type: "HTML",
    mime_type: "text/html; charset=utf-8",
    file_size_bytes: Buffer.byteLength(html, "utf8"),
    storage_path: storagePath,
    grade: lessonKit.grade,
    topic_id: lessonKit.topic_id,
    uploaded_by: lessonKit.teacher_id,
    created_at: now
  };
}

async function writeExclusiveTeacherOpsLessonKitResourceFile(storagePath: string, html: string) {
  let file = null as Awaited<ReturnType<typeof open>> | null;
  try {
    file = await open(storagePath, "wx");
    await file.writeFile(html, { encoding: "utf8" });
    await file.close();
    file = null;
  } catch (error) {
    if (file) {
      const cleanupFailures: unknown[] = [];
      try {
        await file.close();
      } catch (closeError) {
        cleanupFailures.push(closeError);
      }
      try {
        await unlink(storagePath);
      } catch (unlinkError) {
        if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") cleanupFailures.push(unlinkError);
      }
      if (cleanupFailures.length) {
        throw new AggregateError([error, ...cleanupFailures], "Teacher lesson-kit partial file compensation failed.");
      }
    }
    throw error;
  }
}

export async function writeTeacherOpsLessonKitResource({
  createResourceId = (suffix: string) => `resource-${randomUUID()}`,
  database,
  html,
  lessonKit,
  now,
  suffix,
  type,
  uploadDirectory
}: {
  createResourceId?: (suffix: string) => string;
  database: TeacherOpsLessonKitPersistenceDatabase;
  html: string;
  lessonKit: TeacherOpsLessonKitRecord;
  now: string;
  suffix: string;
  type: TeachingResourceType;
  uploadDirectory: string;
}): Promise<TeacherOpsLessonKitResourceRecord> {
  const record = prepareTeacherOpsLessonKitResource({
    createResourceId,
    html,
    lessonKit,
    now,
    suffix,
    type,
    uploadDirectory
  });
  await mkdir(uploadDirectory, { recursive: true });
  await writeExclusiveTeacherOpsLessonKitResourceFile(record.storage_path, html);
  database.teaching_resources.unshift(record);
  return record;
}

function teacherCanAccessClass(
  database: TeacherOpsLessonKitPersistenceDatabase,
  user: TeacherOpsLessonKitUserRecord,
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

function boundedInteger(value: number, fallback: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || fallback)));
}

export function createTeacherOpsLessonKitPersistenceStore<TGenerationContext = unknown>({
  buildGenerationContext,
  buildInitialSections,
  createId = randomUUID,
  createResourceId,
  createLiveJoinCode,
  generateSectionsWithAi,
  livePromptOptionsFor,
  mutateDatabase,
  normalizeSections,
  now = () => new Date(),
  readDatabase,
  removeResourceFile = async (storagePath) => {
    try {
      await unlink(storagePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
  resourceUploadDirectory,
  resolveLessonKitTopic,
  toTeacherClass,
  topicOptionsForClasses,
  writeResourceFile = async (storagePath, html) => {
    await mkdir(resourceUploadDirectory, { recursive: true });
    await writeExclusiveTeacherOpsLessonKitResourceFile(storagePath, html);
  }
}: TeacherOpsLessonKitPersistenceStoreDependencies<TGenerationContext>) {
  const runMutation = async <T>(mutator: (database: TeacherOpsLessonKitPersistenceDatabase) => T | Promise<T>) => {
    if (!mutateDatabase) {
      throw new Error("Teacher lesson-kit persistence mutation dependency is not configured.");
    }
    return mutateDatabase(mutator);
  };

  async function getTeacherLessonKitListData(userId: string): Promise<TeacherLessonKitListData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const classRecords = teacherClassRecordsFor(database, user);
    const topicOptions = topicOptionsForClasses(database, classRecords);
    const kits = lessonKitRecordsFor(database, user)
      .map((kit) => teacherOpsLessonKitProjection(database, kit))
      .filter((kit): kit is TeacherLessonKit => Boolean(kit));

    return {
      generatedAt: now().toISOString(),
      classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
      topicOptions,
      kits,
      totals: {
        kits: kits.length,
        needsReview: kits.filter((kit) => kit.reviewStatus === "needs-review").length,
        published: kits.filter((kit) => kit.status === "published").length,
        mainlandTopics: topicOptions.length
      }
    };
  }

  async function getTeacherLessonKitCreateData(userId: string): Promise<TeacherLessonKitCreateData | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const classRecords = teacherClassRecordsFor(database, user);
    return {
      classes: classRecords.map((teacherClass) => toTeacherClass(database, teacherClass)),
      topicOptions: topicOptionsForClasses(database, classRecords)
    };
  }

  async function getTeacherLessonKitDetailData(userId: string, kitId: string): Promise<TeacherLessonKit | null> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === userId);
    if (!canUseTeacherArea(user)) return null;

    const record = lessonKitRecordsFor(database, user).find((kit) => kit.id === kitId);
    return record ? teacherOpsLessonKitProjection(database, record) : null;
  }

  async function createTeacherLessonKit({
    teacherId,
    classId,
    publisher,
    topicId,
    lessonPeriod,
    lessonType,
    durationMinutes
  }: TeacherOpsLessonKitCreationInput): Promise<TeacherOpsLessonKitCreationResult> {
    if (!mainlandLessonKitPublishers.has(publisher) || !validLessonTypes.has(lessonType)) {
      return { status: "invalid" };
    }

    return runMutation((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" };

      const teacherClass = teacherCanAccessClass(database, user, classId);
      if (!teacherClass) return { status: "not-found" };

      const topic = resolveLessonKitTopic(database, teacherClass, topicId, publisher);
      if (!topic) return { status: "topic-not-found" };

      const nowIso = now().toISOString();
      const kit: TeacherOpsLessonKitRecord = {
        id: `lesson-kit-${createId()}`,
        teacher_id: user.id,
        class_id: teacherClass.id,
        grade: teacherClass.grade,
        curriculum_region: "MAINLAND",
        textbook_publisher: publisher,
        topic_id: topic.id,
        topic_title_en: topic.title.en,
        topic_title_zh: topic.title.zh,
        lesson_slug: topic.lesson?.slug,
        lesson_title_en: topic.lesson?.title.en ?? topic.title.en,
        lesson_title_zh: topic.lesson?.title.zh ?? topic.title.zh,
        chapter_title_en: topic.title.en,
        chapter_title_zh: topic.title.zh,
        lesson_period: boundedInteger(lessonPeriod, 1, 1, 12),
        lesson_type: lessonType,
        duration_minutes: boundedInteger(durationMinutes, 45, 20, 120),
        status: "draft",
        source: "deterministic",
        review_status: "needs-review",
        generation_notes_en: deterministicGenerationNotes.en,
        generation_notes_zh: deterministicGenerationNotes.zh,
        sections: [],
        published_resource_ids: [],
        created_at: nowIso,
        updated_at: nowIso,
        generated_at: null,
        reviewed_at: null,
        published_at: null
      };

      kit.sections = buildInitialSections(database, kit);
      database.teacher_lesson_kits.unshift(kit);

      const lessonKit = teacherOpsLessonKitProjection(database, kit);
      return lessonKit ? { status: "created", kit: lessonKit } : { status: "invalid" };
    });
  }

  async function updateTeacherLessonKit({
    teacherId,
    kitId,
    sections,
    reviewStatus,
    status
  }: TeacherOpsLessonKitUpdateInput): Promise<TeacherOpsLessonKitUpdateResult> {
    return runMutation((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" };

      const kit = database.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
      if (!kit || !teacherCanAccessClass(database, user, kit.class_id)) return { status: "not-found" };

      const nowIso = now().toISOString();
      if (sections) {
        const normalizedSections = normalizeSections(sections);
        if (!normalizedSections.length) return { status: "invalid" };
        kit.sections = normalizedSections;
        kit.review_status = "needs-review";
        kit.status = kit.status === "published" ? "published" : "draft";
      }
      if (reviewStatus) {
        if (!validReviewStatuses.has(reviewStatus)) return { status: "invalid" };
        kit.review_status = reviewStatus;
        kit.reviewed_at = reviewStatus === "approved" ? nowIso : null;
        if (reviewStatus === "approved" && kit.status !== "published") kit.status = "reviewed";
      }
      if (status) {
        if (!validStatuses.has(status)) return { status: "invalid" };
        kit.status = status;
      }
      kit.updated_at = nowIso;

      const lessonKit = teacherOpsLessonKitProjection(database, kit);
      return lessonKit ? { status: "updated", kit: lessonKit } : { status: "invalid" };
    });
  }

  async function generateTeacherLessonKitWithAI({
    teacherId,
    kitId
  }: TeacherOpsLessonKitAiGenerationInput): Promise<TeacherOpsLessonKitAiGenerationStoreResult> {
    const database = await readDatabase();
    const user = database.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(user)) return { status: "forbidden" };

    const kit = database.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
    if (!kit || !teacherCanAccessClass(database, user, kit.class_id)) return { status: "not-found" };

    const context = buildGenerationContext(database, kit);
    if (!context) return { status: "invalid" };

    const generation = await generateSectionsWithAi(context);
    if (generation.status !== "generated") return { status: generation.status };

    return runMutation((mutableDatabase) => {
      const mutableUser = mutableDatabase.users.find((candidate) => candidate.id === teacherId);
      const mutableKit = mutableDatabase.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
      if (!canUseTeacherArea(mutableUser)) return { status: "forbidden" };
      if (!mutableKit || !teacherCanAccessClass(mutableDatabase, mutableUser, mutableKit.class_id)) return { status: "not-found" };

      const nowIso = now().toISOString();
      mutableKit.sections = generation.sections;
      mutableKit.status = "generated";
      mutableKit.source = "ai";
      mutableKit.review_status = "needs-review";
      mutableKit.generated_at = nowIso;
      mutableKit.updated_at = nowIso;
      mutableKit.generation_notes_en = generation.notesEn;
      mutableKit.generation_notes_zh = generation.notesZh;

      const lessonKit = teacherOpsLessonKitProjection(mutableDatabase, mutableKit);
      return lessonKit ? { status: "generated", kit: lessonKit } : { status: "invalid" };
    });
  }

  async function publishTeacherLessonKit({
    teacherId,
    kitId
  }: TeacherOpsLessonKitPublishInput): Promise<TeacherOpsLessonKitPublishStoreResult> {
    const preflightDatabase = await readDatabase();
    const preflightUser = preflightDatabase.users.find((candidate) => candidate.id === teacherId);
    if (!canUseTeacherArea(preflightUser)) return { status: "forbidden" };

    const preflightKit = preflightDatabase.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
    const preflightClass = preflightKit
      ? teacherCanAccessClass(preflightDatabase, preflightUser, preflightKit.class_id)
      : null;
    if (!preflightKit || !preflightClass) return { status: "not-found" };
    if (preflightKit.review_status !== "approved") return { status: "needs-review" };
    if (preflightKit.status === "published") {
      return {
        status: "published",
        result: {
          resourceIds: preflightKit.published_resource_ids ?? [],
          assignmentId: preflightKit.assignment_id,
          assessmentId: preflightKit.assessment_id,
          liveSessionId: preflightKit.live_session_id
        },
        kit: teacherOpsLessonKitProjection(preflightDatabase, preflightKit)
      };
    }

    const preflightUpdatedAt = preflightKit.updated_at;
    const preflightStatus = preflightKit.status;
    const nowDate = now();
    const nowIso = nowDate.toISOString();
    const resourceArtifacts = [
      { kind: "slides" as const, suffix: "slides", type: "slides" as const },
      { kind: "learning-guide" as const, suffix: "guide", type: "worksheet" as const },
      { kind: "homework" as const, suffix: "practice", type: "practice" as const }
    ].map(({ kind, suffix, type }) => {
      const html = teacherOpsLessonKitHtml(preflightKit, kind);
      return {
        html,
        record: prepareTeacherOpsLessonKitResource({
          createResourceId,
          html,
          lessonKit: preflightKit,
          now: nowIso,
          suffix,
          type,
          uploadDirectory: resourceUploadDirectory
        })
      };
    });
    const [slideArtifact, guideArtifact, practiceArtifact] = resourceArtifacts;
    if (!slideArtifact || !guideArtifact || !practiceArtifact) {
      throw new Error("Teacher lesson-kit publication must prepare exactly three resources.");
    }

    const writtenPaths: string[] = [];
    const removeWrittenResources = async () => {
      const failures: unknown[] = [];
      for (const storagePath of [...writtenPaths].reverse()) {
        try {
          await removeResourceFile(storagePath);
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length) {
        throw new AggregateError(failures, "Could not compensate teacher lesson-kit resource files.");
      }
    };

    try {
      for (const artifact of resourceArtifacts) {
        await writeResourceFile(artifact.record.storage_path, artifact.html);
        writtenPaths.push(artifact.record.storage_path);
      }
    } catch (error) {
      try {
        await removeWrittenResources();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Teacher lesson-kit resource preparation and compensation both failed.");
      }
      throw error;
    }

    const slideResource = slideArtifact.record;
    const guideResource = guideArtifact.record;
    const practiceResource = practiceArtifact.record;
    const plannedResourceIds = resourceArtifacts.map(({ record }) => record.id);

    let result: TeacherOpsLessonKitPublishStoreResult;
    try {
      result = await runMutation((database) => {
        const user = database.users.find((candidate) => candidate.id === teacherId);
        if (!canUseTeacherArea(user)) return { status: "forbidden" };

        const kit = database.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
        const teacherClass = kit ? teacherCanAccessClass(database, user, kit.class_id) : null;
        if (!kit || !teacherClass) return { status: "not-found" };
        if (kit.review_status !== "approved") return { status: "needs-review" };

        if (kit.status === "published") {
          return {
            status: "published",
            result: {
              resourceIds: kit.published_resource_ids ?? [],
              assignmentId: kit.assignment_id,
              assessmentId: kit.assessment_id,
              liveSessionId: kit.live_session_id
            },
            kit: teacherOpsLessonKitProjection(database, kit)
          };
        }
        if (kit.updated_at !== preflightUpdatedAt || kit.status !== preflightStatus) {
          throw new Error("Teacher lesson-kit changed after publication preflight.");
        }
        if (resourceArtifacts.some(({ record }) => database.teaching_resources.some((resource) => resource.id === record.id))) {
          throw new Error("Teacher lesson-kit resource identity already exists.");
        }

        database.teaching_resources.unshift(slideResource);
        database.teaching_resources.unshift(guideResource);
        database.teaching_resources.unshift(practiceResource);

        const lessonTitleEn = kit.lesson_title_en ?? kit.id;
        const lessonTitleZh = kit.lesson_title_zh ?? kit.id;
        const topicTitleEn = kit.topic_title_en ?? lessonTitleEn;
        const topicTitleZh = kit.topic_title_zh ?? lessonTitleZh;
      const resourceIds = [slideResource.id, guideResource.id, practiceResource.id];

      const assignmentId = `assignment-${createId()}`;
      database.assignments.unshift({
        id: assignmentId,
        class_id: kit.class_id,
        title_en: `${lessonTitleEn} learning guide`,
        title_zh: `${lessonTitleZh}导学案与作业`,
        description_en: "Generated from the teacher-reviewed lesson kit.",
        description_zh: "由教师审核后的备课包生成。",
        content_type: "resource",
        target_id: guideResource.id,
        status: "active",
        due_at: new Date(nowDate.getTime() + publishDueMs).toISOString(),
        allow_retake: true,
        show_answers: false,
        count_towards_grade: true,
        created_by: user.id,
        created_at: nowIso,
        updated_at: nowIso
      });

      teacherOpsLessonKitStudentIdsForClass(database, kit.class_id).forEach((studentId) => {
        database.submissions.push({
          id: `submission-${createId()}`,
          assignment_id: assignmentId,
          student_id: studentId,
          status: "not-started",
          score: null,
          submitted_at: null,
          graded_at: null,
          feedback_en: "",
          feedback_zh: "",
          updated_at: nowIso
        });
      });

      const paperSections = teacherOpsLessonKitAssessmentSections(kit);
      const assessmentId = paperSections.length ? `assessment-${createId()}` : undefined;
      if (assessmentId) {
        database.assessments.unshift({
          id: assessmentId,
          class_id: kit.class_id,
          title_en: `${lessonTitleEn} class practice`,
          title_zh: `${lessonTitleZh}课堂练习`,
          type: "quiz",
          status: "open",
          source_type: "mixed",
          source_resource_id: practiceResource.id,
          question_ids: paperSections.flatMap((section) => section.items.map((item) => item.questionId).filter((questionId): questionId is string => Boolean(questionId))),
          manual_questions: [],
          paper_sections: paperSections,
          opens_at: null,
          closes_at: null,
          time_limit_minutes: Math.max(10, Math.min(45, Math.round((kit.duration_minutes ?? 45) / 2))),
          max_attempts: 1,
          randomize_question_order: false,
          show_answers_immediately: false,
          grade_weight: 10,
          created_by: user.id,
          created_at: nowIso,
          updated_at: nowIso
        });
        teacherOpsLessonKitStudentIdsForClass(database, kit.class_id).forEach((studentId) => {
          database.assessment_submissions.push({
            id: `assessment-submission-${createId()}`,
            assessment_id: assessmentId,
            student_id: studentId,
            status: "not-started",
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

      database.teacher_live_sessions
        .filter((session) => session.class_id === kit.class_id && session.status === "active")
        .forEach((session) => {
          session.status = "ended";
          session.ended_at = nowIso;
          session.updated_at = nowIso;
        });

      const liveSessionId = `live-${createId()}`;
      const promptId = `live-prompt-${createId()}`;
      database.teacher_live_sessions.unshift({
        id: liveSessionId,
        class_id: kit.class_id,
        teacher_id: user.id,
        status: "active",
        title_en: `${lessonTitleEn} live lesson`,
        title_zh: `${lessonTitleZh}授课`,
        lesson_slug: kit.lesson_slug,
        lesson_title_en: lessonTitleEn,
        lesson_title_zh: lessonTitleZh,
        topic_id: kit.topic_id,
        topic_title_en: topicTitleEn,
        topic_title_zh: topicTitleZh,
        visualization_title_en: `${topicTitleEn} classroom activity`,
        visualization_title_zh: `${topicTitleZh}课堂活动`,
        join_code: createLiveJoinCode(database, teacherClass),
        current_prompt_id: promptId,
        lesson_kit_id: kit.id,
        started_at: nowIso,
        ended_at: null,
        created_at: nowIso,
        updated_at: nowIso
      });
      database.teacher_live_prompts.push({
        id: promptId,
        session_id: liveSessionId,
        type: "exit-ticket",
        question_en: "Exit ticket: which step still needs one more example?",
        question_zh: "离堂反馈：哪一步还需要再讲一个例子？",
        options: livePromptOptionsFor("exit-ticket"),
        created_at: nowIso
      });

      kit.published_resource_ids = resourceIds;
      kit.assignment_id = assignmentId;
      kit.assessment_id = assessmentId;
      kit.live_session_id = liveSessionId;
      kit.status = "published";
      kit.published_at = nowIso;
      kit.updated_at = nowIso;

      return {
        status: "published",
        result: {
          resourceIds,
          assignmentId,
          assessmentId,
          liveSessionId
        },
        kit: teacherOpsLessonKitProjection(database, kit)
      };
      });
    } catch (error) {
      const durableDatabase = await readDatabase().catch(() => null);
      const durableKit = durableDatabase?.teacher_lesson_kits.find((candidate) => candidate.id === kitId);
      if (
        durableDatabase &&
        durableKit?.status === "published" &&
        plannedResourceIds.every((resourceId) => durableKit.published_resource_ids?.includes(resourceId))
      ) {
        return {
          status: "published",
          result: {
            resourceIds: durableKit.published_resource_ids ?? [],
            assignmentId: durableKit.assignment_id,
            assessmentId: durableKit.assessment_id,
            liveSessionId: durableKit.live_session_id
          },
          kit: teacherOpsLessonKitProjection(durableDatabase, durableKit)
        };
      }
      try {
        await removeWrittenResources();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Teacher lesson-kit database mutation and compensation both failed.");
      }
      throw error;
    }

    const ownsPublishedFiles = result.status === "published" &&
      plannedResourceIds.every((resourceId) => result.result.resourceIds.includes(resourceId));
    if (!ownsPublishedFiles) {
      await removeWrittenResources();
    }
    return result;
  }

  return {
    createTeacherLessonKit,
    generateTeacherLessonKitWithAI,
    getTeacherLessonKitListData,
    getTeacherLessonKitCreateData,
    getTeacherLessonKitDetailData,
    publishTeacherLessonKit,
    updateTeacherLessonKit
  };
}
