import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  aggregateChinaVisualizationStateChunkReceipts,
  buildChinaVisualizationStateChunkPlan,
  CHINA_VISUALIZATION_STATE_CHUNK_POLICY,
  chinaVisualizationStateChunkTimeoutMs,
  createChinaVisualizationStateChunkReceipt,
  validateChinaVisualizationStateChunkPlan,
  validateChinaVisualizationStateChunkReceipts,
} from "./china-visualization-state-chunks.mjs";

const sha = (value) => createHash("sha256").update(String(value)).digest("hex");
const stateId = (labId, state) => JSON.stringify([labId, state]);

function labStates(labId, count) {
  assert.equal(count >= 2, true);
  return [
    stateId(labId, "default"),
    ...Array.from({ length: count - 2 }, (_, index) =>
      stateId(labId, `state:${index + 1}`),
    ),
    stateId(labId, "reset"),
  ];
}

function fullPlan(stateIds = labStates("lab-a", 95)) {
  return buildChinaVisualizationStateChunkPlan({
    auditIds: ["collision", "contrast", "interaction", "math-state"],
    buildId: "build-sha-3f8f12c4",
    cell: {
      id: "zh-Hans:dark:390x844:mobile-chrome",
      language: "zh-Hans",
      project: "mobile-chrome",
      theme: "dark",
      viewport: "390x844",
    },
    runId: "china-viz-run-20260810",
    scope: {
      catalogLabCount: new Set(stateIds.map((id) => JSON.parse(id)[0])).size,
      catalogStateCount: stateIds.length,
      filters: [],
      selection: "full",
      shardIndex: 0,
      shardTotal: 1,
    },
    stateIds,
  });
}

function receiptFor(plan, chunkIndex) {
  const chunk = plan.chunks[chunkIndex];
  const requestedByStateId = {};
  const observedBeforeByStateId = {};
  const observedAfterByStateId = {};
  const auditEvidenceByStateId = {};
  const resetEvidenceByStateId = {};
  for (const id of chunk.stateIds) {
    const signature = sha(`signature:${id}`);
    requestedByStateId[id] = signature;
    observedBeforeByStateId[id] = signature;
    observedAfterByStateId[id] = signature;
    auditEvidenceByStateId[id] = Object.fromEntries(
      plan.auditIds.map((auditId) => [auditId, sha(`audit:${auditId}:${id}`)]),
    );
    if (JSON.parse(id)[1] === "reset")
      resetEvidenceByStateId[id] = sha(`reset:${id}`);
  }
  return createChinaVisualizationStateChunkReceipt({
    auditEvidenceByStateId,
    chunkIndex,
    mountEvidenceByLabId: Object.fromEntries(
      chunk.labIds.map((labId) => [labId, sha(`mount:${chunkIndex}:${labId}`)]),
    ),
    observedAfterByStateId,
    observedBeforeByStateId,
    pageInstanceId: `fresh-page-${chunkIndex}`,
    plan,
    requestedByStateId,
    resetEvidenceByStateId,
  });
}

function receiptsFor(plan) {
  return plan.chunks.map((_, index) => receiptFor(plan, index));
}

test("95 states deterministically become contiguous fresh-page chunks of 32, 32, and 31", () => {
  const plan = fullPlan();
  assert.equal(plan.schemaVersion, 2);
  assert.equal(plan.policy.id, "china-visualization-state-chunks-v2");
  assert.equal(plan.chunkCount, 3);
  assert.deepEqual(
    plan.chunks.map(({ stateCount }) => stateCount),
    [32, 32, 31],
  );
  assert.deepEqual(
    plan.chunks.map(({ stateOffset }) => stateOffset),
    [0, 32, 64],
  );
  assert.deepEqual(
    plan.chunks.map(({ stateEndExclusive }) => stateEndExclusive),
    [32, 64, 95],
  );
  assert.equal(
    plan.chunks.every(({ requiresFreshPage }) => requiresFreshPage),
    true,
  );
  assert.equal(
    plan.chunks.every(
      ({ requiresIndependentMount }) => requiresIndependentMount,
    ),
    true,
  );
  assert.equal(
    plan.chunks.every(
      ({ stateCount }) =>
        stateCount <= CHINA_VISUALIZATION_STATE_CHUNK_POLICY.maxStatesPerChunk,
    ),
    true,
  );
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.chunks), true);
  assert.equal(Object.isFrozen(plan.chunks[0]), true);
  assert.deepEqual(validateChinaVisualizationStateChunkPlan(plan), []);
});

test("chunk timeout is recomputed from the exact state count and rejects oversized chunks", () => {
  const one = chinaVisualizationStateChunkTimeoutMs(1);
  const thirtyOne = chinaVisualizationStateChunkTimeoutMs(31);
  const thirtyTwo = chinaVisualizationStateChunkTimeoutMs(32);
  assert.equal(thirtyOne > one, true);
  assert.equal(thirtyTwo > thirtyOne, true);
  assert.throws(() => chinaVisualizationStateChunkTimeoutMs(0), /1 to 32/u);
  assert.throws(() => chinaVisualizationStateChunkTimeoutMs(33), /1 to 32/u);
});

test("plan construction requires contiguous Lab ranges with default first and exactly one terminal reset", () => {
  assert.throws(
    () =>
      fullPlan([
        stateId("lab-a", "default"),
        stateId("lab-b", "default"),
        stateId("lab-a", "reset"),
        stateId("lab-b", "reset"),
      ]),
    /re-open lab/u,
  );
  assert.throws(
    () => fullPlan([stateId("lab-a", "default"), stateId("lab-a", "middle")]),
    /must end/u,
  );
  assert.throws(
    () => fullPlan([stateId("lab-a", "middle"), stateId("lab-a", "reset")]),
    /must start/u,
  );
  assert.throws(
    () =>
      fullPlan([
        stateId("lab-a", "default"),
        stateId("lab-a", "reset"),
        stateId("lab-a", "after"),
      ]),
    /after its terminal reset/u,
  );
  assert.throws(
    () =>
      fullPlan([
        stateId("lab-a", "default"),
        stateId("lab-a", "reset"),
        stateId("lab-a", "reset"),
      ]),
    /duplicates/u,
  );
});

test("complete exact receipts aggregate all states, audits, unique pages, mounts, and reset evidence", () => {
  const stateIds = [...labStates("lab-a", 40), ...labStates("lab-b", 30)];
  const plan = fullPlan(stateIds);
  const receipts = receiptsFor(plan);
  assert.deepEqual(
    validateChinaVisualizationStateChunkReceipts({ plan, receipts }),
    [],
  );
  assert.deepEqual(
    aggregateChinaVisualizationStateChunkReceipts({ plan, receipts }),
    {
      auditPlanSha256: plan.auditPlanSha256,
      buildSha256: plan.buildSha256,
      cellSha256: plan.cellSha256,
      chunkCount: 3,
      executedStateCount: 70,
      pageInstanceCount: 3,
      resetReceiptCount: 2,
      runPlanSha256: plan.runPlanSha256,
      runSha256: plan.runSha256,
      schemaVersion: 2,
      statePlanSha256: plan.statePlanSha256,
      status: "complete",
    },
  );
});

test("partial, interrupted, unexecuted, and missing state receipts remain hard red", () => {
  const plan = fullPlan();
  const receipts = receiptsFor(plan).map((receipt) => structuredClone(receipt));
  const missingChunk = validateChinaVisualizationStateChunkReceipts({
    plan,
    receipts: receipts.slice(0, -1),
  });
  assert.equal(
    missingChunk.some((error) => /partial|missing/u.test(error)),
    true,
  );

  receipts[1].terminalStatus = "interrupted";
  receipts[1].stateReceipts.pop();
  const errors = validateChinaVisualizationStateChunkReceipts({
    plan,
    receipts,
  });
  assert.equal(
    errors.some((error) => /interrupted/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /partial/u.test(error)),
    true,
  );
  assert.throws(
    () => aggregateChinaVisualizationStateChunkReceipts({ plan, receipts }),
    /rejected/u,
  );

  const unexecuted = receiptsFor(plan).map((receipt) =>
    structuredClone(receipt),
  );
  unexecuted[1].stateReceipts[0].executionStatus = "not-run";
  assert.equal(
    validateChinaVisualizationStateChunkReceipts({
      plan,
      receipts: unexecuted,
    }).some((error) => /was not executed/u.test(error)),
    true,
  );
});

test("gaps, overlaps, duplicates, and out-of-order chunk or state identities fail closed", () => {
  const plan = fullPlan();
  const reorderedChunks = receiptsFor(plan).map((receipt) =>
    structuredClone(receipt),
  );
  [reorderedChunks[0], reorderedChunks[1]] = [
    reorderedChunks[1],
    reorderedChunks[0],
  ];
  assert.equal(
    validateChinaVisualizationStateChunkReceipts({
      plan,
      receipts: reorderedChunks,
    }).some((error) => /wrong plan|gap|order|identity/u.test(error)),
    true,
  );

  const duplicateState = receiptsFor(plan).map((receipt) =>
    structuredClone(receipt),
  );
  duplicateState[0].stateReceipts[1] = structuredClone(
    duplicateState[0].stateReceipts[0],
  );
  const errors = validateChinaVisualizationStateChunkReceipts({
    plan,
    receipts: duplicateState,
  });
  assert.equal(
    errors.some((error) => /gap|overlap|duplicate|out-of-order/u.test(error)),
    true,
  );
});

test("plan, audit, cell, build, run, and state hashes are all bound into every receipt", () => {
  const plan = fullPlan();
  const fields = [
    "auditPlanSha256",
    "buildSha256",
    "cellSha256",
    "chunkPlanSha256",
    "runPlanSha256",
    "runSha256",
    "statePlanSha256",
  ];
  for (const field of fields) {
    const receipts = receiptsFor(plan).map((receipt) =>
      structuredClone(receipt),
    );
    receipts[0][field] = sha(`wrong:${field}`);
    assert.equal(
      validateChinaVisualizationStateChunkReceipts({ plan, receipts }).some(
        (error) => /wrong plan|hashes/u.test(error),
      ),
      true,
      field,
    );
  }

  const driftedPlan = structuredClone(plan);
  driftedPlan.runId = "different-run";
  assert.equal(
    validateChinaVisualizationStateChunkPlan(driftedPlan).length > 0,
    true,
  );
});

test("reused pages, missing mounts, failed audits, and timeout expansion cannot masquerade as completion", () => {
  const plan = fullPlan();
  const receipts = receiptsFor(plan).map((receipt) => structuredClone(receipt));
  receipts[1].pageInstanceId = receipts[0].pageInstanceId;
  receipts[1].mountReceipts[0].pageInstanceId = receipts[0].pageInstanceId;
  receipts[0].mountReceipts = [];
  receipts[0].stateReceipts[0].auditReceipts[1].status = "failed";
  receipts[2].timeoutMs += 1;
  const errors = validateChinaVisualizationStateChunkReceipts({
    plan,
    receipts,
  });
  assert.equal(
    errors.some((error) => /unique fresh page/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /mount/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /audit/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /timeout drift/u.test(error)),
    true,
  );
});

test("requested, before-scan, and after-scan signatures must match before a state can issue a receipt", () => {
  const plan = fullPlan(labStates("lab-a", 3));
  const chunk = plan.chunks[0];
  const id = chunk.stateIds[0];
  const signature = sha(`signature:${id}`);
  assert.throws(
    () =>
      createChinaVisualizationStateChunkReceipt({
        auditEvidenceByStateId: Object.fromEntries(
          chunk.stateIds.map((state) => [
            state,
            Object.fromEntries(
              plan.auditIds.map((auditId) => [
                auditId,
                sha(`${auditId}:${state}`),
              ]),
            ),
          ]),
        ),
        chunkIndex: 0,
        mountEvidenceByLabId: { "lab-a": sha("mount") },
        observedAfterByStateId: Object.fromEntries(
          chunk.stateIds.map((state) => [state, sha(`signature:${state}`)]),
        ),
        observedBeforeByStateId: {
          ...Object.fromEntries(
            chunk.stateIds.map((state) => [state, sha(`signature:${state}`)]),
          ),
          [id]: sha("wrong-before-scan-signature"),
        },
        pageInstanceId: "fresh-page-0",
        plan,
        requestedByStateId: {
          ...Object.fromEntries(
            chunk.stateIds.map((state) => [state, sha(`signature:${state}`)]),
          ),
          [id]: signature,
        },
        resetEvidenceByStateId: { [chunk.stateIds.at(-1)]: sha("reset") },
      }),
    /did not retain/u,
  );
});

test("every reset needs explicit evidence and non-reset states cannot carry reset receipts", () => {
  const plan = fullPlan(labStates("lab-a", 4));
  const receipts = receiptsFor(plan).map((receipt) => structuredClone(receipt));
  receipts[0].stateReceipts.at(-1).resetReceipt = null;
  receipts[0].stateReceipts[0].resetReceipt = {
    evidenceSha256: sha("fake-reset"),
    stateId: receipts[0].stateReceipts[0].stateId,
    status: "passed",
  };
  const errors = validateChinaVisualizationStateChunkReceipts({
    plan,
    receipts,
  });
  assert.equal(
    errors.some((error) => /terminal reset/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /not reset/u.test(error)),
    true,
  );
  assert.equal(
    errors.some((error) => /reset receipts/u.test(error)),
    true,
  );
});

test("filtered and sharded plans may produce scoped evidence but can never claim full release", () => {
  const stateIds = labStates("lab-a", 4);
  const plan = buildChinaVisualizationStateChunkPlan({
    auditIds: ["collision"],
    buildId: "build",
    cell: { id: "partial-cell" },
    runId: "run",
    scope: {
      catalogLabCount: 335,
      catalogStateCount: 20_000,
      filters: ["CHINA_VIZ_LABS=lab-a"],
      selection: "partial",
      shardIndex: 2,
      shardTotal: 8,
    },
    stateIds,
  });
  const receipts = receiptsFor(plan);
  assert.equal(plan.releaseAcceptance, false);
  assert.deepEqual(
    validateChinaVisualizationStateChunkReceipts({
      plan,
      receipts,
      requireReleaseAcceptance: false,
    }),
    [],
  );
  assert.equal(
    validateChinaVisualizationStateChunkReceipts({ plan, receipts }).some(
      (error) => /cannot satisfy full release/u.test(error),
    ),
    true,
  );
  assert.throws(
    () =>
      buildChinaVisualizationStateChunkPlan({
        auditIds: ["collision"],
        buildId: "build",
        cell: { id: "dishonest-full" },
        runId: "run",
        scope: {
          catalogLabCount: 335,
          catalogStateCount: 20_000,
          filters: ["CHINA_VIZ_LABS=lab-a"],
          selection: "full",
          shardIndex: 0,
          shardTotal: 1,
        },
        stateIds,
      }),
    /full scope/u,
  );
});
