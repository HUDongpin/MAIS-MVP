import type { HongKongDseUpSafeCard } from "@/types";

const dseUpOriginalityGuards = [
  "Use this card only as abstract DSE UP textbook sequencing and item-design guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify textbook wording, worked responses, figures, tables, prompts, or recognisable layouts.",
  "Generate new MAIS-authored contexts, numbers, diagrams, prompts, hints, and explanations."
];

export const hongKongDseUpSafeCards: HongKongDseUpSafeCard[] = [
  {
    id: "hk-dse-up-4a-algebra-foundations",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "4A",
    grade: "S4",
    chapter: "Algebra foundations and quadratic readiness",
    topicIds: ["more-algebra", "linear-equations", "polynomials", "quadratic-patterns"],
    conceptIds: ["algebraic-manipulation", "factorization", "linear-equations", "quadratic-equations", "inequalities", "indices"],
    competencyTags: ["symbolic fluency", "equivalence reasoning", "case awareness", "verification"],
    itemTypeTags: ["algebra fluency", "equation solving", "inequality reasoning", "structured practice"],
    difficultyBand: "foundation",
    safeSummary: "The S4 UP opening sequence should strengthen symbolic fluency before students meet heavier functions, coordinate geometry, and exam-style modelling.",
    generationGuidance: [
      "Create fresh algebra tasks that make students preserve equivalence and check restrictions.",
      "Use short diagnostic variants to separate manipulation errors from concept errors.",
      "Bridge each fluency task to a later graph, model, or DSE-style reasoning use."
    ],
    misconceptionTags: ["equation transformation not reversible", "factor condition missed", "inequality direction error", "restriction not checked"],
    sourceFiles: ["DSE UP Mathematics and Life 4A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-4a-functions-coordinate-geometry",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "4A",
    grade: "S4",
    chapter: "Functions, graphs, and coordinate methods",
    topicIds: ["functions", "coordinate-geometry", "coordinates"],
    conceptIds: ["functions", "graphs", "domain-range", "linear-functions", "quadratic-functions", "line-equations", "slope"],
    competencyTags: ["representation transfer", "graph interpretation", "coordinate modeling", "symbolic reasoning"],
    itemTypeTags: ["function graph task", "coordinate geometry task", "diagram-to-equation", "model interpretation"],
    difficultyBand: "core",
    safeSummary: "UP S4 work links algebraic form, graph features, and coordinate descriptions so learners can translate between symbols and visual structure.",
    generationGuidance: [
      "Pair each generated symbolic relation with a graph feature or coordinate interpretation.",
      "Use new points, intervals, and parameters so tasks cannot resemble textbook layouts.",
      "Ask students to state domains, axes, and geometric conditions explicitly."
    ],
    misconceptionTags: ["domain ignored", "graph read only by appearance", "slope sign reversed", "coordinate result not interpreted"],
    sourceFiles: ["DSE UP Mathematics and Life 4A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-4b-geometry-trigonometry",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "4B",
    grade: "S4",
    chapter: "Geometry, measurement, and trigonometric foundations",
    topicIds: ["trigonometry-basics", "angles", "circles", "perimeter-area", "volume"],
    conceptIds: ["angle-relations", "similarity", "circle-geometry", "area-volume", "trigonometric-ratio", "bearings"],
    competencyTags: ["geometric reasoning", "spatial visualization", "measurement reasoning", "diagram interpretation"],
    itemTypeTags: ["diagram-supported task", "trigonometric ratio task", "measurement model", "short geometric explanation"],
    difficultyBand: "core",
    safeSummary: "UP S4B geometry and trigonometry should help learners move from visual recognition to justified relation choice and precise measurement reasoning.",
    generationGuidance: [
      "Author new diagrams and measurements with controlled relationships.",
      "Require a named relation or condition before calculation in higher-level tasks.",
      "Design distractors around angle, side, and unit mismatches."
    ],
    misconceptionTags: ["diagram used as proof", "wrong side chosen for ratio", "similarity condition incomplete", "unit conversion skipped"],
    sourceFiles: ["DSE UP Mathematics and Life 4B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-4b-data-problem-solving",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "4B",
    grade: "S4",
    chapter: "Data handling and connected problem solving",
    topicIds: ["data-handling", "statistics-s1", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["data-representation", "descriptive-statistics", "chart-interpretation", "multi-step-reasoning", "mathematical-communication"],
    competencyTags: ["data interpretation", "communication", "model selection", "reasonableness checking"],
    itemTypeTags: ["chart interpretation", "context conclusion", "linked subquestion", "readiness check"],
    difficultyBand: "core",
    safeSummary: "UP S4B can support early DSE habits by connecting data displays, concise explanation, and multi-step reasoning with clear checks.",
    generationGuidance: [
      "Use newly authored datasets or displays with clean scales and units.",
      "Ask for a numerical result plus a short interpretation tied to the context.",
      "Mix review of algebra, geometry, and data so students practise choosing a method."
    ],
    misconceptionTags: ["display scale misread", "average treated as one observed value", "context conclusion overstated", "method chosen from keyword only"],
    sourceFiles: ["DSE UP Mathematics and Life 4B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-5a-advanced-functions-trigonometry",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "5A",
    grade: "S5",
    chapter: "Advanced functions and trigonometry",
    topicIds: ["advanced-functions", "trigonometry-s5", "functions", "exam-revision"],
    conceptIds: ["advanced-functions", "function-transformations", "trigonometric-functions", "identities", "solution-intervals", "parameters"],
    competencyTags: ["symbolic reasoning", "graph interpretation", "representation transfer", "condition checking"],
    itemTypeTags: ["function investigation", "trigonometric equation", "graph transformation", "parameter classification"],
    difficultyBand: "exam",
    safeSummary: "UP S5A should deepen function and trigonometry work through transformations, interval control, symbolic structure, and graphical interpretation.",
    generationGuidance: [
      "Create original functions, intervals, and parameter ranges with explicit restrictions.",
      "Pair a symbolic operation with a graph or angle interpretation.",
      "Use generated distractors that expose sign, interval, and transformation-direction errors."
    ],
    misconceptionTags: ["transformation direction reversed", "solution interval incomplete", "identity applied without condition", "parameter boundary omitted"],
    sourceFiles: ["DSE UP Mathematics and Life 5A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-5a-coordinate-circle-geometry",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "5A",
    grade: "S5",
    chapter: "Coordinate geometry and circle relations",
    topicIds: ["coordinate-geometry", "circles", "mixed-problem-solving"],
    conceptIds: ["circle-equations", "line-circle-intersection", "distance", "midpoint", "locus", "tangent", "geometric-conditions"],
    competencyTags: ["coordinate modeling", "geometric interpretation", "algebraic reasoning", "visualization"],
    itemTypeTags: ["line-circle relation", "locus reasoning", "diagram-supported task", "structured response"],
    difficultyBand: "exam",
    safeSummary: "UP S5A coordinate work can calibrate tasks that convert geometric conditions into equations and then interpret feasibility in the plane.",
    generationGuidance: [
      "Use fresh points, lines, circles, and constraints with clear naming.",
      "Ask students to justify why an equation form matches a geometric condition.",
      "Include feasibility or tangent checks for challenge variants."
    ],
    misconceptionTags: ["radius squared mishandled", "tangent condition confused with intersection", "distance target mismatched", "coordinate result not linked to geometry"],
    sourceFiles: ["DSE UP Mathematics and Life 5A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-5b-probability-statistics",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "5B",
    grade: "S5",
    chapter: "Probability, statistics, and uncertainty reasoning",
    topicIds: ["probability-s5", "data-handling", "statistics-s1", "exam-revision"],
    conceptIds: ["probability", "sample-space", "counting-cases", "descriptive-statistics", "data-representation", "expected-value"],
    competencyTags: ["uncertainty reasoning", "data interpretation", "case analysis", "contextual communication"],
    itemTypeTags: ["probability model", "chart interpretation", "data and probability task", "diagnostic prompt"],
    difficultyBand: "exam",
    safeSummary: "UP S5B probability and statistics should support original tasks where computation, sample-space structure, and contextual interpretation are all visible.",
    generationGuidance: [
      "Generate new datasets, events, and displays with clearly defined cases.",
      "Ask students to explain why cases are exhaustive and non-overlapping when relevant.",
      "Require a cautious conclusion that follows from the data or model."
    ],
    misconceptionTags: ["sample space incomplete", "overlapping cases counted twice", "display scale misread", "correlation overstated"],
    sourceFiles: ["DSE UP Mathematics and Life 5B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-5b-algebra-modeling-review",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "5B",
    grade: "S5",
    chapter: "Algebraic modelling and S5 consolidation",
    topicIds: ["more-algebra", "functions", "mixed-problem-solving", "exam-revision"],
    conceptIds: ["modeling", "parameters", "equations", "inequalities", "functions", "strategy-selection"],
    competencyTags: ["mathematical modeling", "strategic problem solving", "symbolic reasoning", "verification"],
    itemTypeTags: ["modeling task", "cross-topic task", "parameter condition", "spiral review"],
    difficultyBand: "challenge",
    safeSummary: "UP S5B consolidation can be used to build cross-topic tasks that connect algebraic modelling, functions, and probability or geometry constraints.",
    generationGuidance: [
      "Combine two concept goals rather than imitating a single source task shape.",
      "Use scaffolding checkpoints for lesson versions and remove scaffolding for challenge versions.",
      "Require students to verify that the model fits every stated constraint."
    ],
    misconceptionTags: ["model variable not defined", "constraint omitted", "case split incomplete", "final conclusion not tied to conditions"],
    sourceFiles: ["DSE UP Mathematics and Life 5B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-6a-differentiation-applications",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "6A",
    grade: "S6",
    chapter: "Differentiation and applications",
    topicIds: ["differentiation-intro", "advanced-functions", "exam-revision"],
    conceptIds: ["differentiation", "rate-of-change", "tangent", "stationary-points", "optimization", "curve-sketching"],
    competencyTags: ["calculus reasoning", "symbolic manipulation", "graph interpretation", "optimization"],
    itemTypeTags: ["differentiation task", "tangent problem", "optimization application", "function investigation"],
    difficultyBand: "challenge",
    safeSummary: "UP S6A differentiation should ground rates of change, tangent behaviour, stationary points, and optimization in clearly stated constraints.",
    generationGuidance: [
      "Create original functions and constraints that require derivative reasoning.",
      "Include endpoint, sign, or feasibility checks for challenge-level generated tasks.",
      "Pair calculation with interpretation of graph behaviour or context."
    ],
    misconceptionTags: ["stationary point treated as automatically extreme", "endpoint ignored", "derivative sign not justified", "tangent-normal relation confused"],
    sourceFiles: ["DSE UP Mathematics and Life 6A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-6a-senior-synthesis",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "6A",
    grade: "S6",
    chapter: "Senior synthesis before final revision",
    topicIds: ["advanced-functions", "probability-s5", "data-handling", "mixed-problem-solving"],
    conceptIds: ["cross-topic-synthesis", "advanced-functions", "probability", "statistics", "case-analysis", "modeling"],
    competencyTags: ["strategic reasoning", "model selection", "representation transfer", "resilience"],
    itemTypeTags: ["linked investigation", "cross-topic task", "diagnostic extension", "teacher planning"],
    difficultyBand: "challenge",
    safeSummary: "UP S6A synthesis can guide revision tasks that connect calculus readiness with functions, uncertainty, data, and algebraic modelling.",
    generationGuidance: [
      "Generate cross-topic tasks from concept goals, not from source task structure.",
      "Use checkpoints that expose whether a student chose the governing concept correctly.",
      "Provide teacher-facing notes on the prerequisite likely being tested."
    ],
    misconceptionTags: ["starting with heavy algebra too early", "representation mismatch", "case split incomplete", "unsupported conclusion"],
    sourceFiles: ["DSE UP Mathematics and Life 6A local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-6b-final-dse-revision",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "6B",
    grade: "S6",
    chapter: "Final DSE revision and mixed paper readiness",
    topicIds: ["exam-revision", "mixed-problem-solving", "functions", "coordinate-geometry", "data-handling"],
    conceptIds: ["exam-readiness", "multi-step-reasoning", "method-selection", "time-efficient-checking", "cross-topic-synthesis"],
    competencyTags: ["exam planning", "method selection", "communication", "checking reasonableness"],
    itemTypeTags: ["revision set", "structured response", "multiple choice", "mixed-topic diagnostic"],
    difficultyBand: "exam",
    safeSummary: "UP S6B final revision should support balanced DSE preparation across fluency, method selection, explanation, and efficient checking.",
    generationGuidance: [
      "Generate fresh mixed-topic sets where each item has a clear concept purpose.",
      "Vary the efficient route across algebraic, graphical, geometric, statistical, and calculus methods.",
      "Ask for short reflection prompts that identify why a method was chosen."
    ],
    misconceptionTags: ["method chosen from surface wording only", "subpart dependency missed", "checking skipped under time pressure", "topic boundary misidentified"],
    sourceFiles: ["DSE UP Mathematics and Life 6B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  },
  {
    id: "hk-dse-up-6b-bilingual-terminology-and-paper-skills",
    curriculumTrack: "HK",
    publisher: "HK_UNITED_PRIME_MIA",
    volume: "6B",
    grade: "S6",
    chapter: "Bilingual terminology and paper skills",
    topicIds: ["exam-revision", "bilingual-math-language", "mixed-problem-solving"],
    conceptIds: ["bilingual-terminology", "instruction-clarity", "mathematical-communication", "paper-strategy", "distractor-analysis"],
    competencyTags: ["language precision", "translation awareness", "communication", "efficient reasoning"],
    itemTypeTags: ["bilingual prompt", "terminology check", "paper strategy", "diagnostic distractor"],
    difficultyBand: "core",
    safeSummary: "The UP senior textbook family can calibrate Hong Kong bilingual terminology and paper skills while every MAIS prompt remains newly written.",
    generationGuidance: [
      "Use Hong Kong mathematical terminology and concise bilingual phrasing when needed.",
      "Create fresh wording for every prompt, hint, and explanation.",
      "Use paper-skill notes to explain method choice and distractor risk without copying source phrasing."
    ],
    misconceptionTags: ["instruction verb misunderstood", "term translated too literally", "symbol read without context", "distractor matched by keyword"],
    sourceFiles: ["DSE UP Mathematics and Life 6B local private PDF"],
    prohibitedReuseNotes: dseUpOriginalityGuards
  }
];
