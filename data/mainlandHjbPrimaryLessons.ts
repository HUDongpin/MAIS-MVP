import { mainlandHjbPrimaryQuestions } from "./mainlandHjbPrimaryQuestions";
import { mainlandHjbPrimaryTopics } from "./mainlandHjbPrimaryTopics";
import { joinWorkedExampleAnswerAndExplanation, localizeHjbGeneratedText, toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

function text(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandHjbPrimaryQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
  const picked = new Set<string>();

  practiceDifficultyQuotas.forEach(([difficulty, quota]) => {
    topicQuestions
      .filter((question) => question.difficulty === difficulty)
      .slice(0, quota)
      .forEach((question) => picked.add(question.id));
  });
  topicQuestions.forEach((question) => {
    if (picked.size < 8) picked.add(question.id);
  });

  return Array.from(picked).slice(0, 8);
}

function optionList(question: Question | undefined, language: "en" | "zh" | "zhHans") {
  if (!question?.options?.length) return "";
  const prompt = question.prompt[language] ?? question.prompt.zh;
  if (/(?:^|\n)\s*A[.．、]/u.test(prompt)) return "";
  const labels = ["A", "B", "C", "D", "E", "F"];
  return question.options.map((option, index) => {
    const value = option[language] ?? option.zh;
    return /^[A-F][.．、]\s*/u.test(value) ? value : `${labels[index]}. ${value}`;
  }).join(" ");
}

const answerCjkPattern = /[\u3400-\u9fff]/u;

function localizedQuestionAnswer(question: Question): LocalizedText {
  const candidates = [question.answer, ...(question.acceptedAnswers ?? [])];
  const canonicalUsesEnglishWords = !answerCjkPattern.test(question.answer) && /[A-Za-z]{2,}/u.test(question.answer);
  const chineseSource = canonicalUsesEnglishWords
    ? candidates.find((candidate) => answerCjkPattern.test(candidate)) ?? question.answer
    : question.answer;
  const localizedChineseSource = localizeHjbGeneratedText(chineseSource);
  return {
    ...localizedChineseSource,
    en: canonicalUsesEnglishWords ? question.answer : localizedChineseSource.en
  };
}

function nearTransferSignatures(value: string) {
  const normalized = value
    .replace(/\\\(|\\\)/g, "")
    .replace(/[。，]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const signatures = new Set<string>();
  const patterns = [
    /x\^2[+-]\d+x[+-]\d+/g,
    /\b\d+\s*[+\-*/×÷]\s*\d+\s*=\s*\d+\b/g,
    /\b\d+\s*\/\s*\(?x\s*[+-]\s*\d+\)?\s*=\s*\d+\b/g,
    /\bx\s*\/\s*\(?x\s*[+-]\s*\d+\)?\s*=\s*\d+\s*\/\s*\d+\b/g,
    /\b\d+\s*\/\s*\(?\d+\s*[+-]\s*\d+\)?\s*=\s*\d+\s*\/\s*\d+\b/g,
    /\b\d+\s*\/\s*\d+\b/g
  ];

  patterns.forEach((pattern) => {
    Array.from(normalized.matchAll(pattern), (match) => match[0]).forEach((expression) => {
      signatures.add(
        `expr:${expression
          .replace(/[。，]/g, " ")
          .replace(/\s+/g, "")
          .replace(/×/g, "*")
          .replace(/÷/g, "/")
          .replace(/≠/g, "!=")
          .trim()}`
      );
    });
  });
  Array.from(normalized.matchAll(/If\s+(\d+)\s+and\s+(\d+)\s+make\s+(\d+)/gi)).forEach((match) => {
    signatures.add(`parts:${match[1]}+${match[2]}=${match[3]}`);
  });
  Array.from(normalized.matchAll(
    /In\s+(\d{2,4})\b[^.。]*?\b(\d)\b[^.。]*?(hundred|ten|one|ones|tens|hundreds)/gi
  )).forEach((match) => {
    signatures.add(`place:${match[1]}`);
  });

  return signatures;
}

function hasNearTransferOverlap(left: string, right: string) {
  const rightSignatures = nearTransferSignatures(right);
  return Array.from(nearTransferSignatures(left)).some((signature) => rightSignatures.has(signature));
}

function lessonBlocks(topic: Topic, practiceQuestionIds: string[]): ProductionLessonBlock[] {
  const sampleQuestion = mainlandHjbPrimaryQuestions.find((question) => question.topicId === topic.id);
  if (!sampleQuestion) throw new Error(`Missing HJB primary worked-example question for ${topic.id}`);
  const samplePromptZhHans = sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh;
  const samplePromptEn = sampleQuestion?.prompt.en ?? localizeHjbGeneratedText(samplePromptZhHans).en;
  const samplePromptZh = sampleQuestion?.prompt.zh ?? toTraditionalHjbText(samplePromptZhHans);
  const sampleAnswerLocalized = localizedQuestionAnswer(sampleQuestion);
  const sampleExplanationZhHans = sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先读题，再选择方法并检查答案。";
  const sampleExplanationEn = sampleQuestion?.explanation.en ?? localizeHjbGeneratedText(sampleExplanationZhHans).en;
  const sampleExplanationZh = sampleQuestion?.explanation.zh ?? toTraditionalHjbText(sampleExplanationZhHans);
  const sampleOptionsEn = optionList(sampleQuestion, "en");
  const sampleOptionsZh = optionList(sampleQuestion, "zh");
  const sampleOptionsZhHans = optionList(sampleQuestion, "zhHans");
  const workedExampleContent: LocalizedText = {
    en: `${samplePromptEn}${sampleOptionsEn ? ` Options: ${sampleOptionsEn}` : ""} Answer: ${joinWorkedExampleAnswerAndExplanation(sampleAnswerLocalized.en, sampleExplanationEn, "en")}`,
    zh: `${samplePromptZh}${sampleOptionsZh ? ` 選項：${sampleOptionsZh}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswerLocalized.zh, sampleExplanationZh, "zh")}`,
    zhHans: `${samplePromptZhHans}${sampleOptionsZhHans ? ` 选项：${sampleOptionsZhHans}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswerLocalized.zhHans ?? sampleAnswerLocalized.zh, sampleExplanationZhHans, "zhHans")}`
  };
  const checkpointIds = new Set(practiceQuestionIds);
  const conceptMethodQuestion = mainlandHjbPrimaryQuestions
    .filter((question) => question.topicId === topic.id)
    .sort(questionIdSort)
    .find((question) => {
      if (question.id === sampleQuestion.id || checkpointIds.has(question.id)) return false;
      // Anchor selection to the canonical Simplified source so translation-map
      // refreshes cannot silently change which reviewed method is selected.
      const candidateContentZhHans = `本课学习《${topic.title.zhHans ?? topic.title.zh}》中的核心方法。代表性思路：${question.explanation.zhHans ?? question.explanation.zh}`;
      return !hasNearTransferOverlap(candidateContentZhHans, workedExampleContent.zhHans ?? workedExampleContent.zh);
    });
  if (!conceptMethodQuestion) {
    throw new Error(`Missing disjoint non-checkpoint HJB primary concept method for ${topic.id}`);
  }
  const conceptMethodExplanationZhHans = conceptMethodQuestion.explanation.zhHans ?? conceptMethodQuestion.explanation.zh;
  const conceptMethodExplanationEn = conceptMethodQuestion.explanation.en
    ?? localizeHjbGeneratedText(conceptMethodExplanationZhHans).en;
  const conceptContent = text(
    `${topic.description.en} A representative method is: ${conceptMethodExplanationEn}`,
    `本课学习《${topic.title.zhHans ?? topic.title.zh}》中的核心方法。代表性思路：${conceptMethodExplanationZhHans}`
  );

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: text("Core concept", "核心概念"),
      content: conceptContent
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: text("Original worked example", "原创例题精讲"),
      content: workedExampleContent
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("Read the question once and underline the known quantities.", "先读题，并圈出已知数量。"),
        text("Name the operation, model, or shape feature being used.", "说出正在使用的运算、模型或图形特征。"),
        text("Write one clear calculation or reasoning step.", "写出一个清楚的计算或推理步骤。"),
        text("Check whether the answer matches the unit and question wording.", "检查答案是否符合单位和题目问法。")
      ]
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: text("Strategy and extension", "策略与拓展"),
      items: [
        text("Solve one checkpoint again using a drawing, table, or number sentence.", "任选一道检查题，用画图、列表或算式再做一遍。"),
        text("Explain one mistake a classmate might make and how to avoid it.", "说出同学可能犯的一个错误，并说明如何避免。")
      ]
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: text("Teacher guide", "教师使用建议"),
      content: text(
        `Use the five-question checkpoint shown on this lesson page to identify whether learners are ready for more independent work on ${topic.title.en}.`,
        `先用本课页面显示的五道课堂检查题了解学生对《${topic.title.zhHans ?? topic.title.zh}》的掌握情况，再按需要安排独立练习。`
      ),
      items: [
        text("Ask students to say the known information before calculation.", "计算前先让学生说出已知信息。"),
        text("Use one wrong answer to model checking with the checklist.", "用一个错误答案示范如何按清单复核。"),
        text("Choose follow-up questions that match the same unit, grade, and learning goal.", "后续练习应与本单元、年级和学习目标一致。")
      ]
    }
  ];
}

function toProductionLessonSeed(topic: Topic): ProductionLessonSeed {
  const practiceQuestionIds = selectPracticeQuestionIds(topic.id);
  return {
    topicId: topic.id,
    productionReady: true,
    title: topic.title,
    description: topic.description,
    estimatedMinutes: topic.minutes,
    practiceQuestionIds,
    blocks: lessonBlocks(topic, practiceQuestionIds)
  };
}

export const mainlandHjbPrimaryLessonSeeds: ProductionLessonSeed[] = mainlandHjbPrimaryTopics.map(toProductionLessonSeed);
