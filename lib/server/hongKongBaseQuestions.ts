import type { Question } from "@/types";

const math = (expression: string) => `\\(${expression}\\)`;

export const hongKongBaseQuestions: Question[] = [
  {
    id: "q1",
    curriculumTrack: "HK",
    region: "HK",
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
    curriculumTrack: "HK",
    region: "HK",
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
    curriculumTrack: "HK",
    region: "HK",
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
    curriculumTrack: "HK",
    region: "HK",
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
    id: "q16",
    curriculumTrack: "HK",
    region: "HK",
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
    curriculumTrack: "HK",
    region: "HK",
    grade: "S2",
    topicId: "probability-s2",
    topic: { en: "Probability", zh: "概率" },
    difficulty: "Medium",
    type: "multiple-choice",
    prompt: { en: `A bag has ${math("2")} red balls and ${math("3")} blue balls. What is ${math(String.raw`P(\text{red})`)}?`, zh: `袋中有 ${math("2")} 個紅球和 ${math("3")} 個藍球。${math(String.raw`P(\text{紅球})`)} 是多少？` },
    options: [
      { en: "2/5", zh: "2/5" },
      { en: "3/5", zh: "3/5" },
      { en: "2/3", zh: "2/3" },
      { en: "1/5", zh: "1/5" }
    ],
    answer: "2/5",
    explanation: { en: `There are ${math("2")} red balls out of ${math("5")} balls, so the probability is ${math("2/5")}.`, zh: `共有 ${math("5")} 個球，其中 ${math("2")} 個是紅球，所以概率是 ${math("2/5")}。` }
  }
];
