import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./runner-state.mjs");
}

const hash = (character) => character.repeat(64);

function manifest() {
  return {
    schemaVersion: "SampleManifestV2",
    designId: "MAIS-NATURAL-CA60-V4",
    registrationHash: hash("1"),
    frameRegistrationHash: hash("2"),
    sampleManifestHash: hash("3"),
    selectedRows: Array.from({ length: 60 }, (_, index) => ({
      itemId: `item-${String(index + 1).padStart(3, "0")}`,
      itemHash: hash(((index + 4) % 10).toString()),
      clusterId: `cluster-${String(index + 1).padStart(3, "0")}`,
      itemIdPseudonym: `ca60-${String(index + 1).padStart(32, "0")}`,
    })),
  };
}

function attempt(role, status = "SUCCESS", attemptNumber = 1) {
  return {
    role,
    attemptStatus: status,
    attemptId: `${role}-${attemptNumber}`,
  };
}

test("the registered canary is exactly manifest row one and remains part of the formal 60", async () => {
  const api = await subject();
  const sample = manifest();
  sample.selectedRows[0].itemId = "z-not-resorted";
  sample.selectedRows[1].itemId = "a-would-sort-first";
  const canary = api.selectRegisteredCanaryV1(sample);
  assert.equal(canary.itemId, "z-not-resorted");
  assert.equal(canary.manifestOrdinal, 1);
  assert.equal(canary.formalSampleMember, true);
  assert.equal(canary.sampleSize, 60);
});

test("DeepSeek role order is frozen at two base roles plus exactly five conditional C0 roles", async () => {
  const api = await subject();
  assert.deepEqual(api.deepSeekRoleOrderV1({ c0Required: false }), [
    "B_PRIME_CRITIQUE",
    "B_PRIME_REVISION",
  ]);
  assert.deepEqual(api.deepSeekRoleOrderV1({ c0Required: true }), [
    "B_PRIME_CRITIQUE",
    "B_PRIME_REVISION",
    "C0_PRIME_ROLE_1",
    "C0_PRIME_ROLE_2",
    "C0_PRIME_ROLE_3",
    "C0_PRIME_ROLE_4",
    "C0_PRIME_ROLE_5",
  ]);
  assert.equal(api.deepSeekRoleOrderV1({ c0Required: true }).filter((role) => role.startsWith("C0_")).length, 5);
});

test("resume schedules only unfinished roles and never retries a successful role", async () => {
  const api = await subject();
  const roles = api.deepSeekRoleOrderV1({ c0Required: true });
  const plan = api.planItemResumeV1({
    requiredRoles: roles,
    attempts: [
      attempt("B_PRIME_CRITIQUE"),
      attempt("B_PRIME_REVISION", "TIMEOUT"),
      attempt("C0_PRIME_ROLE_1"),
    ],
  });
  assert.deepEqual(plan.completedRoles, ["B_PRIME_CRITIQUE", "C0_PRIME_ROLE_1"]);
  assert.deepEqual(plan.pendingRoles, [
    "B_PRIME_REVISION",
    "C0_PRIME_ROLE_2",
    "C0_PRIME_ROLE_3",
    "C0_PRIME_ROLE_4",
    "C0_PRIME_ROLE_5",
  ]);
  assert.deepEqual(plan.blockedRoles, []);
  assert.equal(plan.complete, false);
});

test("two attempts per role is a hard cap and a pre-dispatch cap block cannot be resumed", async () => {
  const api = await subject();
  const retryCap = api.planItemResumeV1({
    requiredRoles: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    attempts: [
      attempt("B_PRIME_CRITIQUE", "TIMEOUT", 1),
      attempt("B_PRIME_CRITIQUE", "HTTP_500", 2),
    ],
  });
  assert.deepEqual(retryCap.blockedRoles, ["B_PRIME_CRITIQUE"]);
  assert.deepEqual(retryCap.pendingRoles, ["B_PRIME_REVISION"]);
  assert.match(retryCap.errors.join("\n"), /attempt cap/iu);

  const permanent = api.planItemResumeV1({
    requiredRoles: ["B_PRIME_CRITIQUE", "B_PRIME_REVISION"],
    attempts: [attempt("B_PRIME_CRITIQUE", "CAP_BLOCKED_BEFORE_REQUEST")],
  });
  assert.deepEqual(permanent.blockedRoles, ["B_PRIME_CRITIQUE"]);
  assert.match(permanent.errors.join("\n"), /cap|blocked/iu);
});

test("extra roles, duplicate success, and a sixth C0 role fail closed", async () => {
  const api = await subject();
  for (const attempts of [
    [attempt("ADJUDICATOR")],
    [attempt("B_PRIME_CRITIQUE"), attempt("B_PRIME_CRITIQUE", "SUCCESS", 2)],
    [attempt("C0_PRIME_ROLE_6")],
  ]) {
    const plan = api.planItemResumeV1({
      requiredRoles: api.deepSeekRoleOrderV1({ c0Required: true }),
      attempts,
    });
    assert.equal(plan.valid, false);
    assert.notEqual(plan.errors.length, 0);
  }
});

test("any frozen execution leaf drift invalidates generalization before resume", async () => {
  const api = await subject();
  const frozen = {
    registrationHash: hash("1"),
    frameRegistrationHash: hash("2"),
    sampleManifestHash: hash("3"),
    referenceSealHash: hash("4"),
    executionRegistrationHash: hash("5"),
    promptSetHash: hash("6"),
    schemaSetHash: hash("7"),
    runnerHash: hash("8"),
    adapterHash: hash("9"),
    provider: "DEEPSEEK_DIRECT",
    model: "deepseek-v4-pro",
    endpoint: "https://api.deepseek.com/chat/completions",
  };
  assert.deepEqual(api.validateExecutionLeafBindingsV1({ frozen, observed: structuredClone(frozen) }), {
    valid: true,
    decisionStatus: null,
    driftFields: [],
    errors: [],
  });
  const observed = { ...frozen, promptSetHash: hash("a"), model: "fallback-model" };
  const drift = api.validateExecutionLeafBindingsV1({ frozen, observed });
  assert.equal(drift.valid, false);
  assert.equal(drift.decisionStatus, "INVALID_FOR_GENERALIZATION");
  assert.deepEqual(drift.driftFields, ["promptSetHash", "model"]);
});
