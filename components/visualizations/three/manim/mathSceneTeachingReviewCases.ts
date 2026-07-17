import type { ThreeDFamilyId, ThreeDStateSummary } from "../threeDSceneTypes";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import {
  buildMathSceneTeachingQualityEvidence,
  type MathSceneTeachingQualityConcern
} from "./mathSceneTeachingQuality";

export const MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT =
  "A18/A06 concrete teaching-review cases: representative MAIS Manim scenes with objectives, curriculum-fit notes, mathematical-accuracy notes, cognitive-load notes, label/language notes, interaction-timing notes, and source-spec evidence" as const;

export type ConcreteTeachingReviewCaseId =
  | "number-line-core"
  | "fraction-slices-core"
  | "angle-geometry-core"
  | "function-graph-core"
  | "function-family-core"
  | "trig-unit-wave-core"
  | "calculus-rate-area-core"
  | "conic-section-core"
  | "space-vectors-core"
  | "probability-machine-core"
  | "statistics-distribution-core"
  | "statistical-inference-core";

export type MathSceneTeachingReviewCaseStatus =
  | "a06-confirmed-ready-for-a18-signoff"
  | "needs-a06-remediation";

type TeachingReviewCaseDefinition = {
  caseId: ConcreteTeachingReviewCaseId;
  cognitiveLoadNote: string;
  curriculumFitNote: string;
  familyId: ThreeDFamilyId;
  interactionTimingNote: string;
  labelLanguageNote: string;
  learningObjective: string;
  mathematicalAccuracyNote: string;
  mathFocus: string;
  reviewerPrompt: string;
  targetBand: "primary" | "middle-school" | "secondary" | "advanced";
  visualModel: string;
};

export type MathSceneTeachingReviewCase = TeachingReviewCaseDefinition & {
  a18FinalHumanReviewRequired: true;
  cameraShotCount: number;
  controlParameterCount: number;
  focusedBeatCount: number;
  formulaTokenCount: number;
  missingTeachingEvidence: MathSceneTeachingQualityConcern[];
  sceneId: string;
  semanticBindingCount: number;
  sourceContract: typeof MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT;
  status: MathSceneTeachingReviewCaseStatus;
  summary: string;
};

const concreteTeachingReviewCaseDefinitions = [
  {
    caseId: "number-line-core",
    cognitiveLoadNote: "Keeps attention on one rail, one moving point, and one comparison distance before any cross-topic transfer.",
    curriculumFitNote: "Fits a primary number-line review because the scene focuses on value location, unit interval, and distance comparison.",
    familyId: "three-number-line",
    interactionTimingNote: "Keeps value probe motion stepwise enough for learners to track each jump before comparison distance appears.",
    labelLanguageNote: "Labels name value, unit interval, and jump distance with the same terms used in the visible formula tokens.",
    learningObjective: "Explain how a value point, unit interval, and comparison distance work together on a number line.",
    mathematicalAccuracyNote: "Confirms value, unit interval, and jump distance use one consistent number-line scale.",
    mathFocus: "Unit intervals, value location, and distance comparison",
    reviewerPrompt: "Confirm that learners can identify the point, unit, and jump before interpreting the formula tokens.",
    targetBand: "primary",
    visualModel: "Single horizontal rail with a value probe and jump path"
  },
  {
    caseId: "fraction-slices-core",
    cognitiveLoadNote: "Uses a whole-part model with limited moving pieces so denominator and unit-fraction language stay visible.",
    curriculumFitNote: "Fits a primary fractions review because the scene keeps whole-part structure and denominator language visible.",
    familyId: "three-fraction-slices",
    interactionTimingNote: "Reveals whole boundary before selected slice so part-whole language lands before denominator emphasis.",
    labelLanguageNote: "Names whole, selected part, denominator, and unit fraction consistently across slice labels and formula tokens.",
    learningObjective: "Connect a whole, a selected part, and the denominator to the meaning of one unit fraction.",
    mathematicalAccuracyNote: "Confirms selected slice count, denominator meaning, and whole boundary preserve unit-fraction structure.",
    mathFocus: "Whole-part fraction structure",
    reviewerPrompt: "Confirm that the selected slice, whole boundary, and denominator token are simultaneously visible.",
    targetBand: "primary",
    visualModel: "Circle whole with highlighted slice, boundary, and unit-radius cue"
  },
  {
    caseId: "angle-geometry-core",
    cognitiveLoadNote: "Limits the scene to the base ray, rotating ray, angle arc, and bisector so angle measure is not overdecorated.",
    curriculumFitNote: "Fits a middle-school geometry review because the scene centers angle measure, reference rays, and bisectors.",
    familyId: "three-angle-geometry",
    interactionTimingNote: "Moves the rotating ray before highlighting the arc and bisector so angle measure is read as motion.",
    labelLanguageNote: "Keeps base ray, rotating ray, angle arc, and bisector labels aligned with angle-measure vocabulary.",
    learningObjective: "Interpret angle measure as the rotation from a reference ray to a moving ray.",
    mathematicalAccuracyNote: "Confirms base ray, rotating ray, angle arc, and bisector represent the same measured angle.",
    mathFocus: "Angle measure, reference rays, and bisectors",
    reviewerPrompt: "Confirm that the angle arc and rotating ray remain the perceptual focus during the camera detail beat.",
    targetBand: "middle-school",
    visualModel: "Rotating ray over a base ray with angle arc and bisector cue"
  },
  {
    caseId: "function-graph-core",
    cognitiveLoadNote: "Coordinates the graph curve, moving point, and formula token so the rule-to-point link is visible without extra panels.",
    curriculumFitNote: "Fits a secondary functions review because the scene connects rule, input-output point, and graph shape.",
    familyId: "three-function-graph",
    interactionTimingNote: "Sweeps the input probe at a steady pace while highlighting the matching formula token and graph point.",
    labelLanguageNote: "Matches input, output, curve, and formula-token labels so the rule-to-point link is readable.",
    learningObjective: "Trace how a function rule produces a point on the graph as the input value changes.",
    mathematicalAccuracyNote: "Confirms each graph point is generated from the displayed function rule and input value.",
    mathFocus: "Function rule, input-output point, and graph shape",
    reviewerPrompt: "Confirm that the sweep parameter beat visibly links the function token to the graph point.",
    targetBand: "secondary",
    visualModel: "Coordinate axes with function curve, moving probe, and trace"
  },
  {
    caseId: "function-family-core",
    cognitiveLoadNote: "Shows two related curves and one probe so comparison is explicit without turning into a full graphing calculator.",
    curriculumFitNote: "Fits a secondary functions review because the scene compares parameter-driven curve behavior with a shared probe.",
    familyId: "three-function-family",
    interactionTimingNote: "Updates comparison curve after primary curve is established so parameter changes remain attributable.",
    labelLanguageNote: "Separates primary curve, comparison curve, shared probe, and parameter labels without changing terms across views.",
    learningObjective: "Compare how changing a parameter transforms a function family and shifts the probe value.",
    mathematicalAccuracyNote: "Confirms primary and comparison curves reflect the intended parameter change with a shared probe value.",
    mathFocus: "Parameter change, curve comparison, and model family behavior",
    reviewerPrompt: "Confirm that both compared curves have formula bindings and the probe remains readable.",
    targetBand: "secondary",
    visualModel: "Primary and comparison curves with a shared probe"
  },
  {
    caseId: "trig-unit-wave-core",
    cognitiveLoadNote: "Pairs the unit-circle point with the wave trace while avoiding additional trigonometric identities.",
    curriculumFitNote: "Fits a secondary trigonometry review because the scene binds unit-circle motion to wave behavior.",
    familyId: "three-trig-unit-wave",
    interactionTimingNote: "Synchronizes circle point and wave marker timing so periodic correspondence is visible without racing.",
    labelLanguageNote: "Names unit-circle point, angle, sine/cosine projection, and wave trace with consistent symbol labels.",
    learningObjective: "Relate a point moving around the unit circle to the corresponding sine or cosine wave.",
    mathematicalAccuracyNote: "Confirms unit-circle position and wave marker encode the same periodic angle state.",
    mathFocus: "Unit circle, periodic motion, and wave graph",
    reviewerPrompt: "Confirm that the circular motion and wave trace can be followed at the same time.",
    targetBand: "secondary",
    visualModel: "Unit circle path synchronized with a wave curve and moving point"
  },
  {
    caseId: "calculus-rate-area-core",
    cognitiveLoadNote: "Uses tangent and area cues as separate focus beats so rate and accumulation are not introduced simultaneously.",
    curriculumFitNote: "Fits an advanced calculus review because it separates derivative-as-rate from integral-as-area before connecting them.",
    familyId: "three-calculus-rate-area",
    interactionTimingNote: "Sequences tangent-rate and area-accumulation beats separately before showing their shared probe.",
    labelLanguageNote: "Labels tangent/rate and accumulation/area cues separately so derivative and integral language do not blur.",
    learningObjective: "Distinguish local rate of change from accumulated area using linked visual objects.",
    mathematicalAccuracyNote: "Confirms tangent-rate and accumulation-area cues are mathematically distinct before being linked by the shared probe.",
    mathFocus: "Derivative-as-rate and integral-as-area",
    reviewerPrompt: "Confirm that the tangent-rate beat is visually distinct from the area-accumulation beat.",
    targetBand: "advanced",
    visualModel: "Function curve with tangent vector, accumulation surface, and moving probe"
  },
  {
    caseId: "conic-section-core",
    cognitiveLoadNote: "Keeps the plane slice, cone surface, and resulting curve tied together before naming conic types.",
    curriculumFitNote: "Fits an advanced geometry review because the scene ties cone, slicing plane, and conic curve in one model.",
    familyId: "three-conic-sections-deep",
    interactionTimingNote: "Introduces cone and slicing plane before camera detail on the intersection curve.",
    labelLanguageNote: "Keeps cone, slicing plane, and intersection-curve labels distinct before naming conic outcomes.",
    learningObjective: "Explain how a plane slice through a cone generates a conic-section curve.",
    mathematicalAccuracyNote: "Confirms the highlighted curve is the intersection of the cone surface and slicing plane.",
    mathFocus: "Cone, slicing plane, and conic curve",
    reviewerPrompt: "Confirm that the camera detail beat makes the plane-curve relationship unambiguous.",
    targetBand: "advanced",
    visualModel: "3D cone surface, slicing plane, and highlighted intersection curve"
  },
  {
    caseId: "space-vectors-core",
    cognitiveLoadNote: "Balances a vector, a line, and a plane so spatial relationships are visible without crowded labels.",
    curriculumFitNote: "Fits an advanced vector geometry review because the scene uses vector, line, and plane objects in 3D space.",
    familyId: "three-space-vectors-lines-planes",
    interactionTimingNote: "Stages vector, line, and plane reveals so 3D relations are not introduced all at once.",
    labelLanguageNote: "Names vector, line, plane, axes, and component cues with spatial vocabulary that matches the 3D objects.",
    learningObjective: "Interpret how vectors, lines, and planes encode direction and position in 3D space.",
    mathematicalAccuracyNote: "Confirms vector direction, line trace, and plane surface share one coherent 3D coordinate frame.",
    mathFocus: "3D vector geometry and line-plane relationships",
    reviewerPrompt: "Confirm that learners can distinguish vector direction, line trace, and plane surface.",
    targetBand: "advanced",
    visualModel: "3D coordinate frame with vector, line, and plane objects"
  },
  {
    caseId: "probability-machine-core",
    cognitiveLoadNote: "Uses deterministic random seed evidence and a small set of outcome paths to prevent noisy probability displays.",
    curriculumFitNote: "Fits a secondary probability review because the scene links repeated trials, outcome paths, and stable randomization.",
    familyId: "three-probability-machine",
    interactionTimingNote: "Runs trial paths in readable batches with stable pauses for outcome and probability summaries.",
    labelLanguageNote: "Labels trial path, outcome, probability, and random seed evidence without implying unsupported certainty.",
    learningObjective: "Connect repeated trial paths to empirical probability and expected outcome structure.",
    mathematicalAccuracyNote: "Confirms trial paths, outcome counts, and probability summaries remain tied to the deterministic random seed.",
    mathFocus: "Trial outcomes, probability paths, and stable randomization",
    reviewerPrompt: "Confirm that repeated-trial visual evidence supports probability reasoning instead of decorative randomness.",
    targetBand: "secondary",
    visualModel: "Probability machine with trial paths, outcome probe, and trace"
  },
  {
    caseId: "statistics-distribution-core",
    cognitiveLoadNote: "Separates center, spread, and distribution shape into bound objects so learners do not only see a generic curve.",
    curriculumFitNote: "Fits a secondary statistics review because the scene compares distribution shape, center, spread, and markers.",
    familyId: "three-statistics-distribution",
    interactionTimingNote: "Separates curve-change, center marker, and spread marker beats so distribution comparisons are not simultaneous.",
    labelLanguageNote: "Labels distribution, center, spread, and comparison markers with statistics vocabulary used in the scene.",
    learningObjective: "Compare the center and spread of a distribution using visual landmarks and formula tokens.",
    mathematicalAccuracyNote: "Confirms center, spread, and distribution-shape markers correspond to the same sampled distribution.",
    mathFocus: "Distribution shape, center, spread, and comparison",
    reviewerPrompt: "Confirm that center and spread markers stay legible while the distribution curve changes.",
    targetBand: "secondary",
    visualModel: "Distribution curve with center-spread markers and comparison path"
  },
  {
    caseId: "statistical-inference-core",
    cognitiveLoadNote: "Keeps sampling, interval, and uncertainty cues in one visual chain before introducing interpretation language.",
    curriculumFitNote: "Fits an advanced statistics review because the scene connects sampling variation, interval estimate, and uncertainty.",
    familyId: "three-statistical-inference-lab",
    interactionTimingNote: "Shows sampling movement before interval and uncertainty markers so inference language follows evidence.",
    labelLanguageNote: "Names sample distribution, interval marker, estimate, and uncertainty cues without overstating inference.",
    learningObjective: "Interpret a statistical interval as a sample-based estimate with visible uncertainty.",
    mathematicalAccuracyNote: "Confirms sample distribution, interval marker, estimate, and uncertainty cue describe the same inference state.",
    mathFocus: "Sampling variation, interval estimate, and uncertainty",
    reviewerPrompt: "Confirm that the interval cue is connected to sampling evidence and not presented as a fixed answer.",
    targetBand: "advanced",
    visualModel: "Sample distribution with interval marker and uncertainty path"
  }
] as const satisfies readonly TeachingReviewCaseDefinition[];

export const concreteTeachingReviewCaseIds = concreteTeachingReviewCaseDefinitions.map((definition) => definition.caseId);

function stateForFamily(familyId: ThreeDFamilyId): ThreeDStateSummary {
  return {
    comparison: 5,
    depthValue: 1.4,
    familyId,
    mode: 1,
    primaryValue: 6,
    secondaryValue: 5,
    stateSummary: `family=${familyId};template=function-graph;value=6.000;comparison=5.000;depth=1.400`,
    templateId: "function-graph",
    value: 6
  };
}

export function buildConcreteMathSceneTeachingReviewCases(): MathSceneTeachingReviewCase[] {
  return concreteTeachingReviewCaseDefinitions.map((definition) => {
    const scene = buildMathSceneSpecForThreeDFamily({
      accent: "#22d3ee",
      state: stateForFamily(definition.familyId)
    });

    if (!scene) {
      throw new Error(`Missing MAIS Manim scene spec for ${definition.familyId}`);
    }

    const evidence = buildMathSceneTeachingQualityEvidence(scene);
    const ready = evidence.status === "ready-for-a18-review";

    return {
      ...definition,
      a18FinalHumanReviewRequired: true,
      cameraShotCount: evidence.cameraShotCount,
      controlParameterCount: evidence.controlParameterCount,
      focusedBeatCount: evidence.focusedBeatCount,
      formulaTokenCount: evidence.formulaTokenCount,
      missingTeachingEvidence: evidence.missingTeachingEvidence,
      sceneId: scene.sceneId,
      semanticBindingCount: evidence.semanticBindingCount,
      sourceContract: MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT,
      status: ready ? "a06-confirmed-ready-for-a18-signoff" : "needs-a06-remediation",
      summary: [
        `${definition.caseId}=${ready ? "ready" : "needs-followup"}`,
        `scene=${scene.sceneId}`,
        `focus=${definition.mathFocus}`,
        `beats=${evidence.focusedBeatCount}`,
        `bindings=${evidence.semanticBindingCount}`
      ].join(":")
    };
  });
}

export function mathSceneTeachingReviewCaseDataAttributes(cases: MathSceneTeachingReviewCase[]) {
  const readyCount = cases.filter((reviewCase) => reviewCase.status === "a06-confirmed-ready-for-a18-signoff").length;
  const missingCount = cases.reduce((sum, reviewCase) => sum + reviewCase.missingTeachingEvidence.length, 0);

  return {
    "data-viz-manim-teaching-review-case-count": String(cases.length),
    "data-viz-manim-teaching-review-case-missing-count": String(missingCount),
    "data-viz-manim-teaching-review-case-ready-count": String(readyCount),
    "data-viz-manim-teaching-review-case-source-contract": MATH_SCENE_TEACHING_REVIEW_CASE_SOURCE_CONTRACT,
    "data-viz-manim-teaching-review-case-summary": cases
      .map((reviewCase) => `${reviewCase.caseId}=${reviewCase.status === "a06-confirmed-ready-for-a18-signoff" ? "ready" : "needs-followup"}`)
      .join(";")
  } as const;
}
