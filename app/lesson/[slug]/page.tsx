import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LessonView } from "@/components/lesson/LessonView";
import { dedupePracticeQuestions } from "@/lib/practiceQuestionDeduping";
import { getAuthenticatedUserFromToken } from "@/lib/server/auth";
import { decodeLessonRouteSlug, lessonHrefForSlug } from "@/lib/lessonLinks";
import { getLessonBySlug, getRoadmapData } from "@/lib/server/userStore";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import type { LessonDetail } from "@/types";

export const runtime = "nodejs";

const lessonPracticeQuestionLimit = 5;

type LessonPageProps = {
  params: Promise<{ slug: string }>;
};

function limitLessonPracticeQuestions(lesson: LessonDetail | null) {
  if (!lesson || lesson.practiceQuestions.length <= lessonPracticeQuestionLimit) return lesson;

  const practiceQuestions = dedupePracticeQuestions(lesson.practiceQuestions).slice(0, lessonPracticeQuestionLimit);
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

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug: routeSlug } = await params;
  const slug = decodeLessonRouteSlug(routeSlug);
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const authenticated = await getAuthenticatedUserFromToken(token);
  const initialLesson = limitLessonPracticeQuestions(
    await getLessonBySlug(authenticated?.user.id ?? null, slug, authenticated?.user.curriculumProfile ?? "HK")
  );
  const studentUser = authenticated?.user.role === "student" ? authenticated.user : null;

  if (studentUser && initialLesson && initialLesson.slug !== slug) {
    redirect(lessonHrefForSlug(initialLesson.slug));
  }

  if (studentUser && initialLesson && initialLesson.grade !== studentUser.grade) {
    const gradeRoadmap = await getRoadmapData(studentUser.id, studentUser.grade, studentUser.curriculumProfile);
    const targetLesson = gradeRoadmap.recommendedLesson ?? gradeRoadmap.lessons[0] ?? null;

    if (targetLesson && targetLesson.slug !== slug) {
      redirect(lessonHrefForSlug(targetLesson.slug));
    }
  }

  if (studentUser && !initialLesson) {
    const gradeRoadmap = await getRoadmapData(studentUser.id, studentUser.grade, studentUser.curriculumProfile);
    const targetLesson = gradeRoadmap.recommendedLesson ?? gradeRoadmap.lessons[0] ?? null;

    if (targetLesson && targetLesson.slug !== slug) {
      redirect(lessonHrefForSlug(targetLesson.slug));
    }
  }

  return <LessonView slug={slug} initialLesson={initialLesson} />;
}
