import assert from "node:assert/strict";
import test from "node:test";

import * as publicApi from "./index";
import {
  createFixtureResumeApproval,
  createFoundationFixtureOnlyHarness,
} from "./testing/foundation-fixture-harness";

test("fixture-only LangGraph interrupts after Preview and leaves production effects unreachable", async () => {
  const harness = createFoundationFixtureOnlyHarness({
    previewAllowed: true,
    productionAllowed: true,
  });
  const interrupted = await harness.start("foundation-fixture-thread-1");

  assert.equal(interrupted.status, "interrupted");
  assert.deepEqual(interrupted.runnerCalls, publicApi.GRAPHOPS_RUNNER_IDS.slice(0, 8));
  assert.equal(interrupted.lifecycle, "AWAITING_PRODUCTION_APPROVAL");
  assert.equal(interrupted.evidenceLevel, "E4");
  assert.equal(interrupted.productionSideEffects, 0);
  assert.doesNotThrow(() =>
    publicApi.verifyApprovalEnvelope(interrupted.approvalEnvelope),
  );

  await assert.rejects(
    () =>
      harness.resume("foundation-fixture-thread-1", {
        ...createFixtureResumeApproval(interrupted.approvalEnvelope),
        approvalDigest: "0".repeat(64),
      }),
    /exact fixture approval envelope/i,
  );
});

test("fixture-only exact resume re-executes a pure interrupt node and completes built-in no-op runners", async () => {
  const harness = createFoundationFixtureOnlyHarness({
    previewAllowed: true,
    productionAllowed: true,
  });
  const interrupted = await harness.start("foundation-fixture-thread-2");
  assert.equal(interrupted.status, "interrupted");

  const completed = await harness.resume(
    "foundation-fixture-thread-2",
    createFixtureResumeApproval(interrupted.approvalEnvelope),
  );

  assert.equal(completed.status, "completed");
  assert.equal(completed.lifecycle, "CLOSED");
  assert.equal(completed.evidenceLevel, "E7");
  assert.deepEqual(completed.runnerCalls, [
    ...publicApi.GRAPHOPS_RUNNER_IDS.slice(0, 15),
    "release.closeout",
  ]);
  assert.equal(completed.productionSideEffects, 3);
  assert.ok(!completed.runnerCalls.includes("vercel.restore-previous"));
});

test("fixture harness defaults fail closed before Preview", async () => {
  const harness = createFoundationFixtureOnlyHarness();
  await assert.rejects(
    () => harness.start("foundation-fixture-default-deny"),
    /fixture previewAllowed=false/i,
  );
});

test("does not export arbitrary runner or fixture resume authority from the public index", () => {
  assert.equal("createGraphOpsTracer" in publicApi, false);
  assert.equal("createFoundationFixtureOnlyHarness" in publicApi, false);
  assert.equal("createFixtureResumeApproval" in publicApi, false);
  assert.equal("createResumeApproval" in publicApi, false);
});
