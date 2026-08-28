import assert from "node:assert/strict";
import test from "node:test";

function validRequest() {
  return {
    schemaVersion: "mais-agentops-request.v1",
    requestId: "request-parent-console-001",
    intentSummary: "Prepare a safe handoff for completing the parent console.",
    explicitGoal: "Route the parent-console slice with observable acceptance criteria.",
    taskType: "feature",
    operationMode: "handoff",
    audience: "MAIS owner and implementing agent",
    targetRuntime: "codex",
    scope: {
      included: ["app/parent/**", "components/parent/**"],
      excluded: ["app/api/**", "lib/server/**"],
    },
    mustHave: ["one primary owner", "observable success criteria"],
    mustAvoid: ["provider execution", "production mutation"],
    successCriteria: ["handoff names A14 as primary lane"],
    assumptions: ["API work will be handed to A12 separately"],
    unresolvedItems: [],
    contextRefs: [{ kind: "repo-path", value: "app/parent" }],
    requestedEffects: ["repository-read", "code-write"],
  } as const;
}

test("AgentOpsRequestV1 round-trips a closed valid request", async () => {
  const { parseAgentOpsRequest } = await import("./contracts");
  const input = validRequest();
  const parsed = parseAgentOpsRequest(input);

  assert.deepEqual(parsed, input);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.scope));
  assert.ok(Object.isFrozen(parsed.contextRefs));
});

test("AgentOpsRequestV1 rejects unknown fields and schema-version drift", async () => {
  const { parseAgentOpsRequest } = await import("./contracts");
  const base = validRequest();

  assert.throws(
    () => parseAgentOpsRequest({ ...base, shell: "echo unsafe" }),
    /unknown|unsupported|schema/i,
  );
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        scope: { ...base.scope, externalWritePath: "/tmp/escape" },
      }),
    /unknown|unsupported|schema/i,
  );
  assert.throws(
    () => parseAgentOpsRequest({ ...base, schemaVersion: "mais-agentops-request.v2" }),
    /schemaVersion|version/i,
  );
});

test("AgentOpsRequestV1 rejects missing, malformed, duplicate, and unsafe values", async () => {
  const { parseAgentOpsRequest } = await import("./contracts");
  const base = validRequest();

  const { explicitGoal: _missing, ...withoutGoal } = base;
  assert.throws(() => parseAgentOpsRequest(withoutGoal), /missing|schema/i);
  assert.throws(
    () => parseAgentOpsRequest({ ...base, requestId: "not allowed spaces" }),
    /requestId/i,
  );
  assert.throws(
    () => parseAgentOpsRequest({ ...base, taskType: "super-agent" }),
    /taskType/i,
  );
  assert.throws(
    () => parseAgentOpsRequest({ ...base, successCriteria: [] }),
    /successCriteria/i,
  );
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        unresolvedItems: [
          { id: "u1", question: "Which owner?", impact: "urgent" },
        ],
      }),
    /unresolvedItems|impact/i,
  );
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        contextRefs: [{ kind: "repo-path", value: "/etc/passwd" }],
      }),
    /contextRefs|repo-path|relative/i,
  );
  for (const unsafeScope of [
    "/tmp/external/**",
    "../outside/**",
    "app/../outside/**",
    "C:\\external\\**",
    "https://example.invalid/scope",
  ]) {
    assert.throws(
      () =>
        parseAgentOpsRequest({
          ...base,
          scope: { included: [unsafeScope], excluded: [] },
        }),
      /scope|relative|normalized|URL/i,
      unsafeScope,
    );
  }
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        contextRefs: [
          { kind: "repo-path", value: "app/parent", shell: "git status" },
        ],
      }),
    /unknown|schema/i,
  );
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        requestedEffects: ["repository-read", "repository-read"],
      }),
    /requestedEffects|duplicate/i,
  );
  assert.throws(
    () =>
      parseAgentOpsRequest({
        ...base,
        assumptions: [
          "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
        ],
      }),
    /sensitive|forbidden/i,
  );
});
