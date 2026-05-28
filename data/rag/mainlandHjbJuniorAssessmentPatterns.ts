import type { MainlandHjbJuniorAssessmentPatternCard } from "@/types";

const hjbJuniorAssessmentReuseGuards = [
  "Use this card only as aggregated HJB junior assessment-pattern guidance for original MAIS work.",
  "Do not copy, rewrite, translate, closely paraphrase, or approximate protected stems, worked responses, scoring wording, tables, diagrams, visual layouts, or item order.",
  "Generate fresh MAIS-authored values, contexts, diagrams, distractors, reasoning steps, hints, explanations, and checking prompts."
];

export const mainlandHjbJuniorAssessmentPatternCards: MainlandHjbJuniorAssessmentPatternCard[] = [
  {
    id: "hjb-junior-s1-upper-assessment-polynomial-add-subtract-unit",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "school-assessment-pattern",
    materialKinds: ["unit-test", "topic-practice", "paper"],
    assessmentFamilies: ["unit-test"],
    unitTitles: ["整式的加减"],
    conceptIds: ["algebraic-expressions", "polynomials", "like-terms", "polynomial-addition-subtraction", "整式", "同类项"],
    competencyTags: ["符号意识", "运算能力", "数学表达", "结构意识"],
    skillTags: ["代数式意义", "整式识别", "合并同类项", "去括号", "化简求值"],
    itemTypeTags: ["expression translation", "like-term grouping", "parentheses and signs", "simplify and evaluate", "error explanation"],
    difficultyBand: "core",
    patternSummary: "S1 upper HJB expression-assessment patterns emphasize identifying like terms, handling signs around parentheses, simplifying reliably, and checking a substitution after the form is simplified.",
    solutionStrategyTags: ["mark like-term groups", "distribute signs before collecting", "substitute after simplification", "check a sign-sensitive step"],
    misconceptionTags: ["unlike terms combined", "minus sign lost before brackets", "variable part changed during simplification", "substitution done too early"],
    generationGuidance: [
      "Create original quantity, perimeter, classroom, or pattern contexts that ask students to write and simplify an expression.",
      "Vary coefficient signs and variable parts so the task diagnoses like-term recognition rather than memory.",
      "Require one short explanation naming the like terms or the sign rule used."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  },
  {
    id: "hjb-junior-s1-upper-assessment-polynomial-multiply-divide-unit",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "school-assessment-pattern",
    materialKinds: ["unit-test", "topic-practice", "paper"],
    assessmentFamilies: ["unit-test"],
    unitTitles: ["整式的乘除"],
    conceptIds: ["exponent-laws", "monomial-multiplication", "polynomial-multiplication", "multiplication-formulas", "幂的运算"],
    competencyTags: ["运算能力", "符号意识", "逻辑推理", "结构意识"],
    skillTags: ["同底数幂", "幂的乘方", "积的乘方", "整式乘法", "乘法公式", "整式除法"],
    itemTypeTags: ["exponent-law calculation", "monomial operation", "formula recognition", "polynomial expansion", "division factor check"],
    difficultyBand: "core",
    patternSummary: "S1 upper HJB polynomial-operation patterns check whether students choose the correct exponent law, recognize formula structure, and preserve signs and powers through multiplication or division.",
    solutionStrategyTags: ["name the exponent law first", "expand to verify formula use", "track signs separately from powers", "check omitted factors"],
    misconceptionTags: ["exponents added in power of a power", "formula pattern overmatched", "negative factor mishandled", "division factor omitted"],
    generationGuidance: [
      "Generate fresh monomial and polynomial expressions with varied signs, powers, and coefficients.",
      "Pair one direct operation with one structure-recognition task that asks students to justify the method.",
      "Use verification by expansion or reverse multiplication as the checking step."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  },
  {
    id: "hjb-junior-s1-upper-assessment-factorization-unit",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "school-assessment-pattern",
    materialKinds: ["unit-test", "topic-practice", "paper"],
    assessmentFamilies: ["unit-test"],
    unitTitles: ["因式分解"],
    conceptIds: ["factorization", "common-factor", "formula-factorization", "polynomial-structure", "因式分解"],
    competencyTags: ["运算能力", "逻辑推理", "符号意识", "结构意识"],
    skillTags: ["因式分解意义", "提公因式", "公式法", "分解检查", "结构识别"],
    itemTypeTags: ["common-factor extraction", "formula factorization", "method selection", "factorization verification", "incomplete-work diagnosis"],
    difficultyBand: "core",
    patternSummary: "S1 upper HJB factorization patterns usually ask students to identify a common factor or formula structure, choose a method, and verify the result by multiplying factors back out.",
    solutionStrategyTags: ["look for a complete common factor", "check formula structure before applying", "extract a negative factor deliberately", "verify by expansion"],
    misconceptionTags: ["common factor not complete", "factorization stops too early", "formula structure misread", "sign error when extracting negative factor"],
    generationGuidance: [
      "Create original expressions where the factorization route is visible but not a template swap.",
      "Ask students to state the selected method before completing the transformation.",
      "Include one item where an incomplete factorization must be corrected."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  },
  {
    id: "hjb-junior-s1-upper-assessment-algebraic-fractions-unit",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "school-assessment-pattern",
    materialKinds: ["unit-test", "topic-practice", "paper"],
    assessmentFamilies: ["unit-test"],
    unitTitles: ["分式"],
    conceptIds: ["algebraic-fractions", "fraction-domain", "equivalent-fractions", "fraction-operations", "分式"],
    competencyTags: ["符号意识", "运算能力", "逻辑推理", "表达与检查"],
    skillTags: ["分式意义", "取值限制", "分式基本性质", "约分通分", "分式运算"],
    itemTypeTags: ["domain restriction", "equivalent transformation", "simplify algebraic fraction", "common denominator", "operation check"],
    difficultyBand: "core",
    patternSummary: "S1 upper HJB algebraic-fraction patterns focus on recording restrictions, transforming expressions by factors rather than terms, and checking whether operations preserve meaning.",
    solutionStrategyTags: ["write excluded values first", "cancel factors only", "choose a complete common denominator", "check with a valid substitution"],
    misconceptionTags: ["denominator restriction ignored", "cancelling terms instead of factors", "common denominator incomplete", "restriction lost after simplification"],
    generationGuidance: [
      "Use fresh algebraic fractions and require the restriction statement before any transformation.",
      "Mix simplification and operation tasks so learners must distinguish factors from terms.",
      "Ask the generated explanation to include one valid substitution check."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  },
  {
    id: "hjb-junior-s1-upper-assessment-figure-transformations-unit",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "school-assessment-pattern",
    materialKinds: ["unit-test", "topic-practice", "paper"],
    assessmentFamilies: ["unit-test"],
    unitTitles: ["图形的运动"],
    conceptIds: ["geometric-transformations", "translation", "rotation", "reflection", "symmetry", "图形运动"],
    competencyTags: ["空间观念", "几何直观", "推理意识", "表达与检查"],
    skillTags: ["平移", "旋转", "翻折", "轴对称", "变换前后关系"],
    itemTypeTags: ["transformation identification", "corresponding point", "invariant reasoning", "grid or coordinate movement", "symmetry judgment"],
    difficultyBand: "foundation",
    patternSummary: "S1 upper HJB transformation patterns ask students to identify the movement, match corresponding points, and explain invariant lengths, angles, orientation, or symmetry conditions.",
    solutionStrategyTags: ["name the movement before measuring", "match corresponding points", "track invariant lengths and angles", "separate appearance from stated conditions"],
    misconceptionTags: ["movement changes shape size", "corresponding points mismatched", "rotation direction confused", "symmetry line inferred from appearance only"],
    generationGuidance: [
      "Author new grid, coordinate, or labelled-figure descriptions with newly drawn diagrams when needed.",
      "Ask for one invariant property and one corresponding-point statement.",
      "Vary translation, rotation, reflection, and symmetry tasks without copying visual layouts."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  },
  {
    id: "hjb-junior-s1-upper-assessment-midterm-final-integrated",
    curriculumTrack: "MAINLAND_PEP_HIGH",
    publisher: "MAINLAND_HJB",
    stage: "junior-secondary",
    grade: "S1",
    semester: "upper",
    sourceKind: "review-pattern",
    materialKinds: ["midterm-final", "review", "paper"],
    assessmentFamilies: ["midterm", "final", "comprehensive"],
    unitTitles: ["七年级上册期中综合", "七年级上册期末综合", "整式的加减", "整式的乘除", "因式分解", "分式", "图形的运动"],
    conceptIds: [
      "s1-upper-integrated-review",
      "polynomial-addition-subtraction",
      "polynomial-multiplication",
      "factorization",
      "algebraic-fractions",
      "geometric-transformations",
      "综合应用"
    ],
    competencyTags: ["综合应用", "运算能力", "符号意识", "空间观念", "表达与检查"],
    skillTags: ["整式综合运算", "结构识别", "分式限制", "图形变换", "错因诊断"],
    itemTypeTags: ["mixed review", "method selection", "multi-skill short task", "diagnostic correction", "algebra-geometry bridge"],
    difficultyBand: "exam",
    patternSummary: "S1 upper HJB integrated assessment patterns combine symbolic fluency, structure recognition, algebraic-fraction restrictions, and transformation reasoning while rewarding method choice and checking habits.",
    solutionStrategyTags: ["identify the topic before computing", "show sign and factor handling", "record restrictions before fraction work", "separate geometry facts from measurement"],
    misconceptionTags: ["operation chosen by keyword only", "sign error hidden in long calculation", "restriction omitted in review tasks", "geometry relation inferred from appearance"],
    generationGuidance: [
      "Build original mixed review sets with clear topic variety and no recognizable ordering.",
      "Include one diagnostic item that asks learners to find and explain an error.",
      "Keep multi-step tasks age-appropriate and focused on one or two linked ideas."
    ],
    prohibitedReuseNotes: hjbJuniorAssessmentReuseGuards
  }
];
