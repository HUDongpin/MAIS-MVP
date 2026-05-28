import type { MainlandPepJuniorExamPatternCard } from "@/types";
import { mainlandJuniorZhongkaoExamPatternCards } from "./mainlandJuniorZhongkaoExamPatterns";

export const mainlandPepJuniorExamPatternCards: MainlandPepJuniorExamPatternCard[] =
  mainlandJuniorZhongkaoExamPatternCards.map((card) => ({
    ...card,
    publisher: "MAINLAND_PEP"
  }));
