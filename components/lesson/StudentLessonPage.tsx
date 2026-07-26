import { redirect } from "next/navigation";
import { LessonView } from "@/components/lesson/LessonView";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { decodeLessonRouteSlug, lessonHrefForSlug } from "@/lib/lessonLinks";
import type { FeaturedLabDefinition } from "@/data/visualizationLabs";
import type { LessonDetail, LessonSummary } from "@/types";

const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);

// Lesson visualization module ids that render through ConfiguredVisualizationLab. Only these
// consume the resolved `lab`. Resolving it here (server) means the client never imports
// @/data/visualizationLabs, which statically pulls @/data/topics and every region's
// question-bank JSON (tens of MB) into the lesson bundle.
const configuredVisualizationModuleIds = new Set(["configured-visualization-lab", "signature-lab"]);

async function resolveVisualizationLabForLesson(
  lesson: LessonDetail | null
): Promise<FeaturedLabDefinition | null> {
  if (!lesson) return null;
  const visualizationBlock = lesson.blocks.find((block) => block.type === "visualization");
  const moduleId = visualizationBlock?.visualizationConfig?.moduleId;
  if (!moduleId || !configuredVisualizationModuleIds.has(moduleId)) return null;

  const topicId = visualizationBlock?.visualizationConfig?.topicId ?? lesson.topicId;
  const { getPrimaryVisualizationLabForTopic } = await import("@/data/visualizationLabs");
  return getPrimaryVisualizationLabForTopic(topicId) ?? null;
}

function selectLessonPracticeQuestions(questions: LessonDetail["practiceQuestions"]) {
  const dedupedQuestions = dedupePracticeQuestions(questions);
  const selectedQuestions = dedupedQuestions.slice(0, lessonPracticeQuestionLimit);

  if (selectedQuestions.some((question) => handwritingCapableQuestionTypes.has(question.type))) {
    return selectedQuestions;
  }

  const handwritingQuestion = dedupedQuestions.find((question) => handwritingCapableQuestionTypes.has(question.type));
  if (!handwritingQuestion) return selectedQuestions;

  return [
    ...selectedQuestions.slice(0, Math.max(0, lessonPracticeQuestionLimit - 1)),
    handwritingQuestion
  ];
}

function limitLessonPracticeQuestions(lesson: LessonDetail | null) {
  if (!lesson || lesson.practiceQuestions.length <= lessonPracticeQuestionLimit) return lesson;

  const practiceQuestions = selectLessonPracticeQuestions(lesson.practiceQuestions);
  const practiceQuestionIds = new Set(practiceQuestions.map((question) => question.id));

  return {
    ...lesson,
    practiceQuestions,
    blocks: lesson.blocks.map((block) => {
      if (block.type !== "practice") return block;

      return {
        ...block,
        practiceQuestionIds: block.practiceQuestionIds?.filter((questionId) => practiceQuestionIds.has(questionId))
      };
    })
  };
}

export async function StudentLessonPage({ lessonSlug }: { lessonSlug: string }) {
  const slug = decodeLessonRouteSlug(lessonSlug);
  const authenticated = await requireLessonAuthentication(lessonHrefForSlug(slug));
  const curriculumProfile = authenticated.user.curriculumProfile ?? "HK";
  const { getLessonBySlug, getLessonEntryTarget, getRoadmapData } = await import("@/lib/server/userStore");
  const initialLesson = limitLessonPracticeQuestions(
    await getLessonBySlug(null, slug, curriculumProfile)
  );
  const studentUser = authenticated?.user.role === "student" ? authenticated.user : null;
  const displaySlug = initialLesson?.slug ?? slug;

  if (authenticated && studentUser && !initialLesson) {
    const lessonEntryTarget = await getLessonEntryTarget(
      studentUser.id,
      authenticated.settings.selectedGrade,
      studentUser.curriculumProfile
    );

    if (lessonEntryTarget?.href && lessonEntryTarget.slug !== slug) {
      redirect(lessonEntryTarget.href);
    }
  }

  let gradeLessons: LessonSummary[] = [];
  if (initialLesson) {
    const roadmapCurriculumProfile = authenticated.user.curriculumProfile ?? initialLesson.curriculumProfile ?? "HK";
    const gradeRoadmap = await getRoadmapData(
      null,
      initialLesson.grade,
      roadmapCurriculumProfile
    );
    gradeLessons = gradeRoadmap.lessons;
  }

  const visualizationLab = await resolveVisualizationLabForLesson(initialLesson);

  return (
    <LessonView
      slug={displaySlug}
      initialLesson={initialLesson}
      gradeLessons={gradeLessons}
      visualizationLab={visualizationLab}
    />
  );
}
