import { PrimaryRoadmapPage } from "@/components/learning/PrimaryRoadmapPage";
import { SecondaryRoadmapPage } from "@/components/learning/SecondaryRoadmapPage";
import { StudentRoadmapPage } from "@/components/learning/StudentRoadmapPage";

type RoadmapRouteKind = "student" | "primary" | "secondary";

export function RoadmapRouteShell({ kind }: { kind: RoadmapRouteKind }) {
  if (kind === "primary") return <PrimaryRoadmapPage />;
  if (kind === "secondary") return <SecondaryRoadmapPage />;
  return <StudentRoadmapPage />;
}
