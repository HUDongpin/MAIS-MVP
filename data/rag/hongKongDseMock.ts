import type { HongKongDseMathExamPatternCard } from "@/types";

const mockOriginalityGuards = [
  "Use this card only as aggregated Hong Kong DSE Mathematics mock-paper guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify any source wording, source item, source figure, source table, marking wording, or worked response.",
  "Generate new MAIS-authored mathematical objects, numbers, contexts, diagrams, constraints, hints, and explanations."
];

const mockYearRange = "mock-paper-pack-en-2011-2020-metadata";
const englishOnly = ["en"] satisfies HongKongDseMathExamPatternCard["languageVariants"];

export const hongKongDseMockExamPatternCards: HongKongDseMathExamPatternCard[] = [
  {
    id: "hk-dse-mock-paper-1-full-paper-rhythm",
    curriculumTrack: "HK",
    yearRange: mockYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mock-paper", "paper-1", "time-management"],
    conceptIds: ["mock-paper", "full-paper-rhythm", "paper-1-practice", "time-management", "method-selection"],
    competencyTags: ["exam pacing", "method selection", "stamina", "checking reasonableness"],
    itemTypeTags: ["mock paper", "full paper practice", "structured response", "timed diagnostic"],
    difficultyBand: "exam",
    patternSummary: "Paper 1 mock-paper guidance should help learners practise a complete structured-response rhythm: scan, select methods, show essential working, reserve checking time, and recover from stuck parts.",
    solutionStrategyTags: ["scan before solving", "allocate time by mark weight", "show essential intermediate reasoning", "return to unresolved parts"],
    misconceptionTags: ["too much time spent on one early part", "method switched without checking", "working omitted under time pressure", "final review skipped"],
    generationGuidance: [
      "Create fresh full-paper practice sets from curriculum goals and target timing bands, not from any source paper layout.",
      "Vary topic order and difficulty movement so students build pacing flexibility.",
      "Include teacher-facing pacing notes and learner reflection prompts without preserving source item sequence."
    ],
    prohibitedReuseNotes: mockOriginalityGuards
  },
  {
    id: "hk-dse-mock-paper-1-structured-response-mix",
    curriculumTrack: "HK",
    yearRange: mockYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mock-paper", "structured-response", "mixed-problem-solving"],
    conceptIds: ["mock-paper", "paper-1-structured-mix", "structured-response", "multi-step-reasoning", "cross-topic-synthesis"],
    competencyTags: ["structured reasoning", "cross-topic transfer", "procedural fluency", "mathematical communication"],
    itemTypeTags: ["mock paper", "structured response", "linked subpart task", "mixed-topic diagnostic"],
    difficultyBand: "exam",
    patternSummary: "Paper 1 mock practice should blend accessible setup, core fluency, interpretation, and higher-demand reasoning so generated work feels like a complete readiness check.",
    solutionStrategyTags: ["identify the governing concept", "connect subparts", "state constraints", "interpret the result"],
    misconceptionTags: ["topic recognized but method misapplied", "subpart dependency missed", "constraint ignored", "calculation answer not interpreted"],
    generationGuidance: [
      "Generate original structured-response mixes by balancing algebraic, graphical, geometric, statistical, and modelling goals.",
      "Use newly authored values, diagrams, variables, and contexts for every generated task.",
      "Design subparts that reveal method choice and reasoning quality without copying source progression."
    ],
    prohibitedReuseNotes: mockOriginalityGuards
  },
  {
    id: "hk-dse-mock-paper-1-solution-checking-habits",
    curriculumTrack: "HK",
    yearRange: mockYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mock-paper", "error-diagnosis", "reflection"],
    conceptIds: ["mock-paper", "solution-checking", "checking-reasonableness", "error-diagnosis", "method-validation"],
    competencyTags: ["self-checking", "error diagnosis", "reasonableness checking", "mathematical communication"],
    itemTypeTags: ["mock paper", "review routine", "worked-method diagnostic", "reflection prompt"],
    difficultyBand: "exam",
    patternSummary: "Mock-paper review guidance should turn post-attempt checking into habits: compare method to conditions, test units and domains, flag fragile steps, and revise explanations in the learner's own words.",
    solutionStrategyTags: ["check the original condition", "verify units and domains", "test a boundary case", "explain the correction"],
    misconceptionTags: ["review limited to arithmetic", "condition not revisited", "domain restriction missed", "correction copied without understanding"],
    generationGuidance: [
      "Create original review prompts that ask students to audit their own reasoning rather than mirror any source worked response.",
      "Use new error patterns and learner reflection stems for each generated diagnostic.",
      "Keep feedback focused on method validation, constraint checking, and clarity of explanation."
    ],
    prohibitedReuseNotes: mockOriginalityGuards
  },
  {
    id: "hk-dse-mock-ce-to-dse-transition-patterns",
    curriculumTrack: "HK",
    yearRange: mockYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mock-paper", "curriculum-continuity", "exam-readiness"],
    conceptIds: ["mock-paper", "ce-dse-transition", "exam-readiness", "curriculum-continuity", "paper-1-practice"],
    competencyTags: ["curriculum continuity", "exam readiness", "method transfer", "problem interpretation"],
    itemTypeTags: ["mock paper", "transition diagnostic", "structured response", "readiness bridge"],
    difficultyBand: "exam",
    patternSummary: "CE-to-DSE transition guidance should be used only at the pattern level: older structured-response habits can inform pacing, method clarity, and topic continuity, while all student-facing material remains newly authored for current DSE use.",
    solutionStrategyTags: ["compare required method clarity", "map older skill to current syllabus goal", "refresh notation", "check current-topic fit"],
    misconceptionTags: ["older format treated as current exam blueprint", "notation refreshed only superficially", "topic fit assumed without checking", "routine procedure used without interpretation"],
    generationGuidance: [
      "Use transition signals to plan original bridge diagnostics for S4-S6 learners.",
      "Keep the focus on skill continuity and current DSE expectations, not historical paper reconstruction.",
      "Write fresh contexts and prompts that fit current Hong Kong senior-secondary learning goals."
    ],
    prohibitedReuseNotes: mockOriginalityGuards
  },
  {
    id: "hk-dse-mock-final-revision-diagnostics",
    curriculumTrack: "HK",
    yearRange: mockYearRange,
    languageVariants: englishOnly,
    paperComponents: ["paper-1"],
    topicIds: ["exam-revision", "mock-paper", "final-revision", "diagnostic-review"],
    conceptIds: ["mock-paper", "final-revision", "diagnostic-review", "mixed-problem-solving", "readiness-check"],
    competencyTags: ["readiness diagnosis", "strategic revision", "mixed problem solving", "reflection"],
    itemTypeTags: ["mock paper", "final revision diagnostic", "teacher planning", "learner reflection"],
    difficultyBand: "exam",
    patternSummary: "Final-revision mock guidance should convert full-paper attempts into a compact readiness profile across topic gaps, pacing risks, communication quality, and high-value follow-up practice.",
    solutionStrategyTags: ["tag the error type", "prioritize high-yield gaps", "re-attempt a related original task", "set the next review target"],
    misconceptionTags: ["revision based only on score", "topic gap and careless error conflated", "same weak method repeated", "follow-up practice not targeted"],
    generationGuidance: [
      "Generate fresh diagnostic follow-ups after a mock attempt using concept tags and misconception families.",
      "Recommend original short drills or mini-mock segments rather than reusing source paper material.",
      "Keep teacher summaries actionable and publisher-neutral for Hong Kong DSE Core Mathematics."
    ],
    prohibitedReuseNotes: mockOriginalityGuards
  }
];
