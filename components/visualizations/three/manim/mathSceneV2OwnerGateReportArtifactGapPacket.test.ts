import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2OwnerGateReportArtifactGapPacket,
  mathSceneV2OwnerGateReportArtifactGapPacketDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateReportArtifactGapPacket";
import {
  type MathSceneV2OwnerGateTranscriptReadinessPacket,
  type MathSceneV2OwnerGateTranscriptReadinessRow,
  MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateTranscriptReadinessPacket";

const ownerPaths = {
  A11: "coordination/reports/2026-07-03-A11-manim-v2-browser-visual-interaction-regression.md",
  A18: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
  A22: "coordination/reports/2026-07-03-A22-manim-v2-clean-release-gate.md"
} as const;

function readinessRow({
  canonicalReportPath,
  gateId,
  ownerAgentId,
  rowEvidenceId
}: {
  canonicalReportPath: string;
  gateId: string;
  ownerAgentId: string;
  rowEvidenceId: string;
}): MathSceneV2OwnerGateTranscriptReadinessRow {
  return {
    canonicalReportPath,
    gateId,
    kind: ownerAgentId === "A18" ? "teaching-route-review" : ownerAgentId === "A22" ? "release-command" : "browser-regression-command",
    ownerAgentId,
    requestEvidenceId: `request-${rowEvidenceId}`,
    requiredReadinessFields: ["canonicalReportPath", "ownerAgentId", "rowEvidenceId"],
    requiredTranscriptFields: ["ownerAgentId", "rowEvidenceId"],
    rowEvidenceId,
    status: "ready-for-owner-transcript",
    summary: `${ownerAgentId}:${gateId}:${rowEvidenceId}:reportPath=${canonicalReportPath}`,
    transcriptTemplateEvidenceId: `pending-${rowEvidenceId}-template`
  };
}

function readinessPacketFixture(): MathSceneV2OwnerGateTranscriptReadinessPacket {
  const rows = [
    readinessRow({
      canonicalReportPath: ownerPaths.A11,
      gateId: "a11-browser-visual-interaction-regression",
      ownerAgentId: "A11",
      rowEvidenceId: "a11-manim-v2-browser-regression-rerun"
    }),
    readinessRow({
      canonicalReportPath: ownerPaths.A18,
      gateId: "a18-a06-teaching-quality-confirmation",
      ownerAgentId: "A18",
      rowEvidenceId: "a18-manim-v2-rendered-route-review"
    }),
    readinessRow({
      canonicalReportPath: ownerPaths.A22,
      gateId: "a22-clean-release-gate",
      ownerAgentId: "A22",
      rowEvidenceId: "a22-manim-v2-clean-release-preflight-rerun"
    })
  ];

  return {
    a18TeachingCanonicalReportPath: ownerPaths.A18,
    a18TeachingCaseCount: 12,
    a18TeachingDecisionCount: 60,
    a18TeachingHandoffStatus: "a06-final-review-handoff-ready-a18-pending",
    a18TeachingPendingDecisionCount: 60,
    a18TeachingReadyCaseCount: 12,
    a18TeachingReadyProofPointCount: 108,
    a18TeachingTotalProofPointCount: 108,
    blockers: [],
    bulkCourseGenerationAllowed: false,
    canMarkThreadGoalComplete: false,
    canonicalReportPathManifest: rows.map((row) => `${row.rowEvidenceId}=${row.canonicalReportPath}`).join(";"),
    checkedAtHkt: "2026-07-03 20:20 HKT",
    commandReadinessRowCount: 2,
    futureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
    openOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerPacketCount: 3,
    ownerPackets: rows.map((row) => ({
      canonicalReportPaths: [row.canonicalReportPath],
      commandReadinessRowCount: row.ownerAgentId === "A18" ? 0 : 1,
      gateId: row.gateId,
      ownerAgentId: row.ownerAgentId,
      readinessRowCount: 1,
      routeReviewReadinessRowCount: row.ownerAgentId === "A18" ? 1 : 0,
      rows: [row],
      status: "ready-for-owner-transcript",
      summary: `${row.ownerAgentId}:${row.gateId}:rows=1:reports=${row.canonicalReportPath}`
    })),
    ownerStatusManifest: "A11=ready-for-owner-transcript;A18=ready-for-owner-transcript;A22=ready-for-owner-transcript",
    parallelOwnerGateMode: "A11+A18+A22",
    reportDate: "2026-07-03",
    requiredReadinessFieldManifest: rows.map((row) => `${row.rowEvidenceId}=canonicalReportPath|ownerAgentId|rowEvidenceId`).join(";"),
    routeReviewReadinessRowCount: 1,
    sourceArchitectureReady: true,
    sourceArchitectureReportStatus: "current-cross-agent-evidence-attached",
    sourceContract: MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT,
    status: "ready-for-parallel-owner-gate-transcripts",
    summary: "mathSceneV2OwnerGateTranscriptReadinessPacket:status=ready-for-parallel-owner-gate-transcripts:owners=A11,A18,A22",
    totalReadinessRowCount: 3,
    transcriptRequestReady: true,
    transcriptRequestStatus: "pending-owner-transcripts"
  };
}

test("MAIS Manim v2 owner gate report artifact gap packet records missing A11, A18, and A22 canonical reports", () => {
  const packet = buildMathSceneV2OwnerGateReportArtifactGapPacket({
    checkedAtHkt: "2026-07-03 20:20 HKT",
    observedArtifacts: [],
    readinessPacket: readinessPacketFixture()
  });

  assert.equal(packet.sourceContract, MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "blocked-missing-owner-report-artifacts");
  assert.equal(packet.readyForOwnerReportIntake, false);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.requiredReportArtifactCount, 3);
  assert.equal(packet.missingReportArtifactCount, 3);
  assert.equal(packet.presentReportArtifactCount, 0);
  assert.deepEqual(packet.missingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(packet.requiredOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.missingReportPathManifest, `A11=${ownerPaths.A11};A18=${ownerPaths.A18};A22=${ownerPaths.A22}`);
  assert.equal(packet.presentReportPathManifest, "none");
  assert.equal(packet.rows.every((row) => row.artifactStatus === "missing"), true);
  assert.equal(packet.rows.every((row) => row.requiredOwnerAction === "submit-owner-report-artifact"), true);
  assert.match(packet.summary, /missing=3/);
  assert.match(packet.summary, /readyForOwnerReportIntake=false/);
});

test("MAIS Manim v2 owner gate report artifact gap packet clears artifact gaps only when all canonical reports exist", () => {
  const packet = buildMathSceneV2OwnerGateReportArtifactGapPacket({
    checkedAtHkt: "2026-07-03 20:20 HKT",
    observedArtifacts: Object.values(ownerPaths).map((path) => ({ exists: true, path })),
    readinessPacket: readinessPacketFixture()
  });

  assert.equal(packet.status, "ready-for-owner-report-intake");
  assert.equal(packet.readyForOwnerReportIntake, true);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.missingReportArtifactCount, 0);
  assert.equal(packet.presentReportArtifactCount, 3);
  assert.deepEqual(packet.missingOwnerAgentIds, []);
  assert.equal(packet.missingReportPathManifest, "none");
  assert.equal(packet.presentReportPathManifest, `A11=${ownerPaths.A11};A18=${ownerPaths.A18};A22=${ownerPaths.A22}`);
  assert.equal(packet.rows.every((row) => row.artifactStatus === "present"), true);
});

test("MAIS Manim v2 owner gate report artifact gap packet gives A11, A18, and A22 owner-specific report templates", () => {
  const packet = buildMathSceneV2OwnerGateReportArtifactGapPacket({
    checkedAtHkt: "2026-07-03 20:20 HKT",
    observedArtifacts: [],
    readinessPacket: readinessPacketFixture()
  });

  const a11 = packet.rows.find((row) => row.ownerAgentId === "A11");
  const a18 = packet.rows.find((row) => row.ownerAgentId === "A18");
  const a22 = packet.rows.find((row) => row.ownerAgentId === "A22");

  assert.ok(a11);
  assert.equal(a11.reportTitle, "A11 Manim v2 browser visual interaction regression");
  assert.deepEqual(a11.reportTemplateSectionIds, [
    "scope-and-source-slice",
    "browser-command-transcript",
    "visual-interaction-verdict",
    "artifacts-and-risks"
  ]);
  assert.deepEqual(a11.requiredReportFields, [
    "browserRunId",
    "playwrightCommand",
    "browserReportPath",
    "visualInteractionVerdict",
    "consoleErrorSummary",
    "screenshotOrTracePath",
    "ownerDecision"
  ]);
  assert.equal(a11.acceptanceBoundary, "A11 supplies browser evidence only; A06 source readiness is not owner acceptance.");

  assert.ok(a18);
  assert.equal(a18.reportTitle, "A18 Manim v2 teaching quality final decisions");
  assert.deepEqual(a18.reportTemplateSectionIds, [
    "scope-and-source-handoff",
    "rendered-scene-decision-records",
    "criterion-decision-summary",
    "revision-or-approval-notes"
  ]);
  assert.deepEqual(a18.requiredReportFields, [
    "renderedSceneCaseCount",
    "finalTeachingDecisionRecords",
    "approvedDecisionCount",
    "revisionDecisionCount",
    "blockedDecisionCount",
    "a18ReviewerAgentId",
    "ownerDecision"
  ]);
  assert.equal(a18.acceptanceBoundary, "A18 supplies curriculum and teaching-quality decisions; A06 source confirmation is supporting evidence only.");

  assert.ok(a22);
  assert.equal(a22.reportTitle, "A22 Manim v2 clean release gate");
  assert.deepEqual(a22.reportTemplateSectionIds, [
    "scope-and-clean-source",
    "build-or-release-command-transcript",
    "release-gate-verdict",
    "dirty-root-exclusion"
  ]);
  assert.deepEqual(a22.requiredReportFields, [
    "cleanWorktreeSource",
    "buildCommand",
    "buildExitCode",
    "releaseGateVerdict",
    "dirtyRootExcluded",
    "ownerDecision"
  ]);
  assert.equal(a22.acceptanceBoundary, "A22 supplies clean release evidence; dirty-root A06 checks are not release acceptance.");

  assert.match(packet.requiredReportFieldManifest, /A18=renderedSceneCaseCount\|finalTeachingDecisionRecords/);
  assert.match(packet.reportTemplateSectionManifest, /A22=scope-and-clean-source\|build-or-release-command-transcript/);
  assert.match(packet.reportTitleManifest, /A11=A11 Manim v2 browser visual interaction regression/);
});

test("MAIS Manim v2 owner gate report artifact gap packet serializes stable owner report gap attributes", () => {
  const packet = buildMathSceneV2OwnerGateReportArtifactGapPacket({
    checkedAtHkt: "2026-07-03 20:20 HKT",
    observedArtifacts: [{ exists: true, path: ownerPaths.A11 }],
    readinessPacket: readinessPacketFixture()
  });
  const attributes = mathSceneV2OwnerGateReportArtifactGapPacketDataAttributes(packet);

  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-status"], "blocked-missing-owner-report-artifacts");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-ready-for-intake"], "false");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-required-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-missing-count"], "2");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-present-count"], "1");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-missing-owners"], "A18,A22");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-present-owners"], "A11");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-missing-paths"], `A18=${ownerPaths.A18};A22=${ownerPaths.A22}`);
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-present-paths"], `A11=${ownerPaths.A11}`);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-required-fields"],
    packet.requiredReportFieldManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-report-artifact-gap-template-sections"],
    packet.reportTemplateSectionManifest
  );
});
