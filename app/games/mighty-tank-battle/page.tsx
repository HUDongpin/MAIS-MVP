import { MightyTankBattleGame } from "@/components/games/MightyTankBattleGame";

export const metadata = {
  title: "Mighty Tank Battle | MAIS Draft Game",
  description: "Internal draft of 威猛坦克大战, a math-powered top-down tank battle game."
};

export default function MightyTankBattlePage() {
  return <MightyTankBattleGame />;
}
