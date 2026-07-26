import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { PracticeMissionSetupControls } from "@/components/practice/PracticeMissionSetupControls";
import { questions } from "@/data/questions";
import { buildPracticeMissionPreviewSample } from "@/lib/practiceMissionPreviewSample";

export const metadata: Metadata = {
  title: "About | MAIS",
  description: "Learn about MAIS, the bilingual interactive mathematics learning platform."
};

const practiceQuestionTotal = questions.length;
// The parked mission-setup teaser only ever renders 5 preview cards, so ship a small
// grade-stratified sample instead of serialising the whole ~24.5k-question bank into
// the RSC payload (previously ~1.7MB gzipped for /about). See buildPracticeMissionPreviewSample.
const { previewItems: practiceMissionPreviewItems, topicOptions: practiceMissionSetupTopicOptions } =
  buildPracticeMissionPreviewSample(questions);

export default function AboutPage() {
  return (
    <>
      <HomePageClient practiceQuestionTotal={practiceQuestionTotal} />
      <PracticeMissionSetupControls questionPreviewItems={practiceMissionPreviewItems} topicOptions={practiceMissionSetupTopicOptions} />
    </>
  );
}
