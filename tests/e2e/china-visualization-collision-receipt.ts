import type {
  HkVisualizationCollisionCandidatePairCounts,
  HkVisualizationCollisionPairKind,
  HkVisualizationCollisionSnapshot,
} from "./hk-visualization-collision-scanner";

export const chinaVisualizationCollisionPairKinds = [
  "control-control",
  "dom-text-text",
  "svg-label-label",
  "svg-label-mark",
  "text-control",
  "text-occlusion",
] as const satisfies readonly HkVisualizationCollisionPairKind[];

export type ChinaVisualizationCollisionReceipt = {
  candidatePairCounts: HkVisualizationCollisionCandidatePairCounts;
  canvasSurfaceCount: number;
  htmlTextFragmentCount: number;
  inspectedCandidateCount: number;
  learnerControlCount: number;
  overlapExemptionCount: number;
  paintedMarkCount: number;
  phase: string;
  svgSurfaceCount: number;
  svgTextFragmentCount: number;
  totalCandidatePairCount: number;
};

function exactNonNegativeInteger(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Validates the coverage receipt produced by the browser collision scanner.
 * A scan that did not inspect real learner controls, text, marks, surfaces, or
 * any eligible pair can never become release evidence merely because it found
 * zero collisions.
 */
export function chinaVisualizationCollisionSnapshotIssues(
  snapshot: HkVisualizationCollisionSnapshot,
): string[] {
  const issues: string[] = [];
  const candidateCounts = {
    htmlTextFragmentCount: snapshot.htmlTextFragmentCount,
    learnerControlCount: snapshot.learnerControlCount,
    paintedMarkCount: snapshot.paintedMarkCount,
    svgTextFragmentCount: snapshot.svgTextFragmentCount,
  };
  const numericCounts = {
    ...candidateCounts,
    canvasSurfaceCount: snapshot.canvasSurfaceCount,
    inspectedCandidateCount: snapshot.inspectedCandidateCount,
    svgSurfaceCount: snapshot.svgSurfaceCount,
    totalCandidatePairCount: snapshot.totalCandidatePairCount,
  };

  for (const [name, value] of Object.entries(numericCounts)) {
    if (!exactNonNegativeInteger(value)) {
      issues.push(
        `${name} must be an exact non-negative integer; received ${String(value)}.`,
      );
    }
  }

  const actualPairKeys = Object.keys(snapshot.candidatePairCounts).sort();
  const expectedPairKeys = [...chinaVisualizationCollisionPairKinds].sort();
  if (JSON.stringify(actualPairKeys) !== JSON.stringify(expectedPairKeys)) {
    issues.push(
      `candidatePairCounts keys must be exact; expected=${JSON.stringify(expectedPairKeys)} actual=${JSON.stringify(actualPairKeys)}.`,
    );
  }
  for (const kind of chinaVisualizationCollisionPairKinds) {
    const value = snapshot.candidatePairCounts[kind];
    if (!exactNonNegativeInteger(value)) {
      issues.push(
        `${kind} candidate-pair count must be an exact non-negative integer; received ${String(value)}.`,
      );
    }
  }

  const expectedInspectedCandidateCount = Object.values(candidateCounts).reduce(
    (total, value) => total + value,
    0,
  );
  if (snapshot.inspectedCandidateCount !== expectedInspectedCandidateCount) {
    issues.push(
      `inspectedCandidateCount must equal the four candidate families; expected ${expectedInspectedCandidateCount}, received ${snapshot.inspectedCandidateCount}.`,
    );
  }
  const expectedPairCount = chinaVisualizationCollisionPairKinds.reduce(
    (total, kind) => total + snapshot.candidatePairCounts[kind],
    0,
  );
  if (snapshot.totalCandidatePairCount !== expectedPairCount) {
    issues.push(
      `totalCandidatePairCount must equal the six pair families; expected ${expectedPairCount}, received ${snapshot.totalCandidatePairCount}.`,
    );
  }

  if (snapshot.learnerControlCount === 0) {
    issues.push("Collision scan inspected zero learner controls.");
  }
  if (snapshot.htmlTextFragmentCount === 0) {
    issues.push("Collision scan inspected zero learner HTML text fragments.");
  }
  if (snapshot.svgTextFragmentCount === 0) {
    issues.push("Collision scan inspected zero learner SVG text fragments.");
  }
  if (snapshot.paintedMarkCount === 0) {
    issues.push("Collision scan inspected zero painted mathematical marks.");
  }
  if (snapshot.inspectedCandidateCount === 0) {
    issues.push("Collision scan inspected zero total candidates.");
  }
  if (snapshot.svgSurfaceCount + snapshot.canvasSurfaceCount === 0) {
    issues.push("Collision scan inspected no visible SVG or Canvas surface.");
  }
  if (snapshot.totalCandidatePairCount === 0) {
    issues.push("Collision scan attempted zero eligible candidate pairs.");
  }
  if (snapshot.truncated) {
    issues.push("Collision issue evidence was truncated.");
  }
  for (const issue of snapshot.issues) {
    issues.push(
      `${issue.kind}: ${issue.first} overlaps ${issue.second} by ${issue.intersection.width}x${issue.intersection.height}.`,
    );
  }
  for (const exemption of snapshot.overlapExemptions) {
    if (exemption.risk !== "explicit-narrow-pair") {
      issues.push(
        `Overlap exemption ${exemption.owner} is ${exemption.risk}; reason=${JSON.stringify(exemption.reason)} pair=${JSON.stringify(exemption.pair)}.`,
      );
    }
  }

  return issues;
}

export function chinaVisualizationCollisionReceipt(
  snapshot: HkVisualizationCollisionSnapshot,
): ChinaVisualizationCollisionReceipt {
  const issues = chinaVisualizationCollisionSnapshotIssues(snapshot);
  if (issues.length > 0) {
    throw new Error(issues.join(" "));
  }
  return {
    candidatePairCounts: { ...snapshot.candidatePairCounts },
    canvasSurfaceCount: snapshot.canvasSurfaceCount,
    htmlTextFragmentCount: snapshot.htmlTextFragmentCount,
    inspectedCandidateCount: snapshot.inspectedCandidateCount,
    learnerControlCount: snapshot.learnerControlCount,
    overlapExemptionCount: snapshot.overlapExemptions.length,
    paintedMarkCount: snapshot.paintedMarkCount,
    phase: snapshot.phase,
    svgSurfaceCount: snapshot.svgSurfaceCount,
    svgTextFragmentCount: snapshot.svgTextFragmentCount,
    totalCandidatePairCount: snapshot.totalCandidatePairCount,
  };
}
