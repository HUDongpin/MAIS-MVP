import type {
  MathSceneV2OwnerGateRerunCommandPacket,
  MathSceneV2OwnerGateRerunCommandRow
} from "./mathSceneV2OwnerGateRerunCommandPacket";
import type {
  MathSceneV2OwnerGateRerunCommandEvidenceRecord,
  MathSceneV2OwnerGateRerunCommandEvidenceRecordStatus
} from "./mathSceneV2OwnerGateRerunCommandEvidenceIntake";

export const MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT =
  "MAIS Manim v2 owner gate rerun command transcript intake: validates command/manual-review transcripts before command evidence records can feed owner gate reruns" as const;

export type MathSceneV2OwnerGateRerunCommandTranscriptReviewDecision =
  | "approved"
  | "blocked"
  | "revision-required";

export type MathSceneV2OwnerGateRerunCommandTranscriptRecord = {
  command?: string;
  evidenceId: string;
  exitCode?: number;
  href?: string;
  kind: MathSceneV2OwnerGateRerunCommandRow["kind"];
  ownerAgentId: string;
  reportPath?: string;
  reviewDecision?: MathSceneV2OwnerGateRerunCommandTranscriptReviewDecision;
  rowEvidenceId: string;
  runId?: string;
  sectionSelector?: string;
};

export type MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus =
  | "blocked-command-transcript"
  | "blocked-invalid-command-transcript"
  | "blocked-missing-owner-command-packets"
  | "command-transcripts-covered"
  | "pending-command-transcripts";

export type MathSceneV2OwnerGateRerunCommandTranscriptIntake = {
  acceptedTranscriptCount: number;
  blockedTranscriptCount: number;
  canMarkThreadGoalComplete: boolean;
  commandEvidenceRecords: MathSceneV2OwnerGateRerunCommandEvidenceRecord[];
  duplicateTranscriptEvidenceIds: string[];
  duplicateTranscriptRowEvidenceIds: string[];
  invalidTranscriptCount: number;
  invalidTranscripts: MathSceneV2OwnerGateRerunCommandTranscriptRecord[];
  nonCanonicalTranscriptCommandRows: string[];
  mismatchedTranscriptCommandRows: string[];
  mismatchedTranscriptKindRows: string[];
  mismatchedTranscriptRouteHrefRows: string[];
  mismatchedTranscriptRouteSectionRows: string[];
  missingTranscriptCommandRows: string[];
  missingTranscriptCommandExitCodeRows: string[];
  missingTranscriptCommandReportPathRows: string[];
  missingTranscriptCommandRunIdRows: string[];
  missingTranscriptEvidenceIdCount: number;
  missingTranscriptKindRows: string[];
  missingTranscriptOwnerAgentIdCount: number;
  missingTranscriptRowEvidenceIdCount: number;
  missingTranscriptReviewDecisionRows: string[];
  missingTranscriptRouteHrefRows: string[];
  missingTranscriptRouteSectionRows: string[];
  missingTranscriptCount: number;
  nonCanonicalTranscriptCommandReportPathRows: string[];
  nonCanonicalTranscriptCommandRunIdRows: string[];
  nonCanonicalTranscriptEvidenceIds: string[];
  nonCanonicalTranscriptKindRows: string[];
  nonCanonicalTranscriptOwnerAgentIds: string[];
  nonCanonicalTranscriptReviewDecisionRows: string[];
  nonCanonicalTranscriptRouteHrefRows: string[];
  nonCanonicalTranscriptRouteSectionRows: string[];
  nonCanonicalTranscriptRowEvidenceIds: string[];
  requiredTranscriptCount: number;
  reviewSliceConsumerGateEvidenceIdManifest: string;
  reviewSliceCount: number;
  reviewSliceFileManifest: string;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceContract: typeof MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT;
  status: MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus;
  summary: string;
  unsupportedTranscriptCommandExitCodeRows: string[];
  unsupportedTranscriptExitCodes: string[];
  unsupportedTranscriptReviewDecisionRows: string[];
  unsupportedTranscriptReviewDecisions: string[];
  unknownTranscriptRowEvidenceIds: string[];
};

function transcriptKey(ownerAgentId: string, rowEvidenceId: string) {
  return `${ownerAgentId}:${rowEvidenceId}`;
}

function transcriptEvidenceIdValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { evidenceId?: unknown }).evidenceId ?? "");
}

function transcriptOwnerAgentIdValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { ownerAgentId?: unknown }).ownerAgentId ?? "");
}

function transcriptRowEvidenceIdValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { rowEvidenceId?: unknown }).rowEvidenceId ?? "");
}

function transcriptKindValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { kind?: unknown }).kind ?? "");
}

function transcriptRecordKey(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return transcriptKey(transcriptOwnerAgentIdValue(transcript), transcriptRowEvidenceIdValue(transcript));
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function duplicateTranscriptEvidenceIds(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const transcript of transcripts) {
    const evidenceId = transcriptEvidenceIdValue(transcript);
    if (evidenceId.trim().length === 0 || evidenceId !== evidenceId.trim()) continue;
    if (seen.has(evidenceId)) duplicates.add(evidenceId);
    seen.add(evidenceId);
  }

  return uniqueSorted([...duplicates]);
}

function duplicateTranscriptRowEvidenceIds(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const transcript of transcripts) {
    const ownerAgentId = transcriptOwnerAgentIdValue(transcript);
    const rowEvidenceId = transcriptRowEvidenceIdValue(transcript);
    if (
      ownerAgentId.trim().length === 0 ||
      ownerAgentId !== ownerAgentId.trim() ||
      rowEvidenceId.trim().length === 0 ||
      rowEvidenceId !== rowEvidenceId.trim()
    ) {
      continue;
    }
    const rowKey = transcriptKey(ownerAgentId, rowEvidenceId);
    if (seen.has(rowKey)) duplicates.add(rowKey);
    seen.add(rowKey);
  }

  return uniqueSorted([...duplicates]);
}

function nonCanonicalTranscriptEvidenceIds(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return uniqueSorted(
    transcripts
      .filter((transcript) =>
        transcriptEvidenceIdValue(transcript).trim().length > 0 &&
        transcriptEvidenceIdValue(transcript) !== transcriptEvidenceIdValue(transcript).trim()
      )
      .map(transcriptEvidenceIdValue)
  );
}

function missingTranscriptEvidenceIdCount(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return transcripts.filter((transcript) => transcriptEvidenceIdValue(transcript).trim().length === 0).length;
}

function nonCanonicalTranscriptRowEvidenceIds(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return uniqueSorted(
    transcripts
      .filter((transcript) =>
        transcriptRowEvidenceIdValue(transcript).trim().length > 0 &&
        transcriptRowEvidenceIdValue(transcript) !== transcriptRowEvidenceIdValue(transcript).trim()
      )
      .map(transcriptRecordKey)
  );
}

function missingTranscriptRowEvidenceIdCount(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return transcripts.filter((transcript) => transcriptRowEvidenceIdValue(transcript).trim().length === 0).length;
}

function nonCanonicalTranscriptOwnerAgentIds(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return uniqueSorted(
    transcripts
      .filter((transcript) =>
        transcriptOwnerAgentIdValue(transcript).trim().length > 0 &&
        transcriptOwnerAgentIdValue(transcript) !== transcriptOwnerAgentIdValue(transcript).trim()
      )
      .map(transcriptOwnerAgentIdValue)
  );
}

function missingTranscriptOwnerAgentIdCount(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return transcripts.filter((transcript) => transcriptOwnerAgentIdValue(transcript).trim().length === 0).length;
}

function sameTranscriptRecord(
  left: MathSceneV2OwnerGateRerunCommandTranscriptRecord,
  right: MathSceneV2OwnerGateRerunCommandTranscriptRecord
) {
  return left.command === right.command &&
    left.evidenceId === right.evidenceId &&
    left.exitCode === right.exitCode &&
    left.href === right.href &&
    left.kind === right.kind &&
    left.ownerAgentId === right.ownerAgentId &&
    left.reportPath === right.reportPath &&
    left.reviewDecision === right.reviewDecision &&
    left.rowEvidenceId === right.rowEvidenceId &&
    left.runId === right.runId &&
    left.sectionSelector === right.sectionSelector;
}

function mergeTranscriptRecords(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return transcripts.reduce<MathSceneV2OwnerGateRerunCommandTranscriptRecord[]>((merged, transcript) => {
    return merged.some((existingTranscript) => sameTranscriptRecord(existingTranscript, transcript))
      ? merged
      : [...merged, transcript];
  }, []);
}

function commandRows(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return commandPacket.ownerPackets.flatMap((ownerPacket) => ownerPacket.rows);
}

function commandRowLookup(commandPacket: MathSceneV2OwnerGateRerunCommandPacket) {
  return new Map(commandRows(commandPacket).map((row) => [transcriptKey(row.ownerAgentId, row.evidenceId), row]));
}

function isCommandTranscript(row: MathSceneV2OwnerGateRerunCommandRow) {
  return row.kind === "browser-regression-command" || row.kind === "release-command";
}

function isCommandTranscriptKind(kind: MathSceneV2OwnerGateRerunCommandTranscriptRecord["kind"]) {
  return kind === "browser-regression-command" || kind === "release-command";
}

function exitCodeValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { exitCode?: unknown }).exitCode ?? "");
}

function hasSupportedCommandExitCode(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  const exitCode = (transcript as { exitCode?: unknown }).exitCode;

  return typeof exitCode === "number" && Number.isInteger(exitCode) && exitCode >= 0;
}

function unsupportedTranscriptExitCodes(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return uniqueSorted(
    transcripts
      .filter((transcript) => isCommandTranscriptKind(transcript.kind))
      .filter((transcript) => exitCodeValue(transcript).trim().length > 0)
      .filter((transcript) => !hasSupportedCommandExitCode(transcript))
      .map(exitCodeValue)
  );
}

function unsupportedTranscriptCommandExitCodeRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          exitCodeValue(transcript).trim().length > 0 &&
          !hasSupportedCommandExitCode(transcript)
        );
      })
      .map(transcriptRecordKey)
  );
}

function missingTranscriptCommandExitCodeRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          exitCodeValue(transcript).trim().length === 0
        );
      })
      .map(transcriptRecordKey)
  );
}

function mismatchedTranscriptCommandRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => String(transcript.command ?? "").trim().length > 0)
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const command = String(transcript.command ?? "");

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          command === command.trim() &&
          transcript.command !== row.command
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function nonCanonicalTranscriptCommandRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const command = String(transcript.command ?? "");

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          command.trim().length > 0 &&
          command !== command.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function missingTranscriptCommandRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));
        const command = String(transcript.command ?? "");

        return Boolean(row && isCommandTranscript(row) && command.trim().length === 0);
      })
      .map(transcriptRecordKey)
  );
}

function mismatchedTranscriptRouteHrefRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => String(transcript.href ?? "").trim().length > 0)
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const href = String(transcript.href ?? "");

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          href === href.trim() &&
          transcript.href !== row.href
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function mismatchedTranscriptKindRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const kind = transcriptKindValue(transcript);

        return Boolean(row && kind.trim().length > 0 && kind === kind.trim() && transcript.kind !== row.kind);
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function nonCanonicalTranscriptKindRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));
        const kind = transcriptKindValue(transcript);

        return Boolean(row && kind.trim().length > 0 && kind !== kind.trim());
      })
      .map(transcriptRecordKey)
  );
}

function missingTranscriptKindRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));

        return Boolean(row && transcriptKindValue(transcript).trim().length === 0);
      })
      .map(transcriptRecordKey)
  );
}

function nonCanonicalTranscriptRouteHrefRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const href = String(transcript.href ?? "");

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          href.trim().length > 0 &&
          href !== href.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function mismatchedTranscriptRouteSectionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => String(transcript.sectionSelector ?? "").trim().length > 0)
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const sectionSelector = String(transcript.sectionSelector ?? "");

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          sectionSelector === sectionSelector.trim() &&
          transcript.sectionSelector !== row.sectionSelector
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function nonCanonicalTranscriptRouteSectionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const sectionSelector = String(transcript.sectionSelector ?? "");

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          sectionSelector.trim().length > 0 &&
          sectionSelector !== sectionSelector.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function missingTranscriptRouteHrefRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          String(row.href ?? "").trim().length > 0 &&
          String(transcript.href ?? "").trim().length === 0
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function missingTranscriptRouteSectionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          String(row.sectionSelector ?? "").trim().length > 0 &&
          String(transcript.sectionSelector ?? "").trim().length === 0
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function hasCommandRunId(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  const runId = (transcript as { runId?: unknown }).runId;

  return typeof runId === "string" && runId.trim().length > 0;
}

function hasCommandReportPath(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  const reportPath = (transcript as { reportPath?: unknown }).reportPath;

  return typeof reportPath === "string" && reportPath.trim().length > 0;
}

function hasCanonicalCommandReportPath(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  const reportPath = (transcript as { reportPath?: unknown }).reportPath;

  return typeof reportPath === "string" && reportPath.trim().length > 0 && reportPath === reportPath.trim();
}

function hasCanonicalCommandRunId(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  const runId = (transcript as { runId?: unknown }).runId;

  return typeof runId === "string" && runId.trim().length > 0 && runId === runId.trim();
}

function missingTranscriptCommandReportPathRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));

        return Boolean(row && isCommandTranscript(row) && !hasCommandReportPath(transcript));
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function nonCanonicalTranscriptCommandReportPathRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const reportPath = (transcript as { reportPath?: unknown }).reportPath;

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          typeof reportPath === "string" &&
          reportPath.trim().length > 0 &&
          reportPath !== reportPath.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function missingTranscriptCommandRunIdRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));

        return Boolean(row && isCommandTranscript(row) && !hasCommandRunId(transcript));
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function nonCanonicalTranscriptCommandRunIdRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const runId = (transcript as { runId?: unknown }).runId;

        return Boolean(
          row &&
          isCommandTranscript(row) &&
          typeof runId === "string" &&
          runId.trim().length > 0 &&
          runId !== runId.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function isReviewDecision(value: string | undefined): value is MathSceneV2OwnerGateRerunCommandTranscriptReviewDecision {
  return value === "approved" || value === "blocked" || value === "revision-required";
}

function reviewDecisionValue(transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord) {
  return String((transcript as { reviewDecision?: unknown }).reviewDecision ?? "");
}

function unsupportedTranscriptReviewDecisions(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  return uniqueSorted(
    transcripts
      .filter((transcript) => transcript.kind === "teaching-route-review")
      .map(reviewDecisionValue)
      .filter((reviewDecision) =>
        reviewDecision.trim().length > 0 &&
        reviewDecision === reviewDecision.trim() &&
        !isReviewDecision(reviewDecision)
      )
  );
}

function unsupportedTranscriptReviewDecisionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptRecordKey(transcript));
        const reviewDecision = reviewDecisionValue(transcript);

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          reviewDecision.trim().length > 0 &&
          reviewDecision === reviewDecision.trim() &&
          !isReviewDecision(reviewDecision)
        );
      })
      .map(transcriptRecordKey)
  );
}

function nonCanonicalTranscriptReviewDecisionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));
        const reviewDecision = reviewDecisionValue(transcript);

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          reviewDecision.trim().length > 0 &&
          reviewDecision !== reviewDecision.trim()
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function missingTranscriptReviewDecisionRows(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) => {
        const row = lookup.get(transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId));

        return Boolean(
          row &&
          row.kind === "teaching-route-review" &&
          reviewDecisionValue(transcript).trim().length === 0
        );
      })
      .map((transcript) => transcriptKey(transcript.ownerAgentId, transcript.rowEvidenceId))
  );
}

function unknownTranscriptRowEvidenceIds(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
) {
  const lookup = commandRowLookup(commandPacket);

  return uniqueSorted(
    transcripts
      .filter((transcript) =>
        transcriptOwnerAgentIdValue(transcript).trim().length > 0 &&
        transcriptOwnerAgentIdValue(transcript) === transcriptOwnerAgentIdValue(transcript).trim() &&
        transcriptRowEvidenceIdValue(transcript).trim().length > 0 &&
        transcriptRowEvidenceIdValue(transcript) === transcriptRowEvidenceIdValue(transcript).trim() &&
        !lookup.has(transcriptRecordKey(transcript))
      )
      .map(transcriptRecordKey)
  );
}

function hasCanonicalEvidenceId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 && value === value.trim();
}

function hasValidCommandTranscript(
  row: MathSceneV2OwnerGateRerunCommandRow,
  transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord
) {
  return Boolean(row.command) &&
    transcript.command === row.command &&
    hasSupportedCommandExitCode(transcript) &&
    hasCanonicalCommandRunId(transcript) &&
    hasCanonicalCommandReportPath(transcript);
}

function hasValidRouteReviewTranscript(
  row: MathSceneV2OwnerGateRerunCommandRow,
  transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord
) {
  return (
    row.kind === "teaching-route-review" &&
    Boolean(row.href) &&
    transcript.href === row.href &&
    transcript.sectionSelector === row.sectionSelector &&
    isReviewDecision(transcript.reviewDecision)
  );
}

function isValidTranscript(
  lookup: Map<string, MathSceneV2OwnerGateRerunCommandRow>,
  transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord
) {
  const evidenceId = transcriptEvidenceIdValue(transcript);
  const ownerAgentId = transcriptOwnerAgentIdValue(transcript);
  const rowEvidenceId = transcriptRowEvidenceIdValue(transcript);
  const row = lookup.get(transcriptKey(ownerAgentId, rowEvidenceId));

  if (
    !row ||
    !hasCanonicalEvidenceId(evidenceId) ||
    !hasCanonicalEvidenceId(ownerAgentId) ||
    !hasCanonicalEvidenceId(rowEvidenceId) ||
    transcript.kind !== row.kind
  ) {
    return false;
  }

  if (isCommandTranscript(row)) return hasValidCommandTranscript(row, transcript);
  return hasValidRouteReviewTranscript(row, transcript);
}

function duplicatedTranscripts(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[],
  duplicateEvidenceIds: readonly string[]
) {
  const duplicateEvidenceIdSet = new Set(duplicateEvidenceIds);

  return transcripts.filter((transcript) => duplicateEvidenceIdSet.has(transcript.evidenceId));
}

function duplicatedTranscriptRows(
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[],
  duplicateRowEvidenceIds: readonly string[]
) {
  const duplicateRowEvidenceIdSet = new Set(duplicateRowEvidenceIds);

  return transcripts.filter((transcript) =>
    duplicateRowEvidenceIdSet.has(transcriptRecordKey(transcript))
  );
}

function transcriptStatus(
  transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord
): MathSceneV2OwnerGateRerunCommandEvidenceRecordStatus {
  if (transcript.kind === "teaching-route-review") {
    return transcript.reviewDecision === "approved" ? "accepted" : "blocked";
  }

  return transcript.exitCode === 0 ? "accepted" : "blocked";
}

function commandEvidenceRecord(
  transcript: MathSceneV2OwnerGateRerunCommandTranscriptRecord
): MathSceneV2OwnerGateRerunCommandEvidenceRecord {
  return {
    evidenceId: transcriptEvidenceIdValue(transcript),
    ownerAgentId: transcriptOwnerAgentIdValue(transcript),
    rowEvidenceId: transcriptRowEvidenceIdValue(transcript),
    status: transcriptStatus(transcript)
  };
}

function intakeStatus({
  blockedTranscriptCount,
  commandPacket,
  invalidTranscriptCount,
  missingTranscriptCount
}: {
  blockedTranscriptCount: number;
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket;
  invalidTranscriptCount: number;
  missingTranscriptCount: number;
}): MathSceneV2OwnerGateRerunCommandTranscriptIntakeStatus {
  if (commandPacket.ownerPacketCount === 0 || commandPacket.missingOwnerAgentIds.length > 0) {
    return "blocked-missing-owner-command-packets";
  }
  if (invalidTranscriptCount > 0) return "blocked-invalid-command-transcript";
  if (blockedTranscriptCount > 0) return "blocked-command-transcript";
  if (missingTranscriptCount > 0) return "pending-command-transcripts";
  return "command-transcripts-covered";
}

export function buildMathSceneV2OwnerGateRerunCommandTranscriptIntake(
  commandPacket: MathSceneV2OwnerGateRerunCommandPacket,
  transcripts: readonly MathSceneV2OwnerGateRerunCommandTranscriptRecord[]
): MathSceneV2OwnerGateRerunCommandTranscriptIntake {
  const rows = commandRows(commandPacket);
  const lookup = commandRowLookup(commandPacket);
  const duplicateTranscriptIds = duplicateTranscriptEvidenceIds(transcripts);
  const duplicateTranscriptRowIds = duplicateTranscriptRowEvidenceIds(transcripts);
  const missingTranscriptIdCount = missingTranscriptEvidenceIdCount(transcripts);
  const missingTranscriptOwnerIdCount = missingTranscriptOwnerAgentIdCount(transcripts);
  const missingTranscriptRowIdCount = missingTranscriptRowEvidenceIdCount(transcripts);
  const nonCanonicalTranscriptIds = nonCanonicalTranscriptEvidenceIds(transcripts);
  const nonCanonicalTranscriptOwnerIds = nonCanonicalTranscriptOwnerAgentIds(transcripts);
  const nonCanonicalTranscriptRowIds = nonCanonicalTranscriptRowEvidenceIds(transcripts);
  const unsupportedExitCodes = unsupportedTranscriptExitCodes(transcripts);
  const unsupportedExitCodeRows = unsupportedTranscriptCommandExitCodeRows(commandPacket, transcripts);
  const unsupportedReviewDecisions = unsupportedTranscriptReviewDecisions(transcripts);
  const unsupportedReviewDecisionRows = unsupportedTranscriptReviewDecisionRows(commandPacket, transcripts);
  const missingExitCodeRows = missingTranscriptCommandExitCodeRows(commandPacket, transcripts);
  const missingReviewDecisionRows = missingTranscriptReviewDecisionRows(commandPacket, transcripts);
  const nonCanonicalReviewDecisionRows = nonCanonicalTranscriptReviewDecisionRows(commandPacket, transcripts);
  const nonCanonicalCommandRows = nonCanonicalTranscriptCommandRows(commandPacket, transcripts);
  const mismatchedCommandRows = mismatchedTranscriptCommandRows(commandPacket, transcripts);
  const missingCommandRows = missingTranscriptCommandRows(commandPacket, transcripts);
  const mismatchedKindRows = mismatchedTranscriptKindRows(commandPacket, transcripts);
  const nonCanonicalKindRows = nonCanonicalTranscriptKindRows(commandPacket, transcripts);
  const missingKindRows = missingTranscriptKindRows(commandPacket, transcripts);
  const mismatchedRouteHrefRows = mismatchedTranscriptRouteHrefRows(commandPacket, transcripts);
  const mismatchedRouteSectionRows = mismatchedTranscriptRouteSectionRows(commandPacket, transcripts);
  const missingReportPathRows = missingTranscriptCommandReportPathRows(commandPacket, transcripts);
  const missingRunIdRows = missingTranscriptCommandRunIdRows(commandPacket, transcripts);
  const missingRouteHrefRows = missingTranscriptRouteHrefRows(commandPacket, transcripts);
  const missingRouteSectionRows = missingTranscriptRouteSectionRows(commandPacket, transcripts);
  const nonCanonicalReportPathRows = nonCanonicalTranscriptCommandReportPathRows(commandPacket, transcripts);
  const nonCanonicalRunIdRows = nonCanonicalTranscriptCommandRunIdRows(commandPacket, transcripts);
  const nonCanonicalRouteHrefRows = nonCanonicalTranscriptRouteHrefRows(commandPacket, transcripts);
  const nonCanonicalRouteSectionRows = nonCanonicalTranscriptRouteSectionRows(commandPacket, transcripts);
  const unknownTranscriptRowIds = unknownTranscriptRowEvidenceIds(commandPacket, transcripts);
  const validTranscripts = transcripts.filter((transcript) => isValidTranscript(lookup, transcript));
  const invalidTranscriptRows = mergeTranscriptRecords([
    ...transcripts.filter((transcript) => !isValidTranscript(lookup, transcript)),
    ...duplicatedTranscripts(transcripts, duplicateTranscriptIds),
    ...duplicatedTranscriptRows(transcripts, duplicateTranscriptRowIds)
  ]);
  const commandEvidenceRecords = invalidTranscriptRows.length > 0
    ? []
    : validTranscripts
        .map(commandEvidenceRecord)
        .sort((left, right) => `${left.ownerAgentId}:${left.rowEvidenceId}:${left.evidenceId}`.localeCompare(
          `${right.ownerAgentId}:${right.rowEvidenceId}:${right.evidenceId}`
        ));
  const coveredRowKeys = new Set(validTranscripts.map(transcriptRecordKey));
  const missingTranscriptCount = rows.filter((row) => !coveredRowKeys.has(transcriptKey(row.ownerAgentId, row.evidenceId))).length;
  const acceptedTranscriptCount = commandEvidenceRecords.filter((record) => record.status === "accepted").length;
  const blockedTranscriptCount = commandEvidenceRecords.filter((record) => record.status === "blocked").length;
  const invalidTranscriptCount = invalidTranscriptRows.length;
  const status = intakeStatus({
    blockedTranscriptCount,
    commandPacket,
    invalidTranscriptCount,
    missingTranscriptCount
  });

  return {
    acceptedTranscriptCount,
    blockedTranscriptCount,
    canMarkThreadGoalComplete: false,
    commandEvidenceRecords,
    duplicateTranscriptEvidenceIds: duplicateTranscriptIds,
    duplicateTranscriptRowEvidenceIds: duplicateTranscriptRowIds,
    invalidTranscriptCount,
    invalidTranscripts: [...invalidTranscriptRows].sort((left, right) =>
      transcriptEvidenceIdValue(left).localeCompare(transcriptEvidenceIdValue(right))
    ),
    nonCanonicalTranscriptCommandRows: nonCanonicalCommandRows,
    mismatchedTranscriptCommandRows: mismatchedCommandRows,
    mismatchedTranscriptKindRows: mismatchedKindRows,
    mismatchedTranscriptRouteHrefRows: mismatchedRouteHrefRows,
    mismatchedTranscriptRouteSectionRows: mismatchedRouteSectionRows,
    missingTranscriptCommandRows: missingCommandRows,
    missingTranscriptCommandExitCodeRows: missingExitCodeRows,
    missingTranscriptCommandReportPathRows: missingReportPathRows,
    missingTranscriptCommandRunIdRows: missingRunIdRows,
    missingTranscriptEvidenceIdCount: missingTranscriptIdCount,
    missingTranscriptKindRows: missingKindRows,
    missingTranscriptOwnerAgentIdCount: missingTranscriptOwnerIdCount,
    missingTranscriptRowEvidenceIdCount: missingTranscriptRowIdCount,
    missingTranscriptReviewDecisionRows: missingReviewDecisionRows,
    missingTranscriptRouteHrefRows: missingRouteHrefRows,
    missingTranscriptRouteSectionRows: missingRouteSectionRows,
    missingTranscriptCount,
    nonCanonicalTranscriptCommandReportPathRows: nonCanonicalReportPathRows,
    nonCanonicalTranscriptCommandRunIdRows: nonCanonicalRunIdRows,
    nonCanonicalTranscriptEvidenceIds: nonCanonicalTranscriptIds,
    nonCanonicalTranscriptKindRows: nonCanonicalKindRows,
    nonCanonicalTranscriptOwnerAgentIds: nonCanonicalTranscriptOwnerIds,
    nonCanonicalTranscriptReviewDecisionRows: nonCanonicalReviewDecisionRows,
    nonCanonicalTranscriptRouteHrefRows: nonCanonicalRouteHrefRows,
    nonCanonicalTranscriptRouteSectionRows: nonCanonicalRouteSectionRows,
    nonCanonicalTranscriptRowEvidenceIds: nonCanonicalTranscriptRowIds,
    requiredTranscriptCount: rows.length,
    reviewSliceConsumerGateEvidenceIdManifest: commandPacket.reviewSliceConsumerGateEvidenceIdManifest,
    reviewSliceCount: commandPacket.reviewSliceCount,
    reviewSliceFileManifest: commandPacket.reviewSliceFileManifest,
    reviewSliceIds: commandPacket.reviewSliceIds,
    reviewSliceSummary: commandPacket.reviewSliceSummary,
    sourceContract: MATH_SCENE_V2_OWNER_GATE_RERUN_COMMAND_TRANSCRIPT_INTAKE_SOURCE_CONTRACT,
    status,
    unsupportedTranscriptCommandExitCodeRows: unsupportedExitCodeRows,
    unsupportedTranscriptExitCodes: unsupportedExitCodes,
    unsupportedTranscriptReviewDecisionRows: unsupportedReviewDecisionRows,
    unsupportedTranscriptReviewDecisions: unsupportedReviewDecisions,
    unknownTranscriptRowEvidenceIds: unknownTranscriptRowIds,
    summary: [
      "mathSceneV2OwnerGateRerunCommandTranscriptIntake",
      `status=${status}`,
      `accepted=${acceptedTranscriptCount}`,
      `blocked=${blockedTranscriptCount}`,
      `duplicateTranscriptIds=${duplicateTranscriptIds.join(",") || "none"}`,
      `duplicateTranscriptRows=${duplicateTranscriptRowIds.join(",") || "none"}`,
      `reviewSlices=${commandPacket.reviewSliceSummary}`,
      `missingTranscriptIds=${missingTranscriptIdCount}`,
      `missingTranscriptOwners=${missingTranscriptOwnerIdCount}`,
      `missingTranscriptRows=${missingTranscriptRowIdCount}`,
      `missingReviewDecisions=${missingReviewDecisionRows.join(",") || "none"}`,
      `nonCanonicalCommands=${nonCanonicalCommandRows.join(",") || "none"}`,
      `mismatchedCommands=${mismatchedCommandRows.join(",") || "none"}`,
      `missingCommands=${missingCommandRows.join(",") || "none"}`,
      `mismatchedKinds=${mismatchedKindRows.join(",") || "none"}`,
      `missingKinds=${missingKindRows.join(",") || "none"}`,
      `nonCanonicalKinds=${nonCanonicalKindRows.join(",") || "none"}`,
      `mismatchedRouteHrefs=${mismatchedRouteHrefRows.join(",") || "none"}`,
      `mismatchedRouteSections=${mismatchedRouteSectionRows.join(",") || "none"}`,
      `missingExitCodes=${missingExitCodeRows.join(",") || "none"}`,
      `missingRouteHrefs=${missingRouteHrefRows.join(",") || "none"}`,
      `missingRouteSections=${missingRouteSectionRows.join(",") || "none"}`,
      `missingReportPaths=${missingReportPathRows.join(",") || "none"}`,
      `missingRunIds=${missingRunIdRows.join(",") || "none"}`,
      `nonCanonicalReviewDecisions=${nonCanonicalReviewDecisionRows.join(",") || "none"}`,
      `nonCanonicalReportPaths=${nonCanonicalReportPathRows.join(",") || "none"}`,
      `nonCanonicalRunIds=${nonCanonicalRunIdRows.join(",") || "none"}`,
      `nonCanonicalRouteHrefs=${nonCanonicalRouteHrefRows.join(",") || "none"}`,
      `nonCanonicalRouteSections=${nonCanonicalRouteSectionRows.join(",") || "none"}`,
      `nonCanonicalTranscriptIds=${nonCanonicalTranscriptIds.join(",") || "none"}`,
      `nonCanonicalTranscriptOwners=${nonCanonicalTranscriptOwnerIds.join(",") || "none"}`,
      `nonCanonicalTranscriptRows=${nonCanonicalTranscriptRowIds.join(",") || "none"}`,
      `unsupportedExitCodeRows=${unsupportedExitCodeRows.join(",") || "none"}`,
      `unsupportedExitCodes=${unsupportedExitCodes.join(",") || "none"}`,
      `unsupportedReviewDecisionRows=${unsupportedReviewDecisionRows.join(",") || "none"}`,
      `unsupportedReviewDecisions=${unsupportedReviewDecisions.join(",") || "none"}`,
      `unknownTranscriptRows=${unknownTranscriptRowIds.join(",") || "none"}`,
      `invalid=${invalidTranscriptCount}`,
      `missing=${missingTranscriptCount}`
    ].join(":")
  };
}

export function mathSceneV2OwnerGateRerunCommandTranscriptIntakeDataAttributes(
  intake: MathSceneV2OwnerGateRerunCommandTranscriptIntake
) {
  return {
    "data-viz-manim-v2-command-transcript-accepted": String(intake.acceptedTranscriptCount),
    "data-viz-manim-v2-command-transcript-blocked": String(intake.blockedTranscriptCount),
    "data-viz-manim-v2-command-transcript-can-complete": intake.canMarkThreadGoalComplete ? "true" : "false",
    "data-viz-manim-v2-command-transcript-duplicate-evidence-ids": intake.duplicateTranscriptEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-duplicate-row-ids": intake.duplicateTranscriptRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-evidence-records": String(intake.commandEvidenceRecords.length),
    "data-viz-manim-v2-command-transcript-invalid": String(intake.invalidTranscriptCount),
    "data-viz-manim-v2-command-transcript-non-canonical-command-rows": intake.nonCanonicalTranscriptCommandRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-mismatched-command-rows": intake.mismatchedTranscriptCommandRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-mismatched-kind-rows": intake.mismatchedTranscriptKindRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-mismatched-route-href-rows": intake.mismatchedTranscriptRouteHrefRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-mismatched-route-section-rows": intake.mismatchedTranscriptRouteSectionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-command-rows": intake.missingTranscriptCommandRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-evidence-id-count": String(intake.missingTranscriptEvidenceIdCount),
    "data-viz-manim-v2-command-transcript-missing-exit-code-rows": intake.missingTranscriptCommandExitCodeRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-kind-rows": intake.missingTranscriptKindRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-owner-id-count": String(intake.missingTranscriptOwnerAgentIdCount),
    "data-viz-manim-v2-command-transcript-missing-row-id-count": String(intake.missingTranscriptRowEvidenceIdCount),
    "data-viz-manim-v2-command-transcript-missing-review-decision-rows": intake.missingTranscriptReviewDecisionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-report-path-rows": intake.missingTranscriptCommandReportPathRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-run-id-rows": intake.missingTranscriptCommandRunIdRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-route-href-rows": intake.missingTranscriptRouteHrefRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing-route-section-rows": intake.missingTranscriptRouteSectionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-missing": String(intake.missingTranscriptCount),
    "data-viz-manim-v2-command-transcript-non-canonical-review-decision-rows": intake.nonCanonicalTranscriptReviewDecisionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-report-path-rows": intake.nonCanonicalTranscriptCommandReportPathRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-run-id-rows": intake.nonCanonicalTranscriptCommandRunIdRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-kind-rows": intake.nonCanonicalTranscriptKindRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-route-href-rows": intake.nonCanonicalTranscriptRouteHrefRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-route-section-rows": intake.nonCanonicalTranscriptRouteSectionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-evidence-ids": intake.nonCanonicalTranscriptEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-owner-ids": intake.nonCanonicalTranscriptOwnerAgentIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-non-canonical-row-ids": intake.nonCanonicalTranscriptRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-required": String(intake.requiredTranscriptCount),
    "data-viz-manim-v2-command-transcript-review-slice-consumer-gate-evidence-id-manifest":
      intake.reviewSliceConsumerGateEvidenceIdManifest,
    "data-viz-manim-v2-command-transcript-review-slice-count": String(intake.reviewSliceCount),
    "data-viz-manim-v2-command-transcript-review-slice-file-manifest": intake.reviewSliceFileManifest,
    "data-viz-manim-v2-command-transcript-review-slice-ids": intake.reviewSliceIds,
    "data-viz-manim-v2-command-transcript-review-slices": intake.reviewSliceSummary,
    "data-viz-manim-v2-command-transcript-source-contract": intake.sourceContract,
    "data-viz-manim-v2-command-transcript-status": intake.status,
    "data-viz-manim-v2-command-transcript-summary": intake.summary,
    "data-viz-manim-v2-command-transcript-unknown-row-ids": intake.unknownTranscriptRowEvidenceIds.join(",") || "none",
    "data-viz-manim-v2-command-transcript-unsupported-exit-code-rows": intake.unsupportedTranscriptCommandExitCodeRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-unsupported-exit-codes": intake.unsupportedTranscriptExitCodes.join(",") || "none",
    "data-viz-manim-v2-command-transcript-unsupported-review-decision-rows": intake.unsupportedTranscriptReviewDecisionRows.join(",") || "none",
    "data-viz-manim-v2-command-transcript-unsupported-review-decisions": intake.unsupportedTranscriptReviewDecisions.join(",") || "none"
  } as const;
}
