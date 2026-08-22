import {
  mainlandBnuPrimaryQuestionGenerationMetadata,
  mainlandBnuPrimaryQuestions
} from "./mainlandBnuPrimaryQuestions";
import {
  type BnuPrimaryBatch,
  mainlandBnuPrimaryTopics
} from "./mainlandBnuPrimaryTopics";
import { joinWorkedExampleAnswerAndExplanation, toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const checkpointQuestionCountPerBatch = 4;
const batchOrder: BnuPrimaryBatch[] = ["bnu-primary-v1", "bnu-primary-v2"];
const checkpointDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 1],
  ["Medium", 1],
  ["High", 2]
];
const preferredConceptMethodQuestionIds: Readonly<Record<string, string>> = {
  "bnu-primary-p4-lower-decimal-multiplication": "bnu-primary-ds-v1-p4-181"
};

function text(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function batchForQuestion(question: Question) {
  return mainlandBnuPrimaryQuestionGenerationMetadata[question.id]?.batch;
}

function selectPracticeQuestionIdsForBatch(topicId: string, batch: BnuPrimaryBatch) {
  const topicQuestions = mainlandBnuPrimaryQuestions
    .filter((question) => question.topicId === topicId && batchForQuestion(question) === batch)
    .sort(questionIdSort);
  const picked = new Set<string>();

  checkpointDifficultyQuotas.forEach(([difficulty, quota]) => {
    topicQuestions
      .filter((question) => question.difficulty === difficulty)
      .slice(0, quota)
      .forEach((question) => picked.add(question.id));
  });
  topicQuestions.forEach((question) => {
    if (picked.size < checkpointQuestionCountPerBatch) picked.add(question.id);
  });

  return Array.from(picked).slice(0, checkpointQuestionCountPerBatch);
}

function selectPracticeQuestionIds(topicId: string) {
  const selectedByBatch = batchOrder.map((batch) => selectPracticeQuestionIdsForBatch(topicId, batch));

  return Array.from({ length: checkpointQuestionCountPerBatch }).flatMap((_, index) =>
    selectedByBatch.map((questionIds) => questionIds[index]).filter((questionId): questionId is string => Boolean(questionId))
  );
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
  const sampleQuestion = mainlandBnuPrimaryQuestions.find((question) => question.topicId === topic.id);
  if (!sampleQuestion) throw new Error(`Missing BNU primary worked-example question for ${topic.id}`);
  const samplePromptZhHans = sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh;
  const samplePromptEn = sampleQuestion?.prompt.en ?? samplePromptZhHans;
  const samplePromptZh = sampleQuestion?.prompt.zh ?? toTraditionalHjbText(samplePromptZhHans);
  const sampleAnswer = sampleQuestion?.answer ?? "见课堂检查点";
  const sampleAnswerZh = toTraditionalHjbText(sampleAnswer);
  const sampleExplanationZhHans = sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先读题，再选择方法并检查答案。";
  const sampleExplanationEn = sampleQuestion?.explanation.en ?? sampleExplanationZhHans;
  const sampleExplanationZh = sampleQuestion?.explanation.zh ?? toTraditionalHjbText(sampleExplanationZhHans);
  const sampleOptionsEn = optionList(sampleQuestion, "en");
  const sampleOptionsZh = optionList(sampleQuestion, "zh");
  const sampleOptionsZhHans = optionList(sampleQuestion, "zhHans");
  const workedExampleContent: LocalizedText = {
    en: `${samplePromptEn}${sampleOptionsEn ? ` Options: ${sampleOptionsEn}` : ""} Answer: ${joinWorkedExampleAnswerAndExplanation(sampleAnswer, sampleExplanationEn, "en")}`,
    zh: `${samplePromptZh}${sampleOptionsZh ? ` 選項：${sampleOptionsZh}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswerZh, sampleExplanationZh, "zh")}`,
    zhHans: `${samplePromptZhHans}${sampleOptionsZhHans ? ` 选项：${sampleOptionsZhHans}` : ""} 答案：${joinWorkedExampleAnswerAndExplanation(sampleAnswer, sampleExplanationZhHans, "zhHans")}`
  };
  const checkpointIds = new Set(practiceQuestionIds);
  const conceptMethodCandidates = mainlandBnuPrimaryQuestions
    .filter((question) => question.topicId === topic.id)
    .sort(questionIdSort)
    .filter((question) => {
      if (question.id === sampleQuestion.id || checkpointIds.has(question.id)) return false;
      // Keep selection anchored to the canonical Simplified source so later
      // English/Traditional map refreshes cannot change the chosen question.
      const candidateContentZhHans = `本课学习《${topic.title.zhHans ?? topic.title.zh}》中的核心方法。代表性思路：${question.explanation.zhHans ?? question.explanation.zh}`;
      return !hasNearTransferOverlap(candidateContentZhHans, workedExampleContent.zhHans ?? workedExampleContent.zh);
    });
  const preferredConceptMethodQuestionId = preferredConceptMethodQuestionIds[topic.id];
  const conceptMethodQuestion = preferredConceptMethodQuestionId
    ? conceptMethodCandidates.find((question) => question.id === preferredConceptMethodQuestionId)
    : conceptMethodCandidates[0];
  if (!conceptMethodQuestion) {
    throw new Error(
      preferredConceptMethodQuestionId
        ? `Preferred BNU primary concept method ${preferredConceptMethodQuestionId} is not an eligible disjoint non-checkpoint for ${topic.id}`
        : `Missing disjoint non-checkpoint BNU primary concept method for ${topic.id}`
    );
  }
  const conceptMethodExplanationZhHans = conceptMethodQuestion.explanation.zhHans ?? conceptMethodQuestion.explanation.zh;
  const conceptContent = text(
    `${topic.description.en} A representative method is: ${conceptMethodQuestion.explanation.en}`,
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
        text("Read the question once and circle the known quantities.", "先读题，并圈出已知数量。"),
        text("Name the mathematical idea or operation being used.", "说出正在使用的数学概念或运算。"),
        text("Write one clear calculation, drawing, or reasoning step.", "写出一个清楚的计算、画图或推理步骤。"),
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
        text("Ask students to restate the known information before calculation.", "计算前先让学生复述已知信息。"),
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

export const mainlandBnuPrimaryLessonSeeds: ProductionLessonSeed[] = mainlandBnuPrimaryTopics.map(toProductionLessonSeed);
