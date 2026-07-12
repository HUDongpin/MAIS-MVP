import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  type MathSceneV2CompletionRerunPlan,
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT
} from "./mathSceneV2CompletionRerunPlan";
import {
  buildMathSceneV2OwnerGateRerunCommandEvidenceIntake,
  mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateRerunCommandEvidenceRecord
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import {
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import { buildMathSceneV2OwnerGateRerunIntake } from "./mathSceneV2OwnerGateRerunIntake";

const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;
const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "a06-review-package-split=covered;a11-browser-visual-interaction-regression=pending-owner-evidence;a18-a06-teaching-quality-confirmation=pending-owner-evidence;a22-clean-release-gate=pending-owner-evidence";
const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "a06-review-package-split,a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate";
const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "a06-review-package-split=A06;a11-browser-visual-interaction-regression=A11+A06;a18-a06-teaching-quality-confirmation=A18+A06;a22-clean-release-gate=A22";
const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "a06-review-package-split=accepted-source-evidence;a11-browser-visual-interaction-regression=missing-owner-evidence;a18-a06-teaching-quality-confirmation=pending-a18-final-decisions;a22-clean-release-gate=blocked-owner-action";
const finalObjectiveSubmissionBridgeVerifiedClosureStatus = "complete";

function commandEvidenceFixture() {
  const commandPacket: MathSceneV2OwnerGateRerunCommandPacket = {
    browserCommandCount: 1,
    canMarkThreadGoalComplete: false,
    missingOwnerAgentIds: [],
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateRerunCommandEvidenceIntake.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    ownerPacketCount: 3,
    ownerPackets: [
      {
        commandCount: 1,
        manualReviewCount: 0,
        ownerAgentId: "A11",
        rows: [
          {
            command:
              "npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome --grep manim-v2 --reporter=line",
            commandEnv: { VISUALIZATION_SWEEP_TRACKS: "HK" },
            evidenceId: "a11-hk-demo-safe-visualization-values-rerun",
            instruction: "A11 reruns the HK demo-safe visualization values package and records run evidence.",
            kind: "browser-regression-command",
            ownerAgentId: "A11",
            protocol: ["run-playwright", "record-run-id", "attach-report"],
            rerunTarget: "a11-browser-visual-interaction-regression",
            stepId: "01-owner-gate-A11",
            summary: "01-owner-gate-A11:A11:hk-demo-safe:visualization-values"
          }
        ]
      },
      {
        commandCount: 0,
        manualReviewCount: 1,
        ownerAgentId: "A18",
        rows: [
          {
            evidenceId: "a18-number-line-core-rendered-route-review",
            href: "/visualization-lab?grade=demo&track=HK&lab=number-line-core-lab",
            instruction: "A18 opens the number-line route, checks selectors and criteria, then records review evidence.",
            kind: "teaching-route-review",
            ownerAgentId: "A18",
            protocol: [
              "open-rendered-review-route",
              "confirm-lab-section-selector",
              "confirm-rendered-scene-selectors",
              "confirm-source-evidence-attributes",
              "record-a18-approve-or-revision-decision"
            ],
            rerunTarget: "a18-a06-teaching-quality-confirmation",
            sectionSelector: "[id=\"lab-example-number-line-core-lab\"]",
            stepId: "02-owner-gate-A18",
            summary: "02-owner-gate-A18:A18:number-line-core:rendered-route-review"
          }
        ]
      },
      {
        commandCount: 1,
        manualReviewCount: 0,
        ownerAgentId: "A22",
        rows: [
          {
            command: "npm run release:preflight -- --json",
            evidenceId: "a22-release-preflight-rerun",
            instruction: "A22 reruns release preflight after preserving required evidence.",
            kind: "release-command",
            ownerAgentId: "A22",
            protocol: ["run-command", "record-output", "attach-report"],
            rerunTarget: "a22-clean-release-gate",
            stepId: "03-owner-gate-A22",
            summary: "03-owner-gate-A22:A22:a22-release-preflight-rerun"
          }
        ]
      }
    ],
    releaseCommandCount: 1,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
    status: "owner-rerun-commands-ready",
    summary:
      "mathSceneV2OwnerGateRerunCommandPacket:status=owner-rerun-commands-ready:owners=A11,A18,A22:browserCommands=1:releaseCommands=1:teachingReviews=1",
    teachingReviewCount: 1,
    totalCommandCount: 2
  };
  const rerunPlan: MathSceneV2CompletionRerunPlan = {
    canMarkThreadGoalComplete: false,
    duplicateEvidenceIds: [],
    finalAuditStepCount: 1,
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames: [
      ...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus,
    invalidEvidenceRecordCount: 0,
    invalidOwnerAgentIds: [],
    missingEvidenceCount: 0,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateRerunCommandEvidenceIntake.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    ownerEvidenceStepCount: 0,
    ownerGateRerunStepCount: 3,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    sourceContract: MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT,
    status: "owner-gate-reruns-required",
    stepCount: 4,
    steps: [
      {
        actionRequestCount: 0,
        blockingItems: ["a11-broad-visualization-value-suite-red"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11"],
        prerequisiteStepIds: [],
        requiredActions: ["run-a11-browser-regression"],
        requirementIds: ["a11-browser-visual-interaction-regression"],
        rerunTarget: "a11-browser-visual-interaction-regression",
        status: "ready-for-owner-gate-rerun",
        stepId: "01-owner-gate-A11",
        stepIndex: 1,
        summary:
          "01-owner-gate-A11:owner=A11:target=a11-browser-visual-interaction-regression:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A22"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a18-final-teaching-signoff-open"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A18"],
        prerequisiteStepIds: [],
        requiredActions: ["inspect-rendered-scene-targets", "record-approve-or-revision-decision"],
        requirementIds: ["a18-a06-teaching-quality-confirmation"],
        rerunTarget: "a18-a06-teaching-quality-confirmation",
        status: "ready-for-owner-gate-rerun",
        stepId: "02-owner-gate-A18",
        stepIndex: 2,
        summary:
          "02-owner-gate-A18:owner=A18:target=a18-a06-teaching-quality-confirmation:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06"]
      },
      {
        actionRequestCount: 0,
        blockingItems: ["a22-dirty-root-release-blocked"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A22"],
        prerequisiteStepIds: [],
        requiredActions: ["release-from-clean-worktree-or-reviewed-pruned-staging-slice"],
        requirementIds: ["a22-clean-release-gate"],
        rerunTarget: "a22-clean-release-gate",
        status: "ready-for-owner-gate-rerun",
        stepId: "03-owner-gate-A22",
        stepIndex: 3,
        summary:
          "03-owner-gate-A22:owner=A22:target=a22-clean-release-gate:status=ready-for-owner-gate-rerun",
        supportingAgentIds: ["A06", "A11"]
      },
      {
        actionRequestCount: 0,
        blockingItems: [
          "a11-broad-visualization-value-suite-red",
          "a18-final-teaching-signoff-open",
          "a22-dirty-root-release-blocked"
        ],
        kind: "final-objective-audit",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11", "A18", "A22"],
        prerequisiteStepIds: ["01-owner-gate-A11", "02-owner-gate-A18", "03-owner-gate-A22"],
        requiredActions: [
          "run-a11-browser-regression",
          "inspect-rendered-scene-targets",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice"
        ],
        requirementIds: [
          "a11-browser-visual-interaction-regression",
          "a18-a06-teaching-quality-confirmation",
          "a22-clean-release-gate"
        ],
        rerunTarget: "mathSceneV2ObjectiveCompletionAudit",
        status: "blocked-by-owner-gate-reruns",
        stepId: "04-final-objective-audit",
        stepIndex: 4,
        summary:
          "04-final-objective-audit:status=blocked-by-owner-gate-reruns:owners=A11,A18,A22:proven=1/4",
        supportingAgentIds: ["A06", "A11", "A22"]
      }
    ],
    summary:
      "mathSceneV2CompletionRerunPlan:status=owner-gate-reruns-required:steps=4:owners=A11,A18,A22:missingEvidence=0:invalidEvidence=0:duplicateEvidence=none"
  };

  return {
    commandPacket,
    rerunPlan
  };
}

function acceptedCommandRecords(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2OwnerGateRerunCommandEvidenceRecord[] {
  return commandPacket.ownerPackets.flatMap((ownerPacket) =>
    ownerPacket.rows.map((row) => ({
      evidenceId: `accepted-${row.ownerAgentId}-${row.evidenceId}`,
      ownerAgentId: row.ownerAgentId,
      rowEvidenceId: row.evidenceId,
      status: "accepted" as const
    }))
  );
}

test("MAIS Manim v2 command evidence intake synthesizes owner gate records only after every owner row is accepted", () => {
  const { commandPacket, rerunPlan } = commandEvidenceFixture();
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    acceptedCommandRecords(commandPacket)
  );

  assert.equal(intake.sourceContract, MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "owner-command-evidence-covered");
  assert.equal(intake.ownerPacketCount, 3);
  assert.equal(intake.acceptedOwnerCount, 3);
  assert.equal(intake.pendingOwnerCount, 0);
  assert.equal(intake.blockedOwnerCount, 0);
  assert.equal(intake.requiredRowCount, commandPacket.ownerPackets.flatMap((packet) => packet.rows).length);
  assert.equal(intake.acceptedRowCount, intake.requiredRowCount);
  assert.equal(intake.invalidRecordCount, 0);
  assert.deepEqual(intake.ownerGateRerunRecords.map((record) => record.ownerAgentId), ["A11", "A18", "A22"]);
  assert.ok(intake.ownerGateRerunRecords.every((record) => record.status === "accepted"));
  assert.equal(intake.canMarkThreadGoalComplete, false);

  const ownerGateIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, intake.ownerGateRerunRecords);
  assert.equal(ownerGateIntake.status, "owner-gate-reruns-covered");
  assert.equal(ownerGateIntake.readyForFinalAudit, true);
});

test("MAIS Manim v2 command evidence intake keeps one owner pending when a route review row is missing", () => {
  const { commandPacket, rerunPlan } = commandEvidenceFixture();
  const a18Rows = commandPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A18")?.rows ?? [];
  const missingA18EvidenceId = a18Rows[0].evidenceId;
  const records = acceptedCommandRecords(commandPacket).filter(
    (record) => record.rowEvidenceId !== missingA18EvidenceId
  );
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records);

  assert.equal(intake.status, "pending-owner-command-evidence");
  assert.equal(intake.acceptedOwnerCount, 2);
  assert.equal(intake.pendingOwnerCount, 1);
  assert.equal(intake.blockedOwnerCount, 0);
  assert.equal(intake.pendingRowCount, 1);
  assert.deepEqual(intake.ownerGateRerunRecords.map((record) => record.ownerAgentId), ["A11", "A22"]);
  assert.equal(
    intake.ownerPackets.find((packet) => packet.ownerAgentId === "A18")?.status,
    "pending-owner-command-evidence"
  );

  const ownerGateIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, intake.ownerGateRerunRecords);
  assert.equal(ownerGateIntake.status, "pending-owner-gate-reruns");
  assert.equal(ownerGateIntake.pendingGateCount, 1);
});

test("MAIS Manim v2 command evidence intake blocks an owner gate when a required command row blocks", () => {
  const { commandPacket, rerunPlan } = commandEvidenceFixture();
  const a22Rows = commandPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A22")?.rows ?? [];
  const blockedA22EvidenceId = a22Rows.find((row) => row.evidenceId === "a22-release-preflight-rerun")?.evidenceId;
  assert.ok(blockedA22EvidenceId);
  const records = acceptedCommandRecords(commandPacket).map((record) =>
    record.rowEvidenceId === blockedA22EvidenceId
      ? { ...record, evidenceId: "blocked-a22-release-preflight-rerun", status: "blocked" as const }
      : record
  );
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records);

  assert.equal(intake.status, "blocked-owner-command-evidence");
  assert.equal(intake.acceptedOwnerCount, 2);
  assert.equal(intake.blockedOwnerCount, 1);
  assert.equal(intake.blockedRowCount, 1);
  assert.equal(
    intake.ownerPackets.find((packet) => packet.ownerAgentId === "A22")?.status,
    "blocked-owner-command-evidence"
  );
  assert.deepEqual(
    intake.ownerGateRerunRecords.filter((record) => record.ownerAgentId === "A22").map((record) => record.status),
    ["blocked"]
  );

  const ownerGateIntake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, intake.ownerGateRerunRecords);
  assert.equal(ownerGateIntake.status, "blocked-owner-gate-rerun");
  assert.equal(ownerGateIntake.blockedGateCount, 1);
});

test("MAIS Manim v2 command evidence intake blocks duplicate command evidence IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const duplicateEvidenceId = records[0].evidenceId;
  const duplicatedRecords = records.map((record, index) =>
    index === 1 ? { ...record, evidenceId: duplicateEvidenceId } : record
  );
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, duplicatedRecords);
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.deepEqual(intake.duplicateRecordEvidenceIds, [duplicateEvidenceId]);
  assert.equal(intake.invalidRecordCount, 2);
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-record-ids"],
    duplicateEvidenceId
  );
});

test("MAIS Manim v2 command evidence intake blocks non-canonical command evidence IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const paddedEvidenceId = ` ${records[0].evidenceId} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, evidenceId: paddedEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIds, [paddedEvidenceId]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => record.evidenceId),
    [paddedEvidenceId]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-invalid-count"], "1");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-record-ids"],
    paddedEvidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-record-ids"], "none");
  assert.match(intake.summary, /nonCanonicalRecordIds= accepted-/);
});

test("MAIS Manim v2 command evidence intake exposes missing command evidence IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const blankEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, evidenceId: blankEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordEvidenceIdCount, 1);
  assert.deepEqual(
    intake.invalidRecords.map((record) => record.evidenceId),
    [blankEvidenceId]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-record-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-record-ids"],
    "none"
  );
  assert.match(intake.summary, /missingRecordIds=1/);
});

test("MAIS Manim v2 command evidence intake keeps missing command evidence IDs out of duplicate diagnostics", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const blankEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 || index === 1 ? { ...record, evidenceId: blankEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.missingRecordEvidenceIdCount, 2);
  assert.deepEqual(intake.duplicateRecordEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIds, []);
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-record-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-record-id-count"],
    "2"
  );
  assert.match(intake.summary, /duplicateRecordIds=none/);
  assert.match(intake.summary, /missingRecordIds=2/);
});

test("MAIS Manim v2 command evidence intake exposes missing command row evidence IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const blankRowEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, rowEvidenceId: blankRowEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordRowEvidenceIdCount, 1);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.rowEvidenceId}`),
    [`${records[0].ownerAgentId}:${blankRowEvidenceId}`]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-row-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-row-ids"],
    "none"
  );
  assert.match(intake.summary, /missingRecordRows=1/);
});

test("MAIS Manim v2 command evidence intake exposes non-canonical command row evidence IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const paddedRowEvidenceId = ` ${records[0].rowEvidenceId} `;
  const paddedRowKey = `${records[0].ownerAgentId}:${paddedRowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, rowEvidenceId: paddedRowEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordRowEvidenceIds, [paddedRowKey]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.rowEvidenceId}`),
    [paddedRowKey]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-row-ids"],
    paddedRowKey
  );
  assert.match(intake.summary, /nonCanonicalRecordRows=A11:/);
});

test("MAIS Manim v2 command evidence intake keeps non-canonical command rows out of duplicate diagnostics", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const duplicatedRecord = records[0];
  assert.ok(duplicatedRecord);
  const paddedRowEvidenceId = ` ${duplicatedRecord.rowEvidenceId} `;
  const paddedRowKey = `${duplicatedRecord.ownerAgentId}:${paddedRowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, [
    ...records.map((record, index) =>
      index === 0 ? { ...record, rowEvidenceId: paddedRowEvidenceId } : record
    ),
    {
      ...duplicatedRecord,
      evidenceId: `${duplicatedRecord.evidenceId}-padded-row-copy`,
      rowEvidenceId: paddedRowEvidenceId
    }
  ]);
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.deepEqual(intake.nonCanonicalRecordRowEvidenceIds, [paddedRowKey]);
  assert.deepEqual(intake.duplicateRecordRowEvidenceIds, []);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-row-ids"],
    paddedRowKey
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-row-ids"],
    "none"
  );
  assert.match(intake.summary, /duplicateRecordRows=none/);
});

test("MAIS Manim v2 command evidence intake exposes non-canonical command owner agent IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const paddedOwnerAgentId = ` ${records[0].ownerAgentId} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, ownerAgentId: paddedOwnerAgentId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordOwnerAgentIds, [paddedOwnerAgentId]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => record.ownerAgentId),
    [paddedOwnerAgentId]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-owner-ids"],
    paddedOwnerAgentId
  );
  assert.match(intake.summary, /nonCanonicalRecordOwners= A11 /);
});

test("MAIS Manim v2 command evidence intake exposes missing command owner agent IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const blankOwnerAgentId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0 ? { ...record, ownerAgentId: blankOwnerAgentId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordOwnerAgentIdCount, 1);
  assert.deepEqual(
    intake.invalidRecords.map((record) => record.ownerAgentId),
    [blankOwnerAgentId]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-owner-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-owner-ids"],
    "none"
  );
  assert.match(intake.summary, /missingRecordOwners=1/);
});

test("MAIS Manim v2 command evidence intake exposes mismatched command owner agent IDs", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const a11Record = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(a11Record);
  const wrongOwnerAgentId = "A22";
  const mismatchedOwnerRow = `${wrongOwnerAgentId}:${a11Record.rowEvidenceId}->${a11Record.ownerAgentId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record) =>
    record.evidenceId === a11Record.evidenceId
      ? {
          ...record,
          evidenceId: "mismatched-command-record-owner",
          ownerAgentId: wrongOwnerAgentId
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.mismatchedRecordOwnerAgentRows, [mismatchedOwnerRow]);
  assert.deepEqual(intake.unknownRecordRowEvidenceIds, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.rowEvidenceId}`),
    [`${wrongOwnerAgentId}:${a11Record.rowEvidenceId}`]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-mismatched-owner-rows"],
    mismatchedOwnerRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unknown-row-ids"],
    "none"
  );
  assert.match(intake.summary, /mismatchedRecordOwners=A22:/);
});

test("MAIS Manim v2 command evidence intake exposes unsupported command evidence statuses", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const unsupportedStatus = "passed";
  const unsupportedStatusRow = `${records[0].ownerAgentId}:${records[0].rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0
      ? { ...record, status: unsupportedStatus } as unknown as MathSceneV2OwnerGateRerunCommandEvidenceRecord
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unsupportedRecordStatuses, [unsupportedStatus]);
  assert.deepEqual(intake.unsupportedRecordStatusRows, [unsupportedStatusRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => String(record.status)),
    [unsupportedStatus]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-statuses"],
    unsupportedStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-status-rows"],
    unsupportedStatusRow
  );
  assert.match(intake.summary, /unsupportedRecordStatuses=passed/);
  assert.match(intake.summary, /unsupportedRecordStatusRows=A11:/);
});

test("MAIS Manim v2 command evidence intake exposes non-canonical command evidence statuses", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const paddedStatus = " accepted ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0
      ? { ...record, status: paddedStatus } as unknown as MathSceneV2OwnerGateRerunCommandEvidenceRecord
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordStatuses, [paddedStatus]);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => String(record.status)),
    [paddedStatus]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-statuses"],
    paddedStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-statuses"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalRecordStatuses= accepted /);
});

test("MAIS Manim v2 command evidence intake exposes missing command evidence statuses", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const blankStatus = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, records.map((record, index) =>
    index === 0
      ? { ...record, status: blankStatus } as unknown as MathSceneV2OwnerGateRerunCommandEvidenceRecord
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordStatusCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordStatuses, []);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => String(record.status)),
    [blankStatus]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-missing-status-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-non-canonical-statuses"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unsupported-statuses"],
    "none"
  );
  assert.match(intake.summary, /missingRecordStatuses=1/);
});

test("MAIS Manim v2 command evidence intake blocks duplicate command evidence rows", () => {
  const { commandPacket } = commandEvidenceFixture();
  const records = acceptedCommandRecords(commandPacket);
  const duplicatedRowRecord = records[0];
  assert.ok(duplicatedRowRecord);
  const duplicateRowEvidenceId = `${duplicatedRowRecord.ownerAgentId}:${duplicatedRowRecord.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, [
    ...records,
    { ...duplicatedRowRecord, evidenceId: `${duplicatedRowRecord.evidenceId}-duplicate-row` }
  ]);
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.deepEqual(intake.duplicateRecordRowEvidenceIds, [duplicateRowEvidenceId]);
  assert.equal(intake.invalidRecordCount, 2);
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-row-ids"],
    duplicateRowEvidenceId
  );
});

test("MAIS Manim v2 command evidence intake serializes stable attributes and rejects unknown row evidence", () => {
  const { commandPacket } = commandEvidenceFixture();
  const unknownRecordRowEvidenceId = "A11:not-a-command-row";
  const intake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(commandPacket, [
    ...acceptedCommandRecords(commandPacket),
    {
      evidenceId: "invalid-unknown-row",
      ownerAgentId: "A11",
      rowEvidenceId: "not-a-command-row",
      status: "accepted"
    }
  ]);
  const attributes = mathSceneV2OwnerGateRerunCommandEvidenceIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateRerunCommandEvidenceIntake.ts"), "evidence");
  assert.equal(
    (intake as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    commandPacket.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (intake as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (intake as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal((intake as { reviewSliceCount?: number }).reviewSliceCount, commandPacket.reviewSliceCount);
  assert.equal((intake as { reviewSliceIds?: string }).reviewSliceIds, commandPacket.reviewSliceIds);
  assert.equal(intake.status, "blocked-invalid-command-evidence");
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unknownRecordRowEvidenceIds, [unknownRecordRowEvidenceId]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.rowEvidenceId}`),
    [unknownRecordRowEvidenceId]
  );
  assert.deepEqual(intake.ownerGateRerunRecords, []);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_EVIDENCE_INTAKE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-status"], "blocked-invalid-command-evidence");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-count"], "3");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-action-evidence-count-manifest"],
    commandPacket.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-acceptance-criteria-manifest"],
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-owner-evidence-requirement-manifest"],
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-count"],
    String(commandPacket.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-ids"],
    commandPacket.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-file-manifest"],
    commandPacket.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-review-slice-consumer-gate-evidence-id-manifest"],
    commandPacket.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-invalid-count"], "1");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-unknown-row-ids"],
    unknownRecordRowEvidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-record-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-duplicate-row-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-command-evidence-can-complete"], "false");
  assert.match(intake.summary, /ownerAcceptanceCriteria=fixture-owner-acceptance-criteria/);
  assert.match(intake.summary, /ownerEvidenceRequirements=fixture-owner-evidence-requirements/);
  assert.match(intake.summary, /reviewSlices=20@24/);
  assert.match(intake.summary, /unknownRecordRows=A11:not-a-command-row/);
});
