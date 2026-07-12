import { permanentRedirect } from "next/navigation";
import { studentPracticeGameHrefs } from "@/lib/gameBasedLearning";

export default function LegacyFishingGamePage() {
  permanentRedirect(studentPracticeGameHrefs.fishingMaster);
}
