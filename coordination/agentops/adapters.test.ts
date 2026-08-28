import assert from "node:assert/strict";
import test from "node:test";

test("content pilot preserves the A21 to machine-QA to A18 to A23 evidence chain", async () => {
  const { PILOT_ADAPTERS } = await import("./adapters");
  const chain = [
    PILOT_ADAPTERS["content-candidate"],
    PILOT_ADAPTERS["question-machine-qa"],
    PILOT_ADAPTERS["curriculum-content-review"],
    PILOT_ADAPTERS["candidate-promotion"],
  ];

  assert.deepEqual(
    chain.map(({ primaryLane }) => primaryLane),
    ["A21", "A18", "A18", "A23"],
  );
  assert.deepEqual(
    chain.map(({ evidenceClass }) => evidenceClass),
    ["candidate", "machine-qa-packet", "independent-content-review", "promotion-plan"],
  );
  assert.equal(chain[0].claimCeiling, "immutable-candidate-only");
  assert.equal(chain[1].claimCeiling, "machine-qa-packet-only");
  assert.equal(chain[2].claimCeiling, "approved-for-integration-review");
  assert.equal(chain[3].claimCeiling, "promotion-plan-only");
  assert.equal(chain.every(({ automaticNextStage }) => automaticNextStage === false), true);
  assert.equal(chain[1].availability, "currentness-blocked");
});

test("Nova and adaptive pilots audit existing contracts without entering runtime", async () => {
  const { PILOT_ADAPTERS } = await import("./adapters");
  const nova = PILOT_ADAPTERS["nova-prompt-audit"];
  const adaptive = PILOT_ADAPTERS["adaptive-prompt-audit"];

  assert.equal(nova.primaryLane, "A07");
  assert.deepEqual(nova.preservedInvariants, [
    "no runtime route modification",
    "no provider invocation",
    "strict output and fallback contract remain owner-controlled",
  ]);
  assert.equal(adaptive.primaryLane, "A15");
  assert.deepEqual(adaptive.preservedInvariants, [
    "deterministic BKT floor",
    "candidate-only rerank",
    "validator and deterministic fallback",
    "no answer access",
  ]);
});

test("ordinary and release pilots expose only inspect, validate, and handoff operations", async () => {
  const { PILOT_ADAPTERS } = await import("./adapters");
  for (const adapter of Object.values(PILOT_ADAPTERS)) {
    assert.deepEqual(adapter.allowedOperations, ["inspect", "validate", "handoff"]);
    assert.deepEqual(adapter.permittedEffects, [
      "repository-read",
      "deterministic-validation",
    ]);
    assert.equal(adapter.automaticNextStage, false);
  }
  assert.equal(
    PILOT_ADAPTERS["release-graphops-handoff"].claimCeiling,
    "graphops-handoff-only",
  );
  assert.equal(
    PILOT_ADAPTERS["release-graphops-handoff"].invokesGraphOps,
    false,
  );
});
