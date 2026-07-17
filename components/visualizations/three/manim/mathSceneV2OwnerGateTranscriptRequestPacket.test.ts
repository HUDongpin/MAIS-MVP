import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import {
  type MathSceneV2OwnerGateRerunCommandPacket,
  type MathSceneV2OwnerGateRerunCommandRow,
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import { buildMathSceneV2OwnerGateRerunCommandTranscriptIntake } from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";
import {
  buildMathSceneV2OwnerGateTranscriptRequestPacket,
  mathSceneV2OwnerGateTranscriptRequestPacketDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT
} from "./mathSceneV2OwnerGateTranscriptRequestPacket";

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
      commandEnv: { VISUALIZATION_SWEEP_LABS: "hk-demo-safe-01" },
      evidenceId: "a11-hk-demo-safe-01-visualization-values-rerun",
      instruction: "A11 reruns the HK demo-safe visualization values package and records run evidence.",
      kind: "browser-regression-command",
      ownerAgentId: "A11",
      protocol: ["run-playwright", "record-run-id", "attach-report"],
      rerunTarget: "a11-browser-visual-interaction-regression",
      stepId: "01-owner-gate-A11",
      summary: "01-owner-gate-A11:A11:hk-demo-safe-01:visualization-values"
    }),
    commandRowFixture({
      command:
        "npx playwright test tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome --reporter=line",
      evidenceId: "a11-visualization-overlap-rerun",
      instruction: "A11 reruns the Visualization Lab overlap/mobile interaction gate.",
      kind: "browser-regression-command",
      ownerAgentId: "A11",
      protocol: ["run-playwright", "record-run-id", "attach-report"],
      rerunTarget: "a11-browser-visual-interaction-regression",
      stepId: "01-owner-gate-A11",
      summary: "01-owner-gate-A11:A11:visualization-overlap"
    })
  ];
  const a18Rows = [
    commandRowFixture({
      evidenceId: "a18-area-model-rendered-route-review",
      href: "/visualization-lab?scene=area-model",
      instruction: "A18 opens the area-model route, checks selectors and criteria, then records review evidence.",
      kind: "teaching-route-review",
      ownerAgentId: "A18",
      protocol: ["open-route", "inspect-scene", "record-review-decision"],
      rerunTarget: "a18-a06-teaching-quality-confirmation",
      sectionSelector: "[data-viz-manim-scene='area-model']",
      stepId: "02-owner-gate-A18",
      summary: "02-owner-gate-A18:A18:area-model:rendered-route-review"
    }),
    commandRowFixture({
      evidenceId: "a18-coordinate-plane-rendered-route-review",
      href: "/visualization-lab?scene=coordinate-plane",
      instruction: "A18 opens the coordinate-plane route, checks selectors and criteria, then records review evidence.",
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
      evidenceId: "a22-release-preflight-rerun",
      instruction: "A22 reruns release preflight after preserving required evidence.",
      kind: "release-command",
      ownerAgentId: "A22",
      protocol: ["run-command", "record-output", "attach-report"],
      rerunTarget: "a22-clean-release-gate",
      stepId: "03-owner-gate-A22",
      summary: "03-owner-gate-A22:A22:a22-release-preflight-rerun"
    }),
    commandRowFixture({
      command: "node scripts/cleanup-generated-artifacts.mjs --dry-run",
      evidenceId: "a22-generated-artifact-cleanup-dry-run",
      instruction: "A22 confirms generated-artifact cleanup candidates without deleting evidence.",
      kind: "release-command",
      ownerAgentId: "A22",
      protocol: ["run-command", "record-output", "attach-report"],
      rerunTarget: "a22-clean-release-gate",
      stepId: "03-owner-gate-A22",
      summary: "03-owner-gate-A22:A22:a22-generated-artifact-cleanup-dry-run"
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
  const browserCommandCount = a11Rows.length;
  const releaseCommandCount = a22Rows.length;
  const teachingReviewCount = a18Rows.length;

  return {
    browserCommandCount,
    canMarkThreadGoalComplete: false,
    missingOwnerAgentIds: [],
    ownerActionEvidenceCountManifest: "fixture-owner-action-evidence-counts",
    ownerAcceptanceCriteriaManifest: "fixture-owner-acceptance-criteria",
    ownerAgentIds: ["A11", "A18", "A22"],
    ownerEvidenceRequirementManifest: "fixture-owner-evidence-requirements",
    ownerPacketCount: ownerPackets.length,
    ownerPackets,
    releaseCommandCount,
    reviewSliceConsumerGateEvidenceIdManifest:
      "manim-review-slice-01=A06-source-review:source-review-note:ready-for-slice-review",
    reviewSliceCount: 20,
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateTranscriptRequestPacket.ts",
    reviewSliceIds: "manim-review-slice-01,manim-review-slice-02",
    reviewSliceSummary: "20@24",
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
    status: "owner-rerun-commands-ready",
    summary:
      "mathSceneV2OwnerGateRerunCommandPacket:status=owner-rerun-commands-ready:owners=A11,A18,A22:browserCommands=2:releaseCommands=2:teachingReviews=2",
    teachingReviewCount,
    totalCommandCount: browserCommandCount + releaseCommandCount,
    ...overrides
  };
}

function transcriptRequestFixture() {
  const commandPacket = commandPacketFixture();

  return {
    commandPacket,
    teachingRenderedRouteCount: commandPacket.teachingReviewCount
  };
}

test("MAIS Manim v2 owner gate transcript request packet builds pending templates for A11, A18, and A22", () => {
  const { commandPacket, teachingRenderedRouteCount } = transcriptRequestFixture();
  const requestPacket = buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacket);

  assert.equal(requestPacket.sourceContract, MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT);
  assert.equal(requestPacket.status, "pending-owner-transcripts");
  assert.equal(requestPacket.canMarkThreadGoalComplete, false);
  assert.deepEqual(requestPacket.ownerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(requestPacket.ownerPacketCount, 3);
  assert.equal(
    requestPacket.requestedTranscriptCount,
    commandPacket.browserCommandCount + commandPacket.releaseCommandCount + commandPacket.teachingReviewCount
  );
  assert.equal(requestPacket.commandTranscriptCount, commandPacket.browserCommandCount + commandPacket.releaseCommandCount);
  assert.equal(requestPacket.routeReviewTranscriptCount, commandPacket.teachingReviewCount);

  const a11Packet = requestPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A11");
  assert.ok(a11Packet);
  assert.equal(a11Packet.routeReviewTranscriptCount, 0);
  assert.ok(a11Packet.commandTranscriptCount > 0);
  assert.ok(a11Packet.rows.every((row) => row.command));
  assert.ok(a11Packet.rows.every((row) => row.expectedExitCode === 0));
  assert.ok(a11Packet.rows.every((row) => row.requiredTranscriptFields.includes("runId")));
  assert.ok(a11Packet.rows.every((row) => row.requiredTranscriptFields.includes("reportPath")));

  const a22Packet = requestPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A22");
  assert.ok(a22Packet);
  assert.equal(a22Packet.commandTranscriptCount, commandPacket.releaseCommandCount);
  assert.ok(a22Packet.rows.every((row) => row.command?.includes("npm") || row.command?.includes("node") || row.command?.includes("cd ")));
  assert.ok(a22Packet.rows.every((row) => row.requiredTranscriptFields.includes("reportPath")));

  const a18Packet = requestPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A18");
  assert.ok(a18Packet);
  assert.equal(a18Packet.commandTranscriptCount, 0);
  assert.equal(a18Packet.routeReviewTranscriptCount, teachingRenderedRouteCount);
  assert.ok(a18Packet.rows.every((row) => row.href?.startsWith("/")));
  assert.ok(a18Packet.rows.every((row) => row.sectionSelector));
  assert.ok(a18Packet.rows.every((row) => row.allowedReviewDecisions.includes("revision-required")));
  assert.ok(a18Packet.rows.every((row) => row.requiredTranscriptFields.includes("reviewDecision")));
});

test("MAIS Manim v2 owner gate transcript request templates do not manufacture accepted evidence", () => {
  const { commandPacket } = transcriptRequestFixture();
  const requestPacket = buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacket);
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    commandPacket,
    requestPacket.ownerPackets.flatMap((packet) => packet.rows.map((row) => row.transcriptTemplate))
  );

  assert.equal(requestPacket.ownerPackets.every((packet) => packet.rows.every((row) => row.status === "pending-transcript")), true);
  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.acceptedTranscriptCount, 0);
  assert.equal(requestPacket.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 owner gate transcript request packet blocks when command packets are missing owner rows", () => {
  const commandPacket = commandPacketFixture({
    browserCommandCount: 0,
    missingOwnerAgentIds: ["A11", "A18", "A22"],
    ownerAgentIds: [],
    ownerPacketCount: 0,
    ownerPackets: [],
    releaseCommandCount: 0,
    status: "blocked-missing-owner-gate-steps",
    summary:
      "mathSceneV2OwnerGateRerunCommandPacket:status=blocked-missing-owner-gate-steps:owners=none:browserCommands=0:releaseCommands=0:teachingReviews=0",
    teachingReviewCount: 0,
    totalCommandCount: 0
  });
  const requestPacket = buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacket);

  assert.equal(requestPacket.status, "blocked-missing-command-packets");
  assert.equal(requestPacket.ownerPacketCount, 0);
  assert.equal(requestPacket.requestedTranscriptCount, 0);
  assert.deepEqual(requestPacket.missingOwnerAgentIds, ["A11", "A18", "A22"]);
  assert.equal(requestPacket.canMarkThreadGoalComplete, false);
});

test("MAIS Manim v2 owner gate transcript request packet serializes stable owner handoff attributes", () => {
  const { commandPacket } = transcriptRequestFixture();
  const requestPacket = buildMathSceneV2OwnerGateTranscriptRequestPacket(commandPacket);
  const attributes = mathSceneV2OwnerGateTranscriptRequestPacketDataAttributes(requestPacket);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateTranscriptRequestPacket.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_TRANSCRIPT_REQUEST_PACKET_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-request-status"], "pending-owner-transcripts");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-request-owner-count"], "3");
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-request-owners"], "A11,A18,A22");
  assert.equal(
    (requestPacket as { reviewSliceCount?: number }).reviewSliceCount,
    commandPacket.reviewSliceCount
  );
  assert.equal(
    (requestPacket as { reviewSliceIds?: string }).reviewSliceIds,
    commandPacket.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-review-slice-count"],
    String(commandPacket.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-review-slice-ids"],
    commandPacket.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-review-slice-file-manifest"],
    commandPacket.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-review-slice-consumer-gate-evidence-id-manifest"],
    commandPacket.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(requestPacket.summary, /reviewSlices=20@24/);
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-row-ids"],
    requestPacket.ownerPackets.flatMap((packet) => packet.rows.map((row) => row.rowEvidenceId)).join(",")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-row-kind-manifest"],
    requestPacket.ownerPackets
      .flatMap((packet) => packet.rows.map((row) => `${row.rowEvidenceId}=${row.ownerAgentId}:${row.kind}`))
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-required-fields-manifest"],
    requestPacket.ownerPackets
      .flatMap((packet) => packet.rows.map((row) => `${row.rowEvidenceId}=${row.requiredTranscriptFields.join("|")}`))
      .join(";")
  );
  assert.equal(
    attributes["data-viz-manim-v2-owner-gate-transcript-request-template-manifest"],
    requestPacket.ownerPackets
      .flatMap((packet) =>
        packet.rows.map(
          (row) =>
            `${row.rowEvidenceId}=template:${row.transcriptTemplate.evidenceId}|owner:${row.transcriptTemplate.ownerAgentId}|kind:${row.transcriptTemplate.kind}`
        )
      )
      .join(";")
  );
  assert.equal(attributes["data-viz-manim-v2-owner-gate-transcript-request-can-complete"], "false");
});
