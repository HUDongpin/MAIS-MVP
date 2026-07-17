import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
  type MathSceneV2CompletionAcceptanceAction,
  type MathSceneV2CompletionAcceptanceChecklist
} from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";
import {
  MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
  type MathSceneTeachingA06SourceConfirmationLedger
} from "./mathSceneTeachingA06SourceConfirmationLedger";
import { MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA } from "./mathSceneTeachingFinalDecisionLedger";
import {
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
  type MathSceneV2SourceArchitectureHandoff
} from "./mathSceneV2SourceArchitectureHandoff";
import {
  buildMathSceneV2OwnerEvidenceRequestPacket,
  mathSceneV2OwnerEvidenceRequestPacketDataAttributes,
  MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerEvidenceRequestPacket";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  buildManimReviewPackageSliceMatrix,
  manimReviewPackageSliceDataAttributes
} from "./mathSceneReviewPackageSlices";

const manimDir = "components/visualizations/three/manim";
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys,data-viz-manim-run-from-beat-checkpoint-invalidates-count,data-viz-manim-run-from-beat-checkpoint-invalidation-summary,data-viz-manim-run-from-beat-checkpoint-restore-action,data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore";
const a11RequiredRootDataAttributeCount = 5;
const reviewSliceConsumerGateEvidenceIdManifest =
  "manim-review-slice-01=mathSceneV2OwnerEvidenceRequestPacket.ts>a11-browser-visual-interaction-regression";
const reviewSliceCount = 20;
const reviewSliceFileManifest = "manim-review-slice-01=mathSceneV2OwnerEvidenceRequestPacket.ts";
const reviewSliceIds = "manim-review-slice-01";
const reviewSliceSummary = "20@24";
const finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes = {
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest":
    "owner-gate-rerun-submission-bridge=1/1;final-objective-audit-request=1/1;final-objective-audit-record=1/1;final-objective-proof-ledger=4/4;verified-closure=4/4;final-closure-audit=1/1",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids":
    "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure,final-closure-audit",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest":
    "owner-gate-rerun-submission-bridge=A11+A18+A22;final-objective-audit-request=A06;final-objective-audit-record=A06+A11+A18+A22;final-objective-proof-ledger=A06+A11+A18+A22;verified-closure=A06+A11+A18+A22;final-closure-audit=A06+A11+A18+A22",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest":
    "owner-gate-rerun-submission-bridge=owner-gate-rerun-submissions-covered;final-objective-audit-request=pending-final-objective-audit-record;final-objective-audit-record=final-objective-audit-record-accepted;final-objective-proof-ledger=final-objective-proofs-covered;verified-closure=complete;final-closure-audit=complete",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status": "complete"
} as const;
const a06SourceConfirmationLedger = {
  a06ConfirmedDecisionCount: 60,
  blockedConfirmationCount: 0,
  canMarkA18GateComplete: false,
  caseCount: 12,
  confirmationCount: 60,
  criterionCount: 5,
  pendingA18DecisionCount: 60,
  requiredCriteria: MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA,
  rows: [],
  sourceContract: MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
  status: "a06-source-confirmed-a18-pending",
  summary:
    "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60"
} satisfies MathSceneTeachingA06SourceConfirmationLedger;
const sourceArchitectureHandoff = {
  acceptanceCriteria: [
    "bounded-source-architecture-slice",
    "no-bulk-course-generation",
    "review-packages-ready",
    "owner-gates-requested-not-accepted",
    "future-invocations-require-fresh-a18-a11-a22-gates"
  ],
  bulkCourseGenerationAllowed: false,
  canMarkThreadGoalComplete: false,
  futureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
  goalGate: {} as MathSceneV2SourceArchitectureHandoff["goalGate"],
  goalOwnerStatusManifest:
    "A06=passed;A11=partial-blocked;A18=blocked;A22=blocked",
  largestReviewSliceFileCount: 24,
  maxFilesPerReviewSlice: 24,
  openOwnerGateIds: [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ],
  requiredOwnerGateIds: [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ],
  reviewPackageCount: 8,
  reviewPackageHandoffStatus: "ready-for-package-review",
  reviewSliceCount: 20,
  reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
  reviewSliceStatus: "ready-for-slice-review",
  reviewSliceSummary: "20@24",
  sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
  status: "source-architecture-ready-owner-gates-open",
  summary:
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice:reviewPackages=8:reviewSlices=20@24:ownerGatesOpen=a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
} satisfies MathSceneV2SourceArchitectureHandoff;

type AcceptanceActionFixture = {
  action: string;
  actionId: MathSceneV2CompletionAcceptanceAction["actionId"];
  ownerAgentIds: readonly string[];
  supportingAgentIds: readonly string[];
  workstreamId: MathSceneV2GoalGateId;
};

function acceptanceActionFixture({
  action,
  actionId,
  ownerAgentIds,
  supportingAgentIds,
  workstreamId
}: AcceptanceActionFixture): MathSceneV2CompletionAcceptanceAction {
  return {
    acceptanceCriteria: [
      `${actionId} must record owner evidence before closure.`,
      `${actionId} must preserve the ${workstreamId} gate evidence.`
    ],
    action,
    actionId,
    blockingItems: [`${actionId}-blocker`],
    ownerAgentIds,
    ownerEvidenceStatus: "pending-owner-evidence",
    prerequisiteEvidenceSourceIds: [`${actionId}-source`],
    supportingAgentIds,
    verificationEvidenceIds: [`${actionId}-evidence-a`, `${actionId}-evidence-b`],
    workstreamId
  };
}

function acceptanceChecklistFixture(): MathSceneV2CompletionAcceptanceChecklist {
  const actions = [
    acceptanceActionFixture({
      action: "adopt HK split regression package",
      actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "keep non-HK tracks out of HK demo sweep",
      actionId: "a11-browser-visual-interaction-regression:keep-non-hk-tracks-out-of-hk-demo-sweep",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "update premium projection expected list",
      actionId: "a11-browser-visual-interaction-regression:update-projection-views-expected-list",
      ownerAgentIds: ["A06", "A11"],
      supportingAgentIds: ["A22"],
      workstreamId: "a11-browser-visual-interaction-regression"
    }),
    acceptanceActionFixture({
      action: "complete A18 final criterion decisions",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "complete A18 final scene signoff",
      actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-scene-signoff",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "inspect rendered scene targets",
      actionId: "a18-a06-teaching-quality-confirmation:inspect-rendered-scene-targets",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "open rendered review routes",
      actionId: "a18-a06-teaching-quality-confirmation:open-rendered-review-routes",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "record approve or revision decision",
      actionId: "a18-a06-teaching-quality-confirmation:record-approve-or-revision-decision",
      ownerAgentIds: ["A18", "A06"],
      supportingAgentIds: [],
      workstreamId: "a18-a06-teaching-quality-confirmation"
    }),
    acceptanceActionFixture({
      action: "investigate isolated Next chunk serving",
      actionId: "a22-clean-release-gate:investigate-isolated-next-chunk-serving-after-broad-timeout",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "release from clean worktree or reviewed staging slice",
      actionId: "a22-clean-release-gate:release-from-clean-worktree-or-reviewed-pruned-staging-slice",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    }),
    acceptanceActionFixture({
      action: "run generated artifact cleanup after evidence preservation",
      actionId: "a22-clean-release-gate:run-a22-generated-artifact-cleanup-after-preserving-evidence",
      ownerAgentIds: ["A22"],
      supportingAgentIds: ["A06", "A11"],
      workstreamId: "a22-clean-release-gate"
    })
  ];

  return {
    acceptedOwnerEvidenceCount: 0,
    a11RequiredRootDataAttributeCount,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    actionCount: actions.length,
    actions,
    canMarkThreadGoalComplete: false,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    pendingOwnerEvidenceCount: actions.length,
    reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount,
    reviewSliceFileManifest,
    reviewSliceIds,
    reviewSliceSummary,
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceContract: MATH_SCENE_V2_COMPLETION_ACCEPTANCE_CHECKLIST_SOURCE_CONTRACT,
    status: "pending-owner-evidence",
    summary: "mathSceneV2CompletionAcceptanceChecklist:status=pending-owner-evidence:actions=11:reviewSlices=20@24",
    workstreamCount: 3,
    workstreams: [
      {
        actionCount: 3,
        pendingOwnerEvidenceCount: 3,
        workstreamId: "a11-browser-visual-interaction-regression"
      },
      {
        actionCount: 5,
        pendingOwnerEvidenceCount: 5,
        workstreamId: "a18-a06-teaching-quality-confirmation"
      },
      {
        actionCount: 3,
        pendingOwnerEvidenceCount: 3,
        workstreamId: "a22-clean-release-gate"
      }
    ]
  };
}

function acceptedRecordsForEveryRequiredEvidence() {
  return acceptanceChecklistFixture().actions.flatMap((action) =>
    action.verificationEvidenceIds.map((evidenceId) => ({
      actionId: action.actionId,
      evidenceId,
      ownerAgentIds: action.ownerAgentIds,
      status: "accepted" as const
    }))
  );
}

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function reviewSliceFixture() {
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  return buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
}

test("MAIS Manim v2 owner evidence request packet groups missing evidence by accountable owner", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake
  });

  assert.equal(packet.sourceContract, MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "pending-owner-evidence");
  assert.equal(packet.ownerPacketCount, 3);
  assert.equal(packet.actionRequestCount, 11);
  assert.equal(packet.missingEvidenceCount, 22);
  assert.equal(packet.submissionRecordTemplateCount, 22);
  assert.equal(packet.submissionRecordTemplates?.length, 22);
  assert.deepEqual(packet.submissionRecordTemplates?.[0], {
    actionId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages",
    evidenceId: "a11-browser-visual-interaction-regression:adopt-hk-grade-split-packages-evidence-a",
    ownerAgentIds: ["A06", "A11"],
    status: "accepted",
    submitterAgentId: "A11",
    workstreamId: "a11-browser-visual-interaction-regression"
  });
  assert.deepEqual(packet.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(
    packet.ownerPackets.map((ownerPacket) => [
      ownerPacket.ownerAgentId,
      ownerPacket.actionRequestCount,
      ownerPacket.missingEvidenceCount,
      ownerPacket.submissionRecordTemplateCount,
      ownerPacket.submissionRecordTemplates?.length
    ]),
    [
      ["A11", 3, 6, 6, 6],
      ["A18", 5, 10, 10, 10],
      ["A22", 3, 6, 6, 6]
    ]
  );

  const a18Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");
  assert.ok(a18Packet);
  assert.equal(a18Packet.supportingAgentIds.includes("A06"), true);
  assert.deepEqual(a18Packet.actionRequests[0].evidenceRecordTemplates[0].ownerAgentIds, ["A18", "A06"]);
  assert.deepEqual(a18Packet.submissionRecordTemplates[0], {
    actionId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions",
    evidenceId: "a18-a06-teaching-quality-confirmation:complete-a18-final-criterion-decisions-evidence-a",
    ownerAgentIds: ["A18", "A06"],
    status: "accepted",
    submitterAgentId: "A18",
    workstreamId: "a18-a06-teaching-quality-confirmation"
  });
});

test("MAIS Manim v2 owner evidence request packet reuses completion evidence intake review-slice provenance", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.equal((packet as { reviewSliceCount?: number }).reviewSliceCount, intake.reviewSliceCount);
  assert.equal((packet as { reviewSliceIds?: string }).reviewSliceIds, intake.reviewSliceIds);
  assert.equal(
    (packet as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    intake.reviewSliceFileManifest
  );
  assert.equal(
    (packet as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    intake.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(packet.summary, /reviewSlices=20@24/);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-review-slices"], reviewSliceSummary);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-review-slice-count"], String(reviewSliceCount));
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-review-slice-ids"], reviewSliceIds);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-file-manifest"],
    reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceConsumerGateEvidenceIdManifest
  );
});

test("MAIS Manim v2 owner evidence request packet reuses completion evidence intake source-architecture blocker reasons", () => {
  const checklist = acceptanceChecklistFixture();
  checklist.sourceArchitectureBlockerReasonManifest = "duplicateReviewSliceFiles,unclassifiedManimFiles";
  checklist.sourceArchitectureBlockerReasons = ["duplicateReviewSliceFiles", "unclassifiedManimFiles"];
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.deepEqual(
    (packet as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    intake.sourceArchitectureBlockerReasons
  );
  assert.equal(
    (packet as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    intake.sourceArchitectureBlockerReasonManifest
  );
  assert.match(packet.summary, /sourceBlockers=duplicateReviewSliceFiles,unclassifiedManimFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-blocker-reasons"],
    "duplicateReviewSliceFiles,unclassifiedManimFiles"
  );
});

test("MAIS Manim v2 owner evidence request packet closes only when no evidence is missing", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, acceptedRecordsForEveryRequiredEvidence());
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake
  });

  assert.equal(packet.status, "owner-evidence-covered");
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.actionRequestCount, 0);
  assert.equal(packet.missingEvidenceCount, 0);
  assert.equal(packet.submissionRecordTemplateCount, 0);
  assert.deepEqual(packet.submissionRecordTemplates, []);
  assert.deepEqual(packet.ownerAgentIds, []);
});

test("MAIS Manim v2 owner evidence request packet blocks invalid duplicate owner evidence", () => {
  const checklist = acceptanceChecklistFixture();
  const records = acceptedRecordsForEveryRequiredEvidence();
  const duplicateRecord = records[0];
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, [
    ...records,
    { ...duplicateRecord }
  ]);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.equal(intake.status, "blocked-invalid-owner-evidence");
  assert.equal(packet.status, "blocked-invalid-owner-evidence");
  assert.equal(packet.invalidEvidenceRecordCount, 2);
  assert.deepEqual(packet.duplicateEvidenceIds, [duplicateRecord.evidenceId]);
  assert.deepEqual(packet.invalidOwnerAgentIds, duplicateRecord.ownerAgentIds);
  assert.equal(packet.actionRequestCount, 0);
  assert.equal(packet.missingEvidenceCount, 0);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-invalid-record-count"], "2");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-duplicate-evidence-ids"],
    duplicateRecord.evidenceId
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-invalid-owners"],
    duplicateRecord.ownerAgentIds.join(",")
  );
});

test("MAIS Manim v2 owner evidence request packet serializes stable attributes", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const reviewSlices = reviewSliceFixture();
  const reviewSliceAttributes = manimReviewPackageSliceDataAttributes(reviewSlices);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake,
    reviewSlices
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerEvidenceRequestPacket.ts"), "evidence");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-source-contract"], MATH_SCENE_V2_OWNER_EVIDENCE_REQUEST_PACKET_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-status"], "pending-owner-evidence");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-owner-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-action-count"], "11");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-missing-count"], "22");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-submission-record-template-count"], "22");
  assert.equal(
    (packet as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    checklist.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-action-evidence-count-manifest"],
    checklist.ownerActionEvidenceCountManifest
  );
  assert.equal(
    (packet as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    checklist.ownerEvidenceRequirementManifest
  );
  assert.equal(
    (packet as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    checklist.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (packet as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    checklist.a11RequiredRootDataAttributeCount
  );
  assert.equal(
    (packet as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    checklist.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-evidence-requirement-manifest"],
    checklist.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-acceptance-criteria-manifest"],
    checklist.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a11-required-root-attribute-count"],
    String(checklist.a11RequiredRootDataAttributeCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a11-run-from-beat-checkpoint-invalidation-attributes"],
    checklist.a11RunFromBeatCheckpointInvalidationDataAttributeManifest
  );
  assert.equal(
    (packet as { reviewSliceCount?: number }).reviewSliceCount,
    reviewSlices.sliceCount
  );
  assert.equal(
    (packet as { reviewSliceIds?: string }).reviewSliceIds,
    reviewSliceAttributes["data-viz-manim-review-slice-ids"]
  );
  assert.equal(
    (packet as { reviewSliceFileManifest?: string }).reviewSliceFileManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    (packet as { reviewSliceConsumerGateEvidenceIdManifest?: string }).reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-count"],
    String(reviewSlices.sliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-ids"],
    reviewSliceAttributes["data-viz-manim-review-slice-ids"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-file-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-file-manifest"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-review-slice-consumer-gate-evidence-id-manifest"],
    reviewSliceAttributes["data-viz-manim-review-slice-consumer-gate-evidence-id-manifest"]
  );
  assert.match(packet.summary, new RegExp(`reviewSlices=${reviewSlices.sliceCount}@24`));
  assert.match(packet.summary, /a11RootAttributes=5/);
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-invalid-record-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-duplicate-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-owner-evidence-request-invalid-owners"], "none");
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-count-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=actions:${ownerPacket.actionRequestCount}|missing:${ownerPacket.missingEvidenceCount}|support:${ownerPacket.supportingAgentIds.join("+") || "none"}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-missing-evidence-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .flatMap((request) => request.missingEvidenceIds)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-action-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.missingEvidenceIds.join("|")}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-action-label-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.action}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-next-action-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:submit:${request.missingEvidenceIds.join("+") || "none"}|workstream:${request.workstreamId}|support:${request.supportingAgentIds.join("+") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-submission-record-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.evidenceRecordTemplates
          .map((template) => `${template.evidenceId}:action=${template.actionId}|owners=${template.ownerAgentIds.join("+")}|status=${template.status}|workstream=${request.workstreamId}`)
          .join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-support-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.supportingAgentIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-blocker-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.blockingItems.join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-criteria-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.acceptanceCriteria.join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-prerequisite-source-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.prerequisiteEvidenceSourceIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-source-owner-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.sourceOwnerAgentIds.join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-workstream-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.workstreamId}`)
        .join(",")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-owner-template-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.actionRequests
        .map((request) => `${request.actionId}:${request.evidenceRecordTemplates
          .map((template) => `${template.evidenceId}@${template.ownerAgentIds.join("+")}@${template.status}`)
          .join("|") || "none"}`)
        .join(",")}`)
      .join(";")
  );
});

test("MAIS Manim v2 owner evidence request packet carries submission-bridge verified-closure gate manifests", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.equal(
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids"
    ]
  );
  assert.equal(
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ]
  );
  assert.equal(
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest"
    ]
  );
  assert.equal(
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ]
  );
  assert.deepEqual(packet.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames, [
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
  ]);
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ],
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-evidence-request-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    packet.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-evidence-request-summary"],
    /submissionBridgeVerifiedClosure=complete/
  );
});

test("MAIS Manim v2 owner evidence request packet carries A06 source confirmation status for A18 handoff", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake,
    a06SourceConfirmationLedger
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);
  const a18Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");

  assert.ok(a18Packet);
  assert.equal(packet.a06SourceConfirmationStatus, "a06-source-confirmed-a18-pending");
  assert.equal(packet.a06SourceConfirmedDecisionCount, 60);
  assert.equal(packet.a06SourceBlockedConfirmationCount, 0);
  assert.equal(packet.a06SourcePendingA18DecisionCount, 60);
  assert.equal(packet.a06SourceConfirmationCanCompleteA18Gate, false);
  assert.match(packet.summary, /a06SourceConfirmation=a06-source-confirmed-a18-pending/);
  assert.deepEqual(a18Packet.actionRequests[0].sourceOwnerAgentIds, ["A18", "A06"]);
  assert.equal(a18Packet.supportingAgentIds.includes("A06"), true);
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-confirmed-decision-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-pending-a18-decision-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-can-complete-a18-gate"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-confirmation-summary"],
    a06SourceConfirmationLedger.summary
  );
});

test("MAIS Manim v2 owner evidence request packet carries A06 source mismatch reasons for A18 handoff", () => {
  const mismatchReasons = ["a06-confirmation-count=55/60"];
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake,
    a06SourceConfirmationLedger: {
      ...a06SourceConfirmationLedger,
      a06ConfirmedDecisionCount: 55,
      confirmationCount: 55,
      pendingA18DecisionCount: 55,
      summary:
        "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=55/60:pendingA18=55"
    }
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.deepEqual(
    (packet as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.match(packet.summary, /a06SourceMismatch=a06-confirmation-count=55\/60/);
});

test("MAIS Manim v2 owner evidence request packet carries bounded source-architecture constraints to owner requests", () => {
  const checklist = acceptanceChecklistFixture();
  const intake = buildMathSceneV2CompletionEvidenceIntake(checklist, []);
  const packet = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist: checklist,
    evidenceIntake: intake,
    sourceArchitectureHandoff
  });
  const attributes = mathSceneV2OwnerEvidenceRequestPacketDataAttributes(packet);

  assert.equal(packet.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(packet.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(packet.sourceArchitectureFutureInvocationScope, "one-topic-one-concept-cluster-or-one-review-slice");
  assert.equal(packet.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(packet.sourceArchitectureRequiredOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.deepEqual(packet.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.ok(packet.ownerPackets.every((ownerPacket) => ownerPacket.sourceArchitectureBulkCourseGenerationAllowed === false));
  assert.ok(
    packet.ownerPackets.every(
      (ownerPacket) =>
        ownerPacket.sourceArchitectureFutureInvocationScope ===
        "one-topic-one-concept-cluster-or-one-review-slice"
    )
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-evidence-request-source-architecture-owner-scope-manifest"],
    "A11=one-topic-one-concept-cluster-or-one-review-slice;A18=one-topic-one-concept-cluster-or-one-review-slice;A22=one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.match(packet.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(attributes["data-viz-manim-v2-owner-evidence-request-summary"], /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});
