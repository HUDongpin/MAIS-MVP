import { permanentRedirect } from "next/navigation";
import { studentRoadmapPath } from "@/lib/roadmapRoutes";

export default function LegacyLearningPathPage() {
  permanentRedirect(studentRoadmapPath);
}
