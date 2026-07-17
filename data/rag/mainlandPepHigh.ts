import type { MainlandPepHighRagCard } from "@/types";

const originalityGuards = [
  "Use this card only as abstract curriculum and item-design guidance.",
  "Do not reproduce textbook examples, exam stems, official solution wording, page images, or long source phrasing.",
  "Generate new numbers, contexts, diagrams, and solution paths that are independently authored for MAIS."
];

export const mainlandPepHighRagCards: MainlandPepHighRagCard[] = [
  {
    id: "pep-high-sets-logic",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "集合与常用逻辑用语",
    conceptIds: ["sets", "set-operations", "logic-conditions", "quantifiers"],
    competencyTags: ["数学抽象", "逻辑推理", "数学语言"],
    itemTypeTags: ["概念辨析", "证明推理"],
    difficultyBand: "foundation",
    safeSummary: "This chapter builds a language layer for high-school mathematics: describe object ranges with sets, compare set relations, combine sets, and express conditions with quantifiers and necessity or sufficiency.",
    generationGuidance: [
      "Create tasks that ask students to classify membership, subset relations, union, intersection, complement, and empty-set edge cases.",
      "Use new mathematical or everyday categories instead of textbook examples.",
      "For logic questions, require students to distinguish sufficient, necessary, necessary and sufficient, and neither."
    ],
    misconceptionTags: ["confusing element and subset", "forgetting universe set", "reversing sufficient and necessary conditions"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-quadratic-inequalities",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "一元二次函数、方程和不等式",
    conceptIds: ["quadratic-functions", "quadratic-equations", "quadratic-inequalities", "basic-inequality"],
    competencyTags: ["数学运算", "逻辑推理", "直观想象"],
    itemTypeTags: ["计算求解", "函数图像", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter links quadratic expressions, equations, inequalities, graphs, roots, intervals, and inequality reasoning so students can move between algebraic and visual representations.",
    generationGuidance: [
      "Generate original coefficient sets and ask learners to connect discriminant, roots, sign intervals, and graph position.",
      "Include comparison tasks where a quadratic model determines a valid range, threshold, or optimization condition.",
      "For exam-style items, combine parameter constraints with interval reasoning, but keep the algebraic structure newly authored."
    ],
    misconceptionTags: ["sign chart interval endpoint error", "discriminant interpretation error", "treating inequality like equation only"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-function-concepts-properties",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "函数的概念与性质",
    conceptIds: ["function-definition", "domain-range", "monotonicity", "parity", "function-applications"],
    competencyTags: ["数学抽象", "直观想象", "数学建模"],
    itemTypeTags: ["概念辨析", "函数图像", "建模应用"],
    difficultyBand: "core",
    safeSummary: "This chapter formalizes function as a correspondence, then studies domain, range, monotonicity, parity, and simple application models through symbolic, graphical, and contextual representations.",
    generationGuidance: [
      "Ask students to justify whether a relation is a function and identify its valid domain from a new expression or context.",
      "Create graph-reading tasks for increasing and decreasing intervals, symmetry, maximum or minimum behavior, and value comparison.",
      "Use fresh contexts for application modeling, such as pricing, distance, area, or resource change."
    ],
    misconceptionTags: ["domain restriction omitted", "confusing increasing interval with positive value", "parity checked on invalid domain"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-exponential-logarithmic-functions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "指数函数与对数函数",
    conceptIds: ["exponential-functions", "logarithmic-functions", "inverse-functions", "function-modeling"],
    competencyTags: ["数学抽象", "数学运算", "数学建模"],
    itemTypeTags: ["计算求解", "函数图像", "建模应用"],
    difficultyBand: "exam",
    safeSummary: "This chapter develops exponential and logarithmic operations, their function graphs, inverse relationships, and growth or decay modeling.",
    generationGuidance: [
      "Build original tasks that convert between exponential and logarithmic forms and compare function values through monotonicity.",
      "Use newly designed growth, decay, scale, or information contexts for model interpretation.",
      "For challenge items, combine domain restrictions, parameter ranges, and inverse-function reasoning."
    ],
    misconceptionTags: ["logarithm domain ignored", "base range forgotten", "inverse relationship overgeneralized"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-trigonometric-functions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "三角函数",
    conceptIds: ["unit-circle", "trigonometric-functions", "trigonometric-graphs", "trigonometric-identities"],
    competencyTags: ["直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["函数图像", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter connects angles, radians, unit-circle coordinates, trigonometric function values, graph transformations, periodicity, and identities.",
    generationGuidance: [
      "Generate graph tasks involving amplitude, period, phase shift, symmetry, and value reading from newly authored parameters.",
      "Use unit-circle reasoning to connect signs, special angles, and identities.",
      "For exam practice, combine graph transformation with equation solving or parameter identification."
    ],
    misconceptionTags: ["degree-radian confusion", "period formula error", "phase shift sign reversed"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-plane-vectors",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "平面向量及其应用",
    conceptIds: ["plane-vectors", "vector-operations", "dot-product", "vector-applications"],
    competencyTags: ["直观想象", "数学运算", "数学建模"],
    itemTypeTags: ["计算求解", "证明推理", "建模应用"],
    difficultyBand: "core",
    safeSummary: "This chapter uses directed quantities to model plane geometry and physical or contextual relationships through vector addition, scalar multiplication, coordinates, and dot product.",
    generationGuidance: [
      "Create original coordinate-vector tasks requiring decomposition, dot product, angle, projection, or collinearity checks.",
      "Use vector methods to prove new geometric relationships instead of copying classic textbook figures.",
      "Include applied scenarios with displacement, force, or navigation using newly selected numbers."
    ],
    misconceptionTags: ["vector direction ignored", "dot product sign misread", "coordinate decomposition mismatch"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-complex-numbers",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "复数",
    conceptIds: ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"],
    competencyTags: ["数学抽象", "数学运算", "直观想象"],
    itemTypeTags: ["概念辨析", "计算求解"],
    difficultyBand: "core",
    safeSummary: "This chapter extends number systems to complex numbers, their algebraic operations, geometric representation, and optional trigonometric representation where relevant.",
    generationGuidance: [
      "Ask learners to identify real and imaginary parts, perform operations, and interpret points on the complex plane.",
      "Use fresh values for conjugate, modulus, argument, and equation-root tasks.",
      "Connect algebraic simplification with geometric meaning without reusing textbook diagrams."
    ],
    misconceptionTags: ["imaginary unit power cycle error", "conjugate sign error", "modulus confused with real part"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-solid-geometry-intro",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "立体几何初步",
    conceptIds: ["solid-geometry", "spatial-lines-planes", "parallel-perpendicular", "surface-volume"],
    competencyTags: ["直观想象", "逻辑推理", "数学运算"],
    itemTypeTags: ["证明推理", "计算求解", "函数图像"],
    difficultyBand: "exam",
    safeSummary: "This chapter develops spatial imagination through solids, surface and volume ideas, and positional relationships among points, lines, and planes.",
    generationGuidance: [
      "Generate new solids or line-plane configurations for parallel, perpendicular, angle, distance, surface-area, or volume reasoning.",
      "Ask students to explain why a spatial relation follows from definitions or known criteria.",
      "For visual tasks, describe diagrams in original language and avoid source page figures."
    ],
    misconceptionTags: ["plane relation inferred from drawing only", "parallel criterion incomplete", "surface and volume formula mixed"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-statistics",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "统计",
    conceptIds: ["sampling", "data-distribution", "statistical-charts", "statistical-estimation"],
    competencyTags: ["数据分析", "数学建模", "应用意识"],
    itemTypeTags: ["统计概率情境题", "建模应用", "概念辨析"],
    difficultyBand: "core",
    safeSummary: "This chapter treats data as evidence: collect, sample, organize, visualize, summarize, and interpret variation in real situations.",
    generationGuidance: [
      "Create original datasets and ask students to choose sampling methods, compare charts, and interpret center or spread.",
      "Use authentic but newly authored contexts such as school surveys, sports data, health records, or public services.",
      "Assess reasoning about representativeness, bias, and what a statistic can or cannot conclude."
    ],
    misconceptionTags: ["sample not representative", "average treated as full distribution", "chart scale misread"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-probability",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "概率",
    conceptIds: ["probability-foundations", "random-events", "probability-operations", "simulation"],
    competencyTags: ["数据分析", "逻辑推理", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "概念辨析"],
    difficultyBand: "exam",
    safeSummary: "This chapter introduces random events, probability interpretation, event relationships, operations, and simulation as a way to reason about uncertainty.",
    generationGuidance: [
      "Design new random experiments and ask for sample space, event relation, probability, or frequency interpretation.",
      "Include tasks that distinguish mutually exclusive, opposite, independent, and conditional-looking events when appropriate.",
      "For exam-style items, combine counting, event operations, and real context interpretation."
    ],
    misconceptionTags: ["frequency equals exact probability", "event relation confused", "sample space incomplete"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-space-vectors-solid-geometry",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第一册 A版",
    chapter: "空间向量与立体几何",
    conceptIds: ["space-vectors", "spatial-coordinate-system", "line-plane-angle", "distance-in-space"],
    competencyTags: ["直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["证明推理", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter upgrades solid-geometry reasoning with vector coordinates, allowing angles, distances, perpendicularity, and projections in space to be calculated and justified.",
    generationGuidance: [
      "Create original three-dimensional coordinate tasks involving direction vectors, normal vectors, angle, distance, and projection.",
      "Ask learners to translate a spatial diagram into vector equations before computing.",
      "Use new prism, pyramid, or coordinate configurations rather than textbook figures."
    ],
    misconceptionTags: ["normal vector chosen incorrectly", "angle complement error", "point-to-plane distance formula misuse"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-lines-circles",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第一册 A版",
    chapter: "直线和圆的方程",
    conceptIds: ["analytic-geometry", "line-equations", "circle-equations", "coordinate-method"],
    competencyTags: ["数学运算", "直观想象", "逻辑推理"],
    itemTypeTags: ["计算求解", "函数图像", "证明推理"],
    difficultyBand: "core",
    safeSummary: "This chapter uses coordinate methods to represent lines and circles, analyze position relationships, and solve geometric conditions algebraically.",
    generationGuidance: [
      "Generate new coordinate conditions for line slope, intercept, distance, tangent, chord, or circle center-radius reasoning.",
      "Ask students to choose an equation form that fits the information given.",
      "For integrated items, combine line-circle position with parameter constraints."
    ],
    misconceptionTags: ["slope undefined case ignored", "circle radius squared error", "tangent distance condition missed"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-conic-sections",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第一册 A版",
    chapter: "圆锥曲线的方程",
    conceptIds: ["ellipse", "hyperbola", "parabola-conic", "conic-geometry"],
    competencyTags: ["数学抽象", "直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["函数图像", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter studies conic sections through definitions, standard equations, geometric properties, focal relationships, and coordinate problem solving.",
    generationGuidance: [
      "Create original conic tasks with newly chosen foci, directrix, eccentricity, chord, tangent, or parameter constraints.",
      "Require students to connect definition, equation, graph features, and algebraic solution.",
      "For high-difficulty practice, combine conics with line intersections, area, range, or optimization."
    ],
    misconceptionTags: ["a-b-c relation confused", "focus position swapped", "parameter range not checked"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-sequences",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第二册 A版",
    chapter: "数列",
    conceptIds: ["sequences", "arithmetic-sequences", "geometric-sequences", "recurrence", "mathematical-induction"],
    competencyTags: ["数学抽象", "数学运算", "逻辑推理"],
    itemTypeTags: ["计算求解", "证明推理", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter treats sequences as discrete functions, including term formulas, sums, recurrence, arithmetic and geometric structures, and optional induction reasoning.",
    generationGuidance: [
      "Generate original sequence patterns and ask for recursive and explicit descriptions.",
      "Combine sum formulas, monotonicity, bounds, or parameter constraints in exam-style tasks.",
      "Use induction only where it proves a general statement, not as a routine computation label."
    ],
    misconceptionTags: ["index shift error", "common difference ratio confused", "sum formula condition missed"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-derivatives-applications",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第二册 A版",
    chapter: "一元函数的导数及其应用",
    conceptIds: ["derivatives", "derivative-rules", "monotonicity-extrema", "optimization"],
    competencyTags: ["数学运算", "直观想象", "数学建模", "逻辑推理"],
    itemTypeTags: ["计算求解", "函数图像", "建模应用", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter uses derivatives to describe instantaneous rate of change, tangent slope, monotonicity, extrema, optimization, and function-graph behavior.",
    generationGuidance: [
      "Create original functions and ask students to compute derivatives, analyze sign intervals, locate extrema, and justify graph behavior.",
      "Use new optimization contexts with clearly defined variables and constraints.",
      "For exam-style problems, combine derivative sign analysis, parameters, zero distribution, and inequality reasoning."
    ],
    misconceptionTags: ["derivative zero treated as automatic extremum", "sign chart interval error", "endpoint in optimization ignored"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-counting-principles",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第三册 A版",
    chapter: "计数原理",
    conceptIds: ["counting-principles", "permutations-combinations", "binomial-theorem", "yanghui-triangle"],
    competencyTags: ["逻辑推理", "数学运算", "数学抽象"],
    itemTypeTags: ["计算求解", "证明推理", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter develops classification and stepwise counting, permutations, combinations, binomial expansion, and combinatorial reasoning.",
    generationGuidance: [
      "Generate new counting scenarios that force students to choose addition principle, multiplication principle, permutation, or combination.",
      "Include restrictions such as adjacency, exclusion, grouping, or at-least conditions using fresh contexts.",
      "For binomial tasks, vary target terms, coefficients, identities, and combinatorial interpretations."
    ],
    misconceptionTags: ["permutation combination swapped", "case overlap double-counted", "binomial term index error"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-random-variables-distributions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第三册 A版",
    chapter: "随机变量及其分布",
    conceptIds: ["random-variables", "discrete-distributions", "binomial-distribution", "normal-distribution", "expectation-variance"],
    competencyTags: ["数据分析", "数学运算", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter models uncertain quantities with random variables, distributions, expectation, variance, binomial models, and normal-distribution interpretation.",
    generationGuidance: [
      "Create new discrete random-variable tables or context distributions and ask for probability, expectation, variance, or interpretation.",
      "Use binomial or normal models only after students identify assumptions and parameters.",
      "For exam practice, combine distribution recognition, calculation, and real-context conclusion."
    ],
    misconceptionTags: ["expectation interpreted as guaranteed outcome", "binomial assumptions unchecked", "normal interval standardization error"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-bivariate-statistics",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第三册 A版",
    chapter: "成对数据的统计分析",
    conceptIds: ["bivariate-data", "correlation", "linear-regression", "independence-test"],
    competencyTags: ["数据分析", "数学建模", "逻辑推理"],
    itemTypeTags: ["统计概率情境题", "建模应用", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This chapter analyzes paired data through scatter patterns, correlation, regression prediction, residual interpretation, contingency tables, and independence testing.",
    generationGuidance: [
      "Generate original paired datasets or summary statistics and ask students to interpret association, fit, prediction, and limitations.",
      "For regression tasks, require a written conclusion that avoids overclaiming causation.",
      "For independence tests, use fresh two-way contexts and ask students to connect calculation with decision language."
    ],
    misconceptionTags: ["correlation mistaken for causation", "extrapolation beyond data range", "independence conclusion overstated"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-logic-quantifiers-conditions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "常用逻辑用语",
    conceptIds: ["logic-conditions", "quantifiers", "propositions", "proof-language"],
    competencyTags: ["逻辑推理", "数学抽象", "数学语言"],
    itemTypeTags: ["概念辨析", "证明推理"],
    difficultyBand: "foundation",
    safeSummary: "This topic strengthens precise mathematical language through propositions, negation, universal and existential quantifiers, and sufficient or necessary conditions.",
    generationGuidance: [
      "Generate new statement-classification tasks that require students to identify truth value, negation, and quantifier scope.",
      "Use fresh algebraic, geometric, or everyday predicates instead of source examples.",
      "Ask learners to justify whether a condition is sufficient, necessary, both, or neither."
    ],
    misconceptionTags: ["negation of quantifier incomplete", "sufficient and necessary direction reversed", "condition checked with examples only"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-basic-inequality-optimization",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "等式性质与不等式",
    conceptIds: ["inequality-properties", "basic-inequality", "optimization", "algebraic-transformations"],
    competencyTags: ["数学运算", "逻辑推理", "数学建模"],
    itemTypeTags: ["计算求解", "建模应用", "综合压轴题"],
    difficultyBand: "core",
    safeSummary: "This topic connects inequality transformations, comparison reasoning, equality conditions, and basic-inequality optimization in algebraic or contextual settings.",
    generationGuidance: [
      "Create original expressions where students must check positivity, equality conditions, and transformation validity.",
      "Use new area, cost, distance, or product-sum contexts for optimization questions.",
      "Require explanations to state why the inequality condition applies before using the formula."
    ],
    misconceptionTags: ["equality condition omitted", "positive condition unchecked", "inequality direction changed incorrectly"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-function-zero-modeling",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "函数模型与零点",
    conceptIds: ["function-modeling", "function-zero", "bisection-method", "growth-comparison"],
    competencyTags: ["数学建模", "直观想象", "逻辑推理"],
    itemTypeTags: ["建模应用", "函数图像", "计算求解"],
    difficultyBand: "exam",
    safeSummary: "This topic uses functions to model change, compare growth, locate zeros, and approximate solutions through interval reasoning.",
    generationGuidance: [
      "Use newly authored growth, threshold, or intersection contexts with clear variables and units.",
      "Ask students to connect sign change, graph behavior, and solution interval before approximation.",
      "For challenge tasks, combine model choice with zero-location or growth-rate comparison."
    ],
    misconceptionTags: ["sign change condition overstated", "model domain ignored", "approximation interval not updated"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-trigonometric-identities-transformations",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第一册 A版",
    chapter: "三角恒等变换",
    conceptIds: ["trigonometric-identities", "angle-sum-formulas", "double-angle-formulas", "trigonometric-transformations"],
    competencyTags: ["数学运算", "逻辑推理", "直观想象"],
    itemTypeTags: ["计算求解", "函数图像", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This topic uses angle-sum, difference, double-angle, and transformation identities to simplify expressions and analyze trigonometric graphs or equations.",
    generationGuidance: [
      "Generate new angle combinations and expression forms that require choosing an identity strategically.",
      "Pair symbolic transformation with interval, sign, or graph interpretation.",
      "Avoid source formula-layout patterns by varying the target expression and required reasoning."
    ],
    misconceptionTags: ["identity applied with wrong sign", "angle range ignored", "graph transformation separated from algebra"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-sine-cosine-theorems",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "解三角形",
    conceptIds: ["sine-theorem", "cosine-theorem", "triangle-modeling", "plane-vectors"],
    competencyTags: ["直观想象", "数学运算", "数学建模"],
    itemTypeTags: ["计算求解", "建模应用", "证明推理"],
    difficultyBand: "core",
    safeSummary: "This topic solves triangle measurement problems using sine theorem, cosine theorem, area relations, and vector-supported geometric reasoning.",
    generationGuidance: [
      "Create original triangle configurations with new side, angle, bearing, height, or distance constraints.",
      "Ask students to choose between sine theorem, cosine theorem, vector reasoning, or area relation.",
      "Include a short interpretation step when the problem is embedded in a measurement context."
    ],
    misconceptionTags: ["ambiguous triangle case missed", "radian and degree mix-up", "area formula chosen without included angle"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-statistics-sampling-estimation",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "抽样与统计估计",
    conceptIds: ["sampling", "stratified-sampling", "data-distribution", "percentiles", "mean-variance"],
    competencyTags: ["数据分析", "数学建模", "应用意识"],
    itemTypeTags: ["统计概率情境题", "建模应用", "概念辨析"],
    difficultyBand: "core",
    safeSummary: "This topic focuses on choosing sampling methods, describing distributions, estimating population features, and interpreting center and spread.",
    generationGuidance: [
      "Author fresh datasets or summaries and ask learners to compare sampling choices and statistical measures.",
      "Use contexts where bias, representativeness, and scale affect the conclusion.",
      "Require interpretation of statistics rather than only computation."
    ],
    misconceptionTags: ["strata proportion misread", "percentile direction reversed", "variance interpreted as average"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-probability-event-operations",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "compulsory",
    volume: "必修 第二册 A版",
    chapter: "事件关系与概率运算",
    conceptIds: ["random-events", "event-operations", "classical-probability", "simulation"],
    competencyTags: ["数据分析", "逻辑推理", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "概念辨析"],
    difficultyBand: "core",
    safeSummary: "This topic develops event relations, sample spaces, union and complement reasoning, classical probability, and simulation-based interpretation.",
    generationGuidance: [
      "Design new experiments with clearly defined sample spaces and event relationships.",
      "Ask students to identify mutually exclusive, opposite, inclusive, or nested events before computing.",
      "Use simulation language only to support reasoning about uncertainty, not to replace probability calculation."
    ],
    misconceptionTags: ["sample space incomplete", "opposite event confused with unrelated event", "overlapping cases double-counted"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-sequences-summation-recursion",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第二册 A版",
    chapter: "数列递推与求和",
    conceptIds: ["sequences", "recurrence", "sequence-summation", "mathematical-induction", "inequality-proof"],
    competencyTags: ["数学抽象", "数学运算", "逻辑推理"],
    itemTypeTags: ["证明推理", "计算求解", "综合压轴题"],
    difficultyBand: "challenge",
    safeSummary: "This topic deepens sequence work through recurrence transformation, summation methods, monotonicity, bounds, and proof-oriented reasoning.",
    generationGuidance: [
      "Generate new recursive definitions that require auxiliary sequences, telescoping, grouping, or comparison.",
      "Ask students to justify index shifts and initial terms explicitly.",
      "For challenge tasks, combine sequence structure with inequality or boundedness reasoning."
    ],
    misconceptionTags: ["index shift mismatch", "auxiliary sequence not verified", "summation boundary omitted"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-derivatives-tangent-zeros-inequalities",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第二册 A版",
    chapter: "导数综合应用",
    conceptIds: ["derivatives", "tangent-line", "implicit-zero", "function-inequalities", "parameter-classification"],
    competencyTags: ["数学运算", "逻辑推理", "直观想象"],
    itemTypeTags: ["函数图像", "证明推理", "综合压轴题"],
    difficultyBand: "challenge",
    safeSummary: "This topic uses derivatives for tangent questions, hidden-zero reasoning, inequality proof, double-variable control, and parameter classification.",
    generationGuidance: [
      "Create original functions where derivative signs support tangent, zero-count, or inequality conclusions.",
      "Require parameter-case boundaries and endpoint checks in the explanation.",
      "Use fresh algebraic forms so generated tasks are not recognizable from any source pattern."
    ],
    misconceptionTags: ["hidden zero assumed unique", "tangent condition applied at wrong point", "parameter boundary not checked"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "pep-high-conditional-probability-distributions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "textbook",
    module: "selective-compulsory",
    volume: "选择性必修 第三册 A版",
    chapter: "条件概率与分布模型",
    conceptIds: ["conditional-probability", "total-probability", "bayes-formula", "binomial-distribution", "hypergeometric-distribution"],
    competencyTags: ["数据分析", "逻辑推理", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    safeSummary: "This topic connects conditional probability, total probability, Bayes-style updating, and discrete distribution models for structured uncertainty problems.",
    generationGuidance: [
      "Design fresh two-stage or grouped experiments where conditions and populations are explicitly defined.",
      "Ask students to distinguish conditional probability from joint probability before computing.",
      "For distribution tasks, require model choice and parameter identification."
    ],
    misconceptionTags: ["condition reversed", "base-rate ignored", "binomial and hypergeometric assumptions confused"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    "id": "pep-high-teacher-resources-compulsory-1",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "sourceKind": "textbook",
    "module": "compulsory",
    "volume": "必修 第一册 A版",
    "chapter": "必修第一册教案与课件资源",
    "conceptIds": [
      "basic-inequality",
      "discrete-distributions",
      "exponential-functions",
      "function-definition",
      "function-zero",
      "line-equations",
      "logarithmic-functions",
      "logic-conditions",
      "plane-vectors",
      "quadratic-functions",
      "quantifiers",
      "sets",
      "sine-cosine-theorem",
      "trigonometric-functions",
      "trigonometric-identities"
    ],
    "competencyTags": [
      "数学抽象",
      "逻辑推理",
      "数学运算",
      "直观想象",
      "数学建模"
    ],
    "itemTypeTags": [
      "课堂导入",
      "概念讲解",
      "例题讲评",
      "分层练习",
      "复习总结",
      "错因诊断"
    ],
    "difficultyBand": "core",
    "safeSummary": "2 owner-provided teacher-resource archives for 必修 第一册 A版 were absorbed as metadata-only safe RAG. It signals lesson planning, courseware, knowledge summaries, guided practice, and review-resource coverage across 2290 usable files, with strongest chapter signals around 函数的概念与性质、指数函数与对数函数、集合与常用逻辑用语、三角函数、等式性质与不等式、解三角形.",
    "generationGuidance": [
      "Use this teacher-resource layer to calibrate lesson sequence, explanation depth, classroom pacing, board-work structure, formative checks, and review transitions.",
      "Prefer newly authored worked examples and checkpoint questions that match the observed chapter coverage but use fresh values, contexts, diagrams, and solution paths.",
      "Treat the dominant resource mix (lesson-plan、guided-learning-sheet、courseware、lecture-notes、practice-set) as a planning signal only; do not reuse source lesson wording or slide layout.",
      "When generating lessons, separate teacher-facing pedagogy from student-facing concise explanations, and run normal S18/S09/S05 review before release."
    ],
    "misconceptionTags": [
      "lesson sequence too close to source package",
      "example wording copied instead of re-authored",
      "teacher-only activity exposed as student answer text",
      "review handout treated as answer key"
    ],
    "prohibitedReuseNotes": [
      "Use this card only as abstract teacher-resource, lesson-sequencing, and item-design guidance.",
      "Do not copy, translate, paraphrase, reconstruct, or lightly modify any source lesson text, slide text, example, exercise, solution, figure, table, or textbook wording.",
      "Generate new MAIS-authored numbers, contexts, diagrams, explanations, prompts, and classroom activities."
    ]
  },
  {
    "id": "pep-high-teacher-resources-compulsory-2",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "sourceKind": "textbook",
    "module": "compulsory",
    "volume": "必修 第二册 A版",
    "chapter": "必修第二册教案与课件资源",
    "conceptIds": [
      "basic-inequality",
      "complex-numbers",
      "correlation",
      "discrete-distributions",
      "exponential-functions",
      "function-definition",
      "independence-test",
      "line-equations",
      "logarithmic-functions",
      "logic-conditions",
      "permutations-combinations",
      "plane-vectors",
      "probability-foundations",
      "quadratic-functions",
      "sets",
      "sine-cosine-theorem",
      "solid-geometry",
      "statistics",
      "trigonometric-functions"
    ],
    "competencyTags": [
      "数学抽象",
      "逻辑推理",
      "数学运算",
      "直观想象",
      "数学建模",
      "数据分析"
    ],
    "itemTypeTags": [
      "课堂导入",
      "概念讲解",
      "例题讲评",
      "分层练习",
      "复习总结",
      "错因诊断"
    ],
    "difficultyBand": "core",
    "safeSummary": "2 owner-provided teacher-resource archives for 必修 第二册 A版 were absorbed as metadata-only safe RAG. It signals lesson planning, courseware, knowledge summaries, guided practice, and review-resource coverage across 2439 usable files, with strongest chapter signals around 平面向量及其应用、直线和圆的方程、复数、解三角形、立体几何初步、概率.",
    "generationGuidance": [
      "Use this teacher-resource layer to calibrate lesson sequence, explanation depth, classroom pacing, board-work structure, formative checks, and review transitions.",
      "Prefer newly authored worked examples and checkpoint questions that match the observed chapter coverage but use fresh values, contexts, diagrams, and solution paths.",
      "Treat the dominant resource mix (lecture-notes、courseware、lesson-plan、guided-learning-sheet、practice-set) as a planning signal only; do not reuse source lesson wording or slide layout.",
      "When generating lessons, separate teacher-facing pedagogy from student-facing concise explanations, and run normal S18/S09/S05 review before release."
    ],
    "misconceptionTags": [
      "lesson sequence too close to source package",
      "example wording copied instead of re-authored",
      "teacher-only activity exposed as student answer text",
      "review handout treated as answer key"
    ],
    "prohibitedReuseNotes": [
      "Use this card only as abstract teacher-resource, lesson-sequencing, and item-design guidance.",
      "Do not copy, translate, paraphrase, reconstruct, or lightly modify any source lesson text, slide text, example, exercise, solution, figure, table, or textbook wording.",
      "Generate new MAIS-authored numbers, contexts, diagrams, explanations, prompts, and classroom activities."
    ]
  },
  {
    "id": "pep-high-teacher-resources-selective-1",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "sourceKind": "textbook",
    "module": "selective-compulsory",
    "volume": "选择性必修 第一册 A版",
    "chapter": "选择性必修第一册教案与课件资源",
    "conceptIds": [
      "basic-inequality",
      "circle-equations",
      "conic-geometry",
      "derivatives",
      "ellipse",
      "function-definition",
      "hyperbola",
      "line-equations",
      "mathematical-induction",
      "parabola-conic",
      "quadratic-functions",
      "sequences",
      "solid-geometry",
      "space-vectors",
      "spatial-coordinate-system"
    ],
    "competencyTags": [
      "数学抽象",
      "逻辑推理",
      "数学运算",
      "直观想象",
      "数学建模"
    ],
    "itemTypeTags": [
      "课堂导入",
      "概念讲解",
      "例题讲评",
      "分层练习",
      "复习总结",
      "错因诊断"
    ],
    "difficultyBand": "exam",
    "safeSummary": "2 owner-provided teacher-resource archives for 选择性必修 第一册 A版 were absorbed as metadata-only safe RAG. It signals lesson planning, courseware, knowledge summaries, guided practice, and review-resource coverage across 1602 usable files, with strongest chapter signals around 圆锥曲线的方程、直线和圆的方程、空间向量与立体几何、立体几何初步、数列、函数的概念与性质.",
    "generationGuidance": [
      "Use this teacher-resource layer to calibrate lesson sequence, explanation depth, classroom pacing, board-work structure, formative checks, and review transitions.",
      "Prefer newly authored worked examples and checkpoint questions that match the observed chapter coverage but use fresh values, contexts, diagrams, and solution paths.",
      "Treat the dominant resource mix (lecture-notes、lesson-plan、courseware、guided-learning-sheet、practice-set) as a planning signal only; do not reuse source lesson wording or slide layout.",
      "When generating lessons, separate teacher-facing pedagogy from student-facing concise explanations, and run normal S18/S09/S05 review before release."
    ],
    "misconceptionTags": [
      "lesson sequence too close to source package",
      "example wording copied instead of re-authored",
      "teacher-only activity exposed as student answer text",
      "review handout treated as answer key"
    ],
    "prohibitedReuseNotes": [
      "Use this card only as abstract teacher-resource, lesson-sequencing, and item-design guidance.",
      "Do not copy, translate, paraphrase, reconstruct, or lightly modify any source lesson text, slide text, example, exercise, solution, figure, table, or textbook wording.",
      "Generate new MAIS-authored numbers, contexts, diagrams, explanations, prompts, and classroom activities."
    ]
  },
  {
    "id": "pep-high-teacher-resources-selective-2",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "sourceKind": "textbook",
    "module": "selective-compulsory",
    "volume": "选择性必修 第二册 A版",
    "chapter": "选择性必修第二册教案与课件资源",
    "conceptIds": [
      "basic-inequality",
      "derivatives",
      "function-definition",
      "function-zero",
      "mathematical-induction",
      "sequences",
      "monotonicity-extrema",
      "optimization"
    ],
    "competencyTags": [
      "数学抽象",
      "逻辑推理",
      "数学运算",
      "直观想象",
      "数学建模"
    ],
    "itemTypeTags": [
      "课堂导入",
      "概念讲解",
      "例题讲评",
      "分层练习",
      "复习总结",
      "错因诊断"
    ],
    "difficultyBand": "exam",
    "safeSummary": "2 owner-provided teacher-resource archives for 选择性必修 第二册 A版 were absorbed as metadata-only safe RAG. It signals lesson planning, courseware, knowledge summaries, guided practice, and review-resource coverage across 241 usable files, with strongest chapter signals around 数列、函数的概念与性质、一元函数的导数及其应用、函数模型与零点、等式性质与不等式.",
    "generationGuidance": [
      "Use this teacher-resource layer to calibrate lesson sequence, explanation depth, classroom pacing, board-work structure, formative checks, and review transitions.",
      "Prefer newly authored worked examples and checkpoint questions that match the observed chapter coverage but use fresh values, contexts, diagrams, and solution paths.",
      "Treat the dominant resource mix (lesson-plan、guided-learning-sheet、courseware、practice-set、lecture-notes) as a planning signal only; do not reuse source lesson wording or slide layout.",
      "When generating lessons, separate teacher-facing pedagogy from student-facing concise explanations, and run normal S18/S09/S05 review before release."
    ],
    "misconceptionTags": [
      "lesson sequence too close to source package",
      "example wording copied instead of re-authored",
      "teacher-only activity exposed as student answer text",
      "review handout treated as answer key"
    ],
    "prohibitedReuseNotes": [
      "Use this card only as abstract teacher-resource, lesson-sequencing, and item-design guidance.",
      "Do not copy, translate, paraphrase, reconstruct, or lightly modify any source lesson text, slide text, example, exercise, solution, figure, table, or textbook wording.",
      "Generate new MAIS-authored numbers, contexts, diagrams, explanations, prompts, and classroom activities."
    ]
  },
  {
    "id": "pep-high-teacher-resources-selective-3",
    "curriculumTrack": "MAINLAND_PEP_HIGH",
    "sourceKind": "textbook",
    "module": "selective-compulsory",
    "volume": "选择性必修 第三册 A版",
    "chapter": "选择性必修第三册教案与课件资源",
    "conceptIds": [
      "binomial-distribution",
      "binomial-theorem",
      "bivariate-data",
      "correlation",
      "counting-principles",
      "discrete-distributions",
      "hypergeometric-distribution",
      "independence-test",
      "linear-regression",
      "logarithmic-functions",
      "normal-distribution",
      "permutations-combinations",
      "probability-foundations",
      "random-variables",
      "statistics"
    ],
    "competencyTags": [
      "数学抽象",
      "逻辑推理",
      "数学运算",
      "直观想象",
      "数学建模",
      "数据分析"
    ],
    "itemTypeTags": [
      "课堂导入",
      "概念讲解",
      "例题讲评",
      "分层练习",
      "复习总结",
      "错因诊断"
    ],
    "difficultyBand": "exam",
    "safeSummary": "2 owner-provided teacher-resource archives for 选择性必修 第三册 A版 were absorbed as metadata-only safe RAG. It signals lesson planning, courseware, knowledge summaries, guided practice, and review-resource coverage across 244 usable files, with strongest chapter signals around 计数原理、随机变量及其分布、成对数据的统计分析、概率、指数函数与对数函数、统计.",
    "generationGuidance": [
      "Use this teacher-resource layer to calibrate lesson sequence, explanation depth, classroom pacing, board-work structure, formative checks, and review transitions.",
      "Prefer newly authored worked examples and checkpoint questions that match the observed chapter coverage but use fresh values, contexts, diagrams, and solution paths.",
      "Treat the dominant resource mix (lesson-plan、support-resource、courseware、practice-set、knowledge-summary) as a planning signal only; do not reuse source lesson wording or slide layout.",
      "When generating lessons, separate teacher-facing pedagogy from student-facing concise explanations, and run normal S18/S09/S05 review before release."
    ],
    "misconceptionTags": [
      "lesson sequence too close to source package",
      "example wording copied instead of re-authored",
      "teacher-only activity exposed as student answer text",
      "review handout treated as answer key"
    ],
    "prohibitedReuseNotes": [
      "Use this card only as abstract teacher-resource, lesson-sequencing, and item-design guidance.",
      "Do not copy, translate, paraphrase, reconstruct, or lightly modify any source lesson text, slide text, example, exercise, solution, figure, table, or textbook wording.",
      "Generate new MAIS-authored numbers, contexts, diagrams, explanations, prompts, and classroom activities."
    ]
  }
];
