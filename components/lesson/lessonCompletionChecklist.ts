import type { GradeId, LessonBlock, LocalizedText, TextbookPublisher, TopicStatus } from "@/types";

export type LessonCompletionTier = "elementary" | "middle-high";

export type LessonCompletionChecklistItem = {
  block: LessonBlock;
  item: LocalizedText;
  key: string;
};

type LessonCompletionChecklistInput = {
  checklistBlocks: LessonBlock[];
  grade: GradeId;
  publisher?: TextbookPublisher;
};

type LessonCompletionMasteryCardInput = {
  checkedCount: number;
  grade: GradeId;
  itemCount: number;
  mastery: number;
  status: TopicStatus;
};

type LessonCompletionMasteryCardText = {
  eyebrow: LocalizedText;
  headline: LocalizedText;
  status: LocalizedText;
};

const elementaryQuickChecks: LocalizedText[] = [
  {
    en: "I can draw it or use objects.",
    zh: "我會畫一畫或用物件擺一擺。",
    zhHans: "我会画一画或用物件摆一摆。"
  },
  {
    en: "I can write the number sentence.",
    zh: "我會寫出算式。",
    zhHans: "我会写出算式。"
  },
  {
    en: "I can check that my answer fits the story.",
    zh: "我會檢查答案是否符合題目故事。",
    zhHans: "我会检查答案是否符合题目故事。"
  }
];

function lessonChecklistItemKey(blockId: string, index: number) {
  return `${blockId}-${index}`.replace(/[^A-Za-z0-9_-]/g, "-");
}

export function lessonCompletionTierForGrade(grade: GradeId): LessonCompletionTier {
  return grade.startsWith("S") ? "middle-high" : "elementary";
}

export function buildLessonCompletionChecklistItems({
  checklistBlocks,
  grade
}: LessonCompletionChecklistInput): LessonCompletionChecklistItem[] {
  if (lessonCompletionTierForGrade(grade) === "elementary") {
    const firstBlock = checklistBlocks[0];
    if (!firstBlock) return [];

    return elementaryQuickChecks.map((item, index) => ({
      block: firstBlock,
      item,
      key: lessonChecklistItemKey(firstBlock.id, index)
    }));
  }

  return checklistBlocks.flatMap((block) =>
    (block.items ?? []).map((item, index) => ({
      block,
      item,
      key: lessonChecklistItemKey(block.id, index)
    }))
  );
}

export function lessonCompletionTitleForGrade(grade: GradeId): LocalizedText {
  if (lessonCompletionTierForGrade(grade) === "elementary") {
    return {
      en: "Quick self-check",
      zh: "快速自我檢查",
      zhHans: "快速自我检查"
    };
  }

  return {
    en: "Check your understanding",
    zh: "檢查你的理解",
    zhHans: "检查你的理解"
  };
}

export function lessonCompletionProgressText({
  checkedCount,
  grade,
  itemCount
}: Pick<LessonCompletionMasteryCardInput, "checkedCount" | "grade" | "itemCount">): LocalizedText {
  if (lessonCompletionTierForGrade(grade) === "elementary") {
    return {
      en: `${checkedCount}/${itemCount} quick checks done`,
      zh: `已完成 ${checkedCount}/${itemCount} 個快速檢查`,
      zhHans: `已完成 ${checkedCount}/${itemCount} 个快速检查`
    };
  }

  return {
    en: `${checkedCount}/${itemCount} checklist items done`,
    zh: `已完成 ${checkedCount}/${itemCount} 項清單`,
    zhHans: `已完成 ${checkedCount}/${itemCount} 项清单`
  };
}

export function lessonCompletionMasteryCardText({
  checkedCount,
  grade,
  itemCount,
  mastery,
  status
}: LessonCompletionMasteryCardInput): LessonCompletionMasteryCardText {
  if (lessonCompletionTierForGrade(grade) === "elementary") {
    const headline = status === "completed"
      ? {
        en: "Lesson complete",
        zh: "課節已完成",
        zhHans: "课时已完成"
      }
      : checkedCount >= itemCount && itemCount > 0
        ? {
          en: "Ready to finish",
          zh: "可以完成了",
          zhHans: "可以完成了"
        }
        : checkedCount > 0
          ? {
            en: "Almost there",
            zh: "快完成了",
            zhHans: "快完成了"
          }
          : {
            en: "Keep going",
            zh: "繼續加油",
            zhHans: "继续加油"
          };

    return {
      eyebrow: {
        en: "Ready check",
        zh: "完成準備",
        zhHans: "完成准备"
      },
      headline,
      status: {
        en: `${checkedCount}/${itemCount} quick checks`,
        zh: `${checkedCount}/${itemCount} 個快速檢查`,
        zhHans: `${checkedCount}/${itemCount} 个快速检查`
      }
    };
  }

  return {
    eyebrow: {
      en: "Mastery",
      zh: "掌握度",
      zhHans: "掌握度"
    },
    headline: {
      en: `Mastery: ${mastery}%`,
      zh: `掌握度：${mastery}%`,
      zhHans: `掌握度：${mastery}%`
    },
    status: status === "completed"
      ? {
        en: "Completed",
        zh: "已完成",
        zhHans: "已完成"
      }
      : {
        en: "In progress",
        zh: "進行中",
        zhHans: "进行中"
      }
  };
}
