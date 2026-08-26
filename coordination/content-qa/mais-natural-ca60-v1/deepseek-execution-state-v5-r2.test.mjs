import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./deepseek-execution-state-v5-r2.mjs").catch(() => ({}));
}

const ITEM_HASH = "a".repeat(64);
const ITEM = "ca60-00000000000000000000000000000001";

function attempt(role, attemptStatus = "SUCCEEDED", attemptId = `${role}-attempt-1`, overrides = {}) {
  return { role, attemptStatus, attemptId, itemHash: ITEM_HASH, itemIdPseudonym: ITEM, ...overrides };
}

test("DeepSeek V5 resume skips successful roles and schedules only the earliest dependency-ready missing role", async () => {
  const api = await subject();
  assert.equal(typeof api.planDeepSeekItemResumeV5R2, "function");
  const afterCritique = api.planDeepSeekItemResumeV5R2({
    itemHash: ITEM_HASH,
    itemIdPseudonym: ITEM,
    c0Required: true,
    attempts: [attempt("B_PRIME_CRITIQUE")],
  });
  assert.equal(afterCritique.valid, true);
  assert.equal(afterCritique.nextRole, "B_PRIME_REVISION");
  assert.deepEqual(afterCritique.completedRoles, ["B_PRIME_CRITIQUE"]);
  assert.deepEqual(afterCritique.deferredRoles, [
    "C0_PRIME_ROLE_1", "C0_PRIME_ROLE_2", "C0_PRIME_ROLE_3", "C0_PRIME_ROLE_4", "C0_PRIME_ROLE_5",
  ]);

  const afterRevision = api.planDeepSeekItemResumeV5R2({
    itemHash: ITEM_HASH,
    itemIdPseudonym: ITEM,
    c0Required: true,
    attempts: [attempt("B_PRIME_CRITIQUE"), attempt("B_PRIME_REVISION")],
  });
  assert.equal(afterRevision.nextRole, "C0_PRIME_ROLE_1");
});

test("DeepSeek V5 resume completes two base roles without C0 and never schedules a sixth C0 role", async () => {
  const api = await subject();
  const result = api.planDeepSeekItemResumeV5R2({
    itemHash: ITEM_HASH,
    itemIdPseudonym: ITEM,
    c0Required: false,
    attempts: [attempt("B_PRIME_CRITIQUE"), attempt("B_PRIME_REVISION")],
  });
  assert.equal(result.valid, true);
  assert.equal(result.complete, true);
  assert.equal(result.nextRole, null);
  assert.deepEqual(result.requiredRoles, ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"]);
});

test("DeepSeek V5 resume fails closed on two failed attempts, duplicate success, extra role, or cross-item receipt", async () => {
  const api = await subject();
  for (const attempts of [
    [attempt("B_PRIME_CRITIQUE", "HTTP_500", "a-1"), attempt("B_PRIME_CRITIQUE", "TIMEOUT", "a-2")],
    [attempt("B_PRIME_CRITIQUE", "SUCCEEDED", "a-1"), attempt("B_PRIME_CRITIQUE", "SUCCEEDED", "a-2")],
    [attempt("C0_PRIME_ROLE_6")],
    [attempt("B_PRIME_CRITIQUE", "SUCCEEDED", "a-1", { itemHash: "b".repeat(64) })],
  ]) {
    const result = api.planDeepSeekItemResumeV5R2({
      itemHash: ITEM_HASH,
      itemIdPseudonym: ITEM,
      c0Required: true,
      attempts,
    });
    assert.equal(result.valid, false);
    assert.equal(result.nextRole, null);
    assert.equal(result.errors.length > 0, true);
  }
});
