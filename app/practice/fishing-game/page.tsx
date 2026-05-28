import { FishingGame } from "@/components/gamification/FishingGame";
import { GamePracticeBackLink } from "@/components/gamification/GamePracticeBackLink";

export default function FishingGamePage() {
  return (
    <div className="page-container min-h-dvh py-4 sm:py-12">
      <div className="mb-4 flex items-center justify-between">
        <GamePracticeBackLink />
      </div>
      <FishingGame />
    </div>
  );
}
