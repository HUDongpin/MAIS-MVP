import { permanentRedirect } from "next/navigation";
import { mathMatchQuestDraftPath } from "@/lib/gameBasedLearning";

export default function MathMatchQuestPage() {
  permanentRedirect(mathMatchQuestDraftPath);
}
