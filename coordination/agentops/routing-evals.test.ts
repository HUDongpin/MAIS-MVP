import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { routeAgentTask } from "./routing";
import { parseAgentOpsRequest, type AgentOpsRequestV1 } from "./contracts";
import { discoveryFixture, requestFixture } from "./test-fixtures";

test("100 routing queries cover every A01-A25 lane and remain deterministic for two rounds", async () => {
  const { ROUTING_EVAL_CASES } = await import("./evals/routing-cases.v1");
  assert.equal(ROUTING_EVAL_CASES.length, 100);

  for (let index = 1; index <= 25; index += 1) {
    const laneId = `A${String(index).padStart(2, "0")}`;
    const laneCases = ROUTING_EVAL_CASES.filter(
      ({ laneUnderTest }) => laneUnderTest === laneId,
    );
    assert.deepEqual(
      laneCases.map(({ caseKind }) => caseKind).sort(),
      ["conflict", "near-neighbor", "positive-language", "positive-path"],
      laneId,
    );
  }

  for (const evalCase of ROUTING_EVAL_CASES) {
    const request = requestFixture({
      requestId: evalCase.id,
      intentSummary: evalCase.query,
      explicitGoal: evalCase.query,
      taskType: evalCase.taskType,
      scope: { included: [evalCase.includedScope], excluded: [] },
    });
    const discovery = discoveryFixture({
      worktrees: evalCase.conflictingPath
        ? [
            {
              rootDigest: "9".repeat(64),
              headSha: "8".repeat(40),
              branch: `codex/${evalCase.id}`,
              dirty: true,
              changedPaths: [evalCase.conflictingPath],
            },
          ]
        : [],
    });
    const first = routeAgentTask(request, discovery);
    const second = routeAgentTask(request, discovery);
    assert.deepEqual(second, first, `${evalCase.id} drifted between rounds`);
    assert.equal(first.status, evalCase.expectedStatus, evalCase.id);
    assert.equal(first.primaryLane, evalCase.expectedPrimaryLane, evalCase.id);
    if (evalCase.caseKind === "near-neighbor") {
      assert.notEqual(first.primaryLane, evalCase.laneUnderTest, evalCase.id);
    }
  }
});

test("clean-context skill evals exercise two independent intents without preloaded answers", async () => {
  const evalPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "evals",
    "skill-clean-context.v1.json",
  );
  const fixture = JSON.parse(await readFile(evalPath, "utf8")) as {
    schemaVersion: string;
    cases: Array<{
      id: string;
      prompt: string;
      expectedBoundary: string;
      forbiddenClaims: string[];
      hostEvalRound: 1 | 2;
      expectedPrimaryLane: string;
      compiledRequest: AgentOpsRequestV1;
    }>;
  };

  assert.equal(fixture.schemaVersion, "mais-agentops-skill-clean-context-eval.v1");
  assert.equal(fixture.cases.length, 2);
  assert.deepEqual(
    fixture.cases.map(({ hostEvalRound }) => hostEvalRound),
    [1, 2],
  );
  assert.notEqual(fixture.cases[0].prompt, fixture.cases[1].prompt);
  for (const evalCase of fixture.cases) {
    assert.ok(evalCase.prompt.length > 20);
    assert.match(evalCase.expectedBoundary, /handoff|clarification|authorization/i);
    assert.deepEqual(evalCase.forbiddenClaims, [
      "implemented",
      "approved-for-production",
      "deployed",
      "live",
    ]);
    const compiledRequest = parseAgentOpsRequest(evalCase.compiledRequest);
    const route = routeAgentTask(compiledRequest, discoveryFixture());
    assert.equal(route.primaryLane, evalCase.expectedPrimaryLane, evalCase.id);
    assert.ok(
      compiledRequest.requestedEffects.some(
        (effect) =>
          effect !== "repository-read" &&
          effect !== "deterministic-validation",
      ),
      `${evalCase.id} must honestly preserve its denied requested effect`,
    );
    const sequence = route.orderedSubcontracts.map(
      ({ order, primaryLane, specialistWorkflow, claimCeiling }) => ({
        order,
        primaryLane,
        specialistWorkflow,
        claimCeiling,
      }),
    );
    if (evalCase.id === "clean-context-parent-console") {
      assert.deepEqual(sequence, [
        {
          order: 1,
          primaryLane: "A14",
          specialistWorkflow: "owner-lane-handoff.v1",
          claimCeiling: "handoff-ready",
        },
        {
          order: 2,
          primaryLane: "A12",
          specialistWorkflow: "owner-lane-handoff.v1",
          claimCeiling: "handoff-ready",
        },
        {
          order: 3,
          primaryLane: "A11",
          specialistWorkflow: "regression-plan.v1",
          claimCeiling: "regression-plan-only",
        },
      ]);
    } else {
      assert.deepEqual(sequence, [
        {
          order: 1,
          primaryLane: "A21",
          specialistWorkflow: "content-candidate-generation.v1",
          claimCeiling: "immutable-candidate-only",
        },
        {
          order: 2,
          primaryLane: "A18",
          specialistWorkflow: "question-machine-qa.v1",
          claimCeiling: "machine-qa-packet-only",
        },
        {
          order: 3,
          primaryLane: "A18",
          specialistWorkflow: "curriculum-content-review.v1",
          claimCeiling: "approved-for-integration-review",
        },
        {
          order: 4,
          primaryLane: "A23",
          specialistWorkflow: "candidate-promotion.v1",
          claimCeiling: "promotion-plan-only",
        },
        {
          order: 5,
          primaryLane: "A11",
          specialistWorkflow: "regression-plan.v1",
          claimCeiling: "regression-plan-only",
        },
        {
          order: 6,
          primaryLane: "A22",
          specialistWorkflow: "release-graphops-handoff.v1",
          claimCeiling: "graphops-handoff-only",
        },
      ]);
    }
  }
});
