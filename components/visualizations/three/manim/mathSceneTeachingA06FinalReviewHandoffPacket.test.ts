import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildMathSceneTeachingA06SourceConfirmationLedger } from "./mathSceneTeachingA06SourceConfirmationLedger";
import {
  buildMathSceneTeachingA06FinalReviewHandoffPacket,
  mathSceneTeachingA06FinalReviewHandoffPacketDataAttributes,
  MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT
} from "./mathSceneTeachingA06FinalReviewHandoffPacket";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
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

function finalReviewFixture() {
  return buildMathSceneTeachingFinalReviewPacket({
    dossier: buildMathSceneTeachingReviewDossier(),
    renderedRoutes: buildMathSceneTeachingRenderedReviewRoutes(
      buildMathSceneTeachingInspectionTargetQueue(),
      renderedReviewLabs
    )
  });
}

function sourceConfirmationFixture() {
  return buildMathSceneTeachingA06SourceConfirmationLedger(
    buildMathSceneTeachingFinalDecisionLedger(finalReviewFixture())
  );
}

function handoffFixture() {
  return buildMathSceneTeachingA06FinalReviewHandoffPacket({
    a18CanonicalReportPath: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
    checkedAtHkt: "2026-07-03 20:15 HKT",
    finalReviewPacket: finalReviewFixture(),
    sourceConfirmationLedger: sourceConfirmationFixture()
  });
}

test("A06 final teaching review handoff packet proves concrete scene source readiness while keeping A18 pending", () => {
  const packet = handoffFixture();

  assert.equal(packet.sourceContract, MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "a06-final-review-handoff-ready-a18-pending");
  assert.equal(packet.canMarkA18GateComplete, false);
  assert.deepEqual(packet.ownerAgentIds, ["A06", "A18"]);
  assert.equal(packet.a18ReviewerAgentId, "A18");
  assert.equal(packet.caseCount, 12);
  assert.equal(packet.readyCaseCount, 12);
  assert.equal(packet.criterionCount, 5);
  assert.equal(packet.decisionCount, 60);
  assert.equal(packet.a06ConfirmedDecisionCount, 60);
  assert.equal(packet.blockedConfirmationCount, 0);
  assert.equal(packet.pendingA18DecisionCount, 60);
  assert.equal(packet.totalProofPointCount, 108);
  assert.equal(packet.readyProofPointCount, 108);
  assert.equal(
    packet.a18CanonicalReportPath,
    "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md"
  );
  assert.deepEqual(packet.requiredA18DecisionCriteria, [
    "curriculum-fit",
    "mathematical-accuracy",
    "cognitive-load",
    "language-and-labels",
    "interaction-timing"
  ]);

  const functionGraph = packet.rows.find((row) => row.caseId === "function-graph-core");
  const angleGeometry = packet.rows.find((row) => row.caseId === "angle-geometry-core");

  assert.ok(functionGraph);
  assert.ok(angleGeometry);
  assert.equal(functionGraph.status, "a06-source-confirmed-a18-pending");
  assert.equal(functionGraph.criterionDecisionCount, 5);
  assert.equal(functionGraph.a06ConfirmedCriterionCount, 5);
  assert.equal(functionGraph.pendingA18CriterionCount, 5);
  assert.equal(functionGraph.readyProofPointCount, 9);
  assert.equal(functionGraph.totalProofPointCount, 9);
  assert.ok(functionGraph.href?.startsWith("/"));
  assert.ok(functionGraph.sectionSelector);
  assert.equal(
    functionGraph.criteriaStatusManifest,
    "curriculum-fit=a06-source-confirmed|pending-a18-review;mathematical-accuracy=a06-source-confirmed|pending-a18-review;cognitive-load=a06-source-confirmed|pending-a18-review;language-and-labels=a06-source-confirmed|pending-a18-review;interaction-timing=a06-source-confirmed|pending-a18-review"
  );
  assert.equal(angleGeometry.labId, "p4-angles");
  assert.match(packet.summary, /a06-final-review-handoff-ready-a18-pending/);
});

test("A06 final teaching review handoff packet blocks missing source confirmations without approving A18", () => {
  const sourceConfirmationLedger = sourceConfirmationFixture();
  const blockedLedger = {
    ...sourceConfirmationLedger,
    blockedConfirmationCount: 5,
    rows: sourceConfirmationLedger.rows.map((row, index) =>
      index === 0
        ? {
            ...row,
            blockedConfirmationCount: 5,
            rowStatus: "blocked-missing-source-evidence" as const
          }
        : row
    ),
    status: "blocked-missing-source-evidence" as const
  };
  const packet = buildMathSceneTeachingA06FinalReviewHandoffPacket({
    a18CanonicalReportPath: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
    checkedAtHkt: "2026-07-03 20:15 HKT",
    finalReviewPacket: finalReviewFixture(),
    sourceConfirmationLedger: blockedLedger
  });

  assert.equal(packet.status, "blocked-a06-source-confirmation-incomplete");
  assert.equal(packet.canMarkA18GateComplete, false);
  assert.equal(packet.readyCaseCount, 11);
  assert.equal(packet.blockedConfirmationCount, 5);
  assert.deepEqual(packet.blockers, ["a06-source-confirmations-incomplete"]);
});

test("A06 final teaching review handoff packet serializes stable A18 handoff attributes", () => {
  const packet = handoffFixture();
  const attributes = mathSceneTeachingA06FinalReviewHandoffPacketDataAttributes(packet);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingA06FinalReviewHandoffPacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-a06-final-review-handoff-source-contract"],
    MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-teaching-a06-final-review-handoff-status"],
    "a06-final-review-handoff-ready-a18-pending"
  );
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-owner-agents"], "A06,A18");
  assert.equal(
    attributes["data-viz-manim-teaching-a06-final-review-handoff-a18-report-path"],
    packet.a18CanonicalReportPath
  );
  assert.equal(
    attributes["data-viz-manim-teaching-a06-final-review-handoff-case-status-manifest"],
    packet.caseStatusManifest
  );
  assert.equal(
    attributes["data-viz-manim-teaching-a06-final-review-handoff-criteria-status-manifest"],
    packet.criteriaStatusManifest
  );
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-decision-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-pending-a18-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-a06-final-review-handoff-blockers"], "none");
});
