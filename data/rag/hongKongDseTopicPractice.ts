import type { HongKongDseMathExamPatternCard } from "@/types";

const topicPracticeOriginalityGuards = [
  "Use this card only as aggregated Hong Kong DSE Mathematics topic-practice guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify any source wording, source item, source figure, source table, marking wording, or worked response.",
  "Generate new MAIS-authored mathematical objects, numbers, contexts, diagrams, constraints, hints, and explanations."
];

const topicPracticeYearRange = "topic-practice-pack-en-2023-metadata";
const englishOnly = ["en"] satisfies HongKongDseMathExamPatternCard["languageVariants"];

export const hongKongDseTopicPracticeExamPatternCards: HongKongDseMathExamPatternCard[] = [
  {
    id: "hk-dse-topic-practice-paper-1-structured-drill",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "topic-practice", "structured-response", "mixed-problem-solving"],
    conceptIds: ["topic-practice", "paper-1-drill", "structured-response", "method-selection", "multi-step-reasoning"],
    competencyTags: ["structured reasoning", "procedural fluency", "method selection", "checking reasonableness"],
    itemTypeTags: ["chapter practice", "structured response", "linked subpart task", "worked-method diagnostic"],
    difficultyBand: "exam",
    patternSummary: "Paper 1 topic-practice guidance should turn each chapter area into original structured tasks that make the selected method, intermediate reasoning, and checking step visible.",
    solutionStrategyTags: ["identify the governing chapter idea", "show the method chain", "connect subparts", "check constraints"],
    misconceptionTags: ["method copied from surface cues", "intermediate result not justified", "subpart dependency missed", "checking step skipped"],
    generationGuidance: [
      "Create fresh structured drills by chapter goal rather than by source layout.",
      "Use newly authored values and diagrams, and vary the representation required across algebraic, geometric, graphical, and statistical settings.",
      "Ask learners to explain enough working for diagnosis while keeping every prompt original."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-paper-2-mc-drill",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-2"],
    topicIds: ["exam-revision", "topic-practice", "multiple-choice", "diagnostic-distractors"],
    conceptIds: ["topic-practice", "paper-2-drill", "multiple-choice", "distractor-analysis", "fast-method-selection"],
    competencyTags: ["concept recognition", "efficient computation", "error diagnosis", "exam pacing"],
    itemTypeTags: ["chapter practice", "multiple choice", "compact diagnostic", "single-concept discrimination"],
    difficultyBand: "exam",
    patternSummary: "Paper 2 topic-practice guidance should produce compact original multiple-choice tasks where each option probes a fresh misconception family or shortcut risk.",
    solutionStrategyTags: ["estimate before detailed work", "eliminate impossible choices", "test definitions", "watch sign and unit constraints"],
    misconceptionTags: ["keyword-matched option chosen", "shortcut used outside condition", "sign or unit ignored", "definition only half-applied"],
    generationGuidance: [
      "Generate new option sets from misconception families rather than from any source choices.",
      "Keep each item focused on a chapter-level concept and require explanations that name why alternatives are tempting.",
      "Vary whether the efficient route is substitution, estimation, diagram reading, or a short symbolic step."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-number-percent-estimation",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["estimation", "percentages", "number-system", "exam-revision"],
    conceptIds: ["topic-practice", "estimation", "percentages", "number-system", "rounding", "ratio-comparison"],
    competencyTags: ["number sense", "estimation", "proportional reasoning", "reasonableness checking"],
    itemTypeTags: ["chapter practice", "short calculation", "context interpretation", "diagnostic check"],
    difficultyBand: "core",
    patternSummary: "Number, percentage, and estimation practice should build fluent approximations, proportional interpretation, and quick reasonableness checks before heavier exam work.",
    solutionStrategyTags: ["round deliberately", "state the reference whole", "compare relative change", "check magnitude"],
    misconceptionTags: ["base quantity confused", "rounded value treated as exact", "percentage point and percent change mixed", "magnitude check skipped"],
    generationGuidance: [
      "Create fresh numerical contexts with clear units and comparison baselines.",
      "Use both exact and estimated routes so learners can justify whether a result is plausible.",
      "Include distractors around base-value errors and over-rounding."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-algebra-indices-polynomials-equations",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["more-algebra", "polynomials", "linear-equations", "indices", "exam-revision"],
    conceptIds: ["topic-practice", "indices", "logarithms", "polynomials", "identities", "equations", "inequalities", "algebraic-manipulation"],
    competencyTags: ["symbolic fluency", "equivalence reasoning", "case analysis", "verification"],
    itemTypeTags: ["chapter practice", "algebraic manipulation", "equation solving", "parameter condition"],
    difficultyBand: "exam",
    patternSummary: "Algebra topic practice should strengthen reversible transformations, restrictions, parameter awareness, and verification across indices, logarithms, polynomials, and equations.",
    solutionStrategyTags: ["preserve equivalence", "track restrictions", "factor with purpose", "substitute back"],
    misconceptionTags: ["operation not reversible", "restriction omitted", "index law overgeneralized", "boundary condition missed"],
    generationGuidance: [
      "Author original expressions with visible restrictions and controlled factor structures.",
      "Pair routine transformations with a short justification of why the move is valid.",
      "Use variants that separate manipulation mistakes from concept misunderstandings."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-functions-graphs-coordinate",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["functions", "advanced-functions", "coordinate-geometry", "exam-revision"],
    conceptIds: ["topic-practice", "functions", "graphs", "coordinate-drill", "domain-range", "line-equations", "graph-interpretation"],
    competencyTags: ["representation transfer", "graph interpretation", "coordinate modeling", "symbolic reasoning"],
    itemTypeTags: ["chapter practice", "function graph task", "coordinate interpretation", "diagram-to-equation"],
    difficultyBand: "exam",
    patternSummary: "Function, graph, and coordinate practice should connect algebraic rules, visible graph features, coordinate constraints, and contextual interpretation.",
    solutionStrategyTags: ["state domain and range", "link graph feature to equation", "choose equation form", "interpret coordinate result"],
    misconceptionTags: ["domain ignored", "intercept meaning confused", "slope sign reversed", "coordinate result left uninterpreted"],
    generationGuidance: [
      "Use new functions, points, intervals, and graph descriptions with no source-layout dependency.",
      "Ask learners to move between symbolic, tabular, graphical, and coordinate representations.",
      "Include feasibility or boundary checks in higher-level generated practice."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-rate-ratio-variation-sequences",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["rate-ratio-variation", "sequences", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["topic-practice", "rate", "ratio", "variation", "sequences", "arithmetic-pattern", "geometric-pattern"],
    competencyTags: ["proportional reasoning", "pattern generalization", "modeling", "verification"],
    itemTypeTags: ["chapter practice", "sequence task", "variation model", "formula discovery"],
    difficultyBand: "core",
    patternSummary: "Rate, ratio, variation, and sequence practice should help learners distinguish model types and verify how a rule behaves across cases.",
    solutionStrategyTags: ["identify proportional structure", "list early terms", "define variables", "verify the rule"],
    misconceptionTags: ["direct and inverse variation confused", "index shift error", "linear pattern assumed too quickly", "context constraint omitted"],
    generationGuidance: [
      "Generate fresh quantities and sequences with controlled term behavior.",
      "Ask learners to justify the model before applying a formula.",
      "Use small variations that expose direct, inverse, arithmetic, and geometric assumptions."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-geometry-circles-locus-mensuration",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["geometry", "circles", "locus", "perimeter-area", "volume", "exam-revision"],
    conceptIds: ["topic-practice", "rectilinear-geometry", "circle-geometry", "locus", "mensuration", "similarity", "area-volume"],
    competencyTags: ["geometric reasoning", "spatial visualization", "measurement reasoning", "logical explanation"],
    itemTypeTags: ["chapter practice", "diagram-supported task", "measurement task", "short geometric explanation"],
    difficultyBand: "exam",
    patternSummary: "Geometry, circle, locus, and mensuration practice should move learners from visual recognition to justified relation choice and precise measurement reasoning.",
    solutionStrategyTags: ["mark known facts", "state the relation", "separate proof from calculation", "check scale and units"],
    misconceptionTags: ["drawing used as proof", "circle relation misidentified", "area and perimeter confused", "locus condition incomplete"],
    generationGuidance: [
      "Create new diagrams and measurements inside MAIS with controlled relationships.",
      "Require a named condition before calculation in challenge variants.",
      "Vary diagram orientation so learners rely on properties instead of appearance."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-trigonometry",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["trigonometry-basics", "trigonometry-s5", "exam-revision"],
    conceptIds: ["topic-practice", "trigonometric-ratio", "trigonometric-functions", "bearings", "angle-relations", "solution-intervals"],
    competencyTags: ["spatial reasoning", "symbolic transformation", "diagram interpretation", "equation solving"],
    itemTypeTags: ["chapter practice", "trigonometric equation", "triangle measurement", "contextual angle task"],
    difficultyBand: "exam",
    patternSummary: "Trigonometry practice should combine ratio choice, diagram interpretation, identity use, and interval control in fresh geometric and symbolic settings.",
    solutionStrategyTags: ["define the angle", "choose the relevant ratio", "respect interval restrictions", "check degree context"],
    misconceptionTags: ["wrong reference angle", "wrong side chosen for ratio", "interval solution incomplete", "identity used outside condition"],
    generationGuidance: [
      "Use newly authored geometric situations with clear labels and no source diagrams.",
      "Pair one representation decision with one symbolic or numerical step.",
      "Create variants around common angle, sign, and interval errors."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-counting-probability",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["probability-s5", "counting-principles", "permutation-combination", "exam-revision"],
    conceptIds: ["topic-practice", "counting-principles", "permutation-combination", "probability", "sample-space", "case-analysis"],
    competencyTags: ["uncertainty reasoning", "case analysis", "modeling", "checking exhaustiveness"],
    itemTypeTags: ["chapter practice", "probability model", "counting task", "diagnostic prompt"],
    difficultyBand: "exam",
    patternSummary: "Counting and probability practice should make case structure explicit before calculation and ask learners to check whether cases are exhaustive and non-overlapping.",
    solutionStrategyTags: ["define the sample space", "separate cases", "check overlap", "interpret probability"],
    misconceptionTags: ["sample space incomplete", "overlapping cases counted twice", "order condition misread", "complement used without checking"],
    generationGuidance: [
      "Generate new events and counting contexts with clearly stated conditions.",
      "Require a case plan before computation in structured versions.",
      "Use distractors that reveal order, replacement, and overlap misunderstandings."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  },
  {
    id: "hk-dse-topic-practice-statistics-dispersion",
    curriculumTrack: "HK",
    yearRange: topicPracticeYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["statistics-s1", "data-handling", "measures-of-dispersion", "exam-revision"],
    conceptIds: ["topic-practice", "statistics", "dispersion", "data-representation", "descriptive-statistics", "interpretation"],
    competencyTags: ["data interpretation", "communication", "reasonableness checking", "model critique"],
    itemTypeTags: ["chapter practice", "data task", "chart interpretation", "context conclusion"],
    difficultyBand: "exam",
    patternSummary: "Statistics and dispersion practice should pair calculation with interpretation so learners decide what a spread or summary measure does and does not justify.",
    solutionStrategyTags: ["read display scale", "choose the summary measure", "compare spread", "state a cautious conclusion"],
    misconceptionTags: ["average treated as one observed value", "display scale misread", "spread and centre confused", "conclusion overstated"],
    generationGuidance: [
      "Use newly authored datasets, tables, or summary statistics.",
      "Ask for both a numerical result and a short contextual interpretation.",
      "Design variants that change representation type while preserving the reasoning target."
    ],
    prohibitedReuseNotes: topicPracticeOriginalityGuards
  }
];
