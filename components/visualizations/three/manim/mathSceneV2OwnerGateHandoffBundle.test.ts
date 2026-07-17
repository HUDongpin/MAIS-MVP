import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import type {
  MathSceneV2FinalObjectiveProofLedger,
  MathSceneV2FinalObjectiveProofLedgerRow
} from "./mathSceneV2FinalObjectiveProofLedger";
import {
  type MathSceneTeachingA06SourceConfirmationLedger,
  MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT
} from "./mathSceneTeachingA06SourceConfirmationLedger";
import {
  buildMathSceneV2OwnerGateHandoffBundle,
  mathSceneV2OwnerGateHandoffBundleDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateHandoffBundle";
import type {
  MathSceneV2OwnerGateRerunCommandPacket,
  MathSceneV2OwnerGateRerunCommandRow
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type { MathSceneV2OwnerGateTranscriptRequestPacket } from "./mathSceneV2OwnerGateTranscriptRequestPacket";
import {
  type MathSceneV2SourceArchitectureHandoff,
  MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
} from "./mathSceneV2SourceArchitectureHandoff";

const a06SourceConfirmationSummary =
  "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=60/60:pendingA18=60:function-graph-core=5/5-a06-confirmed";
const a11RunFromBeatCheckpointInvalidationDataAttributeManifest =
  "data-viz-family-id,data-viz-concept-id,data-viz-scene-id,data-viz-beat-id,data-viz-checkpoint-id";

function commandRow(row: MathSceneV2OwnerGateRerunCommandRow): MathSceneV2OwnerGateRerunCommandRow {
  return row;
}

function commandPacket(): MathSceneV2OwnerGateRerunCommandPacket {
  const a11Rows = [
    commandRow({
      command: "npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome",
      evidenceId: "a11-values-rerun",
      instruction: "A11 reruns Visualization Lab values.",
      kind: "browser-regression-command",
      ownerAgentId: "A11",
      protocol: ["run-playwright", "record-run-id", "attach-report"],
      rerunTarget: "a11-browser-visual-interaction-regression",
      stepId: "01-owner-gate-A11",
      summary: "A11 values"
    })
  ];
  const a18Rows = [
    commandRow({
      evidenceId: "a18-function-graph-route-review",
      href: "/visualization-lab?lab=function-graph",
      instruction: "A18 reviews the rendered function graph route.",
      kind: "teaching-route-review",
      ownerAgentId: "A18",
      protocol: ["open-route", "inspect-scene", "record-review-decision"],
      rerunTarget: "a18-a06-teaching-quality-confirmation",
      sectionSelector: "[data-viz-lab-id='function-graph']",
      stepId: "02-owner-gate-A18",
      summary: "A18 function graph"
    })
  ];
  const a22Rows = [
    commandRow({
      command: "npm run release:preflight -- --json",
      evidenceId: "a22-release-preflight-rerun",
      instruction: "A22 reruns release preflight.",
      kind: "release-command",
      ownerAgentId: "A22",
      protocol: ["run-command", "record-output", "attach-report"],
      rerunTarget: "a22-clean-release-gate",
      stepId: "03-owner-gate-A22",
      summary: "A22 release preflight"
    })
  ];

  return {
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
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateHandoffBundle.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    ownerPacketCount: 3,
    ownerPackets: [
      { commandCount: 1, manualReviewCount: 0, ownerAgentId: "A11", rows: a11Rows },
      { commandCount: 0, manualReviewCount: 1, ownerAgentId: "A18", rows: a18Rows },
      { commandCount: 1, manualReviewCount: 0, ownerAgentId: "A22", rows: a22Rows }
    ],
    releaseCommandCount: 1,
    sourceContract:
      "MAIS Manim v2 owner gate rerun command packet: executable A11/A22 commands and A18 route-review rows for remaining owner gates without closing completion",
    status: "owner-rerun-commands-ready",
    summary: "mathSceneV2OwnerGateRerunCommandPacket:status=owner-rerun-commands-ready",
    teachingReviewCount: 1,
    totalCommandCount: 2
  };
}

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
            command: "npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome",
            evidenceId: "request-A11-a11-values-rerun-transcript",
            expectedExitCode: 0,
            instruction: "A11 reruns Visualization Lab values.",
            kind: "browser-regression-command",
            ownerAgentId: "A11",
            requiredTranscriptFields: ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "command", "exitCode", "runId", "reportPath"],
            rowEvidenceId: "a11-values-rerun",
            sourceCommandSummary: "A11 values",
            status: "pending-transcript",
            transcriptTemplate: {
              command: "npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome",
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
            evidenceId: "request-A18-a18-function-graph-route-review-transcript",
            href: "/visualization-lab?lab=function-graph",
            instruction: "A18 reviews the rendered function graph route.",
            kind: "teaching-route-review",
            ownerAgentId: "A18",
            requiredTranscriptFields: ["evidenceId", "ownerAgentId", "rowEvidenceId", "kind", "href", "sectionSelector", "reviewDecision"],
            rowEvidenceId: "a18-function-graph-route-review",
            sectionSelector: "[data-viz-lab-id='function-graph']",
            sourceCommandSummary: "A18 function graph",
            status: "pending-transcript",
            transcriptTemplate: {
              evidenceId: "pending-A18-a18-function-graph-route-review-transcript",
              href: "/visualization-lab?lab=function-graph",
              kind: "teaching-route-review",
              ownerAgentId: "A18",
              rowEvidenceId: "a18-function-graph-route-review",
              sectionSelector: "[data-viz-lab-id='function-graph']"
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
            sourceCommandSummary: "A22 release preflight",
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
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateHandoffBundle.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    routeReviewTranscriptCount: 1,
    sourceContract:
      "MAIS Manim v2 owner gate transcript request packet: pending transcript templates for A11/A22 command runs and A18 route reviews without accepting evidence",
    status: "pending-owner-transcripts",
    summary: "mathSceneV2OwnerGateTranscriptRequestPacket:status=pending-owner-transcripts"
  };
}

function proofRow(row: MathSceneV2FinalObjectiveProofLedgerRow): MathSceneV2FinalObjectiveProofLedgerRow {
  return row;
}

function proofLedger(): MathSceneV2FinalObjectiveProofLedger {
  return {
    a11RequiredRootDataAttributeCount: 5,
    a11RunFromBeatCheckpointInvalidationDataAttributeManifest,
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
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateHandoffBundle.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    rows: [
      proofRow({
        evidenceVerdict: "current-evidence-proves-requirement",
        ownerAgentIds: ["A06"],
        requiredActions: [],
        requiredProofEvidenceId: "a06-review-package-split:current-source:current-evidence-proves-requirement",
        requirementId: "a06-review-package-split",
        sourceRequirementStatus: "proven",
        status: "current-source-proof-ready",
        supportingAgentIds: ["A06"]
      }),
      proofRow({
        evidenceVerdict: "missing-owner-evidence",
        ownerAgentIds: ["A11"],
        requiredActions: ["Submit accepted browser regression evidence."],
        requiredProofEvidenceId: "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
        requirementId: "a11-browser-visual-interaction-regression",
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-record-proof",
        supportingAgentIds: ["A06", "A11"]
      }),
      proofRow({
        evidenceVerdict: "pending-a18-final-decisions",
        ownerAgentIds: ["A18", "A06"],
        requiredActions: ["Submit accepted A18 final criterion decisions."],
        requiredProofEvidenceId: "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
        requirementId: "a18-a06-teaching-quality-confirmation",
        sourceRequirementStatus: "owner-action-required",
        status: "pending-final-record-proof",
        supportingAgentIds: ["A06", "A18"]
      }),
      proofRow({
        evidenceVerdict: "owner-gate-blocked",
        ownerAgentIds: ["A22"],
        requiredActions: ["Submit accepted clean release gate evidence."],
        requiredProofEvidenceId: "a22-clean-release-gate:final-owner-proof:owner-gate-blocked",
        requirementId: "a22-clean-release-gate",
        sourceRequirementStatus: "blocked-owner-action",
        status: "pending-final-record-proof",
        supportingAgentIds: ["A06", "A22"]
      })
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
    sourceContract:
      "MAIS Manim v2 final objective proof ledger: expands final 4-of-4 proof evidence IDs into auditable requirement rows without accepting owner evidence",
    status: "pending-final-objective-proof-record",
    summary: "mathSceneV2FinalObjectiveProofLedger:status=pending-final-objective-proof-record"
  };
}

function a06SourceConfirmationLedger(): MathSceneTeachingA06SourceConfirmationLedger {
  return {
    a06ConfirmedDecisionCount: 60,
    blockedConfirmationCount: 0,
    canMarkA18GateComplete: false,
    caseCount: 12,
    confirmationCount: 60,
    criterionCount: 5,
    pendingA18DecisionCount: 60,
    requiredCriteria: [
      "curriculum-fit",
      "mathematical-accuracy",
      "cognitive-load",
      "language-and-labels",
      "interaction-timing"
    ],
    rows: [],
    sourceContract: MATH_SCENE_TEACHING_A06_SOURCE_CONFIRMATION_LEDGER_SOURCE_CONTRACT,
    status: "a06-source-confirmed-a18-pending",
    summary: a06SourceConfirmationSummary
  };
}

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

function sourceArchitectureHandoff(): MathSceneV2SourceArchitectureHandoff {
  return {
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
      "A06=a06-review-package-split:passed|a11-browser-visual-interaction-regression:partial-blocked|a18-a06-teaching-quality-confirmation:pending-final-signoff;A11=a11-browser-visual-interaction-regression:partial-blocked;A18=a18-a06-teaching-quality-confirmation:pending-final-signoff;A22=a22-clean-release-gate:blocked",
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
    reviewSliceIds: "scene-slice-01,evidence-slice-01,integration-slice-01",
    reviewSliceStatus: "ready-for-slice-review",
    reviewSliceSummary: "20@24",
    sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
    status: "source-architecture-ready-owner-gates-open",
    summary:
      "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false:futureInvocationScope=one-topic-one-concept-cluster-or-one-review-slice:reviewPackages=8:reviewSlices=20@24:ownerGatesOpen=a11-browser-visual-interaction-regression,a18-a06-teaching-quality-confirmation,a22-clean-release-gate"
  };
}

test("MAIS Manim v2 owner gate handoff bundle groups commands transcripts and final proofs by owner", () => {
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    commandPacket: commandPacket(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });

  assert.equal(bundle.sourceContract, MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT);
  assert.equal(bundle.status, "pending-owner-evidence-bundle");
  assert.equal(bundle.canMarkThreadGoalComplete, false);
  assert.deepEqual(bundle.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(bundle.ownerRowCount, 3);
  assert.equal(bundle.commandRowCount, 2);
  assert.equal(bundle.routeReviewRowCount, 1);
  assert.equal(bundle.transcriptRequestCount, 3);
  assert.equal(bundle.requiredOwnerProofCount, 3);

  const a11 = bundle.ownerRows.find((row) => row.ownerAgentId === "A11");
  assert.ok(a11);
  assert.equal(a11.status, "pending-owner-evidence");
  assert.deepEqual(a11.commandEvidenceIds, ["a11-values-rerun"]);
  assert.deepEqual(a11.transcriptRowEvidenceIds, ["a11-values-rerun"]);
  assert.deepEqual(a11.transcriptTemplateEvidenceIds, ["pending-A11-a11-values-rerun-transcript"]);
  assert.deepEqual(a11.requiredProofEvidenceIds, [
    "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence"
  ]);
  assert.deepEqual(a11.requiredProofDetails, [
    {
      finalAuditEvidenceId: "pending",
      requiredActionSummary: "Submit accepted browser regression evidence.",
      requiredProofEvidenceId: "a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence",
      sourceRequirementStatus: "owner-action-required"
    }
  ]);
  assert.equal(a11.nextAction, "submit-browser-regression-transcripts-and-proof");

  const a18 = bundle.ownerRows.find((row) => row.ownerAgentId === "A18");
  assert.ok(a18);
  assert.deepEqual(a18.manualReviewEvidenceIds, ["a18-function-graph-route-review"]);
  assert.deepEqual(a18.transcriptTemplateEvidenceIds, ["pending-A18-a18-function-graph-route-review-transcript"]);
  assert.deepEqual(a18.requiredTranscriptFields, ["evidenceId", "href", "kind", "ownerAgentId", "reviewDecision", "rowEvidenceId", "sectionSelector"]);
  assert.deepEqual(a18.requiredProofDetails, [
    {
      finalAuditEvidenceId: "pending",
      requiredActionSummary: "Submit accepted A18 final criterion decisions.",
      requiredProofEvidenceId: "a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions",
      sourceRequirementStatus: "owner-action-required"
    }
  ]);
  assert.equal(a18.nextAction, "submit-rendered-teaching-review-decisions-and-proof");

  const a22 = bundle.ownerRows.find((row) => row.ownerAgentId === "A22");
  assert.ok(a22);
  assert.deepEqual(a22.commandEvidenceIds, ["a22-release-preflight-rerun"]);
  assert.deepEqual(a22.transcriptTemplateEvidenceIds, ["pending-A22-a22-release-preflight-rerun-transcript"]);
  assert.deepEqual(a22.requiredProofDetails, [
    {
      finalAuditEvidenceId: "pending",
      requiredActionSummary: "Submit accepted clean release gate evidence.",
      requiredProofEvidenceId: "a22-clean-release-gate:final-owner-proof:owner-gate-blocked",
      sourceRequirementStatus: "blocked-owner-action"
    }
  ]);
  assert.equal(a22.nextAction, "submit-clean-release-command-transcripts-and-proof");
});

test("MAIS Manim v2 owner gate handoff bundle blocks if any upstream owner packet is not ready", () => {
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    commandPacket: {
      ...commandPacket(),
      status: "blocked-missing-owner-gate-steps"
    },
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });

  assert.equal(bundle.status, "blocked-owner-gate-inputs");
  assert.deepEqual(bundle.ownerRows, []);
  assert.equal(bundle.canMarkThreadGoalComplete, false);
  assert.deepEqual(bundle.blockerReasons, ["commandPacket"]);
});

test("MAIS Manim v2 owner gate handoff bundle serializes stable review attributes", () => {
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    a06SourceConfirmationLedger: a06SourceConfirmationLedger(),
    commandPacket: commandPacket(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2OwnerGateHandoffBundleDataAttributes(bundle);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateHandoffBundle.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_HANDOFF_BUNDLE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-handoff-status"], "pending-owner-evidence-bundle");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-handoff-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-handoff-can-complete"], "false");
  assert.equal(
    (bundle as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((bundle as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 60);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-status-manifest"],
    "A11=not-applicable;A18=a06-source-confirmed-a18-pending;A22=not-applicable"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-confirmed-count-manifest"],
    "A11=0;A18=60;A22=0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-pending-a18-count-manifest"],
    "A11=0;A18=60;A22=0"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-can-complete-a18-gate-manifest"],
    "A11=false;A18=false;A22=false"
  );
  assert.match(attributes["data-viz-manim-v2-owner-gate-handoff-summary"], /a06Source=a06-source-confirmed-a18-pending/);
  assert.equal((bundle as { reviewSliceCount?: number }).reviewSliceCount, 20);
  assert.equal(
    (bundle as { reviewSliceIds?: string }).reviewSliceIds,
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-review-slice-count"],
    "20"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-review-slice-ids"],
    "manim-review-slice-01,manim-review-slice-02"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-review-slice-file-manifest"],
    "manim-review-slice-01=mathSceneV2OwnerGateHandoffBundle.ts"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-review-slice-consumer-gate-evidence-id-manifest"],
    "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review"
  );
  assert.match(attributes["data-viz-manim-v2-owner-gate-handoff-summary"], /reviewSlices=20@24/);
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-command-manifest"],
    /A11=a11-values-rerun/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-proof-manifest"],
    /A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-proof-source-status-manifest"],
    /A22=a22-clean-release-gate:final-owner-proof:owner-gate-blocked:sourceStatus=blocked-owner-action/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-proof-action-manifest"],
    /A18=a18-a06-teaching-quality-confirmation:final-owner-proof:pending-a18-final-decisions:actions=Submit accepted A18 final criterion decisions\./
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-proof-final-audit-evidence-manifest"],
    /A11=a11-browser-visual-interaction-regression:final-owner-proof:missing-owner-evidence:finalAuditEvidence=pending/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-next-action-manifest"],
    /A18=submit-rendered-teaching-review-decisions-and-proof/
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-transcript-template-manifest"],
    "A11=pending-A11-a11-values-rerun-transcript;A18=pending-A18-a18-function-graph-route-review-transcript;A22=pending-A22-a22-release-preflight-rerun-transcript"
  );

  const a18 = bundle.ownerRows.find((row) => row.ownerAgentId === "A18");
  assert.ok(a18);
  assert.equal(
    (a18 as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((a18 as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 60);
  assert.equal((a18 as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 60);
  assert.equal((a18 as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.equal(
    (a18 as { a06SourceConfirmationCanCompleteA18Gate?: boolean }).a06SourceConfirmationCanCompleteA18Gate,
    false
  );
});

test("MAIS Manim v2 owner gate handoff bundle carries A06 source mismatch reasons", () => {
  const mismatchReasons = ["a06-confirmation-count=55/60"];
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    a06SourceConfirmationLedger: {
      ...a06SourceConfirmationLedger(),
      a06ConfirmedDecisionCount: 55,
      confirmationCount: 55,
      pendingA18DecisionCount: 55,
      summary:
        "a06TeachingSourceConfirmationLedger:status=a06-source-confirmed-a18-pending:confirmed=55/60:pendingA18=55"
    },
    commandPacket: commandPacket(),
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2OwnerGateHandoffBundleDataAttributes(bundle);
  const a18 = bundle.ownerRows.find((row) => row.ownerAgentId === "A18");

  assert.ok(a18);
  assert.deepEqual(
    (bundle as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.deepEqual(
    (a18 as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    mismatchReasons
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-mismatch-reasons"],
    mismatchReasons.join("|")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-a06-source-mismatch-reasons-manifest"],
    "A11=none;A18=a06-confirmation-count=55/60;A22=none"
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-summary"],
    /a06SourceMismatch=a06-confirmation-count=55\/60/
  );
});

test("MAIS Manim v2 owner gate handoff bundle carries submission-bridge verified-closure gate manifests", () => {
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    commandPacket: commandPacket(),
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes,
    proofLedger: proofLedger(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2OwnerGateHandoffBundleDataAttributes(bundle);

  assert.equal(
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateIds,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids"
    ]
  );
  assert.equal(
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ]
  );
  assert.equal(
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateOwnerManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest"
    ]
  );
  assert.equal(
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest,
    finalObjectiveSubmissionBridgeVerifiedClosureDataAttributes[
      "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ]
  );
  assert.deepEqual(bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateAttributeNames, [
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-coverage-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-ids",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-owner-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-gate-status-manifest",
    "data-viz-manim-v2-final-objective-submission-bridge-verified-closure-status"
  ]);
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-status-manifest"
    ],
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateStatusManifest
  );
  assert.equal(
    attributes[
      "data-viz-manim-v2-owner-gate-handoff-final-objective-submission-bridge-verified-closure-gate-coverage-manifest"
    ],
    bundle.finalObjectiveSubmissionBridgeVerifiedClosureGateCoverageManifest
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-summary"],
    /submissionBridgeVerifiedClosure=complete/
  );
});

test("MAIS Manim v2 owner gate handoff bundle carries bounded source-architecture constraints to each owner", () => {
  const bundle = buildMathSceneV2OwnerGateHandoffBundle({
    commandPacket: commandPacket(),
    proofLedger: proofLedger(),
    sourceArchitectureHandoff: sourceArchitectureHandoff(),
    transcriptRequestPacket: transcriptRequestPacket()
  });
  const attributes = mathSceneV2OwnerGateHandoffBundleDataAttributes(bundle);

  assert.equal(bundle.sourceArchitectureHandoffStatus, "source-architecture-ready-owner-gates-open");
  assert.equal(bundle.sourceArchitectureBulkCourseGenerationAllowed, false);
  assert.equal(bundle.sourceArchitectureFutureInvocationScope, "one-topic-one-concept-cluster-or-one-review-slice");
  assert.deepEqual(bundle.sourceArchitectureRequiredOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.deepEqual(bundle.sourceArchitectureOpenOwnerGateIds, [
    "a11-browser-visual-interaction-regression",
    "a18-a06-teaching-quality-confirmation",
    "a22-clean-release-gate"
  ]);
  assert.ok(bundle.ownerRows.every((row) => row.sourceArchitectureBulkCourseGenerationAllowed === false));
  assert.ok(
    bundle.ownerRows.every(
      (row) => row.sourceArchitectureFutureInvocationScope === "one-topic-one-concept-cluster-or-one-review-slice"
    )
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-architecture-source-contract"],
    MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-architecture-bulk-course-generation"],
    "false"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-architecture-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-architecture-scope-manifest"],
    "A11=one-topic-one-concept-cluster-or-one-review-slice;A18=one-topic-one-concept-cluster-or-one-review-slice;A22=one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-source-architecture-open-owner-gates"],
    /a22-clean-release-gate/
  );
  assert.match(
    attributes["data-viz-manim-v2-owner-gate-handoff-summary"],
    /sourceArchitecture=source-architecture-ready-owner-gates-open/
  );
});
