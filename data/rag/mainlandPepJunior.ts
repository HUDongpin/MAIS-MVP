import type { MainlandPepRagCard } from "@/types";

const juniorReuseGuards = [
  "Use this card only as abstract curriculum structure and pedagogy guidance for original MAIS work.",
  "Do not copy, rewrite, translate, closely paraphrase, or approximate PEP source wording, worked examples, practice items, answers, tables, diagrams, activity text, or visual layouts.",
  "Create fresh MAIS-authored numbers, contexts, representations, diagrams, explanations, and solution paths."
];

export const mainlandPepJuniorRagCards: MainlandPepRagCard[] = [
  {
    id: "pep-junior-s1-upper-rational-numbers",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    unitTitle: "有理数与数轴基础",
    conceptIds: ["rational-numbers", "number-line", "opposite-number", "absolute-value", "有理数", "数轴"],
    competencyTags: ["数感", "符号意识", "运算能力"],
    skillTags: ["正负数意义", "数轴表示", "相反数", "绝对值", "有理数运算"],
    misconceptionTags: ["negative number order reversed", "absolute value treated as signed", "operation sign and number sign confused"],
    safeSummary: "S1 upper begins junior algebra by extending whole-number arithmetic to signed rational numbers, number-line comparison, absolute value reasoning, and reliable operation strategies.",
    generationGuidance: [
      "Use newly authored temperature, elevation, score-change, or account-balance contexts to introduce signed quantities.",
      "Ask learners to connect a symbolic comparison with a number-line explanation and an operation check.",
      "Keep values original and vary integer, fraction, and decimal forms without matching source examples."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s1-upper-expressions-linear-equations",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    unitTitle: "整式初步与一元一次方程",
    conceptIds: ["algebraic-expressions", "like-terms", "linear-equations-one-variable", "一元一次方程", "整式"],
    competencyTags: ["符号意识", "运算能力", "模型意识"],
    skillTags: ["列代数式", "合并同类项", "去括号", "解一元一次方程", "实际问题建模"],
    misconceptionTags: ["like terms combined by coefficient only", "distributive sign lost", "equation balance step omitted"],
    safeSummary: "This card covers the move from arithmetic statements to algebraic language: represent quantities with letters, simplify linear expressions, and solve one-variable linear equations from original contexts.",
    generationGuidance: [
      "Create fresh quantity relationships and require students to state the unknown, the equality relationship, and the solving step.",
      "Include diagnostic prompts for sign distribution, collecting like terms, and checking a solution in the original relation.",
      "Avoid source scenario structures by changing contexts, numbers, and solution paths."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s1-upper-geometric-figures",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    unitTitle: "几何图形初步",
    conceptIds: ["geometric-figures", "lines-rays-segments", "angle-measurement", "geometry-foundations", "几何图形"],
    competencyTags: ["空间观念", "几何直观", "推理意识"],
    skillTags: ["点线面体", "线段射线直线", "角的度量", "基本作图语言"],
    misconceptionTags: ["drawing appearance over definition", "ray and segment confused", "angle size judged by arm length"],
    safeSummary: "S1 geometry establishes precise language for points, lines, segments, rays, angles, and simple spatial objects so learners can describe and reason about figures clearly.",
    generationGuidance: [
      "Use original figure descriptions and ask students to name objects by definition rather than appearance.",
      "Pair measurement, comparison, and explanation prompts for angle and segment reasoning.",
      "Generate fresh sketches or text descriptions if a visual task is needed."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "foundation",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s1-lower-lines-coordinates",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S1",
    semester: "lower",
    unitTitle: "相交线、平行线与平面直角坐标系",
    conceptIds: ["parallel-lines", "transversal-angles", "coordinate-plane", "ordered-pairs", "平行线", "平面直角坐标系"],
    competencyTags: ["空间观念", "几何直观", "数学表达"],
    skillTags: ["邻补角与对顶角", "平行线性质", "坐标表示", "象限判断", "平移与位置"],
    misconceptionTags: ["angle relation inferred without line condition", "x and y coordinates swapped", "axis point quadrant mislabeled"],
    safeSummary: "S1 lower links line-angle relationships with coordinate representation, helping learners justify parallel-line angle conclusions and locate or move points on a coordinate plane.",
    generationGuidance: [
      "Design new angle configurations and require the line condition before applying an angle relation.",
      "Use original coordinate tasks that include axis points, quadrant checks, and horizontal or vertical movement.",
      "Ask learners to explain both the geometric and coordinate meaning of a result."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s1-lower-equations-inequalities-data",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S1",
    semester: "lower",
    unitTitle: "二元一次方程组、不等式与数据初步",
    conceptIds: ["linear-systems-two-variables", "linear-inequalities", "data-collection", "二元一次方程组", "不等式", "数据收集"],
    competencyTags: ["模型意识", "运算能力", "数据意识"],
    skillTags: ["代入消元", "加减消元", "不等式性质", "解集表示", "调查与统计图"],
    misconceptionTags: ["solution pair not checked in both equations", "inequality direction not reversed", "survey conclusion exceeds data"],
    safeSummary: "This card extends equation modeling to two unknowns, introduces inequality solution sets, and begins data collection and interpretation with attention to what the data can support.",
    generationGuidance: [
      "Create original two-quantity contexts and ask students to define variables before solving.",
      "For inequalities, include number-line solution-set reasoning and explicit checks around boundary values.",
      "For data work, use small newly authored datasets and ask for a justified conclusion."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s2-upper-triangles-congruence",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S2",
    semester: "upper",
    unitTitle: "三角形、全等与轴对称",
    conceptIds: ["triangles", "triangle-congruence", "axis-symmetry", "三角形", "全等三角形", "轴对称"],
    competencyTags: ["几何直观", "逻辑推理", "空间观念"],
    skillTags: ["三角形边角关系", "全等判定", "角平分线", "垂直平分线", "轴对称性质"],
    misconceptionTags: ["congruence condition incomplete", "corresponding parts mismatched", "symmetry axis guessed from appearance"],
    safeSummary: "S2 upper develops triangle reasoning through side-angle relationships, congruence criteria, and symmetry properties as a bridge from observation to proof.",
    generationGuidance: [
      "Use newly authored geometric configurations and ask students to identify corresponding vertices before applying a criterion.",
      "Vary proof, construction, and missing-measure prompts while keeping figure relationships original.",
      "Prompt learners to distinguish a property from the condition that permits using it."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s2-upper-polynomials-fractions",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S2",
    semester: "upper",
    unitTitle: "整式乘法、因式分解与分式",
    conceptIds: ["polynomial-multiplication", "factorization", "algebraic-fractions", "因式分解", "分式"],
    competencyTags: ["运算能力", "符号意识", "逻辑推理"],
    skillTags: ["乘法公式", "提公因式", "公式法分解", "分式约分", "分式方程"],
    misconceptionTags: ["formula pattern overmatched", "common factor not complete", "extraneous solution not checked"],
    safeSummary: "This card strengthens symbolic manipulation by connecting polynomial products, factorization strategies, algebraic fractions, and equation checks.",
    generationGuidance: [
      "Generate fresh expressions that make structure visible without copying familiar source patterns.",
      "Ask students to name the factorization strategy and verify by expansion.",
      "For fraction equations, require domain restriction and final solution checking."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s2-lower-roots-pythagorean-quadrilaterals",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S2",
    semester: "lower",
    unitTitle: "二次根式、勾股定理与平行四边形",
    conceptIds: ["radicals", "pythagorean-theorem", "quadrilaterals", "parallelogram", "二次根式", "勾股定理", "平行四边形"],
    competencyTags: ["运算能力", "几何直观", "逻辑推理"],
    skillTags: ["二次根式化简", "勾股定理应用", "逆定理", "平行四边形性质", "特殊四边形"],
    misconceptionTags: ["radical simplification loses condition", "right triangle condition assumed", "quadrilateral property applied to wrong class"],
    safeSummary: "S2 lower connects exact radical computation with geometric measurement and quadrilateral classification, especially right-triangle reasoning and parallelogram properties.",
    generationGuidance: [
      "Use original side-length and coordinate settings for right-triangle and quadrilateral reasoning.",
      "Ask learners to justify why a triangle is right before applying or reversing the theorem.",
      "Vary radical simplification tasks and include reasonableness checks for lengths."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "core",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s2-lower-linear-functions-data",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S2",
    semester: "lower",
    unitTitle: "一次函数与数据分析",
    conceptIds: ["linear-functions", "function-graphs", "data-analysis", "一次函数", "函数图象", "数据分析"],
    competencyTags: ["数学建模", "直观想象", "数据意识"],
    skillTags: ["函数关系", "一次函数图象", "斜率与截距", "待定系数法", "平均数中位数众数"],
    misconceptionTags: ["slope and intercept roles confused", "point not checked on graph", "center statistic chosen without context"],
    safeSummary: "This card introduces function-as-relationship thinking through linear graphs, formulas, and contextual interpretation while deepening data summary and comparison.",
    generationGuidance: [
      "Create fresh rate, cost, distance, or measurement contexts with original parameters.",
      "Ask students to move between table, formula, graph, and verbal interpretation.",
      "For data tasks, require students to explain which summary statistic fits the question."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "exam",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s3-upper-quadratics-circle-probability",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S3",
    semester: "upper",
    unitTitle: "一元二次方程、二次函数、圆与概率初步",
    conceptIds: ["quadratic-equations", "quadratic-functions", "circle-geometry", "rotation", "probability-introduction", "二次函数", "圆", "一元二次方程"],
    competencyTags: ["数学运算", "直观想象", "逻辑推理", "数据意识"],
    skillTags: ["配方法", "公式法", "二次函数图象", "圆的性质", "旋转变换", "简单概率"],
    misconceptionTags: ["discriminant meaning ignored", "vertex and axis confused", "circle relation inferred from drawing", "probability sample space incomplete"],
    safeSummary: "S3 upper consolidates algebraic and geometric reasoning through quadratic equations, quadratic functions, rotation, circle properties, and introductory probability models.",
    generationGuidance: [
      "Use original coefficients and contexts for quadratic-solving and graph-interpretation tasks.",
      "For circle reasoning, create new configurations and ask students to cite the relationship being used.",
      "For probability, define a clear sample space and ask for both calculation and interpretation."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "exam",
    sourceKind: "safe-abstraction"
  },
  {
    id: "pep-junior-s3-lower-inverse-similarity-trigonometry",
    publisher: "MAINLAND_PEP",
    stage: "junior-secondary",
    grade: "S3",
    semester: "lower",
    unitTitle: "反比例函数、相似与锐角三角函数",
    conceptIds: ["inverse-proportion-functions", "similarity", "right-triangle-trigonometry", "projection-views", "反比例函数", "相似", "锐角三角函数"],
    competencyTags: ["数学建模", "几何直观", "运算能力", "空间观念"],
    skillTags: ["反比例函数图象", "相似判定", "比例线段", "正弦余弦正切", "投影与视图"],
    misconceptionTags: ["inverse proportion quadrant misread", "similarity ratio inverted", "trigonometric ratio side choice wrong", "view direction confused"],
    safeSummary: "S3 lower prepares learners for senior-secondary mathematics by combining inverse-proportion functions, similarity, right-triangle trigonometry, and spatial-view reasoning.",
    generationGuidance: [
      "Generate fresh measurement, scale, and graph situations with original constants and dimensions.",
      "Ask students to identify corresponding sides before using similarity or trigonometric ratios.",
      "Use newly authored solid descriptions for view reasoning and avoid recognizable layout patterns."
    ],
    prohibitedReuseNotes: juniorReuseGuards,
    difficultyBand: "exam",
    sourceKind: "safe-abstraction"
  }
];
