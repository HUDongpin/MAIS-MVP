/**
 * TEST-ONLY LangGraph harness.
 *
 * This module is intentionally outside the public GraphOps index. It contains
 * only deterministic built-in no-op runners and cannot accept runner functions.
 */
import {
  Annotation,
  Command,
  END,
  INTERRUPT,
  MemorySaver,
  START,
  StateGraph,
  interrupt,
  isInterrupted,
} from "@langchain/langgraph";

import {
  type ApprovalEnvelope,
  createPreviewPilotApprovalEnvelope,
  verifyApprovalEnvelope,
} from "../approval";
import {
  getGraphSpecDigest,
  getRunnerRegistryDigest,
} from "../definition";
import {
  GRAPHOPS_RUNNER_IDS,
  type EvidenceLevel,
  type GraphOpsRunnerId,
  type LifecycleState,
} from "../registry";

export const FIXTURE_RESUME_APPROVAL_SCHEMA_VERSION =
  "mais-graphops-fixture-resume-approval.v1" as const;

export interface FixtureCapabilities {
  readonly previewAllowed: boolean;
  readonly productionAllowed: boolean;
}

export interface FixtureResumeApproval {
  readonly schemaVersion: typeof FIXTURE_RESUME_APPROVAL_SCHEMA_VERSION;
  readonly decision: "APPROVE_FIXTURE_PRODUCTION";
  readonly runId: string;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly approvalDigest: string;
}

interface FixtureState {
  readonly runnerCalls: readonly GraphOpsRunnerId[];
  readonly productionSideEffects: number;
  readonly lifecycle: LifecycleState;
  readonly evidenceLevel: EvidenceLevel;
  readonly approvalEnvelope: Readonly<ApprovalEnvelope> | null;
  readonly capabilities: Readonly<FixtureCapabilities>;
}

export type FixtureHarnessResult =
  | {
      readonly status: "interrupted";
      readonly runnerCalls: readonly GraphOpsRunnerId[];
      readonly productionSideEffects: number;
      readonly lifecycle: LifecycleState;
      readonly evidenceLevel: EvidenceLevel;
      readonly approvalEnvelope: Readonly<ApprovalEnvelope>;
    }
  | {
      readonly status: "completed";
      readonly runnerCalls: readonly GraphOpsRunnerId[];
      readonly productionSideEffects: number;
      readonly lifecycle: LifecycleState;
      readonly evidenceLevel: EvidenceLevel;
      readonly approvalEnvelope: Readonly<ApprovalEnvelope>;
    };

export interface FoundationFixtureOnlyHarness {
  start(threadId: string): Promise<FixtureHarnessResult>;
  resume(
    threadId: string,
    approval: FixtureResumeApproval | unknown,
  ): Promise<FixtureHarnessResult>;
}

const FixtureStateAnnotation = Annotation.Root({
  runnerCalls: Annotation<readonly GraphOpsRunnerId[]>(),
  productionSideEffects: Annotation<number>(),
  lifecycle: Annotation<LifecycleState>(),
  evidenceLevel: Annotation<EvidenceLevel>(),
  approvalEnvelope: Annotation<Readonly<ApprovalEnvelope> | null>(),
  capabilities: Annotation<Readonly<FixtureCapabilities>>(),
});

type LangGraphFixtureState = typeof FixtureStateAnnotation.State;

const VALIDATION_NODE = "fixture.validation" as const;
const PREVIEW_NODE = "fixture.preview" as const;
const APPROVAL_NODE = "fixture.await-production-approval" as const;
const PRODUCTION_NODE = "fixture.production" as const;

function requireThreadId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/.test(value)
  ) {
    throw new TypeError("threadId must be a safe 1-128 character identifier");
  }
  return value;
}

function validationNode(
  state: LangGraphFixtureState,
): Partial<LangGraphFixtureState> {
  return {
    runnerCalls: Object.freeze([
      ...state.runnerCalls,
      ...GRAPHOPS_RUNNER_IDS.slice(0, 4),
    ]),
    lifecycle: "VALIDATING",
    evidenceLevel: "E2",
  };
}

function previewNode(
  state: LangGraphFixtureState,
): Partial<LangGraphFixtureState> {
  if (!state.capabilities.previewAllowed) {
    throw new TypeError("fixture previewAllowed=false blocks Preview no-op runners");
  }
  const approvalEnvelope = createPreviewPilotApprovalEnvelope({
    runId: "foundation-fixture-run",
    candidateSha: "a".repeat(40),
    candidateTreeSha: "b".repeat(40),
    previewDeploymentId: "foundation-fixture-preview",
    previewEvidenceDigest: "e".repeat(64),
    requiredChecksDigest: "f".repeat(64),
    changedPathPolicyDigest: "1".repeat(64),
    schemaSourcePlanDigest: "2".repeat(64),
    previousProductionBinding: {
      deploymentId: "foundation-fixture-previous-production",
      candidateSha: "3".repeat(40),
    },
    approvalExpiresAt: "2026-08-27T23:59:59.000Z",
    rollbackAuthorization: true,
  });
  return {
    runnerCalls: Object.freeze([
      ...state.runnerCalls,
      ...GRAPHOPS_RUNNER_IDS.slice(4, 8),
    ]),
    lifecycle: "AWAITING_PRODUCTION_APPROVAL",
    evidenceLevel: "E4",
    approvalEnvelope,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function verifyFixtureResumeApproval(
  input: unknown,
  envelope: Readonly<ApprovalEnvelope>,
): void {
  if (!isRecord(input)) {
    throw new TypeError("resume must match the exact fixture approval envelope");
  }
  const keys = Object.keys(input).sort();
  const expected = [
    "approvalDigest",
    "decision",
    "graphSpecDigest",
    "runId",
    "runnerRegistryDigest",
    "schemaVersion",
  ].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index]) ||
    input.schemaVersion !== FIXTURE_RESUME_APPROVAL_SCHEMA_VERSION ||
    input.decision !== "APPROVE_FIXTURE_PRODUCTION" ||
    input.runId !== envelope.runId ||
    input.graphSpecDigest !== envelope.graphSpecDigest ||
    input.runnerRegistryDigest !== envelope.runnerRegistryDigest ||
    input.approvalDigest !== envelope.approvalDigest
  ) {
    throw new TypeError("resume does not match the exact fixture approval envelope");
  }
}

function approvalInterruptNode(
  state: LangGraphFixtureState,
): Partial<LangGraphFixtureState> {
  // Pure before interrupt(): LangGraph re-executes this node on resume.
  const envelope = verifyApprovalEnvelope(state.approvalEnvelope);
  const approval = interrupt<ApprovalEnvelope, unknown>(envelope);
  verifyFixtureResumeApproval(approval, envelope);
  return {};
}

function productionNode(
  state: LangGraphFixtureState,
): Partial<LangGraphFixtureState> {
  if (!state.capabilities.productionAllowed) {
    throw new TypeError(
      "fixture productionAllowed=false blocks production no-op runners",
    );
  }
  return {
    runnerCalls: Object.freeze([
      ...state.runnerCalls,
      ...GRAPHOPS_RUNNER_IDS.slice(8, 15),
      GRAPHOPS_RUNNER_IDS[16],
    ]),
    productionSideEffects: 3,
    lifecycle: "CLOSED",
    evidenceLevel: "E7",
  };
}

function buildFixtureGraph() {
  const builder = new StateGraph(FixtureStateAnnotation)
    .addNode(VALIDATION_NODE, validationNode)
    .addNode(PREVIEW_NODE, previewNode)
    .addNode(APPROVAL_NODE, approvalInterruptNode)
    .addNode(PRODUCTION_NODE, productionNode)
    .addEdge(START, VALIDATION_NODE)
    .addEdge(VALIDATION_NODE, PREVIEW_NODE)
    .addEdge(PREVIEW_NODE, APPROVAL_NODE)
    .addEdge(APPROVAL_NODE, PRODUCTION_NODE)
    .addEdge(PRODUCTION_NODE, END);
  return builder.compile({ checkpointer: new MemorySaver() });
}

function normalizeResult(output: unknown): FixtureHarnessResult {
  if (!isRecord(output)) {
    throw new TypeError("fixture LangGraph returned an invalid state");
  }
  const state = output as unknown as Partial<FixtureState>;
  if (
    !Array.isArray(state.runnerCalls) ||
    typeof state.productionSideEffects !== "number" ||
    !state.lifecycle ||
    !state.evidenceLevel
  ) {
    throw new TypeError("fixture LangGraph returned an incomplete state");
  }
  if (isInterrupted<ApprovalEnvelope>(output)) {
    const interruptions = output[INTERRUPT];
    const envelope = interruptions[0]?.value;
    if (interruptions.length !== 1 || !envelope) {
      throw new TypeError("fixture expects exactly one approval interrupt");
    }
    return Object.freeze({
      status: "interrupted" as const,
      runnerCalls: Object.freeze([...state.runnerCalls]),
      productionSideEffects: state.productionSideEffects,
      lifecycle: state.lifecycle,
      evidenceLevel: state.evidenceLevel,
      approvalEnvelope: verifyApprovalEnvelope(envelope),
    });
  }
  if (!state.approvalEnvelope) {
    throw new TypeError("completed fixture state has no approval envelope");
  }
  return Object.freeze({
    status: "completed" as const,
    runnerCalls: Object.freeze([...state.runnerCalls]),
    productionSideEffects: state.productionSideEffects,
    lifecycle: state.lifecycle,
    evidenceLevel: state.evidenceLevel,
    approvalEnvelope: verifyApprovalEnvelope(state.approvalEnvelope),
  });
}

export function createFixtureResumeApproval(
  envelopeInput: ApprovalEnvelope,
): Readonly<FixtureResumeApproval> {
  const envelope = verifyApprovalEnvelope(envelopeInput);
  return Object.freeze({
    schemaVersion: FIXTURE_RESUME_APPROVAL_SCHEMA_VERSION,
    decision: "APPROVE_FIXTURE_PRODUCTION",
    runId: envelope.runId,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    approvalDigest: envelope.approvalDigest,
  });
}

export function createFoundationFixtureOnlyHarness(
  capabilities: FixtureCapabilities = {
    previewAllowed: false,
    productionAllowed: false,
  },
): FoundationFixtureOnlyHarness {
  if (
    typeof capabilities.previewAllowed !== "boolean" ||
    typeof capabilities.productionAllowed !== "boolean"
  ) {
    throw new TypeError("fixture capabilities must be explicit booleans");
  }
  const graph = buildFixtureGraph();
  const frozenCapabilities = Object.freeze({ ...capabilities });
  return Object.freeze({
    async start(threadIdInput: string): Promise<FixtureHarnessResult> {
      const threadId = requireThreadId(threadIdInput);
      const output = await graph.invoke(
        {
          runnerCalls: Object.freeze([]),
          productionSideEffects: 0,
          lifecycle: "PLANNED",
          evidenceLevel: "E0",
          approvalEnvelope: null,
          capabilities: frozenCapabilities,
        },
        { configurable: { thread_id: threadId } },
      );
      return normalizeResult(output);
    },
    async resume(
      threadIdInput: string,
      approval: FixtureResumeApproval | unknown,
    ): Promise<FixtureHarnessResult> {
      const threadId = requireThreadId(threadIdInput);
      const output = await graph.invoke(
        new Command({ resume: approval }),
        { configurable: { thread_id: threadId } },
      );
      return normalizeResult(output);
    },
  });
}
