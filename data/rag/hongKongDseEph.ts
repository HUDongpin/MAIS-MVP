import type { HongKongDseEphSafeCard } from "@/types";

const dseEphOriginalityGuards = [
  "Use this card only as abstract DSE EPH textbook sequencing and item-design guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, prompts, or recognisable layouts.",
  "Generate new MAIS-authored contexts, numbers, diagrams, prompts, hints, and explanations."
];

export const hongKongDseEphSafeCards: HongKongDseEphSafeCard[] = [
  {
    id: "hk-dse-eph-a-algebra-number-foundations",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "A",
    grade: "S4",
    chapter: "Algebra and number foundations for senior secondary study",
    topicIds: ["more-algebra", "linear-equations", "polynomials", "quadratic-patterns"],
    conceptIds: ["algebraic-manipulation", "indices", "factorization", "linear-equations", "quadratic-equations", "inequalities"],
    competencyTags: ["symbolic fluency", "equivalence reasoning", "condition checking", "method selection"],
    itemTypeTags: ["algebra fluency", "equation solving", "inequality reasoning", "structured diagnostic"],
    difficultyBand: "foundation",
    safeSummary: "The EPH opening volume should help S4 learners secure algebraic control, number laws, and reversible reasoning before heavier function and modelling work.",
    generationGuidance: [
      "Create fresh algebra tasks that ask students to preserve equivalence and state restrictions.",
      "Separate routine manipulation from conceptual checks by using short diagnostic variants.",
      "Connect fluency prompts to later graph, geometry, or DSE-style reasoning uses."
    ],
    misconceptionTags: ["operation not reversible", "factor condition missed", "restriction not checked", "inequality boundary error"],
    sourceFiles: ["DSE EPH Mathematics in Focus A local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-a-functions-coordinate-readiness",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "A",
    grade: "S4",
    chapter: "Functions, graphs, and coordinate readiness",
    topicIds: ["functions", "coordinates", "coordinate-geometry", "quadratic-patterns"],
    conceptIds: ["functions", "graphs", "domain-range", "linear-functions", "quadratic-functions", "slope", "intercepts"],
    competencyTags: ["representation transfer", "graph interpretation", "coordinate modeling", "symbolic reasoning"],
    itemTypeTags: ["function graph task", "coordinate interpretation", "diagram-to-equation", "model interpretation"],
    difficultyBand: "core",
    safeSummary: "EPH early function work can calibrate original tasks where students translate among rules, tables, graphs, and coordinate descriptions.",
    generationGuidance: [
      "Pair each generated relation with a graph feature, coordinate constraint, or contextual interpretation.",
      "Use new points, intervals, and parameter values so prompts cannot resemble any source layout.",
      "Ask students to name domains, axes, slopes, or intercept meanings before calculation when useful."
    ],
    misconceptionTags: ["domain ignored", "graph feature read by appearance only", "slope sign reversed", "coordinate result not interpreted"],
    sourceFiles: ["DSE EPH Mathematics in Focus A local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-b-geometry-measurement-trigonometry",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "B",
    grade: "S4",
    chapter: "Geometry, measurement, and trigonometric foundations",
    topicIds: ["trigonometry-basics", "angles", "circles", "perimeter-area", "volume"],
    conceptIds: ["angle-relations", "similarity", "circle-geometry", "area-volume", "trigonometric-ratio", "bearings"],
    competencyTags: ["geometric reasoning", "spatial visualization", "measurement reasoning", "diagram interpretation"],
    itemTypeTags: ["diagram-supported task", "trigonometric ratio task", "measurement model", "short geometric explanation"],
    difficultyBand: "core",
    safeSummary: "EPH geometry guidance should move learners from visual recognition toward justified relation choice, measurement precision, and clear diagram reasoning.",
    generationGuidance: [
      "Author new diagrams and measurements with controlled relationships.",
      "Ask for a named relation or condition before calculation in higher-level tasks.",
      "Design distractors around angle, side, scale, and unit mismatches."
    ],
    misconceptionTags: ["diagram used as proof", "wrong side chosen for ratio", "similarity condition incomplete", "unit conversion skipped"],
    sourceFiles: ["DSE EPH Mathematics in Focus B local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-b-data-and-connected-problem-solving",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "B",
    grade: "S4",
    chapter: "Data handling and connected problem solving",
    topicIds: ["data-handling", "statistics-s1", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["data-representation", "descriptive-statistics", "chart-interpretation", "multi-step-reasoning", "mathematical-communication"],
    competencyTags: ["data interpretation", "communication", "model selection", "reasonableness checking"],
    itemTypeTags: ["chart interpretation", "context conclusion", "linked subquestion", "readiness check"],
    difficultyBand: "core",
    safeSummary: "EPH S4 consolidation can support original tasks that connect data displays, concise explanation, and multi-step method choice.",
    generationGuidance: [
      "Use newly authored datasets or displays with clean scales and units.",
      "Require a numerical result plus a short interpretation tied to the context.",
      "Mix algebra, geometry, and data goals so students practise choosing a method."
    ],
    misconceptionTags: ["display scale misread", "average treated as one observed value", "context conclusion overstated", "method chosen from keyword only"],
    sourceFiles: ["DSE EPH Mathematics in Focus B local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-c-advanced-functions-trigonometry",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "C",
    grade: "S5",
    chapter: "Advanced functions and trigonometric reasoning",
    topicIds: ["advanced-functions", "trigonometry-s5", "functions", "exam-revision"],
    conceptIds: ["advanced-functions", "function-transformations", "trigonometric-functions", "identities", "solution-intervals", "parameters"],
    competencyTags: ["symbolic reasoning", "graph interpretation", "representation transfer", "condition checking"],
    itemTypeTags: ["function investigation", "trigonometric equation", "graph transformation", "parameter classification"],
    difficultyBand: "exam",
    safeSummary: "EPH middle-sequence work can deepen function and trigonometry readiness through transformations, interval control, symbolic structure, and graphical interpretation.",
    generationGuidance: [
      "Create original functions, angle intervals, and parameter ranges with explicit restrictions.",
      "Pair each symbolic move with a graph, angle, or transformation interpretation.",
      "Use generated distractors that expose sign, interval, and transformation-direction errors."
    ],
    misconceptionTags: ["transformation direction reversed", "solution interval incomplete", "identity applied without condition", "parameter boundary omitted"],
    sourceFiles: ["DSE EPH Mathematics in Focus C local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-c-coordinate-circle-geometry",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "C",
    grade: "S5",
    chapter: "Coordinate geometry and circle relations",
    topicIds: ["coordinate-geometry", "circles", "mixed-problem-solving"],
    conceptIds: ["circle-equations", "line-circle-intersection", "distance", "midpoint", "locus", "tangent", "geometric-conditions"],
    competencyTags: ["coordinate modeling", "geometric interpretation", "algebraic reasoning", "visualization"],
    itemTypeTags: ["line-circle relation", "locus reasoning", "diagram-supported task", "structured response"],
    difficultyBand: "exam",
    safeSummary: "EPH coordinate geometry can guide tasks that convert geometric conditions into equations and then interpret feasibility in the plane.",
    generationGuidance: [
      "Use fresh points, lines, circles, and constraints with clear naming.",
      "Ask students to justify why an equation form matches a geometric condition.",
      "Include feasibility, tangent, or intersection checks for challenge variants."
    ],
    misconceptionTags: ["radius squared mishandled", "tangent condition confused with intersection", "distance target mismatched", "coordinate result not linked to geometry"],
    sourceFiles: ["DSE EPH Mathematics in Focus C local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-d-probability-statistics",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "D",
    grade: "S5",
    chapter: "Probability, statistics, and uncertainty reasoning",
    topicIds: ["probability-s5", "data-handling", "statistics-s1", "exam-revision"],
    conceptIds: ["probability", "sample-space", "counting-cases", "descriptive-statistics", "data-representation", "expected-value"],
    competencyTags: ["uncertainty reasoning", "data interpretation", "case analysis", "contextual communication"],
    itemTypeTags: ["probability model", "chart interpretation", "data and probability task", "diagnostic prompt"],
    difficultyBand: "exam",
    safeSummary: "EPH probability and statistics should support original tasks where computation, sample-space structure, and contextual interpretation are all visible.",
    generationGuidance: [
      "Generate new datasets, events, and displays with clearly defined cases.",
      "Ask students to explain why cases are exhaustive and non-overlapping when relevant.",
      "Require cautious conclusions that follow from the data or model."
    ],
    misconceptionTags: ["sample space incomplete", "overlapping cases counted twice", "display scale misread", "correlation overstated"],
    sourceFiles: ["DSE EPH Mathematics in Focus D local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-d-algebraic-modeling-synthesis",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "D",
    grade: "S5",
    chapter: "Algebraic modelling and cross-topic synthesis",
    topicIds: ["more-algebra", "functions", "mixed-problem-solving", "exam-revision"],
    conceptIds: ["modeling", "parameters", "equations", "inequalities", "functions", "strategy-selection"],
    competencyTags: ["mathematical modeling", "strategic problem solving", "symbolic reasoning", "verification"],
    itemTypeTags: ["modeling task", "cross-topic task", "parameter condition", "spiral review"],
    difficultyBand: "challenge",
    safeSummary: "EPH synthesis guidance can help create cross-topic tasks that connect algebraic modelling, functions, data, probability, and geometry constraints.",
    generationGuidance: [
      "Combine two concept goals rather than imitating a single source task shape.",
      "Use scaffolding checkpoints for lesson versions and reduce scaffolding for challenge versions.",
      "Require students to verify that the model fits every stated constraint."
    ],
    misconceptionTags: ["model variable not defined", "constraint omitted", "case split incomplete", "final conclusion not tied to conditions"],
    sourceFiles: ["DSE EPH Mathematics in Focus D local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-e-differentiation-applications",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "E",
    grade: "S6",
    chapter: "Differentiation and applications",
    topicIds: ["differentiation-intro", "advanced-functions", "exam-revision"],
    conceptIds: ["differentiation", "rate-of-change", "tangent", "stationary-points", "optimization", "curve-sketching"],
    competencyTags: ["calculus reasoning", "symbolic manipulation", "graph interpretation", "optimization"],
    itemTypeTags: ["differentiation task", "tangent problem", "optimization application", "function investigation"],
    difficultyBand: "challenge",
    safeSummary: "EPH final-volume guidance can ground rates of change, tangent behaviour, stationary points, and optimization in clearly stated constraints.",
    generationGuidance: [
      "Create original functions and constraints that require derivative reasoning.",
      "Include endpoint, sign, or feasibility checks for challenge-level generated tasks.",
      "Pair calculation with interpretation of graph behaviour or context."
    ],
    misconceptionTags: ["stationary point treated as automatically extreme", "endpoint ignored", "derivative sign not justified", "tangent-normal relation confused"],
    sourceFiles: ["DSE EPH Mathematics in Focus E local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  },
  {
    id: "hk-dse-eph-e-final-paper-readiness",
    curriculumTrack: "HK",
    publisher: "HK_EPH_MIF",
    volume: "E",
    grade: "S6",
    chapter: "Final DSE synthesis and paper readiness",
    topicIds: ["exam-revision", "mixed-problem-solving", "functions", "coordinate-geometry", "data-handling"],
    conceptIds: ["exam-readiness", "multi-step-reasoning", "method-selection", "time-efficient-checking", "cross-topic-synthesis"],
    competencyTags: ["exam planning", "method selection", "communication", "checking reasonableness"],
    itemTypeTags: ["revision set", "structured response", "multiple choice", "mixed-topic diagnostic"],
    difficultyBand: "exam",
    safeSummary: "EPH final synthesis can support balanced DSE preparation across fluency, method selection, communication, and efficient checking.",
    generationGuidance: [
      "Generate fresh mixed-topic sets where each item has a clear concept purpose.",
      "Vary the efficient route across algebraic, graphical, geometric, statistical, and calculus methods.",
      "Ask for short reflection prompts that identify why a method was chosen."
    ],
    misconceptionTags: ["method chosen from surface wording only", "subpart dependency missed", "checking skipped under time pressure", "topic boundary misidentified"],
    sourceFiles: ["DSE EPH Mathematics in Focus E local private PDF"],
    prohibitedReuseNotes: dseEphOriginalityGuards
  }
];
