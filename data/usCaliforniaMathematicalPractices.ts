import type { LocalizedText } from "@/types";

/**
 * California / Common Core Standards for Mathematical Practice (MP1-MP8).
 *
 * These are the eight *process* standards that CCSS-M defines alongside the
 * grade-level content standards. They are cross-cutting: every California math
 * knowledge point and lesson in this codebase engages one or more of them, even
 * though the per-question `standardIds` metadata records only the content
 * standard. This module makes the practice standards first-class, canonical
 * reference data so the California curriculum's CCSS coverage is complete rather
 * than content-standards-only.
 *
 * The canonical CCSS identifier for, e.g., MP1 is `CCSS.MATH.PRACTICE.MP1`.
 */
export type CaliforniaMathematicalPracticeStandard = {
  /** Short code as it appears in CCSS-M, e.g. "MP1". */
  code: `MP${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  /** Canonical CCSS dotted identifier, e.g. "CCSS.MATH.PRACTICE.MP1". */
  standardId: string;
  /** Official CCSS-M title of the practice standard. */
  title: LocalizedText;
  /** Short description of what the practice standard asks students to do. */
  description: LocalizedText;
};

function localizedText(en: string, zh: string, zhHans: string): LocalizedText {
  return { en, zh, zhHans };
}

export const californiaMathematicalPracticeStandards: CaliforniaMathematicalPracticeStandard[] = [
  {
    code: "MP1",
    standardId: "CCSS.MATH.PRACTICE.MP1",
    title: localizedText(
      "Make sense of problems and persevere in solving them.",
      "理解問題並堅持求解。",
      "理解问题并坚持求解。"
    ),
    description: localizedText(
      "Explain the meaning of a problem, plan a solution pathway, monitor progress, and keep going when the first approach stalls.",
      "解釋問題的意義，規劃解題途徑，監控進度，並在初次嘗試受阻時堅持下去。",
      "解释问题的意义，规划解题途径，监控进度，并在初次尝试受阻时坚持下去。"
    )
  },
  {
    code: "MP2",
    standardId: "CCSS.MATH.PRACTICE.MP2",
    title: localizedText(
      "Reason abstractly and quantitatively.",
      "抽象與量化推理。",
      "抽象与量化推理。"
    ),
    description: localizedText(
      "Move between the quantities in a situation and their symbolic representations, decontextualizing and contextualizing as needed.",
      "在情境中的數量與其符號表示之間轉換，按需去情境化與再情境化。",
      "在情境中的数量与其符号表示之间转换，按需去情境化与再情境化。"
    )
  },
  {
    code: "MP3",
    standardId: "CCSS.MATH.PRACTICE.MP3",
    title: localizedText(
      "Construct viable arguments and critique the reasoning of others.",
      "建立可行的論證並評析他人的推理。",
      "建立可行的论证并评析他人的推理。"
    ),
    description: localizedText(
      "Use assumptions, definitions, and prior results to justify conclusions, and analyze whether others' arguments make sense.",
      "運用假設、定義與已有結論來論證結果，並分析他人論證是否合理。",
      "运用假设、定义与已有结论来论证结果，并分析他人论证是否合理。"
    )
  },
  {
    code: "MP4",
    standardId: "CCSS.MATH.PRACTICE.MP4",
    title: localizedText(
      "Model with mathematics.",
      "用數學建模。",
      "用数学建模。"
    ),
    description: localizedText(
      "Apply mathematics to everyday situations, represent them with diagrams, tables, or equations, and interpret whether results make sense.",
      "將數學應用於日常情境，用圖表或方程表示，並詮釋結果是否合理。",
      "将数学应用于日常情境，用图表或方程表示，并诠释结果是否合理。"
    )
  },
  {
    code: "MP5",
    standardId: "CCSS.MATH.PRACTICE.MP5",
    title: localizedText(
      "Use appropriate tools strategically.",
      "策略性地使用適當工具。",
      "策略性地使用适当工具。"
    ),
    description: localizedText(
      "Choose and use tools such as models, rulers, or technology, and know each tool's usefulness and limitations.",
      "選擇並使用模型、尺或科技等工具，並了解每種工具的用途與限制。",
      "选择并使用模型、尺或科技等工具，并了解每种工具的用途与限制。"
    )
  },
  {
    code: "MP6",
    standardId: "CCSS.MATH.PRACTICE.MP6",
    title: localizedText(
      "Attend to precision.",
      "講求精確。",
      "讲求精确。"
    ),
    description: localizedText(
      "Communicate precisely with clear definitions, correct units and labels, and calculations carried to appropriate accuracy.",
      "用清晰的定義、正確的單位與標籤，以及達到適當精度的計算來精確表達。",
      "用清晰的定义、正确的单位与标签，以及达到适当精度的计算来精确表达。"
    )
  },
  {
    code: "MP7",
    standardId: "CCSS.MATH.PRACTICE.MP7",
    title: localizedText(
      "Look for and make use of structure.",
      "尋找並運用結構。",
      "寻找并运用结构。"
    ),
    description: localizedText(
      "Discern patterns and structure, such as place value or the distributive property, and use them to simplify or solve problems.",
      "辨識規律與結構，例如位值或分配律，並運用它們來簡化或解決問題。",
      "辨识规律与结构，例如位值或分配律，并运用它们来简化或解决问题。"
    )
  },
  {
    code: "MP8",
    standardId: "CCSS.MATH.PRACTICE.MP8",
    title: localizedText(
      "Look for and express regularity in repeated reasoning.",
      "在重複推理中尋找並表達規律。",
      "在重复推理中寻找并表达规律。"
    ),
    description: localizedText(
      "Notice when calculations repeat, look for general methods and shortcuts, and evaluate the reasonableness of results along the way.",
      "留意計算何時重複，尋找一般方法與捷徑，並在過程中評估結果的合理性。",
      "留意计算何时重复，寻找一般方法与捷径，并在过程中评估结果的合理性。"
    )
  }
];

export const californiaMathematicalPracticeByCode = new Map(
  californiaMathematicalPracticeStandards.map((practice) => [practice.code, practice])
);

/** Canonical CCSS ids for the eight Standards for Mathematical Practice. */
export function californiaMathematicalPracticeStandardIds(): string[] {
  return californiaMathematicalPracticeStandards.map((practice) => practice.standardId);
}
