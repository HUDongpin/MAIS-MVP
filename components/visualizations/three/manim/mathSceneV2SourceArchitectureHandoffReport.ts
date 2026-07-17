import type { MathSceneV2CrossAgentHandoff } from "./mathSceneV2CrossAgentHandoff";
import type { MathSceneV2ReleaseSliceManifest } from "./mathSceneV2ReleaseSliceManifest";
import type {
  MathSceneV2SourceArchitectureHandoff,
  MathSceneV2SourceArchitectureAcceptanceCriterion
} from "./mathSceneV2SourceArchitectureHandoff";
import type { MathSceneV2GoalGateId } from "./mathSceneV2GoalGate";

export const MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT =
  "MAIS Manim v2 source-architecture handoff report: current A06 evidence packet tying reusable source architecture to release-slice and cross-agent owner-gate handoffs without bulk course generation" as const;

export type MathSceneV2SourceArchitectureHandoffReportStatus =
  | "current-cross-agent-evidence-attached"
  | "stale-or-mismatched-source-architecture-evidence";

export type MathSceneV2SourceArchitectureHandoffReportFreshnessIssue =
  | "cross-agent-source-architecture-bulk-course-generation-mismatch"
  | "cross-agent-source-architecture-future-scope-mismatch"
  | "cross-agent-source-architecture-source-contract-mismatch"
  | "cross-agent-source-architecture-status-mismatch"
  | "release-slice-source-architecture-bulk-course-generation-mismatch"
  | "release-slice-source-architecture-future-scope-mismatch"
  | "release-slice-source-architecture-source-contract-mismatch"
  | "release-slice-source-architecture-status-mismatch";

export type MathSceneV2SourceArchitectureHandoffReportInput = {
  checkedAtHkt: string;
  crossAgentHandoff: Pick<
    MathSceneV2CrossAgentHandoff,
    | "canMarkThreadGoalComplete"
    | "sourceArchitectureAcceptanceCriteria"
    | "sourceArchitectureBulkCourseGenerationAllowed"
    | "sourceArchitectureCanMarkThreadGoalComplete"
    | "sourceArchitectureFutureInvocationScope"
    | "sourceArchitectureHandoffStatus"
    | "sourceArchitectureOpenOwnerGateIds"
    | "sourceArchitectureRequiredOwnerGateIds"
    | "sourceArchitectureSourceContract"
    | "sourceArchitectureSummary"
    | "status"
  >;
  releaseSliceManifest: Pick<
    MathSceneV2ReleaseSliceManifest,
    | "fileCount"
    | "packageCount"
    | "reviewSliceCount"
    | "reviewSliceIds"
    | "reviewSliceLargestFileCount"
    | "reviewSliceMaxFilesPerSlice"
    | "sourceArchitectureAcceptanceCriteria"
    | "sourceArchitectureBulkCourseGenerationAllowed"
    | "sourceArchitectureCanMarkThreadGoalComplete"
    | "sourceArchitectureFutureInvocationScope"
    | "sourceArchitectureHandoffStatus"
    | "sourceArchitectureOpenOwnerGateIds"
    | "sourceArchitectureRequiredOwnerGateIds"
    | "sourceArchitectureSourceContract"
    | "sourceArchitectureSummary"
    | "status"
  >;
  sourceArchitectureHandoff: Pick<
    MathSceneV2SourceArchitectureHandoff,
    | "acceptanceCriteria"
    | "bulkCourseGenerationAllowed"
    | "canMarkThreadGoalComplete"
    | "futureInvocationScope"
    | "openOwnerGateIds"
    | "requiredOwnerGateIds"
    | "reviewPackageCount"
    | "reviewSliceCount"
    | "reviewSliceIds"
    | "reviewSliceSummary"
    | "sourceContract"
    | "status"
    | "summary"
  >;
};

export type MathSceneV2SourceArchitectureHandoffReport = {
  acceptanceCriteria: readonly string[];
  bulkCourseGenerationAllowed: boolean;
  checkedAtHkt: string;
  crossAgentHandoffStatus: MathSceneV2CrossAgentHandoff["status"];
  crossAgentSourceArchitectureStatus: string;
  freshnessIssues: MathSceneV2SourceArchitectureHandoffReportFreshnessIssue[];
  futureInvocationScope: string;
  inputSnapshot: MathSceneV2SourceArchitectureHandoffReportInput;
  openOwnerGateIds: string[];
  ownerGateRoutingSummary: string;
  releaseSliceFileCount: number;
  releaseSliceLargestFileCount: number;
  releaseSliceMaxFilesPerSlice: number;
  releaseSliceSourceArchitectureStatus: string;
  releaseSliceStatus: MathSceneV2ReleaseSliceManifest["status"];
  requiredOwnerGateIds: string[];
  reviewPackageCount: number;
  reviewSliceCount: number;
  reviewSliceIds: string;
  reviewSliceSummary: string;
  sourceArchitectureHandoffStatus: MathSceneV2SourceArchitectureHandoff["status"];
  sourceArchitectureSourceContract: string;
  sourceArchitectureSummary: string;
  sourceContract: typeof MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT;
  status: MathSceneV2SourceArchitectureHandoffReportStatus;
  summary: string;
};

const ownerGateOrder: readonly MathSceneV2GoalGateId[] = [
  "a06-review-package-split",
  "a11-browser-visual-interaction-regression",
  "a18-a06-teaching-quality-confirmation",
  "a22-clean-release-gate"
];

function orderedGateIds(values: readonly string[]) {
  const valueSet = new Set(values);
  const orderedKnown = ownerGateOrder.filter((gateId) => valueSet.has(gateId));
  const unknown = [...valueSet]
    .filter((gateId) => !ownerGateOrder.includes(gateId as MathSceneV2GoalGateId))
    .sort((left, right) => left.localeCompare(right));

  return [...orderedKnown, ...unknown];
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function reportFreshnessIssues(
  input: MathSceneV2SourceArchitectureHandoffReportInput
): MathSceneV2SourceArchitectureHandoffReportFreshnessIssue[] {
  const issues: MathSceneV2SourceArchitectureHandoffReportFreshnessIssue[] = [];
  const source = input.sourceArchitectureHandoff;
  const releaseSlice = input.releaseSliceManifest;
  const crossAgent = input.crossAgentHandoff;

  if (releaseSlice.sourceArchitectureHandoffStatus !== source.status) {
    issues.push("release-slice-source-architecture-status-mismatch");
  }

  if (crossAgent.sourceArchitectureHandoffStatus !== source.status) {
    issues.push("cross-agent-source-architecture-status-mismatch");
  }

  if (releaseSlice.sourceArchitectureBulkCourseGenerationAllowed !== source.bulkCourseGenerationAllowed) {
    issues.push("release-slice-source-architecture-bulk-course-generation-mismatch");
  }

  if (crossAgent.sourceArchitectureBulkCourseGenerationAllowed !== source.bulkCourseGenerationAllowed) {
    issues.push("cross-agent-source-architecture-bulk-course-generation-mismatch");
  }

  if (releaseSlice.sourceArchitectureFutureInvocationScope !== source.futureInvocationScope) {
    issues.push("release-slice-source-architecture-future-scope-mismatch");
  }

  if (crossAgent.sourceArchitectureFutureInvocationScope !== source.futureInvocationScope) {
    issues.push("cross-agent-source-architecture-future-scope-mismatch");
  }

  if (releaseSlice.sourceArchitectureSourceContract !== source.sourceContract) {
    issues.push("release-slice-source-architecture-source-contract-mismatch");
  }

  if (crossAgent.sourceArchitectureSourceContract !== source.sourceContract) {
    issues.push("cross-agent-source-architecture-source-contract-mismatch");
  }

  return issues;
}

function ownerGateRoutingSummary(openOwnerGateIds: readonly string[]) {
  const open = new Set(openOwnerGateIds);
  const segments = [
    open.has("a11-browser-visual-interaction-regression")
      ? "A11=browser-visual-interaction-regression"
      : "A11=not-open",
    open.has("a18-a06-teaching-quality-confirmation")
      ? "A18+A06=teaching-quality-confirmation"
      : "A18+A06=not-open",
    open.has("a22-clean-release-gate")
      ? "A22=clean-release-gate"
      : "A22=not-open"
  ];

  return segments.join(";");
}

export function buildMathSceneV2SourceArchitectureHandoffReport(
  input: MathSceneV2SourceArchitectureHandoffReportInput
): MathSceneV2SourceArchitectureHandoffReport {
  const freshnessIssues = reportFreshnessIssues(input);
  const status =
    freshnessIssues.length === 0
      ? "current-cross-agent-evidence-attached"
      : "stale-or-mismatched-source-architecture-evidence";
  const source = input.sourceArchitectureHandoff;
  const releaseSlice = input.releaseSliceManifest;
  const crossAgent = input.crossAgentHandoff;
  const openOwnerGateIds = orderedGateIds([
    ...source.openOwnerGateIds,
    ...releaseSlice.sourceArchitectureOpenOwnerGateIds,
    ...crossAgent.sourceArchitectureOpenOwnerGateIds
  ]);
  const requiredOwnerGateIds = orderedGateIds([
    ...source.requiredOwnerGateIds,
    ...releaseSlice.sourceArchitectureRequiredOwnerGateIds,
    ...crossAgent.sourceArchitectureRequiredOwnerGateIds
  ]);
  const acceptanceCriteria = uniqueStrings([
    ...source.acceptanceCriteria,
    ...releaseSlice.sourceArchitectureAcceptanceCriteria,
    ...crossAgent.sourceArchitectureAcceptanceCriteria
  ]);
  const bulkCourseGenerationAllowed =
    source.bulkCourseGenerationAllowed ||
    releaseSlice.sourceArchitectureBulkCourseGenerationAllowed ||
    crossAgent.sourceArchitectureBulkCourseGenerationAllowed;

  return {
    acceptanceCriteria,
    bulkCourseGenerationAllowed,
    checkedAtHkt: input.checkedAtHkt,
    crossAgentHandoffStatus: crossAgent.status,
    crossAgentSourceArchitectureStatus: crossAgent.sourceArchitectureHandoffStatus,
    freshnessIssues,
    futureInvocationScope: source.futureInvocationScope,
    inputSnapshot: input,
    openOwnerGateIds,
    ownerGateRoutingSummary: ownerGateRoutingSummary(openOwnerGateIds),
    releaseSliceFileCount: releaseSlice.fileCount,
    releaseSliceLargestFileCount: releaseSlice.reviewSliceLargestFileCount,
    releaseSliceMaxFilesPerSlice: releaseSlice.reviewSliceMaxFilesPerSlice,
    releaseSliceSourceArchitectureStatus: releaseSlice.sourceArchitectureHandoffStatus,
    releaseSliceStatus: releaseSlice.status,
    requiredOwnerGateIds,
    reviewPackageCount: source.reviewPackageCount,
    reviewSliceCount: source.reviewSliceCount,
    reviewSliceIds: source.reviewSliceIds,
    reviewSliceSummary: source.reviewSliceSummary,
    sourceArchitectureHandoffStatus: source.status,
    sourceArchitectureSourceContract: source.sourceContract,
    sourceArchitectureSummary: source.summary,
    sourceContract: MATH_SCENE_V2_SOURCE_ARCHITECTURE_HANDOFF_REPORT_SOURCE_CONTRACT,
    status,
    summary: [
      "mathSceneV2SourceArchitectureHandoffReport",
      `reportStatus=${status}`,
      `sourceArchitecture=${source.status}`,
      `releaseSlice=${releaseSlice.sourceArchitectureHandoffStatus}`,
      `crossAgent=${crossAgent.sourceArchitectureHandoffStatus}`,
      `bulkCourseGeneration=${bulkCourseGenerationAllowed ? "true" : "false"}`,
      `futureInvocationScope=${source.futureInvocationScope}`,
      `reviewSlices=${source.reviewSliceSummary}`,
      `openOwnerGates=${openOwnerGateIds.join(",") || "none"}`,
      `freshnessIssues=${freshnessIssues.join(",") || "none"}`
    ].join(":")
  };
}

export function mathSceneV2SourceArchitectureHandoffReportDataAttributes(
  report: MathSceneV2SourceArchitectureHandoffReport
) {
  const prefix = "data-viz-manim-v2-source-architecture-report";

  return {
    [`${prefix}-acceptance-criteria`]: report.acceptanceCriteria.join(","),
    [`${prefix}-bulk-course-generation`]: report.bulkCourseGenerationAllowed ? "true" : "false",
    [`${prefix}-checked-at-hkt`]: report.checkedAtHkt,
    [`${prefix}-cross-agent-source-architecture-status`]: report.crossAgentSourceArchitectureStatus,
    [`${prefix}-freshness-issues`]: report.freshnessIssues.join(",") || "none",
    [`${prefix}-future-invocation-scope`]: report.futureInvocationScope,
    [`${prefix}-open-owner-gates`]: report.openOwnerGateIds.join(",") || "none",
    [`${prefix}-owner-gate-routing-summary`]: report.ownerGateRoutingSummary,
    [`${prefix}-release-slice-file-count`]: String(report.releaseSliceFileCount),
    [`${prefix}-release-slice-source-architecture-status`]: report.releaseSliceSourceArchitectureStatus,
    [`${prefix}-required-owner-gates`]: report.requiredOwnerGateIds.join(",") || "none",
    [`${prefix}-review-package-count`]: String(report.reviewPackageCount),
    [`${prefix}-review-slice-count`]: String(report.reviewSliceCount),
    [`${prefix}-review-slice-ids`]: report.reviewSliceIds,
    [`${prefix}-review-slice-summary`]: report.reviewSliceSummary,
    [`${prefix}-source-architecture-status`]: report.sourceArchitectureHandoffStatus,
    [`${prefix}-source-contract`]: report.sourceContract,
    [`${prefix}-status`]: report.status,
    [`${prefix}-summary`]: report.summary
  } as const;
}
