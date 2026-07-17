import assert from "node:assert/strict";
import test from "node:test";
import { visualizationLabSectionId, visualizationLabSectionSelector } from "../../visualizationDiagnostics";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  mathSceneTeachingRenderedReviewRouteDataAttributes,
  type MathSceneTeachingRenderedReviewLabLike,
  MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT
} from "./mathSceneTeachingRenderedReviewRoutes";

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

function renderedReviewRouteFixture() {
  return buildMathSceneTeachingRenderedReviewRoutes(
    buildMathSceneTeachingInspectionTargetQueue(),
    renderedReviewLabs
  );
}

test("A18/A06 rendered review routes make every concrete teaching case browser-inspectable", () => {
  const packet = renderedReviewRouteFixture();

  assert.equal(packet.sourceContract, MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT);
  assert.equal(packet.status, "ready-for-a18-browser-review");
  assert.equal(packet.targetCount, 12);
  assert.equal(packet.routableTargetCount, 12);
  assert.equal(packet.missingRouteCount, 0);
  assert.equal(packet.pendingA18Count, 12);
  assert.deepEqual(packet.missingCaseIds, []);

  for (const row of packet.rows) {
    assert.equal(row.routeStatus, "ready-for-a18-browser-review");
    assert.ok(row.href);
    assert.ok(row.labId);
    assert.equal(row.sectionId, visualizationLabSectionId(row.labId));
    assert.equal(row.sectionSelector, visualizationLabSectionSelector(row.labId));
    assert.ok(row.renderedSceneSelectors.includes("data-viz-family-id"));
    assert.ok(row.renderedSceneSelectors.includes("data-viz-scene-id"));
    assert.ok(row.sourceEvidenceAttributes.includes("data-viz-manim-teaching-signoff-gate-status"));
    assert.ok(row.manualReviewProtocol.includes("record-a18-approve-or-revision-decision"));
  }
});

test("A18/A06 rendered review routes pick concrete labs for previously sensitive scene families", () => {
  const rowsByCaseId = Object.fromEntries(
    renderedReviewRouteFixture().rows.map((row) => [row.caseId, row])
  );

  assert.equal(rowsByCaseId["angle-geometry-core"].familyId, "three-angle-geometry");
  assert.equal(rowsByCaseId["angle-geometry-core"].labId, "p4-angles");
  assert.match(rowsByCaseId["angle-geometry-core"].href ?? "", /^\/visualization-lab\?/);
  assert.match(rowsByCaseId["angle-geometry-core"].href ?? "", /track=HK/);
  assert.match(rowsByCaseId["angle-geometry-core"].href ?? "", /lab=p4-angles/);

  assert.equal(rowsByCaseId["conic-section-core"].labId, "pep-high-s5-conics");
  assert.match(rowsByCaseId["conic-section-core"].href ?? "", /^\/student\/tools\/visualizations\/pep-high-s5-conics\?/);

  assert.equal(rowsByCaseId["statistical-inference-core"].labId, "us-ca-math-s6-chapter-03");
  assert.match(rowsByCaseId["statistical-inference-core"].href ?? "", /^\/student\/tools\/visualizations\/us-ca-math-s6-chapter-03\?/);
});

test("A18/A06 rendered review routes serialize stable handoff attributes", () => {
  const attributes = mathSceneTeachingRenderedReviewRouteDataAttributes(renderedReviewRouteFixture());

  assert.equal(classifyManimReviewPackage("mathSceneTeachingRenderedReviewRoutes.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-teaching-rendered-review-route-source-contract"],
    MATH_SCENE_TEACHING_RENDERED_REVIEW_ROUTE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-teaching-rendered-review-route-status"], "ready-for-a18-browser-review");
  assert.equal(attributes["data-viz-manim-teaching-rendered-review-route-target-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-rendered-review-route-routable-count"], "12");
  assert.equal(attributes["data-viz-manim-teaching-rendered-review-route-missing-count"], "0");
  assert.match(attributes["data-viz-manim-teaching-rendered-review-route-summary"], /angle-geometry-core=p4-angles/);
});
