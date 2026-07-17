import type { HongKongEaseQuestionPatternCard } from "@/types";

const easeOriginalityGuards = [
  "Use this card only as aggregated EASE question-bank and image-asset pattern guidance.",
  "Do not reproduce, translate, paraphrase, reconstruct, or lightly modify source question wording, worked responses, answer images, figure layouts, option sets, or recognizable visual arrangements.",
  "Generate new MAIS-authored prompts, diagrams, numbers, contexts, hints, answer checks, and explanations."
];

const sharedSourceFamilies = [
  "EASE imported question JSON metadata under data/ease",
  "EASE public image asset folders under public/ease_question_assets",
  "S18 pilot inventory and QA notes for the imported EASE corpus"
];

export const hongKongEaseQuestionPatternCards: HongKongEaseQuestionPatternCard[] = [
  {
    id: "hk-ease-shared-corpus-image-inventory",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "cross-stage",
    grades: ["S1", "S2", "S3", "S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["ease-question-bank", "image-backed-question", "asset-index", "mixed-problem-solving"],
    conceptIds: ["ease-shared-bank", "question-image", "answer-image", "visual-question-routing", "source-distance"],
    competencyTags: ["retrieval grounding", "visual triage", "publisher-neutral routing", "source-distance safety"],
    itemTypeTags: ["question-bank metadata", "image-backed prompt pattern", "answer-image review signal", "teacher planning"],
    difficultyBand: "core",
    assetKinds: ["question-image", "answer-image"],
    questionCountRange: "Imported EASE corpus is documented as about 9,339 rows; local public asset index currently exposes 1,000 question-image folders and 36 answer-image folders.",
    imageAssetSummary: "Use the asset layer only to know whether a question family is text-only, image-backed, or answer-image-backed; do not copy source visuals into generated output.",
    safeSummary: "The EASE shared layer gives HK RAG a publisher-neutral view of imported question and image availability so UP and EPH profiles can request visual or text-only practice patterns without crossing textbook layers.",
    generationGuidance: [
      "Route image-heavy requests toward newly drawn diagrams or teacher-authorized asset display, never toward reconstructed source images.",
      "Prefer fresh values, labels, and diagrams when generating practice from the same topic family.",
      "Use asset availability as a modality signal for UI planning, accessibility notes, and manual QA prioritization."
    ],
    misconceptionTags: ["source image copied", "answer image treated as explanation text", "publisher layer mixed with shared corpus layer"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-s1-s3-foundation-fluency",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "junior-secondary",
    grades: ["S1", "S2", "S3"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["number-sense", "directed-numbers", "algebraic-language", "linear-equations", "junior-revision"],
    conceptIds: ["integer-fluency", "operation-order", "algebraic-expression", "linear-equations", "ratio", "percentage"],
    competencyTags: ["procedural fluency", "representation transfer", "diagnostic feedback", "basic competency"],
    itemTypeTags: ["short calculation", "fill-in", "compact diagnostic", "topic practice"],
    difficultyBand: "foundation",
    assetKinds: ["text-only", "question-image"],
    questionCountRange: "Large S1-S3 EASE subsets are available through the imported metadata and image folders.",
    imageAssetSummary: "Some junior items have simple visual or worksheet-style images; regenerate visuals rather than copying them.",
    safeSummary: "Junior EASE patterns are useful for quick fluency checks, algebra-language diagnostics, and misconception-targeted practice before heavier DSE preparation.",
    generationGuidance: [
      "Create short original S1-S3 drills that isolate one concept and one likely error.",
      "Keep arithmetic, ratio, percentage, and linear-equation values newly authored.",
      "When an image-backed pattern is selected, redraw the relationship with fresh labels and numbers."
    ],
    misconceptionTags: ["sign error", "operation order ignored", "ratio base confused", "equation balance lost"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-geometry-visual-diagrams",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "cross-stage",
    grades: ["S1", "S2", "S3", "S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["geometry", "circles", "trigonometry-basics", "coordinate-geometry", "visual-reasoning"],
    conceptIds: ["angle-relations", "circle-geometry", "similarity", "trigonometric-ratio", "coordinate-diagram", "locus"],
    competencyTags: ["diagram interpretation", "geometric reasoning", "spatial visualization", "condition checking"],
    itemTypeTags: ["diagram-supported task", "visual diagnostic", "structured response", "short explanation"],
    difficultyBand: "exam",
    assetKinds: ["question-image"],
    questionCountRange: "EASE public assets include many diagram-backed question-image folders across junior and senior geometry.",
    imageAssetSummary: "Treat diagrams as modality and topic evidence only; generated diagrams must use fresh geometry, labels, and measurements.",
    safeSummary: "Geometry-heavy EASE image signals help HK RAG decide when a learner needs a visual task, a diagram-reading hint, or a redraw-with-new-values practice item.",
    generationGuidance: [
      "Ask learners to name a geometric condition before calculation.",
      "Generate fresh diagrams with controlled relations and no recognizable source layout.",
      "Use distractors around side choice, angle relation, scale, and tangent or locus conditions."
    ],
    misconceptionTags: ["diagram used as proof", "wrong side chosen", "tangent condition confused", "coordinate result not interpreted"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-dse-structured-response",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "senior-secondary",
    grades: ["S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["exam-revision", "structured-response", "paper-1", "mixed-problem-solving"],
    conceptIds: ["structured-response", "multi-step-reasoning", "method-selection", "mathematical-communication", "checking-reasonableness"],
    competencyTags: ["structured reasoning", "procedural fluency", "communication", "verification"],
    itemTypeTags: ["structured response", "linked subpart task", "worked-method diagnostic", "exam-practice"],
    difficultyBand: "exam",
    assetKinds: ["text-only", "question-image", "answer-image"],
    questionCountRange: "Senior EASE rows include structured-response style items and answer-image-backed review material.",
    imageAssetSummary: "Use answer-image presence as a review-workflow signal only; write new explanations instead of reading source solutions into prompts.",
    safeSummary: "DSE-style EASE patterns support original Paper 1 practice that makes setup, method choice, intermediate working, interpretation, and checking visible.",
    generationGuidance: [
      "Build fresh linked subparts that progress from accessible setup to a reasoning-heavy conclusion.",
      "Require enough working to diagnose method selection and communication quality.",
      "Use answer-image-backed metadata only to decide whether a teacher review or solution-checking workflow is appropriate."
    ],
    misconceptionTags: ["subpart dependency missed", "method copied from surface cues", "working omitted", "checking step skipped"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-dse-multiple-choice-diagnostics",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "senior-secondary",
    grades: ["S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["exam-revision", "multiple-choice", "paper-2", "diagnostic-distractors"],
    conceptIds: ["multiple-choice", "distractor-analysis", "fast-method-selection", "estimation", "error-diagnosis"],
    competencyTags: ["concept recognition", "efficient computation", "estimation", "misconception diagnosis"],
    itemTypeTags: ["multiple choice", "compact diagnostic", "single-concept discrimination", "short calculation"],
    difficultyBand: "exam",
    assetKinds: ["text-only", "question-image"],
    questionCountRange: "EASE metadata includes compact senior question families suitable for original DSE Paper 2-style diagnostics.",
    imageAssetSummary: "If an MC pattern is image-backed, redraw the diagram and regenerate every option value.",
    safeSummary: "Multiple-choice EASE patterns help generate compact diagnostic items where each distractor reflects a misconception family instead of a source option set.",
    generationGuidance: [
      "Generate all options from misconception families and fresh numbers.",
      "Vary whether the fastest route is estimation, substitution, diagram reading, or a short algebraic step.",
      "Explain why tempting alternatives fail without referencing any source item."
    ],
    misconceptionTags: ["keyword-matched option chosen", "sign error hidden by options", "definition half-applied", "estimation skipped"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-data-probability-statistics",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "cross-stage",
    grades: ["S2", "S3", "S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["data-handling", "probability", "statistics", "chart-interpretation", "exam-revision"],
    conceptIds: ["data-representation", "descriptive-statistics", "probability", "sample-space", "chart-interpretation", "expected-value"],
    competencyTags: ["data interpretation", "uncertainty reasoning", "case analysis", "contextual communication"],
    itemTypeTags: ["chart interpretation", "probability model", "data conclusion", "diagnostic prompt"],
    difficultyBand: "core",
    assetKinds: ["text-only", "question-image"],
    questionCountRange: "EASE includes text and image-backed data, probability, and statistics practice signals across secondary levels.",
    imageAssetSummary: "Charts or displays must be newly authored with clean scales, units, and values.",
    safeSummary: "Data and probability EASE patterns are useful for original tasks that require computation plus a cautious conclusion tied to the displayed or stated data.",
    generationGuidance: [
      "Use newly authored datasets, charts, events, and sample spaces.",
      "Ask learners to justify whether cases are exhaustive and non-overlapping when relevant.",
      "Require conclusions that follow from the data rather than from outside assumptions."
    ],
    misconceptionTags: ["display scale misread", "average treated as observed value", "sample space incomplete", "correlation overstated"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-bilingual-local-contexts",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "cross-stage",
    grades: ["S1", "S2", "S3", "S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["bilingual-math-language", "local-school-context", "exam-revision", "teacher-planning"],
    conceptIds: ["hong-kong-terminology", "bilingual-alignment", "symbol-language-link", "instruction-clarity"],
    competencyTags: ["language precision", "communication", "translation awareness", "local curriculum alignment"],
    itemTypeTags: ["bilingual prompt", "terminology check", "teacher planning", "concept explanation"],
    difficultyBand: "core",
    assetKinds: ["text-only", "question-image"],
    questionCountRange: "EASE rows include English, Traditional Chinese, and mixed local-school style metadata signals.",
    imageAssetSummary: "Use image-backed local contexts only as a modality signal; generated visuals and copy must be new.",
    safeSummary: "The bilingual EASE layer helps HK RAG keep local terminology, grade naming, and classroom phrasing aligned while sharing the same question-pattern evidence across UP and EPH.",
    generationGuidance: [
      "Prefer Hong Kong mathematical terminology in Chinese responses.",
      "Use bilingual alignment to clarify intent, not to reproduce source sentences.",
      "Keep context names, values, and wording newly authored for every generated task."
    ],
    misconceptionTags: ["term translated too literally", "instruction verb misunderstood", "symbol read without context", "grade label drift"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  },
  {
    id: "hk-ease-shared-answer-image-review",
    curriculumTrack: "HK",
    publisher: "HK_EASE_SHARED",
    stage: "cross-stage",
    grades: ["S1", "S2", "S3", "S4", "S5", "S6"],
    sourceLanguages: ["en", "zh"],
    topicIds: ["solution-checking", "mistake-diagnosis", "teacher-review", "exam-revision"],
    conceptIds: ["answer-image", "worked-method-diagnostic", "error-diagnosis", "feedback-routine", "source-distance"],
    competencyTags: ["self-checking", "teacher review", "error diagnosis", "mathematical communication"],
    itemTypeTags: ["review routine", "mistake diagnosis", "teacher planning", "solution-check prompt"],
    difficultyBand: "challenge",
    assetKinds: ["answer-image"],
    questionCountRange: "Local public asset index exposes 36 answer-image folders for controlled review workflows.",
    imageAssetSummary: "Answer images are never a generation source; they only indicate that a row may require teacher-authorized review or manual QA.",
    safeSummary: "Answer-image metadata helps route EASE-linked work toward review, feedback, or QA workflows while keeping generated explanations independent of source solutions.",
    generationGuidance: [
      "Use answer-image presence to recommend a check-your-method workflow, not to extract source reasoning.",
      "Generate fresh feedback prompts that ask the learner to compare their own method to stated conditions.",
      "When in doubt, flag the item for teacher review instead of inferring unseen solution text."
    ],
    misconceptionTags: ["source solution reconstructed", "feedback copied without understanding", "condition not revisited", "manual QA skipped"],
    sourceFamilies: sharedSourceFamilies,
    prohibitedReuseNotes: easeOriginalityGuards
  }
];
