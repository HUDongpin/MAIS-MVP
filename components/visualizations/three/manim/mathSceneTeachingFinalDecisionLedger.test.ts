import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildMathSceneTeachingFinalDecisionLedger,
  mathSceneTeachingFinalDecisionLedgerDataAttributes,
  MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT
} from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  type MathSceneTeachingRenderedReviewLabLike
} from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";

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

function decisionLedgerFixture() {
  return buildMathSceneTeachingFinalDecisionLedger(
    buildMathSceneTeachingFinalReviewPacket({
      dossier: buildMathSceneTeachingReviewDossier(),
      renderedRoutes: buildMathSceneTeachingRenderedReviewRoutes(
        buildMathSceneTeachingInspectionTargetQueue(),
        renderedReviewLabs
      )
    })
  );
}

test("A18 final decision ledger expands every review case into pending criterion decisions", () => {
  const ledger = decisionLedgerFixture();

  assert.equal(ledger.sourceContract, MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT);
  assert.equal(ledger.status, "pending-a18-final-decisions");
  assert.equal(ledger.caseCount, 12);
  assert.equal(ledger.criterionCount, 5);
  assert.equal(ledger.decisionCount, 60);
  assert.equal(ledger.pendingDecisionCount, 60);
  assert.equal(ledger.approvedDecisionCount, 0);
  assert.equal(ledger.revisionDecisionCount, 0);
  assert.equal(ledger.blockedDecisionCount, 0);
  assert.equal(ledger.readyCaseCount, 12);
  assert.equal(ledger.blockedCaseCount, 0);
  assert.equal(ledger.canMarkA18GateComplete, false);
  assert.deepEqual(ledger.requiredCriteria, [
    "curriculum-fit",
    "mathematical-accuracy",
    "cognitive-load",
    "language-and-labels",
    "interaction-timing"
  ]);
});

test("A18 final decision ledger preserves route and proof evidence for every criterion", () => {
  const ledger = decisionLedgerFixture();
  const rowsByCaseId = Object.fromEntries(ledger.rows.map((row) => [row.caseId, row]));
  const functionGraph = rowsByCaseId["function-graph-core"];
  const angleGeometry = rowsByCaseId["angle-geometry-core"];

  assert.ok(functionGraph);
  assert.ok(angleGeometry);
  assert.equal(functionGraph.decisions.length, 5);
  assert.equal(angleGeometry.labId, "p4-angles");
  assert.equal(angleGeometry.href, "/visualization-lab?grade=P4&track=HK&lab=p4-angles");
  assert.equal(angleGeometry.rowStatus, "pending-a18-final-decisions");
  assert.ok(functionGraph.decisions.every((decision) => decision.status === "pending-a18-review"));
  assert.ok(functionGraph.decisions.every((decision) => decision.href === functionGraph.href));
  assert.ok(functionGraph.decisions.every((decision) => decision.proofPointIds.length === 9));
  assert.ok(functionGraph.decisions.some((decision) => decision.criterion === "curriculum-fit"));
  assert.ok(functionGraph.decisions.some((decision) => decision.reviewStep === "confirm-cognitive-load"));
});

test("A18 final decision ledger serializes stable handoff attributes without closing the gate", () => {
  const ledger = decisionLedgerFixture();
  const attributes = mathSceneTeachingFinalDecisionLedgerDataAttributes(ledger);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingFinalDecisionLedger.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-source-contract"],
    MATH_SCENE_TEACHING_FINAL_DECISION_LEDGER_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-final-decision-status"], "pending-a18-final-decisions");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-decision-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-pending-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-review-step-manifest"],
    ledger.rows
      .flatMap((row) =>
        row.decisions.map((decision) => `${decision.caseId}:${decision.criterion}=${decision.reviewStep}|${decision.status}`)
      )
      .join(";")
  );
  assert.match(attributes["data-viz-manim-teaching-final-decision-summary"], /function-graph-core=5\/5-pending/);
  assert.match(attributes["data-viz-manim-teaching-final-decision-summary"], /angle-geometry-core=5\/5-pending/);
});

test("A18 final decision ledger exposes a canonical record template manifest for reviewer intake", () => {
  const ledger = decisionLedgerFixture();
  const attributes = mathSceneTeachingFinalDecisionLedgerDataAttributes(ledger);

  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-record-template-manifest"],
    ledger.rows
      .flatMap((row) =>
        row.decisions.map(
          (decision) =>
            `${decision.caseId}:${decision.criterion}=reviewer:A18|status:${decision.status}|revisionNote:`
        )
      )
      .join(";")
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-record-template-manifest"],
    /function-graph-core:curriculum-fit=reviewer:A18\|status:pending-a18-review\|revisionNote:/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-record-template-manifest"],
    /angle-geometry-core:interaction-timing=reviewer:A18\|status:pending-a18-review\|revisionNote:/
  );
});
