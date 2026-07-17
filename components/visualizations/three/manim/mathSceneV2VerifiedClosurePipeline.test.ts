import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { buildVisualizationBrowserRegressionEvidenceMatrix } from "../../visualizationBrowserRegressionEvidence";
import { buildVisualizationBrowserRegressionPlan } from "../../visualizationBrowserRegressionPackages";
import { buildVisualizationReleaseReadinessEvidence } from "../../visualizationReleaseReadinessEvidence";
import { buildManimReviewPackageHandoffMatrix } from "./mathSceneReviewPackageHandoff";
import { buildManimReviewPackageMatrix, classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildManimReviewPackageSliceMatrix } from "./mathSceneReviewPackageSlices";
import { buildMathSceneTeachingFinalDecisionIntake } from "./mathSceneTeachingFinalDecisionIntake";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  type MathSceneTeachingRenderedReviewLabLike
} from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import { buildMathSceneV2ClosureEvidencePackage } from "./mathSceneV2ClosureEvidencePackage";
import { buildMathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionClosureQueue } from "./mathSceneV2CompletionClosureQueue";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import { buildMathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";
import { buildMathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import { buildMathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import {
  type MathSceneV2FinalClosureAuditRecord
} from "./mathSceneV2FinalClosureAudit";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import { buildMathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import {
  type MathSceneV2OwnerGateRerunCommandEvidenceRecord
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import {
  buildMathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import {
  buildMathSceneV2VerifiedClosurePipeline,
  mathSceneV2VerifiedClosurePipelineDataAttributes,
  MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
} from "./mathSceneV2VerifiedClosurePipeline";

const manimDir = "components/visualizations/three/manim";
const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;
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
const browserRegressionLabs: MathSceneTeachingRenderedReviewLabLike[] = [
  ...renderedReviewLabs,
  {
    curriculumTrack: "MAINLAND_PEP_JUNIOR",
    grade: "S3",
    labId: "pep-junior-s3-lower-inverse-similarity-trigonometry",
    threeD: { enabled: true, familyId: "three-projection-views", premiumLaunch: true }
  }
];

function currentManimFileNames() {
  return fs
    .readdirSync(manimDir)
    .filter((fileName) => [".ts", ".tsx"].includes(path.extname(fileName)))
    .sort();
}

function acceptedRecordsForEveryRequiredEvidence(
  checklist: ReturnType<typeof buildMathSceneV2CompletionAcceptanceChecklist>
) {
  return checklist.actions.flatMap((action) =>
    action.verificationEvidenceIds.map((evidenceId) => ({
      actionId: action.actionId,
      evidenceId,
      ownerAgentIds: action.ownerAgentIds,
      status: "accepted" as const
    }))
  );
}

function verifiedClosureFixture() {
  const browserPlan = buildVisualizationBrowserRegressionPlan(browserRegressionLabs as never, { maxLabsPerPackage: 8 });
  const browserEvidence = buildVisualizationBrowserRegressionEvidenceMatrix(browserPlan);
  const teachingSignoff = buildMathSceneTeachingSignoffMatrix();
  const releaseReadiness = buildVisualizationReleaseReadinessEvidence({
    browserEvidence,
    teachingSignoff
  });
  const reviewPackages = buildManimReviewPackageMatrix(currentManimFileNames());
  const reviewSlices = buildManimReviewPackageSliceMatrix(reviewPackages, { maxFilesPerSlice: 24 });
  const teachingDossier = buildMathSceneTeachingReviewDossier();
  const teachingRenderedRoutes = buildMathSceneTeachingRenderedReviewRoutes(
    buildMathSceneTeachingInspectionTargetQueue(),
    renderedReviewLabs
  );
  const teachingFinalDecisionLedger = buildMathSceneTeachingFinalDecisionLedger(
    buildMathSceneTeachingFinalReviewPacket({
      dossier: teachingDossier,
      renderedRoutes: teachingRenderedRoutes
    })
  );
  const goalGate = buildMathSceneV2GoalGate({
    browserEvidence,
    releaseReadiness,
    reviewPackages,
    reviewSlices,
    teachingDossier
  });
  const releaseSliceManifest = buildMathSceneV2ReleaseSliceManifest({
    releaseReadiness,
    reviewPackages
  });
  const crossAgentHandoff = buildMathSceneV2CrossAgentHandoff({
    browserEvidence,
    goalGate,
    releaseReadiness,
    releaseSliceManifest,
    reviewHandoff: buildManimReviewPackageHandoffMatrix(reviewPackages),
    reviewSlices,
    teachingDossier,
    teachingFinalDecisionLedger,
    teachingRenderedRoutes
  });
  const acceptanceChecklist = buildMathSceneV2CompletionAcceptanceChecklist(
    buildMathSceneV2CompletionClosureQueue(crossAgentHandoff)
  );
  const evidenceIntake = buildMathSceneV2CompletionEvidenceIntake(
    acceptanceChecklist,
    acceptedRecordsForEveryRequiredEvidence(acceptanceChecklist)
  );
  const completionStatus = buildMathSceneV2CompletionStatusSummary({
    acceptanceChecklist,
    evidenceIntake,
    goalGate,
    releaseSliceManifest,
    reviewPackages,
    reviewSlices
  });
  const objectiveAudit = buildMathSceneV2ObjectiveCompletionAudit({
    completionStatus,
    crossAgentHandoff,
    evidenceIntake,
    teachingFinalDecisionIntake: buildMathSceneTeachingFinalDecisionIntake(teachingFinalDecisionLedger, [])
  });
  const ownerEvidenceRequestPacket = buildMathSceneV2OwnerEvidenceRequestPacket({
    acceptanceChecklist,
    evidenceIntake,
    reviewSlices
  });
  const rerunPlan = buildMathSceneV2CompletionRerunPlan(
    buildMathSceneV2ClosureEvidencePackage({
      objectiveAudit,
      ownerEvidenceRequestPacket
    })
  );
  const commandPacket = buildMathSceneV2OwnerGateRerunCommandPacket({
    browserPlan,
    releaseRunId: "manim-v2-a22-verified-closure-test",
    rerunPlan,
    teachingRenderedRoutes
  });

  return {
    commandPacket,
    objectiveAudit,
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

function acceptedFinalAuditRecord(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4-after-command-evidence",
    ownerGateRerunEvidenceIds: commandPacket.ownerPackets.map(
      (ownerPacket) => `accepted-${ownerPacket.ownerAgentId}-command-evidence-covered`
    ),
    provenRequirementCount: 4,
    requirementProofEvidenceIds: [...requirementProofEvidenceIds],
    requirementCount: 4,
    status: "accepted",
    target: "mathSceneV2ObjectiveCompletionAudit"
  };
}

test("MAIS Manim v2 verified closure pipeline waits for command-row evidence before owner gate completion", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: [],
    commandPacket,
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.sourceContract, MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT);
  assert.equal(pipeline.status, "pending-command-evidence");
  assert.equal(pipeline.commandEvidenceStatus, "pending-owner-command-evidence");
  assert.equal(pipeline.ownerGateRerunStatus, "pending-owner-gate-reruns");
  assert.equal(pipeline.finalClosureStatus, "pending-owner-gate-reruns");
  assert.equal(pipeline.acceptedCommandOwnerCount, 0);
  assert.equal(pipeline.pendingCommandOwnerCount, 3);
  assert.equal(pipeline.ownerGateRerunRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 verified closure pipeline waits for final objective audit after command evidence is covered", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: acceptedCommandRecords(commandPacket),
    commandPacket,
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2VerifiedClosurePipelineDataAttributes(pipeline);
  const expectedOwnerGateRerunRecordManifest = [
    "01-owner-gate-A11:owner=A11:target=a11-browser-visual-interaction-regression:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A11-command-evidence-covered:blockedEvidence=none",
    "02-owner-gate-A18:owner=A18:target=a18-a06-teaching-quality-confirmation:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A18-command-evidence-covered:blockedEvidence=none",
    "03-owner-gate-A22:owner=A22:target=a22-clean-release-gate:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A22-command-evidence-covered:blockedEvidence=none"
  ].join(";");

  assert.equal(pipeline.status, "ready-for-final-objective-audit");
  assert.equal(pipeline.commandEvidenceStatus, "owner-command-evidence-covered");
  assert.equal(pipeline.ownerGateRerunStatus, "owner-gate-reruns-covered");
  assert.equal(pipeline.finalClosureStatus, "ready-for-final-objective-audit");
  assert.equal(pipeline.acceptedCommandOwnerCount, 3);
  assert.equal(pipeline.ownerGateRerunRecordCount, 3);
  assert.equal(pipeline.ownerGateRerunRecordManifest, expectedOwnerGateRerunRecordManifest);
  assert.equal(pipeline.ownerActionEvidenceCountManifest, commandPacket.ownerActionEvidenceCountManifest);
  assert.equal(
    (pipeline as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    (pipeline as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-owner-action-evidence-count-manifest"],
    commandPacket.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-owner-acceptance-criteria-manifest"],
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-owner-evidence-requirement-manifest"],
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-owner-gate-rerun-record-manifest"],
    expectedOwnerGateRerunRecordManifest
  );
  assert.equal(pipeline.readyForFinalObjectiveAudit, true);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.ok(pipeline.summary.includes(`ownerAcceptanceCriteria=${commandPacket.ownerAcceptanceCriteriaManifest}`));
  assert.ok(pipeline.summary.includes(`ownerEvidenceRequirements=${commandPacket.ownerEvidenceRequirementManifest}`));
  assert.match(pipeline.summary, /ownerGateRerunRecords=01-owner-gate-A11:owner=A11/);
});

test("MAIS Manim v2 verified closure pipeline completes only after command evidence and final audit both pass", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: acceptedCommandRecords(commandPacket),
    commandPacket,
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "complete");
  assert.equal(pipeline.finalClosureStatus, "complete");
  assert.equal(pipeline.finalAuditRecordStatus, "accepted-final-objective-audit");
  assert.equal(pipeline.provenRequirementCount, 4);
  assert.deepEqual(pipeline.remainingOwnerAgentIds, []);
  assert.equal(pipeline.canMarkThreadGoalComplete, true);
});

test("MAIS Manim v2 verified closure pipeline propagates review-slice provenance mismatch blockers", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const staleRerunPlan = {
    ...rerunPlan,
    reviewSliceConsumerGateEvidenceIdManifest: "manim-review-slice-01=stale-command-closure",
    reviewSliceCount: objectiveAudit.reviewSliceCount - 1,
    reviewSliceFileManifest: "manim-review-slice-01=stale-command-closure.ts",
    reviewSliceIds: "manim-review-slice-01",
    reviewSliceSummary: `${objectiveAudit.reviewSliceCount - 1}@24`
  };
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: acceptedCommandRecords(commandPacket),
    commandPacket,
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan: staleRerunPlan
  });
  const attributes = mathSceneV2VerifiedClosurePipelineDataAttributes(pipeline);
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ];

  assert.equal(pipeline.finalAuditRecordStatus, "accepted-final-objective-audit");
  assert.equal(pipeline.finalClosureStatus, "blocked-review-slice-provenance-mismatch");
  assert.equal(pipeline.status, "blocked-review-slice-provenance-mismatch");
  assert.deepEqual(pipeline.reviewSliceMismatchReasons, expectedMismatchReasons);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-status"],
    "blocked-review-slice-provenance-mismatch"
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-final-status"],
    "blocked-review-slice-provenance-mismatch"
  );
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-review-slice-mismatch-reasons"],
    expectedMismatchReasons.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-verified-closure-pipeline-summary"],
    /reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 verified closure pipeline blocks when command evidence blocks or references unknown rows", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const a22ReleasePreflightRow = commandPacket.ownerPackets
    .find((packet) => packet.ownerAgentId === "A22")
    ?.rows.find((row) => row.evidenceId === "a22-release-preflight-rerun");
  assert.ok(a22ReleasePreflightRow);
  const blockedPipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: acceptedCommandRecords(commandPacket).map((record) =>
      record.rowEvidenceId === a22ReleasePreflightRow.evidenceId
        ? { ...record, evidenceId: "blocked-a22-release-preflight-rerun", status: "blocked" as const }
        : record
    ),
    commandPacket,
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });
  const invalidPipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: [
      ...acceptedCommandRecords(commandPacket),
      {
        evidenceId: "invalid-command-evidence",
        ownerAgentId: "A11",
        rowEvidenceId: "unknown-row",
        status: "accepted"
      }
    ],
    commandPacket,
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(blockedPipeline.status, "blocked-owner-command-evidence");
  assert.equal(blockedPipeline.commandEvidenceStatus, "blocked-owner-command-evidence");
  assert.equal(blockedPipeline.ownerGateRerunStatus, "blocked-owner-gate-rerun");
  assert.equal(blockedPipeline.canMarkThreadGoalComplete, false);
  assert.equal(invalidPipeline.status, "blocked-invalid-command-evidence");
  assert.equal(invalidPipeline.commandEvidenceStatus, "blocked-invalid-command-evidence");
  assert.equal(invalidPipeline.invalidCommandEvidenceRecordCount, 1);
  assert.equal(invalidPipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 verified closure pipeline blocks duplicate command evidence rows before owner gates", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const records = acceptedCommandRecords(commandPacket);
  const duplicatedRowRecord = records[0];
  assert.ok(duplicatedRowRecord);
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: [
      ...records,
      { ...duplicatedRowRecord, evidenceId: `${duplicatedRowRecord.evidenceId}-duplicate-row` }
    ],
    commandPacket,
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-invalid-command-evidence");
  assert.equal(pipeline.commandEvidenceStatus, "blocked-invalid-command-evidence");
  assert.equal(pipeline.invalidCommandEvidenceRecordCount, 2);
  assert.equal(pipeline.ownerGateRerunRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 verified closure pipeline serializes stable completion attributes", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = verifiedClosureFixture();
  const pipeline = buildMathSceneV2VerifiedClosurePipeline({
    commandEvidenceRecords: [],
    commandPacket,
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2VerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(classifyManimReviewPackage("mathSceneV2VerifiedClosurePipeline.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-verified-closure-pipeline-source-contract"],
    MATH_SCENE_V2_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-verified-closure-pipeline-status"], "pending-command-evidence");
  assert.equal(attributes["data-viz-manim-v2-verified-closure-pipeline-command-status"], "pending-owner-command-evidence");
  assert.equal(attributes["data-viz-manim-v2-verified-closure-pipeline-owner-gate-status"], "pending-owner-gate-reruns");
  assert.equal(attributes["data-viz-manim-v2-verified-closure-pipeline-final-status"], "pending-owner-gate-reruns");
  assert.equal(attributes["data-viz-manim-v2-verified-closure-pipeline-can-complete"], "false");
});
