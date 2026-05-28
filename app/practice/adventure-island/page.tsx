import { AdventureIslandGame } from "@/components/gamification/AdventureIslandGame";
import { GamePracticeBackLink } from "@/components/gamification/GamePracticeBackLink";

export default function AdventureIslandPage() {
  return (
    <div className="page-container min-h-dvh py-4 sm:py-12">
      <div className="mb-4 flex items-center justify-between">
        <GamePracticeBackLink />
      </div>
      <AdventureIslandGame />
    </div>
  );
}
