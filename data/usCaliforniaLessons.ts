import kG5TextbookLessonPackJson from "./generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json";
import { findStandard } from "./ccss";
import { ccssLessonMetasForTopic, hasCcssLessonAssignment } from "./ccssLessonAssignments";
import {
  californiaKnowledgePointDisplayTitle,
  californiaKnowledgePointForTopic
} from "./usCaliforniaKnowledgePoints";
import {
  californiaElementaryMicroLessonSpecs,
  californiaElementaryMicroLessonTopicIds,
  type CaliforniaElementaryMicroLessonSpec
} from "./usCaliforniaMicroLessons";
import { generatedCaliforniaQuestions, usCaliforniaTopics, type CaliforniaK5GradeId, type GeneratedCaliforniaQuestion } from "./usCaliforniaTopics";
import { getPrimaryVisualizationLabForTopic } from "./visualizationLabs";
import type { Difficulty, LocalizedText, Topic } from "@/types";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";

type CaliforniaLessonSkillStage = "foundation" | "fluency" | "transfer";

export type CaliforniaLessonCoverageRecord = {
  topicId: string;
  grade: Topic["grade"];
  standardIds: string[];
  domainTags: string[];
  conceptIds: string[];
  skillStageIds: string[];
  practiceQuestionIds: string[];
};

export type CaliforniaStandardProgressInput = {
  completedTopicIds?: Iterable<string>;
  completedSkillStageIds?: Iterable<string>;
  attemptedQuestionIds?: Iterable<string>;
};

export type CaliforniaStandardProgressRecord = {
  standardId: string;
  topicIds: string[];
  completedTopicIds: string[];
  skillStageIds: string[];
  completedSkillStageIds: string[];
  practiceQuestionIds: string[];
  attemptedQuestionIds: string[];
  topicCompletionRatio: number;
  checklistCompletionRatio: number;
  practiceAttemptRatio: number;
  coverageRatio: number;
  status: "not-started" | "in-progress" | "covered";
};

type GeneratedCaliforniaK5TextbookLesson = {
  id: string;
  metadata: {
    topicId: string;
    grade: CaliforniaK5GradeId;
    usGradeLabel: string;
    domainId: string;
    domainTitle: string;
    clusterId: string;
    clusterTitle: string;
    standardIds: string[];
    difficulty: Difficulty;
    estimatedMinutes: number;
  };
  studentLesson: {
    en: {
      title: string;
      learningGoals: string[];
      launch: string;
      conceptExplanation: string;
      workedExample: {
        prompt: string;
        answer: string;
        reasoning: string;
      };
      guidedPractice: Array<{
        prompt: string;
        expectedMove: string;
      }>;
      independentPractice: string[];
      commonPitfalls: Array<{
        pitfall: string;
        repairMove: string;
      }>;
      exitTicket: string;
    };
  };
};

type GeneratedCaliforniaK5TextbookLessonPack = {
  packageId: "us-ca-math-k-g5-textbooks-v1";
  lessons: GeneratedCaliforniaK5TextbookLesson[];
};

const kG5TextbookLessonPack = kG5TextbookLessonPackJson as GeneratedCaliforniaK5TextbookLessonPack;

const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

const skillStages: CaliforniaLessonSkillStage[] = ["foundation", "fluency", "transfer"];

const domainZh: Record<string, { zh: string; zhHans: string }> = {
  "advanced functions": { zh: "進階函數", zhHans: "进阶函数" },
  algebra: { zh: "代數", zhHans: "代数" },
  angles: { zh: "角度", zhHans: "角度" },
  "area and perimeter": { zh: "面積與周界", zhHans: "面积与周长" },
  "base-ten computation": { zh: "十進位計算", zhHans: "十进位计算" },
  "base-ten foundations": { zh: "十進位基礎", zhHans: "十进位基础" },
  "base-ten number sense": { zh: "十進位數感", zhHans: "十进位数感" },
  "bivariate data": { zh: "雙變量數據", zhHans: "双变量数据" },
  "calculus readiness": { zh: "微積分預備", zhHans: "微积分预备" },
  "coordinate geometry": { zh: "坐標幾何", zhHans: "坐标几何" },
  "coordinate plane": { zh: "坐標平面", zhHans: "坐标平面" },
  "counting and cardinality": { zh: "數數與基數", zhHans: "数数与基数" },
  data: { zh: "數據", zhHans: "数据" },
  "decimal operations": { zh: "小數運算", zhHans: "小数运算" },
  decimals: { zh: "小數", zhHans: "小数" },
  "early operations": { zh: "早期運算", zhHans: "早期运算" },
  "exponential models": { zh: "指數模型", zhHans: "指数模型" },
  "expressions and equations": { zh: "代數式與方程", zhHans: "代数式与方程" },
  "fraction equivalence": { zh: "分數等值", zhHans: "分数等值" },
  "fraction operations": { zh: "分數運算", zhHans: "分数运算" },
  fractions: { zh: "分數", zhHans: "分数" },
  functions: { zh: "函數", zhHans: "函数" },
  geometry: { zh: "幾何", zhHans: "几何" },
  inference: { zh: "推斷", zhHans: "推断" },
  "linear equations": { zh: "線性方程", zhHans: "线性方程" },
  "linear expressions": { zh: "線性代數式", zhHans: "线性代数式" },
  measurement: { zh: "測量", zhHans: "测量" },
  "measurement and data": { zh: "測量與數據", zhHans: "测量与数据" },
  "middle school readiness review": { zh: "初中銜接複習", zhHans: "初中衔接复习" },
  modeling: { zh: "建模", zhHans: "建模" },
  "multi-digit operations": { zh: "多位數運算", zhHans: "多位数运算" },
  "multi-step problem solving review": { zh: "多步解題複習", zhHans: "多步解题复习" },
  "multiplication and division": { zh: "乘法與除法", zhHans: "乘法与除法" },
  "number and operations in base ten": { zh: "十進位數與運算", zhHans: "十进位数与运算" },
  "number system": { zh: "數系", zhHans: "数系" },
  "operations and algebraic thinking": { zh: "運算與代數思維", zhHans: "运算与代数思维" },
  "performance task review": { zh: "表現任務複習", zhHans: "表现任务复习" },
  "polynomial structure": { zh: "多項式結構", zhHans: "多项式结构" },
  probability: { zh: "概率", zhHans: "概率" },
  "proportional relationships": { zh: "比例關係", zhHans: "比例关系" },
  quadratics: { zh: "二次關係", zhHans: "二次关系" },
  "quantitative reasoning": { zh: "數量推理", zhHans: "数量推理" },
  "rational number operations": { zh: "有理數運算", zhHans: "有理数运算" },
  "ratios and proportional reasoning": { zh: "比與比例推理", zhHans: "比与比例推理" },
  similarity: { zh: "相似", zhHans: "相似" },
  statistics: { zh: "統計", zhHans: "统计" },
  "statistics and probability": { zh: "統計與概率", zhHans: "统计与概率" },
  transformations: { zh: "變換", zhHans: "变换" },
  trigonometry: { zh: "三角函數", zhHans: "三角函数" },
  volume: { zh: "體積", zhHans: "体积" }
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function local(en: string, zh: string, zhHans = zh): LocalizedText {
  return { en, zh, zhHans };
}

function textFrom(value: LocalizedText) {
  return {
    en: value.en,
    zh: value.zh,
    zhHans: value.zhHans ?? value.zh
  };
}

const generatedPracticePrefixPattern = /^\s*Activity\s+\d+\s*:\s*DeepSeek practice\s*:\s*/i;

function cleanGeneratedPracticeText(value: string) {
  return value.replace(generatedPracticePrefixPattern, "").trim();
}

function cleanPracticePrompt(value: LocalizedText) {
  return {
    en: cleanGeneratedPracticeText(value.en),
    zh: cleanGeneratedPracticeText(value.zh),
    zhHans: cleanGeneratedPracticeText(value.zhHans ?? value.zh)
  };
}

function questionsForTopic(topicId: string) {
  return generatedCaliforniaQuestions.filter((question) => question.topicId === topicId);
}

function questionSort(left: GeneratedCaliforniaQuestion, right: GeneratedCaliforniaQuestion) {
  return (
    practiceDifficultyQuotas.findIndex(([difficulty]) => difficulty === left.difficulty) -
      practiceDifficultyQuotas.findIndex(([difficulty]) => difficulty === right.difficulty) ||
    left.id.localeCompare(right.id, "en", { numeric: true })
  );
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = questionsForTopic(topicId).sort(questionSort);
  const picked = new Set<string>();

  // Hand-checked CCSS textbook practice leads; generated-bank questions fill
  // the remainder ("CCSS becomes the core" decision, 2026-07-19).
  topicQuestions
    .filter((question) => question.batch === "ccss-textbook-practice-v1")
    .forEach((question) => picked.add(question.id));

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

function domainText(domainTags: string[]) {
  const firstDomain = domainTags[0] ?? "California mathematics";
  const translated = domainZh[firstDomain.toLowerCase()];
  return {
    en: titleCase(firstDomain),
    zh: translated?.zh ?? titleCase(firstDomain),
    zhHans: translated?.zhHans ?? titleCase(firstDomain)
  };
}

function compactConcepts(conceptIds: string[], maxItems = 5) {
  const concepts = unique(conceptIds).slice(0, maxItems);
  return concepts.length ? concepts : ["reasoning", "representation", "accuracy"];
}

function conceptText(conceptIds: string[]) {
  const concepts = compactConcepts(conceptIds);
  return {
    en: concepts.map(titleCase).join(", "),
    zh: concepts.map(titleCase).join("、"),
    zhHans: concepts.map(titleCase).join("、")
  };
}

function standardText(standardIds: string[]) {
  const ids = unique(standardIds);
  return ids.length ? ids.join(", ") : "CA.CCSS.Math";
}

function sortIds(ids: string[]) {
  return [...ids].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

function ratio(done: number, total: number) {
  return total > 0 ? done / total : 0;
}

function rounded(value: number) {
  return Math.round(value * 1000) / 1000;
}

function sampleQuestion(topicId: string) {
  const topicQuestions = questionsForTopic(topicId).sort(questionSort);
  return topicQuestions.find((question) => question.type !== "multiple-choice") ?? topicQuestions[0] ?? null;
}

function answerText(question: GeneratedCaliforniaQuestion | null) {
  return question?.answer ?? "see the checkpoint answer";
}

function conceptBlock(topic: Topic, topicQuestions: GeneratedCaliforniaQuestion[]): ProductionLessonBlock {
  const topicTitle = textFrom(topic.title);
  const domain = domainText(unique(topicQuestions.flatMap((question) => question.domainTags)));
  const concepts = conceptText(topicQuestions.flatMap((question) => question.conceptIds));

  return {
    idSuffix: "concept",
    type: "concept",
    title: local("Concept explanation", "概念講解", "概念讲解"),
    content: local(
      `${topicTitle.en} is a math story about ${domain.en.toLowerCase()}. First, give every quantity, object, graph feature, or shape a clear job in the situation. Then choose a picture, table, equation, or model that shows how the parts are related. The answer is finished only when it returns to the story and explains why the key ideas fit: ${concepts.en}.`,
      `${topicTitle.zh} 是一個關於${domain.zh}的數學故事。先讓每個數量、物件、圖像特徵或形狀在情境中有清楚任務。再選擇圖像、表格、方程或模型，表示各部分如何連在一起。答案只有回到故事並說明重點概念為什麼合適，才算完成：${concepts.zh}。`,
      `${topicTitle.zhHans} 是一个关于${domain.zhHans}的数学故事。先让每个数量、物件、图像特征或形状在情境中有清楚任务。再选择图像、表格、方程或模型，表示各部分如何连在一起。答案只有回到故事并说明重点概念为什么合适，才算完成：${concepts.zhHans}。`
    )
  };
}

function workedExampleBlock(topic: Topic): ProductionLessonBlock {
  const question = sampleQuestion(topic.id);
  const prompt = cleanPracticePrompt(question?.prompt ?? topic.description);
  const explanation = question?.explanation ?? topic.description;
  const answer = answerText(question);

  return {
    idSuffix: "worked-example",
    type: "worked-example",
    title: local("Worked example", "例題精講", "例题精讲"),
    content: local(
      `${prompt.en}\n\nAnswer: ${answer}.\n\nReasoning: ${explanation.en} After solving, underline the given values, the operation or representation used, and the final check.`,
      `${prompt.zh}\n\n答案：${answer}。\n\n推理：${explanation.zh} 完成後，圈出已知數值、使用的運算或表示方式，以及最後檢查。`,
      `${prompt.zhHans}\n\n答案：${answer}。\n\n推理：${explanation.zhHans ?? explanation.zh} 完成后，圈出已知数值、使用的运算或表示方式，以及最后检查。`
    )
  };
}

function scaffoldedPracticeBlock(topic: Topic, topicQuestions: GeneratedCaliforniaQuestion[]): ProductionLessonBlock {
  const practiceQuestionIds = selectPracticeQuestionIds(topic.id);
  const standards = standardText(topicQuestions.flatMap((question) => question.standardIds));
  const questionCount = practiceQuestionIds.length;

  // Learner-facing copy names the three stages in words. The machine-readable
  // stage ids (`<topicId>:foundation` and friends) stay in the coverage record
  // and the teacher guide — a student never reads an internal identifier.
  return {
    idSuffix: "scaffolded-practice",
    type: "checklist",
    title: local("Scaffolded practice path", "分層練習路徑", "分层练习路径"),
    items: [
      local(
        "Foundation: restate what the question asks and identify the quantities, labels, or shapes.",
        "基礎：重述題目要求，找出數量、標籤或圖形。",
        "基础：重述题目要求，找出数量、标签或图形。"
      ),
      local(
        "Fluency: solve two checkpoint items without changing the operation, unit, graph feature, or representation.",
        "熟練：完成兩道檢查題，過程中保持運算、單位、圖像特徵或表示方式一致。",
        "熟练：完成两道检查题，过程中保持运算、单位、图像特征或表示方式一致。"
      ),
      local(
        "Transfer: explain why the method still works when the numbers, context, or representation change.",
        "遷移：說明數字、情境或表示方式改變後，為何方法仍然成立。",
        "迁移：说明数字、情境或表示方式改变后，为何方法仍然成立。"
      ),
      local(
        `Coverage check: the lesson checkpoint links ${questionCount} approved question${questionCount === 1 ? "" : "s"} to ${standards}.`,
        `覆蓋檢查：本課檢查點把 ${questionCount} 道已批准題目連到 ${standards}。`,
        `覆盖检查：本课检查点把 ${questionCount} 道已批准题目连到 ${standards}。`
      )
    ]
  };
}

/**
 * Names the ideas a student should re-check, in this lesson's own words.
 *
 * The generated question bank's `conceptIds`/`domainTags` are shared across a
 * whole grade band and are rotated against the chapter topics (see the
 * title-over-tag curation notes in `scripts/build-ccss-lesson-assignments.mjs`),
 * so reading them back to the student named other chapters' topics — a
 * statistics lesson told students to re-check "Ratios, Unit Rate". When the
 * topic has an interactive CCSS core, its lesson titles are the authoritative,
 * per-lesson answer; only unassigned topics fall back to the bank tags.
 */
function remediationFocusText(topic: Topic, topicQuestions: GeneratedCaliforniaQuestion[]) {
  const metas = ccssLessonMetasForTopic(topic.id);
  if (metas.length) {
    const titles = metas.slice(0, 3).map((meta) => meta.title);
    return { en: titles.join(", "), zh: titles.join("、"), zhHans: titles.join("、") };
  }

  const concepts = compactConcepts(topicQuestions.flatMap((question) => question.conceptIds), 3).map(titleCase);
  return { en: concepts.join(", "), zh: concepts.join("、"), zhHans: concepts.join("、") };
}

function remediationBlock(topic: Topic, topicQuestions: GeneratedCaliforniaQuestion[]): ProductionLessonBlock {
  const focus = remediationFocusText(topic, topicQuestions);
  // Topics with an interactive CCSS core have no worked-example block to
  // compare against; each interactive lesson carries a Math Check instead.
  const hasWorkedExample = !hasCcssLessonAssignment(topic.id);

  return {
    idSuffix: "remediation",
    type: "extension",
    title: local("Mistake repair", "錯因補救", "错因补救"),
    items: [
      local(
        "If an answer is wrong, first decide where it broke: reading the question, choosing the representation, or carrying out the calculation.",
        "答案錯時，先判斷錯在哪一步：讀題、選表示方式，還是執行計算。",
        "答案错时，先判断错在哪一步：读题、选表示方式，还是执行计算。"
      ),
      local(
        `Misconception watch: re-check ${focus.en} before retrying; write the corrected rule in one sentence.`,
        `易錯提醒：重做前先重新檢查${focus.zh}，再用一句話寫出修正後的規則。`,
        `易错提醒：重做前先重新检查${focus.zhHans}，再用一句话写出修正后的规则。`
      ),
      hasWorkedExample
        ? local(
            "Redo one missed checkpoint with a new representation, then compare it with the worked example.",
            "用新的表示方式重做一道錯題，再與例題比較。",
            "用新的表示方式重做一道错题，再与例题比较。"
          )
        : local(
            "Redo one missed checkpoint with a new representation, then check it against the Math Check in the lesson above.",
            "用新的表示方式重做一道錯題，再對照上方課節的 Math Check 檢查。",
            "用新的表示方式重做一道错题，再对照上方课节的 Math Check 检查。"
          ),
      local(
        "Use the Mistake Book note as the exit ticket: cause, correction, and one future warning sign.",
        "用錯題本記錄作為出口條：錯因、修正方法、下一次要留意的警號。",
        "用错题本记录作为出口条：错因、修正方法、下一次要留意的警号。"
      )
    ]
  };
}

function coverageGuideBlock(topic: Topic, topicQuestions: GeneratedCaliforniaQuestion[]): ProductionLessonBlock {
  const standards = standardText(topicQuestions.flatMap((question) => question.standardIds));
  const practiceQuestionIds = selectPracticeQuestionIds(topic.id);
  const skillStageIds = skillStages.map((stage) => `${topic.id}:${stage}`);

  return {
    idSuffix: "standards-coverage",
    type: "teacher-guide",
    title: local("Progress and standards coverage", "進度與標準覆蓋", "进度与标准覆盖"),
    content: local(
      `Track this beta lesson at three levels: checklist completion for lesson progress, checkpoint attempts for practice coverage, and standard identifiers ${standards} for coverage reporting. Adaptive skill stages: ${skillStageIds.join(", ")}.`,
      `本 beta 課節以三層追蹤：清單完成度代表課節進度，檢查題作答代表練習覆蓋，標準標識 ${standards} 用於覆蓋報告。適性技能階段：${skillStageIds.join("、")}。`,
      `本 beta 课节以三层追踪：清单完成度代表课节进度，检查题作答代表练习覆盖，标准标识 ${standards} 用于覆盖报告。适性技能阶段：${skillStageIds.join("、")}。`
    ),
    items: [
      local(
        `Lesson progress saves through the existing checklist state; completion should not be treated as full standard mastery until checkpoint accuracy is reviewed.`,
        "課節進度透過現有清單狀態儲存；在檢查題準確率被審視前，不應把完成課節等同完整標準掌握。",
        "课节进度通过现有清单状态储存；在检查题准确率被审视前，不应把完成课节等同完整标准掌握。"
      ),
      local(
        `Practice coverage uses these checkpoint IDs: ${practiceQuestionIds.join(", ")}.`,
        `練習覆蓋使用這些檢查題 ID：${practiceQuestionIds.join("、")}。`,
        `练习覆盖使用这些检查题 ID：${practiceQuestionIds.join("、")}。`
      ),
      local(
        "Teacher review should sample English, Traditional Chinese, and Simplified Chinese before any label beyond California Math Practice Beta or California K-5 textbook/lesson beta.",
        "升級到 California Math Practice Beta 或 California K-5 textbook/lesson beta 以外的名稱前，教師審查需抽看英文、繁體中文及簡體中文。",
        "升级到 California Math Practice Beta 或 California K-5 textbook/lesson beta 以外的名称前，教师审查需抽看英文、繁体中文及简体中文。"
      )
    ]
  };
}

function textOnly(value: string): LocalizedText {
  return local(value, value, value);
}

/**
 * "<pitfall>: <repair move>" for the mistake-repair list.
 *
 * Pitfall labels arrive in two shapes: short fragments in the K-5 textbook pack
 * ("skipping number words") and full sentences in the Grade 1 micro lessons
 * ("Counting one object twice when the groups are close together."). Trimming
 * the sentence-final period keeps the joined line from reading ".: ".
 */
function pitfallItemText(pitfall: string, repairMove: string) {
  return `${pitfall.trim().replace(/\.$/, "")}: ${repairMove.trim()}`;
}

function californiaVisualizationBlock(topicId: string): ProductionLessonBlock | null {
  const lab = getPrimaryVisualizationLabForTopic(topicId);
  if (!lab || lab.publisher !== "US_CA_MATH") return null;

  const labTitle = textFrom(lab.title);
  const compactLabTitle = {
    en: labTitle.en.replace(/\s+Visual Lab$/i, ""),
    zh: labTitle.zh.replace(/(?:視覺化實驗|可视化实验)$/, ""),
    zhHans: labTitle.zhHans.replace(/可视化实验$/, "")
  };
  const category = textFrom(lab.category);
  const domainId = lab.californiaAlignment?.domainId ?? "California Math Practice Beta";
  const standardIds = lab.californiaAlignment?.standardIds.slice(0, 4).join(", ") ?? "";
  // "…and more" rather than a bare "..." — a trailing ellipsis inside the
  // parenthesis reads as a truncation bug in learner-facing copy.
  const hasMoreStandards = (lab.californiaAlignment?.standardIds.length ?? 0) > 4;
  const standardSuffix = standardIds ? ` (${standardIds}${hasMoreStandards ? ", and more" : ""})` : "";

  return {
    idSuffix: "visualization",
    type: "visualization",
    title: local(
      `Visualization Lab: ${compactLabTitle.en}`,
      `Visualization Lab：${compactLabTitle.zh}`,
      `Visualization Lab：${compactLabTitle.zhHans}`
    ),
    content: local(
      `Use the ${category.en.toLowerCase()} lab to manipulate this knowledge point before checkpoint practice. The lab is aligned to ${domainId}${standardSuffix}, carries a Safeguard Review record, and shows its Read me first note before students interact with the model.`,
      `先用${category.zh}實驗操作這個知識點，再進入檢查練習。此實驗對齊 ${domainId}${standardSuffix}，帶有 Safeguard Review 記錄，並會在學生操作模型前顯示 Read me first 提示。`,
      `先用${category.zhHans ?? category.zh}实验操作这个知识点，再进入检查练习。此实验对齐 ${domainId}${standardSuffix}，带有 Safeguard Review 记录，并会在学生操作模型前显示 Read me first 提示。`
    ),
    visualizationConfig: {
      moduleId: lab.moduleId,
      source: lab.analyticsSource,
      topicId: lab.topicId
    }
  };
}

function withCaliforniaVisualizationBlock(topicId: string, blocks: ProductionLessonBlock[]) {
  const visualizationBlock = californiaVisualizationBlock(topicId);
  if (!visualizationBlock) return blocks;

  const insertBeforeIndex = blocks.findIndex((block) => block.idSuffix === "mistake-repair" || block.idSuffix === "remediation");
  if (insertBeforeIndex < 0) return [...blocks, visualizationBlock];

  return [
    ...blocks.slice(0, insertBeforeIndex),
    visualizationBlock,
    ...blocks.slice(insertBeforeIndex)
  ];
}

function microCoverageRecord(lesson: CaliforniaElementaryMicroLessonSpec): CaliforniaLessonCoverageRecord {
  const knowledgePoint = californiaKnowledgePointForTopic(lesson.topicId, lesson.grade, lesson.maisTitle);
  return {
    topicId: lesson.topicId,
    grade: lesson.grade,
    standardIds: unique(lesson.standardIds),
    domainTags: [lesson.domainTitle],
    conceptIds: [knowledgePoint.code, knowledgePoint.title, ...lesson.competencyTags],
    skillStageIds: skillStages.map((stage) => `${lesson.topicId}:${stage}`),
    practiceQuestionIds: selectPracticeQuestionIds(lesson.topicId)
  };
}

function microLessonBlocks(lesson: CaliforniaElementaryMicroLessonSpec): ProductionLessonBlock[] {
  return withCaliforniaVisualizationBlock(lesson.topicId, [
    {
      idSuffix: "concept",
      type: "concept",
      title: textOnly("Concept explanation"),
      // Learning goals live with the launch/concept narrative so the guided
      // practice checklist stays within the 3-5 item authored block standard.
      content: textOnly(
        `${lesson.launch}\n\nLearning goals:\n${lesson.learningGoals.map((goal) => `- ${goal}`).join("\n")}\n\n${lesson.conceptExplanation}`
      )
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: textOnly("Worked example"),
      content: textOnly(
        `${lesson.workedExample.prompt}\n\nAnswer: ${lesson.workedExample.answer}.\n\nReasoning: ${lesson.workedExample.reasoning}`
      )
    },
    {
      idSuffix: "guided-practice",
      type: "checklist",
      title: textOnly("Guided practice"),
      items: lesson.guidedPractice.map(textOnly)
    },
    {
      idSuffix: "mistake-repair",
      type: "extension",
      title: textOnly("Mistake repair"),
      items: [
        ...lesson.independentPractice.map(textOnly),
        ...lesson.commonPitfalls.map((item) => textOnly(pitfallItemText(item.pitfall, item.repairMove))),
        textOnly(lesson.exitTicket)
      ]
    },
    {
      idSuffix: "standards-coverage",
      type: "teacher-guide",
      title: textOnly("Progress and standards coverage"),
      content: textOnly(
        `${lesson.knowledgePointCode} is a MAIS-authored knowledge point for ${lesson.domainTitle}, aligned to ${lesson.standardIds.join(", ")}. The lesson copy is text-only and uses original story contexts, models, examples, and mistake-repair prompts; the practice checkpoint links the separate live California Math Practice Beta bank.`
      )
    }
  ]);
}

function toMicroLessonSeed(lesson: CaliforniaElementaryMicroLessonSpec): ProductionLessonSeed {
  const title = californiaKnowledgePointDisplayTitle(lesson.topicId, lesson.grade, lesson.maisTitle);
  return {
    topicId: lesson.topicId,
    productionReady: true,
    title: textOnly(title),
    description: textOnly(`${lesson.description} Knowledge point: ${lesson.knowledgePointCode}.`),
    estimatedMinutes: lesson.estimatedMinutes,
    practiceQuestionIds: selectPracticeQuestionIds(lesson.topicId),
    blocks: microLessonBlocks(lesson)
  };
}

function textbookCoverageRecord(lesson: GeneratedCaliforniaK5TextbookLesson): CaliforniaLessonCoverageRecord {
  const knowledgePoint = californiaKnowledgePointForTopic(
    lesson.metadata.topicId,
    lesson.metadata.grade,
    lesson.studentLesson.en.title
  );
  return {
    topicId: lesson.metadata.topicId,
    grade: lesson.metadata.grade,
    standardIds: unique(lesson.metadata.standardIds),
    domainTags: [lesson.metadata.domainTitle],
    conceptIds: [knowledgePoint.code, knowledgePoint.title, lesson.metadata.clusterTitle],
    skillStageIds: skillStages.map((stage) => `${lesson.metadata.topicId}:${stage}`),
    practiceQuestionIds: selectPracticeQuestionIds(lesson.metadata.topicId)
  };
}

/**
 * Interactive lesson-core blocks for an assigned topic (primary first, then
 * related — the "CCSS becomes the core" decision, 2026-07-19). The block
 * `content` carries the lesson's read-aloud narration so the audio guide and
 * directory descriptions keep working. Shared by the K–G5 textbook topics and
 * the G6–G12 chapter topics.
 */
function ccssInteractiveLessonBlocks(topicId: string): ProductionLessonBlock[] {
  return ccssLessonMetasForTopic(topicId).map((meta) => ({
    idSuffix: `ccss-${meta.slug}`,
    type: "interactive-lesson",
    title: textOnly(`${meta.emoji} ${meta.title}`),
    content: textOnly(meta.narration),
    interactiveLessonConfig: {
      ccssLessonSlug: meta.slug,
      topicId,
      standardIds: meta.standardIds
    }
  }));
}

/**
 * The topic's lesson core: interactive CCSS lessons when assigned, the
 * generated text blocks otherwise.
 */
function textbookCoreBlocks(
  lesson: GeneratedCaliforniaK5TextbookLesson
): ProductionLessonBlock[] {
  const topicId = lesson.metadata.topicId;
  if (hasCcssLessonAssignment(topicId)) {
    return ccssInteractiveLessonBlocks(topicId);
  }

  const content = lesson.studentLesson.en;
  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: textOnly("Concept explanation"),
      content: textOnly(`${content.launch}\n\n${content.conceptExplanation}`)
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: textOnly("Worked example"),
      content: textOnly(
        `${content.workedExample.prompt}\n\nAnswer: ${content.workedExample.answer}.\n\nReasoning: ${content.workedExample.reasoning}`
      )
    }
  ];
}

/**
 * Teacher guide for topics whose core is ported CCSS lessons: full standard
 * text from the authoritative `data/ccss` registry, each standard attributed
 * to the interactive lesson(s) that develop it (Phase 2 augmentation).
 * `seedStandardIds` (the topic's own metadata, when it has real CCSS ids)
 * leads the ordering; lesson-carried standards follow.
 */
function ccssTeacherGuideBlock(topicId: string, seedStandardIds: string[]): ProductionLessonBlock {
  const metas = ccssLessonMetasForTopic(topicId);
  const attributionsByStandard = new Map<string, string[]>();
  metas.forEach((meta) => {
    meta.standardIds.forEach((id) => {
      const sources = attributionsByStandard.get(id) ?? [];
      sources.push(`${meta.emoji} ${meta.title}`);
      attributionsByStandard.set(id, sources);
    });
  });
  const orderedStandardIds = unique([
    ...seedStandardIds,
    ...metas.flatMap((meta) => meta.standardIds)
  ]).filter((id) => attributionsByStandard.has(id));

  return {
    idSuffix: "standards-coverage",
    type: "teacher-guide",
    title: textOnly("Standards developed in this unit"),
    content: textOnly(
      `This unit's lesson core is ${metas.length} interactive CCSS textbook lesson${metas.length === 1 ? "" : "s"} ported from the CCSS-Math-Textbook library — hand-built and mathematically verified (each lesson's Math Check states the fact it demonstrates and why it is true). The full CCSS standard text each lesson develops is listed below. The practice checkpoint leads with the library's hand-checked questions before the generated California bank.`
    ),
    items: orderedStandardIds.map((id) => {
      const description = findStandard(id)?.standard.description ?? "";
      const sources = attributionsByStandard.get(id) ?? [];
      return textOnly(`${id} — ${description} (${sources.join("; ")})`);
    })
  };
}

function textbookBlocks(lesson: GeneratedCaliforniaK5TextbookLesson): ProductionLessonBlock[] {
  const content = lesson.studentLesson.en;
  const standardIds = standardText(lesson.metadata.standardIds);
  const knowledgePoint = californiaKnowledgePointForTopic(
    lesson.metadata.topicId,
    lesson.metadata.grade,
    lesson.studentLesson.en.title
  );

  return withCaliforniaVisualizationBlock(lesson.metadata.topicId, [
    ...textbookCoreBlocks(lesson),
    {
      idSuffix: "guided-practice",
      type: "checklist",
      title: textOnly("Guided practice"),
      items: [
        ...content.learningGoals.map(textOnly),
        ...content.guidedPractice.map((item) => textOnly(`${item.prompt} Expected move: ${item.expectedMove}`))
      ]
    },
    {
      idSuffix: "mistake-repair",
      type: "extension",
      title: textOnly("Mistake repair"),
      items: [
        ...content.independentPractice.map(textOnly),
        ...content.commonPitfalls.map((item) => textOnly(pitfallItemText(item.pitfall, item.repairMove))),
        textOnly(content.exitTicket)
      ]
    },
    hasCcssLessonAssignment(lesson.metadata.topicId)
      ? ccssTeacherGuideBlock(lesson.metadata.topicId, lesson.metadata.standardIds)
      : {
          idSuffix: "standards-coverage",
          type: "teacher-guide",
          title: textOnly("Progress and standards coverage"),
          content: textOnly(
            `${knowledgePoint.code} ${knowledgePoint.title} is a MAIS-owned California knowledge point aligned to ${standardIds} as metadata only. The student copy is MAIS-authored and text-only for the California K-5 textbook/lesson beta; the practice checkpoint links the separate live California Math Practice Beta bank without using the downlisted K-5 practice package.`
          )
        }
  ]);
}

function toTextbookLessonSeed(lesson: GeneratedCaliforniaK5TextbookLesson): ProductionLessonSeed {
  const title = californiaKnowledgePointDisplayTitle(
    lesson.metadata.topicId,
    lesson.metadata.grade,
    lesson.studentLesson.en.title
  );

  // Mirrors `toLessonSeed`: name the blocks the page actually renders, since a
  // CCSS-assigned topic replaces the generated launch/worked-example text with
  // interactive lessons.
  const core = hasCcssLessonAssignment(lesson.metadata.topicId)
    ? "interactive CCSS textbook lessons"
    : "concept launch and worked example";

  return {
    topicId: lesson.metadata.topicId,
    productionReady: true,
    title: textOnly(title),
    description: textOnly(
      `${title} lesson from the S18-sampled California K-5 textbook beta package, with ${core}, guided practice, practice checkpoint, mistake repair, and coverage metadata.`
    ),
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    practiceQuestionIds: selectPracticeQuestionIds(lesson.metadata.topicId),
    blocks: textbookBlocks(lesson)
  };
}

function toCoverageRecord(topic: Topic): CaliforniaLessonCoverageRecord {
  const topicQuestions = questionsForTopic(topic.id);
  const title = textFrom(topic.title);
  const knowledgePoint = californiaKnowledgePointForTopic(topic.id, topic.grade, title.en);
  return {
    topicId: topic.id,
    grade: topic.grade,
    standardIds: unique(topicQuestions.flatMap((question) => question.standardIds)),
    domainTags: unique(topicQuestions.flatMap((question) => question.domainTags)),
    conceptIds: unique([
      knowledgePoint.code,
      knowledgePoint.title,
      ...topicQuestions.flatMap((question) => question.conceptIds)
    ]),
    skillStageIds: skillStages.map((stage) => `${topic.id}:${stage}`),
    practiceQuestionIds: selectPracticeQuestionIds(topic.id)
  };
}

function toLessonSeed(topic: Topic): ProductionLessonSeed {
  const topicQuestions = questionsForTopic(topic.id);
  const title = textFrom(topic.title);

  // G6–G12 chapter topics with a CCSS lesson assignment render the ported
  // interactive lessons as their core (Phase 5), replacing the templated
  // concept block and the bank-question worked example. The scaffolded
  // practice path and mistake-repair blocks stay; the teacher guide carries
  // the full standard text each lesson develops.
  const isCcssAssigned = hasCcssLessonAssignment(topic.id);
  const coreBlocks = isCcssAssigned
    ? ccssInteractiveLessonBlocks(topic.id)
    : [conceptBlock(topic, topicQuestions), workedExampleBlock(topic)];
  const teacherGuide = isCcssAssigned
    ? ccssTeacherGuideBlock(topic.id, [])
    : coverageGuideBlock(topic, topicQuestions);

  // The description is read on lesson cards and by the audio guide, so it has
  // to list the blocks the page actually renders: a CCSS-assigned topic shows
  // interactive lessons where the generated concept/worked-example text used
  // to be.
  const coreDescription = isCcssAssigned
    ? {
        en: "interactive CCSS textbook lessons",
        zh: "互動 CCSS 教科書課節",
        zhHans: "互动 CCSS 教科书课节"
      }
    : {
        en: "concept explanation and worked example",
        zh: "概念講解與例題",
        zhHans: "概念讲解与例题"
      };

  return {
    topicId: topic.id,
    // Chapter topics go live exactly when they carry an interactive CCSS
    // lesson core (Phase 5); unassigned ones stay beta-only as before.
    productionReady: isCcssAssigned,
    title,
    description: local(
      `${title.en} lesson module for California Math Practice Beta, with ${coreDescription.en}, scaffolded practice, mistake repair, and standards coverage metadata.`,
      `${title.zh} 的 California Math Practice Beta 課節模組，包含${coreDescription.zh}、分層練習、錯因補救與標準覆蓋資料。`,
      `${title.zhHans} 的 California Math Practice Beta 课节模块，包含${coreDescription.zhHans}、分层练习、错因补救与标准覆盖资料。`
    ),
    estimatedMinutes: Math.max(28, topic.minutes),
    practiceQuestionIds: selectPracticeQuestionIds(topic.id),
    blocks: withCaliforniaVisualizationBlock(topic.id, [
      ...coreBlocks,
      scaffoldedPracticeBlock(topic, topicQuestions),
      remediationBlock(topic, topicQuestions),
      teacherGuide
    ])
  };
}

const californiaK5TextbookTopicIds = new Set(kG5TextbookLessonPack.lessons.map((lesson) => lesson.metadata.topicId));

export const californiaElementaryMicroLessonCoverageRecords: CaliforniaLessonCoverageRecord[] =
  californiaElementaryMicroLessonSpecs.map(microCoverageRecord);

export const californiaK5TextbookLessonCoverageRecords: CaliforniaLessonCoverageRecord[] =
  kG5TextbookLessonPack.lessons.map(textbookCoverageRecord);

export const californiaQuestionLessonCoverageRecords: CaliforniaLessonCoverageRecord[] =
  usCaliforniaTopics
    .filter((topic) => !californiaK5TextbookTopicIds.has(topic.id) && !californiaElementaryMicroLessonTopicIds.has(topic.id))
    .map(toCoverageRecord);

export const usCaliforniaLessonCoverageRecords: CaliforniaLessonCoverageRecord[] = [
  ...californiaK5TextbookLessonCoverageRecords,
  ...californiaElementaryMicroLessonCoverageRecords,
  ...californiaQuestionLessonCoverageRecords
];

export const usCaliforniaLessonCoverageByTopicId = new Map(
  usCaliforniaLessonCoverageRecords.map((record) => [record.topicId, record])
);

export const californiaK5TextbookLessonSeeds: ProductionLessonSeed[] =
  kG5TextbookLessonPack.lessons.map(toTextbookLessonSeed);

export const californiaElementaryMicroLessonSeeds: ProductionLessonSeed[] =
  californiaElementaryMicroLessonSpecs.map(toMicroLessonSeed);

export const californiaQuestionLessonSeeds: ProductionLessonSeed[] =
  usCaliforniaTopics
    .filter((topic) => !californiaK5TextbookTopicIds.has(topic.id) && !californiaElementaryMicroLessonTopicIds.has(topic.id))
    .map(toLessonSeed);

export const usCaliforniaLessonSeeds: ProductionLessonSeed[] = [
  ...californiaK5TextbookLessonSeeds,
  ...californiaElementaryMicroLessonSeeds,
  ...californiaQuestionLessonSeeds
];

export const usCaliforniaStandardCoverageSummary = Array.from(
  usCaliforniaLessonCoverageRecords.reduce((groups, record) => {
    record.standardIds.forEach((standardId) => {
      const existing = groups.get(standardId) ?? {
        standardId,
        topicIds: new Set<string>(),
        practiceQuestionIds: new Set<string>(),
        skillStageIds: new Set<string>()
      };
      existing.topicIds.add(record.topicId);
      record.practiceQuestionIds.forEach((questionId) => existing.practiceQuestionIds.add(questionId));
      record.skillStageIds.forEach((skillStageId) => existing.skillStageIds.add(skillStageId));
      groups.set(standardId, existing);
    });
    return groups;
  }, new Map<string, { standardId: string; topicIds: Set<string>; practiceQuestionIds: Set<string>; skillStageIds: Set<string> }>())
).map(([, record]) => ({
  standardId: record.standardId,
  topicIds: Array.from(record.topicIds).sort(),
  practiceQuestionIds: Array.from(record.practiceQuestionIds).sort(),
  skillStageIds: Array.from(record.skillStageIds).sort()
}));

export function summarizeCaliforniaStandardProgress(
  input: CaliforniaStandardProgressInput = {}
): CaliforniaStandardProgressRecord[] {
  const completedTopicIds = new Set(input.completedTopicIds ?? []);
  const completedSkillStageIds = new Set(input.completedSkillStageIds ?? []);
  const attemptedQuestionIds = new Set(input.attemptedQuestionIds ?? []);

  return usCaliforniaStandardCoverageSummary.map((standard) => {
    const completedTopics = standard.topicIds.filter((topicId) => completedTopicIds.has(topicId));
    const completedStages = standard.skillStageIds.filter((stageId) => {
      const [topicId] = stageId.split(":");
      return completedSkillStageIds.has(stageId) || completedTopicIds.has(topicId);
    });
    const attemptedQuestions = standard.practiceQuestionIds.filter((questionId) =>
      attemptedQuestionIds.has(questionId)
    );
    const topicCompletionRatio = ratio(completedTopics.length, standard.topicIds.length);
    const checklistCompletionRatio = ratio(completedStages.length, standard.skillStageIds.length);
    const practiceAttemptRatio = ratio(attemptedQuestions.length, standard.practiceQuestionIds.length);
    const coverageRatio = rounded((topicCompletionRatio + checklistCompletionRatio + practiceAttemptRatio) / 3);
    const status =
      coverageRatio >= 1 ? "covered" : coverageRatio > 0 ? "in-progress" : "not-started";

    return {
      standardId: standard.standardId,
      topicIds: sortIds(standard.topicIds),
      completedTopicIds: sortIds(completedTopics),
      skillStageIds: sortIds(standard.skillStageIds),
      completedSkillStageIds: sortIds(completedStages),
      practiceQuestionIds: sortIds(standard.practiceQuestionIds),
      attemptedQuestionIds: sortIds(attemptedQuestions),
      topicCompletionRatio: rounded(topicCompletionRatio),
      checklistCompletionRatio: rounded(checklistCompletionRatio),
      practiceAttemptRatio: rounded(practiceAttemptRatio),
      coverageRatio,
      status
    };
  });
}
