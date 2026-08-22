import assert from "node:assert/strict";
import test from "node:test";
import {
  chinaVisualizationCollisionReceipt,
  chinaVisualizationCollisionSnapshotIssues,
} from "./china-visualization-collision-receipt";
import type { HkVisualizationCollisionSnapshot } from "./hk-visualization-collision-scanner";

function validSnapshot(): HkVisualizationCollisionSnapshot {
  return {
    canvasSurfaceCount: 0,
    candidatePairCounts: {
      "control-control": 3,
      "dom-text-text": 8,
      "svg-label-label": 4,
      "svg-label-mark": 7,
      "text-control": 6,
      "text-occlusion": 2,
    },
    htmlTextFragmentCount: 5,
    inspectedCandidateCount: 23,
    issues: [],
    learnerControlCount: 4,
    overlapExemptions: [],
    paintedMarkCount: 8,
    phase: "default:left",
    svgSurfaceCount: 1,
    svgTextFragmentCount: 6,
    totalCandidatePairCount: 30,
    truncated: false,
  };
}

test("accepts and preserves an exact non-empty collision coverage receipt", () => {
  const snapshot = validSnapshot();
  assert.deepEqual(chinaVisualizationCollisionSnapshotIssues(snapshot), []);
  assert.deepEqual(chinaVisualizationCollisionReceipt(snapshot), {
    candidatePairCounts: snapshot.candidatePairCounts,
    canvasSurfaceCount: 0,
    htmlTextFragmentCount: 5,
    inspectedCandidateCount: 23,
    learnerControlCount: 4,
    overlapExemptionCount: 0,
    paintedMarkCount: 8,
    phase: "default:left",
    svgSurfaceCount: 1,
    svgTextFragmentCount: 6,
    totalCandidatePairCount: 30,
  });
});

test("rejects the exact-zero false green", () => {
  const snapshot = validSnapshot();
  snapshot.candidatePairCounts = {
    "control-control": 0,
    "dom-text-text": 0,
    "svg-label-label": 0,
    "svg-label-mark": 0,
    "text-control": 0,
    "text-occlusion": 0,
  };
  snapshot.htmlTextFragmentCount = 0;
  snapshot.inspectedCandidateCount = 0;
  snapshot.learnerControlCount = 0;
  snapshot.paintedMarkCount = 0;
  snapshot.svgSurfaceCount = 0;
  snapshot.svgTextFragmentCount = 0;
  snapshot.totalCandidatePairCount = 0;

  const issues = chinaVisualizationCollisionSnapshotIssues(snapshot);
  assert.ok(issues.some((issue) => /zero learner controls/.test(issue)));
  assert.ok(issues.some((issue) => /zero learner HTML/.test(issue)));
  assert.ok(issues.some((issue) => /zero learner SVG/.test(issue)));
  assert.ok(issues.some((issue) => /zero painted/.test(issue)));
  assert.ok(issues.some((issue) => /no visible SVG or Canvas/.test(issue)));
  assert.ok(
    issues.some((issue) => /zero eligible candidate pairs/.test(issue)),
  );
  assert.throws(
    () => chinaVisualizationCollisionReceipt(snapshot),
    /zero learner controls/,
  );
});

test("rejects candidate and pair totals that do not reconcile", () => {
  const candidateDrift = validSnapshot();
  candidateDrift.inspectedCandidateCount += 1;
  assert.match(
    chinaVisualizationCollisionSnapshotIssues(candidateDrift).join("\n"),
    /inspectedCandidateCount must equal/,
  );

  const pairDrift = validSnapshot();
  pairDrift.totalCandidatePairCount -= 1;
  assert.match(
    chinaVisualizationCollisionSnapshotIssues(pairDrift).join("\n"),
    /totalCandidatePairCount must equal/,
  );
});

test("rejects collisions, truncation, and any broad or incomplete exemption", () => {
  const snapshot = validSnapshot();
  snapshot.truncated = true;
  snapshot.issues.push({
    first: "label A",
    firstRect: { height: 10, width: 20, x: 0, y: 0 },
    intersection: { height: 4, width: 6, x: 4, y: 4 },
    kind: "svg-label-mark",
    second: "mark B",
    secondRect: { height: 20, width: 20, x: 4, y: 4 },
  });
  snapshot.overlapExemptions.push({
    areaRatio: 0.8,
    candidateCount: 9,
    heightRatio: 0.9,
    owner: "broad wrapper",
    pair: [],
    reason: null,
    risk: "missing-reason",
    scope: "html-wrapper",
    widthRatio: 0.9,
  });

  const issues = chinaVisualizationCollisionSnapshotIssues(snapshot).join("\n");
  assert.match(issues, /truncated/);
  assert.match(issues, /svg-label-mark/);
  assert.match(issues, /missing-reason/);
});

test("permits only a complete explicit narrow label-mark exemption", () => {
  const snapshot = validSnapshot();
  snapshot.overlapExemptions.push({
    areaRatio: 0.02,
    candidateCount: 2,
    heightRatio: 0.1,
    owner: "formula-card",
    pair: ["[label] formula", "[mark] formula background"],
    reason: "label belongs inside its formula background",
    risk: "explicit-narrow-pair",
    scope: "svg-group",
    widthRatio: 0.2,
  });
  assert.deepEqual(chinaVisualizationCollisionSnapshotIssues(snapshot), []);
  assert.equal(
    chinaVisualizationCollisionReceipt(snapshot).overlapExemptionCount,
    1,
  );
});
