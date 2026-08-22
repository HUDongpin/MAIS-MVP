import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  mainlandBnuHighLessonSeeds,
  mainlandBnuHighReviewedWorkedExamples
} from "../data/mainlandBnuHighLessons";
import { chinaLessonEnglishTranslation } from "../data/chinaLessonEnglishTranslations";
import { chinaLessonTraditionalTranslation } from "../data/chinaLessonTraditionalTranslations";
import { questions } from "../data/questions";
import { validateRestoredTranslation } from "../scripts/china-lesson-english-translation-validation";
import { mapDifficultyToActive } from "./difficulty";
import { localizedCorrectAnswerForFeedback } from "./server/answerFeedback";
import { questionAnswerMatches } from "./server/answerGrading";

type ArtifactQuestion = {
  id: string;
  topicId: string;
  type: string;
  difficulty: string;
  promptZhHans: string;
  optionsZhHans: string[];
  answer: string;
  acceptedAnswers: string[];
  explanationZhHans: string;
};

type Contract = {
  id: string;
  topicId: string;
  type: "multiple-choice" | "fill-in" | "short-answer";
  difficulty: "Foundation" | "Core" | "Exam";
  taskFamily: string;
  prompt: string;
  promptZh: string;
  promptEn: string;
  options: string[];
  optionsZh: string[];
  optionsEn: string[];
  answer: string;
  accepted: string[];
  rejected: string[];
  explanation: string;
  explanationZh: string;
  explanationEn: string;
  feedback?: { en: string; zh: string; zhHans?: string };
};

test("BNU high exponential-growth aliases use the bacterial count noun without a malformed generic classifier", () => {
  const question = questions.find((candidate) => candidate.id === "bnu-high-ds-v1-s4-077");
  assert.ok(question, "s4-077 production exponential-growth question");
  const aliases = question.acceptedAnswers ?? [];
  assert.equal(aliases.includes("N(t)=80×2^(t/3); N(9)=640 bacteria"), true);
  assert.equal(aliases.some((alias) => /640items\b/iu.test(alias)), false);
  assert.equal(questionAnswerMatches({
    id: question.id,
    answer: question.answer,
    accepted_answers: aliases,
    options: question.options
  }, "N(t)=80×2^(t/3); N(9)=640 bacteria"), true);
  assert.equal(questionAnswerMatches({
    id: question.id,
    answer: question.answer,
    accepted_answers: aliases,
    options: question.options
  }, "N(t)=80×2^(t/3); N(9)=640"), true);
});

function permutations<T>(values: readonly T[]): T[][] {
  if (values.length === 0) return [[]];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)])
      .map((rest) => [value, ...rest])
  );
}

const sampleSpaceAccepted = [
  ...permutations(["HH", "HT", "TH", "TT"] as const).flatMap((outcomes) => [
    `Ω={${outcomes.join(",")}}；1/2`,
    `Ω={${outcomes.join(",")}}; 1/2`
  ]),
  "Ω={正正,正反,反正,反反}；1/2",
  "Omega={HH,HT,TH,TT}; 1/2"
];

assert.equal(sampleSpaceAccepted.length, 50);
assert.equal(new Set(sampleSpaceAccepted).size, 50);

const contracts: Contract[] = [
  {
    id: "bnu-high-ds-v1-s4-006",
    topicId: "bnu-high-s4-预备知识",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "sufficient-not-necessary-condition",
    prompt: "设命题p为x>2，命题q为x>1。p是q的____条件（从“充分不必要”“必要不充分”“充要”“既不充分也不必要”中选择）。",
    promptZh: "設命題p為x>2，命題q為x>1。p是q的____條件（從「充分不必要」「必要不充分」「充要」「既不充分也不必要」中選擇）。",
    promptEn: "Let p be the statement x>2 and q be the statement x>1. Then p is a ____ condition for q. Choose from “sufficient but not necessary,” “necessary but not sufficient,” “necessary and sufficient,” or “neither sufficient nor necessary.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "充分不必要",
    accepted: ["充分不必要", "充分但不必要", "充分非必要", "sufficient but not necessary"],
    rejected: ["必要不充分", "充要", "既不充分也不必要", "necessary but not sufficient"],
    explanation: "若x>2，则一定有x>1，所以p能推出q；但x=3/2时q成立而p不成立，因此q不能推出p。故p是q的充分不必要条件。",
    explanationZh: "若x>2，則一定有x>1，所以p能推出q；但x=3/2時q成立而p不成立，因此q不能推出p。故p是q的充分不必要條件。",
    explanationEn: "If x>2, then x>1, so p implies q. However, x=3/2 satisfies q but not p, so q does not imply p. Therefore, p is sufficient but not necessary for q.",
    feedback: { en: "sufficient but not necessary", zh: "充分不必要", zhHans: "充分不必要" }
  },
  {
    id: "bnu-high-ds-v1-s4-005",
    topicId: "bnu-high-s4-预备知识",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "absolute-value-inequality",
    prompt: "解不等式|2x-1|≤3，并用区间表示解集。",
    promptZh: "解不等式|2x-1|≤3，並用區間表示解集。",
    promptEn: "Solve |2x-1|≤3 and express the solution set in interval notation.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "[-1,2]",
    accepted: ["[-1,2]", "-1≤x≤2", "x∈[-1,2]", "x in [-1,2]"],
    rejected: ["(-1,2)", "[-1,2)", "(-1,2]", "[-2,1]"],
    explanation: "由|2x-1|≤3得-3≤2x-1≤3，所以-2≤2x≤4，进而-1≤x≤2，解集为[-1,2]。",
    explanationZh: "由|2x-1|≤3得-3≤2x-1≤3，所以-2≤2x≤4，進而-1≤x≤2，解集為[-1,2]。",
    explanationEn: "From |2x-1|≤3, we get -3≤2x-1≤3, so -2≤2x≤4 and hence -1≤x≤2. Therefore, the solution set is [-1,2]."
  },
  {
    id: "bnu-high-ds-v1-s4-042",
    topicId: "bnu-high-s4-函数",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "piecewise-function-evaluation",
    prompt: "函数f(x)={x+2，x<0；x²，x≥0}，则f(-3)+f(2)=____。",
    promptZh: "函數f(x)={x+2，x<0；x²，x≥0}，則f(-3)+f(2)=____。",
    promptEn: "For the piecewise function f(x)={x+2 for x<0; x² for x≥0}, f(-3)+f(2)=____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "3",
    accepted: ["3", "f(-3)+f(2)=3"],
    rejected: ["-5", "4", "5"],
    explanation: "因为-3<0，所以f(-3)=-3+2=-1；因为2≥0，所以f(2)=2²=4。因此f(-3)+f(2)=3。",
    explanationZh: "因為-3<0，所以f(-3)=-3+2=-1；因為2≥0，所以f(2)=2²=4。因此f(-3)+f(2)=3。",
    explanationEn: "Because -3<0, f(-3)=-3+2=-1. Because 2≥0, f(2)=2²=4. Hence f(-3)+f(2)=3."
  },
  {
    id: "bnu-high-ds-v1-s4-041",
    topicId: "bnu-high-s4-函数",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "function-parity",
    prompt: "判断函数f(x)=x³+x（定义域为R）的奇偶性，并写出代数依据。请按“结论；依据”作答。",
    promptZh: "判斷函數f(x)=x³+x（定義域為R）的奇偶性，並寫出代數依據。請按「結論；依據」作答。",
    promptEn: "Determine the parity of f(x)=x³+x on R (the real numbers) and give the algebraic justification. Answer in the form “conclusion; justification.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "奇函数；f(-x)=-f(x)",
    accepted: ["奇函数；f(-x)=-f(x)", "f(x)是奇函数；f(-x)=-f(x)", "奇函數；f(-x)=-f(x)", "Odd function; f(-x)=-f(x)"],
    rejected: ["奇函数", "f(-x)=-f(x)", "Odd function", "偶函数；f(-x)=f(x)"],
    explanation: "定义域R关于原点对称，且f(-x)=(-x)³+(-x)=-x³-x=-f(x)，所以f是奇函数。",
    explanationZh: "定義域R關於原點對稱，且f(-x)=(-x)³+(-x)=-x³-x=-f(x)，所以f是奇函數。",
    explanationEn: "The domain R is symmetric about the origin, and f(-x)=(-x)³+(-x)=-x³-x=-f(x). Therefore, f is odd.",
    feedback: { en: "Odd function; f(-x)=-f(x)", zh: "奇函數；f(-x)=-f(x)", zhHans: "奇函数；f(-x)=-f(x)" }
  },
  {
    id: "bnu-high-ds-v1-s4-078",
    topicId: "bnu-high-s4-指数运算与指数函数",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "exponential-base-monotonicity",
    prompt: "指数函数f(x)=a^x（a>0且a≠1）在R上单调递减，则a的取值范围是____。",
    promptZh: "指數函數f(x)=a^x（a>0且a≠1）在R上單調遞減，則a的取值範圍是____。",
    promptEn: "The exponential function f(x)=a^x (a>0 and a≠1) is decreasing on R (the real numbers). Find the range of a.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "0<a<1",
    accepted: ["0<a<1", "a∈(0,1)", "(0,1)"],
    rejected: ["a>1", "a∈(1,+∞)", "0<a≤1", "a≥1"],
    explanation: "指数函数y=a^x在0<a<1时单调递减，在a>1时单调递增。因此a的取值范围为0<a<1。",
    explanationZh: "指數函數y=a^x在0<a<1時單調遞減，在a>1時單調遞增。因此a的取值範圍為0<a<1。",
    explanationEn: "The function y=a^x is decreasing when 0<a<1 and increasing when a>1. Therefore, 0<a<1."
  },
  {
    id: "bnu-high-ds-v1-s4-077",
    topicId: "bnu-high-s4-指数运算与指数函数",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "exponential-growth-model",
    prompt: "某细菌培养物初始有80个细菌，每3小时数量变为原来的2倍。设t为培养时间（小时），建立数量模型N(t)，其中t≥0，并求t=9时的数量。请按“模型；数量”作答。",
    promptZh: "某細菌培養物初始有80個細菌，每3小時數量變為原來的2倍。設t為培養時間（小時），建立數量模型N(t)，其中t≥0，並求t=9時的數量。請按「模型；數量」作答。",
    promptEn: "A bacterial culture initially contains 80 bacteria, and its population is multiplied by 2 every 3 hours. Let t be the time in hours. Build a model N(t), where t≥0, and find the population at t=9. Answer in the form “model; population.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "N(t)=80×2^(t/3)；N(9)=640个",
    accepted: ["N(t)=80×2^(t/3)；N(9)=640个", "N(t)=80·2^(t/3)；640个", "N(t)=80×2^(t/3)；N(9)=640個", "N(t)=80×2^(t/3); N(9)=640 bacteria", "N(t)=80×2^(t/3); N(9)=640"],
    rejected: ["N(t)=80×2^(t/3)", "N(9)=640个", "640个", "N(t)=80×2^t；N(9)=40960个", "N(t)=80×2^(t/3)；N(9)=720个"],
    explanation: "每3小时乘2，所以经过t小时共有t/3个倍增周期，N(t)=80×2^(t/3)。当t=9时，N(9)=80×2³=640。",
    explanationZh: "每3小時乘2，所以經過t小時共有t/3個倍增週期，N(t)=80×2^(t/3)。當t=9時，N(9)=80×2³=640。",
    explanationEn: "Because the population is multiplied by 2 every 3 hours, there are t/3 doubling periods in t hours, so N(t)=80×2^(t/3). At t=9, N(9)=80×2³=640.",
    feedback: { en: "N(t)=80×2^(t/3); N(9)=640 bacteria", zh: "N(t)=80×2^(t/3)；N(9)=640個", zhHans: "N(t)=80×2^(t/3)；N(9)=640个" }
  },
  {
    id: "bnu-high-ds-v1-s4-114",
    topicId: "bnu-high-s4-对数运算与对数函数",
    type: "fill-in",
    difficulty: "Foundation",
    taskFamily: "logarithmic-equation",
    prompt: "解方程log_2(x-1)=3，x=____。",
    promptZh: "解方程log_2(x-1)=3，x=____。",
    promptEn: "Solve log_2(x-1)=3. Then x=____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "9",
    accepted: ["9", "x=9"],
    rejected: ["8", "x=8", "4", "m=9"],
    explanation: "真数要求x-1>0。由log_2(x-1)=3得x-1=2³=8，所以x=9，且满足定义域。",
    explanationZh: "真數要求x-1>0。由log_2(x-1)=3得x-1=2³=8，所以x=9，且滿足定義域。",
    explanationEn: "The logarithm requires x-1>0. From log_2(x-1)=3, x-1=2³=8, so x=9, which satisfies the domain."
  },
  {
    id: "bnu-high-ds-v1-s4-113",
    topicId: "bnu-high-s4-对数运算与对数函数",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "logarithmic-monotonicity",
    prompt: "函数f(x)=log_(1/2)x的定义域为(0,+∞)。判断其单调性，并比较f(2)与f(4)的大小。请按“单调性；大小关系”作答。",
    promptZh: "函數f(x)=log_(1/2)x的定義域為(0,+∞)。判斷其單調性，並比較f(2)與f(4)的大小。請按「單調性；大小關係」作答。",
    promptEn: "The function f(x)=log_(1/2)x has domain (0,+∞). State its monotonicity and compare f(2) with f(4). Answer in the form “monotonicity; comparison.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "在(0,+∞)上单调递减；f(2)>f(4)",
    accepted: ["在(0,+∞)上单调递减；f(2)>f(4)", "在(0,+∞)上递减；f(2)>f(4)", "在(0,+∞)上單調遞減；f(2)>f(4)", "Decreasing on (0,+∞); f(2)>f(4)"],
    rejected: ["在(0,+∞)上单调递减", "f(2)>f(4)", "Decreasing on (0,+∞)", "在(0,+∞)上单调递增；f(2)<f(4)"],
    explanation: "因为底数1/2满足0<1/2<1，所以f在(0,+∞)上单调递减。又2<4，因此f(2)>f(4)。",
    explanationZh: "因為底數1/2滿足0<1/2<1，所以f在(0,+∞)上單調遞減。又2<4，因此f(2)>f(4)。",
    explanationEn: "Because the base 1/2 satisfies 0<1/2<1, f is decreasing on (0,+∞). Since 2<4, f(2)>f(4).",
    feedback: { en: "Decreasing on (0,+∞); f(2)>f(4)", zh: "在(0,+∞)上單調遞減；f(2)>f(4)", zhHans: "在(0,+∞)上单调递减；f(2)>f(4)" }
  },
  {
    id: "bnu-high-ds-v1-s4-181",
    topicId: "bnu-high-s4-统计",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "representative-sampling-design",
    prompt: "为调查全校学生每日睡眠时长，下列抽样方案中最有代表性的是（ ）。",
    promptZh: "為調查全校學生每日睡眠時長，下列抽樣方案中最有代表性的是（ ）。",
    promptEn: "To investigate students' daily sleep duration across the whole school, which sampling plan is the most representative?",
    options: ["按各年级人数比例，从每个年级随机抽取学生", "只抽取校篮球队学生", "只抽取每天最早到校的学生", "在学校社交平台上征集自愿回答者"],
    optionsZh: ["按各年級人數比例，從每個年級隨機抽取學生", "只抽取校籃球隊學生", "只抽取每天最早到校的學生", "在學校社交媒體平台上徵集自願回答者"],
    optionsEn: ["Randomly sample students from every grade in proportion to each grade's enrollment.", "Sample only students on the school basketball team.", "Sample only the students who arrive at school earliest each day.", "Invite voluntary responses on the school's social media platform."],
    answer: "按各年级人数比例，从每个年级随机抽取学生",
    accepted: ["按各年级人数比例，从每个年级随机抽取学生", "按各年級人數比例，從每個年級隨機抽取學生", "Randomly sample students from every grade in proportion to each grade's enrollment.", "A", "A. 按各年级人数比例，从每个年级随机抽取学生"],
    rejected: ["只抽取校篮球队学生", "只抽取每天最早到校的学生", "在学校社交平台上征集自愿回答者"],
    explanation: "按年级人数比例进行分层随机抽样，能让各年级按总体结构进入样本。其余方案分别受到运动队选择、到校时间选择或自愿回答偏差影响。",
    explanationZh: "按年級人數比例進行分層隨機抽樣，能讓各年級按總體結構進入樣本。其餘方案分別受到運動隊選擇、到校時間選擇或自願回答偏差影響。",
    explanationEn: "Proportionate stratified random sampling represents every grade according to its share of the school population. The other plans introduce athletic-team selection, arrival-time selection, or voluntary-response bias.",
    feedback: { en: "Randomly sample students from every grade in proportion to each grade's enrollment.", zh: "按各年級人數比例，從每個年級隨機抽取學生", zhHans: "按各年级人数比例，从每个年级随机抽取学生" }
  },
  {
    id: "bnu-high-ds-v1-s4-187",
    topicId: "bnu-high-s4-统计",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "frequency-distribution-relative-frequency",
    prompt: "某样本按区间[0,10)、[10,20)、[20,30)、[30,40)分组，对应频数分别为4、8、12、6。区间[20,30)的频率是（ ）。",
    promptZh: "某樣本按區間[0,10)、[10,20)、[20,30)、[30,40)分組，對應頻數分別為4、8、12、6。區間[20,30)的頻率是（ ）。",
    promptEn: "A sample is grouped into intervals [0,10), [10,20), [20,30), and [30,40), with frequencies 4, 8, 12, and 6. What is the relative frequency of [20,30)?",
    options: ["20%", "30%", "40%", "60%"], optionsZh: ["20%", "30%", "40%", "60%"], optionsEn: ["20%", "30%", "40%", "60%"],
    answer: "40%",
    accepted: ["40%", "0.4", "C", "C. 40%"],
    rejected: ["20%", "30%", "60%"],
    explanation: "样本总数为4+8+12+6=30，区间[20,30)的频数为12，所以频率为12/30=0.4=40%。",
    explanationZh: "樣本總數為4+8+12+6=30，區間[20,30)的頻數為12，所以頻率為12/30=0.4=40%。",
    explanationEn: "The sample size is 4+8+12+6=30. The interval [20,30) has frequency 12, so its relative frequency is 12/30=0.4=40%.",
    feedback: { en: "40%", zh: "40%", zhHans: "40%" }
  },
  {
    id: "bnu-high-ds-v1-s4-221",
    topicId: "bnu-high-s4-概率",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "sample-space-event-probability",
    prompt: "同时抛掷两枚可区分的均匀硬币，用“H”表示正面、“T”表示反面。写出样本空间Ω，并求恰有一枚硬币出现正面的概率。请按“样本空间；概率”作答。",
    promptZh: "同時拋擲兩枚可區分的公平硬幣，用「H」表示正面、「T」表示反面。寫出樣本空間Ω，並求恰有一枚硬幣出現正面的概率。請按「樣本空間；概率」作答。",
    promptEn: "Two distinguishable fair coins are tossed simultaneously. Let “H” denote heads and “T” denote tails. Write the sample space Ω and find the probability of exactly one head. Answer in the form “sample space; probability.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "Ω={HH,HT,TH,TT}；1/2",
    accepted: sampleSpaceAccepted,
    rejected: ["Ω={HH,HT,TH,TT}", "{HH,HT,TH,TT}", "1/2", "P(恰有一个H)=1/2", "Ω={HH,TT}；1/2", "Ω={HH,HT,TH,TT}；1/4"],
    explanation: "两枚硬币可区分，四个等可能结果分别记作“HH”“HT”“TH”“TT”，组成样本空间Ω。恰有一个“H”的结果是“HT”“TH”，共2个，所以概率为2/4=1/2。",
    explanationZh: "兩枚硬幣可區分，四個等可能結果分別記作「HH」「HT」「TH」「TT」，組成樣本空間Ω。恰有一個「H」的結果是「HT」「TH」，共2個，所以概率為2/4=1/2。",
    explanationEn: "The four equally likely outcomes, denoted “HH,” “HT,” “TH,” and “TT,” form the sample space Ω. The outcomes with exactly one “H” are “HT” and “TH,” giving 2 outcomes, so the probability is 2/4=1/2."
  },
  {
    id: "bnu-high-ds-v1-s4-220",
    topicId: "bnu-high-s4-概率",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "frequency-versus-theoretical-probability",
    prompt: "将一枚均匀硬币独立抛掷1000次，观察到正面487次。下列说法正确的是（ ）。",
    promptZh: "將一枚公平硬幣獨立拋擲1000次，觀察到正面487次。下列說法正確的是（ ）。",
    promptEn: "A fair coin is tossed independently 1000 times, producing 487 heads. Which statement is correct?",
    options: ["0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定", "因为487不等于500，所以这枚硬币一定不均匀", "下一次抛掷出现正面的概率一定是0.487", "再做一次同样的试验，正面频率必定恰好等于0.5"],
    optionsZh: ["0.487是本次試驗的正面頻率，可作為理論概率0.5的估計；重複次數增加時頻率通常會更穩定", "因為487不等於500，所以這枚硬幣一定不公平", "下一次拋擲出現正面的概率一定是0.487", "再做一次同樣的試驗，正面頻率必定恰好等於0.5"],
    optionsEn: ["The observed head frequency is 0.487, which estimates the theoretical probability 0.5; the frequency usually becomes more stable as the number of trials increases.", "Because 487 is not 500, the coin must be unfair.", "The probability of heads on the next toss must be 0.487.", "If the experiment is repeated, the head frequency must be exactly 0.5."],
    answer: "0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定",
    accepted: ["0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定", "0.487是本次試驗的正面頻率，可作為理論概率0.5的估計；重複次數增加時頻率通常會更穩定", "The observed head frequency is 0.487, which estimates the theoretical probability 0.5; the frequency usually becomes more stable as the number of trials increases.", "A", "A. 0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定"],
    rejected: ["因为487不等于500，所以这枚硬币一定不均匀", "下一次抛掷出现正面的概率一定是0.487", "再做一次同样的试验，正面频率必定恰好等于0.5"],
    explanation: "本次经验频率为487/1000=0.487，它可估计理论概率0.5，但有限次试验频率不必等于理论概率；下一次概率仍为0.5，另一次试验也不保证频率恰为0.5。",
    explanationZh: "本次經驗頻率為487/1000=0.487，它可估計理論概率0.5，但有限次試驗頻率不必等於理論概率；下一次概率仍為0.5，另一次試驗也不保證頻率恰為0.5。",
    explanationEn: "The empirical frequency is 487/1000=0.487, which estimates the theoretical probability 0.5. A finite-run frequency need not equal the theoretical probability; the next-toss probability remains 0.5, and a repeated experiment need not produce frequency exactly 0.5.",
    feedback: { en: "The observed head frequency is 0.487, which estimates the theoretical probability 0.5; the frequency usually becomes more stable as the number of trials increases.", zh: "0.487是本次試驗的正面頻率，可作為理論概率0.5的估計；重複次數增加時頻率通常會更穩定", zhHans: "0.487是本次试验的正面频率，可作为理论概率0.5的估计；重复次数增加时频率通常会更稳定" }
  }
];

const targetIds = new Set(contracts.map(({ id }) => id));
const packageRoot = new URL("../coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("reviewed-approved-row-overrides.json", packageRoot), "utf8")) as {
  expectedOverrideCount: number;
  overrides: Array<{
    id: string;
    expectedTopicId: string;
    expectedType: string;
    expectedDifficulty: string;
    taskFamily: string;
    promptZhHans: string;
    optionsZhHans: string[];
    answer: string;
    acceptedAnswers: string[];
    explanationZhHans: string;
  }>;
};
const familyManifest = JSON.parse(readFileSync(new URL("approved-question-family-manifest.json", packageRoot), "utf8")) as {
  expectedQuestionCount: number;
  rows: Array<{ id: string; topicId: string; taskFamily: string }>;
};
const generationPlanHeaders = [
  "id", "batch", "grade", "semester", "topicId", "topicTitleZhHans", "volume", "chapter", "conceptIds",
  "competencyTags", "skillTags", "misconceptionTags", "difficulty", "type", "evidenceCardIds",
  "assessmentPatternCardIds", "sourceDistanceStatus", "mathQaStatus", "terminologyQaStatus", "manualQaStatus",
  "reviewNotes"
] as const;
type GenerationPlanRow = Record<string, unknown> & { id: string; topicId: string; type: string; difficulty: string };
const generationPlan = readFileSync(new URL("generation-plan.jsonl", packageRoot), "utf8").trim().split(/\n/u)
  .map((line) => JSON.parse(line) as GenerationPlanRow);
const generationPlanCsv = readFileSync(new URL("generation-plan.csv", packageRoot), "utf8");
const coordinationRows = (JSON.parse(readFileSync(new URL("question-pack.approved.json", packageRoot), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const productionRows = (JSON.parse(readFileSync(new URL("../data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json", import.meta.url), "utf8")) as { questions: ArtifactQuestion[] }).questions;
const jsonlRows = readFileSync(new URL("approved-questions.jsonl", packageRoot), "utf8").trim().split(/\n/u)
  .map((line) => JSON.parse(line) as ArtifactQuestion);
const runtimeById = new Map(questions.map((question) => [question.id, question]));

function sha256(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function csvEscape(value: unknown) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/gu, '""').replace(/\r?\n/gu, "\\n")}"`;
}

function renderGenerationPlanCsv(rows: GenerationPlanRow[]) {
  const lines = [
    generationPlanHeaders.map(csvEscape).join(","),
    ...rows.map((row) => generationPlanHeaders.map((header) => csvEscape(row[header])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

function gradingPayload(question: NonNullable<ReturnType<typeof runtimeById.get>>) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("BNU high Batch 2B stores exactly twelve reviewed rows without changing the prior 67 or other artifacts", () => {
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.equal(manifest.overrides.length, 98);
  assert.equal(new Set(manifest.overrides.map(({ id }) => id)).size, 98);
  assert.equal(sha256(manifest.overrides.slice(0, 67)), "b50e3008994a08f89c544cb150953552ca263447be760a2feed9935587e7a7f6");
  assert.deepEqual(manifest.overrides.slice(67, 79).map(({ id }) => id), contracts.map(({ id }) => id));
  assert.equal(sha256(manifest.overrides.slice(0, 79)), "96a76341e77270223de80ce8f40a255bdb7618e5161adff987af7023d55130e1");

  assert.equal(generationPlan.length, 1_500);
  assert.equal(new Set(generationPlan.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(generationPlan), "be19b5926eac3f3ef2143722cadf731ad7d6fd17138dd2d96b017ebca15a281c");
  assert.equal(sha256(generationPlan.filter(({ id }) => !targetIds.has(id))), "7823333f667cc82a7474ff488709896dbd8993058d52271496fbff01541253fe");
  assert.equal(generationPlanCsv, renderGenerationPlanCsv(generationPlan));

  assert.equal(familyManifest.expectedQuestionCount, 1_500);
  assert.equal(familyManifest.rows.length, 1_500);
  assert.equal(new Set(familyManifest.rows.map(({ id }) => id)).size, 1_500);
  assert.equal(sha256(familyManifest.rows.filter(({ id }) => !targetIds.has(id))), "173c520c58317585647c88a83cc9a08bd8ab8ba54ccc981001d377d278f92c59");
  assert.equal(sha256(coordinationRows.filter(({ id }) => !targetIds.has(id))), "cc5c87bf62e02d201cc4d17d5ef5fc377f8e1b5d2bb9821b26774e546d2dcf86");
  assert.equal(sha256(productionRows.filter(({ id }) => !targetIds.has(id))), "cc5c87bf62e02d201cc4d17d5ef5fc377f8e1b5d2bb9821b26774e546d2dcf86");
  assert.deepEqual(productionRows, coordinationRows);
  assert.deepEqual(jsonlRows, coordinationRows);

  const planById = new Map(generationPlan.map((row) => [row.id, row]));
  const familyById = new Map(familyManifest.rows.map((row) => [row.id, row]));
  const artifactMaps = [coordinationRows, productionRows, jsonlRows].map((rows) => new Map(rows.map((row) => [row.id, row])));
  for (const contract of contracts) {
    const plan = planById.get(contract.id);
    assert.ok(plan, `${contract.id} generation plan`);
    assert.equal(plan.topicId, contract.topicId);
    assert.equal(plan.type, contract.type);
    assert.equal(plan.difficulty, contract.difficulty);
    const reviewed = manifest.overrides.find(({ id }) => id === contract.id);
    assert.ok(reviewed, `${contract.id} reviewed row`);
    assert.equal(reviewed.expectedTopicId, contract.topicId);
    assert.equal(reviewed.expectedType, contract.type);
    assert.equal(reviewed.expectedDifficulty, contract.difficulty);
    assert.equal(reviewed.taskFamily, contract.taskFamily);
    assert.equal(reviewed.promptZhHans, contract.prompt);
    assert.deepEqual(reviewed.optionsZhHans, contract.options);
    assert.equal(reviewed.answer, contract.answer);
    assert.deepEqual(reviewed.acceptedAnswers, contract.accepted);
    assert.equal(reviewed.explanationZhHans, contract.explanation);
    assert.deepEqual(familyById.get(contract.id), { id: contract.id, topicId: contract.topicId, taskFamily: contract.taskFamily });
    for (const artifactById of artifactMaps) {
      const artifact = artifactById.get(contract.id);
      assert.ok(artifact, `${contract.id} approved row`);
      assert.equal(artifact.topicId, contract.topicId);
      assert.equal(artifact.type, contract.type);
      assert.equal(artifact.difficulty, contract.difficulty);
      assert.equal(artifact.promptZhHans, `题组${contract.id.replace(/^bnu-high-ds-v1-/u, "")}：${contract.prompt}`);
      assert.deepEqual(artifact.optionsZhHans, contract.options);
      assert.equal(artifact.answer, contract.answer);
      assert.deepEqual(artifact.acceptedAnswers, contract.accepted);
      assert.equal(artifact.explanationZhHans, contract.explanation);
    }
  }
});

test("BNU high Batch 2B exposes exact reviewed trilingual text and grades only complete answers", () => {
  for (const contract of contracts) {
    const runtime = runtimeById.get(contract.id);
    assert.ok(runtime, `${contract.id} runtime`);
    assert.equal(runtime.topicId, contract.topicId);
    assert.equal(runtime.type, contract.type);
    assert.equal(runtime.difficulty, mapDifficultyToActive(contract.difficulty));
    assert.equal(runtime.answer, contract.answer);
    assert.equal(runtime.prompt.zhHans, contract.prompt);
    assert.equal(runtime.prompt.zh, contract.promptZh);
    assert.equal(runtime.prompt.en, contract.promptEn);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zhHans ?? option.zh), contract.options);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zh), contract.optionsZh);
    assert.deepEqual((runtime.options ?? []).map((option) => option.en), contract.optionsEn);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    assert.equal(runtime.explanation.zh, contract.explanationZh);
    assert.equal(runtime.explanation.en, contract.explanationEn);
    assert.equal(chinaLessonEnglishTranslation(contract.prompt), contract.promptEn);
    assert.equal(chinaLessonTraditionalTranslation(contract.prompt), contract.promptZh);
    assert.equal(chinaLessonEnglishTranslation(contract.explanation), contract.explanationEn);
    assert.equal(chinaLessonTraditionalTranslation(contract.explanation), contract.explanationZh);
    assert.equal(validateRestoredTranslation({ id: `${contract.id}:prompt`, source: contract.prompt, contexts: ["prompt"] }, contract.promptEn), contract.promptEn);
    assert.equal(validateRestoredTranslation({ id: `${contract.id}:explanation`, source: contract.explanation, contexts: ["explanation"] }, contract.explanationEn), contract.explanationEn);
    assert.doesNotMatch(contract.promptEn + contract.explanationEn, /[\u3400-\u9fff]/u);
    contract.options.forEach((source, index) => {
      if (source !== contract.optionsEn[index]) assert.equal(chinaLessonEnglishTranslation(source), contract.optionsEn[index]);
      if (source !== contract.optionsZh[index]) assert.equal(chinaLessonTraditionalTranslation(source), contract.optionsZh[index]);
    });

    const payload = gradingPayload(runtime);
    assert.equal(questionAnswerMatches(payload, contract.answer), true, `${contract.id} canonical`);
    contract.accepted.forEach((answer) => assert.equal(questionAnswerMatches(payload, answer), true, `${contract.id} accepts ${answer}`));
    contract.rejected.forEach((answer) => assert.equal(questionAnswerMatches(payload, answer), false, `${contract.id} rejects ${answer}`));
    if (contract.feedback) {
      assert.deepEqual(localizedCorrectAnswerForFeedback({ type: runtime.type, answer: runtime.answer, acceptedAnswers: runtime.acceptedAnswers, options: runtime.options }), contract.feedback);
    }
  }
});

test("BNU high Batch 2B math oracles, sample-space permutations, and three-language MC keys are reproducible", () => {
  assert.equal(3 / 2 > 1 && !(3 / 2 > 2), true);
  assert.deepEqual([-3 + 1, 3 + 1].map((value) => value / 2), [-1, 2]);
  assert.equal((-3 + 2) + 2 ** 2, 3);
  assert.equal((-2) ** 3 + -2, -(2 ** 3 + 2));
  assert.equal(0 < 0.5 && 0.5 < 1, true);
  assert.equal(80 * 2 ** (9 / 3), 640);
  assert.equal(2 ** 3 + 1, 9);
  assert.deepEqual([Math.log(2) / Math.log(0.5), Math.log(4) / Math.log(0.5)], [-1, -2]);
  assert.equal(12 / (4 + 8 + 12 + 6), 0.4);
  assert.equal(2 / 4, 1 / 2);
  assert.equal(487 / 1_000, 0.487);

  const sample = runtimeById.get("bnu-high-ds-v1-s4-221");
  assert.ok(sample);
  sampleSpaceAccepted.forEach((answer) => assert.equal(questionAnswerMatches(gradingPayload(sample), answer), true, answer));

  const mcIndices = new Map([
    ["bnu-high-ds-v1-s4-181", 0],
    ["bnu-high-ds-v1-s4-187", 2],
    ["bnu-high-ds-v1-s4-220", 0]
  ]);
  for (const [id, expectedIndex] of mcIndices) {
    const runtime = runtimeById.get(id);
    assert.ok(runtime);
    for (const language of ["en", "zh", "zhHans"] as const) {
      const hits: boolean[] = (runtime.options ?? []).map((option) => (
        questionAnswerMatches(gradingPayload(runtime), option[language] ?? option.zh)
      ));
      assert.equal(hits.filter(Boolean).length, 1, `${id}/${language} unique`);
      assert.equal(hits.findIndex(Boolean), expectedIndex, `${id}/${language} index`);
    }
  }
});

test("BNU high Batch 2B preserves checkpoint and worked-anchor identity while reaching five families", () => {
  const expected = new Map<string, { ids: string[]; families: string[]; anchor: string; completeDistinct: number }>([
    ["bnu-high-s4-预备知识", { ids: ["bnu-high-ds-v1-s4-002", "bnu-high-ds-v1-s4-006", "bnu-high-ds-v1-s4-001", "bnu-high-ds-v1-s4-005", "bnu-high-ds-v1-s4-009"], families: ["set-intersection", "sufficient-not-necessary-condition", "quadratic-inequality", "absolute-value-inequality", "linear-equation"], anchor: "bnu-high-ds-v1-s4-008", completeDistinct: 5 }],
    ["bnu-high-s4-函数", { ids: ["bnu-high-ds-v1-s4-038", "bnu-high-ds-v1-s4-042", "bnu-high-ds-v1-s4-037", "bnu-high-ds-v1-s4-041", "bnu-high-ds-v1-s4-045"], families: ["radical-domain", "piecewise-function-evaluation", "quadratic-interval-minimum", "function-parity", "affine-evaluation"], anchor: "bnu-high-ds-v1-s4-044", completeDistinct: 5 }],
    ["bnu-high-s4-指数运算与指数函数", { ids: ["bnu-high-ds-v1-s4-074", "bnu-high-ds-v1-s4-078", "bnu-high-ds-v1-s4-073", "bnu-high-ds-v1-s4-077", "bnu-high-ds-v1-s4-081"], families: ["exponential-equation", "exponential-base-monotonicity", "exponential-function-values", "exponential-growth-model", "exponent-product-law"], anchor: "bnu-high-ds-v1-s4-080", completeDistinct: 5 }],
    ["bnu-high-s4-对数运算与对数函数", { ids: ["bnu-high-ds-v1-s4-110", "bnu-high-ds-v1-s4-114", "bnu-high-ds-v1-s4-109", "bnu-high-ds-v1-s4-113", "bnu-high-ds-v1-s4-117"], families: ["log-operation", "logarithmic-equation", "log-domain", "logarithmic-monotonicity", "direct-log-value"], anchor: "bnu-high-ds-v1-s4-116", completeDistinct: 5 }],
    ["bnu-high-s4-统计", { ids: ["bnu-high-ds-v1-s4-182", "bnu-high-ds-v1-s4-185", "bnu-high-ds-v1-s4-181", "bnu-high-ds-v1-s4-184", "bnu-high-ds-v1-s4-187"], families: ["range", "stratified-sampling", "representative-sampling-design", "variance-transform", "frequency-distribution-relative-frequency"], anchor: "bnu-high-ds-v1-s4-188", completeDistinct: 6 }],
    ["bnu-high-s4-概率", { ids: ["bnu-high-ds-v1-s4-218", "bnu-high-ds-v1-s4-221", "bnu-high-ds-v1-s4-217", "bnu-high-ds-v1-s4-220", "bnu-high-ds-v1-s4-223"], families: ["two-ball-combination", "sample-space-event-probability", "independent-union", "frequency-versus-theoretical-probability", "single-draw-urn"], anchor: "bnu-high-ds-v1-s4-224", completeDistinct: 5 }]
  ]);
  const familyById = new Map(familyManifest.rows.map(({ id, taskFamily }) => [id, taskFamily]));
  for (const [topicId, contract] of expected) {
    const lesson = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
    assert.ok(lesson);
    assert.equal(lesson.practiceQuestionIds?.length, 8);
    assert.deepEqual(lesson.practiceQuestionIds?.slice(0, 5), contract.ids);
    assert.deepEqual(contract.ids.map((id) => familyById.get(id)), contract.families);
    assert.equal(new Set(contract.families).size, 5);
    assert.equal(new Set((lesson.practiceQuestionIds ?? []).map((id) => familyById.get(id))).size, contract.completeDistinct);
    const worked = mainlandBnuHighReviewedWorkedExamples[topicId as keyof typeof mainlandBnuHighReviewedWorkedExamples];
    assert.ok(worked);
    const anchor = "sourceQuestionId" in worked ? worked.sourceQuestionId : worked.templateAnchorId;
    assert.equal(anchor, contract.anchor);
    assert.equal(lesson.practiceQuestionIds?.includes(anchor), false);
    assert.equal(targetIds.has(anchor), false);
  }
});
