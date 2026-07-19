import type { LocalizedText, PublicQuestion } from "@/types";

export const youngLearnerPracticeGrades = new Set<string>(["K", "P1", "P2", "P3"]);

export function isYoungLearnerPracticeGrade(grade: string) {
  return youngLearnerPracticeGrades.has(grade);
}

export function isYoungLearnerPracticeRound(questions: ReadonlyArray<Pick<PublicQuestion, "grade">>) {
  return questions.length > 0 && questions.every((question) => youngLearnerPracticeGrades.has(question.grade));
}

export function youngPracticePraise(accuracyPercent: number): LocalizedText {
  if (accuracyPercent >= 80) {
    return {
      en: "Amazing! You got almost every one right. That is a gold-star round!",
      zh: "太棒了！你幾乎全部答對，這是金星回合！",
      zhHans: "太棒了！你几乎全部答对，这是金星回合！"
    };
  }

  if (accuracyPercent >= 50) {
    return {
      en: "Great trying! You got lots of them right. One more practice makes you even stronger!",
      zh: "好努力！你答對了很多題。再練一次會更厲害！",
      zhHans: "好努力！你答对了很多题。再练一次会更厉害！"
    };
  }

  return {
    en: "Good work trying every question! Tricky ones help your brain grow.",
    zh: "每一題你都努力嘗試，真好！有點難的題目會讓大腦變強。",
    zhHans: "每一题你都努力尝试，真好！有点难的题目会让大脑变强。"
  };
}

export function youngPracticeTip(accuracyPercent: number): LocalizedText {
  if (accuracyPercent >= 80) {
    return {
      en: "Try the next island mission and win more stars!",
      zh: "去下一個島上任務，贏更多星星吧！",
      zhHans: "去下一个岛上任务，赢更多星星吧！"
    };
  }

  if (accuracyPercent >= 50) {
    return {
      en: "Look at the amber stones again. Count slowly with your finger!",
      zh: "再看看橙色的石頭，用手指慢慢數一次！",
      zhHans: "再看看橙色的石头，用手指慢慢数一次！"
    };
  }

  return {
    en: "Ask a grown-up to read the tricky ones with you, then try again.",
    zh: "請大人陪你讀一讀較難的題目，然後再試一次。",
    zhHans: "请大人陪你读一读较难的题目，然后再试一次。"
  };
}

export function youngPracticeStarLine(correctCount: number, totalQuestions: number): LocalizedText {
  return {
    en: `You collected ${correctCount} of ${totalQuestions} stars!`,
    zh: `你收集了 ${correctCount}/${totalQuestions} 顆星星！`,
    zhHans: `你收集了 ${correctCount}/${totalQuestions} 颗星星！`
  };
}
