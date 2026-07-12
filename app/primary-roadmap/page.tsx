import { permanentRedirect } from "next/navigation";
import { studentPrimaryRoadmapPath } from "@/lib/roadmapRoutes";

export default function LegacyPrimaryRoadmapPage() {
  permanentRedirect(studentPrimaryRoadmapPath);
}
