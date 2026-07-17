import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMathSceneV2OwnerGateTranscriptReadinessPacket,
  mathSceneV2OwnerGateTranscriptReadinessPacketDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateTranscriptReadinessPacket";
import {
  type MathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandRow,
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import { buildMathSceneV2OwnerGateTranscriptRequestPacket } from "./mathSceneV2OwnerGateTranscriptRequestPacket";
import {
  buildMathSceneV2SourceArchitectureHandoffReport,
  type MathSceneV2SourceArchitectureHandoffReport
} from "./mathSceneV2SourceArchitectureHandoffReport";
import { MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT } from "./mathSceneV2SourceArchitectureHandoff";
import {
  type MathSceneTeachingA06FinalReviewHandoffPacket,
  MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT
} from "./mathSceneTeachingA06FinalReviewHandoffPacket";

const openOwnerGateIds = [
  "a11-browser-visual-interaction-regression",
  "a18-a06-teaching-quality-confirmation",
  "a22-clean-release-gate"
] as const;

const requiredOwnerGateIds = [
  "a06-review-package-split",
  ...openOwnerGateIds
] as const;

function commandRowFixture(row: MathSceneV2OwnerGateRerunCommandRow): MathSceneV2OwnerGateRerunCommandRow {
  return row;
}

function commandPacketFixture(
  overrides: Partial<MathSceneV2OwnerGateRerunCommandPacket> = {}
): MathSceneV2OwnerGateRerunCommandPacket {
  const a11Rows = [
    commandRowFixture({
      command:
        "npx playwright test tests/e2e/visualization-values.spec.ts --project=desktop-chrome --grep manim-v2 --reporter=line",
      evidenceId: "a11-manim-v2-browser-regression-rerun",
      instruction: "A11 reruns Manim v2 browser visual and interaction regression evidence.",
      kind: "browser-regression-command",
      ownerAgentId: "A11",
      protocol: ["run-playwright", "record-run-id", "attach-report"],
      rerunTarget: "a11-browser-visual-interaction-regression",
      stepId: "01-owner-gate-A11",
      summary: "01-owner-gate-A11:A11:manim-v2-browser-regression"
    })
  ];
  const a18Rows = [
    commandRowFixture({
      evidenceId: "a18-manim-v2-rendered-route-review",
      href: "/visualization-lab?scene=coordinate-plane",
      instruction: "A18 records the rendered Manim v2 teaching-quality decision.",
      kind: "teaching-route-review",
      ownerAgentId: "A18",
      protocol: ["open-route", "inspect-scene", "record-review-decision"],
      rerunTarget: "a18-a06-teaching-quality-confirmation",
      sectionSelector: "[data-viz-manim-scene='coordinate-plane']",
      stepId: "02-owner-gate-A18",
      summary: "02-owner-gate-A18:A18:coordinate-plane:rendered-route-review"
    })
  ];
  const a22Rows = [
    commandRowFixture({
      command: "npm run release:preflight -- --json",
      evidenceId: "a22-manim-v2-clean-release-preflight-rerun",
      instruction: "A22 reruns clean release preflight for the Manim v2 reviewed slice.",
      kind: "release-command",
      ownerAgentId: "A22",
      protocol: ["run-command", "record-output", "attach-report"],
      rerunTarget: "a22-clean-release-gate",
      stepId: "03-owner-gate-A22",
      summary: "03-owner-gate-A22:A22:clean-release-preflight"
    })
  ];
  const ownerPackets = [
    {
      commandCount: a11Rows.length,
      manualReviewCount: 0,
      ownerAgentId: "A11",
      rows: a11Rows
    },
    {
      commandCount: 0,
      manualReviewCount: a18Rows.length,
      ownerAgentId: "A18",
      rows: a18Rows
    },
    {
      commandCount: a22Rows.length,
      manualReviewCount: 0,
      ownerAgentId: "A22",
      rows: a22Rows
    }
  ];

  return {
    browserCommandCount: a11Rows.length,
    canMarkThreadGoalComplete: false,
    missingOwnerAgentIds: [],
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    releaseCommandCount: a22Rows.length,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 21,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateTranscriptReadinessPacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "21@24",
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
    status: "owner-rerun-commands-ready",
    summary:
      "mathSceneV2OwnerGateRerunCommandPacket:status=owner-rerun-commands-ready:owners=A11,A18,A22:browserCommands=1:releaseCommands=1:teachingReviews=1",
    teachingReviewCount: a18Rows.length,
    totalCommandCount: a11Rows.length + a22Rows.length,
    ...overrides
  };
}

function sourceArchitectureReportFixture(): MathSceneV2SourceArchitectureHandoffReport {
  return buildMathSceneV2SourceArchitectureHandoffReport({
    checkedAtHkt: "2026-07-03 20:05 HKT",
    crossAgentHandoff: {
      canMarkThreadGoalComplete: false,
      sourceArchitectureAcceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureCanMarkThreadGoalComplete: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: [...openOwnerGateIds],
      sourceArchitectureRequiredOwnerGateIds: [...requiredOwnerGateIds],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false",
      status: "needs-owner-action"
    },
    releaseSliceManifest: {
      fileCount: 401,
      packageCount: 8,
      reviewSliceCount: 21,
      reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
      reviewSliceLargestFileCount: 24,
      reviewSliceMaxFilesPerSlice: 24,
      sourceArchitectureAcceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      sourceArchitectureBulkCourseGenerationAllowed: false,
      sourceArchitectureCanMarkThreadGoalComplete: false,
      sourceArchitectureFutureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      sourceArchitectureHandoffStatus: "source-architecture-ready-owner-gates-open",
      sourceArchitectureOpenOwnerGateIds: [...openOwnerGateIds],
      sourceArchitectureRequiredOwnerGateIds: [...requiredOwnerGateIds],
      sourceArchitectureSourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      sourceArchitectureSummary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false",
      status: "ready-for-a22-clean-slice-review"
    },
    sourceArchitectureHandoff: {
      acceptanceCriteria: [
        "bounded-source-architecture-slice",
        "no-bulk-course-generation",
        "owner-gates-requested-not-accepted"
      ],
      bulkCourseGenerationAllowed: false,
      canMarkThreadGoalComplete: false,
      futureInvocationScope: "one-topic-one-concept-cluster-or-one-review-slice",
      openOwnerGateIds: [...openOwnerGateIds],
      requiredOwnerGateIds: [...openOwnerGateIds],
      reviewPackageCount: 8,
      reviewSliceCount: 21,
      reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
      reviewSliceSummary: "21@24",
      sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_SOURCE_CONTRACT,
      status: "source-architecture-ready-owner-gates-open",
      summary:
        "mathSceneV2SourceArchitectureHandoff:status=source-architecture-ready-owner-gates-open:bulkCourseGeneration=false"
    }
  });
}

function teachingHandoffFixture(): MathSceneTeachingA06FinalReviewHandoffPacket {
  return {
    a06ConfirmedDecisionCount: 60,
    a18CanonicalReportPath: "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md",
    a18ReviewerAgentId: "A18",
    blockedConfirmationCount: 0,
    blockers: [],
    canMarkA18GateComplete: false,
    caseCount: 12,
    caseStatusManifest: "fixture-ready-cases",
    checkedAtHkt: "2026-07-03 20:05 HKT",
    criteriaStatusManifest: "fixture-criteria-statuses",
    criterionCount: 5,
    decisionCount: 60,
    ownerAgentIds: ["A06", "A18"],
    pendingA18DecisionCount: 60,
    readyCaseCount: 12,
    readyProofPointCount: 108,
    requiredA18DecisionCriteria: [
      "curriculum-fit",
      "mathematical-accuracy",
      "cognitive-load",
      "language-and-labels",
      "interaction-timing"
    ],
    rows: [],
    sourceContract: MATH_SCENE_TEACHING_A06_FINAL_REVIEW_HANDOFF_PACKET_SOURCE_CONTRACT,
    status: "a06-final-review-handoff-ready-a18-pending",
    summary:
      "a06TeachingFinalReviewHandoffPacket:status=a06-final-review-handoff-ready-a18-pending:cases=12/12:decisions=60/60-a06-confirmed:pendingA18=60:proofPoints=108/108",
    totalProofPointCount: 108
  };
}

function readinessPacketFixture() {
  return buildMathSceneV2OwnerGateTranscriptReadinessPacket({
    checkedAtHkt: "2026-07-03 20:05 HKT",
    reportDate: "2026-07-03",
    sourceArchitectureReport: sourceArchitectureReportFixture(),
    transcriptRequestPacket: buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacketFixture())
  });
}

test("MAIS Manim v2 owner gate transcript readiness packet routes A11, A18, and A22 parallel handoff rows", () => {
  const packet = readinessPacketFixture();

  assert.equal(packet.sourceContract, MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT);
  assert.equal(packet.status, "ready-for-parallel-owner-gate-transcripts");
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.parallelOwnerGateMode, "A11+A18+A22");
  assert.equal(packet.sourceArchitectureReportStatus, "current-cross-agent-evidence-attached");
  assert.equal(packet.transcriptRequestStatus, "pending-owner-transcripts");
  assert.equal(packet.bulkCourseGenerationAllowed, false);
  assert.equal(packet.futureInvocationScope, "one-topic-one-concept-cluster-or-one-review-slice");
  assert.deepEqual(packet.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(packet.ownerPacketCount, 3);
  assert.equal(packet.totalReadinessRowCount, 3);
  assert.equal(packet.commandReadinessRowCount, 2);
  assert.equal(packet.routeReviewReadinessRowCount, 1);
  assert.equal(packet.ownerPackets.every((ownerPacket) => ownerPacket.status === "ready-for-owner-transcript"), true);

  const rows = packet.ownerPackets.flatMap((ownerPacket) => ownerPacket.rows);
  assert.equal(rows.every((row) => row.canonicalReportPath.startsWith("coordination/")), true);
  assert.equal(rows.every((row) => row.requiredReadinessFields.includes("canonicalReportPath")), true);
  assert.equal(rows.every((row) => row.requiredReadinessFields.includes("ownerAgentId")), true);
  assert.equal(rows.every((row) => row.requiredReadinessFields.includes("rowEvidenceId")), true);

  const a11Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A11");
  assert.ok(a11Packet);
  assert.deepEqual(a11Packet.canonicalReportPaths, [
    "coordination/reports/2026-07-03-A11-manim-v2-browser-visual-interaction-regression.md"
  ]);
  assert.equal(a11Packet.rows.every((row) => row.requiredReadinessFields.includes("reportPath")), true);

  const a18Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");
  assert.ok(a18Packet);
  assert.deepEqual(a18Packet.canonicalReportPaths, [
    "coordination/content-qa/2026-07-03-A18-manim-v2-teaching-quality-final-decisions.md"
  ]);
  assert.equal(a18Packet.rows.every((row) => row.requiredReadinessFields.includes("reviewDecision")), true);

  const a22Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A22");
  assert.ok(a22Packet);
  assert.deepEqual(a22Packet.canonicalReportPaths, [
    "coordination/reports/2026-07-03-A22-manim-v2-clean-release-gate.md"
  ]);
  assert.equal(a22Packet.rows.every((row) => row.requiredReadinessFields.includes("exitCode")), true);

  assert.match(packet.ownerStatusManifest, /A11=ready-for-owner-transcript/);
  assert.match(packet.ownerStatusManifest, /A18=ready-for-owner-transcript/);
  assert.match(packet.ownerStatusManifest, /A22=ready-for-owner-transcript/);
  assert.match(packet.summary, /parallelOwnerGateMode=A11\+A18\+A22/);
});

test("MAIS Manim v2 owner gate transcript readiness packet carries the A06 teaching handoff into the A18 owner gate", () => {
  const teachingHandoff = teachingHandoffFixture();
  const packet = buildMathSceneV2OwnerGateTranscriptReadinessPacket({
    checkedAtHkt: "2026-07-03 20:05 HKT",
    reportDate: "2026-07-03",
    sourceArchitectureReport: sourceArchitectureReportFixture(),
    teachingHandoff,
    transcriptRequestPacket: buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacketFixture())
  });

  assert.equal(packet.a18TeachingHandoffStatus, "a06-final-review-handoff-ready-a18-pending");
  assert.equal(packet.a18TeachingCanonicalReportPath, teachingHandoff.a18CanonicalReportPath);
  assert.equal(packet.a18TeachingCaseCount, 12);
  assert.equal(packet.a18TeachingReadyCaseCount, 12);
  assert.equal(packet.a18TeachingDecisionCount, 60);
  assert.equal(packet.a18TeachingPendingDecisionCount, 60);
  assert.equal(packet.a18TeachingReadyProofPointCount, 108);
  assert.equal(packet.a18TeachingTotalProofPointCount, 108);

  const a18Packet = packet.ownerPackets.find((ownerPacket) => ownerPacket.ownerAgentId === "A18");
  assert.ok(a18Packet);
  assert.deepEqual(a18Packet.canonicalReportPaths, [teachingHandoff.a18CanonicalReportPath]);
  assert.equal(
    a18Packet.rows.every((row) => row.requiredReadinessFields.includes("a18FinalTeachingDecisionRecord")),
    true
  );
  assert.match(packet.requiredReadinessFieldManifest, /a18FinalTeachingDecisionRecord/);
  assert.match(packet.summary, /a18TeachingHandoff=a06-final-review-handoff-ready-a18-pending/);

  const attributes = mathSceneV2OwnerGateTranscriptReadinessPacketDataAttributes(packet);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-a18-teaching-handoff-status"],
    "a06-final-review-handoff-ready-a18-pending"
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-a18-teaching-case-count"], "12");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-a18-teaching-decision-count"], "60");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-a18-teaching-pending-count"], "60");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-a18-teaching-proof-points"], "108/108");
});

test("MAIS Manim v2 owner gate transcript readiness packet blocks stale source-architecture reports", () => {
  const packet = buildMathSceneV2OwnerGateTranscriptReadinessPacket({
    checkedAtHkt: "2026-07-03 20:05 HKT",
    reportDate: "2026-07-03",
    sourceArchitectureReport: buildMathSceneV2SourceArchitectureHandoffReport({
      ...sourceArchitectureReportFixture().inputSnapshot,
      releaseSliceManifest: {
        ...sourceArchitectureReportFixture().inputSnapshot.releaseSliceManifest,
        sourceArchitectureHandoffStatus: "not-attached"
      }
    }),
    transcriptRequestPacket: buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacketFixture())
  });

  assert.equal(packet.status, "blocked-stale-source-architecture-report");
  assert.equal(packet.canMarkThreadGoalComplete, false);
  assert.equal(packet.sourceArchitectureReady, false);
  assert.equal(packet.transcriptRequestReady, true);
  assert.deepEqual(packet.blockers, ["source-architecture-report-stale-or-mismatched"]);
  assert.equal(packet.ownerPacketCount, 0);
});

test("MAIS Manim v2 owner gate transcript readiness packet serializes stable parallel-owner data attributes", () => {
  const packet = readinessPacketFixture();
  const attributes = mathSceneV2OwnerGateTranscriptReadinessPacketDataAttributes(packet);

  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_READINESS_PACKET_SOURCE_CONTRACT
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-status"],
    "ready-for-parallel-owner-gate-transcripts"
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-parallel-owner-mode"], "A11+A18+A22");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-owners"], "A11,A18,A22");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-owner-status-manifest"], packet.ownerStatusManifest);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-canonical-report-path-manifest"],
    packet.canonicalReportPathManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-required-fields-manifest"],
    packet.requiredReadinessFieldManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-source-architecture-status"],
    "current-cross-agent-evidence-attached"
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-readiness-future-invocation-scope"],
    "one-topic-one-concept-cluster-or-one-review-slice"
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-readiness-bulk-course-generation"], "false");
});
