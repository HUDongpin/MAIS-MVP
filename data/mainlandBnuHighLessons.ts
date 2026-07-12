import {
  mainlandBnuHighQuestionGenerationMetadata,
  mainlandBnuHighQuestions
} from "./mainlandBnuHighQuestions";
import { mainlandBnuHighTopicMetadata, mainlandBnuHighTopics } from "./mainlandBnuHighTopics";
import { stripHjbGeneratorPromptPrefix, toTraditionalHjbText } from "./hjbQuestionLocalization";
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

function approvedQuestion(question: Question) {
  const metadata = mainlandBnuHighQuestionGenerationMetadata[question.id];
  return (
    metadata?.sourceDistanceStatus === "passed-auto-source-scan" &&
    metadata.mathQaStatus === "pass" &&
    metadata.terminologyQaStatus === "pass" &&
    metadata.manualQaStatus === "approved"
  );
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function questionsForTopic(topicId: string) {
  return mainlandBnuHighQuestions
    .filter((question) => question.topicId === topicId && approvedQuestion(question))
    .sort(questionIdSort);
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = questionsForTopic(topicId);
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

function plain(value: string | undefined) {
  return stripHjbGeneratorPromptPrefix(value ?? "");
}

function firstApprovedQuestion(topicId: string) {
  return questionsForTopic(topicId)[0];
}

function volumeTitleEn(volume: string) {
  const normalized = volume.replace(/\s+/g, "");
  const volumeTitleMap: Record<string, string> = {
    "必修第一册": "Compulsory Volume 1",
    "必修第二册": "Compulsory Volume 2",
    "选择性必修第一册": "Selective Compulsory Volume 1",
    "选择性必修第二册": "Selective Compulsory Volume 2",
    "选择性必修第二册综合复习": "Selective Compulsory Volume 2 Review"
  };

  return volumeTitleMap[normalized] ?? volume;
}

function conceptSummary(topic: Topic) {
  const metadata = mainlandBnuHighTopicMetadata[topic.id];
  const conceptList = metadata.conceptIds.slice(0, 6);
  const conceptListEn = conceptList.join(", ");
  const conceptListZhHans = conceptList.join("、");

  return {
    en: `${topic.title.en} is introduced through the approved BNUP senior-secondary scope for ${volumeTitleEn(metadata.volume)}, chapter ${topic.title.en}. Focus on ${conceptListEn}, then connect the rule, representation, and verification step before practice.`,
    zhHans: `北师大版${metadata.volume}《${metadata.chapter}》正式课围绕${conceptListZhHans}展开。先确认概念或规则，再连接表示方式、关键推理和检验步骤，然后进入练习。`
  };
}

function workedExampleContent(topic: Topic) {
  const sampleQuestion = firstApprovedQuestion(topic.id);
  const promptZhHans = plain(sampleQuestion?.prompt.zhHans ?? sampleQuestion?.prompt.zh ?? topic.title.zhHans ?? topic.title.zh);
  const answer = sampleQuestion?.answer ?? "见课堂检查点";
  const explanationZhHans = plain(sampleQuestion?.explanation.zhHans ?? sampleQuestion?.explanation.zh ?? "先确认条件，再完成推理并检查答案。");
  const contentZhHans = `${promptZhHans} 答案：${answer}。${explanationZhHans}`;
  const contentEn = `Approved checkpoint example for ${topic.title.en}. Use the unit rule or representation, solve the selected BNU senior-secondary checkpoint, and verify the answer: ${answer}. Compare your reasoning with the Chinese worked example when you switch to Simplified or Traditional Chinese.`;

  return {
    en: contentEn,
    zh: toTraditionalHjbText(contentZhHans),
    zhHans: contentZhHans
  };
}

function lessonBlocks(topic: Topic): ProductionLessonBlock[] {
  const metadata = mainlandBnuHighTopicMetadata[topic.id];
  const concept = conceptSummary(topic);

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: text("Core concept", "核心概念"),
      content: text(concept.en, concept.zhHans)
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: text("Approved original worked example", "已批准原创例题精讲"),
      content: workedExampleContent(topic)
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: text("Before practice", "练习前检查"),
      items: [
        text("State the BNUP unit idea, definition, or theorem being used.", "说出正在使用的北师大版单元思想、定义或定理。"),
        text("Mark the known conditions and target before calculating.", "计算前标出已知条件和目标。"),
        text("Write the key transformation, substitution, graph feature, or proof step.", "写出关键变形、代入、图像特征或证明步骤。"),
        text("Check the final answer against domain, units, and question wording.", "用定义域、单位和题目问法复核最终答案。")
      ]
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: text("Strategy and extension", "考试策略与拓展"),
      items: [
        text("Solve one checkpoint again with a different representation.", "任选一道检查题，换一种表示方式再做一遍。"),
        text("Write one likely misconception for this chapter and how to avoid it.", "写出本章一个易错点，并说明如何避免。"),
        text("Create one new BNUP-style condition change, then predict how the solution path changes.", "自拟一个北师大版同主题条件变化，并预测解题路径怎样改变。")
      ]
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: text("Teacher guide", "教师使用建议"),
      content: text(
        `Use the 8-question approved BNUP senior checkpoint to confirm readiness before assigning the broader ${topic.title.en} practice pool.`,
        `先用 8 题已批准北师大版高中课堂检查点确认学生准备度，再按需要布置《${metadata.chapter}》专属题库。`
      ),
      items: [
        text("Ask students to name the rule or theorem before calculation.", "计算前先让学生说出所用规则或定理。"),
        text("Use one incorrect answer to model checklist-based correction.", "用一个错误答案示范如何按清单修正。"),
        text("Keep BNUP senior content separated from PEP, HJB, and BNUP junior pools by publisher and grade.", "按 publisher 与 grade 保持北师大版高中内容与人教版、沪教版及北师大版初中题库隔离。")
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

export const mainlandBnuHighLessonSeeds: ProductionLessonSeed[] = mainlandBnuHighTopics.map(toProductionLessonSeed);
