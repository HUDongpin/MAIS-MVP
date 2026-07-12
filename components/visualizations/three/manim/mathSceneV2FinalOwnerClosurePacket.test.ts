import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneV2FinalCompletionDossier } from "./mathSceneV2FinalCompletionDossier";
import type { MathSceneV2FinalObjectiveProofLedger } from "./mathSceneV2FinalObjectiveProofLedger";
import {
  buildMathSceneV2FinalOwnerClosurePacket,
  mathSceneV2FinalOwnerClosurePacketDataAttributes,
  MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2FinalOwnerClosurePacket";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import type { MathSceneV2OwnerGateTranscriptRequestPacket } from "./mathSceneV2OwnerGateTranscriptRequestPacket";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";

const OWNER_GATE_HANDOFF_TRANSCRIPT_TEMPLATE_MANIFEST =
  "A11=pending-A11-a11-values-rerun-transcript;A18=pending-A18-a18-geometry-route-review-transcript;A22=pending-A22-a22-release-preflight-rerun-transcript";
const OWNER_GATE_HANDOFF_PROOF_SOURCE_STATUS_MANIFEST =
  "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:sourceStatus=owner-action-required;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:sourceStatus=owner-action-required;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:sourceStatus=blocked-owner-action";
const OWNER_GATE_HANDOFF_PROOF_ACTION_MANIFEST =
  "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:actions=Submit accepted browser regression evidence.;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:actions=Submit accepted A18 final criterion decisions.;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:actions=Submit accepted clean release gate evidence.";
const OWNER_GATE_HANDOFF_PROOF_FINAL_AUDIT_EVIDENCE_MANIFEST =
  "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:finalAuditEvidence=pending;A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:finalAuditEvidence=pending;A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:finalAuditEvidence=pending";
const OWNER_GATE_HANDOFF_A06_SOURCE_STATUS_MANIFEST =
  "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable";
const OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST =
  "A11:a11-browser-visual-interaction-regression:submit-a11-browser-evidence:a11-browser-final:owners=A11|status=accepted";
const OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST = "none";
const OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST = "none";
const finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames = [
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
  "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
] as const;
const finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest =
  "owner-gate-rerun-submission-bridge=1/1;final-objective-audit-request=1/1;final-objective-audit-record=1/1;final-objective-proof-ledger=4/4;verified-closure=4/4;final-closure-audit=1/1";
const finalObjectiveSubmissionBridgeVerifiedClosureGateIds =
  "owner-gate-rerun-submission-bridge,final-objective-audit-request,final-objective-audit-record,final-objective-proof-ledger,verified-closure,final-closure-audit";
const finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest =
  "owner-gate-rerun-submission-bridge=A11+A18+A22;final-objective-audit-request=A06;final-objective-audit-record=A06+A11+A18+A22;final-objective-proof-ledger=A06+A11+A18+A22;verified-closure=A06+A11+A18+A22;final-closure-audit=A06+A11+A18+A22";
const finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest =
  "owner-gate-rerun-submission-bridge=owner-gate-rerun-submissions-covered;final-objective-audit-request=pending-final-objective-audit-record;final-objective-audit-record=final-objective-audit-record-accepted;final-objective-proof-ledger=final-objective-proofs-covered;verified-closure=complete;final-closure-audit=complete";
const a06SourceConfirmationSummary =
  "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60:function-graph-core=5/5-a06-confirmed";
const A11_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTE_MANIFEST = [
  "data-viz-manim-run-from-beat-checkpoint-invalidates-count",
  "data-viz-manim-run-from-beat-checkpoint-invalidated-keys",
  "data-viz-manim-run-from-beat-checkpoint-invalidation-summary",
  "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore",
  "data-viz-manim-run-from-beat-checkpoint-restore-action"
].join(",");
const OWNER_GATE_RERUN_SUBMISSION_BRIDGE_EVIDENCE_SUMMARY = [
  "status=owner-gate-rerun-submissions-covered",
  "source=owner-gate-rerun-submission-bridge",
  "sourceStatus=owner-gate-rerun-submissions-covered",
  "reviewSlices=20@24",
  "request=blocked-owner-gate-reruns",
  "ready=false",
  `acceptedSubmittedRows=${OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST}`,
  `missingTemplates=${OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST}`,
  `invalidSubmittedRows=${OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST}`
].join("; ");

function transcriptRequestPacket(): MathSceneV2OwnerGateTranscriptRequestPacket {
  return {
    canMarkThreadGoalComplete: false,
    commandTranscriptCount: 2,
    missingOwnerAgentIds: [],
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerPacketCount: 3,
    ownerPackets: [
      {
        commandTranscriptCount: 1,
        ownerAgentId: "A11",
        pendingTranscriptCount: 1,
        routeReviewTranscriptCount: 0,
        rows: [
          {
            allowedReviewDecisions: [],
            command: "npx playwright test tests/e2e/visualization-values.spec.ts",
            evidenceId: "request-A11-a11-values-rerun-transcript",
            expectedExitCode: 0,
            instruction: "A11 reruns Visualization Lab values.",
            kind: "browser-regression-command",
            ownerAgentId: "A11",
            requiredTranscriptFields: ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "command", "exitCode", "runId", "reportPath"],
            rowEvidenceId: "a11-values-rerun",
            sourceCommandSummary: "a11:values",
            status: "pending-transcript",
            transcriptTemplate: {
              command: "npx playwright test tests/e2e/visualization-values.spec.ts",
              evidenceId: "pending-A11-a11-values-rerun-transcript",
              kind: "browser-regression-command",
              ownerAgentId: "A11",
              rowEvidenceId: "a11-values-rerun"
            }
          }
        ]
      },
      {
        commandTranscriptCount: 0,
        ownerAgentId: "A18",
        pendingTranscriptCount: 1,
        routeReviewTranscriptCount: 1,
        rows: [
          {
            allowedReviewDecisions: ["approved", "revision-required", "blocked"],
            evidenceId: "request-A18-a18-geometry-route-review-transcript",
            href: "/visualization-lab?lab=geometry",
            instruction: "A18 reviews the rendered geometry route.",
            kind: "teaching-route-review",
            ownerAgentId: "A18",
            requiredTranscriptFields: ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "href", "sectionSelector", "reviewDecision"],
            rowEvidenceId: "a18-geometry-route-review",
            sectionSelector: "[data-viz-lab-id='geometry']",
            sourceCommandSummary: "a18:geometry",
            status: "pending-transcript",
            transcriptTemplate: {
              evidenceId: "pending-A18-a18-geometry-route-review-transcript",
              href: "/visualization-lab?lab=geometry",
              kind: "teaching-route-review",
              ownerAgentId: "A18",
              rowEvidenceId: "a18-geometry-route-review",
              sectionSelector: "[data-viz-lab-id='geometry']"
            }
          }
        ]
      },
      {
        commandTranscriptCount: 1,
        ownerAgentId: "A22",
        pendingTranscriptCount: 1,
        routeReviewTranscriptCount: 0,
        rows: [
          {
            allowedReviewDecisions: [],
            command: "npm run release:preflight -- --json",
            evidenceId: "request-A22-a22-release-preflight-rerun-transcript",
            expectedExitCode: 0,
            instruction: "A22 reruns release preflight.",
            kind: "release-command",
            ownerAgentId: "A22",
            requiredTranscriptFields: ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "command", "exitCode", "runId", "reportPath"],
            rowEvidenceId: "a22-release-preflight-rerun",
            sourceCommandSummary: "a22:release",
            status: "pending-transcript",
            transcriptTemplate: {
              command: "npm run release:preflight -- --json",
              evidenceId: "pending-A22-a22-release-preflight-rerun-transcript",
              kind: "release-command",
              ownerAgentId: "A22",
              rowEvidenceId: "a22-release-preflight-rerun"
            }
          }
        ]
      }
    ],
    requestedTranscriptCount: 3,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2FinalOwnerClosurePacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    routeReviewTranscriptCount: 1,
    sourceContract: "MAIS Manim v2 owner gate transcript request packet: pending transcript templates for A11/A22 command runs and A18 route reviews without accepting evidence",
    status: "pending-owner-transcripts",
    summary: "mathSceneV2OwnerGateTranscriptRequestPacket:status=pending-owner-transcripts"
  };
}

function proofLedger(): MathSceneV2FinalObjectiveProofLedger {
  return {
    a11RequiredRootDataAttributeCount: 5,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      A11_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTE_MANIFEST,
    canMarkThreadGoalComplete: false,
    currentSourceProofReadyCount: 1,
    duplicateRequiredProofEvidenceIds: [],
    finalRecordProofCoveredCount: 0,
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    pendingFinalRecordProofCount: 3,
    readyForFinalClosureAudit: false,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requiredProofEvidenceIdCount: 4,
    requirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2FinalOwnerClosurePacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    rows: [
      {
        evidenceVerdict: "current-evidence-proves-requirement",
        ownerAgentIds: ["A06"],
        requiredActions: [],
        requiredProofEvidenceId: "a06-review-package-split:current-source:current-evidence-proves-requirement",
        requirementId: "a06-review-package-split",
        sourceRequirementStatus: "proven",
        status: "current-source-proof-ready",
        supportingAgentIds: ["A06"]
      },
      {
        evidenceVerdict: "missing-owner-evidence",
        ownerAgentIds: ["A11"],
        requiredActions: ["Submit accepted browser regression evidence."],
        requiredProofEvidenceId: "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
        requirementId: "a11-browser-visual-interaction-regression",
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-record-proof",
        supportingAgentIds: ["A06", "A11"]
      },
      {
        evidenceVerdict: "pending-a18-final-decisions",
        ownerAgentIds: ["A18", "A06"],
        requiredActions: ["Submit accepted A18 final criterion decisions."],
        requiredProofEvidenceId: "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
        requirementId: "a18-a06-teaching-quality-confirmation",
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-record-proof",
        supportingAgentIds: ["A06", "A18"]
      },
      {
        evidenceVerdict: "owner-gate-blocked",
        ownerAgentIds: ["A22"],
        requiredActions: ["Submit accepted clean release gate evidence."],
        requiredProofEvidenceId: "a22-clean-release-gate:final-owner-proof:owner-gate-blocked",
        requirementId: "a22-clean-release-gate",
        sourceRequirementStatus: "blocked-owner-action",
        status: "pending-final-record-proof",
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
    sourceContract: "MAIS Manim v2 final objective proof ledger: expands final 4-of-4 proof evidence IDs into auditable requirement rows without accepting owner evidence",
    status: "pending-final-objective-proof-record",
    summary: "mathSceneV2FinalObjectiveProofLedger:status=pending-final-objective-proof-record"
  };
}

function coveredProofLedger(): MathSceneV2FinalObjectiveProofLedger {
  const ledger = proofLedger();

  return {
    ...ledger,
    currentSourceProofReadyCount: 0,
    finalRecordProofCoveredCount: 4,
    pendingFinalRecordProofCount: 0,
    readyForFinalClosureAudit: true,
    remainingOwnerAgentIds: [],
    rows: ledger.rows.map((row) => ({
      ...row,
      status: "final-record-proof-covered" as const
    })),
    status: "final-objective-proofs-covered"
  };
}

function completionDossier(): MathSceneV2FinalCompletionDossier {
  return {
    acceptedFinalAuditEvidenceId: undefined,
    a06SourceBlockedConfirmationCount: 0,
    a06SourceConfirmedDecisionCount: 0,
    a06SourceConfirmationMismatchReasons: [],
    a06SourceConfirmationStatus: "not-attached",
    a06SourceConfirmationSummary: "not-attached",
    a06SourcePendingA18DecisionCount: 0,
    blockedStageCount: 0,
    canMarkThreadGoalComplete: false,
    completeStageCount: 0,
    a11RequiredRootDataAttributeCount: 5,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest:
      A11_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTE_MANIFEST,
    a11RootAttributeMismatchReasons: [],
    finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames:
      [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureStatus: "complete",
    finalObjectiveProofCoveredCount: 0,
    finalObjectiveProofLedgerStatus: "pending-final-objective-proof-record",
    finalObjectiveProofPendingCount: 3,
    finalObjectiveProofRequirementCount: 4,
    finalObjectiveSourceProofReadyCount: 1,
    missingOwnerEvidenceSummary: "A11=6;A22=6;A18+A06=10",
    openStageCount: 1,
    ownerGateHandoffA06SourceStatusManifest: OWNER_GATE_HANDOFF_A06_SOURCE_STATUS_MANIFEST,
    ownerGateHandoffBundleStatus: "pending-owner-evidence-bundle",
    ownerGateHandoffOwnerRowCount: 3,
    ownerGateHandoffProofActionManifest: OWNER_GATE_HANDOFF_PROOF_ACTION_MANIFEST,
    ownerGateHandoffProofFinalAuditEvidenceManifest: OWNER_GATE_HANDOFF_PROOF_FINAL_AUDIT_EVIDENCE_MANIFEST,
    ownerGateHandoffProofSourceStatusManifest: OWNER_GATE_HANDOFF_PROOF_SOURCE_STATUS_MANIFEST,
    ownerGateHandoffTranscriptTemplateManifest: OWNER_GATE_HANDOFF_TRANSCRIPT_TEMPLATE_MANIFEST,
    ownerGateRerunAcceptedSubmittedRecordManifest: "not-attached",
    ownerGateRerunInvalidSubmittedRecordManifest: "not-attached",
    ownerGateRerunMissingTemplateManifest: "not-attached",
    ownerGateRerunSource: "unknown",
    ownerGateRerunSourceStatus: "unknown",
    ownerGateRerunSubmissionBridgeStatus: "not-attached",
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    provenRequirementCount: 1,
    remainingOwnerAgentIds: ["A11", "A18", "A22"],
    requirementCount: 4,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2FinalOwnerClosurePacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceMismatchReasons: [],
    reviewSliceSummary: "20@24",
    sourceArchitectureBulkCourseGenerationAllowed: false,
    sourceArchitectureFutureInvocationScope: "not-attached",
    sourceArchitectureHandoffStatus: "not-attached",
    sourceArchitectureOpenOwnerGateIds: [],
    sourceArchitectureRequiredOwnerGateIds: [],
    sourceArchitectureSourceContract: "not-attached",
    sourceArchitectureSummary: "not-attached",
    sourceArchitectureBlockerReasonManifest: "none",
    sourceArchitectureBlockerReasons: [],
    sourceContract: "MAIS Manim v2 final completion dossier: summarizes transcript, command-evidence, final-audit, proof-ledger, and verified-closure gates for owner review",
    stageCount: 6,
    stageRows: [
      {
        evidenceSummary: "0/3 transcripts accepted",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "command-transcripts",
        status: "pending",
        title: "A11/A22 command and A18 review transcripts"
      },
      {
        evidenceSummary: "0 command-evidence records; status=pending-owner-command-evidence",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "command-evidence",
        status: "pending",
        title: "Owner command evidence synthesis"
      },
      {
        evidenceSummary: "request=blocked-owner-gate-reruns; ready=false",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-audit-request",
        status: "pending",
        title: "Final objective-audit request"
      },
      {
        evidenceSummary: "record=blocked-final-objective-audit-not-requested; accepted=0; invalid=0",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-audit-record",
        status: "pending",
        title: "Final objective-audit record intake"
      },
      {
        evidenceSummary: "proofs=0/4; sourceReady=1; pending=3; status=pending-final-objective-proof-record",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-proof-ledger",
        status: "pending",
        title: "Final objective proof ledger"
      },
      {
        evidenceSummary: "verified=pending-command-evidence; final=pending-owner-gate-reruns; proven=1/4",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "verified-closure",
        status: "pending",
        title: "Verified final closure"
      }
    ],
    status: "pending-command-transcripts",
    summary: "mathSceneV2FinalCompletionDossier:status=pending-command-transcripts"
  };
}

function directOwnerGateSubmissionBridgeDossierPendingFinalAudit(): MathSceneV2FinalCompletionDossier {
  return {
    ...completionDossier(),
    blockedStageCount: 0,
    canMarkThreadGoalComplete: false,
    completeStageCount: 3,
    finalObjectiveProofCoveredCount: 4,
    finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
    finalObjectiveProofPendingCount: 0,
    finalObjectiveSourceProofReadyCount: 0,
    missingOwnerEvidenceSummary: "none",
    openStageCount: 1,
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunSubmissionBridgeStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunAcceptedSubmittedRecordManifest: OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST,
    ownerGateRerunInvalidSubmittedRecordManifest: OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST,
    ownerGateRerunMissingTemplateManifest: OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST,
    provenRequirementCount: 4,
    remainingOwnerAgentIds: [],
    stageCount: 5,
    stageRows: [
      {
        evidenceSummary: [
          "status=owner-gate-rerun-submissions-covered",
          "source=owner-gate-rerun-submission-bridge",
          "sourceStatus=owner-gate-rerun-submissions-covered",
          "reviewSlices=20@24",
          "request=pending-final-objective-audit-record",
          "ready=true",
          `acceptedSubmittedRows=${OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST}`,
          `missingTemplates=${OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST}`,
          `invalidSubmittedRows=${OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST}`
        ].join("; "),
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "owner-gate-rerun-submission-bridge",
        status: "complete",
        title: "Owner-gate rerun submission bridge"
      },
      {
        evidenceSummary: "request=pending-final-objective-audit-record; ready=true",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-audit-request",
        status: "complete",
        title: "Final objective-audit request"
      },
      {
        evidenceSummary: "record=pending-final-objective-audit-record; accepted=0; invalid=0",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-audit-record",
        status: "pending",
        title: "Final objective-audit record intake"
      },
      {
        evidenceSummary: "proofs=4/4; sourceReady=0; pending=0; status=final-objective-proofs-covered",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "final-objective-proof-ledger",
        status: "complete",
        title: "Final objective proof ledger"
      },
      {
        evidenceSummary: "verified=pending-final-objective-audit-record; final=ready-for-final-objective-audit; proven=4/4",
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "verified-closure",
        status: "pending",
        title: "Verified final closure"
      }
    ],
    status: "pending-final-objective-audit-record",
    summary:
      "mathSceneV2FinalCompletionDossier:status=pending-final-objective-audit-record:ownerGateRerunSubmissions=owner-gate-rerun-submissions-covered"
  };
}

function completionDossierWithOwnerGateRerunSubmissionBridgeStage(
  evidenceSummary = OWNER_GATE_RERUN_SUBMISSION_BRIDGE_EVIDENCE_SUMMARY
): MathSceneV2FinalCompletionDossier {
  const dossier = completionDossier();

  return {
    ...dossier,
    completeStageCount: 1,
    ownerGateRerunSource: "owner-gate-rerun-submission-bridge",
    ownerGateRerunSourceStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunSubmissionBridgeStatus: "owner-gate-rerun-submissions-covered",
    ownerGateRerunAcceptedSubmittedRecordManifest: OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST,
    ownerGateRerunInvalidSubmittedRecordManifest: OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST,
    ownerGateRerunMissingTemplateManifest: OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST,
    stageCount: 7,
    stageRows: [
      ...dossier.stageRows.slice(0, 2),
      {
        evidenceSummary,
        ownerAgentIds: ["A11", "A18", "A22"],
        stageId: "owner-gate-rerun-submission-bridge",
        status: "complete",
        title: "Owner-gate rerun submission bridge"
      },
      ...dossier.stageRows.slice(2)
    ],
    summary:
      "mathSceneV2FinalCompletionDossier:status=pending-command-transcripts:ownerGateRerunSubmissions=owner-gate-rerun-submissions-covered"
  };
}

test("MAIS Manim v2 final owner closure packet pairs owner transcript requests with final proof IDs", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });

  assert.equal(packet.sourceContract, MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT);
  assert.match(packet.sourceContract, /owner-gate rerun submission provenance/);
  assert.equal(packet.status, "pending-owner-closure-submissions");
  assert.equal(packet.ownerPacketCount, 3);
  assert.deepEqual(packet.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.commandTranscriptCount, 2);
  assert.equal(packet.routeReviewTranscriptCount, 1);
  assert.equal(packet.requiredProofEvidenceIdCount, 4);
  assert.equal(packet.a06SourceProofReadyCount, 1);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.missingOwnerEvidenceSummary, "A11=6;A22=6;A18+A06=10");
  assert.equal(packet.canMarkThreadGoalComplete, false);

  const a11 = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A11");
  assert.ok(a11);
  assert.deepEqual(a11.requiredProofEvidenceIds, [
    "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence"
  ]);
  assert.equal(a11.commandTranscriptCount, 1);
  assert.equal(a11.routeReviewTranscriptCount, 0);
  assert.ok(a11.requiredTranscriptFields.includes("runId"));
  assert.ok(a11.requiredTranscriptFields.includes("reportPath"));

  const a18 = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");
  assert.ok(a18);
  assert.deepEqual(a18.requiredProofEvidenceIds, [
    "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions"
  ]);
  assert.equal(a18.commandTranscriptCount, 0);
  assert.equal(a18.routeReviewTranscriptCount, 1);
  assert.ok(a18.requiredTranscriptFields.includes("reviewDecision"));

  const a22 = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A22");
  assert.ok(a22);
  assert.deepEqual(a22.requiredProofEvidenceIds, [
    "a22-clean-release-gate:final-owner-proof:owner-gate-blocked"
  ]);
  assert.equal(a22.commandTranscriptCount, 1);
  assert.ok(a22.requiredTranscriptFields.includes("reportPath"));
});

test("MAIS Manim v2 final owner closure packet carries source-architecture blocker reasons", () => {
  const blockerReasons: MathSceneV2FinalCompletionDossier["sourceArchitectureBlockerReasons"] = [
    "reviewSliceStatus",
    "missingReviewSliceFiles"
  ];
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      sourceArchitectureBlockerReasonManifest: blockerReasons.join(","),
      sourceArchitectureBlockerReasons: [...blockerReasons]
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.deepEqual(
    (packet as { sourceArchitectureBlockerReasons?: unknown }).sourceArchitectureBlockerReasons,
    blockerReasons
  );
  assert.equal(
    (packet as { sourceArchitectureBlockerReasonManifest?: string }).sourceArchitectureBlockerReasonManifest,
    "reviewSliceStatus,missingReviewSliceFiles"
  );
  assert.match(packet.summary, /sourceBlockers=reviewSliceStatus,missingReviewSliceFiles/);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-blocker-reasons"],
    "reviewSliceStatus,missingReviewSliceFiles"
  );
});

test("MAIS Manim v2 final owner closure packet carries source-architecture handoff constraints from dossier", () => {
  const sourceArchitectureSummary =
    "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice";
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureRequiredOwnerGateIds: ["A11", "A18", "A22"],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary
    } as MathSceneV2FinalCompletionDossier,
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(
    (packet as { sourceArchitectureHandoffStatus?: string }).sourceArchitectureHandoffStatus,
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    (packet as { sourceArchitectureBulkCourseGenerationAllowed?: boolean }).sourceArchitectureBulkCourseGenerationAllowed,
    false
  );
  assert.equal(
    (packet as { sourceArchitectureFutureInvocationScope?: string }).sourceArchitectureFutureInvocationScope,
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.deepEqual(
    (packet as { sourceArchitectureOpenOwnerGateIds?: string[] }).sourceArchitectureOpenOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.deepEqual(
    (packet as { sourceArchitectureRequiredOwnerGateIds?: string[] }).sourceArchitectureRequiredOwnerGateIds,
    ["A11", "A18", "A22"]
  );
  assert.equal(
    (packet as { sourceArchitectureSourceContract?: string }).sourceArchitectureSourceContract,
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-status"],
    "source-architecture-ready-owner-gates-open"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-open-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-required-owner-gates"],
    "A11,A18,A22"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-architecture-summary"],
    sourceArchitectureSummary
  );
  assert.match(packet.summary, /sourceArchitecture=source-architecture-ready-owner-gates-open/);
  assert.match(packet.summary, /sourceArchitectureScope=one-topic-one-concept-cluster-or-one-review-slice/);
});

test("MAIS Manim v2 final owner closure packet carries A06 source confirmations from dossier", () => {
  const mismatchReasons = [
    "a06-confirmation-count=55/60",
    "missing-source-decision-keys=function-graph-core::interaction-timing"
  ];
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      a06SourceBlockedConfirmationCount: 0,
      a06SourceConfirmedDecisionCount: 55,
      a06SourceConfirmationMismatchReasons: mismatchReasons,
      a06SourceConfirmationStatus: "a06-source-confirmed-a18-pending",
      a06SourceConfirmationSummary,
      a06SourcePendingA18DecisionCount: 55
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(
    (packet as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((packet as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 55);
  assert.deepEqual(
    (packet as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal((packet as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.equal((packet as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 55);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-confirmed-count"],
    "55"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-blocked-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-pending-a18-count"],
    "55"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a06-source-confirmation-summary"],
    a06SourceConfirmationSummary
  );
  assert.equal(
    (packet as { ownerGateHandoffA06SourceStatusManifest?: string }).ownerGateHandoffA06SourceStatusManifest,
    OWNER_GATE_HANDOFF_A06_SOURCE_STATUS_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-a06-source-status-manifest"],
    OWNER_GATE_HANDOFF_A06_SOURCE_STATUS_MANIFEST
  );
  assert.match(packet.summary, /a06Source=a06-source-confirmed-a18-pending/);
  assert.match(
    packet.summary,
    /a06SourceMismatch=a06-confirmation-count=55\/60\|missing-source-decision-keys=function-graph-core::interaction-timing/
  );
  assert.match(packet.summary, /ownerGateA06SourceStatuses=A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable/);
  assert.match(packet.summary, /a06SourceConfirmed=55/);
  assert.match(packet.summary, /a06SourcePendingA18=55/);
  assert.equal(packet.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final owner closure packet carries submission-bridge verified-closure gate manifests from dossier", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.deepEqual(
    (packet as { finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames?: string[] })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames,
    [...finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames]
  );
  assert.equal(
    (packet as { finalObjectiveSubmissionBridgeVerifiedClosureGateIds?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureGateIds
  );
  assert.equal(
    (packet as { finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest?: string })
      .finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-gate-owner-manifest"
    ],
    finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-final-owner-closure-final-objective-submission-bridge-verified-closure-status"
    ],
    "complete"
  );
  assert.match(packet.summary, /submissionBridgeVerifiedClosure=complete/);
});

test("MAIS Manim v2 final owner closure packet accepts command reportPath transcript requirements", () => {
  const transcriptPacket = transcriptRequestPacket();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: {
      ...transcriptPacket,
      ownerPackets: transcriptPacket.ownerPackets.map((ownerPacket) => ({
        ...ownerPacket,
        rows: ownerPacket.rows.map((row) => row.kind === "teaching-route-review"
          ? row
          : {
              ...row,
              requiredTranscriptFields: row.requiredTranscriptFields.includes("reportPath")
                ? row.requiredTranscriptFields
                : [...row.requiredTranscriptFields, "reportPath"]
            }
        )
      }))
    }
  });

  assert.equal(packet.status, "pending-owner-closure-submissions");
  assert.deepEqual(packet.mismatchedTranscriptRequiredFieldRowEvidenceIds, []);
  assert.equal(packet.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final owner closure packet blocks when owner transcript requests are unavailable", () => {
  const transcriptPacket = {
    ...transcriptRequestPacket(),
    missingOwnerAgentIds: ["A11", "A18", "A22"],
    ownerAgentIds: [],
    ownerPacketCount: 0,
    ownerPackets: [],
    requestedTranscriptCount: 0,
    status: "blocked-missing-command-packets" as const
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptPacket
  });

  assert.equal(packet.status, "blocked-owner-transcript-requests");
  assert.deepEqual(packet.missingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 final owner closure packet blocks owner rows without final proof IDs", () => {
  const ledger = {
    ...proofLedger(),
    pendingFinalRecordProofCount: 2,
    remainingOwnerAgentIds: ["A11", "A18"],
    rows: proofLedger().rows.filter((row) => !row.ownerAgentIds.includes("A22"))
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: ledger,
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-proof-requests");
  assert.deepEqual(packet.missingProofOwnerAgentIds, ["A22"]);
  assert.equal(packet.ownerPacketCount, 3);
  assert.equal(packet.pendingOwnerProofCount, 2);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-missing-proof-owners"], "A22");
});

test("MAIS Manim v2 final owner closure packet blocks proof owners without transcript requests", () => {
  const transcriptPacket = transcriptRequestPacket();
  const missingA18TranscriptPacket = {
    ...transcriptPacket,
    ownerAgentIds: ["A11", "A22"],
    ownerPacketCount: 2,
    ownerPackets: transcriptPacket.ownerPackets.filter((packet) => packet.ownerAgentId !== "A18"),
    requestedTranscriptCount: 2,
    routeReviewTranscriptCount: 0
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: missingA18TranscriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-proof-mismatch");
  assert.deepEqual(packet.missingTranscriptOwnerAgentIds, ["A18"]);
  assert.deepEqual(packet.missingProofOwnerAgentIds, []);
  assert.equal(packet.ownerPacketCount, 2);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-missing-transcript-owners"], "A18");
});

test("MAIS Manim v2 final owner closure packet blocks duplicate owner transcript packets", () => {
  const transcriptPacket = transcriptRequestPacket();
  const duplicateA11TranscriptPacket = {
    ...transcriptPacket,
    ownerPacketCount: 4,
    ownerPackets: [
      ...transcriptPacket.ownerPackets,
      transcriptPacket.ownerPackets[0]
    ],
    requestedTranscriptCount: 4,
    commandTranscriptCount: 3
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: duplicateA11TranscriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-duplicate-owner-transcript-requests");
  assert.deepEqual(packet.duplicateTranscriptOwnerAgentIds, ["A11"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 4);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-duplicate-transcript-owners"], "A11");
});

test("MAIS Manim v2 final owner closure packet blocks stale transcript summary counts", () => {
  const transcriptPacket = {
    ...transcriptRequestPacket(),
    requestedTranscriptCount: 99
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-count-mismatch");
  assert.deepEqual(packet.transcriptCountMismatchReasons, ["requestedTranscriptCount"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 99);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-transcript-count-mismatch-reasons"],
    "requestedTranscriptCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks empty owner transcript packets", () => {
  const transcriptPacket = transcriptRequestPacket();
  const emptyA18TranscriptPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A18"
      ? {
          ...packet,
          pendingTranscriptCount: 0,
          routeReviewTranscriptCount: 0,
          rows: []
        }
      : packet
    ),
    requestedTranscriptCount: 2,
    routeReviewTranscriptCount: 0
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: emptyA18TranscriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-empty-owner-transcript-requests");
  assert.deepEqual(packet.emptyTranscriptOwnerAgentIds, ["A18"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 2);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-empty-transcript-owners"], "A18");
});

test("MAIS Manim v2 final owner closure packet blocks mismatched row owners", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA18TranscriptPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A18"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            ownerAgentId: "A11"
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA18TranscriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-row-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptRowOwnerAgentIds, ["A18"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-mismatched-row-owners"], "A18");
});

test("MAIS Manim v2 final owner closure packet blocks owner row-count mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA11RowCountPacket = {
    ...transcriptPacket,
    commandTranscriptCount: 1,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A11"
      ? {
          ...packet,
          commandTranscriptCount: 0
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA11RowCountPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-row-count-mismatch");
  assert.deepEqual(packet.transcriptRowCountMismatchOwnerAgentIds, ["A11"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.commandTranscriptCount, 1);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-row-count-mismatch-owners"], "A11");
});

test("MAIS Manim v2 final owner closure packet blocks duplicate transcript row evidence IDs", () => {
  const transcriptPacket = transcriptRequestPacket();
  const duplicatedA11RowPacket = {
    ...transcriptPacket,
    commandTranscriptCount: 3,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A11"
      ? {
          ...packet,
          commandTranscriptCount: 2,
          pendingTranscriptCount: 2,
          rows: [
            ...packet.rows,
            packet.rows[0]
          ]
        }
      : packet
    ),
    requestedTranscriptCount: 4
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: duplicatedA11RowPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-duplicate-owner-transcript-rows");
  assert.deepEqual(packet.duplicateTranscriptRowEvidenceIds, ["a11-values-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 4);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-duplicate-row-evidence-ids"], "a11-values-rerun");
});

test("MAIS Manim v2 final owner closure packet blocks transcript template identity mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA22TemplatePacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A22"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            transcriptTemplate: {
              ...row.transcriptTemplate,
              rowEvidenceId: "a22-unrelated-rerun"
            }
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA22TemplatePacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-template-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptTemplateRowEvidenceIds, ["a22-release-preflight-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-template-mismatch-row-evidence-ids"],
    "a22-release-preflight-rerun"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript template evidence ID mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA11TemplateEvidencePacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A11"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            transcriptTemplate: {
              ...row.transcriptTemplate,
              evidenceId: "pending-A11-unrelated-transcript"
            }
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA11TemplateEvidencePacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-template-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptTemplateRowEvidenceIds, ["a11-values-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-template-mismatch-row-evidence-ids"],
    "a11-values-rerun"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript request row evidence ID mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA22RequestRowPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A22"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            evidenceId: "request-A22-unrelated-transcript"
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA22RequestRowPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-row-identity-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptRequestRowEvidenceIds, ["a22-release-preflight-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-request-row-mismatch-evidence-ids"],
    "a22-release-preflight-rerun"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript required-field mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA22RequiredFieldPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A22"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            requiredTranscriptFields: row.requiredTranscriptFields.filter((field) => field !== "runId")
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA22RequiredFieldPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-required-fields-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptRequiredFieldRowEvidenceIds, ["a22-release-preflight-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-required-field-mismatch-evidence-ids"],
    "a22-release-preflight-rerun"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript acceptance-policy mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA18AcceptancePolicyPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A18"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            allowedReviewDecisions: ["approved"] as const,
            expectedExitCode: 0 as const
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA18AcceptancePolicyPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-acceptance-policy-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptAcceptancePolicyRowEvidenceIds, ["a18-geometry-route-review"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-acceptance-policy-mismatch-evidence-ids"],
    "a18-geometry-route-review"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript payload-shape mismatches", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA18PayloadPacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A18"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            command: "npx playwright test tests/e2e/visualization-values.spec.ts"
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA18PayloadPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-payload-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptPayloadRowEvidenceIds, ["a18-geometry-route-review"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-payload-mismatch-evidence-ids"],
    "a18-geometry-route-review"
  );
});

test("MAIS Manim v2 final owner closure packet blocks transcript template evidence payloads", () => {
  const transcriptPacket = transcriptRequestPacket();
  const mismatchedA11TemplateEvidencePacket = {
    ...transcriptPacket,
    ownerPackets: transcriptPacket.ownerPackets.map((packet) => packet.ownerAgentId === "A11"
      ? {
          ...packet,
          rows: packet.rows.map((row) => ({
            ...row,
            transcriptTemplate: {
              ...row.transcriptTemplate,
              exitCode: 0,
              runId: "a11-values-rerun-accepted"
            }
          }))
        }
      : packet
    )
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: mismatchedA11TemplateEvidencePacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-owner-transcript-template-evidence-payload-mismatch");
  assert.deepEqual(packet.mismatchedTranscriptTemplateEvidencePayloadRowEvidenceIds, ["a11-values-rerun"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.requestedTranscriptCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-template-evidence-payload-mismatch-row-evidence-ids"],
    "a11-values-rerun"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale final proof ledger counts", () => {
  const staleProofLedger = {
    ...proofLedger(),
    pendingFinalRecordProofCount: 99
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: staleProofLedger,
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-final-proof-ledger-count-mismatch");
  assert.deepEqual(packet.proofLedgerCountMismatchReasons, ["pendingFinalRecordProofCount"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 99);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-proof-ledger-count-mismatch-reasons"],
    "pendingFinalRecordProofCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks final audit readiness while owner evidence is still missing", () => {
  const coveredProofLedger: MathSceneV2FinalObjectiveProofLedger = {
    ...proofLedger(),
    currentSourceProofReadyCount: 0,
    finalRecordProofCoveredCount: 4,
    pendingFinalRecordProofCount: 0,
    readyForFinalClosureAudit: true,
    remainingOwnerAgentIds: [],
    rows: proofLedger().rows.map((row) => ({
      ...row,
      status: "final-record-proof-covered" as const
    })),
    status: "final-objective-proofs-covered"
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      finalObjectiveProofCoveredCount: 4,
      finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
      finalObjectiveProofPendingCount: 0,
      finalObjectiveSourceProofReadyCount: 0,
      provenRequirementCount: 4,
      remainingOwnerAgentIds: [],
      status: "pending-final-objective-audit-record"
    },
    proofLedger: coveredProofLedger,
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-missing-owner-evidence");
  assert.equal(packet.missingOwnerEvidenceSummary, "A11=6;A22=6;A18+A06=10");
  assert.equal(packet.pendingOwnerProofCount, 0);
  assert.equal(packet.coveredProofEvidenceCount, 4);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-status"],
    "blocked-missing-owner-evidence"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-missing-owner-evidence"],
    "A11=6;A22=6;A18+A06=10"
  );
});

test("MAIS Manim v2 final owner closure packet accepts direct submission-bridge dossier stages before final audit", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: directOwnerGateSubmissionBridgeDossierPendingFinalAudit(),
    proofLedger: coveredProofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "ready-for-final-objective-audit");
  assert.deepEqual(packet.completionDossierStageIdentityMismatchReasons, []);
  assert.equal(packet.completionDossierStageIdentityMismatchReasons.join(",") || "none", "none");
  assert.equal(packet.missingOwnerEvidenceSummary, "none");
  assert.equal(packet.coveredProofEvidenceCount, 4);
  assert.equal(packet.pendingOwnerProofCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-identity-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-status"],
    "ready-for-final-objective-audit"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier proof counts before final audit readiness", () => {
  const coveredProofLedger: MathSceneV2FinalObjectiveProofLedger = {
    ...proofLedger(),
    currentSourceProofReadyCount: 0,
    finalRecordProofCoveredCount: 4,
    pendingFinalRecordProofCount: 0,
    readyForFinalClosureAudit: true,
    remainingOwnerAgentIds: [],
    rows: proofLedger().rows.map((row) => ({
      ...row,
      status: "final-record-proof-covered" as const
    })),
    status: "final-objective-proofs-covered"
  };
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      finalObjectiveProofCoveredCount: 3,
      finalObjectiveProofLedgerStatus: "final-objective-proofs-covered",
      finalObjectiveProofPendingCount: 1,
      finalObjectiveSourceProofReadyCount: 1,
      missingOwnerEvidenceSummary: "none",
      remainingOwnerAgentIds: [],
      status: "pending-final-objective-audit-record"
    },
    proofLedger: coveredProofLedger,
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-proof-count-mismatch");
  assert.deepEqual(packet.completionDossierProofCountMismatchReasons, [
    "finalObjectiveProofCoveredCount",
    "finalObjectiveProofPendingCount",
    "finalObjectiveSourceProofReadyCount"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-proof-count-mismatch-reasons"],
    "finalObjectiveProofCoveredCount,finalObjectiveProofPendingCount,finalObjectiveSourceProofReadyCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier A11 root attributes before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      a11RequiredRootDataAttributeCount: 0,
      a11RunFromBeatCheckpointInvalidationDataAttributeManifest: "none"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-a11-root-attribute-mismatch");
  assert.deepEqual(
    (packet as { completionDossierA11RootAttributeMismatchReasons?: string[] })
      .completionDossierA11RootAttributeMismatchReasons,
    [
      "a11RequiredRootDataAttributeCount",
      "a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
    ]
  );
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-a11-root-attribute-mismatch-reasons"],
    "a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest"
  );
  assert.match(
    packet.summary,
    /dossierA11RootAttributeMismatches=a11RequiredRootDataAttributeCount,a11RunFromBeatCheckpointInvalidationDataAttributeManifest/
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier review-slice manifests before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      reviewSliceCount: 19,
      reviewSliceIds: "manim-review-slice-01",
      reviewSliceFileManifest: "manim-review-slice-01=stale.ts",
      reviewSliceConsumerGateEvidenceIdManifest: "stale",
      reviewSliceSummary: "19@24"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-review-slice-mismatch");
  assert.deepEqual(
    (packet as { completionDossierReviewSliceMismatchReasons?: string[] })
      .completionDossierReviewSliceMismatchReasons,
    [
      "reviewSliceConsumerGateEvidenceIdManifest",
      "reviewSliceCount",
      "reviewSliceFileManifest",
      "reviewSliceIds",
      "reviewSliceSummary"
    ]
  );
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-review-slice-mismatch-reasons"],
    "reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-owner-closure-summary"],
    /dossierReviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 final owner closure packet trusts dossier-declared review-slice mismatch reasons", () => {
  const expectedMismatchReasons = [
    "reviewSliceConsumerGateEvidenceIdManifest",
    "reviewSliceCount",
    "reviewSliceFileManifest",
    "reviewSliceIds",
    "reviewSliceSummary"
  ];
  const dossier = completionDossier();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...dossier,
      blockedStageCount: 1,
      openStageCount: 0,
      reviewSliceMismatchReasons: expectedMismatchReasons,
      stageRows: dossier.stageRows.map((row) => row.stageId === "verified-closure"
        ? {
            ...row,
            evidenceSummary:
              "verified=blocked-review-slice-provenance-mismatch; final=blocked-review-slice-provenance-mismatch; proven=1/4; reviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary",
            status: "blocked" as const
          }
        : row
      ),
      status: "blocked-final-objective-review-slice-provenance-mismatch"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-review-slice-mismatch");
  assert.deepEqual(packet.completionDossierReviewSliceMismatchReasons, expectedMismatchReasons);
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, []);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-review-slice-mismatch-reasons"],
    "reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary"
  );
  assert.match(
    packet.summary,
    /dossierReviewSliceMismatches=reviewSliceConsumerGateEvidenceIdManifest,reviewSliceCount,reviewSliceFileManifest,reviewSliceIds,reviewSliceSummary/
  );
});

test("MAIS Manim v2 final owner closure packet blocks review-slice mismatch status without dossier reasons", () => {
  const dossier = completionDossier();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...dossier,
      blockedStageCount: 1,
      openStageCount: 0,
      stageRows: dossier.stageRows.map((row) => row.stageId === "verified-closure"
        ? {
            ...row,
            evidenceSummary:
              "verified=blocked-review-slice-provenance-mismatch; final=blocked-review-slice-provenance-mismatch; proven=1/4; reviewSliceMismatches=none",
            status: "blocked" as const
          }
        : row
      ),
      status: "blocked-final-objective-review-slice-provenance-mismatch"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.deepEqual(packet.completionDossierReviewSliceMismatchReasons, []);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
  assert.match(packet.summary, /dossierReviewSliceMismatches=none/);
});

test("MAIS Manim v2 final owner closure packet trusts dossier-declared A11 root attribute mismatch reasons", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      a11RootAttributeMismatchReasons: ["dossierDeclaredA11RootAttributeMismatch"]
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-a11-root-attribute-mismatch");
  assert.deepEqual(
    (packet as { completionDossierA11RootAttributeMismatchReasons?: string[] })
      .completionDossierA11RootAttributeMismatchReasons,
    ["dossierDeclaredA11RootAttributeMismatch"]
  );
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-a11-root-attribute-mismatch-reasons"],
    "dossierDeclaredA11RootAttributeMismatch"
  );
  assert.match(packet.summary, /dossierA11RootAttributeMismatches=dossierDeclaredA11RootAttributeMismatch/);
});

test("MAIS Manim v2 final owner closure packet blocks A11 root mismatch status without dossier reasons", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      status: "blocked-final-objective-a11-root-attribute-mismatch"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.deepEqual(packet.completionDossierA11RootAttributeMismatchReasons, []);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
  assert.match(packet.summary, /dossierA11RootAttributeMismatches=none/);
});

test("MAIS Manim v2 final owner closure packet blocks unsupported final audit blocker status", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      openStageCount: 0,
      status: "blocked-final-objective-audit-record"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
});

test("MAIS Manim v2 final owner closure packet blocks premature final audit pending status", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      status: "pending-final-objective-audit-record"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
});

test("MAIS Manim v2 final owner closure packet blocks unsupported proof-ledger blocker status", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      openStageCount: 0,
      status: "blocked-final-objective-proof-ledger"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
});

test("MAIS Manim v2 final owner closure packet blocks proof-ledger blocker status without blocked stage evidence", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      finalObjectiveProofLedgerStatus: "blocked-duplicate-final-objective-proof-ids",
      openStageCount: 0,
      status: "blocked-final-objective-proof-ledger"
    },
    proofLedger: {
      ...proofLedger(),
      duplicateRequiredProofEvidenceIds: [
        "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence"
      ],
      status: "blocked-duplicate-final-objective-proof-ids"
    },
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
});

test("MAIS Manim v2 final owner closure packet blocks owner-gate evidence blocker status without blocked stage evidence", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      openStageCount: 0,
      status: "blocked-owner-gate-evidence"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
  assert.match(packet.summary, /dossierStatusMismatches=status/);
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier owner IDs before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      remainingOwnerAgentIds: []
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-mismatch");
  assert.deepEqual(packet.completionDossierOwnerMismatchReasons, ["remainingOwnerAgentIds"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-mismatch-reasons"],
    "remainingOwnerAgentIds"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier objective counts before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      provenRequirementCount: 4,
      requirementCount: 5
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-objective-count-mismatch");
  assert.deepEqual(packet.completionDossierObjectiveCountMismatchReasons, [
    "provenRequirementCount",
    "requirementCount"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-objective-count-mismatch-reasons"],
    "provenRequirementCount,requirementCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier stage counts before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      blockedStageCount: 1,
      completeStageCount: 1,
      openStageCount: 0,
      stageCount: 5
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-stage-count-mismatch");
  assert.deepEqual(packet.completionDossierStageCountMismatchReasons, [
    "stageCount",
    "completeStageCount",
    "blockedStageCount",
    "openStageCount"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-count-mismatch-reasons"],
    "stageCount,completeStageCount,blockedStageCount,openStageCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier stage IDs before owner handoff", () => {
  const dossier = completionDossier();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...dossier,
      stageRows: dossier.stageRows.map((row) => row.stageId === "verified-closure"
        ? {
            ...row,
            stageId: "command-transcripts"
          }
        : row
      )
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-stage-identity-mismatch");
  assert.deepEqual(packet.completionDossierStageIdentityMismatchReasons, [
    "duplicateStageIds",
    "missingStageIds"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-identity-mismatch-reasons"],
    "duplicateStageIds,missingStageIds"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier stage owner IDs before owner handoff", () => {
  const dossier = completionDossier();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...dossier,
      stageRows: dossier.stageRows.map((row) => row.stageId === "final-objective-proof-ledger"
        ? {
            ...row,
            ownerAgentIds: ["A11"]
          }
        : row
      )
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-stage-owner-mismatch");
  assert.deepEqual(packet.completionDossierStageOwnerMismatchStageIds, [
    "final-objective-proof-ledger"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-owner-mismatch-stage-ids"],
    "final-objective-proof-ledger"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier owner-gate template manifests before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      ownerGateHandoffTranscriptTemplateManifest:
        "A11=pending-A11-old-rerun-transcript;A18=pending-A18-a18-geometry-route-review-transcript;A22=pending-A22-a22-release-preflight-rerun-transcript"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-template-manifest-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateTranscriptTemplateManifestMismatchReasons, [
    "ownerGateHandoffTranscriptTemplateManifest"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-template-manifest-mismatch-reasons"],
    "ownerGateHandoffTranscriptTemplateManifest"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier owner-gate proof-detail manifests before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      ownerGateHandoffProofActionManifest:
        OWNER_GATE_HANDOFF_PROOF_ACTION_MANIFEST.replace(
          "Submit accepted A18 final criterion decisions.",
          "Submit stale A18 evidence."
        ),
      ownerGateHandoffProofFinalAuditEvidenceManifest:
        OWNER_GATE_HANDOFF_PROOF_FINAL_AUDIT_EVIDENCE_MANIFEST.replace(
          "A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:finalAuditEvidence=pending",
          "A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:finalAuditEvidence=accepted-a22-old"
        ),
      ownerGateHandoffProofSourceStatusManifest:
        OWNER_GATE_HANDOFF_PROOF_SOURCE_STATUS_MANIFEST.replace(
          "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:sourceStatus=owner-action-required",
          "A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:sourceStatus=stale"
        )
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-proof-detail-manifest-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateProofDetailManifestMismatchReasons, [
    "ownerGateHandoffProofActionManifest",
    "ownerGateHandoffProofFinalAuditEvidenceManifest",
    "ownerGateHandoffProofSourceStatusManifest"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-detail-manifest-mismatch-reasons"],
    "ownerGateHandoffProofActionManifest,ownerGateHandoffProofFinalAuditEvidenceManifest,ownerGateHandoffProofSourceStatusManifest"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier owner-gate handoff metadata before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      ownerGateHandoffBundleStatus: "owner-evidence-covered-bundle",
      ownerGateHandoffOwnerRowCount: 2
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-handoff-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateHandoffMismatchReasons, [
    "ownerGateHandoffBundleStatus",
    "ownerGateHandoffOwnerRowCount"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-handoff-mismatch-reasons"],
    "ownerGateHandoffBundleStatus,ownerGateHandoffOwnerRowCount"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale owner-gate handoff stage summaries before owner handoff", () => {
  const dossier = completionDossier();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...dossier,
      stageCount: 7,
      stageRows: [
        ...dossier.stageRows,
        {
          evidenceSummary:
            "status=pending-owner-evidence-bundle; owners=2; commands=2; routeReviews=1; transcripts=3; templates=3; proofs=3",
          ownerAgentIds: ["A11", "A18", "A22"],
          stageId: "owner-gate-handoff-bundle",
          status: "pending",
          title: "A11/A18/A22 owner handoff bundle"
        }
      ]
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-stage-summary-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateStageSummaryMismatchStageIds, [
    "owner-gate-handoff-bundle"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids"],
    "owner-gate-handoff-bundle"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale owner-gate rerun submission bridge stage summaries before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossierWithOwnerGateRerunSubmissionBridgeStage(
      "status=pending-owner-gate-rerun-submissions; source=owner-gate-rerun-submission-bridge; sourceStatus=owner-gate-rerun-submissions-covered; request=blocked-owner-gate-reruns; ready=false"
    ),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-stage-summary-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateStageSummaryMismatchStageIds, [
    "owner-gate-rerun-submission-bridge"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids"],
    "owner-gate-rerun-submission-bridge"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale owner-gate rerun submission bridge review slices before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossierWithOwnerGateRerunSubmissionBridgeStage(
      OWNER_GATE_RERUN_SUBMISSION_BRIDGE_EVIDENCE_SUMMARY.replace("reviewSlices=20@24", "reviewSlices=19@24")
    ),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-stage-summary-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateStageSummaryMismatchStageIds, [
    "owner-gate-rerun-submission-bridge"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids"],
    "owner-gate-rerun-submission-bridge"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale owner-gate rerun row-audit manifests before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossierWithOwnerGateRerunSubmissionBridgeStage(
      OWNER_GATE_RERUN_SUBMISSION_BRIDGE_EVIDENCE_SUMMARY.replace(
        `acceptedSubmittedRows=${OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST}`,
        "acceptedSubmittedRows=stale-row-audit-manifest"
      )
    ),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-owner-gate-stage-summary-mismatch");
  assert.deepEqual(packet.completionDossierOwnerGateStageSummaryMismatchStageIds, [
    "owner-gate-rerun-submission-bridge"
  ]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids"],
    "owner-gate-rerun-submission-bridge"
  );
});

test("MAIS Manim v2 final owner closure packet carries owner-gate rerun submission bridge provenance into owner handoff attributes", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossierWithOwnerGateRerunSubmissionBridgeStage(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);
  const expectedOwnerGateProvenance =
    "source=owner-gate-rerun-submission-bridge;sourceStatus=owner-gate-rerun-submissions-covered;submissionBridge=owner-gate-rerun-submissions-covered;reviewSlices=20@24";
  const expectedOwnerGateProvenanceOwnerManifest = packet.ownerAgentIds
    .map((ownerAgentId) => `${ownerAgentId}=${expectedOwnerGateProvenance}`)
    .join(";");

  assert.equal(packet.ownerGateRerunSource, "owner-gate-rerun-submission-bridge");
  assert.equal(packet.ownerGateRerunSourceStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(packet.ownerGateRerunSubmissionBridgeStatus, "owner-gate-rerun-submissions-covered");
  assert.equal(
    packet.ownerGateRerunAcceptedSubmittedRecordManifest,
    OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST
  );
  assert.equal(
    packet.ownerGateRerunMissingTemplateManifest,
    OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST
  );
  assert.equal(
    packet.ownerGateRerunInvalidSubmittedRecordManifest,
    OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST
  );
  assert.equal(
    packet.ownerGateRerunProvenanceSummary,
    expectedOwnerGateProvenance
  );
  assert.equal(
    packet.ownerGateRerunProvenanceOwnerManifest,
    expectedOwnerGateProvenanceOwnerManifest
  );
  assert.deepEqual(
    packet.ownerPackets.map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunProvenanceSummary}`),
    packet.ownerAgentIds.map((ownerAgentId) => `${ownerAgentId}=${expectedOwnerGateProvenance}`)
  );
  assert.deepEqual(
    packet.ownerPackets.map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunAcceptedSubmittedRecordManifest}`),
    packet.ownerAgentIds.map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST}`)
  );
  assert.deepEqual(
    packet.ownerPackets.map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunMissingTemplateManifest}`),
    packet.ownerAgentIds.map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST}`)
  );
  assert.deepEqual(
    packet.ownerPackets.map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.ownerGateRerunInvalidSubmittedRecordManifest}`),
    packet.ownerAgentIds.map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST}`)
  );
  assert.match(packet.summary, /ownerGateSource=owner-gate-rerun-submission-bridge/);
  assert.match(packet.summary, /ownerGateSourceStatus=owner-gate-rerun-submissions-covered/);
  assert.match(packet.summary, /ownerGateSubmissionBridge=owner-gate-rerun-submissions-covered/);
  assert.match(
    packet.summary,
    /ownerGateAcceptedSubmittedRows=A11:a11-browser-visual-interaction-regression:submit-a11-browser-evidence:a11-browser-final/
  );
  assert.match(packet.summary, /ownerGateMissingTemplates=none/);
  assert.match(packet.summary, /ownerGateInvalidSubmittedRows=none/);
  assert.match(
    packet.summary,
    /ownerGateProvenance=source=owner-gate-rerun-submission-bridge;sourceStatus=owner-gate-rerun-submissions-covered;submissionBridge=owner-gate-rerun-submissions-covered;reviewSlices=20@24/
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-source"],
    "owner-gate-rerun-submission-bridge"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-source-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-submission-bridge-status"],
    "owner-gate-rerun-submissions-covered"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-accepted-submitted-record-manifest"],
    OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-missing-template-manifest"],
    OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-invalid-submitted-record-manifest"],
    OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-provenance-summary"],
    expectedOwnerGateProvenance
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-provenance-owner-manifest"],
    expectedOwnerGateProvenanceOwnerManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-accepted-submitted-record-owner-manifest"],
    packet.ownerAgentIds
      .map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_ACCEPTED_SUBMITTED_RECORD_MANIFEST}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-missing-template-owner-manifest"],
    packet.ownerAgentIds
      .map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_MISSING_TEMPLATE_MANIFEST}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-gate-invalid-submitted-record-owner-manifest"],
    packet.ownerAgentIds
      .map((ownerAgentId) => `${ownerAgentId}=${OWNER_GATE_RERUN_INVALID_SUBMITTED_RECORD_MANIFEST}`)
      .join(";")
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier source contracts before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      sourceContract: "stale final completion dossier" as MathSceneV2FinalCompletionDossier["sourceContract"]
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-source-contract-mismatch");
  assert.deepEqual(packet.completionDossierSourceContractMismatchReasons, ["sourceContract"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-source-contract-mismatch-reasons"],
    "sourceContract"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier status before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      openStageCount: 0,
      status: "complete"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-status-mismatch");
  assert.deepEqual(packet.completionDossierStatusMismatchReasons, ["status"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "status"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier completion flags before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      canMarkThreadGoalComplete: true
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-completion-flag-mismatch");
  assert.deepEqual(packet.completionDossierCompletionFlagMismatchReasons, ["canMarkThreadGoalComplete"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-completion-flag-mismatch-reasons"],
    "canMarkThreadGoalComplete"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale dossier final audit evidence before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      acceptedFinalAuditEvidenceId: "accepted-final-objective-audit"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-final-audit-evidence-mismatch");
  assert.deepEqual(packet.completionDossierFinalAuditEvidenceMismatchReasons, ["acceptedFinalAuditEvidenceId"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-final-audit-evidence-mismatch-reasons"],
    "acceptedFinalAuditEvidenceId"
  );
});

test("MAIS Manim v2 final owner closure packet blocks stale missing-owner summaries before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      missingOwnerEvidenceSummary: "none"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-missing-owner-evidence-summary-mismatch");
  assert.deepEqual(packet.completionDossierMissingOwnerEvidenceMismatchReasons, ["missingOwnerEvidenceSummary"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "missingOwnerEvidenceSummary"
  );
});

test("MAIS Manim v2 final owner closure packet blocks non-canonical missing-owner summaries before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      missingOwnerEvidenceSummary: " A11=6;A22=6;A18+A06=10 "
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-missing-owner-evidence-summary-mismatch");
  assert.deepEqual(packet.completionDossierMissingOwnerEvidenceMismatchReasons, ["missingOwnerEvidenceSummary"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "missingOwnerEvidenceSummary"
  );
});

test("MAIS Manim v2 final owner closure packet blocks missing-owner summaries that omit pending owners before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      missingOwnerEvidenceSummary: "A11=6;A22=6"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-missing-owner-evidence-summary-mismatch");
  assert.deepEqual(packet.completionDossierMissingOwnerEvidenceMismatchReasons, ["missingOwnerEvidenceSummary"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "missingOwnerEvidenceSummary"
  );
});

test("MAIS Manim v2 final owner closure packet blocks malformed missing-owner summary counts before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      missingOwnerEvidenceSummary: "A11=six;A22=6;A18+A06=10"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-missing-owner-evidence-summary-mismatch");
  assert.deepEqual(packet.completionDossierMissingOwnerEvidenceMismatchReasons, ["missingOwnerEvidenceSummary"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "missingOwnerEvidenceSummary"
  );
});

test("MAIS Manim v2 final owner closure packet blocks internally non-canonical missing-owner summaries before owner handoff", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      missingOwnerEvidenceSummary: "A11=6; A22=6;A18+A06=10"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-missing-owner-evidence-summary-mismatch");
  assert.deepEqual(packet.completionDossierMissingOwnerEvidenceMismatchReasons, ["missingOwnerEvidenceSummary"]);
  assert.equal(packet.ownerPacketCount, 0);
  assert.equal(packet.pendingOwnerProofCount, 3);
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "missingOwnerEvidenceSummary"
  );
});

test("MAIS Manim v2 final owner closure packet serializes stable handoff attributes", () => {
  const transcriptPacket = transcriptRequestPacket();
  const ledger = proofLedger();
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: completionDossier(),
    proofLedger: ledger,
    transcriptRequestPacket: transcriptPacket
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(classifyManimReviewPackage("mathSceneV2FinalOwnerClosurePacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-source-contract"],
    MATH_SCENE_V2_FINAL_OWNER_CLOSURE_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-status"], "pending-owner-closure-submissions");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-owners"], "A11,A18,A22");
  assert.equal(
    (packet as { ownerActionEvidenceCountManifest?: string }).ownerActionEvidenceCountManifest,
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-action-evidence-count-manifest"],
    "fixture-owner-action-evidence-counts"
  );
  assert.equal(
    (packet as { ownerAcceptanceCriteriaManifest?: string }).ownerAcceptanceCriteriaManifest,
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    (packet as { ownerEvidenceRequirementManifest?: string }).ownerEvidenceRequirementManifest,
    "fixture-owner-evidence-requirements"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-acceptance-criteria-manifest"],
    "fixture-owner-acceptance-criteria"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-evidence-requirement-manifest"],
    "fixture-owner-evidence-requirements"
  );
  assert.equal(
    (packet as { a11RequiredRootDataAttributeCount?: number }).a11RequiredRootDataAttributeCount,
    5
  );
  assert.equal(
    (packet as { a11RunFromBeatCheckpointInvalidationDataAttributeManifest?: string })
      .a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
    A11_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTE_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a11-required-root-attribute-count"],
    "5"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-a11-run-from-beat-checkpoint-invalidation-attributes"],
    A11_RUN_FROM_BEAT_CHECKPOINT_INVALIDATION_DATA_ATTRIBUTE_MANIFEST
  );
  assert.deepEqual(
    (packet as { completionDossierA11RootAttributeMismatchReasons?: string[] })
      .completionDossierA11RootAttributeMismatchReasons,
    []
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-a11-root-attribute-mismatch-reasons"],
    "none"
  );
  assert.equal(
    (packet as { reviewSliceCount?: number }).reviewSliceCount,
    20
  );
  assert.equal(
    (packet as { reviewSliceIds?: string }).reviewSliceIds,
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.deepEqual(
    (packet as { completionDossierReviewSliceMismatchReasons?: string[] })
      .completionDossierReviewSliceMismatchReasons,
    []
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-review-slice-count"],
    "20"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-review-slice-ids"],
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneV2FinalOwnerClosurePacket.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-review-slice-consumer-gate-evidence-id-manifest"],
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-review-slices"],
    "20@24"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-review-slice-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=transcripts:${ownerPacket.transcriptRequestCount},commands:${ownerPacket.commandTranscriptCount},routes:${ownerPacket.routeReviewTranscriptCount}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-required-fields-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.requiredTranscriptFields.join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.requiredProofEvidenceIds.join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-count-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=proofs:${ownerPacket.requiredProofEvidenceIds.length},pending:${ownerPacket.pendingProofEvidenceCount}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-status-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.status}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-owner-agent-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.ownerAgentIds.join("+") || "none"}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-verdict-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.evidenceVerdict}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-source-status-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.sourceRequirementStatus}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-requirement-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.requirementId}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-action-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.requiredActions.join("+") || "none"}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-proof-support-manifest"],
    packet.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ledger.rows
        .filter((row) => row.ownerAgentIds.includes(ownerPacket.ownerAgentId))
        .map((row) => `${row.requiredProofEvidenceId}:${row.supportingAgentIds.join("+") || "none"}`)
        .join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-row-manifest"],
    transcriptPacket.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows.map((row) => row.rowEvidenceId).join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-kind-manifest"],
    transcriptPacket.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows.map((row) => row.kind).join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-row-kind-manifest"],
    transcriptPacket.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows.map((row) => `${row.rowEvidenceId}:${row.kind}`).join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-row-required-fields-manifest"],
    transcriptPacket.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows.map((row) => `${row.rowEvidenceId}:${row.requiredTranscriptFields.join("+")}`).join("|")}`)
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-owner-transcript-row-target-manifest"],
    transcriptPacket.ownerPackets
      .map((ownerPacket) => `${ownerPacket.ownerAgentId}=${ownerPacket.rows.map((row) => row.kind === "teaching-route-review"
        ? `${row.rowEvidenceId}:route=${row.href}@${row.sectionSelector}`
        : `${row.rowEvidenceId}:command=${row.command}`
      ).join("|")}`)
      .join(";")
  );
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-duplicate-row-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-duplicate-transcript-owners"], "none");
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-proof-count-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-objective-count-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-count-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-identity-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-stage-owner-mismatch-stage-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-handoff-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-stage-summary-mismatch-stage-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-template-manifest-mismatch-reasons"],
    "none"
  );
  assert.equal(
    packet.ownerGateHandoffProofSourceStatusManifest,
    OWNER_GATE_HANDOFF_PROOF_SOURCE_STATUS_MANIFEST
  );
  assert.equal(
    packet.ownerGateHandoffProofActionManifest,
    OWNER_GATE_HANDOFF_PROOF_ACTION_MANIFEST
  );
  assert.equal(
    packet.ownerGateHandoffProofFinalAuditEvidenceManifest,
    OWNER_GATE_HANDOFF_PROOF_FINAL_AUDIT_EVIDENCE_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-detail-manifest-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-source-status-manifest"],
    OWNER_GATE_HANDOFF_PROOF_SOURCE_STATUS_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-action-manifest"],
    OWNER_GATE_HANDOFF_PROOF_ACTION_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-owner-gate-proof-final-audit-evidence-manifest"],
    OWNER_GATE_HANDOFF_PROOF_FINAL_AUDIT_EVIDENCE_MANIFEST
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-source-contract-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-status-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-completion-flag-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-final-audit-evidence-mismatch-reasons"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-dossier-missing-owner-evidence-mismatch-reasons"],
    "none"
  );
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-empty-transcript-owners"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-missing-proof-owners"], "none");
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-missing-owner-evidence"],
    "A11=6;A22=6;A18+A06=10"
  );
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-missing-transcript-owners"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-mismatched-row-owners"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-acceptance-policy-mismatch-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-payload-mismatch-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-proof-ledger-count-mismatch-reasons"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-request-row-mismatch-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-required-field-mismatch-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-row-count-mismatch-owners"], "none");
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-template-evidence-payload-mismatch-row-evidence-ids"],
    "none"
  );
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-template-mismatch-row-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-transcript-count-mismatch-reasons"], "none");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-transcripts"], "3");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-proofs"], "0/4");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-a06-source-ready"], "1");
  assert.equal(attributes["data-viz-manim-v2-final-owner-closure-can-complete"], "false");
  assert.match(
    attributes["data-viz-manim-v2-final-owner-closure-summary"],
    /missingOwnerEvidence=A11=6;A22=6;A18\+A06=10/
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-owner-closure-summary"].includes(
      "ownerAcceptanceCriteria=fixture-owner-acceptance-criteria"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-owner-closure-summary"].includes(
      "ownerEvidenceRequirements=fixture-owner-evidence-requirements"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-owner-closure-summary"].includes(
      "a11RootAttributes=5"
    )
  );
  assert.ok(
    attributes["data-viz-manim-v2-final-owner-closure-summary"].includes(
      "reviewSlices=20@24"
    )
  );
});

test("MAIS Manim v2 final owner closure packet preserves completion dossier current blocker provenance", () => {
  const currentBlockerSummary =
    "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-open-owner-actions:missingReports=0:openOwnerActions=1:openA11Actions=projection-views-expected-list:readyForFinalObjectiveAuditInput=false";
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      currentBlockerManifest: "A11:open-owner-action:projection-views-expected-list",
      currentBlockerMissingReportArtifactCount: 0,
      currentBlockerOpenA11ActionIds: ["projection-views-expected-list"],
      currentBlockerOpenOwnerActionCount: 1,
      currentBlockerReadyForFinalObjectiveAuditInput: false,
      currentBlockerRemainingOwnerAgentIds: ["A11"],
      currentBlockerSnapshotStatus: "blocked-open-owner-actions",
      currentBlockerSummary
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(
    (packet as { currentBlockerSnapshotStatus?: string }).currentBlockerSnapshotStatus,
    "blocked-open-owner-actions"
  );
  assert.deepEqual(
    (packet as { currentBlockerOpenA11ActionIds?: string[] }).currentBlockerOpenA11ActionIds,
    ["projection-views-expected-list"]
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-current-blocker-status"],
    "blocked-open-owner-actions"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-current-blocker-open-a11-actions"],
    "projection-views-expected-list"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-current-blocker-remaining-owners"],
    "A11"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-current-blocker-summary"],
    currentBlockerSummary
  );
  assert.match(
    attributes["data-viz-manim-v2-final-owner-closure-summary"],
    /currentBlockers=blocked-open-owner-actions/
  );
});

test("MAIS Manim v2 final owner closure packet blocks current owner-gate blocker dossier statuses", () => {
  const packet = buildMathSceneV2FinalOwnerClosurePacket({
    completionDossier: {
      ...completionDossier(),
      currentBlockerManifest: "A11:open-owner-action:projection-views-expected-list",
      currentBlockerOpenA11ActionIds: ["projection-views-expected-list"],
      currentBlockerOpenOwnerActionCount: 1,
      currentBlockerReadyForFinalObjectiveAuditInput: false,
      currentBlockerRemainingOwnerAgentIds: ["A11"],
      currentBlockerSnapshotStatus: "blocked-open-owner-actions",
      currentBlockerSummary:
        "mathSceneV2OwnerGateCurrentBlockerSnapshot:status=blocked-open-owner-actions:missingReports=0:openOwnerActions=1:openA11Actions=projection-views-expected-list:readyForFinalObjectiveAuditInput=false",
      openStageCount: 0,
      status: "blocked-current-owner-gate-blockers" as MathSceneV2FinalCompletionDossier["status"]
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2FinalOwnerClosurePacketDataAttributes(packet);

  assert.equal(packet.status, "blocked-completion-dossier-current-owner-gate-blockers");
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.currentBlockerSnapshotStatus, "blocked-open-owner-actions");
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-status"],
    "blocked-completion-dossier-current-owner-gate-blockers"
  );
  assert.equal(
    attributes["data-viz-manim-v2-final-owner-closure-current-blocker-open-a11-actions"],
    "projection-views-expected-list"
  );
  assert.match(
    attributes["data-viz-manim-v2-final-owner-closure-summary"],
    /currentBlockers=blocked-open-owner-actions/
  );
});
