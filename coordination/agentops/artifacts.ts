import { createRequire } from "node:module";

import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";

import { sha256Digest } from "./canonical";
import type {
  AgentOpsRequestedEffect,
  AgentOpsRequestV1,
  AgentOpsUnresolvedItemV1,
} from "./contracts";
import type { DiscoveryResultV1, RepositorySnapshotV1 } from "./discovery";
import {
  LANE_REGISTRY_DIGEST,
  type AgentLaneId,
  type ProbeId,
  type SpecialistWorkflowId,
} from "./registry";
import type { OrderedSubcontractV1, RouteDecisionV1 } from "./routing";
import {
  assertNoSensitivePersistence,
  sanitizeEvidence,
  V1_AUTHORITY_POLICY,
  type AgentOpsAuthorityPolicyV1,
  type SanitizedEvidenceV1,
} from "./security";

export const AGENT_TASK_CONTRACT_SCHEMA_VERSION =
  "mais-agent-task-contract.v1" as const;
export const AGENTOPS_HANDOFF_SCHEMA_VERSION = "mais-agentops-handoff.v1" as const;
export const AGENTOPS_EVENT_SCHEMA_VERSION = "mais-agentops-event.v1" as const;

const requireJson = createRequire(import.meta.url);
const artifactSchemaValidator = new Ajv2020({ allErrors: true, strict: true });
const validateContractSchema: ValidateFunction = artifactSchemaValidator.compile(
  requireJson("./schemas/agent-task-contract-v1.schema.json") as object,
);
const validateHandoffSchema: ValidateFunction = artifactSchemaValidator.compile(
  requireJson("./schemas/agentops-handoff-v1.schema.json") as object,
);
const validateEventSchema: ValidateFunction = artifactSchemaValidator.compile(
  requireJson("./schemas/agentops-event-v1.schema.json") as object,
);

export type AgentOpsTerminalStatusV1 =
  | "handoff-ready"
  | "clarification-required"
  | "authorization-required"
  | "blocked";

export interface AgentTaskContractV1 {
  readonly schemaVersion: typeof AGENT_TASK_CONTRACT_SCHEMA_VERSION;
  readonly requestId: string;
  readonly requestDigest: string;
  readonly runId: string;
  readonly repositorySnapshot: RepositorySnapshotV1;
  readonly knowledge: {
    readonly facts: readonly string[];
    readonly explicitRequirements: readonly string[];
    readonly inferences: readonly string[];
    readonly assumptions: readonly string[];
    readonly unresolvedItems: readonly AgentOpsUnresolvedItemV1[];
  };
  readonly crispe: {
    readonly capacity: string;
    readonly role: string;
    readonly insight: string;
    readonly statement: string;
    readonly personality: string;
    readonly examples: readonly string[];
  };
  readonly inputSchemaRef: string;
  readonly outputSchemaRef: string;
  readonly outputContract: string;
  readonly workflow: {
    readonly trigger: string;
    readonly steps: readonly string[];
    readonly errorHandling: readonly string[];
    readonly stopConditions: readonly string[];
  };
  readonly risk: {
    readonly riskClass: "low" | "medium" | "high" | "critical";
    readonly reasons: readonly string[];
  };
  readonly probeAllowlist: readonly ProbeId[];
  readonly authorityPolicy: AgentOpsAuthorityPolicyV1;
  readonly requestedEffects: readonly AgentOpsRequestedEffect[];
  readonly route: {
    readonly status: RouteDecisionV1["status"];
    readonly primaryLane: AgentLaneId | null;
    readonly collaboratingLanes: readonly AgentLaneId[];
    readonly ownedPathScopes: readonly string[];
    readonly forbiddenPathScopes: readonly string[];
    readonly orderedSubcontracts: readonly OrderedSubcontractV1[];
    readonly parallelExecutionAllowed: false;
  };
  readonly specialistWorkflow: SpecialistWorkflowId | null;
  readonly evidenceRequirements: readonly string[];
  readonly claimCeiling: string;
  readonly policyDigests: {
    readonly registryDigest: string;
    readonly agentsPolicyDigest: string;
    readonly releaseOwnerPathspecsDigest: string;
    readonly releasePackageManifestDigest: string;
  };
  readonly runtimePromptProjection: string;
  readonly contractDigest: string;
}

export interface AgentOpsCheckV1 {
  readonly checkId: string;
  readonly status: "passed" | "failed" | "not-run";
  readonly summary: string;
  readonly evidenceDigest: string;
}

export interface AgentOpsBlockerV1 {
  readonly code: string;
  readonly summary: string;
  readonly resumeRequirement: string;
}

export interface AgentOpsHandoffV1 {
  readonly schemaVersion: typeof AGENTOPS_HANDOFF_SCHEMA_VERSION;
  readonly runId: string;
  readonly terminalStatus: AgentOpsTerminalStatusV1;
  readonly requestDigest: string;
  readonly contractDigest: string;
  readonly repositorySnapshot: RepositorySnapshotV1;
  readonly route: AgentTaskContractV1["route"];
  readonly specialistWorkflow: SpecialistWorkflowId | null;
  readonly checksPerformed: readonly AgentOpsCheckV1[];
  readonly checksNotPerformed: readonly string[];
  readonly blockers: readonly AgentOpsBlockerV1[];
  readonly requestedEffects: readonly AgentOpsRequestedEffect[];
  readonly permittedEffects: readonly (
    | "repository-read"
    | "deterministic-validation"
  )[];
  readonly nextOwner: AgentLaneId | "owner" | "human";
  readonly nextAllowedAction: string;
  readonly resumeGate: string;
  readonly claimCeiling: string;
  readonly redactionDeclaration: string;
  readonly handoffDigest: string;
}

export type AgentOpsNodeIdV1 =
  | "agentops.intake"
  | "agentops.contract"
  | "agentops.discovery"
  | "agentops.authority"
  | "agentops.route"
  | "agentops.specialist-preflight"
  | "agentops.eval-plan"
  | "agentops.handoff";

export interface AgentOpsEventV1 {
  readonly schemaVersion: typeof AGENTOPS_EVENT_SCHEMA_VERSION;
  readonly runId: string;
  readonly sequence: number;
  readonly nodeId: AgentOpsNodeIdV1;
  readonly status: "started" | "completed" | "interrupted" | "failed";
  readonly sanitizedEvidence: SanitizedEvidenceV1;
  readonly previousEventDigest: string | null;
  readonly producedAt: string;
  readonly eventDigest: string;
}

export interface VerificationResultV1 {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
  }
  return value;
}

function withoutDigest<T extends Record<string, unknown>>(
  value: T,
  key: keyof T,
): Omit<T, keyof T> & Record<string, unknown> {
  const copy = { ...value };
  delete copy[key];
  return copy as Omit<T, keyof T> & Record<string, unknown>;
}

function riskFor(request: AgentOpsRequestV1): AgentTaskContractV1["risk"] {
  const deniedEffects = request.requestedEffects.filter(
    (effect) => effect !== "repository-read" && effect !== "deterministic-validation",
  );
  const highImpactGaps = request.unresolvedItems.filter(
    ({ impact }) => impact === "high",
  );
  if (deniedEffects.includes("production-data-mutation")) {
    return {
      riskClass: "critical",
      reasons: ["production data mutation was requested and is denied in v1"],
    };
  }
  if (deniedEffects.length > 0 || highImpactGaps.length > 0) {
    return {
      riskClass: "high",
      reasons: [
        ...(deniedEffects.length > 0
          ? [`v1-denied effects were requested: ${deniedEffects.join(", ")}`]
          : []),
        ...(highImpactGaps.length > 0
          ? ["high-impact information remains unresolved"]
          : []),
      ],
    };
  }
  return {
    riskClass: "medium",
    reasons: ["the task crosses an agent ownership and evidence boundary"],
  };
}

function evidenceRequirementsFor(
  workflow: SpecialistWorkflowId | null,
): readonly string[] {
  switch (workflow) {
    case "content-candidate-generation.v1":
      return ["immutable candidate identity", "generation contract digest", "no acceptance claim"];
    case "question-machine-qa.v1":
      return ["immutable candidate identity", "machine-QA packet digest", "no natural-sample generalization"];
    case "curriculum-content-review.v1":
      return ["independent content evidence", "curriculum and answer checks", "claim ceiling: approved-for-integration-review"];
    case "candidate-promotion.v1":
      return ["exact candidate identity", "current A18 receipt", "separate A11 and A22 gates"];
    case "release-graphops-handoff.v1":
      return ["clean release source", "candidate-bound receipts", "GraphOps authorization envelope"];
    case "nova-prompt-audit.v1":
      return ["prompt identity and digest", "strict output contract", "mocked regression plan"];
    case "adaptive-prompt-audit.v1":
      return ["deterministic BKT floor", "candidate-only rerank", "validator and deterministic fallback"];
    default:
      return ["current repository snapshot", "owner-specific acceptance criteria", "independent verification plan"];
  }
}

function runtimeProjection(
  request: AgentOpsRequestV1,
  route: RouteDecisionV1,
): string {
  return [
    `Capacity: Prepare a read-only MAIS handoff for ${request.taskType}.`,
    `Role: Operate as ${route.primaryLane ?? "an unresolved owner"}; do not execute external effects.`,
    `Insight: ${request.intentSummary}`,
    `Statement: ${request.explicitGoal}`,
    "Personality: Precise, evidence-bounded, bilingual when the user requests it, and fail-closed.",
    `Output: AgentOpsHandoffV1 only; claim ceiling ${route.claimCeiling}.`,
  ].join("\n");
}

export function createAgentTaskContract(input: {
  readonly request: AgentOpsRequestV1;
  readonly discovery: DiscoveryResultV1;
  readonly route: RouteDecisionV1;
  readonly clarificationFacts?: readonly string[];
}): Readonly<AgentTaskContractV1> {
  const requestDigest = sha256Digest(input.request);
  const workflow = input.route.specialistWorkflow;
  const clarificationFacts = input.clarificationFacts ?? [];
  const runIdentityDigest = sha256Digest({
    requestDigest,
    repositorySnapshot: input.discovery.repositorySnapshot,
    registryDigest: LANE_REGISTRY_DIGEST,
  });
  const body: Omit<AgentTaskContractV1, "contractDigest"> = {
    schemaVersion: AGENT_TASK_CONTRACT_SCHEMA_VERSION,
    requestId: input.request.requestId,
    requestDigest,
    runId: `agentops-${runIdentityDigest.slice(0, 20)}`,
    repositorySnapshot: input.discovery.repositorySnapshot,
    knowledge: {
      facts: [
        `repository HEAD is ${input.discovery.repositorySnapshot.headSha}`,
        `repository branch is ${input.discovery.repositorySnapshot.branch}`,
        `requested task type is ${input.request.taskType}`,
      ],
      explicitRequirements: [
        input.request.explicitGoal,
        ...input.request.mustHave,
        ...input.request.successCriteria,
        ...clarificationFacts,
      ],
      inferences: [
        input.request.intentSummary,
        ...(clarificationFacts.length > 0
          ? ["User-provided clarification facts were incorporated explicitly."]
          : []),
      ],
      assumptions: input.request.assumptions,
      unresolvedItems: input.request.unresolvedItems,
    },
    crispe: {
      capacity: "Compile a deterministic, read-only AgentOps handoff contract.",
      role: input.route.primaryLane
        ? `${input.route.primaryLane} owner lane`
        : "unresolved owner lane",
      insight: input.request.intentSummary,
      statement: input.request.explicitGoal,
      personality:
        "Precise, evidence-bounded, minimally inquisitive, injection-aware, and fail-closed.",
      examples: [],
    },
    inputSchemaRef: "schemas/agentops-request-v1.schema.json",
    outputSchemaRef: "schemas/agentops-handoff-v1.schema.json",
    outputContract: "Emit exactly one AgentOpsHandoffV1 object.",
    workflow: {
      trigger: `A validated ${input.request.taskType} AgentOpsRequestV1 is received.`,
      steps: [
        "validate and sanitize intake",
        "compile the immutable task contract",
        "run registered read-only discovery",
        "apply the v1 authority deny policy",
        "route to one A01-A25 primary lane",
        "preflight the exact specialist workflow",
        "produce a replayable evaluation plan",
        "emit a bounded handoff",
      ],
      errorHandling: [
        "fail closed on schema, digest, path, registry, or checkpoint mismatch",
        "request at most three high-impact clarifications per round",
        "never substitute model self-evaluation for deterministic evidence",
      ],
      stopConditions: [
        "handoff-ready",
        "clarification-required",
        "authorization-required",
        "blocked",
      ],
    },
    risk: riskFor(input.request),
    probeAllowlist: input.discovery.executedProbeIds,
    authorityPolicy: V1_AUTHORITY_POLICY,
    requestedEffects: input.request.requestedEffects,
    route: {
      status: input.route.status,
      primaryLane: input.route.primaryLane,
      collaboratingLanes: input.route.collaboratingLanes,
      ownedPathScopes: input.route.ownedPathScopes,
      forbiddenPathScopes: input.route.forbiddenPathScopes,
      orderedSubcontracts: input.route.orderedSubcontracts,
      parallelExecutionAllowed: false,
    },
    specialistWorkflow: workflow,
    evidenceRequirements: evidenceRequirementsFor(workflow),
    claimCeiling: input.route.claimCeiling,
    policyDigests: {
      registryDigest: LANE_REGISTRY_DIGEST,
      agentsPolicyDigest: input.discovery.policyDigests.agentsPolicyDigest,
      releaseOwnerPathspecsDigest:
        input.discovery.policyDigests.releaseOwnerPathspecsDigest,
      releasePackageManifestDigest:
        input.discovery.policyDigests.releasePackageManifestDigest,
    },
    runtimePromptProjection: runtimeProjection(input.request, input.route),
  };
  const contract: AgentTaskContractV1 = {
    ...body,
    contractDigest: sha256Digest(body),
  };
  assertNoSensitivePersistence(contract);
  return deepFreeze(contract);
}

const CONTRACT_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "requestId",
  "requestDigest",
  "runId",
  "repositorySnapshot",
  "knowledge",
  "crispe",
  "inputSchemaRef",
  "outputSchemaRef",
  "outputContract",
  "workflow",
  "risk",
  "probeAllowlist",
  "authorityPolicy",
  "requestedEffects",
  "route",
  "specialistWorkflow",
  "evidenceRequirements",
  "claimCeiling",
  "policyDigests",
  "runtimePromptProjection",
  "contractDigest",
]);

function exactTopLevelKeys(
  value: unknown,
  expected: readonly string[],
): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    keys.length === wanted.length &&
    keys.every((key, index) => key === wanted[index])
  );
}

function schemaErrors(
  validator: ValidateFunction,
  value: unknown,
  artifactName: string,
): readonly string[] {
  if (validator(value)) return [];
  return (validator.errors ?? []).map(
    (error) =>
      `${artifactName}${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

export function verifyAgentTaskContract(value: unknown): VerificationResultV1 {
  const errors: string[] = [];
  if (!exactTopLevelKeys(value, CONTRACT_TOP_LEVEL_KEYS)) {
    errors.push("contract schema fields do not match v1");
    return { ok: false, errors };
  }
  const contract = value as AgentTaskContractV1;
  errors.push(...schemaErrors(validateContractSchema, contract, "contract"));
  if (contract.schemaVersion !== AGENT_TASK_CONTRACT_SCHEMA_VERSION) {
    errors.push("contract schema version is unsupported");
  }
  if (contract.policyDigests?.registryDigest !== LANE_REGISTRY_DIGEST) {
    errors.push("lane registry digest is stale");
  }
  const computed = sha256Digest(
    withoutDigest(
      contract as unknown as Record<string, unknown>,
      "contractDigest",
    ),
  );
  if (computed !== contract.contractDigest) {
    errors.push("contract digest mismatch");
  }
  try {
    assertNoSensitivePersistence(contract);
  } catch (error) {
    errors.push((error as Error).message);
  }
  return { ok: errors.length === 0, errors };
}

const FORBIDDEN_SELF_CLAIMS =
  /\b(?:implemented|merged|deployed|live|approved-for-production|production-ready)\b/i;

function assertBoundedClaim(value: string, path: string): void {
  if (FORBIDDEN_SELF_CLAIMS.test(value)) {
    throw new TypeError(`${path} contains a forbidden completion or live claim`);
  }
}

function permittedEffectsFor(
  requestedEffects: readonly AgentOpsRequestedEffect[],
): readonly ("repository-read" | "deterministic-validation")[] {
  return requestedEffects.filter(
    (
      effect,
    ): effect is "repository-read" | "deterministic-validation" =>
      effect === "repository-read" || effect === "deterministic-validation",
  );
}

export function createAgentOpsHandoff(input: {
  readonly contract: AgentTaskContractV1;
  readonly terminalStatus: AgentOpsTerminalStatusV1;
  readonly checksPerformed: readonly AgentOpsCheckV1[];
  readonly checksNotPerformed: readonly string[];
  readonly blockers: readonly AgentOpsBlockerV1[];
  readonly permittedEffects: readonly (
    | "repository-read"
    | "deterministic-validation"
  )[];
  readonly nextOwner: AgentLaneId | "owner" | "human";
  readonly nextAllowedAction: string;
  readonly resumeGate: string;
  readonly redactionDeclaration: string;
}): Readonly<AgentOpsHandoffV1> {
  const contractVerification = verifyAgentTaskContract(input.contract);
  if (!contractVerification.ok) {
    throw new TypeError(
      `cannot hand off an invalid contract: ${contractVerification.errors.join("; ")}`,
    );
  }
  assertBoundedClaim(input.nextAllowedAction, "nextAllowedAction");
  assertBoundedClaim(input.resumeGate, "resumeGate");
  const expectedPermittedEffects = permittedEffectsFor(
    input.contract.requestedEffects,
  );
  if (
    sha256Digest(input.permittedEffects) !==
    sha256Digest(expectedPermittedEffects)
  ) {
    throw new TypeError("permitted effects must exactly match requested v1-safe effects");
  }
  const expectedNextOwner = input.contract.route.primaryLane ?? "owner";
  if (input.nextOwner !== expectedNextOwner) {
    throw new TypeError("next owner must match the contract primary lane");
  }
  const body: Omit<AgentOpsHandoffV1, "handoffDigest"> = {
    schemaVersion: AGENTOPS_HANDOFF_SCHEMA_VERSION,
    runId: input.contract.runId,
    terminalStatus: input.terminalStatus,
    requestDigest: input.contract.requestDigest,
    contractDigest: input.contract.contractDigest,
    repositorySnapshot: input.contract.repositorySnapshot,
    route: input.contract.route,
    specialistWorkflow: input.contract.specialistWorkflow,
    checksPerformed: input.checksPerformed,
    checksNotPerformed: input.checksNotPerformed,
    blockers: input.blockers,
    requestedEffects: input.contract.requestedEffects,
    permittedEffects: expectedPermittedEffects,
    nextOwner: input.nextOwner,
    nextAllowedAction: input.nextAllowedAction,
    resumeGate: input.resumeGate,
    claimCeiling: input.contract.claimCeiling,
    redactionDeclaration: input.redactionDeclaration,
  };
  const handoff: AgentOpsHandoffV1 = {
    ...body,
    handoffDigest: sha256Digest(body),
  };
  assertNoSensitivePersistence(handoff);
  return deepFreeze(handoff);
}

const HANDOFF_TOP_LEVEL_KEYS = Object.freeze([
  "schemaVersion",
  "runId",
  "terminalStatus",
  "requestDigest",
  "contractDigest",
  "repositorySnapshot",
  "route",
  "specialistWorkflow",
  "checksPerformed",
  "checksNotPerformed",
  "blockers",
  "requestedEffects",
  "permittedEffects",
  "nextOwner",
  "nextAllowedAction",
  "resumeGate",
  "claimCeiling",
  "redactionDeclaration",
  "handoffDigest",
]);

export function verifyAgentOpsHandoff(value: unknown): VerificationResultV1 {
  const errors: string[] = [];
  if (!exactTopLevelKeys(value, HANDOFF_TOP_LEVEL_KEYS)) {
    return { ok: false, errors: ["handoff schema fields do not match v1"] };
  }
  const handoff = value as AgentOpsHandoffV1;
  errors.push(...schemaErrors(validateHandoffSchema, handoff, "handoff"));
  if (handoff.schemaVersion !== AGENTOPS_HANDOFF_SCHEMA_VERSION) {
    errors.push("handoff schema version is unsupported");
  }
  const computed = sha256Digest(
    withoutDigest(
      handoff as unknown as Record<string, unknown>,
      "handoffDigest",
    ),
  );
  if (computed !== handoff.handoffDigest) {
    errors.push("handoff digest mismatch");
  }
  try {
    assertBoundedClaim(handoff.nextAllowedAction, "nextAllowedAction");
    assertBoundedClaim(handoff.resumeGate, "resumeGate");
    if (
      sha256Digest(handoff.permittedEffects) !==
      sha256Digest(permittedEffectsFor(handoff.requestedEffects))
    ) {
      errors.push("handoff permitted effects do not match requested v1-safe effects");
    }
    if (handoff.nextOwner !== (handoff.route.primaryLane ?? "owner")) {
      errors.push("handoff next owner does not match the routed primary lane");
    }
    assertNoSensitivePersistence(handoff);
  } catch (error) {
    errors.push((error as Error).message);
  }
  return { ok: errors.length === 0, errors };
}

export function verifyAgentOpsHandoffContractBinding(
  handoff: AgentOpsHandoffV1,
  contract: AgentTaskContractV1,
): VerificationResultV1 {
  const contractBinding = {
    runId: contract.runId,
    requestDigest: contract.requestDigest,
    contractDigest: contract.contractDigest,
    repositorySnapshot: contract.repositorySnapshot,
    route: contract.route,
    specialistWorkflow: contract.specialistWorkflow,
    requestedEffects: contract.requestedEffects,
    claimCeiling: contract.claimCeiling,
  };
  const handoffBinding = {
    runId: handoff.runId,
    requestDigest: handoff.requestDigest,
    contractDigest: handoff.contractDigest,
    repositorySnapshot: handoff.repositorySnapshot,
    route: handoff.route,
    specialistWorkflow: handoff.specialistWorkflow,
    requestedEffects: handoff.requestedEffects,
    claimCeiling: handoff.claimCeiling,
  };
  const errors =
    sha256Digest(handoffBinding) === sha256Digest(contractBinding)
      ? []
      : ["handoff contract-derived identity is stale or inconsistent"];
  return { ok: errors.length === 0, errors };
}

export function createAgentOpsEvent(
  input: Omit<AgentOpsEventV1, "schemaVersion" | "eventDigest" | "sanitizedEvidence"> & {
    readonly sanitizedEvidence: SanitizedEvidenceV1;
  },
): Readonly<AgentOpsEventV1> {
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 1) {
    throw new TypeError("event sequence must be a positive safe integer");
  }
  if (!Number.isFinite(Date.parse(input.producedAt))) {
    throw new TypeError("event producedAt must be an ISO date-time");
  }
  const body: Omit<AgentOpsEventV1, "eventDigest"> = {
    schemaVersion: AGENTOPS_EVENT_SCHEMA_VERSION,
    ...input,
    sanitizedEvidence: sanitizeEvidence(input.sanitizedEvidence),
  };
  const event: AgentOpsEventV1 = {
    ...body,
    eventDigest: sha256Digest(body),
  };
  assertNoSensitivePersistence(event);
  return deepFreeze(event);
}

export function verifyAgentOpsEventChain(
  events: readonly AgentOpsEventV1[],
): VerificationResultV1 {
  const errors: string[] = [];
  let previousDigest: string | null = null;
  let runId: string | null = null;
  events.forEach((event, index) => {
    errors.push(
      ...schemaErrors(validateEventSchema, event, `event ${index + 1}`),
    );
    if (event.schemaVersion !== AGENTOPS_EVENT_SCHEMA_VERSION) {
      errors.push(`event ${index + 1} has an unsupported schema version`);
    }
    if (event.sequence !== index + 1) {
      errors.push(`event ${index + 1} has a missing or duplicate sequence`);
    }
    if (event.previousEventDigest !== previousDigest) {
      errors.push(`event ${index + 1} has a broken previous digest`);
    }
    if (runId !== null && event.runId !== runId) {
      errors.push(`event ${index + 1} belongs to another run`);
    }
    const computed = sha256Digest(
      withoutDigest(
        event as unknown as Record<string, unknown>,
        "eventDigest",
      ),
    );
    if (computed !== event.eventDigest) {
      errors.push(`event ${index + 1} digest mismatch`);
    }
    previousDigest = event.eventDigest;
    runId = event.runId;
  });
  return { ok: errors.length === 0, errors };
}
