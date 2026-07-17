import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  type MathSceneTeachingRenderedReviewLabLike
} from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import {
  buildMathSceneTeachingFinalReviewPacket,
  mathSceneTeachingFinalReviewPacketDataAttributes,
  MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT
} from "./mathSceneTeachingFinalReviewPacket";

const renderedReviewLabs: MathSceneTeachingRenderedReviewLabLike[] = [
  { curriculumTrack: "HK", grade: "P1", labId: "p1-number-line", threeD: { enabled: true, familyId: "three-number-line" } },
  { curriculumTrack: "HK", grade: "P2", labId: "p2-fractions", threeD: { enabled: true, familyId: "three-fraction-slices" } },
  { curriculumTrack: "HK", grade: "P4", labId: "p4-angles", threeD: { enabled: true, familyId: "three-angle-geometry" } },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-function-graph", threeD: { enabled: true, familyId: "three-function-graph" } },
  { curriculumTrack: "HK", grade: "S4", labId: "s4-function-family", threeD: { enabled: true, familyId: "three-function-family" } },
  { curriculumTrack: "HK", grade: "S4", labId: "s4-trig-wave", threeD: { enabled: true, familyId: "three-trig-unit-wave" } },
  { curriculumTrack: "HK", grade: "S6", labId: "s6-calculus-rate-area", threeD: { enabled: true, familyId: "three-calculus-rate-area" } },
  {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade: "S5",
    labId: "pep-high-s5-conics",
    threeD: { enabled: true, familyId: "three-conic-sections-deep", premiumLaunch: true }
  },
  {
    curriculumTrack: "MAINLAND_PEP_HIGH",
    grade: "S5",
    labId: "pep-high-s5-space-vectors",
    threeD: { enabled: true, familyId: "three-space-vectors-lines-planes", premiumLaunch: true }
  },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-probability-machine", threeD: { enabled: true, familyId: "three-probability-machine" } },
  { curriculumTrack: "HK", grade: "S3", labId: "s3-statistics-distribution", threeD: { enabled: true, familyId: "three-statistics-distribution" } },
  {
    curriculumTrack: "US",
    grade: "S6",
    labId: "us-ca-math-s6-chapter-03",
    threeD: { enabled: true, familyId: "three-statistical-inference-lab", premiumLaunch: true }
  }
];

function finalReviewFixture() {
  return buildMathSceneTeachingFinalReviewPacket({
    dossier: buildMathSceneTeachingReviewDossier(),
    renderedRoutes: buildMathSceneTeachingRenderedReviewRoutes(
      buildMathSceneTeachingInspectionTargetQueue(),
      renderedReviewLabs
    )
  });
}

const expectedInteractionTimingNotes = {
  "angle-geometry-core":
    "Moves the rotating ray before highlighting the arc and bisector so angle measure is read as motion.",
  "calculus-rate-area-core":
    "Sequences tangent-rate and area-accumulation beats separately before showing their shared probe.",
  "conic-section-core":
    "Introduces cone and slicing plane before camera detail on the intersection curve.",
  "fraction-slices-core":
    "Reveals whole boundary before selected slice so part-whole language lands before denominator emphasis.",
  "function-family-core":
    "Updates comparison curve after primary curve is established so parameter changes remain attributable.",
  "function-graph-core":
    "Sweeps the input probe at a steady pace while highlighting the matching formula token and graph point.",
  "number-line-core":
    "Keeps value probe motion stepwise enough for learners to track each jump before comparison distance appears.",
  "probability-machine-core":
    "Runs trial paths in readable batches with stable pauses for outcome and probability summaries.",
  "space-vectors-core":
    "Stages vector, line, and plane reveals so 3D relations are not introduced all at once.",
  "statistical-inference-core":
    "Shows sampling movement before interval and uncertainty markers so inference language follows evidence.",
  "statistics-distribution-core":
    "Separates curve-change, center marker, and spread marker beats so distribution comparisons are not simultaneous.",
  "trig-unit-wave-core":
    "Synchronizes circle point and wave marker timing so periodic correspondence is visible without racing."
} as const;

const expectedCurriculumFitNotes = {
  "angle-geometry-core":
    "Fits a middle-school geometry review because the scene centers angle measure, reference rays, and bisectors.",
  "calculus-rate-area-core":
    "Fits an advanced calculus review because it separates derivative-as-rate from integral-as-area before connecting them.",
  "conic-section-core":
    "Fits an advanced geometry review because the scene ties cone, slicing plane, and conic curve in one model.",
  "fraction-slices-core":
    "Fits a primary fractions review because the scene keeps whole-part structure and denominator language visible.",
  "function-family-core":
    "Fits a secondary functions review because the scene compares parameter-driven curve behavior with a shared probe.",
  "function-graph-core":
    "Fits a secondary functions review because the scene connects rule, input-output point, and graph shape.",
  "number-line-core":
    "Fits a primary number-line review because the scene focuses on value location, unit interval, and distance comparison.",
  "probability-machine-core":
    "Fits a secondary probability review because the scene links repeated trials, outcome paths, and stable randomization.",
  "space-vectors-core":
    "Fits an advanced vector geometry review because the scene uses vector, line, and plane objects in 3D space.",
  "statistical-inference-core":
    "Fits an advanced statistics review because the scene connects sampling variation, interval estimate, and uncertainty.",
  "statistics-distribution-core":
    "Fits a secondary statistics review because the scene compares distribution shape, center, spread, and markers.",
  "trig-unit-wave-core":
    "Fits a secondary trigonometry review because the scene binds unit-circle motion to wave behavior."
} as const;

const expectedMathematicalAccuracyNotes = {
  "angle-geometry-core":
    "Confirms base ray, rotating ray, angle arc, and bisector represent the same measured angle.",
  "calculus-rate-area-core":
    "Confirms tangent-rate and accumulation-area cues are mathematically distinct before being linked by the shared probe.",
  "conic-section-core":
    "Confirms the highlighted curve is the intersection of the cone surface and slicing plane.",
  "fraction-slices-core":
    "Confirms selected slice count, denominator meaning, and whole boundary preserve unit-fraction structure.",
  "function-family-core":
    "Confirms primary and comparison curves reflect the intended parameter change with a shared probe value.",
  "function-graph-core":
    "Confirms each graph point is generated from the displayed function rule and input value.",
  "number-line-core":
    "Confirms value, unit interval, and jump distance use one consistent number-line scale.",
  "probability-machine-core":
    "Confirms trial paths, outcome counts, and probability summaries remain tied to the deterministic random seed.",
  "space-vectors-core":
    "Confirms vector direction, line trace, and plane surface share one coherent 3D coordinate frame.",
  "statistical-inference-core":
    "Confirms sample distribution, interval marker, estimate, and uncertainty cue describe the same inference state.",
  "statistics-distribution-core":
    "Confirms center, spread, and distribution-shape markers correspond to the same sampled distribution.",
  "trig-unit-wave-core":
    "Confirms unit-circle position and wave marker encode the same periodic angle state."
} as const;

test("A18/A06 final review packet joins every routed scene with proof points without closing decisions", () => {
  const packet = finalReviewFixture();

  assert.equal(packet.sourceContract, MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "ready-for-a18-final-rendered-review");
  assert.equal(packet.caseCount, 12);
  assert.equal(packet.renderedRouteReadyCount, 12);
  assert.equal(packet.blockedRowCount, 0);
  assert.equal(packet.pendingA18DecisionCount, 12);
  assert.equal(packet.readyProofPointCount, 108);
  assert.equal(packet.totalProofPointCount, 108);
  assert.deepEqual(packet.missingCaseIds, []);
  assert.ok(packet.rows.every((row) => row.a18FinalDecisionStatus === "pending-a18-review"));
  assert.ok(packet.rows.every((row) => row.href));
  assert.ok(packet.rows.every((row) => row.sectionSelector));
  assert.ok(packet.rows.every((row) => row.proofPointIds.length === 9));
});

test("A18/A06 final review packet gives reviewers executable browser and teaching checks", () => {
  const packet = finalReviewFixture();
  const rowsByCaseId = Object.fromEntries(packet.rows.map((row) => [row.caseId, row]));
  const functionGraph = rowsByCaseId["function-graph-core"];
  const angleGeometry = rowsByCaseId["angle-geometry-core"];

  assert.ok(functionGraph);
  assert.ok(angleGeometry);
  assert.equal(angleGeometry.labId, "p4-angles");
  assert.equal(angleGeometry.routeStatus, "ready-for-a18-browser-review");
  assert.ok(functionGraph.reviewSteps.includes("open-rendered-review-route"));
  assert.ok(functionGraph.reviewSteps.includes("verify-formula-bindings"));
  assert.ok(functionGraph.reviewSteps.includes("verify-camera-and-timeline"));
  assert.ok(functionGraph.reviewSteps.includes("confirm-curriculum-fit"));
  assert.ok(functionGraph.reviewSteps.includes("confirm-mathematical-accuracy"));
  assert.ok(functionGraph.reviewSteps.includes("confirm-cognitive-load"));
  assert.ok(functionGraph.reviewSteps.includes("record-approve-or-revision-decision"));
  assert.ok(functionGraph.renderedSceneSelectors.includes("data-viz-family-id"));
  assert.ok(functionGraph.sourceEvidenceAttributes.includes("data-viz-manim-teaching-signoff-gate-status"));
});

test("A18/A06 final review packet serializes stable review handoff attributes", () => {
  const dossier = buildMathSceneTeachingReviewDossier();
  const packet = finalReviewFixture();
  const attributes = mathSceneTeachingFinalReviewPacketDataAttributes(packet);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingFinalReviewPacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-source-contract"],
    MATH_SCENE_TEACHING_FINAL_REVIEW_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-final-review-status"], "ready-for-a18-final-rendered-review");
  assert.equal(attributes["data-viz-manim-teaching-final-review-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-final-review-route-ready-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-final-review-pending-a18-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-final-review-blocked-count"], "0");
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-proof-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=proofPoints:${row.readyProofPointCount}/${row.totalProofPointCount}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-decision-step-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=confirm-curriculum-fit|confirm-mathematical-accuracy|confirm-cognitive-load|confirm-language-and-labels|confirm-interaction-timing|record-approve-or-revision-decision`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-route-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${row.href ?? "missing-route"}|${row.sectionSelector ?? "missing-section"}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-selector-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${row.renderedSceneSelectors.join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-source-evidence-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${row.sourceEvidenceAttributes.join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-learning-objective-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${row.learningObjective}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-reviewer-prompt-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${row.reviewerPrompt}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-cognitive-load-manifest"],
    dossier.rows
      .map((row) => `${row.caseId}=${row.cognitiveLoadNote}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-math-focus-manifest"],
    dossier.rows
      .map((row) => `${row.caseId}=${row.mathFocus}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-visual-model-manifest"],
    dossier.rows
      .map((row) => `${row.caseId}=${row.visualModel}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-label-language-manifest"],
    dossier.rows
      .map((row) => `${row.caseId}=${row.labelLanguageNote}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-interaction-timing-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${expectedInteractionTimingNotes[row.caseId]}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-curriculum-fit-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${expectedCurriculumFitNotes[row.caseId]}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-review-case-mathematical-accuracy-manifest"],
    packet.rows
      .map((row) => `${row.caseId}=${expectedMathematicalAccuracyNotes[row.caseId]}`)
      .join(";")
  );
  assert.match(attributes["data-viz-manim-teaching-final-review-summary"], /angle-geometry-core=p4-angles/);
  assert.match(attributes["data-viz-manim-teaching-final-review-summary"], /function-graph-core=/);
});
