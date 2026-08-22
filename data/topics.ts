import type { Topic } from "@/types";
import { mainlandBnuHighTopics } from "./mainlandBnuHighTopics";
import { mainlandBnuJuniorTopics } from "./mainlandBnuJuniorTopics";
import { mainlandBnuPrimaryTopics } from "./mainlandBnuPrimaryTopics";
import { mainlandHjbHighTopics } from "./mainlandHjbHighTopics";
import { mainlandHjbJuniorTopics } from "./mainlandHjbJuniorTopics";
import { mainlandHjbPrimaryTopics } from "./mainlandHjbPrimaryTopics";
import { mainlandPepHighTopics } from "./mainlandPepHighTopics";
import { mainlandPepJuniorTopics } from "./mainlandPepJuniorTopics";
import { mainlandPepPrimaryTopics } from "./mainlandPepPrimaryTopics";
import { usArkansasTopics } from "./usArkansasTopics";
import { usCaliforniaTopics } from "./usCaliforniaTopics";
import { usFloridaMiddleSchoolTopics } from "./usFloridaMiddleSchoolTopics";
import { usMathLiveTopics } from "./usMathTopics";

const hongKongTopics: Omit<Topic, "curriculumTrack">[] = [
  {
    id: "p1-counting-number-bonds",
    grade: "P1",
    title: { en: "Counting and Number Bonds", zh: "數數與數的組合" },
    description: { en: "Count objects, compare quantities, and make number bonds within 20.", zh: "數物件、比較數量，並建立 20 以內的數的組合。" },
    status: "completed",
    difficulty: "Low",
    minutes: 18,
    mastery: 84
  },
  {
    id: "p1-addition-subtraction",
    grade: "P1",
    title: { en: "Addition and Subtraction", zh: "加法與減法" },
    description: { en: "Use pictures, ten frames, and number lines for simple addition and subtraction.", zh: "用圖像、十格架和數線處理簡單加減。" },
    status: "in-progress",
    difficulty: "Low",
    minutes: 20,
    mastery: 55
  },
  {
    id: "p1-shapes-patterns",
    grade: "P1",
    title: { en: "Shapes and Patterns", zh: "圖形與規律" },
    description: { en: "Name common 2D shapes and continue repeating visual patterns.", zh: "辨認常見平面圖形，並延續重複視覺規律。" },
    status: "not-started",
    difficulty: "Low",
    minutes: 18,
    mastery: 0
  },
  {
    id: "p1-measurement-time",
    grade: "P1",
    title: { en: "Measurement and Time", zh: "度量與時間" },
    description: { en: "Compare lengths and read whole-hour and half-hour times.", zh: "比較長度，並讀出整點和半小時時間。" },
    status: "not-started",
    difficulty: "Low",
    minutes: 20,
    mastery: 0
  },
  {
    id: "p2-place-value",
    grade: "P2",
    title: { en: "Place Value to 1000", zh: "一千以內的位值" },
    description: { en: "Read, write, order, decompose, and regroup whole numbers from 0 to 1000.", zh: "讀寫、排序、分拆和重組 0 至 1000 的整數。" },
    status: "completed",
    difficulty: "Low",
    minutes: 22,
    mastery: 82
  },
  {
    id: "p2-multiplication-foundations",
    grade: "P2",
    title: { en: "Multiplication Foundations", zh: "乘法基礎" },
    description: { en: "Connect repeated addition, arrays, and early multiplication facts.", zh: "連繫重複加法、陣列和初階乘法事實。" },
    status: "in-progress",
    difficulty: "Low",
    minutes: 24,
    mastery: 58
  },
  {
    id: "p2-money-time",
    grade: "P2",
    title: { en: "Money and Time", zh: "金錢與時間" },
    description: { en: "Solve simple Hong Kong money questions and read half-hour times.", zh: "解決簡單香港貨幣題，並讀出半小時時間。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 24,
    mastery: 0
  },
  {
    id: "p2-length-data",
    grade: "P2",
    title: { en: "Metres and Pictograms", zh: "米與象形圖" },
    description: { en: "Measure and estimate in metres, connect 1 m with 100 cm, and read one-to-one pictograms.", zh: "以米估計和量度，連繫 1 米與 100 厘米，並閱讀一對一象形圖。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 24,
    mastery: 0
  },
  {
    id: "p3-multiplication-division",
    grade: "P3",
    title: { en: "Multiplication and Division", zh: "乘法與除法" },
    description: { en: "Multiply multi-digit numbers by one digit and interpret division as sharing or grouping, including remainders.", zh: "計算多位數乘一位數，並以平均分或分組理解除法和餘數。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 28,
    mastery: 78
  },
  {
    id: "p3-fractions-intro",
    grade: "P3",
    title: { en: "Fractions Intro", zh: "分數入門" },
    description: { en: "Represent halves, thirds, quarters, and simple equivalent fractions.", zh: "表示二分之一、三分之一、四分之一和簡單等值分數。" },
    status: "in-progress",
    difficulty: "Low",
    minutes: 26,
    mastery: 52
  },
  {
    id: "p3-measurement",
    grade: "P3",
    title: { en: "Measurement and Bar Charts", zh: "度量與棒形圖" },
    description: { en: "Choose suitable units, convert simple measures, and read a single-series bar chart from its scale.", zh: "選擇合適單位、進行簡單換算，並按刻度閱讀單系列棒形圖。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 26,
    mastery: 0
  },
  {
    id: "p3-geometry-patterns",
    grade: "P3",
    title: { en: "Quadrilaterals and Triangles", zh: "四邊形與三角形" },
    description: { en: "Recognise and describe concrete quadrilaterals and triangles by their sides, vertices, and visible properties.", zh: "按邊、頂點和可見性質辨認及描述具體四邊形與三角形。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 28,
    mastery: 0
  },
  {
    id: "p4-large-numbers",
    grade: "P4",
    title: { en: "Multiples, Factors, H.C.F. and L.C.M.", zh: "倍數、因數、最大公因數與最小公倍數" },
    description: { en: "Build factor pairs and multiples, then find the H.C.F. and L.C.M. of two positive integers.", zh: "建立因數組和倍數，再求兩個正整數的最大公因數與最小公倍數。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 30,
    mastery: 80
  },
  {
    id: "p4-decimals",
    grade: "P4",
    title: { en: "Decimals", zh: "小數" },
    description: { en: "Compare tenths and hundredths and connect decimals to money and measures.", zh: "比較十分位和百分位，並連繫小數、金錢和度量。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 30,
    mastery: 56
  },
  {
    id: "p4-angles",
    grade: "P4",
    title: { en: "Quadrilateral Families and Shape Composition", zh: "四邊形類別與圖形拼砌" },
    description: { en: "Relate squares, rectangles, rhombuses, and parallelograms, then dissect and form concrete shapes.", zh: "連繫正方形、長方形、菱形和平行四邊形，再分割和拼砌具體圖形。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 28,
    mastery: 0
  },
  {
    id: "p4-perimeter-area",
    grade: "P4",
    title: { en: "Perimeter and Area", zh: "周界與面積" },
    description: { en: "Find perimeter and area for rectangles and suitable rectilinear composite shapes.", zh: "求長方形及合適直線組合圖形的周界與面積。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 32,
    mastery: 0
  },
  {
    id: "p5-fractions-operations",
    grade: "P5",
    title: { en: "Fraction Operations", zh: "分數運算" },
    description: { en: "Add and subtract up to three fractions with unlike denominators, then simplify.", zh: "加減最多三項異分母分數，並把答案約簡。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 34,
    mastery: 76
  },
  {
    id: "p5-volume",
    grade: "P5",
    title: { en: "Volume", zh: "體積" },
    description: { en: "Build volume from unit cubes and calculate the volume of cuboids.", zh: "由單位立方體理解體積，並計算長方體的體積。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 32,
    mastery: 50
  },
  {
    id: "p5-rates",
    grade: "P5",
    title: { en: "Unitary Method for Unit Price", zh: "歸一法求單價" },
    description: { en: "Use one-unit reasoning to find and compare unit prices.", zh: "運用歸一法求出並比較單價。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 32,
    mastery: 0
  },
  {
    id: "p5-charts-averages",
    grade: "P5",
    title: { en: "Compound Bar Charts", zh: "複合棒形圖" },
    description: { en: "Read and compare two data series on one compound bar chart with a shared scale.", zh: "在同一刻度的複合棒形圖上閱讀和比較兩組數據。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 30,
    mastery: 0
  },
  {
    id: "p6-percentages",
    grade: "P6",
    title: { en: "Percentages", zh: "百分數" },
    description: { en: "Convert between fractions, decimals, percentages, and real contexts.", zh: "在分數、小數、百分數和實際情境之間轉換。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 34,
    mastery: 74
  },
  {
    id: "p6-ratio-proportion",
    grade: "P6",
    title: { en: "Averages and Broken-Line Graphs", zh: "平均數與折線圖" },
    description: { en: "Interpret the mean as a fair share and read one or two ordered data series on a single broken-line graph.", zh: "把平均數理解為平均分配，並在同一幅折線圖中閱讀一條或兩條有序數列。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 36,
    mastery: 48
  },
  {
    id: "p6-speed",
    grade: "P6",
    title: { en: "Speed", zh: "速率" },
    description: { en: "Connect distance, time, and speed with tables and graphs.", zh: "用表格和圖像連繫距離、時間和速率。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 34,
    mastery: 0
  },
  {
    id: "p6-pre-secondary-problem-solving",
    grade: "P6",
    title: { en: "Pre-secondary Problem Solving", zh: "升中解難" },
    description: { en: "Plan multi-step questions using diagrams, tables, and clear checking.", zh: "用圖、表和清晰檢查規劃多步驟題目。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 38,
    mastery: 0
  },
  {
    id: "integers",
    grade: "S1",
    title: { en: "Integers", zh: "整數" },
    description: { en: "Visualize negative numbers, operations, and number-line movement.", zh: "透過數線視覺化負數、運算與移動。" },
    status: "completed",
    difficulty: "Low",
    minutes: 25,
    mastery: 86
  },
  {
    id: "algebra-basics",
    grade: "S1",
    title: { en: "Algebra Basics", zh: "代數基礎" },
    description: { en: "Translate patterns into expressions and simple equations.", zh: "把規律轉化為代數式和簡單方程。" },
    status: "in-progress",
    difficulty: "Low",
    minutes: 30,
    mastery: 62
  },
  {
    id: "angles",
    grade: "S1",
    title: { en: "Angles", zh: "角" },
    description: { en: "Explore angle relationships using draggable diagrams.", zh: "使用可拖曳圖形探索角的關係。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 35,
    mastery: 0
  },
  {
    id: "ratios",
    grade: "S1",
    title: { en: "Ratios", zh: "比與率" },
    description: { en: "Connect proportional reasoning to everyday Hong Kong contexts.", zh: "把比例推理連繫到香港日常情境。" },
    status: "completed",
    difficulty: "Low",
    minutes: 28,
    mastery: 78
  },
  {
    id: "statistics-s1",
    grade: "S1",
    title: { en: "Statistics", zh: "統計" },
    description: { en: "Read charts, compare averages, and interpret variation.", zh: "閱讀圖表、比較平均數並理解變異。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 32,
    mastery: 0
  },
  {
    id: "linear-equations",
    grade: "S2",
    title: { en: "Linear Equations", zh: "一次方程" },
    description: { en: "Solve equations and see balance models react instantly.", zh: "解方程並觀察天平模型即時變化。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 35,
    mastery: 82
  },
  {
    id: "coordinates",
    grade: "S2",
    title: { en: "Coordinates", zh: "坐標" },
    description: { en: "Plot points, lines, and transformations on grids.", zh: "在坐標網格上標示點、直線和變換。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 30,
    mastery: 54
  },
  {
    id: "transformations",
    grade: "S2",
    title: { en: "Transformations", zh: "變換" },
    description: { en: "Animate pure translation, reflection, and rotation about the origin; explore enlargement about the origin only as enrichment.", zh: "以動畫呈現純平移、反射和以原點為中心的旋轉；以原點放大只作延伸學習。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 40,
    mastery: 0
  },
  {
    id: "probability-s2",
    grade: "S2",
    title: { en: "Probability", zh: "概率" },
    description: { en: "Compare theoretical probability with simulation data.", zh: "比較理論概率與模擬數據。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 34,
    mastery: 0
  },
  {
    id: "polynomials",
    grade: "S3",
    title: { en: "Polynomials", zh: "多項式" },
    description: { en: "Factorise, expand, and recognise algebraic structure.", zh: "因式分解、展開並辨識代數結構。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 42,
    mastery: 74
  },
  {
    id: "identities-square-patterns",
    grade: "S3",
    title: { en: "Algebraic Identities and Square Patterns", zh: "代數恆等式與平方圖樣" },
    description: { en: "Use exact area models to expand and factorise square identities.", zh: "運用精確面積模型展開和因式分解平方恆等式。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 42,
    mastery: 49
  },
  {
    id: "trigonometry-basics",
    grade: "S3",
    title: { en: "Trigonometry Basics", zh: "三角比基礎" },
    description: { en: "Build sine, cosine, and tangent from right triangles.", zh: "由直角三角形建立正弦、餘弦和正切。" },
    status: "not-started",
    difficulty: "High",
    minutes: 48,
    mastery: 0
  },
  {
    id: "arc-length-sector-area",
    grade: "S3",
    title: { en: "Arc Length and Sector Area", zh: "弧長與扇形面積" },
    description: { en: "Relate an angle at the centre to arc length and sector area, using exact pi and suitable units.", zh: "把圓心角連繫到弧長和扇形面積，並使用含 π 的精確值和合適單位。" },
    status: "not-started",
    difficulty: "Medium",
    minutes: 44,
    mastery: 0
  },
  {
    id: "functions",
    grade: "S4",
    title: { en: "Functions", zh: "函數" },
    description: { en: "Model input-output rules and connect them to graphs.", zh: "建立輸入輸出規則並連繫到圖像。" },
    status: "in-progress",
    difficulty: "Medium",
    minutes: 45,
    mastery: 58
  },
  {
    id: "quadratic-patterns",
    grade: "S4",
    title: { en: "Quadratic Functions", zh: "二次函數" },
    description: { en: "Connect coefficients, graphs, vertices, symmetry axes, intercepts, and real-root states.", zh: "連繫係數、圖像、頂點、對稱軸、截距和實根情況。" },
    status: "in-progress",
    difficulty: "High",
    minutes: 45,
    mastery: 49
  },
  {
    id: "coordinate-geometry",
    grade: "S4",
    title: { en: "Coordinate Geometry", zh: "坐標幾何" },
    description: { en: "Use gradient, distance, and midpoint in geometric problems.", zh: "以斜率、距離和中點解決幾何問題。" },
    status: "not-started",
    difficulty: "High",
    minutes: 50,
    mastery: 0
  },
  {
    id: "circles",
    grade: "S4",
    title: { en: "Circle Geometry", zh: "圓幾何" },
    description: { en: "Investigate radii, chords, corresponding arcs, tangents, and senior-secondary circle angle theorems.", zh: "探究半徑、弦、所對的弧、切線和高中圓幾何中的角度定理。" },
    status: "not-started",
    difficulty: "High",
    minutes: 44,
    mastery: 0
  },
  {
    id: "more-algebra",
    grade: "S4",
    title: { en: "More Algebra", zh: "進階代數" },
    description: { en: "Manipulate identities, indices, and rational expressions.", zh: "處理恆等式、指數與有理式。" },
    status: "not-started",
    difficulty: "High",
    minutes: 48,
    mastery: 0
  },
  {
    id: "data-handling",
    grade: "S4",
    title: { en: "Data Handling", zh: "數據處理" },
    description: { en: "Interpret distributions and evaluate data claims.", zh: "詮釋分佈並評估數據主張。" },
    status: "completed",
    difficulty: "Medium",
    minutes: 36,
    mastery: 81
  },
  {
    id: "advanced-functions",
    grade: "S5",
    title: { en: "Advanced Functions", zh: "進階函數" },
    description: { en: "Compare polynomial, exponential, and logarithmic models.", zh: "比較多項式、指數和對數模型。" },
    status: "in-progress",
    difficulty: "High",
    minutes: 52,
    mastery: 46
  },
  {
    id: "trigonometry-s5",
    grade: "S5",
    title: { en: "Trigonometry", zh: "三角學" },
    description: { en: "Interpret and transform sine and cosine graphs for senior secondary trigonometry questions.", zh: "為高中三角學題目解讀和變換正弦與餘弦圖像。" },
    status: "not-started",
    difficulty: "High",
    minutes: 55,
    mastery: 0
  },
  {
    id: "probability-s5",
    grade: "S5",
    title: { en: "Probability", zh: "概率" },
    description: { en: "Build counting strategies and conditional probability intuition.", zh: "建立計數策略和條件概率直覺。" },
    status: "completed",
    difficulty: "High",
    minutes: 45,
    mastery: 76
  },
  {
    id: "differentiation-intro",
    grade: "S5",
    title: { en: "Differentiation Intro — HKDSE Extended Part (M1/M2)", zh: "微分入門——香港中學文憑延伸部分（M1/M2）" },
    description: { en: "Optional HKDSE Extended Part (M1/M2): link secant gradients, tangent lines, and instantaneous rate of change.", zh: "香港中學文憑延伸部分（M1/M2）選修內容：連繫割線斜率、切線和瞬時變化率。" },
    status: "not-started",
    difficulty: "High",
    minutes: 60,
    mastery: 0
  },
  {
    id: "calculus",
    grade: "S6",
    title: { en: "Calculus — HKDSE Extended Part (M1/M2)", zh: "微積分——香港中學文憑延伸部分（M1/M2）" },
    description: { en: "Optional HKDSE Extended Part (M1/M2): use tangent gradients and derivative signs to analyse local graph behaviour.", zh: "香港中學文憑延伸部分（M1/M2）選修內容：運用切線斜率和導數符號分析圖像的局部行為。" },
    status: "in-progress",
    difficulty: "High",
    minutes: 65,
    mastery: 51
  },
  {
    id: "statistics-s6",
    grade: "S6",
    title: { en: "Statistics — HKDSE Extended Part M1", zh: "統計——香港中學文憑延伸部分 M1" },
    description: { en: "Optional HKDSE Extended Part M1: reason with the normal distribution and standard scores.", zh: "香港中學文憑延伸部分 M1 選修內容：運用正態分佈和標準分推理。" },
    status: "not-started",
    difficulty: "High",
    minutes: 55,
    mastery: 0
  },
  {
    id: "exam-revision",
    grade: "S6",
    title: { en: "Exam Revision", zh: "考試溫習" },
    description: { en: "Plan revision by skill gaps, timing, and mixed paper practice.", zh: "按能力差距、時間管理和混合試卷規劃溫習。" },
    status: "completed",
    difficulty: "High",
    minutes: 40,
    mastery: 72
  },
  {
    id: "mixed-problem-solving",
    grade: "S6",
    title: { en: "Mixed Problem Solving", zh: "綜合解難" },
    description: { en: "Select strategies for multi-step unfamiliar questions.", zh: "為多步驟陌生題選擇解題策略。" },
    status: "not-started",
    difficulty: "High",
    minutes: 60,
    mastery: 0
  }
];

export const topics: Topic[] = [
  ...hongKongTopics.map((topic) => ({ ...topic, curriculumTrack: "HK" as const })),
  ...mainlandPepPrimaryTopics,
  ...mainlandPepJuniorTopics,
  ...mainlandPepHighTopics,
  ...mainlandBnuJuniorTopics,
  ...mainlandBnuPrimaryTopics,
  ...mainlandBnuHighTopics,
  ...mainlandHjbPrimaryTopics,
  ...mainlandHjbJuniorTopics,
  ...mainlandHjbHighTopics,
  ...usArkansasTopics,
  ...usFloridaMiddleSchoolTopics,
  ...usMathLiveTopics.filter((topic) => topic.curriculumTrack !== "US_CA_MATH"),
  ...usCaliforniaTopics
];
