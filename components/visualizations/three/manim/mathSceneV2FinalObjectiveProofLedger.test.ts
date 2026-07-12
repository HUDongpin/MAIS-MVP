import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneV2FinalClosureAuditRecord } from "./mathSceneV2FinalClosureAudit";
import {
  buildMathSceneV2FinalObjectiveAuditRecordIntake
} from "./mathSceneV2FinalObjectiveAuditRecordIntake";
import type { MathSceneV2FinalObjectiveAuditRequestPacket } from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import {
  MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2FinalObjectiveAuditRequestPacket";
import {
  buildMathSceneV2FinalObjectiveProofLedger,
  mathSceneV2FinalObjectiveProofLedgerDataAttributes,
  MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT
} from "./mathSceneV2FinalObjectiveProofLedger";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

const ownerGateRerunEvidenceIds = [
  "accepted-A11-command-evidence-covered",
  "accepted-A18-command-evidence-covered",
  "accepted-A22-command-evidence-covered"
] as const;

const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;
const ownerActionEvidenceCountManifest = "fixture-owner-action-evidence-counts";
const ownerAcceptanceCriteriaManifest = "fixture-owner-acceptance-criteria";
const ownerEvidenceRequirementManifest = "fixture-owner-evidence-requirements";
const ownerGateRerunAcceptedSubmittedRecordManifest =
  "A11:accepted-A11-gate-rerun:status=accepted;A18:accepted-A18-gate-rerun:status=accepted;A22:accepted-A22-gate-rerun:status=accepted";
const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2FinalObjectiveAuditRequestPacket.ts";
const reviewSliceIds = "manim-review-slice-01,manim-review-slice-02";
const reviewSliceSummary = "20@24";
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-v2-scene-run-from-beat-current-beat-id,data-viz-manim-v2-scene-run-from-beat-checkpoint-id,data-viz-manim-v2-scene-run-from-beat-invalidated-checkpoints,data-viz-manim-v2-scene-run-from-beat-invalidation-count,data-viz-manim-v2-scene-run-from-beat-status";
const a11RequiredRootDataAttributeCount = 5;
const currentBlockerManifest =
  "missing-report-artifacts=A11,A18,A22;open-owner-actions=a11-browser-visual-interaction-regression:update-projection-views-expected-list";
const currentBlockerOpenA11ActionId =
  "a11-browser-visual-interaction-regression:update-projection-views-expected-list";

function requestPacket(): MathSceneV2FinalObjectiveAuditRequestPacket {
  return {
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    canMarkThreadGoalComplete: false,
    currentProvenRequirementCount: 1,
    finalAuditRecordTemplate: {
      ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
      provenRequirementCount: 4,
      requirementCount: 4,
      requirementProofEvidenceIds: [...requirementProofEvidenceIds],
      requiredStatus: "accepted",
      target: "mathSceneV2ObjectiveCompletionAudit"
    },
    ownerActionEvidenceCountManifest,
    ownerAcceptanceCriteriaManifest,
    ownerEvidenceRequirementManifest,
    ownerGateRerunAcceptedSubmittedRecordManifest,
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
    ownerGateRerunInvalidSubmittedRecordManifest: "none",
    ownerGateRerunMissingTemplateManifest: "none",
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
    pendingRequirementCount: 3,
    readyForFinalObjectiveAuditRecord: true,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requiredFinalAuditFields: [
      "evidenceId",
      "target",
      "status",
      "provenRequirementCount",
      "requirementCount",
      "ownerGateRerunEvidenceIds",
      "requirementProofEvidenceIds"
    ],
    requiredProvenRequirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    requirementRows: [
      {
        evidenceVerdict: "current-evidence-proves-requirement",
        id: "a06-review-package-split",
        objectiveText: "A06 splits the Manim v2 runtime into reviewable source packages.",
        ownerAgentIds: ["A06"],
        requiredActions: [],
        requiredProofEvidenceId: requirementProofEvidenceIds[0],
        sourceRequirementStatus: "proven",
        status: "current-source-proven",
        supportingAgentIds: ["A06"]
      },
      {
        evidenceVerdict: "missing-owner-evidence",
        id: "a11-browser-visual-interaction-regression",
        objectiveText: "A11 completes browser visual and interaction regression for Visualization Lab / Manim v2.",
        ownerAgentIds: ["A11"],
        requiredActions: ["Submit accepted browser regression evidence."],
        requiredProofEvidenceId: requirementProofEvidenceIds[1],
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-audit-proof",
        supportingAgentIds: ["A06", "A11"]
      },
      {
        evidenceVerdict: "pending-a18-final-decisions",
        id: "a18-a06-teaching-quality-confirmation",
        objectiveText: "A18/A06 confirm concrete mathematical scene teaching quality.",
        ownerAgentIds: ["A18", "A06"],
        requiredActions: ["Submit accepted A18 final criterion decisions."],
        requiredProofEvidenceId: requirementProofEvidenceIds[2],
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-audit-proof",
        supportingAgentIds: ["A06", "A18"]
      },
      {
        evidenceVerdict: "owner-gate-blocked",
        id: "a22-clean-release-gate",
        objectiveText: "A22 completes clean-worktree or reviewed-slice build and release gates.",
        ownerAgentIds: ["A22"],
        requiredActions: ["Submit accepted clean release gate evidence."],
        requiredProofEvidenceId: requirementProofEvidenceIds[3],
        sourceRequirementStatus: "blocked-owner-action",
        status: "pending-final-audit-proof",
        supportingAgentIds: ["A06", "A22"]
      }
    ],
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceContract: MATH_SCENE_V2_FINAL_OBJECTIVE_AUDIT_REQUEST_PACKET_SOURCE_CONTRACT,
    status: "pending-final-objective-audit-record",
    summary: "mathSceneV2FinalObjectiveAuditRequestPacket:status=pending-final-objective-audit-record"
  };
}

function acceptedRecord(): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4",
    ownerGateRerunEvidenceIds: [...ownerGateRerunEvidenceIds],
    provenRequirementCount: 4,
    requirementCount: 4,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

function currentBlockerRequestPacket(): MathSceneV2FinalObjectiveAuditRequestPacket {
  return {
    ...requestPacket(),
    currentBlockerManifest,
    currentBlockerMissingReportArtifactCount: 3,
    currentBlockerOpenA11ActionIds: [currentBlockerOpenA11ActionId],
    currentBlockerOpenOwnerActionCount: 1,
    currentBlockerReadyForFinalObjectiveAuditInput: false,
    currentBlockerRemainingOwnerAgentIds: ["A11", "A18", "A22"],
    currentBlockerSnapshotStatus: "blocked-missing-owner-report-artifacts",
    currentBlockerSummary:
      "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-missing-owner-report-artifacts:missingReports=3:openOwnerActions=1",
    readyForFinalObjectiveAuditRecord: false,
    status: "blocked-current-owner-gate-blockers",
    summary:
      "mathSceneV2FinalObjectiveAuditRequestPacket:status=blocked-current-owner-gate-blockers:currentBlockers=blocked-missing-owner-report-artifacts"
  };
}

test("MAIS Manim v2 final objective proof ledger expands final proof IDs into requirement rows", () => {
  const packet = requestPacket();
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, []);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });

  assert.equal(ledger.sourceContract, MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT);
  assert.equal(ledger.status, "pending-final-objective-proof-record");
  assert.equal(ledger.requirementCount, 4);
  assert.equal(ledger.requiredProofEvidenceIdCount, 4);
  assert.equal(ledger.currentSourceProofReadyCount, 1);
  assert.equal(ledger.finalRecordProofCoveredCount, 0);
  assert.equal(ledger.pendingFinalRecordProofCount, 3);
  assert.equal(ledger.canMarkThreadGoalComplete, false);
  assert.equal(
    (ledger as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    ownerActionEvidenceCountManifest
  );
  assert.equal(
    (ledger as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (ledger as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    (ledger as { reviewSliceCount?: number }).reviewSliceCount,
    intake.reviewSliceCount
  );
  assert.equal(
    (ledger as { reviewSliceIds?: string }).reviewSliceIds,
    intake.reviewSliceIds
  );
  assert.equal(
    (ledger as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    intake.reviewSliceFileManifest
  );
  assert.equal(
    (ledger as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    intake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    (ledger as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    intake.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (ledger as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    intake.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.match(
    ledger.summary,
    new RegExp(`ownerAcceptanceCriteria=${ownerAcceptanceCriteriaManifest}`)
  );
  assert.match(
    ledger.summary,
    new RegExp(`ownerEvidenceRequirements=${ownerEvidenceRequirementManifest}`)
  );
  assert.match(ledger.summary, /a11RootAttributes=5/);
  assert.deepEqual(ledger.remainingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(ledger.rows.filter((row) => row.status === "current-source-proof-ready").length, 1);
  assert.equal(ledger.rows.filter((row) => row.status === "pending-final-record-proof").length, 3);
  assert.ok(ledger.rows.some((row) =>
    row.requiredProofEvidenceId === "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions" &&
    row.status === "pending-final-record-proof" &&
    row.ownerAgentIds.includes("A18")
  ));
});

test("MAIS Manim v2 final objective proof ledger carries source-architecture blocker reasons from record intake", () => {
  const blockerReasons = ["reviewSliceStatus", "missingReviewSliceFiles"] as const;
  const packet = {
    ...requestPacket(),
    sourceArchitectureBlockerReasonManifest: blockerReasons.join(","),
    sourceArchitectureBlockerReasons: [...blockerReasons]
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, []);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.deepEqual(ledger.sourceArchitectureBlockerReasons, [...blockerReasons]);
  assert.equal(ledger.sourceArchitectureBlockerReasonManifest, "reviewSliceStatus,missingReviewSliceFiles");
  assert.match(ledger.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final objective proof ledger carries source-architecture constraints from record intake", () => {
  const packet: MathSceneV2FinalObjectiveAuditRequestPacket = {
    ...requestPacket(),
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
    sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
    sourceArchitectureOpenOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureRequiredOwnerGateIds: [
      "a11-browser-visual-interaction-regression",
      "a18-a06-teaching-quality-confirmation",
      "a22-clean-release-gate"
    ],
    sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
    sourceArchitectureSummary:
      "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGenerationAllowed=false"
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, [acceptedRecord()]);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(ledger.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(ledger.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    ledger.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(ledger.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(ledger.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(ledger.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});

test("MAIS Manim v2 final objective proof ledger carries current owner-gate blocker provenance from record intake", () => {
  const packet = currentBlockerRequestPacket();
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, []);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(ledger.status, "blocked-final-objective-proof-request");
  assert.equal(
    (ledger as { currentBlockerSnapshotStatus?: string }).currentBlockerSnapshotStatus,
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    (ledger as { currentBlockerReadyForFinalObjectiveAuditInput?: boolean }).currentBlockerReadyForFinalObjectiveAuditInput,
    false
  );
  assert.equal(
    (ledger as { currentBlockerMissingReportArtifactCount?: number }).currentBlockerMissingReportArtifactCount,
    3
  );
  assert.equal(
    (ledger as { currentBlockerOpenOwnerActionCount?: number }).currentBlockerOpenOwnerActionCount,
    1
  );
  assert.deepEqual(
    (ledger as { currentBlockerRemainingOwnerAgentIds?: string[] }).currentBlockerRemainingOwnerAgentIds,
    ["A11", "A18", "A22"]
  );
  assert.deepEqual(
    (ledger as { currentBlockerOpenA11ActionIds?: string[] }).currentBlockerOpenA11ActionIds,
    [currentBlockerOpenA11ActionId]
  );
  assert.equal(
    (ledger as { currentBlockerManifest?: string }).currentBlockerManifest,
    currentBlockerManifest
  );
  assert.match(ledger.summary, /currentBlockers=blocked-missing-owner-report-artifacts/);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-status"],
    "blocked-missing-owner-report-artifacts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-ready"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-missing-report-count"],
    "3"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-open-action-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-open-a11-actions"],
    currentBlockerOpenA11ActionId
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-current-blocker-remaining-owners"],
    "A11,A18,A22"
  );
});

test("MAIS Manim v2 final objective proof ledger marks every proof covered only after accepted final record intake", () => {
  const packet = requestPacket();
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, [acceptedRecord()]);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(ledger.status, "final-objective-proofs-covered");
  assert.equal(ledger.currentSourceProofReadyCount, 0);
  assert.equal(ledger.finalRecordProofCoveredCount, 4);
  assert.equal(ledger.pendingFinalRecordProofCount, 0);
  assert.deepEqual(ledger.remainingOwnerAgentIds, []);
  assert.ok(ledger.rows.every((row) => row.status === "final-record-proof-covered"));
  assert.ok(ledger.rows.every((row) => row.finalAuditEvidenceId === "accepted-final-objective-audit-4-of-4"));
  assert.equal(ledger.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-final-audit-evidence-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=finalAuditEvidence:${row.finalAuditEvidenceId}`).join(";")
  );
});

test("MAIS Manim v2 final objective proof ledger blocks duplicate required proof IDs", () => {
  const packet = requestPacket();
  const duplicatedProofPacket = {
    ...packet,
    finalAuditRecordTemplate: {
      ...packet.finalAuditRecordTemplate,
      requirementProofEvidenceIds: [
        requirementProofEvidenceIds[0],
        requirementProofEvidenceIds[1],
        requirementProofEvidenceIds[1],
        requirementProofEvidenceIds[2]
      ]
    },
    requirementRows: packet.requirementRows.map((row) => row.id === "a22-clean-release-gate"
      ? {
          ...row,
          requiredProofEvidenceId: requirementProofEvidenceIds[1]
        }
      : row
    )
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(duplicatedProofPacket, [acceptedRecord()]);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: duplicatedProofPacket
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(ledger.status, "blocked-duplicate-final-objective-proof-ids");
  assert.deepEqual(ledger.duplicateRequiredProofEvidenceIds, [requirementProofEvidenceIds[1]]);
  assert.equal(ledger.finalRecordProofCoveredCount, 0);
  assert.equal(ledger.pendingFinalRecordProofCount, 3);
  assert.equal(ledger.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-duplicate-proof-ids"],
    requirementProofEvidenceIds[1]
  );
});

test("MAIS Manim v2 final objective proof ledger keeps blank required proof IDs out of duplicate diagnostics", () => {
  const packet = requestPacket();
  const blankProofId = "   ";
  const blankProofPacket = {
    ...packet,
    requirementRows: packet.requirementRows.map((row) =>
      row.id === "a11-browser-visual-interaction-regression" ||
      row.id === "a22-clean-release-gate"
        ? {
            ...row,
            requiredProofEvidenceId: blankProofId
          }
        : row
    )
  };
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(blankProofPacket, [acceptedRecord()]);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: blankProofPacket
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(ledger.status, "pending-final-objective-proof-record");
  assert.deepEqual(ledger.duplicateRequiredProofEvidenceIds, []);
  assert.equal(ledger.finalRecordProofCoveredCount, 2);
  assert.equal(ledger.pendingFinalRecordProofCount, 2);
  assert.deepEqual(ledger.remainingOwnerAgentIds, ["A11", "A22"]);
  assert.equal(ledger.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-duplicate-proof-ids"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-summary"],
    /duplicateProofIds=none/
  );
});

test("MAIS Manim v2 final objective proof ledger serializes stable handoff attributes", () => {
  const packet = requestPacket();
  const intake = buildMathSceneV2FinalObjectiveAuditRecordIntake(packet, []);
  const ledger = buildMathSceneV2FinalObjectiveProofLedger({
    recordIntake: intake,
    requestPacket: packet
  });
  const attributes = mathSceneV2FinalObjectiveProofLedgerDataAttributes(ledger);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalObjectiveProofLedger.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-source-contract"],
    MATH_SCENE_V2_FINAL_OBJECTIVE_PROOF_LEDGER_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-status"], "pending-final-objective-proof-record");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-proofs"], "0/4");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-duplicate-proof-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-source-ready"], "1");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-pending"], "3");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-remaining-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-final-objective-proof-ledger-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-owner-action-evidence-count-manifest"],
    ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-owner-acceptance-criteria-manifest"],
    ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-owner-evidence-requirement-manifest"],
    ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-review-slice-count"],
    String(reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-review-slice-ids"],
    reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-a11-required-root-attribute-count"],
    String(a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-a11-run-from-beat-checkpoint-invalidation-attributes"],
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-ids"],
    ledger.rows.map((row) => row.requiredProofEvidenceId).join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-owner-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.ownerAgentIds.join("+")}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-status-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.status}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-verdict-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.evidenceVerdict}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-source-status-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=${row.sourceRequirementStatus}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-action-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=actions:${row.requiredActions.join("+") || "none"}`).join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-row-final-audit-evidence-manifest"],
    ledger.rows.map((row) => `${row.requiredProofEvidenceId}=finalAuditEvidence:${row.finalAuditEvidenceId ?? "pending"}`).join(";")
  );
  assert.match(
    attributes["data-viz-manim-v2-final-objective-proof-ledger-summary"],
    /reviewSlices=20@24/
  );
});
