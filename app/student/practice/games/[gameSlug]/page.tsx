import { notFound } from "next/navigation";
import { StudentPracticeGameRoute } from "@/components/gamification/StudentPracticeGameRoute";
import { isStudentPracticeGameSlug, studentPracticeGameSlugs } from "@/lib/gameBasedLearning";

type StudentPracticeGamePageProps = {
  params: Promise<{
    gameSlug: string;
  }>;
};

export function generateStaticParams() {
  return Object.values(studentPracticeGameSlugs).map((gameSlug) => ({ gameSlug }));
}

export default async function StudentPracticeGamePage({ params }: StudentPracticeGamePageProps) {
  const { gameSlug } = await params;
  if (!isStudentPracticeGameSlug(gameSlug)) notFound();

  return <StudentPracticeGameRoute gameSlug={gameSlug} />;
}
