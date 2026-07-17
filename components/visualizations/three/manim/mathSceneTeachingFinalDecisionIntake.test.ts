import assert from "node:assert/strict";
import test from "node:test";
import { classifyManimReviewPackage } from "./mathSceneReviewPackages";
import { buildMathSceneTeachingA06SourceConfirmationLedger } from "./mathSceneTeachingA06SourceConfirmationLedger";
import {
  buildMathSceneTeachingFinalDecisionIntake,
  mathSceneTeachingFinalDecisionIntakeDataAttributes,
  MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT,
  type MathSceneTeachingFinalDecisionRecord
} from "./mathSceneTeachingFinalDecisionIntake";
import {
  MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA,
  buildMathSceneTeachingFinalDecisionLedger
} from "./mathSceneTeachingFinalDecisionLedger";
import { buildMathSceneTeachingFinalReviewPacket } from "./mathSceneTeachingFinalReviewPacket";
import { buildMathSceneTeachingInspectionTargetQueue } from "./mathSceneTeachingInspectionTargets";
import {
  buildMathSceneTeachingRenderedReviewRoutes,
  type MathSceneTeachingRenderedReviewLabLike
} from "./mathSceneTeachingRenderedReviewRoutes";
import { buildMathSceneTeachingReviewDossier } from "./mathSceneTeachingReviewDossier";

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

function decisionLedgerFixture() {
  return buildMathSceneTeachingFinalDecisionLedger(
    buildMathSceneTeachingFinalReviewPacket({
      dossier: buildMathSceneTeachingReviewDossier(),
      renderedRoutes: buildMathSceneTeachingRenderedReviewRoutes(
        buildMathSceneTeachingInspectionTargetQueue(),
        renderedReviewLabs
      )
    })
  );
}

function approvedRecordsForEveryDecision(): MathSceneTeachingFinalDecisionRecord[] {
  return decisionLedgerFixture().rows.flatMap((row) =>
    row.decisions.map((decision) => ({
      caseId: decision.caseId,
      criterion: decision.criterion,
      reviewerAgentId: "A18" as const,
      status: "a18-approved" as const
    }))
  );
}

function a06SourceConfirmationLedgerFixture() {
  return buildMathSceneTeachingA06SourceConfirmationLedger(decisionLedgerFixture());
}

function partialA06SourceConfirmationLedgerFixture() {
  const ledger = a06SourceConfirmationLedgerFixture();
  const rows = ledger.rows.slice(1);
  const confirmationCount = rows.reduce((sum, row) => sum + row.confirmations.length, 0);
  const a06ConfirmedDecisionCount = rows.reduce((sum, row) => sum + row.a06ConfirmedDecisionCount, 0);
  const blockedConfirmationCount = rows.reduce((sum, row) => sum + row.blockedConfirmationCount, 0);
  const pendingA18DecisionCount = rows
    .flatMap((row) => row.confirmations)
    .filter((confirmation) => confirmation.a18DecisionStatus === "pending-a18-review").length;

  return {
    ...ledger,
    a06ConfirmedDecisionCount,
    blockedConfirmationCount,
    caseCount: rows.length,
    confirmationCount,
    pendingA18DecisionCount,
    rows,
    summary: `${ledger.summary}:partial-source-ledger`
  };
}

test("A18 final decision intake keeps every criterion pending without owner records", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), []);

  assert.equal(intake.sourceContract, MATH_SCENE_TEACHING_FINAL_DECISION_INTAKE_SOURCE_CONTRACT);
  assert.equal(intake.status, "pending-a18-final-decisions");
  assert.equal(intake.caseCount, 12);
  assert.equal(intake.decisionCount, 60);
  assert.equal(intake.pendingDecisionCount, 60);
  assert.equal(intake.approvedDecisionCount, 0);
  assert.equal(intake.revisionDecisionCount, 0);
  assert.equal(intake.blockedDecisionCount, 0);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.ok(intake.rows.every((row) => row.rowStatus === "pending-a18-final-decisions"));
});

test("A18 final decision intake completes only when all criterion records are approved by A18 and A06 source is attached", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    approvedRecordsForEveryDecision(),
    { a06SourceConfirmationLedger: a06SourceConfirmationLedgerFixture() }
  );

  assert.equal(intake.status, "a18-final-approved");
  assert.equal(intake.pendingDecisionCount, 0);
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.revisionDecisionCount, 0);
  assert.equal(intake.blockedDecisionCount, 0);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, true);
  assert.ok(intake.rows.every((row) => row.rowStatus === "a18-final-approved"));
});

test("A18 final decision intake blocks approved records when A06 source confirmation ledger is missing", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    approvedRecordsForEveryDecision()
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake) as Record<string, string>;

  assert.equal(intake.status, "blocked-missing-a06-source-confirmation");
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.pendingDecisionCount, 0);
  assert.equal(intake.a06SourceConfirmationStatus, "not-attached");
  assert.equal(intake.a06SourceConfirmedDecisionCount, 0);
  assert.equal(intake.a06SourceBlockedConfirmationCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-confirmation-status"],
    "not-attached"
  );
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-can-complete"], "false");
  assert.match(intake.summary, /a06Source=not-attached/);
});

test("A18 final decision intake blocks approved records when A06 source confirmation ledger is partial", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    approvedRecordsForEveryDecision(),
    { a06SourceConfirmationLedger: partialA06SourceConfirmationLedgerFixture() }
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake) as Record<string, string>;

  assert.equal(intake.status, "blocked-a06-source-confirmation-ledger-mismatch");
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.pendingDecisionCount, 0);
  assert.equal(intake.a06SourceConfirmationStatus, "a06-source-confirmed-a18-pending");
  assert.equal(intake.a06SourceConfirmedDecisionCount, 55);
  assert.equal(intake.a06SourceBlockedConfirmationCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.deepEqual(
    (intake as { a06SourceConfirmationMismatchReasons?: string[] }).a06SourceConfirmationMismatchReasons,
    [
      "a06-confirmation-count=55/60",
      "a06-case-count=11/12",
      "missing-source-decision-keys=number-line-core:cognitive-load,number-line-core:curriculum-fit,number-line-core:interaction-timing,number-line-core:language-and-labels,number-line-core:mathematical-accuracy"
    ]
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-mismatch-reasons"],
    /a06-confirmation-count=55\/60/
  );
  assert.match(intake.summary, /a06SourceMismatch=a06-confirmation-count=55\/60/);
});

test("A18 final decision intake consumes A06 source confirmations without replacing A18 decisions", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    [],
    { a06SourceConfirmationLedger: a06SourceConfirmationLedgerFixture() }
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake) as Record<string, string>;

  assert.equal(
    (intake as { a06SourceConfirmationStatus?: string }).a06SourceConfirmationStatus,
    "a06-source-confirmed-a18-pending"
  );
  assert.equal((intake as { a06SourceConfirmedDecisionCount?: number }).a06SourceConfirmedDecisionCount, 60);
  assert.equal((intake as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 0);
  assert.equal((intake as { a06SourcePendingA18DecisionCount?: number }).a06SourcePendingA18DecisionCount, 60);
  assert.equal(intake.status, "pending-a18-final-decisions");
  assert.equal(intake.pendingDecisionCount, 60);
  assert.equal(intake.approvedDecisionCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-confirmation-status"],
    "a06-source-confirmed-a18-pending"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-confirmed-count"],
    "60"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-blocked-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-pending-a18-count"],
    "60"
  );
  assert.match(intake.summary, /a06Source=a06-source-confirmed-a18-pending/);
  assert.match(intake.summary, /a06SourceConfirmed=60\/60/);
});

test("A18 final decision intake blocks approved records when A06 source confirmations are blocked", () => {
  const finalDecisionLedger = decisionLedgerFixture();
  const blockedDecisionLedger = {
    ...finalDecisionLedger,
    rows: finalDecisionLedger.rows.map((row, index) =>
      index === 0
        ? {
            ...row,
            href: null,
            sectionSelector: null,
            decisions: row.decisions.map((decision) => ({
              ...decision,
              href: null,
              sectionSelector: null
            }))
          }
        : row
    )
  };
  const intake = buildMathSceneTeachingFinalDecisionIntake(
    finalDecisionLedger,
    approvedRecordsForEveryDecision(),
    { a06SourceConfirmationLedger: buildMathSceneTeachingA06SourceConfirmationLedger(blockedDecisionLedger) }
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake) as Record<string, string>;

  assert.equal(intake.status, "blocked-missing-a06-source-confirmation");
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal((intake as { a06SourceBlockedConfirmationCount?: number }).a06SourceBlockedConfirmationCount, 5);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-confirmation-status"],
    "blocked-missing-source-evidence"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-source-blocked-count"],
    "5"
  );
  assert.match(intake.summary, /a06Source=blocked-missing-source-evidence/);
  assert.match(intake.summary, /a06SourceBlocked=5/);
});

test("A18 final decision intake blocks duplicate criterion records before closing signoff", () => {
  const approvedRecords = approvedRecordsForEveryDecision();
  const duplicateDecisionRecord = approvedRecords.find(
    (record) => record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
  );

  assert.ok(duplicateDecisionRecord);

  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), [
    ...approvedRecords,
    { ...duplicateDecisionRecord }
  ]);
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-duplicate-a18-final-decision-records");
  assert.deepEqual(intake.duplicateRecordDecisionKeys, ["function-graph-core:curriculum-fit"]);
  assert.equal(intake.duplicateRecordCount, 1);
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-keys"],
    "function-graph-core:curriculum-fit"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /duplicateRecords=function-graph-core:curriculum-fit/
  );
});

test("A18 final decision intake blocks unsupported criterion record statuses before closing signoff", () => {
  const unsupportedStatusRecord = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          status: "approved" as MathSceneTeachingFinalDecisionRecord["status"]
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    unsupportedStatusRecord
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unsupported-a18-final-decision-record-statuses");
  assert.deepEqual(intake.unsupportedRecordStatuses, ["approved"]);
  assert.equal(intake.unsupportedRecordStatusCount, 1);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-statuses"],
    "approved"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedStatuses=approved/
  );
});

test("A18 final decision intake reports blank criterion record statuses separately", () => {
  const missingStatusRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          status: "   " as MathSceneTeachingFinalDecisionRecord["status"]
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingStatusRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-statuses");
  assert.equal(intake.missingRecordStatusCount, 1);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.equal(intake.unsupportedRecordStatusCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-status-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-statuses"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingStatuses=1/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedStatuses=none/
  );
});

test("A18 final decision intake reports omitted criterion record statuses separately", () => {
  const missingStatusRecords = approvedRecordsForEveryDecision().map((record) => {
    if (record.caseId !== "function-graph-core" || record.criterion !== "curriculum-fit") {
      return record;
    }

    const { status: _status, ...recordWithoutStatus } = record;

    return recordWithoutStatus as MathSceneTeachingFinalDecisionRecord;
  });

  assert.doesNotThrow(() =>
    buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), missingStatusRecords)
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingStatusRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-statuses");
  assert.equal(intake.missingRecordStatusCount, 1);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.equal(intake.unsupportedRecordStatusCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-status-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-statuses"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingStatuses=1/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedStatuses=none/
  );
});

test("A18 final decision intake keeps blank duplicate statuses out of duplicate diagnostics", () => {
  const missingStatusRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          status: " " as MathSceneTeachingFinalDecisionRecord["status"]
        }
      : record
  );
  const duplicateMissingStatusRecord = missingStatusRecords.find(
    (record) => record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
  );

  assert.ok(duplicateMissingStatusRecord);

  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), [
    ...missingStatusRecords,
    { ...duplicateMissingStatusRecord }
  ]);
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-statuses");
  assert.equal(intake.missingRecordStatusCount, 2);
  assert.equal(intake.duplicateRecordCount, 0);
  assert.deepEqual(intake.duplicateRecordDecisionKeys, []);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-keys"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingStatuses=2/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /duplicateRecords=none/
  );
});

test("A18 final decision intake reports padded criterion record statuses separately", () => {
  const nonCanonicalStatusRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          status: " a18-approved " as MathSceneTeachingFinalDecisionRecord["status"]
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    nonCanonicalStatusRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-non-canonical-a18-final-decision-record-statuses");
  assert.deepEqual(intake.nonCanonicalRecordStatuses, [" a18-approved "]);
  assert.equal(intake.nonCanonicalRecordStatusCount, 1);
  assert.equal(intake.missingRecordStatusCount, 0);
  assert.deepEqual(intake.unsupportedRecordStatuses, []);
  assert.equal(intake.unsupportedRecordStatusCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.invalidRecordCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-statuses"],
    " a18-approved "
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-statuses"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /nonCanonicalStatuses= a18-approved /
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedStatuses=none/
  );
});

test("A18 final decision intake reports blank reviewer agent ids separately", () => {
  const missingReviewerRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          reviewerAgentId: " "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingReviewerRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-reviewers");
  assert.equal(intake.missingRecordReviewerAgentIdCount, 1);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-reviewer-count"],
    "1"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingReviewers=1/
  );
});

test("A18 final decision intake reports omitted reviewer agent ids separately", () => {
  const missingReviewerRecords = approvedRecordsForEveryDecision().map((record) => {
    if (record.caseId !== "function-graph-core" || record.criterion !== "curriculum-fit") {
      return record;
    }

    const { reviewerAgentId: _reviewerAgentId, ...recordWithoutReviewer } = record;

    return recordWithoutReviewer as MathSceneTeachingFinalDecisionRecord;
  });

  assert.doesNotThrow(() =>
    buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), missingReviewerRecords)
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingReviewerRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-reviewers");
  assert.equal(intake.missingRecordReviewerAgentIdCount, 1);
  assert.deepEqual(intake.nonCanonicalRecordReviewerAgentIds, []);
  assert.equal(intake.nonCanonicalRecordReviewerAgentIdCount, 0);
  assert.deepEqual(intake.unsupportedRecordReviewerAgentIds, []);
  assert.equal(intake.unsupportedRecordReviewerAgentIdCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-reviewer-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-reviewers"],
    "none"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-reviewers"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingReviewers=1/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedReviewers=none/
  );
});

test("A18 final decision intake reports padded reviewer agent ids separately", () => {
  const nonCanonicalReviewerRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          reviewerAgentId: " A18 "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    nonCanonicalReviewerRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-non-canonical-a18-final-decision-record-reviewers");
  assert.deepEqual(intake.nonCanonicalRecordReviewerAgentIds, [" A18 "]);
  assert.equal(intake.nonCanonicalRecordReviewerAgentIdCount, 1);
  assert.equal(intake.missingRecordReviewerAgentIdCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-reviewers"],
    " A18 "
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /nonCanonicalReviewers= A18 /
  );
});

test("A18 final decision intake reports unsupported reviewer agent ids separately", () => {
  const unsupportedReviewerRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          reviewerAgentId: "A11"
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    unsupportedReviewerRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unsupported-a18-final-decision-record-reviewers");
  assert.deepEqual(intake.unsupportedRecordReviewerAgentIds, ["A11"]);
  assert.equal(intake.unsupportedRecordReviewerAgentIdCount, 1);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-reviewers"],
    "A11"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedReviewers=A11/
  );
});

test("A18 final decision intake reports blank case ids separately", () => {
  const missingCaseRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          caseId: " "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingCaseRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-case-ids");
  assert.equal(intake.missingRecordCaseIdCount, 1);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-case-id-count"],
    "1"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingCaseIds=1/
  );
});

test("A18 final decision intake reports padded case ids separately", () => {
  const nonCanonicalCaseRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          caseId: " function-graph-core "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    nonCanonicalCaseRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-non-canonical-a18-final-decision-record-case-ids");
  assert.deepEqual(intake.nonCanonicalRecordCaseIds, [" function-graph-core "]);
  assert.equal(intake.nonCanonicalRecordCaseIdCount, 1);
  assert.equal(intake.missingRecordCaseIdCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-case-ids"],
    " function-graph-core "
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /nonCanonicalCaseIds= function-graph-core /
  );
});

test("A18 final decision intake reports unsupported case ids separately", () => {
  const unsupportedCaseRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          caseId: "unknown-case"
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    unsupportedCaseRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unsupported-a18-final-decision-record-case-ids");
  assert.deepEqual(intake.unsupportedRecordCaseIds, ["unknown-case"]);
  assert.equal(intake.unsupportedRecordCaseIdCount, 1);
  assert.equal(intake.missingRecordCaseIdCount, 0);
  assert.equal(intake.nonCanonicalRecordCaseIdCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-case-ids"],
    "unknown-case"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedCaseIds=unknown-case/
  );
});

test("A18 final decision intake reports blank criteria separately", () => {
  const missingCriterionRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          criterion: " "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingCriterionRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-criteria");
  assert.equal(intake.missingRecordCriterionCount, 1);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-criterion-count"],
    "1"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingCriteria=1/
  );
});

test("A18 final decision intake reports padded criteria separately", () => {
  const nonCanonicalCriterionRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          criterion: " curriculum-fit "
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    nonCanonicalCriterionRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-non-canonical-a18-final-decision-record-criteria");
  assert.deepEqual(intake.nonCanonicalRecordCriteria, [" curriculum-fit "]);
  assert.equal(intake.nonCanonicalRecordCriterionCount, 1);
  assert.equal(intake.missingRecordCriterionCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-criteria"],
    " curriculum-fit "
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /nonCanonicalCriteria= curriculum-fit /
  );
});

test("A18 final decision intake reports unsupported criteria separately", () => {
  const unsupportedCriterionRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "curriculum-fit"
      ? {
          ...record,
          criterion: "teaching-flow"
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    unsupportedCriterionRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unsupported-a18-final-decision-record-criteria");
  assert.deepEqual(intake.unsupportedRecordCriteria, ["teaching-flow"]);
  assert.equal(intake.unsupportedRecordCriterionCount, 1);
  assert.equal(intake.missingRecordCriterionCount, 0);
  assert.equal(intake.nonCanonicalRecordCriterionCount, 0);
  assert.equal(intake.approvedDecisionCount, 59);
  assert.equal(intake.pendingDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 1);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unsupported-record-criteria"],
    "teaching-flow"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unsupportedCriteria=teaching-flow/
  );
});

test("A18 final decision intake reports missing revision notes for actionable records", () => {
  const missingRevisionNoteRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
      ? {
          ...record,
          revisionNote: " ",
          status: "a18-revisions-required" as const
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    missingRevisionNoteRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-revision-notes");
  assert.deepEqual(intake.missingRecordRevisionNoteDecisionKeys, ["function-graph-core:cognitive-load"]);
  assert.equal(intake.missingRecordRevisionNoteCount, 1);
  assert.equal(intake.revisionDecisionCount, 1);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-follow-up-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-revision-note-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-missing-record-revision-note-keys"],
    "function-graph-core:cognitive-load"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingRevisionNotes=function-graph-core:cognitive-load/
  );
});

test("A18 final decision intake keeps missing revision-note duplicates out of duplicate diagnostics", () => {
  const missingRevisionNoteRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
      ? {
          ...record,
          revisionNote: " ",
          status: "a18-revisions-required" as const
        }
      : record
  );
  const duplicateMissingRevisionNoteRecord = missingRevisionNoteRecords.find(
    (record) => record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
  );

  assert.ok(duplicateMissingRevisionNoteRecord);

  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), [
    ...missingRevisionNoteRecords,
    { ...duplicateMissingRevisionNoteRecord }
  ]);
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-missing-a18-final-decision-record-revision-notes");
  assert.deepEqual(intake.missingRecordRevisionNoteDecisionKeys, ["function-graph-core:cognitive-load"]);
  assert.equal(intake.missingRecordRevisionNoteCount, 1);
  assert.equal(intake.duplicateRecordCount, 0);
  assert.deepEqual(intake.duplicateRecordDecisionKeys, []);
  assert.equal(intake.revisionDecisionCount, 1);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-follow-up-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-keys"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /missingRevisionNotes=function-graph-core:cognitive-load/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /duplicateRecords=none/
  );
});

test("A18 final decision intake reports padded revision notes for actionable records", () => {
  const nonCanonicalRevisionNoteRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
      ? {
          ...record,
          revisionNote: " Reduce concurrent moving highlights before final approval. ",
          status: "a18-revisions-required" as const
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    nonCanonicalRevisionNoteRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-non-canonical-a18-final-decision-record-revision-notes");
  assert.deepEqual(intake.nonCanonicalRecordRevisionNoteDecisionKeys, ["function-graph-core:cognitive-load"]);
  assert.equal(intake.nonCanonicalRecordRevisionNoteCount, 1);
  assert.equal(intake.missingRecordRevisionNoteCount, 0);
  assert.equal(intake.revisionDecisionCount, 1);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-a06-follow-up-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-revision-note-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-non-canonical-record-revision-note-keys"],
    "function-graph-core:cognitive-load"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /nonCanonicalRevisionNotes=function-graph-core:cognitive-load/
  );
});

test("A18 final decision intake blocks approved records that still carry revision notes", () => {
  const unexpectedRevisionNoteRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
      ? {
          ...record,
          revisionNote: "Approval cannot carry a hidden caveat."
        }
      : record
  );

  const intake = buildMathSceneTeachingFinalDecisionIntake(
    decisionLedgerFixture(),
    unexpectedRevisionNoteRecords
  );
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unexpected-a18-final-decision-record-revision-notes");
  assert.deepEqual(intake.unexpectedRecordRevisionNoteDecisionKeys, ["function-graph-core:cognitive-load"]);
  assert.equal(intake.unexpectedRecordRevisionNoteCount, 1);
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unexpected-record-revision-note-count"],
    "1"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-unexpected-record-revision-note-keys"],
    "function-graph-core:cognitive-load"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unexpectedRevisionNotes=function-graph-core:cognitive-load/
  );
});

test("A18 final decision intake keeps unexpected approved-note duplicates out of duplicate diagnostics", () => {
  const unexpectedRevisionNoteRecords = approvedRecordsForEveryDecision().map((record) =>
    record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
      ? {
          ...record,
          revisionNote: "Approval cannot carry a hidden caveat."
        }
      : record
  );
  const duplicateUnexpectedRevisionNoteRecord = unexpectedRevisionNoteRecords.find(
    (record) => record.caseId === "function-graph-core" && record.criterion === "cognitive-load"
  );

  assert.ok(duplicateUnexpectedRevisionNoteRecord);

  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), [
    ...unexpectedRevisionNoteRecords,
    { ...duplicateUnexpectedRevisionNoteRecord }
  ]);
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(intake.status, "blocked-unexpected-a18-final-decision-record-revision-notes");
  assert.deepEqual(intake.unexpectedRecordRevisionNoteDecisionKeys, ["function-graph-core:cognitive-load"]);
  assert.equal(intake.unexpectedRecordRevisionNoteCount, 1);
  assert.equal(intake.duplicateRecordCount, 0);
  assert.deepEqual(intake.duplicateRecordDecisionKeys, []);
  assert.equal(intake.approvedDecisionCount, 60);
  assert.equal(intake.a06RevisionFollowUpCount, 0);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-count"],
    "0"
  );
  assert.equal(
    attributes["data-viz-manim-teaching-final-decision-intake-duplicate-record-keys"],
    "none"
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /unexpectedRevisionNotes=function-graph-core:cognitive-load/
  );
  assert.match(
    attributes["data-viz-manim-teaching-final-decision-intake-summary"],
    /duplicateRecords=none/
  );
});

test("A18 final decision intake routes revisions and invalid records without closing signoff", () => {
  const intake = buildMathSceneTeachingFinalDecisionIntake(decisionLedgerFixture(), [
    {
      caseId: "function-graph-core",
      criterion: "cognitive-load",
      reviewerAgentId: "A18",
      revisionNote: "Reduce concurrent moving highlights before final approval.",
      status: "a18-revisions-required"
    },
    {
      caseId: "angle-geometry-core",
      criterion: "language-and-labels",
      reviewerAgentId: "A18",
      revisionNote: "Label the reference ray more explicitly in both languages.",
      status: "blocked-missing-route-or-evidence"
    },
    {
      caseId: "unknown-case",
      criterion: MATH_SCENE_TEACHING_FINAL_DECISION_CRITERIA[0],
      reviewerAgentId: "A18",
      status: "a18-approved"
    },
    {
      caseId: "function-graph-core",
      criterion: "mathematical-accuracy",
      reviewerAgentId: "A06",
      status: "a18-approved"
    }
  ]);
  const attributes = mathSceneTeachingFinalDecisionIntakeDataAttributes(intake);

  assert.equal(classifyManimReviewPackage("mathSceneTeachingFinalDecisionIntake.ts"), "evidence");
  assert.equal(intake.status, "blocked-missing-route-or-evidence");
  assert.equal(intake.pendingDecisionCount, 58);
  assert.equal(intake.approvedDecisionCount, 0);
  assert.equal(intake.revisionDecisionCount, 1);
  assert.equal(intake.blockedDecisionCount, 1);
  assert.equal(intake.invalidRecordCount, 2);
  assert.equal(intake.a06RevisionFollowUpCount, 2);
  assert.equal(intake.canMarkA18GateComplete, false);
  assert.deepEqual(
    intake.a06RevisionFollowUps.map((followUp) => `${followUp.caseId}:${followUp.criterion}`),
    ["angle-geometry-core:language-and-labels", "function-graph-core:cognitive-load"]
  );
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-status"], "blocked-missing-route-or-evidence");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-decision-count"], "60");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-pending-count"], "58");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-revision-count"], "1");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-blocked-count"], "1");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-invalid-record-count"], "2");
  assert.equal(attributes["data-viz-manim-teaching-final-decision-intake-a06-follow-up-count"], "2");
});
