import assert from "node:assert/strict";
import test from "node:test";

async function subject() {
  return import("./openai-reference-state-v5-r2.mjs").catch(() => ({}));
}

function attempt(role, attemptStatus, ordinal = 1) {
  return { role, attemptStatus, attemptId: `${role}-${ordinal}` };
}

test("partial reference resume skips successful solves and schedules only the earliest dependency-ready role", async () => {
  const api = await subject();
  assert.equal(typeof api.planOpenAIReferenceResumeV5R2, "function");
  const plan = api.planOpenAIReferenceResumeV5R2({
    attempts: [
      attempt("A_SOLVE", "SUCCEEDED"),
      attempt("A_LABEL", "TIMEOUT"),
      attempt("B_SOLVE", "SUCCEEDED"),
    ],
    adjudicationRequired: null,
  });
  assert.equal(plan.valid, true);
  assert.equal(plan.complete, false);
  assert.deepEqual(plan.completedRoles, ["A_SOLVE", "B_SOLVE"]);
  assert.deepEqual(plan.pendingRoles, ["A_LABEL", "B_LABEL"]);
  assert.equal(plan.nextRole, "A_LABEL");
  assert.equal(plan.adjudicationDecisionPending, false);
  assert.deepEqual(plan.blockedRoles, []);
});

test("adjudication becomes decision-pending only after all four base roles succeed", async () => {
  const api = await subject();
  const base = ["A_SOLVE", "A_LABEL", "B_SOLVE", "B_LABEL"].map((role) => attempt(role, "SUCCEEDED"));
  const undecided = api.planOpenAIReferenceResumeV5R2({ attempts: base, adjudicationRequired: null });
  assert.equal(undecided.valid, true);
  assert.equal(undecided.complete, false);
  assert.equal(undecided.nextRole, null);
  assert.equal(undecided.adjudicationDecisionPending, true);

  const required = api.planOpenAIReferenceResumeV5R2({ attempts: base, adjudicationRequired: true });
  assert.equal(required.valid, true);
  assert.equal(required.nextRole, "ADJUDICATOR");
  assert.equal(required.adjudicationDecisionPending, false);
});

test("reference resume fails closed on two failures, duplicate success, extra role, or premature adjudicator", async () => {
  const api = await subject();
  for (const [attempts, adjudicationRequired] of [
    [[attempt("A_SOLVE", "TIMEOUT", 1), attempt("A_SOLVE", "HTTP_500", 2)], null],
    [[attempt("A_SOLVE", "SUCCEEDED", 1), attempt("A_SOLVE", "SUCCEEDED", 2)], null],
    [[attempt("RATER_C", "SUCCEEDED", 1)], null],
    [[attempt("ADJUDICATOR", "SUCCEEDED", 1)], null],
    [[attempt("ADJUDICATOR", "SUCCEEDED", 1)], false],
  ]) {
    const result = api.planOpenAIReferenceResumeV5R2({ attempts, adjudicationRequired });
    assert.equal(result.valid, false);
    assert.equal(result.complete, false);
    assert.equal(result.nextRole, null);
    assert.equal(result.errors.length > 0, true);
  }
});
