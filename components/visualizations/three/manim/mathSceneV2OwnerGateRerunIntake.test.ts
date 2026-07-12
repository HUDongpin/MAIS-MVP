import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  type MathSceneV2CompletionRerunPlan,
  MATH_SCENE_V2_COMPLETION_RERUN_PLAN_SOURCE_CONTRACT
} from "./mathSceneV2CompletionRerunPlan";
import {
  buildMathSceneV2OwnerGateRerunIntake,
  mathSceneV2OwnerGateRerunIntakeDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateRerunRecord
} from "./mathSceneV2OwnerGateRerunIntake";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";

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

function coveredOwnerEvidenceRerunPlanFixture(): MathSceneV2CompletionRerunPlan {
  return {
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
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateRerunIntake.ts",
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
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "keep-non-hk-tracks-out-of-hk-demo-sweep",
          "update-projection-views-expected-list"
        ],
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
        requiredActions: [
          "complete-a18-final-criterion-decisions",
          "complete-a18-final-scene-signoff",
          "inspect-rendered-scene-targets",
          "open-rendered-review-routes",
          "record-approve-or-revision-decision"
        ],
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
        blockingItems: ["a22-dirty-root-release-blocked", "a22-release-preflight-disk-blocked"],
        kind: "owner-gate-rerun",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A22"],
        prerequisiteStepIds: [],
        requiredActions: [
          "investigate-isolated-next-chunk-serving-after-broad-timeout",
          "release-from-clean-worktree-or-reviewed-pruned-staging-slice",
          "run-a22-generated-artifact-cleanup-after-preserving-evidence"
        ],
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
          "a22-dirty-root-release-blocked",
          "a22-release-preflight-disk-blocked"
        ],
        kind: "final-objective-audit",
        missingEvidenceCount: 0,
        ownerAgentIds: ["A11", "A18", "A22"],
        prerequisiteStepIds: [
          "01-owner-gate-A11",
          "02-owner-gate-A18",
          "03-owner-gate-A22"
        ],
        requiredActions: [
          "adopt-hk-grade-split-packages",
          "complete-a18-final-criterion-decisions",
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
}

function acceptedGateRerunRecords(): MathSceneV2OwnerGateRerunRecord[] {
  return coveredOwnerEvidenceRerunPlanFixture()
    .steps
    .filter((step) => step.kind === "owner-gate-rerun")
    .map((step) => ({
      evidenceId: `accepted-${step.ownerAgentIds[0]}-gate-rerun`,
      ownerAgentId: step.ownerAgentIds[0],
      rerunTarget: step.rerunTarget,
      status: "accepted" as const,
      stepId: step.stepId
    }));
}

test("MAIS Manim v2 owner gate rerun intake keeps covered evidence pending until owner gates rerun", () => {
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const intake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);

  assert.equal(rerunPlan.status, "owner-gate-reruns-required");
  assert.equal(rerunPlan.ownerGateRerunStepCount, 3);
  assert.equal(rerunPlan.ownerEvidenceStepCount, 0);
  assert.equal(intake.sourceContract, MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "pending-owner-gate-reruns");
  assert.equal(intake.rerunStepCount, 3);
  assert.equal(intake.acceptedGateCount, 0);
  assert.equal(intake.pendingGateCount, 3);
  assert.equal(intake.blockedGateCount, 0);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.deepEqual(intake.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.deepEqual(intake.rows.map((row) => row.status), [
    "pending-owner-gate-rerun",
    "pending-owner-gate-rerun",
    "pending-owner-gate-rerun"
  ]);
});

test("MAIS Manim v2 owner gate rerun intake accepts all owner gate reruns but waits for final audit", () => {
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const intake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());

  assert.equal(intake.status, "owner-gate-reruns-covered");
  assert.equal(intake.rerunStepCount, 3);
  assert.equal(intake.acceptedGateCount, 3);
  assert.equal(intake.pendingGateCount, 0);
  assert.equal(intake.blockedGateCount, 0);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.readyForFinalAudit, true);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.deepEqual(intake.rows.map((row) => row.acceptedEvidenceId), [
    "accepted-A11-gate-rerun",
    "accepted-A18-gate-rerun",
    "accepted-A22-gate-rerun"
  ]);
});

test("MAIS Manim v2 owner gate rerun intake blocks duplicate owner gate rerun evidence IDs", () => {
  const records = acceptedGateRerunRecords();
  const duplicateEvidenceId = records[0]?.evidenceId;
  assert.ok(duplicateEvidenceId);
  const duplicateRecords = records.map((record, index) =>
    index === 1 ? { ...record, evidenceId: duplicateEvidenceId } : record
  );
  const duplicateEvidenceRows = duplicateRecords
    .slice(0, 2)
    .map((record) => `${record.ownerAgentId}:${record.stepId}`)
    .sort();

  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    duplicateRecords
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.deepEqual(intake.duplicateRecordEvidenceIds, [duplicateEvidenceId]);
  assert.deepEqual(intake.duplicateRecordEvidenceIdRows, duplicateEvidenceRows);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-ids"],
    duplicateEvidenceId
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-id-rows"],
    duplicateEvidenceRows.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    new RegExp(`duplicateRecordIds=${duplicateEvidenceId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /duplicateRecordIdRows=A/
  );
});

test("MAIS Manim v2 owner gate rerun intake blocks duplicate owner gate rerun step submissions", () => {
  const records = acceptedGateRerunRecords();
  const duplicatedRecord = records[0];
  assert.ok(duplicatedRecord);
  const duplicateStepKey = `${duplicatedRecord.ownerAgentId}:${duplicatedRecord.stepId}`;
  const duplicateRecords = [
    ...records,
    {
      ...duplicatedRecord,
      evidenceId: `${duplicatedRecord.evidenceId}-duplicate-step`
    }
  ];
  const duplicateStepEvidenceIds = [
    duplicatedRecord.evidenceId,
    `${duplicatedRecord.evidenceId}-duplicate-step`
  ].sort();

  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    duplicateRecords
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.deepEqual(intake.duplicateRecordStepIds, [duplicateStepKey]);
  assert.deepEqual(intake.duplicateRecordStepEvidenceIds, duplicateStepEvidenceIds);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-steps"],
    duplicateStepKey
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-step-evidence-ids"],
    duplicateStepEvidenceIds.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    new RegExp(`duplicateRecordSteps=${duplicateStepKey}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /duplicateStepEvidenceIds=accepted-A11-gate-rerun/
  );
});

test("MAIS Manim v2 owner gate rerun intake blocks non-canonical owner gate evidence IDs", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalRecord = records[0];
  assert.ok(nonCanonicalRecord);
  const paddedEvidenceId = ` ${nonCanonicalRecord.evidenceId} `;
  const nonCanonicalEvidenceRow = `${nonCanonicalRecord.ownerAgentId}:${nonCanonicalRecord.stepId}`;
  const nonCanonicalRecords = records.map((record, index) =>
    index === 0 ? { ...record, evidenceId: paddedEvidenceId } : record
  );

  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    nonCanonicalRecords
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIds, [paddedEvidenceId]);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIdRows, [nonCanonicalEvidenceRow]);
  assert.equal(intake.missingRecordEvidenceIdCount, 0);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.deepEqual(
    intake.invalidRecords.map((record) => record.evidenceId),
    [paddedEvidenceId]
  );
  assert.equal(
    intake.rows.find((row) => row.ownerAgentId === nonCanonicalRecord.ownerAgentId)?.status,
    "pending-owner-gate-rerun"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-record-ids"],
    paddedEvidenceId
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-record-id-rows"],
    nonCanonicalEvidenceRow
  );
  assert.ok(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"]
      .includes(`nonCanonicalRecordIds=${paddedEvidenceId}`)
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalRecordIdRows=A11:/
  );
});

test("MAIS Manim v2 owner gate rerun intake keeps non-canonical owner gate evidence IDs out of duplicate diagnostics", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalRecords = records.filter((record) =>
    record.ownerAgentId === "A11" || record.ownerAgentId === "A18"
  );
  assert.equal(nonCanonicalRecords.length, 2);
  const paddedEvidenceId = " padded-owner-gate-rerun-evidence ";
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      nonCanonicalRecords.some((nonCanonicalRecord) => nonCanonicalRecord.evidenceId === record.evidenceId)
        ? {
            ...record,
            evidenceId: paddedEvidenceId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 1);
  assert.equal(intake.pendingGateCount, 2);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.missingRecordEvidenceIdCount, 0);
  assert.deepEqual(intake.duplicateRecordEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIds, [paddedEvidenceId]);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-record-ids"],
    paddedEvidenceId
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /duplicateRecordIds=none/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalRecordIds= padded-owner-gate-rerun-evidence /
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes missing owner gate rerun evidence IDs", () => {
  const records = acceptedGateRerunRecords();
  const missingEvidenceRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(missingEvidenceRecord);
  const blankEvidenceId = "   ";
  const missingEvidenceRow = `${missingEvidenceRecord.ownerAgentId}:${missingEvidenceRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === missingEvidenceRecord.evidenceId
        ? {
            ...record,
            evidenceId: blankEvidenceId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordEvidenceIdCount, 1);
  assert.deepEqual(intake.missingRecordEvidenceIdRows, [missingEvidenceRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${missingEvidenceRecord.ownerAgentId}:${missingEvidenceRecord.stepId}:${blankEvidenceId}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-rows"],
    missingEvidenceRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingRecordIds=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingRecordIdRows=A18:/
  );
});

test("MAIS Manim v2 owner gate rerun intake keeps missing owner gate evidence IDs out of duplicate diagnostics", () => {
  const records = acceptedGateRerunRecords();
  const missingEvidenceRecords = records.filter((record) =>
    record.ownerAgentId === "A11" || record.ownerAgentId === "A18"
  );
  assert.equal(missingEvidenceRecords.length, 2);
  const blankEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      missingEvidenceRecords.some((missingRecord) => missingRecord.evidenceId === record.evidenceId)
        ? {
            ...record,
            evidenceId: blankEvidenceId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 1);
  assert.equal(intake.pendingGateCount, 2);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.missingRecordEvidenceIdCount, 2);
  assert.deepEqual(intake.duplicateRecordEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalRecordEvidenceIds, []);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-count"],
    "2"
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /duplicateRecordIds=none/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingRecordIds=2/
  );
});

test("MAIS Manim v2 owner gate rerun intake treats omitted owner gate rerun evidence IDs as missing", () => {
  const records = acceptedGateRerunRecords();
  const missingEvidenceRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(missingEvidenceRecord);
  const recordWithoutEvidenceId = {
    ownerAgentId: missingEvidenceRecord.ownerAgentId,
    rerunTarget: missingEvidenceRecord.rerunTarget,
    status: missingEvidenceRecord.status,
    stepId: missingEvidenceRecord.stepId
  } as unknown as MathSceneV2OwnerGateRerunRecord;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === missingEvidenceRecord.evidenceId
        ? recordWithoutEvidenceId
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordEvidenceIdCount, 1);
  assert.deepEqual(
    intake.invalidRecords.map((record) => {
      const evidenceId = String((record as { evidenceId?: unknown }).evidenceId ?? "missing");
      return `${record.ownerAgentId}:${record.stepId}:${evidenceId}`;
    }),
    [`${missingEvidenceRecord.ownerAgentId}:${missingEvidenceRecord.stepId}:missing`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-record-id-count"],
    "1"
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingRecordIds=1/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes missing owner gate rerun step IDs", () => {
  const records = acceptedGateRerunRecords();
  const missingStepRecord = records.find((record) => record.ownerAgentId === "A22");
  assert.ok(missingStepRecord);
  const blankStepId = "   ";
  const missingStepRow = `${missingStepRecord.ownerAgentId}:${missingStepRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === missingStepRecord.evidenceId
        ? {
            ...record,
            evidenceId: "missing-owner-gate-rerun-step-id",
            stepId: blankStepId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordStepIdCount, 1);
  assert.deepEqual(intake.missingRecordStepIdRows, [missingStepRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${missingStepRecord.ownerAgentId}:${blankStepId}:missing-owner-gate-rerun-step-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-step-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-step-id-rows"],
    missingStepRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingStepIds=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingStepIdRows=A22:/
  );
});

test("MAIS Manim v2 owner gate rerun intake keeps missing owner gate step IDs out of duplicate diagnostics", () => {
  const records = acceptedGateRerunRecords();
  const missingStepRecord = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(missingStepRecord);
  const blankStepId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    [
      ...records.filter((record) => record.evidenceId !== missingStepRecord.evidenceId),
      {
        ...missingStepRecord,
        evidenceId: "missing-owner-gate-rerun-step-id-a",
        stepId: blankStepId
      } as MathSceneV2OwnerGateRerunRecord,
      {
        ...missingStepRecord,
        evidenceId: "missing-owner-gate-rerun-step-id-b",
        stepId: blankStepId
      } as MathSceneV2OwnerGateRerunRecord
    ]
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.missingRecordStepIdCount, 2);
  assert.deepEqual(intake.duplicateRecordStepIds, []);
  assert.deepEqual(intake.nonCanonicalRecordStepIds, []);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-duplicate-record-steps"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-step-id-count"],
    "2"
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /duplicateRecordSteps=none/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingStepIds=2/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes non-canonical owner gate rerun step IDs", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalStepRecord = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(nonCanonicalStepRecord);
  const paddedStepId = ` ${nonCanonicalStepRecord.stepId} `;
  const nonCanonicalStepRow = `${nonCanonicalStepRecord.ownerAgentId}:${nonCanonicalStepRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === nonCanonicalStepRecord.evidenceId
        ? {
            ...record,
            evidenceId: "non-canonical-owner-gate-rerun-step-id",
            stepId: paddedStepId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordStepIdCount, 0);
  assert.deepEqual(intake.nonCanonicalRecordStepIds, [paddedStepId]);
  assert.deepEqual(intake.nonCanonicalRecordStepIdRows, [nonCanonicalStepRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${nonCanonicalStepRecord.ownerAgentId}:${paddedStepId}:non-canonical-owner-gate-rerun-step-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-step-ids"],
    paddedStepId
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-step-id-rows"],
    nonCanonicalStepRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalStepIds= /
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalStepIdRows=A11:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes unknown owner gate rerun step IDs", () => {
  const records = acceptedGateRerunRecords();
  const unknownStepRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(unknownStepRecord);
  const unknownStepId = "not-a-requested-owner-gate-step";
  const unknownStepRow = `${unknownStepRecord.ownerAgentId}:${unknownStepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === unknownStepRecord.evidenceId
        ? {
            ...record,
            evidenceId: "unknown-owner-gate-rerun-step-id",
            stepId: unknownStepId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unknownRecordStepIds, [unknownStepRow]);
  assert.deepEqual(intake.mismatchedRecordOwnerAgentRows, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${unknownStepRecord.ownerAgentId}:${unknownStepId}:unknown-owner-gate-rerun-step-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-unknown-step-ids"],
    unknownStepRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /unknownStepIds=A18:not-a-requested-owner-gate-step/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes mismatched rerun targets", () => {
  const records = acceptedGateRerunRecords();
  const mismatchedRecord = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(mismatchedRecord);
  const mismatchedTarget = "mathSceneV2ObjectiveCompletionAudit";
  const mismatchedTargetRow = `${mismatchedRecord.ownerAgentId}:${mismatchedRecord.stepId}:${mismatchedTarget}->${mismatchedRecord.rerunTarget}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === mismatchedRecord.evidenceId
        ? {
            ...record,
            evidenceId: "mismatched-owner-gate-rerun-target",
            rerunTarget: mismatchedTarget
          }
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.mismatchedRecordRerunTargets, [mismatchedTargetRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.rerunTarget}`),
    [`${mismatchedRecord.ownerAgentId}:${mismatchedRecord.stepId}:${mismatchedTarget}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-mismatched-targets"],
    mismatchedTargetRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /mismatchedTargets=A11:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes missing owner gate rerun targets", () => {
  const records = acceptedGateRerunRecords();
  const missingTargetRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(missingTargetRecord);
  const blankTarget = "   ";
  const missingTargetRow = `${missingTargetRecord.ownerAgentId}:${missingTargetRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === missingTargetRecord.evidenceId
        ? {
            ...record,
            evidenceId: "missing-owner-gate-rerun-target",
            rerunTarget: blankTarget
          } as unknown as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordRerunTargetCount, 1);
  assert.deepEqual(intake.missingRecordRerunTargetRows, [missingTargetRow]);
  assert.deepEqual(intake.mismatchedRecordRerunTargets, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.rerunTarget}`),
    [`${missingTargetRecord.ownerAgentId}:${missingTargetRecord.stepId}:${blankTarget}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-target-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-target-rows"],
    missingTargetRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingTargets=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingTargetRows=A18:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes non-canonical owner gate rerun targets", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalTargetRecord = records.find((record) => record.ownerAgentId === "A22");
  assert.ok(nonCanonicalTargetRecord);
  const paddedTarget = ` ${nonCanonicalTargetRecord.rerunTarget} `;
  const nonCanonicalTargetRow = `${nonCanonicalTargetRecord.ownerAgentId}:${nonCanonicalTargetRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === nonCanonicalTargetRecord.evidenceId
        ? {
            ...record,
            evidenceId: "non-canonical-owner-gate-rerun-target",
            rerunTarget: paddedTarget
          } as unknown as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordRerunTargetCount, 0);
  assert.deepEqual(intake.nonCanonicalRecordRerunTargets, [paddedTarget]);
  assert.deepEqual(intake.nonCanonicalRecordRerunTargetRows, [nonCanonicalTargetRow]);
  assert.deepEqual(intake.mismatchedRecordRerunTargets, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.rerunTarget}`),
    [`${nonCanonicalTargetRecord.ownerAgentId}:${nonCanonicalTargetRecord.stepId}:${paddedTarget}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-targets"],
    paddedTarget
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-target-rows"],
    nonCanonicalTargetRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalTargets= /
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalTargetRows=A22:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes missing owner gate rerun statuses", () => {
  const records = acceptedGateRerunRecords();
  const blankStatusRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(blankStatusRecord);
  const blankStatus = "   ";
  const missingStatusRow = `${blankStatusRecord.ownerAgentId}:${blankStatusRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === blankStatusRecord.evidenceId
        ? {
            ...record,
            evidenceId: "missing-owner-gate-rerun-status",
            status: blankStatus
          } as unknown as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordStatusCount, 1);
  assert.deepEqual(intake.missingRecordStatusRows, [missingStatusRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${String(record.status)}`),
    [`${blankStatusRecord.ownerAgentId}:${blankStatusRecord.stepId}:${blankStatus}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-status-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-status-rows"],
    missingStatusRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingStatuses=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingStatusRows=A18:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes unsupported owner gate rerun statuses", () => {
  const records = acceptedGateRerunRecords();
  const unsupportedStatusRecord = records.find((record) => record.ownerAgentId === "A22");
  assert.ok(unsupportedStatusRecord);
  const unsupportedStatus = "passed";
  const unsupportedStatusRow = `${unsupportedStatusRecord.ownerAgentId}:${unsupportedStatusRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === unsupportedStatusRecord.evidenceId
        ? {
            ...record,
            evidenceId: "unsupported-owner-gate-rerun-status",
            status: unsupportedStatus
          } as unknown as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.unsupportedRecordStatuses, [unsupportedStatus]);
  assert.deepEqual(intake.unsupportedRecordStatusRows, [unsupportedStatusRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${String(record.status)}`),
    [`${unsupportedStatusRecord.ownerAgentId}:${unsupportedStatusRecord.stepId}:${unsupportedStatus}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-unsupported-statuses"],
    unsupportedStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-unsupported-status-rows"],
    unsupportedStatusRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /unsupportedStatuses=passed/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /unsupportedStatusRows=A22:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes non-canonical owner gate rerun statuses", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalStatusRecord = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(nonCanonicalStatusRecord);
  const nonCanonicalStatus = " accepted ";
  const nonCanonicalStatusRow = `${nonCanonicalStatusRecord.ownerAgentId}:${nonCanonicalStatusRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === nonCanonicalStatusRecord.evidenceId
        ? {
            ...record,
            evidenceId: "non-canonical-owner-gate-rerun-status",
            status: nonCanonicalStatus
          } as unknown as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordStatuses, [nonCanonicalStatus]);
  assert.deepEqual(intake.nonCanonicalRecordStatusRows, [nonCanonicalStatusRow]);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${String(record.status)}`),
    [`${nonCanonicalStatusRecord.ownerAgentId}:${nonCanonicalStatusRecord.stepId}:${nonCanonicalStatus}`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-statuses"],
    nonCanonicalStatus
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-status-rows"],
    nonCanonicalStatusRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalStatuses= accepted /
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalStatusRows=A11:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes missing owner gate rerun owner agent IDs", () => {
  const records = acceptedGateRerunRecords();
  const missingOwnerRecord = records.find((record) => record.ownerAgentId === "A18");
  assert.ok(missingOwnerRecord);
  const blankOwnerAgentId = "   ";
  const missingOwnerRow = `${missingOwnerRecord.ownerAgentId}:${missingOwnerRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === missingOwnerRecord.evidenceId
        ? {
            ...record,
            evidenceId: "missing-owner-gate-rerun-owner-agent-id",
            ownerAgentId: blankOwnerAgentId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordOwnerAgentIdCount, 1);
  assert.deepEqual(intake.missingRecordOwnerAgentIdRows, [missingOwnerRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${blankOwnerAgentId}:${missingOwnerRecord.stepId}:missing-owner-gate-rerun-owner-agent-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-owner-agent-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-missing-owner-agent-id-rows"],
    missingOwnerRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingOwnerAgentIds=1/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /missingOwnerAgentIdRows=A18:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes non-canonical owner gate rerun owner agent IDs", () => {
  const records = acceptedGateRerunRecords();
  const nonCanonicalOwnerRecord = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(nonCanonicalOwnerRecord);
  const paddedOwnerAgentId = ` ${nonCanonicalOwnerRecord.ownerAgentId} `;
  const nonCanonicalOwnerRow = `${nonCanonicalOwnerRecord.ownerAgentId}:${nonCanonicalOwnerRecord.stepId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === nonCanonicalOwnerRecord.evidenceId
        ? {
            ...record,
            evidenceId: "non-canonical-owner-gate-rerun-owner-agent-id",
            ownerAgentId: paddedOwnerAgentId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordOwnerAgentIdCount, 0);
  assert.deepEqual(intake.nonCanonicalRecordOwnerAgentIds, [paddedOwnerAgentId]);
  assert.deepEqual(intake.nonCanonicalRecordOwnerAgentIdRows, [nonCanonicalOwnerRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${paddedOwnerAgentId}:${nonCanonicalOwnerRecord.stepId}:non-canonical-owner-gate-rerun-owner-agent-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-owner-agent-ids"],
    paddedOwnerAgentId
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-non-canonical-owner-agent-id-rows"],
    nonCanonicalOwnerRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalOwnerAgentIds= A11 /
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /nonCanonicalOwnerAgentIdRows=A11:/
  );
});

test("MAIS Manim v2 owner gate rerun intake exposes mismatched owner gate rerun owner agent IDs", () => {
  const records = acceptedGateRerunRecords();
  const a11Record = records.find((record) => record.ownerAgentId === "A11");
  assert.ok(a11Record);
  const wrongOwnerAgentId = "A22";
  const mismatchedOwnerRow = `${wrongOwnerAgentId}:${a11Record.stepId}->${a11Record.ownerAgentId}`;
  const intake = buildMathSceneV2OwnerGateRerunIntake(
    coveredOwnerEvidenceRerunPlanFixture(),
    records.map((record) =>
      record.evidenceId === a11Record.evidenceId
        ? {
            ...record,
            evidenceId: "mismatched-owner-gate-rerun-owner-agent-id",
            ownerAgentId: wrongOwnerAgentId
          } as MathSceneV2OwnerGateRerunRecord
        : record
    )
  );
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.missingRecordOwnerAgentIdCount, 0);
  assert.deepEqual(intake.nonCanonicalRecordOwnerAgentIds, []);
  assert.deepEqual(intake.mismatchedRecordOwnerAgentRows, [mismatchedOwnerRow]);
  assert.deepEqual(
    intake.invalidRecords.map((record) => `${record.ownerAgentId}:${record.stepId}:${record.evidenceId}`),
    [`${wrongOwnerAgentId}:${a11Record.stepId}:mismatched-owner-gate-rerun-owner-agent-id`]
  );
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-mismatched-owner-agent-rows"],
    mismatchedOwnerRow
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-summary"],
    /mismatchedOwnerAgentIds=A22:/
  );
});

test("MAIS Manim v2 owner gate rerun intake blocks final audit when one owner rerun is blocked", () => {
  const records = acceptedGateRerunRecords().map((record) =>
    record.ownerAgentId === "A22"
      ? { ...record, evidenceId: "blocked-A22-clean-release-rerun", status: "blocked" as const }
      : record
  );
  const intake = buildMathSceneV2OwnerGateRerunIntake(coveredOwnerEvidenceRerunPlanFixture(), records);

  assert.equal(intake.status, "blocked-owner-gate-rerun");
  assert.equal(intake.acceptedGateCount, 2);
  assert.equal(intake.pendingGateCount, 0);
  assert.equal(intake.blockedGateCount, 1);
  assert.equal(intake.readyForFinalAudit, false);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(intake.rows.find((row) => row.ownerAgentId === "A22")?.status, "blocked-owner-gate-rerun");
});

test("MAIS Manim v2 owner gate rerun intake carries rerun-plan source-architecture constraints", () => {
  const rerunPlan: MathSceneV2CompletionRerunPlan = {
    ...coveredOwnerEvidenceRerunPlanFixture(),
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
  const intake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, acceptedGateRerunRecords());
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(intake.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(intake.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(
    intake.sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(intake.sourceArchitectureSourceContract, MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT);
  assert.deepEqual(intake.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-source-architecture-open-owner-gates"],
    "a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  );
  assert.match(intake.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
});

test("MAIS Manim v2 owner gate rerun intake serializes stable handoff attributes", () => {
  const rerunPlan = coveredOwnerEvidenceRerunPlanFixture();
  const intake = buildMathSceneV2OwnerGateRerunIntake(rerunPlan, []);
  const attributes = mathSceneV2OwnerGateRerunIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateRerunIntake.ts"), "evidence");
  assert.equal((intake as { reviewSliceCount?: number }).reviewSliceCount, rerunPlan.reviewSliceCount);
  assert.equal((intake as { reviewSliceIds?: string }).reviewSliceIds, rerunPlan.reviewSliceIds);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_RERUN_INTAKE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-status"], "pending-owner-gate-reruns");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-owner-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-accepted-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-pending-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-blocked-count"], "0");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-ready-for-final-audit"], "false");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-rerun-intake-can-complete"], "false");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-review-slice-count"],
    String(rerunPlan.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-review-slice-ids"],
    rerunPlan.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-review-slice-file-manifest"],
    rerunPlan.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-rerun-intake-review-slice-consumer-gate-evidence-id-manifest"],
    rerunPlan.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(intake.summary, /reviewSlices=20@24/);
});
