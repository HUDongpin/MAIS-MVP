import type { Metadata } from "next";
import { AboutGamePathShowcase } from "@/components/home/AboutGamePathShowcase";
import { HomePageClient } from "@/components/home/HomePageClient";
import { PracticeMissionSetupControls, type PracticeMissionPreviewQuestion, type PracticeMissionSetupTopicOption } from "@/components/practice/PracticeMissionSetupControls";
import { questions } from "@/data/questions";
import { visualizationLabCount } from "@/data/visualizationLabs";

export const metadata: Metadata = {
  title: "About | MAIS",
  description: "Learn about MAIS, the bilingual interactive mathematics learning platform."
};

const practiceQuestionTotal = questions.length;
const practiceMissionSetupTopicOptions = Array.from(
  questions.reduce<Map<string, PracticeMissionSetupTopicOption>>((topics, question) => {
    if (!topics.has(question.topicId)) {
      topics.set(question.topicId, {
        topicId: question.topicId,
        grade: question.grade,
        topic: question.topic
      });
    }

    return topics;
  }, new Map<string, PracticeMissionSetupTopicOption>()).values()
);
const practiceMissionPreviewItems: PracticeMissionPreviewQuestion[] = questions.map((question) => ({
  id: question.id,
  difficulty: question.difficulty,
  grade: question.grade,
  options: question.options,
  prompt: question.prompt,
  topic: question.topic,
  topicId: question.topicId,
  type: question.type
}));

export default function AboutPage() {
  return (
    <>
      <HomePageClient practiceQuestionTotal={practiceQuestionTotal} visualizationLabCount={visualizationLabCount} />
      <AboutGamePathShowcase />
      <PracticeMissionSetupControls questionPreviewItems={practiceMissionPreviewItems} topicOptions={practiceMissionSetupTopicOptions} />
    </>
  );
}
