import type { HongKongDseMathExamPatternCard } from "@/types";
import { hongKongDseMockExamPatternCards } from "./hongKongDseMock";
import { hongKongDseTopicPracticeExamPatternCards } from "./hongKongDseTopicPractice";

const dseOriginalityGuards = [
  "Use this card only as aggregated Hong Kong DSE Mathematics item-pattern guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify any source wording, source item, source figure, source table, marking wording, or worked response.",
  "Generate new MAIS-authored mathematical objects, numbers, contexts, diagrams, constraints, hints, and explanations."
];

export const hongKongDseMathExamPatternCards: HongKongDseMathExamPatternCard[] = [
  {
    id: "hk-dse-paper-1-structured-response",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mixed-problem-solving", "structured-response"],
    conceptIds: ["structured-response", "method-selection", "multi-step-reasoning", "mathematical-communication"],
    competencyTags: ["procedural fluency", "structured reasoning", "communication", "checking reasonableness"],
    itemTypeTags: ["structured response", "linked subpart task", "method mark style reasoning", "multi-step calculation"],
    difficultyBand: "exam",
    patternSummary: "Paper 1 style work rewards a clear chain of method selection, calculation, interpretation, and checking rather than a final value alone.",
    solutionStrategyTags: ["state the target quantity", "choose a representation", "show essential intermediate reasoning", "check units and constraints"],
    misconceptionTags: ["unexplained final result", "subpart dependency missed", "unit or domain not checked", "method chosen from surface wording only"],
    generationGuidance: [
      "Create fresh linked subparts that progress from accessible setup to a reasoning-heavy conclusion.",
      "Use new contexts and values, and vary whether the efficient method is algebraic, graphical, geometric, or statistical.",
      "Ask for enough working to diagnose the method, without copying any source layout or marking expression."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-paper-2-multiple-choice-distractors",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-2"],
    topicIds: ["exam-revision", "multiple-choice", "diagnostic-distractors"],
    conceptIds: ["distractor-analysis", "fast-method-selection", "estimation", "error-diagnosis"],
    competencyTags: ["concept recognition", "efficient computation", "estimation", "misconception diagnosis"],
    itemTypeTags: ["multiple choice", "single-step trap", "short calculation", "concept discrimination"],
    difficultyBand: "exam",
    patternSummary: "Paper 2 style work can be used to design compact original items where each distractor reflects a plausible misconception or inefficient shortcut.",
    solutionStrategyTags: ["estimate before computing", "eliminate impossible choices", "test definitions carefully", "watch sign and unit constraints"],
    misconceptionTags: ["distractor matched by keyword", "sign error hidden by options", "formula used outside condition", "estimation skipped"],
    generationGuidance: [
      "Generate new choices from known misconception families, not from prior source options.",
      "Vary whether the fastest route is estimation, substitution, diagram reading, or a short algebraic step.",
      "Keep option values newly authored and require the explanation to name why each distractor is tempting."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-algebra-equations-inequalities",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["more-algebra", "linear-equations", "polynomials", "exam-revision"],
    conceptIds: ["equations", "inequalities", "polynomials", "factorization", "algebraic-manipulation", "parameter-reasoning"],
    competencyTags: ["symbolic manipulation", "logical reasoning", "case analysis", "verification"],
    itemTypeTags: ["algebraic manipulation", "equation solving", "inequality reasoning", "parameter condition"],
    difficultyBand: "exam",
    patternSummary: "DSE-style algebra patterns often ask students to transform expressions, solve conditions, reason about parameters, and verify that candidate results satisfy the original constraints.",
    solutionStrategyTags: ["preserve equivalence", "track restrictions", "split cases only when needed", "substitute back for validation"],
    misconceptionTags: ["extraneous result after transformation", "inequality direction error", "factor condition missed", "parameter boundary omitted"],
    generationGuidance: [
      "Create original expressions and parameter conditions with visible constraints.",
      "Use a mixture of fluency and reasoning prompts so students explain why a transformation is valid.",
      "Include boundary or domain checks in higher-level generated tasks."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-functions-graphs",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["functions", "advanced-functions", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["functions", "graphs", "transformations", "domain-range", "zeros", "parameters", "modeling"],
    competencyTags: ["representation transfer", "graph interpretation", "symbolic reasoning", "modeling"],
    itemTypeTags: ["function investigation", "graph reading", "transformation task", "parameter classification"],
    difficultyBand: "exam",
    patternSummary: "Function and graph patterns connect algebraic form, graph features, transformations, roots, ranges, and contextual interpretation.",
    solutionStrategyTags: ["state the domain", "connect graph feature to equation", "use transformations consistently", "verify boundary behavior"],
    misconceptionTags: ["domain ignored", "graph feature read visually without condition", "range and endpoint confused", "transformation direction reversed"],
    generationGuidance: [
      "Author new function families and graph descriptions with changed parameters and intervals.",
      "Pair a symbolic step with a graphical interpretation so the task is not just formula recall.",
      "Use new diagrams or text-only descriptions created inside MAIS."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-coordinate-geometry",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["coordinate-geometry", "coordinates", "circles", "exam-revision"],
    conceptIds: ["line-equations", "circle-equations", "distance", "midpoint", "slope", "intersection", "locus"],
    competencyTags: ["coordinate modeling", "visualization", "algebraic reasoning", "geometric interpretation"],
    itemTypeTags: ["coordinate geometry task", "line-circle relation", "diagram-supported task", "locus reasoning"],
    difficultyBand: "exam",
    patternSummary: "Coordinate-geometry patterns translate geometric conditions into equations, then interpret algebraic results back in the plane.",
    solutionStrategyTags: ["choose an equation form", "convert condition to algebra", "use distance or slope relations", "interpret the coordinate result"],
    misconceptionTags: ["slope relation reversed", "radius squared mishandled", "distance target mismatched", "intersection condition overgeneralized"],
    generationGuidance: [
      "Create fresh points, lines, circles, and constraints rather than reusing classic diagram shapes.",
      "Ask students to justify why a chosen equation form fits the condition.",
      "For challenge tasks, include feasibility checks or a short geometric explanation."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-trigonometry",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["trigonometry-s5", "trigonometry-basics", "exam-revision"],
    conceptIds: ["trigonometric-ratio", "trigonometric-functions", "identities", "bearings", "angle-relations", "solution-intervals"],
    competencyTags: ["spatial reasoning", "symbolic transformation", "diagram interpretation", "equation solving"],
    itemTypeTags: ["trigonometric equation", "triangle measurement", "graph and ratio task", "contextual angle task"],
    difficultyBand: "exam",
    patternSummary: "Trigonometry patterns combine ratio selection, identity use, graph or interval interpretation, and geometric context reading.",
    solutionStrategyTags: ["define the angle clearly", "choose the relevant ratio or identity", "respect interval restrictions", "check degree-radian context"],
    misconceptionTags: ["wrong reference angle", "ratio chosen from wrong side", "interval solution incomplete", "identity applied without condition"],
    generationGuidance: [
      "Use newly drawn or described geometric situations with clear angle labels.",
      "Combine one representation decision with one symbolic or numerical step.",
      "Create distractors around common angle, sign, and interval errors."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-geometry-measurement",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["geometry", "circles", "perimeter-area", "volume", "exam-revision"],
    conceptIds: ["circle-geometry", "similarity", "congruence", "area-volume", "angle-chasing", "proof-readiness"],
    competencyTags: ["geometric reasoning", "visualization", "measurement reasoning", "logical explanation"],
    itemTypeTags: ["geometric explanation", "diagram-supported task", "measurement task", "short proof"],
    difficultyBand: "exam",
    patternSummary: "Geometry and measurement patterns require students to read a diagram, identify valid properties, and distinguish measured appearance from justified reasoning.",
    solutionStrategyTags: ["mark known facts", "state the theorem or relation", "separate proof from calculation", "check units and scale"],
    misconceptionTags: ["drawing used as proof", "similarity condition incomplete", "area and perimeter confused", "circle angle relation misidentified"],
    generationGuidance: [
      "Author new diagrams and measurements inside MAIS with controlled relationships.",
      "Require a named reason or condition before a calculation in higher-level tasks.",
      "Use diagram variation to test whether students rely on properties rather than appearance."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-statistics-probability",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["data-handling", "probability-s5", "statistics-s1", "probability-s2", "exam-revision"],
    conceptIds: ["descriptive-statistics", "data-representation", "probability", "sample-space", "expected-value", "interpretation"],
    competencyTags: ["data interpretation", "uncertainty reasoning", "modeling", "communication"],
    itemTypeTags: ["data and probability task", "chart interpretation", "probability model", "context conclusion"],
    difficultyBand: "exam",
    patternSummary: "Statistics and probability patterns pair computation with interpretation, asking whether a conclusion follows from the data or model.",
    solutionStrategyTags: ["define the sample space", "read the display scale", "separate cases", "state the conclusion cautiously"],
    misconceptionTags: ["sample space incomplete", "overlapping cases counted twice", "average treated as a data point", "correlation overstated"],
    generationGuidance: [
      "Use newly authored datasets, tables, or summary statistics.",
      "Ask for both a numerical result and a short contextual interpretation.",
      "Design variants that change representation type while preserving the same reasoning target."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-differentiation-applications",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["differentiation-intro", "advanced-functions", "exam-revision"],
    conceptIds: ["differentiation", "rate-of-change", "tangent", "stationary-points", "optimization", "curve-sketching"],
    competencyTags: ["calculus reasoning", "symbolic manipulation", "graph interpretation", "optimization"],
    itemTypeTags: ["differentiation task", "tangent problem", "optimization application", "function investigation"],
    difficultyBand: "challenge",
    patternSummary: "Differentiation patterns connect rates of change, tangents, stationary behavior, graph features, and optimization under stated constraints.",
    solutionStrategyTags: ["differentiate accurately", "connect derivative sign to behavior", "check endpoints", "interpret the result in context"],
    misconceptionTags: ["stationary point treated as automatically extreme", "endpoint ignored", "derivative sign not justified", "tangent-normal relation confused"],
    generationGuidance: [
      "Create original functions and constraints that require derivative reasoning, not recognition of a prior setup.",
      "Include sign, endpoint, or feasibility checks for challenge-level items.",
      "Pair calculation with a brief interpretation of graph or context."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-sequences-growth-models",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["sequences", "functions", "exam-revision", "mixed-problem-solving"],
    conceptIds: ["sequences", "arithmetic-pattern", "geometric-pattern", "growth-model", "recurrence", "summation"],
    competencyTags: ["pattern generalization", "symbolic reasoning", "modeling", "verification"],
    itemTypeTags: ["sequence task", "growth model", "formula discovery", "multi-step application"],
    difficultyBand: "core",
    patternSummary: "Sequence and growth-model patterns ask students to detect structure, express a general term or relation, and interpret the model limits.",
    solutionStrategyTags: ["list early terms", "identify the structure", "verify the general expression", "check context constraints"],
    misconceptionTags: ["index shift error", "linear pattern assumed too quickly", "initial term omitted", "model extrapolated too far"],
    generationGuidance: [
      "Create new pattern rules and contexts with controlled term behavior.",
      "Ask students to justify the structure before using a formula.",
      "Use variants that separate arithmetic, geometric, and contextual growth assumptions."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-cross-topic-challenge",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1"],
    topicIds: ["mixed-problem-solving", "exam-revision", "modeling"],
    conceptIds: ["cross-topic-synthesis", "modeling", "proof-readiness", "case-analysis", "strategy-selection"],
    competencyTags: ["strategic problem solving", "logical reasoning", "modeling", "resilience"],
    itemTypeTags: ["cross-topic task", "challenge item", "linked investigation", "diagnostic extension"],
    difficultyBand: "challenge",
    patternSummary: "Cross-topic challenge patterns test whether students can select a pathway, combine representations, and maintain logical control across several concepts.",
    solutionStrategyTags: ["identify the governing concept", "break the task into checkpoints", "compare alternative methods", "verify all constraints"],
    misconceptionTags: ["starting with heavy algebra too early", "case split incomplete", "representation mismatch", "final conclusion not tied to conditions"],
    generationGuidance: [
      "Generate fresh synthesis tasks by combining concept goals rather than imitating a source structure.",
      "Use scaffolding checkpoints so the same pattern can become a lesson, diagnostic, or challenge item.",
      "Require an explanation of why the chosen method is efficient or valid."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  {
    id: "hk-dse-bilingual-terminology-style",
    curriculumTrack: "HK",
    yearRange: "2012-2023",
    languageVariants: ["en", "zh"],
    paperComponents: ["paper-1", "paper-2"],
    topicIds: ["exam-revision", "bilingual-math-language"],
    conceptIds: ["bilingual-terminology", "mathematical-communication", "instruction-clarity", "symbol-language-link"],
    competencyTags: ["language precision", "translation awareness", "communication", "symbol interpretation"],
    itemTypeTags: ["bilingual prompt", "terminology check", "concept explanation", "teacher planning"],
    difficultyBand: "core",
    patternSummary: "The bilingual DSE source family is useful for aligning MAIS wording with Hong Kong classroom terminology while keeping all prompts newly authored.",
    solutionStrategyTags: ["define terms before calculation", "link symbols to words", "avoid literal translation drift", "use concise Hong Kong phrasing"],
    misconceptionTags: ["term translated too literally", "symbol read without context", "instruction verb misunderstood", "English and Chinese labels not aligned"],
    generationGuidance: [
      "Prefer Hong Kong mathematical terminology and concise bilingual phrasing when needed.",
      "Use bilingual alignment to clarify intent, not to reproduce source sentences.",
      "Create fresh wording for every student-facing prompt, hint, and explanation."
    ],
    prohibitedReuseNotes: dseOriginalityGuards
  },
  ...hongKongDseTopicPracticeExamPatternCards,
  ...hongKongDseMockExamPatternCards
];
