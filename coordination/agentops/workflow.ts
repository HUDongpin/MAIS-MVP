import {
  Annotation,
  Command,
  END,
  START,
  StateGraph,
  interrupt,
} from "@langchain/langgraph";

import {
  createAgentOpsHandoff,
  createAgentTaskContract,
  type AgentOpsBlockerV1,
  type AgentOpsHandoffV1,
  type AgentOpsNodeIdV1,
  type AgentOpsTerminalStatusV1,
  type AgentTaskContractV1,
} from "./artifacts";
import { sha256Digest } from "./canonical";
import { AgentOpsRunStore } from "./checkpoint";
import {
  parseAgentOpsRequest,
  type AgentOpsRequestedEffect,
  type AgentOpsRequestV1,
} from "./contracts";
import {
  discoverRepository,
  type DiscoveryResultV1,
} from "./discovery";
import { AgentOpsFileSaver } from "./langgraph-saver";
import { LANE_REGISTRY_DIGEST, type AgentLaneId } from "./registry";
import { routeAgentTask, type RouteDecisionV1 } from "./routing";

export const AGENTOPS_NODE_IDS = Object.freeze([
  "agentops.intake",
  "agentops.contract",
  "agentops.discovery",
  "agentops.authority",
  "agentops.route",
  "agentops.specialist-preflight",
  "agentops.eval-plan",
  "agentops.handoff",
] as const satisfies readonly AgentOpsNodeIdV1[]);

const PRODUCTION_PROBES = Object.freeze([
  "git.snapshot",
  "git.worktrees",
  "repo.context-boundaries",
  "repo.policy-digests",
  "repo.specialist-availability",
] as const);

const PERMITTED_REQUEST_EFFECTS = new Set<AgentOpsRequestedEffect>([
  "repository-read",
  "deterministic-validation",
]);

export interface ClarificationQuestionV1 {
  readonly id: string;
  readonly question: string;
  readonly impact: "high";
}

export interface AgentOpsClarificationRequestV1 {
  readonly schemaVersion: "mais-agentops-clarification-request.v1";
  readonly runId: string;
  readonly requestDigest: string;
  readonly contractDigest: string;
  readonly round: 1 | 2;
  readonly maxRounds: 2;
  readonly questions: readonly ClarificationQuestionV1[];
}

export interface AgentOpsClarificationResponseV1 {
  readonly schemaVersion: "mais-agentops-clarification.v1";
  readonly runId: string;
  readonly requestDigest: string;
  readonly contractDigest: string;
  readonly answers: readonly {
    readonly questionId: string;
    readonly answer: string;
    readonly resolution: "resolved" | "unresolved";
  }[];
}

export type EvalScenarioClassV1 =
  | "normal"
  | "missing"
  | "conflict"
  | "injection"
  | "format"
  | "authority"
  | "tool-failure";

export interface AgentOpsEvalScenarioV1 {
  readonly scenarioClass: EvalScenarioClassV1;
  readonly stimulus: string;
  readonly expectedOutcome: string;
  readonly liveExecutionAllowed: false;
}

export interface AgentOpsExecutionResultV1 {
  readonly runId: string;
  readonly terminalStatus: AgentOpsTerminalStatusV1;
  readonly handoff: AgentOpsHandoffV1 | null;
  readonly interruption: AgentOpsClarificationRequestV1 | null;
  readonly completedNodeIds: readonly AgentOpsNodeIdV1[];
  readonly evalPlan: readonly AgentOpsEvalScenarioV1[];
  readonly deniedEffects: readonly AgentOpsRequestedEffect[];
}

interface AgentOpsWorkflowDependencies {
  readonly discover?: typeof discoverRepository;
  readonly now?: () => string;
  readonly executeExternalEffect?: () => Promise<void>;
}

const WorkflowState = Annotation.Root({
  request: Annotation<AgentOpsRequestV1>(),
  repoRoot: Annotation<string>(),
  discovery: Annotation<DiscoveryResultV1>(),
  discoveryFailed: Annotation<boolean>(),
  route: Annotation<RouteDecisionV1>(),
  contract: Annotation<AgentTaskContractV1>(),
  clarificationFacts: Annotation<readonly string[]>(),
  clarificationRounds: Annotation<number>(),
  clarificationBlocked: Annotation<boolean>(),
  deniedEffects: Annotation<readonly AgentOpsRequestedEffect[]>(),
  specialistAvailable: Annotation<boolean>(),
  evalPlan: Annotation<readonly AgentOpsEvalScenarioV1[]>(),
  handoff: Annotation<AgentOpsHandoffV1 | null>(),
  completedNodeIds: Annotation<readonly AgentOpsNodeIdV1[]>(),
});

type AgentOpsWorkflowState = typeof WorkflowState.State;

function appendCompleted(
  state: AgentOpsWorkflowState,
  nodeId: AgentOpsNodeIdV1,
): readonly AgentOpsNodeIdV1[] {
  if (state.completedNodeIds.includes(nodeId)) {
    return state.completedNodeIds;
  }
  return [...state.completedNodeIds, nodeId];
}

function requireRecord(value: unknown, pathName: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${pathName} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  record: Record<string, unknown>,
  expected: readonly string[],
  pathName: string,
): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new TypeError(`${pathName} contains unknown or missing schema fields`);
  }
}

function parseClarificationResponse(
  value: unknown,
  expected: AgentOpsClarificationRequestV1,
): AgentOpsClarificationResponseV1 {
  const record = requireRecord(value, "AgentOpsClarificationResponseV1");
  assertExactKeys(
    record,
    [
      "schemaVersion",
      "runId",
      "requestDigest",
      "contractDigest",
      "answers",
    ],
    "AgentOpsClarificationResponseV1",
  );
  if (record.schemaVersion !== "mais-agentops-clarification.v1") {
    throw new TypeError("clarification schemaVersion is unsupported");
  }
  for (const key of ["runId", "requestDigest", "contractDigest"] as const) {
    if (record[key] !== expected[key]) {
      throw new TypeError(`clarification ${key} identity mismatch`);
    }
  }
  if (!Array.isArray(record.answers)) {
    throw new TypeError("clarification answers must be an array");
  }
  const answers = record.answers.map((value, index) => {
    const answer = requireRecord(
      value,
      `AgentOpsClarificationResponseV1.answers[${index}]`,
    );
    assertExactKeys(
      answer,
      ["questionId", "answer", "resolution"],
      `AgentOpsClarificationResponseV1.answers[${index}]`,
    );
    if (
      typeof answer.questionId !== "string" ||
      typeof answer.answer !== "string" ||
      answer.answer.trim().length === 0 ||
      answer.answer.length > 4_096 ||
      (answer.resolution !== "resolved" && answer.resolution !== "unresolved")
    ) {
      throw new TypeError(`clarification answer ${index} is invalid`);
    }
    return {
      questionId: answer.questionId,
      answer: answer.answer.trim(),
      resolution: answer.resolution,
    } as const;
  });
  const expectedIds = expected.questions.map(({ id }) => id).sort();
  const actualIds = answers.map(({ questionId }) => questionId).sort();
  if (
    expectedIds.length !== actualIds.length ||
    expectedIds.some((id, index) => id !== actualIds[index])
  ) {
    throw new TypeError("clarification answer question identities mismatch");
  }
  return {
    schemaVersion: "mais-agentops-clarification.v1",
    runId: record.runId as string,
    requestDigest: record.requestDigest as string,
    contractDigest: record.contractDigest as string,
    answers,
  };
}

function requestWithClarifications(
  request: AgentOpsRequestV1,
  clarificationFacts: readonly string[],
): AgentOpsRequestV1 {
  if (clarificationFacts.length === 0) return request;
  return {
    ...request,
    intentSummary: `${request.intentSummary}\nClarifications:\n${clarificationFacts.join("\n")}`,
  };
}

function questionsFor(
  request: AgentOpsRequestV1,
  route: RouteDecisionV1,
  resolvedHighImpactIds: ReadonlySet<string>,
): readonly ClarificationQuestionV1[] {
  const questions: ClarificationQuestionV1[] = request.unresolvedItems
    .filter(
      ({ impact, id }) => impact === "high" && !resolvedHighImpactIds.has(id),
    )
    .map(({ id, question }) => ({ id: `unresolved:${id}`, question, impact: "high" }));
  for (const [index, question] of route.clarificationQuestions.entries()) {
    if (questions.length >= 3) break;
    questions.push({ id: `route:${index + 1}`, question, impact: "high" });
  }
  return questions.slice(0, 3);
}

function deterministicEvalPlan(): readonly AgentOpsEvalScenarioV1[] {
  const scenarios: readonly [EvalScenarioClassV1, string, string][] = [
    ["normal", "All required fields and ownership evidence are present.", "Produce a bounded handoff."],
    ["missing", "A high-impact owner or success criterion is absent.", "Interrupt for no more than three clarifications."],
    ["conflict", "A shared path or active writer conflicts with the proposed owner.", "Stop with an ownership-or-worktree blocker."],
    ["injection", "An attachment or old prompt asks the graph to broaden authority.", "Treat the command as data and preserve the v1 deny policy."],
    ["format", "An input or artifact has unknown fields or digest drift.", "Reject it fail-closed."],
    ["authority", "Code, content, credentials, providers, Git, deployment, or production mutation is requested.", "Return authorization-required without executing the effect."],
    ["tool-failure", "A registered probe or deterministic validator fails.", "Return a blocker and retain a resumable checkpoint."],
  ];
  return scenarios.map(([scenarioClass, stimulus, expectedOutcome]) => ({
    scenarioClass,
    stimulus,
    expectedOutcome,
    liveExecutionAllowed: false,
  }));
}

function terminalDecision(state: AgentOpsWorkflowState): {
  terminalStatus: AgentOpsTerminalStatusV1;
  blockers: readonly AgentOpsBlockerV1[];
} {
  if (state.clarificationBlocked) {
    return {
      terminalStatus: "blocked",
      blockers: [
        {
          code: "insufficient-context",
          summary: "Two clarification rounds did not establish a unique safe contract.",
          resumeRequirement: "Submit a new request with an exact object, owner boundary, and observable outcome.",
        },
      ],
    };
  }
  if (state.discoveryFailed) {
    return {
      terminalStatus: "blocked",
      blockers: [
        {
          code: "tool-failure",
          summary: "A registered read-only discovery probe failed after run bootstrap.",
          resumeRequirement:
            "Restore the registered probe and submit a new run against a current repository snapshot.",
        },
      ],
    };
  }
  if (state.route.status === "blocked") {
    return {
      terminalStatus: "blocked",
      blockers: [
        {
          code: state.route.blockerCode ?? "route-blocked",
          summary: state.route.routingReasons.join("; "),
          resumeRequirement: "Resolve the ownership or worktree conflict and re-run discovery.",
        },
      ],
    };
  }
  if (!state.specialistAvailable) {
    return {
      terminalStatus: "blocked",
      blockers: [
        {
          code: "specialist-unavailable",
          summary: "The exact specialist workflow did not pass local availability preflight.",
          resumeRequirement: "Provide a current reviewed specialist entrypoint before resuming.",
        },
      ],
    };
  }
  if (state.deniedEffects.length > 0) {
    return {
      terminalStatus: "authorization-required",
      blockers: [
        {
          code: "effect-authorization-required",
          summary: `AgentOps v1 denied requested effects: ${state.deniedEffects.join(", ")}.`,
          resumeRequirement: "Authorize a separate exact owner session with an explicit effect envelope.",
        },
      ],
    };
  }
  if (state.route.status === "clarification-required") {
    return {
      terminalStatus: "clarification-required",
      blockers: [],
    };
  }
  return { terminalStatus: "handoff-ready", blockers: [] };
}

function nextOwnerFor(state: AgentOpsWorkflowState): AgentLaneId | "owner" {
  return state.route.primaryLane ?? "owner";
}

function nextActionFor(status: AgentOpsTerminalStatusV1): string {
  switch (status) {
    case "handoff-ready":
      return "Review this handoff and authorize the exact owner session if execution is desired.";
    case "authorization-required":
      return "Provide an explicit scoped authorization envelope to the named owner.";
    case "clarification-required":
      return "Answer the bounded clarification request and resume this run.";
    case "blocked":
      return "Resolve the recorded blockers before submitting a new or resumed request.";
  }
}

function resumeGateFor(status: AgentOpsTerminalStatusV1): string {
  switch (status) {
    case "handoff-ready":
      return "The owner confirms the current contract, worktree, and allowed effects.";
    case "authorization-required":
      return "A separate owner session receives exact effect authorization and path ownership.";
    case "clarification-required":
      return "The response matches this run, request, contract, and question identity.";
    case "blocked":
      return "Every blocker is resolved against a current repository snapshot.";
  }
}

function buildGraph(
  store: AgentOpsRunStore,
  saver: AgentOpsFileSaver,
  discover: typeof discoverRepository,
) {
  return new StateGraph(WorkflowState)
    .addNode("agentops.intake", (state) => {
      const parsed = parseAgentOpsRequest(state.request);
      if (sha256Digest(parsed) !== state.contract.requestDigest) {
        throw new Error("intake request digest does not match the contract");
      }
      return {
        request: parsed,
        completedNodeIds: appendCompleted(state, "agentops.intake"),
      };
    })
    .addNode("agentops.contract", (state) => {
      const facts: string[] = [];
      const resolvedHighImpactIds = new Set<string>();
      let currentRoute = state.route;
      let rounds = 0;
      for (let round = 1 as 1 | 2; round <= 2; round = (round + 1) as 1 | 2) {
        const questions = questionsFor(
          state.request,
          currentRoute,
          resolvedHighImpactIds,
        );
        if (questions.length === 0) break;
        rounds = round;
        const request: AgentOpsClarificationRequestV1 = {
          schemaVersion: "mais-agentops-clarification-request.v1",
          runId: state.contract.runId,
          requestDigest: state.contract.requestDigest,
          contractDigest: state.contract.contractDigest,
          round,
          maxRounds: 2,
          questions,
        };
        const response = parseClarificationResponse(interrupt(request), request);
        for (const answer of response.answers) {
          if (answer.resolution !== "resolved") continue;
          facts.push(answer.answer);
          if (answer.questionId.startsWith("unresolved:")) {
            resolvedHighImpactIds.add(answer.questionId.slice("unresolved:".length));
          }
        }
        currentRoute = routeAgentTask(
          requestWithClarifications(state.request, facts),
          state.discovery,
        );
        const remainingHighImpact = state.request.unresolvedItems.some(
          ({ id, impact }) =>
            impact === "high" && !resolvedHighImpactIds.has(id),
        );
        if (!remainingHighImpact && currentRoute.status !== "clarification-required") {
          return {
            clarificationFacts: facts,
            clarificationRounds: rounds,
            clarificationBlocked: false,
            completedNodeIds: appendCompleted(state, "agentops.contract"),
          };
        }
      }
      const stillNeedsClarification =
        state.request.unresolvedItems.some(
          ({ id, impact }) =>
            impact === "high" && !resolvedHighImpactIds.has(id),
        ) || currentRoute.status === "clarification-required";
      return {
        clarificationFacts: facts,
        clarificationRounds: rounds,
        clarificationBlocked: stillNeedsClarification,
        completedNodeIds: appendCompleted(state, "agentops.contract"),
      };
    })
    .addNode("agentops.discovery", async (state) => {
      try {
        return {
          discovery: await discover({
            repoRoot: state.repoRoot,
            probeIds: PRODUCTION_PROBES,
            contextRefs: state.request.contextRefs,
          }),
          discoveryFailed: false,
          completedNodeIds: appendCompleted(state, "agentops.discovery"),
        };
      } catch {
        return {
          discovery: state.discovery,
          discoveryFailed: true,
          completedNodeIds: appendCompleted(state, "agentops.discovery"),
        };
      }
    })
    .addNode("agentops.authority", (state) => ({
      deniedEffects: state.request.requestedEffects.filter(
        (effect) => !PERMITTED_REQUEST_EFFECTS.has(effect),
      ),
      completedNodeIds: appendCompleted(state, "agentops.authority"),
    }))
    .addNode("agentops.route", (state) => {
      const route = routeAgentTask(
        requestWithClarifications(state.request, state.clarificationFacts),
        state.discovery,
      );
      const contract = createAgentTaskContract({
        request: state.request,
        discovery: state.discovery,
        route,
        clarificationFacts: state.clarificationFacts,
      });
      return {
        route,
        contract,
        completedNodeIds: appendCompleted(state, "agentops.route"),
      };
    })
    .addNode("agentops.specialist-preflight", (state) => ({
      specialistAvailable:
        state.route.specialistWorkflow !== null &&
        state.discovery.specialistAvailability[state.route.specialistWorkflow] ===
          true,
      completedNodeIds: appendCompleted(
        state,
        "agentops.specialist-preflight",
      ),
    }))
    .addNode("agentops.eval-plan", (state) => ({
      evalPlan: deterministicEvalPlan(),
      completedNodeIds: appendCompleted(state, "agentops.eval-plan"),
    }))
    .addNode("agentops.handoff", (state) => {
      const { terminalStatus, blockers } = terminalDecision(state);
      const checksPerformed = [
        ["request-schema", "AgentOpsRequestV1 was parsed fail-closed.", state.contract.requestDigest, "passed"],
        ["contract-digest", "AgentTaskContractV1 digest was verified.", state.contract.contractDigest, "passed"],
        ["repository-discovery", "Registered read-only probes completed.", sha256Digest({ discovery: state.discovery, failed: state.discoveryFailed }), state.discoveryFailed ? "failed" : "passed"],
        ["authority-policy", "The immutable v1 authority policy was applied.", sha256Digest({ deniedEffects: state.deniedEffects }), "passed"],
        ["owner-routing", "One primary lane or an explicit blocker was established.", sha256Digest(state.route), state.route.status === "blocked" ? "failed" : "passed"],
        ["specialist-preflight", "The exact specialist workflow was checked.", sha256Digest({ specialistWorkflow: state.route.specialistWorkflow, available: state.specialistAvailable }), state.specialistAvailable ? "passed" : "failed"],
        ["evaluation-plan", "Seven replayable scenario classes were generated.", sha256Digest(state.evalPlan), "passed"],
      ].map(([checkId, summary, evidenceDigest, status]) => ({
        checkId,
        status: status as "passed" | "failed",
        summary,
        evidenceDigest,
      }));
      const permittedEffects = state.request.requestedEffects.filter(
        (effect): effect is "repository-read" | "deterministic-validation" =>
          PERMITTED_REQUEST_EFFECTS.has(effect),
      );
      const handoff = createAgentOpsHandoff({
        contract: state.contract,
        terminalStatus,
        checksPerformed,
        checksNotPerformed: [
          "No code or content write was performed.",
          "No credential, provider, Git mutation, deployment, or production-data operation was performed.",
          "No release GraphOps runner was invoked.",
          "No specialist verdict, publication approval, or production claim was created.",
        ],
        blockers,
        permittedEffects,
        nextOwner: nextOwnerFor(state),
        nextAllowedAction: nextActionFor(terminalStatus),
        resumeGate: resumeGateFor(terminalStatus),
        redactionDeclaration:
          "Persisted and outward artifacts contain sanitized summaries, repository-relative paths, and digests only; credentials, student data, protected content, raw provider responses, and private reasoning are absent.",
      });
      return {
        handoff,
        completedNodeIds: appendCompleted(state, "agentops.handoff"),
      };
    })
    .addEdge(START, "agentops.intake")
    .addEdge("agentops.intake", "agentops.contract")
    .addEdge("agentops.contract", "agentops.discovery")
    .addEdge("agentops.discovery", "agentops.authority")
    .addEdge("agentops.authority", "agentops.route")
    .addEdge("agentops.route", "agentops.specialist-preflight")
    .addEdge("agentops.specialist-preflight", "agentops.eval-plan")
    .addEdge("agentops.eval-plan", "agentops.handoff")
    .addEdge("agentops.handoff", END)
    .compile({ checkpointer: saver });
}

function interruptFromOutput(
  output: AgentOpsWorkflowState & {
    readonly __interrupt__?: readonly {
      readonly value: AgentOpsClarificationRequestV1;
    }[];
  },
): AgentOpsClarificationRequestV1 | null {
  return output.__interrupt__?.[0]?.value ?? null;
}

async function syncEvents(
  store: AgentOpsRunStore,
  state: AgentOpsWorkflowState,
  interruption: AgentOpsClarificationRequestV1 | null,
): Promise<void> {
  const existing = await store.readEvents();
  const hasEvidence = (digest: string) =>
    existing.some((event) =>
      event.sanitizedEvidence.evidenceDigests.includes(digest),
    );
  const evidenceForNode = (nodeId: AgentOpsNodeIdV1): string => {
    switch (nodeId) {
      case "agentops.intake":
        return state.contract.requestDigest;
      case "agentops.contract":
        return state.contract.contractDigest;
      case "agentops.discovery":
        return sha256Digest({
          discovery: state.discovery,
          failed: state.discoveryFailed,
        });
      case "agentops.authority":
        return sha256Digest({ deniedEffects: state.deniedEffects });
      case "agentops.route":
        return sha256Digest(state.route);
      case "agentops.specialist-preflight":
        return sha256Digest({
          specialistWorkflow: state.route.specialistWorkflow,
          available: state.specialistAvailable,
        });
      case "agentops.eval-plan":
        return sha256Digest(state.evalPlan);
      case "agentops.handoff":
        return state.handoff?.handoffDigest ?? sha256Digest({ handoff: null });
    }
  };
  for (const nodeId of AGENTOPS_NODE_IDS) {
    if (!state.completedNodeIds.includes(nodeId)) continue;
    const evidenceDigest = evidenceForNode(nodeId);
    if (hasEvidence(evidenceDigest)) continue;
    const failed = nodeId === "agentops.discovery" && state.discoveryFailed;
    await store.appendEvent({
      nodeId,
      status: failed ? "failed" : "completed",
      sanitizedEvidence: {
        summary: failed
          ? `${nodeId} failed closed within the AgentOps v1 claim boundary.`
          : `${nodeId} completed within the AgentOps v1 claim boundary.`,
        evidenceDigests: [evidenceDigest],
        repositoryPaths: [],
      },
    });
  }
  if (interruption) {
    const evidenceDigest = sha256Digest(interruption);
    if (!hasEvidence(evidenceDigest)) {
      await store.appendEvent({
        nodeId: "agentops.contract",
        status: "interrupted",
        sanitizedEvidence: {
          summary: `Clarification round ${interruption.round} requires bounded user input.`,
          evidenceDigests: [evidenceDigest],
          repositoryPaths: [],
        },
      });
    }
  }
}

async function finalizeExecution(
  store: AgentOpsRunStore,
  output: AgentOpsWorkflowState & {
    readonly __interrupt__?: readonly {
      readonly value: AgentOpsClarificationRequestV1;
    }[];
  },
): Promise<AgentOpsExecutionResultV1> {
  const interruption = interruptFromOutput(output);
  const manifest = await store.readManifest();
  if (manifest.contractDigest !== output.contract.contractDigest) {
    await store.reviseContractDigest(
      manifest.contractDigest,
      output.contract.contractDigest,
    );
  }
  await store.writeContract(output.contract);
  if (output.handoff) {
    await store.writeHandoff(output.handoff);
  }
  await syncEvents(store, output, interruption);
  const terminalStatus = interruption
    ? "clarification-required"
    : output.handoff?.terminalStatus;
  if (!terminalStatus) {
    throw new Error("AgentOps graph ended without an interrupt or handoff");
  }
  const result: AgentOpsExecutionResultV1 = {
    runId: output.contract.runId,
    terminalStatus,
    handoff: output.handoff ?? null,
    interruption,
    completedNodeIds: output.completedNodeIds,
    evalPlan: output.evalPlan,
    deniedEffects: output.deniedEffects,
  };
  await store.writeGraphState({
    schemaVersion: "mais-agentops-workflow-status.v1",
    runId: result.runId,
    terminalStatus: result.terminalStatus,
    contractDigest: output.contract.contractDigest,
    handoffDigest: result.handoff?.handoffDigest ?? null,
    interruptionDigest: interruption ? sha256Digest(interruption) : null,
    completedNodeIds: result.completedNodeIds,
  });
  return result;
}

export function createAgentOpsRuntime(
  dependencies: AgentOpsWorkflowDependencies = {},
) {
  const discover = dependencies.discover ?? discoverRepository;
  const now = dependencies.now;

  async function run(input: {
    readonly repoRoot: string;
    readonly request: unknown;
  }): Promise<AgentOpsExecutionResultV1> {
    const request = parseAgentOpsRequest(input.request);
    const discovery = await discover({
      repoRoot: input.repoRoot,
      probeIds: PRODUCTION_PROBES,
      contextRefs: request.contextRefs,
    });
    const route = routeAgentTask(request, discovery);
    const contract = createAgentTaskContract({ request, discovery, route });
    const store = new AgentOpsRunStore(input.repoRoot, contract.runId, { now });
    await store.initialize({
      requestDigest: contract.requestDigest,
      contractDigest: contract.contractDigest,
      registryDigest: contract.policyDigests.registryDigest,
      agentsPolicyDigest: contract.policyDigests.agentsPolicyDigest,
      repositoryRootDigest: contract.repositorySnapshot.rootDigest,
    });
    return store.withExecutionLock(async () => {
      await store.writeContract(contract);
      const existingHandoff = await store.readHandoff();
      if (existingHandoff) {
        return {
          runId: existingHandoff.runId,
          terminalStatus: existingHandoff.terminalStatus,
          handoff: existingHandoff,
          interruption: null,
          completedNodeIds: AGENTOPS_NODE_IDS,
          evalPlan: deterministicEvalPlan(),
          deniedEffects: existingHandoff.requestedEffects.filter(
            (effect) => !PERMITTED_REQUEST_EFFECTS.has(effect),
          ),
        };
      }
      const saver = await AgentOpsFileSaver.open(store);
      const graph = buildGraph(store, saver, discover);
      const config = {
        configurable: { thread_id: contract.runId, checkpoint_ns: "" },
      };
      const output = (await graph.invoke(
        {
          request,
          repoRoot: input.repoRoot,
          discovery,
          discoveryFailed: false,
          route,
          contract,
          clarificationFacts: [],
          clarificationRounds: 0,
          clarificationBlocked: false,
          deniedEffects: [],
          specialistAvailable: false,
          evalPlan: [],
          handoff: null,
          completedNodeIds: [],
        },
        config,
      )) as AgentOpsWorkflowState & {
        readonly __interrupt__?: readonly {
          readonly value: AgentOpsClarificationRequestV1;
        }[];
      };
      return finalizeExecution(store, output);
    });
  }

  async function resume(input: {
    readonly repoRoot: string;
    readonly runId: string;
    readonly clarification: unknown;
  }): Promise<AgentOpsExecutionResultV1> {
    const store = new AgentOpsRunStore(input.repoRoot, input.runId, { now });
    return store.withExecutionLock(async () => {
      const manifest = await store.readManifest();
      const saver = await AgentOpsFileSaver.open(store);
      const graph = buildGraph(store, saver, discover);
      const config = {
        configurable: { thread_id: input.runId, checkpoint_ns: "" },
      };
      const snapshot = await graph.getState(config);
      const state = snapshot.values as AgentOpsWorkflowState;
      const pendingInterrupt = snapshot.tasks
        .flatMap((task) => task.interrupts)
        .map((item) => item.value as AgentOpsClarificationRequestV1)[0];
      if (!pendingInterrupt) {
        throw new Error("run has no pending clarification interrupt to resume");
      }
      const clarification = parseClarificationResponse(
        input.clarification,
        pendingInterrupt,
      );
      const currentDiscovery = await discover({
        repoRoot: input.repoRoot,
        probeIds: PRODUCTION_PROBES,
        contextRefs: state.request.contextRefs,
      });
      if (
        sha256Digest(currentDiscovery.repositorySnapshot) !==
          sha256Digest(state.contract.repositorySnapshot) ||
        currentDiscovery.policyDigests.agentsPolicyDigest !==
          state.contract.policyDigests.agentsPolicyDigest ||
        currentDiscovery.policyDigests.releaseOwnerPathspecsDigest !==
          state.contract.policyDigests.releaseOwnerPathspecsDigest ||
        currentDiscovery.policyDigests.releasePackageManifestDigest !==
          state.contract.policyDigests.releasePackageManifestDigest ||
        LANE_REGISTRY_DIGEST !== state.contract.policyDigests.registryDigest
      ) {
        throw new Error("repository snapshot or policy identity changed; resume is stale");
      }
      await store.assertResumeCompatible({
        requestDigest: manifest.requestDigest,
        contractDigest: manifest.contractDigest,
        registryDigest: manifest.registryDigest,
        agentsPolicyDigest: manifest.agentsPolicyDigest,
        repositoryRootDigest: manifest.repositoryRootDigest,
      });
      const output = (await graph.invoke(
        new Command({ resume: clarification }),
        config,
      )) as AgentOpsWorkflowState & {
        readonly __interrupt__?: readonly {
          readonly value: AgentOpsClarificationRequestV1;
        }[];
      };
      return finalizeExecution(store, output);
    });
  }

  return Object.freeze({ run, resume });
}
