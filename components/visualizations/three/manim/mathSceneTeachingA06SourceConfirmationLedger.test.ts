import assert from "node:assert/strict";
import test from "node:test";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  type MathSceneTeachingRenderedReviewLabLike
} from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import {
  buildMathSceneTeachingA06SourceConfirmationLedger,
  mathSceneTeachingA06SourceConfirmationLedgerDataAttributes,
  MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT
} from "./mathSceneTeachingA06SourceConfirmationLedger";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

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

function finalDecisionLedgerFixture() {
  const finalReviewPacket = buildMathSceneTeachingFinalReviewPacket({
    dossier: buildMathSceneTeachingReviewDossier(),
    renderedRoutes: buildMathSceneTeachingRenderedReviewRoutes(
      buildMathSceneTeachingInspectionTargetQueue(),
      renderedReviewLabs
    )
  });

  return buildMathSceneTeachingFinalDecisionLedger(finalReviewPacket);
}

function sourceConfirmationFixture() {
  return buildMathSceneTeachingA06SourceConfirmationLedger(finalDecisionLedgerFixture());
}

test("A06 source confirmation ledger records source-ready evidence for every A18 criterion decision", () => {
  const ledger = sourceConfirmationFixture();
  const functionGraph = ledger.rows.find((row) => row.caseId === "function-graph-core");
  const angleGeometry = ledger.rows.find((row) => row.caseId === "angle-geometry-core");

  assert.equal(ledger.sourceContract, MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT);
  assert.equal(ledger.status, "a06-source-confirmed-a18-pending");
  assert.equal(ledger.caseCount, 12);
  assert.equal(ledger.criterionCount, 5);
  assert.equal(ledger.confirmationCount, 60);
  assert.equal(ledger.a06ConfirmedDecisionCount, 60);
  assert.equal(ledger.blockedConfirmationCount, 0);
  assert.equal(ledger.pendingA18DecisionCount, 60);
  assert.equal(ledger.canMarkA18GateComplete, false);
  assert.deepEqual(ledger.requiredCriteria, [
    "curriculum-fit",
    "mathematical-accuracy",
    "cognitive-load",
    "language-and-labels",
    "interaction-timing"
  ]);

  assert.ok(functionGraph);
  assert.ok(angleGeometry);
  assert.equal(functionGraph.confirmations.length, 5);
  assert.equal(functionGraph.rowStatus, "a06-source-confirmed-a18-pending");
  assert.equal(angleGeometry.labId, "p4-angles");
  assert.ok(functionGraph.confirmations.every((confirmation) => confirmation.a06SourceStatus === "a06-source-confirmed"));
  assert.ok(functionGraph.confirmations.every((confirmation) => confirmation.a18DecisionStatus === "pending-a18-review"));
  assert.ok(functionGraph.confirmations.every((confirmation) => confirmation.canReplaceA18Decision === false));
  assert.ok(functionGraph.confirmations.every((confirmation) => confirmation.proofPointIds.length === 9));
  assert.ok(functionGraph.confirmations.some((confirmation) => confirmation.criterion === "cognitive-load"));
});

test("A06 source confirmation ledger blocks null rendered routes without replacing A18 review", () => {
  const finalDecisionLedger = finalDecisionLedgerFixture();
  const blockedDecisionLedger = {
    ...finalDecisionLedger,
    rows: finalDecisionLedger.rows.map((row, index) =>
      index === 0
        ? {
            ...row,
            href: null,
            sectionSelector: null,
            decisions: row.decisions.map((decision) => ({
              ...decision,
              href: null,
              sectionSelector: null
            }))
          }
        : row
    )
  };
  const ledger = buildMathSceneTeachingA06SourceConfirmationLedger(blockedDecisionLedger);
  const blockedRow = ledger.rows[0];

  assert.equal(ledger.status, "blocked-missing-source-evidence");
  assert.equal(ledger.blockedConfirmationCount, 5);
  assert.equal(blockedRow.rowStatus, "blocked-missing-source-evidence");
  assert.ok(blockedRow.confirmations.every((confirmation) => confirmation.a06SourceStatus === "blocked-missing-source-evidence"));
  assert.ok(blockedRow.confirmations.every((confirmation) => confirmation.canReplaceA18Decision === false));
  assert.ok(blockedRow.confirmations.every((confirmation) => confirmation.a06EvidenceChecks.includes("missing-rendered-route")));
  assert.ok(blockedRow.confirmations.every((confirmation) => confirmation.a06EvidenceChecks.includes("missing-section-selector")));
});

test("A06 source confirmation ledger serializes stable handoff attributes without closing A18", () => {
  const ledger = sourceConfirmationFixture();
  const attributes = mathSceneTeachingA06SourceConfirmationLedgerDataAttributes(ledger);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingA06SourceConfirmationLedger.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-a06-source-confirmation-source-contract"],
    MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-a06-source-confirmation-status"], "a06-source-confirmed-a18-pending");
  assert.equal(attributes["data-viz-manim-teaching-a06-source-confirmation-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-a06-source-confirmation-confirmed-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-a06-source-confirmation-pending-a18-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-a06-source-confirmation-can-complete"], "false");
  assert.match(
    attributes["data-viz-manim-teaching-a06-source-confirmation-summary"],
    /function-graph-core=5\/5-a06-confirmed/
  );
});
