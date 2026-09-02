import type { GradeId } from "@/types";
import type { CcssTextbookLessonSource } from "@/data/ccssTextbookRegistry";

/**
 * Data contract for the California interactive textbook routes. Built on the
 * server by `californiaInteractiveTextbookData.ts` (which reads the topic and
 * assignment registries) and rendered on the client by
 * `CcssInteractiveTextbook.tsx`, which mounts the interactive lesson bodies
 * through the code-split CCSS routes. Kept type-only so the client component
 * never imports the server-side registries.
 */

export type InteractiveTextbookCheck = {
  id: string;
  kind: "numeric" | "mc";
  prompt: string;
  /** Multiple-choice options; `answer` is one of them. */
  choices?: string[];
  answer: string;
  explanation: string;
};

export type InteractiveTextbookLesson = {
  slug: string;
  title: string;
  emoji: string;
  summary: string;
  standardIds: string[];
  source: CcssTextbookLessonSource;
  /** The chapter opener renders expanded; the ported lessons open on demand. */
  role: "opener" | "lesson";
};

export type InteractiveTextbookPlacement = {
  pathwayLabel: string;
  conceptualCategory: string;
  domainCode: string;
  prerequisiteDomains: readonly string[];
};

export type InteractiveTextbookChapter = {
  topicId: string;
  anchor: string;
  chapterNumber: number;
  title: string;
  grade: GradeId;
  gradeLabel: string;
  lessonHref: string;
  standards: Array<{ id: string; description: string }>;
  lessons: InteractiveTextbookLesson[];
  checks: InteractiveTextbookCheck[];
  placement?: InteractiveTextbookPlacement;
};

export type InteractiveTextbookGroup = {
  grade: GradeId;
  gradeLabel: string;
  courseLabel: string;
  chapters: InteractiveTextbookChapter[];
};
