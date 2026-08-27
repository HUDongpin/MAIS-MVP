import assert from "node:assert/strict";
import test from "node:test";

import { discoveryFixture, requestFixture } from "./test-fixtures";

test("object and owned paths outrank incidental keywords", async () => {
  const { routeAgentTask } = await import("./routing");
  const request = requestFixture({
    intentSummary: "Finish the parent console before a future release.",
    explicitGoal: "Complete observable parent report behavior.",
    scope: { included: ["app/parent/**"], excluded: [] },
  });
  const decision = routeAgentTask(request, discoveryFixture());

  assert.equal(decision.status, "routed");
  assert.equal(decision.primaryLane, "A14");
  assert.equal(decision.specialistWorkflow, "owner-lane-handoff.v1");
  assert.ok(decision.collaboratingLanes.length <= 3);
});

test("content evidence classes route independently and preserve claim ceilings", async () => {
  const { routeAgentTask } = await import("./routing");
  const cases = [
    ["content-generation", "A21", "content-candidate-generation.v1", "immutable-candidate-only"],
    ["machine-qa", "A18", "question-machine-qa.v1", "machine-qa-packet-only"],
    ["content-qa", "A18", "curriculum-content-review.v1", "approved-for-integration-review"],
  ] as const;

  for (const [taskType, lane, workflow, ceiling] of cases) {
    const decision = routeAgentTask(
      requestFixture({
        taskType,
        scope: { included: ["coordination/content-qa/candidate-001"], excluded: [] },
      }),
      discoveryFixture(),
    );
    assert.equal(decision.primaryLane, lane);
    assert.equal(decision.specialistWorkflow, workflow);
    assert.equal(decision.claimCeiling, ceiling);
  }
});

test("Nova, adaptive, promotion, regression, release, and Git hygiene have exact routes", async () => {
  const { routeAgentTask } = await import("./routing");
  const cases = [
    ["prompt-audit", "app/api/ai-tutor/resolve/route.ts", "A07", "nova-prompt-audit.v1"],
    ["adaptive-audit", "lib/adaptiveLearning.ts", "A15", "adaptive-prompt-audit.v1"],
    ["routing", "coordination/integration/candidate.md", "A23", "candidate-promotion.v1"],
    ["regression", "tests/e2e/student.spec.ts", "A11", "regression-plan.v1"],
    ["release", "coordination/release-intake/package.json", "A22", "release-graphops-handoff.v1"],
    ["git-hygiene", "coordination/release-intake/dirty-map.json", "A25", "git-hygiene-intake.v1"],
  ] as const;

  for (const [taskType, included, lane, workflow] of cases) {
    const decision = routeAgentTask(
      requestFixture({ taskType, scope: { included: [included], excluded: [] } }),
      discoveryFixture(),
    );
    assert.equal(decision.primaryLane, lane);
    assert.equal(decision.specialistWorkflow, workflow);
  }
});

test("release handoffs order A25 hygiene preflight before the A22 GraphOps handoff", async () => {
  const { routeAgentTask } = await import("./routing");
  const decision = routeAgentTask(
    requestFixture({
      taskType: "release",
      intentSummary: "Prepare a clean release and deployment handoff.",
      scope: {
        included: ["coordination/release-intake/**"],
        excluded: [],
      },
      requestedEffects: ["repository-read", "deployment"],
    }),
    discoveryFixture(),
  );

  assert.equal(decision.primaryLane, "A22");
  assert.deepEqual(
    decision.orderedSubcontracts.map(
      ({ order, primaryLane, specialistWorkflow }) => ({
        order,
        primaryLane,
        specialistWorkflow,
      }),
    ),
    [
      {
        order: 1,
        primaryLane: "A25",
        specialistWorkflow: "git-hygiene-intake.v1",
      },
      {
        order: 2,
        primaryLane: "A22",
        specialistWorkflow: "release-graphops-handoff.v1",
      },
    ],
  );
  assert.equal(decision.parallelExecutionAllowed, false);
});

test("multiple independent subsystems become ordered subcontracts, never implicit parallel work", async () => {
  const { routeAgentTask } = await import("./routing");
  const decision = routeAgentTask(
    requestFixture({
      scope: {
        included: ["app/parent/**", "app/teacher/**"],
        excluded: [],
      },
    }),
    discoveryFixture(),
  );

  assert.equal(decision.status, "routed");
  assert.equal(decision.primaryLane, "A14");
  assert.deepEqual(
    decision.orderedSubcontracts.map(({ order, primaryLane }) => ({ order, primaryLane })),
    [
      { order: 1, primaryLane: "A14" },
      { order: 2, primaryLane: "A13" },
    ],
  );
  assert.equal(decision.parallelExecutionAllowed, false);
});

test("vague feature requests require clarification instead of guessing", async () => {
  const { routeAgentTask } = await import("./routing");
  const decision = routeAgentTask(
    requestFixture({
      intentSummary: "Make the experience complete.",
      explicitGoal: "Improve everything.",
      scope: { included: ["unknown-surface/**"], excluded: [] },
    }),
    discoveryFixture(),
  );

  assert.equal(decision.status, "clarification-required");
  assert.equal(decision.primaryLane, null);
  assert.ok(decision.clarificationQuestions.length > 0);
  assert.ok(decision.clarificationQuestions.length <= 3);
});

test("an external dirty writer touching the same scope blocks the route", async () => {
  const { routeAgentTask } = await import("./routing");
  const discovery = discoveryFixture({
    worktrees: [
      {
        rootDigest: "9".repeat(64),
        headSha: "8".repeat(40),
        branch: "codex/other-parent-writer",
        dirty: true,
        changedPaths: ["app/parent/page.tsx"],
      },
    ],
  });
  const decision = routeAgentTask(requestFixture(), discovery);

  assert.equal(decision.status, "blocked");
  assert.equal(decision.blockerCode, "ownership-or-worktree-conflict");
});

test("a task-type override cannot seize a shared file from its exact owner", async () => {
  const { routeAgentTask } = await import("./routing");
  const decision = routeAgentTask(
    requestFixture({
      taskType: "prompt-audit",
      intentSummary: "Audit the Nova prompt and update shared types.",
      scope: { included: ["types/index.ts"], excluded: [] },
      requestedEffects: ["repository-read", "code-write"],
    }),
    discoveryFixture(),
  );

  assert.equal(decision.primaryLane, "A07");
  assert.equal(decision.status, "blocked");
  assert.equal(decision.blockerCode, "ownership-or-worktree-conflict");
  assert.ok(decision.routingReasons.some((reason) => reason.includes("A08")));
});
