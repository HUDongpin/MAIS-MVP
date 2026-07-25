import { AdaptiveLearningContent } from "@/components/dashboard/AdaptiveLearningContent";
import { StudentLearningPathsView } from "@/components/dashboard/StudentLearningPathsView";

export default function PersonalizedLearningPage() {
  return (
    <>
      <StudentLearningPathsView />
      <AdaptiveLearningContent />
    </>
  );
}
