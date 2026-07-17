import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildMathSceneTeachingInspectionTargetQueue,
  MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS,
  MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES
} from "./mathSceneTeachingInspectionTargets";
import { MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT } from "./mathSceneTeachingQuality";
import {
  buildMathSceneTeachingReviewDossier,
  mathSceneTeachingReviewDossierDataAttributes,
  MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS,
  MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT
} from "./mathSceneTeachingReviewDossier";

test("A18/A06 teaching review dossier mirrors every inspection target with source quality evidence", () => {
  const inspectionQueue = buildMathSceneTeachingInspectionTargetQueue();
  const dossier = buildMathSceneTeachingReviewDossier();

  assert.equal(dossier.sourceContract, MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT);
  assert.equal(dossier.status, "a18-final-review-dossier-ready");
  assert.equal(dossier.caseCount, inspectionQueue.targetCount);
  assert.equal(dossier.sceneCount, inspectionQueue.targetCount);
  assert.equal(dossier.pendingA18Count, inspectionQueue.pendingA18Count);
  assert.equal(dossier.readySceneCount, inspectionQueue.readyForA18RenderedSceneReviewCount);
  assert.equal(dossier.readyProofPointCount, inspectionQueue.targetCount * MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS.length);
  assert.deepEqual(dossier.caseIds, inspectionQueue.targetIds);
  assert.deepEqual(dossier.rows.map((row) => row.familyId), inspectionQueue.targets.map((target) => target.familyId));
  assert.deepEqual(dossier.rows.map((row) => row.sceneId), inspectionQueue.targets.map((target) => target.sceneId));
  assert.ok(dossier.rows.every((row) => row.a06ReviewEvidenceStatus === "a06-source-evidence-ready"));
  assert.ok(dossier.rows.every((row) => row.a18FinalDecisionStatus === "pending-a18-review"));
  assert.ok(dossier.rows.every((row) => row.qualityEvidence.readyForA18Review));
  assert.ok(dossier.rows.every((row) => row.qualityEvidence.sourceContract === MATH_SCENE_TEACHING_QUALITY_SOURCE_CONTRACT));
});

test("A18/A06 teaching review dossier exposes proof points and keeps human decisions pending", () => {
  const dossier = buildMathSceneTeachingReviewDossier();
  const functionGraphRow = dossier.rows.find((row) => row.caseId === "function-graph-core");

  assert.ok(functionGraphRow);
  assert.deepEqual(functionGraphRow.proofPoints.map((proofPoint) => proofPoint.id), MATH_SCENE_TEACHING_REVIEW_DOSSIER_PROOF_POINT_IDS);
  assert.ok(functionGraphRow.proofPoints.every((proofPoint) => proofPoint.status === "ready-for-a18-check"));
  assert.ok(functionGraphRow.proofPoints.every((proofPoint) => proofPoint.evidenceSummary.length > 0));
  assert.deepEqual(functionGraphRow.renderedSceneSelectors, MATH_SCENE_TEACHING_INSPECTION_REQUIRED_RENDERED_SELECTORS);
  assert.deepEqual(functionGraphRow.sourceEvidenceAttributes, MATH_SCENE_TEACHING_INSPECTION_SOURCE_EVIDENCE_ATTRIBUTES);
  assert.deepEqual(functionGraphRow.manualDecisionChecklist, [
    "curriculum-fit",
    "mathematical-accuracy",
    "cognitive-load",
    "language-and-labels",
    "interaction-timing"
  ]);
  assert.equal(functionGraphRow.humanReviewerMustInspectRenderedScene, true);
  assert.equal(functionGraphRow.a18FinalDecisionRequired, true);
  assert.equal(Object.hasOwn(functionGraphRow, "href"), false);
  assert.equal(Object.hasOwn(functionGraphRow, "routeHref"), false);
});

test("A18/A06 teaching review dossier serializes stable evidence attributes", () => {
  const dossier = buildMathSceneTeachingReviewDossier();
  const attributes = mathSceneTeachingReviewDossierDataAttributes(dossier);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingReviewDossier.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-dossier-source-contract"],
    MATH_SCENE_TEACHING_REVIEW_DOSSIER_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-dossier-status"], "a18-final-review-dossier-ready");
  assert.equal(attributes["data-viz-manim-teaching-dossier-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-dossier-pending-a18-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-dossier-ready-proof-point-count"], "108");
  assert.match(attributes["data-viz-manim-teaching-dossier-summary"], /function-graph-core=pending-a18-review/);
  assert.match(attributes["data-viz-manim-teaching-dossier-proof-point-summary"], /function-graph-core=9\/9/);
});
