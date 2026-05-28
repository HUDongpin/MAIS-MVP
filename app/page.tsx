import { HomePageClient } from "@/components/home/HomePageClient";
import { questions } from "@/data/questions";

function isMainlandPepQuestion(question: (typeof questions)[number]) {
  // Older high-school PEP rows still use the compatibility track without publisher metadata.
  return (
    question.publisher === "MAINLAND_PEP" ||
    question.curriculumProfile?.publisher === "MAINLAND_PEP" ||
    question.curriculumTrack === "MAINLAND_PEP_HIGH"
  );
}

const mainlandPepQuestionCount = questions.filter(isMainlandPepQuestion).length;
const defaultQuestionBankQuestionCount = questions.filter((question) => question.curriculumTrack === "HK").length;
const practiceQuestionTotal = mainlandPepQuestionCount + defaultQuestionBankQuestionCount;

export default function HomePage() {
  return <HomePageClient practiceQuestionTotal={practiceQuestionTotal} />;
}
