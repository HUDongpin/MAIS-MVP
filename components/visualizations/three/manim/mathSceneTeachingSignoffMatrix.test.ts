import assert from "node:assert/strict";
import test from "node:test";
import { buildMathSceneTeachingReviewBrief } from "./mathSceneTeachingReviewBrief";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS,
  buildMathSceneTeachingSignoffMatrix,
  mathSceneTeachingSignoffMatrixDataAttributes,
  MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT
} from "./mathSceneTeachingSignoffMatrix";

test("A18/A06 teaching signoff matrix mirrors every concrete review case and keeps the gate open", () => {
  const brief = buildMathSceneTeachingReviewBrief();
  const matrix = buildMathSceneTeachingSignoffMatrix();
  const rowIds = matrix.rows.map((row) => row.caseId);

  assert.equal(matrix.sourceContract, MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT);
  assert.equal(matrix.gateStatus, "a18-final-signoff-required");
  assert.equal(matrix.caseCount, brief.caseCount);
  assert.equal(matrix.a06ReadyCount, brief.readyCount);
  assert.equal(matrix.pendingA18Count, brief.caseCount);
  assert.equal(matrix.acceptedCount, 0);
  assert.equal(matrix.revisionRequiredCount, 0);
  assert.deepEqual(rowIds, brief.caseIds);
  assert.equal(new Set(rowIds).size, rowIds.length);
  assert.ok(matrix.rows.every((row) => row.a06EvidenceStatus === "a06-confirmed-ready-for-a18-signoff"));
  assert.ok(matrix.rows.every((row) => row.a18SignoffStatus === "pending-a18-review"));
});

test("A18/A06 teaching signoff matrix exposes criteria and required A18 decisions", () => {
  const matrix = buildMathSceneTeachingSignoffMatrix();
  const requiredCriteria = [
    "curriculum-fit",
    "mathematical-accuracy",
    "cognitive-load",
    "language-and-labels",
    "interaction-timing"
  ];

  assert.deepEqual(matrix.requiredCriteria, requiredCriteria);
  assert.deepEqual(matrix.a18RequiredActions, A18_TEACHING_SIGNOFF_REQUIRED_ACTIONS);
  assert.ok(matrix.a18RequiredActions.includes("inspect-rendered-scene"));
  assert.ok(matrix.a18RequiredActions.includes("record-approve-or-revision-decision"));
  assert.ok(matrix.rows.every((row) => row.criteria.length === requiredCriteria.length));
  assert.ok(matrix.rows.every((row) => row.criteria.every((criterion) => criterion.status === "ready-for-a18-check")));
  assert.ok(matrix.rows.every((row) => row.a18RequiredActions === matrix.a18RequiredActions));
});

test("A18/A06 teaching signoff matrix serializes stable evidence attributes", () => {
  const matrix = buildMathSceneTeachingSignoffMatrix();
  const attributes = mathSceneTeachingSignoffMatrixDataAttributes(matrix);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingSignoffMatrix.ts"), "evidence");
  assert.equal(attributes["data-viz-manim-teaching-signoff-source-contract"], MATH_SCENE_TEACHING_SIGNOFF_MATRIX_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-teaching-signoff-gate-status"], "a18-final-signoff-required");
  assert.equal(attributes["data-viz-manim-teaching-signoff-case-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-signoff-pending-a18-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-signoff-accepted-count"], "0");
  assert.match(attributes["data-viz-manim-teaching-signoff-summary"], /function-graph-core=pending-a18-review/);
});
