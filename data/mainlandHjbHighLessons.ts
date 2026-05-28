import { mainlandHjbHighQuestionGenerationMetadata, mainlandHjbHighQuestions } from "./mainlandHjbHighQuestions";
import { formatHjbHighVolumeTitleEn, mainlandHjbHighTopicMetadata, mainlandHjbHighTopics } from "./mainlandHjbHighTopics";
import { localizeHjbGeneratedText, toTraditionalHjbText } from "./hjbQuestionLocalization";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";
import type { Difficulty, LocalizedText, Question, Topic } from "@/types";

const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Foundation", 2],
  ["Core", 3],
  ["Challenge", 2],
  ["Exam", 1]
];

function text(en: string, zhHans: string): LocalizedText {
  return { en, zh: toTraditionalHjbText(zhHans), zhHans };
}

const approvedBatchPriority: Record<string, number> = {
  "hjb-v4-remediated": 0,
  "hjb-v3-remediated": 1,
  "hjb-v2": 2,
  "hjb-v1": 3
};

function questionIdSort(left: Question, right: Question) {
  const leftPriority = approvedBatchPriority[mainlandHjbHighQuestionGenerationMetadata[left.id]?.batch ?? ""] ?? 99;
  const rightPriority = approvedBatchPriority[mainlandHjbHighQuestionGenerationMetadata[right.id]?.batch ?? ""] ?? 99;
  return leftPriority - rightPriority || left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandHjbHighQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
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

function lessonBlocks(topic: Topic): ProductionLessonBlock[] {
  const metadata = mainlandHjbHighTopicMetadata[topic.id];
  const conceptListEn = metadata.conceptIds.slice(0, 5).join(", ");
  const conceptListZhHans = metadata.conceptIds.slice(0, 5).join("、");
  const volumeEn = formatHjbHighVolumeTitleEn(metadata.volume);
  const sampleQuestion = mainlandHjbHighQuestions.find((question) => question.topicId === topic.id);
  const samplePromptZhHans = sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh;
  const samplePromptEn = sampleQuestion?.prompt.en ?? localizeHjbGeneratedText(samplePromptZhHans).en;
  const samplePromptZh = sampleQuestion?.prompt.zh ?? toTraditionalHjbText(samplePromptZhHans);
  const sampleAnswer = sampleQuestion?.answer ?? "见课堂检查点";
  const sampleAnswerLocalized = localizeHjbGeneratedText(sampleAnswer);
  const sampleExplanationZhHans = sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先确认条件，再完成推理和复核。";
  const sampleExplanationEn = sampleQuestion?.explanation.en ?? localizeHjbGeneratedText(sampleExplanationZhHans).en;
  const sampleExplanationZh = sampleQuestion?.explanation.zh ?? toTraditionalHjbText(sampleExplanationZhHans);

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: text("Core concept", "核心概念"),
      content: {
        en: `${topic.title.en} is introduced through the approved HJB scope for ${volumeEn}, with focus on ${conceptListEn}.`,
        zh: `${topic.title.zh}以沪教版${metadata.volume}已批准单元范围展开，重点关注${conceptListZhHans}。`,
        zhHans: `${topic.title.zhHans ?? topic.title.zh}以沪教版${metadata.volume}已批准单元范围展开，重点关注${conceptListZhHans}。`
      }
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: text("Original worked example", "原创例题精讲"),
      content: {
        en: `${samplePromptEn} Answer: ${sampleAnswerLocalized.en}. ${sampleExplanationEn}`,
        zh: `${samplePromptZh} 答案：${sampleAnswerLocalized.zh}。${sampleExplanationZh}`,
        zhHans: `${samplePromptZhHans} 答案：${sampleAnswer}。${sampleExplanationZhHans}`
      }
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("State the definition or rule being used.", "说出正在使用的定义或规则。"),
        text("Write the key intermediate step before final calculation.", "最终计算前写出关键中间步骤。"),
        text("Check the result against the question conditions.", "用题设条件复核结果。"),
        text("Approved source-distance scans passed.", "已批准题库来源距离扫描通过。")
      ]
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: text("Strategy and extension", "考试策略与拓展"),
      items: [
        text("Solve one checkpoint again with a different representation.", "任选一道检查题，换一种表示方式再做一遍。"),
        text("Record one likely misconception before submitting.", "提交前记录一个容易出错的点。")
      ]
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: text("Teacher guide", "教师使用建议"),
      content: text(
        `Use the 8-question approved checkpoint to confirm readiness before assigning the broader HJB pool for ${topic.title.en}.`,
        `先用 8 题已批准课堂检查点确认学生准备度，再按需要布置${topic.title.zhHans ?? topic.title.zh}的沪教版专属题库。`
      ),
      items: [
        text("Ask students to name the rule before calculation.", "计算前先让学生说出所用规则。"),
        text("Compare one incorrect answer with the checklist.", "用检查清单复盘一个错误答案。"),
        text("Keep PEP and HJB practice pools separated by publisher.", "按 publisher 保持人教版与沪教版题库隔离。")
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

export const mainlandHjbHighLessonSeeds: ProductionLessonSeed[] = mainlandHjbHighTopics.map(toProductionLessonSeed);
