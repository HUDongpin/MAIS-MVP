import lessonPackJson from "./generated-content/mainland-hjb-junior-lessons-v1/lessons.json";
import {
  joinWorkedExampleAnswerAndExplanation,
  localizeHjbGeneratedText,
  toSafeMainlandSimplifiedText,
  toTraditionalHjbText
} from "./hjbQuestionLocalization";
import { mainlandHjbJuniorQuestions } from "./mainlandHjbJuniorQuestions";
import type { Difficulty, LocalizedText, Question } from "@/types";
import type { ProductionLessonBlock, ProductionLessonSeed } from "./lessons";

type GeneratedCheckpoint = {
  id: string;
  prompt: string;
  answer: string;
  explanation: string;
};

type GeneratedWorkedExample = {
  title: string;
  prompt: string;
  solution: string;
  check: string;
};

type GeneratedGlossaryEntry = {
  term: string;
  definition: string;
};

type GeneratedStudentLesson = {
  title: string;
  hook: string;
  objectives: string[];
  prerequisiteWarmUp: string;
  conceptExplanation: string;
  workedExamples: GeneratedWorkedExample[];
  commonPitfalls: string[];
  misconceptionClinic: string[];
  strategyChecklist: string[];
  checkpoints: GeneratedCheckpoint[];
  examStyleStrategy: string;
  extension: string;
  exitTicket: string;
  glossary: GeneratedGlossaryEntry[];
};

type GeneratedLesson = {
  reviewStatus: string;
  integrationStatus: string;
  sourceDistanceStatus: string;
  metadata: {
    topicId: string;
    grade: string;
    semester: string;
    volume: string;
    unitTitle: string;
    evidenceCardIds: string[];
    estimatedMinutes: number;
  };
  studentLesson: {
    zhHans: GeneratedStudentLesson;
    en: GeneratedStudentLesson;
  };
  futureProductionMapping?: {
    productionLessonSeedReady?: boolean;
    practiceQuestionIntegration?: string;
  };
};

type GeneratedLessonPack = {
  lessons: GeneratedLesson[];
};

const lessonPack = lessonPackJson as GeneratedLessonPack;
const practiceDifficultyQuotas: Array<[Difficulty, number]> = [
  ["Low", 2],
  ["Medium", 3],
  ["High", 3]
];

const reviewedConceptZhHansByTopicId: Record<string, string> = {
  "hjb-junior-s1-upper-polynomial-add-subtract": "同类项必须含有相同字母，且相同字母的指数分别相同；合并同类项时只合并系数，字母和指数不变。去括号时要先看括号前的符号，括号前是负号时，括号内每一项都要变号。",
  "hjb-junior-s1-upper-polynomial-multiply-divide": "同底数幂相乘时底数不变、指数相加；幂的乘方要把指数相乘；积的乘方要把每个因式分别乘方。整式相乘要逐项使用分配律，最后合并同类项。",
  "hjb-junior-s1-upper-factorization": "因式分解是把一个多项式写成若干整式乘积的形式。先检查各项的最大公因式，再判断能否使用平方差或完全平方公式；完成后用展开乘积的方法反向检验。",
  "hjb-junior-s1-upper-algebraic-fractions": "分式有意义的前提是分母不为0。约分时只能约去分子、分母的公因式，并且必须保留原分式的取值限制；异分母分式运算前要先确定最简公分母。",
  "hjb-junior-s1-upper-figure-transformations": "平移、旋转和轴对称都保持图形的长度、角度和面积不变。坐标平移时，向右或向上分别给横坐标或纵坐标加数，向左或向下则减数；关于x轴对称时横坐标不变、纵坐标变号。",
  "hjb-junior-s1-lower-linear-inequalities": "解一元一次不等式时可以移项、合并同类项；两边同乘或同除以负数时，不等号方向必须改变。数轴表示中，严格不等号用空心点，含等号的不等号用实心点。",
  "hjb-junior-s1-lower-intersecting-parallel-lines": "相交直线形成的对顶角相等，邻补角的和是180°。两条直线平行时，同位角相等、内错角相等、同旁内角互补；这些关系也可按相应的逆命题判定两直线平行。",
  "hjb-junior-s1-lower-triangles": "三角形任意两边之和大于第三边，因此第三边x满足|a-b|<x<a+b。三角形内角和是180°，一个外角等于与它不相邻的两个内角之和。",
  "hjb-junior-s1-lower-isosceles-triangles": "等腰三角形的两个底角相等；反过来，有两个角相等的三角形是等腰三角形。等腰三角形顶角的角平分线同时也是底边上的中线和高。",
  "hjb-junior-s2-upper-real-numbers": "有理数可以写成两个整数之比，有限小数和无限循环小数都是有理数；无限不循环小数是无理数。比较根式大小时，可以利用平方关系或先确定相邻整数。",
  "hjb-junior-s2-upper-quadratic-radicals": "在实数范围内，二次根式有意义必须满足被开方数不小于0。化简时要提出被开方数中的完全平方因数；只有化简后被开方数相同的二次根式才能合并。",
  "hjb-junior-s2-upper-quadratic-equations": "一元二次方程的一般形式是ax²+bx+c=0（a≠0）。可用因式分解、配方或求根公式求解；判别式b²-4ac决定实根个数，根与系数关系给出两根的和与积。",
  "hjb-junior-s2-upper-right-triangles": "直角三角形满足两直角边平方和等于斜边平方；反过来，若三边满足这一关系，则三角形是直角三角形。面积法、角平分线性质和相似三角形可用于求高或线段长度。",
  "hjb-junior-s2-lower-quadrilaterals": "平行四边形的两组对边分别平行且相等、对角相等、对角线互相平分。判定时必须使用一组完整的充分条件；n边形内角和为(n-2)×180°，外角和恒为360°。",
  "hjb-junior-s2-lower-coordinate-plane": "坐标平移由同一个向量作用于每个点；关于x轴对称时(x,y)变为(x,-y)。两点间距离可由横、纵坐标差组成的直角三角形应用勾股定理求得。",
  "hjb-junior-s2-lower-linear-functions": "一次函数y=kx+b（k≠0）的图像是一条直线，k决定倾斜方向和变化快慢，b是纵截距。求解析式可代入两个点列方程；求与坐标轴交点时令另一个坐标为0。",
  "hjb-junior-s2-lower-inverse-functions": "反比例函数y=k/x（k≠0）满足xy=k且x≠0。当k>0时图像在第一、三象限；k<0时在第二、四象限。讨论增减性时必须限定在同一支曲线上。",
  "hjb-junior-s3-upper-similar-triangles": "相似三角形的对应角相等、对应边成比例，书写相似关系时必须保持顶点对应顺序一致。三角形中一条边的平行线常用来建立相似关系和比例式。",
  "hjb-junior-s3-upper-acute-trigonometry": "在直角三角形中，先相对指定锐角辨认对边、邻边和斜边，再选择正弦、余弦或正切。测高问题还要区分视线以上的高度与眼睛或仪器离地高度。",
  "hjb-junior-s3-upper-quadratic-functions": "二次函数的顶点式y=a(x-h)²+k直接给出顶点(h,k)和对称轴x=h。a的符号决定开口方向，顶点给出最大值或最小值；应用题还要写出符合实际的自变量范围。",
  "hjb-junior-s3-lower-circle-regular-polygons": "圆心到直线的距离d与半径r比较可判断直线和圆的位置关系。圆心到弦的垂线平分弦，切点处半径垂直于切线；正六边形内接于圆时边长等于圆的半径。",
  "hjb-junior-s3-lower-statistics-introduction": "平均数反映总体水平但容易受极端值影响，中位数更稳健，众数表示出现最频繁的值，方差衡量数据波动。比较稳定性时应在平均水平可比的前提下比较方差。"
};

function approvedForProduction(lesson: GeneratedLesson) {
  return (
    lesson.reviewStatus === "approved" &&
    lesson.integrationStatus === "production-integrated" &&
    lesson.sourceDistanceStatus === "passed-safe-rag" &&
    lesson.futureProductionMapping?.productionLessonSeedReady === true
  );
}

function localized(en: string, zhHans: string): LocalizedText {
  const simplified = toSafeMainlandSimplifiedText(zhHans);
  return { en, zh: toTraditionalHjbText(simplified), zhHans: simplified };
}

function withoutTerminalPunctuation(value: string) {
  return value.trim().replace(/[。！？.!?]+$/u, "");
}

function studentFacingEnglish(value: string) {
  return value
    .replace(/^This MAIS-authored lesson uses /u, "This lesson connects ")
    .replace(/ to connect /u, " with ")
    .replace(/ into one teachable path\./u, " in a coherent learning path.")
    .replace(/This S\d+ (?:upper|lower) unit/u, "This unit")
    .replace(/In the MAIS version, learners/u, "Learners")
    .replace(/new MAIS explanation/gu, "lesson explanation")
    .replace(/\s*Examples use new values, contexts, and explanations rather than textbook wording or layouts\./u, "")
    .trim();
}

function studentFacingChinese(value: string) {
  return value
    .replace(/用 MAIS 原创情境把/gu, "把")
    .replace(/在 MAIS 版本中，学生/gu, "学生")
    .replace(/所有例子都使用新编数值、语境和说明，不复现原教材题目。/gu, "")
    .trim();
}

function volumeTitleEn(volume: string) {
  const match = volume.match(/^([六七八九])年级([上下])册$/u);
  if (!match) return "the current volume";
  const gradeByCharacter: Record<string, number> = { 六: 6, 七: 7, 八: 8, 九: 9 };
  return `Grade ${gradeByCharacter[match[1]]} Volume ${match[2] === "上" ? 1 : 2}`;
}

function questionIdSort(left: Question, right: Question) {
  return left.id.localeCompare(right.id, "zh-Hans");
}

function selectPracticeQuestionIds(topicId: string) {
  const topicQuestions = mainlandHjbJuniorQuestions.filter((question) => question.topicId === topicId).sort(questionIdSort);
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

function localizedQuestionValue(question: Question, language: "en" | "zh" | "zhHans") {
  return question.prompt[language] ?? question.prompt.zh;
}

function formattedOptions(question: Question, language: "en" | "zh" | "zhHans") {
  if (!question.options?.length) return "";
  const labels = ["A", "B", "C", "D", "E", "F"];
  return question.options.map((option, index) => {
    const value = option[language] ?? option.zh;
    return /^[A-F][.．、]\s*/u.test(value) ? value : `${labels[index]}. ${value}`;
  }).join(" ");
}

function formattedQuestion(question: Question, language: "en" | "zh" | "zhHans") {
  const prompt = localizedQuestionValue(question, language).trim();
  const options = formattedOptions(question, language);
  const answer = localizeHjbGeneratedText(question.answer)[language] ?? question.answer;
  const explanation = withoutTerminalPunctuation(question.explanation[language] ?? question.explanation.zh);
  if (language === "en") {
    const promptSeparator = /[.!?]$/u.test(prompt) ? " " : ". ";
    const answerAndExplanation = joinWorkedExampleAnswerAndExplanation(answer, explanation, "en");
    return `${prompt}${promptSeparator}${options ? `Options: ${options}. ` : ""}Answer: ${answerAndExplanation}${/[.!?]$/u.test(answerAndExplanation) ? "" : "."}`;
  }
  const optionLabel = language === "zh" ? "選項" : "选项";
  const answerLabel = language === "zh" ? "答案" : "答案";
  const promptSeparator = /[。！？]$/u.test(prompt) ? "" : "。";
  const answerAndExplanation = joinWorkedExampleAnswerAndExplanation(answer, explanation, language);
  return `${prompt}${promptSeparator}${options ? `${optionLabel}：${options}。` : ""}${answerLabel}：${answerAndExplanation}${/[。！？]$/u.test(answerAndExplanation) ? "" : "。"}`;
}

function workedExampleContent(practiceQuestions: Question[]) {
  const [example, ...checkpoints] = practiceQuestions;
  if (!example) return localized("Complete the lesson checkpoint.", "完成本课检查题。");
  const enChecks = checkpoints.slice(0, 2).map((question, index) => `Checkpoint ${index + 1}: ${formattedQuestion(question, "en")}`).join("\n");
  const zhChecks = checkpoints.slice(0, 2).map((question, index) => `小检查 ${index + 1}：${formattedQuestion(question, "zhHans")}`).join("\n");
  return localized(
    `Worked example: ${formattedQuestion(example, "en")}\n\n${enChecks}`,
    `例题：${formattedQuestion(example, "zhHans")}\n\n${zhChecks}`
  );
}

function checklistItems(lesson: GeneratedLesson): LocalizedText[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    localized(en.objectives[0], zh.objectives[0]),
    localized(en.objectives[1], zh.objectives[1]),
    localized(en.objectives[2], zh.objectives[2]),
    localized(`Strategy: ${en.strategyChecklist[1]}`, `策略：${zh.strategyChecklist[1]}`),
    localized(`Avoid: ${en.commonPitfalls[0]}`, `避免：${zh.commonPitfalls[0]}`)
  ];
}

function extensionItems(lesson: GeneratedLesson): LocalizedText[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  return [
    localized(en.examStyleStrategy, zh.examStyleStrategy),
    localized(en.extension, zh.extension),
    localized(en.exitTicket, zh.exitTicket)
  ];
}

function productionBlocks(lesson: GeneratedLesson, practiceQuestions: Question[]): ProductionLessonBlock[] {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const reviewedConceptZhHans = reviewedConceptZhHansByTopicId[lesson.metadata.topicId];
  if (!reviewedConceptZhHans) throw new Error(`Missing reviewed HJB junior concept for ${lesson.metadata.topicId}`);

  return [
    {
      idSuffix: "concept",
      type: "concept",
      title: localized("Core concept", "核心概念"),
      content: localized(
        `${studentFacingEnglish(en.hook)} ${en.prerequisiteWarmUp} ${studentFacingEnglish(en.conceptExplanation)}`,
        reviewedConceptZhHans
      )
    },
    {
      idSuffix: "worked-example",
      type: "worked-example",
      title: localized("Original worked examples and checks", "原创例题与小检查"),
      content: workedExampleContent(practiceQuestions)
    },
    {
      idSuffix: "checklist",
      type: "checklist",
      title: localized("Before practice", "练习前检查"),
      items: checklistItems(lesson)
    },
    {
      idSuffix: "extension",
      type: "extension",
      title: localized("Extension and exit ticket", "拓展与出门票"),
      items: extensionItems(lesson)
    },
    {
      idSuffix: "teacher-guide",
      type: "teacher-guide",
      title: localized("Teacher guide", "教师使用建议"),
      content: localized(
        `Use the checkpoint for ${volumeTitleEn(lesson.metadata.volume)} to identify whether learners are ready for more independent practice.`,
        `先用本课检查题了解学生的掌握情况，再按需要安排独立练习。`
      ),
      items: [
        localized("Ask learners to name the condition before choosing a method.", "先让学生说出条件，再选择方法。"),
        localized("Use the misconception clinic before assigning independent practice.", "布置独立练习前，先用错因诊断确认理解。"),
        localized("Choose follow-up questions that match the same unit, grade, and learning goal.", "后续练习应与本单元、年级和学习目标一致。")
      ]
    }
  ];
}

function toProductionLessonSeed(lesson: GeneratedLesson): ProductionLessonSeed {
  const zh = lesson.studentLesson.zhHans;
  const en = lesson.studentLesson.en;
  const practiceQuestionIds = selectPracticeQuestionIds(lesson.metadata.topicId);
  const questionById = new Map(mainlandHjbJuniorQuestions.map((question) => [question.id, question]));
  const practiceQuestions = practiceQuestionIds
    .map((questionId) => questionById.get(questionId))
    .filter((question): question is Question => Boolean(question));

  return {
    topicId: lesson.metadata.topicId,
    productionReady: true,
    title: localized(en.title, zh.title),
    description: localized(studentFacingEnglish(en.hook), studentFacingChinese(zh.hook)),
    estimatedMinutes: lesson.metadata.estimatedMinutes,
    practiceQuestionIds,
    blocks: productionBlocks(lesson, practiceQuestions)
  };
}

export const mainlandHjbJuniorLessonSeeds: ProductionLessonSeed[] = lessonPack.lessons
  .filter(approvedForProduction)
  .map(toProductionLessonSeed);
