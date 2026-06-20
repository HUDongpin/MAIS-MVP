"use client";

import dynamic from "next/dynamic";
import { FishingGame } from "@/components/gamification/FishingGame";
import { GamePracticeBackLink } from "@/components/gamification/GamePracticeBackLink";
import { useSettings } from "@/components/providers/AppProviders";
import { studentPracticeGameSlugs, type StudentPracticeGameSlug } from "@/lib/gameBasedLearning";

function AdventureIslandLoading() {
  const { t } = useSettings();

  return (
    <div className="glass-panel grid min-h-[28rem] place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-500 dark:text-cyan-300">
          {t({ en: "Loading Adventure Island", zh: "正在載入探险岛", zhHans: "正在载入探险岛" })}
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
          {t({ en: "Preparing the game...", zh: "正在準備遊戲...", zhHans: "正在准备游戏..." })}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {t({
            en: "MAIS is loading the island challenge in your browser.",
            zh: "MAIS 正在你的瀏覽器中載入探险岛挑戰。",
            zhHans: "MAIS 正在你的浏览器中载入探险岛挑战。"
          })}
        </p>
      </div>
    </div>
  );
}
const AdventureIslandGame = dynamic(
  () => import("@/components/gamification/AdventureIslandGame").then((module) => module.AdventureIslandGame),
  {
    ssr: false,
    loading: AdventureIslandLoading
  }
);

export function StudentPracticeGameRoute({ gameSlug }: { gameSlug: StudentPracticeGameSlug }) {
  return (
    <div className="page-container min-h-dvh py-4 sm:py-12">
      <div className="mb-4 flex items-center justify-between">
        <GamePracticeBackLink />
      </div>
      {gameSlug === studentPracticeGameSlugs.fishingMaster ? <FishingGame /> : <AdventureIslandGame />}
    </div>
  );
}
