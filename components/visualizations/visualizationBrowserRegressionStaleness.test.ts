import assert from "node:assert/strict";
import test from "node:test";

import {
  hongKongVisualizationSurfaceRevision,
  recordedHkGradePackageBrowserEvidence,
  recordedHkGradePackageBrowserEvidenceCapturedOn,
  recordedHkGradePackageBrowserEvidenceIsStale
} from "./visualizationBrowserRegressionEvidence";
import { visualizationLabCatalog } from "@/data/visualizationLabs";
import { topics } from "@/data/topics";

/**
 * The recorded Hong Kong browser evidence reports twelve packages, 49/49 labs,
 * all "passed" — from a run captured before the configuration it certifies.
 *
 * These tests do not require the evidence to be fresh; re-running it needs a
 * Playwright environment. They require it to be *honest*: the capture date must
 * match the run ids, and staleness must be derived rather than left for a reader
 * to notice.
 */

const runIdDatePattern = /(\d{8})/;

function runIdDate(runId: string) {
  const match = runId.match(runIdDatePattern);
  assert.ok(match, `runId "${runId}" must carry a YYYYMMDD stamp`);
  const stamp = match[1];
  return `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;
}

test("every recorded HK run id agrees with the declared capture date", () => {
  assert.ok(recordedHkGradePackageBrowserEvidence.length > 0, "there must be recorded evidence to check");

  for (const run of recordedHkGradePackageBrowserEvidence) {
    assert.equal(
      runIdDate(run.runId),
      recordedHkGradePackageBrowserEvidenceCapturedOn,
      `${run.packageId}: run id ${run.runId} disagrees with the declared capture date`
    );
  }
});

test("staleness is derived from the capture date, not asserted by hand", () => {
  const expected = recordedHkGradePackageBrowserEvidenceCapturedOn < hongKongVisualizationSurfaceRevision;

  assert.equal(
    recordedHkGradePackageBrowserEvidenceIsStale,
    expected,
    "the stale flag must follow from comparing the capture date with the surface revision"
  );
});

test("a run that predates the surface it certifies is not reported as fresh", () => {
  if (!recordedHkGradePackageBrowserEvidenceIsStale) {
    // Evidence is current: every package must actually have passed for that to
    // mean anything.
    for (const run of recordedHkGradePackageBrowserEvidence) {
      assert.equal(run.status, "passed", `${run.packageId}: current evidence must be passing evidence`);
    }
    return;
  }

  // Evidence is stale. That is allowed — re-running needs a Playwright
  // environment — but it must be visible as stale from the data alone.
  assert.ok(
    recordedHkGradePackageBrowserEvidenceCapturedOn < hongKongVisualizationSurfaceRevision,
    "stale evidence must be older than the surface revision"
  );
});

test("the surface revision is not older than the recorded capture date", () => {
  // A revision date behind the capture date would let a future edit to HK labs
  // pass unnoticed, which is the failure this constant exists to prevent.
  assert.ok(
    hongKongVisualizationSurfaceRevision >= recordedHkGradePackageBrowserEvidenceCapturedOn,
    "the surface revision must move forward, never behind the evidence"
  );
});

test("the evidence still covers every Hong Kong lab it claims to", () => {
  const hongKongLabCount = visualizationLabCatalog.filter((lab) => lab.curriculumTrack === "HK").length;
  const hongKongTopicCount = topics.filter((topic) => topic.curriculumTrack === "HK").length;

  assert.equal(hongKongLabCount, hongKongTopicCount, "every HK topic must have exactly one HK lab");
  assert.equal(
    recordedHkGradePackageBrowserEvidence.length,
    12,
    "the recorded run covers twelve grade packages, P1-P6 and S1-S6"
  );
});
