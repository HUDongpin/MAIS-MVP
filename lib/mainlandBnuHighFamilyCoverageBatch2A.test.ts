import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { mainlandBnuHighLessonSeeds } from "../data/mainlandBnuHighLessons";
import { chinaLessonTraditionalTranslation } from "../data/chinaLessonTraditionalTranslations";
import { questions } from "../data/questions";
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
};

const packageRoot = new URL(
  "../coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/",
  import.meta.url
);
const manifest = JSON.parse(readFileSync(new URL("reviewed-approved-row-overrides.json", packageRoot), "utf8")) as {
  expectedOverrideCount: number;
  overrides: Array<Contract & {
    expectedTopicId: string;
    expectedType: string;
    expectedDifficulty: string;
    promptZhHans: string;
    optionsZhHans: string[];
    acceptedAnswers: string[];
    explanationZhHans: string;
  }>;
};
const familyManifestUrl = new URL("approved-question-family-manifest.json", packageRoot);
const familyManifest = existsSync(familyManifestUrl)
  ? JSON.parse(readFileSync(familyManifestUrl, "utf8")) as {
      expectedQuestionCount: number;
      rows: Array<{ id: string; taskFamily: string; topicId: string }>;
    }
  : { expectedQuestionCount: 0, rows: [] };
const coordinationPack = JSON.parse(readFileSync(new URL("question-pack.approved.json", packageRoot), "utf8")) as {
  questions: ArtifactQuestion[];
};
const productionPack = JSON.parse(readFileSync(
  new URL("../data/generated-content/mainland-bnu-high-generated-bank-v1-1500/question-pack.approved.json", import.meta.url),
  "utf8"
)) as { questions: ArtifactQuestion[] };
const jsonlRows = readFileSync(new URL("approved-questions.jsonl", packageRoot), "utf8")
  .trim()
  .split(/\n/u)
  .map((line) => JSON.parse(line) as ArtifactQuestion);
const productionQuestions = new Map(questions.map((question) => [question.id, question]));

const contracts: Contract[] = [
  {
    id: "bnu-high-ds-v1-s4-149",
    topicId: "bnu-high-s4-函数应用",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "function-zero-domain",
    prompt: "一个水箱开始有120升水，以每分钟8升的恒定速率排水。设t为排水时间（分钟）。建立剩余水量V(t)的函数模型，写出符合实际情境的t取值范围，并求水箱恰好排空的时间。请按“模型；取值范围；排空时间”的格式作答。",
    promptZh: "一個水箱開始有120升水，以每分鐘8升的恆定速率排水。設t為排水時間（分鐘）。建立剩餘水量V(t)的函數模型，寫出符合實際情境的t取值範圍，並求水箱恰好排空的時間。請按「模型；取值範圍；排空時間」的格式作答。",
    promptEn: "A water tank initially contains 120 L of water and drains at a constant rate of 8 L per minute. Let t be the draining time in minutes. Build a function V(t) for the remaining volume, state the context-valid domain of t, and find when the tank becomes empty. Answer in the form “model; domain; emptying time.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "V(t)=120-8t；0≤t≤15；15分钟",
    accepted: [
      "V(t)=120-8t；0≤t≤15；15分钟",
      "V(t)=120-8t；t∈[0,15]；15分钟",
      "V(t)=120-8t；0≤t≤15；15分鐘",
      "V(t)=120-8t; 0≤t≤15; 15 minutes"
    ],
    rejected: [
      "V(t)=120-8t", "0≤t≤15", "15分钟",
      "V(t)=120-8t；0≤t≤15", "V(t)=120-8t；15分钟", "0≤t≤15；15分钟"
    ],
    explanation: "排水t分钟后剩余V(t)=120-8t。水量不能为负，所以0≤t≤15；令V(t)=0，得t=15，因此15分钟排空。",
    explanationZh: "排水t分鐘後剩餘V(t)=120-8t。水量不能為負，所以0≤t≤15；令V(t)=0，得t=15，因此15分鐘排空。",
    explanationEn: "After t minutes, the remaining volume is V(t)=120-8t. The volume cannot be negative, so 0≤t≤15. Solving V(t)=0 gives t=15, so the tank becomes empty after 15 minutes."
  },
  {
    id: "bnu-high-ds-v1-s4-148",
    topicId: "bnu-high-s4-函数应用",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "growth-model-comparison",
    prompt: "甲、乙两种增长模型分别为A(t)=100+30t和B(t)=100×1.2^t，其中t为非负整数。B(t)第一次大于A(t)时，t的值是（ ）。",
    promptZh: "甲、乙兩種增長模型分別為A(t)=100+30t和B(t)=100×1.2^t，其中t為非負整數。B(t)第一次大於A(t)時，t的值是（ ）。",
    promptEn: "Two growth models are A(t)=100+30t and B(t)=100×1.2^t, where t is a nonnegative integer. What is the first value of t for which B(t) is greater than A(t)?",
    options: ["4", "5", "6", "7"], optionsZh: ["4", "5", "6", "7"], optionsEn: ["4", "5", "6", "7"],
    answer: "6",
    accepted: ["6", "t=6", "C", "C. 6"],
    rejected: ["4", "5", "7"],
    explanation: "t=5时，A(5)=250，B(5)=248.832，B(5)还未超过A(5)；t=6时，A(6)=280，B(6)=298.5984，所以第一次超过发生在t=6。",
    explanationZh: "t=5時，A(5)=250，B(5)=248.832，B(5)還未超過A(5)；t=6時，A(6)=280，B(6)=298.5984，所以第一次超過發生在t=6。",
    explanationEn: "At t=5, A(5)=250 and B(5)=248.832, so B(5) has not yet exceeded A(5). At t=6, A(6)=280 and B(6)=298.5984. Therefore, the first such value is t=6."
  },
  {
    id: "bnu-high-ds-v1-s4-257",
    topicId: "bnu-high-s4-数学建模活动-一",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "data-model-validation",
    prompt: "某容器在t=0、2、4（小时）时的水量分别为100、84、68升。假设水量随时间线性变化，建立模型V(t)，预测t=7时的水量；又测得t=6时水量为53升，若误差不超过2升视为模型有效，判断该测量是否支持模型。请按“模型；预测值；判断及依据”作答。",
    promptZh: "某容器在t=0、2、4（小時）時的水量分別為100、84、68升。假設水量隨時間線性變化，建立模型V(t)，預測t=7時的水量；又測得t=6時水量為53升，若誤差不超過2升視為模型有效，判斷該測量是否支持模型。請按「模型；預測值；判斷及依據」作答。",
    promptEn: "A container holds 100, 84, and 68 L of water at t=0, 2, and 4 hours. Assume that the volume changes linearly with time. Build a model V(t), predict the volume at t=7, and then assess a measurement of 53 L at t=6. Treat an error of at most 2 L as acceptable. Answer in the form “model; prediction; judgement and evidence.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "V(t)=100-8t；44升；支持，|53-52|=1≤2",
    accepted: [
      "V(t)=100-8t；44升；支持，|53-52|=1≤2",
      "V(t)=100-8t；V(7)=44升；支持，因为误差为1升",
      "V(t)=100-8t；44升；支持，誤差1升不超過2升",
      "V(t)=100-8t; V(7)=44 L; supported because |53-52|=1≤2"
    ],
    rejected: [
      "V(t)=100-8t", "44升", "支持", "|53-52|=1≤2",
      "V(t)=100-8t；44升", "44升；支持，|53-52|=1≤2"
    ],
    explanation: "每2小时减少16升，斜率为-8，所以V(t)=100-8t，V(7)=44。模型给出V(6)=52，实测53与预测相差1升，不超过2升，因此支持模型。",
    explanationZh: "每2小時減少16升，斜率為-8，所以V(t)=100-8t，V(7)=44。模型給出V(6)=52，實測53與預測相差1升，不超過2升，因此支持模型。",
    explanationEn: "Every 2 hours, the volume decreases by 16 L, so the slope is -8. Therefore, V(t)=100-8t and V(7)=44. The model predicts V(6)=52; the observed value is 53, a difference of 1 L, which is no more than 2 L, so the measurement supports the model."
  },
  {
    id: "bnu-high-ds-v1-s4-256",
    topicId: "bnu-high-s4-数学建模活动-一",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "model-assumption-limit",
    prompt: "根据前4周数据拟合销售量模型y=20+3t。下列对该模型的使用最合理的是（ ）。",
    promptZh: "根據前4週數據擬合銷售量模型y=20+3t。下列對該模型的使用最合理的是（ ）。",
    promptEn: "A sales model y=20+3t is fitted from data collected over the first 4 weeks. Which use of the model is the most reasonable?",
    options: [
      "在条件相近时预测第5周，并说明预测存在误差",
      "断定销售量将永远按同一速度增长",
      "断定模型会精确等于每一个观测值",
      "把负数t直接解释为实际销售周数"
    ],
    optionsZh: [
      "在條件相近時預測第5週，並說明預測存在誤差",
      "斷定銷售量將永遠按同一速度增長",
      "斷定模型會精確等於每一個觀測值",
      "把負數t直接解釋為實際銷售週數"
    ],
    optionsEn: [
      "Use it to predict week 5 under similar conditions and state that the prediction has error.",
      "Conclude that sales will continue to grow at the same rate forever.",
      "Conclude that the model must equal every observed value exactly.",
      "Interpret negative values of the variable t directly as actual sales weeks."
    ],
    answer: "在条件相近时预测第5周，并说明预测存在误差",
    accepted: [
      "在条件相近时预测第5周，并说明预测存在误差",
      "在條件相近時預測第5週，並說明預測存在誤差",
      "Use it to predict week 5 under similar conditions and state that the prediction has error.",
      "A",
      "A. 在条件相近时预测第5周，并说明预测存在误差"
    ],
    rejected: [
      "断定销售量将永远按同一速度增长",
      "断定模型会精确等于每一个观测值",
      "把负数t直接解释为实际销售周数"
    ],
    explanation: "模型只是在已有数据和假设下的近似。用于邻近时段预测并说明误差是合理的；无限外推、要求逐点精确或把无实际意义的负时间直接解释为销售周数都不合理。",
    explanationZh: "模型只是在已有數據和假設下的近似。用於鄰近時段預測並說明誤差是合理的；無限外推、要求逐點精確或把無實際意義的負時間直接解釋為銷售週數都不合理。",
    explanationEn: "A fitted model is an approximation under stated data conditions and assumptions. A nearby prediction with an explicit error caveat is reasonable; unlimited extrapolation, exact agreement with every observation, and context-free negative time are not."
  },
  {
    id: "bnu-high-ds-v1-s4-364",
    topicId: "bnu-high-s4-数学建模活动-二",
    type: "multiple-choice",
    difficulty: "Foundation",
    taskFamily: "measurement-error-sensitivity",
    prompt: "用仰角模型h=d·tan45°+1.6估计物体高度，其中d为水平距离。若d被高估1米而其他量不变，则估计的高度会被高估（ ）。",
    promptZh: "用仰角模型h=d·tan45°+1.6估計物體高度，其中d為水平距離。若d被高估1米而其他量不變，則估計的高度會被高估（ ）。",
    promptEn: "The elevation-angle model h=d·tan45°+1.6 estimates an object's height, where d is the horizontal distance. If d is overestimated by 1 m while all other quantities remain unchanged, by how much is the estimated height overestimated?",
    options: ["0.5米", "1米", "1.6米", "2米"],
    optionsZh: ["0.5米", "1米", "1.6米", "2米"],
    optionsEn: ["0.5 m", "1 m", "1.6 m", "2 meters"],
    answer: "1米",
    accepted: ["1米", "1 m", "B", "B. 1米"],
    rejected: ["0.5米", "1.6米", "2米"],
    explanation: "tan45°=1，所以高度变化量Δh=Δd·tan45°=1×1=1米；眼高1.6米在两次计算中相同，不影响误差差值。",
    explanationZh: "tan45°=1，所以高度變化量Δh=Δd·tan45°=1×1=1米；眼高1.6米在兩次計算中相同，不影響誤差差值。",
    explanationEn: "Because tan45°=1, the change in the estimated height is Δh=Δd·tan45°=1×1=1 m. The 1.6 m eye-height term is unchanged in both calculations and does not affect the error difference."
  },
  {
    id: "bnu-high-ds-v1-s4-363",
    topicId: "bnu-high-s4-数学建模活动-二",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "similarity-measurement-model",
    prompt: "同一时刻在水平地面上，一根1.5米高的直杆影长为2米，一座建筑物影长为24米。假设太阳光线平行，建筑物与直杆都垂直于地面，则建筑物高度为____。",
    promptZh: "同一時刻在水平地面上，一根1.5米高的直桿影長為2米，一座建築物影長為24米。假設太陽光線平行，建築物與直桿都垂直於地面，則建築物高度為____。",
    promptEn: "At the same time on level ground, a 1.5 m vertical pole casts a 2 m shadow, while a vertical building casts a 24 m shadow. Assuming parallel sunlight, find the building's height.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "18米",
    accepted: ["18米", "18 m", "18"],
    rejected: ["18千米", "18千克", "18平方米"],
    explanation: "同一时刻太阳高度角相同，形成的直角三角形相似。由h/24=1.5/2，得h=24×1.5÷2=18米。",
    explanationZh: "同一時刻太陽高度角相同，形成的直角三角形相似。由h/24=1.5/2，得h=24×1.5÷2=18米。",
    explanationEn: "At the same time, the sun's elevation angle is the same, so the two right triangles are similar. From h/24=1.5/2, h=24×1.5÷2=18 m."
  },
  {
    id: "bnu-high-ds-v1-s5-221",
    topicId: "bnu-high-s5-数学建模活动-三",
    type: "short-answer",
    difficulty: "Foundation",
    taskFamily: "analytic-geometry-model-interpretation",
    prompt: "某传感器的覆盖区域用圆C:(x-2)²+(y+1)²≤25表示。判断点Q(5,3)是否在覆盖区域内，并写出依据。请按“判断；代入结果与比较”作答。",
    promptZh: "某感測器的覆蓋區域用圓C:(x-2)²+(y+1)²≤25表示。判斷點Q(5,3)是否在覆蓋區域內，並寫出依據。請按「判斷；代入結果與比較」作答。",
    promptEn: "A sensor's coverage region is modeled by the disk C:(x-2)²+(y+1)²≤25. Determine whether Q(5,3) lies in the coverage region and justify the decision. Answer in the form “decision; substitution and comparison.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "在覆盖区域内；(5-2)²+(3+1)²=25≤25",
    accepted: [
      "在覆盖区域内；(5-2)²+(3+1)²=25≤25",
      "Q在覆盖区域内；9+16=25≤25",
      "在覆蓋區域內；(5-2)²+(3+1)²=25≤25",
      "Inside the coverage area; (5-2)²+(3+1)²=25≤25"
    ],
    rejected: ["在覆盖区域内", "25", "(5-2)²+(3+1)²=25≤25"],
    explanation: "代入Q(5,3)，得(5-2)²+(3+1)²=9+16=25≤25，所以Q在圆的边界上，属于覆盖区域。",
    explanationZh: "代入Q(5,3)，得(5-2)²+(3+1)²=9+16=25≤25，所以Q在圓的邊界上，屬於覆蓋區域。",
    explanationEn: "Substituting Q(5,3) gives (5-2)²+(3+1)²=9+16=25≤25. Thus Q lies on the boundary of the disk and is included in the coverage region."
  },
  {
    id: "bnu-high-ds-v1-s5-222",
    topicId: "bnu-high-s5-数学建模活动-三",
    type: "fill-in",
    difficulty: "Core",
    taskFamily: "spatial-vector-displacement-model",
    prompt: "无人机从原点依次完成位移a=(1,2,2)千米和b=(2,2,-2)千米。完成两段位移后，无人机到原点的直线距离为____。",
    promptZh: "無人機從原點依次完成位移a=(1,2,2)公里和b=(2,2,-2)公里。完成兩段位移後，無人機到原點的直線距離為____。",
    promptEn: "Starting from the origin, a drone makes successive displacements a=(1,2,2) km and b=(2,2,-2) km. After both displacements, what is the drone's straight-line distance from the origin?",
    options: [], optionsZh: [], optionsEn: [],
    answer: "5千米",
    accepted: ["5千米", "5公里", "5 km", "5"],
    rejected: ["5米", "5千克", "5平方米"],
    explanation: "合位移a+b=(3,4,0)，其长度为√(3²+4²+0²)=5，所以无人机到原点的直线距离为5千米。",
    explanationZh: "合位移a+b=(3,4,0)，其長度為√(3²+4²+0²)=5，所以無人機到原點的直線距離為5公里。",
    explanationEn: "The resultant displacement is a+b=(3,4,0), whose length is √(3²+4²+0²)=5. Therefore, the drone is 5 km from the origin."
  },
  {
    id: "bnu-high-ds-v1-s5-079",
    topicId: "bnu-high-s5-圆锥曲线",
    type: "multiple-choice",
    difficulty: "Foundation",
    taskFamily: "parabola-focus",
    prompt: "抛物线y²=8x的焦点是（ ）。",
    promptZh: "拋物線y²=8x的焦點是（ ）。",
    promptEn: "What is the focus of the parabola y²=8x?",
    options: ["(2,0)", "(-2,0)", "(4,0)", "(0,2)"],
    optionsZh: ["(2,0)", "(-2,0)", "(4,0)", "(0,2)"],
    optionsEn: ["(2,0)", "(-2,0)", "(4,0)", "(0,2)"],
    answer: "(2,0)",
    accepted: ["(2,0)", "A", "A. (2,0)"],
    rejected: ["(-2,0)", "(4,0)", "(0,2)"],
    explanation: "抛物线y²=4px中，4p=8，所以p=2，焦点为(p,0)=(2,0)。",
    explanationZh: "拋物線y²=4px中，4p=8，所以p=2，焦點為(p,0)=(2,0)。",
    explanationEn: "For y²=4px, 4p=8, so p=2. Therefore, the focus is (p,0)=(2,0)."
  },
  {
    id: "bnu-high-ds-v1-s5-077",
    topicId: "bnu-high-s5-圆锥曲线",
    type: "short-answer",
    difficulty: "Core",
    taskFamily: "line-conic-discriminant",
    prompt: "判断直线y=2x+3与抛物线y=x²的公共点个数，并写出消元后方程的判别式。请按“公共点个数；判别式”作答。",
    promptZh: "判斷直線y=2x+3與拋物線y=x²的公共點個數，並寫出消元後方程的判別式。請按「公共點個數；判別式」作答。",
    promptEn: "Determine the number of intersection points between the line y=2x+3 and the parabola y=x², and state the discriminant of the equation obtained after elimination. Answer in the form “number of intersections; discriminant.”",
    options: [], optionsZh: [], optionsEn: [],
    answer: "2个；Δ=16",
    accepted: ["2个；Δ=16", "两个公共点；Δ=16", "兩個公共點；Δ=16", "Two intersection points; Δ=16", "2 intersection points; Δ=16"],
    rejected: ["2个", "Δ=16", "16"],
    explanation: "联立得x²=2x+3，即x²-2x-3=0。判别式Δ=(-2)²-4×1×(-3)=16>0，所以有两个公共点。",
    explanationZh: "聯立得x²=2x+3，即x²-2x-3=0。判別式Δ=(-2)²-4×1×(-3)=16>0，所以有兩個公共點。",
    explanationEn: "Combining the equations gives x²=2x+3, or x²-2x-3=0. Its discriminant is Δ=(-2)²-4×1×(-3)=16>0, so there are two intersection points."
  },
  {
    id: "bnu-high-ds-v1-s6-229",
    topicId: "bnu-high-s6-导数及其应用",
    type: "multiple-choice",
    difficulty: "Core",
    taskFamily: "derivative-optimization",
    prompt: "函数f(x)=-x²+6x+1在闭区间[0,5]上的最大值是（ ）。",
    promptZh: "函數f(x)=-x²+6x+1在閉區間[0,5]上的最大值是（ ）。",
    promptEn: "What is the maximum value of f(x)=-x²+6x+1 on the closed interval [0,5]?",
    options: ["6", "9", "10", "11"], optionsZh: ["6", "9", "10", "11"], optionsEn: ["6", "9", "10", "11"],
    answer: "10",
    accepted: ["10", "C", "C. 10"],
    rejected: ["6", "9", "11"],
    explanation: "f′(x)=-2x+6，在x=3处由正变负。比较f(0)=1、f(3)=10、f(5)=6，最大值为10。",
    explanationZh: "f′(x)=-2x+6，在x=3處由正變負。比較f(0)=1、f(3)=10、f(5)=6，最大值為10。",
    explanationEn: "Since f′(x)=-2x+6 changes from positive to negative at x=3, compare the critical point and endpoints: f(0)=1, f(3)=10, and f(5)=6. The maximum value is 10."
  },
  {
    id: "bnu-high-ds-v1-s6-228",
    topicId: "bnu-high-s6-导数及其应用",
    type: "fill-in",
    difficulty: "Exam",
    taskFamily: "derivative-parameter-condition",
    prompt: "函数f(x)=x³-3ax在x=1处取得极小值，则实数a=____。",
    promptZh: "函數f(x)=x³-3ax在x=1處取得極小值，則實數a=____。",
    promptEn: "The function f(x)=x³-3ax has a local minimum at x=1. Then the real number a=____.",
    options: [], optionsZh: [], optionsEn: [],
    answer: "1",
    accepted: ["1", "a=1"],
    rejected: ["0", "-1", "3"],
    explanation: "极值点必须满足f′(1)=0。由f′(x)=3x²-3a，得3-3a=0，所以a=1；又f″(1)=6>0，确为极小值。",
    explanationZh: "極值點必須滿足f′(1)=0。由f′(x)=3x²-3a，得3-3a=0，所以a=1；又f″(1)=6>0，確為極小值。",
    explanationEn: "A local extremum requires f′(1)=0. Since f′(x)=3x²-3a, 3-3a=0 and hence a=1. Also, f″(1)=6>0, confirming that the point is a local minimum."
  }
];

const contractIds = contracts.map(({ id }) => id);

function gradingPayload(question: NonNullable<ReturnType<typeof productionQuestions.get>>) {
  return {
    id: question.id,
    answer: question.answer,
    accepted_answers: question.acceptedAnswers ?? null,
    options: question.options ?? null,
    prompt: question.prompt
  };
}

test("BNU high Batch 2A retains its twelve exact rows inside the current generator-owned inventory", () => {
  assert.equal(manifest.expectedOverrideCount, 98);
  assert.equal(manifest.overrides.length, 98);
  assert.equal(new Set(manifest.overrides.map(({ id }) => id)).size, 98);
  assert.equal(
    createHash("sha256").update(JSON.stringify(manifest.overrides.slice(0, 67))).digest("hex"),
    "9bfb72b6aaed00a76756628a31123c4f711a02a829789cb1719b06896f68764e",
    "the complete pre-Batch-2B override prefix, including reviewed fare, modeling, vertical-line, and line-circle aliases, must remain byte-for-byte stable"
  );
  assert.equal(familyManifest.expectedQuestionCount, 1_500);
  assert.equal(familyManifest.rows.length, 1_500);
  assert.equal(new Set(familyManifest.rows.map(({ id }) => id)).size, 1_500);

  const addedIds = manifest.overrides.slice(55, 67).map(({ id }) => id).sort();
  assert.deepEqual(addedIds, [...contractIds].sort());
  const familyById = new Map(familyManifest.rows.map((row) => [row.id, row]));
  const artifactMaps = [coordinationPack.questions, productionPack.questions, jsonlRows]
    .map((rows) => new Map(rows.map((row) => [row.id, row])));

  for (const contract of contracts) {
    const reviewed = manifest.overrides.find(({ id }) => id === contract.id);
    assert.ok(reviewed, `${contract.id} manifest row`);
    assert.equal(reviewed.expectedTopicId, contract.topicId);
    assert.equal(reviewed.expectedType, contract.type);
    assert.equal(reviewed.expectedDifficulty, contract.difficulty);
    assert.equal(reviewed.taskFamily, contract.taskFamily);
    assert.equal(reviewed.promptZhHans, contract.prompt);
    assert.deepEqual(reviewed.optionsZhHans, contract.options);
    assert.equal(reviewed.answer, contract.answer);
    assert.deepEqual(reviewed.acceptedAnswers, contract.accepted);
    assert.equal(reviewed.explanationZhHans, contract.explanation);
    assert.deepEqual(familyById.get(contract.id), {
      id: contract.id,
      topicId: contract.topicId,
      taskFamily: contract.taskFamily
    });

    for (const artifactById of artifactMaps) {
      const artifact = artifactById.get(contract.id);
      assert.ok(artifact, `${contract.id} approved artifact row`);
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

test("BNU high Batch 2A grades complete answers and exposes exact reviewed English and Traditional text", () => {
  for (const contract of contracts) {
    const runtime = productionQuestions.get(contract.id);
    assert.ok(runtime, `${contract.id} production runtime row`);
    assert.equal(runtime.prompt.zhHans, contract.prompt);
    assert.equal(runtime.prompt.zh, contract.promptZh);
    assert.equal(runtime.prompt.en, contract.promptEn);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zhHans ?? option.zh), contract.options);
    assert.deepEqual((runtime.options ?? []).map((option) => option.zh), contract.optionsZh);
    assert.deepEqual((runtime.options ?? []).map((option) => option.en), contract.optionsEn);
    assert.equal(runtime.explanation.zhHans, contract.explanation);
    assert.equal(runtime.explanation.zh, contract.explanationZh);
    assert.equal(runtime.explanation.en, contract.explanationEn);
    assert.equal(chinaLessonTraditionalTranslation(contract.prompt), contract.promptZh);
    assert.equal(chinaLessonTraditionalTranslation(contract.explanation), contract.explanationZh);

    const gradingQuestion = gradingPayload(runtime);
    assert.equal(questionAnswerMatches(gradingQuestion, contract.answer), true, `${contract.id} canonical`);
    for (const accepted of contract.accepted) {
      assert.equal(questionAnswerMatches(gradingQuestion, accepted), true, `${contract.id} accepts ${accepted}`);
    }
    for (const rejected of contract.rejected) {
      assert.equal(questionAnswerMatches(gradingQuestion, rejected), false, `${contract.id} rejects ${rejected}`);
    }
  }
});

test("BNU high Batch 2A mathematical oracles and five MC keys are independently reproducible", () => {
  assert.equal(120 / 8, 15);
  assert.deepEqual(
    Array.from({ length: 7 }, (_, t) => 100 * 1.2 ** t > 100 + 30 * t),
    [false, false, false, false, false, false, true]
  );
  assert.equal((84 - 100) / 2, -8);
  assert.equal(100 - 8 * 7, 44);
  assert.equal(Math.abs(53 - (100 - 8 * 6)), 1);
  assert.ok(Math.abs(Math.tan(Math.PI / 4) - 1) < 1e-12);
  assert.equal(24 * 1.5 / 2, 18);
  assert.equal((5 - 2) ** 2 + (3 + 1) ** 2, 25);
  assert.deepEqual([1 + 2, 2 + 2, 2 - 2], [3, 4, 0]);
  assert.equal(Math.hypot(3, 4, 0), 5);
  assert.equal(8 / 4, 2, "y²=4px gives p=2");
  assert.equal((-2) ** 2 - 4 * 1 * -3, 16);
  assert.deepEqual([-(0 ** 2) + 6 * 0 + 1, -(3 ** 2) + 6 * 3 + 1, -(5 ** 2) + 6 * 5 + 1], [1, 10, 6]);
  assert.equal(3 - 3 * 1, 0);
  assert.ok(6 > 0, "f''(1)=6 confirms the local minimum");

  const displacement = productionQuestions.get("bnu-high-ds-v1-s4-361");
  assert.ok(displacement, "s4-361 production displacement question");
  const displacementPayload = gradingPayload(displacement);
  for (const correctAnswer of ["5", "5千米", "5 km", "5 kilometers"]) {
    assert.equal(
      questionAnswerMatches(displacementPayload, correctAnswer),
      true,
      `${correctAnswer} is the same five-kilometer displacement`
    );
  }
  for (const incompatibleAnswer of ["5 m", "5 kg", "5°"]) {
    assert.equal(
      questionAnswerMatches(displacementPayload, incompatibleAnswer),
      false,
      `${incompatibleAnswer} must not satisfy the kilometer contract`
    );
  }

  const expectedMcIndices = new Map([
    ["bnu-high-ds-v1-s4-148", 2],
    ["bnu-high-ds-v1-s4-256", 0],
    ["bnu-high-ds-v1-s4-364", 1],
    ["bnu-high-ds-v1-s5-079", 0],
    ["bnu-high-ds-v1-s6-229", 2]
  ]);
  for (const [id, expectedIndex] of expectedMcIndices) {
    const runtime = productionQuestions.get(id);
    assert.ok(runtime, `${id} production MC`);
    const hits = (runtime.options ?? []).map((option) =>
      questionAnswerMatches(gradingPayload(runtime), option.zhHans ?? option.zh)
    );
    assert.equal(hits.filter(Boolean).length, 1, `${id} must accept exactly one displayed option`);
    assert.equal(hits.findIndex(Boolean), expectedIndex, `${id} independent MC key`);
  }
});

test("BNU high Batch 2A preserves checkpoint IDs and reaches five reviewed families in all six topics", () => {
  const expectations = new Map<string, { ids: string[]; families: string[] }>([
    ["bnu-high-s4-函数应用", {
      ids: ["bnu-high-ds-v1-s4-146", "bnu-high-ds-v1-s4-149", "bnu-high-ds-v1-s4-145", "bnu-high-ds-v1-s4-148", "bnu-high-ds-v1-s4-151"],
      families: ["piecewise-fare-model", "function-zero-domain", "exponential-growth-model", "growth-model-comparison", "bare-linear-substitution"]
    }],
    ["bnu-high-s4-数学建模活动-一", {
      ids: ["bnu-high-ds-v1-s4-254", "bnu-high-ds-v1-s4-257", "bnu-high-ds-v1-s4-253", "bnu-high-ds-v1-s4-256", "bnu-high-ds-v1-s4-259"],
      families: ["build-and-check-drain-model", "data-model-validation", "compare-linear-models", "model-assumption-limit", "bare-linear-substitution"]
    }],
    ["bnu-high-s4-数学建模活动-二", {
      ids: ["bnu-high-ds-v1-s4-362", "bnu-high-ds-v1-s4-364", "bnu-high-ds-v1-s4-361", "bnu-high-ds-v1-s4-363", "bnu-high-ds-v1-s4-365"],
      families: ["angle-of-elevation-measurement", "measurement-error-sensitivity", "perpendicular-displacement", "similarity-measurement-model", "bare-linear-substitution"]
    }],
    ["bnu-high-s5-数学建模活动-三", {
      ids: ["bnu-high-ds-v1-s5-218", "bnu-high-ds-v1-s5-221", "bnu-high-ds-v1-s5-219", "bnu-high-ds-v1-s5-222", "bnu-high-ds-v1-s5-225"],
      families: ["fit-linear-model", "analytic-geometry-model-interpretation", "circle-coordinate-model", "spatial-vector-displacement-model", "bare-linear-substitution"]
    }],
    ["bnu-high-s5-圆锥曲线", {
      ids: ["bnu-high-ds-v1-s5-075", "bnu-high-ds-v1-s5-079", "bnu-high-ds-v1-s5-073", "bnu-high-ds-v1-s5-077", "bnu-high-ds-v1-s5-081"],
      families: ["ellipse-eccentricity", "parabola-focus", "hyperbola-asymptote", "line-conic-discriminant", "ellipse-c2"]
    }],
    ["bnu-high-s6-导数及其应用", {
      ids: ["bnu-high-ds-v1-s6-226", "bnu-high-ds-v1-s6-229", "bnu-high-ds-v1-s6-232", "bnu-high-ds-v1-s6-227", "bnu-high-ds-v1-s6-228"],
      families: ["tangent-line", "derivative-optimization", "polynomial-derivative-value", "monotonic-intervals", "derivative-parameter-condition"]
    }]
  ]);
  const familyById = new Map(familyManifest.rows.map((row) => [row.id, row.taskFamily]));
  for (const [topicId, expected] of expectations) {
    const seed = mainlandBnuHighLessonSeeds.find((candidate) => candidate.topicId === topicId);
    assert.ok(seed, `${topicId} lesson seed`);
    assert.deepEqual(seed.practiceQuestionIds?.slice(0, 5), expected.ids);
    assert.deepEqual(expected.ids.map((id) => familyById.get(id)), expected.families);
    assert.equal(new Set(expected.families).size, 5);
  }
});
