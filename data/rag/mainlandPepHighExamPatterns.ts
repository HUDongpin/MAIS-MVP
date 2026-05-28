import type { MainlandPepHighExamPatternCard } from "@/types";

const examOriginalityGuards = [
  "Use this card only as aggregated item-pattern guidance.",
  "Do not reproduce, paraphrase, translate, or lightly modify any source stem, answer, worked solution, figure, table, or scoring wording.",
  "Generate new mathematical objects, numbers, contexts, diagrams, constraints, and explanation wording for MAIS."
];

export const mainlandPepHighExamPatternCards: MainlandPepHighExamPatternCard[] = [
  {
    id: "pep-high-exam-derivatives-optimization",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "2023-2025",
    examFamilies: ["全国Ⅰ卷", "全国Ⅱ卷", "新课标Ⅰ卷", "北京", "天津"],
    chapter: "一元函数的导数及其应用",
    conceptIds: ["derivatives", "monotonicity-extrema", "optimization", "function-inequalities"],
    competencyTags: ["数学运算", "逻辑推理", "数学建模"],
    itemTypeTags: ["计算求解", "函数图像", "综合压轴题"],
    difficultyBand: "challenge",
    patternSummary: "Recent exam-style derivative tasks often combine rate of change, sign analysis, parameter control, extrema, tangent behavior, or inequality proof into one multi-step function investigation.",
    solutionStrategyTags: ["build derivative sign table", "split parameter cases", "connect roots to monotonic intervals", "check endpoints and boundary cases"],
    misconceptionTags: ["derivative zero treated as sufficient for extremum", "missing parameter case", "ignoring interval endpoint", "sign chart copied without justification"],
    generationGuidance: [
      "Create original functions and parameter conditions, then require derivative sign reasoning before any final conclusion.",
      "Use a new optimization or inequality goal rather than a memorized template.",
      "Require the generated solution to state interval, endpoint, and parameter-case checks explicitly."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-trigonometric-graphs",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "新课标Ⅰ卷", "北京", "天津", "上海"],
    chapter: "三角函数",
    conceptIds: ["trigonometric-functions", "trigonometric-graphs", "unit-circle", "trigonometric-identities"],
    competencyTags: ["直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["函数图像", "计算求解"],
    difficultyBand: "exam",
    patternSummary: "Exam patterns around trigonometric functions tend to test graph features, period and phase, special-angle reasoning, identity transformation, and range or solution-set interpretation.",
    solutionStrategyTags: ["normalize angle units", "read period from coefficient", "track phase direction", "use identity before solving"],
    misconceptionTags: ["phase direction reversed", "period formula error", "range over wrong interval", "special-angle sign error"],
    generationGuidance: [
      "Generate new amplitude, period, phase, and interval conditions so the item cannot be solved by recognizing a prior graph.",
      "Pair graph interpretation with one symbolic identity or equation step.",
      "Ask for reasoning about interval restrictions to prevent rote formula use."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-conics-analytic-geometry",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "新课标Ⅱ卷", "北京", "浙江"],
    chapter: "圆锥曲线的方程",
    conceptIds: ["ellipse", "hyperbola", "parabola-conic", "line-conic-intersection", "analytic-geometry"],
    competencyTags: ["数学抽象", "直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["函数图像", "计算求解", "综合压轴题"],
    difficultyBand: "challenge",
    patternSummary: "Conic exam problems frequently combine definition, standard equation, focal property, line intersection, chord or tangent condition, and parameter-range reasoning.",
    solutionStrategyTags: ["translate geometry to equations", "use discriminant condition", "introduce symmetric variables", "verify parameter feasibility"],
    misconceptionTags: ["wrong focal axis", "unverified parameter range", "squaring introduces extra solution", "tangent condition applied to wrong distance"],
    generationGuidance: [
      "Use fresh focal, chord, tangent, or line-intersection conditions and avoid classic copied diagrams.",
      "Require students to move between geometric definition and algebraic equation.",
      "Include at least one feasibility or range check in challenge-level generated items."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-space-vectors-geometry",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2023-2025",
    examFamilies: ["全国Ⅰ卷", "全国Ⅱ卷", "北京", "天津", "上海"],
    chapter: "空间向量与立体几何",
    conceptIds: ["space-vectors", "solid-geometry", "line-plane-angle", "distance-in-space", "parallel-perpendicular"],
    competencyTags: ["直观想象", "数学运算", "逻辑推理"],
    itemTypeTags: ["证明推理", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Spatial-geometry exam items commonly ask students to construct a coordinate or vector model, prove a relation, compute an angle or distance, and justify the spatial setup.",
    solutionStrategyTags: ["choose coordinate origin strategically", "derive direction or normal vectors", "separate proof step from computation", "validate geometric constraints"],
    misconceptionTags: ["normal vector mismatch", "angle complement confusion", "using a drawing as proof", "distance formula applied to wrong objects"],
    generationGuidance: [
      "Create original prisms, pyramids, or coordinate solids with new point constraints.",
      "Require a proof subtask before the measurement subtask in exam-style generation.",
      "Make the solution explain why the vector model matches the geometry."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-probability-statistics",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "新课标Ⅰ卷", "北京", "天津", "上海"],
    chapter: "概率",
    conceptIds: ["probability-foundations", "random-events", "probability-operations", "sampling", "data-distribution"],
    competencyTags: ["数据分析", "逻辑推理", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "建模应用"],
    difficultyBand: "exam",
    patternSummary: "Probability and statistics exam tasks often embed event relations or sampling decisions in a context, then require calculation plus interpretation of uncertainty or representativeness.",
    solutionStrategyTags: ["define sample space", "separate event cases", "check independence assumptions", "interpret result in context"],
    misconceptionTags: ["sample space incomplete", "overlapping cases double-counted", "frequency treated as certainty", "context conclusion overstated"],
    generationGuidance: [
      "Use new survey, game, production, or experiment contexts with independently authored data.",
      "Require both probability computation and a short interpretation.",
      "Avoid copying any table layout or context narrative from source papers."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-sequences-recursion",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "新课标Ⅱ卷", "浙江", "上海"],
    chapter: "数列",
    conceptIds: ["sequences", "arithmetic-sequences", "geometric-sequences", "recurrence", "mathematical-induction"],
    competencyTags: ["数学抽象", "数学运算", "逻辑推理"],
    itemTypeTags: ["计算求解", "证明推理", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Sequence exam patterns often treat sequences as discrete functions, requiring formula discovery, sum transformation, recurrence handling, monotonic or bounded reasoning, and sometimes proof.",
    solutionStrategyTags: ["compare recursive and explicit forms", "transform sums", "use auxiliary sequence", "verify initial terms"],
    misconceptionTags: ["index shift error", "first term omitted", "common ratio condition missed", "proof not anchored at base case"],
    generationGuidance: [
      "Generate new recursive or mixed sequence definitions with controlled complexity.",
      "Include a structural transformation rather than only formula substitution.",
      "For challenge items, require a boundedness, monotonicity, or proof component."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-counting-distributions",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "2023-2025",
    examFamilies: ["全国Ⅰ卷", "全国Ⅱ卷", "北京", "天津"],
    chapter: "计数原理",
    conceptIds: ["counting-principles", "permutations-combinations", "binomial-theorem", "random-variables", "binomial-distribution"],
    competencyTags: ["逻辑推理", "数学运算", "数据分析"],
    itemTypeTags: ["统计概率情境题", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Counting and distribution patterns test whether students can choose cases, avoid overlap, model repeated trials, and connect combinatorial counts with probability distribution quantities.",
    solutionStrategyTags: ["classify cases before computing", "subtract forbidden arrangements", "identify trial assumptions", "connect coefficient to count"],
    misconceptionTags: ["case overlap", "permutation and combination swapped", "missing restriction", "binomial parameter misread"],
    generationGuidance: [
      "Create new arrangements or trial models with restrictions that require explicit case design.",
      "Mix counting and probability only when the assumptions are clearly generated and checked.",
      "Require the answer explanation to state why cases are exhaustive and non-overlapping."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-bivariate-data",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2023-2025",
    examFamilies: ["全国Ⅰ卷", "全国Ⅱ卷", "北京", "上海"],
    chapter: "成对数据的统计分析",
    conceptIds: ["bivariate-data", "correlation", "linear-regression", "independence-test"],
    competencyTags: ["数据分析", "数学建模", "逻辑推理"],
    itemTypeTags: ["统计概率情境题", "建模应用"],
    difficultyBand: "core",
    patternSummary: "Bivariate-data patterns emphasize reading paired data, judging association, fitting or using a model, and making cautious conclusions about prediction or independence.",
    solutionStrategyTags: ["inspect association direction", "avoid causal overclaim", "check prediction range", "connect statistic to decision"],
    misconceptionTags: ["correlation read as causation", "extrapolation outside data", "rounding changes conclusion", "independence wording too strong"],
    generationGuidance: [
      "Use newly authored paired datasets or summary statistics.",
      "Ask for both calculation and interpretation in plain language.",
      "Make generated conclusions cautious and tied to the modeled context."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-functions-parameters",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "新课标Ⅰ卷", "北京", "天津", "浙江"],
    chapter: "函数的概念与性质",
    conceptIds: ["function-definition", "domain-range", "monotonicity", "parity", "function-inequalities"],
    competencyTags: ["数学抽象", "数学运算", "逻辑推理", "直观想象"],
    itemTypeTags: ["概念辨析", "函数图像", "综合压轴题"],
    difficultyBand: "challenge",
    patternSummary: "Function-parameter exam patterns ask students to combine domain, monotonicity, parity, range, roots, or inequality constraints with parameter classification.",
    solutionStrategyTags: ["state domain first", "use graph or derivative support", "split parameter cases", "verify equality boundary"],
    misconceptionTags: ["domain omitted before transformation", "parameter case not exhaustive", "range and value set confused", "symmetry used outside valid domain"],
    generationGuidance: [
      "Generate new function forms and parameter conditions that require classification rather than direct substitution.",
      "Require the generated solution to state domain and boundary cases early.",
      "Combine symbolic and visual reasoning without copying any source graph."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-analytic-lines-circles",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2021-2025",
    examFamilies: ["全国甲卷", "全国乙卷", "北京", "天津", "上海"],
    chapter: "直线和圆的方程",
    conceptIds: ["analytic-geometry", "line-equations", "circle-equations", "coordinate-method"],
    competencyTags: ["数学运算", "直观想象", "逻辑推理"],
    itemTypeTags: ["计算求解", "函数图像", "证明推理"],
    difficultyBand: "core",
    patternSummary: "Line-and-circle exam patterns often ask students to select an equation form, convert geometric conditions into algebra, and interpret tangent, distance, or intersection constraints.",
    solutionStrategyTags: ["choose equation form from given condition", "use distance relation", "check tangent or intersection criterion", "interpret coordinate result geometrically"],
    misconceptionTags: ["undefined slope ignored", "radius squared handled incorrectly", "distance formula target mismatch", "intersection condition misclassified"],
    generationGuidance: [
      "Create fresh point, slope, distance, tangent, or chord conditions.",
      "Make students explain why the selected equation form is efficient.",
      "Use new coordinate values and avoid source diagrams or layouts."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-legacy-stream-migration",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "2021-2022",
    examFamilies: ["全国甲卷", "全国乙卷", "legacy-stream"],
    chapter: "综合复习与跨章节建模",
    conceptIds: ["legacy-stream", "function-modeling", "analytic-geometry", "probability-foundations", "sequences"],
    competencyTags: ["数学抽象", "逻辑推理", "数学建模", "数据分析"],
    itemTypeTags: ["综合压轴题", "建模应用", "计算求解"],
    difficultyBand: "exam",
    patternSummary: "Older stream-specific papers are useful as historical pattern references for item sequencing, mixed-topic review, and difficulty calibration, but they should not control the future curriculum pathway.",
    solutionStrategyTags: ["map legacy topic to current concept", "preserve ability target not wording", "adjust prerequisite assumptions", "avoid stream-specific bias"],
    misconceptionTags: ["legacy scope treated as current scope", "old notation carried forward unnecessarily", "difficulty copied without curriculum fit"],
    generationGuidance: [
      "Use this card only to calibrate difficulty and mixed-topic sequencing.",
      "Regenerate tasks under current high-school concept IDs and current curriculum assumptions.",
      "Do not import stream-specific wording, ordering, or source contexts into student-facing items."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-basic-inequality-optimization",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "等式性质与不等式",
    conceptIds: ["basic-inequality", "inequality-properties", "optimization", "algebraic-transformations"],
    competencyTags: ["数学运算", "逻辑推理", "数学建模"],
    itemTypeTags: ["计算求解", "建模应用", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Inequality practice patterns often require recognizing a valid positive condition, transforming an expression, finding an equality condition, and interpreting an extremum.",
    solutionStrategyTags: ["check positivity first", "identify equality condition", "transform to target form", "verify context boundary"],
    misconceptionTags: ["using inequality without condition", "equality condition omitted", "endpoint ignored"],
    generationGuidance: [
      "Generate new algebraic forms or application settings with different constraints and targets.",
      "Require the answer to name the condition that permits the inequality step.",
      "Avoid reusing any source optimization setup, numbers, or context sequence."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-function-zero-models",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "函数模型与零点",
    conceptIds: ["function-modeling", "function-zero", "growth-comparison", "bisection-method"],
    competencyTags: ["数学建模", "直观想象", "逻辑推理"],
    itemTypeTags: ["建模应用", "函数图像", "计算求解"],
    difficultyBand: "exam",
    patternSummary: "Function-model and zero-location patterns combine context modeling, domain restrictions, sign or graph reasoning, and approximate solution intervals.",
    solutionStrategyTags: ["define model domain", "compare growth behavior", "locate sign-change interval", "interpret threshold"],
    misconceptionTags: ["domain omitted", "sign change overgeneralized", "approximation interval stale"],
    generationGuidance: [
      "Use newly authored growth, intersection, or threshold contexts.",
      "Change the model family, constants, and interpretation target in every generated item.",
      "Require students to connect numeric evidence to graph or interval reasoning."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-sine-cosine-vector-applications",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "平面向量与解三角形",
    conceptIds: ["plane-vectors", "sine-theorem", "cosine-theorem", "triangle-modeling", "dot-product"],
    competencyTags: ["直观想象", "数学运算", "数学建模"],
    itemTypeTags: ["计算求解", "证明推理", "建模应用"],
    difficultyBand: "exam",
    patternSummary: "Triangle and vector application patterns require selecting a geometric representation, translating measurement conditions, and checking whether a theorem or vector relation fits.",
    solutionStrategyTags: ["choose geometric model", "separate vector and triangle facts", "check ambiguous cases", "interpret measurement result"],
    misconceptionTags: ["wrong included angle", "ambiguous triangle case missed", "dot product sign misread"],
    generationGuidance: [
      "Create new triangles, bearings, forces, or coordinate-vector configurations.",
      "Vary which theorem or vector operation is efficient, so the item is not template-recognition.",
      "Ask for a brief reason supporting the chosen method."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-derivative-tangent-inequality",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "导数综合应用",
    conceptIds: ["derivatives", "tangent-line", "implicit-zero", "function-inequalities", "parameter-classification"],
    competencyTags: ["数学运算", "逻辑推理", "直观想象"],
    itemTypeTags: ["函数图像", "证明推理", "综合压轴题"],
    difficultyBand: "challenge",
    patternSummary: "Advanced derivative patterns combine tangent conditions, hidden-zero construction, inequality comparison, and parameter ranges into a structured function investigation.",
    solutionStrategyTags: ["differentiate before classifying", "build auxiliary function", "prove zero uniqueness", "split parameter ranges"],
    misconceptionTags: ["zero uniqueness assumed", "tangent point mismatched", "parameter boundary skipped"],
    generationGuidance: [
      "Generate new functions, parameters, and proof targets with independent algebraic structure.",
      "Require the generated solution to justify auxiliary function choice and zero uniqueness.",
      "Do not preserve source ordering, coefficient pattern, or proof wording."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-sequence-summation-inequality",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "数列递推与求和",
    conceptIds: ["sequences", "recurrence", "sequence-summation", "inequality-proof", "mathematical-induction"],
    competencyTags: ["数学抽象", "数学运算", "逻辑推理"],
    itemTypeTags: ["证明推理", "计算求解", "综合压轴题"],
    difficultyBand: "challenge",
    patternSummary: "Sequence challenge patterns often ask for recurrence transformation, summation method selection, and a proof of monotonicity, boundedness, or inequality.",
    solutionStrategyTags: ["derive auxiliary sequence", "track index shift", "choose summation method", "anchor proof step"],
    misconceptionTags: ["initial term omitted", "summation boundary off by one", "proof lacks base case"],
    generationGuidance: [
      "Create new recurrence and summation structures with controlled complexity.",
      "Require explicit index-boundary checks in generated explanations.",
      "Vary the proof target so tasks are structurally fresh."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-counting-method-taxonomy",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-solution",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "计数原理",
    conceptIds: ["counting-principles", "permutations-combinations", "binomial-theorem", "case-analysis"],
    competencyTags: ["逻辑推理", "数学运算", "数学抽象"],
    itemTypeTags: ["计算求解", "证明推理", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Counting-method patterns emphasize choosing the correct classification, enforcing restrictions, avoiding overlap, and connecting binomial coefficients to combinatorial meaning.",
    solutionStrategyTags: ["decide order sensitivity", "partition cases", "subtract forbidden cases", "verify exhaustive coverage"],
    misconceptionTags: ["case overlap", "order sensitivity misread", "restriction applied twice"],
    generationGuidance: [
      "Use new arrangements, selections, committees, routes, strings, or coefficient questions.",
      "Make generated solutions state why cases are exhaustive and disjoint.",
      "Change restriction type and object set for every new item."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-conditional-probability-models",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "条件概率与分布模型",
    conceptIds: ["conditional-probability", "total-probability", "bayes-formula", "binomial-distribution", "hypergeometric-distribution"],
    competencyTags: ["数据分析", "逻辑推理", "数学建模"],
    itemTypeTags: ["统计概率情境题", "计算求解", "综合压轴题"],
    difficultyBand: "exam",
    patternSummary: "Conditional-probability and distribution patterns test whether students can identify the condition, choose a model, and interpret probability or expectation in context.",
    solutionStrategyTags: ["name conditioning event", "separate stages", "choose distribution model", "interpret result"],
    misconceptionTags: ["condition reversed", "joint probability confused with conditional", "distribution assumptions mixed"],
    generationGuidance: [
      "Author new two-stage experiments, sampling contexts, or risk-update stories.",
      "Require model-choice justification before calculation.",
      "Vary population sizes, event definitions, and conclusion wording."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  },
  {
    id: "pep-high-exam-regression-independence",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    sourceKind: "exam-paper",
    yearRange: "aggregated-course-archive",
    examFamilies: ["chapter-tests", "pattern-compilation"],
    chapter: "成对数据的统计分析",
    conceptIds: ["bivariate-data", "linear-regression", "independence-test", "correlation"],
    competencyTags: ["数据分析", "数学建模", "逻辑推理"],
    itemTypeTags: ["统计概率情境题", "建模应用", "计算求解"],
    difficultyBand: "exam",
    patternSummary: "Regression and independence patterns combine data reading, calculation, decision language, and careful interpretation of association without causal overclaim.",
    solutionStrategyTags: ["read variables and units", "fit or use model", "avoid extrapolation", "state decision cautiously"],
    misconceptionTags: ["correlation treated as causation", "prediction outside range", "decision threshold misread"],
    generationGuidance: [
      "Use new paired datasets, summary statistics, or two-way tables.",
      "Ask for both calculation and plain-language interpretation.",
      "Ensure generated conclusions remain limited to the data and model."
    ],
    prohibitedReuseNotes: examOriginalityGuards
  }
];
