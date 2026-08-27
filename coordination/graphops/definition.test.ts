import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPHOPS_GRAPH_DEFINITION,
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  GRAPHOPS_RUNNER_IDS,
  getGraphSpecDigest,
  validateGraphDefinition,
} from "./index";

test("publishes one fixed, inert mais.release.v1 topology with a deterministic digest", () => {
  assert.equal(GRAPHOPS_GRAPH_ID, "mais.release.v1");
  assert.equal(GRAPHOPS_GRAPH_VERSION, "1.0.0");
  assert.deepEqual(
    GRAPHOPS_GRAPH_DEFINITION.nodes.filter((node) => node !== "control.await-production-approval"),
    GRAPHOPS_RUNNER_IDS,
  );
  assert.equal(
    GRAPHOPS_GRAPH_DEFINITION.nodes.filter(
      (node) => node === "control.await-production-approval",
    ).length,
    1,
  );
  assert.deepEqual(GRAPHOPS_GRAPH_DEFINITION.capabilities, {
    previewAllowed: false,
    productionAllowed: false,
  });
  assert.match(getGraphSpecDigest(), /^[0-9a-f]{64}$/);
  assert.equal(
    validateGraphDefinition(GRAPHOPS_GRAPH_DEFINITION).graphSpecDigest,
    getGraphSpecDigest(),
  );
});

test("routes Preview verification through the unique approval interrupt control node", () => {
  assert.ok(
    GRAPHOPS_GRAPH_DEFINITION.edges.some(
      (edge) =>
        edge.from === "smoke.preview-readonly" &&
        edge.to === "control.await-production-approval" &&
        edge.on === "PASS",
    ),
  );
  assert.ok(
    GRAPHOPS_GRAPH_DEFINITION.edges.some(
      (edge) =>
        edge.from === "control.await-production-approval" &&
        edge.to === "github.verify-production-approval" &&
        edge.on === "RESUME_APPROVED",
    ),
  );
  assert.equal(
    GRAPHOPS_GRAPH_DEFINITION.edges.some(
      (edge) =>
        edge.from === "smoke.preview-readonly" &&
        edge.to === "github.verify-production-approval",
    ),
    false,
  );
});

test("models rollback only as traffic compensation and terminates after restoration", () => {
  const restoreEdges = GRAPHOPS_GRAPH_DEFINITION.edges.filter(
    (edge) => edge.to === "vercel.restore-previous",
  );

  assert.deepEqual(restoreEdges, [
    {
      from: "vercel.promote",
      to: "vercel.restore-previous",
      on: "ROLLBACK_REQUIRED",
      effectStatuses: ["APPLIED", "UNKNOWN"],
    },
    {
      from: "smoke.production-readonly",
      to: "vercel.restore-previous",
      on: "FAILURE",
    },
  ]);
  assert.equal(
    GRAPHOPS_GRAPH_DEFINITION.edges.some(
      (edge) => edge.from === "vercel.restore-previous",
    ),
    false,
  );
  assert.ok(
    GRAPHOPS_GRAPH_DEFINITION.edges.some(
      (edge) =>
        edge.from === "smoke.production-readonly" &&
        edge.to === "release.closeout" &&
        edge.on === "PASS",
    ),
  );
});

test("rejects graph identity, version, capability, and topology drift", () => {
  for (const drifted of [
    { ...GRAPHOPS_GRAPH_DEFINITION, graphId: "other.release.v1" },
    { ...GRAPHOPS_GRAPH_DEFINITION, version: "1.0.1" },
    {
      ...GRAPHOPS_GRAPH_DEFINITION,
      capabilities: { previewAllowed: true, productionAllowed: false },
    },
    {
      ...GRAPHOPS_GRAPH_DEFINITION,
      edges: GRAPHOPS_GRAPH_DEFINITION.edges.slice(1),
    },
  ]) {
    assert.throws(() => validateGraphDefinition(drifted), /fixed.*graph|drift/i);
  }
});
