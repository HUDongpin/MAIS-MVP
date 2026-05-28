import { textForLanguage } from "@/lib/i18n";
import type { Language, LocalizedText, TextbookPublisher } from "@/types";

const cjkPattern = /[\u3400-\u9fff]/u;
const cjkRunPattern = /[\u3400-\u9fff]+/gu;

const hjbPracticeEnglishReplacements: ReadonlyArray<[string, string]> = [
  ["我是小学生与数学学习习惯", "Becoming a Primary Student and Math Learning Habits"],
  ["认识立体图形", "Understanding Solid Shapes"],
  ["10以内数的认识", "Understanding Numbers within 10"],
  ["10以内数的加减法", "Addition and Subtraction within 10"],
  ["20以内的数与不进位不退位加减", "Numbers within 20 and Non-Regrouping Addition and Subtraction"],
  ["一年级上册整理与复习", "Grade 1 Volume 1 Review and Consolidation"],
  ["20以内数的加减法（二）", "Addition and Subtraction within 20 (II)"],
  ["100以内数的加减法（一）", "Addition and Subtraction within 100 (I)"],
  ["100以内数的加减法（二）", "Addition and Subtraction within 100 (II)"],
  ["100以内的数", "Numbers within 100"],
  ["时间的初步认识", "Introductory Time"],
  ["长度的比较与测量", "Comparing and Measuring Length"],
  ["身体上的尺子与数学广场", "Body-Based Measures and Math Square"],
  ["一年级下册整理与复习", "Grade 1 Volume 2 Review and Consolidation"],
  ["人民币与购物应用", "Renminbi and Shopping Applications"],
  ["校园方位与位置表达", "School Directions and Position Language"],
  ["表内乘法", "Multiplication Facts"],
  ["分类与整理", "Sorting and Organizing"],
  ["二年级上册数学广场与整理复习", "Grade 2 Volume 1 Math Square and Review"],
  ["表内除法", "Division Facts"],
  ["时间在哪里", "Finding Time"],
  ["万以内的数", "Numbers within 10,000"],
  ["两位数与三位数的加减法", "Addition and Subtraction of Two- and Three-Digit Numbers"],
  ["二年级下册数学广场与整理复习", "Grade 2 Volume 2 Math Square and Review"],
  ["三年级上册复习与数的运算", "Grade 3 Volume 1 Review and Number Operations"],
  ["乘与除", "Multiplication and Division"],
  ["时间与日程推理", "Time and Schedule Reasoning"],
  ["用一位数乘", "Multiplication by a One-Digit Number"],
  ["长方形与正方形", "Rectangles and Squares"],
  ["分数的初步认识（二）", "Introductory Fractions (II)"],
  ["分数的初步认识", "Introductory Fractions"],
  ["三年级上册数学广场与整理复习", "Grade 3 Volume 1 Math Square and Review"],
  ["三年级下册复习与乘除运算", "Grade 3 Volume 2 Review and Multiplication-Division"],
  ["两位数乘除与问题解决", "Two-Digit Multiplication, Division, and Problem Solving"],
  ["小数的初步认识", "Introductory Decimals"],
  ["面积与周长", "Area and Perimeter"],
  ["数据整理与统计表达", "Data Organization and Statistical Representation"],
  ["三年级下册数学广场与整理复习", "Grade 3 Volume 2 Math Square and Review"],
  ["复习与提高", "Review and Extension"],
  ["数与量", "Numbers and Measurement"],
  ["整数的四则运算", "Four Operations with Whole Numbers"],
  ["几何小实践", "Geometry Practice"],
  ["四年级上册整理与提高", "Grade 4 Volume 1 Review and Extension"],
  ["小数的认识与加减法", "Understanding Decimals, Addition, and Subtraction"],
  ["四年级下册整理与提高", "Grade 4 Volume 2 Review and Extension"],
  ["小数乘除法与估算", "Decimal Multiplication, Division, and Estimation"],
  ["用字母表示数与简易方程", "Using Letters for Numbers and Simple Equations"],
  ["平面图形面积", "Area of Plane Figures"],
  ["数据整理与平均数", "Data Organization and Averages"],
  ["因数、倍数与数的结构", "Factors, Multiples, and Number Structure"],
  ["分数意义、性质与加减", "Fraction Meaning, Properties, Addition, and Subtraction"],
  ["长方体、正方体与体积", "Cuboids, Cubes, and Volume"],
  ["统计表达与综合应用", "Statistical Representation and Integrated Applications"],
  ["数的整除", "Divisibility of Numbers"],
  ["比和比例", "Ratio and Proportion"],
  ["比与比例", "Ratio and Proportion"],
  ["圆和扇形", "Circles and Sectors"],
  ["圆与扇形", "Circles and Sectors"],
  ["可能性与统计图表", "Probability and Statistical Graphs"],
  ["圆柱与圆锥", "Cylinders and Cones"],
  ["二元一次方程组", "Systems of Linear Equations in Two Unknowns"],
  ["有理数", "Rational Numbers"],
  ["简单的代数式", "Simple Algebraic Expressions"],
  ["一元一次方程", "Linear Equations in One Unknown"],
  ["线段与角", "Line Segments and Angles"],
  ["长方体", "Cuboids"],
  ["分数", "Fractions"],
  ["统计", "Statistics"],
  ["整式的加减", "Addition and Subtraction of Polynomials"],
  ["整式的乘除", "Multiplication and Division of Polynomials"],
  ["因式分解", "Factorization"],
  ["分式", "Algebraic Fractions"],
  ["图形的运动", "Transformations of Figures"],
  ["一元一次不等式", "Linear Inequalities in One Variable"],
  ["相交线与平行线", "Intersecting and Parallel Lines"],
  ["等腰三角形", "Isosceles Triangles"],
  ["二次根式", "Quadratic Radicals"],
  ["一元二次方程", "Quadratic Equations in One Variable"],
  ["直角三角形", "Right Triangles"],
  ["四边形", "Quadrilaterals"],
  ["平面直角坐标系", "Coordinate Plane"],
  ["一次函数", "Linear Functions"],
  ["反比例函数", "Inverse Proportional Functions"],
  ["相似三角形", "Similar Triangles"],
  ["锐角的三角比", "Trigonometric Ratios of Acute Angles"],
  ["二次函数", "Quadratic Functions"],
  ["圆与正多边形", "Circles and Regular Polygons"],
  ["统计初步", "Introductory Statistics"],
  ["三角形", "Triangles"],
  ["实数", "Real Numbers"],
  ["集合与逻辑", "Sets and Logic"],
  ["等式与不等式", "Equations and Inequalities"],
  ["幂、指数与对数", "Powers, Exponents, and Logarithms"],
  ["幂函数、指数函数与对数函数", "Power, Exponential, and Logarithmic Functions"],
  ["函数的概念、性质及应用", "Function Concepts, Properties, and Applications"],
  ["三角函数", "Trigonometric Functions"],
  ["平面向量", "Plane Vectors"],
  ["复数", "Complex Numbers"],
  ["空间直线与平面", "Lines and Planes in Space"],
  ["简单几何体", "Basic Solid Geometry"],
  ["概率初步续", "Further Introductory Probability"],
  ["概率初步", "Introductory Probability"],
  ["平面直角坐标系中的直线", "Lines in the Coordinate Plane"],
  ["圆锥曲线综合复习", "Integrated Review: Conic Sections"],
  ["圆锥曲线", "Conic Sections"],
  ["空间向量及其应用", "Spatial Vectors and Applications"],
  ["数列综合复习", "Integrated Review: Sequences"],
  ["数列与计数综合", "Integrated Review: Sequences and Counting"],
  ["数列", "Sequences"],
  ["导数及其运用", "Derivatives and Applications"],
  ["计数原理", "Counting Principles"],
  ["成对数据的统计分析", "Statistical Analysis of Paired Data"],
  ["解析几何直线综合复习", "Integrated Review: Analytic Geometry Lines"],
  ["空间向量综合复习", "Integrated Review: Spatial Vectors"],
  ["函数、导数与不等式综合", "Integrated Review: Functions, Derivatives, and Inequalities"],
  ["三角、向量与解析几何综合", "Integrated Review: Trigonometry, Vectors, and Analytic Geometry"],
  ["立体几何与空间向量综合", "Integrated Review: Solid Geometry and Spatial Vectors"],
  ["概率统计综合", "Integrated Review: Probability and Statistics"],
  ["跨册综合：函数与导数", "Cross-volume Review: Functions and Derivatives"],
  ["跨册综合：三角向量解析几何", "Cross-volume Review: Trigonometry, Vectors, and Analytic Geometry"],
  ["跨册综合：立体几何与空间向量", "Cross-volume Review: Solid Geometry and Spatial Vectors"],
  ["跨册综合：概率统计", "Cross-volume Review: Probability and Statistics"],
  ["跨册综合：数列与计数", "Cross-volume Review: Sequences and Counting"],
  ["三角", "Trigonometry"],
  ["圆", "Circle"]
];

const sortedHjbPracticeEnglishReplacements = [...hjbPracticeEnglishReplacements].sort(
  ([left], [right]) => right.length - left.length
);

function replaceAll(value: string, search: string, replacement: string) {
  return value.split(search).join(replacement);
}

export function formatHjbPracticeEnglishText(value: string) {
  if (!cjkPattern.test(value)) return value;

  let next = value;
  sortedHjbPracticeEnglishReplacements.forEach(([source, target]) => {
    next = replaceAll(next, source, target);
  });

  return next
    .replace(/[（）]/g, (match) => (match === "（" ? "(" : ")"))
    .replace(/、/g, ", ")
    .replace(/，/g, ", ")
    .replace(/。/g, ".")
    .replace(/：/g, ": ")
    .replace(cjkRunPattern, "HJB topic")
    .replace(/\s+([,.:;)])/g, "$1")
    .replace(/([(])\s+/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function practiceTextForLanguage(
  value: LocalizedText,
  language: Language,
  publisher?: TextbookPublisher
) {
  const localized = textForLanguage(value, language);
  if (language !== "en" || publisher !== "MAINLAND_HJB") return localized;
  return formatHjbPracticeEnglishText(localized);
}
