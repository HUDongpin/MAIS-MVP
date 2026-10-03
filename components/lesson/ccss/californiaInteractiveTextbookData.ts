import { findStandard } from "@/data/ccss";
import { ccssLessonMetasForTopic } from "@/data/ccssLessonAssignments";
import claudeSnapshotJson from "@/data/generated-content/ccss-textbook-claude-v1/source.json";
import { usCaliforniaTopics } from "@/data/usCaliforniaTopics";
import { formatGradeLabelForCurriculum } from "@/lib/i18n";
import { lessonHrefForTopicId } from "@/lib/lessonLinks";
import type { GradeId } from "@/types";
import type {
  InteractiveTextbookChapter,
  InteractiveTextbookCheck,
  InteractiveTextbookGroup,
  InteractiveTextbookLesson,
  InteractiveTextbookPlacement
} from "./interactiveTextbookTypes";

/**
 * Server-side builder for the California interactive textbook routes.
 *
 * A chapter is a G6-G12 California chapter topic (`us-ca-math-<grade>-chapter-NN`).
 * Its lessons are exactly the interactive CCSS lessons the lesson page renders
 * for that topic (`ccssLessonAssignments`, opener first), so the textbook route
 * and the lesson page can never disagree about what a chapter teaches. The
 * chapter check questions come from the MAIS-authored snapshot the openers were
 * built from (`ccss-textbook-claude-v1`), hand-solved by the author and re-solved
 * by an independent verifier before landing.
 */

type SnapshotPractice = {
  kind: "numeric" | "mc";
  prompt: string;
  answer: number | string;
  choices?: Array<string | number>;
  tolerance?: number;
  explanation: string;
};

type ClaudeSnapshot = {
  practiceBySlug?: Record<string, SnapshotPractice[]>;
};

const chapterTopicPattern = /^us-ca-math-(?:p6|s[1-6])-chapter-(\d{2})$/;
const knowledgePointCodePrefixPattern = /^\d+-[A-Z]\.\d+\s+/;

const practiceBySlug = (claudeSnapshotJson as ClaudeSnapshot).practiceBySlug ?? {};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

/** "6-A.1 Ratios, Rates, and Percent Reasoning" -> "Ratios, Rates, and Percent Reasoning". */
export function californiaChapterTitle(topicTitleEn: string) {
  return topicTitleEn.replace(knowledgePointCodePrefixPattern, "").trim();
}

function toCheck(slug: string, practice: SnapshotPractice, index: number): InteractiveTextbookCheck {
  const id = `${slug}-check-${index + 1}`;
  if (practice.kind === "mc") {
    const choices = (practice.choices ?? []).map(String);
    const answerIndex = typeof practice.answer === "number" ? practice.answer : choices.indexOf(String(practice.answer));
    return {
      id,
      kind: "mc",
      prompt: practice.prompt,
      choices,
      answer: choices[answerIndex] ?? String(practice.answer),
      explanation: practice.explanation
    };
  }
  return {
    id,
    kind: "numeric",
    prompt: practice.prompt,
    answer: String(practice.answer),
    explanation: practice.explanation
  };
}

export function californiaChapterTopicIds(grade: GradeId) {
  return usCaliforniaTopics
    .filter((topic) => topic.grade === grade && chapterTopicPattern.test(topic.id))
    .map((topic) => topic.id);
}

export function buildCaliforniaInteractiveTextbookGroups(
  grades: GradeId[],
  placementByTopicId: ReadonlyMap<string, InteractiveTextbookPlacement> = new Map()
): InteractiveTextbookGroup[] {
  return grades
    .map((grade): InteractiveTextbookGroup => {
      const gradeLabel = formatGradeLabelForCurriculum(grade, "en", "US_CA_MATH");
      const chapters = usCaliforniaTopics
        .filter((topic) => topic.grade === grade && chapterTopicPattern.test(topic.id))
        .map((topic): InteractiveTextbookChapter => {
          const chapterNumber = Number(topic.id.match(chapterTopicPattern)?.[1] ?? "0");
          const metas = ccssLessonMetasForTopic(topic.id);
          const lessons = metas.map((meta): InteractiveTextbookLesson => ({
            slug: meta.slug,
            title: meta.title,
            emoji: meta.emoji,
            summary: meta.summary,
            standardIds: meta.standardIds,
            source: meta.source,
            role: meta.source === "mais-claude" && meta.topicId === topic.id ? "opener" : "lesson"
          }));
          const opener = lessons.find((lesson) => lesson.role === "opener");
          const standards = unique(metas.flatMap((meta) => meta.standardIds)).map((id) => ({
            id,
            description: findStandard(id)?.standard.description ?? ""
          }));
          return {
            topicId: topic.id,
            anchor: topic.id.replace(/^us-ca-math-/, ""),
            chapterNumber,
            title: californiaChapterTitle(topic.title.en),
            grade,
            gradeLabel,
            lessonHref: lessonHrefForTopicId(topic.id),
            standards,
            lessons,
            checks: opener ? (practiceBySlug[opener.slug] ?? []).map((practice, index) => toCheck(opener.slug, practice, index)) : [],
            placement: placementByTopicId.get(topic.id)
          };
        })
        .sort((left, right) => left.chapterNumber - right.chapterNumber);
      return { grade, gradeLabel, courseLabel: `${gradeLabel} Mathematics`, chapters };
    })
    .filter((group) => group.chapters.length > 0);
}
