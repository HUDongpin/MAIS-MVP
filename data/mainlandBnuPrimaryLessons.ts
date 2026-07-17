import {
  mainlandBnuPrimaryQuestionGenerationMetadata,
  mainlandBnuPrimaryQuestions
} from "./mainlandBnuPrimaryQuestions";
import {
  type BnuPrimaryBatch,
  formatBnuPrimaryVolumeTitleEn,
  mainlandBnuPrimaryTopicMetadata,
  mainlandBnuPrimaryTopics
} from "./mainlandBnuPrimaryTopics";
import { toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const checkpointQuestionCountPerBatch = 4;
const batchOrder: BnuPrimaryBatch[] = ["bnu-primary-v1", "bnu-primary-v2"];
const checkpointDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 1],
  ["Medium", 1],
  ["High", 2]
];

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

function lessonBlocks(topic: Topic): ProductionLessonBlock[] {
  const metadata = mainlandBnuPrimaryTopicMetadata[topic.id];
  const conceptList = metadata.conceptIds.slice(0, 5).join("、");
  const volumeEn = formatBnuPrimaryVolumeTitleEn(metadata.volume);
  const sampleQuestion = mainlandBnuPrimaryQuestions.find((question) => question.topicId === topic.id);
  const samplePromptZhHans = sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh;
  const samplePromptEn = sampleQuestion?.prompt.en ?? samplePromptZhHans;
  const samplePromptZh = sampleQuestion?.prompt.zh ?? toTraditionalHjbText(samplePromptZhHans);
  const sampleAnswer = sampleQuestion?.answer ?? "见课堂检查点";
  const sampleAnswerZh = toTraditionalHjbText(sampleAnswer);
  const sampleExplanationZhHans = sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先读题，再选择方法并检查答案。";
  const sampleExplanationEn = sampleQuestion?.explanation.en ?? sampleExplanationZhHans;
  const sampleExplanationZh = sampleQuestion?.explanation.zh ?? toTraditionalHjbText(sampleExplanationZhHans);

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: text("Core concept", "核心概念"),
      content: {
        en: `${topic.title.en} follows the approved BNUP primary scope for ${volumeEn}.`,
        zh: `${topic.title.zhHans ?? topic.title.zh}以北師大版${metadata.volume}已審核小學單元展開，重點關注${conceptList}。`,
        zhHans: `${topic.title.zhHans ?? topic.title.zh}以北师大版${metadata.volume}已审核小学单元展开，重点关注${conceptList}。`
      }
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: text("Original worked example", "原创例题精讲"),
      content: {
        en: `${samplePromptEn} Answer: ${sampleAnswer}. ${sampleExplanationEn}`,
        zh: `${samplePromptZh} 答案：${sampleAnswerZh}。${sampleExplanationZh}`,
        zhHans: `${samplePromptZhHans} 答案：${sampleAnswer}。${sampleExplanationZhHans}`
      }
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("Read the question once and circle the known quantities.", "先读题，并圈出已知数量。"),
        text("Name the BNUP unit idea being used.", "说出正在使用的北师大版单元思想。"),
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
        `Use the 8-question BNUP primary checkpoint before assigning broader Practice Arena work for ${topic.title.en}.`,
        `先用 8 题北师大版小学课堂检查点确认学生准备度，再按需要布置${topic.title.zhHans ?? topic.title.zh}的专属练习。`
      ),
      items: [
        text("Ask students to restate the known information before calculation.", "计算前先让学生复述已知信息。"),
        text("Use one wrong answer to model checking with the checklist.", "用一个错误答案示范如何按清单复核。"),
        text("Keep PEP, HJB, and BNUP primary practice pools separated by publisher.", "按 publisher 保持人教版、沪教版与北师大版小学题库隔离。")
      ]
    }
  ];
}

function toProductionLessonSeed(topic: Topic): ProductionLessonSeed {
  return {
    topicId: topic.id,
    productionReady: true,
    title: topic.title,
    description: topic.description,
    estimatedMinutes: topic.minutes,
    practiceQuestionIds: selectPracticeQuestionIds(topic.id),
    blocks: lessonBlocks(topic)
  };
}

export const mainlandBnuPrimaryLessonSeeds: ProductionLessonSeed[] = mainlandBnuPrimaryTopics.map(toProductionLessonSeed);
