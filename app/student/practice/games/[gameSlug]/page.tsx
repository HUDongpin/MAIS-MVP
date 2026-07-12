import { notFound } from "next/navigation";
import { StudentPracticeGameRoute } from "@/components/gamification/StudentPracticeGameRoute";
import { isStudentPracticeGameSlug } from "@/lib/gameBasedLearning";

type StudentPracticeGamePageProps = {
  params: Promise<{ gameSlug: string }>;
};

export default async function StudentPracticeGamePage({ params }: StudentPracticeGamePageProps) {
  const { gameSlug } = await params;
  if (!isStudentPracticeGameSlug(gameSlug)) notFound();

  return <StudentPracticeGameRoute gameSlug={gameSlug} />;
}

