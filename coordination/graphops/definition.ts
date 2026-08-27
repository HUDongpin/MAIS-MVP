import {
  assertJsonSerializable,
  canonicalJson,
  sha256Digest,
} from "./json";
import {
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  getRunnerRegistry,
  type GraphOpsRunnerId,
} from "./registry";

export const GRAPHOPS_GRAPH_DEFINITION_SCHEMA_VERSION =
  "mais-graphops-graph-definition.v1" as const;
export const GRAPHOPS_GRAPH_ID = "mais.release.v1" as const;
export const GRAPHOPS_GRAPH_VERSION = "1.0.0" as const;
export const GRAPHOPS_APPROVAL_CONTROL_NODE =
  "control.await-production-approval" as const;

export type GraphTransitionKind =
  | "PASS"
  | "FAILURE"
  | "RESUME_APPROVED"
  | "ROLLBACK_REQUIRED";
export type TrafficEffectStatus = "APPLIED" | "UNKNOWN";
export type GraphNodeId =
  | GraphOpsRunnerId
  | typeof GRAPHOPS_APPROVAL_CONTROL_NODE;

export interface GraphEdge {
  readonly from: GraphNodeId;
  readonly to: GraphNodeId;
  readonly on: GraphTransitionKind;
  readonly effectStatuses?: readonly TrafficEffectStatus[];
}

export interface GraphDefinitionBody {
  readonly schemaVersion: typeof GRAPHOPS_GRAPH_DEFINITION_SCHEMA_VERSION;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly version: typeof GRAPHOPS_GRAPH_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly runnerRegistryDigest: string;
  readonly nodes: readonly GraphNodeId[];
  readonly edges: readonly Readonly<GraphEdge>[];
  readonly capabilities: Readonly<{
    readonly previewAllowed: false;
    readonly productionAllowed: false;
  }>;
}

export interface GraphDefinition extends GraphDefinitionBody {
  readonly graphSpecDigest: string;
}

const NORMAL_EDGES: readonly Readonly<GraphEdge>[] = Object.freeze([
  ...GRAPHOPS_RUNNER_IDS.slice(0, 7).map((from, index) =>
    Object.freeze({ from, to: GRAPHOPS_RUNNER_IDS[index + 1], on: "PASS" as const }),
  ),
  Object.freeze({
    from: GRAPHOPS_RUNNER_IDS[7],
    to: GRAPHOPS_APPROVAL_CONTROL_NODE,
    on: "PASS" as const,
  }),
  Object.freeze({
    from: GRAPHOPS_APPROVAL_CONTROL_NODE,
    to: GRAPHOPS_RUNNER_IDS[8],
    on: "RESUME_APPROVED" as const,
  }),
  ...GRAPHOPS_RUNNER_IDS.slice(8, 14).map((from, index) =>
    Object.freeze({
      from,
      to: GRAPHOPS_RUNNER_IDS[index + 9],
      on: "PASS" as const,
    }),
  ),
  Object.freeze({
    from: GRAPHOPS_RUNNER_IDS[14],
    to: GRAPHOPS_RUNNER_IDS[16],
    on: "PASS" as const,
  }),
]);

const ROLLBACK_EDGES: readonly Readonly<GraphEdge>[] = Object.freeze([
  Object.freeze({
    from: GRAPHOPS_RUNNER_IDS[13],
    to: GRAPHOPS_RUNNER_IDS[15],
    on: "ROLLBACK_REQUIRED" as const,
    effectStatuses: Object.freeze(["APPLIED", "UNKNOWN"] as const),
  }),
  Object.freeze({
    from: GRAPHOPS_RUNNER_IDS[14],
    to: GRAPHOPS_RUNNER_IDS[15],
    on: "FAILURE" as const,
  }),
]);

const GRAPH_DEFINITION_BODY: Readonly<GraphDefinitionBody> = Object.freeze({
  schemaVersion: GRAPHOPS_GRAPH_DEFINITION_SCHEMA_VERSION,
  graphId: GRAPHOPS_GRAPH_ID,
  version: GRAPHOPS_GRAPH_VERSION,
  registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
  runnerRegistryDigest: sha256Digest(getRunnerRegistry()),
  nodes: Object.freeze([
    ...GRAPHOPS_RUNNER_IDS.slice(0, 8),
    GRAPHOPS_APPROVAL_CONTROL_NODE,
    ...GRAPHOPS_RUNNER_IDS.slice(8),
  ]),
  edges: Object.freeze([...NORMAL_EDGES, ...ROLLBACK_EDGES]),
  capabilities: Object.freeze({
    previewAllowed: false as const,
    productionAllowed: false as const,
  }),
});

export const GRAPHOPS_GRAPH_DEFINITION: Readonly<GraphDefinition> =
  Object.freeze({
    ...GRAPH_DEFINITION_BODY,
    graphSpecDigest: sha256Digest(GRAPH_DEFINITION_BODY),
  });

export function getGraphSpecDigest(): string {
  return GRAPHOPS_GRAPH_DEFINITION.graphSpecDigest;
}

export function getRunnerRegistryDigest(): string {
  return GRAPHOPS_GRAPH_DEFINITION.runnerRegistryDigest;
}

export function validateGraphDefinition(input: unknown): Readonly<GraphDefinition> {
  assertJsonSerializable(input, "graphDefinition");
  if (canonicalJson(input) !== canonicalJson(GRAPHOPS_GRAPH_DEFINITION)) {
    throw new TypeError("input drifted from the fixed mais.release.v1 graph definition");
  }
  return GRAPHOPS_GRAPH_DEFINITION;
}

export function isLegalGraphSuccessor(
  previous: GraphOpsRunnerId | null,
  next: GraphOpsRunnerId,
): boolean {
  if (previous === null) {
    return next === GRAPHOPS_RUNNER_IDS[0];
  }
  return GRAPHOPS_GRAPH_DEFINITION.edges.some(
    (edge) => edge.from === previous && edge.to === next && edge.on === "PASS",
  );
}
