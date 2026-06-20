import { redirect } from "next/navigation";
import { LessonView } from "@/components/lesson/LessonView";
import { requireLessonAuthentication } from "@/components/lesson/lessonAuthGate";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { decodeLessonRouteSlug, lessonHrefForSlug } from "@/lib/lessonLinks";
import type { LessonDetail, LessonSummary } from "@/types";

const lessonPracticeQuestionLimit = 5;
const handwritingCapableQuestionTypes = new Set(["fill-in", "short-answer", "graph"]);

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

  return <LessonView slug={displaySlug} initialLesson={initialLesson} gradeLessons={gradeLessons} />;
}
