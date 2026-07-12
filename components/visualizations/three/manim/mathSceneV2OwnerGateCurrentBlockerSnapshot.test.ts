import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2OwnerGateCurrentBlockerSnapshot,
  mathSceneV2OwnerGateCurrentBlockerSnapshotDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateCurrentBlockerSnapshot";
import type { MathSceneV2OwnerGateReportArtifactGapPacket } from "./mathSceneV2OwnerGateReportArtifactGapPacket";
import type { MathSceneV2OwnerGateReportIntakeAudit } from "./mathSceneV2OwnerGateReportIntakeAudit";

const ownerPaths = {
  A11: "coordination/reports/2026-07-03-A11-manim-v2-browser-visual-interaction-regression.md",
  A18: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
  A22: "coordination/reports/2026-07-03-A22-manim-v2-clean-release-gate.md"
} as const;

function gapPacketFixture(
  status: MathSceneV2OwnerGateReportArtifactGapPacket["status"] = "blocked-missing-owner-report-artifacts"
): MathSceneV2OwnerGateReportArtifactGapPacket {
  const rows = ([
    ["A11", "a11-browser-visual-interaction-regression", ownerPaths.A11],
    ["A18", "a18-a06-teaching-quality-confirmation", ownerPaths.A18],
    ["A22", "a22-clean-release-gate", ownerPaths.A22]
  ] as const).map(([ownerAgentId, gateId, canonicalReportPath]) => ({
    acceptanceBoundary: `${ownerAgentId} owner evidence only`,
    artifactStatus: status === "ready-for-owner-report-intake" ? "present" as const : "missing" as const,
    canonicalReportPath,
    gateId,
    ownerAgentId,
    reportTemplateSectionIds: ["scope", "evidence", "decision"],
    reportTitle: `${ownerAgentId} report`,
    requiredOwnerAction: "submit-owner-report-artifact" as const,
    requiredReportFields: ["ownerDecision"],
    rowEvidenceIds: [`${ownerAgentId.toLowerCase()}-row`],
    summary: `${ownerAgentId}:${gateId}`
  }));
  const missingRows = rows.filter((row) => row.artifactStatus === "missing");
  const presentRows = rows.filter((row) => row.artifactStatus === "present");

  return {
    canMarkThreadGoalComplete: false,
    checkedAtHkt: "2026-07-03 22:10 HKT",
    missingOwnerAgentIds: missingRows.map((row) => row.ownerAgentId),
    missingReportArtifactCount: missingRows.length,
    missingReportPathManifest: missingRows.map((row) => `${row.ownerAgentId}=${row.canonicalReportPath}`).join(";") || "none",
    ownerArtifactStatusManifest: rows.map((row) => `${row.ownerAgentId}=${row.artifactStatus}`).join(";"),
    presentOwnerAgentIds: presentRows.map((row) => row.ownerAgentId),
    presentReportArtifactCount: presentRows.length,
    presentReportPathManifest: presentRows.map((row) => `${row.ownerAgentId}=${row.canonicalReportPath}`).join(";") || "none",
    readinessPacketStatus: "ready-for-parallel-owner-gate-transcripts",
    readyForOwnerReportIntake: status === "ready-for-owner-report-intake",
    reportTemplateSectionManifest: rows.map((row) => `${row.ownerAgentId}=scope|evidence|decision`).join(";"),
    reportTitleManifest: rows.map((row) => `${row.ownerAgentId}=${row.reportTitle}`).join(";"),
    requiredOwnerAgentIds: ["A11", "A18", "A22"],
    requiredReportArtifactCount: 3,
    requiredReportFieldManifest: rows.map((row) => `${row.ownerAgentId}=ownerDecision`).join(";"),
    rows,
    sourceContract: "MAIS Manim v2 owner gate report artifact gap packet: compares A11/A18/A22 canonical report paths against observed report artifacts without accepting owner evidence",
    status,
    summary: `gap:${status}`
  };
}

function intakeAuditFixture(
  status: MathSceneV2OwnerGateReportIntakeAudit["status"] = "blocked-report-artifacts-not-ready"
): MathSceneV2OwnerGateReportIntakeAudit {
  return {
    acceptedOwnerAgentIds: status === "ready-for-final-objective-audit" ? ["A11", "A18", "A22"] : [],
    acceptedOwnerCount: status === "ready-for-final-objective-audit" ? 3 : 0,
    blockedOwnerAgentIds: [],
    blockedOwnerCount: 0,
    canMarkThreadGoalComplete: false,
    checkedAtHkt: "2026-07-03 22:10 HKT",
    incompleteOwnerAgentIds: status === "ready-for-final-objective-audit" ? [] : ["A11", "A18", "A22"],
    incompleteOwnerCount: status === "ready-for-final-objective-audit" ? 0 : 3,
    missingFieldManifest: status === "ready-for-final-objective-audit" ? "none" : "A11=ownerDecision;A18=ownerDecision;A22=ownerDecision",
    ownerDecisionManifest: status === "ready-for-final-objective-audit" ? "A11=accepted;A18=accepted;A22=accepted" : "none",
    readyForFinalObjectiveAudit: status === "ready-for-final-objective-audit",
    remainingOwnerAgentIds: status === "ready-for-final-objective-audit" ? [] : ["A11", "A18", "A22"],
    requiredOwnerAgentIds: ["A11", "A18", "A22"],
    rowCount: 3,
    rows: [],
    sourceContract: "MAIS Manim v2 owner gate report intake audit: validates submitted A11/A18/A22 report fields and owner decisions before final objective audit",
    status,
    summary: `intake:${status}`
  };
}

test("current blocker snapshot keeps missing A11/A18/A22 reports and A11 projection views drift visible", () => {
  const snapshot = buildMathSceneV2OwnerGateCurrentBlockerSnapshot({
    checkedAtHkt: "2026-07-03 22:10 HKT",
    gapPacket: gapPacketFixture(),
    intakeAudit: intakeAuditFixture(),
    observedFindings: [
      {
        evidenceIds: ["A06-manim-v2-provisional-visualization-values-after-runtime-ready-fixes"],
        findingId: "a11-projection-views-expected-list-drift",
        gateId: "a11-browser-visual-interaction-regression",
        ownerAgentId: "A11",
        requiredActionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
        status: "open-owner-action",
        summary: "A11 expected-list must include projection-views for the live premium variant."
      },
      {
        evidenceIds: ["A06-manim-v2-direct-shell-functions-final-green"],
        findingId: "a06-functions-direct-shell-duplicate-panel",
        gateId: "a06-runtime-ready-browser-gate-cleanup",
        ownerAgentId: "A06",
        requiredActionId: "a06-runtime-ready-browser-gate-cleanup:functions-direct-shell",
        status: "resolved-a06-provisional",
        summary: "A06 reverified functions direct route focused browser pass."
      }
    ]
  });

  assert.equal(snapshot.sourceContract, MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT);
  assert.equal(snapshot.status, "blocked-missing-owner-report-artifacts");
  assert.equal(snapshot.canMarkThreadGoalComplete, false);
  assert.equal(snapshot.readyForFinalObjectiveAuditInput, false);
  assert.equal(snapshot.missingReportArtifactCount, 3);
  assert.equal(snapshot.openOwnerActionCount, 1);
  assert.equal(snapshot.resolvedA06FindingCount, 1);
  assert.deepEqual(snapshot.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(snapshot.openA11ActionIds, ["a11-browser-visual-interaction-regression:update-projection-views-expected-list"]);
  assert.equal(snapshot.openOwnerActionManifest, "A11=a11-browser-visual-interaction-regression:update-projection-views-expected-list");
  assert.match(snapshot.blockerManifest, /A11:missing-owner-report-artifact:submit-owner-report-artifact/);
  assert.match(snapshot.blockerManifest, /A11:open-owner-action:a11-browser-visual-interaction-regression:update-projection-views-expected-list/);
  assert.match(snapshot.summary, /projection-views/);
});

test("current blocker snapshot becomes ready only after reports are accepted and owner actions are accepted", () => {
  const snapshot = buildMathSceneV2OwnerGateCurrentBlockerSnapshot({
    checkedAtHkt: "2026-07-03 22:10 HKT",
    gapPacket: gapPacketFixture("ready-for-owner-report-intake"),
    intakeAudit: intakeAuditFixture("ready-for-final-objective-audit"),
    observedFindings: [
      {
        evidenceIds: ["a11-projection-views-contract-update", "a11-premium-route-rerun"],
        findingId: "a11-projection-views-expected-list-drift",
        gateId: "a11-browser-visual-interaction-regression",
        ownerAgentId: "A11",
        requiredActionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
        status: "owner-accepted",
        summary: "A11 accepted the projection-views contract update."
      }
    ]
  });

  assert.equal(snapshot.status, "ready-for-final-objective-audit-input");
  assert.equal(snapshot.readyForFinalObjectiveAuditInput, true);
  assert.equal(snapshot.canMarkThreadGoalComplete, false);
  assert.equal(snapshot.openOwnerActionCount, 0);
  assert.deepEqual(snapshot.remainingOwnerAgentIds, []);
  assert.equal(snapshot.blockerManifest, "none");
});

test("current blocker snapshot serializes stable data attributes for owner handoff dashboards", () => {
  const snapshot = buildMathSceneV2OwnerGateCurrentBlockerSnapshot({
    checkedAtHkt: "2026-07-03 22:10 HKT",
    gapPacket: gapPacketFixture(),
    intakeAudit: intakeAuditFixture(),
    observedFindings: [
      {
        evidenceIds: ["A06-manim-v2-provisional-visualization-values-after-runtime-ready-fixes"],
        findingId: "a11-projection-views-expected-list-drift",
        gateId: "a11-browser-visual-interaction-regression",
        ownerAgentId: "A11",
        requiredActionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
        status: "open-owner-action",
        summary: "A11 expected-list must include projection-views for the live premium variant."
      }
    ]
  });
  const attributes = mathSceneV2OwnerGateCurrentBlockerSnapshotDataAttributes(snapshot);

  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-current-blocker-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_CURRENT_BLOCKER_SNAPSHOT_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-status"], "blocked-missing-owner-report-artifacts");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-ready-for-final-audit-input"], "false");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-missing-report-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-open-action-count"], "1");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-open-a11-actions"], "a11-browser-visual-interaction-regression:update-projection-views-expected-list");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-current-blocker-remaining-owners"], "A11,A18,A22");
  assert.match(attributes["data-viz-manim-v2-owner-gate-current-blocker-summary"], /projection-views/);
});
