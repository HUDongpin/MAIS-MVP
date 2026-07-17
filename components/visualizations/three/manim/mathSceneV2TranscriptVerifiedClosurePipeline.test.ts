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
import {
  type MathSceneV2FinalClosureAuditRecord
} from "./mathSceneV2FinalClosureAudit";
import { buildMathSceneTeachingFinalDecisionIntake } from "./mathSceneTeachingFinalDecisionIntake";
import { buildMathSceneTeachingFinalDecisionLedger } from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import { buildMathSceneTeachingRenderedReviewRoutes } from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";
import { buildMathSceneTeachingSignoffMatrix } from "./mathSceneTeachingSignoffMatrix";
import {
  browserRegressionLabs,
  renderedReviewLabs
} from "./mathSceneV2CatalogDecoupledFixtures";
import { buildMathSceneV2ClosureEvidencePackage } from "./mathSceneV2ClosureEvidencePackage";
import { buildMathSceneV2CompletionAcceptanceChecklist } from "./mathSceneV2CompletionAcceptanceChecklist";
import { buildMathSceneV2CompletionClosureQueue } from "./mathSceneV2CompletionClosureQueue";
import { buildMathSceneV2CompletionEvidenceIntake } from "./mathSceneV2CompletionEvidenceIntake";
import { buildMathSceneV2CompletionRerunPlan } from "./mathSceneV2CompletionRerunPlan";
import { buildMathSceneV2CompletionStatusSummary } from "./mathSceneV2CompletionStatusSummary";
import { buildMathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import { buildMathSceneV2GoalGate } from "./mathSceneV2GoalGate";
import { buildMathSceneV2ObjectiveCompletionAudit } from "./mathSceneV2ObjectiveCompletionAudit";
import {
  buildMathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import {
  type MathSceneV2OwnerGateRerunCommandTranscriptRecord
} from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";
import { buildMathSceneV2OwnerEvidenceRequestPacket } from "./mathSceneV2OwnerEvidenceRequestPacket";
import { buildMathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import {
  buildMathSceneV2TranscriptVerifiedClosurePipeline,
  mathSceneV2TranscriptVerifiedClosurePipelineDataAttributes,
  MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
} from "./mathSceneV2TranscriptVerifiedClosurePipeline";

const manimDir = "components/visualizations/three/manim";
const requirementProofEvidenceIds = [
  "a06-review-package-split:current-source:current-evidence-proves-requirement",
  "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
  "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
  "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
] as const;

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

function transcriptVerifiedClosureFixture() {
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
    releaseRunId: "manim-v2-a22-transcript-verified-closure-test",
    rerunPlan,
    teachingRenderedRoutes
  });

  return {
    commandPacket,
    objectiveAudit,
    rerunPlan
  };
}

function passingTranscripts(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2OwnerGateRerunCommandTranscriptRecord[] {
  return commandPacket.ownerPackets.flatMap((ownerPacket) =>
    ownerPacket.rows.map((row) =>
      row.kind === "teaching-route-review"
        ? {
            evidenceId: `transcript-${row.ownerAgentId}-${row.evidenceId}`,
            href: row.href,
            kind: row.kind,
            ownerAgentId: row.ownerAgentId,
            reviewDecision: "approved" as const,
            rowEvidenceId: row.evidenceId,
            sectionSelector: row.sectionSelector
          }
        : {
            command: row.command,
            evidenceId: `transcript-${row.ownerAgentId}-${row.evidenceId}`,
            exitCode: 0,
            kind: row.kind,
            ownerAgentId: row.ownerAgentId,
            reportPath: `reports/${row.ownerAgentId}/${row.evidenceId}.txt`,
            rowEvidenceId: row.evidenceId,
            runId: `run-${row.ownerAgentId}-${row.evidenceId}`
          }
    )
  );
}

function acceptedFinalAuditRecord(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket
): MathSceneV2FinalClosureAuditRecord {
  return {
    evidenceId: "accepted-final-objective-audit-4-of-4-after-transcripts",
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

test("MAIS Manim v2 transcript verified closure pipeline waits for raw transcripts", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [],
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.sourceContract, MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT);
  assert.equal(pipeline.status, "pending-command-transcripts");
  assert.equal(pipeline.transcriptStatus, "pending-command-transcripts");
  assert.equal(pipeline.verifiedClosureStatus, "pending-command-evidence");
  assert.equal(pipeline.commandEvidenceStatus, "pending-owner-command-evidence");
  assert.equal(pipeline.missingTranscriptCount, pipeline.requiredTranscriptCount);
  assert.equal(pipeline.commandEvidenceRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 transcript verified closure pipeline waits for final audit after passing transcripts", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2TranscriptVerifiedClosurePipelineDataAttributes(pipeline);
  const expectedOwnerGateRerunRecordManifest = [
    "01-owner-gate-A11:owner=A11:target=a11-browser-visual-interaction-regression:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A11-command-evidence-covered:blockedEvidence=none",
    "02-owner-gate-A18:owner=A18:target=a18-a06-teaching-quality-confirmation:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A18-command-evidence-covered:blockedEvidence=none",
    "03-owner-gate-A22:owner=A22:target=a22-clean-release-gate:status=accepted-owner-gate-rerun:acceptedEvidence=accepted-A22-command-evidence-covered:blockedEvidence=none"
  ].join(";");

  assert.equal(pipeline.status, "ready-for-final-objective-audit");
  assert.equal(pipeline.transcriptStatus, "command-transcripts-covered");
  assert.equal(pipeline.verifiedClosureStatus, "ready-for-final-objective-audit");
  assert.equal(pipeline.commandEvidenceStatus, "owner-command-evidence-covered");
  assert.equal(pipeline.acceptedTranscriptCount, pipeline.requiredTranscriptCount);
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
    attributes["data-viz-manim-v2-transcript-verified-closure-owner-action-evidence-count-manifest"],
    commandPacket.ownerActionEvidenceCountManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-owner-acceptance-criteria-manifest"],
    commandPacket.ownerAcceptanceCriteriaManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-owner-evidence-requirement-manifest"],
    commandPacket.ownerEvidenceRequirementManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-owner-gate-rerun-record-manifest"],
    expectedOwnerGateRerunRecordManifest
  );
  assert.equal(pipeline.readyForFinalObjectiveAudit, true);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.ok(pipeline.summary.includes(`ownerAcceptanceCriteria=${commandPacket.ownerAcceptanceCriteriaManifest}`));
  assert.ok(pipeline.summary.includes(`ownerEvidenceRequirements=${commandPacket.ownerEvidenceRequirementManifest}`));
  assert.match(pipeline.summary, /ownerGateRerunRecords=01-owner-gate-A11:owner=A11/);
});

test("MAIS Manim v2 transcript verified closure pipeline completes only after transcripts and final audit pass", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "complete");
  assert.equal(pipeline.finalClosureStatus, "complete");
  assert.equal(pipeline.provenRequirementCount, 4);
  assert.equal(pipeline.requirementCount, 4);
  assert.deepEqual(pipeline.remainingOwnerAgentIds, []);
  assert.equal(pipeline.canMarkThreadGoalComplete, true);
});

test("MAIS Manim v2 transcript verified closure pipeline propagates review-slice provenance mismatch blockers", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const staleRerunPlan = {
    ...rerunPlan,
    reviewSliceConsumerGateEvidenceIdManifest: "manim-review-slice-01=stale-transcript-closure",
    reviewSliceCount: objectiveAudit.reviewSliceCount - 1,
    reviewSliceFileManifest: "manim-review-slice-01=stale-transcript-closure.ts",
    reviewSliceIds: "manim-review-slice-01",
    reviewSliceSummary: `${objectiveAudit.reviewSliceCount - 1}@24`
  };
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket),
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan: staleRerunPlan
  });
  const attributes = mathSceneV2TranscriptVerifiedClosurePipelineDataAttributes(pipeline);
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ];

  assert.equal(pipeline.transcriptStatus, "command-transcripts-covered");
  assert.equal(pipeline.commandEvidenceStatus, "owner-command-evidence-covered");
  assert.equal(pipeline.verifiedClosureStatus, "blocked-review-slice-provenance-mismatch");
  assert.equal(pipeline.finalClosureStatus, "blocked-review-slice-provenance-mismatch");
  assert.equal(pipeline.status, "blocked-review-slice-provenance-mismatch");
  assert.deepEqual(pipeline.reviewSliceMismatchReasons, expectedMismatchReasons);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-status"],
    "blocked-review-slice-provenance-mismatch"
  );
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-review-slice-mismatch-reasons"],
    expectedMismatchReasons.join(",")
  );
  assert.match(
    attributes["data-viz-manim-v2-transcript-verified-closure-summary"],
    /reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 transcript verified closure pipeline blocks on failing command transcript", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const a22ReleasePreflightRow = commandPacket.ownerPackets
    .find((packet) => packet.ownerAgentId === "A22")
    ?.rows.find((row) => row.evidenceId === "a22-release-preflight-rerun");
  assert.ok(a22ReleasePreflightRow);
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: passingTranscripts(commandPacket).map((record) =>
      record.rowEvidenceId === a22ReleasePreflightRow.evidenceId
        ? { ...record, evidenceId: "failed-a22-release-preflight-transcript", exitCode: 1 }
        : record
    ),
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-command-transcript");
  assert.equal(pipeline.transcriptStatus, "blocked-command-transcript");
  assert.equal(pipeline.verifiedClosureStatus, "blocked-owner-command-evidence");
  assert.equal(pipeline.blockedTranscriptCount, 1);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 transcript verified closure pipeline blocks invalid transcripts before command evidence", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const a11BrowserRow = commandPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A11")?.rows[0];
  assert.ok(a11BrowserRow);
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [
      {
        command: "npx playwright test wrong.spec.ts",
        evidenceId: "mismatched-a11-browser-transcript",
        exitCode: 0,
        kind: a11BrowserRow.kind,
        ownerAgentId: a11BrowserRow.ownerAgentId,
        rowEvidenceId: a11BrowserRow.evidenceId
      }
    ],
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-invalid-command-transcript");
  assert.equal(pipeline.transcriptStatus, "blocked-invalid-command-transcript");
  assert.equal(pipeline.invalidTranscriptCount, 1);
  assert.equal(pipeline.commandEvidenceRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 transcript verified closure pipeline blocks duplicate transcript evidence IDs before command evidence", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const transcripts = passingTranscripts(commandPacket);
  const duplicateEvidenceId = transcripts[0]?.evidenceId;
  assert.ok(duplicateEvidenceId);

  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: transcripts.map((record, index) =>
      index === 1 ? { ...record, evidenceId: duplicateEvidenceId } : record
    ),
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-invalid-command-transcript");
  assert.equal(pipeline.transcriptStatus, "blocked-invalid-command-transcript");
  assert.equal(pipeline.invalidTranscriptCount, 2);
  assert.equal(pipeline.commandEvidenceRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 transcript verified closure pipeline blocks duplicate transcript rows before command evidence", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const transcripts = passingTranscripts(commandPacket);
  const duplicatedRowTranscript = transcripts[0];
  assert.ok(duplicatedRowTranscript);

  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [
      ...transcripts,
      { ...duplicatedRowTranscript, evidenceId: `${duplicatedRowTranscript.evidenceId}-duplicate-row` }
    ],
    finalAuditRecord: acceptedFinalAuditRecord(commandPacket),
    objectiveAudit,
    rerunPlan
  });

  assert.equal(pipeline.status, "blocked-invalid-command-transcript");
  assert.equal(pipeline.transcriptStatus, "blocked-invalid-command-transcript");
  assert.equal(pipeline.invalidTranscriptCount, 2);
  assert.equal(pipeline.commandEvidenceRecordCount, 0);
  assert.equal(pipeline.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 transcript verified closure pipeline serializes transcript-to-closure attributes", () => {
  const { commandPacket, objectiveAudit, rerunPlan } = transcriptVerifiedClosureFixture();
  const pipeline = buildMathSceneV2TranscriptVerifiedClosurePipeline({
    commandPacket,
    commandTranscripts: [],
    finalAuditRecord: undefined,
    objectiveAudit,
    rerunPlan
  });
  const attributes = mathSceneV2TranscriptVerifiedClosurePipelineDataAttributes(pipeline);

  assert.equal(classifyManimReviewPackage("mathSceneV2TranscriptVerifiedClosurePipeline.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-source-contract"],
    MATH_SCENE_V2_TRANSCRIPT_VERIFIED_CLOSURE_PIPELINE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-transcript-verified-closure-status"], "pending-command-transcripts");
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-transcript-status"],
    "pending-command-transcripts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-transcript-verified-closure-verified-status"],
    "pending-command-evidence"
  );
  assert.equal(attributes["data-viz-manim-v2-transcript-verified-closure-can-complete"], "false");
});
