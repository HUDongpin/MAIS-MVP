import type { AgentOpsRequestV1 } from "./contracts";
import type { DiscoveryResultV1 } from "./discovery";

export function requestFixture(
  overrides: Partial<AgentOpsRequestV1> = {},
): AgentOpsRequestV1 {
  const base: AgentOpsRequestV1 = {
    schemaVersion: "mais-agentops-request.v1",
    requestId: "request-fixture-001",
    intentSummary: "Prepare a safe, deterministic handoff.",
    explicitGoal: "Route the requested work to one exact primary owner.",
    taskType: "feature",
    operationMode: "handoff",
    audience: "MAIS owner and implementing agent",
    targetRuntime: "codex",
    scope: {
      included: ["app/parent/**"],
      excluded: ["app/api/**"],
    },
    mustHave: ["one primary owner"],
    mustAvoid: ["external side effects"],
    successCriteria: ["handoff identifies the exact owner"],
    assumptions: [],
    unresolvedItems: [],
    contextRefs: [],
    requestedEffects: ["repository-read"],
  };
  return {
    ...base,
    ...overrides,
    scope: overrides.scope ?? base.scope,
  };
}

export function discoveryFixture(
  overrides: Partial<DiscoveryResultV1> = {},
): DiscoveryResultV1 {
  return {
    repositorySnapshot: {
      rootDigest: "1".repeat(64),
      gitCommonDirDigest: "2".repeat(64),
      headSha: "3".repeat(40),
      branch: "codex/test",
      statusDigest: "4".repeat(64),
      dirty: false,
    },
    executedProbeIds: [
      "git.snapshot",
      "git.worktrees",
      "repo.context-boundaries",
      "repo.policy-digests",
      "repo.specialist-availability",
    ],
    policyDigests: {
      agentsPolicyDigest: "5".repeat(64),
      releaseOwnerPathspecsDigest: "6".repeat(64),
      releasePackageManifestDigest: "7".repeat(64),
    },
    worktrees: [],
    contextBoundaries: [],
    specialistAvailability: {},
    ...overrides,
  };
}
