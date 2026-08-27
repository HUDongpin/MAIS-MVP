import type { Question } from "@/types";
import { withResolvedMainlandPepQuestionAssets } from "@/lib/mainlandPepQuestionAssets";
import { hongKongEasePracticeQuestions } from "./hongKongEasePracticeQuestions";
import { mainlandBnuHighQuestions } from "./mainlandBnuHighQuestions";
import { mainlandBnuJuniorQuestions } from "./mainlandBnuJuniorQuestions";
import { mainlandHjbJuniorQuestions } from "./mainlandHjbJuniorQuestions";
import { mainlandPepHighQuestions } from "./mainlandPepHighQuestions";
import { mainlandPepJuniorQuestions } from "./mainlandPepJuniorQuestions";
import { mainlandPepPrimaryRagV1Questions } from "./mainlandPepPrimaryQuestions";
import { topics } from "./topics";
import { usArkansasQuestions } from "./usArkansasQuestions";
import { usCaliforniaQuestions } from "./usCaliforniaQuestions";
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
    grade: "S3",
    topicId: "quadratic-patterns",
    topic: { en: "Quadratic Patterns", zh: "二次規律" },
    difficulty: "High",
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
    difficulty: "High",
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
    difficulty: "High",
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
    difficulty: "High",
    type: "multiple-choice",
    prompt: { en: `A fair die is rolled once. What is ${math(String.raw`P(\text{rolling an even number})`)}?`, zh: `擲一次公平骰子，${math(String.raw`P(\text{擲出偶數})`)} 是多少？` },
    options: [
      { en: "1/6", zh: "1/6" },
      { en: "1/3", zh: "1/3" },
      { en: "1/2", zh: "1/2" },
      { en: "2/3", zh: "2/3" }
    ],
    answer: "1/2",
    explanation: { en: `Even outcomes are ${math("2, 4, 6")}, so ${math(String.raw`\frac{3}{6} = \frac{1}{2}`)}.`, zh: `偶數結果為 ${math("2, 4, 6")}，所以 ${math(String.raw`\frac{3}{6} = \frac{1}{2}`)}。` }
  },
  {
    id: "q10",
    grade: "S5",
    topicId: "differentiation-intro",
    topic: { en: "Differentiation Intro", zh: "微分入門" },
    difficulty: "High",
    type: "short-answer",
    prompt: { en: `Differentiate ${math("y = x^2")} with respect to ${math("x")}.`, zh: `對 ${math("y = x^2")} 關於 ${math("x")} 求導。` },
    answer: "2x",
    explanation: { en: `Using the power rule, ${math(String.raw`\frac{d}{dx}(x^2) = 2x`)}.`, zh: `利用冪法則，${math(String.raw`\frac{d}{dx}(x^2) = 2x`)}。` }
  },
  {
    id: "q11",
    grade: "S6",
    topicId: "calculus",
    topic: { en: "Calculus", zh: "微積分" },
    difficulty: "High",
    type: "multiple-choice",
    prompt: { en: `If ${math("f'(x)")} changes from positive to negative at ${math("x = 2")}, what may occur at ${math("x = 2")}?`, zh: `若 ${math("f'(x)")} 在 ${math("x = 2")} 由正變負，${math("x = 2")} 可能出現甚麼？` },
    options: [
      { en: "Local maximum", zh: "局部最大值" },
      { en: "Local minimum", zh: "局部最小值" },
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
    topic: { en: "Statistics", zh: "統計" },
    difficulty: "High",
    type: "fill-in",
    prompt: { en: `A normal distribution has mean ${math("50")} and standard deviation ${math("10")}. What is the ${math("z")}-score for ${math("x = 70")}?`, zh: `某常態分佈平均數為 ${math("50")}，標準差為 ${math("10")}。${math("x = 70")} 的 ${math("z")} 分數是多少？` },
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
	    prompt: { en: `A bag has ${math("2")} red balls and ${math("3")} blue balls. What is ${math(String.raw`P(\text{red})`)}?`, zh: `袋中有 ${math("2")} 個紅球和 ${math("3")} 個藍球。${math(String.raw`P(\text{紅球})`)} 是多少？` },
	    options: [
	      { en: "2/5", zh: "2/5" },
	      { en: "3/5", zh: "3/5" },
	      { en: "1/2", zh: "1/2" },
	      { en: "2/3", zh: "2/3" }
	    ],
	    answer: "2/5",
	    explanation: { en: `There are ${math("2")} red outcomes out of ${math("5")} total balls, so ${math(String.raw`P(\text{red}) = \frac{2}{5}`)}.`, zh: `共有 ${math("5")} 個球，其中 ${math("2")} 個是紅球，所以 ${math(String.raw`P(\text{紅球}) = \frac{2}{5}`)}。` }
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
	    id: "q19",
	    grade: "S3",
	    topicId: "circles",
	    topic: { en: "Circles", zh: "圓" },
	    difficulty: "High",
	    type: "multiple-choice",
	    prompt: { en: `The angle at the centre is ${math("100^\\circ")}. What is the angle at the circumference standing on the same arc?`, zh: `圓心角是 ${math("100^\\circ")}。同弧上的圓周角是多少？` },
	    options: [
	      { en: "50°", zh: "50°" },
	      { en: "80°", zh: "80°" },
	      { en: "100°", zh: "100°" },
	      { en: "200°", zh: "200°" }
	    ],
	    answer: "50°",
	    explanation: { en: `The angle at the centre is twice the angle at the circumference, so ${math("100^\\circ / 2 = 50^\\circ")}.`, zh: `圓心角是同弧圓周角的兩倍，所以 ${math("100^\\circ / 2 = 50^\\circ")}。` }
	  },
	  {
	    id: "q20",
	    grade: "S4",
	    topicId: "more-algebra",
	    topic: { en: "More Algebra", zh: "進階代數" },
	    difficulty: "High",
	    type: "short-answer",
	    prompt: { en: `Simplify: ${math(String.raw`x^3 / x`)}.`, zh: `化簡：${math(String.raw`x^3 / x`)}。` },
	    answer: "x^2",
	    explanation: { en: `Subtract indices when dividing powers with the same base: ${math("x^3 / x = x^2")}.`, zh: `同底冪相除時指數相減：${math("x^3 / x = x^2")}。` }
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
	    difficulty: "High",
	    type: "multiple-choice",
	    prompt: { en: `For ${math("f(x) = x^2 + 1")}, what is ${math("f(-2)")}?`, zh: `若 ${math("f(x) = x^2 + 1")}，${math("f(-2)")} 是多少？` },
	    options: [
	      { en: "-3", zh: "-3" },
	      { en: "3", zh: "3" },
	      { en: "5", zh: "5" },
	      { en: "9", zh: "9" }
	    ],
	    answer: "5",
	    explanation: { en: `Substitute ${math("x = -2")}: ${math("(-2)^2 + 1 = 4 + 1 = 5")}.`, zh: `代入 ${math("x = -2")}：${math("(-2)^2 + 1 = 4 + 1 = 5")}。` }
	  },
	  {
	    id: "q23",
	    grade: "S5",
	    topicId: "trigonometry-s5",
	    topic: { en: "Trigonometry", zh: "三角學" },
	    difficulty: "High",
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
	    difficulty: "High",
	    type: "multiple-choice",
	    prompt: { en: `A ${math("10")}-mark question should take about ${math("15")} minutes. How many minutes per mark is that?`, zh: `一題 ${math("10")} 分題目建議用約 ${math("15")} 分鐘。平均每分應用多少分鐘？` },
	    options: [
	      { en: "0.5", zh: "0.5" },
	      { en: "1", zh: "1" },
	      { en: "1.5", zh: "1.5" },
	      { en: "2", zh: "2" }
	    ],
	    answer: "1.5",
	    explanation: { en: `Divide time by marks: ${math("15 / 10 = 1.5")} minutes per mark.`, zh: `用時間除以分數：${math("15 / 10 = 1.5")} 分鐘每分。` }
	  },
	  {
	    id: "q25",
	    grade: "S6",
	    topicId: "mixed-problem-solving",
	    topic: { en: "Mixed Problem Solving", zh: "綜合解難" },
	    difficulty: "High",
	    type: "multiple-choice",
	    prompt: { en: "A problem combines a graph and an equation. What is usually the safest first step?", zh: "一道題同時包含圖像和方程。通常最安全的第一步是甚麼？" },
	    options: [
	      { en: "Guess the answer", zh: "猜答案" },
	      { en: "List given facts and the target", zh: "列出已知資料和要求" },
	      { en: "Skip the graph", zh: "跳過圖像" },
	      { en: "Use the longest formula", zh: "使用最長的公式" }
	    ],
	    answer: "List given facts and the target",
	    explanation: { en: "For mixed problems, first identify what is given, what is required, and how each representation connects.", zh: "綜合題應先辨認已知、要求，以及不同表示方式如何連繫。" }
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
	  {
	    id: "q28",
	    grade: "S2",
	    topicId: "coordinates",
	    topic: { en: "Coordinates", zh: "坐標" },
	    difficulty: "Medium",
	    type: "graph",
	    prompt: { en: "The diagram shows line AB. What is the gradient of AB?", zh: "圖中顯示直線 AB。AB 的斜率是多少？" },
	    answer: "1",
	    acceptedAnswers: ["1/1"],
	    explanation: { en: `From ${math("A(1,1)")} to ${math("B(4,4)")}, the rise and run are both ${math("3")}, so the gradient is ${math("1")}.`, zh: `由 ${math("A(1,1)")} 到 ${math("B(4,4)")}，升幅和橫距同為 ${math("3")}，所以斜率是 ${math("1")}。` },
	    diagram: {
	      kind: "coordinate-grid",
	      xRange: [0, 5],
	      yRange: [0, 5],
	      points: [
	        { label: "A", x: 1, y: 1 },
	        { label: "B", x: 4, y: 4 }
	      ],
	      lines: [
	        {
	          label: "AB",
	          points: [
	            { x: 1, y: 1 },
	            { x: 4, y: 4 }
	          ]
	        }
	      ]
	    }
	  }
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
      explanation: { en: "A triangle has exactly 3 sides.", zh: "三角形正正有 3 條邊。" }
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
        { en: "3 x 4", zh: "3 x 4" },
        { en: "4 x 4", zh: "4 x 4" },
        { en: "3 + 4", zh: "3 + 4" },
        { en: "4 - 3", zh: "4 - 3" }
      ],
      answer: "3 x 4",
      explanation: { en: `${math("4")} is added ${math("3")} times, so it is ${math("3 \\times 4")}.`, zh: `${math("4")} 加了 ${math("3")} 次，所以是 ${math("3 \\times 4")}。` }
    },
    {
      id: "pq-p2-multiplication-foundations-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Find ${math("5 \\times 2")}.`, zh: `計算 ${math("5 \\times 2")}。` },
      answer: "10",
      explanation: { en: `${math("5 \\times 2")} means two groups of five, which is ${math("10")}.`, zh: `${math("5 \\times 2")} 表示兩組五，共 ${math("10")}。` }
    }
  ],
  "p2-money-time": [
    {
      id: "pq-p2-money-time-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `A snack costs HK$${math("8")}. You pay HK$${math("10")}. How much change do you get?`, zh: `小食售港幣 ${math("8")} 元，你付港幣 ${math("10")} 元，應找回多少？` },
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
      prompt: { en: `A ribbon is ${math("18")} cm long. You cut off ${math("5")} cm. How many cm remain?`, zh: `一條絲帶長 ${math("18")} 厘米，剪去 ${math("5")} 厘米，還剩多少厘米？` },
      answer: "13 cm",
      explanation: { en: `${math("18 - 5 = 13")} cm.`, zh: `${math("18 - 5 = 13")} 厘米。` }
    },
    {
      id: "pq-p2-length-data-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `A bar chart shows ${math("6")} apples and ${math("4")} bananas. How many fruits are shown?`, zh: `棒形圖顯示 ${math("6")} 個蘋果和 ${math("4")} 隻香蕉，共有多少水果？` },
      options: [
        { en: "2", zh: "2" },
        { en: "4", zh: "4" },
        { en: "10", zh: "10" },
        { en: "24", zh: "24" }
      ],
      answer: "10",
      explanation: { en: `${math("6 + 4 = 10")}.`, zh: `${math("6 + 4 = 10")}。` }
    }
  ],
  "p3-multiplication-division": [
    {
      id: "pq-p3-multiplication-division-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Find ${math("7 \\times 6")}.`, zh: `計算 ${math("7 \\times 6")}。` },
      answer: "42",
      explanation: { en: `${math("7 \\times 6 = 42")}.`, zh: `${math("7 \\times 6 = 42")}。` }
    },
    {
      id: "pq-p3-multiplication-division-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `${math("24")} sweets are shared equally among ${math("4")} children. How many does each child get?`, zh: `${math("24")} 粒糖平均分給 ${math("4")} 個小朋友，每人有多少粒？` },
      options: [
        { en: "4", zh: "4" },
        { en: "6", zh: "6" },
        { en: "8", zh: "8" },
        { en: "20", zh: "20" }
      ],
      answer: "6",
      explanation: { en: `${math("24 \\div 4 = 6")}.`, zh: `${math("24 \\div 4 = 6")}。` }
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
        { en: "litres", zh: "公升" },
        { en: "kilograms", zh: "公斤" }
      ],
      answer: "centimetres",
      explanation: { en: "A pencil is a small length, so centimetres are suitable.", zh: "鉛筆是較短的長度，適合用厘米。" }
    },
    {
      id: "pq-p3-measurement-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A bottle has ${math("1")} L of water. That is how many mL?`, zh: `一個水樽有 ${math("1")} 公升水，即是多少毫升？` },
      answer: "1000 mL",
      explanation: { en: `${math("1")} L ${math("= 1000")} mL.`, zh: `${math("1")} 公升 ${math("= 1000")} 毫升。` }
    }
  ],
  "p3-geometry-patterns": [
    {
      id: "pq-p3-geometry-patterns-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: "Which angle is a right angle?", zh: "哪一個角是直角？" },
      options: [
        { en: "30°", zh: "30°" },
        { en: "60°", zh: "60°" },
        { en: "90°", zh: "90°" },
        { en: "120°", zh: "120°" }
      ],
      answer: "90°",
      explanation: { en: `A right angle is ${math("90^\\circ")}.`, zh: `直角是 ${math("90^\\circ")}。` }
    },
    {
      id: "pq-p3-geometry-patterns-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Continue the pattern: ${math("3, 6, 9, 12, \\square")}.`, zh: `延續規律：${math("3, 6, 9, 12, \\square")}。` },
      answer: "15",
      explanation: { en: `The pattern adds ${math("3")} each time, so the next number is ${math("15")}.`, zh: `規律是每次加 ${math("3")}，所以下一個數是 ${math("15")}。` }
    }
  ],
  "p4-large-numbers": [
    {
      id: "pq-p4-large-numbers-1",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `Which number is greater than ${math("12,450")}?`, zh: `哪個數大於 ${math("12,450")}？` },
      options: [
        { en: "12,405", zh: "12,405" },
        { en: "12,449", zh: "12,449" },
        { en: "12,500", zh: "12,500" },
        { en: "12,045", zh: "12,045" }
      ],
      answer: "12,500",
      explanation: { en: `${math("12,500")} is ${math("50")} more than ${math("12,450")}.`, zh: `${math("12,500")} 比 ${math("12,450")} 多 ${math("50")}。` }
    },
    {
      id: "pq-p4-large-numbers-2",
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Round ${math("3,684")} to the nearest hundred.`, zh: `把 ${math("3,684")} 取近似值至最接近的百位。` },
      answer: "3,700",
      explanation: { en: `The tens digit is ${math("8")}, so ${math("3,684")} rounds up to ${math("3,700")}.`, zh: `十位數字是 ${math("8")}，所以 ${math("3,684")} 進上成 ${math("3,700")}。` }
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
      prompt: { en: `An angle of ${math("120^\\circ")} is what type?`, zh: `${math("120^\\circ")} 是哪一類角？` },
      options: [
        { en: "acute", zh: "銳角" },
        { en: "right", zh: "直角" },
        { en: "obtuse", zh: "鈍角" },
        { en: "straight", zh: "平角" }
      ],
      answer: "obtuse",
      explanation: { en: `An obtuse angle is greater than ${math("90^\\circ")} and less than ${math("180^\\circ")}.`, zh: `鈍角大於 ${math("90^\\circ")} 而小於 ${math("180^\\circ")}。` }
    },
    {
      id: "pq-p4-angles-2",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Two angles on a straight line include ${math("75^\\circ")}. Find the other angle.`, zh: `一直線上的兩個角，其中一個是 ${math("75^\\circ")}。求另一個角。` },
      answer: "105°",
      explanation: { en: `Angles on a straight line add to ${math("180^\\circ")}, so ${math("180 - 75 = 105")}.`, zh: `一直線上的角和為 ${math("180^\\circ")}，所以 ${math("180 - 75 = 105")}。` }
    }
  ],
  "p4-perimeter-area": [
    {
      id: "pq-p4-perimeter-area-1",
      difficulty: "Medium",
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
      prompt: { en: `Find ${math("1/4 + 2/4")}.`, zh: `計算 ${math("1/4 + 2/4")}。` },
      answer: "3/4",
      explanation: { en: `Same denominators: add numerators to get ${math("3/4")}.`, zh: `分母相同，分子相加得 ${math("3/4")}。` }
    },
    {
      id: "pq-p5-fractions-operations-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Simplify ${math("6/8")}.`, zh: `約簡 ${math("6/8")}。` },
      options: [
        { en: "2/3", zh: "2/3" },
        { en: "3/4", zh: "3/4" },
        { en: "6/4", zh: "6/4" },
        { en: "8/6", zh: "8/6" }
      ],
      answer: "3/4",
      explanation: { en: `Divide numerator and denominator by ${math("2")}: ${math("6/8 = 3/4")}.`, zh: `分子和分母同除以 ${math("2")}：${math("6/8 = 3/4")}。` }
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
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `A pack of ${math("4")} pens costs HK$${math("20")}. What is the cost per pen?`, zh: `${math("4")} 支筆售港幣 ${math("20")} 元，每支多少元？` },
      answer: "HK$5",
      explanation: { en: `${math("20 \\div 4 = 5")}, so each pen costs HK$5.`, zh: `${math("20 \\div 4 = 5")}，所以每支港幣 5 元。` }
    },
    {
      id: "pq-p5-rates-2",
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: { en: `A car travels ${math("60")} km in ${math("2")} hours. What is its speed?`, zh: `汽車 ${math("2")} 小時行 ${math("60")} 公里，速率是多少？` },
      options: [
        { en: "20 km/h", zh: "每小時 20 公里" },
        { en: "30 km/h", zh: "每小時 30 公里" },
        { en: "58 km/h", zh: "每小時 58 公里" },
        { en: "120 km/h", zh: "每小時 120 公里" }
      ],
      answer: "30 km/h",
      explanation: { en: `Speed ${math("= 60 \\div 2 = 30")} km/h.`, zh: `速率 ${math("= 60 \\div 2 = 30")} 公里每小時。` }
    }
  ],
  "p5-charts-averages": [
    {
      id: "pq-p5-charts-averages-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Find the mean of ${math("6, 8, 10")}.`, zh: `求 ${math("6, 8, 10")} 的平均數。` },
      answer: "8",
      explanation: { en: `${math("(6 + 8 + 10) \\div 3 = 8")}.`, zh: `${math("(6 + 8 + 10) \\div 3 = 8")}。` }
    },
    {
      id: "pq-p5-charts-averages-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `A chart shows ${math("12")} sunny days and ${math("8")} rainy days. How many days are shown?`, zh: `圖表顯示 ${math("12")} 天晴天和 ${math("8")} 天雨天，共顯示多少天？` },
      options: [
        { en: "4", zh: "4" },
        { en: "8", zh: "8" },
        { en: "20", zh: "20" },
        { en: "96", zh: "96" }
      ],
      answer: "20",
      explanation: { en: `${math("12 + 8 = 20")}.`, zh: `${math("12 + 8 = 20")}。` }
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
      difficulty: "Low",
      type: "short-answer",
      prompt: { en: `Write ${math("0.25")} as a percentage.`, zh: `把 ${math("0.25")} 寫成百分數。` },
      answer: "25%",
      explanation: { en: `${math("0.25 = 25\\%")}.`, zh: `${math("0.25 = 25\\%")}。` }
    }
  ],
  "p6-ratio-proportion": [
    {
      id: "pq-p6-ratio-proportion-1",
      difficulty: "Medium",
      type: "short-answer",
      prompt: { en: `Share ${math("30")} in the ratio ${math("2:3")}. What is the larger share?`, zh: `把 ${math("30")} 按 ${math("2:3")} 分配。較大的一份是多少？` },
      answer: "18",
      explanation: { en: `There are ${math("5")} parts; one part is ${math("30 \\div 5 = 6")}; larger share ${math("3 \\times 6 = 18")}.`, zh: `共有 ${math("5")} 份；每份 ${math("30 \\div 5 = 6")}；較大份是 ${math("3 \\times 6 = 18")}。` }
    },
    {
      id: "pq-p6-ratio-proportion-2",
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: `Which ratio is equivalent to ${math("3:4")}?`, zh: `哪個比與 ${math("3:4")} 等值？` },
      options: [
        { en: "6:8", zh: "6:8" },
        { en: "4:3", zh: "4:3" },
        { en: "9:8", zh: "9:8" },
        { en: "3:8", zh: "3:8" }
      ],
      answer: "6:8",
      explanation: { en: `Multiply both parts of ${math("3:4")} by ${math("2")} to get ${math("6:8")}.`, zh: `${math("3:4")} 兩項同乘 ${math("2")} 得 ${math("6:8")}。` }
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
        { en: "Guess quickly", zh: "快速猜答案" },
        { en: "Underline known facts and the question", zh: "畫出已知資料和問題" },
        { en: "Skip all units", zh: "跳過所有單位" },
        { en: "Use any formula", zh: "任意使用公式" }
      ],
      answer: "Underline known facts and the question",
      explanation: { en: "A clear list of known facts and the target helps plan the steps.", zh: "清楚列出已知資料和目標，有助規劃步驟。" }
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

const primaryQuestions: HongKongQuestionSeed[] = topics.filter((topic) => topic.curriculumTrack === "HK").flatMap((topic) => {
  if (!topic.grade.startsWith("P")) return [];
  const blueprints = primaryQuestionBlueprints[topic.id] ?? [];
  return blueprints.map((blueprint) => ({
    ...blueprint,
    grade: topic.grade,
    topicId: topic.id,
    topic: topic.title
  }));
});

type TopicDrill = {
  firstStep: Question["prompt"];
  keyFactPrompt: Question["prompt"];
  keyFactAnswer: string;
  keyFactExplanation: Question["explanation"];
  examplePrompt: Question["prompt"];
  exampleAnswer: string;
  exampleExplanation: Question["explanation"];
  commonCheck: Question["prompt"];
};

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
        points: [
          { label: "V", x: 1, y: -4 }
        ],
        lines: [
          {
            label: "parabola",
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
      acceptedAnswers: ["x=-2", "-2"],
      explanation: { en: `Matching points are equally spaced from ${math("x = -2")}, and the vertex lies on this vertical line.`, zh: `對應點與 ${math("x = -2")} 的距離相同，而頂點亦在這條垂直線上。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-5, 2],
        yRange: [-2, 5],
        points: [
          { label: "V", x: -2, y: -1 }
        ],
        lines: [
          {
            label: "parabola",
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
      prompt: { en: "Where does the parabola meet the y-axis?", zh: "拋物線在哪一點與 y 軸相交？" },
      answer: "(0, -4)",
      acceptedAnswers: ["(0,-4)", "0, -4", "0,-4", "-4"],
      explanation: { en: `The graph crosses the ${math("y")}-axis when ${math("x = 0")}, at ${math("(0, -4)")}.`, zh: `圖像在 ${math("x = 0")} 時與 ${math("y")} 軸相交，交點是 ${math("(0, -4)")}。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [-4, 4],
        yRange: [-5, 6],
        points: [
          { label: "Y", x: 0, y: -4 }
        ],
        lines: [
          {
            label: "parabola",
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
        points: [
          { label: "A", x: 1, y: 0 },
          { label: "B", x: 3, y: 0 }
        ],
        lines: [
          {
            label: "parabola",
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
        points: [
          { label: "V", x: 0, y: 4 }
        ],
        lines: [
          {
            label: "parabola",
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
        points: [
          { label: "C", x: -3, y: 2 }
        ]
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
        points: [
          { label: "P", x: -4, y: 3 }
        ]
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
        points: [
          { label: "A", x: 2, y: 5 }
        ],
        lines: [
          {
            label: "f",
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
        points: [
          { label: "Z", x: 2, y: 0 }
        ],
        lines: [
          {
            label: "f",
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
        points: [
          { label: "A", x: -1, y: 2 },
          { label: "B", x: 3, y: 4 }
        ],
        lines: [
          {
            label: "AB",
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
        points: [
          { label: "A", x: -2, y: -1 },
          { label: "B", x: 4, y: 3 }
        ],
        lines: [
          {
            label: "AB",
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
        points: [
          { label: "E", x: 4, y: 8 }
        ],
        lines: [
          {
            label: "scores",
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
      acceptedAnswers: ["6", "6km", "6 km"],
      explanation: { en: `At ${math("2")} hours, the graph shows ${math("6")} km.`, zh: `在 ${math("2")} 小時時，圖像顯示 ${math("6")} 公里。` },
      diagram: {
        kind: "coordinate-grid",
        xRange: [0, 5],
        yRange: [0, 8],
        points: [
          { label: "D", x: 2, y: 6 }
        ],
        lines: [
          {
            label: "journey",
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
  "p4-angles": [
    {
      id: "graph-p4-angles-straight-line",
      difficulty: "Medium",
      type: "graph",
      prompt: {
        en: `In the figure, AOB is a straight line and ${math("\\angle AOC = 130^\\circ")}. Find the angle ${math("x")}.`,
        zh: `圖中 AOB 是直線，${math("\\angle AOC = 130^\\circ")}。求角 ${math("x")}。`
      },
      answer: "50°",
      acceptedAnswers: ["50", "50 degrees", "50度"],
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
        ]
      }
    }
  ],
  "p5-volume": [
    {
      id: "graph-p5-volume-cube",
      difficulty: "Medium",
      type: "graph",
      prompt: {
        en: "The figure shows a cube. Every edge has the length marked in the figure. Find its volume.",
        zh: "圖中顯示一個正方體，每條棱長如圖所示。求它的體積。"
      },
      answer: "27 cm^3",
      explanation: {
        en: `Every edge of the cube is ${math("3")} cm, so the volume ${math("= 3 \\times 3 \\times 3 = 27")} cubic centimetres.`,
        zh: `正方體每條棱長都是 ${math("3")} 厘米，所以體積 ${math("= 3 \\times 3 \\times 3 = 27")} 立方厘米。`
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
    topic: topic.title
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
    firstStep: { en: "Decide whether the story adds to or takes away", zh: "先判斷故事是增加還是減少" },
    keyFactPrompt: { en: `Liam has ${math("8")} pencils and gets ${math("3")} more. How many pencils does he have now?`, zh: `Liam 有 ${math("8")} 支鉛筆，又得到 ${math("3")} 支。現在共有多少支鉛筆？` },
    keyFactAnswer: "11",
    keyFactExplanation: { en: `${math("8 + 3 = 11")}.`, zh: `${math("8 + 3 = 11")}。` },
    examplePrompt: { en: `Find ${math("12 - 5")}.`, zh: `計算 ${math("12 - 5")}。` },
    exampleAnswer: "7",
    exampleExplanation: { en: `Counting back ${math("5")} from ${math("12")} gives ${math("7")}.`, zh: `由 ${math("12")} 倒數 ${math("5")} 得 ${math("7")}。` },
    commonCheck: { en: "Check the story action before choosing addition or subtraction", zh: "先檢查故事動作，再決定用加法還是減法" }
  },
  "p1-shapes-patterns": {
    firstStep: { en: "Name the repeating unit or count the sides", zh: "先說出重複單位或數邊數" },
    keyFactPrompt: { en: `How many sides does a square have?`, zh: `正方形有多少條邊？` },
    keyFactAnswer: "4",
    keyFactExplanation: { en: `A square has ${math("4")} equal sides.`, zh: `正方形有 ${math("4")} 條相等的邊。` },
    examplePrompt: { en: "Continue the pattern: triangle, circle, triangle, circle, ?", zh: "延續規律：三角形、圓形、三角形、圓形、？" },
    exampleAnswer: "triangle",
    exampleExplanation: { en: "The pattern repeats triangle then circle.", zh: "規律是三角形、圓形重複出現。" },
    commonCheck: { en: "Check one full repeat before choosing the next shape", zh: "先找出一組完整重複，再選下一個圖形" }
  },
  "p1-measurement-time": {
    firstStep: { en: "Choose the attribute first: length, time, or order", zh: "先判斷量度的是長度、時間還是次序" },
    keyFactPrompt: { en: `How many minutes are in ${math("1")} hour?`, zh: `${math("1")} 小時有多少分鐘？` },
    keyFactAnswer: "60",
    keyFactExplanation: { en: `${math("1")} hour is ${math("60")} minutes.`, zh: `${math("1")} 小時等於 ${math("60")} 分鐘。` },
    examplePrompt: { en: `What time is shown by a clock with the hour hand at ${math("5")} and the minute hand at ${math("12")}?`, zh: `時針指向 ${math("5")}、分針指向 ${math("12")} 是甚麼時間？` },
    exampleAnswer: "5 o'clock",
    exampleExplanation: { en: `The minute hand at ${math("12")} shows an o'clock time, so it is 5 o'clock.`, zh: `分針指向 ${math("12")} 表示整點，所以是 5 時。` },
    commonCheck: { en: "Check the unit or clock hand before answering", zh: "作答前先檢查單位或鐘面指針" }
  },
  "p2-place-value": {
    firstStep: { en: "Read hundreds, tens, and ones in order", zh: "按百位、十位、個位順序讀數" },
    keyFactPrompt: { en: `In ${math("735")}, what digit is in the hundreds place?`, zh: `在 ${math("735")} 中，百位數字是甚麼？` },
    keyFactAnswer: "7",
    keyFactExplanation: { en: `${math("735")} has ${math("7")} hundreds.`, zh: `${math("735")} 有 ${math("7")} 個百。` },
    examplePrompt: { en: `Write ${math("500 + 20 + 9")} as one number.`, zh: `把 ${math("500 + 20 + 9")} 寫成一個數。` },
    exampleAnswer: "529",
    exampleExplanation: { en: `${math("500 + 20 + 9 = 529")}.`, zh: `${math("500 + 20 + 9 = 529")}。` },
    commonCheck: { en: "Check that each digit is placed in the correct place value", zh: "檢查每個數字是否放在正確位值" }
  },
  "p2-multiplication-foundations": {
    firstStep: { en: "Count equal groups before writing multiplication", zh: "先數相等組數，再寫乘式" },
    keyFactPrompt: { en: `Which multiplication expression matches ${math("6 + 6 + 6 + 6")}?`, zh: `哪個乘式表示 ${math("6 + 6 + 6 + 6")}？` },
    keyFactAnswer: "4 x 6",
    keyFactExplanation: { en: `${math("6")} is added ${math("4")} times, so it is ${math("4 \\times 6")}.`, zh: `${math("6")} 加了 ${math("4")} 次，所以是 ${math("4 \\times 6")}。` },
    examplePrompt: { en: `Find ${math("3 \\times 4")}.`, zh: `計算 ${math("3 \\times 4")}。` },
    exampleAnswer: "12",
    exampleExplanation: { en: `${math("3 \\times 4 = 12")}.`, zh: `${math("3 \\times 4 = 12")}。` },
    commonCheck: { en: "Check the size of each group and the number of groups", zh: "檢查每組數量和組數" }
  },
  "p2-money-time": {
    firstStep: { en: "Identify the price, amount paid, or time interval", zh: "先辨認價錢、付款金額或時間間隔" },
    keyFactPrompt: { en: `A drink costs HK$${math("6")}. You pay HK$${math("10")}. How much change do you get?`, zh: `飲品售港幣 ${math("6")} 元，你付港幣 ${math("10")} 元，應找回多少？` },
    keyFactAnswer: "HK$4",
    keyFactExplanation: { en: `${math("10 - 6 = 4")}.`, zh: `${math("10 - 6 = 4")}。` },
    examplePrompt: { en: `Fifteen minutes after ${math("2:30")} is what time?`, zh: `${math("2:30")} 之後十五分鐘是甚麼時間？` },
    exampleAnswer: "2:45",
    exampleExplanation: { en: `Adding ${math("15")} minutes to ${math("2:30")} gives ${math("2:45")}.`, zh: `${math("2:30")} 加 ${math("15")} 分鐘是 ${math("2:45")}。` },
    commonCheck: { en: "Check whether the answer should be money or time", zh: "檢查答案應是金錢還是時間" }
  },
  "p2-length-data": {
    firstStep: { en: "Read the unit or chart label before calculating", zh: "計算前先讀清楚單位或圖表標籤" },
    keyFactPrompt: { en: `A string is ${math("20")} cm long. You use ${math("7")} cm. How many cm remain?`, zh: `一條繩長 ${math("20")} 厘米，用去 ${math("7")} 厘米，還剩多少厘米？` },
    keyFactAnswer: "13 cm",
    keyFactExplanation: { en: `${math("20 - 7 = 13")} cm.`, zh: `${math("20 - 7 = 13")} 厘米。` },
    examplePrompt: { en: `A bar chart shows ${math("8")} oranges and ${math("5")} pears. How many fruits are shown?`, zh: `棒形圖顯示 ${math("8")} 個橙和 ${math("5")} 個梨，共有多少水果？` },
    exampleAnswer: "13",
    exampleExplanation: { en: `${math("8 + 5 = 13")}.`, zh: `${math("8 + 5 = 13")}。` },
    commonCheck: { en: "Keep the length unit when the question asks for length", zh: "題目問長度時，答案要保留長度單位" }
  },
  "p3-multiplication-division": {
    firstStep: { en: "Decide whether the situation has equal groups or sharing", zh: "先判斷情境是相等組數還是平均分" },
    keyFactPrompt: { en: `Find ${math("8 \\times 4")}.`, zh: `計算 ${math("8 \\times 4")}。` },
    keyFactAnswer: "32",
    keyFactExplanation: { en: `${math("8 \\times 4 = 32")}.`, zh: `${math("8 \\times 4 = 32")}。` },
    examplePrompt: { en: `${math("36")} stickers are shared equally among ${math("6")} pupils. How many does each pupil get?`, zh: `${math("36")} 張貼紙平均分給 ${math("6")} 位同學，每人有多少張？` },
    exampleAnswer: "6",
    exampleExplanation: { en: `${math("36 \\div 6 = 6")}.`, zh: `${math("36 \\div 6 = 6")}。` },
    commonCheck: { en: "Check whether the question asks for total or each share", zh: "檢查題目問總數還是每份數量" }
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
    firstStep: { en: "Choose the correct measuring unit before calculating", zh: "計算前先選擇正確量度單位" },
    keyFactPrompt: { en: `A jug has ${math("2")} L of water. That is how many mL?`, zh: `一個水壺有 ${math("2")} 公升水，即是多少毫升？` },
    keyFactAnswer: "2000 mL",
    keyFactExplanation: { en: `${math("1")} L ${math("= 1000")} mL, so ${math("2")} L ${math("= 2000")} mL.`, zh: `${math("1")} 公升 ${math("= 1000")} 毫升，所以 ${math("2")} 公升 ${math("= 2000")} 毫升。` },
    examplePrompt: { en: `A blue strip is ${math("35")} cm long and a red strip is ${math("20")} cm long. What is their total length?`, zh: `藍色紙條長 ${math("35")} 厘米，紅色紙條長 ${math("20")} 厘米。總長是多少？` },
    exampleAnswer: "55 cm",
    exampleExplanation: { en: `${math("35 + 20 = 55")} cm.`, zh: `${math("35 + 20 = 55")} 厘米。` },
    commonCheck: { en: "Check whether units need converting before calculating", zh: "計算前檢查是否需要換算單位" }
  },
  "p3-geometry-patterns": {
    firstStep: { en: "Identify the angle fact or the pattern rule", zh: "先辨認角度性質或規律規則" },
    keyFactPrompt: { en: `How many degrees are in a straight angle?`, zh: `平角是多少度？` },
    keyFactAnswer: "180°",
    keyFactExplanation: { en: `A straight angle is ${math("180^\\circ")}.`, zh: `平角是 ${math("180^\\circ")}。` },
    examplePrompt: { en: `Continue the pattern: ${math("4, 8, 12, 16, \\square")}.`, zh: `延續規律：${math("4, 8, 12, 16, \\square")}。` },
    exampleAnswer: "20",
    exampleExplanation: { en: `The pattern adds ${math("4")} each time, so the next number is ${math("20")}.`, zh: `規律是每次加 ${math("4")}，所以下一個數是 ${math("20")}。` },
    commonCheck: { en: "Check whether the task is about shape, angle, or number pattern", zh: "檢查題目問圖形、角度還是數列規律" }
  },
  "p4-large-numbers": {
    firstStep: { en: "Compare digits from the largest place value", zh: "由最大位值開始比較數字" },
    keyFactPrompt: { en: `Which number is greater: ${math("23,780")} or ${math("23,708")}?`, zh: `${math("23,780")} 和 ${math("23,708")}，哪個數較大？` },
    keyFactAnswer: "23,780",
    keyFactExplanation: { en: `The hundreds and tens comparison shows ${math("23,780 > 23,708")}.`, zh: `比較百位和十位可見 ${math("23,780 > 23,708")}。` },
    examplePrompt: { en: `Round ${math("5,249")} to the nearest hundred.`, zh: `把 ${math("5,249")} 取近似值至最接近的百位。` },
    exampleAnswer: "5,200",
    exampleExplanation: { en: `The tens digit is ${math("4")}, so ${math("5,249")} rounds down to ${math("5,200")}.`, zh: `十位數字是 ${math("4")}，所以 ${math("5,249")} 捨去成 ${math("5,200")}。` },
    commonCheck: { en: "Check the required place value before rounding", zh: "取近似值前先檢查題目指定的位值" }
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
    firstStep: { en: "Name the angle relationship before subtracting", zh: "相減前先說明角度關係" },
    keyFactPrompt: { en: `Two angles on a straight line include ${math("110^\\circ")}. Find the other angle.`, zh: `一直線上的兩個角，其中一個是 ${math("110^\\circ")}。求另一個角。` },
    keyFactAnswer: "70°",
    keyFactExplanation: { en: `Angles on a straight line add to ${math("180^\\circ")}, so ${math("180 - 110 = 70")}.`, zh: `一直線上的角和為 ${math("180^\\circ")}，所以 ${math("180 - 110 = 70")}。` },
    examplePrompt: { en: `Angles around a point include ${math("90^\\circ")}, ${math("120^\\circ")}, and ${math("80^\\circ")}. Find the remaining angle.`, zh: `一點周圍的角包括 ${math("90^\\circ")}、${math("120^\\circ")} 和 ${math("80^\\circ")}。求餘下的角。` },
    exampleAnswer: "70°",
    exampleExplanation: { en: `Angles around a point add to ${math("360^\\circ")}; ${math("360 - 90 - 120 - 80 = 70")}.`, zh: `一點周圍的角和為 ${math("360^\\circ")}；${math("360 - 90 - 120 - 80 = 70")}。` },
    commonCheck: { en: "Check whether the total should be 180 degrees or 360 degrees", zh: "檢查總和應為 180 度還是 360 度" }
  },
  "p4-perimeter-area": {
    firstStep: { en: "Decide whether the question asks for boundary or surface", zh: "先判斷題目問周界還是面積" },
    keyFactPrompt: { en: `A square has side length ${math("6")} cm. Find its perimeter.`, zh: `正方形邊長 ${math("6")} 厘米。求周界。` },
    keyFactAnswer: "24 cm",
    keyFactExplanation: { en: `Perimeter ${math("= 4 \\times 6 = 24")} cm.`, zh: `周界 ${math("= 4 \\times 6 = 24")} 厘米。` },
    examplePrompt: { en: `A rectangle is ${math("7")} cm by ${math("3")} cm. What is its area?`, zh: `長方形長 ${math("7")} 厘米、闊 ${math("3")} 厘米，面積是多少？` },
    exampleAnswer: "21 cm^2",
    exampleExplanation: { en: `Area ${math("= 7 \\times 3 = 21")} square centimetres.`, zh: `面積 ${math("= 7 \\times 3 = 21")} 平方厘米。` },
    commonCheck: { en: "Use linear units for perimeter and square units for area", zh: "周界用長度單位，面積用平方單位" }
  },
  "p6-percentages": {
    firstStep: { en: "Convert the percentage to a fraction or decimal first", zh: "先把百分數化成分數或小數" },
    keyFactPrompt: { en: `What is ${math("25\\%")} of ${math("120")}?`, zh: `${math("120")} 的 ${math("25\\%")} 是多少？` },
    keyFactAnswer: "30",
    keyFactExplanation: { en: `${math("25\\%")} is one quarter, and ${math("120 \\div 4 = 30")}.`, zh: `${math("25\\%")} 是四分之一，而 ${math("120 \\div 4 = 30")}。` },
    examplePrompt: { en: `Write ${math("0.6")} as a percentage.`, zh: `把 ${math("0.6")} 寫成百分數。` },
    exampleAnswer: "60%",
    exampleExplanation: { en: `${math("0.6 = 60\\%")}.`, zh: `${math("0.6 = 60\\%")}。` },
    commonCheck: { en: "Check whether the question asks for a percent, decimal, or amount", zh: "檢查題目問百分數、小數還是數量" }
  },
  "p6-ratio-proportion": {
    firstStep: { en: "Find the total number of ratio parts before sharing", zh: "分配前先求比的總份數" },
    keyFactPrompt: { en: `Share ${math("48")} in the ratio ${math("1:5")}. What is the larger share?`, zh: `把 ${math("48")} 按 ${math("1:5")} 分配。較大的一份是多少？` },
    keyFactAnswer: "40",
    keyFactExplanation: { en: `There are ${math("6")} parts; one part is ${math("48 \\div 6 = 8")}; larger share ${math("5 \\times 8 = 40")}.`, zh: `共有 ${math("6")} 份；每份 ${math("48 \\div 6 = 8")}；較大份是 ${math("5 \\times 8 = 40")}。` },
    examplePrompt: { en: `Multiply both parts of ${math("5:7")} by ${math("2")}. What equivalent ratio do you get?`, zh: `把 ${math("5:7")} 兩項同乘 ${math("2")}。得到哪個等值比？` },
    exampleAnswer: "10:14",
    exampleExplanation: { en: `${math("5:7")} becomes ${math("10:14")}.`, zh: `${math("5:7")} 變成 ${math("10:14")}。` },
    commonCheck: { en: "Apply the same multiplier or divisor to both ratio parts", zh: "比的兩項要同乘或同除同一個數" }
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
    examplePrompt: { en: `A rectangle is ${math("9")} cm by ${math("4")} cm. Find its perimeter.`, zh: `長方形長 ${math("9")} 厘米、闊 ${math("4")} 厘米。求周界。` },
    exampleAnswer: "26 cm",
    exampleExplanation: { en: `Perimeter ${math("= 2(9 + 4) = 26")} cm.`, zh: `周界 ${math("= 2(9 + 4) = 26")} 厘米。` },
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
    commonCheck: { en: "Keep the same multiplier on every part", zh: "每一份都要使用同一倍數" }
  },
  "statistics-s1": {
    firstStep: { en: "Order or organize the data before choosing an average", zh: "先整理或排序數據，再選擇平均數" },
    keyFactPrompt: { en: `Find the range of ${math("3, 8, 10, 12")}.`, zh: `求 ${math("3, 8, 10, 12")} 的全距。` },
    keyFactAnswer: "9",
    keyFactExplanation: { en: `Range is highest minus lowest: ${math("12 - 3 = 9")}.`, zh: `全距是最大值減最小值：${math("12 - 3 = 9")}。` },
    examplePrompt: { en: `Find the median of ${math("2, 9, 5")}.`, zh: `求 ${math("2, 9, 5")} 的中位數。` },
    exampleAnswer: "5",
    exampleExplanation: { en: `Order the data as ${math("2, 5, 9")}; the middle value is ${math("5")}.`, zh: `排序為 ${math("2, 5, 9")}；中間值是 ${math("5")}。` },
    commonCheck: { en: "Sort the data before finding the median", zh: "求中位數前必須先排序" }
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
    examplePrompt: { en: `A die is rolled once. What is ${math(String.raw`P(\text{number greater than 4})`)}?`, zh: `擲一次骰子，${math(String.raw`P(\text{大於 4})`)} 是多少？` },
    exampleAnswer: "1/3",
    exampleExplanation: { en: `Favourable outcomes are ${math("5,6")}, so ${math("2/6 = 1/3")}.`, zh: `有利結果為 ${math("5,6")}，所以 ${math("2/6 = 1/3")}。` },
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
    commonCheck: { en: "Check factorization by expanding back", zh: "因式分解後用展開檢查" }
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
    firstStep: { en: "Check whether denominators match before adding or simplifying", zh: "加減或約簡前先檢查分母是否相同" },
    keyFactPrompt: { en: `Find ${math("2/5 + 1/5")}.`, zh: `計算 ${math("2/5 + 1/5")}。` },
    keyFactAnswer: "3/5",
    keyFactExplanation: { en: `Same denominators: ${math("2/5 + 1/5 = 3/5")}.`, zh: `分母相同：${math("2/5 + 1/5 = 3/5")}。` },
    examplePrompt: { en: `Simplify ${math("9/12")}.`, zh: `約簡 ${math("9/12")}。` },
    exampleAnswer: "3/4",
    exampleExplanation: { en: `Divide numerator and denominator by ${math("3")}: ${math("9/12 = 3/4")}.`, zh: `分子和分母同除以 ${math("3")}：${math("9/12 = 3/4")}。` },
    commonCheck: { en: "Simplify the final fraction when possible", zh: "答案如可約簡，要化成最簡分數" }
  },
  "p5-volume": {
    firstStep: { en: "Identify length, width, and height before multiplying", zh: "先辨認長、闊和高，再相乘" },
    keyFactPrompt: { en: `A tank has volume ${math("48")} cm^3, length ${math("4")} cm, and width ${math("3")} cm. What is its height?`, zh: `一個水箱體積是 ${math("48")} 立方厘米，長 ${math("4")} 厘米、闊 ${math("3")} 厘米。高是多少？` },
    keyFactAnswer: "4 cm",
    keyFactExplanation: { en: `Height ${math("= 48 \\div (4 \\times 3) = 4")} cm.`, zh: `高 ${math("= 48 \\div (4 \\times 3) = 4")} 厘米。` },
    examplePrompt: { en: `A box has base area ${math("10")} cm^2 and height ${math("3")} cm. Find its volume.`, zh: `一個盒子的底面積是 ${math("10")} 平方厘米，高 ${math("3")} 厘米。求體積。` },
    exampleAnswer: "30 cm^3",
    exampleExplanation: { en: `Volume ${math("= 10 \\times 3 = 30")} cubic centimetres.`, zh: `體積 ${math("= 10 \\times 3 = 30")} 立方厘米。` },
    commonCheck: { en: "Multiply length, width, and height instead of adding the edge lengths", zh: "要把長、闊和高相乘，不是把邊長相加" }
  },
  "p5-rates": {
    firstStep: { en: "Divide the total amount by the number of equal units", zh: "把總量除以相等單位數" },
    keyFactPrompt: { en: `A pack of ${math("3")} notebooks costs HK$${math("18")}. What is the cost per notebook?`, zh: `${math("3")} 本筆記簿售港幣 ${math("18")} 元，每本多少元？` },
    keyFactAnswer: "HK$6",
    keyFactExplanation: { en: `${math("18 \\div 3 = 6")}, so each notebook costs HK$6.`, zh: `${math("18 \\div 3 = 6")}，所以每本港幣 6 元。` },
    examplePrompt: { en: `A cyclist travels ${math("45")} km in ${math("3")} hours. What is the speed?`, zh: `單車手 ${math("3")} 小時行 ${math("45")} 公里，速率是多少？` },
    exampleAnswer: "15 km/h",
    exampleExplanation: { en: `Speed ${math("= 45 \\div 3 = 15")} km/h.`, zh: `速率 ${math("= 45 \\div 3 = 15")} 公里每小時。` },
    commonCheck: { en: "Keep the rate unit attached to the answer", zh: "答案要保留率的單位" }
  },
  "p5-charts-averages": {
    firstStep: { en: "Read the data values carefully before adding", zh: "相加前先仔細讀取數據" },
    keyFactPrompt: { en: `Find the mean of ${math("5, 9, 10")}.`, zh: `求 ${math("5, 9, 10")} 的平均數。` },
    keyFactAnswer: "8",
    keyFactExplanation: { en: `${math("(5 + 9 + 10) \\div 3 = 8")}.`, zh: `${math("(5 + 9 + 10) \\div 3 = 8")}。` },
    examplePrompt: { en: `A chart shows ${math("15")} cats and ${math("9")} dogs. How many animals are shown?`, zh: `圖表顯示 ${math("15")} 隻貓和 ${math("9")} 隻狗，共顯示多少隻動物？` },
    exampleAnswer: "24",
    exampleExplanation: { en: `${math("15 + 9 = 24")}.`, zh: `${math("15 + 9 = 24")}。` },
    commonCheck: { en: "Check whether the question asks for a total or an average", zh: "檢查題目要求總數還是平均數" }
  },
  "trigonometry-basics": {
    firstStep: { en: "Label opposite, adjacent, and hypotenuse", zh: "先標示對邊、鄰邊和斜邊" },
    keyFactPrompt: { en: `If adjacent ${math("= 4")} and hypotenuse ${math("= 5")}, what is ${math(String.raw`\cos\theta`)}?`, zh: `若鄰邊 ${math("= 4")}、斜邊 ${math("= 5")}，${math(String.raw`\cos\theta`)} 是多少？` },
    keyFactAnswer: "4/5",
    keyFactExplanation: { en: `${math(String.raw`\cos\theta = \frac{\text{adjacent}}{\text{hypotenuse}}`)}`, zh: `${math(String.raw`\cos\theta = \frac{\text{鄰邊}}{\text{斜邊}}`)}。` },
    examplePrompt: { en: `If opposite ${math("= 6")} and adjacent ${math("= 8")}, what is ${math(String.raw`\tan\theta`)}?`, zh: `若對邊 ${math("= 6")}、鄰邊 ${math("= 8")}，${math(String.raw`\tan\theta`)} 是多少？` },
    exampleAnswer: "3/4",
    exampleExplanation: { en: `${math(String.raw`\tan\theta = 6/8 = 3/4`)}.`, zh: `${math(String.raw`\tan\theta = 6/8 = 3/4`)}。` },
    commonCheck: { en: "Choose SOH, CAH, or TOA after labelling sides", zh: "標示邊後才選 SOH、CAH 或 TOA" }
  },
  circles: {
    firstStep: { en: "Identify the chord, tangent, arc, or centre angle being used", zh: "先辨認使用的是弦、切線、弧還是圓心角" },
    keyFactPrompt: { en: `A tangent meets a radius at the point of contact. What angle is formed?`, zh: `切線與接觸點的半徑相交，形成甚麼角？` },
    keyFactAnswer: "90°",
    keyFactExplanation: { en: `A tangent is perpendicular to the radius at the point of contact.`, zh: `切線垂直於接觸點的半徑。` },
    examplePrompt: { en: `An angle at the circumference is ${math("35^\\circ")}. What is the centre angle on the same arc?`, zh: `同弧圓周角是 ${math("35^\\circ")}。圓心角是多少？` },
    exampleAnswer: "70°",
    exampleExplanation: { en: `The centre angle is twice the circumference angle.`, zh: `圓心角是同弧圓周角的兩倍。` },
    commonCheck: { en: "Mark radii and equal lengths on the diagram", zh: "在圖中標示半徑和相等長度" }
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
    commonCheck: { en: "Keep x-differences and y-differences in matching order", zh: "x 差和 y 差要保持同一方向" }
  },
  "more-algebra": {
    firstStep: { en: "State restrictions and index laws before simplifying", zh: "化簡前先寫出限制和指數律" },
    keyFactPrompt: { en: `Simplify ${math("a^2 \\times a^5")}.`, zh: `化簡 ${math("a^2 \\times a^5")}。` },
    keyFactAnswer: "a^7",
    keyFactExplanation: { en: `Add indices when multiplying same bases.`, zh: `同底相乘時指數相加。` },
    examplePrompt: { en: `Simplify ${math("b^6 / b^2")}.`, zh: `化簡 ${math("b^6 / b^2")}。` },
    exampleAnswer: "b^4",
    exampleExplanation: { en: `Subtract indices when dividing same bases.`, zh: `同底相除時指數相減。` },
    commonCheck: { en: "Check denominators are not zero", zh: "檢查分母不可為零" }
  },
  "data-handling": {
    firstStep: { en: "Identify data type, distribution shape, and possible bias", zh: "先辨認數據類型、分佈形狀和可能偏差" },
    keyFactPrompt: { en: `Which measure is most affected by an extreme outlier: mean, median, or mode?`, zh: `平均數、中位數、眾數之中，哪一個最受極端離群值影響？` },
    keyFactAnswer: "mean",
    keyFactExplanation: { en: `The mean uses every value, so an extreme value can pull it.`, zh: `平均數使用所有數值，所以極端值會拉動它。` },
    examplePrompt: { en: `Find the range of ${math("5, 6, 9, 20")}.`, zh: `求 ${math("5, 6, 9, 20")} 的全距。` },
    exampleAnswer: "15",
    exampleExplanation: { en: `${math("20 - 5 = 15")}.`, zh: `${math("20 - 5 = 15")}。` },
    commonCheck: { en: "Check whether the graph scale is misleading", zh: "檢查圖表比例是否誤導" }
  },
  "advanced-functions": {
    firstStep: { en: "Compare model type: polynomial, exponential, or logarithmic", zh: "先比較模型類型：多項式、指數或對數" },
    keyFactPrompt: { en: `If ${math("f(x)=2^x")}, find ${math("f(3)")}.`, zh: `若 ${math("f(x)=2^x")}，求 ${math("f(3)")}。` },
    keyFactAnswer: "8",
    keyFactExplanation: { en: `${math("2^3=8")}.`, zh: `${math("2^3=8")}。` },
    examplePrompt: { en: `For ${math("f(x)=x^3")}, what is ${math("f(-2)")}?`, zh: `對 ${math("f(x)=x^3")}，${math("f(-2)")} 是多少？` },
    exampleAnswer: "-8",
    exampleExplanation: { en: `${math("(-2)^3=-8")}.`, zh: `${math("(-2)^3=-8")}。` },
    commonCheck: { en: "Check whether growth is additive or multiplicative", zh: "檢查增長是加法式還是乘法式" }
  },
  "trigonometry-s5": {
    firstStep: { en: "Identify amplitude, period, phase, or identity before solving", zh: "求解前先辨認振幅、週期、相位或恆等式" },
    keyFactPrompt: { en: `What is the period of ${math(String.raw`\sin x`)} in degrees?`, zh: `${math(String.raw`\sin x`)} 的週期是多少度？` },
    keyFactAnswer: "360°",
    keyFactExplanation: { en: `The basic sine graph repeats every ${math("360^\\circ")}.`, zh: `基本正弦圖像每 ${math("360^\\circ")} 重複一次。` },
    examplePrompt: { en: `What is the amplitude of ${math(String.raw`3\sin x`)}?`, zh: `${math(String.raw`3\sin x`)} 的振幅是多少？` },
    exampleAnswer: "3",
    exampleExplanation: { en: `Amplitude is the absolute value of the multiplier.`, zh: `振幅是乘數的絕對值。` },
    commonCheck: { en: "Use the required interval when listing solutions", zh: "列解時必須使用題目指定區間" }
  },
  "probability-s5": {
    firstStep: { en: "Decide whether the events are independent, dependent, or conditional", zh: "先判斷事件是獨立、相關還是條件概率" },
    keyFactPrompt: { en: `How many ways can ${math("3")} different books be arranged in a row?`, zh: `${math("3")} 本不同書排成一列有多少方法？` },
    keyFactAnswer: "6",
    keyFactExplanation: { en: `${math("3! = 6")}.`, zh: `${math("3! = 6")}。` },
    examplePrompt: { en: `A coin is tossed twice. What is ${math(String.raw`P(\text{two heads})`)}?`, zh: `擲硬幣兩次，${math(String.raw`P(\text{兩次正面})`)} 是多少？` },
    exampleAnswer: "1/4",
    exampleExplanation: { en: `Independent probabilities multiply: ${math("1/2 \\times 1/2 = 1/4")}.`, zh: `獨立概率相乘：${math("1/2 \\times 1/2 = 1/4")}。` },
    commonCheck: { en: "Draw a tree diagram when events happen in stages", zh: "分階段事件可先畫樹形圖" }
  },
  "differentiation-intro": {
    firstStep: { en: "Interpret derivative as gradient or rate of change", zh: "先把導數理解為斜率或變化率" },
    keyFactPrompt: { en: `Differentiate ${math("x^3")}.`, zh: `求 ${math("x^3")} 的導數。` },
    keyFactAnswer: "3x^2",
    keyFactExplanation: { en: `Power rule: ${math(String.raw`\frac{d}{dx}x^n = nx^{n-1}`)}.`, zh: `冪法則：${math(String.raw`\frac{d}{dx}x^n = nx^{n-1}`)}。` },
    examplePrompt: { en: `If ${math("y=5x")}, what is ${math("dy/dx")}?`, zh: `若 ${math("y=5x")}，${math("dy/dx")} 是多少？` },
    exampleAnswer: "5",
    exampleExplanation: { en: `A straight line ${math("y=5x")} has constant gradient ${math("5")}.`, zh: `直線 ${math("y=5x")} 的斜率固定為 ${math("5")}。` },
    commonCheck: { en: "Reduce the power by one after multiplying by the old power", zh: "乘以前方舊指數後，指數要減一" }
  },
  calculus: {
    firstStep: { en: "Choose derivative, integral, optimization, or area based on the task", zh: "按題目要求選擇導數、積分、優化或面積" },
    keyFactPrompt: { en: `Integrate ${math("2x")} with respect to ${math("x")}.`, zh: `對 ${math("2x")} 關於 ${math("x")} 積分。` },
    keyFactAnswer: "x^2 + C",
    keyFactExplanation: { en: `An antiderivative of ${math("2x")} is ${math("x^2")}; add ${math("C")}.`, zh: `${math("2x")} 的一個反導數是 ${math("x^2")}；要加 ${math("C")}。` },
    examplePrompt: { en: `Differentiate ${math("4x^2")}.`, zh: `求 ${math("4x^2")} 的導數。` },
    exampleAnswer: "8x",
    exampleExplanation: { en: `Use the power rule: ${math("4 \\times 2x = 8x")}.`, zh: `用冪法則：${math("4 \\times 2x = 8x")}。` },
    commonCheck: { en: "Include the constant of integration for indefinite integrals", zh: "不定積分要寫積分常數" }
  },
  "statistics-s6": {
    firstStep: { en: "Standardize with a z-score before using the normal curve", zh: "使用常態曲線前先轉換成 z 分數" },
    keyFactPrompt: { en: `Find the ${math("z")}-score for ${math("x=65")}, mean ${math("50")}, standard deviation ${math("5")}.`, zh: `平均數 ${math("50")}、標準差 ${math("5")} 時，${math("x=65")} 的 ${math("z")} 分數是多少？` },
    keyFactAnswer: "3",
    keyFactExplanation: { en: `${math(String.raw`z=(65-50)/5=3`)}.`, zh: `${math(String.raw`z=(65-50)/5=3`)}。` },
    examplePrompt: { en: `If ${math("z=0")}, where is the value relative to the mean?`, zh: `若 ${math("z=0")}，該數值相對於平均數在哪裡？` },
    exampleAnswer: "at the mean",
    exampleExplanation: { en: `${math("z=0")} means the value equals the mean.`, zh: `${math("z=0")} 表示數值等於平均數。` },
    commonCheck: { en: "Subtract the mean before dividing by the standard deviation", zh: "先減平均數，再除以標準差" }
  },
  "exam-revision": {
    firstStep: { en: "Sort questions by marks, confidence, and time available", zh: "先按分數、信心和可用時間排序題目" },
    keyFactPrompt: { en: `A paper has ${math("90")} marks in ${math("120")} minutes. Approximate minutes per mark?`, zh: `一份試卷 ${math("90")} 分，限時 ${math("120")} 分鐘。每分約多少分鐘？` },
    keyFactAnswer: "1.33",
    keyFactExplanation: { en: `${math("120/90 \\approx 1.33")} minutes per mark.`, zh: `${math("120/90 \\approx 1.33")} 分鐘每分。` },
    examplePrompt: { en: `A ${math("6")}-mark part uses ${math("9")} minutes. How many minutes per mark?`, zh: `${math("6")} 分分題用了 ${math("9")} 分鐘。每分多少分鐘？` },
    exampleAnswer: "1.5",
    exampleExplanation: { en: `${math("9/6=1.5")}.`, zh: `${math("9/6=1.5")}。` },
    commonCheck: { en: "Leave time for checking high-mark answers", zh: "預留時間檢查高分題" }
  },
  "mixed-problem-solving": {
    firstStep: { en: "List known facts, unknowns, constraints, and useful representations", zh: "先列出已知、未知、限制和可用表示方式" },
    keyFactPrompt: { en: "What should you identify first in an unfamiliar multi-step problem?", zh: "遇到陌生多步題時，最先應辨認甚麼？" },
    keyFactAnswer: "known facts and target",
    keyFactExplanation: { en: "A clear target prevents random formula use.", zh: "清楚目標可避免亂套公式。" },
    examplePrompt: { en: "If a question includes a diagram and algebra, what should connect them?", zh: "若題目同時有圖形和代數，應用甚麼連接兩者？" },
    exampleAnswer: "shared quantities",
    exampleExplanation: { en: "Shared lengths, coordinates, angles, or variables link representations.", zh: "共同的長度、坐標、角或變量可連接不同表示方式。" },
    commonCheck: { en: "Check whether the final answer is reasonable in context", zh: "檢查最終答案在情境中是否合理" }
  }
};

const firstStepDistractors: NonNullable<Question["options"]> = [
  { en: "Guess from appearance only", zh: "只憑外觀猜測" },
  { en: "Use the longest formula first", zh: "先使用最長公式" },
  { en: "Ignore labels and units", zh: "忽略標籤和單位" }
];

const commonCheckDistractors: NonNullable<Question["options"]> = [
  { en: "Skip the diagram or table", zh: "跳過圖形或表格" },
  { en: "Round before every step", zh: "每一步都先四捨五入" },
  { en: "Change notation without checking meaning", zh: "未檢查意思就改變記號" }
];

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
  const topicLabel = topic.title;

  return [
    {
      id: `supp-${topic.id}-first-step`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: topic.difficulty,
      type: "multiple-choice",
      prompt: {
        en: `When starting a ${topicLabel.en} question, which step is most useful?`,
        zh: `開始處理「${topicLabel.zh}」題目時，哪一步最有用？`
      },
      options: [drill.firstStep, ...firstStepDistractors],
      answer: drill.firstStep.en,
      explanation: {
        en: `A strong first step for this topic is: ${drill.firstStep.en}.`,
        zh: `這個課題較好的第一步是：${drill.firstStep.zh}。`
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
      difficulty: topic.difficulty,
      type: "short-answer",
      prompt: drill.examplePrompt,
      answer: drill.exampleAnswer,
      explanation: drill.exampleExplanation
    },
    {
      id: `supp-${topic.id}-common-check`,
      grade: topic.grade,
      topicId: topic.id,
      topic: topicLabel,
      difficulty: "Medium",
      type: "multiple-choice",
      prompt: {
        en: `Which check best avoids a common ${topicLabel.en} mistake?`,
        zh: `哪項檢查最能避免「${topicLabel.zh}」常見錯誤？`
      },
      options: [drill.commonCheck, ...commonCheckDistractors],
      answer: drill.commonCheck.en,
      explanation: {
        en: drill.commonCheck.en,
        zh: drill.commonCheck.zh
      }
    }
  ];
}

const cjkAnswerAliases: Record<string, string[]> = {
  "3 x 4": ["3*4", "3乘4"],
  "a classroom door": ["一扇課室門", "課室門"],
  "at the mean": ["平均數", "在平均數", "等於平均數"],
  centimetres: ["厘米"],
  circle: ["圓形"],
  downward: ["向下", "開口向下"],
  ii: ["第二象限"],
  mean: ["平均數"],
  "known facts and target": ["已知資料和目標", "已知和目標"],
  obtuse: ["鈍角"],
  "shared quantities": ["共同量", "共同數量", "共同的量"],
  triangle: ["三角形"],
  "underline known facts and the question": ["畫出已知資料和問題", "畫出已知資料和題目所問"]
};

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

function generatedAnswerAliases(answer: string) {
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
  if (coordinate) {
    addAlias(aliases, trimmed, `${coordinate[1]}, ${coordinate[2]}`);
    addAlias(aliases, trimmed, `${coordinate[1]},${coordinate[2]}`);
  }

  const linearEquation = trimmed.match(/^([a-z])\s*=\s*(-?\d+(?:\.\d+)?)$/i);
  if (linearEquation) {
    addAlias(aliases, trimmed, `${linearEquation[1]}=${linearEquation[2]}`);
    addAlias(aliases, trimmed, linearEquation[2]);
  }

  const fraction = trimmed.match(/^(-?\d+)\/(-?\d+)$/);
  if (fraction) {
    addAlias(aliases, trimmed, `${fraction[1]} / ${fraction[2]}`);
    const decimal = terminatingDecimalAlias(Number(fraction[1]), Number(fraction[2]));
    if (decimal) addAlias(aliases, trimmed, decimal);
  }

  const ratio = trimmed.match(/^(\d+):(\d+)$/);
  if (ratio) addAlias(aliases, trimmed, `${ratio[1]} : ${ratio[2]}`);

  const degree = trimmed.match(/^(-?\d+(?:\.\d+)?)°$/);
  if (degree) {
    addAlias(aliases, trimmed, degree[1]);
    addAlias(aliases, trimmed, `${degree[1]} degrees`);
    addAlias(aliases, trimmed, `${degree[1]} degree`);
    addAlias(aliases, trimmed, `${degree[1]}度`);
  }

  const percent = trimmed.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percent) {
    addAlias(aliases, trimmed, percent[1]);
    addAlias(aliases, trimmed, `${percent[1]} %`);
    addAlias(aliases, trimmed, `${percent[1]} percent`);
    addAlias(aliases, trimmed, `${percent[1]}百分比`);
  }

  const currency = trimmed.match(/^HK\$\s*(-?\d+(?:\.\d+)?)$/i);
  if (currency) {
    addAlias(aliases, trimmed, currency[1]);
    addAlias(aliases, trimmed, `$${currency[1]}`);
    addAlias(aliases, trimmed, `HK$ ${currency[1]}`);
    addAlias(aliases, trimmed, `港幣 ${currency[1]} 元`);
    addAlias(aliases, trimmed, `${currency[1]}元`);
  }

  const unit = trimmed.match(/^(-?\d+(?:\.\d+)?)\s+(cm\^2|cm\^3|cm|mL|L|km\/h|km)$/i);
  if (unit) {
    const value = unit[1];
    const unitText = unit[2];
    addAlias(aliases, trimmed, value);
    addAlias(aliases, trimmed, `${value}${unitText}`);

    if (/^cm$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 厘米`);
    if (/^cm\^2$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 平方厘米`);
    if (/^cm\^3$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 立方厘米`);
    if (/^mL$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 毫升`);
    if (/^L$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 公升`);
    if (/^km$/i.test(unitText)) addAlias(aliases, trimmed, `${value} 公里`);
    if (/^km\/h$/i.test(unitText)) {
      addAlias(aliases, trimmed, `${value}km/h`);
      addAlias(aliases, trimmed, `${value} kmh`);
      addAlias(aliases, trimmed, `${value} 公里每小時`);
    }
  }

  const oclock = trimmed.match(/^(\d{1,2}) o'clock$/i);
  if (oclock) {
    addAlias(aliases, trimmed, `${oclock[1]}:00`);
    addAlias(aliases, trimmed, oclock[1]);
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
    addAlias(aliases, trimmed, `${coefficient}${exponent[2]}${exponent[3]}`);
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

  const multiplicationExpression = trimmed.match(/^(-?\d+)\s+x\s+(-?\d+)$/i);
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

function answerAliasesFor(answer: string, acceptedAnswers: string[] = []) {
  const aliases = new Set<string>();
  [...acceptedAnswers, ...generatedAnswerAliases(answer)].forEach((alias) => addAlias(aliases, answer, alias));
  return Array.from(aliases);
}

function withGeneratedAnswerAliases(question: Question): Question {
  if (question.type === "multiple-choice") return question;
  const acceptedAnswers = answerAliasesFor(question.answer, question.acceptedAnswers);
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
  // EASE practice units are excluded: they already carry their own imported
  // questions, so generating supplemental drills for them would add templated
  // filler on top of real content — and defaultDrillForTopic has no drill for
  // them, so it would throw.
  ...topics
    .filter((topic) => topic.curriculumTrack === "HK" && !topic.id.startsWith("hk-ease-"))
    .flatMap(supplementalQuestionsForTopic)
    .map(withHongKongTrack),
  ...hongKongEasePracticeQuestions,
  ...mainlandPepPrimaryRagV1Questions,
  ...mainlandPepJuniorQuestions,
  ...mainlandPepHighQuestions,
  ...mainlandBnuJuniorQuestions,
  ...mainlandBnuHighQuestions,
  ...mainlandHjbJuniorQuestions,
  ...usArkansasQuestions,
  ...usMathLiveQuestions.filter((question) => question.curriculumTrack !== "US_CA_MATH"),
  ...usCaliforniaQuestions
];

export const questions: Question[] = curatedQuestions
  .map(withResolvedMainlandPepQuestionAssets)
  .map(withGeneratedAnswerAliases);
