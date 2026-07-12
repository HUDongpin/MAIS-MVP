import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2SourceArchitectureHandoffReport,
  mathSceneV2SourceArchitectureHandoffReportDataAttributes,
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT
} from "./mathSceneV2SourceArchitectureHandoffReport";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const openOwnerGateIds = [
  "a11-browser-visual-interaction-regression",
  "a18-a06-teaching-quality-confirmation",
  "a22-clean-release-gate"
] as const;

const requiredOwnerGateIds = [
  "a06-review-package-split",
  ...openOwnerGateIds
] as const;

function reportFixture() {
  return buildMathSceneV2SourceArchitectureHandoffReport({
    checkedAtHkt: "2026-07-03 19:45 HKT",
    crossAgentHandoff: {
      canMarkThreadGoalComplete: false,
      sourceArchitectureAcceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureCanMarkThreadGoalComplete: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: [...openOwnerGateIds],
      sourceArchitectureRequiredOwnerGateIds: [...requiredOwnerGateIds],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice",
      status: "needs-owner-action"
    },
    releaseSliceManifest: {
      fileCount: 401,
      packageCount: 8,
      reviewSliceCount: 20,
      reviewSliceIds: "scene-slice-01,scene-slice-02,evidence-slice-04,integration-slice-01",
      reviewSliceLargestFileCount: 24,
      reviewSliceMaxFilesPerSlice: 24,
      sourceArchitectureAcceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureCanMarkThreadGoalComplete: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: [...openOwnerGateIds],
      sourceArchitectureRequiredOwnerGateIds: [...requiredOwnerGateIds],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice",
      status: "ready-for-a22-clean-slice-review"
    },
    sourceArchitectureHandoff: {
      acceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      bulkCourseGenerationAllowed: false,
      canMarkThreadGoalComplete: false,
      futureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      openOwnerGateIds: [...openOwnerGateIds],
      requiredOwnerGateIds: [...openOwnerGateIds],
      reviewPackageCount: 8,
      reviewSliceCount: 20,
      reviewSliceIds: "scene-slice-01,scene-slice-02,evidence-slice-04,integration-slice-01",
      reviewSliceSummary: "20@24",
      sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      status: "source-architecture-ready-owner-gates-open",
      summary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice"
    }
  });
}

test("MAIS Manim v2 source-architecture report carries current release and cross-agent evidence", () => {
  const report = reportFixture();

  assert.equal(report.sourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT);
  assert.equal(report.status, "current-cross-agent-evidence-attached");
  assert.deepEqual(report.freshnessIssues, []);
  assert.equal(report.checkedAtHkt, "2026-07-03 19:45 HKT");
  assert.equal(report.bulkCourseGenerationAllowed, false);
  assert.equal(report.futureInvocationScope, "one-topic-one-concept-cluster-or-one-review-slice");
  assert.equal(report.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(report.releaseSliceSourceArchitectureStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(report.crossAgentSourceArchitectureStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(report.releaseSliceFileCount, 401);
  assert.equal(report.reviewPackageCount, 8);
  assert.equal(report.reviewSliceCount, 20);
  assert.equal(report.reviewSliceSummary, "20@24");
  assert.deepEqual(report.openOwnerGateIds, [...openOwnerGateIds]);
  assert.deepEqual(report.requiredOwnerGateIds, [...requiredOwnerGateIds]);
  assert.ok(report.acceptanceCriteria.includes("no-bulk-course-generation"));
  assert.match(report.ownerGateRoutingSummary, /A11=browser-visual-interaction-regression/);
  assert.match(report.ownerGateRoutingSummary, /A18\+A06=teaching-quality-confirmation/);
  assert.match(report.ownerGateRoutingSummary, /A22=clean-release-gate/);
  assert.match(report.summary, /reportStatus=current-cross-agent-evidence-attached/);
  assert.match(report.summary, /bulkCourseGeneration=false/);
});

test("MAIS Manim v2 source-architecture report exposes stale release or cross-agent evidence", () => {
  const report = buildMathSceneV2SourceArchitectureHandoffReport({
    ...reportFixture().inputSnapshot,
    releaseSliceManifest: {
      ...reportFixture().inputSnapshot.releaseSliceManifest,
      sourceArchitectureHandoffStatus: "not-attached"
    }
  });

  assert.equal(report.status, "stale-or-mismatched-source-architecture-evidence");
  assert.deepEqual(report.freshnessIssues, ["release-slice-source-architecture-status-mismatch"]);
  assert.match(report.summary, /freshnessIssues=release-slice-source-architecture-status-mismatch/);
});

test("MAIS Manim v2 source-architecture report serializes stable data attributes", () => {
  const report = reportFixture();
  const attributes = mathSceneV2SourceArchitectureHandoffReportDataAttributes(report);

  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-report-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-source-architecture-report-status"], "current-cross-agent-evidence-attached");
  assert.equal(attributes["data-viz-manim-v2-source-architecture-report-bulk-course-generation"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-report-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-report-open-owner-gates"],
    openOwnerGateIds.join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-source-architecture-report-required-owner-gates"],
    requiredOwnerGateIds.join(",")
  );
  assert.equal(attributes["data-viz-manim-v2-source-architecture-report-freshness-issues"], "none");
  assert.equal(attributes["data-viz-manim-v2-source-architecture-report-release-slice-file-count"], "401");
  assert.match(
    attributes["data-viz-manim-v2-source-architecture-report-acceptance-criteria"],
    /no-bulk-course-generation/
  );
});
