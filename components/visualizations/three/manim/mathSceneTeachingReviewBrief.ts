import {
  buildConcreteMathSceneTeachingReviewCases,
  type MathSceneTeachingReviewCase
} from "./mathSceneTeachingReviewCases";

export const MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT =
  "A18/A06 final teaching-review brief: grouped concrete MAIS Manim scenes with human signoff checklist and source-backed evidence" as const;

export type MathSceneTeachingReviewBriefStatus = "a18-final-human-review-required";

export type MathSceneTeachingReviewBand = MathSceneTeachingReviewCase["targetBand"];

export type MathSceneTeachingReviewBriefCase = Pick<
  MathSceneTeachingReviewCase,
  | "cameraShotCount"
  | "caseId"
  | "cognitiveLoadNote"
  | "curriculumFitNote"
  | "focusedBeatCount"
  | "interactionTimingNote"
  | "labelLanguageNote"
  | "learningObjective"
  | "mathematicalAccuracyNote"
  | "mathFocus"
  | "reviewerPrompt"
  | "sceneId"
  | "semanticBindingCount"
  | "status"
  | "targetBand"
  | "visualModel"
>;

export type MathSceneTeachingReviewQueueSection = {
  band: MathSceneTeachingReviewBand;
  cases: MathSceneTeachingReviewBriefCase[];
  humanSignoffRequired: true;
  title: string;
};

export type MathSceneTeachingReviewBrief = {
  a18FinalHumanReviewRequired: true;
  bandCounts: Record<MathSceneTeachingReviewBand, number>;
  caseCount: number;
  caseIds: string[];
  cases: MathSceneTeachingReviewBriefCase[];
  humanReviewChecklist: string[];
  missingEvidenceCount: number;
  readyCount: number;
  reviewQueue: MathSceneTeachingReviewQueueSection[];
  sourceContract: typeof MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT;
  status: MathSceneTeachingReviewBriefStatus;
  summary: string;
};

const bandOrder: MathSceneTeachingReviewBand[] = ["primary", "middle-school", "secondary", "advanced"];

const bandTitles: Record<MathSceneTeachingReviewBand, string> = {
  advanced: "Advanced scene teaching review",
  "middle-school": "Middle-school scene teaching review",
  primary: "Primary scene teaching review",
  secondary: "Secondary scene teaching review"
};

const humanReviewChecklist = [
  "curriculum-fit",
  "mathematical-accuracy",
  "cognitive-load",
  "language-and-labels",
  "interaction-timing"
];

function toBriefCase(reviewCase: MathSceneTeachingReviewCase): MathSceneTeachingReviewBriefCase {
  return {
    cameraShotCount: reviewCase.cameraShotCount,
    caseId: reviewCase.caseId,
    cognitiveLoadNote: reviewCase.cognitiveLoadNote,
    curriculumFitNote: reviewCase.curriculumFitNote,
    focusedBeatCount: reviewCase.focusedBeatCount,
    interactionTimingNote: reviewCase.interactionTimingNote,
    labelLanguageNote: reviewCase.labelLanguageNote,
    learningObjective: reviewCase.learningObjective,
    mathematicalAccuracyNote: reviewCase.mathematicalAccuracyNote,
    mathFocus: reviewCase.mathFocus,
    reviewerPrompt: reviewCase.reviewerPrompt,
    sceneId: reviewCase.sceneId,
    semanticBindingCount: reviewCase.semanticBindingCount,
    status: reviewCase.status,
    targetBand: reviewCase.targetBand,
    visualModel: reviewCase.visualModel
  };
}

function emptyBandCounts(): Record<MathSceneTeachingReviewBand, number> {
  return {
    advanced: 0,
    "middle-school": 0,
    primary: 0,
    secondary: 0
  };
}

function bandSummary(bandCounts: Record<MathSceneTeachingReviewBand, number>) {
  return bandOrder.map((band) => `${band}=${bandCounts[band]}`).join(";");
}

export function buildMathSceneTeachingReviewBrief(): MathSceneTeachingReviewBrief {
  const cases = buildConcreteMathSceneTeachingReviewCases().map(toBriefCase);
  const bandCounts = emptyBandCounts();

  for (const reviewCase of cases) {
    bandCounts[reviewCase.targetBand] += 1;
  }

  const reviewQueue: MathSceneTeachingReviewQueueSection[] = bandOrder.map((band) => ({
    band,
    cases: cases.filter((reviewCase) => reviewCase.targetBand === band),
    humanSignoffRequired: true,
    title: bandTitles[band]
  }));
  const queuedCases = reviewQueue.flatMap((section) => section.cases);
  const readyCount = queuedCases.filter((reviewCase) => reviewCase.status === "a06-confirmed-ready-for-a18-signoff").length;

  return {
    a18FinalHumanReviewRequired: true,
    bandCounts,
    caseCount: queuedCases.length,
    caseIds: queuedCases.map((reviewCase) => reviewCase.caseId),
    cases: queuedCases,
    humanReviewChecklist,
    missingEvidenceCount: queuedCases.length - readyCount,
    readyCount,
    reviewQueue,
    sourceContract: MATH_SCENE_TEACHING_REVIEW_BRIEF_SOURCE_CONTRACT,
    status: "a18-final-human-review-required",
    summary: [
      "a18TeachingReviewBrief",
      `cases=${queuedCases.length}`,
      `ready=${readyCount}`,
      `missing=${queuedCases.length - readyCount}`,
      bandSummary(bandCounts)
    ].join(":")
  };
}

export function mathSceneTeachingReviewBriefDataAttributes(brief: MathSceneTeachingReviewBrief) {
  return {
    "data-viz-manim-teaching-review-brief-band-summary": bandSummary(brief.bandCounts),
    "data-viz-manim-teaching-review-brief-case-count": String(brief.caseCount),
    "data-viz-manim-teaching-review-brief-missing-count": String(brief.missingEvidenceCount),
    "data-viz-manim-teaching-review-brief-ready-count": String(brief.readyCount),
    "data-viz-manim-teaching-review-brief-source-contract": brief.sourceContract,
    "data-viz-manim-teaching-review-brief-status": brief.status,
    "data-viz-manim-teaching-review-brief-summary": brief.cases
      .map((reviewCase) => `${reviewCase.caseId}=${reviewCase.status === "a06-confirmed-ready-for-a18-signoff" ? "ready" : "needs-followup"}`)
      .join(";")
  } as const;
}
