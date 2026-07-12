import { permanentRedirect } from "next/navigation";
import { studentPracticeGameHrefs } from "@/lib/gameBasedLearning";

export default function LegacyAdventureIslandPage() {
  permanentRedirect(studentPracticeGameHrefs.adventureIsland);
}
