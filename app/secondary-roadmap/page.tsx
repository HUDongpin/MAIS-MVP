import { permanentRedirect } from "next/navigation";
import { studentSecondaryRoadmapPath } from "@/lib/roadmapRoutes";

export default function LegacySecondaryRoadmapPage() {
  permanentRedirect(studentSecondaryRoadmapPath);
}
