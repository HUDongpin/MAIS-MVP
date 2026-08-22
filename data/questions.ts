import type { Question } from "@/types";
import { applyHongKongResidual47Repairs } from "@/lib/hongKongResidual47Repair";
import { versionMateriallyChangedHongKongQuestions } from "@/lib/hongKongQuestionVersioning";
import { withResolvedMainlandPepQuestionAssets } from "@/lib/mainlandPepQuestionAssets";
import { hongKongEasePracticeQuestions } from "./hongKongEasePracticeQuestions";
import { mainlandBnuHighQuestions } from "./mainlandBnuHighQuestions";
import { mainlandBnuJuniorQuestions } from "./mainlandBnuJuniorQuestions";
import { mainlandBnuPrimaryQuestions } from "./mainlandBnuPrimaryQuestions";
import { mainlandHjbHighQuestions } from "./mainlandHjbHighQuestions";
import { mainlandHjbJuniorQuestions } from "./mainlandHjbJuniorQuestions";
import { mainlandHjbPrimaryQuestions } from "./mainlandHjbPrimaryQuestions";
import { mainlandPepHighQuestions } from "./mainlandPepHighQuestions";
import { mainlandPepJuniorQuestions } from "./mainlandPepJuniorQuestions";
import { mainlandPepPrimaryRagV1Questions } from "./mainlandPepPrimaryQuestions";
import { topics } from "./topics";
import { usArkansasQuestions } from "./usArkansasQuestions";
import { usCaliforniaQuestions } from "./usCaliforniaQuestions";
import { usFloridaMiddleSchoolQuestions } from "./usFloridaMiddleSchoolQuestions";
import { usMathLiveQuestions } from "./usMathQuestions";

const math = (expression: string) => `\\(${expression}\\)`;
type HongKongQuestionSeed = Omit<Question, "curriculumTrack">;

const coreQuestions: HongKongQuestionSeed[] = [
  {
    id: "q1",
    grade: "S1",
    topicId: "integers",
    topic: { en: "Integers", zh: "整數" },
    difficulty: "Low",
    type: "multiple-choice",
    prompt: { en: `Which expression equals ${math("-3 + 8")}?`, zh: `哪一個算式等於 ${math("-3 + 8")}？` },
    options: [
      { en: "-11", zh: "-11" },
      { en: "5", zh: "5" },
      { en: "-5", zh: "-5" },
      { en: "11", zh: "11" }
    ],
    answer: "5",
    explanation: { en: `Moving ${math("8")} steps right from ${math("-3")} lands on ${math("5")}.`, zh: `由 ${math("-3")} 向右移 ${math("8")} 格會到達 ${math("5")}。` }
  },
  {
    id: "q2",
    grade: "S1",
    topicId: "algebra-basics",
    topic: { en: "Algebra Basics", zh: "代數基礎" },
    difficulty: "Low",
    type: "fill-in",
    prompt: { en: `Simplify: ${math("3x + 2x")}`, zh: `化簡：${math("3x + 2x")}` },
    answer: "5x",
    acceptedAnswers: ["5 x", "5*x"],
    explanation: { en: `Like terms can be added: ${math("3x + 2x = 5x")}.`, zh: `同類項可以相加：${math("3x + 2x = 5x")}。` }
  },
  {
    id: "q3",
    grade: "S2",
    topicId: "coordinates",
    topic: { en: "Coordinates", zh: "坐標" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: { en: `Point A is at ${math("(2, -3)")}. Which quadrant is it in?`, zh: `點 A 位於 ${math("(2, -3)")}，它在哪一象限？` },
    options: [
      { en: "I", zh: "第一象限" },
      { en: "II", zh: "第二象限" },
      { en: "III", zh: "第三象限" },
      { en: "IV", zh: "第四象限" }
    ],
    answer: "IV",
    explanation: { en: "Positive x and negative y place the point in Quadrant IV.", zh: "x 為正、y 為負，點位於第四象限。" }
  },
  {
    id: "q4",
    grade: "S2",
    topicId: "linear-equations",
    topic: { en: "Linear Equations", zh: "一次方程" },
    difficulty: "Medium",
    type: "fill-in",
    prompt: { en: `Solve: ${math("2x + 5 = 13")}`, zh: `解方程：${math("2x + 5 = 13")}` },
    answer: "4",
    explanation: { en: `Subtract ${math("5")} to get ${math("2x = 8")}, so ${math("x = 4")}.`, zh: `兩邊減 ${math("5")} 得 ${math("2x = 8")}，所以 ${math("x = 4")}。` }
  },
  {
    id: "q5",
    grade: "S4",
    topicId: "quadratic-patterns",
    topic: { en: "Quadratic Functions", zh: "二次函數" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: { en: `For ${math("y = x^2 - 4x + 3")}, what is the axis of symmetry?`, zh: `對於 ${math("y = x^2 - 4x + 3")}，對稱軸是甚麼？` },
    options: [
      { en: "x = -2", zh: "x = -2" },
      { en: "x = 2", zh: "x = 2" },
      { en: "y = 2", zh: "y = 2" },
      { en: "x = 4", zh: "x = 4" }
    ],
    answer: "x = 2",
    explanation: {
      en: `The axis is ${math(String.raw`x = -\frac{b}{2a} = -\frac{-4}{2\cdot1} = 2`)}.`,
      zh: `對稱軸是 ${math(String.raw`x = -\frac{b}{2a} = -\frac{-4}{2\cdot1} = 2`)}。`
    }
  },
  {
    id: "q6",
    grade: "S3",
    topicId: "trigonometry-basics",
    topic: { en: "Trigonometry Basics", zh: "三角比基礎" },
    difficulty: "Medium",
    type: "short-answer",
    prompt: { en: `In a right triangle, opposite ${math("= 3")} and hypotenuse ${math("= 5")}. What is ${math(String.raw`\sin\theta`)}?`, zh: `在直角三角形中，對邊 ${math("= 3")}，斜邊 ${math("= 5")}。${math(String.raw`\sin\theta`)} 是多少？` },
    answer: "3/5",
    explanation: { en: `${math(String.raw`\sin\theta = \frac{\text{opposite}}{\text{hypotenuse}} = \frac{3}{5}`)}.`, zh: `${math(String.raw`\sin\theta = \frac{\text{對邊}}{\text{斜邊}} = \frac{3}{5}`)}。` }
  },
  {
    id: "q7",
    grade: "S4",
    topicId: "functions",
    topic: { en: "Functions", zh: "函數" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: { en: `If ${math("f(x) = 2x - 1")}, what is ${math("f(4)")}?`, zh: `若 ${math("f(x) = 2x - 1")}，${math("f(4)")} 是多少？` },
    options: [
      { en: "6", zh: "6" },
      { en: "7", zh: "7" },
      { en: "8", zh: "8" },
      { en: "9", zh: "9" }
    ],
    answer: "7",
    explanation: { en: `Substitute ${math("x = 4")}: ${math("2(4) - 1 = 7")}.`, zh: `代入 ${math("x = 4")}：${math("2(4) - 1 = 7")}。` }
  },
  {
    id: "q8",
    grade: "S4",
    topicId: "coordinate-geometry",
    topic: { en: "Coordinate Geometry", zh: "坐標幾何" },
    difficulty: "Medium",
    type: "short-answer",
    prompt: { en: `Find the gradient of the line through ${math("(1, 2)")} and ${math("(3, 8)")}.`, zh: `求通過 ${math("(1, 2)")} 和 ${math("(3, 8)")} 的直線斜率。` },
    answer: "3",
    explanation: { en: `Gradient ${math(String.raw`= \frac{8 - 2}{3 - 1} = \frac{6}{2} = 3`)}.`, zh: `斜率 ${math(String.raw`= \frac{8 - 2}{3 - 1} = \frac{6}{2} = 3`)}。` }
  },
  {
    id: "q9",
    grade: "S5",
    topicId: "probability-s5",
    topic: { en: "Probability", zh: "概率" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: {
      en: `A bag contains ${math("3")} red balls and ${math("2")} blue balls. Each physical ball is equally likely to be drawn at each stage. Two balls are drawn without replacement. Given that the first ball is red, what is the conditional probability that the second ball is blue?`,
      zh: `袋中有 ${math("3")} 個紅球和 ${math("2")} 個藍球，每次抽取時每個實體球被抽中的機會相等。不放回地抽取兩個球。已知第一個球是紅球，第二個球是藍球的條件概率是多少？`
    },
    options: [
      { en: "2/5", zh: "2/5" },
      { en: "1/2", zh: "1/2" },
      { en: "2/3", zh: "2/3" },
      { en: "3/5", zh: "3/5" }
    ],
    answer: "1/2",
    explanation: {
      en: `After a red ball is removed, the ${math("4")} remaining individual balls are equally likely outcomes and ${math("2")} are favourable blue balls, so ${math(String.raw`P(\text{second blue}\mid\text{first red})=\frac{2}{4}=\frac{1}{2}`)}.`,
      zh: `抽走一個紅球後，餘下 ${math("4")} 個實體球都是等可能結果，其中 ${math("2")} 個有利結果是藍球，所以 ${math(String.raw`P(\text{第二個藍球}\mid\text{第一個紅球})=\frac{2}{4}=\frac{1}{2}`)}。`
    }
  },
  {
    id: "q10",
    grade: "S5",
    topicId: "differentiation-intro",
    topic: { en: "Differentiation Intro — HKDSE Extended Part (M1/M2)", zh: "微分入門——香港中學文憑延伸部分（M1/M2）" },
    difficulty: "Medium",
    type: "short-answer",
    prompt: { en: `Differentiate ${math("y = x^2")} with respect to ${math("x")}.`, zh: `對 ${math("y = x^2")} 關於 ${math("x")} 求導。` },
    answer: "2x",
    explanation: { en: `Using the power rule, ${math(String.raw`\frac{d}{dx}(x^2) = 2x`)}.`, zh: `利用冪法則，${math(String.raw`\frac{d}{dx}(x^2) = 2x`)}。` }
  },
  {
    id: "q11",
    grade: "S6",
    topicId: "calculus",
    topic: { en: "Calculus — HKDSE Extended Part (M1/M2)", zh: "微積分——香港中學文憑延伸部分（M1/M2）" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: { en: `If ${math("f'(x)")} changes from positive to negative at ${math("x = 2")}, what may occur at ${math("x = 2")}?`, zh: `若 ${math("f'(x)")} 在 ${math("x = 2")} 由正變負，${math("x = 2")} 可能出現甚麼？` },
    options: [
      { en: "Local maximum", zh: "局部極大值" },
      { en: "Local minimum", zh: "局部極小值" },
      { en: "No turning point", zh: "沒有轉折點" },
      { en: "Vertical asymptote", zh: "垂直漸近線" }
    ],
    answer: "Local maximum",
    explanation: { en: "Positive to negative gradient suggests the graph rises then falls.", zh: "斜率由正變負表示圖像先上升後下降。" }
  },
	  {
	    id: "q12",
	    grade: "S6",
    topicId: "statistics-s6",
    topic: { en: "Statistics — HKDSE Extended Part M1", zh: "統計——香港中學文憑延伸部分 M1" },
    difficulty: "Medium",
    type: "fill-in",
    prompt: {
      en: `A normal distribution has mean ${math("50")} and standard deviation ${math("10")}. What is the standard score (z-score) for ${math("x = 70")}?`,
      zh: `某正態分佈的平均數為 ${math("50")}、標準差為 ${math("10")}。${math("x = 70")} 的標準分（z 分數）是多少？`
    },
	    answer: "2",
	    explanation: { en: `${math(String.raw`z = \frac{70 - 50}{10} = 2`)}.`, zh: `${math(String.raw`z = \frac{70 - 50}{10} = 2`)}。` }
	  },
	  {
	    id: "q13",
	    grade: "S1",
	    topicId: "angles",
	    topic: { en: "Angles", zh: "角" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: { en: `Two angles on a straight line include ${math("65^\\circ")}. What is the other angle?`, zh: `一直線上的兩個角，其中一個是 ${math("65^\\circ")}。另一個角是多少？` },
	    options: [
	      { en: "25°", zh: "25°" },
	      { en: "65°", zh: "65°" },
	      { en: "115°", zh: "115°" },
	      { en: "180°", zh: "180°" }
	    ],
	    answer: "115°",
	    explanation: { en: `Angles on a straight line add to ${math("180^\\circ")}, so ${math("180^\\circ - 65^\\circ = 115^\\circ")}.`, zh: `一直線上的角和為 ${math("180^\\circ")}，所以 ${math("180^\\circ - 65^\\circ = 115^\\circ")}。` }
	  },
	  {
	    id: "q14",
	    grade: "S1",
	    topicId: "ratios",
	    topic: { en: "Ratios", zh: "比與率" },
	    difficulty: "Low",
	    type: "short-answer",
	    prompt: { en: `Simplify the ratio ${math("12:18")}.`, zh: `化簡比 ${math("12:18")}。` },
	    answer: "2:3",
	    explanation: { en: `Divide both parts by their highest common factor, ${math("6")}: ${math("12:18 = 2:3")}.`, zh: `兩項同除以最大公因數 ${math("6")}：${math("12:18 = 2:3")}。` }
	  },
	  {
	    id: "q15",
	    grade: "S1",
	    topicId: "statistics-s1",
	    topic: { en: "Statistics", zh: "統計" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `Find the mean of ${math("4, 7, 10")}.`, zh: `求 ${math("4, 7, 10")} 的平均數。` },
	    answer: "7",
	    explanation: { en: `Add the values and divide by ${math("3")}: ${math(String.raw`\frac{4 + 7 + 10}{3} = 7`)}.`, zh: `把數值相加再除以 ${math("3")}：${math(String.raw`\frac{4 + 7 + 10}{3} = 7`)}。` }
	  },
	  {
	    id: "q16",
	    grade: "S2",
	    topicId: "transformations",
	    topic: { en: "Transformations", zh: "變換" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: { en: `Point ${math("(3, -2)")} is reflected in the ${math("y")}-axis. What is the image?`, zh: `點 ${math("(3, -2)")} 關於 ${math("y")} 軸反射，影像點是甚麼？` },
	    options: [
	      { en: "(3, 2)", zh: "(3, 2)" },
	      { en: "(-3, -2)", zh: "(-3, -2)" },
	      { en: "(-3, 2)", zh: "(-3, 2)" },
	      { en: "(2, -3)", zh: "(2, -3)" }
	    ],
	    answer: "(-3, -2)",
	    explanation: { en: `Reflection in the ${math("y")}-axis changes the sign of ${math("x")} only: ${math("(3, -2)")} becomes ${math("(-3, -2)")}.`, zh: `關於 ${math("y")} 軸反射只改變 ${math("x")} 的符號：${math("(3, -2)")} 變成 ${math("(-3, -2)")}。` }
	  },
	  {
	    id: "q17",
	    grade: "S2",
	    topicId: "probability-s2",
	    topic: { en: "Probability", zh: "概率" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: {
	      en: `A bag has ${math("2")} red balls and ${math("3")} blue balls. One physical ball is drawn at random, with every ball equally likely to be selected. What is ${math(String.raw`P(\text{red})`)}?`,
	      zh: `袋中有 ${math("2")} 個紅球和 ${math("3")} 個藍球。從中隨機抽出一個球，每個球被抽中的機會相同。${math(String.raw`P(\text{紅球})`)} 是多少？`
	    },
	    options: [
	      { en: "2/5", zh: "2/5" },
	      { en: "3/5", zh: "3/5" },
	      { en: "1/2", zh: "1/2" },
	      { en: "2/3", zh: "2/3" }
	    ],
	    answer: "2/5",
	    explanation: { en: `The ${math("5")} physical balls are equally likely outcomes, and ${math("2")} are red, so ${math(String.raw`P(\text{red}) = \frac{2}{5}`)}.`, zh: `每個球被抽中的機會相同；${math("5")} 個球中有 ${math("2")} 個紅球，所以 ${math(String.raw`P(\text{紅球}) = \frac{2}{5}`)}。` }
	  },
	  {
	    id: "q18",
	    grade: "S3",
	    topicId: "polynomials",
	    topic: { en: "Polynomials", zh: "多項式" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `Expand: ${math("(x + 3)(x + 2)")}.`, zh: `展開：${math("(x + 3)(x + 2)")}。` },
	    answer: "x^2 + 5x + 6",
	    explanation: { en: `Multiply each term: ${math("x^2 + 2x + 3x + 6 = x^2 + 5x + 6")}.`, zh: `逐項相乘：${math("x^2 + 2x + 3x + 6 = x^2 + 5x + 6")}。` }
	  },
	  {
	    id: "hk-s3-identities-square-patterns-1",
	    grade: "S3",
	    topicId: "identities-square-patterns",
	    topic: { en: "Algebraic Identities and Square Patterns", zh: "代數恆等式與平方圖樣" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `Expand ${math("(a+b)^2")}.`, zh: `展開 ${math("(a+b)^2")}。` },
	    answer: "a^2 + 2ab + b^2",
	    acceptedAnswers: ["a^2+2ab+b^2", "b^2 + 2ab + a^2", "b^2+2ab+a^2"],
	    explanation: {
	      en: `The square is split into areas ${math("a^2")}, ${math("ab")}, ${math("ab")}, and ${math("b^2")}, so ${math("(a+b)^2 \\equiv a^2+2ab+b^2")}.`,
	      zh: `正方形分成 ${math("a^2")}、${math("ab")}、${math("ab")} 和 ${math("b^2")} 四部分，所以 ${math("(a+b)^2 \\equiv a^2+2ab+b^2")}。`
	    }
	  },
	  {
	    id: "hk-s3-arc-length-sector-area-1",
	    grade: "S3",
	    topicId: "arc-length-sector-area",
	    topic: { en: "Arc Length and Sector Area", zh: "弧長與扇形面積" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `A sector has radius ${math("6")} cm and angle at the centre ${math("120^\\circ")}. Find its exact arc length.`, zh: `一個扇形的半徑是 ${math("6")} 厘米，圓心角是 ${math("120^\\circ")}。求精確弧長。` },
	    answer: "4π cm",
	    acceptedAnswers: ["4 pi cm", "4pi cm", "4\\pi cm", "4π厘米", "4π 厘米"],
	    explanation: {
	      en: `Arc length ${math("=(120/360)(2\\pi)(6)=4\\pi")} cm, approximately ${math("12.57")} cm.`,
	      zh: `弧長 ${math("=(120/360)(2\\pi)(6)=4\\pi")} 厘米，約為 ${math("12.57")} 厘米。`
	    }
	  },
	  {
	    id: "q19",
	    grade: "S4",
	    topicId: "circles",
	    topic: { en: "Circle Geometry", zh: "圓幾何" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: { en: `The angle at the centre is ${math("100^\\circ")}. What is the angle at the circumference standing on the same arc?`, zh: `一弧所對的圓心角是 ${math("100^\\circ")}。該弧所對的圓周角是多少？` },
	    options: [
	      { en: "50°", zh: "50°" },
	      { en: "80°", zh: "80°" },
	      { en: "100°", zh: "100°" },
	      { en: "200°", zh: "200°" }
	    ],
	    answer: "50°",
	    explanation: { en: `The angle at the centre is twice the angle at the circumference standing on the same arc, so ${math("100^\\circ / 2 = 50^\\circ")}.`, zh: `同一弧所對的圓心角是圓周角的兩倍，所以 ${math("100^\\circ / 2 = 50^\\circ")}。` }
	  },
	  {
	    id: "q20",
	    grade: "S4",
	    topicId: "more-algebra",
	    topic: { en: "More Algebra", zh: "進階代數" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `Given ${math(String.raw`x \ne 0`)}, simplify ${math(String.raw`x^3 / x`)}.`, zh: `已知 ${math(String.raw`x \ne 0`)}，化簡 ${math(String.raw`x^3 / x`)}。` },
	    answer: "x^2",
	    explanation: {
	      en: `Because ${math(String.raw`x \ne 0`)}, division by ${math("x")} is defined; subtract the indices to obtain ${math("x^3/x=x^{3-1}=x^2")}.`,
	      zh: `因為 ${math(String.raw`x \ne 0`)}，除以 ${math("x")} 有定義；同底冪相除時指數相減，得 ${math("x^3/x=x^{3-1}=x^2")}。`
	    }
	  },
	  {
	    id: "q21",
	    grade: "S4",
	    topicId: "data-handling",
	    topic: { en: "Data Handling", zh: "數據處理" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `Find the median of ${math("3, 9, 4, 6, 8")}.`, zh: `求 ${math("3, 9, 4, 6, 8")} 的中位數。` },
	    answer: "6",
	    explanation: { en: `Order the data as ${math("3, 4, 6, 8, 9")}. The middle value is ${math("6")}.`, zh: `先排序為 ${math("3, 4, 6, 8, 9")}，中間的數值是 ${math("6")}。` }
	  },
	  {
	    id: "q22",
	    grade: "S5",
	    topicId: "advanced-functions",
	    topic: { en: "Advanced Functions", zh: "進階函數" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: {
	      en: `For ${math(String.raw`f(x)=\log_2(x-1)`)}, which statement gives both the correct domain and the correct value of ${math("f(9)")}?`,
	      zh: `對於 ${math(String.raw`f(x)=\log_2(x-1)`)}，哪項敘述同時給出正確定義域和 ${math("f(9)")} 的正確值？`
	    },
	    options: [
	      { en: "Domain x > 1; f(9) = 3", zh: "定義域 x > 1；f(9) = 3" },
	      { en: "Domain x ≥ 1; f(9) = 3", zh: "定義域 x ≥ 1；f(9) = 3" },
	      { en: "Domain x > 0; f(9) = 4", zh: "定義域 x > 0；f(9) = 4" },
	      { en: "Domain: all real numbers; f(9) = 8", zh: "定義域：所有實數；f(9) = 8" }
	    ],
	    answer: "Domain x > 1; f(9) = 3",
	    explanation: {
	      en: `A logarithm requires ${math("x-1>0")}, so the domain is ${math("x>1")}. With base ${math("2")}, ${math(String.raw`f(9)=\log_2 8=3`)} because ${math("2^3=8")}.`,
	      zh: `對數的真數必須滿足 ${math("x-1>0")}，所以定義域是 ${math("x>1")}。底數是 ${math("2")}，而 ${math(String.raw`f(9)=\log_2 8=3`)}，因為 ${math("2^3=8")}。`
	    }
	  },
	  {
	    id: "q23",
	    grade: "S5",
	    topicId: "trigonometry-s5",
	    topic: { en: "Trigonometry", zh: "三角學" },
	    difficulty: "Low",
	    type: "short-answer",
	    prompt: { en: `If ${math(String.raw`\sin\theta = \frac{1}{2}`)} for an acute angle ${math(String.raw`\theta`)}, find ${math(String.raw`\theta`)}.`, zh: `若銳角 ${math(String.raw`\theta`)} 滿足 ${math(String.raw`\sin\theta = \frac{1}{2}`)}，求 ${math(String.raw`\theta`)}。` },
	    answer: "30°",
	    explanation: { en: `For an acute angle, ${math(String.raw`\sin 30^\circ = \frac{1}{2}`)}, so ${math(String.raw`\theta = 30^\circ`)}.`, zh: `對銳角而言，${math(String.raw`\sin 30^\circ = \frac{1}{2}`)}，所以 ${math(String.raw`\theta = 30^\circ`)}。` }
	  },
	  {
	    id: "q24",
	    grade: "S6",
	    topicId: "exam-revision",
	    topic: { en: "Exam Revision", zh: "考試溫習" },
	    difficulty: "Low",
	    type: "multiple-choice",
      prompt: {
        en: `A ${math("10")}-mark question should take about ${math("15")} minutes. Find the time per mark in minutes per mark, giving your answer to 2 decimal places.`,
        zh: `一道 ${math("10")} 分題目建議用約 ${math("15")} 分鐘。求平均每分所用時間，以分鐘／分作單位，答案取至小數點後兩位。`
      },
      options: [
        { en: "0.50 minutes per mark", zh: "0.50 分鐘／分" },
        { en: "1.00 minutes per mark", zh: "1.00 分鐘／分" },
        { en: "1.50 minutes per mark", zh: "1.50 分鐘／分" },
        { en: "2.00 minutes per mark", zh: "2.00 分鐘／分" }
      ],
      answer: "1.50 minutes per mark",
      explanation: { en: `Divide time by marks: ${math("15/10=1.5")}, which is ${math("1.50")} minutes per mark to 2 decimal places.`, zh: `用時間除以分數：${math("15/10=1.5")}，取至小數點後兩位是 ${math("1.50")} 分鐘／分。` }
	  },
	  {
	    id: "q25",
	    grade: "S6",
	    topicId: "mixed-problem-solving",
	    topic: { en: "Mixed Problem Solving", zh: "綜合解難" },
	    difficulty: "Medium",
	    type: "multiple-choice",
	    prompt: { en: "A problem combines a graph and an equation. What is usually the safest first step?", zh: "一道題同時包含圖像和方程。通常最安全的第一步是甚麼？" },
	    options: [
	      { en: "List given facts and the target", zh: "列出已知資料和要求" },
	      { en: "Read coordinates from the graph before deciding which quantity is required", zh: "先從圖像讀取坐標，再決定題目要求哪個量" },
	      { en: "Rearrange the equation first and decide later which graph feature it represents", zh: "先整理方程，之後才判斷它代表哪項圖像特徵" },
	      { en: "Estimate the graph intersection first and use the equation only as a final check", zh: "先估算圖像交點，只在最後用方程檢查" }
	    ],
	    answer: "List given facts and the target",
	    explanation: { en: "Listing the facts and target first shows which graph feature must be translated into the equation; starting with only one representation can solve the wrong quantity.", zh: "先列出已知資料和目標，才能確定要把哪項圖像特徵轉化為方程；若只從其中一種表示方式入手，可能會求錯數量。" }
	  },
	  {
	    id: "q26",
	    grade: "S2",
	    topicId: "coordinates",
	    topic: { en: "Coordinates", zh: "坐標" },
	    difficulty: "Low",
	    type: "fill-in",
	    prompt: { en: `Fill in the missing coordinate: ${math("A(3, \\square)")} has ${math("y = -2")}.`, zh: `填上缺少的坐標：${math("A(3, \\square)")} 的 ${math("y = -2")}。` },
	    answer: "-2",
	    explanation: { en: `The second coordinate is the ${math("y")}-coordinate, so the missing value is ${math("-2")}.`, zh: `第二個坐標是 ${math("y")} 坐標，所以空格是 ${math("-2")}。` }
	  },
	  {
	    id: "q27",
	    grade: "S2",
	    topicId: "transformations",
	    topic: { en: "Transformations", zh: "變換" },
	    difficulty: "Medium",
	    type: "short-answer",
	    prompt: { en: `In one sentence, what changes when ${math("(x, y)")} is reflected in the ${math("y")}-axis?`, zh: `用一句話說明：${math("(x, y)")} 關於 ${math("y")} 軸反射時，甚麼會改變？` },
	    answer: "x coordinate changes sign",
	    acceptedAnswers: [
	      "x coordinate changes sign",
	      "x changes sign",
	      "the x-coordinate changes sign",
	      "x changes sign and y stays the same",
	      "x-coordinate changes sign and y-coordinate stays the same",
	      "x 坐標變號",
	      "x坐標變號",
	      "x 坐標改變符號",
	      "x坐標改變符號"
	    ],
	    explanation: { en: `Reflection in the ${math("y")}-axis changes ${math("x")} to ${math("-x")} while ${math("y")} stays the same.`, zh: `關於 ${math("y")} 軸反射會把 ${math("x")} 變成 ${math("-x")}，而 ${math("y")} 保持不變。` }
	  },
	];

type QuestionBlueprint = Omit<Question, "curriculumTrack" | "grade" | "topicId" | "topic">;

const primaryQuestionBlueprints: Record<string, QuestionBlueprint[]> = {
  "p1-counting-number-bonds": [
    {
      id: "pq-p1-counting-number-bonds-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `What number makes ${math("7 + \\square = 10")}?`, zh: `${math("7 + \\square = 10")} 中，方格應填甚麼數？` },
      options: [
        { en: "2", zh: "2" },
        { en: "3", zh: "3" },
        { en: "4", zh: "4" },
        { en: "5", zh: "5" }
      ],
      answer: "3",
      explanation: { en: `${math("7")} needs ${math("3")} more to make ${math("10")}.`, zh: `${math("7")} 再加 ${math("3")} 就是 ${math("10")}。` }
    },
    {
      id: "pq-p1-counting-number-bonds-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Write the number after ${math("18")}.`, zh: `寫出 ${math("18")} 之後的數。` },
      answer: "19",
      explanation: { en: `Counting on one from ${math("18")} gives ${math("19")}.`, zh: `由 ${math("18")} 數多一個是 ${math("19")}。` }
    }
  ],
  "p1-addition-subtraction": [
    {
      id: "pq-p1-addition-subtraction-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Mia has ${math("9")} stickers and gives away ${math("4")}. How many are left?`, zh: `Mia 有 ${math("9")} 張貼紙，送出 ${math("4")} 張，還剩多少張？` },
      options: [
        { en: "4", zh: "4" },
        { en: "5", zh: "5" },
        { en: "6", zh: "6" },
        { en: "13", zh: "13" }
      ],
      answer: "5",
      explanation: { en: `${math("9 - 4 = 5")}.`, zh: `${math("9 - 4 = 5")}。` }
    },
    {
      id: "pq-p1-addition-subtraction-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Find ${math("6 + 8")}.`, zh: `計算 ${math("6 + 8")}。` },
      answer: "14",
      explanation: { en: `Make ten: ${math("6 + 4 = 10")} and ${math("10 + 4 = 14")}.`, zh: `先湊十：${math("6 + 4 = 10")}，再 ${math("10 + 4 = 14")}。` }
    }
  ],
  "p1-shapes-patterns": [
    {
      id: "pq-p1-shapes-patterns-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "Which shape has 3 sides?", zh: "哪一個圖形有 3 條邊？" },
      options: [
        { en: "circle", zh: "圓形" },
        { en: "triangle", zh: "三角形" },
        { en: "square", zh: "正方形" },
        { en: "rectangle", zh: "長方形" }
      ],
      answer: "triangle",
      explanation: { en: "A triangle has exactly 3 sides.", zh: "三角形正好有 3 條邊。" }
    },
    {
      id: "pq-p1-shapes-patterns-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "Continue the pattern: circle, square, circle, square, ?", zh: "延續規律：圓形、正方形、圓形、正方形、？" },
      options: [
        { en: "circle", zh: "圓形" },
        { en: "square", zh: "正方形" },
        { en: "triangle", zh: "三角形" },
        { en: "star", zh: "星形" }
      ],
      answer: "circle",
      explanation: { en: "The pattern repeats circle then square.", zh: "規律是圓形、正方形重複出現。" }
    }
  ],
  "p1-measurement-time": [
    {
      id: "pq-p1-measurement-time-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "Which object is usually longer?", zh: "哪一件物件通常較長？" },
      options: [
        { en: "a pencil", zh: "一支鉛筆" },
        { en: "a classroom door", zh: "一扇課室門" },
        { en: "an eraser", zh: "一塊膠擦" },
        { en: "a coin", zh: "一個硬幣" }
      ],
      answer: "a classroom door",
      explanation: { en: "A classroom door is much longer than small stationery.", zh: "課室門比小文具長很多。" }
    },
    {
      id: "pq-p1-measurement-time-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `What time is shown by a clock with the hour hand at ${math("3")} and the minute hand at ${math("12")}?`, zh: `時針指向 ${math("3")}、分針指向 ${math("12")} 是甚麼時間？` },
      answer: "3 o'clock",
      explanation: { en: `The minute hand at ${math("12")} shows an o'clock time, so it is 3 o'clock.`, zh: `分針指向 ${math("12")} 表示整點，所以是 3 時。` }
    }
  ],
  "p2-place-value": [
    {
      id: "pq-p2-place-value-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `In ${math("482")}, what digit is in the tens place?`, zh: `在 ${math("482")} 中，十位數字是甚麼？` },
      options: [
        { en: "2", zh: "2" },
        { en: "4", zh: "4" },
        { en: "8", zh: "8" },
        { en: "80", zh: "80" }
      ],
      answer: "8",
      explanation: { en: `${math("482")} has ${math("4")} hundreds, ${math("8")} tens, and ${math("2")} ones.`, zh: `${math("482")} 有 ${math("4")} 個百、${math("8")} 個十和 ${math("2")} 個一。` }
    },
    {
      id: "pq-p2-place-value-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Write ${math("300 + 40 + 6")} as one number.`, zh: `把 ${math("300 + 40 + 6")} 寫成一個數。` },
      answer: "346",
      explanation: { en: `${math("300 + 40 + 6 = 346")}.`, zh: `${math("300 + 40 + 6 = 346")}。` }
    }
  ],
  "p2-multiplication-foundations": [
    {
      id: "pq-p2-multiplication-foundations-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Which expression matches ${math("4 + 4 + 4")}?`, zh: `哪個算式表示 ${math("4 + 4 + 4")}？` },
      options: [
        { en: "3 × 4", zh: "3 × 4" },
        { en: "4 × 4", zh: "4 × 4" },
        { en: "3 + 4", zh: "3 + 4" },
        { en: "4 - 3", zh: "4 - 3" }
      ],
      answer: "3 × 4",
      explanation: { en: `${math("4")} is added ${math("3")} times, so it is ${math("3 \\times 4")}.`, zh: `${math("4")} 加了 ${math("3")} 次，所以是 ${math("3 \\times 4")}。` }
    },
    {
      id: "pq-p2-multiplication-foundations-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Find ${math("5 \\times 2")}.`, zh: `計算 ${math("5 \\times 2")}。` },
      answer: "10",
      explanation: { en: `${math("5 \\times 2")} means five groups of two, which is ${math("10")}.`, zh: `${math("5 \\times 2")} 表示 5 組、每組 2 個，共 10 個。` }
    }
  ],
  "p2-money-time": [
    {
      id: "pq-p2-money-time-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "A snack costs HK$8. You pay HK$10. How much change do you get?", zh: "小食售港幣 8 元，你付港幣 10 元，應找回多少？" },
      options: [
        { en: "HK$1", zh: "港幣 1 元" },
        { en: "HK$2", zh: "港幣 2 元" },
        { en: "HK$8", zh: "港幣 8 元" },
        { en: "HK$18", zh: "港幣 18 元" }
      ],
      answer: "HK$2",
      explanation: { en: `${math("10 - 8 = 2")}.`, zh: `${math("10 - 8 = 2")}。` }
    },
    {
      id: "pq-p2-money-time-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Thirty minutes after ${math("4:00")} is what time?`, zh: `${math("4:00")} 之後三十分鐘是甚麼時間？` },
      answer: "4:30",
      explanation: { en: `Adding half an hour to ${math("4:00")} gives ${math("4:30")}.`, zh: `${math("4:00")} 加半小時是 ${math("4:30")}。` }
    }
  ],
  "p2-length-data": [
    {
      id: "pq-p2-length-data-1",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Complete the length fact: ${math("1\\text{ m} = \\square\\text{ cm}")}.`, zh: `完成長度關係：${math("1\\text{ 米} = \\square\\text{ 厘米}")}。` },
      answer: "100",
      acceptedAnswers: ["100 cm", "100cm", "100 厘米", "100厘米"],
      explanation: { en: `${math("1\\text{ m} = 100\\text{ cm}")}.`, zh: `${math("1\\text{ 米} = 100\\text{ 厘米}")}。` }
    },
    {
      id: "pq-p2-length-data-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: {
        en: "Key: each ● picture represents 1 object (one fruit).\nApples: ● ● ● ● ● ●\nBananas: ● ● ● ●\nHow many fruits are shown altogether?",
        zh: "圖例：每個 ● 圖示代表 1 件物件（這裡是一個水果）。\n蘋果：● ● ● ● ● ●\n香蕉：● ● ● ●\n圖中合共有多少個水果？"
      },
      options: [
        { en: "2", zh: "2" },
        { en: "4", zh: "4" },
        { en: "10", zh: "10" },
        { en: "24", zh: "24" }
      ],
      answer: "10",
      explanation: { en: `There are ${math("6")} apple pictures and ${math("4")} banana pictures. Since each picture represents one fruit, ${math("6+4=10")}.`, zh: `蘋果有 ${math("6")} 個圖示，香蕉有 ${math("4")} 個圖示。每個圖示代表一個水果，所以 ${math("6+4=10")}。` }
    }
  ],
  "p3-multiplication-division": [
    {
      id: "pq-p3-multiplication-division-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Find ${math("124 \\times 3")}.`, zh: `計算 ${math("124 \\times 3")}。` },
      answer: "372",
      explanation: { en: `${math("3 \\times 4=12")}, ${math("3 \\times 20=60")}, and ${math("3 \\times 100=300")}; the total is ${math("372")}.`, zh: `${math("3 \\times 4=12")}、${math("3 \\times 20=60")}、${math("3 \\times 100=300")}；合共是 ${math("372")}。` }
    },
    {
      id: "pq-p3-multiplication-division-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `${math("53")} counters are put into groups of ${math("5")}. How many full groups are made and how many counters remain?`, zh: `把 ${math("53")} 粒計數珠每 ${math("5")} 粒分成一組，可分成多少完整組，餘下多少粒？` },
      options: [
        { en: "9 full groups, 8 remain", zh: "9 組，餘 8 粒" },
        { en: "10 full groups, 3 remain", zh: "10 組，餘 3 粒" },
        { en: "10 full groups, 5 remain", zh: "10 組，餘 5 粒" },
        { en: "11 full groups, none remain", zh: "11 組，沒有餘數" }
      ],
      answer: "10 full groups, 3 remain",
      explanation: { en: `${math("53=10 \\times 5+3")}, so there are ${math("10")} full groups with remainder ${math("3")}.`, zh: `${math("53=10 \\times 5+3")}，所以可分成 ${math("10")} 個完整組，餘數是 ${math("3")}。` }
    }
  ],
  "p3-fractions-intro": [
    {
      id: "pq-p3-fractions-intro-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Which fraction means one out of four equal parts?`, zh: `哪個分數表示四等份中的一份？` },
      options: [
        { en: "1/2", zh: "1/2" },
        { en: "1/3", zh: "1/3" },
        { en: "1/4", zh: "1/4" },
        { en: "4/1", zh: "4/1" }
      ],
      answer: "1/4",
      explanation: { en: `${math("1/4")} means one of four equal parts.`, zh: `${math("1/4")} 表示四等份中的一份。` }
    },
    {
      id: "pq-p3-fractions-intro-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Write an equivalent fraction for ${math("1/2")} with denominator ${math("4")}.`, zh: `寫出一個與 ${math("1/2")} 等值而分母為 ${math("4")} 的分數。` },
      answer: "2/4",
      explanation: { en: `Multiply numerator and denominator by ${math("2")}: ${math("1/2 = 2/4")}.`, zh: `分子和分母同乘 ${math("2")}：${math("1/2 = 2/4")}。` }
    }
  ],
  "p3-measurement": [
    {
      id: "pq-p3-measurement-1",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Which unit is suitable for the length of a pencil?`, zh: `量度鉛筆長度，哪個單位較合適？` },
      options: [
        { en: "centimetres", zh: "厘米" },
        { en: "kilometres", zh: "公里" },
        { en: "litres", zh: "升" },
        { en: "kilograms", zh: "公斤" }
      ],
      answer: "centimetres",
      explanation: { en: "A pencil is a small length, so centimetres are suitable.", zh: "鉛筆是較短的長度，適合用厘米。" }
    },
    {
      id: "pq-p3-measurement-2",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The single-series bar chart shows the water in two bottles. How much water is in Bottle B?", zh: "這幅單組棒形圖顯示兩個水樽的水量。水樽 B 有多少毫升水？" },
      answer: "900 mL",
      explanation: { en: `The bar for Bottle B reaches ${math("900")} mL.`, zh: `水樽 B 的棒形高度到達 ${math("900")} 毫升。` },
      diagram: {
        kind: "bar-chart",
        mode: "single",
        title: { en: "Water in bottles", zh: "水樽水量" },
        xAxisLabel: { en: "Bottle", zh: "水樽" },
        yAxisLabel: { en: "Water (mL)", zh: "水量（毫升）" },
        yRange: [0, 1000],
        tickInterval: 100,
        series: [{ id: "water", label: { en: "Water", zh: "水量" } }],
        categories: [
          { id: "bottle-a", label: { en: "Bottle A", zh: "水樽 A" }, values: { water: 600 } },
          { id: "bottle-b", label: { en: "Bottle B", zh: "水樽 B" }, values: { water: 900 } }
        ]
      }
    }
  ],
  "p3-geometry-patterns": [
    {
      id: "pq-p3-geometry-patterns-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "Triangle ABC has marks showing that AB and AC are equal. What kind of triangle is it?", zh: "三角形 ABC 的記號顯示 AB 和 AC 相等。它是哪一種三角形？" },
      options: [
        { en: "isosceles triangle", zh: "等腰三角形" },
        { en: "equilateral triangle", zh: "等邊三角形" },
        { en: "scalene triangle", zh: "不等邊三角形" },
        { en: "quadrilateral", zh: "四邊形" }
      ],
      answer: "isosceles triangle",
      explanation: { en: "A triangle with at least two equal sides is an isosceles triangle; the matching marks show AB = AC.", zh: "有至少兩條相等邊的三角形是等腰三角形；相同記號顯示 AB = AC。" },
      diagram: {
        kind: "plane-figure",
        points: [
          { id: "A", x: 0, y: 3, label: "A" },
          { id: "B", x: -2, y: 0, label: "B" },
          { id: "C", x: 2, y: 0, label: "C" }
        ],
        segments: [
          { from: "A", to: "B", tickMarks: 1 },
          { from: "A", to: "C", tickMarks: 1 },
          { from: "B", to: "C" }
        ],
        polygons: [{ vertexIds: ["A", "B", "C"] }]
      }
    },
    {
      id: "pq-p3-geometry-patterns-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "The diagram shows quadrilateral ABCD. Matching arrow marks indicate parallel sides. Which statement is true?", zh: "圖中顯示四邊形 ABCD；相同箭嘴記號表示平行邊。哪項敘述正確？" },
      options: [
        { en: "Both pairs of opposite sides are parallel", zh: "兩組對邊互相平行" },
        { en: "Only AB and BC are parallel", zh: "只有 AB 和 BC 平行" },
        { en: "The shape has three sides", zh: "這個圖形有三條邊" },
        { en: "Every pair of adjacent sides is parallel", zh: "每一組鄰邊都互相平行" }
      ],
      answer: "Both pairs of opposite sides are parallel",
      explanation: { en: "The matching arrow marks pair AB with CD and BC with AD, so both pairs of opposite sides are parallel.", zh: "相同箭嘴記號分別把 AB 與 CD、BC 與 AD 配成平行邊，所以兩組對邊互相平行。" },
      diagram: {
        kind: "plane-figure",
        points: [
          { id: "A", x: -2, y: 0, label: "A" },
          { id: "B", x: 2, y: 0, label: "B" },
          { id: "C", x: 3, y: 3, label: "C" },
          { id: "D", x: -1, y: 3, label: "D" }
        ],
        segments: [
          { from: "A", to: "B", parallelMarks: 1 },
          { from: "B", to: "C", parallelMarks: 2 },
          { from: "C", to: "D", parallelMarks: 1 },
          { from: "D", to: "A", parallelMarks: 2 }
        ],
        polygons: [{ vertexIds: ["A", "B", "C", "D"] }]
      }
    }
  ],
  "p4-large-numbers": [
    {
      id: "pq-p4-large-numbers-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `Which statement explains why ${math("12")} is a factor of ${math("60")}?`, zh: `哪項敘述能說明 ${math("12")} 是 ${math("60")} 的因數？` },
      options: [
        { en: "60 ÷ 12 = 5 with remainder 0", zh: "60 ÷ 12 = 5，餘數是 0" },
        { en: "60 and 12 are both even", zh: "60 和 12 都是偶數" },
        { en: "60 is greater than 12", zh: "60 大於 12" },
        { en: "60 ends in 0", zh: "60 的個位數字是 0" }
      ],
      answer: "60 ÷ 12 = 5 with remainder 0",
      explanation: { en: `A whole number is a factor exactly when the division leaves remainder ${math("0")}; here ${math("60 \\div 12=5")} with no remainder.`, zh: `一個整數能整除另一個整數、餘數是 ${math("0")} 時，才是後者的因數；這裏 ${math("60 \\div 12=5")}，沒有餘數。` }
    },
    {
      id: "pq-p4-large-numbers-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `Which list gives all the positive factor pairs of ${math("24")}?`, zh: `哪個列表列出 ${math("24")} 的所有正因數配對？` },
      options: [
        { en: "1 × 24, 2 × 12, 3 × 8, 4 × 6", zh: "1 × 24、2 × 12、3 × 8、4 × 6" },
        { en: "1 × 24, 2 × 12, 3 × 8", zh: "1 × 24、2 × 12、3 × 8" },
        { en: "1 × 24, 2 × 12, 4 × 6, 5 × 5", zh: "1 × 24、2 × 12、4 × 6、5 × 5" },
        { en: "2 × 12, 3 × 8, 4 × 6, 6 × 6", zh: "2 × 12、3 × 8、4 × 6、6 × 6" }
      ],
      answer: "1 × 24, 2 × 12, 3 × 8, 4 × 6",
      explanation: { en: `Each listed pair has product ${math("24")}, and listing factors in increasing order shows that no positive factor pair is missing.`, zh: `每一組配對的積都是 ${math("24")}；按由小至大列出因數，可見沒有遺漏任何正因數配對。` }
    }
  ],
  "p4-decimals": [
    {
      id: "pq-p4-decimals-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `Which decimal is greater: ${math("0.6")} or ${math("0.56")}?`, zh: `${math("0.6")} 和 ${math("0.56")}，哪個小數較大？` },
      options: [
        { en: "0.6", zh: "0.6" },
        { en: "0.56", zh: "0.56" },
        { en: "They are equal", zh: "它們相等" },
        { en: "Cannot tell", zh: "無法判斷" }
      ],
      answer: "0.6",
      explanation: { en: `${math("0.6 = 0.60")}, and ${math("0.60 > 0.56")}.`, zh: `${math("0.6 = 0.60")}，而 ${math("0.60 > 0.56")}。` }
    },
    {
      id: "pq-p4-decimals-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Find ${math("2.3 + 1.4")}.`, zh: `計算 ${math("2.3 + 1.4")}。` },
      answer: "3.7",
      explanation: { en: `Add tenths with tenths: ${math("2.3 + 1.4 = 3.7")}.`, zh: `十分位與十分位相加：${math("2.3 + 1.4 = 3.7")}。` }
    }
  ],
  "p4-angles": [
    {
      id: "pq-p4-angles-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "A square can also belong to broader quadrilateral families. Which list is always correct?", zh: "正方形也可屬於較廣的四邊形類別。哪個列表必定正確？" },
      options: [
        { en: "rectangle, rhombus, and parallelogram", zh: "長方形、菱形和平行四邊形" },
        { en: "rectangle only", zh: "只屬於長方形" },
        { en: "rhombus only", zh: "只屬於菱形" },
        { en: "parallelogram only", zh: "只屬於平行四邊形" }
      ],
      answer: "rectangle, rhombus, and parallelogram",
      explanation: { en: "A square has four right angles and four equal sides, so it satisfies the defining properties of a rectangle, a rhombus, and a parallelogram.", zh: "正方形有四個直角和四條等邊，因此符合長方形、菱形和平行四邊形的定義性質。" }
    },
    {
      id: "pq-p4-angles-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "Which side property must every rhombus have?", zh: "每個菱形必定有哪項邊的性質？" },
      options: [
        { en: "All four sides are equal", zh: "四條邊全部相等" },
        { en: "Exactly three sides are equal", zh: "恰有三條邊相等" },
        { en: "Only one pair of sides is parallel", zh: "只有一組邊互相平行" },
        { en: "No sides are parallel", zh: "沒有邊互相平行" }
      ],
      answer: "All four sides are equal",
      explanation: { en: "A rhombus has four equal sides. It need not be a square, so equal sides alone do not justify the converse classification.", zh: "菱形有四條相等的邊；菱形不一定是正方形，因此不能只憑四邊相等便反過來判定為正方形。" }
    },
    {
      id: "pq-p4-angles-square-corner-3",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "Which side relationship must every rectangle have?", zh: "每個長方形必定有哪項邊的關係？" },
      options: [
        { en: "Both pairs of opposite sides are equal and parallel", zh: "兩組對邊分別相等並互相平行" },
        { en: "All four sides must be equal", zh: "四條邊必須全部相等" },
        { en: "Exactly one pair of opposite sides is parallel", zh: "恰有一組對邊互相平行" },
        { en: "Each side has a different length", zh: "每條邊的長度都不同" }
      ],
      answer: "Both pairs of opposite sides are equal and parallel",
      explanation: { en: "Every rectangle has two pairs of equal, parallel opposite sides. Those side relationships alone also occur in other parallelograms, so the converse needs more information.", zh: "每個長方形都有兩組分別相等且互相平行的對邊；其他平行四邊形也可有這些邊關係，因此反過來判定時還需要更多資料。" }
    },
    {
      id: "pq-p4-angles-square-corner-4",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "A parallelogram is found to have four equal sides. Which more specific family must it belong to?", zh: "一個平行四邊形有四條相等的邊。它必定屬於哪個較具體的類別？" },
      options: [
        { en: "rhombus", zh: "菱形" },
        { en: "square", zh: "正方形" },
        { en: "rectangle", zh: "長方形" },
        { en: "triangle", zh: "三角形" }
      ],
      answer: "rhombus",
      explanation: { en: "A parallelogram with all four sides equal is a rhombus. It is not necessarily a square, so the stronger converse conclusion is not justified.", zh: "四條邊全部相等的平行四邊形是菱形；它不一定是正方形，因此不能作出更強的反向結論。" }
    },
    {
      id: "pq-p4-angles-square-corner-5",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "A square sheet ABCD is cut along diagonal AC. Which two pieces form the original square when composed again?", zh: "把正方形紙張 ABCD 沿對角線 AC 分割。把哪兩塊圖形重新拼砌，便可組成原來的正方形？" },
      options: [
        { en: "two congruent triangles", zh: "兩個全等三角形" },
        { en: "two unequal triangles", zh: "兩個不全等三角形" },
        { en: "one triangle and one pentagon", zh: "一個三角形和一個五邊形" },
        { en: "two circles", zh: "兩個圓形" }
      ],
      answer: "two congruent triangles",
      explanation: { en: "The diagonal divides the square into two congruent triangles; composing those same two pieces along the cut reconstructs the square.", zh: "對角線把正方形分割成兩個全等三角形；沿分割邊把兩塊重新拼砌，便可還原正方形。" },
      diagram: {
        kind: "plane-figure",
        points: [
          { id: "A", x: 0, y: 4, label: "A" },
          { id: "B", x: 4, y: 4, label: "B" },
          { id: "C", x: 4, y: 0, label: "C" },
          { id: "D", x: 0, y: 0, label: "D" }
        ],
        segments: [
          { from: "A", to: "B" },
          { from: "B", to: "C" },
          { from: "C", to: "D" },
          { from: "D", to: "A" },
          { from: "A", to: "C", style: "dashed" }
        ],
        polygons: [
          { vertexIds: ["A", "B", "C"] },
          { vertexIds: ["A", "C", "D"] }
        ]
      }
    }
  ],
  "p4-perimeter-area": [
    {
      id: "pq-p4-perimeter-area-1",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `A rectangle has length ${math("8")} cm and width ${math("3")} cm. Find its perimeter.`, zh: `長方形長 ${math("8")} 厘米、闊 ${math("3")} 厘米。求周界。` },
      answer: "22 cm",
      explanation: { en: `Perimeter ${math("= 2(8 + 3) = 22")} cm.`, zh: `周界 ${math("= 2(8 + 3) = 22")} 厘米。` }
    },
    {
      id: "pq-p4-perimeter-area-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `A rectangle is ${math("5")} cm by ${math("4")} cm. What is its area?`, zh: `長方形長 ${math("5")} 厘米、闊 ${math("4")} 厘米，面積是多少？` },
      options: [
        { en: "9 cm^2", zh: "9 平方厘米" },
        { en: "18 cm^2", zh: "18 平方厘米" },
        { en: "20 cm^2", zh: "20 平方厘米" },
        { en: "25 cm^2", zh: "25 平方厘米" }
      ],
      answer: "20 cm^2",
      explanation: { en: `Area ${math("= 5 \\times 4 = 20")} square centimetres.`, zh: `面積 ${math("= 5 \\times 4 = 20")} 平方厘米。` }
    }
  ],
  "p5-fractions-operations": [
    {
      id: "pq-p5-fractions-operations-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Add the three fractions with unlike denominators: ${math("1/2+1/3+1/6")}.`, zh: `把三項異分母分數相加：${math("1/2+1/3+1/6")}。` },
      answer: "1",
      explanation: { en: `Use denominator ${math("6")}: ${math("3/6+2/6+1/6=6/6=1")}.`, zh: `通分至分母 ${math("6")}：${math("3/6+2/6+1/6=6/6=1")}。` }
    },
    {
      id: "pq-p5-fractions-operations-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Subtract fractions with unlike denominators: ${math("3/4-1/6")}. Give the answer in simplest fractional form.`, zh: `計算異分母分數減法 ${math("3/4-1/6")}，並把答案化至最簡分數。` },
      answer: "7/12",
      explanation: { en: `${math("3/4=9/12")} and ${math("1/6=2/12")}, so ${math("9/12-2/12=7/12")}.`, zh: `${math("3/4=9/12")} 而 ${math("1/6=2/12")}，所以 ${math("9/12-2/12=7/12")}。` }
    }
  ],
  "p5-volume": [
    {
      id: "pq-p5-volume-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A cuboid is ${math("4")} cm by ${math("3")} cm by ${math("2")} cm. Find its volume.`, zh: `長方體長 ${math("4")} 厘米、闊 ${math("3")} 厘米、高 ${math("2")} 厘米。求體積。` },
      answer: "24 cm^3",
      explanation: { en: `Volume ${math("= 4 \\times 3 \\times 2 = 24")} cubic centimetres.`, zh: `體積 ${math("= 4 \\times 3 \\times 2 = 24")} 立方厘米。` }
    },
    {
      id: "pq-p5-volume-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Which unit is used for volume?`, zh: `哪個單位用於體積？` },
      options: [
        { en: "cm", zh: "厘米" },
        { en: "cm^2", zh: "平方厘米" },
        { en: "cm^3", zh: "立方厘米" },
        { en: "kg", zh: "公斤" }
      ],
      answer: "cm^3",
      explanation: { en: "Volume is measured in cubic units such as cubic centimetres.", zh: "體積用立方單位量度，例如立方厘米。" }
    }
  ],
  "p5-rates": [
    {
      id: "pq-p5-rates-1",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: "A pack of 4 pens costs HK$20. What is the unit price per pen?", zh: "4 支筆售港幣 20 元，每支的單價是多少？" },
      answer: "HK$5",
      explanation: { en: `${math("20 \\div 4 = 5")}, so each pen costs HK$5.`, zh: `${math("20 \\div 4 = 5")}，所以每支港幣 5 元。` }
    },
    {
      id: "pq-p5-rates-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: "Five notebooks cost HK$35. What is the unit price per notebook?", zh: "5 本筆記簿售港幣 35 元，每本的單價是多少？" },
      answer: "HK$7",
      explanation: { en: `${math("35 \\div 5=7")}, so the unit price is HK$7 per notebook.`, zh: `${math("35 \\div 5=7")}，所以每本的單價是港幣 7 元。` }
    }
  ],
  "p5-charts-averages": [
    {
      id: "pq-p5-charts-averages-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: "In a compound bar chart, Class A has 6 votes and Class B has 4 votes for football. How many more votes does Class A have?", zh: "在一幅複合棒形圖中，甲班有 6 票選足球，乙班有 4 票。甲班多多少票？" },
      answer: "2",
      explanation: { en: `${math("6-4=2")}, so Class A has ${math("2")} more votes.`, zh: `${math("6-4=2")}，所以甲班多 ${math("2")} 票。` },
      diagram: {
        kind: "bar-chart",
        mode: "grouped",
        title: { en: "Football votes by class", zh: "各班足球票數" },
        xAxisLabel: { en: "Choice", zh: "選項" },
        yAxisLabel: { en: "Number of votes", zh: "票數" },
        yRange: [0, 8],
        tickInterval: 1,
        series: [
          { id: "class-a", label: { en: "Class A", zh: "甲班" } },
          { id: "class-b", label: { en: "Class B", zh: "乙班" } }
        ],
        categories: [
          { id: "football", label: { en: "Football", zh: "足球" }, values: { "class-a": 6, "class-b": 4 } }
        ]
      }
    },
    {
      id: "pq-p5-charts-averages-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "A compound bar chart shows 8 books for Class A and 7 books for Class B in Week 2. What is their Week 2 total?", zh: "一幅複合棒形圖顯示第 2 周甲班閱讀 8 本書、乙班閱讀 7 本書。兩班第 2 周合共閱讀多少本？" },
      options: [
        { en: "1", zh: "1" },
        { en: "8", zh: "8" },
        { en: "15", zh: "15" },
        { en: "56", zh: "56" }
      ],
      answer: "15",
      explanation: { en: `${math("8+7=15")}, so the two classes read ${math("15")} books in Week 2.`, zh: `${math("8+7=15")}，所以兩班在第 2 周合共閱讀 ${math("15")} 本書。` },
      diagram: {
        kind: "bar-chart",
        mode: "grouped",
        title: { en: "Books read by class", zh: "各班閱讀本數" },
        xAxisLabel: { en: "Week", zh: "周次" },
        yAxisLabel: { en: "Number of books", zh: "書本數量" },
        yRange: [0, 10],
        tickInterval: 1,
        series: [
          { id: "class-a", label: { en: "Class A", zh: "甲班" } },
          { id: "class-b", label: { en: "Class B", zh: "乙班" } }
        ],
        categories: [
          { id: "week-1", label: { en: "Week 1", zh: "第 1 周" }, values: { "class-a": 6, "class-b": 4 } },
          { id: "week-2", label: { en: "Week 2", zh: "第 2 周" }, values: { "class-a": 8, "class-b": 7 } }
        ]
      }
    },
    {
      id: "pq-p5-charts-averages-chart-total-v2",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The compound bar chart compares two classes. How many books did Class A read across both weeks?", zh: "複合棒形圖比較兩個班別。甲班兩周合共閱讀了多少本書？" },
      answer: "14",
      explanation: { en: `${math("6+8=14")}, so Class A read ${math("14")} books.`, zh: `${math("6+8=14")}，所以甲班閱讀了 ${math("14")} 本書。` },
      diagram: {
        kind: "bar-chart",
        mode: "grouped",
        title: { en: "Books read by class", zh: "各班閱讀本數" },
        xAxisLabel: { en: "Week", zh: "周次" },
        yAxisLabel: { en: "Number of books", zh: "書本數量" },
        yRange: [0, 10],
        tickInterval: 1,
        series: [
          { id: "class-a", label: { en: "Class A", zh: "甲班" } },
          { id: "class-b", label: { en: "Class B", zh: "乙班" } }
        ],
        categories: [
          { id: "week-1", label: { en: "Week 1", zh: "第 1 周" }, values: { "class-a": 6, "class-b": 4 } },
          { id: "week-2", label: { en: "Week 2", zh: "第 2 周" }, values: { "class-a": 8, "class-b": 7 } }
        ]
      }
    },
    {
      id: "supp-p5-charts-averages-chart-total-v2",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The compound bar chart compares two teams. What is Team Blue's total over the two rounds?", zh: "複合棒形圖比較兩隊。藍隊兩輪合共取得多少分？" },
      answer: "11",
      explanation: { en: `${math("5+6=11")}, so Team Blue's total is ${math("11")}.`, zh: `${math("5+6=11")}，所以藍隊合共取得 ${math("11")} 分。` },
      diagram: {
        kind: "bar-chart",
        mode: "grouped",
        title: { en: "Points by round", zh: "各輪得分" },
        xAxisLabel: { en: "Round", zh: "輪次" },
        yAxisLabel: { en: "Points", zh: "分數" },
        yRange: [0, 8],
        tickInterval: 1,
        series: [
          { id: "team-blue", label: { en: "Team Blue", zh: "藍隊" } },
          { id: "team-green", label: { en: "Team Green", zh: "綠隊" } }
        ],
        categories: [
          { id: "round-1", label: { en: "Round 1", zh: "第 1 輪" }, values: { "team-blue": 5, "team-green": 4 } },
          { id: "round-2", label: { en: "Round 2", zh: "第 2 輪" }, values: { "team-blue": 6, "team-green": 7 } }
        ]
      }
    }
  ],
  "p6-percentages": [
    {
      id: "pq-p6-percentages-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `What is ${math("50\\%")} of ${math("80")}?`, zh: `${math("80")} 的 ${math("50\\%")} 是多少？` },
      options: [
        { en: "20", zh: "20" },
        { en: "40", zh: "40" },
        { en: "50", zh: "50" },
        { en: "130", zh: "130" }
      ],
      answer: "40",
      explanation: { en: `${math("50\\%")} means half, and half of ${math("80")} is ${math("40")}.`, zh: `${math("50\\%")} 表示一半，${math("80")} 的一半是 ${math("40")}。` }
    },
    {
      id: "pq-p6-percentages-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A book costs HK$${math("80")}. Its price is decreased by ${math("25\\%")}. What is the new price?`, zh: `一本書售港幣 ${math("80")} 元，現減價 ${math("25\\%")}。新售價是多少？` },
      answer: "HK$60",
      explanation: { en: `${math("25\\%")} of HK$${math("80")} is HK$${math("20")}; subtracting the decrease gives HK$${math("80-20=60")}.`, zh: `港幣 ${math("80")} 元的 ${math("25\\%")} 是港幣 ${math("20")} 元；減去減價額，得新售價港幣 ${math("80-20=60")} 元。` }
    }
  ],
  "p6-ratio-proportion": [
    {
      id: "pq-p6-ratio-proportion-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Four students have ${math("7")}, ${math("9")}, ${math("8")}, and ${math("12")} stickers. If the stickers are shared fairly, how many does each student receive?`, zh: `四名學生分別有 ${math("7")}、${math("9")}、${math("8")} 和 ${math("12")} 張貼紙。若把貼紙公平分配，每人可得多少張？` },
      answer: "9",
      explanation: { en: `The total is ${math("7+9+8+12=36")}. The mean is the fair share: total ${math("36")} divided by count ${math("4")}, so ${math("36\\div4=9")}.`, zh: `總數是 ${math("7+9+8+12=36")}。平均數就是公平分配所得：用總數 ${math("36")} 除以數據個數 ${math("4")}，得 ${math("36\\div4=9")}。` }
    },
    {
      id: "pq-p6-ratio-proportion-2",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The broken-line graph shows the temperature recorded at consecutive hourly times. What temperature was recorded at 11:00?", zh: "折線圖顯示按連續每小時時序記錄的氣溫。11:00 的氣溫是多少？" },
      answer: "24°C",
      acceptedAnswers: ["24 °C", "24 degrees Celsius", "24 度", "攝氏 24 度"],
      explanation: { en: `At ${math("11{:}00")}, the plotted point is at ${math("24")} °C on the labelled temperature axis.`, zh: `在 ${math("11{:}00")}，折線上的點對應已標示氣溫單位的縱軸 ${math("24")} °C。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [8, 12],
        yRange: [16, 26],
        xAxisLabel: { en: "Time (hour of day)", zh: "時間（時）" },
        yAxisLabel: { en: "Temperature (°C)", zh: "氣溫（°C）" },
        xTickInterval: 1,
        yTickInterval: 2,
        points: [
          { id: "temp-11", label: "T", x: 11, y: 24 }
        ],
        lines: [
          {
            id: "hourly-temp",
            label: { en: "Hourly temperature", zh: "每小時氣溫" },
            points: [
              { x: 8, y: 18 },
              { x: 9, y: 20 },
              { x: 10, y: 22 },
              { x: 11, y: 24 },
              { x: 12, y: 22 }
            ]
          }
        ]
      }
    }
  ],
  "p6-speed": [
    {
      id: "pq-p6-speed-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A train travels ${math("90")} km in ${math("3")} hours. Find its speed.`, zh: `火車 ${math("3")} 小時行 ${math("90")} 公里。求速率。` },
      answer: "30 km/h",
      explanation: { en: `Speed ${math("= 90 \\div 3 = 30")} km/h.`, zh: `速率 ${math("= 90 \\div 3 = 30")} 公里每小時。` }
    },
    {
      id: "pq-p6-speed-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `At ${math("5")} km/h, how far do you walk in ${math("2")} hours?`, zh: `以每小時 ${math("5")} 公里步行 ${math("2")} 小時，路程是多少？` },
      options: [
        { en: "2.5 km", zh: "2.5 公里" },
        { en: "5 km", zh: "5 公里" },
        { en: "7 km", zh: "7 公里" },
        { en: "10 km", zh: "10 公里" }
      ],
      answer: "10 km",
      explanation: { en: `Distance ${math("= 5 \\times 2 = 10")} km.`, zh: `路程 ${math("= 5 \\times 2 = 10")} 公里。` }
    }
  ],
  "p6-pre-secondary-problem-solving": [
    {
      id: "pq-p6-pre-secondary-problem-solving-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "What is the best first step for a long word problem?", zh: "處理較長文字題時，最好先做甚麼？" },
      options: [
        { en: "Underline known facts and the question", zh: "在已知資料及題目所求之下畫線" },
        { en: "Draw a diagram from every number before deciding what the question asks", zh: "先把每個數字都畫成圖，之後才判斷題目所問" },
        { en: "Choose an operation from the first sentence and revise it if the result looks wrong", zh: "先按第一句選擇運算，若答案看來不對才修改" },
        { en: "Work backward from the last numerical value before checking the units", zh: "先從最後一個數值倒推，之後才檢查單位" }
      ],
      answer: "Underline known facts and the question",
      explanation: { en: "Underlining the known facts and the target separates relevant information from distractors and reveals the sequence of operations; choosing a representation or operation first can lock the solution into the wrong plan.", zh: "在已知資料及題目所求之下畫線，可把相關資料與干擾資料分開，並看出運算次序；若過早選擇圖示或運算，可能會把解題方向鎖定在錯誤方案。" }
    },
    {
      id: "pq-p6-pre-secondary-problem-solving-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A box has ${math("6")} rows of ${math("8")} tiles. ${math("10")} tiles are removed. How many remain?`, zh: `盒內有 ${math("6")} 行、每行 ${math("8")} 塊瓷磚，取走 ${math("10")} 塊，還剩多少塊？` },
      answer: "38",
      explanation: { en: `First find all tiles: ${math("6 \\times 8 = 48")}. Then ${math("48 - 10 = 38")}.`, zh: `先求總數：${math("6 \\times 8 = 48")}，再 ${math("48 - 10 = 38")}。` }
    }
  ]
};

const questionTopicTitleOverrides: Partial<Record<string, Question["topic"]>> = {
  "p2-length-data": { en: "Metres and Pictograms", zh: "米與象形圖" },
  "p4-large-numbers": { en: "Multiples, Factors, H.C.F. and L.C.M.", zh: "倍數、因數、最大公因數與最小公倍數" },
  "p4-angles": { en: "Quadrilateral Families and Shape Composition", zh: "四邊形類別與圖形拼砌" },
  "p5-rates": { en: "Unitary Method for Unit Price", zh: "歸一法求單價" },
  "p6-ratio-proportion": { en: "Averages and Broken-Line Graphs", zh: "平均數與折線圖" }
};

function questionTopicLabelForTopic(topic: (typeof topics)[number]): Question["topic"] {
  return questionTopicTitleOverrides[topic.id] ?? topic.title;
}

const primaryQuestions: HongKongQuestionSeed[] = topics.filter((topic) => topic.curriculumTrack === "HK").flatMap((topic) => {
  if (!topic.grade.startsWith("P")) return [];
  const blueprints = primaryQuestionBlueprints[topic.id] ?? [];
  return blueprints.map((blueprint) => ({
    ...blueprint,
    grade: topic.grade,
    topicId: topic.id,
    topic: questionTopicLabelForTopic(topic)
  }));
});

type TopicDrill = {
  firstStep: Question["prompt"];
  firstStepExplanation?: Question["explanation"];
  keyFactPrompt: Question["prompt"];
  keyFactAnswer: string;
  keyFactExplanation: Question["explanation"];
  examplePrompt: Question["prompt"];
  exampleAnswer: string;
  exampleExplanation: Question["explanation"];
  exampleDiagram?: Question["diagram"];
  guidedDifficulty?: Question["difficulty"];
  commonCheck: Question["prompt"];
  commonCheckExplanation?: Question["explanation"];
};

const adjudicatedGenericFirstStepTopicIds = new Set([
  "p3-multiplication-division",
  "p3-fractions-intro",
  "p3-measurement",
  "p3-geometry-patterns",
  "p4-large-numbers",
  "p4-decimals",
  "p4-perimeter-area",
  "p5-fractions-operations",
  "p5-rates",
  "p6-percentages",
  "p6-speed",
  "p6-pre-secondary-problem-solving",
  "integers",
  "algebra-basics",
  "angles",
  "ratios",
  "linear-equations",
  "coordinates",
  "transformations",
  "probability-s2",
  "polynomials",
  "identities-square-patterns",
  "trigonometry-basics",
  "arc-length-sector-area",
  "functions",
  "coordinate-geometry",
  "circles",
  "more-algebra",
  "data-handling",
  "advanced-functions",
  "trigonometry-s5",
  "probability-s5",
  "calculus",
  "statistics-s6",
  "exam-revision",
  "mixed-problem-solving"
]);

const adjudicatedGenericCommonCheckTopicIds = new Set([
  "integers",
  "algebra-basics",
  "linear-equations",
  "probability-s2",
  "trigonometry-basics",
  "arc-length-sector-area",
  "more-algebra",
  "advanced-functions",
  "trigonometry-s5",
  "probability-s5",
  "differentiation-intro",
  "statistics-s6",
  "mixed-problem-solving"
]);

const graphQuestionBlueprints: Record<string, QuestionBlueprint[]> = {
  "quadratic-patterns": [
    {
      id: "graph-quadratic-patterns-vertex",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "The graph shows a parabola. What is the vertex?", zh: "圖中顯示一條拋物線。頂點是甚麼？" },
      answer: "(1, -4)",
      acceptedAnswers: ["(1,-4)", "1, -4", "1,-4"],
      explanation: { en: `The lowest point on the parabola is ${math("(1, -4)")}, so that point is the vertex.`, zh: `拋物線的最低點是 ${math("(1, -4)")}，所以該點是頂點。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-2, 4],
        yRange: [-5, 5],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "vertex", label: "V", x: 1, y: -4 }
        ],
        lines: [
          {
            id: "quad-vertex",
            label: { en: "Parabola", zh: "拋物線" },
            points: [
              { x: -1, y: 0 },
              { x: 0, y: -3 },
              { x: 1, y: -4 },
              { x: 2, y: -3 },
              { x: 3, y: 0 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-quadratic-patterns-axis",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "Use the symmetry of the parabola. What is the axis of symmetry?", zh: "利用拋物線的對稱性。對稱軸是甚麼？" },
      answer: "x = -2",
      acceptedAnswers: ["x=-2"],
      explanation: { en: `Matching points are equally spaced from ${math("x = -2")}, and the vertex lies on this vertical line.`, zh: `對應點與 ${math("x = -2")} 的距離相同，而頂點亦在這條垂直線上。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-5, 2],
        yRange: [-2, 5],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "vertex", label: "V", x: -2, y: -1 }
        ],
        lines: [
          {
            id: "quad-axis",
            label: { en: "Parabola", zh: "拋物線" },
            points: [
              { x: -4, y: 3 },
              { x: -3, y: 0 },
              { x: -2, y: -1 },
              { x: -1, y: 0 },
              { x: 0, y: 3 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-quadratic-patterns-y-intercept",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "Where does the parabola meet the y-axis? Give the answer as an ordered pair.", zh: "拋物線在哪一點與 y 軸相交？答案須寫成有序數對。" },
      answer: "(0, -4)",
      acceptedAnswers: ["(0,-4)"],
      explanation: { en: `The graph crosses the ${math("y")}-axis when ${math("x = 0")}, at ${math("(0, -4)")}.`, zh: `圖像在 ${math("x = 0")} 時與 ${math("y")} 軸相交，交點是 ${math("(0, -4)")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-4, 4],
        yRange: [-5, 6],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "y-intercept", label: "Y", x: 0, y: -4 }
        ],
        lines: [
          {
            id: "quad-yint",
            label: { en: "Parabola", zh: "拋物線" },
            points: [
              { x: -3, y: 5 },
              { x: -2, y: 0 },
              { x: -1, y: -3 },
              { x: 0, y: -4 },
              { x: 1, y: -3 },
              { x: 2, y: 0 },
              { x: 3, y: 5 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-quadratic-patterns-roots",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "Read the graph. What are the two x-intercepts?", zh: "閱讀圖像。兩個 x 截距是甚麼？" },
      answer: "x = 1 and x = 3",
      acceptedAnswers: ["x=1 and x=3", "1 and 3", "1, 3", "1,3", "x = 1, x = 3", "x=1,x=3"],
      explanation: { en: `The parabola crosses the ${math("x")}-axis at ${math("x = 1")} and ${math("x = 3")}.`, zh: `拋物線在 ${math("x = 1")} 和 ${math("x = 3")} 與 ${math("x")} 軸相交。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [0, 4],
        yRange: [-2, 4],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "left-root", label: "A", x: 1, y: 0 },
          { id: "right-root", label: "B", x: 3, y: 0 }
        ],
        lines: [
          {
            id: "quad-roots",
            label: { en: "Parabola", zh: "拋物線" },
            points: [
              { x: 0, y: 3 },
              { x: 1, y: 0 },
              { x: 2, y: -1 },
              { x: 3, y: 0 },
              { x: 4, y: 3 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-quadratic-patterns-opening",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "Does this parabola open upward or downward?", zh: "這條拋物線開口向上還是向下？" },
      answer: "downward",
      acceptedAnswers: ["down", "opens downward", "downwards", "向下", "開口向下"],
      explanation: { en: "The vertex is the highest point and the arms go down on both sides, so the parabola opens downward.", zh: "頂點是最高點，兩邊向下延伸，所以拋物線開口向下。" },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-4, 4],
        yRange: [-6, 5],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "vertex", label: "V", x: 0, y: 4 }
        ],
        lines: [
          {
            id: "quad-opening",
            label: { en: "Parabola", zh: "拋物線" },
            points: [
              { x: -3, y: -5 },
              { x: -2, y: 0 },
              { x: -1, y: 3 },
              { x: 0, y: 4 },
              { x: 1, y: 3 },
              { x: 2, y: 0 },
              { x: 3, y: -5 }
            ]
          }
        ]
      }
    }
  ],
  coordinates: [
    {
      id: "graph-coordinates-read-point",
      difficulty: "Low",
      type: "graph",
      prompt: { en: "Read the coordinate of point C.", zh: "讀出點 C 的坐標。" },
      answer: "(-3, 2)",
      acceptedAnswers: ["(-3,2)", "-3, 2", "-3,2"],
      explanation: { en: `Point C is ${math("3")} units left of the origin and ${math("2")} units up, so it is ${math("(-3, 2)")}.`, zh: `點 C 在原點左方 ${math("3")} 格、上方 ${math("2")} 格，所以坐標是 ${math("(-3, 2)")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-5, 5],
        yRange: [-4, 4],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "point-c", label: "C", x: -3, y: 2 }
        ],
        lines: []
      }
    },
    {
      id: "graph-coordinates-quadrant",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "Which quadrant contains point P?", zh: "點 P 位於哪一象限？" },
      answer: "II",
      acceptedAnswers: ["2", "quadrant ii", "quadrant 2", "第二象限"],
      explanation: { en: `Point P has negative ${math("x")} and positive ${math("y")}, so it is in Quadrant II.`, zh: `點 P 的 ${math("x")} 坐標為負、${math("y")} 坐標為正，所以位於第二象限。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-5, 5],
        yRange: [-5, 5],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "point-p", label: "P", x: -4, y: 3 }
        ],
        lines: []
      }
    }
  ],
  functions: [
    {
      id: "graph-functions-read-output",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: `The graph shows ${math("y = f(x)")}. What is ${math("f(2)")}?`, zh: `圖像顯示 ${math("y = f(x)")}。${math("f(2)")} 是多少？` },
      answer: "5",
      explanation: { en: `At ${math("x = 2")}, the graph has ${math("y = 5")}.`, zh: `當 ${math("x = 2")} 時，圖像上的 ${math("y = 5")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-2, 3],
        yRange: [-2, 6],
        xAxisLabel: { en: "Input x", zh: "輸入 x" },
        yAxisLabel: { en: "Output f(x)", zh: "輸出 f(x)" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "output-point", label: "A", x: 2, y: 5 }
        ],
        lines: [
          {
            id: "func-output",
            label: { en: "Function f", zh: "函數 f" },
            points: [
              { x: -1, y: -1 },
              { x: 0, y: 1 },
              { x: 1, y: 3 },
              { x: 2, y: 5 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-functions-zero",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: `For the graph of ${math("y = f(x)")}, what value of ${math("x")} makes ${math("f(x)=0")}?`, zh: `對於 ${math("y = f(x)")} 的圖像，哪個 ${math("x")} 值令 ${math("f(x)=0")}？` },
      answer: "2",
      acceptedAnswers: ["x = 2", "x=2"],
      explanation: { en: `The graph meets the ${math("x")}-axis at ${math("x = 2")}.`, zh: `圖像在 ${math("x = 2")} 與 ${math("x")} 軸相交。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [0, 5],
        yRange: [-3, 3],
        xAxisLabel: { en: "Input x", zh: "輸入 x" },
        yAxisLabel: { en: "Output f(x)", zh: "輸出 f(x)" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "zero-point", label: "Z", x: 2, y: 0 }
        ],
        lines: [
          {
            id: "func-zero",
            label: { en: "Function f", zh: "函數 f" },
            points: [
              { x: 0, y: -2 },
              { x: 2, y: 0 },
              { x: 4, y: 2 }
            ]
          }
        ]
      }
    }
  ],
  "coordinate-geometry": [
    {
      id: "graph-coordinate-geometry-gradient",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "Line AB is shown. What is the gradient of AB?", zh: "圖中顯示直線 AB。AB 的斜率是多少？" },
      answer: "1/2",
      acceptedAnswers: ["0.5"],
      explanation: { en: `From A to B, the rise is ${math("2")} and the run is ${math("4")}, so the gradient is ${math("2/4 = 1/2")}.`, zh: `由 A 到 B，升幅是 ${math("2")}，橫距是 ${math("4")}，所以斜率是 ${math("2/4 = 1/2")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-2, 5],
        yRange: [0, 5],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "point-a", label: "A", x: -1, y: 2 },
          { id: "point-b", label: "B", x: 3, y: 4 }
        ],
        lines: [
          {
            id: "line-ab-gradient",
            label: { en: "Line AB", zh: "直線 AB" },
            points: [
              { x: -1, y: 2 },
              { x: 3, y: 4 }
            ]
          }
        ]
      }
    },
    {
      id: "graph-coordinate-geometry-midpoint",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "A and B are endpoints of a line segment. What is the midpoint?", zh: "A 和 B 是線段的端點。中點是甚麼？" },
      answer: "(1, 1)",
      acceptedAnswers: ["(1,1)", "1, 1", "1,1"],
      explanation: { en: `Average the coordinates: ${math("((-2+4)/2,(-1+3)/2)=(1,1)")}.`, zh: `坐標取平均：${math("((-2+4)/2,(-1+3)/2)=(1,1)")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-3, 5],
        yRange: [-2, 4],
        xAxisLabel: { en: "x-coordinate", zh: "x 坐標" },
        yAxisLabel: { en: "y-coordinate", zh: "y 坐標" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "point-a", label: "A", x: -2, y: -1 },
          { id: "point-b", label: "B", x: 4, y: 3 }
        ],
        lines: [
          {
            id: "segment-ab-mid",
            label: { en: "Segment AB", zh: "線段 AB" },
            points: [
              { x: -2, y: -1 },
              { x: 4, y: 3 }
            ]
          }
        ]
      }
    }
  ],
  "data-handling": [
    {
      id: "graph-data-handling-highest-value",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The line graph shows five quiz scores. What is the highest score?", zh: "折線圖顯示五次測驗分數。最高分是多少？" },
      answer: "8",
      explanation: { en: `The highest plotted point has ${math("y = 8")}.`, zh: `最高的點是 ${math("y = 8")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [0, 6],
        yRange: [0, 10],
        xAxisLabel: { en: "Quiz number", zh: "測驗次序" },
        yAxisLabel: { en: "Score", zh: "分數" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "score-high", label: "E", x: 4, y: 8 }
        ],
        lines: [
          {
            id: "quiz-scores",
            label: { en: "Quiz scores", zh: "測驗分數" },
            points: [
              { x: 1, y: 4 },
              { x: 2, y: 6 },
              { x: 3, y: 5 },
              { x: 4, y: 8 },
              { x: 5, y: 7 }
            ]
          }
        ]
      }
    }
  ],
  "p6-speed": [
    {
      id: "graph-p6-speed-distance",
      difficulty: "Medium",
      type: "graph",
      prompt: { en: "The distance-time graph shows a journey. How far had the student travelled after 2 hours?", zh: "距離-時間圖顯示一段旅程。2 小時後學生走了多遠？" },
      answer: "6 km",
      acceptedAnswers: ["6km", "6 km"],
      explanation: { en: `At ${math("2")} hours, the graph shows ${math("6")} km.`, zh: `在 ${math("2")} 小時時，圖像顯示 ${math("6")} 公里。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [0, 5],
        yRange: [0, 8],
        xAxisLabel: { en: "Time (hours)", zh: "時間（小時）" },
        yAxisLabel: { en: "Distance (km)", zh: "路程（公里）" },
        xTickInterval: 1,
        yTickInterval: 1,
        points: [
          { id: "time-2-point", label: "D", x: 2, y: 6 }
        ],
        lines: [
          {
            id: "journey-line",
            label: { en: "Journey", zh: "旅程" },
            points: [
              { x: 0, y: 0 },
              { x: 2, y: 6 },
              { x: 4, y: 6 }
            ]
          }
        ]
      }
    }
  ],
  angles: [
    {
      id: "graph-s1-angles-straight-line",
      difficulty: "Medium",
      type: "graph",
      prompt: {
        en: `In the figure, AOB is a straight line and ${math("\\angle AOC = 130^\\circ")}. Find the angle ${math("x")}.`,
        zh: `圖中 AOB 是直線，${math("\\angle AOC = 130^\\circ")}。求角 ${math("x")}。`
      },
      answer: "50°",
      acceptedAnswers: ["50 degrees", "50度"],
      explanation: {
        en: `Angles on a straight line add to ${math("180^\\circ")}, so ${math("x = 180 - 130 = 50^\\circ")}.`,
        zh: `直線上的鄰角和為 ${math("180^\\circ")}，所以 ${math("x = 180 - 130 = 50^\\circ")}。`
      },
      diagram: {
        kind: "plane-figure",
        points: [
          { id: "A", x: -4, y: 0, label: "A" },
          { id: "O", x: 0, y: 0, label: "O" },
          { id: "B", x: 4, y: 0, label: "B" },
          { id: "C", x: 2.25, y: 2.681, label: "C" }
        ],
        segments: [
          { from: "A", to: "B" },
          { from: "O", to: "C" }
        ],
        angleMarks: [
          { vertexId: "O", fromId: "A", toId: "C", label: { en: "130°", zh: "130°" } },
          { vertexId: "O", fromId: "C", toId: "B", arcs: 2, label: { en: "x", zh: "x" } }
        ]
      }
    }
  ],
  "p4-decimals": [
    {
      id: "graph-p4-decimals-number-line",
      difficulty: "Low",
      type: "graph",
      prompt: {
        en: "The number line shows point P between 3 and 4. Each small tick is 0.1. What decimal does P represent?",
        zh: "數線上點 P 在 3 和 4 之間，每小格是 0.1。P 代表哪個小數？"
      },
      answer: "3.7",
      explanation: {
        en: `Each tick is ${math("0.1")}. P is ${math("7")} ticks after ${math("3")}, so P ${math("= 3.7")}.`,
        zh: `每小格是 ${math("0.1")}。P 在 ${math("3")} 之後第 ${math("7")} 格，所以 P ${math("= 3.7")}。`
      },
      diagram: {
        kind: "number-line",
        range: [3, 4],
        tickInterval: 0.1,
        points: [
          { value: 3.7, label: "P" }
        ],
        semanticDisclosurePolicy: {
          kind: "ordinal-tick-position",
          pointLabel: "P",
          ordinalTickFromMinimum: 7,
          caption: {
            en: "Number line from 3 to 4 in intervals of 0.1. Point P is on the seventh small tick after 3.",
            zh: "數線由 3 至 4，每小格表示 0.1。點 P 位於 3 之後第七個小刻度。",
            zhHans: "数轴从 3 到 4，每小格表示 0.1。点 P 位于 3 之后第七个小刻度。"
          }
        }
      }
    }
  ],
  "p5-volume": [
    {
      id: "graph-p5-volume-cube",
      difficulty: "Medium",
      type: "graph",
      prompt: {
        en: "The figure labels the cube's edge length as 3 cm. Find its volume.",
        zh: "圖中標示正方體的稜長為 3 厘米。求它的體積。"
      },
      answer: "27 cm^3",
      explanation: {
        en: `Every edge of the cube is ${math("3")} cm, so the volume ${math("= 3 \\times 3 \\times 3 = 27")} cubic centimetres.`,
        zh: `正方體每條稜長都是 ${math("3")} 厘米，所以體積 ${math("= 3 \\times 3 \\times 3 = 27")} 立方厘米。`
      },
      diagram: {
        kind: "solid-figure",
        shape: "cube",
        size: 3,
        labels: {
          width: { en: "3 cm", zh: "3 厘米" }
        }
      }
    }
  ]
};

const graphQuestions: HongKongQuestionSeed[] = topics.filter((topic) => topic.curriculumTrack === "HK").flatMap((topic) => {
  const blueprints = graphQuestionBlueprints[topic.id] ?? [];
  return blueprints.map((blueprint) => ({
    ...blueprint,
    grade: topic.grade,
    topicId: topic.id,
    topic: questionTopicLabelForTopic(topic)
  }));
});

const topicDrills: Record<string, TopicDrill> = {
  "p1-counting-number-bonds": {
    firstStep: { en: "Count on or count back from the known number", zh: "由已知數開始順數或倒數" },
    keyFactPrompt: { en: `What number makes ${math("4 + \\square = 9")}?`, zh: `${math("4 + \\square = 9")} 中，方格應填甚麼數？` },
    keyFactAnswer: "5",
    keyFactExplanation: { en: `${math("4")} needs ${math("5")} more to make ${math("9")}.`, zh: `${math("4")} 再加 ${math("5")} 就是 ${math("9")}。` },
    examplePrompt: { en: `Write the number before ${math("16")}.`, zh: `寫出 ${math("16")} 之前的數。` },
    exampleAnswer: "15",
    exampleExplanation: { en: `Counting back one from ${math("16")} gives ${math("15")}.`, zh: `由 ${math("16")} 倒數一個是 ${math("15")}。` },
    commonCheck: { en: "Check whether the missing number is before or after the given number", zh: "檢查題目問的是前一個數、後一個數，還是缺少的數" }
  },
  "p1-addition-subtraction": {
    firstStep: { en: "Notice that Mia gets more stickers, then add 5 + 2", zh: "先辨認 Mia 的貼紙增加了，再計算 5 + 2" },
    firstStepExplanation: { en: `The words “gets ${math("2")} more” show an increase, so ${math("5+2=7")}.`, zh: `「再得到 ${math("2")} 張」表示數量增加，所以 ${math("5+2=7")}。` },
    keyFactPrompt: { en: `Liam has ${math("8")} pencils and gets ${math("3")} more. How many pencils does he have now?`, zh: `Liam 有 ${math("8")} 支鉛筆，又得到 ${math("3")} 支。現在共有多少支鉛筆？` },
    keyFactAnswer: "11",
    keyFactExplanation: { en: `${math("8 + 3 = 11")}.`, zh: `${math("8 + 3 = 11")}。` },
    examplePrompt: { en: `Find ${math("12 - 5")}.`, zh: `計算 ${math("12 - 5")}。` },
    exampleAnswer: "7",
    exampleExplanation: { en: `Counting back ${math("5")} from ${math("12")} gives ${math("7")}.`, zh: `由 ${math("12")} 倒數 ${math("5")} 得 ${math("7")}。` },
    commonCheck: { en: "Check the story action before choosing addition or subtraction", zh: "先檢查故事動作，再決定用加法還是減法" }
  },
  "p1-shapes-patterns": {
    firstStep: { en: "Identify AB as the shortest repeating unit", zh: "先找出最短重複單位 AB" },
    firstStepExplanation: { en: "AB repeats twice in ABAB, so AB is the shortest repeating unit.", zh: "AB 在 ABAB 中重複兩次，所以 AB 是最短重複單位。" },
    keyFactPrompt: { en: `How many sides does a square have?`, zh: `正方形有多少條邊？` },
    keyFactAnswer: "4",
    keyFactExplanation: { en: `A square has ${math("4")} equal sides.`, zh: `正方形有 ${math("4")} 條相等的邊。` },
    examplePrompt: { en: "Continue the pattern: triangle, circle, triangle, circle, ?", zh: "延續規律：三角形、圓形、三角形、圓形、？" },
    exampleAnswer: "triangle",
    exampleExplanation: { en: "The pattern repeats triangle then circle.", zh: "規律是三角形、圓形重複出現。" },
    commonCheck: { en: "Check one full repeat before choosing the next shape", zh: "先找出一組完整重複，再選下一個圖形" },
    commonCheckExplanation: {
      en: "In triangle, circle, triangle, circle, the complete repeat is triangle–circle. Checking that full repeat shows that the next shape is a triangle; a fact about the sides of a square would not test this pattern.",
      zh: "在三角形、圓形、三角形、圓形的圖樣中，完整重複單位是「三角形—圓形」。核對這組完整重複便可知道下一個圖形是三角形；正方形邊數的知識並不能檢查這個規律。"
    }
  },
  "p1-measurement-time": {
    firstStep: { en: "Read the minute hand, then the hour hand", zh: "先讀分針，再讀時針" },
    firstStepExplanation: { en: `The minute hand at ${math("6")} means ${math("30")} minutes, and the hour hand is between ${math("3")} and ${math("4")}, so the time is ${math("3{:}30")}.`, zh: `分針指向 ${math("6")} 表示 ${math("30")} 分鐘，時針在 ${math("3")} 和 ${math("4")} 之間，所以時間是 ${math("3{:}30")}。` },
    keyFactPrompt: { en: `A clock shows the minute hand at ${math("6")} and the hour hand halfway between ${math("3")} and ${math("4")}. What time is it?`, zh: `鐘面上的分針指向 ${math("6")}，時針在 ${math("3")} 和 ${math("4")} 的正中間。現在是甚麼時間？` },
    keyFactAnswer: "3:30",
    keyFactExplanation: { en: `The minute hand at ${math("6")} shows half past, and the hour hand has passed ${math("3")}, so the time is ${math("3{:}30")}.`, zh: `分針指向 ${math("6")} 表示半小時，時針已過 ${math("3")}，所以是 ${math("3{:}30")}。` },
    examplePrompt: { en: `What time is shown by a clock with the hour hand at ${math("5")} and the minute hand at ${math("12")}?`, zh: `時針指向 ${math("5")}、分針指向 ${math("12")} 是甚麼時間？` },
    exampleAnswer: "5 o'clock",
    exampleExplanation: { en: `The minute hand at ${math("12")} shows an o'clock time, so it is 5 o'clock.`, zh: `分針指向 ${math("12")} 表示整點，所以是 5 時。` },
    commonCheck: { en: "Check the unit or clock hand before answering", zh: "作答前先檢查單位或鐘面指針" }
  },
  "p2-place-value": {
    firstStep: { en: "Read hundreds, tens, and ones in order", zh: "按百位、十位、個位順序讀數" },
    firstStepExplanation: { en: `${math("507")} has ${math("5")} hundreds, ${math("0")} tens, and ${math("7")} ones, so reading the places in order gives five hundred and seven.`, zh: `${math("507")} 有 ${math("5")} 個百、${math("0")} 個十和 ${math("7")} 個一，按位值順序讀作五百零七。` },
    keyFactPrompt: { en: `In ${math("735")}, what digit is in the hundreds place?`, zh: `在 ${math("735")} 中，百位數字是甚麼？` },
    keyFactAnswer: "7",
    keyFactExplanation: { en: `${math("735")} has ${math("7")} hundreds.`, zh: `${math("735")} 有 ${math("7")} 個百。` },
    examplePrompt: { en: `Write ${math("500 + 20 + 9")} as one number.`, zh: `把 ${math("500 + 20 + 9")} 寫成一個數。` },
    exampleAnswer: "529",
    exampleExplanation: { en: `${math("500 + 20 + 9 = 529")}.`, zh: `${math("500 + 20 + 9 = 529")}。` },
    commonCheck: { en: "Check that each digit is placed in the correct place value", zh: "檢查每個數字是否放在正確位值" }
  },
  "p2-multiplication-foundations": {
    firstStep: { en: "Identify 5 equal groups of 2, then write 5 × 2", zh: "先辨認 5 組、每組 2 個，再寫 5 × 2" },
    firstStepExplanation: { en: `${math("5\\times2")} means ${math("5")} equal groups of ${math("2")}, so the model contains ${math("10")} objects.`, zh: `${math("5\\times2")} 表示 ${math("5")} 組、每組 ${math("2")} 個，所以模型共有 ${math("10")} 個物件。` },
    keyFactPrompt: { en: `Which multiplication expression matches ${math("6 + 6 + 6 + 6")}?`, zh: `哪個乘式表示 ${math("6 + 6 + 6 + 6")}？` },
    keyFactAnswer: "4 × 6",
    keyFactExplanation: { en: `${math("6")} is added ${math("4")} times, so it is ${math("4 \\times 6")}.`, zh: `${math("6")} 加了 ${math("4")} 次，所以是 ${math("4 \\times 6")}。` },
    examplePrompt: { en: `Find ${math("3 \\times 4")}.`, zh: `計算 ${math("3 \\times 4")}。` },
    exampleAnswer: "12",
    exampleExplanation: { en: `${math("3 \\times 4 = 12")}.`, zh: `${math("3 \\times 4 = 12")}。` },
    commonCheck: { en: "Check the size of each group and the number of groups", zh: "檢查每組數量和組數" }
  },
  "p2-money-time": {
    firstStep: { en: "Identify the price and the amount paid", zh: "先辨認價錢和付款金額" },
    firstStepExplanation: { en: `The price is HK$${math("6")} and the amount paid is HK$${math("10")}; subtract to find the change: HK$${math("10-6=4")}.`, zh: `價錢是港幣 ${math("6")} 元，付款金額是港幣 ${math("10")} 元；相減可得找續：港幣 ${math("10-6=4")} 元。` },
    keyFactPrompt: { en: "A drink costs HK$6. You pay HK$10. How much change do you get?", zh: "飲品售港幣 6 元，你付港幣 10 元，應找回多少？" },
    keyFactAnswer: "HK$4",
    keyFactExplanation: { en: `${math("10 - 6 = 4")}.`, zh: `${math("10 - 6 = 4")}。` },
    examplePrompt: { en: `Half an hour after ${math("2:30")} is what time?`, zh: `${math("2:30")} 之後半小時是甚麼時間？` },
    exampleAnswer: "3:00",
    exampleExplanation: { en: `Adding ${math("30")} minutes to ${math("2:30")} gives ${math("3:00")}.`, zh: `${math("2:30")} 加 ${math("30")} 分鐘是 ${math("3:00")}。` },
    commonCheck: { en: "Check whether the answer should be money or time", zh: "檢查答案應是金錢還是時間" }
  },
  "p2-length-data": {
    firstStep: { en: "Choose metres for estimating the door height", zh: "估計門的高度時選用米" },
    firstStepExplanation: { en: "A classroom door is tall enough for metres to be the suitable unit; estimate first, then check with a metre rule or tape.", zh: "課室門的高度適合用米表示；先作估計，再用米尺或捲尺量度核對。" },
    keyFactPrompt: { en: `A classroom door is about ${math("2")} m tall, not ${math("2")} cm. Which estimate uses the suitable unit?`, zh: `課室門的高度約是 ${math("2")} 米，而不是 ${math("2")} 厘米。哪個估計使用合適單位？` },
    keyFactAnswer: "2 m",
    keyFactExplanation: { en: "A door is tall enough for metres to be the suitable unit; estimate first and then measure it with a metre rule or tape.", zh: "課室門的高度適合用米表示；應先估計，再用米尺或捲尺實際量度。" },
    examplePrompt: { en: `A ribbon measures ${math("110")} cm. Write the same length using metres and centimetres, without a decimal.`, zh: `一條絲帶長 ${math("110")} 厘米。不用小數，以米和厘米寫出相同長度。` },
    exampleAnswer: "1 m 10 cm",
    exampleExplanation: { en: `Since ${math("1\\text{ m}=100\\text{ cm}")}, ${math("110\\text{ cm}=1\\text{ m }10\\text{ cm}")}.`, zh: `因為 ${math("1\\text{ 米}=100\\text{ 厘米}")}，所以 ${math("110\\text{ 厘米}=1\\text{ 米 }10\\text{ 厘米}")}。` },
    commonCheck: { en: "Use 1 m = 100 cm and keep every pictogram key at one icon for one object", zh: "使用 1 米 = 100 厘米，並確保象形圖每個圖示只代表一件物件" },
    commonCheckExplanation: {
      en: `For length, ${math("1\\text{ m}=100\\text{ cm}")}, so ${math("110\\text{ cm}=1\\text{ m }10\\text{ cm}")}. For a one-to-one pictogram, a key of one icon for one object means four icons represent four objects; the key must stay unchanged throughout the chart.`,
      zh: `長度方面，${math("1\\text{ 米}=100\\text{ 厘米}")}，所以 ${math("110\\text{ 厘米}=1\\text{ 米 }10\\text{ 厘米}")}。一一對應的象形圖若規定一個圖示代表一件物件，四個圖示便代表四件物件，而且整幅圖必須使用同一圖例。`
    }
  },
  "p3-multiplication-division": {
    firstStep: { en: "Decide whether the situation needs multi-digit multiplication, sharing, or grouping", zh: "先判斷情境需要多位數乘法、平均分還是分組" },
    keyFactPrompt: { en: `Find ${math("206 \\times 4")}.`, zh: `計算 ${math("206 \\times 4")}。` },
    keyFactAnswer: "824",
    keyFactExplanation: { en: `${math("4 \\times 200=800")} and ${math("4 \\times 6=24")}, so the total is ${math("824")}.`, zh: `${math("4 \\times 200=800")} 而 ${math("4 \\times 6=24")}，所以合共是 ${math("824")}。` },
    examplePrompt: { en: `${math("47")} cards are shared equally among ${math("4")} pupils. How many cards does each pupil get, and how many remain?`, zh: `把 ${math("47")} 張卡平均分給 ${math("4")} 位同學。每人有多少張，餘下多少張？` },
    exampleAnswer: "11 each, 3 remain",
    exampleExplanation: { en: `${math("47=4 \\times 11+3")}, so each pupil gets ${math("11")} cards and ${math("3")} remain.`, zh: `${math("47=4 \\times 11+3")}，所以每人有 ${math("11")} 張，餘下 ${math("3")} 張。` },
    commonCheck: { en: "Check whether a remainder is smaller than the divisor", zh: "檢查餘數是否小於除數" }
  },
  "p3-fractions-intro": {
    firstStep: { en: "Identify the number of equal parts first", zh: "先辨認一共分成多少等份" },
    keyFactPrompt: { en: `Which fraction means one out of three equal parts?`, zh: `哪個分數表示三等份中的一份？` },
    keyFactAnswer: "1/3",
    keyFactExplanation: { en: `${math("1/3")} means one of three equal parts.`, zh: `${math("1/3")} 表示三等份中的一份。` },
    examplePrompt: { en: `Write an equivalent fraction for ${math("2/3")} with denominator ${math("6")}.`, zh: `寫出一個與 ${math("2/3")} 等值而分母為 ${math("6")} 的分數。` },
    exampleAnswer: "4/6",
    exampleExplanation: { en: `Multiply numerator and denominator by ${math("2")}: ${math("2/3 = 4/6")}.`, zh: `分子和分母同乘 ${math("2")}：${math("2/3 = 4/6")}。` },
    commonCheck: { en: "Check that the denominator names the equal parts", zh: "檢查分母是否表示等份總數" }
  },
  "p3-measurement": {
    firstStep: { en: "Read the measuring unit or bar-chart scale before calculating", zh: "計算前先讀清楚量度單位或棒形圖刻度" },
    keyFactPrompt: { en: `A jug has ${math("2")} L of water. That is how many mL?`, zh: `一個水壺有 ${math("2")} 升水，即是多少毫升？` },
    keyFactAnswer: "2000 mL",
    keyFactExplanation: { en: `${math("1")} L ${math("= 1000")} mL, so ${math("2")} L ${math("= 2000")} mL.`, zh: `${math("1")} 升 ${math("= 1000")} 毫升，所以 ${math("2")} 升 ${math("= 2000")} 毫升。` },
    examplePrompt: { en: `A blue strip is ${math("35")} cm long and a red strip is ${math("20")} cm long. What is their total length?`, zh: `藍色紙條長 ${math("35")} 厘米，紅色紙條長 ${math("20")} 厘米。總長是多少？` },
    exampleAnswer: "55 cm",
    exampleExplanation: { en: `${math("35 + 20 = 55")} cm.`, zh: `${math("35 + 20 = 55")} 厘米。` },
    commonCheck: { en: "Check whether units need converting before calculating", zh: "計算前檢查是否需要換算單位" }
  },
  "p3-geometry-patterns": {
    firstStep: { en: "Count the sides, then compare equal or parallel sides before naming the shape", zh: "先數邊數，再比較相等邊或平行邊，然後為圖形命名" },
    keyFactPrompt: { en: "A closed plane figure has four straight sides. Which shape family does it belong to?", zh: "一個封閉平面圖形有四條直邊。它屬於哪一類圖形？" },
    keyFactAnswer: "quadrilateral",
    keyFactExplanation: { en: "Every closed plane figure with four straight sides is a quadrilateral.", zh: "任何有四條直邊的封閉平面圖形都是四邊形。" },
    examplePrompt: { en: "A triangle has three equal sides. What kind of triangle is it?", zh: "一個三角形有三條相等的邊。它是哪一種三角形？" },
    exampleAnswer: "equilateral triangle",
    exampleExplanation: { en: "A triangle with all three sides equal is an equilateral triangle.", zh: "三條邊全部相等的三角形是等邊三角形。" },
    commonCheck: { en: "Check that the figure is closed and count its straight sides before naming it", zh: "為圖形命名前，先檢查它是否封閉，並數清楚直邊數目" }
  },
  "p4-large-numbers": {
    firstStep: { en: "Decide whether to list factors or multiples, then work systematically", zh: "先判斷要列出因數還是倍數，再有系統地處理" },
    keyFactPrompt: { en: `Write the first three positive multiples of ${math("7")} in increasing order.`, zh: `按由小至大寫出 ${math("7")} 的首三個正倍數。` },
    keyFactAnswer: "7, 14, 21",
    keyFactExplanation: { en: `Multiply ${math("7")} by ${math("1")}, ${math("2")}, and ${math("3")}: ${math("7,14,21")}.`, zh: `把 ${math("7")} 分別乘 ${math("1")}、${math("2")} 和 ${math("3")}，得 ${math("7,14,21")}。` },
    examplePrompt: { en: `For ${math("12")} and ${math("18")}, give both the H.C.F. and the L.C.M.`, zh: `求 ${math("12")} 和 ${math("18")} 的最大公因數及最小公倍數。` },
    exampleAnswer: "HCF = 6; LCM = 36",
    exampleExplanation: { en: `The common factors are ${math("1,2,3,6")}, so the H.C.F. is ${math("6")}. Listing multiples shows that ${math("36")} is the first common multiple, so the L.C.M. is ${math("36")}.`, zh: `公因數是 ${math("1,2,3,6")}，所以最大公因數是 ${math("6")}；列出倍數可見 ${math("36")} 是首個公倍數，所以最小公倍數是 ${math("36")}。` },
    commonCheck: { en: "Verify that every factor leaves remainder 0 and every common result works for both numbers", zh: "檢查每個因數都能整除而餘數為 0，並核對公因數或公倍數同時適用於兩個數" }
  },
  "p4-decimals": {
    firstStep: { en: "Line up decimal places before comparing or calculating", zh: "比較或計算前先對齊小數位" },
    keyFactPrompt: { en: `Which decimal is greater: ${math("0.47")} or ${math("0.5")}?`, zh: `${math("0.47")} 和 ${math("0.5")}，哪個小數較大？` },
    keyFactAnswer: "0.5",
    keyFactExplanation: { en: `${math("0.5 = 0.50")}, and ${math("0.50 > 0.47")}.`, zh: `${math("0.5 = 0.50")}，而 ${math("0.50 > 0.47")}。` },
    examplePrompt: { en: `Find ${math("4.6 - 1.2")}.`, zh: `計算 ${math("4.6 - 1.2")}。` },
    exampleAnswer: "3.4",
    exampleExplanation: { en: `${math("4.6 - 1.2 = 3.4")}.`, zh: `${math("4.6 - 1.2 = 3.4")}。` },
    commonCheck: { en: "Keep the decimal point aligned in every step", zh: "每一步都要對齊小數點" }
  },
  "p4-angles": {
    firstStep: { en: "Identify the quadrilateral's side relationships before choosing a family name", zh: "選擇四邊形類別前，先辨認各邊的關係" },
    keyFactPrompt: { en: "Name the two families that every square belongs to in addition to the parallelogram family.", zh: "除平行四邊形外，每個正方形還屬於哪兩個類別？" },
    keyFactAnswer: "rectangle and rhombus",
    keyFactExplanation: { en: "Every square is both a rectangle and a rhombus; this inclusion does not make every rectangle or every rhombus a square.", zh: "每個正方形同時是長方形和菱形；這項包含關係不表示每個長方形或每個菱形都是正方形。" },
    examplePrompt: { en: "A parallelogram has four equal sides. What more specific quadrilateral family must it belong to?", zh: "一個平行四邊形有四條相等的邊。它必定屬於哪個較具體的四邊形類別？" },
    exampleAnswer: "rhombus",
    exampleExplanation: { en: "A parallelogram with four equal sides is a rhombus, but the given side information alone does not prove it is a square.", zh: "四條邊相等的平行四邊形是菱形，但單憑已知的邊資料不能證明它是正方形。" },
    commonCheck: { en: "Check the direction of each family inclusion and do not assume its converse", zh: "檢查各類別包含關係的方向，不要擅自把關係逆轉" }
  },
  "p4-perimeter-area": {
    firstStep: { en: "Decide whether the question asks for boundary or surface", zh: "先判斷題目問周界還是面積" },
    keyFactPrompt: { en: `A square has side length ${math("6")} cm. Find its perimeter.`, zh: `正方形邊長 ${math("6")} 厘米。求周界。` },
    keyFactAnswer: "24 cm",
    keyFactExplanation: { en: `Perimeter ${math("= 4 \\times 6 = 24")} cm.`, zh: `周界 ${math("= 4 \\times 6 = 24")} 厘米。` },
    examplePrompt: { en: `An L-shaped figure is formed from a ${math("6")} cm by ${math("4")} cm rectangle with a ${math("3")} cm by ${math("2")} cm rectangle removed from its top-right corner. Find the remaining area.`, zh: `一個 L 形圖形由一個長 ${math("6")} 厘米、闊 ${math("4")} 厘米的長方形，在右上角移去一個長 ${math("3")} 厘米、闊 ${math("2")} 厘米的長方形而成。求餘下面積。` },
    exampleAnswer: "18 cm^2",
    exampleExplanation: { en: `Split the composite rectilinear shape by subtracting the missing rectangle: ${math("6\\times4-3\\times2=24-6=18")} square centimetres.`, zh: `把組合直線圖形分拆並減去缺少的長方形：${math("6\\times4-3\\times2=24-6=18")} 平方厘米。` },
    exampleDiagram: {
      kind: "plane-figure",
      points: [
        { id: "A", x: 0, y: 0, label: "A" },
        { id: "B", x: 6, y: 0, label: "B" },
        { id: "C", x: 6, y: 2, label: "C" },
        { id: "D", x: 3, y: 2, label: "D" },
        { id: "E", x: 3, y: 4, label: "E" },
        { id: "F", x: 0, y: 4, label: "F" }
      ],
      segments: [
        { from: "A", to: "B", label: { en: "6 cm", zh: "6 厘米" } },
        { from: "B", to: "C" },
        { from: "C", to: "D", label: { en: "3 cm", zh: "3 厘米" } },
        { from: "D", to: "E", label: { en: "2 cm", zh: "2 厘米" } },
        { from: "E", to: "F" },
        { from: "A", to: "F" }
      ],
      polygons: [{ vertexIds: ["A", "B", "C", "D", "E", "F"] }]
    },
    commonCheck: { en: "Use linear units for perimeter and square units for area", zh: "周界用長度單位，面積用平方單位" }
  },
  "p6-percentages": {
    firstStep: { en: "Identify the original amount and find the given percentage of it", zh: "先找出原來數量，再求題目所給百分數所代表的數量" },
    keyFactPrompt: { en: `What is ${math("25\\%")} of ${math("120")}?`, zh: `${math("120")} 的 ${math("25\\%")} 是多少？` },
    keyFactAnswer: "30",
    keyFactExplanation: { en: `${math("25\\%")} is one quarter, and ${math("120 \\div 4 = 30")}.`, zh: `${math("25\\%")} 是四分之一，而 ${math("120 \\div 4 = 30")}。` },
    examplePrompt: { en: `A collection has ${math("60")} cards and increases by ${math("25\\%")} of the original amount. How many cards are there now?`, zh: `一組卡片原有 ${math("60")} 張，現增加原數量的 ${math("25\\%")}。現有多少張卡片？` },
    exampleAnswer: "75",
    exampleExplanation: { en: `${math("25\\%")} of ${math("60")} is ${math("15")}; an increase gives ${math("60+15=75")}.`, zh: `${math("60")} 的 ${math("25\\%")} 是 ${math("15")}；增加後有 ${math("60+15=75")} 張。` },
    commonCheck: { en: "Add the percentage amount for an increase and subtract it for a decrease", zh: "增加時加上百分數所代表的數量，減少時則把它減去" }
  },
  "p6-ratio-proportion": {
    firstStep: {
      en: "For a mean, divide the total by the number of data values; for a broken-line graph, read the axis labels, scales, units, and data order first",
      zh: "求平均數時用總和除以數據個數；閱讀折線圖時先看坐標軸標籤、刻度、單位和數據次序"
    },
    firstStepExplanation: {
      en: "For 6, 8, 10, the mean is (6 + 8 + 10) ÷ 3 = 8. On a broken-line graph, the axis labels, scales, units, and point order determine what each segment represents.",
      zh: "對 6、8、10，平均數是（6 + 8 + 10）÷ 3 = 8。閱讀折線圖時，坐標軸標籤、刻度、單位和各點次序決定每條線段所表示的意思。"
    },
    keyFactPrompt: { en: `The three values are ${math("6")}, ${math("8")}, and ${math("10")}. What is their mean?`, zh: `三個數值是 ${math("6")}、${math("8")} 和 ${math("10")}。它們的平均數是多少？` },
    keyFactAnswer: "8",
    keyFactExplanation: { en: `Mean ${math("=")} total ${math("\\div")} count ${math("=(6+8+10)\\div3=8")}.`, zh: `平均數 ${math("=")} 總和 ${math("\\div")} 數據個數 ${math("=(6+8+10)\\div3=8")}。` },
    examplePrompt: { en: `${math("45")} counters are shared fairly among ${math("5")} students. What is the mean number of counters per student?`, zh: `把 ${math("45")} 粒計數珠公平分給 ${math("5")} 名學生。平均每人有多少粒？` },
    exampleAnswer: "9",
    exampleExplanation: { en: `The mean is the fair share: total ${math("45")} divided by count ${math("5")}, so ${math("45\\div5=9")}.`, zh: `平均數就是公平分配所得：用總數 ${math("45")} 除以項數 ${math("5")}，得 ${math("45\\div5=9")}。` },
    commonCheck: { en: "Verify total and count for a mean, and preserve the ordered sequence and axis units on a broken-line graph", zh: "求平均數時核對總和與項數；閱讀折線圖時保留有序時序及坐標軸單位" },
    commonCheckExplanation: {
      en: `For a mean, check both the total and the number of values, as in ${math("(6+8+10)\\div3=8")}. On a broken-line graph, follow the points in the stated time order and read the labelled axis unit; for example, the point at ${math("11{:}00")} represents ${math("24")}${math("^\\circ\\text{C}")}, not an unlabelled 24.`,
      zh: `求平均數時要同時核對總和與數據個數，例如 ${math("(6+8+10)\\div3=8")}。閱讀折線圖時要按題目所列時序追蹤各點，並讀取坐標軸標示的單位；例如 ${math("11{:}00")} 的點表示 ${math("24")}${math("^\\circ\\text{C}")}，不是沒有單位的 24。`
    }
  },
  "p6-speed": {
    firstStep: { en: "Identify distance, time, and speed before choosing the formula", zh: "先辨認路程、時間和速率，再選公式" },
    keyFactPrompt: { en: `A bus travels ${math("120")} km in ${math("2")} hours. Find its speed.`, zh: `巴士 ${math("2")} 小時行 ${math("120")} 公里。求速率。` },
    keyFactAnswer: "60 km/h",
    keyFactExplanation: { en: `Speed ${math("= 120 \\div 2 = 60")} km/h.`, zh: `速率 ${math("= 120 \\div 2 = 60")} 公里每小時。` },
    examplePrompt: { en: `At ${math("6")} km/h, how far do you walk in ${math("3")} hours?`, zh: `以每小時 ${math("6")} 公里步行 ${math("3")} 小時，路程是多少？` },
    exampleAnswer: "18 km",
    exampleExplanation: { en: `Distance ${math("= 6 \\times 3 = 18")} km.`, zh: `路程 ${math("= 6 \\times 3 = 18")} 公里。` },
    commonCheck: { en: "Check whether to divide or multiply using the units", zh: "按單位檢查應除還是乘" }
  },
  "p6-pre-secondary-problem-solving": {
    firstStep: { en: "Break the problem into facts, operations, and final target", zh: "把題目拆成已知資料、運算和最終目標" },
    keyFactPrompt: { en: `A club buys ${math("4")} packs of ${math("6")} badges and gives away ${math("9")} badges. How many badges remain?`, zh: `學會買了 ${math("4")} 包徽章，每包 ${math("6")} 個，送出 ${math("9")} 個。還剩多少個徽章？` },
    keyFactAnswer: "15",
    keyFactExplanation: { en: `First ${math("4 \\times 6 = 24")}, then ${math("24 - 9 = 15")}.`, zh: `先算 ${math("4 \\times 6 = 24")}，再算 ${math("24 - 9 = 15")}。` },
    examplePrompt: { en: `A seating plan shows ${math("5")} equal rows with ${math("7")} seats in each row. A note says ${math("8")} extra seats are added, but ${math("6")} seats are unavailable. How many usable seats are there?`, zh: `座位圖顯示有 ${math("5")} 行相同座位，每行 ${math("7")} 個。備註指出另加 ${math("8")} 個座位，但其中 ${math("6")} 個座位不能使用。共有多少個可用座位？` },
    exampleAnswer: "37",
    exampleExplanation: { en: `Translate the row diagram into ${math("5\\times7=35")}, then use the note: ${math("35+8-6=37")} usable seats.`, zh: `先把行列圖表示成 ${math("5\\times7=35")}，再運用備註：${math("35+8-6=37")}，所以有 ${math("37")} 個可用座位。` },
    commonCheck: { en: "Check that every step answers the final question, not just an intermediate value", zh: "檢查每一步是否通向最終問題，而不只是中途數值" }
  },
  integers: {
    firstStep: { en: "Mark zero and the direction of movement on the number line", zh: "先標示零點和數線移動方向" },
    keyFactPrompt: { en: `What is ${math("-6 + 9")}?`, zh: `${math("-6 + 9")} 是多少？` },
    keyFactAnswer: "3",
    keyFactExplanation: { en: `Move ${math("9")} steps right from ${math("-6")} to reach ${math("3")}.`, zh: `由 ${math("-6")} 向右移 ${math("9")} 格到達 ${math("3")}。` },
    examplePrompt: { en: `What is ${math("-4 - 7")}?`, zh: `${math("-4 - 7")} 是多少？` },
    exampleAnswer: "-11",
    exampleExplanation: { en: `Subtracting ${math("7")} moves ${math("7")} steps left from ${math("-4")}.`, zh: `減 ${math("7")} 即由 ${math("-4")} 向左移 ${math("7")} 格。` },
    commonCheck: { en: "Check whether the operation moves left or right before calculating", zh: "計算前先檢查運算代表向左還是向右移" }
  },
  "algebra-basics": {
    firstStep: { en: "Identify variables and collect like terms", zh: "先辨認變量並合併同類項" },
    keyFactPrompt: { en: `Simplify ${math("4a + 3a")}.`, zh: `化簡 ${math("4a + 3a")}。` },
    keyFactAnswer: "7a",
    keyFactExplanation: { en: `The coefficients add: ${math("4a + 3a = 7a")}.`, zh: `同類項的係數相加：${math("4a + 3a = 7a")}。` },
    examplePrompt: { en: `Substitute ${math("x = 2")} into ${math("3x + 1")}.`, zh: `把 ${math("x = 2")} 代入 ${math("3x + 1")}。` },
    exampleAnswer: "7",
    exampleExplanation: { en: `${math("3(2) + 1 = 7")}.`, zh: `${math("3(2) + 1 = 7")}。` },
    commonCheck: { en: "Only combine terms with the same variable part", zh: "只合併變量部分相同的項" }
  },
  angles: {
    firstStep: { en: "Name the angle fact used by the line, point, triangle, or parallel lines", zh: "先說明使用直線、一點、三角形或平行線的角度性質" },
    keyFactPrompt: { en: `Angles in a triangle add to how many degrees?`, zh: `三角形內角和是多少度？` },
    keyFactAnswer: "180°",
    keyFactExplanation: { en: `The interior angles of any triangle add to ${math("180^\\circ")}.`, zh: `任何三角形的內角和都是 ${math("180^\\circ")}。` },
    examplePrompt: { en: `A triangle has angles ${math("50^\\circ")} and ${math("70^\\circ")}. Find the third angle.`, zh: `三角形兩角為 ${math("50^\\circ")} 和 ${math("70^\\circ")}。求第三角。` },
    exampleAnswer: "60°",
    exampleExplanation: { en: `${math("180 - 50 - 70 = 60")}.`, zh: `${math("180 - 50 - 70 = 60")}。` },
    commonCheck: { en: "Write the angle-sum reason before the arithmetic", zh: "計算前先寫出角和理由" }
  },
  ratios: {
    firstStep: { en: "Add the ratio parts before sharing a total", zh: "分配總量前先加總比的份數" },
    keyFactPrompt: { en: `How many total parts are in the ratio ${math("3:5")}?`, zh: `比 ${math("3:5")} 共有多少份？` },
    keyFactAnswer: "8",
    keyFactExplanation: { en: `${math("3 + 5 = 8")} total parts.`, zh: `總份數為 ${math("3 + 5 = 8")}。` },
    examplePrompt: { en: `Share ${math("40")} in the ratio ${math("3:5")}. What is the smaller share?`, zh: `把 ${math("40")} 按 ${math("3:5")} 分配。較小的一份是多少？` },
    exampleAnswer: "15",
    exampleExplanation: { en: `One part is ${math("40 / 8 = 5")}; the smaller share is ${math("3 \\times 5 = 15")}.`, zh: `每份是 ${math("40 / 8 = 5")}；較小份是 ${math("3 \\times 5 = 15")}。` },
    commonCheck: { en: "Keep the same multiplier on every part", zh: "每一份都要使用同一倍數" },
    commonCheckExplanation: {
      en: "When scaling a ratio, every term must use the same multiplier. For 3:5, multiplying both terms by the one-part value 5 gives shares 15:25, which still has ratio 3:5.",
      zh: "縮放一個比時，每一項都必須使用同一倍數。對 3:5，把兩項同乘每份的數值 5，得 15:25，所得比仍是 3:5。"
    }
  },
  "statistics-s1": {
    firstStep: {
      en: "Identify whether the question asks for a measure of centre or spread; order the data when finding the median",
      zh: "先辨認題目要求集中趨勢還是離散程度；求中位數時把數據排序"
    },
    firstStepExplanation: {
      en: "The range is a measure of spread, not an average: 12 − 3 = 9. For the median, order the data before selecting the middle value.",
      zh: "全距是離散程度的量度，不是平均數：12 − 3 = 9。求中位數時，先把數據排序，再找中間值。"
    },
    keyFactPrompt: { en: `Find the range of ${math("3, 8, 10, 12")}.`, zh: `求 ${math("3, 8, 10, 12")} 的全距。` },
    keyFactAnswer: "9",
    keyFactExplanation: { en: `Range is highest minus lowest: ${math("12 - 3 = 9")}.`, zh: `全距是最大值減最小值：${math("12 - 3 = 9")}。` },
    examplePrompt: { en: `Find the median of ${math("2, 9, 5")}.`, zh: `求 ${math("2, 9, 5")} 的中位數。` },
    exampleAnswer: "5",
    exampleExplanation: { en: `Order the data as ${math("2, 5, 9")}; the middle value is ${math("5")}.`, zh: `排序為 ${math("2, 5, 9")}；中間值是 ${math("5")}。` },
    commonCheck: { en: "Sort the data before finding the median", zh: "求中位數前必須先排序" },
    commonCheckExplanation: {
      en: "Sort the data first: 2, 5, 9. The middle value is then 5, so the median is 5.",
      zh: "先把數據排序為 2、5、9。中間值是 5，所以中位數是 5。"
    }
  },
  "linear-equations": {
    firstStep: { en: "Undo operations in reverse order while keeping both sides balanced", zh: "按相反次序消去運算，並保持兩邊平衡" },
    keyFactPrompt: { en: `Solve ${math("x + 7 = 12")}.`, zh: `解 ${math("x + 7 = 12")}。` },
    keyFactAnswer: "5",
    keyFactExplanation: { en: `Subtract ${math("7")} from both sides.`, zh: `兩邊同減 ${math("7")}。` },
    examplePrompt: { en: `Solve ${math("3x = 18")}.`, zh: `解 ${math("3x = 18")}。` },
    exampleAnswer: "6",
    exampleExplanation: { en: `Divide both sides by ${math("3")}.`, zh: `兩邊同除以 ${math("3")}。` },
    commonCheck: { en: "Do the same operation to both sides of the equation", zh: "方程兩邊要做相同運算" }
  },
  coordinates: {
    firstStep: { en: "Read the x-coordinate first, then the y-coordinate", zh: "先讀 x 坐標，再讀 y 坐標" },
    keyFactPrompt: { en: `What is the ${math("x")}-coordinate of ${math("(-4, 6)")}?`, zh: `${math("(-4, 6)")} 的 ${math("x")} 坐標是多少？` },
    keyFactAnswer: "-4",
    keyFactExplanation: { en: `The first coordinate is ${math("x")}.`, zh: `第一個坐標是 ${math("x")} 坐標。` },
    examplePrompt: { en: `Which quadrant contains ${math("(-2, 5)")}?`, zh: `${math("(-2, 5)")} 位於哪一象限？` },
    exampleAnswer: "II",
    exampleExplanation: { en: `Negative ${math("x")} and positive ${math("y")} give Quadrant II.`, zh: `${math("x")} 負、${math("y")} 正，所以是第二象限。` },
    commonCheck: { en: "Do not swap the x- and y-coordinates", zh: "不要把 x 和 y 坐標倒轉" }
  },
  transformations: {
    firstStep: { en: "State the transformation rule before moving points", zh: "移動點前先寫出變換規則" },
    keyFactPrompt: { en: `Translate ${math("(1, 2)")} by vector ${math("(3, -1)")}.`, zh: `把 ${math("(1, 2)")} 以向量 ${math("(3, -1)")} 平移。` },
    keyFactAnswer: "(4, 1)",
    keyFactExplanation: { en: `Add coordinates: ${math("(1 + 3, 2 - 1) = (4, 1)")}.`, zh: `坐標相加：${math("(1 + 3, 2 - 1) = (4, 1)")}。` },
    examplePrompt: { en: `Reflect ${math("(-5, 4)")} in the ${math("x")}-axis.`, zh: `把 ${math("(-5, 4)")} 關於 ${math("x")} 軸反射。` },
    exampleAnswer: "(-5, -4)",
    exampleExplanation: { en: `Reflection in the ${math("x")}-axis changes the sign of ${math("y")}.`, zh: `關於 ${math("x")} 軸反射會改變 ${math("y")} 的符號。` },
    commonCheck: { en: "Label original and image points clearly", zh: "清楚標示原像點和影像點" }
  },
  "probability-s2": {
    firstStep: { en: "List the sample space and count favourable outcomes", zh: "先列出樣本空間並數有利結果" },
    keyFactPrompt: { en: `A fair coin is tossed once. What is ${math(String.raw`P(\text{head})`)}?`, zh: `擲一次公平硬幣，${math(String.raw`P(\text{正面})`)} 是多少？` },
    keyFactAnswer: "1/2",
    keyFactExplanation: { en: `There is ${math("1")} head outcome out of ${math("2")} equally likely outcomes.`, zh: `兩個等可能結果中有 ${math("1")} 個是正面。` },
    examplePrompt: { en: `A fair six-sided die is rolled once. What is ${math(String.raw`P(\text{number greater than 4})`)}?`, zh: `擲一次公平六面骰子，${math(String.raw`P(\text{擲得大於 4 的點數})`)} 是多少？` },
    exampleAnswer: "1/3",
    exampleExplanation: { en: `The favourable results are 5 and 6, so 2 of the 6 equally likely outcomes are favourable: ${math("2/6 = 1/3")}.`, zh: `有利結果是 5 和 6；6 個等可能結果中有 2 個是有利結果，所以 ${math("2/6 = 1/3")}。` },
    commonCheck: { en: "Use favourable outcomes over total equally likely outcomes", zh: "用有利結果數除以等可能總結果數" }
  },
  polynomials: {
    firstStep: { en: "Identify terms, coefficients, and like terms", zh: "先辨認項、係數和同類項" },
    keyFactPrompt: { en: `Simplify ${math("2x^2 + 5x^2")}.`, zh: `化簡 ${math("2x^2 + 5x^2")}。` },
    keyFactAnswer: "7x^2",
    keyFactExplanation: { en: `Like terms with ${math("x^2")} can be combined.`, zh: `含 ${math("x^2")} 的同類項可以合併。` },
    examplePrompt: { en: `Expand ${math("x(x + 4)")}.`, zh: `展開 ${math("x(x + 4)")}。` },
    exampleAnswer: "x^2 + 4x",
    exampleExplanation: { en: `Multiply ${math("x")} into each term.`, zh: `把 ${math("x")} 分別乘入每一項。` },
    commonCheck: { en: "Check factorization by expanding back", zh: "因式分解後用展開檢查" },
    commonCheckExplanation: {
      en: "Expand the proposed factors and simplify; the result must reproduce every term of the original polynomial. For example, x(x + 4) = x^2 + 4x.",
      zh: "把所擬因式展開並化簡，結果必須重現原多項式的每一項。例如，x(x + 4) = x^2 + 4x。"
    }
  },
  "identities-square-patterns": {
    firstStep: { en: "Match each algebraic term to an area in the square model", zh: "先把每一個代數項配對到正方形模型中的面積" },
    keyFactPrompt: { en: `Complete the identity: ${math("(a-b)^2 \\equiv a^2-\\square+b^2")}.`, zh: `完成恆等式：${math("(a-b)^2 \\equiv a^2-\\square+b^2")}。` },
    keyFactAnswer: "2ab",
    keyFactExplanation: { en: `The two equal rectangles each have area ${math("ab")}, so the middle term is ${math("2ab")}.`, zh: `兩個相等長方形的面積各為 ${math("ab")}，所以中間項是 ${math("2ab")}。` },
    examplePrompt: { en: `Factorise ${math("a^2-b^2")}.`, zh: `把 ${math("a^2-b^2")} 因式分解。` },
    exampleAnswer: "(a-b)(a+b)",
    exampleExplanation: { en: `${math("a^2-b^2 \\equiv (a-b)(a+b)")} is the difference-of-squares identity.`, zh: `${math("a^2-b^2 \\equiv (a-b)(a+b)")} 是平方差恆等式。` },
    commonCheck: { en: "Expand the factors to verify every term and sign", zh: "把因式重新展開，檢查每一項和正負號" },
    commonCheckExplanation: {
      en: "Expand both factors and check every term and sign. For example, (a − b)^2 = (a − b)(a − b) ≡ a^2 − 2ab + b^2; the two ab terms combine to −2ab.",
      zh: "展開兩個因式並檢查每一項和正負號。例如，（a − b）^2 =（a − b）（a − b）≡ a^2 − 2ab + b^2；兩個 ab 項合併為 −2ab。"
    }
  },
  "quadratic-patterns": {
    firstStep: { en: "Look for second differences, vertex, or axis of symmetry", zh: "先找二階差、頂點或對稱軸" },
    keyFactPrompt: { en: `For ${math("y = x^2 + 2x + 1")}, what is the axis of symmetry?`, zh: `對於 ${math("y = x^2 + 2x + 1")}，對稱軸是甚麼？` },
    keyFactAnswer: "x = -1",
    keyFactExplanation: { en: `${math(String.raw`x = -\frac{b}{2a} = -1`)}.`, zh: `${math(String.raw`x = -\frac{b}{2a} = -1`)}。` },
    examplePrompt: { en: `What is the vertex of ${math("y = (x - 3)^2 + 2")}?`, zh: `${math("y = (x - 3)^2 + 2")} 的頂點是甚麼？` },
    exampleAnswer: "(3, 2)",
    exampleExplanation: { en: `Vertex form ${math("y=(x-h)^2+k")} has vertex ${math("(h,k)")}.`, zh: `頂點式 ${math("y=(x-h)^2+k")} 的頂點是 ${math("(h,k)")}。` },
    commonCheck: { en: "Use the sign carefully in vertex form", zh: "使用頂點式時要小心括號內的符號" }
  },
  "p5-fractions-operations": {
    firstStep: { en: "Find a common denominator before adding or subtracting unlike denominators", zh: "異分母加減前先找公分母" },
    keyFactPrompt: { en: `Add three fractions with unlike denominators: ${math("1/2+1/4+1/8")}. Give the answer in simplest fractional form.`, zh: `把三項異分母分數相加：${math("1/2+1/4+1/8")}，並把答案化至最簡分數。` },
    keyFactAnswer: "7/8",
    keyFactExplanation: { en: `Use denominator ${math("8")}: ${math("4/8+2/8+1/8=7/8")}.`, zh: `通分至分母 ${math("8")}：${math("4/8+2/8+1/8=7/8")}。` },
    examplePrompt: {
      en: `Subtract the fractions with unlike denominators: ${math("5/6-1/4")}. Give the answer in simplest fractional form.`,
      zh: `計算異分母分數減法 ${math("5/6-1/4")}，並把答案化至最簡分數。`
    },
    exampleAnswer: "7/12",
    exampleExplanation: { en: `${math("5/6=10/12")} and ${math("1/4=3/12")}, so ${math("10/12-3/12=7/12")}; ${math("7/12")} is already in simplest fractional form.`, zh: `${math("5/6=10/12")} 而 ${math("1/4=3/12")}，所以 ${math("10/12-3/12=7/12")}；${math("7/12")} 已是最簡分數。` },
    commonCheck: { en: "Simplify the final fraction when possible", zh: "答案如可約簡，要化成最簡分數" }
  },
  "p5-volume": {
    firstStep: {
      en: "Identify the volume and dimensions, then decide which quantity is unknown before choosing the operation",
      zh: "先辨認體積和各個尺寸，再找出未知量，然後選擇運算"
    },
    firstStepExplanation: {
      en: "Here height is unknown. From V = lwh, divide the volume by the base area: h = 48 ÷ (4 × 3) = 4 cm.",
      zh: "這題的未知量是高。由 V = lwh，用體積除以底面積：h = 48 ÷（4 × 3）= 4 厘米。"
    },
    keyFactPrompt: {
      en: "A cuboid tank has volume 48 cm^3, length 4 cm, and width 3 cm. What is its height? Give your answer with a length unit.",
      zh: "一個長方體水箱的體積是 48 立方厘米，長 4 厘米、闊 3 厘米。高是多少？答案須附上長度單位。"
    },
    keyFactAnswer: "4 cm",
    keyFactExplanation: {
      en: "Here height is unknown. From V = lwh, divide the volume by the base area: h = 48 ÷ (4 × 3) = 4 cm.",
      zh: "這題的未知量是高。由 V = lwh，用體積除以底面積：h = 48 ÷（4 × 3）= 4 厘米。"
    },
    examplePrompt: { en: `A box has base area ${math("10")} cm^2 and height ${math("3")} cm. Find its volume.`, zh: `一個盒子的底面積是 ${math("10")} 平方厘米，高 ${math("3")} 厘米。求體積。` },
    exampleAnswer: "30 cm^3",
    exampleExplanation: { en: `Volume ${math("= 10 \\times 3 = 30")} cubic centimetres.`, zh: `體積 ${math("= 10 \\times 3 = 30")} 立方厘米。` },
    commonCheck: { en: "Multiply length, width, and height instead of adding the edge lengths", zh: "要把長、闊和高相乘，不是把邊長相加" },
    commonCheckExplanation: {
      en: `Multiply length, width, and height instead of adding the edge lengths. This check is consistent with both the key fact (Height ${math("= 48 \\div (4 \\times 3) = 4")} cm.) and the guided example (Volume ${math("= 10 \\times 3 = 30")} cubic centimetres.); the other checks would preserve a topic-specific error rather than expose it.`,
      zh: `要把長、闊和高相乘，不是把邊長相加。這項檢查同時符合關鍵知識（高 ${math("= 48 \\div (4 \\times 3) = 4")} 厘米。）和引導例題（體積 ${math("= 10 \\times 3 = 30")} 立方厘米。）；其餘檢查會保留本課題的具體錯誤，而不能揭示錯誤。`
    }
  },
  "p5-rates": {
    firstStep: { en: "Divide the total price by the number of items to find the unit price", zh: "把總價除以件數，求出單價" },
    keyFactPrompt: { en: "Three notebooks cost HK$18. What is the unit price per notebook?", zh: "3 本筆記簿售港幣 18 元。每本的單價是多少？" },
    keyFactAnswer: "HK$6",
    keyFactExplanation: { en: `${math("18 \\div 3 = 6")}, so each notebook costs HK$6.`, zh: `${math("18 \\div 3 = 6")}，所以每本港幣 6 元。` },
    examplePrompt: { en: "Eight juice boxes cost HK$48. What is the unit price per box?", zh: "8 盒果汁售港幣 48 元。每盒的單價是多少？" },
    exampleAnswer: "HK$6",
    exampleExplanation: { en: `${math("48 \\div 8=6")}, so each box costs HK$6.`, zh: `${math("48 \\div 8=6")}，所以每盒售港幣 6 元。` },
    guidedDifficulty: "Low",
    commonCheck: { en: "State the price for one item, not the total pack price", zh: "答案要寫一件的單價，不是整包總價" }
  },
  "p5-charts-averages": {
    firstStep: { en: "Use the legend to identify both series before reading the paired data values", zh: "先用圖例辨認兩組數據，再讀取相應數值" },
    firstStepExplanation: {
      en: "Use the legend to match 9 to Class A and 6 to Class B in the same category; then add 9 + 6 = 15 votes.",
      zh: "先按圖例把同一類別中的 9 票配對到甲班、6 票配對到乙班，再計算 9 + 6 = 15 票。"
    },
    keyFactPrompt: { en: `A compound bar chart shows ${math("9")} votes for Class A and ${math("6")} for Class B. How many votes are there altogether?`, zh: `複合棒形圖顯示甲班有 ${math("9")} 票、乙班有 ${math("6")} 票。合共有多少票？` },
    keyFactAnswer: "15",
    keyFactExplanation: { en: `${math("9+6=15")}.`, zh: `${math("9+6=15")}。` },
    examplePrompt: { en: `In one category of a compound bar chart, the two series are ${math("12")} and ${math("8")}. Find their difference.`, zh: `複合棒形圖某一類別的兩組數值是 ${math("12")} 和 ${math("8")}。求兩者之差。` },
    exampleAnswer: "4",
    exampleExplanation: { en: `${math("12-8=4")}.`, zh: `${math("12-8=4")}。` },
    commonCheck: { en: "Match each bar to the correct series and category", zh: "把每一支棒配對到正確的數據組和類別" },
    commonCheckExplanation: {
      en: `Read the legend before using a bar: in the Class A/Class B example, the bar identified by the Class A legend is ${math("9")} and the Class B bar is ${math("6")}. For a difference such as ${math("12-8=4")}, first confirm that both bars belong to the same category and to the intended two series.`,
      zh: `使用棒形數值前要先讀圖例：在甲班／乙班的例子中，圖例標示為甲班的棒是 ${math("9")}，乙班的棒是 ${math("6")}。計算如 ${math("12-8=4")} 的差之前，也要先確認兩支棒屬於同一類別及題目指定的兩組數據。`
    }
  },
  "trigonometry-basics": {
    firstStep: { en: "Label opposite, adjacent, and hypotenuse", zh: "先標示對邊、鄰邊和斜邊" },
    keyFactPrompt: { en: `If adjacent ${math("= 4")} and hypotenuse ${math("= 5")}, what is ${math(String.raw`\cos\theta`)}?`, zh: `若鄰邊 ${math("= 4")}、斜邊 ${math("= 5")}，${math(String.raw`\cos\theta`)} 是多少？` },
    keyFactAnswer: "4/5",
    keyFactExplanation: { en: `${math(String.raw`\cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}`)}.`, zh: `${math(String.raw`\cos\theta = \frac{\text{鄰邊}}{\text{斜邊}}`)}。` },
    examplePrompt: { en: `If opposite ${math("= 6")} and adjacent ${math("= 8")}, what is ${math(String.raw`\tan\theta`)}?`, zh: `若對邊 ${math("= 6")}、鄰邊 ${math("= 8")}，${math(String.raw`\tan\theta`)} 是多少？` },
    exampleAnswer: "3/4",
    exampleExplanation: { en: `${math(String.raw`\tan\theta = 6/8 = 3/4`)}.`, zh: `${math(String.raw`\tan\theta = 6/8 = 3/4`)}。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Choose SOH, CAH, or TOA after labelling sides", zh: "標示邊後才選 SOH、CAH 或 TOA" }
  },
  "arc-length-sector-area": {
    firstStep: { en: "Write the angle at the centre as a fraction of a full circle", zh: "先把圓心角寫成整個圓的分數" },
    keyFactPrompt: { en: `A sector has radius ${math("9")} cm and angle at the centre ${math("80^\\circ")}. Find its exact arc length.`, zh: `一個扇形的半徑是 ${math("9")} 厘米，圓心角是 ${math("80^\\circ")}。求精確弧長。` },
    keyFactAnswer: "4π cm",
    keyFactExplanation: { en: `Arc length ${math("=(80/360)(2\\pi)(9)=4\\pi")} cm, approximately ${math("12.57")} cm.`, zh: `弧長 ${math("=(80/360)(2\\pi)(9)=4\\pi")} 厘米，約為 ${math("12.57")} 厘米。` },
    examplePrompt: { en: `A sector has radius ${math("6")} cm and angle at the centre ${math("120^\\circ")}. Find its exact area.`, zh: `一個扇形的半徑是 ${math("6")} 厘米，圓心角是 ${math("120^\\circ")}。求精確面積。` },
    exampleAnswer: "12π cm^2",
    exampleExplanation: { en: `Sector area ${math("=(120/360)\\pi(6^2)=12\\pi")} cm², approximately ${math("37.70")} cm².`, zh: `扇形面積 ${math("=(120/360)\\pi(6^2)=12\\pi")} 平方厘米，約為 ${math("37.70")} 平方厘米。` },
    commonCheck: { en: "Use length units for an arc and square units for a sector area", zh: "弧長使用長度單位，扇形面積使用平方單位" }
  },
  circles: {
    firstStep: { en: "Identify the chord, tangent, arc, or angle at the centre being used", zh: "先辨認使用的是弦、切線、弧還是圓心角" },
    keyFactPrompt: { en: `A tangent meets a radius at the point of contact. What angle is formed?`, zh: `切線與接觸點的半徑相交，形成甚麼角？` },
    keyFactAnswer: "90°",
    keyFactExplanation: { en: `A tangent is perpendicular to the radius at the point of contact.`, zh: `切線垂直於接觸點的半徑。` },
    examplePrompt: { en: `An angle at the circumference standing on an arc is ${math("35^\\circ")}. What is the angle at the centre standing on the same arc?`, zh: `一弧所對的圓周角是 ${math("35^\\circ")}。該弧所對的圓心角是多少？` },
    exampleAnswer: "70°",
    exampleExplanation: { en: `The angle at the centre is twice the angle at the circumference standing on the same arc.`, zh: `同一弧所對的圓心角是圓周角的兩倍。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Mark radii and equal lengths on the diagram", zh: "在圖中標示半徑和相等長度" },
    commonCheckExplanation: {
      en: "Mark every radius from the centre; radii of the same circle are equal. At a point of contact, also mark the 90° angle between the radius and the tangent.",
      zh: "標示由圓心連到圓周的每條半徑；同一圓的半徑相等。在接觸點亦要標示半徑與切線之間的 90° 角。"
    }
  },
  functions: {
    firstStep: { en: "Identify the input, rule, and output", zh: "先辨認輸入、規則和輸出" },
    keyFactPrompt: { en: `If ${math("f(x)=3x+2")}, find ${math("f(2)")}.`, zh: `若 ${math("f(x)=3x+2")}，求 ${math("f(2)")}。` },
    keyFactAnswer: "8",
    keyFactExplanation: { en: `${math("3(2)+2=8")}.`, zh: `${math("3(2)+2=8")}。` },
    examplePrompt: { en: `If ${math("g(x)=x^2")}, find ${math("g(-3)")}.`, zh: `若 ${math("g(x)=x^2")}，求 ${math("g(-3)")}。` },
    exampleAnswer: "9",
    exampleExplanation: { en: `${math("(-3)^2=9")}.`, zh: `${math("(-3)^2=9")}。` },
    commonCheck: { en: "Substitute the whole input before simplifying", zh: "先完整代入輸入值，再化簡" }
  },
  "coordinate-geometry": {
    firstStep: { en: "Choose slope, distance, midpoint, or line equation based on the target", zh: "按題目要求選擇斜率、距離、中點或直線方程" },
    keyFactPrompt: { en: `Find the midpoint of ${math("(2, 4)")} and ${math("(6, 8)")}.`, zh: `求 ${math("(2, 4)")} 和 ${math("(6, 8)")} 的中點。` },
    keyFactAnswer: "(4, 6)",
    keyFactExplanation: { en: `Average the coordinates: ${math("((2+6)/2,(4+8)/2)=(4,6)")}.`, zh: `坐標取平均：${math("((2+6)/2,(4+8)/2)=(4,6)")}。` },
    examplePrompt: { en: `Find the distance between ${math("(0,0)")} and ${math("(3,4)")}.`, zh: `求 ${math("(0,0)")} 和 ${math("(3,4)")} 的距離。` },
    exampleAnswer: "5",
    exampleExplanation: { en: `Use Pythagoras: ${math(String.raw`\sqrt{3^2+4^2}=5`)}.`, zh: `用畢氏定理：${math(String.raw`\sqrt{3^2+4^2}=5`)}。` },
    commonCheck: { en: "Keep x-differences and y-differences in matching order", zh: "x 差和 y 差要保持同一方向" },
    commonCheckExplanation: {
      en: `For points ${math("(1,2)")} and ${math("(4,8)")}, using the same point order gives gradient ${math("(8-2)/(4-1)=2")}. Reversing both differences also gives ${math("(2-8)/(1-4)=2")}; reversing only one difference would give the wrong sign.`,
      zh: `對點 ${math("(1,2)")} 和 ${math("(4,8)")}，兩個差使用同一點序可得斜率 ${math("(8-2)/(4-1)=2")}。若兩個差同時倒轉，${math("(2-8)/(1-4)=2")} 仍相同；只倒轉其中一個差則會得到錯誤符號。`
    }
  },
  "more-algebra": {
    firstStep: { en: "State denominator restrictions, then factor before cancelling a rational expression", zh: "先寫出分母限制，再把有理式因式分解後約簡" },
    keyFactPrompt: { en: `Given ${math("a \\ne 2")}, simplify ${math(String.raw`\frac{a^2-4}{a-2}`)}.`, zh: `已知 ${math("a \\ne 2")}，化簡 ${math(String.raw`\frac{a^2-4}{a-2}`)}。` },
    keyFactAnswer: "a + 2",
    keyFactExplanation: { en: `${math("a^2-4=(a-2)(a+2)")}. Since ${math("a \\ne 2")}, cancel ${math("a-2")} to obtain ${math("a+2")}.`, zh: `${math("a^2-4=(a-2)(a+2)")}。因為 ${math("a \\ne 2")}，可約去 ${math("a-2")}，得 ${math("a+2")}。` },
    examplePrompt: { en: `Given ${math("b \\ne 0")}, simplify ${math(String.raw`\frac{b^2+3b}{b}`)}.`, zh: `已知 ${math("b \\ne 0")}，化簡 ${math(String.raw`\frac{b^2+3b}{b}`)}。` },
    exampleAnswer: "b + 3",
    exampleExplanation: { en: `Factor the numerator: ${math("b^2+3b=b(b+3)")}. Because ${math("b \\ne 0")}, cancelling the nonzero factor ${math("b")} gives ${math("b+3")}.`, zh: `先把分子因式分解：${math("b^2+3b=b(b+3)")}。因為 ${math("b \\ne 0")}，可約去非零因子 ${math("b")}，得 ${math("b+3")}。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Check every original denominator restriction remains stated after cancellation", zh: "約簡後仍要列出原式分母的所有限制" }
  },
  "data-handling": {
    firstStep: { en: "Identify data type, distribution shape, and possible bias", zh: "先辨認數據類型、分佈形狀和可能偏差" },
    keyFactPrompt: { en: `Which measure is most affected by an extreme outlier: mean, median, or mode?`, zh: `平均數、中位數、眾數之中，哪一個最受極端離群值影響？` },
    keyFactAnswer: "mean",
    keyFactExplanation: { en: `The mean uses every value, so an extreme value can pull it.`, zh: `平均數使用所有數值，所以極端值會拉動它。` },
    examplePrompt: { en: `Find the range of ${math("5, 6, 9, 20")}.`, zh: `求 ${math("5, 6, 9, 20")} 的全距。` },
    exampleAnswer: "15",
    exampleExplanation: { en: `${math("20 - 5 = 15")}.`, zh: `${math("20 - 5 = 15")}。` },
    commonCheck: { en: "Check whether the graph scale is misleading", zh: "檢查圖表比例是否誤導" },
    commonCheckExplanation: {
      en: "A vertical axis truncated from 95 to 100 can make values 98 and 99 look far apart even though they differ by only 1. Check the axis start, interval, and whether intervals are equal before judging a visual difference.",
      zh: "若縱軸由 95 而不是 0 開始，數值 98 和 99 在圖上可能看似相差很大，但實際只相差 1。判斷視覺差異前，要檢查坐標軸起點、刻度間距及各間距是否相等。"
    }
  },
  "advanced-functions": {
    firstStep: { en: "Identify the logarithm base and require its argument to be positive", zh: "先辨認對數底數，並確保真數為正數" },
    keyFactPrompt: { en: `Evaluate ${math(String.raw`\log_3 81`)}.`, zh: `計算 ${math(String.raw`\log_3 81`)}。` },
    keyFactAnswer: "4",
    keyFactExplanation: { en: `${math(String.raw`\log_3 81=4`)} because ${math("3^4=81")}.`, zh: `${math(String.raw`\log_3 81=4`)}，因為 ${math("3^4=81")}。` },
    examplePrompt: { en: `Find the domain of ${math(String.raw`g(x)=\log_5(x+2)`)}.`, zh: `求 ${math(String.raw`g(x)=\log_5(x+2)`)} 的定義域。` },
    exampleAnswer: "x > -2",
    exampleExplanation: { en: `The logarithm argument must be positive: ${math("x+2>0")}, so ${math("x>-2")}.`, zh: `對數的真數必須為正數：${math("x+2>0")}，所以 ${math("x>-2")}。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Check that the logarithm base is positive and not 1, and that the argument is positive", zh: "檢查對數底數為正且不等於 1，並確保真數為正數" }
  },
  "trigonometry-s5": {
    firstStep: { en: "Identify amplitude, period, phase, or identity before solving", zh: "求解前先辨認振幅、週期、相位或恆等式" },
    keyFactPrompt: { en: `What is the period of ${math(String.raw`\sin x`)} in degrees?`, zh: `${math(String.raw`\sin x`)} 的週期是多少度？` },
    keyFactAnswer: "360°",
    keyFactExplanation: { en: `The basic sine graph repeats every ${math("360^\\circ")}.`, zh: `基本正弦圖像每 ${math("360^\\circ")} 重複一次。` },
    examplePrompt: { en: `What is the amplitude of ${math(String.raw`3\sin x`)}?`, zh: `${math(String.raw`3\sin x`)} 的振幅是多少？` },
    exampleAnswer: "3",
    exampleExplanation: { en: `Amplitude is the absolute value of the multiplier.`, zh: `振幅是乘數的絕對值。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Use the required interval when listing solutions", zh: "列解時必須使用題目指定區間" }
  },
  "probability-s5": {
    firstStep: { en: "Identify equally likely individual objects and the conditioning event, then update the sample space after each draw without replacement", zh: "先辨認等可能的個別物件和條件事件，再於每次不放回抽取後更新樣本空間" },
    keyFactPrompt: { en: `A bag has ${math("4")} green balls and ${math("1")} yellow ball, with each physical ball equally likely to be drawn. Two balls are drawn without replacement. Given that the first is green, find ${math(String.raw`P(\text{second is yellow})`)}.`, zh: `袋中有 ${math("4")} 個綠球和 ${math("1")} 個黃球，每個實體球被抽中的機會相等。不放回地抽取兩個球。已知第一個是綠球，求 ${math(String.raw`P(\text{第二個是黃球})`)}。` },
    keyFactAnswer: "1/4",
    keyFactExplanation: { en: `After one green ball is removed, the ${math("4")} remaining individual balls are equally likely and exactly ${math("1")} favourable ball is yellow, so the conditional probability is ${math("1/4")}.`, zh: `抽走一個綠球後，餘下 ${math("4")} 個實體球是等可能結果，當中恰有 ${math("1")} 個有利結果是黃球，所以條件概率是 ${math("1/4")}。` },
    examplePrompt: { en: `A bag has ${math("3")} red balls and ${math("2")} blue balls, with each physical ball equally likely to be drawn at each stage. Two balls are drawn without replacement. Find ${math(String.raw`P(\text{both are red})`)}.`, zh: `袋中有 ${math("3")} 個紅球和 ${math("2")} 個藍球，每次抽取時每個實體球被抽中的機會相等。不放回地抽取兩個球。求 ${math(String.raw`P(\text{兩個都是紅球})`)}。` },
    exampleAnswer: "3/10",
    exampleExplanation: { en: `Count equally likely individual-ball branches, not the two colour labels. The second probability is conditional on the first red draw: ${math("(3/5)(2/4)=6/20=3/10")}.`, zh: `應按等可能的個別球分支計算，而不是把兩種顏色各當一個等可能結果。第二次抽到紅球的概率以第一次已抽到紅球為條件：${math("(3/5)(2/4)=6/20=3/10")}。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Confirm equally likely individual outcomes, then update both the favourable count and total after a draw without replacement", zh: "先確認等可能的個別結果，再於不放回抽取後更新有利結果數目和總數" }
  },
  "differentiation-intro": {
    firstStep: { en: "Interpret derivative as gradient or rate of change", zh: "先把導數理解為斜率或變化率" },
    firstStepExplanation: {
      en: "A derivative describes gradient or rate of change. For x^n, the power rule calculates the derivative: d/dx(x^n) = nx^(n−1).",
      zh: "導數表示斜率或變化率。對 x^n，冪法則可求出導數：d/dx(x^n) = nx^(n−1)。"
    },
    keyFactPrompt: { en: `Differentiate ${math("x^3")}.`, zh: `求 ${math("x^3")} 的導數。` },
    keyFactAnswer: "3x^2",
    keyFactExplanation: { en: `Power rule: ${math(String.raw`\frac{d}{dx}x^n = nx^{n-1}`)}.`, zh: `冪法則：${math(String.raw`\frac{d}{dx}x^n = nx^{n-1}`)}。` },
    examplePrompt: { en: `If ${math("y=5x")}, what is ${math("dy/dx")}?`, zh: `若 ${math("y=5x")}，${math("dy/dx")} 是多少？` },
    exampleAnswer: "5",
    exampleExplanation: { en: `A straight line ${math("y=5x")} has constant gradient ${math("5")}.`, zh: `直線 ${math("y=5x")} 的斜率固定為 ${math("5")}。` },
    guidedDifficulty: "Low",
    commonCheck: { en: "Reduce the power by one after multiplying by the original power", zh: "檢查是否先乘以原來的指數，再把指數減 1" }
  },
  calculus: {
    firstStep: { en: "Read the sign of f'(x) on each relevant interval before classifying the graph's behaviour", zh: "先讀取各相關區間內 f'(x) 的正負，再判斷圖像的走勢" },
    keyFactPrompt: { en: `If ${math("f'(x)<0")} for ${math("2<x<5")}, how does ${math("f")} behave on this interval?`, zh: `若在 ${math("2<x<5")} 內 ${math("f'(x)<0")}，函數 ${math("f")} 在這個區間如何變化？` },
    keyFactAnswer: "decreasing",
    keyFactExplanation: { en: `Because ${math("f'(x)<0")} throughout the interval, ${math("f")} is decreasing there.`, zh: `由於整個區間內 ${math("f'(x)<0")}，所以 ${math("f")} 在該區間遞減。` },
    examplePrompt: { en: `Differentiate ${math("4x^2")}.`, zh: `求 ${math("4x^2")} 的導數。` },
    exampleAnswer: "8x",
    exampleExplanation: { en: `Use the power rule: ${math("4 \\times 2x = 8x")}.`, zh: `用冪法則：${math("4 \\times 2x = 8x")}。` },
    guidedDifficulty: "Low",
    commonCheck: { en: "Check the sign of f'(x) on both sides of a stationary point before classifying it", zh: "為駐點分類前，檢查駐點兩側 f'(x) 的正負" },
    commonCheckExplanation: {
      en: "At a stationary point, compare the sign of f'(x) immediately before and after it: + to − gives a local maximum, − to + gives a local minimum, and no sign change gives neither.",
      zh: "在駐點處，比較其前後 f'(x) 的正負：由正變負是局部極大值，由負變正是局部極小值；若沒有變號，則兩者都不是。"
    }
  },
  "statistics-s6": {
    firstStep: { en: "Confirm that the standard deviation is greater than 0, then convert the observed value to a standard score (z-score) for the stated normal distribution", zh: "先確認標準差大於 0，再把觀察值轉換成該正態分佈的標準分（z 分數）" },
    keyFactPrompt: { en: `Find the standard score (z-score) for ${math("x=65")}, mean ${math("50")}, and standard deviation ${math("5")}.`, zh: `平均數為 ${math("50")}、標準差為 ${math("5")} 時，求 ${math("x=65")} 的標準分（z 分數）。` },
    keyFactAnswer: "3",
    keyFactExplanation: { en: `The standard deviation is ${math("5>0")}, so ${math(String.raw`z=(65-50)/5=3`)}.`, zh: `標準差 ${math("5>0")}，所以 ${math(String.raw`z=(65-50)/5=3`)}。` },
    examplePrompt: { en: `In a normal distribution with standard deviation greater than ${math("0")}, if the standard score is ${math("z=0")}, where is the value relative to the mean?`, zh: `在標準差大於 ${math("0")} 的正態分佈中，若標準分為 ${math("z=0")}，該數值相對於平均數在哪裡？` },
    exampleAnswer: "at the mean",
    exampleExplanation: { en: `${math("z=0")} means the value equals the mean.`, zh: `${math("z=0")} 表示數值等於平均數。` },
    guidedDifficulty: "Low",
    commonCheck: { en: "Check that the standard deviation is greater than 0, then subtract the mean from the observed value and divide by the standard deviation", zh: "先檢查標準差大於 0，再以觀察值減平均數，然後除以標準差" }
  },
  "exam-revision": {
    firstStep: { en: "Sort questions by marks, confidence, and time available", zh: "先按分數、信心和可用時間排序題目" },
    keyFactPrompt: { en: `A paper has ${math("90")} marks in ${math("120")} minutes. Find the time per mark in minutes per mark, to 2 decimal places.`, zh: `一份試卷共 ${math("90")} 分，限時 ${math("120")} 分鐘。求平均每分所用時間，以分鐘／分作單位，答案取至小數點後兩位。` },
    keyFactAnswer: "1.33 minutes per mark",
    keyFactExplanation: { en: `${math("120/90=1.333\\ldots")}, so the time is ${math("1.33")} minutes per mark to 2 decimal places.`, zh: `${math("120/90=1.333\\ldots")}，所以取至小數點後兩位是 ${math("1.33")} 分鐘／分。` },
    examplePrompt: { en: `A ${math("6")}-mark part takes ${math("9")} minutes. Find the time per mark in minutes per mark, to 2 decimal places.`, zh: `一個 6 分的分題用了 ${math("9")} 分鐘。求平均每分所用時間，以分鐘／分作單位，答案取至小數點後兩位。` },
    exampleAnswer: "1.50 minutes per mark",
    exampleExplanation: { en: `${math("9/6=1.5")}, which is ${math("1.50")} minutes per mark to 2 decimal places.`, zh: `${math("9/6=1.5")}，取至小數點後兩位是 ${math("1.50")} 分鐘／分。` },
    guidedDifficulty: "Low",
    commonCheck: { en: "Leave time for checking high-mark answers", zh: "預留時間檢查高分題" },
    commonCheckExplanation: {
      en: "Use minutes per mark to set the working-time budget, then reserve a separate final checking period; give priority in that period to high-mark answers.",
      zh: "先按每分所需分鐘設定作答時間預算，再另外預留最後檢查時間；檢查時優先核對高分題。"
    }
  },
  "mixed-problem-solving": {
    firstStep: { en: "Link the quantities in the graph or table to the variables in the equation before calculating", zh: "計算前先把圖像或表格中的數量連繫到方程的變量" },
    keyFactPrompt: { en: `A route diagram labels a distance of ${math("36")} km, and a table gives a travel time of ${math("1.5")} h. Use ${math("d=vt")} to find the speed.`, zh: `路線圖標示路程為 ${math("36")} 公里，表格顯示行程時間為 ${math("1.5")} 小時。用 ${math("d=vt")} 求速率。` },
    keyFactAnswer: "24 km/h",
    keyFactExplanation: { en: `Match ${math("d=36")} and ${math("t=1.5")} across the two representations, then ${math("v=d/t=36/1.5=24")} km/h.`, zh: `把兩種表示方式中的 ${math("d=36")} 和 ${math("t=1.5")} 配對，再算 ${math("v=d/t=36/1.5=24")} 公里每小時。` },
    examplePrompt: { en: `A distance-time graph marks ${math("18")} km at ${math("1.5")} h. A table says the same speed continues until the total time is ${math("2.5")} h. Use ${math("d=vt")} to find the total distance.`, zh: `距離－時間圖顯示 ${math("1.5")} 小時時路程為 ${math("18")} 公里；表格指出其後保持相同速率，總時間為 ${math("2.5")} 小時。用 ${math("d=vt")} 求總路程。` },
    exampleAnswer: "30 km",
    exampleExplanation: { en: `The graph gives ${math("v=18/1.5=12")} km/h. Connect that speed to the table's total time: ${math("d=vt=12(2.5)=30")} km.`, zh: `由圖像得 ${math("v=18/1.5=12")} 公里每小時，再把該速率連繫到表格的總時間：${math("d=vt=12(2.5)=30")} 公里。` },
    guidedDifficulty: "Medium",
    commonCheck: { en: "Check that graph, table, and equation use the same quantities and compatible units", zh: "檢查圖像、表格和方程使用相同數量及相容單位" }
  }
};

type DistractorSet = [Question["prompt"], Question["prompt"], Question["prompt"]];

function distractorSet(
  en: [string, string, string],
  zh: [string, string, string]
): DistractorSet {
  return en.map((text, index) => ({ en: text, zh: zh[index] })) as DistractorSet;
}

const firstStepDistractorsByTopic: Record<string, DistractorSet> = {
  integers: distractorSet(
    ["Add the absolute values and attach the sign seen most often", "Treat subtracting a negative as another move to the left", "Choose the sign before comparing the directed movement from zero"],
    ["把絕對值相加，再套上出現次數最多的符號", "把減去負數當作再次向左移", "未比較從零開始的有向移動，便先決定正負號"]
  ),
  "algebra-basics": distractorSet(
    ["Add the coefficients of terms even when their variable parts differ", "Remove every variable symbol and calculate only the visible numbers", "Multiply coefficients whenever two algebraic terms are joined by a plus sign"],
    ["即使代數項的變量部分不同，也把係數相加", "刪去所有變量符號，只計算可見數字", "兩個代數項以加號連接時便把係數相乘"]
  ),
  coordinates: distractorSet(
    ["Read the vertical coordinate before the horizontal coordinate", "Decide the quadrant from the signs without checking which coordinate is x", "Measure the point's drawn distance from the page edge instead of using the axes"],
    ["先讀縱坐標，再讀橫坐標", "未辨認哪個是 x 坐標，便只按正負號判斷象限", "量度點與頁面邊緣的圖上距離，而不用坐標軸讀數"]
  ),
  "linear-equations": distractorSet(
    ["Divide only the variable term by its coefficient while leaving the constant and the other side unchanged.", "Move a term across the equals sign without applying an inverse operation", "Change only the side containing the variable and leave the other side unchanged"],
    ["只把含變量的一項除以係數，常數項和方程另一邊保持不變。", "把一項移過等號，但不作逆運算", "只改變含變量的一邊，另一邊保持不變"]
  ),
  "quadratic-patterns": distractorSet(
    ["Read the y-intercept as the vertex of every parabola", "Use the two visible roots as the axis equation without finding their midpoint", "Assume the coefficient of x is the x-coordinate of the vertex"],
    ["把 y 軸截距當作每條拋物線的頂點", "未求中點，便把兩個可見根當作對稱軸方程", "假設 x 項的係數就是頂點的 x 坐標"]
  ),
  "trigonometry-basics": distractorSet(
    ["Choose sine, cosine, or tangent from whichever two numbers look largest", "Call the longest drawn segment the hypotenuse without locating the right angle", "Use the side opposite a different angle from the one named in the question"],
    ["只按看來最大的兩個數選正弦、餘弦或正切", "未找出直角，便把圖上畫得最長的線段稱為斜邊", "使用相對於另一個角的對邊，而不是題目所指角"]
  ),
  functions: distractorSet(
    ["Swap the input and output before applying the function rule", "Use the y-intercept as the output for every input", "Combine the input with the function name as if they were like terms"],
    ["套用函數規則前先把輸入和輸出對調", "把 y 軸截距當作每個輸入的輸出", "把輸入與函數名稱當作同類項合併"]
  ),
  "coordinate-geometry": distractorSet(
    ["Subtract x-coordinates in one order and y-coordinates in the opposite order", "Average the coordinate differences to obtain the gradient", "Read the drawn steepness without using rise divided by run"],
    ["x 坐標按一個次序相減，y 坐標卻按相反次序相減", "把坐標差取平均當作斜率", "不計算升幅除以橫距，只按圖上斜度讀答案"]
  ),
  "probability-s5": distractorSet(
    ["Count the colour labels as equally likely outcomes even when their ball counts differ", "Keep the original denominator after the first ball is removed", "Multiply two unconditional first-draw probabilities for a without-replacement event"],
    ["即使各顏色的球數不同，也把顏色標籤當作等可能結果", "抽走第一個球後仍保留原來分母", "處理不放回事例時，把兩個無條件的首次抽取概率相乘"]
  ),
  "differentiation-intro": distractorSet(
    ["Reduce the exponent by one but never multiply by the original exponent.", "Subtract one from the coefficient instead of the power", "Carry an additive constant into the derivative unchanged"],
    ["只把指數減一，卻沒有乘以原來的指數。", "把係數減一，而不是把次方減一", "把加法常數原封不動寫進導數"]
  ),
  calculus: distractorSet(
    ["Classify a stationary point from f'(x)=0 without checking either side", "Treat the function value as though it were the tangent gradient", "Decide that the graph is increasing whenever x is positive"],
    ["只因 f'(x)=0 便為駐點分類，不檢查兩側", "把函數值當作切線斜率", "只要 x 為正便判定圖像上升"]
  ),
  "statistics-s6": distractorSet(
    ["Divide x by the standard deviation without subtracting the mean", "Use the variance in place of the stated standard deviation", "Continue with the z-score formula even when the standard deviation is zero"],
    ["未減去平均數，便把 x 除以標準差", "以方差代替題目所給的標準差", "即使標準差是零，仍繼續使用標準分公式"]
  ),
  angles: distractorSet(
    ["Use 360 degrees as the total for angles on one straight line", "Assume two lines are parallel because they look parallel in the sketch", "Equate adjacent angles as though they were vertically opposite"],
    ["把直線上鄰角的總和當作 360 度", "只因草圖看來平行便假設兩線平行", "把鄰角當作對頂角而判定相等"]
  ),
  ratios: distractorSet(
    ["Add the same number to both ratio terms to make an equivalent ratio", "Compare only the first term and leave the second term unscaled", "Cross-multiply before matching which quantities correspond"],
    ["在比的兩項加上同一個數以製作等值比", "只比較第一項，第二項不按同一倍數縮放", "未配對相應數量，便先作交叉相乘"]
  ),
  "statistics-s1": distractorSet(
    ["Calculate a mean before deciding whether the data are numerical", "Order category names alphabetically and treat their positions as values", "Infer the whole distribution from one unusually high observation"],
    ["未判斷數據是否屬數值，便先計算平均數", "按字母次序排列類別名稱，並把位置當作數值", "只憑一個特別高的觀察值推斷整個分佈"]
  ),
  transformations: distractorSet(
    ["Reflect the figure whenever a translation vector contains a negative component", "Rotate every figure about the origin even when another centre is stated", "Transform the image coordinates again instead of starting from the original figure"],
    ["平移向量有負分量時便把圖形反射", "即使題目指定另一中心，仍一律繞原點旋轉", "不由原圖開始，而再次變換像的坐標"]
  ),
  "probability-s2": distractorSet(
    ["Treat named categories as equally likely without counting the individual outcomes", "Use one short experimental run as the exact theoretical probability", "Include outcomes that the stated sample space cannot produce"],
    ["不數個別結果，便把各個具名類別當作等可能", "把一次短實驗所得頻率當作精確理論概率", "把題目樣本空間不可能出現的結果也包括在內"]
  ),
  polynomials: distractorSet(
    ["Combine terms whose variables have different powers", "Add exponents when polynomial terms are added", "Factor only the constant term and leave the common variable factor outside the search"],
    ["把變量次方不同的項合併", "多項式各項相加時把指數相加", "只分解常數項，不尋找共同變量因子"]
  ),
  "identities-square-patterns": distractorSet(
    ["Expand a squared sum as the sum of two squares with no middle term", "Treat an equality verified at one chosen value as an identity", "Use a positive middle term when expanding a squared difference"],
    ["把和的平方展開成兩個平方之和，漏去中間項", "只代入一個選定數值相等，便把等式當作恆等式", "展開差的平方時使用正的中間項"]
  ),
  "arc-length-sector-area": distractorSet(
    ["Use the angle at the centre over 180 as the fraction of a full circle", "Apply the circumference formula when the question asks for sector area", "Multiply by the full-circle measure instead of taking the stated fraction"],
    ["以圓心角除以 180 作為整個圓的分數", "題目求扇形面積時使用圓周公式", "把數值乘整個圓的量，而不是取題目所給的分數"]
  ),
  circles: distractorSet(
    ["Treat a tangent as parallel to the radius at the contact point", "Use the angle at the circumference as twice the angle at the centre standing on the same arc", "Replace every chord by a diameter before using the stated theorem"],
    ["把切線當作在接觸點與半徑平行", "把同一弧所對的圓周角當作圓心角的兩倍", "使用題目所述定理前，先把每條弦都當作直徑"]
  ),
  "more-algebra": distractorSet(
    ["Cancel terms across addition before factoring the numerator", "Cancel a denominator factor before recording its excluded value", "Treat a value that makes the denominator zero as an extra solution"],
    ["未把分子因式分解，便跨越加法約去項", "未記錄不容許值，便約去分母因子", "把令分母為零的數值當作額外解"]
  ),
  "data-handling": distractorSet(
    ["Choose the mean automatically even when extreme outliers dominate", "Infer a median from the visual shape when the raw ordered values are unavailable", "Interpret an association in a graph as proof that one variable causes the other"],
    ["即使極端離群值影響很大，仍一律選平均數", "未有已排序原始數值，便只按圖形外觀推斷中位數", "把圖上的關聯解讀為一個變量導致另一變量的證明"]
  ),
  "advanced-functions": distractorSet(
    ["Evaluate a logarithm before checking that its argument is positive", "Accept base 1 because it is a positive number", "Transfer an exponential product rule directly to a logarithmic sum"],
    ["未檢查真數為正，便先計算對數", "因為 1 是正數便接受它作對數的底", "把指數的乘法規則直接套到對數的和"]
  ),
  "trigonometry-s5": distractorSet(
    ["Read the coefficient of x as the amplitude", "Ignore the sign of a horizontal phase shift", "Give only one principal value and never generate or check the other solutions in the required interval."],
    ["把 x 的係數讀作振幅", "忽略水平相位移的正負號", "只寫一個主值，不列出或檢查指定區間內的其他解。"]
  ),
  "exam-revision": distractorSet(
    ["Divide marks by minutes when the requested unit is minutes per mark", "Give every question equal time regardless of its marks", "Round the time ratio before completing the division"],
    ["題目要求分鐘／分時，卻用分數除以分鐘", "不理會題目分值，把相同時間分給每題", "未完成除法便先把時間比四捨五入"]
  ),
  "mixed-problem-solving": distractorSet(
    ["Combine graph and table values before matching their quantities and units", "Add distance, speed, and time because all three are numerical", "Read the height of a distance-time line as speed instead of using its gradient"],
    ["未配對數量和單位，便先合併圖像與表格數值", "因路程、速率和時間都是數值便把三者相加", "把距離時間線的高度當作速率，而不用斜率"]
  ),
  "p1-counting-number-bonds": distractorSet(
    ["Start again at 1", "Join the two parts as digits", "Count the starting number twice"],
    ["重新由 1 開始數", "把兩部分拼成一個數", "把起始數重複數兩次"]
  ),
  "p1-addition-subtraction": distractorSet(
    ["Subtract because two numbers appear", "Add the item number too", "Count only the new objects"],
    ["因題目有兩個數便相減", "把物件編號也加進去", "只數新增的物件"]
  ),
  "p1-shapes-patterns": distractorSet(
    ["Use colour or size to name the shape", "For ABAB, start at B and call BA the unit", "Copy only the last shape"],
    ["按顏色或大小命名圖形", "對 ABAB 由 B 開始，把 BA 當作重複單位", "只抄寫最後一個圖形"]
  ),
  "p1-measurement-time": distractorSet(
    ["Swap the short and long clock hands", "Write half past as :50", "Compare lengths before matching units"],
    ["把短針和長針倒轉閱讀", "把半小時寫成 :50", "未統一單位便比較長度"]
  ),
  "p2-place-value": distractorSet(
    ["Read 507 as 57", "Treat ten hundreds as one hundred", "Compare ones before hundreds"],
    ["把 507 讀成 57", "把十個百當作一個百", "先比較個位，後比較百位"]
  ),
  "p2-multiplication-foundations": distractorSet(
    ["Use 5 + 2 for five groups of two", "Count only one group", "Change the group size while counting"],
    ["用 5 + 2 表示五組、每組兩個", "只數其中一組", "點算時改變每組數量"]
  ),
  "p2-money-time": distractorSet(
    ["Add the price and amount paid", "Read the long hand as hours", "Write half past as :50"],
    ["把售價和付款金額相加", "把長針讀作小時", "把半小時寫成 :50"]
  ),
  "p2-length-data": distractorSet(
    ["Use 1 m = 10 cm", "Start measuring at the 1 mark", "Give each icon an unstated multiplier"],
    ["使用 1 米 = 10 厘米", "由 1 刻度開始量度", "自行為每個圖示加倍數"]
  ),
  "p3-multiplication-division": distractorSet(
    ["Accept a remainder that is at least as large as the divisor", "Use the number of groups when the question asks for the size of each share", "Multiply the dividend and divisor because both describe the grouping"],
    ["接受大於或等於除數的餘數", "題目求每份數量時卻回答組數", "因被除數和除數都描述分組便把兩者相乘"]
  ),
  "p3-fractions-intro": distractorSet(
    ["Compare fractions using only their numerators", "Add denominators when making an equivalent fraction", "Count parts of unequal size as though they were equal fractional parts"],
    ["只按分子比較分數", "製作等值分數時把分母相加", "把大小不同的部分當作相等等份點算"]
  ),
  "p3-measurement": distractorSet(
    ["Use 1 L = 100 mL for a capacity conversion", "Combine kilograms and millilitres in one calculation as though they measured the same attribute", "Read a bar's drawn height without using the labelled vertical scale"],
    ["換算容量時使用 1 升 = 100 毫升", "把公斤和毫升當作量度同一屬性而直接計算", "不使用已標示的縱軸刻度，只按棒的圖上高度讀數"]
  ),
  "p3-geometry-patterns": distractorSet(
    ["Name a shape from its orientation on the page", "Assume every four-sided figure is a square", "Infer equal side lengths when no matching marks or measurements are given"],
    ["按圖形在頁面上的朝向命名", "假設每個四邊形都是正方形", "沒有相同記號或量度資料仍推斷各邊相等"]
  ),
  "p4-large-numbers": distractorSet(
    ["Reverse factor and multiple when deciding which number divides the other", "List multiples only and call every listed value a factor", "Divide the larger number by the smaller once and call the quotient the H.C.F."],
    ["判斷哪個數整除另一個數時，把因數和倍數倒轉", "只列倍數，並把每個列出的數稱為因數", "把較大數除以較小數一次，便把所得商稱為最大公因數"]
  ),
  "p4-decimals": distractorSet(
    ["Compare decimal digits from left to right without matching place values", "Assume the decimal with more written digits is always greater", "Align the left edges of decimal numerals instead of their decimal points"],
    ["未對齊位值，便由左至右逐個小數數字比較", "假設寫得較多位的小數一定較大", "把小數的左邊對齊，而不是把小數點對齊"]
  ),
  "p4-angles": distractorSet(
    ["Treat rectangle, rhombus, and square as mutually exclusive families", "Name the quadrilateral only from how it looks in the sketch", "Use equal-side information as proof of every rectangle property"],
    ["把長方形、菱形和正方形當作互不包含的類別", "只按草圖外觀為四邊形命名", "把邊相等資料當作所有長方形性質的證明"]
  ),
  "p4-perimeter-area": distractorSet(
    ["Multiply length and width when the question asks for perimeter", "Count an internal split twice as part of a composite shape's outside boundary", "Add component areas but report the result in centimetres rather than square centimetres"],
    ["題目求周界時把長和闊相乘", "求組合圖形外圍時把內部分割線重複計算", "把各部分面積相加後，卻以厘米而非平方厘米作答"]
  ),
  "p5-fractions-operations": distractorSet(
    ["Add numerators and denominators separately for unlike fractions", "Convert every fraction to a rounded decimal before operating", "Make only the numerators common while leaving unlike denominators unchanged"],
    ["異分母分數運算時分別把分子和分母相加", "運算前把每個分數都化成四捨五入小數", "只把分子改成相同，分母仍保持不同"]
  ),
  "p5-volume": distractorSet(
    ["Add length, width, and height to find volume", "Use square centimetres for a three-dimensional capacity", "Multiply only the two dimensions visible on the front face"],
    ["把長、闊和高相加來求體積", "以平方厘米表示三維容量", "只把正面可見的兩個尺寸相乘"]
  ),
  "p5-rates": distractorSet(
    ["Divide the item count by the total price", "Compare pack totals without finding the price for one equal item", "Multiply the total pack price by the number of items to obtain unit price"],
    ["以物件數量除以總價", "未求每件單價，便直接比較整包總價", "把整包總價乘物件數量來求單價"]
  ),
  "p5-charts-averages": distractorSet(
    ["Compare bars from different categories because their colours match", "Read a bar value from its pixel height without using the axis interval", "Use the difference between two bar heights as their combined total"],
    ["只因顏色相同，便比較不同類別的棒", "不使用坐標軸間距，只按棒的像素高度讀值", "把兩支棒的高度差當作兩者總和"]
  ),
  "p6-percentages": distractorSet(
    ["Treat 25% as the whole number 25 in the calculation", "Apply the given percentage to the changed amount instead of the stated original", "Subtract the percentage amount when the situation says the quantity increases"],
    ["在計算中把 25% 當作整數 25", "不以題目所述原數量為整體，改用變更後數量", "情境說數量增加時卻減去百分數所代表的量"]
  ),
  "p6-ratio-proportion": distractorSet(
    ["Divide the count by the total when finding a mean", "Sort the values and choose the middle one instead of calculating the mean", "Join categorical values with a line even when no ordered or continuous sequence exists"],
    ["求平均數時以數據個數除以總和", "把數值排序後選中間一個，而不計算平均數", "即使數據沒有有序或連續次序，仍把類別數值連成折線"]
  ),
  "p6-speed": distractorSet(
    ["Multiply distance by time when finding speed", "Write distance units alone for a speed answer", "Read a distance-time graph's height as speed instead of comparing change in distance with change in time"],
    ["求速率時把路程乘時間", "速率答案只寫路程單位", "把距離時間圖的高度當作速率，而不比較路程變化與時間變化"]
  ),
  "p6-pre-secondary-problem-solving": distractorSet(
    ["Calculate with the first two numbers before identifying the final target", "Use every number in one operation even when the quantities play different roles", "Stop after finding an intermediate total without answering what remains or changes"],
    ["未辨認最終目標，便先用頭兩個數計算", "即使各數量作用不同，仍把所有數放進同一運算", "求得中途總數便停止，沒有回答餘下或改變後的數量"]
  )
};

const commonCheckDistractorsByTopic: Partial<Record<string, DistractorSet>> = {
  integers: distractorSet(
    ["Confirm the result has the sign belonging to the numeral with more digits", "Recalculate with absolute values only and treat matching magnitudes as sufficient", "Check subtraction by repeating the same signed subtraction rather than using its inverse"],
    ["只檢查答案符號是否跟隨位數較多的數", "只用絕對值重算，並把大小相符當作充分檢查", "不用逆運算，而重複同一個帶符號減法作檢查"]
  ),
  "algebra-basics": distractorSet(
    ["Compare coefficients while disregarding whether the variable powers match", "Substitute only zero and accept expressions that agree at that single value", "Count the number of written terms instead of checking the combined expression"],
    ["只比較係數，不理會變量次方是否相同", "只代入零，兩式在這一個數值相等便接受", "只點算寫出的項數，不檢查合併後的代數式"]
  ),
  "linear-equations": distractorSet(
    ["Substitute the proposed solution into the left side only", "Restore balance by adding different values to the two sides", "Round the proposed solution before substituting it into the original equation"],
    ["只把擬議解代入方程左邊", "在等式兩邊加上不同數值來恢復平衡", "代回原方程前先把擬議解四捨五入"]
  ),
  "trigonometry-basics": distractorSet(
    ["Accept a sine or cosine value above 1 when the arithmetic is tidy", "Confirm side names from their drawn lengths rather than their positions relative to the named angle", "Switch to a different reference angle during the check"],
    ["算式整齊便接受大於 1 的正弦或餘弦值", "按圖上邊長而非相對指定角的位置核對邊名", "檢查途中改用另一個參照角"]
  ),
  "probability-s5": distractorSet(
    ["Check that each colour receives probability one half", "Reuse the original total as the denominator after a ball is removed", "Reverse the conditioning order and treat P(A|B) as P(B|A)"],
    ["檢查每種顏色是否都獲分配二分之一概率", "抽走一球後仍以原來總數作分母", "倒轉條件次序，把 P(A|B) 當作 P(B|A)"]
  ),
  "differentiation-intro": distractorSet(
    ["Confirm only that every exponent has been reduced by one", "Treat the derivative at a point as the original function value", "Keep a nonzero derivative for an additive constant"],
    ["只檢查每個指數是否已減一", "把某點的導數當作原函數值", "為加法常數保留非零導數"]
  ),
  calculus: distractorSet(
    ["Check only that f'(x)=0 and ignore the signs on both sides", "Treat the function value as though it were the tangent gradient", "Identify a maximum when f'(x) changes from negative to positive"],
    ["只檢查 f'(x)=0，而忽略駐點兩側的符號", "把函數值當作切線斜率", "f'(x) 由負變正時判定為極大值"]
  ),
  "statistics-s6": distractorSet(
    ["Verify z using (mean - x) divided by the standard deviation", "Divide by the variance and accept the result as a standard score", "Accept a calculation whose standard deviation denominator is zero"],
    ["以（平均數－x）除以標準差來核對 z", "除以方差並把結果當作標準分", "接受以零作標準差分母的計算"]
  ),
  ratios: distractorSet(
    ["Confirm equivalence after dividing only one ratio term", "Use the sum of the first ratio term and the total as the number of sharing parts", "Treat a part-to-part ratio as though its second term were the whole"],
    ["只把比的一項相除後便確認等值", "把比的第一項與總量相加作分配份數", "把部分與部分的比當作第二項就是整體"]
  ),
  "statistics-s1": distractorSet(
    ["Read the median before sorting the observations", "Use the range as the number of observations", "Accept a visual difference without checking whether the vertical axis is truncated"],
    ["未排列觀察值便讀取中位數", "把全距當作觀察值個數", "未檢查縱軸是否截斷，便接受圖上的視覺差異"]
  ),
  "probability-s2": distractorSet(
    ["Confirm the probabilities by giving each named category an equal share", "Accept experimental frequencies that add to more than the number of trials", "Compare theory and experiment without checking how many trials were run"],
    ["把相同概率分給每個具名類別來核對答案", "接受總和超過試驗次數的實驗頻數", "未檢查試驗次數便比較理論與實驗結果"]
  ),
  polynomials: distractorSet(
    ["Re-expand and accept a result with unlike powers merged", "Check a factorisation at only x = 0", "Verify the constant term but not the leading or middle terms"],
    ["重新展開後仍接受合併了不同次方項的結果", "只在 x = 0 時檢查因式分解", "只核對常數項，不核對首項和中間項"]
  ),
  "identities-square-patterns": distractorSet(
    ["Verify the identity at one convenient numerical pair only", "Accept an expansion whose middle term is missing", "Use the same positive middle term for both squared sum and squared difference"],
    ["只用一組方便的數值核對恆等式", "接受漏去中間項的展開式", "和的平方與差的平方都使用相同的正中間項"]
  ),
  "arc-length-sector-area": distractorSet(
    ["Confirm a sector answer using angle/180 as its circle fraction", "Use linear units for sector area", "Accept an arc length larger than the full circumference without revisiting the fraction"],
    ["以圓心角／180 作圓的分數來核對扇形答案", "扇形面積使用長度單位", "弧長大於整個圓周仍不重新檢查所取分數"]
  ),
  circles: distractorSet(
    ["Use the doubling relation between the angle at the centre and the angle at the circumference without confirming that they stand on the same arc", "Confirm a tangent theorem away from the point of contact", "Treat every chord as a radius when marking equal lengths"],
    ["未確認兩角由同一弧所對，便使用圓心角與圓周角的倍數關係", "在接觸點以外的位置核對切線定理", "標示相等長度時把每條弦都當作半徑"]
  ),
  "more-algebra": distractorSet(
    ["Check the simplified form while omitting the original denominator restriction", "Substitute an excluded value because it works in the cancelled expression", "Verify exponent division by subtracting bases instead of exponents"],
    ["核對約簡式時漏去原分母限制", "因不容許值代入約簡式可計算便接受它", "核對同底冪除法時把底數相減，而不是指數相減"]
  ),
  "advanced-functions": distractorSet(
    ["Accept logarithm arguments equal to zero", "Allow logarithm base 1 or a negative base", "Check an inverse exponential-logarithm pair in only one direction"],
    ["接受等於零的對數真數", "容許對數底為 1 或負數", "只按一個方向核對指數與對數的互逆關係"]
  ),
  "trigonometry-s5": distractorSet(
    ["Keep a negative amplitude instead of taking its magnitude", "Compare phase shift with period as though they were the same parameter", "Accept a solution list without checking whether either stated interval endpoint is also a solution"],
    ["保留負振幅，而不取其大小", "把相位移和週期當作同一參數比較", "未檢查指定區間的端點是否也是解，便接受解列表"]
  ),
  "exam-revision": distractorSet(
    ["Verify marks per minute when the required unit is minutes per mark", "Accept a rounded value with fewer decimal places than requested", "Allocate question times whose total exceeds the paper duration"],
    ["題目要求分鐘／分時卻核對分／分鐘", "接受少於題目指定小數位的近似值", "接受各題分配時間總和超過試卷時限"]
  ),
  "mixed-problem-solving": distractorSet(
    ["Compare graph and table numbers without reconciling their units", "Accept a calculation made before the target variable is defined", "Substitute speed and time into the wrong positions in d = vt"],
    ["未統一單位便比較圖像和表格數字", "未定義目標變量便接受已作的計算", "在 d = vt 中把速率和時間代入錯誤位置"]
  )
};

const youngLearnerFirstStepContextByTopic: Partial<Record<string, Question["prompt"]>> = {
  "p1-counting-number-bonds": { en: `Think about ${math("4+\\square=9")}.`, zh: `想一想 ${math("4+\\square=9")}。` },
  "p1-addition-subtraction": { en: `Mia has ${math("5")} stickers and gets ${math("2")} more.`, zh: `Mia 有 ${math("5")} 張貼紙，再得到 ${math("2")} 張。` },
  "p1-shapes-patterns": { en: "Look at the pattern ABAB from its first symbol.", zh: "由第一個符號開始看圖樣 ABAB。" },
  "p1-measurement-time": { en: "A clock shows half past 3.", zh: "鐘面顯示 3 時半。" },
  "p2-place-value": { en: `Read ${math("507")}.`, zh: `讀出 ${math("507")}。` },
  "p2-multiplication-foundations": { en: `Model ${math("5\\times2")} as equal groups.`, zh: `用相等組表示 ${math("5\\times2")}。` },
  "p2-money-time": { en: "A snack costs HK$6 and you pay HK$10.", zh: "小食售港幣 6 元，你付港幣 10 元。" },
  "p2-length-data": { en: "Estimate the height of a classroom door.", zh: "估計一扇課室門的高度。" }
};

function strategyLabelForTopic(topic: (typeof topics)[number]) {
  if (topic.id === "p3-measurement") return { en: "Measurement", zh: "度量" };
  if (topic.id === "p5-charts-averages") return { en: "Compound Bar Charts", zh: "複合棒形圖" };
  return questionTopicLabelForTopic(topic);
}

function firstStepOptionsForTopic(topic: (typeof topics)[number], drill: TopicDrill): NonNullable<Question["options"]> {
  const distractors = firstStepDistractorsByTopic[topic.id];
  if (!distractors) throw new Error(`Missing topic-specific first-step distractors: ${topic.id}`);
  return [drill.firstStep, ...distractors];
}

function commonCheckOptionsForTopic(topic: (typeof topics)[number], drill: TopicDrill): NonNullable<Question["options"]> {
  const distractors = commonCheckDistractorsByTopic[topic.id] ?? firstStepDistractorsByTopic[topic.id];
  if (!distractors) throw new Error(`Missing topic-specific common-check distractors: ${topic.id}`);
  return [drill.commonCheck, ...distractors];
}

function defaultDrillForTopic(topic: (typeof topics)[number]): TopicDrill {
  const blueprints = primaryQuestionBlueprints[topic.id];
  const keyFact = blueprints?.[0];
  const workedExample = blueprints?.[1];

  if (!keyFact || !workedExample) {
    throw new Error(`Missing practice drill for topic: ${topic.id}`);
  }

  return {
    firstStep: { en: "Choose the operation shown by the numbers or diagram", zh: "先按數字或圖像選擇合適運算" },
    keyFactPrompt: keyFact.prompt,
    keyFactAnswer: keyFact.answer,
    keyFactExplanation: keyFact.explanation,
    examplePrompt: workedExample.prompt,
    exampleAnswer: workedExample.answer,
    exampleExplanation: workedExample.explanation,
    commonCheck: { en: "Check the calculation and unit before answering", zh: "作答前檢查計算和單位" }
  };
}

function supplementalQuestionsForTopic(topic: (typeof topics)[number]): HongKongQuestionSeed[] {
  const drill = topicDrills[topic.id] ?? defaultDrillForTopic(topic);
  const topicLabel = questionTopicLabelForTopic(topic);
  const strategyLabel = strategyLabelForTopic(topic);
  const youngLearnerContext = youngLearnerFirstStepContextByTopic[topic.id];
  const conciseFirstStepExplanation = topic.grade === "P1" || topic.grade === "P2";
  const adjudicatedGenericFirstStep = adjudicatedGenericFirstStepTopicIds.has(topic.id);
  const adjudicatedGenericCommonCheck = adjudicatedGenericCommonCheckTopicIds.has(topic.id);

  return [
    {
      id: `supp-${topic.id}-first-step`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: {
        en: `When starting a question about ${strategyLabel.en}, which action is the best first step?${youngLearnerContext ? ` ${youngLearnerContext.en}` : ""}`,
        zh: `開始處理關於「${strategyLabel.zh}」的題目時，哪項行動是最佳的第一步？${youngLearnerContext ? ` ${youngLearnerContext.zh}` : ""}`
      },
      options: firstStepOptionsForTopic(topic, drill),
      answer: drill.firstStep.en,
      explanation: {
        en: drill.firstStepExplanation?.en ?? (conciseFirstStepExplanation
          ? `${drill.firstStep.en}. The key fact confirms it: ${drill.keyFactExplanation.en}`
          : adjudicatedGenericFirstStep
            ? `${drill.firstStep.en}. ${drill.keyFactExplanation.en}`
            : `${drill.firstStep.en}. The topic's key fact shows why this structure matters: ${drill.keyFactExplanation.en} The alternatives instead encode these specific misconceptions: ${firstStepDistractorsByTopic[topic.id].map((option) => `“${option.en}”`).join("; ")}.`),
        zh: drill.firstStepExplanation?.zh ?? (conciseFirstStepExplanation
          ? `${drill.firstStep.zh}。關鍵知識可核對這一步：${drill.keyFactExplanation.zh}`
          : adjudicatedGenericFirstStep
            ? `${drill.firstStep.zh}。${drill.keyFactExplanation.zh}`
            : `${drill.firstStep.zh}。本課題的關鍵知識說明這個結構為何重要：${drill.keyFactExplanation.zh} 其餘選項分別包含以下具體誤解：${firstStepDistractorsByTopic[topic.id].map((option) => `「${option.zh}」`).join("；")}。`)
      }
    },
    {
      id: `supp-${topic.id}-key-fact`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: "Low",
      type: "short-answer",
      prompt: drill.keyFactPrompt,
      answer: drill.keyFactAnswer,
      explanation: drill.keyFactExplanation
    },
    {
      id: `supp-${topic.id}-guided-example`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: drill.guidedDifficulty ?? topic.difficulty,
      type: "short-answer",
      prompt: drill.examplePrompt,
      answer: drill.exampleAnswer,
      explanation: drill.exampleExplanation,
      ...(drill.exampleDiagram ? { diagram: drill.exampleDiagram } : {})
    },
    {
      id: `supp-${topic.id}-common-check`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: {
        en: `Which check best prevents a typical mistake in ${strategyLabel.en}?`,
        zh: `哪項檢查最能避免「${strategyLabel.zh}」中的典型錯誤？`
      },
      options: commonCheckOptionsForTopic(topic, drill),
      answer: drill.commonCheck.en,
      explanation: drill.commonCheckExplanation ?? (adjudicatedGenericCommonCheck
        ? {
            en: `${drill.commonCheck.en}. ${drill.keyFactExplanation.en}`,
            zh: `${drill.commonCheck.zh}。${drill.keyFactExplanation.zh}`
          }
        : {
            en: `${drill.commonCheck.en}. This check is consistent with both the key fact (${drill.keyFactExplanation.en}) and the guided example (${drill.exampleExplanation.en}); the other checks would preserve a topic-specific error rather than expose it.`,
            zh: `${drill.commonCheck.zh}。這項檢查同時符合關鍵知識（${drill.keyFactExplanation.zh}）和引導例題（${drill.exampleExplanation.zh}）；其餘檢查會保留本課題的具體錯誤，而不能揭示錯誤。`
          })
    }
  ];
}

const cjkAnswerAliases: Record<string, string[]> = {
  "3 × 4": ["3*4", "3乘4", "3乘以4"],
  "4π cm": ["4 pi cm", "4pi cm", "4\\pi cm", "4π厘米", "4π 厘米"],
  "12π cm^2": ["12 pi cm^2", "12pi cm^2", "12\\pi cm^2", "12π cm²", "12π平方厘米", "12π 平方厘米"],
  "11 each, 3 remain": ["每人11張，餘3張", "每人 11 張，餘 3 張", "每人11張，餘下3張", "每人 11 張，餘下 3 張", "商11餘3", "商 11 餘 3"],
  "1.33 minutes per mark": ["1.33 min/mark", "1.33 min per mark", "1.33分鐘／分", "1.33 分鐘／分"],
  "1.50 minutes per mark": ["1.50 min/mark", "1.50 min per mark", "1.50分鐘／分", "1.50 分鐘／分"],
  "1 m 10 cm": ["1m10cm", "1 m 10cm", "1米10厘米", "1 米 10 厘米"],
  "2 m": ["2m", "2 米"],
  "hcf = 6; lcm = 36": ["H.C.F. = 6; L.C.M. = 36", "HCF=6;LCM=36", "最大公因數 = 6；最小公倍數 = 36", "最大公因數是6，最小公倍數是36"],
  "rectangle and rhombus": ["rectangle, rhombus", "長方形和菱形", "長方形、菱形"],
  rhombus: ["菱形"],
  "a classroom door": ["一扇課室門", "課室門"],
  "at the mean": ["平均數", "在平均數", "等於平均數"],
  centimetres: ["厘米"],
  circle: ["圓形"],
  decreasing: ["decreases", "遞減", "下降"],
  downward: ["向下", "開口向下"],
  "equilateral triangle": ["等邊三角形"],
  ii: ["第二象限"],
  "isosceles triangle": ["等腰三角形"],
  mean: ["平均數"],
  "known facts and target": ["已知資料和目標", "已知和目標"],
  obtuse: ["鈍角"],
  quadrilateral: ["四邊形"],
  "right angle": ["直角"],
  "shared quantities": ["共同量", "共同數量", "共同的量"],
  triangle: ["三角形"],
  "underline known facts and the question": ["在已知資料及題目所求之下畫線", "圈出已知資料和題目所問"],
  "x > -2": ["x>-2", "x 大於 -2"]
};

const strictFractionFormQuestionIds = new Set([
  "pq-p3-fractions-intro-2",
  "supp-p3-fractions-intro-key-fact",
  "supp-p3-fractions-intro-guided-example",
  "supp-probability-s2-guided-example",
  "pq-p5-fractions-operations-2",
  "supp-p5-fractions-operations-key-fact",
  "supp-p5-fractions-operations-guided-example"
]);

const equationAnswersRequiringVariable = new Set([
  "graph-quadratic-patterns-axis",
  "supp-quadratic-patterns-key-fact"
]);

const promptSuppliedUnitAnswerIds = new Set([
  "pq-p2-length-data-1"
]);

const orderedPairAnswersRequiringParentheses = new Set([
  "graph-quadratic-patterns-y-intercept"
]);

function addAlias(aliases: Set<string>, answer: string, alias: string) {
  const normalized = alias.trim();
  if (!normalized || normalized.toLowerCase() === answer.trim().toLowerCase()) return;
  aliases.add(normalized);
}

function terminatingDecimalAlias(numerator: number, denominator: number) {
  if (denominator === 0) return null;
  const value = numerator / denominator;
  const rounded = Number(value.toFixed(4));
  return Number.isFinite(rounded) ? String(rounded) : null;
}

function generatedAnswerAliases(
  answer: string,
  includeDecimalFractionAlias = true,
  includeBareLinearEquationAlias = true,
  includeBareQuantityAlias = true,
  includeBareCoordinateAlias = true
) {
  const aliases = new Set<string>();
  const trimmed = answer.trim();
  const compact = trimmed.replace(/\s+/g, "");

  const mixedNumber = trimmed.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedNumber) {
    // "1 3/7" must not alias to the collapsed "13/7" — that is a different
    // value. Alias the true improper-fraction and decimal forms instead.
    const numerator = Number(mixedNumber[2]);
    const denominator = Number(mixedNumber[3]);
    if (denominator > 0 && numerator < denominator) {
      const negative = mixedNumber[1].startsWith("-");
      const improperNumerator = Math.abs(Number(mixedNumber[1])) * denominator + numerator;
      addAlias(aliases, trimmed, `${negative ? "-" : ""}${improperNumerator}/${denominator}`);
      const decimal = terminatingDecimalAlias(negative ? -improperNumerator : improperNumerator, denominator);
      if (decimal) addAlias(aliases, trimmed, decimal);
    }
  } else {
    addAlias(aliases, trimmed, compact);
  }
  cjkAnswerAliases[trimmed.toLowerCase()]?.forEach((alias) => addAlias(aliases, trimmed, alias));

  const commaNumber = trimmed.match(/^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/);
  if (commaNumber) addAlias(aliases, trimmed, trimmed.replace(/,/g, ""));

  const coordinate = trimmed.match(/^\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)$/);
  if (coordinate && includeBareCoordinateAlias) {
    addAlias(aliases, trimmed, `${coordinate[1]}, ${coordinate[2]}`);
    addAlias(aliases, trimmed, `${coordinate[1]},${coordinate[2]}`);
  }

  const linearEquation = trimmed.match(/^([a-z])\s*=\s*(-?\d+(?:\.\d+)?)$/i);
  if (linearEquation) {
    addAlias(aliases, trimmed, `${linearEquation[1]}=${linearEquation[2]}`);
    if (includeBareLinearEquationAlias) addAlias(aliases, trimmed, linearEquation[2]);
  }

  const fraction = trimmed.match(/^(-?\d+)\/(-?\d+)$/);
  if (fraction) {
    addAlias(aliases, trimmed, `${fraction[1]} / ${fraction[2]}`);
    if (includeDecimalFractionAlias) {
      const decimal = terminatingDecimalAlias(Number(fraction[1]), Number(fraction[2]));
      if (decimal) addAlias(aliases, trimmed, decimal);
    }
  }

  const ratio = trimmed.match(/^(\d+):(\d+)$/);
  if (ratio) addAlias(aliases, trimmed, `${ratio[1]} : ${ratio[2]}`);

  const degree = trimmed.match(/^(-?\d+(?:\.\d+)?)°$/);
  if (degree) {
    if (includeBareQuantityAlias) addAlias(aliases, trimmed, degree[1]);
    addAlias(aliases, trimmed, `${degree[1]} degrees`);
    addAlias(aliases, trimmed, `${degree[1]} degree`);
    addAlias(aliases, trimmed, `${degree[1]}度`);
  }

  const percent = trimmed.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    if (includeBareQuantityAlias) addAlias(aliases, trimmed, percent[1]);
    addAlias(aliases, trimmed, `${percent[1]} %`);
    addAlias(aliases, trimmed, `${percent[1]} percent`);
    addAlias(aliases, trimmed, `${percent[1]}百分比`);
  }

  const currency = trimmed.match(/^HK\$\s*(-?\d+(?:\.\d+)?)$/i);
  if (currency) {
    if (includeBareQuantityAlias) addAlias(aliases, trimmed, currency[1]);
    addAlias(aliases, trimmed, `$${currency[1]}`);
    addAlias(aliases, trimmed, `HK$ ${currency[1]}`);
    addAlias(aliases, trimmed, `港幣 ${currency[1]} 元`);
    addAlias(aliases, trimmed, `${currency[1]}元`);
  }

  const unit = trimmed.match(/^(-?\d+(?:\.\d+)?)\s+(cm\^2|cm\^3|cm|mL|L|km\/h|km|m)$/i);
  if (unit) {
    const value = unit[1];
    const unitText = unit[2];
    if (includeBareQuantityAlias) addAlias(aliases, trimmed, value);
    addAlias(aliases, trimmed, `${value}${unitText}`);

    if (/^cm$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 厘米`);
    if (/^cm\^2$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 平方厘米`);
    if (/^cm\^3$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 立方厘米`);
    if (/^mL$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 毫升`);
    if (/^L$/i.test(unitText)) {
      addAlias(aliases, trimmed, `${value} 升`);
      addAlias(aliases, trimmed, `${value} 公升`);
    }
    if (/^km$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 公里`);
    if (/^m$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 米`);
    if (/^km\/h$/i.test(unitText)) {
      addAlias(aliases, trimmed, `${value}km/h`);
      addAlias(aliases, trimmed, `${value} kmh`);
      addAlias(aliases, trimmed, `${value} 公里每小時`);
    }
  }

  const oclock = trimmed.match(/^(\d{1,2}) o'clock$/i);
  if (oclock) {
    addAlias(aliases, trimmed, `${oclock[1]}:00`);
    if (includeBareQuantityAlias) addAlias(aliases, trimmed, oclock[1]);
    addAlias(aliases, trimmed, `${oclock[1]}時`);
  }

  const coefficientVariable = trimmed.match(/^(-?\d+)([a-z])$/i);
  if (coefficientVariable) {
    addAlias(aliases, trimmed, `${coefficientVariable[1]} ${coefficientVariable[2]}`);
    addAlias(aliases, trimmed, `${coefficientVariable[1]}*${coefficientVariable[2]}`);
  }

  const exponent = trimmed.match(/^(-?\d*)?([a-z])\^(\d+)$/i);
  if (exponent) {
    const coefficient = exponent[1] ?? "";
    if (coefficient) addAlias(aliases, trimmed, `${coefficient}*${exponent[2]}^${exponent[3]}`);
  }

  if (/^cm\^2$/i.test(trimmed)) {
    addAlias(aliases, trimmed, "cm2");
    addAlias(aliases, trimmed, "square centimetres");
    addAlias(aliases, trimmed, "平方厘米");
  }

  if (/^cm\^3$/i.test(trimmed)) {
    addAlias(aliases, trimmed, "cm3");
    addAlias(aliases, trimmed, "cubic centimetres");
    addAlias(aliases, trimmed, "立方厘米");
  }

  const multiplicationExpression = trimmed.match(/^(-?\d+)\s*×\s*(-?\d+)$/i);
  if (multiplicationExpression) {
    const leftFactor = multiplicationExpression[1];
    const rightFactor = multiplicationExpression[2];
    addAlias(aliases, trimmed, `${leftFactor}*${rightFactor}`);
    addAlias(aliases, trimmed, `${leftFactor} times ${rightFactor}`);
    addAlias(aliases, trimmed, `${leftFactor} × ${rightFactor}`);
    addAlias(aliases, trimmed, `${leftFactor}×${rightFactor}`);
    addAlias(aliases, trimmed, `${leftFactor}乘${rightFactor}`);
    addAlias(aliases, trimmed, `${leftFactor}乘以${rightFactor}`);
  }

  return Array.from(aliases);
}

function answerAliasesFor(
  answer: string,
  acceptedAnswers: string[] = [],
  includeDecimalFractionAlias = true,
  includeBareLinearEquationAlias = true,
  includeBareQuantityAlias = true,
  includeBareCoordinateAlias = true
) {
  const aliases = new Set<string>();
  [
    ...acceptedAnswers,
    ...generatedAnswerAliases(
      answer,
      includeDecimalFractionAlias,
      includeBareLinearEquationAlias,
      includeBareQuantityAlias,
      includeBareCoordinateAlias
    )
  ].forEach((alias) => addAlias(aliases, answer, alias));
  return Array.from(aliases);
}

function withGeneratedAnswerAliases(question: Question): Question {
  if (question.type === "multiple-choice") return question;
  // The EASE v2 package carries independently reviewed, response-shape-aware
  // aliases. Global convenience aliases (for example a decimal equivalent of
  // a required simplest fraction, or a bare result for a worked-method task)
  // would contradict its fail-closed production contracts.
  if (question.curriculumTrack === "HK" && /^hk-ease-\d+$/.test(question.id)) return question;
  const acceptedAnswers = answerAliasesFor(
    question.answer,
    question.acceptedAnswers,
    !strictFractionFormQuestionIds.has(question.id),
    !equationAnswersRequiringVariable.has(question.id),
    question.curriculumTrack !== "HK" || promptSuppliedUnitAnswerIds.has(question.id),
    !orderedPairAnswersRequiringParentheses.has(question.id)
  );
  return acceptedAnswers.length ? { ...question, acceptedAnswers } : question;
}

function withHongKongTrack(question: HongKongQuestionSeed): Question {
  return {
    ...question,
    curriculumTrack: "HK"
  };
}

const curatedQuestions: Question[] = [
  ...coreQuestions.map(withHongKongTrack),
  ...primaryQuestions.map(withHongKongTrack),
  ...graphQuestions.map(withHongKongTrack),
  ...topics.filter((topic) => topic.curriculumTrack === "HK").flatMap(supplementalQuestionsForTopic).map(withHongKongTrack),
  ...hongKongEasePracticeQuestions,
  ...mainlandPepPrimaryRagV1Questions,
  ...mainlandPepJuniorQuestions,
  ...mainlandPepHighQuestions,
  ...mainlandBnuJuniorQuestions,
  ...mainlandBnuPrimaryQuestions,
  ...mainlandBnuHighQuestions,
  ...mainlandHjbJuniorQuestions,
  ...mainlandHjbPrimaryQuestions,
  ...mainlandHjbHighQuestions,
  ...usArkansasQuestions,
  ...usFloridaMiddleSchoolQuestions,
  ...usMathLiveQuestions.filter((question) => question.curriculumTrack !== "US_CA_MATH"),
  ...usCaliforniaQuestions
];

const resolvedQuestions: Question[] = applyHongKongResidual47Repairs(curatedQuestions
  .map(withResolvedMainlandPepQuestionAssets)
  .map(withGeneratedAnswerAliases));

const hongKongQuestionVersioning = versionMateriallyChangedHongKongQuestions(resolvedQuestions);

export const questions: Question[] = hongKongQuestionVersioning.questions;
export const activeHongKongQuestionIdByHistoricalId = hongKongQuestionVersioning.activeIdByHistoricalId;
export const retiredHongKongQuestionIds = hongKongQuestionVersioning.retiredHistoricalIds;
