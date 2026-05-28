import type { MainlandPepRagCard } from "@/types";

const primaryReuseGuards = [
  "Use this card only as abstract curriculum structure and pedagogy guidance for original MAIS work.",
  "Do not copy, rewrite, translate, closely paraphrase, or approximate PEP source wording, worked examples, practice items, answers, tables, diagrams, activity text, or visual layouts.",
  "Create fresh MAIS-authored numbers, contexts, representations, diagrams, explanations, and solution paths."
];

export const mainlandPepPrimaryRagCards: MainlandPepRagCard[] = [
  {
    id: "pep-primary-p1-upper-number-sense-within-20",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P1",
    semester: "upper",
    unitTitle: "20以内数感与加减启蒙",
    conceptIds: ["p1-number-sense", "within-20-numbers", "early-addition-subtraction", "20以内加减法"],
    competencyTags: ["数感", "符号意识", "运算能力"],
    skillTags: ["认读20以内数", "比较大小", "组成与分解", "加减含义"],
    misconceptionTags: ["counting order without quantity meaning", "confusing total and part", "missing zero as a placeholder idea"],
    safeSummary: "P1 upper builds the first number-language layer: count, compare, compose and decompose small whole numbers, and connect addition or subtraction to joining, separating, and comparing situations.",
    generationGuidance: [
      "Use concrete but newly authored classroom, object, or movement contexts with small numbers.",
      "Prefer short Simplified Chinese prompts, oral reasoning, number bonds, ten-frame style representations, and step-by-step counting checks.",
      "Keep tasks diagnostic: ask what is known, what changes, and whether the result should be larger or smaller."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p1-upper-shapes-position-clock",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P1",
    semester: "upper",
    unitTitle: "图形、位置与整时认识",
    conceptIds: ["p1-shapes", "position-language", "clock-whole-hour", "图形与位置"],
    competencyTags: ["空间观念", "观察比较", "数学表达"],
    skillTags: ["立体图形初识", "前后左右上下", "整时读法", "分类描述"],
    misconceptionTags: ["shape named by orientation only", "left-right reversal", "hour hand and minute hand confused"],
    safeSummary: "This card covers early spatial and measurement language: recognize common solids, describe relative positions, sort objects by attributes, and read whole-hour time in age-appropriate language.",
    generationGuidance: [
      "Generate original object sets and ask learners to describe position, shape attributes, and classification rules.",
      "For time tasks, use simple daily routines and ask students to connect clock hands with spoken time.",
      "Use teacher prompts that invite pointing, comparing, and explaining rather than memorizing labels only."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p1-lower-within-100-add-sub",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P1",
    semester: "lower",
    unitTitle: "100以内数认识与20以内退位",
    conceptIds: ["within-100-numbers", "within-20-regrouping-subtraction", "place-value-tens-ones", "20以内退位减法"],
    competencyTags: ["数感", "运算能力", "模型意识"],
    skillTags: ["十位个位", "整十数", "20以内进位与退位", "简单应用表达"],
    misconceptionTags: ["tens and ones reversed", "subtracting smaller digit from larger digit", "counting all when making ten would help"],
    safeSummary: "P1 lower extends counting to 100, strengthens tens-and-ones place value, and develops reliable within-20 addition or subtraction strategies including making ten and decomposing numbers.",
    generationGuidance: [
      "Create original tasks that use bundles, counters, number lines, or mental-math decomposition.",
      "Prompt students to explain whether they counted on, made ten, or decomposed a number.",
      "Keep application contexts short and locally familiar while avoiding any source scenario pattern."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p2-upper-multiplication-facts",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P2",
    semester: "upper",
    unitTitle: "表内乘法与乘法口诀",
    conceptIds: ["multiplication-meaning", "multiplication-facts", "arrays-equal-groups", "乘法口诀"],
    competencyTags: ["运算能力", "模型意识", "推理意识"],
    skillTags: ["几个几", "阵列模型", "乘法口诀", "加法到乘法转化"],
    misconceptionTags: ["treating unequal groups as multiplication facts", "factor order confusion", "memorizing facts without quantity meaning"],
    safeSummary: "P2 upper introduces multiplication as equal groups and arrays, then uses fact fluency to support quick reasoning without losing the meaning of factors and products.",
    generationGuidance: [
      "Use newly authored equal-group and array contexts before symbolic fact practice.",
      "Ask learners to connect repeated addition, a picture model, and a multiplication sentence.",
      "For fluency, vary missing factor, product comparison, and explain-the-strategy prompts."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p2-lower-division-measurement-data",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P2",
    semester: "lower",
    unitTitle: "表内除法、测量与数据整理",
    conceptIds: ["division-meaning", "division-facts", "length-measurement", "data-organization", "表内除法"],
    competencyTags: ["运算能力", "量感", "数据意识"],
    skillTags: ["平均分", "包含分", "厘米米", "简单统计表"],
    misconceptionTags: ["sharing and grouping models conflated", "unit omitted in measurement", "chart count read from wrong category"],
    safeSummary: "P2 lower connects division with fair sharing and grouping, reinforces inverse relationships with multiplication, and develops early measurement and data organization habits.",
    generationGuidance: [
      "Write original division situations that make the unit, group size, and number of groups clear.",
      "Use measurement prompts that ask students to choose an appropriate unit and estimate before calculating.",
      "For data tasks, create small original category counts and ask for reading, comparison, and one-sentence conclusions."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p3-upper-multidigit-operations-fractions",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P3",
    semester: "upper",
    unitTitle: "多位数运算与分数初步",
    conceptIds: ["multidigit-addition-subtraction", "multiplication-division-extension", "fraction-introduction", "分数初步"],
    competencyTags: ["运算能力", "数感", "几何直观"],
    skillTags: ["估算", "竖式检查", "几分之一", "几分之几"],
    misconceptionTags: ["place value alignment error", "fraction denominator treated as size count only", "whole not identified before naming fraction"],
    safeSummary: "P3 upper strengthens multi-digit operation control and introduces fractions as equal parts of a whole, with attention to naming the whole, the number of equal parts, and the selected parts.",
    generationGuidance: [
      "Generate fresh numbers that require estimation, place-value alignment, and reasonableness checks.",
      "Use original shaded-region or sharing descriptions for fractions, keeping the whole explicit.",
      "Ask students to compare strategies and explain why a fraction name depends on equal partitioning."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p3-lower-area-decimal-data",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P3",
    semester: "lower",
    unitTitle: "面积、小数初步与统计表达",
    conceptIds: ["area-measurement", "perimeter-area", "decimal-introduction", "data-reading", "面积"],
    competencyTags: ["量感", "空间观念", "数据意识"],
    skillTags: ["面积单位", "长方形正方形面积", "小数读写", "条形统计图"],
    misconceptionTags: ["perimeter and area formula mixed", "unit square not understood", "decimal point read as separator only"],
    safeSummary: "P3 lower develops area as covering with unit squares, separates area from perimeter, introduces simple decimal notation, and asks learners to read data displays carefully.",
    generationGuidance: [
      "Use new rectangles, grids, and measurement contexts to compare perimeter and area reasoning.",
      "For decimals, connect notation with money, length, or measurement language without copying source settings.",
      "Have students make one observation from a small original chart and justify it with a value."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p4-upper-large-numbers-angles",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P4",
    semester: "upper",
    unitTitle: "大数认识、角与三位数乘法",
    conceptIds: ["large-numbers", "place-value-large-numbers", "angle-measurement", "multidigit-multiplication", "大数认识"],
    competencyTags: ["数感", "空间观念", "运算能力"],
    skillTags: ["亿以内数", "数位顺序", "近似数", "角的度量", "三位数乘两位数"],
    misconceptionTags: ["zero omitted in large-number reading", "rounding place chosen incorrectly", "angle size judged by arm length"],
    safeSummary: "P4 upper expands place value to large numbers, links exact and approximate quantities, develops angle measurement, and extends multiplication to larger numbers through place-value reasoning.",
    generationGuidance: [
      "Use original population, distance, production, or library-scale quantities for reading, writing, comparing, and rounding.",
      "For angles, create fresh descriptions or diagrams and ask students to estimate before measuring.",
      "Ask multiplication tasks to include product estimation and partial-product reasoning."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p4-lower-decimal-operations-average",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P4",
    semester: "lower",
    unitTitle: "小数意义、运算与平均数",
    conceptIds: ["decimal-place-value", "decimal-operations", "average", "parallel-perpendicular", "小数"],
    competencyTags: ["数感", "运算能力", "数据意识"],
    skillTags: ["小数大小比较", "小数加减", "单位换算", "平均数意义"],
    misconceptionTags: ["more decimal digits assumed larger", "decimal alignment ignored", "average treated as most common value"],
    safeSummary: "P4 lower deepens decimals through place value, comparison, addition and subtraction, while using average and simple geometry language to support quantitative interpretation.",
    generationGuidance: [
      "Generate original measurement and money-like contexts for decimal comparison and calculation.",
      "Prompt students to align place values and estimate before computing.",
      "Use average tasks that ask what the value represents and what it cannot tell us."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p5-upper-decimals-equations-polygons",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P5",
    semester: "upper",
    unitTitle: "小数乘除、简易方程与多边形面积",
    conceptIds: ["decimal-multiplication", "decimal-division", "simple-equations", "polygon-area", "方程", "小数"],
    competencyTags: ["运算能力", "模型意识", "空间观念"],
    skillTags: ["小数乘法", "小数除法", "用字母表示数", "等量关系", "平行四边形三角形梯形面积"],
    misconceptionTags: ["decimal point placed by counting digits only", "equation balance not maintained", "height confused with side length"],
    safeSummary: "P5 upper extends decimal operations, introduces letters and equations as tools for unknown quantities, and develops polygon area through decomposition and transformation reasoning.",
    generationGuidance: [
      "Create new decimal operation tasks that require estimation, unit interpretation, and reasonableness checks.",
      "For equations, ask students to state the equal relationship before solving.",
      "Use original polygon dimensions and decomposition choices rather than familiar source figures."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p5-lower-fractions-factors-volume",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P5",
    semester: "lower",
    unitTitle: "因数倍数、分数运算与长方体正方体",
    conceptIds: ["factors-multiples", "fraction-meaning-operations", "least-common-multiple", "cuboid-cube-volume", "分数"],
    competencyTags: ["数感", "运算能力", "空间观念"],
    skillTags: ["质数合数", "约分通分", "分数加减", "体积单位", "长方体正方体体积"],
    misconceptionTags: ["factor and multiple reversed", "common denominator chosen mechanically", "surface area and volume mixed"],
    safeSummary: "P5 lower organizes whole-number relationships through factors and multiples, strengthens fraction equivalence and addition or subtraction, and builds volume as a three-dimensional measurement idea.",
    generationGuidance: [
      "Use new number sets for classifying factors, multiples, primes, composites, and common multiples.",
      "Ask fraction tasks to show why equivalent forms preserve value before calculation.",
      "For solids, generate fresh dimensions and require unit-cube or layer reasoning before formula use."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p6-upper-percent-position-data",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P6",
    semester: "upper",
    unitTitle: "分数乘除、百分数与位置数据",
    conceptIds: ["fraction-multiplication-division", "percent", "ratio-introduction", "coordinate-position", "百分数"],
    competencyTags: ["运算能力", "模型意识", "数据意识"],
    skillTags: ["分数乘法", "分数除法", "百分数意义", "用数对表示位置", "扇形统计图"],
    misconceptionTags: ["percent treated as a unitless whole number", "part-whole relationship not identified", "coordinate order reversed"],
    safeSummary: "P6 upper links fractions, ratios, and percentages as ways to describe part-whole and comparison relationships, while using coordinates and data displays to support quantitative communication.",
    generationGuidance: [
      "Create original percent situations involving discounts, growth, survey shares, or mixture-like comparisons with fresh values.",
      "Ask students to identify the whole, the part, and the comparison direction before calculating.",
      "Use coordinate and data tasks that require reading, explaining, and checking whether a conclusion follows."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-primary-p6-lower-proportion-negative-review",
    publisher: "MAINLAND_PEP",
    stage: "primary",
    grade: "P6",
    semester: "lower",
    unitTitle: "比例、负数与小学总复习",
    conceptIds: ["proportion", "direct-inverse-proportion", "scale", "negative-numbers", "比例"],
    competencyTags: ["模型意识", "推理意识", "综合应用"],
    skillTags: ["比和比例", "正比例反比例", "比例尺", "负数意义", "综合复习"],
    misconceptionTags: ["ratio order reversed", "proportional relationship assumed from any two quantities", "scale numerator and denominator swapped"],
    safeSummary: "P6 lower prepares transition to secondary mathematics by consolidating ratio and proportion, negative numbers, scale reasoning, and multi-topic problem solving with explicit model selection.",
    generationGuidance: [
      "Use newly authored map, recipe, speed, price, or table situations to decide whether a proportional model is valid.",
      "Prompt learners to write the two compared quantities and their units before forming a ratio.",
      "For review, combine concepts only when the required model can be explained in student-friendly steps."
    ],
    prohibitedReuseNotes: primaryReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  }
];
