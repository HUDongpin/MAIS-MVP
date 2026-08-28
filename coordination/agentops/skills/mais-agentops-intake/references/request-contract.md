# AgentOpsRequestV1 compilation contract

Use the canonical JSON Schema at
`coordination/agentops/schemas/agentops-request-v1.schema.json`. Unknown fields
and unsupported schema versions fail closed.

## Required fields

| Field | Compilation rule |
| --- | --- |
| `schemaVersion` | Always `mais-agentops-request.v1`. |
| `requestId` | A stable safe identifier; do not put personal data in it. |
| `intentSummary` | Concise decoded intent, including only disclosed inference. |
| `explicitGoal` | Preserve the user's explicit desired outcome. |
| `taskType` | Choose the closest schema enum based on the object being decided. |
| `operationMode` | `analyze`, `audit`, `plan`, `route`, or `handoff`; never execution. |
| `audience` | Who will consume the handoff. |
| `targetRuntime` | Intended next runtime, not permission to launch it. |
| `scope.included` | Exact product surfaces or repository-relative path scopes. |
| `scope.excluded` | Explicit non-goals and forbidden path scopes. |
| `mustHave` | Non-negotiable contract properties. |
| `mustAvoid` | Failure modes and forbidden outcomes. |
| `successCriteria` | Observable handoff criteria, not implementation claims. |
| `assumptions` | Host assumptions stated as assumptions. |
| `unresolvedItems` | Stable ID, one question, and `low` or `high` impact. |
| `contextRefs` | Only `repo-path`, `logical-ref`, or lowercase `sha256`. |
| `requestedEffects` | Record every requested effect honestly, including denied effects. |

## Example

```json
{
  "schemaVersion": "mais-agentops-request.v1",
  "requestId": "parent-console-handoff-001",
  "intentSummary": "Prepare an owner-bounded parent-console implementation handoff.",
  "explicitGoal": "Make parent reports complete with observable acceptance criteria.",
  "taskType": "feature",
  "operationMode": "handoff",
  "audience": "MAIS owner and implementing agent",
  "targetRuntime": "codex",
  "scope": {
    "included": ["app/parent/**", "components/parent/**"],
    "excluded": ["app/api/parent/**", "lib/server/**"]
  },
  "mustHave": ["one primary owner", "ordered API dependency handoff"],
  "mustAvoid": ["parallel writes to shared files"],
  "successCriteria": ["handoff names the primary lane and observable checks"],
  "assumptions": ["A12 handles any separate storage slice"],
  "unresolvedItems": [],
  "contextRefs": [
    { "kind": "repo-path", "value": "app/parent" }
  ],
  "requestedEffects": ["repository-read", "code-write"]
}
```

The example records `code-write` because the user's eventual goal needs it.
AgentOps v1 will return `authorization-required`; recording the request never
grants or executes the effect.
