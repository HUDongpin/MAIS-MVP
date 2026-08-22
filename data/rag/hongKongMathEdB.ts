import type { HongKongMathEdBRagCard } from "@/types";

const originalityGuards = [
  "Use this card only as abstract Hong Kong curriculum and item-design guidance.",
  "Do not reproduce, translate, or lightly rewrite source wording, worked examples, figures, tables, scoring language, or paper stems.",
  "Generate new MAIS-authored numbers, contexts, diagrams, prompts, hints, and explanations."
];

const allGrades = ["P1", "P2", "P3", "P4", "P5", "P6", "S1", "S2", "S3", "S4", "S5", "S6"] as const;
const primaryGrades = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const juniorGrades = ["S1", "S2", "S3"] as const;
const seniorGrades = ["S4", "S5", "S6"] as const;

const primaryTopicIds = [
  "p1-counting-number-bonds",
  "p1-addition-subtraction",
  "p1-shapes-patterns",
  "p1-measurement-time",
  "p2-place-value",
  "p2-multiplication-foundations",
  "p2-money-time",
  "p2-length-data",
  "p3-multiplication-division",
  "p3-fractions-intro",
  "p3-measurement",
  "p3-geometry-patterns",
  "p4-large-numbers",
  "p4-decimals",
  "p4-angles",
  "p4-perimeter-area",
  "p5-fractions-operations",
  "p5-volume",
  "p5-rates",
  "p5-charts-averages",
  "p6-percentages",
  "p6-ratio-proportion",
  "p6-speed",
  "p6-pre-secondary-problem-solving"
];

const juniorTopicIds = [
  "integers",
  "algebra-basics",
  "angles",
  "ratios",
  "statistics-s1",
  "linear-equations",
  "coordinates",
  "transformations",
  "probability-s2",
  "polynomials",
  "identities-square-patterns",
  "trigonometry-basics",
  "arc-length-sector-area"
];

const seniorCompulsoryTopicIds = [
  "functions",
  "coordinate-geometry",
  "more-algebra",
  "data-handling",
  "advanced-functions",
  "trigonometry-s5",
  "probability-s5",
  "quadratic-patterns",
  "circles",
  "exam-revision",
  "mixed-problem-solving"
];

export const hongKongMathEdBRagCards: HongKongMathEdBRagCard[] = [
  {
    id: "hk-edb-whole-curriculum-framework",
    curriculumTrack: "HK",
    stage: "whole-curriculum",
    documentPurposes: ["curriculum-guide"],
    grades: [...allGrades],
    sourceFiles: ["数学教育-学习领域课程指引（小一至中六）ME_KLACG_chi_2017_12_08.pdf"],
    topicIds: [...primaryTopicIds, ...juniorTopicIds, ...seniorCompulsoryTopicIds],
    conceptIds: ["curriculum-progression", "mathematical-literacy", "problem-solving", "reasoning", "communication", "connections"],
    competencyTags: ["conceptual understanding", "procedural fluency", "reasoning", "communication", "application"],
    itemTypeTags: ["concept explanation", "open-ended investigation", "cross-topic task", "diagnostic prompt"],
    difficultyBand: "core",
    safeSummary: "Hong Kong mathematics learning should progress from concrete experiences and accurate language toward flexible reasoning, problem solving, communication, and application across primary and secondary years.",
    generationGuidance: [
      "Generate tasks that connect a clear concept, a representation, and a short reasoning step.",
      "Use Hong Kong school terminology and familiar but newly authored contexts.",
      "For cross-stage revision, build bridges between prior concrete models and later symbolic methods."
    ],
    misconceptionTags: ["treating procedures as isolated rules", "weak mathematical communication", "missing connection between representation and method"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-primary-learning-content",
    curriculumTrack: "HK",
    stage: "primary",
    documentPurposes: ["learning-content-supplement"],
    grades: [...primaryGrades],
    sourceFiles: ["数学教育学习领域课程指引补充文件-小学数学科学习内容pmc2017_tc.pdf"],
    topicIds: primaryTopicIds,
    conceptIds: ["number-sense", "four-operations", "fractions", "decimals", "measurement", "geometry", "data-handling"],
    competencyTags: ["number sense", "spatial sense", "measurement reasoning", "data interpretation", "mathematical communication"],
    itemTypeTags: ["visual model task", "short computation", "word problem", "hands-on reasoning", "data reading"],
    difficultyBand: "foundation",
    safeSummary: "Primary mathematics should broaden number, measure, shape, data, and problem-solving experiences while keeping representations concrete enough for young learners to explain their thinking.",
    generationGuidance: [
      "Create varied primary tasks using manipulatives, diagrams, number lines, arrays, measures, money, time, and charts.",
      "Use small step changes to produce practice variants without copying any worked example.",
      "Ask for a sentence, drawing, or check step so students practise communication as well as computation."
    ],
    misconceptionTags: ["place-value digit read as face value only", "operation chosen from keyword only", "unit omitted or mismatched", "chart scale misread"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-primary-ks1-interpretation",
    curriculumTrack: "HK",
    stage: "primary",
    documentPurposes: ["curriculum-interpretation"],
    grades: ["P1", "P2", "P3"],
    sourceFiles: ["小学数学课程阐释（第一学习阶段）EN_KS1_tc.pdf"],
    topicIds: primaryTopicIds.filter((topicId) => topicId.startsWith("p1-") || topicId.startsWith("p2-") || topicId.startsWith("p3-")),
    conceptIds: ["counting", "number-bonds", "addition-subtraction", "multiplication-division", "fractions-intro", "measurement", "shapes-patterns"],
    competencyTags: ["concrete representation", "early reasoning", "language precision", "pattern recognition"],
    itemTypeTags: ["counting task", "number bond task", "array task", "simple measurement task", "shape classification"],
    difficultyBand: "foundation",
    safeSummary: "The first primary learning stage is best supported by concrete counting, grouping, measuring, comparing, and describing tasks that move gradually from objects to symbols.",
    generationGuidance: [
      "Use fresh classroom, home, money, time, and shape contexts with small numbers and visible structures.",
      "Generate distractors that reveal counting, place-value, or operation-choice misunderstandings.",
      "Keep language short and ask students to name the model they used."
    ],
    misconceptionTags: ["counting all instead of grouping", "equal groups confused with unequal sharing", "fraction denominator read as amount shaded", "shape named by orientation only"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-primary-ks2-interpretation",
    curriculumTrack: "HK",
    stage: "primary",
    documentPurposes: ["curriculum-interpretation"],
    grades: ["P4", "P5", "P6"],
    sourceFiles: ["小学数学课程阐释（第二学习阶段）EN_KS1_tc.pdf"],
    topicIds: primaryTopicIds.filter((topicId) => topicId.startsWith("p4-") || topicId.startsWith("p5-") || topicId.startsWith("p6-")),
    conceptIds: ["large-numbers", "decimals", "fractions-operations", "angles", "perimeter-area", "volume", "rates", "percentages", "ratio-proportion", "speed", "charts-averages"],
    competencyTags: ["multi-step reasoning", "representation transfer", "estimation", "proportional reasoning", "data interpretation"],
    itemTypeTags: ["multi-step word problem", "diagram-supported task", "unit conversion", "rate comparison", "chart interpretation"],
    difficultyBand: "core",
    safeSummary: "The second primary learning stage should deepen operations, measures, geometry, proportional ideas, data handling, and pre-secondary problem solving through connected representations.",
    generationGuidance: [
      "Create original multi-step problems where students choose a unit, representation, or proportional relation.",
      "Vary numbers and contexts while preserving the target concept, not the shape of any source task.",
      "Ask students to estimate or check reasonableness before giving a final answer."
    ],
    misconceptionTags: ["fraction operation rule overgeneralized", "area and perimeter confused", "rate denominator ignored", "average treated as a single observed value"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-primary-revision-comparison",
    curriculumTrack: "HK",
    stage: "primary",
    documentPurposes: ["revision-comparison"],
    grades: [...primaryGrades],
    sourceFiles: ["小学数学修订课程（2017）内容与小学数学课程（2000）内容比较CT_Pri_tc.pdf"],
    topicIds: primaryTopicIds,
    conceptIds: ["spiral-progression", "curriculum-transition", "prior-knowledge", "problem-solving", "representation"],
    competencyTags: ["progression mapping", "diagnosis", "bridging instruction", "review design"],
    itemTypeTags: ["readiness check", "spiral review", "same-concept variant", "misconception probe"],
    difficultyBand: "core",
    safeSummary: "Primary revision guidance can help MAIS build spiral review: revisit earlier concepts in fresh forms, then connect them to the next stage without treating review as repetition only.",
    generationGuidance: [
      "Generate readiness checks that expose prerequisite gaps before a new topic.",
      "Design same-concept variants across concrete, pictorial, and symbolic forms.",
      "Use review prompts to ask what changed, what stayed the same, and which prior idea is being reused."
    ],
    misconceptionTags: ["review task too similar to prior drill", "prerequisite gap hidden by lucky answer", "student cannot name the reused idea"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-junior-learning-content",
    curriculumTrack: "HK",
    stage: "junior-secondary",
    documentPurposes: ["learning-content-supplement"],
    grades: [...juniorGrades],
    sourceFiles: ["数学教育学习领域课程指引补充文件-初中数学科学习内容jsmc2017_tc.pdf"],
    topicIds: juniorTopicIds,
    conceptIds: ["integers", "algebra", "angles", "ratios", "statistics", "linear-equations", "coordinates", "transformations", "probability", "polynomials", "algebraic-identities", "trigonometry", "arc-sector-measurement"],
    competencyTags: ["symbolic reasoning", "geometric reasoning", "data handling", "proportional reasoning", "proof readiness"],
    itemTypeTags: ["algebraic manipulation", "coordinate task", "geometric explanation", "data interpretation", "probability model"],
    difficultyBand: "core",
    safeSummary: "Junior secondary mathematics links primary number and shape experiences to algebra, coordinate methods, geometry, data, probability, and early proof-style explanation.",
    generationGuidance: [
      "Create original tasks that require students to translate between words, diagrams, graphs, and algebra.",
      "Mix short fluency items with explanation prompts so learners justify a rule or relation.",
      "Use varied contexts and values to broaden practice without relying on recognizable templates."
    ],
    misconceptionTags: ["letter treated as label not variable", "angle fact used without condition", "coordinate sign error", "probability sample space incomplete"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-junior-interpretation",
    curriculumTrack: "HK",
    stage: "junior-secondary",
    documentPurposes: ["curriculum-interpretation"],
    grades: [...juniorGrades],
    sourceFiles: ["初中数学课程阐释EN_KS3_tc.pdf"],
    topicIds: juniorTopicIds,
    conceptIds: ["algebraic-generalization", "geometric-reasoning", "data-handling", "probability-foundations", "coordinate-method", "trigonometric-ratio"],
    competencyTags: ["abstraction", "logical reasoning", "visualization", "mathematical communication"],
    itemTypeTags: ["concept comparison", "reasoning chain", "diagram-to-equation", "short proof", "structured investigation"],
    difficultyBand: "core",
    safeSummary: "Junior interpretation materials support tasks that move beyond answer finding: students should compare concepts, state conditions, and explain why a method applies.",
    generationGuidance: [
      "Ask students to identify assumptions before applying formulas or angle facts.",
      "Generate linked subquestions that begin with representation reading and end with a concise justification.",
      "Use diagnostic distractors that reveal whether students know the condition behind a rule."
    ],
    misconceptionTags: ["formula used outside its condition", "graph read as picture only", "proof replaced by measurement", "symbolic step not connected to context"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-junior-revision-comparison",
    curriculumTrack: "HK",
    stage: "junior-secondary",
    documentPurposes: ["revision-comparison"],
    grades: [...juniorGrades],
    sourceFiles: ["初中数学修订课程内容与初中数学现行课程内容的比较CT_JS_tc.pdf"],
    topicIds: juniorTopicIds,
    conceptIds: ["curriculum-transition", "topic-sequencing", "algebra-readiness", "geometry-readiness", "assessment-readiness"],
    competencyTags: ["progression mapping", "readiness diagnosis", "adaptive review"],
    itemTypeTags: ["topic bridge", "mixed review", "error analysis", "pre-assessment"],
    difficultyBand: "core",
    safeSummary: "Junior comparison guidance can help MAIS sequence adaptive review so earlier arithmetic, ratio, geometry, and graph ideas become prerequisites for later algebraic and geometric tasks.",
    generationGuidance: [
      "Build mixed review sets that separate prerequisite fluency from new-topic reasoning.",
      "Create error-analysis prompts where students diagnose whether the issue is concept, notation, or condition.",
      "Use small topic bridges before high-load tasks."
    ],
    misconceptionTags: ["adaptive review jumps too quickly", "student memorizes method without prerequisite", "mixed-topic item hides the actual weak concept"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-senior-compulsory-content",
    curriculumTrack: "HK",
    stage: "senior-secondary-compulsory",
    documentPurposes: ["learning-content-supplement", "curriculum-interpretation", "revision-comparison"],
    grades: [...seniorGrades],
    sourceFiles: [
      "数学教育学习领域课程指引补充文件-高中数学科学习内容jsmc2017_tc.pdf",
      "高中数学课程阐释-必修部分EN_CP_tc_1.pdf",
      "高中数学（必修部分）修订课程内容与高中数学（必修部分）现行课程内容的比较CT_CP_tc.pdf"
    ],
    topicIds: seniorCompulsoryTopicIds,
    conceptIds: ["functions", "coordinate-geometry", "algebra", "quadratic-equations", "circle-geometry", "trigonometry", "data-handling", "probability", "modeling", "exam-revision"],
    competencyTags: ["abstract reasoning", "symbolic manipulation", "modeling", "data interpretation", "structured problem solving"],
    itemTypeTags: ["function investigation", "coordinate geometry task", "modeling application", "data and probability task", "structured assessment item"],
    difficultyBand: "exam",
    safeSummary: "Senior compulsory mathematics should connect functions, quadratic equations, algebra, coordinate and circle geometry, trigonometry, data, and probability to modeling and structured reasoning.",
    generationGuidance: [
      "Generate original senior tasks with clear subgoals: interpret, calculate, justify, and check reasonableness.",
      "Combine symbolic and graphical reasoning without reusing any source layout.",
      "Use Hong Kong wording for curriculum tone and keep contexts newly authored."
    ],
    misconceptionTags: ["domain restriction omitted", "graph feature misread", "algebraic transformation changes condition", "statistical conclusion overstated"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-senior-assessment-guide",
    curriculumTrack: "HK",
    stage: "senior-secondary-compulsory",
    documentPurposes: ["curriculum-assessment-guide"],
    grades: [...seniorGrades],
    sourceFiles: [
      "数学课程及评估指引（中四至中六）CA_2017_tc.pdf",
      "数学教育学习领域 数学课程及评估指引（中四至中六）Math_CAGuide_c_2015.pdf"
    ],
    topicIds: seniorCompulsoryTopicIds,
    conceptIds: ["assessment-objectives", "mathematical-communication", "modeling", "reasoning", "application", "review-planning"],
    competencyTags: ["assessment literacy", "reasoning", "communication", "application", "diagnosis"],
    itemTypeTags: ["formative check", "structured problem", "extended response", "diagnostic item", "review task"],
    difficultyBand: "exam",
    safeSummary: "Senior assessment guidance supports balanced tasks that check knowledge, skills, reasoning, communication, application, and diagnostic feedback rather than only final-answer accuracy.",
    generationGuidance: [
      "Create items with marks-like cognitive stages: setup, method, calculation, interpretation, and check.",
      "Use original prompts and scoring-neutral explanations for practice and review.",
      "When generating feedback, identify the mathematical decision point where a student likely went wrong."
    ],
    misconceptionTags: ["answer correct but reasoning weak", "method not communicated", "context interpretation missing", "review focuses only on hardest items"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-senior-m1-calculus-statistics",
    curriculumTrack: "HK",
    stage: "senior-secondary-m1",
    documentPurposes: ["curriculum-interpretation", "revision-comparison"],
    grades: [...seniorGrades],
    sourceFiles: [
      "高中数学课程阐释-单元一（微积分与统计）.pdf",
      "高中数学（单元一）修订课程内容与高中数学（单元一）现行课程内容的比较CT_M1_tc.pdf"
    ],
    topicIds: ["calculus", "statistics-s6", "probability-s5", "differentiation-intro"],
    conceptIds: ["m1", "calculus", "differentiation", "integration-ideas", "statistics", "probability-modeling", "data-distribution"],
    competencyTags: ["calculus reasoning", "data analysis", "model interpretation", "symbolic manipulation"],
    itemTypeTags: ["rate-of-change task", "area-accumulation task", "statistical interpretation", "modeling investigation"],
    difficultyBand: "challenge",
    safeSummary: "M1 should give students a coherent extension through calculus and statistics, linking change, accumulation, data variation, and model interpretation.",
    generationGuidance: [
      "Generate new rate, accumulation, and data contexts that require interpretation before computation.",
      "Pair symbolic calculus steps with graphical or contextual meaning.",
      "For statistics tasks, use newly authored summaries or datasets and ask for cautious conclusions."
    ],
    misconceptionTags: ["derivative treated as average change only", "area meaning disconnected from units", "statistical model overclaimed", "variation ignored"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-senior-m2-algebra-calculus",
    curriculumTrack: "HK",
    stage: "senior-secondary-m2",
    documentPurposes: ["curriculum-interpretation", "revision-comparison"],
    grades: [...seniorGrades],
    sourceFiles: [
      "高中数学课程阐释-单元二（代数与微积分）EN_M2_tc.pdf",
      "高中数学（单元二）修订课程内容与高中数学（单元二）现行课程内容的比较CT_M2_tc.pdf"
    ],
    topicIds: ["advanced-functions", "more-algebra", "calculus", "differentiation-intro", "exam-revision"],
    conceptIds: ["m2", "advanced-algebra", "calculus", "proof", "functions", "vectors-or-structures", "symbolic-generalization"],
    competencyTags: ["advanced symbolic reasoning", "proof readiness", "calculus reasoning", "abstraction"],
    itemTypeTags: ["algebraic proof", "function investigation", "calculus extension", "parameter task", "structured challenge"],
    difficultyBand: "challenge",
    safeSummary: "M2 should extend algebra and calculus through more abstract structures, proof-like reasoning, function investigation, and multi-step symbolic control.",
    generationGuidance: [
      "Create original algebraic and calculus tasks that require students to state conditions and justify transformations.",
      "Use fresh functions, parameters, sequences, or symbolic structures rather than recognizable source patterns.",
      "Make challenge solutions show why each transformation is valid."
    ],
    misconceptionTags: ["condition lost during transformation", "parameter cases incomplete", "proof step asserted without reason", "calculus procedure separated from function meaning"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-senior-learning-diversity-support",
    curriculumTrack: "HK",
    stage: "senior-secondary-support",
    documentPurposes: ["learning-diversity-support"],
    grades: [...seniorGrades],
    sourceFiles: ["高中数学科照顾学生多样性及创造空间指引Guidelines on Catering for LD in SS Math (C).pdf"],
    topicIds: seniorCompulsoryTopicIds,
    conceptIds: ["learning-diversity", "scaffolding", "multiple-entry", "extension", "diagnostic-feedback", "student-agency"],
    competencyTags: ["differentiation", "diagnosis", "scaffolding", "extension design", "feedback"],
    itemTypeTags: ["tiered task", "hint ladder", "extension challenge", "misconception diagnosis", "reflection prompt"],
    difficultyBand: "core",
    safeSummary: "Learning-diversity support should help MAIS offer multiple entry points, scaffolded hints, extension paths, and feedback that respects different readiness levels.",
    generationGuidance: [
      "For each generated task, provide an easier entry question and an optional extension.",
      "Use hint ladders that reveal structure before computation.",
      "Write feedback that identifies the student's next action instead of only labelling correctness."
    ],
    misconceptionTags: ["support lowers cognitive demand too much", "extension becomes unrelated enrichment", "feedback tells answer instead of next step", "single pathway excludes some learners"],
    prohibitedReuseNotes: originalityGuards
  },
  {
    id: "hk-edb-implementation-timelines",
    curriculumTrack: "HK",
    stage: "implementation",
    documentPurposes: ["implementation-timeline"],
    grades: [...allGrades],
    sourceFiles: [
      "数学科修订课程的推行时间表timeline_tc.pdf",
      "高中数学课程建议推行时间表CA_timeline_tc.pdf"
    ],
    topicIds: [],
    conceptIds: ["implementation-planning", "curriculum-rollout", "transition-support", "resource-prioritization"],
    competencyTags: ["planning", "sequencing", "teacher support", "resource alignment"],
    itemTypeTags: ["coverage audit", "transition checklist", "teacher planning prompt"],
    difficultyBand: "foundation",
    safeSummary: "Implementation timeline materials are useful for planning coverage, sequencing updates, and prioritizing support work, not for generating student-facing mathematical content directly.",
    generationGuidance: [
      "Use timeline cards for teacher planning, coverage audits, and transition notes.",
      "Do not use implementation timing as a substitute for mathematical learning objectives.",
      "When creating student content, pair this card with a stage-specific curriculum card."
    ],
    misconceptionTags: ["timeline treated as lesson content", "coverage planning confused with mastery", "transition support omitted"],
    prohibitedReuseNotes: originalityGuards
  }
];
