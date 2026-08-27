export const GRAPHOPS_RUNNER_REGISTRY_VERSION =
  "mais-graphops-runner-registry.v1" as const;

export const GRAPHOPS_RUNNER_IDS = Object.freeze([
  "git.bind-protected-main",
  "release.owner-currentness",
  "github.required-checks",
  "release.build-gate",
  "vercel.prepare-staging",
  "vercel.deploy-preview",
  "vercel.inspect-preview",
  "smoke.preview-readonly",
  "github.verify-production-approval",
  "schema.production-preflight",
  "schema.production-apply",
  "vercel.deploy-production-candidate",
  "vercel.verify-production-candidate",
  "vercel.promote",
  "smoke.production-readonly",
  "vercel.restore-previous",
  "release.closeout",
] as const);

export const NODE_OUTCOMES = Object.freeze([
  "PASS",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "REJECTED",
  "INCONCLUSIVE",
  "ROLLED_BACK",
  "CANCELLED",
  "FAILED_INTERNAL",
] as const);

export const SIDE_EFFECT_CLASSES = Object.freeze([
  "READ_ONLY",
  "LOCAL_EPHEMERAL_WRITE",
  "EXTERNAL_PREVIEW_WRITE",
  "PRODUCTION_SCHEMA_WRITE",
  "PRODUCTION_DEPLOYMENT_WRITE",
  "PRODUCTION_TRAFFIC_SWITCH",
  "COMPENSATING_ROLLBACK",
] as const);

export const LIFECYCLE_STATES = Object.freeze([
  "PLANNED",
  "VALIDATING",
  "PREVIEW_DEPLOYED",
  "PREVIEW_VERIFIED",
  "AWAITING_PRODUCTION_APPROVAL",
  "PRODUCTION_APPROVED",
  "SCHEMA_APPLIED",
  "PRODUCTION_CANDIDATE_VERIFIED",
  "PROMOTED",
  "LIVE_VERIFIED",
  "CLOSED",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "REJECTED",
  "INCONCLUSIVE",
  "ROLLED_BACK",
  "CANCELLED",
  "FAILED_INTERNAL",
] as const);

export const EVIDENCE_LEVELS = Object.freeze([
  "E0",
  "E1",
  "E2",
  "E3",
  "E4",
  "E5",
  "E6",
  "E7",
] as const);

export type GraphOpsRunnerId = (typeof GRAPHOPS_RUNNER_IDS)[number];
export type NodeOutcome = (typeof NODE_OUTCOMES)[number];
export type SideEffectClass = (typeof SIDE_EFFECT_CLASSES)[number];
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export type AuthorizationClass =
  | "none"
  | "preview-authorized"
  | "production-owner";
export type GraphOpsRole =
  | "A10"
  | "A11"
  | "A12"
  | "A19"
  | "A22"
  | "A23"
  | "A25";
export type RetryableCategory =
  | "read-transient"
  | "runner-infrastructure-transient";

export interface RetryPolicy {
  readonly maxAttempts: 1 | 3;
  readonly backoff: "none" | "short-exponential";
  readonly retryableCategories: readonly RetryableCategory[];
  readonly reconcileBeforeRetry: boolean;
}

export interface NodeSpec {
  readonly id: GraphOpsRunnerId;
  readonly version: "1.0.0";
  readonly ownerRole: GraphOpsRole;
  readonly reviewerRoles: readonly GraphOpsRole[];
  readonly runnerId: GraphOpsRunnerId;
  readonly dependsOn: readonly GraphOpsRunnerId[];
  readonly inputSchema: string;
  readonly outputSchema: string;
  readonly requiredEvidence: readonly string[];
  readonly allowedReadScopes: readonly string[];
  readonly allowedWriteScopes: readonly string[];
  readonly sideEffectClass: SideEffectClass;
  readonly authorizationClass: AuthorizationClass;
  readonly timeoutMs: number;
  readonly retryPolicy: Readonly<RetryPolicy>;
  readonly terminalOutcomes: readonly NodeOutcome[];
}

type NodeSpecInput = Omit<
  NodeSpec,
  "id" | "version" | "inputSchema" | "outputSchema"
>;

const STANDARD_OUTCOMES = Object.freeze([
  "PASS",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "INCONCLUSIVE",
  "CANCELLED",
  "FAILED_INTERNAL",
] as const satisfies readonly NodeOutcome[]);
const APPROVAL_OUTCOMES = Object.freeze([
  "PASS",
  "BLOCKED",
  "REJECTED",
  "INCONCLUSIVE",
  "CANCELLED",
  "FAILED_INTERNAL",
] as const satisfies readonly NodeOutcome[]);
const ROLLBACK_OUTCOMES = Object.freeze([
  "ROLLED_BACK",
  "BLOCKED",
  "REPAIR_REQUIRED",
  "INCONCLUSIVE",
  "CANCELLED",
  "FAILED_INTERNAL",
] as const satisfies readonly NodeOutcome[]);

function readRetry(): Readonly<RetryPolicy> {
  return Object.freeze({
    maxAttempts: 3,
    backoff: "short-exponential",
    retryableCategories: Object.freeze([
      "read-transient",
      "runner-infrastructure-transient",
    ] as const),
    reconcileBeforeRetry: false,
  });
}

function singleAttempt(reconcileBeforeRetry: boolean): Readonly<RetryPolicy> {
  return Object.freeze({
    maxAttempts: 1,
    backoff: "none",
    retryableCategories: Object.freeze([]),
    reconcileBeforeRetry,
  });
}

function node(input: NodeSpecInput): Readonly<NodeSpec> {
  const schemaId = input.runnerId.replace(/[^a-z0-9]+/gi, "-");
  return Object.freeze({
    id: input.runnerId,
    version: "1.0.0",
    ownerRole: input.ownerRole,
    reviewerRoles: Object.freeze([...input.reviewerRoles]),
    runnerId: input.runnerId,
    dependsOn: Object.freeze([...input.dependsOn]),
    inputSchema: `mais.graphops.schema.${schemaId}.input.v1`,
    outputSchema: `mais.graphops.schema.${schemaId}.output.v1`,
    requiredEvidence: Object.freeze([...input.requiredEvidence]),
    allowedReadScopes: Object.freeze([...input.allowedReadScopes]),
    allowedWriteScopes: Object.freeze([...input.allowedWriteScopes]),
    sideEffectClass: input.sideEffectClass,
    authorizationClass: input.authorizationClass,
    timeoutMs: input.timeoutMs,
    retryPolicy: input.retryPolicy,
    terminalOutcomes: Object.freeze([...input.terminalOutcomes]),
  });
}

const RUNNER_REGISTRY: readonly Readonly<NodeSpec>[] = Object.freeze([
  node({ runnerId: GRAPHOPS_RUNNER_IDS[0], ownerRole: "A22", reviewerRoles: ["A10", "A25"], dependsOn: [], requiredEvidence: ["protected-main-binding"], allowedReadScopes: ["git:protected-main", "git:candidate"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "none", timeoutMs: 30_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[1], ownerRole: "A25", reviewerRoles: ["A10", "A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[0]], requiredEvidence: ["owner-currentness"], allowedReadScopes: ["release:owner-records"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "none", timeoutMs: 30_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[2], ownerRole: "A11", reviewerRoles: ["A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[1]], requiredEvidence: ["required-checks"], allowedReadScopes: ["github:required-checks"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "none", timeoutMs: 60_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[3], ownerRole: "A22", reviewerRoles: ["A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[2]], requiredEvidence: ["isolated-build-result"], allowedReadScopes: ["repo:source-tree", "build:toolchain"], allowedWriteScopes: ["local:ephemeral-build"], sideEffectClass: "LOCAL_EPHEMERAL_WRITE", authorizationClass: "none", timeoutMs: 900_000, retryPolicy: singleAttempt(false), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[4], ownerRole: "A22", reviewerRoles: ["A10", "A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[3]], requiredEvidence: ["staging-plan-binding"], allowedReadScopes: ["repo:source-tree", "build:evidence"], allowedWriteScopes: ["local:ephemeral-staging"], sideEffectClass: "LOCAL_EPHEMERAL_WRITE", authorizationClass: "preview-authorized", timeoutMs: 300_000, retryPolicy: singleAttempt(false), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[5], ownerRole: "A22", reviewerRoles: ["A11", "A19"], dependsOn: [GRAPHOPS_RUNNER_IDS[4]], requiredEvidence: ["preview-deployment-binding"], allowedReadScopes: ["local:sealed-staging", "vercel:project-config"], allowedWriteScopes: ["vercel:preview-deployments"], sideEffectClass: "EXTERNAL_PREVIEW_WRITE", authorizationClass: "preview-authorized", timeoutMs: 900_000, retryPolicy: singleAttempt(true), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[6], ownerRole: "A22", reviewerRoles: ["A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[5]], requiredEvidence: ["preview-provider-readback"], allowedReadScopes: ["vercel:preview-deployments"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "preview-authorized", timeoutMs: 60_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[7], ownerRole: "A11", reviewerRoles: ["A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[6]], requiredEvidence: ["preview-readonly-smoke"], allowedReadScopes: ["preview:readonly-surface"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "preview-authorized", timeoutMs: 120_000, retryPolicy: singleAttempt(false), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[8], ownerRole: "A10", reviewerRoles: ["A11", "A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[7]], requiredEvidence: ["production-owner-approval"], allowedReadScopes: ["github:approval-history", "graphops:approval-challenge"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "production-owner", timeoutMs: 60_000, retryPolicy: readRetry(), terminalOutcomes: APPROVAL_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[9], ownerRole: "A12", reviewerRoles: ["A19", "A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[8]], requiredEvidence: ["production-schema-plan"], allowedReadScopes: ["production:schema-metadata"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "production-owner", timeoutMs: 120_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[10], ownerRole: "A12", reviewerRoles: ["A19", "A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[9]], requiredEvidence: ["production-schema-attestation"], allowedReadScopes: ["production:schema-metadata"], allowedWriteScopes: ["production:schema"], sideEffectClass: "PRODUCTION_SCHEMA_WRITE", authorizationClass: "production-owner", timeoutMs: 600_000, retryPolicy: singleAttempt(true), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[11], ownerRole: "A22", reviewerRoles: ["A11", "A19"], dependsOn: [GRAPHOPS_RUNNER_IDS[10]], requiredEvidence: ["production-candidate-binding"], allowedReadScopes: ["local:sealed-staging", "vercel:project-config"], allowedWriteScopes: ["vercel:production-candidates"], sideEffectClass: "PRODUCTION_DEPLOYMENT_WRITE", authorizationClass: "production-owner", timeoutMs: 900_000, retryPolicy: singleAttempt(true), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[12], ownerRole: "A22", reviewerRoles: ["A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[11]], requiredEvidence: ["production-candidate-readback"], allowedReadScopes: ["vercel:production-candidates"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "production-owner", timeoutMs: 120_000, retryPolicy: readRetry(), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[13], ownerRole: "A22", reviewerRoles: ["A10", "A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[12]], requiredEvidence: ["production-promotion-binding"], allowedReadScopes: ["vercel:production-aliases", "graphops:previous-production-binding"], allowedWriteScopes: ["vercel:production-aliases"], sideEffectClass: "PRODUCTION_TRAFFIC_SWITCH", authorizationClass: "production-owner", timeoutMs: 300_000, retryPolicy: singleAttempt(true), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[14], ownerRole: "A11", reviewerRoles: ["A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[13]], requiredEvidence: ["production-readonly-smoke"], allowedReadScopes: ["production:readonly-surface", "vercel:production-aliases"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "production-owner", timeoutMs: 120_000, retryPolicy: singleAttempt(false), terminalOutcomes: STANDARD_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[15], ownerRole: "A22", reviewerRoles: ["A10", "A11"], dependsOn: [GRAPHOPS_RUNNER_IDS[13]], requiredEvidence: ["previous-production-restoration"], allowedReadScopes: ["vercel:production-aliases", "graphops:previous-production-binding"], allowedWriteScopes: ["vercel:production-aliases"], sideEffectClass: "COMPENSATING_ROLLBACK", authorizationClass: "production-owner", timeoutMs: 300_000, retryPolicy: singleAttempt(true), terminalOutcomes: ROLLBACK_OUTCOMES }),
  node({ runnerId: GRAPHOPS_RUNNER_IDS[16], ownerRole: "A25", reviewerRoles: ["A10", "A11", "A22"], dependsOn: [GRAPHOPS_RUNNER_IDS[14]], requiredEvidence: ["release-closeout"], allowedReadScopes: ["graphops:receipt-ledger", "release:owner-records"], allowedWriteScopes: [], sideEffectClass: "READ_ONLY", authorizationClass: "production-owner", timeoutMs: 60_000, retryPolicy: singleAttempt(false), terminalOutcomes: STANDARD_OUTCOMES }),
]);

export function getRunnerRegistry(): readonly Readonly<NodeSpec>[] {
  return RUNNER_REGISTRY;
}

export function getNodeSpec(runnerId: GraphOpsRunnerId): Readonly<NodeSpec> {
  const spec = RUNNER_REGISTRY.find((candidate) => candidate.runnerId === runnerId);
  if (!spec) {
    throw new TypeError(`Runner is not registered: ${String(runnerId)}`);
  }
  return spec;
}
