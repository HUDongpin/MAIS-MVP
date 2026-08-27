import { createHash } from "node:crypto";
import type {
  Language,
  LocalizedText,
  TeacherLessonKit,
  TeacherLessonKitSection,
  TeacherLessonKitSectionKind
} from "@/types";

export const teacherCoursewareSchemaVersion = "mais-courseware-manifest@1" as const;

export type TeacherCoursewareLanguage = Extract<Language, "en" | "zh" | "zh-Hans">;
export type TeacherCoursewareFormat = "html" | "pptx" | "pdf";
export type TeacherCoursewareQualityStatus = "ready" | "review-required" | "blocked";

export type TeacherCoursewareObjective = {
  id: string;
  order: number;
  statement: LocalizedText;
  sourceSectionId: string;
};

export type TeacherCoursewareActivity = {
  id: string;
  kind: "guided-practice" | "independent-practice" | "classroom-activity" | "worked-example";
  order: number;
  title: LocalizedText;
  instructions: LocalizedText;
  itemIds: string[];
  objectiveIds: string[];
  alignmentBasis: "kit-level-inference";
  sourceSectionId: string;
};

export type TeacherCoursewareAssessmentItem = {
  id: string;
  order: number;
  prompt: LocalizedText;
  answer: string;
  explanation?: LocalizedText;
  objectiveIds: string[];
  alignmentBasis: "kit-level-inference";
  source: "question-bank" | "ai-generated" | "manual";
  validationStatus: "validated" | "needs-review";
  sourceSectionId: string;
};

export type TeacherCoursewareAlignment = {
  objectiveId: string;
  taughtBySectionIds: string[];
  practisedByActivityIds: string[];
  assessedByItemIds: string[];
  status: "covered" | "partial" | "uncovered";
  basis: "kit-level-inference";
};

export type TeacherCoursewareQualityIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
  objectiveId?: string;
  itemId?: string;
};

export type TeacherCoursewareQualityCriterion = {
  id: "objectives" | "instruction" | "practice" | "assessment" | "review" | "export-readiness";
  label: string;
  earned: number;
  possible: number;
  evidenceIds: string[];
};

export type TeacherCoursewareManifest = {
  schemaVersion: typeof teacherCoursewareSchemaVersion;
  id: string;
  source: {
    type: "teacher-lesson-kit";
    kitId: string;
    teacherId: string;
    classId: string;
    sourceMode: TeacherLessonKit["source"];
    reviewStatus: TeacherLessonKit["reviewStatus"];
    status: TeacherLessonKit["status"];
    createdAt: string;
    updatedAt: string;
  };
  identity: {
    title: LocalizedText;
    chapterTitle: LocalizedText;
    topicTitle: LocalizedText;
    grade: TeacherLessonKit["grade"];
    publisher: TeacherLessonKit["publisher"];
    topicId: string;
    lessonSlug?: string;
    lessonPeriod: number;
    lessonType: TeacherLessonKit["lessonType"];
    durationMinutes: number;
  };
  version: {
    sourceRevision: string;
    contentHash: string;
  };
  sections: Array<{
    id: string;
    kind: TeacherLessonKitSectionKind;
    order: number;
    title: LocalizedText;
    content: LocalizedText;
    items: Array<{ id: string; order: number; text: LocalizedText }>;
    estimatedMinutes?: number;
  }>;
  objectives: TeacherCoursewareObjective[];
  activities: TeacherCoursewareActivity[];
  assessmentItems: TeacherCoursewareAssessmentItem[];
  alignment: TeacherCoursewareAlignment[];
  sourceLedger: Array<{
    id: string;
    kind: "lesson-kit" | "question-bank" | "ai-generated" | "manual";
    reviewStatus: "approved" | "validated" | "needs-review";
    sourceIds: string[];
  }>;
  exportContracts: Array<{
    format: TeacherCoursewareFormat;
    renderer: string;
    contentSource: "canonical-manifest";
  }>;
  quality: {
    status: TeacherCoursewareQualityStatus;
    score: number;
    possible: number;
    criteria: TeacherCoursewareQualityCriterion[];
    issues: TeacherCoursewareQualityIssue[];
  };
};

const teachingKinds = new Set<TeacherLessonKitSectionKind>([
  "lesson-plan",
  "learning-guide",
  "slides",
  "blackboard-design",
  "key-points",
  "worked-examples"
]);

const activityKinds = new Set<TeacherLessonKitSectionKind>([
  "worked-examples",
  "class-practice",
  "homework",
  "classroom-activity"
]);

function localized(value: LocalizedText): LocalizedText {
  const en = value.en?.trim() || value.zhHans?.trim() || value.zh?.trim() || "";
  const zh = value.zh?.trim() || value.zhHans?.trim() || value.en?.trim() || "";
  const zhHans = value.zhHans?.trim() || value.zh?.trim() || value.en?.trim() || "";
  return { en, zh, zhHans };
}

function shortHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 16);
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)])
    );
  }
  return value;
}

export function stableTeacherCoursewareJson(value: unknown) {
  return JSON.stringify(stableValue(value));
}

function activityKind(section: TeacherLessonKitSection): TeacherCoursewareActivity["kind"] {
  if (section.kind === "worked-examples") return "worked-example";
  if (section.kind === "classroom-activity") return "classroom-activity";
  if (section.kind === "homework") return "independent-practice";
  return "guided-practice";
}

function sectionItems(section: TeacherLessonKitSection) {
  return section.items.map((item, index) => ({
    id: `${section.id}:item:${shortHash(`${index}:${stableTeacherCoursewareJson(localized(item))}`)}`,
    order: index,
    text: localized(item)
  }));
}

function objectiveCandidates(kit: TeacherLessonKit): Array<{ section: TeacherLessonKitSection; statement: LocalizedText; order: number }> {
  const objectiveSections = kit.sections
    .filter((section) => section.kind === "objectives")
    .sort((left, right) => left.order - right.order);

  return objectiveSections.flatMap((section) => {
    const statements = section.items.length ? section.items : [section.content];
    return statements
      .map((statement, index) => ({ section, statement: localized(statement), order: index }))
      .filter(({ statement }) => Boolean(statement.en || statement.zh || statement.zhHans));
  });
}

function qualityFor(input: {
  kit: TeacherLessonKit;
  objectives: TeacherCoursewareObjective[];
  teachingSectionIds: string[];
  activities: TeacherCoursewareActivity[];
  assessmentItems: TeacherCoursewareAssessmentItem[];
  alignment: TeacherCoursewareAlignment[];
}): TeacherCoursewareManifest["quality"] {
  const { kit, objectives, teachingSectionIds, activities, assessmentItems, alignment } = input;
  const issues: TeacherCoursewareQualityIssue[] = [];

  if (!objectives.length) {
    issues.push({ code: "objectives.missing", severity: "error", message: "The lesson kit has no observable objective statements." });
  }
  if (!teachingSectionIds.length) {
    issues.push({ code: "instruction.missing", severity: "error", message: "No instructional section teaches the stated objectives." });
  }
  if (!activities.length) {
    issues.push({ code: "practice.missing", severity: "error", message: "No guided, independent, worked-example, or classroom practice is present." });
  }
  if (!assessmentItems.length) {
    issues.push({ code: "assessment.missing", severity: "error", message: "No assessment item provides evidence for the objectives." });
  }
  for (const relation of alignment) {
    if (relation.status !== "covered") {
      issues.push({
        code: `alignment.${relation.status}`,
        severity: "error",
        objectiveId: relation.objectiveId,
        message: `Objective ${relation.objectiveId} is ${relation.status}; instruction, practice, and assessment evidence are all required.`
      });
    }
  }
  for (const item of assessmentItems.filter((candidate) => candidate.validationStatus === "needs-review")) {
    issues.push({
      code: "assessment.needs-review",
      severity: "warning",
      itemId: item.id,
      message: `Assessment item ${item.id} requires teacher review before publication.`
    });
  }
  if (kit.source === "ai" && kit.reviewStatus !== "approved") {
    issues.push({
      code: "ai.review-required",
      severity: "warning",
      message: "AI-generated lesson-kit content has not been approved by the teacher."
    });
  }
  if (objectives.length && alignment.length) {
    issues.push({
      code: "alignment.kit-level-inference",
      severity: "warning",
      message: "Objective mappings are inferred at whole-kit level because the stored lesson kit has no explicit objective IDs on activities or questions."
    });
  }

  const validatedAssessments = assessmentItems.filter((item) => item.validationStatus === "validated").length;
  const coveredObjectives = alignment.filter((relation) => relation.status === "covered").length;
  const criteria: TeacherCoursewareQualityCriterion[] = [
    { id: "objectives", label: "Observable objectives", earned: objectives.length ? 15 : 0, possible: 15, evidenceIds: objectives.map((item) => item.id) },
    { id: "instruction", label: "Instructional coverage", earned: teachingSectionIds.length ? 20 : 0, possible: 20, evidenceIds: teachingSectionIds },
    { id: "practice", label: "Active practice", earned: activities.length ? 20 : 0, possible: 20, evidenceIds: activities.map((item) => item.id) },
    { id: "assessment", label: "Assessment evidence", earned: assessmentItems.length ? 20 : 0, possible: 20, evidenceIds: assessmentItems.map((item) => item.id) },
    {
      id: "review",
      label: "Teacher and item review",
      earned: Math.round(15 * (kit.reviewStatus === "approved" ? 0.5 : 0) + 15 * (assessmentItems.length ? validatedAssessments / assessmentItems.length : 0) * 0.5),
      possible: 15,
      evidenceIds: assessmentItems.filter((item) => item.validationStatus === "validated").map((item) => item.id)
    },
    {
      id: "export-readiness",
      label: "Canonical export readiness",
      earned: objectives.length && coveredObjectives === objectives.length ? 10 : 0,
      possible: 10,
      evidenceIds: alignment.filter((relation) => relation.status === "covered").map((relation) => relation.objectiveId)
    }
  ];
  const score = criteria.reduce((sum, criterion) => sum + criterion.earned, 0);
  const possible = criteria.reduce((sum, criterion) => sum + criterion.possible, 0);
  const status: TeacherCoursewareQualityStatus = issues.some((issue) => issue.severity === "error")
    ? "blocked"
    : issues.length
      ? "review-required"
      : "ready";

  return { status, score, possible, criteria, issues };
}

export function buildTeacherCoursewareManifest(kit: TeacherLessonKit): TeacherCoursewareManifest {
  const sections = [...kit.sections]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((section) => ({
      id: section.id,
      kind: section.kind,
      order: section.order,
      title: localized(section.title),
      content: localized(section.content),
      items: sectionItems(section),
      ...(section.estimatedMinutes ? { estimatedMinutes: section.estimatedMinutes } : {})
    }));

  const objectives = objectiveCandidates(kit).map(({ section, statement, order }) => ({
    id: `${section.id}:objective:${shortHash(stableTeacherCoursewareJson(statement))}`,
    order,
    statement,
    sourceSectionId: section.id
  }));
  const objectiveIds = objectives.map((objective) => objective.id);
  const teachingSectionIds = sections.filter((section) => teachingKinds.has(section.kind)).map((section) => section.id);

  const activities = [...kit.sections]
    .filter((section) => activityKinds.has(section.kind))
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .map((section): TeacherCoursewareActivity => ({
      id: `${section.id}:activity`,
      kind: activityKind(section),
      order: section.order,
      title: localized(section.title),
      instructions: localized(section.content),
      itemIds: sectionItems(section).map((item) => item.id),
      objectiveIds,
      alignmentBasis: "kit-level-inference",
      sourceSectionId: section.id
    }));

  const assessmentItems = [...kit.sections]
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    .flatMap((section) => (section.questions ?? []).map((question, index): TeacherCoursewareAssessmentItem => ({
      id: question.questionId?.trim() || `${section.id}:question:${shortHash(`${index}:${stableTeacherCoursewareJson(localized(question.prompt))}`)}`,
      order: index,
      prompt: localized(question.prompt),
      answer: question.answer,
      ...(question.explanation ? { explanation: localized(question.explanation) } : {}),
      objectiveIds,
      alignmentBasis: "kit-level-inference",
      source: question.source,
      validationStatus: question.validationStatus,
      sourceSectionId: section.id
    })));

  const alignment = objectives.map((objective): TeacherCoursewareAlignment => {
    const practisedByActivityIds = activities.filter((activity) => activity.objectiveIds.includes(objective.id)).map((activity) => activity.id);
    const assessedByItemIds = assessmentItems.filter((item) => item.objectiveIds.includes(objective.id)).map((item) => item.id);
    const evidenceCount = Number(Boolean(teachingSectionIds.length)) + Number(Boolean(practisedByActivityIds.length)) + Number(Boolean(assessedByItemIds.length));
    return {
      objectiveId: objective.id,
      taughtBySectionIds: teachingSectionIds,
      practisedByActivityIds,
      assessedByItemIds,
      status: evidenceCount === 3 ? "covered" : evidenceCount ? "partial" : "uncovered",
      basis: "kit-level-inference"
    };
  });

  const sourceKinds = ["question-bank", "ai-generated", "manual"] as const;
  const sourceLedger: TeacherCoursewareManifest["sourceLedger"] = [
    {
      id: `lesson-kit:${kit.id}`,
      kind: "lesson-kit",
      reviewStatus: kit.reviewStatus === "approved" ? "approved" : "needs-review",
      sourceIds: [kit.id]
    },
    ...sourceKinds.flatMap((kind) => {
      const ids = assessmentItems.filter((item) => item.source === kind).map((item) => item.id);
      if (!ids.length) return [];
      return [{
        id: `assessment-source:${kind}`,
        kind,
        reviewStatus: assessmentItems.filter((item) => item.source === kind).every((item) => item.validationStatus === "validated") ? "validated" as const : "needs-review" as const,
        sourceIds: ids
      }];
    })
  ];

  const quality = qualityFor({ kit, objectives, teachingSectionIds, activities, assessmentItems, alignment });
  const manifestWithoutHash = {
    schemaVersion: teacherCoursewareSchemaVersion,
    id: `courseware:${kit.id}`,
    source: {
      type: "teacher-lesson-kit" as const,
      kitId: kit.id,
      teacherId: kit.teacherId,
      classId: kit.classId,
      sourceMode: kit.source,
      reviewStatus: kit.reviewStatus,
      status: kit.status,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt
    },
    identity: {
      title: localized(kit.lessonTitle),
      chapterTitle: localized(kit.chapterTitle),
      topicTitle: localized(kit.topicTitle),
      grade: kit.grade,
      publisher: kit.publisher,
      topicId: kit.topicId,
      ...(kit.lessonSlug ? { lessonSlug: kit.lessonSlug } : {}),
      lessonPeriod: kit.lessonPeriod,
      lessonType: kit.lessonType,
      durationMinutes: kit.durationMinutes
    },
    version: { sourceRevision: kit.updatedAt, contentHash: "" },
    sections,
    objectives,
    activities,
    assessmentItems,
    alignment,
    sourceLedger,
    exportContracts: [
      { format: "html" as const, renderer: "mais-semantic-html@1", contentSource: "canonical-manifest" as const },
      { format: "pptx" as const, renderer: "mais-pptxgenjs@1", contentSource: "canonical-manifest" as const },
      { format: "pdf" as const, renderer: "mais-static-pdf@1", contentSource: "canonical-manifest" as const }
    ],
    quality
  };
  const contentHash = createHash("sha256").update(stableTeacherCoursewareJson(manifestWithoutHash), "utf8").digest("hex");
  return { ...manifestWithoutHash, version: { ...manifestWithoutHash.version, contentHash } };
}

export function teacherCoursewareText(value: LocalizedText, language: TeacherCoursewareLanguage) {
  if (language === "en") return value.en || value.zhHans || value.zh;
  if (language === "zh") return value.zh || value.zhHans || value.en;
  return value.zhHans || value.zh || value.en;
}
