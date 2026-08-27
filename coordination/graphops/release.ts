import {
  type CandidateBinding,
  type GraphManifest,
  validateGraphManifest,
} from "./contracts";
import {
  GRAPHOPS_GRAPH_ID,
  GRAPHOPS_GRAPH_VERSION,
  getGraphSpecDigest,
  getRunnerRegistryDigest,
  isLegalGraphSuccessor,
} from "./definition";
import {
  assertJsonSerializable,
  canonicalJson,
  sha256Digest,
} from "./json";
import {
  EVIDENCE_LEVELS,
  GRAPHOPS_RUNNER_IDS,
  GRAPHOPS_RUNNER_REGISTRY_VERSION,
  LIFECYCLE_STATES,
  NODE_OUTCOMES,
  getNodeSpec,
  type EvidenceLevel,
  type GraphOpsRunnerId,
  type LifecycleState,
  type NodeOutcome,
} from "./registry";

export const RELEASE_STATE_SCHEMA_VERSION =
  "mais-graphops-release-state.v1" as const;
export const RECEIPT_SCHEMA_VERSION = "mais-graphops-receipt.v1" as const;

export interface ReceiptStateBinding {
  readonly lifecycle: LifecycleState;
  readonly evidenceLevel: EvidenceLevel;
}

export interface Receipt {
  readonly schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly graphVersion: typeof GRAPHOPS_GRAPH_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly runId: string;
  readonly manifestDigest: string;
  readonly runnerId: GraphOpsRunnerId;
  readonly sequence: number;
  readonly attempt: 1;
  readonly correlationId: string;
  readonly causationEventId: string;
  readonly sourceSha: string;
  readonly treeSha: string;
  readonly runnerReleaseDigest: string;
  readonly outcome: NodeOutcome;
  readonly evidenceDigest: string;
  readonly rawInputDigest: string;
  readonly semanticInputDigest: string;
  readonly rawOutputDigest: string;
  readonly semanticOutputDigest: string;
  readonly stateBefore: Readonly<ReceiptStateBinding>;
  readonly stateAfter: Readonly<ReceiptStateBinding>;
  readonly artifactRefs: readonly [];
  readonly sideEffects: readonly [];
  readonly approvalEnvelopeDigest: null;
  readonly previousRawReceiptDigest: string | null;
  readonly previousSemanticReceiptDigest: string | null;
  readonly producedAt: string;
  readonly rawReceiptDigest: string;
  readonly semanticReceiptDigest: string;
}

export interface ReleaseBlocker {
  readonly runnerId: GraphOpsRunnerId;
  readonly outcome: Exclude<NodeOutcome, "PASS" | "ROLLED_BACK">;
  readonly evidenceDigest: string;
}

export interface FoundationSchemaState {
  readonly status: "NOT_PLANNED";
  readonly sourcePlanDigest: null;
}

export interface ReleaseState {
  readonly schemaVersion: typeof RELEASE_STATE_SCHEMA_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly graphVersion: typeof GRAPHOPS_GRAPH_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly runId: string;
  readonly threadId: string;
  readonly candidate: Readonly<CandidateBinding>;
  readonly manifestDigest: string;
  readonly lifecycle: LifecycleState;
  readonly evidenceLevel: EvidenceLevel;
  readonly nodeReceipts: readonly Readonly<Receipt>[];
  readonly preview: null;
  readonly approval: null;
  readonly productionCandidate: null;
  readonly previousProduction: null;
  readonly schema: Readonly<FoundationSchemaState>;
  readonly sideEffects: readonly [];
  readonly blocker: Readonly<ReleaseBlocker> | null;
}

export interface CreateReceiptInput {
  readonly manifest: GraphManifest;
  readonly state: ReleaseState;
  readonly runnerId: GraphOpsRunnerId;
  readonly outcome: NodeOutcome;
  readonly evidenceDigest: string;
  readonly producedAt: string;
}

interface ReceiptSemanticPayload {
  readonly schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  readonly registryVersion: typeof GRAPHOPS_RUNNER_REGISTRY_VERSION;
  readonly graphId: typeof GRAPHOPS_GRAPH_ID;
  readonly graphVersion: typeof GRAPHOPS_GRAPH_VERSION;
  readonly graphSpecDigest: string;
  readonly runnerRegistryDigest: string;
  readonly runnerId: GraphOpsRunnerId;
  readonly sequence: number;
  readonly attempt: 1;
  readonly sourceSha: string;
  readonly treeSha: string;
  readonly runnerReleaseDigest: string;
  readonly outcome: NodeOutcome;
  readonly evidenceDigest: string;
  readonly semanticInputDigest: string;
  readonly semanticOutputDigest: string;
  readonly stateBefore: Readonly<ReceiptStateBinding>;
  readonly stateAfter: Readonly<ReceiptStateBinding>;
  readonly artifactRefs: readonly [];
  readonly sideEffects: readonly [];
  readonly approvalEnvelopeDigest: null;
  readonly previousSemanticReceiptDigest: string | null;
}

const RECEIPT_KEYS = Object.freeze([
  "schemaVersion",
  "registryVersion",
  "graphId",
  "graphVersion",
  "graphSpecDigest",
  "runnerRegistryDigest",
  "runId",
  "manifestDigest",
  "runnerId",
  "sequence",
  "attempt",
  "correlationId",
  "causationEventId",
  "sourceSha",
  "treeSha",
  "runnerReleaseDigest",
  "outcome",
  "evidenceDigest",
  "rawInputDigest",
  "semanticInputDigest",
  "rawOutputDigest",
  "semanticOutputDigest",
  "stateBefore",
  "stateAfter",
  "artifactRefs",
  "sideEffects",
  "approvalEnvelopeDigest",
  "previousRawReceiptDigest",
  "previousSemanticReceiptDigest",
  "producedAt",
  "rawReceiptDigest",
  "semanticReceiptDigest",
] as const);

const RELEASE_STATE_KEYS = Object.freeze([
  "schemaVersion",
  "registryVersion",
  "graphId",
  "graphVersion",
  "graphSpecDigest",
  "runnerRegistryDigest",
  "runId",
  "threadId",
  "candidate",
  "manifestDigest",
  "lifecycle",
  "evidenceLevel",
  "nodeReceipts",
  "preview",
  "approval",
  "productionCandidate",
  "previousProduction",
  "schema",
  "sideEffects",
  "blocker",
] as const);

const PASS_TRANSITIONS: Readonly<
  Record<
    (typeof GRAPHOPS_RUNNER_IDS)[0 | 1 | 2],
    readonly [LifecycleState, EvidenceLevel]
  >
> = Object.freeze({
  "git.bind-protected-main": Object.freeze(["VALIDATING", "E0"] as const),
  "release.owner-currentness": Object.freeze(["VALIDATING", "E0"] as const),
  "github.required-checks": Object.freeze(["VALIDATING", "E3"] as const),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be a plain JSON object`);
  }
  return value;
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  path: string,
): void {
  if (
    canonicalJson(Object.keys(value).sort()) !==
    canonicalJson([...expected].sort())
  ) {
    throw new TypeError(
      `${path} must contain exactly: ${[...expected].sort().join(", ")}`,
    );
  }
}

function requireDigest(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function requireNullableDigest(value: unknown, path: string): string | null {
  return value === null ? null : requireDigest(value, path);
}

function requireIsoTimestamp(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new TypeError(`${path} must be a canonical ISO-8601 UTC timestamp`);
  }
  return value;
}

function requireIdentifier(value: unknown, path: string): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,127})$/.test(value)
  ) {
    throw new TypeError(`${path} must be a safe 1-128 character identifier`);
  }
  return value;
}

function requireGitObjectId(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase 40-character Git object ID`);
  }
  return value;
}

function requireCandidate(value: unknown, path: string): Readonly<CandidateBinding> {
  const candidate = requireRecord(value, path);
  assertExactKeys(candidate, ["commitSha", "treeSha"], path);
  return Object.freeze({
    commitSha: requireGitObjectId(candidate.commitSha, `${path}.commitSha`),
    treeSha: requireGitObjectId(candidate.treeSha, `${path}.treeSha`),
  });
}

function requireLifecycle(value: unknown, path: string): LifecycleState {
  if (
    typeof value !== "string" ||
    !LIFECYCLE_STATES.includes(value as LifecycleState)
  ) {
    throw new TypeError(`${path} is not an approved lifecycle state`);
  }
  return value as LifecycleState;
}

function requireEvidenceLevel(value: unknown, path: string): EvidenceLevel {
  if (
    typeof value !== "string" ||
    !EVIDENCE_LEVELS.includes(value as EvidenceLevel)
  ) {
    throw new TypeError(`${path} is not an approved evidence level`);
  }
  return value as EvidenceLevel;
}

function requireOutcome(value: unknown, path: string): NodeOutcome {
  if (typeof value !== "string" || !NODE_OUTCOMES.includes(value as NodeOutcome)) {
    throw new TypeError(`${path} is not an approved NodeOutcome`);
  }
  return value as NodeOutcome;
}

function requireStateBinding(
  value: unknown,
  path: string,
): Readonly<ReceiptStateBinding> {
  const record = requireRecord(value, path);
  assertExactKeys(record, ["lifecycle", "evidenceLevel"], path);
  return Object.freeze({
    lifecycle: requireLifecycle(record.lifecycle, `${path}.lifecycle`),
    evidenceLevel: requireEvidenceLevel(
      record.evidenceLevel,
      `${path}.evidenceLevel`,
    ),
  });
}

function requireEmptyArray(value: unknown, path: string): readonly [] {
  if (!Array.isArray(value) || value.length !== 0) {
    throw new TypeError(`${path} must be an empty Foundation array`);
  }
  return Object.freeze([]);
}

function requireSchemaState(value: unknown): Readonly<FoundationSchemaState> {
  const record = requireRecord(value, "releaseState.schema");
  assertExactKeys(
    record,
    ["status", "sourcePlanDigest"],
    "releaseState.schema",
  );
  if (record.status !== "NOT_PLANNED" || record.sourcePlanDigest !== null) {
    throw new TypeError("Foundation releaseState.schema must remain NOT_PLANNED");
  }
  return Object.freeze({ status: "NOT_PLANNED", sourcePlanDigest: null });
}

function requireBlocker(value: unknown): Readonly<ReleaseBlocker> | null {
  if (value === null) {
    return null;
  }
  const record = requireRecord(value, "releaseState.blocker");
  assertExactKeys(
    record,
    ["runnerId", "outcome", "evidenceDigest"],
    "releaseState.blocker",
  );
  if (typeof record.runnerId !== "string") {
    throw new TypeError("releaseState.blocker.runnerId must be a string");
  }
  const runnerId = getNodeSpec(record.runnerId as GraphOpsRunnerId).runnerId;
  const outcome = requireOutcome(record.outcome, "releaseState.blocker.outcome");
  if (outcome === "PASS" || outcome === "ROLLED_BACK") {
    throw new TypeError("releaseState.blocker requires a failure outcome");
  }
  return Object.freeze({
    runnerId,
    outcome,
    evidenceDigest: requireDigest(
      record.evidenceDigest,
      "releaseState.blocker.evidenceDigest",
    ),
  });
}

function sameCandidate(left: CandidateBinding, right: CandidateBinding): boolean {
  return left.commitSha === right.commitSha && left.treeSha === right.treeSha;
}

function sameState(
  left: ReceiptStateBinding,
  right: ReceiptStateBinding,
): boolean {
  return (
    left.lifecycle === right.lifecycle &&
    left.evidenceLevel === right.evidenceLevel
  );
}

function freezeJson<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) {
      freezeJson(child);
    }
    Object.freeze(value);
  }
  return value;
}

function canonicalClone<T>(value: T): Readonly<T> {
  assertJsonSerializable(value);
  return freezeJson(JSON.parse(canonicalJson(value)) as T);
}

function assertPublicFoundationNode(runnerId: GraphOpsRunnerId): void {
  const spec = getNodeSpec(runnerId);
  if (spec.sideEffectClass !== "READ_ONLY" || spec.authorizationClass !== "none") {
    throw new TypeError(
      `Foundation public receipts are limited to unprivileged read-only validation: ${runnerId}`,
    );
  }
}

function transitionFor(
  runnerId: GraphOpsRunnerId,
  outcome: NodeOutcome,
  evidenceBefore: EvidenceLevel,
): readonly [LifecycleState, EvidenceLevel] {
  const spec = getNodeSpec(runnerId);
  if (!spec.terminalOutcomes.includes(outcome)) {
    throw new TypeError(`outcome is not terminally admitted by NodeSpec: ${outcome}`);
  }
  if (outcome === "PASS") {
    const transition =
      PASS_TRANSITIONS[runnerId as keyof typeof PASS_TRANSITIONS];
    if (!transition) {
      throw new TypeError(`Foundation has no public transition for runner: ${runnerId}`);
    }
    return transition;
  }
  if (outcome === "ROLLED_BACK") {
    throw new TypeError("ROLLED_BACK is not a public Foundation validation outcome");
  }
  return [outcome, evidenceBefore];
}

function semanticInputDigest(input: {
  readonly runnerId: GraphOpsRunnerId;
  readonly sequence: number;
  readonly sourceSha: string;
  readonly treeSha: string;
  readonly runnerReleaseDigest: string;
  readonly stateBefore: Readonly<ReceiptStateBinding>;
  readonly previousSemanticReceiptDigest: string | null;
}): string {
  return sha256Digest({
    schemaVersion: "mais-graphops-semantic-input.v1",
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    ...input,
  });
}

function rawInputDigest(input: {
  readonly semanticInputDigest: string;
  readonly runId: string;
  readonly manifestDigest: string;
  readonly correlationId: string;
  readonly causationEventId: string;
  readonly previousRawReceiptDigest: string | null;
}): string {
  return sha256Digest({
    schemaVersion: "mais-graphops-raw-input.v1",
    ...input,
  });
}

function semanticOutputDigest(input: {
  readonly outcome: NodeOutcome;
  readonly evidenceDigest: string;
  readonly stateAfter: Readonly<ReceiptStateBinding>;
  readonly artifactRefs: readonly [];
  readonly sideEffects: readonly [];
}): string {
  return sha256Digest({
    schemaVersion: "mais-graphops-semantic-output.v1",
    ...input,
  });
}

function rawOutputDigest(input: {
  readonly semanticOutputDigest: string;
  readonly producedAt: string;
  readonly correlationId: string;
}): string {
  return sha256Digest({
    schemaVersion: "mais-graphops-raw-output.v1",
    ...input,
  });
}

function semanticReceiptPayload(
  input: ReceiptSemanticPayload,
): ReceiptSemanticPayload {
  return input;
}

function rawReceiptPayload(
  semantic: ReceiptSemanticPayload,
  input: {
    readonly runId: string;
    readonly manifestDigest: string;
    readonly correlationId: string;
    readonly causationEventId: string;
    readonly rawInputDigest: string;
    readonly rawOutputDigest: string;
    readonly previousRawReceiptDigest: string | null;
    readonly producedAt: string;
    readonly semanticReceiptDigest: string;
  },
): Omit<Receipt, "rawReceiptDigest"> {
  return { ...semantic, ...input };
}

function assertManifestStateBinding(
  manifest: GraphManifest,
  state: ReleaseState,
): void {
  if (
    state.registryVersion !== manifest.registryVersion ||
    state.graphId !== manifest.graphId ||
    state.graphVersion !== manifest.graphVersion ||
    state.graphSpecDigest !== manifest.graphSpecDigest ||
    state.runnerRegistryDigest !== manifest.runnerRegistryDigest ||
    state.runId !== manifest.runId ||
    state.manifestDigest !== sha256Digest(manifest) ||
    !sameCandidate(state.candidate, manifest.candidate)
  ) {
    throw new TypeError("release state is stale or drifted from the manifest binding");
  }
}

function verifyReceiptIntegrity(input: unknown): Readonly<Receipt> {
  assertJsonSerializable(input, "receipt");
  const record = requireRecord(input, "receipt");
  assertExactKeys(record, RECEIPT_KEYS, "receipt");
  if (
    record.schemaVersion !== RECEIPT_SCHEMA_VERSION ||
    record.registryVersion !== GRAPHOPS_RUNNER_REGISTRY_VERSION ||
    record.graphId !== GRAPHOPS_GRAPH_ID ||
    record.graphVersion !== GRAPHOPS_GRAPH_VERSION ||
    record.graphSpecDigest !== getGraphSpecDigest() ||
    record.runnerRegistryDigest !== getRunnerRegistryDigest()
  ) {
    throw new TypeError("receipt contains unsupported or drifted contract versions");
  }
  const runId = requireIdentifier(record.runId, "receipt.runId");
  const manifestDigest = requireDigest(record.manifestDigest, "receipt.manifestDigest");
  if (typeof record.runnerId !== "string") {
    throw new TypeError("receipt.runnerId must be a string");
  }
  const spec = getNodeSpec(record.runnerId as GraphOpsRunnerId);
  assertPublicFoundationNode(spec.runnerId);
  if (!Number.isSafeInteger(record.sequence) || (record.sequence as number) < 1) {
    throw new TypeError("receipt.sequence must be a positive safe integer");
  }
  const sequence = record.sequence as number;
  if (record.attempt !== 1) {
    throw new TypeError("Foundation receipt.attempt must equal 1");
  }
  const correlationId = requireDigest(record.correlationId, "receipt.correlationId");
  const causationEventId = requireDigest(
    record.causationEventId,
    "receipt.causationEventId",
  );
  const sourceSha = requireGitObjectId(record.sourceSha, "receipt.sourceSha");
  const treeSha = requireGitObjectId(record.treeSha, "receipt.treeSha");
  const runnerReleaseDigest = requireDigest(
    record.runnerReleaseDigest,
    "receipt.runnerReleaseDigest",
  );
  if (runnerReleaseDigest !== sha256Digest(spec)) {
    throw new TypeError("receipt runnerReleaseDigest mismatch");
  }
  const outcome = requireOutcome(record.outcome, "receipt.outcome");
  const evidenceDigest = requireDigest(
    record.evidenceDigest,
    "receipt.evidenceDigest",
  );
  const parsedRawInputDigest = requireDigest(
    record.rawInputDigest,
    "receipt.rawInputDigest",
  );
  const parsedSemanticInputDigest = requireDigest(
    record.semanticInputDigest,
    "receipt.semanticInputDigest",
  );
  const parsedRawOutputDigest = requireDigest(
    record.rawOutputDigest,
    "receipt.rawOutputDigest",
  );
  const parsedSemanticOutputDigest = requireDigest(
    record.semanticOutputDigest,
    "receipt.semanticOutputDigest",
  );
  const stateBefore = requireStateBinding(record.stateBefore, "receipt.stateBefore");
  const stateAfter = requireStateBinding(record.stateAfter, "receipt.stateAfter");
  const artifactRefs = requireEmptyArray(record.artifactRefs, "receipt.artifactRefs");
  const sideEffects = requireEmptyArray(record.sideEffects, "receipt.sideEffects");
  if (record.approvalEnvelopeDigest !== null) {
    throw new TypeError("Foundation public receipts cannot carry production authority");
  }
  const previousRawReceiptDigest = requireNullableDigest(
    record.previousRawReceiptDigest,
    "receipt.previousRawReceiptDigest",
  );
  const previousSemanticReceiptDigest = requireNullableDigest(
    record.previousSemanticReceiptDigest,
    "receipt.previousSemanticReceiptDigest",
  );
  const producedAt = requireIsoTimestamp(record.producedAt, "receipt.producedAt");
  const parsedRawReceiptDigest = requireDigest(
    record.rawReceiptDigest,
    "receipt.rawReceiptDigest",
  );
  const parsedSemanticReceiptDigest = requireDigest(
    record.semanticReceiptDigest,
    "receipt.semanticReceiptDigest",
  );
  const [expectedLifecycle, expectedEvidence] = transitionFor(
    spec.runnerId,
    outcome,
    stateBefore.evidenceLevel,
  );
  if (
    stateAfter.lifecycle !== expectedLifecycle ||
    stateAfter.evidenceLevel !== expectedEvidence
  ) {
    throw new TypeError("receipt state transition does not match NodeSpec");
  }
  const expectedSemanticInputDigest = semanticInputDigest({
    runnerId: spec.runnerId,
    sequence,
    sourceSha,
    treeSha,
    runnerReleaseDigest,
    stateBefore,
    previousSemanticReceiptDigest,
  });
  if (expectedSemanticInputDigest !== parsedSemanticInputDigest) {
    throw new TypeError("receipt semanticInputDigest mismatch");
  }
  const expectedRawInputDigest = rawInputDigest({
    semanticInputDigest: parsedSemanticInputDigest,
    runId,
    manifestDigest,
    correlationId,
    causationEventId,
    previousRawReceiptDigest,
  });
  if (expectedRawInputDigest !== parsedRawInputDigest) {
    throw new TypeError("receipt rawInputDigest mismatch");
  }
  const expectedSemanticOutputDigest = semanticOutputDigest({
    outcome,
    evidenceDigest,
    stateAfter,
    artifactRefs,
    sideEffects,
  });
  if (expectedSemanticOutputDigest !== parsedSemanticOutputDigest) {
    throw new TypeError("receipt semanticOutputDigest mismatch");
  }
  const expectedRawOutputDigest = rawOutputDigest({
    semanticOutputDigest: parsedSemanticOutputDigest,
    producedAt,
    correlationId,
  });
  if (expectedRawOutputDigest !== parsedRawOutputDigest) {
    throw new TypeError("receipt rawOutputDigest mismatch");
  }
  const semantic = semanticReceiptPayload({
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runnerId: spec.runnerId,
    sequence,
    attempt: 1,
    sourceSha,
    treeSha,
    runnerReleaseDigest,
    outcome,
    evidenceDigest,
    semanticInputDigest: parsedSemanticInputDigest,
    semanticOutputDigest: parsedSemanticOutputDigest,
    stateBefore,
    stateAfter,
    artifactRefs,
    sideEffects,
    approvalEnvelopeDigest: null,
    previousSemanticReceiptDigest,
  });
  if (sha256Digest(semantic) !== parsedSemanticReceiptDigest) {
    throw new TypeError("receipt semanticReceiptDigest mismatch");
  }
  const raw = rawReceiptPayload(semantic, {
    runId,
    manifestDigest,
    correlationId,
    causationEventId,
    rawInputDigest: parsedRawInputDigest,
    rawOutputDigest: parsedRawOutputDigest,
    previousRawReceiptDigest,
    producedAt,
    semanticReceiptDigest: parsedSemanticReceiptDigest,
  });
  if (sha256Digest(raw) !== parsedRawReceiptDigest) {
    throw new TypeError("receipt rawReceiptDigest mismatch");
  }
  return canonicalClone({
    ...raw,
    rawReceiptDigest: parsedRawReceiptDigest,
  }) as Readonly<Receipt>;
}

export function createReleaseState(input: unknown): Readonly<ReleaseState> {
  const manifest = validateGraphManifest(input);
  return canonicalClone({
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    registryVersion: manifest.registryVersion,
    graphId: manifest.graphId,
    graphVersion: manifest.graphVersion,
    graphSpecDigest: manifest.graphSpecDigest,
    runnerRegistryDigest: manifest.runnerRegistryDigest,
    runId: manifest.runId,
    threadId: manifest.runId,
    candidate: manifest.candidate,
    manifestDigest: sha256Digest(manifest),
    lifecycle: "PLANNED" as const,
    evidenceLevel: "E0" as const,
    nodeReceipts: [],
    preview: null,
    approval: null,
    productionCandidate: null,
    previousProduction: null,
    schema: { status: "NOT_PLANNED" as const, sourcePlanDigest: null },
    sideEffects: [],
    blocker: null,
  }) as Readonly<ReleaseState>;
}

export function validateReleaseState(
  input: unknown,
  options: { readonly manifest?: GraphManifest } = {},
): Readonly<ReleaseState> {
  assertJsonSerializable(input, "releaseState");
  const record = requireRecord(input, "releaseState");
  assertExactKeys(record, RELEASE_STATE_KEYS, "releaseState");
  if (
    record.schemaVersion !== RELEASE_STATE_SCHEMA_VERSION ||
    record.registryVersion !== GRAPHOPS_RUNNER_REGISTRY_VERSION ||
    record.graphId !== GRAPHOPS_GRAPH_ID ||
    record.graphVersion !== GRAPHOPS_GRAPH_VERSION ||
    record.graphSpecDigest !== getGraphSpecDigest() ||
    record.runnerRegistryDigest !== getRunnerRegistryDigest()
  ) {
    throw new TypeError("releaseState contains unsupported or drifted contract versions");
  }
  const runId = requireIdentifier(record.runId, "releaseState.runId");
  const threadId = requireIdentifier(record.threadId, "releaseState.threadId");
  const candidate = requireCandidate(record.candidate, "releaseState.candidate");
  const manifestDigest = requireDigest(record.manifestDigest, "releaseState.manifestDigest");
  const lifecycle = requireLifecycle(record.lifecycle, "releaseState.lifecycle");
  const evidenceLevel = requireEvidenceLevel(
    record.evidenceLevel,
    "releaseState.evidenceLevel",
  );
  if (!Array.isArray(record.nodeReceipts)) {
    throw new TypeError("releaseState.nodeReceipts must be an array");
  }
  if (
    record.preview !== null ||
    record.approval !== null ||
    record.productionCandidate !== null ||
    record.previousProduction !== null
  ) {
    throw new TypeError("Foundation release state cannot contain activation bindings");
  }
  const schema = requireSchemaState(record.schema);
  const sideEffects = requireEmptyArray(
    record.sideEffects,
    "releaseState.sideEffects",
  );
  const blocker = requireBlocker(record.blocker);
  const nodeReceipts = record.nodeReceipts.map((receipt) =>
    verifyReceiptIntegrity(receipt),
  );
  let expectedState: ReceiptStateBinding = {
    lifecycle: "PLANNED",
    evidenceLevel: "E0",
  };
  let expectedBlocker: Readonly<ReleaseBlocker> | null = null;
  let previousRunnerId: GraphOpsRunnerId | null = null;
  let previousRawReceiptDigest: string | null = null;
  let previousSemanticReceiptDigest: string | null = null;
  for (const [index, receipt] of nodeReceipts.entries()) {
    if (
      expectedBlocker !== null ||
      !isLegalGraphSuccessor(previousRunnerId, receipt.runnerId) ||
      receipt.sequence !== index + 1 ||
      receipt.runId !== runId ||
      receipt.manifestDigest !== manifestDigest ||
      receipt.sourceSha !== candidate.commitSha ||
      receipt.treeSha !== candidate.treeSha ||
      !sameState(receipt.stateBefore, expectedState) ||
      receipt.previousRawReceiptDigest !== previousRawReceiptDigest ||
      receipt.previousSemanticReceiptDigest !== previousSemanticReceiptDigest
    ) {
      throw new TypeError(
        "releaseState receipt transition/chain is stale, reordered, or drifted",
      );
    }
    expectedState = receipt.stateAfter;
    if (receipt.outcome !== "PASS") {
      expectedBlocker = Object.freeze({
        runnerId: receipt.runnerId,
        outcome: receipt.outcome as Exclude<NodeOutcome, "PASS" | "ROLLED_BACK">,
        evidenceDigest: receipt.semanticOutputDigest,
      });
    }
    previousRunnerId = receipt.runnerId;
    previousRawReceiptDigest = receipt.rawReceiptDigest;
    previousSemanticReceiptDigest = receipt.semanticReceiptDigest;
  }
  if (
    lifecycle !== expectedState.lifecycle ||
    evidenceLevel !== expectedState.evidenceLevel ||
    canonicalJson(blocker) !== canonicalJson(expectedBlocker)
  ) {
    throw new TypeError("releaseState terminal state/blocker does not match receipts");
  }
  const normalized = canonicalClone({
    schemaVersion: RELEASE_STATE_SCHEMA_VERSION,
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runId,
    threadId,
    candidate,
    manifestDigest,
    lifecycle,
    evidenceLevel,
    nodeReceipts,
    preview: null,
    approval: null,
    productionCandidate: null,
    previousProduction: null,
    schema,
    sideEffects,
    blocker,
  }) as Readonly<ReleaseState>;
  if (options.manifest) {
    assertManifestStateBinding(validateGraphManifest(options.manifest), normalized);
  }
  return normalized;
}

export function createReceipt(input: CreateReceiptInput): Readonly<Receipt> {
  const record = requireRecord(input, "createReceipt");
  assertExactKeys(
    record,
    [
      "manifest",
      "state",
      "runnerId",
      "outcome",
      "evidenceDigest",
      "producedAt",
    ],
    "createReceipt",
  );
  const manifest = validateGraphManifest(record.manifest);
  const state = validateReleaseState(record.state, { manifest });
  if (typeof record.runnerId !== "string") {
    throw new TypeError("runnerId must be a string");
  }
  const spec = getNodeSpec(record.runnerId as GraphOpsRunnerId);
  assertPublicFoundationNode(spec.runnerId);
  if (state.blocker) {
    throw new TypeError("blocked Foundation state cannot produce another receipt");
  }
  const previous = state.nodeReceipts.at(-1);
  if (!isLegalGraphSuccessor(previous?.runnerId ?? null, spec.runnerId)) {
    throw new TypeError(
      previous
        ? `runner is not a legal next node after ${previous.runnerId}: ${spec.runnerId}`
        : `receipt must start with the fixed first node: ${GRAPHOPS_RUNNER_IDS[0]}`,
    );
  }
  if (state.nodeReceipts.some((receipt) => receipt.runnerId === spec.runnerId)) {
    throw new TypeError(`runner already has a receipt: ${spec.runnerId}`);
  }
  const outcome = requireOutcome(record.outcome, "outcome");
  const evidenceDigest = requireDigest(
    record.evidenceDigest,
    "evidenceDigest",
  );
  const producedAt = requireIsoTimestamp(record.producedAt, "producedAt");
  const stateBefore = Object.freeze({
    lifecycle: state.lifecycle,
    evidenceLevel: state.evidenceLevel,
  });
  const [lifecycleAfter, evidenceLevelAfter] = transitionFor(
    spec.runnerId,
    outcome,
    state.evidenceLevel,
  );
  const stateAfter = Object.freeze({
    lifecycle: lifecycleAfter,
    evidenceLevel: evidenceLevelAfter,
  });
  const sequence = state.nodeReceipts.length + 1;
  const correlationId = sha256Digest({
    schemaVersion: "mais-graphops-correlation.v1",
    graphId: GRAPHOPS_GRAPH_ID,
    runId: manifest.runId,
  });
  const causationEventId =
    previous?.rawReceiptDigest ?? state.manifestDigest;
  const runnerReleaseDigest = sha256Digest(spec);
  const previousRawReceiptDigest = previous?.rawReceiptDigest ?? null;
  const previousSemanticReceiptDigest =
    previous?.semanticReceiptDigest ?? null;
  const parsedSemanticInputDigest = semanticInputDigest({
    runnerId: spec.runnerId,
    sequence,
    sourceSha: manifest.candidate.commitSha,
    treeSha: manifest.candidate.treeSha,
    runnerReleaseDigest,
    stateBefore,
    previousSemanticReceiptDigest,
  });
  const parsedRawInputDigest = rawInputDigest({
    semanticInputDigest: parsedSemanticInputDigest,
    runId: manifest.runId,
    manifestDigest: state.manifestDigest,
    correlationId,
    causationEventId,
    previousRawReceiptDigest,
  });
  const artifactRefs = Object.freeze([]) as readonly [];
  const sideEffects = Object.freeze([]) as readonly [];
  const parsedSemanticOutputDigest = semanticOutputDigest({
    outcome,
    evidenceDigest,
    stateAfter,
    artifactRefs,
    sideEffects,
  });
  const parsedRawOutputDigest = rawOutputDigest({
    semanticOutputDigest: parsedSemanticOutputDigest,
    producedAt,
    correlationId,
  });
  const semantic = semanticReceiptPayload({
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    registryVersion: GRAPHOPS_RUNNER_REGISTRY_VERSION,
    graphId: GRAPHOPS_GRAPH_ID,
    graphVersion: GRAPHOPS_GRAPH_VERSION,
    graphSpecDigest: getGraphSpecDigest(),
    runnerRegistryDigest: getRunnerRegistryDigest(),
    runnerId: spec.runnerId,
    sequence,
    attempt: 1,
    sourceSha: manifest.candidate.commitSha,
    treeSha: manifest.candidate.treeSha,
    runnerReleaseDigest,
    outcome,
    evidenceDigest,
    semanticInputDigest: parsedSemanticInputDigest,
    semanticOutputDigest: parsedSemanticOutputDigest,
    stateBefore,
    stateAfter,
    artifactRefs,
    sideEffects,
    approvalEnvelopeDigest: null,
    previousSemanticReceiptDigest,
  });
  const semanticReceiptDigest = sha256Digest(semantic);
  const raw = rawReceiptPayload(semantic, {
    runId: manifest.runId,
    manifestDigest: state.manifestDigest,
    correlationId,
    causationEventId,
    rawInputDigest: parsedRawInputDigest,
    rawOutputDigest: parsedRawOutputDigest,
    previousRawReceiptDigest,
    producedAt,
    semanticReceiptDigest,
  });
  return canonicalClone({
    ...raw,
    rawReceiptDigest: sha256Digest(raw),
  }) as Readonly<Receipt>;
}

export function verifyReceipt(
  input: unknown,
  options: {
    readonly manifest: GraphManifest;
    readonly state: ReleaseState;
  },
): true {
  const manifest = validateGraphManifest(options.manifest);
  const state = validateReleaseState(options.state, { manifest });
  const receipt = verifyReceiptIntegrity(input);
  if (
    receipt.runId !== manifest.runId ||
    receipt.manifestDigest !== state.manifestDigest ||
    receipt.sourceSha !== manifest.candidate.commitSha ||
    receipt.treeSha !== manifest.candidate.treeSha
  ) {
    throw new TypeError("receipt is stale or drifted from the manifest binding");
  }
  const previous = state.nodeReceipts.at(-1);
  const expectedState: ReceiptStateBinding = {
    lifecycle: state.lifecycle,
    evidenceLevel: state.evidenceLevel,
  };
  if (
    state.blocker ||
    !isLegalGraphSuccessor(previous?.runnerId ?? null, receipt.runnerId) ||
    receipt.sequence !== state.nodeReceipts.length + 1 ||
    receipt.previousRawReceiptDigest !==
      (previous?.rawReceiptDigest ?? null) ||
    receipt.previousSemanticReceiptDigest !==
      (previous?.semanticReceiptDigest ?? null) ||
    !sameState(receipt.stateBefore, expectedState)
  ) {
    throw new TypeError("receipt is stale or drifted from the release-state frontier");
  }
  return true;
}

export function applyReceipt(
  stateInput: ReleaseState,
  receiptInput: Receipt,
  options: { readonly manifest: GraphManifest },
): Readonly<ReleaseState> {
  const state = validateReleaseState(stateInput, { manifest: options.manifest });
  verifyReceipt(receiptInput, { manifest: options.manifest, state });
  const receipt = verifyReceiptIntegrity(receiptInput);
  const blocker =
    receipt.outcome === "PASS"
      ? null
      : {
          runnerId: receipt.runnerId,
          outcome: receipt.outcome as Exclude<
            NodeOutcome,
            "PASS" | "ROLLED_BACK"
          >,
          evidenceDigest: receipt.semanticOutputDigest,
        };
  return validateReleaseState(
    {
      ...state,
      lifecycle: receipt.stateAfter.lifecycle,
      evidenceLevel: receipt.stateAfter.evidenceLevel,
      nodeReceipts: [...state.nodeReceipts, receipt],
      blocker,
    },
    { manifest: options.manifest },
  );
}
