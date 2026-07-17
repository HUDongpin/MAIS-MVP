import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2OwnerGateReportIntakeAudit,
  mathSceneV2OwnerGateReportIntakeAuditDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateReportIntakeRecord
} from "./mathSceneV2OwnerGateReportIntakeAudit";
import {
  type MathSceneV2OwnerGateReportArtifactGapPacket,
  MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateReportArtifactGapPacket";

const ownerPaths = {
  A11: "coordination/reports/2026-07-03-A11-manim-v2-browser-visual-interaction-regression.md",
  A18: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
  A22: "coordination/reports/2026-07-03-A22-manim-v2-clean-release-gate.md"
} as const;

function gapPacketFixture(): MathSceneV2OwnerGateReportArtifactGapPacket {
  const rows = [
    {
      acceptanceBoundary: "A11 supplies browser evidence only; A06 source readiness is not owner acceptance.",
      artifactStatus: "present" as const,
      canonicalReportPath: ownerPaths.A11,
      gateId: "a11-browser-visual-interaction-regression",
      ownerAgentId: "A11",
      reportTemplateSectionIds: [
        "scope-and-source-slice",
        "browser-command-transcript",
        "visual-interaction-verdict",
        "artifacts-and-risks"
      ],
      reportTitle: "A11 Manim v2 browser visual interaction regression",
      requiredOwnerAction: "submit-owner-report-artifact" as const,
      requiredReportFields: [
        "browserRunId",
        "playwrightCommand",
        "browserReportPath",
        "visualInteractionVerdict",
        "consoleErrorSummary",
        "screenshotOrTracePath",
        "ownerDecision"
      ],
      rowEvidenceIds: ["a11-manim-v2-browser-regression-rerun"],
      summary: `${ownerPaths.A11}:present`
    },
    {
      acceptanceBoundary: "A18 supplies curriculum and teaching-quality decisions; A06 source confirmation is supporting evidence only.",
      artifactStatus: "present" as const,
      canonicalReportPath: ownerPaths.A18,
      gateId: "a18-a06-teaching-quality-confirmation",
      ownerAgentId: "A18",
      reportTemplateSectionIds: [
        "scope-and-source-handoff",
        "rendered-scene-decision-records",
        "criterion-decision-summary",
        "revision-or-approval-notes"
      ],
      reportTitle: "A18 Manim v2 teaching quality final decisions",
      requiredOwnerAction: "submit-owner-report-artifact" as const,
      requiredReportFields: [
        "renderedSceneCaseCount",
        "finalTeachingDecisionRecords",
        "approvedDecisionCount",
        "revisionDecisionCount",
        "blockedDecisionCount",
        "a18ReviewerAgentId",
        "ownerDecision"
      ],
      rowEvidenceIds: ["a18-manim-v2-rendered-route-review"],
      summary: `${ownerPaths.A18}:present`
    },
    {
      acceptanceBoundary: "A22 supplies clean release evidence; dirty-root A06 checks are not release acceptance.",
      artifactStatus: "present" as const,
      canonicalReportPath: ownerPaths.A22,
      gateId: "a22-clean-release-gate",
      ownerAgentId: "A22",
      reportTemplateSectionIds: [
        "scope-and-clean-source",
        "build-or-release-command-transcript",
        "release-gate-verdict",
        "dirty-root-exclusion"
      ],
      reportTitle: "A22 Manim v2 clean release gate",
      requiredOwnerAction: "submit-owner-report-artifact" as const,
      requiredReportFields: [
        "cleanWorktreeSource",
        "buildCommand",
        "buildExitCode",
        "releaseGateVerdict",
        "dirtyRootExcluded",
        "ownerDecision"
      ],
      rowEvidenceIds: ["a22-manim-v2-clean-release-preflight-rerun"],
      summary: `${ownerPaths.A22}:present`
    }
  ];

  return {
    canMarkThreadGoalComplete: false,
    checkedAtHkt: "2026-07-03 21:05 HKT",
    missingOwnerAgentIds: [],
    missingReportArtifactCount: 0,
    missingReportPathManifest: "none",
    ownerArtifactStatusManifest: "A11=present;A18=present;A22=present",
    presentOwnerAgentIds: ["A11", "A18", "A22"],
    presentReportArtifactCount: 3,
    presentReportPathManifest: `A11=${ownerPaths.A11};A18=${ownerPaths.A18};A22=${ownerPaths.A22}`,
    readinessPacketStatus: "ready-for-parallel-owner-gate-transcripts",
    readyForOwnerReportIntake: true,
    reportTemplateSectionManifest:
      "A11=scope-and-source-slice|browser-command-transcript|visual-interaction-verdict|artifacts-and-risks;A18=scope-and-source-handoff|rendered-scene-decision-records|criterion-decision-summary|revision-or-approval-notes;A22=scope-and-clean-source|build-or-release-command-transcript|release-gate-verdict|dirty-root-exclusion",
    reportTitleManifest:
      "A11=A11 Manim v2 browser visual interaction regression;A18=A18 Manim v2 teaching quality final decisions;A22=A22 Manim v2 clean release gate",
    requiredOwnerAgentIds: ["A11", "A18", "A22"],
    requiredReportArtifactCount: 3,
    requiredReportFieldManifest:
      "A11=browserRunId|playwrightCommand|browserReportPath|visualInteractionVerdict|consoleErrorSummary|screenshotOrTracePath|ownerDecision;A18=renderedSceneCaseCount|finalTeachingDecisionRecords|approvedDecisionCount|revisionDecisionCount|blockedDecisionCount|a18ReviewerAgentId|ownerDecision;A22=cleanWorktreeSource|buildCommand|buildExitCode|releaseGateVerdict|dirtyRootExcluded|ownerDecision",
    rows,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_REPORT_ARTIFACT_GAP_PACKET_SOURCE_CONTRACT,
    status: "ready-for-owner-report-intake",
    summary: "fixture-ready-for-owner-report-intake"
  };
}

function acceptedReportRecords(): MathSceneV2OwnerGateReportIntakeRecord[] {
  return Object.entries(ownerPaths).map(([ownerAgentId, canonicalReportPath]) => ({
    canonicalReportPath,
    fieldEvidenceIds:
      ownerAgentId === "A11"
        ? [
            "browserRunId",
            "playwrightCommand",
            "browserReportPath",
            "visualInteractionVerdict",
            "consoleErrorSummary",
            "screenshotOrTracePath",
            "ownerDecision"
          ]
        : ownerAgentId === "A18"
          ? [
              "renderedSceneCaseCount",
              "finalTeachingDecisionRecords",
              "approvedDecisionCount",
              "revisionDecisionCount",
              "blockedDecisionCount",
              "a18ReviewerAgentId",
              "ownerDecision"
            ]
          : [
              "cleanWorktreeSource",
              "buildCommand",
              "buildExitCode",
              "releaseGateVerdict",
              "dirtyRootExcluded",
              "ownerDecision"
            ],
    ownerAgentId,
    ownerDecision: "accepted" as const,
    reportEvidenceId: `${ownerAgentId.toLowerCase()}-accepted-report`
  }));
}

test("MAIS Manim v2 owner report intake audit is ready for final objective audit only after every report has required fields and accepted decisions", () => {
  const audit = buildMathSceneV2OwnerGateReportIntakeAudit({
    checkedAtHkt: "2026-07-03 21:05 HKT",
    gapPacket: gapPacketFixture(),
    reportRecords: acceptedReportRecords()
  });

  assert.equal(audit.sourceContract, MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT);
  assert.equal(audit.status, "ready-for-final-objective-audit");
  assert.equal(audit.readyForFinalObjectiveAudit, true);
  assert.equal(audit.canMarkThreadGoalComplete, false);
  assert.equal(audit.acceptedOwnerCount, 3);
  assert.equal(audit.incompleteOwnerCount, 0);
  assert.equal(audit.blockedOwnerCount, 0);
  assert.deepEqual(audit.acceptedOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(audit.remainingOwnerAgentIds, []);
  assert.equal(audit.ownerDecisionManifest, "A11=accepted;A18=accepted;A22=accepted");
  assert.match(audit.summary, /status=ready-for-final-objective-audit/);
});

test("MAIS Manim v2 owner report intake audit keeps an owner incomplete when required fields are missing", () => {
  const records = acceptedReportRecords().map((record) =>
    record.ownerAgentId === "A18"
      ? {
          ...record,
          fieldEvidenceIds: record.fieldEvidenceIds.filter((field) => field !== "finalTeachingDecisionRecords")
        }
      : record
  );

  const audit = buildMathSceneV2OwnerGateReportIntakeAudit({
    checkedAtHkt: "2026-07-03 21:05 HKT",
    gapPacket: gapPacketFixture(),
    reportRecords: records
  });

  assert.equal(audit.status, "pending-owner-report-fields");
  assert.equal(audit.readyForFinalObjectiveAudit, false);
  assert.equal(audit.acceptedOwnerCount, 2);
  assert.equal(audit.incompleteOwnerCount, 1);
  assert.deepEqual(audit.remainingOwnerAgentIds, ["A18"]);
  assert.equal(audit.missingFieldManifest, "A18=finalTeachingDecisionRecords");
  assert.equal(audit.rows.find((row) => row.ownerAgentId === "A18")?.status, "pending-required-report-fields");
});

test("MAIS Manim v2 owner report intake audit blocks final audit when a report owner decision is revision or blocked", () => {
  const records = acceptedReportRecords().map((record) =>
    record.ownerAgentId === "A22"
      ? {
          ...record,
          ownerDecision: "blocked" as const
        }
      : record
  );

  const audit = buildMathSceneV2OwnerGateReportIntakeAudit({
    checkedAtHkt: "2026-07-03 21:05 HKT",
    gapPacket: gapPacketFixture(),
    reportRecords: records
  });

  assert.equal(audit.status, "blocked-owner-report-decision");
  assert.equal(audit.readyForFinalObjectiveAudit, false);
  assert.equal(audit.blockedOwnerCount, 1);
  assert.deepEqual(audit.blockedOwnerAgentIds, ["A22"]);
  assert.equal(audit.ownerDecisionManifest, "A11=accepted;A18=accepted;A22=blocked");
});

test("MAIS Manim v2 owner report intake audit serializes stable data attributes", () => {
  const audit = buildMathSceneV2OwnerGateReportIntakeAudit({
    checkedAtHkt: "2026-07-03 21:05 HKT",
    gapPacket: gapPacketFixture(),
    reportRecords: acceptedReportRecords()
  });
  const attributes = mathSceneV2OwnerGateReportIntakeAuditDataAttributes(audit);

  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-report-intake-audit-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_REPORT_INTAKE_AUDIT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-intake-audit-status"], "ready-for-final-objective-audit");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-intake-audit-ready-for-final-audit"], "true");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-intake-audit-accepted-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-intake-audit-remaining-owners"], "none");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-report-intake-audit-owner-decisions"], "A11=accepted;A18=accepted;A22=accepted");
});
