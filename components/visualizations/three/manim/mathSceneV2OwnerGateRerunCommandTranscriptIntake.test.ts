import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildMathSceneV2OwnerGateRerunCommandEvidenceIntake } from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";
import {
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_PACKET_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateRerunCommandPacket
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import {
  buildMathSceneV2OwnerGateRerunCommandTranscriptIntake,
  mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes,
  MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT,
  type MathSceneV2OwnerGateRerunCommandTranscriptRecord
} from "./mathSceneV2OwnerGateRerunCommandTranscriptIntake";

function transcriptFixture() {
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
    reviewSliceFileManifest: "manim-review-slice-01=mathSceneV2OwnerGateRerunCommandTranscriptIntake.ts",
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

  return {
    commandPacket
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

test("MAIS Manim v2 command transcript intake validates passing command transcripts into command evidence records", () => {
  const { commandPacket } = transcriptFixture();
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    commandPacket,
    passingTranscripts(commandPacket)
  );

  assert.equal(intake.sourceContract, MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "command-transcripts-covered");
  assert.equal(intake.acceptedTranscriptCount, intake.requiredTranscriptCount);
  assert.equal(intake.blockedTranscriptCount, 0);
  assert.equal(intake.invalidTranscriptCount, 0);
  assert.equal(intake.missingTranscriptCount, 0);
  assert.equal(intake.commandEvidenceRecords.length, intake.requiredTranscriptCount);
  assert.ok(intake.commandEvidenceRecords.every((record) => record.status === "accepted"));

  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    intake.commandEvidenceRecords
  );
  assert.equal(commandEvidenceIntake.status, "owner-command-evidence-covered");
});

test("MAIS Manim v2 command transcript intake keeps missing rows pending before command evidence synthesis", () => {
  const { commandPacket } = transcriptFixture();
  const a18FirstRow = commandPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A18")?.rows[0];
  assert.ok(a18FirstRow);
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    commandPacket,
    passingTranscripts(commandPacket).filter((record) => record.rowEvidenceId !== a18FirstRow.evidenceId)
  );

  assert.equal(intake.status, "pending-command-transcripts");
  assert.equal(intake.missingTranscriptCount, 1);
  assert.equal(intake.commandEvidenceRecords.length, intake.requiredTranscriptCount - 1);

  const commandEvidenceIntake = buildMathSceneV2OwnerGateRerunCommandEvidenceIntake(
    commandPacket,
    intake.commandEvidenceRecords
  );
  assert.equal(commandEvidenceIntake.status, "pending-owner-command-evidence");
});

test("MAIS Manim v2 command transcript intake turns failing command transcripts into blocked command evidence", () => {
  const { commandPacket } = transcriptFixture();
  const failingRow = commandPacket.ownerPackets
    .find((packet) => packet.ownerAgentId === "A22")
    ?.rows.find((row) => row.evidenceId === "a22-release-preflight-rerun");
  assert.ok(failingRow);
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
    commandPacket,
    passingTranscripts(commandPacket).map((record) =>
      record.rowEvidenceId === failingRow.evidenceId
        ? { ...record, evidenceId: "failed-a22-release-preflight-transcript", exitCode: 1 }
        : record
    )
  );

  assert.equal(intake.status, "blocked-command-transcript");
  assert.equal(intake.blockedTranscriptCount, 1);
  assert.equal(
    intake.commandEvidenceRecords.find((record) => record.rowEvidenceId === failingRow.evidenceId)?.status,
    "blocked"
  );
});

test("MAIS Manim v2 command transcript intake blocks duplicate transcript evidence IDs before command evidence synthesis", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const duplicateEvidenceId = transcripts[0]?.evidenceId;
  assert.ok(duplicateEvidenceId);

  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 1 ? { ...record, evidenceId: duplicateEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.deepEqual(intake.duplicateTranscriptEvidenceIds, [duplicateEvidenceId]);
  assert.equal(intake.invalidTranscriptCount, 2);
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"], duplicateEvidenceId);
});

test("MAIS Manim v2 command transcript intake blocks non-canonical transcript evidence IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const paddedTranscriptEvidenceId = ` ${transcripts[0]?.evidenceId} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, evidenceId: paddedTranscriptEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptEvidenceIds, [paddedTranscriptEvidenceId]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => transcript.evidenceId),
    [paddedTranscriptEvidenceId]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-command-transcript-invalid"], "1");
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-evidence-ids"],
    paddedTranscriptEvidenceId
  );
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"], "none");
  assert.match(intake.summary, /nonCanonicalTranscriptIds= transcript-/);
});

test("MAIS Manim v2 command transcript intake exposes missing transcript evidence IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const blankTranscriptEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, evidenceId: blankTranscriptEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.equal(intake.missingTranscriptEvidenceIdCount, 1);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => transcript.evidenceId),
    [blankTranscriptEvidenceId]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-evidence-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-evidence-ids"],
    "none"
  );
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"], "none");
  assert.match(intake.summary, /missingTranscriptIds=1/);
});

test("MAIS Manim v2 command transcript intake exposes omitted transcript evidence IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) => {
    if (index !== 0) return record;

    const { evidenceId: _evidenceId, ...recordWithoutEvidenceId } = record;

    return recordWithoutEvidenceId as unknown as MathSceneV2OwnerGateRerunCommandTranscriptRecord;
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.equal(intake.missingTranscriptEvidenceIdCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptEvidenceIds, []);
  assert.deepEqual(intake.duplicateTranscriptEvidenceIds, []);
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-evidence-id-count"],
    "1"
  );
  assert.equal(attributes["data-viz-manim-v2-command-transcript-non-canonical-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"], "none");
  assert.match(intake.summary, /missingTranscriptIds=1/);
});

test("MAIS Manim v2 command transcript intake keeps missing transcript evidence IDs out of duplicate diagnostics", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const blankTranscriptEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 || index === 1 ? { ...record, evidenceId: blankTranscriptEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 2);
  assert.equal(intake.missingTranscriptEvidenceIdCount, 2);
  assert.deepEqual(intake.duplicateTranscriptEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalTranscriptEvidenceIds, []);
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-evidence-id-count"],
    "2"
  );
  assert.match(intake.summary, /duplicateTranscriptIds=none/);
  assert.match(intake.summary, /missingTranscriptIds=2/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical transcript row evidence IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const paddedRowEvidenceId = ` ${transcripts[0]?.rowEvidenceId} `;
  const paddedRowKey = `${transcripts[0]?.ownerAgentId}:${paddedRowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, rowEvidenceId: paddedRowEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptRowEvidenceIds, [paddedRowKey]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [paddedRowKey]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-row-ids"],
    paddedRowKey
  );
  assert.match(intake.summary, /nonCanonicalTranscriptRows=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes missing transcript row evidence IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const blankRowEvidenceId = "   ";
  const blankRowKey = `${transcripts[0]?.ownerAgentId}:${blankRowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, rowEvidenceId: blankRowEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.equal(intake.missingTranscriptRowEvidenceIdCount, 1);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [blankRowKey]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-row-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-row-ids"],
    "none"
  );
  assert.match(intake.summary, /missingTranscriptRows=1/);
});

test("MAIS Manim v2 command transcript intake keeps missing transcript row evidence IDs out of duplicate diagnostics", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const blankRowEvidenceId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 || index === 1 ? { ...record, rowEvidenceId: blankRowEvidenceId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 2);
  assert.equal(intake.missingTranscriptRowEvidenceIdCount, 2);
  assert.deepEqual(intake.duplicateTranscriptRowEvidenceIds, []);
  assert.deepEqual(intake.nonCanonicalTranscriptRowEvidenceIds, []);
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-duplicate-row-ids"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-row-id-count"],
    "2"
  );
  assert.match(intake.summary, /duplicateTranscriptRows=none/);
  assert.match(intake.summary, /missingTranscriptRows=2/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical transcript owner agent IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const paddedOwnerAgentId = ` ${transcripts[0]?.ownerAgentId} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, ownerAgentId: paddedOwnerAgentId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptOwnerAgentIds, [paddedOwnerAgentId]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => transcript.ownerAgentId),
    [paddedOwnerAgentId]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-owner-ids"],
    paddedOwnerAgentId
  );
  assert.match(intake.summary, /nonCanonicalTranscriptOwners= A11 /);
});

test("MAIS Manim v2 command transcript intake exposes missing transcript owner agent IDs", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const blankOwnerAgentId = "   ";
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record, index) =>
    index === 0 ? { ...record, ownerAgentId: blankOwnerAgentId } : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.equal(intake.missingTranscriptOwnerAgentIdCount, 1);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => transcript.ownerAgentId),
    [blankOwnerAgentId]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-owner-id-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-owner-ids"],
    "none"
  );
  assert.match(intake.summary, /missingTranscriptOwners=1/);
});

test("MAIS Manim v2 command transcript intake blocks duplicate transcript row evidence before command evidence synthesis", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const duplicatedRowTranscript = transcripts[0];
  assert.ok(duplicatedRowTranscript);
  const duplicateRowEvidenceId = `${duplicatedRowTranscript.ownerAgentId}:${duplicatedRowTranscript.rowEvidenceId}`;

  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, [
    ...transcripts,
    { ...duplicatedRowTranscript, evidenceId: `${duplicatedRowTranscript.evidenceId}-duplicate-row` }
  ]);
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.deepEqual(intake.duplicateTranscriptRowEvidenceIds, [duplicateRowEvidenceId]);
  assert.equal(intake.invalidTranscriptCount, 2);
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-row-ids"], duplicateRowEvidenceId);
});

test("MAIS Manim v2 command transcript intake exposes unsupported route review decisions", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const unsupportedReviewDecision = "accepted";
  const unsupportedReviewDecisionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? ({
          ...record,
          evidenceId: "unsupported-a18-route-review-decision-transcript",
          reviewDecision: unsupportedReviewDecision
        } as unknown as MathSceneV2OwnerGateRerunCommandTranscriptRecord)
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.unsupportedTranscriptReviewDecisions, [unsupportedReviewDecision]);
  assert.deepEqual(intake.unsupportedTranscriptReviewDecisionRows, [unsupportedReviewDecisionRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => String(transcript.reviewDecision)),
    [unsupportedReviewDecision]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-review-decisions"],
    unsupportedReviewDecision
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-review-decision-rows"],
    unsupportedReviewDecisionRow
  );
  assert.match(intake.summary, /unsupportedReviewDecisions=accepted/);
  assert.match(intake.summary, /unsupportedReviewDecisionRows=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes missing route review decisions", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const missingReviewDecisionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== routeReviewTranscript.evidenceId) return record;

    const { reviewDecision: _reviewDecision, ...recordWithoutReviewDecision } = record;

    return {
      ...recordWithoutReviewDecision,
      evidenceId: "missing-a18-route-review-decision-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptReviewDecisionRows, [missingReviewDecisionRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingReviewDecisionRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-review-decision-rows"],
    missingReviewDecisionRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-review-decisions"],
    "none"
  );
  assert.match(intake.summary, /missingReviewDecisions=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical route review decisions", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const nonCanonicalReviewDecisionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? ({
          ...record,
          evidenceId: "non-canonical-a18-route-review-decision-transcript",
          reviewDecision: ` ${record.reviewDecision} `
        } as unknown as MathSceneV2OwnerGateRerunCommandTranscriptRecord)
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptReviewDecisionRows, [nonCanonicalReviewDecisionRow]);
  assert.deepEqual(intake.unsupportedTranscriptReviewDecisions, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalReviewDecisionRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-review-decision-rows"],
    nonCanonicalReviewDecisionRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-review-decisions"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalReviewDecisions=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes mismatched route href rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const mismatchedRouteHrefRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "mismatched-a18-route-href-transcript",
          href: "/student/tools/visualizations/wrong-route"
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.mismatchedTranscriptRouteHrefRows, [mismatchedRouteHrefRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [mismatchedRouteHrefRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-route-href-rows"],
    mismatchedRouteHrefRow
  );
  assert.match(intake.summary, /mismatchedRouteHrefs=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes missing route href rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const missingRouteHrefRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== routeReviewTranscript.evidenceId) return record;

    const { href: _href, ...recordWithoutHref } = record;

    return {
      ...recordWithoutHref,
      evidenceId: "missing-a18-route-href-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptRouteHrefRows, [missingRouteHrefRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingRouteHrefRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-route-href-rows"],
    missingRouteHrefRow
  );
  assert.match(intake.summary, /missingRouteHrefs=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical route href rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const nonCanonicalRouteHrefRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "non-canonical-a18-route-href-transcript",
          href: ` ${record.href} `
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptRouteHrefRows, [nonCanonicalRouteHrefRow]);
  assert.deepEqual(intake.mismatchedTranscriptRouteHrefRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalRouteHrefRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-route-href-rows"],
    nonCanonicalRouteHrefRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-route-href-rows"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalRouteHrefs=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes mismatched route section rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const mismatchedRouteSectionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "mismatched-a18-route-section-transcript",
          sectionSelector: "[data-viz-manim-v2-wrong-section]"
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.mismatchedTranscriptRouteSectionRows, [mismatchedRouteSectionRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [mismatchedRouteSectionRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-route-section-rows"],
    mismatchedRouteSectionRow
  );
  assert.match(intake.summary, /mismatchedRouteSections=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes missing route section rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const missingRouteSectionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== routeReviewTranscript.evidenceId) return record;

    const { sectionSelector: _sectionSelector, ...recordWithoutSection } = record;

    return {
      ...recordWithoutSection,
      evidenceId: "missing-a18-route-section-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptRouteSectionRows, [missingRouteSectionRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingRouteSectionRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-route-section-rows"],
    missingRouteSectionRow
  );
  assert.match(intake.summary, /missingRouteSections=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical route section rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const routeReviewTranscript = transcripts.find((record) => record.kind === "teaching-route-review");
  assert.ok(routeReviewTranscript);
  const nonCanonicalRouteSectionRow = `${routeReviewTranscript.ownerAgentId}:${routeReviewTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === routeReviewTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "non-canonical-a18-route-section-transcript",
          sectionSelector: ` ${record.sectionSelector} `
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptRouteSectionRows, [nonCanonicalRouteSectionRow]);
  assert.deepEqual(intake.mismatchedTranscriptRouteSectionRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalRouteSectionRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-route-section-rows"],
    nonCanonicalRouteSectionRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-route-section-rows"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalRouteSections=A18:/);
});

test("MAIS Manim v2 command transcript intake exposes unsupported command exit codes", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const unsupportedExitCodeRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "unsupported-command-exit-code-transcript",
          exitCode: Number.NaN
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.unsupportedTranscriptExitCodes, ["NaN"]);
  assert.deepEqual(intake.unsupportedTranscriptCommandExitCodeRows, [unsupportedExitCodeRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => String(transcript.exitCode)),
    ["NaN"]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-exit-codes"],
    "NaN"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-exit-code-rows"],
    unsupportedExitCodeRow
  );
  assert.match(intake.summary, /unsupportedExitCodes=NaN/);
  assert.match(intake.summary, /unsupportedExitCodeRows=A11:/);
});

test("MAIS Manim v2 command transcript intake requires command exit codes", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const missingExitCodeRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== commandTranscript.evidenceId) return record;

    const { exitCode: _exitCode, ...recordWithoutExitCode } = record;

    return {
      ...recordWithoutExitCode,
      evidenceId: "missing-command-exit-code-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptCommandExitCodeRows, [missingExitCodeRow]);
  assert.deepEqual(intake.unsupportedTranscriptExitCodes, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingExitCodeRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-exit-code-rows"],
    missingExitCodeRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-unsupported-exit-codes"],
    "none"
  );
  assert.match(intake.summary, /missingExitCodes=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes mismatched command rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const mismatchedCommandRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          command: "npx playwright test wrong.spec.ts",
          evidenceId: "mismatched-command-text-transcript"
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.mismatchedTranscriptCommandRows, [mismatchedCommandRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [mismatchedCommandRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-command-rows"],
    mismatchedCommandRow
  );
  assert.match(intake.summary, /mismatchedCommands=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical command rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const nonCanonicalCommandRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const paddedCommand = ` ${commandTranscript.command} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          command: paddedCommand,
          evidenceId: "non-canonical-command-text-transcript"
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptCommandRows, [nonCanonicalCommandRow]);
  assert.deepEqual(intake.mismatchedTranscriptCommandRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalCommandRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-command-rows"],
    nonCanonicalCommandRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-command-rows"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalCommands=A11:/);
});

test("MAIS Manim v2 command transcript intake requires command text rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const missingCommandRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== commandTranscript.evidenceId) return record;

    const { command: _command, ...recordWithoutCommand } = record;

    return {
      ...recordWithoutCommand,
      evidenceId: "missing-command-text-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptCommandRows, [missingCommandRow]);
  assert.deepEqual(intake.mismatchedTranscriptCommandRows, []);
  assert.deepEqual(intake.nonCanonicalTranscriptCommandRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingCommandRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-command-rows"],
    missingCommandRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-command-rows"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-command-rows"],
    "none"
  );
  assert.match(intake.summary, /missingCommands=A11:/);
});

test("MAIS Manim v2 command transcript intake requires command run ids", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const missingRunIdRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== commandTranscript.evidenceId) return record;

    const { runId: _runId, ...recordWithoutRunId } = record;
    return {
      ...recordWithoutRunId,
      evidenceId: "missing-command-run-id-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptCommandRunIdRows, [missingRunIdRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingRunIdRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-run-id-rows"],
    missingRunIdRow
  );
  assert.match(intake.summary, /missingRunIds=A11:/);
});

test("MAIS Manim v2 command transcript intake requires command report paths", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const missingReportPathRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== commandTranscript.evidenceId) return record;

    const { reportPath: _reportPath, ...recordWithoutReportPath } = record;
    return {
      ...recordWithoutReportPath,
      evidenceId: "missing-command-report-path-transcript"
    };
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptCommandReportPathRows, [missingReportPathRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingReportPathRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-report-path-rows"],
    missingReportPathRow
  );
  assert.match(intake.summary, /missingReportPaths=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical command report paths", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const nonCanonicalReportPathRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const paddedReportPath = ` ${commandTranscript.reportPath} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "non-canonical-command-report-path-transcript",
          reportPath: paddedReportPath
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptCommandReportPathRows, [nonCanonicalReportPathRow]);
  assert.deepEqual(intake.missingTranscriptCommandReportPathRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalReportPathRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-report-path-rows"],
    nonCanonicalReportPathRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-report-path-rows"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalReportPaths=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes mismatched transcript kind rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const mismatchedKindRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "mismatched-command-transcript-kind",
          kind: "release-command"
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.mismatchedTranscriptKindRows, [mismatchedKindRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [mismatchedKindRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-kind-rows"],
    mismatchedKindRow
  );
  assert.match(intake.summary, /mismatchedKinds=A11:/);
});

test("MAIS Manim v2 command transcript intake requires transcript kind rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const missingKindRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) => {
    if (record.evidenceId !== commandTranscript.evidenceId) return record;

    const { kind: _kind, ...recordWithoutKind } = record;

    return {
      ...recordWithoutKind,
      evidenceId: "missing-command-transcript-kind"
    } as unknown as MathSceneV2OwnerGateRerunCommandTranscriptRecord;
  }));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.missingTranscriptKindRows, [missingKindRow]);
  assert.deepEqual(intake.mismatchedTranscriptKindRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [missingKindRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-missing-kind-rows"],
    missingKindRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-kind-rows"],
    "none"
  );
  assert.match(intake.summary, /missingKinds=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical transcript kind rows", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const nonCanonicalKindRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? ({
          ...record,
          evidenceId: "non-canonical-command-transcript-kind",
          kind: ` ${record.kind} `
        } as unknown as MathSceneV2OwnerGateRerunCommandTranscriptRecord)
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptKindRows, [nonCanonicalKindRow]);
  assert.deepEqual(intake.mismatchedTranscriptKindRows, []);
  assert.deepEqual(intake.missingTranscriptKindRows, []);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalKindRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-kind-rows"],
    nonCanonicalKindRow
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-mismatched-kind-rows"],
    "none"
  );
  assert.match(intake.summary, /nonCanonicalKinds=A11:/);
});

test("MAIS Manim v2 command transcript intake exposes non-canonical command run ids", () => {
  const { commandPacket } = transcriptFixture();
  const transcripts = passingTranscripts(commandPacket);
  const commandTranscript = transcripts.find((record) => record.kind === "browser-regression-command");
  assert.ok(commandTranscript);
  const nonCanonicalRunIdRow = `${commandTranscript.ownerAgentId}:${commandTranscript.rowEvidenceId}`;
  const paddedRunId = ` ${commandTranscript.runId} `;
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, transcripts.map((record) =>
    record.evidenceId === commandTranscript.evidenceId
      ? {
          ...record,
          evidenceId: "non-canonical-command-run-id-transcript",
          runId: paddedRunId
        }
      : record
  ));
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 1);
  assert.deepEqual(intake.nonCanonicalTranscriptCommandRunIdRows, [nonCanonicalRunIdRow]);
  assert.deepEqual(
    intake.invalidTranscripts.map((transcript) => `${transcript.ownerAgentId}:${transcript.rowEvidenceId}`),
    [nonCanonicalRunIdRow]
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-non-canonical-run-id-rows"],
    nonCanonicalRunIdRow
  );
  assert.match(intake.summary, /nonCanonicalRunIds=A11:/);
});

test("MAIS Manim v2 command transcript intake rejects mismatched commands and unknown rows", () => {
  const { commandPacket } = transcriptFixture();
  const mismatchedCommandRow = commandPacket.ownerPackets.find((packet) => packet.ownerAgentId === "A11")?.rows[0];
  assert.ok(mismatchedCommandRow);
  const unknownTranscriptRow = "A22:unknown-row";
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, [
    {
      command: "npx playwright test wrong.spec.ts",
      evidenceId: "mismatched-command-transcript",
      exitCode: 0,
      kind: mismatchedCommandRow.kind,
      ownerAgentId: mismatchedCommandRow.ownerAgentId,
      rowEvidenceId: mismatchedCommandRow.evidenceId
    },
    {
      evidenceId: "unknown-row-transcript",
      exitCode: 0,
      kind: "release-command",
      ownerAgentId: "A22",
      rowEvidenceId: "unknown-row"
    }
  ]);
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-invalid-command-transcript");
  assert.equal(intake.invalidTranscriptCount, 2);
  assert.deepEqual(intake.unknownTranscriptRowEvidenceIds, [unknownTranscriptRow]);
  assert.ok(
    intake.invalidTranscripts.some((transcript) =>
      `${transcript.ownerAgentId}:${transcript.rowEvidenceId}` === unknownTranscriptRow
    )
  );
  assert.equal(intake.commandEvidenceRecords.length, 0);
  assert.equal(intake.canMarkThreadGoalComplete, false);
  assert.equal(attributes["data-viz-manim-v2-command-transcript-unknown-row-ids"], unknownTranscriptRow);
  assert.match(intake.summary, /unknownTranscriptRows=A22:unknown-row/);
});

test("MAIS Manim v2 command transcript intake serializes stable handoff attributes", () => {
  const { commandPacket } = transcriptFixture();
  const intake = buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(commandPacket, []);
  const attributes = mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneV2OwnerGateRerunCommandTranscriptIntake.ts"), "evidence");
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-source-contract"],
    MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT
  );
  assert.equal(attributes["data-viz-manim-v2-command-transcript-status"], "pending-command-transcripts");
  assert.equal(attributes["data-viz-manim-v2-command-transcript-accepted"], "0");
  assert.equal(attributes["data-viz-manim-v2-command-transcript-can-complete"], "false");
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-evidence-ids"], "none");
  assert.equal(attributes["data-viz-manim-v2-command-transcript-duplicate-row-ids"], "none");
  assert.equal((intake as { reviewSliceCount?: number }).reviewSliceCount, commandPacket.reviewSliceCount);
  assert.equal((intake as { reviewSliceIds?: string }).reviewSliceIds, commandPacket.reviewSliceIds);
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-review-slice-count"],
    String(commandPacket.reviewSliceCount)
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-review-slice-ids"],
    commandPacket.reviewSliceIds
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-review-slice-file-manifest"],
    commandPacket.reviewSliceFileManifest
  );
  assert.equal(
    attributes["data-viz-manim-v2-command-transcript-review-slice-consumer-gate-evidence-id-manifest"],
    commandPacket.reviewSliceConsumerGateEvidenceIdManifest
  );
  assert.match(intake.summary, /reviewSlices=20@24/);
});
