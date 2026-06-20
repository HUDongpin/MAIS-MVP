import { StudentLessonPage } from "@/components/lesson/StudentLessonPage";

export const runtime = "nodejs";

type StudentLessonRoutePageProps = {
  params: Promise<{ lessonSlug: string }>;
};

export default async function StudentLessonRoutePage({ params }: StudentLessonRoutePageProps) {
  const { lessonSlug } = await params;
  return <StudentLessonPage lessonSlug={lessonSlug} />;
}
